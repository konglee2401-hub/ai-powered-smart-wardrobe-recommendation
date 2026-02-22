/**
 * Gallery Picker Component
 * Reusable modal dialog for selecting media from gallery in upload workflows
 * Integrates with image/video upload components throughout the app
 */

import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, Grid3x3, List, Search, Filter } from 'lucide-react';

const GalleryPicker = ({ 
  isOpen, 
  onClose, 
  onSelect, 
  multiSelect = false,
  mediaType = 'all', // 'all', 'image', 'video'
  contentType = 'all', // 'all', 'generated', 'uploaded', 'drive'
  title = 'Select from Gallery'
}) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState(multiSelect ? [] : null);
  const [viewMode, setViewMode] = useState('grid');
  const [filters, setFilters] = useState({
    contentType: contentType,
    search: '',
    sortBy: 'newest'
  });

  // Load gallery items based on type
  useEffect(() => {
    if (isOpen) {
      loadGalleryItems();
    }
  }, [isOpen, mediaType, contentType]);

  const loadGalleryItems = async () => {
    setLoading(true);
    try {
      // Mock data - replace with actual API call
      const mockItems = generateMockItems();
      setItems(mockItems);
    } catch (error) {
      console.error('Failed to load gallery items:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMockItems = () => {
    const contentTypes = ['generated', 'uploaded', 'drive'];
    const types = ['image', 'video'];
    
    return Array.from({ length: 25 }, (_, i) => ({
      id: `item-${i + 1}`,
      name: `Media ${i + 1}`,
      url: mediaType === 'video' 
        ? `https://via.placeholder.com/300x300?text=Video+${i + 1}`
        : `https://picsum.photos/300/300?random=${i + 200}`,
      thumbnail: `https://picsum.photos/150/150?random=${i + 200}`,
      type: mediaType === 'all' ? types[i % types.length] : mediaType,
      contentType: contentTypes[i % contentTypes.length],
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      size: Math.floor(Math.random() * 5000000) + 100000,
    }));
  };

  const filteredItems = items.filter(item => {
    if (filters.contentType !== 'all' && item.contentType !== filters.contentType) return false;
    if (filters.search && !item.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    if (filters.sortBy === 'newest') return b.createdAt - a.createdAt;
    if (filters.sortBy === 'oldest') return a.createdAt - b.createdAt;
    if (filters.sortBy === 'name') return a.name.localeCompare(b.name);
    return 0;
  });

  const handleItemSelect = (item) => {
    if (multiSelect) {
      setSelectedItems(prev => {
        const isSelected = prev.some(s => s.id === item.id);
        return isSelected 
          ? prev.filter(s => s.id !== item.id)
          : [...prev, item];
      });
    } else {
      setSelectedItems(item);
    }
  };

  const handleConfirm = () => {
    if (multiSelect) {
      onSelect(selectedItems);
    } else {
      if (selectedItems) onSelect(selectedItems);
    }
    onClose();
  };

  const isSelected = (item) => {
    if (multiSelect) {
      return selectedItems.some(s => s.id === item.id);
    }
    return selectedItems?.id === item.id;
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        background: '#0f172a',
        borderRadius: '12px',
        border: '1px solid #334155',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        width: '90vw',
        maxWidth: '900px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.5rem',
          borderBottom: '1px solid #334155',
          background: '#1e293b'
        }}>
          <div>
            <h2 style={{ 
              margin: '0', 
              color: '#f1f5f9',
              fontSize: '1.3rem',
              fontWeight: '600'
            }}>
              {title}
            </h2>
            <p style={{ 
              margin: '0.25rem 0 0 0', 
              color: '#cbd5e1',
              fontSize: '0.9rem'
            }}>
              {multiSelect ? `${selectedItems.length} selected` : 'Select one item'}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#cbd5e1',
              cursor: 'pointer',
              fontSize: '1.5rem',
              padding: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => {
              e.target.style.color = '#f1f5f9';
              e.target.style.background = '#334155';
              e.target.style.borderRadius = '6px';
            }}
            onMouseLeave={(e) => {
              e.target.style.color = '#cbd5e1';
              e.target.style.background = 'none';
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Filters & Controls */}
        <div style={{
          padding: '1rem 1.5rem',
          borderBottom: '1px solid #334155',
          background: '#1e293b',
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <div style={{ flex: 1, minWidth: '200px', display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              placeholder="Search items..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              style={{
                flex: 1,
                padding: '0.6rem 1rem',
                background: '#0f172a',
                border: '1px solid #475569',
                borderRadius: '6px',
                color: '#f1f5f9',
                fontSize: '0.95rem'
              }}
            />
          </div>
          
          <select
            value={filters.contentType}
            onChange={(e) => setFilters(prev => ({ ...prev, contentType: e.target.value }))}
            style={{
              padding: '0.6rem 1rem',
              background: '#0f172a',
              border: '1px solid #475569',
              borderRadius: '6px',
              color: '#f1f5f9',
              fontSize: '0.95rem',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Sources</option>
            <option value="generated">Generated</option>
            <option value="uploaded">Uploaded</option>
            <option value="drive">Cloud Drive</option>
          </select>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                padding: '0.6rem 0.8rem',
                background: viewMode === 'grid' ? '#6366f1' : '#1e293b',
                border: `1px solid ${viewMode === 'grid' ? '#6366f1' : '#475569'}`,
                borderRadius: '6px',
                color: '#f1f5f9',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Grid3x3 size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              style={{
                padding: '0.6rem 0.8rem',
                background: viewMode === 'list' ? '#6366f1' : '#1e293b',
                border: `1px solid ${viewMode === 'list' ? '#6366f1' : '#475569'}`,
                borderRadius: '6px',
                color: '#f1f5f9',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <List size={18} />
            </button>
          </div>
        </div>

        {/* Items Grid/List */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '1rem',
          display: viewMode === 'grid' 
            ? 'grid'
            : 'flex',
          gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(120px, 1fr))' : 'none',
          flexDirection: viewMode === 'list' ? 'column' : 'row',
          gap: '1rem'
        }}>
          {loading ? (
            <div style={{
              gridColumn: '1 / -1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '300px',
              color: '#94a3b8'
            }}>
              <div>Loading...</div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div style={{
              gridColumn: '1 / -1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '300px',
              color: '#94a3b8'
            }}>
              <div>No items found</div>
            </div>
          ) : (
            filteredItems.map(item => (
              <div
                key={item.id}
                onClick={() => handleItemSelect(item)}
                style={{
                  background: isSelected(item) ? 'rgba(99, 102, 241, 0.3)' : '#1e293b',
                  border: isSelected(item) ? '2px solid #6366f1' : '1px solid #334155',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  flex: viewMode === 'list' ? '1 0 auto' : 'unset',
                  display: viewMode === 'list' ? 'flex' : 'unset',
                  gap: viewMode === 'list' ? '1rem' : 'unset'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected(item)) {
                    e.currentTarget.style.borderColor = '#6366f1';
                    e.currentTarget.style.boxShadow = '0 0 12px rgba(99, 102, 241, 0.2)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected(item)) {
                    e.currentTarget.style.borderColor = '#334155';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
              >
                <img
                  src={item.thumbnail}
                  alt={item.name}
                  style={{
                    width: viewMode === 'list' ? '100px' : '100%',
                    height: viewMode === 'list' ? '100px' : 'auto',
                    aspectRatio: '1',
                    objectFit: 'cover',
                    flexShrink: 0
                  }}
                />
                {viewMode === 'list' && (
                  <div style={{ flex: 1, padding: '0.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ color: '#f1f5f9', fontWeight: '500', fontSize: '0.95rem', marginBottom: '0.25rem' }}>
                      {item.name}
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                      <span style={{
                        background: item.contentType === 'generated' 
                          ? 'rgba(139, 92, 246, 0.2)' 
                          : item.contentType === 'uploaded'
                          ? 'rgba(59, 130, 246, 0.2)'
                          : 'rgba(16, 185, 129, 0.2)',
                        color: item.contentType === 'generated' 
                          ? '#c4b5fd' 
                          : item.contentType === 'uploaded'
                          ? '#93c5fd'
                          : '#6ee7b7',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        fontWeight: '600'
                      }}>
                        {item.contentType}
                      </span>
                    </div>
                  </div>
                )}
                {isSelected(item) && (
                  <div style={{
                    position: 'absolute',
                    top: '0.5rem',
                    right: '0.5rem',
                    background: '#6366f1',
                    color: 'white',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    fontWeight: 'bold'
                  }}>
                    ✓
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '1rem',
          padding: '1.5rem',
          borderTop: '1px solid #334155',
          background: '#1e293b'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#1e293b',
              border: '1px solid #475569',
              borderRadius: '6px',
              color: '#f1f5f9',
              cursor: 'pointer',
              fontWeight: '600',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#334155';
              e.target.style.borderColor = '#64748b';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = '#1e293b';
              e.target.style.borderColor = '#475569';
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={multiSelect ? selectedItems.length === 0 : !selectedItems}
            style={{
              padding: '0.75rem 1.5rem',
              background: (multiSelect ? selectedItems.length === 0 : !selectedItems)
                ? '#475569'
                : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              border: 'none',
              borderRadius: '6px',
              color: 'white',
              cursor: (multiSelect ? selectedItems.length === 0 : !selectedItems) ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              transition: 'all 0.3s',
              opacity: (multiSelect ? selectedItems.length === 0 : !selectedItems) ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
              if ((multiSelect ? selectedItems.length === 0 : !selectedItems)) return;
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 20px rgba(99, 102, 241, 0.4)';
            }}
            onMouseLeave={(e) => {
              if ((multiSelect ? selectedItems.length === 0 : !selectedItems)) return;
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            {multiSelect ? `Select ${selectedItems.length}` : 'Select'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GalleryPicker;
