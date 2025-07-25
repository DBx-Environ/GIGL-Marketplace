// src/components/admin/AnalyticsTab.js - Platform Analytics and Reporting
import React, { useMemo } from 'react';
import { TrendingUp, DollarSign, Target, Award, MapPin, Calendar } from 'lucide-react';

/**
 * AnalyticsTab component for displaying platform analytics and insights
 * @param {Object} props - Component props
 * @param {Array} props.opportunities - Array of opportunities
 * @param {Array} props.bids - Array of bids
 * @param {Array} props.users - Array of users
 * @returns {JSX.Element} AnalyticsTab component
 */
function AnalyticsTab({ opportunities, bids, users }) {

  // Calculate comprehensive analytics
  const analytics = useMemo(() => {
    const activeBids = bids.filter(bid => bid.status === 'active' && bid.bidType !== 'no-bid');
    const noBids = bids.filter(bid => bid.bidType === 'no-bid');
    const winningBids = bids.filter(bid => bid.isWinner === true);
    
    // Financial metrics
    const totalBidValue = activeBids.reduce((sum, bid) => {
      if (bid.bidType === 'overall' && bid.overallBid) {
        return sum + bid.overallBid;
      } else if (bid.bidType === 'habitat' && bid.habitatBids) {
        return sum + Object.values(bid.habitatBids).reduce((habitatSum, amount) => habitatSum + (amount || 0), 0);
      }
      return sum;
    }, 0);

    const averageBidValue = activeBids.length > 0 ? totalBidValue / activeBids.length : 0;
    
    const winningBidValue = winningBids.reduce((sum, bid) => {
      if (bid.bidType === 'overall' && bid.overallBid) {
        return sum + bid.overallBid;
      } else if (bid.bidType === 'habitat' && bid.habitatBids) {
        return sum + Object.values(bid.habitatBids).reduce((habitatSum, amount) => habitatSum + (amount || 0), 0);
      }
      return sum;
    }, 0);

    // Opportunity metrics
    const activeOpportunities = opportunities.filter(opp => opp.status === 'active').length;
    const closedOpportunities = opportunities.filter(opp => opp.status === 'closed').length;
    const totalOpportunities = opportunities.length;

    // Bidding participation metrics
    const biddingUsers = new Set(bids.map(bid => bid.userId)).size;
    const engagementRate = users.length > 0 ? (biddingUsers / users.length) * 100 : 0;

    // Geographic distribution
    const lpaDistribution = {};
    const ncaDistribution = {};
    
    opportunities.forEach(opp => {
      lpaDistribution[opp.lpa] = (lpaDistribution[opp.lpa] || 0) + 1;
      ncaDistribution[opp.nca] = (ncaDistribution[opp.nca] || 0) + 1;
    });

    // Habitat analysis
    const habitatRequests = {};
    opportunities.forEach(opp => {
      if (opp.habitatRequirements) {
        opp.habitatRequirements.forEach(req => {
          const key = req.broadHabitat;
          habitatRequests[key] = (habitatRequests[key] || 0) + 1;
        });
      }
    });

    // Bid type distribution
    const bidTypeDistribution = {
      overall: bids.filter(bid => bid.bidType === 'overall').length,
      habitat: bids.filter(bid => bid.bidType === 'habitat').length,
      noBid: noBids.length
    };

    // Success rates
    const overallSuccessRate = activeBids.length > 0 ? (winningBids.length / activeBids.length) * 100 : 0;

    return {
      financial: {
        totalBidValue,
        averageBidValue,
        winningBidValue
      },
      opportunities: {
        total: totalOpportunities,
        active: activeOpportunities,
        closed: closedOpportunities
      },
      participation: {
        totalBids: bids.length,
        activeBids: activeBids.length,
        noBids: noBids.length,
        biddingUsers,
        engagementRate,
        overallSuccessRate
      },
      distribution: {
        lpa: lpaDistribution,
        nca: ncaDistribution,
        habitat: habitatRequests,
        bidTypes: bidTypeDistribution
      }
    };
  }, [opportunities, bids, users]);

  // Get recent activity (last 30 days)
  const recentActivity = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentOpportunities = opportunities.filter(opp => {
      const created = opp.createdAt?.seconds ? new Date(opp.createdAt.seconds * 1000) : null;
      return created && created > thirtyDaysAgo;
    });

    const recentBids = bids.filter(bid => {
      const created = bid.createdAt?.seconds ? new Date(bid.createdAt.seconds * 1000) : null;
      return created && created > thirtyDaysAgo;
    });

    const recentUsers = users.filter(user => {
      const created = user.createdAt?.seconds ? new Date(user.createdAt.seconds * 1000) : null;
      return created && created > thirtyDaysAgo;
    });

    return {
      opportunities: recentOpportunities.length,
      bids: recentBids.length,
      users: recentUsers.length
    };
  }, [opportunities, bids, users]);

  return (
    <div className="analytics-tab">
      {/* Key Metrics Overview */}
      <div className="metrics-section">
        <h2>Platform Performance Overview</h2>
        
        <div className="stats-grid large">
          <div className="stat-card financial">
            <div className="stat-icon">
              <DollarSign size={28} />
            </div>
            <div className="stat-content">
              <h3>Total Bid Value</h3>
              <p className="stat-number large">£{analytics.financial.totalBidValue.toLocaleString()}</p>
              <p className="stat-subtitle">
                Average: £{Math.round(analytics.financial.averageBidValue).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="stat-card success">
            <div className="stat-icon">
              <Award size={28} />
            </div>
            <div className="stat-content">
              <h3>Winning Bids Value</h3>
              <p className="stat-number large">£{analytics.financial.winningBidValue.toLocaleString()}</p>
              <p className="stat-subtitle">
                {Math.round(analytics.participation.overallSuccessRate)}% success rate
              </p>
            </div>
          </div>

          <div className="stat-card engagement">
            <div className="stat-icon">
              <Target size={28} />
            </div>
            <div className="stat-content">
              <h3>User Engagement</h3>
              <p className="stat-number large">{Math.round(analytics.participation.engagementRate)}%</p>
              <p className="stat-subtitle">
                {analytics.participation.biddingUsers} of {users.length} users bidding
              </p>
            </div>
          </div>

          <div className="stat-card activity">
            <div className="stat-icon">
              <TrendingUp size={28} />
            </div>
            <div className="stat-content">
              <h3>Active Opportunities</h3>
              <p className="stat-number large">{analytics.opportunities.active}</p>
              <p className="stat-subtitle">
                {analytics.opportunities.total} total opportunities
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="recent-activity-section">
        <h3>Recent Activity (Last 30 Days)</h3>
        <div className="activity-grid">
          <div className="activity-card">
            <div className="activity-icon">
              <Calendar size={20} />
            </div>
            <div className="activity-content">
              <h4>New Opportunities</h4>
              <p className="activity-number">{recentActivity.opportunities}</p>
            </div>
          </div>

          <div className="activity-card">
            <div className="activity-icon">
              <Target size={20} />
            </div>
            <div className="activity-content">
              <h4>New Bids</h4>
              <p className="activity-number">{recentActivity.bids}</p>
            </div>
          </div>

          <div className="activity-card">
            <div className="activity-icon">
              <TrendingUp size={20} />
            </div>
            <div className="activity-content">
              <h4>New Users</h4>
              <p className="activity-number">{recentActivity.users}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bidding Analysis */}
      <div className="bidding-analysis-section">
        <h3>Bidding Analysis</h3>
        
        <div className="analysis-grid">
          <div className="analysis-card">
            <h4>Bid Type Distribution</h4>
            <div className="distribution-list">
              <div className="distribution-item">
                <span className="distribution-label">Overall Bids</span>
                <span className="distribution-value">{analytics.distribution.bidTypes.overall}</span>
                <span className="distribution-percentage">
                  {bids.length > 0 ? Math.round((analytics.distribution.bidTypes.overall / bids.length) * 100) : 0}%
                </span>
              </div>
              <div className="distribution-item">
                <span className="distribution-label">Habitat-specific Bids</span>
                <span className="distribution-value">{analytics.distribution.bidTypes.habitat}</span>
                <span className="distribution-percentage">
                  {bids.length > 0 ? Math.round((analytics.distribution.bidTypes.habitat / bids.length) * 100) : 0}%
                </span>
              </div>
              <div className="distribution-item">
                <span className="distribution-label">No Bids</span>
                <span className="distribution-value">{analytics.distribution.bidTypes.noBid}</span>
                <span className="distribution-percentage">
                  {bids.length > 0 ? Math.round((analytics.distribution.bidTypes.noBid / bids.length) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>

          <div className="analysis-card">
            <h4>Most Requested Habitats</h4>
            <div className="habitat-list">
              {Object.entries(analytics.distribution.habitat)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5)
                .map(([habitat, count]) => (
                  <div key={habitat} className="habitat-item">
                    <span className="habitat-name">{habitat}</span>
                    <span className="habitat-count">{count} opportunities</span>
                  </div>
                ))}
              {Object.keys(analytics.distribution.habitat).length === 0 && (
                <p className="no-data">No habitat data available</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Geographic Distribution */}
      <div className="geographic-section">
        <h3>Geographic Distribution</h3>
        
        <div className="geo-grid">
          <div className="geo-card">
            <h4>
              <MapPin size={18} />
              Local Planning Authorities (LPA)
            </h4>
            <div className="geo-list">
              {Object.entries(analytics.distribution.lpa)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 8)
                .map(([lpa, count]) => (
                  <div key={lpa} className="geo-item">
                    <span className="geo-name">{lpa}</span>
                    <div className="geo-stats">
                      <span className="geo-count">{count}</span>
                      <div className="geo-bar">
                        <div 
                          className="geo-bar-fill"
                          style={{ 
                            width: `${(count / Math.max(...Object.values(analytics.distribution.lpa))) * 100}%` 
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="geo-card">
            <h4>
              <MapPin size={18} />
              Natural Character Areas (NCA)
            </h4>
            <div className="geo-list">
              {Object.entries(analytics.distribution.nca)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 8)
                .map(([nca, count]) => (
                  <div key={nca} className="geo-item">
                    <span className="geo-name">{nca}</span>
                    <div className="geo-stats">
                      <span className="geo-count">{count}</span>
                      <div className="geo-bar">
                        <div 
                          className="geo-bar-fill"
                          style={{ 
                            width: `${(count / Math.max(...Object.values(analytics.distribution.nca))) * 100}%` 
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Platform Health Indicators */}
      <div className="health-indicators-section">
        <h3>Platform Health Indicators</h3>
        
        <div className="health-grid">
          <div className="health-card">
            <h4>Participation Rate</h4>
            <div className="health-metric">
              <div className="health-circle">
                <div 
                  className="health-progress"
                  style={{ 
                    background: `conic-gradient(#16a34a ${analytics.participation.engagementRate * 3.6}deg, #e5e7eb 0deg)` 
                  }}
                >
                  <div className="health-center">
                    <span className="health-percentage">{Math.round(analytics.participation.engagementRate)}%</span>
                  </div>
                </div>
              </div>
              <p className="health-description">
                {analytics.participation.biddingUsers} of {users.length} registered users have placed bids
              </p>
            </div>
          </div>

          <div className="health-card">
            <h4>Competition Level</h4>
            <div className="health-metric">
              <div className="competition-stats">
                <div className="competition-item">
                  <span className="competition-label">Avg Bids per Opportunity</span>
                  <span className="competition-value">
                    {opportunities.length > 0 ? 
                      Math.round((analytics.participation.activeBids / opportunities.length) * 10) / 10 : 0}
                  </span>
                </div>
                <div className="competition-item">
                  <span className="competition-label">Opportunities with Multiple Bids</span>
                  <span className="competition-value">
                    {opportunities.filter(opp => 
                      bids.filter(bid => bid.opportunityId === opp.id && bid.bidType !== 'no-bid').length > 1
                    ).length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="health-card">
            <h4>Success Rate</h4>
            <div className="health-metric">
              <div className="success-visual">
                <div className="success-bar">
                  <div 
                    className="success-fill"
                    style={{ width: `${analytics.participation.overallSuccessRate}%` }}
                  />
                </div>
                <span className="success-percentage">
                  {Math.round(analytics.participation.overallSuccessRate)}%
                </span>
              </div>
              <p className="health-description">
                {bids.filter(bid => bid.isWinner === true).length} winning bids out of {analytics.participation.activeBids} total bids
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Key Insights */}
      <div className="insights-section">
        <h3>Key Insights</h3>
        <div className="insights-grid">
          <div className="insight-card">
            <h4>Platform Growth</h4>
            <div className="insight-content">
              {recentActivity.users > 0 ? (
                <p className="insight-positive">
                  📈 {recentActivity.users} new users joined in the last 30 days
                </p>
              ) : (
                <p className="insight-neutral">
                  📊 No new user registrations in the last 30 days
                </p>
              )}
            </div>
          </div>

          <div className="insight-card">
            <h4>Bidding Activity</h4>
            <div className="insight-content">
              {analytics.participation.engagementRate > 50 ? (
                <p className="insight-positive">
                  🎯 Strong engagement with {Math.round(analytics.participation.engagementRate)}% of users actively bidding
                </p>
              ) : analytics.participation.engagementRate > 25 ? (
                <p className="insight-warning">
                  ⚠️ Moderate engagement at {Math.round(analytics.participation.engagementRate)}% - consider outreach
                </p>
              ) : (
                <p className="insight-negative">
                  📉 Low engagement at {Math.round(analytics.participation.engagementRate)}% - engagement improvement needed
                </p>
              )}
            </div>
          </div>

          <div className="insight-card">
            <h4>Market Competition</h4>
            <div className="insight-content">
              {opportunities.length > 0 && (analytics.participation.activeBids / opportunities.length) > 2 ? (
                <p className="insight-positive">
                  🏆 Healthy competition with average {Math.round((analytics.participation.activeBids / opportunities.length) * 10) / 10} bids per opportunity
                </p>
              ) : (
                <p className="insight-warning">
                  📊 Limited competition - consider marketing to increase participation
                </p>
              )}
            </div>
          </div>

          <div className="insight-card">
            <h4>Financial Performance</h4>
            <div className="insight-content">
              <p className="insight-neutral">
                💰 Total marketplace value: £{analytics.financial.totalBidValue.toLocaleString()}
              </p>
              {analytics.financial.winningBidValue > 0 && (
                <p className="insight-detail">
                  Secured contracts worth £{analytics.financial.winningBidValue.toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsTab;