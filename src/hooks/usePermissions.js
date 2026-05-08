// src/hooks/usePermissions.js
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { hasOrgRole, hasProjectRole, canEditWork, ROLES } from '../utils/roles';

export const usePermissions = () => {
  const { user } = useAuth();
  const { currentOrganization, currentProject } = useWorkspace();

  // Organization permissions
  const orgUserRole = currentOrganization?.userRole || ROLES.ORG_MEMBER;
  const isOrgOwner = orgUserRole === ROLES.ORG_OWNER;
  const isOrgAdmin = orgUserRole === ROLES.ORG_ADMIN;
  const isOrgEditor = orgUserRole === ROLES.ORG_EDITOR;
  const isOrgMember = orgUserRole === ROLES.ORG_MEMBER;
  
  // Project permissions
  const projectUserRole = currentProject?.userRole || ROLES.PROJECT_VIEWER;
  const isProjectOwner = projectUserRole === ROLES.PROJECT_OWNER;
  const isProjectAdmin = projectUserRole === ROLES.PROJECT_ADMIN;
  const isProjectEditor = projectUserRole === ROLES.PROJECT_EDITOR;
  const isProjectViewer = projectUserRole === ROLES.PROJECT_VIEWER;
  
  // Action permissions
  const canInviteToOrg = isOrgOwner || isOrgAdmin;
  const canRemoveFromOrg = (targetUserRole) => {
    if (isOrgOwner) return targetUserRole !== ROLES.ORG_OWNER;
    if (isOrgAdmin) return targetUserRole !== ROLES.ORG_OWNER && targetUserRole !== ROLES.ORG_ADMIN;
    return false;
  };
  
  const canChangeOrgRole = (targetUserRole) => {
    if (isOrgOwner) return targetUserRole !== ROLES.ORG_OWNER;
    if (isOrgAdmin) return targetUserRole === ROLES.ORG_EDITOR || targetUserRole === ROLES.ORG_MEMBER;
    return false;
  };
  
  const canTransferOrgOwnership = isOrgOwner;
  const canDeleteOrg = isOrgOwner;
  const canRenameOrg = isOrgOwner;
  
  const canInviteToProject = isProjectOwner || isProjectAdmin || canInviteToOrg;
  const canRemoveFromProject = (targetUserRole) => {
    if (isProjectOwner) return targetUserRole !== ROLES.PROJECT_OWNER;
    if (isProjectAdmin) return targetUserRole === ROLES.PROJECT_EDITOR || targetUserRole === ROLES.PROJECT_VIEWER;
    return false;
  };
  
  const canChangeProjectRole = (targetUserRole) => {
    if (isProjectOwner) return targetUserRole !== ROLES.PROJECT_OWNER;
    if (isProjectAdmin) return targetUserRole === ROLES.PROJECT_EDITOR || targetUserRole === ROLES.PROJECT_VIEWER;
    return false;
  };
  
  const canTransferProjectOwnership = isProjectOwner;
  const canDeleteProject = isProjectOwner;
  const canRenameProject = isProjectOwner;
  
  const canStartNewDesign = isProjectOwner || isProjectAdmin || isProjectEditor;
  const canEditWork = (workOwnerId) => workOwnerId === user?.id;
  const canDeleteWork = (workOwnerId) => workOwnerId === user?.id;
  
  const canViewWork = true; // Everyone can view
  const canDeleteComment = (commentAuthorId, projectOwnerId) => {
    return commentAuthorId === user?.id || projectOwnerId === user?.id;
  };
  
  const canLeaveOrg = !isOrgOwner;
  const canLeaveProject = !isProjectOwner;
  
  const canViewPendingInvites = isProjectOwner || isProjectAdmin || isOrgOwner || isOrgAdmin;
  
  return {
    // Roles
    orgUserRole,
    projectUserRole,
    isOrgOwner,
    isOrgAdmin,
    isOrgEditor,
    isOrgMember,
    isProjectOwner,
    isProjectAdmin,
    isProjectEditor,
    isProjectViewer,
    
    // Actions
    canInviteToOrg,
    canRemoveFromOrg,
    canChangeOrgRole,
    canTransferOrgOwnership,
    canDeleteOrg,
    canRenameOrg,
    canInviteToProject,
    canRemoveFromProject,
    canChangeProjectRole,
    canTransferProjectOwnership,
    canDeleteProject,
    canRenameProject,
    canStartNewDesign,
    canEditWork,
    canDeleteWork,
    canViewWork,
    canDeleteComment,
    canLeaveOrg,
    canLeaveProject,
    canViewPendingInvites,
  };
};