-- Migration: Add temperature column to contacts table
-- Purpose: Add lead temperature tracking (hot, warm, cold)
-- Date: 2025-11-28

-- Add temperature column to contacts table
ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS temperature text NULL DEFAULT 'warm'::text;

-- Add check constraint to ensure valid values
ALTER TABLE public.contacts
ADD CONSTRAINT contacts_temperature_check CHECK (
  temperature IS NULL OR temperature = ANY (
    ARRAY[
      'hot'::text,
      'warm'::text,
      'cold'::text
    ]
  )
);

-- Create index for filtering by temperature
CREATE INDEX IF NOT EXISTS idx_contacts_temperature 
ON public.contacts USING btree (temperature) 
TABLESPACE pg_default;

-- Update existing NULL values to 'warm' (default)
UPDATE public.contacts 
SET temperature = 'warm' 
WHERE temperature IS NULL;

-- Comments for documentation
COMMENT ON COLUMN public.contacts.temperature IS 'Lead temperature: hot, warm, or cold';

