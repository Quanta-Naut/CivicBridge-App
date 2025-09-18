-- Alternative: Disable RLS for development (LESS SECURE)
-- Run this SQL in your Supabase SQL Editor ONLY for development/testing

-- Disable RLS on storage.objects table (makes buckets completely public)
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Note: This makes ALL storage buckets in your project public
-- For production, use the proper RLS policies from fix_storage_policies.sql instead