import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronRight, X, CheckCircle2, Circle, Filter } from 'lucide-react';
import './ContactPicker.css';

const ContactPicker = ({ 
  allContacts, 
  selectedContactIds: initialSelectedIds = [], 
  onSelectionChange,
  onClose 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [expandedNiches, setExpandedNiches] = useState(new Set());
  const [filterMode, setFilterMode] = useState('all'); // 'all', 'recent', 'ideas'
  const [selectedContactIds, setSelectedContactIds] = useState(new Set(initialSelectedIds));
  const [expandedCartCategories, setExpandedCartCategories] = useState(new Set());

  // Organize contacts by category > niche > contacts
  const organizedData = useMemo(() => {
    const categoryMap = new Map();

    allContacts.forEach(contact => {
      // Get niche info - handle both nested niche object and niche_id
      let niche;
      if (contact.niche) {
        niche = {
          id: contact.niche.id || contact.niche_id,
          name: contact.niche.name || 'Unassigned',
          category: contact.niche.category || 'Uncategorized'
        };
      } else if (contact.niche_id) {
        niche = {
          id: contact.niche_id,
          name: 'Unassigned',
          category: 'Uncategorized'
        };
      } else {
        niche = {
          id: null,
          name: 'Unassigned',
          category: 'Uncategorized'
        };
      }
      const categoryName = niche.category || 'Uncategorized';

      // Initialize category if needed
      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, {
          name: categoryName,
          niches: new Map()
        });
      }

      const category = categoryMap.get(categoryName);

      // Initialize niche if needed - use a unique key for null niches
      const nicheKey = niche.id || `unassigned-${categoryName}`;
      if (!category.niches.has(nicheKey)) {
        category.niches.set(nicheKey, {
          id: niche.id,
          name: niche.name,
          contacts: []
        });
      }

      // Add contact to niche
      category.niches.get(nicheKey).contacts.push(contact);
    });

    // Convert Maps to Arrays for easier rendering
    const categories = Array.from(categoryMap.values()).map(category => ({
      name: category.name,
      niches: Array.from(category.niches.values()).map(niche => ({
        ...niche,
        contacts: niche.contacts
      }))
    }));

    // Sort categories and niches
    categories.sort((a, b) => a.name.localeCompare(b.name));
    categories.forEach(category => {
      category.niches.sort((a, b) => a.name.localeCompare(b.name));
      category.niches.forEach(niche => {
        niche.contacts.sort((a, b) => (a.business_name || '').localeCompare(b.business_name || ''));
      });
    });

    return categories;
  }, [allContacts]);

  // Filter contacts based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) {
      return organizedData;
    }

    const searchLower = searchTerm.toLowerCase();
    const filtered = organizedData.map(category => {
      const filteredNiches = category.niches.map(niche => {
        const filteredContacts = niche.contacts.filter(contact => {
          return (
            contact.business_name?.toLowerCase().includes(searchLower) ||
            contact.email?.toLowerCase().includes(searchLower) ||
            contact.phone?.toLowerCase().includes(searchLower) ||
            contact.owner_name?.toLowerCase().includes(searchLower)
          );
        });

        if (filteredContacts.length > 0) {
          return {
            ...niche,
            contacts: filteredContacts
          };
        }
        return null;
      }).filter(Boolean);

      if (filteredNiches.length > 0) {
        return {
          ...category,
          niches: filteredNiches
        };
      }
      return null;
    }).filter(Boolean);

    return filtered;
  }, [organizedData, searchTerm]);

  // Get all contact IDs in a category
  const getCategoryContactIds = (category) => {
    const contactIds = [];
    category.niches.forEach(niche => {
      niche.contacts.forEach(contact => {
        contactIds.push(contact.id);
      });
    });
    return contactIds;
  };

  // Get all contact IDs in a niche
  const getNicheContactIds = (niche) => {
    return niche.contacts.map(contact => contact.id);
  };

  // Check if category is fully selected
  const isCategorySelected = (category) => {
    const categoryContactIds = getCategoryContactIds(category);
    if (categoryContactIds.length === 0) return false;
    return categoryContactIds.every(id => selectedContactIds.has(id));
  };

  // Check if category is partially selected
  const isCategoryPartiallySelected = (category) => {
    const categoryContactIds = getCategoryContactIds(category);
    if (categoryContactIds.length === 0) return false;
    const selectedCount = categoryContactIds.filter(id => selectedContactIds.has(id)).length;
    return selectedCount > 0 && selectedCount < categoryContactIds.length;
  };

  // Check if niche is fully selected
  const isNicheSelected = (niche) => {
    const nicheContactIds = getNicheContactIds(niche);
    if (nicheContactIds.length === 0) return false;
    return nicheContactIds.every(id => selectedContactIds.has(id));
  };

  // Check if niche is partially selected
  const isNichePartiallySelected = (niche) => {
    const nicheContactIds = getNicheContactIds(niche);
    if (nicheContactIds.length === 0) return false;
    const selectedCount = nicheContactIds.filter(id => selectedContactIds.has(id)).length;
    return selectedCount > 0 && selectedCount < nicheContactIds.length;
  };

  // Toggle category selection
  const toggleCategory = (category) => {
    const categoryContactIds = getCategoryContactIds(category);
    const isSelected = isCategorySelected(category);
    
    const newSelection = new Set(selectedContactIds);
    if (isSelected) {
      categoryContactIds.forEach(id => newSelection.delete(id));
    } else {
      categoryContactIds.forEach(id => newSelection.add(id));
    }
    
    setSelectedContactIds(newSelection);
  };

  // Toggle niche selection
  const toggleNiche = (niche) => {
    const nicheContactIds = getNicheContactIds(niche);
    const isSelected = isNicheSelected(niche);
    
    const newSelection = new Set(selectedContactIds);
    if (isSelected) {
      nicheContactIds.forEach(id => newSelection.delete(id));
    } else {
      nicheContactIds.forEach(id => newSelection.add(id));
    }
    
    setSelectedContactIds(newSelection);
  };

  // Toggle contact selection
  const toggleContact = (contactId) => {
    const newSelection = new Set(selectedContactIds);
    if (newSelection.has(contactId)) {
      newSelection.delete(contactId);
    } else {
      newSelection.add(contactId);
    }
    setSelectedContactIds(newSelection);
  };

  // Toggle category expansion
  const toggleCategoryExpansion = (categoryName) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName);
    } else {
      newExpanded.add(categoryName);
    }
    setExpandedCategories(newExpanded);
  };

  // Toggle niche expansion
  const toggleNicheExpansion = (nicheId) => {
    const newExpanded = new Set(expandedNiches);
    if (newExpanded.has(nicheId)) {
      newExpanded.delete(nicheId);
    } else {
      newExpanded.add(nicheId);
    }
    setExpandedNiches(newExpanded);
  };

  // Expand/collapse all categories
  const toggleAllCategories = () => {
    if (expandedCategories.size === filteredData.length) {
      setExpandedCategories(new Set());
    } else {
      setExpandedCategories(new Set(filteredData.map(cat => cat.name)));
    }
  };

  // Get total count of contacts
  const totalContactsCount = useMemo(() => {
    return filteredData.reduce((sum, category) => {
      return sum + category.niches.reduce((nicheSum, niche) => {
        return nicheSum + niche.contacts.length;
      }, 0);
    }, 0);
  }, [filteredData]);

  // Get selected contacts
  const selectedContacts = useMemo(() => {
    return allContacts.filter(contact => selectedContactIds.has(contact.id));
  }, [allContacts, selectedContactIds]);

  // Organize selected contacts by category
  const selectedContactsByCategory = useMemo(() => {
    const categoryMap = new Map();

    selectedContacts.forEach(contact => {
      // Get niche info
      let niche;
      if (contact.niche) {
        niche = {
          id: contact.niche.id || contact.niche_id,
          name: contact.niche.name || 'Unassigned',
          category: contact.niche.category || 'Uncategorized'
        };
      } else if (contact.niche_id) {
        niche = {
          id: contact.niche_id,
          name: 'Unassigned',
          category: 'Uncategorized'
        };
      } else {
        niche = {
          id: null,
          name: 'Unassigned',
          category: 'Uncategorized'
        };
      }
      const categoryName = niche.category || 'Uncategorized';

      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, []);
      }

      categoryMap.get(categoryName).push(contact);
    });

    // Convert to array and sort
    const categories = Array.from(categoryMap.entries()).map(([name, contacts]) => ({
      name,
      contacts: contacts.sort((a, b) => (a.business_name || '').localeCompare(b.business_name || ''))
    }));

    categories.sort((a, b) => a.name.localeCompare(b.name));

    return categories;
  }, [selectedContacts]);

  // Toggle cart category expansion
  const toggleCartCategoryExpansion = (categoryName) => {
    const newExpanded = new Set(expandedCartCategories);
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName);
    } else {
      newExpanded.add(categoryName);
    }
    setExpandedCartCategories(newExpanded);
  };

  return (
    <div className="contact-picker">
      <div className="contact-picker-body">
        {/* Main Section - Left Panel */}
        <div className="contact-picker-main-section">
          {/* Search Bar */}
          <div className="contact-picker-search-bar">
            <Search size={18} />
            <input
              type="text"
              placeholder='Try "motor vehicles"'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="contact-picker-search-input"
            />
          </div>

          {/* Filter Bar */}
          <div className="contact-picker-filter-bar">
            <Filter size={16} />
            <span>Show:</span>
            <button
              className="contact-picker-filter-mode"
              onClick={() => {
                const modes = ['all', 'recent', 'ideas'];
                const currentIndex = modes.indexOf(filterMode);
                setFilterMode(modes[(currentIndex + 1) % modes.length]);
              }}
            >
              {filterMode === 'all' ? 'All' : filterMode === 'recent' ? 'Recent' : 'Ideas'}
            </button>
          </div>

          {/* Select All Header */}
          <div className="contact-picker-select-all-header">
            <div className="contact-picker-select-all-control">
              <input
                type="checkbox"
                className="contact-picker-checkbox"
                checked={totalContactsCount > 0 && filteredData.every(cat => isCategorySelected(cat))}
                onChange={(e) => {
                  if (e.target.checked) {
                    const allIds = new Set(selectedContactIds);
                    filteredData.forEach(category => {
                      getCategoryContactIds(category).forEach(id => allIds.add(id));
                    });
                    setSelectedContactIds(allIds);
                  } else {
                    const allIds = new Set(selectedContactIds);
                    filteredData.forEach(category => {
                      getCategoryContactIds(category).forEach(id => allIds.delete(id));
                    });
                    setSelectedContactIds(allIds);
                  }
                }}
              />
              <span className="contact-picker-select-all-text">
                Select all ({totalContactsCount})
              </span>
            </div>
            <button
              className="contact-picker-expand-collapse-btn"
              onClick={toggleAllCategories}
              title={expandedCategories.size === filteredData.length ? 'Collapse all' : 'Expand all'}
            >
              {expandedCategories.size === filteredData.length ? (
                <ChevronDown size={18} />
              ) : (
                <ChevronRight size={18} />
              )}
            </button>
          </div>

          {/* Categories List */}
          <div className="contact-picker-categories-list">
            {filteredData.length === 0 ? (
              <div className="contact-picker-empty">
                <p>No contacts found</p>
              </div>
            ) : (
              filteredData.map((category) => {
                const isCategoryExpanded = expandedCategories.has(category.name);
                const categorySelected = isCategorySelected(category);
                const categoryPartial = isCategoryPartiallySelected(category);

                return (
                  <div key={category.name} className="contact-picker-category">
                    {/* Category Header */}
                    <div className="contact-picker-category-header">
                      <div className="contact-picker-category-controls">
                        <input
                          type="checkbox"
                          className="contact-picker-checkbox"
                          checked={categorySelected}
                          ref={(el) => {
                            if (el) el.indeterminate = categoryPartial;
                          }}
                          onChange={() => toggleCategory(category)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <button
                          className="contact-picker-expand-btn"
                          onClick={() => toggleCategoryExpansion(category.name)}
                        >
                          {isCategoryExpanded ? (
                            <ChevronDown size={16} />
                          ) : (
                            <ChevronRight size={16} />
                          )}
                        </button>
                        <span className="contact-picker-category-name">{category.name}</span>
                      </div>
                    </div>

                    {/* Niches List (when expanded) */}
                    {isCategoryExpanded && (
                      <div className="contact-picker-niches-list">
                        {category.niches.map((niche) => {
                          const nicheKey = niche.id || `unassigned-${category.name}`;
                          const isNicheExpanded = expandedNiches.has(nicheKey);
                          const nicheSelected = isNicheSelected(niche);
                          const nichePartial = isNichePartiallySelected(niche);
                          
                          // Use nicheKey for the key prop
                          const displayNicheKey = niche.id || nicheKey;

                          return (
                            <div key={displayNicheKey} className="contact-picker-niche">
                              {/* Niche Header */}
                              <div className="contact-picker-niche-header">
                                <div className="contact-picker-niche-controls">
                                  <input
                                    type="checkbox"
                                    className="contact-picker-checkbox"
                                    checked={nicheSelected}
                                    ref={(el) => {
                                      if (el) el.indeterminate = nichePartial;
                                    }}
                                    onChange={() => toggleNiche(niche)}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <button
                                    className="contact-picker-expand-btn"
                                    onClick={() => toggleNicheExpansion(nicheKey)}
                                  >
                                    {isNicheExpanded ? (
                                      <ChevronDown size={14} />
                                    ) : (
                                      <ChevronRight size={14} />
                                    )}
                                  </button>
                                  <span className="contact-picker-niche-name">{niche.name}</span>
                                </div>
                              </div>

                              {/* Contacts List (when expanded) */}
                              {isNicheExpanded && (
                                <div className="contact-picker-contacts-list">
                                  {niche.contacts.map((contact) => (
                                    <div
                                      key={contact.id}
                                      className="contact-picker-contact-item"
                                      onClick={() => toggleContact(contact.id)}
                                    >
                                      <input
                                        type="checkbox"
                                        className="contact-picker-checkbox"
                                        checked={selectedContactIds.has(contact.id)}
                                        onChange={() => toggleContact(contact.id)}
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                      <div className="contact-picker-contact-info">
                                        <div className="contact-picker-contact-name">
                                          {contact.business_name || 'Unnamed Business'}
                                        </div>
                                        {contact.email && (
                                          <div className="contact-picker-contact-detail">
                                            {contact.email}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Shopping Cart Section - Right Panel */}
        <div className="contact-picker-shopping-cart">
          <div className="contact-picker-shopping-cart-header">
            <div className="contact-picker-shopping-cart-title">
              {selectedContacts.length === 0 ? 'None selected' : `${selectedContacts.length} selected`}
            </div>
            {selectedContacts.length > 0 && (
              <button
                className="contact-picker-confirm-btn"
                onClick={() => {
                  if (onSelectionChange && selectedContactIds.size > 0) {
                    onSelectionChange(Array.from(selectedContactIds));
                  }
                }}
              >
                Add {selectedContacts.length} Contact{selectedContacts.length !== 1 ? 's' : ''}
              </button>
            )}
          </div>
          <div className="contact-picker-shopping-cart-body">
            {selectedContacts.length === 0 ? (
              <div className="contact-picker-shopping-cart-placeholder">
                Select one or more contacts to add to the campaign.
              </div>
            ) : (
              <div className="contact-picker-selected-contacts">
                {selectedContactsByCategory.map((category) => {
                  const isCategoryExpanded = expandedCartCategories.has(category.name);
                  
                  return (
                    <div key={category.name} className="contact-picker-cart-category">
                      {/* Category Header */}
                      <div 
                        className="contact-picker-cart-category-header"
                        onClick={() => toggleCartCategoryExpansion(category.name)}
                      >
                        <button className="contact-picker-cart-expand-btn">
                          {isCategoryExpanded ? (
                            <ChevronDown size={14} />
                          ) : (
                            <ChevronRight size={14} />
                          )}
                        </button>
                        <span className="contact-picker-cart-category-name">
                          {category.name}
                        </span>
                        <span className="contact-picker-cart-category-count">
                          ({category.contacts.length})
                        </span>
                      </div>

                      {/* Category Contacts (when expanded) */}
                      {isCategoryExpanded && (
                        <div className="contact-picker-cart-category-contacts">
                          {category.contacts.map((contact) => (
                            <div key={contact.id} className="contact-picker-selected-contact">
                              <div className="contact-picker-selected-contact-info">
                                <div className="contact-picker-selected-contact-name">
                                  {contact.business_name || 'Unnamed Business'}
                                </div>
                                {contact.niche && (
                                  <div className="contact-picker-selected-contact-niche">
                                    {contact.niche.name}
                                  </div>
                                )}
                              </div>
                              <button
                                className="contact-picker-remove-btn"
                                onClick={() => toggleContact(contact.id)}
                                title="Remove"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPicker;

