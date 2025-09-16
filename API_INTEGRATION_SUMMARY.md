# Issue Reporting API Integration - Implementation Summary

## Architecture

**There is only ONE API endpoint - your Flask Python server:**

```
React Frontend → Tauri Rust Layer → Your Flask Python Server
```

The Rust layer just acts as a bridge to forward data from the frontend to your Flask API.

## What Was Implemented

### 1. Backend (Rust) Changes

**Dependencies Added to `Cargo.toml`:**
- `reqwest` with `json` and `multipart` features - for HTTP requests
- `tokio` with `full` features - for async runtime
- `base64` - for encoding/decoding binary data

**New Rust Code Added:**
- `submit_issue_to_api()` - New async command that forwards form data to external API
- Updated `CreateIssueRequest` struct to include all form fields:
  - `category` and `priority`
  - `image_data` (base64 encoded)
  - `audio_data` (base64 encoded)
  - `description_mode` ("text" or "audio")

**API Integration Features:**
- Sends multipart form data with text fields and file attachments
- Handles image and audio files as binary attachments
- Configurable API endpoint via environment variable
- Error handling for network failures and API errors

### 2. Frontend (React) Changes

**New Helper Functions:**
- `fileToBase64()` - Converts image files to base64
- `blobToBase64()` - Converts audio blobs to base64

**Updated Submit Handler:**
- Collects all form data including images and audio
- Converts binary data to base64 before sending to Rust
- Calls both API submission and local storage
- Enhanced error handling for file processing

**Data Sent to API:**
- Title, description, location coordinates
- Category and priority levels
- Image file (if selected)
- Audio recording (if recorded)
- Description mode (text vs audio)

### 3. Configuration Files

**Environment Variables (`.env`):**
- `TAURI_API_ENDPOINT` - Configure the API endpoint URL

**Constants File (`utils/constants.js`):**
- API configuration structure
- Form validation constants
- Issue categories and priorities
- Default coordinates

## How It Works

### Flow Diagram:
```
User Fills Form → Frontend Collects Data → Convert Files to Base64 
     ↓
Frontend Calls Rust → Rust Creates Multipart Form → Rust Sends to API
     ↓
API Response → Rust Returns Result → Frontend Shows Success/Error
     ↓
(Optionally) Save to Local Storage → Update UI
```

### Data Format Sent to API:

**Multipart Form Fields:**
- `title` (text)
- `description` (text)
- `latitude` (text)
- `longitude` (text)
- `category` (text)
- `priority` (text)
- `description_mode` (text)
- `image` (file - if present)
- `audio` (file - if present)

## Configuration

### To Change API Endpoint:

1. **Method 1 - Environment Variable:**
   Set `TAURI_API_ENDPOINT` in your environment or `.env` file

2. **Method 2 - Direct Code Change:**
   Modify the URL in `src-tauri/src/lib.rs` in the `submit_issue_to_api` function

### Example API Endpoint:
```
https://your-api-endpoint.com/api/issues
```

## Testing the Implementation

### Prerequisites:
1. Build the application: `pnpm run tauri build`
2. Set up your API endpoint to receive multipart form data
3. Update the API URL in configuration

### Expected API Request:
Your API should expect a POST request with:
- Content-Type: `multipart/form-data`
- Form fields as listed above
- Image file (JPEG format)
- Audio file (WebM format)

### Error Handling:
- Network failures are caught and reported
- File processing errors are handled gracefully
- Users get feedback on success/failure
- Local storage continues to work even if API fails

## Next Steps

1. **Set Up Your API Server:**
   - Create endpoint to handle multipart form data
   - Process the received files and metadata
   - Return appropriate responses

2. **Update API URL:**
   - Change the placeholder URL to your actual endpoint
   - Test with your backend server

3. **Add Authentication:**
   - If needed, add API keys or tokens to requests
   - Modify the `submit_issue_to_api` function

4. **Enhanced Error Handling:**
   - Add retry logic for failed requests
   - Implement offline queue for when network is unavailable

## File Changes Made:

- `app/src-tauri/Cargo.toml` - Added dependencies
- `app/src-tauri/src/lib.rs` - Added API submission logic
- `app/src/components/IssueForm.jsx` - Updated form submission
- `app/src/utils/constants.js` - Added configuration constants
- `app/.env` - Added API endpoint configuration

The implementation is now ready to send complete form data (including images and audio) from your Tauri app to any REST API endpoint!
