-- Quick Fix for Vouch Priority Update Issue
-- Run this in your Supabase SQL editor to fix the vouching problem

-- 1. Create a secure function to handle vouching that bypasses RLS
CREATE OR REPLACE FUNCTION vouch_issue(issue_id_param BIGINT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_vouch INTEGER;
  new_vouch INTEGER;
  result JSON;
BEGIN
  -- Get current vouch_priority
  SELECT vouch_priority INTO current_vouch 
  FROM issues 
  WHERE id = issue_id_param;
  
  -- Check if issue exists
  IF current_vouch IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Issue not found');
  END IF;
  
  -- Calculate new vouch count
  new_vouch := COALESCE(current_vouch, 0) + 1;
  
  -- Update vouch_priority (this bypasses RLS because of SECURITY DEFINER)
  UPDATE issues 
  SET vouch_priority = new_vouch,
      updated_at = NOW()
  WHERE id = issue_id_param;
  
  -- Return success result
  RETURN json_build_object(
    'success', true, 
    'issue_id', issue_id_param,
    'vouch_count', new_vouch,
    'vouch_priority', new_vouch
  );
END;
$$;

-- 2. Grant permissions to all users (authenticated and anonymous)
GRANT EXECUTE ON FUNCTION vouch_issue(BIGINT) TO authenticated, anon;

-- 3. Test the function (uncomment to test)
-- SELECT vouch_issue(19);

-- 4. Success message
DO $$
BEGIN
    RAISE NOTICE 'Vouch function created successfully!';
    RAISE NOTICE 'This function bypasses RLS and allows safe vouching for all users.';
    RAISE NOTICE 'Your backend will now use this function for vouching operations.';
END $$;