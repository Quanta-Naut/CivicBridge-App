-- Query Examples for Vouch System
-- Run these after creating the vouch table

-- 1. Get all issues with their vouch counts and voucher details
SELECT 
    id,
    title,
    description,
    status,
    category,
    priority,
    vouch_count,
    vouchers
FROM issue_vouch_counts
ORDER BY vouch_count DESC, created_at DESC;

-- 2. Get issues vouched by a specific user
SELECT 
    i.id,
    i.title,
    i.description,
    i.status,
    v.created_at as vouched_at
FROM vouches v
JOIN issues i ON v.issue_id = i.id
JOIN users u ON v.user_id = u.id
WHERE u.mobile_number = 'XXXXXXXXXX' -- Replace with actual mobile number
ORDER BY v.created_at DESC;

-- 3. Get users who vouched for a specific issue
SELECT 
    u.mobile_number,
    u.civic_id,
    u.full_name,
    v.created_at as vouched_at
FROM vouches v
JOIN users u ON v.user_id = u.id
WHERE v.issue_id = 1 -- Replace with actual issue ID
ORDER BY v.created_at DESC;

-- 4. Get top issues by vouch count
SELECT 
    i.id,
    i.title,
    i.category,
    i.priority,
    i.status,
    COUNT(v.id) as vouch_count
FROM issues i
LEFT JOIN vouches v ON i.id = v.issue_id
GROUP BY i.id, i.title, i.category, i.priority, i.status
ORDER BY vouch_count DESC, i.created_at DESC
LIMIT 10;

-- 5. Get users who haven't vouched for any issues
SELECT 
    u.mobile_number,
    u.full_name,
    u.created_at as registered_at
FROM users u
LEFT JOIN vouches v ON u.id = v.user_id
WHERE v.user_id IS NULL
ORDER BY u.created_at DESC;

-- 6. Check if a specific user has vouched for a specific issue
SELECT 
    CASE 
        WHEN v.id IS NOT NULL THEN true 
        ELSE false 
    END as has_vouched,
    v.created_at as vouched_at
FROM users u
CROSS JOIN issues i
LEFT JOIN vouches v ON u.id = v.user_id AND i.id = v.issue_id
WHERE u.mobile_number = 'XXXXXXXXXX' -- Replace with actual mobile number
AND i.id = 1; -- Replace with actual issue ID

-- 7. Get vouch activity timeline
SELECT 
    v.created_at,
    u.mobile_number,
    u.full_name,
    i.id as issue_id,
    i.title as issue_title,
    i.category
FROM vouches v
JOIN users u ON v.user_id = u.id
JOIN issues i ON v.issue_id = i.id
ORDER BY v.created_at DESC
LIMIT 20;

-- 8. Get issues that need more vouches (less than 3 vouches)
SELECT 
    i.id,
    i.title,
    i.category,
    i.priority,
    i.status,
    COUNT(v.id) as current_vouches
FROM issues i
LEFT JOIN vouches v ON i.id = v.issue_id
WHERE i.status = 'Open'
GROUP BY i.id, i.title, i.category, i.priority, i.status
HAVING COUNT(v.id) < 3
ORDER BY COUNT(v.id) ASC, i.created_at DESC;