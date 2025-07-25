// src/components/ProfilePanel.js
import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config'; // Ensure this path is correct for your project
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import { User, Mail, Phone, Building, MapPin, Edit, Save, XCircle, Info, MessageSquare, Home, Tag } from 'lucide-react'; // Added Home and Tag icons
import './ProfilePanel.css'; // Import the CSS file

function ProfilePanel() {
  const { currentUser, userData, loading, updateUserData } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    company: '',
    mobile: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    county: '',
    postcode: '',
  });

  // Effect to initialize form data when userData changes (e.g., on initial load or context update)
  useEffect(() => {
    if (userData) {
      setFormData({
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        company: userData.company || '',
        mobile: userData.mobile || '',
        addressLine1: userData.addressLine1 || '',
        addressLine2: userData.addressLine2 || '',
        city: userData.city || '',
        county: userData.county || '',
        postcode: userData.postcode || '',
      });
    }
  }, [userData]);

  // Handle input changes for editable fields
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  // Handle saving changes to Firestore
  const handleSave = async () => {
    if (!currentUser || !currentUser.uid) {
      toast.error('User not authenticated. Please log in again.');
      return;
    }

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        company: formData.company,
        mobile: formData.mobile,
        addressLine1: formData.addressLine1,
        addressLine2: formData.addressLine2,
        city: formData.city,
        county: formData.county,
        postcode: formData.postcode,
        updatedAt: new Date(), // Add an updatedAt timestamp for tracking
      });
      
      // Update the AuthContext's userData state to reflect changes immediately
      updateUserData({
        ...userData, // Keep existing userData fields
        ...formData, // Overlay with updated form data
        updatedAt: new Date(),
      });

      toast.success('Profile updated successfully!');
      setIsEditing(false); // Exit editing mode
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile. Please try again.');
    }
  };

  // Handle cancelling edits
  const handleCancel = () => {
    // Reset form data to current userData values
    if (userData) {
      setFormData({
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        company: userData.company || '',
        mobile: userData.mobile || '',
        addressLine1: userData.addressLine1 || '',
        addressLine2: userData.addressLine2 || '',
        city: userData.city || '',
        county: userData.county || '',
        postcode: userData.postcode || '',
      });
    }
    setIsEditing(false); // Exit editing mode
  };

  // Show loading spinner if user data is still being fetched
  if (loading || !userData) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="profile-container">
      {/* Profile Header Section */}
      <div className="profile-header">
        <h1 className="profile-title">Your Profile</h1>
        <p className="profile-subtitle">Manage your personal and company details.</p>
      </div>

      {/* Editable Personal Information Card */}
      <div className="profile-card editable-card">
        <div className="profile-card-header">
          <h2 className="profile-card-title">Personal Information</h2>
          <button
            onClick={() => isEditing ? handleCancel() : setIsEditing(true)}
            className={`profile-action-button ${isEditing ? 'cancel' : 'edit'}`}
          >
            {isEditing ? (
              <>
                <XCircle size={16} />
                Cancel
              </>
            ) : (
              <>
                <Edit size={16} />
                Edit
              </>
            )}
          </button>
        </div>
        <div className="profile-card-content">
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label htmlFor="firstName" className="form-label">First Name</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="form-input"
                disabled={!isEditing}
              />
            </div>
            <div className="form-group">
              <label htmlFor="lastName" className="form-label">Last Name</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="form-input"
                disabled={!isEditing}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="mobile" className="form-label">Mobile Number</label>
            <input
              type="tel"
              id="mobile"
              name="mobile"
              value={formData.mobile}
              onChange={handleChange}
              className="form-input"
              disabled={!isEditing}
            />
          </div>

          <h3 className="profile-section-title"><Building size={18} /> Company & Address</h3>
          <div className="form-group">
            <label htmlFor="company" className="form-label">Company Name</label>
            <input
              type="text"
              id="company"
              name="company"
              value={formData.company}
              onChange={handleChange}
              className="form-input"
              disabled={!isEditing}
            />
          </div>

          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label htmlFor="addressLine1" className="form-label">Address Line 1</label>
              <input
                type="text"
                id="addressLine1"
                name="addressLine1"
                value={formData.addressLine1}
                onChange={handleChange}
                className="form-input"
                disabled={!isEditing}
              />
            </div>
            <div className="form-group">
              <label htmlFor="addressLine2" className="form-label">Address Line 2 (Optional)</label>
              <input
                type="text"
                id="addressLine2"
                name="addressLine2"
                value={formData.addressLine2}
                onChange={handleChange}
                className="form-input"
                disabled={!isEditing}
              />
            </div>
          </div>

          <div className="form-grid form-grid-3">
            <div className="form-group">
              <label htmlFor="city" className="form-label">City</label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="form-input"
                disabled={!isEditing}
              />
            </div>
            <div className="form-group">
              <label htmlFor="county" className="form-label">County</label>
              <input
                type="text"
                id="county"
                name="county"
                value={formData.county}
                onChange={handleChange}
                className="form-input"
                disabled={!isEditing}
              />
            </div>
            <div className="form-group">
              <label htmlFor="postcode" className="form-label">Postcode</label>
              <input
                type="text"
                id="postcode"
                name="postcode"
                value={formData.postcode}
                onChange={handleChange}
                className="form-input"
                disabled={!isEditing}
              />
            </div>
          </div>

          {isEditing && (
            <div className="profile-card-actions">
              <button onClick={handleSave} className="btn btn-primary">
                <Save size={16} />
                Save Changes
              </button>
            </div>
          )}
        </div>
      </div>

      {/* GIGL Admin Information Card (Non-editable) */}
      <div className="profile-card admin-info-card">
        <div className="profile-card-header">
          <h2 className="profile-card-title">GIGL Admin Information</h2> {/* Updated Heading */}
        </div>
        <div className="profile-card-content">
          {/* New grid for admin info items */}
          <div className="admin-info-grid"> {/* This is the new wrapper for the grid layout */}
            <div className="info-item">
              <Mail size={18} className="info-icon" />
              <div className="info-details">
                <span className="info-label">Registered Email:</span>
                <span className="info-value">{userData?.email || 'N/A'}</span>
              </div>
            </div>
            <div className="info-item">
              <Home size={18} className="info-icon" />
              <div className="info-details">
                <span className="info-label">Home LPA:</span>
                <span className="info-value">{userData?.HomeLPA || 'Lincoln City'}</span>
              </div>
            </div>
            <div className="info-item">
              <MapPin size={18} className="info-icon" />
              <div className="info-details">
                <span className="info-label">Home NCA:</span>
                <span className="info-value">{userData?.HomeNCA || 'Lincolnshire Wolds'}</span>
              </div>
            </div>
            <div className="info-item">
              <Tag size={18} className="info-icon" />
              <div className="info-details">
                <span className="info-label">Single Business Identifier (SBI):</span>
                <span className="info-value">{userData?.SBI || '12345689'}</span>
              </div>
            </div>
            {/* Removed Admin Status field */}
          </div>
          <div className="admin-contact-info">
            <MessageSquare size={24} className="contact-icon" />
            <p className="admin-contact-text">
              To update your Registered Email, Home LPA, Home NCA, or Single Business Identifier (SBI) codes,
              please contact the administrator at{' '}
              <a href="mailto:gigl@lincstrust.co.uk" className="contact-link">
                gigl@lincstrust.co.uk
              </a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfilePanel;
