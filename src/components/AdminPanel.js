// src/components/AdminPanel.js - ENHANCED WITH MANUAL CLOSE CONFIRMATION
import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase/config';
import { useForm, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { toast } from 'react-toastify';
import { Eye, Award, Clock, Users, Plus, Trash2, X, AlertTriangle, CheckCircle } from 'lucide-react';
import './AdminPanel.css';

const LPA_OPTIONS = [
  "North Lincolnshire", "North East Lincolnshire", "West Lindsey", "East Lindsey",
  "City of Lincoln", "North Kesteven", "South Kesteven", "New Holland", 
  "Boston", "Outside Greater Lincs"
];

const NCA_OPTIONS = [
  "Humberhead Levels", "Humber Estuary", "Lincolnshire Coast and Marshes",
  "Lincolnshire Wolds", "Central Lincolnshire Vale", 
  "Northern Lincolnshire Edge with Coversands", "The Fens",
  "Southern Lincolnshire Edge", "Trent and Belvoir Vales", "Kesteven Uplands"
];

const HABITAT_MAPPING = {
  "Cropland": [
    "Arable field margins cultivated annually",
    "Arable field margins game bird mix", 
    "Arable field margins pollen and nectar",
    "Arable field margins tussocky"
  ],
  "Grassland": [
    "Traditional orchards",
    "Floodplain wetland mosaic and CFGM",
    "Lowland calcareous grassland",
    "Lowland dry acid grassland",
    "Lowland meadows",
    "Other lowland acid grassland",
    "Other neutral grassland",
    "Tall herb communities (H6430)",
    "Upland acid grassland",
    "Upland calcareous grassland",
    "Upland hay meadows"
  ],
  "Heathland and shrub": [
    "Blackthorn scrub",
    "Gorse scrub",
    "Hawthorn scrub",
    "Hazel scrub",
    "Lowland heathland",
    "Mixed scrub",
    "Mountain heaths and willow scrub",
    "Willow scrub",
    "Upland heathland"
  ],
  "Hedgerow": [
    "Species-rich native hedgerow with trees - associated with bank or ditch",
    "Species-rich native hedgerow with trees",
    "Species-rich native hedgerow - associated with bank or ditch",
    "Native hedgerow with trees - associated with bank or ditch",
    "Species-rich native hedgerow",
    "Native hedgerow - associated with bank or ditch",
    "Native hedgerow with trees",
    "Ecologically valuable line of trees",
    "Ecologically valuable line of trees - associated with bank or ditch"
  ],
  "Individual trees": [
    "Urban tree",
    "Rural tree"
  ],
  "Lakes": [
    "Aquifer fed naturally fluctuating water bodies",
    "High alkalinity lakes",
    "Low alkalinity lakes",
    "Marl lakes",
    "Moderate alkalinity lakes",
    "Peat lakes",
    "Ponds (priority habitat)",
    "Ponds (non-priority habitat)",
    "Temporary lakes ponds and pools (H3170)"
  ],
  "Sparsely vegetated land": [
    "Calaminarian grasslands"
  ],
  "Urban": [
    "Open mosaic habitats on previously developed land"
  ],
  "Watercourse": [
    "Priority habitat",
    "Other rivers and streams",
    "Ditches"
  ],
  "Wetland": [
    "Blanket bog",
    "Depressions on peat substrates (H7150)",
    "Fens (upland and lowland)",
    "Lowland raised bog",
    "Oceanic valley mire[1] (D2.1)",
    "Purple moor grass and rush pastures",
    "Reedbeds",
    "Transition mires and quaking bogs (H7140)"
  ],
  "Woodland and forest": [
    "Felled",
    "Lowland beech and yew woodland",
    "Lowland mixed deciduous woodland",
    "Native pine woodlands",
    "Other coniferous woodland",
    "Other Scot's pine woodland",
    "Other woodland; broadleaved",
    "Other woodland; mixed",
    "Upland birchwoods",
    "Upland mixed ashwoods",
    "Upland oakwood",
    "Wet woodland",
    "Wood-pasture and parkland",
    "Replacement for felled woodland"
  ]
};

const BROAD_HABITAT_OPTIONS = Object.keys(HABITAT_MAPPING);

const MANUAL_CLOSE_REASONS = [
  {
    value: 'error',
    label: 'Error in Opportunity Definition',
    description: 'There was an error in how the opportunity was defined',
    userMessage: 'There was an error in the definition of the opportunity. Watch out for a repost of the opportunity - you will have to bid again.',
    determineWinners: false,
    emailType: 'error'
  },
  {
    value: 'withdrawn',
    label: 'Buyer Withdrew Requirement',
    description: 'The buyer has withdrawn their requirement',
    userMessage: 'The buyer has withdrawn their requirement. Huge apologies for any inconvenience this has caused you.',
    determineWinners: false,
    emailType: 'withdrawn'
  },
  {
    value: 'early_close',
    label: 'Early Close by Buyer Request',
    description: 'The buyer requested an early close with winner determination',
    userMessage: 'The buyer has asked for an early close. Winners have been determined via the usual methods. A separate email will follow to inform you of the outcome.',
    determineWinners: true,
    emailType: 'early_close'
  }
];

const schema = yup.object().shape({
  title: yup.string().required('Title is required'),
  lpa: yup.string().required('LPA is required'),
  nca: yup.string().required('NCA is required'),
  habitatRequirements: yup.array().of(
    yup.object().shape({
      broadHabitat: yup.string().required('Broad habitat is required'),
      specificHabitat: yup.string().required('Specific habitat is required'),
      unitsRequired: yup.number().required('Units required is required').min(0.01, 'Must be at least 0.01')
    })
  ).min(1, 'At least one habitat requirement is required'),
  closingDate: yup.date().required('Closing Date is required').min(new Date(), 'Closing date must be in the future')
});

function AdminPanel() {
  const [opportunities, setOpportunities] = useState([]);
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [showBidsModal, setShowBidsModal] = useState(false);
  
  // Manual close confirmation state
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);
  const [closeOpportunityId, setCloseOpportunityId] = useState(null);
  const [closeReason, setCloseReason] = useState('');
  const [closeReasonDetails, setCloseReasonDetails] = useState('');

  const { register, handleSubmit, formState: { errors }, reset, control, watch } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      habitatRequirements: [{ broadHabitat: '', specificHabitat: '', unitsRequired: '' }],
      closingDate: (() => {
        const date = new Date();
        date.setDate(date.getDate() + 7);
        return date.toISOString().slice(0, 16);
      })()
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "habitatRequirements"
  });

  const watchedHabitats = watch("habitatRequirements");

  useEffect(() => {
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
      
      // Handle timezone properly - store as ISO string
      const closingDate = new Date(data.closingDate);
      
      const opportunityData = {
        title: data.title,
        lpa: data.lpa,
        nca: data.nca,
        habitatRequirements: data.habitatRequirements,
        closingDate: closingDate.toISOString(),
        status: 'active',
        createdAt: serverTimestamp()
      };
      
      await addDoc(collection(db, 'bidOpportunities'), opportunityData);
      
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

  // Handle close opportunity click - show confirmation modal
  const handleCloseOpportunityClick = (opportunityId) => {
    setCloseOpportunityId(opportunityId);
    setCloseReason('');
    setCloseReasonDetails('');
    setShowCloseConfirmation(true);
  };

  // Confirm and execute opportunity closure
  const confirmCloseOpportunity = async () => {
    if (!closeReason) {
      toast.error('Please select a reason for closing the opportunity');
      return;
    }

    try {
      setLoading(true);
      const closeBidOpportunity = httpsCallable(functions, 'closeBidOpportunity');
      const result = await closeBidOpportunity({ 
        opportunityId: closeOpportunityId,
        reason: closeReason,
        reasonDetails: closeReasonDetails || ''
      });
      
      if (result.data.success) {
        const selectedReason = MANUAL_CLOSE_REASONS.find(r => r.value === closeReason);
        toast.success(`Opportunity closed successfully! (${selectedReason.label})`);
        setShowCloseConfirmation(false);
        setCloseOpportunityId(null);
        setCloseReason('');
        setCloseReasonDetails('');
      } else {
        toast.error('Failed to close opportunity: ' + result.data.error);
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
    
    return date.toLocaleString('en-GB', {
      timeZone: 'Europe/London',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }) + ' GMT';
  };

  const formatHabitatRequirements = (habitatRequirements) => {
    if (!habitatRequirements || !Array.isArray(habitatRequirements)) {
      return 'No requirements specified';
    }
    return habitatRequirements.map(req => 
      `${req.specificHabitat}: ${req.unitsRequired} units`
    ).join('; ');
  };

  // ENHANCED: Sort opportunities by status and closing date
  const getSortedOpportunities = () => {
    return [...opportunities].sort((a, b) => {
      // First sort by status: active first, then closed
      if (a.status !== b.status) {
        if (a.status === 'active' && b.status === 'closed') return -1;
        if (a.status === 'closed' && b.status === 'active') return 1;
      }
      
      // Within each status group, sort by closing date
      const getClosingDate = (opp) => {
        if (typeof opp.closingDate === 'string') {
          return new Date(opp.closingDate);
        } else if (opp.closingDate?.toDate) {
          return opp.closingDate.toDate();
        } else {
          return new Date(opp.closingDate);
        }
      };
      
      const dateA = getClosingDate(a);
      const dateB = getClosingDate(b);
      
      // For active opportunities: earliest closing date first (most urgent)
      // For closed opportunities: most recently closed first
      if (a.status === 'active') {
        return dateA - dateB; // Ascending (earliest first)
      } else {
        return dateB - dateA; // Descending (most recent first)
      }
    });
  };

  const stats = getOpportunityStats();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1 className="admin-title">Admin Panel</h1>
        <p className="admin-subtitle">Manage bid opportunities and view bidding activity</p>
      </div>

      {/* Stats Cards */}
      <div className="stats-container">
        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-icon blue">
              <Clock className="h-8 w-8" />
            </div>
            <div className="stat-text">
              <h3>Active Opportunities</h3>
              <p>{stats.active}</p>
            </div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-icon green">
              <Award className="h-8 w-8" />
            </div>
            <div className="stat-text">
              <h3>Closed Opportunities</h3>
              <p>{stats.closed}</p>
            </div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-icon purple">
              <Users className="h-8 w-8" />
            </div>
            <div className="stat-text">
              <h3>Total Bids</h3>
              <p>{stats.totalBids}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Create Button */}
      <div className="create-button-container">
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="create-button"
        >
          <Plus size={20} />
          <span>Create New Opportunity</span>
        </button>
      </div>

      {/* Create Opportunity Form */}
      {showCreateForm && (
        <div className="form-container">
          <h2 className="form-title">Create New Bid Opportunity</h2>
          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Basic Information */}
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Title</label>
                <input
                  {...register('title')}
                  type="text"
                  className="form-input"
                  placeholder="Enter opportunity title"
                />
                {errors.title && (
                  <p className="form-error">{errors.title.message}</p>
                )}
              </div>
              
              <div className="form-group">
                <label className="form-label">Closing Date & Time (UK Time)</label>
                <input
                  {...register('closingDate')}
                  type="datetime-local"
                  className="form-input"
                />
                {errors.closingDate && (
                  <p className="form-error">{errors.closingDate.message}</p>
                )}
              </div>
              
              <div className="form-group">
                <label className="form-label">LPA (Local Planning Authority)</label>
                <select
                  {...register('lpa')}
                  className="form-select"
                >
                  <option value="">Select LPA</option>
                  {LPA_OPTIONS.map(lpa => (
                    <option key={lpa} value={lpa}>{lpa}</option>
                  ))}
                </select>
                {errors.lpa && (
                  <p className="form-error">{errors.lpa.message}</p>
                )}
              </div>
              
              <div className="form-group">
                <label className="form-label">NCA (National Character Area)</label>
                <select
                  {...register('nca')}
                  className="form-select"
                >
                  <option value="">Select NCA</option>
                  {NCA_OPTIONS.map(nca => (
                    <option key={nca} value={nca}>{nca}</option>
                  ))}
                </select>
                {errors.nca && (
                  <p className="form-error">{errors.nca.message}</p>
                )}
              </div>
            </div>

            {/* Habitat Requirements */}
            <div className="habitat-section">
              <div className="habitat-label">Habitat Requirements</div>
              
              {fields.map((field, index) => (
                <div key={field.id} className="habitat-item">
                  <div className="form-group">
                    <label className="form-label">Broad Habitat</label>
                    <select
                      {...register(`habitatRequirements.${index}.broadHabitat`)}
                      className="form-select"
                    >
                      <option value="">Select broad habitat</option>
                      {BROAD_HABITAT_OPTIONS.map(broad => (
                        <option key={broad} value={broad}>{broad}</option>
                      ))}
                    </select>
                    {errors.habitatRequirements?.[index]?.broadHabitat && (
                      <p className="form-error">
                        {errors.habitatRequirements[index].broadHabitat.message}
                      </p>
                    )}
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Specific Habitat</label>
                    <select
                      {...register(`habitatRequirements.${index}.specificHabitat`)}
                      disabled={!watchedHabitats?.[index]?.broadHabitat}
                      className="form-select"
                    >
                      <option value="">
                        {watchedHabitats?.[index]?.broadHabitat ? 'Select specific habitat' : 'Select broad habitat first'}
                      </option>
                      {watchedHabitats?.[index]?.broadHabitat && HABITAT_MAPPING[watchedHabitats[index].broadHabitat]?.map(specific => (
                        <option key={specific} value={specific}>{specific}</option>
                      ))}
                    </select>
                    {errors.habitatRequirements?.[index]?.specificHabitat && (
                      <p className="form-error">
                        {errors.habitatRequirements[index].specificHabitat.message}
                      </p>
                    )}
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Units Required</label>
                    <input
                      {...register(`habitatRequirements.${index}.unitsRequired`)}
                      type="number"
                      step="0.01"
                      min="0.01"
                      className="form-input"
                      placeholder="e.g. 2.25"
                      onWheel={(e) => e.target.blur()}
                      onFocus={(e) => e.target.addEventListener('wheel', (event) => event.preventDefault())}
                    />
                    {errors.habitatRequirements?.[index]?.unitsRequired && (
                      <p className="form-error">
                        {errors.habitatRequirements[index].unitsRequired.message}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="remove-habitat-button"
                        title="Remove habitat requirement"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              
              <button
                type="button"
                onClick={() => append({ broadHabitat: '', specificHabitat: '', unitsRequired: '' })}
                className="add-habitat-button"
              >
                <Plus size={16} />
                <span>Add Habitat</span>
              </button>
              
              {errors.habitatRequirements && (
                <p className="form-error">{errors.habitatRequirements.message}</p>
              )}
            </div>
            
            {/* Form Actions */}
            <div className="form-actions">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="cancel-button"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="submit-button"
              >
                {loading ? 'Creating...' : 'Create Opportunity'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Opportunities List - ENHANCED WITH SORTING */}
      <div className="table-container">
        <div className="table-header">
          <h2 className="table-title">Bid Opportunities</h2>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0 0' }}>
            Active opportunities first (by closing date), then closed opportunities (most recent first)
          </p>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="opportunities-table">
            <thead className="table-head">
              <tr>
                <th>Title</th>
                <th>Location</th>
                <th>Habitat Requirements</th>
                <th>Closing Date</th>
                <th>Status</th>
                <th>Bids</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {getSortedOpportunities().map((opportunity) => {
                const opportunityBids = getBidsForOpportunity(opportunity.id);
                const lowestBid = getLowestBidAmount(opportunity.id);
                
                return (
                  <tr key={opportunity.id} className="table-row">
                    <td className="table-cell">
                      <div className="table-cell-title">{opportunity.title}</div>
                    </td>
                    <td className="table-cell">
                      <div className="table-cell-title">{opportunity.lpa}</div>
                      <div className="table-cell-subtitle">{opportunity.nca}</div>
                    </td>
                    <td className="table-cell">
                      <div className="table-cell-content">
                        {formatHabitatRequirements(opportunity.habitatRequirements)}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="table-cell-content">
                        {formatDate(opportunity.closingDate)}
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className={`status-badge ${opportunity.status === 'active' ? 'status-active' : 'status-closed'}`}>
                        {opportunity.status}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="table-cell-title">{opportunityBids.length} bid(s)</div>
                      {lowestBid && (
                        <div className="table-cell-subtitle">
                          Lowest: £{lowestBid.toLocaleString()}
                        </div>
                      )}
                    </td>
                    <td className="table-cell">
                      <div className="action-buttons">
                        <button
                          onClick={() => handleViewBids(opportunity)}
                          className="action-button view"
                          title="View Bids"
                        >
                          <Eye size={16} />
                        </button>
                        {opportunity.status === 'active' && (
                          <button
                            onClick={() => handleCloseOpportunityClick(opportunity.id)}
                            className="action-button close"
                            title="Close Opportunity"
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

      {/* ENHANCED: Manual Close Confirmation Modal */}
      {showCloseConfirmation && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2 className="modal-title">
                <AlertTriangle size={24} style={{ color: '#f59e0b', marginRight: '8px' }} />
                Confirm Manual Close
              </h2>
              <button
                onClick={() => setShowCloseConfirmation(false)}
                className="modal-close"
              >
                <X size={24} />
              </button>
            </div>
            
            <div style={{ padding: '24px' }}>
              <div style={{ 
                backgroundColor: '#fef3c7', 
                border: '1px solid #f59e0b', 
                borderRadius: '8px', 
                padding: '16px', 
                marginBottom: '24px' 
              }}>
                <p style={{ color: '#92400e', fontWeight: '500', margin: 0 }}>
                  ⚠️ You are about to manually close this opportunity. This action cannot be undone.
                </p>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  fontWeight: '600', 
                  marginBottom: '12px',
                  color: '#374151'
                }}>
                  Reason for Manual Close: *
                </label>
                {MANUAL_CLOSE_REASONS.map((reason) => (
                  <div key={reason.value} style={{ marginBottom: '12px' }}>
                    <label style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      cursor: 'pointer',
                      padding: '12px',
                      border: closeReason === reason.value ? '2px solid #2563eb' : '1px solid #d1d5db',
                      borderRadius: '8px',
                      backgroundColor: closeReason === reason.value ? '#dbeafe' : 'white'
                    }}>
                      <input
                        type="radio"
                        value={reason.value}
                        checked={closeReason === reason.value}
                        onChange={(e) => setCloseReason(e.target.value)}
                        style={{ marginTop: '2px' }}
                      />
                      <div>
                        <div style={{ fontWeight: '500', color: '#374151' }}>{reason.label}</div>
                        <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                          {reason.description}
                        </div>
                        <div style={{ 
                          fontSize: '13px', 
                          color: '#059669', 
                          marginTop: '6px',
                          fontStyle: 'italic'
                        }}>
                          User message: "{reason.userMessage}"
                        </div>
                        {!reason.determineWinners && (
                          <div style={{ 
                            fontSize: '12px', 
                            color: '#dc2626', 
                            marginTop: '4px',
                            fontWeight: '500'
                          }}>
                            ⚠️ No winners will be determined
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  fontWeight: '600', 
                  marginBottom: '8px',
                  color: '#374151'
                }}>
                  Additional Details (Optional):
                </label>
                <textarea
                  value={closeReasonDetails}
                  onChange={(e) => setCloseReasonDetails(e.target.value)}
                  placeholder="Add any additional context or details about this closure..."
                  style={{
                    width: '100%',
                    minHeight: '80px',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
                <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>
                  These details will be included in the notification emails to bidders
                </p>
              </div>
            </div>

            <div className="modal-actions">
              <button
                onClick={() => setShowCloseConfirmation(false)}
                className="cancel-button"
              >
                Cancel
              </button>
              <button
                onClick={confirmCloseOpportunity}
                disabled={!closeReason || loading}
                className="submit-button"
                style={{
                  backgroundColor: closeReason ? '#dc2626' : '#9ca3af',
                  borderColor: closeReason ? '#dc2626' : '#9ca3af'
                }}
              >
                {loading ? 'Closing...' : (
                  <>
                    <CheckCircle size={16} style={{ marginRight: '6px' }} />
                    Confirm Close
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bids Modal */}
      {showBidsModal && selectedOpportunity && (
        <div className="modal-overlay">
          <div className="modal-content">
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
            
            <div className="habitat-requirements-display">
              <h3 className="habitat-requirements-title">Habitat Requirements:</h3>
              <div>
                {selectedOpportunity.habitatRequirements?.map((req, index) => (
                  <div key={index} className="habitat-requirement-item">
                    <strong>{req.broadHabitat}</strong> → {req.specificHabitat}: {req.unitsRequired} units
                  </div>
                )) || 'No habitat requirements specified'}
              </div>
            </div>
            
            <div>
              {getBidsForOpportunity(selectedOpportunity.id).map((bid) => (
                <div key={bid.id} className="bid-item">
                  <div className="bid-content">
                    <div>
                      <p className="bid-amount">
                        £{bid.bidAmount?.toLocaleString()}
                      </p>
                      <p className="bid-date">
                        Submitted: {formatDate(bid.createdAt)}
                      </p>
                      {bid.updatedAt && bid.updatedAt !== bid.createdAt && (
                        <p className="bid-date">
                          Updated: {formatDate(bid.updatedAt)}
                        </p>
                      )}
                    </div>
                    {bid.isWinning && (
                      <span className="winner-badge">
                        Winner
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPanel;