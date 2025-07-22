// functions/modules/opportunityFunctions.js - CLEAN PRODUCTION VERSION WITH JSDOC
const admin = require("firebase-admin");
const functions = require("firebase-functions");
const {sendBrevoEmail} = require("./emailFunctions");

/**
 * Manually close a bid opportunity
 * @param {Object} data - The request data
 * @param {string} data.opportunityId - The ID of the opportunity to close
 * @param {string} data.reason - The reason for manual closure
 * @param {Object} context - The function context
 * @returns {Promise<Object>} Success response with results
 */
const closeBidOpportunity = functions
  .region("europe-west2")
  .https.onCall(async (data, context) => {
    try {
      // Check authentication
      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Must be authenticated to close opportunities"
        );
      }

      // Check if user is admin
      const userDoc = await admin.firestore()
        .collection("users")
        .doc(context.auth.uid)
        .get();

      if (!userDoc.exists || !userDoc.data().isAdmin) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Only admins can close opportunities"
        );
      }

      const {opportunityId, reason} = data;

      if (!opportunityId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Opportunity ID is required"
        );
      }

      console.log(`🔒 MANUAL CLOSE: Admin ${context.auth.uid} closing opportunity ${opportunityId} - Reason: ${reason || "Not specified"}`);

      // Process the opportunity
      const result = await processOpportunityClose(opportunityId, reason);

      return {
        success: true,
        message: "Opportunity closed successfully",
        opportunityId,
        reason: reason || "Manual close",
        results: result,
      };
    } catch (error) {
      console.error("Error in closeBidOpportunity:", error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError(
        "internal",
        "Failed to close opportunity"
      );
    }
  });

/**
 * Scheduled function to automatically close expired opportunities
 * Runs every 4 hours
 */
const autoCloseOpportunities = functions
  .region("europe-west2")
  .pubsub.schedule("0 */4 * * *")
  .timeZone("Europe/London")
  .onRun(async (context) => {
    try {
      console.log("🕒 AUTO-CLOSE: Starting scheduled opportunity closure check");

      const now = new Date();
      console.log(`🕒 AUTO-CLOSE: Current time: ${now.toISOString()}`);

      // Get all active opportunities
      const snapshot = await admin.firestore()
        .collection("bidOpportunities")
        .where("status", "==", "active")
        .get();

      if (snapshot.empty) {
        console.log("🕒 AUTO-CLOSE: No active opportunities found");
        return null;
      }

      console.log(`🕒 AUTO-CLOSE: Found ${snapshot.size} active opportunities`);

      const promises = [];
      const expiredOpportunities = [];

      snapshot.forEach((doc) => {
        const opportunity = doc.data();
        const opportunityId = doc.id;

        // Parse closing date properly
        let closingDate;
        if (opportunity.closingDate?.toDate) {
          closingDate = opportunity.closingDate.toDate();
        } else if (opportunity.closingDate instanceof Date) {
          closingDate = opportunity.closingDate;
        } else if (typeof opportunity.closingDate === "string") {
          closingDate = new Date(opportunity.closingDate);
        } else {
          console.error(`🕒 AUTO-CLOSE: Invalid closingDate for opportunity ${opportunityId}:`, opportunity.closingDate);
          return;
        }

        const isExpired = closingDate <= now;

        console.log(`🕒 AUTO-CLOSE: [${opportunityId}]: "${opportunity.title}" - Status: ${opportunity.status}, Expires: ${closingDate.toISOString()}, Expired: ${isExpired}`);

        if (isExpired) {
          expiredOpportunities.push({
            id: opportunityId,
            title: opportunity.title,
            closingDate: closingDate.toISOString(),
          });
          promises.push(processOpportunityClose(opportunityId, "Automatic close - time expired"));
        }
      });

      if (expiredOpportunities.length === 0) {
        console.log("🕒 AUTO-CLOSE: No expired opportunities found");
        return null;
      }

      console.log(`🕒 AUTO-CLOSE: Processing ${expiredOpportunities.length} expired opportunities`);

      // Process all expired opportunities
      const results = await Promise.allSettled(promises);

      // Log results
      results.forEach((result, index) => {
        const opportunity = expiredOpportunities[index];
        if (result.status === "fulfilled") {
          console.log(`✅ AUTO-CLOSE: Successfully closed ${opportunity.id}: "${opportunity.title}"`);
        } else {
          console.error(`❌ AUTO-CLOSE: Failed to close ${opportunity.id}: "${opportunity.title}"`, result.reason);
        }
      });

      console.log(`🕒 AUTO-CLOSE: Completed processing ${expiredOpportunities.length} opportunities`);
      return null;
    } catch (error) {
      console.error("❌ AUTO-CLOSE: Error in autoCloseOpportunities:", error);
      return null;
    }
  });

/**
 * Process the closure of a single opportunity
 * @param {string} opportunityId - The ID of the opportunity to close
 * @param {string} reason - The reason for closure
 * @return {Promise<Object>} Results of the closure process
 */
async function processOpportunityClose(opportunityId, reason) {
  try {
    console.log(`🔒 Processing closure for opportunity: ${opportunityId} - Reason: ${reason}`);

    // Get the opportunity
    const opportunityDoc = await admin.firestore()
      .collection("bidOpportunities")
      .doc(opportunityId)
      .get();

    if (!opportunityDoc.exists) {
      throw new Error(`Opportunity ${opportunityId} not found`);
    }

    const opportunityData = opportunityDoc.data();

    // Get all bids for this opportunity
    const bidsSnapshot = await admin.firestore()
      .collection("bids")
      .where("opportunityId", "==", opportunityId)
      .where("status", "!=", "withdrawn")
      .get();

    console.log(`🔒 Found ${bidsSnapshot.size} active bids for opportunity ${opportunityId}`);

    const results = {
      opportunityId,
      opportunityTitle: opportunityData.title,
      reason,
      totalBids: bidsSnapshot.size,
      winners: [],
      emailsSent: 0,
    };

    // Update opportunity status to closed
    await admin.firestore()
      .collection("bidOpportunities")
      .doc(opportunityId)
      .update({
        status: "closed",
        closedAt: admin.firestore.FieldValue.serverTimestamp(),
        closeReason: reason,
      });

    console.log(`✅ Opportunity ${opportunityId} status updated to closed`);

    if (bidsSnapshot.empty) {
      console.log(`📧 No bids received for opportunity ${opportunityId}, sending admin notification`);

      // Send admin notification about no bids
      await sendBrevoEmail({
        to: "david@environ.uk.com",
        subject: `No Bids Received - ${opportunityData.title}`,
        htmlContent: `
          <h2>Opportunity Closed - No Bids Received</h2>
          <p>The opportunity "${opportunityData.title}" has been closed with no bids received.</p>
          
          <h3>Opportunity Details:</h3>
          <ul>
            <li><strong>Title:</strong> ${opportunityData.title}</li>
            <li><strong>Location:</strong> ${opportunityData.location}</li>
            <li><strong>Description:</strong> ${opportunityData.description}</li>
            <li><strong>Closed:</strong> ${new Date().toLocaleString("en-GB", {timeZone: "Europe/London"})}</li>
            <li><strong>Reason:</strong> ${reason}</li>
          </ul>
          
          <p>No winner notifications were sent as no bids were received.</p>
        `,
      });

      results.emailsSent = 1;
      console.log(`✅ Admin notification sent for no-bid closure of ${opportunityId}`);
      return results;
    }

    // Determine winners and send notifications
    const bidResults = await determineWinnersAndNotify(
      opportunityId,
      opportunityData,
      bidsSnapshot,
      reason
    );

    results.winners = bidResults.winners;
    results.emailsSent = bidResults.emailsSent;

    console.log(`✅ Opportunity ${opportunityId} closure completed - ${results.emailsSent} emails sent`);
    return results;
  } catch (error) {
    console.error(`❌ Error processing closure for opportunity ${opportunityId}:`, error);
    throw error;
  }
}

/**
 * Determine winners and send notification emails
 * @param {string} opportunityId - The opportunity ID
 * @param {Object} opportunityData - The opportunity document data
 * @param {Object} bidsSnapshot - Firestore snapshot of bids
 * @param {string} closeReason - Reason for closure
 * @return {Promise<Object>} Results with winners and email count
 */
async function determineWinnersAndNotify(opportunityId, opportunityData, bidsSnapshot, closeReason) {
  try {
    console.log(`🏆 Determining winners for opportunity: ${opportunityId}`);

    // Handle different closure reasons
    if (closeReason && (
      closeReason.toLowerCase().includes("error") ||
      closeReason.toLowerCase().includes("withdrawn") ||
      closeReason.toLowerCase().includes("no winner")
    )) {
      console.log(`🚫 No winners determined due to closure reason: ${closeReason}`);

      // Send notifications to all bidders about the situation
      const notifications = [];
      bidsSnapshot.forEach((bidDoc) => {
        const bidData = bidDoc.data();
        notifications.push(sendBidderNotification(bidData, opportunityData, "no_winner", closeReason));
      });

      await Promise.allSettled(notifications);

      return {
        winners: [],
        emailsSent: notifications.length,
      };
    }

    const bids = [];
    bidsSnapshot.forEach((doc) => {
      bids.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    // Sort bids by amount (highest first)
    bids.sort((a, b) => b.bidAmount - a.bidAmount);

    const winners = [];
    let emailsSent = 0;

    // Determine if we have habitat requirements
    const hasHabitatRequirements = opportunityData.habitatRequirements &&
      Object.keys(opportunityData.habitatRequirements).length > 0;

    if (hasHabitatRequirements) {
      console.log(`🌿 Processing habitat-specific winners for ${opportunityId}`);

      // Find winners for each habitat requirement
      for (const [habitat] of Object.entries(opportunityData.habitatRequirements)) {
        const habitatBids = bids.filter((bid) =>
          bid.habitatBids &&
          bid.habitatBids[habitat] &&
          bid.habitatBids[habitat].type === "bid" &&
          bid.habitatBids[habitat].amount > 0
        );

        if (habitatBids.length > 0) {
          // Sort by habitat-specific bid amount
          habitatBids.sort((a, b) =>
            b.habitatBids[habitat].amount - a.habitatBids[habitat].amount
          );

          const winner = habitatBids[0];
          winners.push({
            bidId: winner.id,
            userId: winner.userId,
            bidAmount: winner.bidAmount,
            winningType: "habitat",
            habitat: habitat,
            habitatAmount: winner.habitatBids[habitat].amount,
          });

          // Update bid document
          await admin.firestore()
            .collection("bids")
            .doc(winner.id)
            .update({
              isWinning: true,
              winningType: "habitat",
              winningHabitat: habitat,
              winningAmount: winner.habitatBids[habitat].amount,
            });

          console.log(`🏆 Habitat winner - ${habitat}: Bid ${winner.id} (£${winner.habitatBids[habitat].amount})`);
        }
      }
    } else {
      console.log(`💰 Processing overall winner for ${opportunityId}`);

      // No habitat requirements - overall highest bid wins
      if (bids.length > 0) {
        const winner = bids[0];
        winners.push({
          bidId: winner.id,
          userId: winner.userId,
          bidAmount: winner.bidAmount,
          winningType: "overall",
        });

        // Update bid document
        await admin.firestore()
          .collection("bids")
          .doc(winner.id)
          .update({
            isWinning: true,
            winningType: "overall",
            winningAmount: winner.bidAmount,
          });

        console.log(`🏆 Overall winner: Bid ${winner.id} (£${winner.bidAmount})`);
      }
    }

    // Send notifications to all bidders
    const notifications = [];

    bids.forEach((bid) => {
      const isWinner = winners.some((w) => w.bidId === bid.id);
      const winnerInfo = winners.find((w) => w.bidId === bid.id);

      if (isWinner) {
        notifications.push(sendBidderNotification(bid, opportunityData, "winner", closeReason, winnerInfo));
      } else {
        notifications.push(sendBidderNotification(bid, opportunityData, "loser", closeReason));
      }
    });

    // Send admin summary
    notifications.push(sendAdminSummary(opportunityData, winners, bids, closeReason));

    const notificationResults = await Promise.allSettled(notifications);
    emailsSent = notificationResults.filter((result) => result.status === "fulfilled").length;

    console.log(`📧 Sent ${emailsSent} winner/loser notifications for ${opportunityId}`);

    return {
      winners,
      emailsSent,
    };
  } catch (error) {
    console.error(`❌ Error determining winners for ${opportunityId}:`, error);
    throw error;
  }
}

/**
 * Send notification to a bidder about the opportunity outcome
 * @param {Object} bidData - The bid document data
 * @param {Object} opportunityData - The opportunity document data
 * @param {string} type - Type of notification ("winner", "loser", "no_winner")
 * @param {string} closeReason - Reason for closure
 * @param {Object} [winnerInfo] - Winner information if applicable
 * @return {Promise<void>}
 */
async function sendBidderNotification(bidData, opportunityData, type, closeReason, winnerInfo = null) {
  try {
    // Get user data
    const userDoc = await admin.firestore()
      .collection("users")
      .doc(bidData.userId)
      .get();

    if (!userDoc.exists) {
      console.error(`User ${bidData.userId} not found`);
      return;
    }

    const userData = userDoc.data();

    let subject; let message;

    if (type === "winner") {
      const winType = winnerInfo.winningType === "habitat" ?
        `${winnerInfo.habitat} habitat (£${winnerInfo.habitatAmount})` :
        `overall bid (£${winnerInfo.bidAmount})`;

      subject = `🎉 Congratulations! You won - ${opportunityData.title}`;
      message = `
        <h2>🎉 Congratulations! You're the Winner!</h2>
        <p>Your bid for "${opportunityData.title}" has been successful!</p>
        
        <h3>Winning Details:</h3>
        <ul>
          <li><strong>Winning Category:</strong> ${winType}</li>
          <li><strong>Your Total Bid:</strong> £${bidData.bidAmount}</li>
          <li><strong>Location:</strong> ${opportunityData.location}</li>
        </ul>
        
        <h3>Next Steps:</h3>
        <p>We'll be in touch shortly with contract details and next steps.</p>
        <p>Thank you for participating in the GIGL Marketplace!</p>
        
        <p><em>Closed: ${closeReason}</em></p>
      `;
    } else if (type === "loser") {
      subject = `Bidding Closed - ${opportunityData.title}`;
      message = `
        <h2>Bidding Has Closed</h2>
        <p>Thank you for your bid on "${opportunityData.title}".</p>
        
        <h3>Your Bid Details:</h3>
        <ul>
          <li><strong>Your Bid Amount:</strong> £${bidData.bidAmount}</li>
          <li><strong>Location:</strong> ${opportunityData.location}</li>
        </ul>
        
        <p>Unfortunately, your bid was not selected this time. However, we appreciate your participation and encourage you to bid on future opportunities.</p>
        
        <p>Keep an eye out for new opportunities in the GIGL Marketplace!</p>
        
        <p><em>Closed: ${closeReason}</em></p>
      `;
    } else if (type === "no_winner") {
      subject = `Opportunity Closed - ${opportunityData.title}`;

      if (closeReason.toLowerCase().includes("error")) {
        message = `
          <h2>Opportunity Closed Due to Error</h2>
          <p>The opportunity "${opportunityData.title}" has been closed due to an error in the opportunity definition.</p>
          
          <h3>Your Bid Details:</h3>
          <ul>
            <li><strong>Your Bid Amount:</strong> £${bidData.bidAmount}</li>
            <li><strong>Location:</strong> ${opportunityData.location}</li>
          </ul>
          
          <p><strong>Watch out for a repost of this opportunity - you will have to bid again.</strong></p>
          
          <p>We apologize for any inconvenience caused.</p>
        `;
      } else {
        message = `
          <h2>Opportunity Closed</h2>
          <p>The opportunity "${opportunityData.title}" has been closed.</p>
          
          <h3>Your Bid Details:</h3>
          <ul>
            <li><strong>Your Bid Amount:</strong> £${bidData.bidAmount}</li>
            <li><strong>Location:</strong> ${opportunityData.location}</li>
          </ul>
          
          <p>No winners were determined for this opportunity.</p>
          
          <p><em>Reason: ${closeReason}</em></p>
        `;
      }
    }

    await sendBrevoEmail({
      to: userData.email,
      subject: subject,
      htmlContent: message,
    });

    console.log(`✅ ${type} notification sent to ${userData.email}`);
  } catch (error) {
    console.error(`❌ Error sending ${type} notification to ${bidData.userId}:`, error);
  }
}

/**
 * Send admin summary of opportunity closure
 * @param {Object} opportunityData - The opportunity document data
 * @param {Array} winners - Array of winner information
 * @param {Array} bids - Array of all bids
 * @param {string} closeReason - Reason for closure
 * @return {Promise<void>}
 */
async function sendAdminSummary(opportunityData, winners, bids, closeReason) {
  try {
    const subject = `Opportunity Closed - ${opportunityData.title}`;

    const winnersList = winners.length > 0 ?
      winners.map((w) => {
        const bid = bids.find((b) => b.id === w.bidId);
        const userData = `User: ${bid.userId}`;
        if (w.winningType === "habitat") {
          return `• ${w.habitat}: £${w.habitatAmount} (${userData})`;
        } else {
          return `• Overall: £${w.bidAmount} (${userData})`;
        }
      }).join("\n") :
      "No winners determined";

    const bidsList = bids.map((bid) =>
      `• £${bid.bidAmount} - User: ${bid.userId} (${bid.createdAt ? new Date(bid.createdAt.toDate()).toLocaleString() : "Unknown date"})`
    ).join("\n");

    const message = `
      <h2>Opportunity Closure Summary</h2>
      <p>The opportunity "${opportunityData.title}" has been closed.</p>
      
      <h3>Opportunity Details:</h3>
      <ul>
        <li><strong>Location:</strong> ${opportunityData.location}</li>
        <li><strong>Description:</strong> ${opportunityData.description}</li>
        <li><strong>Total Bids Received:</strong> ${bids.length}</li>
        <li><strong>Winners Selected:</strong> ${winners.length}</li>
        <li><strong>Closure Reason:</strong> ${closeReason}</li>
      </ul>
      
      <h3>Winners:</h3>
      <pre>${winnersList}</pre>
      
      <h3>All Bids:</h3>
      <pre>${bidsList}</pre>
      
      <p>All bidders have been notified of the results.</p>
    `;

    await sendBrevoEmail({
      to: "david@environ.uk.com",
      subject: subject,
      htmlContent: message,
    });

    console.log(`✅ Admin summary sent for ${opportunityData.title}`);
  } catch (error) {
    console.error(`❌ Error sending admin summary:`, error);
  }
}

module.exports = {
  closeBidOpportunity,
  autoCloseOpportunities,
};
