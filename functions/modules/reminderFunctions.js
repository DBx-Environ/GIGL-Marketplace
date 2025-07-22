// functions/modules/reminderFunctions.js - REMINDER SYSTEM WITH JSDOC
const admin = require("firebase-admin");
const functions = require("firebase-functions");
const {sendBrevoEmail} = require("./emailFunctions");

/**
 * Scheduled function to send daily reminders about closing opportunities
 * Runs daily at 9:00 AM UK time
 */
const sendBidReminders = functions
  .region("europe-west2")
  .pubsub.schedule("0 9 * * *")
  .timeZone("Europe/London")
  .onRun(async (context) => {
    try {
      console.log("📬 REMINDERS: Starting daily reminder check");

      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 59, 59, 999); // End of tomorrow

      console.log(`📬 REMINDERS: Current time: ${now.toISOString()}`);
      console.log(`📬 REMINDERS: Looking for opportunities closing before: ${tomorrow.toISOString()}`);

      // Get all active opportunities closing within 24 hours
      const snapshot = await admin.firestore()
        .collection("bidOpportunities")
        .where("status", "==", "active")
        .where("closingDate", "<=", tomorrow)
        .where("closingDate", ">", now)
        .get();

      if (snapshot.empty) {
        console.log("📬 REMINDERS: No opportunities closing soon found");
        return null;
      }

      console.log(`📬 REMINDERS: Found ${snapshot.size} opportunities closing soon`);

      const reminderPromises = [];

      snapshot.forEach((doc) => {
        const opportunity = doc.data();
        const opportunityId = doc.id;

        console.log(`📬 REMINDERS: Processing ${opportunityId}: "${opportunity.title}"`);
        reminderPromises.push(sendOpportunityReminders(opportunityId, opportunity));
      });

      const results = await Promise.allSettled(reminderPromises);

      // Log results
      let successCount = 0;
      let errorCount = 0;

      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          successCount++;
          console.log(`✅ REMINDERS: Successfully sent reminders for opportunity ${index + 1}`);
        } else {
          errorCount++;
          console.error(`❌ REMINDERS: Failed to send reminders for opportunity ${index + 1}:`, result.reason);
        }
      });

      console.log(`📬 REMINDERS: Completed - ${successCount} successful, ${errorCount} failed`);
      return null;
    } catch (error) {
      console.error("❌ REMINDERS: Error in sendBidReminders:", error);
      return null;
    }
  });

/**
 * Send reminder emails for a specific opportunity
 * @param {string} opportunityId - The ID of the opportunity
 * @param {Object} opportunityData - The opportunity document data
 * @return {Promise<void>}
 */
async function sendOpportunityReminders(opportunityId, opportunityData) {
  try {
    // Get all registered users
    const usersSnapshot = await admin.firestore()
      .collection("users")
      .get();

    if (usersSnapshot.empty) {
      console.log(`📬 No users found for reminders`);
      return;
    }

    // Get all bids for this opportunity to see who has already bid
    const bidsSnapshot = await admin.firestore()
      .collection("bids")
      .where("opportunityId", "==", opportunityId)
      .where("status", "!=", "withdrawn")
      .get();

    const bidderIds = new Set();
    bidsSnapshot.forEach((bidDoc) => {
      bidderIds.add(bidDoc.data().userId);
    });

    console.log(`📬 Found ${bidderIds.size} existing bidders for ${opportunityId}`);

    // Format closing date
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

    const formattedClosingDate = formatDate(closingDate);

    // Calculate time remaining
    const timeRemaining = closingDate - new Date();
    const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));

    let urgencyMessage = "";
    if (hoursRemaining <= 6) {
      urgencyMessage = "⚠️ URGENT: Less than 6 hours remaining!";
    } else if (hoursRemaining <= 12) {
      urgencyMessage = "⏰ REMINDER: Less than 12 hours remaining!";
    } else {
      urgencyMessage = "📅 REMINDER: Closing soon!";
    }

    // Send reminders to all users
    const reminderPromises = [];

    usersSnapshot.forEach((userDoc) => {
      const userId = userDoc.id;
      const userData = userDoc.data();

      if (!userData.email) {
        console.log(`📬 Skipping user ${userId} - no email address`);
        return;
      }

      const hasBid = bidderIds.has(userId);
      reminderPromises.push(sendUserReminder(userData, opportunityData, hasBid, formattedClosingDate, urgencyMessage, hoursRemaining));
    });

    const reminderResults = await Promise.allSettled(reminderPromises);

    const sentCount = reminderResults.filter((result) => result.status === "fulfilled").length;
    const failedCount = reminderResults.filter((result) => result.status === "rejected").length;

    console.log(`📬 Sent ${sentCount} reminders, ${failedCount} failed for opportunity ${opportunityId}`);

    // Send admin summary
    await sendAdminReminderSummary(opportunityData, sentCount, failedCount, bidderIds.size, usersSnapshot.size);
  } catch (error) {
    console.error(`❌ Error sending reminders for opportunity ${opportunityId}:`, error);
    throw error;
  }
}

/**
 * Send reminder email to a specific user
 * @param {Object} userData - The user document data
 * @param {Object} opportunityData - The opportunity document data
 * @param {boolean} hasBid - Whether the user has already bid
 * @param {string} formattedClosingDate - Formatted closing date string
 * @param {string} urgencyMessage - Urgency message based on time remaining
 * @param {number} hoursRemaining - Hours remaining until closure
 * @return {Promise<void>}
 */
async function sendUserReminder(userData, opportunityData, hasBid, formattedClosingDate, urgencyMessage, hoursRemaining) {
  try {
    let subject; let message;

    if (hasBid) {
      // User has already bid - reminder to update if needed
      subject = `${urgencyMessage} Update Your Bid - ${opportunityData.title}`;
      message = `
        <h2>${urgencyMessage}</h2>
        <p>This is a reminder that the opportunity "${opportunityData.title}" is closing soon.</p>
        
        <h3>⏰ Time Remaining: ${hoursRemaining} hours</h3>
        <p><strong>Closes:</strong> ${formattedClosingDate}</p>
        
        <h3>Your Status:</h3>
        <p>✅ You have already submitted a bid for this opportunity.</p>
        <p>You can still update your bid before the closing time if needed.</p>
        
        <h3>Opportunity Details:</h3>
        <ul>
          <li><strong>Title:</strong> ${opportunityData.title}</li>
          <li><strong>Location:</strong> ${opportunityData.location}</li>
          <li><strong>Description:</strong> ${opportunityData.description}</li>
        </ul>
        
        <p><a href="${process.env.FRONTEND_URL || "https://gigl-marketplace-v3.web.app"}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Review Your Bid</a></p>
      `;
    } else {
      // User hasn't bid yet - encourage to bid
      subject = `${urgencyMessage} Last Chance to Bid - ${opportunityData.title}`;
      message = `
        <h2>${urgencyMessage}</h2>
        <p>Don't miss out! The opportunity "${opportunityData.title}" is closing soon and you haven't submitted a bid yet.</p>
        
        <h3>⏰ Time Remaining: ${hoursRemaining} hours</h3>
        <p><strong>Closes:</strong> ${formattedClosingDate}</p>
        
        <h3>Opportunity Details:</h3>
        <ul>
          <li><strong>Title:</strong> ${opportunityData.title}</li>
          <li><strong>Location:</strong> ${opportunityData.location}</li>
          <li><strong>Description:</strong> ${opportunityData.description}</li>
        </ul>
        
        <h3>Why Bid?</h3>
        <ul>
          <li>Secure valuable environmental contracts</li>
          <li>Contribute to biodiversity net gain</li>
          <li>Grow your environmental consultancy business</li>
        </ul>
        
        <p><a href="${process.env.FRONTEND_URL || "https://gigl-marketplace-v3.web.app"}" style="background-color: #FF5722; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Submit Your Bid Now</a></p>
        
        <p><em>This is your last chance to bid on this opportunity!</em></p>
      `;
    }

    await sendBrevoEmail({
      to: userData.email,
      subject: subject,
      htmlContent: message,
    });

    console.log(`📬 Reminder sent to ${userData.email} (${hasBid ? "has bid" : "no bid yet"})`);
  } catch (error) {
    console.error(`❌ Error sending reminder to ${userData.email}:`, error);
    throw error;
  }
}

/**
 * Send admin summary of reminder sending
 * @param {Object} opportunityData - The opportunity document data
 * @param {number} sentCount - Number of reminders sent successfully
 * @param {number} failedCount - Number of reminders that failed
 * @param {number} bidderCount - Number of users who have already bid
 * @param {number} totalUsers - Total number of users
 * @return {Promise<void>}
 */
async function sendAdminReminderSummary(opportunityData, sentCount, failedCount, bidderCount, totalUsers) {
  try {
    const subject = `Daily Reminders Sent - ${opportunityData.title}`;

    // Format closing date
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

    const timeRemaining = closingDate - new Date();
    const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));

    const message = `
      <h2>Daily Reminder Summary</h2>
      <p>Reminders have been sent for the opportunity closing soon.</p>
      
      <h3>Opportunity Details:</h3>
      <ul>
        <li><strong>Title:</strong> ${opportunityData.title}</li>
        <li><strong>Location:</strong> ${opportunityData.location}</li>
        <li><strong>Closing:</strong> ${formatDate(closingDate)}</li>
        <li><strong>Time Remaining:</strong> ${hoursRemaining} hours</li>
      </ul>
      
      <h3>Reminder Statistics:</h3>
      <ul>
        <li><strong>Total Users:</strong> ${totalUsers}</li>
        <li><strong>Users with Bids:</strong> ${bidderCount}</li>
        <li><strong>Users without Bids:</strong> ${totalUsers - bidderCount}</li>
        <li><strong>Reminders Sent:</strong> ${sentCount}</li>
        <li><strong>Failed to Send:</strong> ${failedCount}</li>
      </ul>
      
      <h3>Engagement Rate:</h3>
      <p><strong>${((bidderCount / totalUsers) * 100).toFixed(1)}%</strong> of users have submitted bids.</p>
      
      ${hoursRemaining <= 6 ? "<p><strong>⚠️ URGENT: Less than 6 hours remaining until this opportunity closes!</strong></p>" : ""}
    `;

    await sendBrevoEmail({
      to: "david@environ.uk.com",
      subject: subject,
      htmlContent: message,
    });

    console.log(`📬 Admin reminder summary sent for ${opportunityData.title}`);
  } catch (error) {
    console.error(`❌ Error sending admin reminder summary:`, error);
  }
}

module.exports = {
  sendBidReminders,
};
