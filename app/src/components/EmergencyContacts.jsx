import React, { useState } from 'react';
import './EmergencyContacts.css';
import { MdKeyboardArrowLeft } from "react-icons/md";
import { invoke } from '@tauri-apps/api/core';

const EmergencyContacts = ({ onBack }) => {
  const [expandedSection, setExpandedSection] = useState('emergency');

  // Emergency Contacts Data
  const emergencyContacts = {
    emergency: {
      title: "Police & Emergency Services",
      description: "National emergency services for immediate assistance",
      contacts: [
        { name: "Police Control Room", number: "100", description: "For immediate police assistance" },
        { name: "Women's Helpline (Vanitha Sahayavani)", number: "1091", description: "24/7 support for women in distress" },
        { name: "Fire & Rescue Services", number: "101", description: "Fire emergencies and rescue operations" },
        { name: "Ambulance (108)", number: "108", description: "Medical emergencies and ambulance services" },
        { name: "Disaster Management (112)", number: "112", description: "Natural disasters and emergency coordination" }
      ]
    },
    bbmp: {
      title: "BBMP Emergency Helplines",
      description: "Bruhat Bengaluru Mahanagara Palike official helplines",
      contacts: [
        { name: "24/7 Toll-Free Helpline", number: "1533", description: "Primary BBMP helpline for all civic issues" },
        { name: "Head Office Control Room", number: "08022660000", description: "Main control room" },
        { name: "Head Office Control Room", number: "08022975595", description: "Alternative control room" },
        { name: "Head Office Control Room", number: "08022221188", description: "General inquiries" },
        { name: "WhatsApp Helpline", number: "9480685700", description: "WhatsApp support for civic issues" }
      ],
      website: "bbmp.gov.in",
      email: "comm@bbmp.gov.in",
      address: "N.R. Square, Bengaluru, Karnataka 560002, India"
    },
    zones: {
      title: "Zonal Control Rooms",
      description: "Zone-specific control rooms for localized civic issues",
      contacts: [
        { name: "East Zone", number: "9480685702", description: "East Bengaluru zone" },
        { name: "East Zone", number: "08022975803", description: "East zone alternate" },
        { name: "West Zone", number: "9480685703", description: "West Bengaluru zone" },
        { name: "West Zone", number: "08023561692", description: "West zone alternate" },
        { name: "West Zone", number: "08023463366", description: "West zone control" },
        { name: "South Zone", number: "9480685704", description: "South Bengaluru zone" },
        { name: "South Zone", number: "08026566362", description: "South zone alternate" },
        { name: "South Zone", number: "08022975703", description: "South zone control" },
        { name: "Mahadevapura", number: "9480685706", description: "Mahadevapura zone" },
        { name: "Mahadevapura", number: "08028512300", description: "Mahadevapura alternate" },
        { name: "Bommanahalli", number: "9480685707", description: "Bommanahalli zone" },
        { name: "Bommanahalli", number: "08025735642", description: "Bommanahalli alternate" },
        { name: "Bommanahalli", number: "08025732447", description: "Bommanahalli control" },
        { name: "Yelahanka", number: "9480685705", description: "Yelahanka zone" },
        { name: "Yelahanka", number: "7022664419", description: "Yelahanka alternate" },
        { name: "Yelahanka", number: "08023636671", description: "Yelahanka control 1" },
        { name: "Yelahanka", number: "08022975936", description: "Yelahanka control 2" },
        { name: "R R Nagar", number: "9480685708", description: "R R Nagar zone" },
        { name: "R R Nagar", number: "08028601851", description: "R R Nagar alternate" },
        { name: "Dasarahalli", number: "9480685709", description: "Dasarahalli zone" },
        { name: "Dasarahalli", number: "08028394909", description: "Dasarahalli alternate" }
      ]
    },
    civic: {
      title: "Civic Services",
      description: "Specialized services for specific civic issues",
      contacts: [
        { name: "Street Light Complaints", number: "08022221188", description: "Report street light issues" },
        { name: "Water Supply Issues", number: "08022221188", description: "Water supply complaints" },
        { name: "Drainage Problems", number: "08022221188", description: "Drainage and sewerage issues" },
        { name: "Stormwater Drain Complaints", number: "08022221188", description: "Stormwater drainage issues" }
      ]
    },
    medical: {
      title: "Medical Emergency",
      description: "Medical emergency services and hospitals",
      contacts: [
        { name: "Ambulance Services", number: "108", description: "Free ambulance service" },
        { name: "Medical Emergency", number: "102", description: "Medical emergencies" },
        { name: "Victoria Hospital", number: "08026700447", description: "Major government hospital" },
        { name: "Bowring Hospital", number: "08025596275", description: "Government hospital" },
        { name: "NIMHANS Emergency", number: "08026995000", description: "Mental health emergencies" },
        { name: "Poison Control", number: "1066", description: "Poison control helpline" }
      ]
    },
    utilities: {
      title: "Utility Services",
      description: "Power, gas, and other utility emergency contacts",
      contacts: [
        { name: "BESCOM Emergency", number: "1912", description: "Power outage complaints" },
        { name: "BWSSB Water Emergency", number: "1916", description: "Water emergency" },
        { name: "Gas Emergency (GAIL)", number: "1800-425-3787", description: "Gas pipeline emergency" },
        { name: "BSNL Fault Reporting", number: "1500", description: "Landline fault reporting" }
      ]
    }
  };

  const copyNumber = (number) => {
    navigator.clipboard.writeText(number);
    // Show a more user-friendly notification at bottom
    const notification = document.createElement('div');
    notification.textContent = `${number} copied to clipboard!`;
    notification.style.cssText = `
      position: fixed;
      bottom: 100px;
      left: 50%;
      transform: translateX(-50%);
      background: #000000;
      color: #ffffff;
      padding: 12px 20px;
      border-radius: 8px;
      font-weight: 600;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      font-size: 0.9rem;
      animation: slideUpFade 0.3s ease-out;
    `;
    
    // Add animation keyframes if not already added
    if (!document.querySelector('#toast-animation-styles')) {
      const style = document.createElement('style');
      style.id = 'toast-animation-styles';
      style.textContent = `
        @keyframes slideUpFade {
          0% {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Remove notification after 2 seconds
    setTimeout(() => {
      if (document.body.contains(notification)) {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(-50%) translateY(20px)';
        setTimeout(() => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification);
          }
        }, 300);
      }
    }, 2000);
  };



  return (
    <div className="emergency-contacts-container">
      {/* Top Black Bar */}
      <div className="top-black-bar"></div>
      
      {/* Header */}
      <div className="emergency-contacts-header">
        <button className="back-btn" onClick={onBack}>
          <MdKeyboardArrowLeft />
        </button>
        <h2>Emergency Contacts</h2>
      </div>

      {/* Content */}
      <div className="emergency-contacts-content">
        
        {/* Quick Actions */}
        <div className="detail-section">
          <h3>Quick Actions</h3>
          <div className="quick-actions-grid">
            <button 
              className="quick-action-btn emergency"
              onClick={() => copyNumber('100')}
              title="Click to copy 100"
            >
              <span className="action-text">Police</span>
              <span className="action-number">100</span>
            </button>
            <button 
              className="quick-action-btn medical"
              onClick={() => copyNumber('108')}
              title="Click to copy 108"
            >
              <span className="action-text">Ambulance</span>
              <span className="action-number">108</span>
            </button>
            <button 
              className="quick-action-btn fire"
              onClick={() => copyNumber('101')}
              title="Click to copy 101"
            >
              <span className="action-text">Fire</span>
              <span className="action-number">101</span>
            </button>
            <button 
              className="quick-action-btn bbmp"
              onClick={() => copyNumber('1533')}
              title="Click to copy 1533"
            >
              <span className="action-text">BBMP</span>
              <span className="action-number">1533</span>
            </button>
          </div>
        </div>

        {/* Category Dropdown */}
        <div className="detail-section">
          <h3>Select Category</h3>
          <div className="category-dropdown-wrapper">
            <select 
              className="category-dropdown"
              value={expandedSection}
              onChange={(e) => setExpandedSection(e.target.value)}
            >
              {Object.keys(emergencyContacts).map((key) => (
                <option key={key} value={key}>
                  {emergencyContacts[key].title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected Category Details */}
        {expandedSection && (
          <div className="detail-section">
            <div className="category-header">
              <h3>
                {emergencyContacts[expandedSection].title}
              </h3>
              <p className="category-description">
                {emergencyContacts[expandedSection].description}
              </p>
            </div>

            {/* Contacts Grid */}
            <div className="contacts-grid">
              {emergencyContacts[expandedSection].contacts.map((contact, index) => (
                <div 
                  key={index} 
                  className="contact-card clickable"
                  onClick={() => copyNumber(contact.number)}
                  title={`Click to copy ${contact.number}`}
                >
                  <div className="contact-row">
                    <div className="contact-left">
                      <h4 className="contact-name">{contact.name}</h4>
                      <p className="contact-description">{contact.description}</p>
                    </div>
                    <div className="contact-right">
                      <span className="number-text">{contact.number}</span>
                      <span className="copy-hint">Click to copy</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Additional Info for BBMP */}
            {expandedSection === 'bbmp' && (
              <div className="additional-info">
                <div className="info-item">
                  <label>Website</label>
                  <div className="info-value">
                    <a href={`https://${emergencyContacts.bbmp.website}`} target="_blank" rel="noopener noreferrer">
                      {emergencyContacts.bbmp.website}
                    </a>
                  </div>
                </div>
                <div className="info-item">
                  <label>Email</label>
                  <div className="info-value">
                    <a href={`mailto:${emergencyContacts.bbmp.email}`}>
                      {emergencyContacts.bbmp.email}
                    </a>
                  </div>
                </div>
                <div className="info-item">
                  <label>Address</label>
                  <div className="info-value">{emergencyContacts.bbmp.address}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Important Notice */}
        <div className="detail-section notice-section">
          <h3>Important Notice</h3>
          <div className="notice-content">
            <p><strong>For Life-Threatening Emergencies:</strong> Call 112 (National Emergency Number) or the specific service numbers above.</p>
            <p><strong>For Civic Issues:</strong> Use BBMP helplines (1533) or report through this app.</p>
            <p><strong>Keep Your Phone Charged:</strong> Ensure your device is charged for emergency situations.</p>
            <p><strong>Know Your Location:</strong> Be able to provide your exact location when calling for help.</p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default EmergencyContacts;