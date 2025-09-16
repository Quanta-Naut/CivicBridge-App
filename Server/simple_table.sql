-- Simple Issues Table for Supabase
-- Copy and paste this into your Supabase SQL Editor and run it

CREATE TABLE IF NOT EXISTS issues (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    latitude DOUBLE PRECISION DEFAULT 0,
    longitude DOUBLE PRECISION DEFAULT 0,
    category TEXT,
    priority TEXT,
    description_mode TEXT,
    image_filename TEXT,
    audio_filename TEXT,
    image_base64 TEXT,
    audio_base64 TEXT,
    vouch_priority INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Open',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_issues_created_at ON issues(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_category ON issues(category);
