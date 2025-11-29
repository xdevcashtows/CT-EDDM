-- Add state column to campaigns table
-- This column stores the state name as text (optional field)

ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS state text null;

-- Add comment to document the column
COMMENT ON COLUMN public.campaigns.state IS 'State name as text (optional field)';

