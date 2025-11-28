import React, { useState, useEffect, useRef } from 'react';
import { Search, Mail, Phone, Building, Plus, Tag, User, UserPlus, X, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { contacts as contactsAPI, adSlots as adSlotsAPI, niches as nichesAPI } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import './CampaignContactsTab.css';

export const CampaignContactsTab = ({ campaign, onUpdate }) => {
  const { user } = useAuth();
  const isMountedRef = useRef(true);
  const [allContacts, setAllContacts] = useState([]);
  const [campaignContacts, setCampaignContacts] = useState([]);
  const [niches, setNiches] = useState([]);
  const [slots, setSlots] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedContact, setSelectedContact] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAddContactModal, setShowAddContactModal] = useState(false);

  useEffect(() => {
    isMountedRef.current = true;
    
    if (user && campaign?.id) {
      loadData();
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [campaign?.id, user]);

  const loadData = async () => {
    if (!user || !campaign?.id) return;
    
    if (isMountedRef.current) setLoading(true);
    
    try {
      // Load all contacts, slots, and niches
      const [contactsRes, slotsRes, nichesRes] = await Promise.all([
        contactsAPI.getAll(user.id),
        adSlotsAPI.getByCampaign(campaign.id),
        nichesAPI.getAll()
      ]);

      // Only update state if component is still mounted
      if (!isMountedRef.current) return;

      if (!contactsRes.error && contactsRes.data) {
        setAllContacts(contactsRes.data);
      }

      if (!nichesRes.error && nichesRes.data) {
        setNiches(nichesRes.data);
      }

      if (!slotsRes.error && slotsRes.data) {
        setSlots(slotsRes.data);
        
        // Extract unique contacts from slots
        const uniqueContactIds = [...new Set(
          slotsRes.data
            .filter(slot => slot.contact_id)
            .map(slot => slot.contact_id)
        )];

        const contacts = contactsRes.data?.filter(c => 
          uniqueContactIds.includes(c.id)
        ) || [];
        
        setCampaignContacts(contacts);
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

  const filteredContacts = campaignContacts.filter(contact => {
    const searchLower = searchTerm.toLowerCase();
    return (
      contact.business_name?.toLowerCase().includes(searchLower) ||
      contact.email?.toLowerCase().includes(searchLower) ||
      contact.phone?.toLowerCase().includes(searchLower) ||
      contact.tags?.some(tag => tag.toLowerCase().includes(searchLower))
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
      return 'any'; // No restrictions
    }
    
    if (campaign.niche_restriction_type === 'one_per_campaign') {
      // Check if this niche is in allowed_niches
      if (!campaign.allowed_niches?.includes(nicheId)) {
        return 'not_allowed';
      }
      
      // Check if a contact from this niche already has a slot
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

  // Calculate summary stats
  const totalContacts = campaignContacts.length;
  const totalRevenue = campaignContacts.reduce((sum, contact) => 
    sum + getContactRevenue(contact.id), 0
  );
  const totalSlots = slots.filter(slot => slot.contact_id).length;
  
  // Calculate niche slots stats (for one_per_campaign mode)
  const totalNicheSlots = campaign.niche_restriction_type === 'one_per_campaign' 
    ? (campaign.allowed_niches?.length || 0)
    : 0;
  const filledNicheSlots = campaign.niche_restriction_type === 'one_per_campaign'
    ? Object.keys(contactsByNiche).filter(nicheId => nicheId !== 'unassigned').length
    : 0;

  const handleAddContact = async (contactId) => {
    // This would typically assign the contact to an available slot
    // For now, we'll just refresh the data
    await loadData();
    setShowAddContactModal(false);
  };

  const handleRemoveContact = async (contactId) => {
    if (!confirm('Remove this contact from the campaign? This will unassign all their slots.')) {
      return;
    }
    
    // Get all slots for this contact
    const contactSlots = slots.filter(slot => slot.contact_id === contactId);
    
    // Unassign each slot
    for (const slot of contactSlots) {
      await adSlotsAPI.update(slot.id, { 
        contact_id: null, 
        client_ad_id: null,
        status: 'available' 
      });
    }
    
    // Reload data
    await loadData();
    if (onUpdate) onUpdate();
  };

  return (
    <div className="campaign-contacts-tab">
      {/* Summary Header */}
      <div className="contacts-summary-header">
        <div className="summary-stats">
          <div className="summary-stat">
            <div className="summary-stat-icon" style={{ backgroundColor: '#dbeafe' }}>
              <User size={20} style={{ color: '#3b82f6' }} />
            </div>
            <div>
              <div className="summary-stat-label">Total Advertisers</div>
              <div className="summary-stat-value">{totalContacts}</div>
            </div>
          </div>

          <div className="summary-stat">
            <div className="summary-stat-icon" style={{ backgroundColor: '#dcfce7' }}>
              <Building size={20} style={{ color: '#22c55e' }} />
            </div>
            <div>
              <div className="summary-stat-label">Total Slots Sold</div>
              <div className="summary-stat-value">{totalSlots}</div>
            </div>
          </div>

          <div className="summary-stat">
            <div className="summary-stat-icon" style={{ backgroundColor: '#fef3c7' }}>
              <Mail size={20} style={{ color: '#eab308' }} />
            </div>
            <div>
              <div className="summary-stat-label">Total Revenue</div>
              <div className="summary-stat-value">${totalRevenue.toLocaleString()}</div>
            </div>
          </div>

          {campaign.niche_restriction_type === 'one_per_campaign' && (
            <div className="summary-stat">
              <div className="summary-stat-icon" style={{ backgroundColor: '#fef3f2' }}>
                <Tag size={20} style={{ color: '#ef4444' }} />
              </div>
              <div>
                <div className="summary-stat-label">Niche Slots</div>
                <div className="summary-stat-value">
                  {filledNicheSlots} / {totalNicheSlots}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Search and Action Bar */}
        <div className="contacts-action-bar">
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
          <button 
            className="add-contact-btn"
            onClick={() => setShowAddContactModal(true)}
          >
            <UserPlus size={18} />
            Add Advertiser
          </button>
        </div>
      </div>

      {/* Campaign Mode Info */}
      {campaign.niche_restriction_type === 'one_per_campaign' && (
        <div className="campaign-mode-notice">
          <AlertCircle size={18} />
          <div>
            <strong>One Business Per Niche:</strong> Only one business from each niche can claim a spot in this campaign (first come, first served).
          </div>
        </div>
      )}

      {/* Contacts List - Organized by Niche */}
      <div className="contacts-list-container">
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
        ) : (
          <div className="niches-list">
            {Object.entries(contactsByNiche).map(([nicheId, nicheContacts]) => {
              const niche = niches.find(n => n.id === nicheId);
              const nicheName = niche?.name || 'Unassigned Niche';
              const nicheStatus = getNicheStatus(nicheId);
              
              return (
                <div key={nicheId} className="niche-section">
                  <div className="niche-header">
                    <div className="niche-header-left">
                      <Tag size={20} />
                      <h3>{nicheName}</h3>
                      {campaign.niche_restriction_type === 'one_per_campaign' && (
                        <span className={`niche-status-badge ${nicheStatus}`}>
                          {nicheStatus === 'filled' && <><CheckCircle size={14} /> Filled</>}
                          {nicheStatus === 'available' && <><Clock size={14} /> Available</>}
                        </span>
                      )}
                    </div>
                    <div className="niche-stats">
                      {nicheContacts.length} advertiser{nicheContacts.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  
                  <div className="contacts-grid">
                    {nicheContacts.map((contact) => (
                      <ContactCard
                        key={contact.id}
                        contact={contact}
                        slots={getContactSlots(contact.id)}
                        revenue={getContactRevenue(contact.id)}
                        onView={() => handleViewContact(contact)}
                        onRemove={() => handleRemoveContact(contact.id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Contact Details Modal */}
      {showDetailsModal && selectedContact && (
        <ContactDetailsModal
          contact={selectedContact}
          slots={getContactSlots(selectedContact.id)}
          campaign={campaign}
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
          onClose={() => setShowAddContactModal(false)}
        />
      )}
    </div>
  );
};

// Contact Card Component
const ContactCard = ({ contact, slots, revenue, onView, onRemove }) => {
  return (
    <div className="contact-card">
      <div className="contact-card-actions">
        <button 
          className="contact-card-action-btn view"
          onClick={onView}
          title="View details"
        >
          <User size={16} />
        </button>
        <button 
          className="contact-card-action-btn remove"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          title="Remove from campaign"
        >
          <X size={16} />
        </button>
      </div>

      <div className="contact-card-content" onClick={onView}>
        <div className="contact-card-header">
          <div className="contact-avatar">
            {contact.business_name?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div className="contact-card-info">
            <h4 className="contact-name">{contact.business_name}</h4>
            {contact.niche?.name && (
              <span className="contact-niche">{contact.niche.name}</span>
            )}
          </div>
        </div>

        <div className="contact-card-details">
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
          {contact.tags && contact.tags.length > 0 && (
            <div className="contact-tags">
              {contact.tags.slice(0, 2).map((tag, index) => (
                <span key={index} className="contact-tag">
                  <Tag size={12} />
                  {tag}
                </span>
              ))}
              {contact.tags.length > 2 && (
                <span className="contact-tag-more">+{contact.tags.length - 2}</span>
              )}
            </div>
          )}
        </div>

        <div className="contact-card-footer">
          <div className="contact-stat">
            <span className="contact-stat-label">Slots</span>
            <span className="contact-stat-value">{slots.length}</span>
          </div>
          <div className="contact-stat">
            <span className="contact-stat-label">Revenue</span>
            <span className="contact-stat-value">${revenue.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Contact Details Modal Component
const ContactDetailsModal = ({ contact, slots, campaign, onClose }) => {
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

          {/* Assigned Slots */}
          <div className="slots-section">
            <div className="slots-section-header">
              <h4>Assigned Slots ({slots.length})</h4>
              <div className="slots-total-revenue">
                Total Revenue: <strong>${totalRevenue.toFixed(2)}</strong>
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
                    ${getSlotFinalPrice(slot).toFixed(2)}
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
const AddContactModal = ({ campaign, allContacts, campaignContacts, niches, availableNiches, onAdd, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [nicheFilter, setNicheFilter] = useState('all');
  const [selectedContactIds, setSelectedContactIds] = useState(new Set());
  const bulkSelectCheckboxRef = useRef(null);

  // Filter out contacts already in the campaign
  const campaignContactIds = new Set(campaignContacts.map(c => c.id));
  const availableContacts = allContacts.filter(c => !campaignContactIds.has(c.id));

  // Apply filters
  const filteredContacts = availableContacts.filter(contact => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
      contact.business_name?.toLowerCase().includes(searchLower) ||
      contact.email?.toLowerCase().includes(searchLower) ||
      contact.phone?.toLowerCase().includes(searchLower);
    
    const matchesNiche = nicheFilter === 'all' || contact.niche_id === nicheFilter;
    
    // For one_per_campaign mode, only show contacts from available niches
    if (campaign.niche_restriction_type === 'one_per_campaign') {
      const availableNicheIds = availableNiches.map(n => n.id);
      return matchesSearch && matchesNiche && availableNicheIds.includes(contact.niche_id);
    }
    
    return matchesSearch && matchesNiche;
  });

  // Handle individual contact selection
  const handleToggleContact = (contactId) => {
    const newSelected = new Set(selectedContactIds);
    if (newSelected.has(contactId)) {
      newSelected.delete(contactId);
    } else {
      newSelected.add(contactId);
    }
    setSelectedContactIds(newSelected);
  };

  // Handle select all / deselect all
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedContactIds(new Set(filteredContacts.map(c => c.id)));
    } else {
      setSelectedContactIds(new Set());
    }
  };

  // Check if all filtered contacts are selected
  const allSelected = filteredContacts.length > 0 && selectedContactIds.size === filteredContacts.length;
  const someSelected = selectedContactIds.size > 0 && selectedContactIds.size < filteredContacts.length;

  // Update indeterminate state of bulk select checkbox
  useEffect(() => {
    if (bulkSelectCheckboxRef.current) {
      bulkSelectCheckboxRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  // Handle bulk add
  const handleBulkAdd = () => {
    if (selectedContactIds.size === 0) {
      return;
    }
    // Add all selected contacts
    selectedContactIds.forEach(contactId => {
      onAdd(contactId);
    });
    setSelectedContactIds(new Set());
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
              placeholder="Search businesses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <select 
            value={nicheFilter}
            onChange={(e) => setNicheFilter(e.target.value)}
            className="niche-filter-select"
          >
            <option value="all">All Niches</option>
            {(campaign.niche_restriction_type === 'one_per_campaign' ? availableNiches : niches).map(niche => (
              <option key={niche.id} value={niche.id}>{niche.name}</option>
            ))}
          </select>
        </div>

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
              {/* Bulk Select Header */}
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
                  return (
                    <div 
                      key={contact.id} 
                      className={`add-contact-item ${isSelected ? 'selected' : ''}`}
                      onClick={(e) => {
                        // Don't trigger if clicking the checkbox
                        if (e.target.type !== 'checkbox') {
                          handleToggleContact(contact.id);
                        }
                      }}
                    >
                      <input
                        type="checkbox"
                        className="contact-select-checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleToggleContact(contact.id);
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="contact-avatar small">
                        {contact.business_name?.charAt(0).toUpperCase() || 'A'}
                      </div>
                      <div className="add-contact-item-info">
                        <div className="add-contact-item-name">{contact.business_name}</div>
                        <div className="add-contact-item-details">
                          {contact.niche?.name && (
                            <span className="contact-niche">{contact.niche.name}</span>
                          )}
                          {contact.email && (
                            <span className="contact-detail-text">
                              <Mail size={12} />
                              {contact.email}
                            </span>
                          )}
                        </div>
                      </div>
                      <button 
                        className="add-contact-item-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAdd(contact.id);
                        }}
                      >
                        <Plus size={18} />
                      </button>
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

