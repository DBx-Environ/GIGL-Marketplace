// functions/modules/bidFunctions.js - LINT FIXES: JSDoc @returns
const admin = require("firebase-admin");
const functions = require("firebase-functions");
const {sendBrevoEmail} = require("./emailFunctions");

// Inlining location helper functions for Cloud Function context to resolve import issues
const LOCATION_NEIGHBOURS_LOOKUP = {
  "North Lincolnshire": {LPANeighbours: ["North East Lincolnshire", "West Lindsey"], NCANeighbours: ["Humber Estuary", "Northern Lincolnshire Edge with Coversands", "Trent and Belvoir Vales"]},
  "North East Lincolnshire": {LPANeighbours: ["North Lincolnshire", "East Lindsey", "West Lindsey"], NCANeighbours: ["Humberhead Levels", "Northern Lincolnshire Edge with Coversands", "Central Lincolnshire Vale", "Lincolnshire Wolds", "Lincolnshire Coast and Marshes"]},
  "West Lindsey": {LPANeighbours: ["North East Lincolnshire", "City of Lincoln", "East Lindsey", "North Kesteven", "North Lincolnshire"], NCANeighbours: ["Lincolnshire Wolds", "Humber Estuary", "Central Lincolnshire Vale", "The Fens"]},
  "East Lindsey": {LPANeighbours: ["West Lindsey", "North Kesteven", "Boston", "North East Lincolnshire"], NCANeighbours: ["Lincolnshire Coast and Marshes", "Central Lincolnshire Vale", "Humber Estuary"]},
  "City of Lincoln": {LPANeighbours: ["North Kesteven", "West Lindsey"], NCANeighbours: ["Lincolnshire Wolds", "The Fens", "Lincolnshire Coast and Marshes", "Humber Estuary", "Northern Lincolnshire Edge with Coversands"]},
  "North Kesteven": {LPANeighbours: ["City of Lincoln", "South Holland", "South Kesteven", "Boston", "East Lindsey", "West Lindsey"], NCANeighbours: ["Humber Estuary", "Humberhead Levels", "Trent and Belvoir Vales", "Central Lincolnshire Vale", "Southern Lincolnshire Edge"]},
  "South Kesteven": {LPANeighbours: ["North Kesteven", "Boston", "South Holland"], NCANeighbours: ["Kesteven Uplands", "Southern Lincolnshire Edge", "Central Lincolnshire Vale", "Lincolnshire Coast and Marshes"]},
  "South Holland": {LPANeighbours: ["South Kesteven", "North Kesteven", "Boston"], NCANeighbours: ["Northern Lincolnshire Edge with Coversands", "Trent and Belvoir Vales", "The Fens", "Kesteven Uplands"]},
  "Boston": {LPANeighbours: ["South Holland", "North Kesteven", "East Lindsey"], NCANeighbours: ["Kesteven Uplands", "Northern Lincolnshire Edge with Coversands", "Humberhead Levels", "Southern Lincolnshire Edge"]},
  "Outside Greater Lincs": {LPANeighbours: [], NCANeighbours: ["The Fens", "Southern Lincolnshire Edge", "Trent and Belvoir Vales", "Kesteven Uplands"]},
};

const UNIT_MULTIPLIERS = {
  within: 1,
  neighbour: 1.33333333,
  outside: 2,
};

const PRICE_MULTIPLIERS_FOR_BUYER = {
  within: 1,
  neighbour: 1.33333333,
  outside: 2,
};

/**
 * Determines the location classification of a user's bid relative to an opportunity.
 * @param {object} userData - The user's profile data (e.g., {HomeLPA, HomeNCA, HomeWFD}).
 * @param {object} opportunityData - The opportunity's data (e.g., {lpa, nca, wfd}).
 * @param {string} broadHabitat - The broad habitat type for the specific bid (e.g., "Watercourse", "Grassland").
 * @return {"within" | "neighbour" | "outside"} The classification of the user's location relative to the opportunity.
 */
function getLocationClassification(userData, opportunityData, broadHabitat) {
  const userHomeLPA = userData?.HomeLPA;
  const userHomeNCA = userData?.HomeNCA;
  const userHomeWFD = userData?.HomeWFD;

  const opportunityLPA = opportunityData?.lpa;
  const opportunityNCA = opportunityData?.nca;
  const opportunityWFD = opportunityData?.wfd;

  if (broadHabitat === "Watercourse") {
    if (userHomeWFD && opportunityWFD && userHomeWFD === opportunityWFD) {
      return "within";
    }
    return "outside";
  }

  if ((userHomeLPA && opportunityLPA && userHomeLPA === opportunityLPA) ||
      (userHomeNCA && opportunityNCA && userHomeNCA === opportunityNCA)) {
    return "within";
  }

  const userLpaNeighbours = LOCATION_NEIGHBOURS_LOOKUP[userHomeLPA]?.LPANeighbours || [];
  const userNcaNeighbours = LOCATION_NEIGHBOURS_LOOKUP[userHomeNCA]?.NCANeighbours || [];

  if ((opportunityLPA && userLpaNeighbours.includes(opportunityLPA)) ||
      (opportunityNCA && userNcaNeighbours.includes(opportunityNCA))) {
    return "neighbour";
  }

  return "outside";
}

/**
 * Calculates the adjusted units required for a bid based on location classification.
 * This is the amount of units the *bidder* needs to supply to meet the buyer's requirement.
 * @param {number} baseUnitsRequired - The base units required by the opportunity.
 * @param {"within" | "neighbour" | "outside"} classification - The location classification.
 * @return {number} The adjusted units required.
 */
function getAdjustedUnitsRequired(baseUnitsRequired, classification) {
  const multiplier = UNIT_MULTIPLIERS[classification] || UNIT_MULTIPLIERS.outside;
  return baseUnitsRequired * multiplier;
}

/**
 * Calculates the equivalent price per unit from the buyer's perspective.
 * This is the effective price the buyer pays per 'actual' unit, considering the location adjustment.
 * A lower effective price is better for the buyer.
 * @param {number} pricePerUnit - The bidder's stated price per unit.
 * @param {"within" | "neighbour" | "outside"} classification - The location classification.
 * @return {number} The equivalent price per unit from the buyer's perspective.
 */
function getEquivalentPricePerUnitForBuyer(pricePerUnit, classification) {
  const multiplier = PRICE_MULTIPLIERS_FOR_BUYER[classification] || PRICE_MULTIPLIERS_FOR_BUYER.outside;
  return pricePerUnit * multiplier;
}

/**
 * Processes a single habitat bid to include location classification and adjusted values.
 * This function is intended to be used when a bid is created or updated.
 * @param {object} habitatBid - The individual habitat bid object from the form.
 * @param {object} opportunityHabitatRequirement - The corresponding habitat requirement from the opportunity.
 * @param {object} userData - The user's profile data.
 * @param {object} opportunityData - The full opportunity data.
 * @return {object} The processed habitat bid with new fields.
 */
function getAdjustedBidDetailsForHabitat(habitatBid, opportunityHabitatRequirement, userData, opportunityData) {
  const classification = getLocationClassification(
    userData,
    opportunityData,
    opportunityHabitatRequirement.broadHabitat,
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


/**
 * Triggered when a new bid is created.
 * Sends confirmation email to the bidder AND notification to admin.
 * @param {functions.firestore.DocumentSnapshot} snap - The snapshot of the new document.
 * @param {functions.EventContext} context - The event context.
 * @returns {Promise<null>} A promise that resolves to null.
 */
const onBidCreated = functions
  .region("europe-west2")
  .firestore
  .document("bids/{bidId}")
  .onCreate(async (snap, context) => {
    try {
      const bidData = snap.data();
      const bidId = context.params.bidId;

      console.log(`📝 Processing new bid: ${bidId} for opportunity: ${bidData.opportunityId}`);

      // Call the shared notification function which now also handles data processing
      await sendBidNotifications(bidData, bidId, "created");

      return null;
    } catch (error) {
      console.error("Error in onBidCreated:", error);
      return null;
    }
  });

/**
 * Triggered when an existing bid is updated.
 * Sends update confirmation email to the bidder AND notification to admin.
 * ALSO handles withdrawal notifications.
 * @param {functions.firestore.DocumentSnapshotChange} change - The change object with before and after snapshots.
 * @param {functions.EventContext} context - The event context.
 * @returns {Promise<null>} A promise that resolves to null.
 */
const onBidUpdated = functions
  .region("europe-west2")
  .firestore
  .document("bids/{bidId}")
  .onUpdate(async (change, context) => {
    try {
      const beforeData = change.before.data();
      const afterData = change.after.data();
      const bidId = context.params.bidId;

      // Check if bid was withdrawn
      if (beforeData.status !== "withdrawn" && afterData.status === "withdrawn") {
        console.log(`📝 Bid ${bidId} withdrawn - sending withdrawal notifications`);
        await sendWithdrawalNotifications(afterData, bidId, "withdrawn");
        return null;
      }

      // Check if this is a winner status update (from opportunity closing)
      // We don't want to re-process location data if it's just a winner update
      if (beforeData.isWinning !== afterData.isWinning ||
          beforeData.winningType !== afterData.winningType ||
          JSON.stringify(beforeData.habitatWins) !== JSON.stringify(afterData.habitatWins)) {
        console.log(`📝 Bid ${bidId} winner status updated - no update notification sent`);
        return null;
      }

      // Check if bid amount or habitat bids actually changed (normal updates)
      // This also covers changes to location-adjusted values, as they modify habitatBids
      const bidAmountChanged = beforeData.bidAmount !== afterData.bidAmount;
      const habitatBidsChanged = JSON.stringify(beforeData.habitatBids) !== JSON.stringify(afterData.habitatBids);

      if (!bidAmountChanged && !habitatBidsChanged) {
        console.log(`📝 Bid ${bidId} - no significant changes, no notification sent`);
        return null;
      }

      console.log(`📝 Processing bid update: ${bidId} for opportunity: ${afterData.opportunityId}`);

      // Call the shared notification function which now also handles data processing
      await sendBidNotifications(afterData, bidId, "updated");

      return null;
    } catch (error) {
      console.error("Error in onBidUpdated:", error);
      return null;
    }
  });

/**
 * Shared function to send bid notifications (for create, update, and withdraw).
 * This function now also processes and updates the bid document with location-adjusted values.
 * @param {object} originalBidData - The original data of the bid from the snapshot.
 * @param {string} bidId - The ID of the bid.
 * @param {"created"|"updated"|"withdrawn"} action - The type of action that triggered the notification.
 * @return {Promise<void>}
 */
async function sendBidNotifications(originalBidData, bidId, action) {
  try {
    // Get user data
    const userDoc = await admin.firestore()
      .collection("users")
      .doc(originalBidData.userId)
      .get();

    if (!userDoc.exists) {
      console.error(`User ${originalBidData.userId} not found`);
      return;
    }
    const userData = userDoc.data();

    // Get opportunity data
    const opportunityDoc = await admin.firestore()
      .collection("bidOpportunities")
      .doc(originalBidData.opportunityId)
      .get();

    if (!opportunityDoc.exists) {
      console.error(`Opportunity ${originalBidData.opportunityId} not found`);
      return;
    }
    const opportunityData = opportunityDoc.data();

    // Handle withdrawal notifications differently
    if (action === "withdrawn") {
      await sendWithdrawalNotifications(userData, opportunityData, originalBidData, bidId, originalBidData.updatedAt.toDate());
      return;
    }

    // --- NEW LOGIC: Process habitat bids with location adjustments ---
    const processedHabitatBids = [];
    let newTotalBidAmount = 0;

    if (originalBidData.habitatBids && Array.isArray(originalBidData.habitatBids)) {
      for (const originalHabitatBid of originalBidData.habitatBids) {
        // Find the corresponding habitat requirement in the opportunity
        const opportunityHabitatRequirement = opportunityData.habitatRequirements.find(
          (req) => req.specificHabitat === originalHabitatBid.specificHabitat,
        );

        if (!opportunityHabitatRequirement) {
          console.warn(`Habitat requirement for ${originalHabitatBid.specificHabitat} not found in opportunity ${opportunityData.title}. Skipping adjustment.`);
          processedHabitatBids.push(originalHabitatBid); // Keep original if requirement not found
          if (originalHabitatBid.bidType === "bid") {
            newTotalBidAmount += originalHabitatBid.subtotal;
          }
          continue;
        }

        if (originalHabitatBid.bidType === "no-bid") {
          // For 'no-bid', just copy it over, no price/unit or units adjustment needed
          const classification = getLocationClassification(userData, opportunityData, opportunityHabitatRequirement.broadHabitat);
          processedHabitatBids.push({
            ...originalHabitatBid,
            locationClassification: classification, // Store classification
            baseUnitsRequired: opportunityHabitatRequirement.unitsRequired, // Store original units
            adjustedUnitsToSupply: opportunityHabitatRequirement.unitsRequired, // No adjustment for no-bid
            pricePerUnit: 0,
            effectivePricePerUnitForBuyer: 0, // No effective price for no-bid
            subtotal: 0,
          });
        } else {
          // For actual bids, apply the location adjustment logic
          const adjustedBid = getAdjustedBidDetailsForHabitat(
            originalHabitatBid,
            opportunityHabitatRequirement,
            userData,
            opportunityData,
          );
          processedHabitatBids.push(adjustedBid);
          newTotalBidAmount += adjustedBid.subtotal;
        }
      }
    }

    // Prepare the updated bid data to be saved to Firestore
    const updatedBidDataForFirestore = {
      bidAmount: newTotalBidAmount,
      habitatBids: processedHabitatBids,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      // Add other fields that might be needed, but ensure they are not overwritten
      // if they are not meant to be updated by this function.
      // For a new bid, createdAt will be set by onCreate trigger.
      // For an update, it's already there.
    };

    // If it's a new bid, also set userId, opportunityId, status, createdAt
    if (action === "created") {
      Object.assign(updatedBidDataForFirestore, {
        userId: originalBidData.userId,
        opportunityId: originalBidData.opportunityId,
        status: "active", // Ensure status is set
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        isWinning: false, // Default for new bids
      });
    }

    // Update the bid document in Firestore with the new calculated values
    await admin.firestore().collection("bids").doc(bidId).set(updatedBidDataForFirestore, {merge: true});
    console.log(`✅ Bid ${bidId} updated in Firestore with location adjustments.`);

    // Fetch the *updated* bid data from Firestore for email sending
    const updatedBidDoc = await admin.firestore().collection("bids").doc(bidId).get();
    const bidDataForEmail = updatedBidDoc.data();

    // Format dates safely
    let closingDate;
    if (opportunityData.closingDate?.toDate) {
      closingDate = opportunityData.closingDate.toDate();
    } else if (opportunityData.closingDate instanceof Date) {
      closingDate = opportunityData.closingDate;
    } else if (typeof opportunityData.closingDate === "string") {
      closingDate = new Date(opportunityData.closingDate);
    } else {
      closingDate = new Date();
    }

    let actionDate;
    const dateField = action === "created" ? bidDataForEmail.createdAt : bidDataForEmail.updatedAt;
    if (dateField?.toDate) {
      actionDate = dateField.toDate();
    } else if (dateField instanceof Date) {
      actionDate = dateField;
    } else if (typeof dateField === "string") {
      actionDate = new Date(dateField);
    } else {
      actionDate = new Date();
    }

    // Create habitat breakdown HTML for user email
    let habitatBreakdownHtml = "";
    if (bidDataForEmail.habitatBids && bidDataForEmail.habitatBids.length > 0) {
      const habitatItems = bidDataForEmail.habitatBids.map((hb) => {
        if (hb.bidType === "no-bid") {
          return `
            <div style="background: #fff2f2; padding: 10px; margin: 5px 0; border-radius: 4px; border-left: 3px solid #dc2626;">
              <p style="margin: 2px 0; font-size: 14px;"><strong>${hb.specificHabitat}</strong></p>
              <p style="margin: 2px 0; font-size: 13px; color: #dc2626; font-style: italic;">No bid placed</p>
            </div>
          `;
        } else {
          // Display adjusted units and equivalent price for user's awareness
          const pricePerUnit = hb.pricePerUnit || (hb.subtotal / hb.unitsRequired); // Bidder's stated price
          const adjustedUnits = hb.adjustedUnitsToSupply || hb.unitsRequired; // Units bidder must supply
          const effectivePrice = hb.effectivePricePerUnitForBuyer || pricePerUnit; // Buyer's effective price

          return `
            <div style="background: #f5f5f5; padding: 10px; margin: 5px 0; border-radius: 4px; border-left: 3px solid #16a34a;">
              <p style="margin: 2px 0; font-size: 14px;"><strong>${hb.specificHabitat}</strong></p>
              <p style="margin: 2px 0; font-size: 13px; color: #666;">
                Your bid: £${pricePerUnit.toFixed(2)}/unit for ${hb.baseUnitsRequired} base units<br>
                Location Classification: <strong>${hb.locationClassification.toUpperCase()}</strong><br>
                You must supply: <strong>${adjustedUnits.toFixed(2)} units</strong><br>
                Buyer's equivalent price: <strong>£${effectivePrice.toFixed(2)}/unit</strong><br>
                Total for this habitat: <strong>£${hb.subtotal.toLocaleString()}</strong>
              </p>
            </div>
          `;
        }
      }).join("");

      habitatBreakdownHtml = `
        <h4 style="color: #2196F3; margin: 15px 0 10px 0;">Habitat Breakdown:</h4>
        ${habitatItems}
      `;
    }

    // 1. SEND USER CONFIRMATION EMAIL
    const actionText = action === "created" ? "submitted" : "updated";
    const actionPastTense = action === "created" ? "Submitted" : "Updated";

    const userSubject = `Bid ${actionPastTense} - ${opportunityData.title}`;
    const userHtmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Bid ${actionPastTense}!</h1>
          <p style="color: #e8f5e8; margin: 10px 0 0 0; font-size: 14px;">GIGL Marketplace</p>
        </div>
        
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #333; margin-top: 0;">Hello ${userData.firstName} ${userData.lastName}!</h2>
          
          <p style="font-size: 16px; line-height: 1.6; color: #555;">
            Your bid has been successfully ${actionText} for the following opportunity:
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4CAF50;">
            <h3 style="color: #4CAF50; margin-top: 0;">Opportunity Details</h3>
            <p style="margin: 5px 0;"><strong>Title:</strong> ${opportunityData.title}</p>
            <p style="margin: 5px 0;"><strong>LPA:</strong> ${opportunityData.lpa || "Not specified"}</p>
            <p style="margin: 5px 0;"><strong>NCA:</strong> ${opportunityData.nca || "Not specified"}</p>
            <p style="margin: 5px 0;"><strong>Closes:</strong> ${closingDate.toLocaleString("en-GB")}</p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196F3;">
            <h3 style="color: #2196F3; margin-top: 0;">Your Bid Details</h3>
            <p style="margin: 5px 0;"><strong>Total Bid Amount:</strong> £${bidDataForEmail.bidAmount.toLocaleString()}</p>
            <p style="margin: 5px 0;"><strong>Bid ID:</strong> ${bidId}</p>
            <p style="margin: 5px 0;"><strong>${actionPastTense}:</strong> ${actionDate.toLocaleString("en-GB")}</p>
            ${habitatBreakdownHtml}
          </div>
          
          <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0;">
            <p style="margin: 0; color: #856404; font-size: 14px;">
              <strong>Next Steps:</strong><br>
              • You can continue to update your bid anytime before the closing date<br>
              • You'll receive notifications about the outcome once bidding closes<br>
              • Monitor your dashboard for updates and new opportunities
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://gigl-marketplace-v3.web.app/dashboard" 
               style="background-color: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              View Your Dashboard
            </a>
          </div>
        </div>
        
        <div style="background: #333; padding: 20px; text-align: center; color: #ccc; font-size: 12px;">
          <p style="margin: 0;">GIGL Marketplace - Biodiversity Net Gain Trading Platform</p>
        </div>
      </div>
    `;

    // Send user confirmation
    await sendBrevoEmail(userData.email, userSubject, userHtmlContent, `bid_${action}`);
    console.log(`✅ Bid ${action} confirmation email sent to ${userData.email}`);

    // 2. SEND ADMIN NOTIFICATION EMAIL
    const adminSubject = `🔔 Bid ${actionPastTense} - ${opportunityData.title}`;

    // Create admin habitat breakdown table
    let adminHabitatBreakdown = "";
    if (bidDataForEmail.habitatBids && bidDataForEmail.habitatBids.length > 0) {
      const adminHabitatItems = bidDataForEmail.habitatBids.map((hb) => {
        if (hb.bidType === "no-bid") {
          return `
            <tr style="background: #fff2f2;">
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${hb.specificHabitat}</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center; color: #dc2626; font-style: italic;">No Bid</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; color: #dc2626;">—</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; color: #dc2626;">—</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; color: #dc2626;">—</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; color: #dc2626;">—</td>
            </tr>
          `;
        } else {
          const pricePerUnit = hb.pricePerUnit || (hb.subtotal / hb.unitsRequired); // Bidder's stated price
          const adjustedUnits = hb.adjustedUnitsToSupply || hb.unitsRequired; // Units bidder must supply
          const effectivePrice = hb.effectivePricePerUnitForBuyer || pricePerUnit; // Buyer's effective price

          return `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${hb.specificHabitat}</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${hb.baseUnitsRequired}</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${hb.locationClassification.toUpperCase()}</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">£${pricePerUnit.toFixed(2)}</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${adjustedUnits.toFixed(2)}</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">£${effectivePrice.toFixed(2)}</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">£${hb.subtotal.toLocaleString()}</td>
            </tr>
          `;
        }
      }).join("");

      adminHabitatBreakdown = `
        <h4 style="color: #2196F3; margin: 15px 0 10px 0;">Bid Breakdown:</h4>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
          <thead>
            <tr style="background: #f5f5f5;">
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Habitat Type</th>
              <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">Base Units</th>
              <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">Location</th>
              <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Bidder Price/Unit</th>
              <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Adj. Units Supply</th>
              <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Buyer Eff. Price/Unit</th>
              <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${adminHabitatItems}
          </tbody>
        </table>
      `;
    }

    const adminHtmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🔔 Bid ${actionPastTense}</h1>
          <p style="color: #e3f2fd; margin: 10px 0 0 0; font-size: 14px;">GIGL Marketplace Admin</p>
        </div>
        
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #333; margin-top: 0;">Bid ${actionPastTense}!</h2>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196F3;">
            <h3 style="color: #2196F3; margin-top: 0;">Opportunity Details</h3>
            <p style="margin: 5px 0;"><strong>Title:</strong> ${opportunityData.title}</p>
            <p style="margin: 5px 0;"><strong>LPA:</strong> ${opportunityData.lpa || "Not specified"}</p>
            <p style="margin: 5px 0;"><strong>NCA:</strong> ${opportunityData.nca || "Not specified"}</p>
            <p style="margin: 5px 0;"><strong>Closes:</strong> ${closingDate.toLocaleString("en-GB")}</p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4CAF50;">
            <h3 style="color: #4CAF50; margin-top: 0;">Bidder Information</h3>
            <p style="margin: 5px 0;"><strong>Name:</strong> ${userData.firstName} ${userData.lastName}</p>
            <p style="margin: 5px 0;"><strong>Company:</strong> ${userData.company || userData.companyName || "Not specified"}</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${userData.email}</p>
            <p style="margin: 5px 0;"><strong>Total Bid:</strong> £${bidDataForEmail.bidAmount.toLocaleString()}</p>
            <p style="margin: 5px 0;"><strong>Bid ID:</strong> ${bidId}</p>
            <p style="margin: 5px 0;"><strong>${actionPastTense}:</strong> ${actionDate.toLocaleString("en-GB")}</p>
          </div>
          
          ${adminHabitatBreakdown}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://gigl-marketplace-v3.web.app/admin" 
               style="background-color: #2196F3; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              View Admin Panel
            </a>
          </div>
        </div>
        
        <div style="background: #333; padding: 20px; text-align: center; color: #ccc; font-size: 12px;">
          <p style="margin: 0;">GIGL Marketplace - Biodiversity Net Gain Trading Platform</p>
        </div>
      </div>
    `;

    // Send admin notification
    await sendBrevoEmail("david@baxterenvironmental.co.uk", adminSubject, adminHtmlContent, `admin_bid_${action}`);
    console.log(`✅ Admin ${action} notification email sent for bid ${bidId}`);
  } catch (error) {
    console.error(`Error in sendBidNotifications (${action}):`, error);
  }
}

/**
 * Sends withdrawal-specific notifications to user and admin.
 * @param {object} userData - The user's data.
 * @param {object} opportunityData - The opportunity's data.
 * @param {object} bidData - The bid's data.
 * @param {string} bidId - The ID of the bid.
 * @param {Date} actionDate - The date/time of the withdrawal action.
 * @return {Promise<void>}
 */
async function sendWithdrawalNotifications(userData, opportunityData, bidData, bidId, actionDate) {
  try {
    // 1. SEND USER WITHDRAWAL CONFIRMATION
    const userSubject = `Bid Withdrawn - ${opportunityData.title}`;
    const userHtmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Bid Withdrawn</h1>
          <p style="color: #fecaca; margin: 10px 0 0 0; font-size: 14px;">GIGL Marketplace</p>
        </div>
        
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #333; margin-top: 0;">Hello ${userData.firstName} ${userData.lastName}!</h2>
          
          <p style="font-size: 16px; line-height: 1.6; color: #555;">
            Your bid has been successfully withdrawn from the following opportunity:
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
            <h3 style="color: #dc2626; margin-top: 0;">Opportunity Details</h3>
            <p style="margin: 5px 0;"><strong>Title:</strong> ${opportunityData.title}</p>
            <p style="margin: 5px 0;"><strong>LPA:</strong> ${opportunityData.lpa || "Not specified"}</p>
            <p style="margin: 5px 0;"><strong>NCA:</strong> ${opportunityData.nca || "Not specified"}</p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #6b7280;">
            <h3 style="color: #6b7280; margin-top: 0;">Withdrawal Details</h3>
            <p style="margin: 5px 0;"><strong>Withdrawn Amount:</strong> £${bidData.bidAmount.toLocaleString()}</p>
            <p style="margin: 5px 0;"><strong>Bid ID:</strong> ${bidId}</p>
            <p style="margin: 5px 0;"><strong>Withdrawn:</strong> ${actionDate.toLocaleString("en-GB")}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://gigl-marketplace-v3.web.app/dashboard" 
               style="background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              View Dashboard
            </a>
          </div>
        </div>
        
        <div style="background: #333; padding: 20px; text-align: center; color: #ccc; font-size: 12px;">
          <p style="margin: 0;">GIGL Marketplace - Biodiversity Net Gain Trading Platform</p>
        </div>
      </div>
    `;

    await sendBrevoEmail(userData.email, userSubject, userHtmlContent, "bid_withdrawn");
    console.log(`✅ Bid withdrawal confirmation email sent to ${userData.email}`);

    // 2. SEND ADMIN WITHDRAWAL NOTIFICATION
    const adminSubject = `🗑️ Bid Withdrawn - ${opportunityData.title}`;
    const adminHtmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🗑️ Bid Withdrawn</h1>
          <p style="color: #fecaca; margin: 10px 0 0 0; font-size: 14px;">GIGL Marketplace Admin</p>
        </div>
        
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #333; margin-top: 0;">Bid Withdrawal Notification</h2>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
            <h3 style="color: #dc2626; margin-top: 0;">Opportunity Details</h3>
            <p style="margin: 5px 0;"><strong>Title:</strong> ${opportunityData.title}</p>
            <p style="margin: 5px 0;"><strong>LPA:</strong> ${opportunityData.lpa || "Not specified"}</p>
            <p style="margin: 5px 0;"><strong>NCA:</strong> ${opportunityData.nca || "Not specified"}</p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #6b7280;">
            <h3 style="color: #6b7280; margin-top: 0;">Bidder Information</h3>
            <p style="margin: 5px 0;"><strong>Name:</strong> ${userData.firstName} ${userData.lastName}</p>
            <p style="margin: 5px 0;"><strong>Company:</strong> ${userData.company || userData.companyName || "Not specified"}</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${userData.email}</p>
            <p style="margin: 5px 0;"><strong>Withdrawn Amount:</strong> £${bidData.bidAmount.toLocaleString()}</p>
            <p style="margin: 5px 0;"><strong>Bid ID:</strong> ${bidId}</p>
            <p style="margin: 5px 0;"><strong>Withdrawn:</strong> ${actionDate.toLocaleString("en-GB")}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://gigl-marketplace-v3.web.app/admin" 
               style="background-color: #6b7280; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              View Admin Panel
            </a>
          </div>
        </div>
        
        <div style="background: #333; padding: 20px; text-align: center; color: #ccc; font-size: 12px;">
          <p style="margin: 0;">GIGL Marketplace - Biodiversity Net Gain Trading Platform</p>
        </div>
      </div>
    `;

    await sendBrevoEmail("david@baxterenvironmental.co.uk", adminSubject, adminHtmlContent, "admin_bid_withdrawn");
    console.log(`✅ Admin withdrawal notification email sent for bid ${bidId}`);
  } catch (error) {
    console.error("Error sending withdrawal notifications:", error);
  }
}

module.exports = {
  onBidCreated,
  onBidUpdated,
};
