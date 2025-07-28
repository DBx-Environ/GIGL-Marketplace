// functions/modules/emailFunctions.js - FINAL LINT FIX
const admin = require("firebase-admin");
const functions = require("firebase-functions");
const axios = require("axios");

/**
 * Shared utility function for sending emails via Brevo API using Axios.
 * @param {string} to - The recipient's email address.
 * @param {string} subject - The subject line of the email.
 * @param {string} htmlContent - The HTML content of the email body.
 * @param {string} [type] - A category for the email, used for logging. Defaults to "general".
 * @return {Promise<Object>} A promise that resolves with success status and message ID.
 */
async function sendBrevoEmail(to, subject, htmlContent, type = "general") {
  try {
    console.log(`Attempting to send email to ${to} with subject: ${subject}`);

    const brevoApiKey = functions.config().brevo?.api_key;
    if (!brevoApiKey) {
      throw new Error("Brevo API key not configured");
    }

    const emailData = {
      sender: {
        name: "GIGL Marketplace",
        email: "db-env@outlook.com",
      },
      to: [{email: to}],
      subject: subject,
      htmlContent: htmlContent,
    };

    const response = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      emailData,
      {
        headers: {
          "Content-Type": "application/json",
          "api-key": brevoApiKey,
        },
      }
    );

    console.log(`✅ Email sent to ${to}: ${subject}`);

    // Log success to Firestore
    await admin.firestore().collection("emailLogs").add({
      to: to,
      subject: subject,
      status: "sent",
      type: type,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      messageId: response.data.messageId,
    });

    return {success: true, messageId: response.data.messageId};
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error);

    // Log error to Firestore
    await admin.firestore().collection("emailLogs").add({
      to: to,
      subject: subject,
      status: "failed",
      type: type,
      error: error.message,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    throw error;
  }
}

/**
 * Callable function to send notification emails.
 * @param {object} data - The data passed to the callable function.
 * @param {string} data.to - The recipient's email address.
 * @param {string} data.subject - The subject line of the email.
 * @param {string} data.htmlContent - The HTML content of the email body.
 * @param {functions.https.CallableContext} context - The context of the callable function call.
 * @return {Promise<Object>} A promise that resolves with success status and message ID.
 * @throws {functions.https.HttpsError} If authentication fails, API key is missing, or internal error occurs.
 */
const sendNotificationEmail = functions
  .region("europe-west2")
  .https
  .onCall(async (data, context) => {
    try {
      const {to, subject, htmlContent} = data;

      const brevoApiKey = functions.config().brevo?.api_key;
      if (!brevoApiKey) {
        throw new Error("Brevo API key not configured");
      }

      const emailData = {
        sender: {
          name: "GIGL Marketplace",
          email: "db-env@outlook.com",
        },
        to: [{email: to}],
        subject: subject,
        htmlContent: htmlContent,
      };

      const response = await axios.post(
        "https://api.brevo.com/v3/smtp/email",
        emailData,
        {
          headers: {
            "Content-Type": "application/json",
            "api-key": brevoApiKey,
          },
        }
      );

      console.log("Email sent successfully:", response.data);
      return {success: true, messageId: response.data.messageId};
    } catch (error) {
      console.error("Error sending email:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  });

/**
 * Sends a welcome email to a newly registered user.
 * @param {string} userEmail - The email address of the new user.
 * @param {string} firstName - The first name of the new user.
 * @param {string} lastName - The last name of the new user.
 * @return {Promise<Object>} A promise that resolves with the email sending result.
 */
async function sendWelcomeEmail(userEmail, firstName, lastName) {
  const subject = "Welcome to GIGL Marketplace!";

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to GIGL!</h1>
        <p style="color: #e8f5e8; margin: 10px 0 0 0; font-size: 14px;">GIGL Marketplace</p>
      </div>
      
      <div style="padding: 30px; background: #f9f9f9;">
        <h2 style="color: #333; margin-top: 0;">Hello ${firstName} ${lastName}!</h2>
        
        <p style="font-size: 16px; line-height: 1.6; color: #555;">
          Thank you for joining the GIGL Marketplace - Greater Lincolnshire's premier platform for Biodiversity Net Gain trading.
        </p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4CAF50;">
          <h3 style="color: #4CAF50; margin-top: 0;">What's Next?</h3>
          <ul style="color: #555; line-height: 1.6;">
            <li>Browse available BNG opportunities on your dashboard</li>
            <li>Submit competitive bids for habitat creation and enhancement</li>
            <li>Track your bid status and receive instant notifications</li>
            <li>Connect with local landowners and conservation projects</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://gigl-marketplace-v3.web.app/dashboard" 
             style="background-color: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            Access Your Dashboard
          </a>
        </div>
        
        <p style="font-size: 14px; color: #777; border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
          <strong>Need Help?</strong><br>
          Contact our support team at <a href="mailto:david@baxterenvironmental.co.uk" style="color: #4CAF50;">david@baxterenvironmental.co.uk</a>
        </p>
      </div>
      
      <div style="background: #333; padding: 20px; text-align: center; color: #ccc; font-size: 12px;">
        <p style="margin: 0;">GIGL Marketplace - Connecting Conservation with Commerce</p>
        <p style="margin: 5px 0 0 0;">Building a sustainable future for Greater Lincolnshire's biodiversity</p>
      </div>
    </div>
  `;

  return await sendBrevoEmail(userEmail, subject, htmlContent, "welcome");
}

module.exports = {
  sendNotificationEmail,
  sendWelcomeEmail,
  sendBrevoEmail,
};
