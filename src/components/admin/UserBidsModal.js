// src/components/admin/UserBidsModal.js
import React from 'react';
import { X } from 'lucide-react';
import {
  formatDate,
  // Removed formatDateTime
  getBidStatus,
  getLatestBidsPerOpportunity,
  // Removed formatHabitatRequirementsCondensed
} from '../../utils/bidHelpers'; // Import helper functions

/**
 * UserBidsModal component displays a list of bids for a specific user.
 * @param {object} props - Component props.
 * @param {object} props.user - The user object whose bids are being displayed.
 * @param {Array<object>} props.bidsData - All bids data from Firestore.
 * @param {Array<object>} props.opportunitiesData - All opportunities data from Firestore.
 * @param {function} props.onClose - Function to close the modal.
 * @returns {JSX.Element} UserBidsModal component.
 */
function UserBidsModal({ user, bidsData, opportunitiesData, onClose }) {
  // Filter bids relevant to the selected user and get only the latest ones
  const userBidsRaw = bidsData.filter(bid => bid.userId === user.id);
  const latestUserBids = getLatestBidsPerOpportunity(userBidsRaw);

  return (
    <div className="modal-overlay">
      <div className="modal user-bids-modal"> {/* This modal will be wider */}
        <div className="modal-header">
          <h3 className="modal-title">Bids for {user.firstName} {user.lastName} ({user.email})</h3>
          <button onClick={onClose} className="modal-close">
            <X size={20} />
          </button>
        </div>
        <div className="modal-content">
          {latestUserBids.length === 0 ? (
            <div className="empty-state">
              <p className="empty-state-text">No current bids found for this user.</p>
            </div>
          ) : (
            <div className="bids-list"> {/* Reusing bids-list for general styling */}
              {latestUserBids.map(bid => {
                const opportunity = opportunitiesData.find(opp => opp.id === bid.opportunityId);
                const status = getBidStatus(bid, opportunitiesData); // Use the detailed status helper

                // Determine status badge class based on status string from bidHelpers
                let statusBadgeClass = '';
                if (status === 'Active') statusBadgeClass = 'status-active';
                else if (status === 'Overall Winner' || status === 'Won' || status.includes('Won')) statusBadgeClass = 'status-won';
                else if (status === 'Not Selected' || status === 'Expired') statusBadgeClass = 'status-not-selected';
                else if (status === 'Withdrawn') statusBadgeClass = 'status-withdrawn';

                // Determine the correct date to display based on opportunity status
                const displayDate = opportunity?.status === 'closed' && opportunity?.closedAt
                  ? opportunity.closedAt
                  : opportunity?.closingDate;

                return (
                  <div key={bid.id} className="bid-item">
                    {/* Main Bid Info Row */}
                    <div className="bid-header-row">
                      <div className="bid-info-main">
                        <strong className="bid-opportunity-title">{opportunity?.title || 'Unknown Opportunity'}</strong>
                        <span className="bid-amount-total">£{bid.bidAmount?.toLocaleString() || 'N/A'}</span>
                      </div>
                      <span className={`status-badge ${statusBadgeClass}`}>
                        {status}
                      </span>
                    </div>

                    {/* Additional Bid Details (Date Placed) */}
                    <div className="bid-meta-info">
                      <span>Placed: {formatDate(bid.createdAt)}</span>
                      {opportunity && <span> | Closure Date: {formatDate(displayDate)}</span>} {/* Updated label and date source */}
                    </div>

                    {/* Habitat Details Section - New Row */}
                    {bid.habitatBids && bid.habitatBids.length > 0 && (
                      <div className="habitat-details-section">
                        <h4 className="habitat-details-heading">Habitat Details</h4>
                        <div className="habitat-bids-details">
                          {bid.habitatBids.map((hb, index) => {
                            const isHabitatWinner = bid.habitatWins?.[hb.specificHabitat]?.isWinner;
                            return (
                              <div key={index} className={`habitat-bid-item ${isHabitatWinner ? 'winning-habitat-row' : ''}`}>
                                <span>
                                  <strong>{hb.specificHabitat}</strong>
                                </span>
                                <span>
                                  {hb.bidType === 'no-bid' ? (
                                    <em className="no-bid-text">No bid</em>
                                  ) : (
                                    <span className="price-per-unit">
                                      £{(hb.pricePerUnit || (hb.subtotal / hb.unitsRequired) || 0).toLocaleString()}/unit
                                      <span style={{ color: '#059669', fontWeight: '500' }}>
                                        {' '}(£{hb.subtotal?.toLocaleString()})
                                      </span>
                                    </span>
                                  )}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="modal-actions">
          <button onClick={onClose} className="btn btn-secondary">Close</button>
        </div>
      </div>
    </div>
  );
}

export default UserBidsModal;
