# **GIGL Marketplace - Biodiversity Net Gain Trading Platform**

A sophisticated biodiversity net gain trading platform connecting conservation with commerce across Greater Lincolnshire. Built for professional environmental consultancies to bid on habitat creation and management opportunities.



v0.3 14:16 28 July 2025

## **🌿 Features**

### **Complete Bidding System**

* **Habitat-Specific Bidding**: Bid on individual habitat requirements with precise pricing
* **"No Bid" Options**: Professional handling of selective bidding strategies
* **Real-Time Updates**: Live bid tracking and status updates
* **Smart Validation**: Comprehensive form validation with incremental pricing controls

### **Advanced Winner Determination**

* **Overall Winners**: Complete contract awards for comprehensive bids
* **Habitat-Specific Winners**: Partial awards for specialized habitat expertise
* **Fair Competition**: Transparent winner selection based on pricing and coverage

### **Professional Email System**

* **User Notifications**: Bid confirmations, updates, and withdrawal alerts
* **Admin Notifications**: Complete oversight with detailed bid tracking
* **Winner Announcements**: Professional outcome notifications for all participants
* **Manual Close Handling**: Specialized emails for different closure scenarios

### **Intelligent Dashboard**

* **Priority Sorting**: Active opportunities sorted by urgency (closing date)
* **Advanced Filtering**: Filter by LPA, NCA, and bid status
* **Bid History**: Complete tracking with status indicators and timeline
* **Responsive Design**: Optimized for desktop and mobile use
* **Consistent Date Display**: Clearly shows "Closure Date" for all opportunities (using closedAt for closed, closingDate for active).

### **User Profile Panel**

* **Personal Information Management**: Users can view and edit their name, mobile number, company, and address details.
* **Read-Only Admin Data**: Displays administrative information like Registered Email, Home LPA, Home NCA, and Single Business Identifier (SBI).
* **Admin Contact Information**: Provides clear instructions on how to contact administrators for updates to controlled fields.

### **Administrative Controls**

* **Opportunity Management**: Create and manage biodiversity opportunities with enhanced filtering and table layout.
* **Manual Closure Options**: Error handling, buyer withdrawal, and early close.
* **Real-Time Stats**: Live dashboard with opportunity and bid metrics.
* **Comprehensive User Management**:

  * **User Statistics**: Overview of total users, verified users, bidding users, and admin users.
  * **Filterable User Table**: View and filter users by Home LPA, Home NCA, Verified Status, and general search.
  * **Editable User Details**: Admins can directly edit Home LPA, Home NCA, SBI, and Admin status in a tabular form.
  * **Admin Status Rules**: Prevents removal of the last admin; requires confirmation for setting new admins.
  * **View User Bids**: Dedicated modal to view an individual user's latest bids, including habitat-specific winning highlights.

### **Automated Systems**

* **Auto-Close Scheduling**: Opportunities close automatically every 4 hours
* **Daily Reminders**: Automated email reminders for closing opportunities
* **Email Verification**: Secure user registration with email validation
* **Data Validation**: Comprehensive form and input validation, including 9-digit SBI enforcement.

## **🏗️ Technology Stack**

### **Frontend**

* **React 19.1.0** - Modern component-based UI
* **React Router 7.6.3** - Client-side routing
* **React Hook Form 7.60.0** - Advanced form handling
* **Yup 1.6.1** - Schema validation
* **Lucide React 0.525.0** - Professional icons
* **React Toastify 11.0.5** - User notifications

### **Backend \& Database**

* **Firebase 11.10.0** - Complete backend platform
* **Firestore** - NoSQL document database
* **Firebase Auth** - User authentication and management
* **Firebase Functions** - Serverless backend logic
* **Firebase Hosting** - Static website hosting

### **Email System**

* **Brevo API** - Professional email delivery
* **Axios** - HTTP client for API communication
* **Custom Templates** - Branded email designs

### **Development Tools**

* **ESLint** - Code quality and consistency
* **React Scripts 5.0.1** - Build and development tools
* **Node.js 20** - Runtime environment
* **Git \& GitHub** - Version control and CI/CD

## **📊 Database Structure**

### **Collections**

#### **Users (users)**

{  
uid: "firebase\_auth\_uid",  
email: "user@company.com",  
firstName: "John",  
lastName: "Smith",  
company: "Environmental Consultancy Ltd",  
mobile: "07123456789", // New: User's mobile number  
emailVerified: true,  
isAdmin: false,  
HomeLPA: "Lincoln City", // New: User's primary Local Planning Authority  
HomeNCA: "Lincolnshire Wolds", // New: User's primary National Character Area  
SBI: "123456789", // New: Single Business Identifier (9-digit numeric)  
createdAt: Timestamp,  
lastLoginAt: Timestamp,  
updatedAt: Timestamp // Added for profile updates  
}

#### **Opportunities (bidOpportunities)**

{  
title: "Habitat Creation Project",  
description: "Detailed project description",  
lpa: "North Lincolnshire",  
nca: "Humberhead Levels",  
location: "Geographic location",  
status: "active" | "closed",  
closingDate: Timestamp,  
closedAt: Timestamp, // Explicitly mentioned for closed opportunities  
closeReason: "error" | "buyer\_withdrawal" | "early\_close" | "autoclosed" | "manual\_close", // Reason for closure  
habitatRequirements: \[{  
broadHabitat: "Grassland",  
specificHabitat: "Lowland meadows",  
unitsRequired: 2.50  
}],  
createdAt: Timestamp,  
updatedAt: Timestamp  
}

#### **Bids (bids)**

{  
userId: "user\_uid",  
opportunityId: "opportunity\_id",  
bidAmount: 5000,  
habitatBids: \[{  
bidType: "bid" | "no-bid",  
habitatType: "Grassland",  
specificHabitat: "Lowland meadows",  
unitsRequired: 2.50,  
pricePerUnit: 2000,  
subtotal: 5000  
}],  
status: "active" | "withdrawn",  
isWinning: false,  
winningType: "overall" | "habitat",  
habitatWins: { // New: Details for habitat-specific wins  
"Lowland meadows": {  
isWinner: true,  
unitsWon: 1.5,  
finalPrice: 3000  
},  
// ... other habitats  
},  
createdAt: Timestamp,  
updatedAt: Timestamp  
}

## **📁 Project Structure**

GIGL-Marketplace/  
├── public/  
│   ├── GIGL\_Logo\_Small.png  
│   └── index.html  
├── src/  
│   ├── components/  
│   │   ├── AdminPanel.js  
│   │   ├── Admin/  
│   │   │   ├── OpportunitiesTab.js  
│   │   │   ├── AnalyticsTab.js  
│   │   │   ├── SettingsTab.js  
│   │   │   ├── UserManagementTab.js // New Admin Tab  
│   │   │   └── UserBidsModal.js // New Modal for User Bids  
│   │   ├── Dashboard.js  
│   │   ├── BidModal.js  
│   │   ├── Header.js  
│   │   ├── Footer.js  
│   │   ├── Login.js  
│   │   ├── Register.js  
│   │   ├── EmailVerification.js  
│   │   └── ProfilePanel.js // New User Profile Panel  
│   ├── contexts/  
│   │   └── AuthContext.js  
│   ├── firebase/  
│   │   └── config.js  
│   ├── utils/  
│   │   └── bidHelpers.js // New: Centralized helper functions for bids/opportunities  
│   ├── App.js  
│   └── index.js  
├── functions/  
│   ├── modules/  
│   │   ├── bidFunctions.js  
│   │   ├── emailFunctions.js  
│   │   ├── opportunityFunctions.js  
│   │   └── reminderFunctions.js  
│   ├── index.js  
│   └── package.json  
├── firebase.json  
├── firestore.rules  
└── package.json

## **🔧 Firebase Functions**

### **Deployed Functions**

* **onBidCreated** - Triggered when new bids are submitted
* **onBidUpdated** - Triggered when bids are modified or withdrawn
* **closeBidOpportunity** - Manual opportunity closure by admin
* **autoCloseOpportunities** - Scheduled closure every 4 hours
* **sendBidReminders** - Daily reminder emails at 9 AM UK time
* **sendNotificationEmail** - General email sending capability

### **Function Configuration**

* **Region**: europe-west2 (London)
* **Runtime**: Node.js 20
* **Timezone**: Europe/London
* **Email Provider**: Brevo API

## **📧 Email Notifications**

### **User Emails**

* Bid confirmation and updates
* Winner/loser notifications
* Withdrawal confirmations
* Daily opportunity reminders

### **Admin Emails**

* New bid notifications
* Bid update alerts
* Opportunity closure summaries
* Daily reminder statistics

## **🔐 Security \& Authentication**

* **Firebase Authentication** with email verification
* **Firestore Security Rules** for data protection
* **Admin Role Management** for administrative functions, including last-admin protection and confirmation for new admin assignments.
* **Input Validation** throughout the application, including specific formats (e.g., 9-digit SBI).
* **HTTPS Only** for all communications

## **🌍 Deployment**

### **Production URL**

[https://gigl-marketplace-v3.web.app](https://gigl-marketplace-v3.web.app)

### **Staging Environment**

Available via Firebase preview channels for testing

### **CI/CD Pipeline**

GitHub Actions automatically deploy on push to main branch

## **📊 Key Metrics \& Analytics**

* **User Registration** and email verification rates
* **Bid Submission** and completion metrics
* **Opportunity Success** rates and engagement
* **Email Delivery** and open rates
* **System Performance** and uptime monitoring
* **User Engagement**: Tracking of active users and users who have placed bids.
* **Admin Activity**: Monitoring of administrative actions, such as user management.

## **🤝 Contributing**

This is a private project for Green Investment in Greater Lincolnshire Ltd. For access or contributions, contact the development team.

## **📄 License**

© 2025 David Baxter Environmental Ltd. All rights reserved.

## **🏢 About GIGL**

**Green Investment in Greater Lincolnshire (GIGL)** is a groundbreaking initiative connecting conservation with commerce. We facilitate biodiversity net gain trading across Greater Lincolnshire, helping developers meet their legal requirements while supporting local environmental consultancies and conservation projects.

### **Contact**

* **Support**: gigl@lincstrust.co.uk
* **Developer**: info@baxterenvironmental.co.uk
* **Partnership**: Lincolnshire Wildlife Trust

**Built with ❤️ for biodiversity by David Baxter Environmental Ltd**

