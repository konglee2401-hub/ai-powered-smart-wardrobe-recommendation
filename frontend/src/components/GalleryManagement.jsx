import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Download,
  Grid3X3,
  Heart,
  ImagePlus,
  List,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';

const CONTENT_TYPES = [
  { value: 'all', label: 'All media' },
  { value: 'uploaded', label: 'Uploaded' },
  { value: 'drive', label: 'Cloud drive' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'name', label: 'Name A-Z' },
  { value: 'size', label: 'Largest size' },
  { value: 'usage', label: 'Most used' },
];

const DATE_RANGES = [
  { value: 'all', label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
];

const PROVIDER_OPTIONS = [
  { value: 'all', label: 'All providers' },
  { value: 'OpenRouter', label: 'OpenRouter' },
  { value: 'NVIDIA', label: 'NVIDIA' },
  { value: 'Replicate', label: 'Replicate' },
  { value: 'Fal.ai', label: 'Fal.ai' },
  { value: 'Manual Upload', label: 'Manual Upload' },
  { value: 'Google Drive', label: 'Google Drive' },
];

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatRelativeDate(value) {
  const date = new Date(value);
  const diffHours = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60));
  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getTypeChipClass(type) {
  switch (type) {
    case 'drive':
      return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200';
    case 'uploaded':
      return 'border-sky-400/20 bg-sky-400/10 text-sky-200';
    default:
      return 'border-violet-400/20 bg-violet-400/10 text-violet-200';
  }
}

function getCategoryLabel(category) {
  if (!category) return 'Unsorted';
  return category.replace(/-/g, ' ');
}

export default function GalleryManagement({
  onImageSelect,
  onBatchSelect,
  selectedImages = [],
  viewMode = 'grid',
  currentCategory = 'all',
  searchQuery = '',
}) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    contentType: 'all',
    dateRange: 'all',
    provider: 'all',
    search: searchQuery,
  });
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedForBatch, setSelectedForBatch] = useState(selectedImages);
  const [imageErrors, setImageErrors] = useState({});
  const [actionLoading, setActionLoading] = useState(false);
  const fileInputRef = useRef(null);

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

  const buildSources = useCallback((asset) => {
    const proxyUrl = asset.assetId ? `${API_BASE}/assets/proxy/${asset.assetId}` : null;
    const candidates = [
      proxyUrl,
      asset.storage?.url,
      asset.cloudStorage?.thumbnailLink,
      asset.cloudStorage?.webViewLink,
      asset.storage?.localPath,
    ].filter(Boolean);

    return [...new Set(candidates)];
  }, []);

  const sortImages = useCallback((items, activeSort) => {
    return [...items].sort((a, b) => {
      switch (activeSort) {
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
  }, []);

  const filterImages = useCallback((items, activeFilters) => {
    return items.filter((image) => {
      if (currentCategory && currentCategory !== 'all') {
        const categoryMap = {
          'character-image': 'character-image',
          'product-image': 'product-image',
          'generated-image': 'generated-image',
          'source-video': 'source-video',
        };

        if (currentCategory === 'recent') {
          const diffHours = Math.floor((Date.now() - new Date(image.createdAt).getTime()) / (1000 * 60 * 60));
          return diffHours <= 24;
        }

        if (currentCategory === 'favorites') {
          return image.isFavorite;
        }

        if (categoryMap[currentCategory] && image.category !== categoryMap[currentCategory]) {
          return false;
        }
      }

      if (activeFilters.contentType !== 'all' && image.contentType !== activeFilters.contentType) return false;
      if (activeFilters.provider !== 'all' && image.provider !== activeFilters.provider) return false;
      if (activeFilters.search && !image.name.toLowerCase().includes(activeFilters.search.toLowerCase())) return false;

      if (activeFilters.dateRange !== 'all') {
        const diffDays = Math.floor((Date.now() - new Date(image.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        if (activeFilters.dateRange === 'today' && diffDays !== 0) return false;
        if (activeFilters.dateRange === 'week' && diffDays > 7) return false;
        if (activeFilters.dateRange === 'month' && diffDays > 30) return false;
      }

      return true;
    });
  }, [currentCategory]);

  const loadGallery = useCallback(async () => {
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
      if (!response.ok) throw new Error('Failed to fetch gallery items');

      const data = await response.json();
      const transformedImages = (data.assets || []).map((asset) => {
        const sources = buildSources(asset);
        const primarySource = sources[0];
        return {
          id: asset._id || asset.assetId,
          assetId: asset.assetId,
          name: asset.filename || asset.name || 'Untitled',
          url: primarySource,
          thumbnail: primarySource,
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

      setImages(sortImages(filterImages(transformedImages, filters), sortBy));
      setImageErrors({});
      setTotalPages(data.pagination?.pages || 1);
    } catch (error) {
      console.error('Failed to load gallery:', error);
      setImages([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [buildSources, currentPage, filterImages, filters, mapSortParam, sortBy, sortImages]);

  useEffect(() => {
    loadGallery();
  }, [loadGallery]);

  useEffect(() => {
    setFilters((prev) => (prev.search === searchQuery ? prev : { ...prev, search: searchQuery }));
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [currentCategory]);

  useEffect(() => {
    setSelectedForBatch(selectedImages);
  }, [selectedImages]);

  const contentTypeCounts = useMemo(
    () => ({
      all: images.length,
      uploaded: images.filter((image) => image.contentType === 'uploaded').length,
      drive: images.filter((image) => image.contentType === 'drive').length,
    }),
    [images],
  );

  const brokenCount = Object.keys(imageErrors).length;

  const handleImageClick = (image) => {
    if (selectMode) {
      setSelectedForBatch((prev) => {
        const exists = prev.some((selected) => selected.id === image.id);
        const next = exists ? prev.filter((selected) => selected.id !== image.id) : [...prev, image];
        onBatchSelect?.(next);
        return next;
      });
      return;
    }

    onImageSelect?.(image);
  };

  const handleImageError = (imageId) => {
    setImages((prev) => prev.map((image) => {
      if (image.id !== imageId) return image;
      const nextIndex = (image.sourceIndex || 0) + 1;
      if (image.sources && nextIndex < image.sources.length) {
        return { ...image, sourceIndex: nextIndex, url: image.sources[nextIndex], thumbnail: image.sources[nextIndex] };
      }
      return image;
    }));

    setImageErrors((prev) => ({
      ...prev,
      [imageId]: {
        count: (prev[imageId]?.count || 0) + 1,
        failed: true,
      },
    }));
  };

  const clearBrokenImages = () => {
    const brokenIds = new Set(Object.keys(imageErrors));
    setImages((prev) => prev.filter((image) => !brokenIds.has(image.id)));
    setImageErrors({});
  };

  const toggleFavorite = async (imageId, event) => {
    event.stopPropagation();
    setImages((prev) => prev.map((image) => (
      image.id === imageId ? { ...image, isFavorite: !image.isFavorite } : image
    )));
  };

  const copyImageUrl = async (image, event) => {
    event.stopPropagation();
    await navigator.clipboard.writeText(image.url || image.sources?.[0] || '');
  };

  const handleRename = async (image, event) => {
    event.stopPropagation();
    const nextName = window.prompt('Enter a new filename', image.name);
    if (!nextName || nextName === image.name) return;

    try {
      const assetId = image.assetId || image.id;
      await fetch(`${API_BASE}/assets/${assetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: nextName }),
      });
      setImages((prev) => prev.map((item) => (item.id === image.id ? { ...item, name: nextName } : item)));
    } catch (error) {
      console.error('Rename failed:', error);
      window.alert('Rename failed. Please try again.');
    }
  };

  const deleteImage = async (image, event) => {
    event?.stopPropagation?.();
    if (!window.confirm('Delete this media asset?')) return;

    try {
      const assetId = image.assetId || image.id;
      await fetch(`${API_BASE}/assets/${assetId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleteFile: true }),
      });
      setImages((prev) => prev.filter((item) => item.id !== image.id));
    } catch (error) {
      console.error('Delete failed:', error);
      window.alert('Delete failed. Please try again.');
    }
  };

  const deleteSelected = async () => {
    if (!selectedForBatch.length || !window.confirm(`Delete ${selectedForBatch.length} selected assets?`)) return;

    setActionLoading(true);
    try {
      await Promise.all(selectedForBatch.map((image) => {
        const assetId = image.assetId || image.id;
        return fetch(`${API_BASE}/assets/${assetId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deleteFile: true }),
        });
      }));

      const selectedIds = new Set(selectedForBatch.map((image) => image.id));
      setImages((prev) => prev.filter((image) => !selectedIds.has(image.id)));
      setSelectedForBatch([]);
      onBatchSelect?.([]);
      setSelectMode(false);
    } catch (error) {
      console.error('Batch delete failed:', error);
      window.alert('Batch delete failed. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const exportSelected = () => {
    selectedForBatch.forEach((image) => {
      const link = document.createElement('a');
      link.href = image.url || image.sources?.[0];
      link.download = image.name;
      link.click();
    });
  };

  const handleApplySelected = () => {
    onBatchSelect?.(selectedForBatch);
    setSelectMode(false);
  };

  const handleUpload = async (file) => {
    if (!file) return;

    setActionLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch(`${API_BASE}/drive/upload`, {
        method: 'POST',
        body: formData,
      });
      const uploadData = await uploadResponse.json();
      const uploadedFile = uploadData.file;

      if (!uploadedFile?.id) {
        throw new Error('Upload failed');
      }

      await fetch(`${API_BASE}/assets/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: uploadedFile.name || file.name,
          mimeType: uploadedFile.mimeType || file.type,
          fileSize: uploadedFile.size || file.size,
          assetType: 'image',
          assetCategory: 'uploaded-image',
          storage: {
            location: uploadedFile.source === 'local' ? 'local' : 'google-drive',
            googleDriveId: uploadedFile.id,
            url: uploadedFile.webViewLink || uploadedFile.thumbnailLink,
            localPath: uploadedFile.localPath,
          },
          metadata: {},
        }),
      });

      await loadGallery();
    } catch (error) {
      console.error('Upload failed:', error);
      window.alert('Upload failed or Drive is not configured.');
    } finally {
      setActionLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-[1.5rem] border border-white/6 bg-white/[0.03]">
        <div className="flex items-center gap-3 text-sm text-slate-300">
          <RefreshCw className="h-4 w-4 animate-spin text-cyan-300" />
          Loading media workspace
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 xl:grid-cols-[1.35fr,0.95fr]">
        <div className="rounded-[1.5rem] border border-white/6 bg-white/[0.03] p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Library pulse</p>
              <h3 className="mt-2 text-xl font-semibold text-white">{images.length} assets in this view</h3>
              <p className="mt-1 text-sm text-slate-400">
                {selectedForBatch.length} selected, {brokenCount} broken previews, page {currentPage} of {totalPages}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectMode((prev) => !prev)}
                className={`inline-flex items-center gap-2 rounded-2xl border px-3.5 py-2 text-sm font-medium transition ${
                  selectMode
                    ? 'border-cyan-300/25 bg-cyan-400/12 text-cyan-100'
                    : 'border-white/10 bg-white/[0.04] text-slate-300 hover:text-white'
                }`}
              >
                {selectMode ? <X className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                {selectMode ? 'Exit select' : 'Select assets'}
              </button>

              <button
                type="button"
                onClick={loadGallery}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm font-medium text-slate-300 transition hover:text-white"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>

              <button
                type="button"
                onClick={clearBrokenImages}
                disabled={!brokenCount}
                className="inline-flex items-center gap-2 rounded-2xl border border-amber-300/12 bg-amber-400/10 px-3.5 py-2 text-sm font-medium text-amber-100 transition disabled:cursor-not-allowed disabled:opacity-40"
              >
                <AlertTriangle className="h-4 w-4" />
                Clear broken
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-3.5 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <UploadCloud className="h-4 w-4" />
                Upload
              </button>
            </div>
          </div>

          {selectMode && selectedForBatch.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 rounded-[1.2rem] border border-violet-300/15 bg-violet-400/10 p-3">
              <button
                type="button"
                onClick={handleApplySelected}
                className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                <CheckCircle2 className="h-4 w-4" />
                Use selected ({selectedForBatch.length})
              </button>
              <button
                type="button"
                onClick={exportSelected}
                className="inline-flex items-center gap-2 rounded-2xl border border-sky-300/15 bg-sky-400/10 px-3.5 py-2 text-sm font-medium text-sky-100 transition hover:bg-sky-400/15"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
              <button
                type="button"
                onClick={deleteSelected}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 rounded-2xl border border-rose-300/15 bg-rose-400/10 px-3.5 py-2 text-sm font-medium text-rose-100 transition hover:bg-rose-400/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          )}
        </div>

        <div className="rounded-[1.5rem] border border-white/6 bg-white/[0.03] p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.16em] text-slate-500">Search inside current view</span>
              <div className="flex items-center gap-3 rounded-[1.1rem] border border-white/10 bg-slate-950/55 px-3 py-2.5">
                <Search className="h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                  placeholder="Search by filename"
                />
              </div>
            </label>

            <div className="space-y-2">
              <span className="text-xs uppercase tracking-[0.16em] text-slate-500">View mode</span>
              <div className="inline-flex rounded-[1.1rem] border border-white/10 bg-slate-950/55 p-1">
                <button
                  type="button"
                  className={`inline-flex items-center gap-2 rounded-[0.95rem] px-3 py-2 text-sm transition ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-slate-400'}`}
                >
                  <Grid3X3 className="h-4 w-4" />
                  Grid
                </button>
                <button
                  type="button"
                  className={`inline-flex items-center gap-2 rounded-[0.95rem] px-3 py-2 text-sm transition ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-slate-400'}`}
                >
                  <List className="h-4 w-4" />
                  List
                </button>
              </div>
            </div>

            <SelectField
              label="Content source"
              value={filters.contentType}
              options={CONTENT_TYPES}
              onChange={(value) => setFilters((prev) => ({ ...prev, contentType: value }))}
            />
            <SelectField
              label="Provider"
              value={filters.provider}
              options={PROVIDER_OPTIONS}
              onChange={(value) => setFilters((prev) => ({ ...prev, provider: value }))}
            />
            <SelectField
              label="Date range"
              value={filters.dateRange}
              options={DATE_RANGES}
              onChange={(value) => setFilters((prev) => ({ ...prev, dateRange: value }))}
            />
            <SelectField
              label="Sort by"
              value={sortBy}
              options={SORT_OPTIONS}
              onChange={setSortBy}
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {CONTENT_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setFilters((prev) => ({ ...prev, contentType: type.value }))}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  filters.contentType === type.value
                    ? 'border-cyan-300/25 bg-cyan-400/12 text-cyan-100'
                    : 'border-white/8 bg-white/[0.04] text-slate-400 hover:text-slate-200'
                }`}
              >
                {type.label} ({contentTypeCounts[type.value] || 0})
              </button>
            ))}
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => handleUpload(event.target.files?.[0])}
      />

      {images.length === 0 ? (
        <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white/[0.04]">
            <ImagePlus className="h-7 w-7 text-slate-400" />
          </div>
          <h3 className="mt-5 text-xl font-semibold text-white">No media found in this slice</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
            Try broadening the filters, changing the collection, or uploading a fresh reference image to start building the workspace.
          </p>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid gap-4 sm:grid-cols-2 2xl:grid-cols-3' : 'space-y-3'}>
          {images.map((image) => (
            <AssetCard
              key={image.id}
              image={image}
              imageErrors={imageErrors}
              isList={viewMode === 'list'}
              isSelected={selectedForBatch.some((selected) => selected.id === image.id)}
              onClick={() => handleImageClick(image)}
              onCopy={(event) => copyImageUrl(image, event)}
              onDelete={(event) => deleteImage(image, event)}
              onFavorite={(event) => toggleFavorite(image.id, event)}
              onRename={(event) => handleRename(image, event)}
              onError={() => handleImageError(image.id)}
              selectMode={selectMode}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-[1.5rem] border border-white/6 bg-white/[0.03] px-4 py-3">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((prev) => prev - 1)}
            className="rounded-2xl border border-white/10 px-3.5 py-2 text-sm text-slate-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          <p className="text-sm text-slate-400">Page {currentPage} of {totalPages}</p>
          <button
            type="button"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((prev) => prev + 1)}
            className="rounded-2xl border border-white/10 px-3.5 py-2 text-sm text-slate-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function SelectField({ label, value, options, onChange }) {
  return (
    <label className="space-y-2">
      <span className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-[1.1rem] border border-white/10 bg-slate-950/55 px-3 py-2.5 text-sm text-white outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function AssetCard({
  image,
  imageErrors,
  isList,
  isSelected,
  onClick,
  onCopy,
  onDelete,
  onFavorite,
  onRename,
  onError,
  selectMode,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full rounded-[1.6rem] border p-3 text-left transition ${
        isSelected
          ? 'border-cyan-300/30 bg-gradient-to-br from-cyan-400/12 to-violet-500/10 shadow-[0_20px_45px_rgba(8,47,73,0.25)]'
          : 'border-white/6 bg-white/[0.03] hover:border-white/12 hover:bg-white/[0.05]'
      } ${isList ? 'flex items-start gap-4' : ''}`}
    >
      <div className={`relative overflow-hidden ${isList ? 'h-32 w-32 shrink-0 rounded-[1.25rem]' : 'aspect-[1.08/1] rounded-[1.35rem]'}`}>
        <img
          src={image.thumbnail || image.url}
          alt={image.name}
          loading="lazy"
          onError={onError}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/10 to-transparent" />

        {imageErrors[image.id]?.failed && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 px-4 text-center text-xs font-medium text-slate-200">
            Preview unavailable
          </div>
        )}

        <div className="absolute left-3 top-3 flex items-center gap-2">
          <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${getTypeChipClass(image.contentType)}`}>
            {image.contentType}
          </span>
          {isSelected && (
            <span className="rounded-full border border-cyan-300/20 bg-cyan-400/12 px-2 py-1 text-[11px] font-semibold text-cyan-100">
              Selected
            </span>
          )}
        </div>

        <div className="absolute right-3 top-3 flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
          <IconButton label="Favorite" onClick={onFavorite}>
            <Heart className={`h-4 w-4 ${image.isFavorite ? 'fill-current text-rose-300' : ''}`} />
          </IconButton>
          <IconButton label="Copy URL" onClick={onCopy}>
            <Copy className="h-4 w-4" />
          </IconButton>
          <IconButton label="Rename" onClick={onRename}>
            <Pencil className="h-4 w-4" />
          </IconButton>
          <IconButton label="Delete" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </IconButton>
        </div>
      </div>

      <div className={`min-w-0 ${isList ? 'flex-1' : 'pt-4'}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h4 className="truncate text-base font-semibold text-white">{image.name}</h4>
            <p className="mt-1 text-sm text-slate-400">{getCategoryLabel(image.category)}</p>
          </div>
          {!selectMode && (
            <span className="rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1 text-xs text-slate-400">
              {formatRelativeDate(image.createdAt)}
            </span>
          )}
        </div>

        <div className="mt-4 grid gap-2 text-sm text-slate-400 sm:grid-cols-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Size</p>
            <p className="mt-1 text-slate-200">{formatBytes(image.size)}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Provider</p>
            <p className="mt-1 truncate text-slate-200">{image.provider}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Usage</p>
            <p className="mt-1 text-slate-200">{image.usageCount || 0} times</p>
          </div>
        </div>

        {selectMode && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold text-cyan-100">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {isSelected ? 'Tap again to remove' : 'Tap to add to selection'}
          </div>
        )}
      </div>
    </button>
  );
}

function IconButton({ children, label, onClick }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(event) => {
        event.stopPropagation();
        onClick(event);
      }}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-slate-950/70 text-slate-200 backdrop-blur-xl transition hover:border-white/20 hover:text-white"
    >
      {children}
    </button>
  );
}
