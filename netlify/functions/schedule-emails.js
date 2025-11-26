import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

// This function is triggered by a scheduled Netlify function or cron job
export const handler = async (event) => {
  try {
    // Get all scheduled email campaigns that are ready to send
    const { data: campaigns, error: fetchError } = await supabase
      .from('email_campaigns')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_at', new Date().toISOString());

    if (fetchError) {
      throw fetchError;
    }

    console.log(`Found ${campaigns?.length || 0} campaigns to send`);

    for (const campaign of campaigns || []) {
      try {
        await processCampaign(campaign);
      } catch (error) {
        console.error(`Error processing campaign ${campaign.id}:`, error);
        // Mark campaign as failed
        await supabase
          .from('email_campaigns')
          .update({ status: 'failed' })
          .eq('id', campaign.id);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        processed: campaigns?.length || 0
      })
    };
  } catch (error) {
    console.error('Error in schedule-emails:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to process scheduled emails',
        details: error.message
      })
    };
  }
};

async function processCampaign(campaign) {
  // Update status to sending
  await supabase
    .from('email_campaigns')
    .update({ status: 'sending' })
    .eq('id', campaign.id);

  // Get target contacts
  let contacts = [];
  
  if (campaign.target_contacts && campaign.target_contacts.length > 0) {
    // Specific contacts
    const { data } = await supabase
      .from('contacts')
      .select('*')
      .in('id', campaign.target_contacts);
    contacts = data || [];
  } else if (campaign.target_stage) {
    // All contacts in a stage
    const { data } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', campaign.user_id)
      .eq('stage', campaign.target_stage);
    contacts = data || [];
  } else if (campaign.target_niche_id) {
    // All contacts in a niche
    const { data } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', campaign.user_id)
      .eq('niche_id', campaign.target_niche_id);
    contacts = data || [];
  }

  let sentCount = 0;
  let failedCount = 0;

  // Send emails with rate limiting (batch of 10, wait 1 second between batches)
  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i];
    
    if (!contact.email) {
      failedCount++;
      continue;
    }

    try {
      // Personalize email
      const personalizedHtml = personalizeEmail(campaign.body_html, contact);
      const personalizedText = personalizeEmail(campaign.body_text || '', contact);

      // Send via Resend
      const { data, error } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@eddm.cashtows.com',
        to: contact.email,
        subject: personalizeEmail(campaign.subject, contact),
        html: personalizedHtml,
        text: personalizedText
      });

      if (error) {
        throw error;
      }

      // Log success
      await supabase.from('email_logs').insert({
        email_campaign_id: campaign.id,
        contact_id: contact.id,
        user_id: campaign.user_id,
        email_type: 'campaign',
        recipient_email: contact.email,
        subject: campaign.subject,
        resend_email_id: data.id,
        status: 'sent',
        sent_at: new Date().toISOString()
      });

      sentCount++;

      // Rate limiting: wait 100ms between emails, 1s every 10 emails
      if ((i + 1) % 10 === 0) {
        await sleep(1000);
      } else {
        await sleep(100);
      }
    } catch (error) {
      console.error(`Failed to send to ${contact.email}:`, error);
      
      // Log failure
      await supabase.from('email_logs').insert({
        email_campaign_id: campaign.id,
        contact_id: contact.id,
        user_id: campaign.user_id,
        email_type: 'campaign',
        recipient_email: contact.email,
        subject: campaign.subject,
        status: 'failed',
        error_message: error.message
      });

      failedCount++;
    }
  }

  // Update campaign status
  await supabase
    .from('email_campaigns')
    .update({
      status: 'sent',
      sent_count: sentCount,
      total_recipients: contacts.length,
      sent_at: new Date().toISOString()
    })
    .eq('id', campaign.id);

  console.log(`Campaign ${campaign.id}: sent ${sentCount}, failed ${failedCount}`);
}

function personalizeEmail(template, contact) {
  if (!template) return '';
  
  return template
    .replace(/\{\{business_name\}\}/g, contact.business_name || '')
    .replace(/\{\{owner_name\}\}/g, contact.owner_name || '')
    .replace(/\{\{first_name\}\}/g, contact.owner_name?.split(' ')[0] || '')
    .replace(/\{\{email\}\}/g, contact.email || '')
    .replace(/\{\{phone\}\}/g, contact.phone || '')
    .replace(/\{\{city\}\}/g, contact.city || '')
    .replace(/\{\{state\}\}/g, contact.state || '');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

