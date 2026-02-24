import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FiArrowLeft, FiSun, FiMoon, FiMenu, FiGrid, FiBarChart2, 
  FiColumns, FiLayers, FiTriangle, FiSquare, FiCircle,
  FiDroplet, FiWind, FiPercent, FiClock, FiInfo
} from 'react-icons/fi';
import { useTheme } from '../contexts/ThemeContext';

const StructuralInput = () => {
  const { workspaceId, projectId } = useParams();
  const navigate = useNavigate();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeComponent, setActiveComponent] = useState('slab');
  const [isValidating, setIsValidating] = useState(false);
  const [isOptimising, setIsOptimising] = useState(false);

  // Component navigation items
  const components = [
    { id: 'slab', name: 'Slab', icon: FiGrid },
    { id: 'beam', name: 'Beam', icon: FiBarChart2 },
    { id: 'column', name: 'Column', icon: FiColumns },
    { id: 'foundation', name: 'Foundation', icon: FiSquare },
    { id: 'staircase', name: 'Staircase', icon: FiTriangle },
  ];

  // Slab form state
  const [slabData, setSlabData] = useState({
    slabType: 'one-way',
    spanX: '6.0',
    spanY: '4.0',
    thickness: '200',
    cover: '25',
    deadLoad: '2.5',
    liveLoad: '3.0',
    finishes: '1.0',
    partition: '1.0',
    concreteGrade: 'C30/37',
    reinforcementGrade: 'B500',
    exposureClass: 'XC3',
    deflectionLimit: 'L/250',
    crackWidthLimit: '0.3',
    fireRating: '60',
    costWeight: '15',
    carbonWeight: '30',
    materialWeight: '20',
  });

  // Beam form state (mock for now)
  const [beamData, setBeamData] = useState({
    span: '8.0',
    width: '300',
    depth: '500',
    cover: '35',
    deadLoad: '10.5',
    liveLoad: '15.0',
  });

  // Column form state (mock for now)
  const [columnData, setColumnData] = useState({
    height: '3.0',
    width: '300',
    depth: '300',
    cover: '40',
    axialLoad: '1200',
    momentX: '45',
    momentY: '30',
  });

  const handleSlabChange = (e) => {
    const { name, value } = e.target;
    setSlabData(prev => ({ ...prev, [name]: value }));
  };

  const handleValidate = () => {
    setIsValidating(true);
    setTimeout(() => {
      setIsValidating(false);
      alert('✅ Validation passed! (Mock)');
    }, 1500);
  };

  const handleOptimise = () => {
    setIsOptimising(true);
    setTimeout(() => {
      setIsOptimising(false);
      alert('✅ Optimisation complete! (Mock)');
    }, 2000);
  };

  // Get user initials
  const getUserInitials = () => 'JE';

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
            <div className="p-6 border-b border-[#e5e7eb] dark:border-[#374151]">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-[#0A2F44] rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">SA</span>
                </div>
                <span className="font-bold text-[#02090d] dark:text-white">StructAI</span>
              </div>
            </div>
            <nav className="p-4">
              {components.map(comp => (
                <button
                  key={comp.id}
                  onClick={() => {
                    setActiveComponent(comp.id);
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
                    activeComponent === comp.id
                      ? 'bg-[#0A2F44] text-white'
                      : 'text-[#6b7280] hover:bg-[#f3f4f6] dark:hover:bg-[#374151]'
                  }`}
                >
                  <comp.icon className="text-lg" />
                  <span>{comp.name}</span>
                </button>
              ))}
            </nav>
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
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden p-2 rounded-lg hover:bg-[#f3f4f6] dark:hover:bg-[#374151] transition-colors cursor-pointer"
              >
                <FiMenu className="text-xl text-[#6b7280]" />
              </button>
              <button
                onClick={() => navigate(-1)}
                className="flex items-center space-x-2 text-[#6b7280] hover:text-[#0A2F44] transition-colors"
              >
                <FiArrowLeft className="text-lg" />
                <span className="text-sm">Back to Project</span>
              </button>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg hover:bg-[#f3f4f6] dark:hover:bg-[#374151] transition-colors cursor-pointer"
              >
                {isDarkMode ? <FiSun className="text-xl text-yellow-500" /> : <FiMoon className="text-xl text-[#0A2F44]" />}
              </button>
              <div className="w-8 h-8 bg-[#0A2F44] rounded-full flex items-center justify-center text-white text-sm font-medium">
                {getUserInitials()}
              </div>
            </div>
          </div>

          {/* Component Tabs - Desktop */}
          <div className="hidden md:flex items-center space-x-1 mt-4">
            {components.map(comp => (
              <button
                key={comp.id}
                onClick={() => setActiveComponent(comp.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  activeComponent === comp.id
                    ? 'bg-[#0A2F44] text-white'
                    : 'text-[#6b7280] hover:text-[#0A2F44] hover:bg-[#f3f4f6] dark:hover:bg-[#374151]'
                }`}
              >
                <comp.icon className="text-lg" />
                <span className="text-sm font-medium">{comp.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Title */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-[#02090d] dark:text-white capitalize">
              {activeComponent} Input
            </h1>
            <p className="text-sm text-[#6b7280] dark:text-[#9ca3af] mt-1">
              Enter {activeComponent} parameters for structural analysis and optimisation
            </p>
          </div>

          {/* Slab Input Form */}
          {activeComponent === 'slab' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Slab Geometry Card */}
              {/* Slab Geometry Card */}
<div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-lg border border-[#e5e7eb] dark:border-[#374151] p-6">
  <h2 className="text-lg font-semibold text-[#02090d] dark:text-white mb-4 flex items-center">
    <FiGrid className="mr-2 text-[#0A2F44]" />
    Slab Geometry
  </h2>
  
  <div className="space-y-4">
    {/* Slab Type Radio Buttons */}
    <div>
      <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
        Slab Type
      </label>
      <div className="flex space-x-6">
        <label className="flex items-center cursor-pointer">
          <input
            type="radio"
            name="slabType"
            value="one-way"
            checked={slabData.slabType === 'one-way'}
            onChange={handleSlabChange}
            className="w-4 h-4 text-[#0A2F44] cursor-pointer"
          />
          <span className="ml-2 text-sm text-[#02090d] dark:text-white">One-way</span>
        </label>
        <label className="flex items-center cursor-pointer">
          <input
            type="radio"
            name="slabType"
            value="two-way"
            checked={slabData.slabType === 'two-way'}
            onChange={handleSlabChange}
            className="w-4 h-4 text-[#0A2F44] cursor-pointer"
          />
          <span className="ml-2 text-sm text-[#02090d] dark:text-white">Two-way</span>
        </label>
      </div>
    </div>

    {/* Span X - Always visible */}
    <div>
      <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
        Span X (m) <span className="text-xs text-[#6b7280] ml-1">(main span)</span>
      </label>
      <input
        type="number"
        name="spanX"
        value={slabData.spanX}
        onChange={handleSlabChange}
        step="0.1"
        className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2F44]"
      />
    </div>

    {/* Span Y - Only shown for two-way slabs */}
    {slabData.slabType === 'two-way' && (
      <div className="animate-fade-in">
        <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
          Span Y (m) <span className="text-xs text-[#6b7280] ml-1">(secondary span)</span>
        </label>
        <input
          type="number"
          name="spanY"
          value={slabData.spanY}
          onChange={handleSlabChange}
          step="0.1"
          className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2F44]"
        />
      </div>
    )}

    {/* Thickness and Cover in grid */}
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
          Thickness (mm)
        </label>
        <input
          type="number"
          name="thickness"
          value={slabData.thickness}
          onChange={handleSlabChange}
          step="5"
          className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2F44]"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
          Cover (mm)
        </label>
        <input
          type="number"
          name="cover"
          value={slabData.cover}
          onChange={handleSlabChange}
          step="5"
          className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2F44]"
        />
      </div>
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
                        value={slabData.deadLoad}
                        onChange={handleSlabChange}
                        step="0.1"
                        className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                        Live Load
                      </label>
                      <input
                        type="number"
                        name="liveLoad"
                        value={slabData.liveLoad}
                        onChange={handleSlabChange}
                        step="0.1"
                        className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                        Finishes
                      </label>
                      <input
                        type="number"
                        name="finishes"
                        value={slabData.finishes}
                        onChange={handleSlabChange}
                        step="0.1"
                        className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                        Partition
                      </label>
                      <input
                        type="number"
                        name="partition"
                        value={slabData.partition}
                        onChange={handleSlabChange}
                        step="0.1"
                        className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white"
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
                        value={slabData.concreteGrade}
                        onChange={handleSlabChange}
                        className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white"
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
                        value={slabData.reinforcementGrade}
                        onChange={handleSlabChange}
                        className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white"
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
                        value={slabData.exposureClass}
                        onChange={handleSlabChange}
                        className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white"
                      >
                        <option>XC1</option>
                        <option>XC2</option>
                        <option>XC3</option>
                        <option>XC4</option>
                        <option>XD1</option>
                        <option>XD2</option>
                        <option>XD3</option>
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
                        value={slabData.deflectionLimit}
                        onChange={handleSlabChange}
                        className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white"
                      >
                        <option>L/250</option>
                        <option>L/300</option>
                        <option>L/350</option>
                        <option>L/400</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                        Crack Width (mm)
                      </label>
                      <input
                        type="number"
                        name="crackWidthLimit"
                        value={slabData.crackWidthLimit}
                        onChange={handleSlabChange}
                        step="0.1"
                        min="0.1"
                        max="0.4"
                        className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                        Fire Rating (min)
                      </label>
                      <select
                        name="fireRating"
                        value={slabData.fireRating}
                        onChange={handleSlabChange}
                        className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white"
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
                        value={slabData.costWeight}
                        onChange={handleSlabChange}
                        min="0"
                        max="100"
                        className="w-full accent-[#0A2F44]"
                      />
                      <div className="text-xs text-right text-[#6b7280] mt-1">{slabData.costWeight}%</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                        Carbon Weight (%)
                      </label>
                      <input
                        type="range"
                        name="carbonWeight"
                        value={slabData.carbonWeight}
                        onChange={handleSlabChange}
                        min="0"
                        max="100"
                        className="w-full accent-[#0A2F44]"
                      />
                      <div className="text-xs text-right text-[#6b7280] mt-1">{slabData.carbonWeight}%</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                        Material Weight (%)
                      </label>
                      <input
                        type="range"
                        name="materialWeight"
                        value={slabData.materialWeight}
                        onChange={handleSlabChange}
                        min="0"
                        max="100"
                        className="w-full accent-[#0A2F44]"
                      />
                      <div className="text-xs text-right text-[#6b7280] mt-1">{slabData.materialWeight}%</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Beam Input Form (Placeholder) */}
          {activeComponent === 'beam' && (
            <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-lg p-8 text-center">
              <FiBarChart2 className="text-5xl text-[#0A2F44] mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-[#02090d] dark:text-white mb-2">Beam Input Form</h3>
              <p className="text-[#6b7280]">Coming soon in Phase 3</p>
            </div>
          )}

          {/* Column Input Form (Placeholder) */}
          {activeComponent === 'column' && (
            <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-lg p-8 text-center">
              <FiColumns className="text-5xl text-[#0A2F44] mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-[#02090d] dark:text-white mb-2">Column Input Form</h3>
              <p className="text-[#6b7280]">Coming soon in Phase 3</p>
            </div>
          )}

          {/* Foundation Input Form (Placeholder) */}
          {activeComponent === 'foundation' && (
            <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-lg p-8 text-center">
              <FiSquare className="text-5xl text-[#0A2F44] mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-[#02090d] dark:text-white mb-2">Foundation Input Form</h3>
              <p className="text-[#6b7280]">Coming soon in Phase 3</p>
            </div>
          )}

          {/* Staircase Input Form (Placeholder) */}
          {activeComponent === 'staircase' && (
            <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-lg p-8 text-center">
              <FiTriangle className="text-5xl text-[#0A2F44] mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-[#02090d] dark:text-white mb-2">Staircase Input Form</h3>
              <p className="text-[#6b7280]">Coming soon in Phase 3</p>
            </div>
          )}

          {/* Action Buttons - Same for all components */}
          <div className="mt-8 flex justify-end space-x-4">
            <button
              onClick={handleValidate}
              disabled={isValidating}
              className="px-6 py-3 border border-[#e5e7eb] dark:border-[#374151] rounded-lg text-[#374151] dark:text-[#d1d5db] hover:bg-[#f3f4f6] dark:hover:bg-[#374151] transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isValidating ? 'Validating...' : 'Validate'}
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

export default StructuralInput;