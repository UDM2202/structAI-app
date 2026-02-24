import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBriefcase, FiUsers, FiChevronRight, FiChevronDown } from 'react-icons/fi';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useTheme } from '../contexts/ThemeContext';

const CreateWorkspace = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    type: 'personal',
    teamSize: '1-5',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTeamSizeOpen, setIsTeamSizeOpen] = useState(false);
  const { createWorkspace } = useWorkspace();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleTeamSizeSelect = (value) => {
    setFormData({
      ...formData,
      teamSize: value,
    });
    setIsTeamSizeOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const result = await createWorkspace(formData);
    
    if (result.success) {
      navigate(`/workspace/${result.workspace.id}`);
    }
    
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] dark:bg-[#111827] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    i <= step
                      ? 'bg-[#0A2F44] text-white'
                      : 'bg-[#e5e7eb] dark:bg-[#374151] text-[#6b7280] dark:text-[#9ca3af]'
                  }`}
                >
                  {i}
                </div>
                {i < 3 && (
                  <FiChevronRight
                    className={`mx-2 ${
                      i < step
                        ? 'text-[#0A2F44]'
                        : 'text-[#d1d5db] dark:text-[#4b5563]'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-[#0A2F44] rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-2xl font-bold">SA</span>
            </div>
            <h1 className="text-2xl font-bold text-[#02090d] dark:text-white">
              Create Your Workspace
            </h1>
            <p className="mt-2 text-[#6b7280] dark:text-[#9ca3af]">
              Set up your workspace to start collaborating
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {step === 1 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                    Workspace Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g., Acme Engineering"
                    className="w-full px-4 py-3 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2F44]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                    Workspace Type
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'personal' })}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        formData.type === 'personal'
                          ? 'border-[#0A2F44] bg-[#e6f0f5] dark:bg-[#1e3a4a]'
                          : 'border-[#e5e7eb] dark:border-[#374151] hover:border-[#99c2d6]'
                      }`}
                    >
                      <FiBriefcase className="mx-auto text-2xl mb-2 text-[#0A2F44]" />
                      <span className="text-sm font-medium text-[#374151] dark:text-[#d1d5db]">
                        Personal
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'team' })}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        formData.type === 'team'
                          ? 'border-[#0A2F44] bg-[#e6f0f5] dark:bg-[#1e3a4a]'
                          : 'border-[#e5e7eb] dark:border-[#374151] hover:border-[#99c2d6]'
                      }`}
                    >
                      <FiUsers className="mx-auto text-2xl mb-2 text-[#0A2F44]" />
                      <span className="text-sm font-medium text-[#374151] dark:text-[#d1d5db]">
                        Team
                      </span>
                    </button>
                  </div>
                </div>

                {formData.type === 'team' && (
                  <div>
                    <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                      Team Size
                    </label>
                    
                    {/* Custom Select with Rotating Arrow */}
                    <div className="relative">
                      {/* Hidden native select - we keep this for form submission */}
                      <select
                        name="teamSize"
                        value={formData.teamSize}
                        onChange={handleChange}
                        className="sr-only" // Screen reader only, visually hidden
                      >
                        <option value="1-5">1-5 members</option>
                        <option value="6-20">6-20 members</option>
                        <option value="21-50">21-50 members</option>
                        <option value="50+">50+ members</option>
                      </select>

                      {/* Custom dropdown button */}
                      <button
                        type="button"
                        onClick={() => setIsTeamSizeOpen(!isTeamSizeOpen)}
                        className="w-full px-4 py-3 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-[#0A2F44]"
                      >
                        <span>{formData.teamSize} members</span>
                        <FiChevronDown
                          className={`w-5 h-5 text-[#6b7280] dark:text-[#9ca3af] transition-transform duration-300 ${
                            isTeamSizeOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>

                      {/* Dropdown options */}
                      {isTeamSizeOpen && (
                        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-[#1f2937] border border-[#e5e7eb] dark:border-[#374151] rounded-lg shadow-lg overflow-hidden">
                          {['1-5', '6-20', '21-50', '50+'].map((size) => (
                            <button
                              key={size}
                              type="button"
                              onClick={() => handleTeamSizeSelect(size)}
                              className={`w-full px-4 py-3 text-left hover:bg-[#f3f4f6] dark:hover:bg-[#374151] transition-colors ${
                                formData.teamSize === size
                                  ? 'bg-[#e6f0f5] dark:bg-[#1e3a4a] text-[#0A2F44] dark:text-[#cce1eb]'
                                  : 'text-[#02090d] dark:text-white'
                              }`}
                            >
                              {size} members
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {step === 2 && (
              <div className="text-center py-8">
                <FiUsers className="text-5xl text-[#0A2F44] mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[#02090d] dark:text-white mb-2">
                  Invite Your Team
                </h3>
                <p className="text-[#6b7280] dark:text-[#9ca3af] mb-6">
                  You can invite team members after creating your workspace
                </p>
                <div className="bg-[#f3f4f6] dark:bg-[#374151] p-4 rounded-lg">
                  <p className="text-sm text-[#4b5563] dark:text-[#d1d5db]">
                    Team members can be added from the workspace settings
                  </p>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-[#e8f5e9] dark:bg-[#1e3a4a] rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-[#0A2F44]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-[#02090d] dark:text-white mb-2">
                  You're All Set!
                </h3>
                <p className="text-[#6b7280] dark:text-[#9ca3af] mb-6">
                  Your workspace is ready to go
                </p>
              </div>
            )}

            <div className="flex justify-between pt-4">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="px-6 py-2 border border-[#e5e7eb] dark:border-[#374151] rounded-lg text-[#374151] dark:text-[#d1d5db] hover:bg-[#f3f4f6] dark:hover:bg-[#374151] transition-colors"
                >
                  Back
                </button>
              )}
              {step < 3 ? (
                <button
                  type="button"
                  onClick={() => setStep(step + 1)}
                  className="ml-auto px-6 py-2 bg-[#0A2F44] text-white rounded-lg hover:bg-[#082636] transition-colors"
                >
                  Continue
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="ml-auto px-6 py-2 bg-[#0A2F44] text-white rounded-lg hover:bg-[#082636] transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Workspace'}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateWorkspace;