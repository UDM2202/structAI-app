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
  const [generatedOptions, setGeneratedOptions] = useState([]);
  const [slabArea, setSlabArea] = useState(100);
  
  // Store results per component
  const [storedResults, setStoredResults] = useState({
    slab: [],
    beam: [],
    column: [],
    foundation: [],
    staircase: []
  });
  
  const [overriddenFields, setOverriddenFields] = useState({});
  const [showWarning, setShowWarning] = useState(null);
  
  const components = [
    { id: 'slab', name: 'Slab', icon: FiGrid },
    { id: 'beam', name: 'Beam', icon: FiBarChart2 },
    { id: 'column', name: 'Column', icon: FiColumns },
    { id: 'foundation', name: 'Foundation', icon: FiSquare },
    { id: 'staircase', name: 'Staircase', icon: FiTriangle },
  ];

  // Form state
  const [formData, setFormData] = useState({
    slabType: 'one-way',
    supportCondition: 'ss',
    spanX: '6.0',
    spanY: '4.0',
    thickness: '200',
    cover: '25',
    continuousSpans: ['5.0', '5.0', '4.0'],
    endFixityLeft: 'pinned',
    endFixityRight: 'pinned',
    buildingUse: 'office',
    finishes: '1.0',
    serviceAllowance: '1.2',
    partition: '1.0',
    partitionMode: 'permanent',
    permanentLoads: [{ name: 'Equipment', value: '2.0' }],
    leadingLoad: { key: 'qk', value: '2.0' },
    accompanyingLoads: [{ key: 'wk', value: '1.3' }],
    concreteGrade: 'C30/37',
    steelGrade: 'B500',
    exposureClass: 'XC3',
    crackWidthLimit: '0.3',
    fireRating: '60',
    costWeight: '15',
    carbonWeight: '30',
    materialWeight: '20',
    numThicknesses: '2',
    thickness1: '160',
    thickness2: '175',
    barDiameter1: '10',
    barDiameter2: '12',
    mainBarDiameter: '12',
    candidateDiameters: ['8', '10', '12', '16', '20', '25'],
    minSpacing: '150',
    maxSpacing: '300',
    useAIDatabase: true,
    region: 'uk',
    concreteRate: '170',
    steelRate: '1300',
    formworkRate: '50',
    useAIRecommendation: 'y'
  });

  // Auto-bar selection based on building use and span (from hardcoding document)
  const getAutoBarPreset = (buildingUse, spanM) => {
    const span = parseFloat(spanM);
    
    // Residential / Hotel
    if (buildingUse === 'residential' || buildingUse === 'hotel') {
      if (span <= 4.0) return { thickness: 125, mainBar: 10, spacing: 200, distBar: 8, distSpacing: 250, note: "Concept-stage solid slab" };
      if (span <= 5.0) return { thickness: 150, mainBar: 10, spacing: 175, distBar: 8, distSpacing: 250, note: "Concept-stage solid slab" };
      if (span <= 6.0) return { thickness: 175, mainBar: 12, spacing: 175, distBar: 10, distSpacing: 250, note: "Concept-stage solid slab" };
      if (span <= 7.0) return { thickness: 200, mainBar: 12, spacing: 150, distBar: 10, distSpacing: 200, note: "Borderline for solid slab" };
      return { thickness: 0, mainBar: 0, spacing: 0, distBar: 0, distSpacing: 0, note: "Solid slab not recommended above 7.0 m" };
    }
    
    // Office / Education
    if (buildingUse === 'office' || buildingUse === 'education') {
      if (span <= 4.0) return { thickness: 150, mainBar: 10, spacing: 175, distBar: 8, distSpacing: 250, note: "Concept-stage solid slab" };
      if (span <= 5.0) return { thickness: 175, mainBar: 12, spacing: 200, distBar: 10, distSpacing: 250, note: "Concept-stage solid slab" };
      if (span <= 6.0) return { thickness: 200, mainBar: 12, spacing: 175, distBar: 10, distSpacing: 200, note: "Concept-stage solid slab" };
      if (span <= 7.0) return { thickness: 225, mainBar: 12, spacing: 150, distBar: 10, distSpacing: 200, note: "Borderline for solid slab" };
      return { thickness: 0, mainBar: 0, spacing: 0, distBar: 0, distSpacing: 0, note: "Review flat slab / beam-and-slab" };
    }
    
    // Healthcare / Retail
    if (buildingUse === 'healthcare' || buildingUse === 'retail') {
      if (span <= 4.0) return { thickness: 150, mainBar: 12, spacing: 200, distBar: 10, distSpacing: 250, note: "Concept-stage solid slab" };
      if (span <= 5.0) return { thickness: 175, mainBar: 12, spacing: 175, distBar: 10, distSpacing: 250, note: "Concept-stage solid slab" };
      if (span <= 6.0) return { thickness: 200, mainBar: 12, spacing: 150, distBar: 10, distSpacing: 200, note: "Concept-stage solid slab" };
      if (span <= 7.0) return { thickness: 225, mainBar: 16, spacing: 175, distBar: 10, distSpacing: 200, note: "Borderline for solid slab" };
      return { thickness: 0, mainBar: 0, spacing: 0, distBar: 0, distSpacing: 0, note: "Solid slab likely inefficient" };
    }
    
    return { thickness: 0, mainBar: 0, spacing: 0, distBar: 0, distSpacing: 0, note: "No preset available" };
  };

  // Building use options
  const buildingUseOptions = [
    { value: 'residential', label: 'Residential', icon: FiHome, description: 'Dwellings, apartments, houses' },
    { value: 'hotel', label: 'Hotel', icon: FiHome, description: 'Hotels, guest houses, accommodation' },
    { value: 'office', label: 'Office', icon: FiBriefcase, description: 'Office buildings, commercial workspaces' },
    { value: 'education', label: 'Education', icon: FiUsers, description: 'Schools, universities, classrooms' },
    { value: 'healthcare', label: 'Healthcare', icon: FiUsers, description: 'Hospitals, clinics, medical facilities' },
    { value: 'retail', label: 'Retail', icon: FiBriefcase, description: 'Shops, stores, shopping centres' },
  ];

  const variableActionKeys = [
    { value: 'qk', label: 'qk - Imposed load', description: 'Imposed load' },
    { value: 'wk', label: 'wk - Wind load', description: 'Wind load' },
    { value: 'sk', label: 'sk - Snow load', description: 'Snow load' },
    { value: 'tk', label: 'tk - Traffic load', description: 'Traffic load' },
  ];

  const [autoValues, setAutoValues] = useState({
    recommendedThickness: '200',
    recommendedCover: '25',
    recommendedBarDiameter: '12',
  });

  // Auto-update based on building use and span
  useEffect(() => {
    if (activeComponent === 'slab') {
      const preset = getAutoBarPreset(formData.buildingUse, formData.spanX);
      if (preset.thickness > 0 && !overriddenFields.thickness) {
        setFormData(prev => ({ ...prev, thickness: preset.thickness.toString() }));
        setAutoValues(prev => ({ ...prev, recommendedThickness: preset.thickness.toString() }));
      }
    }
  }, [formData.buildingUse, formData.spanX, activeComponent, overriddenFields.thickness]);

  // Auto-generate thickness based on span (fallback)
  useEffect(() => {
    if (activeComponent === 'slab' && !overriddenFields.thickness) {
      const span = parseFloat(formData.spanX);
      let recommendedThickness = '200';
      if (span <= 3.5) recommendedThickness = '150';
      else if (span <= 5.0) recommendedThickness = '175';
      else if (span <= 6.5) recommendedThickness = '200';
      else if (span <= 8.0) recommendedThickness = '225';
      else recommendedThickness = '250';
      
      setAutoValues(prev => ({ ...prev, recommendedThickness }));
      if (!overriddenFields.thickness) {
        setFormData(prev => ({ ...prev, thickness: recommendedThickness }));
      }
    }
  }, [formData.spanX, activeComponent, overriddenFields.thickness]);

  // Auto-generate cover based on fire rating and exposure class
  useEffect(() => {
    if (activeComponent === 'slab' && !overriddenFields.cover) {
      const exposureMap = {
        'XC1': { '60': '20', '90': '25', '120': '35' },
        'XC2': { '60': '25', '90': '30', '120': '40' },
        'XC3': { '60': '25', '90': '35', '120': '45' },
        'XC4': { '60': '30', '90': '40', '120': '50' },
      };
      const recommendedCover = exposureMap[formData.exposureClass]?.[formData.fireRating] || '25';
      setFormData(prev => ({ ...prev, cover: recommendedCover }));
      setAutoValues(prev => ({ ...prev, recommendedCover }));
    }
  }, [formData.fireRating, formData.exposureClass, activeComponent, overriddenFields.cover]);

  // Auto-generate bar diameter
  useEffect(() => {
    if (activeComponent === 'slab') {
      const thickness = parseFloat(formData.thickness);
      let recommendedBarDiameter = '12';
      if (thickness >= 250) recommendedBarDiameter = '16';
      else if (thickness >= 200) recommendedBarDiameter = '12';
      else recommendedBarDiameter = '10';
      setAutoValues(prev => ({ ...prev, recommendedBarDiameter }));
      if (!overriddenFields.mainBarDiameter) {
        setFormData(prev => ({ ...prev, mainBarDiameter: recommendedBarDiameter }));
      }
    }
  }, [formData.thickness, activeComponent, overriddenFields.mainBarDiameter]);

  const concreteGrades = [
    { value: 'C12/15', label: 'C12/15', description: 'fck = 12 MPa, fctm = 1.6 MPa' },
    { value: 'C16/20', label: 'C16/20', description: 'fck = 16 MPa, fctm = 1.9 MPa' },
    { value: 'C20/25', label: 'C20/25', description: 'fck = 20 MPa, fctm = 2.2 MPa' },
    { value: 'C25/30', label: 'C25/30', description: 'fck = 25 MPa, fctm = 2.6 MPa' },
    { value: 'C30/37', label: 'C30/37', description: 'fck = 30 MPa, fctm = 2.9 MPa' },
    { value: 'C35/45', label: 'C35/45', description: 'fck = 35 MPa, fctm = 3.2 MPa' },
    { value: 'C40/50', label: 'C40/50', description: 'fck = 40 MPa, fctm = 3.5 MPa' },
  ];

  const exposureClasses = [
    { value: 'XC1', label: 'XC1', description: 'Dry or permanently wet' },
    { value: 'XC2', label: 'XC2', description: 'Wet, rarely dry' },
    { value: 'XC3', label: 'XC3', description: 'Moderate humidity' },
    { value: 'XC4', label: 'XC4', description: 'Cyclic wet and dry' },
  ];

  // Generate options based on user inputs
const generateOptions = () => {
  const span = parseFloat(formData.spanX);
  if (isNaN(span) || span <= 0) return [];
  
  // Use the thicknesses from user input
  const thicknesses = [160, 175, 200, 225, 250];
  const barDiameters = [10, 12, 16, 20];
  const spacings = [150, 175, 200, 225, 250];
  
  // Calculate K factor based on support condition
  let kFactor = 1.0;
  if (formData.supportCondition === 'continuous') {
    kFactor = 1.3;
  }
  
  // Calculate total permanent load
  let gkTotal = 0;
  gkTotal += parseFloat(formData.finishes) || 0;
  gkTotal += parseFloat(formData.serviceAllowance) || 0;
  gkTotal += parseFloat(formData.partition) || 0;
  formData.permanentLoads.forEach(load => {
    gkTotal += parseFloat(load.value) || 0;
  });
  
  // Calculate leading and accompanying loads
  const qkLead = parseFloat(formData.leadingLoad.value) || 0;
  let reducedAcc = 0;
  formData.accompanyingLoads.forEach(load => {
    reducedAcc += 1.5 * 0.6 * (parseFloat(load.value) || 0);
  });
  
  const options = [];
  let id = 1;
  
  for (const thickness of thicknesses) {
    for (const barDiameter of barDiameters) {
      for (const spacing of spacings) {
        // Self weight
        const selfWeight = 25 * thickness / 1000;
        const totalGk = selfWeight + gkTotal;
        
        // Design load and moment
        const wEd = 1.35 * totalGk + 1.5 * qkLead + reducedAcc;
        const mEd = wEd * Math.pow(span, 2) / 8;
        
        // Effective depth
        const cover = parseFloat(formData.cover) || 25;
        const d = thickness - cover - barDiameter / 2;
        if (d <= 0) continue;
        
        // Lever arm (UK NA: z = 0.9d)
        const z = 0.9 * d;
        const fyd = 434.78;
        
        // Required steel
        let asReq = mEd * 1000000 / (fyd * z);
        if (asReq < 0) asReq = 0;
        
        // Minimum reinforcement
        const fctm = 2.9;
        const asMin = Math.max(0.26 * fctm / 500 * 1000 * d, 0.0013 * 1000 * d);
        asReq = Math.max(asReq, asMin);
        
        // Provided steel
        const barArea = Math.PI * Math.pow(barDiameter, 2) / 4;
        const asProv = barArea * 1000 / spacing;
        
        // Utilisation
        const utilisation = asReq / asProv;
        
        // Deflection check with F3 factor
        const actualSlenderness = span * 1000 / d;
        const p = asReq / (1000 * d) * 100;
        const p0 = Math.sqrt(30) / 1000 * 100;
        
        let basicLimit;
        if (p <= p0) {
          basicLimit = kFactor * (11 + 1.5 * Math.sqrt(30) * (p0 / p));
        } else {
          basicLimit = kFactor * (11 + 1.5 * Math.sqrt(30));
        }
        
        const f3 = Math.min(asProv / asReq, 1.5);
        const finalLimit = basicLimit * f3;
        const deflectionStatus = actualSlenderness <= finalLimit;
        
        // Costs
        const concreteVol = thickness / 1000;
        const concreteCost = concreteVol * 170 * slabArea;
        const steelWeight = asProv / 1000 * 7850;
        const steelCost = steelWeight * 1.3 * slabArea / 1000;
        const formworkCost = 50 * slabArea;
        const totalCost = concreteCost + steelCost + formworkCost;
        
        // Carbon
        const concreteCarbon = concreteVol * 240 * slabArea;
        const steelCarbon = steelWeight * 1.5 * slabArea;
        const totalCarbon = concreteCarbon + steelCarbon;
        
        // Score
        const costW = parseFloat(formData.costWeight) / 100;
        const carbonW = parseFloat(formData.carbonWeight) / 100;
        const materialW = parseFloat(formData.materialWeight) / 100;
        
        const normCost = totalCost / 30000;
        const normCarbon = totalCarbon / 15000;
        const normMaterial = thickness / 300;
        const score = (costW * normCost) + (carbonW * normCarbon) + (materialW * normMaterial);
        
        // Status
        let status = 'pass';
        let warningMessage = '';
        
        if (utilisation <= 0.7 && deflectionStatus) {
          status = 'optimal';
        } else if (utilisation <= 1.0 && deflectionStatus) {
          status = 'pass';
        } else if (utilisation <= 1.2) {
          status = 'warning';
          warningMessage = 'Steel area slightly below requirement';
        } else if (utilisation <= 1.5) {
          status = 'warning';
          warningMessage = 'Steel area below requirement';
        } else {
          status = 'fail';
          warningMessage = 'Steel area insufficient';
        }
        
        if (!deflectionStatus) {
          status = 'warning';
          warningMessage = warningMessage ? `${warningMessage}, Deflection fails` : 'Deflection fails';
        }
        
        options.push({
          id: id++,
          rank: 0,
          thickness: Math.round(thickness),
          barDiameter: Math.round(barDiameter),
          spacing: spacing,
          asReq: Math.round(asReq),
          asProv: Math.round(asProv),
          cost: Math.round(totalCost),
          carbon: Math.round(totalCarbon),
          utilisation: utilisation.toFixed(2),
          deflection: actualSlenderness.toFixed(1),
          status: status,
          warningMessage: warningMessage,
          recommended: false,
          score: score
        });
      }
    }
  }
  
  // Filter and sort
  const validOptions = options.filter(opt => opt.status !== 'fail');
  if (validOptions.length === 0) return [];
  
  validOptions.sort((a, b) => a.score - b.score);
  validOptions.forEach((opt, idx) => {
    opt.rank = idx + 1;
    opt.recommended = idx === 0;
  });
  
  console.log('Generated options:', validOptions.length);
  return validOptions.slice(0, 12);
};

  const isOverridden = (field) => {
    if (field === 'thickness') return formData.thickness !== autoValues.recommendedThickness;
    if (field === 'cover') return formData.cover !== autoValues.recommendedCover;
    if (field === 'mainBarDiameter') return formData.mainBarDiameter !== autoValues.recommendedBarDiameter;
    return false;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
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
        setOverriddenFields(prev => ({ ...prev, [name]: false }));
      }
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePermanentLoadChange = (index, field, value) => {
    const updatedLoads = [...formData.permanentLoads];
    updatedLoads[index][field] = value;
    setFormData(prev => ({ ...prev, permanentLoads: updatedLoads }));
  };

  const addPermanentLoad = () => {
    setFormData(prev => ({ ...prev, permanentLoads: [...prev.permanentLoads, { name: '', value: '' }] }));
  };

  const removePermanentLoad = (index) => {
    const updatedLoads = formData.permanentLoads.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, permanentLoads: updatedLoads }));
  };

  const handleAccompanyingLoadChange = (index, field, value) => {
    const updatedLoads = [...formData.accompanyingLoads];
    updatedLoads[index][field] = value;
    setFormData(prev => ({ ...prev, accompanyingLoads: updatedLoads }));
  };

  const addAccompanyingLoad = () => {
    setFormData(prev => ({ ...prev, accompanyingLoads: [...prev.accompanyingLoads, { key: 'wk', value: '' }] }));
  };

  const removeAccompanyingLoad = (index) => {
    const updatedLoads = formData.accompanyingLoads.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, accompanyingLoads: updatedLoads }));
  };

  const confirmOverride = () => {
    if (showWarning) {
      setOverriddenFields(prev => ({ ...prev, [showWarning.field]: true }));
      setShowWarning(null);
    }
  };

  const cancelOverride = () => {
    if (showWarning) {
      setFormData(prev => ({
        ...prev,
        [showWarning.field]: autoValues[`recommended${showWarning.field.charAt(0).toUpperCase() + showWarning.field.slice(1)}`]
      }));
      setShowWarning(null);
    }
  };

  const getWarningMessage = (field, recommended, newValue) => {
    switch(field) {
      case 'thickness':
        return `Recommended thickness for span ${formData.spanX}m is ${recommended}mm. Using ${newValue}mm may affect deflection.`;
      case 'cover':
        return `Recommended cover for ${formData.exposureClass} with ${formData.fireRating}min fire rating is ${recommended}mm. Using ${newValue}mm may compromise durability.`;
      case 'mainBarDiameter':
        return `Recommended bar diameter for ${formData.thickness}mm slab is ${recommended}mm. Using ${newValue}mm bars may affect bar spacing.`;
      default:
        return `The recommended value is ${recommended}. Are you sure you want to use ${newValue}?`;
    }
  };

  const CustomDropdown = ({ label, name, value, options, onChange, icon: Icon, searchable = false, customClass = '' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    
    const filteredOptions = searchable && search
      ? options.filter(opt => opt.label.toLowerCase().includes(search.toLowerCase()))
      : options;

    return (
      <div className="relative">
        {label && <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">{label}</label>}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`w-full px-4 py-3 rounded-lg border ${customClass || 'border-[#e5e7eb] dark:border-[#374151]'} bg-white dark:bg-[#374151] text-left flex items-center justify-between hover:border-[#0A2F44] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0A2F44] cursor-pointer`}
          >
            <div className="flex items-center space-x-3">
              {Icon && <Icon className="text-[#0A2F44] dark:text-[#66a4c2]" />}
              <span className="text-[#02090d] dark:text-white">{options.find(opt => opt.value === value)?.label || value}</span>
            </div>
            <FiChevronDown className={`text-[#6b7280] dark:text-[#9ca3af] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </button>
          {isOpen && (
            <div className="absolute z-20 w-full mt-1 bg-white dark:bg-[#1f2937] border border-[#e5e7eb] dark:border-[#374151] rounded-lg shadow-xl max-h-80 overflow-auto">
              {searchable && (
                <div className="sticky top-0 p-2 bg-white dark:bg-[#1f2937] border-b border-[#e5e7eb] dark:border-[#374151]">
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#9ca3af] dark:text-[#6b7280]" />
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
                    <div className="font-medium">{option.label}</div>
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

  const getUserInitials = () => 'JE';

  const handleValidate = () => {
    setIsValidating(true);
    setTimeout(() => {
      setIsValidating(false);
      alert(`✅ ${activeComponent} validation passed!`);
    }, 1500);
  };

  const handleOptimise = () => {
    setIsOptimising(true);
    setTimeout(() => {
      const options = generateOptions();
      setGeneratedOptions(options);
      // Store results for current component
      setStoredResults(prev => ({
        ...prev,
        [activeComponent]: options
      }));
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

  const handleComponentSwitch = (componentId) => {
    setActiveComponent(componentId);
    
    // Load stored results for this component
    const savedResults = storedResults[componentId];
    if (savedResults && savedResults.length > 0) {
      setGeneratedOptions(savedResults);
      setShowResults(true);
    } else {
      setGeneratedOptions([]);
      setShowResults(false);
    }
    
    // Reset other view states
    setShowReport(false);
    setShowAIRecommendation(false);
    setShowTradeoff(false);
    setSelectedOptionId(null);
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] dark:bg-[#111827] flex transition-colors duration-300">
      {/* Warning Modal */}
      {showWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center space-x-3 text-yellow-600 dark:text-yellow-500 mb-4">
              <FiAlertTriangle className="text-3xl" />
              <h3 className="text-lg font-semibold text-[#02090d] dark:text-white">Override Recommended Value</h3>
            </div>
            <p className="text-[#4b5563] dark:text-[#9ca3af] mb-6">{showWarning.message}</p>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-6">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">You are taking responsibility for this design decision.</p>
            </div>
            <div className="flex justify-end space-x-3">
              <button onClick={cancelOverride} className="px-4 py-2 border border-[#e5e7eb] dark:border-[#374151] rounded-lg text-[#6b7280] dark:text-[#9ca3af] hover:bg-[#f3f4f6] dark:hover:bg-[#374151] transition-colors cursor-pointer">Cancel</button>
              <button onClick={confirmOverride} className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors cursor-pointer">Override</button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Menu Overlay */}
      {isSidebarOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />
          <div className="fixed left-0 top-0 h-full w-[75%] bg-white dark:bg-[#1f2937] z-50 md:hidden shadow-2xl">
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
                    handleComponentSwitch(comp.id);
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg mb-2 transition-colors cursor-pointer ${
                    activeComponent === comp.id
                      ? 'bg-[#0A2F44] text-white'
                      : 'text-[#6b7280] dark:text-[#9ca3af] hover:bg-[#f3f4f6] dark:hover:bg-[#374151]'
                  }`}
                >
                  <comp.icon className="text-lg" />
                  <span>{comp.name}</span>
                  {storedResults[comp.id]?.length > 0 && (
                    <span className="ml-auto text-xs bg-white/20 px-1.5 py-0.5 rounded-full">
                      {storedResults[comp.id].length}
                    </span>
                  )}
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
              <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 rounded-lg hover:bg-[#f3f4f6] dark:hover:bg-[#374151] transition-colors cursor-pointer">
                <FiMenu className="text-xl text-[#6b7280] dark:text-[#9ca3af]" />
              </button>
              <button onClick={() => navigate(-1)} className="flex items-center space-x-2 text-[#6b7280] dark:text-[#9ca3af] hover:text-[#0A2F44] dark:hover:text-[#66a4c2] transition-colors cursor-pointer">
                <FiArrowLeft className="text-lg" />
                <span className="text-sm">Back to Project</span>
              </button>
            </div>
            <div className="flex items-center space-x-3">
              <button onClick={toggleDarkMode} className="p-2 rounded-lg hover:bg-[#f3f4f6] dark:hover:bg-[#374151] transition-colors cursor-pointer">
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
                onClick={() => handleComponentSwitch(comp.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors cursor-pointer ${
                  activeComponent === comp.id
                    ? 'bg-[#0A2F44] text-white'
                    : 'text-[#6b7280] dark:text-[#9ca3af] hover:text-[#0A2F44] dark:hover:text-[#66a4c2] hover:bg-[#f3f4f6] dark:hover:bg-[#374151]'
                }`}
              >
                <comp.icon className="text-lg" />
                <span className="text-sm font-medium">{comp.name}</span>
                {storedResults[comp.id]?.length > 0 && (
                  <span className="ml-1 text-xs bg-white/20 px-1.5 py-0.5 rounded-full">
                    {storedResults[comp.id].length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Show Results Comparison */}
          {showResults && generatedOptions.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-[#02090d] dark:text-white">Optimisation Results</h1>
                <div className="flex space-x-3">
                  <button onClick={handleViewAIRecommendation} className="px-4 py-2 bg-[#0A2F44] dark:bg-[#2E7D32] text-white rounded-lg hover:bg-[#082636] dark:hover:bg-[#1c4b1e] transition-colors shadow-md cursor-pointer">
                    AI Recommendation
                  </button>
                  <button onClick={() => setShowResults(false)} className="px-4 py-2 border border-[#e5e7eb] dark:border-[#4b5563] text-[#374151] dark:text-[#d1d5db] rounded-lg hover:bg-[#f3f4f6] dark:hover:bg-[#374151] transition-colors cursor-pointer">
                    Back to Input
                  </button>
                </div>
              </div>
              <SlabResultsComparison
                options={generatedOptions}
                onViewReport={handleViewReport}
                onCompare={handleViewTradeoff}
                onExport={(format) => console.log(`Export as ${format}`)}
                onBackToInput={() => setShowResults(false)}
              />
            </div>
          )}

          {/* Show No Results Message */}
          {showResults && generatedOptions.length === 0 && (
            <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-lg p-12 text-center">
              <p className="text-[#6b7280] dark:text-[#9ca3af]">No valid options found. Try adjusting your parameters.</p>
              <button onClick={() => setShowResults(false)} className="mt-4 px-4 py-2 bg-[#0A2F44] text-white rounded-lg hover:bg-[#082636] cursor-pointer">Back to Input</button>
            </div>
          )}

          {/* Show Detailed Report */}
          {showReport && selectedOptionId && (
            <div>
              <button onClick={() => { setShowReport(false); setShowResults(true); }} className="mb-4 flex items-center space-x-2 text-[#6b7280] dark:text-[#9ca3af] hover:text-[#0A2F44] dark:hover:text-[#66a4c2] transition-colors cursor-pointer">
                <FiArrowLeft /> <span>Back to Results</span>
              </button>
              {(() => {
                const selectedOption = generatedOptions.find(opt => opt.id === selectedOptionId);
                if (!selectedOption) {
                  return (
                    <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-lg p-12 text-center">
                      <p className="text-red-500 dark:text-red-400">Option not found. Please go back and try again.</p>
                      <button onClick={() => { setShowReport(false); setShowResults(true); }} className="mt-4 px-4 py-2 bg-[#0A2F44] text-white rounded-lg">Back to Results</button>
                    </div>
                  );
                }
                return (
                  <SlabDetailedReport
                    option={selectedOption}
                    onBack={() => { setShowReport(false); setShowResults(true); }}
                    onExport={(format) => console.log(`Export as ${format}`)}
                    slabArea={slabArea}
                  />
                );
              })()}
            </div>
          )}

          {/* Show AI Recommendation */}
          {showAIRecommendation && generatedOptions.length > 0 && (
            <AIRecommendation
              options={generatedOptions}
              onBack={handleBackToResults}
              onAccept={(optionId) => {
                setSelectedOptionId(optionId);
                setShowReport(true);
                setShowAIRecommendation(false);
              }}
            />
          )}

          {/* Show Trade-off Analysis */}
          {showTradeoff && compareOptions.length > 0 && (
            <TradeoffAnalysis
              options={generatedOptions.filter(opt => compareOptions.includes(opt.id))}
              onBack={handleBackToResults}
              onSelectOption={(optionId) => {
                setSelectedOptionId(optionId);
                setShowReport(true);
                setShowTradeoff(false);
              }}
            />
          )}

          {/* Show Input Form */}
          {!showResults && !showReport && !showAIRecommendation && !showTradeoff && activeComponent === 'slab' && (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-[#02090d] dark:text-white">Slab Input</h1>
                <p className="text-sm text-[#6b7280] dark:text-[#9ca3af] mt-1">Enter slab parameters for structural analysis and optimisation</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column */}
                <div className="space-y-6">
                  {/* Building Use Card */}
                  <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-lg border border-[#e5e7eb] dark:border-[#374151] p-6">
                    <h2 className="text-lg font-semibold text-[#02090d] dark:text-white mb-4 flex items-center">
                      <FiHome className="mr-2 text-[#0A2F44] dark:text-[#66a4c2]" />
                      Building Use
                    </h2>
                    <CustomDropdown
                      label="Select Building Type"
                      name="buildingUse"
                      value={formData.buildingUse}
                      options={buildingUseOptions}
                      onChange={handleChange}
                      icon={FiHome}
                      searchable={true}
                    />
                    <p className="text-xs text-[#6b7280] dark:text-[#9ca3af] mt-2">
                      This determines default load values and reinforcement recommendations
                    </p>
                  </div>

                  {/* Slab Geometry Card */}
                  <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-lg border border-[#e5e7eb] dark:border-[#374151] p-6">
                    <h2 className="text-lg font-semibold text-[#02090d] dark:text-white mb-4 flex items-center">
                      <FiGrid className="mr-2 text-[#0A2F44] dark:text-[#66a4c2]" />
                      Slab Geometry
                    </h2>
                    <div className="space-y-4">
                    {/* Slab Type */}
<div>
  <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
    Slab Type
  </label>
  <div className="grid grid-cols-2 gap-3">
    <label className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${
      formData.slabType === 'one-way'
        ? 'border-[#0A2F44] bg-[#e6f0f5] dark:bg-[#1e3a4a]'
        : 'border-[#e5e7eb] dark:border-[#374151] hover:border-[#99c2d6]'
    }`}>
      <div className="flex items-center">
        <input
          type="radio"
          name="slabType"
          value="one-way"
          checked={formData.slabType === 'one-way'}
          onChange={handleChange}
          className="w-4 h-4 text-[#0A2F44] focus:ring-[#0A2F44]"
        />
        <span className="ml-3 text-sm font-medium text-[#02090d] dark:text-white">One-way</span>
      </div>
      <FiInfo className="text-[#9ca3af] text-sm" title="Load transfers in one direction (short span)" />
    </label>
    
    <label className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${
      formData.slabType === 'two-way'
        ? 'border-[#0A2F44] bg-[#e6f0f5] dark:bg-[#1e3a4a]'
        : 'border-[#e5e7eb] dark:border-[#374151] hover:border-[#99c2d6]'
    }`}>
      <div className="flex items-center">
        <input
          type="radio"
          name="slabType"
          value="two-way"
          checked={formData.slabType === 'two-way'}
          onChange={handleChange}
          className="w-4 h-4 text-[#0A2F44] focus:ring-[#0A2F44]"
        />
        <span className="ml-3 text-sm font-medium text-[#02090d] dark:text-white">Two-way</span>
      </div>
      <FiInfo className="text-[#9ca3af] text-sm" title="Load transfers in both directions" />
    </label>
  </div>
</div>

                      {/* Support Condition*/}
<div>
  <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
    Support Condition
  </label>
  <div className="grid grid-cols-2 gap-3">
    <label className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${
      formData.supportCondition === 'ss'
        ? 'border-[#0A2F44] bg-[#e6f0f5] dark:bg-[#1e3a4a]'
        : 'border-[#e5e7eb] dark:border-[#374151] hover:border-[#99c2d6]'
    }`}>
      <div className="flex items-center">
        <input
          type="radio"
          name="supportCondition"
          value="ss"
          checked={formData.supportCondition === 'ss'}
          onChange={handleChange}
          className="w-4 h-4 text-[#0A2F44] focus:ring-[#0A2F44]"
        />
        <span className="ml-3 text-sm font-medium text-[#02090d] dark:text-white">Simply Supported</span>
      </div>
      <FiInfo className="text-[#9ca3af] text-sm" title="Simple support - no moment transfer" />
    </label>
    
    <label className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${
      formData.supportCondition === 'continuous'
        ? 'border-[#0A2F44] bg-[#e6f0f5] dark:bg-[#1e3a4a]'
        : 'border-[#e5e7eb] dark:border-[#374151] hover:border-[#99c2d6]'
    }`}>
      <div className="flex items-center">
        <input
          type="radio"
          name="supportCondition"
          value="continuous"
          checked={formData.supportCondition === 'continuous'}
          onChange={handleChange}
          className="w-4 h-4 text-[#0A2F44] focus:ring-[#0A2F44]"
        />
        <span className="ml-3 text-sm font-medium text-[#02090d] dark:text-white">Continuous</span>
      </div>
      <FiInfo className="text-[#9ca3af] text-sm" title="Moment continuity over supports" />
    </label>
  </div>
</div>
                  {/* Continuous Spans */}
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
          { value: '2', label: '2 spans', description: 'Two-span continuous slab' },
          { value: '3', label: '3 spans', description: 'Three-span continuous slab' },
          { value: '4', label: '4 spans', description: 'Four-span continuous slab' },
          { value: '5', label: '5 spans', description: 'Five-span continuous slab' },
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
          className="w-full px-4 py-3 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2F44] transition-all"
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
            { value: 'pinned', label: 'Pinned', description: 'Simple support - no moment transfer' },
            { value: 'fixed', label: 'Fixed', description: 'Fully restrained - moment transferred' },
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
            { value: 'pinned', label: 'Pinned', description: 'Simple support - no moment transfer' },
            { value: 'fixed', label: 'Fixed', description: 'Fully restrained - moment transferred' },
          ]}
          onChange={handleChange}
        />
      </div>
    </div>
  </div>
)}

                      <div>
                        <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">Span X (m) <span className="text-xs text-[#6b7280] dark:text-[#9ca3af]">(primary span)</span></label>
                        <input type="number" name="spanX" value={formData.spanX} onChange={handleChange} step="0.1" className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2F44]" />
                      </div>

                      {formData.slabType === 'two-way' && (
                        <div className="animate-fade-in">
                          <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">Span Y (m) <span className="text-xs text-[#6b7280] dark:text-[#9ca3af]">(secondary span)</span></label>
                          <input type="number" name="spanY" value={formData.spanY} onChange={handleChange} step="0.1" className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white" />
                        </div>
                      )}

                      <div className="relative">
                        <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">Thickness (mm)</label>
                        <div className="relative">
                          <input type="number" name="thickness" value={formData.thickness} onChange={handleChange} step="5" className={`w-full px-4 py-2 rounded-lg border ${isOverridden('thickness') ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' : 'border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151]'} text-[#02090d] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2F44]`} />
                          {isOverridden('thickness') && <div className="absolute right-3 top-1/2 transform -translate-y-1/2"><FiAlertTriangle className="text-yellow-500" /></div>}
                        </div>
                        {!isOverridden('thickness') && <p className="text-xs text-[#0A2F44] dark:text-[#66a4c2] mt-1">Recommended: {autoValues.recommendedThickness}mm</p>}
                      </div>

                      <div className="relative">
                        <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">Cover (mm)</label>
                        <div className="relative">
                          <input type="number" name="cover" value={formData.cover} onChange={handleChange} step="5" className={`w-full px-4 py-2 rounded-lg border ${isOverridden('cover') ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' : 'border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151]'} text-[#02090d] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2F44]`} />
                          {isOverridden('cover') && <div className="absolute right-3 top-1/2 transform -translate-y-1/2"><FiAlertTriangle className="text-yellow-500" /></div>}
                        </div>
                        {!isOverridden('cover') && <p className="text-xs text-[#0A2F44] dark:text-[#66a4c2] mt-1">Recommended: {autoValues.recommendedCover}mm</p>}
                      </div>
                    </div>
                  </div>

                  {/* Loads Card */}
                  <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-lg border border-[#e5e7eb] dark:border-[#374151] p-6">
                    <h2 className="text-lg font-semibold text-[#02090d] dark:text-white mb-4 flex items-center">
                      <FiWind className="mr-2 text-[#0A2F44] dark:text-[#66a4c2]" />
                      Loads (kN/m²)
                    </h2>
                    
                    <div className="mb-6">
                      <h3 className="text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-3">Permanent Actions</h3>
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div><label className="block text-xs text-[#6b7280] dark:text-[#9ca3af] mb-1">Finishes</label><input type="number" name="finishes" value={formData.finishes} onChange={handleChange} step="0.1" className="w-full px-3 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white" /></div>
                        <div><label className="block text-xs text-[#6b7280] dark:text-[#9ca3af] mb-1">Service allowance</label><input type="number" name="serviceAllowance" value={formData.serviceAllowance} onChange={handleChange} step="0.1" className="w-full px-3 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white" /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div><label className="block text-xs text-[#6b7280] dark:text-[#9ca3af] mb-1">Partition load</label><input type="number" name="partition" value={formData.partition} onChange={handleChange} step="0.1" className="w-full px-3 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white" /></div>
                        <div><label className="block text-xs text-[#6b7280] dark:text-[#9ca3af] mb-1">Partition mode</label>
                          <div className="flex space-x-4 mt-1">
                            <label className="flex items-center"><input type="radio" name="partitionMode" value="permanent" checked={formData.partitionMode === 'permanent'} onChange={handleChange} className="w-4 h-4 text-[#0A2F44]" /><span className="ml-1 text-sm text-[#02090d] dark:text-white">Permanent (Gk)</span></label>
                            <label className="flex items-center"><input type="radio" name="partitionMode" value="variable" checked={formData.partitionMode === 'variable'} onChange={handleChange} className="w-4 h-4 text-[#0A2F44]" /><span className="ml-1 text-sm text-[#02090d] dark:text-white">Variable (Qk)</span></label>
                          </div>
                        </div>
                      </div>
                      {formData.permanentLoads.map((load, index) => (
                        <div key={index} className="grid grid-cols-5 gap-2 mb-2">
                          <div className="col-span-2"><input type="text" placeholder="Load name" value={load.name} onChange={(e) => handlePermanentLoadChange(index, 'name', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white placeholder:text-[#9ca3af] dark:placeholder:text-[#6b7280]" /></div>
                          <div className="col-span-2"><input type="number" placeholder="Value (kN/m²)" value={load.value} onChange={(e) => handlePermanentLoadChange(index, 'value', e.target.value)} step="0.1" className="w-full px-3 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white" /></div>
                          <div><button onClick={() => removePermanentLoad(index)} className="w-full h-full flex items-center justify-center bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 rounded-lg cursor-pointer">×</button></div>
                        </div>
                      ))}
                      <button onClick={addPermanentLoad} className="mt-2 text-sm text-[#0A2F44] dark:text-[#66a4c2] hover:underline flex items-center cursor-pointer"><span className="text-lg mr-1">+</span> Add other permanent load</button>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-3">Variable Actions</h3>
                      <div className="mb-4 p-4 bg-[#e6f0f5] dark:bg-[#1e3a4a] rounded-lg border-l-4 border-[#0A2F44]">
                        <div className="flex items-center mb-3"><div className="w-6 h-6 rounded-full bg-[#0A2F44] text-white flex items-center justify-center text-xs font-bold mr-2">L</div><p className="text-xs font-medium text-[#0A2F44] dark:text-[#cce1eb]">Leading Variable Load</p></div>
                        <div className="grid grid-cols-2 gap-3">
                          <CustomDropdown name="leadingLoadKey" value={formData.leadingLoad.key} options={variableActionKeys} onChange={(e) => setFormData(prev => ({ ...prev, leadingLoad: { ...prev.leadingLoad, key: e.target.value } }))} />
                          <input type="number" placeholder="Value (kN/m²)" value={formData.leadingLoad.value} onChange={(e) => setFormData(prev => ({ ...prev, leadingLoad: { ...prev.leadingLoad, value: e.target.value } }))} step="0.1" className="w-full px-4 py-3 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white" />
                        </div>
                      </div>
                      <div className="mb-2">
                        <div className="flex items-center mb-3"><div className="w-6 h-6 rounded-full bg-[#9ca3af] text-white flex items-center justify-center text-xs font-bold mr-2">A</div><p className="text-xs font-medium text-[#6b7280]">Accompanying Variable Loads</p></div>
                        {formData.accompanyingLoads.map((load, index) => (
                          <div key={index} className="grid grid-cols-5 gap-2 mb-2">
                            <div className="col-span-2"><CustomDropdown name={`accKey-${index}`} value={load.key} options={variableActionKeys} onChange={(e) => handleAccompanyingLoadChange(index, 'key', e.target.value)} /></div>
                            <div className="col-span-2"><input type="number" placeholder="Value (kN/m²)" value={load.value} onChange={(e) => handleAccompanyingLoadChange(index, 'value', e.target.value)} step="0.1" className="w-full px-3 py-3 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white" /></div>
                            <div><button onClick={() => removeAccompanyingLoad(index)} className="w-full h-full flex items-center justify-center bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 rounded-lg cursor-pointer">×</button></div>
                          </div>
                        ))}
                        <button onClick={addAccompanyingLoad} className="mt-2 text-sm text-[#0A2F44] dark:text-[#66a4c2] hover:underline flex items-center cursor-pointer"><span className="text-lg mr-1">+</span> Add accompanying variable load</button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  {/* Materials Card */}
                  <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-lg border border-[#e5e7eb] dark:border-[#374151] p-6">
                    <h2 className="text-lg font-semibold text-[#02090d] dark:text-white mb-4 flex items-center">
                      <FiDroplet className="mr-2 text-[#0A2F44] dark:text-[#66a4c2]" />
                      Materials
                    </h2>
                    <div className="space-y-4">
                      <CustomDropdown label="Concrete Grade" name="concreteGrade" value={formData.concreteGrade} options={concreteGrades} onChange={handleChange} />
                      <CustomDropdown label="Reinforcement Grade" name="steelGrade" value={formData.steelGrade} options={[{ value: 'B500', label: 'B500 (fyk = 500 MPa)' }]} onChange={handleChange} />
                      <CustomDropdown label="Exposure Class" name="exposureClass" value={formData.exposureClass} options={exposureClasses} onChange={handleChange} />
                    </div>
                  </div>

                  {/* Optimisation Settings Card */}
                  <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-lg border border-[#e5e7eb] dark:border-[#374151] p-6">
                    <h2 className="text-lg font-semibold text-[#02090d] dark:text-white mb-4 flex items-center">
                      <FiPercent className="mr-2 text-[#0A2F44] dark:text-[#66a4c2]" />
                      Optimisation Settings
                    </h2>
                    <div className="space-y-4">
                      <CustomDropdown name="numThicknesses" value={formData.numThicknesses} options={[{ value: '1', label: '1 combination' }, { value: '2', label: '2 combinations' }, { value: '3', label: '3 combinations' }]} onChange={handleChange} />
                      <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm text-[#374151] dark:text-[#d1d5db] mb-2">Thickness 1 (mm)</label><input type="number" name="thickness1" value={formData.thickness1} onChange={handleChange} step="5" className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white" /></div><div><label className="block text-sm text-[#374151] dark:text-[#d1d5db] mb-2">Bar dia 1 (mm)</label><input type="number" name="barDiameter1" value={formData.barDiameter1} onChange={handleChange} step="2" className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white" /></div></div>
                      <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm text-[#374151] dark:text-[#d1d5db] mb-2">Thickness 2 (mm)</label><input type="number" name="thickness2" value={formData.thickness2} onChange={handleChange} step="5" className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white" /></div><div><label className="block text-sm text-[#374151] dark:text-[#d1d5db] mb-2">Bar dia 2 (mm)</label><input type="number" name="barDiameter2" value={formData.barDiameter2} onChange={handleChange} step="2" className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white" /></div></div>
                      <div className="pt-4 border-t border-[#e5e7eb] dark:border-[#374151]">
                        <h3 className="text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">Optimisation Weights</h3>
                        <div className="space-y-3">
                          <div><label className="block text-xs text-[#6b7280] dark:text-[#9ca3af] mb-1">Cost Weight (%)</label><input type="range" name="costWeight" value={formData.costWeight} onChange={handleChange} min="0" max="100" className="w-full accent-[#0A2F44]" /><div className="text-xs text-right text-[#6b7280] dark:text-[#9ca3af]">{formData.costWeight}%</div></div>
                          <div><label className="block text-xs text-[#6b7280] dark:text-[#9ca3af] mb-1">Carbon Weight (%)</label><input type="range" name="carbonWeight" value={formData.carbonWeight} onChange={handleChange} min="0" max="100" className="w-full accent-[#0A2F44]" /><div className="text-xs text-right text-[#6b7280] dark:text-[#9ca3af]">{formData.carbonWeight}%</div></div>
                          <div><label className="block text-xs text-[#6b7280] dark:text-[#9ca3af] mb-1">Material Weight (%)</label><input type="range" name="materialWeight" value={formData.materialWeight} onChange={handleChange} min="0" max="100" className="w-full accent-[#0A2F44]" /><div className="text-xs text-right text-[#6b7280] dark:text-[#9ca3af]">{formData.materialWeight}%</div></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Design Constraints Card */}
                  <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-lg border border-[#e5e7eb] dark:border-[#374151] p-6">
                    <h2 className="text-lg font-semibold text-[#02090d] dark:text-white mb-4 flex items-center">
                      <FiClock className="mr-2 text-[#0A2F44] dark:text-[#66a4c2]" />
                      Design Constraints
                    </h2>
                    <div className="space-y-4">
                      <div><label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">Crack Width (mm)</label><input type="number" name="crackWidthLimit" value={formData.crackWidthLimit} onChange={handleChange} step="0.1" className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white" /></div>
                      <div><label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">Fire Rating (min)</label><CustomDropdown name="fireRating" value={formData.fireRating} options={[{ value: '60', label: '60 min' }, { value: '90', label: '90 min' }, { value: '120', label: '120 min' }]} onChange={handleChange} /></div>
                    </div>
                  </div>

                  {/* Cost Details Card */}
                  <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-lg border border-[#e5e7eb] dark:border-[#374151] p-6">
                    <h2 className="text-lg font-semibold text-[#02090d] dark:text-white mb-4 flex items-center">
                      <FiCircle className="mr-2 text-[#0A2F44] dark:text-[#66a4c2]" />
                      Cost Details
                    </h2>
                    <div className="space-y-3">
                      <div className="flex items-center"><input type="checkbox" checked={formData.useAIDatabase} onChange={(e) => setFormData(prev => ({ ...prev, useAIDatabase: e.target.checked }))} className="w-4 h-4 text-[#0A2F44] mr-2" /><span className="text-sm text-[#374151] dark:text-[#d1d5db]">Use StructAI Database rates</span></div>
                      <div><label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-1">Region (e.g. UK)</label><input type="text" name="region" value={formData.region} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white" /></div>
                      <div className="grid grid-cols-2 gap-3"><div><label className="block text-xs text-[#6b7280] dark:text-[#9ca3af] mb-1">Concrete rate (GBP) [170]</label><input type="number" name="concreteRate" value={formData.concreteRate} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white" /></div><div><label className="block text-xs text-[#6b7280] dark:text-[#9ca3af] mb-1">Steel rate (GBP) [1300]</label><input type="number" name="steelRate" value={formData.steelRate} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white" /></div></div>
                      <div><label className="block text-xs text-[#6b7280] dark:text-[#9ca3af] mb-1">Formwork rate (GBP) [50]</label><input type="number" name="formworkRate" value={formData.formworkRate} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white" /></div>
                      <div className="flex items-center space-x-2"><span className="text-sm text-[#374151] dark:text-[#d1d5db]">Use AI recommendation?</span><label className="flex items-center"><input type="radio" name="useAIRecommendation" value="y" checked={formData.useAIRecommendation === 'y'} onChange={handleChange} className="w-4 h-4 text-[#0A2F44] mr-1" /><span className="text-sm text-[#374151] dark:text-[#d1d5db]">Yes</span></label><label className="flex items-center"><input type="radio" name="useAIRecommendation" value="n" checked={formData.useAIRecommendation === 'n'} onChange={handleChange} className="w-4 h-4 text-[#0A2F44] mr-1" /><span className="text-sm text-[#374151] dark:text-[#d1d5db]">No</span></label></div>
                    </div>
                  </div>

                  {/* Bar Selection Card */}
                  <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-lg border border-[#e5e7eb] dark:border-[#374151] p-6">
                    <h2 className="text-lg font-semibold text-[#02090d] dark:text-white mb-4 flex items-center">
                      <FiCircle className="mr-2 text-[#0A2F44] dark:text-[#66a4c2]" />
                      Bar Selection
                    </h2>
                    <div className="space-y-4">
                      <div className="relative"><label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">Main Bar Diameter (mm)</label>
                        <CustomDropdown name="mainBarDiameter" value={formData.mainBarDiameter} options={formData.candidateDiameters.map(d => ({ value: d, label: `${d} mm` }))} onChange={handleChange} customClass={isOverridden('mainBarDiameter') ? 'border-yellow-500' : ''} />
                        {!isOverridden('mainBarDiameter') && <p className="text-xs text-[#0A2F44] dark:text-[#66a4c2] mt-1">Recommended: {autoValues.recommendedBarDiameter}mm</p>}
                      </div>
                      <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">Min Spacing (mm)</label><input type="number" name="minSpacing" value={formData.minSpacing} onChange={handleChange} step="10" className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white" /></div><div><label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">Max Spacing (mm)</label><input type="number" name="maxSpacing" value={formData.maxSpacing} onChange={handleChange} step="10" className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white" /></div></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 flex justify-end space-x-4">
                <button onClick={handleValidate} disabled={isValidating} className="px-6 py-3 border border-[#e5e7eb] dark:border-[#374151] rounded-lg text-[#374151] dark:text-[#d1d5db] hover:bg-[#f3f4f6] dark:hover:bg-[#374151] transition-colors disabled:opacity-50 cursor-pointer">{isValidating ? 'Validating...' : 'Validate'}</button>
                <button onClick={handleOptimise} disabled={isOptimising} className="px-6 py-3 bg-[#0A2F44] text-white rounded-lg hover:bg-[#082636] transition-colors disabled:opacity-50 cursor-pointer">{isOptimising ? 'Optimising...' : 'Run Optimisation'}</button>
              </div>
            </>
          )}

          {!showResults && !showReport && !showAIRecommendation && !showTradeoff && activeComponent !== 'slab' && (
            <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-lg p-8 text-center">
              <div className="text-5xl text-[#0A2F44] mx-auto mb-4">{activeComponent === 'beam' ? <FiBarChart2 className="mx-auto" /> : activeComponent === 'column' ? <FiColumns className="mx-auto" /> : activeComponent === 'foundation' ? <FiSquare className="mx-auto" /> : <FiTriangle className="mx-auto" />}</div>
              <h3 className="text-xl font-semibold text-[#02090d] dark:text-white mb-2">{activeComponent.charAt(0).toUpperCase() + activeComponent.slice(1)} Input Form</h3>
              <p className="text-[#6b7280] dark:text-[#9ca3af]">Coming soon in Phase 3</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StructuralInput;