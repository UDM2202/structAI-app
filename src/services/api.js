import axios from 'axios';

// Base API configuration
const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API endpoints
export const authAPI = {
  register: (userData) => API.post('/auth/register', userData),
  login: (credentials) => API.post('/auth/login', credentials),
  loginWithGoogle: (token) => API.post('/auth/login/google', { idToken: token }),
  loginWithLinkedIn: (code) => API.post('/auth/login/linkedin', { code }),
  refreshToken: (refreshToken) => API.post('/auth/refresh', { refreshToken }),
  logout: (refreshToken) => API.post('/auth/logout', { refreshToken }),
  forgotPassword: (email) => API.post('/auth/forgot-password', { email }),
  resetPassword: (token, newPassword) => API.post('/auth/reset-password', { token, newPassword }),
  changePassword: (oldPassword, newPassword) => API.post('/auth/change-password', { oldPassword, newPassword }),
};

// User profile API endpoints
export const profileAPI = {
  getProfile: () => API.get('/profile'),
  updateProfile: (profileData) => API.put('/profile', profileData),
  uploadAvatar: (formData) => API.post('/profile/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getPreferences: () => API.get('/profile/preferences'),
  updatePreferences: (preferences) => API.put('/profile/preferences', preferences),
};

// Organization API endpoints
export const organizationAPI = {
  // Get all organizations for current user
  getOrganizations: () => API.get('/organizations'),
  
  // Get single organization by ID
  getOrganization: (orgId) => API.get(`/organizations/${orgId}`),
  
  // Create new organization
  createOrganization: (orgData) => API.post('/organizations', orgData),
  
  // Update organization (rename, description)
  updateOrganization: (orgId, updates) => API.put(`/organizations/${orgId}`, updates),
  
  // Delete organization (only if no projects)
  deleteOrganization: (orgId) => API.delete(`/organizations/${orgId}`),
  
  // Transfer ownership of organization
  transferOwnership: (orgId, newOwnerId) => API.post(`/organizations/${orgId}/transfer`, { newOwnerId }),
  
  // Get organization members
  getMembers: (orgId) => API.get(`/organizations/${orgId}/members`),
  
  // Invite member to organization
  inviteMember: (orgId, email, role) => API.post(`/organizations/${orgId}/invite`, { email, role }),
  
  // Cancel pending invite
  cancelInvite: (orgId, inviteId) => API.delete(`/organizations/${orgId}/invite/${inviteId}`),
  
  // Update member role
  updateMemberRole: (orgId, memberId, role) => API.put(`/organizations/${orgId}/members/${memberId}`, { role }),
  
  // Remove member from organization
  removeMember: (orgId, memberId) => API.delete(`/organizations/${orgId}/members/${memberId}`),
  
  // Leave organization
  leaveOrganization: (orgId) => API.post(`/organizations/${orgId}/leave`),
  
  // Get pending invites
  getPendingInvites: () => API.get('/organizations/invites/pending'),
  
  // Accept or reject invite
  respondToInvite: (inviteId, accept) => API.post(`/organizations/invites/${inviteId}/respond`, { accept }),
};

// Project API endpoints
export const projectAPI = {
  // Get all projects for current user (across organizations)
  getProjects: () => API.get('/projects'),
  
  // Get projects for specific organization
  getOrganizationProjects: (orgId) => API.get(`/organizations/${orgId}/projects`),
  
  // Get single project by ID
  getProject: (projectId) => API.get(`/projects/${projectId}`),
  
  // Create new project
  createProject: (projectData) => API.post('/projects', projectData),
  
  // Update project
  updateProject: (projectId, updates) => API.put(`/projects/${projectId}`, updates),
  
  // Delete project
  deleteProject: (projectId) => API.delete(`/projects/${projectId}`),
  
  // Move project to another organization
  moveProject: (projectId, targetOrgId) => API.post(`/projects/${projectId}/move`, { targetOrgId }),
  
  // Get project members
  getProjectMembers: (projectId) => API.get(`/projects/${projectId}/members`),
  
  // Invite member to project
  inviteToProject: (projectId, email, role) => API.post(`/projects/${projectId}/invite`, { email, role }),
  
  // Update project member role
  updateProjectMemberRole: (projectId, memberId, role) => API.put(`/projects/${projectId}/members/${memberId}`, { role }),
  
  // Remove member from project
  removeProjectMember: (projectId, memberId) => API.delete(`/projects/${projectId}/members/${memberId}`),
  
  // Leave project
  leaveProject: (projectId) => API.post(`/projects/${projectId}/leave`),
  
  // Transfer project ownership
  transferProjectOwnership: (projectId, newOwnerId) => API.post(`/projects/${projectId}/transfer`, { newOwnerId }),
};

// Design/Work API endpoints
export const workAPI = {
  // Get all works for a project
  getProjectWorks: (projectId) => API.get(`/projects/${projectId}/works`),
  
  // Get single work by ID
  getWork: (workId) => API.get(`/works/${workId}`),
  
  // Create new design work
  createWork: (workData) => API.post('/works', workData),
  
  // Update design work
  updateWork: (workId, updates) => API.put(`/works/${workId}`, updates),
  
  // Delete design work
  deleteWork: (workId) => API.delete(`/works/${workId}`),
  
  // Get work results/calculations
  getWorkResults: (workId) => API.get(`/works/${workId}/results`),
  
  // Run optimization
  runOptimization: (workId, parameters) => API.post(`/works/${workId}/optimize`, parameters),
  
  // Get optimization status (polling)
  getOptimizationStatus: (workId, optimizationId) => API.get(`/works/${workId}/optimize/${optimizationId}/status`),
};

// Notification API endpoints
export const notificationAPI = {
  // Get user notifications
  getNotifications: (params) => API.get('/notifications', { params }),
  
  // Mark notification as read
  markAsRead: (notificationId) => API.put(`/notifications/${notificationId}/read`),
  
  // Mark all as read
  markAllAsRead: () => API.put('/notifications/read-all'),
  
  // Delete notification
  deleteNotification: (notificationId) => API.delete(`/notifications/${notificationId}`),
  
  // Get unread count
  getUnreadCount: () => API.get('/notifications/unread/count'),
};

// Comment API endpoints
export const commentAPI = {
  // Get comments for a work
  getWorkComments: (workId) => API.get(`/works/${workId}/comments`),
  
  // Add comment
  addComment: (workId, content) => API.post(`/works/${workId}/comments`, { content }),
  
  // Update comment
  updateComment: (commentId, content) => API.put(`/comments/${commentId}`, { content }),
  
  // Delete comment (only owner or project owner)
  deleteComment: (commentId) => API.delete(`/comments/${commentId}`),
};

// External Design API endpoints (for SDH Agent)
export const externalDesignAPI = {
  // Start external design session
  startSession: (workId, externalTool) => API.post('/external/session', { workId, externalTool }),
  
  // Poll session status
  getSessionStatus: (sessionId) => API.get(`/external/session/${sessionId}/status`),
  
  // Push updates from external tool
  pushUpdates: (sessionId, data) => API.post(`/external/session/${sessionId}/push`, data),
  
  // End session
  endSession: (sessionId) => API.post(`/external/session/${sessionId}/end`),
};

export default API;