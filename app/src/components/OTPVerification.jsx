import React, { useState, useEffect } from 'react';
import { authAPI } from '../utils/api';
import './Auth.css';

const OTPVerification = ({ mobileNumber, authType, userData, onVerificationSuccess, onBack, onResendOTP }) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCanResend(true);
    }
  }, [timer]);

  const handleOTPChange = (index, value) => {
    if (value.length > 1) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.querySelector(`input[name="otp-${index + 1}"]`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.querySelector(`input[name="otp-${index - 1}"]`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleVerifyOTP = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      setError('Please enter complete 6-digit OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await authAPI.verifyOTP(mobileNumber, otpString, authType, userData);
      
      if (result.error) {
        setError(result.error);
      } else {
        onVerificationSuccess(result.user, result.token);
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!canResend) return;

    setTimer(30);
    setCanResend(false);
    setError('');
    
    try {
      const result = await authAPI.sendOTP(mobileNumber, authType, userData);
      if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to resend OTP. Please try again.');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
      <div className="auth-container">
        <div className="top-bar" style={{ height: '35px', background: '#000', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 0 }}></div>
          
      <div className="auth-header" style={{ marginTop: '35px', zIndex: 50 }}>
        <h1 className="auth-title">Verify OTP</h1>
      </div>

      <div className="auth-content">
        <div className="auth-description">
          <p>Enter the 6-digit OTP sent to</p>
          <p className="mobile-number-display">+91 {mobileNumber}</p>
        </div>

        <div className="otp-container">
          {otp.map((digit, index) => (
            <input
              key={index}
              type="tel"
              name={`otp-${index}`}
              className="otp-input"
              value={digit}
              onChange={(e) => handleOTPChange(index, e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => handleKeyDown(index, e)}
              maxLength="1"
                  autoComplete="off"
                //   style={{ border: '2px solid #000', borderRadius: '8px', width: '40px', height: '40px', textAlign: 'center', fontSize: '18px' }}
            />
          ))}
        </div>

        {error && <div className="error-message">{error}</div>}

        <button
          className="auth-button primary"
          onClick={handleVerifyOTP}
          disabled={loading || otp.some(digit => !digit)}
        >
          {loading ? 'Verifying...' : 'Verify OTP'}
        </button>

        <button
          className="auth-button secondary"
          onClick={onBack}
          style={{ marginTop: '10px' }}
        >
          Cancel
        </button>

        <div className="resend-section">
          {!canResend ? (
            <p className="resend-timer">
              Resend OTP in {formatTime(timer)}
            </p>
          ) : (
            <button className="link-button resend-button" onClick={handleResendOTP}>
              Resend OTP
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OTPVerification;