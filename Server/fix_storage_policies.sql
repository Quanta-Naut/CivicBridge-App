-- Fix Supabase Storage RLS Policies for Civic-Image-Bucket and Civic-Audio-Bucket
-- IMPORTANT: Do NOT run this in SQL Editor - Use Supabase Dashboard instead!

-- ============================================================================
-- SOLUTION 1: Use Supabase Dashboard (RECOMMENDED)
-- ============================================================================
-- 1. Go to your Supabase Dashboard
-- 2. Navigate to Storage > Policies
-- 3. Click "New Policy" for each bucket
-- 4. Use the templates below or create custom policies

-- ============================================================================
-- SOLUTION 2: Alternative - Make buckets completely public (EASIER)
-- ============================================================================
-- If the above doesn't work, make your buckets public:
-- 1. Go to Storage > Buckets in your Supabase Dashboard  
-- 2. Click on 'Civic-Image-Bucket' 
-- 3. Set 'Public bucket' to ON
-- 4. Repeat for 'Civic-Audio-Bucket'

-- ============================================================================
-- SOLUTION 3: Use service_role key (ADVANCED - Not recommended for production)
-- ============================================================================
-- You can also use the service_role key instead of anon key in your .env
-- But this bypasses RLS entirely and is less secure

-- Policy Templates (for Dashboard use):
-- Name: "Allow public uploads to Civic-Image-Bucket"
-- Operation: INSERT
-- Target: storage.objects  
-- Policy: bucket_id = 'Civic-Image-Bucket'

-- Name: "Allow public access to Civic-Image-Bucket"  
-- Operation: SELECT
-- Target: storage.objects
-- Policy: bucket_id = 'Civic-Image-Bucket'

-- Repeat similar policies for 'Civic-Audio-Bucket'