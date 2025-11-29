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
    const { userId, provider } = JSON.parse(event.body);

    if (!userId || !provider) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing userId or provider' })
      };
    }

    if (provider !== 'stripe' && provider !== 'square' && provider !== 'paypal') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid provider. Must be "stripe", "square", or "paypal"' })
      };
    }

    // Clear provider connection from database
    const updateData = {};
    if (provider === 'stripe') {
      updateData.stripe_account_id = null;
      updateData.stripe_account_name = null;
      updateData.stripe_access_token = null;
    } else if (provider === 'square') {
      updateData.square_application_id = null;
      updateData.square_account_name = null;
      updateData.square_access_token = null;
    } else if (provider === 'paypal') {
      updateData.paypal_merchant_id = null;
      updateData.paypal_account_name = null;
      updateData.paypal_access_token = null;
      updateData.paypal_refresh_token = null;
    }

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId);

    if (error) {
      throw error;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: `${provider} account disconnected successfully`
      })
    };
  } catch (error) {
    console.error('Error disconnecting payment provider:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to disconnect payment provider',
        details: error.message
      })
    };
  }
};

