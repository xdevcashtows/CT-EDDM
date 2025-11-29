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
    const {
      amount,
      currency = 'usd',
      contactId,
      campaignId,
      slotId,
      description,
      metadata = {},
      userId
    } = JSON.parse(event.body);

    if (!amount || !contactId || !campaignId || !userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: amount, contactId, campaignId, userId' })
      };
    }

    // Get user's payment connection
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_account_id, stripe_access_token, square_application_id, square_access_token, paypal_merchant_id, paypal_access_token')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
    }

    // Determine which payment provider to use (prefer Stripe, then PayPal, then Square)
    let paymentProvider = 'stripe'; // default
    let stripeInstance = stripe;
    let useConnectedAccount = false;

    if (profile?.stripe_account_id && profile?.stripe_access_token) {
      // Use user's connected Stripe account
      stripeInstance = new Stripe(profile.stripe_access_token);
      useConnectedAccount = true;
      paymentProvider = 'stripe';
    } else if (profile?.paypal_merchant_id && profile?.paypal_access_token) {
      paymentProvider = 'paypal';
    } else if (profile?.square_application_id && profile?.square_access_token) {
      paymentProvider = 'square';
    }

    // Create payment link based on provider
    if (paymentProvider === 'paypal') {
      // Create PayPal payment link
      const paypalResponse = await fetch('https://api.paypal.com/v2/invoicing/invoices', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${profile.paypal_access_token}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          detail: {
            invoice_number: `INV-${Date.now()}`,
            reference: `Campaign: ${campaignId}, Slot: ${slotId || 'N/A'}`,
            invoice_date: new Date().toISOString().split('T')[0],
            currency_code: currency.toUpperCase(),
            note: description || 'Invoice Payment'
          },
          invoicer: {
            name: {
              given_name: 'Business',
              surname: 'Account'
            }
          },
          primary_recipients: [
            {
              billing_info: {
                email_address: metadata.contact_email || 'customer@example.com'
              }
            }
          ],
          items: [
            {
              name: description || 'Invoice Payment',
              quantity: '1',
              unit_amount: {
                currency_code: currency.toUpperCase(),
                value: amount.toFixed(2)
              }
            }
          ],
          configuration: {
            partial_payment: {
              allow_partial_payment: false
            },
            allow_tip: false
          },
          amount: {
            currency_code: currency.toUpperCase(),
            value: amount.toFixed(2),
            breakdown: {
              item_total: {
                currency_code: currency.toUpperCase(),
                value: amount.toFixed(2)
              }
            }
          }
        })
      });

      if (!paypalResponse.ok) {
        const errorText = await paypalResponse.text();
        throw new Error(`PayPal invoice creation failed: ${errorText}`);
      }

      const invoice = await paypalResponse.json();
      const invoiceId = invoice.id;

      // Send the invoice to get a payment link
      const sendResponse = await fetch(`https://api.paypal.com/v2/invoicing/invoices/${invoiceId}/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${profile.paypal_access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          send_to_recipient: true
        })
      });

      if (!sendResponse.ok) {
        // If send fails, we can still get the invoice link
        const invoiceLink = `https://www.paypal.com/invoice/p/#${invoiceId}`;
        
        return {
          statusCode: 200,
          body: JSON.stringify({
            success: true,
            paymentLinkUrl: invoiceLink,
            paymentLinkId: invoiceId,
            provider: 'paypal'
          })
        };
      }

      const invoiceLink = `https://www.paypal.com/invoice/p/#${invoiceId}`;

      // Save payment link to database if slotId provided
      if (slotId) {
        const { error: dbError } = await supabase
          .from('ad_slots')
          .update({ 
            payment_link_url: invoiceLink,
            payment_link_id: invoiceId
          })
          .eq('id', slotId);

        if (dbError) {
          console.error('Error saving payment link to database:', dbError);
        }
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          paymentLinkUrl: invoiceLink,
          paymentLinkId: invoiceId,
          provider: 'paypal'
        })
      };
    }

    // Create Stripe Payment Link (default or if Stripe is connected)
    const paymentLinkOptions = {
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: description || 'Invoice Payment',
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        contact_id: contactId,
        campaign_id: campaignId,
        ad_slot_id: slotId || '',
        ...metadata
      },
      after_completion: {
        type: 'redirect',
        redirect: {
          url: `${process.env.SITE_URL || 'https://eddm.cashtows.com'}/payment-success`
        }
      }
    };

    // If using connected account, we need to create the payment link differently
    // For connected accounts, we might need to use account parameter
    const paymentLink = await stripeInstance.paymentLinks.create(paymentLinkOptions);

    // Optionally save payment link to database
    if (slotId) {
      const { error: dbError } = await supabase
        .from('ad_slots')
        .update({ 
          payment_link_url: paymentLink.url,
          payment_link_id: paymentLink.id
        })
        .eq('id', slotId);

      if (dbError) {
        console.error('Error saving payment link to database:', dbError);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        paymentLinkUrl: paymentLink.url,
        paymentLinkId: paymentLink.id
      })
    };
  } catch (error) {
    console.error('Error creating payment link:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to create payment link',
        details: error.message
      })
    };
  }
};

