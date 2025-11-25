import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Copy, Lock } from 'lucide-react';
import './Designs.css';
import { designs as designsAPI } from '../lib/api';
import { storage } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import ImageUploader from '../components/ImageUploader';
import PageLayout from '../components/PageLayout';

const CARD_SIZES = [
  { value: '9x12', label: '9" × 12"', width: 900, height: 1200 },
  { value: '6x12', label: '6" × 12"', width: 600, height: 1200 }
];

const SLOT_SIZES = ['small', 'medium', 'large'];

function Designs() {
  const { user } = useAuth();
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDesign, setSelectedDesign] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (user) {
      loadDesigns();
    }
  }, [user]);

  const loadDesigns = async () => {
    setLoading(true);
    const { data, error } = await designsAPI.getAll(user.id);
    if (!error && data) {
      setDesigns(data);
    }
    setLoading(false);
  };

  const handleCreateDesign = () => {
    setSelectedDesign({
      name: '',
      card_size: '9x12',
      background_type: 'color',
      background_color: '#ffffff',
      background_gradient: null,
      background_image_url: null,
      num_slots: 17,
      slot_config: generateDefaultSlots(17)
    });
    setShowModal(true);
  };

  const handleEditDesign = (design) => {
    setSelectedDesign(design);
    setShowModal(true);
  };

  const handleDuplicateDesign = async (design) => {
    const duplicate = {
      ...design,
      name: `${design.name} (Copy)`,
      id: undefined,
      is_locked: false
    };
    
    const { data, error } = await designsAPI.create({ ...duplicate, user_id: user.id });
    if (!error) {
      setDesigns([data, ...designs]);
    } else {
      alert('Failed to duplicate design');
    }
  };

  const handleDeleteDesign = async (designId) => {
    if (confirm('Are you sure you want to delete this design?')) {
      const { error } = await designsAPI.delete(designId);
      if (!error) {
        setDesigns(designs.filter(d => d.id !== designId));
      } else {
        alert('Failed to delete design');
      }
    }
  };

  const handleSaveDesign = async (designData) => {
    if (selectedDesign.id) {
      // Update
      const { data, error } = await designsAPI.update(selectedDesign.id, designData);
      if (!error) {
        setDesigns(designs.map(d => d.id === selectedDesign.id ? data : d));
        setShowModal(false);
      } else {
        alert('Failed to update design');
      }
    } else {
      // Create
      const { data, error } = await designsAPI.create({ ...designData, user_id: user.id });
      if (!error) {
        setDesigns([data, ...designs]);
        setShowModal(false);
      } else {
        alert('Failed to create design');
      }
    }
  };

  const layoutProps = {
    title: 'Design Studio',
    subtitle: 'Create and manage your postcard templates.',
    tip: 'Lock designs when you want to reuse them without accidental edits.'
  };

  if (loading) {
    return (
      <PageLayout {...layoutProps}>
        <div className="designs-page">
          <div className="loading-state">
            <div className="spinner-large"></div>
            <p>Loading designs...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      {...layoutProps}
      actions={
        <button className="btn-primary" onClick={handleCreateDesign}>
          <Plus size={20} />
          New Design
        </button>
      }
    >
      <div className="designs-page">
        <div className="designs-grid">
        {designs.length === 0 ? (
          <div className="empty-state">
            <p>No designs yet. Create your first template!</p>
          </div>
        ) : (
          designs.map(design => (
            <div key={design.id} className="design-card">
              <div className="design-preview">
                {design.background_type === 'image' && design.background_image_url ? (
                  <img src={design.background_image_url} alt={design.name} />
                ) : design.background_type === 'gradient' ? (
                  <div
                    className="gradient-preview"
                    style={{
                      background: `linear-gradient(${design.background_gradient?.direction || 'to right'}, ${design.background_gradient?.from || '#fff'}, ${design.background_gradient?.to || '#fff'})`
                    }}
                  />
                ) : (
                  <div
                    className="color-preview"
                    style={{ background: design.background_color || '#fff' }}
                  />
                )}
                <div className="design-overlay">
                  <div className="design-slots-indicator">
                    {design.num_slots} slots
                  </div>
                </div>
              </div>

              <div className="design-info">
                <div className="design-header">
                  <div className="design-name">{design.name}</div>
                  {design.is_locked && (
                    <div className="locked-badge">
                      <Lock size={12} />
                    </div>
                  )}
                </div>
                <div className="design-meta">
                  {CARD_SIZES.find(s => s.value === design.card_size)?.label}
                </div>
              </div>

              <div className="design-actions">
                <button
                  className="action-btn"
                  onClick={() => handleEditDesign(design)}
                  disabled={design.is_locked}
                  title="Edit design"
                >
                  <Edit size={16} />
                </button>
                <button
                  className="action-btn"
                  onClick={() => handleDuplicateDesign(design)}
                  title="Duplicate design"
                >
                  <Copy size={16} />
                </button>
                <button
                  className="action-btn danger"
                  onClick={() => handleDeleteDesign(design.id)}
                  disabled={design.is_locked}
                  title="Delete design"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
        </div>

        {showModal && selectedDesign && (
        <DesignModal
          design={selectedDesign}
          onSave={handleSaveDesign}
          onClose={() => setShowModal(false)}
          userId={user.id}
        />
      )}
      </div>
    </PageLayout>
  );
}

// Design Modal Component
function DesignModal({ design, onSave, onClose, userId }) {
  const [formData, setFormData] = useState(design);
  const [activeTab, setActiveTab] = useState('basic');

  const cardSize = CARD_SIZES.find(s => s.value === formData.card_size);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleBackgroundUpload = async (file) => {
    const { data, error } = await storage.uploadBackground(userId, file, formData.id || 'new');
    if (error) {
      throw new Error('Failed to upload background');
    }
    setFormData({
      ...formData,
      background_type: 'image',
      background_image_url: data.url
    });
  };

  const handleAddSlot = () => {
    const newSlot = {
      id: `slot-${Date.now()}`,
      size: 'medium',
      position: `${formData.num_slots + 1}`,
      width: 200,
      height: 150,
      x: 50,
      y: 50
    };
    setFormData({
      ...formData,
      num_slots: formData.num_slots + 1,
      slot_config: [...formData.slot_config, newSlot]
    });
  };

  const handleRemoveSlot = (slotId) => {
    setFormData({
      ...formData,
      num_slots: formData.num_slots - 1,
      slot_config: formData.slot_config.filter(s => s.id !== slotId)
    });
  };

  const handleUpdateSlot = (slotId, updates) => {
    setFormData({
      ...formData,
      slot_config: formData.slot_config.map(s =>
        s.id === slotId ? { ...s, ...updates } : s
      )
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content design-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{design.id ? 'Edit Design' : 'New Design'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-tabs">
          <button
            className={`tab ${activeTab === 'basic' ? 'active' : ''}`}
            onClick={() => setActiveTab('basic')}
          >
            Basic Info
          </button>
          <button
            className={`tab ${activeTab === 'background' ? 'active' : ''}`}
            onClick={() => setActiveTab('background')}
          >
            Background
          </button>
          <button
            className={`tab ${activeTab === 'slots' ? 'active' : ''}`}
            onClick={() => setActiveTab('slots')}
          >
            Ad Slots ({formData.num_slots})
          </button>
        </div>

        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            {activeTab === 'basic' && (
              <div className="form-section">
                <div className="form-group">
                  <label>Design Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Card Size *</label>
                  <div className="card-size-options">
                    {CARD_SIZES.map(size => (
                      <button
                        key={size.value}
                        type="button"
                        className={`size-option ${formData.card_size === size.value ? 'active' : ''}`}
                        onClick={() => setFormData({ ...formData, card_size: size.value })}
                      >
                        <div className="size-label">{size.label}</div>
                        <div className="size-dimensions">{size.width} × {size.height}px</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'background' && (
              <div className="form-section">
                <div className="form-group">
                  <label>Background Type</label>
                  <div className="background-type-options">
                    <button
                      type="button"
                      className={`type-option ${formData.background_type === 'color' ? 'active' : ''}`}
                      onClick={() => setFormData({ ...formData, background_type: 'color' })}
                    >
                      Solid Color
                    </button>
                    <button
                      type="button"
                      className={`type-option ${formData.background_type === 'gradient' ? 'active' : ''}`}
                      onClick={() => setFormData({ ...formData, background_type: 'gradient' })}
                    >
                      Gradient
                    </button>
                    <button
                      type="button"
                      className={`type-option ${formData.background_type === 'image' ? 'active' : ''}`}
                      onClick={() => setFormData({ ...formData, background_type: 'image' })}
                    >
                      Image
                    </button>
                  </div>
                </div>

                {formData.background_type === 'color' && (
                  <div className="form-group">
                    <label>Background Color</label>
                    <div className="color-picker-group">
                      <input
                        type="color"
                        value={formData.background_color || '#ffffff'}
                        onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                      />
                      <input
                        type="text"
                        value={formData.background_color || '#ffffff'}
                        onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                        placeholder="#ffffff"
                      />
                    </div>
                  </div>
                )}

                {formData.background_type === 'gradient' && (
                  <>
                    <div className="form-row">
                      <div className="form-group">
                        <label>From Color</label>
                        <input
                          type="color"
                          value={formData.background_gradient?.from || '#ffffff'}
                          onChange={(e) => setFormData({
                            ...formData,
                            background_gradient: {
                              ...formData.background_gradient,
                              from: e.target.value
                            }
                          })}
                        />
                      </div>
                      <div className="form-group">
                        <label>To Color</label>
                        <input
                          type="color"
                          value={formData.background_gradient?.to || '#ffffff'}
                          onChange={(e) => setFormData({
                            ...formData,
                            background_gradient: {
                              ...formData.background_gradient,
                              to: e.target.value
                            }
                          })}
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Direction</label>
                      <select
                        value={formData.background_gradient?.direction || 'to right'}
                        onChange={(e) => setFormData({
                          ...formData,
                          background_gradient: {
                            ...formData.background_gradient,
                            direction: e.target.value
                          }
                        })}
                      >
                        <option value="to right">Left to Right</option>
                        <option value="to left">Right to Left</option>
                        <option value="to bottom">Top to Bottom</option>
                        <option value="to top">Bottom to Top</option>
                        <option value="to bottom right">Diagonal ↘</option>
                        <option value="to bottom left">Diagonal ↙</option>
                      </select>
                    </div>
                  </>
                )}

                {formData.background_type === 'image' && (
                  <div className="form-group">
                    <label>Background Image</label>
                    <p className="form-hint">
                      Upload a {cardSize?.label} image ({cardSize?.width} × {cardSize?.height}px recommended)
                    </p>
                    <ImageUploader
                      onUpload={handleBackgroundUpload}
                      currentImage={formData.background_image_url}
                      width={cardSize?.width / 2}
                      height={cardSize?.height / 2}
                      label="Upload Background"
                    />
                  </div>
                )}
              </div>
            )}

            {activeTab === 'slots' && (
              <div className="form-section">
                <div className="slots-header">
                  <p className="form-hint">
                    Configure ad slot positions and sizes. Each slot can be assigned to a client in your campaigns.
                  </p>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={handleAddSlot}
                  >
                    <Plus size={16} />
                    Add Slot
                  </button>
                </div>

                <div className="slots-list">
                  {formData.slot_config.map((slot, index) => (
                    <div key={slot.id} className="slot-config-item">
                      <div className="slot-number">#{index + 1}</div>
                      
                      <div className="slot-fields">
                        <div className="form-group">
                          <label>Size</label>
                          <select
                            value={slot.size}
                            onChange={(e) => handleUpdateSlot(slot.id, { size: e.target.value })}
                          >
                            {SLOT_SIZES.map(size => (
                              <option key={size} value={size}>{size}</option>
                            ))}
                          </select>
                        </div>

                        <div className="form-group">
                          <label>Width (px)</label>
                          <input
                            type="number"
                            value={slot.width}
                            onChange={(e) => handleUpdateSlot(slot.id, { width: parseInt(e.target.value) })}
                            min="50"
                            max={cardSize?.width}
                          />
                        </div>

                        <div className="form-group">
                          <label>Height (px)</label>
                          <input
                            type="number"
                            value={slot.height}
                            onChange={(e) => handleUpdateSlot(slot.id, { height: parseInt(e.target.value) })}
                            min="50"
                            max={cardSize?.height}
                          />
                        </div>

                        <div className="form-group">
                          <label>X Position</label>
                          <input
                            type="number"
                            value={slot.x}
                            onChange={(e) => handleUpdateSlot(slot.id, { x: parseInt(e.target.value) })}
                            min="0"
                            max={cardSize?.width}
                          />
                        </div>

                        <div className="form-group">
                          <label>Y Position</label>
                          <input
                            type="number"
                            value={slot.y}
                            onChange={(e) => handleUpdateSlot(slot.id, { y: parseInt(e.target.value) })}
                            min="0"
                            max={cardSize?.height}
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        className="remove-slot-btn"
                        onClick={() => handleRemoveSlot(slot.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="form-actions">
              <button type="submit" className="btn-primary">
                {design.id ? 'Save Changes' : 'Create Design'}
              </button>
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Helper function to generate default slot configuration
function generateDefaultSlots(count) {
  const slots = [];
  for (let i = 0; i < count; i++) {
    slots.push({
      id: `slot-${i + 1}`,
      size: i < 5 ? 'large' : i < 12 ? 'medium' : 'small',
      position: `${i + 1}`,
      width: i < 5 ? 300 : i < 12 ? 200 : 150,
      height: i < 5 ? 250 : i < 12 ? 150 : 100,
      x: 50 + (i % 3) * 250,
      y: 50 + Math.floor(i / 3) * 200
    });
  }
  return slots;
}

export default Designs;

