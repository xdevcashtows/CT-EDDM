-- Migration: Add favorite column to contacts table
-- Purpose: Allow users to mark contacts as favorites for quick filtering
-- Date: 2025-11-28

-- Add the favorite column to the contacts table
ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT false;

-- Add a comment to the column for documentation
COMMENT ON COLUMN public.contacts.is_favorite IS 'Flag to mark contact as favorite for quick access and filtering';

-- Create an index on is_favorite for faster filtering
CREATE INDEX IF NOT EXISTS idx_contacts_is_favorite 
ON public.contacts USING btree (is_favorite) 
TABLESPACE pg_default;

-- Create a combined index for user_id and is_favorite for common queries
CREATE INDEX IF NOT EXISTS idx_contacts_user_favorite 
ON public.contacts USING btree (user_id, is_favorite) 
TABLESPACE pg_default;

