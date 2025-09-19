import React, { useState } from 'react';
import FirebasePhoneAuth from './FirebasePhoneAuth';
import './FirebasePhoneAuth.css';

const FirebaseTestPage = () => {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentPhoneNumber, setCurrentPhoneNumber] = useState('');
  const [registeredUser, setRegisteredUser] = useState(null);

  const handleAuthSuccess = (authData) => {
    console.log('✅ Registration successful:', authData);
    setSuccess(`Success! Phone: ${authData.phoneNumber}`);
    setError('');
    setRegisteredUser(authData);
  };

  const handleAuthError = (errorMessage) => {
    console.error('❌ Registration error:', errorMessage);
    setError(errorMessage);
    setSuccess('');
  };

  const handlePhoneNumberSuggestion = (phoneNumber) => {
    setCurrentPhoneNumber(phoneNumber);
  };

  const clearResults = () => {
    setError('');
    setSuccess('');
    setRegisteredUser(null);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Simplified Registration Test</h1>

      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e7f3ff', borderRadius: '5px' }}>
        <h3>🔄 Registration Flow</h3>
        <p>This page tests the simplified registration system without OTP verification.</p>
        <ul style={{ textAlign: 'left' }}>
          <li>Enter mobile number</li>
          <li>Click "Register" button</li>
          <li>Confirm registration in popup</li>
          <li>Civic ID is automatically generated</li>
        </ul>
      </div>

      {error && (
        <div style={{
          padding: '15px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          borderRadius: '5px',
          margin: '10px 0',
          border: '1px solid #f5c6cb'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {success && (
        <div style={{
          padding: '15px',
          backgroundColor: '#d4edda',
          color: '#155724',
          borderRadius: '5px',
          margin: '10px 0',
          border: '1px solid #c3e6cb'
        }}>
          <strong>Success:</strong> {success}
        </div>
      )}

      {registeredUser && (
        <div style={{
          padding: '15px',
          backgroundColor: '#d1ecf1',
          color: '#0c5460',
          borderRadius: '5px',
          margin: '10px 0',
          border: '1px solid #bee5eb'
        }}>
          <strong>Registered User:</strong>
          <pre style={{ marginTop: '10px', fontSize: '12px' }}>
            {JSON.stringify(registeredUser, null, 2)}
          </pre>
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={clearResults}
          style={{
            padding: '10px 20px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          Clear Results
        </button>
      </div>

      <FirebasePhoneAuth
        onAuthSuccess={handleAuthSuccess}
        onAuthError={handleAuthError}
        suggestedPhone={currentPhoneNumber}
      />

      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#fff3cd', borderRadius: '5px' }}>
        <h3>📋 Test Checklist</h3>
        <ul style={{ textAlign: 'left' }}>
          <li>✅ Simplified registration (no OTP)</li>
          <li>✅ Direct confirmation popup</li>
          <li>✅ Automatic Civic ID generation</li>
          <li>🔄 Test with different phone numbers</li>
          <li>🔄 Verify Civic ID is unique and stored</li>
        </ul>
      </div>
    </div>
  );
};

export default FirebaseTestPage;