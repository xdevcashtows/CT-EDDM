# Environment Variables Setup

Copy these environment variables into your `.env` file (or Netlify environment settings).

## Required Environment Variables

```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Supabase Storage Buckets
VITE_SUPABASE_STORAGE_BUCKET_CLIENT_ADS=client-ads
VITE_SUPABASE_STORAGE_BUCKET_BACKGROUNDS=design-backgrounds
VITE_SUPABASE_STORAGE_BUCKET_PACKING_SLIPS=packing-slips

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Resend Email Configuration
RESEND_API_KEY=re_your_resend_api_key
RESEND_FROM_EMAIL=noreply@eddm.cashtows.com

# Application Configuration
APP_DOMAIN=https://eddm.cashtows.com
VITE_APP_NAME=CT EDDM Pro

# Netlify Configuration (Optional - for CI/CD)
NETLIFY_AUTH_TOKEN=your_netlify_auth_token
NETLIFY_SITE_ID=your_netlify_site_id

# Environment
NODE_ENV=development
VITE_ENABLE_DEBUG=true
```

## Setup Instructions

### 1. Supabase Setup
1. Go to your Supabase project dashboard
2. Navigate to Settings > API
3. Copy your project URL and anon key (you already have these)
4. Copy your service role key (needed for server-side operations)
5. Run the `supabase-schema.sql` file in your SQL Editor to create all tables and buckets

### 2. Stripe Setup
1. Go to https://dashboard.stripe.com/
2. Get your API keys from Developers > API keys
3. Set up a webhook endpoint: `https://eddm.cashtows.com/.netlify/functions/stripe-webhook`
4. Copy the webhook signing secret

### 3. Resend Setup
1. Go to https://resend.com/
2. Create an API key
3. Verify your domain (eddm.cashtows.com)
4. Set your from email address

### 4. Netlify Setup
1. Connect your repository to Netlify
2. Add all environment variables in Site Settings > Environment Variables
3. Set build command: `npm run build`
4. Set publish directory: `dist`
5. (Optional but recommended) Add `SECRETS_SCAN_OMIT_KEYS=VITE_SUPABASE_ANON_KEY,VITE_SUPABASE_URL` so the build can include those frontend-only keys without triggering Netlify’s secrets scanner.

## Security Notes

- Never commit your `.env` file to version control
- Use different keys for development and production
- Rotate keys regularly
- Keep service role key secure (only use server-side)

