
import React, { useState, useEffect } from 'react';
import { 
  Server, Shield, Key, RefreshCw, ChevronDown, ChevronUp, 
  Trash2, Plus, GripVertical, CheckCircle, XCircle 
} from 'lucide-react';
import { api, providersAPI } from '../services/api';

/**
 * AI Provider Manager Page
 * Allows managing providers, models, API keys, and priority.
 */
export default function AIProviderManager() {
  const [providers, setProviders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState('analysis'); // analysis, image-generation, video-generation

  // Fetch data
  const loadProviders = async () => {
    setIsLoading(true);
    try {
      const response = await providersAPI.getAll();
      if (response.success) {
        setProviders(response.data);
      }
    } catch (error) {
      console.error('Failed to load providers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProviders();
  }, []);

  // Sync Models Handler
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await providersAPI.syncModels(true);
      await loadProviders(); // Reload to see updates
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Move Provider Priority (Simple Up/Down)
  const moveProvider = async (index, direction) => {
    const filteredProviders = providers.filter(p => p.capabilities[activeTab]);
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === filteredProviders.length - 1) return;

    const newOrder = [...filteredProviders];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap
    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
    
    // Optimistic UI update
    // Note: This is simplified. In a real app, we'd need to map back to the full list.
    // For now, let's just send the ID order to backend.
    
    const orderedIds = newOrder.map(p => p._id);
    
    try {
      await providersAPI.reorder(orderedIds);
      loadProviders(); // Refresh to ensure sync
    } catch (error) {
      console.error('Reorder failed:', error);
    }
  };

  // Render content
  const filteredProviders = providers.filter(p => p.capabilities[activeTab]);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Server className="w-8 h-8 text-purple-600" />
            AI Provider Management
          </h1>
          <p className="text-gray-500 mt-1">Manage AI providers, API keys, and model priorities.</p>
        </div>
        <button 
          onClick={handleSync} 
          disabled={isSyncing}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing Models...' : 'Sync Models Now'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {[
          { id: 'analysis', label: 'Vision & Analysis', icon: '👁️' },
          { id: 'image', label: 'Image Generation', icon: '🎨' },
          { id: 'video', label: 'Video Generation', icon: '🎬' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 font-medium flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === tab.id 
                ? 'border-purple-600 text-purple-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Provider List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading providers...</div>
        ) : filteredProviders.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500">No providers found for this category.</p>
          </div>
        ) : (
          filteredProviders.map((provider, index) => (
            <ProviderCard 
              key={provider._id} 
              provider={provider} 
              index={index}
              onMove={moveProvider}
              onRefresh={loadProviders}
            />
          ))
        )}
      </div>
    </div>
  );
}

/**
 * Individual Provider Card Component
 */
function ProviderCard({ provider, index, onMove, onRefresh }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newKey, setNewKey] = useState('');

  const toggleEnabled = async () => {
    try {
      await providersAPI.update(provider._id, { isEnabled: !provider.isEnabled });
      onRefresh();
    } catch (error) {
      console.error('Update failed:', error);
    }
  };

  const addKey = async () => {
    if (!newKey.trim()) return;
    try {
      await providersAPI.addKey(provider._id, newKey, `Key ${provider.apiKeysCount + 1}`);
      setNewKey('');
      onRefresh();
    } catch (error) {
      console.error('Add key failed:', error);
    }
  };

  const removeKey = async (keyId) => {
    if (!confirm('Are you sure you want to remove this API key?')) return;
    try {
      await providersAPI.removeKey(provider._id, keyId);
      onRefresh();
    } catch (error) {
      console.error('Remove key failed:', error);
    }
  };

  return (
    <div className={`bg-white rounded-xl border transition-all ${provider.isEnabled ? 'border-gray-200 shadow-sm' : 'border-gray-200 opacity-75 bg-gray-50'}`}>
      {/* Header Row */}
      <div className="flex items-center p-4 gap-4">
        {/* Drag Handle / Priority */}
        <div className="flex flex-col items-center gap-1 text-gray-400">
          <button onClick={() => onMove(index, 'up')} className="hover:text-purple-600"><ChevronUp size={16} /></button>
          <span className="text-xs font-bold text-gray-500">{index + 1}</span>
          <button onClick={() => onMove(index, 'down')} className="hover:text-purple-600"><ChevronDown size={16} /></button>
        </div>

        {/* Provider Info */}
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-lg text-gray-800">{provider.name}</h3>
            <span className={`px-2 py-0.5 text-xs rounded-full ${provider.isEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
              {provider.isEnabled ? 'Active' : 'Disabled'}
            </span>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
              {provider.providerId}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
            <span className="flex items-center gap-1"><Shield size={12} /> {provider.models.length} Models</span>
            <span className="flex items-center gap-1"><Key size={12} /> {provider.apiKeys.length} Keys</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleEnabled}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg border ${
              provider.isEnabled 
                ? 'border-red-200 text-red-600 hover:bg-red-50' 
                : 'border-green-200 text-green-600 hover:bg-green-50'
            }`}
          >
            {provider.isEnabled ? 'Disable' : 'Enable'}
          </button>
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
          >
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-gray-100 p-6 bg-gray-50/50 space-y-6">
          
          {/* API Keys Section */}
          <div>
            <h4 className="font-semibold text-gray-700 flex items-center gap-2 mb-3">
              <Key size={16} /> API Keys
            </h4>
            <div className="space-y-2 mb-3">
              {provider.apiKeys.map((key) => (
                <div key={key._id} className="flex items-center justify-between bg-white p-3 rounded border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${key.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="font-mono text-sm text-gray-600">{key.label}</span>
                    <span className="font-mono text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{key.key}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Failures: {key.failures || 0}</span>
                    <button onClick={() => removeKey(key._id)} className="text-red-500 hover:text-red-700">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex gap-2">
              <input 
                type="password" 
                placeholder="Enter new API Key..." 
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
              />
              <button 
                onClick={addKey}
                disabled={!newKey}
                className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50"
              >
                Add Key
              </button>
            </div>
          </div>

          {/* Models Section */}
          <div>
            <h4 className="font-semibold text-gray-700 flex items-center gap-2 mb-3">
              <Server size={16} /> Models
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {provider.models.map(model => (
                <div key={model._id} className="bg-white p-3 rounded border border-gray-200 flex justify-between items-center">
                  <div>
                    <div className="font-medium text-sm text-gray-800">{model.name}</div>
                    <div className="text-xs text-gray-500 font-mono">{model.modelId}</div>
                  </div>
                  <div className={`px-2 py-0.5 text-[10px] rounded-full uppercase font-bold ${model.status.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {model.status.available ? 'Ready' : 'Offline'}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
