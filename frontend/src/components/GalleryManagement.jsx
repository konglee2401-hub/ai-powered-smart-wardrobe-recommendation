import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import ModalPortal from './ModalPortal';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Grid3X3,
  Heart,
  Image as ImageIcon,
  ImagePlus,
  List,
  Loader2,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  Wrench,
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

function IconButton({ children, label, onClick, tone = 'default' }) {
  const toneClass =
    tone === 'danger'
      ? 'hover:border-rose-400/35 hover:text-rose-100'
      : tone === 'favorite'
        ? 'hover:border-rose-300/35 hover:text-rose-200'
        : 'hover:border-white/20 hover:text-white';

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(event) => {
        event.stopPropagation();
        onClick(event);
      }}
      className={`flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-slate-950/70 text-slate-200 transition ${toneClass}`}
    >
      {children}
    </button>
  );
}

function SelectionButton({ checked, isGrid = false, onToggle }) {
  return (
    <button
      type="button"
      aria-label={checked ? 'Unselect asset' : 'Select asset'}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      className={`flex h-9 w-9 items-center justify-center rounded-full border transition ${
        checked
          ? 'border-cyan-300/45 bg-cyan-400/18 text-cyan-100 shadow-[0_10px_24px_rgba(8,47,73,0.22)]'
          : 'border-white/14 bg-slate-950/72 text-slate-300 hover:border-cyan-300/35 hover:text-cyan-100'
      } ${isGrid ? '' : 'shrink-0'}`}
    >
      {checked ? <Check className="h-4.5 w-4.5" /> : <span className="h-3 w-3 rounded-full border border-current opacity-70" />}
    </button>
  );
}

function PreviewModal({ image, index, total, onClose, onPrevious, onNext, hasPrevious, hasNext }) {
  if (!image) return null;

  return (
    <ModalPortal>
    <div className="fixed inset-0 app-layer-modal flex items-center justify-center bg-slate-950/88 px-4 py-6 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(7,14,28,0.98))] shadow-[0_30px_120px_rgba(2,6,23,0.62)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold text-white">{image.name}</h3>
            <p className="mt-1 text-sm text-slate-400">
              {index + 1} / {total} â€¢ {getCategoryLabel(image.category)} â€¢ {formatBytes(image.size)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-slate-200 transition hover:bg-white/[0.1]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative flex min-h-0 flex-1 items-center justify-center bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.08),transparent_40%),linear-gradient(180deg,rgba(2,6,23,0.3),rgba(2,6,23,0.72))] px-5 py-5">
          <img
            src={image.url || image.thumbnail}
            alt={image.name}
            className="max-h-[70vh] w-auto max-w-full rounded-[1.5rem] object-contain shadow-[0_28px_80px_rgba(2,6,23,0.45)]"
          />

          <button
            type="button"
            disabled={!hasPrevious}
            onClick={onPrevious}
            className="absolute left-5 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-slate-950/75 text-white transition hover:bg-slate-900/90 disabled:opacity-35"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            disabled={!hasNext}
            onClick={onNext}
            className="absolute right-5 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-slate-950/75 text-white transition hover:bg-slate-900/90 disabled:opacity-35"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}

function AssetCard({
  image,
  imageErrors,
  isList,
  isSelected,
  onOpenPreview,
  onToggleSelected,
  onCopy,
  onDelete,
  onFavorite,
  onRename,
  onError,
}) {
  if (isList) {
    return (
      <div
        className={`flex items-start gap-4 rounded-[1.5rem] border p-3 transition ${
          isSelected
            ? 'border-cyan-300/30 bg-gradient-to-br from-cyan-400/12 to-violet-500/10 shadow-[0_20px_45px_rgba(8,47,73,0.25)]'
            : 'border-white/6 bg-white/[0.03] hover:border-white/12 hover:bg-white/[0.05]'
        }`}
      >
        <SelectionButton checked={isSelected} onToggle={onToggleSelected} />

        <button
          type="button"
          onClick={onOpenPreview}
          className="relative h-32 w-32 shrink-0 overflow-hidden rounded-[1.25rem] border border-white/8 bg-slate-950/60"
        >
          <img
            src={image.thumbnail || image.url}
            alt={image.name}
            loading="lazy"
            onError={onError}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t" />
          {imageErrors[image.id]?.failed && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/85 px-4 text-center text-xs font-medium text-slate-200">
              Preview unavailable
            </div>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <button type="button" onClick={onOpenPreview} className="text-left">
                <h4 className="truncate text-base font-semibold text-white">{image.name}</h4>
              </button>
              <p className="mt-1 text-sm text-slate-400">{getCategoryLabel(image.category)}</p>
            </div>
            <span className="rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1 text-xs text-slate-400">
              {formatRelativeDate(image.createdAt)}
            </span>
          </div>

          <div className="mt-4 grid gap-2 text-sm text-slate-400 sm:grid-cols-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Type</p>
              <span className={`mt-1 inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold ${getTypeChipClass(image.contentType)}`}>
                {image.contentType}
              </span>
            </div>
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
        </div>

        <div className="flex shrink-0 items-start gap-2">
          <IconButton label="Favorite" onClick={onFavorite} tone="favorite">
            <Heart className={`h-4 w-4 ${image.isFavorite ? 'fill-current text-rose-300' : ''}`} />
          </IconButton>
          <IconButton label="Copy URL" onClick={onCopy}>
            <Copy className="h-4 w-4" />
          </IconButton>
          <IconButton label="Rename" onClick={onRename}>
            <Pencil className="h-4 w-4" />
          </IconButton>
          <IconButton label="Delete" onClick={onDelete} tone="danger">
            <Trash2 className="h-4 w-4" />
          </IconButton>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group rounded-[1.6rem] border p-3 transition ${
        isSelected
          ? 'border-cyan-300/30 bg-gradient-to-br from-cyan-400/12 to-violet-500/10 shadow-[0_20px_45px_rgba(8,47,73,0.25)]'
          : 'border-white/6 bg-white/[0.03] hover:border-white/12 hover:bg-white/[0.05]'
      }`}
    >
      <div className="relative overflow-hidden rounded-[1.35rem]">
        <button type="button" onClick={onOpenPreview} className="block aspect-[1.08/1] w-full overflow-hidden rounded-[1.35rem]">
          <img
            src={image.thumbnail || image.url}
            alt={image.name}
            loading="lazy"
            onError={onError}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        </button>

        <div className="absolute inset-0 bg-gradient-to-t" />
        {imageErrors[image.id]?.failed && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/50 px-4 text-center text-xs font-medium text-slate-200">
            Preview unavailable
          </div>
        )}

        <div className="absolute left-3 top-3">
          <SelectionButton checked={isSelected} isGrid onToggle={onToggleSelected} />
        </div>

        <div className="absolute right-3 top-3 flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
          <IconButton label="Favorite" onClick={onFavorite} tone="favorite">
            <Heart className={`h-4 w-4 ${image.isFavorite ? 'fill-current text-rose-300' : ''}`} />
          </IconButton>
          <IconButton label="Copy URL" onClick={onCopy}>
            <Copy className="h-4 w-4" />
          </IconButton>
          <IconButton label="Rename" onClick={onRename}>
            <Pencil className="h-4 w-4" />
          </IconButton>
          <IconButton label="Delete" onClick={onDelete} tone="danger">
            <Trash2 className="h-4 w-4" />
          </IconButton>
        </div>

        <div className="absolute left-3 bottom-3">
          <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${getTypeChipClass(image.contentType)}`}>
            {image.contentType}
          </span>
        </div>
      </div>

      <div className="pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <button type="button" onClick={onOpenPreview} className="text-left">
              <h4 className="truncate text-base font-semibold text-white">{image.name}</h4>
            </button>
            <p className="mt-1 text-sm text-slate-400">{getCategoryLabel(image.category)}</p>
          </div>
          <span className="rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1 text-xs text-slate-400">
            {formatRelativeDate(image.createdAt)}
          </span>
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
      </div>
    </div>
  );
}

export default function GalleryManagement({
  onImageSelect,
  onBatchSelect,
  selectedImages = [],
  viewMode = 'grid',
  currentCategory = 'all',
  searchQuery = '',
  toolbarHost = null,
  maintenanceAction = null,
  showMaintenanceMenu = false,
  setShowMaintenanceMenu = () => {},
  maintenanceMenuRef = null,
  runMaintenance = () => {},
}) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeViewMode, setActiveViewMode] = useState(viewMode);
  const [searchInput, setSearchInput] = useState(searchQuery);
  const [filters, setFilters] = useState({
    contentType: 'all',
    dateRange: 'all',
    provider: 'all',
    search: searchQuery,
  });
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedForBatch, setSelectedForBatch] = useState(selectedImages);
  const [imageErrors, setImageErrors] = useState({});
  const [actionLoading, setActionLoading] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(null);

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
        limit: 30,
        sortBy: mapSortParam(sortBy),
      });

      if (filters.search) params.append('query', filters.search);

      const accessToken = localStorage.getItem('accessToken') || localStorage.getItem('token');
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
      const response = await fetch(`${API_BASE}/assets/gallery?${params}`, { headers });
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
    setSearchInput(searchQuery);
    setFilters((prev) => (prev.search === searchQuery ? prev : { ...prev, search: searchQuery }));
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [currentCategory]);

  useEffect(() => {
    setSelectedForBatch(selectedImages);
  }, [selectedImages]);

  useEffect(() => {
    setActiveViewMode(viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (previewIndex == null) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setPreviewIndex(null);
      if (event.key === 'ArrowLeft') setPreviewIndex((current) => (current > 0 ? current - 1 : current));
      if (event.key === 'ArrowRight') setPreviewIndex((current) => (current < images.length - 1 ? current + 1 : current));
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [images.length, previewIndex]);

  const contentTypeCounts = useMemo(
    () => ({
      all: images.length,
      uploaded: images.filter((image) => image.contentType === 'uploaded').length,
      drive: images.filter((image) => image.contentType === 'drive').length,
    }),
    [images],
  );

  const brokenCount = Object.keys(imageErrors).length;
  const previewImage = previewIndex != null ? images[previewIndex] : null;

  const toggleSelection = (image) => {
    setSelectedForBatch((prev) => {
      const exists = prev.some((selected) => selected.id === image.id);
      const next = exists ? prev.filter((selected) => selected.id !== image.id) : [...prev, image];
      onBatchSelect?.(next);
      return next;
    });
  };

  const openPreview = (image) => {
    const nextIndex = images.findIndex((item) => item.id === image.id);
    if (nextIndex >= 0) setPreviewIndex(nextIndex);
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
      setSelectedForBatch((prev) => prev.filter((item) => item.id !== image.id));
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
  };

  const handleSearchSubmit = (event) => {
    event?.preventDefault?.();
    const nextSearch = searchInput.trim();
    setCurrentPage(1);
    setFilters((prev) => (prev.search === nextSearch ? prev : { ...prev, search: nextSearch }));
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

  const toolbar = (
    <div className="rounded-[1.35rem] bg-white/[0.02] px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-[-0.03em] text-white">Manage assets</h2>
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/15"
          >
            <ImagePlus className="h-4 w-4" />
            Add assets
          </button>
          <button
            type="button"
            onClick={loadGallery}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-medium text-slate-300 transition hover:text-white"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <div className="relative" ref={maintenanceMenuRef}>
            <button
              type="button"
              onClick={() => setShowMaintenanceMenu(!showMaintenanceMenu)}
              disabled={maintenanceAction !== null}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-300/12 bg-amber-400/10 px-3 py-2 text-sm font-medium text-amber-100 transition disabled:cursor-not-allowed disabled:opacity-40"
            >
              {maintenanceAction ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cleanup running...
                </>
              ) : (
                <>
                  <Wrench className="h-4 w-4" />
                  Clean up
                  <ChevronDown className={`h-4 w-4 transition ${showMaintenanceMenu ? 'rotate-180' : ''}`} />
                </>
              )}
            </button>

            {showMaintenanceMenu && maintenanceAction === null && (
              <div className="absolute right-0 top-full mt-2 z-20 min-w-64 rounded-xl border border-white/10 bg-slate-900/95 shadow-lg backdrop-blur-sm">
                <div className="space-y-1 p-2">
                  <button
                    type="button"
                    onClick={() => runMaintenance('run-gallery-availability-repair', { dryRun: false })}
                    className="w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium text-slate-200 transition hover:bg-white/10 active:bg-white/20"
                  >
                    <div className="font-semibold text-white">Repair Gallery Availability</div>
                    <div className="mt-1 text-xs text-slate-400">Check asset visibility and accessibility</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => runMaintenance('run-batch-upload-orphaned-assets', { dryRun: false, limit: 100 })}
                    className="w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium text-slate-200 transition hover:bg-white/10 active:bg-white/20"
                  >
                    <div className="font-semibold text-white">Repair Pending Assets</div>
                    <div className="mt-1 text-xs text-slate-400">Sync orphaned or incomplete uploads</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => runMaintenance('run-asset-integrity-cleanup', { dryRun: false, fixBrokenAssets: true })}
                    className="w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium text-slate-200 transition hover:bg-white/10 active:bg-white/20"
                  >
                    <div className="font-semibold text-white">Cleanup Broken Assets</div>
                    <div className="mt-1 text-xs text-slate-400">Remove corrupted or inaccessible files</div>
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="inline-flex rounded-[0.9rem] border border-white/10 bg-slate-950/55 p-1">
            <button
              type="button"
              onClick={() => setActiveViewMode('grid')}
              className={`inline-flex items-center justify-center rounded-[0.7rem] px-2 py-2 text-xs transition ${activeViewMode === 'grid' ? 'bg-white/10 text-white' : 'text-slate-400'}`}
              aria-label="Grid view"
            >
              <Grid3X3 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setActiveViewMode('list')}
              className={`inline-flex items-center justify-center rounded-[0.7rem] px-2 py-2 text-xs transition ${activeViewMode === 'list' ? 'bg-white/10 text-white' : 'text-slate-400'}`}
              aria-label="List view"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSearchSubmit} className="mt-2 grid items-end gap-1.5 lg:grid-cols-[minmax(320px,1.5fr),minmax(110px,0.5fr),minmax(130px,0.6fr),auto]">
        <label className="min-w-0 space-y-1.5">
          <span className="text-xs uppercase tracking-[0.16em] text-transparent select-none">Search</span>
          <div className="flex min-h-10 items-center gap-2 rounded-[1rem] border border-white/10 bg-slate-950/55 px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-slate-500" />
            <input
              type="text"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              className="w-full bg-transparent py-0.5 pr-2 text-sm leading-6 text-white outline-none placeholder:text-slate-500"
              placeholder="Search by filename"
            />
          </div>
        </label>
        <div className="min-w-[90px]">
          <SelectField
            label="Date"
            value={filters.dateRange}
            options={DATE_RANGES}
            onChange={(value) => setFilters((prev) => ({ ...prev, dateRange: value }))}
          />
        </div>
        <div className="min-w-[100px]">
          <SelectField
            label="Sort"
            value={sortBy}
            options={SORT_OPTIONS}
            onChange={setSortBy}
          />
        </div>
        <button
          type="submit"
          aria-label="Search"
          title="Search"
          className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-100 transition hover:bg-cyan-400/15"
        >
          <Search className="h-4 w-4" />
        </button>
      </form>

      <div className="mt-2 h-px bg-gradient-to-r from-transparent via-slate-700/35 to-transparent" />

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400">
            {selectedForBatch.length} selected / {brokenCount} broken
          </span>
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

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-400">{images.length} on page</span>
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((prev) => prev - 1)}
            className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Prev
          </button>
          <div className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs text-slate-300">
            {currentPage}/{totalPages}
          </div>
          <button
            type="button"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((prev) => prev + 1)}
            className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {toolbarHost ? createPortal(toolbar, toolbarHost) : toolbar}

      {images.length === 0 ? (
        <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white/[0.04]">
            <ImagePlus className="h-7 w-7 text-slate-400" />
          </div>
          <h3 className="mt-5 text-xl font-semibold text-white">No media found in this slice</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
            Try broadening the filters, changing the collection, or loading a different page to continue reviewing assets.
          </p>
        </div>
      ) : (
        <div className={activeViewMode === 'grid' ? 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4' : 'space-y-3'}>
          {images.map((image) => (
            <AssetCard
              key={image.id}
              image={image}
              imageErrors={imageErrors}
              isList={activeViewMode === 'list'}
              isSelected={selectedForBatch.some((selected) => selected.id === image.id)}
              onOpenPreview={() => openPreview(image)}
              onToggleSelected={() => toggleSelection(image)}
              onCopy={(event) => copyImageUrl(image, event)}
              onDelete={(event) => deleteImage(image, event)}
              onFavorite={(event) => toggleFavorite(image.id, event)}
              onRename={(event) => handleRename(image, event)}
              onError={() => handleImageError(image.id)}
            />
          ))}
        </div>
      )}

      {selectedForBatch.length > 0 && (
        <div className="flex flex-wrap gap-2 rounded-[1.2rem] border border-violet-300/15 bg-violet-400/10 p-3">
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

      <PreviewModal
        image={previewImage}
        index={previewIndex ?? 0}
        total={images.length}
        onClose={() => setPreviewIndex(null)}
        onPrevious={() => setPreviewIndex((current) => Math.max(current - 1, 0))}
        onNext={() => setPreviewIndex((current) => Math.min(current + 1, images.length - 1))}
        hasPrevious={(previewIndex ?? 0) > 0}
        hasNext={(previewIndex ?? 0) < images.length - 1}
      />
    </div>
  );
}



