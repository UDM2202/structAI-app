import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { 
  FiSettings, FiSave, FiTrash2, FiAlertCircle,
  FiImage, FiGlobe, FiBell, FiShield
} from 'react-icons/fi';
import { useWorkspace } from '../contexts/WorkspaceContext';

const WorkspaceSettings = () => {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const { currentWorkspace, updateWorkspace, deleteWorkspace, loading } = useWorkspace();
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    description: '',
    website: '',
    defaultProjectType: 'commercial',
    defaultDesignStandard: 'Eurocode',
    notifications: true,
    twoFactorRequired: false
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  useEffect(() => {
    if (currentWorkspace) {
      setFormData({
        name: currentWorkspace.name || '',
        type: currentWorkspace.type || 'team',
        description: currentWorkspace.description || '',
        website: currentWorkspace.website || '',
        defaultProjectType: currentWorkspace.settings?.defaultProjectType || 'commercial',
        defaultDesignStandard: currentWorkspace.settings?.defaultDesignStandard || 'Eurocode',
        notifications: currentWorkspace.settings?.notifications !== false,
        twoFactorRequired: currentWorkspace.settings?.twoFactorRequired || false
      });
      setLogoPreview(currentWorkspace.logo_url);
    }
  }, [currentWorkspace]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    const formDataToSend = new FormData();
    Object.keys(formData).forEach(key => {
      formDataToSend.append(key, formData[key]);
    });
    if (logoFile) {
      formDataToSend.append('logo', logoFile);
    }
    
    await updateWorkspace(workspaceId, formDataToSend);
    setIsSaving(false);
  };

  const handleDelete = async () => {
    await deleteWorkspace(workspaceId);
    navigate('/dashboard');
  };

  if (loading || !currentWorkspace) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-[#0A2F44] rounded-lg flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-white text-2xl font-bold">SA</span>
          </div>
          <p className="text-[#6b7280]">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f4f6] dark:bg-[#111827]">
      {/* Header */}
      <div className="bg-white dark:bg-[#1f2937] border-b border-[#e5e7eb] dark:border-[#374151]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center space-x-3">
            <FiSettings className="text-2xl text-[#0A2F44]" />
            <div>
              <h1 className="text-2xl font-bold text-[#02090d] dark:text-white">Workspace Settings</h1>
              <p className="text-sm text-[#6b7280] dark:text-[#9ca3af] mt-1">
                Configure your workspace preferences
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Form */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* General Settings */}
          <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-lg p-6 border border-[#e5e7eb] dark:border-[#374151]">
            <h2 className="text-lg font-semibold text-[#02090d] dark:text-white mb-4">General Information</h2>
            
            {/* Logo Upload */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                Workspace Logo
              </label>
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 bg-[#e6f0f5] dark:bg-[#1e3a4a] rounded-lg flex items-center justify-center overflow-hidden">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <FiImage className="text-2xl text-[#0A2F44]" />
                  )}
                </div>
                <div>
                  <input
                    type="file"
                    id="logo"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="logo"
                    className="px-4 py-2 border border-[#e5e7eb] dark:border-[#374151] rounded-lg text-sm text-[#6b7280] hover:bg-[#f3f4f6] dark:hover:bg-[#374151] cursor-pointer transition-colors"
                  >
                    Choose Image
                  </label>
                  <p className="text-xs text-[#9ca3af] mt-2">
                    Recommended: 256x256px, max 2MB
                  </p>
                </div>
              </div>
            </div>

            {/* Workspace Name */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                Workspace Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2F44]"
              />
            </div>

            {/* Workspace Type */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                Workspace Type
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2F44]"
              >
                <option value="personal">Personal</option>
                <option value="team">Team</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>

            {/* Description */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="3"
                className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2F44]"
                placeholder="Tell your team what this workspace is for..."
              />
            </div>

            {/* Website */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                Website
              </label>
              <div className="flex items-center space-x-2">
                <FiGlobe className="text-[#9ca3af]" />
                <input
                  type="url"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  placeholder="https://yourcompany.com"
                  className="flex-1 px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2F44]"
                />
              </div>
            </div>
          </div>

          {/* Default Settings */}
          <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-lg p-6 border border-[#e5e7eb] dark:border-[#374151]">
            <h2 className="text-lg font-semibold text-[#02090d] dark:text-white mb-4">Default Project Settings</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                  Default Project Type
                </label>
                <select
                  name="defaultProjectType"
                  value={formData.defaultProjectType}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white"
                >
                  <option value="residential">Residential</option>
                  <option value="commercial">Commercial</option>
                  <option value="industrial">Industrial</option>
                  <option value="infrastructure">Infrastructure</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                  Design Standard
                </label>
                <select
                  name="defaultDesignStandard"
                  value={formData.defaultDesignStandard}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white"
                >
                  <option value="Eurocode">Eurocode</option>
                  <option value="BS">British Standards</option>
                  <option value="ACI">ACI</option>
                  <option value="AS">Australian Standards</option>
                </select>
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-lg p-6 border border-[#e5e7eb] dark:border-[#374151]">
            <h2 className="text-lg font-semibold text-[#02090d] dark:text-white mb-4">Preferences</h2>
            
            <div className="space-y-4">
              <label className="flex items-center justify-between">
                <span className="text-sm text-[#374151] dark:text-[#d1d5db]">Email Notifications</span>
                <input
                  type="checkbox"
                  name="notifications"
                  checked={formData.notifications}
                  onChange={handleChange}
                  className="w-5 h-5 text-[#0A2F44] rounded"
                />
              </label>
              
              <label className="flex items-center justify-between">
                <span className="text-sm text-[#374151] dark:text-[#d1d5db]">Require 2FA for all members</span>
                <input
                  type="checkbox"
                  name="twoFactorRequired"
                  checked={formData.twoFactorRequired}
                  onChange={handleChange}
                  className="w-5 h-5 text-[#0A2F44] rounded"
                />
              </label>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center space-x-2 bg-[#0A2F44] text-white px-6 py-3 rounded-lg hover:bg-[#082636] transition-colors disabled:opacity-50"
            >
              <FiSave />
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>

          {/* Danger Zone */}
          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 border border-red-200 dark:border-red-800">
            <h2 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-4 flex items-center">
              <FiAlertCircle className="mr-2" />
              Danger Zone
            </h2>
            <p className="text-sm text-red-600 dark:text-red-300 mb-4">
              Once you delete your workspace, there is no going back. All projects and data will be permanently removed.
            </p>
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center space-x-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
            >
              <FiTrash2 />
              <span>Delete Workspace</span>
            </button>
          </div>
        </form>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-[#02090d] dark:text-white mb-2">Delete Workspace</h3>
            <p className="text-[#6b7280] mb-6">
              Are you sure you want to delete "{currentWorkspace.name}"? This action cannot be undone.
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
                Delete Workspace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceSettings;