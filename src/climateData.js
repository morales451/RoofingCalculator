/**
 * US Climate Data by State for Cool Roof Energy Savings Calculations
 *
 * Sources:
 * - Cooling Degree Days: NOAA 30-year normals (base 65°F)
 * - Solar Radiation: NREL National Solar Radiation Database (annual GHI kWh/m²)
 * - Electricity Rates: EIA state average commercial rates
 * - Climate Zones: ASHRAE 169-2021
 *
 * Each state uses population-weighted averages of major metro areas.
 * coolingSeasonFraction replaces the hardcoded 0.60 (Texas) in the ROOF_FACTOR calculation.
 */

export const CLIMATE_DATA = {
  AL: { name: 'Alabama',             cdd: 2100, solarRadiation: 1400, electricityRate: 0.13, climateZone: '3A',  coolingSeasonFraction: 0.55 },
  AK: { name: 'Alaska',              cdd:  100, solarRadiation:  850, electricityRate: 0.23, climateZone: '7',   coolingSeasonFraction: 0.15 },
  AZ: { name: 'Arizona',             cdd: 3800, solarRadiation: 1800, electricityRate: 0.13, climateZone: '2B',  coolingSeasonFraction: 0.65 },
  AR: { name: 'Arkansas',            cdd: 2000, solarRadiation: 1380, electricityRate: 0.10, climateZone: '3A',  coolingSeasonFraction: 0.50 },
  CA: { name: 'California',          cdd: 1200, solarRadiation: 1600, electricityRate: 0.22, climateZone: '3B',  coolingSeasonFraction: 0.45 },
  CO: { name: 'Colorado',            cdd:  900, solarRadiation: 1550, electricityRate: 0.13, climateZone: '5B',  coolingSeasonFraction: 0.35 },
  CT: { name: 'Connecticut',         cdd:  700, solarRadiation: 1150, electricityRate: 0.21, climateZone: '5A',  coolingSeasonFraction: 0.30 },
  DE: { name: 'Delaware',            cdd: 1200, solarRadiation: 1250, electricityRate: 0.12, climateZone: '4A',  coolingSeasonFraction: 0.40 },
  DC: { name: 'Washington DC',       cdd: 1500, solarRadiation: 1250, electricityRate: 0.13, climateZone: '4A',  coolingSeasonFraction: 0.42 },
  FL: { name: 'Florida',             cdd: 3500, solarRadiation: 1500, electricityRate: 0.13, climateZone: '2A',  coolingSeasonFraction: 0.70 },
  GA: { name: 'Georgia',             cdd: 2200, solarRadiation: 1400, electricityRate: 0.12, climateZone: '3A',  coolingSeasonFraction: 0.55 },
  HI: { name: 'Hawaii',              cdd: 4600, solarRadiation: 1650, electricityRate: 0.37, climateZone: '1A',  coolingSeasonFraction: 0.85 },
  ID: { name: 'Idaho',               cdd:  600, solarRadiation: 1400, electricityRate: 0.10, climateZone: '5B',  coolingSeasonFraction: 0.30 },
  IL: { name: 'Illinois',            cdd: 1100, solarRadiation: 1200, electricityRate: 0.11, climateZone: '5A',  coolingSeasonFraction: 0.35 },
  IN: { name: 'Indiana',             cdd: 1050, solarRadiation: 1200, electricityRate: 0.12, climateZone: '5A',  coolingSeasonFraction: 0.35 },
  IA: { name: 'Iowa',                cdd:  900, solarRadiation: 1250, electricityRate: 0.13, climateZone: '5A',  coolingSeasonFraction: 0.30 },
  KS: { name: 'Kansas',              cdd: 1500, solarRadiation: 1400, electricityRate: 0.13, climateZone: '4A',  coolingSeasonFraction: 0.40 },
  KY: { name: 'Kentucky',            cdd: 1300, solarRadiation: 1250, electricityRate: 0.11, climateZone: '4A',  coolingSeasonFraction: 0.40 },
  LA: { name: 'Louisiana',           cdd: 2700, solarRadiation: 1400, electricityRate: 0.10, climateZone: '2A',  coolingSeasonFraction: 0.60 },
  ME: { name: 'Maine',               cdd:  400, solarRadiation: 1100, electricityRate: 0.17, climateZone: '6A',  coolingSeasonFraction: 0.20 },
  MD: { name: 'Maryland',            cdd: 1300, solarRadiation: 1250, electricityRate: 0.14, climateZone: '4A',  coolingSeasonFraction: 0.40 },
  MA: { name: 'Massachusetts',       cdd:  700, solarRadiation: 1150, electricityRate: 0.23, climateZone: '5A',  coolingSeasonFraction: 0.30 },
  MI: { name: 'Michigan',            cdd:  700, solarRadiation: 1100, electricityRate: 0.17, climateZone: '5A',  coolingSeasonFraction: 0.28 },
  MN: { name: 'Minnesota',           cdd:  700, solarRadiation: 1200, electricityRate: 0.13, climateZone: '6A',  coolingSeasonFraction: 0.25 },
  MS: { name: 'Mississippi',         cdd: 2300, solarRadiation: 1400, electricityRate: 0.11, climateZone: '3A',  coolingSeasonFraction: 0.55 },
  MO: { name: 'Missouri',            cdd: 1400, solarRadiation: 1300, electricityRate: 0.11, climateZone: '4A',  coolingSeasonFraction: 0.40 },
  MT: { name: 'Montana',             cdd:  400, solarRadiation: 1350, electricityRate: 0.12, climateZone: '6B',  coolingSeasonFraction: 0.22 },
  NE: { name: 'Nebraska',            cdd: 1100, solarRadiation: 1350, electricityRate: 0.11, climateZone: '5A',  coolingSeasonFraction: 0.35 },
  NV: { name: 'Nevada',              cdd: 2800, solarRadiation: 1750, electricityRate: 0.11, climateZone: '3B',  coolingSeasonFraction: 0.55 },
  NH: { name: 'New Hampshire',       cdd:  500, solarRadiation: 1100, electricityRate: 0.20, climateZone: '6A',  coolingSeasonFraction: 0.25 },
  NJ: { name: 'New Jersey',          cdd: 1000, solarRadiation: 1200, electricityRate: 0.16, climateZone: '4A',  coolingSeasonFraction: 0.35 },
  NM: { name: 'New Mexico',          cdd: 1800, solarRadiation: 1750, electricityRate: 0.13, climateZone: '4B',  coolingSeasonFraction: 0.50 },
  NY: { name: 'New York',            cdd:  800, solarRadiation: 1150, electricityRate: 0.19, climateZone: '4A',  coolingSeasonFraction: 0.30 },
  NC: { name: 'North Carolina',      cdd: 1700, solarRadiation: 1350, electricityRate: 0.11, climateZone: '4A',  coolingSeasonFraction: 0.45 },
  ND: { name: 'North Dakota',        cdd:  600, solarRadiation: 1250, electricityRate: 0.11, climateZone: '6A',  coolingSeasonFraction: 0.22 },
  OH: { name: 'Ohio',                cdd:  900, solarRadiation: 1150, electricityRate: 0.12, climateZone: '5A',  coolingSeasonFraction: 0.32 },
  OK: { name: 'Oklahoma',            cdd: 2200, solarRadiation: 1450, electricityRate: 0.11, climateZone: '3A',  coolingSeasonFraction: 0.50 },
  OR: { name: 'Oregon',              cdd:  400, solarRadiation: 1250, electricityRate: 0.11, climateZone: '4C',  coolingSeasonFraction: 0.25 },
  PA: { name: 'Pennsylvania',        cdd:  800, solarRadiation: 1150, electricityRate: 0.14, climateZone: '5A',  coolingSeasonFraction: 0.30 },
  RI: { name: 'Rhode Island',        cdd:  600, solarRadiation: 1150, electricityRate: 0.22, climateZone: '5A',  coolingSeasonFraction: 0.28 },
  SC: { name: 'South Carolina',      cdd: 2000, solarRadiation: 1400, electricityRate: 0.13, climateZone: '3A',  coolingSeasonFraction: 0.50 },
  SD: { name: 'South Dakota',        cdd:  800, solarRadiation: 1300, electricityRate: 0.12, climateZone: '6A',  coolingSeasonFraction: 0.28 },
  TN: { name: 'Tennessee',           cdd: 1600, solarRadiation: 1300, electricityRate: 0.11, climateZone: '4A',  coolingSeasonFraction: 0.45 },
  TX: { name: 'Texas',               cdd: 2650, solarRadiation: 1450, electricityRate: 0.12, climateZone: '2A',  coolingSeasonFraction: 0.60 },
  UT: { name: 'Utah',                cdd: 1200, solarRadiation: 1550, electricityRate: 0.11, climateZone: '5B',  coolingSeasonFraction: 0.38 },
  VT: { name: 'Vermont',             cdd:  400, solarRadiation: 1100, electricityRate: 0.19, climateZone: '6A',  coolingSeasonFraction: 0.22 },
  VA: { name: 'Virginia',            cdd: 1400, solarRadiation: 1300, electricityRate: 0.12, climateZone: '4A',  coolingSeasonFraction: 0.42 },
  WA: { name: 'Washington',          cdd:  400, solarRadiation: 1150, electricityRate: 0.10, climateZone: '4C',  coolingSeasonFraction: 0.22 },
  WV: { name: 'West Virginia',       cdd:  900, solarRadiation: 1200, electricityRate: 0.12, climateZone: '5A',  coolingSeasonFraction: 0.32 },
  WI: { name: 'Wisconsin',           cdd:  600, solarRadiation: 1150, electricityRate: 0.14, climateZone: '6A',  coolingSeasonFraction: 0.25 },
  WY: { name: 'Wyoming',             cdd:  500, solarRadiation: 1450, electricityRate: 0.11, climateZone: '6B',  coolingSeasonFraction: 0.25 },
};

// Default fallback (Texas) — preserves legacy behavior
export const DEFAULT_STATE = 'TX';

// Sorted list of states for dropdown
export const getStateOptions = () => {
  return Object.entries(CLIMATE_DATA)
    .map(([code, data]) => ({ code, name: data.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
};
