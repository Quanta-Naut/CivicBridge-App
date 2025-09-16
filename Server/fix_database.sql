-- Fix Database Schema - Add missing columns and foreign key relationships
-- Run this in your Supabase SQL Editor

-- First, create the users table if it doesn't exist
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

-- Add the missing user_id column to issues table with foreign key constraint
-- This will track which user reported each issue
ALTER TABLE issues ADD COLUMN IF NOT EXISTS user_id BIGINT;

-- Add the foreign key constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_issues_user_id' 
        AND table_name = 'issues'
    ) THEN
        ALTER TABLE issues 
        ADD CONSTRAINT fk_issues_user_id 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_mobile_number ON users(mobile_number);
CREATE INDEX IF NOT EXISTS idx_users_civic_id ON users(civic_id);
CREATE INDEX IF NOT EXISTS idx_issues_user_id ON issues(user_id);

-- Add comment to the foreign key column for documentation
COMMENT ON COLUMN issues.user_id IS 'References the user who reported this issue (users.id)';

-- Add trigger function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers if they don't exist
DROP TRIGGER IF EXISTS update_issues_updated_at ON issues;
CREATE TRIGGER update_issues_updated_at 
    BEFORE UPDATE ON issues 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();