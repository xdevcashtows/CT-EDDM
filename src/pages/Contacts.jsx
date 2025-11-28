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
  CheckCircle
} from 'lucide-react';
import './Contacts.css';
import { contacts as contactsAPI, niches as nichesAPI, clientAds, activities } from '../lib/api';
import { storage } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import ImageUploader from '../components/ImageUploader';
import PageLayout from '../components/PageLayout';

const PIPELINE_STAGES = [
  { value: 'lead', label: 'Lead', color: '#6b7280' },
  { value: 'contacted', label: 'Contacted', color: '#3b82f6' },
  { value: 'qualified', label: 'Qualified', color: '#f59e0b' },
  { value: 'proposal_sent', label: 'Proposal Sent', color: '#ec4899' },
  { value: 'negotiating', label: 'Negotiating', color: '#8b5cf6' },
  { value: 'won', label: 'Won', color: '#0ea5e9' },
  { value: 'active', label: 'Active', color: '#22c55e' },
  { value: 'past', label: 'Past Client', color: '#64748b' },
  { value: 'lost', label: 'Lost', color: '#dc2626' }
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
  const [stageFilter, setStageFilter] = useState('all');
  const [nicheFilter, setNicheFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [temperatureFilter, setTemperatureFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [selectedContact, setSelectedContact] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showAdUpload, setShowAdUpload] = useState(false);
  const [contactAds, setContactAds] = useState([]);
  const [contactActivities, setContactActivities] = useState([]);
  const [viewMode, setViewMode] = useState('grid');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState([]);
  const [uploadErrors, setUploadErrors] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

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
    const [adsRes, activitiesRes] = await Promise.all([
      clientAds.getByContact(contactId),
      activities.getByContact(contactId)
    ]);

    if (!adsRes.error) setContactAds(adsRes.data || []);
    if (!activitiesRes.error) setContactActivities(activitiesRes.data || []);
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
      const matchesSearch = 
        contact.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.owner_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.email?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStage = stageFilter === 'all' || contact.stage === stageFilter;
      
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
    setContactActivities([]);
    setShowModal(true);
  };

  const handleSaveContact = async (contactData) => {
    const payload = sanitizeContactPayload(contactData);

    // Convert tags from comma-separated string to array
    if (payload.tags && typeof payload.tags === 'string') {
      payload.tags = payload.tags.split(',').map(t => t.trim()).filter(Boolean);
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

  const handleStageChange = async (contactId, newStage) => {
    const { data, error } = await contactsAPI.update(contactId, { stage: newStage });
    if (!error) {
      setContacts(contacts.map(c => c.id === contactId ? data : c));
      if (selectedContact?.id === contactId) {
        setSelectedContact(data);
      }
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

  const handleAddActivity = async (activityData) => {
    const { data, error } = await activities.create({
      ...activityData,
      contact_id: selectedContact.id,
      user_id: user.id
    });

    if (!error) {
      setContactActivities([data, ...contactActivities]);
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setStageFilter('all');
    setNicheFilter('all');
    setTagFilter('all');
    setTemperatureFilter('all');
    setSortBy('name');
  };

  const hasActiveFilters = 
    searchTerm !== '' || 
    stageFilter !== 'all' || 
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
        {/* Filters */}
        <div className="contacts-filters">
          {/* Search and View Toggle Row */}
          <div className="search-and-view-row">
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="view-toggle">
          <button
            type="button"
            className={`view-toggle-button ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            title="Grid view"
          >
            <LayoutGrid size={16} />
            <span>Grid</span>
          </button>
          <button
            type="button"
            className={`view-toggle-button ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            title="List view"
          >
            <List size={16} />
            <span>List</span>
          </button>
          <button
            type="button"
            className={`view-toggle-button ${viewMode === 'pipeline' ? 'active' : ''}`}
            onClick={() => setViewMode('pipeline')}
            title="Pipeline view"
          >
            <Columns size={16} />
            <span>Pipeline</span>
          </button>
            </div>
          </div>

          {/* Filter Controls Row */}
          <div className="filter-controls-row">
            <div className="filter-group">
              <label>Niche</label>
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
              <label>Tags</label>
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
              <label>Temperature</label>
              <div className="temperature-filter-buttons">
                <button
                  className={`temp-filter-btn ${temperatureFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setTemperatureFilter('all')}
                >
                  All
                </button>
                <button
                  className={`temp-filter-btn temp-hot ${temperatureFilter === 'hot' ? 'active' : ''}`}
                  onClick={() => setTemperatureFilter('hot')}
                >
                  Hot
                </button>
                <button
                  className={`temp-filter-btn temp-warm ${temperatureFilter === 'warm' ? 'active' : ''}`}
                  onClick={() => setTemperatureFilter('warm')}
                >
                  Warm
                </button>
                <button
                  className={`temp-filter-btn temp-cold ${temperatureFilter === 'cold' ? 'active' : ''}`}
                  onClick={() => setTemperatureFilter('cold')}
                >
                  Cold
                </button>
              </div>
            </div>

            <div className="filter-group">
              <label>Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="filter-select"
              >
                <option value="name">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="stage">Stage</option>
                <option value="temperature">Temperature</option>
                <option value="recent">Most Recent</option>
              </select>
            </div>

            <div className="filter-group" style={{ justifyContent: 'flex-end' }}>
              {hasActiveFilters && (
                <button
                  className="clear-filters-btn"
                  onClick={handleClearFilters}
                  title="Clear all filters"
                >
                  <X size={16} />
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Results Count */}
          <div className="results-count">
            Showing {filteredAndSortedContacts.length} of {contacts.length} contacts
          </div>

          {/* Stage Filters Row */}
          <div className="stage-filters">
            <button
              className={`stage-filter ${stageFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStageFilter('all')}
            >
              All ({contacts.length})
            </button>
            {PIPELINE_STAGES.map(stage => {
              const count = contacts.filter(c => c.stage === stage.value).length;
              return (
                <button
                  key={stage.value}
                  className={`stage-filter ${stageFilter === stage.value ? 'active' : ''}`}
                  onClick={() => setStageFilter(stage.value)}
                  style={{ borderColor: stage.color }}
                >
                  {stage.label} ({count})
                </button>
              );
            })}
        </div>
      </div>

      {/* Contacts Content */}
      {viewMode === 'pipeline' ? (
        filteredAndSortedContacts.length === 0 ? (
          <div className="empty-state">
            <p>No contacts found</p>
          </div>
        ) : (
          <div className="contacts-kanban">
            <div className="contacts-kanban-board">
              {PIPELINE_STAGES.map(stage => {
                const stageContacts = filteredAndSortedContacts.filter(c => c.stage === stage.value);
                return (
                  <div key={stage.value} className="contacts-kanban-column">
                  <div className="contacts-kanban-column-header">
                      <div>
                        <h3>{stage.label}</h3>
                        <p>{stageContacts.length} contact{stageContacts.length === 1 ? '' : 's'}</p>
                      </div>
                      <span
                        className="contacts-kanban-column-count"
                        style={{ background: stage.color + '20', color: stage.color }}
                      >
                        {stageContacts.length}
                      </span>
                    </div>
                    <div className="contacts-kanban-column-body">
                      {stageContacts.length === 0 ? (
                        <div className="contacts-kanban-column-empty">
                          <p>No contacts in this stage.</p>
                        </div>
                      ) : (
                        stageContacts.map(contact => {
                          const locationParts = [];
                          if (contact.city) locationParts.push(contact.city);
                          if (contact.state) locationParts.push(contact.state);
                          const locationLabel = locationParts.length ? locationParts.join(', ') : '—';
                          return (
                            <div
                              key={contact.id}
                              className="contact-kanban-card"
                              onClick={() => handleContactClick(contact)}
                            >
                              <div className="contact-kanban-card__top">
                                <div>
                                  <div className="contact-kanban-business">{contact.business_name}</div>
                                  <div className="contact-kanban-location">{locationLabel}</div>
                                  {contact.tags && (
                                    <div className="contact-tags" style={{ marginTop: '8px' }}>
                                      {(typeof contact.tags === 'string' 
                                        ? contact.tags.split(',').map(t => t.trim()) 
                                        : contact.tags
                                      ).filter(Boolean).slice(0, 2).map((tag, idx) => (
                                        <span key={idx} className="contact-tag">{tag}</span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div
                                  className={`contact-temperature contact-temperature--${contact.temperature || 'warm'}`}
                                >
                                  {formatTemperatureLabel(contact.temperature)}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )
      ) : (
        <div className={`contacts-grid ${viewMode === 'list' ? 'list-view' : ''}`}>
          {filteredAndSortedContacts.length === 0 ? (
            <div className="empty-state">
              <p>No contacts found</p>
            </div>
          ) : viewMode === 'grid' ? (
            filteredAndSortedContacts.map(contact => (
              <div
                key={contact.id}
                className="contact-card"
                onClick={() => handleContactClick(contact)}
              >
                <div className="contact-header">
                  <div className="contact-avatar">
                    {contact.business_name?.charAt(0) || '?'}
                  </div>
                  <div className="contact-info">
                    <div className="contact-name">{contact.business_name}</div>
                    <div className="contact-owner">{contact.owner_name}</div>
                  </div>
                </div>
                
                <div className="contact-details">
                  {contact.email && (
                    <div className="contact-detail">
                      <Mail size={14} />
                      <span>{contact.email}</span>
                    </div>
                  )}
                  {contact.phone && (
                    <div className="contact-detail">
                      <Phone size={14} />
                      <span>{contact.phone}</span>
                    </div>
                  )}
                  {contact.niche?.name && (
                    <div className="contact-niche">{contact.niche.name}</div>
                  )}
                </div>

                {contact.tags && (
                  <div className="contact-tags">
                    {(typeof contact.tags === 'string' 
                      ? contact.tags.split(',').map(t => t.trim()) 
                      : contact.tags
                    ).filter(Boolean).map((tag, idx) => (
                      <span key={idx} className="contact-tag">{tag}</span>
                    ))}
                  </div>
                )}

              <div className="contact-footer">
                <div
                  className="contact-stage"
                  style={{
                    background: PIPELINE_STAGES.find(s => s.value === contact.stage)?.color + '20',
                    color: PIPELINE_STAGES.find(s => s.value === contact.stage)?.color
                  }}
                >
                  {PIPELINE_STAGES.find(s => s.value === contact.stage)?.label}
                </div>
                <div
                  className={`contact-temperature contact-temperature--${contact.temperature || 'warm'}`}
                >
                  {formatTemperatureLabel(contact.temperature)}
                </div>
              </div>
              </div>
            ))
          ) : (
            <div className="contact-list">
              <div className="contact-list-header">
                <span>Business</span>
                <span>Contact</span>
                <span>Location</span>
                <span>Stage</span>
              </div>
              {filteredAndSortedContacts.map(contact => (
                <div
                  key={contact.id}
                  className="contact-list-row"
                  onClick={() => handleContactClick(contact)}
                >
                  <div className="contact-list-cell">
                    <div className="contact-name">{contact.business_name}</div>
                    <div className="contact-owner">{contact.owner_name}</div>
                  </div>
                  <div className="contact-list-cell">
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
                  <div className="contact-list-cell">
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
                  <div className="contact-list-cell contact-list-stage">
                  <div
                    className="contact-stage contact-stage--list"
                    style={{
                      background: PIPELINE_STAGES.find(s => s.value === contact.stage)?.color + '20',
                      color: PIPELINE_STAGES.find(s => s.value === contact.stage)?.color
                    }}
                  >
                    {PIPELINE_STAGES.find(s => s.value === contact.stage)?.label}
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
          activities={contactActivities}
          onSave={handleSaveContact}
          onClose={() => setShowModal(false)}
          onDelete={handleDeleteContact}
          onStageChange={handleStageChange}
          onAdUpload={handleAdUpload}
          onAdDelete={handleAdDelete}
          onRequestApproval={handleRequestApproval}
          onAddActivity={handleAddActivity}
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
  activities,
  onSave, 
  onClose, 
  onDelete,
  onStageChange,
  onAdUpload,
  onAdDelete,
  onRequestApproval,
  onAddActivity
}) {
  const [formData, setFormData] = useState({
    ...contact,
    tags: Array.isArray(contact.tags) ? contact.tags.join(', ') : contact.tags || ''
  });
  const [activeTab, setActiveTab] = useState('details');
  const [showAdUploader, setShowAdUploader] = useState(false);
  const [showActivityForm, setShowActivityForm] = useState(false);

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
                className={`settings-tab ${activeTab === 'ads' ? 'active' : ''}`}
                onClick={() => setActiveTab('ads')}
              >
                Ads ({ads.length}/8)
              </button>
              <button
                className={`settings-tab ${activeTab === 'activity' ? 'active' : ''}`}
                onClick={() => setActiveTab('activity')}
              >
                Activity
              </button>
            </>
          )}
        </div>

        <div className="modal-body">
          {activeTab === 'details' && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              {/* Basic Information Section */}
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

              {/* Location Section */}
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

              {/* Sales Information Section */}
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
                        {PIPELINE_STAGES.map(stage => (
                          <option key={stage.value} value={stage.value}>{stage.label}</option>
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

              {/* Tags Section */}
              <div className="form-field">
                <span>Tags</span>
                <TagInput
                  tags={formData.tags}
                  onChange={(tags) => setFormData({ ...formData, tags })}
                />
                <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                  Press Enter or comma to add a tag. Click × to remove.
                </p>
              </div>

              {/* Notes Section */}
              <div className="bg-amber-50 border-l-4 border-amber-500 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-amber-900 mb-4">Notes</h3>
                <label className="form-field">
                  <span>Additional Notes</span>
                  <textarea
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={4}
                  />
                </label>
              </div>

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

          {activeTab === 'activity' && (
            <div className="activity-tab">
              <div className="tab-header">
                <h3>Activity History</h3>
                <button
                  className="btn-primary btn-sm"
                  onClick={() => setShowActivityForm(!showActivityForm)}
                >
                  <Plus size={16} />
                  Add Activity
                </button>
              </div>

              {showActivityForm && (
                <ActivityForm onSubmit={onAddActivity} onCancel={() => setShowActivityForm(false)} />
              )}

              <div className="activities-list">
                {activities.map(activity => (
                  <div key={activity.id} className="activity-item">
                    <div className="activity-type">{activity.activity_type}</div>
                    <div className="activity-subject">{activity.subject}</div>
                    <div className="activity-description">{activity.description}</div>
                    <div className="activity-date">
                      {new Date(activity.created_at).toLocaleString()}
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

// Activity Form Component
function ActivityForm({ onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    activity_type: 'note',
    subject: '',
    description: '',
    due_date: null
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
    onCancel();
  };

  return (
    <form onSubmit={handleSubmit} className="activity-form">
      <div className="form-row">
        <label className="form-field">
          <span>Type</span>
          <select
            value={formData.activity_type}
            onChange={(e) => setFormData({ ...formData, activity_type: e.target.value })}
          >
            <option value="note">Note</option>
            <option value="call">Call</option>
            <option value="email">Email</option>
            <option value="meeting">Meeting</option>
            <option value="task">Task</option>
            <option value="reminder">Reminder</option>
          </select>
        </label>
        <label className="form-field">
          <span>Subject</span>
          <input
            type="text"
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            required
          />
        </label>
      </div>

      <label className="form-field">
        <span>Description</span>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
        />
      </label>

      {['task', 'reminder'].includes(formData.activity_type) && (
        <label className="form-field">
          <span>Due Date</span>
          <input
            type="datetime-local"
            value={formData.due_date || ''}
            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
          />
        </label>
      )}

      <div className="form-actions">
        <button type="submit" className="btn-primary btn-sm">Add</button>
        <button type="button" className="btn-secondary btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </form>
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

export default Contacts;

