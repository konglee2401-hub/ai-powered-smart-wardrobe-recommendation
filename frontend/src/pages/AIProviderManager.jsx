import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Server,
  Search,
  Brain,
  Image as ImageIcon,
  Video,
  CheckCircle,
  XCircle,
  Zap,
  Play,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { api, providersAPI } from '../services/api';
import { testProvider } from '../services/productPhotoService';

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
      setTestResults((prev) => [{
        providerId,
        success: result.success,
        duration: endTime - startTime,
        timestamp: new Date().toISOString(),
        data: result.data,
        testMode
      }, ...prev]);
    } catch (error) {
      const endTime = Date.now();
      setTestResults((prev) => [{
        providerId,
        success: false,
        duration: endTime - startTime,
        timestamp: new Date().toISOString(),
        error: error.message,
        testMode
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
          testMode
        });
      } catch (error) {
        newResults.push({
          providerId: provider._id,
          success: false,
          duration: 0,
          timestamp: new Date().toISOString(),
          error: error.message,
          testMode
        });
      }
    }

    setTestResults((prev) => [...newResults, ...prev]);
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
      setMessage('keysSynced');
      await new Promise((r) => setTimeout(r, 1000));
      await loadProviders();
    } catch (error) {
      setSyncError(error.message || t('aiProviders.sync.error'));
    } finally {
      setSyncingKeys(false);
    }
  };

  const filteredProviders = providers
    .filter((p) => p.capabilities?.[activeCategory])
    .filter((p) => p.name?.toLowerCase().includes(searchFilter.toLowerCase()));

  const selected = providers.find((p) => p._id === selectedProviderId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50 px-4 py-8">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-800">
              <Server className="h-8 w-8 text-sky-600" />
              {t('aiProviders.title')}
            </h1>
            <p className="mt-2 text-gray-600">{t('aiProviders.subtitle')}</p>
          </div>
        </div>

        {message && (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span>{t(`aiProviders.message.${message}`)}</span>
            </div>
          </div>
        )}

        <div className="mb-6 flex flex-wrap gap-2 border-b border-gray-200">
          {['manage', 'test', 'sync'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`-mb-px border-b-2 px-4 py-3 text-sm font-medium transition ${
                activeTab === tab
                  ? 'border-sky-500 text-sky-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t(`aiProviders.tabs.${tab}`)}
            </button>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="space-y-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-3 text-gray-400" />
                <input
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder={t('aiProviders.searchPlaceholder')}
                  className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 placeholder-gray-400 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                {['analysis', 'image', 'video'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`rounded-xl px-3 py-2 text-xs font-medium transition ${
                      activeCategory === cat
                        ? 'border border-sky-200 bg-sky-100 text-sky-700'
                        : 'border border-gray-200 bg-gray-50 text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    {t(`aiProviders.categories.${cat}`)}
                  </button>
                ))}
              </div>
            </div>

            <div className="max-h-[calc(100vh-420px)] space-y-2 overflow-y-auto pr-1">
              {isLoading ? (
                <div className="py-8 text-center text-gray-500">
                  <Loader2 className="mx-auto mb-2 animate-spin" size={20} />
                  <p className="text-xs">{t('aiProviders.loading.providers')}</p>
                </div>
              ) : filteredProviders.length === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  <p className="text-xs">{t('aiProviders.empty.noProviders')}</p>
                </div>
              ) : (
                filteredProviders.map((provider) => (
                  <button
                    key={provider._id}
                    onClick={() => {
                      setSelectedProviderId(provider._id);
                      setActiveTab('manage');
                    }}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      selectedProviderId === provider._id
                        ? 'border-sky-200 bg-sky-50'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-gray-800">{provider.name}</div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                          {provider.capabilities?.analysis && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[0.65rem] font-medium text-sky-700">
                              <Brain size={10} />
                              {t('aiProviders.manage.capabilityAnalysis')}
                            </span>
                          )}
                          {provider.capabilities?.image && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[0.65rem] font-medium text-emerald-700">
                              <ImageIcon size={10} />
                              {t('aiProviders.manage.capabilityImage')}
                            </span>
                          )}
                          {provider.capabilities?.video && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[0.65rem] font-medium text-violet-700">
                              <Video size={10} />
                              {t('aiProviders.manage.capabilityVideo')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[0.65rem] font-medium ${
                          provider.isEnabled
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {provider.isEnabled ? t('aiProviders.status.active') : t('aiProviders.status.inactive')}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="space-y-4">
            {activeTab === 'manage' ? (
              <ProviderDetailView provider={selected} />
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
  );
}

function ProviderDetailView({ provider }) {
  const { t } = useTranslation();
  if (!provider) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <p className="text-gray-500">{t('aiProviders.empty.selectProvider')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-gray-400">{t('aiProviders.manage.details')}</div>
          <h2 className="mt-2 text-2xl font-semibold text-gray-800">{provider.name}</h2>
        </div>
        <div
          className={`inline-flex items-center rounded-xl px-3 py-1.5 text-xs font-medium ${
            provider.isEnabled
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          {provider.isEnabled ? t('aiProviders.status.active') : t('aiProviders.status.inactive')}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium uppercase tracking-[0.18em] text-gray-400">
            {t('aiProviders.manage.description')}
          </label>
          <p className="mt-2 text-gray-600">
            {provider.description || t('aiProviders.manage.noDescription')}
          </p>
        </div>

        <div>
          <label className="text-xs font-medium uppercase tracking-[0.18em] text-gray-400">
            {t('aiProviders.manage.capabilities')}
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {provider.capabilities?.analysis && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-sky-100 px-3 py-1 text-xs text-sky-700">
                <Brain size={12} />
                {t('aiProviders.manage.capabilityAnalysis')}
              </span>
            )}
            {provider.capabilities?.image && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-3 py-1 text-xs text-emerald-700">
                <ImageIcon size={12} />
                {t('aiProviders.manage.capabilityImage')}
              </span>
            )}
            {provider.capabilities?.video && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-violet-100 px-3 py-1 text-xs text-violet-700">
                <Video size={12} />
                {t('aiProviders.manage.capabilityVideo')}
              </span>
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
  const { t } = useTranslation();
  const successCount = testResults.filter((r) => r.success).length;
  const failureCount = testResults.filter((r) => !r.success).length;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-[0.18em] text-gray-400">
              {t('aiProviders.test.modeLabel')}
            </label>
            <select
              value={testMode}
              onChange={(e) => onTestModeChange(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-sky-500 focus:outline-none"
            >
              <option value="lightweight">{t('aiProviders.test.modeLightweight')}</option>
              <option value="full">{t('aiProviders.test.modeFull')}</option>
            </select>
          </div>
          <button
            onClick={onTestAll}
            disabled={testingAll || providers.length === 0}
            className="flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-600 disabled:opacity-50"
          >
            {testingAll ? <Loader2 className="animate-spin" size={16} /> : <Zap size={16} />}
            {t('aiProviders.test.testAll')}
          </button>
        </div>
      </div>

      {testResults.length > 0 && (
        <div className="grid grid-cols-1 gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:grid-cols-3">
          <div className="rounded-xl bg-gray-50 p-3 text-center">
            <div className="text-2xl font-bold text-gray-800">{testResults.length}</div>
            <div className="mt-1 text-xs text-gray-500">{t('aiProviders.test.totalTests')}</div>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center">
            <div className="text-2xl font-bold text-emerald-700">{successCount}</div>
            <div className="mt-1 text-xs text-emerald-600">{t('aiProviders.test.successful')}</div>
          </div>
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-center">
            <div className="text-2xl font-bold text-rose-700">{failureCount}</div>
            <div className="mt-1 text-xs text-rose-600">{t('aiProviders.test.failed')}</div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-gray-800">{t('aiProviders.test.title')}</h3>
        <div className="max-h-[400px] space-y-2 overflow-y-auto">
          {testResults.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">{t('aiProviders.empty.noTests')}</p>
          ) : (
            testResults.map((result, idx) => (
              <div key={idx} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="text-xs font-medium text-gray-700">
                      {providers.find((p) => p._id === result.providerId)?.name || result.providerId}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      {new Date(result.timestamp).toLocaleTimeString()} • {result.duration}ms
                    </div>
                  </div>
                  <div
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[0.65rem] font-medium ${
                      result.success
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {result.success ? <CheckCircle size={12} /> : <XCircle size={12} />}
                    {result.success ? t('aiProviders.test.statusSuccess') : t('aiProviders.test.statusFailed')}
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
  const { t } = useTranslation();
  return (
    <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="border-b border-gray-200 pb-4">
        <h3 className="text-sm font-semibold text-gray-800">{t('aiProviders.sync.title')}</h3>
        <p className="mt-1 text-xs text-gray-500">{t('aiProviders.sync.subtitle')}</p>
      </div>

      <button
        onClick={onSync}
        disabled={syncingKeys}
        className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-600 disabled:opacity-50"
      >
        {syncingKeys ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
        {syncingKeys ? t('aiProviders.sync.syncing') : t('aiProviders.sync.sync')}
      </button>

      {syncError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <div className="flex items-start gap-2">
            <XCircle className="mt-0.5 h-4 w-4" />
            <span>{syncError || t('aiProviders.sync.error')}</span>
          </div>
        </div>
      )}

      {syncResults && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          <div className="flex items-start gap-2">
            <CheckCircle className="mt-0.5 h-4 w-4" />
            <span>{t('aiProviders.sync.success')}</span>
          </div>
        </div>
      )}
    </div>
  );
}
