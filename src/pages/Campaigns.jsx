import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, CheckCircle, Play, Pause } from 'lucide-react';
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

const CAMPAIGN_STATUSES = [
  { value: 'draft', label: 'Draft', color: '#64748b' },
  { value: 'active', label: 'Active', color: '#3b82f6' },
  { value: 'in_production', label: 'In Production', color: '#f59e0b' },
  { value: 'printed', label: 'Printed', color: '#8b5cf6' },
  { value: 'mailed', label: 'Mailed', color: '#10b981' },
  { value: 'completed', label: 'Completed', color: '#22c55e' },
  { value: 'cancelled', label: 'Cancelled', color: '#ef4444' }
];

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

// Campaign Card Component
function CampaignCard({ campaign, onEdit, onDelete, onComplete }) {
  const status = CAMPAIGN_STATUSES.find(s => s.value === campaign.status);

  return (
    <div className="campaign-card">
      <div className="campaign-header">
        <div>
          <h3 className="campaign-name">{campaign.name}</h3>
          <div className="campaign-meta">
            {campaign.city?.name || 'No city'} • {campaign.total_pieces || 0} pieces
            {campaign.mail_date && ` • Mail: ${new Date(campaign.mail_date).toLocaleDateString()}`}
          </div>
        </div>
        <div className="campaign-header-actions">
        <div
          className="campaign-status"
          style={{ background: status?.color + '20', color: status?.color }}
        >
          {status?.label}
          </div>
          <div className="header-action-buttons">
            <button
              className="header-action-btn"
              onClick={() => onEdit(campaign)}
              disabled={campaign.status === 'completed'}
              aria-label="Edit campaign"
            >
              <Edit size={16} />
            </button>
            {campaign.status !== 'completed' && (
              <button
                className="header-action-btn header-action-btn--success"
                onClick={() => onComplete(campaign.id)}
                aria-label="Mark campaign complete"
              >
                <CheckCircle size={16} />
              </button>
            )}
            <button
              className="header-action-btn header-action-btn--danger"
              onClick={() => onDelete(campaign.id)}
              disabled={campaign.status === 'completed'}
              aria-label="Delete campaign"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="campaign-pricing">
        <div className="price-item">
          <span className="price-label">Small:</span>
          <span className="price-value">${campaign.price_small || 0}</span>
        </div>
        <div className="price-item">
          <span className="price-label">Medium:</span>
          <span className="price-value">${campaign.price_medium || 0}</span>
        </div>
        <div className="price-item">
          <span className="price-label">Large:</span>
          <span className="price-value">${campaign.price_large || 0}</span>
        </div>
      </div>
    </div>
  );
}

// Campaign Modal Component
function CampaignModal({ campaign, userId, onClose, onSave }) {
  const [step, setStep] = useState(1);
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
    scheduledAt: ''
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
    if (!designsRes.error) setDesigns(designsRes.data || []);
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

  const handleSubmit = async () => {
    setLoading(true);

    try {
      if (campaign?.id) {
        // Update existing
        const { error } = await campaignsAPI.update(campaign.id, formData);
        if (error) throw error;
      } else {
        // Create new with snapshots
        const campaignData = {
          ...formData,
          user_id: userId,
          route_snapshot: selectedRoute?.routes || [],
          design_snapshot: selectedDesign || {},
          total_pieces: selectedRoute?.total_households || 0,
          status: 'draft'
        };

        const { data: newCampaign, error } = await campaignsAPI.create(campaignData);
        if (error) throw error;

        // Create ad slots based on design
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

        // Lock the saved route
        if (formData.saved_route_id) {
          await savedRoutesAPI.lock(formData.saved_route_id);
        }

        // Create linked email campaign when configured
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

    const payload = {
      user_id: userId,
      campaign_id: campaignId,
      template_id: template.id,
      name: `${formData.name || 'Campaign'} - ${template.name}`,
      subject: template.subject,
      body_html: template.body_html,
      body_text: template.body_text || template.body_html,
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content campaign-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{campaign ? 'Edit Campaign' : 'New Campaign'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {!campaign && (
          <div className="modal-steps">
            <div className={`step ${step >= 1 ? 'active' : ''}`}>1. Basic Info</div>
            <div className={`step ${step >= 2 ? 'active' : ''}`}>2. Route & Design</div>
            <div className={`step ${step >= 3 ? 'active' : ''}`}>3. Pricing</div>
            {campaign?.id && <div className={`step ${step >= 4 ? 'active' : ''}`}>4. Assign Slots</div>}
          </div>
        )}

        <div className="modal-body">
          {step === 1 && (
            <div className="form-section">
              <div className="form-group">
                <label>Campaign Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Minneapolis Q1 2024"
                  required
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
                  <span style={{ marginLeft: '8px' }}>Enforce unique niche per slot</span>
                </label>
                <p className="form-hint">
                  When enabled, only one business per category can appear on this card
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
          )}

          {step === 2 && (
            <div className="form-section">
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
                {selectedRoute && (
                  <div className="route-preview">
                    <strong>{selectedRoute.routes?.length || 0} routes</strong> • 
                    <strong> {selectedRoute.total_households || 0} households</strong> • 
                    <strong> ${selectedRoute.total_cost || 0}</strong>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Select Design *</label>
                <select
                  value={formData.design_id || ''}
                  onChange={(e) => setFormData({ ...formData, design_id: e.target.value })}
                  required
                >
                  <option value="">Choose a design template...</option>
                  {designs.filter(d => !d.is_locked).map(design => (
                    <option key={design.id} value={design.id}>
                      {design.name} ({design.card_size}, {design.num_slots} slots)
                    </option>
                  ))}
                </select>
                {selectedDesign && (
                  <div className="design-preview">
                    <strong>{selectedDesign.num_slots} ad slots</strong> • 
                    <strong> {selectedDesign.card_size}</strong>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="form-section">
              <h3>Slot Pricing</h3>
              <p className="form-hint">Set the price for each ad slot size</p>

              <div className="pricing-grid">
                <div className="form-group">
                  <label>Small Slot Price</label>
                  <div className="price-input">
                    <span>$</span>
                    <input
                      type="number"
                      value={formData.price_small || 0}
                      onChange={(e) => setFormData({ ...formData, price_small: parseFloat(e.target.value) })}
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Medium Slot Price</label>
                  <div className="price-input">
                    <span>$</span>
                    <input
                      type="number"
                      value={formData.price_medium || 0}
                      onChange={(e) => setFormData({ ...formData, price_medium: parseFloat(e.target.value) })}
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Large Slot Price</label>
                  <div className="price-input">
                    <span>$</span>
                    <input
                      type="number"
                      value={formData.price_large || 0}
                      onChange={(e) => setFormData({ ...formData, price_large: parseFloat(e.target.value) })}
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              </div>

              {!campaign && (
                <div className="email-outreach">
                  <div className="email-outreach__header">
                    <h4>Email Outreach</h4>
                    <p>Choose a saved template and the people you want to notify about this campaign.</p>
                  </div>

                  <div className="form-group">
                    <label>Select Template</label>
                    <select
                      value={emailForm.templateId}
                      onChange={(e) => setEmailForm(prev => ({ ...prev, templateId: e.target.value }))}
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
              )}
            </div>
          )}

          {step === 4 && campaign?.id && (
            <SlotAssignment
              slots={slots}
              contacts={contacts}
              niches={niches}
              uniqueNichePerSlot={formData.unique_niche_per_slot}
              onUpdate={loadSlots}
            />
          )}
        </div>

        <div className="modal-footer">
          {step > 1 && (
            <button className="btn-secondary" onClick={() => setStep(step - 1)}>
              Back
            </button>
          )}
          <button
            className="btn-secondary"
            onClick={handleSaveDraft}
            disabled={savingDraft || !formData.name?.trim()}
          >
            {savingDraft ? 'Saving draft...' : 'Save draft'}
          </button>
          {step < 3 ? (
            <button
              className="btn-primary"
              onClick={() => setStep(step + 1)}
              disabled={
                (step === 1 && !formData.name) ||
                (step === 2 && (!formData.saved_route_id || !formData.design_id))
              }
            >
              Next
            </button>
          ) : (
            <button
              className="btn-primary"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? 'Saving...' : campaign ? 'Save Changes' : 'Create Campaign'}
            </button>
          )}
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

