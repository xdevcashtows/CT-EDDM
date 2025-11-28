import React, { useState, useEffect, useMemo } from 'react';
import { Plus } from 'lucide-react';
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
import { storage } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { enrichSavedRoutesWithLock } from '../utils/routeLocking';
import { getMockLayoutForDesign, getDefaultMockLayout } from '../utils/mockLayouts';
import { CampaignCard } from '../components/campaign/CampaignCard';
import { StatusFilter } from '../components/campaign/StatusFilter';
import { ViewToggle } from '../components/campaign/ViewToggle';
import CampaignDetailView from '../components/campaign/CampaignDetailView';
import ImageUploader from '../components/ImageUploader';


const cloneLayout = (layout = getDefaultMockLayout('9x12')) => ({
  front: { ...layout.front },
  back: { ...layout.back }
});

const getEmptyCampaignFormData = () => ({
  name: '',
  saved_route_id: null,
  design_id: null,
  front_design_id: null,
  back_design_id: null,
  price_small: 0,
  price_medium: 0,
  price_large: 0,
  unique_niche_per_slot: true,
  niche_restriction_type: 'any', // 'any' or 'one_per_campaign'
  allowed_niches: [], // array of niche IDs for selected niches (only used for 'one_per_campaign' mode)
  mail_date: null,
  notes: ''
});

const mapCampaignToFormData = (campaign) => {
  const base = { ...getEmptyCampaignFormData(), ...campaign };
  if (!campaign) {
    return base;
  }

  const frontFromSnapshot = campaign.design_snapshot?.front?.id ?? null;
  const backFromSnapshot = campaign.design_snapshot?.back?.id ?? null;
  const frontId = campaign.front_design_id || frontFromSnapshot || campaign.design_id || null;
  const backId = campaign.back_design_id || backFromSnapshot || campaign.design_id || null;

  return {
    ...base,
    design_id: frontId || base.design_id,
    front_design_id: frontId,
    back_design_id: backId
  };
};

const buildCampaignDesignSnapshot = (frontDesign, backDesign) => {
  const snapshot = {};
  if (frontDesign) snapshot.front = frontDesign;
  if (backDesign) snapshot.back = backDesign;

  if (frontDesign?.card_size || backDesign?.card_size) {
    snapshot.card_size = frontDesign?.card_size || backDesign?.card_size;
  }

  const frontName = frontDesign?.name;
  const backName = backDesign?.name;
  if (frontName || backName) {
    snapshot.name =
      frontName && backName && frontName !== backName
        ? `${frontName} • ${backName}`
        : frontName || backName;
  }

  return snapshot;
};

const resolveDesignSideLayout = (design, side) => {
  if (!design) {
    return getDefaultMockLayout('9x12')[side];
  }

  const layoutSource = design.mock_layout || getMockLayoutForDesign(design.id, design.card_size);
  if (layoutSource?.[side]) {
    return layoutSource[side];
  }

  const fallback = getDefaultMockLayout(design.card_size || '9x12');
  return fallback[side];
};

function Campaigns() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [viewMode, setViewMode] = useState('grid');
  const [showDetailView, setShowDetailView] = useState(false);
  const [detailViewCampaign, setDetailViewCampaign] = useState(null);

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

  const handleStatusToggle = (status) => {
    setSelectedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  const handleClearFilters = () => {
    setSelectedStatuses([]);
  };

  const filteredCampaigns = selectedStatuses.length === 0
    ? campaigns
    : campaigns.filter((campaign) =>
        selectedStatuses.includes(campaign.status)
      );

  const handleCreateCampaign = () => {
    setSelectedCampaign(null);
    setShowModal(true);
  };

  const handleEditCampaign = (campaign) => {
    setSelectedCampaign(campaign);
    setShowModal(true);
  };

  const handleOpenCampaignDetail = (campaign) => {
    setDetailViewCampaign(campaign);
    setShowDetailView(true);
  };

  const handleCloseDetailView = () => {
    setShowDetailView(false);
    setDetailViewCampaign(null);
  };

  const handleDetailViewUpdate = async () => {
    // Reload campaigns to get fresh data
    await loadCampaigns();
    
    // If detail view is open, refresh the campaign data
    if (detailViewCampaign) {
      const { data } = await campaignsAPI.getById(detailViewCampaign.id);
      if (data) {
        setDetailViewCampaign(data);
      }
    }
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

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            <p className="mt-4 text-gray-600">Loading campaigns...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Campaign Cards
              </h1>
              <p className="text-gray-600">
                EDDM postcard mailer campaigns with status tracking
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                onClick={handleCreateCampaign}
              >
                <Plus size={20} />
                New Campaign
              </button>
              <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
            </div>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-medium text-gray-700">
              Filter by status:
            </span>
            <StatusFilter
              selectedStatuses={selectedStatuses}
              onStatusToggle={handleStatusToggle}
              onClearFilters={handleClearFilters}
            />
          </div>
          <p className="text-sm text-gray-500">
            Showing {filteredCampaigns.length} of {campaigns.length} campaigns
          </p>
        </div>
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
              : 'flex flex-col gap-4'
          }
        >
          {filteredCampaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onClick={() => handleOpenCampaignDetail(campaign)}
            />
          ))}
        </div>
        {filteredCampaigns.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">
              No campaigns match the selected filters
            </p>
          </div>
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

      {showDetailView && detailViewCampaign && (
        <CampaignDetailView
          campaign={detailViewCampaign}
          isOpen={showDetailView}
          onClose={handleCloseDetailView}
          onUpdate={handleDetailViewUpdate}
        />
      )}
    </div>
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


// Campaign Modal Component
function CampaignModal({ campaign, userId, onClose, onSave }) {
  const [formData, setFormData] = useState(() => mapCampaignToFormData(campaign));
  const [activeStep, setActiveStep] = useState(0);
  const [templateSubStep, setTemplateSubStep] = useState('front'); // 'front', 'back', or 'complete'
  const [isTransitioning, setIsTransitioning] = useState(false);
  const defaultMockLayout = getDefaultMockLayout('9x12');
  const [mockDisplayCounts, setMockDisplayCounts] = useState(cloneLayout(defaultMockLayout));
  const [slotDiscounts, setSlotDiscounts] = useState({});
  const [contactsTabIndex, setContactsTabIndex] = useState(0); // 0: recipients, 1: template, 2: schedule

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

  useEffect(() => {
    const mappedData = mapCampaignToFormData(campaign);
    setFormData(mappedData);
    setContactsTabIndex(0); // Reset to first tab when modal opens
    // Both new and editing campaigns start at templates step
    setActiveStep(0);
    setTemplateSubStep('front');
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
  const selectedFrontDesign = designs.find(d => d.id === formData.front_design_id);
  const selectedBackDesign = designs.find(d => d.id === formData.back_design_id);
  const selectedDesign = selectedFrontDesign || selectedBackDesign;
  
  // Calculate total slots from both front and back templates
  const totalCampaignSlots = (selectedFrontDesign?.num_slots || 0) + (selectedBackDesign?.num_slots || 0);

  const layoutCaps = useMemo(() => ({
    front: resolveDesignSideLayout(selectedFrontDesign, 'front'),
    back: resolveDesignSideLayout(selectedBackDesign, 'back')
  }), [selectedFrontDesign, selectedBackDesign]);

  useEffect(() => {
    setMockDisplayCounts(cloneLayout(layoutCaps));
  }, [layoutCaps]);
  
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

  const getSanitizedFormData = () => {
    const { front_design_id, back_design_id, ...rest } = formData;
    // Ensure date fields are null if empty string
    if (rest.mail_date === '') {
      rest.mail_date = null;
    }
    return rest;
  };

  const adSlotPricingOptions = [
    { id: 'slot_1', label: '1 Slot', color: '#dbeafe', slots: 1 },
    { id: 'slot_2', label: '2 Slots', color: '#dcfce7', slots: 2 },
    { id: 'slot_4', label: '4 Slots', color: '#fef9c3', slots: 4 },
    { id: 'slot_8', label: '8 Slots', color: '#fee2e2', slots: 8 },
    { id: 'slot_12', label: '12 Slots', color: '#e0f2fe', slots: 12 },
    { id: 'slot_16', label: '16 Slots', color: '#ede9fe', slots: 16 }
  ];

  const [slotPrices, setSlotPrices] = useState({
    slot_1: '',
    slot_2: '',
    slot_4: '',
    slot_8: '',
    slot_12: '',
    slot_16: ''
  });

  const updateSlotPrice = (slotId, rawValue) => {
    if (rawValue === '') {
      setSlotPrices(prev => ({
        ...prev,
        [slotId]: ''
      }));
      return;
    }
    const parsed = parseFloat(rawValue);
    setSlotPrices(prev => ({
      ...prev,
      [slotId]: Number.isNaN(parsed) ? '' : Math.max(0, parsed)
    }));
  };

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
    const maxValue = layoutCaps?.[side]?.[size] ?? 0;
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

  const handleTemplateSelect = (designId, side) => {
    // Require campaign name before selecting templates
    if (!formData.name?.trim()) {
      alert('Please enter a campaign name before selecting templates.');
      return;
    }

    if (side === 'front') {
      setFormData(prev => ({
        ...prev,
        front_design_id: designId,
        design_id: designId
      }));
      // Trigger transition to back selection
      setIsTransitioning(true);
      setTimeout(() => {
        setTemplateSubStep('back');
        setIsTransitioning(false);
      }, 400); // 400ms for disappear animation
    } else if (side === 'back') {
      setFormData(prev => ({
        ...prev,
        back_design_id: designId
      }));
      // Auto-advance to pricing step (step 1) after both templates selected
      setTimeout(() => {
        if (activeStep === 0 && canAdvanceFromStep(0)) {
          setActiveStep(1); // Move to pricing step
        }
      }, 600);
    }
  };

  const handleSubmit = async () => {
    const trimmedName = formData.name?.trim();
    if (!trimmedName) {
      alert('Please name your campaign before saving.');
      return;
    }

    if (!formData.saved_route_id || !formData.front_design_id || !formData.back_design_id) {
      alert('Please select a route and templates for both sides of the card.');
      return;
    }

    const sanitizedForm = getSanitizedFormData();
    setLoading(true);

    try {
      if (campaign?.id) {
        const { error } = await campaignsAPI.update(campaign.id, {
          ...sanitizedForm,
          name: trimmedName,
          design_snapshot: buildCampaignDesignSnapshot(selectedFrontDesign, selectedBackDesign)
        });
        if (error) throw error;
      } else {
        const campaignData = {
          ...sanitizedForm,
          name: trimmedName,
          user_id: userId,
          route_snapshot: selectedRoute?.routes || [],
          design_snapshot: buildCampaignDesignSnapshot(selectedFrontDesign, selectedBackDesign),
          total_pieces: selectedRoute?.total_households || 0,
          status: 'draft',
          // Add slot pricing from slotPrices state
          slot_1_price: Number(slotPrices.slot_1) || 0,
          slot_2_price: Number(slotPrices.slot_2) || 0,
          slot_4_price: Number(slotPrices.slot_4) || 0,
          slot_8_price: Number(slotPrices.slot_8) || 0,
          slot_12_price: Number(slotPrices.slot_12) || 0,
          slot_16_price: Number(slotPrices.slot_16) || 0
        };

        const { data: newCampaign, error } = await campaignsAPI.create(campaignData);
        if (error) throw error;

        // Create ad slots for front template
        if (newCampaign && selectedFrontDesign?.slot_config) {
          console.log('Creating front slots for campaign:', newCampaign.id, 'Config:', selectedFrontDesign.slot_config);
          for (const slotConfig of selectedFrontDesign.slot_config) {
            // Calculate numeric slot size (width * height)
            const numericSlotSize = slotConfig.width * slotConfig.height;
            
            // Map numeric size to text-based size for database constraint
            let slotSizeText = 'small';
            if (numericSlotSize === 1) slotSizeText = 'small';
            else if (numericSlotSize === 2) slotSizeText = 'medium';
            else if (numericSlotSize >= 4) slotSizeText = 'large';
            
            const slotData = {
              campaign_id: newCampaign.id,
              slot_position: `Front-${slotConfig.position}`,
              slot_size: slotSizeText, // Use text-based size for database constraint
              width: slotConfig.width,
              height: slotConfig.height,
              x_position: slotConfig.x,
              y_position: slotConfig.y,
              status: 'available'
            };
            console.log('Creating front slot:', slotData);
            const { data: slotData2, error: slotError } = await adSlotsAPI.create(slotData);
            if (slotError) {
              console.error('❌ Error creating front slot:', slotError);
            } else {
              console.log('✅ Successfully created front slot:', slotData2);
            }
          }
        } else {
          console.warn('⚠️ Not creating front slots. newCampaign:', !!newCampaign, 'slot_config:', selectedFrontDesign?.slot_config);
        }

        // Create ad slots for back template
        if (newCampaign && selectedBackDesign?.slot_config) {
          console.log('Creating back slots for campaign:', newCampaign.id, 'Config:', selectedBackDesign.slot_config);
          for (const slotConfig of selectedBackDesign.slot_config) {
            // Calculate numeric slot size (width * height)
            const numericSlotSize = slotConfig.width * slotConfig.height;
            
            // Map numeric size to text-based size for database constraint
            let slotSizeText = 'small';
            if (numericSlotSize === 1) slotSizeText = 'small';
            else if (numericSlotSize === 2) slotSizeText = 'medium';
            else if (numericSlotSize >= 4) slotSizeText = 'large';
            
            const slotData = {
              campaign_id: newCampaign.id,
              slot_position: `Back-${slotConfig.position}`,
              slot_size: slotSizeText, // Use text-based size for database constraint
              width: slotConfig.width,
              height: slotConfig.height,
              x_position: slotConfig.x,
              y_position: slotConfig.y,
              status: 'available'
            };
            console.log('Creating back slot:', slotData);
            const { data: slotData2, error: slotError } = await adSlotsAPI.create(slotData);
            if (slotError) {
              console.error('❌ Error creating back slot:', slotError);
            } else {
              console.log('✅ Successfully created back slot:', slotData2);
            }
          }
        } else {
          console.warn('⚠️ Not creating back slots. newCampaign:', !!newCampaign, 'slot_config:', selectedBackDesign?.slot_config);
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
      const sanitizedForm = getSanitizedFormData();
      const draftPayload = { ...sanitizedForm, name: trimmedName, status: 'draft' };

      if (campaign?.id) {
        const { error } = await campaignsAPI.update(campaign.id, {
          ...draftPayload,
          design_snapshot: buildCampaignDesignSnapshot(selectedFrontDesign, selectedBackDesign)
        });
        if (error) throw error;
      } else {
        const campaignData = {
          ...draftPayload,
          user_id: userId,
          route_snapshot: selectedRoute?.routes || [],
          design_snapshot: buildCampaignDesignSnapshot(selectedFrontDesign, selectedBackDesign),
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

  const formatSlotCount = (design) => {
    if (!design) return 'Slots TBD';
    const count = design.num_slots ?? design.slot_config?.length;
    return count ? `${count} slots` : 'Slots pending';
  };

  const pricingStepContent = (
    <div className="form-section">
      <div className="pricing-panel__header">
        <h3>Set Ad Slot Prices</h3>
        <p>Assign a price for each ad slot size. These rates will be offered to your clients.</p>
      </div>

      <div className="ad-slot-pricing-grid">
        {adSlotPricingOptions.map(slot => (
          <div 
            key={slot.id} 
            className="ad-slot-pricing-card"
            style={{ 
              background: slot.color,
              borderColor: slot.color 
            }}
          >
            <div className="ad-slot-pricing-info">
              <div 
                className="ad-slot-pricing-badge"
                style={{ background: slot.color }}
              >
                <span className="ad-slot-number">{slot.slots}</span>
              </div>
              <span className="ad-slot-pricing-label">{slot.label}</span>
            </div>
            <div className="price-input">
              <span>$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={slotPrices[slot.id] || ''}
                onChange={(e) => updateSlotPrice(slot.id, e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const handleNicheToggle = (nicheId) => {
    setFormData(prev => {
      const currentAllowed = prev.allowed_niches || [];
      const isCurrentlyAllowed = currentAllowed.includes(nicheId);
      
      if (isCurrentlyAllowed) {
        // Remove the niche
        return {
          ...prev,
          allowed_niches: currentAllowed.filter(id => id !== nicheId)
        };
      } else {
        // Add the niche
        return {
          ...prev,
          allowed_niches: [...currentAllowed, nicheId]
        };
      }
    });
  };

  const nicheStepContent = (
    <div className="form-section">
      <div className="section-heading">
        <div>
          <h3>Niche Selection</h3>
          <p>Choose how niches will be managed for this campaign.</p>
        </div>
      </div>
      
      {/* Display total slots from templates */}
      {totalCampaignSlots > 0 && (
        <div style={{
          padding: '16px',
          backgroundColor: '#f0f9ff',
          border: '2px solid #3b82f6',
          borderRadius: '8px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7"/>
            <rect x="14" y="3" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/>
          </svg>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e40af' }}>
              Total Ad Slots: {totalCampaignSlots}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              Front: {selectedFrontDesign?.num_slots || 0} slots • Back: {selectedBackDesign?.num_slots || 0} slots
            </div>
          </div>
        </div>
      )}

      <div className="contacts-card" style={{ borderLeft: '4px solid #8b5cf6', marginBottom: '24px' }}>
        <div className="contacts-card-header">
          <div className="contacts-card-icon" style={{ background: '#ede9fe' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b21a8" strokeWidth="2">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
              <line x1="7" y1="7" x2="7.01" y2="7"/>
            </svg>
          </div>
          <div>
            <h4>Niche Restriction Type</h4>
            <p>Select how niches are allowed in this campaign</p>
          </div>
        </div>

        <div className="contacts-selection-method">
          <button
            type="button"
            className={`selection-method-btn ${formData.niche_restriction_type === 'any' ? 'active' : ''}`}
            onClick={() => setFormData(prev => ({ 
              ...prev, 
              niche_restriction_type: 'any'
            }))}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>Any Niche Accepted</span>
          </button>
          <button
            type="button"
            className={`selection-method-btn ${formData.niche_restriction_type === 'one_per_campaign' ? 'active' : ''}`}
            onClick={() => setFormData(prev => ({ 
              ...prev, 
              niche_restriction_type: 'one_per_campaign'
            }))}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 11l3 3L22 4"/>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
            <span>One Niche Per Campaign</span>
          </button>
        </div>

        <div className="contacts-input-section">
          <p className="form-hint" style={{ marginBottom: '12px' }}>
            {formData.niche_restriction_type === 'any' 
              ? '✓ All niches are allowed. Clients from any niche can be assigned to any slot.'
              : `⚠ One niche per slot. Select exactly ${totalCampaignSlots} niches for the ${totalCampaignSlots} ad slots in this campaign.`
            }
          </p>
        </div>
      </div>
      
      {/* Niche Selection List - Only show for "one_per_campaign" mode */}
      {formData.niche_restriction_type === 'one_per_campaign' && (
        <div className="contacts-card" style={{ borderLeft: '4px solid #3b82f6' }}>
          <div className="contacts-card-header">
            <div className="contacts-card-icon" style={{ background: '#dbeafe' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1e40af" strokeWidth="2">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                <line x1="7" y1="7" x2="7.01" y2="7"/>
              </svg>
            </div>
            <div>
              <h4>Select Niches</h4>
              <p>Select exactly {totalCampaignSlots} niches - one for each ad slot</p>
            </div>
          </div>

          <div className="contacts-input-section">
            {niches.length > 0 ? (
              <>
                {/* Selection counter at the top */}
                <div className={`contacts-selected-count ${
                  (formData.allowed_niches || []).length === totalCampaignSlots ? 'success' : 'warning'
                }`} style={{ marginBottom: '16px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={
                    (formData.allowed_niches || []).length === totalCampaignSlots ? '#16a34a' : '#f59e0b'
                  } strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span>
                    {(formData.allowed_niches || []).length} of {totalCampaignSlots} niches selected
                    {(formData.allowed_niches || []).length === totalCampaignSlots 
                      ? ' • ✓ Ready to continue' 
                      : ` • ${totalCampaignSlots - (formData.allowed_niches || []).length} more needed`
                    }
                  </span>
                </div>
                
                <div className="contacts-list-redesign">
                  {niches.map(niche => (
                    <label key={niche.id} className="contact-card-item">
                      <input
                        type="checkbox"
                        checked={(formData.allowed_niches || []).includes(niche.id)}
                        onChange={() => handleNicheToggle(niche.id)}
                      />
                      <div className="contact-card-content">
                        <div className="contact-avatar" style={{ 
                          background: `hsl(${(niche.name.charCodeAt(0) * 137.5) % 360}, 70%, 85%)`
                        }}>
                          {niche.name?.charAt(0) || 'N'}
                        </div>
                        <div className="contact-info">
                          <strong>{niche.name}</strong>
                          {niche.description && <span>{niche.description}</span>}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </>
            ) : (
              <div className="contacts-empty-state">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                  <line x1="7" y1="7" x2="7.01" y2="7"/>
                </svg>
                <p>No niches available. Create niches first to use this feature.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const contactsStepContent = (
    <div className="contacts-redesign">
      {/* Recipient Selection Card */}
      <div className="contacts-card" style={{ borderLeft: '4px solid #3b82f6' }}>
        <div className="contacts-card-header">
          <div className="contacts-card-icon" style={{ background: '#dbeafe' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1e40af" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div>
            <h4>Select Recipients</h4>
            <p>Choose who will receive campaign notifications</p>
          </div>
        </div>
        
        <div className="contacts-selection-method">
          <button
            type="button"
            className={`selection-method-btn ${emailForm.sendTo === 'tag' ? 'active' : ''}`}
            onClick={() => handleEmailSendToChange('tag')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
              <line x1="7" y1="7" x2="7.01" y2="7"/>
            </svg>
            <span>By Tag</span>
          </button>
          <button
            type="button"
            className={`selection-method-btn ${emailForm.sendTo === 'individual' ? 'active' : ''}`}
            onClick={() => handleEmailSendToChange('individual')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="8.5" cy="7" r="4"/>
              <line x1="23" y1="11" x2="17" y2="11"/>
            </svg>
            <span>Individual</span>
          </button>
        </div>

        {emailForm.sendTo === 'tag' && (
          <div className="contacts-input-section">
            {availableTags.length ? (
              <select
                value={emailForm.selectedTag}
                onChange={(e) => setEmailForm(prev => ({ ...prev, selectedTag: e.target.value }))}
                className="contacts-select"
              >
                <option value="">Select a tag...</option>
                {availableTags.map(tag => (
                  <option key={tag} value={tag}>
                    {formatTagLabel(tag)}
                  </option>
                ))}
              </select>
            ) : (
              <div className="contacts-empty-state">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <p>No tags available. Add tags to contacts first.</p>
              </div>
            )}
          </div>
        )}

        {emailForm.sendTo === 'individual' && (
          <div className="contacts-input-section">
            {selectableContacts.length ? (
              <>
                <div className="contacts-list-redesign">
                  {selectableContacts.map(contact => (
                    <label key={contact.id} className="contact-card-item">
                      <input
                        type="checkbox"
                        value={contact.id}
                        checked={emailForm.selectedContacts.includes(contact.id)}
                        onChange={() => toggleEmailContact(contact.id)}
                      />
                      <div className="contact-card-content">
                        <div className="contact-avatar">
                          {contact.business_name?.charAt(0) || 'C'}
                        </div>
                        <div className="contact-info">
                          <strong>{contact.business_name}</strong>
                          <span>{contact.email}</span>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
                {emailForm.selectedContacts.length > 0 && (
                  <div className="contacts-selected-count">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <span>{emailForm.selectedContacts.length} contact{emailForm.selectedContacts.length === 1 ? '' : 's'} selected</span>
                  </div>
                )}
              </>
            ) : (
              <div className="contacts-empty-state">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                </svg>
                <p>No contacts with email addresses available.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const frontTemplates = designs.filter(
    design => !design.template_side || design.template_side === 'front'
  );
  const backTemplates = designs.filter(
    design => !design.template_side || design.template_side === 'back'
  );

  const adSlots = [
    { id: 'slots-1', label: '1', color: '#dbeafe', widthCells: 1, heightCells: 1 },
    { id: 'slots-2', label: '2', color: '#dcfce7', widthCells: 1, heightCells: 2 },
    { id: 'slots-4', label: '4', color: '#fef9c3', widthCells: 2, heightCells: 2 },
    { id: 'slots-8', label: '8', color: '#fee2e2', widthCells: 4, heightCells: 2 },
    { id: 'slots-12', label: '12', color: '#e0f2fe', widthCells: 4, heightCells: 3 },
    { id: 'slots-16', label: '16', color: '#ede9fe', widthCells: 4, heightCells: 4 }
  ];

  const renderTemplateGrid = (templates, side, selectedId) => {
    const campaignNameEntered = Boolean(formData.name?.trim());
    
    if (!templates.length) {
      return (
        <div className="empty-state">
          <p>No {side} templates available. Create templates on the Designs page.</p>
        </div>
      );
    }

    return (
      <div className={`template-selection-grid ${isTransitioning ? 'transitioning' : ''}`}>
        {templates.map(design => {
          const slotConfig = design.slot_config || [];
          
          return (
            <div
              key={design.id}
              className={`template-thumbnail-card ${selectedId === design.id ? 'selected' : ''} ${!campaignNameEntered ? 'disabled' : ''}`}
              onClick={() => handleTemplateSelect(design.id, side)}
              style={{ 
                opacity: !campaignNameEntered ? 0.5 : 1,
                cursor: !campaignNameEntered ? 'not-allowed' : 'pointer'
              }}
            >
              <div className="template-thumbnail-preview">
                <div className="saved-template-grid">
                  {slotConfig.map((slot, idx) => {
                    // Find matching slot from adSlots to get the color and label
                    let matchingSlot = adSlots.find(s => 
                      s.widthCells === slot.width && 
                      s.heightCells === slot.height
                    );
                    
                    // If no exact match, find slot with matching total cells
                    if (!matchingSlot) {
                      const totalCells = slot.width * slot.height;
                      matchingSlot = adSlots.find(s => 
                        s.widthCells * s.heightCells === totalCells
                      );
                    }
                    
                    // Calculate position and size as percentages with small gaps
                    const gapPercent = 0.5;
                    const leftPercent = (slot.x / 4) * 100 + gapPercent;
                    const topPercent = (slot.y / 8) * 100 + gapPercent;
                    const widthPercent = (slot.width / 4) * 100 - (gapPercent * 2);
                    const heightPercent = (slot.height / 8) * 100 - (gapPercent * 2);
                    
                    return (
                      <div
                        key={idx}
                        className="saved-template-slot-block"
                        style={{
                          position: 'absolute',
                          left: `${leftPercent}%`,
                          top: `${topPercent}%`,
                          width: `${widthPercent}%`,
                          height: `${heightPercent}%`,
                          background: matchingSlot?.color || '#ede9fe',
                          border: '1px solid rgba(0, 0, 0, 0.1)',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          fontWeight: '700',
                          color: '#0f172a'
                        }}
                      >
                        {matchingSlot?.label || ''}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="template-thumbnail-info">
                <strong>{design.name}</strong>
                <p>{design.card_size} • {formatSlotCount(design)}</p>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const templateStepContent = (
    <div className="form-section">
      {/* Campaign Name Input - Always visible at top */}
      <div className="campaign-modal__form-grid" style={{ marginBottom: '32px' }}>
        <div className="form-group">
          <label>Campaign Name *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Minneapolis Fall 2025"
            required
            autoFocus={!campaign?.id}
          />
          {!formData.name?.trim() && (
            <p className="form-hint" style={{ color: '#f59e0b', marginTop: '8px' }}>
              Please enter a campaign name to select templates
            </p>
          )}
        </div>
      </div>

      {templateSubStep === 'front' && (
        <>
          <div className="section-heading" style={{ marginBottom: '1px' }}>
            <div>
              <h3>Select Front Template</h3>
              <p>Choose a template for the front of your campaign mailer.</p>
            </div>
          </div>
          {renderTemplateGrid(frontTemplates, 'front', formData.front_design_id)}
        </>
      )}
      
      {templateSubStep === 'back' && (
        <>
          <div className="section-heading">
            <div>
              <h3>Select Back Template</h3>
              <p>Choose a template for the back of your campaign mailer.</p>
            </div>
          </div>
          {renderTemplateGrid(backTemplates, 'back', formData.back_design_id)}
        </>
      )}
    </div>
  );

  const routeStepContent = (
    <div className="form-section">
      <div className="section-heading">
        <div>
          <h3>Route Selection</h3>
          <p>Choose which saved route you want to mail this campaign along.</p>
        </div>
      </div>
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
      {selectedRoute ? (
        <div className="route-stats-container">
          <div className="route-stats-header">
            <h4>{selectedRoute.name}</h4>
            <p>Complete route details for your campaign</p>
          </div>
          <div className="route-stats-grid">
            <div className="route-stat-card">
              <div className="route-stat-icon" style={{ background: '#dbeafe' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1e40af" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </div>
              <div className="route-stat-content">
                <span className="route-stat-label">Total Households</span>
                <strong className="route-stat-value">{(selectedRoute.total_households || 0).toLocaleString()}</strong>
              </div>
            </div>
            
            <div className="route-stat-card">
              <div className="route-stat-icon" style={{ background: '#dcfce7' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
              </div>
              <div className="route-stat-content">
                <span className="route-stat-label">Number of Routes</span>
                <strong className="route-stat-value">{(selectedRoute.routes?.length || 0).toLocaleString()}</strong>
              </div>
            </div>
            
            <div className="route-stat-card">
              <div className="route-stat-icon" style={{ background: '#fef9c3' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a16207" strokeWidth="2">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                  <line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
              </div>
              <div className="route-stat-content">
                <span className="route-stat-label">Total Cost</span>
                <strong className="route-stat-value">${(selectedRoute.total_cost || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              </div>
            </div>
            
            <div className="route-stat-card">
              <div className="route-stat-icon" style={{ background: '#fee2e2' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <line x1="9" y1="9" x2="15" y2="15"/>
                  <line x1="15" y1="9" x2="9" y2="15"/>
                </svg>
              </div>
              <div className="route-stat-content">
                <span className="route-stat-label">Cost per Piece</span>
                <strong className="route-stat-value">
                  ${selectedRoute.total_households > 0 
                    ? (selectedRoute.total_cost / selectedRoute.total_households).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : '0.00'}
                </strong>
              </div>
            </div>

            <div className="route-stat-card">
              <div className="route-stat-icon" style={{ background: '#e0f2fe' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0369a1" strokeWidth="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                  <line x1="12" y1="22.08" x2="12" y2="12"/>
                </svg>
              </div>
              <div className="route-stat-content">
                <span className="route-stat-label">Total Pieces</span>
                <strong className="route-stat-value">{(selectedRoute.total_households || 0).toLocaleString()}</strong>
              </div>
            </div>

            <div className="route-stat-card">
              <div className="route-stat-icon" style={{ background: '#ede9fe' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6b21a8" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <div className="route-stat-content">
                <span className="route-stat-label">Est. Delivery Time</span>
                <strong className="route-stat-value">{selectedRoute.routes?.length ? Math.ceil(selectedRoute.routes.length / 5) : 0} days</strong>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p className="form-hint">Save a route in the Routes section to preview its details.</p>
      )}
    </div>
  );

  const communicationsStepContent = (
    <div className="contacts-step-with-tabs">
      {/* Tab Navigation */}
      <div className="contacts-tabs">
        <button
          type="button"
          className={`contacts-tab ${contactsTabIndex === 0 ? 'active' : ''}`}
          onClick={() => setContactsTabIndex(0)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <span>Select Recipients</span>
        </button>
        <button
          type="button"
          className={`contacts-tab ${contactsTabIndex === 1 ? 'active' : ''}`}
          onClick={() => setContactsTabIndex(1)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
          <span>Email Template</span>
        </button>
        <button
          type="button"
          className={`contacts-tab ${contactsTabIndex === 2 ? 'active' : ''}`}
          onClick={() => setContactsTabIndex(2)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          <span>Send Schedule</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="contacts-tab-content">
        {contactsTabIndex === 0 && contactsStepContent}
        {contactsTabIndex === 1 && (
          <div className="contacts-redesign">
            <div className="contacts-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
              <div className="contacts-card-header">
                <div className="contacts-card-icon" style={{ background: '#ede9fe' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b21a8" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                </div>
                <div>
                  <h4>Email Template</h4>
                  <p>Select and customize your email message</p>
                </div>
              </div>

              <div className="contacts-input-section">
                <label className="contacts-label">Choose Template</label>
                {emailTemplates.length ? (
                  <select
                    value={emailForm.templateId}
                    onChange={(e) => handleTemplateChange(e.target.value)}
                    className="contacts-select"
                  >
                    <option value="">Select an email template...</option>
                    {emailTemplates.map(template => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="contacts-empty-state">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                    <p>No email templates available. Create one in Email Marketing.</p>
                  </div>
                )}
              </div>

              {emailForm.templateId && (
                <>
                  <div className="contacts-input-section">
                    <label className="contacts-label">Subject Line</label>
                    <input
                      type="text"
                      value={emailForm.subject}
                      onChange={(e) => setEmailForm(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="Enter email subject..."
                      className="contacts-input"
                    />
                  </div>
                  <div className="contacts-input-section">
                    <label className="contacts-label">Email Message</label>
                    <textarea
                      rows={4}
                      value={emailForm.body_html}
                      onChange={(e) => setEmailForm(prev => ({ ...prev, body_html: e.target.value }))}
                      placeholder="Customize your email message..."
                      className="contacts-textarea"
                    />
                    <p className="contacts-hint">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="16" x2="12" y2="12"/>
                        <line x1="12" y1="8" x2="12.01" y2="8"/>
                      </svg>
                      Changes only apply to this campaign
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        {contactsTabIndex === 2 && (
          <div className="contacts-redesign">
            <div className="contacts-card" style={{ borderLeft: '4px solid #f59e0b' }}>
              <div className="contacts-card-header">
                <div className="contacts-card-icon" style={{ background: '#fef3c7' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                </div>
                <div>
                  <h4>Send Schedule</h4>
                  <p>Choose when to send the email</p>
                </div>
              </div>

              <div className="contacts-selection-method">
                <button
                  type="button"
                  className={`selection-method-btn ${emailForm.sendNow ? 'active' : ''}`}
                  onClick={() => handleWhenToSendChange('send_now')}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                  <span>Send Now</span>
                </button>
                <button
                  type="button"
                  className={`selection-method-btn ${!emailForm.sendNow ? 'active' : ''}`}
                  onClick={() => handleWhenToSendChange('schedule')}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  <span>Schedule</span>
                </button>
              </div>

              {!emailForm.sendNow && (
                <div className="contacts-input-section">
                  <label className="contacts-label">Date & Time</label>
                  <input
                    type="datetime-local"
                    min={scheduleMinValue}
                    value={emailForm.scheduledAt}
                    onChange={(e) => handleScheduleChange(e.target.value)}
                    className="contacts-input"
                  />
                  {!emailForm.scheduledAt && (
                    <p className="contacts-hint">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="16" x2="12" y2="12"/>
                        <line x1="12" y1="8" x2="12.01" y2="8"/>
                      </svg>
                      Select when the email should be sent
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const steps = ['Templates', 'Pricing', 'Niches', 'Route', 'Contacts'];
  const stepContents = [
    templateStepContent,
    pricingStepContent,
    nicheStepContent,
    routeStepContent,
    communicationsStepContent
  ];
  const isTemplateStepComplete = Boolean(
    formData.name?.trim() && formData.front_design_id && formData.back_design_id
  );
  const isNicheStepComplete = 
    formData.niche_restriction_type === 'any' || 
    (formData.niche_restriction_type === 'one_per_campaign' && (formData.allowed_niches || []).length === totalCampaignSlots);
  const isRouteStepComplete = Boolean(formData.saved_route_id);

  const canAdvanceFromStep = (stepIndex) => {
    if (stepIndex === 0) return isTemplateStepComplete;
    if (stepIndex === 2) return isNicheStepComplete;
    if (stepIndex === 3) return isRouteStepComplete;
    return true;
  };

  const handleNextStep = () => {
    if (activeStep >= steps.length - 1) return;
    if (!canAdvanceFromStep(activeStep)) return;
    setActiveStep((prev) => prev + 1);
  };

  const handlePrevStep = () => {
    // If on templates step and viewing back templates, go back to front templates
    if (activeStep === 0 && templateSubStep === 'back') {
      setTemplateSubStep('front');
      return;
    }
    // If going back to templates step from another step, reset to front selection
    if (activeStep > 0) {
      setTemplateSubStep('front');
    }
    setActiveStep((prev) => Math.max(prev - 1, 0));
  };

  const handleJumpToStep = (index) => {
    if (index === activeStep) return;
    if (index > activeStep && !canAdvanceFromStep(activeStep)) return;
    setActiveStep(index);
  };

  const currentStepContent = stepContents[activeStep];

  const previewLayout = mockDisplayCounts || cloneLayout(layoutCaps);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content campaign-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{campaign ? 'Edit Campaign' : 'New Campaign'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-steps">
          {steps.map((step, index) => (
            <button
              type="button"
              key={step}
              className={`step ${activeStep === index ? 'active' : ''}`}
              onClick={() => handleJumpToStep(index)}
              disabled={index > activeStep && !canAdvanceFromStep(activeStep)}
            >
              {step}
            </button>
          ))}
        </div>

        <div className="campaign-modal__body">
          <div className="campaign-modal__step-content">
            {currentStepContent}
          </div>
        </div>

        <div className="modal-footer">
          <div className="modal-footer__navigation">
            <button
              type="button"
              className="btn-back"
              onClick={handlePrevStep}
              disabled={activeStep === 0 && templateSubStep === 'front'}
            >
              Back
            </button>
            <button
              className="btn-draft"
              onClick={handleSaveDraft}
              disabled={savingDraft || !formData.name?.trim()}
            >
              {savingDraft ? 'Saving draft...' : 'Save draft'}
            </button>
            {activeStep < steps.length - 1 && (
              <button
                type="button"
                className="btn-next"
                onClick={handleNextStep}
                disabled={!canAdvanceFromStep(activeStep)}
              >
                Next step
              </button>
            )}
            {activeStep === steps.length - 1 && (
              <button className="btn-create" onClick={handleSubmit} disabled={loading}>
                {loading ? 'Saving...' : campaign ? 'Save Changes' : 'Create Campaign'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Slot Assignment Component
function SlotAssignment({ slots, contacts, niches, uniqueNichePerSlot, userId, onUpdate }) {
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);
  const [contactAds, setContactAds] = useState([]);
  const [selectedAd, setSelectedAd] = useState(null);
  const [showAdUploader, setShowAdUploader] = useState(false);

  const usedNiches = uniqueNichePerSlot
    ? new Set(slots.filter(s => s.contact_id).map(s => contacts.find(c => c.id === s.contact_id)?.niche_id).filter(Boolean))
    : new Set();

  const handleSlotClick = (slot) => {
    if (slot.status === 'available' || slot.status === 'reserved') {
      setSelectedSlot(slot);
      setSelectedContact(null);
      setContactAds([]);
      setSelectedAd(null);
      setShowAdUploader(false);
    }
  };

  const handleContactSelect = async (contact) => {
    setSelectedContact(contact);
    const { data } = await clientAds.getByContact(contact.id);
    setContactAds(data || []);
    setSelectedAd(null);
    setShowAdUploader(false);
  };

  const handleAdUpload = async (file) => {
    if (!selectedContact?.id || !userId) return;

    // Upload to storage
    const { data: uploadData, error: uploadError } = await storage.uploadClientAd(
      userId,
      file,
      selectedContact.id
    );

    if (uploadError) {
      throw new Error('Failed to upload image');
    }

    // Save to database
    const { data, error } = await clientAds.create({
      contact_id: selectedContact.id,
      user_id: userId,
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
    if (!selectedSlot || !selectedContact || !selectedAd) return;

    const { error } = await adSlotsAPI.assignClient(selectedSlot.id, selectedContact.id, selectedAd.id);
    if (!error) {
      onUpdate();
      setSelectedSlot(null);
      setSelectedContact(null);
      setContactAds([]);
      setSelectedAd(null);
      setShowAdUploader(false);
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

          {selectedContact && (
            <>
            <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label>Select Ad</label>
                  <button
                    type="button"
                    className="btn-primary btn-sm"
                    onClick={() => setShowAdUploader(!showAdUploader)}
                    disabled={contactAds.length >= 8}
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

                {contactAds.length > 0 ? (
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
                ) : !showAdUploader && (
                  <p className="form-hint">No ads available. Upload one above.</p>
          )}
              </div>

          <button
            className="btn-primary"
            onClick={handleAssign}
            disabled={!selectedContact || !selectedAd}
          >
            Assign to Slot
          </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default Campaigns;

