-- Add saved_route_ids column to campaigns table
-- This column stores an array of saved route IDs (plural) to support multiple route selection
-- The existing saved_route_id column (singular) is kept for backward compatibility

ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS saved_route_ids uuid[] null default '{}'::uuid[];

-- Add comment to document the column
COMMENT ON COLUMN public.campaigns.saved_route_ids IS 'Array of saved route IDs for multiple route selection (replaces single saved_route_id)';

-- Create GIN index for efficient array queries (similar to campaign_contacts)
CREATE INDEX IF NOT EXISTS idx_campaigns_saved_route_ids ON public.campaigns USING gin (saved_route_ids);

