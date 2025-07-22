// src/components/BidModal.js - FIXED VERSION WITH SCROLL PROTECTION_Delinetd lines 10,194
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { doc, addDoc, updateDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import { X, Trash2 } from 'lucide-react';
import './BidModal.css';

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
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
              pricePerUnit: existingHabitatBid.pricePerUnit || 
                          (existingHabitatBid.subtotal && existingHabitatBid.unitsRequired ? 
                           existingHabitatBid.subtotal / existingHabitatBid.unitsRequired : '')
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
          return {
            bidType: 'no-bid',
            habitatType: habitat.broadHabitat,
            specificHabitat: habitat.specificHabitat,
            unitsRequired: habitat.unitsRequired,
            pricePerUnit: 0,
            subtotal: 0
          };
        } else {
          return {
            bidType: 'bid',
            habitatType: habitat.broadHabitat,
            specificHabitat: habitat.specificHabitat,
            unitsRequired: habitat.unitsRequired,
            pricePerUnit: parseFloat(bid.pricePerUnit),
            subtotal: parseFloat(bid.pricePerUnit) * habitat.unitsRequired
          };
        }
      });
      
      // Calculate total bid amount (only from actual bids)
      const totalBidAmount = habitatBids
        .filter(bid => bid.bidType === 'bid')
        .reduce((total, bid) => total + bid.subtotal, 0);
      
      // Prepare bid data
      const bidData = {
        bidAmount: totalBidAmount,
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
  
  // Calculate totals for display
  const calculateTotals = () => {
    let totalAmount = 0;
    let bidCount = 0;
    let noBidCount = 0;

    if (watchedBids && opportunity.habitatRequirements) {
      watchedBids.forEach((bid, index) => {
        if (bid.bidType === 'no-bid') {
          noBidCount++;
        } else if (bid.bidType === 'bid') {
          const price = parseFloat(bid.pricePerUnit || 0);
          if (!isNaN(price) && price > 0) {
            const subtotal = price * opportunity.habitatRequirements[index].unitsRequired;
            totalAmount += subtotal;
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

  // Delete confirmation modal
  if (showDeleteConfirm) {
    return (
      <div className="bid-modal-overlay">
        <div className="bid-modal-content">
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
    <div className="bid-modal-overlay">
      <div className="bid-modal-content">
        <div className="bid-modal-header">
          <h2 className="bid-modal-title">
            {existingBid ? 'Update Bid' : 'Place Bid'}
          </h2>
          <button
            onClick={onClose}
            className="bid-modal-close"
          >
            <X size={24} />
          </button>
        </div>

        <div className="opportunity-details-section">
          <h3 className="opportunity-details-title">{opportunity.title}</h3>
          <div className="opportunity-details-grid">
            <div className="opportunity-detail-item">
              <div className="opportunity-detail-label">LPA</div>
              <div className="opportunity-detail-value">{opportunity.lpa}</div>
            </div>
            <div className="opportunity-detail-item">
              <div className="opportunity-detail-label">NCA</div>
              <div className="opportunity-detail-value">{opportunity.nca}</div>
            </div>
            <div className="opportunity-detail-item" style={{ gridColumn: '1 / -1' }}>
              <div className="opportunity-detail-label">Habitat Requirements</div>
              <div className="opportunity-detail-value">
                {opportunity.habitatRequirements?.map((req, index) => (
                  <div key={index} style={{ marginBottom: '0.5rem' }}>
                    <strong>{req.broadHabitat}</strong> → {req.specificHabitat}: {req.unitsRequired} units
                  </div>
                )) || 'No habitat requirements specified'}
              </div>
            </div>
            <div className="opportunity-detail-item">
              <div className="opportunity-detail-label">Closing Date</div>
              <div className="opportunity-detail-value">
                {new Date(opportunity.closingDate).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        <div className="bid-form-section">
          <form onSubmit={handleSubmit(onSubmit)} className="bid-form">
            <div className="habitat-bids-section">
              <label className="bid-form-label">
                Enter Your Bid for Each Habitat Requirement
              </label>
              <p className="bid-form-help">
                💡 You can choose to bid on individual habitat types or select "No Bid" for types you don't want. 
                You must bid on at least one habitat type.
              </p>
              
              {opportunity.habitatRequirements?.map((habitat, index) => (
                <div key={index} className={`habitat-bid-item ${watchedBids?.[index]?.bidType === 'no-bid' ? 'no-bid' : watchedBids?.[index]?.bidType === 'bid' ? 'has-bid' : ''}`}>
                  <div className="habitat-bid-header">
                    <h4 className="habitat-bid-title">
                      {habitat.broadHabitat} → {habitat.specificHabitat}
                    </h4>
                    <div className="habitat-bid-units">
                      {habitat.unitsRequired} units required
                    </div>
                  </div>
                  
                  <div className="habitat-bid-input-group">
                    <label className="habitat-bid-label">
                      Bid Option
                    </label>
                    <div className="bid-type-selection">
                      <label className="bid-type-option">
                        <input
                          {...register(`habitatBids.${index}.bidType`)}
                          type="radio"
                          value="bid"
                          className="bid-type-radio"
                        />
                        <span className="bid-type-label">Place Bid</span>
                      </label>
                      <label className="bid-type-option">
                        <input
                          {...register(`habitatBids.${index}.bidType`)}
                          type="radio"
                          value="no-bid"
                          className="bid-type-radio"
                        />
                        <span className="bid-type-label">No Bid</span>
                      </label>
                    </div>
                    {errors.habitatBids?.[index]?.bidType && (
                      <p className="bid-form-error">
                        {errors.habitatBids[index].bidType.message}
                      </p>
                    )}
                    
                    {watchedBids?.[index]?.bidType === 'bid' && (
                      <div className="price-input-section">
                        <label className="habitat-bid-label">
                          Price per unit (£)
                        </label>
                        <input
                          {...register(`habitatBids.${index}.pricePerUnit`)}
                          type="number"
                          step="10"
                          min="10"
                          className={`habitat-bid-input ${errors.habitatBids?.[index]?.pricePerUnit ? 'error' : ''}`}
                          placeholder="Enter price per unit"
                          onWheel={(e) => e.target.blur()}
                          onFocus={(e) => e.target.addEventListener('wheel', (event) => event.preventDefault())}
                        />
                        {errors.habitatBids?.[index]?.pricePerUnit && (
                          <p className="bid-form-error">
                            {errors.habitatBids[index].pricePerUnit.message}
                          </p>
                        )}
                        
                        {watchedBids?.[index]?.pricePerUnit && (
                          <div className="habitat-bid-calculation">
                            <div className="calculation-row">
                              <span>Price per unit:</span>
                              <span>£{parseFloat(watchedBids[index].pricePerUnit || 0).toLocaleString()}</span>
                            </div>
                            <div className="calculation-row">
                              <span>Units required:</span>
                              <span>{habitat.unitsRequired}</span>
                            </div>
                            <div className="calculation-row total">
                              <span>Subtotal:</span>
                              <span>£{(parseFloat(watchedBids[index].pricePerUnit || 0) * habitat.unitsRequired).toLocaleString()}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {watchedBids?.[index]?.bidType === 'no-bid' && (
                      <div className="no-bid-display">
                        <div className="no-bid-message">
                          ✖️ No bid placed for this habitat type
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              <div className="total-bid-summary">
                <div className="total-bid-amount">
                  <span>Total Bid Amount:</span>
                  <span className="total-amount">
                    £{totalAmount.toLocaleString()}
                  </span>
                </div>
                <div className="bid-count-info">
                  Bidding on {bidCount} of {opportunity.habitatRequirements?.length || 0} habitat types
                  {noBidCount > 0 && `, ${noBidCount} no-bid selections`}
                </div>
              </div>
              
              {errors.habitatBids && typeof errors.habitatBids === 'object' && errors.habitatBids.message && (
                <p className="bid-form-error">{errors.habitatBids.message}</p>
              )}
            </div>

            <div className="bid-actions-section">
              <div className="bid-actions-container">
                {existingBid && (
                  <div className="bid-actions-left">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="withdraw-button"
                    >
                      <Trash2 size={16} />
                      Withdraw Bid
                    </button>
                  </div>
                )}
                <div className="bid-actions-right">
                  <button
                    type="button"
                    onClick={onClose}
                    className="bid-cancel-button"
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
                  >
                    {loading ? 'Submitting...' : existingBid ? 'Update Bid' : 'Place Bid'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default BidModal;