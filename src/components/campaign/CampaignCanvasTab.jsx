import React, { useState, useEffect } from 'react';
import { Upload, DollarSign, User, Image as ImageIcon, CheckCircle } from 'lucide-react';
import { adSlots as adSlotsAPI, contacts as contactsAPI, clientAds } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import './CampaignCanvasTab.css';

export const CampaignCanvasTab = ({ campaign, onUpdate }) => {
  const { user } = useAuth();
  const [slots, setSlots] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);

  useEffect(() => {
    loadSlots();
    loadContacts();
  }, [campaign.id]);

  const loadSlots = async () => {
    setLoading(true);
    const { data, error } = await adSlotsAPI.getByCampaign(campaign.id);
    if (!error && data) {
      setSlots(data);
    }
    setLoading(false);
  };

  const loadContacts = async () => {
    const { data, error } = await contactsAPI.getAll(user.id);
    if (!error && data) {
      setContacts(data);
    }
  };

  const handleSlotClick = (slot) => {
    setSelectedSlot(slot);
    setShowAssignModal(true);
  };

  const handlePriceUpdate = async (slotId, newPrice) => {
    const { error } = await adSlotsAPI.update(slotId, { custom_price: newPrice });
    if (!error) {
      loadSlots();
      if (onUpdate) onUpdate();
    }
  };

  // Group slots by side (front/back)
  const frontSlots = slots.filter(slot => slot.slot_position?.startsWith('Front'));
  const backSlots = slots.filter(slot => slot.slot_position?.startsWith('Back'));

  // Calculate progress
  const totalSlots = slots.length;
  const bookedSlots = slots.filter(slot => slot.contact_id || slot.client_ad).length;
  const fillPercentage = totalSlots > 0 ? ((bookedSlots / totalSlots) * 100).toFixed(1) : 0;

  const getSlotBasePrice = (slot) => {
    const size = slot.slot_size?.toLowerCase();
    if (size === 'small') return campaign.price_small || 0;
    if (size === 'medium') return campaign.price_medium || 0;
    if (size === 'large') return campaign.price_large || 0;
    return 0;
  };

  const getSlotFinalPrice = (slot) => {
    return slot.custom_price || getSlotBasePrice(slot);
  };

  const getSlotColor = (slot) => {
    const size = slot.slot_size?.toLowerCase();
    // Use colors from campaign creation or defaults
    if (size === 'small') return '#dbeafe';
    if (size === 'medium') return '#dcfce7';
    if (size === 'large') return '#fef9c3';
    return '#f3f4f6';
  };

  return (
    <div className="campaign-canvas-tab">
      {/* Progress Header */}
      <div className="canvas-progress-header">
        <div className="progress-stats">
          <div className="progress-stat">
            <span className="progress-stat-label">Total Slots</span>
            <span className="progress-stat-value">{totalSlots}</span>
          </div>
          <div className="progress-stat">
            <span className="progress-stat-label">Booked</span>
            <span className="progress-stat-value">{bookedSlots}</span>
          </div>
          <div className="progress-stat">
            <span className="progress-stat-label">Available</span>
            <span className="progress-stat-value">{totalSlots - bookedSlots}</span>
          </div>
        </div>
        <div className="progress-bar-container">
          <div className="progress-bar-label">
            <span>Fill Progress</span>
            <span className="progress-percentage">{fillPercentage}%</span>
          </div>
          <div className="progress-bar-track">
            <div
              className="progress-bar-fill"
              style={{ width: `${fillPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="canvas-loading">Loading slots...</div>
      ) : (
        <div className="canvas-content">
          {/* Front Side */}
          {frontSlots.length > 0 && (
            <div className="canvas-side">
              <h3 className="canvas-side-title">Front Side</h3>
              <div className="canvas-slots-grid">
                {frontSlots.map((slot) => (
                  <SlotCard
                    key={slot.id}
                    slot={slot}
                    color={getSlotColor(slot)}
                    basePrice={getSlotBasePrice(slot)}
                    finalPrice={getSlotFinalPrice(slot)}
                    onClick={() => handleSlotClick(slot)}
                    onPriceUpdate={(newPrice) => handlePriceUpdate(slot.id, newPrice)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Back Side */}
          {backSlots.length > 0 && (
            <div className="canvas-side">
              <h3 className="canvas-side-title">Back Side</h3>
              <div className="canvas-slots-grid">
                {backSlots.map((slot) => (
                  <SlotCard
                    key={slot.id}
                    slot={slot}
                    color={getSlotColor(slot)}
                    basePrice={getSlotBasePrice(slot)}
                    finalPrice={getSlotFinalPrice(slot)}
                    onClick={() => handleSlotClick(slot)}
                    onPriceUpdate={(newPrice) => handlePriceUpdate(slot.id, newPrice)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && selectedSlot && (
        <AssignSlotModal
          slot={selectedSlot}
          contacts={contacts}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedSlot(null);
          }}
          onAssign={() => {
            loadSlots();
            if (onUpdate) onUpdate();
            setShowAssignModal(false);
            setSelectedSlot(null);
          }}
        />
      )}
    </div>
  );
};

// Individual Slot Card Component
const SlotCard = ({ slot, color, basePrice, finalPrice, onClick, onPriceUpdate }) => {
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceValue, setPriceValue] = useState(finalPrice);
  const isBooked = !!(slot.contact_id || slot.client_ad);

  const handlePriceSave = () => {
    if (priceValue !== finalPrice) {
      onPriceUpdate(priceValue);
    }
    setEditingPrice(false);
  };

  return (
    <div
      className={`slot-card ${isBooked ? 'booked' : 'available'}`}
      style={{ backgroundColor: color }}
    >
      {/* Slot Header */}
      <div className="slot-card-header">
        <div className="slot-card-position">
          <span className="slot-position-label">{slot.slot_position}</span>
          <span className="slot-size-badge">{slot.slot_size}</span>
        </div>
        {isBooked && (
          <div className="slot-booked-badge">
            <CheckCircle size={16} />
          </div>
        )}
      </div>

      {/* Slot Content - Image or Upload Placeholder */}
      <div className="slot-card-content" onClick={onClick}>
        {slot.client_ad?.image_url ? (
          <div className="slot-image-container">
            <img
              src={slot.client_ad.image_url}
              alt={slot.client_ad.name || 'Ad'}
              className="slot-image"
            />
          </div>
        ) : (
          <div className="slot-upload-placeholder">
            <Upload size={32} />
            <span>Click to assign</span>
          </div>
        )}
      </div>

      {/* Slot Footer - Advertiser Info and Price */}
      <div className="slot-card-footer">
        <div className="slot-advertiser-info">
          {slot.contact ? (
            <>
              <User size={14} />
              <span className="slot-advertiser-name">{slot.contact.business_name}</span>
            </>
          ) : (
            <span className="slot-no-advertiser">No advertiser</span>
          )}
        </div>

        <div className="slot-price-section">
          {editingPrice ? (
            <div className="slot-price-edit">
              <input
                type="number"
                min="0"
                step="0.01"
                value={priceValue}
                onChange={(e) => setPriceValue(parseFloat(e.target.value) || 0)}
                onBlur={handlePriceSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handlePriceSave();
                  if (e.key === 'Escape') {
                    setPriceValue(finalPrice);
                    setEditingPrice(false);
                  }
                }}
                autoFocus
                className="slot-price-input"
              />
            </div>
          ) : (
            <div
              className="slot-price-display"
              onClick={(e) => {
                e.stopPropagation();
                setEditingPrice(true);
              }}
            >
              <DollarSign size={14} />
              <span className="slot-price-value">{finalPrice.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Assign Slot Modal Component
const AssignSlotModal = ({ slot, contacts, onClose, onAssign }) => {
  const { user } = useAuth();
  const [selectedContact, setSelectedContact] = useState(null);
  const [contactAds, setContactAds] = useState([]);
  const [selectedAd, setSelectedAd] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (slot.contact_id) {
      const contact = contacts.find(c => c.id === slot.contact_id);
      if (contact) {
        setSelectedContact(contact);
        loadContactAds(contact.id);
      }
    }
  }, [slot, contacts]);

  const loadContactAds = async (contactId) => {
    setLoading(true);
    const { data, error } = await clientAds.getByContact(contactId);
    if (!error && data) {
      setContactAds(data);
      // Pre-select current ad if exists
      if (slot.client_ad_id) {
        const currentAd = data.find(ad => ad.id === slot.client_ad_id);
        if (currentAd) setSelectedAd(currentAd);
      }
    }
    setLoading(false);
  };

  const handleContactChange = async (contactId) => {
    const contact = contacts.find(c => c.id === contactId);
    setSelectedContact(contact);
    setSelectedAd(null);
    setContactAds([]);
    if (contact) {
      await loadContactAds(contact.id);
    }
  };

  const handleAssign = async () => {
    if (!selectedContact || !selectedAd) {
      alert('Please select both a contact and an ad');
      return;
    }

    setLoading(true);
    const { error } = await adSlotsAPI.update(slot.id, {
      contact_id: selectedContact.id,
      client_ad_id: selectedAd.id,
      status: 'booked'
    });

    if (!error) {
      onAssign();
    } else {
      alert('Failed to assign slot');
    }
    setLoading(false);
  };

  const handleRemove = async () => {
    if (!confirm('Remove this advertiser from the slot?')) return;

    setLoading(true);
    const { error } = await adSlotsAPI.update(slot.id, {
      contact_id: null,
      client_ad_id: null,
      status: 'available'
    });

    if (!error) {
      onAssign();
    } else {
      alert('Failed to remove assignment');
    }
    setLoading(false);
  };

  return (
    <div className="assign-modal-backdrop" onClick={onClose}>
      <div className="assign-modal" onClick={(e) => e.stopPropagation()}>
        <div className="assign-modal-header">
          <h3>Assign Slot: {slot.slot_position}</h3>
          <button onClick={onClose} className="assign-modal-close">×</button>
        </div>

        <div className="assign-modal-content">
          {/* Contact Selection */}
          <div className="assign-form-group">
            <label>Select Advertiser</label>
            <select
              value={selectedContact?.id || ''}
              onChange={(e) => handleContactChange(e.target.value)}
              className="assign-select"
            >
              <option value="">Choose advertiser...</option>
              {contacts.map(contact => (
                <option key={contact.id} value={contact.id}>
                  {contact.business_name}
                </option>
              ))}
            </select>
          </div>

          {/* Ad Selection */}
          {selectedContact && (
            <div className="assign-form-group">
              <label>Select Ad Creative</label>
              {loading ? (
                <div className="assign-loading">Loading ads...</div>
              ) : contactAds.length > 0 ? (
                <div className="assign-ads-grid">
                  {contactAds.map(ad => (
                    <div
                      key={ad.id}
                      className={`assign-ad-card ${selectedAd?.id === ad.id ? 'selected' : ''}`}
                      onClick={() => setSelectedAd(ad)}
                    >
                      {ad.image_url ? (
                        <img src={ad.image_url} alt={ad.name} />
                      ) : (
                        <div className="assign-ad-placeholder">
                          <ImageIcon size={24} />
                        </div>
                      )}
                      <span className="assign-ad-name">{ad.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="assign-no-ads">
                  No ads found for this advertiser. Create ads on the Contacts page.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="assign-modal-footer">
          {slot.contact_id && (
            <button
              onClick={handleRemove}
              disabled={loading}
              className="btn-remove"
            >
              Remove Assignment
            </button>
          )}
          <div className="assign-modal-actions">
            <button onClick={onClose} className="btn-cancel">
              Cancel
            </button>
            <button
              onClick={handleAssign}
              disabled={!selectedContact || !selectedAd || loading}
              className="btn-assign"
            >
              {loading ? 'Assigning...' : 'Assign to Slot'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignCanvasTab;

