// src/components/BidDetailsModal.js
import React from 'react';
import { X } from 'lucide-react';
import { formatDateTime, getBidStatus } from '../utils/bidHelpers'; // Import getBidStatus

/**
 * BidDetailsModal component displays detailed information about a specific bid.
 * @param {object} props - Component props.
 * @param {object} props.bid - The bid object to display.
 * @param {object} props.opportunity - The opportunity object related to the bid.
 * @returns {JSX.Element} BidDetailsModal component.
 */
function BidDetailsModal({ bid, opportunity, onClose }) {
  // Added a safe check for 'bid' and 'bid.habitatBids' before iterating
  if (bid && Array.isArray(bid.habitatBids) && opportunity?.habitatRequirements) {
    bid.habitatBids.forEach(hb => {
      if (hb.bidType === 'bid') {
      }
    });
  }

  // Safely get closure date for display
  const displayClosureDate = opportunity?.status === 'closed' && opportunity?.closedAt
    ? opportunity.closedAt
    : opportunity?.closingDate;

  // Get the overall status of the bid
  const bidStatus = getBidStatus(bid, [opportunity]); // Pass opportunity in an array for getBidStatus

  // Render nothing if bid or opportunity is not provided, though Dashboard should prevent this.
  if (!bid || !opportunity) {
    console.error("BidDetailsModal: Missing bid or opportunity prop.");
    return null;
  }

  return (
    <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-content" style={{ maxWidth: '600px', width: '90%', maxHeight: '90vh', overflowY: 'auto', borderRadius: '8px', boxShadow: '0 8px 20px rgba(0,0,0,0.2)', backgroundColor: 'white', position: 'relative', padding: '25px' }}>
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '15px', marginBottom: '15px' }}>
          <h2 className="modal-title" style={{ margin: 0, fontSize: '1.6rem', color: '#333' }}>Bid Details</h2>
          <button
            onClick={onClose}
            className="modal-close"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}
          >
            <X size={24} />
          </button>
        </div>

        <div className="modal-body" style={{ fontSize: '0.95em', color: '#555' }}>
          <h3 style={{ fontSize: '1.2em', fontWeight: 'bold', marginBottom: '10px', color: '#333' }}>
            Opportunity: {opportunity?.title || 'Unknown Opportunity'}
          </h3>
          <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f8f8f8', borderRadius: '5px' }}>
            <p style={{ margin: '5px 0' }}>
              <strong>LPA:</strong> {opportunity?.lpa || 'N/A'} • <strong>NCA:</strong> {opportunity?.nca || 'N/A'}
              {opportunity?.wfd && <span> • <strong>WFD:</strong> {opportunity.wfd}</span>}
            </p>
            <p style={{ margin: '5px 0' }}>
              <strong>Closure Date:</strong> {formatDateTime(displayClosureDate)}
              {/* Added Bid Last Updated */}
              {bid.updatedAt && (
                <span style={{ marginLeft: '15px' }}>
                  • <strong>Bid Last Updated:</strong> {formatDateTime(bid.updatedAt)}
                </span>
              )}
            </p>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ fontSize: '1.1em', fontWeight: 'bold', marginBottom: '10px', color: '#333' }}>Your Bids, by Habitat Type:</h4> {/* Changed title */}
            {/* Added defensive check for bid.habitatBids before mapping */}
            {bid.habitatBids && bid.habitatBids.length > 0 ? (
              <div style={{ border: '1px solid #e0e0e0', borderRadius: '5px', padding: '15px', backgroundColor: '#fff' }}>
                {bid.habitatBids.map((hb, index) => {
                  const isHabitatWinner = bid.habitatWins?.[hb.specificHabitat]?.isWinner; // Check if this habitat is a winner
                  return (
                    <div key={index} style={{
                      marginBottom: '10px',
                      paddingBottom: '10px',
                      borderBottom: index < bid.habitatBids.length - 1 ? '1px dashed #eee' : 'none',
                      backgroundColor: isHabitatWinner ? '#e6ffe6' : 'transparent', // Highlight winner
                      padding: isHabitatWinner ? '8px' : '0',
                      borderRadius: isHabitatWinner ? '5px' : '0',
                      border: isHabitatWinner ? '1px solid #4CAF50' : 'none',
                    }}>
                      <p style={{ margin: '0 0 5px 0' }}>
                        <strong>{hb.specificHabitat}</strong>
                        {hb.bidType === 'no-bid' ? (
                          <span style={{ color: '#dc2626', fontStyle: 'italic', marginLeft: '10px' }}>No Bid</span>
                        ) : (
                          <span style={{ marginLeft: '10px' }}>
                            Your Price: £{hb.pricePerUnit?.toLocaleString()}/unit
                          </span>
                        )}
                      </p>
                      {hb.bidType === 'bid' && (
                        <div style={{ fontSize: '0.9em', color: '#666' }}>
                          <p style={{ margin: '2px 0' }}>
                            You supply: {hb.adjustedUnitsToSupply?.toFixed(2)} units (from {hb.baseUnitsRequired} base units)
                          </p>
                          <p style={{ margin: '2px 0' }}>
                            Buyer's Effective Price: £{hb.effectivePricePerUnitForBuyer?.toFixed(2)}/unit
                          </p>
                          <p style={{ margin: '2px 0', fontWeight: 'bold', color: '#16a34a' }}>
                            Total for this habitat: £{hb.subtotal?.toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p>No habitat bids found for this entry.</p>
            )}
          </div>

          <div style={{ borderTop: '1px solid #e0e0e0', paddingTop: '15px', marginTop: '15px' }}>
            <p style={{ margin: '5px 0', fontSize: '1.1em', fontWeight: 'bold', color: '#333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Your Total Bid: £{bid.bidAmount?.toLocaleString()}</span>
              <span style={{ fontSize: '0.9em', fontWeight: 'normal', color: '#666', backgroundColor: '#f0f0f0', padding: '5px 10px', borderRadius: '15px' }}>
                Status: {bidStatus}
              </span>
            </p>
            {/* Removed Buyer's Total Effective Cost and date fields */}
          </div>
        </div>

        <div className="modal-actions" style={{ borderTop: '1px solid #eee', paddingTop: '15px', marginTop: '20px', textAlign: 'right' }}>
          <button onClick={onClose} style={{ backgroundColor: '#6c757d', color: 'white', padding: '10px 20px', borderRadius: '5px', border: 'none', cursor: 'pointer', fontSize: '1em' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default BidDetailsModal;
