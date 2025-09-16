import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { authAPI } from '../utils/api';
import './Auth.css';

const SimpleMobileAuth = ({ onAuthSuccess, onBack }) => {
  const [currentScreen, setCurrentScreen] = useState('mobile'); // 'mobile' or 'otp'
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);

  React.useEffect(() => {
    if (currentScreen === 'otp' && timer > 0) {
      const interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else if (timer === 0) {
      setCanResend(true);
    }
  }, [timer, currentScreen]);

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
      // Use Rust command to send OTP
      const result = await invoke('send_otp_rust', {
        mobileNumber: mobileNumber,
        otpType: 'login',
        userData: null
      });
      
      if (result.error) {
        // If user not found, auto-register
        if (result.error.includes('not registered')) {
          const registerResult = await invoke('send_otp_rust', {
            mobileNumber: mobileNumber,
            otpType: 'register',
            userData: null
          });
          if (registerResult.error) {
            setError(registerResult.error);
          } else {
            setCurrentScreen('otp');
            setTimer(30);
            setCanResend(false);
          }
        } else {
          setError(result.error);
        }
      } else {
        setCurrentScreen('otp');
        setTimer(30);
        setCanResend(false);
      }
    } catch (err) {
      console.error('OTP send error:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
      // Try login first, if fails, try register using Rust command
      let result = await invoke('verify_otp_rust', {
        mobileNumber: mobileNumber,
        otp: otpString,
        otpType: 'login',
        userData: null
      });
      
      if (result.error && result.error.includes('not found')) {
        // Try register
        result = await invoke('verify_otp_rust', {
          mobileNumber: mobileNumber,
          otp: otpString,
          otpType: 'register',
          userData: {
            full_name: '', // Will be filled later in account details
            email: '',
            address: ''
          }
        });
      }
      
      if (result.error) {
        setError(result.error);
      } else {
        onAuthSuccess(result.user, result.token);
      }
    } catch (err) {
      console.error('OTP verify error:', err);
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
      // Use Rust command for resending OTP
      const result = await invoke('send_otp_rust', {
        mobileNumber: mobileNumber,
        otpType: 'login',
        userData: null
      });
      if (result.error && result.error.includes('not registered')) {
        await invoke('send_otp_rust', {
          mobileNumber: mobileNumber,
          otpType: 'register',
          userData: null
        });
      }
    } catch (err) {
      console.error('Resend OTP error:', err);
      setError('Failed to resend OTP. Please try again.');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (currentScreen === 'mobile') {
    return (
        <div className="auth-container simple-auth">
            <div className="top-bar" style={{ height: '35px', background: '#000', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 0 }}></div>
        <div className="auth-header" style={{ borderRadius: '20px 20px 0 0', marginTop: '35px', zIndex: 50 }}>
          <h1 className="auth-title">Login to Report Issues</h1>
        </div>

        <div className="auth-content">
          <div className="auth-description">
            <p>Enter your mobile number to continue</p>
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
                            style={{ paddingLeft: '50px', border: 'none' }}
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

          <button
            className="auth-button secondary"
            onClick={onBack}
            style={{ marginTop: '10px' }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container simple-auth">
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
              style={{ border: '2px solid #ccc', borderRadius: '8px', width: '50px', height: '50px', textAlign: 'center', fontSize: '18px', margin: '0 5px' }}
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
          onClick={() => setCurrentScreen('mobile')}
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

export default SimpleMobileAuth;