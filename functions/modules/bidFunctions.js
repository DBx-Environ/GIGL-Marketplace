// functions/modules/bidFunctions.js - ENHANCED WITH WITHDRAWAL EMAIL NOTIFICATIONS
const admin = require("firebase-admin");
const functions = require("firebase-functions");
const {sendBrevoEmail} = require("./emailFunctions");

/**
 * Triggered when a new bid is created
 * Sends confirmation email to the bidder AND notification to admin
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

      await sendBidNotifications(bidData, bidId, "created");

      return null;
    } catch (error) {
      console.error("Error in onBidCreated:", error);
      return null;
    }
  });

/**
 * Triggered when an existing bid is updated
 * Sends update confirmation email to the bidder AND notification to admin
 * ALSO handles withdrawal notifications
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
        await sendBidNotifications(afterData, bidId, "withdrawn");
        return null;
      }

      // Check if this is a winner status update (from opportunity closing)
      if (beforeData.isWinning !== afterData.isWinning ||
          beforeData.winningType !== afterData.winningType) {
        console.log(`📝 Bid ${bidId} winner status updated - no update notification sent`);
        return null;
      }

      // Check if bid amount or habitat bids actually changed (normal updates)
      const bidAmountChanged = beforeData.bidAmount !== afterData.bidAmount;
      const habitatBidsChanged = JSON.stringify(beforeData.habitatBids) !== JSON.stringify(afterData.habitatBids);

      if (!bidAmountChanged && !habitatBidsChanged) {
        console.log(`📝 Bid ${bidId} - no significant changes, no notification sent`);
        return null;
      }

      console.log(`📝 Processing bid update: ${bidId} for opportunity: ${afterData.opportunityId}`);

      await sendBidNotifications(afterData, bidId, "updated");

      return null;
    } catch (error) {
      console.error("Error in onBidUpdated:", error);
      return null;
    }
  });

/**
 * Shared function to send bid notifications (for create, update, and withdraw)
 * @param {Object} bidData - The bid document data
 * @param {string} bidId - The bid document ID
 * @param {string} action - The action performed ("created", "updated", or "withdrawn")
 * @return {Promise<void>}
 */
async function sendBidNotifications(bidData, bidId, action) {
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

    // Get opportunity data
    const opportunityDoc = await admin.firestore()
      .collection("bidOpportunities")
      .doc(bidData.opportunityId)
      .get();

    if (!opportunityDoc.exists) {
      console.error(`Opportunity ${bidData.opportunityId} not found`);
      return;
    }

    const opportunityData = opportunityDoc.data();

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
    const dateField = action === "created" ? bidData.createdAt : bidData.updatedAt;
    if (dateField?.toDate) {
      actionDate = dateField.toDate();
    } else if (dateField instanceof Date) {
      actionDate = dateField;
    } else if (typeof dateField === "string") {
      actionDate = new Date(dateField);
    } else {
      actionDate = new Date();
    }

    const formatDate = (date) => {
      return new Intl.DateTimeFormat("en-GB", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/London",
      }).format(date);
    };

    // Format habitat bids display
    const formatHabitatBids = (habitatBids) => {
      if (!habitatBids || Object.keys(habitatBids).length === 0) {
        return "No habitat-specific requirements";
      }

      return Object.entries(habitatBids)
        .map(([habitat, bid]) => {
          if (bid.type === "bid") {
            return `${habitat}: £${bid.amount}`;
          } else {
            return `${habitat}: No Bid`;
          }
        })
        .join(", ");
    };

    // Determine email content based on action
    let userSubject; let userMessage; let adminSubject; let adminMessage;

    if (action === "created") {
      userSubject = `Bid Confirmation - ${opportunityData.title}`;
      userMessage = `
        <h2>Bid Submitted Successfully</h2>
        <p>Thank you for submitting your bid for "${opportunityData.title}".</p>
        
        <h3>Bid Details:</h3>
        <ul>
          <li><strong>Total Bid Amount:</strong> £${bidData.bidAmount}</li>
          <li><strong>Habitat Requirements:</strong> ${formatHabitatBids(bidData.habitatBids)}</li>
          <li><strong>Submitted:</strong> ${formatDate(actionDate)}</li>
        </ul>
        
        <h3>Opportunity Details:</h3>
        <ul>
          <li><strong>Location:</strong> ${opportunityData.location}</li>
          <li><strong>Description:</strong> ${opportunityData.description}</li>
          <li><strong>Closes:</strong> ${formatDate(closingDate)}</li>
        </ul>
        
        <p>You can update your bid anytime before the closing date through your dashboard.</p>
        <p>We'll notify you when the bidding closes and winners are announced.</p>
      `;

      adminSubject = `New Bid Received - ${opportunityData.title}`;
      adminMessage = `
        <h2>New Bid Received</h2>
        <p>A new bid has been submitted for "${opportunityData.title}".</p>
        
        <h3>Bidder Information:</h3>
        <ul>
          <li><strong>Name:</strong> ${userData.name}</li>
          <li><strong>Email:</strong> ${userData.email}</li>
          <li><strong>Company:</strong> ${userData.company || "Not specified"}</li>
        </ul>
        
        <h3>Bid Details:</h3>
        <ul>
          <li><strong>Total Bid Amount:</strong> £${bidData.bidAmount}</li>
          <li><strong>Habitat Requirements:</strong> ${formatHabitatBids(bidData.habitatBids)}</li>
          <li><strong>Submitted:</strong> ${formatDate(actionDate)}</li>
        </ul>
        
        <p><strong>Opportunity:</strong> ${opportunityData.title} (${opportunityData.location})</p>
        <p><strong>Closes:</strong> ${formatDate(closingDate)}</p>
      `;
    } else if (action === "updated") {
      userSubject = `Bid Updated - ${opportunityData.title}`;
      userMessage = `
        <h2>Bid Updated Successfully</h2>
        <p>Your bid for "${opportunityData.title}" has been updated.</p>
        
        <h3>Updated Bid Details:</h3>
        <ul>
          <li><strong>Total Bid Amount:</strong> £${bidData.bidAmount}</li>
          <li><strong>Habitat Requirements:</strong> ${formatHabitatBids(bidData.habitatBids)}</li>
          <li><strong>Updated:</strong> ${formatDate(actionDate)}</li>
        </ul>
        
        <h3>Opportunity Details:</h3>
        <ul>
          <li><strong>Location:</strong> ${opportunityData.location}</li>
          <li><strong>Description:</strong> ${opportunityData.description}</li>
          <li><strong>Closes:</strong> ${formatDate(closingDate)}</li>
        </ul>
        
        <p>You can continue to update your bid anytime before the closing date.</p>
        <p>We'll notify you when the bidding closes and winners are announced.</p>
      `;

      adminSubject = `Bid Updated - ${opportunityData.title}`;
      adminMessage = `
        <h2>Bid Updated</h2>
        <p>A bid has been updated for "${opportunityData.title}".</p>
        
        <h3>Bidder Information:</h3>
        <ul>
          <li><strong>Name:</strong> ${userData.name}</li>
          <li><strong>Email:</strong> ${userData.email}</li>
          <li><strong>Company:</strong> ${userData.company || "Not specified"}</li>
        </ul>
        
        <h3>Updated Bid Details:</h3>
        <ul>
          <li><strong>Total Bid Amount:</strong> £${bidData.bidAmount}</li>
          <li><strong>Habitat Requirements:</strong> ${formatHabitatBids(bidData.habitatBids)}</li>
          <li><strong>Updated:</strong> ${formatDate(actionDate)}</li>
        </ul>
        
        <p><strong>Opportunity:</strong> ${opportunityData.title} (${opportunityData.location})</p>
        <p><strong>Closes:</strong> ${formatDate(closingDate)}</p>
      `;
    } else if (action === "withdrawn") {
      userSubject = `Bid Withdrawn - ${opportunityData.title}`;
      userMessage = `
        <h2>Bid Withdrawn</h2>
        <p>Your bid for "${opportunityData.title}" has been successfully withdrawn.</p>
        
        <h3>Withdrawn Bid Details:</h3>
        <ul>
          <li><strong>Total Bid Amount:</strong> £${bidData.bidAmount}</li>
          <li><strong>Habitat Requirements:</strong> ${formatHabitatBids(bidData.habitatBids)}</li>
          <li><strong>Withdrawn:</strong> ${formatDate(actionDate)}</li>
        </ul>
        
        <h3>Opportunity Details:</h3>
        <ul>
          <li><strong>Location:</strong> ${opportunityData.location}</li>
          <li><strong>Description:</strong> ${opportunityData.description}</li>
          <li><strong>Closes:</strong> ${formatDate(closingDate)}</li>
        </ul>
        
        <p>You can still submit a new bid for this opportunity if it hasn't closed yet.</p>
        <p>The opportunity closes at: ${formatDate(closingDate)}</p>
      `;

      adminSubject = `Bid Withdrawn - ${opportunityData.title}`;
      adminMessage = `
        <h2>Bid Withdrawn</h2>
        <p>A bid has been withdrawn from "${opportunityData.title}".</p>
        
        <h3>Bidder Information:</h3>
        <ul>
          <li><strong>Name:</strong> ${userData.name}</li>
          <li><strong>Email:</strong> ${userData.email}</li>
          <li><strong>Company:</strong> ${userData.company || "Not specified"}</li>
        </ul>
        
        <h3>Withdrawn Bid Details:</h3>
        <ul>
          <li><strong>Total Bid Amount:</strong> £${bidData.bidAmount}</li>
          <li><strong>Habitat Requirements:</strong> ${formatHabitatBids(bidData.habitatBids)}</li>
          <li><strong>Withdrawn:</strong> ${formatDate(actionDate)}</li>
        </ul>
        
        <p><strong>Opportunity:</strong> ${opportunityData.title} (${opportunityData.location})</p>
        <p><strong>Closes:</strong> ${formatDate(closingDate)}</p>
      `;
    }

    // Send confirmation email to the bidder
    try {
      await sendBrevoEmail({
        to: userData.email,
        subject: userSubject,
        htmlContent: userMessage,
      });
      console.log(`✅ Bid ${action} confirmation email sent to ${userData.email}`);
    } catch (emailError) {
      console.error(`❌ Failed to send ${action} confirmation email:`, emailError);
    }

    // Send notification email to admin
    const adminEmail = "david@environ.uk.com";
    try {
      await sendBrevoEmail({
        to: adminEmail,
        subject: adminSubject,
        htmlContent: adminMessage,
      });
      console.log(`✅ Admin ${action} notification email sent for bid ${bidId}`);
    } catch (emailError) {
      console.error(`❌ Failed to send admin ${action} notification:`, emailError);
    }
  } catch (error) {
    console.error(`Error sending ${action} notifications:`, error);
  }
}

module.exports = {
  onBidCreated,
  onBidUpdated,
};
