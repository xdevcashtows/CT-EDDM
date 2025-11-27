import React, { useState, useEffect } from 'react';
import { Calendar, DollarSign, Users, MapPin, Mail, TrendingUp, Package, Edit3, Check, X, Trash2, AlertTriangle, Navigation, Home, Truck } from 'lucide-react';
import { campaigns as campaignsAPI } from '../../lib/api';
import './CampaignConfigTab.css';

const statusOptions = [
  { value: 'draft', label: 'Draft', color: '#6b7280' },
  { value: 'working', label: 'Working', color: '#eab308' },
  { value: 'filled', label: 'Filled', color: '#f97316' },
  { value: 'printing', label: 'Printing', color: '#06b6d4' },
  { value: 'bundling', label: 'Bundling', color: '#3b82f6' },
  { value: 'delivered', label: 'Delivered', color: '#84cc16' },
  { value: 'mailed', label: 'Mailed', color: '#22c55e' },
  { value: 'cancelled', label: 'Cancelled', color: '#ef4444' },
];

const adSlotOptions = [
  { id: 'slot_1', label: '1 Slot', color: '#dbeafe', slots: 1 },
  { id: 'slot_2', label: '2 Slots', color: '#dcfce7', slots: 2 },
  { id: 'slot_4', label: '4 Slots', color: '#fef9c3', slots: 4 },
  { id: 'slot_8', label: '8 Slots', color: '#fee2e2', slots: 8 },
  { id: 'slot_12', label: '12 Slots', color: '#e0f2fe', slots: 12 },
  { id: 'slot_16', label: '16 Slots', color: '#ede9fe', slots: 16 }
];

export const CampaignConfigTab = ({ campaign, onUpdate, onClose }) => {
  const [formData, setFormData] = useState({
    name: campaign.name || '',
    status: campaign.status || 'draft',
    mail_date: campaign.mail_date || '',
    slot_1_price: campaign.slot_1_price || 0,
    slot_2_price: campaign.slot_2_price || 0,
    slot_4_price: campaign.slot_4_price || 0,
    slot_8_price: campaign.slot_8_price || 0,
    slot_12_price: campaign.slot_12_price || 0,
    slot_16_price: campaign.slot_16_price || 0,
    notes: campaign.notes || '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [editingRates, setEditingRates] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await campaignsAPI.update(campaign.id, formData);
      if (!error) {
        setHasChanges(false);
        setEditingRates(false);
        if (onUpdate) onUpdate();
      } else {
        alert('Failed to save changes');
      }
    } catch (err) {
      alert('Error saving changes');
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

  return (
    <div className="campaign-config-tab">
      {/* Analytics Section */}
      <div className="config-section">
        <h3 className="config-section-title">Campaign Analytics</h3>
        <div className="analytics-grid">
          {/* Slot Fill Rate */}
          <div className="analytics-card">
            <div className="analytics-card-icon" style={{ backgroundColor: '#dbeafe' }}>
              <Package size={20} style={{ color: '#3b82f6' }} />
            </div>
            <div className="analytics-card-content">
              <div className="analytics-card-label">Slot Fill Rate</div>
              <div className="analytics-card-value">{fillPercentage}%</div>
              <div className="analytics-card-detail">
                {bookedSlots} of {totalSlots} booked
              </div>
              <div className="analytics-progress-bar">
                <div
                  className="analytics-progress-fill"
                  style={{
                    width: `${fillPercentage}%`,
                    backgroundColor: '#3b82f6',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Revenue */}
          <div className="analytics-card">
            <div className="analytics-card-icon" style={{ backgroundColor: '#dcfce7' }}>
              <DollarSign size={20} style={{ color: '#22c55e' }} />
            </div>
            <div className="analytics-card-content">
              <div className="analytics-card-label">Revenue</div>
              <div className="analytics-card-value">${revenueCollected.toLocaleString()}</div>
              <div className="analytics-card-detail">
                ${revenueTotal.toLocaleString()} expected
              </div>
              <div className="analytics-progress-bar">
                <div
                  className="analytics-progress-fill"
                  style={{
                    width: `${revenuePercentage}%`,
                    backgroundColor: '#22c55e',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Available Slots */}
          <div className="analytics-card">
            <div className="analytics-card-icon" style={{ backgroundColor: '#fef3c7' }}>
              <TrendingUp size={20} style={{ color: '#eab308' }} />
            </div>
            <div className="analytics-card-content">
              <div className="analytics-card-label">Available Slots</div>
              <div className="analytics-card-value">{availableSlots}</div>
              <div className="analytics-card-detail">
                {availableSlots === 0 ? 'All booked!' : 'Ready to sell'}
              </div>
            </div>
          </div>

          {/* Total Reach */}
          <div className="analytics-card">
            <div className="analytics-card-icon" style={{ backgroundColor: '#e0e7ff' }}>
              <Users size={20} style={{ color: '#6366f1' }} />
            </div>
            <div className="analytics-card-content">
              <div className="analytics-card-label">Total Reach</div>
              <div className="analytics-card-value">
                {(campaign.total_pieces || 0).toLocaleString()}
              </div>
              <div className="analytics-card-detail">Households</div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Section */}
      <div className="config-section">
        <h3 className="config-section-title">Campaign Settings</h3>
        <div className="config-form config-form--compact">
          {/* Row 1: Name and Status */}
          <div className="form-row">
            <div className="form-group form-group--flex-2">
              <label htmlFor="campaign-name" className="form-label-with-icon">
                <Edit3 size={14} style={{ color: '#3b82f6' }} />
                Campaign Name
              </label>
              <input
                id="campaign-name"
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="campaign-status" className="form-label-with-icon">
                <TrendingUp size={14} style={{ color: '#22c55e' }} />
                Status
              </label>
              <select
                id="campaign-status"
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="form-input"
                style={{ 
                  borderLeft: `3px solid ${statusOptions.find(s => s.value === formData.status)?.color || '#6b7280'}`
                }}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Mail Date and Location */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="mail-date" className="form-label-with-icon">
                <Calendar size={14} style={{ color: '#8b5cf6' }} />
                Mail Date
              </label>
              <input
                id="mail-date"
                type="date"
                value={formData.mail_date ? new Date(formData.mail_date).toISOString().split('T')[0] : ''}
                onChange={(e) => handleChange('mail_date', e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label-with-icon">
                <MapPin size={14} style={{ color: '#f59e0b' }} />
                Location
              </label>
              <div className="form-readonly">
                {campaign.city?.name || campaign.city || 'Not set'}
              </div>
            </div>
          </div>

          {/* Row 3: Notes */}
          <div className="form-group">
            <label htmlFor="campaign-notes" className="form-label-with-icon">
              <Mail size={14} style={{ color: '#64748b' }} />
              Notes
            </label>
            <textarea
              id="campaign-notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              className="form-input"
              rows={3}
              placeholder="Add any notes about this campaign..."
            />
          </div>

          {/* Save Button */}
          {hasChanges && (
            <div className="form-actions">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="btn-save"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Route Information Section */}
      <div className="config-section route-info-section">
        <h3 className="config-section-title">
          <Navigation size={18} style={{ marginRight: '0.5rem' }} />
          Route Information
        </h3>
        
        <div className="route-info-grid">
          {/* Route Name & City */}
          <div className="route-info-card" style={{ backgroundColor: '#f0f9ff' }}>
            <div className="route-info-icon" style={{ backgroundColor: '#0ea5e9' }}>
              <Navigation size={20} style={{ color: 'white' }} />
            </div>
            <div className="route-info-content">
              <div className="route-info-label">Route Name</div>
              <div className="route-info-value">
                {campaign.route_snapshot?.length > 0 
                  ? `${campaign.route_snapshot.length} routes selected`
                  : 'No route data'}
              </div>
              {campaign.city && (
                <div className="route-info-sublabel">
                  {campaign.city?.name || campaign.city}
                  {campaign.city?.state && `, ${campaign.city.state}`}
                </div>
              )}
            </div>
          </div>

          {/* Total Households */}
          <div className="route-info-card" style={{ backgroundColor: '#fef3c7' }}>
            <div className="route-info-icon" style={{ backgroundColor: '#f59e0b' }}>
              <Home size={20} style={{ color: 'white' }} />
            </div>
            <div className="route-info-content">
              <div className="route-info-label">Total Households</div>
              <div className="route-info-value">
                {(campaign.total_pieces || 0).toLocaleString()}
              </div>
              <div className="route-info-sublabel">Delivery destinations</div>
            </div>
          </div>

          {/* Routes Count */}
          <div className="route-info-card" style={{ backgroundColor: '#f0fdf4' }}>
            <div className="route-info-icon" style={{ backgroundColor: '#22c55e' }}>
              <Truck size={20} style={{ color: 'white' }} />
            </div>
            <div className="route-info-content">
              <div className="route-info-label">Routes</div>
              <div className="route-info-value">
                {campaign.route_snapshot?.length || 0}
              </div>
              <div className="route-info-sublabel">
                {campaign.route_snapshot?.length === 1 ? 'delivery route' : 'delivery routes'}
              </div>
            </div>
          </div>

          {/* Estimated Cost */}
          <div className="route-info-card" style={{ backgroundColor: '#fef2f2' }}>
            <div className="route-info-icon" style={{ backgroundColor: '#ef4444' }}>
              <DollarSign size={20} style={{ color: 'white' }} />
            </div>
            <div className="route-info-content">
              <div className="route-info-label">Postage Cost</div>
              <div className="route-info-value">
                ${((campaign.total_pieces || 0) * 0.205).toLocaleString(undefined, { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                })}
              </div>
              <div className="route-info-sublabel">Est. at $0.205/piece</div>
            </div>
          </div>
        </div>
      </div>

      {/* Ad Slot Options & Rates Section */}
      <div className="config-section slot-rates-section">
        <div className="section-header-with-action">
          <h3 className="config-section-title">Ad Slot Options & Rates</h3>
          {!editingRates ? (
            <button onClick={() => setEditingRates(true)} className="btn-edit-rates">
              <Edit3 size={16} />
              Edit Rates
            </button>
          ) : (
            <div className="rates-actions">
              <button onClick={handleCancelRates} className="btn-cancel-action">
                <X size={16} />
                Cancel
              </button>
              <button onClick={handleSave} disabled={isSaving} className="btn-save-action">
                <Check size={16} />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}
        </div>

        <div className="slot-options-grid">
          {adSlotOptions.map((slot) => (
            <div 
              key={slot.id} 
              className="slot-option-card"
              style={{ backgroundColor: slot.color }}
            >
              <div className="slot-option-header">
                <div 
                  className="slot-option-badge"
                  style={{ 
                    backgroundColor: slot.color,
                    border: '2px solid rgba(0, 0, 0, 0.1)'
                  }}
                >
                  <span className="slot-number">{slot.slots}</span>
                </div>
                <div className="slot-option-info">
                  <h4>{slot.label}</h4>
                  <p>{slot.slots === 1 ? 'Single slot' : `${slot.slots}-slot placement`}</p>
                </div>
              </div>

              <div className="slot-option-rate">
                {editingRates ? (
                  <div className="rate-input-wrapper">
                    <label>Rate per slot</label>
                    <div className="rate-input-group">
                      <DollarSign size={18} className="rate-icon" />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData[`${slot.id}_price`]}
                        onChange={(e) => handleChange(`${slot.id}_price`, parseFloat(e.target.value) || 0)}
                        className="rate-input"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="rate-display">
                    <span className="rate-label">Rate per slot</span>
                    <span className="rate-value">${(formData[`${slot.id}_price`] || 0).toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Danger Zone Section */}
      <div className="config-section danger-zone">
        <h3 className="config-section-title danger-title">
          <AlertTriangle size={18} />
          Danger Zone
        </h3>
        <div className="danger-zone-content">
          <div className="danger-zone-info">
            <h4>Delete Campaign</h4>
            <p>
              Permanently delete this campaign and all associated data. This action cannot be undone.
            </p>
          </div>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="btn-delete-campaign"
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

