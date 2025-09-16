-- Query Examples for Issues with User Information
-- Run these after setting up the foreign key relationship

-- 1. Get all issues with user details who reported them
SELECT 
    i.id,
    i.title,
    i.description,
    i.category,
    i.priority,
    i.status,
    i.created_at,
    u.mobile_number,
    u.civic_id,
    u.full_name
FROM issues i
LEFT JOIN users u ON i.user_id = u.id
ORDER BY i.created_at DESC;

-- 2. Get issues reported by a specific user
SELECT 
    i.id,
    i.title,
    i.description,
    i.status,
    i.created_at
FROM issues i
JOIN users u ON i.user_id = u.id
WHERE u.mobile_number = 'XXXXXXXXXX' -- Replace with actual mobile number
ORDER BY i.created_at DESC;

-- 3. Count issues by user
SELECT 
    u.mobile_number,
    u.full_name,
    COUNT(i.id) as issue_count
FROM users u
LEFT JOIN issues i ON u.id = i.user_id
GROUP BY u.id, u.mobile_number, u.full_name
ORDER BY issue_count DESC;

-- 4. Get users who haven't reported any issues
SELECT 
    u.mobile_number,
    u.full_name,
    u.created_at
FROM users u
LEFT JOIN issues i ON u.id = i.user_id
WHERE i.user_id IS NULL;

-- 5. Update existing issues without user_id to assign to a default user (optional)
-- First create a system user if needed:
-- INSERT INTO users (mobile_number, civic_id, full_name, email) 
-- VALUES ('0000000000', 'SYS000000000', 'System User', 'system@civic.app')
-- ON CONFLICT (mobile_number) DO NOTHING;

-- Then update issues without user_id:
-- UPDATE issues 
-- SET user_id = (SELECT id FROM users WHERE mobile_number = '0000000000')
-- WHERE user_id IS NULL;