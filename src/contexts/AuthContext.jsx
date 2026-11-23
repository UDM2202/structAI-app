import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { authApi, communityApi, setTokens, clearTokens, getTokens, tokenUserId, SESSION_EXPIRED } from '../services/accountsApi';

// Sign-in goes to the accounts server (Django, services/accountsApi.js): real
// passwords, email verification, 2FA, JWT. Profile details the server does not
// hold (name, photo, profession, ...) and the user id that this browser's
// projects and design activity hang off are still kept here, one record per
// email in `local_users`: an account that existed in this browser before the
// server keeps its old id, so its local projects stay with it.
const USERS_KEY = 'local_users';
const readUsers = () => {
  try { const v = JSON.parse(localStorage.getItem(USERS_KEY)); return Array.isArray(v) ? v : []; }
  catch { return []; }
};
const writeUser = (u) => {
  const others = readUsers().filter((x) => x.id !== u.id);
  try { localStorage.setItem(USERS_KEY, JSON.stringify([...others, u])); }
  catch { throw new Error('Not enough browser storage to save the profile (try a smaller photo).'); }
};
const findUser = (key) => {
  const k = String(key || '').trim().toLowerCase();
  if (!k) return null;
  return readUsers().find((u) => u.email?.toLowerCase() === k || u.username?.toLowerCase() === k) || null;
};
// Session: localStorage when "remember me", else sessionStorage (closing the
// browser signs out). Activity logging reads it via utils/activity.js.
const saveSession = (u, remember) => {
  const store = remember ? localStorage : sessionStorage;
  (remember ? sessionStorage : localStorage).removeItem('auth_user');
  store.setItem('auth_user', JSON.stringify(u));
};
// sign-up details the server does not take, held until the email is verified
const PENDING_KEY = 'pending_signup';

// A community profile with no name yet gets the account's own details, so a
// new user does not appear under their bare username. Never overwrites.
const seedCommunityProfile = async (u) => {
  try {
    const p = await communityApi.myProfile();
    if (p.display_name) return;
    const pick = (v, n) => String(v || '').slice(0, n);
    await communityApi.updateMyProfile({
      display_name: pick(u.name, 80),
      headline: p.headline || pick(u.job_title, 120),
      company: p.company || pick(u.company, 120),
      qualifications: p.qualifications || pick(u.qualifications, 160),
      location: p.location || pick(u.location, 120),
    });
  } catch { /* community optional at sign-in */ }
};
const refreshSession = (u) => {
  for (const store of [localStorage, sessionStorage]) {
    if (store.getItem('auth_user')) store.setItem('auth_user', JSON.stringify(u));
  }
};

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [personalOrganization, setPersonalOrganization] = useState(null);

  // Check if user is already logged in on mount
  useEffect(() => {
    // Check localStorage for existing session
    const savedUser = localStorage.getItem('auth_user') || sessionStorage.getItem('auth_user');
    const savedPersonalOrg = localStorage.getItem('personal_organization');

    // A session from before the accounts server (a 'local_' token, no JWT)
    // is not valid any more: sign in again.
    if (savedUser && !getTokens()?.refresh) {
      for (const s of [localStorage, sessionStorage]) { s.removeItem('auth_user'); s.removeItem('auth_token'); }
    } else if (savedUser) {
      // Prefer the stored account (it carries later profile edits).
      const parsed = JSON.parse(savedUser);
      const account = readUsers().find((u) => u.id === parsed.id) || parsed;
      if (!readUsers().some((u) => u.id === account.id)) { try { writeUser(account); } catch { /* full */ } }
      setUser(account);
      setProfile(account);
      if (savedPersonalOrg) {
        setPersonalOrganization(JSON.parse(savedPersonalOrg));
      }
    }
    setLoading(false);
  }, []);

  const fetchProfile = async () => {
    return user;
  };

  // Create personal organization for new user
  const createPersonalOrganization = async (userId, userName) => {
    console.log('Creating personal organization for user:', userId, userName);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Create personal organization object
    const personalOrg = {
      id: `org_personal_${userId}`,
      name: `${userName || 'Personal'}'s Organization`,
      type: 'personal',
      owner_id: userId,
      created_at: new Date().toISOString(),
      is_personal: true,
      can_delete: false,
      can_rename: false,
      description: 'Your personal workspace for individual projects'
    };
    
    // Store in localStorage
    const organizations = JSON.parse(localStorage.getItem('organizations') || '[]');
    // Check if personal org already exists for this user
    const existingOrg = organizations.find(org => org.id === personalOrg.id);
    if (!existingOrg) {
      organizations.push(personalOrg);
      localStorage.setItem('organizations', JSON.stringify(organizations));
    }
    
    // Store membership
    const memberships = JSON.parse(localStorage.getItem('organization_memberships') || '[]');
    const existingMembership = memberships.find(m => m.user_id === userId && m.organization_id === personalOrg.id);
    if (!existingMembership) {
      memberships.push({
        user_id: userId,
        organization_id: personalOrg.id,
        role: 'owner',
        joined_at: new Date().toISOString()
      });
      localStorage.setItem('organization_memberships', JSON.stringify(memberships));
    }
    
    // Store personal organization separately for easy access
    localStorage.setItem('personal_organization', JSON.stringify(personalOrg));
    setPersonalOrganization(personalOrg);
    
    return { success: true, organization: personalOrg };
  };

  // Tokens in hand: read the account from the server, match it to this
  // browser's local record (by email) and start the session.
  const completeSignIn = async (tokens, remember, extra = {}) => {
    setTokens(tokens, remember);
    const serverId = tokenUserId(tokens.access);
    let account = {};
    try { account = await authApi.profile(); } catch { /* profile optional */ }
    const email = account.email || extra.email || '';
    const local = findUser(email);
    const fullName = [account.first_name, account.last_name].filter(Boolean).join(' ');
    const u = {
      profession: 'structural_engineer',
      avatar: null,
      created_at: new Date().toISOString(),
      ...(local || {}),
      ...extra,
      id: local?.id || `user_srv_${serverId}`,
      server_id: serverId,
      email,
      username: account.username || local?.username || email.split('@')[0],
      name: local?.name || extra.name || fullName || account.username || email.split('@')[0],
    };
    writeUser(u);
    saveSession(u, remember);
    setUser(u);
    setProfile(u);
    seedCommunityProfile(u);
    const savedPersonalOrg = localStorage.getItem('personal_organization');
    if (savedPersonalOrg) setPersonalOrganization(JSON.parse(savedPersonalOrg));
    return u;
  };

  // credentials: { email (email or username), password }
  // -> { success } | { verify: email } (a code was emailed) | { twoFactor: pendingToken } | { error }
  const login = async (credentials, rememberMe) => {
    setError(null);
    try {
      const d = await authApi.login(String(credentials.email || credentials.username || '').trim(), credentials.password);
      if (d.requires_2fa) return { success: false, twoFactor: d.pending_token };
      const u = await completeSignIn(d, rememberMe);
      return { success: true, user: u };
    } catch (e) {
      if (e.data?.email_verification_required) {
        const email = Array.isArray(e.data.email) ? e.data.email[0] : e.data.email;
        return { success: false, verify: email };
      }
      setError(e.message);
      return { success: false, error: e.message };
    }
  };

  // Google in a popup. The popup must be opened in the click handler (pop-up
  // blockers), so it opens blank and is pointed at Google once the API has
  // started a sign-in session; the API's callback page closes it. The status
  // is polled; popup.closed is not used (Chrome reports it wrongly once
  // Google's page isolates the window), so isCancelled() ends the wait.
  // -> { success } | { twoFactor } | { cancelled } | { error }
  const loginWithGoogle = async (rememberMe, isCancelled = () => false) => {
    const popup = window.open('', 'sdh-google-signin', 'width=480,height=640');
    if (!popup) return { success: false, error: 'Allow pop-ups for this site to sign in with Google.' };
    try { popup.document.title = 'Sign in with Google'; popup.document.body.textContent = 'Opening Google…'; } catch { /* cross-origin */ }
    let session;
    try {
      session = await authApi.googleStart();
      popup.location.href = session.auth_url;
    } catch (e) {
      popup.close();
      return { success: false, error: e.message };
    }
    const deadline = Date.now() + 10 * 60 * 1000;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 1500));
      if (isCancelled()) { try { popup.close(); } catch { /* gone */ } return { success: false, cancelled: true }; }
      let s;
      try { s = await authApi.googleStatus(session.session_id); }
      catch (e) { return { success: false, error: e.status === 404 ? 'The Google sign-in expired. Try again.' : e.message }; }
      if (!s.completed) continue;
      try { popup.close(); } catch { /* gone */ }
      if (s.failed) return { success: false, error: 'Google sign-in failed. Try again.' };
      if (s.requires_2fa) return { success: false, twoFactor: s.pending_token };
      const u = await completeSignIn({ access: s.access, refresh: s.refresh }, rememberMe);
      return { success: true, user: u };
    }
    return { success: false, error: 'The Google sign-in expired. Try again.' };
  };

  const verifyTwoFactor = async (pendingToken, code, rememberMe) => {
    try {
      const d = await authApi.verify2fa(pendingToken, code.trim());
      const u = await completeSignIn(d, rememberMe);
      return { success: true, user: u };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  // userData: { name, email, username, password, profession }. The server
  // emails a 6-digit code; the account works after verifyEmail().
  const register = async (userData) => {
    setError(null);
    const email = userData.email.trim().toLowerCase();
    try {
      await authApi.register({ email, username: userData.username.trim(), password: userData.password });
    } catch (e) {
      return { success: false, error: e.message, fields: e.fields };
    }
    try {
      sessionStorage.setItem(PENDING_KEY, JSON.stringify({ email, name: userData.name, profession: userData.profession }));
    } catch { /* storage blocked */ }
    return { success: true, verify: email };
  };

  const verifyEmail = async (email, code) => {
    const addr = email.trim().toLowerCase();
    try {
      const d = await authApi.verifyEmail(addr, code.trim());
      let pending = {};
      try {
        const p = JSON.parse(sessionStorage.getItem(PENDING_KEY) || 'null');
        if (p?.email === addr) pending = { name: p.name, profession: p.profession };
        sessionStorage.removeItem(PENDING_KEY);
      } catch { /* none */ }
      const isNew = !findUser(addr);
      const u = await completeSignIn(d, true, { email: addr, ...pending });
      if (isNew) await createPersonalOrganization(u.id, u.name);
      return { success: true, user: u };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  const resendVerification = async (email) => {
    try { await authApi.resendOtp(email.trim().toLowerCase()); return { success: true }; }
    catch (e) { return { success: false, error: e.message }; }
  };

  const logout = useCallback(async () => {
    setUser(null);
    setProfile(null);
    setPersonalOrganization(null);
    clearTokens();
    localStorage.removeItem('auth_user');
    sessionStorage.removeItem('auth_user');
    // organisations / projects stay: they belong to this browser's accounts
  }, []);

  // The refresh token expired or was revoked: sign out (ProtectedRoute then
  // shows the login page).
  useEffect(() => {
    const onExpired = () => { logout(); };
    window.addEventListener(SESSION_EXPIRED, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED, onExpired);
  }, [logout]);

  // Emails a 6-digit reset code.
  const forgotPassword = async (email) => {
    try { await authApi.forgotPassword(email.trim().toLowerCase()); return { success: true }; }
    catch (e) { return { success: false, error: e.message }; }
  };

  const resetPassword = async (email, code, newPassword) => {
    try { await authApi.resetPassword(email.trim().toLowerCase(), code.trim(), newPassword); return { success: true }; }
    catch (e) { return { success: false, error: e.message }; }
  };

  const updateProfile = async (profileData) => {
    if (!user) return { success: false, error: 'Not signed in' };
    const email = profileData.email?.trim();
    if (email && email.toLowerCase() !== (user.email || '').toLowerCase()) {
      const clash = findUser(email);
      if (clash && clash.id !== user.id) return { success: false, error: 'Another account in this browser already uses that email.' };
    }
    const updatedProfile = { ...user, ...profileData, updated_at: new Date().toISOString() };
    try {
      writeUser(updatedProfile);
      refreshSession(updatedProfile);
    } catch (e) {
      return { success: false, error: e.message };
    }
    setProfile(updatedProfile);
    setUser(updatedProfile);
    return { success: true, user: updatedProfile };
  };

  // Load user's organizations
  const loadUserOrganizations = async (userId) => {
    const organizations = JSON.parse(localStorage.getItem('organizations') || '[]');
    const memberships = JSON.parse(localStorage.getItem('organization_memberships') || '[]');
    const userMemberships = memberships.filter(m => m.user_id === userId);
    const userOrgs = organizations.filter(org => 
      userMemberships.some(m => m.organization_id === org.id)
    );
    
    // Find personal organization
    const personal = userOrgs.find(org => org.is_personal === true);
    if (personal) {
      setPersonalOrganization(personal);
    }
    
    return userOrgs;
  };

  const value = {
    user,
    profile,
    loading,
    error,
    personalOrganization,
    login,
    verifyTwoFactor,
    loginWithGoogle,
    register,
    verifyEmail,
    resendVerification,
    logout,
    forgotPassword,
    resetPassword,
    updateProfile,
    fetchProfile,
    createPersonalOrganization,
    loadUserOrganizations,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};