import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

export const handler = async (event) => {
  try {
    const { code, state, userId, returnUrl } = event.queryStringParameters || {};

    if (!code || !userId) {
      return {
        statusCode: 400,
        body: 'Missing required parameters. Please try connecting again.',
        headers: {
          'Content-Type': 'text/html'
        }
      };
    }

    // Exchange authorization code for access token
    const response = await stripe.oauth.token({
      grant_type: 'authorization_code',
      code
    });

    const connectedAccountId = response.stripe_user_id;
    const accessToken = response.access_token;

    // Get account details
    const account = await stripe.accounts.retrieve(connectedAccountId);

    // Save to database
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        stripe_account_id: connectedAccountId,
        stripe_account_name: account.business_profile?.name || account.email || account.id,
        stripe_access_token: accessToken // Store encrypted in production
      })
      .eq('id', userId);

    if (updateError) {
      throw updateError;
    }

    // Redirect back to settings page
    const redirectUrl = returnUrl || `${process.env.SITE_URL || 'https://eddm.cashtows.com'}/settings/payment-links?connected=stripe`;
    
    return {
      statusCode: 302,
      headers: {
        Location: redirectUrl
      },
      body: ''
    };
  } catch (error) {
    console.error('Error in Stripe OAuth callback:', error);
    const errorUrl = `${process.env.SITE_URL || 'https://eddm.cashtows.com'}/settings/payment-links?error=stripe_connection_failed`;
    
    return {
      statusCode: 302,
      headers: {
        Location: errorUrl
      },
      body: ''
    };
  }
};

