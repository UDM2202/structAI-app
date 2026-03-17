import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FiArrowLeft, FiSun, FiMoon, FiMenu, FiGrid, FiBarChart2, 
  FiColumns, FiLayers, FiTriangle, FiSquare, FiCircle,
  FiDroplet, FiWind, FiPercent, FiClock, FiInfo, FiAlertTriangle,
  FiChevronDown, FiSearch, FiCheck, FiHome, FiBriefcase, FiUsers,
  FiDownload, FiPrinter, FiEye
} from 'react-icons/fi';
import { useTheme } from '../contexts/ThemeContext';
import SlabResultsComparison from '../components/SlabResultsComparison';
import SlabDetailedReport from '../components/SlabDetailedReport';
import AIRecommendation from '../components/AIRecommendation';
import TradeoffAnalysis from '../components/TradeoffAnalysis';

const StructuralInput = () => {
  const { workspaceId, projectId } = useParams();
  const navigate = useNavigate();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeComponent, setActiveComponent] = useState('slab');
  const [isValidating, setIsValidating] = useState(false);
  const [isOptimising, setIsOptimising] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showAIRecommendation, setShowAIRecommendation] = useState(false);
  const [showTradeoff, setShowTradeoff] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState(null);
  const [compareOptions, setCompareOptions] = useState([]);
  
  // Warning state for overridden fields
  const [overriddenFields, setOverriddenFields] = useState({});
  const [showWarning, setShowWarning] = useState(null);
  
  // Dropdown open states
  const [openDropdown, setOpenDropdown] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Component navigation items
  const components = [
    { id: 'slab', name: 'Slab', icon: FiGrid },
    { id: 'beam', name: 'Beam', icon: FiBarChart2 },
    { id: 'column', name: 'Column', icon: FiColumns },
    { id: 'foundation', name: 'Foundation', icon: FiSquare },
    { id: 'staircase', name: 'Staircase', icon: FiTriangle },
  ];

  // Form state
  const [formData, setFormData] = useState({
    // Slab Geometry
    slabType: 'one-way',
    supportCondition: 'ss',
    spanX: '6.0',
    spanY: '4.0',
    thickness: '200',
    cover: '25',
    
    // Continuous spans (for continuous slabs)
    continuousSpans: ['5.0', '5.0', '4.0'],
    endFixityLeft: 'pinned',
    endFixityRight: 'pinned',
    
    // Loads
    imposedCategory: 'B_office',
    deadLoad: '2.5',
    liveLoad: '3.0',
    finishes: '1.0',
    serviceAllowance: '1.2',
    partition: '1.0',
    partitionMode: 'permanent',
    
    // Additional permanent loads
    permanentLoads: [
      { name: 'Equipment', value: '2.0' }
    ],
    
    // Variable loads
    leadingLoad: { key: 'qk', value: '2.0' },
    accompanyingLoads: [
      { key: 'wk', value: '1.3' }
    ],
    
    // Materials
    concreteGrade: 'C30/37',
    steelGrade: 'B500',
    exposureClass: 'XC3',
    
    // Design Constraints
    deflectionLimit: '250',
    crackWidthLimit: '0.3',
    fireRating: '60',
    
    // Optimisation
    costWeight: '15',
    carbonWeight: '30',
    materialWeight: '20',
    numThicknesses: '2',
    thickness1: '160',
    thickness2: '175',
    barDiameter1: '10',
    barDiameter2: '12',
    
    // Bar selection
    mainBarDiameter: '12',
    candidateDiameters: ['8', '10', '12', '16'],
    minSpacing: '100',
    maxSpacing: '300',
    
    // Cost details
    useAIDatabase: true,
    region: 'uk',
    concreteRate: '170',
    steelRate: '1300',
    formworkRate: '50',
    useAIRecommendation: 'y'
  });

  // Variable action keys with descriptions
  const variableActionKeys = [
    { value: 'qk', label: 'qk - Imposed load', description: 'Imposed load' },
    { value: 'wk', label: 'wk - Wind load', description: 'Wind load' },
    { value: 'sk', label: 'sk - Snow load', description: 'Snow load' },
    { value: 'tk', label: 'tk - Traffic load', description: 'Traffic load' },
  ];

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

  // Auto-generated values (these will be computed)
  const [autoValues, setAutoValues] = useState({
    recommendedThickness: '200',
    recommendedCover: '25',
    recommendedBarDiameter: '12',
    calculatedDeadLoad: '2.5',
  });

  // Recommended values based on span and conditions
  useEffect(() => {
    if (activeComponent === 'slab') {
      // Auto-generate thickness based on span
      const span = parseFloat(formData.spanX);
      let recommendedThickness = '200';
      
      if (span <= 3.5) recommendedThickness = '150';
      else if (span <= 5.0) recommendedThickness = '175';
      else if (span <= 6.5) recommendedThickness = '200';
      else if (span <= 8.0) recommendedThickness = '225';
      else recommendedThickness = '250';
      
      // Auto-generate cover based on exposure class and fire rating
      const exposureMap = {
        'XC1': { '60': '20', '90': '25', '120': '35' },
        'XC2': { '60': '25', '90': '30', '120': '40' },
        'XC3': { '60': '25', '90': '35', '120': '45' },
        'XC4': { '60': '30', '90': '40', '120': '50' },
      };
      
      const recommendedCover = exposureMap[formData.exposureClass]?.[formData.fireRating] || '25';
      
      // Auto-generate bar diameter based on thickness
      const thickness = parseFloat(formData.thickness);
      let recommendedBarDiameter = '12';
      if (thickness >= 250) recommendedBarDiameter = '16';
      else if (thickness >= 200) recommendedBarDiameter = '12';
      else recommendedBarDiameter = '10';
      
      setAutoValues({
        recommendedThickness,
        recommendedCover,
        recommendedBarDiameter,
        calculatedDeadLoad: ((parseFloat(formData.thickness) / 1000) * 25).toFixed(1),
      });
    }
  }, [activeComponent, formData.spanX, formData.exposureClass, formData.fireRating, formData.thickness]);

  // Check if field has been overridden
  const isOverridden = (field) => {
    if (field === 'thickness') {
      return formData.thickness !== autoValues.recommendedThickness;
    }
    if (field === 'cover') {
      return formData.cover !== autoValues.recommendedCover;
    }
    if (field === 'mainBarDiameter') {
      return formData.mainBarDiameter !== autoValues.recommendedBarDiameter;
    }
    return false;
  };

  // Handle field change with warning logic
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Check if this is an automated field being overridden
    if (['thickness', 'cover', 'mainBarDiameter'].includes(name)) {
      const recommended = autoValues[`recommended${name.charAt(0).toUpperCase() + name.slice(1)}`];
      if (value !== recommended) {
        setShowWarning({
          field: name,
          recommended: recommended,
          newValue: value,
          message: getWarningMessage(name, recommended, value)
        });
      } else {
        // If they changed it back to recommended, clear warning
        setOverriddenFields(prev => ({ ...prev, [name]: false }));
      }
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle permanent load changes
  const handlePermanentLoadChange = (index, field, value) => {
    const updatedLoads = [...formData.permanentLoads];
    updatedLoads[index][field] = value;
    setFormData(prev => ({ ...prev, permanentLoads: updatedLoads }));
  };

  const addPermanentLoad = () => {
    setFormData(prev => ({
      ...prev,
      permanentLoads: [...prev.permanentLoads, { name: '', value: '' }]
    }));
  };

  const removePermanentLoad = (index) => {
    const updatedLoads = formData.permanentLoads.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, permanentLoads: updatedLoads }));
  };

  // Handle accompanying load changes
  const handleAccompanyingLoadChange = (index, field, value) => {
    const updatedLoads = [...formData.accompanyingLoads];
    updatedLoads[index][field] = value;
    setFormData(prev => ({ ...prev, accompanyingLoads: updatedLoads }));
  };

  const addAccompanyingLoad = () => {
    setFormData(prev => ({
      ...prev,
      accompanyingLoads: [...prev.accompanyingLoads, { key: 'wk', value: '' }]
    }));
  };

  const removeAccompanyingLoad = (index) => {
    const updatedLoads = formData.accompanyingLoads.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, accompanyingLoads: updatedLoads }));
  };

  // Handle override confirmation
  const confirmOverride = () => {
    if (showWarning) {
      setOverriddenFields(prev => ({ ...prev, [showWarning.field]: true }));
      setShowWarning(null);
    }
  };

  // Cancel override (revert to recommended)
  const cancelOverride = () => {
    if (showWarning) {
      setFormData(prev => ({
        ...prev,
        [showWarning.field]: autoValues[`recommended${showWarning.field.charAt(0).toUpperCase() + showWarning.field.slice(1)}`]
      }));
      setShowWarning(null);
    }
  };

  // Get warning message based on field
  const getWarningMessage = (field, recommended, newValue) => {
    switch(field) {
      case 'thickness':
        return `Recommended thickness for span ${formData.spanX}m is ${recommended}mm. 
                Using ${newValue}mm may affect deflection and serviceability. 
                Are you sure you want to proceed?`;
      case 'cover':
        return `Recommended cover for ${formData.exposureClass} with ${formData.fireRating}min fire rating is ${recommended}mm.
                Using ${newValue}mm may compromise durability and fire resistance.
                Are you sure you want to proceed?`;
      case 'mainBarDiameter':
        return `Recommended bar diameter for ${formData.thickness}mm slab is ${recommended}mm.
                Using ${newValue}mm bars may affect bar spacing and crack control.
                Are you sure you want to proceed?`;
      default:
        return `The recommended value is ${recommended}. Are you sure you want to use ${newValue}?`;
    }
  };

  // Custom Dropdown Component
  const CustomDropdown = ({ 
    label, 
    name, 
    value, 
    options, 
    onChange,
    icon: Icon,
    searchable = false,
    customClass = ''
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    
    const filteredOptions = searchable && search
      ? options.filter(opt => 
          opt.label.toLowerCase().includes(search.toLowerCase()) ||
          (opt.description && opt.description.toLowerCase().includes(search.toLowerCase()))
        )
      : options;

    return (
      <div className="relative">
        {label && <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">{label}</label>}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`w-full px-4 py-3 rounded-lg border ${customClass || 'border-[#e5e7eb] dark:border-[#374151]'} bg-white dark:bg-[#374151] text-[#02090d] dark:text-white flex items-center justify-between hover:border-[#0A2F44] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0A2F44]`}
          >
            <div className="flex items-center space-x-3">
              {Icon && <Icon className="text-[#0A2F44]" />}
              <span>{options.find(opt => opt.value === value)?.label || value}</span>
            </div>
            <FiChevronDown className={`text-[#6b7280] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          {isOpen && (
            <div className="absolute z-20 w-full mt-1 bg-white dark:bg-[#1f2937] border border-[#e5e7eb] dark:border-[#374151] rounded-lg shadow-xl max-h-80 overflow-auto">
              {searchable && (
                <div className="sticky top-0 p-2 bg-white dark:bg-[#1f2937] border-b border-[#e5e7eb] dark:border-[#374151]">
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#9ca3af]" />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2F44]"
                    />
                  </div>
                </div>
              )}

              <div className="py-2">
                {filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange({ target: { name, value: option.value } });
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={`w-full px-4 py-3 text-left flex items-center justify-between hover:bg-[#f3f4f6] dark:hover:bg-[#374151] transition-colors ${
                      value === option.value ? 'bg-[#e6f0f5] dark:bg-[#1e3a4a] text-[#0A2F44]' : 'text-[#02090d] dark:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      {option.icon && <option.icon className="text-[#0A2F44]" />}
                      <div>
                        <div className="font-medium">{option.label}</div>
                        {option.description && (
                          <div className="text-xs text-[#6b7280]">{option.description}</div>
                        )}
                      </div>
                    </div>
                    {value === option.value && <FiCheck className="text-[#0A2F44]" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Eurocode imposed load categories
  const imposedCategories = [
    { value: 'A_residential', label: 'Category A: Residential', category: 'residential', icon: FiHome, description: 'Dwellings, kitchens, corridors, stairs (2.0 kN/m²)' },
    { value: 'A_balcony', label: 'Category A: Balconies', category: 'residential', icon: FiHome, description: 'Balconies in dwellings (2.5 kN/m²)' },
    { value: 'B_office', label: 'Category B: Offices', category: 'office', icon: FiBriefcase, description: 'Office areas, corridors, stairs (3.0 kN/m²)' },
    { value: 'C1_tables', label: 'Category C1: Tables/Chairs', category: 'assembly', icon: FiUsers, description: 'Restaurants, classrooms (3.0 kN/m²)' },
    { value: 'C2_fixed', label: 'Category C2: Fixed Seating', category: 'assembly', icon: FiUsers, description: 'Theatres, churches (4.0 kN/m²)' },
    { value: 'C3_concourse', label: 'Category C3: Free Movement', category: 'assembly', icon: FiUsers, description: 'Museums, exhibition halls (5.0 kN/m²)' },
    { value: 'C4_dancing', label: 'Category C4: Dancing/Crowds', category: 'assembly', icon: FiUsers, description: 'Dance halls, gymnasiums (7.5 kN/m²)' },
    { value: 'D_retail', label: 'Category D: Retail', category: 'retail', icon: FiBriefcase, description: 'Shops, department stores (4.0 kN/m²)' },
    { value: 'E_storage_light', label: 'Category E: Light Storage', category: 'storage', icon: FiLayers, description: 'General storage (5.0 kN/m²)' },
    { value: 'E_storage_heavy', label: 'Category E: Heavy Storage', category: 'storage', icon: FiLayers, description: 'Libraries, archives (7.5 kN/m²)' },
    { value: 'F_carpark_light', label: 'Category F: Car Parks (≤30kN)', category: 'parking', icon: FiSquare, description: 'Light vehicle parking (2.5 kN/m²)' },
    { value: 'G_carpark_heavy', label: 'Category G: Car Parks (>30kN)', category: 'parking', icon: FiSquare, description: 'Heavy vehicle parking (5.0 kN/m²)' },
    { value: 'H_roof_maint', label: 'Category H: Roof (Maintenance)', category: 'roof', icon: FiTriangle, description: 'Maintenance only (0.6 kN/m²)' },
    { value: 'H_roof_access', label: 'Category H: Roof (Accessible)', category: 'roof', icon: FiTriangle, description: 'Accessible roofs (1.5 kN/m²)' },
  ];

  // Concrete grades
  const concreteGrades = [
    { value: 'C12/15', label: 'C12/15', description: 'fck = 12 MPa' },
    { value: 'C16/20', label: 'C16/20', description: 'fck = 16 MPa' },
    { value: 'C20/25', label: 'C20/25', description: 'fck = 20 MPa' },
    { value: 'C25/30', label: 'C25/30', description: 'fck = 25 MPa' },
    { value: 'C30/37', label: 'C30/37', description: 'fck = 30 MPa' },
    { value: 'C35/45', label: 'C35/45', description: 'fck = 35 MPa' },
    { value: 'C40/50', label: 'C40/50', description: 'fck = 40 MPa' },
    { value: 'C45/55', label: 'C45/55', description: 'fck = 45 MPa' },
    { value: 'C50/60', label: 'C50/60', description: 'fck = 50 MPa' },
    { value: 'C55/67', label: 'C55/67', description: 'fck = 55 MPa' },
    { value: 'C60/75', label: 'C60/75', description: 'fck = 60 MPa' },
  ];

  // Exposure classes
  const exposureClasses = [
    { value: 'XC1', label: 'XC1', description: 'Dry or permanently wet' },
    { value: 'XC2', label: 'XC2', description: 'Wet, rarely dry' },
    { value: 'XC3', label: 'XC3', description: 'Moderate humidity' },
    { value: 'XC4', label: 'XC4', description: 'Cyclic wet and dry' },
    { value: 'XD1', label: 'XD1', description: 'Moderate humidity' },
    { value: 'XD2', label: 'XD2', description: 'Wet, rarely dry' },
    { value: 'XD3', label: 'XD3', description: 'Cyclic wet and dry' },
  ];

  // Get user initials
  const getUserInitials = () => 'JE';

  const handleValidate = () => {
    setIsValidating(true);
    setTimeout(() => {
      setIsValidating(false);
      alert(`✅ ${activeComponent} validation passed! (Mock)`);
    }, 1500);
  };

  const handleOptimise = () => {
    setIsOptimising(true);
    setTimeout(() => {
      setIsOptimising(false);
      setShowResults(true);
      setShowReport(false);
      setShowAIRecommendation(false);
      setShowTradeoff(false);
    }, 2000);
  };

  const handleViewReport = (optionId) => {
    setSelectedOptionId(optionId);
    setShowReport(true);
    setShowResults(false);
    setShowAIRecommendation(false);
    setShowTradeoff(false);
  };

  const handleBackFromReport = () => {
    setShowReport(false);
    setShowResults(true);
  };

  const handleViewAIRecommendation = () => {
    setShowAIRecommendation(true);
    setShowResults(false);
    setShowReport(false);
    setShowTradeoff(false);
  };

  const handleViewTradeoff = (optionIds) => {
    setCompareOptions(optionIds);
    setShowTradeoff(true);
    setShowResults(false);
    setShowReport(false);
    setShowAIRecommendation(false);
  };

  const handleBackToResults = () => {
    setShowResults(true);
    setShowReport(false);
    setShowAIRecommendation(false);
    setShowTradeoff(false);
  };

  // Mock options data for demonstration
  const mockOptions = [
    {
      id: 1,
      rank: 1,
      thickness: 175,
      barDiameter: 10,
      spacing: 100,
      asProv: 785,
      asReq: 575,
      cost: 1240,
      carbon: 53.8,
      utilisation: 0.73,
      deflection: 'L/384',
      status: 'optimal',
      recommended: true
    },
    {
      id: 2,
      rank: 2,
      thickness: 175,
      barDiameter: 10,
      spacing: 125,
      asProv: 628,
      asReq: 575,
      cost: 1180,
      carbon: 51.2,
      utilisation: 0.86,
      deflection: 'L/320',
      status: 'pass',
      recommended: false
    },
    {
      id: 3,
      rank: 3,
      thickness: 160,
      barDiameter: 10,
      spacing: 100,
      asProv: 785,
      asReq: 607,
      cost: 1150,
      carbon: 49.2,
      utilisation: 0.84,
      deflection: 'L/210',
      status: 'warning',
      recommended: false
    },
    {
      id: 4,
      rank: 4,
      thickness: 160,
      barDiameter: 12,
      spacing: 125,
      asProv: 905,
      asReq: 607,
      cost: 1320,
      carbon: 58.5,
      utilisation: 0.62,
      deflection: 'L/450',
      status: 'overdesigned',
      recommended: false
    }
  ];

  return (
    <div className="min-h-screen bg-[#f3f4f6] dark:bg-[#111827] flex transition-colors duration-300">
      {/* Warning Modal */}
      {showWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-xl max-w-md w-full mx-4 p-6 animate-fade-in">
            <div className="flex items-center space-x-3 text-yellow-600 mb-4">
              <FiAlertTriangle className="text-3xl" />
              <h3 className="text-lg font-semibold">Override Recommended Value</h3>
            </div>
            <p className="text-[#4b5563] dark:text-[#9ca3af] mb-6">
              {showWarning.message}
            </p>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-6">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Note:</strong> You are taking responsibility for this design decision. 
                The automated values are based on Eurocode recommendations.
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelOverride}
                className="px-4 py-2 border border-[#e5e7eb] dark:border-[#374151] rounded-lg text-[#6b7280] hover:bg-[#f3f4f6] dark:hover:bg-[#374151] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmOverride}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
              >
                Override & Continue
              </button>
            </div>
          </div>
        </div>
      )}

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
          {/* Show Results Comparison */}
          {showResults && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-[#02090d] dark:text-white">
                  Optimisation Results
                </h1>
                <div className="flex space-x-3">
                  <button
                    onClick={handleViewAIRecommendation}
                    className="px-4 py-2 bg-[#0A2F44] dark:bg-[#2E7D32] text-white rounded-lg hover:bg-[#082636] dark:hover:bg-[#1c4b1e] transition-colors shadow-md"
                  >
                    AI Recommendation
                  </button>
                  <button
                    onClick={() => setShowResults(false)}
                    className="px-4 py-2 border border-[#e5e7eb] dark:border-[#4b5563] text-[#374151] dark:text-[#d1d5db] rounded-lg hover:bg-[#f3f4f6] dark:hover:bg-[#374151] transition-colors"
                  >
                    Back to Input
                  </button>
                </div>
              </div>
              
              <SlabResultsComparison
                options={mockOptions}
                onViewReport={handleViewReport}
                onCompare={handleViewTradeoff}
                onExport={(format) => console.log(`Export as ${format}`)}
              />
            </div>
          )}

          {/* Show Detailed Report */}
          {showReport && (
            <div className="space-y-6">
              <SlabDetailedReport
                option={mockOptions.find(opt => opt.id === selectedOptionId)}
                onBack={handleBackFromReport}
                onExport={(format) => console.log(`Export as ${format}`)}
              />
            </div>
          )}

          {/* Show AI Recommendation */}
          {showAIRecommendation && (
            <div className="space-y-6">
              <AIRecommendation
                options={mockOptions}
                onBack={handleBackToResults}
                onAccept={(optionId) => {
                  setSelectedOptionId(optionId);
                  setShowReport(true);
                  setShowAIRecommendation(false);
                }}
              />
            </div>
          )}

          {/* Show Trade-off Analysis */}
          {showTradeoff && (
            <div className="space-y-6">
              <TradeoffAnalysis
                options={mockOptions.filter(opt => compareOptions.includes(opt.id))}
                onBack={handleBackToResults}
                onSelectOption={(optionId) => {
                  setSelectedOptionId(optionId);
                  setShowReport(true);
                  setShowTradeoff(false);
                }}
              />
            </div>
          )}

          {/* Show Input Form (default) */}
          {!showResults && !showReport && !showAIRecommendation && !showTradeoff && (
            <>
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
                    <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-lg border border-[#e5e7eb] dark:border-[#374151] p-6">
                      <h2 className="text-lg font-semibold text-[#02090d] dark:text-white mb-4 flex items-center">
                        <FiGrid className="mr-2 text-[#0A2F44]" />
                        Slab Geometry
                      </h2>
                      
                      <div className="space-y-4">
                        {/* Slab Type */}
                        <div>
                          <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                            Slab Type
                          </label>
                          <div className="flex space-x-4">
                            <label className="flex items-center cursor-pointer">
                              <input
                                type="radio"
                                name="slabType"
                                value="one-way"
                                checked={formData.slabType === 'one-way'}
                                onChange={handleChange}
                                className="w-4 h-4 text-[#0A2F44] cursor-pointer"
                              />
                              <span className="ml-2 text-sm text-[#02090d] dark:text-white">One-way</span>
                            </label>
                            <label className="flex items-center cursor-pointer">
                              <input
                                type="radio"
                                name="slabType"
                                value="two-way"
                                checked={formData.slabType === 'two-way'}
                                onChange={handleChange}
                                className="w-4 h-4 text-[#0A2F44] cursor-pointer"
                              />
                              <span className="ml-2 text-sm text-[#02090d] dark:text-white">Two-way</span>
                            </label>
                          </div>
                        </div>

                        {/* Support Condition */}
                        <div>
                          <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                            Support Condition
                          </label>
                          <div className="flex space-x-4">
                            <label className="flex items-center cursor-pointer">
                              <input
                                type="radio"
                                name="supportCondition"
                                value="ss"
                                checked={formData.supportCondition === 'ss'}
                                onChange={handleChange}
                                className="w-4 h-4 text-[#0A2F44] cursor-pointer"
                              />
                              <span className="ml-2 text-sm text-[#02090d] dark:text-white">Simply Supported</span>
                            </label>
                            <label className="flex items-center cursor-pointer">
                              <input
                                type="radio"
                                name="supportCondition"
                                value="continuous"
                                checked={formData.supportCondition === 'continuous'}
                                onChange={handleChange}
                                className="w-4 h-4 text-[#0A2F44] cursor-pointer"
                              />
                              <span className="ml-2 text-sm text-[#02090d] dark:text-white">Continuous</span>
                            </label>
                          </div>
                        </div>

                        {/* Continuous Spans (conditionally shown) */}
                        {formData.supportCondition === 'continuous' && (
                          <div className="animate-fade-in space-y-4 border-l-4 border-[#0A2F44] pl-4">
                            <div>
                              <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                                Number of Spans
                              </label>
                              <CustomDropdown
                                label=""
                                name="numSpans"
                                value={formData.continuousSpans.length.toString()}
                                options={[
                                  { value: '2', label: '2 spans' },
                                  { value: '3', label: '3 spans' },
                                  { value: '4', label: '4 spans' },
                                  { value: '5', label: '5 spans' },
                                ]}
                                onChange={(e) => {
                                  const num = parseInt(e.target.value);
                                  setFormData(prev => ({
                                    ...prev,
                                    continuousSpans: Array(num).fill('5.0')
                                  }));
                                }}
                              />
                            </div>

                            {formData.continuousSpans.map((span, index) => (
                              <div key={index}>
                                <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                                  Span {index + 1} (m)
                                </label>
                                <input
                                  type="number"
                                  value={span}
                                  onChange={(e) => {
                                    const newSpans = [...formData.continuousSpans];
                                    newSpans[index] = e.target.value;
                                    setFormData(prev => ({ ...prev, continuousSpans: newSpans }));
                                  }}
                                  step="0.1"
                                  min="0"
                                  className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2F44] transition-all"
                                />
                              </div>
                            ))}

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                                  Left End
                                </label>
                                <CustomDropdown
                                  label=""
                                  name="endFixityLeft"
                                  value={formData.endFixityLeft}
                                  options={[
                                    { value: 'pinned', label: 'Pinned' },
                                    { value: 'fixed', label: 'Fixed' },
                                  ]}
                                  onChange={handleChange}
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                                  Right End
                                </label>
                                <CustomDropdown
                                  label=""
                                  name="endFixityRight"
                                  value={formData.endFixityRight}
                                  options={[
                                    { value: 'pinned', label: 'Pinned' },
                                    { value: 'fixed', label: 'Fixed' },
                                  ]}
                                  onChange={handleChange}
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Span X */}
                        <div className="relative">
                          <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                            Span X (m) <span className="text-xs text-[#6b7280] ml-1">(primary span)</span>
                          </label>
                          <input
                            type="number"
                            name="spanX"
                            value={formData.spanX}
                            onChange={handleChange}
                            step="0.1"
                            className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2F44] transition-all"
                          />
                        </div>

                        {/* Span Y - Only for two-way */}
                        {formData.slabType === 'two-way' && (
                          <div className="animate-fade-in">
                            <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                              Span Y (m) <span className="text-xs text-[#6b7280] ml-1">(secondary span)</span>
                            </label>
                            <input
                              type="number"
                              name="spanY"
                              value={formData.spanY}
                              onChange={handleChange}
                              step="0.1"
                              className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2F44] transition-all"
                            />
                          </div>
                        )}

                        {/* Thickness with warning indicator */}
                        <div className="relative">
                          <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                            Thickness (mm)
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              name="thickness"
                              value={formData.thickness}
                              onChange={handleChange}
                              step="5"
                              className={`w-full px-4 py-2 rounded-lg border ${
                                isOverridden('thickness')
                                  ? 'border-yellow-500 dark:border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                                  : 'border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151]'
                              } text-[#02090d] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2F44] transition-all`}
                            />
                            {isOverridden('thickness') && (
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                <FiAlertTriangle className="text-yellow-500" title="Overridden value" />
                              </div>
                            )}
                          </div>
                          {!isOverridden('thickness') && (
                            <p className="text-xs text-[#0A2F44] mt-1">
                              Recommended: {autoValues.recommendedThickness}mm
                            </p>
                          )}
                        </div>

                        {/* Cover with warning indicator */}
                        <div className="relative">
                          <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                            Cover (mm)
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              name="cover"
                              value={formData.cover}
                              onChange={handleChange}
                              step="5"
                              className={`w-full px-4 py-2 rounded-lg border ${
                                isOverridden('cover')
                                  ? 'border-yellow-500 dark:border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                                  : 'border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151]'
                              } text-[#02090d] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2F44] transition-all`}
                            />
                            {isOverridden('cover') && (
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                <FiAlertTriangle className="text-yellow-500" title="Overridden value" />
                              </div>
                            )}
                          </div>
                          {!isOverridden('cover') && (
                            <p className="text-xs text-[#0A2F44] mt-1">
                              Recommended: {autoValues.recommendedCover}mm
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Loads Card */}
                    <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-lg border border-[#e5e7eb] dark:border-[#374151] p-6">
                      <h2 className="text-lg font-semibold text-[#02090d] dark:text-white mb-4 flex items-center">
                        <FiWind className="mr-2 text-[#0A2F44]" />
                        Loads (kN/m²)
                      </h2>
                      
                      {/* Permanent Actions */}
                      <div className="mb-6">
                        <h3 className="text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-3">Permanent Actions</h3>
                        
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <label className="block text-xs text-[#6b7280] mb-1">Finishes (kN/m²)</label>
                            <input
                              type="number"
                              name="finishes"
                              value={formData.finishes}
                              onChange={handleChange}
                              step="0.1"
                              className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2F44] transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-[#6b7280] mb-1">Service allowance (kN/m²)</label>
                            <input
                              type="number"
                              name="serviceAllowance"
                              value={formData.serviceAllowance}
                              onChange={handleChange}
                              step="0.1"
                              className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2F44] transition-all"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <label className="block text-xs text-[#6b7280] mb-1">Partition load (kN/m²)</label>
                            <input
                              type="number"
                              name="partition"
                              value={formData.partition}
                              onChange={handleChange}
                              step="0.1"
                              className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2F44] transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-[#6b7280] mb-1">Partition mode</label>
                            <div className="flex space-x-4 mt-1">
                              <label className="flex items-center">
                                <input
                                  type="radio"
                                  name="partitionMode"
                                  value="permanent"
                                  checked={formData.partitionMode === 'permanent'}
                                  onChange={handleChange}
                                  className="w-4 h-4 text-[#0A2F44] focus:ring-[#0A2F44]"
                                />
                                <span className="ml-2 text-sm text-[#02090d] dark:text-white">Permanent (Gk)</span>
                              </label>
                              <label className="flex items-center">
                                <input
                                  type="radio"
                                  name="partitionMode"
                                  value="variable"
                                  checked={formData.partitionMode === 'variable'}
                                  onChange={handleChange}
                                  className="w-4 h-4 text-[#0A2F44] focus:ring-[#0A2F44]"
                                />
                                <span className="ml-2 text-sm text-[#02090d] dark:text-white">Variable (Qk)</span>
                              </label>
                            </div>
                          </div>
                        </div>

                        {/* Additional Permanent Loads */}
                        {formData.permanentLoads.map((load, index) => (
                          <div key={index} className="grid grid-cols-5 gap-2 mb-2">
                            <div className="col-span-2">
                              <input
                                type="text"
                                placeholder="Load name"
                                value={load.name}
                                onChange={(e) => handlePermanentLoadChange(index, 'name', e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2F44] transition-all"
                              />
                            </div>
                            <div className="col-span-2">
                              <input
                                type="number"
                                placeholder="Value (kN/m²)"
                                value={load.value}
                                onChange={(e) => handlePermanentLoadChange(index, 'value', e.target.value)}
                                step="0.1"
                                className="w-full px-3 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2F44] transition-all"
                              />
                            </div>
                            <div className="col-span-1">
                              <button
                                onClick={() => removePermanentLoad(index)}
                                className="w-full h-full flex items-center justify-center bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                title="Remove load"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        ))}

                        <button
                          onClick={addPermanentLoad}
                          className="mt-2 text-sm text-[#0A2F44] hover:underline flex items-center"
                        >
                          <span className="text-lg mr-1">+</span> Add other permanent load
                        </button>
                      </div>

                      {/* Variable Actions */}
                      <div className="mb-4">
                        <h3 className="text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-3">Variable Actions</h3>
                        
                        {/* Leading Load */}
                        <div className="mb-4 p-4 bg-[#f9fafb] dark:bg-[#374151] rounded-lg">
                          <p className="text-xs font-medium mb-3 text-[#0A2F44]">Leading Variable Load</p>
                          <div className="grid grid-cols-2 gap-3">
                            <CustomDropdown
                              label=""
                              name="leadingLoadKey"
                              value={formData.leadingLoad.key}
                              options={variableActionKeys.map(key => ({
                                value: key.value,
                                label: key.label,
                                description: key.description
                              }))}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                leadingLoad: { ...prev.leadingLoad, key: e.target.value }
                              }))}
                            />
                            <div>
                              <input
                                type="number"
                                placeholder="Value (kN/m²)"
                                value={formData.leadingLoad.value}
                                onChange={(e) => setFormData(prev => ({
                                  ...prev,
                                  leadingLoad: { ...prev.leadingLoad, value: e.target.value }
                                }))}
                                step="0.1"
                                className="w-full px-4 py-3 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2F44] transition-all"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Accompanying Loads */}
                        {formData.accompanyingLoads.map((load, index) => (
                          <div key={index} className="grid grid-cols-5 gap-2 mb-2">
                            <div className="col-span-2">
                              <CustomDropdown
                                label=""
                                name={`accKey-${index}`}
                                value={load.key}
                                options={variableActionKeys.map(key => ({
                                  value: key.value,
                                  label: key.label,
                                  description: key.description
                                }))}
                                onChange={(e) => handleAccompanyingLoadChange(index, 'key', e.target.value)}
                              />
                            </div>
                            <div className="col-span-2">
                              <input
                                type="number"
                                placeholder="Value (kN/m²)"
                                value={load.value}
                                onChange={(e) => handleAccompanyingLoadChange(index, 'value', e.target.value)}
                                step="0.1"
                                className="w-full px-3 py-3 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2F44] transition-all"
                              />
                            </div>
                            <div className="col-span-1">
                              <button
                                onClick={() => removeAccompanyingLoad(index)}
                                className="w-full h-full flex items-center justify-center bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                title="Remove load"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        ))}

                        <button
                          onClick={addAccompanyingLoad}
                          className="mt-2 text-sm text-[#0A2F44] hover:underline flex items-center"
                        >
                          <span className="text-lg mr-1">+</span> Add accompanying variable load
                        </button>
                      </div>

                      {/* Imposed Load Category Dropdown */}
                      <CustomDropdown
                        label="Imposed Load Category"
                        name="imposedCategory"
                        value={formData.imposedCategory}
                        options={imposedCategories}
                        onChange={handleChange}
                        icon={FiHome}
                        searchable={true}
                      />
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
                        {/* Concrete Grade Dropdown */}
                        <CustomDropdown
                          label="Concrete Grade"
                          name="concreteGrade"
                          value={formData.concreteGrade}
                          options={concreteGrades}
                          onChange={handleChange}
                        />

                        {/* Steel Grade - Now using CustomDropdown */}
                        <div>
                          <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                            Reinforcement Grade
                          </label>
                          <CustomDropdown
                            label=""
                            name="steelGrade"
                            value={formData.steelGrade}
                            options={[
                              { value: 'B500', label: 'B500 (fyk = 500 MPa)', description: 'High yield steel, 500 MPa' },
                              { value: 'B500A', label: 'B500A', description: 'Class A ductility' },
                              { value: 'B500B', label: 'B500B', description: 'Class B ductility' },
                              { value: 'B500C', label: 'B500C', description: 'Class C ductility (seismic)' },
                            ]}
                            onChange={handleChange}
                          />
                        </div>

                        {/* Exposure Class Dropdown */}
                        <CustomDropdown
                          label="Exposure Class"
                          name="exposureClass"
                          value={formData.exposureClass}
                          options={exposureClasses}
                          onChange={handleChange}
                        />
                      </div>
                    </div>

                    {/* Optimisation Settings Card */}
                    <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-lg border border-[#e5e7eb] dark:border-[#374151] p-6">
                      <h2 className="text-lg font-semibold text-[#02090d] dark:text-white mb-4 flex items-center">
                        <FiPercent className="mr-2 text-[#0A2F44]" />
                        Optimisation Settings
                      </h2>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                            Number of thickness/bar combinations
                          </label>
                          <CustomDropdown
                            label=""
                            name="numThicknesses"
                            value={formData.numThicknesses}
                            options={[
                              { value: '1', label: '1 combination' },
                              { value: '2', label: '2 combinations' },
                              { value: '3', label: '3 combinations' },
                              { value: '4', label: '4 combinations' },
                              { value: '5', label: '5 combinations' },
                            ]}
                            onChange={handleChange}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                              Thickness 1 (mm)
                            </label>
                            <input
                              type="number"
                              name="thickness1"
                              value={formData.thickness1}
                              onChange={handleChange}
                              step="5"
                              className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2F44] transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                              Bar dia 1 (mm)
                            </label>
                            <input
                              type="number"
                              name="barDiameter1"
                              value={formData.barDiameter1}
                              onChange={handleChange}
                              step="2"
                              className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2F44] transition-all"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                              Thickness 2 (mm)
                            </label>
                            <input
                              type="number"
                              name="thickness2"
                              value={formData.thickness2}
                              onChange={handleChange}
                              step="5"
                              className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2F44] transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                              Bar dia 2 (mm)
                            </label>
                            <input
                              type="number"
                              name="barDiameter2"
                              value={formData.barDiameter2}
                              onChange={handleChange}
                              step="2"
                              className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2F44] transition-all"
                            />
                          </div>
                        </div>

                        <div className="pt-4 border-t border-[#e5e7eb] dark:border-[#374151]">
                          <h3 className="text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">Optimisation Weights</h3>
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs text-[#6b7280] mb-1">Cost Weight (%)</label>
                              <input
                                type="range"
                                name="costWeight"
                                value={formData.costWeight}
                                onChange={handleChange}
                                min="0"
                                max="100"
                                className="w-full accent-[#0A2F44]"
                              />
                              <div className="text-xs text-right">{formData.costWeight}%</div>
                            </div>
                            <div>
                              <label className="block text-xs text-[#6b7280] mb-1">Carbon Weight (%)</label>
                              <input
                                type="range"
                                name="carbonWeight"
                                value={formData.carbonWeight}
                                onChange={handleChange}
                                min="0"
                                max="100"
                                className="w-full accent-[#0A2F44]"
                              />
                              <div className="text-xs text-right">{formData.carbonWeight}%</div>
                            </div>
                            <div>
                              <label className="block text-xs text-[#6b7280] mb-1">Material Weight (%)</label>
                              <input
                                type="range"
                                name="materialWeight"
                                value={formData.materialWeight}
                                onChange={handleChange}
                                min="0"
                                max="100"
                                className="w-full accent-[#0A2F44]"
                              />
                              <div className="text-xs text-right">{formData.materialWeight}%</div>
                            </div>
                          </div>
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
                          <CustomDropdown
                            label=""
                            name="deflectionLimit"
                            value={formData.deflectionLimit}
                            options={[
                              { value: '250', label: 'L/250', description: 'Standard limit for floors' },
                              { value: '300', label: 'L/300', description: 'Stricter limit for sensitive areas' },
                              { value: '350', label: 'L/350', description: 'High performance' },
                              { value: '400', label: 'L/400', description: 'Very strict (brittle finishes)' },
                            ]}
                            onChange={handleChange}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                            Crack Width (mm)
                          </label>
                          <input
                            type="number"
                            name="crackWidthLimit"
                            value={formData.crackWidthLimit}
                            onChange={handleChange}
                            step="0.1"
                            min="0.1"
                            max="0.4"
                            className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2F44] transition-all"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                            Fire Rating (min)
                          </label>
                          <CustomDropdown
                            label=""
                            name="fireRating"
                            value={formData.fireRating}
                            options={[
                              { value: '30', label: '30 min', description: 'Minimal protection' },
                              { value: '60', label: '60 min', description: 'Standard for most buildings' },
                              { value: '90', label: '90 min', description: 'Increased protection' },
                              { value: '120', label: '120 min', description: 'High-rise buildings' },
                              { value: '180', label: '180 min', description: 'Special structures' },
                              { value: '240', label: '240 min', description: 'Maximum protection' },
                            ]}
                            onChange={handleChange}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Cost Details Card */}
                    <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-lg border border-[#e5e7eb] dark:border-[#374151] p-6">
                      <h2 className="text-lg font-semibold text-[#02090d] dark:text-white mb-4 flex items-center">
                        <FiCircle className="mr-2 text-[#0A2F44]" />
                        Cost Details
                      </h2>
                      
                      <div className="space-y-3">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.useAIDatabase}
                            onChange={(e) => setFormData(prev => ({ ...prev, useAIDatabase: e.target.checked }))}
                            className="w-4 h-4 text-[#0A2F44] mr-2"
                          />
                          <span className="text-sm">Use StructAI Database rates</span>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-1">
                            Region (e.g. UK)
                          </label>
                          <input
                            type="text"
                            name="region"
                            value={formData.region}
                            onChange={handleChange}
                            placeholder="uk"
                            className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2F44] transition-all"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-[#6b7280] mb-1">
                              Concrete rate (GBP) [170]
                            </label>
                            <input
                              type="number"
                              name="concreteRate"
                              value={formData.concreteRate}
                              onChange={handleChange}
                              className="w-full px-3 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] focus:outline-none focus:ring-2 focus:ring-[#0A2F44] transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-[#6b7280] mb-1">
                              Steel rate (GBP) [1300]
                            </label>
                            <input
                              type="number"
                              name="steelRate"
                              value={formData.steelRate}
                              onChange={handleChange}
                              className="w-full px-3 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] focus:outline-none focus:ring-2 focus:ring-[#0A2F44] transition-all"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs text-[#6b7280] mb-1">
                            Formwork rate (GBP) [50]
                          </label>
                          <input
                            type="number"
                            name="formworkRate"
                            value={formData.formworkRate}
                            onChange={handleChange}
                            className="w-full px-3 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] focus:outline-none focus:ring-2 focus:ring-[#0A2F44] transition-all"
                          />
                        </div>

                        <div className="flex items-center space-x-2 mt-2">
                          <span className="text-sm">Use AI recommendation?</span>
                          <label className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name="useAIRecommendation"
                              value="y"
                              checked={formData.useAIRecommendation === 'y'}
                              onChange={handleChange}
                              className="w-4 h-4 text-[#0A2F44]"
                            />
                            <span className="text-sm">Yes</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name="useAIRecommendation"
                              value="n"
                              checked={formData.useAIRecommendation === 'n'}
                              onChange={handleChange}
                              className="w-4 h-4 text-[#0A2F44]"
                            />
                            <span className="text-sm">No</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Bar Selection Card */}
                    <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-lg border border-[#e5e7eb] dark:border-[#374151] p-6">
                      <h2 className="text-lg font-semibold text-[#02090d] dark:text-white mb-4 flex items-center">
                        <FiCircle className="mr-2 text-[#0A2F44]" />
                        Bar Selection
                      </h2>
                      
                      <div className="space-y-4">
                        {/* Main Bar Diameter with warning */}
                        <div className="relative">
                          <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                            Main Bar Diameter (mm)
                          </label>
                          <div className="relative">
                            <CustomDropdown
                              label=""
                              name="mainBarDiameter"
                              value={formData.mainBarDiameter}
                              options={formData.candidateDiameters.map(d => ({
                                value: d,
                                label: `${d} mm`,
                                description: d === autoValues.recommendedBarDiameter ? 'Recommended' : ''
                              }))}
                              onChange={handleChange}
                              customClass={isOverridden('mainBarDiameter') ? 'border-yellow-500' : ''}
                            />
                            {isOverridden('mainBarDiameter') && (
                              <div className="absolute right-8 top-1/2 transform -translate-y-1/2">
                                <FiAlertTriangle className="text-yellow-500" title="Overridden value" />
                              </div>
                            )}
                          </div>
                          {!isOverridden('mainBarDiameter') && (
                            <p className="text-xs text-[#0A2F44] mt-1">
                              Recommended: {autoValues.recommendedBarDiameter}mm
                            </p>
                          )}
                        </div>

                        {/* Min/Max Spacing */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                              Min Spacing (mm)
                            </label>
                            <input
                              type="number"
                              name="minSpacing"
                              value={formData.minSpacing}
                              onChange={handleChange}
                              step="10"
                              className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2F44] transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                              Max Spacing (mm)
                            </label>
                            <input
                              type="number"
                              name="maxSpacing"
                              value={formData.maxSpacing}
                              onChange={handleChange}
                              step="10"
                              className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2F44] transition-all"
                            />
                          </div>
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

              {/* Action Buttons */}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default StructuralInput;