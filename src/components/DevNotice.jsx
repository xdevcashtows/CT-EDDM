import React from 'react';
import { AlertCircle } from 'lucide-react';
import './DevNotice.css';

export default function DevNotice() {
  const supabaseConfigured = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (supabaseConfigured) {
    return null;
  }

  return (
    <div className="dev-notice">
      <AlertCircle size={20} />
      <div className="dev-notice-content">
        <strong>Development Mode</strong>
        <span>
          Supabase not configured. Add your environment variables to enable full functionality.
          See <code>ENV_SETUP.md</code> for instructions.
        </span>
      </div>
    </div>
  );
}

