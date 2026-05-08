export const ROLES = {
  // Organization Roles
  ORG_OWNER: 'owner',
  ORG_ADMIN: 'admin',
  ORG_EDITOR: 'editor',
  ORG_MEMBER: 'member',
  
  // Project Roles
  PROJECT_OWNER: 'project_owner',
  PROJECT_ADMIN: 'project_admin',
  PROJECT_EDITOR: 'project_editor',
  PROJECT_VIEWER: 'project_viewer',
  
  // Guest Role
  GUEST: 'guest',
};

// Organization role hierarchy (higher index = more permissions)
export const ORG_ROLE_HIERARCHY = {
  [ROLES.ORG_OWNER]: 4,
  [ROLES.ORG_ADMIN]: 3,
  [ROLES.ORG_EDITOR]: 2,
  [ROLES.ORG_MEMBER]: 1,
};

// Project role hierarchy
export const PROJECT_ROLE_HIERARCHY = {
  [ROLES.PROJECT_OWNER]: 4,
  [ROLES.PROJECT_ADMIN]: 3,
  [ROLES.PROJECT_EDITOR]: 2,
  [ROLES.PROJECT_VIEWER]: 1,
};

// Check if user has required organization role
export const hasOrgRole = (userRole, requiredRole) => {
  const userLevel = ORG_ROLE_HIERARCHY[userRole] || 0;
  const requiredLevel = ORG_ROLE_HIERARCHY[requiredRole] || 0;
  return userLevel >= requiredLevel;
};

// Check if user has required project role
export const hasProjectRole = (userRole, requiredRole) => {
  const userLevel = PROJECT_ROLE_HIERARCHY[userRole] || 0;
  const requiredLevel = PROJECT_ROLE_HIERARCHY[requiredRole] || 0;
  return userLevel >= requiredLevel;
};

// Check if user can edit a work (only owner)
export const canEditWork = (workOwnerId, currentUserId) => {
  return workOwnerId === currentUserId;
};

// Check if user can delete a comment (comment owner or project owner)
export const canDeleteComment = (commentAuthorId, projectOwnerId, currentUserId) => {
  return commentAuthorId === currentUserId || projectOwnerId === currentUserId;
};