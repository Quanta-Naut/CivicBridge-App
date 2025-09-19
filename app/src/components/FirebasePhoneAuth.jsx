import React, { useState, useEffect } from "react";
import { authAPI } from "../utils/api";
import { API_ENDPOINTS } from "../utils/api";
import "./FirebasePhoneAuth.css";

const FirebasePhoneAuth = ({
  onAuthSuccess,
  onAuthError,
  suggestedPhone,
  onBack,
}) => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);

  // Update phone number when suggested phone changes
  useEffect(() => {
    if (suggestedPhone && suggestedPhone !== phoneNumber) {
      setPhoneNumber(suggestedPhone);
    }
  }, [suggestedPhone]);

  // Handle direct registration
  const handleRegister = () => {
    if (!phoneNumber) {
      onAuthError?.("Please enter a valid phone number");
      return;
    }
    setShowConfirmPopup(true);
  };

  // Confirm registration and proceed
  const confirmRegistration = async () => {
    setLoading(true);
    setError("");

    try {
      // Format phone number (ensure it starts with country code)
      let formattedPhone = phoneNumber.replace(/\s+/g, ""); // Remove spaces
      if (!formattedPhone.startsWith("+")) {
        // Assume Indian number if no country code
        formattedPhone = "+91" + formattedPhone;
      }

      console.log("📱 Registering user with phone:", formattedPhone);

      // Call the registration API
      console.log("🌐 Making API call to:", API_ENDPOINTS.AUTH.REGISTER);
      const registrationResult = await authAPI.register(formattedPhone);

      console.log("📡 API Response:", registrationResult);

      if (!registrationResult.success) {
        console.error("❌ Registration failed:", registrationResult.message);
        throw new Error(registrationResult.message || 'Registration failed');
      }

      console.log("✅ User registration successful:", registrationResult);

      // Call success handler with user data from API
      onAuthSuccess?.({
        user: registrationResult.user,
        phoneNumber: formattedPhone,
        idToken: null, // No token needed for simplified auth
      });

      setShowConfirmPopup(false);
    } catch (error) {
      console.error("❌ Error registering user:", error);
      let errorMessage = "Failed to register. Please try again.";
      setError(errorMessage);
      onAuthError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Cancel confirmation
  const cancelConfirmation = () => {
    setShowConfirmPopup(false);
  };

  // Reset form
  const resetForm = () => {
    setPhoneNumber("");
    setError("");
    setShowConfirmPopup(false);
  };

  // Confirmation Popup Component
  const ConfirmationPopup = () => (
    <div className="confirmation-popup-overlay">
      <div className="confirmation-popup">
        <div className="confirmation-header">
          <h3>Confirm Registration</h3>
        </div>
        <div className="confirmation-content">
          <p>Are you sure you want to register with this number?</p>
          <div className="phone-display">
            <strong>{phoneNumber}</strong>
          </div>
          <p className="confirmation-note">
            A Civic ID will be generated for you after registration.
          </p>
        </div>
        <div className="confirmation-actions">
          <button
            className="auth-button secondary"
            onClick={cancelConfirmation}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="auth-button primary"
            onClick={confirmRegistration}
            disabled={loading}
          >
            {loading ? "Registering..." : "Confirm & Register"}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="auth-container">
      <div className="top-bar"></div>

      <div className="auth-container-mobile">
        <div className="auth-header" style={{ marginTop: "35px", zIndex: 50 }}>
          <h1 className="auth-title">Phone Registration</h1>
        </div>

        <div
          className="auth-content"
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            padding: "20px",
          }}
        >
          <div
            className="auth-description"
            style={{ textAlign: "center", marginBottom: "2px" }}
          >
            <p>Enter your mobile number to register</p>
          </div>

          <div
            className="form-group"
            style={{ width: "100%", maxWidth: "320px", marginBottom: "12px" }}
          >
            <div className="mobile-input-container">
              <span className="country-code">+91</span>
              <input
                type="tel"
                className="form-input mobile-input"
                placeholder="9876543210"
                value={phoneNumber.replace(/^\+91\s*/, "")}
                onChange={(e) =>
                  setPhoneNumber(
                    "+91 " + e.target.value.replace(/\D/g, "").slice(0, 10)
                  )
                }
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <div className="error-message" style={{ marginBottom: "12px" }}>
              {error}
            </div>
          )}

          <button
            className="auth-button primary"
            onClick={handleRegister}
            disabled={loading || !phoneNumber}
            style={{ marginBottom: "4px", width: "100%", maxWidth: "320px" }}
          >
            {loading ? "Processing..." : "Register"}
          </button>

          <button
            className="auth-button secondary"
            onClick={onBack}
            style={{ width: "100%", maxWidth: "320px" }}
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Confirmation Popup */}
      {showConfirmPopup && <ConfirmationPopup />}
    </div>
  );
};

export default FirebasePhoneAuth;
