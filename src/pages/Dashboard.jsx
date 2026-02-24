import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FiGrid, FiFolder, FiFileText, FiSettings, FiHelpCircle, 
  FiSun, FiMoon, FiUser, FiLogOut, FiMenu, FiChevronLeft, FiX,
  FiPlus, FiUsers, FiClock
} from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useTheme } from '../contexts/ThemeContext';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { workspaces, projects, loading, refreshWorkspaces, loadProjects } = useWorkspace();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);

  useEffect(() => {
    refreshWorkspaces();
  }, []);

  // Load projects when workspaces are loaded
  useEffect(() => {
    if (workspaces.length > 0 && !selectedWorkspace) {
      setSelectedWorkspace(workspaces[0]);
      loadProjects(workspaces[0].id);
    }
  }, [workspaces]);

  // Close mobile menu when window resizes to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };
  
const getWorkspaceId = () => {
  return selectedWorkspace?.id || (workspaces.length > 0 ? workspaces[0].id : 'ws-1');
};

const tabs = [
  { name: 'Dashboard', icon: FiGrid, path: '/dashboard', active: true },
  { name: 'New Project', icon: FiPlus, path: `/workspace/${getWorkspaceId()}/projects/new`, active: false },
  { name: 'Projects', icon: FiFolder, path: `/workspace/${getWorkspaceId()}/projects`, active: false },
  { name: 'Reports', icon: FiFileText, path: '/reports', active: false },
  { name: 'Settings', icon: FiSettings, path: '/settings', active: false },
  { name: 'Help', icon: FiHelpCircle, path: '/help', active: false },
];

  // Get user initials for avatar
  const getUserInitials = () => {
    if (user?.name) {
      return user.name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    return 'JE'; // Default
  };

  // Calculate stats
  const totalProjects = workspaces.reduce((acc, w) => acc + (w.project_count || 0), 0);
  const totalMembers = workspaces.reduce((acc, w) => acc + (w.member_count || 1), 0);
  const activeThisMonth = projects.filter(p => {
    const updated = new Date(p.updated_at);
    const now = new Date();
    return updated.getMonth() === now.getMonth() && updated.getFullYear() === now.getFullYear();
  }).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f3f4f6] dark:bg-[#111827]">
        <div className="text-center">
          <div className="w-16 h-16 bg-[#0A2F44] rounded-lg flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-white text-2xl font-bold">SA</span>
          </div>
          <p className="text-[#6b7280] dark:text-[#9ca3af]">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f4f6] dark:bg-[#111827] flex transition-colors duration-300">
      {/* Desktop Sidebar */}
      <div 
        className={`hidden md:flex bg-white dark:bg-[#1f2937] border-r border-[#e5e7eb] dark:border-[#374151] flex-col transition-all duration-300 ${
          isSidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-[#e5e7eb] dark:border-[#374151]">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-[#0A2F44] rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">SA</span>
            </div>
            {isSidebarOpen && (
              <span className="font-bold text-[#02090d] dark:text-white">StructuraAI</span>
            )}
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {tabs.map((tab) => (
              <li key={tab.name}>
                <Link
                  to={tab.path}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    tab.active
                      ? 'bg-[#0A2F44] text-white'
                      : 'text-[#6b7280] dark:text-[#9ca3af] hover:bg-[#f3f4f6] dark:hover:bg-[#374151] hover:text-[#0A2F44] dark:hover:text-[#cce1eb]'
                  }`}
                  title={!isSidebarOpen ? tab.name : ''}
                >
                  <tab.icon className="text-lg flex-shrink-0" />
                  {isSidebarOpen && (
                    <span className="text-sm font-medium">{tab.name}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Desktop User Section */}
        <div className="p-4 border-t border-[#e5e7eb] dark:border-[#374151]">
          {isSidebarOpen ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-[#0A2F44] rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {getUserInitials()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#02090d] dark:text-white">
                      {user?.name || 'John Engineer'}
                    </p>
                    <p className="text-xs text-[#6b7280] dark:text-[#9ca3af]">
                      {user?.email || 'john@example.com'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={toggleDarkMode}
                  className="p-2 rounded-lg hover:bg-[#f3f4f6] dark:hover:bg-[#374151] transition-colors cursor-pointer"
                  title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                  {isDarkMode ? (
                    <FiSun className="text-xl text-yellow-500" />
                  ) : (
                    <FiMoon className="text-xl text-[#0A2F44]" />
                  )}
                </button>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <FiLogOut />
                <span>Logout</span>
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center space-y-4">
              <div className="w-8 h-8 bg-[#0A2F44] rounded-full flex items-center justify-center text-white text-sm font-medium">
                {getUserInitials()}
              </div>
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg hover:bg-[#f3f4f6] dark:hover:bg-[#374151] transition-colors cursor-pointer"
                title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {isDarkMode ? (
                  <FiSun className="text-xl text-yellow-500" />
                ) : (
                  <FiMoon className="text-xl text-[#0A2F44]" />
                )}
              </button>
              <button
                onClick={handleLogout}
                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Logout"
              >
                <FiLogOut className="text-lg" />
              </button>
            </div>
          )}
        </div>

        {/* Desktop Sidebar Toggle */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="hidden md:flex absolute items-center justify-center w-6 h-6 bg-white dark:bg-[#1f2937] border border-[#e5e7eb] dark:border-[#374151] rounded-full shadow-md hover:shadow-lg transition-all cursor-pointer"
          style={{ 
            left: isSidebarOpen ? 'calc(16rem - 12px)' : 'calc(5rem - 12px)',
            top: '84px'
          }}
        >
          {isSidebarOpen ? (
            <FiChevronLeft className="text-sm text-[#6b7280]" />
          ) : (
            <FiMenu className="text-sm text-[#6b7280]" />
          )}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="fixed left-0 top-0 h-full w-[75%] bg-white dark:bg-[#1f2937] z-50 md:hidden shadow-2xl animate-slide-right">
            <div className="flex flex-col h-full">
              <div className="p-6 border-b border-[#e5e7eb] dark:border-[#374151] flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-[#0A2F44] rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">SA</span>
                  </div>
                  <span className="font-bold text-[#02090d] dark:text-white">StructuraAI</span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 hover:bg-[#f3f4f6] dark:hover:bg-[#374151] rounded-lg transition-colors"
                >
                  <FiX className="text-xl text-[#6b7280]" />
                </button>
              </div>
              <nav className="flex-1 p-4 overflow-y-auto">
                <ul className="space-y-2">
                  {tabs.map((tab) => (
                    <li key={tab.name}>
                      <Link
                        to={tab.path}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                          tab.active
                            ? 'bg-[#0A2F44] text-white'
                            : 'text-[#6b7280] dark:text-[#9ca3af] hover:bg-[#f3f4f6] dark:hover:bg-[#374151] hover:text-[#0A2F44] dark:hover:text-[#cce1eb]'
                        }`}
                      >
                        <tab.icon className="text-lg flex-shrink-0" />
                        <span className="text-sm font-medium">{tab.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
              <div className="p-4 border-t border-[#e5e7eb] dark:border-[#374151]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-[#0A2F44] rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {getUserInitials()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#02090d] dark:text-white">
                        {user?.name || 'John Engineer'}
                      </p>
                      <p className="text-xs text-[#6b7280] dark:text-[#9ca3af]">
                        {user?.email || 'john@example.com'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={toggleDarkMode}
                    className="p-2 rounded-lg hover:bg-[#f3f4f6] dark:hover:bg-[#374151] transition-colors cursor-pointer"
                  >
                    {isDarkMode ? (
                      <FiSun className="text-xl text-yellow-500" />
                    ) : (
                      <FiMoon className="text-xl text-[#0A2F44]" />
                    )}
                  </button>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <FiLogOut />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white dark:bg-[#1f2937] border-b border-[#e5e7eb] dark:border-[#374151] p-4 sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden p-2 rounded-lg hover:bg-[#f3f4f6] dark:hover:bg-[#374151] transition-colors cursor-pointer"
              >
                <FiMenu className="text-xl text-[#6b7280]" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-[#02090d] dark:text-white">
                  Welcome, {user?.name?.split(' ')[0] || 'John'}!
                </h1>
                <p className="text-sm text-[#6b7280] dark:text-[#9ca3af]">
                  Manage your projects and team members
                </p>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="w-10 h-10 bg-[#0A2F44] rounded-full flex items-center justify-center text-white font-medium shadow-md">
                {getUserInitials()}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="p-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-lg p-6 border border-[#e5e7eb] dark:border-[#374151]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[#6b7280] dark:text-[#9ca3af]">Total Projects</span>
                <FiFolder className="text-[#0A2F44] dark:text-[#cce1eb]" />
              </div>
              <p className="text-3xl font-bold text-[#02090d] dark:text-white">{totalProjects}</p>
            </div>

            <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-lg p-6 border border-[#e5e7eb] dark:border-[#374151]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[#6b7280] dark:text-[#9ca3af]">Team Members</span>
                <FiUsers className="text-[#0A2F44] dark:text-[#cce1eb]" />
              </div>
              <p className="text-3xl font-bold text-[#02090d] dark:text-white">{totalMembers}</p>
            </div>

            <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-lg p-6 border border-[#e5e7eb] dark:border-[#374151]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[#6b7280] dark:text-[#9ca3af]">Active This Month</span>
                <FiClock className="text-[#0A2F44] dark:text-[#cce1eb]" />
              </div>
              <p className="text-3xl font-bold text-[#02090d] dark:text-white">{activeThisMonth}</p>
            </div>
          </div>

          {/* Recent Projects Section */}
          <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-lg border border-[#e5e7eb] dark:border-[#374151] p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-[#02090d] dark:text-white">Recent Projects</h3>
              <Link 
                to="/workspace/ws-1/projects" 
                className="text-sm text-[#0A2F44] dark:text-[#cce1eb] hover:underline"
              >
                View all
              </Link>
            </div>

            {workspaces.length === 0 ? (
              /* Empty State */
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-[#e6f0f5] dark:bg-[#1e3a4a] rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiFolder className="text-3xl text-[#0A2F44] dark:text-[#cce1eb]" />
                </div>
                <h4 className="text-lg font-medium text-[#02090d] dark:text-white mb-2">
                  No projects yet
                </h4>
                <p className="text-[#6b7280] dark:text-[#9ca3af] mb-6">
                  Create your first project to get started
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-3">
                // Empty State Button
<Link
  to={`/workspace/${selectedWorkspace?.id || 'ws-1'}/projects/new`}
  className="inline-flex items-center justify-center space-x-2 bg-[#0A2F44] text-white px-6 py-3 rounded-lg hover:bg-[#082636] transition-colors"
>
  <FiPlus />
  <span>New Project</span>
</Link>
                  <Link
                    to="/workspace/ws-1/members"
                    className="inline-flex items-center justify-center space-x-2 border border-[#e5e7eb] dark:border-[#374151] text-[#374151] dark:text-[#d1d5db] px-6 py-3 rounded-lg hover:bg-[#f3f4f6] dark:hover:bg-[#374151] transition-colors"
                  >
                    <FiUsers />
                    <span>Invite Team</span>
                  </Link>
                </div>
              </div>
            ) : (
              /* Projects Grid */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {workspaces.map((workspace) => (
                  <Link
                    key={workspace.id}
                    to={`/workspace/${workspace.id}`}
                    className="block p-6 border border-[#e5e7eb] dark:border-[#374151] rounded-lg hover:shadow-lg transition-all group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <span className="text-sm text-[#6b7280] dark:text-[#9ca3af]">
                          {workspace.project_count || 0} projects
                        </span>
                      </div>
                      <div className="w-8 h-8 bg-[#e6f0f5] dark:bg-[#1e3a4a] rounded-lg flex items-center justify-center">
                        <FiFolder className="text-[#0A2F44] dark:text-[#cce1eb]" />
                      </div>
                    </div>
                    
                    <h4 className="text-lg font-semibold text-[#02090d] dark:text-white mb-2">
                      {workspace.name}
                    </h4>
                    
                    <p className="text-sm text-[#6b7280] dark:text-[#9ca3af] mb-4 line-clamp-2">
                      {workspace.description || 'No description available'}
                    </p>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center text-[#6b7280] dark:text-[#9ca3af]">
                        <FiUsers className="mr-1" />
                        {workspace.member_count || 1} members
                      </span>
                      <span className="text-xs text-[#9ca3af]">
                        {new Date(workspace.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions - Only show when projects exist */}
          {workspaces.length > 0 && (
            <div className="mt-6 flex justify-end space-x-3">
<Link
  to={`/workspace/${selectedWorkspace?.id || 'ws-1'}/projects/new`}
  className="inline-flex items-center space-x-2 bg-[#0A2F44] text-white px-4 py-2 rounded-lg hover:bg-[#082636] transition-colors"
>
  <FiPlus />
  <span>New Project</span>
</Link>
              <Link
                to="/workspace/ws-1/members"
                className="inline-flex items-center space-x-2 border border-[#e5e7eb] dark:border-[#374151] text-[#374151] dark:text-[#d1d5db] px-4 py-2 rounded-lg hover:bg-[#f3f4f6] dark:hover:bg-[#374151] transition-colors"
              >
                <FiUsers />
                <span>Invite Team</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;