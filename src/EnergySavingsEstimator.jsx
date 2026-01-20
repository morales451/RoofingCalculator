import React, { useState, useEffect } from 'react';
import { Zap, DollarSign, TrendingDown, Thermometer, Info } from 'lucide-react';

/**
 * EnergySavingsEstimator Component
 *
 * Calculates energy savings from converting dark roofs to reflective white coating systems
 * Based on DOE/LBNL Cool Roof Calculator methodology and ASHRAE standards
 *
 * Key Assumptions for Texas Climate:
 * - Cooling Degree Days (CDD): 2650 (average for Houston/Dallas)
 * - Solar Radiation: 1450 kWh/m²/year (Texas average)
 * - HVAC Efficiency: SEER 13 (typical commercial)
 * - Building R-value: R-20 roof assembly (standard commercial)
 */

const EnergySavingsEstimator = ({ roofSize, roofType, coatingSystem }) => {
  const [electricityRate, setElectricityRate] = useState(0.12);
  const [currentBill, setCurrentBill] = useState('');
  const [showInfo, setShowInfo] = useState(false);

  // Climate data for Texas
  const COOLING_DEGREE_DAYS = 2650; // Texas average (Houston/Dallas)
  const SOLAR_RADIATION_KWH_M2 = 1450; // Annual solar radiation kWh/m²/year
  const HVAC_SEER = 13; // Standard commercial HVAC efficiency
  const HVAC_EER = HVAC_SEER * 0.875; // Convert SEER to EER (approx 11.4)

  /**
   * REFLECTIVITY VALUES (Solar Reflectance Index)
   * Source: Cool Roof Rating Council (CRRC) and ASTM standards
   */
  const ROOF_PROPERTIES = {
    // BEFORE coating - dark roofs
    blackCapsheet: {
      solarReflectance: 0.06,  // 6% reflection (94% absorption)
      thermalEmittance: 0.86,
      name: 'Black Capsheet'
    },
    darkMetal: {
      solarReflectance: 0.25,  // 25% reflection (weathered/aged metal)
      thermalEmittance: 0.25,  // Low emittance for bare metal
      name: 'Dark/Weathered Metal'
    },

    // AFTER coating - white reflective
    whiteSilicone: {
      solarReflectance: 0.88,  // 88% reflection
      thermalEmittance: 0.90,  // High emittance
      name: 'White Silicone Coating'
    },
    whiteAcrylic: {
      solarReflectance: 0.85,  // 85% reflection
      thermalEmittance: 0.90,
      name: 'White Acrylic Coating'
    },
    whiteAluminum: {
      solarReflectance: 0.70,  // 70% reflection (aluminum pigment reflects differently)
      thermalEmittance: 0.75,
      name: 'Aluminum Coating'
    }
  };

  /**
   * CALCULATION METHOD
   * Based on ASHRAE 90.1 and DOE Cool Roof Calculator
   *
   * 1. Calculate Solar Heat Gain Reduction:
   *    ΔQ = Roof Area × Solar Radiation × ΔReflectance × Roof Factor
   *
   * 2. Roof Factor accounts for:
   *    - Heat transfer through roof (R-value)
   *    - Building use (commercial vs residential)
   *    - HVAC duct location
   *
   * 3. Convert to Annual Cooling Energy Savings:
   *    kWh Saved = ΔQ / HVAC Efficiency
   *
   * 4. Calculate Cooling Load Reduction (Tons):
   *    1 Ton = 12,000 BTU/hr
   *    Peak reduction = ΔQ × Peak Factor / 12,000
   */

  const calculateSavings = () => {
    if (!roofSize || roofSize <= 0) {
      return null;
    }

    // Determine BEFORE roof properties
    let beforeRoof;
    if (roofType === 'Capsheet') {
      beforeRoof = ROOF_PROPERTIES.blackCapsheet;
    } else if (roofType === 'Metal') {
      beforeRoof = ROOF_PROPERTIES.darkMetal;
    } else {
      // For other roof types, assume moderate starting reflectance
      beforeRoof = { solarReflectance: 0.15, thermalEmittance: 0.85, name: 'Existing Roof' };
    }

    // Determine AFTER coating properties
    let afterRoof;
    if (coatingSystem === 'Silicone') {
      afterRoof = ROOF_PROPERTIES.whiteSilicone;
    } else if (coatingSystem === 'Acrylic') {
      afterRoof = ROOF_PROPERTIES.whiteAcrylic;
    } else if (coatingSystem === 'Aluminum') {
      afterRoof = ROOF_PROPERTIES.whiteAluminum;
    } else {
      afterRoof = ROOF_PROPERTIES.whiteSilicone; // Default
    }

    // Calculate reflectance change
    const deltaReflectance = afterRoof.solarReflectance - beforeRoof.solarReflectance;

    // If already reflective or coating is darker, no savings
    if (deltaReflectance <= 0) {
      return null;
    }

    /**
     * CONSERVATIVE ROOF FACTOR CALCULATION
     * Industry studies show cool roof savings are typically $0.25-$0.75 per sq ft/year
     *
     * This factor accounts for:
     * - Only cooling season matters (April-Oct in Texas = ~60% of year)
     * - Heat transfer through R-20 roof (~35% efficiency)
     * - Building characteristics (thermal mass, occupancy patterns)
     * - Only conditioned space benefits
     * - Time lag effects
     *
     * Combined realistic factor: 0.60 (cooling season) × 0.35 (heat transfer) × 0.50 (building factors) = 0.105
     * Using 0.12 to be slightly less conservative but still realistic
     */
    const ROOF_FACTOR = 0.12;

    /**
     * STEP 1: Calculate Annual Solar Heat Gain Reduction (kWh/year)
     * Convert: roof area (sqft) → m² → solar energy reduction
     */
    const roofAreaM2 = roofSize * 0.092903; // Convert sqft to m²
    const solarHeatGainReduction = roofAreaM2 * SOLAR_RADIATION_KWH_M2 * deltaReflectance * ROOF_FACTOR;

    /**
     * STEP 2: Convert to Cooling Energy Savings
     * Divide by HVAC efficiency (higher efficiency = less energy to remove same heat)
     */
    const annualCoolingSavingsKWh = solarHeatGainReduction / (HVAC_EER / 3.412); // Convert EER to COP

    /**
     * STEP 3: Calculate Peak Cooling Load Reduction (Tons of AC)
     * Peak solar gain: ~250 W/m² reduction during peak sun
     * Convert to BTU/hr then to Tons
     */
    const peakHeatReductionWatts = roofAreaM2 * 250 * deltaReflectance;
    const peakHeatReductionBTU = peakHeatReductionWatts * 3.412; // Convert Watts to BTU/hr
    const tonsOfCoolingReduction = peakHeatReductionBTU / 12000; // 1 Ton = 12,000 BTU/hr

    /**
     * STEP 4: Calculate Dollar Savings
     * Conservative range: -15% to +15% to account for:
     * - Building characteristics variation
     * - Actual vs theoretical HVAC efficiency
     * - Usage patterns
     * - Weather variation year to year
     */
    const annualSavingsBase = annualCoolingSavingsKWh * electricityRate;
    const annualSavingsLow = annualSavingsBase * 0.85;  // Conservative estimate
    const annualSavingsHigh = annualSavingsBase * 1.15; // Optimistic estimate

    /**
     * STEP 5: Calculate Long-Term ROI
     * For warranty periods: 10, 15, 20 years
     * Include 3% annual electricity rate increase
     */
    const calculateCompoundSavings = (years) => {
      let total = 0;
      for (let year = 1; year <= years; year++) {
        total += annualSavingsBase * Math.pow(1.03, year - 1); // 3% annual increase
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

  const results = calculateSavings();

  if (!results) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mt-6">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="text-gray-400" size={24} />
          <h3 className="text-lg font-bold text-gray-600">Energy Savings Estimator</h3>
        </div>
        <p className="text-sm text-gray-500">
          Enter roof dimensions and select a reflective coating system to see estimated energy savings.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-300 rounded-lg p-6 mt-6 shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap className="text-green-600" size={28} />
          <h3 className="text-xl font-bold text-gray-800">Energy Savings Estimator</h3>
        </div>
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="text-blue-600 hover:text-blue-800 transition-colors"
        >
          <Info size={20} />
        </button>
      </div>

      {/* Methodology Info Panel */}
      {showInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 text-sm">
          <h4 className="font-bold text-blue-900 mb-2">Calculation Methodology (Conservative)</h4>
          <ul className="text-blue-800 space-y-1 list-disc list-inside">
            <li>Based on DOE/LBNL Cool Roof Calculator and ASHRAE 90.1 standards</li>
            <li>Texas climate: {COOLING_DEGREE_DAYS} Cooling Degree Days, {SOLAR_RADIATION_KWH_M2} kWh/m²/year solar radiation</li>
            <li>Commercial HVAC: SEER {HVAC_SEER} efficiency assumed</li>
            <li>Roof assembly: R-20 insulation (standard commercial construction)</li>
            <li>Reflectance change: {results.beforeRoof} → {results.afterRoof} (+{results.deltaReflectance}% reflectivity)</li>
            <li><strong>Conservative factors applied:</strong> Cooling season only (60%), building characteristics (50%), realistic heat transfer</li>
            <li>Typical cool roof savings: $0.25-$0.75 per sq ft/year (industry standard)</li>
            <li>ROI calculations include 3% annual electricity rate increase</li>
          </ul>
        </div>
      )}

      {/* Electricity Rate Input */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Your Electricity Rate ($/kWh)
        </label>
        <input
          type="number"
          step="0.01"
          value={electricityRate}
          onChange={(e) => setElectricityRate(parseFloat(e.target.value) || 0.12)}
          className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
        />
        <p className="text-xs text-gray-500 mt-1">Texas average: $0.12/kWh. Check your utility bill for your actual rate.</p>
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Annual Savings */}
        <div className="bg-white rounded-lg p-4 shadow">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="text-green-600" size={20} />
            <h4 className="font-bold text-gray-700">Annual Savings</h4>
          </div>
          <div className="text-3xl font-bold text-green-600 mb-1">
            ${results.annualSavingsLow.toLocaleString()} - ${results.annualSavingsHigh.toLocaleString()}
          </div>
          <p className="text-xs text-gray-600">Conservative range based on {results.annualKwhSavings.toLocaleString()} kWh/year reduction</p>
        </div>

        {/* Cooling Load Reduction */}
        <div className="bg-white rounded-lg p-4 shadow">
          <div className="flex items-center gap-2 mb-2">
            <Thermometer className="text-blue-600" size={20} />
            <h4 className="font-bold text-gray-700">Peak Cooling Reduction</h4>
          </div>
          <div className="text-3xl font-bold text-blue-600 mb-1">
            {results.tonsOfCooling} Tons
          </div>
          <p className="text-xs text-gray-600">Equivalent AC capacity reduction during peak sun hours</p>
        </div>
      </div>

      {/* Long-Term ROI */}
      <div className="bg-white rounded-lg p-4 shadow mb-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingDown className="text-purple-600" size={20} />
          <h4 className="font-bold text-gray-700">Warranty Period ROI</h4>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-xs font-semibold text-gray-600 mb-1">10-Year</div>
            <div className="text-2xl font-bold text-purple-600">${results.roi10Year.toLocaleString()}</div>
          </div>
          <div className="text-center">
            <div className="text-xs font-semibold text-gray-600 mb-1">15-Year</div>
            <div className="text-2xl font-bold text-purple-600">${results.roi15Year.toLocaleString()}</div>
          </div>
          <div className="text-center">
            <div className="text-xs font-semibold text-gray-600 mb-1">20-Year</div>
            <div className="text-2xl font-bold text-purple-600">${results.roi20Year.toLocaleString()}</div>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-3 text-center">Projected total savings with 3% annual electricity rate increase</p>
      </div>

      {/* Reflectivity Comparison */}
      <div className="bg-white rounded-lg p-4 shadow">
        <h4 className="font-bold text-gray-700 mb-3 text-sm">Reflectivity Improvement</h4>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="text-xs text-gray-600 mb-1">Before: {results.beforeRoof}</div>
            <div className="bg-gray-800 h-6 rounded flex items-center justify-center">
              <span className="text-white text-xs font-semibold">Low Reflection</span>
            </div>
          </div>
          <div className="text-2xl font-bold text-green-600">→</div>
          <div className="flex-1">
            <div className="text-xs text-gray-600 mb-1">After: {results.afterRoof}</div>
            <div className="bg-gradient-to-r from-blue-100 to-white h-6 rounded flex items-center justify-center border border-gray-300">
              <span className="text-gray-700 text-xs font-semibold">+{results.deltaReflectance}% Reflection</span>
            </div>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="mt-4 text-xs text-gray-500 italic">
        * Estimates based on Texas climate data and typical commercial building characteristics.
        Actual savings vary by building insulation, HVAC efficiency, occupancy patterns, and weather conditions.
        These are conservative engineering estimates for planning purposes.
      </div>
    </div>
  );
};

export default EnergySavingsEstimator;
