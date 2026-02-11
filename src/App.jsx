import React, { useState, useEffect } from 'react';
import { Calculator, CheckCircle, Copy, FileText, AlertTriangle, Layers, Ruler, Mail, Info, Hammer, Package, Droplet, Grid, Save, Upload, Download, ChevronDown, ChevronUp, User, DollarSign, Calendar, Eye, EyeOff, FileDown, Zap } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import EnergySavingsEstimator from './EnergySavingsEstimator.jsx';

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
    accessoryType: 'Butter Grade',
  });

  const [commonResults, setCommonResults] = useState({
    squares: 0,
    accessoryName: '',
    accessoryQty: 0,
    accessoryUnit: '',
    accessoryDesc: '',
    membraneRolls: 0,
    screwCount: 0,
    screwBuckets: 0
  });

  const [estimates, setEstimates] = useState({
    '10': {},
    '15': {},
    '20': {}
  });

  const [emailText, setEmailText] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  // Pricing state
  const [prices, setPrices] = useState({
    basecoat: 0,
    topcoat: 0,
    adhesionPrimer: 0,
    rustPrimer: 0,
    accessory: 0,
    membrane: 0
  });

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
  const [showProfitMargin, setShowProfitMargin] = useState(false);

  // Energy savings estimator
  const [showEnergySavings, setShowEnergySavings] = useState(false);
  const [energySavingsResults, setEnergySavingsResults] = useState(null);
  const [energyElectricityRate, setEnergyElectricityRate] = useState(0.12);

  // Saved quotes
  const [savedQuotes, setSavedQuotes] = useState([]);

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
    setPrices(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
  };

  const handleCustomerInfoChange = (field, value) => {
    setCustomerInfo(prev => ({ ...prev, [field]: value }));
  };

  // Save/Load/Export/Import functions
  const saveQuote = () => {
    const quote = {
      id: Date.now(),
      date: quoteDate,
      inputs,
      prices,
      profitMargin,
      customerInfo,
      savedAt: new Date().toISOString()
    };

    const existingQuotes = JSON.parse(localStorage.getItem('savedQuotes') || '[]');
    const updatedQuotes = [quote, ...existingQuotes];
    localStorage.setItem('savedQuotes', JSON.stringify(updatedQuotes));
    setSavedQuotes(updatedQuotes);
    alert('Quote saved successfully!');
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
        alert('Quote imported successfully!');
      } catch (error) {
        alert('Error importing quote. Please check the file format.');
      }
    };
    reader.readAsText(file);
  };

  // Load saved quotes on mount
  useEffect(() => {
    const existingQuotes = JSON.parse(localStorage.getItem('savedQuotes') || '[]');
    setSavedQuotes(existingQuotes);
  }, []);

  // Helper for rounding to nearest 5-gal pail
  const roundToFive = (val) => {
      if (val <= 0) return 0;
      return Math.ceil(val / 5) * 5;
  };

  // --- CALCULATIONS ---
  useEffect(() => {
    const { 
        roofSizeSqFt, linearFeet, roofType, wasteFactor, stretchFactor, 
        goldseal, passedAdhesion, hasRust, accessoryType, coatingSystem, acrylicSystemType,
        selectedTopcoat, selectedBasecoat, selectedButterGrade, selectedFabric
    } = inputs;

    const squares = roofSizeSqFt > 0 ? roofSizeSqFt / 100 : 0;
    const totalFactor = 1 + parseFloat(wasteFactor) + parseFloat(stretchFactor);

    let accQty = 0;
    let accUnit = '';
    let accDesc = '';
    let accDisplayName = '';
    let membraneRolls = 0;
    let estimatedScrews = 0;
    let bucketsForScrews = 0;

    if (accessoryType === 'Butter Grade') {
        const lfPerBucket = coatingSystem === 'Acrylic' ? 150 : 80;
        const bucketsForLinear = linearFeet > 0 ? Math.ceil(linearFeet / lfPerBucket) : 0;
        accQty = bucketsForLinear;
        accUnit = 'Buckets';
        
        // Dynamic label for bucket size
        const bucketSizeLabel = coatingSystem === 'Acrylic' ? '3.5-gal' : '2-gal';
        
        accDesc = `${bucketSizeLabel} containers (~${Math.round(lfPerBucket)} LF/ea)`;
        accDisplayName = selectedButterGrade;

        // Allow screw calc for any Metal roof - regardless of linear feet input
        if (roofType === 'Metal' && roofSizeSqFt > 0) {
             // Silicone: 2500/2g. Acrylic: 4375/3.5g (derived from silicone ratio 1250 screws/gal).
             const screwsPerBucket = coatingSystem === 'Acrylic' ? 4375 : 2500;
            
            estimatedScrews = Math.ceil(roofSizeSqFt * 0.8);
            bucketsForScrews = Math.ceil(estimatedScrews / screwsPerBucket);
            
            // Add screw buckets to total accessory quantity
            accQty += bucketsForScrews;
            accDesc += ` + Screw Encapsulation`;
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
        screwCount: estimatedScrews,
        screwBuckets: bucketsForScrews
    });

    const newEstimates = {};
    let systemSpec = null;
    if (coatingSystem === 'Silicone') {
        systemSpec = SYSTEM_DATA['Silicone'][roofType];
    } else if (coatingSystem === 'Aluminum') {
        systemSpec = SYSTEM_DATA['Aluminum'][roofType];
    } else {
        // Defensive fallback: ensure acrylicSystemType is never undefined
        const safeAcrylicSystemType = acrylicSystemType || 'Standard';
        systemSpec = SYSTEM_DATA['Acrylic'][safeAcrylicSystemType]?.[roofType];
    }

    ['10', '15', '20'].forEach(year => {
        if (!systemSpec) return;

        const rates = systemSpec[year];
        if (!rates) return; // Skip if this warranty year is not available (e.g., Aluminum 15/20-year)

        // Calculate Base - ROUND TO 5
        const rawBase = squares * (rates.base || 0);
        const baseGal = roundToFive(rawBase * totalFactor);
        
        // Calculate Topcoats - ROUND TO 5
        const rawTop1 = squares * (rates.top1 || 0);
        const top1Gal = roundToFive(rawTop1 * totalFactor);
        
        const rawTop2 = squares * (rates.top2 || 0);
        const top2Gal = roundToFive(rawTop2 * totalFactor);
        
        const rawTop3 = squares * (rates.top3 || 0);
        const top3Gal = roundToFive(rawTop3 * totalFactor);

        // Adhesion Primer - STANDARD ROUNDING (1-GAL)
        let adhesionPrimerGal = 0;
        if (!passedAdhesion) {
            const rawAdhesion = squares * 0.2;
            adhesionPrimerGal = Math.ceil(rawAdhesion * totalFactor);
        }

        // Rust Primer - ROUND TO 5
        let rustPrimerGal = 0;
        if (coatingSystem === 'Silicone' && roofType === 'Metal' && hasRust) {
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

  }, [inputs]);

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

    const ROOF_FACTOR = 0.08;
    const SOLAR_RADIATION_KWH_M2 = 1450;
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

    let text = `PROJECT ESTIMATE: ${projectName || 'Untitled'}\n\n`;
    text += `System: ${coatingSystem} on ${roofType}`;
    if (coatingSystem === 'Acrylic') text += ` (${acrylicSystemType})`;
    text += `\n`;

    text += `Roof Size: ${roofSizeSqFt} sqft (${commonResults.squares} Squares)\n`;
    text += `Calculation Factors: ${Math.round(wasteFactor * 100)}% Waste, ${Math.round(stretchFactor * 100)}% Stretch\n`;
    text += `Note: Base, Topcoat, and Rust Primer round to 5-gal. Adhesion Primer rounds to 1-gal.\n`;

    if (linearFeet > 0 || commonResults.screwBuckets > 0) {
        text += `\nAccessories: ${commonResults.accessoryQty} ${commonResults.accessoryUnit} of ${commonResults.accessoryName}`;
        if (prices.accessory > 0) text += ` @ $${prices.accessory.toFixed(2)} each`;
        if (commonResults.screwBuckets > 0) {
            text += ` (Includes ${commonResults.screwBuckets} buckets for ~${commonResults.screwCount} screws)`;
        }
        text += `\n`;
    }

    if (coatingSystem === 'Acrylic' && commonResults.membraneRolls > 0) {
        text += `Reinforcement: ${commonResults.membraneRolls} Rolls of Reinforcement Membrane (40" x 324')`;
        if (prices.membrane > 0) text += ` @ $${prices.membrane.toFixed(2)}/roll`;
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

    if (coatingSystem === 'Silicone' && roofType === 'Metal' && inputs.hasRust) {
        text += `** NOTE: Rust present. Added ${primerSet.rust} (@ 0.5 gal/sq).\n`;
    }

    ['10', '15', '20'].forEach(year => {
        const est = estimates[year];
        if (!est || (est.top1Gal === undefined && est.baseGal === undefined)) return;

        text += `\n\n--- ${year}-YEAR OPTION ---\n\n`;

        if (coatingSystem !== 'Aluminum' && est.baseGal > 0) {
            text += `Basecoat: ${est.baseGal} gal (${selectedBasecoat}) @ ${est.rates.base} gal/sq`;
            if (prices.basecoat > 0) text += `\n  Unit Price: $${prices.basecoat.toFixed(2)}/gal | Line Total: $${(est.baseGal * prices.basecoat).toFixed(2)}`;
            text += `\n`;
        }

        if (est.rustPrimerGal > 0) {
            text += `Rust Primer: ${est.rustPrimerGal} gal (${primerSet.rust}) @ 0.5 gal/sq`;
            if (prices.rustPrimer > 0) text += `\n  Unit Price: $${prices.rustPrimer.toFixed(2)}/gal | Line Total: $${(est.rustPrimerGal * prices.rustPrimer).toFixed(2)}`;
            text += `\n`;
        }
        if (est.adhesionPrimerGal > 0) {
            text += `Adhesion Primer: ${est.adhesionPrimerGal} gal (${primerSet.adhesion}) @ 0.2 gal/sq`;
            if (prices.adhesionPrimer > 0) text += `\n  Unit Price: $${prices.adhesionPrimer.toFixed(2)}/gal | Line Total: $${(est.adhesionPrimerGal * prices.adhesionPrimer).toFixed(2)}`;
            text += `\n`;
        }

        if (est.top1Gal > 0) {
            text += `Topcoat 1: ${est.top1Gal} gal (${selectedTopcoat}) @ ${est.rates.top1} gal/sq`;
            if (prices.topcoat > 0) text += `\n  Unit Price: $${prices.topcoat.toFixed(2)}/gal | Line Total: $${(est.top1Gal * prices.topcoat).toFixed(2)}`;
            text += `\n`;
        }
        if (est.top2Gal > 0) {
            text += `Topcoat 2: ${est.top2Gal} gal (${selectedTopcoat}) @ ${est.rates.top2} gal/sq`;
            if (prices.topcoat > 0) text += `\n  Unit Price: $${prices.topcoat.toFixed(2)}/gal | Line Total: $${(est.top2Gal * prices.topcoat).toFixed(2)}`;
            text += `\n`;
        }
        if (est.top3Gal > 0) {
            text += `Topcoat 3: ${est.top3Gal} gal (${selectedTopcoat}) @ ${est.rates.top3} gal/sq`;
            if (prices.topcoat > 0) text += `\n  Unit Price: $${prices.topcoat.toFixed(2)}/gal | Line Total: $${(est.top3Gal * prices.topcoat).toFixed(2)}`;
            text += `\n`;
        }

        text += `\nTOTAL SYSTEM: ${est.totalGallons} Gallons`;
        if (prices.basecoat > 0 || prices.topcoat > 0 || prices.adhesionPrimer > 0 || prices.rustPrimer > 0) {
            const materialsTotal = (est.baseGal || 0) * prices.basecoat +
                                   (est.top1Gal || 0) * prices.topcoat +
                                   (est.top2Gal || 0) * prices.topcoat +
                                   (est.top3Gal || 0) * prices.topcoat +
                                   (est.adhesionPrimerGal || 0) * prices.adhesionPrimer +
                                   (est.rustPrimerGal || 0) * prices.rustPrimer;
            text += ` = $${materialsTotal.toFixed(2)}`;
        }
        text += `\n`;

        if (est.goldsealCost > 0) text += `Goldseal Warranty: $${est.goldsealCost.toLocaleString()}\n`;

        // Add grand total if pricing is entered
        if (prices.basecoat > 0 || prices.topcoat > 0 || prices.adhesionPrimer > 0 || prices.rustPrimer > 0 || prices.accessory > 0 || prices.membrane > 0) {
            const grandTotal = (est.baseGal || 0) * prices.basecoat +
                              (est.top1Gal || 0) * prices.topcoat +
                              (est.top2Gal || 0) * prices.topcoat +
                              (est.top3Gal || 0) * prices.topcoat +
                              (est.adhesionPrimerGal || 0) * prices.adhesionPrimer +
                              (est.rustPrimerGal || 0) * prices.rustPrimer +
                              (commonResults.accessoryQty || 0) * prices.accessory +
                              (commonResults.membraneRolls || 0) * prices.membrane +
                              (est.goldsealCost || 0);
            const warrantyLabel = inputs.goldseal ? ' + Warranty' : '';

            if (profitMargin > 0) {
                text += `\nDISTRIBUTOR COST (Materials + Accessories${warrantyLabel}): $${grandTotal.toFixed(2)}\n`;
                const sellPrice = grandTotal / (1 - profitMargin / 100);
                const profit = sellPrice - grandTotal;
                text += `CONTRACTOR PRICE (${profitMargin}% margin): $${sellPrice.toFixed(2)}\n`;
                text += `MARGIN: $${profit.toFixed(2)}\n`;
            } else {
                text += `\nGRAND TOTAL (Materials + Accessories${warrantyLabel}): $${grandTotal.toFixed(2)}\n`;
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
            text += `  • Texas Climate: 2650 Cooling Degree Days, 1450 kWh/m²/year solar radiation\n`;
            text += `  • HVAC Efficiency: SEER 13 (typical commercial)\n`;
            text += `  • Electricity Rate: $${energyElectricityRate}/kWh\n`;
            text += `  • Conservative Factors: Cooling season only (60%), building reality (40%), heat transfer (35%)\n`;
            text += `  • Targets LOW END of industry range: $0.25-$0.75 per sq ft/year\n`;
            text += `  • ROI includes 3% annual electricity rate increase\n\n`;
            text += `* Energy savings are estimates based on DOE/LBNL Cool Roof Calculator and ASHRAE 90.1 standards.\n`;
            text += `  Actual savings vary by building characteristics, HVAC efficiency, occupancy, and weather.\n`;
        }
    }

    text += `\n\n*** IMPORTANT: ESTIMATE DISCLAIMER ***\n`;
    text += `THIS QUOTE IS PROVIDED AS A GUIDELINE AND ESTIMATE ONLY. ACTUAL MATERIAL QUANTITIES MAY VARY DEPENDING ON FACTORS INCLUDING BUT NOT LIMITED TO: APPLICATION RATES, TRUE MEASUREMENTS, AND WASTE FACTORS.\n\n`;
    text += `THE END-USER IS SOLELY RESPONSIBLE FOR VERIFYING ALL MEASUREMENTS AND SITE CONDITIONS. FINAL APPROVAL OF QUANTITIES AND COSTS RESTS WITH THE PURCHASER.`;

    setEmailText(text);
  }, [inputs, estimates, commonResults, prices, profitMargin, showEnergySavings, energyElectricityRate]);

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
    copyText(emailText);
  };

  // Helper function for formatting currency - must be defined before generatePDF
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    let yPos = 20;

    // Calculate primers locally to avoid hoisting issues
    const pdfBrand = getBrandFromTopcoat(inputs.selectedTopcoat);
    const pdfPrimers = PRIMER_LOOKUP[pdfBrand];

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('ROOFING SYSTEM ESTIMATE', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    // Project Info
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    if (inputs.projectName) {
      doc.text(`Project: ${inputs.projectName}`, 15, yPos);
      yPos += 7;
    }
    if (inputs.quoteDate) {
      doc.text(`Date: ${inputs.quoteDate}`, 15, yPos);
      yPos += 7;
    }
    yPos += 5;

    // Customer Info (if provided)
    if (inputs.customerName || inputs.customerCompany || inputs.customerEmail || inputs.customerPhone) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('CUSTOMER INFORMATION', 15, yPos);
      yPos += 7;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      if (inputs.customerName) {
        doc.text(`Name: ${inputs.customerName}`, 15, yPos);
        yPos += 6;
      }
      if (inputs.customerCompany) {
        doc.text(`Company: ${inputs.customerCompany}`, 15, yPos);
        yPos += 6;
      }
      if (inputs.customerEmail) {
        doc.text(`Email: ${inputs.customerEmail}`, 15, yPos);
        yPos += 6;
      }
      if (inputs.customerPhone) {
        doc.text(`Phone: ${inputs.customerPhone}`, 15, yPos);
        yPos += 6;
      }
      yPos += 5;
    }

    // System Specifications
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('SYSTEM SPECIFICATIONS', 15, yPos);
    yPos += 7;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Coating System: ${inputs.coatingSystem}`, 15, yPos);
    yPos += 6;
    doc.text(`Roof Type: ${inputs.roofType}`, 15, yPos);
    yPos += 6;
    doc.text(`Roof Size: ${inputs.roofSizeSqFt.toLocaleString()} sq ft (${commonResults.squares} squares)`, 15, yPos);
    yPos += 6;
    if (inputs.linearFeet > 0) {
      doc.text(`Linear Feet: ${inputs.linearFeet}`, 15, yPos);
      yPos += 6;
    }
    yPos += 5;

    // Warning for missing linear feet
    if (inputs.linearFeet <= 0) {
      doc.setFontSize(10);
      doc.setFillColor(255, 237, 213); // Orange background
      doc.rect(10, yPos, pageWidth - 20, 20, 'F');
      doc.setTextColor(156, 63, 12); // Orange text
      doc.setFont('helvetica', 'bold');
      doc.text('⚠ WARNING: INCOMPLETE QUOTE', 15, yPos + 7);
      doc.setFont('helvetica', 'normal');
      doc.text('Missing Linear Feet - required to calculate butter grade (seam sealant) quantity.', 15, yPos + 14);
      if (inputs.roofType === 'Metal' && commonResults.screwBuckets > 0) {
        doc.setFontSize(8);
        doc.text(`(Note: Fastener encapsulation for ~${commonResults.screwCount} screws IS included based on roof area.)`, 15, yPos + 19);
      }
      doc.setTextColor(0, 0, 0); // Reset to black
      doc.setFontSize(10); // Reset font size
      yPos += 25;
    }

    // Materials Table - Only show 10-year for Aluminum
    const yearsToShow = inputs.coatingSystem === 'Aluminum' ? ['10'] : ['10', '15', '20'];
    const tableData = [];

    // Build table rows based on what's in the estimates
    if (inputs.coatingSystem !== 'Aluminum' && estimates['10']?.baseGal > 0) {
      const row = ['Basecoat', inputs.selectedBasecoat];
      yearsToShow.forEach(year => {
        row.push(`${estimates[year]?.baseGal || 0} gal`);
      });
      tableData.push(row);
    }

    if (estimates['10']?.top1Gal > 0) {
      const row = ['Topcoat 1', inputs.selectedTopcoat];
      yearsToShow.forEach(year => {
        row.push(`${estimates[year]?.top1Gal || 0} gal`);
      });
      tableData.push(row);
    }

    if (estimates['10']?.top2Gal > 0) {
      const row = ['Topcoat 2', inputs.selectedTopcoat];
      yearsToShow.forEach(year => {
        row.push(`${estimates[year]?.top2Gal || 0} gal`);
      });
      tableData.push(row);
    }

    if (estimates['10']?.top3Gal > 0) {
      const row = ['Topcoat 3', inputs.selectedTopcoat];
      yearsToShow.forEach(year => {
        row.push(`${estimates[year]?.top3Gal || 0} gal`);
      });
      tableData.push(row);
    }

    if (estimates['10']?.rustPrimerGal > 0) {
      const row = ['Rust Primer', pdfPrimers.rust];
      yearsToShow.forEach(year => {
        row.push(`${estimates[year]?.rustPrimerGal || 0} gal`);
      });
      tableData.push(row);
    }

    if (estimates['10']?.adhesionPrimerGal > 0) {
      const row = ['Adhesion Primer', pdfPrimers.adhesion];
      yearsToShow.forEach(year => {
        row.push(`${estimates[year]?.adhesionPrimerGal || 0} gal`);
      });
      tableData.push(row);
    }

    // Accessories
    if (commonResults.accessoryQty > 0) {
      const row = ['Accessories', commonResults.accessoryName, `${commonResults.accessoryQty} ${commonResults.accessoryUnit}`, '', ''];
      tableData.push(row);
    }

    // Membrane (if Reinforced Acrylic)
    if (commonResults.membraneRolls > 0) {
      const row = ['Reinforcement Membrane', '40" x 324\' rolls', `${commonResults.membraneRolls} rolls`, '', ''];
      tableData.push(row);
    }

    // Goldseal Warranty
    if (inputs.goldseal) {
      const row = ['Goldseal Warranty', ''];
      yearsToShow.forEach(year => {
        row.push(formatCurrency(estimates[year]?.goldsealCost || 0));
      });
      tableData.push(row);
    }

    // Create table headers dynamically
    const headers = ['Product', 'Description', ...yearsToShow.map(y => `${y}-Year`)];

    autoTable(doc, {
      startY: yPos,
      head: [headers],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 35 },
        1: { cellWidth: 'auto' }
      }
    });

    yPos = doc.lastAutoTable.finalY + 10;

    // Pricing Summary (if prices are entered)
    if (prices.basecoat > 0 || prices.topcoat > 0 || prices.adhesionPrimer > 0 || prices.rustPrimer > 0 || prices.accessory > 0 || prices.membrane > 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('PRICING SUMMARY', 15, yPos);
      yPos += 8;

      yearsToShow.forEach(year => {
        const est = estimates[year];
        if (!est) return;

        // Calculate line item costs
        const baseCost = (est.baseGal || 0) * prices.basecoat;
        const top1Cost = (est.top1Gal || 0) * prices.topcoat;
        const top2Cost = (est.top2Gal || 0) * prices.topcoat;
        const top3Cost = (est.top3Gal || 0) * prices.topcoat;
        const adhesionCost = (est.adhesionPrimerGal || 0) * prices.adhesionPrimer;
        const rustCost = (est.rustPrimerGal || 0) * prices.rustPrimer;
        const accessoryCost = (commonResults.accessoryQty || 0) * prices.accessory;
        const membraneCost = (commonResults.membraneRolls || 0) * prices.membrane;
        const goldsealCost = est.goldsealCost || 0;

        const materialsTotal = baseCost + top1Cost + top2Cost + top3Cost + adhesionCost + rustCost;
        const grandTotal = materialsTotal + accessoryCost + membraneCost + goldsealCost;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`${year}-Year System`, 15, yPos);
        yPos += 6;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');

        // Line item breakdown
        if (inputs.coatingSystem !== 'Aluminum' && est.baseGal > 0 && prices.basecoat > 0) {
          doc.text(`  Basecoat: ${est.baseGal} gal x ${formatCurrency(prices.basecoat)}/gal = ${formatCurrency(baseCost)}`, 15, yPos);
          yPos += 5;
        }
        if (est.top1Gal > 0 && prices.topcoat > 0) {
          doc.text(`  Topcoat 1: ${est.top1Gal} gal x ${formatCurrency(prices.topcoat)}/gal = ${formatCurrency(top1Cost)}`, 15, yPos);
          yPos += 5;
        }
        if (est.top2Gal > 0 && prices.topcoat > 0) {
          doc.text(`  Topcoat 2: ${est.top2Gal} gal x ${formatCurrency(prices.topcoat)}/gal = ${formatCurrency(top2Cost)}`, 15, yPos);
          yPos += 5;
        }
        if (est.top3Gal > 0 && prices.topcoat > 0) {
          doc.text(`  Topcoat 3: ${est.top3Gal} gal x ${formatCurrency(prices.topcoat)}/gal = ${formatCurrency(top3Cost)}`, 15, yPos);
          yPos += 5;
        }
        if (est.rustPrimerGal > 0 && prices.rustPrimer > 0) {
          doc.text(`  Rust Primer: ${est.rustPrimerGal} gal x ${formatCurrency(prices.rustPrimer)}/gal = ${formatCurrency(rustCost)}`, 15, yPos);
          yPos += 5;
        }
        if (est.adhesionPrimerGal > 0 && prices.adhesionPrimer > 0) {
          doc.text(`  Adhesion Primer: ${est.adhesionPrimerGal} gal x ${formatCurrency(prices.adhesionPrimer)}/gal = ${formatCurrency(adhesionCost)}`, 15, yPos);
          yPos += 5;
        }
        if (commonResults.accessoryQty > 0 && prices.accessory > 0) {
          doc.text(`  Accessories: ${commonResults.accessoryQty} ${commonResults.accessoryUnit} x ${formatCurrency(prices.accessory)} = ${formatCurrency(accessoryCost)}`, 15, yPos);
          yPos += 5;
        }
        if (commonResults.membraneRolls > 0 && prices.membrane > 0) {
          doc.text(`  Membrane: ${commonResults.membraneRolls} rolls x ${formatCurrency(prices.membrane)} = ${formatCurrency(membraneCost)}`, 15, yPos);
          yPos += 5;
        }
        if (goldsealCost > 0) {
          doc.text(`  Goldseal Warranty: ${formatCurrency(goldsealCost)}`, 15, yPos);
          yPos += 5;
        }

        // Totals
        yPos += 2;
        doc.setFont('helvetica', 'bold');
        if (profitMargin > 0) {
          doc.text(`  Distributor Cost: ${formatCurrency(grandTotal)}`, 15, yPos);
          yPos += 5;
          const sellPrice = grandTotal / (1 - profitMargin / 100);
          const profit = sellPrice - grandTotal;
          doc.text(`  Contractor Price (${profitMargin}% margin): ${formatCurrency(sellPrice)}`, 15, yPos);
          yPos += 5;
          doc.setFont('helvetica', 'normal');
          doc.text(`  Margin: ${formatCurrency(profit)}`, 15, yPos);
          yPos += 5;
        } else {
          doc.text(`  Grand Total: ${formatCurrency(grandTotal)}`, 15, yPos);
          yPos += 5;
        }
        doc.setFont('helvetica', 'normal');
        yPos += 5;
      });
    }

    // Energy Savings Section (if toggled on)
    const energySavingsForPDF = showEnergySavings ? calculateEnergySavingsForExport(energyElectricityRate) : null;
    if (energySavingsForPDF) {
      // Check if we need a new page
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('ENERGY SAVINGS ESTIMATE (OPTIONAL)', 15, yPos);
      yPos += 7;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Converting to reflective white coating can reduce cooling costs:', 15, yPos);
      yPos += 8;

      // Annual Savings
      doc.setFont('helvetica', 'bold');
      doc.text('Estimated Annual Savings:', 15, yPos);
      yPos += 5;
      doc.setFont('helvetica', 'normal');
      doc.text(`  Conservative Range: $${energySavingsForPDF.annualSavingsLow.toLocaleString()} - $${energySavingsForPDF.annualSavingsHigh.toLocaleString()}/year`, 15, yPos);
      yPos += 4;
      doc.text(`  Energy Reduction: ${energySavingsForPDF.annualKwhSavings.toLocaleString()} kWh/year`, 15, yPos);
      yPos += 4;
      doc.text(`  Peak Cooling Reduction: ${energySavingsForPDF.tonsOfCooling} Tons of AC`, 15, yPos);
      yPos += 7;

      // Long-Term ROI
      doc.setFont('helvetica', 'bold');
      doc.text('Long-Term ROI (Warranty Periods):', 15, yPos);
      yPos += 5;
      doc.setFont('helvetica', 'normal');
      doc.text(`  10-Year Savings: $${energySavingsForPDF.roi10Year.toLocaleString()}`, 15, yPos);
      yPos += 4;
      doc.text(`  15-Year Savings: $${energySavingsForPDF.roi15Year.toLocaleString()}`, 15, yPos);
      yPos += 4;
      doc.text(`  20-Year Savings: $${energySavingsForPDF.roi20Year.toLocaleString()}`, 15, yPos);
      yPos += 7;

      // Assumptions
      doc.setFont('helvetica', 'bold');
      doc.text('Calculation Assumptions (Highly Conservative):', 15, yPos);
      yPos += 5;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`• Reflectivity Change: ${energySavingsForPDF.beforeRoof} → ${energySavingsForPDF.afterRoof} (+${energySavingsForPDF.deltaReflectance}%)`, 15, yPos);
      yPos += 4;
      doc.text(`• Texas Climate: 2650 Cooling Degree Days, 1450 kWh/m²/year solar radiation`, 15, yPos);
      yPos += 4;
      doc.text(`• HVAC Efficiency: SEER 13 (typical commercial)`, 15, yPos);
      yPos += 4;
      doc.text(`• Electricity Rate: $${energyElectricityRate}/kWh`, 15, yPos);
      yPos += 4;
      doc.text(`• Conservative Factors: Cooling season only (60%), building reality (40%), heat transfer (35%)`, 15, yPos);
      yPos += 4;
      doc.text(`• Targets LOW END of industry range: $0.25-$0.75 per sq ft/year`, 15, yPos);
      yPos += 4;
      doc.text(`• ROI includes 3% annual electricity rate increase`, 15, yPos);
      yPos += 6;

      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      const energyDisclaimer = '* Energy savings are estimates based on DOE/LBNL Cool Roof Calculator and ASHRAE 90.1 standards. Actual savings vary by building characteristics, HVAC efficiency, occupancy patterns, and weather conditions.';
      const splitEnergyDisclaimer = doc.splitTextToSize(energyDisclaimer, pageWidth - 30);
      doc.text(splitEnergyDisclaimer, 15, yPos);
      yPos += splitEnergyDisclaimer.length * 3 + 10;
    }

    // Disclaimer
    yPos += 5;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('IMPORTANT DISCLAIMER:', 15, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    const disclaimerText = 'THIS QUOTE IS PROVIDED AS A GUIDELINE AND ESTIMATE ONLY. ACTUAL MATERIAL QUANTITIES MAY VARY DEPENDING ON FACTORS INCLUDING BUT NOT LIMITED TO: APPLICATION RATES, TRUE MEASUREMENTS, AND WASTE FACTORS. THE END-USER IS SOLELY RESPONSIBLE FOR VERIFYING ALL MEASUREMENTS AND SITE CONDITIONS. FINAL APPROVAL OF QUANTITIES AND COSTS RESTS WITH THE PURCHASER.';
    const splitDisclaimer = doc.splitTextToSize(disclaimerText, pageWidth - 30);
    doc.text(splitDisclaimer, 15, yPos);

    // Save PDF
    const fileName = inputs.projectName
      ? `${inputs.projectName.replace(/[^a-z0-9]/gi, '_')}_Estimate.pdf`
      : 'Roofing_Estimate.pdf';
    doc.save(fileName);
  };

  const currentOptions = PRODUCT_OPTIONS[inputs.coatingSystem];
  const brand = getBrandFromTopcoat(inputs.selectedTopcoat);
  const currentPrimers = PRIMER_LOOKUP[brand];

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans text-gray-800 print:bg-white print:p-0">
      
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8 flex justify-between items-center print:hidden">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-3 rounded-lg shadow-lg">
            <Calculator className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Roofing Materials Calculator</h1>
            <p className="text-gray-500">Supports Silicone & Acrylic (Reinforced vs Standard) Systems</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 print:block">

        {/* LEFT COLUMN: INPUTS */}
        <div className="lg:col-span-4 space-y-6 print:hidden">

          {/* SAVE/LOAD/EXPORT/IMPORT BUTTONS */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="grid grid-cols-2 gap-2">
              <button onClick={saveQuote} className="flex items-center justify-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                <Save size={16} /> Save Quote
              </button>
              <button onClick={exportQuote} className="flex items-center justify-center gap-2 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">
                <Download size={16} /> Export
              </button>
              <label className="flex items-center justify-center gap-2 bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium cursor-pointer">
                <Upload size={16} /> Import
                <input type="file" accept=".json" onChange={importQuote} className="hidden" />
              </label>
              <button
                onClick={() => document.getElementById('savedQuotesPanel').classList.toggle('hidden')}
                className="flex items-center justify-center gap-2 bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
              >
                <FileText size={16} /> Saved ({savedQuotes.length})
              </button>
            </div>

            {/* Saved Quotes Panel */}
            <div id="savedQuotesPanel" className="hidden mt-4 max-h-48 overflow-y-auto border-t border-gray-200 pt-4">
              {savedQuotes.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No saved quotes yet</p>
              ) : (
                <div className="space-y-2">
                  {savedQuotes.map(quote => (
                    <div key={quote.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <button onClick={() => loadQuote(quote)} className="text-left flex-1 hover:text-blue-600">
                        <div className="text-sm font-medium">{quote.inputs.projectName || 'Untitled'}</div>
                        <div className="text-xs text-gray-500">{new Date(quote.savedAt).toLocaleDateString()}</div>
                      </button>
                      <button onClick={() => deleteQuote(quote.id)} className="text-red-600 hover:text-red-800 ml-2">
                        <AlertTriangle size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* QUOTE DATE */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <Calendar size={16} /> Quote Date
            </label>
            <input
              type="date"
              value={quoteDate}
              onChange={(e) => setQuoteDate(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>

          {/* CUSTOMER INFO (COLLAPSIBLE) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <button
              onClick={() => setShowCustomerInfo(!showCustomerInfo)}
              className="w-full flex items-center justify-between text-sm font-medium text-gray-700 mb-3"
            >
              <span className="flex items-center gap-2">
                <User size={16} /> Customer Information (Optional)
              </span>
              {showCustomerInfo ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showCustomerInfo && (
              <div className="space-y-3 mt-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Customer Name</label>
                  <input
                    type="text"
                    value={customerInfo.name}
                    onChange={(e) => handleCustomerInfoChange('name', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Company Name</label>
                  <input
                    type="text"
                    value={customerInfo.company}
                    onChange={(e) => handleCustomerInfoChange('company', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="ABC Roofing Co."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
                  <input
                    type="text"
                    value={customerInfo.address}
                    onChange={(e) => handleCustomerInfoChange('address', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="123 Main St, City, State 12345"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={customerInfo.phone}
                    onChange={(e) => handleCustomerInfoChange('phone', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                  <input
                    type="email"
                    value={customerInfo.email}
                    onChange={(e) => handleCustomerInfoChange('email', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="customer@email.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Project Address</label>
                  <input
                    type="text"
                    value={customerInfo.projectAddress}
                    onChange={(e) => handleCustomerInfoChange('projectAddress', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="456 Project St, City, State 12345"
                  />
                </div>
              </div>
            )}
          </div>

          {/* PRODUCT & SYSTEM SELECTION */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <Droplet size={16} /> Coating System
            </label>
            <div className="grid grid-cols-3 gap-2 mb-6">
                <button
                    onClick={() => handleChange('coatingSystem', 'Silicone')}
                    className={`p-2 text-sm rounded-lg border transition-all ${inputs.coatingSystem === 'Silicone' ? 'bg-teal-600 text-white border-teal-600 font-bold' : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'}`}
                >
                    Silicone
                </button>
                <button
                    onClick={() => handleChange('coatingSystem', 'Acrylic')}
                    className={`p-2 text-sm rounded-lg border transition-all ${inputs.coatingSystem === 'Acrylic' ? 'bg-orange-600 text-white border-orange-600 font-bold' : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'}`}
                >
                    Acrylic
                </button>
                <button
                    onClick={() => handleChange('coatingSystem', 'Aluminum')}
                    className={`p-2 text-sm rounded-lg border transition-all ${inputs.coatingSystem === 'Aluminum' ? 'bg-gray-600 text-white border-gray-600 font-bold' : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'}`}
                >
                    Aluminum
                </button>
            </div>

            {/* PRODUCT DROPDOWNS */}
            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Top Coat Product</label>
                    <select className="w-full p-2 border border-gray-300 rounded-lg text-sm" value={inputs.selectedTopcoat} onChange={(e) => handleChange('selectedTopcoat', e.target.value)}>
                        {currentOptions.topcoats.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                </div>
                {/* Hide basecoat for Aluminum system */}
                {inputs.coatingSystem !== 'Aluminum' && (
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Base Coat Product</label>
                        <select className="w-full p-2 border border-gray-300 rounded-lg text-sm" value={inputs.selectedBasecoat} onChange={(e) => handleChange('selectedBasecoat', e.target.value)}>
                            {currentOptions.basecoats.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    </div>
                )}
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Seam Treatment (Butter Grade)</label>
                    <select className="w-full p-2 border border-gray-300 rounded-lg text-sm" value={inputs.selectedButterGrade} onChange={(e) => handleChange('selectedButterGrade', e.target.value)}>
                        {currentOptions.butterGrades.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fabric / Mesh</label>
                    <select
                        className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                        value={inputs.selectedFabric}
                        onChange={(e) => handleChange('selectedFabric', e.target.value)}
                        disabled={inputs.accessoryType === 'Butter Grade'}
                    >
                        {currentOptions.fabrics.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Detailing Preference</label>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => handleChange('accessoryType', 'Butter Grade')} className={`p-2 text-sm rounded-lg border ${inputs.accessoryType === 'Butter Grade' ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold' : 'border-gray-300 text-gray-600'}`}>Butter Grade</button>
                        <button onClick={() => handleChange('accessoryType', 'Fabric')} className={`p-2 text-sm rounded-lg border ${inputs.accessoryType === 'Fabric' ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold' : 'border-gray-300 text-gray-600'}`}>Fabric</button>
                    </div>
                </div>
            </div>

            {/* ACRYLIC SYSTEM TYPE TOGGLE */}
            {inputs.coatingSystem === 'Acrylic' && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                        <Grid size={16} /> Acrylic System Type
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => handleChange('acrylicSystemType', 'Standard')}
                            className={`p-2 text-sm rounded-lg border transition-all ${inputs.acrylicSystemType === 'Standard' ? 'bg-orange-500 text-white border-orange-500 font-bold' : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'}`}
                        >
                            Standard (No Membrane)
                        </button>
                        <button
                            onClick={() => handleChange('acrylicSystemType', 'Reinforced')}
                            className={`p-2 text-sm rounded-lg border transition-all ${inputs.acrylicSystemType === 'Reinforced' ? 'bg-orange-500 text-white border-orange-500 font-bold' : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'}`}
                        >
                            Reinforced (Membrane)
                        </button>
                    </div>
                </div>
            )}
          </div>

          {/* Project Name */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
            <input 
              type="text" 
              value={inputs.projectName}
              onChange={(e) => handleChange('projectName', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              placeholder="e.g. Smith Residence"
            />
          </div>

          {/* Dimensions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4 text-blue-800">
              <Ruler size={20} /> Dimensions
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Roof Size (sq ft)</label>
                <input 
                  type="number" 
                  value={inputs.roofSizeSqFt || ''}
                  onChange={(e) => handleChange('roofSizeSqFt', parseFloat(e.target.value) || 0)}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  placeholder="e.g. 5000"
                />
                <div className="text-xs text-gray-500 mt-1 text-right">= {commonResults.squares.toFixed(2)} Squares</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Linear Feet</label>
                <input
                  type="number"
                  value={inputs.linearFeet || ''}
                  onChange={(e) => handleChange('linearFeet', parseFloat(e.target.value) || 0)}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  placeholder="e.g. 250"
                />
              </div>
            </div>
          </div>

          {/* System Specs */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4 text-blue-800">
              <Layers size={20} /> System Specs
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Roof Type</label>
                <select
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  value={inputs.roofType}
                  onChange={(e) => handleChange('roofType', e.target.value)}
                >
                  <option value="Capsheet">Capsheet</option>
                  {/* Single-Ply not available for Aluminum */}
                  {inputs.coatingSystem !== 'Aluminum' && <option value="Single-Ply">Single-Ply</option>}
                  {/* Sprayfoam for Silicone or Acrylic Standard only, NOT Aluminum */}
                  {inputs.coatingSystem !== 'Aluminum' && (inputs.coatingSystem === 'Silicone' || inputs.acrylicSystemType === 'Standard') && <option value="Sprayfoam">Sprayfoam</option>}
                  {/* Metal for Silicone, Acrylic Standard, or Aluminum */}
                  {(inputs.coatingSystem === 'Silicone' || inputs.acrylicSystemType === 'Standard' || inputs.coatingSystem === 'Aluminum') && <option value="Metal">Metal</option>}
                </select>
                {inputs.coatingSystem === 'Acrylic' && inputs.acrylicSystemType === 'Reinforced' && (
                    <div className="text-xs text-orange-600 mt-1">Reinforced Acrylic system valid for Capsheet & Single-Ply only.</div>
                )}
                {inputs.coatingSystem === 'Aluminum' && (
                    <div className="text-xs text-gray-600 mt-1">Aluminum system supports Metal & Capsheet only.</div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Waste Factor</label>
                  <select className="w-full p-2 border border-gray-300 rounded-lg" value={inputs.wasteFactor} onChange={(e) => handleChange('wasteFactor', e.target.value)}>
                    <option value="0">0%</option>
                    <option value="0.05">5%</option>
                    <option value="0.10">10%</option>
                    <option value="0.15">15%</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stretch Factor</label>
                  <select className="w-full p-2 border border-gray-300 rounded-lg" value={inputs.stretchFactor} onChange={(e) => handleChange('stretchFactor', e.target.value)}>
                    <option value="0">0%</option>
                    <option value="0.05">5%</option>
                    <option value="0.10">10%</option>
                    <option value="0.15">15%</option>
                    <option value="0.20">20%</option>
                    <option value="0.25">25%</option>
                    <option value="0.30">30%</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Conditions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4 text-blue-800">
              <AlertTriangle size={20} /> Conditions
            </h2>
            <div className="space-y-4">
              {/* Adhesion test not needed for Aluminum */}
              {inputs.coatingSystem !== 'Aluminum' && (
                <>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <span className="text-sm font-medium text-gray-700">Passed Adhesion Test?</span>
                    <button onClick={() => handleChange('passedAdhesion', !inputs.passedAdhesion)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${inputs.passedAdhesion ? 'bg-green-500' : 'bg-red-500'}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${inputs.passedAdhesion ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  {!inputs.passedAdhesion && (
                    <div className="text-xs text-red-600 bg-red-50 p-2 rounded flex gap-2"><AlertTriangle size={14} className="mt-0.5" /><span>Adhesion Failure: Extra primer added.</span></div>
                  )}
                </>
              )}

              {/* RUST TOGGLE - ONLY FOR SILICONE METAL (not Aluminum) */}
              {inputs.coatingSystem === 'Silicone' && inputs.roofType === 'Metal' && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                        <span className="text-sm font-medium text-orange-900 flex items-center gap-2"><Hammer size={16} /> Rust Present?</span>
                        <button onClick={() => handleChange('hasRust', !inputs.hasRust)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${inputs.hasRust ? 'bg-orange-500' : 'bg-gray-300'}`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${inputs.hasRust ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                    {inputs.hasRust && <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded flex gap-2"><Info size={14} className="mt-0.5" /><span>Adds Rust Inhibiting Primer.</span></div>}
                </div>
              )}

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-sm font-medium text-gray-700">Goldseal Warranty?</span>
                <button onClick={() => handleChange('goldseal', !inputs.goldseal)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${inputs.goldseal ? 'bg-yellow-500' : 'bg-gray-300'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${inputs.goldseal ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: RESULTS */}
        <div className="lg:col-span-8 print:w-full print:col-span-12">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden sticky top-8 print:static print:shadow-none print:border-0">
            <div className="bg-gray-900 text-white p-6 border-b border-gray-800 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2"><FileText /> Material Options</h2>
                <div className="flex gap-2 text-xs mt-1">
                    <span className={`px-2 py-1 rounded-full text-white ${inputs.coatingSystem === 'Acrylic' ? 'bg-orange-600' : 'bg-teal-600'}`}>{inputs.coatingSystem}</span>
                    {inputs.coatingSystem === 'Acrylic' && <span className="bg-orange-700 px-2 py-1 rounded-full text-white">{inputs.acrylicSystemType}</span>}
                    <span className="bg-gray-800 px-2 py-1 rounded-full text-gray-300">{inputs.roofType}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-mono font-bold text-green-400">{commonResults.squares.toFixed(1)}</div>
                <div className="text-xs text-gray-400 uppercase tracking-wider">Total Squares</div>
              </div>
            </div>

            <div className="p-6">
              {/* ACCESSORIES COMMON */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200 print:border-gray-300">
                 <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Required Accessories</h3>
                 
                 {/* Warning message when linear feet is missing */}
                 {inputs.linearFeet <= 0 && (
                    <div className="bg-orange-50 border-l-4 border-orange-500 p-4 mb-4">
                        <div className="flex items-center">
                            <div className="flex-shrink-0"><AlertTriangle className="h-5 w-5 text-orange-500" /></div>
                            <div className="ml-3">
                                <p className="text-sm text-orange-700"><span className="font-bold">Quote Incomplete:</span> Missing Linear Feet - required to calculate butter grade (seam sealant) quantity.</p>
                                {inputs.roofType === 'Metal' && commonResults.screwBuckets > 0 && (
                                   <p className="text-xs text-orange-600 mt-1 font-semibold">
                                     (Note: Fastener encapsulation for ~{commonResults.screwCount} screws IS included based on roof area.)
                                   </p>
                                )}
                            </div>
                        </div>
                    </div>
                 )}

                 {/* Accessory pricing section - shows when there ARE linear feet OR when there are metal screws to encapsulate */}
                 {(inputs.linearFeet > 0 || (inputs.roofType === 'Metal' && commonResults.screwBuckets > 0)) && (
                    <div className="mb-4">
                        <div className="flex justify-between items-center">
                            <div className="flex-1">
                                <div className="font-bold text-lg text-gray-900">
                                    {inputs.linearFeet > 0 ? commonResults.accessoryName : 'Fastener Encapsulation'}
                                </div>
                                <div className="text-sm text-gray-500">
                                    {inputs.linearFeet > 0 ? commonResults.accessoryDesc : 'Metal roof screw encapsulation'}
                                </div>
                                {commonResults.screwBuckets > 0 && (
                                    <div className="flex items-center gap-1 text-xs text-blue-600 mt-1 font-medium bg-blue-50 px-2 py-1 rounded w-fit">
                                        <Info size={12} /> {inputs.linearFeet > 0 ? 'Includes' : ''} {commonResults.screwBuckets} buckets for ~{commonResults.screwCount} screws
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-center">
                                    <div className="text-xs text-gray-500 mb-1">Price/{commonResults.accessoryUnit === 'Buckets' ? 'Bucket' : 'Roll'}</div>
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="$0.00"
                                        value={prices.accessory || ''}
                                        onChange={(e) => handlePriceChange('accessory', e.target.value)}
                                        className="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-center print:border-0 print:bg-transparent"
                                    />
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold text-blue-700">
                                        {commonResults.accessoryQty} <span className="text-sm text-gray-600 font-normal">{commonResults.accessoryUnit}</span>
                                    </div>
                                    {prices.accessory > 0 && (
                                        <div className="text-sm font-bold text-green-700">
                                            = ${(commonResults.accessoryQty * prices.accessory).toFixed(2)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                 )}

                 {/* ACRYLIC MEMBRANE ROW (Only for Reinforced) */}
                 {inputs.coatingSystem === 'Acrylic' && inputs.acrylicSystemType === 'Reinforced' && (
                    <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                        <div className="flex-1">
                            <div className="font-bold text-lg text-gray-900">Reinforcement Membrane</div>
                            <div className="text-sm text-gray-500">Full System Reinforcement (40" x 324' rolls)</div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-center">
                                <div className="text-xs text-gray-500 mb-1">Price/Roll</div>
                                <input
                                    type="number"
                                    step="0.01"
                                    placeholder="$0.00"
                                    value={prices.membrane || ''}
                                    onChange={(e) => handlePriceChange('membrane', e.target.value)}
                                    className="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-center print:border-0 print:bg-transparent"
                                />
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-bold text-orange-600">
                                    {commonResults.membraneRolls} <span className="text-sm text-gray-600 font-normal">Rolls</span>
                                </div>
                                {prices.membrane > 0 && (
                                    <div className="text-sm font-bold text-green-700">
                                        = ${(commonResults.membraneRolls * prices.membrane).toFixed(2)}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                 )}
              </div>

              {/* DISTRIBUTOR MARGIN SECTION */}
              <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg p-5 print:hidden">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-blue-600 p-2 rounded-lg">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-blue-900">Distributor Margin</h3>
                    <p className="text-xs text-blue-700">Add your margin % to calculate contractor pricing</p>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-blue-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Your Margin Percentage</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      value={profitMargin}
                      onChange={(e) => setProfitMargin(parseFloat(e.target.value) || 0)}
                      className="w-32 p-3 border-2 border-blue-300 rounded-lg text-center text-2xl font-bold focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                    <span className="text-2xl font-bold text-blue-900">%</span>
                    {profitMargin > 0 && (
                      <div className="ml-4 text-sm text-green-700 font-medium">
                        ✓ Contractor prices will show {profitMargin}% margin
                      </div>
                    )}
                  </div>

                  {profitMargin > 0 && (prices.basecoat > 0 || prices.topcoat > 0) && (
                    <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
                      <div className="text-xs font-semibold text-blue-900 mb-2">PRICING PREVIEW:</div>
                      <div className={`grid ${inputs.coatingSystem === 'Aluminum' ? 'grid-cols-1' : 'grid-cols-3'} gap-3 text-xs`}>
                        {(inputs.coatingSystem === 'Aluminum' ? ['10'] : ['10', '15', '20']).map(year => {
                          const costPrice = (estimates[year]?.baseGal || 0) * prices.basecoat +
                                           (estimates[year]?.top1Gal || 0) * prices.topcoat +
                                           (estimates[year]?.top2Gal || 0) * prices.topcoat +
                                           (estimates[year]?.top3Gal || 0) * prices.topcoat +
                                           (estimates[year]?.adhesionPrimerGal || 0) * prices.adhesionPrimer +
                                           (estimates[year]?.rustPrimerGal || 0) * prices.rustPrimer +
                                           (commonResults.accessoryQty || 0) * prices.accessory +
                                           (commonResults.membraneRolls || 0) * prices.membrane +
                                           (estimates[year]?.goldsealCost || 0);

                          const sellPrice = costPrice / (1 - profitMargin / 100);
                          const profit = sellPrice - costPrice;

                          return (
                            <div key={year} className="bg-white p-2 rounded border border-blue-200">
                              <div className="font-bold text-center text-blue-900 mb-1">{year}-Year</div>
                              <div className="space-y-1">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Your Cost:</span>
                                  <span className="font-semibold text-blue-700">${costPrice.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between border-t pt-1">
                                  <span className="text-gray-600">Sell Price:</span>
                                  <span className="font-bold text-green-700">${sellPrice.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between border-t pt-1">
                                  <span className="text-gray-600">Your Profit:</span>
                                  <span className="font-bold text-amber-600">${profit.toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* COMPARISON TABLE */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg print:border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-green-50 border-l border-r border-gray-200">Price/Unit</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider bg-white border-l border-r border-gray-200">10-Year</th>
                      {inputs.coatingSystem !== 'Aluminum' && (
                        <>
                          <th className="px-4 py-3 text-center text-xs font-bold text-blue-800 uppercase tracking-wider bg-blue-50 border-l border-r border-blue-100">15-Year</th>
                          <th className="px-4 py-3 text-center text-xs font-bold text-purple-800 uppercase tracking-wider bg-purple-50">20-Year</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    
                    {/* Base Coat (Acrylic) OR System Primer (Silicone) */}
                    {inputs.coatingSystem !== 'Aluminum' && (estimates['10']?.baseGal > 0 || (inputs.coatingSystem === 'Silicone' && estimates['10']?.baseGal > 0)) && (
                        <tr>
                            <td className="px-4 py-3">
                                <div className="text-sm font-bold text-gray-900">Basecoat</div>
                                <div className="text-xs text-gray-500">{inputs.selectedBasecoat}</div>
                            </td>
                            <td className="px-4 py-3 text-center bg-green-50 border-l border-r border-gray-200">
                                <input
                                    type="number"
                                    step="0.01"
                                    placeholder="$/gal"
                                    value={prices.basecoat || ''}
                                    onChange={(e) => handlePriceChange('basecoat', e.target.value)}
                                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-center print:border-0 print:bg-transparent"
                                />
                            </td>
                            <td className="px-4 py-3 text-center text-sm text-gray-600 border-l border-r border-gray-200">
                                <div>{estimates['10'].baseGal} gal</div>
                                {prices.basecoat > 0 && (
                                    <div className="text-xs font-bold text-green-700">${(estimates['10'].baseGal * prices.basecoat).toFixed(2)}</div>
                                )}
                            </td>
                            {inputs.coatingSystem !== 'Aluminum' && (
                                <>
                                    <td className="px-4 py-3 text-center text-sm text-blue-800 font-semibold bg-blue-50 border-l border-r border-blue-100">
                                        <div>{estimates['15'].baseGal} gal</div>
                                        {prices.basecoat > 0 && (
                                            <div className="text-xs font-bold text-green-700">${(estimates['15'].baseGal * prices.basecoat).toFixed(2)}</div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-center text-sm text-purple-800 font-semibold bg-purple-50">
                                        <div>{estimates['20'].baseGal} gal</div>
                                        {prices.basecoat > 0 && (
                                            <div className="text-xs font-bold text-green-700">${(estimates['20'].baseGal * prices.basecoat).toFixed(2)}</div>
                                        )}
                                    </td>
                                </>
                            )}
                        </tr>
                    )}
                    
                    {/* Rust Primer (Silicone Metal Only) */}
                    {(estimates['10']?.rustPrimerGal > 0) && (
                        <tr className="bg-orange-50">
                            <td className="px-4 py-3">
                                <div className="text-sm font-bold text-orange-900">Rust Primer</div>
                                <div className="text-xs text-orange-700">{currentPrimers.rust} (Sold in 5-gal pails)</div>
                            </td>
                            <td className="px-4 py-3 text-center bg-green-50 border-l border-r border-orange-100">
                                <input
                                    type="number"
                                    step="0.01"
                                    placeholder="$/gal"
                                    value={prices.rustPrimer || ''}
                                    onChange={(e) => handlePriceChange('rustPrimer', e.target.value)}
                                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-center print:border-0 print:bg-transparent"
                                />
                            </td>
                            <td className="px-4 py-3 text-center text-sm text-orange-800 font-semibold border-l border-r border-orange-100">
                                <div>{estimates['10'].rustPrimerGal} gal</div>
                                {prices.rustPrimer > 0 && (
                                    <div className="text-xs font-bold text-green-700">${(estimates['10'].rustPrimerGal * prices.rustPrimer).toFixed(2)}</div>
                                )}
                            </td>
                            {inputs.coatingSystem !== 'Aluminum' && (
                                <>
                                    <td className="px-4 py-3 text-center text-sm text-orange-800 font-semibold border-l border-r border-orange-100">
                                        <div>{estimates['15'].rustPrimerGal} gal</div>
                                        {prices.rustPrimer > 0 && (
                                            <div className="text-xs font-bold text-green-700">${(estimates['15'].rustPrimerGal * prices.rustPrimer).toFixed(2)}</div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-center text-sm text-orange-800 font-semibold">
                                        <div>{estimates['20'].rustPrimerGal} gal</div>
                                        {prices.rustPrimer > 0 && (
                                            <div className="text-xs font-bold text-green-700">${(estimates['20'].rustPrimerGal * prices.rustPrimer).toFixed(2)}</div>
                                        )}
                                    </td>
                                </>
                            )}
                        </tr>
                    )}

                    {/* Adhesion Primer */}
                    {!inputs.passedAdhesion && (
                        <tr className="bg-red-50">
                            <td className="px-4 py-3">
                                <div className="flex items-center gap-2 text-sm font-bold text-red-900"><AlertTriangle size={14}/> Adhesion Primer</div>
                                <div className="text-xs text-red-700">{currentPrimers.adhesion} (Sold in 1-gal containers)</div>
                            </td>
                            <td className="px-4 py-3 text-center bg-green-50 border-l border-r border-red-100">
                                <input
                                    type="number"
                                    step="0.01"
                                    placeholder="$/gal"
                                    value={prices.adhesionPrimer || ''}
                                    onChange={(e) => handlePriceChange('adhesionPrimer', e.target.value)}
                                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-center print:border-0 print:bg-transparent"
                                />
                            </td>
                            <td className="px-4 py-3 text-center text-sm text-red-700 border-l border-r border-red-100">
                                <div>{estimates['10'].adhesionPrimerGal} gal</div>
                                {prices.adhesionPrimer > 0 && (
                                    <div className="text-xs font-bold text-green-700">${(estimates['10'].adhesionPrimerGal * prices.adhesionPrimer).toFixed(2)}</div>
                                )}
                            </td>
                            {inputs.coatingSystem !== 'Aluminum' && (
                                <>
                                    <td className="px-4 py-3 text-center text-sm text-red-700 font-semibold border-l border-r border-red-100">
                                        <div>{estimates['15'].adhesionPrimerGal} gal</div>
                                        {prices.adhesionPrimer > 0 && (
                                            <div className="text-xs font-bold text-green-700">${(estimates['15'].adhesionPrimerGal * prices.adhesionPrimer).toFixed(2)}</div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-center text-sm text-red-700 font-semibold">
                                        <div>{estimates['20'].adhesionPrimerGal} gal</div>
                                        {prices.adhesionPrimer > 0 && (
                                            <div className="text-xs font-bold text-green-700">${(estimates['20'].adhesionPrimerGal * prices.adhesionPrimer).toFixed(2)}</div>
                                        )}
                                    </td>
                                </>
                            )}
                        </tr>
                    )}

                    {/* Top Coat 1 */}
                    {(estimates['10']?.top1Gal > 0 || estimates['15']?.top1Gal > 0 || estimates['20']?.top1Gal > 0) && (
                        <tr>
                            <td className="px-4 py-3">
                                <div className="text-sm font-bold text-gray-900">Topcoat 1</div>
                                <div className="text-xs text-gray-500">{inputs.selectedTopcoat}</div>
                            </td>
                            <td className="px-4 py-3 text-center bg-green-50 border-l border-r border-gray-200">
                                <input
                                    type="number"
                                    step="0.01"
                                    placeholder="$/gal"
                                    value={prices.topcoat || ''}
                                    onChange={(e) => handlePriceChange('topcoat', e.target.value)}
                                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-center print:border-0 print:bg-transparent"
                                />
                            </td>
                            <td className="px-4 py-3 text-center text-lg font-bold text-gray-900 border-l border-r border-gray-200">
                                <div>{estimates['10'].top1Gal} gal</div>
                                {prices.topcoat > 0 && (
                                    <div className="text-xs font-bold text-green-700">${(estimates['10'].top1Gal * prices.topcoat).toFixed(2)}</div>
                                )}
                            </td>
                            {inputs.coatingSystem !== 'Aluminum' && (
                                <>
                                    <td className="px-4 py-3 text-center text-lg font-bold text-blue-700 bg-blue-50 border-l border-r border-blue-100">
                                        <div>{estimates['15'].top1Gal} gal</div>
                                        {prices.topcoat > 0 && (
                                            <div className="text-xs font-bold text-green-700">${(estimates['15'].top1Gal * prices.topcoat).toFixed(2)}</div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-center text-lg font-bold text-purple-700 bg-purple-50">
                                        <div>{estimates['20'].top1Gal} gal</div>
                                        {prices.topcoat > 0 && (
                                            <div className="text-xs font-bold text-green-700">${(estimates['20'].top1Gal * prices.topcoat).toFixed(2)}</div>
                                        )}
                                    </td>
                                </>
                            )}
                        </tr>
                    )}

                    {/* Top Coat 2 */}
                    {(estimates['10']?.top2Gal > 0 || estimates['15']?.top2Gal > 0 || estimates['20']?.top2Gal > 0) && (
                        <tr>
                            <td className="px-4 py-3">
                                <div className="text-sm font-bold text-gray-900">Topcoat 2</div>
                                <div className="text-xs text-gray-500">{inputs.selectedTopcoat}</div>
                            </td>
                            <td className="px-4 py-3 text-center bg-gray-50 border-l border-r border-gray-200">
                                <div className="text-xs text-gray-500">Same as above</div>
                            </td>
                            <td className="px-4 py-3 text-center text-lg font-bold text-gray-900 border-l border-r border-gray-200">
                                <div>{estimates['10'].top2Gal} gal</div>
                                {prices.topcoat > 0 && (
                                    <div className="text-xs font-bold text-green-700">${(estimates['10'].top2Gal * prices.topcoat).toFixed(2)}</div>
                                )}
                            </td>
                            {inputs.coatingSystem !== 'Aluminum' && (
                                <>
                                    <td className="px-4 py-3 text-center text-lg font-bold text-blue-700 bg-blue-50 border-l border-r border-blue-100">
                                        <div>{estimates['15'].top2Gal} gal</div>
                                        {prices.topcoat > 0 && (
                                            <div className="text-xs font-bold text-green-700">${(estimates['15'].top2Gal * prices.topcoat).toFixed(2)}</div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-center text-lg font-bold text-purple-700 bg-purple-50">
                                        <div>{estimates['20'].top2Gal} gal</div>
                                        {prices.topcoat > 0 && (
                                            <div className="text-xs font-bold text-green-700">${(estimates['20'].top2Gal * prices.topcoat).toFixed(2)}</div>
                                        )}
                                    </td>
                                </>
                            )}
                        </tr>
                    )}

                    {/* Top Coat 3 */}
                    {(estimates['10']?.top3Gal > 0 || estimates['15']?.top3Gal > 0 || estimates['20']?.top3Gal > 0) && (
                        <tr>
                            <td className="px-4 py-3">
                                <div className="text-sm font-bold text-gray-900">Topcoat 3</div>
                                <div className="text-xs text-gray-500">{inputs.selectedTopcoat}</div>
                            </td>
                            <td className="px-4 py-3 text-center bg-gray-50 border-l border-r border-gray-200">
                                <div className="text-xs text-gray-500">Same as above</div>
                            </td>
                            <td className="px-4 py-3 text-center text-lg font-bold text-gray-900 border-l border-r border-gray-200">
                                <div>{estimates['10'].top3Gal} gal</div>
                                {prices.topcoat > 0 && (
                                    <div className="text-xs font-bold text-green-700">${(estimates['10'].top3Gal * prices.topcoat).toFixed(2)}</div>
                                )}
                            </td>
                            {inputs.coatingSystem !== 'Aluminum' && (
                                <>
                                    <td className="px-4 py-3 text-center text-lg font-bold text-blue-700 bg-blue-50 border-l border-r border-blue-100">
                                        <div>{estimates['15'].top3Gal} gal</div>
                                        {prices.topcoat > 0 && (
                                            <div className="text-xs font-bold text-green-700">${(estimates['15'].top3Gal * prices.topcoat).toFixed(2)}</div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-center text-lg font-bold text-purple-700 bg-purple-50">
                                        <div>{estimates['20'].top3Gal} gal</div>
                                        {prices.topcoat > 0 && (
                                            <div className="text-xs font-bold text-green-700">${(estimates['20'].top3Gal * prices.topcoat).toFixed(2)}</div>
                                        )}
                                    </td>
                                </>
                            )}
                        </tr>
                    )}

                    {/* Total System Gallons */}
                    <tr className="bg-gray-200">
                        <td className="px-4 py-3 text-sm font-bold text-gray-900">TOTAL SYSTEM (Gallons)</td>
                        <td className="px-4 py-3 text-center bg-gray-100 border-l border-r border-gray-300">
                            <div className="text-xs text-gray-600">Materials Subtotal</div>
                        </td>
                        <td className="px-4 py-3 text-center text-lg font-black text-gray-900 border-l border-r border-gray-300">
                            <div>{estimates['10'].totalGallons} gal</div>
                            {(prices.basecoat > 0 || prices.topcoat > 0 || prices.adhesionPrimer > 0 || prices.rustPrimer > 0) && (
                                <div className="text-sm font-black text-green-700">
                                    ${((estimates['10'].baseGal || 0) * prices.basecoat +
                                       (estimates['10'].top1Gal || 0) * prices.topcoat +
                                       (estimates['10'].top2Gal || 0) * prices.topcoat +
                                       (estimates['10'].top3Gal || 0) * prices.topcoat +
                                       (estimates['10'].adhesionPrimerGal || 0) * prices.adhesionPrimer +
                                       (estimates['10'].rustPrimerGal || 0) * prices.rustPrimer).toFixed(2)}
                                </div>
                            )}
                        </td>
                        {inputs.coatingSystem !== 'Aluminum' && (
                            <>
                                <td className="px-4 py-3 text-center text-lg font-black text-blue-900 bg-blue-100 border-l border-r border-blue-200">
                                    <div>{estimates['15'].totalGallons} gal</div>
                                    {(prices.basecoat > 0 || prices.topcoat > 0 || prices.adhesionPrimer > 0 || prices.rustPrimer > 0) && (
                                        <div className="text-sm font-black text-green-700">
                                            ${((estimates['15'].baseGal || 0) * prices.basecoat +
                                               (estimates['15'].top1Gal || 0) * prices.topcoat +
                                               (estimates['15'].top2Gal || 0) * prices.topcoat +
                                               (estimates['15'].top3Gal || 0) * prices.topcoat +
                                               (estimates['15'].adhesionPrimerGal || 0) * prices.adhesionPrimer +
                                               (estimates['15'].rustPrimerGal || 0) * prices.rustPrimer).toFixed(2)}
                                        </div>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-center text-lg font-black text-purple-900 bg-purple-100">
                                    <div>{estimates['20'].totalGallons} gal</div>
                                    {(prices.basecoat > 0 || prices.topcoat > 0 || prices.adhesionPrimer > 0 || prices.rustPrimer > 0) && (
                                        <div className="text-sm font-black text-green-700">
                                            ${((estimates['20'].baseGal || 0) * prices.basecoat +
                                               (estimates['20'].top1Gal || 0) * prices.topcoat +
                                               (estimates['20'].top2Gal || 0) * prices.topcoat +
                                               (estimates['20'].top3Gal || 0) * prices.topcoat +
                                               (estimates['20'].adhesionPrimerGal || 0) * prices.adhesionPrimer +
                                               (estimates['20'].rustPrimerGal || 0) * prices.rustPrimer).toFixed(2)}
                                        </div>
                                    )}
                                </td>
                            </>
                        )}
                    </tr>

                    {/* Goldseal */}
                    {inputs.goldseal && (
                         <tr>
                            <td className="px-4 py-3 text-sm font-medium text-yellow-900 bg-yellow-50">Goldseal Warranty</td>
                            <td className="px-4 py-3 text-center bg-yellow-50 border-l border-r border-yellow-200">
                                <div className="text-xs text-gray-500">Warranty Cost</div>
                            </td>
                            <td className="px-4 py-3 text-center text-sm font-bold text-yellow-900 bg-yellow-50 border-l border-r border-yellow-200">{formatCurrency(estimates['10'].goldsealCost)}</td>
                            {inputs.coatingSystem !== 'Aluminum' && (
                                <>
                                    <td className="px-4 py-3 text-center text-sm font-bold text-yellow-900 bg-yellow-100 border-l border-r border-yellow-200">{formatCurrency(estimates['15'].goldsealCost)}</td>
                                    <td className="px-4 py-3 text-center text-sm font-bold text-yellow-900 bg-yellow-100">{formatCurrency(estimates['20'].goldsealCost)}</td>
                                </>
                            )}
                        </tr>
                    )}

                    {/* GRAND TOTAL */}
                    <tr className="bg-green-100 border-t-4 border-green-600">
                        <td className="px-4 py-4 text-base font-black text-gray-900">
                            {profitMargin > 0 ? 'COST TO DISTRIBUTOR' : 'GRAND TOTAL'}
                        </td>
                        <td className="px-4 py-4 text-center bg-green-50 border-l border-r border-green-200">
                            <div className="text-xs text-gray-600 print:hidden">
                                {profitMargin > 0 ? 'Your Cost' : 'All Costs'}
                            </div>
                        </td>
                        <td className="px-4 py-4 text-center border-l border-r border-green-200">
                            {(prices.basecoat > 0 || prices.topcoat > 0 || prices.adhesionPrimer > 0 || prices.rustPrimer > 0 || prices.accessory > 0 || prices.membrane > 0) ? (
                                <div className="text-xl font-black text-blue-700">
                                    ${((estimates['10'].baseGal || 0) * prices.basecoat +
                                       (estimates['10'].top1Gal || 0) * prices.topcoat +
                                       (estimates['10'].top2Gal || 0) * prices.topcoat +
                                       (estimates['10'].top3Gal || 0) * prices.topcoat +
                                       (estimates['10'].adhesionPrimerGal || 0) * prices.adhesionPrimer +
                                       (estimates['10'].rustPrimerGal || 0) * prices.rustPrimer +
                                       (commonResults.accessoryQty || 0) * prices.accessory +
                                       (commonResults.membraneRolls || 0) * prices.membrane +
                                       (estimates['10'].goldsealCost || 0)).toFixed(2)}
                                </div>
                            ) : (
                                <div className="text-sm text-gray-500">Enter prices</div>
                            )}
                        </td>
                        {inputs.coatingSystem !== 'Aluminum' && (
                            <>
                                <td className="px-4 py-4 text-center bg-blue-50 border-l border-r border-blue-200">
                                    {(prices.basecoat > 0 || prices.topcoat > 0 || prices.adhesionPrimer > 0 || prices.rustPrimer > 0 || prices.accessory > 0 || prices.membrane > 0) ? (
                                        <div className="text-xl font-black text-blue-700">
                                            ${((estimates['15'].baseGal || 0) * prices.basecoat +
                                               (estimates['15'].top1Gal || 0) * prices.topcoat +
                                               (estimates['15'].top2Gal || 0) * prices.topcoat +
                                               (estimates['15'].top3Gal || 0) * prices.topcoat +
                                               (estimates['15'].adhesionPrimerGal || 0) * prices.adhesionPrimer +
                                               (estimates['15'].rustPrimerGal || 0) * prices.rustPrimer +
                                               (commonResults.accessoryQty || 0) * prices.accessory +
                                               (commonResults.membraneRolls || 0) * prices.membrane +
                                               (estimates['15'].goldsealCost || 0)).toFixed(2)}
                                        </div>
                                    ) : (
                                        <div className="text-sm text-gray-500">Enter prices</div>
                                    )}
                                </td>
                                <td className="px-4 py-4 text-center bg-purple-50">
                                    {(prices.basecoat > 0 || prices.topcoat > 0 || prices.adhesionPrimer > 0 || prices.rustPrimer > 0 || prices.accessory > 0 || prices.membrane > 0) ? (
                                        <div className="text-xl font-black text-blue-700">
                                            ${((estimates['20'].baseGal || 0) * prices.basecoat +
                                               (estimates['20'].top1Gal || 0) * prices.topcoat +
                                               (estimates['20'].top2Gal || 0) * prices.topcoat +
                                               (estimates['20'].top3Gal || 0) * prices.topcoat +
                                               (estimates['20'].adhesionPrimerGal || 0) * prices.adhesionPrimer +
                                               (estimates['20'].rustPrimerGal || 0) * prices.rustPrimer +
                                               (commonResults.accessoryQty || 0) * prices.accessory +
                                               (commonResults.membraneRolls || 0) * prices.membrane +
                                               (estimates['20'].goldsealCost || 0)).toFixed(2)}
                                        </div>
                                    ) : (
                                        <div className="text-sm text-gray-500">Enter prices</div>
                                    )}
                                </td>
                            </>
                        )}
                    </tr>

                    {/* CONTRACTOR PRICE (With Margin) - Only shows when margin is applied */}
                    {profitMargin > 0 && (prices.basecoat > 0 || prices.topcoat > 0) && (
                        <tr className="bg-gradient-to-r from-green-100 to-emerald-100 border-t-2 border-green-500">
                            <td className="px-4 py-4 text-base font-black text-gray-900">CONTRACTOR PRICE</td>
                            <td className="px-4 py-4 text-center bg-green-50 border-l border-r border-green-200">
                                <div className="text-xs text-green-700 font-semibold print:hidden">{profitMargin}% Margin</div>
                            </td>
                            <td className="px-4 py-4 text-center border-l border-r border-green-200">
                                <div className="text-2xl font-black text-green-700">
                                    ${(((estimates['10'].baseGal || 0) * prices.basecoat +
                                       (estimates['10'].top1Gal || 0) * prices.topcoat +
                                       (estimates['10'].top2Gal || 0) * prices.topcoat +
                                       (estimates['10'].top3Gal || 0) * prices.topcoat +
                                       (estimates['10'].adhesionPrimerGal || 0) * prices.adhesionPrimer +
                                       (estimates['10'].rustPrimerGal || 0) * prices.rustPrimer +
                                       (commonResults.accessoryQty || 0) * prices.accessory +
                                       (commonResults.membraneRolls || 0) * prices.membrane +
                                       (estimates['10'].goldsealCost || 0)) / (1 - profitMargin / 100)).toFixed(2)}
                                </div>
                            </td>
                            {inputs.coatingSystem !== 'Aluminum' && (
                                <>
                                    <td className="px-4 py-4 text-center bg-blue-50 border-l border-r border-blue-200">
                                        <div className="text-2xl font-black text-green-700">
                                            ${(((estimates['15'].baseGal || 0) * prices.basecoat +
                                               (estimates['15'].top1Gal || 0) * prices.topcoat +
                                               (estimates['15'].top2Gal || 0) * prices.topcoat +
                                               (estimates['15'].top3Gal || 0) * prices.topcoat +
                                               (estimates['15'].adhesionPrimerGal || 0) * prices.adhesionPrimer +
                                               (estimates['15'].rustPrimerGal || 0) * prices.rustPrimer +
                                               (commonResults.accessoryQty || 0) * prices.accessory +
                                               (commonResults.membraneRolls || 0) * prices.membrane +
                                               (estimates['15'].goldsealCost || 0)) / (1 - profitMargin / 100)).toFixed(2)}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-center bg-purple-50">
                                        <div className="text-2xl font-black text-green-700">
                                            ${(((estimates['20'].baseGal || 0) * prices.basecoat +
                                               (estimates['20'].top1Gal || 0) * prices.topcoat +
                                               (estimates['20'].top2Gal || 0) * prices.topcoat +
                                               (estimates['20'].top3Gal || 0) * prices.topcoat +
                                               (estimates['20'].adhesionPrimerGal || 0) * prices.adhesionPrimer +
                                               (estimates['20'].rustPrimerGal || 0) * prices.rustPrimer +
                                               (commonResults.accessoryQty || 0) * prices.accessory +
                                               (commonResults.membraneRolls || 0) * prices.membrane +
                                               (estimates['20'].goldsealCost || 0)) / (1 - profitMargin / 100)).toFixed(2)}
                                        </div>
                                    </td>
                                </>
                            )}
                        </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* ENERGY SAVINGS ESTIMATOR (TOGGLEABLE) */}
              <div className="mt-6 print:hidden">
                <button
                  onClick={() => setShowEnergySavings(!showEnergySavings)}
                  className="w-full bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-300 rounded-lg p-4 flex items-center justify-between text-left hover:from-green-100 hover:to-blue-100 transition-all shadow-sm"
                >
                  <span className="flex items-center gap-2 font-semibold text-gray-700">
                    <Zap className="text-green-600" size={20} />
                    Energy Savings Estimator (Optional)
                  </span>
                  {showEnergySavings ? <ChevronUp size={20} className="text-gray-600" /> : <ChevronDown size={20} className="text-gray-600" />}
                </button>

                {showEnergySavings && (
                  <div className="mt-2">
                    <EnergySavingsEstimator
                      roofSize={inputs.roofSizeSqFt}
                      roofType={inputs.roofType}
                      coatingSystem={inputs.coatingSystem}
                      onResultsChange={(results, rate) => {
                        setEnergySavingsResults(results);
                        setEnergyElectricityRate(rate);
                      }}
                    />
                  </div>
                )}
              </div>

              {/* PDF DOWNLOAD BUTTON */}
              <div className="mt-8 print:hidden">
                <button
                  onClick={generatePDF}
                  className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-4 px-6 rounded-lg shadow-lg flex items-center justify-center gap-3 transition-all transform hover:scale-105"
                >
                  <FileDown size={24} />
                  <span className="text-lg">Download PDF Quote</span>
                </button>
              </div>

              {/* COPY TO EMAIL SECTION */}
              <div className="mt-4 bg-slate-800 rounded-lg p-4 print:hidden">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-white font-semibold flex items-center gap-2"><Mail size={16}/> Copy for Email</h3>
                    <button onClick={copyToClipboard} className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded flex items-center gap-1 transition-colors">
                        {copySuccess ? <CheckCircle size={12}/> : <Copy size={12}/>} {copySuccess ? 'Copied!' : 'Copy to Clipboard'}
                    </button>
                </div>
                <textarea readOnly value={emailText} className="w-full h-32 bg-slate-900 text-slate-300 text-xs font-mono p-3 rounded border border-slate-700 focus:outline-none"/>
              </div>
            </div>
            
            {/* Footer */}
            <div className="bg-gray-100 p-4 text-xs text-center text-gray-500 border-t border-gray-200">
              <p className="mb-2">Estimates include {Math.round(inputs.wasteFactor * 100)}% Waste and {Math.round(inputs.stretchFactor * 100)}% Stretch factors.</p>
              <div className="font-bold text-gray-700 mt-2 border-t border-gray-200 pt-2">
                DISCLAIMER: THIS QUOTE IS PROVIDED AS A GUIDELINE AND ESTIMATE ONLY. ACTUAL MATERIAL QUANTITIES MAY VARY DEPENDING ON FACTORS INCLUDING BUT NOT LIMITED TO: APPLICATION RATES, TRUE MEASUREMENTS, AND WASTE FACTORS. THE END-USER IS SOLELY RESPONSIBLE FOR VERIFYING ALL MEASUREMENTS AND SITE CONDITIONS. FINAL APPROVAL OF QUANTITIES AND COSTS RESTS WITH THE PURCHASER.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
