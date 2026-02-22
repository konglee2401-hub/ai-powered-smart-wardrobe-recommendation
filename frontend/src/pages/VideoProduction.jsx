/**
 * Video Production Dashboard
 * Main page for video production system
 */

import React, { useEffect, useState } from 'react';
import useVideoProductionStore from '@/stores/videoProductionStore.js';
import { SystemStatus } from '@/components/VideoProduction/SystemStatus';
import { QueueStatus } from '@/components/VideoProduction/QueueStatus';
import { AccountCard } from '@/components/VideoProduction/AccountCard';
import { Video, Users, Library, Zap, Plus } from 'lucide-react';
import GalleryPicker from '@/components/GalleryPicker';
import toast from 'react-hot-toast';

export function VideoProduction() {
  const {
    getAllAccounts,
    getAccountStats,
    addAccount,
    accounts,
    queue,
  } = useVideoProductionStore();

  const [activeTab, setActiveTab] = useState('overview');
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);
  const [selectedMediaForVideo, setSelectedMediaForVideo] = useState(null);
  const [formData, setFormData] = useState({
    platform: 'tiktok',
    username: '',
    password: '',
    displayName: '',
    email: '',
  });

  useEffect(() => {
    getAllAccounts();
    getAccountStats();
  }, [getAllAccounts, getAccountStats]);

  const handleAddAccount = async (e) => {
    e.preventDefault();
    try {
      await addAccount(
        formData.platform,
        formData.username,
        formData.password,
        formData.displayName,
        formData.email,
        {}
      );
      toast.success('Account added successfully!');
      setFormData({ platform: 'tiktok', username: '', password: '', displayName: '', email: '' });
      setShowAddAccount(false);
    } catch (error) {
      toast.error(`Error: ${error.message}`);
    }
  };

  const handleGallerySelect = (items) => {
    // If single item (not multiselect), items will be an object
    const item = Array.isArray(items) ? items[0] : items;
    setSelectedMediaForVideo(item);
    toast.success(`Selected: ${item.name}`);
  };

  const tabButtons = [
    { id: 'overview', label: 'Overview', icon: Video },
    { id: 'accounts', label: 'Accounts', icon: Users },
    { id: 'queue', label: 'Queue', icon: Zap },
    { id: 'media', label: 'Media Library', icon: Library },
  ];

  return (
    <div className="w-full h-full bg-gray-900 text-white p-6 overflow-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Video Production System</h1>
        <p className="text-gray-400">Manage automated video generation and distribution</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-700 pb-0 overflow-x-auto">
        {tabButtons.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 font-medium flex items-center gap-2 border-b-2 transition ${
                activeTab === tab.id
                  ? 'border-purple-600 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <SystemStatus />
          <div>
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => setActiveTab('accounts')}
                className="bg-purple-600 hover:bg-purple-700 p-4 rounded-lg transition flex items-center justify-between"
              >
                <span className="font-semibold">Manage Accounts</span>
                <Users className="w-5 h-5" />
              </button>
              <button
                onClick={() => setActiveTab('queue')}
                className="bg-blue-600 hover:bg-blue-700 p-4 rounded-lg transition flex items-center justify-between"
              >
                <span className="font-semibold">View Queue</span>
                <Zap className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Accounts Tab */}
      {activeTab === 'accounts' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Connected Accounts</h2>
              <p className="text-gray-400 text-sm">
                {accounts.stats?.total || 0} total accounts across {accounts.stats?.platforms?.length || 0} platforms
              </p>
            </div>
            <button
              onClick={() => setShowAddAccount(true)}
              className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg flex items-center gap-2 transition"
            >
              <Plus className="w-4 h-4" />
              Add Account
            </button>
          </div>

          {/* Add Account Form */}
          {showAddAccount && (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h3 className="font-semibold mb-4">Add New Account</h3>
              <form onSubmit={handleAddAccount} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Platform</label>
                  <select
                    value={formData.platform}
                    onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                  >
                    <option value="tiktok">TikTok</option>
                    <option value="instagram">Instagram</option>
                    <option value="youtube">YouTube</option>
                    <option value="facebook">Facebook</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Username</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Password</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm text-gray-400 mb-2 block">Display Name</label>
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                  />
                </div>
                <div className="md:col-span-2 flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition"
                  >
                    Add Account
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddAccount(false)}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Accounts Grid */}
          {accounts.loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-gray-800 rounded-lg border border-gray-700 p-4 animate-pulse">
                  <div className="h-6 bg-gray-700 rounded w-32 mb-3"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-700 rounded"></div>
                    <div className="h-4 bg-gray-700 rounded w-4/5"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {accounts.items?.map((account) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  onDelete={() => {}}
                  onEdit={() => {}}
                  onVerify={() => {}}
                  isLoading={accounts.loading}
                />
              ))}
            </div>
          )}

          {!accounts.loading && accounts.items?.length === 0 && (
            <div className="text-center py-12 bg-gray-800/30 border border-gray-700 rounded-lg">
              <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No accounts connected yet</p>
              <p className="text-sm text-gray-500 mt-1">Add your first account to get started</p>
            </div>
          )}
        </div>
      )}

      {/* Queue Tab */}
      {activeTab === 'queue' && (
        <QueueStatus />
      )}

      {/* Media Tab */}
      {activeTab === 'media' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Media Library</h2>
              <p className="text-gray-400 text-sm">Select media from your gallery for video production</p>
            </div>
            <button
              onClick={() => setShowGalleryPicker(true)}
              className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg flex items-center gap-2 transition"
            >
              <Plus className="w-4 h-4" />
              Browse Gallery
            </button>
          </div>

          {selectedMediaForVideo && (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h3 className="font-semibold mb-3">Selected Media</h3>
              <div className="flex gap-4 items-start">
                <img 
                  src={selectedMediaForVideo.thumbnail} 
                  alt={selectedMediaForVideo.name}
                  className="w-24 h-24 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <p className="font-medium">{selectedMediaForVideo.name}</p>
                  <p className="text-sm text-gray-400 mt-1">
                    <span className="inline-block bg-purple-500/20 text-purple-300 px-2 py-1 rounded text-xs mr-2">
                      {selectedMediaForVideo.contentType}
                    </span>
                    {new Date(selectedMediaForVideo.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Size: {(selectedMediaForVideo.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedMediaForVideo(null)}
                className="mt-4 w-full bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition"
              >
                Clear Selection
              </button>
            </div>
          )}

          {!selectedMediaForVideo && (
            <div className="bg-gray-800/30 border border-gray-700 border-dashed rounded-lg p-8 text-center">
              <Library className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No media selected</p>
              <p className="text-sm text-gray-500 mt-1">Click "Browse Gallery" to select media for video production</p>
            </div>
          )}
        </div>
      )}

      {/* Gallery Picker Modal */}
      <GalleryPicker
        isOpen={showGalleryPicker}
        onClose={() => setShowGalleryPicker(false)}
        onSelect={handleGallerySelect}
        mediaType="all"
        contentType="all"
        title="Select Media for Video Production"
      />
    </div>
  );
}
