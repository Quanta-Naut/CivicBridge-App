-- Migration to update issues table for Supabase Storage integration
-- Run this SQL to add URL columns and optionally remove base64 columns

-- Add new URL columns for Supabase Storage
ALTER TABLE issues 
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS audio_url TEXT;

-- Optional: Remove old base64 columns (uncomment if you want to clean up)
-- WARNING: This will delete all existing base64 data
-- ALTER TABLE issues 
-- DROP COLUMN IF EXISTS image_base64,
-- DROP COLUMN IF EXISTS audio_base64;

-- Add comment for documentation
COMMENT ON COLUMN issues.image_url IS 'Supabase Storage public URL for issue images';
COMMENT ON COLUMN issues.audio_url IS 'Supabase Storage public URL for issue audio files';

-- Create storage buckets (execute these through Supabase Dashboard > Storage)
-- Bucket: civic-bridge-images (for images)
-- Bucket: civic-bridge-audio (for audio files)
-- Set both buckets to public for direct access

-- Example bucket creation queries (run in Supabase dashboard):
/*
INSERT INTO storage.buckets (id, name, public) 
VALUES ('Civic-Image-Bucket', 'Civic-Image-Bucket', true);

INSERT INTO storage.buckets (id, name, public) 
VALUES ('Civic-Audio-Bucket', 'Civic-Audio-Bucket', true);
*/

-- Add storage policies for public access (adjust based on security needs)
/*
-- Allow public uploads to images bucket
CREATE POLICY "Allow public uploads" ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'Civic-Image-Bucket');

-- Allow public access to images
CREATE POLICY "Allow public access" ON storage.objects FOR SELECT 
USING (bucket_id = 'Civic-Image-Bucket');

-- Allow public uploads to audio bucket
CREATE POLICY "Allow public uploads" ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'Civic-Audio-Bucket');

-- Allow public access to audio files
CREATE POLICY "Allow public access" ON storage.objects FOR SELECT 
USING (bucket_id = 'Civic-Audio-Bucket');
*/