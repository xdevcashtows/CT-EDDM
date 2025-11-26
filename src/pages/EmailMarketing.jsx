import React, { useState, useEffect } from 'react';
import { Plus, Send, Calendar, Users } from 'lucide-react';
import './EmailMarketing.css';
import { emailCampaigns as emailCampaignsAPI, contacts as contactsAPI } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import PageLayout from '../components/PageLayout';

function EmailMarketing() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadCampaigns();
    }
  }, [user]);

  const loadCampaigns = async () => {
    setLoading(true);
    const { data, error } = await emailCampaignsAPI.getAll(user.id);
    if (!error && data) {
      setCampaigns(data);
    }
    setLoading(false);
  };

  const layoutProps = {
    title: 'Email Marketing',
    subtitle: 'Create and manage email campaigns',
    tip: 'Feature coming soon—collect your copy, schedule sends, and track opens.'
  };

  if (loading) {
    return (
      <PageLayout {...layoutProps} className="page-shell--fullwidth">
        <div className="email-marketing-page">
          <div className="loading-state">
            <div className="spinner-large"></div>
            <p>Loading email campaigns...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      {...layoutProps}
      actions={
        <button className="btn-primary">
          <Plus size={20} />
          New Email Campaign
        </button>
      }
      className="page-shell--fullwidth"
    >
      <div className="email-marketing-page">
        <div className="coming-soon">
          <Send size={64} color="#cbd5e1" />
          <h2>Email Marketing Coming Soon</h2>
          <p>
            This feature will allow you to create targeted email campaigns, schedule sends,
            and track engagement with your contacts.
          </p>
          <div className="features-list">
            <div className="feature-item">
              <Users size={20} />
              <span>Target by stage, niche, or individual contacts</span>
            </div>
            <div className="feature-item">
              <Calendar size={20} />
              <span>Schedule immediate, future, or recurring sends</span>
            </div>
            <div className="feature-item">
              <Send size={20} />
              <span>Track opens, clicks, and responses</span>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

export default EmailMarketing;

