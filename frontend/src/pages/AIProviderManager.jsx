
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Server, Shield, Key, RefreshCw, ChevronDown, ChevronUp, 
  Trash2, Plus, GripVertical, CheckCircle, XCircle, Zap, Play, 
  AlertCircle, Loader2, Clock, TrendingUp, Download, Brain, Settings
} from 'lucide-react';
import { api, providersAPI } from '../services/api';
import { testProvider, getProviderStatus } from '../services/productPhotoService';
import PageHeaderBar from '../components/PageHeaderBar';
import EmptyState from '../components/ui/EmptyState';
import { SkeletonBlock } from '../components/ui/Skeleton';

/**
 * AI Provider Manager Page
 * Unified provider management, settings, and testing
 */
export default function AIProviderManager() {
  const { t } = useTranslation();
  const [providers, setProviders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState('manage'); // manage, test
  const [activeCategory, setActiveCategory] = useState('analysis'); // analysis, image, video

  // Test state
  const [selectedProviderForTest, setSelectedProviderForTest] = useState(null);
  const [testResults, setTestResults] = useState([]);
  const [testing, setTesting] = useState(false);
  const [currentTest, setCurrentTest] = useState(null);

  // Fetch data
  const loadProviders = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  // Sync Models Handler
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await providersAPI.syncModels(true);
      await loadProviders();
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Test Provider Handler
  const handleTestProvider = async (providerId) => {
    setTesting(true);
    setCurrentTest(providerId);
    
    const startTime = Date.now();
    
    try {
      const result = await testProvider(providerId);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      setTestResults(prev => [{
        providerId,
        success: result.success,
        duration,
        timestamp: new Date().toISOString(),
        data: result.data,
      }, ...prev]);
      
    } catch (error) {
      console.error('[Test Provider Error]', error);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      setTestResults(prev => [{
        providerId,
        success: false,
        duration,
        timestamp: new Date().toISOString(),
        error: error.message,
      }, ...prev]);
    } finally {
      setTesting(false);
      setCurrentTest(null);
    }
  };

  // Move Provider Priority (Simple Up/Down)
  const moveProvider = async (index, direction) => {
    const filteredProviders = providers.filter(p => p.capabilities?.[activeCategory]);
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === filteredProviders.length - 1) return;

    const newOrder = [...filteredProviders];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
    
    const orderedIds = newOrder.map(p => p._id);
    
    try {
      await providersAPI.reorder(orderedIds);
      await loadProviders();
    } catch (error) {
      console.error('Reorder failed:', error);
    }
  };

  // Export results to CSV
  const exportResults = () => {
    const csv = [
      ['Provider', 'Success', 'Duration (ms)', 'Timestamp', 'Error'],
      ...testResults.map(r => [
        r.providerId,
        r.success ? 'Yes' : 'No',
        r.duration,
        r.timestamp,
        r.error || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `provider-test-results-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  // Render content
  const filteredProviders = providers.filter(p => p.capabilities?.[activeCategory]);
  const successfulTests = testResults.filter(r => r.success);
  const failedTests = testResults.filter(r => !r.success);
  const avgDuration = successfulTests.length > 0
    ? successfulTests.reduce((sum, r) => sum + r.duration, 0) / successfulTests.length
    : 0;


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-850 py-6 px-4 sm:px-6 lg:px-8">
      <PageHeaderBar 
        title="AI Providers"
        subtitle="Manage providers, API keys, settings, and test performance"
        icon={<Server className="h-4 w-4 text-amber-400" />}
      />

      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Tab Navigation */}
        <div className="flex gap-3 flex-wrap">
          {[
            { id: 'manage', label: 'Manage Providers', icon: Settings },
            { id: 'test', label: 'Test Providers', icon: Zap }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-400/20 to-amber-300/10 border border-amber-400/40 text-amber-100'
                    : 'bg-slate-800/30 border border-slate-700/50 text-slate-300 hover:border-slate-600/50 hover:bg-slate-800/40'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Provider Category Selector */}
        <div className="flex gap-3 flex-wrap">
          {[
            { id: 'analysis', label: '👁️ Vision & Analysis' },
            { id: 'image', label: '🎨 Image Gen' },
            { id: 'video', label: '🎬 Video Gen' }
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeCategory === cat.id
                  ? 'bg-gradient-to-r from-violet-400/20 to-violet-300/10 border border-violet-400/40 text-violet-100'
                  : 'bg-slate-800/30 border border-slate-700/50 text-slate-300 hover:border-slate-600/50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Manage Tab */}
        {activeTab === 'manage' && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-100">Provider Management</h2>
              <button 
                onClick={handleSync} 
                disabled={isSyncing}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg hover:from-emerald-600 hover:to-teal-600 transition-all disabled:opacity-50 font-medium"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing...' : 'Sync Models'}
              </button>
            </div>

            {/* Providers List */}
            <div className="space-y-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
                </div>
              ) : filteredProviders.length === 0 ? (
                <div className="rounded-2xl border border-slate-700/50 bg-slate-800/20 p-8 text-center">
                  <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-300">No providers available for this category</p>
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
        )}

        {/* Test Tab */}
        {activeTab === 'test' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            {/* Left Column - Providers */}
            <div className="lg:col-span-1 space-y-4">
              <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-sm p-6">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-100 mb-4">
                  <Zap className="w-5 h-5 text-amber-400" />
                  Providers
                </h3>
                
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
                  </div>
                ) : filteredProviders.length === 0 ? (
                  <p className="text-center text-slate-400 py-6">No providers available</p>
                ) : (
                  <div className="space-y-2">
                    {filteredProviders.map(provider => (
                      <button
                        key={provider._id}
                        onClick={() => setSelectedProviderForTest(provider._id)}
                        className={`w-full p-3 rounded-xl border transition-all text-left ${
                          selectedProviderForTest === provider._id
                            ? 'border-violet-400/50 bg-violet-400/10 text-violet-100'
                            : 'border-slate-700/50 bg-slate-800/20 text-slate-300 hover:border-slate-600/50'
                        }`}
                      >
                        <div className="font-medium">{provider.name}</div>
                        <div className="text-xs text-slate-400 mt-1">
                          {provider.isEnabled ? (
                            <span className="text-emerald-400">✓ Active</span>
                          ) : (
                            <span className="text-red-400">✕ Disabled</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Stats */}
              {testResults.length > 0 && (
                <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-sm p-6">
                  <h3 className="font-semibold text-slate-100 mb-4">Statistics</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-slate-700/20 rounded-lg">
                      <span className="text-sm text-slate-300">Total Tests:</span>
                      <span className="font-bold text-slate-100">{testResults.length}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-emerald-500/10 rounded-lg">
                      <span className="text-sm text-emerald-200">
                        <CheckCircle className="w-4 h-4 inline mr-1" />
                        Success:
                      </span>
                      <span className="font-bold text-emerald-300">{successfulTests.length}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-red-500/10 rounded-lg">
                      <span className="text-sm text-red-200">
                        <XCircle className="w-4 h-4 inline mr-1" />
                        Failed:
                      </span>
                      <span className="font-bold text-red-300">{failedTests.length}</span>
                    </div>
                    {successfulTests.length > 0 && (
                      <div className="flex items-center justify-between p-3 bg-blue-500/10 rounded-lg">
                        <span className="text-sm text-blue-200">
                          <TrendingUp className="w-4 h-4 inline mr-1" />
                          Avg Time:
                        </span>
                        <span className="font-bold text-blue-300">{avgDuration.toFixed(0)}ms</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Middle Column - Test Control */}
            <div className="lg:col-span-1">
              <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-sm p-6">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-100 mb-4">
                  <Brain className="w-5 h-5 text-violet-400" />
                  Quick Test
                </h3>
                
                {selectedProviderForTest ? (
                  <button
                    onClick={() => handleTestProvider(selectedProviderForTest)}
                    disabled={testing && currentTest === selectedProviderForTest}
                    className="w-full px-4 py-3 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl hover:from-violet-600 hover:to-purple-600 transition-all disabled:from-slate-600 disabled:to-slate-600 flex items-center justify-center gap-2 font-medium"
                  >
                    {testing && currentTest === selectedProviderForTest ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        Run Test
                      </>
                    )}
                  </button>
                ) : (
                  <p className="text-center text-slate-400 py-6">Select a provider to test</p>
                )}
              </div>
            </div>

            {/* Right Column - Results */}
            <div className="lg:col-span-1">
              <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-sm p-6 h-full flex flex-col">
                <h3 className="flex items-center justify-between mb-4">
                  <span className="flex items-center gap-2 text-lg font-semibold text-slate-100">
                    <Clock className="w-5 h-5 text-sky-400" />
                    Results
                  </span>
                  {testResults.length > 0 && (
                    <span className="text-xs text-slate-400">{testResults.length} tests</span>
                  )}
                </h3>

                {testResults.length === 0 ? (
                  <p className="text-center text-slate-400 py-8">No test results yet</p>
                ) : (
                  <div className="space-y-2 flex-1 overflow-y-auto">
                    {testResults.map((result, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border text-sm ${
                          result.success
                            ? 'border-emerald-500/30 bg-emerald-500/10'
                            : 'border-red-500/30 bg-red-500/10'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {result.success ? (
                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-400" />
                          )}
                          <span className={result.success ? 'text-emerald-200' : 'text-red-200'}>
                            {result.providerId}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-400">
                          <Clock className="w-3 h-3" />
                          {result.duration}ms
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {testResults.length > 0 && (
                  <div className="flex gap-2 mt-4 pt-4 border-t border-slate-700/50">
                    <button
                      onClick={exportResults}
                      className="flex-1 px-3 py-2 bg-emerald-500/20 text-emerald-200 rounded-lg hover:bg-emerald-500/30 transition-all text-sm font-medium"
                    >
                      <Download className="w-4 h-4 inline mr-1" />
                      Export
                    </button>
                    <button
                      onClick={clearResults}
                      className="flex-1 px-3 py-2 bg-slate-700/30 text-slate-300 rounded-lg hover:bg-slate-700/50 transition-all text-sm font-medium"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
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
  const [isSaving, setIsSaving] = useState(false);

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
    setIsSaving(true);
    try {
      await providersAPI.addKey(provider._id, newKey, `Key ${(provider.apiKeys?.length || 0) + 1}`);
      setNewKey('');
      onRefresh();
    } catch (error) {
      console.error('Add key failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const removeKey = async (keyId) => {
    if (!confirm('Remove this API key?')) return;
    try {
      await providersAPI.removeKey(provider._id, keyId);
      onRefresh();
    } catch (error) {
      console.error('Remove key failed:', error);
    }
  };

  return (
    <div className={`rounded-2xl border transition-all backdrop-blur-sm ${
      provider.isEnabled
        ? 'border-slate-700/50 bg-slate-800/30 hover:border-slate-600/50'
        : 'border-slate-700/30 bg-slate-900/20 opacity-60'
    }`}>
      {/* Header Row */}
      <div className="flex items-center gap-4 p-4 border-b border-slate-700/30">
        {/* Priority Controls */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={() => onMove(index, 'up')}
            disabled={index === 0}
            className="p-1 text-slate-400 hover:text-amber-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronUp size={16} />
          </button>
          <span className="text-xs font-semibold text-slate-500">{index + 1}</span>
          <button
            onClick={() => onMove(index, 'down')}
            className="p-1 text-slate-400 hover:text-amber-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronDown size={16} />
          </button>
        </div>

        {/* Provider Info */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="font-bold text-slate-100">{provider.name}</h3>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              provider.isEnabled
                ? 'bg-emerald-500/20 text-emerald-200'
                : 'bg-slate-700/30 text-slate-400'
            }`}>
              {provider.isEnabled ? '✓ Active' : '✕ Disabled'}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-400">
            <span className="flex items-center gap-1">
              <Shield size={14} />
              {provider.models?.length || 0} Models
            </span>
            <span className="flex items-center gap-1">
              <Key size={14} />
              {provider.apiKeys?.length || 0} Keys
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleEnabled}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-all ${
              provider.isEnabled
                ? 'border-red-500/40 text-red-300 hover:bg-red-500/10'
                : 'border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10'
            }`}
          >
            {provider.isEnabled ? 'Disable' : 'Enable'}
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700/30 rounded-lg transition-all"
          >
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-slate-700/30 p-6 space-y-6 bg-slate-900/20">
          
          {/* API Keys Section */}
          <div>
            <h4 className="font-semibold text-slate-100 flex items-center gap-2 mb-3">
              <Key size={16} className="text-amber-400" />
              API Keys & Settings
            </h4>
            
            {provider.apiKeys && provider.apiKeys.length > 0 && (
              <div className="space-y-2 mb-4">
                {provider.apiKeys.map((key) => (
                  <div
                    key={key._id}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-700/50 bg-slate-800/40"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        key.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'
                      }`} />
                      <div>
                        <div className="text-sm font-mono text-slate-300">{key.label}</div>
                        <div className="text-xs text-slate-500">****{key.key?.slice(-4)}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeKey(key._id)}
                      className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="Add new API key..."
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !isSaving && addKey()}
                className="flex-1 px-3 py-2 text-sm bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-100 placeholder-slate-500 focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/20 outline-none transition-all"
              />
              <button
                onClick={addKey}
                disabled={!newKey || isSaving}
                className="px-3 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 rounded-lg hover:from-amber-600 hover:to-yellow-600 transition-all disabled:opacity-50 font-medium text-sm"
              >
                {isSaving ? '...' : 'Add'}
              </button>
            </div>
          </div>

          {/* Models Section */}
          {provider.models && provider.models.length > 0 && (
            <div>
              <h4 className="font-semibold text-slate-100 flex items-center gap-2 mb-3">
                <Server size={16} className="text-blue-400" />
                Available Models
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {provider.models.map(model => (
                  <div
                    key={model._id}
                    className="p-3 rounded-lg border border-slate-700/50 bg-slate-800/40 flex justify-between items-start"
                  >
                    <div>
                      <div className="font-medium text-sm text-slate-100">{model.name}</div>
                      <div className="text-xs text-slate-500 font-mono mt-1">{model.modelId}</div>
                    </div>
                    <div className={`px-2 py-0.5 text-[10px] rounded-full font-bold whitespace-nowrap ${
                      model.status?.available
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-red-500/20 text-red-300'
                    }`}>
                      {model.status?.available ? 'Ready' : 'Offline'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
