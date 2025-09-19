import React, { useEffect, useState } from 'react';
import { auth } from '../config/firebase';

const FirebaseDebugger = () => {
  const [debugInfo, setDebugInfo] = useState({});

  useEffect(() => {
    // Check Firebase configuration
    const checkFirebaseConfig = () => {
      const config = auth.app.options;
      setDebugInfo({
        appName: auth.app.name,
        projectId: config.projectId,
        authDomain: config.authDomain,
        apiKey: config.apiKey ? '✅ Present' : '❌ Missing',
        currentDomain: window.location.hostname,
        currentProtocol: window.location.protocol,
        userAgent: navigator.userAgent,
        firebaseSDK: '✅ Firebase SDK Loaded'
      });
    };

    checkFirebaseConfig();
  }, []);

  const testReCaptcha = () => {
    try {
      const testContainer = document.createElement('div');
      testContainer.id = 'test-recaptcha';
      document.body.appendChild(testContainer);

      import('firebase/auth').then(({ RecaptchaVerifier }) => {
        try {
          const testVerifier = new RecaptchaVerifier(auth, 'test-recaptcha', {
            size: 'invisible'
          });
          console.log('✅ reCAPTCHA test successful');
          testVerifier.clear();
          document.body.removeChild(testContainer);
        } catch (error) {
          console.error('❌ reCAPTCHA test failed:', error);
          document.body.removeChild(testContainer);
        }
      });
    } catch (error) {
      console.error('❌ reCAPTCHA module load failed:', error);
    }
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#f5f5f5', margin: '10px', borderRadius: '8px' }}>
      <h3>🔧 Firebase Debug Info</h3>
      <div style={{ fontFamily: 'monospace', fontSize: '12px' }}>
        {Object.entries(debugInfo).map(([key, value]) => (
          <div key={key}>
            <strong>{key}:</strong> {value}
          </div>
        ))}
      </div>
      
      <button 
        onClick={testReCaptcha}
        style={{
          marginTop: '10px',
          padding: '8px 16px',
          backgroundColor: '#4285f4',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Test reCAPTCHA
      </button>
      
      <div style={{ marginTop: '15px', fontSize: '12px', color: '#666' }}>
        <h4>Common Issues:</h4>
        <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
          <li>Domain not authorized in Firebase Console</li>
          <li>Phone Authentication not enabled</li>
          <li>reCAPTCHA not working (try visible reCAPTCHA)</li>
          <li>Invalid phone number format</li>
          <li>Development vs Production environment mismatch</li>
        </ul>
      </div>
    </div>
  );
};

export default FirebaseDebugger;