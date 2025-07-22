// src/components/dashboard/CurrentBidsColumn.js
import React from 'react';

const CurrentBidsColumn = ({ userBids, bidOpportunities, onViewBid }) => {
  console.log('CurrentBidsColumn render - userBids:', userBids.length);
  console.log('CurrentBidsColumn render - bidOpportunities:', bidOpportunities.length);

  // Group bids by opportunity and get the latest bid for each
  const getLatestBidsPerOpportunity = () => {
    const bidsByOpportunity = {};
    
    userBids.forEach(bid => {
      const opportunityId = bid.opportunityId;
      if (!bidsByOpportunity[opportunityId] || 
          new Date(bid.createdAt) > new Date(bidsByOpportunity[opportunityId].createdAt)) {
        bidsByOpportunity[opportunityId] = bid;
      }
    });
    
    const latest = Object.values(bidsByOpportunity);
    console.log('Latest bids per opportunity:', latest.length);
    return latest;
  };

  const latestBids = getLatestBidsPerOpportunity();

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  const formatDate = (date) => {
    if (!date) return 'No date';
    const dateObj = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
    return dateObj.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getOpportunityStatus = (opportunityId) => {
    const opportunity = bidOpportunities.find(opp => opp.id === opportunityId);
    return opportunity?.status || 'Unknown';
  };

  const isOpportunityClosed = (opportunityId) => {
    return getOpportunityStatus(opportunityId) === 'Closed';
  };

  const getStatusColor = (opportunityId) => {
    const status = getOpportunityStatus(opportunityId);
    switch (status) {
      case 'Active': return 'status-active';
      case 'Closed': return 'status-closed';
      default: return 'status-unknown';
    }
  };

  return (
    <div className="dashboard-column">
      <div className="column-header">
        <h2 className="column-title">Current Bids (All Status)</h2>
      </div>
      <div className="column-content">
        {userBids.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📝</div>
            <p className="empty-state-text">No bids found</p>
            <p className="empty-state-subtext">Check console for debugging info</p>
          </div>
        ) : (
          userBids.map((bid) => {
            const opportunity = bidOpportunities.find(opp => opp.id === bid.opportunityId);
            
            console.log('Rendering bid:', {
              bidId: bid.id,
              bidStatus: bid.status,
              opportunityId: bid.opportunityId,
              opportunityTitle: opportunity?.title,
              opportunityStatus: opportunity?.status
            });
            
            return (
              <div 
                key={bid.id} 
                className="bid-card"
                style={{ border: '2px solid #ccc', margin: '10px 0', padding: '10px' }}
              >
                <div className="bid-card-header">
                  <h3 className="bid-card-title">
                    {opportunity?.title || 'Unknown Opportunity'}
                  </h3>
                  <span className="status-badge">
                    Bid: {bid.status || 'No Status'} | Opp: {opportunity?.status || 'No Status'}
                  </span>
                </div>
                
                <div className="bid-card-content">
                  <div className="bid-info">
                    <span className="bid-label">Total Bid:</span>
                    <span className="bid-amount">{formatCurrency(bid.totalBidAmount)}</span>
                  </div>
                  
                  <div className="bid-info">
                    <span className="bid-label">Bid ID:</span>
                    <span className="bid-date">{bid.id}</span>
                  </div>
                  
                  <div className="bid-info">
                    <span className="bid-label">Opportunity ID:</span>
                    <span className="bid-date">{bid.opportunityId}</span>
                  </div>
                  
                  <div className="bid-info">
                    <span className="bid-label">Submitted:</span>
                    <span className="bid-date">
                      {bid.createdAt ? formatDate(bid.createdAt) : 'Unknown'}
                    </span>
                  </div>
                </div>
                
                <div className="bid-card-actions">
                  <button
                    onClick={() => onViewBid(bid)}
                    className="action-button view"
                    aria-label="View bid details"
                  >
                    👁️
                  </button>
                  
                  <span className="bid-status-message">
                    Status: {bid.status || 'Unknown'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CurrentBidsColumn;