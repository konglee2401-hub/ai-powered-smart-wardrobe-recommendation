import React, { useState, useEffect, useCallback, useRef } from 'react';
import './GalleryManagement.css';

const GalleryManagement = ({ 
  onImageSelect, 
  onBatchSelect,
  selectedImages = [],
  viewMode = 'grid',
  currentCategory = 'all',
  searchQuery = ''
}) => {

  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    contentType: 'all',      // all, uploaded, drive
    dateRange: 'all',
    provider: 'all',
    search: searchQuery || ''
  });

  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedForBatch, setSelectedForBatch] = useState([]);
  const [imageErrors, setImageErrors] = useState({});
  const fileInputRef = useRef(null);
  const [actionLoading, setActionLoading] = useState(false);

  const contentTypes = [
    { value: 'all', label: 'All Media', icon: '🎨' },
    { value: 'uploaded', label: 'Uploaded / Local', icon: '📤', color: 'uploaded' },
    { value: 'drive', label: 'Cloud Drive', icon: '☁️', color: 'drive' }
  ];


  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'name', label: 'Name A-Z' },
    { value: 'size', label: 'Size (Largest)' },
    { value: 'usage', label: 'Most Used' }
  ];

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const mapSortParam = useCallback((sort) => {
    switch (sort) {
      case 'oldest':
        return 'createdAt_asc';
      case 'name':
        return 'name_asc';
      case 'size':
        return 'size_desc';
      case 'usage':
        return 'usage_desc';
      default:
        return 'createdAt_desc';
    }
  }, []);

  useEffect(() => {
    loadGallery();
  }, [filters, sortBy, currentPage]);

  // Update search query when prop changes
  useEffect(() => {
    if (searchQuery !== filters.search) {
      setFilters(prev => ({
        ...prev,
        search: searchQuery
      }));
      setCurrentPage(1); // Reset to first page
    }
  }, [searchQuery]);

  // Reload gallery when category changes
  useEffect(() => {
    setCurrentPage(1); // Reset to first page when category changes
    loadGallery();
  }, [currentCategory]);

  const buildSources = (asset) => {
    const proxyUrl = asset.assetId ? `${API_BASE}/assets/proxy/${asset.assetId}` : null;
    const candidates = [
      proxyUrl,
      asset.storage?.url,
      asset.cloudStorage?.thumbnailLink,
      asset.cloudStorage?.webViewLink,
      asset.storage?.localPath,
    ].filter(Boolean);

    // Deduplicate while preserving order
    return [...new Set(candidates)];
  };

  const loadGallery = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        assetType: 'image',
        page: currentPage,
        limit: 60,
        sortBy: mapSortParam(sortBy),
      });

      if (filters.search) {
        params.append('query', filters.search);
      }

      const response = await fetch(`${API_BASE}/assets/gallery?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch gallery items');
      }

      const data = await response.json();
      const assets = data.assets || [];

      const transformedImages = assets.map(asset => {
        const sources = buildSources(asset);
        const firstSource = sources[0];
        return {
          id: asset._id || asset.assetId,
          assetId: asset.assetId,
          name: asset.filename || asset.name || 'Untitled',
          url: firstSource,
          thumbnail: firstSource,
          sources,
          sourceIndex: 0,
          contentType: asset.storage?.location === 'google-drive' ? 'drive' : 'uploaded',
          provider: asset.storage?.location || asset.provider || 'system',
          createdAt: asset.createdAt || new Date().toISOString(),
          size: asset.fileSize || 0,
          isFavorite: !!asset.isFavorite,
          usageCount: asset.usageCount || 0,
          category: asset.assetCategory,
        };
      });

      const filteredImages = filterImages(transformedImages, filters);
      const sortedImages = sortImages(filteredImages, sortBy);

      setImages(sortedImages);
      setImageErrors({});
      setTotalPages(data.pagination?.pages || 1);
    } catch (error) {
      console.error('Failed to load gallery:', error);
      setImages([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };



  const filterImages = (images, filters) => {
    return images.filter(image => {
      // Category filter (from sidebar selection)
      if (currentCategory && currentCategory !== 'all') {
        // Map currentCategory value to asset category
        const categoryMap = {
          'character': 'Character',
          'product': 'Product',
          'generated': 'Generated',
          'source': 'Source',
          'reference': 'Reference'
        };
        
        const targetCategory = categoryMap[currentCategory];
        if (targetCategory && image.category !== targetCategory) return false;
      }
      
      // Handle special filter categories from sidebar
      if (currentCategory === 'recent') {
        const now = new Date();
        const imageDate = new Date(image.createdAt);
        const hoursAgo = Math.floor((now - imageDate) / (1000 * 60 * 60));
        return hoursAgo <= 24; // Recent = last 24 hours
      }
      
      if (currentCategory === 'favorites' && !image.isFavorite) {
        return false;
      }
      
      // Content type filter
      if (filters.contentType !== 'all' && image.contentType !== filters.contentType) return false;
      
      // Provider filter
      if (filters.provider !== 'all' && image.provider !== filters.provider) return false;
      
      // Search filter (from search input)
      if (filters.search && !image.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
      
      // Date range filter
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

  const handleImageError = (imageId) => {
    setImages(prev => prev.map(img => {
      if (img.id !== imageId) return img;
      const nextIndex = (img.sourceIndex || 0) + 1;
      if (img.sources && nextIndex < img.sources.length) {
        return { ...img, sourceIndex: nextIndex, url: img.sources[nextIndex], thumbnail: img.sources[nextIndex] };
      }
      return img;
    }));

    setImageErrors(prev => {
      const currentCount = prev[imageId]?.count || 0;
      return { ...prev, [imageId]: { count: currentCount + 1, failed: true } };
    });
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

  const deleteImage = async (image, e) => {
    e?.stopPropagation?.();
    if (!confirm('Are you sure you want to delete this media?')) return;
    try {
      const assetId = image.assetId || image.id;
      await fetch(`${API_BASE}/assets/${assetId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleteFile: true })
      });
      setImages(prev => prev.filter(img => img.id !== image.id));
    } catch (error) {
      console.error('Failed to delete media:', error);
      alert('Xoá không thành công. Vui lòng thử lại.');
    }
  };

  const deleteSelected = async () => {
    if (selectedForBatch.length === 0) return;
    if (!confirm(`Xoá ${selectedForBatch.length} ảnh đã chọn?`)) return;
    setActionLoading(true);
    try {
      await Promise.all(selectedForBatch.map(img => {
        const assetId = img.assetId || img.id;
        return fetch(`${API_BASE}/assets/${assetId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deleteFile: true })
        });
      }));
      setImages(prev => prev.filter(img => !selectedForBatch.some(sel => sel.id === img.id)));
      setSelectedForBatch([]);
      setSelectMode(false);
    } catch (error) {
      console.error('Batch delete failed:', error);
      alert('Xoá hàng loạt thất bại. Vui lòng thử lại.');
    } finally {
      setActionLoading(false);
    }
  };

  const clearBrokenImages = () => {
    const brokenIds = Object.keys(imageErrors);
    if (brokenIds.length === 0) return;
    setImages(prev => prev.filter(img => !brokenIds.includes(img.id)));
    setImageErrors({});
  };

  const copyImageUrl = (image, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(image.url || image.sources?.[0] || '');
  };

  const exportSelected = () => {
    selectedForBatch.forEach(image => {
      const link = document.createElement('a');
      link.href = image.url || image.sources?.[0];
      link.download = image.name;
      link.click();
    });
  };

  const handleRename = async (image, e) => {
    e.stopPropagation();
    const newName = prompt('Nhập tên mới', image.name);
    if (!newName || newName === image.name) return;
    try {
      const assetId = image.assetId || image.id;
      await fetch(`${API_BASE}/assets/${assetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: newName })
      });
      setImages(prev => prev.map(img => img.id === image.id ? { ...img, name: newName } : img));
    } catch (error) {
      console.error('Rename failed:', error);
      alert('Đổi tên thất bại.');
    }
  };

  const handleUpload = async (file) => {
    if (!file) return;
    setActionLoading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const uploadRes = await fetch(`${API_BASE}/drive/upload`, {
        method: 'POST',
        body: form
      });
      const uploadData = await uploadRes.json();
      const uploaded = uploadData.file;
      if (!uploaded?.id) {
        throw new Error('Upload failed');
      }

      // Register asset record
      const assetPayload = {
        filename: uploaded.name || file.name,
        mimeType: uploaded.mimeType || file.type,
        fileSize: uploaded.size || file.size,
        assetType: 'image',
        assetCategory: 'uploaded-image',
        storage: {
          location: uploaded.source === 'local' ? 'local' : 'google-drive',
          googleDriveId: uploaded.id,
          url: uploaded.webViewLink || uploaded.thumbnailLink,
          localPath: uploaded.localPath,
        },
        metadata: {}
      };

      await fetch(`${API_BASE}/assets/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assetPayload)
      });

      await loadGallery();
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload thất bại hoặc Drive chưa cấu hình.');
    } finally {
      setActionLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Calculate content type counts

  const contentTypeCounts = {
    all: images.length,
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
          <p className="header-meta">{images.length} media • {selectedForBatch.length} selected</p>
        </div>

        <div className="header-actions">

          <button 
            className={`mode-toggle ${selectMode ? 'active' : ''}`}
            onClick={() => setSelectMode(!selectMode)}
          >
            {selectMode ? '✕ Exit Select' : '☑️ Select'}
          </button>

          <div className="view-toggle">
            <button 
              className={`icon-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid"
            >
              ⬜
            </button>
            <button 
              className={`icon-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List"
            >
              ☰
            </button>
          </div>

          <button className="mode-toggle" onClick={loadGallery} disabled={loading}>
            🔄 Refresh
          </button>

          <button className="mode-toggle" onClick={clearBrokenImages} disabled={Object.keys(imageErrors).length === 0}>
            🧹 Clear lỗi
          </button>

          <button className="mode-toggle" onClick={() => fileInputRef.current?.click()} disabled={actionLoading}>
            ➕ Upload
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
              <button onClick={deleteSelected} style={{
                background: 'linear-gradient(135deg, #ef4444, #f97316)'
              }} disabled={actionLoading}>
                🗑️ Delete selected
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

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => handleUpload(e.target.files?.[0])}
      />

      {/* Gallery Grid */}
      <div className={`gallery-grid ${viewMode}`}>
        {images.map(image => (
          <div 
            key={image.id} 
            className={`gallery-item ${selectedForBatch.some(img => img.id === image.id) ? 'selected' : ''}`}
            onClick={() => handleImageClick(image)}
          >
            <div className="item-image">
              <img 
                src={image.thumbnail || image.url} 
                alt={image.name} 
                loading="lazy"
                onError={() => handleImageError(image.id)}
              />

              {imageErrors[image.id]?.failed && (
                <div className="item-error">
                  <div>⚠️ Image unavailable</div>
                </div>
              )}
              
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
                    onClick={(e) => handleRename(image, e)}
                    className="copy-btn"
                    title="Rename"
                  >
                    ✏️
                  </button>
                  <button 
                    onClick={(e) => deleteImage(image, e)}
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
                {image.category && (
                  <span className="item-usage">{image.category}</span>
                )}
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
