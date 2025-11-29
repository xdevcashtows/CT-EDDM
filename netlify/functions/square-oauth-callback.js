import { createClient } from '@supabase/supabase-js';

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
    const squareAppId = process.env.SQUARE_APPLICATION_ID;
    const squareAppSecret = process.env.SQUARE_APPLICATION_SECRET;
    const squareRedirectUri = `${process.env.SITE_URL || 'https://eddm.cashtows.com'}/.netlify/functions/square-oauth-callback`;

    const tokenResponse = await fetch('https://connect.squareup.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Square-Version': '2023-10-18'
      },
      body: JSON.stringify({
        client_id: squareAppId,
        client_secret: squareAppSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: squareRedirectUri
      })
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange Square authorization code');
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const merchantId = tokenData.merchant_id;

    // Get merchant information
    const merchantResponse = await fetch(`https://connect.squareup.com/v2/merchants/${merchantId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Square-Version': '2023-10-18'
      }
    });

    let accountName = merchantId;
    if (merchantResponse.ok) {
      const merchantData = await merchantResponse.json();
      accountName = merchantData.merchant?.business_name || merchantId;
    }

    // Save to database
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        square_application_id: merchantId,
        square_account_name: accountName,
        square_access_token: accessToken // Store encrypted in production
      })
      .eq('id', userId);

    if (updateError) {
      throw updateError;
    }

    // Redirect back to settings page
    const redirectUrl = returnUrl || `${process.env.SITE_URL || 'https://eddm.cashtows.com'}/settings/payment-links?connected=square`;
    
    return {
      statusCode: 302,
      headers: {
        Location: redirectUrl
      },
      body: ''
    };
  } catch (error) {
    console.error('Error in Square OAuth callback:', error);
    const errorUrl = `${process.env.SITE_URL || 'https://eddm.cashtows.com'}/settings/payment-links?error=square_connection_failed`;
    
    return {
      statusCode: 302,
      headers: {
        Location: errorUrl
      },
      body: ''
    };
  }
};

