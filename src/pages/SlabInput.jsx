import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FiArrowLeft, FiGrid, FiDroplet, FiLayers, FiPercent, 
  FiClock, FiWind, FiSun, FiMoon, FiMenu 
} from 'react-icons/fi';
import { useTheme } from '../contexts/ThemeContext';
import { useWorkspace } from '../contexts/WorkspaceContext';

const SlabInput = () => {
  const { workspaceId, projectId } = useParams();
  const navigate = useNavigate();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const { currentWorkspace } = useWorkspace();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isOptimising, setIsOptimising] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    // Slab Geometry
    slabType: 'one-way',
    spanX: '6.0',
    spanY: '4.0',
    thickness: '200',
    cover: '25',
    
    // Loads
    deadLoad: '2.5',
    liveLoad: '3.0',
    finishes: '1.0',
    partition: '1.0',
    
    // Materials
    concreteGrade: 'C30/37',
    reinforcementGrade: 'B500',
    exposureClass: 'XC3',
    
    // Constraints
    deflectionLimit: 'L/250',
    crackWidthLimit: '0.3',
    fireRating: '60',
    
    // Optimisation
    costWeight: '15',
    carbonWeight: '30',
    materialWeight: '20',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleValidate = async () => {
    setIsValidating(true);
    // Simulate validation
    setTimeout(() => {
      setIsValidating(false);
      alert('✅ Slab validation passed! (Mock)');
    }, 1500);
  };

  const handleOptimise = async () => {
    setIsOptimising(true);
    // Simulate optimisation
    setTimeout(() => {
      setIsOptimising(false);
      navigate(`/workspace/${workspaceId}/projects/${projectId}/results`);
    }, 2000);
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    return 'JE'; // Mock for now
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] dark:bg-[#111827] flex transition-colors duration-300">
      {/* Mobile Menu Overlay */}
      {isSidebarOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
          <div className="fixed left-0 top-0 h-full w-[75%] bg-white dark:bg-[#1f2937] z-50 md:hidden shadow-2xl animate-slide-right">
            {/* Mobile sidebar content - simplified */}
            <div className="p-6 border-b border-[#e5e7eb] dark:border-[#374151]">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-[#0A2F44] rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">SA</span>
                </div>
                <span className="font-bold text-[#02090d] dark:text-white">StructAI</span>
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
              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden p-2 rounded-lg hover:bg-[#f3f4f6] dark:hover:bg-[#374151] transition-colors cursor-pointer"
              >
                <FiMenu className="text-xl text-[#6b7280]" />
              </button>
              
              {/* Back Button */}
              <button
                onClick={() => navigate(-1)}
                className="flex items-center space-x-2 text-[#6b7280] hover:text-[#0A2F44] dark:hover:text-[#cce1eb] transition-colors cursor-pointer"
              >
                <FiArrowLeft className="text-lg" />
                <span className="text-sm font-medium">Back to Project</span>
              </button>
            </div>

            {/* Right side - Theme toggle and user */}
            <div className="flex items-center space-x-3">
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
              <div className="w-8 h-8 bg-[#0A2F44] rounded-full flex items-center justify-center text-white text-sm font-medium">
                {getUserInitials()}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Title */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-[#02090d] dark:text-white flex items-center">
              <FiGrid className="mr-3 text-[#0A2F44]" />
              Slab Input
            </h1>
            <p className="text-sm text-[#6b7280] dark:text-[#9ca3af] mt-1">
              Enter slab parameters for structural analysis and optimisation
            </p>
          </div>

          {/* Form Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Slab Geometry Card */}
              <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-lg border border-[#e5e7eb] dark:border-[#374151] p-6">
                <h2 className="text-lg font-semibold text-[#02090d] dark:text-white mb-4 flex items-center">
                  <FiLayers className="mr-2 text-[#0A2F44]" />
                  Slab Geometry
                </h2>
                
                <div className="space-y-4">
                  {/* Slab Type */}
                  <div>
                    <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                      Slab Type
                    </label>
                    <div className="flex space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="slabType"
                          value="one-way"
                          checked={formData.slabType === 'one-way'}
                          onChange={handleChange}
                          className="w-4 h-4 text-[#0A2F44]"
                        />
                        <span className="ml-2 text-sm text-[#02090d] dark:text-white">One-way</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="slabType"
                          value="two-way"
                          checked={formData.slabType === 'two-way'}
                          onChange={handleChange}
                          className="w-4 h-4 text-[#0A2F44]"
                        />
                        <span className="ml-2 text-sm text-[#02090d] dark:text-white">Two-way</span>
                      </label>
                    </div>
                  </div>

                  {/* Span X */}
                  <div>
                    <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                      Span X (m)
                    </label>
                    <input
                      type="number"
                      name="spanX"
                      value={formData.spanX}
                      onChange={handleChange}
                      step="0.1"
                      min="0"
                      className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2F44]"
                    />
                  </div>

                  {/* Span Y */}
                  <div>
                    <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                      Span Y (m)
                    </label>
                    <input
                      type="number"
                      name="spanY"
                      value={formData.spanY}
                      onChange={handleChange}
                      step="0.1"
                      min="0"
                      className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2F44]"
                    />
                  </div>

                  {/* Slab Thickness */}
                  <div>
                    <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                      Slab Thickness (mm)
                    </label>
                    <input
                      type="number"
                      name="thickness"
                      value={formData.thickness}
                      onChange={handleChange}
                      step="5"
                      min="100"
                      className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2F44]"
                    />
                  </div>

                  {/* Concrete Cover */}
                  <div>
                    <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                      Concrete Cover (mm)
                    </label>
                    <input
                      type="number"
                      name="cover"
                      value={formData.cover}
                      onChange={handleChange}
                      step="5"
                      min="15"
                      className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2F44]"
                    />
                  </div>
                </div>
              </div>

              {/* Loads Card */}
              <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-lg border border-[#e5e7eb] dark:border-[#374151] p-6">
                <h2 className="text-lg font-semibold text-[#02090d] dark:text-white mb-4 flex items-center">
                  <FiWind className="mr-2 text-[#0A2F44]" />
                  Loads (kN/m²)
                </h2>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                      Dead Load
                    </label>
                    <input
                      type="number"
                      name="deadLoad"
                      value={formData.deadLoad}
                      onChange={handleChange}
                      step="0.1"
                      className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2F44]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                      Live Load
                    </label>
                    <input
                      type="number"
                      name="liveLoad"
                      value={formData.liveLoad}
                      onChange={handleChange}
                      step="0.1"
                      className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2F44]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                      Finishes
                    </label>
                    <input
                      type="number"
                      name="finishes"
                      value={formData.finishes}
                      onChange={handleChange}
                      step="0.1"
                      className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2F44]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                      Partition
                    </label>
                    <input
                      type="number"
                      name="partition"
                      value={formData.partition}
                      onChange={handleChange}
                      step="0.1"
                      className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2F44]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Materials Card */}
              <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-lg border border-[#e5e7eb] dark:border-[#374151] p-6">
                <h2 className="text-lg font-semibold text-[#02090d] dark:text-white mb-4 flex items-center">
                  <FiDroplet className="mr-2 text-[#0A2F44]" />
                  Materials
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                      Concrete Grade
                    </label>
                    <select
                      name="concreteGrade"
                      value={formData.concreteGrade}
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2F44]"
                    >
                      <option>C20/25</option>
                      <option>C25/30</option>
                      <option>C30/37</option>
                      <option>C35/45</option>
                      <option>C40/50</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                      Reinforcement Grade
                    </label>
                    <select
                      name="reinforcementGrade"
                      value={formData.reinforcementGrade}
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2F44]"
                    >
                      <option>B500A</option>
                      <option>B500B</option>
                      <option>B500C</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                      Exposure Class
                    </label>
                    <select
                      name="exposureClass"
                      value={formData.exposureClass}
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2F44]"
                    >
                      <option>XC1</option>
                      <option>XC2</option>
                      <option>XC3</option>
                      <option>XC4</option>
                      <option>XD1</option>
                      <option>XD2</option>
                      <option>XD3</option>
                      <option>XS1</option>
                      <option>XS2</option>
                      <option>XS3</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Design Constraints Card */}
              <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-lg border border-[#e5e7eb] dark:border-[#374151] p-6">
                <h2 className="text-lg font-semibold text-[#02090d] dark:text-white mb-4 flex items-center">
                  <FiClock className="mr-2 text-[#0A2F44]" />
                  Design Constraints
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                      Deflection Limit
                    </label>
                    <select
                      name="deflectionLimit"
                      value={formData.deflectionLimit}
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2F44]"
                    >
                      <option>L/250</option>
                      <option>L/300</option>
                      <option>L/350</option>
                      <option>L/400</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                      Crack Width Limit (mm)
                    </label>
                    <input
                      type="number"
                      name="crackWidthLimit"
                      value={formData.crackWidthLimit}
                      onChange={handleChange}
                      step="0.1"
                      min="0.1"
                      max="0.4"
                      className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2F44]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                      Fire Rating (min)
                    </label>
                    <select
                      name="fireRating"
                      value={formData.fireRating}
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2F44]"
                    >
                      <option>30</option>
                      <option>60</option>
                      <option>90</option>
                      <option>120</option>
                      <option>180</option>
                      <option>240</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Optimisation Card */}
              <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-lg border border-[#e5e7eb] dark:border-[#374151] p-6">
                <h2 className="text-lg font-semibold text-[#02090d] dark:text-white mb-4 flex items-center">
                  <FiPercent className="mr-2 text-[#0A2F44]" />
                  Optimisation Weights
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                      Cost Weight (%)
                    </label>
                    <input
                      type="range"
                      name="costWeight"
                      value={formData.costWeight}
                      onChange={handleChange}
                      min="0"
                      max="100"
                      className="w-full accent-[#0A2F44]"
                    />
                    <div className="flex justify-between text-xs text-[#6b7280] mt-1">
                      <span>{formData.costWeight}%</span>
                      <span>100%</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                      Carbon Weight (%)
                    </label>
                    <input
                      type="range"
                      name="carbonWeight"
                      value={formData.carbonWeight}
                      onChange={handleChange}
                      min="0"
                      max="100"
                      className="w-full accent-[#0A2F44]"
                    />
                    <div className="flex justify-between text-xs text-[#6b7280] mt-1">
                      <span>{formData.carbonWeight}%</span>
                      <span>100%</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                      Material Weight (%)
                    </label>
                    <input
                      type="range"
                      name="materialWeight"
                      value={formData.materialWeight}
                      onChange={handleChange}
                      min="0"
                      max="100"
                      className="w-full accent-[#0A2F44]"
                    />
                    <div className="flex justify-between text-xs text-[#6b7280] mt-1">
                      <span>{formData.materialWeight}%</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4">
            <button
              onClick={handleValidate}
              disabled={isValidating}
              className="px-6 py-3 border border-[#e5e7eb] dark:border-[#374151] rounded-lg text-[#374151] dark:text-[#d1d5db] hover:bg-[#f3f4f6] dark:hover:bg-[#374151] transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isValidating ? 'Validating...' : 'Validate Slab'}
            </button>
            
            <button
              onClick={handleOptimise}
              disabled={isOptimising}
              className="px-6 py-3 bg-[#0A2F44] text-white rounded-lg hover:bg-[#082636] transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isOptimising ? 'Optimising...' : 'Run Optimisation'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SlabInput;