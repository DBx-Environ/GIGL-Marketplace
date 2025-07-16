// src/components/AdminPanel.js
import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase/config';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { toast } from 'react-toastify';
import { Eye, Award, Clock, Users, Plus, X } from 'lucide-react';

const schema = yup.object().shape({
  title: yup.string().required('Title is required'),
  lpa: yup.string().required('LPA is required'),
  nca: yup.string().required('NCA is required'),
  bngUnitType: yup.string().required('BNG Unit Type is required'),
  unitsRequired: yup.number().required('Units Required is required').min(1, 'Must be at least 1'),
  closingDate: yup.date().required('Closing Date is required').min(new Date(), 'Closing date must be in the future')
});

function AdminPanel() {
  const [opportunities, setOpportunities] = useState([]);
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [showBidsModal, setShowBidsModal] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: yupResolver(schema)
  });

  useEffect(() => {
    // Subscribe to opportunities
    const opportunitiesQuery = query(
      collection(db, 'bidOpportunities'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeOpportunities = onSnapshot(opportunitiesQuery, (snapshot) => {
      const opps = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOpportunities(opps);
    });

    // Subscribe to all bids
    const bidsQuery = query(
      collection(db, 'bids'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeBids = onSnapshot(bidsQuery, (snapshot) => {
      const allBids = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBids(allBids);
      setLoading(false);
    });

    return () => {
      unsubscribeOpportunities();
      unsubscribeBids();
    };
  }, []);

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      await addDoc(collection(db, 'bidOpportunities'), {
        title: data.title,
        lpa: data.lpa,
        nca: data.nca,
        bngUnitType: data.bngUnitType,
        unitsRequired: data.unitsRequired,
        closingDate: data.closingDate.toISOString(),
        status: 'active',
        createdAt: serverTimestamp()
      });
      
      toast.success('Opportunity created successfully!');
      setShowCreateForm(false);
      reset();
    } catch (error) {
      console.error('Error creating opportunity:', error);
      toast.error('Failed to create opportunity. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseOpportunity = async (opportunityId) => {
    try {
      setLoading(true);
      
      const closeBidOpportunity = httpsCallable(functions, 'closeBidOpportunity');
      const result = await closeBidOpportunity({ opportunityId });
      
      if (result.data.success) {
        toast.success('Opportunity closed successfully! Winner has been notified.');
      } else {
        toast.error('Failed to close opportunity: ' + (result.data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error closing opportunity:', error);
      toast.error('Failed to close opportunity: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getBidsForOpportunity = (opportunityId) => {
    return bids.filter(bid => bid.opportunityId === opportunityId && bid.status !== 'withdrawn');
  };

  const getLowestBidAmount = (opportunityId) => {
    const opportunityBids = getBidsForOpportunity(opportunityId);
    if (opportunityBids.length === 0) return null;
    return Math.min(...opportunityBids.map(bid => bid.bidAmount));
  };

  const handleViewBids = (opportunity) => {
    setSelectedOpportunity(opportunity);
    setShowBidsModal(true);
  };

  const getOpportunityStats = () => {
    const active = opportunities.filter(opp => opp.status === 'active').length;
    const closed = opportunities.filter(opp => opp.status === 'closed').length;
    const totalBids = bids.filter(bid => bid.status !== 'withdrawn').length;
    
    return { active, closed, totalBids };
  };

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

  const stats = getOpportunityStats();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary">Admin Panel</h1>
        <p className="text-secondary mt-2">Manage bid opportunities and view bidding activity</p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-content">
            <div className="stat-icon stat-icon-blue">
              <Clock size={24} />
            </div>
            <div className="stat-details">
              <div className="stat-label">Active Opportunities</div>
              <div className="stat-value">{stats.active}</div>
            </div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-card-content">
            <div className="stat-icon stat-icon-green">
              <Award size={24} />
            </div>
            <div className="stat-details">
              <div className="stat-label">Closed Opportunities</div>
              <div className="stat-value">{stats.closed}</div>
            </div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-card-content">
            <div className="stat-icon stat-icon-purple">
              <Users size={24} />
            </div>
            <div className="stat-details">
              <div className="stat-label">Total Bids</div>
              <div className="stat-value">{stats.totalBids}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Opportunity Button */}
      <div className="mb-6">
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="btn btn-primary"
        >
          <Plus size={16} />
          Create New Opportunity
        </button>
      </div>

      {/* Create Opportunity Form */}
      {showCreateForm && (
        <div className="card mb-8">
          <div className="card-header">
            <h2 className="card-title">Create New Bid Opportunity</h2>
          </div>
          <div className="card-content">
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="form-label">Title</label>
                  <input
                    {...register('title')}
                    type="text"
                    className="form-input"
                    placeholder="Enter opportunity title"
                  />
                  {errors.title && (
                    <div className="form-error">{errors.title.message}</div>
                  )}
                </div>
                
                <div className="form-group">
                  <label className="form-label">LPA</label>
                  <input
                    {...register('lpa')}
                    type="text"
                    className="form-input"
                    placeholder="Enter LPA"
                  />
                  {errors.lpa && (
                    <div className="form-error">{errors.lpa.message}</div>
                  )}
                </div>
                
                <div className="form-group">
                  <label className="form-label">NCA</label>
                  <input
                    {...register('nca')}
                    type="text"
                    className="form-input"
                    placeholder="Enter NCA"
                  />
                  {errors.nca && (
                    <div className="form-error">{errors.nca.message}</div>
                  )}
                </div>
                
                <div className="form-group">
                  <label className="form-label">BNG Unit Type</label>
                  <select
                    {...register('bngUnitType')}
                    className="form-input"
                  >
                    <option value="">Select unit type</option>
                    <option value="Habitat">Habitat</option>
                    <option value="Hedgerow">Hedgerow</option>
                    <option value="River">River</option>
                  </select>
                  {errors.bngUnitType && (
                    <div className="form-error">{errors.bngUnitType.message}</div>
                  )}
                </div>
                
                <div className="form-group">
                  <label className="form-label">Units Required</label>
                  <input
                    {...register('unitsRequired')}
                    type="number"
                    min="1"
                    className="form-input"
                    placeholder="Enter units required"
                  />
                  {errors.unitsRequired && (
                    <div className="form-error">{errors.unitsRequired.message}</div>
                  )}
                </div>
                
                <div className="form-group">
                  <label className="form-label">Closing Date</label>
                  <input
                    {...register('closingDate')}
                    type="datetime-local"
                    className="form-input"
                  />
                  {errors.closingDate && (
                    <div className="form-error">{errors.closingDate.message}</div>
                  )}
                </div>
              </div>
              
              <div className="card-actions">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                >
                  {loading ? 'Creating...' : 'Create Opportunity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Opportunities List */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Bid Opportunities</h2>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Details</th>
                <th>Closing Date</th>
                <th>Status</th>
                <th>Bids</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {opportunities.map((opportunity) => {
                const opportunityBids = getBidsForOpportunity(opportunity.id);
                const lowestBid = getLowestBidAmount(opportunity.id);
                
                return (
                  <tr key={opportunity.id}>
                    <td>
                      <div className="font-medium">{opportunity.title}</div>
                    </td>
                    <td>
                      <div className="text-sm">
                        <div>{opportunity.lpa} • {opportunity.nca}</div>
                        <div className="text-secondary">
                          {opportunity.bngUnitType} • {opportunity.unitsRequired} units
                        </div>
                      </div>
                    </td>
                    <td className="text-sm">
                      {formatDate(opportunity.closingDate)}
                    </td>
                    <td>
                      <span className={`badge ${
                        opportunity.status === 'active' ? 'badge-success' : 'badge-gray'
                      }`}>
                        {opportunity.status}
                      </span>
                    </td>
                    <td className="text-sm">
                      <div>{opportunityBids.length} bid(s)</div>
                      {lowestBid && (
                        <div className="text-secondary">
                          Lowest: £{lowestBid.toLocaleString()}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewBids(opportunity)}
                          className="action-btn action-btn-primary"
                          title="View Bids"
                        >
                          <Eye size={16} />
                        </button>
                        {opportunity.status === 'active' && opportunityBids.length > 0 && (
                          <button
                            onClick={() => handleCloseOpportunity(opportunity.id)}
                            className="btn btn-sm btn-outline"
                          >
                            Close
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bids Modal */}
      {showBidsModal && selectedOpportunity && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '900px' }}>
            <div className="modal-header">
              <h2 className="modal-title">
                Bids for: {selectedOpportunity.title}
              </h2>
              <button
                onClick={() => setShowBidsModal(false)}
                className="modal-close"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="modal-content">
              <div className="flex flex-col gap-4">
                {getBidsForOpportunity(selectedOpportunity.id).map((bid) => (
                  <div key={bid.id} className="card">
                    <div className="card-content">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-lg text-success">
                            £{bid.bidAmount.toLocaleString()}
                          </div>
                          <div className="text-sm text-secondary">
                            Submitted: {formatDate(bid.createdAt)}
                          </div>
                          {bid.updatedAt && bid.updatedAt !== bid.createdAt && (
                            <div className="text-sm text-secondary">
                              Updated: {formatDate(bid.updatedAt)}
                            </div>
                          )}
                        </div>
                        {bid.isWinning && (
                          <span className="badge badge-success">
                            Winner
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPanel;