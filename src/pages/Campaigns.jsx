import React, { useState, useEffect } from 'react';
import { Plus, Trash2, CheckCircle } from 'lucide-react';
import './Campaigns.css';
import { 
  campaigns as campaignsAPI, 
  savedRoutes as savedRoutesAPI,
  designs as designsAPI,
  adSlots as adSlotsAPI,
  contacts as contactsAPI,
  clientAds,
  niches as nichesAPI,
  emailTemplates as emailTemplatesAPI,
  emailCampaigns
} from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import PageLayout from '../components/PageLayout';
import { enrichSavedRoutesWithLock } from '../utils/routeLocking';
import { getMockLayoutForDesign, getDefaultMockLayout } from '../utils/mockLayouts';

const CAMPAIGN_STATUSES = [
  { value: 'draft', label: 'Draft', color: '#64748b' },
  { value: 'active', label: 'Active', color: '#3b82f6' },
  { value: 'in_production', label: 'In Production', color: '#f59e0b' },
  { value: 'printed', label: 'Printed', color: '#8b5cf6' },
  { value: 'mailed', label: 'Mailed', color: '#10b981' },
  { value: 'completed', label: 'Completed', color: '#22c55e' },
  { value: 'cancelled', label: 'Cancelled', color: '#ef4444' }
];

const cloneLayout = (layout = getDefaultMockLayout('9x12')) => ({
  front: { ...layout.front },
  back: { ...layout.back }
});

function Campaigns() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    if (user) {
      loadCampaigns();
    }
  }, [user]);

  const loadCampaigns = async () => {
    setLoading(true);
    const { data, error } = await campaignsAPI.getAll(user.id);
    if (!error && data) {
      setCampaigns(data);
    }
    setLoading(false);
  };

  const filteredCampaigns = campaigns.filter(c => 
    filterStatus === 'all' || c.status === filterStatus
  );

  const handleCreateCampaign = () => {
    setSelectedCampaign(null);
    setShowModal(true);
  };

  const handleEditCampaign = (campaign) => {
    setSelectedCampaign(campaign);
    setShowModal(true);
  };

  const handleDeleteCampaign = async (campaignId) => {
    if (confirm('Are you sure you want to delete this campaign?')) {
      const { error } = await campaignsAPI.delete(campaignId);
      if (!error) {
        setCampaigns(campaigns.filter(c => c.id !== campaignId));
      } else {
        alert('Failed to delete campaign');
      }
    }
  };

  const handleCompleteCampaign = async (campaignId) => {
    if (confirm('Mark this campaign as completed? This will lock all data.')) {
      const { error } = await campaignsAPI.complete(campaignId);
      if (!error) {
        await loadCampaigns();
      } else {
        alert('Failed to complete campaign');
      }
    }
  };

  const handleStatusChange = async (campaignId, statusValue) => {
    const { error } = await campaignsAPI.update(campaignId, { status: statusValue });
    if (!error) {
      await loadCampaigns();
    } else {
      alert('Failed to update campaign status');
    }
  };

  const layoutProps = {
    title: 'Campaigns',
    subtitle: 'Manage your EDDM campaigns from planning through mailing.',
    tip: 'Filters update as campaign status changes—use them to surface active work.'
  };

  if (loading) {
    return (
      <PageLayout {...layoutProps} className="page-shell--fullwidth">
        <div className="campaigns-page">
          <div className="loading-state">
            <div className="spinner-large"></div>
            <p>Loading campaigns...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      {...layoutProps}
      actions={
        <button className="btn-primary" onClick={handleCreateCampaign}>
          <Plus size={20} />
          New Campaign
        </button>
      }
      className="page-shell--fullwidth"
    >
      <div className="campaigns-page">
        {/* Status Filters */}
        <div className="status-filters">
        <button
          className={`status-filter ${filterStatus === 'all' ? 'active' : ''}`}
          onClick={() => setFilterStatus('all')}
        >
          All ({campaigns.length})
        </button>
        {CAMPAIGN_STATUSES.map(status => {
          const count = campaigns.filter(c => c.status === status.value).length;
          return (
            <button
              key={status.value}
              className={`status-filter ${filterStatus === status.value ? 'active' : ''}`}
              onClick={() => setFilterStatus(status.value)}
              style={{ borderColor: status.color }}
            >
              {status.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Campaigns List */}
      <div className="campaigns-list">
        {filteredCampaigns.length === 0 ? (
          <div className="empty-state">
            <p>No campaigns found</p>
          </div>
        ) : (
          filteredCampaigns.map(campaign => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onEdit={handleEditCampaign}
              onDelete={handleDeleteCampaign}
              onComplete={handleCompleteCampaign}
              onStatusChange={handleStatusChange}
            />
          ))
        )}
      </div>

      {showModal && (
        <CampaignModal
          campaign={selectedCampaign}
          userId={user.id}
          onClose={() => setShowModal(false)}
          onSave={loadCampaigns}
        />
      )}
    </div>
  </PageLayout>
  );
}

function AdvertiserRoster({ slots, campaign, slotDiscounts, onDiscountChange }) {
  const committedSlots = slots.filter(slot => slot.contact);
  const priceLookup = {
    small: Number(campaign?.price_small) || 0,
    medium: Number(campaign?.price_medium) || 0,
    large: Number(campaign?.price_large) || 0
  };

  if (!committedSlots.length) {
    return <p className="form-hint">No advertisers signed up yet.</p>;
  }

  return (
    <div className="advertiser-roster">
      {committedSlots.map(slot => {
        const discount = slotDiscounts[slot.id] ?? 0;
        const basePrice = priceLookup[slot.slot_size] || 0;
        const finalRate = Math.max(basePrice - (basePrice * (discount / 100)), 0);
        return (
          <div key={slot.id} className="advertiser-row">
            <div className="advertiser-row__meta">
              <div>
                <strong>{slot.slot_position}</strong>
                <span className="slot-size-label">{slot.slot_size}</span>
              </div>
              <div>
                <strong>{slot.contact?.business_name || 'Advertiser'}</strong>
                <span>{slot.contact?.email || 'Email unknown'}</span>
              </div>
            </div>
            <div className="advertiser-row__pricing">
              <div className="price-cell">
                <span className="price-label">Base</span>
                <strong>${basePrice.toFixed(2)}</strong>
              </div>
              <div className="price-cell">
                <span className="price-label">Discount (%)</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={discount}
                  onChange={(e) => onDiscountChange(slot.id, e.target.value)}
                />
              </div>
              <div className="price-cell">
                <span className="price-label">Final rate</span>
                <strong>${finalRate.toFixed(2)}</strong>
              </div>
            </div>
            <div className="advertiser-row__ad">
              {slot.client_ad?.image_url ? (
                <img src={slot.client_ad.image_url} alt={slot.client_ad.name || 'Client ad'} />
              ) : (
                <div className="advertiser-row__ad-placeholder">
                  <span>No ad assigned</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MockDisplay({ counts, caps, onAdjust }) {
  const sizeLabels = { small: 'Small', medium: 'Medium', large: 'Large' };
  return (
    <div className="mock-display">
      <div className="mock-display__grid">
        {['front', 'back'].map(side => (
          <div key={side} className="mock-display__side">
            <div className="mock-display__side-header">
              <strong>{side === 'front' ? 'Front Side' : 'Back Side'}</strong>
              <span>
                Max spots:{' '}
                {caps?.[side]
                  ? Object.values(caps[side]).reduce((total, value) => total + (value || 0), 0)
                  : 0}
              </span>
            </div>
            <div className="mock-display__body">
              {['small', 'medium', 'large'].map(size => {
                const count = counts?.[side]?.[size] ?? 0;
                const cap = caps?.[side]?.[size] ?? 0;
                return (
                  <div key={`${side}-${size}`} className="mock-display__row">
                    <div>
                      <strong>{sizeLabels[size]} spot</strong>
                      <p className="mock-display__hint">{cap} max</p>
                    </div>
                    <div className="mock-display__controls">
                      <button
                        type="button"
                        onClick={() => onAdjust(side, size, -1)}
                        disabled={count <= 0}
                      >
                        −
                      </button>
                      <span>{count}</span>
                      <button
                        type="button"
                        onClick={() => onAdjust(side, size, 1)}
                        disabled={count >= cap}
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Campaign Card Component
function CampaignCard({ campaign, onEdit, onDelete, onComplete, onStatusChange }) {
  const status = CAMPAIGN_STATUSES.find(s => s.value === campaign.status);
  const routeCount = campaign.route_snapshot?.length || 0;
  const routeHouseholds = campaign.total_households || 0;
  const designName = campaign.design_snapshot?.name || 'Design pending';
  const designSize = campaign.design_snapshot?.card_size;
  const mailDateLabel = campaign.mail_date
    ? new Date(campaign.mail_date).toLocaleDateString()
    : 'TBD';
  const pieces = campaign.total_pieces || 0;

  const handleStatusSelect = (event) => {
    const nextStatus = event.target.value;
    if (onStatusChange && nextStatus !== campaign.status) {
      onStatusChange(campaign.id, nextStatus);
    }
  };

  const handleCardClick = () => {
    if (onEdit) onEdit(campaign);
  };

  const handleCardKeyDown = (event) => {
    if ((event.key === 'Enter' || event.key === ' ') && onEdit) {
      event.preventDefault();
      onEdit(campaign);
    }
  };

  return (
    <div
      className="campaign-card"
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={handleCardKeyDown}
    >
      <div className="campaign-card__header">
        <div>
          <h3 className="campaign-name">{campaign.name}</h3>
          <div className="campaign-meta">
            {campaign.city?.name || 'No city'} • {pieces} pieces
          </div>
        </div>

        <div className="campaign-card__status-actions">
          <div
            className="campaign-status"
            style={{ background: status?.color + '20', color: status?.color }}
          >
            {status?.label}
          </div>
          <select
            className="campaign-card__status-select"
            value={campaign.status}
            onChange={handleStatusSelect}
            onClick={(e) => e.stopPropagation()}
            aria-label="Update campaign status"
          >
            {CAMPAIGN_STATUSES.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="header-action-buttons">
            {campaign.status !== 'completed' && (
              <button
                className="header-action-btn header-action-btn--success"
                onClick={(e) => {
                  e.stopPropagation();
                  onComplete(campaign.id);
                }}
                aria-label="Mark campaign complete"
              >
                <CheckCircle size={16} />
              </button>
            )}
            <button
              className="header-action-btn header-action-btn--danger"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(campaign.id);
              }}
              disabled={campaign.status === 'completed'}
              aria-label="Delete campaign"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="campaign-card__grid">
        <div className="campaign-card__stat">
          <span>Route summary</span>
          <strong>{routeCount} route{routeCount === 1 ? '' : 's'}</strong>
          <small>
            {routeHouseholds ? `${routeHouseholds} households` : 'Route data missing'}
          </small>
        </div>
        <div className="campaign-card__stat">
          <span>Design</span>
          <strong>{designName}</strong>
          {designSize && <small>{designSize}</small>}
        </div>
        <div className="campaign-card__stat">
          <span>Mail date</span>
          <strong>{mailDateLabel}</strong>
          <small>{pieces ? `${pieces} pieces scheduled` : 'Pricing pending'}</small>
        </div>
      </div>

      <div className="campaign-card__pricing-grid">
        <div className="price-item">
          <span className="price-label">Small</span>
          <span className="price-value">${campaign.price_small || 0}</span>
        </div>
        <div className="price-item">
          <span className="price-label">Medium</span>
          <span className="price-value">${campaign.price_medium || 0}</span>
        </div>
        <div className="price-item">
          <span className="price-label">Large</span>
          <span className="price-value">${campaign.price_large || 0}</span>
        </div>
      </div>
    </div>
  );
}

// Campaign Modal Component
function CampaignModal({ campaign, userId, onClose, onSave }) {
  const [formData, setFormData] = useState(campaign || {
    name: '',
    saved_route_id: null,
    design_id: null,
    price_small: 0,
    price_medium: 0,
    price_large: 0,
    unique_niche_per_slot: true,
    mail_date: '',
    notes: ''
  });
  const defaultMockLayout = getDefaultMockLayout('9x12');
  const [mockDisplayCounts, setMockDisplayCounts] = useState(cloneLayout(defaultMockLayout));
  const [slotDiscounts, setSlotDiscounts] = useState({});

  const [savedRoutes, setSavedRoutes] = useState([]);
  const [designs, setDesigns] = useState([]);
  const [slots, setSlots] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [niches, setNiches] = useState([]);
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [emailForm, setEmailForm] = useState({
    templateId: '',
    sendTo: 'tag',
    selectedTag: '',
    selectedContacts: [],
    sendNow: true,
    scheduledAt: '',
    subject: '',
    body_html: '',
    body_text: ''
  });
  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (campaign?.id) {
      loadSlots();
    }
  }, [campaign]);

  const loadData = async () => {
    const [routesRes, campaignsRes, designsRes, contactsRes, nichesRes, templatesRes] = await Promise.all([
      savedRoutesAPI.getAll(userId),
      campaignsAPI.getAll(userId),
      designsAPI.getAll(userId),
      contactsAPI.getAll(userId),
      nichesAPI.getAll(),
      emailTemplatesAPI.getAll(userId)
    ]);

    if (!routesRes.error) {
      setSavedRoutes(
        enrichSavedRoutesWithLock(
          routesRes.data || [],
          campaignsRes?.data || []
        )
      );
    }
    if (!designsRes.error) {
      setDesigns(
        (designsRes.data || []).map(design => ({
          ...design,
          mock_layout: getMockLayoutForDesign(design.id, design.card_size)
        }))
      );
    }
    if (!contactsRes.error) setContacts(contactsRes.data || []);
    if (!nichesRes.error) setNiches(nichesRes.data || []);
    if (!templatesRes.error) setEmailTemplates(templatesRes.data || []);
  };

  const loadSlots = async () => {
    const { data, error } = await adSlotsAPI.getByCampaign(campaign.id);
    if (!error) setSlots(data || []);
  };

  const selectedRoute = savedRoutes.find(r => r.id === formData.saved_route_id);
  const selectedDesign = designs.find(d => d.id === formData.design_id);
  const designLayout = selectedDesign
    ? (selectedDesign.mock_layout || getMockLayoutForDesign(selectedDesign.id, selectedDesign.card_size))
    : defaultMockLayout;

  useEffect(() => {
    setMockDisplayCounts(cloneLayout(designLayout));
  }, [designLayout]);
  
  const selectableContacts = contacts
    .filter(contact => contact.email)
    .sort((a, b) => (a.business_name || '').localeCompare(b.business_name || ''));

  const contactTagSet = new Set();
  contacts.forEach(contact => {
    if (contact.stage) contactTagSet.add(contact.stage);
    if (Array.isArray(contact.tags)) {
      contact.tags.forEach(tag => {
        if (tag) contactTagSet.add(tag);
      });
    }
  });
  const availableTags = Array.from(contactTagSet).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  );

  const formatTagLabel = (tag) => (
    tag
      ? tag
          .replace(/_/g, ' ')
          .replace(/\b\w/g, char => char.toUpperCase())
      : ''
  );

  const getLocalDateTimeValue = (date = new Date()) => {
    const tzOffset = date.getTimezoneOffset();
    const localTime = new Date(date.getTime() - tzOffset * 60000);
    return localTime.toISOString().slice(0, 16);
  };

  const scheduleMinValue = getLocalDateTimeValue();

  const slotRateFields = [
    { key: 'price_small', title: 'Small Slot', subtitle: '1-slot placement' },
    { key: 'price_medium', title: 'Medium Slot', subtitle: '2-slot cluster' },
    { key: 'price_large', title: 'Large Slot', subtitle: 'Premium spread' }
  ];

  const updatePrice = (field, rawValue) => {
    const parsed = rawValue === '' ? 0 : parseFloat(rawValue);
    setFormData(prev => ({
      ...prev,
      [field]: Number.isNaN(parsed) ? 0 : parsed
    }));
  };

  const handleDiscountChange = (slotId, rawValue) => {
    const parsed = parseFloat(rawValue);
    const nextValue = Number.isNaN(parsed) ? 0 : Math.min(Math.max(parsed, 0), 100);
    setSlotDiscounts(prev => ({ ...prev, [slotId]: nextValue }));
  };

  const handleAdjustMockSpot = (side, size, delta) => {
    setMockDisplayCounts(prev => {
      const currentValue = prev?.[side]?.[size] ?? 0;
      const maxValue = designLayout?.[side]?.[size] ?? 0;
      const nextValue = Math.min(Math.max(currentValue + delta, 0), maxValue);
      return {
        ...prev,
        [side]: {
          ...prev[side],
          [size]: nextValue
        }
      };
    });
  };

  const handleSubmit = async () => {
    const trimmedName = formData.name?.trim();
    if (!trimmedName) {
      alert('Please name your campaign before saving.');
      return;
    }
    if (!formData.saved_route_id || !formData.design_id) {
      alert('Please select a route and a design for the campaign.');
      return;
    }

    setLoading(true);

    try {
      if (campaign?.id) {
        const { error } = await campaignsAPI.update(campaign.id, { ...formData, name: trimmedName });
        if (error) throw error;
      } else {
        const campaignData = {
          ...formData,
          name: trimmedName,
          user_id: userId,
          route_snapshot: selectedRoute?.routes || [],
          design_snapshot: selectedDesign || {},
          total_pieces: selectedRoute?.total_households || 0,
          status: 'draft'
        };

        const { data: newCampaign, error } = await campaignsAPI.create(campaignData);
        if (error) throw error;

        if (newCampaign && selectedDesign?.slot_config) {
          for (const slotConfig of selectedDesign.slot_config) {
            await adSlotsAPI.create({
              campaign_id: newCampaign.id,
              slot_position: slotConfig.position,
              slot_size: slotConfig.size,
              width: slotConfig.width,
              height: slotConfig.height,
              x_position: slotConfig.x,
              y_position: slotConfig.y,
              status: 'available'
            });
          }
        }

        if (formData.saved_route_id) {
          await savedRoutesAPI.lock(formData.saved_route_id);
        }

        await createEmailCampaignIfConfigured(newCampaign.id);
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving campaign:', error);
      alert('Failed to save campaign');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    const trimmedName = (formData.name || '').trim();
    if (!trimmedName) {
      alert('Please name your campaign before saving the draft.');
      return;
    }

    setFormData(prev => ({ ...prev, name: trimmedName }));
    setSavingDraft(true);

    try {
      const draftPayload = { ...formData, name: trimmedName, status: 'draft' };
      if (campaign?.id) {
        const { error } = await campaignsAPI.update(campaign.id, draftPayload);
        if (error) throw error;
      } else {
        const campaignData = {
          ...draftPayload,
          name: trimmedName,
          user_id: userId,
          route_snapshot: selectedRoute?.routes || [],
          design_snapshot: selectedDesign || {},
          total_pieces: selectedRoute?.total_households || 0,
          status: 'draft'
        };

        const { data: newCampaign, error } = await campaignsAPI.create(campaignData);
        if (error) throw error;

        if (formData.saved_route_id) {
          await savedRoutesAPI.lock(formData.saved_route_id);
        }
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving draft campaign:', error);
      alert('Failed to save draft campaign');
    } finally {
      setSavingDraft(false);
    }
  };

  const handleEmailSendToChange = (value) => {
    setEmailForm(prev => ({
      ...prev,
      sendTo: value,
      selectedTag: value === 'tag' ? prev.selectedTag : '',
      selectedContacts: value === 'tag' ? [] : prev.selectedContacts
    }));
  };

  const handleTemplateChange = (templateId) => {
    const template = emailTemplates.find(t => t.id === templateId);
    setEmailForm(prev => ({
      ...prev,
      templateId,
      subject: template?.subject || '',
      body_html: template?.body_html || '',
      body_text: template?.body_text || template?.body_html || ''
    }));
  };

  const toggleEmailContact = (contactId) => {
    setEmailForm(prev => {
      const alreadySelected = prev.selectedContacts.includes(contactId);
      const updated = alreadySelected
        ? prev.selectedContacts.filter(id => id !== contactId)
        : [...prev.selectedContacts, contactId];
      return { ...prev, selectedContacts: updated };
    });
  };

  const handleWhenToSendChange = (value) => {
    setEmailForm(prev => ({
      ...prev,
      sendNow: value === 'send_now',
      scheduledAt: value === 'send_now' ? '' : prev.scheduledAt
    }));
  };

  const handleScheduleChange = (value) => {
    setEmailForm(prev => ({ ...prev, scheduledAt: value }));
  };

  const getRecipientsForTag = (tag) => {
    if (!tag) return [];
    return contacts
      .filter(contact => contact.email && (
        contact.stage === tag ||
        (Array.isArray(contact.tags) && contact.tags.includes(tag))
      ))
      .map(contact => contact.id);
  };

  const createEmailCampaignIfConfigured = async (campaignId) => {
    if (!emailForm.templateId) return;

    const template = emailTemplates.find(t => t.id === emailForm.templateId);
    if (!template) return;

    let recipients = [];
    let targetStage = null;

    if (emailForm.sendTo === 'tag') {
      if (!emailForm.selectedTag) return;
      recipients = getRecipientsForTag(emailForm.selectedTag);
      const stageSet = new Set(contacts.map(contact => contact.stage).filter(Boolean));
      if (stageSet.has(emailForm.selectedTag)) {
        targetStage = emailForm.selectedTag;
      }
    } else if (emailForm.sendTo === 'individual') {
      recipients = emailForm.selectedContacts.filter(Boolean);
    }

    if (!recipients.length) return;

    const scheduledDate = emailForm.sendNow
      ? new Date()
      : emailForm.scheduledAt
        ? new Date(emailForm.scheduledAt)
        : null;

    if (!scheduledDate || Number.isNaN(scheduledDate.getTime())) return;

    const emailSubject = emailForm.subject || template.subject;
    const emailBodyHtml = emailForm.body_html || template.body_html;
    const emailBodyText = emailForm.body_text || template.body_text || emailBodyHtml;

    const payload = {
      user_id: userId,
      campaign_id: campaignId,
      template_id: template.id,
      name: `${formData.name || 'Campaign'} - ${template.name}`,
      subject: emailSubject,
      body_html: emailBodyHtml,
      body_text: emailBodyText,
      target_contacts: recipients,
      target_stage: targetStage,
      send_type: emailForm.sendNow ? 'immediate' : 'scheduled',
      scheduled_at: scheduledDate.toISOString(),
      status: 'scheduled',
      total_recipients: recipients.length
    };

    const { error } = await emailCampaigns.create(payload);
    if (error) {
      console.error('Failed to create email campaign', error);
    }
  };

  const routeStepContent = (
    <div className="form-section">
      <div className="route-grid">
        <div className="form-group">
          <label>Select Route *</label>
          <select
            value={formData.saved_route_id || ''}
            onChange={(e) => setFormData({ ...formData, saved_route_id: e.target.value })}
            required
          >
            <option value="">Choose a saved route...</option>
            {savedRoutes.filter(r => !r.is_locked).map(route => (
              <option key={route.id} value={route.id}>
                {route.name} ({route.total_households || 0} households)
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Design Template *</label>
          <select
            value={formData.design_id || ''}
            onChange={(e) => setFormData({ ...formData, design_id: e.target.value })}
            required
          >
            <option value="">Choose a design...</option>
            {designs.filter(d => !d.is_locked).map(design => (
              <option key={design.id} value={design.id}>
                {design.name} ({design.card_size}, {design.num_slots} slots)
              </option>
            ))}
          </select>
        </div>
      </div>

      {(selectedRoute || selectedDesign) && (
        <div className="route-preview-grid">
          {selectedRoute && (
            <div className="route-preview">
              <strong>{selectedRoute.routes?.length || 0} routes</strong> •
              <strong> {selectedRoute.total_households || 0} households</strong> •
              <strong> ${selectedRoute.total_cost || 0}</strong>
            </div>
          )}
          {selectedDesign && (
            <div className="design-preview">
              <strong>{selectedDesign.name}</strong> • 
              <strong>{selectedDesign.card_size}</strong> • 
              <strong>{selectedDesign.num_slots} slots</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const pricingStepContent = (
    <div className="form-section pricing-panel">
      <div className="pricing-panel__header">
        <div>
          <h3>Slot Pricing</h3>
          <p className="form-hint">Set the price for each slot size so clients know what to expect.</p>
        </div>
        <p className="pricing-panel__tip">Adjusting these values updates campaign totals immediately.</p>
      </div>

      <div className="pricing-grid pricing-grid--auto">
        {slotRateFields.map(field => (
          <div key={field.key} className="pricing-card">
            <div>
              <span className="pricing-card__title">{field.title}</span>
              <p className="pricing-card__subtitle">{field.subtitle}</p>
            </div>
            <div className="price-input">
              <span>$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData[field.key] || 0}
                onChange={(e) => updatePrice(field.key, e.target.value)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const contactsStepContent = (
    <div className="form-section">
      <div className="email-outreach">
        <div className="email-outreach__header">
          <h4>Contacts</h4>
          <p>Pick the people you want to loop into the campaign and control whether the message goes to tags or individuals.</p>
        </div>

        <div className="form-group">
          <label>Send To</label>
          <div className="email-radio-group">
            <label>
              <input
                type="radio"
                name="emailSendTo"
                value="tag"
                checked={emailForm.sendTo === 'tag'}
                onChange={(e) => handleEmailSendToChange(e.target.value)}
              />
              <span>All contacts with tag</span>
            </label>
            <label>
              <input
                type="radio"
                name="emailSendTo"
                value="individual"
                checked={emailForm.sendTo === 'individual'}
                onChange={(e) => handleEmailSendToChange(e.target.value)}
              />
              <span>Select individual contacts</span>
            </label>
          </div>
        </div>

        {emailForm.sendTo === 'tag' && (
          <div className="form-group">
            <label>Select Tag</label>
            {availableTags.length ? (
              <select
                value={emailForm.selectedTag}
                onChange={(e) => setEmailForm(prev => ({ ...prev, selectedTag: e.target.value }))}
              >
                <option value="">Choose a tag...</option>
                {availableTags.map(tag => (
                  <option key={tag} value={tag}>
                    {formatTagLabel(tag)}
                  </option>
                ))}
              </select>
            ) : (
              <p className="form-hint">Add tags or pipeline stages to contacts to unlock this filter.</p>
            )}
          </div>
        )}

        {emailForm.sendTo === 'individual' && (
          <div className="form-group">
            <label>Select Contacts</label>
            <div className="email-contact-list">
              {selectableContacts.length ? (
                selectableContacts.map(contact => (
                  <label key={contact.id} className="email-contact-item">
                    <input
                      type="checkbox"
                      value={contact.id}
                      checked={emailForm.selectedContacts.includes(contact.id)}
                      onChange={() => toggleEmailContact(contact.id)}
                    />
                    <div>
                      <strong>{contact.business_name}</strong>
                      <span>{contact.email}</span>
                    </div>
                  </label>
                ))
              ) : (
                <p className="form-hint">Add contacts with valid email addresses to invite them.</p>
              )}
            </div>
            {emailForm.selectedContacts.length > 0 && (
              <p className="form-hint">
                {emailForm.selectedContacts.length} contact{emailForm.selectedContacts.length === 1 ? '' : 's'} selected
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const emailStepContent = (
    <div className="form-section">
      <div className="email-outreach">
        <div className="email-outreach__header">
          <h4>Email Outreach</h4>
          <p>Pick a template and tweak the copy for this campaign—template updates only happen on the Email Marketing page.</p>
        </div>

        <div className="form-group">
          <label>Select Template</label>
          <select
            value={emailForm.templateId}
            onChange={(e) => handleTemplateChange(e.target.value)}
          >
            <option value="">Choose a template...</option>
            {emailTemplates.map(template => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
          {!emailTemplates.length && (
            <p className="form-hint">Create email templates on the Email Marketing page to get started.</p>
          )}
        </div>

        {emailForm.templateId && (
          <>
            <div className="form-group">
              <label>Email Subject</label>
              <input
                type="text"
                value={emailForm.subject}
                onChange={(e) => setEmailForm(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Email subject..."
              />
            </div>
            <div className="form-group">
              <label>Email Body</label>
              <textarea
                rows={6}
                value={emailForm.body_html}
                onChange={(e) => setEmailForm(prev => ({ ...prev, body_html: e.target.value }))}
                placeholder="Customize the email copy for this campaign."
              />
              <p className="form-hint">
                Changes here only apply to this campaign; edit the template itself via Email Marketing.
              </p>
            </div>
          </>
        )}

        <div className="form-group">
          <label>When to Send</label>
          <div className="email-radio-group">
            <label>
              <input
                type="radio"
                name="emailWhen"
                value="send_now"
                checked={emailForm.sendNow}
                onChange={(e) => handleWhenToSendChange(e.target.value)}
              />
              <span>Send now</span>
            </label>
            <label>
              <input
                type="radio"
                name="emailWhen"
                value="schedule"
                checked={!emailForm.sendNow}
                onChange={(e) => handleWhenToSendChange(e.target.value)}
              />
              <span>Schedule for later</span>
            </label>
          </div>
        </div>

        {!emailForm.sendNow && (
          <div className="form-group">
            <label>Schedule date and time</label>
            <input
              type="datetime-local"
              min={scheduleMinValue}
              value={emailForm.scheduledAt}
              onChange={(e) => handleScheduleChange(e.target.value)}
            />
            {!emailForm.scheduledAt && (
              <p className="form-hint">Select when you want the email to go out.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );


  const previewLayout = mockDisplayCounts || cloneLayout(designLayout);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content campaign-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{campaign ? 'Edit Campaign' : 'New Campaign'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="campaign-modal__body">
          <div className="campaign-modal__grid">
            <div className="campaign-modal__column">
              <section className="campaign-modal__section">
                <div className="section-heading">
                  <div>
                    <h3>Campaign Details</h3>
                    <p>Update the basics, pricing, and mail timing.</p>
                  </div>
                </div>
                <div className="campaign-modal__form-grid">
                  <div className="form-group">
                    <label>Campaign Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Minneapolis Q1 2024"
                    />
                  </div>
                  <div className="form-group">
                    <label>Mail Date</label>
                    <input
                      type="date"
                      value={formData.mail_date || ''}
                      onChange={(e) => setFormData({ ...formData, mail_date: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.unique_niche_per_slot}
                        onChange={(e) => setFormData({ ...formData, unique_niche_per_slot: e.target.checked })}
                      />
                      <span className="checkbox-label">Enforce unique niche per slot</span>
                    </label>
                    <p className="form-hint">
                      When enabled, only one business per category appears on this card.
                    </p>
                  </div>
                  <div className="form-group">
                    <label>Notes</label>
                    <textarea
                      value={formData.notes || ''}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      placeholder="Campaign notes..."
                    />
                  </div>
                </div>
              </section>

              <section className="campaign-modal__section">
                <div className="section-heading">
                  <div>
                    <h3>Route & Design</h3>
                    <p>Select the saved route and design template for this postcard.</p>
                  </div>
                </div>
                {routeStepContent}
              </section>

              <section className="campaign-modal__section">
                {pricingStepContent}
              </section>

              <section className="campaign-modal__section">
                <div className="section-heading">
                  <div>
                    <h3>Email Outreach</h3>
                    <p>Choose audiences, templates, and send timing.</p>
                  </div>
                </div>
                {contactsStepContent}
                {emailStepContent}
              </section>
            </div>

            <div className="campaign-modal__column">
              <section className="campaign-modal__section">
                <div className="section-heading">
                  <div>
                    <h3>Advertiser Roster</h3>
                    <p>Only the number of advertisers that match your slots.</p>
                  </div>
                </div>
                <AdvertiserRoster
                  slots={slots}
                  campaign={campaign || formData}
                  slotDiscounts={slotDiscounts}
                  onDiscountChange={handleDiscountChange}
                />
              </section>

              <section className="campaign-modal__section">
                <div className="section-heading">
                  <div>
                    <h3>Mock Display</h3>
                    <p>Preview the front and back mock spots that were configured in Design Studio.</p>
                  </div>
                </div>
                <MockDisplay
                  counts={previewLayout}
                  caps={designLayout}
                  onAdjust={handleAdjustMockSpot}
                />
              </section>
            </div>
          </div>

          {campaign?.id && (
            <div className="campaign-modal__section slot-assignment-block">
              <h4>Slot Assignment</h4>
              <SlotAssignment
                slots={slots}
                contacts={contacts}
                niches={niches}
                uniqueNichePerSlot={formData.unique_niche_per_slot}
                onUpdate={loadSlots}
              />
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            className="btn-secondary"
            onClick={handleSaveDraft}
            disabled={savingDraft || !formData.name?.trim()}
          >
            {savingDraft ? 'Saving draft...' : 'Save draft'}
          </button>
          <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Saving...' : campaign ? 'Save Changes' : 'Create Campaign'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Slot Assignment Component
function SlotAssignment({ slots, contacts, niches, uniqueNichePerSlot, onUpdate }) {
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);
  const [contactAds, setContactAds] = useState([]);
  const [selectedAd, setSelectedAd] = useState(null);

  const usedNiches = uniqueNichePerSlot
    ? new Set(slots.filter(s => s.contact_id).map(s => contacts.find(c => c.id === s.contact_id)?.niche_id).filter(Boolean))
    : new Set();

  const handleSlotClick = (slot) => {
    if (slot.status === 'available' || slot.status === 'reserved') {
      setSelectedSlot(slot);
      setSelectedContact(null);
      setContactAds([]);
      setSelectedAd(null);
    }
  };

  const handleContactSelect = async (contact) => {
    setSelectedContact(contact);
    const { data } = await clientAds.getByContact(contact.id);
    setContactAds(data?.filter(ad => ad.approval_status === 'approved') || []);
    setSelectedAd(null);
  };

  const handleAssign = async () => {
    if (!selectedSlot || !selectedContact || !selectedAd) return;

    const { error } = await adSlotsAPI.assignClient(selectedSlot.id, selectedContact.id, selectedAd.id);
    if (!error) {
      onUpdate();
      setSelectedSlot(null);
      setSelectedContact(null);
      setContactAds([]);
      setSelectedAd(null);
    } else {
      alert('Failed to assign slot');
    }
  };

  const availableContacts = uniqueNichePerSlot
    ? contacts.filter(c => !usedNiches.has(c.niche_id))
    : contacts;

  return (
    <div className="slot-assignment">
      <div className="slots-grid">
        {slots.map(slot => (
          <div
            key={slot.id}
            className={`slot-item ${slot.status} ${selectedSlot?.id === slot.id ? 'selected' : ''}`}
            onClick={() => handleSlotClick(slot)}
          >
            <div className="slot-position">{slot.slot_position}</div>
            <div className="slot-size">{slot.slot_size}</div>
            {slot.contact && (
              <div className="slot-contact">{slot.contact.business_name}</div>
            )}
          </div>
        ))}
      </div>

      {selectedSlot && (
        <div className="assignment-panel">
          <h4>Assign Slot {selectedSlot.slot_position}</h4>
          
          <div className="form-group">
            <label>Select Client</label>
            <select
              value={selectedContact?.id || ''}
              onChange={(e) => {
                const contact = contacts.find(c => c.id === e.target.value);
                handleContactSelect(contact);
              }}
            >
              <option value="">Choose a client...</option>
              {availableContacts.map(contact => (
                <option key={contact.id} value={contact.id}>
                  {contact.business_name} {contact.niche?.name ? `(${contact.niche.name})` : ''}
                </option>
              ))}
            </select>
          </div>

          {contactAds.length > 0 && (
            <div className="form-group">
              <label>Select Ad</label>
              <div className="ads-selection">
                {contactAds.map(ad => (
                  <div
                    key={ad.id}
                    className={`ad-option ${selectedAd?.id === ad.id ? 'selected' : ''}`}
                    onClick={() => setSelectedAd(ad)}
                  >
                    <img src={ad.image_url} alt={ad.name} />
                    <div className="ad-name">{ad.name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            className="btn-primary"
            onClick={handleAssign}
            disabled={!selectedContact || !selectedAd}
          >
            Assign to Slot
          </button>
        </div>
      )}
    </div>
  );
}

export default Campaigns;

