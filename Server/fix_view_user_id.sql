-- Quick fix: Update the issue_vouch_counts view to include user_id for proper filtering

-- Drop and recreate the view with user_id field
DROP VIEW IF EXISTS issue_vouch_counts;

-- Create the issue_vouch_counts view with user_id field for filtering
CREATE VIEW issue_vouch_counts AS
SELECT 
    i.id,
    i.user_id,  -- Add user_id from issues table for filtering
    i.title,
    i.description,
    i.status,
    i.category,
    i.priority,
    i.latitude,
    i.longitude,
    i.vouch_priority,
    i.created_at,
    i.updated_at,
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
GROUP BY i.id, i.user_id, i.title, i.description, i.status, i.category, i.priority, 
         i.latitude, i.longitude, i.vouch_priority, i.created_at, i.updated_at;

-- Grant public access to the updated view
GRANT SELECT ON issue_vouch_counts TO authenticated, anon;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Updated issue_vouch_counts view to include user_id field for filtering!';
END $$;