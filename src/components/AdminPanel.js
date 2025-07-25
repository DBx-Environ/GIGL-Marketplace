// src/components/AdminPanel.js - Main Container with Navigation
import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { FileText, Users, TrendingUp, Settings } from 'lucide-react';
import { toast } from 'react-toastify';

// Import modular components
import OpportunitiesTab from './admin/OpportunitiesTab';
import UserManagementTab from './admin/UserManagementTab'; // ENABLED - Already imported
// import AnalyticsTab from './admin/AnalyticsTab';
// import SettingsTab from './admin/SettingsTab';

import './AdminPanel.css';

/**
 * Main AdminPanel component with tabbed navigation
 * @returns {JSX.Element} AdminPanel component
 */
function AdminPanel() {
  const { currentUser } = useAuth();
  const [activeSection, setActiveSection] = useState('users'); // Set default to 'users' for testing
  const [opportunities, setOpportunities] = useState([]);
  const [bids, setBids] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Real-time data subscriptions
  useEffect(() => {
    if (!currentUser) return;

    console.log('AdminPanel: Setting up data subscriptions for user:', currentUser.uid);

    const unsubscribeOpportunities = onSnapshot(
      query(collection(db, 'bidOpportunities'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        console.log('Raw Firestore snapshot:', {
          empty: snapshot.empty,
          size: snapshot.size,
          docs: snapshot.docs.length,
          collection: 'bidOpportunities'
        });
        
        if (snapshot.empty) {
          console.log('AdminPanel: No documents found in bidOpportunities collection'); // Corrected line
          setOpportunities([]);
          return;
        }
        
        const opportunitiesData = snapshot.docs.map(doc => {
          const data = doc.data();
          console.log('Individual opportunity doc:', {
            id: doc.id,
            title: data.title,
            status: data.status,
            createdAt: data.createdAt,
            hasData: !!data
          });
          return {
            id: doc.id,
            ...data
          };
        });
        
        console.log('AdminPanel: Opportunities processed:', {
          count: opportunitiesData.length,
          sample: opportunitiesData[0]
        });
        setOpportunities(opportunitiesData);
        // setLoading(false); // Only set loading to false once all data is loaded
      },
      (error) => {
        console.error('Error fetching opportunities:', error); // Corrected line
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          collection: 'bidOpportunities'
        });
        toast.error('Failed to load opportunities');
        // setLoading(false);
      }
    );

    const unsubscribeBids = onSnapshot(
      query(collection(db, 'bids'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        const bidsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log('AdminPanel: Bids loaded:', bidsData.length);
        setBids(bidsData);
        // setLoading(false);
      },
      (error) => {
        console.error('Error fetching bids:', error); // Corrected line
        toast.error('Failed to load bids');
        // setLoading(false);
      }
    );

    const unsubscribeUsers = onSnapshot(
      query(collection(db, 'users'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        const usersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log('AdminPanel: Users loaded:', usersData.length);
        setUsers(usersData);
        setLoading(false); // Set loading to false here, as users is the last data set needed for this tab
      },
      (error) => {
        console.error('Error fetching users:', error); // Corrected line
        toast.error('Failed to load users');
        setLoading(false); // Ensure loading is false on error too
      }
    );

    return () => {
      unsubscribeOpportunities();
      unsubscribeBids();
      unsubscribeUsers();
    };
  }, [currentUser]);

  const tabs = [
    { 
      id: 'opportunities', 
      label: 'Opportunities', 
      icon: FileText,
      count: opportunities.length
    },
    { 
      id: 'users', 
      label: 'Users', 
      icon: Users,
      count: users.length
    },
    { 
      id: 'analytics', 
      label: 'Analytics', 
      icon: TrendingUp,
      count: null
    },
    { 
      id: 'settings', 
      label: 'Settings', 
      icon: Settings,
      count: null
    }
  ];

  const renderActiveTab = () => {
    switch (activeSection) {
      case 'opportunities':
        return (
          <OpportunitiesTab 
            opportunities={opportunities.length}
            opportunitiesData={opportunities}
            bids={bids.length}
            bidsData={bids}
            users={users.length}
            usersData={users}
            loading={loading}
          />
        );
      case 'users':
        return ( // ENABLED UserManagementTab
          <UserManagementTab
            usersData={users}
            bidsData={bids}
            opportunitiesData={opportunities}
            loading={loading}
          />
        );
      case 'analytics':
        return <div>Analytics tab temporarily disabled for debugging</div>;
      case 'settings':
        return <div>Settings tab temporarily disabled for debugging</div>;
      default:
        return <div>Section not found</div>;
    }
  };

  if (loading && opportunities.length === 0 && bids.length === 0 && users.length === 0) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner"></div>
        <p>Loading admin panel...</p>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>Admin Panel</h1>
        <p>Manage opportunities, users, and platform analytics</p>
      </div>

      <div className="admin-tabs">
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          return (
            <button
              key={tab.id}
              className={`admin-tab ${activeSection === tab.id ? 'active' : ''}`}
              onClick={() => setActiveSection(tab.id)}
            >
              <IconComponent size={20} />
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span className="tab-count">{tab.count}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="admin-content">
        {renderActiveTab()}
      </div>
    </div>
  );
}

export default AdminPanel;
