import { useState, useEffect } from 'react';
import { auth } from '../lib/supabase';
import { profiles as profilesAPI } from '../lib/api';

const DEV_AUTH_ENABLED = import.meta.env.VITE_ENABLE_DEV_AUTH === 'true';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('⚠️ Supabase not configured. Sign-in is required.');
      if (DEV_AUTH_ENABLED) {
        setUser({
          id: 'dev-user-123',
          email: 'dev@example.com',
          user_metadata: { full_name: 'Development User' }
        });
      } else {
        setUser(null);
      }
      setLoading(false);
      return;
    }

    auth.getCurrentUser().then(({ user, error }) => {
      if (error) {
        // suppress the expected "AuthSessionMissingError" that fires before a user signs in
        if (error.name !== 'AuthSessionMissingError') {
          console.error('Auth error:', error);
        }
        setUser(null);
      } else {
        setUser(user);
      }
      setLoading(false);
    }).catch((err) => {
      if (err?.name !== 'AuthSessionMissingError') {
        console.error('Auth initialization error:', err);
      }
      setUser(null);
      setLoading(false);
    });

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

  useEffect(() => {
    if (!user) return;

    const ensureProfile = async () => {
      const { error } = await profilesAPI.ensure(user);
      if (error) {
        console.error('Unable to ensure profile record exists:', error);
      }
    };

    ensureProfile();
  }, [user]);

  return {
    user,
    loading,
    signIn: auth.signIn,
    signUp: auth.signUp,
    signOut: auth.signOut,
    resetPassword: auth.resetPassword,
    signInWithGoogle: auth.signInWithGoogle
  };
}

