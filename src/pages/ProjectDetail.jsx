import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { 
  FiArrowLeft, FiEdit2, FiTrash2, FiCopy, FiArchive, 
  FiDownload, FiShare2, FiSettings, FiFileText,
  FiBarChart2, FiUsers, FiClock
} from 'react-icons/fi';
import { useWorkspace } from '../contexts/WorkspaceContext';

const ProjectDetail = () => {
  const { workspaceId, projectId } = useParams();
  const navigate = useNavigate();
  const { projects, loading, loadProjects } = useWorkspace();
  const [project, setProject] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    loadProjects(workspaceId);
  }, [workspaceId]);

  useEffect(() => {
    if (projects.length > 0) {
      const found = projects.find(p => p.id === projectId);
      if (found) {
        setProject(found);
      }
    }
  }, [projects, projectId]);

  if (loading || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-[#0A2F44] rounded-lg flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-white text-2xl font-bold">SA</span>
          </div>
          <p className="text-[#6b7280]">Loading project...</p>
        </div>
      </div>
    );
  }

  const handleDelete = () => {
    // API call to delete project
    setShowDeleteModal(false);
    navigate(`/workspace/${workspaceId}/projects`);
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: FiFileText },
    { id: 'calculations', label: 'Calculations', icon: FiBarChart2 },
    { id: 'team', label: 'Team', icon: FiUsers },
    { id: 'settings', label: 'Settings', icon: FiSettings },
  ];

  return (
    <div className="min-h-screen bg-[#f3f4f6] dark:bg-[#111827]">
      {/* Header */}
      <div className="bg-white dark:bg-[#1f2937] border-b border-[#e5e7eb] dark:border-[#374151] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Breadcrumb */}
          <div className="flex items-center space-x-2 text-sm mb-2">
            <Link to={`/workspace/${workspaceId}`} className="text-[#6b7280] hover:text-[#0A2F44]">
              Workspace
            </Link>
            <span className="text-[#9ca3af]">/</span>
            <Link to={`/workspace/${workspaceId}/projects`} className="text-[#6b7280] hover:text-[#0A2F44]">
              Projects
            </Link>
            <Link
  to={`/workspace/${workspaceId}/projects/${projectId}/slab`}
  className="bg-[#0A2F44] text-white px-4 py-2 rounded-lg hover:bg-[#082636]"
>
  Add Slab
</Link>
            <span className="text-[#9ca3af]">/</span>
            <span className="text-[#02090d] dark:text-white font-medium">{project.name}</span>
          </div>

          {/* Title and Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                to={`/workspace/${workspaceId}/projects`}
                className="p-2 hover:bg-[#f3f4f6] dark:hover:bg-[#374151] rounded-lg transition-colors"
              >
                <FiArrowLeft className="text-xl text-[#6b7280]" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-[#02090d] dark:text-white">{project.name}</h1>
                <div className="flex items-center space-x-4 mt-1">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    project.project_type === 'residential' ? 'bg-green-100 text-green-700' :
                    project.project_type === 'commercial' ? 'bg-blue-100 text-blue-700' :
                    'bg-purple-100 text-purple-700'
                  }`}>
                    {project.project_type}
                  </span>
                  <span className="text-sm text-[#6b7280] flex items-center">
                    <FiClock className="mr-1" />
                    Updated {new Date(project.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              <button className="p-2 hover:bg-[#f3f4f6] dark:hover:bg-[#374151] rounded-lg transition-colors">
                <FiEdit2 className="text-[#6b7280]" />
              </button>
              <button className="p-2 hover:bg-[#f3f4f6] dark:hover:bg-[#374151] rounded-lg transition-colors">
                <FiCopy className="text-[#6b7280]" />
              </button>
              <button className="p-2 hover:bg-[#f3f4f6] dark:hover:bg-[#374151] rounded-lg transition-colors">
                <FiArchive className="text-[#6b7280]" />
              </button>
              <button className="p-2 hover:bg-[#f3f4f6] dark:hover:bg-[#374151] rounded-lg transition-colors">
                <FiShare2 className="text-[#6b7280]" />
              </button>
              <button className="p-2 hover:bg-[#f3f4f6] dark:hover:bg-[#374151] rounded-lg transition-colors">
                <FiDownload className="text-[#6b7280]" />
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <FiTrash2 className="text-red-500" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 mt-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[#0A2F44] text-white'
                    : 'text-[#6b7280] hover:text-[#0A2F44] hover:bg-[#f3f4f6] dark:hover:bg-[#374151]'
                }`}
              >
                <tab.icon className="text-lg" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Project Info Card */}
            <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-lg p-6 border border-[#e5e7eb] dark:border-[#374151]">
              <h2 className="text-lg font-semibold text-[#02090d] dark:text-white mb-4">Project Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-[#6b7280] mb-1">Project Name</p>
                  <p className="text-[#02090d] dark:text-white font-medium">{project.name}</p>
                </div>
                <div>
                  <p className="text-sm text-[#6b7280] mb-1">Project Type</p>
                  <p className="text-[#02090d] dark:text-white font-medium capitalize">{project.project_type}</p>
                </div>
                <div>
                  <p className="text-sm text-[#6b7280] mb-1">Location</p>
                  <p className="text-[#02090d] dark:text-white font-medium">{project.location || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-[#6b7280] mb-1">Design Standard</p>
                  <p className="text-[#02090d] dark:text-white font-medium">{project.design_standard || 'Eurocode'}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-[#6b7280] mb-1">Description</p>
                  <p className="text-[#02090d] dark:text-white">{project.description || 'No description provided'}</p>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-lg p-6 border border-[#e5e7eb] dark:border-[#374151]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[#6b7280]">Structural Elements</span>
                  <FiFileText className="text-[#0A2F44]" />
                </div>
                <p className="text-2xl font-bold text-[#02090d] dark:text-white">12</p>
                <p className="text-xs text-[#9ca3af] mt-1">Beams, Columns, Slabs</p>
              </div>

              <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-lg p-6 border border-[#e5e7eb] dark:border-[#374151]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[#6b7280]">Optimization Runs</span>
                  <FiBarChart2 className="text-[#0A2F44]" />
                </div>
                <p className="text-2xl font-bold text-[#02090d] dark:text-white">8</p>
                <p className="text-xs text-[#9ca3af] mt-1">Last run 2 days ago</p>
              </div>

              <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-lg p-6 border border-[#e5e7eb] dark:border-[#374151]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[#6b7280]">Team Members</span>
                  <FiUsers className="text-[#0A2F44]" />
                </div>
                <p className="text-2xl font-bold text-[#02090d] dark:text-white">3</p>
                <p className="text-xs text-[#9ca3af] mt-1">2 active this week</p>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-lg p-6 border border-[#e5e7eb] dark:border-[#374151]">
              <h2 className="text-lg font-semibold text-[#02090d] dark:text-white mb-4">Recent Activity</h2>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-start space-x-3 pb-4 border-b border-[#e5e7eb] dark:border-[#374151] last:border-0">
                    <div className="w-8 h-8 bg-[#e6f0f5] dark:bg-[#1e3a4a] rounded-full flex items-center justify-center">
                      <FiFileText className="text-sm text-[#0A2F44]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-[#02090d] dark:text-white">
                        <span className="font-medium">John Doe</span> updated beam calculations
                      </p>
                      <p className="text-xs text-[#9ca3af] mt-1">2 hours ago</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'calculations' && (
          <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-lg p-6 border border-[#e5e7eb] dark:border-[#374151]">
            <h2 className="text-lg font-semibold text-[#02090d] dark:text-white mb-4">Calculations</h2>
            <p className="text-[#6b7280]">Calculation interface will be here (Phase 3)</p>
          </div>
        )}

        {activeTab === 'team' && (
          <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-lg p-6 border border-[#e5e7eb] dark:border-[#374151]">
            <h2 className="text-lg font-semibold text-[#02090d] dark:text-white mb-4">Team Members</h2>
            <p className="text-[#6b7280]">Team management interface will be here</p>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-lg p-6 border border-[#e5e7eb] dark:border-[#374151]">
            <h2 className="text-lg font-semibold text-[#02090d] dark:text-white mb-4">Project Settings</h2>
            <p className="text-[#6b7280]">Project settings interface will be here</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-[#02090d] dark:text-white mb-2">Delete Project</h3>
            <p className="text-[#6b7280] mb-6">
              Are you sure you want to delete "{project.name}"? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border border-[#e5e7eb] dark:border-[#374151] rounded-lg text-[#6b7280] hover:bg-[#f3f4f6] dark:hover:bg-[#374151] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Delete Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetail;