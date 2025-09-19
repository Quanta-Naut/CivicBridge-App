import React, { useState } from 'react';

const SMSDebuggingHelper = ({ phoneNumber, onSuggestion }) => {
  const [showHelper, setShowHelper] = useState(false);

  const testNumbers = [
    { number: '+1 650-555-3434', region: 'US', otp: '123456' },
    { number: '+91 9876543210', region: 'India', otp: '123456' }
  ];

  const realNumberTroubleshooting = [
    {
      issue: 'SMS not received after 5+ minutes',
      solutions: [
        'Check your phone\'s message app and spam folder',
        'Verify the phone number is correct and active',
        'Try with a different network (WiFi vs Mobile data)',
        'Restart your phone\'s messaging app'
      ]
    },
    {
      issue: 'Carrier blocking SMS',
      solutions: [
        'Some carriers block automated SMS',
        'Try with a different phone number/carrier',
        'Contact your carrier about SMS filtering',
        'Use test numbers for development'
      ]
    },
    {
      issue: 'Firebase SMS quota exceeded',
      solutions: [
        'Check Firebase Console → Usage tab',
        'Firebase free tier has SMS limits',
        'Wait 24 hours for quota reset',
        'Upgrade Firebase plan if needed'
      ]
    }
  ];

  return (
    <div style={{ 
      margin: '20px 0', 
      padding: '15px', 
      backgroundColor: '#f8f9fa', 
      borderRadius: '8px',
      border: '1px solid #dee2e6'
    }}>
      <button 
        onClick={() => setShowHelper(!showHelper)}
        style={{
          width: '100%',
          padding: '10px',
          backgroundColor: '#17a2b8',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          fontSize: '14px'
        }}
      >
        {showHelper ? '🔽' : '🔍'} SMS Troubleshooting Helper
      </button>

      {showHelper && (
        <div style={{ marginTop: '15px' }}>
          {/* Test Numbers Section */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ color: '#28a745', margin: '0 0 10px 0' }}>
              ✅ Recommended: Use Test Numbers
            </h4>
            <p style={{ fontSize: '13px', color: '#666', margin: '0 0 10px 0' }}>
              Test numbers work instantly without waiting for SMS:
            </p>
            
            {testNumbers.map((test, index) => (
              <div 
                key={index}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  margin: '8px 0',
                  padding: '8px',
                  backgroundColor: 'white',
                  borderRadius: '4px',
                  border: '1px solid #ddd'
                }}
              >
                <div style={{ flex: 1 }}>
                  <strong>{test.number}</strong> ({test.region})
                  <br />
                  <small>OTP: <span style={{ color: '#d63384' }}>{test.otp}</span></small>
                </div>
                <button
                  onClick={() => onSuggestion(test.number)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Use This
                </button>
              </div>
            ))}
          </div>

          {/* Real Number Troubleshooting */}
          <div>
            <h4 style={{ color: '#dc3545', margin: '0 0 10px 0' }}>
              🔧 Real Number SMS Issues
            </h4>
            
            {realNumberTroubleshooting.map((item, index) => (
              <details key={index} style={{ margin: '10px 0' }}>
                <summary style={{ 
                  cursor: 'pointer', 
                  fontWeight: 'bold',
                  padding: '5px',
                  backgroundColor: 'white',
                  borderRadius: '3px'
                }}>
                  {item.issue}
                </summary>
                <ul style={{ 
                  margin: '10px 0', 
                  paddingLeft: '20px',
                  fontSize: '13px'
                }}>
                  {item.solutions.map((solution, sIndex) => (
                    <li key={sIndex} style={{ margin: '5px 0' }}>
                      {solution}
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>

          {/* Current Status */}
          <div style={{ 
            marginTop: '15px',
            padding: '10px',
            backgroundColor: phoneNumber ? '#fff3cd' : '#f8d7da',
            borderRadius: '5px'
          }}>
            <strong>Current Status:</strong>
            <br />
            <small>
              Phone: {phoneNumber || 'Not entered'}<br />
              Type: {testNumbers.some(t => phoneNumber?.includes(t.number.replace(/[\s-+]/g, ''))) 
                ? '🧪 Test Number (No SMS sent)' 
                : '📱 Real Number (SMS should be sent)'
              }
            </small>
          </div>

          {/* Firebase Console Link */}
          <div style={{ marginTop: '15px', textAlign: 'center' }}>
            <button
              onClick={() => window.open('https://console.firebase.google.com/', '_blank')}
              style={{
                padding: '8px 16px',
                backgroundColor: '#6f42c1',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Check Firebase Console SMS Usage
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SMSDebuggingHelper;