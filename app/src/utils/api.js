// API utility functions
const API_BASE_URL = 'http://10.42.19.207:5000';

// Get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

// API endpoints
export const API_ENDPOINTS = {
  ISSUES: `${API_BASE_URL}/api/issues`,
  AUTH: {
    SEND_OTP: `${API_BASE_URL}/auth/send-otp`,
    VERIFY_OTP: `${API_BASE_URL}/auth/verify-otp`,
    PROFILE: `${API_BASE_URL}/auth/profile`,
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
};

export default { issueAPI, authAPI };
