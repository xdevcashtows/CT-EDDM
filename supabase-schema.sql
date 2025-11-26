-- CT EDDM Pro - Complete Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS & AUTHENTICATION
-- ============================================
-- Note: Supabase auth.users table is already created
-- We'll create a profiles table to extend user data

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can only see their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================
-- ACCOUNT TEAM MANAGEMENT
-- ============================================

CREATE TABLE account_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active')),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE account_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage account members" ON account_members
  FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Invited users can view their membership" ON account_members
  FOR SELECT USING (auth.uid() = profile_id);

-- ============================================
-- NICHES (Business Categories)
-- ============================================
CREATE TABLE niches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  is_custom BOOLEAN DEFAULT false,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default niches (50+ categories)
INSERT INTO niches (name) VALUES
  ('HVAC'), ('Towing'), ('Roofing'), ('Siding'), ('Construction'),
  ('Pool Services'), ('Landscaping'), ('Lawn Care'), ('Tree Service'),
  ('Plumbing'), ('Electrical'), ('Painting'), ('Flooring'), ('Carpentry'),
  ('Masonry'), ('Concrete'), ('Fencing'), ('Deck Building'), ('Garage Doors'),
  ('Windows & Doors'), ('Gutter Services'), ('Pest Control'), ('Cleaning Services'),
  ('Window Cleaning'), ('Pressure Washing'), ('Junk Removal'), ('Moving Services'),
  ('Auto Repair'), ('Auto Body'), ('Tire Shop'), ('Oil Change'), ('Car Wash'),
  ('Detailing'), ('Towing & Recovery'), ('Locksmith'), ('Security Systems'),
  ('Home Inspection'), ('Appliance Repair'), ('Handyman'), ('General Contractor'),
  ('Real Estate'), ('Mortgage'), ('Insurance'), ('Legal Services'), ('Accounting'),
  ('Financial Planning'), ('Dentist'), ('Chiropractor'), ('Physical Therapy'),
  ('Veterinary'), ('Pet Grooming'), ('Daycare'), ('Preschool'), ('Tutoring'),
  ('Restaurant'), ('Cafe'), ('Bakery'), ('Catering'), ('Food Truck'),
  ('Grocery Store'), ('Convenience Store'), ('Retail'), ('Boutique'),
  ('Salon'), ('Barber'), ('Spa'), ('Fitness'), ('Yoga Studio'),
  ('Martial Arts'), ('Dance Studio'), ('Church'), ('Nonprofit'), ('School'),
  ('Other')
ON CONFLICT (name) DO NOTHING;

ALTER TABLE niches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Niches are viewable by everyone" ON niches FOR SELECT USING (true);
CREATE POLICY "Users can create custom niches" ON niches FOR INSERT WITH CHECK (auth.uid() = created_by);

-- ============================================
-- CITIES
-- ============================================
CREATE TABLE cities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_codes TEXT[], -- Array of zip codes covered
  active BOOLEAN DEFAULT true,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, state)
);

ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all cities" ON cities FOR SELECT USING (true);
CREATE POLICY "Users can manage cities" ON cities FOR ALL USING (auth.uid() = created_by);

-- ============================================
-- SAVED ROUTE SELECTIONS
-- ============================================
CREATE TABLE saved_routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  city_id UUID REFERENCES cities(id) ON DELETE SET NULL,
  routes JSONB NOT NULL, -- Array of route objects with all data
  total_households INTEGER,
  total_cost DECIMAL(10,2),
  notes TEXT,
  is_locked BOOLEAN DEFAULT false, -- Locked when used in active/completed campaign
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE saved_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own saved routes" ON saved_routes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own saved routes" ON saved_routes FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- DESIGNS (Card Templates)
-- ============================================
CREATE TABLE designs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  card_size TEXT NOT NULL CHECK (card_size IN ('9x12', '6x12')),
  background_type TEXT CHECK (background_type IN ('color', 'gradient', 'image')),
  background_color TEXT, -- Hex color
  background_gradient JSONB, -- {from: '#color', to: '#color', direction: 'to-r'}
  background_image_url TEXT, -- URL to uploaded background
  num_slots INTEGER DEFAULT 17,
  slot_config JSONB, -- Array of slot definitions: [{id, size, position, width, height, x, y}]
  is_locked BOOLEAN DEFAULT false, -- Locked when used in completed campaign
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE designs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own designs" ON designs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own designs" ON designs FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- CONTACTS / CLIENTS (CRM)
-- ============================================
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  owner_name TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  niche_id UUID REFERENCES niches(id),
  
  -- Pipeline stage
  stage TEXT DEFAULT 'lead' CHECK (stage IN ('lead', 'contacted', 'qualified', 'proposal_sent', 'negotiating', 'won', 'active', 'past', 'lost')),
  
  -- Additional info
  notes TEXT,
  tags TEXT[], -- Array of custom tags
  
  -- Tracking
  first_contact_date DATE,
  last_contact_date DATE,
  next_follow_up_date DATE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contacts_user_stage ON contacts(user_id, stage);
CREATE INDEX idx_contacts_niche ON contacts(niche_id);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own contacts" ON contacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own contacts" ON contacts FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- CONTACT ACTIVITIES (Notes, Tasks, Reminders)
-- ============================================
CREATE TABLE contact_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  activity_type TEXT CHECK (activity_type IN ('note', 'call', 'email', 'meeting', 'task', 'reminder')),
  subject TEXT,
  description TEXT,
  due_date TIMESTAMPTZ,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activities_contact ON contact_activities(contact_id);
CREATE INDEX idx_activities_due ON contact_activities(due_date) WHERE NOT completed;

ALTER TABLE contact_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own activities" ON contact_activities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own activities" ON contact_activities FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- CLIENT ADS (Uploaded Images)
-- ============================================
CREATE TABLE client_ads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL, -- Supabase storage URL
  file_name TEXT,
  file_size INTEGER,
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approval_requested_at TIMESTAMPTZ,
  approval_responded_at TIMESTAMPTZ,
  approval_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_client_ads_contact ON client_ads(contact_id);

ALTER TABLE client_ads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own client ads" ON client_ads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own client ads" ON client_ads FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- CAMPAIGNS
-- ============================================
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  city_id UUID REFERENCES cities(id) ON DELETE SET NULL,
  
  -- Route & Design
  saved_route_id UUID REFERENCES saved_routes(id),
  route_snapshot JSONB, -- Frozen copy of route data at campaign creation
  design_id UUID REFERENCES designs(id),
  design_snapshot JSONB, -- Frozen copy of design at campaign creation
  
  -- Pricing
  price_small DECIMAL(10,2),
  price_medium DECIMAL(10,2),
  price_large DECIMAL(10,2),
  
  -- Settings
  unique_niche_per_slot BOOLEAN DEFAULT true,
  total_pieces INTEGER,
  mail_date DATE,
  
  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'in_production', 'printed', 'mailed', 'completed', 'cancelled')),
  
  -- Production tracking
  design_started_at TIMESTAMPTZ,
  design_completed_at TIMESTAMPTZ,
  print_ordered_at TIMESTAMPTZ,
  print_received_at TIMESTAMPTZ,
  mailed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_campaigns_user ON campaigns(user_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_mail_date ON campaigns(mail_date);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own campaigns" ON campaigns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own campaigns" ON campaigns FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- AD SLOTS (Individual slots on campaigns)
-- ============================================
CREATE TABLE ad_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  slot_position TEXT NOT NULL, -- e.g., 'A1', 'A2', 'B1', etc.
  slot_size TEXT NOT NULL CHECK (slot_size IN ('small', 'medium', 'large')),
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  client_ad_id UUID REFERENCES client_ads(id) ON DELETE SET NULL,
  
  -- Status
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'booked', 'designed', 'approved', 'final')),
  
  -- Dimensions (from design)
  width INTEGER,
  height INTEGER,
  x_position INTEGER,
  y_position INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, slot_position)
);

CREATE INDEX idx_ad_slots_campaign ON ad_slots(campaign_id);
CREATE INDEX idx_ad_slots_contact ON ad_slots(contact_id);

ALTER TABLE ad_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view slots for own campaigns" ON ad_slots 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM campaigns 
      WHERE campaigns.id = ad_slots.campaign_id 
      AND campaigns.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can manage slots for own campaigns" ON ad_slots 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM campaigns 
      WHERE campaigns.id = ad_slots.campaign_id 
      AND campaigns.user_id = auth.uid()
    )
  );

-- ============================================
-- PAYMENTS & INVOICES
-- ============================================
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  ad_slot_id UUID REFERENCES ad_slots(id) ON DELETE SET NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  
  -- Stripe integration
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_charge_id TEXT,
  stripe_customer_id TEXT,
  
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded')),
  payment_method TEXT,
  
  paid_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  refund_amount DECIMAL(10,2),
  
  notes TEXT,
  metadata JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_contact ON payments(contact_id);
CREATE INDEX idx_payments_campaign ON payments(campaign_id);
CREATE INDEX idx_payments_stripe ON payments(stripe_payment_intent_id);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own payments" ON payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own payments" ON payments FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- INVOICES
-- ============================================
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  invoice_number TEXT UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  tax DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  
  issue_date DATE NOT NULL,
  due_date DATE,
  paid_date DATE,
  
  line_items JSONB, -- Array of {description, quantity, rate, amount}
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoices_contact ON invoices(contact_id);
CREATE INDEX idx_invoices_status ON invoices(status);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own invoices" ON invoices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own invoices" ON invoices FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- EMAIL CAMPAIGNS
-- ============================================
CREATE TABLE email_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL, -- Optional link to EDDM campaign
  
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  
  -- Targeting
  target_contacts UUID[], -- Array of contact IDs
  target_stage TEXT, -- Send to all contacts in this stage
  target_niche_id UUID REFERENCES niches(id),
  
  -- Scheduling
  send_type TEXT DEFAULT 'immediate' CHECK (send_type IN ('immediate', 'scheduled', 'recurring')),
  scheduled_at TIMESTAMPTZ,
  recurring_frequency TEXT CHECK (recurring_frequency IN ('daily', 'weekly', 'monthly')),
  
  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed')),
  
  -- Stats
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  bounced_count INTEGER DEFAULT 0,
  
  sent_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_campaigns_user ON email_campaigns(user_id);
CREATE INDEX idx_email_campaigns_scheduled ON email_campaigns(scheduled_at) WHERE status = 'scheduled';

ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own email campaigns" ON email_campaigns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own email campaigns" ON email_campaigns FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- EMAIL LOGS (Individual emails sent)
-- ============================================
CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email_campaign_id UUID REFERENCES email_campaigns(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  email_type TEXT CHECK (email_type IN ('campaign', 'status_update', 'approval_request', 'onboarding', 'notification')),
  
  recipient_email TEXT NOT NULL,
  subject TEXT,
  
  -- Resend integration
  resend_email_id TEXT,
  
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')),
  
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_logs_campaign ON email_logs(email_campaign_id);
CREATE INDEX idx_email_logs_contact ON email_logs(contact_id);
CREATE INDEX idx_email_logs_resend ON email_logs(resend_email_id);

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own email logs" ON email_logs FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- PACKING SLIPS
-- ============================================
CREATE TABLE packing_slips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL, -- Supabase storage URL
  file_size INTEGER,
  
  usps_receipt_number TEXT,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_packing_slips_campaign ON packing_slips(campaign_id);

ALTER TABLE packing_slips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own packing slips" ON packing_slips FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own packing slips" ON packing_slips FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- STORAGE BUCKETS
-- ============================================
-- Run these in Supabase Dashboard > Storage or via SQL

-- Bucket for client ad images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('client-ads', 'client-ads', false)
ON CONFLICT (id) DO NOTHING;

-- Bucket for design backgrounds
INSERT INTO storage.buckets (id, name, public) 
VALUES ('design-backgrounds', 'design-backgrounds', false)
ON CONFLICT (id) DO NOTHING;

-- Bucket for packing slip PDFs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('packing-slips', 'packing-slips', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for client-ads bucket
CREATE POLICY "Users can upload own client ads"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'client-ads' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own client ads"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'client-ads' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own client ads"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'client-ads' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage policies for design-backgrounds bucket
CREATE POLICY "Users can upload own backgrounds"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'design-backgrounds' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own backgrounds"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'design-backgrounds' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own backgrounds"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'design-backgrounds' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage policies for packing-slips bucket
CREATE POLICY "Users can upload own packing slips"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'packing-slips' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own packing slips"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'packing-slips' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own packing slips"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'packing-slips' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all relevant tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_account_members_updated_at BEFORE UPDATE ON account_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cities_updated_at BEFORE UPDATE ON cities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_saved_routes_updated_at BEFORE UPDATE ON saved_routes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_designs_updated_at BEFORE UPDATE ON designs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_ads_updated_at BEFORE UPDATE ON client_ads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ad_slots_updated_at BEFORE UPDATE ON ad_slots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_campaigns_updated_at BEFORE UPDATE ON email_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_packing_slips_updated_at BEFORE UPDATE ON packing_slips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VIEWS FOR ANALYTICS
-- ============================================

-- Campaign revenue view
CREATE OR REPLACE VIEW campaign_revenue AS
SELECT 
  c.id as campaign_id,
  c.name as campaign_name,
  c.user_id,
  c.status,
  COUNT(CASE WHEN a.status IN ('booked', 'designed', 'approved', 'final') THEN 1 END) as booked_slots,
  COUNT(CASE WHEN a.slot_size = 'small' AND a.status IN ('booked', 'designed', 'approved', 'final') THEN 1 END) as small_slots,
  COUNT(CASE WHEN a.slot_size = 'medium' AND a.status IN ('booked', 'designed', 'approved', 'final') THEN 1 END) as medium_slots,
  COUNT(CASE WHEN a.slot_size = 'large' AND a.status IN ('booked', 'designed', 'approved', 'final') THEN 1 END) as large_slots,
  (COUNT(CASE WHEN a.slot_size = 'small' AND a.status IN ('booked', 'designed', 'approved', 'final') THEN 1 END) * COALESCE(c.price_small, 0) +
   COUNT(CASE WHEN a.slot_size = 'medium' AND a.status IN ('booked', 'designed', 'approved', 'final') THEN 1 END) * COALESCE(c.price_medium, 0) +
   COUNT(CASE WHEN a.slot_size = 'large' AND a.status IN ('booked', 'designed', 'approved', 'final') THEN 1 END) * COALESCE(c.price_large, 0)) as total_revenue
FROM campaigns c
LEFT JOIN ad_slots a ON c.id = a.campaign_id
GROUP BY c.id, c.name, c.user_id, c.status, c.price_small, c.price_medium, c.price_large;

-- Contact pipeline summary
CREATE OR REPLACE VIEW contact_pipeline_summary AS
SELECT 
  user_id,
  stage,
  COUNT(*) as count,
  COUNT(CASE WHEN next_follow_up_date < CURRENT_DATE THEN 1 END) as overdue_followups
FROM contacts
GROUP BY user_id, stage;

-- ============================================
-- COMPLETION
-- ============================================
-- Schema creation complete!
-- Next steps:
-- 1. Run this SQL in your Supabase SQL Editor
-- 2. Verify all tables and buckets are created
-- 3. Set up environment variables in your .env file

