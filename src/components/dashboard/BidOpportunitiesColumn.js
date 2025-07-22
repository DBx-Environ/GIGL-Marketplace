// src/components/dashboard/BidOpportunitiesColumn.js
import React from 'react';

const BidOpportunitiesColumn = ({ bidOpportunities, userBids, onBidNow }) => {
  console.log('BidOpportunitiesColumn render - bidOpportunities:', bidOpportunities.length);
  console.log('BidOpportunitiesColumn render - userBids:', userBids.length);

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

  const isClosingSoon = (closingDate) => {
    if (!closingDate) return false;
    const closing = closingDate.seconds ? new Date(closingDate.seconds * 1000) : new Date(closingDate);
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));
    return closing <= threeDaysFromNow && closing > now;
  };

  const isClosed = (opportunity) => {
    return opportunity.status === 'Closed';
  };

  const hasUserBid = (opportunityId) => {
    return userBids.some(bid => bid.opportunityId === opportunityId);
  };

  const getUserBidAmount = (opportunityId) => {
    const userBid = userBids.find(bid => bid.opportunityId === opportunityId);
    return userBid ? userBid.totalBidAmount : null;
  };

  // Filter to show only active opportunities
  const activeOpportunities = bidOpportunities.filter(opp => opp.status === 'Active');
  console.log('Active opportunities:', activeOpportunities.length);
  
  activeOpportunities.forEach(opp => {
    console.log('Active opportunity:', opp.title, 'Status:', opp.status, 'Total Value:', opp.totalValue);
  });

  return (
    <div className="dashboard-column">
      <div className="column-header">
        <h2 className="column-title">Bid Opportunities (All Status)</h2>
      </div>
      <div className="column-content">
        {bidOpportunities.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🎯</div>
            <p className="empty-state-text">No opportunities found</p>
            <p className="empty-state-subtext">Check console for debugging info</p>
          </div>
        ) : (
          bidOpportunities.map((opportunity) => {
            const userHasBid = hasUserBid(opportunity.id);
            const userBidAmount = getUserBidAmount(opportunity.id);
            
            console.log('Rendering opportunity:', {
              id: opportunity.id,
              title: opportunity.title,
              status: opportunity.status,
              lpa: opportunity.lpa,
              totalValue: opportunity.totalValue,
              userHasBid: userHasBid
            });
            
            return (
              <div 
                key={opportunity.id}
                className="opportunity-card"
                style={{ border: '2px solid #ccc', margin: '10px 0', padding: '10px' }}
              >
                <div className="opportunity-card-header">
                  <h3 className="opportunity-card-title">{opportunity.title}</h3>
                  <span className="status-badge">
                    Status: {opportunity.status || 'No Status'}
                  </span>
                </div>
                
                <div className="opportunity-card-content">
                  <div className="opportunity-info">
                    <span className="opportunity-label">ID:</span>
                    <span className="opportunity-value">{opportunity.id}</span>
                  </div>
                  
                  <div className="opportunity-info">
                    <span className="opportunity-label">Location:</span>
                    <span className="opportunity-value">{opportunity.lpa || 'No LPA'}</span>
                  </div>
                  
                  <div className="opportunity-info">
                    <span className="opportunity-label">Total Value:</span>
                    <span className="opportunity-value">
                      {opportunity.totalValue ? formatCurrency(opportunity.totalValue) : 'No Value'}
                    </span>
                  </div>
                  
                  <div className="opportunity-info">
                    <span className="opportunity-label">Status:</span>
                    <span className="opportunity-value">{opportunity.status || 'Unknown'}</span>
                  </div>
                  
                  <div className="opportunity-info">
                    <span className="opportunity-label">Closing Date:</span>
                    <span className="opportunity-value">
                      {formatDate(opportunity.closingDate)}
                    </span>
                  </div>
                  
                  {userHasBid && (
                    <div className="opportunity-info user-bid-info">
                      <span className="opportunity-label">Your Bid:</span>
                      <span className="opportunity-value user-bid-amount">
                        {formatCurrency(userBidAmount)}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="opportunity-card-actions">
                  <button
                    onClick={() => onBidNow(opportunity)}
                    className={`bid-button ${userHasBid ? 'bid-button-update' : 'bid-button-new'}`}
                  >
                    {userHasBid ? '📝 Update Bid' : '💰 Place Bid'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default BidOpportunitiesColumn;// src/components/dashboard/BidOpportunitiesColumn.js
import React from 'react';

const BidOpportunitiesColumn = ({ bidOpportunities, userBids, onBidNow }) => {
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

  const isClosingSoon = (closingDate) => {
    if (!closingDate) return false;
    const closing = closingDate.seconds ? new Date(closingDate.seconds * 1000) : new Date(closingDate);
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));
    return closing <= threeDaysFromNow && closing > now;
  };

  const isClosed = (opportunity) => {
    return opportunity.status === 'Closed';
  };

  const hasUserBid = (opportunityId) => {
    return userBids.some(bid => bid.opportunityId === opportunityId);
  };

  const getUserBidAmount = (opportunityId) => {
    const userBid = userBids.find(bid => bid.opportunityId === opportunityId);
    return userBid ? userBid.totalBidAmount : null;
  };

  // Filter to show only active opportunities
  const activeOpportunities = bidOpportunities.filter(opp => opp.status === 'Active');

  return (
    <div className="dashboard-column">
      <div className="column-header">
        <h2 className="column-title">Bid Opportunities</h2>
      </div>
      <div className="column-content">
        {activeOpportunities.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🎯</div>
            <p className="empty-state-text">No active opportunities</p>
            <p className="empty-state-subtext">New opportunities will appear here when available</p>
          </div>
        ) : (
          activeOpportunities.map((opportunity) => {
            const userHasBid = hasUserBid(opportunity.id);
            const userBidAmount = getUserBidAmount(opportunity.id);
            const closingSoon = isClosingSoon(opportunity.closingDate);
            
            return (
              <div 
                key={opportunity.id}
                className={`opportunity-card ${closingSoon ? 'closing-soon' : ''}`}
              >
                <div className="opportunity-card-header">
                  <h3 className="opportunity-card-title">{opportunity.title}</h3>
                  {closingSoon && (
                    <span className="closing-soon-badge">Closing Soon!</span>
                  )}
                </div>
                
                <div className="opportunity-card-content">
                  <div className="opportunity-info">
                    <span className="opportunity-label">Location:</span>
                    <span className="opportunity-value">{opportunity.lpa}</span>
                  </div>
                  
                  <div className="opportunity-info">
                    <span className="opportunity-label">Total Value:</span>
                    <span className="opportunity-value">
                      {formatCurrency(opportunity.totalValue)}
                    </span>
                  </div>
                  
                  <div className="opportunity-info">
                    <span className="opportunity-label">Closing Date:</span>
                    <span className="opportunity-value">
                      {formatDate(opportunity.closingDate)}
                    </span>
                  </div>
                  
                  {userHasBid && (
                    <div className="opportunity-info user-bid-info">
                      <span className="opportunity-label">Your Bid:</span>
                      <span className="opportunity-value user-bid-amount">
                        {formatCurrency(userBidAmount)}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="opportunity-card-actions">
                  <button
                    onClick={() => onBidNow(opportunity)}
                    className={`bid-button ${userHasBid ? 'bid-button-update' : 'bid-button-new'}`}
                  >
                    {userHasBid ? '📝 Update Bid' : '💰 Place Bid'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default BidOpportunitiesColumn;