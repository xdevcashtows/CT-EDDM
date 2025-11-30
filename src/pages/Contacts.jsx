import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Search, 
  Edit,
  Trash2,
  Upload,
  Mail,
  Phone,
  Globe,
  MapPin,
  Calendar,
  LayoutGrid,
  List,
  Columns,
  X,
  Download,
  FileUp,
  AlertCircle,
  CheckCircle,
  Star,
  Settings,
  GripVertical,
  Save,
  XCircle,
  Tag,
  Table,
  Eye,
  EyeOff,
  GripVertical as ResizeHandle
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import './Contacts.css';
import { contacts as contactsAPI, niches as nichesAPI, clientAds, contactNotes as contactNotesAPI, pipelineStages as pipelineStagesAPI } from '../lib/api';
import { storage } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import ImageUploader from '../components/ImageUploader';
import PageLayout from '../components/PageLayout';

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

const STAGE_COLORS = [
  '#6b7280', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6',
  '#0ea5e9', '#22c55e', '#64748b', '#dc2626', '#06b6d4',
  '#f97316', '#84cc16', '#a855f7', '#14b8a6'
];

const TEMPERATURE_OPTIONS = [
  { value: 'hot', label: 'Hot' },
  { value: 'warm', label: 'Warm' },
  { value: 'cold', label: 'Cold' }
];

const ALLOWED_CONTACT_FIELDS = [
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
  'niche_id',
  'stage',
  'temperature',
  'notes',
  'tags',
  'first_contact_date',
  'last_contact_date',
  'next_follow_up_date'
];

const sanitizeContactPayload = (contact = {}) => {
  const payload = {};
  ALLOWED_CONTACT_FIELDS.forEach(field => {
    if (Object.prototype.hasOwnProperty.call(contact, field)) {
      payload[field] = contact[field];
    }
  });
  return payload;
};

const formatTemperatureLabel = (value) => {
  if (!value) return 'Cold';
  return value.charAt(0).toUpperCase() + value.slice(1);
};

// Helper function to get avatar gradient based on contact ID
const getAvatarGradient = (contactId) => {
  const gradients = [
    { from: '#3b82f6', to: '#06b6d4' }, // blue to cyan
    { from: '#8b5cf6', to: '#ec4899' }, // purple to pink
    { from: '#f97316', to: '#ef4444' }, // orange to red
    { from: '#22c55e', to: '#10b981' }, // green to emerald
    { from: '#6366f1', to: '#3b82f6' }, // indigo to blue
    { from: '#ec4899', to: '#f43f5e' }, // pink to rose
    { from: '#eab308', to: '#f97316' }, // yellow to orange
    { from: '#6366f1', to: '#8b5cf6' }, // indigo to purple
  ];
  if (!contactId) return gradients[0];
  const index = parseInt(contactId.toString().slice(-1), 16) % gradients.length;
  return gradients[index];
};

// Helper function to get initials from business name
const getInitials = (businessName) => {
  if (!businessName) return '?';
  const words = businessName.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
};

// Helper function to get temperature config
const getTemperatureConfig = (temperature) => {
  const configs = {
    hot: {
      background: { background: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)' },
      boxShadow: '0 2px 8px rgba(239, 68, 68, 0.5)',
      icon: '🔥',
    },
    warm: {
      background: { background: 'linear-gradient(135deg, #facc15 0%, #f97316 100%)' },
      boxShadow: '0 2px 8px rgba(250, 204, 21, 0.5)',
      icon: '☀️',
    },
    cold: {
      background: { background: 'linear-gradient(135deg, #60a5fa 0%, #06b6d4 100%)' },
      boxShadow: '0 2px 8px rgba(96, 165, 250, 0.5)',
      icon: '❄️',
    },
  };
  return configs[temperature] || configs.warm;
};

// Helper function to get stage style
const getStageStyle = (stage, pipelineStages) => {
  const stageObj = pipelineStages.find(s => s.id === stage);
  // Convert hex to rgba for background
  const hexToRgba = (hex, alpha) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };
  
  if (!stageObj) {
    // Return default gray style object
    return {
      backgroundColor: '#f3f4f6',
      color: '#374151',
      borderColor: '#e5e7eb',
    };
  }
  
  const color = stageObj.color;
  return {
    backgroundColor: hexToRgba(color, 0.1),
    color: color,
    borderColor: hexToRgba(color, 0.3),
  };
};

function Contacts() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [niches, setNiches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStages, setSelectedStages] = useState(new Set());
  const [nicheFilter, setNicheFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [temperatureFilter, setTemperatureFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [selectedContact, setSelectedContact] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showAdUpload, setShowAdUpload] = useState(false);
  const [contactAds, setContactAds] = useState([]);
  const [contactNotes, setContactNotes] = useState([]);
  const [viewMode, setViewMode] = useState('grid');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState([]);
  const [uploadErrors, setUploadErrors] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedContactIds, setSelectedContactIds] = useState(new Set());
  const [bulkEditData, setBulkEditData] = useState({
    temperature: '',
    stage: '',
    niche_id: '',
    tags: ''
  });
  const [pipelineStages, setPipelineStages] = useState([]);
  const [showStageEditor, setShowStageEditor] = useState(false);
  const [temperatureMenu, setTemperatureMenu] = useState(null); // { contactId, x, y }
  const [stageMenu, setStageMenu] = useState(null); // { contactId, x, y }

  useEffect(() => {
    if (user) {
      loadData();
      loadPipelineStages();
    }
  }, [user]);

  const loadPipelineStages = async () => {
    const { data, error } = await pipelineStagesAPI.getAll(user.id);
    
    if (error) {
      console.error('Failed to load pipeline stages:', error);
      // Fallback to defaults
      setPipelineStages(DEFAULT_PIPELINE_STAGES);
      return;
    }

    if (!data || data.length === 0) {
      // No stages in database yet, use defaults and save them
      setPipelineStages(DEFAULT_PIPELINE_STAGES);
      await initializeDefaultStages();
    } else {
      // Map database stages to component format
      const mappedStages = data.map(stage => ({
        id: stage.stage_id,
        label: stage.label,
        color: stage.color
      }));
      setPipelineStages(mappedStages);
    }
  };

  const initializeDefaultStages = async () => {
    // Save default stages to database for this user
    const stagePromises = DEFAULT_PIPELINE_STAGES.map((stage, index) => 
      pipelineStagesAPI.create({
        user_id: user.id,
        stage_id: stage.id,
        label: stage.label,
        color: stage.color,
        sort_order: index + 1
      })
    );

    await Promise.all(stagePromises);
  };

  const savePipelineStages = async (stages) => {
    // Update stages in database
    const updatePromises = stages.map((stage, index) => {
      // For existing stages (have an id), update them
      // For new stages, create them
      if (DEFAULT_PIPELINE_STAGES.find(ds => ds.id === stage.id)) {
        // Existing stage - update
        return pipelineStagesAPI.updateMany([{
          user_id: user.id,
          stage_id: stage.id,
          label: stage.label,
          color: stage.color,
          sort_order: index + 1
        }]);
      } else {
        // New custom stage - create
        return pipelineStagesAPI.create({
          user_id: user.id,
          stage_id: stage.id,
          label: stage.label,
          color: stage.color,
          sort_order: index + 1
        });
      }
    });

    const results = await Promise.all(updatePromises);
    const hasErrors = results.some(r => r.error);
    
    if (hasErrors) {
      console.error('Failed to save some stages:', results.filter(r => r.error));
      alert('Failed to save some stages. Please try again.');
      return;
    }

    // Update local state
    setPipelineStages(stages);
    
    // Reload stages from database to ensure sync
    await loadPipelineStages();
  };

  const loadData = async () => {
    setLoading(true);
    const [contactsRes, nichesRes] = await Promise.all([
      contactsAPI.getAll(user.id),
      nichesAPI.getAll()
    ]);

    if (contactsRes.error) {
      console.error('Failed to load contacts:', contactsRes.error);
    } else {
      setContacts(contactsRes.data || []);
    }
    if (nichesRes.error) {
      console.error('Failed to load niches:', nichesRes.error);
    } else {
      setNiches(nichesRes.data || []);
    }
    setLoading(false);
  };

  const loadContactDetails = async (contactId) => {
    const [adsRes, notesRes] = await Promise.all([
      clientAds.getByContact(contactId),
      contactNotesAPI.getByContact(contactId)
    ]);

    if (!adsRes.error) setContactAds(adsRes.data || []);
    if (!notesRes.error) setContactNotes(notesRes.data || []);
  };

  // Get all unique tags from contacts
  const allTags = [...new Set(
    contacts
      .flatMap(c => {
        if (!c.tags) return [];
        if (typeof c.tags === 'string') {
          return c.tags.split(',').map(t => t.trim()).filter(Boolean);
        }
        if (Array.isArray(c.tags)) {
          return c.tags.filter(Boolean);
        }
        return [];
      })
  )].sort();

  const filteredAndSortedContacts = contacts
    .filter(contact => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        contact.business_name?.toLowerCase().includes(searchLower) ||
        contact.owner_name?.toLowerCase().includes(searchLower) ||
        contact.email?.toLowerCase().includes(searchLower) ||
        contact.city?.toLowerCase().includes(searchLower) ||
        contact.state?.toLowerCase().includes(searchLower);
      
      // If no stages selected, show all. Otherwise, only show contacts whose stage is selected
      const matchesStage = selectedStages.size === 0 || selectedStages.has(contact.stage);
      
      const matchesNiche = nicheFilter === 'all' || contact.niche_id === nicheFilter;
      
      // Tag matching logic
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
      
      return matchesSearch && matchesStage && matchesNiche && matchesTag && matchesTemperature;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.business_name || '').localeCompare(b.business_name || '');
        case 'name-desc':
          return (b.business_name || '').localeCompare(a.business_name || '');
        case 'stage':
          return (a.stage || '').localeCompare(b.stage || '');
        case 'temperature':
          const tempOrder = { hot: 0, warm: 1, cold: 2 };
          return tempOrder[a.temperature || 'warm'] - tempOrder[b.temperature || 'warm'];
        case 'recent':
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        default:
          return 0;
      }
  });

  const handleContactClick = async (contact) => {
    setSelectedContact(contact);
    await loadContactDetails(contact.id);
    setShowModal(true);
  };

  const handleCreateContact = () => {
    setSelectedContact({
      business_name: '',
      owner_name: '',
      email: '',
      phone: '',
      website: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      niche_id: null,
      stage: 'lead',
      temperature: 'cold',
      notes: ''
    });
    setContactAds([]);
    setContactNotes([]);
    setShowModal(true);
  };

  const handleSaveContact = async (contactData) => {
    const payload = sanitizeContactPayload(contactData);

    // Convert tags from comma-separated string to array
    if (typeof payload.tags === 'string') {
      if (payload.tags.trim() === '') {
        // Empty string should be an empty array
        payload.tags = [];
      } else {
        // Convert comma-separated string to array
        payload.tags = payload.tags.split(',').map(t => t.trim()).filter(Boolean);
      }
    }

    if (selectedContact.id) {
      // Update existing
      const { data, error } = await contactsAPI.update(selectedContact.id, payload);
      if (!error) {
        setContacts(contacts.map(c => c.id === selectedContact.id ? data : c));
        setShowModal(false);
      } else {
        console.error('Failed to update contact', error);
        alert(`Failed to update contact: ${error?.message || 'Unknown error'}`);
      }
    } else {
      // Create new
      const { data, error } = await contactsAPI.create({ ...payload, user_id: user.id });
      if (!error) {
        setContacts([data, ...contacts]);
        setShowModal(false);
      } else {
        console.error('Failed to create contact', error);
        alert(`Failed to create contact: ${error?.message || 'Unknown error'}`);
      }
    }
  };

  const handleInlineUpdate = async (contactId, field, value) => {
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) return;

    const updates = { [field]: value };
    
    // Handle special fields
    if (field === 'niche_id') {
      // Find niche by name
      const niche = niches.find(n => n.name.toLowerCase() === value.toLowerCase());
      updates.niche_id = niche ? niche.id : null;
    } else if (field === 'stage') {
      // Find stage by label
      const stage = pipelineStages.find(s => s.label.toLowerCase() === value.toLowerCase());
      updates.stage = stage ? stage.id : value;
    } else if (field === 'tags') {
      // Convert comma-separated string to array
      updates.tags = value 
        ? value.split(',').map(t => t.trim()).filter(Boolean)
        : [];
    }

    const payload = sanitizeContactPayload({ ...contact, ...updates });
    
    const { data, error } = await contactsAPI.update(contactId, payload);
    if (!error) {
      setContacts(contacts.map(c => c.id === contactId ? data : c));
    } else {
      console.error('Failed to update contact', error);
      // Silently fail for inline edits to avoid interrupting workflow
    }
  };

  const handleDeleteContact = async (contactId) => {
    if (confirm('Are you sure you want to delete this contact?')) {
      const { error } = await contactsAPI.delete(contactId);
      if (!error) {
        setContacts(contacts.filter(c => c.id !== contactId));
        setShowModal(false);
      } else {
        alert('Failed to delete contact');
      }
    }
  };

  const handleToggleFavorite = async (contactId, currentFavorite) => {
    const { data, error } = await contactsAPI.update(contactId, { 
      is_favorite: !currentFavorite 
    });
    if (!error) {
      setContacts(contacts.map(c => c.id === contactId ? data : c));
    }
  };

  const handleSelectContact = (contactId) => {
    const newSelected = new Set(selectedContactIds);
    if (newSelected.has(contactId)) {
      newSelected.delete(contactId);
    } else {
      newSelected.add(contactId);
    }
    setSelectedContactIds(newSelected);
  };

  const handleSelectAllContacts = (checked) => {
    if (checked) {
      setSelectedContactIds(new Set(filteredAndSortedContacts.map(c => c.id)));
    } else {
      setSelectedContactIds(new Set());
    }
  };

  const handleBulkEdit = async () => {
    if (selectedContactIds.size === 0) {
      alert('Please select at least one contact');
      return;
    }

    const updates = {};
    if (bulkEditData.temperature) updates.temperature = bulkEditData.temperature;
    if (bulkEditData.stage) updates.stage = bulkEditData.stage;
    if (bulkEditData.niche_id) updates.niche_id = bulkEditData.niche_id;
    if (bulkEditData.tags) {
      // Convert tags to array format
      updates.tags = bulkEditData.tags.split(',').map(t => t.trim()).filter(Boolean);
    }

    if (Object.keys(updates).length === 0) {
      alert('Please select at least one field to update');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const contactId of selectedContactIds) {
      const { error } = await contactsAPI.update(contactId, updates);
      if (error) {
        errorCount++;
      } else {
        successCount++;
      }
    }

    alert(`Bulk edit complete!\nUpdated: ${successCount}\nFailed: ${errorCount}`);
    await loadData();
    setSelectedContactIds(new Set());
    setBulkEditData({ temperature: '', stage: '', niche_id: '', tags: '' });
  };

  const handleBulkDelete = async () => {
    if (selectedContactIds.size === 0) {
      alert('Please select at least one contact');
      return;
    }

    const confirmMessage = `Are you sure you want to delete ${selectedContactIds.size} contact${selectedContactIds.size > 1 ? 's' : ''}?\n\nThis action cannot be undone.`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const contactId of selectedContactIds) {
      const { error } = await contactsAPI.delete(contactId);
      if (error) {
        errorCount++;
      } else {
        successCount++;
      }
    }

    alert(`Bulk delete complete!\nDeleted: ${successCount}\nFailed: ${errorCount}`);
    await loadData();
    setSelectedContactIds(new Set());
  };

  const handleExportCSV = () => {
    // Prepare CSV headers
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
      'niche',
      'stage',
      'temperature',
      'tags',
      'notes',
      'created_at'
    ];

    // Prepare CSV rows
    const rows = filteredAndSortedContacts.map(contact => {
      const tags = Array.isArray(contact.tags) 
        ? contact.tags.join(', ') 
        : typeof contact.tags === 'string' 
        ? contact.tags 
        : '';

      const stage = pipelineStages.find(s => s.id === contact.stage)?.label || contact.stage || '';

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
        contact.niche?.name || '',
        stage,
        contact.temperature || 'warm',
        tags,
        contact.notes || '',
        contact.created_at ? new Date(contact.created_at).toLocaleDateString() : ''
      ];
    });

    // Escape CSV values
    const escapeCSV = (value) => {
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    // Build CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `contacts_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleStageChange = async (contactId, newStage) => {
    const { data, error } = await contactsAPI.update(contactId, { stage: newStage });
    if (!error) {
      setContacts(contacts.map(c => c.id === contactId ? data : c));
      if (selectedContact?.id === contactId) {
        setSelectedContact(data);
      }
    }
  };

  // Handle temperature menu
  const handleTemperatureMenuClick = (e, contactId) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const contact = contacts.find(c => c.id === contactId);
    setTemperatureMenu({
      contactId,
      currentTemperature: contact?.temperature || 'warm',
      x: rect.left,
      y: rect.bottom + 5
    });
    setStageMenu(null); // Close stage menu if open
  };

  const handleTemperatureChange = async (contactId, temperature) => {
    await handleInlineUpdate(contactId, 'temperature', temperature);
    setTemperatureMenu(null);
  };

  // Handle stage menu
  const handleStageMenuClick = (e, contactId) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const contact = contacts.find(c => c.id === contactId);
    setStageMenu({
      contactId,
      currentStage: contact?.stage || null,
      x: rect.left,
      y: rect.bottom + 5
    });
    setTemperatureMenu(null); // Close temperature menu if open
  };

  const handleStageChangeFromMenu = async (contactId, stageId) => {
    await handleStageChange(contactId, stageId);
    setStageMenu(null);
  };

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (temperatureMenu && !e.target.closest('.temperature-dropdown-menu')) {
        setTemperatureMenu(null);
      }
      if (stageMenu && !e.target.closest('.stage-dropdown-menu')) {
        setStageMenu(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [temperatureMenu, stageMenu]);

  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;

    // Dropped outside the list
    if (!destination) {
      return;
    }

    // No movement
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const contactId = draggableId;
    const newStage = destination.droppableId;

    // Optimistically update UI
    const updatedContacts = contacts.map(c => 
      c.id === contactId ? { ...c, stage: newStage } : c
    );
    setContacts(updatedContacts);

    // Update in database
    const { error } = await contactsAPI.update(contactId, { stage: newStage });
    if (error) {
      // Revert on error
      setContacts(contacts);
      alert('Failed to update contact stage');
    }
  };

  const handleAdUpload = async (file) => {
    if (!selectedContact?.id) return;

    // Upload to storage
    const { data: uploadData, error: uploadError } = await storage.uploadClientAd(
      user.id,
      file,
      selectedContact.id
    );

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error('Failed to upload image');
    }

    console.log('Upload successful, URL:', uploadData.url);

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

    if (!error) {
      console.log('Ad saved to database:', data);
      setContactAds([data, ...contactAds]);
    } else {
      console.error('Database save error:', error);
      throw new Error('Failed to save ad');
    }
  };

  const handleAdDelete = async (adId) => {
    if (!confirm('Are you sure you want to delete this ad? This action cannot be undone.')) {
      return;
    }

    const { error } = await clientAds.delete(adId);
    if (!error) {
      setContactAds(contactAds.filter(ad => ad.id !== adId));
    } else {
      alert('Failed to delete ad');
    }
  };

  const handleRequestApproval = async (adId) => {
    // TODO: Send email via Netlify function
    const { data, error } = await clientAds.updateApprovalStatus(adId, 'pending');
    if (!error) {
      setContactAds(contactAds.map(ad => ad.id === adId ? { ...ad, approval_status: 'pending', approval_requested_at: new Date().toISOString() } : ad));
      alert('Approval request sent!');
    }
  };

  const handleAddNote = async (noteText) => {
    if (!selectedContact?.id || !noteText.trim()) return;

    const { data, error } = await contactNotesAPI.create({
      contact_id: selectedContact.id,
      user_id: user.id,
      note: noteText.trim()
    });

    if (!error) {
      setContactNotes([data, ...contactNotes]);
    } else {
      alert('Failed to add note');
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!confirm('Are you sure you want to delete this note?')) {
      return;
    }

    const { error } = await contactNotesAPI.delete(noteId);
    if (!error) {
      setContactNotes(contactNotes.filter(note => note.id !== noteId));
    } else {
      alert('Failed to delete note');
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedStages(new Set());
    setNicheFilter('all');
    setTagFilter('all');
    setTemperatureFilter('all');
    setSortBy('name');
  };

  const handleToggleStage = (stageId) => {
    setSelectedStages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stageId)) {
        newSet.delete(stageId);
      } else {
        newSet.add(stageId);
      }
      return newSet;
    });
  };

  const handleToggleAllStages = () => {
    // If no stages or all stages are selected, clear selection (shows all contacts)
    // Otherwise, select all stages
    if (selectedStages.size === 0 || selectedStages.size === pipelineStages.length) {
      setSelectedStages(new Set());
    } else {
      setSelectedStages(new Set(pipelineStages.map(s => s.id)));
    }
  };

  const hasActiveFilters = 
    searchTerm !== '' || 
    selectedStages.size > 0 || 
    nicheFilter !== 'all' || 
    tagFilter !== 'all' || 
    temperatureFilter !== 'all' ||
    sortBy !== 'name';

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      alert('Please upload a CSV file');
      return;
    }

    setUploadFile(file);
    parseCSV(file);
  };

  const parseCSV = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        alert('CSV file is empty or invalid');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const requiredHeader = 'business_name';
      
      if (!headers.includes(requiredHeader)) {
        alert(`CSV must include "${requiredHeader}" column`);
        return;
      }

      const preview = [];
      const errors = [];

      for (let i = 1; i < lines.length && i < 6; i++) {
        const values = parseCSVLine(lines[i]);
        const contact = {};
        
        headers.forEach((header, index) => {
          if (values[index]) {
            contact[header] = values[index].trim();
          }
        });

        if (contact.business_name) {
          preview.push(contact);
        } else {
          errors.push(`Row ${i + 1}: Missing business name`);
        }
      }

      setUploadPreview(preview);
      setUploadErrors(errors);
    };

    reader.readAsText(file);
  };

  const parseCSVLine = (line) => {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current);
    
    return values.map(v => v.replace(/^"|"$/g, ''));
  };

  const handleImportContacts = async () => {
    if (!uploadFile) return;

    setIsUploading(true);
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      const text = e.target.result;
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      // Pre-process to collect unique niches from CSV
      const uniqueNichesInCSV = new Set();
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const contactData = {};
        headers.forEach((header, index) => {
          if (values[index]) {
            contactData[header] = values[index].trim();
          }
        });
        if (contactData.niche) {
          uniqueNichesInCSV.add(contactData.niche.trim());
        }
      }

      // Create all missing niches first (batch operation)
      const nichesMap = new Map();
      // Add existing niches to map
      niches.forEach(n => nichesMap.set(n.name.toLowerCase(), n));
      
      // Create new niches
      for (const nicheName of uniqueNichesInCSV) {
        const lowerName = nicheName.toLowerCase();
        if (!nichesMap.has(lowerName)) {
          try {
            const { data: newNiche, error: nicheError } = await nichesAPI.create(nicheName, user.id);
            if (!nicheError && newNiche) {
              nichesMap.set(lowerName, newNiche);
            } else if (nicheError) {
              // If it's a unique constraint error, try to fetch it (might have been created by another process)
              if (nicheError.code === '23505') {
                const existingNiches = await nichesAPI.getAll();
                if (existingNiches.data) {
                  const existing = existingNiches.data.find(n => n.name.toLowerCase() === lowerName);
                  if (existing) {
                    nichesMap.set(lowerName, existing);
                  }
                }
              } else {
                errors.push(`Failed to create niche "${nicheName}": ${nicheError.message || 'Unknown error'}`);
              }
            }
          } catch (err) {
            errors.push(`Exception creating niche "${nicheName}": ${err.message}`);
          }
        }
      }

      // Update local niches state
      setNiches(Array.from(nichesMap.values()));

      // Now import contacts
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const contactData = {};
        
        headers.forEach((header, index) => {
          if (values[index]) {
            contactData[header] = values[index].trim();
          }
        });

        if (!contactData.business_name) {
          errorCount++;
          errors.push(`Row ${i + 1}: Missing business name`);
          continue;
        }

        // Map niche name to niche_id
        if (contactData.niche && !contactData.niche_id) {
          const nicheName = contactData.niche.trim();
          if (nicheName) {
            const niche = nichesMap.get(nicheName.toLowerCase());
            if (niche) {
              contactData.niche_id = niche.id;
            }
          }
          delete contactData.niche;
        }

        // Set defaults
        if (!contactData.stage) contactData.stage = 'lead';
        if (!contactData.temperature) contactData.temperature = 'cold';

        // Convert tags from comma-separated string to array
        if (contactData.tags && typeof contactData.tags === 'string') {
          contactData.tags = contactData.tags.split(',').map(t => t.trim()).filter(Boolean);
        }

        const payload = sanitizeContactPayload(contactData);
        const { error } = await contactsAPI.create({ ...payload, user_id: user.id });
        
        if (error) {
          errorCount++;
          errors.push(`Row ${i + 1} (${contactData.business_name}): ${error.message || 'Unknown error'}`);
        } else {
          successCount++;
        }
      }

      setIsUploading(false);
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadPreview([]);
      setUploadErrors([]);
      
      // Show results
      let message = `Import complete!\n✓ Successfully imported: ${successCount}\n✗ Failed: ${errorCount}`;
      
      if (errors.length > 0 && errors.length <= 10) {
        message += '\n\nErrors:\n' + errors.slice(0, 10).join('\n');
      } else if (errors.length > 10) {
        message += '\n\nShowing first 10 errors:\n' + errors.slice(0, 10).join('\n');
        console.error('All import errors:', errors);
      }
      
      alert(message);
      loadData();
    };

    reader.readAsText(uploadFile);
  };

  const layoutProps = {
    title: 'Contacts',
    subtitle: 'Manage your clients and prospects from one workspace.',
    tip: 'Use filters to quickly surface leads, active clients, or opportunities.'
  };

  if (loading) {
    return (
      <PageLayout {...layoutProps} className="page-shell--fullwidth">
        <div className="contacts-page">
          <div className="loading-state">
            <div className="spinner-large"></div>
            <p>Loading contacts...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      {...layoutProps}
      actions={
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-secondary" onClick={handleExportCSV}>
            <Download size={20} />
            Export CSV
          </button>
          <button className="btn-secondary" onClick={() => setShowUploadModal(true)}>
            <Upload size={20} />
            Upload Contacts
          </button>
          <button className="btn-primary" onClick={handleCreateContact}>
            <Plus size={20} />
            Add Contact
          </button>
        </div>
      }
      className="page-shell--fullwidth"
    >
      <div className="contacts-page">
        {/* Filters - Modern Redesign */}
        <div className="contacts-filters-v2">
          {/* Main Bar: Search, Quick Filters, View Toggle, Results */}
          <div className="filters-main-bar">
            <div className="filters-left-group">
              {/* Search */}
              <div className="search-container-v2">
                <Search size={16} className="search-icon-v2" />
                <input
                  type="text"
                  placeholder="Search contacts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input-v2"
                />
                {searchTerm && (
                  <button
                    className="search-clear-btn"
                    onClick={() => setSearchTerm('')}
                    title="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Quick Filters */}
              <div className="quick-filters-v2">
                <div className={`quick-filter-item ${nicheFilter !== 'all' ? 'active' : ''}`}>
                  <select
                    value={nicheFilter}
                    onChange={(e) => setNicheFilter(e.target.value)}
                    className="quick-filter-select"
                  >
                    <option value="all">All Niches</option>
                    {niches.map(niche => (
                      <option key={niche.id} value={niche.id}>{niche.name}</option>
                    ))}
                  </select>
                </div>

                <div className={`quick-filter-item ${tagFilter !== 'all' ? 'active' : ''}`}>
                  <select
                    value={tagFilter}
                    onChange={(e) => setTagFilter(e.target.value)}
                    className="quick-filter-select"
                  >
                    <option value="all">All Tags</option>
                    {allTags.map(tag => (
                      <option key={tag} value={tag}>{tag}</option>
                    ))}
                  </select>
                </div>

                <div className={`quick-filter-item temp-filter-v2 ${temperatureFilter !== 'all' ? 'active' : ''}`}>
                  <button
                    className={`temp-btn-v2 ${temperatureFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setTemperatureFilter('all')}
                    title="All temperatures"
                  >
                    All
                  </button>
                  <button
                    className={`temp-btn-v2 hot ${temperatureFilter === 'hot' ? 'active' : ''}`}
                    onClick={() => setTemperatureFilter('hot')}
                    title="Hot leads"
                  >
                    🔥
                  </button>
                  <button
                    className={`temp-btn-v2 warm ${temperatureFilter === 'warm' ? 'active' : ''}`}
                    onClick={() => setTemperatureFilter('warm')}
                    title="Warm leads"
                  >
                    ☀️
                  </button>
                  <button
                    className={`temp-btn-v2 cold ${temperatureFilter === 'cold' ? 'active' : ''}`}
                    onClick={() => setTemperatureFilter('cold')}
                    title="Cold leads"
                  >
                    ❄️
                  </button>
                </div>

                <div className={`quick-filter-item ${sortBy !== 'name' ? 'active' : ''}`}>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="quick-filter-select"
                  >
                    <option value="name">Sort: A-Z</option>
                    <option value="name-desc">Sort: Z-A</option>
                    <option value="stage">Sort: Stage</option>
                    <option value="temperature">Sort: Temperature</option>
                    <option value="recent">Sort: Recent</option>
                  </select>
                </div>

                {hasActiveFilters && (
                  <button
                    className="clear-filters-btn-v2"
                    onClick={handleClearFilters}
                    title="Clear all filters"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="filters-right-group">
              {/* View Toggle */}
              <div className="view-toggle-v2">
                <button
                  type="button"
                  className={`view-btn-v2 ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setViewMode('grid')}
                  title="Grid view"
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  type="button"
                  className={`view-btn-v2 ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setViewMode('list')}
                  title="List view"
                >
                  <List size={16} />
                </button>
                <button
                  type="button"
                  className={`view-btn-v2 ${viewMode === 'table' ? 'active' : ''}`}
                  onClick={() => setViewMode('table')}
                  title="Table view"
                >
                  <Table size={16} />
                </button>
                <button
                  type="button"
                  className={`view-btn-v2 ${viewMode === 'pipeline' ? 'active' : ''}`}
                  onClick={() => setViewMode('pipeline')}
                  title="Pipeline view"
                >
                  <Columns size={16} />
                </button>
              </div>

              {/* Results Summary */}
              <div className="results-summary-v2">
                <span className="results-count-v2">
                  {filteredAndSortedContacts.length}
                  <span className="results-total">/{contacts.length}</span>
                </span>
                {selectedContactIds.size > 0 && (
                  <span className="selected-badge-v2">{selectedContactIds.size} selected</span>
                )}
              </div>
            </div>
          </div>

          {/* Stage Filters Row */}
          <div className="stage-filters-v2">
            {selectedStages.size > 0 && selectedStages.size < pipelineStages.length && (
              <span className="stage-filter-badge-v2">
                {selectedStages.size} of {pipelineStages.length} stages
              </span>
            )}
            <div className="stage-pills-v2">
              <button
                className={`stage-pill-v2 all-pill-v2 ${selectedStages.size === 0 ? 'active' : ''}`}
                onClick={handleToggleAllStages}
                title={selectedStages.size === 0 ? 'All stages shown' : `${selectedStages.size} stages selected`}
              >
                <span className="stage-label-v2">All</span>
                <span className="stage-count-v2">{contacts.length}</span>
              </button>
              {pipelineStages.map(stage => {
                const count = contacts.filter(c => c.stage === stage.id).length;
                const isSelected = selectedStages.has(stage.id);
                return (
                  <button
                    key={stage.id}
                    className={`stage-pill-v2 ${isSelected ? 'active' : ''}`}
                    onClick={() => handleToggleStage(stage.id)}
                    style={{ 
                      '--stage-color': stage.color,
                      '--stage-color-light': `${stage.color}20`,
                      '--stage-color-lighter': `${stage.color}10`,
                    }}
                  >
                    <span className="stage-label-v2">{stage.label}</span>
                    <span className="stage-count-v2">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

      {/* Bulk Edit Panel - Shows when contacts are selected */}
      {selectedContactIds.size > 0 && (
        <div className="bulk-edit-panel-compact">
          <div className="bulk-edit-info">
            <div className="bulk-edit-badge">
              <CheckCircle size={16} />
              <span>{selectedContactIds.size} selected</span>
            </div>
            <span className="bulk-edit-label">Bulk Edit:</span>
          </div>
          
          <div className="bulk-edit-controls">
            <select
              className="bulk-edit-select"
              value={bulkEditData.temperature}
              onChange={(e) => setBulkEditData({ ...bulkEditData, temperature: e.target.value })}
            >
              <option value="">Temperature</option>
              {TEMPERATURE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>

            <select
              className="bulk-edit-select"
              value={bulkEditData.stage}
              onChange={(e) => setBulkEditData({ ...bulkEditData, stage: e.target.value })}
            >
              <option value="">Stage</option>
              {pipelineStages.map(stage => (
                <option key={stage.id} value={stage.id}>{stage.label}</option>
              ))}
            </select>

            <select
              className="bulk-edit-select"
              value={bulkEditData.niche_id}
              onChange={(e) => setBulkEditData({ ...bulkEditData, niche_id: e.target.value })}
            >
              <option value="">Niche</option>
              {niches.map(niche => (
                <option key={niche.id} value={niche.id}>{niche.name}</option>
              ))}
            </select>

            <input
              type="text"
              className="bulk-edit-input"
              value={bulkEditData.tags}
              onChange={(e) => setBulkEditData({ ...bulkEditData, tags: e.target.value })}
              placeholder="Add tags..."
            />
          </div>

          <div className="bulk-edit-actions-compact">
            <button className="btn-apply" onClick={handleBulkEdit}>
              <CheckCircle size={16} />
              Apply
            </button>
            <button className="btn-delete-bulk" onClick={handleBulkDelete} title="Delete selected contacts">
              <Trash2 size={16} />
              Delete
            </button>
            <button 
              className="btn-clear" 
              onClick={() => {
                setSelectedContactIds(new Set());
                setBulkEditData({ temperature: '', stage: '', niche_id: '', tags: '' });
              }}
              title="Clear selection"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Contacts Content */}
      {viewMode === 'table' ? (
        <ContactsSpreadsheetView
          contacts={filteredAndSortedContacts}
          niches={niches}
          pipelineStages={pipelineStages}
          selectedContactIds={selectedContactIds}
          onSelectContact={handleSelectContact}
          onSelectAllContacts={handleSelectAllContacts}
          onContactClick={handleContactClick}
          onUpdateContact={handleInlineUpdate}
        />
      ) : viewMode === 'pipeline' ? (
        filteredAndSortedContacts.length === 0 ? (
          <div className="empty-state">
            <p>No contacts found</p>
          </div>
        ) : (
          <div className="contacts-kanban">
            <div className="pipeline-header">
              <h3>Pipeline Board</h3>
              <button 
                className="btn-secondary btn-sm"
                onClick={() => setShowStageEditor(true)}
              >
                <Settings size={16} />
                Edit Stages
              </button>
            </div>
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="contacts-kanban-board">
                {pipelineStages.map(stage => {
                  const stageContacts = filteredAndSortedContacts.filter(c => c.stage === stage.id);
                  
                  // Helper function to convert hex to rgba
                  const hexToRgba = (hex, alpha) => {
                    const r = parseInt(hex.slice(1, 3), 16);
                    const g = parseInt(hex.slice(3, 5), 16);
                    const b = parseInt(hex.slice(5, 7), 16);
                    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
                  };
                  
                  // Helper to darken color
                  const darkenColor = (hex) => {
                    const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - 60);
                    const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - 60);
                    const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - 60);
                    return `rgb(${r}, ${g}, ${b})`;
                  };
                  
                  return (
                    <div 
                      key={stage.id} 
                      className="contacts-kanban-column"
                      style={{
                        '--stage-color': stage.color,
                        '--stage-color-light': hexToRgba(stage.color, 0.15),
                        '--stage-color-lighter': hexToRgba(stage.color, 0.05),
                        '--stage-color-dark': darkenColor(stage.color),
                        borderColor: hexToRgba(stage.color, 0.3)
                      }}
                    >
                      <div className="contacts-kanban-column-header" style={{ borderColor: stage.color }}>
                        <div>
                          <h3>{stage.label}</h3>
                          <p>{stageContacts.length} contact{stageContacts.length === 1 ? '' : 's'}</p>
                        </div>
                        <span className="contacts-kanban-column-count">
                          {stageContacts.length}
                        </span>
                      </div>
                      <Droppable droppableId={stage.id}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`contacts-kanban-column-body ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                          >
                            {stageContacts.length === 0 ? (
                              <div className="contacts-kanban-column-empty">
                                <p>No contacts in this stage.</p>
                              </div>
                            ) : (
                              stageContacts.map((contact, index) => {
                                const contactTags = typeof contact.tags === 'string' 
                                  ? contact.tags.split(',').map(t => t.trim()) 
                                  : Array.isArray(contact.tags) ? contact.tags : [];
                                const displayTag = contactTags.filter(Boolean)[0];
                                
                                return (
                                  <Draggable key={contact.id} draggableId={contact.id} index={index}>
                                    {(provided, snapshot) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        className={`contact-kanban-card ${snapshot.isDragging ? 'dragging' : ''}`}
                                        onClick={() => handleContactClick(contact)}
                                      >
                                        <div className="contact-kanban-card__content">
                                          <div className="contact-kanban-card__header">
                                            <div className="contact-kanban-business">{contact.business_name}</div>
                                            <div
                                              className={`contact-kanban-temperature contact-temperature--${contact.temperature || 'warm'}`}
                                              style={{ cursor: 'pointer' }}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleTemperatureMenuClick(e, contact.id);
                                              }}
                                              title="Click to change temperature"
                                            >
                                              {contact.temperature === 'hot' && '🔥'}
                                              {contact.temperature === 'warm' && '☀️'}
                                              {contact.temperature === 'cold' && '❄️'}
                                              {!contact.temperature && '☀️'}
                                            </div>
                                          </div>
                                          {contact.niche?.name && (
                                            <div className="contact-kanban-niche">{contact.niche.name}</div>
                                          )}
                                          {displayTag && (
                                            <div className="contact-kanban-tag">{displayTag}</div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </Draggable>
                                );
                              })
                            )}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  );
                })}
              </div>
            </DragDropContext>
          </div>
        )
      ) : (
        <div className={`contacts-grid ${viewMode === 'list' ? 'list-view' : ''}`}>
          {filteredAndSortedContacts.length === 0 ? (
            <div className="empty-state">
              <p>No contacts found</p>
            </div>
          ) : viewMode === 'grid' ? (
            filteredAndSortedContacts.map(contact => {
              const stage = pipelineStages.find(s => s.id === contact.stage);
              const temperature = contact.temperature || 'warm';
              const tagsArray = typeof contact.tags === 'string' 
                ? contact.tags.split(',').map(t => t.trim()).filter(Boolean)
                : (Array.isArray(contact.tags) ? contact.tags.filter(Boolean) : []);

              const tempConfig = getTemperatureConfig(temperature);
              const stageStyle = getStageStyle(contact.stage, pipelineStages);
              const isSelected = selectedContactIds.has(contact.id);
              const avatarGradient = getAvatarGradient(contact.id);

              return (
                <div
                  key={contact.id}
                  className="contact-card-redesigned"
                  onClick={() => handleContactClick(contact)}
                >
                  {/* Header */}
                  <div className="contact-card-header-redesigned">
                    {/* Avatar with Gradient */}
                    <div 
                      className="contact-avatar-redesigned"
                      style={{
                        background: `linear-gradient(135deg, ${avatarGradient.from} 0%, ${avatarGradient.to} 100%)`
                      }}
                    >
                      {getInitials(contact.business_name)}
                    </div>

                    {/* Business Info */}
                    <div className="contact-business-info-redesigned">
                      <h3 className="contact-business-name-redesigned">
                        {contact.business_name || 'Unnamed Business'}
                      </h3>
                      {contact.owner_name && (
                        <p className="contact-owner-name-redesigned">{contact.owner_name}</p>
                      )}
                    </div>

                    {/* Top Right Controls */}
                    <div className="contact-card-controls-redesigned" onClick={(e) => e.stopPropagation()}>
                      <button
                        className={`contact-checkbox-redesigned ${isSelected ? 'checked' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectContact(contact.id);
                        }}
                      >
                        {isSelected && (
                          <svg
                            className="checkmark-icon"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3.5}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </button>

                      <button
                        className={`contact-favorite-btn-redesigned ${contact.is_favorite ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(contact.id, contact.is_favorite);
                        }}
                        title={contact.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <Star size={16} fill={contact.is_favorite ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                  </div>

                  {/* Tags Row */}
                  <div className="contact-tags-row-redesigned">
                    {/* Niche Tag */}
                    {contact.niche?.name && (
                      <span className="contact-niche-tag-redesigned">
                        {contact.niche.name}
                      </span>
                    )}

                    {/* Stage Badge */}
                    <span
                      className="contact-stage-badge-redesigned"
                      style={{ ...stageStyle, cursor: 'pointer' }}
                      onClick={(e) => handleStageMenuClick(e, contact.id)}
                      title="Click to change stage"
                    >
                      {stage?.label || contact.stage || 'N/A'}
                    </span>
                  </div>

                  {/* Divider */}
                  <div className="contact-card-divider-redesigned" />

                  {/* Contact Details with Temperature */}
                  <div className="contact-details-redesigned">
                    {/* Temperature Icon */}
                    <div 
                      className="contact-temperature-icon-redesigned"
                      style={{
                        ...tempConfig.background,
                        boxShadow: tempConfig.boxShadow,
                        cursor: 'pointer'
                      }}
                      onClick={(e) => handleTemperatureMenuClick(e, contact.id)}
                      title="Click to change temperature"
                    >
                      <span className="temperature-emoji">{tempConfig.icon}</span>
                    </div>

                    {/* Contact Info */}
                    <div className="contact-info-redesigned">
                      {contact.email && (
                        <div className="contact-info-row-redesigned">
                          <Mail size={12} className="contact-info-icon-redesigned" />
                          <span className="contact-info-text-redesigned">{contact.email}</span>
                        </div>
                      )}
                      {contact.phone && (
                        <div className="contact-info-row-redesigned">
                          <Phone size={12} className="contact-info-icon-redesigned" />
                          <span className="contact-info-text-redesigned">{contact.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="contact-list-modern">
              <div className="contact-list-header-modern">
                <div className="contact-list-header-checkbox-modern">
                  <input
                    type="checkbox"
                    className="contact-checkbox-modern"
                    checked={selectedContactIds.size > 0 && selectedContactIds.size === filteredAndSortedContacts.length}
                    onChange={(e) => handleSelectAllContacts(e.target.checked)}
                  />
                </div>
                <div className="contact-list-header-business">Business</div>
                <div className="contact-list-header-contact">Contact</div>
                <div className="contact-list-header-niche">Niche</div>
                <div className="contact-list-header-location">Location</div>
                <div className="contact-list-header-stage">Stage & Status</div>
              </div>
              <div className="contact-list-body-modern">
                {filteredAndSortedContacts.map(contact => {
                  const stage = pipelineStages.find(s => s.id === contact.stage);
                  const stageColor = stage?.color || '#6b7280';
                  const avatarGradient = getAvatarGradient(contact.id);
                  const isSelected = selectedContactIds.has(contact.id);
                  
                  return (
                    <div
                      key={contact.id}
                      className={`contact-list-row-modern ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleContactClick(contact)}
                    >
                      <div className="contact-list-cell-checkbox-modern" onClick={(e) => e.stopPropagation()}>
                        <button
                          className={`contact-checkbox-modern-btn ${isSelected ? 'checked' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectContact(contact.id);
                          }}
                        >
                          {isSelected && (
                            <svg
                              className="checkmark-icon-modern"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </button>
                        <button
                          className={`contact-favorite-btn-modern ${contact.is_favorite ? 'active' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFavorite(contact.id, contact.is_favorite);
                          }}
                          title={contact.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          <Star size={14} fill={contact.is_favorite ? 'currentColor' : 'none'} />
                        </button>
                      </div>
                      
                      <div className="contact-list-cell-business-modern">
                        <div 
                          className="contact-avatar-modern"
                          style={{
                            background: `linear-gradient(135deg, ${avatarGradient.from} 0%, ${avatarGradient.to} 100%)`
                          }}
                        >
                          {getInitials(contact.business_name)}
                        </div>
                        <div className="contact-business-info-modern">
                          <div className="contact-business-name-modern">{contact.business_name || 'Unnamed Business'}</div>
                          {contact.owner_name && (
                            <div className="contact-owner-name-modern">{contact.owner_name}</div>
                          )}
                        </div>
                      </div>
                      
                      <div className="contact-list-cell-contact-modern">
                        {contact.email ? (
                          <div className="contact-info-item-modern">
                            <Mail size={14} className="contact-info-icon-modern" />
                            <span className="contact-info-text-modern">{contact.email}</span>
                          </div>
                        ) : (
                          <span className="contact-empty-state">—</span>
                        )}
                        {contact.phone && (
                          <div className="contact-info-item-modern">
                            <Phone size={14} className="contact-info-icon-modern" />
                            <span className="contact-info-text-modern">{contact.phone}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="contact-list-cell-niche-modern">
                        {contact.niche?.name ? (
                          <span className="contact-niche-badge-modern">{contact.niche.name}</span>
                        ) : (
                          <span className="contact-empty-state">—</span>
                        )}
                      </div>
                      
                      <div className="contact-list-cell-location-modern">
                        {(contact.city || contact.state) ? (
                          <div className="contact-info-item-modern">
                            <MapPin size={14} className="contact-info-icon-modern" />
                            <span className="contact-info-text-modern">
                              {[contact.city, contact.state].filter(Boolean).join(', ') || '—'}
                            </span>
                          </div>
                        ) : (
                          <span className="contact-empty-state">—</span>
                        )}
                      </div>
                      
                      <div className="contact-list-cell-stage-modern">
                        <div className="contact-stage-group-modern">
                          <span
                            className="contact-stage-badge-modern"
                            style={{
                              backgroundColor: `${stageColor}15`,
                              color: stageColor,
                              borderColor: `${stageColor}40`,
                              cursor: 'pointer'
                            }}
                            onClick={(e) => handleStageMenuClick(e, contact.id)}
                            title="Click to change stage"
                          >
                            {stage?.label || contact.stage || 'N/A'}
                          </span>
                          <div
                            className={`contact-temperature-badge-modern contact-temperature-badge-modern--${contact.temperature || 'warm'}`}
                            style={{ cursor: 'pointer' }}
                            onClick={(e) => handleTemperatureMenuClick(e, contact.id)}
                            title="Click to change temperature"
                          >
                            {contact.temperature === 'hot' && '🔥'}
                            {contact.temperature === 'warm' && '☀️'}
                            {contact.temperature === 'cold' && '❄️'}
                            {!contact.temperature && '☀️'}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Temperature Dropdown Menu */}
      {temperatureMenu && (
        <div
          className="temperature-dropdown-overlay"
          onClick={() => setTemperatureMenu(null)}
        >
          <div
            className="temperature-dropdown-menu temperature-dropdown-menu-icons-only"
            style={{
              position: 'fixed',
              left: `${temperatureMenu.x}px`,
              top: `${temperatureMenu.y}px`,
              transform: 'translateX(-50%)',
              zIndex: 10000
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dropdown-menu-options temperature-options-icons-only">
              {TEMPERATURE_OPTIONS.map(option => {
                const isSelected = temperatureMenu.currentTemperature === option.value;
                return (
                  <button
                    key={option.value}
                    className={`dropdown-menu-option temperature-option temperature-option--${option.value} ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleTemperatureChange(temperatureMenu.contactId, option.value)}
                    title={option.label}
                  >
                    <span className="temperature-emoji">
                      {option.value === 'hot' && '🔥'}
                      {option.value === 'warm' && '☀️'}
                      {option.value === 'cold' && '❄️'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Stage Dropdown Menu */}
      {stageMenu && (
        <div
          className="stage-dropdown-overlay"
          onClick={() => setStageMenu(null)}
        >
          <div
            className="stage-dropdown-menu"
            style={{
              position: 'fixed',
              left: `${stageMenu.x}px`,
              top: `${stageMenu.y}px`,
              transform: 'translateX(-50%)',
              zIndex: 10000,
              maxHeight: '400px',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dropdown-menu-title">Change Stage</div>
            <div className="dropdown-menu-options">
              {pipelineStages.map(stage => {
                const isSelected = stageMenu.currentStage === stage.id;
                return (
                  <button
                    key={stage.id}
                    className={`dropdown-menu-option stage-option ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleStageChangeFromMenu(stageMenu.contactId, stage.id)}
                    style={{
                      borderLeftColor: stage.color,
                      backgroundColor: isSelected ? `${stage.color}15` : 'transparent'
                    }}
                  >
                    <span
                      className="stage-indicator"
                      style={{ backgroundColor: stage.color }}
                    />
                    <span className="dropdown-menu-label">{stage.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Contact Detail Modal */}
      {showModal && selectedContact && (
        <ContactModal
          contact={selectedContact}
          niches={niches}
          ads={contactAds}
          notes={contactNotes}
          pipelineStages={pipelineStages}
          onSave={handleSaveContact}
          onClose={() => setShowModal(false)}
          onDelete={handleDeleteContact}
          onStageChange={handleStageChange}
          onAdUpload={handleAdUpload}
          onAdDelete={handleAdDelete}
          onRequestApproval={handleRequestApproval}
          onAddNote={handleAddNote}
          onDeleteNote={handleDeleteNote}
        />
      )}

      {showStageEditor && (
        <StageEditorModal
          stages={pipelineStages}
          onSave={savePipelineStages}
          onClose={() => setShowStageEditor(false)}
          user={user}
          contacts={contacts}
        />
      )}

      {showUploadModal && (
        <UploadContactsModal
          onClose={() => {
            setShowUploadModal(false);
            setUploadFile(null);
            setUploadPreview([]);
            setUploadErrors([]);
          }}
          onFileUpload={handleFileUpload}
          uploadFile={uploadFile}
          uploadPreview={uploadPreview}
          uploadErrors={uploadErrors}
          onImport={handleImportContacts}
          isUploading={isUploading}
        />
      )}
    </div>
  </PageLayout>
  );
}

// Tag Input Component
function TagInput({ tags, onChange }) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = React.useRef(null);

  // Convert tags to array format
  const getTagsArray = () => {
    if (Array.isArray(tags)) {
      return tags.filter(Boolean);
    }
    if (typeof tags === 'string' && tags.trim()) {
      return tags.split(',').map(t => t.trim()).filter(Boolean);
    }
    return [];
  };

  const tagsArray = getTagsArray();

  // Generate consistent color for a tag
  const getTagColor = (tag) => {
    const colors = [
      { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },
      { bg: '#dcfce7', text: '#166534', border: '#86efac' },
      { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
      { bg: '#fce7f3', text: '#9f1239', border: '#f9a8d4' },
      { bg: '#e0e7ff', text: '#3730a3', border: '#a5b4fc' },
      { bg: '#ffedd5', text: '#9a3412', border: '#fdba74' },
      { bg: '#f3e8ff', text: '#6b21a8', border: '#d8b4fe' },
      { bg: '#cffafe', text: '#155e75', border: '#67e8f9' }
    ];
    const colorIndex = tag.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[colorIndex];
  };

  const addTag = (tag) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !tagsArray.includes(trimmedTag)) {
      const newTags = [...tagsArray, trimmedTag];
      onChange(newTags);
    }
    setInputValue('');
  };

  const removeTag = (indexToRemove) => {
    const newTags = tagsArray.filter((_, index) => index !== indexToRemove);
    onChange(newTags);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && tagsArray.length > 0) {
      // Remove last tag if backspace is pressed with empty input
      removeTag(tagsArray.length - 1);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    
    // Check if comma was typed
    if (value.includes(',')) {
      const parts = value.split(',');
      // Add all complete parts (before the last comma)
      parts.slice(0, -1).forEach(part => {
        if (part.trim()) {
          addTag(part);
        }
      });
      // Keep the last part (after the last comma) in the input
      setInputValue(parts[parts.length - 1]);
    } else {
      setInputValue(value);
    }
  };

  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  return (
    <div className="tag-input-container" onClick={handleContainerClick}>
      <div className="tag-input-pills">
        {tagsArray.map((tag, index) => {
          const color = getTagColor(tag);
          return (
            <span
              key={index}
              className="tag-pill"
              style={{
                backgroundColor: color.bg,
                color: color.text,
                border: `1px solid ${color.border}`
              }}
            >
              <span className="tag-pill-text">{tag}</span>
              <button
                type="button"
                className="tag-pill-remove"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(index);
                }}
                style={{ color: color.text }}
              >
                ×
              </button>
            </span>
          );
        })}
        <input
          ref={inputRef}
          type="text"
          className="tag-input-field"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={tagsArray.length === 0 ? "Type and press Enter or comma..." : ""}
        />
      </div>
    </div>
  );
}

// Contact Modal Component
function ContactModal({ 
  contact, 
  niches, 
  ads, 
  notes,
  pipelineStages,
  onSave, 
  onClose, 
  onDelete,
  onStageChange,
  onAdUpload,
  onAdDelete,
  onRequestApproval,
  onAddNote,
  onDeleteNote
}) {
  const [formData, setFormData] = useState({
    ...contact,
    tags: Array.isArray(contact.tags) ? contact.tags.join(', ') : contact.tags || ''
  });
  const [activeTab, setActiveTab] = useState('details');
  const [activeSubTab, setActiveSubTab] = useState('basic');
  const [showAdUploader, setShowAdUploader] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content contact-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{contact.id ? 'Edit Contact' : 'New Contact'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="settings-tabs mb-6">
          <button
            className={`settings-tab ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            Details
          </button>
            {contact.id && (
              <>
                <button
                  className={`settings-tab ${activeTab === 'notes' ? 'active' : ''}`}
                  onClick={() => setActiveTab('notes')}
                >
                  Notes ({notes.length})
                </button>
                <button
                  className={`settings-tab ${activeTab === 'ads' ? 'active' : ''}`}
                  onClick={() => setActiveTab('ads')}
                >
                  Ads ({ads.length}/8)
                </button>
              </>
            )}
        </div>

        <div className="modal-body">
          {activeTab === 'details' && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              {/* Sub-tabs for Details */}
              <div className="details-sub-tabs">
                <button
                  type="button"
                  className={`details-sub-tab ${activeSubTab === 'basic' ? 'active' : ''}`}
                  onClick={() => setActiveSubTab('basic')}
                >
                  Basic Info
                </button>
                <button
                  type="button"
                  className={`details-sub-tab ${activeSubTab === 'location' ? 'active' : ''}`}
                  onClick={() => setActiveSubTab('location')}
                >
                  Location
                </button>
                <button
                  type="button"
                  className={`details-sub-tab ${activeSubTab === 'sales' ? 'active' : ''}`}
                  onClick={() => setActiveSubTab('sales')}
                >
                  Sales Info
                </button>
                <button
                  type="button"
                  className={`details-sub-tab ${activeSubTab === 'tags' ? 'active' : ''}`}
                  onClick={() => setActiveSubTab('tags')}
                >
                  Tags
                </button>
              </div>

              {/* Basic Information Section */}
              {activeSubTab === 'basic' && (
                <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-900 mb-4">Basic Information</h3>
                <div className="flex flex-col gap-4">
                  <div className="form-row">
                    <label className="form-field">
                      <span>Business Name *</span>
                      <input
                        type="text"
                        value={formData.business_name}
                        onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                        required
                      />
                    </label>
                    <label className="form-field">
                      <span>Contact Name</span>
                      <input
                        type="text"
                        value={formData.owner_name || ''}
                        onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                      />
                    </label>
                  </div>

                  <div className="form-row">
                    <label className="form-field">
                      <span>Email</span>
                      <input
                        type="email"
                        value={formData.email || ''}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </label>
                    <label className="form-field">
                      <span>Phone</span>
                      <input
                        type="tel"
                        value={formData.phone || ''}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </label>
                  </div>

                  <label className="form-field">
                    <span>Website</span>
                    <input
                      type="url"
                      value={formData.website || ''}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    />
                  </label>
                </div>
              </div>
              )}

              {/* Location Section */}
              {activeSubTab === 'location' && (
                <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-green-900 mb-4">Location</h3>
                <div className="flex flex-col gap-4">
                  <label className="form-field">
                    <span>Address</span>
                    <input
                      type="text"
                      value={formData.address || ''}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </label>

                  <div className="form-row">
                    <label className="form-field">
                      <span>City</span>
                      <input
                        type="text"
                        value={formData.city || ''}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      />
                    </label>
                    <label className="form-field">
                      <span>State</span>
                      <input
                        type="text"
                        value={formData.state || ''}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      />
                    </label>
                    <label className="form-field">
                      <span>ZIP</span>
                      <input
                        type="text"
                        value={formData.zip || ''}
                        onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                      />
                    </label>
                  </div>
                </div>
              </div>
              )}

              {/* Sales Information Section */}
              {activeSubTab === 'sales' && (
                <div className="bg-purple-50 border-l-4 border-purple-500 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-purple-900 mb-4">Sales Information</h3>
                <div className="flex flex-col gap-4">
                  <div className="form-row">
                    <label className="form-field">
                      <span>Niche</span>
                      <select
                        value={formData.niche_id || ''}
                        onChange={(e) => setFormData({ ...formData, niche_id: e.target.value || null })}
                      >
                        <option value="">Select niche...</option>
                        {niches.map(niche => (
                          <option key={niche.id} value={niche.id}>{niche.name}</option>
                        ))}
                      </select>
                    </label>
                    <label className="form-field">
                      <span>Stage</span>
                      <select
                        value={formData.stage}
                        onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                      >
                        {pipelineStages.map(stage => (
                          <option key={stage.id} value={stage.id}>{stage.label}</option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="form-field">
                    <span>Lead Temperature</span>
                    <div className="temperature-selector">
                      {TEMPERATURE_OPTIONS.map(option => (
                        <button
                          key={option.value}
                          type="button"
                          className={`temperature-option temperature-option--${option.value} ${
                            (formData.temperature || 'cold') === option.value ? 'active' : ''
                          }`}
                          onClick={() => setFormData({ ...formData, temperature: option.value })}
                        >
                          <span className="temperature-icon">
                            {option.value === 'hot' && '🔥'}
                            {option.value === 'warm' && '☀️'}
                            {option.value === 'cold' && '❄️'}
                          </span>
                          <span className="temperature-label">{option.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              )}

              {/* Tags Section */}
              {activeSubTab === 'tags' && (
                <div className="bg-gradient-to-br from-pink-50 to-purple-50 border-l-4 border-pink-500 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-pink-900 mb-4">Tags & Labels</h3>
                  <div className="form-field">
                    <span className="text-pink-900 font-semibold">Organize with Tags</span>
                    <TagInput
                      tags={formData.tags}
                      onChange={(tags) => setFormData({ ...formData, tags })}
                    />
                    <p style={{ fontSize: '12px', color: '#831843', marginTop: '8px', fontWeight: '500' }}>
                      💡 Press Enter or comma to add a tag. Click × to remove.
                    </p>
                  </div>
                </div>
              )}

              <div className="form-actions">
                <button type="submit" className="btn-primary">
                  {contact.id ? 'Save Changes' : 'Create Contact'}
                </button>
                {contact.id && (
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={() => onDelete(contact.id)}
                  >
                    Delete
                  </button>
                )}
              </div>
            </form>
          )}

          {activeTab === 'notes' && (
            <div className="notes-tab">
              <div className="tab-header">
                <h3>Notes</h3>
              </div>

              <div className="notes-add-section">
                <textarea
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="Add a note about this contact..."
                  rows={3}
                  className="note-input"
                />
                <button
                  className="btn-primary btn-sm"
                  onClick={() => {
                    onAddNote(newNoteText);
                    setNewNoteText('');
                  }}
                  disabled={!newNoteText.trim()}
                >
                  <Plus size={16} />
                  Add Note
                </button>
              </div>

              <div className="notes-list">
                {notes.length === 0 ? (
                  <div className="notes-empty">
                    <p>No notes yet. Add your first note above!</p>
                  </div>
                ) : (
                  notes.map(note => (
                    <div key={note.id} className="note-item">
                      <div className="note-header">
                        <span className="note-date">
                          {new Date(note.created_at).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </span>
                        <button
                          className="note-delete-btn"
                          onClick={() => onDeleteNote(note.id)}
                          title="Delete note"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="note-content">{note.note}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'ads' && (
            <div className="ads-tab">
              <div className="tab-header">
                <h3>Client Ads</h3>
                <button
                  className="btn-primary btn-sm"
                  onClick={() => setShowAdUploader(!showAdUploader)}
                  disabled={ads.length >= 8}
                >
                  <Plus size={16} />
                  Upload Ad
                </button>
              </div>

              {showAdUploader && (
                <div className="ad-uploader-section">
                  <ImageUploader
                    onUpload={onAdUpload}
                    label="Upload Client Ad"
                    maxSizeMB={10}
                  />
                </div>
              )}

              <div className="ads-grid">
                {ads.map(ad => (
                  <div key={ad.id} className="ad-card">
                    {ad.image_url ? (
                      <img 
                        src={ad.image_url} 
                        alt={ad.name}
                        onError={(e) => {
                          console.error('Failed to load image:', ad.image_url);
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className="ad-image-placeholder" style={{ display: ad.image_url ? 'none' : 'flex' }}>
                      <Upload size={32} />
                      <span>Image not available</span>
                      </div>
                      <button
                      className="ad-delete-btn"
                      onClick={() => onAdDelete(ad.id)}
                      title="Delete ad"
                      >
                      <Trash2 size={14} />
                      </button>
                    <div className="ad-info">
                      <div className="ad-name">{ad.name}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// Upload Contacts Modal Component
function UploadContactsModal({ 
  onClose, 
  onFileUpload, 
  uploadFile, 
  uploadPreview, 
  uploadErrors,
  onImport,
  isUploading 
}) {
  const csvColumns = [
    { name: 'business_name', required: true, description: 'Business or company name', category: 'basic' },
    { name: 'owner_name', required: false, description: 'Contact person\'s name', category: 'basic' },
    { name: 'email', required: false, description: 'Email address', category: 'contact' },
    { name: 'phone', required: false, description: 'Phone number', category: 'contact' },
    { name: 'website', required: false, description: 'Website URL', category: 'contact' },
    { name: 'address', required: false, description: 'Street address', category: 'location' },
    { name: 'city', required: false, description: 'City', category: 'location' },
    { name: 'state', required: false, description: 'State abbreviation (e.g., AZ, CA)', category: 'location' },
    { name: 'zip', required: false, description: 'ZIP code', category: 'location' },
    { name: 'niche', required: false, description: 'Industry/niche name (must match existing niche)', category: 'sales' },
    { name: 'stage', required: false, description: 'Pipeline stage: lead, contacted, qualified, proposal_sent, negotiating, won, active, past, lost', category: 'sales' },
    { name: 'temperature', required: false, description: 'Lead temperature: hot, warm, or cold (defaults to cold)', category: 'sales' },
    { name: 'tags', required: false, description: 'Comma-separated tags (e.g., "VIP,Priority,Follow Up")', category: 'sales' },
    { name: 'notes', required: false, description: 'Additional notes or comments', category: 'sales' }
  ];

  const getCategoryLabel = (category) => {
    const labels = {
      basic: 'Basic Information',
      contact: 'Contact Details',
      location: 'Location',
      sales: 'Sales & Pipeline'
    };
    return labels[category] || category;
  };

  const groupedColumns = csvColumns.reduce((acc, col) => {
    if (!acc[col.category]) acc[col.category] = [];
    acc[col.category].push(col);
    return acc;
  }, {});

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content upload-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Import Contacts from CSV</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Quick Start Section */}
          <div className="upload-quick-start">
            <div className="quick-start-header">
              <FileUp size={20} />
              <h3>Quick Start</h3>
            </div>
            <div className="quick-start-steps">
              <div className="step-item">
                <span className="step-number">1</span>
                <span className="step-text">Download the CSV template below</span>
              </div>
              <div className="step-item">
                <span className="step-number">2</span>
                <span className="step-text">Fill in your contact information</span>
              </div>
              <div className="step-item">
                <span className="step-number">3</span>
                <span className="step-text">Upload your completed CSV file</span>
              </div>
            </div>
            <a 
              href="/templates/contacts-import-template.csv" 
              download="contacts-import-template.csv"
              className="download-template-btn"
            >
              <Download size={18} />
              <span>Download CSV Template</span>
            </a>
          </div>

          {/* File Upload Section */}
          <div className="upload-section">
            <label htmlFor="csv-upload" className="upload-dropzone">
              <FileUp size={48} />
              <p className="upload-text">
                {uploadFile ? (
                  <>
                    <CheckCircle size={20} style={{ marginRight: '8px', color: '#22c55e' }} />
                    {uploadFile.name}
                  </>
                ) : (
                  'Click to upload CSV file'
                )}
              </p>
              <p className="upload-subtext">
                {uploadFile ? 'File ready to import' : 'or drag and drop your file here'}
              </p>
              <input
                id="csv-upload"
                type="file"
                accept=".csv"
                onChange={onFileUpload}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          {/* CSV Format Guide */}
          <div className="upload-instructions">
            <div className="instruction-header">
              <AlertCircle size={20} />
              <h3>CSV Format Guide</h3>
            </div>
            
            <p className="instruction-intro">
              Your CSV file should include these columns. Column order doesn't matter, but column names must match exactly.
            </p>

            {Object.entries(groupedColumns).map(([category, columns]) => (
              <div key={category} className="column-category">
                <h4 className="category-label">{getCategoryLabel(category)}</h4>
                <div className="columns-list">
                  {columns.map((col) => (
                    <div key={col.name} className={`column-item ${col.required ? 'required' : ''}`}>
                      <div className="column-header">
                        <code className="column-name">{col.name}</code>
                        {col.required && <span className="badge-required">REQUIRED</span>}
                      </div>
                      <p className="column-description">{col.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="format-tips">
              <h4 className="tips-header">💡 Tips</h4>
              <ul className="tips-list">
                <li><strong>Niche:</strong> Must match an existing niche name in your account (case-insensitive)</li>
                <li><strong>Stage:</strong> Use one of the predefined stages or it will default to "lead"</li>
                <li><strong>Temperature:</strong> Use "hot", "warm", or "cold" (defaults to "cold" if empty)</li>
                <li><strong>Tags:</strong> Separate multiple tags with commas (e.g., "VIP,Priority,Follow Up")</li>
                <li><strong>Quotes:</strong> Use quotes around values containing commas (e.g., "Smith, John")</li>
              </ul>
            </div>
          </div>

          {/* Preview Section */}
          {uploadPreview.length > 0 && (
            <div className="upload-preview">
              <div className="preview-header">
                <CheckCircle size={20} />
                <h3>Preview ({uploadPreview.length} row{uploadPreview.length !== 1 ? 's' : ''} found)</h3>
              </div>
              <div className="preview-table">
                <table>
                  <thead>
                    <tr>
                      <th>Business Name</th>
                      <th>Owner</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>City, State</th>
                      <th>Niche</th>
                      <th>Stage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uploadPreview.map((contact, idx) => (
                      <tr key={idx}>
                        <td><strong>{contact.business_name || '—'}</strong></td>
                        <td>{contact.owner_name || '—'}</td>
                        <td>{contact.email || '—'}</td>
                        <td>{contact.phone || '—'}</td>
                        <td>{[contact.city, contact.state].filter(Boolean).join(', ') || '—'}</td>
                        <td>{contact.niche || '—'}</td>
                        <td>{contact.stage || 'lead'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Errors Section */}
          {uploadErrors.length > 0 && (
            <div className="upload-errors">
              <div className="errors-header">
                <AlertCircle size={20} />
                <h4>Errors Found ({uploadErrors.length})</h4>
              </div>
              <ul className="errors-list">
                {uploadErrors.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose} disabled={isUploading}>
            Cancel
          </button>
          <button 
            className="btn-primary" 
            onClick={onImport}
            disabled={!uploadFile || isUploading}
          >
            {isUploading ? (
              <>
                <div className="spinner-small" style={{ marginRight: '8px' }}></div>
                Importing...
              </>
            ) : (
              <>
                <CheckCircle size={18} style={{ marginRight: '8px' }} />
                Import Contacts
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Stage Editor Modal Component
function StageEditorModal({ stages, onSave, onClose, user, contacts }) {
  const [editableStages, setEditableStages] = useState([...stages]);
  const [draggedIndex, setDraggedIndex] = useState(null);

  const handleAddStage = () => {
    const newStage = {
      id: `stage_${Date.now()}`,
      label: 'New Stage',
      color: STAGE_COLORS[editableStages.length % STAGE_COLORS.length]
    };
    setEditableStages([...editableStages, newStage]);
  };

  const handleUpdateStage = (index, field, value) => {
    const updated = [...editableStages];
    updated[index] = { ...updated[index], [field]: value };
    setEditableStages(updated);
  };

  const handleDeleteStage = async (index) => {
    if (editableStages.length <= 1) {
      alert('You must have at least one stage');
      return;
    }

    const stageToDelete = editableStages[index];
    
    // Check if any contacts are assigned to this stage
    const contactsInStage = contacts.filter(c => c.stage === stageToDelete.id);
    
    if (contactsInStage.length > 0) {
      alert(`Cannot delete this stage!\n\n${contactsInStage.length} contact${contactsInStage.length > 1 ? 's are' : ' is'} assigned to "${stageToDelete.label}".\n\nPlease reassign ${contactsInStage.length > 1 ? 'these contacts' : 'this contact'} to another stage before deleting.`);
      return;
    }

    if (confirm(`Are you sure you want to delete the "${stageToDelete.label}" stage?`)) {
      // Delete from database
      const { error } = await pipelineStagesAPI.delete(user.id, stageToDelete.id);
      
      if (error) {
        console.error('Failed to delete stage:', error);
        alert('Failed to delete stage. Please try again.');
        return;
      }

      // Remove from local state
      setEditableStages(editableStages.filter((_, i) => i !== index));
    }
  };

  const handleDragStart = (index) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newStages = [...editableStages];
    const draggedItem = newStages[draggedIndex];
    newStages.splice(draggedIndex, 1);
    newStages.splice(index, 0, draggedItem);
    
    setEditableStages(newStages);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleSave = () => {
    // Validate that all stages have labels
    if (editableStages.some(s => !s.label.trim())) {
      alert('All stages must have a label');
      return;
    }
    onSave(editableStages);
    onClose();
  };

  const handleReset = () => {
    if (confirm('Reset to default stages? This will remove all custom stages.')) {
      setEditableStages([...DEFAULT_PIPELINE_STAGES]);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content stage-editor-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Pipeline Stages</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <p className="stage-editor-instructions">
            Drag and drop to reorder stages. Click on stage name or color to edit.
          </p>

          <div className="stage-list">
            {editableStages.map((stage, index) => (
              <div
                key={stage.id}
                className={`stage-item ${draggedIndex === index ? 'dragging' : ''}`}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
              >
                <div className="stage-item-drag">
                  <GripVertical size={20} />
                </div>
                <input
                  type="color"
                  value={stage.color}
                  onChange={(e) => handleUpdateStage(index, 'color', e.target.value)}
                  className="stage-color-input"
                  title="Stage color"
                />
                <input
                  type="text"
                  value={stage.label}
                  onChange={(e) => handleUpdateStage(index, 'label', e.target.value)}
                  className="stage-label-input"
                  placeholder="Stage name"
                />
                <button
                  className="stage-delete-btn"
                  onClick={() => handleDeleteStage(index)}
                  title="Delete stage"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <button className="btn-secondary" onClick={handleAddStage}>
            <Plus size={16} />
            Add Stage
          </button>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={handleReset}>
            Reset to Default
          </button>
          <div style={{ flex: 1 }}></div>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSave}>
            <Save size={16} />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// Contacts Spreadsheet View Component
function ContactsSpreadsheetView({
  contacts,
  niches,
  pipelineStages,
  selectedContactIds,
  onSelectContact,
  onSelectAllContacts,
  onContactClick,
  onUpdateContact
}) {
  // Default columns configuration
  const defaultColumns = [
    { key: 'business_name', label: 'Business Name', width: 200, visible: true },
    { key: 'owner_name', label: 'Owner', width: 150, visible: true },
    { key: 'email', label: 'Email', width: 200, visible: true },
    { key: 'phone', label: 'Phone', width: 130, visible: true },
    { key: 'website', label: 'Website', width: 180, visible: false },
    { key: 'city', label: 'City', width: 120, visible: true },
    { key: 'state', label: 'State', width: 80, visible: true },
    { key: 'zip', label: 'ZIP', width: 80, visible: false },
    { key: 'niche_id', label: 'Niche', width: 150, visible: true },
    { key: 'stage', label: 'Stage', width: 140, visible: true },
    { key: 'temperature', label: 'Temperature', width: 120, visible: true },
    { key: 'tags', label: 'Tags', width: 200, visible: false }
  ];

  // Load column preferences from localStorage
  const loadColumnPreferences = () => {
    try {
      const saved = localStorage.getItem('contacts-table-columns');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge saved preferences with defaults
        return defaultColumns.map(col => {
          const savedCol = parsed.find(c => c.key === col.key);
          return savedCol ? { ...col, ...savedCol } : col;
        });
      }
    } catch (e) {
      console.error('Failed to load column preferences:', e);
    }
    return defaultColumns;
  };

  const [columns, setColumns] = useState(loadColumnPreferences());
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [resizingColumn, setResizingColumn] = useState(null);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [temperatureDialog, setTemperatureDialog] = useState(null); // { contactId, x, y }
  const [stageDialog, setStageDialog] = useState(null); // { contactId, x, y }
  const columnsRef = useRef(columns);

  // Save column preferences to localStorage
  const saveColumnPreferences = (newColumns) => {
    try {
      localStorage.setItem('contacts-table-columns', JSON.stringify(newColumns));
      setColumns(newColumns);
    } catch (e) {
      console.error('Failed to save column preferences:', e);
    }
  };

  // Toggle column visibility
  const toggleColumnVisibility = (columnKey) => {
    const newColumns = columns.map(col =>
      col.key === columnKey ? { ...col, visible: !col.visible } : col
    );
    saveColumnPreferences(newColumns);
  };

  // Handle column resize start
  const handleResizeStart = (e, columnKey) => {
    e.preventDefault();
    e.stopPropagation();
    const column = columns.find(col => col.key === columnKey);
    if (column) {
      setResizingColumn(columnKey);
      setResizeStartX(e.clientX);
      setResizeStartWidth(column.width);
    }
  };

  // Update ref when columns change
  useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);

  // Handle column resize
  useEffect(() => {
    if (!resizingColumn) return;

    const handleMouseMove = (e) => {
      const diff = e.clientX - resizeStartX;
      const newWidth = Math.max(80, resizeStartWidth + diff);
      setColumns(prevColumns => {
        const newColumns = prevColumns.map(col =>
          col.key === resizingColumn ? { ...col, width: newWidth } : col
        );
        columnsRef.current = newColumns;
        return newColumns;
      });
    };

    const handleMouseUp = () => {
      // Save the latest columns state from ref
      saveColumnPreferences(columnsRef.current);
      setResizingColumn(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingColumn, resizeStartX, resizeStartWidth]);

  // Close dialogs when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showColumnMenu && !e.target.closest('.spreadsheet-toolbar')) {
        setShowColumnMenu(false);
      }
      if (temperatureDialog && !e.target.closest('.temperature-dialog')) {
        setTemperatureDialog(null);
      }
      if (stageDialog && !e.target.closest('.stage-dropdown-menu')) {
        setStageDialog(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showColumnMenu, temperatureDialog, stageDialog]);

  // Handle temperature icon click
  const handleTemperatureClick = (e, contactId) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const contact = contacts.find(c => c.id === contactId);
    setTemperatureDialog({
      contactId,
      currentTemperature: contact?.temperature || 'cold',
      x: rect.left,
      y: rect.bottom + 5
    });
  };

  // Handle temperature change
  const handleTemperatureChange = async (contactId, temperature) => {
    await onUpdateContact(contactId, 'temperature', temperature);
    setTemperatureDialog(null);
  };

  // Handle stage click
  const handleStageClick = (e, contactId) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const contact = contacts.find(c => c.id === contactId);
    setStageDialog({
      contactId,
      currentStage: contact?.stage || null,
      x: rect.left,
      y: rect.bottom + 5
    });
    setTemperatureDialog(null); // Close temperature dialog if open
  };

  // Handle stage change
  const handleStageChange = async (contactId, stageId) => {
    await onUpdateContact(contactId, 'stage', stageId);
    setStageDialog(null);
  };

  const handleCellClick = (contactId, field, value) => {
    // Don't edit temperature or stage cell, open dialog instead
    if (field === 'temperature' || field === 'stage') {
      return;
    }
    setEditingCell({ contactId, field });
    setEditValue(value || '');
  };

  const handleCellBlur = async (contact) => {
    if (!editingCell) return;
    
    const { contactId, field } = editingCell;
    const updatedValue = editValue.trim();
    const currentValue = getCellValue(contact, field);
    
    setEditingCell(null);
    setEditValue('');

    // Only update if value changed
    if (currentValue !== updatedValue) {
      await onUpdateContact(contactId, field, updatedValue);
    }
  };

  const handleKeyDown = (e, contact) => {
    if (e.key === 'Enter') {
      handleCellBlur(contact);
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setEditValue('');
    }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedContacts = [...contacts].sort((a, b) => {
    if (!sortConfig.key) return 0;
    
    const aVal = a[sortConfig.key];
    const bVal = b[sortConfig.key];
    
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    
    if (typeof aVal === 'string') {
      return sortConfig.direction === 'asc' 
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }
    
    return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
  });

  const allSelected = contacts.length > 0 && selectedContactIds.size === contacts.length;
  const someSelected = selectedContactIds.size > 0 && selectedContactIds.size < contacts.length;

  // Filter visible columns
  const visibleColumns = columns.filter(col => col.visible);

  const getCellValue = (contact, field) => {
    if (field === 'niche_id') {
      return contact.niche?.name || '';
    }
    if (field === 'stage') {
      const stage = pipelineStages.find(s => s.id === contact.stage);
      return stage?.label || contact.stage || '';
    }
    if (field === 'tags') {
      if (Array.isArray(contact.tags)) {
        return contact.tags.join(', ');
      }
      if (typeof contact.tags === 'string') {
        return contact.tags;
      }
      return '';
    }
    return contact[field] || '';
  };

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) {
      return <span className="spreadsheet-sort-icon">↕</span>;
    }
    return <span className="spreadsheet-sort-icon">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="contacts-spreadsheet-container">
      {/* Column Settings Button */}
      <div className="spreadsheet-toolbar">
        <div className="spreadsheet-toolbar-left">
          <button
            className="spreadsheet-column-toggle-btn"
            onClick={() => setShowColumnMenu(!showColumnMenu)}
            title="Column settings"
          >
            <Columns size={16} />
            Columns
          </button>
          {showColumnMenu && (
            <div className="spreadsheet-column-menu">
              <div className="spreadsheet-column-menu-header">Show/Hide Columns</div>
              <div className="spreadsheet-column-menu-list">
                {columns.map(column => (
                  <label key={column.key} className="spreadsheet-column-menu-item">
                    <input
                      type="checkbox"
                      checked={column.visible}
                      onChange={() => toggleColumnVisibility(column.key)}
                    />
                    <span>{column.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="contacts-spreadsheet-wrapper" onClick={() => setShowColumnMenu(false)}>
        <table className="contacts-spreadsheet-table">
          <thead>
            <tr>
              <th className="spreadsheet-row-header">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = someSelected;
                  }}
                  onChange={(e) => onSelectAllContacts(e.target.checked)}
                />
              </th>
              <th className="spreadsheet-row-number">#</th>
              {visibleColumns.map((column, index) => (
                <th
                  key={column.key}
                  className="spreadsheet-header-cell sortable"
                  style={{ width: column.width, position: 'relative' }}
                  onClick={(e) => {
                    // Don't sort if clicking on the resizer
                    if (e.target.classList.contains('spreadsheet-column-resizer')) {
                      return;
                    }
                    handleSort(column.key);
                  }}
                >
                  {column.label}
                  <SortIcon columnKey={column.key} />
                  {index < visibleColumns.length - 1 && (
                    <div
                      className="spreadsheet-column-resizer"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleResizeStart(e, column.key);
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      style={{ cursor: 'col-resize' }}
                    />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedContacts.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + 2} className="spreadsheet-empty-state">
                  No contacts found
                </td>
              </tr>
            ) : (
              sortedContacts.map((contact, index) => (
                <tr
                  key={contact.id}
                  className={`spreadsheet-row ${selectedContactIds.has(contact.id) ? 'selected' : ''}`}
                  onClick={() => onContactClick(contact)}
                >
                  <td className="spreadsheet-checkbox-cell" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedContactIds.has(contact.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        onSelectContact(contact.id);
                      }}
                    />
                  </td>
                  <td className="spreadsheet-row-number">{index + 1}</td>
                  {visibleColumns.map(column => {
                    const isEditing = editingCell?.contactId === contact.id && editingCell?.field === column.key;
                    const cellValue = getCellValue(contact, column.key);
                    
                    return (
                      <td
                        key={column.key}
                        className="spreadsheet-cell"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCellClick(contact.id, column.key, cellValue);
                        }}
                      >
                        {isEditing ? (
                          <input
                            type="text"
                            className="spreadsheet-cell-input"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleCellBlur(contact)}
                            onKeyDown={(e) => handleKeyDown(e, contact)}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span className="spreadsheet-cell-content">
                            {column.key === 'temperature' ? (
                              <span
                                className="spreadsheet-temperature clickable"
                                onClick={(e) => handleTemperatureClick(e, contact.id)}
                                title="Click to change temperature"
                              >
                                {contact.temperature === 'hot' && '🔥'}
                                {contact.temperature === 'warm' && '☀️'}
                                {contact.temperature === 'cold' && '❄️'}
                                {!contact.temperature && '❄️'}
                              </span>
                            ) : column.key === 'stage' ? (
                              <span
                                className="spreadsheet-stage-badge"
                                style={{
                                  backgroundColor: `${pipelineStages.find(s => s.id === contact.stage)?.color || '#6b7280'}15`,
                                  color: pipelineStages.find(s => s.id === contact.stage)?.color || '#6b7280',
                                  borderColor: `${pipelineStages.find(s => s.id === contact.stage)?.color || '#6b7280'}40`,
                                  cursor: 'pointer'
                                }}
                                onClick={(e) => handleStageClick(e, contact.id)}
                                title="Click to change stage"
                              >
                                {cellValue}
                              </span>
                            ) : (
                              cellValue || <span className="spreadsheet-empty">—</span>
                            )}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Temperature Dialog */}
      {temperatureDialog && (
        <div
          className="temperature-dialog-overlay"
          onClick={() => setTemperatureDialog(null)}
        >
          <div
            className="temperature-dialog"
            style={{
              position: 'fixed',
              left: `${temperatureDialog.x}px`,
              top: `${temperatureDialog.y}px`,
              transform: 'translateX(-50%)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="temperature-dialog-options">
              {TEMPERATURE_OPTIONS.map(option => {
                const isSelected = temperatureDialog.currentTemperature === option.value;
                return (
                  <button
                    key={option.value}
                    className={`temperature-dialog-option temperature-option--${option.value} ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleTemperatureChange(temperatureDialog.contactId, option.value)}
                    title={option.label}
                  >
                    <span className="temperature-emoji">
                      {option.value === 'hot' && '🔥'}
                      {option.value === 'warm' && '☀️'}
                      {option.value === 'cold' && '❄️'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Stage Dialog */}
      {stageDialog && (
        <div
          className="stage-dropdown-overlay"
          onClick={() => setStageDialog(null)}
        >
          <div
            className="stage-dropdown-menu"
            style={{
              position: 'fixed',
              left: `${stageDialog.x}px`,
              top: `${stageDialog.y}px`,
              transform: 'translateX(-50%)',
              zIndex: 10000,
              maxHeight: '400px',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dropdown-menu-title">Change Stage</div>
            <div className="dropdown-menu-options">
              {pipelineStages.map(stage => {
                const isSelected = stageDialog.currentStage === stage.id;
                return (
                  <button
                    key={stage.id}
                    className={`dropdown-menu-option stage-option ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleStageChange(stageDialog.contactId, stage.id)}
                    style={{
                      borderLeftColor: stage.color,
                      backgroundColor: isSelected ? `${stage.color}15` : 'transparent'
                    }}
                  >
                    <span
                      className="stage-indicator"
                      style={{ backgroundColor: stage.color }}
                    />
                    <span className="dropdown-menu-label">{stage.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Contacts;

