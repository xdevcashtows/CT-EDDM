import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  Mail, 
  DollarSign, 
  Package, 
  Calendar,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import './Home.css';
import { analytics, campaigns as campaignsAPI, contacts as contactsAPI } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import DevNotice from '../components/DevNotice';
import PageLayout from '../components/PageLayout';

function Home() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentCampaigns, setRecentCampaigns] = useState([]);
  const [upcomingFollowUps, setUpcomingFollowUps] = useState([]);
  const layoutProps = {
    title: 'Dashboard',
    subtitle: "Welcome back! Here's your business overview.",
    tip: 'Data refreshes automatically when new activity arrives.'
  };

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    setLoading(true);
    
    try {
      // Get dashboard stats
      const dashboardStats = await analytics.getDashboardStats(user.id);
      
      // Calculate metrics
      const totalCampaigns = dashboardStats.campaigns.length;
      const activeCampaigns = dashboardStats.campaigns.filter(c => 
        ['active', 'in_production'].includes(c.status)
      ).length;
      
      const totalContacts = dashboardStats.contacts.length;
      const activeClients = dashboardStats.contacts.filter(c => 
        c.stage === 'active'
      ).length;
      
      const totalRevenue = dashboardStats.revenue.reduce((sum, r) => 
        sum + parseFloat(r.total_revenue || 0), 0
      );
      
      const pipelineByStage = {};
      dashboardStats.pipeline.forEach(p => {
        pipelineByStage[p.stage] = p.count;
      });

      // Calculate fill rate
      const totalSlots = dashboardStats.revenue.reduce((sum, r) => 
        sum + (r.small_slots + r.medium_slots + r.large_slots), 0
      );
      const bookedSlots = totalSlots; // Already filtered to booked
      const fillRate = totalSlots > 0 ? (bookedSlots / totalSlots * 100).toFixed(1) : 0;

      setStats({
        totalCampaigns,
        activeCampaigns,
        totalContacts,
        activeClients,
        totalRevenue,
        fillRate,
        pipelineByStage,
        leads: pipelineByStage.lead || 0,
        qualified: pipelineByStage.qualified || 0,
        proposals: pipelineByStage.proposal_sent || 0
      });

      // Get recent campaigns
      const { data: campaignsData } = await campaignsAPI.getAll(user.id);
      if (campaignsData) {
        setRecentCampaigns(campaignsData.slice(0, 5));
      }

      // Get upcoming follow-ups
      const { data: contactsData } = await contactsAPI.getAll(user.id);
      if (contactsData) {
        const upcoming = contactsData
          .filter(c => c.next_follow_up_date)
          .sort((a, b) => new Date(a.next_follow_up_date) - new Date(b.next_follow_up_date))
          .slice(0, 5);
        setUpcomingFollowUps(upcoming);
      }

    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <PageLayout {...layoutProps} className="page-shell--fullwidth">
        <div className="home-page">
          <div className="loading-state">
            <div className="spinner-large"></div>
            <p>Loading dashboard...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout {...layoutProps} className="page-shell--fullwidth">
      <div className="home-page">
        <DevNotice />

        {/* Key Metrics */}
        <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon" style={{ background: '#dbeafe' }}>
            <Package size={24} color="#3b82f6" />
          </div>
          <div className="metric-content">
            <div className="metric-label">Total Campaigns</div>
            <div className="metric-value">{stats?.totalCampaigns || 0}</div>
            <div className="metric-subtext">
              {stats?.activeCampaigns || 0} active
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ background: '#dcfce7' }}>
            <DollarSign size={24} color="#22c55e" />
          </div>
          <div className="metric-content">
            <div className="metric-label">Total Revenue</div>
            <div className="metric-value">
              ${(stats?.totalRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="metric-subtext">
              {stats?.fillRate || 0}% slot fill rate
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ background: '#fef3c7' }}>
            <Users size={24} color="#f59e0b" />
          </div>
          <div className="metric-content">
            <div className="metric-label">Total Contacts</div>
            <div className="metric-value">{stats?.totalContacts || 0}</div>
            <div className="metric-subtext">
              {stats?.activeClients || 0} active clients
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ background: '#fce7f3' }}>
            <TrendingUp size={24} color="#ec4899" />
          </div>
          <div className="metric-content">
            <div className="metric-label">Pipeline</div>
            <div className="metric-value">{stats?.leads || 0}</div>
            <div className="metric-subtext">
              {stats?.qualified || 0} qualified, {stats?.proposals || 0} proposals
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="dashboard-grid">
        {/* Recent Campaigns */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3>Recent Campaigns</h3>
            <a href="/campaigns" className="view-all-link">View all</a>
          </div>
          <div className="card-content">
            {recentCampaigns.length === 0 ? (
              <div className="empty-state">
                <Package size={32} color="#cbd5e1" />
                <p>No campaigns yet</p>
              </div>
            ) : (
              <div className="campaigns-list">
                {recentCampaigns.map(campaign => (
                  <div key={campaign.id} className="campaign-item">
                    <div className="campaign-info">
                      <div className="campaign-name">{campaign.name}</div>
                      <div className="campaign-meta">
                        {campaign.city?.name || 'No city'} • {campaign.total_pieces || 0} pieces
                      </div>
                    </div>
                    <div className={`status-badge status-${campaign.status}`}>
                      {campaign.status}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Follow-ups */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3>Upcoming Follow-ups</h3>
            <a href="/contacts" className="view-all-link">View all</a>
          </div>
          <div className="card-content">
            {upcomingFollowUps.length === 0 ? (
              <div className="empty-state">
                <Calendar size={32} color="#cbd5e1" />
                <p>No follow-ups scheduled</p>
              </div>
            ) : (
              <div className="followups-list">
                {upcomingFollowUps.map(contact => (
                  <div key={contact.id} className="followup-item">
                    <div className="followup-info">
                      <div className="followup-name">{contact.business_name}</div>
                      <div className="followup-meta">
                        {new Date(contact.next_follow_up_date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className={`stage-badge stage-${contact.stage}`}>
                      {contact.stage}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pipeline Overview */}
      <div className="pipeline-card">
        <h3>Sales Pipeline</h3>
        <div className="pipeline-stages">
          <div className="pipeline-stage">
            <div className="stage-count">{stats?.pipelineByStage?.lead || 0}</div>
            <div className="stage-label">Leads</div>
          </div>
          <div className="pipeline-arrow">→</div>
          <div className="pipeline-stage">
            <div className="stage-count">{stats?.pipelineByStage?.contacted || 0}</div>
            <div className="stage-label">Contacted</div>
          </div>
          <div className="pipeline-arrow">→</div>
          <div className="pipeline-stage">
            <div className="stage-count">{stats?.pipelineByStage?.qualified || 0}</div>
            <div className="stage-label">Qualified</div>
          </div>
          <div className="pipeline-arrow">→</div>
          <div className="pipeline-stage">
            <div className="stage-count">{stats?.pipelineByStage?.proposal_sent || 0}</div>
            <div className="stage-label">Proposals</div>
          </div>
          <div className="pipeline-arrow">→</div>
          <div className="pipeline-stage">
            <div className="stage-count">{stats?.pipelineByStage?.won || 0}</div>
            <div className="stage-label">Won</div>
          </div>
          <div className="pipeline-arrow">→</div>
          <div className="pipeline-stage">
            <div className="stage-count">{stats?.pipelineByStage?.active || 0}</div>
            <div className="stage-label">Active</div>
          </div>
        </div>
      </div>
    </div>
  </PageLayout>
  );
}

export default Home;

