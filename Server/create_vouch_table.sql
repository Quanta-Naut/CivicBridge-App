-- Create Vouch Table
-- Run this in your Supabase SQL Editor

-- Create the vouch table to track user vouches for issues
CREATE TABLE IF NOT EXISTS vouches (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    issue_id BIGINT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure a user can only vouch once per issue
    CONSTRAINT unique_user_issue_vouch UNIQUE (user_id, issue_id)
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_vouches_user_id ON vouches(user_id);
CREATE INDEX IF NOT EXISTS idx_vouches_issue_id ON vouches(issue_id);
CREATE INDEX IF NOT EXISTS idx_vouches_created_at ON vouches(created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE vouches IS 'Tracks which users have vouched for which issues';
COMMENT ON COLUMN vouches.user_id IS 'References the user who made the vouch (users.id)';
COMMENT ON COLUMN vouches.issue_id IS 'References the issue being vouched for (issues.id)';
COMMENT ON CONSTRAINT unique_user_issue_vouch ON vouches IS 'Ensures each user can only vouch once per issue';

-- Add trigger for updating updated_at timestamp
CREATE TRIGGER update_vouches_updated_at 
    BEFORE UPDATE ON vouches 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create a view to get vouch counts per issue
CREATE OR REPLACE VIEW issue_vouch_counts AS
SELECT 
    i.id,
    i.title,
    i.description,
    i.status,
    i.category,
    i.priority,
    i.created_at,
    COUNT(v.id) as vouch_count,
    ARRAY_AGG(
        JSON_BUILD_OBJECT(
            'user_id', u.id,
            'mobile_number', u.mobile_number,
            'civic_id', u.civic_id,
            'full_name', u.full_name,
            'vouched_at', v.created_at
        )
    ) FILTER (WHERE v.id IS NOT NULL) as vouchers
FROM issues i
LEFT JOIN vouches v ON i.id = v.issue_id
LEFT JOIN users u ON v.user_id = u.id
GROUP BY i.id, i.title, i.description, i.status, i.category, i.priority, i.created_at;

-- Create a function to add a vouch (with duplicate prevention)
CREATE OR REPLACE FUNCTION add_vouch(p_user_id BIGINT, p_issue_id BIGINT)
RETURNS JSON AS $$
DECLARE
    result JSON;
    vouch_id BIGINT;
BEGIN
    -- Try to insert the vouch
    INSERT INTO vouches (user_id, issue_id)
    VALUES (p_user_id, p_issue_id)
    ON CONFLICT (user_id, issue_id) DO NOTHING
    RETURNING id INTO vouch_id;
    
    IF vouch_id IS NOT NULL THEN
        -- New vouch created
        result := JSON_BUILD_OBJECT(
            'success', true,
            'message', 'Vouch added successfully',
            'vouch_id', vouch_id,
            'already_vouched', false
        );
    ELSE
        -- User already vouched for this issue
        result := JSON_BUILD_OBJECT(
            'success', false,
            'message', 'You have already vouched for this issue',
            'already_vouched', true
        );
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create a function to remove a vouch
CREATE OR REPLACE FUNCTION remove_vouch(p_user_id BIGINT, p_issue_id BIGINT)
RETURNS JSON AS $$
DECLARE
    result JSON;
    deleted_count INT;
BEGIN
    -- Try to delete the vouch
    DELETE FROM vouches 
    WHERE user_id = p_user_id AND issue_id = p_issue_id;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    IF deleted_count > 0 THEN
        result := JSON_BUILD_OBJECT(
            'success', true,
            'message', 'Vouch removed successfully'
        );
    ELSE
        result := JSON_BUILD_OBJECT(
            'success', false,
            'message', 'No vouch found to remove'
        );
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;