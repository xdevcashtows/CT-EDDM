import React, { useMemo, useState, useEffect } from 'react';
import { Edit, Trash2 } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import { designs as designsAPI } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import './Designs.css';

const GRID_COLUMNS = 4;
const GRID_ROWS_PER_SECTION = 4;
const GRID_SECTION_COUNT = 2;
const CELLS_PER_SECTION = GRID_COLUMNS * GRID_ROWS_PER_SECTION;
const GRID_CELL_COUNT = CELLS_PER_SECTION * GRID_SECTION_COUNT;

const DEFAULT_AD_SLOTS = [
  { id: 'slots-1', label: '1', price: 300, color: '#dbeafe', variant: 'slots-1', widthCells: 1, heightCells: 1 },
  { id: 'slots-2', label: '2', price: 500, color: '#dcfce7', variant: 'slots-2', widthCells: 1, heightCells: 2 },
  { id: 'slots-4', label: '4', price: 1000, color: '#fef9c3', variant: 'slots-4', widthCells: 2, heightCells: 2 },
  { id: 'slots-8', label: '8', price: 2000, color: '#fee2e2', variant: 'slots-8', widthCells: 4, heightCells: 2 },
  { id: 'slots-12', label: '12', price: 3000, color: '#e0f2fe', variant: 'slots-12', widthCells: 4, heightCells: 3 },
  { id: 'slots-16', label: '16', price: 4000, color: '#ede9fe', variant: 'slots-16', widthCells: 4, heightCells: 4 }
];

const createInitialGridCells = () =>
  Array.from({ length: GRID_CELL_COUNT }, (_, index) => ({
    id: `canvas-cell-${index + 1}`,
    placementId: null
  }));

function Designs() {
  const { user } = useAuth();
  const [gridCells, setGridCells] = useState(() => createInitialGridCells());
  const [adSlots, setAdSlots] = useState(DEFAULT_AD_SLOTS);
  const [placements, setPlacements] = useState([]);
  const [templateName, setTemplateName] = useState('Favorite');
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [editingSlotId, setEditingSlotId] = useState(null);
  const [priceInputs, setPriceInputs] = useState({});
  const [draggedSlotId, setDraggedSlotId] = useState(null);
  const [highlightedCellId, setHighlightedCellId] = useState(null);
  const [templateTab, setTemplateTab] = useState('canvas');
  const [activePlacementId, setActivePlacementId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [templateSide, setTemplateSide] = useState('front');
  const [editingTemplateId, setEditingTemplateId] = useState(null);

  const slotMap = useMemo(() => {
    return adSlots.reduce((acc, slot) => {
      acc[slot.id] = slot;
      return acc;
    }, {});
  }, [adSlots]);

  const placementMap = useMemo(() => {
    return placements.reduce((acc, placement) => {
      acc[placement.id] = placement;
      return acc;
    }, {});
  }, [placements]);

  const activePlacement = placements.find(p => p.id === activePlacementId);
  const remainingCells = activePlacement
    ? activePlacement.totalCells - activePlacement.cellIds.length
    : 0;

  // Load saved templates from the database
  useEffect(() => {
    if (user) {
      loadTemplates();
    }
  }, [user]);

  const loadTemplates = async () => {
    setLoading(true);
    const { data, error } = await designsAPI.getAll(user.id);
    if (!error && data) {
      setSavedTemplates(data);
      // Auto-increment template name based on existing templates
      const templateNumbers = data
        .map(t => {
          const match = t.name.match(/^Template (\d+)$/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter(n => n > 0);
      const nextNumber = templateNumbers.length > 0 ? Math.max(...templateNumbers) + 1 : 1;
      setTemplateName(`Template ${nextNumber}`);
    }
    setLoading(false);
  };

  // Helper function to check if a cell is adjacent to any cell in the placement
  const isCellAdjacentToPlacement = (cellId, placement) => {
    if (!placement || placement.cellIds.length === 0) {
      return false;
    }

    const cellIndex = gridCells.findIndex(c => c.id === cellId);
    if (cellIndex === -1) {
      return false;
    }

    // Determine which section and position within section
    const sectionIndex = Math.floor(cellIndex / CELLS_PER_SECTION);
    const positionInSection = cellIndex % CELLS_PER_SECTION;
    const rowInSection = Math.floor(positionInSection / GRID_COLUMNS);
    const colInSection = positionInSection % GRID_COLUMNS;

    // Check each cell in the placement to see if any are adjacent
    for (const placedCellId of placement.cellIds) {
      const placedIndex = gridCells.findIndex(c => c.id === placedCellId);
      if (placedIndex === -1) continue;

      const placedSectionIndex = Math.floor(placedIndex / CELLS_PER_SECTION);
      const placedPositionInSection = placedIndex % CELLS_PER_SECTION;
      const placedRowInSection = Math.floor(placedPositionInSection / GRID_COLUMNS);
      const placedColInSection = placedPositionInSection % GRID_COLUMNS;

      // Only check adjacency within the same section
      if (sectionIndex !== placedSectionIndex) {
        continue;
      }

      // Check if adjacent (horizontally or vertically)
      const rowDiff = Math.abs(rowInSection - placedRowInSection);
      const colDiff = Math.abs(colInSection - placedColInSection);

      // Adjacent if exactly one cell away in one direction and same in the other
      if ((rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1)) {
        return true;
      }
    }

    return false;
  };

const assignCellsToSlot = (slotId, targetIndex = null) => {
  const slot = slotMap[slotId];
  if (!slot) {
    return false;
  }
  const totalCells = (slot.widthCells || 1) * (slot.heightCells || 1);

  const findEmptyIndex = () => {
    if (targetIndex !== null && targetIndex !== undefined) {
      if (targetIndex < 0 || targetIndex >= gridCells.length) {
        return -1;
      }
      return gridCells[targetIndex].placementId ? -1 : targetIndex;
    }
    return gridCells.findIndex(cell => !cell.placementId);
  };

  const index = findEmptyIndex();
  if (index === -1) {
    return false;
  }

  const placementId = `placement-${Date.now()}-${slotId}`;
  const baseCellId = gridCells[index].id;
  const placement = { id: placementId, slotId, cellIds: [baseCellId], totalCells };

  setPlacements(prev => [...prev, placement]);
  setGridCells(prev =>
    prev.map(cell =>
      cell.id === baseCellId ? { ...cell, placementId } : cell
    )
  );
  setHighlightedCellId(null);
  setDraggedSlotId(null);
  if (totalCells > 1) {
    setActivePlacementId(placementId);
  } else {
    setActivePlacementId(null);
  }
  return true;
  };

const addCellToPlacement = (placementId, cellId) => {
  const placement = placements.find(p => p.id === placementId);
  if (!placement || placement.cellIds.includes(cellId)) {
    return false;
  }
  if (placement.cellIds.length >= placement.totalCells) {
    return false;
  }
  
  // Check adjacency - cell must be adjacent to at least one existing cell in the placement
  if (!isCellAdjacentToPlacement(cellId, placement)) {
    return false;
  }
  
  setPlacements(prev =>
    prev.map(p =>
      p.id === placementId ? { ...p, cellIds: [...p.cellIds, cellId] } : p
    )
  );
  setGridCells(prev =>
    prev.map(cell =>
      cell.id === cellId ? { ...cell, placementId } : cell
    )
  );
  if (placement.cellIds.length + 1 >= placement.totalCells) {
    setActivePlacementId(null);
    }
  return true;
  };

  const assignedCount = gridCells.filter(cell => cell.placementId).length;
  const canSaveTemplate = assignedCount > 0 && templateName.trim().length > 0;

  const handleDragStart = (event, slotId) => {
    event.dataTransfer.setData('text/plain', slotId);
    event.dataTransfer.effectAllowed = 'copy';
    setDraggedSlotId(slotId);
  };

  const handleDragEnd = () => {
    setDraggedSlotId(null);
    setHighlightedCellId(null);
  };

  const handleDropOnCell = (event, cellId) => {
    event.preventDefault();
    event.stopPropagation();
    const slotId = event.dataTransfer.getData('text/plain');
    if (!slotId) {
      return;
    }
    const targetIndex = gridCells.findIndex(cell => cell.id === cellId);
    if (targetIndex === -1) {
      return;
    }
    const didPlace = assignCellsToSlot(slotId, targetIndex);
    if (!didPlace) {
      setDraggedSlotId(null);
      setHighlightedCellId(null);
    }
  };

  const handleDragOverCell = (event) => {
    event.preventDefault();
  };

  const handleCanvasCellClick = (cell) => {
    if (cell.placementId) {
      const placement = placements.find(p => p.id === cell.placementId);
      if (placement && placement.totalCells > placement.cellIds.length) {
        setActivePlacementId(placement.id);
      }
      return;
    }
    if (activePlacementId && remainingCells > 0) {
      const added = addCellToPlacement(activePlacementId, cell.id);
      if (!added) {
        setHighlightedCellId(cell.id);
      }
    }
  };

  const handleCellRemoveAssignment = (cellId) => {
    const cell = gridCells.find(c => c.id === cellId);
    if (!cell?.placementId) {
      return;
    }
    const placementId = cell.placementId;
    setPlacements(prev => prev.filter(p => p.id !== placementId));
    setGridCells(prev =>
      prev.map(gridCell =>
        gridCell.placementId === placementId ? { ...gridCell, placementId: null } : gridCell
      )
        );
    if (activePlacementId === placementId) {
      setActivePlacementId(null);
      }
  };

  const handleClearCanvas = () => {
    setGridCells(createInitialGridCells());
    setPlacements([]);
    setHighlightedCellId(null);
    setDraggedSlotId(null);
    setEditingTemplateId(null);
    setActivePlacementId(null);
    setTemplateSide('front');
    // Auto-increment template name
    const templateNumbers = savedTemplates
      .map(t => {
        const match = t.name.match(/^Template (\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(n => n > 0);
    const nextNumber = templateNumbers.length > 0 ? Math.max(...templateNumbers) + 1 : 1;
    setTemplateName(`Template ${nextNumber}`);
    setTemplateTab('canvas');
  };

  const handleSaveTemplate = async () => {
    if (!canSaveTemplate || !user) {
      return;
    }

    // Convert placements to slot_config format for database
    const slotConfig = placements.map((placement, index) => {
      // Find the top-left cell of this placement to determine x, y position
      const cellIndices = placement.cellIds.map(cellId => 
        gridCells.findIndex(c => c.id === cellId)
      ).sort((a, b) => a - b);
      
      const firstCellIndex = cellIndices[0];
      const sectionIndex = Math.floor(firstCellIndex / CELLS_PER_SECTION);
      const positionInSection = firstCellIndex % CELLS_PER_SECTION;
      const rowInSection = Math.floor(positionInSection / GRID_COLUMNS);
      const colInSection = positionInSection % GRID_COLUMNS;
      
      const slot = slotMap[placement.slotId];
      
      // Determine size category based on total cells
      let size = 'small';
      if (placement.totalCells >= 8) size = 'large';
      else if (placement.totalCells >= 4) size = 'medium';

      return {
        position: `${index + 1}`,
        size: size,
        width: slot.widthCells,
        height: slot.heightCells,
        x: colInSection,
        y: sectionIndex * GRID_ROWS_PER_SECTION + rowInSection
      };
    });

    const designData = {
      user_id: user.id,
      name: templateName.trim(),
      card_size: '9x12',
      num_slots: assignedCount,
      slot_config: slotConfig,
      template_side: templateSide,
      is_locked: false
    };

    let result;
    if (editingTemplateId) {
      // Update existing template
      result = await designsAPI.update(editingTemplateId, designData);
    } else {
      // Create new template
      result = await designsAPI.create(designData);
    }
    
    if (result.error) {
      alert(`Failed to ${editingTemplateId ? 'update' : 'save'} template`);
      console.error('Error saving template:', result.error);
      return;
    }

    if (result.data) {
      await loadTemplates();
      handleClearCanvas();
      setEditingTemplateId(null);
      setTemplateTab('saved');
    }
  };

  const handleEditTemplate = (template) => {
    // Load template data into the canvas for editing
    setEditingTemplateId(template.id);
    setTemplateName(template.name);
    setTemplateSide(template.template_side || 'front');
    
    // Convert slot_config back to placements and gridCells
    const slotConfig = template.slot_config || [];
    const newPlacements = [];
    const newGridCells = createInitialGridCells();
    
    slotConfig.forEach((slotConfigItem, index) => {
      // Find matching slot from adSlots based on width/height
      const matchingSlot = adSlots.find(s => 
        s.widthCells === slotConfigItem.width && 
        s.heightCells === slotConfigItem.height
      );
      
      if (!matchingSlot) return;
      
      const placementId = `placement-${Date.now()}-${index}`;
      const cellIds = [];
      
      // Calculate which cells this slot occupies
      for (let row = 0; row < slotConfigItem.height; row++) {
        for (let col = 0; col < slotConfigItem.width; col++) {
          const cellRow = slotConfigItem.y + row;
          const cellCol = slotConfigItem.x + col;
          const cellIndex = cellRow * GRID_COLUMNS + cellCol;
          
          if (cellIndex < newGridCells.length) {
            const cellId = newGridCells[cellIndex].id;
            cellIds.push(cellId);
            newGridCells[cellIndex].placementId = placementId;
          }
        }
      }
      
      newPlacements.push({
        id: placementId,
        slotId: matchingSlot.id,
        totalCells: slotConfigItem.width * slotConfigItem.height,
        cellIds: cellIds
      });
    });
    
    setGridCells(newGridCells);
    setPlacements(newPlacements);
    setTemplateTab('canvas');
  };

  const handleDeleteTemplate = async (templateId, templateName) => {
    if (window.confirm(`Are you sure you want to delete "${templateName}"? This action cannot be undone.`)) {
      const { error } = await designsAPI.delete(templateId);
      
      if (error) {
        alert('Failed to delete template');
        console.error('Error deleting template:', error);
        return;
      }
      
      await loadTemplates();
    }
  };

  const startEditingPrice = (slotId) => {
    setEditingSlotId(slotId);
    setPriceInputs(prev => ({
      ...prev,
      [slotId]: slotMap[slotId]?.price?.toString() ?? ''
    }));
  };

  const handlePriceInputChange = (slotId, value) => {
    setPriceInputs(prev => ({ ...prev, [slotId]: value }));
  };

  const handlePriceInputKeyDown = (event, slotId) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handlePriceSave(slotId);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      handlePriceCancel();
    }
  };

  const handlePriceSave = (slotId) => {
    const rawValue = priceInputs[slotId];
    const parsed = Number.parseInt(rawValue, 10);
    if (Number.isNaN(parsed) || parsed < 0) {
      return;
    }
    setAdSlots(prev =>
      prev.map(slot =>
        slot.id === slotId ? { ...slot, price: parsed } : slot
      )
    );
    setEditingSlotId(null);
  };

  const handlePriceCancel = () => {
    setEditingSlotId(null);
  };

  const formatDateLabel = (value) => {
    try {
      return new Date(value).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch {
      return '';
  }
  };

  return (
    <PageLayout
      title="Build Custom Template"
      subtitle="Create a 9x12 postcard template with ad slots."
      tip="Drag from the slot list, tweak the price, name it, and save for future campaigns."
      className="page-shell--fullwidth"
    >
      <div className="design-builder">
        <section className="ad-slot-panel">
          <header>
            <h2>Ad Slot Options</h2>
            <p>Drag a slot into the canvas or tap the tile to place it in the next open frame.</p>
          </header>
          <div className="slot-options-list">
            {adSlots.map(slot => (
              <div
                key={slot.id}
                className={`slot-option slot-option--${slot.variant} ${
                  draggedSlotId === slot.id ? 'slot-option--dragging' : ''
                }`}
                style={{ background: slot.color ?? '#ffffff' }}
                draggable
                role="button"
                tabIndex={0}
                onDragStart={(event) => handleDragStart(event, slot.id)}
                onDragEnd={handleDragEnd}
              >
                <div className="slot-option-main">
                  <div className="slot-option-left">
                    <div className="slot-plus">+</div>
                    <p className="slot-option-label">{slot.label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="template-panel">
          <div className="template-header">
            <div className="template-header-title">
              <h2>Template Canvas (9x12)</h2>
              <p>Drop ad slots to capture how the postcard will look when it goes live.</p>
            </div>
            <div className="template-header-right">
              <label className="template-name-field">
                <span style={{ fontSize: '13px', color: '#475569', marginBottom: '4px' }}>Template Name</span>
                <input
                  type="text"
                  placeholder="Favorite"
                  aria-label="Template name"
                  value={templateName}
                  onChange={(event) => setTemplateName(event.target.value)}
                />
              </label>
              <label className="template-name-field">
                <span style={{ fontSize: '13px', color: '#475569', marginBottom: '4px' }}>Template Side</span>
                <select
                  value={templateSide}
                  onChange={(e) => setTemplateSide(e.target.value)}
                  style={{ 
                    width: '140px',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px'
                  }}
                >
                  <option value="front">Front</option>
                  <option value="back">Back</option>
                  <option value="both">Both</option>
                </select>
              </label>
              <div className="template-tabs">
                <button
                  type="button"
                  className={`template-tab-button ${templateTab === 'canvas' ? 'active' : ''}`}
                  onClick={() => setTemplateTab('canvas')}
                >
                  Canvas
                </button>
                <button
                  type="button"
                  className={`template-tab-button ${templateTab === 'saved' ? 'active' : ''}`}
                  onClick={() => setTemplateTab('saved')}
                >
                  Saved Templates
                </button>
              </div>
            </div>
          </div>

          {templateTab === 'canvas' && (
            <>
              <div className="canvas-container">
                <div className="canvas-sections">
                  {Array.from({ length: GRID_SECTION_COUNT }).map((_, sectionIndex) => {
                    const sectionStart = sectionIndex * CELLS_PER_SECTION;
                    const sectionCells = gridCells.slice(
                      sectionStart,
                      sectionStart + CELLS_PER_SECTION
                    );
                    return (
                      <div key={`section-${sectionIndex}`} className="canvas-section">
                        <div className="canvas-grid">
                          {sectionCells.map(cell => {
                            const placement = placementMap[cell.placementId];
                            const slot = placement ? slotMap[placement.slotId] : null;
                            const isPrimary = placement?.cellIds?.[0] === cell.id;
                            
                            // Check if this cell is adjacent to the active placement
                            const isAdjacent = activePlacement && !slot 
                              ? isCellAdjacentToPlacement(cell.id, activePlacement)
                              : false;
                            
                            // Cell is targetable only if there's an active placement with remaining cells
                            // AND the cell is adjacent to existing placement cells
                            const isTargetable = !slot && activePlacement && remainingCells > 0 && isAdjacent;
                            
                            return (
                              <div
                                key={cell.id}
                                className={`canvas-cell ${slot ? 'canvas-cell--filled' : ''} ${
                                  highlightedCellId === cell.id ? 'canvas-cell--highlighted' : ''
                                } ${
                                  isTargetable ? 'canvas-cell--targetable' : ''
                                }`}
                                onClick={() => handleCanvasCellClick(cell)}
                                onDragOver={handleDragOverCell}
                                onDragEnter={() => setHighlightedCellId(cell.id)}
                                onDragLeave={() => setHighlightedCellId(null)}
                                onDrop={(event) => handleDropOnCell(event, cell.id)}
                              >
                                {!slot && <span className="canvas-cell-hint">Drop here</span>}
                                {slot && (
                                  <div className={`canvas-slot ${isPrimary ? 'canvas-slot--primary' : 'canvas-slot--secondary'}`}>
                                    {isPrimary ? (
                                      <div
                                        className="canvas-slot-inner"
                                        style={{ background: slot.color ?? '#f8fafc' }}
                                      >
                                        <div className="slot-option-left">
                                          <div className="slot-plus">+</div>
                                          <p className="slot-option-label">{slot.label}</p>
                                        </div>
                                        <button
                                          type="button"
                                          className="slot-option-price-edit-btn canvas-slot-delete"
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            handleCellRemoveAssignment(cell.id);
                                          }}
                                          aria-label={`Remove ${slot.label}`}
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    ) : (
                                      <div
                                        className="canvas-slot-inner"
                                        style={{ background: slot.color ?? '#f8fafc' }}
                                      >
                                        <span className="canvas-slot-secondary-label">
                                          Continues
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {activePlacement && remainingCells > 0 && (
                <p className="canvas-helper-text">
                  Select {remainingCells} more cell{remainingCells === 1 ? '' : 's'} for slot {slotMap[activePlacement.slotId]?.label}.
                </p>
              )}

              <div className="template-footer">
                <p className="template-footer-left">
                  {editingTemplateId && <span style={{ color: '#3b82f6', marginRight: '12px', fontWeight: '600' }}>✏️ Editing</span>}
                  {assignedCount}/{gridCells.length} slots placed
                </p>
                <p className="template-footer-center">Use the canvas to model what the finished card will look like.</p>
                <div className="template-footer-actions">
                  {editingTemplateId && (
                    <button type="button" className="btn-outline" onClick={handleClearCanvas}>
                      Cancel
                    </button>
                  )}
                  <button 
                    type="button" 
                    className="btn-outline" 
                    onClick={handleClearCanvas}
                    style={editingTemplateId ? { display: 'none' } : {}}
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleSaveTemplate}
                    disabled={!canSaveTemplate}
                  >
                    {editingTemplateId ? 'Update Template' : 'Save Template'}
                  </button>
                </div>
              </div>
            </>
          )}

          {templateTab === 'saved' && (
            <div className="saved-templates">
              <div className="saved-templates-header">
                <h3>Saved Templates</h3>
                <p>The templates you save will appear here for future campaigns.</p>
              </div>
              {savedTemplates.length === 0 ? (
                <div className="saved-empty">
                  <p>No templates saved yet.</p>
                </div>
              ) : (
                <div className="saved-list">
                  {savedTemplates.map(template => {
                    const slotConfig = template.slot_config || [];
                    
                    return (
                      <div key={template.id} className="saved-template-card">
                        <div className="saved-template-preview">
                          <div className="saved-template-grid">
                            {Array.from({ length: 32 }).map((_, idx) => {
                              const gridRow = Math.floor(idx / 4);
                              const gridCol = idx % 4;
                              const isFilled = slotConfig.some(slot => {
                                return (
                                  gridCol >= slot.x &&
                                  gridCol < slot.x + slot.width &&
                                  gridRow >= slot.y &&
                                  gridRow < slot.y + slot.height
                                );
                              });
                              return (
                                <div
                                  key={idx}
                                  className={`saved-template-cell ${isFilled ? 'saved-template-cell--filled' : ''}`}
                                  style={
                                    isFilled
                                      ? {
                                          background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                                          borderColor: '#93c5fd'
                                        }
                                      : {}
                                  }
                                />
                              );
                            })}
                          </div>
                        </div>
                        <div className="saved-template-info">
                          <strong>{template.name}</strong>
                          <p>{template.num_slots} slots · {template.template_side || 'both'} · {formatDateLabel(template.created_at)}</p>
                        </div>
                        <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            className="saved-template-delete"
                            style={{ background: '#dbeafe', color: '#1e40af', position: 'static' }}
                            onClick={() => handleEditTemplate(template)}
                            aria-label={`Edit ${template.name}`}
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            type="button"
                            className="saved-template-delete"
                            style={{ position: 'static' }}
                            onClick={() => handleDeleteTemplate(template.id, template.name)}
                            aria-label={`Delete ${template.name}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
            </div>
          )}
        </section>
      </div>
    </PageLayout>
  );
}

export default Designs;

