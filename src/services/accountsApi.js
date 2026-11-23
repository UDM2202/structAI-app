// src/services/accountsApi.js
// Client for the accounts / community server (Django, repo
// struct-design-hub-api). Separate from api.js, which talks to the design
// engine (FastAPI, VITE_API_BASE).
//
// Tokens: JWT access (45 min) + refresh (7 days, rotated). Kept in
// localStorage with "remember me", else sessionStorage (closing the browser
// signs out), next to `auth_user`. A 401 refreshes once and retries.

export const ACCOUNTS_BASE = (import.meta.env.VITE_ACCOUNTS_API || 'http://localhost:8001').replace(/\/$/, '');

const TOKENS_KEY = 'auth_tokens';

const stores = () => [localStorage, sessionStorage];

export function getTokens() {
  for (const s of stores()) {
    try {
      const raw = s.getItem(TOKENS_KEY);
      if (raw) return { ...JSON.parse(raw), store: s };
    } catch { /* storage blocked */ }
  }
  return null;
}

export function setTokens({ access, refresh }, remember) {
  const current = getTokens();
  // keep the store chosen at sign-in when tokens are refreshed
  const store = remember === undefined ? (current?.store || sessionStorage) : (remember ? localStorage : sessionStorage);
  clearTokens();
  store.setItem(TOKENS_KEY, JSON.stringify({ access, refresh }));
  // utils/activity.js and other readers only check that a token exists
  store.setItem('auth_token', access);
}

export function clearTokens() {
  for (const s of stores()) {
    try { s.removeItem(TOKENS_KEY); s.removeItem('auth_token'); } catch { /* blocked */ }
  }
}

/** The signed-in server user id (JWT `user_id` claim), or null. */
export function tokenUserId(access) {
  try {
    const payload = JSON.parse(atob(access.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.user_id ?? null;
  } catch { return null; }
}

export class ApiError extends Error {
  constructor(message, { status, data } = {}) {
    super(message);
    this.status = status;
    this.data = data;
    this.fields = fieldErrors(data);
  }
}

// DRF errors come as {detail}, {error}, {field: [msg]}, {non_field_errors: [..]}
// or a plain list. One readable sentence for the banner.
function firstMessage(data) {
  if (!data) return null;
  if (typeof data === 'string') return data;
  if (Array.isArray(data)) return firstMessage(data[0]);
  if (data.detail) return firstMessage(data.detail);
  if (data.error) return firstMessage(data.error);
  if (data.non_field_errors) return firstMessage(data.non_field_errors);
  for (const [k, v] of Object.entries(data)) {
    const m = firstMessage(v);
    if (m && typeof v !== 'boolean') return k === 'detail' ? m : `${label(k)}: ${m}`;
  }
  return null;
}
const label = (k) => k.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

function fieldErrors(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    if (['detail', 'error', 'non_field_errors'].includes(k)) continue;
    const m = Array.isArray(v) ? v[0] : v;
    if (typeof m === 'string') out[k] = m;
  }
  return out;
}

let refreshing = null;

async function refreshAccess() {
  const t = getTokens();
  if (!t?.refresh) return false;
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const r = await fetch(`${ACCOUNTS_BASE}/api/auth/refresh/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh: t.refresh }),
        });
        if (!r.ok) return false;
        const d = await r.json();
        setTokens({ access: d.access, refresh: d.refresh || t.refresh });
        return true;
      } catch { return false; }
      finally { setTimeout(() => { refreshing = null; }, 0); }
    })();
  }
  return refreshing;
}

/** Fired when the session can no longer be refreshed (AuthContext signs out). */
export const SESSION_EXPIRED = 'auth-session-expired';

/**
 * request('/api/community/posts/', { method, body, auth = true, query })
 * Resolves to parsed JSON (null for 204); throws ApiError.
 */
export async function request(path, { method = 'GET', body, auth = true, query, retry = true } = {}) {
  const url = new URL(ACCOUNTS_BASE + path);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    }
  }
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const t = auth ? getTokens() : null;
  if (t?.access) headers.Authorization = `Bearer ${t.access}`;

  let res;
  try {
    res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError('Cannot reach the Sphere Design Hub server. Check your connection and try again.', { status: 0 });
  }

  if (res.status === 401 && auth && retry && t?.refresh) {
    if (await refreshAccess()) return request(path, { method, body, auth, query, retry: false });
    clearTokens();
    window.dispatchEvent(new Event(SESSION_EXPIRED));
  }

  if (res.status === 204) return null;
  let data = null;
  const text = await res.text();
  if (text) { try { data = JSON.parse(text); } catch { data = text; } }
  if (!res.ok) {
    let msg = firstMessage(data);
    if (res.status === 429) msg = msg || 'Too many requests. Wait a little and try again.';
    if (res.status >= 500) msg = 'The server had a problem. Try again in a moment.';
    throw new ApiError(msg || `Request failed (${res.status})`, { status: res.status, data });
  }
  return data;
}

// ---------------------------------------------------------------- accounts
export const authApi = {
  login: (identifier, password) => request('/api/auth/login/', { method: 'POST', auth: false, body: { identifier, password } }),
  verify2fa: (pending_token, code) => request('/api/auth/2fa/login-verify/', { method: 'POST', auth: false, body: { pending_token, code } }),
  register: ({ email, username, password }) => request('/api/auth/register/', { method: 'POST', auth: false, body: { email, username, password } }),
  verifyEmail: (email, code) => request('/api/auth/verify-email/', { method: 'POST', auth: false, body: { email, code } }),
  resendOtp: (email) => request('/api/auth/resend-otp/', { method: 'POST', auth: false, body: { email } }),
  forgotPassword: (email) => request('/api/auth/forgot-password/', { method: 'POST', auth: false, body: { email } }),
  resetPassword: (email, code, new_password) => request('/api/auth/reset-password/', { method: 'POST', auth: false, body: { email, code, new_password } }),
  profile: () => request('/api/auth/profile/'),
  // Google: start -> popup to Google -> API callback -> poll status (one-time)
  googleStart: () => request('/api/auth/social/google/start/', { auth: false, query: { client: 'web' } }),
  googleStatus: (sessionId) => request(`/api/auth/social/google/status/${sessionId}/`, { auth: false }),
};

// ------------------------------------------------------------- co-designer
const CD = '/api/co-designer';
export const coDesignerApi = {
  // -> 202 { conversation_id, job_id, status, conversation_usage }; 409 when the conversation is full
  chat: ({ message, prompt_type = 'question', task_target = null, conversation_id = null }) =>
    request(`${CD}/chat/`, { method: 'POST', body: { message, prompt_type, ...(task_target ? { task_target } : {}), ...(conversation_id ? { conversation_id } : {}) } }),
  job: (id) => request(`${CD}/jobs/${id}/`),
  conversations: () => request(`${CD}/conversations/`),
  conversation: (id) => request(`${CD}/conversations/${id}/`),
  rename: (id, title) => request(`${CD}/conversations/${id}/`, { method: 'PATCH', body: { title } }),
  remove: (id) => request(`${CD}/conversations/${id}/`, { method: 'DELETE' }),
  targets: () => request(`${CD}/task-targets/`),
};

// --------------------------------------------------------------- community
const C = '/api/community';
export const communityApi = {
  me: () => request(`${C}/me/`),
  myProfile: () => request(`${C}/me/profile/`),
  updateMyProfile: (data) => request(`${C}/me/profile/`, { method: 'PATCH', body: data }),
  profile: (username) => request(`${C}/profiles/${encodeURIComponent(username)}/`),
  follow: (username) => request(`${C}/profiles/${encodeURIComponent(username)}/follow/`, { method: 'POST' }),
  unfollow: (username) => request(`${C}/profiles/${encodeURIComponent(username)}/follow/`, { method: 'DELETE' }),
  followers: (username, page) => request(`${C}/profiles/${encodeURIComponent(username)}/followers/`, { query: { page } }),
  following: (username, page) => request(`${C}/profiles/${encodeURIComponent(username)}/following/`, { query: { page } }),
  people: (q) => request(`${C}/people/`, { query: { q } }),
  tags: () => request(`${C}/tags/`),
  posts: (query) => request(`${C}/posts/`, { query }),
  post: (id) => request(`${C}/posts/${id}/`),
  createPost: (data) => request(`${C}/posts/`, { method: 'POST', body: data }),
  updatePost: (id, data) => request(`${C}/posts/${id}/`, { method: 'PATCH', body: data }),
  deletePost: (id) => request(`${C}/posts/${id}/`, { method: 'DELETE' }),
  votePost: (id, on) => request(`${C}/posts/${id}/vote/`, { method: on ? 'POST' : 'DELETE' }),
  accept: (id, comment) => request(`${C}/posts/${id}/accept/`, { method: 'POST', body: { comment } }),
  comments: (id) => request(`${C}/posts/${id}/comments/`),
  addComment: (id, body, parent) => request(`${C}/posts/${id}/comments/`, { method: 'POST', body: { body, parent } }),
  editComment: (id, body) => request(`${C}/comments/${id}/`, { method: 'PATCH', body: { body } }),
  deleteComment: (id) => request(`${C}/comments/${id}/`, { method: 'DELETE' }),
  voteComment: (id, on) => request(`${C}/comments/${id}/vote/`, { method: on ? 'POST' : 'DELETE' }),
  design: (uuid) => request(`${C}/designs/${uuid}/`),
  activity: () => request(`${C}/activity/`),
  report: (target, reason, details) => request(`${C}/reports/`, { method: 'POST', body: { ...target, reason, details } }),
  // moderators
  reports: (status, page) => request(`${C}/mod/reports/`, { query: { status, page } }),
  resolveReport: (id, action, note) => request(`${C}/mod/reports/${id}/resolve/`, { method: 'POST', body: { action, note } }),
  moderate: (type, id, action, reason) => request(`${C}/mod/${type}/${id}/${action}/`, { method: 'POST', body: { reason } }),
  moderateUser: (username, action, reason) => request(`${C}/mod/users/${encodeURIComponent(username)}/${action}/`, { method: 'POST', body: { reason } }),
  modLog: () => request(`${C}/mod/log/`),
};
