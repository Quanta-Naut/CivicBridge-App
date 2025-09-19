import React, { useState } from 'react';
import { auth } from '../config/firebase';

const FirebaseSetupChecker = () => {
  const [checkResults, setCheckResults] = useState({});
  const [checking, setChecking] = useState(false);

  const runSetupCheck = async () => {
    setChecking(true);
    const results = {};

    try {
      // Check 1: Firebase Configuration
      const config = auth.app.options;
      results.config = {
        status: '✅',
        message: 'Firebase configuration loaded',
        details: {
          projectId: config.projectId,
          authDomain: config.authDomain,
          apiKey: config.apiKey ? 'Present' : 'Missing'
        }
      };

      // Check 2: Authentication Service
      try {
        const user = auth.currentUser;
        results.authService = {
          status: '✅',
          message: 'Firebase Auth service accessible',
          details: { currentUser: user ? 'Logged in' : 'Not logged in' }
        };
      } catch (error) {
        results.authService = {
          status: '❌',
          message: 'Firebase Auth service error',
          details: { error: error.message }
        };
      }

      // Check 3: Domain Authorization
      const currentDomain = window.location.hostname;
      const expectedDomains = ['localhost', '127.0.0.1'];
      const isDomainOk = expectedDomains.includes(currentDomain);
      
      results.domain = {
        status: isDomainOk ? '✅' : '⚠️',
        message: isDomainOk ? 'Domain should be authorized' : 'Domain may not be authorized',
        details: { 
          current: currentDomain,
          expected: 'localhost or 127.0.0.1 for development'
        }
      };

      // Check 4: Test Phone Auth (basic)
      results.phoneAuth = {
        status: '⚠️',
        message: 'Phone Auth setup check needed',
        details: {
          note: 'Go to Firebase Console and verify:',
          steps: [
            '1. Authentication > Sign-in method',
            '2. Phone provider is ENABLED',
            '3. Click Save after enabling',
            '4. Check authorized domains include localhost'
          ]
        }
      };

    } catch (error) {
      results.error = {
        status: '❌',
        message: 'Setup check failed',
        details: { error: error.message }
      };
    }

    setCheckResults(results);
    setChecking(false);
  };

  const openFirebaseConsole = () => {
    const projectId = auth.app.options.projectId;
    window.open(`https://console.firebase.google.com/project/${projectId}/authentication/providers`, '_blank');
  };

  return (
    <div style={{ 
      padding: '20px', 
      backgroundColor: '#f8f9fa', 
      borderRadius: '8px', 
      margin: '20px 0',
      border: '1px solid #dee2e6'
    }}>
      <h3>🔧 Firebase Setup Checker</h3>
      
      <div style={{ marginBottom: '15px' }}>
        <button 
          onClick={runSetupCheck}
          disabled={checking}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          {checking ? 'Checking...' : 'Run Setup Check'}
        </button>
        
        <button 
          onClick={openFirebaseConsole}
          style={{
            padding: '10px 20px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Open Firebase Console
        </button>
      </div>

      {Object.keys(checkResults).length > 0 && (
        <div>
          <h4>Check Results:</h4>
          {Object.entries(checkResults).map(([key, result]) => (
            <div key={key} style={{ 
              marginBottom: '15px', 
              padding: '10px', 
              backgroundColor: 'white', 
              borderRadius: '5px',
              border: '1px solid #ddd'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                {result.status} {key.charAt(0).toUpperCase() + key.slice(1)}: {result.message}
              </div>
              
              {result.details && (
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {typeof result.details === 'object' ? (
                    Array.isArray(result.details.steps) ? (
                      <div>
                        <div>{result.details.note}</div>
                        <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                          {result.details.steps.map((step, index) => (
                            <li key={index}>{step}</li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      Object.entries(result.details).map(([k, v]) => (
                        <div key={k}><strong>{k}:</strong> {v}</div>
                      ))
                    )
                  ) : (
                    result.details
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ 
        marginTop: '20px', 
        padding: '15px', 
        backgroundColor: '#fff3cd', 
        borderRadius: '5px',
        border: '1px solid #ffeaa7'
      }}>
        <h4>🚫 For "operation-not-allowed" Error:</h4>
        <ol style={{ margin: '10px 0', paddingLeft: '20px' }}>
          <li>Click "Open Firebase Console" above</li>
          <li>Go to <strong>Authentication</strong> → <strong>Sign-in method</strong></li>
          <li>Find <strong>Phone</strong> in the providers list</li>
          <li>Click on <strong>Phone</strong></li>
          <li><strong>Toggle Enable</strong> switch to ON</li>
          <li><strong>Click Save</strong> (very important!)</li>
          <li>Verify <strong>localhost</strong> is in authorized domains</li>
          <li>Try authentication again</li>
        </ol>
      </div>
    </div>
  );
};

export default FirebaseSetupChecker;