import React, { useState, useEffect } from 'react';
import { Upload, DollarSign, User, Image as ImageIcon, CheckCircle } from 'lucide-react';
import { adSlots as adSlotsAPI, contacts as contactsAPI, clientAds, designs as designsAPI } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import './CampaignCanvasTab.css';

export const CampaignCanvasTab = ({ campaign, onUpdate }) => {
  const { user } = useAuth();
  const [slots, setSlots] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [frontDesign, setFrontDesign] = useState(null);
  const [backDesign, setBackDesign] = useState(null);
  const [activeSide, setActiveSide] = useState('front');

  // Debug: Log campaign data
  console.log('CampaignCanvasTab mounted with campaign:', {
    id: campaign.id,
    name: campaign.name,
    front_design_id: campaign.front_design_id,
    back_design_id: campaign.back_design_id,
    design_id: campaign.design_id,
    fullCampaign: campaign
  });

  useEffect(() => {
    if (campaign.id) {
      loadSlots();
      loadDesigns();
    }
    if (user?.id) {
      loadContacts();
    }
  }, [campaign.id, user?.id]);

  const loadSlots = async () => {
    setLoading(true);
    try {
      const { data, error } = await adSlotsAPI.getByCampaign(campaign.id);
      if (!error && data) {
        setSlots(data);
        console.log('Loaded slots:', data);
      } else {
        console.error('Error loading slots:', error);
      }
    } catch (err) {
      console.error('Exception loading slots:', err);
    }
    setLoading(false);
  };

  const loadContacts = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await contactsAPI.getAll(user.id);
      if (!error && data) {
        setContacts(data);
      }
    } catch (err) {
      console.error('Exception loading contacts:', err);
    }
  };

  const loadDesigns = async () => {
    try {
      // Try front_design_id first, then fall back to design_id for older campaigns
      const frontDesignId = campaign.front_design_id || campaign.design_id;
      const backDesignId = campaign.back_design_id || campaign.design_id;
      
      // Load front design
      if (frontDesignId) {
        console.log('Loading front design:', frontDesignId);
        const { data: frontData, error: frontError } = await designsAPI.getById(frontDesignId);
        if (frontData) {
          console.log('Front design loaded:', frontData);
          setFrontDesign(frontData);
        } else {
          console.error('Error loading front design:', frontError);
        }
      } else {
        console.log('No front_design_id or design_id on campaign');
      }
      
      // Load back design (if it's different from front, or if there's a specific back design)
      if (backDesignId && (campaign.back_design_id || !campaign.front_design_id)) {
        console.log('Loading back design:', backDesignId);
        const { data: backData, error: backError } = await designsAPI.getById(backDesignId);
        if (backData) {
          console.log('Back design loaded:', backData);
          setBackDesign(backData);
        } else {
          console.error('Error loading back design:', backError);
        }
      } else if (!campaign.back_design_id && campaign.design_id) {
        // For older campaigns that only have design_id, use the same design for both sides
        console.log('Using same design for back as front (legacy campaign)');
        if (frontDesignId === campaign.design_id) {
          // Re-use the front design data we already loaded
          const { data: backData } = await designsAPI.getById(campaign.design_id);
          if (backData) setBackDesign(backData);
        }
      } else {
        console.log('No back_design_id on campaign');
      }
    } catch (err) {
      console.error('Exception loading designs:', err);
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

  // Get current design and slots based on active side
  const currentDesign = activeSide === 'front' ? frontDesign : backDesign;
  const currentSlots = activeSide === 'front' ? frontSlots : backSlots;

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
        <div className="canvas-loading">Loading canvas...</div>
      ) : (
        <div className="canvas-content">
          {/* Side Toggle */}
          {(frontDesign || backDesign) && (
            <div className="canvas-side-toggle">
              <button
                className={`side-toggle-btn ${activeSide === 'front' ? 'active' : ''}`}
                onClick={() => setActiveSide('front')}
                disabled={!frontDesign}
              >
                Front {!frontDesign && '(N/A)'}
              </button>
              <button
                className={`side-toggle-btn ${activeSide === 'back' ? 'active' : ''}`}
                onClick={() => setActiveSide('back')}
                disabled={!backDesign}
              >
                Back {!backDesign && '(N/A)'}
              </button>
            </div>
          )}

          {/* Canvas Container */}
          {currentDesign ? (
            <div className="canvas-layout-container">
              <h3 className="canvas-layout-title">
                {currentDesign.name} - {activeSide === 'front' ? 'Front' : 'Back'} Side
              </h3>
              <CanvasLayout
                design={currentDesign}
                slots={currentSlots}
                onSlotClick={handleSlotClick}
                getSlotColor={getSlotColor}
                getSlotFinalPrice={getSlotFinalPrice}
              />
            </div>
          ) : (
            <div className="canvas-no-design">
              <p>
                {!frontDesign && !backDesign 
                  ? 'No template designs found for this campaign. Please ensure templates were selected during campaign creation.'
                  : `No template design available for the ${activeSide} side.`
                }
              </p>
              <div style={{ marginTop: '16px', fontSize: '14px', color: '#9ca3af' }}>
                <p>Campaign ID: {campaign.id}</p>
                <p>Front Design ID: {campaign.front_design_id || 'Not set'}</p>
                <p>Back Design ID: {campaign.back_design_id || 'Not set'}</p>
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

// Canvas Layout Component - Shows the visual layout of the template
const CanvasLayout = ({ design, slots, onSlotClick, getSlotColor, getSlotFinalPrice }) => {
  const slotConfig = design.slot_config || [];
  
  console.log('CanvasLayout rendering:', {
    designName: design.name,
    slotConfig: slotConfig,
    slots: slots,
    slotConfigLength: slotConfig.length,
    slotsLength: slots.length
  });
  
  // Map slot config to actual slot data by matching x and y positions
  const getSlotForConfig = (config) => {
    const foundSlot = slots.find(slot => 
      slot.x_position === config.x && slot.y_position === config.y
    );
    if (!foundSlot) {
      console.log('No slot found for config:', config, 'Available slots:', slots.map(s => ({ pos: s.slot_position, x: s.x_position, y: s.y_position })));
    }
    return foundSlot;
  };

  if (slotConfig.length === 0) {
    return (
      <div className="canvas-container">
        <div className="canvas-no-design">
          <p>This template has no slot configuration defined.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="canvas-container">
      <div className="canvas-sections">
        {/* Canvas section */}
        <div className="canvas-section">
          <div className="canvas-grid-positioned">
            {slotConfig.map((config, idx) => {
              const slot = getSlotForConfig(config);
              if (!slot) {
                console.warn(`Slot not found for config index ${idx}:`, config);
                return null;
              }

              const isBooked = !!(slot.contact_id || slot.client_ad);
              
              // Calculate position and size as percentages
              const gapPercent = 0.5;
              const leftPercent = (config.x / 4) * 100 + gapPercent;
              const topPercent = (config.y / 8) * 100 + gapPercent;
              const widthPercent = (config.width / 4) * 100 - (gapPercent * 2);
              const heightPercent = (config.height / 8) * 100 - (gapPercent * 2);

              const backgroundColor = getSlotColor(slot);
              const finalPrice = getSlotFinalPrice(slot);

              return (
                <div
                  key={slot.id}
                  className={`canvas-slot-positioned ${isBooked ? 'booked' : 'available'}`}
                  style={{
                    position: 'absolute',
                    left: `${leftPercent}%`,
                    top: `${topPercent}%`,
                    width: `${widthPercent}%`,
                    height: `${heightPercent}%`,
                    backgroundColor: backgroundColor,
                  }}
                  onClick={() => onSlotClick(slot)}
                >
                  {/* Slot Content */}
                  {slot.client_ad?.image_url ? (
                    <div className="canvas-slot-image-wrapper">
                      <img
                        src={slot.client_ad.image_url}
                        alt={slot.client_ad.name || 'Ad'}
                        className="canvas-slot-image"
                      />
                    </div>
                  ) : (
                    <div className="canvas-slot-placeholder">
                      <Upload size={24} />
                      <span className="canvas-slot-label">{slot.slot_position}</span>
                    </div>
                  )}

                  {/* Booked Badge */}
                  {isBooked && (
                    <div className="canvas-slot-booked-badge">
                      <CheckCircle size={16} />
                    </div>
                  )}

                  {/* Slot Info Overlay */}
                  <div className="canvas-slot-info-overlay">
                    <div className="canvas-slot-info-top">
                      <span className="canvas-slot-position">{slot.slot_position}</span>
                      <span className="canvas-slot-size">{slot.slot_size}</span>
                    </div>
                    <div className="canvas-slot-info-bottom">
                      {slot.contact?.business_name && (
                        <span className="canvas-slot-advertiser">
                          <User size={12} />
                          {slot.contact.business_name}
                        </span>
                      )}
                      <span className="canvas-slot-price">
                        <DollarSign size={12} />
                        {finalPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
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

