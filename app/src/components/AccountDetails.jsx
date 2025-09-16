import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
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

  useEffect(() => {
    // Generate civic ID if user doesn't have one
    if (!formData.civicId) {
      generateCivicId();
    }
  }, []);

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
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:5000/auth/update-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          full_name: formData.fullName,
          email: formData.email,
          address: formData.address,
          civic_id: formData.civicId
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Update user context with new data
        const updatedUser = { ...user, ...data.user };
        localStorage.setItem('userData', JSON.stringify(updatedUser));
        login(updatedUser, token);
        setSuccess('Profile updated successfully!');
        
        // Go back after 2 seconds
        setTimeout(() => {
          onBack();
        }, 2000);
      } else {
        setError(data.message || 'Failed to update profile');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    window.location.reload();
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
            <button 
              type="button" 
              className="regenerate-btn" 
              onClick={generateCivicId}
              disabled={loading}
            >
              Regenerate
            </button>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Full Name</label>
          <input
            type="text"
            className="form-input"
            value={formData.fullName}
            onChange={(e) => handleInputChange('fullName', e.target.value)}
            placeholder="Enter your full name"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Email Address</label>
          <input
            type="email"
            className="form-input"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="Enter your email address"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Address</label>
          <textarea
            className="form-input textarea"
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
      </div>
    </div>
  );
};

export default AccountDetails;