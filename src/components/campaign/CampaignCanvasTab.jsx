import React, { useState, useEffect, useRef } from 'react';
import { Upload, DollarSign, User, Image as ImageIcon, CheckCircle, RotateCw, Plus, Trash2, AlertTriangle, Search, X, Tag, FileText } from 'lucide-react';
import { adSlots as adSlotsAPI, contacts as contactsAPI, clientAds, designs as designsAPI, campaigns as campaignsAPI } from '../../lib/api';
import { storage } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import ImageUploader from '../ImageUploader';
import InvoiceModal from './InvoiceModal';
import './CampaignCanvasTab.css';

export const CampaignCanvasTab = ({ campaign, onUpdate }) => {
  const { user } = useAuth();
  const [slots, setSlots] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [campaignContacts, setCampaignContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [frontDesign, setFrontDesign] = useState(null);
  const [backDesign, setBackDesign] = useState(null);
  const [activeSide, setActiveSide] = useState('front');
  const [displaySide, setDisplaySide] = useState('front');
  const [isFlipping, setIsFlipping] = useState(false);
  const [orientation, setOrientation] = useState(() => {
    // Load orientation from localStorage, default to 'portrait'
    return localStorage.getItem('canvasOrientation') || 'portrait';
  });
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearMode, setClearMode] = useState('all'); // 'all' or slot size (1, 2, 4, 8, 12, 16)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceSlot, setInvoiceSlot] = useState(null);

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
      loadCampaignContacts();
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

  const loadCampaignContacts = async () => {
    if (!campaign?.id || !user?.id) return;
    try {
      // Get the latest campaign data to include campaign_contacts
      const { data: campaignData, error: campaignError } = await campaignsAPI.getById(campaign.id);
      if (campaignError || !campaignData) return;

      // Get all contacts
      const { data: allContacts, error: contactsError } = await contactsAPI.getAll(user.id);
      if (contactsError || !allContacts) return;

      // Filter to only campaign contacts
      const campaignContactIds = campaignData.campaign_contacts || [];
      const filteredContacts = allContacts.filter(c => campaignContactIds.includes(c.id));
      setCampaignContacts(filteredContacts);
    } catch (err) {
      console.error('Exception loading campaign contacts:', err);
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
      if (onUpdate) {
        console.log('📞 [CampaignCanvasTab] Calling onUpdate');
        onUpdate();
      }
    }
  };

  const handleClearSlots = async () => {
    let slotsToClear = [];

    if (clearMode === 'all') {
      // Clear all slots that have contacts assigned
      slotsToClear = slots.filter(slot => slot.contact_id || slot.client_ad_id);
    } else {
      // Clear slots by size
      const slotSize = parseInt(clearMode);
      slotsToClear = slots.filter(slot => {
        const slotCount = (slot.width || 1) * (slot.height || 1);
        return slotCount === slotSize && (slot.contact_id || slot.client_ad_id);
      });
    }

    if (slotsToClear.length === 0) {
      alert('No slots to clear.');
      setShowClearModal(false);
      return;
    }

    // Unassign all selected slots
    let successCount = 0;
    let errorCount = 0;

    for (const slot of slotsToClear) {
      const { error } = await adSlotsAPI.update(slot.id, {
        contact_id: null,
        client_ad_id: null,
        status: 'available',
        custom_price: null
      });

      if (error) {
        errorCount++;
        console.error(`Error clearing slot ${slot.id}:`, error);
      } else {
        successCount++;
      }
    }

    // Reload slots and update
    await loadSlots();
    if (onUpdate) onUpdate();

    // Show results
    if (errorCount > 0) {
      alert(`Cleared ${successCount} slot(s). ${errorCount} slot(s) failed to clear.`);
    } else {
      alert(`Successfully cleared ${successCount} slot(s).`);
    }

    setShowClearModal(false);
    setClearMode('all');
  };

  // Helper functions - defined before usage
  const getSlotBasePrice = (slot) => {
    // Calculate slot count from width * height
    const slotCount = (slot.width || 1) * (slot.height || 1);
    
    console.log('🎯 Getting price for slot:', {
      position: slot.slot_position,
      slot_size: slot.slot_size,
      width: slot.width,
      height: slot.height,
      calculated_count: slotCount
    });
    
    let finalPrice = 0;
    
    // Get price based on calculated slot count
    if (slotCount === 1) finalPrice = Number(campaign.slot_1_price) || 0;
    else if (slotCount === 2) finalPrice = Number(campaign.slot_2_price) || 0;
    else if (slotCount === 4) finalPrice = Number(campaign.slot_4_price) || 0;
    else if (slotCount === 8) finalPrice = Number(campaign.slot_8_price) || 0;
    else if (slotCount === 12) finalPrice = Number(campaign.slot_12_price) || 0;
    else if (slotCount === 16) finalPrice = Number(campaign.slot_16_price) || 0;
    
    // Fallback to old pricing system if slot pricing not set
    if (finalPrice === 0) {
      const size = slot.slot_size?.toString().toLowerCase();
      if (size === 'small' || slotCount === 1) finalPrice = Number(campaign.price_small) || 0;
      else if (size === 'medium' || slotCount === 2) finalPrice = Number(campaign.price_medium) || 0;
      else if (size === 'large' || slotCount >= 4) finalPrice = Number(campaign.price_large) || 0;
      console.log(`⚠️ Used fallback pricing for slot count ${slotCount}: $${finalPrice}`);
    }
    
    console.log(`💵 Final price for ${slot.slot_position} (${slotCount} cells): $${finalPrice}`);
    
    return finalPrice;
  };

  const getSlotFinalPrice = (slot) => {
    return slot.custom_price || getSlotBasePrice(slot);
  };

  const getSlotColor = (slot) => {
    // Calculate slot count from width * height
    const slotCount = (slot.width || 1) * (slot.height || 1);
    
    // Return colors based on slot count (matching CampaignConfigTab adSlotOptions colors)
    if (slotCount === 1) return '#dbeafe';  // 1 Slot - blue
    if (slotCount === 2) return '#dcfce7';  // 2 Slots - green
    if (slotCount === 4) return '#fef9c3';  // 4 Slots - yellow
    if (slotCount === 8) return '#fee2e2';  // 8 Slots - red
    if (slotCount === 12) return '#e0f2fe'; // 12 Slots - cyan
    if (slotCount === 16) return '#ede9fe'; // 16 Slots - purple
    
    return '#f3f4f6'; // Default gray
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

  // Calculate progress based on revenue/price
  const totalSlots = slots.length;
  const bookedSlots = slots.filter(slot => slot.contact_id || slot.client_ad).length;
  
  // Calculate total POTENTIAL value (all slots at base prices)
  const totalPotentialValue = slots.reduce((sum, slot) => sum + getSlotBasePrice(slot), 0);
  
  // Calculate booked slots at BASE prices (what we hoped to get)
  const bookedBasePriceValue = slots
    .filter(slot => slot.contact_id || slot.client_ad)
    .reduce((sum, slot) => sum + getSlotBasePrice(slot), 0);
  
  // Calculate booked slots at ACTUAL prices (including negotiated discounts)
  const bookedActualValue = slots
    .filter(slot => slot.contact_id || slot.client_ad)
    .reduce((sum, slot) => sum + getSlotFinalPrice(slot), 0);
  
  // Progress percentages
  // Full bar = 100% of total potential revenue
  // Green bar: Actual revenue collected as % of total potential
  const actualPercentage = totalPotentialValue > 0 ? ((bookedActualValue / totalPotentialValue) * 100) : 0;
  // Yellow bar: Discounts given as % of total potential
  const discountPercentage = totalPotentialValue > 0 ? ((bookedBasePriceValue - bookedActualValue) / totalPotentialValue * 100) : 0;
  // Grey: Unfilled potential (remaining portion shown by track background)

  // Get designs and slots for both sides
  const frontDesignData = frontDesign;
  const backDesignData = backDesign;
  const frontSlotsData = frontSlots;
  const backSlotsData = backSlots;
  
  // Get current design and slots based on display side (what's shown)
  const currentDesign = displaySide === 'front' ? frontDesign : backDesign;
  const currentSlots = displaySide === 'front' ? frontSlots : backSlots;

  return (
    <div className="campaign-canvas-tab">
      {/* Progress Header */}
      <div className="canvas-progress-header">
        <div className="progress-stats">
          <div className="progress-stat">
            <span className="progress-stat-label">Potential Revenue</span>
            <span className="progress-stat-value">${Math.round(totalPotentialValue).toLocaleString()}</span>
          </div>
          <div className="progress-stat">
            <span className="progress-stat-label">Actual Revenue</span>
            <span className="progress-stat-value" style={{ color: '#22c55e' }}>
              ${Math.round(bookedActualValue).toLocaleString()}
            </span>
          </div>
          {bookedBasePriceValue > bookedActualValue && (
            <div className="progress-stat">
              <span className="progress-stat-label">Discounts Given</span>
              <span className="progress-stat-value" style={{ color: '#f59e0b' }}>
                -${Math.round(bookedBasePriceValue - bookedActualValue).toLocaleString()}
              </span>
            </div>
          )}
          <div className="progress-stat">
            <span className="progress-stat-label">Slots Filled</span>
            <span className="progress-stat-value">{bookedSlots} / {totalSlots}</span>
          </div>
        </div>
        <div className="progress-bar-container">
          <div className="progress-bar-label">
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Revenue Progress</span>
            <span className="progress-percentage" style={{ fontSize: '0.875rem' }}>
              {actualPercentage.toFixed(1)}%
              {discountPercentage > 0 && (
                <span style={{ color: '#f59e0b', marginLeft: '0.5rem' }}>
                  (-{discountPercentage.toFixed(1)}% discounts)
                </span>
              )}
            </span>
          </div>
          <div className="progress-bar-track" style={{ 
            display: 'flex',
            height: '1rem',
            backgroundColor: '#e5e7eb',
            borderRadius: '0.5rem',
            overflow: 'hidden'
          }}>
            {/* Green bar: Actual revenue collected */}
            {actualPercentage > 0 && (
              <div
                style={{ 
                  width: `${actualPercentage}%`,
                  backgroundColor: '#22c55e',
                  flexShrink: 0,
                  transition: 'width 0.3s ease'
                }}
              />
            )}
            {/* Yellow bar: Discounts given */}
            {discountPercentage > 0 && (
              <div
                style={{ 
                  width: `${discountPercentage}%`,
                  backgroundColor: '#f59e0b',
                  flexShrink: 0,
                  transition: 'width 0.3s ease'
                }}
              />
            )}
            {/* Grey portion is automatically shown by track background for remaining space */}
          </div>
          {/* Legend */}
          <div style={{ 
            display: 'flex', 
            gap: '1rem', 
            marginTop: '0.5rem', 
            fontSize: '0.75rem',
            color: '#6b7280'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <div style={{ 
                width: '10px', 
                height: '10px', 
                backgroundColor: '#22c55e', 
                borderRadius: '2px' 
              }} />
              <span>Actual Revenue</span>
            </div>
            {discountPercentage > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <div style={{ 
                  width: '10px', 
                  height: '10px', 
                  backgroundColor: '#f59e0b', 
                  borderRadius: '2px' 
                }} />
                <span>Negotiated Discounts</span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <div style={{ 
                width: '10px', 
                height: '10px', 
                backgroundColor: '#e5e7eb', 
                borderRadius: '2px' 
              }} />
              <span>Unfilled Potential</span>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="canvas-loading">Loading canvas...</div>
      ) : (
        <div className="canvas-content">
          {/* Controls Row - Orientation Toggle (left), Side Toggle (center), Clear Button (right) */}
          {(frontDesign || backDesign) && (
            <div className="canvas-controls">
              {/* Orientation Toggle - Left */}
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

              {/* Side Toggle - Center */}
              <div className="canvas-side-toggle">
                <button
                  className={`side-toggle-btn ${activeSide === 'front' ? 'active' : ''}`}
                  onClick={() => {
                    if (activeSide !== 'front' && !isFlipping) {
                      setIsFlipping(true);
                      setActiveSide('front');
                      setTimeout(() => {
                        setDisplaySide('front');
                        setIsFlipping(false);
                      }, 600);
                    }
                  }}
                  disabled={!frontDesign || isFlipping}
                >
                  Front {!frontDesign && '(N/A)'}
                </button>
                <button
                  className={`side-toggle-btn ${activeSide === 'back' ? 'active' : ''}`}
                  onClick={() => {
                    if (activeSide !== 'back' && !isFlipping) {
                      setIsFlipping(true);
                      setActiveSide('back');
                      setTimeout(() => {
                        setDisplaySide('back');
                        setIsFlipping(false);
                      }, 600);
                    }
                  }}
                  disabled={!backDesign || isFlipping}
                >
                  Back {!backDesign && '(N/A)'}
                </button>
              </div>

              {/* Clear Canvas Button - Right */}
              <div className="canvas-clear-controls">
                <button
                  className="canvas-clear-btn"
                  onClick={() => setShowClearModal(true)}
                  title="Clear all or selected slot sizes"
                >
                  <Trash2 size={18} />
                  <span>Clear Canvas</span>
                </button>
              </div>
            </div>
          )}

          {/* Canvas Container */}
          {(frontDesign || backDesign) ? (
            <div className="canvas-layout-container">
              <h3 className={`canvas-layout-title ${isFlipping ? 'flipping' : ''}`}>
                {displaySide === 'front' ? (frontDesign?.name || 'Front') : (backDesign?.name || 'Back')} - {displaySide === 'front' ? 'Front' : 'Back'} Side
              </h3>
              <div className={`canvas-flip-wrapper ${activeSide === 'back' ? 'flipped' : ''} ${isFlipping ? 'flipping' : ''}`}>
                {/* Front Side */}
                <div className="canvas-flip-side canvas-flip-front">
                  {frontDesign ? (
                    <CanvasLayout
                      design={frontDesign}
                      slots={frontSlotsData}
                      onSlotClick={handleSlotClick}
                      getSlotColor={getSlotColor}
                      getSlotFinalPrice={getSlotFinalPrice}
                      orientation={orientation}
                    />
                  ) : (
                    <div className="canvas-no-design">
                      <p>No front design available</p>
                    </div>
                  )}
                </div>
                {/* Back Side */}
                <div className="canvas-flip-side canvas-flip-back">
                  {backDesign ? (
                    <CanvasLayout
                      design={backDesign}
                      slots={backSlotsData}
                      onSlotClick={handleSlotClick}
                      getSlotColor={getSlotColor}
                      getSlotFinalPrice={getSlotFinalPrice}
                      orientation={orientation}
                    />
                  ) : (
                    <div className="canvas-no-design">
                      <p>No back design available</p>
                    </div>
                  )}
                </div>
              </div>
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
          campaign={campaign}
          contacts={campaignContacts}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedSlot(null);
          }}
          onAssign={() => {
            loadSlots();
            loadCampaignContacts(); // Reload campaign contacts in case they changed
          }}
          onInvoice={() => {
            setInvoiceSlot(selectedSlot);
            setShowInvoiceModal(true);
            setShowAssignModal(false);
          }}
        />
      )}

      {/* Invoice Modal */}
      {showInvoiceModal && invoiceSlot && (
        <InvoiceModal
          slot={invoiceSlot}
          campaign={campaign}
          contacts={campaignContacts}
          onClose={() => {
            setShowInvoiceModal(false);
            setInvoiceSlot(null);
          }}
        />
      )}

      {/* Clear Canvas Modal */}
      {showClearModal && (
        <ClearCanvasModal
          slots={slots}
          clearMode={clearMode}
          onClearModeChange={setClearMode}
          onConfirm={handleClearSlots}
          onCancel={() => {
            setShowClearModal(false);
            setClearMode('all');
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

                  {/* Slot Info Overlay - only show if slot exists and has contact assigned */}
                  {slot && slot.contact_id && slot.contact && (
                    <div className="canvas-slot-info-overlay">
                      <div className="canvas-slot-info-top">
                        <span className="canvas-slot-position">{slot.slot_position}</span>
                      </div>
                      <div className="canvas-slot-info-bottom">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
                          {slot.contact.business_name && (
                            <span className="canvas-slot-advertiser" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <User size={12} />
                              {slot.contact.business_name}
                            </span>
                          )}
                          {slot.contact.niche?.name && (
                            <span style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '0.25rem',
                              fontSize: '0.75rem',
                              color: '#9ca3af'
                            }}>
                              <Tag size={10} style={{ color: '#9ca3af' }} />
                              {slot.contact.niche.name}
                            </span>
                          )}
                        </div>
                        <span className="canvas-slot-price">
                          <DollarSign size={12} />
                          {Math.round(finalPrice).toLocaleString()}
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
const AssignSlotModal = ({ slot, campaign, contacts, onClose, onAssign, onInvoice }) => {
  const { user } = useAuth();
  const [selectedContact, setSelectedContact] = useState(null);
  const [contactAds, setContactAds] = useState([]);
  const [selectedAd, setSelectedAd] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showAdUploader, setShowAdUploader] = useState(false);
  const [customPrice, setCustomPrice] = useState(slot.custom_price || null);
  const [allSlots, setAllSlots] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchInputRef = useRef(null);
  const suggestionsRef = useRef(null);

  useEffect(() => {
    if (slot.contact_id) {
      const contact = contacts.find(c => c.id === slot.contact_id);
      if (contact) {
        setSelectedContact(contact);
        setSearchTerm(contact.business_name || '');
        loadContactAds(contact.id);
      } else {
        setSelectedContact(null);
        setSearchTerm('');
      }
    } else {
      setSelectedContact(null);
      setSearchTerm('');
    }
    // Load all campaign slots for niche filtering
    loadAllSlots();
    // Note: contacts prop now contains only campaign contacts (contacts added to the campaign)
  }, [slot, contacts]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const loadAllSlots = async () => {
    const { data, error } = await adSlotsAPI.getByCampaign(campaign.id);
    if (!error && data) {
      setAllSlots(data);
    }
  };

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

  const handleContactSelect = async (contact) => {
    setSelectedContact(contact);
    setSearchTerm(contact.business_name || '');
    setSelectedAd(null);
    setContactAds([]);
    setShowAdUploader(false);
    setShowSuggestions(false);
    if (contact) {
      await loadContactAds(contact.id);
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setShowSuggestions(true);
    
    // If search is cleared, clear selection
    if (!value.trim()) {
      setSelectedContact(null);
      setSelectedAd(null);
      setContactAds([]);
      setShowAdUploader(false);
    }
  };

  const handleClearSelection = () => {
    setSelectedContact(null);
    setSearchTerm('');
    setSelectedAd(null);
    setContactAds([]);
    setShowAdUploader(false);
    setShowSuggestions(false);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };
  
  // Get base price for this slot from campaign pricing
  const getSlotBasePrice = () => {
    const slotCount = (slot.width || 1) * (slot.height || 1);
    let basePrice = 0;
    
    if (slotCount === 1) basePrice = Number(campaign.slot_1_price) || 0;
    else if (slotCount === 2) basePrice = Number(campaign.slot_2_price) || 0;
    else if (slotCount === 4) basePrice = Number(campaign.slot_4_price) || 0;
    else if (slotCount === 8) basePrice = Number(campaign.slot_8_price) || 0;
    else if (slotCount === 12) basePrice = Number(campaign.slot_12_price) || 0;
    else if (slotCount === 16) basePrice = Number(campaign.slot_16_price) || 0;
    
    // Fallback to old pricing system
    if (basePrice === 0) {
      const size = slot.slot_size?.toString().toLowerCase();
      if (size === 'small' || slotCount === 1) basePrice = Number(campaign.price_small) || 0;
      else if (size === 'medium' || slotCount === 2) basePrice = Number(campaign.price_medium) || 0;
      else if (size === 'large' || slotCount >= 4) basePrice = Number(campaign.price_large) || 0;
    }
    
    return basePrice;
  };
  
  // Initialize customPrice with base price if not already set
  useEffect(() => {
    if (customPrice === null) {
      setCustomPrice(getSlotBasePrice());
    }
  }, []);

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
    if (!selectedContact) {
      alert('Please select a contact');
      return;
    }

    // Check if contact is already assigned to another slot
    if (isContactAssigned(selectedContact.id) && selectedContact.id !== slot.contact_id) {
      alert('This contact is already assigned to another slot. Each contact can only be assigned to one slot.');
      return;
    }

    setLoading(true);
    const updateData = {
      contact_id: selectedContact.id,
      client_ad_id: selectedAd?.id || null, // Ad is optional
      status: 'booked'
    };
    
    // Include custom_price if it's been set (either custom or left as base price)
    if (customPrice !== null && customPrice !== undefined) {
      updateData.custom_price = Number(customPrice);
    }
    
    console.log('🔄 Assigning slot with data:', updateData);
    const { data, error } = await adSlotsAPI.update(slot.id, updateData);

    if (!error) {
      console.log('✅ Slot assigned successfully:', data);
      onAssign();
    } else {
      console.error('❌ Failed to assign slot:', error);
      alert('Failed to assign slot: ' + (error.message || JSON.stringify(error)));
    }
    setLoading(false);
  };

  const handleAdDelete = async (adId, e) => {
    e.stopPropagation(); // Prevent selecting the ad when clicking delete
    
    if (!confirm('Are you sure you want to delete this ad? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    const { error } = await clientAds.delete(adId);
    
    if (!error) {
      // Remove from local state
      setContactAds(contactAds.filter(ad => ad.id !== adId));
      // Clear selection if deleted ad was selected
      if (selectedAd?.id === adId) {
        setSelectedAd(null);
      }
    } else {
      alert('Failed to delete ad');
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

  // Filter campaign contacts based on campaign's niche restrictions
  // Note: contacts prop contains only contacts that have been added to the campaign
  const getAvailableContacts = () => {
    // If no niche restrictions, all campaign contacts are available
    if (!campaign.niche_restriction_type || campaign.niche_restriction_type === 'any') {
      return contacts;
    }

    // For "one_per_campaign" mode with allowed niches
    if (campaign.niche_restriction_type === 'one_per_campaign' && campaign.allowed_niches?.length > 0) {
      // Get niches already used by other slots (excluding current slot)
      const usedNiches = new Set();
      allSlots.forEach(s => {
        if (s.id !== slot.id && s.contact_id) {
          const contact = contacts.find(c => c.id === s.contact_id);
          if (contact?.niche_id) {
            usedNiches.add(contact.niche_id);
          }
        }
      });

      // Filter campaign contacts:
      // 1. Must have a niche that's in allowed_niches
      // 2. That niche must not already be used (unless it's the current slot's contact)
      return contacts.filter(contact => {
        const isAllowedNiche = campaign.allowed_niches.includes(contact.niche_id);
        const isNicheAvailable = !usedNiches.has(contact.niche_id);
        const isCurrentContact = contact.id === slot.contact_id;
        
        return contact.niche_id && isAllowedNiche && (isNicheAvailable || isCurrentContact);
      });
    }

    // Default: return all campaign contacts
    return contacts;
  };

  const availableContacts = getAvailableContacts();

  // Get contacts that are already assigned to other slots (excluding current slot)
  const getAssignedContactIds = () => {
    const assignedIds = new Set();
    allSlots.forEach(s => {
      if (s.id !== slot.id && s.contact_id) {
        assignedIds.add(s.contact_id);
      }
    });
    return assignedIds;
  };

  const assignedContactIds = getAssignedContactIds();

  // Check if a contact is already assigned to another slot
  const isContactAssigned = (contactId) => {
    return assignedContactIds.has(contactId);
  };

  // Filter contacts based on search term
  const getFilteredSuggestions = () => {
    if (!searchTerm.trim()) {
      return availableContacts.slice(0, 10); // Show first 10 when no search
    }

    const searchLower = searchTerm.toLowerCase();
    return availableContacts
      .filter(contact => {
        return (
          contact.business_name?.toLowerCase().includes(searchLower) ||
          contact.owner_name?.toLowerCase().includes(searchLower) ||
          contact.email?.toLowerCase().includes(searchLower) ||
          contact.phone?.toLowerCase().includes(searchLower) ||
          contact.niche?.name?.toLowerCase().includes(searchLower)
        );
      })
      .slice(0, 10); // Limit to 10 suggestions
  };

  const filteredSuggestions = getFilteredSuggestions();

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
            <div style={{ position: 'relative' }}>
              {selectedContact ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  backgroundColor: '#f9fafb'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, color: '#111827' }}>
                      {selectedContact.business_name}
                    </div>
                    {selectedContact.niche?.name && (
                      <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                        {selectedContact.niche.name}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#6b7280',
                      padding: '0.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      borderRadius: '0.25rem'
                    }}
                    title="Clear selection"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ position: 'relative' }}>
                    <Search 
                      size={18} 
                      style={{ 
                        position: 'absolute', 
                        left: '0.75rem', 
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#6b7280',
                        pointerEvents: 'none'
                      }} 
                    />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search for advertiser..."
                      value={searchTerm}
                      onChange={handleSearchChange}
                      onFocus={() => setShowSuggestions(true)}
                      className="assign-select"
                      style={{
                        paddingLeft: '2.5rem',
                        width: '100%'
                      }}
                      disabled={availableContacts.length === 0}
                    />
                    {searchTerm && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchTerm('');
                          setShowSuggestions(false);
                          if (searchInputRef.current) {
                            searchInputRef.current.focus();
                          }
                        }}
                        style={{
                          position: 'absolute',
                          right: '0.5rem',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#6b7280',
                          padding: '0.25rem',
                          display: 'flex',
                          alignItems: 'center',
                          borderRadius: '0.25rem'
                        }}
                        title="Clear search"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  
                  {/* Suggestions Dropdown */}
                  {showSuggestions && filteredSuggestions.length > 0 && (
                    <div
                      ref={suggestionsRef}
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        marginTop: '0.25rem',
                        backgroundColor: 'white',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                        maxHeight: '300px',
                        overflowY: 'auto',
                        zIndex: 1000
                      }}
                    >
                      {filteredSuggestions.map(contact => {
                        const isAssigned = isContactAssigned(contact.id);
                        const isCurrentSlotContact = contact.id === slot.contact_id;
                        const isDisabled = isAssigned && !isCurrentSlotContact;
                        
                        return (
                          <button
                            key={contact.id}
                            type="button"
                            onClick={() => {
                              if (!isDisabled) {
                                handleContactSelect(contact);
                              }
                            }}
                            disabled={isDisabled}
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              textAlign: 'left',
                              background: 'none',
                              border: 'none',
                              cursor: isDisabled ? 'not-allowed' : 'pointer',
                              borderBottom: '1px solid #f3f4f6',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.75rem',
                              transition: 'background-color 0.15s',
                              opacity: isDisabled ? 0.5 : 1,
                              backgroundColor: isDisabled ? '#f9fafb' : 'transparent'
                            }}
                            onMouseEnter={(e) => {
                              if (!isDisabled) {
                                e.target.style.backgroundColor = '#f9fafb';
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.backgroundColor = isDisabled ? '#f9fafb' : 'transparent';
                            }}
                            title={isDisabled ? 'This contact is already assigned to another slot' : ''}
                          >
                            <div style={{ flex: 1 }}>
                              <div style={{ 
                                fontWeight: 500, 
                                color: isDisabled ? '#9ca3af' : '#111827', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '0.5rem' 
                              }}>
                                <span>{contact.business_name}</span>
                                {contact.niche?.name && (
                                  <span style={{ 
                                    fontSize: '0.875rem', 
                                    color: isDisabled ? '#d1d5db' : '#6b7280', 
                                    fontWeight: 'normal' 
                                  }}>
                                    ({contact.niche.name})
                                  </span>
                                )}
                                {isDisabled && (
                                  <span style={{ 
                                    fontSize: '0.75rem', 
                                    color: '#9ca3af', 
                                    fontStyle: 'italic',
                                    marginLeft: 'auto'
                                  }}>
                                    (Already assigned)
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* No results message */}
                  {showSuggestions && searchTerm.trim() && filteredSuggestions.length === 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        marginTop: '0.25rem',
                        padding: '0.75rem',
                        backgroundColor: 'white',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                        zIndex: 1000,
                        color: '#6b7280',
                        fontSize: '0.875rem'
                      }}
                    >
                      No advertisers match "{searchTerm}"
                    </div>
                  )}
                </>
              )}
            </div>
            
            {availableContacts.length === 0 && (
              <p style={{ 
                fontSize: '0.875rem', 
                color: '#dc2626', 
                marginTop: '0.5rem' 
              }}>
                ⚠️ No advertisers available. Add advertisers to this campaign in the Contacts tab first.
              </p>
            )}
            {availableContacts.length > 0 && campaign.niche_restriction_type === 'one_per_campaign' && !selectedContact && (
              <p style={{ 
                fontSize: '0.875rem', 
                color: '#6b7280', 
                marginTop: '0.5rem' 
              }}>
                {availableContacts.length} contact{availableContacts.length === 1 ? '' : 's'} with available niches
              </p>
            )}
          </div>

          {/* Ad Selection */}
          {selectedContact && (
            <div className="assign-form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <label style={{ margin: 0 }}>Select Ad Creative <span style={{ fontWeight: 'normal', color: '#6b7280', fontSize: '0.875rem' }}>(Optional)</span></label>
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
                      style={{ position: 'relative' }}
                    >
                      {ad.image_url ? (
                        <>
                          <img src={ad.image_url} alt={ad.name} />
                          <button
                            type="button"
                            onClick={(e) => handleAdDelete(ad.id, e)}
                            style={{
                              position: 'absolute',
                              top: '0.25rem',
                              right: '0.25rem',
                              background: 'rgba(0, 0, 0, 0.7)',
                              border: 'none',
                              borderRadius: '50%',
                              width: '24px',
                              height: '24px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              color: 'white',
                              padding: 0,
                              transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(220, 38, 38, 0.9)'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'}
                            title="Delete ad"
                          >
                            <X size={14} />
                          </button>
                        </>
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
                  No ads found for this advertiser. Upload one above or assign without an ad.
                </div>
              )}
            </div>
          )}
          
          {/* Price Field */}
          <div className="assign-form-group">
            <label>Price</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <DollarSign 
                  size={18} 
                  style={{ 
                    position: 'absolute', 
                    left: '0.75rem', 
                    top: '50%', 
                    transform: 'translateY(-50%)',
                    color: '#6b7280'
                  }} 
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={customPrice || ''}
                  onChange={(e) => setCustomPrice(parseFloat(e.target.value) || 0)}
                  className="assign-select"
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder="0.00"
                />
              </div>
              {customPrice !== getSlotBasePrice() && (
                <button
                  type="button"
                  onClick={() => setCustomPrice(getSlotBasePrice())}
                  className="btn-primary"
                  style={{
                    padding: '0.5rem',
                    fontSize: '0.75rem',
                    whiteSpace: 'nowrap'
                  }}
                  title="Reset to base price"
                >
                  <RotateCw size={14} />
                </button>
              )}
            </div>
            <p style={{ 
              fontSize: '0.875rem', 
              color: '#6b7280', 
              marginTop: '0.5rem' 
            }}>
              Base price: ${Math.round(getSlotBasePrice()).toLocaleString()} • Edit if negotiated rate differs
            </p>
          </div>
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
            {selectedContact && (
              <button
                onClick={onInvoice}
                className="btn-invoice"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '14px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = '#059669'}
                onMouseLeave={(e) => e.target.style.background = '#10b981'}
              >
                <FileText size={18} />
                Invoice
              </button>
            )}
            <button onClick={onClose} className="btn-cancel">
              Cancel
            </button>
            <button
              onClick={handleAssign}
              disabled={!selectedContact || loading}
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

// Clear Canvas Modal Component
const ClearCanvasModal = ({ slots, clearMode, onClearModeChange, onConfirm, onCancel }) => {
  // Count slots by size
  const getSlotsBySize = (size) => {
    return slots.filter(slot => {
      const slotCount = (slot.width || 1) * (slot.height || 1);
      return slotCount === size && (slot.contact_id || slot.client_ad_id);
    }).length;
  };

  const allAssignedSlots = slots.filter(slot => slot.contact_id || slot.client_ad_id).length;
  const slotsToClear = clearMode === 'all' 
    ? allAssignedSlots 
    : getSlotsBySize(parseInt(clearMode));

  const slotSizeOptions = [
    { value: 'all', label: 'All Slots', count: allAssignedSlots },
    { value: '1', label: '1 Slot Size', count: getSlotsBySize(1) },
    { value: '2', label: '2 Slot Size', count: getSlotsBySize(2) },
    { value: '4', label: '4 Slot Size', count: getSlotsBySize(4) },
    { value: '8', label: '8 Slot Size', count: getSlotsBySize(8) },
    { value: '12', label: '12 Slot Size', count: getSlotsBySize(12) },
    { value: '16', label: '16 Slot Size', count: getSlotsBySize(16) },
  ].filter(option => option.count > 0 || option.value === 'all');

  return (
    <div className="assign-modal-backdrop" onClick={onCancel}>
      <div className="assign-modal clear-canvas-modal" onClick={(e) => e.stopPropagation()}>
        <div className="assign-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertTriangle size={24} style={{ color: '#f59e0b' }} />
            <h3>Clear Canvas</h3>
          </div>
          <button onClick={onCancel} className="assign-modal-close">×</button>
        </div>

        <div className="assign-modal-content">
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
              This will unassign all contacts from the selected slots. This action cannot be undone.
            </p>
            
            <div className="assign-form-group">
              <label>Clear by Slot Size</label>
              <div className="clear-options-grid">
                {slotSizeOptions.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    className={`clear-option-btn ${clearMode === option.value ? 'active' : ''}`}
                    onClick={() => onClearModeChange(option.value)}
                    disabled={option.count === 0 && option.value !== 'all'}
                  >
                    <div className="clear-option-label">{option.label}</div>
                    <div className="clear-option-count">
                      {option.count} slot{option.count !== 1 ? 's' : ''}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {slotsToClear > 0 && (
              <div style={{
                padding: '1rem',
                background: '#fef3c7',
                border: '1px solid #fcd34d',
                borderRadius: '0.5rem',
                marginTop: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <AlertTriangle size={16} style={{ color: '#d97706' }} />
                  <strong style={{ color: '#92400e' }}>Warning</strong>
                </div>
                <p style={{ color: '#78350f', fontSize: '0.875rem', margin: 0 }}>
                  This will unassign <strong>{slotsToClear}</strong> contact{slotsToClear !== 1 ? 's' : ''} from their slot{slotsToClear !== 1 ? 's' : ''}.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="assign-modal-footer">
          <div className="assign-modal-actions">
            <button onClick={onCancel} className="btn-cancel">
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={slotsToClear === 0}
              className="btn-remove"
              style={{ backgroundColor: '#dc2626' }}
            >
              <Trash2 size={16} />
              Clear {slotsToClear} Slot{slotsToClear !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignCanvasTab;


