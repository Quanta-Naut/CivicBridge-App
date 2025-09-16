import React, { useState } from 'react';
import { authAPI } from '../utils/api';
import './Auth.css';

const Register = ({ onSwitchToLogin, onOTPSent, onBack }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    mobileNumber: '',
    email: '',
    address: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validateMobileNumber = (number) => {
    const mobileRegex = /^[6-9]\d{9}$/;
    return mobileRegex.test(number);
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
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      setError('Full name is required');
      return false;
    }
    if (!validateMobileNumber(formData.mobileNumber)) {
      setError('Please enter a valid 10-digit mobile number');
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

  const handleSendOTP = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      const userData = {
        full_name: formData.fullName,
        email: formData.email,
        address: formData.address
      };
      
      const result = await authAPI.sendOTP(formData.mobileNumber, 'register', userData);
      
      if (result.error) {
        setError(result.error);
      } else {
        onOTPSent(formData.mobileNumber, 'register', formData);
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-header">
        <button className="back-button" onClick={onBack}>
          ← Back
        </button>
        <h1 className="auth-title">Create Account</h1>
      </div>

      <div className="auth-content">
        <div className="auth-description">
          <p>Fill in your details to create a new account</p>
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
          <label className="form-label">Mobile Number</label>
          <div className="mobile-input-container">
            <span className="country-code">+91</span>
            <input
              type="tel"
              className="form-input mobile-input"
              value={formData.mobileNumber}
              onChange={(e) => handleInputChange('mobileNumber', e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="Enter 10-digit mobile number"
              maxLength="10"
            />
          </div>
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

        {error && <div className="error-message">{error}</div>}

        <button
          className="auth-button primary"
          onClick={handleSendOTP}
          disabled={loading}
        >
          {loading ? 'Sending OTP...' : 'Send OTP'}
        </button>

        <div className="auth-footer">
          <p>Already have an account?</p>
          <button className="link-button" onClick={onSwitchToLogin}>
            Login here
          </button>
        </div>
      </div>
    </div>
  );
};

export default Register;