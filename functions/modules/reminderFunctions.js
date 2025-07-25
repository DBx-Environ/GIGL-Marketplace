// functions/modules/reminderFunctions.js
const admin = require("firebase-admin");
const functions = require("firebase-functions");
const {sendBrevoEmail} = require("./emailFunctions");

/**
 * Scheduled function to send daily reminder emails
 * Runs daily at 9 AM GMT to remind users about opportunities closing within 24 hours
 */
const sendBidReminders = functions
  .region("europe-west2")
  .pubsub
  .schedule("0 9 * * *") // Daily at 9 AM
  .timeZone("Europe/London")
  .onRun(async (context) => {
    try {
      console.log("Starting daily reminder check");

      const now = admin.firestore.Timestamp.now();
      const twentyFourHoursFromNow = admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + 24 * 60 * 60 * 1000)
      );

      // Find opportunities closing within 24 hours
      const closingSoonSnapshot = await admin.firestore()
        .collection("bidOpportunities")
        .where("status", "==", "active")
        .where("closingDate", ">=", now)
        .where("closingDate", "<=", twentyFourHoursFromNow)
        .get();

      if (closingSoonSnapshot.empty) {
        console.log("No opportunities closing within 24 hours");
        return null;
      }

      console.log(`Found ${closingSoonSnapshot.size} opportunities closing within 24 hours`);

      // Process each opportunity
      const reminderPromises = closingSoonSnapshot.docs.map(async (opportunityDoc) => {
        try {
          const opportunityData = opportunityDoc.data();
          const opportunityId = opportunityDoc.id;

          console.log(`Processing reminders for: ${opportunityData.title}`);

          // Get all users who have bid on this opportunity
          const bidsSnapshot = await admin.firestore()
            .collection("bids")
            .where("opportunityId", "==", opportunityId)
            .where("status", "!=", "withdrawn")
            .get();

          // Get unique user IDs who have bid
          const bidderUserIds = [...new Set(bidsSnapshot.docs.map((doc) => doc.data().userId))];

          // Get all active users (to send "last chance" emails to those who haven't bid)
          const allUsersSnapshot = await admin.firestore()
            .collection("users")
            .where("emailVerified", "==", true)
            .get();

          const allUserIds = allUsersSnapshot.docs.map((doc) => doc.id);
          const nonBidderUserIds = allUserIds.filter((userId) => !bidderUserIds.includes(userId));

          // Send reminder emails to bidders
          const bidderReminders = bidderUserIds.map(async (userId) => {
            try {
              const userDoc = await admin.firestore().collection("users").doc(userId).get();
              if (userDoc.exists) {
                return await sendReminderEmail(userDoc.data(), opportunityData, true);
              }
            } catch (error) {
              console.error(`Error sending bidder reminder to ${userId}:`, error);
              return {success: false, userId, error: error.message};
            }
          });

          // Send "last chance" emails to non-bidders (limit to prevent spam)
          const lastChanceReminders = nonBidderUserIds.slice(0, 50).map(async (userId) => {
            try {
              const userDoc = await admin.firestore().collection("users").doc(userId).get();
              if (userDoc.exists) {
                return await sendReminderEmail(userDoc.data(), opportunityData, false);
              }
            } catch (error) {
              console.error(`Error sending last chance reminder to ${userId}:`, error);
              return {success: false, userId, error: error.message};
            }
          });

          const results = await Promise.all([...bidderReminders, ...lastChanceReminders]);
          const successful = results.filter((r) => r && r.success).length;
          const failed = results.filter((r) => r && !r.success).length;

          console.log(`Opportunity ${opportunityId}: ${successful} successful, ${failed} failed reminders`);

          return {
            opportunityId,
            title: opportunityData.title,
            successful,
            failed,
            totalSent: successful + failed,
          };
        } catch (error) {
          console.error(`Error processing reminders for opportunity ${opportunityDoc.id}:`, error);
          return {
            opportunityId: opportunityDoc.id,
            error: error.message,
            successful: 0,
            failed: 1,
          };
        }
      });

      const results = await Promise.all(reminderPromises);
      const totalSuccessful = results.reduce((sum, r) => sum + (r.successful || 0), 0);
      const totalFailed = results.reduce((sum, r) => sum + (r.failed || 0), 0);

      console.log(`Reminder summary: ${totalSuccessful} successful, ${totalFailed} failed`);

      return {
        processed: results.length,
        totalSuccessful,
        totalFailed,
        results,
      };
    } catch (error) {
      console.error("Error in sendBidReminders:", error);
      return null;
    }
  });

/**
 * Send individual reminder email
 */
async function sendReminderEmail(userData, opportunityData, hasBid) {
  try {
    const subject = hasBid ?
      `Reminder: Your Bid Closes Soon! - ${opportunityData.title}` :
      `Last Chance: ${opportunityData.title} - Closes Soon!`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, ${hasBid ? "#ff9800" : "#f44336"} 0%, ${hasBid ? "#f57c00" : "#d32f2f"} 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">${hasBid ? "⏰ Bid Reminder" : "🚨 Last Chance!"}</h1>
          <p style="color: ${hasBid ? "#fff3e0" : "#ffebee"}; margin: 10px 0 0 0; font-size: 14px;">GIGL Marketplace</p>
        </div>
        
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #333; margin-top: 0;">${hasBid ?
    `Your Bid Closes Soon!` :
    `Last Chance to Bid!`}</h2>
          
          <p>Dear ${userData.firstName} ${userData.lastName},</p>
          
          <p>${hasBid ?
    "This is a reminder that an opportunity you've bid on will close within 24 hours:" :
    "Don't miss this opportunity! The following bid opportunity closes within 24 hours:"
}</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${hasBid ? "#ff9800" : "#f44336"};">
            <h3 style="color: ${hasBid ? "#ff9800" : "#f44336"}; margin-top: 0;">Opportunity Details</h3>
            <p><strong>Title:</strong> ${opportunityData.title}</p>
            <p><strong>LPA:</strong> ${opportunityData.lpa || "Not specified"}</p>
            <p><strong>NCA:</strong> ${opportunityData.nca || "Not specified"}</p>
            <p><strong>Location:</strong> ${opportunityData.location || "Not specified"}</p>
            <p><strong>Closes:</strong> ${opportunityData.closingDate.toDate().toLocaleString("en-GB")}</p>
            
            ${opportunityData.habitatRequirements ? `
              <div style="margin-top: 15px;">
                <strong>Habitat Requirements:</strong>
                <ul style="margin: 5px 0; padding-left: 20px;">
                  ${opportunityData.habitatRequirements.map((req) => `
                    <li style="margin: 3px 0;">${req.specificHabitat}: ${req.unitsRequired} units</li>
                  `).join("")}
                </ul>
              </div>
            ` : ""}
          </div>
          
          <div style="background: ${hasBid ? "#fff3cd" : "#f8d7da"}; padding: 15px; border-radius: 8px; border-left: 4px solid ${hasBid ? "#ffc107" : "#dc3545"}; margin: 20px 0;">
            <p style="margin: 0; color: ${hasBid ? "#856404" : "#721c24"}; font-size: 14px;">
              <strong>${hasBid ? "Action Available:" : "Action Required:"}</strong><br>
              ${hasBid ?
    "• You can still update your bid before the closing time<br>• Review competing bids and adjust your strategy<br>• Ensure your bid covers all required habitat types" :
    "• This is your last chance to submit a bid for this opportunity<br>• Review the habitat requirements carefully<br>• Submit competitive pricing to maximize your chances"
}
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://gigl-marketplace-v3.web.app/dashboard" 
               style="background-color: ${hasBid ? "#ff9800" : "#f44336"}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              ${hasBid ? "Update Your Bid" : "Place Your Bid Now"}
            </a>
          </div>
          
          <p style="font-size: 14px; color: #777; border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
            <strong>Questions?</strong><br>
            Contact us at <a href="mailto:david@baxterenvironmental.co.uk" style="color: #4CAF50;">david@baxterenvironmental.co.uk</a>
          </p>
        </div>
        
        <div style="background: #333; padding: 20px; text-align: center; color: #ccc; font-size: 12px;">
          <p style="margin: 0;">GIGL Marketplace - Biodiversity Net Gain Trading Platform</p>
          <p style="margin: 5px 0 0 0;">This is an automated reminder. Time-sensitive opportunities require prompt action.</p>
        </div>
      </div>
    `;

    const result = await sendBrevoEmail(userData.email, subject, htmlContent);

    if (result.success) {
      console.log(`✅ Reminder sent to ${userData.email} (${hasBid ? "existing bidder" : "new prospect"})`);
      return {success: true, email: userData.email, type: hasBid ? "bidder" : "prospect"};
    } else {
      console.error(`❌ Failed to send reminder to ${userData.email}:`, result.error);
      return {success: false, email: userData.email, error: result.error};
    }
  } catch (error) {
    console.error(`Error sending reminder to ${userData.email}:`, error);
    return {success: false, email: userData.email, error: error.message};
  }
}

module.exports = {
  sendBidReminders,
};
