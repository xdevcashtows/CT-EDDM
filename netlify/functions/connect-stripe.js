import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { userId, returnUrl } = JSON.parse(event.body);

    if (!userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing userId' })
      };
    }

    // Create OAuth link for Stripe Connect
    const authUrl = stripe.oauth.authorizeUrl({
      scope: 'read_write',
      client_id: process.env.STRIPE_CLIENT_ID,
      redirect_uri: `${process.env.SITE_URL || 'https://eddm.cashtows.com'}/.netlify/functions/stripe-oauth-callback?userId=${userId}&returnUrl=${encodeURIComponent(returnUrl || '')}`
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        authUrl
      })
    };
  } catch (error) {
    console.error('Error initiating Stripe connection:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to initiate Stripe connection',
        details: error.message
      })
    };
  }
};

