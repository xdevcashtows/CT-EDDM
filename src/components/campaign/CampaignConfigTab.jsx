import React, { useState, useEffect, useRef } from 'react';
import { Calendar, DollarSign, Users, MapPin, Mail, TrendingUp, Package, Edit3, Check, X, Trash2, AlertTriangle, Navigation, Home, Truck, ChevronDown } from 'lucide-react';
import { campaigns as campaignsAPI, cities as citiesAPI } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import './CampaignConfigTab.css';

const statusOptions = [
  { value: 'draft', label: 'Draft', color: '#6b7280' },
  { value: 'active', label: 'Active', color: '#22c55e' },
  { value: 'in_production', label: 'In Production', color: '#06b6d4' },
  { value: 'printed', label: 'Printed', color: '#3b82f6' },
  { value: 'mailed', label: 'Mailed', color: '#22c55e' },
  { value: 'completed', label: 'Completed', color: '#84cc16' },
  { value: 'cancelled', label: 'Cancelled', color: '#ef4444' },
];

const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
];

const adSlotOptions = [
  { id: 'slot_1', label: '1 Slot', color: '#dbeafe', slots: 1 },
  { id: 'slot_2', label: '2 Slots', color: '#dcfce7', slots: 2 },
  { id: 'slot_4', label: '4 Slots', color: '#fef9c3', slots: 4 },
  { id: 'slot_8', label: '8 Slots', color: '#fee2e2', slots: 8 },
  { id: 'slot_12', label: '12 Slots', color: '#e0f2fe', slots: 12 },
  { id: 'slot_16', label: '16 Slots', color: '#ede9fe', slots: 16 }
];

export const CampaignConfigTab = ({ campaign, onUpdate, onClose, tab = 'settings' }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: campaign.name || '',
    status: campaign.status || 'draft',
    mail_date: campaign.mail_date || '',
    city: campaign.city?.name || campaign.city || '',
    state: campaign.city?.state || '',
    slot_1_price: campaign.slot_1_price || 0,
    slot_2_price: campaign.slot_2_price || 0,
    slot_4_price: campaign.slot_4_price || 0,
    slot_8_price: campaign.slot_8_price || 0,
    slot_12_price: campaign.slot_12_price || 0,
    slot_16_price: campaign.slot_16_price || 0,
    notes: campaign.notes ?? '', // Use nullish coalescing to handle null explicitly
  });
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [editingRates, setEditingRates] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const statusDropdownRef = useRef(null);

  // Update formData when campaign prop changes (after parent refreshes data)
  useEffect(() => {
    setFormData({
      name: campaign.name || '',
      status: campaign.status || 'draft',
      mail_date: campaign.mail_date || '',
      city: campaign.city?.name || campaign.city || '',
      state: campaign.city?.state || '',
      slot_1_price: campaign.slot_1_price || 0,
      slot_2_price: campaign.slot_2_price || 0,
      slot_4_price: campaign.slot_4_price || 0,
      slot_8_price: campaign.slot_8_price || 0,
      slot_12_price: campaign.slot_12_price || 0,
      slot_16_price: campaign.slot_16_price || 0,
      notes: campaign.notes ?? '', // Use nullish coalescing to handle null explicitly
    });
  }, [campaign]);

  // Close status dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target)) {
        setShowStatusDropdown(false);
      }
    };

    if (showStatusDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showStatusDropdown]);

  // Calculate analytics
  const totalSlots = campaign.total_ad_slots || 0;
  const bookedSlots = campaign.booked_ad_slots || 0;
  const availableSlots = totalSlots - bookedSlots;
  const fillPercentage = totalSlots > 0 ? ((bookedSlots / totalSlots) * 100).toFixed(1) : 0;

  const revenueCollected = campaign.revenue_collected || 0;
  const revenueTotal = campaign.revenue_total || campaign.expected_revenue || 0;
  const revenuePercentage = revenueTotal > 0 ? ((revenueCollected / revenueTotal) * 100).toFixed(1) : 0;

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  // Helper function to find or create a city
  const findOrCreateCity = async (cityName, stateName) => {
    if (!cityName || !cityName.trim() || !user?.id) {
      return null;
    }

    const trimmedCityName = cityName.trim();
    const trimmedState = stateName?.trim() || '';
    
    // First, try to find existing city (match by name and state if provided)
    const { data: existingCities } = await citiesAPI.getAll(user.id);
    const existingCity = existingCities?.find(
      c => c.name?.toLowerCase() === trimmedCityName.toLowerCase() &&
           (!trimmedState || c.state?.toLowerCase() === trimmedState.toLowerCase())
    );
    
    if (existingCity) {
      return existingCity.id;
    }
    
    // If not found, create a new city
    // State is required by the database, so we must provide it
    if (!trimmedState) {
      console.warn('State is required for city creation. Using empty string as default.');
    }
    
    const { data: newCity, error } = await citiesAPI.create({
      name: trimmedCityName,
      state: trimmedState || '', // Provide state (required field)
      created_by: user.id
    });
    
    if (error || !newCity) {
      console.error('Error creating city:', error);
      return null;
    }
    
    return newCity.id;
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Only send valid database fields with proper types
      // mail_date should be null if empty string, or a proper date string
      let mailDate = null;
      if (formData.mail_date && formData.mail_date.trim() !== '') {
        // Convert date string to ISO format for database
        const date = new Date(formData.mail_date);
        if (!isNaN(date.getTime())) {
          mailDate = date.toISOString().split('T')[0]; // YYYY-MM-DD format
        }
      }
      
      // Find or create city and get city_id
      const cityId = await findOrCreateCity(formData.city, formData.state);
      
      const cleanData = {
        name: formData.name || '',
        status: formData.status || 'draft',
        mail_date: mailDate,
        city_id: cityId, // Save city_id instead of city text
        slot_1_price: Number(formData.slot_1_price) || 0,
        slot_2_price: Number(formData.slot_2_price) || 0,
        slot_4_price: Number(formData.slot_4_price) || 0,
        slot_8_price: Number(formData.slot_8_price) || 0,
        slot_12_price: Number(formData.slot_12_price) || 0,
        slot_16_price: Number(formData.slot_16_price) || 0,
        notes: formData.notes || null
      };
      
      console.log('Saving campaign config with data:', cleanData);
      const { data, error } = await campaignsAPI.update(campaign.id, cleanData);
      if (!error && data) {
        console.log('Campaign saved successfully:', data);
        
        // Update formData with the saved values to reflect in the UI
        // Convert null notes to empty string for textarea (React doesn't allow null value)
        // Exclude city_id from formData (it's only for database, formData uses city text)
        const { city_id, ...formDataUpdates } = cleanData;
        setFormData(prev => ({
          ...prev,
          ...formDataUpdates,
          notes: cleanData.notes || ''
        }));
        
        setHasChanges(false);
        setEditingRates(false);
        
        // Notify parent to refresh campaign data
        if (onUpdate) onUpdate();
      } else {
        console.error('Failed to save campaign:', error);
        alert('Failed to save changes: ' + (error.message || JSON.stringify(error)));
      }
    } catch (err) {
      console.error('Error saving campaign:', err);
      alert('Error saving changes: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelRates = () => {
    setFormData(prev => ({
      ...prev,
      slot_1_price: campaign.slot_1_price || 0,
      slot_2_price: campaign.slot_2_price || 0,
      slot_4_price: campaign.slot_4_price || 0,
      slot_8_price: campaign.slot_8_price || 0,
      slot_12_price: campaign.slot_12_price || 0,
      slot_16_price: campaign.slot_16_price || 0,
    }));
    setEditingRates(false);
    setHasChanges(false);
  };

  const handleDeleteCampaign = async () => {
    setIsDeleting(true);
    try {
      const { error } = await campaignsAPI.delete(campaign.id);
      if (!error) {
        // Close the modal and refresh the parent component
        setShowDeleteConfirm(false);
        if (onUpdate) onUpdate();
        // Close the detail view after successful deletion
        if (onClose) onClose();
      } else {
        alert('Failed to delete campaign. Please try again.');
      }
    } catch (err) {
      alert('Error deleting campaign. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'Not set';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Render based on tab prop
  if (tab === 'analytics') {
    return (
      <div className="campaign-config-tab">
        {/* Analytics Section */}
        <div className="config-section analytics-section-sleek">
          <h3 className="config-section-title-sleek">Campaign Analytics</h3>
          <div className="analytics-grid-sleek">
            {/* Slot Fill Rate */}
            <div className="analytics-card-sleek">
            <div className="analytics-card-icon-sleek" style={{ backgroundColor: '#dbeafe' }}>
              <Package size={20} style={{ color: '#3b82f6' }} />
            </div>
              <div className="analytics-card-content-sleek">
                <div className="analytics-card-label-sleek">Slot Fill Rate</div>
                <div className="analytics-card-value-sleek">{fillPercentage}%</div>
                <div className="analytics-card-detail-sleek">
                  {bookedSlots} of {totalSlots} booked
                </div>
                <div className="analytics-progress-bar-sleek">
                  <div
                    className="analytics-progress-fill-sleek"
                    style={{
                      width: `${fillPercentage}%`,
                      backgroundColor: '#3b82f6',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Revenue */}
            <div className="analytics-card-sleek">
            <div className="analytics-card-icon-sleek" style={{ backgroundColor: '#dcfce7' }}>
              <DollarSign size={20} style={{ color: '#22c55e' }} />
            </div>
              <div className="analytics-card-content-sleek">
                <div className="analytics-card-label-sleek">Revenue</div>
                <div className="analytics-card-value-sleek">${revenueCollected.toLocaleString()}</div>
                <div className="analytics-card-detail-sleek">
                  ${revenueTotal.toLocaleString()} expected
                </div>
                <div className="analytics-progress-bar-sleek">
                  <div
                    className="analytics-progress-fill-sleek"
                    style={{
                      width: `${revenuePercentage}%`,
                      backgroundColor: '#22c55e',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Available Slots */}
            <div className="analytics-card-sleek">
            <div className="analytics-card-icon-sleek" style={{ backgroundColor: '#fef3c7' }}>
              <TrendingUp size={20} style={{ color: '#eab308' }} />
            </div>
              <div className="analytics-card-content-sleek">
                <div className="analytics-card-label-sleek">Available Slots</div>
                <div className="analytics-card-value-sleek">{availableSlots}</div>
                <div className="analytics-card-detail-sleek">
                  {availableSlots === 0 ? 'All booked!' : 'Ready to sell'}
                </div>
              </div>
            </div>

            {/* Total Reach */}
            <div className="analytics-card-sleek">
            <div className="analytics-card-icon-sleek" style={{ backgroundColor: '#e0e7ff' }}>
              <Users size={20} style={{ color: '#6366f1' }} />
            </div>
              <div className="analytics-card-content-sleek">
                <div className="analytics-card-label-sleek">Total Reach</div>
                <div className="analytics-card-value-sleek">
                  {(campaign.total_pieces || 0).toLocaleString()}
                </div>
                <div className="analytics-card-detail-sleek">Households</div>
              </div>
            </div>
          </div>
        </div>

        {/* Route Information Section */}
        <div className="config-section route-info-section-sleek">
          <h3 className="config-section-title-sleek">
            <Navigation size={18} style={{ marginRight: '0.5rem' }} />
            Route Information
          </h3>
          
          <div className="route-info-grid-sleek">
            {/* Route Name & City */}
            <div className="route-info-card-sleek">
              <div className="route-info-icon-sleek" style={{ backgroundColor: '#0ea5e9' }}>
                <Navigation size={18} style={{ color: 'white' }} />
              </div>
              <div className="route-info-content-sleek">
                <div className="route-info-label-sleek">Route Name</div>
                <div className="route-info-value-sleek">
                  {campaign.route_snapshot?.length > 0 
                    ? `${campaign.route_snapshot.length} routes selected`
                    : 'No route data'}
                </div>
                {campaign.city && (
                  <div className="route-info-sublabel-sleek">
                    {campaign.city?.name || campaign.city}
                    {campaign.city?.state && `, ${campaign.city.state}`}
                  </div>
                )}
              </div>
            </div>

            {/* Total Households */}
            <div className="route-info-card-sleek">
              <div className="route-info-icon-sleek" style={{ backgroundColor: '#f59e0b' }}>
                <Home size={18} style={{ color: 'white' }} />
              </div>
              <div className="route-info-content-sleek">
                <div className="route-info-label-sleek">Total Households</div>
                <div className="route-info-value-sleek">
                  {(campaign.total_pieces || 0).toLocaleString()}
                </div>
                <div className="route-info-sublabel-sleek">Delivery destinations</div>
              </div>
            </div>

            {/* Routes Count */}
            <div className="route-info-card-sleek">
              <div className="route-info-icon-sleek" style={{ backgroundColor: '#22c55e' }}>
                <Truck size={18} style={{ color: 'white' }} />
              </div>
              <div className="route-info-content-sleek">
                <div className="route-info-label-sleek">Routes</div>
                <div className="route-info-value-sleek">
                  {campaign.route_snapshot?.length || 0}
                </div>
                <div className="route-info-sublabel-sleek">
                  {campaign.route_snapshot?.length === 1 ? 'delivery route' : 'delivery routes'}
                </div>
              </div>
            </div>

            {/* Estimated Cost */}
            <div className="route-info-card-sleek">
              <div className="route-info-icon-sleek" style={{ backgroundColor: '#ef4444' }}>
                <DollarSign size={18} style={{ color: 'white' }} />
              </div>
              <div className="route-info-content-sleek">
                <div className="route-info-label-sleek">Postage Cost</div>
                <div className="route-info-value-sleek">
                  ${((campaign.total_pieces || 0) * 0.205).toLocaleString(undefined, { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  })}
                </div>
                <div className="route-info-sublabel-sleek">Est. at $0.205/piece</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentStatus = statusOptions.find(s => s.value === formData.status) || statusOptions[0];

  // Settings Tab
  return (
    <div className="campaign-config-tab">
      {/* Settings Section */}
      <div className="config-section settings-section-sleek">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 className="config-section-title-sleek" style={{ margin: 0 }}>Campaign Settings</h3>
          {/* Status Pill with Dropdown */}
          <div style={{ position: 'relative' }} ref={statusDropdownRef}>
            <button
              type="button"
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                borderRadius: '9999px',
                border: 'none',
                backgroundColor: currentStatus.color,
                color: 'white',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              {currentStatus.label}
              <ChevronDown size={16} />
            </button>
            {showStatusDropdown && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '0.5rem',
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                  zIndex: 1000,
                  minWidth: '180px',
                  overflow: 'hidden',
                }}
              >
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      handleChange('status', option.value);
                      setShowStatusDropdown(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      border: 'none',
                      backgroundColor: formData.status === option.value ? '#f3f4f6' : 'white',
                      color: '#111827',
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'background-color 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      if (formData.status !== option.value) {
                        e.currentTarget.style.backgroundColor = '#f9fafb';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (formData.status !== option.value) {
                        e.currentTarget.style.backgroundColor = 'white';
                      }
                    }}
                  >
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: option.color,
                        flexShrink: 0,
                      }}
                    />
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="config-form-sleek" style={{ 
          backgroundColor: '#f8fafc', 
          padding: '1.5rem', 
          borderRadius: '0.5rem',
          border: '1px solid #e2e8f0'
        }}>
          {/* Row 1: Name, City, and State */}
          <div className="form-row-sleek">
            <div className="form-group-sleek" style={{ flex: '1 1 50%', marginRight: '1rem' }}>
              <label htmlFor="campaign-name" className="form-label-sleek">
                <Edit3 size={16} className="form-label-icon" />
                Campaign Name
              </label>
              <input
                id="campaign-name"
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="form-input-sleek"
                placeholder="Enter campaign name..."
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flex: '1 1 50%' }}>
              <div className="form-group-sleek" style={{ flex: '2 1 0' }}>
                <label htmlFor="campaign-city" className="form-label-sleek">
                  <MapPin size={16} className="form-label-icon" />
                  City
                </label>
                <input
                  id="campaign-city"
                  type="text"
                  value={formData.city || ''}
                  onChange={(e) => handleChange('city', e.target.value)}
                  className="form-input-sleek"
                  placeholder="Enter city..."
                />
              </div>

              <div className="form-group-sleek" style={{ flex: '1 1 0' }}>
                <label htmlFor="campaign-state" className="form-label-sleek">
                  <MapPin size={16} className="form-label-icon" />
                  State
                </label>
                <select
                  id="campaign-state"
                  value={formData.state || ''}
                  onChange={(e) => handleChange('state', e.target.value)}
                  className="form-input-sleek form-select-sleek"
                >
                  <option value="">Select...</option>
                  {US_STATES.map((state) => (
                    <option key={state.value} value={state.value}>
                      {state.value}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Row 2: Mail Date */}
          <div className="form-row-sleek">
            <div className="form-group-sleek">
              <label htmlFor="mail-date" className="form-label-sleek">
                <Calendar size={16} className="form-label-icon" />
                Mail Date
              </label>
              <input
                id="mail-date"
                type="date"
                value={formData.mail_date ? new Date(formData.mail_date).toISOString().split('T')[0] : ''}
                onChange={(e) => handleChange('mail_date', e.target.value)}
                className="form-input-sleek"
              />
            </div>
          </div>

          {/* Row 3: Notes */}
          <div className="form-group-sleek">
            <label htmlFor="campaign-notes" className="form-label-sleek">
              <Mail size={16} className="form-label-icon" />
              Notes
            </label>
            <textarea
              id="campaign-notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              className="form-input-sleek form-textarea-sleek"
              rows={4}
              placeholder="Add any notes about this campaign..."
            />
          </div>

          {/* Save Button */}
          {hasChanges && (
            <div className="form-actions-sleek">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="btn-save-sleek"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Ad Slot Options & Rates Section */}
      <div className="config-section slot-rates-section-sleek">
        <div className="section-header-sleek">
          <h3 className="config-section-title-sleek">Ad Slot Options & Rates</h3>
          {!editingRates ? (
            <button onClick={() => setEditingRates(true)} className="btn-edit-rates-sleek">
              <Edit3 size={16} />
              Edit Rates
            </button>
          ) : (
            <div className="rates-actions-sleek">
              <button onClick={handleCancelRates} className="btn-cancel-action-sleek">
                <X size={16} />
                Cancel
              </button>
              <button onClick={handleSave} disabled={isSaving} className="btn-save-action-sleek">
                <Check size={16} />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}
        </div>

        <div className="slot-options-grid-sleek">
          {adSlotOptions.map((slot) => (
            <div 
              key={slot.id} 
              className="slot-option-card-sleek"
            >
              <div className="slot-option-header-sleek">
                <div 
                  className="slot-option-badge-sleek"
                  style={{ 
                    backgroundColor: slot.color,
                  }}
                >
                  <span className="slot-number-sleek">{slot.slots}</span>
                </div>
                <div className="slot-option-info-sleek">
                  <h4>{slot.label}</h4>
                  <p>{slot.slots === 1 ? 'Single slot' : `${slot.slots}-slot placement`}</p>
                </div>
              </div>

              <div className="slot-option-rate-sleek">
                {editingRates ? (
                  <div className="rate-input-wrapper-sleek">
                    <label>Rate per slot</label>
                    <div className="rate-input-group-sleek">
                      <DollarSign size={18} className="rate-icon-sleek" />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData[`${slot.id}_price`]}
                        onChange={(e) => handleChange(`${slot.id}_price`, parseFloat(e.target.value) || 0)}
                        className="rate-input-sleek"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="rate-display-sleek">
                    <span className="rate-label-sleek">Rate per slot</span>
                    <span className="rate-value-sleek">${(formData[`${slot.id}_price`] || 0).toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Danger Zone Section */}
      <div className="config-section danger-zone-sleek">
        <h3 className="config-section-title-sleek danger-title-sleek">
          <AlertTriangle size={18} />
          Danger Zone
        </h3>
        <div className="danger-zone-content-sleek">
          <div className="danger-zone-info-sleek">
            <h4>Delete Campaign</h4>
            <p>
              Permanently delete this campaign and all associated data. This action cannot be undone.
            </p>
          </div>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="btn-delete-campaign-sleek"
          >
            <Trash2 size={16} />
            Delete Campaign
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <>
          <div className="delete-modal-backdrop" onClick={() => !isDeleting && setShowDeleteConfirm(false)} />
          <div className="delete-modal">
            <div className="delete-modal-header">
              <AlertTriangle size={24} className="delete-modal-icon" />
              <h3>Delete Campaign?</h3>
            </div>
            <div className="delete-modal-content">
              <p>
                Are you sure you want to delete <strong>{campaign.name}</strong>?
              </p>
              <p>This will permanently delete:</p>
              <ul>
                <li>All campaign data and settings</li>
                <li>Ad slots and bookings</li>
                <li>Associated canvas designs</li>
                <li>Analytics and revenue data</li>
              </ul>
              <p className="delete-warning">
                <strong>This action cannot be undone.</strong>
              </p>
            </div>
            <div className="delete-modal-actions">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="btn-cancel-delete"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCampaign}
                disabled={isDeleting}
                className="btn-confirm-delete"
              >
                <Trash2 size={16} />
                {isDeleting ? 'Deleting...' : 'Yes, Delete Campaign'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CampaignConfigTab;

