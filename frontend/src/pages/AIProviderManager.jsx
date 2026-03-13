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
  Loader2,
  RefreshCw
} from 'lucide-react';
import { api, providersAPI } from '../services/api';
import { testProvider } from '../services/productPhotoService';
import PageHeaderBar from '../components/PageHeaderBar';

export default function AIProviderManager() {
  const { t } = useTranslation();
  const [providers, setProviders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('manage');
  const [activeCategory, setActiveCategory] = useState('analysis');
  const [searchFilter, setSearchFilter] = useState('');

  const [selectedProviderId, setSelectedProviderId] = useState(null);
  const [testResults, setTestResults] = useState([]);
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

  const handleTestAll = async () => {
    setTestingAll(true);
    const newResults = [];

    for (const provider of providers) {
      const startTime = Date.now();
      try {
        const result = await testProvider(provider._id, testMode);
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
        const endTime = Date.now();
        newResults.push({
          providerId: provider._id,
          success: false,
          duration: endTime - startTime,
          timestamp: new Date().toISOString(),
          error: error.message,
          testMode
        });
      }
    }

    setTestResults((prev) => [...newResults, ...prev]);
    setTestingAll(false);
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
    <div className="image-generation-shell -mx-5 -mb-5 -mt-5 grid min-h-0 grid-rows-[auto,minmax(0,1fr)] overflow-hidden text-[13px] text-white lg:-mx-6 lg:-mb-6 lg:-mt-6" data-main-body>
      <PageHeaderBar
        icon={<Server className="h-4 w-4 text-sky-400" />}
        title={t('aiProviders.title')}
        meta={t('aiProviders.subtitle')}
        className="h-16"
        contentClassName="px-5 lg:px-6"
      />

      <div className="min-h-0 overflow-y-auto px-5 py-3 lg:px-6">
        <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-4">
          {message && (
            <div className="studio-card-shell rounded-[1.1rem] border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                <span>{t(`aiProviders.message.${message}`)}</span>
              </div>
            </div>
          )}

          <div className="studio-card-shell rounded-[1.15rem] border border-white/10 p-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-wrap gap-2">
                {['manage', 'test', 'sync'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`apple-option-chip flex items-center gap-2 rounded-[0.85rem] px-3 py-2 text-xs font-semibold transition ${
                      activeTab === tab ? 'apple-option-chip-selected selected' : ''
                    }`}
                  >
                    {t(`aiProviders.tabs.${tab}`)}
                  </button>
                ))}
              </div>

              <div className="ml-auto flex min-w-[220px] flex-1 items-center gap-3 sm:flex-[0.6]">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder={t('aiProviders.searchPlaceholder')}
                    className="w-full rounded-[0.85rem] border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-xs text-slate-200 placeholder-slate-400 focus:border-sky-400/60 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {['analysis', 'image', 'video'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`apple-option-chip flex items-center gap-2 rounded-[0.85rem] px-3 py-1.5 text-[11px] font-semibold transition ${
                    activeCategory === cat ? 'apple-option-chip-selected selected' : ''
                  }`}
                >
                  {t(`aiProviders.categories.${cat}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
            <div className="studio-card-shell space-y-3 rounded-[1.2rem] border border-white/10 p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  {t('aiProviders.tabs.manage')}
                </span>
                <span className="text-[11px] text-slate-500">{filteredProviders.length}</span>
              </div>
              <div className="max-h-[calc(100vh-360px)] space-y-2 overflow-y-auto pr-1">
              {isLoading ? (
                <div className="py-8 text-center text-slate-400">
                  <Loader2 className="mx-auto mb-2 animate-spin" size={20} />
                  <p className="text-xs">{t('aiProviders.loading.providers')}</p>
                </div>
              ) : filteredProviders.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
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
                    className={`w-full rounded-[1.05rem] border p-3 text-left transition ${
                      selectedProviderId === provider._id
                        ? 'border-sky-400/50 bg-sky-500/10'
                        : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-slate-100">{provider.name}</div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                          {provider.capabilities?.analysis && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2 py-0.5 text-[0.65rem] font-medium text-sky-200">
                              <Brain size={10} />
                              {t('aiProviders.manage.capabilityAnalysis')}
                            </span>
                          )}
                          {provider.capabilities?.image && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[0.65rem] font-medium text-emerald-200">
                              <ImageIcon size={10} />
                              {t('aiProviders.manage.capabilityImage')}
                            </span>
                          )}
                          {provider.capabilities?.video && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-0.5 text-[0.65rem] font-medium text-violet-200">
                              <Video size={10} />
                              {t('aiProviders.manage.capabilityVideo')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[0.65rem] font-medium ${
                          provider.isEnabled
                            ? 'bg-emerald-500/15 text-emerald-200'
                            : 'bg-white/10 text-slate-400'
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
                testingAll={testingAll}
                testMode={testMode}
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

function ProviderDetailView({ provider }) {
  const { t } = useTranslation();
  if (!provider) {
    return (
      <div className="studio-card-shell rounded-[1.2rem] border border-white/10 p-8 text-center">
        <p className="text-slate-400">{t('aiProviders.empty.selectProvider')}</p>
      </div>
    );
  }

  return (
    <div className="studio-card-shell space-y-4 rounded-[1.2rem] border border-white/10 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{t('aiProviders.manage.details')}</div>
          <h2 className="mt-2 text-2xl font-semibold text-slate-100">{provider.name}</h2>
        </div>
        <div
          className={`inline-flex items-center rounded-xl px-3 py-1.5 text-xs font-medium ${
            provider.isEnabled
              ? 'bg-emerald-500/15 text-emerald-200'
              : 'bg-white/10 text-slate-400'
          }`}
        >
          {provider.isEnabled ? t('aiProviders.status.active') : t('aiProviders.status.inactive')}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            {t('aiProviders.manage.description')}
          </label>
          <p className="mt-2 text-slate-300">
            {provider.description || t('aiProviders.manage.noDescription')}
          </p>
        </div>

        <div>
          <label className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            {t('aiProviders.manage.capabilities')}
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {provider.capabilities?.analysis && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-sky-500/10 px-3 py-1 text-xs text-sky-200">
                <Brain size={12} />
                {t('aiProviders.manage.capabilityAnalysis')}
              </span>
            )}
            {provider.capabilities?.image && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
                <ImageIcon size={12} />
                {t('aiProviders.manage.capabilityImage')}
              </span>
            )}
            {provider.capabilities?.video && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-violet-500/10 px-3 py-1 text-xs text-violet-200">
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
  testingAll,
  testMode,
  onTestAll,
  onTestModeChange
}) {
  const { t } = useTranslation();
  const successCount = testResults.filter((r) => r.success).length;
  const failureCount = testResults.filter((r) => !r.success).length;

  return (
    <div className="space-y-4">
      <div className="studio-card-shell space-y-4 rounded-[1.2rem] border border-white/10 p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              {t('aiProviders.test.modeLabel')}
            </label>
            <select
              value={testMode}
              onChange={(e) => onTestModeChange(e.target.value)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 focus:border-sky-400/60 focus:outline-none"
            >
              <option value="lightweight">{t('aiProviders.test.modeLightweight')}</option>
              <option value="full">{t('aiProviders.test.modeFull')}</option>
            </select>
          </div>
          <button
            onClick={onTestAll}
            disabled={testingAll || providers.length === 0}
            className="flex items-center gap-2 rounded-xl bg-sky-500/20 px-4 py-2 text-sm font-medium text-sky-200 transition hover:bg-sky-500/30 disabled:opacity-50"
          >
            {testingAll ? <Loader2 className="animate-spin" size={16} /> : <Zap size={16} />}
            {t('aiProviders.test.testAll')}
          </button>
        </div>
      </div>

      {testResults.length > 0 && (
        <div className="grid grid-cols-1 gap-3 rounded-[1.2rem] border border-white/10 bg-white/[0.02] p-4 sm:grid-cols-3">
          <div className="rounded-xl bg-white/5 p-3 text-center">
            <div className="text-2xl font-bold text-slate-100">{testResults.length}</div>
            <div className="mt-1 text-xs text-slate-400">{t('aiProviders.test.totalTests')}</div>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-center">
            <div className="text-2xl font-bold text-emerald-200">{successCount}</div>
            <div className="mt-1 text-xs text-emerald-300">{t('aiProviders.test.successful')}</div>
          </div>
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-center">
            <div className="text-2xl font-bold text-rose-200">{failureCount}</div>
            <div className="mt-1 text-xs text-rose-300">{t('aiProviders.test.failed')}</div>
          </div>
        </div>
      )}

      <div className="studio-card-shell rounded-[1.2rem] border border-white/10 p-5">
        <h3 className="mb-4 text-sm font-semibold text-slate-100">{t('aiProviders.test.title')}</h3>
        <div className="max-h-[400px] space-y-2 overflow-y-auto">
          {testResults.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">{t('aiProviders.empty.noTests')}</p>
          ) : (
            testResults.map((result, idx) => (
              <div key={idx} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="text-xs font-medium text-slate-200">
                      {providers.find((p) => p._id === result.providerId)?.name || result.providerId}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      {new Date(result.timestamp).toLocaleTimeString()} - {result.duration}ms
                    </div>
                  </div>
                  <div
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[0.65rem] font-medium ${
                      result.success
                        ? 'bg-emerald-500/15 text-emerald-200'
                        : 'bg-rose-500/15 text-rose-200'
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
    <div className="studio-card-shell space-y-4 rounded-[1.2rem] border border-white/10 p-5">
      <div className="border-b border-white/10 pb-4">
        <h3 className="text-sm font-semibold text-slate-100">{t('aiProviders.sync.title')}</h3>
        <p className="mt-1 text-xs text-slate-400">{t('aiProviders.sync.subtitle')}</p>
      </div>

      <button
        onClick={onSync}
        disabled={syncingKeys}
        className="flex items-center gap-2 rounded-xl bg-amber-500/20 px-4 py-2 text-sm font-medium text-amber-200 transition hover:bg-amber-500/30 disabled:opacity-50"
      >
        {syncingKeys ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
        {syncingKeys ? t('aiProviders.sync.syncing') : t('aiProviders.sync.sync')}
      </button>

      {syncError && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          <div className="flex items-start gap-2">
            <XCircle className="mt-0.5 h-4 w-4" />
            <span>{syncError || t('aiProviders.sync.error')}</span>
          </div>
        </div>
      )}

      {syncResults && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
          <div className="flex items-start gap-2">
            <CheckCircle className="mt-0.5 h-4 w-4" />
            <span>{t('aiProviders.sync.success')}</span>
          </div>
        </div>
      )}
    </div>
  );
}

