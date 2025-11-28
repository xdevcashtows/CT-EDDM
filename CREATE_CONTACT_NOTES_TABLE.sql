-- Create contact_notes table for timestamped notes
CREATE TABLE public.contact_notes (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4(),
  contact_id UUID NOT NULL,
  user_id UUID NOT NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT contact_notes_pkey PRIMARY KEY (id),
  CONSTRAINT contact_notes_contact_id_fkey FOREIGN KEY (contact_id) 
    REFERENCES contacts (id) ON DELETE CASCADE,
  CONSTRAINT contact_notes_user_id_fkey FOREIGN KEY (user_id) 
    REFERENCES profiles (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_contact_notes_contact 
  ON public.contact_notes USING btree (contact_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_contact_notes_user 
  ON public.contact_notes USING btree (user_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_contact_notes_created_at 
  ON public.contact_notes USING btree (created_at DESC) TABLESPACE pg_default;

-- Add trigger to update updated_at timestamp
CREATE TRIGGER update_contact_notes_updated_at 
  BEFORE UPDATE ON contact_notes 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.contact_notes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view their own contact notes
CREATE POLICY "Users can view their own contact notes"
  ON public.contact_notes
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create contact notes for their own contacts
CREATE POLICY "Users can create contact notes"
  ON public.contact_notes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own contact notes
CREATE POLICY "Users can update their own contact notes"
  ON public.contact_notes
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own contact notes
CREATE POLICY "Users can delete their own contact notes"
  ON public.contact_notes
  FOR DELETE
  USING (auth.uid() = user_id);

