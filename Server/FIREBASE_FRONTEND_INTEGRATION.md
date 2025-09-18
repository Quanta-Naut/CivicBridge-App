# Complete Firebase Authentication Implementation Guide

## 🔥 Firebase + Supabase Authentication Setup

Your backend is ready! Here's how to implement the complete authentication flow in your frontend.

## Frontend Implementation

### Step 1: Firebase Authentication Hook

Create a custom hook for Firebase authentication:

```javascript
// src/hooks/useFirebaseAuth.js
import { useState, useEffect } from 'react';
import { 
  signInWithPhoneNumber, 
  RecaptchaVerifier, 
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from '../config/firebase';

const API_BASE_URL = 'http://localhost:5000';

export const useFirebaseAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [appToken, setAppToken] = useState(null); // Your app's JWT token

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Get Firebase ID token
          const idToken = await firebaseUser.getIdToken();
          
          // Send to your backend for user sync and JWT generation
          const response = await fetch(`${API_BASE_URL}/auth/firebase`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ idToken }),
          });

          const data = await response.json();

          if (data.success) {
            setUser(data.user);
            setAppToken(data.token);
            
            // Store token for API calls
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('firebaseToken', idToken);
            
            console.log('✅ User authenticated:', data.user);
          } else {
            console.error('❌ Backend authentication failed:', data.message);
            setError(data.message);
          }
        } catch (error) {
          console.error('❌ Authentication error:', error);
          setError(error.message);
        }
      } else {
        setUser(null);
        setAppToken(null);
        localStorage.removeItem('authToken');
        localStorage.removeItem('firebaseToken');
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const loginWithPhone = async (phoneNumber) => {
    try {
      setError(null);
      setLoading(true);

      // Set up reCAPTCHA verifier
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
          callback: () => {
            console.log('reCAPTCHA solved');
          },
          'expired-callback': () => {
            console.log('reCAPTCHA expired');
          }
        });
      }

      const appVerifier = window.recaptchaVerifier;
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      
      return confirmationResult;
    } catch (error) {
      console.error('❌ Phone auth error:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (confirmationResult, otp) => {
    try {
      setError(null);
      setLoading(true);
      
      const result = await confirmationResult.confirm(otp);
      console.log('✅ Phone verification successful:', result.user);
      
      return result;
    } catch (error) {
      console.error('❌ OTP verification error:', error);
      setError('Invalid OTP. Please try again.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setAppToken(null);
      localStorage.removeItem('authToken');
      localStorage.removeItem('firebaseToken');
    } catch (error) {
      console.error('❌ Logout error:', error);
      setError(error.message);
    }
  };

  return {
    user,
    appToken,
    loading,
    error,
    loginWithPhone,
    verifyOtp,
    logout,
    isAuthenticated: !!user
  };
};
```

### Step 2: API Helper with Authentication

Create an API helper that includes the Firebase token:

```javascript
// src/utils/api.js
const API_BASE_URL = 'http://localhost:5000';

export const apiCall = async (endpoint, options = {}) => {
  const authToken = localStorage.getItem('authToken');
  const firebaseToken = localStorage.getItem('firebaseToken');
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
      ...(firebaseToken && { 'X-Firebase-Token': firebaseToken }),
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'API request failed');
  }

  return data;
};

// API functions with authentication
export const createIssue = async (issueData) => {
  const formData = new FormData();
  
  // Add form fields
  Object.keys(issueData).forEach(key => {
    if (issueData[key] !== null && issueData[key] !== undefined) {
      formData.append(key, issueData[key]);
    }
  });

  return apiCall('/api/issues', {
    method: 'POST',
    body: formData,
    headers: {}, // Don't set Content-Type for FormData
  });
};

export const vouchIssue = async (issueId) => {
  return apiCall(`/api/issues/${issueId}/vouch`, {
    method: 'POST',
  });
};

export const getUserVouches = async () => {
  return apiCall('/api/user/vouches');
};
```

### Step 3: Authentication Component

Create a complete authentication flow component:

```javascript
// src/components/FirebaseAuth.jsx
import React, { useState } from 'react';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';

const FirebaseAuth = ({ onAuthSuccess }) => {
  const { loginWithPhone, verifyOtp, loading, error } = useFirebaseAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [step, setStep] = useState('phone'); // 'phone' or 'otp'

  const handleSendOtp = async (e) => {
    e.preventDefault();
    
    if (phoneNumber.length !== 10) {
      alert('Please enter a valid 10-digit phone number');
      return;
    }

    try {
      const fullPhoneNumber = `+91${phoneNumber}`;
      const confirmation = await loginWithPhone(fullPhoneNumber);
      setConfirmationResult(confirmation);
      setStep('otp');
    } catch (error) {
      console.error('Failed to send OTP:', error);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    
    if (otp.length !== 6) {
      alert('Please enter a valid 6-digit OTP');
      return;
    }

    try {
      await verifyOtp(confirmationResult, otp);
      onAuthSuccess?.();
    } catch (error) {
      console.error('Failed to verify OTP:', error);
    }
  };

  return (
    <div className="firebase-auth">
      {/* reCAPTCHA container */}
      <div id="recaptcha-container"></div>
      
      {step === 'phone' && (
        <form onSubmit={handleSendOtp}>
          <h3>Login with Phone Number</h3>
          <div>
            <label>Phone Number:</label>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span>+91</span>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="9876543210"
                maxLength={10}
                required
              />
            </div>
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Sending...' : 'Send OTP'}
          </button>
        </form>
      )}

      {step === 'otp' && (
        <form onSubmit={handleVerifyOtp}>
          <h3>Enter OTP</h3>
          <p>OTP sent to +91{phoneNumber}</p>
          <div>
            <label>OTP:</label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="123456"
              maxLength={6}
              required
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Verifying...' : 'Verify OTP'}
          </button>
          <button 
            type="button" 
            onClick={() => setStep('phone')}
            style={{ marginLeft: '10px' }}
          >
            Back
          </button>
        </form>
      )}

      {error && (
        <div style={{ color: 'red', marginTop: '10px' }}>
          Error: {error}
        </div>
      )}
    </div>
  );
};

export default FirebaseAuth;
```

### Step 4: Protected Route Component

```javascript
// src/components/ProtectedRoute.jsx
import React from 'react';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import FirebaseAuth from './FirebaseAuth';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useFirebaseAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <FirebaseAuth onAuthSuccess={() => {
      console.log('Authentication successful!');
    }} />;
  }

  return (
    <div>
      <div style={{ padding: '10px', background: '#e8f5e8' }}>
        ✅ Authenticated as: {user?.mobile_number} (ID: {user?.civic_id})
      </div>
      {children}
    </div>
  );
};

export default ProtectedRoute;
```

### Step 5: Usage in Your App

```javascript
// src/App.jsx
import React from 'react';
import ProtectedRoute from './components/ProtectedRoute';
import IssueReporter from './components/IssueReporter';
import { useFirebaseAuth } from './hooks/useFirebaseAuth';

function App() {
  const { user, logout, isAuthenticated } = useFirebaseAuth();

  return (
    <div className="App">
      <header>
        <h1>CivicBridge</h1>
        {isAuthenticated && (
          <div>
            <span>Welcome, {user?.mobile_number}</span>
            <button onClick={logout}>Logout</button>
          </div>
        )}
      </header>

      <main>
        <ProtectedRoute>
          <IssueReporter />
        </ProtectedRoute>
      </main>
    </div>
  );
}

export default App;
```

## 🔧 Configuration Steps

### 1. Run the SQL Scripts

Execute these in your Supabase SQL editor:

```sql
-- 1. Run firebase_rls_policies.sql
-- 2. Run firebase_authenticated_role_setup.sql
```

### 2. Test the Authentication Flow

1. **Start your backend server**:
   ```bash
   cd Server
   python main.py
   ```

2. **Start your frontend**:
   ```bash
   cd app
   npm start
   ```

3. **Test the flow**:
   - Enter your phone number
   - Receive OTP via Firebase
   - Verify OTP
   - See authenticated user interface
   - Try creating an issue (should work with authenticated role)

## 🎯 What This Achieves

✅ **Firebase users get `authenticated` role** in Supabase
✅ **Automatic user sync** between Firebase and your Supabase users table  
✅ **RLS policies work** with Firebase JWT tokens
✅ **Seamless API access** with proper authentication
✅ **User data persistence** in your database

Your Firebase users now have full access to all authenticated features in your app! 🚀