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

    const paypalClientId = process.env.PAYPAL_CLIENT_ID;
    const paypalClientSecret = process.env.PAYPAL_CLIENT_SECRET;
    const paypalRedirectUri = `${process.env.SITE_URL || 'https://eddm.cashtows.com'}/.netlify/functions/paypal-oauth-callback`;

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://api.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'en_US',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${paypalClientId}:${paypalClientSecret}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: paypalRedirectUri
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('PayPal token exchange error:', errorText);
      throw new Error('Failed to exchange PayPal authorization code');
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;

    // Get user info from PayPal
    const userInfoResponse = await fetch('https://api.paypal.com/v1/identity/oauth2/userinfo?schema=paypalv1.1', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    let accountName = 'PayPal Account';
    let merchantId = null;

    if (userInfoResponse.ok) {
      const userInfo = await userInfoResponse.json();
      accountName = userInfo.name || userInfo.email || accountName;
      merchantId = userInfo.user_id || userInfo.payer_id;
    }

    // Get merchant account info if available
    try {
      const merchantResponse = await fetch('https://api.paypal.com/v1/customer/partners/merchant-accounts', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (merchantResponse.ok) {
        const merchantData = await merchantResponse.json();
        if (merchantData.merchant_accounts && merchantData.merchant_accounts.length > 0) {
          merchantId = merchantData.merchant_accounts[0].merchant_id || merchantId;
          accountName = merchantData.merchant_accounts[0].business_name || accountName;
        }
      }
    } catch (merchantError) {
      console.warn('Could not fetch merchant account info:', merchantError);
      // Continue with user info
    }

    // Save to database
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        paypal_merchant_id: merchantId,
        paypal_account_name: accountName,
        paypal_access_token: accessToken,
        paypal_refresh_token: refreshToken
      })
      .eq('id', userId);

    if (updateError) {
      throw updateError;
    }

    // Redirect back to settings page
    const redirectUrl = returnUrl || `${process.env.SITE_URL || 'https://eddm.cashtows.com'}/settings/payment-links?connected=paypal`;
    
    return {
      statusCode: 302,
      headers: {
        Location: redirectUrl
      },
      body: ''
    };
  } catch (error) {
    console.error('Error in PayPal OAuth callback:', error);
    const errorUrl = `${process.env.SITE_URL || 'https://eddm.cashtows.com'}/settings/payment-links?error=paypal_connection_failed`;
    
    return {
      statusCode: 302,
      headers: {
        Location: errorUrl
      },
      body: ''
    };
  }
};

