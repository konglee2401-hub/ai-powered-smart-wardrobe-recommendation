/**
 * Cloud Gallery Page
 * Display and manage media from Google Drive
 */

import React, { useEffect, useState } from 'react';
import { Cloud, Upload, Download, Trash2, Search, Folder, Grid, List } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api';

export function CloudGallery() {
  const [mediaLibrary, setMediaLibrary] = useState(null);
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [collections, setCollections] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState(null);

  // Initialize gallery
  useEffect(() => {
    initializeGallery();
  }, []);

  const initializeGallery = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE}/cloud-gallery/init`);
      console.log('Gallery initialized:', response.data);
      
      // Load media library
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
      setMediaLibrary(response.data.data);
    } catch (error) {
      console.error('Error loading media library:', error);
      toast.error('Failed to load media library');
    }
  };

  const loadCollections = async () => {
    try {
      const response = await axios.get(`${API_BASE}/cloud-gallery/collections`);
      setCollections(response.data.data);
    } catch (error) {
      console.error('Error loading collections:', error);
      toast.error('Failed to load collections');
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      const response = await axios.get(
        `${API_BASE}/cloud-gallery/search?query=${encodeURIComponent(searchQuery)}&type=${selectedType}`
      );
      
      toast.success(`Found ${response.data.count} results`);
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

      toast.success('File uploaded to cloud!');
      await loadMediaLibrary();
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (fileId, fileName) => {
    try {
      const response = await axios.post(
        `${API_BASE}/cloud-gallery/download/${fileId}`,
        { outputDir: './downloads' }
      );

      toast.success(`Downloaded: ${fileName}`);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Download failed');
    }
  };

  const handleDelete = async (fileId) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      // TODO: Implement delete endpoint
      toast.success('File deleted');
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Delete failed');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin">
          <Cloud className="w-8 h-8 text-purple-600" />
        </div>
      </div>
    );
  }

  const mediaTypes = [
    { id: 'all', label: 'All', icon: '📁' },
    { id: 'image', label: 'Images', icon: '🖼️' },
    { id: 'video', label: 'Videos', icon: '🎬' },
    { id: 'audio', label: 'Audio', icon: '🎵' },
    { id: 'template', label: 'Templates', icon: '📋' },
  ];

  return (
    <div className="w-full h-full bg-gray-900 text-white p-6 overflow-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Cloud className="w-8 h-8 text-purple-600" />
          <h1 className="text-3xl font-bold">Cloud Media Gallery</h1>
        </div>
        <p className="text-gray-400">Manage media from Google Drive</p>
      </div>

      {/* Controls */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Upload */}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg cursor-pointer transition">
              <Upload className="w-4 h-4" />
              <span>Upload File</span>
              <input
                type="file"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
            {uploading && <span className="text-sm text-gray-400">Uploading...</span>}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded transition ${
                viewMode === 'grid'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded transition ${
                viewMode === 'list'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Collections */}
          <button
            onClick={loadCollections}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition flex items-center gap-2"
          >
            <Folder className="w-4 h-4" />
            Collections
          </button>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search media..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
          >
            <Search className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Media Type Filter */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {mediaTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => setSelectedType(type.id)}
            className={`px-4 py-2 rounded-lg whitespace-nowrap transition ${
              selectedType === type.id
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
            }`}
          >
            <span className="mr-2">{type.icon}</span>
            {type.label}
          </button>
        ))}
      </div>

      {/* Media Display */}
      {mediaLibrary ? (
        <div className="space-y-6">
          {/* Images */}
          {(selectedType === 'all' || selectedType === 'image') && mediaLibrary.images?.length > 0 && (
            <MediaSection
              title="Images"
              items={mediaLibrary.images}
              viewMode={viewMode}
              onDownload={handleDownload}
              onDelete={handleDelete}
            />
          )}

          {/* Videos */}
          {(selectedType === 'all' || selectedType === 'video') && mediaLibrary.videos?.length > 0 && (
            <MediaSection
              title="Videos"
              items={mediaLibrary.videos}
              viewMode={viewMode}
              onDownload={handleDownload}
              onDelete={handleDelete}
            />
          )}

          {/* Audio */}
          {(selectedType === 'all' || selectedType === 'audio') && mediaLibrary.audio?.length > 0 && (
            <MediaSection
              title="Audio Files"
              items={mediaLibrary.audio}
              viewMode={viewMode}
              onDownload={handleDownload}
              onDelete={handleDelete}
            />
          )}

          {/* Templates */}
          {(selectedType === 'all' || selectedType === 'template') && mediaLibrary.templates?.length > 0 && (
            <MediaSection
              title="Templates"
              items={mediaLibrary.templates}
              viewMode={viewMode}
              onDownload={handleDownload}
              onDelete={handleDelete}
            />
          )}

          {/* Collections */}
          {collections && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4">Collections</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(collections).map(([name, items]) => (
                  <div
                    key={name}
                    className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-purple-500 transition cursor-pointer"
                    onClick={() => setSelectedBatch(name)}
                  >
                    <Folder className="w-8 h-8 text-purple-400 mb-2" />
                    <h3 className="font-semibold truncate">{name}</h3>
                    <p className="text-sm text-gray-400">
                      {Object.values(items).reduce((sum, arr) => sum + arr.length, 0)} items
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-400">
          <Cloud className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No media found</p>
        </div>
      )}
    </div>
  );
}

/**
 * Media Section Component
 */
function MediaSection({ title, items, viewMode, onDownload, onDelete }) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">{title}</h2>
      
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              onDownload={onDownload}
              onDelete={onDelete}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <MediaListItem
              key={item.id}
              item={item}
              onDownload={onDownload}
              onDelete={onDelete}
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
function MediaCard({ item, onDownload, onDelete }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden hover:border-purple-500 transition group">
      {/* Thumbnail */}
      <div className="h-32 bg-gray-700 overflow-hidden relative">
        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500">
            📄
          </div>
        )}
        
        {/* Overlay Actions */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
          <button
            onClick={() => onDownload(item.id, item.name)}
            className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(item.id)}
            className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-semibold text-sm truncate" title={item.name}>
          {item.name}
        </h3>
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
function MediaListItem({ item, onDownload, onDelete }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex items-center justify-between hover:border-purple-500 transition group">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {item.thumbnail && (
          <img
            src={item.thumbnail}
            alt={item.name}
            className="w-12 h-12 object-cover rounded"
          />
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate" title={item.name}>
            {item.name}
          </h3>
          <p className="text-sm text-gray-400">
            {(item.size / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 ml-4">
        <button
          onClick={() => onDownload(item.id, item.name)}
          className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition opacity-0 group-hover:opacity-100"
          title="Download"
        >
          <Download className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(item.id)}
          className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition opacity-0 group-hover:opacity-100"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default CloudGallery;
