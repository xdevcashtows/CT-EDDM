-- Migration: Add category field to niches table
-- This allows organizing niches into categories for better contact selection

-- Add category column to niches table
ALTER TABLE public.niches 
ADD COLUMN IF NOT EXISTS category text NULL;

-- Create index for category lookups
CREATE INDEX IF NOT EXISTS idx_niches_category ON public.niches USING btree (category) TABLESPACE pg_default;

-- Optional: Add a comment to document the category field
COMMENT ON COLUMN public.niches.category IS 'Category name for grouping niches (e.g., "Automotive", "Real Estate", "Services")';

-- Example: Update existing niches with categories (customize based on your niche names)
-- You can run these updates manually or create a script to categorize your niches
-- UPDATE public.niches SET category = 'Automotive' WHERE name ILIKE '%auto%' OR name ILIKE '%vehicle%' OR name ILIKE '%car%';
-- UPDATE public.niches SET category = 'Real Estate' WHERE name ILIKE '%real estate%' OR name ILIKE '%property%';
-- UPDATE public.niches SET category = 'Services' WHERE name ILIKE '%service%' OR name ILIKE '%repair%';
-- etc.

