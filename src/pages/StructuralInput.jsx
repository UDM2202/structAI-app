import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FiArrowLeft, FiSun, FiMoon, FiMenu, FiGrid, FiBarChart2, 
  FiColumns, FiLayers, FiTriangle, FiSquare, FiCircle,
  FiDroplet, FiWind, FiPercent, FiClock, FiInfo, FiAlertTriangle,
  FiChevronDown, FiSearch, FiCheck,
  FiHome, FiBriefcase, FiUsers, FiDollarSign, FiTrendingUp,
  FiX, FiPlus, FiRefreshCw, FiHelpCircle
} from 'react-icons/fi';
import { useTheme } from '../contexts/ThemeContext';

const StructuralInput = () => {
  const { workspaceId, projectId } = useParams();
  const navigate = useNavigate();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCostPanelOpen, setIsCostPanelOpen] = useState(false);
  const [activeComponent, setActiveComponent] = useState('slab');
  const [isValidating, setIsValidating] = useState(false);
  const [isOptimising, setIsOptimising] = useState(false);
  
  // Warning state for overridden fields
  const [overriddenFields, setOverriddenFields] = useState({});
  const [showWarning, setShowWarning] = useState(null);
  
  // Cost settings state
  const [costSource, setCostSource] = useState('default');
  const [costRates, setCostRates] = useState([
    { id: 1, item: 'Concrete C30/37 (Supply & Place)', unit: 'm³', rate: 170.00, source: 'Default', lastUpdated: 'Jan 2026' },
    { id: 2, item: 'Rebar B500 (Supply & Fix)', unit: 'tonne', rate: 1300.00, source: 'Default', lastUpdated: 'Jan 2026' },
    { id: 3, item: 'Formwork (Flat Slab)', unit: 'm²', rate: 50.00, source: 'Default', lastUpdated: 'Jan 2026' },
    { id: 4, item: 'Labour - Reinforcement Fixing', unit: 'hour', rate: 38.00, source: 'Default', lastUpdated: 'Jan 2026' },
    { id: 5, item: 'Labour - Formwork', unit: 'hour', rate: 32.50, source: 'Default', lastUpdated: 'Jan 2026' },
    { id: 6, item: 'Concrete Pumping', unit: 'm³', rate: 18.00, source: 'Optional', lastUpdated: 'Jan 2026' },
    { id: 7, item: 'Rebar Wastage Allowance', unit: '%', rate: 5, source: 'Default', lastUpdated: 'Jan 2026' },
  ]);
  const [originalRates, setOriginalRates] = useState(costRates);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isLoadingRates, setIsLoadingRates] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [editingCell, setEditingCell] = useState(null);
  const [activeCostSet, setActiveCostSet] = useState('UK_NATIONAL_2026_Q1');

  // Cost calculation states
  const [totalMaterialCost, setTotalMaterialCost] = useState(84.23);
  const [concreteCost, setConcreteCost] = useState(28.90);
  const [rebarCost, setRebarCost] = useState(5.33);
  const [formworkCost, setFormworkCost] = useState(50.00);
  const [baselineCost, setBaselineCost] = useState(87.00);
  const [optimisedCost, setOptimisedCost] = useState(83.55);
  const [potentialSaving, setPotentialSaving] = useState(3.45);
  const [savingPercentage, setSavingPercentage] = useState(4.10);
  
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
    partition: '1.0',
    partitionMode: 'permanent',
    
    // Materials
    concreteGrade: 'C30/37',
    steelGrade: 'B500A',
    exposureClass: 'XC3',
    
    // Design Constraints
    deflectionLimit: '250',
    crackWidthLimit: '0.3',
    fireRating: '60',
    
    // Optimisation
    costWeight: '15',
    carbonWeight: '30',
    materialWeight: '20',
    
    // Bar selection
    mainBarDiameter: '12',
    candidateDiameters: ['8', '10', '12', '16'],
    minSpacing: '100',
    maxSpacing: '300',
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

  // Cost settings functions
  const updateRateField = (id, field, value) => {
    setCostRates(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
    setHasUnsavedChanges(true);
    recalculateCosts();
  };

  const addCustomItem = () => {
    const newItem = {
      id: Date.now(),
      item: 'New Material',
      unit: 'm³',
      rate: 0,
      source: 'Custom',
      lastUpdated: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    };
    setCostRates([...costRates, newItem]);
    setHasUnsavedChanges(true);
  };

  const removeCustomItem = (id) => {
    setCostRates(prev => prev.filter(item => item.id !== id));
    setHasUnsavedChanges(true);
    recalculateCosts();
  };

  const resetToDefault = async () => {
    setIsResetting(true);
    // Simulate API call
    setTimeout(() => {
      setCostRates(originalRates);
      setHasUnsavedChanges(false);
      setIsResetting(false);
      setActiveCostSet('UK_NATIONAL_2026_Q1');
    }, 1000);
  };

  const saveRates = async () => {
    setIsSaving(true);
    // Simulate API call
    setTimeout(() => {
      setOriginalRates(costRates);
      setHasUnsavedChanges(false);
      setIsSaving(false);
      setActiveCostSet('CUSTOM_' + new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', quarter: true }).toUpperCase().replace(' ', '_'));
      alert('Rates saved successfully!');
    }, 1500);
  };

  const validateRates = () => {
    const invalid = costRates.filter(r => r.rate <= 0);
    if (invalid.length > 0) {
      alert(`Please fix rates for: ${invalid.map(i => i.item).join(', ')}`);
    } else {
      alert('All rates are valid!');
    }
  };

  const recalculateCosts = () => {
    // This would normally use actual slab quantities
    // For demo, we'll just adjust based on rate changes
    const concreteRate = costRates.find(r => r.item.includes('Concrete'))?.rate || 170;
    const rebarRate = costRates.find(r => r.item.includes('Rebar'))?.rate || 1300;
    const formworkRate = costRates.find(r => r.item.includes('Formwork'))?.rate || 50;
    
    // Mock calculations
    const mockConcreteQty = 0.17; // m³ per m²
    const mockRebarQty = 0.0041; // tonnes per m²
    const mockFormworkQty = 1; // m² per m²
    
    const newConcreteCost = concreteRate * mockConcreteQty;
    const newRebarCost = rebarRate * mockRebarQty;
    const newFormworkCost = formworkRate * mockFormworkQty;
    const newTotal = newConcreteCost + newRebarCost + newFormworkCost;
    const newBaseline = 87.00; // Keep baseline fixed for demo
    const newOptimised = newTotal;
    const newSaving = newBaseline - newOptimised;
    const newPercentage = (newSaving / newBaseline) * 100;
    
    setConcreteCost(newConcreteCost);
    setRebarCost(newRebarCost);
    setFormworkCost(newFormworkCost);
    setTotalMaterialCost(newTotal);
    setOptimisedCost(newOptimised);
    setPotentialSaving(newSaving);
    setSavingPercentage(newPercentage);
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
    groupBy = null
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    
    const filteredOptions = searchable && search
      ? options.filter(opt => 
          opt.label.toLowerCase().includes(search.toLowerCase()) ||
          (opt.category && opt.category.toLowerCase().includes(search.toLowerCase()))
        )
      : options;

    return (
      <div className="relative">
        <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
          {label}
        </label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="w-full px-4 py-3 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white flex items-center justify-between hover:border-[#0A2F44] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0A2F44]"
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

  // Reinforcement grades
  const reinforcementGrades = [
    { value: 'B500A', label: 'B500A', description: 'fyk = 500 MPa, ductility class A' },
    { value: 'B500B', label: 'B500B', description: 'fyk = 500 MPa, ductility class B' },
    { value: 'B500C', label: 'B500C', description: 'fyk = 500 MPa, ductility class C' },
    { value: 'B400', label: 'B400', description: 'fyk = 400 MPa (legacy)' },
    { value: 'B600', label: 'B600', description: 'fyk = 600 MPa (high strength)' },
  ];

  // Deflection limits
  const deflectionLimits = [
    { value: '250', label: 'L/250', description: 'Standard for most floors' },
    { value: '300', label: 'L/300', description: 'Stricter control for sensitive finishes' },
    { value: '350', label: 'L/350', description: 'High precision requirements' },
    { value: '400', label: 'L/400', description: 'Very strict deflection control' },
    { value: '500', label: 'L/500', description: 'Extreme precision (laboratories)' },
  ];

  // Fire ratings
  const fireRatings = [
    { value: '30', label: '30 min', description: 'R30 - Low fire risk' },
    { value: '60', label: '60 min', description: 'R60 - Standard requirement' },
    { value: '90', label: '90 min', description: 'R90 - Enhanced protection' },
    { value: '120', label: '120 min', description: 'R120 - High fire risk' },
    { value: '180', label: '180 min', description: 'R180 - Industrial' },
    { value: '240', label: '240 min', description: 'R240 - Special structures' },
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
      alert(`✅ ${activeComponent} optimisation complete! (Mock)`);
    }, 2000);
  };

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

      {/* Cost Settings Panel */}
      {isCostPanelOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={() => {
              if (hasUnsavedChanges) {
                if (confirm('You have unsaved changes. Are you sure you want to close?')) {
                  setIsCostPanelOpen(false);
                  setHasUnsavedChanges(false);
                }
              } else {
                setIsCostPanelOpen(false);
              }
            }}
          />
          <div className="fixed right-0 top-0 h-full w-full max-w-4xl bg-white dark:bg-[#1f2937] z-50 shadow-2xl animate-slide-left overflow-y-auto">
            
            {/* Sticky Header with Close Button */}
            <div className="sticky top-0 bg-white dark:bg-[#1f2937] border-b border-[#e5e7eb] dark:border-[#374151] p-6 flex items-center justify-between z-10">
              <h2 className="text-xl font-bold text-[#02090d] dark:text-white flex items-center">
                <FiDollarSign className="mr-2 text-[#0A2F44]" />
                Cost Source Settings
              </h2>
              <div className="flex items-center space-x-2">
                {hasUnsavedChanges && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                    Unsaved Changes
                  </span>
                )}
                <button
                  onClick={() => {
                    if (hasUnsavedChanges) {
                      if (confirm('You have unsaved changes. Are you sure you want to close?')) {
                        setIsCostPanelOpen(false);
                        setHasUnsavedChanges(false);
                      }
                    } else {
                      setIsCostPanelOpen(false);
                    }
                  }}
                  className="p-2 hover:bg-[#f3f4f6] dark:hover:bg-[#374151] rounded-lg transition-colors group"
                  title="Close"
                >
                  <FiX className="text-xl text-[#6b7280] group-hover:text-[#0A2F44] dark:group-hover:text-white transition-colors" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Loading State */}
              {isLoadingRates ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-12 h-12 border-4 border-[#e5e7eb] border-t-[#0A2F44] rounded-full animate-spin"></div>
                </div>
              ) : (
                <>
                  {/* Cost Source Options */}
                  <div className="mb-8">
                    <h3 className="text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-3">
                      Select cost database and material rates for optimisation
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <button
                        onClick={() => {
                          setCostSource('default');
                          setHasUnsavedChanges(true);
                        }}
                        className={`p-4 rounded-lg border-2 text-left transition-all ${
                          costSource === 'default'
                            ? 'border-[#0A2F44] bg-[#e6f0f5] dark:bg-[#1e3a4a]'
                            : 'border-[#e5e7eb] dark:border-[#374151] hover:border-[#99c2d6]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-[#02090d] dark:text-white">UK National Average</h4>
                          <span className="text-xs bg-[#0A2F44] text-white px-2 py-1 rounded-full">Default</span>
                        </div>
                        <p className="text-sm text-[#6b7280] mb-2">Industry Benchmark Rates</p>
                        <p className="text-xs text-[#0A2F44]">Auto-Updated Quarterly</p>
                      </button>

                      <button
                        onClick={() => {
                          setCostSource('custom');
                          setHasUnsavedChanges(true);
                        }}
                        className={`p-4 rounded-lg border-2 text-left transition-all ${
                          costSource === 'custom'
                            ? 'border-[#0A2F44] bg-[#e6f0f5] dark:bg-[#1e3a4a]'
                            : 'border-[#e5e7eb] dark:border-[#374151] hover:border-[#99c2d6]'
                        }`}
                      >
                        <h4 className="font-semibold text-[#02090d] dark:text-white mb-2">Upload Company Rates</h4>
                        <p className="text-sm text-[#6b7280] mb-2">Custom Price Database</p>
                        <p className="text-xs text-[#0A2F44]">Priority over Default</p>
                      </button>

                      <button
                        onClick={() => setCostSource('bcis')}
                        className={`p-4 rounded-lg border-2 text-left transition-all opacity-60 cursor-not-allowed ${
                          costSource === 'bcis'
                            ? 'border-[#0A2F44] bg-[#e6f0f5] dark:bg-[#1e3a4a]'
                            : 'border-[#e5e7eb] dark:border-[#374151]'
                        }`}
                        disabled
                      >
                        <h4 className="font-semibold text-[#02090d] dark:text-white mb-2">BCIS API</h4>
                        <p className="text-sm text-[#6b7280] mb-2">Live Market Data</p>
                        <p className="text-xs text-[#9ca3af]">Coming Soon</p>
                      </button>
                    </div>
                  </div>

                  {/* Cost Rate Table */}
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-[#02090d] dark:text-white">
                        Cost Rate Table
                      </h3>
                      <p className="text-sm text-[#6b7280]">Material Unit Rates (GBP) — UK 2026 Q1</p>
                    </div>

                    <div className="overflow-x-auto border border-[#e5e7eb] dark:border-[#374151] rounded-lg">
                      <table className="w-full">
                        <thead className="bg-[#f3f4f6] dark:bg-[#374151]">
                          <tr>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b7280] uppercase">Material Item</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b7280] uppercase">Unit</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b7280] uppercase">Rate (£)</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b7280] uppercase">Source</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b7280] uppercase">Last Updated</th>
                            <th className="text-center px-4 py-3 text-xs font-semibold text-[#6b7280] uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#e5e7eb] dark:divide-[#374151]">
                          {costRates.map((item) => (
                            <tr key={item.id} className="hover:bg-[#f9fafb] dark:hover:bg-[#374151] group">
                              <td className="px-4 py-3 text-sm text-[#02090d] dark:text-white">
                                {editingCell?.id === item.id && editingCell?.field === 'item' ? (
                                  <input
                                    type="text"
                                    value={item.item}
                                    onChange={(e) => updateRateField(item.id, 'item', e.target.value)}
                                    onBlur={() => setEditingCell(null)}
                                    onKeyPress={(e) => e.key === 'Enter' && setEditingCell(null)}
                                    className="w-full px-2 py-1 rounded border border-[#0A2F44] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2F44]"
                                    autoFocus
                                  />
                                ) : (
                                  <span 
                                    className="cursor-pointer hover:text-[#0A2F44]"
                                    onClick={() => setEditingCell({ id: item.id, field: 'item' })}
                                  >
                                    {item.item}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-[#6b7280]">
                                {editingCell?.id === item.id && editingCell?.field === 'unit' ? (
                                  <input
                                    type="text"
                                    value={item.unit}
                                    onChange={(e) => updateRateField(item.id, 'unit', e.target.value)}
                                    onBlur={() => setEditingCell(null)}
                                    onKeyPress={(e) => e.key === 'Enter' && setEditingCell(null)}
                                    className="w-20 px-2 py-1 rounded border border-[#0A2F44] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white"
                                    autoFocus
                                  />
                                ) : (
                                  <span 
                                    className="cursor-pointer hover:text-[#0A2F44]"
                                    onClick={() => setEditingCell({ id: item.id, field: 'unit' })}
                                  >
                                    {item.unit}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-[#02090d] dark:text-white">
                                {editingCell?.id === item.id && editingCell?.field === 'rate' ? (
                                  <input
                                    type="number"
                                    value={item.rate}
                                    onChange={(e) => updateRateField(item.id, 'rate', parseFloat(e.target.value) || 0)}
                                    onBlur={() => setEditingCell(null)}
                                    onKeyPress={(e) => e.key === 'Enter' && setEditingCell(null)}
                                    step="0.01"
                                    min="0"
                                    className="w-24 px-2 py-1 rounded border border-[#0A2F44] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white"
                                    autoFocus
                                  />
                                ) : (
                                  <span 
                                    className="cursor-pointer hover:text-[#0A2F44]"
                                    onClick={() => setEditingCell({ id: item.id, field: 'rate' })}
                                  >
                                    £{item.rate.toFixed(2)}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-[#6b7280]">{item.source}</td>
                              <td className="px-4 py-3 text-sm text-[#6b7280]">{item.lastUpdated}</td>
                              <td className="px-4 py-3 text-center">
                                {item.source === 'Custom' && (
                                  <button
                                    onClick={() => removeCustomItem(item.id)}
                                    className="text-red-500 hover:text-red-700 transition-colors opacity-0 group-hover:opacity-100"
                                    title="Remove item"
                                  >
                                    <FiX className="text-lg" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <button
                      onClick={addCustomItem}
                      className="mt-4 flex items-center space-x-2 text-[#0A2F44] hover:text-[#082636] transition-colors"
                    >
                      <FiPlus />
                      <span className="text-sm font-medium">Add Custom Item</span>
                    </button>
                  </div>

                  {/* Cost Summary and Graph */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="md:col-span-2 bg-[#f9fafb] dark:bg-[#374151] rounded-lg p-6">
                      <h3 className="text-sm font-medium text-[#6b7280] mb-4">Cost Summary</h3>
                      <p className="text-xs text-[#6b7280] mb-2">Currency: GBP (£)</p>
                      
                      <div className="mb-6">
                        <p className="text-2xl font-bold text-[#02090d] dark:text-white">
                          £{totalMaterialCost.toFixed(2)} / m²
                        </p>
                        <p className="text-xs text-[#6b7280] mt-1">Total Material Cost</p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-[#6b7280]">Concrete:</span>
                          <span className="font-medium text-[#02090d] dark:text-white">£{concreteCost.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-[#6b7280]">Rebar:</span>
                          <span className="font-medium text-[#02090d] dark:text-white">£{rebarCost.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-[#6b7280]">Formwork:</span>
                          <span className="font-medium text-[#02090d] dark:text-white">£{formworkCost.toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-[#e5e7eb] dark:border-[#4b5563]">
                        <h4 className="text-sm font-medium text-[#6b7280] mb-2">Cost Comparison</h4>
                        <div className="flex justify-between text-sm">
                          <span className="text-[#6b7280]">Baseline:</span>
                          <span className="font-medium text-[#02090d] dark:text-white">£{baselineCost.toFixed(2)} / m²</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-[#6b7280]">Optimised:</span>
                          <span className="font-medium text-[#02090d] dark:text-white">£{optimisedCost.toFixed(2)} / m²</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#f9fafb] dark:bg-[#374151] rounded-lg p-6">
                      <h3 className="text-sm font-medium text-[#6b7280] mb-4">Potential Saving</h3>
                      <div className="text-center">
                        <p className="text-3xl font-bold text-[#2E7D32]">£{potentialSaving.toFixed(2)}</p>
                        <p className="text-sm text-[#2E7D32]">/ m²</p>
                        <div className="mt-4 inline-block bg-[#e8f5e9] dark:bg-[#1e3a4a] px-4 py-2 rounded-full">
                          <span className="text-lg font-bold text-[#2E7D32]">{savingPercentage.toFixed(2)}%</span>
                          <span className="text-sm text-[#2E7D32] ml-1">Reduction</span>
                        </div>
                      </div>

                      {/* Dynamic bar chart visualization */}
                      <div className="mt-6">
                        <div className="flex items-end justify-between h-24">
                          <div className="w-1/3 text-center">
                            <div 
                              className="bg-[#9ca3af] rounded-t-lg mx-2 transition-all duration-300"
                              style={{ height: `${(baselineCost / 100) * 100}px` }}
                            ></div>
                            <p className="text-xs mt-2 text-[#6b7280]">Baseline</p>
                          </div>
                          <div className="w-1/3 text-center">
                            <div 
                              className="bg-[#0A2F44] rounded-t-lg mx-2 transition-all duration-300"
                              style={{ height: `${(optimisedCost / 100) * 100}px` }}
                            ></div>
                            <p className="text-xs mt-2 text-[#6b7280]">Current</p>
                          </div>
                          <div className="w-1/3 text-center">
                            <div 
                              className="bg-[#2E7D32] rounded-t-lg mx-2 transition-all duration-300"
                              style={{ height: `${((baselineCost - potentialSaving) / 100) * 100}px` }}
                            ></div>
                            <p className="text-xs mt-2 text-[#6b7280]">Optimised</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-4 border-t border-[#e5e7eb] dark:border-[#374151]">
                    <div className="flex items-center space-x-4">
                      <button className="flex items-center space-x-2 text-[#6b7280] hover:text-[#0A2F44] transition-colors">
                        <FiHelpCircle />
                        <span className="text-sm">Help & Support</span>
                      </button>
                      <span className="text-sm text-[#6b7280]">
                        Active Cost Set: <span className="font-medium text-[#0A2F44]">{activeCostSet}</span>
                      </span>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={resetToDefault}
                        className="px-4 py-2 border border-[#e5e7eb] dark:border-[#374151] rounded-lg text-sm text-[#6b7280] hover:bg-[#f3f4f6] dark:hover:bg-[#374151] transition-colors flex items-center space-x-2"
                      >
                        <FiRefreshCw className={isResetting ? 'animate-spin' : ''} />
                        <span>Reset to Default</span>
                      </button>
                      <button
                        onClick={validateRates}
                        className="px-4 py-2 bg-[#0A2F44] text-white rounded-lg text-sm hover:bg-[#082636] transition-colors"
                      >
                        Validate Rates
                      </button>
                      <button
                        onClick={saveRates}
                        disabled={!hasUnsavedChanges || isSaving}
                        className={`px-4 py-2 bg-[#2E7D32] text-white rounded-lg text-sm hover:bg-[#1c4b1e] transition-colors flex items-center space-x-2 ${
                          !hasUnsavedChanges || isSaving ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        {isSaving ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <FiTrendingUp />
                            <span>Save Changes</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
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
              {/* Cost Settings Button */}
              <button
                onClick={() => setIsCostPanelOpen(true)}
                className="p-2 rounded-lg hover:bg-[#f3f4f6] dark:hover:bg-[#374151] transition-colors cursor-pointer relative group"
                title="Cost Settings"
              >
                <FiDollarSign className={`text-xl ${
                  isDarkMode ? 'text-[#cce1eb]' : 'text-[#0A2F44]'
                } group-hover:text-[#0A2F44] dark:group-hover:text-white transition-colors`} />
              </button>
              
              {/* Theme Toggle */}
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg hover:bg-[#f3f4f6] dark:hover:bg-[#374151] transition-colors cursor-pointer"
              >
                {isDarkMode ? <FiSun className="text-xl text-yellow-500" /> : <FiMoon className="text-xl text-[#0A2F44]" />}
              </button>
              
              {/* User Avatar */}
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
                          <select
                            value={formData.continuousSpans.length}
                            onChange={(e) => {
                              const num = parseInt(e.target.value);
                              setFormData(prev => ({
                                ...prev,
                                continuousSpans: Array(num).fill('5.0')
                              }));
                            }}
                            className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white"
                          >
                            <option value="2">2 spans</option>
                            <option value="3">3 spans</option>
                            <option value="4">4 spans</option>
                            <option value="5">5 spans</option>
                          </select>
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
                              className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white"
                            />
                          </div>
                        ))}

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                              Left End
                            </label>
                            <select
                              name="endFixityLeft"
                              value={formData.endFixityLeft}
                              onChange={handleChange}
                              className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white"
                            >
                              <option value="pinned">Pinned</option>
                              <option value="fixed">Fixed</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                              Right End
                            </label>
                            <select
                              name="endFixityRight"
                              value={formData.endFixityRight}
                              onChange={handleChange}
                              className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white"
                            >
                              <option value="pinned">Pinned</option>
                              <option value="fixed">Fixed</option>
                            </select>
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
                        className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2F44]"
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
                          className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white"
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
                          } text-[#02090d] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2F44]`}
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
                          } text-[#02090d] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2F44]`}
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

                  <div className="grid grid-cols-2 gap-4 mt-4">
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
                        value={formData.liveLoad}
                        onChange={handleChange}
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
                        value={formData.finishes}
                        onChange={handleChange}
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
                        value={formData.partition}
                        onChange={handleChange}
                        step="0.1"
                        className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                      Partition Mode
                    </label>
                    <div className="flex space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="partitionMode"
                          value="permanent"
                          checked={formData.partitionMode === 'permanent'}
                          onChange={handleChange}
                          className="w-4 h-4 text-[#0A2F44]"
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
                          className="w-4 h-4 text-[#0A2F44]"
                        />
                        <span className="ml-2 text-sm text-[#02090d] dark:text-white">Variable (Qk)</span>
                      </label>
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
                    {/* Concrete Grade Dropdown */}
                    <CustomDropdown
                      label="Concrete Grade"
                      name="concreteGrade"
                      value={formData.concreteGrade}
                      options={concreteGrades}
                      onChange={handleChange}
                    />

                    {/* Reinforcement Grade Dropdown */}
                    <CustomDropdown
                      label="Reinforcement Grade"
                      name="steelGrade"
                      value={formData.steelGrade}
                      options={reinforcementGrades}
                      onChange={handleChange}
                      icon={FiCircle}
                      searchable={true}
                    />

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

                {/* Design Constraints Card */}
                <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-lg border border-[#e5e7eb] dark:border-[#374151] p-6">
                  <h2 className="text-lg font-semibold text-[#02090d] dark:text-white mb-4 flex items-center">
                    <FiClock className="mr-2 text-[#0A2F44]" />
                    Design Constraints
                  </h2>
                  
                  <div className="space-y-4">
                    {/* Deflection Limit */}
                    <CustomDropdown
                      label="Deflection Limit"
                      name="deflectionLimit"
                      value={formData.deflectionLimit}
                      options={deflectionLimits}
                      onChange={handleChange}
                      icon={FiClock}
                    />

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
                        className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white"
                      />
                    </div>

                    {/* Fire Rating */}
                    <CustomDropdown
                      label="Fire Rating (min)"
                      name="fireRating"
                      value={formData.fireRating}
                      options={fireRatings}
                      onChange={handleChange}
                      icon={FiClock}
                    />
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
                      <div className="text-xs text-right text-[#6b7280] mt-1">{formData.costWeight}%</div>
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
                      <div className="text-xs text-right text-[#6b7280] mt-1">{formData.carbonWeight}%</div>
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
                      <div className="text-xs text-right text-[#6b7280] mt-1">{formData.materialWeight}%</div>
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
                          label="Main Bar Diameter"
                          name="mainBarDiameter"
                          value={formData.mainBarDiameter}
                          options={formData.candidateDiameters.map(d => ({
                            value: d,
                            label: `${d} mm`,
                            description: d === autoValues.recommendedBarDiameter ? 'Recommended' : 
                                         (parseInt(d) < parseInt(autoValues.recommendedBarDiameter) ? 'Smaller than recommended' : 
                                          'Larger than recommended')
                          }))}
                          onChange={handleChange}
                          icon={FiCircle}
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
                          className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white"
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
                          className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white"
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
        </div>
      </div>
    </div>
  );
};

export default StructuralInput;