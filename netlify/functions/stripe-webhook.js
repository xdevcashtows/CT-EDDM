import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

export const handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const sig = event.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let stripeEvent;

  try {
    // Verify webhook signature
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      webhookSecret
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: `Webhook Error: ${err.message}` })
    };
  }

  // Handle the event
  try {
    switch (stripeEvent.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(stripeEvent.data.object);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(stripeEvent.data.object);
        break;
      
      case 'charge.refunded':
        await handleRefund(stripeEvent.data.object);
        break;
      
      default:
        console.log(`Unhandled event type: ${stripeEvent.type}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true })
    };
  } catch (error) {
    console.error('Error processing webhook:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

async function handlePaymentSuccess(paymentIntent) {
  const { id, amount, currency, customer, metadata } = paymentIntent;

  // Update payment record in database
  const { error: paymentError } = await supabase
    .from('payments')
    .update({
      status: 'succeeded',
      stripe_charge_id: paymentIntent.latest_charge,
      paid_at: new Date().toISOString()
    })
    .eq('stripe_payment_intent_id', id);

  if (paymentError) {
    console.error('Error updating payment:', paymentError);
    throw paymentError;
  }

  // If metadata includes contact_id and campaign_id, update ad slot status
  if (metadata.contact_id && metadata.ad_slot_id) {
    const { error: slotError } = await supabase
      .from('ad_slots')
      .update({ status: 'booked' })
      .eq('id', metadata.ad_slot_id);

    if (slotError) {
      console.error('Error updating ad slot:', slotError);
    }

    // Update contact stage to 'won' or 'active'
    const { error: contactError } = await supabase
      .from('contacts')
      .update({ stage: 'active' })
      .eq('id', metadata.contact_id);

    if (contactError) {
      console.error('Error updating contact:', contactError);
    }

    // Send confirmation email via Resend
    await sendPaymentConfirmationEmail(metadata.contact_id, metadata.campaign_id);
  }

  console.log(`Payment succeeded: ${id}`);
}

async function handlePaymentFailed(paymentIntent) {
  const { id } = paymentIntent;

  const { error } = await supabase
    .from('payments')
    .update({
      status: 'failed'
    })
    .eq('stripe_payment_intent_id', id);

  if (error) {
    console.error('Error updating failed payment:', error);
    throw error;
  }

  console.log(`Payment failed: ${id}`);
}

async function handleRefund(charge) {
  const { payment_intent, amount_refunded } = charge;

  const { error } = await supabase
    .from('payments')
    .update({
      status: 'refunded',
      refund_amount: amount_refunded / 100, // Convert from cents
      refunded_at: new Date().toISOString()
    })
    .eq('stripe_payment_intent_id', payment_intent);

  if (error) {
    console.error('Error updating refunded payment:', error);
    throw error;
  }

  console.log(`Payment refunded: ${payment_intent}`);
}

async function sendPaymentConfirmationEmail(contactId, campaignId) {
  // This will be implemented with Resend integration
  // For now, just log
  console.log(`Should send confirmation email to contact ${contactId} for campaign ${campaignId}`);
  
  // TODO: Implement Resend email sending
  // Will be done in the email service function
}

