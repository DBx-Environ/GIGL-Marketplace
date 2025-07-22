// functions/index.js - CLEAN PRODUCTION VERSION
const admin = require("firebase-admin");

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

// Import all function modules
const emailFunctions = require("./modules/emailFunctions");
const bidFunctions = require("./modules/bidFunctions");
const opportunityFunctions = require("./modules/opportunityFunctions");
const reminderFunctions = require("./modules/reminderFunctions");

// Export all functions
module.exports = {
  // Email functions
  sendNotificationEmail: emailFunctions.sendNotificationEmail,

  // Bid functions - Both create and update triggers
  onBidCreated: bidFunctions.onBidCreated,
  onBidUpdated: bidFunctions.onBidUpdated,

  // Opportunity functions
  closeBidOpportunity: opportunityFunctions.closeBidOpportunity,
  autoCloseOpportunities: opportunityFunctions.autoCloseOpportunities,

  // Reminder functions
  sendBidReminders: reminderFunctions.sendBidReminders,
};
