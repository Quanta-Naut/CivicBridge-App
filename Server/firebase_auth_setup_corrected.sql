-- Firebase User Role Assignment for Supabase (Corrected Version)
-- This ensures Firebase authenticated users get the 'authenticated' role
-- Updated to match your actual database schema (users, issues tables only)

-- Step 1: Add firebase_uid column to users table if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS firebase_uid TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'otp';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- Step 2: Create a function to handle Firebase user authentication
CREATE OR REPLACE FUNCTION handle_firebase_user_auth()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This function will be called when a Firebase JWT is verified
  -- It ensures the user has the authenticated role
  
  -- Check if the current JWT is from Firebase
  IF auth.jwt() ->> 'iss' LIKE '%firebase%' OR auth.jwt() ->> 'aud' = 'civicbridge-53f4d' THEN
    -- Set the role to authenticated for Firebase users
    PERFORM set_config('role', 'authenticated', true);
  END IF;
END;
$$;

-- Step 3: Create a function to sync Firebase users to your users table
CREATE OR REPLACE FUNCTION sync_firebase_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  firebase_uid TEXT;
  phone_number TEXT;
  user_record RECORD;
  normalized_phone TEXT;
BEGIN
  -- Extract Firebase UID from JWT
  firebase_uid := auth.jwt() ->> 'sub';
  phone_number := auth.jwt() ->> 'phone_number';
  
  -- Only proceed if we have a Firebase UID
  IF firebase_uid IS NOT NULL THEN
    -- Normalize phone number (remove +91 prefix if exists)
    normalized_phone := CASE 
      WHEN phone_number LIKE '+91%' THEN SUBSTRING(phone_number FROM 4)
      WHEN phone_number LIKE '91%' AND LENGTH(phone_number) = 12 THEN SUBSTRING(phone_number FROM 3)
      ELSE COALESCE(phone_number, '')
    END;
    
    -- Check if user already exists by firebase_uid
    SELECT * INTO user_record FROM users WHERE firebase_uid = firebase_uid;
    
    -- If user doesn't exist, create them
    IF user_record IS NULL THEN
      -- Generate a unique civic_id
      INSERT INTO users (
        firebase_uid,
        mobile_number,
        auth_provider,
        is_verified,
        civic_id,
        created_at,
        updated_at
      ) VALUES (
        firebase_uid,
        normalized_phone,
        'firebase',
        true,
        'CIV' || LPAD(nextval('users_id_seq')::text, 6, '0'),
        NOW(),
        NOW()
      );
    END IF;
  END IF;
END;
$$;

-- Step 4: Enhanced RLS policies that work with Firebase JWT
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;

-- Drop existing policies and recreate with Firebase support
DROP POLICY IF EXISTS "Firebase users can access own data" ON users;
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Users table policies
CREATE POLICY "Firebase users can access own data"
ON users FOR ALL
TO authenticated
USING (
  firebase_uid = auth.jwt() ->> 'sub' OR
  firebase_uid = COALESCE(auth.jwt() ->> 'firebase_user_id', auth.jwt() ->> 'user_id')
)
WITH CHECK (
  firebase_uid = auth.jwt() ->> 'sub' OR
  firebase_uid = COALESCE(auth.jwt() ->> 'firebase_user_id', auth.jwt() ->> 'user_id')
);

-- Allow users to read all user profiles (for user lookup)
CREATE POLICY "Users can read all profiles"
ON users FOR SELECT
TO authenticated
USING (true);

-- Issues table policies with Firebase support
DROP POLICY IF EXISTS "Authenticated users can read all issues" ON issues;
DROP POLICY IF EXISTS "Firebase authenticated users can create issues" ON issues;
DROP POLICY IF EXISTS "Firebase users can update own issues" ON issues;
DROP POLICY IF EXISTS "Allow authenticated users to read issues" ON issues;
DROP POLICY IF EXISTS "Allow Firebase users to insert issues" ON issues;
DROP POLICY IF EXISTS "Allow Firebase users to update own issues" ON issues;

-- Allow all authenticated users to read all issues
CREATE POLICY "Authenticated users can read all issues"
ON issues FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to create issues
CREATE POLICY "Firebase authenticated users can create issues"
ON issues FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow if user exists in users table with matching firebase_uid
  EXISTS (
    SELECT 1 FROM users 
    WHERE firebase_uid = COALESCE(auth.jwt() ->> 'sub', auth.jwt() ->> 'firebase_user_id')
    AND id = user_id
  )
  OR user_id IS NULL -- Allow anonymous issues
);

-- Allow users to update their own issues
CREATE POLICY "Firebase users can update own issues"
ON issues FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE firebase_uid = COALESCE(auth.jwt() ->> 'sub', auth.jwt() ->> 'firebase_user_id')
    AND id = user_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE firebase_uid = COALESCE(auth.jwt() ->> 'sub', auth.jwt() ->> 'firebase_user_id')
    AND id = user_id
  )
);

-- Create a function to handle vouching that bypasses RLS
CREATE OR REPLACE FUNCTION vouch_issue(issue_id_param BIGINT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_vouch INTEGER;
  new_vouch INTEGER;
  result JSON;
BEGIN
  -- Get current vouch_priority
  SELECT vouch_priority INTO current_vouch 
  FROM issues 
  WHERE id = issue_id_param;
  
  -- Check if issue exists
  IF current_vouch IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Issue not found');
  END IF;
  
  -- Calculate new vouch count
  new_vouch := COALESCE(current_vouch, 0) + 1;
  
  -- Update vouch_priority (this bypasses RLS because of SECURITY DEFINER)
  UPDATE issues 
  SET vouch_priority = new_vouch,
      updated_at = NOW()
  WHERE id = issue_id_param;
  
  -- Return success result
  RETURN json_build_object(
    'success', true, 
    'issue_id', issue_id_param,
    'vouch_count', new_vouch,
    'vouch_priority', new_vouch
  );
END;
$$;

-- Anonymous access policies (for public issue viewing and creation)
DROP POLICY IF EXISTS "Allow anonymous users to read issues" ON issues;
DROP POLICY IF EXISTS "Allow anonymous users to insert issues" ON issues;

CREATE POLICY "Allow anonymous users to read issues"
ON issues FOR SELECT
TO anon
USING (true);

CREATE POLICY "Allow anonymous users to insert issues"
ON issues FOR INSERT
TO anon
WITH CHECK (user_id IS NULL);

-- Step 5: Grant necessary permissions
GRANT EXECUTE ON FUNCTION handle_firebase_user_auth() TO authenticated;
GRANT EXECUTE ON FUNCTION sync_firebase_user() TO authenticated;
GRANT EXECUTE ON FUNCTION vouch_issue(BIGINT) TO authenticated, anon;

-- Grant permissions for the authenticated role
GRANT SELECT, INSERT, UPDATE ON users TO authenticated;
GRANT SELECT, INSERT, UPDATE ON issues TO authenticated;

-- Grant permissions for anonymous users (public access)
GRANT SELECT, INSERT ON issues TO anon;

-- Step 6: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_users_mobile_number ON users(mobile_number);
CREATE INDEX IF NOT EXISTS idx_issues_user_id ON issues(user_id);
CREATE INDEX IF NOT EXISTS idx_issues_created_at ON issues(created_at);

-- Step 7: Test queries (uncomment to test)
-- Test Firebase JWT parsing:
-- SELECT 
--   auth.jwt() ->> 'sub' as firebase_uid,
--   auth.jwt() ->> 'phone_number' as phone,
--   auth.jwt() ->> 'iss' as issuer,
--   auth.role() as current_role;

-- Test user lookup by Firebase UID:
-- SELECT id, mobile_number, firebase_uid, auth_provider 
-- FROM users 
-- WHERE firebase_uid = 'your-firebase-uid-here';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Firebase authentication setup completed successfully!';
    RAISE NOTICE 'Tables configured: users, issues';
    RAISE NOTICE 'RLS policies created for Firebase JWT authentication';
    RAISE NOTICE 'Ready to use Firebase third-party authentication';
END $$;