import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  FiArrowLeft, FiSun, FiMoon, FiHome, FiBriefcase, FiTool,
  FiChevronRight, FiChevronLeft, FiInfo, FiLoader
} from 'react-icons/fi';
import { useTheme } from '../contexts/ThemeContext';
import { useWorkspace } from '../contexts/WorkspaceContext';

const ProjectSetup = () => {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const { createProject } = useWorkspace();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  
  // Form state
  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    projectName: 'UDM Project',
    buildingType: 'commercial',
    location: 'London, UK',
    numberOfFloors: '3',
    
    // Step 2: Building Dimensions
    length: '25',
    width: '15',
    height: '18',
    
    // Step 3: Design Criteria
    designStandard: 'Eurocode',
  });

  // Loading animation effect
  useEffect(() => {
    if (showLoading) {
      const interval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 10; // 10% every second = 10 seconds total
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [showLoading]);

  // Auto-hide loading after 10 seconds and move to step 3
  useEffect(() => {
    if (loadingProgress >= 100) {
      setTimeout(() => {
        setShowLoading(false);
        setStep(3);
        setLoadingProgress(0);
      }, 500); // Small delay after reaching 100%
    }
  }, [loadingProgress]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNext = () => {
    if (step === 2) {
      // Show loading screen when moving from step 2 to step 3
      setShowLoading(true);
    } else {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Create project with the collected data
    const projectData = {
      name: formData.projectName,
      project_type: formData.buildingType,
      location: formData.location,
      description: `${formData.numberOfFloors}-storey ${formData.buildingType} building`,
      settings: {
        numberOfFloors: formData.numberOfFloors,
        dimensions: {
          length: formData.length,
          width: formData.width,
          height: formData.height,
        },
        designStandard: formData.designStandard,
      }
    };
    
    try {
      const result = await createProject(workspaceId, projectData);
      
      if (result.success) {
navigate(`/workspace/${workspaceId}/projects/${result.project.id}/slab-input`);
      } else {
        console.error('Failed to create project:', result.error);
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('Error creating project:', error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] dark:bg-[#111827] flex items-center justify-center py-12 px-4 transition-colors duration-300">
      {/* Theme Toggle */}
      <button
        onClick={toggleDarkMode}
        className="absolute top-4 right-4 p-3 rounded-lg bg-white dark:bg-[#1f2937] shadow-lg hover:shadow-xl transition-all z-10 cursor-pointer"
        style={{ 
          border: '1px solid var(--border-color)'
        }}
      >
        {isDarkMode ? (
          <FiSun className="text-xl text-yellow-500" />
        ) : (
          <FiMoon className="text-xl text-[#0A2F44]" />
        )}
      </button>

      {/* Main Card */}
      <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-xl max-w-2xl w-full p-8 border border-[#e5e7eb] dark:border-[#374151] relative">
        
        {/* Logo */}
        <div className="flex items-center justify-center mb-6">
          <div className="w-12 h-12 bg-[#0A2F44] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">SA</span>
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#02090d] dark:text-white">
            Create Your Workspace
          </h1>
          <p className="text-sm text-[#6b7280] dark:text-[#9ca3af] mt-2">
            Set up your workspace to start collaborating
          </p>
        </div>

        {/* Progress Steps - Hide during loading */}
        {!showLoading && (
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= 1 ? 'bg-[#0A2F44] text-white' : 'bg-[#e5e7eb] dark:bg-[#374151] text-[#6b7280]'
              }`}>
                1
              </div>
              <div className={`w-16 h-1 mx-2 ${
                step >= 2 ? 'bg-[#0A2F44]' : 'bg-[#e5e7eb] dark:bg-[#374151]'
              }`} />
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= 2 ? 'bg-[#0A2F44] text-white' : 'bg-[#e5e7eb] dark:bg-[#374151] text-[#6b7280]'
              }`}>
                2
              </div>
              <div className={`w-16 h-1 mx-2 ${
                step >= 3 ? 'bg-[#0A2F44]' : 'bg-[#e5e7eb] dark:bg-[#374151]'
              }`} />
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= 3 ? 'bg-[#0A2F44] text-white' : 'bg-[#e5e7eb] dark:bg-[#374151] text-[#6b7280]'
              }`}>
                3
              </div>
            </div>
          </div>
        )}

        {/* Loading Splash Screen */}
        {showLoading && (
          <div className="py-12 flex flex-col items-center justify-center min-h-[400px]">
            {/* Animated Logo */}
            <div className="relative mb-8">
              <div className="w-24 h-24 bg-[#0A2F44] rounded-2xl flex items-center justify-center animate-pulse">
                <span className="text-white text-4xl font-bold">SA</span>
              </div>
              <div className="absolute -top-2 -right-2">
                <FiLoader className="text-3xl text-[#0A2F44] animate-spin" />
              </div>
            </div>

            {/* Loading Title */}
            <h2 className="text-2xl font-bold text-[#02090d] dark:text-white mb-4">
              Analyzing Your Project
            </h2>

            {/* Loading Message */}
            <p className="text-[#6b7280] dark:text-[#9ca3af] text-center mb-8 max-w-md">
              We're calculating preliminary structural requirements based on your inputs...
            </p>

            {/* Progress Bar */}
            <div className="w-64 h-2 bg-[#e5e7eb] dark:bg-[#374151] rounded-full overflow-hidden mb-4">
              <div 
                className="h-full bg-[#0A2F44] transition-all duration-300 ease-out"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>

            {/* Progress Percentage */}
            <p className="text-sm text-[#0A2F44] dark:text-[#cce1eb] font-medium">
              {loadingProgress}% Complete
            </p>

            {/* Loading Tips */}
            <div className="mt-8 text-center">
              <p className="text-xs text-[#9ca3af] max-w-sm">
                {loadingProgress < 30 && "✓ Checking span-to-depth ratios..."}
                {loadingProgress >= 30 && loadingProgress < 60 && "✓ Calculating load combinations..."}
                {loadingProgress >= 60 && loadingProgress < 90 && "✓ Optimizing material selection..."}
                {loadingProgress >= 90 && "✓ Preparing your workspace..."}
              </p>
            </div>
          </div>
        )}

        {/* Regular Form Content - Hide during loading */}
        {!showLoading && (
          <form onSubmit={step === 3 ? handleSubmit : (e) => e.preventDefault()}>
            {/* Step 1: Basic Information */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                    Project Name
                  </label>
                  <input
                    type="text"
                    name="projectName"
                    value={formData.projectName}
                    onChange={handleChange}
                    placeholder="e.g., Acme Engineering"
                    className="w-full px-4 py-3 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2F44]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                    Building Type
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { type: 'residential', icon: FiHome, label: 'Residential' },
                      { type: 'commercial', icon: FiBriefcase, label: 'Commercial' },
                      { type: 'industrial', icon: FiTool, label: 'Industrial' },
                    ].map((option) => (
                      <button
                        key={option.type}
                        type="button"
                        onClick={() => setFormData({...formData, buildingType: option.type})}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          formData.buildingType === option.type
                            ? 'border-[#0A2F44] bg-[#e6f0f5] dark:bg-[#1e3a4a]'
                            : 'border-[#e5e7eb] dark:border-[#374151] hover:border-[#99c2d6]'
                        }`}
                      >
                        <option.icon className="mx-auto text-2xl mb-2 text-[#0A2F44]" />
                        <span className="text-sm font-medium text-[#374151] dark:text-[#d1d5db]">
                          {option.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="e.g., London, UK"
                    className="w-full px-4 py-3 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2F44]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                    Number of Floors
                  </label>
                  <input
                    type="number"
                    name="numberOfFloors"
                    value={formData.numberOfFloors}
                    onChange={handleChange}
                    placeholder="e.g., 5"
                    min="1"
                    className="w-full px-4 py-3 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2F44]"
                    required
                  />
                </div>
              </div>
            )}

            {/* Step 2: Building Dimensions */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                      Length (m)
                    </label>
                    <input
                      type="number"
                      name="length"
                      value={formData.length}
                      onChange={handleChange}
                      placeholder="e.g., 25"
                      step="0.1"
                      min="0"
                      className="w-full px-4 py-3 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2F44]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                      Width (m)
                    </label>
                    <input
                      type="number"
                      name="width"
                      value={formData.width}
                      onChange={handleChange}
                      placeholder="e.g., 15"
                      step="0.1"
                      min="0"
                      className="w-full px-4 py-3 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2F44]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                    Building Height (m)
                  </label>
                  <input
                    type="number"
                    name="height"
                    value={formData.height}
                    onChange={handleChange}
                    placeholder="e.g., 18"
                    step="0.1"
                    min="0"
                    className="w-full px-4 py-3 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2F44]"
                    required
                  />
                </div>

                {/* Visual hint */}
                <div className="bg-[#f3f4f6] dark:bg-[#374151] p-4 rounded-lg flex items-start space-x-3">
                  <FiInfo className="text-[#0A2F44] text-xl flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-[#6b7280] dark:text-[#9ca3af]">
                    These dimensions will be used for preliminary structural analysis and material quantity estimation.
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Review & Confirm */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="bg-[#f3f4f6] dark:bg-[#374151] rounded-lg p-6 space-y-4">
                  <h3 className="font-semibold text-[#02090d] dark:text-white">Project Summary</h3>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-[#6b7280] dark:text-[#9ca3af]">Project Name</p>
                      <p className="font-medium text-[#02090d] dark:text-white">{formData.projectName || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[#6b7280] dark:text-[#9ca3af]">Building Type</p>
                      <p className="font-medium text-[#02090d] dark:text-white capitalize">{formData.buildingType || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[#6b7280] dark:text-[#9ca3af]">Location</p>
                      <p className="font-medium text-[#02090d] dark:text-white">{formData.location || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[#6b7280] dark:text-[#9ca3af]">Floors</p>
                      <p className="font-medium text-[#02090d] dark:text-white">{formData.numberOfFloors || '—'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[#6b7280] dark:text-[#9ca3af]">Dimensions</p>
                      <p className="font-medium text-[#02090d] dark:text-white">
                        {formData.length || '—'}m × {formData.width || '—'}m × {formData.height || '—'}m
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-[#e6f0f5] dark:bg-[#1e3a4a] rounded-lg p-4">
                  <p className="text-sm text-[#0A2F44] dark:text-[#cce1eb]">
                    You can invite team members after creating your workspace. Team members can be added from the workspace settings.
                  </p>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-4 border-t border-[#e5e7eb] dark:border-[#374151]">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center space-x-2 px-6 py-2 border border-[#e5e7eb] dark:border-[#374151] rounded-lg text-[#374151] dark:text-[#d1d5db] hover:bg-[#f3f4f6] dark:hover:bg-[#374151] transition-colors"
                >
                  <FiChevronLeft />
                  <span>Back</span>
                </button>
              ) : (
                <div></div>
              )}

              {step < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex items-center space-x-2 px-6 py-2 bg-[#0A2F44] text-white rounded-lg hover:bg-[#082636] transition-colors"
                >
                  <span>Continue</span>
                  <FiChevronRight />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-[#0A2F44] text-white rounded-lg hover:bg-[#082636] transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Project'}
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ProjectSetup;