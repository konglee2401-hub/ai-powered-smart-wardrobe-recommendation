/**
 * Universal Gallery Dialog Component
 * Reusable modal for file uploads and media selection across the entire application
 */

import React, { useEffect, useState } from 'react';
import { X, Cloud, Upload, Grid, List, Search, Filter, FolderOpen, Image as ImageIcon, Film, Music, File, Heart, Star, Download } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api';

export function GalleryDialog({ 
  isOpen, 
  onClose, 
  onSelect, 
  allowedTypes = ['image', 'video', 'audio', 'file'],
  multiSelect = false,
  mode = 'select', // 'select' or 'upload'
  title = 'Select Media'
}) {
  const [mediaLibrary, setMediaLibrary] = useState(null);
  const [selectedMedia, setSelectedMedia] = useState(multiSelect ? [] : null);
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [collections, setCollections] = useState(null);
  const [currentFilter, setCurrentFilter] = useState(null);
  const [favorites, setFavorites] = useState(new Set());
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [filterByCollection, setFilterByCollection] = useState(null);

  // Initialize gallery
  useEffect(() => {
    if (isOpen) {
      initializeGallery();
      // Load favorites from localStorage
      try {
        const savedFavorites = localStorage.getItem('gallery-favorites');
        if (savedFavorites) {
          setFavorites(new Set(JSON.parse(savedFavorites)));
        }
      } catch (error) {
        console.warn('Failed to load favorites from localStorage');
      }
    }
  }, [isOpen]);

  const initializeGallery = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE}/cloud-gallery/init`);
      console.log('Gallery initialized:', response.data);
      await loadMediaLibrary();
    } catch (error) {
      console.error('Error initializing gallery:', error);
      toast.error('Failed to initialize gallery');
    } finally {
      setLoading(false);
    }
  };

  const loadMediaLibrary = async () => {
    try {
      const response = await axios.get(`${API_BASE}/cloud-gallery/library`);
      if (response.data.success) {
        setMediaLibrary(response.data.data);
      }
    } catch (error) {
      console.error('Error loading media library:', error);
      toast.error('Failed to load media library');
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      await loadMediaLibrary();
      return;
    }

    try {
      const response = await axios.get(
        `${API_BASE}/cloud-gallery/search?query=${encodeURIComponent(searchQuery)}&type=${selectedType}`
      );
      
      if (response.data.success) {
        // Convert search results to same format as library
        const results = {
          images: response.data.data.filter(m => m.type === 'image') || [],
          videos: response.data.data.filter(m => m.type === 'video') || [],
          audio: response.data.data.filter(m => m.type === 'audio') || [],
          templates: response.data.data.filter(m => m.type === 'template') || []
        };
        setMediaLibrary(results);
        toast.success(`Found ${response.data.data.length} results`);
      }
    } catch (error) {
      console.error('Error searching media:', error);
      toast.error('Search failed');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', selectedType);

      const response = await axios.post(
        `${API_BASE}/cloud-gallery/upload`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );

      if (response.data.success) {
        toast.success('File uploaded successfully!');
        await loadMediaLibrary();
        // Auto-select the uploaded file in select mode
        if (mode === 'select') {
          const uploadedFile = response.data.data;
          handleMediaSelect(uploadedFile);
        }
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleMediaSelect = (media) => {
    if (multiSelect) {
      setSelectedMedia(prev => {
        const isSelected = prev.some(m => m.id === media.id);
        if (isSelected) {
          return prev.filter(m => m.id !== media.id);
        } else {
          return [...prev, media];
        }
      });
    } else {
      setSelectedMedia(media);
    }
  };

  const handleConfirm = () => {
    if (multiSelect) {
      if (selectedMedia.length === 0) {
        toast.error('Please select at least one media file');
        return;
      }
      onSelect(selectedMedia);
    } else {
      if (!selectedMedia) {
        toast.error('Please select a media file');
        return;
      }
      onSelect(selectedMedia);
    }
    onClose();
  };

  const isMediaSelected = (media) => {
    if (multiSelect) {
      return selectedMedia.some(m => m.id === media.id);
    } else {
      return selectedMedia && selectedMedia.id === media.id;
    }
  };

  const toggleFavorite = (mediaId) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(mediaId)) {
      newFavorites.delete(mediaId);
    } else {
      newFavorites.add(mediaId);
    }
    setFavorites(newFavorites);
    // Save to localStorage
    localStorage.setItem('gallery-favorites', JSON.stringify(Array.from(newFavorites)));
    toast.success(newFavorites.has(mediaId) ? '❤️ Marked as favorite' : '💔 Removed from favorites');
  };

  const isFavorite = (mediaId) => favorites.has(mediaId);

  const filterMedia = (items) => {
    if (!items) return [];
    let filtered = items;
    
    // Filter by favorites
    if (showFavoritesOnly) {
      filtered = filtered.filter(item => isFavorite(item.id));
    }
    
    // Filter by collection
    if (filterByCollection) {
      filtered = filtered.filter(item => item.collection === filterByCollection);
    }
    
    return filtered;
  };

  const getMediaIcon = (type) => {
    switch (type) {
      case 'image':
        return <ImageIcon className="w-5 h-5" />;
      case 'video':
        return <Film className="w-5 h-5" />;
      case 'audio':
        return <Music className="w-5 h-5" />;
      default:
        return <File className="w-5 h-5" />;
    }
  };

  const mediaTypes = [
    { id: 'all', label: 'All' },
    { id: 'image', label: 'Images' },
    { id: 'video', label: 'Videos' },
    { id: 'audio', label: 'Audio' },
    { id: 'file', label: 'Files' }
  ].filter(t => selectedType === 'all' || allowedTypes.includes(t.id));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-4xl h-[90vh] bg-gray-900 text-white rounded-lg shadow-2xl flex flex-col overflow-hidden border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800">
          <div className="flex items-center gap-3">
            <Cloud className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-bold">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Controls */}
        <div className="p-4 border-b border-gray-700 space-y-4 bg-gray-800">
          {/* Type Filter & View Mode */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {mediaTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  className={`px-4 py-2 rounded-lg whitespace-nowrap transition ${
                    selectedType === type.id
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className={`p-2 rounded-lg transition flex items-center gap-1 text-sm ${
                  showFavoritesOnly
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
                title="Show only favorites"
              >
                <Heart className="w-4 h-4" fill={showFavoritesOnly ? 'currentColor' : 'none'} />
                <span className="hidden sm:inline text-xs">Favorites</span>
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition ${
                  viewMode === 'grid'
                    ? 'bg-purple-600'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition ${
                  viewMode === 'list'
                    ? 'bg-purple-600'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Upload & Search */}
          <div className="flex items-center gap-2">
            {mode === 'upload' && (
              <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer transition whitespace-nowrap">
                <Upload className="w-4 h-4" />
                <span>Upload File</span>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            )}
            
            <form onSubmit={handleSearch} className="flex-1 flex items-center gap-2">
              <input
                type="text"
                placeholder="Search media..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Gallery Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin">
                <Cloud className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          ) : mediaLibrary ? (
            <div className="space-y-6">
              {/* Images Section */}
              {(selectedType === 'all' || selectedType === 'image') && 
               filterMedia(mediaLibrary.images)?.length > 0 && (
                <MediaSection
                  title="Images"
                  items={filterMedia(mediaLibrary.images)}
                  viewMode={viewMode}
                  isSelected={isMediaSelected}
                  onSelect={handleMediaSelect}
                  allowedTypes={allowedTypes}
                  onToggleFavorite={toggleFavorite}
                  isFavorite={isFavorite}
                />
              )}

              {/* Videos Section */}
              {(selectedType === 'all' || selectedType === 'video') && 
               filterMedia(mediaLibrary.videos)?.length > 0 && (
                <MediaSection
                  title="Videos"
                  items={filterMedia(mediaLibrary.videos)}
                  viewMode={viewMode}
                  isSelected={isMediaSelected}
                  onSelect={handleMediaSelect}
                  allowedTypes={allowedTypes}
                  onToggleFavorite={toggleFavorite}
                  isFavorite={isFavorite}
                />
              )}

              {/* Audio Section */}
              {(selectedType === 'all' || selectedType === 'audio') && 
               filterMedia(mediaLibrary.audio)?.length > 0 && (
                <MediaSection
                  title="Audio"
                  items={filterMedia(mediaLibrary.audio)}
                  viewMode={viewMode}
                  isSelected={isMediaSelected}
                  onSelect={handleMediaSelect}
                  allowedTypes={allowedTypes}
                  onToggleFavorite={toggleFavorite}
                  isFavorite={isFavorite}
                />
              )}

              {/* Templates Section */}
              {(selectedType === 'all' || selectedType === 'template') && 
               filterMedia(mediaLibrary.templates)?.length > 0 && (
                <MediaSection
                  title="Templates"
                  items={filterMedia(mediaLibrary.templates)}
                  viewMode={viewMode}
                  isSelected={isMediaSelected}
                  onSelect={handleMediaSelect}
                  allowedTypes={allowedTypes}
                  onToggleFavorite={toggleFavorite}
                  isFavorite={isFavorite}
                />
              )}

              {Object.keys(mediaLibrary).every(key => 
                !filterMedia(mediaLibrary[key]) || filterMedia(mediaLibrary[key]).length === 0
              ) && (
                <div className="text-center py-12 text-gray-400">
                  <Cloud className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>{showFavoritesOnly ? 'No favorite media found' : 'No media found'}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <p>Failed to load media</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 bg-gray-800 flex items-center justify-between">
          <div className="text-sm text-gray-400">
            {multiSelect 
              ? `${selectedMedia.length} file(s) selected`
              : selectedMedia 
                ? `${selectedMedia.name}`
                : 'No file selected'}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={multiSelect ? selectedMedia.length === 0 : !selectedMedia}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg transition"
            >
              {mode === 'upload' ? 'Done' : 'Select'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Media Section Component
 */
function MediaSection({ title, items, viewMode, isSelected, onSelect, allowedTypes, onToggleFavorite, isFavorite }) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {items.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              isSelected={isSelected(item)}
              onSelect={onSelect}
              allowedTypes={allowedTypes}
              onToggleFavorite={onToggleFavorite}
              isFavorite={isFavorite(item.id)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <MediaListItem
              key={item.id}
              item={item}
              isSelected={isSelected(item)}
              onSelect={onSelect}
              allowedTypes={allowedTypes}
              onToggleFavorite={onToggleFavorite}
              isFavorite={isFavorite(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Media Card Component (Grid View)
 */
function MediaCard({ item, isSelected, onSelect, allowedTypes, onToggleFavorite, isFavorite }) {
  const isAllowed = allowedTypes.includes(item.type || 'file');
  
  return (
    <div
      onClick={() => isAllowed && onSelect(item)}
      className={`rounded-lg border-2 overflow-hidden transition cursor-pointer relative ${
        isAllowed
          ? isSelected
            ? 'border-purple-600 bg-purple-900/30'
            : 'border-gray-700 hover:border-purple-500 bg-gray-800'
          : 'border-gray-700 opacity-50 cursor-not-allowed'
      }`}
    >
      {/* Thumbnail */}
      <div className="h-32 bg-gray-700 overflow-hidden relative">
        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500">
            {getTypeIcon(item.type)}
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition flex items-center justify-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(item.id);
            }}
            className={`p-2 rounded-full transition ${
              isFavorite
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart className="w-4 h-4" fill={isFavorite ? 'currentColor' : 'none'} />
          </button>
        </div>
        
        {isSelected && (
          <div className="absolute top-2 right-2">
            <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm">✓</span>
            </div>
          </div>
        )}
        
        {isFavorite && (
          <div className="absolute top-2 left-2">
            <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center">
              <Heart className="w-3 h-3 text-white" fill="white" />
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h4 className="font-semibold text-sm truncate text-white">{item.name}</h4>
        <p className="text-xs text-gray-400 mt-1">
          {(item.size / 1024 / 1024).toFixed(2)} MB
        </p>
      </div>
    </div>
  );
}

/**
 * Media List Item Component (List View)
 */
function MediaListItem({ item, isSelected, onSelect, allowedTypes, onToggleFavorite, isFavorite }) {
  const isAllowed = allowedTypes.includes(item.type || 'file');
  
  return (
    <div
      onClick={() => isAllowed && onSelect(item)}
      className={`p-4 rounded-lg border-2 flex items-center gap-4 transition ${
        isAllowed
          ? isSelected
            ? 'border-purple-600 bg-purple-900/30'
            : 'border-gray-700 hover:border-purple-500 bg-gray-800'
          : 'border-gray-700 opacity-50 cursor-not-allowed'
      }`}
    >
      {/* Checkbox */}
      <div className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 ${
        isSelected
          ? 'bg-purple-600 border-purple-600'
          : 'border-gray-600 bg-transparent'
      }`}>
        {isSelected && <span className="text-white text-sm">✓</span>}
      </div>

      {/* Thumbnail */}
      {item.thumbnail && (
        <img
          src={item.thumbnail}
          alt={item.name}
          className="w-12 h-12 object-cover rounded flex-shrink-0"
        />
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-sm truncate text-white">{item.name}</h4>
          {isFavorite && <Heart className="w-4 h-4 text-red-500 flex-shrink-0" fill="currentColor" />}
        </div>
        <p className="text-xs text-gray-400">
          {(item.size / 1024 / 1024).toFixed(2)} MB
        </p>
      </div>

      {/* Favorite Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite(item.id);
        }}
        className={`p-2 rounded-lg transition flex-shrink-0 ${
          isFavorite
            ? 'bg-red-600 hover:bg-red-700'
            : 'bg-gray-700 hover:bg-gray-600'
        }`}
        title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        <Heart className="w-4 h-4" fill={isFavorite ? 'currentColor' : 'none'} />
      </button>
    </div>
  );
}

function getTypeIcon(type) {
  switch (type) {
    case 'image':
      return '🖼️';
    case 'video':
      return '🎬';
    case 'audio':
      return '🎵';
    default:
      return '📄';
  }
}

export default GalleryDialog;
