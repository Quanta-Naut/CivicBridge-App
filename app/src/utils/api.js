// API utility functions
const API_BASE_URL = 'http://civicbridge.duckdns.org';

// Get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

// API endpoints
export const API_ENDPOINTS = {
  ISSUES: `${API_BASE_URL}/api/issues`,
  ISSUES_NEARBY: `${API_BASE_URL}/api/issues/nearby`,
  AUTH: {
    SEND_OTP: `${API_BASE_URL}/auth/send-otp`,
    VERIFY_OTP: `${API_BASE_URL}/auth/verify-otp`,
    PROFILE: `${API_BASE_URL}/auth/profile`,
    UPDATE_PROFILE: `${API_BASE_URL}/auth/update-profile`,
    FIREBASE: `${API_BASE_URL}/auth/firebase`,
    REGISTER: `${API_BASE_URL}/auth/register`,
  }
};

// Issue API functions
export const issueAPI = {
  // Get all issues
  getIssues: async () => {
    try {
      const response = await fetch(API_ENDPOINTS.ISSUES, {
        headers: {
          ...getAuthHeaders(),
        },
      });
      return await response.json();
    } catch (error) {
      console.error('Error fetching issues:', error);
      throw error;
    }
  },

  // Get nearby issues (excluding user's own issues)
  getNearbyIssues: async () => {
    try {
      const headers = getAuthHeaders();
      console.log('🔍 DEBUG: Fetching nearby issues with headers:', headers);
      console.log('🔍 DEBUG: Auth token exists:', !!localStorage.getItem('authToken'));
      
      const response = await fetch(API_ENDPOINTS.ISSUES_NEARBY, {
        headers: headers,
      });
      
      const result = await response.json();
      console.log('🔍 FRONTEND DEBUG: Nearby issues API response:', {
        count: result.count,
        original_count: result.original_count,
        excluded_count: result.excluded_count,
        excluded_user_issues: result.excluded_user_issues,
        current_user_id: result.current_user_id || result.user_id,
        source: result.source,
        user_info: result.user_info
      });
      
      // Log first few issues to verify filtering
      if (result.issues && result.issues.length > 0) {
        console.log('🔍 FRONTEND DEBUG: First 3 issues after filtering:');
        result.issues.slice(0, 3).forEach((issue, index) => {
          console.log(`   Issue ${index + 1}:`, {
            id: issue.id,
            user_id: issue.user_id,
            title: issue.title?.substring(0, 30) + '...',
            matches_current_user: issue.user_id === result.current_user_id
          });
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error fetching nearby issues:', error);
      throw error;
    }
  },

  // Create new issue
  createIssue: async (formData) => {
    try {
      const response = await fetch(API_ENDPOINTS.ISSUES, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          // Don't set Content-Type for FormData, let the browser handle it
        },
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error creating issue:', error);
      throw error;
    }
  },

  // Vouch for an issue
  vouchIssue: async (issueId) => {
    try {
      const response = await fetch(`${API_ENDPOINTS.ISSUES}/${issueId}/vouch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error vouching for issue:', error);
      throw error;
    }
  },

  // Get issue details
  getIssueDetails: async (issueId) => {
    try {
      const response = await fetch(`${API_ENDPOINTS.ISSUES}/${issueId}/vouch`, {
        headers: {
          ...getAuthHeaders(),
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error getting issue details:', error);
      throw error;
    }
  },
};

// Authentication API functions
export const authAPI = {
  // Firebase Authentication
  firebaseAuth: async (idToken) => {
    try {
      const response = await fetch(API_ENDPOINTS.AUTH.FIREBASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idToken: idToken,
        }),
      });
      
      return await response.json();
    } catch (error) {
      console.error('Error with Firebase auth:', error);
      throw error;
    }
  },

  // Legacy OTP functions (kept for backward compatibility)
  // Send OTP
  sendOTP: async (mobileNumber, type, userData = null) => {
    try {
      const response = await fetch(API_ENDPOINTS.AUTH.SEND_OTP, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mobile_number: mobileNumber,
          type: type,
          user_data: userData,
        }),
      });
      
      return await response.json();
    } catch (error) {
      console.error('Error sending OTP:', error);
      throw error;
    }
  },

  // Verify OTP
  verifyOTP: async (mobileNumber, otp, type, userData = null) => {
    try {
      const response = await fetch(API_ENDPOINTS.AUTH.VERIFY_OTP, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mobile_number: mobileNumber,
          otp: otp,
          type: type,
          user_data: userData,
        }),
      });
      
      return await response.json();
    } catch (error) {
      console.error('Error verifying OTP:', error);
      throw error;
    }
  },

  // Get user profile
  getProfile: async () => {
    try {
      const response = await fetch(API_ENDPOINTS.AUTH.PROFILE, {
        headers: {
          ...getAuthHeaders(),
        },
      });
      
      return await response.json();
    } catch (error) {
      console.error('Error getting profile:', error);
      throw error;
    }
  },

  // Register new user (simplified registration)
  register: async (phoneNumber) => {
    try {
      console.log("🌐 Register API called with phone:", phoneNumber);
      console.log("🌐 Endpoint:", API_ENDPOINTS.AUTH.REGISTER);

      const response = await fetch(API_ENDPOINTS.AUTH.REGISTER, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber,
        }),
      });

      console.log("📡 Response status:", response.status);
      console.log("📡 Response headers:", Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ HTTP Error:", response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log("📡 Response data:", result);

      return result;
    } catch (error) {
      console.error('❌ Error registering user:', error);
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to server. Please check your internet connection.');
      }
      throw error;
    }
  },
};

export default { issueAPI, authAPI };
