import React, { useMemo, useState } from 'react';
import { Edit, Trash2 } from 'lucide-react';
import PageLayout from '../components/PageLayout';
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
    setTemplateName('Favorite');
    setTemplateTab('canvas');
  };

  const handleSaveTemplate = () => {
    if (!canSaveTemplate) {
      return;
    }
    const nextTemplate = {
      id: `template-${Date.now()}`,
      name: templateName.trim(),
      slotCount: assignedCount,
      savedAt: new Date().toISOString(),
      layout: {
        gridCells: gridCells.map(cell => ({ ...cell })),
        placements: placements.map(placement => ({ ...placement }))
      }
    };
    setSavedTemplates(prev => [nextTemplate, ...prev]);
    setTemplateName('Favorite');
    setActivePlacementId(null);
    setTemplateTab('canvas');
  };

  const handleDeleteTemplate = (templateId) => {
    setSavedTemplates(prev => prev.filter(template => template.id !== templateId));
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
                  <div className="slot-option-price-group">
                    {editingSlotId === slot.id ? (
                      <input
                        type="number"
                        min="0"
                        className="slot-option-price-input"
                        autoFocus
                        value={priceInputs[slot.id] ?? slot.price}
                        onChange={(event) => handlePriceInputChange(slot.id, event.target.value)}
                        onKeyDown={(event) => handlePriceInputKeyDown(event, slot.id)}
                        onBlur={() => handlePriceSave(slot.id)}
                      />
                    ) : (
                      <span className="slot-option-price">
                        ${slot.price.toLocaleString()}
                      </span>
                    )}
                    <button
                      type="button"
                      className="slot-option-price-edit-btn"
                      onClick={(event) => {
                        event.stopPropagation();
                        startEditingPrice(slot.id);
                      }}
                      aria-label={`Edit price for ${slot.label}`}
                    >
                      <Edit size={16} />
                    </button>
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
            <label className="template-name-field template-name-field--center">
              <input
                type="text"
                placeholder="Favorite"
                aria-label="Template name"
                value={templateName}
                onChange={(event) => setTemplateName(event.target.value)}
              />
            </label>
            <div className="template-header-actions">
              <button type="button" className="btn-outline" onClick={handleClearCanvas}>
                Clear
                            </button>
                            <button
                              type="button"
                className="btn-primary"
                onClick={handleSaveTemplate}
                disabled={!canSaveTemplate}
                            >
                Save Template
                            </button>
            </div>
          </div>

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
                            return (
                              <div
                                key={cell.id}
                                className={`canvas-cell ${slot ? 'canvas-cell--filled' : ''} ${
                                  highlightedCellId === cell.id ? 'canvas-cell--highlighted' : ''
                                } ${
                                  !slot && activePlacement && remainingCells > 0 ? 'canvas-cell--targetable' : ''
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
                                          <div className="slot-option-title">
                                            <p className="slot-option-label">{slot.label}</p>
                                            <span className="slot-option-price">
                                              ${slot.price.toLocaleString()}
                                            </span>
                                          </div>
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
                                      <span className="canvas-slot-secondary-label">
                                        Continues
                                      </span>
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

              <div className="template-stats">
                <p>{assignedCount}/{gridCells.length} slots placed</p>
                <p>Use the canvas to model what the finished card will look like.</p>
                {activePlacement && remainingCells > 0 && (
                  <p className="canvas-helper-text">
                    Select {remainingCells} more cell{remainingCells === 1 ? '' : 's'} for slot {slotMap[activePlacement.slotId]?.label}.
                  </p>
                )}
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
                  {savedTemplates.map(template => (
                    <div key={template.id} className="saved-template-card">
                      <div>
                        <strong>{template.name}</strong>
                        <p>{template.slotCount} slots · {formatDateLabel(template.savedAt)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteTemplate(template.id)}
                        aria-label={`Delete ${template.name}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
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

