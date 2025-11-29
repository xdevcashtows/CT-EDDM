import { createClient } from '@supabase/supabase-js';

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

    // PayPal OAuth URL
    const paypalClientId = process.env.PAYPAL_CLIENT_ID;
    const paypalRedirectUri = `${process.env.SITE_URL || 'https://eddm.cashtows.com'}/.netlify/functions/paypal-oauth-callback?userId=${userId}&returnUrl=${encodeURIComponent(returnUrl || '')}`;
    
    // PayPal OAuth scopes for payments
    const scopes = [
      'https://uri.paypal.com/services/payments/realtimepayment',
      'https://uri.paypal.com/services/invoicing',
      'openid',
      'profile',
      'email'
    ].join(' ');
    
    const authUrl = `https://www.paypal.com/signin/authorize?client_id=${paypalClientId}&response_type=code&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(paypalRedirectUri)}`;

    return {
      statusCode: 200,
      body: JSON.stringify({
        authUrl
      })
    };
  } catch (error) {
    console.error('Error initiating PayPal connection:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to initiate PayPal connection',
        details: error.message
      })
    };
  }
};

