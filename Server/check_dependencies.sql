-- Safe Firebase schema update - Check dependencies first
-- Run this SQL in your Supabase SQL editor

-- Step 1: Check what views/rules depend on mobile_number column
SELECT 
    schemaname,
    viewname,
    definition
FROM pg_views 
WHERE definition LIKE '%mobile_number%';

-- Also check for rules
SELECT 
    schemaname,
    tablename,
    rulename
FROM pg_rules 
WHERE definition LIKE '%mobile_number%';

-- Step 2: List all dependencies (run this to see what needs to be handled)
SELECT 
    r.ev_class::regclass AS table_name,
    r.rulename,
    r.definition
FROM pg_rewrite r
JOIN pg_class c ON c.oid = r.ev_class
JOIN pg_attribute a ON a.attrelid = c.oid
WHERE a.attname = 'mobile_number'
    AND r.rulename != '_RETURN'
    AND c.relname = 'users';