# Firebase Integration Database Fix - Complete Solution

## Problem Summary
- Firebase auth works on frontend ✅
- Backend integration fails with "Failed to create user" ❌
- Root cause: Missing database columns + view dependency conflict

## Solution Options

### Option 1: RECOMMENDED - Add columns without changing mobile_number

Run this SQL in your Supabase SQL editor:

```sql
-- Step 1: Add the required Firebase columns (this will work)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS firebase_uid VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'otp';

-- Step 2: Create index for Firebase UID lookups  
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);

-- Step 3: Add comments for documentation
COMMENT ON COLUMN users.firebase_uid IS 'Firebase user UID for Firebase authenticated users';
COMMENT ON COLUMN users.is_verified IS 'Whether the user has verified their phone number';  
COMMENT ON COLUMN users.auth_provider IS 'Authentication provider: otp, firebase, etc.';
```

Then update your backend to normalize phone numbers by removing the country code:

### Option 2: If you need full phone numbers with country codes

1. First, get your view definition:
```sql
-- Check what the issue_vouch_counts view looks like
\d+ issue_vouch_counts
```

2. Drop the view, alter the table, recreate the view:
```sql
-- Drop the dependent view
DROP VIEW IF EXISTS issue_vouch_counts CASCADE;

-- Alter the column  
ALTER TABLE users ALTER COLUMN mobile_number TYPE VARCHAR(15);

-- Recreate the view (replace with your actual view definition)
CREATE VIEW issue_vouch_counts AS
SELECT 
    i.id,
    i.title, 
    i.description,
    i.category,
    i.status,
    u.mobile_number,
    u.full_name,
    COUNT(v.id) as vouch_count
FROM issues i
LEFT JOIN users u ON i.user_id = u.id  
LEFT JOIN vouches v ON i.id = v.issue_id
GROUP BY i.id, i.title, i.description, i.category, i.status, u.mobile_number, u.full_name;
```

## Backend Code Update

Add this function to your `main.py`:

```python
def normalize_phone_number(phone_number):
    """Convert Firebase phone number (+919876543210) to database format (9876543210)"""
    if not phone_number:
        return None
    if phone_number.startswith('+91'):
        return phone_number[3:]  # Remove +91 for Indian numbers
    elif phone_number.startswith('+'):
        return phone_number[1:]  # Remove + for other countries  
    return phone_number
```

Then update the user creation part in `firebase_auth()`:

```python
# Normalize phone number for database  
normalized_phone = normalize_phone_number(result['phone_number'])

# Use normalized phone for database operations
user_data = {
    'mobile_number': normalized_phone,  # Store without country code
    'firebase_uid': firebase_uid,
    'is_verified': True,
    'auth_provider': 'firebase'
}
```

## Testing

After applying the database changes:

1. Test Firebase auth from your app
2. Check if users are created in Supabase:
```sql
SELECT * FROM users WHERE auth_provider = 'firebase';
```

## Quick Verification

Run this to see if the columns were added:
```sql  
\d users
```

You should see the new columns: `firebase_uid`, `is_verified`, `auth_provider`

The integration will work once you apply Option 1 (recommended) - it's the safest approach that won't break your existing views.