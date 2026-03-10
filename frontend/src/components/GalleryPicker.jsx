/**
 * Gallery Picker Component
 * Reusable modal dialog for selecting media from gallery in upload workflows
 * Integrates with Database records for proper asset tracking
 */

import React, { useEffect, useRef, useState } from 'react';
import { X, Grid3x3, List, Search } from 'lucide-react';
import useGalleryPickerCacheStore from '../stores/useGalleryPickerCacheStore';

const galleryPreviewInflight = new Map();
const galleryCacheStore = useGalleryPickerCacheStore;

const getApiBase = () => import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const buildAssetSources = (asset) => {
  const apiUrl = getApiBase();
  const sources = [
    asset.assetId ? `${apiUrl}/assets/proxy/${asset.assetId}` : null,
    asset.preview?.url && !String(asset.preview.url).startsWith('blob:') ? asset.preview.url : null,
    asset.cloudStorage?.thumbnailLink,
    asset.storage?.url && !String(asset.storage.url).startsWith('blob:') ? asset.storage.url : null,
    asset.cloudStorage?.webViewLink,
  ].filter(Boolean);

  return [...new Set(sources)];
};

const warmImageSource = (src) => new Promise((resolve) => {
  const image = new Image();
  image.onload = () => resolve(true);
  image.onerror = () => resolve(false);
  image.src = src;
});

const getAssetSignature = (asset) => {
  if (!asset?.assetId) return null;
  return `${asset.assetId}:${asset.updatedAt || asset.createdAt || 'unknown'}`;
};

const resolveAssetPreview = async (assetId, sources, signature = null) => {
  if (!assetId || !sources?.length) {
    return { resolvedUrl: null, sourceIndex: -1, available: false };
  }

  const cachedPreview = galleryCacheStore.getState().getPreview(assetId, signature);
  if (cachedPreview) {
    return cachedPreview;
  }

  if (galleryPreviewInflight.has(assetId)) {
    return galleryPreviewInflight.get(assetId);
  }

  const task = (async () => {
    for (let i = 0; i < sources.length; i += 1) {
      const src = sources[i];
      // Prefer proxy first; browser cache will keep this warm after modal opens.
      const ok = await warmImageSource(src);
      if (ok) {
        const result = { resolvedUrl: src, sourceIndex: i, available: true };
        galleryCacheStore.getState().setPreview(assetId, result, signature);
        galleryPreviewInflight.delete(assetId);
        return result;
      }
    }

    const result = { resolvedUrl: sources[0] || null, sourceIndex: 0, available: false };
    galleryCacheStore.getState().setPreview(assetId, result, signature);
    galleryPreviewInflight.delete(assetId);
    return result;
  })();

  galleryPreviewInflight.set(assetId, task);
  return task;
};

const GalleryPicker = ({ 
  isOpen, 
  onClose, 
  onSelect, 
  multiSelect = false,
  assetType = 'all', // 'all', 'image', 'video'
  assetCategory = 'all', // 'all', 'character-image', 'product-image', 'generated-image', etc.
  title = 'Select from Gallery'
}) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedItems, setSelectedItems] = useState(multiSelect ? [] : null);
  const [viewMode, setViewMode] = useState('grid');
  const [storageLocation, setStorageLocation] = useState('all'); // Changed to 'all' to show both local and Google Drive
  const [imageErrors, setImageErrors] = useState({}); // Track failed image loads
  const [filters, setFilters] = useState({
    assetCategory: assetCategory,
    search: '',
    sortBy: 'newest',
    page: 1
  });
  const [pagination, setPagination] = useState({
    total: 0,
    pages: 0
  });
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const isLightTheme = typeof document !== 'undefined' && document.documentElement.dataset.theme === 'light';
  const scrollContainerRef = useRef(null);
  const observerTarget = React.useRef(null);
  const searchTimeoutRef = useRef(null);

  const getQueryKey = (page) => JSON.stringify({
    assetType,
    assetCategory: filters.assetCategory,
    sortBy: filters.sortBy,
    storageLocation,
    search: filters.search,
    page,
  });

  const enrichItemsWithPreview = async (baseItems) => {
    const previewed = await Promise.all(
      baseItems.map(async (item) => {
        const previewState = await resolveAssetPreview(item.assetId, item.sources, item.assetSignature);
        return {
          ...item,
          url: item.url,
          thumbnail: previewState.resolvedUrl || item.thumbnail,
          resolvedUrl: previewState.resolvedUrl || item.url,
          sourceIndex: previewState.sourceIndex >= 0 ? previewState.sourceIndex : item.sourceIndex,
          previewAvailable: previewState.available,
        };
      })
    );

    return previewed;
  };

  // Load gallery items from API
  useEffect(() => {
    if (isOpen) {
      setFilters(prev => ({ ...prev, page: 1 }));
      setItems([]);
      loadGalleryItems(1, true);
    }
  }, [isOpen, assetType, filters.assetCategory, filters.sortBy, storageLocation]);

  useEffect(() => {
    if (!isOpen) return;

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setItems([]);
      setFilters(prev => ({ ...prev, page: 1 }));
      loadGalleryItems(1, true);
    }, 250);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [filters.search, isOpen]);

  // Infinite scroll observer
  useEffect(() => {
    if (!observerTarget.current || !scrollContainerRef.current || !hasMore || isLoadingMore) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMoreItems();
        }
      },
      {
        root: scrollContainerRef.current,
        rootMargin: '0px 0px 240px 0px',
        threshold: 0.01,
      }
    );

    observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, items.length, viewMode]);

  const loadGalleryItems = async (pageToLoad = 1, replace = true) => {
    const queryKey = getQueryKey(pageToLoad);
    const cached = galleryCacheStore.getState().getQuery(queryKey);
    const shouldRefreshInBackground = Boolean(cached && replace && pageToLoad === 1);

    if (cached) {
      setItems(prev => replace ? cached.items : [...prev, ...cached.items]);
      setPagination(cached.pagination);
      setHasMore(pageToLoad < cached.pagination.pages);
      if (!shouldRefreshInBackground) {
        return;
      }
    }

    setLoading(!cached || !replace);
    setError(null);
    try {
      const apiUrl = getApiBase();
      const params = new URLSearchParams({
        assetType: assetType,
        category: filters.assetCategory,
        page: pageToLoad,
        limit: 40,
        sortBy: filters.sortBy,
        storageLocation: storageLocation
      });

      if (filters.search) {
        params.append('query', filters.search);
      }

      const response = await fetch(`${apiUrl}/assets/gallery?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch gallery items');
      }

      const data = await response.json();
      
      // Transform API assets to component format
      const transformedItems = data.assets.map(asset => {
        const sources = buildAssetSources(asset);
        const primarySource = sources[0] || null;

        return {
          assetId: asset.assetId,
          id: asset._id,
          name: asset.filename,
          url: asset.assetId ? `${apiUrl}/assets/proxy/${asset.assetId}` : primarySource,
          selectUrl: asset.assetId ? `${apiUrl}/assets/proxy/${asset.assetId}` : primarySource,
          thumbnail: primarySource,
          type: asset.assetType,
          category: asset.assetCategory,
          createdAt: new Date(asset.createdAt),
          updatedAt: asset.updatedAt,
          assetSignature: getAssetSignature(asset),
          size: asset.fileSize,
          metadata: asset.metadata,
          isFavorite: asset.isFavorite,
          tags: asset.tags,
          storage: asset.storage,
          cloudStorage: asset.cloudStorage,
          preview: asset.preview,
          sources,
          sourceIndex: 0,
          previewAvailable: true,
        };
      });

      const previewReadyItems = await enrichItemsWithPreview(transformedItems);
      const nextPagination = {
        total: data.pagination.total,
        pages: data.pagination.pages
      };

      galleryCacheStore.getState().setQuery(queryKey, {
        items: previewReadyItems,
        pagination: nextPagination,
      });

      setItems(prev => replace ? previewReadyItems : [...prev, ...previewReadyItems]);
      setPagination(nextPagination);
      
      // Check if there are more pages to load
      setHasMore(pageToLoad < data.pagination.pages);
    } catch (error) {
      console.error('Failed to load gallery items:', error);
      setError('Failed to load gallery. Please try again.');
      if (replace) setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreItems = async () => {
    if (isLoadingMore || !hasMore) return;
    
    setIsLoadingMore(true);
    try {
      const nextPage = filters.page + 1;
      await loadGalleryItems(nextPage, false);
      setFilters(prev => ({ ...prev, page: nextPage }));
    } catch (error) {
      console.error('Failed to load more items:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleItemsScroll = (event) => {
    if (isLoadingMore || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;

    if (distanceToBottom <= 160) {
      loadMoreItems();
    }
  };

  // ðŸ’« Get category options based on asset type
  const getCategoryOptions = () => {
    const imageCategories = [
      { value: 'all', label: 'All Image Categories' },
      { value: 'character-image', label: 'Character Images' },
      { value: 'product-image', label: 'Product Images' },
      { value: 'generated-image', label: 'Generated Images' },
      { value: 'reference-image', label: 'Reference Images' }
    ];

    const videoCategories = [
      { value: 'all', label: 'All Video Categories' },
      { value: 'source-video', label: 'Source Videos' },
      { value: 'generated-video', label: 'Generated Videos' }
    ];

    const audioCategories = [
      { value: 'all', label: 'All Audio Categories' },
      { value: 'audio', label: 'Audio Files' }
    ];

    const allCategories = [
      { value: 'all', label: 'All Categories' },
      { value: 'character-image', label: 'Character Images' },
      { value: 'product-image', label: 'Product Images' },
      { value: 'generated-image', label: 'Generated Images' },
      { value: 'reference-image', label: 'Reference Images' },
      { value: 'source-video', label: 'Source Videos' },
      { value: 'generated-video', label: 'Generated Videos' },
      { value: 'audio', label: 'Audio Files' }
    ];

    // Return filtered categories based on assetType
    if (assetType === 'image') return imageCategories;
    if (assetType === 'video') return videoCategories;
    if (assetType === 'audio') return audioCategories;
    return allCategories;
  };

  const handleItemSelect = (item) => {
    console.log(`ðŸ–¼ï¸  Item clicked:`, {
      assetId: item.assetId,
      name: item.name,
      id: item.id,
      url: item.url,
      type: item.type,
      category: item.category
    });
    
    if (multiSelect) {
      setSelectedItems(prev => {
        const isSelected = prev.some(s => s.id === item.id);
        const newSelection = isSelected 
          ? prev.filter(s => s.id !== item.id)
          : [...prev, item];
        console.log(`   ${isSelected ? 'âŒ Deselected' : 'âœ… Selected'} | Total: ${newSelection.length}`);
        return newSelection;
      });
    } else {
      console.log(`   âœ… Single select mode - item will be selected`);
      setSelectedItems(item);
    }
  };

  const handleConfirm = () => {
    if (multiSelect) {
      console.log(`âœ… Gallery: Confirming multiselect with ${selectedItems.length} items`);
      selectedItems.forEach(item => {
        console.log(`   - ${item.name} (${item.assetId}): url=${item.url}`);
      });
      onSelect(selectedItems);
    } else {
      if (selectedItems) {
        console.log(`âœ… Gallery: Confirming single select:`, {
          assetId: selectedItems.assetId,
          name: selectedItems.name,
          url: selectedItems.url,
          thumbnail: selectedItems.thumbnail,
          type: selectedItems.type,
          category: selectedItems.category
        });
        onSelect(selectedItems);
      } else {
        console.warn('âš ï¸  Gallery: No item selected');
      }
    }
    onClose();
  };

  const isSelected = (item) => {
    if (multiSelect) {
      return selectedItems.some(s => s.id === item.id);
    }
    return selectedItems?.id === item.id;
  };

  const getCategoryLabel = (category) => {
    const labels = {
      'character-image': 'Character',
      'product-image': 'Product',
      'generated-image': 'Generated',
      'reference-image': 'Reference',
      'source-video': 'Source Video',
      'generated-video': 'Generated Video',
      'audio': 'Audio',
      'thumbnail': 'Thumbnail'
    };
    return labels[category] || category;
  };

  const theme = isLightTheme
    ? {
        overlay: 'rgba(145, 167, 193, 0.28)',
        panelBg: 'linear-gradient(180deg, rgba(244, 251, 255, 0.88), rgba(231, 244, 255, 0.72))',
        panelBorder: '1px solid rgba(255,255,255,0.5)',
        panelShadow: '0 24px 64px rgba(74, 122, 168, 0.14)',
        headerBg: 'rgba(234, 244, 252, 0.78)',
        sectionBg: 'rgba(232, 243, 252, 0.72)',
        inputBg: 'rgba(255,255,255,0.68)',
        inputBorder: '1px solid rgba(255,255,255,0.48)',
        textStrong: '#10233b',
        textMuted: '#61748d',
        textSoft: '#7d8ea6',
        tileBg: 'linear-gradient(180deg, rgba(247, 252, 255, 0.72), rgba(231, 244, 255, 0.54))',
        tileBorder: '1px solid rgba(255,255,255,0.44)',
        tileHover: '#7cc2ff',
        selectedBg: 'linear-gradient(180deg, rgba(232,246,255,0.98), rgba(193,226,255,0.94))',
        selectedBorder: '2px solid rgba(59,130,246,0.3)',
        accentBg: 'rgba(59,130,246,0.12)',
        accentText: '#155a9c',
        primaryButton: 'linear-gradient(180deg, rgba(56, 139, 253, 0.96), rgba(37, 99, 235, 0.92))',
        primaryText: '#f8fbff',
        primaryShadow: '0 14px 28px rgba(37,99,235,0.22)',
        neutralButton: 'rgba(255,255,255,0.64)',
        neutralBorder: '1px solid rgba(255,255,255,0.5)',
        imageFallback: 'rgba(231, 243, 252, 0.9)',
      }
    : {
        overlay: 'rgba(0, 0, 0, 0.7)',
        panelBg: '#0f172a',
        panelBorder: '1px solid #334155',
        panelShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        headerBg: '#1e293b',
        sectionBg: '#1e293b',
        inputBg: '#0f172a',
        inputBorder: '1px solid #475569',
        textStrong: '#f1f5f9',
        textMuted: '#cbd5e1',
        textSoft: '#94a3b8',
        tileBg: '#1e293b',
        tileBorder: '1px solid #334155',
        tileHover: '#6366f1',
        selectedBg: 'rgba(99, 102, 241, 0.3)',
        selectedBorder: '2px solid #6366f1',
        accentBg: 'rgba(99, 102, 241, 0.2)',
        accentText: '#c4b5fd',
        primaryButton: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        primaryText: '#ffffff',
        primaryShadow: '0 6px 20px rgba(99, 102, 241, 0.4)',
        neutralButton: '#1e293b',
        neutralBorder: '1px solid #475569',
        imageFallback: '#0f172a',
      };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: theme.overlay,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      backdropFilter: isLightTheme ? 'blur(14px)' : 'none'
    }}>
      <div style={{
        background: theme.panelBg,
        borderRadius: '12px',
        border: theme.panelBorder,
        boxShadow: theme.panelShadow,
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
          borderBottom: theme.panelBorder,
          background: theme.headerBg
        }}>
          <div>
            <h2 style={{ 
              margin: '0', 
              color: theme.textStrong,
              fontSize: '1.3rem',
              fontWeight: '600'
            }}>
              {title}
            </h2>
            <p style={{ 
              margin: '0.25rem 0 0 0', 
              color: theme.textMuted,
              fontSize: '0.9rem'
            }}>
              {error ? error : multiSelect ? `${selectedItems.length} selected` : 'Select one item'}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: theme.textMuted,
              cursor: 'pointer',
              fontSize: '1.5rem',
              padding: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => {
              e.target.style.color = theme.textStrong;
              e.target.style.background = isLightTheme ? 'rgba(255,255,255,0.54)' : '#334155';
              e.target.style.borderRadius = '6px';
            }}
            onMouseLeave={(e) => {
              e.target.style.color = theme.textMuted;
              e.target.style.background = 'none';
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Filters & Controls */}
        <div style={{
          padding: '1rem 1.5rem',
          borderBottom: theme.panelBorder,
          background: theme.sectionBg,
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
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
              style={{
                flex: 1,
                padding: '0.6rem 1rem',
                background: theme.inputBg,
                border: theme.inputBorder,
                borderRadius: '6px',
                color: theme.textStrong,
                fontSize: '0.95rem'
              }}
            />
          </div>
          
          <select
            value={filters.assetCategory}
            onChange={(e) => {
              setFilters(prev => ({ ...prev, assetCategory: e.target.value, page: 1 }));
              setItems([]);
            }}
            style={{
              padding: '0.6rem 1rem',
              background: theme.inputBg,
              border: theme.inputBorder,
              borderRadius: '6px',
              color: theme.textStrong,
              fontSize: '0.95rem',
              cursor: 'pointer'
            }}
          >
            {getCategoryOptions().map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>

          <select
            value={storageLocation}
            onChange={(e) => {
              setStorageLocation(e.target.value);
              setFilters(prev => ({ ...prev, page: 1 }));
              setItems([]);
            }}
            style={{
              padding: '0.6rem 1rem',
              background: theme.inputBg,
              border: theme.inputBorder,
              borderRadius: '6px',
              color: theme.textStrong,
              fontSize: '0.95rem',
              cursor: 'pointer'
            }}
            title="Filter by storage location"
          >
            <option value="google-drive">Google Drive</option>
            <option value="local">Local Storage</option>
            <option value="all">All Storage</option>
          </select>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                padding: '0.6rem 0.8rem',
                background: viewMode === 'grid' ? theme.selectedBg : theme.sectionBg,
                border: viewMode === 'grid' ? theme.selectedBorder : theme.inputBorder,
                borderRadius: '6px',
                color: viewMode === 'grid' ? theme.accentText : theme.textStrong,
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
                background: viewMode === 'list' ? theme.selectedBg : theme.sectionBg,
                border: viewMode === 'list' ? theme.selectedBorder : theme.inputBorder,
                borderRadius: '6px',
                color: viewMode === 'list' ? theme.accentText : theme.textStrong,
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
        <div
          ref={scrollContainerRef}
          onScroll={handleItemsScroll}
          style={{
          flex: 1,
          overflow: 'auto',
          padding: '1rem',
          display: viewMode === 'grid' 
            ? 'grid'
            : 'flex',
          gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(140px, 1fr))' : 'none',
          gridAutoRows: viewMode === 'grid' ? '140px' : 'unset',
          gridAutoFlow: viewMode === 'grid' ? 'dense' : 'unset',
          flexDirection: viewMode === 'list' ? 'column' : 'row',
          gap: '1rem',
          alignContent: 'start'
        }}>
          {loading && items.length === 0 ? (
            <div style={{
              gridColumn: '1 / -1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '300px',
              color: theme.textSoft
            }}>
              <div>Loading gallery...</div>
            </div>
          ) : items.length === 0 ? (
            <div style={{
              gridColumn: '1 / -1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '300px',
              color: theme.textSoft
            }}>
              <div>No items found in gallery</div>
            </div>
          ) : (
            items.map(item => (
              <div
                key={item.id}
                onClick={() => handleItemSelect(item)}
                style={{
                  background: isSelected(item) ? theme.selectedBg : theme.tileBg,
                  border: isSelected(item) ? theme.selectedBorder : theme.tileBorder,
                  borderRadius: '8px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  flex: viewMode === 'list' ? '1 0 auto' : 'unset',
                  display: viewMode === 'list' ? 'flex' : 'block',
                  gap: viewMode === 'list' ? '1rem' : 'unset',
                  position: 'relative',
                  width: viewMode === 'list' ? '100%' : '100%',
                  height: viewMode === 'list' ? 'auto' : '100%'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected(item)) {
                    e.currentTarget.style.borderColor = theme.tileHover;
                    e.currentTarget.style.boxShadow = isLightTheme ? '0 0 18px rgba(96, 165, 250, 0.12)' : '0 0 12px rgba(99, 102, 241, 0.2)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected(item)) {
                    e.currentTarget.style.borderColor = isLightTheme ? 'rgba(255,255,255,0.44)' : '#334155';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
              >
                <img
                  src={item.thumbnail}
                  alt={item.name}
                  style={{
                    width: viewMode === 'list' ? '100px' : '100%',
                    height: viewMode === 'list' ? '100px' : '100%',
                    aspectRatio: viewMode === 'list' ? 'unset' : '1',
                    objectFit: 'cover',
                    objectPosition: 'center',
                    flexShrink: 0,
                    background: theme.imageFallback,
                    display: 'block',
                    backgroundColor: imageErrors[item.assetId] ? (isLightTheme ? 'rgba(203, 213, 225, 0.82)' : '#475569') : theme.imageFallback
                  }}
                  onError={(e) => {
                    console.warn(`Image failed to load: ${item.name}`);
                    const nextIndex = (item.sourceIndex || 0) + 1;
                    if (item.sources && nextIndex < item.sources.length) {
                      const nextSource = item.sources[nextIndex];
                      galleryCacheStore.getState().deletePreview(item.assetId);
                      galleryCacheStore.getState().setPreview(item.assetId, {
                        resolvedUrl: nextSource,
                        sourceIndex: nextIndex,
                        available: true,
                      }, item.assetSignature);
                      setItems(prev => prev.map((entry) => (
                        entry.id === item.id
                          ? { ...entry, sourceIndex: nextIndex, thumbnail: nextSource, resolvedUrl: nextSource }
                          : entry
                      )));
                    } else {
                      setImageErrors(prev => ({ ...prev, [item.assetId]: true }));
                    }
                  }}
                />
                {imageErrors[item.assetId] && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: theme.imageFallback,
                    color: theme.textSoft,
                    fontSize: '0.8rem',
                    textAlign: 'center',
                    pointerEvents: 'none'
                  }}>
                    <div>
                      <div>âš ï¸</div>
                      <div>Image unavailable</div>
                    </div>
                  </div>
                )}
                {viewMode === 'list' && (
                  <div style={{ flex: 1, padding: '0.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ color: theme.textStrong, fontWeight: '500', fontSize: '0.95rem', marginBottom: '0.25rem' }}>
                      {item.name}
                    </div>
                    <div style={{ color: theme.textSoft, fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                      <span style={{
                        background: theme.accentBg,
                        color: theme.accentText,
                        padding: '0.2rem 0.6rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        fontWeight: '600'
                      }}>
                        {getCategoryLabel(item.category)}
                      </span>
                    </div>
                    <div style={{ color: theme.textSoft, fontSize: '0.75rem' }}>
                      {new Date(item.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                )}
                {isSelected(item) && (
                  <div style={{
                    position: 'absolute',
                    top: '0.5rem',
                    right: '0.5rem',
                    background: isLightTheme ? '#3b82f6' : '#6366f1',
                    color: '#ffffff',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    fontWeight: 'bold'
                  }}>
                    âœ“
                  </div>
                )}
              </div>
            ))
          )}
          
          {/* Infinite scroll sentinel */}
          <div ref={observerTarget} style={{
            gridColumn: '1 / -1',
            height: '1px',
            visibility: 'hidden',
            pointerEvents: 'none'
          }} />
          
          {/* Loading indicator when fetching more items */}
          {isLoadingMore && (
            <div style={{
              gridColumn: '1 / -1',
              display: 'flex',
              justifyContent: 'center',
              padding: '1rem',
              color: theme.textSoft
            }}>
              <div>Loading more...</div>
            </div>
          )}
        </div>

        {/* Info bar showing total items */}
        <div style={{
          textAlign: 'center',
          padding: '0.75rem',
          borderTop: theme.panelBorder,
          background: theme.headerBg,
          color: theme.textSoft,
          fontSize: '0.85rem'
        }}>
          Showing {items.length} of {pagination.total} items {hasMore && '(scroll to load more)'}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '1rem',
          padding: '1.5rem',
          borderTop: theme.panelBorder,
          background: theme.headerBg
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.75rem 1.5rem',
              background: theme.neutralButton,
              border: theme.neutralBorder,
              borderRadius: '6px',
              color: theme.textStrong,
              cursor: 'pointer',
              fontWeight: '600',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = isLightTheme ? 'rgba(255,255,255,0.82)' : '#334155';
              e.target.style.borderColor = isLightTheme ? 'rgba(147,197,253,0.42)' : '#64748b';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = theme.neutralButton;
              e.target.style.borderColor = isLightTheme ? 'rgba(255,255,255,0.5)' : '#475569';
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
                ? (isLightTheme ? 'rgba(191, 219, 254, 0.6)' : '#475569')
                : theme.primaryButton,
              border: 'none',
              borderRadius: '6px',
              color: theme.primaryText,
              cursor: (multiSelect ? selectedItems.length === 0 : !selectedItems) ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              transition: 'all 0.3s',
              opacity: (multiSelect ? selectedItems.length === 0 : !selectedItems) ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
              if ((multiSelect ? selectedItems.length === 0 : !selectedItems)) return;
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = theme.primaryShadow;
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

