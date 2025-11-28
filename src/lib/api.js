import { supabase } from './supabase';

// Helper to check if we're in mock mode
const isMockMode = !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY;

// ============================================
// PROFILES
// ============================================
export const profiles = {
  ensure: async (user) => {
    if (!user?.id) {
      return { data: null, error: new Error('Missing user information') };
    }

    const payload = {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.email || ''
    };

    const { data, error } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single();

    return { data, error };
  }
};

// ============================================
// CONTACTS / CRM
// ============================================
export const contacts = {
  getAll: async (userId) => {
    if (isMockMode) {
      return { data: [], error: null };
    }
    const { data: memberships, error: membershipError } = await supabase
      .from('account_members')
      .select('owner_id')
      .eq('profile_id', userId)
      .eq('status', 'active');

    if (membershipError) {
      return { data: [], error: membershipError };
    }

    const ownerIds = (memberships || [])
      .map((membership) => membership.owner_id)
      .filter(Boolean);

    const targetUserIds = Array.from(new Set([userId, ...ownerIds]));

    const { data, error } = await supabase
      .from('contacts')
      .select('*, niche:niches!contacts_niche_id_fkey(name)')
      .in('user_id', targetUserIds)
      .order('created_at', { ascending: false });

    return { data, error };
  },

  getById: async (id) => {
    const { data, error } = await supabase
      .from('contacts')
      .select('*, niche:niches!contacts_niche_id_fkey(name)')
      .eq('id', id)
      .single();
    return { data, error };
  },

  getByStage: async (userId, stage) => {
    const { data, error } = await supabase
      .from('contacts')
      .select('*, niche:niches!contacts_niche_id_fkey(name)')
      .eq('user_id', userId)
      .eq('stage', stage)
      .order('created_at', { ascending: false });
    return { data, error };
  },

  create: async (contactData) => {
    const { data, error } = await supabase
      .from('contacts')
      .insert(contactData)
      .select()
      .single();
    return { data, error };
  },

  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('contacts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  delete: async (id) => {
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id);
    return { error };
  }
};

// ============================================
// CONTACT ACTIVITIES
// ============================================
export const activities = {
  getByContact: async (contactId) => {
    const { data, error } = await supabase
      .from('contact_activities')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false });
    return { data, error };
  },

  create: async (activityData) => {
    const { data, error } = await supabase
      .from('contact_activities')
      .insert(activityData)
      .select()
      .single();
    return { data, error };
  },

  markComplete: async (id) => {
    const { data, error } = await supabase
      .from('contact_activities')
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  }
};

// ============================================
// CONTACT NOTES
// ============================================
export const contactNotes = {
  getByContact: async (contactId) => {
    const { data, error } = await supabase
      .from('contact_notes')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false });
    return { data, error };
  },

  create: async (noteData) => {
    const { data, error } = await supabase
      .from('contact_notes')
      .insert(noteData)
      .select()
      .single();
    return { data, error };
  },

  update: async (id, updates) => {
    const { data, error} = await supabase
      .from('contact_notes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  delete: async (id) => {
    const { error } = await supabase
      .from('contact_notes')
      .delete()
      .eq('id', id);
    return { error };
  }
};

// ============================================
// CLIENT ADS
// ============================================
export const clientAds = {
  getByContact: async (contactId) => {
    const { data, error } = await supabase
      .from('client_ads')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false });
    return { data, error };
  },

  create: async (adData) => {
    const { data, error } = await supabase
      .from('client_ads')
      .insert(adData)
      .select()
      .single();
    return { data, error };
  },

  updateApprovalStatus: async (id, status, notes = null) => {
    const { data, error } = await supabase
      .from('client_ads')
      .update({
        approval_status: status,
        approval_responded_at: new Date().toISOString(),
        approval_notes: notes
      })
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  delete: async (id) => {
    const { error } = await supabase
      .from('client_ads')
      .delete()
      .eq('id', id);
    return { error };
  }
};

// ============================================
// CAMPAIGNS
// ============================================
export const campaigns = {
  getAll: async (userId) => {
    const { data, error } = await supabase
      .from('campaigns')
      .select(`
        *, 
        city:cities(name, state),
        ad_slots(id, status, contact_id)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    // Calculate advertiser and revenue metrics for each campaign
    if (data) {
      const enrichedData = data.map(campaign => {
        const slots = campaign.ad_slots || [];
        const total_ad_slots = slots.length;
        const booked_ad_slots = slots.filter(slot => 
          slot.contact_id && (slot.status === 'booked' || slot.status === 'reserved')
        ).length;
        
        // Calculate expected revenue (sum of all slot prices based on size)
        const priceSmall = Number(campaign.price_small) || 0;
        const priceMedium = Number(campaign.price_medium) || 0;
        const priceLarge = Number(campaign.price_large) || 0;
        
        // For now, we'll estimate based on booked slots
        // You can refine this based on actual slot sizes
        const expected_revenue = (priceSmall + priceMedium + priceLarge) * booked_ad_slots;
        
        return {
          ...campaign,
          total_ad_slots,
          booked_ad_slots,
          expected_revenue,
          revenue_collected: campaign.revenue_collected || 0,
          revenue_total: campaign.revenue_total || expected_revenue
        };
      });
      
      return { data: enrichedData, error };
    }
    
    return { data, error };
  },

  getById: async (id) => {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*, city:cities(name, state), ad_slots(*)')
      .eq('id', id)
      .single();
    return { data, error };
  },

  create: async (campaignData) => {
    const { data, error } = await supabase
      .from('campaigns')
      .insert(campaignData)
      .select()
      .single();
    return { data, error };
  },

  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('campaigns')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  complete: async (id) => {
    const { data, error } = await supabase
      .from('campaigns')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  delete: async (id) => {
    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', id);
    return { error };
  }
};

// ============================================
// AD SLOTS
// ============================================
export const adSlots = {
  getByCampaign: async (campaignId) => {
    const { data, error } = await supabase
      .from('ad_slots')
      .select('*, contact:contacts(business_name), client_ad:client_ads(image_url, name)')
      .eq('campaign_id', campaignId)
      .order('slot_position');
    return { data, error };
  },

  create: async (slotData) => {
    const { data, error } = await supabase
      .from('ad_slots')
      .insert(slotData)
      .select()
      .single();
    return { data, error };
  },

  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('ad_slots')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  assignClient: async (slotId, contactId, clientAdId) => {
    const { data, error } = await supabase
      .from('ad_slots')
      .update({
        contact_id: contactId,
        client_ad_id: clientAdId,
        status: 'booked'
      })
      .eq('id', slotId)
      .select()
      .single();
    return { data, error };
  }
};

// ============================================
// DESIGNS
// ============================================
export const designs = {
  getAll: async (userId) => {
    const { data, error } = await supabase
      .from('designs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return { data, error };
  },

  getById: async (id) => {
    const { data, error } = await supabase
      .from('designs')
      .select('*')
      .eq('id', id)
      .single();
    return { data, error };
  },

  create: async (designData) => {
    const { data, error } = await supabase
      .from('designs')
      .insert(designData)
      .select()
      .single();
    return { data, error };
  },

  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('designs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  delete: async (id) => {
    const { error } = await supabase
      .from('designs')
      .delete()
      .eq('id', id);
    return { error };
  }
};

// ============================================
// SAVED ROUTES
// ============================================
export const savedRoutes = {
  getAll: async (userId) => {
    const { data, error } = await supabase
      .from('saved_routes')
      .select('*, city:cities(name, state)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return { data, error };
  },

  getById: async (id) => {
    const { data, error } = await supabase
      .from('saved_routes')
      .select('*')
      .eq('id', id)
      .single();
    return { data, error };
  },

  create: async (routeData) => {
    const { data, error } = await supabase
      .from('saved_routes')
      .insert(routeData)
      .select()
      .single();
    return { data, error };
  },

  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('saved_routes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  lock: async (id) => {
    const { data, error } = await supabase
      .from('saved_routes')
      .update({ is_locked: true })
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  delete: async (id) => {
    const { error } = await supabase
      .from('saved_routes')
      .delete()
      .eq('id', id);
    return { error };
  }
};

// ============================================
// CITIES
// ============================================
export const cities = {
  getAll: async (userId) => {
    const { data, error } = await supabase
      .from('cities')
      .select('*')
      .eq('created_by', userId)
      .order('name');
    return { data, error };
  },

  create: async (cityData) => {
    const { data, error } = await supabase
      .from('cities')
      .insert(cityData)
      .select()
      .single();
    return { data, error };
  },

  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('cities')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  }
};

// ============================================
// NICHES
// ============================================
export const niches = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('niches')
      .select('*')
      .order('name');
    return { data, error };
  },

  create: async (name, userId) => {
    const { data, error } = await supabase
      .from('niches')
      .insert({ name, is_custom: true, created_by: userId })
      .select()
      .single();
    return { data, error };
  }
};

// ============================================
// EMAIL CAMPAIGNS
// ============================================
export const emailCampaigns = {
  getAll: async (userId) => {
    const { data, error } = await supabase
      .from('email_campaigns')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return { data, error };
  },

  create: async (campaignData) => {
    const { data, error } = await supabase
      .from('email_campaigns')
      .insert(campaignData)
      .select()
      .single();
    return { data, error };
  },

  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('email_campaigns')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  }
};

// ============================================
// EMAIL TEMPLATES
// ============================================
export const emailTemplates = {
  getAll: async (userId) => {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return { data, error };
  },

  create: async (templateData) => {
    const { data, error } = await supabase
      .from('email_templates')
      .insert(templateData)
      .select()
      .single();
    return { data, error };
  },

  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('email_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  delete: async (id) => {
    const { error } = await supabase
      .from('email_templates')
      .delete()
      .eq('id', id);
    return { error };
  }
};

// ============================================
// PAYMENTS
// ============================================
export const payments = {
  getByContact: async (contactId) => {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false });
    return { data, error };
  },

  create: async (paymentData) => {
    const { data, error } = await supabase
      .from('payments')
      .insert(paymentData)
      .select()
      .single();
    return { data, error };
  }
};

// ============================================
// ANALYTICS
// ============================================
export const analytics = {
  getCampaignRevenue: async (userId) => {
    const { data, error } = await supabase
      .from('campaign_revenue')
      .select('*')
      .eq('user_id', userId);
    return { data, error };
  },

  getPipelineSummary: async (userId) => {
    const { data, error } = await supabase
      .from('contact_pipeline_summary')
      .select('*')
      .eq('user_id', userId);
    return { data, error };
  },

  getDashboardStats: async (userId) => {
    // Get multiple stats in parallel
    const [campaignsRes, contactsRes, revenueRes, pipelineRes] = await Promise.all([
      supabase.from('campaigns').select('status').eq('user_id', userId),
      supabase.from('contacts').select('stage').eq('user_id', userId),
      supabase.from('campaign_revenue').select('*').eq('user_id', userId),
      supabase.from('contact_pipeline_summary').select('*').eq('user_id', userId)
    ]);

    return {
      campaigns: campaignsRes.data || [],
      contacts: contactsRes.data || [],
      revenue: revenueRes.data || [],
      pipeline: pipelineRes.data || []
    };
  }
};

// ============================================
// PACKING SLIPS
// ============================================
export const packingSlips = {
  getByCampaign: async (campaignId) => {
    const { data, error } = await supabase
      .from('packing_slips')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false });
    return { data, error };
  },

  create: async (slipData) => {
    const { data, error } = await supabase
      .from('packing_slips')
      .insert(slipData)
      .select()
      .single();
    return { data, error };
  },

  delete: async (id) => {
    const { error } = await supabase
      .from('packing_slips')
      .delete()
      .eq('id', id);
    return { error };
  }
};

const mockTeamMembers = [
  {
    id: 'mock-owner',
    email: 'owner@demo.com',
    role: 'admin',
    status: 'active',
    invited_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    joined_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    profile: {
      full_name: 'Account Owner',
      email: 'owner@demo.com'
    }
  },
  {
    id: 'mock-staff',
    email: 'team.member@demo.com',
    role: 'member',
    status: 'active',
    invited_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    joined_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    profile: {
      full_name: 'Team Member',
      email: 'team.member@demo.com'
    }
  },
  {
    id: 'mock-invite',
    email: 'new.collaborator@demo.com',
    role: 'viewer',
    status: 'invited',
    invited_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    joined_at: null,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    profile: null
  }
]

export const accountMembers = {
  listForOwner: async (ownerId) => {
    if (isMockMode) {
      return { data: mockTeamMembers, error: null }
    }

    if (!ownerId) {
      return { data: [], error: null }
    }

    const { data, error } = await supabase
      .from('account_members')
      .select(
        'id, email, role, status, created_at, invited_at, joined_at, profile:profiles(full_name, email)'
      )
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })

    return { data, error }
  },

  invite: async (ownerId, payload) => {
    if (isMockMode) {
      const mockEntry = {
        id: `mock-${Date.now()}`,
        owner_id: ownerId,
        email: payload.email,
        role: payload.role || 'member',
        status: 'invited',
        invited_at: new Date().toISOString(),
        joined_at: null,
        created_at: new Date().toISOString(),
        profile: null
      }
      return { data: mockEntry, error: null }
    }

    if (!ownerId) {
      return { data: null, error: new Error('Missing owner id') }
    }

    const { data, error } = await supabase
      .from('account_members')
      .insert({
        owner_id: ownerId,
        email: payload.email,
        role: payload.role || 'member'
      })
      .select(
        'id, email, role, status, created_at, invited_at, joined_at, profile:profiles(full_name, email)'
      )
      .single()

    return { data, error }
  }
}

// ============================================
// EMAIL SENDING (via Netlify function)
// ============================================
export const sendEmail = async (emailData) => {
  try {
    const response = await fetch('/.netlify/functions/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emailData)
    });
    
    const result = await response.json();
    return { data: result, error: response.ok ? null : result };
  } catch (error) {
    return { data: null, error };
  }
};

