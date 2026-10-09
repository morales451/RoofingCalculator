import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Calculator, CheckCircle, Copy, FileText, AlertTriangle, Layers, Ruler, Mail, Info, Hammer, Package, Droplet, Grid, Save, Upload, Download, ChevronDown, ChevronUp, User, DollarSign, Calendar, Eye, EyeOff, FileDown, Zap, Plus, Trash2, Printer, X, MoreHorizontal } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import EnergySavingsEstimator from './EnergySavingsEstimator.jsx';
import { CLIMATE_DATA, DEFAULT_STATE } from './climateData.js';

export default function App() {
  // --- STATE ---
  const [inputs, setInputs] = useState({
    projectName: '',
    coatingSystem: 'Silicone', // 'Silicone' or 'Acrylic'
    acrylicSystemType: 'Standard', // 'Standard' or 'Reinforced'
    
    // Selected Products
    selectedTopcoat: '',
    selectedBasecoat: '',
    selectedButterGrade: '',
    selectedFabric: '',

    roofSizeSqFt: 0,
    linearFeet: 0,
    roofType: 'Capsheet',
    wasteFactor: 0,
    stretchFactor: 0,
    goldseal: false,
    passedAdhesion: true,
    hasRust: false,
    // 'field' = calculate rust primer for the whole field (0.5 gal/sq).
    // 'spot' = no calculation; quote just notes "spot prime rusted areas 2 layers before topcoats".
    rustPrimeMethod: 'field',
    accessoryType: 'Butter Grade',
    // When true, fasteners are encapsulated with self-leveling caulk (~125 fasteners
    // per tube) instead of being rolled into the butter grade bucket count.
    // Butter grade still handles seams and penetrations.
    useFastenerCaulk: false,
  });

  const [commonResults, setCommonResults] = useState({
    squares: 0,
    accessoryName: '',
    accessoryQty: 0,
    accessoryUnit: '',
    accessoryDesc: '',
    membraneRolls: 0,
    linearBuckets: 0,
    screwCount: 0,
    screwBuckets: 0,
    fastenerCaulkTubes: 0
  });

  const emptyEstimate = { baseGal: 0, top1Gal: 0, top2Gal: 0, top3Gal: 0, adhesionPrimerGal: 0, rustPrimerGal: 0, goldsealCost: 0, totalGallons: 0, rates: { base: 0, top1: 0, top2: 0, top3: 0 } };
  const [estimates, setEstimates] = useState({
    '10': { ...emptyEstimate },
    '15': { ...emptyEstimate },
    '20': { ...emptyEstimate }
  });

  const [emailText, setEmailText] = useState('');
  const [contractorEmailText, setContractorEmailText] = useState('');
  // Which version is shown in the preview & copied — mirrors the PDF buttons.
  const [emailViewMode, setEmailViewMode] = useState('distributor'); // 'distributor' | 'contractor'
  const [copySuccess, setCopySuccess] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [mobileTier, setMobileTier] = useState('15');
  const [showMore, setShowMore] = useState(false);

  // Results column sticks by its bottom edge when taller than the viewport, so every
  // order row stays reachable by page scroll while the totals stay in view during edits.
  const resultsRef = useRef(null);
  const [resultsTop, setResultsTop] = useState(72);
  useEffect(() => {
    const el = resultsRef.current;
    if (!el) return;
    const update = () => setResultsTop(Math.min(72, window.innerHeight - el.offsetHeight - 16));
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    update();
    return () => { ro.disconnect(); window.removeEventListener('resize', update); };
  }, []);
  const [toast, setToast] = useState(null);
  const showToast = (message) => setToast(message);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  // Pricing state
  const [prices, setPrices] = useState({
    basecoat: 0,
    topcoat: 0,
    adhesionPrimer: 0,
    rustPrimer: 0,
    accessory: 0,
    membrane: 0,
    fastenerCaulk: 0
  });

  // Self-leveling caulk used to encapsulate metal-roof fasteners (per-tube coverage).
  const FASTENER_CAULK_NAME = 'Self-Leveling Caulk';
  const FASTENERS_PER_CAULK_TUBE = 125;
  // Standard instruction we drop into all outputs when the user picks spot prime
  // instead of priming the whole field. Kept here so the text never drifts between forms.
  const SPOT_PRIME_NOTE = 'Spot prime rusted areas — 2 layers before applying topcoats';

  // Customer info state
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    company: '',
    address: '',
    phone: '',
    email: '',
    projectAddress: ''
  });
  const [showCustomerInfo, setShowCustomerInfo] = useState(false);

  // Quote metadata
  const [quoteDate, setQuoteDate] = useState(new Date().toISOString().split('T')[0]);

  // Profit margin
  const [profitMargin, setProfitMargin] = useState(0);
  // Controls whether distributor cost / margin details are exposed in PDF + Copy Text.
  // Default off — quotes go to contractors and that info is sensitive.

  // Energy savings estimator
  const [showEnergySavings, setShowEnergySavings] = useState(false);
  const [energySavingsResults, setEnergySavingsResults] = useState(null);
  const [energyElectricityRate, setEnergyElectricityRate] = useState(0.12);
  const [energyRegion, setEnergyRegion] = useState('TX');

  // --- MULTI-SECTION ROOFS ---
  const [roofSections, setRoofSections] = useState([]);
  const [useMultiSection, setUseMultiSection] = useState(false);
  const [sectionResults, setSectionResults] = useState([]);

  const addRoofSection = () => {
    setRoofSections(prev => [...prev, {
      id: Date.now(),
      name: `Section ${prev.length + 1}`,
      sqFt: 0,
      linearFeet: 0,
      roofType: inputs.roofType,
      wasteFactor: 0,
      stretchFactor: 0
    }]);
  };

  const updateRoofSection = (id, field, value) => {
    setRoofSections(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const removeRoofSection = (id) => {
    setRoofSections(prev => prev.filter(s => s.id !== id));
  };

  // Aggregate multi-section totals into main inputs
  useEffect(() => {
    if (useMultiSection && roofSections.length > 0) {
      const totalSqFt = roofSections.reduce((sum, s) => sum + (parseFloat(s.sqFt) || 0), 0);
      const totalLF = roofSections.reduce((sum, s) => sum + (parseFloat(s.linearFeet) || 0), 0);
      setInputs(prev => ({ ...prev, roofSizeSqFt: totalSqFt, linearFeet: totalLF }));
    }
  }, [roofSections, useMultiSection]);

  // --- INPUT VALIDATION ---
  const [validationErrors, setValidationErrors] = useState({});
  const [showValidationSummary, setShowValidationSummary] = useState(false);

  const validateInputs = useCallback(() => {
    const errors = {};

    // Roof size validation
    if (inputs.roofSizeSqFt < 0) {
      errors.roofSizeSqFt = 'Roof size cannot be negative';
    } else if (inputs.roofSizeSqFt > 1000000) {
      errors.roofSizeSqFt = 'Roof size exceeds 1,000,000 sq ft maximum';
    }

    // Linear feet validation
    if (inputs.linearFeet < 0) {
      errors.linearFeet = 'Linear feet cannot be negative';
    } else if (inputs.linearFeet > 100000) {
      errors.linearFeet = 'Linear feet exceeds 100,000 maximum';
    }

    // Profit margin validation
    if (profitMargin < 0) {
      errors.profitMargin = 'Margin cannot be negative';
    } else if (profitMargin >= 100) {
      errors.profitMargin = 'Margin must be less than 100%';
    }

    // Price validation
    Object.entries(prices).forEach(([key, val]) => {
      if (val < 0) {
        errors[`price_${key}`] = `${key} price cannot be negative`;
      } else if (val > 10000) {
        errors[`price_${key}`] = `${key} price exceeds $10,000 maximum`;
      }
    });

    // Customer email validation
    if (customerInfo.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerInfo.email)) {
      errors.email = 'Invalid email format';
    }

    // Customer phone validation
    if (customerInfo.phone && !/^[\d\s()+-]{7,20}$/.test(customerInfo.phone)) {
      errors.phone = 'Invalid phone format';
    }

    // Multi-section validation
    if (useMultiSection) {
      roofSections.forEach((section, i) => {
        if (section.sqFt < 0) errors[`section_${section.id}_sqFt`] = `Section ${i + 1}: sq ft cannot be negative`;
        if (section.sqFt > 500000) errors[`section_${section.id}_sqFt`] = `Section ${i + 1}: sq ft exceeds 500,000 max`;
        if (section.linearFeet < 0) errors[`section_${section.id}_lf`] = `Section ${i + 1}: linear feet cannot be negative`;
      });
    }

    return errors;
  }, [inputs, prices, profitMargin, customerInfo, roofSections, useMultiSection]);

  useEffect(() => {
    setValidationErrors(validateInputs());
  }, [validateInputs]);

  const hasErrors = Object.keys(validationErrors).length > 0;

  // Saved quotes
  const [savedQuotes, setSavedQuotes] = useState([]);

  // Quote comparison
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState([]);
  const [showComparison, setShowComparison] = useState(false);
  const [compCopied, setCompCopied] = useState(false);

  // --- PRODUCT OPTIONS ---
  const PRODUCT_OPTIONS = {
    Silicone: {
        topcoats: [
            'Enduraroof Premium Silicone',
            'Prograde 988 Silicone'
        ],
        basecoats: [
            'Enduraroof BaseCoat & Sealer',
            'Prograde 294 BaseCoat'
        ],
        butterGrades: [
            'EnduraRoof Butter Grade',
            'Prograde 923 Butter Grade'
        ],
        fabrics: [
            'Enduraroof Polyester Fabric',
            'Prograde 195 (SOFT)',
            'Prograde 196 (FIRM)'
        ]
    },
    Acrylic: {
        topcoats: [
            'Enduraroof Elastomeric',
            'Enduraroof Premium Acrylic',
            'Acryshield 400',
            'Acryshield 510',
            'Acryshield 550HT',
            'Acryshield 610'
        ],
        basecoats: [
            'Enduraroof Basecoat',
            'Enduraroof Elastomeric',
            'Enduraroof Premium Acrylic',
            'Acryshield Basecoat',
            'Acryshield 400',
            'Acryshield 505'
        ],
        butterGrades: [
            'Enduraroof Acrylic Roof Patch',
            'Prograde 289 White Roofing Sealant',
            'Prograde 295 Metal Seam Sealer'
        ],
        fabrics: [
            'Enduraroof Polyester Fabric',
            'Prograde 195 (SOFT)',
            'Prograde 196 (FIRM)'
        ]
    },
    Aluminum: {
        topcoats: [
            'Enduraroof Fibered Aluminum',
            'Pro-Grade 586'
        ],
        basecoats: [], // No basecoats for Aluminum
        butterGrades: [
            'Enduraroof Acrylic Roof Patch',
            'Prograde 289 White Roofing Sealant'
        ],
        fabrics: [
            'Enduraroof Polyester Fabric',
            'Prograde 195 (SOFT)',
            'Prograde 196 (FIRM)'
        ]
    }
  };

  // Helper to map accessory products to their specific primers/ancillaries if needed
  const getBrandFromTopcoat = (topcoatName) => {
      if (topcoatName && topcoatName.includes('Endura')) return 'Enduraroof';
      return 'Prograde';
  };

  const PRIMER_LOOKUP = {
      Prograde: {
          adhesion: 'Prograde 941 Adhesion Promoting Primer',
          rust: 'PrimeTek Rust Inhibiting Primer'
      },
      Enduraroof: {
          adhesion: 'Enduraroof Silicone Roof Primer',
          rust: 'Enduraroof Metal Roofing Primer'
      }
  };

  // Initialize defaults when app loads or system changes
  useEffect(() => {
      const defaults = PRODUCT_OPTIONS[inputs.coatingSystem];
      setInputs(prev => ({
          ...prev,
          selectedTopcoat: defaults.topcoats[0],
          selectedBasecoat: defaults.basecoats[0] || '', // Empty string if no basecoats (Aluminum)
          selectedButterGrade: defaults.butterGrades[0],
          selectedFabric: defaults.fabrics[0],
          // Always ensure acrylicSystemType has a valid value to prevent undefined access
          acrylicSystemType: prev.acrylicSystemType || 'Standard'
      }));
  }, [inputs.coatingSystem]);


  // --- DATA / CONSTANTS ---
  const SYSTEM_DATA = {
    Silicone: {
        'Capsheet': {
            '10': { base: 1.25, top1: 2.0, top2: 0, top3: 0 },
            '15': { base: 1.25, top1: 2.5, top2: 0, top3: 0 },
            '20': { base: 1.25, top1: 3.0, top2: 0, top3: 0 },
        },
        'Sprayfoam': {
            '10': { base: 0, top1: 1.5, top2: 0, top3: 0 },
            '15': { base: 0, top1: 2.0, top2: 0, top3: 0 },
            '20': { base: 0, top1: 2.5, top2: 0, top3: 0 },
        },
        'Single-Ply': {
            '10': { base: 0, top1: 1.5, top2: 0, top3: 0 },
            '15': { base: 0, top1: 2.0, top2: 0, top3: 0 },
            '20': { base: 0, top1: 2.5, top2: 0, top3: 0 },
        },
        'Metal': {
            '10': { base: 0, top1: 1.5, top2: 0, top3: 0 },
            '15': { base: 0, top1: 2.0, top2: 0, top3: 0 },
            '20': { base: 0, top1: 2.5, top2: 0, top3: 0 },
        }
    },
    Acrylic: {
        Reinforced: {
            'Capsheet': {
                '10': { base: 2.0, top1: 2.0, top2: 1.75, top3: 0 },
                '15': { base: 2.0, top1: 2.0, top2: 1.5, top3: 1.5 },
                '20': { base: 2.0, top1: 2.0, top2: 2.0, top3: 2.0 },
            },
            'Single-Ply': {
                '10': { base: 2.0, top1: 1.0, top2: 1.5, top3: 0 }, 
                '15': { base: 2.0, top1: 1.0, top2: 1.5, top3: 1.5 },
                '20': { base: 2.0, top1: 1.0, top2: 2.0, top3: 2.0 },
            },
            'Sprayfoam': null, 
            'Metal': null
        },
        Standard: {
            'Capsheet': {
                '10': { base: 1.75, top1: 2.0, top2: 0, top3: 0 },
                '15': { base: 2.0, top1: 2.0, top2: 0, top3: 0 },
                '20': { base: 2.0, top1: 2.0, top2: 1.5, top3: 0 },
            },
            'Sprayfoam': {
                '10': { base: 1.5, top1: 1.5, top2: 0, top3: 0 },
                '15': { base: 1.5, top1: 2.0, top2: 0, top3: 0 },
                '20': { base: 1.5, top1: 1.5, top2: 2.0, top3: 0 },
            },
            'Single-Ply': {
                '10': { base: 1.5, top1: 1.5, top2: 0, top3: 0 },
                '15': { base: 1.5, top1: 2.0, top2: 0, top3: 0 },
                '20': { base: 1.5, top1: 1.5, top2: 2.0, top3: 0 },
            },
            'Metal': {
                '10': { base: 1.5, top1: 1.5, top2: 0, top3: 0 },
                '15': { base: 1.5, top1: 2.0, top2: 0, top3: 0 },
                '20': { base: 1.5, top1: 1.5, top2: 2.0, top3: 0 },
            }
        }
    },
    Aluminum: {
        'Metal': {
            '10': { base: 0, top1: 2.0, top2: 0, top3: 0 },
            '15': null, // Not available
            '20': null  // Not available
        },
        'Capsheet': {
            '10': { base: 0, top1: 2.5, top2: 0, top3: 0 },
            '15': null, // Not available
            '20': null  // Not available
        },
        'Sprayfoam': null, // Not supported
        'Single-Ply': null // Not supported
    }
  };

  // --- HANDLERS ---
  const handleChange = (field, value) => {
    if (field === 'coatingSystem') {
        let newRoofType = inputs.roofType;

        // Aluminum only supports Metal and Capsheet
        if (value === 'Aluminum') {
            if (inputs.roofType === 'Sprayfoam' || inputs.roofType === 'Single-Ply') {
                newRoofType = 'Metal';
            }
        }

        setInputs(prev => ({
            ...prev,
            [field]: value,
            roofType: newRoofType,
            acrylicSystemType: 'Standard'
        }));
    } else if (field === 'acrylicSystemType') {
        if (value === 'Reinforced') {
            if (inputs.roofType === 'Metal' || inputs.roofType === 'Sprayfoam') {
                setInputs(prev => ({ ...prev, [field]: value, roofType: 'Capsheet' }));
                return;
            }
        }
        setInputs(prev => ({ ...prev, [field]: value }));
    } else {
        setInputs(prev => ({ ...prev, [field]: value }));
    }
  };

  const handlePriceChange = (field, value) => {
    const parsed = parseFloat(value) || 0;
    if (parsed < 0) return;
    setPrices(prev => ({ ...prev, [field]: parsed }));
  };

  const handleCustomerInfoChange = (field, value) => {
    setCustomerInfo(prev => ({ ...prev, [field]: value }));
  };

  // Save/Load/Export/Import functions
  const saveQuote = () => {
    if (hasErrors) {
      const proceed = window.confirm(`There are ${Object.keys(validationErrors).length} validation issue(s). Save quote anyway?`);
      if (!proceed) return;
    }
    const quote = {
      id: Date.now(),
      date: quoteDate,
      inputs,
      prices,
      profitMargin,
      customerInfo,
      estimates,
      commonResults,
      energyRegion,
      roofSections: useMultiSection ? roofSections : [],
      useMultiSection,
      savedAt: new Date().toISOString()
    };

    const existingQuotes = JSON.parse(localStorage.getItem('savedQuotes') || '[]');
    const updatedQuotes = [quote, ...existingQuotes];
    localStorage.setItem('savedQuotes', JSON.stringify(updatedQuotes));
    setSavedQuotes(updatedQuotes);
    showToast(`Saved ${inputs.projectName || 'untitled quote'}`);
  };

  const loadQuote = (quote) => {
    setInputs(quote.inputs);
    setPrices(quote.prices);
    setProfitMargin(quote.profitMargin || 0);
    setCustomerInfo(quote.customerInfo || {
      name: '',
      company: '',
      address: '',
      phone: '',
      email: '',
      projectAddress: ''
    });
    setQuoteDate(quote.date || new Date().toISOString().split('T')[0]);
    setEnergyRegion(quote.energyRegion || 'TX');
    // Migrate old sections that lack per-section waste/stretch factors
    const migratedSections = (quote.roofSections || []).map(s => ({
      ...s,
      wasteFactor: s.wasteFactor !== undefined ? s.wasteFactor : (quote.inputs?.wasteFactor || 0),
      stretchFactor: s.stretchFactor !== undefined ? s.stretchFactor : (quote.inputs?.stretchFactor || 0)
    }));
    setRoofSections(migratedSections);
    setUseMultiSection(quote.useMultiSection || false);
  };

  const deleteQuote = (quoteId) => {
    const existingQuotes = JSON.parse(localStorage.getItem('savedQuotes') || '[]');
    const updatedQuotes = existingQuotes.filter(q => q.id !== quoteId);
    localStorage.setItem('savedQuotes', JSON.stringify(updatedQuotes));
    setSavedQuotes(updatedQuotes);
  };

  const exportQuote = () => {
    const quote = {
      date: quoteDate,
      inputs,
      prices,
      profitMargin,
      customerInfo,
      energyRegion,
      roofSections: useMultiSection ? roofSections : [],
      useMultiSection,
      exportedAt: new Date().toISOString()
    };

    const dataStr = JSON.stringify(quote, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `quote-${inputs.projectName || 'untitled'}-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importQuote = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const quote = JSON.parse(e.target.result);
        loadQuote(quote);
        showToast('Quote imported');
      } catch (error) {
        alert('Error importing quote. Please check the file format.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  // Load saved quotes on mount
  useEffect(() => {
    try {
      const existingQuotes = JSON.parse(localStorage.getItem('savedQuotes') || '[]');
      setSavedQuotes(existingQuotes);
    } catch {
      setSavedQuotes([]);
    }
  }, []);

  // Helper for rounding to nearest 5-gal pail
  const roundToFive = (val) => {
      if (val <= 0) return 0;
      return Math.ceil(val / 5) * 5;
  };

  // --- PER-SECTION CALCULATION HELPER ---
  const calculateForSection = (section, globalInputs) => {
    const { sqFt, linearFeet, roofType, wasteFactor, stretchFactor } = section;
    const { coatingSystem, acrylicSystemType, passedAdhesion, hasRust, rustPrimeMethod,
            goldseal, accessoryType, selectedButterGrade, selectedFabric,
            useFastenerCaulk } = globalInputs;

    const squares = sqFt > 0 ? sqFt / 100 : 0;
    const totalFactor = 1 + parseFloat(wasteFactor) + parseFloat(stretchFactor);

    // Accessories
    let accQty = 0, accUnit = '', accDesc = '', accDisplayName = '';
    let membraneRolls = 0, estimatedScrews = 0, bucketsForLinear = 0, bucketsForScrews = 0, fastenerCaulkTubes = 0;

    if (accessoryType === 'Butter Grade') {
      const lfPerBucket = coatingSystem === 'Acrylic' ? 150 : 80;
      bucketsForLinear = linearFeet > 0 ? Math.ceil(linearFeet / lfPerBucket) : 0;
      accQty = bucketsForLinear;
      accUnit = 'Buckets';
      const bucketSizeLabel = coatingSystem === 'Acrylic' ? '3.5-gal' : '2-gal';
      accDesc = `${bucketSizeLabel} containers (~${Math.round(lfPerBucket)} LF/ea)`;
      accDisplayName = selectedButterGrade;

      if (roofType === 'Metal' && sqFt > 0) {
        estimatedScrews = Math.ceil(sqFt * 0.8);
        if (useFastenerCaulk) {
          // Caulk handles fasteners; butter grade buckets are NOT increased.
          fastenerCaulkTubes = Math.ceil(estimatedScrews / FASTENERS_PER_CAULK_TUBE);
        } else {
          const screwsPerBucket = coatingSystem === 'Acrylic' ? 4375 : 2500;
          bucketsForScrews = Math.ceil(estimatedScrews / screwsPerBucket);
          accQty += bucketsForScrews;
        }
      }
    } else {
      accQty = linearFeet > 0 ? Math.ceil(linearFeet / 300) : 0;
      accUnit = 'Rolls';
      accDisplayName = selectedFabric;
    }

    if (coatingSystem === 'Acrylic' && acrylicSystemType === 'Reinforced') {
      const rollCoverage = 1080;
      membraneRolls = sqFt > 0 ? Math.ceil((sqFt * totalFactor) / rollCoverage) : 0;
    }

    // Per-warranty-year coating gallons
    const sectionEstimates = {};
    let systemSpec = null;
    if (coatingSystem === 'Silicone') {
      systemSpec = SYSTEM_DATA['Silicone'][roofType];
    } else if (coatingSystem === 'Aluminum') {
      systemSpec = SYSTEM_DATA['Aluminum'][roofType];
    } else {
      const safeAcrylicSystemType = acrylicSystemType || 'Standard';
      systemSpec = SYSTEM_DATA['Acrylic'][safeAcrylicSystemType]?.[roofType];
    }

    const defaultEst = { baseGal: 0, top1Gal: 0, top2Gal: 0, top3Gal: 0, adhesionPrimerGal: 0, rustPrimerGal: 0, goldsealCost: 0, totalGallons: 0, rates: { base: 0, top1: 0, top2: 0, top3: 0 } };

    ['10', '15', '20'].forEach(year => {
      if (!systemSpec || !systemSpec[year]) {
        sectionEstimates[year] = { ...defaultEst };
        return;
      }

      const rates = systemSpec[year];
      const baseGal = roundToFive(squares * (rates.base || 0) * totalFactor);
      const top1Gal = roundToFive(squares * (rates.top1 || 0) * totalFactor);
      const top2Gal = roundToFive(squares * (rates.top2 || 0) * totalFactor);
      const top3Gal = roundToFive(squares * (rates.top3 || 0) * totalFactor);

      let adhesionPrimerGal = 0;
      if (!passedAdhesion) {
        adhesionPrimerGal = Math.ceil(squares * 0.2 * totalFactor);
      }

      // Spot-prime skips the field calculation — the quote just carries a note.
      let rustPrimerGal = 0;
      if ((coatingSystem === 'Silicone' || coatingSystem === 'Acrylic') && roofType === 'Metal' && hasRust && rustPrimeMethod !== 'spot') {
        rustPrimerGal = roundToFive(squares * 0.5 * totalFactor);
      }

      // Per-section goldseal: proportional cost (minimum applied to total later)
      let goldsealCost = 0;
      if (goldseal && sqFt > 0) {
        let rate = 0.06;
        if (year === '15') rate = 0.08;
        if (year === '20') rate = 0.10;
        goldsealCost = sqFt * rate;
      }

      const totalGallons = baseGal + top1Gal + top2Gal + top3Gal + adhesionPrimerGal + rustPrimerGal;

      sectionEstimates[year] = { baseGal, top1Gal, top2Gal, top3Gal, adhesionPrimerGal, rustPrimerGal, goldsealCost, totalGallons, rates };
    });

    return {
      estimates: sectionEstimates,
      accessories: { accQty, accUnit, accDesc, accDisplayName, membraneRolls, estimatedScrews, bucketsForLinear, bucketsForScrews, fastenerCaulkTubes },
      squares
    };
  };

  // --- CALCULATIONS ---
  useEffect(() => {
    const {
        roofSizeSqFt, linearFeet, roofType, wasteFactor, stretchFactor,
        goldseal, passedAdhesion, hasRust, rustPrimeMethod, accessoryType, coatingSystem, acrylicSystemType,
        selectedTopcoat, selectedBasecoat, selectedButterGrade, selectedFabric,
        useFastenerCaulk
    } = inputs;

    if (useMultiSection && roofSections.length > 0) {
      // --- MULTI-SECTION PATH: calculate each section independently, then aggregate ---
      const perSectionResults = roofSections.map(section => calculateForSection(section, inputs));

      // Aggregate estimates by summing across all sections
      const aggregatedEstimates = {};
      ['10', '15', '20'].forEach(year => {
        const summed = { baseGal: 0, top1Gal: 0, top2Gal: 0, top3Gal: 0, adhesionPrimerGal: 0, rustPrimerGal: 0, goldsealCost: 0, totalGallons: 0, rates: { base: 0, top1: 0, top2: 0, top3: 0 } };
        perSectionResults.forEach(sr => {
          const est = sr.estimates[year];
          summed.baseGal += est.baseGal;
          summed.top1Gal += est.top1Gal;
          summed.top2Gal += est.top2Gal;
          summed.top3Gal += est.top3Gal;
          summed.adhesionPrimerGal += est.adhesionPrimerGal;
          summed.rustPrimerGal += est.rustPrimerGal;
          summed.goldsealCost += est.goldsealCost;
          summed.totalGallons += est.totalGallons;
        });
        // Apply goldseal minimum on the total roof, not per-section
        if (goldseal && roofSizeSqFt > 0) {
          let min = 900;
          if (year === '15') min = 1200;
          if (year === '20') min = 1500;
          summed.goldsealCost = Math.max(summed.goldsealCost, min);
        }
        aggregatedEstimates[year] = summed;
      });

      // Aggregate accessories
      let totalAccQty = 0, totalMembraneRolls = 0, totalScrews = 0, totalLinearBuckets = 0, totalScrewBuckets = 0, totalCaulkTubes = 0, totalSquares = 0;
      perSectionResults.forEach(sr => {
        totalAccQty += sr.accessories.accQty;
        totalMembraneRolls += sr.accessories.membraneRolls;
        totalScrews += sr.accessories.estimatedScrews;
        totalLinearBuckets += sr.accessories.bucketsForLinear || 0;
        totalScrewBuckets += sr.accessories.bucketsForScrews;
        totalCaulkTubes += sr.accessories.fastenerCaulkTubes || 0;
        totalSquares += sr.squares;
      });

      const firstAcc = perSectionResults[0]?.accessories || {};
      let accDesc = firstAcc.accDesc || '';
      if (totalScrewBuckets > 0 && !accDesc.includes('Screw Encapsulation')) {
        accDesc += ' + Screw Encapsulation';
      }

      setCommonResults({
        squares: totalSquares,
        accessoryName: firstAcc.accDisplayName || '',
        accessoryQty: totalAccQty,
        accessoryUnit: firstAcc.accUnit || '',
        accessoryDesc: accDesc,
        membraneRolls: totalMembraneRolls,
        linearBuckets: totalLinearBuckets,
        screwCount: totalScrews,
        screwBuckets: totalScrewBuckets,
        fastenerCaulkTubes: totalCaulkTubes
      });

      setEstimates(aggregatedEstimates);

      // Store per-section results for email/clipboard breakdown
      setSectionResults(roofSections.map((section, i) => ({
        ...section,
        calculatedEstimates: perSectionResults[i].estimates,
        calculatedAccessories: perSectionResults[i].accessories,
        calculatedSquares: perSectionResults[i].squares
      })));

    } else {
      // --- SINGLE-SECTION PATH (original logic, unchanged) ---
      setSectionResults([]);

      const squares = roofSizeSqFt > 0 ? roofSizeSqFt / 100 : 0;
      const totalFactor = 1 + parseFloat(wasteFactor) + parseFloat(stretchFactor);

      let accQty = 0;
      let accUnit = '';
      let accDesc = '';
      let accDisplayName = '';
      let membraneRolls = 0;
      let estimatedScrews = 0;
      let bucketsForLinear = 0;
      let bucketsForScrews = 0;
      let fastenerCaulkTubes = 0;

      if (accessoryType === 'Butter Grade') {
          const lfPerBucket = coatingSystem === 'Acrylic' ? 150 : 80;
          bucketsForLinear = linearFeet > 0 ? Math.ceil(linearFeet / lfPerBucket) : 0;
          accQty = bucketsForLinear;
          accUnit = 'Buckets';

          const bucketSizeLabel = coatingSystem === 'Acrylic' ? '3.5-gal' : '2-gal';

          accDesc = `${bucketSizeLabel} containers (~${Math.round(lfPerBucket)} LF/ea)`;
          accDisplayName = selectedButterGrade;

          if (roofType === 'Metal' && roofSizeSqFt > 0) {
              estimatedScrews = Math.ceil(roofSizeSqFt * 0.8);
              if (useFastenerCaulk) {
                  // Self-leveling caulk handles fasteners; butter grade stays for seams/penetrations only.
                  fastenerCaulkTubes = Math.ceil(estimatedScrews / FASTENERS_PER_CAULK_TUBE);
              } else {
                  const screwsPerBucket = coatingSystem === 'Acrylic' ? 4375 : 2500;
                  bucketsForScrews = Math.ceil(estimatedScrews / screwsPerBucket);
                  accQty += bucketsForScrews;
                  accDesc += ` + Screw Encapsulation`;
              }
          }
      } else {
          accQty = linearFeet > 0 ? Math.ceil(linearFeet / 300) : 0;
          accUnit = 'Rolls';
          accDesc = 'Reinforcement Fabric (300 LF/ea)';
          accDisplayName = selectedFabric;
      }

      if (coatingSystem === 'Acrylic' && acrylicSystemType === 'Reinforced') {
          const rollCoverage = 1080;
          membraneRolls = roofSizeSqFt > 0 ? Math.ceil((roofSizeSqFt * totalFactor) / rollCoverage) : 0;
      }

      setCommonResults({
          squares,
          accessoryName: accDisplayName,
          accessoryQty: accQty,
          accessoryUnit: accUnit,
          accessoryDesc: accDesc,
          membraneRolls,
          linearBuckets: bucketsForLinear,
          screwCount: estimatedScrews,
          screwBuckets: bucketsForScrews,
          fastenerCaulkTubes
      });

      const defaultEstimate = { baseGal: 0, top1Gal: 0, top2Gal: 0, top3Gal: 0, adhesionPrimerGal: 0, rustPrimerGal: 0, goldsealCost: 0, totalGallons: 0, rates: { base: 0, top1: 0, top2: 0, top3: 0 } };
      const newEstimates = { '10': { ...defaultEstimate }, '15': { ...defaultEstimate }, '20': { ...defaultEstimate } };
      let systemSpec = null;
      if (coatingSystem === 'Silicone') {
          systemSpec = SYSTEM_DATA['Silicone'][roofType];
      } else if (coatingSystem === 'Aluminum') {
          systemSpec = SYSTEM_DATA['Aluminum'][roofType];
      } else {
          const safeAcrylicSystemType = acrylicSystemType || 'Standard';
          systemSpec = SYSTEM_DATA['Acrylic'][safeAcrylicSystemType]?.[roofType];
      }

      ['10', '15', '20'].forEach(year => {
          if (!systemSpec) return;

          const rates = systemSpec[year];
          if (!rates) return;

          const rawBase = squares * (rates.base || 0);
          const baseGal = roundToFive(rawBase * totalFactor);

          const rawTop1 = squares * (rates.top1 || 0);
          const top1Gal = roundToFive(rawTop1 * totalFactor);

          const rawTop2 = squares * (rates.top2 || 0);
          const top2Gal = roundToFive(rawTop2 * totalFactor);

          const rawTop3 = squares * (rates.top3 || 0);
          const top3Gal = roundToFive(rawTop3 * totalFactor);

          let adhesionPrimerGal = 0;
          if (!passedAdhesion) {
              const rawAdhesion = squares * 0.2;
              adhesionPrimerGal = Math.ceil(rawAdhesion * totalFactor);
          }

          let rustPrimerGal = 0;
          if ((coatingSystem === 'Silicone' || coatingSystem === 'Acrylic') && roofType === 'Metal' && hasRust && rustPrimeMethod !== 'spot') {
               const rawRust = squares * 0.5;
               rustPrimerGal = roundToFive(rawRust * totalFactor);
          }

          let goldsealCost = 0;
          if (goldseal && roofSizeSqFt > 0) {
              let rate = 0.06;
              let min = 900;
              if (year === '15') { rate = 0.08; min = 1200; }
              if (year === '20') { rate = 0.10; min = 1500; }
              const calculated = roofSizeSqFt * rate;
              goldsealCost = Math.max(calculated, min);
          }

          const totalGallons = baseGal + top1Gal + top2Gal + top3Gal + adhesionPrimerGal + rustPrimerGal;

          newEstimates[year] = {
              baseGal,
              top1Gal,
              top2Gal,
              top3Gal,
              adhesionPrimerGal,
              rustPrimerGal,
              goldsealCost,
              totalGallons,
              rates
          };
      });

      setEstimates(newEstimates);
    }

  }, [inputs, useMultiSection, roofSections]);

  // Calculate energy savings for PDF/Email (same logic as EnergySavingsEstimator component)
  // MUST be defined BEFORE the TEXT GENERATION EFFECT useEffect below
  const calculateEnergySavingsForExport = (electricityRateOverride) => {
    const roofSize = inputs.roofSizeSqFt;
    const roofType = inputs.roofType;
    const coatingSystem = inputs.coatingSystem;
    const electricityRate = electricityRateOverride || energyElectricityRate;

    if (!roofSize || roofSize <= 0) return null;

    // Roof properties
    const ROOF_PROPERTIES = {
      blackCapsheet: { solarReflectance: 0.06, name: 'Black Capsheet' },
      darkMetal: { solarReflectance: 0.25, name: 'Dark/Weathered Metal' },
      whiteSilicone: { solarReflectance: 0.88, name: 'White Silicone Coating' },
      whiteAcrylic: { solarReflectance: 0.85, name: 'White Acrylic Coating' },
      whiteAluminum: { solarReflectance: 0.70, name: 'Aluminum Coating' }
    };

    let beforeRoof, afterRoof;
    if (roofType === 'Capsheet') beforeRoof = ROOF_PROPERTIES.blackCapsheet;
    else if (roofType === 'Metal') beforeRoof = ROOF_PROPERTIES.darkMetal;
    else beforeRoof = { solarReflectance: 0.15, name: 'Existing Roof' };

    if (coatingSystem === 'Silicone') afterRoof = ROOF_PROPERTIES.whiteSilicone;
    else if (coatingSystem === 'Acrylic') afterRoof = ROOF_PROPERTIES.whiteAcrylic;
    else if (coatingSystem === 'Aluminum') afterRoof = ROOF_PROPERTIES.whiteAluminum;
    else afterRoof = ROOF_PROPERTIES.whiteSilicone;

    const deltaReflectance = afterRoof.solarReflectance - beforeRoof.solarReflectance;
    if (deltaReflectance <= 0) return null;

    const climateInfo = CLIMATE_DATA[energyRegion] || CLIMATE_DATA[DEFAULT_STATE];
    const ROOF_FACTOR = climateInfo.coolingSeasonFraction * 0.35 * 0.40;
    const SOLAR_RADIATION_KWH_M2 = climateInfo.solarRadiation;
    const HVAC_EER = 13 * 0.875;

    const roofAreaM2 = roofSize * 0.092903;
    const solarHeatGainReduction = roofAreaM2 * SOLAR_RADIATION_KWH_M2 * deltaReflectance * ROOF_FACTOR;
    const annualCoolingSavingsKWh = solarHeatGainReduction / (HVAC_EER / 3.412);

    const peakHeatReductionWatts = roofAreaM2 * 250 * deltaReflectance;
    const peakHeatReductionBTU = peakHeatReductionWatts * 3.412;
    const tonsOfCoolingReduction = peakHeatReductionBTU / 12000;

    const annualSavingsBase = annualCoolingSavingsKWh * electricityRate;
    const annualSavingsLow = annualSavingsBase * 0.85;
    const annualSavingsHigh = annualSavingsBase * 1.15;

    const calculateCompoundSavings = (years) => {
      let total = 0;
      for (let year = 1; year <= years; year++) {
        total += annualSavingsBase * Math.pow(1.03, year - 1);
      }
      return total;
    };

    return {
      beforeRoof: beforeRoof.name,
      afterRoof: afterRoof.name,
      deltaReflectance: (deltaReflectance * 100).toFixed(0),
      annualKwhSavings: Math.round(annualCoolingSavingsKWh),
      annualSavingsLow: Math.round(annualSavingsLow),
      annualSavingsHigh: Math.round(annualSavingsHigh),
      annualSavingsBase: Math.round(annualSavingsBase),
      tonsOfCooling: tonsOfCoolingReduction.toFixed(1),
      roi10Year: Math.round(calculateCompoundSavings(10)),
      roi15Year: Math.round(calculateCompoundSavings(15)),
      roi20Year: Math.round(calculateCompoundSavings(20)),
      regionName: climateInfo.name,
      climateZone: climateInfo.climateZone,
      cdd: climateInfo.cdd,
      solarRadiation: climateInfo.solarRadiation,
      coolingSeasonPct: Math.round(climateInfo.coolingSeasonFraction * 100),
    };
  };

  // --- TEXT GENERATION EFFECT ---
  useEffect(() => {
    const {
        projectName, roofSizeSqFt, linearFeet, roofType, coatingSystem, acrylicSystemType, wasteFactor, stretchFactor,
        selectedTopcoat, selectedBasecoat, selectedButterGrade, selectedFabric
    } = inputs;

    const brand = getBrandFromTopcoat(selectedTopcoat);
    const primerSet = PRIMER_LOOKUP[brand];

  const buildEmailText = (mode) => {
    const isContractor = mode === 'contractor';
    // In contractor mode, every displayed price is marked up to the contractor's price.
    const markup = (isContractor && profitMargin > 0) ? 1 / (1 - profitMargin / 100) : 1;
    // Unit prices round to cents first so quantity × unit price matches every printed line
    const adjP = (p) => Math.round(p * markup * 100) / 100;

    let text = `${isContractor ? 'CONTRACTOR MATERIAL QUOTE' : 'PROJECT ESTIMATE'}: ${projectName || 'Untitled'}\n\n`;
    if (useMultiSection && roofSections.length > 0) {
      const uniqueTypes = [...new Set(roofSections.map(s => s.roofType))];
      text += `System: ${coatingSystem} on ${uniqueTypes.join(' / ')} (Multi-Section)`;
    } else {
      text += `System: ${coatingSystem} on ${roofType}`;
    }
    if (coatingSystem === 'Acrylic') text += ` (${acrylicSystemType})`;
    text += `\n`;

    text += `Roof Size: ${roofSizeSqFt} sqft (${commonResults.squares} Squares)\n`;
    if (useMultiSection && roofSections.length > 0) {
      text += `\nRoof Sections:\n`;
      roofSections.forEach(s => {
        text += `  - ${s.name}: ${s.sqFt || 0} sqft, ${s.linearFeet || 0} LF (${s.roofType}) [Waste: ${Math.round((s.wasteFactor || 0) * 100)}%, Stretch: ${Math.round((s.stretchFactor || 0) * 100)}%]\n`;
      });

      // Per-section material breakdown
      if (sectionResults.length > 0) {
        text += `\nPer-Section Material Breakdown:\n`;
        sectionResults.forEach(sr => {
          text += `\n  ${sr.name} (${sr.roofType}, ${sr.calculatedSquares.toFixed(2)} sq):\n`;
          ['10', '15', '20'].forEach(year => {
            const est = sr.calculatedEstimates?.[year];
            if (!est || est.totalGallons === 0) return;
            let detail = `    ${year}-Year: ${est.totalGallons} gal total`;
            const parts = [];
            if (est.baseGal > 0) parts.push(`Base: ${est.baseGal}`);
            if (est.top1Gal > 0) parts.push(`Top1: ${est.top1Gal}`);
            if (est.top2Gal > 0) parts.push(`Top2: ${est.top2Gal}`);
            if (est.top3Gal > 0) parts.push(`Top3: ${est.top3Gal}`);
            if (est.adhesionPrimerGal > 0) parts.push(`Adhesion: ${est.adhesionPrimerGal}`);
            if (est.rustPrimerGal > 0) parts.push(`Rust: ${est.rustPrimerGal}`);
            if (parts.length > 0) detail += ` (${parts.join(', ')})`;
            text += detail + `\n`;
          });
          if (sr.calculatedAccessories.accQty > 0) {
            text += `    Accessories: ${sr.calculatedAccessories.accQty} ${sr.calculatedAccessories.accUnit}\n`;
          }
        });
      }
    }
    if (useMultiSection && roofSections.length > 0) {
      text += `\nCalculation Factors: Per-Section (see details above)\n`;
    } else {
      text += `Calculation Factors: ${Math.round(wasteFactor * 100)}% Waste, ${Math.round(stretchFactor * 100)}% Stretch\n`;
    }
    text += `Note: All quantities are rounded up to the nearest full pail where applicable.\n`;

    if (linearFeet > 0 || commonResults.screwBuckets > 0) {
        const perEach = (prices.accessory > 0) ? ` @ $${adjP(prices.accessory).toFixed(2)} each` : '';
        // On metal roofs the seam sealer covers both seams (by linear feet) and
        // fastener encapsulation (by roof area) — list them as separate line items.
        if (commonResults.screwBuckets > 0) {
            if (commonResults.linearBuckets > 0) {
                text += `\nSeam Sealer (Seams): ${commonResults.linearBuckets} ${commonResults.accessoryUnit} of ${commonResults.accessoryName}${perEach}\n`;
            } else {
                text += `\n`;
            }
            text += `Seam Sealer (Fastener Encapsulation): ${commonResults.screwBuckets} ${commonResults.accessoryUnit} of ${commonResults.accessoryName}${perEach} (~${commonResults.screwCount} fasteners)\n`;
        } else {
            text += `\nAccessories: ${commonResults.accessoryQty} ${commonResults.accessoryUnit} of ${commonResults.accessoryName}${perEach}\n`;
        }
    }

    if (commonResults.fastenerCaulkTubes > 0) {
        text += `Fastener Encapsulation: ${commonResults.fastenerCaulkTubes} Tubes of ${FASTENER_CAULK_NAME}`;
        if (prices.fastenerCaulk > 0) text += ` @ $${adjP(prices.fastenerCaulk).toFixed(2)}/tube`;
        text += ` (covers ~${commonResults.screwCount} fasteners @ ${FASTENERS_PER_CAULK_TUBE}/tube)\n`;
    }

    if (coatingSystem === 'Acrylic' && commonResults.membraneRolls > 0) {
        text += `Reinforcement: ${commonResults.membraneRolls} Rolls of Reinforcement Membrane (40" x 324')`;
        if (prices.membrane > 0) text += ` @ $${adjP(prices.membrane).toFixed(2)}/roll`;
        text += `\n`;
    }

    if (linearFeet <= 0) {
        text += `\n*** WARNING: INCOMPLETE QUOTE ***\n`;
        text += `Missing Linear Feet - required to calculate butter grade (seam sealant) quantity.\n`;
        if (roofType === 'Metal' && commonResults.screwBuckets > 0) {
             text += `(Note: Fastener encapsulation for ~${commonResults.screwCount} screws IS included based on roof area.)\n`;
        }
    }

    if (!inputs.passedAdhesion) {
        text += `\n** NOTE: Adhesion failure. Added ${primerSet.adhesion} (@ 0.2 gal/sq).\n`;
    }

    if ((coatingSystem === 'Silicone' || coatingSystem === 'Acrylic') && roofType === 'Metal' && inputs.hasRust) {
        if (inputs.rustPrimeMethod === 'spot') {
            text += `** NOTE: ${SPOT_PRIME_NOTE} (use ${primerSet.rust}).\n`;
        } else {
            text += `** NOTE: Rust present. Added ${primerSet.rust} (@ 0.5 gal/sq).\n`;
        }
    }

    ['10', '15', '20'].forEach(year => {
        const est = estimates[year];
        if (!est || (est.top1Gal === undefined && est.baseGal === undefined)) return;

        text += `\n\n--- ${year}-YEAR OPTION ---\n\n`;

        if (coatingSystem !== 'Aluminum' && est.baseGal > 0) {
            text += `Basecoat: ${est.baseGal} gal (${selectedBasecoat})`;
            if (!useMultiSection && est.rates.base) text += ` @ ${est.rates.base} gal/sq`;
            if (prices.basecoat > 0) text += `\n  Unit Price: $${adjP(prices.basecoat).toFixed(2)}/gal | Line Total: $${(est.baseGal * adjP(prices.basecoat)).toFixed(2)}`;
            text += `\n`;
        }

        if (est.rustPrimerGal > 0) {
            text += `Rust Primer: ${est.rustPrimerGal} gal (${primerSet.rust}) @ 0.5 gal/sq`;
            if (prices.rustPrimer > 0) text += `\n  Unit Price: $${adjP(prices.rustPrimer).toFixed(2)}/gal | Line Total: $${(est.rustPrimerGal * adjP(prices.rustPrimer)).toFixed(2)}`;
            text += `\n`;
        }
        if (est.adhesionPrimerGal > 0) {
            text += `Adhesion Primer: ${est.adhesionPrimerGal} gal (${primerSet.adhesion}) @ 0.2 gal/sq`;
            if (prices.adhesionPrimer > 0) text += `\n  Unit Price: $${adjP(prices.adhesionPrimer).toFixed(2)}/gal | Line Total: $${(est.adhesionPrimerGal * adjP(prices.adhesionPrimer)).toFixed(2)}`;
            text += `\n`;
        }

        if (est.top1Gal > 0) {
            text += `Topcoat 1: ${est.top1Gal} gal (${selectedTopcoat})`;
            if (!useMultiSection && est.rates.top1) text += ` @ ${est.rates.top1} gal/sq`;
            if (prices.topcoat > 0) text += `\n  Unit Price: $${adjP(prices.topcoat).toFixed(2)}/gal | Line Total: $${(est.top1Gal * adjP(prices.topcoat)).toFixed(2)}`;
            text += `\n`;
        }
        if (est.top2Gal > 0) {
            text += `Topcoat 2: ${est.top2Gal} gal (${selectedTopcoat})`;
            if (!useMultiSection && est.rates.top2) text += ` @ ${est.rates.top2} gal/sq`;
            if (prices.topcoat > 0) text += `\n  Unit Price: $${adjP(prices.topcoat).toFixed(2)}/gal | Line Total: $${(est.top2Gal * adjP(prices.topcoat)).toFixed(2)}`;
            text += `\n`;
        }
        if (est.top3Gal > 0) {
            text += `Topcoat 3: ${est.top3Gal} gal (${selectedTopcoat})`;
            if (!useMultiSection && est.rates.top3) text += ` @ ${est.rates.top3} gal/sq`;
            if (prices.topcoat > 0) text += `\n  Unit Price: $${adjP(prices.topcoat).toFixed(2)}/gal | Line Total: $${(est.top3Gal * adjP(prices.topcoat)).toFixed(2)}`;
            text += `\n`;
        }

        text += `\nTOTAL SYSTEM: ${est.totalGallons} Gallons`;
        if ((prices.basecoat > 0 || prices.topcoat > 0 || prices.adhesionPrimer > 0 || prices.rustPrimer > 0)) {
            const materialsTotal = (est.baseGal || 0) * adjP(prices.basecoat) +
                                   (est.top1Gal || 0) * adjP(prices.topcoat) +
                                   (est.top2Gal || 0) * adjP(prices.topcoat) +
                                   (est.top3Gal || 0) * adjP(prices.topcoat) +
                                   (est.adhesionPrimerGal || 0) * adjP(prices.adhesionPrimer) +
                                   (est.rustPrimerGal || 0) * adjP(prices.rustPrimer);
            text += ` = $${materialsTotal.toFixed(2)}`;
        }
        text += `\n`;

        if (est.goldsealCost > 0) text += `Goldseal Warranty: $${adjP(est.goldsealCost).toLocaleString()}\n`;

        // Add grand total if pricing is entered
        if (prices.basecoat > 0 || prices.topcoat > 0 || prices.adhesionPrimer > 0 || prices.rustPrimer > 0 || prices.accessory > 0 || prices.membrane > 0 || prices.fastenerCaulk > 0) {
            // grandTotal is computed at distributor cost basis; we apply markup at display time.
            const grandTotal = (est.baseGal || 0) * prices.basecoat +
                              (est.top1Gal || 0) * prices.topcoat +
                              (est.top2Gal || 0) * prices.topcoat +
                              (est.top3Gal || 0) * prices.topcoat +
                              (est.adhesionPrimerGal || 0) * prices.adhesionPrimer +
                              (est.rustPrimerGal || 0) * prices.rustPrimer +
                              (commonResults.accessoryQty || 0) * prices.accessory +
                              (commonResults.membraneRolls || 0) * prices.membrane +
                              (commonResults.fastenerCaulkTubes || 0) * prices.fastenerCaulk +
                              (est.goldsealCost || 0);
            const warrantyLabel = inputs.goldseal ? ' + Warranty' : '';

            if (isContractor) {
                const contractorPrice = pricedTotal(year, markup);
                text += `\nTOTAL (Materials + Accessories${warrantyLabel}): $${contractorPrice.toFixed(2)}`;
                if (roofSizeSqFt > 0) text += ` ($${(contractorPrice / roofSizeSqFt).toFixed(2)}/sqft)`;
                text += `\n`;
            } else if (profitMargin > 0) {
                const sellPrice = pricedTotal(year, 1 / (1 - profitMargin / 100));
                text += `\nDISTRIBUTOR COST (Materials + Accessories${warrantyLabel}): $${grandTotal.toFixed(2)}`;
                if (roofSizeSqFt > 0) text += ` ($${(grandTotal / roofSizeSqFt).toFixed(2)}/sqft)`;
                text += `\n`;
                const profit = sellPrice - grandTotal;
                text += `CONTRACTOR PRICE (${profitMargin}% margin): $${sellPrice.toFixed(2)}`;
                if (roofSizeSqFt > 0) text += ` ($${(sellPrice / roofSizeSqFt).toFixed(2)}/sqft)`;
                text += `\n`;
                text += `MARGIN: $${profit.toFixed(2)}\n`;
            } else {
                text += `\nGRAND TOTAL (Materials + Accessories${warrantyLabel}): $${grandTotal.toFixed(2)}`;
                if (roofSizeSqFt > 0) text += ` ($${(grandTotal / roofSizeSqFt).toFixed(2)}/sqft)`;
                text += `\n`;
            }
        }
    });

    // Add energy savings if toggled on
    if (showEnergySavings) {
        const energySavingsForEmail = calculateEnergySavingsForExport(energyElectricityRate);
        if (energySavingsForEmail) {
            text += `\n\n=== ENERGY SAVINGS ESTIMATE (OPTIONAL) ===\n`;
            text += `Converting to reflective white coating can reduce cooling costs:\n\n`;
            text += `ESTIMATED ANNUAL SAVINGS:\n`;
            text += `  Conservative Range: $${energySavingsForEmail.annualSavingsLow.toLocaleString()} - $${energySavingsForEmail.annualSavingsHigh.toLocaleString()}/year\n`;
            text += `  Energy Reduction: ${energySavingsForEmail.annualKwhSavings.toLocaleString()} kWh/year\n`;
            text += `  Peak Cooling Reduction: ${energySavingsForEmail.tonsOfCooling} Tons of AC\n\n`;
            text += `LONG-TERM ROI (Warranty Periods):\n`;
            text += `  10-Year Savings: $${energySavingsForEmail.roi10Year.toLocaleString()}\n`;
            text += `  15-Year Savings: $${energySavingsForEmail.roi15Year.toLocaleString()}\n`;
            text += `  20-Year Savings: $${energySavingsForEmail.roi20Year.toLocaleString()}\n\n`;
            text += `CALCULATION ASSUMPTIONS (Highly Conservative):\n`;
            text += `  • Reflectivity Change: ${energySavingsForEmail.beforeRoof} → ${energySavingsForEmail.afterRoof} (+${energySavingsForEmail.deltaReflectance}%)\n`;
            text += `  • ${energySavingsForEmail.regionName} Climate (Zone ${energySavingsForEmail.climateZone}): ${energySavingsForEmail.cdd} Cooling Degree Days, ${energySavingsForEmail.solarRadiation} kWh/m²/year solar radiation\n`;
            text += `  • HVAC Efficiency: SEER 13 (typical commercial)\n`;
            text += `  • Electricity Rate: $${energyElectricityRate}/kWh\n`;
            text += `  • Conservative Factors: Cooling season (${energySavingsForEmail.coolingSeasonPct}%), building reality (40%), heat transfer (35%)\n`;
            text += `  • Targets LOW END of industry range: $0.25-$0.75 per sq ft/year\n`;
            text += `  • ROI includes 3% annual electricity rate increase\n\n`;
            text += `* Energy savings are estimates for ${energySavingsForEmail.regionName} based on DOE/LBNL Cool Roof Calculator and ASHRAE 90.1 standards.\n`;
            text += `  Actual savings vary by building characteristics, HVAC efficiency, occupancy, and weather.\n`;
        }
    }

    text += `\n\n*** IMPORTANT: ESTIMATE DISCLAIMER ***\n`;
    text += `THIS QUOTE IS PROVIDED AS A GUIDELINE AND ESTIMATE ONLY. ACTUAL MATERIAL QUANTITIES MAY VARY DEPENDING ON FACTORS INCLUDING BUT NOT LIMITED TO: APPLICATION RATES, TRUE MEASUREMENTS, AND WASTE FACTORS.\n\n`;
    text += `THE END-USER IS SOLELY RESPONSIBLE FOR VERIFYING ALL MEASUREMENTS AND SITE CONDITIONS. FINAL APPROVAL OF QUANTITIES AND COSTS RESTS WITH THE PURCHASER.`;

    return text;
  };

  setEmailText(buildEmailText('distributor'));
  setContractorEmailText(buildEmailText('contractor'));
  }, [inputs, estimates, commonResults, prices, profitMargin, showEnergySavings, energyElectricityRate, energyRegion, useMultiSection, roofSections, sectionResults]);

  const copyToClipboard = () => {
    const copyText = (text) => {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
           setCopySuccess(true);
           setTimeout(() => setCopySuccess(false), 2000);
        }).catch(err => {
           console.error("Async: Could not copy text: ", err);
           fallbackCopyText(text);
        });
      } else {
        fallbackCopyText(text);
      }
    };

    const fallbackCopyText = (text) => {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        const successful = document.execCommand('copy');
        if(successful) {
           setCopySuccess(true);
           setTimeout(() => setCopySuccess(false), 2000);
        }
      } catch (err) {
        console.error('Fallback: Oops, unable to copy', err);
      }
      document.body.removeChild(textArea);
    };
    copyText(emailViewMode === 'contractor' ? contractorEmailText : emailText);
  };

  // Helper function for formatting currency - must be defined before generatePDF
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  const generatePDF = async (mode = 'distributor') => {
    if (hasErrors) {
      const proceed = window.confirm(`There are ${Object.keys(validationErrors).length} validation issue(s). Generate PDF anyway?`);
      if (!proceed) return;
    }

    const isContractor = mode === 'contractor';
    const isDistributor = mode === 'distributor';
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 48;
    const contentWidth = pageWidth - 2 * margin;
    const contentTop = margin + 44;
    const contentBottom = 64;

    // Contractor PDF marks distributor prices up to the contractor sell price.
    // adj(price) returns the price the contractor sees on the quote.
    const markupFactor = (isContractor && profitMargin > 0) ? 1 / (1 - profitMargin / 100) : 1;
    const adj = (p) => p * markupFactor;

    // Calculate primers locally to avoid hoisting issues
    const pdfBrand = getBrandFromTopcoat(inputs.selectedTopcoat);
    const pdfPrimers = PRIMER_LOOKUP[pdfBrand];

    // === PALETTE (mirrors DESIGN.md: ink scale and hairlines; amber only for warnings) ===
    const C = {
      ink: [26, 31, 54],
      ink2: [60, 66, 87],
      ink3: [98, 108, 126],
      line: [227, 232, 238],
      lineStrong: [201, 209, 218],
      canvas: [246, 248, 250],
      amber: [180, 83, 9],
    };

    const docTitle = isContractor ? 'Contractor quote' : 'Distributor estimate';
    const fmtNum = (n) => (n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
    const parseISODate = (iso) => {
      const [y, m, d] = (iso || '').split('-').map(Number);
      return y ? new Date(y, m - 1, d) : null;
    };
    const fmtDate = (date) => date ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
    const quoteDay = parseISODate(quoteDate);

    const setText = (size, style = 'normal', color = C.ink) => {
      doc.setFontSize(size);
      doc.setFont('helvetica', style);
      doc.setTextColor(...color);
    };
    const rule = (y, color = C.line, width = 0.75) => {
      doc.setDrawColor(...color);
      doc.setLineWidth(width);
      doc.line(margin, y, pageWidth - margin, y);
    };

    // Optional logos (public/logos). A missing file resolves to null and is skipped.
    const loadImage = (src) => new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(img.naturalWidth > 0 ? img : null);
      img.onerror = () => resolve(null);
      img.src = src;
    });
    const logos = (await Promise.all(['/logos/henry-logo.png', '/logos/enduraroof-logo.png'].map(loadImage))).filter(Boolean);

    // Continuation pages get a compact running header.
    const headedPages = new Set([1]);
    const drawContinuationHeader = () => {
      const page = doc.getCurrentPageInfo().pageNumber;
      if (headedPages.has(page)) return;
      headedPages.add(page);
      setText(9, 'bold');
      doc.text(docTitle, margin, margin + 6);
      setText(9, 'normal', C.ink3);
      if (inputs.projectName) doc.text(inputs.projectName, pageWidth - margin, margin + 6, { align: 'right' });
      rule(margin + 14);
    };
    const ensureSpace = (y, needed) => {
      if (y + needed > pageHeight - contentBottom) {
        doc.addPage();
        drawContinuationHeader();
        return contentTop;
      }
      return y;
    };
    const sectionTitle = (title, y, note) => {
      setText(11, 'bold');
      doc.text(title, margin, y);
      if (note) {
        setText(8, 'normal', C.ink3);
        doc.text(note, pageWidth - margin, y, { align: 'right' });
      }
      return y + 10;
    };

    // Shared table look: plain rows, hairline separators, figures right-aligned.
    // `subs` holds a muted second line per cell, keyed "row:col".
    const plainTable = ({ head, body, columnStyles, subs = {}, rowKinds = [], widths, y }) => {
      autoTable(doc, {
        startY: y,
        head,
        body,
        theme: 'plain',
        styles: {
          font: 'helvetica', fontSize: 9, textColor: C.ink, valign: 'top',
          cellPadding: { top: 6, bottom: 6, left: 5, right: 5 },
          lineColor: C.line, lineWidth: { bottom: 0.5 },
        },
        headStyles: {
          fontSize: 7.5, fontStyle: 'normal', textColor: C.ink3,
          cellPadding: { top: 0, bottom: 5, left: 5, right: 5 },
          lineColor: C.lineStrong, lineWidth: { bottom: 0.75 },
        },
        columnStyles,
        margin: { left: margin, right: margin, top: contentTop, bottom: contentBottom },
        didParseCell: (data) => {
          const last = data.table.columns.length - 1;
          const pad = { ...data.cell.styles.cellPadding };
          if (data.column.index === 0) pad.left = 0;
          if (data.column.index + (data.cell.colSpan || 1) - 1 === last) pad.right = 0;
          data.cell.styles.cellPadding = pad;
          if (data.section === 'head' && columnStyles?.[data.column.index]?.halign) {
            data.cell.styles.halign = columnStyles[data.column.index].halign;
          }
          if (data.section !== 'body') return;
          const kind = rowKinds[data.row.index];
          if (kind === 'subtotal') {
            data.cell.styles.fillColor = C.canvas;
            data.cell.styles.fontStyle = 'bold';
          } else if (kind === 'total') {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fontSize = 10;
            data.cell.styles.cellPadding = { ...pad, top: 9 };
            data.cell.styles.lineWidth = { bottom: 0 };
          } else if (kind === 'total-first') {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fontSize = 10;
            data.cell.styles.cellPadding = { ...pad, top: 10 };
            data.cell.styles.lineColor = C.lineStrong;
            data.cell.styles.lineWidth = { top: 0.75, bottom: 0 };
          } else if (kind === 'total-minor') {
            data.cell.styles.fontSize = 8.5;
            data.cell.styles.textColor = C.ink3;
            data.cell.styles.cellPadding = { ...pad, top: 2, bottom: 3 };
            data.cell.styles.lineWidth = { bottom: 0 };
          }
          // Reserve exact height for the muted second line (drawn in didDrawCell).
          const sub = subs[`${data.row.index}:${data.column.index}`];
          if (sub && widths) {
            const p = data.cell.styles.cellPadding;
            const span = data.cell.colSpan || 1;
            const w = widths.slice(data.column.index, data.column.index + span).reduce((a, b) => a + b, 0) - p.left - p.right;
            const fs = data.cell.styles.fontSize;
            doc.setFont('helvetica', data.cell.styles.fontStyle);
            doc.setFontSize(fs);
            const mainLines = doc.splitTextToSize(data.cell.text.join(' '), w).length;
            doc.setFontSize(7.5);
            const subLines = doc.splitTextToSize(sub.text, w).length;
            data.cell.mainLines = mainLines;
            data.cell.styles.minCellHeight = p.top + p.bottom + mainLines * fs * 1.15 + 1.5 + subLines * 7.5 * 1.25;
          }
        },
        didDrawCell: (data) => {
          if (data.section !== 'body') return;
          const sub = subs[`${data.row.index}:${data.column.index}`];
          if (!sub) return;
          const mainSize = data.cell.styles.fontSize;
          setText(7.5, 'normal', sub.tone === 'warn' ? C.amber : C.ink3);
          const right = data.cell.styles.halign === 'right';
          const avail = data.cell.width - data.cell.padding('left') - data.cell.padding('right');
          const x = right
            ? data.cell.x + data.cell.width - data.cell.padding('right')
            : data.cell.x + data.cell.padding('left');
          const top = data.cell.y + data.cell.padding('top') + (data.cell.mainLines || 1) * mainSize * 1.15 + 1.5;
          doc.text(doc.splitTextToSize(sub.text, avail), x, top, { align: right ? 'right' : 'left', baseline: 'top', lineHeightFactor: 1.25 });
        },
        didDrawPage: drawContinuationHeader,
      });
      return doc.lastAutoTable.finalY;
    };

    // Totals per tier, always the sum of the printed lines (see pricedTotal).
    const sellFactor = profitMargin > 0 ? 1 / (1 - profitMargin / 100) : 1;
    const pdfTotalRows = (perSqFt) => {
      if (isContractor) {
        return [
          { label: 'Total', major: true, value: yr => formatCurrency(pricedTotal(yr, markupFactor)) },
          { label: 'Per sq ft', value: yr => perSqFt(pricedTotal(yr, markupFactor)) },
        ];
      }
      if (profitMargin > 0) {
        return [
          { label: 'Distributor cost', major: true, value: yr => formatCurrency(pricedTotal(yr)) },
          { label: 'Cost per sq ft', value: yr => perSqFt(pricedTotal(yr)) },
          { label: `Contractor price (${profitMargin}% margin)`, major: true, value: yr => formatCurrency(pricedTotal(yr, sellFactor)) },
          { label: 'Contractor price per sq ft', value: yr => perSqFt(pricedTotal(yr, sellFactor)) },
          { label: 'Margin', value: yr => formatCurrency(pricedTotal(yr, sellFactor) - pricedTotal(yr)) },
        ];
      }
      return [
        { label: 'Total', major: true, value: yr => formatCurrency(pricedTotal(yr)) },
        { label: 'Per sq ft', value: yr => perSqFt(pricedTotal(yr)) },
      ];
    };

    // === HEADER ===
    let y = margin;
    if (logos.length > 0) {
      const logoH = 26;
      let x = pageWidth - margin;
      [...logos].reverse().forEach(img => {
        const w = (img.naturalWidth / img.naturalHeight) * logoH;
        x -= w;
        doc.addImage(img, 'PNG', x, y - 4, w, logoH);
        x -= 14;
      });
    }
    setText(22, 'bold');
    doc.text(docTitle, margin, y + 16);
    y += 38;
    if (inputs.projectName) {
      setText(12, 'normal', C.ink2);
      doc.text(inputs.projectName, margin, y);
      y += 15;
    }
    if (customerInfo.projectAddress) {
      setText(9, 'normal', C.ink3);
      doc.text(customerInfo.projectAddress, margin, y);
      y += 13;
    }
    y += 8;
    rule(y, C.ink, 2);
    y += 22;

    // === INFO COLUMNS: quote / prepared for / project ===
    const roofTypeText = useMultiSection && roofSections.length > 0
      ? `${[...new Set(roofSections.map(s => s.roofType))].join(' / ')} (${roofSections.length} sections)`
      : inputs.roofType;
    const factorsText = useMultiSection && roofSections.length > 0
      ? 'Per-section waste and stretch'
      : (() => {
        const wf = Math.round((parseFloat(inputs.wasteFactor) || 0) * 100);
        const sf = Math.round((parseFloat(inputs.stretchFactor) || 0) * 100);
        return `${wf}% waste · ${sf}% stretch`;
      })();

    const quotePairs = [['Date', fmtDate(quoteDay) || quoteDate]];
    if (isContractor && quoteDay) {
      const validUntil = new Date(quoteDay);
      validUntil.setDate(validUntil.getDate() + 30);
      quotePairs.push(['Valid until', fmtDate(validUntil)]);
    }
    if (isDistributor) quotePairs.push(['For', 'Internal use']);
    const summaryTiers = inputs.coatingSystem === 'Aluminum' ? ['10'] : ['10', '15', '20'];
    const summaryLabel = isContractor ? 'Total' : (profitMargin > 0 ? 'Distributor cost' : 'Total');
    const summaryPairs = hasPrices
      ? summaryTiers.map(yr => [`${yr}-year`, formatCurrency(isContractor ? pricedTotal(yr, markupFactor) : pricedTotal(yr))])
      : [];

    const customerLines = [customerInfo.name, customerInfo.company, customerInfo.address, customerInfo.email, customerInfo.phone].filter(Boolean);
    const projectLines = [
      `${inputs.coatingSystem}${inputs.coatingSystem === 'Acrylic' ? ` (${inputs.acrylicSystemType.toLowerCase()})` : ''} coating system`,
      `${roofTypeText} · ${inputs.roofSizeSqFt.toLocaleString()} sq ft (${fmtNum(commonResults.squares)} sq)`,
      inputs.linearFeet > 0 ? `${inputs.linearFeet.toLocaleString()} linear ft of seams` : null,
      factorsText,
      inputs.goldseal ? 'Goldseal manufacturer warranty' : null,
    ].filter(Boolean);

    const columns = [
      { title: 'Quote', pairs: quotePairs, summaryTitle: summaryLabel, summary: summaryPairs },
      ...(customerLines.length > 0 ? [{ title: 'Prepared for', lines: customerLines }] : []),
      { title: 'Project', lines: projectLines },
    ];
    const colGap = 20;
    const colW = (contentWidth - colGap * (columns.length - 1)) / columns.length;
    let infoBottom = y;
    columns.forEach((col, i) => {
      const x = margin + i * (colW + colGap);
      let cy = y;
      setText(8, 'bold', C.ink3);
      doc.text(col.title, x, cy);
      cy += 14;
      if (col.pairs) {
        col.pairs.forEach(([k, v]) => {
          setText(9, 'normal', C.ink3);
          doc.text(k, x, cy);
          setText(9, 'normal', C.ink);
          doc.text(String(v), x + 58, cy);
          cy += 13;
        });
        if (col.summary && col.summary.length > 0) {
          cy += 7;
          setText(8, 'bold', C.ink3);
          doc.text(col.summaryTitle, x, cy);
          cy += 13;
          col.summary.forEach(([k, v]) => {
            setText(9, 'normal', C.ink3);
            doc.text(k, x, cy);
            setText(9, 'bold', C.ink);
            doc.text(v, x + 58, cy);
            cy += 13;
          });
        }
      } else {
        col.lines.forEach((line, li) => {
          setText(9, li === 0 ? 'bold' : 'normal', C.ink);
          doc.splitTextToSize(String(line), colW).forEach(part => {
            doc.text(part, x, cy);
            cy += 13;
          });
        });
      }
      infoBottom = Math.max(infoBottom, cy);
    });
    y = infoBottom + 14;

    // Warning for missing linear feet
    if (inputs.linearFeet <= 0) {
      y = ensureSpace(y, 40);
      setText(9, 'bold', C.amber);
      doc.text('Quote incomplete.', margin, y);
      const lead = doc.getTextWidth('Quote incomplete.  ');
      setText(9, 'normal', C.ink2);
      doc.text('Seam linear feet are missing, so butter grade (seam sealant) is not calculated.', margin + lead, y);
      y += 13;
      if (inputs.roofType === 'Metal' && commonResults.screwBuckets > 0) {
        setText(8.5, 'normal', C.ink3);
        doc.text(`Fastener encapsulation for ~${(commonResults.screwCount || 0).toLocaleString()} screws is included, based on roof area.`, margin, y);
        y += 13;
      }
      y += 8;
    }

    // --- Multi-section table (both modes) ---
    if (useMultiSection && roofSections.length > 0) {
      y = ensureSpace(y, 70);
      y = sectionTitle('Roof sections', y + 6);
      y = plainTable({
        y,
        head: [['Section', 'Roof type', 'Area', 'Seams', 'Waste', 'Stretch']],
        body: roofSections.map(s => [
          s.name,
          s.roofType,
          `${(s.sqFt || 0).toLocaleString()} sq ft`,
          `${(s.linearFeet || 0).toLocaleString()} ft`,
          `${Math.round((s.wasteFactor || 0) * 100)}%`,
          `${Math.round((s.stretchFactor || 0) * 100)}%`,
        ]),
        columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } },
      }) + 24;
    }

    // ============================================================
    // MATERIALS: one table, quantity with its line cost beneath, totals at the foot
    // ============================================================
    const yearsToShow = inputs.coatingSystem === 'Aluminum' ? ['10'] : ['10', '15', '20'];
    const showRates = !useMultiSection;
    // The distributor estimate always shows cost; the contractor quote shows
    // marked-up unit prices whenever prices are entered.
    const showPriceUnit = isContractor ? hasPrices : true;
    const r2 = (v) => Math.round(v * 100) / 100;
    // Line cost from a cents-rounded unit price, so qty × printed price = printed line.
    const lineCost = (qty, price) => (qty > 0 && price > 0) ? r2(qty * r2(adj(price))) : 0;

    // A material row must be shown if ANY warranty year on the PDF calls for it.
    // Acrylic systems add coats at higher warranty tiers (e.g. Topcoat 2/3 only
    // appear at 15/20-yr), so gating on the 10-yr option alone would silently drop
    // those coats from the PDF. Check across every displayed year instead.
    const anyYearHas = (key) => yearsToShow.some(year => (estimates[year]?.[key] || 0) > 0);
    // Rate for a coat across the displayed years: one value when uniform,
    // otherwise "1.5 / 2 / 2.5" in tier order (0 means not applied at that tier).
    const coatRate = (rateKey) => {
      const ratesByYear = yearsToShow.map(yr => estimates[yr]?.rates?.[rateKey] || 0);
      if (!ratesByYear.some(r => r > 0)) return '';
      const allSame = ratesByYear.every(r => r === ratesByYear[0]);
      return allSame ? `${ratesByYear[0]}` : ratesByYear.join(' / ');
    };

    const items = [];
    let unpricedCount = 0;
    // perYear: [{ qty, unit }] per displayed year; price is the distributor's input price.
    const addItem = ({ name, product, rate = '', price = 0, unit, perYear, priced = true, sharedPrice = false }) => {
      const hasQty = perYear.some(c => c.qty > 0);
      const missingPrice = priced && hasPrices && hasQty && !(price > 0) && !sharedPrice;
      if (missingPrice) unpricedCount++;
      items.push({ name, product, rate, price, unit, perYear, priced, missingPrice });
    };
    const tierQty = (field, unit) => yearsToShow.map(yr => ({ qty: estimates[yr]?.[field] || 0, unit }));
    const sameQty = (qty, unit) => yearsToShow.map(() => ({ qty, unit }));

    if (inputs.coatingSystem !== 'Aluminum' && anyYearHas('baseGal')) {
      addItem({ name: 'Basecoat', product: inputs.selectedBasecoat, rate: coatRate('base'), price: prices.basecoat, unit: 'gal', perYear: tierQty('baseGal', 'gal') });
    }
    ['top1Gal', 'top2Gal', 'top3Gal'].forEach((field, i) => {
      if (anyYearHas(field)) {
        addItem({ name: `Topcoat ${i + 1}`, product: inputs.selectedTopcoat, rate: coatRate(`top${i + 1}`), price: prices.topcoat, unit: 'gal', perYear: tierQty(field, 'gal'), sharedPrice: i > 0 });
      }
    });
    let spotPrime = false;
    if (anyYearHas('rustPrimerGal')) {
      addItem({ name: 'Rust primer', product: `${pdfPrimers.rust} · 5-gal pails`, rate: '0.5', price: prices.rustPrimer, unit: 'gal', perYear: tierQty('rustPrimerGal', 'gal') });
    } else if (inputs.hasRust && inputs.rustPrimeMethod === 'spot'
               && (inputs.coatingSystem === 'Silicone' || inputs.coatingSystem === 'Acrylic')
               && inputs.roofType === 'Metal') {
      // Spot-prime: no field calculation, but the contractor still needs the instruction.
      spotPrime = true;
      items.push({ name: 'Rust primer', product: `${pdfPrimers.rust} · ${SPOT_PRIME_NOTE}`, rate: 'Spot prime', price: 0, unit: '', perYear: yearsToShow.map(() => ({ text: 'As needed' })), priced: false });
    }
    if (anyYearHas('adhesionPrimerGal')) {
      addItem({ name: 'Adhesion primer', product: `${pdfPrimers.adhesion} · 1-gal containers`, rate: '0.2', price: prices.adhesionPrimer, unit: 'gal', perYear: tierQty('adhesionPrimerGal', 'gal') });
    }
    const coatingItemCount = items.length;

    if (commonResults.accessoryQty > 0) {
      const accUnit = (commonResults.accessoryUnit || '').toLowerCase();
      // On metal roofs the seam sealer (butter grade) does double duty: sealing
      // seams (by linear feet) and encapsulating fasteners (by roof area). Show
      // those as separate line items so the split is explicit.
      if (commonResults.screwBuckets > 0) {
        if (commonResults.linearBuckets > 0) {
          addItem({ name: 'Seam sealer, seams', product: `${commonResults.accessoryName} · by linear feet`, price: prices.accessory, unit: accUnit, perYear: sameQty(commonResults.linearBuckets, accUnit) });
        }
        addItem({ name: 'Seam sealer, fasteners', product: `${commonResults.accessoryName} · ~${(commonResults.screwCount || 0).toLocaleString()} fasteners`, price: prices.accessory, unit: accUnit, perYear: sameQty(commonResults.screwBuckets, accUnit), sharedPrice: commonResults.linearBuckets > 0 });
      } else {
        addItem({ name: commonResults.accessoryName || 'Accessories', product: commonResults.accessoryDesc || '', price: prices.accessory, unit: accUnit, perYear: sameQty(commonResults.accessoryQty, accUnit) });
      }
    }
    if (commonResults.fastenerCaulkTubes > 0) {
      addItem({ name: 'Fastener caulk', product: `${FASTENER_CAULK_NAME} · ~${FASTENERS_PER_CAULK_TUBE} fasteners/tube`, price: prices.fastenerCaulk, unit: 'tubes', perYear: sameQty(commonResults.fastenerCaulkTubes, 'tubes') });
    }
    if (commonResults.membraneRolls > 0) {
      addItem({ name: 'Reinforcement membrane', product: `40" × 324' rolls`, price: prices.membrane, unit: 'rolls', perYear: sameQty(commonResults.membraneRolls, 'rolls') });
    }

    const unitPriceLabel = (unit) => ({ gal: 'gal', buckets: 'bucket', tubes: 'tube', rolls: 'roll' }[unit] || unit);
    const nonTierCols = 1 + (showRates ? 1 : 0) + (showPriceUnit ? 1 : 0);
    const body = [];
    const subs = {};
    const rowKinds = [];
    const pushRow = (cells, kind = 'item', rowSubs = {}) => {
      const r = body.length;
      body.push(cells);
      rowKinds.push(kind);
      Object.entries(rowSubs).forEach(([col, sub]) => { if (sub) subs[`${r}:${col}`] = sub; });
    };
    const tierStart = nonTierCols;

    const itemRow = (it) => {
      const cells = [it.name];
      const rowSubs = { 0: it.product ? { text: it.product } : null };
      if (showRates) {
        cells.push(it.rate || '');
        if (it.rate && it.unit === 'gal') rowSubs[cells.length - 1] = { text: 'gal/sq' };
      }
      if (showPriceUnit) {
        const col = cells.length;
        if (!it.priced) {
          cells.push('');
        } else if (it.price > 0) {
          cells.push(formatCurrency(adj(it.price)));
          rowSubs[col] = { text: `per ${unitPriceLabel(it.unit)}` };
        } else {
          cells.push('—');
          if (it.missingPrice) rowSubs[col] = { text: 'No price', tone: 'warn' };
        }
      }
      it.perYear.forEach((c, i) => {
        const col = tierStart + i;
        if (c.text) { cells.push(c.text); return; }
        cells.push(c.qty > 0 ? `${fmtNum(c.qty)} ${c.unit}` : '—');
        if (c.qty > 0 && it.price > 0) rowSubs[col] = { text: formatCurrency(lineCost(c.qty, it.price)) };
      });
      pushRow(cells, 'item', rowSubs);
    };

    items.slice(0, coatingItemCount).forEach(itemRow);

    // Total coatings (gallons, and cost when line costs are shown)
    if (yearsToShow.some(yr => (estimates[yr]?.totalGallons || 0) > 0)) {
      const cells = [{ content: 'Total coatings', colSpan: nonTierCols }];
      const rowSubs = {};
      yearsToShow.forEach((yr, i) => {
        const est = estimates[yr] || {};
        cells.push(`${fmtNum(est.totalGallons)} gal`);
        const coatCost = r2(items.slice(0, coatingItemCount).reduce((sum, it) => sum + lineCost(it.perYear[i]?.qty || 0, it.price), 0));
        if (coatCost > 0) rowSubs[tierStart + i] = { text: formatCurrency(coatCost) };
      });
      pushRow(cells, 'subtotal', rowSubs);
    }

    items.slice(coatingItemCount).forEach(itemRow);

    if (inputs.goldseal) {
      // The Goldseal warranty charge is derived from roof area, not from the
      // per-gallon material prices, so it is a known dollar amount even when no
      // material prices have been entered.
      const cells = ['Goldseal warranty'];
      if (showRates) cells.push('');
      if (showPriceUnit) cells.push('');
      yearsToShow.forEach(yr => {
        const gc = estimates[yr]?.goldsealCost || 0;
        cells.push(gc > 0 ? formatCurrency(r2(adj(gc))) : 'Included');
      });
      pushRow(cells, 'item', { 0: { text: 'Manufacturer warranty, priced per term' } });
    }

    // Totals at the foot of the table
    if (hasPrices) {
      const perSqFt = (v) => inputs.roofSizeSqFt > 0 ? formatCurrency(v / inputs.roofSizeSqFt) : null;
      const totalRows = pdfTotalRows(perSqFt);
      totalRows.filter(t => !(t.label.includes('sq ft') && !(inputs.roofSizeSqFt > 0))).forEach((t, i) => {
        const cells = [{ content: t.label, colSpan: nonTierCols }, ...yearsToShow.map(yr => t.value(yr) || '')];
        const kind = i === 0 ? 'total-first' : (t.major ? 'total' : 'total-minor');
        const rowSubs = {};
        if (i === 0 && unpricedCount > 0) rowSubs[0] = { text: `Excludes ${unpricedCount} unpriced item${unpricedCount > 1 ? 's' : ''}`, tone: 'warn' };
        pushRow(cells, kind, rowSubs);
      });
    }

    y = ensureSpace(y, 120);
    y = sectionTitle('Materials', y + 6, 'Quantities rounded up to full containers');
    const head = [['Product']];
    if (showRates) head[0].push('Rate');
    if (showPriceUnit) head[0].push('Unit price');
    head[0].push(...yearsToShow.map(yr => `${yr}-year`));
    const fixedWidths = [
      ...(showRates ? [62] : []),
      ...(showPriceUnit ? [64] : []),
      ...yearsToShow.map(() => (yearsToShow.length === 1 ? 110 : 74)),
    ];
    const widths = [contentWidth - fixedWidths.reduce((a, b) => a + b, 0), ...fixedWidths];
    const columnStyles = {};
    widths.forEach((w, i) => { columnStyles[i] = { cellWidth: w, halign: i === 0 ? 'left' : 'right' }; });
    if (showRates) columnStyles[1].textColor = C.ink2;
    y = plainTable({ y, head, body, columnStyles, subs, rowKinds, widths });
    y += 14;
    if (spotPrime) {
      setText(8.5, 'normal', C.ink3);
      doc.text(`Rust primer is spot prime only: ${SPOT_PRIME_NOTE}. No field quantity calculated.`, margin, y);
      y += 14;
    }

    // ============================================================
    // ENERGY SAVINGS (both modes if enabled)
    // ============================================================
    const energySavingsForPDF = showEnergySavings ? calculateEnergySavingsForExport(energyElectricityRate) : null;
    if (energySavingsForPDF) {
      const e = energySavingsForPDF;
      y = ensureSpace(y + 10, 200);
      y = sectionTitle('Energy savings estimate', y, `${e.regionName} · climate zone ${e.climateZone}`);
      y = plainTable({
        y,
        head: [['', '']],
        body: [
          ['Annual savings', `$${e.annualSavingsLow.toLocaleString()} – $${e.annualSavingsHigh.toLocaleString()}`],
          ['Energy reduction', `${e.annualKwhSavings.toLocaleString()} kWh per year`],
          ['Peak cooling offset', `${e.tonsOfCooling} tons of AC`],
          ['Cumulative savings, 10-year', `$${e.roi10Year.toLocaleString()}`],
          ['Cumulative savings, 15-year', `$${e.roi15Year.toLocaleString()}`],
          ['Cumulative savings, 20-year', `$${e.roi20Year.toLocaleString()}`],
        ],
        columnStyles: { 1: { halign: 'right', cellWidth: 180 } },
      }) + 8;
      setText(8, 'normal', C.ink3);
      doc.text('Cumulative savings assume a 3% annual electricity rate increase.', margin, y);
      y += 20;

      y = ensureSpace(y, 130);
      setText(8, 'bold', C.ink3);
      doc.text('Assumptions (highly conservative)', margin, y);
      y += 13;
      const assumptionRows = [
        ['Reflectivity change', `${e.beforeRoof} to ${e.afterRoof} (+${e.deltaReflectance}%)`],
        ['Climate', `${e.cdd.toLocaleString()} cooling degree days · ${e.solarRadiation} kWh/m²/yr solar radiation`],
        ['HVAC efficiency', 'SEER 13 (typical commercial)'],
        ['Electricity rate', `$${energyElectricityRate}/kWh`],
        ['Conservative factors', `Cooling season ${e.coolingSeasonPct}%, building reality 40%, heat transfer 35%`],
        ['Industry range target', 'Low end of $0.25 – $0.75 per sq ft per year'],
      ];
      assumptionRows.forEach(([k, v]) => {
        setText(8.5, 'normal', C.ink3);
        doc.text(k, margin, y);
        setText(8.5, 'normal', C.ink2);
        doc.text(v, margin + 120, y);
        y += 12;
      });
      y += 4;
      setText(7.5, 'normal', C.ink3);
      const sourceSplit = doc.splitTextToSize('Source: DOE / LBNL Cool Roof Calculator and ASHRAE 90.1. Actual savings vary by building characteristics, HVAC efficiency, occupancy patterns and weather conditions.', contentWidth);
      doc.text(sourceSplit, margin, y);
      y += sourceSplit.length * 10 + 8;
    }

    // ============================================================
    // TERMS
    // ============================================================
    const disclaimerText = isContractor
      ? 'This quote is provided as a guideline and estimate. Material quantities are calculated from the dimensions and application rates shown above and may vary based on actual site conditions, measurements, and waste. Pricing valid for 30 days from quote date unless otherwise noted. Final approval of quantities rests with the purchaser.'
      : 'This quote is provided as a guideline and estimate only. Actual material quantities may vary depending on factors including but not limited to application rates, true measurements, and waste factors. The end-user is solely responsible for verifying all measurements and site conditions. Final approval of quantities and costs rests with the purchaser.';
    setText(7.5, 'normal', C.ink3);
    const splitDisclaimer = doc.splitTextToSize(disclaimerText, contentWidth * 0.72);
    y = ensureSpace(y + 6, splitDisclaimer.length * 10 + 24);
    setText(8, 'bold', C.ink2);
    doc.text('Terms', margin, y);
    y += 12;
    setText(7.5, 'normal', C.ink3);
    doc.text(splitDisclaimer, margin, y, { lineHeightFactor: 1.4 });

    // ============================================================
    // FOOTERS — render after all content so we know total page count
    // ============================================================
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      const fy = pageHeight - 36;
      rule(fy - 12);
      setText(7.5, 'normal', C.ink3);
      const footLeft = [isContractor ? 'Contractor quote' : 'Distributor estimate · internal', inputs.projectName].filter(Boolean).join(' · ');
      doc.text(footLeft, margin, fy);
      doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin, fy, { align: 'right' });
    }

    // Save
    const suffix = isContractor ? '_Contractor_Quote.pdf' : '_Distributor_Estimate.pdf';
    const fileName = inputs.projectName
      ? `${inputs.projectName.replace(/[^a-z0-9]/gi, '_')}${suffix}`
      : `Roofing${suffix}`;
    doc.save(fileName);
  };

  const currentOptions = PRODUCT_OPTIONS[inputs.coatingSystem];
  const brand = getBrandFromTopcoat(inputs.selectedTopcoat);
  const currentPrimers = PRIMER_LOOKUP[brand];

  // Compute grand totals per warranty year for reuse in table and $/sqft
  const hasPrices = prices.basecoat > 0 || prices.topcoat > 0 || prices.adhesionPrimer > 0 || prices.rustPrimer > 0 || prices.accessory > 0 || prices.membrane > 0 || prices.fastenerCaulk > 0;
  const grandTotals = {};
  ['10', '15', '20'].forEach(year => {
    const est = estimates[year];
    if (!est) return;
    grandTotals[year] = (est.baseGal || 0) * prices.basecoat +
      (est.top1Gal || 0) * prices.topcoat +
      (est.top2Gal || 0) * prices.topcoat +
      (est.top3Gal || 0) * prices.topcoat +
      (est.adhesionPrimerGal || 0) * prices.adhesionPrimer +
      (est.rustPrimerGal || 0) * prices.rustPrimer +
      (commonResults.accessoryQty || 0) * prices.accessory +
      (commonResults.membraneRolls || 0) * prices.membrane +
      (commonResults.fastenerCaulkTubes || 0) * prices.fastenerCaulk +
      (est.goldsealCost || 0);
  });

  // Sum of priced lines at a markup factor. Each line is quantity × a cents-rounded
  // unit price, rounded to cents, so printed lines always add up to the printed total.
  const pricedTotal = (year, factor = 1) => {
    const est = estimates[year];
    if (!est) return 0;
    const r2 = (v) => Math.round(v * 100) / 100;
    const line = (qty, price) => (qty > 0 && price > 0) ? r2(qty * r2(price * factor)) : 0;
    return r2(line(est.baseGal, prices.basecoat) + line(est.top1Gal, prices.topcoat) + line(est.top2Gal, prices.topcoat)
      + line(est.top3Gal, prices.topcoat) + line(est.adhesionPrimerGal, prices.adhesionPrimer) + line(est.rustPrimerGal, prices.rustPrimer)
      + line(commonResults.accessoryQty, prices.accessory) + line(commonResults.membraneRolls, prices.membrane)
      + line(commonResults.fastenerCaulkTubes, prices.fastenerCaulk) + r2((est.goldsealCost || 0) * factor));
  };

  // Validation error display helper
  const ValidationError = ({ field }) => {
    const err = validationErrors[field];
    if (!err) return null;
    return <div className="text-xs text-red-600 mt-1 flex items-center gap-1"><AlertTriangle size={12} />{err}</div>;
  };


  // Available roof types for current coating system (used in multi-section)
  const getAvailableRoofTypes = () => {
    const types = ['Capsheet'];
    if (inputs.coatingSystem !== 'Aluminum') types.push('Single-Ply');
    if (inputs.coatingSystem !== 'Aluminum' && (inputs.coatingSystem === 'Silicone' || inputs.acrylicSystemType === 'Standard')) types.push('Sprayfoam');
    if (inputs.coatingSystem === 'Silicone' || inputs.acrylicSystemType === 'Standard' || inputs.coatingSystem === 'Aluminum') types.push('Metal');
    return types;
  };

  const getComparisonData = () => {
    const quotes = selectedForCompare.map(id => savedQuotes.find(sq => sq.id === id)).filter(Boolean);
    const rows = [];
    rows.push({ label: 'System', values: quotes.map(q => q.inputs.coatingSystem + (q.inputs.coatingSystem === 'Acrylic' ? ` (${q.inputs.acrylicSystemType})` : '')) });
    rows.push({ label: 'Roof Type', values: quotes.map(q => q.inputs.roofType) });
    rows.push({ label: 'Roof Size', values: quotes.map(q => `${(q.inputs.roofSizeSqFt || 0).toLocaleString()} sqft`) });
    rows.push({ label: 'Customer', values: quotes.map(q => q.customerInfo?.name || q.customerInfo?.company || '-') });
    ['10', '15', '20'].forEach(year => {
      const yearData = quotes.map(q => {
        if (!q.estimates?.[year]) return null;
        const est = q.estimates[year];
        const p = q.prices || {};
        const priceTotal = (est.baseGal || 0) * (p.basecoat || 0) + (est.top1Gal || 0) * (p.topcoat || 0) + (est.top2Gal || 0) * (p.topcoat || 0) + (est.top3Gal || 0) * (p.topcoat || 0) + (est.adhesionPrimerGal || 0) * (p.adhesionPrimer || 0) + (est.rustPrimerGal || 0) * (p.rustPrimer || 0) + ((q.commonResults?.accessoryQty || 0) * (p.accessory || 0)) + ((q.commonResults?.membraneRolls || 0) * (p.membrane || 0)) + ((q.commonResults?.fastenerCaulkTubes || 0) * (p.fastenerCaulk || 0)) + (est.goldsealCost || 0);
        return { priceTotal, gallons: est.totalGallons || 0, sqft: q.inputs.roofSizeSqFt || 0 };
      });
      if (yearData.every(d => d === null)) return;
      const hasPrices = yearData.some(d => d !== null && d.priceTotal > 0);
      if (hasPrices) {
        rows.push({ label: `${year}-Year Distributor Cost`, values: yearData.map(d => d === null ? 'N/A' : d.priceTotal === 0 ? 'No prices' : formatCurrency(d.priceTotal)) });
      }
      rows.push({ label: `${year}-Year Gallons`, values: yearData.map(d => d === null ? 'N/A' : d.gallons === 0 ? '-' : `${d.gallons} gal`) });
      if (hasPrices) {
        rows.push({ label: `${year}-Year $/sqft`, values: yearData.map(d => { if (d === null || d.priceTotal === 0 || d.sqft === 0) return '-'; return `${formatCurrency(d.priceTotal / d.sqft)}/sqft`; }) });
      }
    });
    rows.push({ label: 'Goldseal Warranty', values: quotes.map(q => q.inputs.goldseal ? 'Yes' : 'No') });
    rows.push({ label: 'Quote Date', values: quotes.map(q => q.date || new Date(q.savedAt).toLocaleDateString()) });
    return { quotes, rows, headers: quotes.map(q => q.inputs.projectName || 'Untitled') };
  };

  const copyComparisonText = () => {
    const { rows, headers } = getComparisonData();
    const colWidth = 22;
    const labelWidth = 20;
    let text = 'QUOTE COMPARISON\n';
    text += '='.repeat(labelWidth + headers.length * colWidth) + '\n';
    text += ''.padEnd(labelWidth) + headers.map(h => h.padStart(colWidth)).join('') + '\n';
    text += '-'.repeat(labelWidth + headers.length * colWidth) + '\n';
    rows.forEach(row => {
      text += row.label.padEnd(labelWidth) + row.values.map(v => v.padStart(colWidth)).join('') + '\n';
    });
    text += '='.repeat(labelWidth + headers.length * colWidth) + '\n';
    const doCopy = (t) => {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(t).then(() => { setCompCopied(true); setTimeout(() => setCompCopied(false), 2000); });
      } else {
        const ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.left = '-9999px'; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); setCompCopied(true); setTimeout(() => setCompCopied(false), 2000); } catch(e) {}
        document.body.removeChild(ta);
      }
    };
    doCopy(text);
  };

  const downloadComparisonPDF = () => {
    const quotes = selectedForCompare.map(id => savedQuotes.find(sq => sq.id === id)).filter(Boolean);
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 48;
    const contentWidth = pageWidth - 2 * margin;
    // Palette mirrors DESIGN.md (ink scale, hairlines, success for best-value marks)
    const ink = [26, 31, 54], ink3 = [98, 108, 126], line = [227, 232, 238], lineStrong = [201, 209, 218], canvas = [246, 248, 250], success = [21, 128, 61];
    const fmtDate = (q) => {
      const [y, m, d] = (q.date || '').split('-').map(Number);
      const date = y ? new Date(y, m - 1, d) : new Date(q.savedAt);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };
    // Raw distributor prices, no margin (same basis as the on-screen comparison)
    const costOf = (q, year) => {
      const est = q.estimates?.[year];
      if (!est) return null;
      const p = q.prices || {};
      return (est.baseGal || 0) * (p.basecoat || 0) + (est.top1Gal || 0) * (p.topcoat || 0) + (est.top2Gal || 0) * (p.topcoat || 0)
        + (est.top3Gal || 0) * (p.topcoat || 0) + (est.adhesionPrimerGal || 0) * (p.adhesionPrimer || 0) + (est.rustPrimerGal || 0) * (p.rustPrimer || 0)
        + (q.commonResults?.accessoryQty || 0) * (p.accessory || 0) + (q.commonResults?.membraneRolls || 0) * (p.membrane || 0)
        + (q.commonResults?.fastenerCaulkTubes || 0) * (p.fastenerCaulk || 0) + (est.goldsealCost || 0);
    };

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(...ink);
    doc.text('Quote comparison', margin, margin + 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...ink3);
    doc.text(`${quotes.length} saved quotes · distributor cost, no margin · ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`, margin, margin + 34);
    doc.setDrawColor(...ink);
    doc.setLineWidth(2);
    doc.line(margin, margin + 46, pageWidth - margin, margin + 46);

    const labelW = 150;
    const valueW = (contentWidth - labelW) / quotes.length;
    const head = [['', ...quotes.map(q => q.inputs.projectName || 'Untitled')]];
    const columnStyles = { 0: { halign: 'left', cellWidth: labelW, textColor: ink3 } };
    quotes.forEach((_, i) => { columnStyles[i + 1] = { cellWidth: valueW }; });
    const base = {
      theme: 'plain',
      styles: { font: 'helvetica', fontSize: 9, textColor: ink, cellPadding: { top: 6, bottom: 6, left: 5, right: 5 }, halign: 'right', lineColor: line, lineWidth: { bottom: 0.5 } },
      headStyles: { fontStyle: 'bold', textColor: ink, lineColor: lineStrong, lineWidth: { bottom: 0.75 } },
      columnStyles,
      margin: { left: margin, right: margin, bottom: 64 },
    };
    const edgePadding = (data) => {
      if (data.column.index === 0) data.cell.styles.cellPadding = { ...data.cell.styles.cellPadding, left: 0 };
      if (data.column.index === data.table.columns.length - 1) data.cell.styles.cellPadding = { ...data.cell.styles.cellPadding, right: 0 };
    };

    // Facts per quote
    autoTable(doc, {
      ...base,
      startY: margin + 70,
      head,
      body: [
        ['System', ...quotes.map(q => q.inputs.coatingSystem + (q.inputs.coatingSystem === 'Acrylic' ? ` (${q.inputs.acrylicSystemType.toLowerCase()})` : ''))],
        ['Roof', ...quotes.map(q => `${q.inputs.roofType} · ${(q.inputs.roofSizeSqFt || 0).toLocaleString()} sq ft`)],
        ['Customer', ...quotes.map(q => q.customerInfo?.name || q.customerInfo?.company || '—')],
        ['Goldseal warranty', ...quotes.map(q => q.inputs.goldseal ? 'Yes' : 'No')],
        ['Quote date', ...quotes.map(fmtDate)],
      ],
      didParseCell: edgePadding,
    });

    // Tiers: cost, per sq ft, gallons; best values marked
    const body = [];
    const kinds = [];
    const marks = {};
    ['10', '15', '20'].forEach(year => {
      const data = quotes.map(q => {
        const est = q.estimates?.[year];
        if (!est) return null;
        const cost = costOf(q, year);
        const sqft = q.inputs.roofSizeSqFt || 0;
        return { cost, perSqFt: cost > 0 && sqft > 0 ? cost / sqft : null, gallons: est.totalGallons || 0 };
      });
      if (data.every(d => d === null)) return;
      // A mark goes to a single winner only; ties carry no mark
      const minOf = (key) => {
        const vals = data.filter(d => d && d[key] > 0).map(d => d[key]);
        if (vals.length < 2) return null;
        const min = Math.min(...vals);
        return vals.filter(v => v === min).length === 1 ? min : null;
      };
      const minCost = minOf('cost'), minSq = minOf('perSqFt'), minGal = minOf('gallons');
      body.push([{ content: `${year}-year`, colSpan: quotes.length + 1 }]); kinds.push('group');
      const priced = data.some(d => d && d.cost > 0);
      if (priced) {
        data.forEach((d, i) => { if (d && d.cost === minCost) marks[`${body.length}:${i + 1}`] = 'Best value'; });
        body.push(['Distributor cost', ...data.map(d => d === null ? 'N/A' : d.cost > 0 ? formatCurrency(d.cost) : 'No prices')]); kinds.push('total');
        data.forEach((d, i) => { if (d && d.perSqFt === minSq && minSq !== null) marks[`${body.length}:${i + 1}`] = 'Lowest'; });
        body.push(['Per sq ft', ...data.map(d => d === null || d.perSqFt === null ? '—' : formatCurrency(d.perSqFt))]); kinds.push('item');
      }
      // Matches the screen: least material is marked only when no prices are entered
      if (!priced) data.forEach((d, i) => { if (d && d.gallons === minGal && minGal !== null) marks[`${body.length}:${i + 1}`] = 'Least material'; });
      body.push(['Coating gallons', ...data.map(d => d === null ? 'N/A' : d.gallons > 0 ? `${d.gallons.toLocaleString()} gal` : '—')]); kinds.push('item');
    });

    autoTable(doc, {
      ...base,
      startY: doc.lastAutoTable.finalY + 26,
      head: [['', ...quotes.map(() => '')]],
      showHead: 'never',
      body,
      didParseCell: (data) => {
        edgePadding(data);
        const kind = kinds[data.row.index];
        if (kind === 'group') {
          data.cell.styles.fillColor = canvas;
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = ink;
          data.cell.styles.halign = 'left';
        } else if (kind === 'total') {
          data.cell.styles.fontStyle = 'bold';
          if (data.column.index === 0) data.cell.styles.textColor = ink;
        }
        if (Object.keys(marks).some(k => k.startsWith(`${data.row.index}:`))) {
          data.cell.styles.minCellHeight = 12 + 9 * 1.15 + 1.5 + 7.5 * 1.25;
        }
      },
      didDrawCell: (data) => {
        const mark = marks[`${data.row.index}:${data.column.index}`];
        if (!mark) return;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(...success);
        const x = data.cell.x + data.cell.width - data.cell.padding('right');
        doc.text(mark, x, data.cell.y + data.cell.padding('top') + 9 * 1.15 + 1.5, { align: 'right', baseline: 'top' });
      },
    });

    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setDrawColor(...line);
      doc.setLineWidth(0.75);
      doc.line(margin, pageHeight - 48, pageWidth - margin, pageHeight - 48);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...ink3);
      doc.text('Quote comparison · internal, distributor cost', margin, pageHeight - 36);
      doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin, pageHeight - 36, { align: 'right' });
    }
    doc.save('quote-comparison.pdf');
  };

  // --- RENDER HELPERS ---
  // Plain render functions (not components) so inputs keep focus across re-renders.
  const tiers = inputs.coatingSystem === 'Aluminum' ? ['10'] : ['10', '15', '20'];
  const colCount = tiers.length + 2;
  const marginFactor = profitMargin > 0 ? 1 / (1 - profitMargin / 100) : 1;
  const fmtQty = (n) => (n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
  const hasCoatingPrices = prices.basecoat > 0 || prices.topcoat > 0 || prices.adhesionPrimer > 0 || prices.rustPrimer > 0;
  const coatingCost = (year) => {
    const e = estimates[year] || {};
    return (e.baseGal || 0) * prices.basecoat +
      (e.top1Gal || 0) * prices.topcoat +
      (e.top2Gal || 0) * prices.topcoat +
      (e.top3Gal || 0) * prices.topcoat +
      (e.adhesionPrimerGal || 0) * prices.adhesionPrimer +
      (e.rustPrimerGal || 0) * prices.rustPrimer;
  };
  const isReinforced = inputs.coatingSystem === 'Acrylic' && inputs.acrylicSystemType === 'Reinforced';
  const showAccessory = inputs.linearFeet > 0 || (inputs.roofType === 'Metal' && (commonResults.screwBuckets > 0 || commonResults.fastenerCaulkTubes > 0));
  const hasAccessoryRows = showAccessory || commonResults.fastenerCaulkTubes > 0 || isReinforced;
  const accUnitSingular = commonResults.accessoryUnit === 'Buckets' ? 'bucket' : 'roll';
  const roofTypeLabel = useMultiSection && roofSections.length > 0 ? [...new Set(roofSections.map(s => s.roofType))].join(' / ') : inputs.roofType;
  const systemLabel = inputs.coatingSystem === 'Acrylic' ? `Acrylic, ${inputs.acrylicSystemType.toLowerCase()}` : inputs.coatingSystem;
  const factorsLabel = useMultiSection && roofSections.length > 0
    ? 'Per-section waste and stretch'
    : `${Math.round(inputs.wasteFactor * 100)}% waste · ${Math.round(inputs.stretchFactor * 100)}% stretch`;
  // Line items on screen that have a quantity but no price yet; totals exclude them
  const lineItems = [
    { key: 'basecoat', show: inputs.coatingSystem !== 'Aluminum' && estimates['10']?.baseGal > 0 },
    { key: 'rustPrimer', show: estimates['10']?.rustPrimerGal > 0 },
    { key: 'adhesionPrimer', show: !inputs.passedAdhesion },
    { key: 'topcoat', show: tiers.some(y => estimates[y]?.top1Gal > 0) },
    { key: 'accessory', show: showAccessory && (commonResults.accessoryQty > 0 || commonResults.screwBuckets > 0 || commonResults.linearBuckets > 0) },
    { key: 'fastenerCaulk', show: commonResults.fastenerCaulkTubes > 0 },
    { key: 'membrane', show: isReinforced && commonResults.membraneRolls > 0 },
  ];
  const unpriced = hasPrices ? lineItems.filter(i => i.show && !(prices[i.key] > 0)) : [];
  const isUnpriced = (key) => unpriced.some(i => i.key === key);
  const unpricedNote = unpriced.length > 0 ? `Excludes ${unpriced.length} unpriced item${unpriced.length > 1 ? 's' : ''}` : null;
  const leadTier = tiers.includes(mobileTier) ? mobileTier : '10';
  // On phones only the selected warranty tier column is shown
  const tierCls = (y) => (y === leadTier ? '' : 'hidden sm:table-cell');

  const productCell = (name, detail, extra) => (
    <td className="sm:min-w-[190px]">
      <div className="font-medium text-ink">{name}</div>
      {detail && <div className="text-xs text-ink-3 mt-0.5 leading-snug">{detail}</div>}
      {extra}
    </td>
  );

  const priceCell = (key, unit) => (
    <td className="whitespace-nowrap">
      <div className="relative inline-block print:hidden">
        <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[13px] text-ink-3">$</span>
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          placeholder="0.00"
          aria-label={`Price per ${unit}`}
          value={prices[key] || ''}
          onChange={(e) => handlePriceChange(key, e.target.value)}
          className={`input input-sm num w-[76px] sm:w-[92px] pl-5 text-right ${isUnpriced(key) ? '!border-amber-400 bg-amber-50/60' : ''}`}
        />
      </div>
      <span className="hidden print-value num">{prices[key] > 0 ? formatCurrency(prices[key]) : '—'}</span>
      <div className={`text-xs mt-1 num ${isUnpriced(key) ? 'text-amber-700' : 'text-ink-3'}`}>
        {isUnpriced(key) ? 'No price' : profitMargin > 0 && prices[key] > 0 ? `sells at ${formatCurrency(prices[key] * marginFactor)}` : `per ${unit}`}
      </div>
    </td>
  );

  const sameAsCell = (text) => <td className="text-xs text-ink-3 pt-3">{text}</td>;

  const qtyCell = (key, qty, unit, price) => (
    <td key={key} className={`num whitespace-nowrap ${tierCls(key)}`}>
      {qty > 0 ? (
        <>
          <div className="text-ink font-medium">{fmtQty(qty)} <span className="text-ink-3 font-normal">{unit}</span></div>
          {price > 0 && <div className="text-xs text-ink-3 mt-0.5">{formatCurrency(qty * price)}</div>}
        </>
      ) : (
        <span className="text-ink-4">—</span>
      )}
    </td>
  );

  const tierQtyCells = (field, unit, price) => tiers.map(y => qtyCell(y, estimates[y]?.[field] || 0, unit, price));
  const commonQtyCells = (qty, unit, price) => tiers.map(y => qtyCell(y, qty, unit, price));

  const switchRow = (label, checked, onToggle, desc) => (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <div className="text-sm text-ink">{label}</div>
        {desc && <div className="text-xs text-ink-3 mt-0.5">{desc}</div>}
      </div>
      <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={onToggle} className="switch">
        <span />
      </button>
    </div>
  );

  const segButton = (label, pressed, onClick) => (
    <button key={label} type="button" aria-pressed={pressed} onClick={onClick} className="seg-btn">{label}</button>
  );

  const percentOptions = (max) => [0, 5, 10, 15, 20, 25, 30].filter(v => v <= max).map(v => (
    <option key={v} value={v === 0 ? '0' : (v / 100).toFixed(2)}>{v}%</option>
  ));

  return (
    <div className="min-h-screen pb-20 lg:pb-0 print:bg-white print:pb-0">

      {/* TOP BAR */}
      <header className="sticky top-0 z-30 bg-white border-b border-line print:hidden">
        <div className="max-w-[1320px] mx-auto h-14 px-4 lg:px-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Layers size={18} className="hidden sm:block text-ink shrink-0" aria-hidden="true" />
            <h1 className="text-sm sm:text-[15px] font-semibold tracking-[-0.01em] truncate">
              <span className="sm:hidden">Roofing Calculator</span>
              <span className="hidden sm:inline">Roofing Materials Calculator</span>
            </h1>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            {hasErrors && (
              <button onClick={() => setShowValidationSummary(!showValidationSummary)} className="btn-ghost text-red-700 hover:text-red-800 hover:bg-red-50" aria-expanded={showValidationSummary}>
                <AlertTriangle size={15} />
                <span className="num">{Object.keys(validationErrors).length}</span>
                <span className="hidden md:inline">issue{Object.keys(validationErrors).length > 1 ? 's' : ''}</span>
              </button>
            )}
            <div className="relative">
              <button onClick={() => setShowSaved(!showSaved)} className="btn-secondary" aria-expanded={showSaved} aria-label="Saved quotes">
                <FileText size={15} />
                <span className="hidden sm:inline">Saved</span>
                <span className="num text-ink-3">{savedQuotes.length}</span>
                <ChevronDown size={14} className="text-ink-3" />
              </button>
              {showSaved && (
                <>
                  <button className="fixed inset-0 z-40 cursor-default" aria-label="Close saved quotes" onClick={() => { setShowSaved(false); setCompareMode(false); setSelectedForCompare([]); }} />
                  <div className="absolute right-0 top-10 z-50 w-[340px] max-w-[calc(100vw-2rem)] panel shadow-pop overflow-hidden">
                    <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-line">
                      <span className="text-[13px] font-semibold">Saved quotes</span>
                      {savedQuotes.length >= 2 && (
                        <button
                          onClick={() => { setCompareMode(!compareMode); setSelectedForCompare([]); }}
                          className="text-[13px] font-medium text-accent-600 hover:text-accent-700"
                        >
                          {compareMode ? 'Cancel' : 'Compare…'}
                        </button>
                      )}
                    </div>
                    {savedQuotes.length === 0 ? (
                      <p className="px-3.5 py-6 text-[13px] text-ink-3 text-center">No saved quotes yet. Use Save quote to keep this one.</p>
                    ) : (
                      <ul className="max-h-80 overflow-y-auto divide-y divide-line">
                        {savedQuotes.map(quote => (
                          <li key={quote.id} className="flex items-center gap-2 px-3.5 py-2 hover:bg-canvas">
                            {compareMode && (
                              <input
                                type="checkbox"
                                aria-label={`Compare ${quote.inputs.projectName || 'Untitled'}`}
                                checked={selectedForCompare.includes(quote.id)}
                                onChange={(e) => {
                                  if (e.target.checked && selectedForCompare.length < 3) {
                                    setSelectedForCompare([...selectedForCompare, quote.id]);
                                  } else if (!e.target.checked) {
                                    setSelectedForCompare(selectedForCompare.filter(id => id !== quote.id));
                                  }
                                }}
                                disabled={!selectedForCompare.includes(quote.id) && selectedForCompare.length >= 3}
                                className="h-4 w-4"
                              />
                            )}
                            <button
                              onClick={() => { if (!compareMode) { loadQuote(quote); setShowSaved(false); showToast(`Loaded ${quote.inputs.projectName || 'untitled quote'}`); } }}
                              className={`text-left flex-1 min-w-0 ${compareMode ? 'cursor-default' : ''}`}
                            >
                              <div className="text-[13px] font-medium truncate">{quote.inputs.projectName || 'Untitled'}</div>
                              <div className="text-xs text-ink-3 truncate">
                                {quote.inputs.coatingSystem} on {quote.inputs.roofType} · {new Date(quote.savedAt).toLocaleDateString()}
                              </div>
                            </button>
                            {!compareMode && (
                              <button onClick={() => deleteQuote(quote.id)} className="icon-btn hover:text-red-700" aria-label={`Delete ${quote.inputs.projectName || 'Untitled'}`}>
                                <Trash2 size={14} />
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                    {compareMode && (
                      <div className="flex items-center justify-between px-3.5 py-2.5 border-t border-line bg-canvas">
                        <span className="text-xs text-ink-3">Pick 2 or 3 quotes</span>
                        <button
                          disabled={selectedForCompare.length < 2}
                          onClick={() => { setShowComparison(true); setShowSaved(false); }}
                          className="btn-primary h-7"
                        >
                          Compare{selectedForCompare.length > 0 ? ` (${selectedForCompare.length})` : ''}
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="relative md:hidden">
              <button onClick={() => setShowMore(!showMore)} className="btn-secondary px-2" aria-expanded={showMore} aria-label="More actions">
                <MoreHorizontal size={16} />
              </button>
              {showMore && (
                <>
                  <button className="fixed inset-0 z-40 cursor-default" aria-label="Close menu" onClick={() => setShowMore(false)} />
                  <div className="absolute right-0 top-10 z-50 w-48 panel shadow-pop py-1">
                    <label className="flex items-center gap-2.5 px-3 h-9 text-[13px] text-ink-2 hover:bg-canvas cursor-pointer">
                      <Upload size={15} className="text-ink-3" /> Import quote file
                      <input type="file" accept=".json" onChange={(e) => { importQuote(e); setShowMore(false); }} className="hidden" />
                    </label>
                    <button onClick={() => { exportQuote(); setShowMore(false); }} className="w-full flex items-center gap-2.5 px-3 h-9 text-[13px] text-ink-2 hover:bg-canvas">
                      <Download size={15} className="text-ink-3" /> Export quote file
                    </button>
                    <button onClick={() => { setShowMore(false); window.print(); }} className="w-full flex items-center gap-2.5 px-3 h-9 text-[13px] text-ink-2 hover:bg-canvas">
                      <Printer size={15} className="text-ink-3" /> Print
                    </button>
                  </div>
                </>
              )}
            </div>
            <label className="btn-secondary cursor-pointer hidden md:inline-flex" aria-label="Import quote file" title="Import quote file">
              <Upload size={15} />
              <span>Import</span>
              <input type="file" accept=".json" onChange={importQuote} className="hidden" />
            </label>
            <button onClick={exportQuote} className="btn-secondary hidden md:inline-flex" aria-label="Export quote file" title="Export quote file">
              <Download size={15} />
              <span>Export</span>
            </button>
            <button onClick={() => window.print()} className="btn-secondary hidden md:inline-flex" aria-label="Print" title="Print">
              <Printer size={15} />
              <span className="hidden lg:inline">Print</span>
            </button>
            <button onClick={saveQuote} className="btn-primary">
              <Save size={15} />
              <span>Save<span className="hidden sm:inline"> quote</span></span>
            </button>
          </div>
        </div>
      </header>

      {/* Validation Summary */}
      {showValidationSummary && hasErrors && (
        <div className="max-w-[1320px] mx-auto px-4 lg:px-8 pt-4 print:hidden">
          <div className="callout-danger">
            <AlertTriangle size={16} className="shrink-0 mt-px" />
            <div>
              <div className="font-semibold mb-1">Fix these before sending the quote</div>
              <ul className="space-y-0.5">
                {Object.entries(validationErrors).map(([key, msg]) => <li key={key}>{msg}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Print Header (only visible when printing) */}
      <div className="hidden print:block mb-6">
        <div className="border-b-2 border-ink pb-3 mb-4">
          <h1 className="text-xl font-bold">Roofing System Estimate</h1>
          {inputs.projectName && <p className="text-base font-semibold mt-1">{inputs.projectName}</p>}
          <p className="text-sm text-ink-3 mt-1">Date: {quoteDate}</p>
        </div>
        {(customerInfo.name || customerInfo.company) && (
          <div className="mb-4 text-sm">
            <h3 className="font-semibold mb-1">Customer</h3>
            {customerInfo.name && <p>Name: {customerInfo.name}</p>}
            {customerInfo.company && <p>Company: {customerInfo.company}</p>}
            {customerInfo.email && <p>Email: {customerInfo.email}</p>}
            {customerInfo.phone && <p>Phone: {customerInfo.phone}</p>}
            {customerInfo.address && <p>Address: {customerInfo.address}</p>}
            {customerInfo.projectAddress && <p>Project Address: {customerInfo.projectAddress}</p>}
          </div>
        )}
        {inputs.linearFeet > 0 && <p className="text-sm text-ink-2">Seams: <span className="num">{inputs.linearFeet.toLocaleString()}</span> linear ft</p>}
        {useMultiSection && roofSections.length > 0 && (
          <div className="mt-3 text-sm">
            <h3 className="font-bold mb-1">Roof sections</h3>
            <table className="w-full text-xs border border-line">
              <thead><tr className="bg-canvas"><th className="px-2 py-1 text-left">Section</th><th className="px-2 py-1 text-right">Sq Ft</th><th className="px-2 py-1 text-right">Linear Ft</th><th className="px-2 py-1 text-left">Roof Type</th><th className="px-2 py-1 text-right">Waste</th><th className="px-2 py-1 text-right">Stretch</th></tr></thead>
              <tbody>
                {roofSections.map(s => (
                  <tr key={s.id} className="border-t border-line">
                    <td className="px-2 py-1">{s.name}</td>
                    <td className="px-2 py-1 text-right">{(s.sqFt || 0).toLocaleString()}</td>
                    <td className="px-2 py-1 text-right">{(s.linearFeet || 0).toLocaleString()}</td>
                    <td className="px-2 py-1">{s.roofType}</td>
                    <td className="px-2 py-1 text-right">{Math.round((s.wasteFactor || 0) * 100)}%</td>
                    <td className="px-2 py-1 text-right">{Math.round((s.stretchFactor || 0) * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <main className="max-w-[1320px] mx-auto px-4 lg:px-8 py-5 lg:py-6 grid gap-5 lg:gap-6 lg:grid-cols-[minmax(340px,400px)_minmax(0,1fr)] items-start print:block print:p-0 print:max-w-none">

        {/* LEFT COLUMN: INPUTS */}
        <aside className="panel divide-y divide-line print:hidden">

          {/* PROJECT */}
          <section className="px-4 sm:px-5 py-5 space-y-4">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Project</h2>
            <div>
              <label htmlFor="projectName" className="label">Project name</label>
              <input
                id="projectName"
                type="text"
                value={inputs.projectName}
                onChange={(e) => handleChange('projectName', e.target.value)}
                className="input"
                placeholder="e.g. Smith Warehouse"
              />
            </div>
            <div>
              <label htmlFor="quoteDate" className="label">Quote date</label>
              <input
                id="quoteDate"
                type="date"
                value={quoteDate}
                onChange={(e) => setQuoteDate(e.target.value)}
                className="input num"
              />
            </div>
            <div>
              <button
                type="button"
                onClick={() => setShowCustomerInfo(!showCustomerInfo)}
                aria-expanded={showCustomerInfo}
                className="w-full flex items-center justify-between text-[13px] font-medium text-ink-2 hover:text-ink py-1"
              >
                <span className="flex items-center gap-2"><User size={15} className="text-ink-3" /> Customer details <span className="font-normal text-ink-3">Optional</span></span>
                <ChevronDown size={16} className={`text-ink-3 transition-transform ${showCustomerInfo ? 'rotate-180' : ''}`} />
              </button>
              {showCustomerInfo && (
                <div className="grid sm:grid-cols-2 gap-3 mt-3">
                  <div>
                    <label htmlFor="custName" className="label">Customer name</label>
                    <input id="custName" type="text" value={customerInfo.name} onChange={(e) => handleCustomerInfoChange('name', e.target.value)} className="input" placeholder="Jane Doe" />
                  </div>
                  <div>
                    <label htmlFor="custCompany" className="label">Company</label>
                    <input id="custCompany" type="text" value={customerInfo.company} onChange={(e) => handleCustomerInfoChange('company', e.target.value)} className="input" placeholder="ABC Roofing Co." />
                  </div>
                  <div>
                    <label htmlFor="custPhone" className="label">Phone</label>
                    <input id="custPhone" type="tel" value={customerInfo.phone} onChange={(e) => handleCustomerInfoChange('phone', e.target.value)} className={`input ${validationErrors.phone ? 'input-error' : ''}`} placeholder="(555) 123-4567" />
                    <ValidationError field="phone" />
                  </div>
                  <div>
                    <label htmlFor="custEmail" className="label">Email</label>
                    <input id="custEmail" type="email" value={customerInfo.email} onChange={(e) => handleCustomerInfoChange('email', e.target.value)} className={`input ${validationErrors.email ? 'input-error' : ''}`} placeholder="customer@email.com" />
                    <ValidationError field="email" />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="custAddress" className="label">Mailing address</label>
                    <input id="custAddress" type="text" value={customerInfo.address} onChange={(e) => handleCustomerInfoChange('address', e.target.value)} className="input" placeholder="123 Main St, City, State 12345" />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="custProjectAddress" className="label">Project address</label>
                    <input id="custProjectAddress" type="text" value={customerInfo.projectAddress} onChange={(e) => handleCustomerInfoChange('projectAddress', e.target.value)} className="input" placeholder="456 Project St, City, State 12345" />
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* SYSTEM */}
          <section className="px-4 sm:px-5 py-5 space-y-4">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Coating system</h2>
            <div className="seg" role="group" aria-label="Coating system">
              {['Silicone', 'Acrylic', 'Aluminum'].map(sys => segButton(sys, inputs.coatingSystem === sys, () => handleChange('coatingSystem', sys)))}
            </div>
            {inputs.coatingSystem === 'Acrylic' && (
              <div>
                <span className="label">Acrylic system type</span>
                <div className="seg" role="group" aria-label="Acrylic system type">
                  {segButton('Standard', inputs.acrylicSystemType === 'Standard', () => handleChange('acrylicSystemType', 'Standard'))}
                  {segButton('Reinforced', inputs.acrylicSystemType === 'Reinforced', () => handleChange('acrylicSystemType', 'Reinforced'))}
                </div>
                <p className="hint">{inputs.acrylicSystemType === 'Reinforced' ? 'Full-system membrane reinforcement.' : 'No membrane.'}</p>
              </div>
            )}
            <div>
              <label htmlFor="topcoat" className="label">Topcoat</label>
              <select id="topcoat" className="input" value={inputs.selectedTopcoat} onChange={(e) => handleChange('selectedTopcoat', e.target.value)}>
                {currentOptions.topcoats.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            {inputs.coatingSystem !== 'Aluminum' && (
              <div>
                <label htmlFor="basecoat" className="label">Basecoat</label>
                <select id="basecoat" className="input" value={inputs.selectedBasecoat} onChange={(e) => handleChange('selectedBasecoat', e.target.value)}>
                  {currentOptions.basecoats.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
            )}
            <div>
              <label htmlFor="butterGrade" className="label">Seam treatment (butter grade)</label>
              <select id="butterGrade" className="input" value={inputs.selectedButterGrade} onChange={(e) => handleChange('selectedButterGrade', e.target.value)}>
                {currentOptions.butterGrades.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div>
              <span className="label">Detailing</span>
              <div className="seg" role="group" aria-label="Detailing preference">
                {segButton('Butter grade', inputs.accessoryType === 'Butter Grade', () => handleChange('accessoryType', 'Butter Grade'))}
                {segButton('Fabric', inputs.accessoryType === 'Fabric', () => handleChange('accessoryType', 'Fabric'))}
              </div>
            </div>
            <div>
              <label htmlFor="fabric" className="label">Fabric / mesh</label>
              <select
                id="fabric"
                className="input"
                value={inputs.selectedFabric}
                onChange={(e) => handleChange('selectedFabric', e.target.value)}
                disabled={inputs.accessoryType === 'Butter Grade'}
              >
                {currentOptions.fabrics.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
              {inputs.accessoryType === 'Butter Grade' && <p className="hint">Only used when detailing with fabric.</p>}
            </div>
          </section>

          {/* ROOF */}
          <section className="px-4 sm:px-5 py-5 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Roof</h2>
              <label className="flex items-center gap-2.5 text-[13px] text-ink-2 cursor-pointer">
                Multiple sections
                <button
                  type="button"
                  role="switch"
                  aria-checked={useMultiSection}
                  aria-label="Multiple roof sections"
                  onClick={() => { setUseMultiSection(!useMultiSection); if (!useMultiSection && roofSections.length === 0) addRoofSection(); }}
                  className="switch"
                >
                  <span />
                </button>
              </label>
            </div>

            {!useMultiSection ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="roofSize" className="label">Roof area <span className="font-normal text-ink-3">sq ft</span></label>
                  <input
                    id="roofSize"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max="1000000"
                    value={inputs.roofSizeSqFt || ''}
                    onChange={(e) => handleChange('roofSizeSqFt', parseFloat(e.target.value) || 0)}
                    className={`input num ${validationErrors.roofSizeSqFt ? 'input-error' : ''}`}
                    placeholder="5,000"
                  />
                  <ValidationError field="roofSizeSqFt" />
                  <p className="hint num">{commonResults.squares.toFixed(2)} squares</p>
                </div>
                <div>
                  <label htmlFor="linearFeet" className="label">Seams <span className="font-normal text-ink-3">linear ft</span></label>
                  <input
                    id="linearFeet"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max="100000"
                    value={inputs.linearFeet || ''}
                    onChange={(e) => handleChange('linearFeet', parseFloat(e.target.value) || 0)}
                    className={`input num ${validationErrors.linearFeet ? 'input-error' : ''}`}
                    placeholder="250"
                  />
                  <ValidationError field="linearFeet" />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <ul className="border border-line rounded-md divide-y divide-line">
                  {roofSections.map((section) => (
                    <li key={section.id} className="p-3 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          aria-label="Section name"
                          value={section.name}
                          onChange={(e) => updateRoofSection(section.id, 'name', e.target.value)}
                          className="min-w-0 flex-1 text-[13px] font-semibold bg-transparent rounded px-1 -mx-1 py-0.5 hover:bg-canvas focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent-100"
                        />
                        <button onClick={() => removeRoofSection(section.id)} className="icon-btn hover:text-red-700" aria-label={`Remove ${section.name}`}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="label text-xs mb-1">Sq ft</label>
                          <input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            value={section.sqFt || ''}
                            onChange={(e) => updateRoofSection(section.id, 'sqFt', parseFloat(e.target.value) || 0)}
                            className={`input input-sm num ${validationErrors[`section_${section.id}_sqFt`] ? 'input-error' : ''}`}
                            placeholder="0"
                          />
                          <ValidationError field={`section_${section.id}_sqFt`} />
                        </div>
                        <div>
                          <label className="label text-xs mb-1">Linear ft</label>
                          <input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            value={section.linearFeet || ''}
                            onChange={(e) => updateRoofSection(section.id, 'linearFeet', parseFloat(e.target.value) || 0)}
                            className={`input input-sm num ${validationErrors[`section_${section.id}_lf`] ? 'input-error' : ''}`}
                            placeholder="0"
                          />
                          <ValidationError field={`section_${section.id}_lf`} />
                        </div>
                        <div>
                          <label className="label text-xs mb-1">Roof type</label>
                          <select value={section.roofType} onChange={(e) => updateRoofSection(section.id, 'roofType', e.target.value)} className="input input-sm">
                            {getAvailableRoofTypes().map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="label text-xs mb-1">Waste</label>
                          <select value={section.wasteFactor} onChange={(e) => updateRoofSection(section.id, 'wasteFactor', e.target.value)} className="input input-sm num">
                            {percentOptions(15)}
                          </select>
                        </div>
                        <div>
                          <label className="label text-xs mb-1">Stretch</label>
                          <select value={section.stretchFactor} onChange={(e) => updateRoofSection(section.id, 'stretchFactor', e.target.value)} className="input input-sm num">
                            {percentOptions(30)}
                          </select>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                <button onClick={addRoofSection} className="btn-secondary w-full">
                  <Plus size={14} /> Add section
                </button>
                <dl className="text-[13px] space-y-1 num">
                  <div className="flex justify-between"><dt className="text-ink-3">Total area</dt><dd className="font-medium">{inputs.roofSizeSqFt.toLocaleString()} sq ft · {commonResults.squares.toFixed(2)} sq</dd></div>
                  <div className="flex justify-between"><dt className="text-ink-3">Total seams</dt><dd className="font-medium">{inputs.linearFeet.toLocaleString()} LF</dd></div>
                </dl>
              </div>
            )}

            <fieldset disabled={useMultiSection} className={`space-y-4 ${useMultiSection ? 'opacity-60' : ''}`}>
              {useMultiSection && <p className="hint mt-0">Roof type, waste and stretch are set per section above.</p>}
              <div>
                <label htmlFor="roofType" className="label">Roof type</label>
                <select id="roofType" className="input" value={inputs.roofType} onChange={(e) => handleChange('roofType', e.target.value)}>
                  <option value="Capsheet">Capsheet</option>
                  {/* Single-Ply not available for Aluminum */}
                  {inputs.coatingSystem !== 'Aluminum' && <option value="Single-Ply">Single-Ply</option>}
                  {/* Sprayfoam for Silicone or Acrylic Standard only, NOT Aluminum */}
                  {inputs.coatingSystem !== 'Aluminum' && (inputs.coatingSystem === 'Silicone' || inputs.acrylicSystemType === 'Standard') && <option value="Sprayfoam">Sprayfoam</option>}
                  {/* Metal for Silicone, Acrylic Standard, or Aluminum */}
                  {(inputs.coatingSystem === 'Silicone' || inputs.acrylicSystemType === 'Standard' || inputs.coatingSystem === 'Aluminum') && <option value="Metal">Metal</option>}
                </select>
                {isReinforced && <p className="hint">Reinforced acrylic is valid on capsheet and single-ply only.</p>}
                {inputs.coatingSystem === 'Aluminum' && <p className="hint">Aluminum supports metal and capsheet only.</p>}
              </div>

              {/* Fastener encapsulation method — sits right under Roof Type so it's
                  immediately visible when Metal is picked (otherwise it's easy to miss). */}
              {inputs.roofType === 'Metal' && inputs.accessoryType === 'Butter Grade' && (
                <div>
                  <span className="label">Fastener encapsulation</span>
                  <div className="seg" role="group" aria-label="Fastener encapsulation">
                    {segButton('Butter grade', !inputs.useFastenerCaulk, () => handleChange('useFastenerCaulk', false))}
                    {segButton('Self-leveling caulk', !!inputs.useFastenerCaulk, () => handleChange('useFastenerCaulk', true))}
                  </div>
                  <p className="hint">
                    {inputs.useFastenerCaulk
                      ? `Fasteners covered by self-leveling caulk (~${FASTENERS_PER_CAULK_TUBE}/tube). Butter grade stays for seams and penetrations only.`
                      : 'Butter grade buckets cover both seams and fasteners. Switch to caulk if the contractor prefers it.'}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="waste" className="label">Waste</label>
                  <select id="waste" className="input num" value={inputs.wasteFactor} onChange={(e) => handleChange('wasteFactor', e.target.value)}>
                    {percentOptions(15)}
                  </select>
                </div>
                <div>
                  <label htmlFor="stretch" className="label">Stretch</label>
                  <select id="stretch" className="input num" value={inputs.stretchFactor} onChange={(e) => handleChange('stretchFactor', e.target.value)}>
                    {percentOptions(30)}
                  </select>
                </div>
              </div>
            </fieldset>
          </section>

          {/* CONDITIONS */}
          <section className="px-4 sm:px-5 pt-5 pb-2">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em] mb-1">Site conditions</h2>
            <div className="divide-y divide-line">
              {/* Adhesion test not needed for Aluminum */}
              {inputs.coatingSystem !== 'Aluminum' && (
                <div>
                  {switchRow('Passed adhesion test', inputs.passedAdhesion, () => handleChange('passedAdhesion', !inputs.passedAdhesion))}
                  {!inputs.passedAdhesion && (
                    <div className="callout-danger mb-3">
                      <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                      <span>Adhesion failure: adhesion primer added to the order.</span>
                    </div>
                  )}
                </div>
              )}

              {/* RUST TOGGLE - FOR SILICONE OR ACRYLIC ON METAL (not Aluminum) */}
              {(inputs.coatingSystem === 'Silicone' || inputs.coatingSystem === 'Acrylic') && inputs.roofType === 'Metal' && (
                <div>
                  {switchRow('Rust present', inputs.hasRust, () => handleChange('hasRust', !inputs.hasRust))}
                  {inputs.hasRust && (
                    <div className="pb-3">
                      <span className="label">Rust primer coverage</span>
                      <div className="seg" role="group" aria-label="Rust primer coverage">
                        {segButton('Field prime', inputs.rustPrimeMethod !== 'spot', () => handleChange('rustPrimeMethod', 'field'))}
                        {segButton('Spot prime', inputs.rustPrimeMethod === 'spot', () => handleChange('rustPrimeMethod', 'spot'))}
                      </div>
                      <p className="hint">
                        {inputs.rustPrimeMethod === 'spot'
                          ? `No primer quantity calculated. All quotes will read: "${SPOT_PRIME_NOTE}".`
                          : 'Rust primer at 0.5 gal/sq across the entire field.'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {switchRow('Goldseal warranty', inputs.goldseal, () => handleChange('goldseal', !inputs.goldseal))}
            </div>
          </section>
        </aside>

        {/* RIGHT COLUMN: RESULTS */}
        <div ref={resultsRef} className="results-col min-w-0 lg:sticky" style={{ top: resultsTop }}>
          <section id="order" className="panel overflow-hidden print:border-0 scroll-mt-20">
            <div className="flex items-start justify-between gap-4 px-4 sm:px-5 py-4 border-b border-line">
              <div className="min-w-0">
                <h2 className="text-base font-semibold tracking-[-0.01em]">Material order</h2>
                <p className="text-[13px] text-ink-3 mt-0.5">{systemLabel} on {roofTypeLabel} · {factorsLabel}</p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-lg font-semibold num leading-tight">{commonResults.squares.toFixed(1)} <span className="text-[13px] font-normal text-ink-3">sq</span></div>
                <div className="text-xs text-ink-3 num">{inputs.roofSizeSqFt.toLocaleString()} sq ft</div>
              </div>
            </div>

            {/* DISTRIBUTOR MARGIN */}
            <div className="px-4 sm:px-5 py-3 border-b border-line flex flex-wrap items-center gap-x-6 gap-y-2 bg-canvas/50 print:hidden">
              <label htmlFor="margin" className="flex items-center gap-2.5">
                <span className="text-[13px] font-medium text-ink-2">Distributor margin</span>
                <span className="relative">
                  <input
                    id="margin"
                    type="number"
                    inputMode="decimal"
                    step="1"
                    min="0"
                    max="99"
                    value={profitMargin}
                    onChange={(e) => setProfitMargin(parseFloat(e.target.value) || 0)}
                    className={`input input-sm num w-[76px] pr-7 text-right ${validationErrors.profitMargin ? 'input-error' : ''}`}
                    placeholder="0"
                  />
                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[13px] text-ink-3">%</span>
                </span>
              </label>
              <div className="basis-full -mt-1 empty:hidden">
                <ValidationError field="profitMargin" />
                <p className="text-xs text-ink-3">
                  {profitMargin > 0
                    ? `The distributor estimate shows your cost and the ${profitMargin}% margin. The contractor quote shows marked-up prices only.`
                    : 'Set a margin to mark up prices on the contractor quote.'}
                </p>
              </div>
            </div>

            {/* MISSING LINEAR FEET */}
            {inputs.linearFeet <= 0 && (
              <div className="px-4 sm:px-5 pt-4">
                <div className="callout-warn">
                  <AlertTriangle size={15} className="shrink-0 mt-px text-amber-600" />
                  <div>
                    <span className="font-semibold">Quote incomplete.</span> Add seam linear feet to calculate butter grade (seam sealant).
                    {inputs.roofType === 'Metal' && commonResults.screwBuckets > 0 && (
                      <span className="block mt-0.5 text-amber-800">Fastener encapsulation for ~{commonResults.screwCount} screws is included, based on roof area.</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ORDER TABLE */}
            {tiers.length > 1 && (
              <div className="sm:hidden px-4 pt-4">
                <div className="seg" role="group" aria-label="Warranty tier">
                  {tiers.map(y => segButton(`${y}-year`, leadTier === y, () => setMobileTier(y)))}
                </div>
              </div>
            )}
            <div className="overflow-x-auto mt-3 print:overflow-visible">
              <table className="order w-full sm:min-w-[600px] text-sm border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th scope="col">Product</th>
                    <th scope="col">Price / unit</th>
                    {tiers.map(y => <th key={y} scope="col" className={`text-ink-2 ${tierCls(y)}`}>{y}-year</th>)}
                  </tr>
                </thead>
                <tbody>
                  {/* Base Coat (Acrylic) OR System Primer (Silicone) */}
                  {inputs.coatingSystem !== 'Aluminum' && estimates['10']?.baseGal > 0 && (
                    <tr>
                      {productCell('Basecoat', inputs.selectedBasecoat)}
                      {priceCell('basecoat', 'gal')}
                      {tierQtyCells('baseGal', 'gal', prices.basecoat)}
                    </tr>
                  )}

                  {/* Spot Prime note row — rust present but user chose spot prime, so no quantities */}
                  {inputs.hasRust && inputs.rustPrimeMethod === 'spot'
                    && (inputs.coatingSystem === 'Silicone' || inputs.coatingSystem === 'Acrylic')
                    && inputs.roofType === 'Metal' && (
                    <tr>
                      <td colSpan={colCount} className="!text-left">
                        <div className="flex items-start gap-2">
                          <Info size={14} className="mt-0.5 text-amber-600 shrink-0" />
                          <div>
                            <div className="font-medium">Rust primer — spot prime</div>
                            <div className="text-xs text-ink-3 mt-0.5">{currentPrimers.rust} — {SPOT_PRIME_NOTE}. No field quantity calculated.</div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Rust Primer (Metal only) */}
                  {estimates['10']?.rustPrimerGal > 0 && (
                    <tr>
                      {productCell('Rust primer', `${currentPrimers.rust} · 5-gal pails`)}
                      {priceCell('rustPrimer', 'gal')}
                      {tierQtyCells('rustPrimerGal', 'gal', prices.rustPrimer)}
                    </tr>
                  )}

                  {/* Adhesion Primer */}
                  {!inputs.passedAdhesion && (
                    <tr>
                      {productCell('Adhesion primer', `${currentPrimers.adhesion} · 1-gal containers`,
                        <span className="badge bg-red-50 text-red-700 mt-1.5"><AlertTriangle size={11} /> Failed adhesion test</span>)}
                      {priceCell('adhesionPrimer', 'gal')}
                      {tierQtyCells('adhesionPrimerGal', 'gal', prices.adhesionPrimer)}
                    </tr>
                  )}

                  {/* Top Coats */}
                  {['top1Gal', 'top2Gal', 'top3Gal'].map((field, i) => (
                    (estimates['10']?.[field] > 0 || estimates['15']?.[field] > 0 || estimates['20']?.[field] > 0) && (
                      <tr key={field}>
                        {productCell(`Topcoat ${i + 1}`, inputs.selectedTopcoat)}
                        {i === 0 ? priceCell('topcoat', 'gal') : sameAsCell('Same as topcoat 1')}
                        {tierQtyCells(field, 'gal', prices.topcoat)}
                      </tr>
                    )
                  ))}

                  {/* Coatings subtotal */}
                  <tr className="row-sub">
                    <td>Coatings total</td>
                    <td />
                    {tiers.map(y => (
                      <td key={y} className={`num whitespace-nowrap ${tierCls(y)}`}>
                        <div>{fmtQty(estimates[y]?.totalGallons)} gal</div>
                        {hasCoatingPrices && <div className="text-xs text-ink-3 font-normal mt-0.5">{formatCurrency(coatingCost(y))}</div>}
                      </td>
                    ))}
                  </tr>

                  {/* ACCESSORIES (same quantity for every warranty tier) */}
                  {hasAccessoryRows && (
                    <tr>
                      <td colSpan={colCount} className="!text-left !pt-4 !pb-1.5 text-xs font-medium text-ink-3">Accessories</td>
                    </tr>
                  )}

                  {showAccessory && (
                    commonResults.screwBuckets > 0 ? (
                      /* Metal roof: the seam sealer does double duty — sealing seams (by
                         linear feet) and encapsulating fasteners (by roof area). Show them
                         as separate line items sharing one per-bucket price. */
                      <>
                        {commonResults.linearBuckets > 0 && (
                          <tr>
                            {productCell(`${commonResults.accessoryName || 'Seam sealer'} — seams`, 'By linear feet')}
                            {priceCell('accessory', 'bucket')}
                            {commonQtyCells(commonResults.linearBuckets, 'buckets', prices.accessory)}
                          </tr>
                        )}
                        <tr>
                          {productCell(`${commonResults.accessoryName || 'Seam sealer'} — fasteners`, `Encapsulates ~${(commonResults.screwCount || 0).toLocaleString()} fasteners (by roof area)`)}
                          {commonResults.linearBuckets > 0 ? sameAsCell('Same as above') : priceCell('accessory', 'bucket')}
                          {commonQtyCells(commonResults.screwBuckets, 'buckets', prices.accessory)}
                        </tr>
                      </>
                    ) : (
                      <tr>
                        {productCell(
                          inputs.linearFeet > 0 ? commonResults.accessoryName : 'Fastener encapsulation',
                          inputs.linearFeet > 0 ? commonResults.accessoryDesc : 'Metal roof screw encapsulation'
                        )}
                        {priceCell('accessory', accUnitSingular)}
                        {commonQtyCells(commonResults.accessoryQty, (commonResults.accessoryUnit || '').toLowerCase(), prices.accessory)}
                      </tr>
                    )
                  )}

                  {/* FASTENER CAULK ROW (when toggled on for metal roofs) */}
                  {commonResults.fastenerCaulkTubes > 0 && (
                    <tr>
                      {productCell('Fastener caulk', `${FASTENER_CAULK_NAME} · ~${FASTENERS_PER_CAULK_TUBE} fasteners/tube, covers ~${(commonResults.screwCount || 0).toLocaleString()}`)}
                      {priceCell('fastenerCaulk', 'tube')}
                      {commonQtyCells(commonResults.fastenerCaulkTubes, 'tubes', prices.fastenerCaulk)}
                    </tr>
                  )}

                  {/* ACRYLIC MEMBRANE ROW (Only for Reinforced) */}
                  {isReinforced && (
                    <tr>
                      {productCell('Reinforcement membrane', `Full-system reinforcement · 40" × 324' rolls`)}
                      {priceCell('membrane', 'roll')}
                      {commonQtyCells(commonResults.membraneRolls, 'rolls', prices.membrane)}
                    </tr>
                  )}

                  {/* Goldseal */}
                  {inputs.goldseal && (
                    <tr>
                      {productCell('Goldseal warranty', 'Priced per warranty term')}
                      <td />
                      {tiers.map(y => qtyCell(y, 1, 'warranty', estimates[y]?.goldsealCost || 0))}
                    </tr>
                  )}

                </tbody>
                <tfoot>
                  {/* GRAND TOTAL */}
                  <tr className="row-total">
                    <td>
                      {profitMargin > 0 ? 'Cost to distributor' : 'Total'}
                      {unpricedNote && <div className="text-xs font-normal text-amber-700 mt-0.5">{unpricedNote}</div>}
                    </td>
                    <td className="!font-normal text-xs text-ink-3"><span className="print:hidden">{profitMargin > 0 ? 'Your cost' : 'All materials'}</span></td>
                    {tiers.map(y => (
                      <td key={y} className={`num text-[15px] whitespace-nowrap ${tierCls(y)}`}>
                        {hasPrices ? formatCurrency(grandTotals[y] || 0) : <span className="text-[13px] font-normal text-ink-4">Enter prices</span>}
                      </td>
                    ))}
                  </tr>

                  {/* COST PER SQ FT */}
                  {hasPrices && inputs.roofSizeSqFt > 0 && (
                    <tr className="row-meta">
                      <td>{profitMargin > 0 ? 'Distributor cost per sq ft' : 'Cost per sq ft'}</td>
                      <td />
                      {tiers.map(y => <td key={y} className={`num ${tierCls(y)}`}>{formatCurrency((grandTotals[y] || 0) / inputs.roofSizeSqFt)}</td>)}
                    </tr>
                  )}

                  {/* CONTRACTOR PRICE (With Margin) - Only shows when margin is applied */}
                  {profitMargin > 0 && hasPrices && (
                    <>
                      <tr className="row-total">
                        <td>
                          Contractor price
                          <div className="text-xs font-normal text-ink-3 mt-0.5 print:hidden">{profitMargin}% margin</div>
                        </td>
                        <td />
                        {tiers.map(y => (
                          <td key={y} className={`num text-[15px] whitespace-nowrap ${tierCls(y)}`}>{formatCurrency(pricedTotal(y, marginFactor))}</td>
                        ))}
                      </tr>
                      <tr className="row-meta print:hidden">
                        <td>Your profit</td>
                        <td />
                        {tiers.map(y => <td key={y} className={`num ${tierCls(y)}`}>{formatCurrency(pricedTotal(y, marginFactor) - (grandTotals[y] || 0))}</td>)}
                      </tr>
                      {inputs.roofSizeSqFt > 0 && (
                        <tr className="row-meta">
                          <td>Contractor price per sq ft</td>
                          <td />
                          {tiers.map(y => <td key={y} className={`num ${tierCls(y)}`}>{formatCurrency(pricedTotal(y, marginFactor) / inputs.roofSizeSqFt)}</td>)}
                        </tr>
                      )}
                    </>
                  )}
                  <tr className="row-meta"><td colSpan={colCount} className="!pb-1" /></tr>
                </tfoot>
              </table>
            </div>

            {/* PDF DOWNLOADS */}
            <div className="px-4 sm:px-5 py-4 border-t border-line grid sm:grid-cols-2 gap-x-3 gap-y-4 print:hidden">
              <div>
                <button onClick={() => generatePDF('distributor')} className="btn-primary btn-lg w-full">
                  <FileDown size={16} /> Distributor estimate
                </button>
                <p className="hint">For the distributor: your cost, margin and the contractor price.</p>
              </div>
              <div>
                <button onClick={() => generatePDF('contractor')} className="btn-secondary btn-lg w-full">
                  <FileText size={16} /> Contractor quote
                </button>
                <p className="hint">
                  For the contractor: marked-up prices only, never cost or margin.
                  {!(profitMargin > 0) && <span className="block text-amber-700">No margin set, so prices equal your cost.</span>}
                </p>
              </div>
            </div>

          </section>

        </div>
      </main>

      <div className="max-w-[1320px] mx-auto px-4 lg:px-8 grid gap-5 lg:gap-6 lg:grid-cols-2 items-start print:hidden">
          {/* COPY TO EMAIL SECTION */}
          <section className="panel print:hidden">
            <div className="flex items-center justify-between gap-3 flex-wrap px-4 sm:px-5 pt-4 pb-3">
              <h2 className="text-sm font-semibold flex items-center gap-2"><Mail size={15} className="text-ink-3" /> Email text</h2>
              <div className="flex items-center gap-2">
                <div className="seg" role="group" aria-label="Email version">
                  {segButton('Distributor', emailViewMode === 'distributor', () => setEmailViewMode('distributor'))}
                  {segButton('Contractor', emailViewMode === 'contractor', () => setEmailViewMode('contractor'))}
                </div>
                <button onClick={copyToClipboard} className="btn-secondary">
                  {copySuccess ? <CheckCircle size={14} className="text-green-700" /> : <Copy size={14} />} {copySuccess ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
            <div className="px-4 sm:px-5 pb-4">
              <p className="text-xs text-ink-3 mb-2">
                {emailViewMode === 'contractor'
                  ? profitMargin > 0
                    ? `Prices marked up to contractor price (${profitMargin}% margin). No distributor cost or margin included.`
                    : 'No margin set, so prices match the values entered above.'
                  : 'Distributor version. Includes your cost and margin.'}
              </p>
              <textarea
                readOnly
                aria-label="Email text"
                value={emailViewMode === 'contractor' ? contractorEmailText : emailText}
                className="w-full h-44 rounded-md border border-line bg-canvas p-3 font-mono text-xs leading-relaxed text-ink-2 resize-y focus:outline-none focus:border-accent-600 focus:ring-[3px] focus:ring-accent-100"
              />
            </div>
          </section>

          {/* ENERGY SAVINGS ESTIMATOR (TOGGLEABLE) */}
          <section className="panel overflow-hidden print:hidden">
            <button
              onClick={() => setShowEnergySavings(!showEnergySavings)}
              aria-expanded={showEnergySavings}
              className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 text-left hover:bg-canvas/60 transition-colors"
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Zap size={15} className="text-ink-3" />
                Energy savings estimate
                <span className="font-normal text-[13px] text-ink-3">Optional</span>
              </span>
              <ChevronDown size={16} className={`text-ink-3 transition-transform ${showEnergySavings ? 'rotate-180' : ''}`} />
            </button>
            {showEnergySavings && (
              <div className="border-t border-line">
                <EnergySavingsEstimator
                  roofSize={inputs.roofSizeSqFt}
                  roofType={inputs.roofType}
                  coatingSystem={inputs.coatingSystem}
                  selectedRegion={energyRegion}
                  onRegionChange={setEnergyRegion}
                  onResultsChange={(results, rate, region) => {
                    setEnergySavingsResults(results);
                    setEnergyElectricityRate(rate);
                    if (region) setEnergyRegion(region);
                  }}
                />
              </div>
            )}
          </section>
      </div>

      <footer className="max-w-[1320px] mx-auto px-4 lg:px-8 text-xs text-ink-3 leading-relaxed print:max-w-none print:px-0">
        <div className="border-t border-line mt-6 py-5 print:mt-3 print:pt-3">
            <div className="max-w-[90ch]">
              <p className="mb-1">{useMultiSection && roofSections.length > 0 ? 'Estimates include per-section waste and stretch factors.' : `Estimates include ${Math.round(inputs.wasteFactor * 100)}% waste and ${Math.round(inputs.stretchFactor * 100)}% stretch.`}</p>
              <p>
                Disclaimer: this quote is provided as a guideline and estimate only. Actual material quantities may vary depending on factors including but not limited to application rates, true measurements and waste factors. The end user is solely responsible for verifying all measurements and site conditions. Final approval of quantities and costs rests with the purchaser.
              </p>
            </div>
        </div>
      </footer>

      {/* QUOTE COMPARISON VIEW */}
      {showComparison && selectedForCompare.length >= 2 && (
        <div className="max-w-[1320px] mx-auto px-4 lg:px-8 pb-8 print:hidden">
          <section id="comparison" className="panel overflow-hidden">
            <div className="flex items-center justify-between gap-3 flex-wrap px-4 sm:px-5 py-3.5 border-b border-line">
              <h2 className="text-base font-semibold">Quote comparison</h2>
              <div className="flex items-center gap-2">
                <button onClick={copyComparisonText} className="btn-secondary">
                  {compCopied ? <CheckCircle size={14} className="text-green-700" /> : <Copy size={14} />} {compCopied ? 'Copied' : 'Copy text'}
                </button>
                <button onClick={downloadComparisonPDF} className="btn-secondary">
                  <FileDown size={14} /> PDF
                </button>
                <button
                  onClick={() => { setShowComparison(false); setCompareMode(false); setSelectedForCompare([]); }}
                  className="icon-btn"
                  aria-label="Close comparison"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="order w-full text-sm">
                <thead>
                  <tr>
                    <th scope="col" className="w-48"></th>
                    {selectedForCompare.map(id => {
                      const q = savedQuotes.find(sq => sq.id === id);
                      return <th key={id} scope="col" className="!text-ink !font-semibold !text-[13px]">{q?.inputs.projectName || 'Untitled'}</th>;
                    })}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="text-ink-3">System</td>
                    {selectedForCompare.map(id => {
                      const q = savedQuotes.find(sq => sq.id === id);
                      return <td key={id}>{q?.inputs.coatingSystem}{q?.inputs.coatingSystem === 'Acrylic' ? `, ${q?.inputs.acrylicSystemType}` : ''}</td>;
                    })}
                  </tr>
                  <tr>
                    <td className="text-ink-3">Roof type</td>
                    {selectedForCompare.map(id => {
                      const q = savedQuotes.find(sq => sq.id === id);
                      return <td key={id}>{q?.inputs.roofType}</td>;
                    })}
                  </tr>
                  <tr>
                    <td className="text-ink-3">Roof area</td>
                    {selectedForCompare.map(id => {
                      const q = savedQuotes.find(sq => sq.id === id);
                      return <td key={id} className="num">{(q?.inputs.roofSizeSqFt || 0).toLocaleString()} sq ft</td>;
                    })}
                  </tr>
                  <tr>
                    <td className="text-ink-3">Customer</td>
                    {selectedForCompare.map(id => {
                      const q = savedQuotes.find(sq => sq.id === id);
                      return <td key={id}>{q?.customerInfo?.name || q?.customerInfo?.company || '—'}</td>;
                    })}
                  </tr>
                  {/* Totals and gallons for each warranty year */}
                  {['10', '15', '20'].map(year => {
                    const quoteData = selectedForCompare.map(id => {
                      const q = savedQuotes.find(sq => sq.id === id);
                      if (!q?.estimates?.[year]) return null;
                      const est = q.estimates[year];
                      const p = q.prices || {};
                      const priceTotal = (est.baseGal || 0) * (p.basecoat || 0) +
                        (est.top1Gal || 0) * (p.topcoat || 0) +
                        (est.top2Gal || 0) * (p.topcoat || 0) +
                        (est.top3Gal || 0) * (p.topcoat || 0) +
                        (est.adhesionPrimerGal || 0) * (p.adhesionPrimer || 0) +
                        (est.rustPrimerGal || 0) * (p.rustPrimer || 0) +
                        ((q.commonResults?.accessoryQty || 0) * (p.accessory || 0)) +
                        ((q.commonResults?.membraneRolls || 0) * (p.membrane || 0)) +
                        ((q.commonResults?.fastenerCaulkTubes || 0) * (p.fastenerCaulk || 0)) +
                        (est.goldsealCost || 0);
                      const gallons = est.totalGallons || 0;
                      const sqft = q.inputs.roofSizeSqFt || 0;
                      return { priceTotal, gallons, sqft };
                    });
                    // Skip row if all quotes lack this year's data
                    if (quoteData.every(d => d === null)) return null;
                    const hasPrices = quoteData.some(d => d !== null && d.priceTotal > 0);
                    const validTotals = quoteData.filter(d => d !== null && d.priceTotal > 0).map(d => d.priceTotal);
                    const minTotal = validTotals.length > 0 ? Math.min(...validTotals) : null;
                    const validGallons = quoteData.filter(d => d !== null && d.gallons > 0).map(d => d.gallons);
                    const minGallons = validGallons.length > 0 ? Math.min(...validGallons) : null;
                    return (
                      <React.Fragment key={year}>
                        {/* Price total row - show if any quote has prices */}
                        {hasPrices && (
                          <tr>
                            <td className="font-semibold">{year}-year distributor cost</td>
                            {quoteData.map((d, i) => (
                              <td key={selectedForCompare[i]} className="num">
                                {d === null ? (
                                  <span className="text-ink-4 text-xs">N/A</span>
                                ) : d.priceTotal === 0 ? (
                                  <span className="text-ink-4 text-xs">No prices</span>
                                ) : (
                                  <span className="font-semibold">
                                    {formatCurrency(d.priceTotal)}
                                    {d.priceTotal === minTotal && validTotals.length > 1 && (
                                      <span className="block text-xs text-green-700 font-medium">Best value</span>
                                    )}
                                  </span>
                                )}
                              </td>
                            ))}
                          </tr>
                        )}
                        {/* Gallon total row - always show */}
                        <tr>
                          <td className={hasPrices ? 'text-ink-3' : 'font-semibold'}>{year}-year gallons</td>
                          {quoteData.map((d, i) => (
                            <td key={selectedForCompare[i]} className="num">
                              {d === null ? (
                                <span className="text-ink-4 text-xs">N/A</span>
                              ) : d.gallons === 0 ? (
                                <span className="text-ink-4">—</span>
                              ) : (
                                <span className={hasPrices ? '' : 'font-semibold'}>
                                  {d.gallons} gal
                                  {!hasPrices && d.gallons === minGallons && validGallons.length > 1 && (
                                    <span className="block text-xs text-green-700 font-medium">Least material</span>
                                  )}
                                </span>
                              )}
                            </td>
                          ))}
                        </tr>
                      </React.Fragment>
                    );
                  })}
                  {/* $/sqft for each warranty year - only if prices exist */}
                  {['10', '15', '20'].map(year => {
                    const sqftData = selectedForCompare.map(id => {
                      const q = savedQuotes.find(sq => sq.id === id);
                      if (!q?.estimates?.[year] || !q?.inputs.roofSizeSqFt) return null;
                      const est = q.estimates[year];
                      const p = q.prices || {};
                      const total = (est.baseGal || 0) * (p.basecoat || 0) +
                        (est.top1Gal || 0) * (p.topcoat || 0) +
                        (est.top2Gal || 0) * (p.topcoat || 0) +
                        (est.top3Gal || 0) * (p.topcoat || 0) +
                        (est.adhesionPrimerGal || 0) * (p.adhesionPrimer || 0) +
                        (est.rustPrimerGal || 0) * (p.rustPrimer || 0) +
                        ((q.commonResults?.accessoryQty || 0) * (p.accessory || 0)) +
                        ((q.commonResults?.membraneRolls || 0) * (p.membrane || 0)) +
                        ((q.commonResults?.fastenerCaulkTubes || 0) * (p.fastenerCaulk || 0)) +
                        (est.goldsealCost || 0);
                      if (total === 0) return null;
                      return total / q.inputs.roofSizeSqFt;
                    });
                    if (sqftData.every(d => d === null)) return null;
                    const validSqft = sqftData.filter(d => d !== null && d > 0);
                    const minSqft = validSqft.length > 0 ? Math.min(...validSqft) : null;
                    return (
                      <tr key={`sqft-${year}`}>
                        <td className="text-ink-3">{year}-year per sq ft</td>
                        {sqftData.map((val, i) => (
                          <td key={selectedForCompare[i]} className="num">
                            {val === null ? (
                              <span className="text-ink-4">—</span>
                            ) : (
                              <span className={val === minSqft && validSqft.length > 1 ? 'font-semibold text-green-700' : ''}>
                                {formatCurrency(val)}
                              </span>
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                  <tr>
                    <td className="text-ink-3">Goldseal warranty</td>
                    {selectedForCompare.map(id => {
                      const q = savedQuotes.find(sq => sq.id === id);
                      return <td key={id}>{q?.inputs.goldseal ? 'Yes' : 'No'}</td>;
                    })}
                  </tr>
                  <tr>
                    <td className="text-ink-3">Quote date</td>
                    {selectedForCompare.map(id => {
                      const q = savedQuotes.find(sq => sq.id === id);
                      return <td key={id} className="num">{q?.date || new Date(q?.savedAt).toLocaleDateString()}</td>;
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="px-4 sm:px-5 py-3 text-xs text-ink-3 border-t border-line">
              Quotes saved before estimate data was stored can't show totals. Re-save them to compare.
            </p>
          </section>
        </div>
      )}

      {/* MOBILE SUMMARY BAR */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-20 bg-white border-t border-line px-4 py-2.5 flex items-center justify-between gap-3 print:hidden" style={{ paddingBottom: 'max(0.625rem, env(safe-area-inset-bottom))' }}>
        <div className="min-w-0 num">
          <div className="text-xs text-ink-3">
            {leadTier}-year · {commonResults.squares.toFixed(1)} sq
            {unpricedNote && <span className="text-amber-700"> · {unpriced.length} unpriced</span>}
          </div>
          <div className="text-[15px] font-semibold truncate">
            {fmtQty(estimates[leadTier]?.totalGallons)} gal
            {hasPrices && <span className="text-ink-3 font-normal"> · {profitMargin > 0 ? 'your cost ' : 'total '}</span>}
            {hasPrices && formatCurrency(grandTotals[leadTier] || 0)}
          </div>
        </div>
        <a href="#order" className="btn-secondary shrink-0">View order</a>
      </div>

      {/* TOAST */}
      {toast && (
        <div role="status" className="fixed z-50 bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-md bg-ink text-white text-[13px] px-3.5 py-2.5 shadow-pop print:hidden">
          <CheckCircle size={15} className="text-green-400" /> {toast}
        </div>
      )}
    </div>
  );
}
