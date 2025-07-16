// src/components/Dashboard.js
import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { Eye, Edit, Plus } from 'lucide-react';
import BidModal from './BidModal';
import BidDetailsModal from './BidDetailsModal';

// Helper function to safely format dates
const formatDate = (dateValue) => {
  if (!dateValue) return 'Invalid date';
  
  let date;
  if (typeof dateValue === 'string') {
    date = new Date(dateValue);
  } else if (dateValue.toDate && typeof dateValue.toDate === 'function') {
    date = dateValue.toDate();
  } else if (dateValue instanceof Date) {
    date = dateValue;
  } else {
    return 'Invalid date';
  }
  
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }
  
  return date.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

function Dashboard() {
  const { currentUser, userData } = useAuth();
  const [userBids, setUserBids] = useState([]);
  const [bidOpportunities, setBidOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [selectedBid, setSelectedBid] = useState(null);
  const [showBidModal, setShowBidModal] = useState(false);
  const [showBidDetailsModal, setShowBidDetailsModal] = useState(false);

  useEffect(() => {
    if (!currentUser) return;

    // Subscribe to user's bids
    const bidsQuery = query(
      collection(db, 'bids'),
      where('userId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeBids = onSnapshot(bidsQuery, (snapshot) => {
      const bids = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUserBids(bids);
    });

    // Subscribe to ALL bid opportunities (not just active ones)
    const opportunitiesQuery = query(
      collection(db, 'bidOpportunities'),
      orderBy('closingDate', 'desc')
    );

    const unsubscribeOpportunities = onSnapshot(opportunitiesQuery, (snapshot) => {
      const opportunities = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBidOpportunities(opportunities);
      setLoading(false);
    });

    return () => {
      unsubscribeBids();
      unsubscribeOpportunities();
    };
  }, [currentUser]);

  const handlePlaceBid = (opportunity) => {
    setSelectedOpportunity(opportunity);
    setShowBidModal(true);
  };

  const handleViewBid = (bid) => {
    setSelectedBid(bid);
    setShowBidDetailsModal(true);
  };

  // Get latest bids to display (only most recent bid per opportunity)
  const latestUserBids = getLatestBidsPerOpportunity(userBids);

  const handleEditBid = (bid) => {
    const opportunity = bidOpportunities.find(opp => opp.id === bid.opportunityId);
    if (opportunity) {
      setSelectedOpportunity(opportunity);
      setSelectedBid(bid);
      setShowBidModal(true);
    }
  };

  const getBidStatus = (bid) => {
    const opportunity = bidOpportunities.find(opp => opp.id === bid.opportunityId);
    if (!opportunity) return 'Unknown';
    
    const now = new Date();
    const closingDate = new Date(opportunity.closingDate);
    
    if (bid.isWinning) return 'Won';
    if (opportunity.status === 'closed') return 'Lost';
    if (now > closingDate) return 'Closed';
    return 'Active';
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Won': return 'badge badge-success';
      case 'Lost': return 'badge badge-error';
      case 'Closed': return 'badge badge-gray';
      case 'Active': return 'badge badge-info';
      default: return 'badge badge-gray';
    }
  };

  const isOpportunityClosingSoon = (closingDate) => {
    const now = new Date();
    let closing;
    
    if (typeof closingDate === 'string') {
      closing = new Date(closingDate);
    } else if (closingDate.toDate && typeof closingDate.toDate === 'function') {
      closing = closingDate.toDate();
    } else {
      return false;
    }
    
    if (isNaN(closing.getTime())) return false;
    
    const timeDiff = closing - now;
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
    return daysDiff <= 2 && daysDiff > 0;
  };

  const hasUserBidOnOpportunity = (opportunityId) => {
    return userBids.some(bid => bid.opportunityId === opportunityId);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">
          Welcome, {userData?.firstName} {userData?.lastName}
        </h1>
        <p className="text-secondary">{userData?.company}</p>
      </div>

      {/* Dashboard Grid */}
      <div className="dashboard-grid">
        {/* Current Bids Section */}
        <div className="dashboard-section">
          <div className="dashboard-section-header">
            <h2 className="dashboard-section-title">Current Bids</h2>
          </div>
          <div className="dashboard-section-content">
            {latestUserBids.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📝</div>
                <div className="empty-state-title">No bids placed yet</div>
                <div className="empty-state-description">
                  Start by placing a bid on an available opportunity
                </div>
              </div>
            ) : (
              <div>
                {latestUserBids.map((bid) => {
                  const opportunity = bidOpportunities.find(opp => opp.id === bid.opportunityId);
                  const status = getBidStatus(bid);
                  
                  return (
                    <div key={bid.id} className="bid-item">
                      <div className="bid-header">
                        <div>
                          <div className="bid-title">
                            {opportunity?.title || 'Unknown Opportunity'}
                          </div>
                          <div className="bid-amount">
                            Bid Amount: <span className="font-semibold">£{bid.bidAmount?.toLocaleString()}</span>
                          </div>
                        </div>
                        <span className={getStatusBadgeClass(status)}>
                          {status}
                        </span>
                      </div>
                      
                      <div className="bid-footer">
                        <div className="bid-date">
                          Placed: {formatDate(bid.createdAt)}
                        </div>
                        <div className="bid-actions">
                          <button
                            onClick={() => handleViewBid(bid)}
                            className="action-btn action-btn-primary"
                            title="View Details"
                          >
                            <Eye size={16} />
                          </button>
                          {status === 'Active' && (
                            <button
                              onClick={() => handleEditBid(bid)}
                              className="action-btn action-btn-success"
                              title="Edit Bid"
                            >
                              <Edit size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Bid Opportunities Section */}
        <div className="dashboard-section">
          <div className="dashboard-section-header">
            <h2 className="dashboard-section-title">Bid Opportunities</h2>
          </div>
          <div className="dashboard-section-content">
            {bidOpportunities.filter(opp => opp.status === 'active').length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🎯</div>
                <div className="empty-state-title">No opportunities available</div>
                <div className="empty-state-description">
                  Check back later for new bidding opportunities
                </div>
              </div>
            ) : (
              <div>
                {bidOpportunities
                  .filter(opp => opp.status === 'active')
                  .map((opportunity) => {
                  const hasUserBid = hasUserBidOnOpportunity(opportunity.id);
                  const isClosingSoon = isOpportunityClosingSoon(opportunity.closingDate);
                  const isPastClosing = new Date() > new Date(opportunity.closingDate);
                  
                  return (
                    <div key={opportunity.id} className="bid-item">
                      <div className="bid-header">
                        <div>
                          <div className="bid-title">{opportunity.title}</div>
                          <div className="text-sm text-secondary">
                            <div>LPA: {opportunity.lpa} • NCA: {opportunity.nca}</div>
                            <div>Type: {opportunity.bngUnitType} • Units: {opportunity.unitsRequired}</div>
                          </div>
                        </div>
                        {isClosingSoon && (
                          <span className="badge badge-warning">
                            Closing Soon
                          </span>
                        )}
                      </div>
                      
                      <div className="bid-footer">
                        <div className="bid-date">
                          Closes: {formatDate(opportunity.closingDate)}
                        </div>
                        <div className="bid-actions">
                          {!isPastClosing && (
                            <button
                              onClick={() => handlePlaceBid(opportunity)}
                              className={`btn btn-sm ${hasUserBid ? 'btn-outline' : 'btn-primary'}`}
                            >
                              <Plus size={14} />
                              {hasUserBid ? 'Update Bid' : 'Place Bid'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showBidModal && (
        <BidModal
          opportunity={selectedOpportunity}
          existingBid={selectedBid}
          onClose={() => {
            setShowBidModal(false);
            setSelectedOpportunity(null);
            setSelectedBid(null);
          }}
        />
      )}

      {showBidDetailsModal && (
        <BidDetailsModal
          bid={selectedBid}
          opportunity={bidOpportunities.find(opp => opp.id === selectedBid?.opportunityId)}
          onClose={() => {
            setShowBidDetailsModal(false);
            setSelectedBid(null);
          }}
        />
      )}
    </div>
  );
}

export default Dashboard;