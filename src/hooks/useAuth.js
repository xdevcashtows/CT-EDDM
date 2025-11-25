import { useState, useEffect } from 'react';
import { auth } from '../lib/supabase';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if Supabase is configured
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      // Development mode: Use mock user
      console.warn('⚠️ Supabase not configured. Using mock user for development.');
      setUser({
        id: 'dev-user-123',
        email: 'dev@example.com',
        user_metadata: { full_name: 'Development User' }
      });
      setLoading(false);
      return;
    }

    // Get initial user
    auth.getCurrentUser().then(({ user, error }) => {
      if (error) {
        console.error('Auth error:', error);
        // Use mock user on error
        setUser({
          id: 'dev-user-123',
          email: 'dev@example.com',
          user_metadata: { full_name: 'Development User' }
        });
      } else {
        setUser(user);
      }
      setLoading(false);
    }).catch(() => {
      // Fallback to mock user
      setUser({
        id: 'dev-user-123',
        email: 'dev@example.com',
        user_metadata: { full_name: 'Development User' }
      });
      setLoading(false);
    });

    // Listen for auth changes
    try {
      const { data: { subscription } } = auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      });

      return () => subscription?.unsubscribe();
    } catch (error) {
      console.error('Auth subscription error:', error);
    }
  }, []);

  return {
    user,
    loading,
    signIn: auth.signIn,
    signUp: auth.signUp,
    signOut: auth.signOut,
    resetPassword: auth.resetPassword
  };
}

