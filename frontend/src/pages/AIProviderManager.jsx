import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Server, Shield, Key, RefreshCw, ChevronDown, ChevronUp, 
  Trash2, Plus, GripVertical, CheckCircle, XCircle, Zap, Play, 
  AlertCircle, Loader2, Clock, TrendingUp, Download, Brain, Settings,
  Search, ChevronRight
} from 'lucide-react';
import { api, providersAPI } from '../services/api';
import { testProvider, getProviderStatus } from '../services/productPhotoService';
import PageHeaderBar from '../components/PageHeaderBar';

/**
 * AI Provider Manager - Redesigned with Design System
 * Dark mode theme with consistent styling
 */
export default function AIProviderManager() {
  const { t } = useTranslation();
  const [providers, setProviders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('manage');
  const [activeCategory, setActiveCategory] = useState('analysis');
  const [searchFilter, setSearchFilter] = useState('');
  
  const [selectedProviderId, setSelectedProviderId] = useState(null);
  const [testResults, setTestResults] = useState([]);
  const [testing, setTesting] = useState(false);
  const [currentTest, setCurrentTest] = useState(null);
  const [testMode, setTestMode] = useState('lightweight');
  const [testingAll, setTestingAll] = useState(false);

  const [syncingKeys, setSyncingKeys] = useState(false);
  const [syncResults, setSyncResults] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const [message, setMessage] = useState('');

  // Load providers
  const loadProviders = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await providersAPI.getAll();
      const data = response.success && response.data ? response.data : Array.isArray(response) ? response : [];
      setProviders(data);
    } catch (error) {
      console.error('Failed to load providers:', error);
      setProviders([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  const handleTestProvider = async (providerId) => {
    setTesting(true);
    setCurrentTest(providerId);
    const startTime = Date.now();
    
    try {
      const result = await testProvider(providerId, testMode);
      const endTime = Date.now();
      setTestResults(prev => [{
        providerId,
        success: result.success,
        duration: endTime - startTime,
        timestamp: new Date().toISOString(),
        data: result.data,
        testMode,
      }, ...prev]);
    } catch (error) {
      const endTime = Date.now();
      setTestResults(prev => [{
        providerId,
        success: false,
        duration: endTime - startTime,
        timestamp: new Date().toISOString(),
        error: error.message,
        testMode,
      }, ...prev]);
    } finally {
      setTesting(false);
      setCurrentTest(null);
    }
  };

  const handleTestAll = async () => {
    setTestingAll(true);
    const newResults = [];

    for (const provider of providers) {
      try {
        setCurrentTest(provider._id);
        const result = await testProvider(provider._id, testMode);
        const startTime = Date.now();
        const endTime = Date.now();
        newResults.push({
          providerId: provider._id,
          success: result.success,
          duration: endTime - startTime,
          timestamp: new Date().toISOString(),
          data: result.data,
          testMode,
        });
      } catch (error) {
        newResults.push({
          providerId: provider._id,
          success: false,
          duration: 0,
          timestamp: new Date().toISOString(),
          error: error.message,
          testMode,
        });
      }
    }

    setTestResults(prev => [...newResults, ...prev]);
    setTestingAll(false);
    setCurrentTest(null);
  };

  const handleSyncKeys = async () => {
    setSyncingKeys(true);
    setSyncError(null);
    setSyncResults(null);
    
    try {
      const response = await api.post('/providers/sync-keys', { force: false });
      setSyncResults(response);
      setMessage('Keys synced successfully');
      await new Promise(r => setTimeout(r, 1000));
      await loadProviders();
    } catch (error) {
      setSyncError(error.message || 'Failed to sync keys');
    } finally {
      setSyncingKeys(false);
    }
  };

  const filteredProviders = providers
    .filter(p => p.capabilities?.[activeCategory])
    .filter(p => p.name?.toLowerCase().includes(searchFilter.toLowerCase()));

  const selected = providers.find(p => p._id === selectedProviderId);
  const successfulTests = testResults.filter(r => r.success);
  const failedTests = testResults.filter(r => !r.success);

  return (
    <div className="page-shell -mx-5 -mb-5 -mt-5 grid min-h-0 grid-rows-[auto,minmax(0,1fr)] overflow-hidden lg:-mx-6 lg:-mb-6 lg:-mt-6">
      {/* Header */}
      <PageHeaderBar 
        icon={<Server className="h-4 w-4 text-sky-400" />}
        title="AI Providers"
        meta="Manage API keys, settings, and test provider performance"
        className="h-16"
      />

      {/* Content */}
      <div className="min-h-0 overflow-y-auto px-5 py-4 lg:px-6">
        <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-6">
          
          {/* Message */}
          {message && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              âœ… {message}
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex gap-2 border-b border-slate-800">
            {['manage', 'test', 'sync'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm font-medium transition border-b-2 -mb-px ${
                  activeTab === tab
                    ? 'border-sky-500 text-sky-300'
                    : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Main Grid */}
          <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
            
            {/* Sidebar - Provider List */}
            <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="space-y-3">
                {/* Search */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-3 text-slate-500" />
                  <input 
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Search providers..." 
                    className="w-full rounded-xl border border-slate-800 bg-slate-900/50 py-2 pl-9 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:border-sky-500/50 focus:outline-none"
                  />
                </div>

                {/* Category Filter */}
                <div className="grid grid-cols-2 gap-2">
                  {['analysis', 'image', 'video'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`rounded-xl px-3 py-2 text-xs font-medium transition ${
                        activeCategory === cat
                          ? 'bg-sky-500/20 border border-sky-500/50 text-sky-200'
                          : 'bg-slate-900/50 border border-slate-800 text-slate-400 hover:text-slate-300'
                      }`}
                    >
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Provider List */}
              <div className="max-h-[calc(100vh-400px)] space-y-2 overflow-y-auto pr-1">
                {isLoading ? (
                  <div className="py-8 text-center text-slate-400">
                    <Loader2 className="inline animate-spin mb-2" size={20} />
                    <p className="text-xs">Loading providers...</p>
                  </div>
                ) : filteredProviders.length === 0 ? (
                  <div className="py-8 text-center text-slate-400">
                    <p className="text-xs">No providers found</p>
                  </div>
                ) : (
                  filteredProviders.map(provider => (
                    <button
                      key={provider._id}
                      onClick={() => {
                        setSelectedProviderId(provider._id);
                        setActiveTab('manage');
                      }}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        selectedProviderId === provider._id
                          ? 'border-sky-500/50 bg-sky-950/30'
                          : 'border-slate-800 bg-slate-900/30 hover:bg-slate-900/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-slate-100">
                            {provider.name}
                          </div>
                          <div className="mt-1 text-xs text-slate-400">
                            {provider.capabilities?.analysis ? 'ðŸ“Š' : ''}
                            {provider.capabilities?.image ? 'ðŸ–¼ï¸' : ''}
                            {provider.capabilities?.video ? 'ðŸ“¹' : ''}
                          </div>
                        </div>
                        {provider.isEnabled && (
                          <div className="flex-shrink-0 inline-block rounded px-1.5 py-0.5 bg-emerald-500/20 text-[0.65rem] text-emerald-200 font-medium">
                            Active
                          </div>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Main Area */}
            <div className="space-y-4">
              {activeTab === 'manage' ? (
                <ProviderDetailView 
                  provider={selected} 
                  onUpdate={() => loadProviders()}
                />
              ) : activeTab === 'test' ? (
                <ProviderTestView
                  providers={filteredProviders}
                  testResults={testResults}
                  testing={testing}
                  testingAll={testingAll}
                  currentTest={currentTest}
                  testMode={testMode}
                  onTestOne={handleTestProvider}
                  onTestAll={handleTestAll}
                  onTestModeChange={setTestMode}
                />
              ) : (
                <ProviderSyncView
                  syncingKeys={syncingKeys}
                  syncResults={syncResults}
                  syncError={syncError}
                  onSync={handleSyncKeys}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-components
function ProviderDetailView({ provider, onUpdate }) {
  if (!provider) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-8 text-center">
        <p className="text-slate-400">Select a provider to view details</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
      <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Provider Details</div>
          <h2 className="mt-2 text-2xl font-semibold text-slate-100">{provider.name}</h2>
        </div>
        <div className="inline-block rounded-xl px-3 py-1.5 bg-sky-500/20 border border-sky-500/30 text-xs font-medium text-sky-200">
          {provider.isEnabled ? 'âœ“ Active' : 'â—‹ Inactive'}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs uppercase tracking-[0.18em] text-slate-500 font-medium">Description</label>
          <p className="mt-2 text-slate-300">{provider.description || 'No description'}</p>
        </div>

        <div>
          <label className="text-xs uppercase tracking-[0.18em] text-slate-500 font-medium">Capabilities</label>
          <div className="mt-2 flex gap-2">
            {provider.capabilities?.analysis && (
              <span className="inline-block rounded-lg px-3 py-1 bg-slate-700/50 text-xs text-slate-200">Analysis</span>
            )}
            {provider.capabilities?.image && (
              <span className="inline-block rounded-lg px-3 py-1 bg-slate-700/50 text-xs text-slate-200">Image Generation</span>
            )}
            {provider.capabilities?.video && (
              <span className="inline-block rounded-lg px-3 py-1 bg-slate-700/50 text-xs text-slate-200">Video</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProviderTestView({ 
  providers, 
  testResults, 
  testing, 
  testingAll, 
  currentTest, 
  testMode,
  onTestOne, 
  onTestAll, 
  onTestModeChange 
}) {
  const successCount = testResults.filter(r => r.success).length;
  const failureCount = testResults.filter(r => !r.success).length;

  return (
    <div className="space-y-4">
      {/* Test Controls */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.18em] text-slate-500 font-medium">Test Mode</label>
            <select
              value={testMode}
              onChange={(e) => onTestModeChange(e.target.value)}
              className="rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm text-slate-200 focus:border-sky-500/50 focus:outline-none"
            >
              <option value="lightweight">Lightweight (Fast)</option>
              <option value="full">Full Testing</option>
            </select>
          </div>
          <button
            onClick={onTestAll}
            disabled={testingAll || providers.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500/20 border border-sky-500/50 text-sky-200 font-medium hover:bg-sky-500/30 disabled:opacity-50 transition"
          >
            {testingAll ? <Loader2 className="animate-spin" size={16} /> : <Zap size={16} />}
            Test All
          </button>
        </div>
      </div>

      {/* Test Results Stats */}
      {testResults.length > 0 && (
        <div className="grid grid-cols-3 gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
          <div className="rounded-xl bg-slate-900/50 p-3 text-center">
            <div className="text-2xl font-bold text-slate-100">{testResults.length}</div>
            <div className="text-xs text-slate-400 mt-1">Total Tests</div>
          </div>
          <div className="rounded-xl bg-emerald-500/10 p-3 text-center border border-emerald-500/20">
            <div className="text-2xl font-bold text-emerald-200">{successCount}</div>
            <div className="text-xs text-emerald-300 mt-1">Successful</div>
          </div>
          <div className="rounded-xl bg-violet-500/10 p-3 text-center border border-violet-500/20">
            <div className="text-2xl font-bold text-violet-200">{failureCount}</div>
            <div className="text-xs text-violet-300 mt-1">Failed</div>
          </div>
        </div>
      )}

      {/* Test Results List */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
        <h3 className="text-sm font-semibold text-slate-100 mb-4">Test Results</h3>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {testResults.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">No test results yet</p>
          ) : (
            testResults.map((result, idx) => (
              <div key={idx} className="rounded-lg bg-slate-900/50 p-3 border border-slate-800/50">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="text-xs font-medium text-slate-200">
                      {providers.find(p => p._id === result.providerId)?.name || result.providerId}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {new Date(result.timestamp).toLocaleTimeString()} â€¢ {result.duration}ms
                    </div>
                  </div>
                  <div className={`text-xs font-medium px-2 py-1 rounded ${
                    result.success 
                      ? 'bg-emerald-500/20 text-emerald-200' 
                      : 'bg-violet-500/20 text-violet-200'
                  }`}>
                    {result.success ? 'âœ“' : 'âœ—'}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function ProviderSyncView({ syncingKeys, syncResults, syncError, onSync }) {
  return (
    <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
      <div className="border-b border-slate-800 pb-4">
        <h3 className="text-sm font-semibold text-slate-100">Sync API Keys</h3>
        <p className="text-xs text-slate-400 mt-1">Synchronize API keys from .env to database</p>
      </div>

      <button
        onClick={onSync}
        disabled={syncingKeys}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-200 font-medium hover:bg-amber-500/30 disabled:opacity-50 transition"
      >
        {syncingKeys ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
        {syncingKeys ? 'Syncing...' : 'Sync Keys'}
      </button>

      {syncError && (
        <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-4 text-sm text-violet-200">
          âŒ {syncError}
        </div>
      )}

      {syncResults && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
          âœ… Sync completed successfully
        </div>
      )}
    </div>
  );
}

