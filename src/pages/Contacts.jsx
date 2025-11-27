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
  CheckCircle,
  XCircle,
  Clock,
  LayoutGrid,
  List,
  Columns
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
  const [selectedContact, setSelectedContact] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showAdUpload, setShowAdUpload] = useState(false);
  const [contactAds, setContactAds] = useState([]);
  const [contactActivities, setContactActivities] = useState([]);
  const [viewMode, setViewMode] = useState('grid');

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

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = 
      contact.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.owner_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStage = stageFilter === 'all' || contact.stage === stageFilter;
    
    return matchesSearch && matchesStage;
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
      approval_status: 'pending'
    });

    if (!error) {
      setContactAds([data, ...contactAds]);
    } else {
      throw new Error('Failed to save ad');
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
        <button className="btn-primary" onClick={handleCreateContact}>
          <Plus size={20} />
          Add Contact
        </button>
      }
      className="page-shell--fullwidth"
    >
      <div className="contacts-page">
        {/* Filters */}
        <div className="contacts-filters">
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

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

      {/* Contacts Content */}
      {viewMode === 'pipeline' ? (
        filteredContacts.length === 0 ? (
          <div className="empty-state">
            <p>No contacts found</p>
          </div>
        ) : (
          <div className="contacts-kanban">
            <div className="contacts-kanban-board">
              {PIPELINE_STAGES.map(stage => {
                const stageContacts = filteredContacts.filter(c => c.stage === stage.value);
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
          {filteredContacts.length === 0 ? (
            <div className="empty-state">
              <p>No contacts found</p>
            </div>
          ) : viewMode === 'grid' ? (
            filteredContacts.map(contact => (
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
              {filteredContacts.map(contact => (
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
          onRequestApproval={handleRequestApproval}
          onAddActivity={handleAddActivity}
        />
      )}
    </div>
  </PageLayout>
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
  onRequestApproval,
  onAddActivity
}) {
  const [formData, setFormData] = useState(contact);
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

        <div className="modal-tabs">
          <button
            className={`tab ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            Details
          </button>
          {contact.id && (
            <>
              <button
                className={`tab ${activeTab === 'ads' ? 'active' : ''}`}
                onClick={() => setActiveTab('ads')}
              >
                Ads ({ads.length}/8)
              </button>
              <button
                className={`tab ${activeTab === 'activity' ? 'active' : ''}`}
                onClick={() => setActiveTab('activity')}
              >
                Activity
              </button>
            </>
          )}
        </div>

        <div className="modal-body">
          {activeTab === 'details' && (
            <form onSubmit={handleSubmit} className="contact-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Business Name *</label>
                  <input
                    type="text"
                    value={formData.business_name}
                    onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Owner Name</label>
                  <input
                    type="text"
                    value={formData.owner_name || ''}
                    onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Website</label>
                <input
                  type="url"
                  value={formData.website || ''}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Address</label>
                <input
                  type="text"
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>City</label>
                  <input
                    type="text"
                    value={formData.city || ''}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>State</label>
                  <input
                    type="text"
                    value={formData.state || ''}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>ZIP</label>
                  <input
                    type="text"
                    value={formData.zip || ''}
                    onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Niche</label>
                  <select
                    value={formData.niche_id || ''}
                    onChange={(e) => setFormData({ ...formData, niche_id: e.target.value || null })}
                  >
                    <option value="">Select niche...</option>
                    {niches.map(niche => (
                      <option key={niche.id} value={niche.id}>{niche.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Stage</label>
                  <select
                    value={formData.stage}
                    onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                  >
                    {PIPELINE_STAGES.map(stage => (
                      <option key={stage.value} value={stage.value}>{stage.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Lead Temperature</label>
                  <select
                    value={formData.temperature || 'warm'}
                    onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                  >
                    {TEMPERATURE_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={4}
                />
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
                    <img src={ad.image_url} alt={ad.name} />
                    <div className="ad-info">
                      <div className="ad-name">{ad.name}</div>
                      <div className={`approval-status status-${ad.approval_status}`}>
                        {ad.approval_status === 'approved' && <CheckCircle size={14} />}
                        {ad.approval_status === 'rejected' && <XCircle size={14} />}
                        {ad.approval_status === 'pending' && <Clock size={14} />}
                        {ad.approval_status}
                      </div>
                    </div>
                    {ad.approval_status === 'pending' && !ad.approval_requested_at && (
                      <button
                        className="btn-sm"
                        onClick={() => onRequestApproval(ad.id)}
                      >
                        Request Approval
                      </button>
                    )}
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
        <div className="form-group">
          <label>Type</label>
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
        </div>
        <div className="form-group">
          <label>Subject</label>
          <input
            type="text"
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label>Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
        />
      </div>

      {['task', 'reminder'].includes(formData.activity_type) && (
        <div className="form-group">
          <label>Due Date</label>
          <input
            type="datetime-local"
            value={formData.due_date || ''}
            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
          />
        </div>
      )}

      <div className="form-actions">
        <button type="submit" className="btn-primary btn-sm">Add</button>
        <button type="button" className="btn-secondary btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

export default Contacts;

