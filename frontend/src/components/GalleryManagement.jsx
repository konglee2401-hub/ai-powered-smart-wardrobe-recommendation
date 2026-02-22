import React, { useState, useEffect, useCallback } from 'react';
import { Heart, Trash2, Copy, Download } from 'lucide-react';
import './GalleryManagement.css';

const GalleryManagement = ({ 
  onImageSelect, 
  onBatchSelect,
  selectedImages = [],
  viewMode = 'grid' 
}) => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    contentType: 'all',      // all, generated, uploaded, drive
    dateRange: 'all',
    provider: 'all',
    search: ''
  });
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedForBatch, setSelectedForBatch] = useState([]);

  const contentTypes = [
    { value: 'all', label: 'All Media', icon: '🎨' },
    { value: 'generated', label: 'Generated', icon: '✨', color: 'generated' },
    { value: 'uploaded', label: 'Uploaded', icon: '📤', color: 'uploaded' },
    { value: 'drive', label: 'Cloud Drive', icon: '☁️', color: 'drive' }
  ];

  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'name', label: 'Name A-Z' },
    { value: 'size', label: 'Size (Largest)' },
    { value: 'usage', label: 'Most Used' }
  ];

  // Generate mock images for demonstration with content types
  const generateMockImages = useCallback(() => {
    const contentTypeOptions = ['generated', 'uploaded', 'drive'];
    const providers = ['OpenRouter', 'NVIDIA', 'Replicate', 'Fal.ai', 'Manual', 'Google Drive'];
    
    return Array.from({ length: 50 }, (_, i) => ({
      id: `media-${i + 1}`,
      name: `Media ${i + 1}`,
      url: `https://picsum.photos/300/300?random=${i + 100}`,
      thumbnail: `https://picsum.photos/150/150?random=${i + 100}`,
      contentType: contentTypeOptions[i % contentTypeOptions.length],
      provider: providers[i % providers.length],
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      size: Math.floor(Math.random() * 5000000) + 100000,
      isFavorite: Math.random() > 0.8,
      usageCount: Math.floor(Math.random() * 10),
      dimensions: { width: 1024, height: 1024 },
      tags: ['fashion', 'editorial', 'product']
    }));
  }, []);

  useEffect(() => {
    loadGallery();
  }, [filters, sortBy, currentPage]);

  const loadGallery = async () => {
    setLoading(true);
    try {
      // Mock data - replace with actual API call
      const mockImages = generateMockImages();
      const filteredImages = filterImages(mockImages, filters);
      const sortedImages = sortImages(filteredImages, sortBy);
      
      setImages(sortedImages);
      setTotalPages(Math.ceil(sortedImages.length / 20));
    } catch (error) {
      console.error('Failed to load gallery:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterImages = (images, filters) => {
    return images.filter(image => {
      if (filters.contentType !== 'all' && image.contentType !== filters.contentType) return false;
      if (filters.provider !== 'all' && image.provider !== filters.provider) return false;
      if (filters.search && !image.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
      
      if (filters.dateRange !== 'all') {
        const imageDate = new Date(image.createdAt);
        const now = new Date();
        const daysDiff = Math.floor((now - imageDate) / (1000 * 60 * 60 * 24));
        
        switch (filters.dateRange) {
          case 'today': return daysDiff === 0;
          case 'week': return daysDiff <= 7;
          case 'month': return daysDiff <= 30;
          default: return true;
        }
      }
      
      return true;
    });
  };

  const sortImages = (images, sortBy) => {
    return [...images].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'oldest':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case 'name':
          return a.name.localeCompare(b.name);
        case 'size':
          return b.size - a.size;
        case 'usage':
          return (b.usageCount || 0) - (a.usageCount || 0);
        default:
          return 0;
      }
    });
  };

  const handleImageClick = (image) => {
    if (selectMode) {
      const isSelected = selectedForBatch.some(img => img.id === image.id);
      if (isSelected) {
        setSelectedForBatch(prev => prev.filter(img => img.id !== image.id));
      } else {
        setSelectedForBatch(prev => [...prev, image]);
      }
    } else {
      onImageSelect?.(image);
    }
  };

  const handleBatchSelect = () => {
    onBatchSelect?.(selectedForBatch);
    setSelectedForBatch([]);
    setSelectMode(false);
  };

  const toggleFavorite = async (imageId, e) => {
    e.stopPropagation();
    try {
      setImages(prev => prev.map(img => 
        img.id === imageId 
          ? { ...img, isFavorite: !img.isFavorite }
          : img
      ));
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const deleteImage = async (imageId, e) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this media?')) return;
    
    try {
      setImages(prev => prev.filter(img => img.id !== imageId));
    } catch (error) {
      console.error('Failed to delete media:', error);
    }
  };

  const copyImageUrl = (image, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(image.url);
  };

  const exportSelected = () => {
    selectedForBatch.forEach(image => {
      const link = document.createElement('a');
      link.href = image.url;
      link.download = image.name;
      link.click();
    });
  };

  // Calculate content type counts
  const contentTypeCounts = {
    all: images.length,
    generated: images.filter(img => img.contentType === 'generated').length,
    uploaded: images.filter(img => img.contentType === 'uploaded').length,
    drive: images.filter(img => img.contentType === 'drive').length
  };

  if (loading) {
    return (
      <div className="gallery-loading">
        <div className="loading-spinner"></div>
        <p>Loading gallery...</p>
      </div>
    );
  }

  return (
    <div className="gallery-management">
      {/* Header */}
      <div className="gallery-header">
        <div className="header-info">
          <h2>🖼️ My Gallery</h2>
          <p>{images.length} media • {selectedForBatch.length} selected</p>
        </div>

        <div className="header-actions">
          <button 
            className={`mode-toggle ${selectMode ? 'active' : ''}`}
            onClick={() => setSelectMode(!selectMode)}
          >
            {selectMode ? '✕ Exit Select' : '☑️ Select'}
          </button>

          {selectMode && selectedForBatch.length > 0 && (
            <>
              <button onClick={handleBatchSelect} style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)'
              }}>
                Use ({selectedForBatch.length})
              </button>
              <button onClick={exportSelected} style={{
                background: 'linear-gradient(135deg, #3b82f6, #06b6d4)'
              }}>
                Export
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="gallery-filters">
        {/* Content Type Filter Buttons */}
        <div className="filter-row">
          <div className="filter-group">
            <label>Content Type</label>
            <div className="filter-buttons">
              {contentTypes.map(type => (
                <button
                  key={type.value}
                  className={`filter-button ${filters.contentType === type.value ? `active ${type.color}` : ''}`}
                  onClick={() => setFilters(prev => ({ ...prev, contentType: type.value }))}
                >
                  <span>{type.icon}</span> {type.label} ({contentTypeCounts[type.value]})
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Other Filters */}
        <div className="filter-row">
          <div className="filter-group">
            <label>Date Range</label>
            <select
              value={filters.dateRange}
              onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Provider</label>
            <select
              value={filters.provider}
              onChange={(e) => setFilters(prev => ({ ...prev, provider: e.target.value }))}
            >
              <option value="all">All Providers</option>
              <option value="OpenRouter">OpenRouter</option>
              <option value="NVIDIA">NVIDIA</option>
              <option value="Replicate">Replicate</option>
              <option value="Fal.ai">Fal.ai</option>
              <option value="Manual">Manual Upload</option>
              <option value="Google Drive">Google Drive</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search */}
        <div className="search-row">
          <div className="search-group">
            <input
              type="text"
              placeholder="Search media by name..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
            <button className="search-btn">🔍</button>
          </div>
        </div>
      </div>

      {/* Gallery Grid */}
      <div className={`gallery-grid ${viewMode}`}>
        {images.map(image => (
          <div 
            key={image.id} 
            className={`gallery-item ${selectedForBatch.some(img => img.id === image.id) ? 'selected' : ''}`}
            onClick={() => handleImageClick(image)}
          >
            <div className="item-image">
              <img src={image.thumbnail || image.url} alt={image.name} loading="lazy" />
              
              <div className="item-overlay">
                <div className="item-actions">
                  <button 
                    onClick={(e) => toggleFavorite(image.id, e)}
                    className={`favorite-btn ${image.isFavorite ? 'active' : ''}`}
                    title="Toggle favorite"
                  >
                    {image.isFavorite ? '❤️' : '♡'}
                  </button>
                  <button 
                    onClick={(e) => copyImageUrl(image, e)}
                    className="copy-btn"
                    title="Copy URL"
                  >
                    📋
                  </button>
                  <button 
                    onClick={(e) => deleteImage(image.id, e)}
                    className="delete-btn"
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>

                {selectMode && (
                  <div className="selection-indicator">
                    {selectedForBatch.some(img => img.id === image.id) ? '✓ Selected' : 'Click to select'}
                  </div>
                )}
              </div>
            </div>

            <div className="item-info">
              <div className="item-name">{image.name}</div>
              <div className="item-meta">
                <span className={`item-type ${image.contentType}`}>
                  {image.contentType}
                </span>
                <span className="item-date">
                  {new Date(image.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="item-meta">
                <span className="item-provider">{image.provider}</span>
                {image.usageCount > 0 && (
                  <span className="item-usage">Used {image.usageCount}x</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="gallery-pagination">
          <button 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => prev - 1)}
          >
            ← Previous
          </button>

          <span>Page {currentPage} of {totalPages}</span>

          <button 
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => prev + 1)}
          >
            Next →
          </button>
        </div>
      )}

      {/* Empty State */}
      {images.length === 0 && (
        <div className="gallery-empty">
          <div className="empty-icon">🖼️</div>
          <h3>No media found</h3>
          <p>Try adjusting your filters or upload some media to get started.</p>
        </div>
      )}
    </div>
  );
};

export default GalleryManagement;

  if (loading) {
    return (
      <div className="gallery-loading">
        <div className="loading-spinner"></div>
        <p>Loading gallery...</p>
      </div>
    );
  }

  return (
    <div className="gallery-management">
      {/* Header */}
      <div className="gallery-header">
        <div className="header-info">
          <h2>🖼️ My Gallery</h2>
          <p>{images.length} media • {selectedForBatch.length} selected</p>
        </div>

        <div className="header-actions">
          <button 
            className={`mode-toggle ${selectMode ? 'active' : ''}`}
            onClick={() => setSelectMode(!selectMode)}
          >
            {selectMode ? '✗ Exit Select' : '☑️ Select Multiple'}
          </button>

          {selectMode && selectedForBatch.length > 0 && (
            <>
              <button onClick={handleBatchSelect}>
                🎯 Use Selected ({selectedForBatch.length})
              </button>
              <button onClick={exportSelected}>
                📥 Export Selected
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="gallery-filters">
        <div className="filter-row">
          <div className="filter-group">
            <label>Category</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
            >
              <option value="all">All Images ({categoryCounts.all})</option>
              <option value="character">Characters ({categoryCounts.character})</option>
              <option value="product">Products ({categoryCounts.product})</option>
              <option value="generated">Generated ({categoryCounts.generated})</option>
              <option value="favorites">Favorites ({categoryCounts.favorites})</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Date Range</label>
            <select
              value={filters.dateRange}
              onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Provider</label>
            <select
              value={filters.provider}
              onChange={(e) => setFilters(prev => ({ ...prev, provider: e.target.value }))}
            >
              <option value="all">All Providers</option>
              <option value="openrouter">OpenRouter</option>
              <option value="nvidia">NVIDIA</option>
              <option value="replicate">Replicate</option>
              <option value="fal">Fal.ai</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="search-row">
          <div className="search-group">
            <input
              type="text"
              placeholder="Search images..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
            <button className="search-btn">🔍</button>
          </div>
        </div>
      </div>

      {/* Gallery Grid */}
      <div className={`gallery-grid ${viewMode}`}>
        {images.map(image => (
          <div 
            key={image.id} 
            className={`gallery-item ${selectedForBatch.some(img => img.id === image.id) ? 'selected' : ''}`}
            onClick={() => handleImageClick(image)}
          >
            <div className="item-image">
              <img src={image.thumbnail || image.url} alt={image.name} loading="lazy" />
              
              <div className="item-overlay">
                <div className="item-actions">
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(image.id); }}
                    className={`favorite-btn ${image.isFavorite ? 'active' : ''}`}
                  >
                    {image.isFavorite ? '❤️' : '🤍'}
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteImage(image.id); }}
                    className="delete-btn"
                  >
                    🗑️
                  </button>
                </div>

                {selectMode && (
                  <div className="selection-indicator">
                    {selectedForBatch.some(img => img.id === image.id) && '☑️'}
                  </div>
                )}
              </div>
            </div>

            <div className="item-info">
              <div className="item-name">{image.name}</div>
              <div className="item-meta">
                <span className="item-date">
                  {new Date(image.createdAt).toLocaleDateString()}
                </span>
                <span className="item-provider">{image.provider}</span>
              </div>
              {image.usageCount > 0 && (
                <div className="item-usage">Used {image.usageCount} times</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="gallery-pagination">
          <button 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => prev - 1)}
          >
            ← Previous
          </button>

          <span>Page {currentPage} of {totalPages}</span>

          <button 
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => prev + 1)}
          >
            Next →
          </button>
        </div>
      )}

      {/* Empty State */}
      {images.length === 0 && (
        <div className="gallery-empty">
          <div className="empty-icon">🖼️</div>
          <h3>No images found</h3>
          <p>Try adjusting your filters or upload some images to get started.</p>
        </div>
      )}
    </div>
  );
};

export default GalleryManagement;
