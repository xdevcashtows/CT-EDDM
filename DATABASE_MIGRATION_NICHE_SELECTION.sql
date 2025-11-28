-- Migration: Add niche selection fields to campaigns table
-- Date: 2025-11-28
-- Description: Adds fields to support niche selection in campaign creation

-- Add niche_restriction_type column
-- Possible values: 'any' (default) or 'one_per_campaign'
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS niche_restriction_type TEXT DEFAULT 'any';

-- Add allowed_niches column to store array of niche IDs
-- This will be used when niche_restriction_type is 'one_per_campaign'
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS allowed_niches TEXT[] DEFAULT '{}';

-- Add comment to document the purpose of these fields
COMMENT ON COLUMN campaigns.niche_restriction_type IS 'Controls niche restrictions: "any" allows all niches, "one_per_campaign" restricts to selected niches with one per canvas';
COMMENT ON COLUMN campaigns.allowed_niches IS 'Array of niche IDs allowed in campaign when niche_restriction_type is "one_per_campaign"';

