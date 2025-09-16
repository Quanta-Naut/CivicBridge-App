import React, { useState } from 'react';
import { authAPI } from '../utils/api';
import './Auth.css';

const Login = ({ onSwitchToRegister, onOTPSent, onBack }) => {
  const [mobileNumber, setMobileNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validateMobileNumber = (number) => {
    const mobileRegex = /^[6-9]\d{9}$/;
    return mobileRegex.test(number);
  };

  const handleSendOTP = async () => {
    if (!validateMobileNumber(mobileNumber)) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await authAPI.sendOTP(mobileNumber, 'login');
      
      if (result.error) {
        setError(result.error);
      } else {
        onOTPSent(mobileNumber, 'login');
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
        <h1 className="auth-title">Login</h1>
      </div>

      <div className="auth-content">
        <div className="auth-description">
          <p>Enter your mobile number to receive an OTP</p>
        </div>

        <div className="form-group">
          <label className="form-label">Mobile Number</label>
          <div className="mobile-input-container">
            <span className="country-code">+91</span>
            <input
              type="tel"
              className="form-input mobile-input"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="Enter 10-digit mobile number"
              maxLength="10"
            />
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <button
          className="auth-button primary"
          onClick={handleSendOTP}
          disabled={loading || !mobileNumber}
        >
          {loading ? 'Sending OTP...' : 'Send OTP'}
        </button>

        <div className="auth-footer">
          <p>Don't have an account?</p>
          <button className="link-button" onClick={onSwitchToRegister}>
            Register here
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;