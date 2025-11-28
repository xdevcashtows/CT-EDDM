-- Create pipeline_stages table to store custom stages per user
CREATE TABLE IF NOT EXISTS public.pipeline_stages (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  user_id uuid NOT NULL,
  stage_id text NOT NULL, -- 'lead', 'contacted', 'lost', etc.
  label text NOT NULL, -- Display name like "Lead", "Lost", etc.
  color text NOT NULL, -- Hex color like '#dc2626'
  sort_order integer NOT NULL, -- Order in which stages appear
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT pipeline_stages_pkey PRIMARY KEY (id),
  CONSTRAINT pipeline_stages_user_id_fkey FOREIGN KEY (user_id) 
    REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT pipeline_stages_unique_per_user UNIQUE (user_id, stage_id),
  CONSTRAINT pipeline_stages_label_not_empty CHECK (label != ''),
  CONSTRAINT pipeline_stages_stage_id_not_empty CHECK (stage_id != '')
) TABLESPACE pg_default;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_user 
  ON public.pipeline_stages USING btree (user_id) TABLESPACE pg_default;

-- Add trigger to update updated_at
CREATE TRIGGER update_pipeline_stages_updated_at 
  BEFORE UPDATE ON pipeline_stages 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Remove the rigid stage constraint from contacts table
ALTER TABLE public.contacts 
  DROP CONSTRAINT IF EXISTS contacts_stage_check;

-- Add a simpler constraint that just ensures stage is not empty
ALTER TABLE public.contacts 
  ADD CONSTRAINT contacts_stage_not_empty CHECK (stage IS NOT NULL AND stage != '');

-- Insert default stages for existing users (run this after table is created)
-- This will give all existing users the default 9 stages
INSERT INTO public.pipeline_stages (user_id, stage_id, label, color, sort_order)
SELECT 
  p.id as user_id,
  stages.stage_id,
  stages.label,
  stages.color,
  stages.sort_order
FROM profiles p
CROSS JOIN (
  VALUES 
    ('lead', 'Lead', '#6b7280', 1),
    ('contacted', 'Contacted', '#3b82f6', 2),
    ('qualified', 'Qualified', '#f59e0b', 3),
    ('proposal_sent', 'Proposal Sent', '#ec4899', 4),
    ('negotiating', 'Negotiating', '#8b5cf6', 5),
    ('won', 'Won', '#0ea5e9', 6),
    ('active', 'Active', '#22c55e', 7),
    ('past', 'Past Client', '#64748b', 8),
    ('lost', 'Lost', '#dc2626', 9)
) AS stages(stage_id, label, color, sort_order)
ON CONFLICT (user_id, stage_id) DO NOTHING;

-- Create a function to check if a stage can be deleted
CREATE OR REPLACE FUNCTION can_delete_pipeline_stage(
  p_user_id uuid,
  p_stage_id text
) RETURNS boolean AS $$
DECLARE
  contact_count integer;
BEGIN
  SELECT COUNT(*) INTO contact_count
  FROM contacts
  WHERE user_id = p_user_id AND stage = p_stage_id;
  
  RETURN contact_count = 0;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get contact count per stage
CREATE OR REPLACE FUNCTION get_stage_contact_count(
  p_user_id uuid,
  p_stage_id text
) RETURNS integer AS $$
DECLARE
  contact_count integer;
BEGIN
  SELECT COUNT(*) INTO contact_count
  FROM contacts
  WHERE user_id = p_user_id AND stage = p_stage_id;
  
  RETURN contact_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================
-- This ensures users can only access their own pipeline stages

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

