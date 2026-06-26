import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext';

// Role constants
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

// Role hierarchy for permissions
export const ORG_ROLE_HIERARCHY = {
  [ROLES.ORG_OWNER]: 4,
  [ROLES.ORG_ADMIN]: 3,
  [ROLES.ORG_EDITOR]: 2,
  [ROLES.ORG_MEMBER]: 1,
};

export const PROJECT_ROLE_HIERARCHY = {
  [ROLES.PROJECT_OWNER]: 4,
  [ROLES.PROJECT_ADMIN]: 3,
  [ROLES.PROJECT_EDITOR]: 2,
  [ROLES.PROJECT_VIEWER]: 1,
};

// TEMPORARY MOCK DATA - REMOVE WHEN BACKEND IS READY
const DEFAULT_MOCK_WORKSPACES = [
  {
    id: "ws-1",
    name: "Acme Engineering",
    type: "team",
    industry: "engineering",
    description: "Leading structural engineering firm specializing in commercial and residential projects",
    logo_url: null,
    website: "https://acme-eng.com",
    member_count: 5,
    project_count: 12,
    userRole: ROLES.ORG_OWNER,
    settings: {
      defaultProjectType: "commercial",
      defaultDesignStandard: "Eurocode",
      notifications: true,
      twoFactorRequired: false
    },
    created_at: "2026-01-15T08:00:00Z",
    updated_at: "2026-02-18T14:30:00Z",
    last_active: "2026-02-19T10:30:00Z"
  },
  {
    id: "ws-2",
    name: "Personal Projects",
    type: "personal",
    industry: "personal",
    description: "My personal structural design experiments and side projects",
    logo_url: null,
    website: null,
    member_count: 1,
    project_count: 3,
    userRole: ROLES.ORG_OWNER,
    settings: {
      defaultProjectType: "residential",
      defaultDesignStandard: "Eurocode",
      notifications: true,
      twoFactorRequired: false
    },
    created_at: "2026-02-01T09:00:00Z",
    updated_at: "2026-02-17T11:20:00Z",
    last_active: "2026-02-19T09:15:00Z"
  }
];

const DEFAULT_MOCK_PROJECTS = [
  {
    id: "proj-1",
    workspace_id: "ws-1",
    name: "London Office Tower",
    description: "25-storey commercial office building in Canary Wharf with retail space on ground floor",
    project_type: "commercial",
    location: "London, UK",
    design_standard: "Eurocode",
    status: "active",
    userRole: ROLES.PROJECT_OWNER,
    created_at: "2026-02-01T09:00:00Z",
    updated_at: "2026-02-18T14:30:00Z"
  },
  {
    id: "proj-2",
    workspace_id: "ws-1",
    name: "Riverside Apartments",
    description: "Residential complex with 120 units, underground parking, and communal gardens",
    project_type: "residential",
    location: "Manchester, UK",
    design_standard: "Eurocode",
    status: "active",
    userRole: ROLES.PROJECT_ADMIN,
    created_at: "2026-02-05T10:30:00Z",
    updated_at: "2026-02-17T16:20:00Z"
  },
  {
    id: "proj-3",
    workspace_id: "ws-1",
    name: "Industrial Warehouse",
    description: "Logistics center with 5000m² floor space and 15m clear height",
    project_type: "industrial",
    location: "Birmingham, UK",
    design_standard: "Eurocode",
    status: "active",
    userRole: ROLES.PROJECT_EDITOR,
    created_at: "2026-02-10T13:45:00Z",
    updated_at: "2026-02-16T11:10:00Z"
  },
  {
    id: "proj-4",
    workspace_id: "ws-2",
    name: "Home Extension",
    description: "Rear extension and loft conversion for Victorian terrace house",
    project_type: "residential",
    location: "London, UK",
    design_standard: "Eurocode",
    status: "active",
    userRole: ROLES.PROJECT_OWNER,
    created_at: "2026-02-12T15:20:00Z",
    updated_at: "2026-02-19T08:30:00Z"
  },
  {
    id: "proj-5",
    workspace_id: "ws-1",
    name: "Bridge Rehabilitation",
    description: "Structural assessment and strengthening of historic railway bridge",
    project_type: "infrastructure",
    location: "York, UK",
    design_standard: "Eurocode",
    status: "active",
    userRole: ROLES.PROJECT_VIEWER,
    created_at: "2026-02-14T11:00:00Z",
    updated_at: "2026-02-15T09:45:00Z"
  }
];

const DEFAULT_MOCK_MEMBERS = [
  {
    id: "member-1",
    user_id: "user-1",
    workspace_id: "ws-1",
    name: "John Engineer",
    email: "john@acme.com",
    role: ROLES.ORG_OWNER,
    avatar: null,
    active: true,
    joined_at: "2026-01-15T08:00:00Z"
  },
  {
    id: "member-2",
    user_id: "user-2",
    workspace_id: "ws-1",
    name: "Sarah Designer",
    email: "sarah@acme.com",
    role: ROLES.ORG_ADMIN,
    avatar: null,
    active: true,
    joined_at: "2026-01-16T09:30:00Z"
  },
  {
    id: "member-3",
    user_id: "user-3",
    workspace_id: "ws-1",
    name: "Mike Analyst",
    email: "mike@acme.com",
    role: ROLES.ORG_EDITOR,
    avatar: null,
    active: true,
    joined_at: "2026-01-20T10:15:00Z"
  },
  {
    id: "member-4",
    user_id: "user-4",
    workspace_id: "ws-1",
    name: "Emma Reviewer",
    email: "emma@acme.com",
    role: ROLES.ORG_MEMBER,
    avatar: null,
    active: true,
    joined_at: "2026-01-25T14:20:00Z"
  }
];

const DEFAULT_PENDING_INVITES = [
  {
    id: "invite-1",
    email: "sarah.pending@example.com",
    role: ROLES.ORG_ADMIN,
    invited_by: "John Engineer",
    invited_at: "2026-05-10T10:30:00Z",
    status: "pending",
    workspace_id: "ws-1"
  },
  {
    id: "invite-2",
    email: "mike.pending@example.com",
    role: ROLES.ORG_EDITOR,
    invited_by: "John Engineer",
    invited_at: "2026-05-09T14:20:00Z",
    status: "pending",
    workspace_id: "ws-1"
  },
  {
    id: "invite-3",
    email: "emma.pending@example.com",
    role: ROLES.ORG_MEMBER,
    invited_by: "Sarah Designer",
    invited_at: "2026-05-08T09:15:00Z",
    status: "pending",
    workspace_id: "ws-1"
  }
];

const DEFAULT_FAILED_INVITES = [
  {
    id: "failed-1",
    email: "invalid.email@example.com",
    role: ROLES.ORG_MEMBER,
    invited_by: "John Engineer",
    invited_at: "2026-05-01T11:00:00Z",
    error: "Email delivery failed",
    status: "failed",
    workspace_id: "ws-1"
  }
];

// Helper functions for permissions
export const hasOrgRole = (userRole, requiredRole) => {
  const userLevel = ORG_ROLE_HIERARCHY[userRole] || 0;
  const requiredLevel = ORG_ROLE_HIERARCHY[requiredRole] || 0;
  return userLevel >= requiredLevel;
};

export const hasProjectRole = (userRole, requiredRole) => {
  const userLevel = PROJECT_ROLE_HIERARCHY[userRole] || 0;
  const requiredLevel = PROJECT_ROLE_HIERARCHY[requiredRole] || 0;
  return userLevel >= requiredLevel;
};

export const canEditWork = (workOwnerId, currentUserId) => {
  return workOwnerId === currentUserId;
};

// Initialize localStorage with default mock data if empty
const initializeLocalStorage = () => {
  if (!localStorage.getItem('mock_workspaces')) {
    localStorage.setItem('mock_workspaces', JSON.stringify(DEFAULT_MOCK_WORKSPACES));
  }
  if (!localStorage.getItem('mock_projects')) {
    localStorage.setItem('mock_projects', JSON.stringify(DEFAULT_MOCK_PROJECTS));
  }
  if (!localStorage.getItem('mock_members')) {
    localStorage.setItem('mock_members', JSON.stringify(DEFAULT_MOCK_MEMBERS));
  }
  if (!localStorage.getItem('mock_pending_invites')) {
    localStorage.setItem('mock_pending_invites', JSON.stringify(DEFAULT_PENDING_INVITES));
  }
  if (!localStorage.getItem('mock_failed_invites')) {
    localStorage.setItem('mock_failed_invites', JSON.stringify(DEFAULT_FAILED_INVITES));
  }
};

// Load mock data from localStorage
const loadMockDataFromLocalStorage = () => {
  initializeLocalStorage();
  return {
    workspaces: JSON.parse(localStorage.getItem('mock_workspaces')),
    projects: JSON.parse(localStorage.getItem('mock_projects')),
    members: JSON.parse(localStorage.getItem('mock_members')),
  };
};

const WorkspaceContext = createContext();

export const WorkspaceProvider = ({ children }) => {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState([]);
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [failedInvites, setFailedInvites] = useState([]);

  // Load mock data on mount
  useEffect(() => {
    if (user) {
      loadWorkspaces();
    }
  }, [user]);

  const loadWorkspaces = async () => {
    setLoading(true);
    setError(null);
    setTimeout(() => {
      const { workspaces: mockWorkspaces } = loadMockDataFromLocalStorage();
      setWorkspaces(mockWorkspaces);
      if (mockWorkspaces.length > 0 && !currentWorkspace) {
        setCurrentWorkspace(mockWorkspaces[0]);
        loadProjects(mockWorkspaces[0].id);
        loadMembers(mockWorkspaces[0].id);
      }
      setLoading(false);
    }, 500);
  };

  const loadProjects = async (workspaceId) => {
    setLoading(true);
    setTimeout(() => {
      const { projects: mockProjects } = loadMockDataFromLocalStorage();
      const filtered = mockProjects.filter(p => p.workspace_id === workspaceId);
      setProjects(filtered);
      setLoading(false);
    }, 300);
  };

  const loadMembers = async (workspaceId) => {
    setLoading(true);
    setTimeout(() => {
      const { members: mockMembers } = loadMockDataFromLocalStorage();
      const filtered = mockMembers.filter(m => m.workspace_id === workspaceId);
      setMembers(filtered);
      setLoading(false);
    }, 300);
  };

  const loadPendingInvites = async (workspaceId) => {
    setLoading(true);
    setTimeout(() => {
      const savedInvites = localStorage.getItem('mock_pending_invites');
      const allInvites = savedInvites ? JSON.parse(savedInvites) : [...DEFAULT_PENDING_INVITES];
      const filtered = allInvites.filter(invite => invite.workspace_id === workspaceId);
      setPendingInvites(filtered);
      setLoading(false);
    }, 300);
  };

  const loadFailedInvites = async (workspaceId) => {
    setLoading(true);
    setTimeout(() => {
      const savedInvites = localStorage.getItem('mock_failed_invites');
      const allInvites = savedInvites ? JSON.parse(savedInvites) : [...DEFAULT_FAILED_INVITES];
      const filtered = allInvites.filter(invite => invite.workspace_id === workspaceId);
      setFailedInvites(filtered);
      setLoading(false);
    }, 300);
  };

  const cancelPendingInvite = async (inviteId) => {
    const savedInvites = localStorage.getItem('mock_pending_invites');
    let allInvites = savedInvites ? JSON.parse(savedInvites) : [...DEFAULT_PENDING_INVITES];
    allInvites = allInvites.filter(invite => invite.id !== inviteId);
    localStorage.setItem('mock_pending_invites', JSON.stringify(allInvites));
    setPendingInvites(prev => prev.filter(invite => invite.id !== inviteId));
    return { success: true };
  };

  const leaveWorkspace = async (workspaceId) => {
    setLoading(true);
    try {
      const savedMembers = localStorage.getItem('mock_members');
      let allMembers = savedMembers ? JSON.parse(savedMembers) : [...DEFAULT_MOCK_MEMBERS];
      allMembers = allMembers.filter(m => !(m.workspace_id === workspaceId && m.user_id === user?.id));
      localStorage.setItem('mock_members', JSON.stringify(allMembers));
      
      const savedWorkspaces = localStorage.getItem('mock_workspaces');
      let allWorkspaces = savedWorkspaces ? JSON.parse(savedWorkspaces) : [...DEFAULT_MOCK_WORKSPACES];
      const updatedWorkspaces = allWorkspaces.filter(w => w.id !== workspaceId);
      localStorage.setItem('mock_workspaces', JSON.stringify(updatedWorkspaces));
      
      setWorkspaces(updatedWorkspaces);
      
      if (currentWorkspace?.id === workspaceId) {
        const nextWorkspace = updatedWorkspaces[0] || null;
        setCurrentWorkspace(nextWorkspace);
        if (nextWorkspace) {
          await loadProjects(nextWorkspace.id);
          await loadMembers(nextWorkspace.id);
        } else {
          setProjects([]);
          setMembers([]);
        }
      }
      
      setLoading(false);
      return { success: true };
    } catch (error) {
      setError(error.message);
      setLoading(false);
      return { success: false, error: error.message };
    }
  };

  const transferOwnership = async (workspaceId, newOwnerId) => {
    setLoading(true);
    try {
      const savedWorkspaces = localStorage.getItem('mock_workspaces');
      const savedMembers = localStorage.getItem('mock_members');
      let allWorkspaces = savedWorkspaces ? JSON.parse(savedWorkspaces) : [...DEFAULT_MOCK_WORKSPACES];
      let allMembers = savedMembers ? JSON.parse(savedMembers) : [...DEFAULT_MOCK_MEMBERS];
      
      const workspaceIndex = allWorkspaces.findIndex(w => w.id === workspaceId);
      if (workspaceIndex === -1) {
        throw new Error('Workspace not found');
      }
      
      const newOwnerMember = allMembers.find(m => m.user_id === newOwnerId && m.workspace_id === workspaceId);
      if (!newOwnerMember) {
        throw new Error('Selected member not found in this workspace');
      }
      
      const currentOwnerMember = allMembers.find(m => m.workspace_id === workspaceId && m.role === ROLES.ORG_OWNER);
      
      allWorkspaces[workspaceIndex].userRole = ROLES.ORG_MEMBER;
      
      allMembers = allMembers.map(m => {
        if (m.user_id === newOwnerId && m.workspace_id === workspaceId) {
          return { ...m, role: ROLES.ORG_OWNER };
        }
        if (m.user_id === currentOwnerMember?.user_id && m.workspace_id === workspaceId) {
          return { ...m, role: ROLES.ORG_MEMBER };
        }
        return m;
      });
      
      localStorage.setItem('mock_workspaces', JSON.stringify(allWorkspaces));
      localStorage.setItem('mock_members', JSON.stringify(allMembers));
      
      setWorkspaces(allWorkspaces);
      if (currentWorkspace?.id === workspaceId) {
        setCurrentWorkspace(allWorkspaces[workspaceIndex]);
      }
      setMembers(allMembers.filter(m => m.workspace_id === workspaceId));
      
      setLoading(false);
      return { success: true };
    } catch (error) {
      setError(error.message);
      setLoading(false);
      return { success: false, error: error.message };
    }
  };

  const deleteOrganization = async (organizationId) => {
    setLoading(true);
    try {
      const savedProjects = localStorage.getItem('mock_projects');
      const allProjects = savedProjects ? JSON.parse(savedProjects) : [];
      const orgProjects = allProjects.filter(p => p.workspace_id === organizationId);
      
      if (orgProjects.length > 0) {
        setLoading(false);
        return { success: false, error: `Cannot delete organization with ${orgProjects.length} project(s). Delete or move all projects first.` };
      }
      
      const savedWorkspaces = localStorage.getItem('mock_workspaces');
      let allWorkspaces = savedWorkspaces ? JSON.parse(savedWorkspaces) : [];
      const updatedWorkspaces = allWorkspaces.filter(w => w.id !== organizationId);
      localStorage.setItem('mock_workspaces', JSON.stringify(updatedWorkspaces));
      
      const savedMembers = localStorage.getItem('mock_members');
      let allMembers = savedMembers ? JSON.parse(savedMembers) : [];
      const updatedMembers = allMembers.filter(m => m.workspace_id !== organizationId);
      localStorage.setItem('mock_members', JSON.stringify(updatedMembers));
      
      setWorkspaces(updatedWorkspaces);
      
      if (currentWorkspace?.id === organizationId) {
        const nextWorkspace = updatedWorkspaces[0] || null;
        setCurrentWorkspace(nextWorkspace);
        if (nextWorkspace) {
          await loadProjects(nextWorkspace.id);
          await loadMembers(nextWorkspace.id);
        } else {
          setProjects([]);
          setMembers([]);
        }
      }
      
      setLoading(false);
      return { success: true };
    } catch (error) {
      setError(error.message);
      setLoading(false);
      return { success: false, error: error.message };
    }
  };

  const createWorkspace = async (workspaceData) => {
    const newWorkspace = {
      id: `ws-${Date.now()}`,
      ...workspaceData,
      industry: workspaceData.industry || 'general',
      member_count: 1,
      project_count: 0,
      userRole: ROLES.ORG_OWNER,
      settings: {
        defaultProjectType: "commercial",
        defaultDesignStandard: "Eurocode",
        notifications: true,
        twoFactorRequired: false,
        ...workspaceData.settings
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_active: new Date().toISOString()
    };
    
    const { workspaces: currentWorkspaces } = loadMockDataFromLocalStorage();
    const updatedWorkspaces = [...currentWorkspaces, newWorkspace];
    localStorage.setItem('mock_workspaces', JSON.stringify(updatedWorkspaces));
    
    setWorkspaces(updatedWorkspaces);
    setCurrentWorkspace(newWorkspace);
    return { success: true, workspace: newWorkspace };
  };

  const switchWorkspace = async (workspace) => {
    setCurrentWorkspace(workspace);
    setCurrentProject(null);
    await loadProjects(workspace.id);
    await loadMembers(workspace.id);
  };

  const switchProject = async (project) => {
    setCurrentProject(project);
  };

  // SET CURRENT PROJECT BY PROJECT ID - ADD THIS FUNCTION
  const setCurrentProjectByProjectId = async (projectId) => {
    setLoading(true);
    try {
      const { projects: mockProjects } = loadMockDataFromLocalStorage();
      const foundProject = mockProjects.find(p => p.id === projectId);
      if (foundProject) {
        setCurrentProject(foundProject);
        setLoading(false);
        return { success: true, project: foundProject };
      } else {
        setLoading(false);
        return { success: false, error: 'Project not found' };
      }
    } catch (error) {
      setError(error.message);
      setLoading(false);
      return { success: false, error: error.message };
    }
  };

  const createProject = async (workspaceId, projectData) => {
    const newProject = {
      id: `proj-${Date.now()}`,
      workspace_id: workspaceId,
      ...projectData,
      status: 'active',
      userRole: ROLES.PROJECT_OWNER,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { projects: currentProjects, workspaces: currentWorkspaces } = loadMockDataFromLocalStorage();
    const updatedProjects = [...currentProjects, newProject];
    localStorage.setItem('mock_projects', JSON.stringify(updatedProjects));
    
    const updatedWorkspaces = currentWorkspaces.map(w => 
      w.id === workspaceId 
        ? { ...w, project_count: (w.project_count || 0) + 1 } 
        : w
    );
    localStorage.setItem('mock_workspaces', JSON.stringify(updatedWorkspaces));
    
    setProjects(updatedProjects);
    setWorkspaces(updatedWorkspaces);
    
    return { success: true, project: newProject };
  };

  const updateProject = async (projectId, projectData) => {
    setLoading(true);
    try {
      const { projects: currentProjects, workspaces: currentWorkspaces } = loadMockDataFromLocalStorage();
      
      const updatedProjects = currentProjects.map(p => 
        p.id === projectId 
          ? { ...p, ...projectData, updated_at: new Date().toISOString() }
          : p
      );
      localStorage.setItem('mock_projects', JSON.stringify(updatedProjects));
      
      setProjects(updatedProjects);
      
      if (currentProject?.id === projectId) {
        setCurrentProject({ ...currentProject, ...projectData, updated_at: new Date().toISOString() });
      }
      
      setLoading(false);
      return { success: true };
    } catch (error) {
      setError(error.message);
      setLoading(false);
      return { success: false, error: error.message };
    }
  };

  const deleteProject = async (projectId) => {
    setLoading(true);
    try {
      const { projects: currentProjects, workspaces: currentWorkspaces } = loadMockDataFromLocalStorage();
      
      const projectToDelete = currentProjects.find(p => p.id === projectId);
      const updatedProjects = currentProjects.filter(p => p.id !== projectId);
      localStorage.setItem('mock_projects', JSON.stringify(updatedProjects));
      
      if (projectToDelete) {
        const updatedWorkspaces = currentWorkspaces.map(w => 
          w.id === projectToDelete.workspace_id 
            ? { ...w, project_count: Math.max(0, (w.project_count || 1) - 1) } 
            : w
        );
        localStorage.setItem('mock_workspaces', JSON.stringify(updatedWorkspaces));
        setWorkspaces(updatedWorkspaces);
      }
      
      setProjects(updatedProjects);
      setLoading(false);
      return { success: true };
    } catch (error) {
      setError(error.message);
      setLoading(false);
      return { success: false, error: error.message };
    }
  };

  const inviteMember = async (workspaceId, email, role) => {
    const newMember = {
      id: `member-${Date.now()}`,
      user_id: `user-${Date.now()}`,
      workspace_id: workspaceId,
      name: email.split('@')[0],
      email: email,
      role: role,
      avatar: null,
      active: true,
      joined_at: new Date().toISOString()
    };
    
    const { members: currentMembers, workspaces: currentWorkspaces } = loadMockDataFromLocalStorage();
    const updatedMembers = [...currentMembers, newMember];
    localStorage.setItem('mock_members', JSON.stringify(updatedMembers));
    
    const updatedWorkspaces = currentWorkspaces.map(w => 
      w.id === workspaceId 
        ? { ...w, member_count: (w.member_count || 0) + 1 } 
        : w
    );
    localStorage.setItem('mock_workspaces', JSON.stringify(updatedWorkspaces));
    
    setMembers([...members, newMember]);
    setWorkspaces(updatedWorkspaces);
    
    return { success: true, member: newMember };
  };

  const updateWorkspace = async (workspaceId, data) => {
    let updates;
    if (data instanceof FormData) {
      updates = {};
      for (let [key, value] of data.entries()) {
        updates[key] = value;
      }
    } else {
      updates = data;
    }
    
    const { workspaces: currentWorkspaces } = loadMockDataFromLocalStorage();
    const updatedWorkspaces = currentWorkspaces.map(w => 
      w.id === workspaceId 
        ? { ...w, ...updates, updated_at: new Date().toISOString() } 
        : w
    );
    localStorage.setItem('mock_workspaces', JSON.stringify(updatedWorkspaces));
    
    setWorkspaces(updatedWorkspaces);
    
    if (currentWorkspace?.id === workspaceId) {
      setCurrentWorkspace({ ...currentWorkspace, ...updates, updated_at: new Date().toISOString() });
    }
    
    return { success: true };
  };

  const deleteWorkspace = async (workspaceId) => {
    const { workspaces: currentWorkspaces } = loadMockDataFromLocalStorage();
    const updatedWorkspaces = currentWorkspaces.filter(w => w.id !== workspaceId);
    localStorage.setItem('mock_workspaces', JSON.stringify(updatedWorkspaces));
    
    setWorkspaces(updatedWorkspaces);
    
    if (currentWorkspace?.id === workspaceId) {
      const nextWorkspace = updatedWorkspaces[0] || null;
      setCurrentWorkspace(nextWorkspace);
      if (nextWorkspace) {
        await loadProjects(nextWorkspace.id);
        await loadMembers(nextWorkspace.id);
      } else {
        setProjects([]);
        setMembers([]);
      }
    }
    return { success: true };
  };

  const removeMember = async (workspaceId, userId) => {
    const { members: currentMembers, workspaces: currentWorkspaces } = loadMockDataFromLocalStorage();
    const updatedMembers = currentMembers.filter(m => m.user_id !== userId);
    localStorage.setItem('mock_members', JSON.stringify(updatedMembers));
    
    const updatedWorkspaces = currentWorkspaces.map(w => 
      w.id === workspaceId 
        ? { ...w, member_count: Math.max(0, (w.member_count || 1) - 1) } 
        : w
    );
    localStorage.setItem('mock_workspaces', JSON.stringify(updatedWorkspaces));
    
    setMembers(members.filter(m => m.user_id !== userId));
    setWorkspaces(updatedWorkspaces);
    
    return { success: true };
  };

  const updateMemberRole = async (workspaceId, userId, role) => {
    const { members: currentMembers } = loadMockDataFromLocalStorage();
    const updatedMembers = currentMembers.map(m => 
      m.user_id === userId ? { ...m, role: role } : m
    );
    localStorage.setItem('mock_members', JSON.stringify(updatedMembers));
    
    setMembers(members.map(m => 
      m.user_id === userId ? { ...m, role: role } : m
    ));
    
    return { success: true };
  };

  // Permission helper functions
  const getUserRoleInWorkspace = (workspace) => {
    return workspace?.userRole || ROLES.ORG_MEMBER;
  };

  const getUserRoleInProject = (project) => {
    return project?.userRole || ROLES.PROJECT_VIEWER;
  };

  const canInviteToWorkspace = () => {
    const role = getUserRoleInWorkspace(currentWorkspace);
    return role === ROLES.ORG_OWNER || role === ROLES.ORG_ADMIN;
  };

  const canInviteToProject = () => {
    const orgRole = getUserRoleInWorkspace(currentWorkspace);
    const projectRole = getUserRoleInProject(currentProject);
    return projectRole === ROLES.PROJECT_OWNER || 
           projectRole === ROLES.PROJECT_ADMIN || 
           orgRole === ROLES.ORG_OWNER || 
           orgRole === ROLES.ORG_ADMIN;
  };

  const canDeleteWorkspace = () => {
    return getUserRoleInWorkspace(currentWorkspace) === ROLES.ORG_OWNER;
  };

  const canDeleteProject = () => {
    return getUserRoleInProject(currentProject) === ROLES.PROJECT_OWNER;
  };

  const canRenameWorkspace = () => {
    return getUserRoleInWorkspace(currentWorkspace) === ROLES.ORG_OWNER;
  };

  const canTransferOwnership = () => {
    return getUserRoleInWorkspace(currentWorkspace) === ROLES.ORG_OWNER;
  };

  const canEditWork = (workOwnerId) => {
    return workOwnerId === user?.id;
  };

  const value = {
    workspaces,
    currentWorkspace,
    currentProject,
    projects,
    members,
    loading,
    error,
    pendingInvites,
    failedInvites,
    createWorkspace,
    switchWorkspace,
    switchProject,
    setCurrentProjectByProjectId,  // ADD THIS
    createProject,
    updateProject,
    deleteProject,
    inviteMember,
    updateWorkspace,
    deleteWorkspace,
    removeMember,
    updateMemberRole,
    leaveWorkspace,
    transferOwnership,
    deleteOrganization,
    loadWorkspaces,
    refreshWorkspaces: loadWorkspaces,
    loadProjects,
    loadMembers,
    loadPendingInvites,
    loadFailedInvites,
    cancelPendingInvite,
    // Permission helpers
    getUserRoleInWorkspace,
    getUserRoleInProject,
    canInviteToWorkspace,
    canInviteToProject,
    canDeleteWorkspace,
    canDeleteProject,
    canRenameWorkspace,
    canTransferOwnership,
    canEditWork,
    ROLES,
    ORG_ROLE_HIERARCHY,
    PROJECT_ROLE_HIERARCHY,
    hasOrgRole,
    hasProjectRole,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};