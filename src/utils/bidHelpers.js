// src/utils/bidHelpers.js
/**
 * Helper function to safely format Firestore Timestamps or Date objects to a short date string.
 * @param {firebase.firestore.Timestamp|Date|string} dateValue - The date value to format.
 * @returns {string} Formatted date string (e.g., "Jul 25, 2025").
 */
export const formatDate = (dateValue) => {
  if (!dateValue) return 'N/A';
  
  let date;
  if (typeof dateValue === 'string') {
    date = new Date(dateValue);
  } else if (dateValue.toDate && typeof dateValue.toDate === 'function') {
    date = dateValue.toDate();
  } else if (dateValue instanceof Date) {
    date = dateValue;
  } else {
    return 'Invalid date';
  }
  
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }
  
  return date.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Helper function to safely format Firestore Timestamps or Date objects to a date and time string.
 * @param {firebase.firestore.Timestamp|Date|string} dateValue - The date value to format.
 * @returns {string} Formatted date and time string (e.g., "Jul 25, 2025, 16:30").
 */
export const formatDateTime = (dateValue) => {
  if (!dateValue) return 'N/A';
  
  let date;
  if (typeof dateValue === 'string') {
    date = new Date(dateValue);
  } else if (dateValue.toDate && typeof dateValue.toDate === 'function') {
    date = dateValue.toDate();
  } else if (dateValue instanceof Date) {
    date = dateValue;
  } else {
    return 'Invalid date';
  }
  
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }
  
  return date.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Determines the display status of a bid based on its properties and associated opportunity.
 * This logic mirrors the Dashboard's bid status determination.
 * @param {object} bid - The bid object.
 * @param {Array<object>} opportunitiesData - Array of all opportunity objects.
 * @returns {string} The display status (e.g., "Active", "Overall Winner", "Withdrawn").
 */
export const getBidStatus = (bid, opportunitiesData) => {
  // FIRST: Check if bid is withdrawn (highest priority check)
  if (bid.status === 'withdrawn') {
    return 'Withdrawn';
  }
  
  // Check for any winning status
  // console.log('getBidStatus for bid:', bid.id, {
  //   isWinning: bid.isWinning,
  //   winningType: bid.winningType,
  //   habitatWins: bid.habitatWins
  // });
  
  // Check for overall winner
  if (bid.isWinning && bid.winningType === 'overall') {
    return 'Overall Winner';
  }
  
  // Check for legacy winning (old bids)
  if (bid.isWinning && !bid.winningType) {
    return 'Won';
  }
  
  // Check for habitat-specific wins
  if (bid.habitatWins && Object.keys(bid.habitatWins).length > 0) {
    const winCount = Object.values(bid.habitatWins).filter(hw => hw.isWinner).length;
    if (winCount > 0) {
      return winCount === 1 ? 'Won 1 Habitat' : `Won ${winCount} Habitats`;
    }
  }
  
  // Find the opportunity to check if it's closed
  const opportunity = opportunitiesData.find(opp => opp.id === bid.opportunityId);
  if (!opportunity) return 'Unknown';
  
  const now = new Date();
  let closingDate;
  
  // Handle different date formats
  if (typeof opportunity.closingDate === 'string') {
    closingDate = new Date(opportunity.closingDate);
  } else if (opportunity.closingDate.toDate && typeof opportunity.closingDate.toDate === 'function') {
    closingDate = opportunity.closingDate.toDate();
  } else {
    closingDate = new Date(opportunity.closingDate);
  }
  
  // Check status
  if (opportunity.status === 'closed') {
    return 'Not Selected';
  }
  
  if (now > closingDate) {
    return 'Expired';
  }
  
  return 'Active';
};


/**
 * Filters and returns only the latest (non-withdrawn) bid for each opportunity,
 * or the most recent withdrawn bid if no active bid exists.
 * This logic mirrors the Dashboard's bid filtering.
 * @param {Array<object>} bids - Array of all bid objects for a user.
 * @returns {Array<object>} Array of latest bid objects.
 */
export const getLatestBidsPerOpportunity = (bids) => {
  const bidsByOpportunity = {};
  
  bids.forEach(bid => {
    if (!bidsByOpportunity[bid.opportunityId]) {
      bidsByOpportunity[bid.opportunityId] = [];
    }
    bidsByOpportunity[bid.opportunityId].push(bid);
  });

  const latestBids = [];
  Object.keys(bidsByOpportunity).forEach(opportunityId => {
    const opportunityBids = bidsByOpportunity[opportunityId];
    
    const activeBids = opportunityBids.filter(bid => bid.status !== 'withdrawn');
    const withdrawnBids = opportunityBids.filter(bid => bid.status === 'withdrawn');
    
    if (activeBids.length > 0) {
      const sortedActiveBids = activeBids.sort((a, b) => {
        const aTime = a.updatedAt || a.createdAt;
        const bTime = b.updatedAt || b.createdAt;
        
        const aDate = aTime?.toDate ? aTime.toDate() : new Date(aTime);
        const bDate = bTime?.toDate ? bTime.toDate() : new Date(bTime);
        
        return bDate - aDate;
      });
      
      latestBids.push(sortedActiveBids[0]);
    }
    
    if (withdrawnBids.length > 0 && activeBids.length === 0) {
      const sortedWithdrawnBids = withdrawnBids.sort((a, b) => {
        const aTime = a.updatedAt || a.createdAt;
        const bTime = b.updatedAt || b.createdAt;
        
        const aDate = aTime?.toDate ? aTime.toDate() : new Date(aTime);
        const bDate = bTime?.toDate ? bTime.toDate() : new Date(bTime);
        
        return bDate - aDate;
      });
      
      latestBids.push(sortedWithdrawnBids[0]);
    }
  });

  return latestBids;
};


/**
 * Checks if an opportunity is active and open for bidding.
 * @param {object} opportunity - The opportunity object.
 * @returns {boolean} True if active and open, false otherwise.
 */
export const isOpportunityActiveAndOpen = (opportunity) => {
  if (opportunity.status !== 'active') return false;
  
  const now = new Date();
  let closingDate;
  
  if (typeof opportunity.closingDate === 'string') {
    closingDate = new Date(opportunity.closingDate);
  } else if (opportunity.closingDate.toDate && typeof opportunity.closingDate.toDate === 'function') {
    closingDate = opportunity.closingDate.toDate();
  } else {
    return false;
  }
  
  return now <= closingDate;
};


/**
 * Formats habitat requirements concisely.
 * @param {Array<object>} habitatRequirements - Array of habitat requirement objects.
 * @returns {string} Condensed string of habitat requirements.
 */
export const formatHabitatRequirementsCondensed = (habitatRequirements) => {
  if (!habitatRequirements || !Array.isArray(habitatRequirements) || habitatRequirements.length === 0) {
    return 'No requirements specified';
  }
  
  return habitatRequirements.map((req, index) => 
    `${req.specificHabitat}: ${req.unitsRequired} units`
  ).join(' • ');
};

/**
 * Determines if an opportunity is closing soon (within 2 days).
 * @param {firebase.firestore.Timestamp|Date|string} closingDate - The closing date of the opportunity.
 * @returns {boolean} True if closing soon, false otherwise.
 */
export const isOpportunityClosingSoon = (closingDate) => {
  const now = new Date();
  let closing;
  
  if (typeof closingDate === 'string') {
    closing = new Date(closingDate);
  } else if (closingDate.toDate && typeof closingDate.toDate === 'function') {
    closing = closingDate.toDate();
  } else {
    return false;
  }
  
  if (isNaN(closing.getTime())) return false;
  
  const timeDiff = closing - now;
  const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
  return daysDiff <= 2 && daysDiff > 0;
};

// Filter options from lookup data - CENTRALIZED HERE
export const LPA_OPTIONS = [
  "North Lincolnshire", "North East Lincolnshire", "West Lindsey", "East Lindsey",
  "City of Lincoln", "North Kesteven", "South Kesteven", "New Holland", 
  "Boston", "Outside Greater Lincs"
];

export const NCA_OPTIONS = [
  "Humberhead Levels", "Humber Estuary", "Lincolnshire Coast and Marshes",
  "Lincolnshire Wolds", "Central Lincolnshire Vale", 
  "Northern Lincolnshire Edge with Coversands", "The Fens",
  "Southern Lincolnshire Edge", "Trent and Belvoir Vales", "Kesteven Uplands"
];
