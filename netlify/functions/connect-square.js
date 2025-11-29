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

    // Square OAuth URL
    const squareAppId = process.env.SQUARE_APPLICATION_ID;
    const squareRedirectUri = `${process.env.SITE_URL || 'https://eddm.cashtows.com'}/.netlify/functions/square-oauth-callback?userId=${userId}&returnUrl=${encodeURIComponent(returnUrl || '')}`;
    
    const authUrl = `https://squareup.com/oauth2/authorize?client_id=${squareAppId}&scope=PAYMENTS_WRITE+PAYMENTS_READ&session=false&redirect_uri=${encodeURIComponent(squareRedirectUri)}`;

    return {
      statusCode: 200,
      body: JSON.stringify({
        authUrl
      })
    };
  } catch (error) {
    console.error('Error initiating Square connection:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to initiate Square connection',
        details: error.message
      })
    };
  }
};

