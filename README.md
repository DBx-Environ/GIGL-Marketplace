# \# GIGL Marketplace - Biodiversity Net Gain Trading Platform

# 

# !\[GIGL Logo](public/GIGL\_Logo\_Small.png)

# 

# A sophisticated biodiversity net gain trading platform connecting conservation with commerce across Greater Lincolnshire. Built for professional environmental consultancies to bid on habitat creation and management opportunities.

# 

# \## 🌿 Features

# 

# \### \*\*Complete Bidding System\*\*

# \- \*\*Habitat-Specific Bidding\*\*: Bid on individual habitat requirements with precise pricing

# \- \*\*"No Bid" Options\*\*: Professional handling of selective bidding strategies

# \- \*\*Real-Time Updates\*\*: Live bid tracking and status updates

# \- \*\*Smart Validation\*\*: Comprehensive form validation with incremental pricing controls

# 

# \### \*\*Advanced Winner Determination\*\*

# \- \*\*Overall Winners\*\*: Complete contract awards for comprehensive bids

# \- \*\*Habitat-Specific Winners\*\*: Partial awards for specialized habitat expertise

# \- \*\*Fair Competition\*\*: Transparent winner selection based on pricing and coverage

# 

# \### \*\*Professional Email System\*\*

# \- \*\*User Notifications\*\*: Bid confirmations, updates, and withdrawal alerts

# \- \*\*Admin Notifications\*\*: Complete oversight with detailed bid tracking

# \- \*\*Winner Announcements\*\*: Professional outcome notifications for all participants

# \- \*\*Manual Close Handling\*\*: Specialized emails for different closure scenarios

# 

# \### \*\*Intelligent Dashboard\*\*

# \- \*\*Priority Sorting\*\*: Active opportunities sorted by urgency (closing date)

# \- \*\*Advanced Filtering\*\*: Filter by LPA, NCA, and bid status

# \- \*\*Bid History\*\*: Complete tracking with status indicators and timeline

# \- \*\*Responsive Design\*\*: Optimized for desktop and mobile use

# 

# \### \*\*Administrative Controls\*\*

# \- \*\*Opportunity Management\*\*: Create and manage biodiversity opportunities

# \- \*\*Manual Closure Options\*\*: Error handling, buyer withdrawal, and early close

# \- \*\*Real-Time Stats\*\*: Live dashboard with opportunity and bid metrics

# \- \*\*User Management\*\*: Complete user oversight and administration

# 

# \### \*\*Automated Systems\*\*

# \- \*\*Auto-Close Scheduling\*\*: Opportunities close automatically every 4 hours

# \- \*\*Daily Reminders\*\*: Automated email reminders for closing opportunities

# \- \*\*Email Verification\*\*: Secure user registration with email validation

# \- \*\*Data Validation\*\*: Comprehensive form and input validation

# 

# \## 🏗️ Technology Stack

# 

# \### \*\*Frontend\*\*

# \- \*\*React 19.1.0\*\* - Modern component-based UI

# \- \*\*React Router 7.6.3\*\* - Client-side routing

# \- \*\*React Hook Form 7.60.0\*\* - Advanced form handling

# \- \*\*Yup 1.6.1\*\* - Schema validation

# \- \*\*Lucide React 0.525.0\*\* - Professional icons

# \- \*\*React Toastify 11.0.5\*\* - User notifications

# 

# \### \*\*Backend \& Database\*\*

# \- \*\*Firebase 11.10.0\*\* - Complete backend platform

# \- \*\*Firestore\*\* - NoSQL document database

# \- \*\*Firebase Auth\*\* - User authentication and management

# \- \*\*Firebase Functions\*\* - Serverless backend logic

# \- \*\*Firebase Hosting\*\* - Static website hosting

# 

# \### \*\*Email System\*\*

# \- \*\*Brevo API\*\* - Professional email delivery

# \- \*\*Axios\*\* - HTTP client for API communication

# \- \*\*Custom Templates\*\* - Branded email designs

# 

# \### \*\*Development Tools\*\*

# \- \*\*ESLint\*\* - Code quality and consistency

# \- \*\*React Scripts 5.0.1\*\* - Build and development tools

# \- \*\*Node.js 20\*\* - Runtime environment

# \- \*\*Git \& GitHub\*\* - Version control and CI/CD

# 

# \## 📊 Database Structure

# 

# \### \*\*Collections\*\*

# 

# \#### \*\*Users\*\* (`users`)

# ```javascript

# {

# &nbsp; uid: "firebase\_auth\_uid",

# &nbsp; email: "user@company.com",

# &nbsp; firstName: "John",

# &nbsp; lastName: "Smith", 

# &nbsp; company: "Environmental Consultancy Ltd",

# &nbsp; emailVerified: true,

# &nbsp; isAdmin: false,

# &nbsp; createdAt: Timestamp,

# &nbsp; lastLoginAt: Timestamp

# }

# ```

# 

# \#### \*\*Opportunities\*\* (`bidOpportunities`)

# ```javascript

# {

# &nbsp; title: "Habitat Creation Project",

# &nbsp; description: "Detailed project description",

# &nbsp; lpa: "North Lincolnshire",

# &nbsp; nca: "Humberhead Levels", 

# &nbsp; location: "Geographic location",

# &nbsp; status: "active" | "closed",

# &nbsp; closingDate: Timestamp,

# &nbsp; habitatRequirements: \[{

# &nbsp;   broadHabitat: "Grassland",

# &nbsp;   specificHabitat: "Lowland meadows",

# &nbsp;   unitsRequired: 2.50

# &nbsp; }],

# &nbsp; createdAt: Timestamp,

# &nbsp; updatedAt: Timestamp

# }

# ```

# 

# \#### \*\*Bids\*\* (`bids`)

# ```javascript

# {

# &nbsp; userId: "user\_uid",

# &nbsp; opportunityId: "opportunity\_id",

# &nbsp; bidAmount: 5000,

# &nbsp; habitatBids: \[{

# &nbsp;   bidType: "bid" | "no-bid",

# &nbsp;   habitatType: "Grassland",

# &nbsp;   specificHabitat: "Lowland meadows", 

# &nbsp;   unitsRequired: 2.50,

# &nbsp;   pricePerUnit: 2000,

# &nbsp;   subtotal: 5000

# &nbsp; }],

# &nbsp; status: "active" | "withdrawn",

# &nbsp; isWinning: false,

# &nbsp; winningType: "overall" | "habitat",

# &nbsp; createdAt: Timestamp,

# &nbsp; updatedAt: Timestamp

# }

# ```

# 

# \## 🚀 Getting Started

# 

# \### \*\*Prerequisites\*\*

# \- Node.js 20 or higher

# \- Firebase CLI

# \- Git

# 

# \### \*\*Installation\*\*

# 

# 1\. \*\*Clone the repository\*\*

# &nbsp;  ```bash

# &nbsp;  git clone https://github.com/DBx-Environ/GIGL-Marketplace.git

# &nbsp;  cd GIGL-Marketplace

# &nbsp;  ```

# 

# 2\. \*\*Install dependencies\*\*

# &nbsp;  ```bash

# &nbsp;  npm install

# &nbsp;  cd functions

# &nbsp;  npm install

# &nbsp;  cd ..

# &nbsp;  ```

# 

# 3\. \*\*Environment Setup\*\*

# &nbsp;  Create `.env` file in root directory:

# &nbsp;  ```bash

# &nbsp;  REACT\_APP\_FIREBASE\_API\_KEY=your\_api\_key

# &nbsp;  REACT\_APP\_FIREBASE\_AUTH\_DOMAIN=gigl-marketplace-v3.firebaseapp.com

# &nbsp;  REACT\_APP\_FIREBASE\_PROJECT\_ID=gigl-marketplace-v3

# &nbsp;  REACT\_APP\_FIREBASE\_STORAGE\_BUCKET=gigl-marketplace-v3.firebasestorage.app

# &nbsp;  REACT\_APP\_FIREBASE\_MESSAGING\_SENDER\_ID=your\_sender\_id

# &nbsp;  REACT\_APP\_FIREBASE\_APP\_ID=your\_app\_id

# &nbsp;  REACT\_APP\_BREVO\_API\_KEY=your\_brevo\_api\_key

# &nbsp;  ```

# 

# 4\. \*\*Firebase Configuration\*\*

# &nbsp;  ```bash

# &nbsp;  firebase login

# &nbsp;  firebase use gigl-marketplace-v3

# &nbsp;  ```

# 

# \### \*\*Development\*\*

# 

# ```bash

# \# Start development server

# npm start

# 

# \# Run tests

# npm test

# 

# \# Build for production

# npm run build

# 

# \# Deploy to Firebase

# firebase deploy

# ```

# 

# \## 📁 Project Structure

# 

# ```

# GIGL-Marketplace/

# ├── public/

# │   ├── GIGL\_Logo\_Small.png

# │   └── index.html

# ├── src/

# │   ├── components/

# │   │   ├── AdminPanel.js

# │   │   ├── Dashboard.js

# │   │   ├── BidModal.js

# │   │   ├── Header.js

# │   │   ├── Footer.js

# │   │   ├── Login.js

# │   │   ├── Register.js

# │   │   └── EmailVerification.js

# │   ├── contexts/

# │   │   └── AuthContext.js

# │   ├── firebase/

# │   │   └── config.js

# │   ├── App.js

# │   └── index.js

# ├── functions/

# │   ├── modules/

# │   │   ├── bidFunctions.js

# │   │   ├── emailFunctions.js

# │   │   ├── opportunityFunctions.js

# │   │   └── reminderFunctions.js

# │   ├── index.js

# │   └── package.json

# ├── firebase.json

# ├── firestore.rules

# └── package.json

# ```

# 

# \## 🔧 Firebase Functions

# 

# \### \*\*Deployed Functions\*\*

# \- \*\*onBidCreated\*\* - Triggered when new bids are submitted

# \- \*\*onBidUpdated\*\* - Triggered when bids are modified or withdrawn  

# \- \*\*closeBidOpportunity\*\* - Manual opportunity closure by admin

# \- \*\*autoCloseOpportunities\*\* - Scheduled closure every 4 hours

# \- \*\*sendBidReminders\*\* - Daily reminder emails at 9 AM UK time

# \- \*\*sendNotificationEmail\*\* - General email sending capability

# 

# \### \*\*Function Configuration\*\*

# \- \*\*Region\*\*: europe-west2 (London)

# \- \*\*Runtime\*\*: Node.js 20

# \- \*\*Timezone\*\*: Europe/London

# \- \*\*Email Provider\*\*: Brevo API

# 

# \## 📧 Email Notifications

# 

# \### \*\*User Emails\*\*

# \- Bid confirmation and updates

# \- Winner/loser notifications

# \- Withdrawal confirmations

# \- Daily opportunity reminders

# 

# \### \*\*Admin Emails\*\*

# \- New bid notifications

# \- Bid update alerts

# \- Opportunity closure summaries

# \- Daily reminder statistics

# 

# \## 🔐 Security \& Authentication

# 

# \- \*\*Firebase Authentication\*\* with email verification

# \- \*\*Firestore Security Rules\*\* for data protection

# \- \*\*Admin Role Management\*\* for administrative functions

# \- \*\*Input Validation\*\* throughout the application

# \- \*\*HTTPS Only\*\* for all communications

# 

# \## 🌍 Deployment

# 

# \### \*\*Production URL\*\*

# https://gigl-marketplace-v3.web.app

# 

# \### \*\*Staging Environment\*\*

# Available via Firebase preview channels for testing

# 

# \### \*\*CI/CD Pipeline\*\*

# GitHub Actions automatically deploy on push to main branch

# 

# \## 📊 Key Metrics \& Analytics

# 

# \- \*\*User Registration\*\* and email verification rates

# \- \*\*Bid Submission\*\* and completion metrics  

# \- \*\*Opportunity Success\*\* rates and engagement

# \- \*\*Email Delivery\*\* and open rates

# \- \*\*System Performance\*\* and uptime monitoring

# 

# \## 🤝 Contributing

# 

# This is a private project for Greater Lincolnshire Nature Partnership. For access or contributions, contact the development team.

# 

# \## 📄 License

# 

# © 2025 Greater Lincolnshire Nature Partnership. All rights reserved.

# 

# \## 🏢 About GIGL

# 

# \*\*Green Investment in Greater Lincolnshire (GIGL)\*\* is a groundbreaking initiative connecting conservation with commerce. We facilitate biodiversity net gain trading across Greater Lincolnshire, helping developers meet their legal requirements while supporting local environmental consultancies and conservation projects.

# 

# \### \*\*Contact\*\*

# \- \*\*Support\*\*: support@gigl.co.uk

# \- \*\*Developer\*\*: david@baxterenvironmental.co.uk

# \- \*\*Partnership\*\*: Lincolnshire Wildlife Trust

# 

# ---

# 

# \*\*Built with ❤️ for biodiversity by Baxter Environmental\*\*

