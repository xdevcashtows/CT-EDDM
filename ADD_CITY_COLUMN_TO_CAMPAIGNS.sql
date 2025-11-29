-- Add city column to campaigns table
-- This column stores the city name as text (separate from city_id which references the cities table)

ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS city text null;

-- Add comment to document the column
COMMENT ON COLUMN public.campaigns.city IS 'City name as text (optional field, separate from city_id foreign key)';

