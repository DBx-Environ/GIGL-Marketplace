// src/components/BidDetailsModal.js
import React from 'react';
import { format } from 'date-fns';
import { X, Award, Clock, DollarSign, Building } from 'lucide-react';

function BidDetailsModal({ bid, opportunity, onClose }) {
  if (!bid || !opportunity) return null;

  const getBidStatus = () => {
    const now = new Date();
    const closingDate = new Date(opportunity.closingDate);
    
    if (bid.isWinning) return { label: 'Won', color: 'text-green-600 bg-green-100' };
    if (opportunity.status === 'closed') return { label: 'Lost', color: 'text-red-600 bg-red-100' };
    if (now > closingDate) return { label: 'Closed', color: 'text-gray-600 bg-gray-100' };
    return { label: 'Active', color: 'text-blue-600 bg-blue-100' };
  };

  const status = getBidStatus();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Bid Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-6">
          {/* Bid Status */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <Award size={20} className="text-gray-600" />
              <span className="font-medium text-gray-900">Status</span>
            </div>
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${status.color}`}>
              {status.label}
            </span>
          </div>

          {/* Bid Amount */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <DollarSign size={20} className="text-gray-600" />
              <span className="font-medium text-gray-900">Your Bid Amount</span>
            </div>
            <span className="text-2xl font-bold text-green-600">
              £{bid.bidAmount?.toLocaleString()}
            </span>
          </div>

          {/* Opportunity Details */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center">
              <Building size={20} className="mr-2 text-gray-600" />
              Opportunity Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <p className="text-sm text-gray-900">{opportunity.title}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">LPA</label>
                <p className="text-sm text-gray-900">{opportunity.lpa}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">NCA</label>
                <p className="text-sm text-gray-900">{opportunity.nca}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">BNG Unit Type</label>
                <p className="text-sm text-gray-900">{opportunity.bngUnitType}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Units Required</label>
                <p className="text-sm text-gray-900">{opportunity.unitsRequired}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Closing Date</label>
                <p className="text-sm text-gray-900">
                  {format(new Date(opportunity.closingDate), 'MMM d, yyyy HH:mm')}
                </p>
              </div>
            </div>
          </div>

          {/* Bid Timeline */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center">
              <Clock size={20} className="mr-2 text-gray-600" />
              Bid Timeline
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Bid Placed</span>
                <span className="text-sm text-gray-900">
                  {format(new Date(bid.createdAt), 'MMM d, yyyy HH:mm')}
                </span>
              </div>
              {bid.updatedAt && bid.updatedAt !== bid.createdAt && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Last Updated</span>
                  <span className="text-sm text-gray-900">
                    {format(new Date(bid.updatedAt), 'MMM d, yyyy HH:mm')}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Opportunity Closes</span>
                <span className="text-sm text-gray-900">
                  {format(new Date(opportunity.closingDate), 'MMM d, yyyy HH:mm')}
                </span>
              </div>
            </div>
          </div>

          {/* Winning Bid Info */}
          {opportunity.status === 'closed' && opportunity.winningBidAmount && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-medium text-yellow-800 mb-2">
                {bid.isWinning ? 'Congratulations! 🎉' : 'Opportunity Closed'}
              </h3>
              <div className="text-sm text-yellow-700">
                {bid.isWinning ? (
                  <p>Your bid was selected as the winning bid!</p>
                ) : (
                  <p>
                    The winning bid was £{opportunity.winningBidAmount.toLocaleString()}.
                    Your bid was £{(bid.bidAmount - opportunity.winningBidAmount).toLocaleString()} higher.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
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