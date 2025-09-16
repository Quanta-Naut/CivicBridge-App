// API Configuration
export const API_CONFIG = {
  // Update this URL to your actual API endpoint
  BASE_URL: "https://your-api-endpoint.com/api",
  ENDPOINTS: {
    SUBMIT_ISSUE: "/issues",
    GET_ISSUES: "/issues",
    UPDATE_ISSUE: "/issues",
    DELETE_ISSUE: "/issues"
  }
};

// Default coordinates (New Delhi, India)
export const DEFAULT_COORDINATES = {
  latitude: 28.6139,
  longitude: 77.2090
};

// Form validation constants
export const VALIDATION = {
  MIN_TITLE_LENGTH: 3,
  MAX_TITLE_LENGTH: 100,
  MIN_DESCRIPTION_LENGTH: 10,
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_AUDIO_DURATION: 60 // 60 seconds
};

// Issue categories
export const ISSUE_CATEGORIES = [
  { value: "infrastructure", label: "Infrastructure" },
  { value: "garbage", label: "Garbage Management" },
  { value: "water", label: "Water & Sanitation" },
  { value: "electricity", label: "Electricity" },
  { value: "transportation", label: "Transportation" },
  { value: "safety", label: "Safety & Security" },
  { value: "environment", label: "Environment" },
  { value: "other", label: "Other" }
];

// Issue priorities
export const ISSUE_PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" }
];