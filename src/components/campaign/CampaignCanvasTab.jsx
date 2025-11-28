import React, { useState, useEffect } from 'react';
import { Upload, DollarSign, User, Image as ImageIcon, CheckCircle, RotateCw, Plus } from 'lucide-react';
import { adSlots as adSlotsAPI, contacts as contactsAPI, clientAds, designs as designsAPI } from '../../lib/api';
import { storage } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import ImageUploader from '../ImageUploader';
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
  const [orientation, setOrientation] = useState(() => {
    // Load orientation from localStorage, default to 'portrait'
    return localStorage.getItem('canvasOrientation') || 'portrait';
  });

  // Debug: Log campaign data
  console.log('CampaignCanvasTab mounted with campaign:', {
    id: campaign.id,
    name: campaign.name,
    front_design_id: campaign.front_design_id,
    back_design_id: campaign.back_design_id,
    design_id: campaign.design_id,
    prices: {
      slot_1_price: campaign.slot_1_price,
      slot_2_price: campaign.slot_2_price,
      slot_4_price: campaign.slot_4_price,
      slot_8_price: campaign.slot_8_price,
      slot_12_price: campaign.slot_12_price,
      slot_16_price: campaign.slot_16_price
    },
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

  // Save orientation preference to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('canvasOrientation', orientation);
  }, [orientation]);

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
      // Check if campaign has design_snapshot (captured at campaign creation)
      const designSnapshot = campaign.design_snapshot;
      
      // Use snapshot if available, otherwise load from database
      if (designSnapshot?.front) {
        console.log('Using front design from snapshot:', designSnapshot.front);
        setFrontDesign(designSnapshot.front);
      } else {
        // Try front_design_id first, then fall back to design_id for older campaigns
        const frontDesignId = campaign.front_design_id || campaign.design_id;
        if (frontDesignId) {
          console.log('Loading front design from DB:', frontDesignId);
          const { data: frontData, error: frontError } = await designsAPI.getById(frontDesignId);
          if (frontData) {
            console.log('Front design loaded:', frontData);
            setFrontDesign(frontData);
          } else {
            console.error('Error loading front design:', frontError);
          }
        }
      }
      
      // Load back design
      if (designSnapshot?.back) {
        console.log('Using back design from snapshot:', designSnapshot.back);
        setBackDesign(designSnapshot.back);
      } else {
        const backDesignId = campaign.back_design_id || campaign.design_id;
        if (backDesignId && (campaign.back_design_id || !campaign.front_design_id)) {
          console.log('Loading back design from DB:', backDesignId);
          const { data: backData, error: backError } = await designsAPI.getById(backDesignId);
          if (backData) {
            console.log('Back design loaded:', backData);
            setBackDesign(backData);
          } else {
            console.error('Error loading back design:', backError);
          }
        } else if (!campaign.back_design_id && campaign.design_id && !designSnapshot) {
          // For older campaigns that only have design_id, use the same design for both sides
          console.log('Using same design for back as front (legacy campaign)');
          const { data: backData } = await designsAPI.getById(campaign.design_id);
          if (backData) setBackDesign(backData);
        }
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

  // Group slots by side (front/back) and sort by position
  const frontSlots = slots
    .filter(slot => slot.slot_position?.startsWith('Front'))
    .sort((a, b) => {
      const aNum = parseInt(a.slot_position?.split('-')[1] || '0');
      const bNum = parseInt(b.slot_position?.split('-')[1] || '0');
      return aNum - bNum;
    });
  const backSlots = slots
    .filter(slot => slot.slot_position?.startsWith('Back'))
    .sort((a, b) => {
      const aNum = parseInt(a.slot_position?.split('-')[1] || '0');
      const bNum = parseInt(b.slot_position?.split('-')[1] || '0');
      return aNum - bNum;
    });

  // Calculate progress
  const totalSlots = slots.length;
  const bookedSlots = slots.filter(slot => slot.contact_id || slot.client_ad).length;
  const fillPercentage = totalSlots > 0 ? ((bookedSlots / totalSlots) * 100).toFixed(1) : 0;

  const getSlotBasePrice = (slot) => {
    // Map slot_size to the appropriate slot price field
    const sizeOriginal = slot.slot_size;
    const size = slot.slot_size?.toString().toLowerCase();
    
    console.log('🎯 Getting price for slot:', {
      position: slot.slot_position,
      slot_size_original: sizeOriginal,
      slot_size_lowercase: size,
      slot_size_type: typeof sizeOriginal
    });
    
    console.log('💰 Available campaign prices:', {
      slot_1: campaign.slot_1_price,
      slot_2: campaign.slot_2_price,
      slot_4: campaign.slot_4_price,
      slot_8: campaign.slot_8_price,
      slot_12: campaign.slot_12_price,
      slot_16: campaign.slot_16_price,
      price_small: campaign.price_small,
      price_medium: campaign.price_medium,
      price_large: campaign.price_large
    });
    
    // Try to extract slot count from slot_size (e.g., "1", "2", "4", "8", "12", "16")
    // or map from old size names (small, medium, large) to slot counts
    let slotCount = null;
    
    if (!isNaN(size)) {
      // If slot_size is already a number string, use it directly
      slotCount = parseInt(size);
      console.log(`✅ Slot size is numeric: ${slotCount}`);
    } else {
      // Map old size names to default slot counts (fallback)
      if (size === 'small') slotCount = 1;
      else if (size === 'medium') slotCount = 2;
      else if (size === 'large') slotCount = 4;
      console.log(`✅ Mapped size "${size}" to slot count: ${slotCount}`);
    }
    
    let finalPrice = 0;
    
    // Get price based on slot count
    if (slotCount === 1) finalPrice = Number(campaign.slot_1_price) || 0;
    else if (slotCount === 2) finalPrice = Number(campaign.slot_2_price) || 0;
    else if (slotCount === 4) finalPrice = Number(campaign.slot_4_price) || 0;
    else if (slotCount === 8) finalPrice = Number(campaign.slot_8_price) || 0;
    else if (slotCount === 12) finalPrice = Number(campaign.slot_12_price) || 0;
    else if (slotCount === 16) finalPrice = Number(campaign.slot_16_price) || 0;
    
    // Fallback to old pricing if slot count pricing didn't work
    if (finalPrice === 0) {
      if (size === 'small') finalPrice = Number(campaign.price_small) || 0;
      else if (size === 'medium') finalPrice = Number(campaign.price_medium) || 0;
      else if (size === 'large') finalPrice = Number(campaign.price_large) || 0;
      console.log(`⚠️ Used fallback pricing for size "${size}": $${finalPrice}`);
    }
    
    console.log(`💵 Final price for ${slot.slot_position}: $${finalPrice}`);
    
    return finalPrice;
  };

  const getSlotFinalPrice = (slot) => {
    return slot.custom_price || getSlotBasePrice(slot);
  };

  const getSlotColor = (slot) => {
    const size = slot.slot_size?.toLowerCase();
    
    // Try to extract slot count
    let slotCount = null;
    if (!isNaN(size)) {
      slotCount = parseInt(size);
    } else {
      // Map old size names to slot counts
      if (size === 'small') slotCount = 1;
      else if (size === 'medium') slotCount = 2;
      else if (size === 'large') slotCount = 4;
    }
    
    // Return colors based on slot count (matching CampaignConfigTab adSlotOptions colors)
    if (slotCount === 1) return '#dbeafe';  // 1 Slot - blue
    if (slotCount === 2) return '#dcfce7';  // 2 Slots - green
    if (slotCount === 4) return '#fef9c3';  // 4 Slots - yellow
    if (slotCount === 8) return '#fee2e2';  // 8 Slots - red
    if (slotCount === 12) return '#e0f2fe'; // 12 Slots - cyan
    if (slotCount === 16) return '#ede9fe'; // 16 Slots - purple
    
    return '#f3f4f6'; // Default gray
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
          {/* Controls Row - Side Toggle and Orientation Toggle */}
          {(frontDesign || backDesign) && (
            <div className="canvas-controls">
              {/* Side Toggle */}
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

              {/* Orientation Toggle */}
              <div className="canvas-orientation-toggle">
                <button
                  className={`orientation-toggle-btn ${orientation === 'portrait' ? 'active' : ''}`}
                  onClick={() => setOrientation('portrait')}
                  title="Portrait (3:4)"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="7" y="2" width="10" height="20" rx="2" ry="2"/>
                  </svg>
                  <span>Portrait</span>
                </button>
                <button
                  className={`orientation-toggle-btn ${orientation === 'landscape' ? 'active' : ''}`}
                  onClick={() => setOrientation('landscape')}
                  title="Landscape (4:3)"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="7" width="20" height="10" rx="2" ry="2"/>
                  </svg>
                  <span>Landscape</span>
                </button>
              </div>
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
                orientation={orientation}
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
const CanvasLayout = ({ design, slots, onSlotClick, getSlotColor, getSlotFinalPrice, orientation = 'portrait' }) => {
  const slotConfig = design.slot_config || [];
  
  // Determine side from first slot position (Front-X or Back-X)
  const side = slots.length > 0 && slots[0].slot_position?.startsWith('Back') ? 'back' : 'front';
  
  console.log('CanvasLayout rendering:', {
    designName: design.name,
    side: side,
    slotConfig: slotConfig,
    slots: slots,
    slotConfigLength: slotConfig.length,
    slotsLength: slots.length
  });
  
  // Map slot config to actual slot data by matching position
  const getSlotForConfig = (config, configIndex) => {
    // Safety check - ensure we have slots
    if (!slots || slots.length === 0) {
      return null;
    }
    
    // Try multiple matching strategies
    
    // Strategy 1: Match by x and y position
    let foundSlot = slots.find(slot => 
      slot.x_position === config.x && slot.y_position === config.y
    );
    
    // Strategy 2: Match by position field in config
    if (!foundSlot && config.position !== undefined) {
      foundSlot = slots.find(slot => {
        const slotNum = slot.slot_position?.split('-')[1];
        return slotNum && parseInt(slotNum) === config.position;
      });
    }
    
    // Strategy 3: Match by index (slots are created in same order as config)
    if (!foundSlot && configIndex < slots.length) {
      const potentialSlot = slots[configIndex];
      // Verify this slot hasn't been used already by checking dimensions
      if (potentialSlot && 
          potentialSlot.width === config.width && 
          potentialSlot.height === config.height) {
        foundSlot = potentialSlot;
      }
    }
    
    if (!foundSlot) {
      console.log('No slot found for config:', config, 'index:', configIndex, 'side:', side, 'Available slots:', slots.map(s => ({ 
        pos: s.slot_position, 
        x: s.x_position, 
        y: s.y_position,
        width: s.width,
        height: s.height
      })));
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
          <div 
            key={`canvas-${side}-${design.id}`}
            className={`canvas-grid-positioned canvas-grid-${orientation}`}
          >
            {slotConfig.map((config, idx) => {
              const slot = getSlotForConfig(config, idx);
              
              // Safety check: Skip rendering if slot is from wrong side
              if (slot && !slot.slot_position?.toLowerCase().includes(side)) {
                console.warn('Skipping slot from wrong side:', slot.slot_position, 'expected:', side);
                return null;
              }
              
              // Calculate position and size as percentages based on config
              const gapPercent = 0.5;
              const leftPercent = (config.x / 4) * 100 + gapPercent;
              const topPercent = (config.y / 8) * 100 + gapPercent;
              const widthPercent = (config.width / 4) * 100 - (gapPercent * 2);
              const heightPercent = (config.height / 8) * 100 - (gapPercent * 2);

              // Calculate the number of cells this slot occupies (width * height)
              const slotCellCount = config.width * config.height;
              // Display the slot size/type (1, 2, 4, 8, 12, 16)
              const slotNumber = slotCellCount;
              
              // Determine color based on slot size
              const getColorBySize = (cellCount) => {
                if (cellCount === 1) return '#dbeafe';
                if (cellCount === 2) return '#dcfce7';
                if (cellCount === 4) return '#fef9c3';
                if (cellCount === 8) return '#fee2e2';
                if (cellCount === 12) return '#e0f2fe';
                if (cellCount === 16) return '#ede9fe';
                return '#f3f4f6';
              };

              // If slot exists, use its data, otherwise create placeholder
              const isBooked = slot ? !!(slot.contact_id || slot.client_ad) : false;
              const backgroundColor = slot ? getSlotColor(slot) : getColorBySize(slotCellCount);
              const finalPrice = slot ? getSlotFinalPrice(slot) : 0;
              // Make key unique by including side and design ID to prevent conflicts when switching
              const slotId = slot?.id || `${side}-${design.id}-config-${idx}`;
              
              return (
                <div
                  key={slotId}
                  className={`canvas-slot-positioned ${isBooked ? 'booked' : 'available'}`}
                  style={{
                    position: 'absolute',
                    left: `${leftPercent}%`,
                    top: `${topPercent}%`,
                    width: `${widthPercent}%`,
                    height: `${heightPercent}%`,
                    backgroundColor: backgroundColor,
                  }}
                  onClick={() => slot && onSlotClick(slot)}
                >
                  {/* Slot Content */}
                  {slot?.client_ad?.image_url ? (
                    <div className="canvas-slot-image-wrapper">
                      <img
                        src={slot.client_ad.image_url}
                        alt={slot.client_ad.name || 'Ad'}
                        className="canvas-slot-image"
                      />
                    </div>
                  ) : (
                    <div className="canvas-slot-placeholder">
                      <span className="canvas-slot-label">{slotNumber}</span>
                    </div>
                  )}

                  {/* Booked Badge */}
                  {isBooked && (
                    <div className="canvas-slot-booked-badge">
                      <CheckCircle size={16} />
                    </div>
                  )}

                  {/* Slot Info Overlay - only show if slot exists */}
                  {slot && (
                    <div className="canvas-slot-info-overlay">
                      <div className="canvas-slot-info-top">
                        <span className="canvas-slot-position">{slot.slot_position}</span>
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
                  )}
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
  const [showAdUploader, setShowAdUploader] = useState(false);

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
    setShowAdUploader(false);
    if (contact) {
      await loadContactAds(contact.id);
    }
  };

  const handleAdUpload = async (file) => {
    if (!selectedContact?.id || !user?.id) return;

    // Upload to storage
    const { data: uploadData, error: uploadError } = await storage.uploadClientAd(
      user.id,
      file,
      selectedContact.id
    );

    if (uploadError) {
      throw new Error('Failed to upload image');
    }

    // Save to database
    const { data, error } = await clientAds.create({
      contact_id: selectedContact.id,
      user_id: user.id,
      name: file.name,
      image_url: uploadData.url,
      file_name: file.name,
      file_size: file.size,
      approval_status: 'approved'
    });

    if (!error && data) {
      // Add the new ad to the list and select it automatically
      setContactAds([data, ...contactAds]);
      setSelectedAd(data);
      setShowAdUploader(false);
    } else {
      throw new Error('Failed to save ad');
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <label style={{ margin: 0 }}>Select Ad Creative</label>
                <button
                  type="button"
                  onClick={() => setShowAdUploader(!showAdUploader)}
                  disabled={contactAds.length >= 8}
                  className="btn-primary"
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <Plus size={16} />
                  Upload New Ad
                </button>
              </div>

              {showAdUploader && (
                <div style={{ marginBottom: '1rem' }}>
                  <ImageUploader
                    onUpload={handleAdUpload}
                    label="Upload Client Ad"
                    maxSizeMB={10}
                  />
                </div>
              )}

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
              ) : !showAdUploader && (
                <div className="assign-no-ads">
                  No ads found for this advertiser. Upload one above.
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

