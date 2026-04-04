import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  FiArrowLeft, FiSun, FiMoon, FiMenu, FiGrid, FiBarChart2, 
  FiColumns, FiLayers, FiTriangle, FiSquare, FiCircle,
  FiDroplet, FiWind, FiPercent, FiClock, FiInfo, FiAlertTriangle,
  FiChevronDown, FiSearch, FiCheck, FiHome, FiBriefcase, FiUsers,
  FiDownload, FiPrinter, FiEye, FiPlus, FiX 
} from 'react-icons/fi';
import { useTheme } from '../contexts/ThemeContext';
import SlabResultsComparison from '../components/SlabResultsComparison';
import SlabDetailedReport from '../components/SlabDetailedReport';
import AIRecommendation from '../components/AIRecommendation';
import TradeoffAnalysis from '../components/TradeoffAnalysis';

const StructuralInput = () => {
  const { workspaceId, projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
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
  const [showSpanWarning, setShowSpanWarning] = useState(false);
  const [isValidated, setIsValidated] = useState(false);
  const isNewDesignMode = location.pathname.includes('/new-design');
  
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
    spanCount: '3', 
    customSpanCount: '', 
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
    useAIDatabase: true,
    region: 'uk',
    concreteRate: '170',
    steelRate: '1300',
    formworkRate: '50',
    otherCosts: [],
    useAIRecommendation: 'y',
    // New cost options
    costSource: 'database', // 'database', 'company', 'realtime'
    companyConcreteRate: '',
    companySteelRate: '',
    companyFormworkRate: '',
    realtimeConcreteRate: '',
    realtimeSteelRate: '',
    realtimeFormworkRate: '',
  });

  // Check span and show warning for 2-way slab transition
  useEffect(() => {
    const span = parseFloat(formData.spanX);
    if (span > 4.2 && formData.slabType === 'one-way') {
      setShowSpanWarning(true);
    } else {
      setShowSpanWarning(false);
    }
  }, [formData.spanX, formData.slabType]);

  // Auto-update building use live load
  const getLiveLoadFromBuildingUse = () => {
    const buildingUseMap = {
      residential: 2.0,
      hotel: 2.0,
      office: 3.0,
      education: 3.0,
      healthcare: 4.0,
      retail: 4.0,
    };
    return buildingUseMap[formData.buildingUse] || 2.0;
  };

  // Auto-update leading load based on building use
  useEffect(() => {
    const liveLoad = getLiveLoadFromBuildingUse();
    setFormData(prev => ({
      ...prev,
      leadingLoad: { ...prev.leadingLoad, value: liveLoad.toString() }
    }));
  }, [formData.buildingUse]);

  // Auto-bar selection based on building use and span
  const getAutoBarPreset = (buildingUse, spanM) => {
    const span = parseFloat(spanM);
    
    if (buildingUse === 'residential' || buildingUse === 'hotel') {
      if (span <= 4.0) return { thickness: 125, mainBar: 10, spacing: 200 };
      if (span <= 5.0) return { thickness: 150, mainBar: 10, spacing: 175 };
      if (span <= 6.0) return { thickness: 175, mainBar: 12, spacing: 175 };
      if (span <= 7.0) return { thickness: 200, mainBar: 12, spacing: 150 };
      return { thickness: 0, mainBar: 0, spacing: 0 };
    }
    
    if (buildingUse === 'office' || buildingUse === 'education') {
      if (span <= 4.0) return { thickness: 150, mainBar: 10, spacing: 175 };
      if (span <= 5.0) return { thickness: 175, mainBar: 12, spacing: 200 };
      if (span <= 6.0) return { thickness: 200, mainBar: 12, spacing: 175 };
      if (span <= 7.0) return { thickness: 225, mainBar: 12, spacing: 150 };
      return { thickness: 0, mainBar: 0, spacing: 0 };
    }
    
    if (buildingUse === 'healthcare' || buildingUse === 'retail') {
      if (span <= 4.0) return { thickness: 150, mainBar: 12, spacing: 200 };
      if (span <= 5.0) return { thickness: 175, mainBar: 12, spacing: 175 };
      if (span <= 6.0) return { thickness: 200, mainBar: 12, spacing: 150 };
      if (span <= 7.0) return { thickness: 225, mainBar: 16, spacing: 175 };
      return { thickness: 0, mainBar: 0, spacing: 0 };
    }
    
    return { thickness: 0, mainBar: 0, spacing: 0 };
  };

  // Building use options
  const buildingUseOptions = [
    { value: 'residential', label: 'Residential', icon: FiHome, description: 'Dwellings, apartments, houses (2.0 kN/m²)' },
    { value: 'hotel', label: 'Hotel', icon: FiHome, description: 'Hotels, guest houses (2.0 kN/m²)' },
    { value: 'office', label: 'Office', icon: FiBriefcase, description: 'Office buildings (3.0 kN/m²)' },
    { value: 'education', label: 'Education', icon: FiUsers, description: 'Schools, universities (3.0 kN/m²)' },
    { value: 'healthcare', label: 'Healthcare', icon: FiUsers, description: 'Hospitals, clinics (4.0 kN/m²)' },
    { value: 'retail', label: 'Retail', icon: FiBriefcase, description: 'Shops, stores (4.0 kN/m²)' },
  ];

  // Variable action keys - LEADING LOAD REMOVED from accompanying options
  const variableActionKeys = [
    { value: 'wk', label: 'wk - Wind load', description: 'Wind load' },
    { value: 'sk', label: 'sk - Snow load', description: 'Snow load' },
    { value: 'tk', label: 'tk - Traffic load', description: 'Traffic load' },
  ];

  const allVariableActionKeys = [
  { value: 'qk', label: 'qk - Imposed load', description: 'Imposed load' },
  { value: 'wk', label: 'wk - Wind load', description: 'Wind load' },
  { value: 'sk', label: 'sk - Snow load', description: 'Snow load' },
  { value: 'tk', label: 'tk - Traffic load', description: 'Traffic load' },
];

  // Number of spans options with "Others"
  const spanCountOptions = [
    { value: '2', label: '2 spans' },
    { value: '3', label: '3 spans' },
    { value: '4', label: '4 spans' },
    { value: '5', label: '5 spans' },
    { value: 'others', label: 'Others (Custom)', description: 'Specify custom number of spans' },
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
    }
  }, [formData.thickness, activeComponent]);

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
    const thicknesses = [parseFloat(formData.thickness1), parseFloat(formData.thickness2)];
    const barDiameters = [parseFloat(formData.barDiameter1), parseFloat(formData.barDiameter2)];
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
          const selfWeight = 25 * thickness / 1000;
          const totalGk = selfWeight + gkTotal;
          
          const wEd = 1.35 * totalGk + 1.5 * qkLead + reducedAcc;
          const mEd = wEd * Math.pow(span, 2) / 8;
          
          const cover = parseFloat(formData.cover) || 25;
          const d = thickness - cover - barDiameter / 2;
          if (d <= 0) continue;
          
          const z = 0.9 * d;
          const fyd = 434.78;
          
          let asReq = mEd * 1000000 / (fyd * z);
          if (asReq < 0) asReq = 0;
          
          const fctm = 2.9;
          const asMin = Math.max(0.26 * fctm / 500 * 1000 * d, 0.0013 * 1000 * d);
          asReq = Math.max(asReq, asMin);
          
          const barArea = Math.PI * Math.pow(barDiameter, 2) / 4;
          const asProv = barArea * 1000 / spacing;
          
          const utilisation = asReq / asProv;
          
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
          
          // Get rates based on cost source
          let concreteRate, steelRate, formworkRate;
          if (formData.costSource === 'company') {
            concreteRate = parseFloat(formData.companyConcreteRate) || 170;
            steelRate = parseFloat(formData.companySteelRate) || 1300;
            formworkRate = parseFloat(formData.companyFormworkRate) || 50;
          } else if (formData.costSource === 'realtime') {
            concreteRate = parseFloat(formData.realtimeConcreteRate) || 170;
            steelRate = parseFloat(formData.realtimeSteelRate) || 1300;
            formworkRate = parseFloat(formData.realtimeFormworkRate) || 50;
          } else {
            concreteRate = parseFloat(formData.concreteRate) || 170;
            steelRate = parseFloat(formData.steelRate) || 1300;
            formworkRate = parseFloat(formData.formworkRate) || 50;
          }
          
          const concreteVol = thickness / 1000;
          const concreteCost = concreteVol * concreteRate;
          const steelWeight = asProv * 1e-6 * 7850;
          const steelCost = steelWeight * steelRate / 1000;
          const formworkCost = formworkRate;
            let otherCostsTotal = 0;
        if (formData.otherCosts && formData.otherCosts.length > 0) {
          formData.otherCosts.forEach(cost => {
            let costValue = parseFloat(cost.rate) || 0;
            if (cost.unit === 'm²') {
              otherCostsTotal += costValue;
            } else if (cost.unit === 'm³') {
              otherCostsTotal += costValue * (thickness / 1000);
            } else if (cost.unit === 'tonne') {
              otherCostsTotal += costValue * steelWeight;
            } else {
              otherCostsTotal += costValue / slabArea;
            }
          });
        }
        
        const totalCost = concreteCost + steelCost + formworkCost + otherCostsTotal;
          
          const concreteCarbon = concreteVol * 240 * slabArea;
          const steelCarbon = steelWeight * 1.5 * slabArea;
          const totalCarbon = concreteCarbon + steelCarbon;
          
          const costW = parseFloat(formData.costWeight) / 100;
          const carbonW = parseFloat(formData.carbonWeight) / 100;
          const materialW = parseFloat(formData.materialWeight) / 100;
          
          const normCost = totalCost / 30000;
          const normCarbon = totalCarbon / 15000;
          const normMaterial = thickness / 300;
          const score = (costW * normCost) + (carbonW * normCarbon) + (materialW * normMaterial);
          
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

    const isNewDesignMode = location.pathname.includes('/new-design');
    
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
    return false;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (['thickness', 'cover'].includes(name)) {
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
    
    // Handle span count "others" logic
    if (name === 'spanCount') {
      if (value === 'others') {
        setFormData(prev => ({ ...prev, spanCount: value, continuousSpans: [] }));
      } else {
        const num = parseInt(value);
        setFormData(prev => ({ 
          ...prev, 
          spanCount: value, 
          continuousSpans: Array(num).fill('5.0') 
        }));
      }
    } else if (name === 'customSpanCount') {
      const num = parseInt(value);
      if (num > 0 && num <= 20) {
        setFormData(prev => ({ 
          ...prev, 
          customSpanCount: value, 
          continuousSpans: Array(num).fill('5.0') 
        }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
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

 const handleBack = () => {
    if (isNewDesignMode) {
      navigate('/new-design');
    } else {
      navigate(-1);
    }
  };

 
const handleOptimise = () => {
  setIsOptimising(true);
  
  setTimeout(() => {
    const options = generateOptions();
    
    if (options.length > 0) {
      setGeneratedOptions(options);
      setStoredResults(prev => ({
        ...prev,
        [activeComponent]: options
      }));
      setIsOptimising(false);
      setShowResults(true);
      setShowReport(false);
      setShowAIRecommendation(false);
      setShowTradeoff(false);
    } else {
      setIsOptimising(false);
      alert("No valid design options found. Please adjust your inputs.");
    }
  }, 2000);
};

// Reset validation when inputs change
useEffect(() => {
  setIsValidated(false);
}, [formData]);

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
    
    const savedResults = storedResults[componentId];
    if (savedResults && savedResults.length > 0) {
      setGeneratedOptions(savedResults);
      setShowResults(true);
    } else {
      setGeneratedOptions([]);
      setShowResults(false);
    }
    
    setShowReport(false);
    setShowAIRecommendation(false);
    setShowTradeoff(false);
    setSelectedOptionId(null);
  };

  const handleSwitchToTwoWay = () => {
    setFormData(prev => ({ ...prev, slabType: 'two-way' }));
    setShowSpanWarning(false);
  };

  // Validation function
const handleValidate = () => {
  setIsValidating(true);
  const errors = [];
  const warnings = [];

  // 1. Check Span X
  const spanX = parseFloat(formData.spanX);
  if (isNaN(spanX) || spanX <= 0) {
    errors.push("Span X must be a positive number");
  } else if (spanX > 12) {
    warnings.push(`Span X (${spanX}m) exceeds typical concrete slab limits (max 12m). Consider steel design.`);
  } else if (spanX < 1.5) {
    warnings.push(`Span X (${spanX}m) is very short. Minimum recommended is 1.5m.`);
  }

  // 2. Check Span Y (if two-way slab)
  if (formData.slabType === 'two-way') {
    const spanY = parseFloat(formData.spanY);
    if (isNaN(spanY) || spanY <= 0) {
      errors.push("Span Y must be a positive number");
    }
  }

  // 3. Check Thickness
  const thickness = parseFloat(formData.thickness);
  if (isNaN(thickness) || thickness <= 0) {
    errors.push("Thickness must be a positive number");
  } else if (thickness < 100) {
    errors.push(`Thickness (${thickness}mm) is below minimum recommended (100mm)`);
  } else if (thickness > 500) {
    warnings.push(`Thickness (${thickness}mm) is very heavy. Consider alternative structural systems.`);
  }

  // 4. Check Cover
  const cover = parseFloat(formData.cover);
  if (isNaN(cover) || cover <= 0) {
    errors.push("Cover must be a positive number");
  } else if (cover < 15) {
    errors.push(`Cover (${cover}mm) is below minimum requirement (15mm)`);
  } else if (cover > 75) {
    warnings.push(`Cover (${cover}mm) is high. Consider if this is necessary for durability.`);
  }

  // 5. Check Loads
  const finishes = parseFloat(formData.finishes) || 0;
  const serviceAllowance = parseFloat(formData.serviceAllowance) || 0;
  const partition = parseFloat(formData.partition) || 0;
  
  if (finishes < 0 || serviceAllowance < 0 || partition < 0) {
    errors.push("Load values cannot be negative");
  }

  // 6. Check Permanent Loads
  formData.permanentLoads.forEach((load, idx) => {
    const value = parseFloat(load.value);
    if (load.name.trim() === "") {
      warnings.push(`Permanent load ${idx + 1} has no name`);
    }
    if (isNaN(value)) {
      warnings.push(`Permanent load "${load.name || idx + 1}" has no value`);
    } else if (value < 0) {
      errors.push(`Permanent load "${load.name}" cannot be negative`);
    }
  });

  // 7. Check Leading Variable Load
  const leadingValue = parseFloat(formData.leadingLoad.value);
  if (isNaN(leadingValue) || leadingValue < 0) {
    errors.push("Leading variable load must be a non-negative number");
  } else if (leadingValue > 20) {
    warnings.push(`Leading variable load (${leadingValue} kN/m²) is very high. Verify usage category.`);
  }

  // 8. Check Accompanying Loads
  formData.accompanyingLoads.forEach((load, idx) => {
    const value = parseFloat(load.value);
    if (isNaN(value)) {
      warnings.push(`Accompanying load ${idx + 1} has no value`);
    } else if (value < 0) {
      errors.push(`Accompanying load "${load.key}" cannot be negative`);
    } else if (value > 15) {
      warnings.push(`Accompanying load "${load.key}" (${value} kN/m²) is unusually high`);
    }
  });

  // 9. Check Material Properties
  if (!formData.concreteGrade) {
    errors.push("Concrete grade must be selected");
  }
  if (!formData.steelGrade) {
    errors.push("Steel grade must be selected");
  }
  if (!formData.exposureClass) {
    warnings.push("Exposure class not selected. Using default (XC3).");
  }

  // 10. Check Fire Rating
  const fireRating = parseFloat(formData.fireRating);
  if (isNaN(fireRating) || fireRating < 30) {
    warnings.push("Fire rating less than 30 minutes may not meet building regulations");
  }

  // 11. Check Crack Width
  const crackWidth = parseFloat(formData.crackWidthLimit);
  if (isNaN(crackWidth) || crackWidth < 0.1) {
    warnings.push("Crack width limit is very low (0.1mm min). Consider if this is necessary.");
  } else if (crackWidth > 0.4) {
    warnings.push(`Crack width (${crackWidth}mm) exceeds typical limit (0.3-0.4mm)`);
  }

  // 12. Check Thickness Options
  const thickness1 = parseFloat(formData.thickness1);
  const thickness2 = parseFloat(formData.thickness2);
  if (isNaN(thickness1) || thickness1 <= 0) {
    errors.push("Thickness 1 must be a positive number");
  }
  if (isNaN(thickness2) || thickness2 <= 0) {
    errors.push("Thickness 2 must be a positive number");
  }
  if (thickness1 === thickness2) {
    warnings.push("Thickness 1 and Thickness 2 are the same. Consider different values for comparison.");
  }

  // 13. Check Bar Diameters
  const barDia1 = parseFloat(formData.barDiameter1);
  const barDia2 = parseFloat(formData.barDiameter2);
  if (isNaN(barDia1) || barDia1 <= 0) {
    errors.push("Bar diameter 1 must be a positive number");
  }
  if (isNaN(barDia2) || barDia2 <= 0) {
    errors.push("Bar diameter 2 must be a positive number");
  }
  if (![8, 10, 12, 16, 20, 25, 32].includes(barDia1)) {
    warnings.push(`Bar diameter ${barDia1}mm is non-standard. Available: 8, 10, 12, 16, 20, 25, 32mm`);
  }
  if (![8, 10, 12, 16, 20, 25, 32].includes(barDia2)) {
    warnings.push(`Bar diameter ${barDia2}mm is non-standard. Available: 8, 10, 12, 16, 20, 25, 32mm`);
  }

  // 14. Check Span/Thickness Ratio (Simple rule of thumb)
  if (!isNaN(spanX) && !isNaN(thickness) && thickness > 0) {
    const ratio = spanX * 1000 / thickness;
    if (ratio > 35) {
      warnings.push(`Span/Thickness ratio (${ratio.toFixed(1)}) > 35. Slab may be too thin. Recommended L/h ≤ 30-35 for simply supported slabs.`);
    } else if (ratio < 15) {
      warnings.push(`Span/Thickness ratio (${ratio.toFixed(1)}) < 15. Slab may be over-designed. Consider reducing thickness.`);
    }
  }

  // 15. Check if continuous spans are valid
  if (formData.supportCondition === 'continuous') {
    formData.continuousSpans.forEach((span, idx) => {
      const s = parseFloat(span);
      if (isNaN(s) || s <= 0) {
        errors.push(`Span ${idx + 1} must be a positive number`);
      }
    });
  }

  // Show results
 setIsValidating(false);
  
  if (errors.length > 0) {
    alert(`❌ Validation Failed:\n\n${errors.join('\n')}\n\nPlease fix these issues before running optimisation.`);
    setIsValidated(false);
    return false;
  } else if (warnings.length > 0) {
    const confirmed = window.confirm(
      `⚠️ Validation Warnings:\n\n${warnings.join('\n')}\n\nDo you want to continue with optimisation?`
    );
    if (confirmed) {
      setIsValidated(true);
      return true;
    } else {
      setIsValidated(false);
      return false;
    }
  } else {
    alert(`✅ Validation Passed!\n\nAll inputs are valid. You can now run optimisation.`);
    setIsValidated(true);
    return true;
  }
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

      {/* Span Warning Modal for 2-way slab transition */}
      {showSpanWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center space-x-3 text-blue-600 mb-4">
              <FiInfo className="text-3xl" />
              <h3 className="text-lg font-semibold text-[#02090d] dark:text-white">Span exceeds 4.2m</h3>
            </div>
            <p className="text-[#4b5563] dark:text-[#9ca3af] mb-6">
              For spans greater than 4.2m, a two-way slab is recommended for better structural efficiency.
              Would you like to switch to two-way slab?
            </p>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setShowSpanWarning(false)} className="px-4 py-2 border border-[#e5e7eb] dark:border-[#374151] rounded-lg text-[#6b7280] dark:text-[#9ca3af] hover:bg-[#f3f4f6] dark:hover:bg-[#374151] transition-colors cursor-pointer">Keep One-way</button>
              <button onClick={handleSwitchToTwoWay} className="px-4 py-2 bg-[#0A2F44] text-white rounded-lg hover:bg-[#082636] transition-colors cursor-pointer">Switch to Two-way</button>
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
              <button onClick={handleBack} className="flex items-center space-x-2 text-[#6b7280] dark:text-[#9ca3af] hover:text-[#0A2F44] dark:hover:text-[#66a4c2] transition-colors cursor-pointer">
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
                     span={parseFloat(formData.spanX)}
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
                      This determines the live load value automatically
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

                      {/* Support Condition */}
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
                              <span className="ml-3 text-sm font-medium text-[#02090d] dark:text-white">Continous</span>
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
                              name="spanCount"
                              value={formData.spanCount}
                              options={spanCountOptions}
                              onChange={handleChange}
                            />
                          </div>

                          {formData.spanCount === 'others' && (
                            <div>
                              <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                                Custom Number of Spans
                              </label>
                              <input
                                type="number"
                                name="customSpanCount"
                                value={formData.customSpanCount}
                                onChange={handleChange}
                                min="2"
                                max="20"
                                placeholder="Enter number of spans"
                                className="w-full px-4 py-3 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2F44]"
                              />
                            </div>
                          )}

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
                                Left End Condition
                              </label>
                              <CustomDropdown
                                label=""
                                name="endFixityLeft"
                                value={formData.endFixityLeft}
                                options={[
                                  { value: 'pinned', label: 'Simply Supported', description: 'Simple support - no moment transfer' },
                                  { value: 'fixed', label: 'Fixed', description: 'Fully restrained - moment transferred' },
                                ]}
                                onChange={handleChange}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">
                                Right End Condition 
                              </label>
                              <CustomDropdown
                                label=""
                                name="endFixityRight"
                                value={formData.endFixityRight}
                                options={[
                                  { value: 'pinned', label: 'Simply Supported', description: 'Simple support - no moment transfer' },
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

                  {/* Cost Details Card */}
<div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-lg border border-[#e5e7eb] dark:border-[#374151] p-6">
  <h2 className="text-lg font-semibold text-[#02090d] dark:text-white mb-4 flex items-center">
    <FiCircle className="mr-2 text-[#0A2F44] dark:text-[#66a4c2]" />
    Cost Details
  </h2>
  
  <div className="space-y-4">
    {/* Cost Source - Keep existing */}
    <div>
      <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-2">Cost Source</label>
      <div className="grid grid-cols-3 gap-2">
        <button type="button" onClick={() => setFormData(prev => ({ ...prev, costSource: 'database' }))} className={`px-3 py-2 rounded-lg text-sm transition-all cursor-pointer ${formData.costSource === 'database' ? 'bg-[#0A2F44] text-white' : 'bg-[#f3f4f6] dark:bg-[#374151] text-[#6b7280] hover:bg-[#e5e7eb]'}`}>StructAI DB</button>
        <button type="button" onClick={() => setFormData(prev => ({ ...prev, costSource: 'company' }))} className={`px-3 py-2 rounded-lg text-sm transition-all cursor-pointer ${formData.costSource === 'company' ? 'bg-[#0A2F44] text-white' : 'bg-[#f3f4f6] dark:bg-[#374151] text-[#6b7280] hover:bg-[#e5e7eb]'}`}>Company Rates</button>
        <button type="button" onClick={() => setFormData(prev => ({ ...prev, costSource: 'realtime' }))} className={`px-3 py-2 rounded-lg text-sm transition-all cursor-pointer ${formData.costSource === 'realtime' ? 'bg-[#0A2F44] text-white' : 'bg-[#f3f4f6] dark:bg-[#374151] text-[#6b7280] hover:bg-[#e5e7eb]'}`}>Real-time</button>
      </div>
    </div>

    {/* Region field - Keep existing */}
    {formData.costSource === 'database' && (
      <div><label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db] mb-1">Region (e.g. UK)</label><input type="text" name="region" value={formData.region} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white" /></div>
    )}

    {/* Standard Rates - Keep existing */}
    {(formData.costSource === 'database' || formData.costSource === 'company' || formData.costSource === 'realtime') && (
      <>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-xs text-[#6b7280] dark:text-[#9ca3af] mb-1">Concrete rate (GBP)</label><input type="number" name="concreteRate" value={formData.concreteRate} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white" /></div>
          <div><label className="block text-xs text-[#6b7280] dark:text-[#9ca3af] mb-1">Steel rate (GBP)</label><input type="number" name="steelRate" value={formData.steelRate} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white" /></div>
        </div>
        <div><label className="block text-xs text-[#6b7280] dark:text-[#9ca3af] mb-1">Formwork rate (GBP)</label><input type="number" name="formworkRate" value={formData.formworkRate} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white" /></div>
      </>
    )}

    {/* NEW: Other Cost Elements Section */}
    <div className="border-t border-[#e5e7eb] dark:border-[#374151] pt-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <label className="block text-sm font-medium text-[#374151] dark:text-[#d1d5db]">Other Cost Elements</label>
        <button
          type="button"
          onClick={() => {
            setFormData(prev => ({
              ...prev,
              otherCosts: [...(prev.otherCosts || []), { name: '', rate: '', unit: 'm²' }]
            }));
          }}
          className="text-sm text-[#0A2F44] dark:text-[#66a4c2] hover:underline flex items-center cursor-pointer"
        >
          <FiPlus className="mr-1" /> Add Cost
        </button>
      </div>

      {/* List of other costs */}
      {(formData.otherCosts || []).map((cost, index) => (
        <div key={index} className="grid grid-cols-12 gap-2 mb-3 items-center">
          <div className="col-span-5">
            <input
              type="text"
              placeholder="Cost name (e.g., Insulation)"
              value={cost.name}
              onChange={(e) => {
                const updated = [...(formData.otherCosts || [])];
                updated[index].name = e.target.value;
                setFormData(prev => ({ ...prev, otherCosts: updated }));
              }}
              className="w-full px-3 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white text-sm"
            />
          </div>
          <div className="col-span-4">
            <input
              type="number"
              placeholder="Rate (GBP)"
              value={cost.rate}
              onChange={(e) => {
                const updated = [...(formData.otherCosts || [])];
                updated[index].rate = e.target.value;
                setFormData(prev => ({ ...prev, otherCosts: updated }));
              }}
              className="w-full px-3 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white text-sm"
            />
          </div>
          <div className="col-span-2">
            <select
              value={cost.unit}
              onChange={(e) => {
                const updated = [...(formData.otherCosts || [])];
                updated[index].unit = e.target.value;
                setFormData(prev => ({ ...prev, otherCosts: updated }));
              }}
              className="w-full px-2 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-[#02090d] dark:text-white text-sm"
            >
              <option value="m²">per m²</option>
              <option value="m³">per m³</option>
              <option value="item">per item</option>
              <option value="tonne">per tonne</option>
            </select>
          </div>
          <div className="col-span-1">
            <button
              type="button"
              onClick={() => {
                const updated = [...(formData.otherCosts || [])];
                updated.splice(index, 1);
                setFormData(prev => ({ ...prev, otherCosts: updated }));
              }}
              className="w-full h-full flex items-center justify-center bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 rounded-lg py-2 cursor-pointer"
            >
              <FiX />
            </button>
          </div>
        </div>
      ))}

      {/* Example hint */}
      {(!formData.otherCosts || formData.otherCosts.length === 0) && (
        <p className="text-xs text-[#9ca3af] dark:text-[#6b7280] mt-2">
          Example: Insulation, waterproofing, finishes, etc.
        </p>
      )}
    </div>

    {/* AI Recommendation - Keep existing */}
    <div className="flex items-center space-x-2 mt-2">
      <span className="text-sm text-[#374151] dark:text-[#d1d5db]">Use AI recommendation?</span>
      <label className="flex items-center"><input type="radio" name="useAIRecommendation" value="y" checked={formData.useAIRecommendation === 'y'} onChange={handleChange} className="w-4 h-4 text-[#0A2F44] mr-1" /><span className="text-sm text-[#374151] dark:text-[#d1d5db]">Yes</span></label>
      <label className="flex items-center"><input type="radio" name="useAIRecommendation" value="n" checked={formData.useAIRecommendation === 'n'} onChange={handleChange} className="w-4 h-4 text-[#0A2F44] mr-1" /><span className="text-sm text-[#374151] dark:text-[#d1d5db]">No</span></label>
    </div>
  </div>
</div>
                </div>
              </div>

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
    disabled={isOptimising || !isValidated} 
    className={`px-6 py-3 rounded-lg transition-colors cursor-pointer ${
      isOptimising || !isValidated
        ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
        : 'bg-[#0A2F44] text-white hover:bg-[#082636]'
    }`}
  >
    {isOptimising ? 'Optimising...' : 'Run Optimisation'}
  </button>
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