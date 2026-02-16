import React, { useState, useEffect, useCallback } from 'react';
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
    category: 'all',
    dateRange: 'all',
    provider: 'all',
    search: ''
  });
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedForBatch, setSelectedForBatch] = useState([]);

  const categories = [
    { value: 'all', label: 'All Images', count: 0 },
    { value: 'character', label: 'Characters', count: 0 },
    { value: 'product', label: 'Products', count: 0 },
    { value: 'generated', label: 'Generated', count: 0 },
    { value: 'favorites', label: 'Favorites', count: 0 }
  ];

  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'name', label: 'Name A-Z' },
    { value: 'size', label: 'Size (Largest)' },
    { value: 'usage', label: 'Most Used' }
  ];

  // Generate mock images for demonstration
  const generateMockImages = useCallback(() => {
    const categories = ['character', 'product', 'generated'];
    const providers = ['openrouter', 'nvidia', 'replicate', 'fal'];
    
    return Array.from({ length: 50 }, (_, i) => ({
      id: `img-${i + 1}`,
      name: `Generated Image ${i + 1}`,
      url: `https://picsum.photos/300/300?random=${i + 100}`,
      thumbnail: `https://picsum.photos/150/150?random=${i + 100}`,
      category: categories[i % categories.length],
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
      if (filters.category !== 'all' && image.category !== filters.category) return false;
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

  const toggleFavorite = async (imageId) => {
    try {
      // API call to toggle favorite
      setImages(prev => prev.map(img => 
        img.id === imageId 
          ? { ...img, isFavorite: !img.isFavorite }
          : img
      ));
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const deleteImage = async (imageId) => {
    if (!confirm('Are you sure you want to delete this image?')) return;
    
    try {
      // API call to delete image
      setImages(prev => prev.filter(img => img.id !== imageId));
    } catch (error) {
      console.error('Failed to delete image:', error);
    }
  };

  const exportSelected = () => {
    // Export selected images as ZIP or individual downloads
    selectedForBatch.forEach(image => {
      // Trigger download for each image
      const link = document.createElement('a');
      link.href = image.url;
      link.download = image.name;
      link.click();
    });
  };

  // Calculate category counts
  const categoryCounts = {
    all: images.length,
    character: images.filter(img => img.category === 'character').length,
    product: images.filter(img => img.category === 'product').length,
    generated: images.filter(img => img.category === 'generated').length,
    favorites: images.filter(img => img.isFavorite).length
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
          <p>{images.length} images • {selectedForBatch.length} selected</p>
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
