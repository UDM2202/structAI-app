import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext';

// TEMPORARY MOCK DATA - REMOVE WHEN BACKEND IS READY
const MOCK_WORKSPACES = [
  {
    id: "ws-1",
    name: "Acme Engineering",
    type: "team",
    description: "Leading structural engineering firm specializing in commercial and residential projects",
    logo_url: null,
    website: "https://acme-eng.com",
    member_count: 5,
    project_count: 12,
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
    description: "My personal structural design experiments and side projects",
    logo_url: null,
    website: null,
    member_count: 1,
    project_count: 3,
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

const MOCK_PROJECTS = [
  {
    id: "proj-1",
    workspace_id: "ws-1",
    name: "London Office Tower",
    description: "25-storey commercial office building in Canary Wharf with retail space on ground floor",
    project_type: "commercial",
    location: "London, UK",
    design_standard: "Eurocode",
    status: "active",
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
    created_at: "2026-02-14T11:00:00Z",
    updated_at: "2026-02-15T09:45:00Z"
  }
];

const MOCK_MEMBERS = [
  {
    id: "member-1",
    user_id: "user-1",
    workspace_id: "ws-1",
    name: "John Engineer",
    email: "john@acme.com",
    role: "owner",
    avatar: null,
    joined_at: "2026-01-15T08:00:00Z"
  },
  {
    id: "member-2",
    user_id: "user-2",
    workspace_id: "ws-1",
    name: "Sarah Designer",
    email: "sarah@acme.com",
    role: "admin",
    avatar: null,
    joined_at: "2026-01-16T09:30:00Z"
  },
  {
    id: "member-3",
    user_id: "user-3",
    workspace_id: "ws-1",
    name: "Mike Analyst",
    email: "mike@acme.com",
    role: "member",
    avatar: null,
    joined_at: "2026-01-20T10:15:00Z"
  },
  {
    id: "member-4",
    user_id: "user-4",
    workspace_id: "ws-1",
    name: "Emma Reviewer",
    email: "emma@acme.com",
    role: "viewer",
    avatar: null,
    joined_at: "2026-01-25T14:20:00Z"
  }
];

const WorkspaceContext = createContext();

export const WorkspaceProvider = ({ children }) => {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState([]);
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [projects, setProjects] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load mock data on mount
  useEffect(() => {
    if (user) {
      loadWorkspaces();
    }
  }, [user]);

  const loadWorkspaces = async () => {
    setLoading(true);
    setError(null);
    // Simulate API delay
    setTimeout(() => {
      setWorkspaces(MOCK_WORKSPACES);
      if (MOCK_WORKSPACES.length > 0 && !currentWorkspace) {
        setCurrentWorkspace(MOCK_WORKSPACES[0]);
        loadProjects(MOCK_WORKSPACES[0].id);
        loadMembers(MOCK_WORKSPACES[0].id);
      }
      setLoading(false);
    }, 500);
  };

  const loadProjects = async (workspaceId) => {
    setLoading(true);
    setTimeout(() => {
      const filtered = MOCK_PROJECTS.filter(p => p.workspace_id === workspaceId);
      setProjects(filtered);
      setLoading(false);
    }, 300);
  };

  const loadMembers = async (workspaceId) => {
    setLoading(true);
    setTimeout(() => {
      const filtered = MOCK_MEMBERS.filter(m => m.workspace_id === workspaceId);
      setMembers(filtered);
      setLoading(false);
    }, 300);
  };

  const createWorkspace = async (workspaceData) => {
    const newWorkspace = {
      id: `ws-${Date.now()}`,
      ...workspaceData,
      member_count: 1,
      project_count: 0,
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
    setWorkspaces([...workspaces, newWorkspace]);
    return { success: true, workspace: newWorkspace };
  };

  const switchWorkspace = async (workspace) => {
    setCurrentWorkspace(workspace);
    await loadProjects(workspace.id);
    await loadMembers(workspace.id);
  };

  const createProject = async (workspaceId, projectData) => {
    const newProject = {
      id: `proj-${Date.now()}`,
      workspace_id: workspaceId,
      ...projectData,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    setProjects([...projects, newProject]);
    
    // Update project count in workspace
    setWorkspaces(workspaces.map(w => 
      w.id === workspaceId 
        ? { ...w, project_count: (w.project_count || 0) + 1 } 
        : w
    ));
    
    return { success: true, project: newProject };
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
      joined_at: new Date().toISOString()
    };
    setMembers([...members, newMember]);
    
    // Update member count in workspace
    setWorkspaces(workspaces.map(w => 
      w.id === workspaceId 
        ? { ...w, member_count: (w.member_count || 0) + 1 } 
        : w
    ));
    
    return { success: true, member: newMember };
  };

  const updateWorkspace = async (workspaceId, data) => {
    // Handle both FormData and regular objects
    let updates;
    if (data instanceof FormData) {
      updates = {};
      for (let [key, value] of data.entries()) {
        updates[key] = value;
      }
    } else {
      updates = data;
    }
    
    setWorkspaces(workspaces.map(w => 
      w.id === workspaceId 
        ? { ...w, ...updates, updated_at: new Date().toISOString() } 
        : w
    ));
    
    if (currentWorkspace?.id === workspaceId) {
      setCurrentWorkspace({ ...currentWorkspace, ...updates, updated_at: new Date().toISOString() });
    }
    
    return { success: true };
  };

  const deleteWorkspace = async (workspaceId) => {
    setWorkspaces(workspaces.filter(w => w.id !== workspaceId));
    if (currentWorkspace?.id === workspaceId) {
      const nextWorkspace = workspaces.find(w => w.id !== workspaceId);
      setCurrentWorkspace(nextWorkspace || null);
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
    setMembers(members.filter(m => m.user_id !== userId));
    
    // Update member count in workspace
    setWorkspaces(workspaces.map(w => 
      w.id === workspaceId 
        ? { ...w, member_count: Math.max(0, (w.member_count || 1) - 1) } 
        : w
    ));
    
    return { success: true };
  };

  const updateMemberRole = async (workspaceId, userId, role) => {
    setMembers(members.map(m => 
      m.user_id === userId ? { ...m, role } : m
    ));
    return { success: true };
  };

  const value = {
    workspaces,
    currentWorkspace,
    projects,
    members,
    loading,
    error,
    createWorkspace,
    switchWorkspace,
    createProject,
    inviteMember,
    updateWorkspace,
    deleteWorkspace,
    removeMember,
    updateMemberRole,
    loadWorkspaces,
    refreshWorkspaces: loadWorkspaces,
    loadProjects,
    loadMembers,
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