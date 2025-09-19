import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { API_ENDPOINTS } from '../utils/api';
import { MdKeyboardArrowLeft } from "react-icons/md";
import './Auth.css';

const AccountDetails = ({ onBack }) => {
  const { user, login } = useAuth();
  const [formData, setFormData] = useState({
    fullName: user?.full_name || '',
    email: user?.email || '',
    address: user?.address || '',
    civicId: user?.civic_id || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    // Update form data when user context changes
    if (user) {
      setFormData({
        fullName: user.full_name || '',
        email: user.email || '',
        address: user.address || '',
        civicId: user.civic_id || ''
      });
    }
    
    // Generate civic ID if user doesn't have one
    if (!user?.civic_id && !formData.civicId) {
      generateCivicId();
    }
  }, [user]);

  const generateCivicId = () => {
    const prefix = 'CIV';
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const civicId = `${prefix}${randomNum}`;
    setFormData(prev => ({ ...prev, civicId }));
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError('');
    setSuccess('');
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      setError('Full name is required');
      return false;
    }
    if (!validateEmail(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (!formData.address.trim()) {
      setError('Address is required');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Get user data from localStorage for identification
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      const civicId = userData.civic_id;

      console.log('🔄 Updating profile for civic_id:', civicId);
      console.log('📤 Sending data:', {
        civic_id: civicId,
        full_name: formData.fullName,
        email: formData.email,
        address: formData.address
      });

      if (!civicId) {
        throw new Error('User identification missing. Please register again.');
      }

      const response = await fetch(API_ENDPOINTS.AUTH.UPDATE_PROFILE, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          civic_id: civicId, // Use civic_id for user identification
          full_name: formData.fullName,
          email: formData.email,
          address: formData.address
        }),
      });

      console.log('📡 Response status:', response.status);
      const data = await response.json();
      console.log('📡 Response data:', data);

      if (response.ok) {
        // Update user data in localStorage
        const updatedUserData = {
          ...userData,
          full_name: formData.fullName,
          email: formData.email,
          address: formData.address,
          civic_id: data.user?.civic_id || formData.civicId
        };

        localStorage.setItem('userData', JSON.stringify(updatedUserData));
        localStorage.setItem('civicId', updatedUserData.civic_id);

        setSuccess('Profile updated successfully!');

        // Go back after 2 seconds
        setTimeout(() => {
          onBack();
        }, 2000);
      } else {
        setError(data.error || data.message || 'Failed to update profile');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    // Clear all user-related data from localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('civicId');

    // Reload the page to reset the app state
    window.location.reload();
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  return (
    <div className="account-details-container">
      {/* Top Black Bar */}
      <div className="top-black-bar"></div>
      
      {/* Header */}
      <div className="account-details-header">
        <button className="back-btn" onClick={onBack}>
          <MdKeyboardArrowLeft />
        </button>
        <h2>Account Details</h2>
      </div>

      <div className="account-details-content">
        <div className="civic-id-display">
          <label className="form-label">Your Civic ID</label>
          <div className="civic-id-container">
            <span className="civic-id">{formData.civicId}</span>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Full Name</label>
          <input
            type="text"
            className='form-input'
            value={formData.fullName}
            onChange={(e) => handleInputChange('fullName', e.target.value)}
            placeholder="Enter your full name"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Email Address</label>
          <input
            type="email"
            className='form-input'
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="Enter your email address"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Address</label>
          <input
            type="text"
            className='form-input'
            value={formData.address}
            onChange={(e) => handleInputChange('address', e.target.value)}
            placeholder="Enter your address"
            rows="3"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Mobile Number</label>
          <div className="mobile-display">
            <span className="country-code">+91</span>
            <span className="mobile-number">{user?.mobile_number}</span>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <button
          className="auth-button primary"
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Details'}
        </button>

        <div className="logout-section">
          <button className="logout-link" onClick={handleLogout}>
            Logout
          </button>
        </div>

        {/* Logout Confirmation Dialog */}
        {showLogoutConfirm && (
          <div className="logout-confirm-overlay">
            <div className="logout-confirm-dialog">
              <div className="confirm-header">
                <h3>Confirm Logout</h3>
              </div>
              <div className="confirm-content">
                <p>Are you sure you want to logout?</p>
                <p className="confirm-note">You will need to register again to access your account.</p>
              </div>
              <div className="confirm-actions">
                <button className="confirm-btn cancel" onClick={cancelLogout}>
                  Cancel
                </button>
                <button className="confirm-btn logout" onClick={confirmLogout}>
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountDetails;