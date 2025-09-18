-- Firebase Authentication RLS Policies for Supabase
-- Run these commands in your Supabase SQL editor

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouch_entries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow Firebase users to read own user data" ON users;
DROP POLICY IF EXISTS "Allow Firebase users to insert own user data" ON users;
DROP POLICY IF EXISTS "Allow Firebase users to update own user data" ON users;

DROP POLICY IF EXISTS "Allow authenticated users to read issues" ON issues;
DROP POLICY IF EXISTS "Allow Firebase users to insert issues" ON issues;
DROP POLICY IF EXISTS "Allow Firebase users to update own issues" ON issues;

DROP POLICY IF EXISTS "Allow Firebase users to read vouch entries" ON vouch_entries;
DROP POLICY IF EXISTS "Allow Firebase users to insert vouch entries" ON vouch_entries;

-- Users table policies for Firebase authentication
CREATE POLICY "Allow Firebase users to read own user data"
ON users FOR SELECT
TO authenticated
USING (firebase_uid = auth.jwt() ->> 'sub');

CREATE POLICY "Allow Firebase users to insert own user data"
ON users FOR INSERT
TO authenticated
WITH CHECK (firebase_uid = auth.jwt() ->> 'sub');

CREATE POLICY "Allow Firebase users to update own user data"
ON users FOR UPDATE
TO authenticated
USING (firebase_uid = auth.jwt() ->> 'sub')
WITH CHECK (firebase_uid = auth.jwt() ->> 'sub');

-- Issues table policies for Firebase authentication
CREATE POLICY "Allow authenticated users to read issues"
ON issues FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow Firebase users to insert issues"
ON issues FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow if user exists in users table with matching firebase_uid
  EXISTS (
    SELECT 1 FROM users 
    WHERE firebase_uid = auth.jwt() ->> 'sub'
    AND id = user_id
  )
  OR user_id IS NULL -- Allow anonymous issues
);

CREATE POLICY "Allow Firebase users to update own issues"
ON issues FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE firebase_uid = auth.jwt() ->> 'sub'
    AND id = user_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE firebase_uid = auth.jwt() ->> 'sub'
    AND id = user_id
  )
);

-- Vouch entries policies for Firebase authentication
CREATE POLICY "Allow Firebase users to read vouch entries"
ON vouch_entries FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow Firebase users to insert vouch entries"
ON vouch_entries FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE firebase_uid = auth.jwt() ->> 'sub'
    AND id = user_id
  )
);

-- Allow anonymous access for public issue reporting
CREATE POLICY "Allow anonymous users to read issues"
ON issues FOR SELECT
TO anon
USING (true);

CREATE POLICY "Allow anonymous users to insert issues"
ON issues FOR INSERT
TO anon
WITH CHECK (user_id IS NULL);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON users TO authenticated;
GRANT SELECT, INSERT, UPDATE ON issues TO authenticated, anon;
GRANT SELECT, INSERT ON vouch_entries TO authenticated;

-- Test the setup
-- You can run this to test if policies are working:
-- SELECT auth.jwt() ->> 'sub' as firebase_uid;