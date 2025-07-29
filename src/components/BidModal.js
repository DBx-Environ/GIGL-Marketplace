// src/components/BidModal.js - FIXED VERSION WITH SCROLL PROTECTION
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { doc, addDoc, updateDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config'; // Corrected import syntax
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import { X, Trash2 } from 'lucide-react';
import './BidModal.css'; // Assuming this CSS file exists and can be modified for styling

// Re-import the new location helper functions for frontend display calculations
import {
  getLocationClassification,
  getAdjustedUnitsRequired,
} from '../utils/locationHelpers';

// Validation schema that handles undefined pricePerUnit for no-bid
const schema = yup.object().shape({
  habitatBids: yup.array().of(
    yup.object().shape({
      bidType: yup.string().required('Please select bid type'),
      pricePerUnit: yup.mixed().when('bidType', {
        is: 'bid',
        then: (schema) => yup.mixed()
          .required('Price per unit is required')
          .test('is-number', 'Price must be a valid number', value => {
            const num = parseFloat(value);
            return !isNaN(num) && num > 0;
          })
          .test('increment', 'Price must be in increments of £10', value => {
            const num = parseFloat(value);
            return !isNaN(num) && num % 10 === 0;
          }),
        otherwise: (schema) => yup.mixed().notRequired().nullable()
      })
    })
  ).test('habitat-requirements', 'You must address all habitat types and place at least one bid', function(value) {
    if (!value || !Array.isArray(value)) return false;
    
    // Count addressed habitats (either bid or no-bid)
    const addressedHabitats = value.filter(bid => 
      bid.bidType === 'bid' || bid.bidType === 'no-bid'
    ).length;
    
    // Count valid bids
    const validBids = value.filter(bid => {
      if (bid.bidType !== 'bid') return false;
      const price = parseFloat(bid.pricePerUnit || 0);
      return !isNaN(price) && price > 0;
    }).length;
    
    return addressedHabitats === value.length && validBids > 0;
  })
});

function BidModal({ opportunity, existingBid, onClose }) {
  const { currentUser, userData } = useAuth(); // Get userData from AuthContext
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Helper to safely convert Firebase Timestamp or string to Date object
  const getDisplayDate = (dateValue) => {
    if (!dateValue) return null;
    if (dateValue.toDate && typeof dateValue.toDate === 'function') {
      return dateValue.toDate();
    }
    if (typeof dateValue === 'string') {
      return new Date(dateValue);
    }
    return dateValue; // Assume it's already a Date object
  };

  // Better default values handling for existing bids
  const getDefaultValues = () => {
    if (existingBid?.habitatBids && opportunity.habitatRequirements) {
      // Map existing bid data to form structure
      return {
        habitatBids: opportunity.habitatRequirements.map((req, index) => {
          const existingHabitatBid = existingBid.habitatBids.find(
            hb => hb.specificHabitat === req.specificHabitat
          );
          
          if (existingHabitatBid) {
            return {
              bidType: existingHabitatBid.bidType || 'bid',
              // Use the original pricePerUnit from the existing bid for display
              pricePerUnit: existingHabitatBid.pricePerUnit || 
                          (existingHabitatBid.subtotal && existingHabitatBid.unitsRequired ? 
                           existingHabitatBid.subtotal / existingHabitatBid.unitsRequired : ''),
              // Include the pre-calculated values for display (if available from existing bid)
              locationClassification: existingHabitatBid.locationClassification,
              adjustedUnitsToSupply: existingHabitatBid.adjustedUnitsToSupply,
              effectivePricePerUnitForBuyer: existingHabitatBid.effectivePricePerUnitForBuyer,
              subtotal: existingHabitatBid.subtotal // Ensure subtotal is also carried over
            };
          } else {
            // Default for new habitat requirements
            return { bidType: '', pricePerUnit: '' };
          }
        })
      };
    } else {
      // Default for new bids
      return {
        habitatBids: opportunity.habitatRequirements?.map(() => ({ 
          bidType: '', 
          pricePerUnit: '' 
        })) || [{ bidType: '', pricePerUnit: '' }]
      };
    }
  };

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm({
    resolver: yupResolver(schema),
    mode: 'onSubmit',
    defaultValues: getDefaultValues()
  });

  const watchedBids = watch('habitatBids');

  // Clear pricePerUnit when switching to no-bid
  useEffect(() => {
    if (watchedBids && opportunity.habitatRequirements) {
      watchedBids.forEach((bid, index) => {
        if (bid.bidType === 'no-bid' && bid.pricePerUnit) {
          // Clear the price when switching to no-bid
          setValue(`habitatBids.${index}.pricePerUnit`, '');
        }
      });
    }
  }, [watchedBids, setValue, opportunity.habitatRequirements]);

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      
      // Process all habitat bids (including no-bid entries)
      const habitatBids = data.habitatBids.map((bid, index) => {
        const habitat = opportunity.habitatRequirements[index];
        
        if (bid.bidType === 'no-bid') {
          // For no-bid, send basic info. Backend will handle full classification and zeroing out values.
          return {
            bidType: 'no-bid',
            habitatType: habitat.broadHabitat,
            specificHabitat: habitat.specificHabitat,
            baseUnitsRequired: habitat.unitsRequired, // Store original units
            // These will be calculated and set by the backend function (bidFunctions.js)
            locationClassification: null, 
            adjustedUnitsToSupply: null,
            pricePerUnit: 0,
            effectivePricePerUnitForBuyer: 0,
            subtotal: 0
          };
        } else {
          const bidderPricePerUnit = parseFloat(bid.pricePerUnit);
          // Send raw input. Backend will calculate and store all derived values.
          return {
            bidType: 'bid',
            habitatType: habitat.broadHabitat,
            specificHabitat: habitat.specificHabitat,
            baseUnitsRequired: habitat.unitsRequired, // Store original units
            pricePerUnit: bidderPricePerUnit, // Bidder's stated price
            // The following will be calculated by bidFunctions.js and stored in Firestore
            locationClassification: null, 
            adjustedUnitsToSupply: null,
            effectivePricePerUnitForBuyer: null,
            subtotal: null
          };
        }
      });
      
      // Calculate initial total bid amount for immediate frontend display/submission.
      // This will be re-calculated accurately by the backend based on the adjusted units and prices.
      const initialTotalBidAmount = habitatBids
        .filter(bid => bid.bidType === 'bid' && bid.pricePerUnit !== 0)
        .reduce((total, bid) => total + (bid.pricePerUnit * (opportunity.habitatRequirements.find(req => req.specificHabitat === bid.specificHabitat)?.unitsRequired || 0)), 0);

      // Prepare bid data to send to Firestore
      const bidData = {
        bidAmount: initialTotalBidAmount, // This will be overwritten by backend's calculation
        habitatBids: habitatBids,
        updatedAt: serverTimestamp()
      };
      
      if (existingBid) {
        // Update existing bid (this will trigger the onBidUpdated function)
        await updateDoc(doc(db, 'bids', existingBid.id), bidData);
        toast.success('Bid updated successfully!');
      } else {
        // Create new bid (triggers existing onBidCreated function)
        await addDoc(collection(db, 'bids'), {
          userId: currentUser.uid,
          opportunityId: opportunity.id,
          status: 'active', // Ensure status is set
          ...bidData,
          createdAt: serverTimestamp(),
          isWinning: false
        });
        toast.success('Bid submitted successfully!');
      }
      
      onClose();
    } catch (error) {
      console.error('Error submitting bid:', error);
      toast.error('Failed to submit bid. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      await updateDoc(doc(db, 'bids', existingBid.id), {
        status: 'withdrawn',
        updatedAt: serverTimestamp()
      });
      toast.success('Bid withdrawn successfully!');
      onClose();
    } catch (error) {
      console.error('Error withdrawing bid:', error);
      toast.error('Failed to withdraw bid. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Calculate totals for display, using values from watchedBids.
  // For new bids or updated bids before backend processing, these will be calculated live.
  // For existing bids, they will primarily use the stored values from `existingBid`
  // (which are propagated to `watchedBids` via `getDefaultValues`).
  const calculateTotals = () => {
    let totalAmount = 0; // Total amount the bidder charges (subtotal sum)
    let bidCount = 0;
    let noBidCount = 0;

    if (watchedBids && opportunity.habitatRequirements && userData) {
      watchedBids.forEach((bid, index) => {
        const habitat = opportunity.habitatRequirements[index];
        
        if (bid.bidType === 'no-bid') {
          noBidCount++;
        } else if (bid.bidType === 'bid') {
          const bidderPrice = parseFloat(bid.pricePerUnit || 0);
          if (!isNaN(bidderPrice) && bidderPrice > 0) {
            // Determine classification and adjusted values for live calculation
            const classification = userData ? getLocationClassification(userData, opportunity, habitat.broadHabitat) : null;
            const adjustedUnits = classification ? getAdjustedUnitsRequired(habitat.unitsRequired, classification) : habitat.unitsRequired;
            
            // Use these live calculated values for frontend display totals
            totalAmount += (bidderPrice * adjustedUnits); // Bidder's total charge
            bidCount++;
          }
        }
      });
    }

    return { totalAmount, bidCount, noBidCount };
  };

  const { totalAmount, bidCount, noBidCount } = calculateTotals();
  
  // Allow submit when all habitats are addressed AND at least one actual bid exists
  const totalHabitats = opportunity.habitatRequirements?.length || 0;
  const allHabitatsAddressed = (bidCount + noBidCount) === totalHabitats;
  const hasAtLeastOneBid = bidCount > 0;
  const canSubmit = allHabitatsAddressed && hasAtLeastOneBid;

  // Determine location classifications for the opportunity summary
  // Use the first habitat's broad habitat for general area classification if available
  const areaClassification = userData && opportunity.habitatRequirements.length > 0 ?
                             getLocationClassification(userData, opportunity, opportunity.habitatRequirements[0].broadHabitat) : null;
  const wfdClassification = userData && opportunity.habitatRequirements.some(req => req.broadHabitat === 'Watercourse') ?
                            getLocationClassification(userData, opportunity, 'Watercourse') : null;


  // Delete confirmation modal
  if (showDeleteConfirm) {
    return (
      <div className="bid-modal-overlay">
        <div className="bid-modal-content" style={{ maxWidth: '500px' }}> {/* Adjusted width for confirmation */}
          <div className="withdraw-confirmation">
            <h2 className="withdraw-confirmation-title">Confirm Withdrawal</h2>
            <p className="withdraw-confirmation-text">
              Are you sure you want to withdraw your bid? This action cannot be undone.
            </p>
            <div className="withdraw-confirmation-actions">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="withdraw-cancel-button"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className={`withdraw-confirm-button ${loading ? 'loading' : ''}`}
              >
                {loading ? 'Withdrawing...' : 'Withdraw Bid'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bid-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="bid-modal-content" style={{ maxWidth: '650px', width: '90%', maxHeight: '90vh', overflowY: 'auto', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', backgroundColor: 'white', position: 'relative' }}>
        <div className="bid-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', borderBottom: '1px solid #eee' }}>
          <h2 className="bid-modal-title" style={{ margin: 0, fontSize: '1.5rem', color: '#333' }}>
            {existingBid ? 'Update Bid' : 'Place Bid'}
          </h2>
          <button
            onClick={onClose}
            className="bid-modal-close"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}
          >
            <X size={24} />
          </button>
        </div>

        <div className="opportunity-details-section" style={{ padding: '15px 20px' }}>
          <h3 className="opportunity-details-title" style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '10px', color: '#333' }}>Opportunity Name: {opportunity.title}</h3>
          
          {/* Consolidated Location Context and Closing Date in 3 columns */}
          <div className="opportunity-info-grid" style={{ display: 'grid', gridTemplateColumns: wfdClassification ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)', gap: '15px', marginBottom: '15px' }}>
            <div className="opportunity-info-item">
              <div className="opportunity-info-label" style={{ fontWeight: 'bold', fontSize: '0.9em', color: '#555', marginBottom: '5px' }}>Area Location</div>
              <div className="opportunity-info-value" style={{ fontSize: '1em', color: '#333' }}>
                {areaClassification ? areaClassification.charAt(0).toUpperCase() + areaClassification.slice(1) : 'N/A'}
              </div>
            </div>
            {wfdClassification && (
              <div className="opportunity-info-item">
                <div className="opportunity-info-label" style={{ fontWeight: 'bold', fontSize: '0.9em', color: '#555', marginBottom: '5px' }}>WFD Location</div>
                <div className="opportunity-info-value" style={{ fontSize: '1em', color: '#333' }}>
                  {wfdClassification.charAt(0).toUpperCase() + wfdClassification.slice(1)}
                </div>
              </div>
            )}
            <div className="opportunity-info-item">
              <div className="opportunity-info-label" style={{ fontWeight: 'bold', fontSize: '0.9em', color: '#555', marginBottom: '5px' }}>Closing Date</div>
              <div className="opportunity-info-value" style={{ fontSize: '1em', color: '#333' }}>
                {getDisplayDate(opportunity.closingDate)?.toLocaleDateString() || 'N/A'}
              </div>
            </div>
            {/* Removed Bid Last Updated from here */}
          </div>

          <div className="opportunity-details-grid" style={{ marginTop: '10px' }}>
            <div className="opportunity-detail-item" style={{ gridColumn: '1 / -1' }}>
              <div className="opportunity-detail-label" style={{ fontWeight: 'bold', fontSize: '0.9em', color: '#555', marginBottom: '5px' }}>Habitat Requirements</div>
              <div className="opportunity-detail-value">
                {opportunity.habitatRequirements?.map((req, index) => (
                  <div key={index} style={{ marginBottom: '0.5rem', fontSize: '0.95em', color: '#333' }}>
                    <strong>{req.broadHabitat}</strong> → {req.specificHabitat}: {req.unitsRequired} units
                  </div>
                )) || 'No habitat requirements specified'}
              </div>
            </div>
          </div>
        </div>

        <div className="bid-form-section" style={{ padding: '15px 20px' }}>
          <form onSubmit={handleSubmit(onSubmit)} className="bid-form">
            <div className="habitat-bids-section">
              <label className="bid-form-label" style={{ fontSize: '1.1em', fontWeight: 'bold', marginBottom: '5px', display: 'block', color: '#333' }}>
                Enter Your Bid for Each Habitat Requirement
              </label>
              <p className="bid-form-help" style={{ fontSize: '0.9em', color: '#666', marginBottom: '15px', backgroundColor: '#e0f7fa', padding: '8px', borderRadius: '5px', borderLeft: '3px solid #00bcd4' }}>
                💡 You can choose to bid on individual habitat types or select "No Bid" for types you don't want. 
                You must bid on at least one habitat type.
              </p>
              
              {opportunity.habitatRequirements?.map((habitat, index) => {
                const currentHabitatBid = watchedBids?.[index];
                const bidderPrice = parseFloat(currentHabitatBid?.pricePerUnit || 0);

                // Live calculation for display based on current form input and user data
                const classification = userData ? getLocationClassification(userData, opportunity, habitat.broadHabitat) : null;
                const adjustedUnits = classification ? getAdjustedUnitsRequired(habitat.unitsRequired, classification) : habitat.unitsRequired;
                const subtotal = bidderPrice * adjustedUnits; // Subtotal based on adjusted units
                // Corrected Buyer's Equivalent Price calculation for display
                const effectivePriceForBuyerDisplay = (subtotal > 0 && habitat.unitsRequired > 0) ? (subtotal / habitat.unitsRequired) : 0;

                return (
                  <div key={index} className={`habitat-bid-item ${currentHabitatBid?.bidType === 'no-bid' ? 'no-bid' : currentHabitatBid?.bidType === 'bid' ? 'has-bid' : ''}`}
                    style={{ border: '1px solid #eee', borderRadius: '8px', padding: '12px', marginBottom: '12px', backgroundColor: currentHabitatBid?.bidType === 'no-bid' ? '#f9f9f9' : '#fff' }}>
                    
                    {/* Habitat title and units info */}
                    <div style={{ marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' }}>
                      <h4 className="habitat-bid-title" style={{ margin: 0, fontSize: '1.1em', color: '#333', marginBottom: '5px' }}>
                        {habitat.broadHabitat} → {habitat.specificHabitat}
                      </h4>
                      <div className="habitat-bid-units-and-supply" style={{ fontSize: '0.9em', color: '#666' }}>
                        <span>{habitat.unitsRequired} units required (base)</span>
                        <span style={{ marginLeft: '10px', fontWeight: 'bold' }}>
                          (You must supply: {adjustedUnits?.toFixed(2) || 'N/A'} units)
                        </span>
                      </div>
                    </div>

                    {/* Compact bid controls in a single row */}
                    <div className="compact-bid-controls" style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '15px', 
                      flexWrap: 'wrap',
                      marginBottom: '8px'
                    }}>
                      {/* Radio button group */}
                      <div className="bid-type-selection" style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        <label className="bid-type-option" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', margin: 0 }}>
                          <input
                            {...register(`habitatBids.${index}.bidType`)}
                            type="radio"
                            value="no-bid"
                            className="bid-type-radio"
                            style={{ marginRight: '5px' }}
                          />
                          <span className="bid-type-label" style={{ fontSize: '1em', color: '#555' }}>No Bid</span>
                        </label>
                        <label className="bid-type-option" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', margin: 0 }}>
                          <input
                            {...register(`habitatBids.${index}.bidType`)}
                            type="radio"
                            value="bid"
                            className="bid-type-radio"
                            style={{ marginRight: '5px' }}
                          />
                          <span className="bid-type-label" style={{ fontSize: '1em', color: '#555' }}>Place Bid</span>
                        </label>
                      </div>
                      
                      {/* Price input - shows when Place Bid is selected */}
                      {currentHabitatBid?.bidType === 'bid' && (
                        <div className="price-input-inline" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <label style={{ margin: 0, fontSize: '1em', color: '#333', whiteSpace: 'nowrap' }}>
                            Price per unit (£)
                          </label>
                          <input
                            {...register(`habitatBids.${index}.pricePerUnit`)}
                            type="number"
                            step="10"
                            min="10"
                            className={`habitat-bid-input ${errors.habitatBids?.[index]?.pricePerUnit ? 'error' : ''}`}
                            placeholder="Enter price"
                            onWheel={(e) => e.target.blur()}
                            onFocus={(e) => e.target.addEventListener('wheel', (event) => event.preventDefault())}
                            style={{ 
                              padding: '8px', 
                              borderRadius: '4px', 
                              border: '1px solid #ccc', 
                              width: '135px', 
                              fontSize: '1em',
                              textAlign: 'right'
                            }}
                          />
                        </div>
                      )}

                      {/* No bid message - shows when No Bid is selected */}
                      {currentHabitatBid?.bidType === 'no-bid' && (
                        <div className="no-bid-inline-message" style={{ 
                          color: '#e65100', 
                          fontSize: '0.95em',
                          fontStyle: 'italic',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          minWidth: '250px',
                          whiteSpace: 'nowrap'
                        }}>
                          <span>✖️</span>
                          <span>No bid placed for this habitat type</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Error messages */}
                    {(errors.habitatBids?.[index]?.bidType || (currentHabitatBid?.bidType === 'bid' && errors.habitatBids?.[index]?.pricePerUnit)) && (
                      <div style={{ marginBottom: '8px' }}>
                        {errors.habitatBids?.[index]?.bidType && (
                          <p style={{ color: '#dc2626', fontSize: '0.85em', margin: '0 0 5px 0' }}>
                            {errors.habitatBids[index].bidType.message}
                          </p>
                        )}
                        {currentHabitatBid?.bidType === 'bid' && errors.habitatBids?.[index]?.pricePerUnit && (
                          <p style={{ color: '#dc2626', fontSize: '0.85em', margin: '0' }}>
                            {errors.habitatBids[index].pricePerUnit.message}
                          </p>
                        )}
                      </div>
                    )}
                          
                    {/* Calculation display - only when there's a valid bid */}
                    {currentHabitatBid?.bidType === 'bid' && currentHabitatBid?.pricePerUnit && !isNaN(bidderPrice) && bidderPrice > 0 && (
                      <div className="habitat-bid-calculation" style={{ 
                        marginTop: '10px', 
                        padding: '8px', 
                        border: '1px dashed #ddd', 
                        borderRadius: '5px', 
                        backgroundColor: '#fcfcfc' 
                      }}>
                        <div className="calculation-row" style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          marginBottom: '5px', 
                          fontSize: '0.95em' 
                        }}>
                          <span>Subtotal (your charge):</span>
                          <span style={{ fontWeight: 'bold' }}>£{subtotal?.toLocaleString() || 'N/A'}</span>
                        </div>
                        <div className="calculation-row highlight" style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          fontSize: '0.95em', 
                          color: '#007bff' 
                        }}>
                          <span>Your unit price in comparison to a local supplier:</span>
                          <span style={{ fontWeight: 'bold' }}>
                            £{effectivePriceForBuyerDisplay?.toLocaleString('en-GB', { 
                              minimumFractionDigits: 0, 
                              maximumFractionDigits: 0 
                            }) || 'N/A'}/unit
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              
              <div className="total-bid-summary" style={{ borderTop: '1px solid #eee', paddingTop: '12px', marginTop: '15px' }}>
                <div className="total-bid-amount" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1em', fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>
                  <span>Your Total Bid Amount:</span>
                  <span className="total-amount">
                    £{totalAmount.toLocaleString()}
                  </span>
                </div>
                <div className="bid-count-info" style={{ fontSize: '0.9em', color: '#666', textAlign: 'center' }}>
                  Bidding on {bidCount} of {opportunity.habitatRequirements?.length || 0} habitat types
                  {noBidCount > 0 && `, ${noBidCount} no-bid selections`}
                </div>
              </div>
              
              {errors.habitatBids && typeof errors.habitatBids === 'object' && errors.habitatBids.message && (
                <p className="bid-form-error" style={{ color: '#dc2626', fontSize: '0.85em', marginTop: '10px', textAlign: 'center' }}>{errors.habitatBids.message}</p>
              )}
            </div>

            <div className="bid-actions-section" style={{ borderTop: '1px solid #eee', paddingTop: '15px', marginTop: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="bid-actions-left">
                {existingBid && (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="withdraw-button"
                    style={{ background: '#dc3545', color: 'white', padding: '10px 15px', borderRadius: '5px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.9em' }}
                  >
                    <Trash2 size={16} />
                    Withdraw Bid
                  </button>
                )}
              </div>
              <div className="bid-actions-right" style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  className="bid-cancel-button"
                  style={{ background: '#6c757d', color: 'white', padding: '10px 15px', borderRadius: '5px', border: 'none', cursor: 'pointer', fontSize: '0.9em' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !canSubmit}
                  className={`bid-submit-button ${loading ? 'loading' : ''} ${!canSubmit ? 'disabled' : ''}`}
                  title={!canSubmit ? 
                    (!hasAtLeastOneBid ? 'You must place at least one bid' : 
                     !allHabitatsAddressed ? 'You must address all habitat types' : '') : ''}
                  style={{ background: '#007bff', color: 'white', padding: '10px 15px', borderRadius: '5px', border: 'none', cursor: 'pointer', fontSize: '0.9em', opacity: (loading || !canSubmit) ? 0.6 : 1 }}
                >
                  {loading ? 'Submitting...' : existingBid ? 'Update Bid' : 'Place Bid'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default BidModal;