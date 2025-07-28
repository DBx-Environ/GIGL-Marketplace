// src/components/admin/UserManagementTab.js
import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config'; // Adjust path as needed
import { toast } from 'react-toastify';
import { CheckCircle, XCircle, Search, RefreshCcw, Edit, Save, Eye, User, Tag, Droplet } from 'lucide-react'; // Added Droplet icon
import UserBidsModal from './UserBidsModal'; // Import the new modal component
// Import helper functions and options from the new utility file
import { formatDate, LPA_OPTIONS, NCA_OPTIONS } from '../../utils/bidHelpers';
import { WFD_OPTIONS } from '../../utils/wfdOptions'; // Import WFD_OPTIONS from utility file

const VERIFIED_STATUS_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Verified', value: 'true' },
  { label: 'Not Verified', value: 'false' },
];

// Custom Confirmation Modal Component
const ConfirmationModal = ({ message, onConfirm, onCancel }) => {
  return (
    <div className="modal-overlay">
      <div className="modal confirmation-modal">
        <div className="modal-header">
          <h3 className="modal-title">Confirm Action</h3>
        </div>
        <div className="modal-content">
          <p>{message}</p>
        </div>
        <div className="modal-actions">
          <button onClick={onCancel} className="btn btn-secondary">Cancel</button>
          <button onClick={onConfirm} className="btn btn-primary">Confirm</button>
        </div>
      </div>
    </div>
  );
};

/**
 * UserManagementTab component for Admin Panel.
 * Allows admins to view user statistics, manage user data in a table,
 * and view individual user bids.
 * @param {object} props - Component props.
 * @param {Array<object>} props.usersData - All users data from Firestore.
 * @param {Array<object>} props.bidsData - All bids data from Firestore.
 * @param {Array<object>} props.opportunitiesData - All opportunities data from Firestore.
 * @param {boolean} props.loading - Loading state from parent AdminPanel.
 * @returns {JSX.Element} UserManagementTab component.
 */
function UserManagementTab({ usersData, bidsData, opportunitiesData, loading }) {
  // Filter states
  const [filterLPA, setFilterLPA] = useState('');
  const [filterNCA, setFilterNCA] = useState('');
  const [filterWFD, setFilterWFD] = useState(''); // New WFD filter state
  const [filterVerifiedStatus, setFilterVerifiedStatus] = useState('');
  const [filterSearchText, setFilterSearchText] = useState(''); // New search text filter

  const [editingUserId, setEditingUserId] = useState(null);
  const [editedUser, setEditedUser] = useState({});
  const [showUserBidsModal, setShowUserBidsModal] = useState(false);
  const [selectedUserForBids, setSelectedUserForBids] = useState(null);

  // State for confirmation modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // Stores the action to perform after confirmation

  // Calculate user statistics
  const totalUsers = usersData.length;
  const verifiedUsers = usersData.filter(user => user.emailVerified).length;
  const adminUsers = usersData.filter(user => user.isAdmin).length;
  // A user has bid if their UID exists in any bid's userId field
  const biddingUsers = new Set(bidsData.map(bid => bid.userId)).size;

  // Filter users based on search input and dropdowns
  const filteredUsers = usersData.filter(user => {
    // Apply search text filter
    const searchLower = filterSearchText.toLowerCase();
    const matchesSearch = (
      user.firstName?.toLowerCase().includes(searchLower) ||
      user.lastName?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.company?.toLowerCase().includes(searchLower) ||
      user.HomeLPA?.toLowerCase().includes(searchLower) ||
      user.HomeNCA?.toLowerCase().includes(searchLower) ||
      user.HomeWFD?.toLowerCase().includes(searchLower) || // Include HomeWFD in search
      user.SBI?.toLowerCase().includes(searchLower) ||
      user.mobile?.toLowerCase().includes(searchLower)
    );

    // Apply LPA filter
    const matchesLPA = filterLPA ? user.HomeLPA === filterLPA : true;

    // Apply NCA filter
    const matchesNCA = filterNCA ? user.HomeNCA === filterNCA : true;

    // Apply WFD filter
    const matchesWFD = filterWFD ? user.HomeWFD === filterWFD : true; // New WFD filter logic

    // Apply Verified Status filter
    const matchesVerifiedStatus = filterVerifiedStatus === ''
      ? true
      : user.emailVerified.toString() === filterVerifiedStatus;

    return matchesSearch && matchesLPA && matchesNCA && matchesWFD && matchesVerifiedStatus;
  });

  // Check if any filters are active
  const hasActiveFilters = filterLPA || filterNCA || filterWFD || filterVerifiedStatus || filterSearchText; // Updated to include WFD

  // Clear all filters
  const clearFilters = () => {
    setFilterLPA('');
    setFilterNCA('');
    setFilterWFD(''); // Clear WFD filter
    setFilterVerifiedStatus('');
    setFilterSearchText('');
  };

  // Handle editing a user row
  const handleEdit = (user) => {
    setEditingUserId(user.id);
    // Copy user data to local state for editing, but only for editable fields
    setEditedUser({
      ...user,
      // Ensure these are explicitly set even if null/undefined in Firestore
      HomeLPA: user.HomeLPA || '',
      HomeNCA: user.HomeNCA || '',
      HomeWFD: user.HomeWFD || '', // Initialize HomeWFD for editing
      SBI: user.SBI || '',
      isAdmin: user.isAdmin || false,
    });
  };

  // Handle changes in the editable fields of a user
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditedUser(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Pre-save validation and confirmation logic
  const handlePreSave = (userId) => {
    const originalUser = usersData.find(u => u.id === userId);

    // Rule 1: Do not allow admin status to be removed if there is only 1 admin
    if (originalUser?.isAdmin && !editedUser.isAdmin && adminUsers === 1) {
      toast.error('Cannot remove admin status. At least one admin must remain.');
      return;
    }

    // Rule 2: If a new admin is specified, add a warning
    if (!originalUser?.isAdmin && editedUser.isAdmin) {
      setConfirmAction(() => () => performSave(userId)); // Set the action to be performed
      setShowConfirmModal(true); // Show confirmation modal
      return;
    }

    // If no special rules apply, proceed with save
    performSave(userId);
  };

  // Actual save function
  const performSave = async (userId) => {
    // SBI validation: Must be 9 digits and numeric
    const sbiValue = editedUser.SBI;
    if (sbiValue && (!/^\d{9}$/.test(sbiValue))) {
      toast.error('SBI must be a 9-digit number.');
      return;
    }

    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        // Only update fields that are editable by admin in this view
        HomeLPA: editedUser.HomeLPA,
        HomeNCA: editedUser.HomeNCA,
        HomeWFD: editedUser.HomeWFD, // Save HomeWFD
        SBI: editedUser.SBI,
        isAdmin: editedUser.isAdmin,
        updatedAt: new Date(), // Update timestamp
      });
      toast.success('User updated successfully!');
      setEditingUserId(null); // Exit editing mode
      setEditedUser({}); // Clear edited user state
      setShowConfirmModal(false); // Close modal if open
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user: ' + error.message);
    }
  };

  // Handle cancelling edits
  const handleCancel = () => {
    setEditingUserId(null);
    setEditedUser({});
    setShowConfirmModal(false); // Close modal if open
  };

  // Handle viewing bids for a specific user
  const handleViewBids = (user) => {
    setSelectedUserForBids(user);
    setShowUserBidsModal(true);
  };

  // Close the bids modal
  const handleCloseBidsModal = () => {
    setShowUserBidsModal(false);
    setSelectedUserForBids(null);
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner"></div>
        <p>Loading user data...</p>
      </div>
    );
  }

  const confirmationMessage = `Are you sure you want to set ${editedUser.firstName} ${editedUser.lastName} (${editedUser.company}) as an Admin?`;

  return (
    <div className="user-management-tab">
      <h2 className="tab-section-title">User Overview</h2>

      {/* User Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-content">
            <div className="stat-icon stat-icon-blue"><User size={24} /></div>
            <div className="stat-details">
              <div className="stat-label">Total Users</div>
              <div className="stat-value">{totalUsers}</div>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-content">
            <div className="stat-icon stat-icon-green"><CheckCircle size={24} /></div>
            <div className="stat-details">
              <div className="stat-label">Verified Emails</div>
              <div className="stat-value">{verifiedUsers}</div>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-content">
            <div className="stat-icon stat-icon-purple"><Eye size={24} /></div>
            <div className="stat-details">
              <div className="stat-label">Users with Bids</div>
              <div className="stat-value">{biddingUsers}</div>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-content">
            <div className="stat-icon stat-icon-red"><Tag size={24} /></div>
            <div className="stat-details">
              <div className="stat-label">Admin Users</div>
              <div className="stat-value">{adminUsers}</div>
            </div>
          </div>
        </div>
      </div>

      <h2 className="tab-section-title">Manage Users</h2>

      {/* User Filters */}
      <div className="filter-bar">
        <div className="search-input-group">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search by name, email, company, LPA, NCA, WFD, SBI, mobile..." // Updated placeholder
            value={filterSearchText}
            onChange={(e) => setFilterSearchText(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-group">
          <label htmlFor="filterLPA" className="filter-label">Home LPA:</label>
          <select
            id="filterLPA"
            value={filterLPA}
            onChange={(e) => setFilterLPA(e.target.value)}
            className="filter-select"
          >
            <option value="">All LPAs</option>
            {LPA_OPTIONS.map(lpa => (
              <option key={lpa} value={lpa}>{lpa}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="filterNCA" className="filter-label">Home NCA:</label>
          <select
            id="filterNCA"
            value={filterNCA}
            onChange={(e) => setFilterNCA(e.target.value)}
            className="filter-select"
          >
            <option value="">All NCAs</option>
            {NCA_OPTIONS.map(nca => (
              <option key={nca} value={nca}>{nca}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="filterWFD" className="filter-label">Home WFD:</label> {/* New WFD filter */}
          <select
            id="filterWFD"
            value={filterWFD}
            onChange={(e) => setFilterWFD(e.target.value)}
            className="filter-select"
          >
            <option value="">All WFD Op Catchments</option> {/* Updated filter label */}
            {WFD_OPTIONS.map(wfd => (
              <option key={wfd} value={wfd}>{wfd}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="filterVerified" className="filter-label">Verified Status:</label>
          <select
            id="filterVerified"
            value={filterVerifiedStatus}
            onChange={(e) => setFilterVerifiedStatus(e.target.value)}
            className="filter-select"
          >
            {VERIFIED_STATUS_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        {hasActiveFilters && (
          <button onClick={clearFilters} className="btn btn-outline btn-sm clear-filter-btn">
            <RefreshCcw size={16} /> Clear Filters
          </button>
        )}
      </div>

      {/* User Table */}
      <div className="table-container admin-table-container">
        {filteredUsers.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state-text">No users found matching your criteria.</p>
          </div>
        ) : (
          <table className="table admin-table">
            <thead>
              <tr>
                <th>Actions</th>
                <th>Name / Company</th>
                <th>Contact Info</th>
                <th>
                  <div>Home LPA</div>
                  <div>Home NCA</div>
                </th> {/* Stacked LPA and NCA */}
                <th>Home WFD Op Catchment</th> {/* New column heading */}
                <th>SBI</th>
                <th>Verified</th>
                <th>Admin</th>
                <th>Registered</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.id}>
                  <td className="admin-table-actions">
                    {editingUserId === user.id ? (
                      <>
                        <button onClick={() => handlePreSave(user.id)} className="action-button save" title="Save">
                          <Save size={18} />
                        </button>
                        <button onClick={handleCancel} className="action-button cancel" title="Cancel">
                          <XCircle size={18} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => handleEdit(user)} className="action-button edit" title="Edit">
                          <Edit size={18} />
                        </button>
                        <button onClick={() => handleViewBids(user)} className="action-button view" title="View Bids">
                          <Eye size={18} />
                        </button>
                      </>
                    )}
                  </td>
                  <td>
                    <div>{user.firstName} {user.lastName}</div>
                    <div className="text-sm text-secondary">{user.company}</div>
                  </td>
                  <td>
                    <div>{user.email}</div>
                    <div className="text-sm text-secondary">{user.mobile || 'N/A'}</div>
                  </td>
                  <td>
                    {editingUserId === user.id ? (
                      <>
                        <select
                          name="HomeLPA"
                          value={editedUser.HomeLPA}
                          onChange={handleChange}
                          className="table-edit-input mb-1" // Added margin-bottom
                        >
                          <option value="">Select LPA</option>
                          {LPA_OPTIONS.map(lpa => (
                            <option key={lpa} value={lpa}>{lpa}</option>
                          ))}
                        </select>
                        <select
                          name="HomeNCA"
                          value={editedUser.HomeNCA}
                          onChange={handleChange}
                          className="table-edit-input"
                        >
                          <option value="">Select NCA</option>
                          {NCA_OPTIONS.map(nca => (
                            <option key={nca} value={nca}>{nca}</option>
                          ))}
                        </select>
                      </>
                    ) : (
                      <>
                        <div>{user.HomeLPA || 'N/A'}</div>
                        <div className="text-sm text-secondary">{user.HomeNCA || 'N/A'}</div>
                      </>
                    )}
                  </td>
                  <td> {/* New Home WFD Op Catchment column */}
                    {editingUserId === user.id ? (
                      <select
                        name="HomeWFD"
                        value={editedUser.HomeWFD}
                        onChange={handleChange}
                        className="table-edit-input"
                      >
                        <option value="">Select WFD Op Catchment</option> {/* Updated option label */}
                        {WFD_OPTIONS.map(wfd => (
                          <option key={wfd} value={wfd}>{wfd}</option>
                        ))}
                      </select>
                    ) : (
                      user.HomeWFD || 'N/A'
                    )}
                  </td>
                  <td>
                    {editingUserId === user.id ? (
                      <input
                        type="text"
                        name="SBI"
                        value={editedUser.SBI}
                        onChange={handleChange}
                        className="table-edit-input"
                        placeholder="9-digit SBI"
                        maxLength="9"
                      />
                    ) : (
                      user.SBI || 'N/A'
                    )}
                  </td>
                  <td>
                    {user.emailVerified ? (
                      <CheckCircle size={18} className="text-success" />
                    ) : (
                      <XCircle size={18} className="text-error" />
                    )}
                  </td>
                  <td>
                    {editingUserId === user.id ? (
                      <input
                        type="checkbox"
                        name="isAdmin"
                        checked={editedUser.isAdmin}
                        onChange={handleChange}
                        className="admin-checkbox"
                      />
                    ) : (
                      user.isAdmin ? (
                        <CheckCircle size={18} className="text-success" />
                      ) : (
                        <XCircle size={18} className="text-error" />
                      )
                    )}
                  </td>
                  <td>{formatDate(user.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* User Bids Modal */}
      {showUserBidsModal && selectedUserForBids && (
        <UserBidsModal
          user={selectedUserForBids}
          bidsData={bidsData}
          opportunitiesData={opportunitiesData}
          onClose={handleCloseBidsModal}
        />
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <ConfirmationModal
          message={confirmationMessage}
          onConfirm={() => {
            if (confirmAction) confirmAction();
            setConfirmAction(null); // Clear action
            setShowConfirmModal(false);
          }}
          onCancel={() => {
            handleCancel(); // Revert changes and exit editing mode
            setConfirmAction(null); // Clear action
            setShowConfirmModal(false);
          }}
        />
      )}
    </div>
  );
}

export default UserManagementTab;
