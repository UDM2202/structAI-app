// src/components/auth/ProtectedComponent.jsx
import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { hasOrgRole, hasProjectRole, ROLES } from '../../utils/roles';

// Component that only shows if user has required organization role
export const WithOrgRole = ({ children, requiredRole, fallback = null }) => {
  const { user } = useAuth();
  const { currentOrganization } = useWorkspace();
  
  const userRole = currentOrganization?.userRole || ROLES.ORG_MEMBER;
  
  if (hasOrgRole(userRole, requiredRole)) {
    return <>{children}</>;
  }
  return fallback;
};

// Component that only shows if user has required project role
export const WithProjectRole = ({ children, requiredRole, fallback = null }) => {
  const { user } = useAuth();
  const { currentProject } = useWorkspace();
  
  const userRole = currentProject?.userRole || ROLES.PROJECT_VIEWER;
  
  if (hasProjectRole(userRole, requiredRole)) {
    return <>{children}</>;
  }
  return fallback;
};

// Component that only shows if user is the work owner
export const WithWorkOwner = ({ children, workOwnerId, fallback = null }) => {
  const { user } = useAuth();
  
  if (workOwnerId === user?.id) {
    return <>{children}</>;
  }
  return fallback;
};

// Component that only shows if user can delete a comment
export const WithCommentDelete = ({ children, commentAuthorId, projectOwnerId, fallback = null }) => {
  const { user } = useAuth();
  
  if (commentAuthorId === user?.id || projectOwnerId === user?.id) {
    return <>{children}</>;
  }
  return fallback;
};