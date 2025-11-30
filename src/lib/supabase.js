import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create a mock client for development if env vars are missing
let supabase;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase environment variables not configured. Using mock mode.');
  console.log('📝 To enable full functionality, add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file');
  
  // Create a minimal mock client
  supabase = {
    from: () => ({
      select: () => Promise.resolve({ data: [], error: null }),
      insert: () => Promise.resolve({ data: null, error: null }),
      update: () => Promise.resolve({ data: null, error: null }),
      delete: () => Promise.resolve({ error: null }),
      eq: function() { return this; },
      single: function() { return this; },
      order: function() { return this; }
    }),
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ data: null, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
        remove: () => Promise.resolve({ error: null })
      })
    },
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      signInWithPassword: () => Promise.resolve({ data: null, error: null }),
      signUp: () => Promise.resolve({ data: null, error: null }),
      signOut: () => Promise.resolve({ error: null }),
      resetPasswordForEmail: () => Promise.resolve({ data: null, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
    }
  };
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export { supabase };

// Auth helpers
export const auth = {
  signUp: async (email, password, userData = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData
      }
    });
    return { data, error };
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { data, error };
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  getCurrentUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
  },

  resetPassword: async (email, redirectTo) => {
    const options = redirectTo ? { redirectTo } : undefined;
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, options);
    return { data, error };
  },

  signInWithGoogle: async (redirectToPath = '/home') => {
    const redirectTo = typeof window !== 'undefined' 
      ? `${window.location.origin}${redirectToPath}`
      : undefined;
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      }
    });
    return { data, error };
  },

  onAuthStateChange: (callback) => {
    return supabase.auth.onAuthStateChange(callback);
  }
};

// Storage helpers
export const storage = {
  uploadClientAd: async (userId, file, contactId) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${contactId}/${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('client-ads')
      .upload(fileName, file);
    
    if (error) return { data: null, error };
    
    const { data: urlData } = supabase.storage
      .from('client-ads')
      .getPublicUrl(fileName);
    
    return { data: { path: fileName, url: urlData.publicUrl }, error: null };
  },

  uploadBackground: async (userId, file, designId) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${designId}/${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('design-backgrounds')
      .upload(fileName, file);
    
    if (error) return { data: null, error };
    
    const { data: urlData } = supabase.storage
      .from('design-backgrounds')
      .getPublicUrl(fileName);
    
    return { data: { path: fileName, url: urlData.publicUrl }, error: null };
  },

  uploadPackingSlip: async (userId, file, campaignId) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${campaignId}/${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('packing-slips')
      .upload(fileName, file);
    
    if (error) return { data: null, error };
    
    const { data: urlData } = supabase.storage
      .from('packing-slips')
      .getPublicUrl(fileName);
    
    return { data: { path: fileName, url: urlData.publicUrl }, error: null };
  },

  deleteFile: async (bucket, path) => {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);
    
    return { error };
  },

  uploadLogo: async (userId, file) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/logo/${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('logos')
      .upload(fileName, file, {
        upsert: true
      });
    
    if (error) return { data: null, error };
    
    const { data: urlData } = supabase.storage
      .from('logos')
      .getPublicUrl(fileName);
    
    return { data: { path: fileName, url: urlData.publicUrl }, error: null };
  }
};

export default supabase;

