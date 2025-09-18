-- Firebase User Role Assignment for Supabase
-- This ensures Firebase authenticated users get the 'authenticated' role

-- Step 1: Create a function to handle Firebase user authentication
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

-- Step 2: Create a function to sync Firebase users to your users table
CREATE OR REPLACE FUNCTION sync_firebase_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  firebase_uid TEXT;
  phone_number TEXT;
  user_record RECORD;
BEGIN
  -- Extract Firebase UID from JWT
  firebase_uid := auth.jwt() ->> 'sub';
  phone_number := auth.jwt() ->> 'phone_number';
  
  -- Only proceed if we have a Firebase UID
  IF firebase_uid IS NOT NULL THEN
    -- Check if user already exists
    SELECT * INTO user_record FROM users WHERE firebase_uid = firebase_uid;
    
    -- If user doesn't exist, create them
    IF user_record IS NULL THEN
      INSERT INTO users (
        firebase_uid,
        mobile_number,
        created_at,
        updated_at
      ) VALUES (
        firebase_uid,
        COALESCE(SUBSTRING(phone_number FROM 4), ''), -- Remove +91 prefix if exists
        NOW(),
        NOW()
      );
    END IF;
  END IF;
END;
$$;

-- Step 3: Enhanced RLS policies that work with Firebase JWT
-- Drop existing policies and recreate with Firebase support

-- Users table policies
DROP POLICY IF EXISTS "Firebase users can access own data" ON users;
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

-- Issues table policies with Firebase support
DROP POLICY IF EXISTS "Authenticated users can read all issues" ON issues;
DROP POLICY IF EXISTS "Firebase authenticated users can create issues" ON issues;
DROP POLICY IF EXISTS "Firebase users can update own issues" ON issues;

CREATE POLICY "Authenticated users can read all issues"
ON issues FOR SELECT
TO authenticated
USING (true);

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

-- Step 4: Grant necessary permissions
GRANT EXECUTE ON FUNCTION handle_firebase_user_auth() TO authenticated;
GRANT EXECUTE ON FUNCTION sync_firebase_user() TO authenticated;

-- Grant permissions for the authenticated role
GRANT SELECT, INSERT, UPDATE ON users TO authenticated;
GRANT SELECT, INSERT, UPDATE ON issues TO authenticated;
-- Note: vouch_entries table removed as it doesn't exist in current schema

-- Step 5: Test the setup
-- Test query to verify Firebase JWT parsing works:
-- SELECT 
--   auth.jwt() ->> 'sub' as firebase_uid,
--   auth.jwt() ->> 'phone_number' as phone,
--   auth.jwt() ->> 'iss' as issuer;