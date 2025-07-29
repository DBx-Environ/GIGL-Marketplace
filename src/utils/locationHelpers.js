// src/utils/locationHelpers.js

/**
 * LPA and NCA neighbour lookup data.
 * This data is parsed from the provided 'LPA_NCA_Neigbours_Lookup.xlsx - Sheet1.csv' file.
 * Key: LPA/NCA name
 * Value: Array of neighbour LPA/NCA names
 */
const LOCATION_NEIGHBOURS_LOOKUP = {
  "North Lincolnshire": {
    LPANeighbours: ["North East Lincolnshire", "West Lindsey"],
    NCANeighbours: ["Humber Estuary", "Northern Lincolnshire Edge with Coversands", "Trent and Belvoir Vales"]
  },
  "North East Lincolnshire": {
    LPANeighbours: ["North Lincolnshire", "East Lindsey", "West Lindsey"],
    NCANeighbours: ["Humberhead Levels", "Northern Lincolnshire Edge with Coversands", "Central Lincolnshire Vale", "Lincolnshire Wolds", "Lincolnshire Coast and Marshes"]
  },
  "West Lindsey": {
    LPANeighbours: ["North East Lincolnshire", "City of Lincoln", "East Lindsey", "North Kesteven", "North Lincolnshire"],
    NCANeighbours: ["Lincolnshire Wolds", "Humber Estuary", "Central Lincolnshire Vale", "The Fens"]
  },
  "East Lindsey": {
    LPANeighbours: ["West Lindsey", "North Kesteven", "Boston", "North East Lincolnshire"],
    NCANeighbours: ["Lincolnshire Coast and Marshes", "Central Lincolnshire Vale", "Humber Estuary"]
  },
  "City of Lincoln": {
    LPANeighbours: ["North Kesteven", "West Lindsey"],
    NCANeighbours: ["Lincolnshire Wolds", "The Fens", "Lincolnshire Coast and Marshes", "Humber Estuary", "Northern Lincolnshire Edge with Coversands"]
  },
  "North Kesteven": {
    LPANeighbours: ["City of Lincoln", "South Holland", "South Kesteven", "Boston", "East Lindsey", "West Lindsey"],
    NCANeighbours: ["Humber Estuary", "Humberhead Levels", "Trent and Belvoir Vales", "Central Lincolnshire Vale", "Southern Lincolnshire Edge"]
  },
  "South Kesteven": {
    LPANeighbours: ["North Kesteven", "Boston", "South Holland"],
    NCANeighbours: ["Kesteven Uplands", "Southern Lincolnshire Edge", "Central Lincolnshire Vale", "Lincolnshire Coast and Marshes"]
  },
  "South Holland": {
    LPANeighbours: ["South Kesteven", "North Kesteven", "Boston"],
    NCANeighbours: ["Northern Lincolnshire Edge with Coversands", "Trent and Belvoir Vales", "The Fens", "Kesteven Uplands"]
  },
  "Boston": {
    LPANeighbours: ["South Holland", "North Kesteven", "East Lindsey"],
    NCANeighbours: ["Kesteven Uplands", "Northern Lincolnshire Edge with Coversands", "Humberhead Levels", "Southern Lincolnshire Edge"]
  },
  "Outside Greater Lincs": { // Special case for users outside the defined areas
    LPANeighbours: [],
    NCANeighbours: ["The Fens", "Southern Lincolnshire Edge", "Trent and Belvoir Vales", "Kesteven Uplands"]
  },
  // Add any other LPAs/NCAs that might appear in opportunities but aren't in the lookup as having no neighbours
  // This ensures they are treated as 'outside' for any user
};


/**
 * Multipliers for units required based on location classification.
 * - 'within': 1x (no adjustment)
 * - 'neighbour': 1.3333x
 * - 'outside': 2x
 */
export const UNIT_MULTIPLIERS = {
  within: 1,
  neighbour: 1.33333333, // 1.3333...
  outside: 2,
};

/**
 * Multipliers for price per unit from the buyer's perspective based on location classification.
 * This is the inverse of the unit multipliers, as a higher unit requirement means the effective price
 * for the buyer is lower for the same amount of 'actual' biodiversity net gain.
 * - 'within': 1x (no adjustment)
 * - 'neighbour': 0.75x (1/1.3333...)
 * - 'outside': 0.5x (1/2)
 */
export const PRICE_MULTIPLIERS_FOR_BUYER = {
  within: 1,
  neighbour: 0.75, // 1 / 1.33333333
  outside: 0.5,    // 1 / 2
};

/**
 * Determines the location classification of a user's bid relative to an opportunity.
 *
 * @param {object} userData - The user's profile data (e.g., { HomeLPA, HomeNCA, HomeWFD }).
 * @param {object} opportunityData - The opportunity's data (e.g., { lpa, nca, wfd }).
 * @param {string} broadHabitat - The broad habitat type for the specific bid (e.g., "Watercourse", "Grassland").
 * @returns {"within" | "neighbour" | "outside"} The classification of the user's location relative to the opportunity.
 */
export function getLocationClassification(userData, opportunityData, broadHabitat) {
  const userHomeLPA = userData?.HomeLPA;
  const userHomeNCA = userData?.HomeNCA;
  const userHomeWFD = userData?.HomeWFD;

  const opportunityLPA = opportunityData?.lpa;
  const opportunityNCA = opportunityData?.nca;
  const opportunityWFD = opportunityData?.wfd;

  // Watercourse habitat has special classification rules
  if (broadHabitat === 'Watercourse') {
    // For watercourse, it's 'within' if WFD matches, otherwise 'outside'. No 'neighbour' option.
    if (userHomeWFD && opportunityWFD && userHomeWFD === opportunityWFD) {
      return 'within';
    }
    return 'outside';
  }

  // For non-watercourse habitats, check LPA and NCA
  // Check 'within' first (direct match for LPA or NCA)
  if ((userHomeLPA && opportunityLPA && userHomeLPA === opportunityLPA) ||
      (userHomeNCA && opportunityNCA && userHomeNCA === opportunityNCA)) {
    return 'within';
  }

  // Check 'neighbour' (user's LPA or NCA is a neighbour to opportunity's LPA or NCA)
  const userLPA_neighbours = LOCATION_NEIGHBOURS_LOOKUP[userHomeLPA]?.LPANeighbours || [];
  const userNCA_neighbours = LOCATION_NEIGHBOURS_LOOKUP[userHomeNCA]?.NCANeighbours || [];

  if ((opportunityLPA && userLPA_neighbours.includes(opportunityLPA)) ||
      (opportunityNCA && userNCA_neighbours.includes(opportunityNCA))) {
    return 'neighbour';
  }

  // If no direct match or neighbour match, it's 'outside'
  return 'outside';
}

/**
 * Calculates the adjusted units required for a bid based on location classification.
 * This is the amount of units the *bidder* needs to supply to meet the buyer's requirement.
 *
 * @param {number} baseUnitsRequired - The base units required by the opportunity.
 * @param {"within" | "neighbour" | "outside"} classification - The location classification.
 * @returns {number} The adjusted units required.
 */
export function getAdjustedUnitsRequired(baseUnitsRequired, classification) {
  const multiplier = UNIT_MULTIPLIERS[classification] || UNIT_MULTIPLIERS.outside; // Default to outside if classification is unknown
  return baseUnitsRequired * multiplier;
}

/**
 * Calculates the equivalent price per unit from the buyer's perspective.
 * This is the effective price the buyer pays per 'actual' unit, considering the location adjustment.
 * A lower effective price is better for the buyer.
 *
 * @param {number} pricePerUnit - The bidder's stated price per unit.
 * @param {"within" | "neighbour" | "outside"} classification - The location classification.
 * @returns {number} The equivalent price per unit from the buyer's perspective.
 */
export function getEquivalentPricePerUnitForBuyer(pricePerUnit, classification) {
  const multiplier = PRICE_MULTIPLIERS_FOR_BUYER[classification] || PRICE_MULTIPLIERS_FOR_BUYER.outside; // Default to outside if classification is unknown
  return pricePerUnit * multiplier;
}

/**
 * Processes a single habitat bid to include location classification and adjusted values.
 * This function is intended to be used when a bid is created or updated.
 *
 * @param {object} habitatBid - The individual habitat bid object from the form.
 * @param {object} opportunityHabitatRequirement - The corresponding habitat requirement from the opportunity.
 * @param {object} userData - The user's profile data.
 * @param {object} opportunityData - The full opportunity data.
 * @returns {object} The processed habitat bid with new fields.
 */
export function getAdjustedBidDetailsForHabitat(habitatBid, opportunityHabitatRequirement, userData, opportunityData) {
  const classification = getLocationClassification(
    userData,
    opportunityData,
    opportunityHabitatRequirement.broadHabitat
  );

  const baseUnitsRequired = opportunityHabitatRequirement.unitsRequired;
  const bidderPricePerUnit = parseFloat(habitatBid.pricePerUnit);

  // Calculate units the bidder needs to supply
  const adjustedUnitsToSupply = getAdjustedUnitsRequired(baseUnitsRequired, classification);

  // Calculate the effective price per unit for the buyer
  const effectivePricePerUnitForBuyer = getEquivalentPricePerUnitForBuyer(bidderPricePerUnit, classification);

  return {
    ...habitatBid,
    locationClassification: classification,
    baseUnitsRequired: baseUnitsRequired, // Store original units required by opportunity
    adjustedUnitsToSupply: adjustedUnitsToSupply, // Units bidder must supply
    effectivePricePerUnitForBuyer: effectivePricePerUnitForBuyer, // Price from buyer's perspective
    // Recalculate subtotal based on adjusted units to supply * bidder's price per unit
    // This is the total amount the bidder will charge for this habitat
    subtotal: bidderPricePerUnit * adjustedUnitsToSupply,
  };
}

