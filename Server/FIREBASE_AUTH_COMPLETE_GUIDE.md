# Firebase Third-Party Authentication Configuration Guide

## Environment Variables Setup

### Step 1: Firebase Service Account Key

1. Download the service account JSON from Firebase Console
2. Convert it to a single line JSON string (remove all newlines)
3. Add it to your .env file:

```env
# Firebase Configuration
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"civicbridge-53f4d","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}
```

### Step 2: Complete .env File Structure

Your .env file should look like this:

```env
# Supabase Configuration (ap-south-1 region)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-anon-key-here

# Firebase Configuration
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"civicbridge-53f4d",...}

# JWT Configuration (for custom auth if needed)
JWT_SECRET=your-jwt-secret-here
JWT_ALGORITHM=HS256

# SMS Configuration (if using SMS OTP)
SMS_API_KEY=your-sms-api-key
SMS_API_URL=https://api.textlocal.in/send/
```

## Installation Steps

### Step 1: Install Firebase Admin SDK

```bash
cd Server
pip install firebase-admin
```

### Step 2: Update requirements.txt

Add firebase-admin to your requirements.txt:

```txt
firebase-admin>=6.0.0
```

## Testing Firebase Authentication

### Step 1: Test Backend Token Verification

Run this Python script to test Firebase token verification:

```python
# test_firebase_auth.py
import os
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import auth, credentials
import json

# Load environment variables
load_dotenv()

# Initialize Firebase
firebase_cred_json = os.getenv('FIREBASE_SERVICE_ACCOUNT_KEY')
if firebase_cred_json:
    cred_dict = json.loads(firebase_cred_json)
    cred = credentials.Certificate(cred_dict)
    firebase_admin.initialize_app(cred)
    print("✅ Firebase Admin SDK initialized successfully")

# Test token verification (replace 'your-firebase-token' with actual token from frontend)
def test_token_verification(id_token):
    try:
        decoded_token = auth.verify_id_token(id_token)
        print(f"✅ Token verified successfully")
        print(f"UID: {decoded_token['uid']}")
        print(f"Phone: {decoded_token.get('phone_number', 'Not available')}")
        return decoded_token
    except Exception as e:
        print(f"❌ Token verification failed: {e}")
        return None

# Replace with actual Firebase ID token from your frontend
# test_token_verification("your-firebase-id-token-here")
```

### Step 2: Test Frontend to Backend Flow

1. **Login via Firebase in your app**
2. **Get the ID token** in your frontend:
```javascript
import { getAuth } from 'firebase/auth';

const auth = getAuth();
const user = auth.currentUser;
if (user) {
  user.getIdToken().then(token => {
    console.log('Firebase ID Token:', token);
    // Use this token in API calls
  });
}
```

3. **Make API calls with the token**:
```javascript
fetch('http://localhost:5000/api/issues', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${firebaseToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'Test Issue',
    description: 'Testing Firebase auth'
  })
});
```

## Troubleshooting

### Common Issues:

1. **"Firebase not available" error**:
   - Install firebase-admin: `pip install firebase-admin`
   - Check service account key format

2. **"Invalid token" error**:
   - Verify service account key is correct
   - Check if token is expired
   - Ensure token is from the correct Firebase project

3. **RLS policy errors**:
   - Run the firebase_rls_policies.sql script
   - Check if tables have RLS enabled
   - Verify user exists in users table with firebase_uid

4. **CORS errors**:
   - Backend already has CORS enabled
   - Check if frontend URL is correct

## Next Steps

After configuration:

1. ✅ Run `firebase_rls_policies.sql` in Supabase SQL editor
2. ✅ Install firebase-admin: `pip install firebase-admin`
3. ✅ Add service account key to .env file
4. ✅ Test authentication flow
5. ✅ Update frontend to use Firebase ID tokens for API calls

Your authentication flow will be:
Frontend (Firebase Auth) → Firebase ID Token → Backend (Verify Token) → Supabase (RLS Check) → Success! 🎉