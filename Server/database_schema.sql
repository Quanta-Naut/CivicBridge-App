-- Supabase Database Schema for Issues Management System
-- Run this SQL in your Supabase SQL editor to create the required tables

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    mobile_number VARCHAR(10) UNIQUE NOT NULL,
    civic_id VARCHAR(20) UNIQUE,
    full_name VARCHAR(255),
    email VARCHAR(255),
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create issues table
CREATE TABLE IF NOT EXISTS issues (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    latitude DOUBLE PRECISION DEFAULT 0,
    longitude DOUBLE PRECISION DEFAULT 0,
    category TEXT,
    priority TEXT,
    description_mode TEXT,
    image_filename TEXT,
    audio_filename TEXT,
    image_url TEXT, -- Supabase Storage URL for images
    audio_url TEXT, -- Supabase Storage URL for audio files
    status TEXT DEFAULT 'Open',
    vouch_priority INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create storage buckets for file uploads (run this in Supabase dashboard or via API)
-- This needs to be done through the Supabase dashboard:
-- 1. Go to Storage in your Supabase dashboard
-- 2. Create new buckets:
--    - 'Civic-Image-Bucket' for image files
--    - 'Civic-Audio-Bucket' for audio files
-- 3. Set them to public if you want direct access to files
-- 4. Configure RLS policies as needed for security

-- Add RLS (Row Level Security) policies if needed
-- ALTER TABLE issues ENABLE ROW LEVEL SECURITY;

-- Example policy to allow all operations (adjust based on your authentication needs)
-- CREATE POLICY "Allow all operations on issues" ON issues FOR ALL USING (true);

-- Add indexes for better performance

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_mobile_number ON users(mobile_number);
CREATE INDEX IF NOT EXISTS idx_users_civic_id ON users(civic_id);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- Issues table indexes
CREATE INDEX IF NOT EXISTS idx_issues_created_at ON issues(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_category ON issues(category);
CREATE INDEX IF NOT EXISTS idx_issues_priority ON issues(priority);
CREATE INDEX IF NOT EXISTS idx_issues_user_id ON issues(user_id);
CREATE INDEX IF NOT EXISTS idx_issues_location ON issues(latitude, longitude);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_issues_updated_at 
    BEFORE UPDATE ON issues 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
