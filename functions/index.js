// functions/index.js - PRODUCTION VERSION
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();

// Brevo API configuration
const BREVO_API_KEY = functions.config().brevo?.api_key;
const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

/**
 * Helper function to send email via Brevo
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} htmlContent - HTML content
 * @param {string} textContent - Text content
 * @return {Promise} Response from Brevo API
 */
async function sendEmail(to, subject, htmlContent, textContent) {
  try {
    if (!BREVO_API_KEY) {
      console.error("Brevo API key not configured");
      return;
    }

    if (!to || !subject) {
      console.error("Missing required email parameters");
      return;
    }

    const response = await axios.post(
        BREVO_API_URL,
        {
          sender: {
            name: "Baxter Environmental",
            email: "db-env@outlook.com",
          },
          to: [{email: to}],
          subject: subject,
          htmlContent: htmlContent,
          textContent: textContent,
        },
        {
          headers: {
            "api-key": BREVO_API_KEY,
            "Content-Type": "application/json",
          },
        },
    );

    console.log("Email sent successfully");
    return response.data;
  } catch (error) {
    console.error("Error sending email:", error.response?.data ||
        error.message);
    throw error;
  }
}

// Function to send welcome email after registration
exports.sendWelcomeEmail = functions.region("europe-west2")
    .auth.user().onCreate(async (user) => {
      const email = user.email;
      const subject = "Welcome to Baxter Environmental Bidding Platform";
      const htmlContent = `
    <h2>Welcome to Baxter Environmental!</h2>
    <p>Thank you for registering with our bidding platform.</p>
    <p>Please verify your email address to complete your registration.</p>
    <p>Once verified, you'll be able to view and participate in bidding 
    opportunities.</p>
    <br>
    <p>Best regards,<br>Baxter Environmental Team</p>
  `;
      const textContent = `
    Welcome to Baxter Environmental!
    Thank you for registering with our bidding platform.
    Please verify your email address to complete your registration.
    Once verified, you'll be able to view and participate in bidding 
    opportunities.
    
    Best regards,
    Baxter Environmental Team
  `;

      try {
        await sendEmail(email, subject, htmlContent, textContent);

        await admin.firestore().collection("emailLogs").add({
          type: "welcome",
          recipientEmail: email,
          subject: subject,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          status: "sent",
        });
      } catch (error) {
        console.error("Failed to send welcome email:", error);

        await admin.firestore().collection("emailLogs").add({
          type: "welcome",
          recipientEmail: email,
          subject: subject,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          status: "failed",
          error: error.message,
        });
      }
    });

// Function to notify when a new bid is placed
exports.onBidCreated = functions.region("europe-west2")
    .firestore.document("bids/{bidId}")
    .onCreate(async (snap, context) => {
      const bidData = snap.data();
      const bidId = context.params.bidId;

      try {
        const opportunityDoc = await admin.firestore()
            .collection("bidOpportunities")
            .doc(bidData.opportunityId)
            .get();

        if (!opportunityDoc.exists) {
          console.error("Opportunity not found");
          return;
        }

        const opportunityData = opportunityDoc.data();

        const userDoc = await admin.firestore()
            .collection("users")
            .doc(bidData.userId)
            .get();

        if (!userDoc.exists) {
          console.error("User not found");
          return;
        }

        const userData = userDoc.data();

        // Send confirmation email to bidder
        const subject = `Bid Confirmation - ${opportunityData.title}`;
        const htmlContent = `
        <h2>Bid Confirmation</h2>
        <p>Hello ${userData.firstName} ${userData.lastName},</p>
        <p>Your bid has been successfully submitted for the following 
        opportunity:</p>
        <ul>
          <li><strong>Title:</strong> ${opportunityData.title}</li>
          <li><strong>LPA:</strong> ${opportunityData.lpa}</li>
          <li><strong>NCA:</strong> ${opportunityData.nca}</li>
          <li><strong>BNG Unit Type:</strong> 
          ${opportunityData.bngUnitType}</li>
          <li><strong>Units Required:</strong> 
          ${opportunityData.unitsRequired}</li>
          <li><strong>Your Bid Amount:</strong> £${bidData.bidAmount}</li>
          <li><strong>Closing Date:</strong> 
          ${new Date(opportunityData.closingDate).toLocaleDateString()}</li>
        </ul>
        <p>You will be notified if your bid is successful.</p>
        <br>
        <p>Best regards,<br>Baxter Environmental Team</p>
      `;

        const textContent = `
        Bid Confirmation
        
        Hello ${userData.firstName} ${userData.lastName},
        
        Your bid has been successfully submitted for the following 
        opportunity:
        
        Title: ${opportunityData.title}
        LPA: ${opportunityData.lpa}
        NCA: ${opportunityData.nca}
        BNG Unit Type: ${opportunityData.bngUnitType}
        Units Required: ${opportunityData.unitsRequired}
        Your Bid Amount: £${bidData.bidAmount}
        Closing Date: ${new Date(opportunityData.closingDate)
        .toLocaleDateString()}
        
        You will be notified if your bid is successful.
        
        Best regards,
        Baxter Environmental Team
      `;

        await sendEmail(userData.email, subject, htmlContent, textContent);

        await admin.firestore().collection("emailLogs").add({
          type: "bid_confirmation",
          recipientEmail: userData.email,
          subject: subject,
          bidId: bidId,
          opportunityId: bidData.opportunityId,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          status: "sent",
        });

        // Notify admin of new bid
        const adminSubject = `New Bid - ${opportunityData.title}`;
        const adminContent = `
        <h2>New Bid Submitted</h2>
        <p>A new bid has been submitted:</p>
        <ul>
          <li><strong>Title:</strong> ${opportunityData.title}</li>
          <li><strong>Bidder:</strong> ${userData.firstName} 
          ${userData.lastName} (${userData.company})</li>
          <li><strong>Email:</strong> ${userData.email}</li>
          <li><strong>Bid Amount:</strong> £${bidData.bidAmount}</li>
          <li><strong>Submitted:</strong> ${new Date().toLocaleString()}</li>
        </ul>
      `;

        const adminEmail = "david@baxterenvironmental.co.uk";
        await sendEmail(adminEmail, adminSubject, adminContent, 
            adminContent);
      } catch (error) {
        console.error("Error processing bid creation:", error);
      }
    });

// Helper function to process opportunity closing
async function processOpportunityClosing(opportunityId) {
  try {
    const bidsSnapshot = await admin.firestore()
        .collection("bids")
        .where("opportunityId", "==", opportunityId)
        .get();

    // Filter out withdrawn bids manually
    const activeBids = [];
    bidsSnapshot.forEach((doc) => {
      const bid = doc.data();
      if (bid.status !== "withdrawn") {
        activeBids.push({id: doc.id, ...bid});
      }
    });

    if (activeBids.length === 0) {
      await admin.firestore()
          .collection("bidOpportunities")
          .doc(opportunityId)
          .update({
            status: "closed",
            closedAt: admin.firestore.FieldValue.serverTimestamp(),
            winningBidId: null,
            winningBidAmount: null,
          });
      
      return {success: true, message: "Opportunity closed with no bids"};
    }

    // Find the winning bid (lowest amount)
    let winningBid = null;
    let lowestAmount = Infinity;

    activeBids.forEach((bid) => {
      if (bid.bidAmount < lowestAmount) {
        lowestAmount = bid.bidAmount;
        winningBid = bid;
      }
    });

    if (!winningBid) {
      throw new Error("Could not determine winning bid");
    }

    // Update opportunity status
    await admin.firestore()
        .collection("bidOpportunities")
        .doc(opportunityId)
        .update({
          status: "closed",
          winningBidId: winningBid.id,
          winningBidAmount: winningBid.bidAmount,
          closedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

    // Update winning bid
    await admin.firestore()
        .collection("bids")
        .doc(winningBid.id)
        .update({
          isWinning: true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

    // Get opportunity and winner details
    const opportunityDoc = await admin.firestore()
        .collection("bidOpportunities")
        .doc(opportunityId)
        .get();

    const winnerDoc = await admin.firestore()
        .collection("users")
        .doc(winningBid.userId)
        .get();

    if (!opportunityDoc.exists || !winnerDoc.exists) {
      throw new Error("Missing opportunity or winner data");
    }

    const opportunityData = opportunityDoc.data();
    const winnerData = winnerDoc.data();

    // Send winner notification
    const winnerSubject = `You won - ${opportunityData.title}`;
    const winnerContent = `
      <h2>Congratulations! You Won!</h2>
      <p>Hello ${winnerData.firstName} ${winnerData.lastName},</p>
      <p>Your bid has been selected as the winning bid for:</p>
      <ul>
        <li><strong>Title:</strong> ${opportunityData.title}</li>
        <li><strong>Your Winning Bid:</strong> £${winningBid.bidAmount}</li>
        <li><strong>LPA:</strong> ${opportunityData.lpa}</li>
        <li><strong>NCA:</strong> ${opportunityData.nca}</li>
        <li><strong>BNG Unit Type:</strong> 
        ${opportunityData.bngUnitType}</li>
        <li><strong>Units Required:</strong> 
        ${opportunityData.unitsRequired}</li>
      </ul>
      <p>We will be in touch shortly with next steps.</p>
      <br>
      <p>Best regards,<br>Baxter Environmental Team</p>
    `;

    await sendEmail(winnerData.email, winnerSubject, winnerContent,
        winnerContent);

    // Notify unsuccessful bidders
    const unsuccessfulBids = activeBids.filter(bid => bid.id !== winningBid.id);

    for (const bid of unsuccessfulBids) {
      const bidderDoc = await admin.firestore()
          .collection("users")
          .doc(bid.userId)
          .get();

      if (!bidderDoc.exists) {
        continue;
      }

      const bidderData = bidderDoc.data();

      const subject = `Bid Result - ${opportunityData.title}`;
      const content = `
        <h2>Bid Result</h2>
        <p>Hello ${bidderData.firstName} ${bidderData.lastName},</p>
        <p>Thank you for your bid on ${opportunityData.title}.</p>
        <p>Unfortunately, your bid was not selected. 
        The winning bid was £${winningBid.bidAmount}.</p>
        <p>We encourage you to participate in future opportunities.</p>
        <br>
        <p>Best regards,<br>Baxter Environmental Team</p>
      `;

      await sendEmail(bidderData.email, subject, content, content);
    }

    return {success: true, winningBid: winningBid};
  } catch (error) {
    console.error("Error processing opportunity closing:", error);
    throw error;
  }
}

// Function to handle manual bid opportunity closing
exports.closeBidOpportunity = functions.region("europe-west2")
    .https.onCall(async (data, context) => {
      if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated",
            "User must be authenticated");
      }

      const userDoc = await admin.firestore()
          .collection("users")
          .doc(context.auth.uid)
          .get();

      if (!userDoc.exists || !userDoc.data().isAdmin) {
        throw new functions.https.HttpsError("permission-denied",
            "Only admin users can close opportunities");
      }

      const {opportunityId} = data;

      if (!opportunityId) {
        throw new functions.https.HttpsError("invalid-argument",
            "opportunityId is required");
      }

      try {
        const result = await processOpportunityClosing(opportunityId);
        return result;
      } catch (error) {
        console.error("Error closing bid opportunity:", error);
        throw new functions.https.HttpsError("internal",
            "Failed to close bid opportunity: " + error.message);
      }
    });

// Function to automatically close opportunities
exports.autoCloseOpportunities = functions.region("europe-west2")
    .pubsub.schedule("every 1 hours")
    .onRun(async (context) => {
      const now = new Date();
      
      try {
        const opportunitiesSnapshot = await admin.firestore()
            .collection("bidOpportunities")
            .where("status", "==", "active")
            .get();

        const opportunitiesToClose = [];
        
        opportunitiesSnapshot.forEach((doc) => {
          const opportunity = doc.data();
          const closingDate = new Date(opportunity.closingDate);
          
          if (closingDate <= now) {
            opportunitiesToClose.push({
              id: doc.id,
              ...opportunity,
            });
          }
        });

        console.log(`Auto-closing ${opportunitiesToClose.length} opportunities`);

        for (const opportunity of opportunitiesToClose) {
          try {
            await processOpportunityClosing(opportunity.id);
            console.log(`Auto-closed opportunity: ${opportunity.id}`);
          } catch (error) {
            console.error(`Failed to auto-close opportunity 
                ${opportunity.id}:`, error);
          }
        }
      } catch (error) {
        console.error("Error in auto-close function:", error);
      }
    });

// Function to send reminder emails
exports.sendBidReminders = functions.region("europe-west2")
    .pubsub.schedule("every 24 hours")
    .onRun(async (context) => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 59, 59, 999);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      try {
        const opportunitiesSnapshot = await admin.firestore()
            .collection("bidOpportunities")
            .where("closingDate", ">=", today.toISOString())
            .where("closingDate", "<=", tomorrow.toISOString())
            .where("status", "==", "active")
            .get();

        for (const doc of opportunitiesSnapshot.docs) {
          const opportunity = doc.data();

          const usersSnapshot = await admin.firestore()
              .collection("users")
              .where("isAdmin", "==", false)
              .get();

          for (const userDoc of usersSnapshot.docs) {
            const user = userDoc.data();

            const subject = `Reminder: ${opportunity.title} 
                closes tomorrow`;
            const content = `
          <h2>Bid Opportunity Closing Tomorrow</h2>
          <p>Hello ${user.firstName} ${user.lastName},</p>
          <p>Reminder: the following bid opportunity closes tomorrow:</p>
          <ul>
            <li><strong>Title:</strong> ${opportunity.title}</li>
            <li><strong>LPA:</strong> ${opportunity.lpa}</li>
            <li><strong>NCA:</strong> ${opportunity.nca}</li>
            <li><strong>BNG Unit Type:</strong> 
            ${opportunity.bngUnitType}</li>
            <li><strong>Units Required:</strong> 
            ${opportunity.unitsRequired}</li>
            <li><strong>Closing Date:</strong> 
            ${new Date(opportunity.closingDate).toLocaleDateString()}</li>
          </ul>
          <p>Don't miss out on this opportunity!</p>
          <br>
          <p>Best regards,<br>Baxter Environmental Team</p>
        `;

            await sendEmail(user.email, subject, content, content);
          }
        }

        console.log("Reminder emails sent successfully");
      } catch (error) {
        console.error("Error sending reminder emails:", error);
      }
    });