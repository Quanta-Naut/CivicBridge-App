-- Step-by-step Firebase schema update (safer approach)
-- Run each section separately in your Supabase SQL editor

-- STEP 1: Add the new columns first (this should work without issues)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS firebase_uid VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'otp';

-- STEP 2: Create index for Firebase UID lookups
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);

-- STEP 3: Add comments for new columns
COMMENT ON COLUMN users.firebase_uid IS 'Firebase user UID for Firebase authenticated users';
COMMENT ON COLUMN users.is_verified IS 'Whether the user has verified their phone number';
COMMENT ON COLUMN users.auth_provider IS 'Authentication provider: otp, firebase, etc.';

-- STEP 4: Test the Firebase integration with current schema
-- The mobile_number field might work as VARCHAR(10) if phone numbers are stored without country codes
-- Try testing the Firebase auth first with these changes

-- STEP 5: Only if needed - Handle mobile_number column expansion
-- If you get errors about phone number length, then run the following:

-- 5a: First, check the current max length of mobile_number data
-- SELECT MAX(LENGTH(mobile_number)) as max_length FROM users;

-- 5b: If you need to expand mobile_number field, you'll need to:
-- DROP VIEW IF EXISTS issue_vouch_counts CASCADE;
-- ALTER TABLE users ALTER COLUMN mobile_number TYPE VARCHAR(15);
-- -- Then recreate your views (you'll need to provide the original view definition)

-- ALTERNATIVE: Store country code separately to avoid changing mobile_number
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS country_code VARCHAR(5) DEFAULT '+91';
-- This way you can keep mobile_number as VARCHAR(10) and construct full number when needed