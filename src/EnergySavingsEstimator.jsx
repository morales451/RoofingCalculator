import React, { useState, useEffect, useMemo } from 'react';
import { Info } from 'lucide-react';
import { CLIMATE_DATA, DEFAULT_STATE, getStateOptions } from './climateData.js';

/**
 * EnergySavingsEstimator Component
 *
 * Calculates energy savings from converting dark roofs to reflective white coating systems
 * Based on DOE/LBNL Cool Roof Calculator methodology and ASHRAE standards
 *
 * Climate data is loaded per-state from climateData.js (50 states + DC).
 * HVAC Efficiency: SEER 13 (typical commercial)
 * Building R-value: R-20 roof assembly (standard commercial)
 */

const EnergySavingsEstimator = ({ roofSize, roofType, coatingSystem, onResultsChange, selectedRegion, onRegionChange }) => {
  const [showInfo, setShowInfo] = useState(false);
  const [rateManuallySet, setRateManuallySet] = useState(false);

  // Get climate data for selected region (default to Texas for backward compatibility)
  const regionCode = selectedRegion || DEFAULT_STATE;
  const climateInfo = CLIMATE_DATA[regionCode];

  // The field may be blank while typing; calculations fall back to the regional average
  const [rateInput, setRateInput] = useState(String(climateInfo.electricityRate));
  const electricityRate = parseFloat(rateInput) > 0 ? parseFloat(rateInput) : climateInfo.electricityRate;

  // Auto-fill electricity rate when region changes (unless user manually edited it)
  useEffect(() => {
    if (!rateManuallySet) {
      setRateInput(String(CLIMATE_DATA[regionCode].electricityRate));
    }
  }, [regionCode, rateManuallySet]);

  // Derived climate constants from regional data
  const COOLING_DEGREE_DAYS = climateInfo.cdd;
  const SOLAR_RADIATION_KWH_M2 = climateInfo.solarRadiation;
  const HVAC_SEER = 13; // HVAC efficiency is building-specific, not regional
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
     * HIGHLY CONSERVATIVE ROOF FACTOR CALCULATION
     * Industry studies show cool roof savings are typically $0.25-$0.75 per sq ft/year
     * This calculator targets the LOW END of that range for credibility
     *
     * This factor accounts for:
     * - Cooling season length (varies by region: 15% Alaska to 85% Hawaii)
     * - Heat transfer through R-20 roof (~35% efficiency)
     * - Building characteristics (thermal mass, occupancy patterns, internal gains)
     * - Only conditioned space benefits (not warehouses or unconditioned areas)
     * - Time lag effects and thermal inertia
     * - Real-world HVAC cycling and inefficiencies
     *
     * Combined conservative factor: coolingSeasonFraction × 0.35 (heat transfer) × 0.40 (building reality)
     * For Texas: 0.60 × 0.35 × 0.40 = 0.084 (~$0.30/sq ft/year, low end of industry range)
     */
    const ROOF_FACTOR = climateInfo.coolingSeasonFraction * 0.35 * 0.40;

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

  // Memoize results to prevent infinite loop - only recalculate when inputs actually change
  const results = useMemo(() => calculateSavings(), [roofSize, roofType, coatingSystem, electricityRate, regionCode]);

  // Send results back to parent component when they change
  useEffect(() => {
    if (onResultsChange) {
      onResultsChange(results, electricityRate, regionCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // Intentionally excluding onResultsChange from dependencies to prevent infinite loop
    // The callback is created inline in parent, so it changes every render
    // We only want to run this effect when the actual data (results/electricityRate/regionCode) changes
  }, [results, electricityRate, regionCode]);

  if (!results) {
    return (
      <p className="px-4 sm:px-5 py-4 text-[13px] text-ink-3">
        Enter the roof area and choose a reflective coating system to estimate energy savings.
      </p>
    );
  }

  const fmt = (n) => `$${n.toLocaleString()}`;

  return (
    <div className="px-4 sm:px-5 py-4 space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="energyRegion" className="label">Region</label>
          <select
            id="energyRegion"
            value={regionCode}
            onChange={(e) => {
              setRateManuallySet(false);
              onRegionChange(e.target.value);
            }}
            className="input"
          >
            {getStateOptions().map(({ code, name }) => (
              <option key={code} value={code}>
                {name} (Zone {CLIMATE_DATA[code].climateZone})
              </option>
            ))}
          </select>
          <p className="hint num">Zone {climateInfo.climateZone} · {climateInfo.cdd} CDD · {climateInfo.solarRadiation} kWh/m²/yr</p>
        </div>
        <div>
          <label htmlFor="energyRate" className="label">Electricity rate <span className="font-normal text-ink-3">$/kWh</span></label>
          <input
            id="energyRate"
            type="number"
            inputMode="decimal"
            step="0.01"
            value={rateInput}
            onChange={(e) => {
              setRateManuallySet(true);
              setRateInput(e.target.value);
            }}
            className="input num"
          />
          <p className="hint num">{climateInfo.name} average ${climateInfo.electricityRate.toFixed(2)}/kWh. Use the utility bill rate if known.</p>
        </div>
      </div>

      <dl className="grid grid-cols-2 border border-line rounded-md divide-x divide-line">
        <div className="px-3.5 py-3">
          <dt className="text-xs text-ink-3">Annual savings</dt>
          <dd className="text-base font-semibold num mt-0.5">{fmt(results.annualSavingsLow)} – {fmt(results.annualSavingsHigh)}</dd>
          <dd className="text-xs text-ink-3 num mt-0.5">{results.annualKwhSavings.toLocaleString()} kWh/yr less cooling</dd>
        </div>
        <div className="px-3.5 py-3">
          <dt className="text-xs text-ink-3">Peak cooling reduction</dt>
          <dd className="text-base font-semibold num mt-0.5">{results.tonsOfCooling} tons</dd>
          <dd className="text-xs text-ink-3 mt-0.5">AC capacity at peak sun</dd>
        </div>
      </dl>

      <table className="order w-full text-sm border border-line rounded-md overflow-hidden">
        <thead>
          <tr>
            <th scope="col">Savings over warranty</th>
            <th scope="col">10-year</th>
            <th scope="col">15-year</th>
            <th scope="col">20-year</th>
          </tr>
        </thead>
        <tbody>
          <tr className="row-meta">
            <td className="text-ink-3 !pt-2.5 !pb-2.5">With 3%/yr rate increase</td>
            <td className="num font-medium text-ink !pt-2.5">{fmt(results.roi10Year)}</td>
            <td className="num font-medium text-ink !pt-2.5">{fmt(results.roi15Year)}</td>
            <td className="num font-medium text-ink !pt-2.5">{fmt(results.roi20Year)}</td>
          </tr>
        </tbody>
      </table>

      <p className="text-[13px] text-ink-2">
        Reflectance: {results.beforeRoof} → {results.afterRoof} <span className="font-semibold num">+{results.deltaReflectance}%</span>
      </p>

      <div>
        <button
          type="button"
          onClick={() => setShowInfo(!showInfo)}
          aria-expanded={showInfo}
          className="flex items-center gap-1.5 text-[13px] font-medium text-accent-600 hover:text-accent-700"
        >
          <Info size={14} /> {showInfo ? 'Hide methodology' : 'How this is calculated'}
        </button>
        {showInfo && (
          <ul className="mt-2 text-xs text-ink-2 space-y-1 list-disc pl-4 leading-relaxed">
            <li>Based on DOE/LBNL Cool Roof Calculator and ASHRAE 90.1 standards</li>
            <li>{climateInfo.name} climate (Zone {climateInfo.climateZone}): {COOLING_DEGREE_DAYS} cooling degree days, {SOLAR_RADIATION_KWH_M2} kWh/m²/year solar radiation</li>
            <li>Commercial HVAC: SEER {HVAC_SEER} efficiency assumed</li>
            <li>Roof assembly: R-20 insulation (standard commercial construction)</li>
            <li>Reflectance change: {results.beforeRoof} → {results.afterRoof} (+{results.deltaReflectance}% reflectivity)</li>
            <li>Highly conservative factors applied: cooling season ({Math.round(climateInfo.coolingSeasonFraction * 100)}%), building reality (40%), realistic heat transfer (35%)</li>
            <li>Targets the low end of the industry range: $0.25–$0.75 per sq ft/year (aiming for ~$0.30/sq ft)</li>
            <li>ROI includes a 3% annual electricity rate increase</li>
          </ul>
        )}
      </div>

      <p className="text-xs text-ink-3 leading-relaxed">
        Estimates use {climateInfo.name} (Zone {climateInfo.climateZone}) climate data and typical commercial building characteristics.
        Actual savings vary by building insulation, HVAC efficiency, occupancy patterns and weather. These are conservative engineering estimates for planning purposes.
      </p>
    </div>
  );
};

export default EnergySavingsEstimator;
