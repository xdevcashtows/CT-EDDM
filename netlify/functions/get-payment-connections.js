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
    const { userId } = JSON.parse(event.body);

    if (!userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing userId' })
      };
    }

    // Get payment connections from profiles table
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('stripe_account_id, stripe_account_name, square_application_id, square_account_name, paypal_merchant_id, paypal_account_name')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      throw error;
    }

    const connections = {
      stripe: null,
      square: null
    };

    if (profile) {
      if (profile.stripe_account_id) {
        connections.stripe = {
          account_id: profile.stripe_account_id,
          account_name: profile.stripe_account_name || null
        };
      }

      if (profile.square_application_id) {
        connections.square = {
          account_id: profile.square_application_id,
          account_name: profile.square_account_name || null
        };
      }

      if (profile.paypal_merchant_id) {
        connections.paypal = {
          account_id: profile.paypal_merchant_id,
          account_name: profile.paypal_account_name || null
        };
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify(connections)
    };
  } catch (error) {
    console.error('Error getting payment connections:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to get payment connections',
        details: error.message
      })
    };
  }
};

