import React, { useState, useEffect, useMemo, useRef } from 'react';
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

const US_STATES = [
  { value: 'AL', label: 'Alabama' }, { value: 'AK', label: 'Alaska' }, { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' }, { value: 'CA', label: 'California' }, { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' }, { value: 'DE', label: 'Delaware' }, { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' }, { value: 'HI', label: 'Hawaii' }, { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' }, { value: 'IN', label: 'Indiana' }, { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' }, { value: 'KY', label: 'Kentucky' }, { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' }, { value: 'MD', label: 'Maryland' }, { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' }, { value: 'MN', label: 'Minnesota' }, { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' }, { value: 'MT', label: 'Montana' }, { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' }, { value: 'NH', label: 'New Hampshire' }, { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' }, { value: 'NY', label: 'New York' }, { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' }, { value: 'OH', label: 'Ohio' }, { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' }, { value: 'PA', label: 'Pennsylvania' }, { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' }, { value: 'SD', label: 'South Dakota' }, { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' }, { value: 'UT', label: 'Utah' }, { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' }, { value: 'WA', label: 'Washington' }, { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' }, { value: 'WY', label: 'Wyoming' }
];

const getEmptyCampaignFormData = () => ({
  name: '',
  city: '',
  state: '',
  saved_route_id: null, // Kept for backward compatibility
  saved_route_ids: [], // Array of route IDs for multiple route selection
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

  // Handle route IDs: if campaign has saved_route_id, convert to array format
  // If route_snapshot exists but no saved_route_id, we can't determine which routes were selected
  // So we'll start with an empty array and let user re-select
  const saved_route_ids = campaign.saved_route_ids || (campaign.saved_route_id ? [campaign.saved_route_id] : []);

  return {
    ...base,
    design_id: frontId || base.design_id,
    front_design_id: frontId,
    back_design_id: backId,
    saved_route_ids
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
  const [detailViewActiveTab, setDetailViewActiveTab] = useState('settings');
  
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;
  console.log('🏠 [Campaigns] RENDER #' + renderCountRef.current, {
    campaignsCount: campaigns.length,
    showDetailView,
    detailViewCampaignId: detailViewCampaign?.id,
    detailViewActiveTab,
    timestamp: new Date().toISOString()
  });

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
    console.log('🚪 [Campaigns] Opening detail view:', {
      campaignId: campaign?.id,
      campaignName: campaign?.name
    });
    setDetailViewCampaign(campaign);
    setShowDetailView(true);
    // Always open to settings tab when clicking on a campaign
    setDetailViewActiveTab('settings');
  };

  const handleCloseDetailView = async () => {
    console.log('🚪 [Campaigns] Closing detail view');
    setShowDetailView(false);
    setDetailViewCampaign(null);
    setDetailViewActiveTab('settings');
    
    // Refresh campaigns list when closing detail view to show any changes
    console.log('🔄 [Campaigns] Refreshing campaigns list after closing detail view');
    await loadCampaigns();
  };

  const handleDetailViewUpdate = async () => {
    console.log('🔄 [Campaigns] handleDetailViewUpdate called:', {
      detailViewCampaignId: detailViewCampaign?.id,
      detailViewCampaignName: detailViewCampaign?.name,
      showDetailView
    });
    
    // When detail view is open, only update the detail campaign to avoid blinking
    // The campaigns list is hidden anyway, so no need to update it
    if (detailViewCampaign?.id) {
      const { data, error } = await campaignsAPI.getById(detailViewCampaign.id);
      
      if (!error && data) {
        console.log('📝 [Campaigns] Updating detailViewCampaign only (single state update)');
        setDetailViewCampaign(data);
      }
      
      console.log('✅ [Campaigns] State update completed');
    } else {
      // If no detail view is open, reload campaigns for the cards view
      await loadCampaigns();
    }
  };

  const handleDeleteCampaign = async (campaignId) => {
    if (confirm('Are you sure you want to delete this campaign?')) {
      const { error } = await campaignsAPI.delete(campaignId);
      if (!error) {
        setCampaigns(campaigns.filter(c => c.id !== campaignId));
        
        // Close detail view if the deleted campaign is currently being viewed
        if (detailViewCampaign?.id === campaignId) {
          handleCloseDetailView();
        }
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
          key={detailViewCampaign.id}
          campaign={detailViewCampaign}
          isOpen={showDetailView}
          onClose={handleCloseDetailView}
          onUpdate={handleDetailViewUpdate}
          activeTab={detailViewActiveTab}
          onTabChange={setDetailViewActiveTab}
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
    selectedContacts: [],
    sendNow: true,
    scheduledAt: '',
    subject: '',
    body_html: '',
    body_text: ''
  });
  const [contactTagFilter, setContactTagFilter] = useState('');
  const [nicheFilter, setNicheFilter] = useState('');
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
    // Both new and editing campaigns start at basic info step
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

  // Handle multiple routes
  const selectedRouteIds = formData.saved_route_ids || [];
  const selectedRoutes = savedRoutes.filter(r => selectedRouteIds.includes(r.id));
  const selectedRoute = selectedRoutes.length === 1 ? selectedRoutes[0] : null; // For backward compatibility where single route is expected
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

  // Smart filtering for contacts: checked contacts always show, unchecked contacts filtered by multiple fields
  const getFilteredContacts = () => {
    if (!contactTagFilter.trim()) {
      return selectableContacts;
    }

    // Parse comma-separated filter terms
    const filterTerms = contactTagFilter.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
    if (filterTerms.length === 0) {
      return selectableContacts;
    }

    return selectableContacts.filter(contact => {
      // Always show checked contacts
      if (emailForm.selectedContacts.includes(contact.id)) {
        return true;
      }

      // Collect all searchable fields: tags, stage, niche, business name, temperature, city
      const contactTags = [
        contact.stage,
        ...(Array.isArray(contact.tags) ? contact.tags : [])
      ].filter(Boolean).map(t => t.toLowerCase());

      const nicheName = contact.niche?.name?.toLowerCase() || '';
      const businessName = contact.business_name?.toLowerCase() || '';
      const temperature = contact.temperature?.toLowerCase() || '';
      const city = contact.city?.toLowerCase() || '';

      // Show contact if any filter term matches any searchable field
      return filterTerms.some(filterTerm => {
        const tagMatch = contactTags.some(contactTag => contactTag.includes(filterTerm));
        const nicheMatch = nicheName && nicheName.includes(filterTerm);
        const businessMatch = businessName && businessName.includes(filterTerm);
        const temperatureMatch = temperature && temperature.includes(filterTerm);
        const cityMatch = city && city.includes(filterTerm);
        
        return tagMatch || nicheMatch || businessMatch || temperatureMatch || cityMatch;
      });
    });
  };

  const filteredSelectableContacts = getFilteredContacts();

  // Filter niches based on search term - always show selected niches
  const getFilteredNiches = () => {
    if (!nicheFilter.trim()) {
      return niches;
    }

    const filterTerm = nicheFilter.trim().toLowerCase();
    const selectedNicheIds = formData.allowed_niches || [];

    return niches.filter(niche => {
      // Always show selected niches
      if (selectedNicheIds.includes(niche.id)) {
        return true;
      }

      // Filter by name or description
      const nameMatch = niche.name?.toLowerCase().includes(filterTerm);
      const descriptionMatch = niche.description?.toLowerCase().includes(filterTerm);
      
      return nameMatch || descriptionMatch;
    });
  };

  const filteredNiches = getFilteredNiches();

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
    // Format mail_date for database: convert to YYYY-MM-DD format or null
    let mailDate = null;
    if (rest.mail_date) {
      const mailDateStr = String(rest.mail_date).trim();
      if (mailDateStr !== '') {
        // If it's already in YYYY-MM-DD format (from date input), use it directly
        if (/^\d{4}-\d{2}-\d{2}$/.test(mailDateStr)) {
          mailDate = mailDateStr;
        } else {
          // Otherwise, try to parse and format it
          const date = new Date(mailDateStr);
          if (!isNaN(date.getTime())) {
            mailDate = date.toISOString().split('T')[0]; // YYYY-MM-DD format
          }
        }
      }
    }
    rest.mail_date = mailDate;
    
    // Convert empty strings to null for city and state (better for database)
    rest.city = rest.city && rest.city.trim() !== '' ? rest.city.trim() : null;
    rest.state = rest.state && rest.state.trim() !== '' ? rest.state.trim() : null;
    
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

    if (!formData.saved_route_ids || formData.saved_route_ids.length === 0 || !formData.front_design_id || !formData.back_design_id) {
      alert('Please select at least one route and templates for both sides of the card.');
      return;
    }

    const sanitizedForm = getSanitizedFormData();
    setLoading(true);

    try {
      if (campaign?.id) {
        // For updates, combine routes if multiple are selected
        let updateData = {
          ...sanitizedForm,
          name: trimmedName,
          design_snapshot: buildCampaignDesignSnapshot(selectedFrontDesign, selectedBackDesign)
        };

        // If routes are selected, update route_snapshot and total_pieces
        if (formData.saved_route_ids && formData.saved_route_ids.length > 0) {
          const combinedRoutes = selectedRoutes.reduce((acc, route) => {
            return [...acc, ...(route.routes || [])];
          }, []);
          
          const combinedTotalHouseholds = selectedRoutes.reduce((sum, route) => {
            return sum + (route.total_households || 0);
          }, 0);

          updateData = {
            ...updateData,
            saved_route_id: formData.saved_route_ids[0] || null, // Keep first route ID for backward compatibility
            route_snapshot: combinedRoutes,
            total_pieces: combinedTotalHouseholds
          };
        }

        const { error } = await campaignsAPI.update(campaign.id, updateData);
        if (error) throw error;
      } else {
        // Combine routes from all selected routes
        const combinedRoutes = selectedRoutes.reduce((acc, route) => {
          return [...acc, ...(route.routes || [])];
        }, []);
        
        const combinedTotalHouseholds = selectedRoutes.reduce((sum, route) => {
          return sum + (route.total_households || 0);
        }, 0);

        const campaignData = {
          ...sanitizedForm,
          name: trimmedName,
          user_id: userId,
          saved_route_id: formData.saved_route_ids[0] || null, // Keep first route ID for backward compatibility
          route_snapshot: combinedRoutes,
          design_snapshot: buildCampaignDesignSnapshot(selectedFrontDesign, selectedBackDesign),
          total_pieces: combinedTotalHouseholds,
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
        // For draft updates, combine routes if multiple are selected
        let draftUpdateData = {
          ...draftPayload,
          design_snapshot: buildCampaignDesignSnapshot(selectedFrontDesign, selectedBackDesign)
        };

        // If routes are selected, update route_snapshot and total_pieces
        if (formData.saved_route_ids && formData.saved_route_ids.length > 0) {
          const combinedRoutes = selectedRoutes.reduce((acc, route) => {
            return [...acc, ...(route.routes || [])];
          }, []);
          
          const combinedTotalHouseholds = selectedRoutes.reduce((sum, route) => {
            return sum + (route.total_households || 0);
          }, 0);

          draftUpdateData = {
            ...draftUpdateData,
            saved_route_id: formData.saved_route_ids[0] || null, // Keep first route ID for backward compatibility
            route_snapshot: combinedRoutes,
            total_pieces: combinedTotalHouseholds
          };
        }

        const { error } = await campaignsAPI.update(campaign.id, draftUpdateData);
        if (error) throw error;
      } else {
        // Combine routes from all selected routes (for draft)
        const combinedRoutes = selectedRoutes.reduce((acc, route) => {
          return [...acc, ...(route.routes || [])];
        }, []);
        
        const combinedTotalHouseholds = selectedRoutes.reduce((sum, route) => {
          return sum + (route.total_households || 0);
        }, 0);

        const campaignData = {
          ...draftPayload,
          user_id: userId,
          saved_route_id: formData.saved_route_ids?.[0] || null, // Keep first route ID for backward compatibility
          route_snapshot: combinedRoutes,
          design_snapshot: buildCampaignDesignSnapshot(selectedFrontDesign, selectedBackDesign),
          total_pieces: combinedTotalHouseholds,
          status: 'draft'
        };

        const { data: newCampaign, error } = await campaignsAPI.create(campaignData);
        if (error) throw error;

        // Lock all selected routes (for draft)
        if (formData.saved_route_ids && formData.saved_route_ids.length > 0) {
          await Promise.all(
            formData.saved_route_ids.map(routeId => savedRoutesAPI.lock(routeId))
          );
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

  const createEmailCampaignIfConfigured = async (campaignId) => {
    if (!emailForm.templateId) return;

    const template = emailTemplates.find(t => t.id === emailForm.templateId);
    if (!template) return;

    // Get recipients from selected contacts
    const recipients = emailForm.selectedContacts.filter(Boolean);
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

  const handleRouteToggle = (routeId) => {
    setFormData(prev => {
      const currentRoutes = prev.saved_route_ids || [];
      const isCurrentlySelected = currentRoutes.includes(routeId);
      
      if (isCurrentlySelected) {
        // Remove the route
        return {
          ...prev,
          saved_route_ids: currentRoutes.filter(id => id !== routeId),
          saved_route_id: null // Clear single route ID for backward compatibility
        };
      } else {
        // Add the route
        const updatedRoutes = [...currentRoutes, routeId];
        return {
          ...prev,
          saved_route_ids: updatedRoutes,
          saved_route_id: updatedRoutes[0] || null // Set first route ID for backward compatibility
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
                {/* Search bar */}
                <div style={{ marginBottom: '16px' }}>
                  <label className="contacts-label">Search Niches</label>
                  <input
                    type="text"
                    placeholder="Search by name or description..."
                    value={nicheFilter}
                    onChange={(e) => setNicheFilter(e.target.value)}
                    className="contacts-input"
                  />
                  <p className="form-hint" style={{ marginTop: '8px', fontSize: '12px' }}>
                    ℹ️ Search by niche name or description. Selected niches always show.
                  </p>
                </div>

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
                
                {filteredNiches.length > 0 ? (
                  <div className="contacts-list-redesign">
                    {filteredNiches.map(niche => (
                    <label key={niche.id} className="contact-card-item">
                      <input
                        type="checkbox"
                        checked={(formData.allowed_niches || []).includes(niche.id)}
                        onChange={() => handleNicheToggle(niche.id)}
                      />
                      <div className="contact-card-content">
                        <div className="contact-info">
                          <strong>{niche.name}</strong>
                          {niche.description && <span>{niche.description}</span>}
                        </div>
                      </div>
                    </label>
                    ))}
                  </div>
                ) : (
                  <div className="contacts-empty-state">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="16" x2="12" y2="16"/>
                      <line x1="12" y1="12" x2="12" y2="8"/>
                    </svg>
                    <p>No niches match your search.</p>
                    <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '8px' }}>
                      Try a different search term or clear the filter.
                    </p>
                  </div>
                )}
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
              <polyline points="23 11 17 11"/>
            </svg>
          </div>
          <div>
            <h4>Select Contacts</h4>
            <p>Choose contacts to include in this campaign</p>
          </div>
        </div>
        
        {/* Tag Filter Input */}
        <div className="contacts-input-section">
          <label className="contacts-label">Filter Contacts (comma-separated)</label>
          <input
            type="text"
            placeholder="e.g. plumber, warm, chicago, lead, window cleaning"
            value={contactTagFilter}
            onChange={(e) => setContactTagFilter(e.target.value)}
            className="contacts-input"
          />
          <p className="form-hint" style={{ marginTop: '8px', fontSize: '12px' }}>
            ℹ️ Search by business name, tags, niche, temperature, or city. Checked contacts always show.
          </p>
        </div>

        {/* Contacts List */}
        <div className="contacts-input-section">
          {filteredSelectableContacts.length > 0 ? (
            <>
              <div className="contacts-list-redesign" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {filteredSelectableContacts.map(contact => (
                  <label key={contact.id} className="contact-card-item">
                    <input
                      type="checkbox"
                      value={contact.id}
                      checked={emailForm.selectedContacts.includes(contact.id)}
                      onChange={() => toggleEmailContact(contact.id)}
                    />
                    <div className="contact-card-content">
                      <div className="contact-info">
                        <strong>{contact.business_name}</strong>
                        <span>
                          {contact.email}
                          {contact.tags && contact.tags.length > 0 && (
                            <span style={{ color: '#94a3b8', fontSize: '11px', marginLeft: '8px' }}>
                              {contact.tags.slice(0, 3).join(', ')}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              {emailForm.selectedContacts.length > 0 && (
                <div className="contacts-selected-count" style={{ marginTop: '12px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span>{emailForm.selectedContacts.length} contact{emailForm.selectedContacts.length === 1 ? '' : 's'} selected</span>
                </div>
              )}
            </>
          ) : selectableContacts.length === 0 ? (
            <div className="contacts-empty-state">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
              </svg>
              <p>No contacts with email addresses available.</p>
            </div>
          ) : (
            <div className="contacts-empty-state">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="16"/>
                <line x1="12" y1="12" x2="12" y2="8"/>
              </svg>
              <p>No contacts match the current tag filter.</p>
              <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '8px' }}>
                Try different tags or clear the filter.
              </p>
            </div>
          )}
        </div>
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
              className={`template-thumbnail-card ${selectedId === design.id ? 'selected' : ''}`}
              onClick={() => handleTemplateSelect(design.id, side)}
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

  const basicInfoStepContent = (
    <div className="form-section">
      <div className="section-heading" style={{ marginBottom: '24px' }}>
        <div>
          <h3>Basic Campaign Information</h3>
          <p>Start by providing the essential details for your campaign.</p>
        </div>
      </div>
      
      {/* Campaign Config Grid - Compact 2x2 Layout */}
      <div className="campaign-modal__form-grid" style={{ marginBottom: '0', display: 'flex', flexDirection: 'column', gap: '0px' }}>
        
        {/* Row 1: Name (Approx 65%) & Mail Date (Approx 35%) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '12px', marginBottom: '12px' }}>
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
          </div>
          <div className="form-group">
            <label>Mail Date <span style={{fontWeight: 'normal', color: '#94a3b8'}}>(Optional)</span></label>
            <input
              type="date"
              value={formData.mail_date 
                ? (typeof formData.mail_date === 'string' && formData.mail_date.includes('T')
                    ? formData.mail_date.split('T')[0]
                    : formData.mail_date)
                : ''}
              onChange={(e) => setFormData({ ...formData, mail_date: e.target.value })}
            />
          </div>
        </div>

        {/* Row 2: City (Grow) & State (Fixed) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '12px' }}>
          <div className="form-group">
            <label>Target City <span style={{fontWeight: 'normal', color: '#94a3b8'}}>(Optional)</span></label>
            <input
              type="text"
              value={formData.city || ''}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="Enter city..."
            />
          </div>
          <div className="form-group">
            <label>State <span style={{fontWeight: 'normal', color: '#94a3b8'}}>(Optional)</span></label>
            <select
              value={formData.state || ''}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            >
              <option value="">Select State...</option>
              {US_STATES.map((state) => (
                <option key={state.value} value={state.value}>
                  {state.value} - {state.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  const templateStepContent = (
    <div className="form-section">
      {templateSubStep === 'front' && (
        <>
          <div className="section-heading" style={{ marginBottom: '12px' }}>
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
          <div className="section-heading" style={{ marginBottom: '12px' }}>
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

  // Calculate combined stats from all selected routes
  const combinedRouteStats = useMemo(() => {
    if (selectedRoutes.length === 0) return null;
    
    const totalHouseholds = selectedRoutes.reduce((sum, route) => sum + (route.total_households || 0), 0);
    const totalCost = selectedRoutes.reduce((sum, route) => sum + (route.total_cost || 0), 0);
    const totalRoutes = selectedRoutes.reduce((sum, route) => sum + (route.routes?.length || 0), 0);
    const routeNames = selectedRoutes.map(r => r.name).join(', ');
    
    return {
      totalHouseholds,
      totalCost,
      totalRoutes,
      routeNames,
      costPerPiece: totalHouseholds > 0 ? totalCost / totalHouseholds : 0,
      estDeliveryDays: totalRoutes ? Math.ceil(totalRoutes / 5) : 0
    };
  }, [selectedRoutes]);

  const routeStepContent = (
    <div className="form-section">
      <div className="section-heading">
        <div>
          <h3>Route Selection</h3>
          <p>Select one or more saved routes for this campaign. You can combine multiple routes to expand your mailing coverage.</p>
        </div>
      </div>
      
      {/* Selection counter */}
      {selectedRouteIds.length > 0 && (
        <div className={`contacts-selected-count ${selectedRouteIds.length > 0 ? 'success' : 'warning'}`} style={{ marginBottom: '16px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span>
            {selectedRouteIds.length} route{selectedRouteIds.length === 1 ? '' : 's'} selected
            {selectedRouteIds.length > 0 ? ' • ✓ Ready to continue' : ' • Select at least one route'}
          </span>
        </div>
      )}

      {/* Route selection list */}
      <div className="contacts-card" style={{ borderLeft: '4px solid #3b82f6', marginBottom: '24px' }}>
        <div className="contacts-card-header">
          <div className="contacts-card-icon" style={{ background: '#dbeafe' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1e40af" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <div>
            <h4>Select Routes</h4>
            <p>Choose which routes to include in this campaign</p>
          </div>
        </div>

        <div className="contacts-input-section">
          {savedRoutes.filter(r => !r.is_locked).length > 0 ? (
            <>
              <div className="contacts-list-redesign" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {savedRoutes.filter(r => !r.is_locked).map(route => (
                  <label key={route.id} className="contact-card-item">
                    <input
                      type="checkbox"
                      checked={selectedRouteIds.includes(route.id)}
                      onChange={() => handleRouteToggle(route.id)}
                    />
                    <div className="contact-card-content">
                      <div className="contact-avatar" style={{ 
                        background: `hsl(${(route.name.charCodeAt(0) * 137.5) % 360}, 70%, 85%)`
                      }}>
                        {route.name?.charAt(0) || 'R'}
                      </div>
                      <div className="contact-info">
                        <strong>{route.name}</strong>
                        <span>
                          {(route.total_households || 0).toLocaleString()} households
                          {route.routes?.length && ` • ${route.routes.length} delivery route${route.routes.length === 1 ? '' : 's'}`}
                          {route.total_cost && ` • $${route.total_cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        </span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              {selectedRouteIds.length === 0 && (
                <p className="form-hint" style={{ marginTop: '12px', textAlign: 'center' }}>
                  Select at least one route to continue
                </p>
              )}
            </>
          ) : (
            <div className="contacts-empty-state">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              <p>No available routes. Save a route in the Routes section first.</p>
            </div>
          )}
        </div>
      </div>

      {combinedRouteStats ? (
        <div className="route-stats-container">
          <div className="route-stats-header">
            <h4>{selectedRoutes.length === 1 ? selectedRoutes[0].name : `${selectedRoutes.length} Routes Selected`}</h4>
            <p>{selectedRoutes.length === 1 ? 'Complete route details for your campaign' : `Combined statistics from ${selectedRoutes.length} routes`}</p>
            {selectedRoutes.length > 1 && (
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                {combinedRouteStats.routeNames}
              </p>
            )}
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
                <strong className="route-stat-value">{combinedRouteStats.totalHouseholds.toLocaleString()}</strong>
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
                <strong className="route-stat-value">{combinedRouteStats.totalRoutes.toLocaleString()}</strong>
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
                <strong className="route-stat-value">${combinedRouteStats.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
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
                  ${combinedRouteStats.costPerPiece.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                <strong className="route-stat-value">{combinedRouteStats.totalHouseholds.toLocaleString()}</strong>
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
                <strong className="route-stat-value">{combinedRouteStats.estDeliveryDays} days</strong>
              </div>
            </div>
          </div>
        </div>
      ) : selectedRouteIds.length === 0 ? (
        <p className="form-hint">Select one or more routes above to see combined statistics.</p>
      ) : null}
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

  const steps = ['Basic Info', 'Templates', 'Pricing', 'Niches', 'Route', 'Contacts'];
  const stepContents = [
    basicInfoStepContent,
    templateStepContent,
    pricingStepContent,
    nicheStepContent,
    routeStepContent,
    communicationsStepContent
  ];
  const isBasicInfoStepComplete = Boolean(formData.name?.trim());
  const isTemplateStepComplete = Boolean(
    formData.front_design_id && formData.back_design_id
  );
  const isNicheStepComplete = 
    formData.niche_restriction_type === 'any' || 
    (formData.niche_restriction_type === 'one_per_campaign' && (formData.allowed_niches || []).length === totalCampaignSlots);
  const isRouteStepComplete = Boolean(formData.saved_route_ids && formData.saved_route_ids.length > 0);

  const canAdvanceFromStep = (stepIndex) => {
    if (stepIndex === 0) return isBasicInfoStepComplete; // Basic Info step
    if (stepIndex === 1) return isTemplateStepComplete; // Templates step
    if (stepIndex === 3) return isNicheStepComplete; // Niches step
    if (stepIndex === 4) return isRouteStepComplete; // Route step
    return true;
  };

  const handleNextStep = () => {
    if (activeStep >= steps.length - 1) return;
    if (!canAdvanceFromStep(activeStep)) return;
    setActiveStep((prev) => prev + 1);
  };

  const handlePrevStep = () => {
    // If on templates step (step 1) and viewing back templates, go back to front templates
    if (activeStep === 1 && templateSubStep === 'back') {
      setTemplateSubStep('front');
      return;
    }
    // If going back to templates step from another step, reset to front selection
    if (activeStep === 1 || (activeStep > 1 && activeStep <= 6)) {
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
              disabled={activeStep === 0}
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

