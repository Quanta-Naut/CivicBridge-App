# API Configuration System

The CivicBridge app now uses a flexible configuration system for API endpoints instead of hardcoded values.

## Configuration Files

### 1. `src-tauri/config/endpoints.json`
Contains endpoint configurations for different environments:
- **production**: Uses `civicbridge.duckdns.org` endpoints
- **development**: Uses `localhost:5000` endpoints  
- **local_network**: Uses `10.42.19.207:5000` endpoints

### 2. `.env` file (copy from `.env.example`)
Set the environment variable to control which endpoint set to use:

```bash
# Options: production, development, local_network
# Default: development (if not set)
CIVIC_API_ENV=development

# Note: Firebase service account key is NOT needed in this frontend app
# It's only required on the Flask server side for token verification
```

## Environment Selection

The app automatically selects endpoints based on:

1. **Android builds**: Always uses `production` endpoints
2. **Desktop builds**: Uses environment variable `CIVIC_API_ENV`
   - `production` → civicbridge.duckdns.org
   - `development` → localhost:5000 (default)
   - `local_network` → 10.42.19.207:5000

## Available Endpoints

Each environment configuration includes:
- `issues_api`: For CRUD operations on issues
- `send_otp`: For sending OTP codes
- `verify_otp`: For verifying OTP codes  
- `firebase_auth`: For Firebase authentication
- `profile`: For user profile operations
- `auth_base`: Base URL for authentication

## Usage Example

```bash
# For local development
CIVIC_API_ENV=development

# For testing with network IP
CIVIC_API_ENV=local_network  

# For production deployment
CIVIC_API_ENV=production
```

## Firebase Configuration

Make sure your Flask server has the Firebase service account key configured:

```bash
# In your Flask server .env file
FIREBASE_SERVICE_ACCOUNT_KEY=path/to/your/firebase-service-account-key.json
```

## Testing

1. Start your Flask server
2. Set the appropriate `CIVIC_API_ENV` in your `.env` file
3. Run the Tauri app: `pnpm tauri dev` or `pnpm tauri android dev`
4. Check the console logs to see which endpoints are being used

The app will log the selected endpoint configuration on startup.