// functions/modules/bidFunctions.js - LINT FIXES: JSDoc @return
const admin = require("firebase-admin");
const functions = require("firebase-functions");
const {sendBrevoEmail} = require("./emailFunctions");

/**
 * Triggered when a new bid is created.
 * Sends confirmation email to the bidder AND notification to admin.
 * @param {functions.firestore.DocumentSnapshot} snap - The snapshot of the new document.
 * @param {functions.EventContext} context - The event context.
 * @return {Promise<null>} A promise that resolves to null.
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
 * Triggered when an existing bid is updated.
 * Sends update confirmation email to the bidder AND notification to admin.
 * ALSO handles withdrawal notifications.
 * @param {functions.firestore.DocumentSnapshotChange} change - The change object with before and after snapshots.
 * @param {functions.EventContext} context - The event context.
 * @return {Promise<null>} A promise that resolves to null.
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
 * Shared function to send bid notifications (for create, update, and withdraw).
 * @param {object} bidData - The data of the bid.
 * @param {string} bidId - The ID of the bid.
 * @param {"created"|"updated"|"withdrawn"} action - The type of action that triggered the notification.
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

    // Handle withdrawal notifications differently
    if (action === "withdrawn") {
      await sendWithdrawalNotifications(userData, opportunityData, bidData, bidId, actionDate);
      return;
    }

    // Create habitat breakdown HTML for user email
    let habitatBreakdownHtml = "";
    if (bidData.habitatBids && bidData.habitatBids.length > 0) {
      const habitatItems = bidData.habitatBids.map((hb) => {
        if (hb.bidType === "no-bid") {
          return `
            <div style="background: #fff2f2; padding: 10px; margin: 5px 0; border-radius: 4px; border-left: 3px solid #dc2626;">
              <p style="margin: 2px 0; font-size: 14px;"><strong>${hb.specificHabitat}</strong></p>
              <p style="margin: 2px 0; font-size: 13px; color: #dc2626; font-style: italic;">No bid placed</p>
            </div>
          `;
        } else {
          const pricePerUnit = hb.pricePerUnit || (hb.subtotal / hb.unitsRequired);
          return `
            <div style="background: #f5f5f5; padding: 10px; margin: 5px 0; border-radius: 4px; border-left: 3px solid #16a34a;">
              <p style="margin: 2px 0; font-size: 14px;"><strong>${hb.specificHabitat}</strong></p>
              <p style="margin: 2px 0; font-size: 13px; color: #666;">${hb.unitsRequired} units at £${pricePerUnit.toFixed(2)}/unit = £${hb.subtotal.toLocaleString()}</p>
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
            <p style="margin: 5px 0;"><strong>Total Bid Amount:</strong> £${bidData.bidAmount.toLocaleString()}</p>
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
    if (bidData.habitatBids && bidData.habitatBids.length > 0) {
      const adminHabitatItems = bidData.habitatBids.map((hb) => {
        if (hb.bidType === "no-bid") {
          return `
            <tr style="background: #fff2f2;">
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${hb.specificHabitat}</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center; color: #dc2626; font-style: italic;">No Bid</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; color: #dc2626;">—</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; color: #dc2626;">—</td>
            </tr>
          `;
        } else {
          const pricePerUnit = hb.pricePerUnit || (hb.subtotal / hb.unitsRequired);
          return `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${hb.specificHabitat}</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${hb.unitsRequired}</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">£${pricePerUnit.toFixed(2)}</td>
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
              <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">Units</th>
              <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Price/Unit</th>
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
            <p style="margin: 5px 0;"><strong>Total Bid:</strong> £${bidData.bidAmount.toLocaleString()}</p>
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
          <p style="margin: 0;">GIGL Marketplace Admin System</p>
          <p style="margin: 5px 0 0 0;">Automated bid ${action} notification</p>
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
          
          <div style="background: #dbeafe; padding: 15px; border-radius: 8px; border-left: 4px solid #2563eb; margin: 20px 0;">
            <p style="margin: 0; color: #1e40af; font-size: 14px;">
              <strong>What happens next:</strong><br>
              • This opportunity is now available for you to bid on again<br>
              • You can place a new bid anytime before the closing date<br>
              • Your withdrawn bid will remain in your bid history for reference
            </p>
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
          <p style="margin: 0;">GIGL Marketplace Admin System</p>
          <p style="margin: 5px 0 0 0;">Automated bid withdrawal notification</p>
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
