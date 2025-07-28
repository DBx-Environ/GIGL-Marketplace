// src/components/admin/OpportunitiesTab.js - Syntax & Validation Fix
import React, { useState, useMemo } from 'react';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../firebase/config'; // Import functions from config
import { useForm, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { toast } from 'react-toastify';
import { Plus, X, Eye, Calendar, MapPin, Leaf, CheckCircle, Search, RefreshCcw } from 'lucide-react';
// Import helper functions and options from the new utility file
import {
  formatDate,
  getBidStatus,
  LPA_OPTIONS,
  NCA_OPTIONS
} from '../../utils/bidHelpers';
import { WFD_OPTIONS } from '../../utils/wfdOptions'; // Import WFD_OPTIONS

// Keep existing HABITAT_MAPPING local as it's specific to this form
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

// Closure reason options from premodular AdminPanel - kept for closing opportunities functionality
const CLOSURE_REASONS = [
  {
    value: 'error',
    label: 'Error in Bidding Process',
    description: 'There was an error or issue with the bidding process that requires closure',
    userMessage: 'We have identified an issue with the bidding process for this opportunity. We sincerely apologize for any inconvenience. No winners will be determined.',
    determineWinners: false,
    emailType: 'error'
  },
  {
    value: 'buyer_withdrawal',
    label: 'Buyer Withdrawal',
    description: 'The buyer has withdrawn from this opportunity',
    userMessage: 'Unfortunately, the buyer has decided to withdraw from this opportunity. We apologize for any inconvenience this has caused you.',
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

// Form validation schema
const schema = yup.object().shape({
  title: yup.string().required('Title is required'),
  lpa: yup.string().required('LPA is required'),
  nca: yup.string().required('NCA is required'),
  wfd: yup.string().when('habitatRequirements', {
    is: (habitatRequirements) =>
      habitatRequirements &&
      habitatRequirements.some((hr) => hr.broadHabitat === 'Watercourse'),
    then: (schema) => schema.required('WFD Op Catchment is required if Watercourse habitat is specified'),
    otherwise: (schema) => schema.notRequired(),
  }),
  closingDate: yup.date().required('Closing date is required').min(new Date(), 'Closing date must be in the future'),
  habitatRequirements: yup.array().of(
    yup.object().shape({
      broadHabitat: yup.string().required('Broad habitat is required'),
      specificHabitat: yup.string().required('Specific habitat is required'),
      unitsRequired: yup.number()
        .typeError('Units needed is required')
        .required('Units needed is required')
        .min(0.01, 'Must be at least 0.01')
    })
  ).min(1, 'At least one habitat requirement is required')
});


function OpportunitiesTab({
  opportunities,
  opportunitiesData,
  bids,
  bidsData,
  users,
  usersData,
  loading
}) {
  // State for form and UI
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);

  // State for filters
  const [lpaFilter, setLpaFilter] = useState('');
  const [ncaFilter, setNcaFilter] = useState('');
  const [wfdFilter, setWfdFilter] = useState(''); // New WFD filter state
  const [statusFilter, setStatusFilter] = useState('');
  const [searchText, setSearchText] = useState('');

  // State for bid modal
  const [showBidsModal, setShowBidsModal] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [modalBids, setModalBids] = useState([]);
  const [modalUsers, setModalUsers] = useState({});

  // State for close confirmation modal
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);
  const [closeOpportunityId, setCloseOpportunityId] = useState(null);
  const [closeReason, setCloseReason] = useState('');
  const [closeReasonDetails, setCloseReasonDetails] = useState('');

  // Form setup
  const { register, handleSubmit, formState, reset, control, watch, setValue, trigger, clearErrors } = useForm({
    resolver: yupResolver(schema),
    mode: 'onSubmit',
    defaultValues: {
      habitatRequirements: [{ broadHabitat: '', specificHabitat: '', unitsRequired: '' }],
      closingDate: (() => {
        const date = new Date();
        date.setDate(date.getDate() + 7);
        return date.toISOString().slice(0, 16);
      })(),
      wfd: '' // Initialize WFD field
    }
  });

  const { errors } = formState;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "habitatRequirements"
  });

  const watchedHabitats = watch("habitatRequirements");
  const watchedWFD = watch("wfd"); // Watch WFD field for validation triggering

  // Effect to trigger WFD validation when habitat requirements change
  // This is crucial for the conditional validation of the WFD field
  React.useEffect(() => {
    trigger('wfd');
  }, [watchedHabitats, trigger]);


  /**
   * Determine if any filters are currently applied
   */
  const areFiltersApplied = useMemo(() => {
    return lpaFilter !== '' || ncaFilter !== '' || wfdFilter !== '' || statusFilter !== '' || searchText !== '';
  }, [lpaFilter, ncaFilter, wfdFilter, statusFilter, searchText]); // Include wfdFilter

  /**
   * Determine if the last habitat row is valid to enable adding a new one
   * Checks if all required fields in the last row are filled and have no errors.
   */
  const isLastHabitatRowValid = useMemo(() => {
    if (fields.length === 0) return true;

    const lastIndex = fields.length - 1;
    const lastHabitat = watchedHabitats[lastIndex];

    const broadHabitatValid = lastHabitat?.broadHabitat && lastHabitat.broadHabitat.trim() !== '';
    const specificHabitatValid = lastHabitat?.specificHabitat && lastHabitat.specificHabitat.trim() !== '';
    const unitsRequiredValue = parseFloat(lastHabitat?.unitsRequired);
    const unitsRequiredValid = !isNaN(unitsRequiredValue) && unitsRequiredValue > 0;

    // Check if there are RHF errors for the specific fields in the last row
    const hasErrorsOnLastRowFields =
      errors.habitatRequirements?.[lastIndex]?.broadHabitat ||
      errors.habitatRequirements?.[lastIndex]?.specificHabitat ||
      errors.habitatRequirements?.[lastIndex]?.unitsRequired;

    return broadHabitatValid && specificHabitatValid && unitsRequiredValid && !hasErrorsOnLastRowFields;
  }, [watchedHabitats, fields, errors.habitatRequirements]);

  /**
   * Handle broad habitat change to update specific habitat options and trigger validation
   */
  const handleBroadHabitatChange = (index, broadHabitat) => {
    setValue(`habitatRequirements.${index}.broadHabitat`, broadHabitat);
    setValue(`habitatRequirements.${index}.specificHabitat`, ''); // Clear specific habitat when broad changes
    clearErrors(`habitatRequirements.${index}.specificHabitat`);
    // Trigger validation for all fields in the row for more reliable state update
    trigger([
      `habitatRequirements.${index}.broadHabitat`,
      `habitatRequirements.${index}.specificHabitat`,
      `habitatRequirements.${index}.unitsRequired`
    ]);
    // Also trigger WFD validation if broad habitat changes to or from 'Watercourse'
    trigger('wfd');
  };

  /**
   * Handle specific habitat change to trigger validation
   */
  const handleSpecificHabitatChange = (index, specificHabitat) => {
    setValue(`habitatRequirements.${index}.specificHabitat`, specificHabitat);
    // Trigger validation for all fields in the row for more reliable state update
    trigger([
      `habitatRequirements.${index}.specificHabitat`,
      `habitatRequirements.${index}.unitsRequired`
    ]);
  };

  /**
   * Handle units required change to trigger validation
   */
  const handleUnitsRequiredChange = (index, value) => {
    setValue(`habitatRequirements.${index}.unitsRequired`, value);
    trigger(`habitatRequirements.${index}.unitsRequired`);
  };

  /**
   * Create new opportunity
   */
  const onSubmit = async (data) => {
    try {
      setCreating(true);

      await addDoc(collection(db, 'bidOpportunities'), {
        ...data,
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      toast.success('Opportunity created successfully!');
      reset();
      setShowCreateForm(false);
    } catch (error) {
      console.error('Error creating opportunity:', error);
      toast.error('Failed to create opportunity');
    } finally {
      setCreating(false);
    }
  };

  /**
   * Handle viewing bids for an opportunity
   */
  const handleViewBids = async (opportunity) => {
    setSelectedOpportunity(opportunity);

    // Get bids for this opportunity (excluding withdrawn bids)
    const opportunityBids = bidsData.filter(bid =>
      bid.opportunityId === opportunity.id &&
      bid.status !== 'withdrawn'
    );

    // Load user data for each bid
    const userPromises = opportunityBids.map(async (bid) => {
      try {
        const userDoc = await getDoc(doc(db, 'users', bid.userId));
        if (userDoc.exists()) {
          return { userId: bid.userId, userData: userDoc.data() };
        }
        return { userId: bid.userId, userData: null };
      } catch (error) {
        console.error('Error loading user data for bid:', bid.id, error);
        return { userId: bid.userId, userData: null };
      }
    });

    try {
      const userResults = await Promise.all(userPromises);
      const usersMap = {};
      userResults.forEach(result => {
        if (result.userData) {
          usersMap[result.userId] = result.userData;
        }
      });

      setModalUsers(usersMap);
      setModalBids(opportunityBids);
      setShowBidsModal(true);
    } catch (error) {
      console.error('Error loading bid user data:', error);
      toast.error('Error loading bid details');
    }
  };

  /**
   * Get bidder name from user data
   */
  const getBidderName = (bid) => {
    const userData = modalUsers[bid.userId];
    if (userData && userData.firstName && userData.lastName) {
      return `${userData.firstName} ${userData.lastName}`;
    }
    return 'Bidder unknown';
  };

  /**
   * Get display-friendly close reason
   */
  const getDisplayCloseReason = (opportunity) => {
    if (opportunity.status !== 'closed') {
      return '-';
    }

    if (!opportunity.closeReason) {
      return 'System';
    }

    const reason = opportunity.closeReason.toLowerCase();

    if (reason === 'error') return 'Error';
    if (reason === 'buyer_withdrawal') return 'Buyer Withdrawal';
    if (reason === 'early_close') return 'Early Close';
    if (reason.includes('automatic') || reason.includes('time') || reason.includes('expired')) return 'Autoclosed';

    return 'Manual Close';
  };

  /**
   * Get bids for a specific opportunity (excluding withdrawn bids)
   */
  const getBidsForOpportunity = (opportunityId) => {
    return bidsData.filter(bid => bid.opportunityId === opportunityId && bid.status !== 'withdrawn');
  };

  /**
   * Get lowest bid amount for an opportunity
   */
  const getLowestBidAmount = (opportunityId) => {
    const opportunityBids = getBidsForOpportunity(opportunityId);
    if (opportunityBids.length === 0) return null;
    return Math.min(...opportunityBids.map(bid => bid.bidAmount));
  };

  /**
   * Handle manual opportunity closure
   */
  const handleCloseOpportunity = (opportunityId) => {
    setCloseOpportunityId(opportunityId);
    setShowCloseConfirmation(true);
  };

  /**
   * Confirm and execute opportunity closure
   */
  const confirmCloseOpportunity = async () => {
    if (!closeReason || !closeOpportunityId) return;

    try {
      setCreating(true);

      const closeBidOpportunity = httpsCallable(functions, 'closeBidOpportunity');

      const selectedReason = CLOSURE_REASONS.find(r => r.value === closeReason);

      const result = await closeBidOpportunity({
        opportunityId: closeOpportunityId,
        reason: closeReason,
        reasonDetails: closeReasonDetails || ''
      });

      if (result.data && result.data.success) {
        toast.success(`Opportunity closed successfully (${selectedReason.label})`);
        setShowCloseConfirmation(false);
        setCloseOpportunityId(null);
        setCloseReason('');
        setCloseReasonDetails('');
      } else {
        const errorMsg = result.data?.error || 'Unknown error occurred';
        toast.error('Failed to close opportunity: ' + errorMsg);
      }
    } catch (error) {
      console.error('Error closing opportunity:', error);
      toast.error('Failed to close opportunity: ' + (error.message || 'Unknown error'));
    } finally {
      setCreating(false);
    }
  };

  /**
   * Filter opportunities based on current filter settings
   */
  const filteredOpportunities = useMemo(() => {
    if (!opportunitiesData || !Array.isArray(opportunitiesData)) return [];

    return opportunitiesData.filter(opp => {
      const matchesLPA = lpaFilter === '' || opp.lpa === lpaFilter;
      const matchesNCA = ncaFilter === '' || opp.nca === ncaFilter;
      const matchesWFD = wfdFilter === '' || opp.wfd === wfdFilter; // New WFD filter logic
      const matchesStatus = statusFilter === '' || opp.status === statusFilter;

      const searchLower = searchText.toLowerCase();
      const matchesSearch = (
        opp.title?.toLowerCase().includes(searchLower) ||
        opp.lpa?.toLowerCase().includes(searchLower) ||
        opp.nca?.toLowerCase().includes(searchLower) ||
        opp.wfd?.toLowerCase().includes(searchLower) // Include WFD in search
      );

      return matchesLPA && matchesNCA && matchesWFD && matchesStatus && matchesSearch; // Include WFD in overall filter check
    });
  }, [opportunitiesData, lpaFilter, ncaFilter, wfdFilter, statusFilter, searchText]); // Include wfdFilter

  /**
   * Clear all filters
   */
  const clearFilters = () => {
    setLpaFilter('');
    setNcaFilter('');
    setWfdFilter(''); // Clear WFD filter
    setStatusFilter('');
    setSearchText('');
  };

  /**
   * Get opportunity statistics
   */
  const getOpportunityStats = () => {
    const active = opportunitiesData.filter(opp => opp.status === 'active').length;
    const closed = opportunitiesData.filter(opp => opp.status === 'closed').length;
    const totalBids = bidsData.filter(bid => bid.status !== 'withdrawn').length;
    return { active, closed, totalBids };
  };

  if (loading && (!opportunitiesData || opportunitiesData.length === 0)) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner"></div>
        <p>Loading opportunities...</p>
      </div>
    );
  }

  const stats = getOpportunityStats();

  return (
    <div className="opportunities-tab">
      <h2 className="tab-section-title">Opportunity Overview</h2>
      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon stat-icon-blue">
            <Calendar size={24} />
          </div>
          <div className="stat-details">
            <div className="stat-label">Active Opportunities</div>
            <div className="stat-value">{stats.active}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-green">
            <CheckCircle size={24} />
          </div>
          <div className="stat-details">
            <div className="stat-label">Closed Opportunities</div>
            <div className="stat-value">{stats.closed}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-purple">
            <Leaf size={24} />
          </div>
          <div className="stat-details">
            <div className="stat-label">Total Bids</div>
            <div className="stat-value">{stats.totalBids}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-red">
            <MapPin size={24} />
          </div>
          <div className="stat-details">
            <div className="stat-label">Total Opportunities</div>
            <div className="stat-value">{opportunitiesData.length}</div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="opportunities-actions">
        <button
          onClick={() => setShowCreateForm(true)}
          className="btn btn-primary"
        >
          <Plus size={18} />
          Create Opportunity
        </button>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="search-input-group" style={{ flexGrow: 1, minWidth: '200px' }}> {/* Adjusted width */}
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search by title, LPA, NCA, WFD..." // Updated placeholder
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-group">
          <label htmlFor="filterLPA" className="filter-label">LPA:</label>
          <select
            id="filterLPA"
            value={lpaFilter}
            onChange={(e) => setLpaFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">All LPAs</option>
            {LPA_OPTIONS.map(lpa => (
              <option key={lpa} value={lpa}>{lpa}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="filterNCA" className="filter-label">NCA:</label>
          <select
            id="filterNCA"
            value={ncaFilter}
            onChange={(e) => setNcaFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">All NCAs</option>
            {NCA_OPTIONS.map(nca => (
              <option key={nca} value={nca}>{nca}</option>
            ))}
          </select>
        </div>

        <div className="filter-group"> {/* New WFD filter */}
          <label htmlFor="filterWFD" className="filter-label">WFD:</label>
          <select
            id="filterWFD"
            value={wfdFilter}
            onChange={(e) => setWfdFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">All WFD Op Catchments</option>
            {WFD_OPTIONS.map(wfd => (
              <option key={wfd} value={wfd}>{wfd}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="filterStatus" className="filter-label">Status:</label>
          <select
            id="filterStatus"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        {areFiltersApplied && (
          <button
            onClick={clearFilters}
            className="btn btn-outline btn-sm clear-filter-btn"
          >
            <RefreshCcw size={16} /> Clear Filters
          </button>
        )}
      </div>

      {/* Opportunities Table */}
      <div className="table-container admin-table-container">
        <table className="table admin-table">
          <thead>
            <tr>
              <th>Actions</th>
              <th>Title</th>
              <th>LPA</th>
              <th>NCA</th>
              <th>WFD Op Catchment</th> {/* New column heading */}
              <th>Status</th>
              <th>Closure Date</th>
              <th>Reason for Close</th>
              <th>Bids</th>
              <th>Lowest Bid</th>
            </tr>
          </thead>
          <tbody>
            {filteredOpportunities.length === 0 ? (
              <tr>
                <td colSpan="10" className="empty-state-cell"> {/* Updated colspan */}
                  No opportunities found matching your filters
                </td>
              </tr>
            ) : (
              filteredOpportunities.map((opportunity) => {
                const bidCount = getBidsForOpportunity(opportunity.id).length;
                const lowestBid = getLowestBidAmount(opportunity.id);

                // Determine status badge color based on status string
                const statusColorClass = opportunity.status === 'active' ? 'status-active' : 'status-closed';

                // Determine the correct date to display based on opportunity status
                const displayDate = opportunity.status === 'closed' && opportunity.closedAt
                  ? opportunity.closedAt
                  : opportunity.closingDate;

                return (
                  <tr key={opportunity.id}>
                    <td className="admin-table-actions">
                      <button
                        onClick={() => handleViewBids(opportunity)}
                        className="action-button view"
                        title="View Bids"
                      >
                        <Eye size={18} />
                      </button>

                      {opportunity.status === 'active' && (
                        <button
                          onClick={() => handleCloseOpportunity(opportunity.id)}
                          className="action-button delete"
                          title="Close Opportunity"
                        >
                          <X size={18} />
                        </button>
                      )}
                    </td>
                    <td>{opportunity.title}</td>
                    <td>{opportunity.lpa}</td>
                    <td>{opportunity.nca}</td>
                    <td>{opportunity.wfd || 'N/A'}</td> {/* Display WFD */}
                    <td>
                      <span className={`status-badge ${statusColorClass}`}>
                        {opportunity.status}
                      </span>
                    </td>
                    <td>
                      {displayDate ? formatDate(displayDate) : '-'}
                    </td>
                    <td>{getDisplayCloseReason(opportunity)}</td>
                    <td>{bidCount}</td>
                    <td>{lowestBid ? `£${lowestBid.toLocaleString()}` : '-'}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create Form Modal */}
      {showCreateForm && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '1000px', width: '90%' }}>
            <div className="modal-header">
              <h2 className="modal-title">Create New Opportunity</h2>
              <button
                onClick={() => setShowCreateForm(false)}
                className="modal-close"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="modal-content opportunity-form">
              {/* Line 1: Title and Closing Date */}
              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="form-label">Title *</label>
                  <input
                    type="text"
                    {...register('title')}
                    placeholder="Enter opportunity title"
                    className={`form-input ${errors.title ? 'error' : ''}`}
                  />
                  {errors.title && <span className="form-error">{errors.title.message}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Closing Date *</label>
                  <input
                    type="datetime-local"
                    {...register('closingDate')}
                    className={`form-input ${errors.closingDate ? 'error' : ''}`}
                  />
                  {errors.closingDate && <span className="form-error">{errors.closingDate.message}</span>}
                </div>
              </div>

              {/* Line 2: LPA, NCA, WFD */}
              <div className="form-grid form-grid-3"> {/* Changed to form-grid-3 */}
                <div className="form-group">
                  <label className="form-label">LPA *</label>
                  <select {...register('lpa')} className={`form-input ${errors.lpa ? 'error' : ''}`}>
                    <option value="">Select LPA</option>
                    {LPA_OPTIONS.map(lpa => (
                      <option key={lpa} value={lpa}>{lpa}</option>
                    ))}
                  </select>
                  {errors.lpa && <span className="form-error">{errors.lpa.message}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">NCA *</label>
                  <select {...register('nca')} className={`form-input ${errors.nca ? 'error' : ''}`}>
                    <option value="">Select NCA</option>
                    {NCA_OPTIONS.map(nca => (
                      <option key={nca} value={nca}>{nca}</option>
                    ))}
                  </select>
                  {errors.nca && <span className="form-error">{errors.nca.message}</span>}
                </div>

                <div className="form-group"> {/* New WFD dropdown */}
                  <label className="form-label">WFD Op Catchment {errors.wfd ? '*' : ''}</label> {/* Conditional asterisk */}
                  <select {...register('wfd')} className={`form-input ${errors.wfd ? 'error' : ''}`}>
                    <option value="">Select WFD Op Catchment</option>
                    {WFD_OPTIONS.map(wfd => (
                      <option key={wfd} value={wfd}>{wfd}</option>
                    ))}
                  </select>
                  {errors.wfd && <span className="form-error">{errors.wfd.message}</span>}
                </div>
              </div>

              {/* Line 3: Habitat Requirements heading */}
              <div className="habitat-section">
                <h3 className="profile-section-title"><Leaf size={18} /> Habitat Requirements</h3>

                {/* Line 4+: Habitat requirements */}
                {fields.map((field, index) => (
                  <div key={field.id} className="habitat-item">
                    <div className="form-grid habitat-row">
                      <div className="form-group">
                        <label className="form-label">Broad Habitat *</label>
                        <select
                          {...register(`habitatRequirements.${index}.broadHabitat`)}
                          onChange={(e) => handleBroadHabitatChange(index, e.target.value)}
                          className={`form-input ${errors.habitatRequirements?.[index]?.broadHabitat ? 'error' : ''}`}
                        >
                          <option value="">Select Broad Habitat</option>
                          {Object.keys(HABITAT_MAPPING).map(habitat => (
                            <option key={habitat} value={habitat}>{habitat}</option>
                          ))}
                        </select>
                        {errors.habitatRequirements?.[index]?.broadHabitat &&
                          <span className="form-error">{errors.habitatRequirements?.[index]?.broadHabitat?.message}</span>}
                      </div>

                      <div className="form-group">
                        <label className="form-label">Specific Habitat *</label>
                        <select
                          value={watchedHabitats[index]?.specificHabitat || ''}
                          onChange={(e) => handleSpecificHabitatChange(index, e.target.value)}
                          className={`form-input ${errors.habitatRequirements?.[index]?.specificHabitat ? 'error' : ''}`}
                          disabled={!watchedHabitats[index]?.broadHabitat}
                        >
                          <option value="">Select Specific Habitat</option>
                          {watchedHabitats[index]?.broadHabitat &&
                           HABITAT_MAPPING[watchedHabitats[index].broadHabitat]?.map(specific => (
                            <option key={specific} value={specific}>{specific}</option>
                          ))}
                        </select>
                        {errors.habitatRequirements?.[index]?.specificHabitat &&
                          <span className="form-error">{errors.habitatRequirements?.[index]?.specificHabitat?.message}</span>}
                      </div>

                      <div className="form-group">
                        <label className="form-label">Units Needed *</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          {...register(`habitatRequirements.${index}.unitsRequired`)}
                          onChange={(e) => handleUnitsRequiredChange(index, e.target.value)}
                          className={`form-input ${errors.habitatRequirements?.[index]?.unitsRequired ? 'error' : ''}`}
                        />
                        {errors.habitatRequirements?.[index]?.unitsRequired &&
                          <span className="form-error">{errors.habitatRequirements?.[index]?.unitsRequired?.message}</span>}
                      </div>

                      <div className="form-group remove-habitat-button-group">
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          disabled={fields.length === 1}
                          className="btn btn-danger btn-sm"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => append({ broadHabitat: '', specificHabitat: '', unitsRequired: '' })}
                  disabled={!isLastHabitatRowValid}
                  className="btn btn-primary"
                >
                  <Plus size={16} />
                  Add Habitat Requirement
                </button>
              </div>

              {/* Form Actions */}
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={creating}
                  className="btn btn-secondary"
                >
                  {creating ? 'Creating...' : 'Create Opportunity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bids Modal - FIXED to show proper bidder names and status */}
      {showBidsModal && selectedOpportunity && (
        <div className="modal-overlay">
          <div className="modal user-bids-modal">
            <div className="modal-header">
              <h2 className="modal-title">Bids for: {selectedOpportunity.title}</h2>
              <button
                onClick={() => setShowBidsModal(false)}
                className="modal-close"
              >
                <X size={24} />
              </button>
            </div>

            <div className="modal-content">
              <div className="habitat-requirements-display">
                <h3>Habitat Requirements:</h3>
                <div>
                  {selectedOpportunity.habitatRequirements?.map((req, index) => (
                    <div key={index} className="habitat-requirement-item">
                      <strong>{req.broadHabitat}</strong> → {req.specificHabitat}: {req.unitsRequired} units
                    </div>
                  )) || 'No habitat requirements specified'}
                </div>
              </div>

              <div className="bids-list">
                {modalBids.length === 0 ? (
                  <p className="empty-state-text">No bids received for this opportunity</p>
                ) : (
                  modalBids.map((bid) => {
                    // Use getBidStatus from bidHelpers, passing opportunitiesData
                    const bidStatus = getBidStatus(bid, opportunitiesData);
                    // Determine status badge class based on status string from bidHelpers
                    let statusBadgeClass = '';
                    if (bidStatus === 'Active') statusBadgeClass = 'status-active';
                    else if (bidStatus === 'Overall Winner' || bidStatus === 'Won' || bidStatus.includes('Won')) statusBadgeClass = 'status-won';
                    else if (bidStatus === 'Not Selected' || bidStatus === 'Expired') statusBadgeClass = 'status-not-selected';
                    else if (bidStatus === 'Withdrawn') statusBadgeClass = 'status-withdrawn';


                    return (
                      <div key={bid.id} className="bid-item">
                        {/* Line 1: Name and Total Bid Value */}
                        <div className="bid-header-row">
                          <div className="bidder-info">
                            <strong className="bidder-name">
                              {getBidderName(bid)}
                            </strong>
                            <span className="bid-amount-total">
                              £{bid.bidAmount?.toLocaleString()}
                            </span>
                          </div>
                          <span
                            className={`status-badge ${statusBadgeClass}`}
                          >
                            {bidStatus}
                          </span>
                        </div>

                        {/* Additional Bid Details (Date Placed) */}
                        <div className="bid-meta-info">
                          <span>Placed: {formatDate(bid.createdAt)}</span>
                          {selectedOpportunity && <span> | Closure Date: {formatDate(selectedOpportunity.status === 'closed' && selectedOpportunity.closedAt ? selectedOpportunity.closedAt : selectedOpportunity.closingDate)}</span>}
                        </div>

                        {/* Line 2+: Habitat details */}
                        <div className="habitat-bids-details">
                          {bid.habitatBids && bid.habitatBids.length > 0 ? (
                            bid.habitatBids.map((habitat, index) => {
                                // Check if this specific habitat was a winner
                                const isHabitatWinner = bid.habitatWins?.[habitat.specificHabitat]?.isWinner;
                                return (
                                    <div key={index} className={`habitat-bid-item ${isHabitatWinner ? 'winning-habitat-row' : ''}`}>
                                        <span>
                                            <strong>{habitat.specificHabitat}</strong>
                                        </span>
                                        <span>
                                            {habitat.bidType === 'no-bid' ? (
                                                <em className="no-bid-text">No bid</em>
                                            ) : (
                                                <span className="price-per-unit">
                                                    £{habitat.pricePerUnit?.toLocaleString()}/unit
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                );
                            })
                          ) : (
                            <div className="no-habitat-details">
                              No habitat details available
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bid Closure Confirmation Modal */}
      {showCloseConfirmation && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '700px', width: '90%' }}>
            <div className="modal-header">
              <h2 className="modal-title">Close Opportunity</h2>
              <button
                onClick={() => setShowCloseConfirmation(false)}
                className="modal-close"
              >
                <X size={24} />
              </button>
            </div>

            <div className="modal-content close-confirmation-content">
              <p>
                Please select a reason for closing this opportunity:
              </p>

              <div>
                {CLOSURE_REASONS.map((reason) => (
                  <div key={reason.value} className="close-reason-option">
                    <label>
                      <input
                        type="radio"
                        name="closeReason"
                        value={reason.value}
                        checked={closeReason === reason.value}
                        onChange={(e) => setCloseReason(e.target.value)}
                      />
                      <div className="reason-details">
                        <div className="reason-label">{reason.label}</div>
                        <div className="reason-description">{reason.description}</div>
                        <div className="reason-user-message">
                          Message to bidders: "{reason.userMessage}"
                        </div>
                        {!reason.determineWinners && (
                          <div className="no-winners-warning">
                            ⚠️ No winners will be determined
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                ))}
              </div>

              <div className="form-group">
                <label className="form-label">
                  Additional Details (Optional):
                </label>
                <textarea
                  value={closeReasonDetails}
                  onChange={(e) => setCloseReasonDetails(e.target.value)}
                  placeholder="Add any additional context or details about this closure..."
                  className="form-input"
                />
                <p className="form-help-text">
                  These details will be included in the notification emails to bidders
                </p>
              </div>
            </div>

            <div className="modal-actions">
              <button
                onClick={() => setShowCloseConfirmation(false)}
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button
                onClick={confirmCloseOpportunity}
                disabled={!closeReason || creating}
                className="btn btn-danger"
              >
                {creating ? 'Closing...' : (
                  <>
                    <CheckCircle size={16} />
                    Confirm Close
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OpportunitiesTab;
