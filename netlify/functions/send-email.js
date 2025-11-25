import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);
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
      type, // 'campaign', 'status_update', 'approval_request', 'onboarding', 'notification'
      to,
      subject,
      html,
      text,
      contactId,
      campaignId,
      emailCampaignId,
      userId
    } = JSON.parse(event.body);

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@eddm.cashtows.com',
      to,
      subject,
      html,
      text
    });

    if (error) {
      console.error('Resend error:', error);
      throw error;
    }

    // Log email in database
    const { error: logError } = await supabase
      .from('email_logs')
      .insert({
        email_campaign_id: emailCampaignId || null,
        contact_id: contactId || null,
        user_id: userId,
        email_type: type,
        recipient_email: to,
        subject,
        resend_email_id: data.id,
        status: 'sent',
        sent_at: new Date().toISOString()
      });

    if (logError) {
      console.error('Error logging email:', logError);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        emailId: data.id
      })
    };
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to send email',
        details: error.message
      })
    };
  }
};

