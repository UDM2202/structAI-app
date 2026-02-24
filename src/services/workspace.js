import API from './api';

export const workspaceAPI = {
  // Get all workspaces for current user
  getWorkspaces: () => API.get('/workspaces'),
  
  // Get single workspace
  getWorkspace: (id) => API.get(`/workspaces/${id}`),
  
  // Create new workspace
  createWorkspace: (data) => API.post('/workspaces', data),
  
  // Update workspace
  updateWorkspace: (id, data) => API.put(`/workspaces/${id}`, data),
  
  // Delete workspace
  deleteWorkspace: (id) => API.delete(`/workspaces/${id}`),
  
  // Get workspace members
  getMembers: (workspaceId) => API.get(`/workspaces/${workspaceId}/members`),
  
  // Invite member
  inviteMember: (workspaceId, email, role) => 
    API.post(`/workspaces/${workspaceId}/members`, { email, role }),
  
  // Update member role
  updateMemberRole: (workspaceId, userId, role) => 
    API.put(`/workspaces/${workspaceId}/members/${userId}`, { role }),
  
  // Remove member
  removeMember: (workspaceId, userId) => 
    API.delete(`/workspaces/${workspaceId}/members/${userId}`),
  
  // Leave workspace
  leaveWorkspace: (workspaceId) => 
    API.post(`/workspaces/${workspaceId}/leave`),
};

export const projectAPI = {
  // Get all projects in workspace
  getProjects: (workspaceId) => API.get(`/workspaces/${workspaceId}/projects`),
  
  // Get single project
  getProject: (workspaceId, projectId) => 
    API.get(`/workspaces/${workspaceId}/projects/${projectId}`),
  
  // Create project
  createProject: (workspaceId, data) => 
    API.post(`/workspaces/${workspaceId}/projects`, data),
  
  // Update project
  updateProject: (workspaceId, projectId, data) => 
    API.put(`/workspaces/${workspaceId}/projects/${projectId}`, data),
  
  // Delete project
  deleteProject: (workspaceId, projectId) => 
    API.delete(`/workspaces/${workspaceId}/projects/${projectId}`),
  
  // Duplicate project
  duplicateProject: (workspaceId, projectId) => 
    API.post(`/workspaces/${workspaceId}/projects/${projectId}/duplicate`),
  
  // Archive project
  archiveProject: (workspaceId, projectId) => 
    API.post(`/workspaces/${workspaceId}/projects/${projectId}/archive`),
};