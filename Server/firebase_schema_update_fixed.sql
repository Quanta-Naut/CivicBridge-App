-- Updated Firebase schema fix that handles view dependencies
-- Run this SQL in your Supabase SQL editor to add Firebase support

-- Step 1: Drop dependent views temporarily (we'll recreate them)
-- Note: You may need to adjust this based on your actual views
DROP VIEW IF EXISTS issue_vouch_counts CASCADE;

-- Step 2: Add missing columns for Firebase integration
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS firebase_uid VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'otp';

-- Step 3: Update the mobile_number field to allow phone numbers with country codes
ALTER TABLE users ALTER COLUMN mobile_number TYPE VARCHAR(15);

-- Step 4: Create index for Firebase UID lookups
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);

-- Step 5: Recreate the issue_vouch_counts view (update this based on your actual view definition)
-- If you have a custom view, you'll need to replace this with your actual view definition
-- Example view recreation (adjust based on your needs):
/*
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
*/

-- Step 6: Optional - Update existing users to mark them as verified if they have data
-- UPDATE users SET is_verified = true WHERE mobile_number IS NOT NULL;

-- Step 7: Add comments for documentation
COMMENT ON COLUMN users.firebase_uid IS 'Firebase user UID for Firebase authenticated users';
COMMENT ON COLUMN users.is_verified IS 'Whether the user has verified their phone number';
COMMENT ON COLUMN users.auth_provider IS 'Authentication provider: otp, firebase, etc.';

-- Important: After running this, you may need to recreate any other views or rules 
-- that depend on the mobile_number column. Check your database for other dependencies.