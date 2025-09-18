-- Quick Fix for Vouch Priority Update Issue with Proper Vouches Table Integration
-- Run this in your Supabase SQL editor to fix the vouching problem

-- 1. Create a secure function to handle vouching with user tracking
CREATE OR REPLACE FUNCTION vouch_issue(issue_id_param BIGINT, user_id_param BIGINT DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  issue_exists BOOLEAN := false;
  current_vouch_count INTEGER;
  new_vouch_count INTEGER;
  already_vouched BOOLEAN := false;
  firebase_uid TEXT;
  actual_user_id BIGINT;
BEGIN
  -- Check if issue exists
  SELECT EXISTS(SELECT 1 FROM issues WHERE id = issue_id_param) INTO issue_exists;
  
  IF NOT issue_exists THEN
    RETURN json_build_object('success', false, 'error', 'Issue not found');
  END IF;

  -- If user_id is not provided, try to extract from JWT (for Firebase auth)
  IF user_id_param IS NULL THEN
    firebase_uid := auth.jwt() ->> 'sub';
    
    IF firebase_uid IS NOT NULL THEN
      -- Find user by Firebase UID
      SELECT id INTO actual_user_id 
      FROM users 
      WHERE firebase_uid = firebase_uid
      LIMIT 1;
    END IF;
  ELSE
    actual_user_id := user_id_param;
  END IF;

  -- If we have a user, check if they already vouched
  IF actual_user_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM vouches 
      WHERE user_id = actual_user_id AND issue_id = issue_id_param
    ) INTO already_vouched;
    
    IF already_vouched THEN
      RETURN json_build_object(
        'success', false, 
        'error', 'User has already vouched for this issue',
        'already_vouched', true
      );
    END IF;
    
    -- Insert vouch record
    INSERT INTO vouches (user_id, issue_id, created_at)
    VALUES (actual_user_id, issue_id_param, NOW());
  END IF;

  -- Get current vouch count from vouches table
  SELECT COUNT(*) INTO current_vouch_count
  FROM vouches 
  WHERE issue_id = issue_id_param;
  
  -- Update vouch_priority in issues table to match actual vouch count
  UPDATE issues 
  SET vouch_priority = current_vouch_count,
      updated_at = NOW()
  WHERE id = issue_id_param;
  
  -- Return success result
  RETURN json_build_object(
    'success', true, 
    'issue_id', issue_id_param,
    'vouch_count', current_vouch_count,
    'vouch_priority', current_vouch_count,
    'user_vouched', actual_user_id IS NOT NULL,
    'user_id', actual_user_id
  );
END;
$$;

-- 2. Create a function to check if user has already vouched
CREATE OR REPLACE FUNCTION check_user_vouch(issue_id_param BIGINT, user_id_param BIGINT DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  firebase_uid TEXT;
  actual_user_id BIGINT;
  has_vouched BOOLEAN := false;
  vouch_count INTEGER;
BEGIN
  -- If user_id is not provided, try to extract from JWT (for Firebase auth)
  IF user_id_param IS NULL THEN
    firebase_uid := auth.jwt() ->> 'sub';
    
    IF firebase_uid IS NOT NULL THEN
      -- Find user by Firebase UID
      SELECT id INTO actual_user_id 
      FROM users 
      WHERE firebase_uid = firebase_uid
      LIMIT 1;
    END IF;
  ELSE
    actual_user_id := user_id_param;
  END IF;

  -- Check if user has vouched
  IF actual_user_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM vouches 
      WHERE user_id = actual_user_id AND issue_id = issue_id_param
    ) INTO has_vouched;
  END IF;

  -- Get total vouch count for the issue
  SELECT COUNT(*) INTO vouch_count
  FROM vouches 
  WHERE issue_id = issue_id_param;

  RETURN json_build_object(
    'issue_id', issue_id_param,
    'user_id', actual_user_id,
    'user_vouched', has_vouched,
    'vouch_count', vouch_count,
    'vouch_priority', vouch_count
  );
END;
$$;

-- 3. Grant permissions to all users (authenticated and anonymous)
GRANT EXECUTE ON FUNCTION vouch_issue(BIGINT, BIGINT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION check_user_vouch(BIGINT, BIGINT) TO authenticated, anon;

-- 4. Enable RLS on vouches table and create policies
ALTER TABLE vouches ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read all vouches" ON vouches;
DROP POLICY IF EXISTS "Users can insert own vouches" ON vouches;
DROP POLICY IF EXISTS "Firebase users can read vouches" ON vouches;
DROP POLICY IF EXISTS "Firebase users can insert vouches" ON vouches;

-- Allow users to read all vouch records (public information)
CREATE POLICY "Users can read all vouches"
ON vouches FOR SELECT
TO authenticated, anon
USING (true);

-- Allow authenticated users to insert vouches (handled by function)
CREATE POLICY "Firebase users can insert vouches"
ON vouches FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE firebase_uid = auth.jwt() ->> 'sub'
    AND id = user_id
  )
);

-- Grant permissions on vouches table
GRANT SELECT, INSERT ON vouches TO authenticated, anon;

-- 5. Test the functions (uncomment to test)
-- SELECT vouch_issue(19, 1);  -- Vouch for issue 19 as user 1
-- SELECT check_user_vouch(19, 1);  -- Check if user 1 vouched for issue 19

-- 6. Success message
DO $$
BEGIN
    RAISE NOTICE 'Enhanced vouch system created successfully!';
    RAISE NOTICE 'Features:';
    RAISE NOTICE '- Prevents duplicate vouches per user per issue';
    RAISE NOTICE '- Tracks which user vouched for which issue';
    RAISE NOTICE '- Works with Firebase authentication';
    RAISE NOTICE '- Syncs vouch_priority with actual vouch count';
    RAISE NOTICE '- RLS policies for secure access';
END $$;