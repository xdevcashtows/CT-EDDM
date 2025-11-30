import React, { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import './Activities.css';
import { useAuth } from '../hooks/useAuth';
import PageLayout from '../components/PageLayout';

function Activities() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadActivities();
    }
  }, [user]);

  const loadActivities = async () => {
    setLoading(true);
    // TODO: Load activities from API
    setLoading(false);
  };

  return (
    <PageLayout
      title="Activities"
      subtitle="Manage your contact activities and follow-ups."
      className="page-shell--fullwidth"
    >
      <div className="activities-page">
        {loading ? (
          <div className="activities-loading">
            <p>Loading activities...</p>
          </div>
        ) : (
          <div className="activities-content">
            <div className="activities-empty-state">
              <Calendar size={48} className="activities-empty-icon" />
              <h2>No activities yet</h2>
              <p>Start tracking your contact activities and follow-ups here.</p>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}

export default Activities;

