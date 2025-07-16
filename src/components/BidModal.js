// src/components/BidModal.js
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { doc, addDoc, updateDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import { X, DollarSign, Calendar, Building, MapPin, Trash2 } from 'lucide-react';

const schema = yup.object().shape({
  bidAmount: yup.number()
    .required('Bid amount is required')
    .min(100, 'Minimum bid amount is £100')
    .test('increment', 'Bid amount must be in increments of £100', value => 
      value % 100 === 0
    )
});

function BidModal({ opportunity, existingBid, onClose }) {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { register, handleSubmit, formState: { errors }, watch } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      bidAmount: existingBid?.bidAmount || ''
    }
  });

  const bidAmount = watch('bidAmount');

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      
      if (existingBid) {
        // Update existing bid
        await updateDoc(doc(db, 'bids', existingBid.id), {
          bidAmount: data.bidAmount,
          updatedAt: serverTimestamp()
        });
        toast.success('Bid updated successfully!');
      } else {
        // Create new bid
        await addDoc(collection(db, 'bids'), {
          userId: currentUser.uid,
          opportunityId: opportunity.id,
          bidAmount: data.bidAmount,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Delete confirmation modal
  if (showDeleteConfirm) {
    return (
      <div className="modal-overlay">
        <div className="modal" style={{ maxWidth: '400px' }}>
          <div className="modal-header">
            <h2 className="modal-title">Confirm Withdrawal</h2>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="modal-close"
            >
              <X size={20} />
            </button>
          </div>
          <div className="modal-content">
            <p className="text-secondary mb-6">
              Are you sure you want to withdraw your bid? This action cannot be undone.
            </p>
          </div>
          <div className="modal-actions">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="btn btn-outline"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={loading}
              className="btn btn-danger"
            >
              {loading ? 'Withdrawing...' : 'Withdraw Bid'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2 className="modal-title">
            {existingBid ? 'Update Bid' : 'Place Bid'}
          </h2>
          <button
            onClick={onClose}
            className="modal-close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="modal-content">
          {/* Opportunity Details */}
          <div className="card mb-6">
            <div className="card-header">
              <h3 className="card-title">{opportunity.title}</h3>
            </div>
            <div className="card-content">
              <div className="form-grid form-grid-2">
                <div className="flex items-center gap-2 text-sm">
                  <Building size={16} className="text-secondary" />
                  <span className="font-medium">LPA:</span>
                  <span>{opportunity.lpa}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin size={16} className="text-secondary" />
                  <span className="font-medium">NCA:</span>
                  <span>{opportunity.nca}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">BNG Unit Type:</span>
                  <span>{opportunity.bngUnitType}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">Units Required:</span>
                  <span>{opportunity.unitsRequired}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm mt-4 p-3 bg-gray-50 rounded">
                <Calendar size={16} className="text-secondary" />
                <span className="font-medium">Closing Date:</span>
                <span>{formatDate(opportunity.closingDate)}</span>
              </div>
            </div>
          </div>

          {/* Bid Form */}
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="form-group">
              <label className="form-label">
                Bid Amount (£)
              </label>
              <input
                {...register('bidAmount')}
                type="number"
                step="100"
                min="100"
                className={`form-input ${errors.bidAmount ? 'error' : ''}`}
                placeholder="Enter bid amount"
              />
              {errors.bidAmount && (
                <div className="form-error">{errors.bidAmount.message}</div>
              )}
              <div className="mt-2 text-sm text-secondary">
                Minimum bid: £100. Bids must be in increments of £100.
              </div>
              
              {/* Live Preview */}
              {bidAmount && bidAmount >= 100 && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                  <div className="text-sm text-blue-800">
                    <div className="font-medium">Your bid: {formatCurrency(bidAmount)}</div>
                    <div>Per unit: {formatCurrency(bidAmount / opportunity.unitsRequired)}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-actions">
              {existingBid && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="btn btn-outline text-error border-error hover:bg-red-50"
                >
                  <Trash2 size={16} />
                  Withdraw Bid
                </button>
              )}
              <div className="flex gap-3 ml-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
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