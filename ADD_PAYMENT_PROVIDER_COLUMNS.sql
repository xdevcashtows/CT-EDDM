-- Add payment provider connection columns to profiles table
-- This allows users to connect their Stripe, Square, or PayPal accounts

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_account_name TEXT,
ADD COLUMN IF NOT EXISTS stripe_access_token TEXT,
ADD COLUMN IF NOT EXISTS square_application_id TEXT,
ADD COLUMN IF NOT EXISTS square_account_name TEXT,
ADD COLUMN IF NOT EXISTS square_access_token TEXT,
ADD COLUMN IF NOT EXISTS paypal_merchant_id TEXT,
ADD COLUMN IF NOT EXISTS paypal_account_name TEXT,
ADD COLUMN IF NOT EXISTS paypal_access_token TEXT,
ADD COLUMN IF NOT EXISTS paypal_refresh_token TEXT;

-- Add comments for documentation
COMMENT ON COLUMN profiles.stripe_account_id IS 'Connected Stripe account ID from OAuth';
COMMENT ON COLUMN profiles.stripe_account_name IS 'Display name of connected Stripe account';
COMMENT ON COLUMN profiles.stripe_access_token IS 'OAuth access token for Stripe (should be encrypted in production)';
COMMENT ON COLUMN profiles.square_application_id IS 'Connected Square merchant/application ID from OAuth';
COMMENT ON COLUMN profiles.square_account_name IS 'Display name of connected Square account';
COMMENT ON COLUMN profiles.square_access_token IS 'OAuth access token for Square (should be encrypted in production)';
COMMENT ON COLUMN profiles.paypal_merchant_id IS 'Connected PayPal merchant ID from OAuth';
COMMENT ON COLUMN profiles.paypal_account_name IS 'Display name of connected PayPal account';
COMMENT ON COLUMN profiles.paypal_access_token IS 'OAuth access token for PayPal (should be encrypted in production)';
COMMENT ON COLUMN profiles.paypal_refresh_token IS 'OAuth refresh token for PayPal (should be encrypted in production)';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_account_id ON profiles(stripe_account_id) WHERE stripe_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_square_application_id ON profiles(square_application_id) WHERE square_application_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_paypal_merchant_id ON profiles(paypal_merchant_id) WHERE paypal_merchant_id IS NOT NULL;

