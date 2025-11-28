-- Add campaign_contacts column to campaigns table
-- This column stores an array of contact IDs that are associated with the campaign
-- Contacts can be added to a campaign without being assigned to slots

ALTER TABLE public.campaigns
ADD COLUMN IF NOT EXISTS campaign_contacts uuid[] DEFAULT '{}'::uuid[];

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_campaigns_campaign_contacts 
ON public.campaigns USING GIN (campaign_contacts);

-- Add comment to document the column
COMMENT ON COLUMN public.campaigns.campaign_contacts IS 'Array of contact IDs that are part of this campaign. These contacts may or may not have slots assigned.';

