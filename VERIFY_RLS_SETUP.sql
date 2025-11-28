-- ============================================
-- VERIFICATION SCRIPT
-- Run these queries to verify RLS is properly configured
-- ============================================

-- 1. Check which tables have RLS enabled
SELECT 
  schemaname, 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename IN (
    'pipeline_stages',
    'campaign_revenue', 
    'contact_pipeline_summary',
    'contacts',
    'campaigns',
    'client_ads'
  )
ORDER BY tablename;

-- Expected: All should have rls_enabled = true


-- 2. Check policies on pipeline_stages
SELECT 
  tablename, 
  policyname, 
  cmd as command,
  CASE 
    WHEN qual LIKE '%auth.uid()%' THEN '✓ Secured'
    ELSE '✗ Not Secured'
  END as security_status
FROM pg_policies 
WHERE tablename = 'pipeline_stages'
ORDER BY cmd;

-- Expected: 4 policies (SELECT, INSERT, UPDATE, DELETE) all showing '✓ Secured'


-- 3. Check if campaign_revenue is a view and if it has security
SELECT 
  viewname,
  CASE 
    WHEN definition LIKE '%auth.uid()%' THEN '✓ Has security filter'
    ELSE '✗ No security filter'
  END as security_status
FROM pg_views 
WHERE schemaname = 'public' 
  AND viewname = 'campaign_revenue';

-- Expected: '✓ Has security filter'


-- 4. Check if contact_pipeline_summary is a view and if it has security
SELECT 
  viewname,
  CASE 
    WHEN definition LIKE '%auth.uid()%' THEN '✓ Has security filter'
    ELSE '✗ No security filter'
  END as security_status
FROM pg_views 
WHERE schemaname = 'public' 
  AND viewname = 'contact_pipeline_summary';

-- Expected: '✓ Has security filter'


-- 5. Count existing pipeline stages per user
SELECT 
  user_id,
  COUNT(*) as stage_count,
  array_agg(stage_id ORDER BY sort_order) as stage_ids
FROM pipeline_stages
GROUP BY user_id;

-- This shows which users have stages configured


-- 6. Check for contacts with invalid stages (after constraint removal)
SELECT DISTINCT
  c.stage,
  COUNT(*) as contact_count
FROM contacts c
LEFT JOIN pipeline_stages ps ON ps.stage_id = c.stage AND ps.user_id = c.user_id
WHERE ps.id IS NULL
GROUP BY c.stage;

-- This shows any contacts with stages that don't exist in pipeline_stages
-- These contacts may have issues until their stage is created or they're reassigned


-- 7. Verify the helper functions exist
SELECT 
  proname as function_name,
  pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname IN ('can_delete_pipeline_stage', 'get_stage_contact_count');

-- Expected: Both functions should exist

