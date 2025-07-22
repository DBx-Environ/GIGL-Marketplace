// functions/modules/emailFunctions.js - WORKING AXIOS VERSION WITH JSDOC
const functions = require("firebase-functions");
const axios = require("axios");

/**
 * Sends an email using the Brevo API
 * @param {Object} emailData - The email data object
 * @param {string} emailData.to - The recipient email address
 * @param {string} emailData.subject - The email subject line
 * @param {string} emailData.htmlContent - The HTML content of the email
 * @param {string} [emailData.textContent] - The plain text content (optional)
 * @return {Promise<Object>} The API response from Brevo
 */
async function sendBrevoEmail({to, subject, htmlContent, textContent}) {
  try {
    const apiKey = functions.config().brevo?.api_key;

    if (!apiKey) {
      throw new Error("Brevo API key not configured");
    }

    const emailData = {
      sender: {
        name: "GIGL Marketplace",
        email: "noreply@environ.uk.com",
      },
      to: [
        {
          email: to,
        },
      ],
      subject: subject,
      htmlContent: htmlContent,
    };

    // Add text content if provided
    if (textContent) {
      emailData.textContent = textContent;
    }

    const response = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      emailData,
      {
        headers: {
          "api-key": apiKey,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Email sent successfully via Brevo:", {
      to,
      subject,
      messageId: response.data.messageId,
    });

    return response.data;
  } catch (error) {
    console.error("❌ Error sending email via Brevo:", {
      to,
      subject,
      error: error.message,
      response: error.response?.data,
    });
    throw error;
  }
}

/**
 * Cloud Function to send notification emails
 * @param {Object} data - The request data
 * @param {string} data.to - The recipient email address
 * @param {string} data.subject - The email subject line
 * @param {string} data.message - The email message content
 * @param {Object} context - The function context
 * @returns {Promise<Object>} Success response
 */
const sendNotificationEmail = functions
  .region("europe-west2")
  .https.onCall(async (data, context) => {
    try {
      // Basic validation
      if (!data.to || !data.subject || !data.message) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Missing required fields: to, subject, message"
        );
      }

      // Send the email
      await sendBrevoEmail({
        to: data.to,
        subject: data.subject,
        htmlContent: data.message,
      });

      return {
        success: true,
        message: "Email sent successfully",
      };
    } catch (error) {
      console.error("Error in sendNotificationEmail:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to send email"
      );
    }
  });

module.exports = {
  sendBrevoEmail,
  sendNotificationEmail,
};
