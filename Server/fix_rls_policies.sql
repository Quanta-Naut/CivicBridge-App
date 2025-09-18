-- Fix RLS Policies to Support Both Firebase and JWT Authentication
-- Run this in your Supabase SQL editor

-- Drop existing policies
DROP POLICY IF EXISTS "Allow Firebase users to read own user data" ON users;
DROP POLICY IF EXISTS "Allow Firebase users to insert own user data" ON users;
DROP POLICY IF EXISTS "Allow Firebase users to update own user data" ON users;

-- Create new policies that support both Firebase and JWT authentication
CREATE POLICY "Allow authenticated users to read own user data"
ON users FOR SELECT
TO authenticated
USING (
  -- Allow if firebase_uid matches (Firebase auth)
  (firebase_uid = auth.jwt() ->> 'sub') OR
  -- Allow if user_id matches (JWT auth)
  (id::text = auth.jwt() ->> 'user_id')
);

CREATE POLICY "Allow authenticated users to insert user data"
ON users FOR INSERT
TO authenticated
WITH CHECK (true);  -- Allow inserts for authenticated users

CREATE POLICY "Allow authenticated users to update own user data"
ON users FOR UPDATE
TO authenticated
USING (
  -- Allow if firebase_uid matches (Firebase auth)
  (firebase_uid = auth.jwt() ->> 'sub') OR
  -- Allow if user_id matches (JWT auth)
  (id::text = auth.jwt() ->> 'user_id')
)
WITH CHECK (
  -- Allow if firebase_uid matches (Firebase auth)
  (firebase_uid = auth.jwt() ->> 'sub') OR
  -- Allow if user_id matches (JWT auth)
  (id::text = auth.jwt() ->> 'user_id')
);

-- Also create a policy for service role (bypasses RLS)
CREATE POLICY "Allow service role full access"
ON users FOR ALL
TO service_role
USING (true)
WITH CHECK (true);