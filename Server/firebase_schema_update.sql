-- Update users table to support Firebase authentication
-- Run this SQL in your Supabase SQL editor to add Firebase support

-- Add missing columns for Firebase integration
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS firebase_uid VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'otp';

-- Create index for Firebase UID lookups
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);

-- Update the mobile_number field to allow phone numbers with country codes
ALTER TABLE users ALTER COLUMN mobile_number TYPE VARCHAR(15);

-- Optional: Update existing users to mark them as verified if they have data
-- UPDATE users SET is_verified = true WHERE mobile_number IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN users.firebase_uid IS 'Firebase user UID for Firebase authenticated users';
COMMENT ON COLUMN users.is_verified IS 'Whether the user has verified their phone number';
COMMENT ON COLUMN users.auth_provider IS 'Authentication provider: otp, firebase, etc.';