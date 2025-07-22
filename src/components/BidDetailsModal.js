// src/components/BidDetailsModal.js - REPLACE your entire BidDetailsModal.js file with this

import React from 'react';
import { X, Award, Clock, DollarSign, Building } from 'lucide-react';

function BidDetailsModal({ bid, opportunity, onClose }) {
  console.log('BidDetailsModal rendered with:', { bid, opportunity });
  
  if (!bid || !opportunity) {
    return (
      <div 
        style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.5)', 
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', maxWidth: '400px' }}>
          <h2>Missing Data</h2>
          <p>Bid: {bid ? 'Found' : 'Missing'}</p>
          <p>Opportunity: {opportunity ? 'Found' : 'Missing'}</p>
          <button onClick={onClose} style={{ padding: '8px 16px', marginTop: '16px' }}>Close</button>
        </div>
      </div>
    );
  }

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
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getBidStatus = () => {
    const now = new Date();
    const closingDate = new Date(opportunity.closingDate);
    
    // Check for overall winner
    if (bid.isWinning && bid.winningType === 'overall') {
      return { label: 'Overall Winner', color: 'text-green-600 bg-green-100' };
    }
    
    // Check for habitat-specific wins
    if (bid.habitatWins && Object.keys(bid.habitatWins).length > 0) {
      const winCount = Object.values(bid.habitatWins).filter(hw => hw.isWinner).length;
      if (winCount > 0) {
        return { 
          label: `Won ${winCount} Habitat${winCount > 1 ? 's' : ''}`, 
          color: 'text-green-600 bg-green-100' 
        };
      }
    }
    
    // Legacy winning check (for old bids)
    if (bid.isWinning) {
      return { label: 'Won', color: 'text-green-600 bg-green-100' };
    }
    
    if (opportunity.status === 'closed') {
      return { label: 'Not Selected', color: 'text-red-600 bg-red-100' };
    }
    
    if (now > closingDate) {
      return { label: 'Closed', color: 'text-gray-600 bg-gray-100' };
    }
    
    return { label: 'Active', color: 'text-blue-600 bg-blue-100' };
  };

  const status = getBidStatus();

  return (
    <div 
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        backgroundColor: 'rgba(0,0,0,0.5)', 
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div 
        style={{ 
          backgroundColor: 'white', 
          borderRadius: '8px', 
          padding: '24px', 
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', margin: 0 }}>
            Bid Details
          </h2>
          <button
            onClick={onClose}
            style={{ 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer', 
              padding: '4px',
              color: '#6b7280'
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Bid Status */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            padding: '16px', 
            backgroundColor: '#f9fafb', 
            borderRadius: '8px' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={20} style={{ color: '#6b7280' }} />
              <span style={{ fontWeight: '500', color: '#111827' }}>Status</span>
            </div>
            <span 
              className={status.color}
              style={{ 
                padding: '6px 12px', 
                fontSize: '14px', 
                fontWeight: '500', 
                borderRadius: '9999px',
                backgroundColor: status.color.includes('green') ? '#dcfce7' : 
                                status.color.includes('red') ? '#fef2f2' : 
                                status.color.includes('blue') ? '#dbeafe' : '#f3f4f6',
                color: status.color.includes('green') ? '#166534' : 
                       status.color.includes('red') ? '#dc2626' : 
                       status.color.includes('blue') ? '#1d4ed8' : '#6b7280'
              }}
            >
              {status.label}
            </span>
          </div>

          {/* Bid Amount */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            padding: '16px', 
            backgroundColor: '#f9fafb', 
            borderRadius: '8px' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: '500', color: '#111827' }}>Your Bid Amount</span>
            </div>
            <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a' }}>
              £{bid.bidAmount?.toLocaleString()}
            </span>
          </div>

          {/* Habitat Bids Breakdown */}
          {bid.habitatBids && bid.habitatBids.length > 0 ? (
            <div style={{ backgroundColor: '#f9fafb', borderRadius: '8px', padding: '16px' }}>
              <h3 style={{ 
                fontWeight: '500', 
                color: '#111827', 
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                margin: '0 0 16px 0'
              }}>
                <Building size={20} style={{ color: '#6b7280' }} />
                Habitat Bid Breakdown
              </h3>
              
              {bid.habitatBids.map((habitat, index) => {
                const isNoBid = habitat.bidType === 'no-bid';
                const borderColor = isNoBid ? '#f87171' : '#10b981';
                const bgColor = isNoBid ? '#fef2f2' : 'white';
                
                return (
                  <div key={index} style={{ 
                    backgroundColor: bgColor,
                    border: `2px solid ${borderColor}`,
                    borderRadius: '8px',
                    padding: '16px',
                    marginBottom: index < bid.habitatBids.length - 1 ? '16px' : '0'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ 
                          fontSize: '16px', 
                          fontWeight: '600', 
                          color: '#111827', 
                          margin: '0 0 4px 0'
                        }}>
                          {habitat.specificHabitat}
                        </h4>
                        <p style={{ 
                          fontSize: '14px', 
                          color: '#6b7280', 
                          margin: 0,
                          fontWeight: '500'
                        }}>
                          {habitat.habitatType}
                        </p>
                      </div>
                      <span style={{
                        padding: '4px 12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        borderRadius: '9999px',
                        backgroundColor: isNoBid ? '#fecaca' : '#d1fae5',
                        color: isNoBid ? '#dc2626' : '#059669',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        {isNoBid ? 'No Bid' : 'Bid Placed'}
                      </span>
                    </div>
                    
                    {!isNoBid && (
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
                        gap: '16px',
                        backgroundColor: '#f8fafc',
                        padding: '12px',
                        borderRadius: '6px'
                      }}>
                        <div>
                          <label style={{ 
                            display: 'block', 
                            fontSize: '11px', 
                            fontWeight: '600', 
                            color: '#6b7280',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            marginBottom: '4px'
                          }}>
                            Units Required
                          </label>
                          <p style={{ 
                            fontSize: '16px', 
                            color: '#111827', 
                            margin: 0,
                            fontWeight: '600'
                          }}>
                            {habitat.unitsRequired}
                          </p>
                        </div>
                        <div>
                          <label style={{ 
                            display: 'block', 
                            fontSize: '11px', 
                            fontWeight: '600', 
                            color: '#6b7280',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            marginBottom: '4px'
                          }}>
                            Price per Unit
                          </label>
                          <p style={{ 
                            fontSize: '16px', 
                            color: '#111827', 
                            margin: 0,
                            fontWeight: '600'
                          }}>
                            £{habitat.pricePerUnit?.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <label style={{ 
                            display: 'block', 
                            fontSize: '11px', 
                            fontWeight: '600', 
                            color: '#6b7280',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            marginBottom: '4px'
                          }}>
                            Subtotal
                          </label>
                          <p style={{ 
                            fontSize: '18px', 
                            color: '#16a34a', 
                            margin: 0,
                            fontWeight: '700'
                          }}>
                            £{habitat.subtotal?.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {isNoBid && (
                      <div style={{ 
                        backgroundColor: '#fef2f2',
                        padding: '12px',
                        borderRadius: '6px',
                        textAlign: 'center'
                      }}>
                        <p style={{ 
                          fontSize: '14px', 
                          color: '#dc2626', 
                          margin: 0,
                          fontStyle: 'italic'
                        }}>
                          No bid placed for this habitat type
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
              
              {/* Total Summary */}
              <div style={{ 
                backgroundColor: '#1f2937',
                borderRadius: '8px',
                padding: '20px',
                marginTop: '20px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ 
                    fontSize: '18px', 
                    fontWeight: '600', 
                    color: 'white', 
                    margin: 0
                  }}>
                    Total Bid Amount
                  </h4>
                  <p style={{ 
                    fontSize: '24px', 
                    fontWeight: '700', 
                    color: '#10b981', 
                    margin: 0
                  }}>
                    £{bid.bidAmount?.toLocaleString()}
                  </p>
                </div>
                <div style={{ 
                  fontSize: '14px', 
                  color: '#9ca3af', 
                  marginTop: '8px'
                }}>
                  {bid.habitatBids.filter(h => h.bidType === 'bid').length} habitat type(s) bid, 
                  {bid.habitatBids.filter(h => h.bidType === 'no-bid').length} no-bid
                </div>
              </div>
            </div>
          ) : (
            /* Fallback if no habitat bids */
            <div style={{ backgroundColor: '#fef3c7', borderRadius: '8px', padding: '16px' }}>
              <h3 style={{ fontWeight: '500', color: '#92400e', margin: '0 0 8px 0' }}>
                No Detailed Breakdown Available
              </h3>
              <p style={{ fontSize: '14px', color: '#92400e', margin: 0 }}>
                This bid only contains a total amount: £{bid.bidAmount?.toLocaleString()}
              </p>
            </div>
          )}

          {/* Additional Bid Properties (if any) */}
          {(bid.notes || bid.details || bid.breakdown) && (
            <div style={{ backgroundColor: '#f9fafb', borderRadius: '8px', padding: '16px' }}>
              <h3 style={{ 
                fontWeight: '500', 
                color: '#111827', 
                margin: '0 0 12px 0'
              }}>
                Additional Details
              </h3>
              {bid.notes && (
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#6b7280' }}>
                    Notes
                  </label>
                  <p style={{ fontSize: '14px', color: '#111827', margin: '4px 0 0 0' }}>
                    {bid.notes}
                  </p>
                </div>
              )}
              {bid.details && (
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#6b7280' }}>
                    Details
                  </label>
                  <pre style={{ fontSize: '12px', color: '#111827', margin: '4px 0 0 0', whiteSpace: 'pre-wrap' }}>
                    {JSON.stringify(bid.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Bid Timeline */}
          <div style={{ backgroundColor: '#f9fafb', borderRadius: '8px', padding: '16px' }}>
            <h3 style={{ 
              fontWeight: '500', 
              color: '#111827', 
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              margin: '0 0 12px 0'
            }}>
              <Clock size={20} style={{ color: '#6b7280' }} />
              Bid Timeline
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: '#6b7280' }}>Bid Placed</span>
                <span style={{ fontSize: '14px', color: '#111827' }}>
                  {formatDate(bid.createdAt)}
                </span>
              </div>
              {bid.updatedAt && bid.updatedAt !== bid.createdAt && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>Last Updated</span>
                  <span style={{ fontSize: '14px', color: '#111827' }}>
                    {formatDate(bid.updatedAt)}
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: '#6b7280' }}>Opportunity Closes</span>
                <span style={{ fontSize: '14px', color: '#111827' }}>
                  {formatDate(opportunity.closingDate)}
                </span>
              </div>
            </div>
          </div>

          {/* Habitat-Specific Wins (if any) */}
          {bid.habitatWins && Object.keys(bid.habitatWins).length > 0 && (
            <div style={{ 
              backgroundColor: '#dcfce7', 
              border: '2px solid #16a34a', 
              borderRadius: '8px', 
              padding: '16px' 
            }}>
              <h3 style={{ 
                fontWeight: '600', 
                color: '#166534', 
                marginBottom: '12px',
                margin: '0 0 12px 0'
              }}>
                🎉 Habitat-Specific Wins!
              </h3>
              
              {Object.entries(bid.habitatWins).map(([habitatType, winData]) => {
                if (!winData.isWinner) return null;
                
                return (
                  <div key={habitatType} style={{ 
                    backgroundColor: 'white',
                    border: '1px solid #16a34a',
                    borderRadius: '6px',
                    padding: '12px',
                    marginBottom: '8px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#166534', margin: '0 0 4px 0' }}>
                          {habitatType}
                        </h4>
                        <p style={{ fontSize: '12px', color: '#16a34a', margin: 0 }}>
                          {winData.unitsWon} units at £{winData.pricePerUnit?.toLocaleString()}/unit
                        </p>
                      </div>
                      <span style={{ 
                        fontSize: '12px', 
                        fontWeight: '600', 
                        color: '#166534',
                        backgroundColor: '#dcfce7',
                        padding: '4px 8px',
                        borderRadius: '4px'
                      }}>
                        WINNER
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Overall Winner Status */}
          {bid.isWinning && bid.winningType === 'overall' && (
            <div style={{ 
              backgroundColor: '#fef3c7', 
              border: '2px solid #f59e0b', 
              borderRadius: '8px', 
              padding: '16px' 
            }}>
              <h3 style={{ 
                fontWeight: '600', 
                color: '#92400e', 
                marginBottom: '8px',
                margin: '0 0 8px 0'
              }}>
                🏆 Overall Winner!
              </h3>
              <div style={{ fontSize: '14px', color: '#92400e' }}>
                <p style={{ margin: 0 }}>
                  Congratulations! Your bid was selected as the overall winning bid, covering all required habitat types.
                </p>
              </div>
            </div>
          )}

          {/* Winning Bid Info - Legacy and Closed Opportunities */}
          {opportunity.status === 'closed' && (opportunity.overallWinningAmount || opportunity.habitatWinners) && !bid.isWinning && !bid.habitatWins && (
            <div style={{ 
              backgroundColor: '#fef2f2', 
              border: '1px solid #fca5a5', 
              borderRadius: '8px', 
              padding: '16px' 
            }}>
              <h3 style={{ 
                fontWeight: '500', 
                color: '#dc2626', 
                marginBottom: '8px',
                margin: '0 0 8px 0'
              }}>
                Opportunity Results
              </h3>
              <div style={{ fontSize: '14px', color: '#dc2626' }}>
                {opportunity.overallWinningAmount && (
                  <p style={{ margin: '0 0 8px 0' }}>
                    Overall winning bid: £{opportunity.overallWinningAmount.toLocaleString()}
                    {bid.bidAmount && (
                      <span> (Your bid was £{(bid.bidAmount - opportunity.overallWinningAmount).toLocaleString()} higher)</span>
                    )}
                  </p>
                )}
                {opportunity.habitatWinners && (
                  <div>
                    <p style={{ margin: '0 0 8px 0', fontWeight: '500' }}>Habitat-specific winners:</p>
                    {Object.entries(opportunity.habitatWinners).map(([habitatType, winner]) => (
                      <p key={habitatType} style={{ margin: '0 0 4px 0', fontSize: '13px' }}>
                        • {habitatType}: £{winner.pricePerUnit?.toLocaleString()}/unit
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Close Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BidDetailsModal;