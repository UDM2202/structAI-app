
export const mockAPI = {
  // Mock response helper
  _mockResponse: (data, delay = 500) => {
    return new Promise((resolve) => {
      setTimeout(() => resolve({ data, status: 200 }), delay);
    });
  },

  // Organization mock endpoints
  organizations: {
    getOrganizations: () => mockAPI._mockResponse([
      {
        id: 'org_personal_user123',
        name: "John's Organization",
        type: 'personal',
        is_personal: true,
        owner_id: 'user123',
        role: 'owner',
        created_at: new Date().toISOString()
      }
    ]),
    
    createOrganization: (data) => mockAPI._mockResponse({
      id: `org_${Date.now()}`,
      ...data,
      created_at: new Date().toISOString()
    }),
  },
  
  // Project mock endpoints
  projects: {
    getProjects: () => mockAPI._mockResponse([]),
    createProject: (data) => mockAPI._mockResponse({
      id: `proj_${Date.now()}`,
      ...data,
      created_at: new Date().toISOString()
    }),
  }
};