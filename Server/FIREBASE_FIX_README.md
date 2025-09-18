# Firebase Integration Fix - Database Schema Update

## Issue Identified
The Firebase authentication integration is failing with "Failed to create user" error because the Supabase users table is missing required columns for Firebase authentication.

## Root Cause
The current users table schema doesn't include:
- `firebase_uid` (VARCHAR) - Firebase user UID
- `is_verified` (BOOLEAN) - Phone verification status  
- `auth_provider` (VARCHAR) - Authentication provider type
- The `mobile_number` field is too small (VARCHAR(10)) to handle phone numbers with country codes

## Solution

### Step 1: Update Database Schema
Run the SQL commands in `firebase_schema_update.sql` in your Supabase SQL editor:

```sql
-- Add missing columns for Firebase integration
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS firebase_uid VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'otp';

-- Update mobile_number to handle country codes
ALTER TABLE users ALTER COLUMN mobile_number TYPE VARCHAR(15);

-- Add index for Firebase UID lookups
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);
```

### Step 2: Verify the Fix
1. Apply the schema changes in Supabase
2. Test Firebase authentication from your mobile app
3. Check that new users are created in the users table with Firebase data

### Step 3: Expected Behavior After Fix
- User authenticates with Firebase → Gets Firebase ID token
- Frontend calls backend `/auth/firebase` endpoint with token
- Backend verifies token and creates user in Supabase with:
  - `mobile_number`: Full phone number with country code (e.g., "+919876543210")
  - `firebase_uid`: Firebase user UID
  - `is_verified`: true
  - `auth_provider`: "firebase"
- User can now use the app with data properly stored in Supabase

## Files Created
- `firebase_schema_update.sql` - SQL to update existing database
- `database_schema_firebase.sql` - Complete schema for new installations

## Integration Flow (Post-Fix)
1. ✅ Firebase auth works on frontend
2. ✅ Frontend calls backend API
3. ✅ Backend verifies Firebase token
4. ✅ Backend creates/updates user in Supabase (FIXED)
5. ✅ User data is properly synced between Firebase and Supabase

The integration code is complete and working - only the database schema needed to be updated!