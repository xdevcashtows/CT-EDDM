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
  niches as nichesAPI
} from '../lib/api';
import { useAuth } from '../hooks/useAuth';

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

  if (loading) {
    return (
      <div className="campaigns-page">
        <div className="loading-state">
          <div className="spinner-large"></div>
          <p>Loading campaigns...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="campaigns-page">
      <div className="page-header">
        <div>
          <h1>Campaigns</h1>
          <p>Manage your EDDM campaigns</p>
        </div>
        <button className="btn-primary" onClick={handleCreateCampaign}>
          <Plus size={20} />
          New Campaign
        </button>
      </div>

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
        <div
          className="campaign-status"
          style={{ background: status?.color + '20', color: status?.color }}
        >
          {status?.label}
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

      <div className="campaign-actions">
        <button
          className="action-btn"
          onClick={() => onEdit(campaign)}
          disabled={campaign.status === 'completed'}
        >
          <Edit size={16} />
          Edit
        </button>
        {campaign.status !== 'completed' && (
          <button
            className="action-btn success"
            onClick={() => onComplete(campaign.id)}
          >
            <CheckCircle size={16} />
            Complete
          </button>
        )}
        <button
          className="action-btn danger"
          onClick={() => onDelete(campaign.id)}
          disabled={campaign.status === 'completed'}
        >
          <Trash2 size={16} />
          Delete
        </button>
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (campaign?.id) {
      loadSlots();
    }
  }, [campaign]);

  const loadData = async () => {
    const [routesRes, designsRes, contactsRes, nichesRes] = await Promise.all([
      savedRoutesAPI.getAll(userId),
      designsAPI.getAll(userId),
      contactsAPI.getAll(userId),
      nichesAPI.getAll()
    ]);

    if (!routesRes.error) setSavedRoutes(routesRes.data || []);
    if (!designsRes.error) setDesigns(designsRes.data || []);
    if (!contactsRes.error) setContacts(contactsRes.data || []);
    if (!nichesRes.error) setNiches(nichesRes.data || []);
  };

  const loadSlots = async () => {
    const { data, error } = await adSlotsAPI.getByCampaign(campaign.id);
    if (!error) setSlots(data || []);
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      if (campaign?.id) {
        // Update existing
        const { error } = await campaignsAPI.update(campaign.id, formData);
        if (error) throw error;
      } else {
        // Create new with snapshots
        const selectedRoute = savedRoutes.find(r => r.id === formData.saved_route_id);
        const selectedDesign = designs.find(d => d.id === formData.design_id);

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

  const selectedRoute = savedRoutes.find(r => r.id === formData.saved_route_id);
  const selectedDesign = designs.find(d => d.id === formData.design_id);

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
          {step > 1 && !campaign && (
            <button className="btn-secondary" onClick={() => setStep(step - 1)}>
              Back
            </button>
          )}
          {step < 3 && !campaign ? (
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

