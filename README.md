# **GIGL Marketplace \- Biodiversity Net Gain Trading Platform**

A sophisticated biodiversity net gain trading platform connecting conservation with commerce across Greater Lincolnshire. Built for professional environmental consultancies to bid on habitat creation and management opportunities.

## **🌿 Features**

### **Complete Bidding System**

* **Habitat-Specific Bidding**: Bid on individual habitat requirements with precise pricing  
* **"No Bid" Options**: Professional handling of selective bidding strategies  
* **Real-Time Updates**: Live bid tracking and status updates  
* **Smart Validation**: Comprehensive form validation with incremental pricing controls

**New: Location-Based Winner Determination**

The winner determination process now incorporates a sophisticated location-based adjustment to favor bids from users geographically closer to an opportunity. This impacts both the units a bidder must supply and the effective price from the buyer's perspective.

**Location Classification:** Each user's bid is classified relative to the opportunity's location (LPA, NCA, WFD) based on their profile's HomeLPA, HomeNCA, and HomeWFD fields.

* **"Within":** If there's a direct match between the user's home location (LPA or NCA for non-watercourse habitats, WFD for watercourse habitats) and the opportunity's location.  
* **"Neighbour":** For non-watercourse habitats, if the user's home LPA or NCA is a direct neighbour to the opportunity's LPA or NCA (based on LPA\_NCA\_Neigbours\_Lookup.xlsx). **There is no "neighbour" option for watercourse habitats.**  
* **"Outside":** If there's no "within" or "neighbour" match.

**Impact on Units Required (Bidder's Perspective):** The quantity of units a bidder must supply to meet the opportunity's base requirement is adjusted based on their location classification:

* **"Within":** Bidder supplies 1x the base units.  
* **"Neighbour":** Bidder supplies 1.3333 times the base units.  
* "Outside": Bidder supplies 2 times the base units.  
  Example: If an opportunity requires 10 units, an "Outside" bidder must commit to supplying 20 units.

**Impact on Price (Buyer's Perspective \- for Winner Determination):** To ensure fair competition, the system calculates an "Effective Price Per Unit for Buyer." This is the price that is actually compared during winner determination, reflecting the true cost to the buyer for the required biodiversity net gain.

* **"Within":** Buyer's effective price is 1x the bidder's stated price per unit.  
* **"Neighbour":** Buyer's comparable price per unit for a locally sourced supply is 1.3333 times the bidder's stated price per unit.  
* "Outside": Buyer's comparable  price per unit for a locally sourced supply is 2 times the bidder's stated price per unit.  
  Example: If an "Within" bidder offers £20,000/unit, a "Neighbour" bidder would need to offer \<£15,000/unit (75% of £20k) to be competitive, and an "Outside" bidder \<£10,000/unit (50% of £20k).  
  Note: The user interface now displays "Your unit price in comparison to a local supplier" which is calculated as your subtotal charge divided by the base units required by the opportunity, providing a clear comparison.

### **Professional Email System**

* **User Notifications**: Bid confirmations, updates, and withdrawal alerts (now include location classification, adjusted units to supply, and buyer's effective price).  
* **Admin Notifications**: Complete oversight with detailed bid tracking (now include location-adjusted details).  
* **Winner Announcements**: Professional outcome notifications for all participants.  
* **Manual Close Handling**: Specialized emails for different closure scenarios.

### **Intelligent Dashboard**

* **Personalized Welcome**: Welcome banner now dynamically displays **Home LPA, Home NCA, and Home WFD Catchment** for the logged-in user, replacing the generic company name, with improved green and white styling for readability.  
* **Streamlined Bid Display**: "Current Bids" column now presents a more compact overview. Detailed bid information, including habitat-specific breakdowns and effective costs, is now accessible via a dedicated **Bid Details Modal** opened by clicking a "Details" button on each bid card.  
* **Enhanced Bid Sorting**: Active opportunities sorted by urgency (closing date). User's "Current Bids" are now intelligently sorted: **Active bids appear first (by ascending closure date), followed by all other bid statuses (sorted by descending closure date)** for better visibility of recently resolved bids.  
* **Advanced Filtering**: Filter by LPA, NCA, and **WFD Operational Catchment**, and bid status  
* **Bid History**: Complete tracking with status indicators and timeline (now showing location-adjusted details).  
* **Responsive Design**: Optimized for desktop and mobile use  
* **Consistent Date Display**: Clearly shows "Closure Date" for all opportunities (using closedAt for closed, closingDate for active).

### **User Profile Panel**

* **Personal Information Management**: Users can view and edit their name, mobile number, company, and address details.  
* **Read-Only Admin Data**: Displays administrative information like Registered Email, Home WFD Operational Catchment, Home LPA, Home NCA, and Single Business Identifier (SBI).  
* **Admin Contact Information**: Provides clear instructions on how to contact administrators for updates to controlled fields.

### **Administrative Controls**

* **Opportunity Management**: Create and manage biodiversity opportunities with enhanced filtering and table layout, including **WFD Operational Catchment** field and filter.  
* **Manual Closure Options**: Error handling, buyer withdrawal, and early close.  
* **Real-Time Stats**: Live dashboard with opportunity and bid metrics.  
* **Comprehensive User Management**:  
  * **User Statistics**: Overview of total users, verified users, bidding users, and admin users.  
  * **Filterable User Table**: View and filter users by Home LPA, Home NCA, **Home WFD Operational Catchment**, Verified Status, and general search.  
  * **Editable User Details**: Admins can directly edit Home LPA, Home NCA, **Home WFD Operational Catchment**, SBI, and Admin status in a tabular form.  
  * **Admin Status Rules**: Prevents removal of the last admin; requires confirmation for setting new admins.  
  * **View User Bids**: Dedicated modal to view an individual user's latest bids, including habitat-specific winning highlights and location-adjusted details.

### **Automated Systems**

* **Auto-Close Scheduling**: Opportunities close automatically every 4 hours  
* **Daily Reminders**: Automated email reminders for closing opportunities  
* **Email Verification**: Secure user registration with email validation  
* **Data Validation**: Comprehensive form and input validation, including 9-digit SBI enforcement.

## **🏗️ Technology Stack**

### **Frontend**

* **React 19.1.0** \- Modern component-based UI  
* **React Router 7.6.3** \- Client-side routing  
* **React Hook Form 7.60.0** \- Advanced form handling  
* **Yup 1.6.1** \- Schema validation  
* **Lucide React 0.525.0** \- Professional icons  
* **React Toastify 11.0.5** \- User notifications

### **Backend & Database**

* **Firebase 11.10.0** \- Complete backend platform  
* **Firestore** \- NoSQL document database  
* **Firebase Auth** \- User authentication and management  
* **Firebase Functions** \- Serverless backend logic  
* **Firebase Hosting** \- Static website hosting

### **Email System**

* **Brevo API** \- Professional email delivery  
* **Axios** \- HTTP client for API communication  
* **Custom Templates** \- Branded email designs

### **Development Tools**

* **ESLint** \- Code quality and consistency  
* **React Scripts 5.0.1** \- Build and development tools  
* **Node.js 20** \- Runtime environment  
* **Git & GitHub** \- Version control and CI/CD

## **📊 Database Structure**

### **Collections**

#### **Users (users)**

{  
"uid": "firebase\_auth\_uid",  
"email": "user@company.com",  
"firstName": "John",  
"lastName": "Smith",  
"company": "Environmental Consultancy Ltd",  
"mobile": "07123456789",  
"emailVerified": true,  
"isAdmin": false,  
"HomeLPA": "Lincoln City",  
"HomeNCA": "Lincolnshire Wolds",  
"HomeWFD": "River Witham",  
"SBI": "123456789",  
"createdAt": "Timestamp",  
"lastLoginAt": "Timestamp",  
"updatedAt": "Timestamp"  
}

#### **Opportunities (bidOpportunities)**

{  
"title": "Habitat Creation Project",  
"description": "Detailed project description",  
"lpa": "North Lincolnshire",  
"nca": "Humberhead Levels",  
"wfd": "Lower Don",  
"location": "Geographic location",  
"status": "active" | "closed",  
"closingDate": "Timestamp",  
"closedAt": "Timestamp",  
"closeReason": "error" | "buyer\_withdrawal" | "early\_close" | "autoclosed" | "manual\_close",  
"habitatRequirements": \[{  
"broadHabitat": "Grassland",  
"specificHabitat": "Lowland meadows",  
"unitsRequired": 2.50  
}\],  
"createdAt": "Timestamp",  
"updatedAt": "Timestamp"  
}

#### **Bids (bids)**

{  
"userId": "user\_uid",  
"opportunityId": "opportunity\_id",  
"bidAmount": 5000,  
"habitatBids": \[{  
"bidType": "bid" | "no-bid",  
"habitatType": "Grassland",  
"specificHabitat": "Lowland meadows",  
"unitsRequired": 2.50,  
"pricePerUnit": 2000,  
"subtotal": 5000,  
"locationClassification": "within" | "neighbour" | "outside", // NEW: User's location relative to opportunity  
"baseUnitsRequired": 2.50, // NEW: Original units required by opportunity  
"adjustedUnitsToSupply": 2.50, // NEW: Units bidder must supply after location adjustment  
"effectivePricePerUnitForBuyer": 2000 // NEW: Price per unit from buyer's perspective after location adjustment  
}\],  
"status": "active" | "withdrawn",  
"isWinning": false,  
"winningType": "overall" | "habitat",  
"habitatWins": { // Details for habitat-specific wins  
"Lowland meadows": {  
"isWinner": true,  
"unitsWon": 1.5,  
"finalPrice": 3000,  
"baseUnitsRequired": 2.50, // NEW: Original units for this habitat  
"adjustedUnitsToSupply": 2.50, // NEW: Units bidder supplied for this habitat  
"bidderPricePerUnit": 2000, // NEW: Bidder's original price for this habitat  
"effectivePricePerUnitForBuyer": 2000 // NEW: Buyer's effective price for this habitat  
}  
},  
"createdAt": "Timestamp",  
"updatedAt": "Timestamp"  
}

## **📁 Project Structure**

GIGL-Marketplace/

├── public/

│ ├── GIGL\_Logo\_Small.png

│ └── index.html

├── src/

│ ├── components/

│ │ ├── AdminPanel.js

│ │ ├── Admin/

│ │ │ ├── OpportunitiesTab.js

│ │ │ ├── AnalyticsTab.js

│ │ │ ├── SettingsTab.js

│ │ │ ├── UserManagementTab.js

│ │ │ └── UserBidsModal.js

│ │ ├── Dashboard.js

│ │ ├── BidModal.js

│ │ ├── BidDetailsModal.js // NEW: Component to display detailed bid information  
│ │ ├── Header.js  
│ │ ├── Footer.js

│ │ ├── Login.js

│ │ ├── Register.js

│ │ ├── EmailVerification.js

│ │ └── ProfilePanel.js

│ ├── contexts/

│ │ └── AuthContext.js

│ ├── firebase/

│ │ └── config.js

│ ├── utils/

│ │ ├── bidHelpers.js

│ │ ├── locationHelpers.js // NEW: Logic for location classification and bid adjustments

│ │ └── wfdOptions.js

│ ├── App.js

│ └── index.js

├── functions/

│ ├── modules/

│ │ ├── bidFunctions.js

│ │ ├── emailFunctions.js

│ │ ├── opportunityFunctions.js

│ │ └── reminderFunctions.js

│ ├── index.js

│ └── package.json

├── firebase.json

├── firestore.rules

└── package.json

## **🔧 Firebase Functions**

### **Deployed Functions**

* **onBidCreated** \- Triggered when new bids are submitted (now processes location-based adjustments).  
* **onBidUpdated** \- Triggered when bids are modified or withdrawn (now processes location-based adjustments).  
* **closeBidOpportunity** \- Manual opportunity closure by admin.  
* **autoCloseOpportunities** \- Scheduled closure every 4 hours.  
* **sendBidReminders** \- Daily reminder emails at 9 AM UK time.  
* **sendNotificationEmail** \- General email sending capability.

### **Function Configuration**

* **Region**: europe-west2 (London)  
* **Runtime**: Node.js 20  
* **Timezone**: Europe/London  
* **Email Provider**: Brevo API

## **📧 Email Notifications**

### **User Emails**

* Bid confirmation and updates (now include location classification, adjusted units to supply, and buyer's effective price).  
* Winner/loser notifications.  
* Withdrawal confirmations.  
* Daily opportunity reminders.

### **Admin Emails**

* New bid notifications (now include detailed location-adjusted bid breakdown).  
* Bid update alerts (now include detailed location-adjusted bid breakdown).  
* Opportunity closure summaries (now include overall and habitat winner details with effective prices).  
* Daily reminder statistics.

## **🔐 Security & Authentication**

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

## **📊 Key Metrics & Analytics**

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