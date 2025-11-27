import React, { useState, useEffect } from 'react';
import { Search, Mail, Phone, Building, Plus, Edit, Trash2, Tag, User } from 'lucide-react';
import { contacts as contactsAPI, adSlots as adSlotsAPI } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import './CampaignContactsTab.css';

export const CampaignContactsTab = ({ campaign, onUpdate }) => {
  const { user } = useAuth();
  const [allContacts, setAllContacts] = useState([]);
  const [campaignContacts, setCampaignContacts] = useState([]);
  const [slots, setSlots] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedContact, setSelectedContact] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [campaign.id]);

  const loadData = async () => {
    setLoading(true);
    
    // Load all contacts and slots
    const [contactsRes, slotsRes] = await Promise.all([
      contactsAPI.getAll(user.id),
      adSlotsAPI.getByCampaign(campaign.id)
    ]);

    if (!contactsRes.error && contactsRes.data) {
      setAllContacts(contactsRes.data);
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

  // Calculate summary stats
  const totalContacts = campaignContacts.length;
  const totalRevenue = campaignContacts.reduce((sum, contact) => 
    sum + getContactRevenue(contact.id), 0
  );
  const totalSlots = slots.filter(slot => slot.contact_id).length;

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
        </div>

        {/* Search Bar */}
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
      </div>

      {/* Contacts List */}
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
                  Assign contacts to slots in the Canvas tab to see them here.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="contacts-grid">
            {filteredContacts.map((contact) => (
              <ContactCard
                key={contact.id}
                contact={contact}
                slots={getContactSlots(contact.id)}
                revenue={getContactRevenue(contact.id)}
                onClick={() => handleViewContact(contact)}
              />
            ))}
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
    </div>
  );
};

// Contact Card Component
const ContactCard = ({ contact, slots, revenue, onClick }) => {
  return (
    <div className="contact-card" onClick={onClick}>
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

export default CampaignContactsTab;

