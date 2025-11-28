import React, { useState, useEffect } from 'react';
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
  Tag
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
  if (!value) return 'Warm';
  return value.charAt(0).toUpperCase() + value.slice(1);
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

    if (!contactsRes.error) setContacts(contactsRes.data || []);
    if (!nichesRes.error) setNiches(nichesRes.data || []);
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
      temperature: 'warm',
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
          continue;
        }

        // Map niche name to niche_id
        if (contactData.niche && !contactData.niche_id) {
          const niche = niches.find(n => 
            n.name.toLowerCase() === contactData.niche.toLowerCase()
          );
          if (niche) {
            contactData.niche_id = niche.id;
          }
          delete contactData.niche;
        }

        // Set defaults
        if (!contactData.stage) contactData.stage = 'lead';
        if (!contactData.temperature) contactData.temperature = 'warm';

        // Convert tags from comma-separated string to array
        if (contactData.tags && typeof contactData.tags === 'string') {
          contactData.tags = contactData.tags.split(',').map(t => t.trim()).filter(Boolean);
        }

        const payload = sanitizeContactPayload(contactData);
        const { error } = await contactsAPI.create({ ...payload, user_id: user.id });
        
        if (error) {
          errorCount++;
        } else {
          successCount++;
        }
      }

      setIsUploading(false);
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadPreview([]);
      setUploadErrors([]);
      
      alert(`Import complete!\nSuccessfully imported: ${successCount}\nFailed: ${errorCount}`);
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
        {/* Filters - Redesigned */}
        <div className="contacts-filters-modern">
          {/* Top Row: Search + View Toggle */}
          <div className="filters-top-row">
            <div className="search-box-modern">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="Search by name, email, city, or state..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="view-toggle-modern">
              <button
                type="button"
                className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Grid view"
              >
                <LayoutGrid size={18} />
                <span>Grid</span>
              </button>
              <button
                type="button"
                className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                title="List view"
              >
                <List size={18} />
                <span>List</span>
              </button>
              <button
                type="button"
                className={`view-btn ${viewMode === 'pipeline' ? 'active' : ''}`}
                onClick={() => setViewMode('pipeline')}
                title="Pipeline view"
              >
                <Columns size={18} />
                <span>Pipeline</span>
              </button>
            </div>
          </div>

          {/* Middle Row: Filters */}
          <div className="filters-middle-row">
            <div className="filter-chip-group">
              <div className={`filter-chip ${nicheFilter !== 'all' ? 'has-filter' : ''}`}>
                <label>Niche {nicheFilter !== 'all' && <span className="filter-indicator">●</span>}</label>
                <select
                  value={nicheFilter}
                  onChange={(e) => setNicheFilter(e.target.value)}
                >
                  <option value="all">All Niches</option>
                  {niches.map(niche => (
                    <option key={niche.id} value={niche.id}>{niche.name}</option>
                  ))}
                </select>
              </div>

              <div className={`filter-chip ${tagFilter !== 'all' ? 'has-filter' : ''}`}>
                <label>Tags {tagFilter !== 'all' && <span className="filter-indicator">●</span>}</label>
                <select
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value)}
                >
                  <option value="all">All Tags</option>
                  {allTags.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>

              <div className={`temp-filter-group ${temperatureFilter !== 'all' ? 'has-filter' : ''}`}>
                <label>Temperature {temperatureFilter !== 'all' && <span className="filter-indicator">●</span>}</label>
                <div className="temp-buttons">
                  <button
                    className={`temp-btn ${temperatureFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setTemperatureFilter('all')}
                  >
                    All
                  </button>
                  <button
                    className={`temp-btn hot ${temperatureFilter === 'hot' ? 'active' : ''}`}
                    onClick={() => setTemperatureFilter('hot')}
                  >
                    🔥 Hot
                  </button>
                  <button
                    className={`temp-btn warm ${temperatureFilter === 'warm' ? 'active' : ''}`}
                    onClick={() => setTemperatureFilter('warm')}
                  >
                    ☀️ Warm
                  </button>
                  <button
                    className={`temp-btn cold ${temperatureFilter === 'cold' ? 'active' : ''}`}
                    onClick={() => setTemperatureFilter('cold')}
                  >
                    ❄️ Cold
                  </button>
                </div>
              </div>

              <div className={`filter-chip ${sortBy !== 'name' ? 'has-filter' : ''}`}>
                <label>Sort By {sortBy !== 'name' && <span className="filter-indicator">●</span>}</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="name">Name (A-Z)</option>
                  <option value="name-desc">Name (Z-A)</option>
                  <option value="stage">Stage</option>
                  <option value="temperature">Temperature</option>
                  <option value="recent">Most Recent</option>
                </select>
              </div>
            </div>

            {hasActiveFilters && (
              <button
                className="clear-all-btn"
                onClick={handleClearFilters}
                title="Clear all filters"
              >
                <X size={16} />
                <span>Clear</span>
              </button>
            )}
          </div>

          {/* Bottom Row: Stage Pills + Results Count */}
          <div className="filters-bottom-row">
            <div className="stage-pills-wrapper">
              {selectedStages.size > 0 && selectedStages.size < pipelineStages.length && (
                <span className="stage-filter-indicator">
                  {selectedStages.size} of {pipelineStages.length} stages selected
                </span>
              )}
              <div className="stage-pills">
              <button
                className={`stage-pill all-pill ${selectedStages.size === 0 ? 'active' : ''}`}
                onClick={handleToggleAllStages}
                title={selectedStages.size === 0 ? 'All stages shown (click to select all)' : `${selectedStages.size} of ${pipelineStages.length} stages selected`}
              >
                <span className="stage-pill-label">All</span>
                <span className="stage-pill-count">{contacts.length}</span>
              </button>
              {pipelineStages.map(stage => {
                const count = contacts.filter(c => c.stage === stage.id).length;
                const isSelected = selectedStages.has(stage.id);
                return (
                  <button
                    key={stage.id}
                    className={`stage-pill ${isSelected ? 'active' : ''}`}
                    onClick={() => handleToggleStage(stage.id)}
                    style={{ 
                      '--stage-color': stage.color,
                      '--stage-color-light': `${stage.color}15`,
                      '--stage-color-lighter': `${stage.color}08`,
                      borderColor: stage.color
                    }}
                  >
                    <span className="stage-pill-label">{stage.label}</span>
                    <span className="stage-pill-count">{count}</span>
                  </button>
                );
              })}
              </div>
            </div>

            <div className="results-summary">
              <span className="results-text">
                {filteredAndSortedContacts.length} of {contacts.length} contacts
                {selectedContactIds.size > 0 && (
                  <span className="selected-badge">{selectedContactIds.size} selected</span>
                )}
              </span>
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
      {viewMode === 'pipeline' ? (
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

              return (
                <div
                  key={contact.id}
                  className="contact-card-sleek"
                  onClick={() => handleContactClick(contact)}
                >
                  {/* Top Actions Bar */}
                  <div className="contact-card-actions-bar" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="contact-checkbox-sleek"
                      checked={selectedContactIds.has(contact.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleSelectContact(contact.id);
                      }}
                    />
                    <button
                      className={`contact-favorite-btn-sleek ${contact.is_favorite ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFavorite(contact.id, contact.is_favorite);
                      }}
                      title={contact.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Star size={16} fill={contact.is_favorite ? 'currentColor' : 'none'} />
                    </button>
                  </div>

                  {/* Header Section with Avatar and Name */}
                  <div className="contact-card-header-sleek">
                    <div className="contact-avatar-sleek" style={{
                      background: stage?.color 
                        ? `linear-gradient(135deg, ${stage.color} 0%, ${stage.color}dd 100%)`
                        : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)'
                    }}>
                      {contact.business_name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div className="contact-name-section">
                      <h3 className="contact-business-name">{contact.business_name || 'Unnamed Business'}</h3>
                      {contact.owner_name && (
                        <p className="contact-owner-name">{contact.owner_name}</p>
                      )}
                    </div>
                  </div>

                  {/* Status Badges Row */}
                  <div className="contact-status-badges">
                    {contact.niche?.name && (
                      <div className="status-badge niche-badge">
                        <Tag size={12} />
                        <span>{contact.niche.name}</span>
                      </div>
                    )}
                    <div 
                      className="status-badge stage-badge"
                      style={{
                        backgroundColor: stage?.color ? `${stage.color}15` : '#f3f4f6',
                        color: stage?.color || '#6b7280',
                        borderColor: stage?.color ? `${stage.color}40` : '#e5e7eb'
                      }}
                    >
                      {stage?.label || contact.stage || 'N/A'}
                    </div>
                    <div className={`status-badge temperature-badge temperature-${temperature}`}>
                      {temperature === 'hot' && '🔥'}
                      {temperature === 'warm' && '☀️'}
                      {temperature === 'cold' && '❄️'}
                      <span>{formatTemperatureLabel(temperature)}</span>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="contact-info-section">
                    {contact.email && (
                      <div className="contact-info-item">
                        <Mail size={14} className="info-icon" />
                        <span className="info-text">{contact.email}</span>
                      </div>
                    )}
                    {contact.phone && (
                      <div className="contact-info-item">
                        <Phone size={14} className="info-icon" />
                        <span className="info-text">{contact.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Tags Section */}
                  {tagsArray.length > 0 && (
                    <div className="contact-tags-section">
                      {tagsArray.slice(0, 3).map((tag, idx) => (
                        <span key={idx} className="contact-tag-sleek">{tag}</span>
                      ))}
                      {tagsArray.length > 3 && (
                        <span className="contact-tag-more">+{tagsArray.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="contact-list">
              <div className="contact-list-header">
                <div className="contact-list-header-cell contact-list-header-checkbox">
                  <input
                    type="checkbox"
                    className="contact-checkbox"
                    checked={selectedContactIds.size > 0 && selectedContactIds.size === filteredAndSortedContacts.length}
                    onChange={(e) => handleSelectAllContacts(e.target.checked)}
                  />
                </div>
                <span>Business</span>
                <span>Contact</span>
                <span>Niche</span>
                <span>Location</span>
                <span>Stage</span>
              </div>
              {filteredAndSortedContacts.map(contact => (
                <div
                  key={contact.id}
                  className="contact-list-row"
                >
                  <div className="contact-list-cell contact-list-cell-checkbox">
                    <input
                      type="checkbox"
                      className="contact-checkbox"
                      checked={selectedContactIds.has(contact.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleSelectContact(contact.id);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <button
                      className={`contact-favorite-btn contact-favorite-btn--list ${contact.is_favorite ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFavorite(contact.id, contact.is_favorite);
                      }}
                      title={contact.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Star size={14} fill={contact.is_favorite ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                  <div className="contact-list-cell" onClick={() => handleContactClick(contact)}>
                    <div className="contact-name">{contact.business_name}</div>
                    <div className="contact-owner">{contact.owner_name}</div>
                  </div>
                  <div className="contact-list-cell" onClick={() => handleContactClick(contact)}>
                    {contact.email && (
                      <div className="contact-detail list-detail">
                        <Mail size={14} />
                        <span>{contact.email}</span>
                      </div>
                    )}
                    {contact.phone && (
                      <div className="contact-detail list-detail">
                        <Phone size={14} />
                        <span>{contact.phone}</span>
                      </div>
                    )}
                  </div>
                  <div className="contact-list-cell" onClick={() => handleContactClick(contact)}>
                    {contact.niche?.name ? (
                      <div className="contact-niche contact-niche--list">{contact.niche.name}</div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </div>
                  <div className="contact-list-cell" onClick={() => handleContactClick(contact)}>
                    <div className="contact-detail list-detail">
                      <MapPin size={14} />
                      <span>{contact.city || '—'}, {contact.state || '—'}</span>
                    </div>
                    {contact.address && (
                      <div className="contact-detail list-detail secondary">
                        <span>{contact.address}</span>
                      </div>
                    )}
                  </div>
                  <div className="contact-list-cell contact-list-stage" onClick={() => handleContactClick(contact)}>
                  <div
                    className="contact-stage contact-stage--list"
                    style={{
                      background: pipelineStages.find(s => s.id === contact.stage)?.color + '20',
                      color: pipelineStages.find(s => s.id === contact.stage)?.color
                    }}
                  >
                    {pipelineStages.find(s => s.id === contact.stage)?.label}
                  </div>
                  <div
                    className={`contact-temperature contact-temperature--${contact.temperature || 'warm'} contact-temperature--list`}
                  >
                    {formatTemperatureLabel(contact.temperature)}
                  </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
                            (formData.temperature || 'warm') === option.value ? 'active' : ''
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
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content upload-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Upload Contacts</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="upload-instructions">
            <div className="instruction-header">
              <AlertCircle size={20} />
              <h3>CSV File Format Instructions</h3>
            </div>
            
            <p className="text-sm text-gray-700">Your CSV file should include the following columns (in any order):</p>
            
            <div className="required-columns">
              <div className="column-item required">
                <strong>business_name</strong> <span className="badge-required">REQUIRED</span>
                <p className="text-sm text-gray-600">The name of the business or contact</p>
              </div>
            </div>

            <div className="optional-columns">
              <h4 className="text-lg font-semibold text-gray-800">Optional Columns:</h4>
              <div className="columns-grid">
                <div className="column-item"><strong className="text-gray-900">owner_name</strong> - <span className="text-gray-600">Contact person's name</span></div>
                <div className="column-item"><strong className="text-gray-900">email</strong> - <span className="text-gray-600">Email address</span></div>
                <div className="column-item"><strong className="text-gray-900">phone</strong> - <span className="text-gray-600">Phone number</span></div>
                <div className="column-item"><strong className="text-gray-900">website</strong> - <span className="text-gray-600">Website URL</span></div>
                <div className="column-item"><strong className="text-gray-900">address</strong> - <span className="text-gray-600">Street address</span></div>
                <div className="column-item"><strong className="text-gray-900">city</strong> - <span className="text-gray-600">City</span></div>
                <div className="column-item"><strong className="text-gray-900">state</strong> - <span className="text-gray-600">State</span></div>
                <div className="column-item"><strong className="text-gray-900">zip</strong> - <span className="text-gray-600">ZIP code</span></div>
                <div className="column-item"><strong className="text-gray-900">niche</strong> - <span className="text-gray-600">Industry/niche name</span></div>
                <div className="column-item"><strong className="text-gray-900">stage</strong> - <span className="text-gray-600">Pipeline stage (lead, contacted, etc.)</span></div>
                <div className="column-item"><strong className="text-gray-900">temperature</strong> - <span className="text-gray-600">hot, warm, or cold</span></div>
                <div className="column-item"><strong className="text-gray-900">tags</strong> - <span className="text-gray-600">Comma-separated tags</span></div>
                <div className="column-item"><strong className="text-gray-900">notes</strong> - <span className="text-gray-600">Additional notes</span></div>
              </div>
            </div>

            <a 
              href="/templates/contacts-import-template.csv" 
              download="contacts-import-template.csv"
              className="download-template"
            >
              <Download size={16} />
              <span className="text-sm text-gray-700">Download CSV Template</span>
            </a>
          </div>

          <div className="upload-section">
            <label htmlFor="csv-upload" className="upload-dropzone">
              <FileUp size={48} />
              <p className="upload-text">
                {uploadFile ? uploadFile.name : 'Click to upload CSV file'}
              </p>
              <p className="upload-subtext">or drag and drop</p>
              <input
                id="csv-upload"
                type="file"
                accept=".csv"
                onChange={onFileUpload}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          {uploadPreview.length > 0 && (
            <div className="upload-preview">
              <div className="preview-header">
                <CheckCircle size={20} />
                <h3>Preview (first 5 rows)</h3>
              </div>
              <div className="preview-table">
                <table>
                  <thead>
                    <tr>
                      <th>Business Name</th>
                      <th>Owner</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>City</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uploadPreview.map((contact, idx) => (
                      <tr key={idx}>
                        <td>{contact.business_name}</td>
                        <td>{contact.owner_name || '—'}</td>
                        <td>{contact.email || '—'}</td>
                        <td>{contact.phone || '—'}</td>
                        <td>{contact.city || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {uploadErrors.length > 0 && (
            <div className="upload-errors">
              <h4>Errors Found:</h4>
              <ul>
                {uploadErrors.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button 
            className="btn-primary" 
            onClick={onImport}
            disabled={!uploadFile || isUploading}
          >
            {isUploading ? 'Importing...' : 'Import Contacts'}
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

export default Contacts;

