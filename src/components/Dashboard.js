// src/components/Dashboard.js - Cleaned Version (Debug Logs Removed)
import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { Edit, Plus, Filter, X, Eye } from 'lucide-react'; // Added Eye icon for view details
import { toast } from 'react-toastify'; // Import toast
import './Dashboard.css';
import BidModal from './BidModal';
import BidDetailsModal from './BidDetailsModal'; // Import the new BidDetailsModal
// Import helper functions and options from the new utility file
import {
  formatDate,
  formatDateTime,
  getBidStatus,
  getLatestBidsPerOpportunity,
  isOpportunityClosingSoon,
  isOpportunityActiveAndOpen,
  formatHabitatRequirementsCondensed,
  LPA_OPTIONS,
  NCA_OPTIONS
} from '../utils/bidHelpers';
import { WFD_OPTIONS } from '../utils/wfdOptions'; // Import WFD_OPTIONS from utility file

// Import location helper for display purposes in bid cards
import { getLocationClassification } from '../utils/locationHelpers';

const BID_STATUS_OPTIONS = [
  "Active", "Overall Winner", "Won 1 Habitat", "Won", "Not Selected", "Withdrawn", "Expired"
];

function Dashboard() {
  const { currentUser, userData } = useAuth();
  const [userBids, setUserBids] = useState([]);
  const [bidOpportunities, setBidOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [selectedBid, setSelectedBid] = useState(null);
  const [showBidModal, setShowBidModal] = useState(false);
  const [showBidDetailsModal, setShowBidDetailsModal] = useState(false); // State for BidDetailsModal
  const [selectedBidForDetails, setSelectedBidForDetails] = useState(null); // State for selected bid in details modal

  // Filter states
  const [showOpportunityFilters, setShowOpportunityFilters] = useState(false);
  const [showBidFilters, setShowBidFilters] = useState(false);
  const [opportunityFilters, setOpportunityFilters] = useState({
    lpa: '',
    nca: '',
    wfd: '' // New WFD filter state
  });
  const [bidFilters, setBidFilters] = useState({
    status: ''
  });

  useEffect(() => {
    if (!currentUser) return;

    // Subscribe to user's bids
    const bidsQuery = query(
      collection(db, 'bids'),
      where('userId', '==', currentUser.uid)
    );

    const unsubscribeBids = onSnapshot(bidsQuery, (snapshot) => {
      const bids = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUserBids(bids);
    });

    // Subscribe to ALL bid opportunities
    const opportunitiesQuery = query(
      collection(db, 'bidOpportunities')
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

  // Handle new bids from opportunities table
  const handlePlaceBid = (opportunity) => {
    // Check if user has any ACTIVE (non-withdrawn) bid on this opportunity
    const existingActiveBid = userBids.find(bid =>
      bid.opportunityId === opportunity.id && bid.status !== 'withdrawn'
    );

    if (existingActiveBid) {
      // User already has an active bid - do nothing
      return;
    }

    // New bid (or re-bid after withdrawal)
    setSelectedOpportunity(opportunity);
    setSelectedBid(null); // Important: null for new bids
    setShowBidModal(true);
  };

  // Edit bid with proper existing bid data
  const handleEditBid = (bid) => {
    // Find the opportunity for this bid
    const opportunity = bidOpportunities.find(opp => opp.id === bid.opportunityId);
    if (!opportunity) {
      console.error('Opportunity not found for bid:', bid.id);
      return;
    }

    // Check if opportunity is closed
    if (opportunity.status === 'closed') {
      return;
    }

    // Check if opportunity has passed closing date
    const now = new Date();
    let closingDate;

    if (typeof opportunity.closingDate === 'string') {
      closingDate = new Date(opportunity.closingDate);
    } else if (opportunity.closingDate.toDate && typeof opportunity.closingDate.toDate === 'function') {
      closingDate = opportunity.closingDate.toDate();
    } else {
      closingDate = new Date(opportunity.closingDate);
    }

    if (now > closingDate) {
      return;
    }

    // All checks passed - allow editing with existing bid data
    setSelectedOpportunity(opportunity);
    setSelectedBid(bid); // Important: pass the existing bid for updates
    setShowBidModal(true);
  };

  // Handle viewing bid details
  const handleViewBidDetails = (bid) => {
    const opportunity = bidOpportunities.find(opp => opp.id === bid.opportunityId);
    if (!opportunity) {
      console.error('Opportunity not found for bid details:', bid.id);
      toast.error('Could not load opportunity details for this bid.');
      return;
    }
    setSelectedBidForDetails(bid);
    setSelectedOpportunity(opportunity); // Also set opportunity for the details modal
    setShowBidDetailsModal(true);
  };

  // FIXED: Check for ACTIVE (non-withdrawn) bids only
  const hasUserBidOnOpportunity = (opportunityId) => {
    return userBids.some(bid =>
      bid.opportunityId === opportunityId && bid.status !== 'withdrawn'
    );
  };

  // Filter functions
  const getFilteredOpportunities = () => {
    let filtered = bidOpportunities.filter(opportunity =>
      isOpportunityActiveAndOpen(opportunity)
    );

    // Apply LPA filter
    if (opportunityFilters.lpa) {
      filtered = filtered.filter(opp => opp.lpa === opportunityFilters.lpa);
    }

    // Apply NCA filter
    if (opportunityFilters.nca) {
      filtered = filtered.filter(opp => opp.nca === opportunityFilters.nca);
    }

    // Apply WFD filter
    if (opportunityFilters.wfd) { // New WFD filter logic
      filtered = filtered.filter(opp => opp.wfd === opportunityFilters.wfd);
    }

    // Sort by closing date (soonest first)
    return filtered.sort((a, b) => {
      const dateA = typeof a.closingDate === 'string' ? new Date(a.closingDate) : a.closingDate.toDate();
      const dateB = typeof b.closingDate === 'string' ? new Date(b.closingDate) : b.closingDate.toDate();
      return dateA - dateB;
    });
  };

  const getFilteredBids = () => {
    // Use the corrected function that properly handles withdrawn bids
    const latestBids = getLatestBidsPerOpportunity(userBids);

    let filtered = latestBids;

    // Apply status filter
    if (bidFilters.status) {
      filtered = filtered.filter(bid => {
        const status = getBidStatus(bid, bidOpportunities); // Pass opportunitiesData
        // Handle different status variations
        if (bidFilters.status === 'Won' && (status === 'Won' || status === 'Overall Winner' || status.includes('Won'))) {
          return true;
        }
        return status === bidFilters.status;
      });
    }

    // Sort bids with smart priority
    return filtered.sort((a, b) => {
      const oppA = bidOpportunities.find(opp => opp.id === a.opportunityId);
      const oppB = bidOpportunities.find(opp => opp.id === b.opportunityId);
      const statusA = getBidStatus(a, bidOpportunities); // Pass opportunitiesData
      const statusB = getBidStatus(b, bidOpportunities); // Pass opportunitiesData

      const getSortableDate = (opportunity, status) => {
        if (!opportunity) return new Date(0); // Very old date for bids without opportunity

        if (status === 'Active') {
          // For active bids, use closingDate for ascending sort
          return typeof opportunity.closingDate === 'string'
            ? new Date(opportunity.closingDate)
            : opportunity.closingDate.toDate();
        } else {
          // For other statuses, use closedAt or closingDate for descending sort
          const date = (opportunity.status === 'closed' && opportunity.closedAt)
            ? (typeof opportunity.closedAt === 'string' ? new Date(opportunity.closedAt) : opportunity.closedAt.toDate())
            : (typeof opportunity.closingDate === 'string' ? new Date(opportunity.closingDate) : opportunity.closingDate.toDate());
          return date;
        }
      };

      const dateA = getSortableDate(oppA, statusA);
      const dateB = getSortableDate(oppB, statusB);

      // Primary sort: Active bids first
      if (statusA === 'Active' && statusB !== 'Active') {
        return -1; // A (Active) comes before B (Non-Active)
      }
      if (statusA !== 'Active' && statusB === 'Active') {
        return 1; // B (Active) comes before A (Non-Active)
      }

      // Secondary sort:
      if (statusA === 'Active' && statusB === 'Active') {
        return dateA.getTime() - dateB.getTime(); // Active bids: ascending closure date
      } else {
        return dateB.getTime() - dateA.getTime(); // Other bids: descending closure date
      }
    });
  };

  // Clear filter functions
  const clearOpportunityFilters = () => {
    setOpportunityFilters({ lpa: '', nca: '', wfd: '' }); // Clear WFD filter
  };

  const clearBidFilters = () => {
    setBidFilters({ status: '' });
  };

  const hasActiveOpportunityFilters = opportunityFilters.lpa || opportunityFilters.nca || opportunityFilters.wfd; // Updated to include WFD
  const hasActiveBidFilters = bidFilters.status;

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header"> {/* CSS handles color and width */}
        <h1 className="dashboard-title" style={{ margin: '0 0 10px 0', fontSize: '2.5rem', fontWeight: 'bold' }}>
          Welcome, {userData?.firstName} {userData?.lastName}
        </h1>
        {/* Replaced Company Name with Home LPA, Home NCA, Home WFD Catchment, centered and white text */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', fontSize: '1.1em', color: 'white' }}>
          {userData?.HomeLPA && (
            <span>
              <strong style={{ color: 'white' }}>Home LPA:</strong> {userData.HomeLPA}
            </span>
          )}
          {userData?.HomeNCA && (
            <span>
              <strong style={{ color: 'white' }}>Home NCA:</strong> {userData.HomeNCA}
            </span>
          )}
          {userData?.HomeWFD && (
            <span>
              <strong style={{ color: 'white' }}>Home WFD Catchment:</strong> {userData.HomeWFD}
            </span>
          )}
        </div>
      </div>

      <div className="dashboard-grid"> {/* CSS handles width and centering */}
        {/* Current Bids Column */}
        <div className="dashboard-column">
          <div className="column-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h2 className="column-title" style={{ margin: 0 }}>Current Bids</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {hasActiveBidFilters && (
                  <span style={{
                    fontSize: '12px',
                    color: '#2563eb',
                    backgroundColor: '#dbeafe',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontWeight: '500'
                  }}>
                    Filtered
                  </span>
                )}
                <button
                  onClick={() => setShowBidFilters(!showBidFilters)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 10px',
                    fontSize: '13px',
                    fontWeight: '500',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    backgroundColor: showBidFilters ? '#f3f4f6' : 'white',
                    color: '#374151',
                    cursor: 'pointer'
                  }}
                >
                  <Filter size={14} />
                  Filter
                </button>
              </div>
            </div>
            {/* New subheading for Current Bids */}
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '0' }}>
              Active bids followed by other bids in descending order of closure
              {hasActiveBidFilters && (
                <span style={{ color: '#2563eb', fontWeight: '500' }}>
                  {' '}• Showing filtered results
                </span>
              )}
            </p>
          </div>

          {/* Bid Filters */}
          {showBidFilters && (
            <div style={{
              padding: '16px',
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', minWidth: '50px' }}>
                  Status:
                </label>
                <select
                  value={bidFilters.status}
                  onChange={(e) => setBidFilters({ ...bidFilters, status: e.target.value })}
                  style={{
                    padding: '4px 8px',
                    fontSize: '13px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="">All Statuses</option>
                  {BID_STATUS_OPTIONS.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
                {hasActiveBidFilters && (
                  <button
                    onClick={clearBidFilters}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 8px',
                      fontSize: '12px',
                      backgroundColor: '#fee2e2',
                      color: '#dc2626',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    <X size={12} />
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="column-content">
            {getFilteredBids().length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-text">
                  {hasActiveBidFilters ? 'No bids match your filters' : 'No bids placed yet'}
                </div>
                <div className="empty-state-subtext">
                  {hasActiveBidFilters ? 'Try adjusting your filters' : 'Start by placing a bid on an available opportunity'}
                </div>
              </div>
            ) : (
              <div>
                {getFilteredBids().map((bid) => {
                  const opportunity = bidOpportunities.find(opp => opp.id === bid.opportunityId);
                  const status = getBidStatus(bid, bidOpportunities); // Pass opportunitiesData

                  return (
                    <div
                      key={bid.id}
                      className={`bid-card status-${status.toLowerCase().replace(/\s+/g, '-')}`}
                      style={{ opacity: status === 'Withdrawn' ? 0.6 : 1 }}
                    >
                      <div className="bid-card-header">
                        <div style={{ flex: 1 }}>
                          <h3 style={{ fontWeight: '600', color: '#111827', marginBottom: '4px', fontSize: '15px' }}>
                            {opportunity?.title || 'Unknown Opportunity'}
                          </h3>
                          <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>
                            {opportunity?.lpa && opportunity?.nca && (
                              <span>{opportunity.lpa} • {opportunity.nca}</span>
                            )}
                            {opportunity?.wfd && (
                              <span style={{ marginLeft: '16px' }}>• WFD: {opportunity.wfd}</span>
                            )}
                          </div>
                        </div>
                        <span className={`status-badge status-${status.toLowerCase().replace(/\s+/g, '-')}`}
                              style={{ fontSize: '11px', padding: '3px 8px' }}>
                          {status}
                        </span>
                      </div>

                      {/* Removed condensed habitat bids display from here */}
                      {/* Added a button to view details in a modal */}
                      <div className="bid-card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid #eee' }}>
                        <div style={{ fontSize: '12px', flex: 1 }}>
                          {opportunity &&
                            <span>Closure Date: {formatDateTime(opportunity.status === 'closed' && opportunity.closedAt ? opportunity.closedAt : opportunity.closingDate)}</span>
                          }
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {status === 'Active' && (
                            <button
                              onClick={() => handleEditBid(bid)}
                              className="bid-action-button edit"
                              title="Edit Bid"
                              style={{ padding: '6px 8px', fontSize: '12px' }}
                            >
                              <Edit size={14} />
                              <span style={{ marginLeft: '4px' }}>Edit</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleViewBidDetails(bid)}
                            className="bid-action-button view"
                            title="View Bid Details"
                            style={{ padding: '6px 8px', fontSize: '12px', backgroundColor: '#e0f7fa', color: '#007bff', border: '1px solid #00bcd4' }}
                          >
                            <Eye size={14} />
                            <span style={{ marginLeft: '4px' }}>Details</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Active Bid Opportunities Column */}
        <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', border: '1px solid #e5e7eb' }}>
          <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', margin: 0 }}>Active Bid Opportunities</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {hasActiveOpportunityFilters && (
                  <span style={{
                    fontSize: '12px',
                    color: '#2563eb',
                    backgroundColor: '#dbeafe',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontWeight: '500'
                  }}>
                    Filtered
                  </span>
                )}
                <button
                  onClick={() => setShowOpportunityFilters(!showOpportunityFilters)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 10px',
                    fontSize: '13px',
                    fontWeight: '500',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    backgroundColor: showOpportunityFilters ? '#f3f4f6' : 'white',
                    color: '#374151',
                    cursor: 'pointer'
                  }}
                >
                  <Filter size={14} />
                  Filter
                </button>
              </div>
            </div>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '0' }}>
              Sorted by closing date - most urgent first
              {hasActiveOpportunityFilters && (
                <span style={{ color: '#2563eb', fontWeight: '500' }}>
                  {' '}• Showing filtered results
                </span>
              )}
            </p>
          </div>

          {/* Opportunity Filters */}
          {showOpportunityFilters && (
            <div style={{
              padding: '16px',
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', minWidth: '35px' }}>
                    LPA:
                  </label>
                  <select
                    value={opportunityFilters.lpa}
                    onChange={(e) => setOpportunityFilters({ ...opportunityFilters, lpa: e.target.value })}
                    style={{
                      padding: '4px 8px',
                      fontSize: '13px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      backgroundColor: 'white',
                      minWidth: '150px'
                    }}
                  >
                    <option value="">All LPAs</option>
                    {LPA_OPTIONS.map(lpa => (
                      <option key={lpa} value={lpa}>{lpa}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', minWidth: '35px' }}>
                    NCA:
                  </label>
                  <select
                    value={opportunityFilters.nca}
                    onChange={(e) => setOpportunityFilters({ ...opportunityFilters, nca: e.target.value })}
                    style={{
                      padding: '4px 8px',
                      fontSize: '13px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      backgroundColor: 'white',
                      minWidth: '200px'
                    }}
                  >
                    <option value="">All NCAs</option>
                    {NCA_OPTIONS.map(nca => (
                      <option key={nca} value={nca}>{nca}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', minWidth: '35px' }}>
                    WFD:
                  </label>
                  <select
                    value={opportunityFilters.wfd}
                    onChange={(e) => setOpportunityFilters({ ...opportunityFilters, wfd: e.target.value })}
                    style={{
                      padding: '4px 8px',
                      fontSize: '13px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      backgroundColor: 'white',
                      minWidth: '200px'
                    }}
                  >
                    <option value="">All WFD Op Catchments</option>
                    {WFD_OPTIONS.map(wfd => (
                      <option key={wfd} value={wfd}>{wfd}</option>
                    ))}
                  </select>
                </div>

                {hasActiveOpportunityFilters && (
                  <button
                    onClick={clearOpportunityFilters}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 8px',
                      fontSize: '12px',
                      backgroundColor: '#fee2e2',
                      color: '#dc2626',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    <X size={12} />
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
          )}

          <div style={{ padding: '24px' }}>
            {(() => {
              const filteredOpportunities = getFilteredOpportunities();

              if (filteredOpportunities.length === 0) {
                return (
                  <p style={{ color: '#6b7280', textAlign: 'center', padding: '32px 0' }}>
                    {hasActiveOpportunityFilters
                      ? 'No opportunities match your current filters'
                      : 'No active opportunities available'
                    }
                  </p>
                );
              }

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {filteredOpportunities.map((opportunity) => {
                    const hasUserBid = hasUserBidOnOpportunity(opportunity.id);
                    const isClosingSoon = isOpportunityClosingSoon(opportunity.closingDate);

                    return (
                      <div key={opportunity.id} style={{
                        border: isClosingSoon ? '2px solid #f59e0b' : '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '16px',
                        backgroundColor: isClosingSoon ? '#fffbeb' : '#fafafa'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <div style={{ flex: 1 }}>
                            <h3 style={{ fontWeight: '600', color: '#111827', marginBottom: '4px', fontSize: '15px' }}>
                              {opportunity.title}
                            </h3>
                            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>
                              <span style={{ marginRight: '16px' }}><strong>LPA:</strong> {opportunity.lpa}</span>
                              <span><strong>NCA:</strong> {opportunity.nca}</span>
                              {opportunity.wfd && <span style={{ marginLeft: '16px' }}><strong>WFD:</strong> {opportunity.wfd}</span>} {/* Display WFD */}
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                            {isClosingSoon && (
                              <span style={{
                                color: '#92400e',
                                backgroundColor: '#fef3c7',
                                padding: '3px 8px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: '600'
                              }}>
                                CLOSING SOON
                              </span>
                            )}
                            {hasUserBid && (
                              <span style={{
                                color: '#166534',
                                backgroundColor: '#dcfce7',
                                padding: '3px 8px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: '500'
                              }}>
                                YOU BID
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Condensed Habitat Requirements */}
                        <div style={{
                          fontSize: '13px',
                          color: '#374151',
                          backgroundColor: '#f1f5f9',
                          padding: '8px',
                          borderRadius: '4px',
                          marginBottom: '8px',
                          lineHeight: '1.4'
                        }}>
                          <strong>Habitats:</strong> {formatHabitatRequirementsCondensed(opportunity.habitatRequirements)}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontSize: '13px', color: '#6b7280' }}>
                            <strong>Closure Date:</strong> {formatDateTime(opportunity.status === 'closed' && opportunity.closedAt ? opportunity.closedAt : opportunity.closingDate)}
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            {!hasUserBid && (
                              <button
                                onClick={() => handlePlaceBid(opportunity)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '6px 12px',
                                  fontSize: '13px',
                                  fontWeight: '500',
                                  borderRadius: '6px',
                                  border: 'none',
                                  cursor: 'pointer',
                                  backgroundColor: isClosingSoon ? '#f59e0b' : '#2563eb',
                                  color: 'white',
                                  transition: 'all 0.2s ease'
                                }}
                              >
                                <Plus size={14} />
                                <span>Place Bid</span>
                              </button>
                            )}

                            {hasUserBid && (
                              <div style={{
                                fontSize: '12px',
                                color: '#059669',
                                fontStyle: 'italic',
                                textAlign: 'right'
                              }}>
                                Use "Edit" from Bids to update
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
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
      {showBidDetailsModal && selectedBidForDetails && selectedOpportunity && (
        <BidDetailsModal
          bid={selectedBidForDetails}
          opportunity={selectedOpportunity}
          onClose={() => {
            setShowBidDetailsModal(false);
            setSelectedBidForDetails(null);
            setSelectedOpportunity(null);
          }}
        />
      )}
    </div>
  );
}

export default Dashboard;
