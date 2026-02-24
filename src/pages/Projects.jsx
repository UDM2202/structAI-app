import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FiFolder, FiPlus, FiSearch, FiFilter, FiGrid, FiList } from 'react-icons/fi';
import { useWorkspace } from '../contexts/WorkspaceContext';

const Projects = () => {
  const { workspaceId } = useParams();
  const { projects, loading, loadProjects } = useWorkspace();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  useEffect(() => {
    loadProjects(workspaceId);
  }, [workspaceId]);

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || project.project_type === filter;
    return matchesSearch && matchesFilter;
  });

  const projectTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'residential', label: 'Residential' },
    { value: 'commercial', label: 'Commercial' },
    { value: 'industrial', label: 'Industrial' },
    { value: 'infrastructure', label: 'Infrastructure' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-[#0A2F44] rounded-lg flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-white text-2xl font-bold">SA</span>
          </div>
          <p className="text-[#6b7280]">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f4f6] dark:bg-[#111827]">
      {/* Header */}
      <div className="bg-white dark:bg-[#1f2937] border-b border-[#e5e7eb] dark:border-[#374151] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[#02090d] dark:text-white">Projects</h1>
              <p className="text-sm text-[#6b7280] dark:text-[#9ca3af] mt-1">
                Manage and organize your structural design projects
              </p>
            </div>
            <Link
              to={`/workspace/${workspaceId}/projects/new`}
              className="flex items-center justify-center space-x-2 bg-[#0A2F44] text-white px-4 py-2 rounded-lg hover:bg-[#082636] transition-colors"
            >
              <FiPlus />
              <span>New Project</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-lg p-4 border border-[#e5e7eb] dark:border-[#374151]">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#9ca3af]" />
              <input
                type="text"
                placeholder="Search projects by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#1f2937] text-[#02090d] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2F44]"
              />
            </div>

            {/* Filter */}
            <div className="flex items-center space-x-2">
              <FiFilter className="text-[#9ca3af]" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#1f2937] text-[#02090d] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2F44]"
              >
                {projectTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            {/* View Toggle */}
            <div className="flex items-center border-l border-[#e5e7eb] dark:border-[#374151] pl-4">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-l-lg ${
                  viewMode === 'grid'
                    ? 'bg-[#0A2F44] text-white'
                    : 'bg-[#f3f4f6] dark:bg-[#374151] text-[#6b7280] dark:text-[#9ca3af] hover:bg-[#e5e7eb] dark:hover:bg-[#4b5563]'
                }`}
              >
                <FiGrid />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-r-lg ${
                  viewMode === 'list'
                    ? 'bg-[#0A2F44] text-white'
                    : 'bg-[#f3f4f6] dark:bg-[#374151] text-[#6b7280] dark:text-[#9ca3af] hover:bg-[#e5e7eb] dark:hover:bg-[#4b5563]'
                }`}
              >
                <FiList />
              </button>
            </div>
          </div>

          {/* Results count */}
          <div className="mt-4 text-sm text-[#6b7280] dark:text-[#9ca3af]">
            Showing {filteredProjects.length} of {projects.length} projects
          </div>
        </div>
      </div>

      {/* Projects Grid/List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {filteredProjects.length === 0 ? (
          <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-lg p-12 text-center border border-[#e5e7eb] dark:border-[#374151]">
            <div className="w-20 h-20 bg-[#e6f0f5] dark:bg-[#1e3a4a] rounded-full flex items-center justify-center mx-auto mb-4">
              <FiFolder className="text-3xl text-[#0A2F44] dark:text-[#cce1eb]" />
            </div>
            <h3 className="text-lg font-semibold text-[#02090d] dark:text-white mb-2">No projects found</h3>
            <p className="text-[#6b7280] dark:text-[#9ca3af] mb-6">
              {searchTerm || filter !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Get started by creating your first project'}
            </p>
            {!searchTerm && filter === 'all' && (
              <Link
                to={`/workspace/${workspaceId}/projects/new`}
                className="inline-flex items-center space-x-2 bg-[#0A2F44] text-white px-6 py-3 rounded-lg hover:bg-[#082636] transition-colors"
              >
                <FiPlus />
                <span>Create New Project</span>
              </Link>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <Link
                key={project.id}
                to={`/workspace/${workspaceId}/projects/${project.id}`}
                className="bg-white dark:bg-[#1f2937] rounded-xl shadow-lg border border-[#e5e7eb] dark:border-[#374151] p-6 hover:shadow-xl transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-[#e6f0f5] dark:bg-[#1e3a4a] rounded-lg flex items-center justify-center">
                    <FiFolder className="text-xl text-[#0A2F44] dark:text-[#cce1eb]" />
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    project.project_type === 'residential' ? 'bg-green-100 text-green-700' :
                    project.project_type === 'commercial' ? 'bg-blue-100 text-blue-700' :
                    'bg-purple-100 text-purple-700'
                  }`}>
                    {project.project_type}
                  </span>
                </div>
                
                <h3 className="text-lg font-semibold text-[#02090d] dark:text-white mb-2">
                  {project.name}
                </h3>
                
                {project.description && (
                  <p className="text-sm text-[#6b7280] dark:text-[#9ca3af] mb-4 line-clamp-2">
                    {project.description}
                  </p>
                )}
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#0A2F44] dark:text-[#cce1eb] font-medium">
                    {project.design_standard || 'Eurocode'}
                  </span>
                  <span className="text-[#9ca3af]">
                    {new Date(project.updated_at).toLocaleDateString()}
                  </span>
                </div>

                {project.location && (
                  <div className="mt-3 text-xs text-[#9ca3af]">
                    📍 {project.location}
                  </div>
                )}
              </Link>
            ))}
          </div>
        ) : (
          // List View
          <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-lg border border-[#e5e7eb] dark:border-[#374151] overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#f9fafb] dark:bg-[#374151] border-b border-[#e5e7eb] dark:border-[#4b5563]">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-[#6b7280] dark:text-[#9ca3af] uppercase tracking-wider">Project</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-[#6b7280] dark:text-[#9ca3af] uppercase tracking-wider">Type</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-[#6b7280] dark:text-[#9ca3af] uppercase tracking-wider">Location</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-[#6b7280] dark:text-[#9ca3af] uppercase tracking-wider">Last Updated</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-[#6b7280] dark:text-[#9ca3af] uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e7eb] dark:divide-[#374151]">
                {filteredProjects.map((project) => (
                  <tr
                    key={project.id}
                    onClick={() => window.location.href = `/workspace/${workspaceId}/projects/${project.id}`}
                    className="hover:bg-[#f9fafb] dark:hover:bg-[#374151] cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-[#02090d] dark:text-white">{project.name}</div>
                      {project.description && (
                        <div className="text-sm text-[#6b7280] dark:text-[#9ca3af]">{project.description.substring(0, 50)}...</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm px-2 py-1 rounded-full ${
                        project.project_type === 'residential' ? 'bg-green-100 text-green-700' :
                        project.project_type === 'commercial' ? 'bg-blue-100 text-blue-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {project.project_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#6b7280] dark:text-[#9ca3af]">
                      {project.location || '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#6b7280] dark:text-[#9ca3af]">
                      {new Date(project.updated_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Projects;