-- ============================================
-- Add RLS Policies for Unrestricted Tables
-- ============================================
-- These tables currently have no Row Level Security,
-- which means ANY authenticated user can access ANY data.
-- This is a security risk!
-- ============================================

-- ============================================
-- 1. PIPELINE_STAGES (NEW TABLE - Critical!)
-- ============================================
-- This table stores user-specific pipeline stages
-- Users should only see/edit their own stages

-- Enable RLS
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own stages
CREATE POLICY "Users can view own pipeline stages"
ON public.pipeline_stages
FOR SELECT
TO public
USING (auth.uid() = user_id);

-- Policy: Users can create their own stages
CREATE POLICY "Users can create own pipeline stages"
ON public.pipeline_stages
FOR INSERT
TO public
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own stages
CREATE POLICY "Users can update own pipeline stages"
ON public.pipeline_stages
FOR UPDATE
TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own stages
CREATE POLICY "Users can delete own pipeline stages"
ON public.pipeline_stages
FOR DELETE
TO public
USING (auth.uid() = user_id);


-- ============================================
-- 2. CAMPAIGN_REVENUE (VIEW - Needs Security)
-- ============================================
-- This is a VIEW that shows campaign revenue metrics
-- Users should only see their own campaign revenue

-- Note: If this is a VIEW, we need to handle it differently
-- First, check if it's a view or table, then apply appropriate security

-- If it's a VIEW, create a secure view instead:
DROP VIEW IF EXISTS public.campaign_revenue CASCADE;

CREATE OR REPLACE VIEW public.campaign_revenue 
WITH (security_barrier = true, security_invoker = true)
AS
SELECT 
  c.id as campaign_id,
  c.name as campaign_name,
  c.user_id,
  c.status,
  COUNT(DISTINCT CASE WHEN a.status IN ('booked', 'reserved') THEN a.id END) as booked_slots,
  COUNT(DISTINCT CASE WHEN a.slot_size = 'small' AND a.status IN ('booked', 'reserved') THEN a.id END) as small_slots,
  COUNT(DISTINCT CASE WHEN a.slot_size = 'medium' AND a.status IN ('booked', 'reserved') THEN a.id END) as medium_slots,
  COUNT(DISTINCT CASE WHEN a.slot_size = 'large' AND a.status IN ('booked', 'reserved') THEN a.id END) as large_slots,
  COALESCE(
    SUM(CASE 
      WHEN a.status IN ('booked', 'reserved') THEN
        CASE a.slot_size
          WHEN 'small' THEN c.price_small
          WHEN 'medium' THEN c.price_medium
          WHEN 'large' THEN c.price_large
          ELSE 0
        END
      ELSE 0
    END), 0
  ) as total_revenue
FROM campaigns c
LEFT JOIN ad_slots a ON a.campaign_id = c.id
WHERE c.user_id = auth.uid()  -- Security filter: only show current user's data
GROUP BY c.id, c.name, c.user_id, c.status;

-- Grant SELECT to authenticated users (RLS is enforced in the view)
GRANT SELECT ON public.campaign_revenue TO authenticated;


-- ============================================
-- 3. CONTACT_PIPELINE_SUMMARY (VIEW - Needs Security)
-- ============================================
-- This VIEW shows contact counts by pipeline stage
-- Users should only see their own contact summaries

DROP VIEW IF EXISTS public.contact_pipeline_summary CASCADE;

CREATE OR REPLACE VIEW public.contact_pipeline_summary 
WITH (security_barrier = true, security_invoker = true)
AS
SELECT 
  c.user_id,
  c.stage,
  COUNT(*) as count,
  COUNT(CASE 
    WHEN c.next_follow_up_date IS NOT NULL 
    AND c.next_follow_up_date < CURRENT_DATE 
    THEN 1 
  END) as overdue_followups
FROM contacts c
WHERE c.user_id = auth.uid()  -- Security filter: only show current user's data
GROUP BY c.user_id, c.stage;

-- Grant SELECT to authenticated users (RLS is enforced in the view)
GRANT SELECT ON public.contact_pipeline_summary TO authenticated;


-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the policies are working:

-- 1. Check pipeline_stages policies
SELECT tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'pipeline_stages';

-- 2. Check that views have security_barrier enabled
SELECT 
  viewname, 
  viewowner,
  definition 
FROM pg_views 
WHERE viewname IN ('campaign_revenue', 'contact_pipeline_summary')
AND schemaname = 'public';

-- 3. Test that RLS is enabled
SELECT 
  schemaname, 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE tablename IN ('pipeline_stages', 'campaign_revenue', 'contact_pipeline_summary')
AND schemaname = 'public';

