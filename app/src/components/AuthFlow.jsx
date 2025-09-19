import React, { useState } from 'react';
import FirebasePhoneAuth from './FirebasePhoneAuth';
import './Auth.css';

const AuthFlow = ({ onAuthSuccess, onBack }) => {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleFirebaseAuthSuccess = async (authData) => {
    console.log('Registration successful:', authData);

    try {
      // Use the user data returned from the API
      const apiUserData = authData.user;

      // Create user data object for the simplified system
      const userData = {
        id: apiUserData.id,
        mobile_number: apiUserData.mobile_number,
        civic_id: apiUserData.civic_id,
        full_name: apiUserData.full_name || '',
        email: apiUserData.email || '',
        address: apiUserData.address || '',
        is_verified: apiUserData.is_verified,
        auth_provider: apiUserData.auth_provider,
        firebaseUser: false // Not using Firebase anymore
      };

      // Store user data in localStorage
      localStorage.setItem('userData', JSON.stringify(userData));
      localStorage.setItem('civicId', apiUserData.civic_id);

      setSuccess('Registration successful!');
      setError('');

      console.log('User registered with Civic ID:', apiUserData.civic_id);

      // Call the parent success handler with user data
      onAuthSuccess(userData, null); // No token needed

    } catch (error) {
      console.error('Error during registration:', error);
      setError(`Registration failed: ${error.message}`);
    }
  };

  const handleFirebaseAuthError = (errorMessage) => {
    console.error('Registration error:', errorMessage);
    setError(errorMessage);
    setSuccess('');
  };

  return (
    <FirebasePhoneAuth
      onAuthSuccess={handleFirebaseAuthSuccess}
      onAuthError={handleFirebaseAuthError}
      onBack={onBack}
    />
  );
};

export default AuthFlow;