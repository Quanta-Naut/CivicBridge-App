import React, { useState } from 'react';
import SimpleMobileAuth from './SimpleMobileAuth';
import './Auth.css';

const AuthFlow = ({ onAuthSuccess, onBack }) => {
  const handleAuthenticationSuccess = (user, token) => {
    // Store auth data in localStorage
    localStorage.setItem('authToken', token);
    localStorage.setItem('userData', JSON.stringify(user));
    onAuthSuccess(user, token);
  };

  return (
    <SimpleMobileAuth 
      onAuthSuccess={handleAuthenticationSuccess}
      onBack={onBack}
    />
  );
};

export default AuthFlow;