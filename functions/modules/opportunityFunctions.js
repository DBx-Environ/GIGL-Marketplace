// functions/modules/opportunityFunctions.js - FINAL LINT FIX
const admin = require("firebase-admin");
const functions = require("firebase-functions");
const {sendBrevoEmail} = require("./emailFunctions");

/**
 * Manual close function called by admin.
 * Allows an authenticated admin user to close a bid opportunity with a specific reason.
 * @param {object} data - The data passed to the callable function.
 * @param {string} data.opportunityId - The ID of the opportunity to close.
 * @param {string} data.reason - The reason for closing the opportunity ("error", "buyer_withdrawal", "early_close").
 * @param {string} [data.reasonDetails=""] - Optional additional details about the closure.
 * @param {functions.https.CallableContext} context - The context of the callable function call.
 * @return {Promise<object>} A promise that resolves with the result of the closure.
 * @throws {functions.https.HttpsError} If user is unauthenticated, unauthorized, or arguments are invalid.
 */
const closeBidOpportunity = functions
  .region("europe-west2")
  .https
  .onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
    }

    const userDoc = await admin.firestore().collection("users").doc(context.auth.uid).get();
    if (!userDoc.exists || !userDoc.data().isAdmin) {
      throw new functions.https.HttpsError("permission-denied", "Only admins can close opportunities");
    }

    const {opportunityId, reason, reasonDetails} = data;
    if (!opportunityId) {
      throw new functions.https.HttpsError("invalid-argument", "opportunityId is required");
    }

    if (!reason) {
      throw new functions.https.HttpsError("invalid-argument", "reason is required for manual close");
    }

    try {
      console.log(`Admin ${context.auth.uid} manually closing opportunity: ${opportunityId} with reason: ${reason}`);
      const result = await closeOpportunityLogic(opportunityId, "manual", reason, reasonDetails);
      return result;
    } catch (error) {
      console.error("Error in closeBidOpportunity:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  });

/**
 * Scheduled auto-close function - runs every 4 hours.
 * Automatically closes expired bid opportunities and sends notifications.
 * @param {functions.EventContext} context - The event context.
 * @return {Promise<object|null>} A promise that resolves with a summary of processed opportunities or null if no opportunities were found.
 */
const autoCloseOpportunities = functions
  .region("europe-west2")
  .runWith({
    timeoutSeconds: 540,
    memory: "1GB",
  })
  .pubsub
  .schedule("0 */4 * * *")
  .timeZone("Europe/London")
  .onRun(async (context) => {
    console.log("Auto-close function triggered");

    try {
      const result = await runAutoCloseLogic();
      return result;
    } catch (error) {
      console.error("Auto-close function error:", error);

      await sendBrevoEmail(
        "david@baxterenvironmental.co.uk",
        "🚨 Auto-Close Function Error",
        `
          <h2>Auto-Close Function Error</h2>
          <p><strong>Error Time:</strong> ${new Date().toISOString()}</p>
          <p><strong>Error:</strong> ${error.message}</p>
        `,
        "auto_close_error"
      );

      return {success: false, error: error.message};
    }
  });

/**
 * Core auto-close logic.
 * Identifies and processes expired opportunities.
 * @return {Promise<object>} A promise that resolves with a summary of the auto-close operation.
 */
async function runAutoCloseLogic() {
  const nowUTC = new Date();

  console.log(`Auto-close running at: ${nowUTC.toISOString()}`);

  // Get all active opportunities
  const activeOpportunitiesSnapshot = await admin.firestore()
    .collection("bidOpportunities")
    .where("status", "==", "active")
    .get();

  console.log(`Found ${activeOpportunitiesSnapshot.size} active opportunities`);

  // Filter expired opportunities based on closingDate
  const expiredOpportunities = activeOpportunitiesSnapshot.docs.filter((doc) => {
    const data = doc.data();
    // Ensure closingDate is a Date object for comparison, handling Firestore Timestamp or string
    let closingDate;
    if (data.closingDate && typeof data.closingDate.toDate === "function") {
      closingDate = data.closingDate.toDate(); // Convert Firestore Timestamp to Date
    } else if (typeof data.closingDate === "string") {
      closingDate = new Date(data.closingDate); // Convert ISO string to Date
    } else {
      // Fallback for unexpected date format, treat as not expired or log error
      console.warn(`Opportunity ${doc.id} has unexpected closingDate format:`, data.closingDate);
      return false;
    }

    const isExpired = nowUTC > closingDate;

    if (isExpired) {
      console.log(`Opportunity "${data.title}" has expired (closed: ${closingDate.toISOString()})`);
    }

    return isExpired;
  });

  console.log(`Found ${expiredOpportunities.length} expired opportunities`);

  if (expiredOpportunities.length === 0) {
    console.log("No expired opportunities found");
    return {success: true, processed: 0, message: "No expired opportunities found"};
  }

  // Process each expired opportunity
  const results = [];

  for (const doc of expiredOpportunities) {
    const opportunityData = doc.data();

    try {
      console.log(`Processing expired opportunity: ${opportunityData.title}`);

      const processResult = await closeOpportunityLogic(doc.id, "system");
      // Explicitly use processResult to avoid no-unused-vars lint error
      console.log(`Close logic result for ${opportunityData.title}:`, processResult);

      console.log(`Successfully closed: ${opportunityData.title}`);

      results.push({
        opportunityId: doc.id,
        title: opportunityData.title,
        success: true,
      });
    } catch (error) {
      console.error(`Failed to close ${doc.id}:`, error);

      results.push({
        opportunityId: doc.id,
        title: opportunityData.title,
        success: false,
        error: error.message,
      });
    }
  }

  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log(`Auto-close summary: ${successful} successful, ${failed} failed`);

  // Send summary report if any opportunities were processed
  const resultsHtml = results.map((r) =>
    `<div style="margin: 8px 0; padding: 8px; background: ${r.success ? "#dcfce7" : "#fef2f2"}; border-radius: 4px;">
      <strong>${r.title}</strong><br>
      ${r.success ? "✅ Successfully closed" : "❌ Failed: " + r.error}
    </div>`
  ).join("");

  await sendBrevoEmail(
    "david@baxterenvironmental.co.uk",
    `Auto-Close Summary: ${successful} Closed${failed > 0 ? `, ${failed} Failed` : ""}`,
    `
      <h2>Auto-Close Function Summary</h2>
      <p><strong>Run Time:</strong> ${nowUTC.toLocaleString("en-GB", {timeZone: "Europe/London"})} GMT</p>
      <p><strong>Opportunities Processed:</strong> ${results.length}</p>
      <p><strong>Successfully Closed:</strong> ${successful}</p>
      ${failed > 0 ? `<p><strong>Failed:</strong> ${failed}</p>` : ""}
      
      <h3>Results:</h3>
      ${resultsHtml}
    `,
    "auto_close_summary"
  );

  return {
    success: true,
    processed: results.length,
    successful,
    failed,
  };
}

/**
 * Core logic for closing opportunities and determining winners.
 * @param {string} opportunityId - The ID of the opportunity to close.
 * @param {"system"|"manual"} closedBy - Indicates if the opportunity was closed by the system (auto-close) or manually by an admin.
 * @param {string} [reason=null] - The specific reason for manual closure ("error", "buyer_withdrawal", "early_close").
 * @param {string} [reasonDetails=""] - Optional additional details about the closure.
 * @return {Promise<object>} A promise that resolves with the result of the closure, including winner information.
 */
async function closeOpportunityLogic(opportunityId, closedBy, reason = null, reasonDetails = "") {
  console.log(`Closing opportunity ${opportunityId} (${closedBy}${reason ? ` - ${reason}` : ""})`);

  // Get opportunity data
  const opportunityDoc = await admin.firestore()
    .collection("bidOpportunities")
    .doc(opportunityId)
    .get();

  if (!opportunityDoc.exists) {
    throw new Error("Opportunity not found");
  }

  const opportunityData = opportunityDoc.data();

  // Get all bids for this opportunity
  const bidsSnapshot = await admin.firestore()
    .collection("bids")
    .where("opportunityId", "==", opportunityId)
    .get();

  // Filter out withdrawn bids
  const activeBids = bidsSnapshot.docs.filter((doc) => {
    const bidData = doc.data();
    return bidData.status !== "withdrawn";
  });

  console.log(`Found ${activeBids.length} active bids for ${opportunityData.title}`);

  // Determine if we should determine winners based on close reason
  const shouldDetermineWinners = closedBy === "system" ||
    (closedBy === "manual" && reason === "early_close");

  // Handle no bids scenario
  if (activeBids.length === 0) {
    console.log("No active bids - closing without winner");

    await admin.firestore()
      .collection("bidOpportunities")
      .doc(opportunityId)
      .update({
        status: "closed",
        closedAt: admin.firestore.FieldValue.serverTimestamp(),
        closedBy: closedBy,
        closeReason: reason || null,
        closeReasonDetails: reasonDetails || null,
        winnerBidId: null,
        winnerUserId: null,
        winnerType: null,
      });

    // Send appropriate notification based on close reason
    if (closedBy === "manual" && reason) {
      await sendManualCloseNotification(opportunityData, [], reason, reasonDetails); // Pass empty activeBids
    } else {
      await sendAdminNotification(opportunityData, null, "no_bids", closedBy);
    }

    return {
      success: true,
      message: "Opportunity closed - no active bids received",
    };
  }

  let overallWinner = null;
  let habitatWinners = {};
  let winnerBidId = null;
  let winnerUserId = null;
  let winnerType = null;

  // Only determine winners if appropriate
  if (shouldDetermineWinners) {
    // Get habitat requirements
    const habitatRequirements = {};
    if (opportunityData.habitatRequirements) {
      opportunityData.habitatRequirements.forEach((req) => {
        habitatRequirements[req.specificHabitat] = req.unitsRequired;
      });
    }

    // Determine winners
    const winnerResults = await determineWinners(activeBids, habitatRequirements);
    overallWinner = winnerResults.overallWinner;
    habitatWinners = winnerResults.habitatWinners;

    // Determine primary winner
    if (overallWinner) {
      winnerBidId = overallWinner.bidId;
      winnerUserId = overallWinner.userId;
      winnerType = "overall";
      console.log(`Overall winner: ${winnerUserId} with bid £${overallWinner.totalBid.toLocaleString()}`);
    } else if (Object.keys(habitatWinners).length > 0) {
      const firstHabitat = Object.keys(habitatWinners)[0];
      winnerBidId = habitatWinners[firstHabitat].bidId;
      winnerUserId = habitatWinners[firstHabitat].userId;
      winnerType = "habitat";
      console.log(`Habitat winner: ${winnerUserId} for ${Object.keys(habitatWinners).length} habitat(s)`);
    }

    // Update bid winner status
    await updateBidWinnerStatus(activeBids, overallWinner, habitatWinners);
  }

  // Update opportunity status
  await admin.firestore()
    .collection("bidOpportunities")
    .doc(opportunityId)
    .update({
      status: "closed",
      closedAt: admin.firestore.FieldValue.serverTimestamp(),
      closedBy: closedBy,
      closeReason: reason || null,
      closeReasonDetails: reasonDetails || null,
      winnerBidId: winnerBidId,
      winnerUserId: winnerUserId,
      winnerType: winnerType,
      overallWinner: overallWinner,
      habitatWinners: habitatWinners,
    });

  // Send appropriate notifications
  if (closedBy === "manual" && reason) {
    await sendManualCloseNotification(opportunityData, activeBids, reason, reasonDetails, overallWinner, habitatWinners);
  } else {
    await sendBidderNotifications(activeBids, overallWinner, habitatWinners, opportunityData, closedBy);
    await sendAdminNotification(opportunityData, {
      overallWinner,
      habitatWinners,
      winnerType,
      totalBids: activeBids.length,
    }, "opportunity_closed", closedBy);
  }

  return {
    success: true,
    message: "Opportunity closed successfully",
    winnerBidId: winnerBidId,
    winnerUserId: winnerUserId,
    overallWinner: overallWinner,
    habitatWinners: habitatWinners,
  };
}

/**
 * Sends manual close notifications with specific reasons to relevant users and admin.
 * @param {object} opportunityData - The data of the closed opportunity.
 * @param {Array<admin.firestore.QueryDocumentSnapshot>} activeBids - An array of active bid documents (Firestore snapshots).
 * @param {string} reason - The specific reason for manual closure ("error", "buyer_withdrawal", "early_close").
 * @param {string} reasonDetails - Optional additional details about the closure.
 * @param {object} [overallWinner=null] - The overall winner object, if any.
 * @param {object} [habitatWinners={}] - An object mapping habitat types to their winners, if any.
 * @return {Promise<void>}
 */
async function sendManualCloseNotification(opportunityData, activeBids, reason, reasonDetails, overallWinner = null, habitatWinners = {}) {
  const reasonMessages = {
    "error": "There was an error in the definition of the opportunity. Watch out for a repost of the opportunity - you will have to bid again.",
    "withdrawn": "The buyer has withdrawn their requirement. Huge apologies for any inconvenience this has caused you.",
    "early_close": "The buyer has asked for an early close. Winners have been determined via the usual methods. A separate email will follow to inform you of the outcome.",
  };

  const reasonSubjects = {
    "error": "⚠️ Opportunity Error",
    "withdrawn": "🚫 Opportunity Withdrawn",
    "early_close": "⏰ Early Close",
  };

  const reasonColors = {
    "error": "#dc2626",
    "withdrawn": "#dc2626",
    "early_close": "#f59e0b",
  };

  const userMessage = reasonMessages[reason];
  const emailSubject = reasonSubjects[reason];
  const themeColor = reasonColors[reason];

  // Get unique users who bid
  const uniqueUsers = [...new Set(activeBids.map((doc) => doc.data().userId))];

  for (const userId of uniqueUsers) {
    try {
      const userDoc = await admin.firestore().collection("users").doc(userId).get();
      if (!userDoc.exists) continue;

      const userData = userDoc.data();

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: ${themeColor}; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">${emailSubject}</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">GIGL Marketplace</p>
          </div>
          
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #333; margin-top: 0;">Hello ${userData.firstName} ${userData.lastName}!</h2>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${themeColor};">
              <h3 style="color: ${themeColor}; margin-top: 0;">Opportunity Update</h3>
              <p style="margin: 5px 0;"><strong>Title:</strong> ${opportunityData.title}</p>
              <p style="margin: 5px 0;"><strong>LPA:</strong> ${opportunityData.lpa}</p>
              <p style="margin: 5px 0;"><strong>NCA:</strong> ${opportunityData.nca}</p>
            </div>
            
            <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
              <p style="margin: 0; color: #92400e; font-size: 16px; line-height: 1.6;">
                ${userMessage}
              </p>
              ${reasonDetails ? `
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #fbbf24;">
                  <p style="margin: 0; color: #92400e; font-size: 14px;">
                    <strong>Additional Details:</strong><br>
                    ${reasonDetails}
                  </p>
                </div>
              ` : ""}
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

      await sendBrevoEmail(userData.email, `${emailSubject} - ${opportunityData.title}`, htmlContent, `manual_close_${reason}`);
    } catch (error) {
      console.error(`Error sending manual close notification to user ${userId}:`, error);
    }
  }

  // If early close with winners, also send winner notifications
  if (reason === "early_close" && (overallWinner || Object.keys(habitatWinners).length > 0)) {
    await sendBidderNotifications(activeBids, overallWinner, habitatWinners, opportunityData, "manual");
  }

  // Send admin notification about manual close
  await sendAdminManualCloseNotification(opportunityData, activeBids.length, reason, reasonDetails);
}

/**
 * Sends an admin notification email about a manual opportunity closure.
 * @param {object} opportunityData - The data of the closed opportunity.
 * @param {number} bidCount - The number of active bids for the opportunity.
 * @param {string} reason - The specific reason for manual closure ("error", "buyer_withdrawal", "early_close").
 * @param {string} reasonDetails - Optional additional details about the closure.
 * @return {Promise<void>}
 */
async function sendAdminManualCloseNotification(opportunityData, bidCount, reason, reasonDetails) {
  const reasonLabels = {
    "error": "Error in Opportunity Definition",
    "withdrawn": "Buyer Withdrew Requirement",
    "early_close": "Early Close by Buyer Request",
  };

  const subject = `🔧 Manual Close: ${reasonLabels[reason]} - ${opportunityData.title}`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #6b7280; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">🔧 Manual Close Executed</h1>
        <p style="color: #d1d5db; margin: 10px 0 0 0; font-size: 14px;">GIGL Marketplace Admin</p>
      </div>
      
      <div style="padding: 30px; background: #f9f9f9;">
        <h2 style="color: #333; margin-top: 0;">Manual Close Summary</h2>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #6b7280; margin-top: 0;">Opportunity Details</h3>
          <p><strong>Title:</strong> ${opportunityData.title}</p>
          <p><strong>LPA:</strong> ${opportunityData.lpa}</p>
          <p><strong>NCA:</strong> ${opportunityData.nca}</p>
          <p><strong>Total Bids:</strong> ${bidCount}</p>
        </div>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #6b7280; margin-top: 0;">Close Details</h3>
          <p><strong>Reason:</strong> ${reasonLabels[reason]}</p>
          <p><strong>Closed:</strong> ${new Date().toLocaleString("en-GB", {timeZone: "Europe/London"})} GMT</p>
          ${reasonDetails ? `<p><strong>Additional Details:</strong><br>${reasonDetails}</p>` : ""}
        </div>
        
        <p>All bidders have been notified with appropriate messaging for this close reason.</p>
      </div>
    </div>
  `;

  await sendBrevoEmail("david@baxterenvironmental.co.uk", subject, htmlContent, "admin_manual_close");
}

/**
 * Determines the overall and habitat-specific winners for an opportunity.
 * @param {Array<Object>} activeBids - An array of active bid documents (Firestore snapshots).
 * @param {Object} habitatRequirements - An object mapping specific habitat types to their required units.
 * @return {Promise<Object>} A promise that resolves with the overall and habitat winners.
 */
async function determineWinners(activeBids, habitatRequirements) {
  const userBids = {};
  const habitatBids = {};

  // Process all bids
  activeBids.forEach((bidDoc) => {
    const bid = {id: bidDoc.id, ...bidDoc.data()};
    const userId = bid.userId;

    if (!userBids[userId]) {
      userBids[userId] = {
        userId: userId,
        bids: [],
        totalBid: 0,
        habitatCoverage: {},
      };
    }

    userBids[userId].bids.push(bid);
    userBids[userId].totalBid += bid.bidAmount;

    // Process habitat-specific bids
    if (bid.habitatBids && Array.isArray(bid.habitatBids)) {
      bid.habitatBids.forEach((habitatBid) => {
        if (habitatBid.bidType === "no-bid") return;

        const habitatType = habitatBid.specificHabitat;

        if (!habitatBids[habitatType]) {
          habitatBids[habitatType] = [];
        }

        const pricePerUnit = habitatBid.pricePerUnit || (habitatBid.subtotal / habitatBid.unitsRequired);

        habitatBids[habitatType].push({
          userId: userId,
          bidId: bid.id,
          units: habitatBid.unitsRequired,
          bidAmount: habitatBid.subtotal,
          pricePerUnit: pricePerUnit,
        });

        // Track coverage
        if (!userBids[userId].habitatCoverage[habitatType]) {
          userBids[userId].habitatCoverage[habitatType] = {
            totalUnits: 0,
            totalCost: 0,
            bids: [],
          };
        }

        userBids[userId].habitatCoverage[habitatType].totalUnits += habitatBid.unitsRequired;
        userBids[userId].habitatCoverage[habitatType].totalCost += habitatBid.subtotal;
        userBids[userId].habitatCoverage[habitatType].bids.push(habitatBid);
      });
    }
  });

  // Find overall winner
  let overallWinner = null;
  let lowestOverallBid = Infinity;

  Object.values(userBids).forEach((user) => {
    const coversAllHabitats = Object.keys(habitatRequirements).every((requiredHabitat) => {
      const userCoverage = user.habitatCoverage[requiredHabitat];
      return userCoverage && userCoverage.totalUnits >= habitatRequirements[requiredHabitat];
    });

    if (coversAllHabitats && user.totalBid < lowestOverallBid) {
      lowestOverallBid = user.totalBid;
      overallWinner = {
        userId: user.userId,
        bidId: user.bids[0].id,
        totalBid: user.totalBid,
        habitatCoverage: user.habitatCoverage,
      };
    }
  });

  // Find habitat-specific winners
  const habitatWinners = {};

  Object.keys(habitatRequirements).forEach((habitatType) => {
    if (habitatBids[habitatType]) {
      let lowestPricePerUnit = Infinity;
      let winner = null;

      habitatBids[habitatType].forEach((bid) => {
        if (bid.pricePerUnit < lowestPricePerUnit) {
          lowestPricePerUnit = bid.pricePerUnit;
          winner = {...bid, totalCost: bid.bidAmount};
        }
      });

      if (winner) {
        habitatWinners[habitatType] = winner;
      }
    }
  });

  return {overallWinner, habitatWinners};
}

/**
 * Updates bid documents with their final winner status.
 * @param {Array<admin.firestore.QueryDocumentSnapshot>} activeBids - An array of active bid documents (Firestore snapshots).
 * @param {object|null} overallWinner - The overall winner object, or null if no overall winner.
 * @param {object} habitatWinners - An object mapping specific habitat types to their winning bid details.
 * @return {Promise<void>}
 */
async function updateBidWinnerStatus(activeBids, overallWinner, habitatWinners) {
  const updatePromises = activeBids.map(async (bidDoc) => {
    const bidData = bidDoc.data();
    const bidId = bidDoc.id;
    const userId = bidData.userId;

    let isWinning = false;
    let winningType = null;
    const habitatWins = {};

    // Check overall winner
    if (overallWinner && overallWinner.userId === userId) {
      isWinning = true;
      winningType = "overall";
    }

    // Check habitat winners
    Object.entries(habitatWinners).forEach(([habitatType, winner]) => {
      if (winner.userId === userId) {
        isWinning = true;
        if (!winningType) winningType = "habitat";

        habitatWins[habitatType] = {
          isWinner: true,
          unitsWon: winner.units,
          pricePerUnit: winner.pricePerUnit,
        };
      }
    });

    // Update bid document
    await admin.firestore()
      .collection("bids")
      .doc(bidId)
      .update({
        isWinning: isWinning,
        winningType: winningType,
        habitatWins: habitatWins,
      });
  });

  await Promise.all(updatePromises);
}

/**
 * Sends notification emails to bidders about the outcome of an opportunity.
 * @param {Array<admin.firestore.QueryDocumentSnapshot>} activeBids - An array of active bid documents (Firestore snapshots).
 * @param {object|null} overallWinner - The overall winner object, or null.
 * @param {object} habitatWinners - An object mapping specific habitat types to their winning bid details.
 * @param {object} opportunityData - The data of the closed opportunity.
 * @param {"system"|"manual"} closedBy - Indicates if the opportunity was closed by the system or manually.
 * @return {Promise<void>}
 */
async function sendBidderNotifications(activeBids, overallWinner, habitatWinners, opportunityData, closedBy) {
  const uniqueUsers = [...new Set(activeBids.map((doc) => doc.data().userId))];

  for (const userId of uniqueUsers) {
    try {
      const userDoc = await admin.firestore().collection("users").doc(userId).get();
      if (!userDoc.exists) continue;

      const userData = userDoc.data();

      // Determine winner status
      let isOverallWinner = false;
      const habitatWins = [];

      if (overallWinner && overallWinner.userId === userId) {
        isOverallWinner = true;
      }

      Object.entries(habitatWinners).forEach(([habitat, winner]) => {
        if (winner.userId === userId) {
          habitatWins.push({habitat, ...winner});
        }
      });

      const isWinner = isOverallWinner || habitatWins.length > 0;

      // Send appropriate email
      let subject; let htmlContent;

      if (isOverallWinner) {
        subject = `🏆 OVERALL WINNER - ${opportunityData.title}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🏆 OVERALL WINNER!</h1>
            </div>
            <div style="padding: 30px; background: #f9f9f9;">
              <h2>Congratulations ${userData.firstName} ${userData.lastName}!</h2>
              <p>You won the entire contract for £${overallWinner.totalBid.toLocaleString()}!</p>
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>Opportunity: ${opportunityData.title}</h3>
                <p><strong>LPA:</strong> ${opportunityData.lpa}</p>
                <p><strong>NCA:</strong> ${opportunityData.nca}</p>
              </div>
            </div>
          </div>
        `;
      } else if (habitatWins.length > 0) {
        subject = `🌱 HABITAT WINNER - ${opportunityData.title}`;
        const habitatList = habitatWins.map((hw) => `${hw.habitat}`).join(", ");
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #8BC34A 0%, #689F38 100%); padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🌱 HABITAT WINNER!</h1>
            </div>
            <div style="padding: 30px; background: #f9f9f9;">
              <h2>Congratulations ${userData.firstName} ${userData.lastName}!</h2>
              <p>You won specific habitat types: ${habitatList}</p>
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>Opportunity: ${opportunityData.title}</h3>
                <p><strong>LPA:</strong> ${opportunityData.lpa}</p>
                <p><strong>NCA:</strong> ${opportunityData.nca}</p>
              </div>
            </div>
          </div>
        `;
      } else {
        subject = `Bid Update - ${opportunityData.title}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #2196F3; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">Bid Update</h1>
            </div>
            <div style="padding: 30px; background: #f9f9f9;">
              <h2>Thank you ${userData.firstName} ${userData.lastName}!</h2>
              <p>Unfortunately, your bid for <strong>${opportunityData.title}</strong> was not selected.</p>
              <p>Keep bidding! New opportunities are posted regularly on the GIGL Marketplace.</p>
            </div>
          </div>
        `;
      }

      await sendBrevoEmail(userData.email, subject, htmlContent, isWinner ? (isOverallWinner ? "overall_winner" : "habitat_winner") : "not_selected");
    } catch (error) {
      console.error(`Error sending notification to user ${userId}:`, error);
    }
  }
}

/**
 * Sends an admin notification email about the outcome of an opportunity closure.
 * @param {object} opportunityData - The data of the closed opportunity.
 * @param {object|null} winnerData - An object containing overallWinner, habitatWinners, winnerType, and totalBids, or null if no bids.
 * @param {string} type - The type of notification ("no_bids" or "opportunity_closed").
 * @param {"system"|"manual"} closedBy - Indicates if the opportunity was closed by the system or manually.
 * @return {Promise<void>}
 */
async function sendAdminNotification(opportunityData, winnerData, type, closedBy) {
  try {
    let subject; let htmlContent;

    if (type === "no_bids") {
      subject = `No Bids Received - ${opportunityData.title}`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #f59e0b; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">📭 No Bids Received</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2>Opportunity Closed Without Bids</h2>
            <p>The opportunity "<strong>${opportunityData.title}</strong>" has closed without receiving any active bids.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Opportunity Details:</h3>
              <p><strong>Title:</strong> ${opportunityData.title}</p>
              <p><strong>LPA:</strong> ${opportunityData.lpa}</p>
              <p><strong>NCA:</strong> ${opportunityData.nca}</p>
              <p><strong>Closed by:</strong> ${closedBy === "system" ? "System (Auto-Close)" : "Manual"}</p>
              <p><strong>Closed at:</strong> ${new Date().toLocaleString("en-GB", {timeZone: "Europe/London"})} GMT</p>
            </div>
          </div>
        </div>
      `;
    } else {
      subject = `Winners Selected - ${opportunityData.title}`;

      let winnerSummary = "";
      if (winnerData.overallWinner) {
        winnerSummary += `
          <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 10px 0;">
            <h3 style="color: #4CAF50; margin-top: 0;">🏆 Overall Winner</h3>
            <p><strong>User:</strong> ${winnerData.overallWinner.userId}</p>
            <p><strong>Total Bid:</strong> £${winnerData.overallWinner.totalBid.toLocaleString()}</p>
          </div>
        `;
      }

      if (Object.keys(winnerData.habitatWinners).length > 0) {
        winnerSummary += `
          <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 10px 0;">
            <h3 style="color: #8BC34A; margin-top: 0;">🌱 Habitat Winners</h3>
        `;

        Object.entries(winnerData.habitatWinners).forEach(([habitat, winner]) => {
          winnerSummary += `
            <p><strong>${habitat}:</strong> ${winner.userId} - £${winner.pricePerUnit.toLocaleString()}/unit</p>
          `;
        });

        winnerSummary += `</div>`;
      }

      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #4CAF50; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">🎉 Winners Selected</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2>${opportunityData.title}</h2>
            <p><strong>Total bids:</strong> ${winnerData.totalBids}</p>
            <p><strong>LPA:</strong> ${opportunityData.lpa}</p>
            <p><strong>NCA:</strong> ${opportunityData.nca}</p>
            <p><strong>Closed by:</strong> ${closedBy === "system" ? "System (Auto-Close)" : "Manual"}</p>
            
            <h2>Results:</h2>
            ${winnerSummary}
            
            <p>All bidders have been notified of the results.</p>
          </div>
        </div>
      `;
    }

    await sendBrevoEmail("david@baxterenvironmental.co.uk", subject, htmlContent, "admin_close");
  } catch (error) {
    console.error("Error sending admin notification:", error);
  }
}

// Export functions
module.exports = {
  closeBidOpportunity,
  autoCloseOpportunities,
};
