# API Endpoint Configuration Fix

## Issue Fixed
The vouch functionality was using a hardcoded IP address (`10.49.61.121:5000`) instead of reading from the environment configuration.

## Changes Made
1. **Updated `vouch_for_issue` function** in `src-tauri/src/lib.rs` to use the centralized `get_api_endpoint()` function
2. **Updated fallback IP** to use `localhost:5000` instead of the hardcoded IP
3. **Centralized configuration** - all API calls now use the same endpoint configuration

## How to Configure API Endpoint

### Option 1: Update .env file (Recommended)
Edit the `.env` file in the `app/` directory and update the `TAURI_API_ENDPOINT` variable:

```properties
# For local development
TAURI_API_ENDPOINT=http://127.0.0.1:5000/api/issues

# For network access (replace with your actual IP)
TAURI_API_ENDPOINT=http://YOUR_IP_ADDRESS:5000/api/issues

# Current configuration
TAURI_API_ENDPOINT=http://10.42.19.207:5000/api/issues
```

### Option 2: Set Environment Variable
You can also set the environment variable at runtime:
```bash
# Windows
set TAURI_API_ENDPOINT=http://127.0.0.1:5000/api/issues

# Linux/Mac
export TAURI_API_ENDPOINT=http://127.0.0.1:5000/api/issues
```

### To Find Your Network IP Address:
```bash
# Windows
ipconfig

# Linux/Mac
ifconfig
ip addr show
```

## Verification
After making changes, the vouch functionality will automatically use the configured endpoint. You can verify by checking the console logs when vouching for an issue - it will show the URL being used.

## Benefits
- **Consistent configuration**: All API calls use the same endpoint
- **Easy deployment**: Change one configuration value to update all endpoints
- **No hardcoded IPs**: Flexible for different environments
- **Proper fallbacks**: Uses localhost as fallback instead of hardcoded IP