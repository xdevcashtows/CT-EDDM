import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Mail, Phone, Building, Plus, Tag, User, UserPlus, X, 
  AlertCircle, CheckCircle, Clock, List, Columns, Send, 
  CheckCircle2, Circle, Filter, ChevronDown, 
  ChevronRight, DollarSign, LayoutGrid, Star, Trash2, 
  Flame, Thermometer, Snowflake, Image as ImageIcon, 
  ImageOff, Download
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { 
  contacts as contactsAPI, 
  adSlots as adSlotsAPI, 
  niches as nichesAPI,
  emailCampaigns as emailCampaignsAPI,
  emailLogs as emailLogsAPI,
  campaigns as campaignsAPI
} from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import './CampaignContactsTab.css';

const DEFAULT_PIPELINE_STAGES = [
  { id: 'lead', label: 'Lead', color: '#6b7280' },
  { id: 'contacted', label: 'Contacted', color: '#3b82f6' },
  { id: 'qualified', label: 'Qualified', color: '#f59e0b' },
  { id: 'proposal_sent', label: 'Proposal Sent', color: '#ec4899' },
  { id: 'negotiating', label: 'Negotiating', color: '#8b5cf6' },
  { id: 'won', label: 'Won', color: '#0ea5e9' },
  { id: 'active', label: 'Active', color: '#22c55e' },
  { id: 'past', label: 'Past Client', color: '#64748b' },
  { id: 'lost', label: 'Lost', color: '#dc2626' }
];

export const CampaignContactsTab = ({ campaign, onUpdate }) => {
  const { user } = useAuth();
  const isMountedRef = useRef(true);
  const [allContacts, setAllContacts] = useState([]);
  const [campaignContacts, setCampaignContacts] = useState([]);
  const [niches, setNiches] = useState([]);
  const [slots, setSlots] = useState([]);
  const [emailCampaigns, setEmailCampaigns] = useState([]);
  const [emailLogs, setEmailLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedContact, setSelectedContact] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'kanban'
  const [pipelineStages, setPipelineStages] = useState(DEFAULT_PIPELINE_STAGES);
  const [collapsedNiches, setCollapsedNiches] = useState(new Set());
  const [selectedContactIds, setSelectedContactIds] = useState(new Set());
  
  const renderCountRef = useRef(0);

  // Expand/collapse all niches
  const toggleAllNiches = (expand) => {
    if (expand === undefined) {
      // Toggle: if all are collapsed, expand all; otherwise collapse all
      const allNicheIds = Object.keys(contactsByNiche);
      const allCollapsed = allNicheIds.length > 0 && allNicheIds.every(id => collapsedNiches.has(id));
      setCollapsedNiches(allCollapsed ? new Set() : new Set(allNicheIds));
    } else if (expand) {
      // Expand all
      setCollapsedNiches(new Set());
    } else {
      // Collapse all
      const allNicheIds = Object.keys(contactsByNiche);
      setCollapsedNiches(new Set(allNicheIds));
    }
  };
  renderCountRef.current += 1;
  console.log('👥 [CampaignContactsTab] RENDER #' + renderCountRef.current, {
    campaignId: campaign?.id,
    contactsCount: campaignContacts.length,
    loading
  });

  useEffect(() => {
    console.log('🔄 [CampaignContactsTab] useEffect triggered', {
      campaignId: campaign?.id,
      reason: 'campaign.id or user changed'
    });
    
    isMountedRef.current = true;
    
    if (user && campaign?.id) {
      loadData();
      loadPipelineStages();
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [campaign?.id, user]);

  const loadPipelineStages = () => {
    const savedStages = localStorage.getItem(`pipeline_stages_${user?.id}`);
    if (savedStages) {
      try {
        setPipelineStages(JSON.parse(savedStages));
      } catch (e) {
        setPipelineStages(DEFAULT_PIPELINE_STAGES);
      }
    }
  };

  const loadData = async () => {
    if (!user || !campaign?.id) return;
    
    if (isMountedRef.current) setLoading(true);
    
    try {
      // Load campaign to get updated campaign_contacts array
      const [campaignRes, contactsRes, slotsRes, nichesRes, emailCampaignsRes] = await Promise.all([
        campaignsAPI.getById(campaign.id),
        contactsAPI.getAll(user.id),
        adSlotsAPI.getByCampaign(campaign.id),
        nichesAPI.getAll(),
        emailCampaignsAPI.getByCampaign(campaign.id)
      ]);

      // Only update state if component is still mounted
      if (!isMountedRef.current) return;

      // Update campaign with latest data (including campaign_contacts)
      const updatedCampaign = campaignRes?.data || campaign;

      if (!contactsRes.error && contactsRes.data) {
        setAllContacts(contactsRes.data);
      }

      if (!nichesRes.error && nichesRes.data) {
        setNiches(nichesRes.data);
      }

      if (!slotsRes.error && slotsRes.data) {
        setSlots(slotsRes.data);
      }

      // Load campaign contacts from campaign.campaign_contacts array
      // This includes all contacts added to the campaign, regardless of slot assignment
      if (contactsRes.data && updatedCampaign.campaign_contacts) {
        const campaignContactIds = updatedCampaign.campaign_contacts || [];
        const contacts = contactsRes.data.filter(c => 
          campaignContactIds.includes(c.id)
        ) || [];
        setCampaignContacts(contacts);
      } else {
        setCampaignContacts([]);
      }

      if (!emailCampaignsRes.error && emailCampaignsRes.data) {
        setEmailCampaigns(emailCampaignsRes.data || []);
        
        // Load email logs for all email campaigns
        const emailCampaignIds = (emailCampaignsRes.data || []).map(ec => ec.id);
        if (emailCampaignIds.length > 0) {
          const logsPromises = emailCampaignIds.map(campaignId => 
            emailLogsAPI.getByEmailCampaign(campaignId)
          );
          const logsResults = await Promise.all(logsPromises);
          const allLogs = logsResults
            .filter(res => !res.error && res.data)
            .flatMap(res => res.data || []);
          setEmailLogs(allLogs);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading contacts data:', error);
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const handleViewContact = (contact) => {
    setSelectedContact(contact);
    setShowDetailsModal(true);
  };

  const getContactSlots = (contactId) => {
    return slots.filter(slot => slot.contact_id === contactId);
  };

  const getContactRevenue = (contactId) => {
    const contactSlots = getContactSlots(contactId);
    return contactSlots.reduce((sum, slot) => {
      const price = slot.custom_price || getSlotBasePrice(slot);
      return sum + price;
    }, 0);
  };

  const getSlotBasePrice = (slot) => {
    const size = slot.slot_size?.toLowerCase();
    if (size === 'small') return campaign.price_small || 0;
    if (size === 'medium') return campaign.price_medium || 0;
    if (size === 'large') return campaign.price_large || 0;
    return 0;
  };

  // Get niches on canvas (via slots with contacts assigned) with counts
  const getNichesOnCanvas = () => {
    const nicheCounts = new Map();
    
    // Count how many times each niche appears on the canvas
    slots.forEach(slot => {
      if (slot.contact_id) {
        const contact = campaignContacts.find(c => c.id === slot.contact_id);
        if (contact?.niche_id) {
          const currentCount = nicheCounts.get(contact.niche_id) || 0;
          nicheCounts.set(contact.niche_id, currentCount + 1);
        }
      }
    });
    
    return nicheCounts;
  };

  // Get niche checklist for the campaign - redesigned for left column
  const getNicheChecklist = () => {
    const nicheCounts = getNichesOnCanvas();
    const allowedNicheIds = campaign.allowed_niches || [];
    
    if (campaign.niche_restriction_type === 'one_per_campaign') {
      // For one_per_campaign, show only allowed niches
      return allowedNicheIds.map(nicheId => {
        const niche = niches.find(n => n.id === nicheId);
        const count = nicheCounts.get(nicheId) || 0;
        return {
          nicheId,
          nicheName: niche?.name || 'Unknown',
          isUsed: count > 0,
          count: count
        };
      }).sort((a, b) => {
        // Sort used niches (green) to top
        if (a.isUsed && !b.isUsed) return -1;
        if (!a.isUsed && b.isUsed) return 1;
        return a.nicheName.localeCompare(b.nicheName);
      });
    } else {
      // For any mode, show all niches
      const allNicheIds = new Set([
        ...niches.map(n => n.id),
        ...Array.from(nicheCounts.keys())
      ]);
      
      return Array.from(allNicheIds).map(nicheId => {
        const niche = niches.find(n => n.id === nicheId);
        const count = nicheCounts.get(nicheId) || 0;
        return {
          nicheId,
          nicheName: niche?.name || 'Unknown',
          isUsed: count > 0,
          count: count
        };
      }).sort((a, b) => {
        // Sort used niches (green) to top
        if (a.isUsed && !b.isUsed) return -1;
        if (!a.isUsed && b.isUsed) return 1;
        return a.nicheName.localeCompare(b.nicheName);
      });
    }
  };

  // Get email status for a contact
  const getContactEmailStatus = (contactId) => {
    const contactLogs = emailLogs.filter(log => log.contact_id === contactId);
    const sentLogs = contactLogs.filter(log => log.status === 'sent');
    const waitingLogs = contactLogs.filter(log => 
      log.status === 'pending' || log.status === 'scheduled'
    );
    
    // Check if there are scheduled email campaigns for this contact
    const scheduledCampaigns = emailCampaigns.filter(ec => {
      if (ec.status === 'scheduled' || ec.status === 'draft') {
        const targetContacts = ec.target_contacts || [];
        return targetContacts.includes(contactId);
      }
      return false;
    });

    return {
      sent: sentLogs.length,
      waiting: waitingLogs.length + scheduledCampaigns.length,
      lastSent: sentLogs.length > 0 ? sentLogs[0].sent_at : null
    };
  };

  // Get overall email stats
  const getEmailStats = () => {
    const allContactIds = campaignContacts.map(c => c.id);
    let totalSent = 0;
    let totalWaiting = 0;

    allContactIds.forEach(contactId => {
      const status = getContactEmailStatus(contactId);
      totalSent += status.sent;
      totalWaiting += status.waiting;
    });

    return { totalSent, totalWaiting };
  };

  const filteredContacts = campaignContacts.filter(contact => {
    const searchLower = searchTerm.toLowerCase();
    return (
      contact.business_name?.toLowerCase().includes(searchLower) ||
      contact.email?.toLowerCase().includes(searchLower) ||
      contact.phone?.toLowerCase().includes(searchLower) ||
      (contact.tags && Array.isArray(contact.tags) && contact.tags.some(tag => tag.toLowerCase().includes(searchLower)))
    );
  });

  // Group contacts by niche
  const contactsByNiche = filteredContacts.reduce((acc, contact) => {
    const nicheId = contact.niche_id || 'unassigned';
    if (!acc[nicheId]) {
      acc[nicheId] = [];
    }
    acc[nicheId].push(contact);
    return acc;
  }, {});

  // Get niche availability status for one_per_campaign mode
  const getNicheStatus = (nicheId) => {
    if (!campaign.niche_restriction_type || campaign.niche_restriction_type === 'any') {
      return 'any';
    }
    
    if (campaign.niche_restriction_type === 'one_per_campaign') {
      if (!campaign.allowed_niches?.includes(nicheId)) {
        return 'not_allowed';
      }
      
      const hasContact = campaignContacts.some(c => c.niche_id === nicheId);
      return hasContact ? 'filled' : 'available';
    }
    
    return 'any';
  };

  // Get available niches (for one_per_campaign mode)
  const getAvailableNiches = () => {
    if (!campaign.niche_restriction_type || campaign.niche_restriction_type === 'any') {
      return niches;
    }
    
    if (campaign.niche_restriction_type === 'one_per_campaign') {
      const allowedNicheIds = campaign.allowed_niches || [];
      const filledNicheIds = campaignContacts.map(c => c.niche_id);
      
      return niches.filter(niche => 
        allowedNicheIds.includes(niche.id) && !filledNicheIds.includes(niche.id)
      );
    }
    
    return niches;
  };

  // Handle kanban drag and drop
  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const { draggableId, destination } = result;
    const contactId = draggableId.replace('contact-', '');
    const newStage = destination.droppableId.replace('stage-', '');

    // Update contact stage
    const { error } = await contactsAPI.update(contactId, { stage: newStage });
    if (!error) {
      await loadData();
      if (onUpdate) onUpdate();
    }
  };

  // Calculate summary stats
  const totalContacts = campaignContacts.length;
  const totalRevenue = campaignContacts.reduce((sum, contact) => 
    sum + getContactRevenue(contact.id), 0
  );
  const totalSlots = slots.filter(slot => slot.contact_id).length;
  const emailStats = getEmailStats();
  const nicheChecklist = getNicheChecklist();
  
  // Calculate niche slots stats (for one_per_campaign mode)
  const totalNicheSlots = campaign.niche_restriction_type === 'one_per_campaign' 
    ? (campaign.allowed_niches?.length || 0)
    : 0;
  const filledNicheSlots = campaign.niche_restriction_type === 'one_per_campaign'
    ? Object.keys(contactsByNiche).filter(nicheId => nicheId !== 'unassigned').length
    : 0;

  const handleAddContact = async (contactId) => {
    try {
      // Get the contact details
      const contact = allContacts.find(c => c.id === contactId);
      if (!contact) {
        alert('Contact not found');
        return;
      }

      // Check niche restrictions for one_per_campaign mode - show warning but allow
      let showWarning = false;
      let warningMessage = '';

      if (campaign.niche_restriction_type === 'one_per_campaign') {
        const allowedNicheIds = campaign.allowed_niches || [];
        const contactNiche = niches.find(n => n.id === contact.niche_id);
        const contactNicheName = contactNiche?.name || 'this niche';
        
        if (!allowedNicheIds.includes(contact.niche_id)) {
          const allowedNiches = niches.filter(n => allowedNicheIds.includes(n.id));
          const allowedNicheNames = allowedNiches.map(n => n.name).join(', ');
          showWarning = true;
          warningMessage = 
            `⚠️ Niche Restriction Warning\n\n` +
            `"${contact.business_name}" belongs to the "${contactNicheName}" niche, which is not allowed in this campaign.\n\n` +
            `This campaign is restricted to the following niche(s):\n${allowedNicheNames || 'None'}\n\n` +
            `You can still add this contact, but it may cause issues with slot assignments.`;
        } else {
          // Check if a contact from this niche already exists
          const existingContactFromNiche = campaignContacts.find(c => c.niche_id === contact.niche_id);
          if (existingContactFromNiche) {
            showWarning = true;
            warningMessage = 
              `⚠️ One Business Per Niche Restriction\n\n` +
              `A contact from the "${contactNicheName}" niche is already in this campaign.\n\n` +
              `Only one business per niche is allowed in this campaign mode.\n\n` +
              `Existing contact: "${existingContactFromNiche.business_name}"\n\n` +
              `You can still add this contact, but only one can be assigned to slots.`;
          }
        }
      }

      // Show warning if needed, but continue with addition
      if (showWarning) {
        const proceed = confirm(warningMessage + '\n\nDo you want to continue?');
        if (!proceed) {
          return;
        }
      }

      // Add contact to campaign_contacts array (not assigning to slot)
      const { error } = await campaignsAPI.addContact(campaign.id, contactId);

      if (error) {
        console.error('Error adding contact to campaign:', error);
        alert('Failed to add contact to campaign. Please try again.');
        return;
      }

      // Reload data to reflect changes
      await loadData();
      if (onUpdate) {
        console.log('📞 [CampaignContactsTab] Calling onUpdate after handleAddContact');
        onUpdate();
      }
    } catch (error) {
      console.error('Error adding contact:', error);
      alert('An error occurred while adding the contact. Please try again.');
    }
  };

  const handleBulkAddContacts = async (contactIds) => {
    try {
      const contactIdsArray = Array.from(contactIds);
      const validContactIds = [];
      const warnings = [];
      const errors = [];

      // Validate contacts and check niche restrictions
      for (const contactId of contactIdsArray) {
        const contact = allContacts.find(c => c.id === contactId);
        if (!contact) {
          errors.push(`Contact ${contactId} not found`);
          continue;
        }

        // Check if contact is already in campaign
        if (campaignContacts.some(c => c.id === contactId)) {
          errors.push(`${contact.business_name}: Already in campaign`);
          continue;
        }

        // Check niche restrictions for one_per_campaign mode - collect warnings but allow
        if (campaign.niche_restriction_type === 'one_per_campaign') {
          const allowedNicheIds = campaign.allowed_niches || [];
          const contactNiche = niches.find(n => n.id === contact.niche_id);
          const contactNicheName = contactNiche?.name || 'this niche';
          
          if (!allowedNicheIds.includes(contact.niche_id)) {
            warnings.push(`${contact.business_name}: Niche "${contactNicheName}" not allowed in this campaign`);
          } else {
            // Check if a contact from this niche already exists
            const existingContactFromNiche = campaignContacts.find(c => c.niche_id === contact.niche_id);
            if (existingContactFromNiche) {
              warnings.push(`${contact.business_name}: Niche "${contactNicheName}" already filled by "${existingContactFromNiche.business_name}"`);
            }
          }
        }

        validContactIds.push(contactId);
      }

      // Show warnings if any, but allow user to proceed
      if (warnings.length > 0) {
        const warningText = 
          `⚠️ Niche Restriction Warnings\n\n` +
          `The following contacts violate niche restrictions:\n\n` +
          `${warnings.slice(0, 5).join('\n')}${warnings.length > 5 ? `\n...and ${warnings.length - 5} more` : ''}\n\n` +
          `You can still add these contacts, but they may cause issues with slot assignments.\n\n` +
          `Do you want to continue?`;
        
        const proceed = confirm(warningText);
        if (!proceed) {
          return;
        }
      }

      // Add all valid contacts to campaign_contacts array
      if (validContactIds.length > 0) {
        const { error } = await campaignsAPI.addContacts(campaign.id, validContactIds);
        
        if (error) {
          alert('Failed to add contacts to campaign. Please try again.');
          return;
        }
      }

      // Reload data to reflect changes
      await loadData();
      if (onUpdate) {
        console.log('📞 [CampaignContactsTab] Calling onUpdate after handleAddContact');
        onUpdate();
      }

      // Show results
      const successCount = validContactIds.length;
      const errorCount = errors.length;
      const warningCount = warnings.length;
      
      let resultMessage = `Successfully added ${successCount} contact(s) to the campaign.`;
      
      if (warningCount > 0) {
        resultMessage += `\n\n⚠️ ${warningCount} contact(s) have niche restriction warnings.`;
      }
      
      if (errorCount > 0) {
        resultMessage += `\n\n${errorCount} contact(s) failed:\n${errors.slice(0, 3).join('\n')}${errors.length > 3 ? `\n...and ${errors.length - 3} more` : ''}`;
      }
      
      alert(resultMessage);
    } catch (error) {
      console.error('Error bulk adding contacts:', error);
      alert('An error occurred while adding contacts. Please try again.');
    }
  };

  const formatTemperatureLabel = (value) => {
    if (!value) return 'Warm';
    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  const handleToggleFavorite = async (contactId, currentFavorite) => {
    const { error } = await contactsAPI.update(contactId, { 
      is_favorite: !currentFavorite 
    });
    if (!error) {
      await loadData();
      if (onUpdate) onUpdate();
    }
  };

  const handleRemoveContact = async (contactId) => {
    const contact = campaignContacts.find(c => c.id === contactId);
    const contactSlots = slots.filter(slot => slot.contact_id === contactId);
    const hasSlots = contactSlots.length > 0;
    
    const message = hasSlots 
      ? `Remove "${contact?.business_name || 'this contact'}" from the campaign? This will also unassign all their slots (${contactSlots.length} slot(s)).`
      : `Remove "${contact?.business_name || 'this contact'}" from the campaign?`;
    
    if (!confirm(message)) {
      return;
    }
    
    // Remove contact from campaign_contacts array
    const { error: removeError } = await campaignsAPI.removeContact(campaign.id, contactId);
    
    if (removeError) {
      console.error('Error removing contact from campaign:', removeError);
      alert('Failed to remove contact from campaign. Please try again.');
      return;
    }
    
    // Also unassign any slots they have
    if (hasSlots) {
      for (const slot of contactSlots) {
        await adSlotsAPI.update(slot.id, { 
          contact_id: null, 
          client_ad_id: null,
          status: 'available' 
        });
      }
    }
    
    await loadData();
    if (onUpdate) {
      console.log('📞 [CampaignContactsTab] Calling onUpdate after handleRemoveContact');
      onUpdate();
    }
  };

  // Export campaign contacts to CSV
  const handleExportCSV = () => {
    if (campaignContacts.length === 0) {
      alert('No contacts to export');
      return;
    }

    // Prepare CSV headers - include all contact information
    const headers = [
      'business_name',
      'owner_name',
      'email',
      'phone',
      'website',
      'address',
      'city',
      'state',
      'zip',
      'mailing_location',
      'niche',
      'stage',
      'temperature',
      'tags',
      'notes',
      'is_favorite',
      'first_contact_date',
      'last_contact_date',
      'next_follow_up_date',
      'slots_assigned',
      'total_revenue',
      'created_at'
    ];

    // Escape CSV values
    const escapeCSV = (value) => {
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    // Format date helper
    const formatDate = (dateString) => {
      if (!dateString) return '';
      try {
        return new Date(dateString).toLocaleDateString();
      } catch {
        return dateString;
      }
    };

    // Prepare CSV rows
    const rows = campaignContacts.map(contact => {
      const tags = Array.isArray(contact.tags) 
        ? contact.tags.join(', ') 
        : typeof contact.tags === 'string' 
        ? contact.tags 
        : '';

      const stage = pipelineStages.find(s => s.id === contact.stage)?.label || contact.stage || '';
      const niche = contact.niche || niches.find(n => n.id === contact.niche_id);
      const contactSlots = getContactSlots(contact.id);
      const revenue = getContactRevenue(contact.id);

      return [
        contact.business_name || '',
        contact.owner_name || '',
        contact.email || '',
        contact.phone || '',
        contact.website || '',
        contact.address || '',
        contact.city || '',
        contact.state || '',
        contact.zip || '',
        contact.mailing_location || '',
        niche?.name || '',
        stage,
        contact.temperature || 'warm',
        tags,
        contact.notes || '',
        contact.is_favorite ? 'Yes' : 'No',
        formatDate(contact.first_contact_date),
        formatDate(contact.last_contact_date),
        formatDate(contact.next_follow_up_date),
        contactSlots.length.toString(),
        Math.round(revenue).toLocaleString(),
        formatDate(contact.created_at)
      ];
    });

    // Build CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const campaignName = campaign?.name || 'campaign';
    const sanitizedCampaignName = campaignName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const fileName = `${sanitizedCampaignName}_contacts_${new Date().toISOString().split('T')[0]}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Group contacts by stage for kanban
  const contactsByStage = pipelineStages.reduce((acc, stage) => {
    acc[stage.id] = filteredContacts.filter(c => c.stage === stage.id);
    return acc;
  }, {});

  return (
    <div className="campaign-contacts-tab">
      {/* Two Column Layout */}
      <div className="contacts-tab-layout">
        {/* Left Column - Niche Checklist */}
        <div className="niche-checklist-column">
          <div className="niche-checklist-column-header">
            <Tag size={18} />
            <div style={{ flex: 1 }}>
              <h3>Business Niches on Card</h3>
              <div className="niche-checklist-total">
                Total: {nicheChecklist.length}
              </div>
            </div>
          </div>
          <div className="niche-checklist-column-content">
            {nicheChecklist.length === 0 ? (
              <div className="niche-checklist-empty">
                <p>No niches to display</p>
              </div>
            ) : (
              nicheChecklist.map((item) => (
                <div 
                  key={item.nicheId} 
                  className={`niche-checklist-column-item ${item.isUsed ? 'used' : ''}`}
                >
                  <div className="niche-checklist-item-content">
                    {item.isUsed ? (
                      <CheckCircle2 size={18} className="niche-checklist-icon used-icon" />
                    ) : (
                      <Circle size={18} className="niche-checklist-icon unused-icon" />
                    )}
                    <span className="niche-checklist-item-name">{item.nicheName}</span>
                  </div>
                  {item.isUsed && item.count > 1 && (
                    <span className="niche-checklist-count-badge">{item.count}</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column - Main Content */}
        <div className="contacts-tab-main-content">
          {/* Search and Campaign Mode Info Row */}
          <div className="search-notice-row" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="contacts-search-bar">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search advertisers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            {campaign.niche_restriction_type === 'one_per_campaign' && (
              <div className="campaign-mode-notice" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                <AlertCircle size={18} />
                <div>
                  <strong>One Business Per Niche:</strong> Only one business from each niche can claim a spot in this campaign (first come, first served).
                </div>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: campaign.niche_restriction_type === 'one_per_campaign' ? '0' : 'auto' }}>
              <div className="contacts-view-controls">
                <button
                  className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setViewMode('list')}
                  title="List View"
                >
                  <List size={18} />
                </button>
                <button
                  className={`view-toggle-btn ${viewMode === 'kanban' ? 'active' : ''}`}
                  onClick={() => setViewMode('kanban')}
                  title="Pipeline View"
                >
                  <Columns size={18} />
                </button>
              </div>
              <button 
                className="add-contact-btn"
                onClick={() => setShowAddContactModal(true)}
              >
                <UserPlus size={18} />
                Add Advertiser
              </button>
              <button 
                className="add-contact-btn"
                onClick={handleExportCSV}
                disabled={campaignContacts.length === 0}
                title="Export all campaign contacts to CSV"
              >
                <Download size={18} />
                Export Contacts
              </button>
            </div>
          </div>

          {/* Contacts List or Kanban */}
          <div className="contacts-list-container">
        {/* Contacts Count Display and Expand/Collapse Controls */}
        {!loading && (
          <div className="contacts-list-header">
            <div className="contacts-count-display">
              {searchTerm ? (
                <span>
                  Showing <strong>{filteredContacts.length}</strong> of <strong>{totalContacts}</strong> contact{totalContacts !== 1 ? 's' : ''}
                </span>
              ) : (
                <span>
                  Total: <strong>{totalContacts}</strong> contact{totalContacts !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            {viewMode === 'list' && Object.keys(contactsByNiche).length > 0 && (
              <div className="niche-expand-controls">
                <button
                  className="expand-collapse-btn"
                  onClick={() => toggleAllNiches(true)}
                  title="Expand all niche sections"
                >
                  <ChevronDown size={16} />
                  Expand All
                </button>
                <button
                  className="expand-collapse-btn"
                  onClick={() => toggleAllNiches(false)}
                  title="Collapse all niche sections"
                >
                  <ChevronRight size={16} />
                  Collapse All
                </button>
              </div>
            )}
          </div>
        )}
        {loading ? (
          <div className="contacts-loading">Loading contacts...</div>
        ) : filteredContacts.length === 0 ? (
          <div className="contacts-empty">
            {searchTerm ? (
              <p>No contacts match your search.</p>
            ) : (
              <>
                <p>No advertisers in this campaign yet.</p>
                <p className="contacts-empty-hint">
                  Click "Add Advertiser" above or assign contacts to slots in the Canvas tab.
                </p>
              </>
            )}
          </div>
        ) : viewMode === 'list' ? (
          <div className="niches-list">
            {Object.entries(contactsByNiche)
              .sort(([nicheIdA], [nicheIdB]) => {
                const nicheA = niches.find(n => n.id === nicheIdA);
                const nicheB = niches.find(n => n.id === nicheIdB);
                const nameA = nicheA?.name || 'Unassigned Niche';
                const nameB = nicheB?.name || 'Unassigned Niche';
                return nameA.localeCompare(nameB);
              })
              .map(([nicheId, nicheContacts]) => {
              const niche = niches.find(n => n.id === nicheId);
              const nicheName = niche?.name || 'Unassigned Niche';
              const nicheStatus = getNicheStatus(nicheId);
              const isCollapsed = collapsedNiches.has(nicheId);
              
              // Calculate total revenue for this niche
              const nicheRevenue = nicheContacts.reduce((sum, contact) => 
                sum + getContactRevenue(contact.id), 0
              );
              const nicheSlots = nicheContacts.reduce((sum, contact) => 
                sum + getContactSlots(contact.id).length, 0
              );
              
              return (
                <div key={nicheId} className="niche-section">
                  <div 
                    className="niche-header"
                    onClick={() => {
                      const newCollapsed = new Set(collapsedNiches);
                      if (isCollapsed) {
                        newCollapsed.delete(nicheId);
                      } else {
                        newCollapsed.add(nicheId);
                      }
                      setCollapsedNiches(newCollapsed);
                    }}
                  >
                    <div className="niche-header-left">
                      <button className="niche-collapse-toggle">
                        {isCollapsed ? (
                          <ChevronRight size={20} />
                        ) : (
                          <ChevronDown size={20} />
                        )}
                      </button>
                      <Tag size={20} />
                      <h3>{nicheName}</h3>
                    </div>
                    <div className="niche-stats">
                      <span className="niche-stat-item">
                        <User size={14} />
                        {nicheContacts.length} advertiser{nicheContacts.length !== 1 ? 's' : ''}
                      </span>
                      <span className="niche-stat-item">
                        <LayoutGrid size={14} />
                        {nicheSlots} slot{nicheSlots !== 1 ? 's' : ''}
                      </span>
                      <span className="niche-stat-item">
                        <DollarSign size={14} />
                        ${Math.round(nicheRevenue).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  
                  {!isCollapsed && (
                    <div className="contacts-table-container">
                      <table className="contacts-table">
                        <thead>
                          <tr>
                            <th className="table-checkbox-col">
                              <input
                                type="checkbox"
                                className="table-checkbox"
                                checked={nicheContacts.slice(0, 10).every(c => selectedContactIds.has(c.id)) && nicheContacts.slice(0, 10).length > 0}
                                onChange={(e) => {
                                  const contactsToToggle = nicheContacts.slice(0, 10);
                                  if (e.target.checked) {
                                    setSelectedContactIds(prev => new Set([...prev, ...contactsToToggle.map(c => c.id)]));
                                  } else {
                                    setSelectedContactIds(prev => {
                                      const newSet = new Set(prev);
                                      contactsToToggle.forEach(contact => newSet.delete(contact.id));
                                      return newSet;
                                    });
                                  }
                                }}
                              />
                            </th>
                            <th>Business Name</th>
                            <th>Contact</th>
                            <th>Stage</th>
                            <th>Temperature</th>
                            <th>Slots</th>
                            <th>Revenue</th>
                            <th>Ad Image</th>
                            <th className="table-actions-col">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {nicheContacts.slice(0, 10).map((contact) => {
                            const emailStatus = getContactEmailStatus(contact.id);
                            const slots = getContactSlots(contact.id);
                            const revenue = getContactRevenue(contact.id);
                            const stage = pipelineStages.find(s => s.id === contact.stage);
                            const hasAdImage = slots.some(slot => slot.client_ad?.image_url);
                            const temperature = contact.temperature || 'warm';
                            
                            return (
                              <tr 
                                key={contact.id} 
                                className="contacts-table-row"
                                style={{ '--stage-color': stage?.color || '#6b7280' }}
                              >
                                <td className="table-checkbox-col">
                                  <input
                                    type="checkbox"
                                    className="table-checkbox"
                                    checked={selectedContactIds.has(contact.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedContactIds(prev => new Set([...prev, contact.id]));
                                      } else {
                                        setSelectedContactIds(prev => {
                                          const newSet = new Set(prev);
                                          newSet.delete(contact.id);
                                          return newSet;
                                        });
                                      }
                                    }}
                                  />
                                </td>
                                <td>
                                  <div className="table-business-name">
                                    <button
                                      className="table-favorite-btn"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleFavorite(contact.id, contact.is_favorite);
                                      }}
                                      title={contact.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                                    >
                                      <Star size={14} fill={contact.is_favorite ? 'currentColor' : 'none'} />
                                    </button>
                                    <span className="business-name-text" onClick={() => handleViewContact(contact)}>
                                      {contact.business_name || 'Unnamed Business'}
                                    </span>
                                  </div>
                                </td>
                                <td>
                                  <div className="table-contact-info">
                                    {contact.email && (
                                      <div className="table-contact-item">
                                        <Mail size={12} />
                                        <span>{contact.email}</span>
                                      </div>
                                    )}
                                    {contact.phone && (
                                      <div className="table-contact-item">
                                        <Phone size={12} />
                                        <span>{contact.phone}</span>
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td>
                                  <span 
                                    className="table-stage-badge"
                                    style={{
                                      backgroundColor: stage?.color ? `${stage.color}15` : '#f3f4f6',
                                      color: stage?.color || '#6b7280',
                                      borderColor: stage?.color ? `${stage.color}40` : '#e5e7eb'
                                    }}
                                  >
                                    {stage?.label || contact.stage || 'N/A'}
                                  </span>
                                </td>
                                <td>
                                  <div className={`table-temperature-badge temperature-${temperature}`}>
                                    {temperature === 'hot' && '🔥'}
                                    {temperature === 'warm' && '☀️'}
                                    {temperature === 'cold' && '❄️'}
                                    <span>{formatTemperatureLabel(temperature)}</span>
                                  </div>
                                </td>
                                <td>
                                  <div className="table-slots-info">
                                    <LayoutGrid size={14} />
                                    <span>{slots.length}</span>
                                  </div>
                                </td>
                                <td>
                                  <div className="table-revenue-info">
                                    <DollarSign size={14} />
                                    <span>${Math.round(revenue).toLocaleString()}</span>
                                  </div>
                                </td>
                                <td>
                                  {hasAdImage ? (
                                    <div className="table-ad-status has-ad">
                                      <ImageIcon size={14} />
                                      <span>Yes</span>
                                    </div>
                                  ) : (
                                    <div className="table-ad-status no-ad">
                                      <ImageOff size={14} />
                                      <span>No</span>
                                    </div>
                                  )}
                                </td>
                                <td className="table-actions-col">
                                  <div className="table-actions">
                                    <button
                                      className="table-action-btn view-btn"
                                      onClick={() => handleViewContact(contact)}
                                      title="View details"
                                    >
                                      <User size={14} />
                                    </button>
                                    <button
                                      className="table-action-btn delete-btn"
                                      onClick={() => {
                                        if (confirm(`Are you sure you want to remove "${contact.business_name || 'this contact'}" from the campaign?`)) {
                                          handleRemoveContact(contact.id);
                                        }
                                      }}
                                      title="Remove from campaign"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {nicheContacts.length > 10 && (
                        <div className="contacts-limit-notice">
                          Showing 10 of {nicheContacts.length} contacts in this niche
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="kanban-board">
              {pipelineStages.map((stage) => {
                const stageContacts = contactsByStage[stage.id] || [];
                return (
                  <Droppable key={stage.id} droppableId={`stage-${stage.id}`}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`kanban-column ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                        style={{ borderTopColor: stage.color }}
                      >
                        <div className="kanban-column-header">
                          <h3 style={{ color: stage.color }}>{stage.label}</h3>
                          <span className="kanban-column-count">{stageContacts.length}</span>
                        </div>
                        <div className="kanban-column-content">
                          {stageContacts.map((contact, index) => {
                            const emailStatus = getContactEmailStatus(contact.id);
                            // Enrich contact with niche data
                            const enrichedContact = {
                              ...contact,
                              niche: contact.niche_id ? niches.find(n => n.id === contact.niche_id) : null
                            };
                            return (
                              <Draggable
                                key={contact.id}
                                draggableId={`contact-${contact.id}`}
                                index={index}
                              >
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`kanban-card ${snapshot.isDragging ? 'dragging' : ''}`}
                                    style={{
                                      ...provided.draggableProps.style,
                                      cursor: snapshot.isDragging ? 'grabbing' : 'grab',
                                    }}
                                  >
                                    <ContactKanbanCard
                                      contact={enrichedContact}
                                      slots={getContactSlots(contact.id)}
                                      revenue={getContactRevenue(contact.id)}
                                      emailStatus={emailStatus}
                                      onView={() => handleViewContact(contact)}
                                      onRemove={() => handleRemoveContact(contact.id)}
                                    />
                                  </div>
                                )}
                              </Draggable>
                            );
                          })}
                          {provided.placeholder}
                        </div>
                      </div>
                    )}
                  </Droppable>
                );
              })}
            </div>
          </DragDropContext>
          )}
          </div>
        </div>
      </div>

      {/* Contact Details Modal */}
      {showDetailsModal && selectedContact && (
        <ContactDetailsModal
          contact={{
            ...selectedContact,
            niche: selectedContact.niche_id ? niches.find(n => n.id === selectedContact.niche_id) : null
          }}
          slots={getContactSlots(selectedContact.id)}
          campaign={campaign}
          emailStatus={getContactEmailStatus(selectedContact.id)}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedContact(null);
          }}
        />
      )}

      {/* Add Contact Modal */}
      {showAddContactModal && (
        <AddContactModal
          campaign={campaign}
          allContacts={allContacts}
          campaignContacts={campaignContacts}
          niches={niches}
          availableNiches={getAvailableNiches()}
          onAdd={handleAddContact}
          onBulkAdd={handleBulkAddContacts}
          onClose={() => setShowAddContactModal(false)}
        />
      )}
    </div>
  );
};

// Contact Card Component - Redesigned
const ContactCard = ({ contact, campaign, slots, revenue, emailStatus, pipelineStages, onView, onRemove, onToggleFavorite }) => {
  const [isSelected, setIsSelected] = useState(false);
  const hasAdImage = slots.some(slot => slot.client_ad?.image_url);
  const hasSlotAssignment = slots.length > 0;
  const stage = pipelineStages.find(s => s.id === contact.stage);
  const temperature = contact.temperature || 'warm';

  const getTemperatureIcon = () => {
    switch (temperature) {
      case 'hot':
        return <Flame size={16} className="temperature-icon hot" />;
      case 'cold':
        return <Snowflake size={16} className="temperature-icon cold" />;
      default:
        return <Thermometer size={16} className="temperature-icon warm" />;
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to remove "${contact.business_name || 'this contact'}" from the campaign?`)) {
      onRemove();
    }
  };

  const handleFavoriteToggle = (e) => {
    e.stopPropagation();
    if (onToggleFavorite) {
      onToggleFavorite(contact.id, contact.is_favorite);
    }
  };

  const handleCheckboxChange = (e) => {
    e.stopPropagation();
    setIsSelected(!isSelected);
  };

  return (
    <div className={`contact-card-sleek ${isSelected ? 'selected' : ''}`} onClick={onView}>
      {/* Top Right Corner - Checkbox and Favorite Toggle */}
      <div className="contact-card-top-actions">
        <input
          type="checkbox"
          className="contact-card-checkbox"
          checked={isSelected}
          onChange={handleCheckboxChange}
          onClick={(e) => e.stopPropagation()}
        />
        <button
          className={`contact-card-favorite-btn ${contact.is_favorite ? 'active' : ''}`}
          onClick={handleFavoriteToggle}
          title={contact.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Star size={16} fill={contact.is_favorite ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Business Name */}
      <div className="contact-card-business-name">
        <h4>{contact.business_name || 'Unnamed Business'}</h4>
      </div>

      {/* Main Info Grid */}
      <div className="contact-card-info-grid">
        {/* Assigned Campaign */}
        <div className="contact-card-info-item">
          <span className="info-label">Campaign</span>
          <span className="info-value">{campaign?.name || 'N/A'}</span>
        </div>

        {/* Stage */}
        <div className="contact-card-info-item">
          <span className="info-label">Stage</span>
          <span 
            className="info-value stage-badge"
            style={{ 
              color: stage?.color || '#6b7280',
              backgroundColor: stage?.color ? `${stage.color}15` : '#f3f4f6'
            }}
          >
            {stage?.label || contact.stage || 'N/A'}
          </span>
        </div>

        {/* Temperature */}
        <div className="contact-card-info-item">
          <span className="info-label">Temperature</span>
          <div className="info-value temperature-display">
            {getTemperatureIcon()}
            <span className={`temperature-text ${temperature}`}>
              {temperature.charAt(0).toUpperCase() + temperature.slice(1)}
            </span>
          </div>
        </div>

        {/* Niche */}
        <div className="contact-card-info-item">
          <span className="info-label">Niche</span>
          <span className="info-value niche-value">
            <Tag size={12} />
            {contact.niche?.name || 'Unassigned'}
          </span>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="contact-card-status-row">
        {/* Slot Assignment Status */}
        <div className={`status-indicator ${hasSlotAssignment ? 'assigned' : 'unassigned'}`}>
          <LayoutGrid size={14} />
          <span>{hasSlotAssignment ? 'Assigned' : 'Not Assigned'}</span>
        </div>

        {/* Ad Image Status */}
        <div className={`status-indicator ${hasAdImage ? 'has-ad' : 'no-ad'}`}>
          {hasAdImage ? (
            <>
              <ImageIcon size={14} />
              <span>Ad Ready</span>
            </>
          ) : (
            <>
              <ImageOff size={14} />
              <span>No Ad</span>
            </>
          )}
        </div>
      </div>

      {/* Revenue Display */}
      <div className="contact-card-revenue">
        <DollarSign size={18} />
        <div className="revenue-content">
          <span className="revenue-label">Revenue</span>
          <span className="revenue-value">${Math.round(revenue).toLocaleString()}</span>
        </div>
      </div>

      {/* Delete Button */}
      <button
        className="contact-card-delete-btn"
        onClick={handleDelete}
        title="Remove from campaign"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
};

// Contact Kanban Card Component
const ContactKanbanCard = ({ contact, slots, revenue, emailStatus, onView, onRemove }) => {
  return (
    <div className="kanban-card-content" onClick={onView}>
      <div className="kanban-card-header">
        <div className="contact-avatar small">
          {contact.business_name?.charAt(0).toUpperCase() || 'A'}
        </div>
        <div className="kanban-card-info">
          <h4 className="kanban-card-name">{contact.business_name}</h4>
          {contact.niche?.name && (
            <span className="kanban-card-niche">{contact.niche.name}</span>
          )}
        </div>
        <button 
          className="kanban-card-remove"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          title="Remove from campaign"
        >
          <X size={14} />
        </button>
      </div>

      <div className="kanban-card-details">
        {contact.email && (
          <div className="kanban-card-detail">
            <Mail size={12} />
            <span>{contact.email}</span>
          </div>
        )}
      </div>

      <div className="kanban-card-footer">
        <div className="kanban-card-stat">
          <span>{slots.length} slot{slots.length !== 1 ? 's' : ''}</span>
          <span>${Math.round(revenue).toLocaleString()}</span>
        </div>
        {(emailStatus.sent > 0 || emailStatus.waiting > 0) && (
          <div className="kanban-card-email-status">
            {emailStatus.sent > 0 && (
              <span className="email-status-badge sent small">
                <CheckCircle2 size={10} />
                {emailStatus.sent}
              </span>
            )}
            {emailStatus.waiting > 0 && (
              <span className="email-status-badge waiting small">
                <Clock size={10} />
                {emailStatus.waiting}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Contact Details Modal Component
const ContactDetailsModal = ({ contact, slots, campaign, emailStatus, onClose }) => {
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

  const totalRevenue = slots.reduce((sum, slot) => sum + getSlotFinalPrice(slot), 0);

  return (
    <div className="contact-modal-backdrop" onClick={onClose}>
      <div className="contact-modal" onClick={(e) => e.stopPropagation()}>
        <div className="contact-modal-header">
          <div className="contact-modal-title-section">
            <div className="contact-avatar large">
              {contact.business_name?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div>
              <h3>{contact.business_name}</h3>
              {contact.niche?.name && (
                <span className="contact-modal-niche">{contact.niche.name}</span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="contact-modal-close">×</button>
        </div>

        <div className="contact-modal-content">
          {/* Contact Information */}
          <div className="contact-info-section">
            <h4>Contact Information</h4>
            <div className="contact-info-grid">
              {contact.email && (
                <div className="contact-info-item">
                  <Mail size={16} />
                  <div>
                    <div className="contact-info-label">Email</div>
                    <div className="contact-info-value">{contact.email}</div>
                  </div>
                </div>
              )}
              {contact.phone && (
                <div className="contact-info-item">
                  <Phone size={16} />
                  <div>
                    <div className="contact-info-label">Phone</div>
                    <div className="contact-info-value">{contact.phone}</div>
                  </div>
                </div>
              )}
              {contact.website && (
                <div className="contact-info-item">
                  <Building size={16} />
                  <div>
                    <div className="contact-info-label">Website</div>
                    <div className="contact-info-value">{contact.website}</div>
                  </div>
                </div>
              )}
            </div>

            {contact.tags && contact.tags.length > 0 && (
              <div className="contact-tags-section">
                <div className="contact-info-label">Tags</div>
                <div className="contact-tags">
                  {contact.tags.map((tag, index) => (
                    <span key={index} className="contact-tag">
                      <Tag size={12} />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Email Status */}
          {(emailStatus.sent > 0 || emailStatus.waiting > 0) && (
            <div className="email-status-section">
              <h4>Email Status</h4>
              <div className="email-status-grid">
                {emailStatus.sent > 0 && (
                  <div className="email-status-item">
                    <CheckCircle2 size={20} style={{ color: '#22c55e' }} />
                    <div>
                      <div className="email-status-label">Emails Sent</div>
                      <div className="email-status-value">{emailStatus.sent}</div>
                    </div>
                  </div>
                )}
                {emailStatus.waiting > 0 && (
                  <div className="email-status-item">
                    <Clock size={20} style={{ color: '#f59e0b' }} />
                    <div>
                      <div className="email-status-label">Emails Waiting</div>
                      <div className="email-status-value">{emailStatus.waiting}</div>
                    </div>
                  </div>
                )}
                {emailStatus.lastSent && (
                  <div className="email-status-item">
                    <Send size={20} style={{ color: '#6366f1' }} />
                    <div>
                      <div className="email-status-label">Last Sent</div>
                      <div className="email-status-value">
                        {new Date(emailStatus.lastSent).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Assigned Slots */}
          <div className="slots-section">
            <div className="slots-section-header">
              <h4>Assigned Slots ({slots.length})</h4>
              <div className="slots-total-revenue">
                Total Revenue: <strong>${Math.round(totalRevenue).toLocaleString()}</strong>
              </div>
            </div>

            <div className="slots-list">
              {slots.map((slot) => (
                <div key={slot.id} className="slot-item">
                  <div className="slot-item-info">
                    <div className="slot-item-position">{slot.slot_position}</div>
                    <span className="slot-item-size">{slot.slot_size}</span>
                  </div>
                  <div className="slot-item-ad">
                    {slot.client_ad?.image_url ? (
                      <img src={slot.client_ad.image_url} alt={slot.client_ad.name} />
                    ) : (
                      <div className="slot-item-no-ad">No ad</div>
                    )}
                  </div>
                  <div className="slot-item-price">
                    ${Math.round(getSlotFinalPrice(slot)).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Add Contact Modal Component
const AddContactModal = ({ campaign, allContacts, campaignContacts, niches, availableNiches, onAdd, onBulkAdd, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [nicheFilter, setNicheFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [temperatureFilter, setTemperatureFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedContactIds, setSelectedContactIds] = useState(new Set());
  const bulkSelectCheckboxRef = useRef(null);

  // Get all unique cities, tags, and temperatures from contacts
  const allCities = [...new Set(allContacts.map(c => c.city).filter(Boolean))].sort();
  const allTags = [...new Set(
    allContacts.flatMap(c => {
      if (!c.tags) return [];
      if (typeof c.tags === 'string') return c.tags.split(',').map(t => t.trim()).filter(Boolean);
      if (Array.isArray(c.tags)) return c.tags.filter(Boolean);
      return [];
    })
  )].sort();
  const allTemperatures = ['hot', 'warm', 'cold'];

  // Show ALL contacts (not just available ones) - user can still add contacts already in campaign
  const filteredContacts = allContacts.filter(contact => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
      contact.business_name?.toLowerCase().includes(searchLower) ||
      contact.owner_name?.toLowerCase().includes(searchLower) ||
      contact.email?.toLowerCase().includes(searchLower) ||
      contact.phone?.toLowerCase().includes(searchLower);
    
    const matchesNiche = nicheFilter === 'all' || contact.niche_id === nicheFilter;
    
    const matchesCity = cityFilter === 'all' || contact.city === cityFilter;
    
    const matchesTag = tagFilter === 'all' || (() => {
      if (!contact.tags) return false;
      const contactTags = typeof contact.tags === 'string' 
        ? contact.tags.split(',').map(t => t.trim())
        : Array.isArray(contact.tags) 
        ? contact.tags 
        : [];
      return contactTags.includes(tagFilter);
    })();
    
    const matchesTemperature = temperatureFilter === 'all' || 
      (contact.temperature || 'warm') === temperatureFilter;
    
    return matchesSearch && matchesNiche && matchesCity && matchesTag && matchesTemperature;
  });

  const handleToggleContact = (contactId) => {
    const newSelected = new Set(selectedContactIds);
    if (newSelected.has(contactId)) {
      newSelected.delete(contactId);
    } else {
      newSelected.add(contactId);
    }
    setSelectedContactIds(newSelected);
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedContactIds(new Set(filteredContacts.map(c => c.id)));
    } else {
      setSelectedContactIds(new Set());
    }
  };

  const allSelected = filteredContacts.length > 0 && selectedContactIds.size === filteredContacts.length;
  const someSelected = selectedContactIds.size > 0 && selectedContactIds.size < filteredContacts.length;

  useEffect(() => {
    if (bulkSelectCheckboxRef.current) {
      bulkSelectCheckboxRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  const handleBulkAdd = async () => {
    if (selectedContactIds.size === 0) {
      return;
    }
    
    // If bulk add function is provided and multiple contacts selected, use it
    if (onBulkAdd && selectedContactIds.size > 1) {
      await onBulkAdd(selectedContactIds);
      setSelectedContactIds(new Set());
      // Don't close modal automatically - let user see results
    } else {
      // Otherwise, add contacts one by one
      for (const contactId of selectedContactIds) {
        await onAdd(contactId);
      }
      setSelectedContactIds(new Set());
      // Close modal after single add
      if (selectedContactIds.size === 1) {
        onClose();
      }
    }
  };

  return (
    <div className="contact-modal-backdrop" onClick={onClose}>
      <div className="add-contact-modal" onClick={(e) => e.stopPropagation()}>
        <div className="contact-modal-header">
          <div className="contact-modal-title-section">
            <UserPlus size={24} />
            <div>
              <h3>Add Advertiser to Campaign</h3>
              <p className="modal-subtitle">
                {campaign.niche_restriction_type === 'one_per_campaign' 
                  ? `Select a business from an available niche (${availableNiches.length} niches available)`
                  : 'Select a business to add to this campaign'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="contact-modal-close">×</button>
        </div>

        <div className="add-contact-modal-filters">
          <div className="contacts-search-bar">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <button
            type="button"
            className="filter-toggle-btn"
            onClick={() => setShowFilters(!showFilters)}
            title="Show filters"
          >
            <Filter size={18} />
            <span>Filters</span>
            <ChevronDown 
              size={16} 
              className={`filter-chevron ${showFilters ? 'open' : ''}`}
            />
          </button>
        </div>

        {/* Collapsible Filters Panel */}
        {showFilters && (
          <div className="add-contact-filters-panel">
            <div className="filters-panel-grid">
              <div className="filter-group">
                <label className="filter-label">Niche</label>
                <select 
                  value={nicheFilter}
                  onChange={(e) => setNicheFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Niches</option>
                  {niches.map(niche => (
                    <option key={niche.id} value={niche.id}>{niche.name}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label className="filter-label">City</label>
                <select 
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Cities</option>
                  {allCities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label className="filter-label">Tag</label>
                <select 
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Tags</option>
                  {allTags.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label className="filter-label">Temperature</label>
                <select 
                  value={temperatureFilter}
                  onChange={(e) => setTemperatureFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Temperatures</option>
                  {allTemperatures.map(temp => (
                    <option key={temp} value={temp}>{temp.charAt(0).toUpperCase() + temp.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Active Filters Display */}
            {(nicheFilter !== 'all' || cityFilter !== 'all' || tagFilter !== 'all' || temperatureFilter !== 'all') && (
              <div className="active-filters">
                <span className="active-filters-label">Active filters:</span>
                <div className="active-filters-tags">
                  {nicheFilter !== 'all' && (
                    <span className="active-filter-tag">
                      Niche: {niches.find(n => n.id === nicheFilter)?.name || nicheFilter}
                      <button
                        type="button"
                        onClick={() => setNicheFilter('all')}
                        className="active-filter-remove"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  )}
                  {cityFilter !== 'all' && (
                    <span className="active-filter-tag">
                      City: {cityFilter}
                      <button
                        type="button"
                        onClick={() => setCityFilter('all')}
                        className="active-filter-remove"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  )}
                  {tagFilter !== 'all' && (
                    <span className="active-filter-tag">
                      Tag: {tagFilter}
                      <button
                        type="button"
                        onClick={() => setTagFilter('all')}
                        className="active-filter-remove"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  )}
                  {temperatureFilter !== 'all' && (
                    <span className="active-filter-tag">
                      Temperature: {temperatureFilter.charAt(0).toUpperCase() + temperatureFilter.slice(1)}
                      <button
                        type="button"
                        onClick={() => setTemperatureFilter('all')}
                        className="active-filter-remove"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setNicheFilter('all');
                      setCityFilter('all');
                      setTagFilter('all');
                      setTemperatureFilter('all');
                    }}
                    className="clear-all-filters-btn"
                  >
                    Clear all
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="add-contact-modal-content">
          {filteredContacts.length === 0 ? (
            <div className="contacts-empty">
              {campaign.niche_restriction_type === 'one_per_campaign' && availableNiches.length === 0 ? (
                <>
                  <AlertCircle size={32} style={{ color: '#f59e0b' }} />
                  <p>All niche slots are filled!</p>
                  <p className="contacts-empty-hint">
                    Remove an existing advertiser to add a new one.
                  </p>
                </>
              ) : searchTerm || nicheFilter !== 'all' ? (
                <p>No contacts match your filters.</p>
              ) : (
                <>
                  <p>No available contacts.</p>
                  <p className="contacts-empty-hint">
                    All your contacts are already in this campaign, or you need to create new contacts.
                  </p>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="add-contact-list-header">
                <div className="bulk-select-control">
                  <input
                    type="checkbox"
                    className="bulk-select-checkbox"
                    checked={allSelected}
                    ref={bulkSelectCheckboxRef}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                  <span className="bulk-select-label">
                    {selectedContactIds.size > 0 
                      ? `${selectedContactIds.size} selected`
                      : 'Select all'}
                  </span>
                </div>
                {selectedContactIds.size > 0 && (
                  <button 
                    className="bulk-add-btn"
                    onClick={handleBulkAdd}
                  >
                    <Plus size={16} />
                    Add {selectedContactIds.size} Contact{selectedContactIds.size !== 1 ? 's' : ''}
                  </button>
                )}
              </div>

              <div className="add-contact-list">
                {filteredContacts.map(contact => {
                  const isSelected = selectedContactIds.has(contact.id);
                  const isInCampaign = campaignContacts.some(c => c.id === contact.id);
                  return (
                    <div 
                      key={contact.id} 
                      className={`add-contact-item ${isSelected ? 'selected' : ''} ${isInCampaign ? 'in-campaign' : ''}`}
                      onClick={(e) => {
                        if (e.target.type !== 'checkbox' && !isInCampaign) {
                          handleToggleContact(contact.id);
                        }
                      }}
                    >
                      <input
                        type="checkbox"
                        className="contact-select-checkbox"
                        checked={isSelected}
                        disabled={isInCampaign}
                        onChange={(e) => {
                          e.stopPropagation();
                          if (!isInCampaign) {
                            handleToggleContact(contact.id);
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="contact-avatar small">
                        {contact.business_name?.charAt(0).toUpperCase() || 'A'}
                      </div>
                      <div className="add-contact-item-info">
                        <div className="add-contact-item-name">
                          {contact.business_name}
                          {isInCampaign && (
                            <span className="in-campaign-badge" title="Already in campaign">
                              <CheckCircle size={12} />
                            </span>
                          )}
                        </div>
                        <div className="add-contact-item-details">
                          {contact.niche?.name && (
                            <span className="contact-niche">{contact.niche.name}</span>
                          )}
                          {contact.city && (
                            <span className="contact-detail-text">
                              <Building size={12} />
                              {contact.city}
                            </span>
                          )}
                          {contact.temperature && (
                            <span className={`contact-temperature ${contact.temperature}`}>
                              {contact.temperature.charAt(0).toUpperCase() + contact.temperature.slice(1)}
                            </span>
                          )}
                          {contact.tags && Array.isArray(contact.tags) && contact.tags.length > 0 && (
                            <span className="contact-tag-count">
                              <Tag size={12} />
                              {contact.tags.length} tag{contact.tags.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                      {!isInCampaign && (
                        <button 
                          className="add-contact-item-btn"
                          onClick={async (e) => {
                            e.stopPropagation();
                            await onAdd(contact.id);
                            // Close modal after adding single contact
                            onClose();
                          }}
                        >
                          <Plus size={18} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CampaignContactsTab;
