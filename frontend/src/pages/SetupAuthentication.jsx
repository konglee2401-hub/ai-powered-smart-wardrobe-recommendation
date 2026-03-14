import React, { useEffect, useState } from 'react';
import { Settings, RefreshCw, CheckCircle, AlertCircle, Shield, Save, Link as LinkIcon, FileText } from 'lucide-react';
import axiosInstance from '../services/axios';
import { useTranslation } from 'react-i18next';
import LogViewer from '../components/LogViewer';

const SectionCard = ({ title, description, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full text-left p-4 rounded-[1.2rem] border backdrop-blur-sm transition ${
      active
        ? 'border-cyan-300/20 bg-[linear-gradient(135deg,rgba(8,145,178,0.12),rgba(6,182,212,0.08))] shadow-[0_8px_32px_rgba(6,182,212,0.12)]'
        : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.08]'
    }`}
  >
    <div className="flex items-center gap-3">
      <Shield className="w-5 h-5 text-cyan-300" />
      <div>
        <div className="text-sm font-semibold text-white">{title}</div>
        <div className="text-xs text-slate-400">{description}</div>
      </div>
    </div>
  </button>
);

export default function SetupAuthentication() {
  const { t } = useTranslation();
  const [active, setActive] = useState('ai-accounts');
  const [gdCreds, setGdCreds] = useState({ clientId: '', clientSecret: '', redirectUri: '' });
  const [ytCreds, setYtCreds] = useState({ clientId: '', clientSecret: '', redirectUri: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [driveConfig, setDriveConfig] = useState(null);
  const [loadingDriveConfig, setLoadingDriveConfig] = useState(false);
  const [scraperConfig, setScraperConfig] = useState(null);
  const [savingScraperConfig, setSavingScraperConfig] = useState(false);
  const [aiAccounts, setAiAccounts] = useState({});
  const [loadingAiAccounts, setLoadingAiAccounts] = useState(false);
  const [updatingAiAccount, setUpdatingAiAccount] = useState(null);
  const [creatingAiAccount, setCreatingAiAccount] = useState(false);
  const [newAccountProvider, setNewAccountProvider] = useState('google-flow');
  const [newAccountName, setNewAccountName] = useState('');
  const [runningAiAction, setRunningAiAction] = useState(null);
  const [logViewerVisible, setLogViewerVisible] = useState(false);
  const [logSessionId, setLogSessionId] = useState(null);

  const loadStoredCreds = async () => {
    try {
      const [gd, yt] = await Promise.all([
        axiosInstance.get('/auth-setup/credentials/google-drive').catch(() => ({ data: null })),
        axiosInstance.get('/auth-setup/credentials/youtube').catch(() => ({ data: null })),
      ]);
      if (gd.data?.success) {
        setGdCreds(c => ({ ...c, redirectUri: gd.data.redirectUri || '' }));
      }
      if (yt.data?.success) {
        setYtCreds(c => ({ ...c, redirectUri: yt.data.redirectUri || '' }));
      }
    } catch {}
  };

  const loadDriveConfig = async () => {
    setLoadingDriveConfig(true);
    try {
      const { data } = await axiosInstance.get('/auth-setup/drive-config-check');
      setDriveConfig(data);
    } catch (e) {
      setMessage('Failed to load drive configuration: ' + (e.response?.data?.error || e.message));
    } finally {
      setLoadingDriveConfig(false);
    }
  };

  const loadScraperConfig = async () => {
    try {
      const { data } = await axiosInstance.get('/auth-setup/scraper-videos-config');
      if (data.success) {
        setScraperConfig(data.config);
      }
    } catch (e) {
      setMessage('Failed to load scraper config: ' + (e.response?.data?.error || e.message));
    }
  };

  const loadAiAccounts = async () => {
    setLoadingAiAccounts(true);
    try {
      const { data } = await axiosInstance.get('/auth-setup/ai-service-accounts');
      if (data?.success) {
        setAiAccounts(data.providers || {});
      }
    } catch (e) {
      setMessage('Failed to load AI service accounts: ' + (e.response?.data?.error || e.message));
    } finally {
      setLoadingAiAccounts(false);
    }
  };

  const updateAiAccount = async ({ provider, email, accountKey, action, value }) => {
    const identity = accountKey || email || 'unknown';
    setUpdatingAiAccount(`${provider}:${identity}:${action}`);
    try {
      await axiosInstance.post('/auth-setup/ai-service-accounts', { provider, email, accountKey, action, value });
      await loadAiAccounts();
    } catch (e) {
      setMessage('Failed to update AI service account: ' + (e.response?.data?.error || e.message));
    } finally {
      setUpdatingAiAccount(null);
    }
  };

  const createAiAccount = async () => {
    const label = newAccountName.trim();
    if (!label) {
      setMessage('Please enter a profile name.');
      return;
    }
    setCreatingAiAccount(true);
    try {
      await axiosInstance.post('/auth-setup/ai-service-accounts', {
        provider: newAccountProvider,
        label,
        action: 'create'
      });
      setNewAccountName('');
      await loadAiAccounts();
    } catch (e) {
      setMessage('Failed to create AI service account: ' + (e.response?.data?.error || e.message));
    } finally {
      setCreatingAiAccount(false);
    }
  };

  const runAiAccountAction = async ({ provider, accountKey, action }) => {
    setRunningAiAction(`${provider}:${accountKey}:${action}`);
    try {
      const { data } = await axiosInstance.post('/auth-setup/ai-service-accounts/run', {
        provider,
        accountKey,
        action
      });
      if (data?.sessionId) {
        setLogSessionId(data.sessionId);
        setLogViewerVisible(true);
        setMessage('📋 Log viewer opened - monitoring account action...');
      } else {
        setMessage('Action started.');
      }
      await loadAiAccounts();
    } catch (e) {
      setMessage('Failed to run account action: ' + (e.response?.data?.error || e.message));
    } finally {
      setRunningAiAction(null);
    }
  };

  const saveScraperConfig = async () => {
    setSavingScraperConfig(true);
    try {
      const { data } = await axiosInstance.post('/auth-setup/scraper-videos-config', scraperConfig);
      if (data.success) {
        setMessage('âœ… Scraper configuration saved successfully');
      }
    } catch (e) {
      setMessage('Failed to save scraper config: ' + (e.response?.data?.error || e.message));
    } finally {
      setSavingScraperConfig(false);
    }
  };

  useEffect(() => {
    loadStoredCreds();
  }, []);

  useEffect(() => {
    if (active === 'drive-config') {
      loadDriveConfig();
    } else if (active === 'scraper-videos') {
      loadScraperConfig();
    } else if (active === 'ai-accounts') {
      loadAiAccounts();
    }
  }, [active]);

  const saveCreds = async (provider, creds) => {
    setSaving(true);
    setMessage('');
    try {
      const payload = { provider, clientId: creds.clientId, clientSecret: creds.clientSecret, redirectUri: creds.redirectUri };
      await axiosInstance.post('/auth-setup/credentials/save', payload);
      setMessage(t('authSetup.messages.savedCredentials'));
    } catch (e) {
      setMessage(t('authSetup.messages.saveErrorPrefix') + (e.response?.data?.error || e.message));
    } finally {
      setSaving(false);
    }
  };

  const openDriveAuth = async () => {
    try {
      const { data } = await axiosInstance.post('/auth-setup/google-drive/oauth-url');
      if (data?.authUrl) window.open(data.authUrl, '_blank');
    } catch {}
  };

  const exchangeDriveCode = async (code) => {
    try {
      await axiosInstance.post('/auth-setup/google-drive/exchange-code', { code });
      setMessage(t('authSetup.messages.savedDriveToken'));
    } catch (e) {
      setMessage(t('authSetup.messages.exchangeErrorPrefix') + (e.response?.data?.error || e.message));
    }
  };

  const openYouTubeAuth = async () => {
    try {
      const { data } = await axiosInstance.post('/auth-setup/youtube/oauth-url');
      if (data?.authUrl) window.open(data.authUrl, '_blank');
    } catch {}
  };

  const exchangeYouTubeCode = async (code) => {
    try {
      await axiosInstance.post('/auth-setup/youtube/exchange-code', { code });
      setMessage(t('authSetup.messages.savedYouTubeToken'));
    } catch (e) {
      setMessage(t('authSetup.messages.exchangeErrorPrefix') + (e.response?.data?.error || e.message));
    }
  };

  return (
    <div className="setup-authentication-shell min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.12),_transparent_26%),radial-gradient(circle_at_top_right,_rgba(56,189,248,0.12),_transparent_24%),linear-gradient(180deg,#020617_0%,#0f172a_42%,#111827_100%)] px-4 py-6 text-slate-100 sm:px-6 lg:px-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto px-0 py-0">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="w-6 h-6 text-purple-400" />
          <div className="text-2xl font-semibold">{t('authSetup.title')}</div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 md:col-span-3 space-y-3">
            <SectionCard
              title="AI Service Accounts"
              description="Manage AI provider sessions"
              active={active === 'ai-accounts'}
              onClick={() => setActive('ai-accounts')}
            />
            <SectionCard
              title={t('authSetup.sections.drive.title')}
              description={t('authSetup.sections.drive.desc')}
              active={active === 'drive'}
              onClick={() => setActive('drive')}
            />
            <SectionCard
              title="Drive Configuration"
              description="Check folder mappings & upload status"
              active={active === 'drive-config'}
              onClick={() => setActive('drive-config')}
            />
            <SectionCard
              title={t('authSetup.sections.youtube.title')}
              description={t('authSetup.sections.youtube.desc')}
              active={active === 'youtube'}
              onClick={() => setActive('youtube')}
            />
            <SectionCard
              title="Scraper Videos"
              description="Config for downloaded content"
              active={active === 'scraper-videos'}
              onClick={() => setActive('scraper-videos')}
            />
          </div>

          <div className="col-span-12 md:col-span-9">
            <div className="studio-card-shell rounded-[1.35rem] p-4 md:p-5 border-white/10">
              {message && (
                <div className="mb-4 flex items-center gap-2 text-sm">
                  <AlertCircle className="w-4 h-4 text-yellow-400" />
                  <span>{message}</span>
                </div>
              )}

              {active === 'ai-accounts' && (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="text-lg font-semibold">AI Service Accounts</div>
                      <div className="text-sm text-slate-400">Create profiles per provider, then login, validate, or refresh sessions.</div>
                    </div>
                    <button onClick={loadAiAccounts} disabled={loadingAiAccounts} className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded text-xs flex items-center gap-1 disabled:opacity-50">
                      <RefreshCw className="w-4 h-4" /> {loadingAiAccounts ? 'Loading...' : 'Refresh'}
                    </button>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="text-sm font-semibold text-white">Create new profile</div>
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-slate-400">Provider</label>
                        <select
                          value={newAccountProvider}
                          onChange={(e) => setNewAccountProvider(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white"
                        >
                          <option value="google-flow">Google Flow</option>
                          <option value="chatgpt">ChatGPT</option>
                          <option value="grok">Grok</option>
                          <option value="capcut">CapCut</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-xs text-slate-400">Profile name</label>
                        <div className="mt-1 flex gap-2">
                          <input
                            value={newAccountName}
                            onChange={(e) => setNewAccountName(e.target.value)}
                            className="flex-1 rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white"
                            placeholder="leecris-flow"
                          />
                          <button
                            onClick={createAiAccount}
                            disabled={creatingAiAccount}
                            className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm text-white disabled:opacity-50"
                          >
                            {creatingAiAccount ? 'Creating...' : 'Create'}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">Profile name becomes the folder key under `backend/data/&lt;provider&gt;-profiles`.</div>
                  </div>

                  {Object.keys(aiAccounts || {}).length === 0 && !loadingAiAccounts && (
                    <div className="text-sm text-gray-300">No AI service accounts found yet. Create a profile and login to save sessions.</div>
                  )}

                  {['google-flow', 'chatgpt', 'grok', 'capcut'].map((provider) => {
                    const accounts = aiAccounts?.[provider] || [];
                    const providerLabel = provider === 'google-flow' ? 'Google Flow' : provider === 'chatgpt' ? 'ChatGPT' : provider === 'grok' ? 'Grok' : 'CapCut';
                    return (
                      <div key={provider} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">{providerLabel}</div>
                          <div className="text-xs text-slate-500">{accounts.length} profile(s)</div>
                        </div>
                        {accounts.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-slate-400">
                            No profiles yet.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {accounts.map((account) => {
                              const displayName = account.label || account.email || account.accountKey || 'Unnamed profile';
                              const busy =
                                updatingAiAccount === `${provider}:${account.accountKey || account.email}:set-preferred` ||
                                updatingAiAccount === `${provider}:${account.accountKey || account.email}:clear-rate-limit` ||
                                updatingAiAccount === `${provider}:${account.accountKey || account.email}:set-active`;
                              const running =
                                runningAiAction === `${provider}:${account.accountKey}:${'login'}` ||
                                runningAiAction === `${provider}:${account.accountKey}:${'validate'}` ||
                                runningAiAction === `${provider}:${account.accountKey}:${'refresh'}`;
                              const rateLimited = account.disabledUntil && new Date(account.disabledUntil) > new Date();
                              return (
                                <div key={`${provider}-${account.accountKey || account.email}`} className="rounded-xl border border-white/10 bg-white/5 p-4">
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <div className="text-sm font-semibold text-white">{displayName}</div>
                                      {account.email && <div className="text-xs text-slate-400 mt-1">{account.email}</div>}
                                      <div className="text-xs text-slate-500 mt-1">
                                        Credits: {Number.isFinite(account.lastCredits) ? account.lastCredits : 'unknown'}
                                      </div>
                                      <div className="text-xs text-slate-500 mt-1">
                                        Last used: {account.lastUsedAt ? new Date(account.lastUsedAt).toLocaleString() : 'never'}
                                      </div>
                                      {rateLimited && (
                                        <div className="text-xs text-rose-300 mt-1">
                                          Rate limit until {new Date(account.disabledUntil).toLocaleString()}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                      {rateLimited && (
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300">Rate limited</span>
                                      )}
                                      {account.isActive && (
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-200">Active</span>
                                      )}
                                      {account.isPreferred && (
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">Preferred</span>
                                      )}
                                      {!account.isActive && (
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-300">Disabled</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                    <button
                                      disabled={running}
                                      onClick={() => runAiAccountAction({ provider, accountKey: account.accountKey, action: 'login' })}
                                      className="px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white disabled:opacity-50"
                                    >
                                      Login
                                    </button>
                                    <button
                                      disabled={running}
                                      onClick={() => runAiAccountAction({ provider, accountKey: account.accountKey, action: 'validate' })}
                                      className="px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white disabled:opacity-50"
                                    >
                                      Validate
                                    </button>
                                    <button
                                      disabled={running}
                                      onClick={() => runAiAccountAction({ provider, accountKey: account.accountKey, action: 'refresh' })}
                                      className="px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white disabled:opacity-50"
                                    >
                                      Refresh
                                    </button>
                                    <button
                                      disabled={busy}
                                      onClick={() => updateAiAccount({ provider, accountKey: account.accountKey, email: account.email, action: 'set-preferred', value: true })}
                                      className="px-2.5 py-1 rounded bg-emerald-600/80 hover:bg-emerald-600 text-white disabled:opacity-50"
                                    >
                                      Prefer
                                    </button>
                                    <button
                                      disabled={busy}
                                      onClick={() => updateAiAccount({ provider, accountKey: account.accountKey, email: account.email, action: 'clear-rate-limit' })}
                                      className="px-2.5 py-1 rounded bg-amber-600/80 hover:bg-amber-600 text-white disabled:opacity-50"
                                    >
                                      Clear limit
                                    </button>
                                    <button
                                      disabled={busy}
                                      onClick={() => updateAiAccount({ provider, accountKey: account.accountKey, email: account.email, action: 'set-active', value: !account.isActive })}
                                      className="px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white disabled:opacity-50"
                                    >
                                      {account.isActive ? 'Disable' : 'Enable'}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {active === 'drive' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-semibold">{t('authSetup.sections.drive.title')}</div>
                    <div className="flex gap-2">
                      <button disabled={saving} onClick={() => saveCreds('google-drive', gdCreds)} className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded text-xs flex items-center gap-1 disabled:opacity-50">
                        <Save className="w-4 h-4" /> {t('authSetup.buttons.saveEncrypted')}
                      </button>
                      <button onClick={openDriveAuth} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs flex items-center gap-1">
                        <LinkIcon className="w-4 h-4" /> {t('authSetup.buttons.openAuthUrl')}
                      </button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-300">{t('authSetup.drive.instructions')}</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-400">{t('authSetup.labels.clientId')}</label>
                      <input value={gdCreds.clientId} onChange={e => setGdCreds({ ...gdCreds, clientId: e.target.value })} className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm" placeholder="xxxxxxxx.apps.googleusercontent.com" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">{t('authSetup.labels.clientSecret')}</label>
                      <input value={gdCreds.clientSecret} onChange={e => setGdCreds({ ...gdCreds, clientSecret: e.target.value })} className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm" placeholder="********" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs text-gray-400">{t('authSetup.labels.redirectUri')}</label>
                      <input value={gdCreds.redirectUri} onChange={e => setGdCreds({ ...gdCreds, redirectUri: e.target.value })} className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm" placeholder="http://localhost:5000/api/drive/auth-callback" />
                    </div>
                  </div>
                  <div className="text-sm text-gray-400">{t('authSetup.drive.exchangeHint')}</div>
                  <div className="flex gap-2">
                    <input id="drive-code" className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm" placeholder={t('authSetup.placeholders.googleCode')} />
                    <button onClick={() => exchangeDriveCode(document.getElementById('drive-code').value)} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm">
                      {t('authSetup.buttons.exchangeSaveToken')}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span>{t('authSetup.diagnostic.labelDrive')}</span>
                    <button onClick={async () => {
                      const { data } = await axiosInstance.get('/auth-setup/diagnostic/google-drive');
                      setMessage(data.tokenExists ? t('authSetup.diagnostic.driveTokenExists') : t('authSetup.diagnostic.driveTokenMissing'));
                    }} className="ml-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-xs">{t('authSetup.buttons.runDiagnostic')}</button>
                  </div>
                  <div className="mt-4">
                    <div className="text-sm font-semibold text-white">{t('authSetup.drive.detailedGuideTitle')}</div>
                    <ul className="mt-2 list-disc list-inside text-sm text-gray-300">
                      {(t('authSetup.drive.steps', { returnObjects: true }) || []).map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {active === 'youtube' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-semibold">{t('authSetup.sections.youtube.title')}</div>
                    <div className="flex gap-2">
                      <button disabled={saving} onClick={() => saveCreds('youtube', ytCreds)} className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded text-xs flex items-center gap-1 disabled:opacity-50">
                        <Save className="w-4 h-4" /> {t('authSetup.buttons.saveEncrypted')}
                      </button>
                      <button onClick={openYouTubeAuth} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs flex items-center gap-1">
                        <LinkIcon className="w-4 h-4" /> {t('authSetup.buttons.openAuthUrl')}
                      </button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-300">{t('authSetup.youtube.instructions')}</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-400">{t('authSetup.labels.clientId')}</label>
                      <input value={ytCreds.clientId} onChange={e => setYtCreds({ ...ytCreds, clientId: e.target.value })} className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm" placeholder="xxxxxxxx.apps.googleusercontent.com" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">{t('authSetup.labels.clientSecret')}</label>
                      <input value={ytCreds.clientSecret} onChange={e => setYtCreds({ ...ytCreds, clientSecret: e.target.value })} className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm" placeholder="********" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs text-gray-400">{t('authSetup.labels.redirectUri')}</label>
                      <input value={ytCreds.redirectUri} onChange={e => setYtCreds({ ...ytCreds, redirectUri: e.target.value })} className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm" placeholder="http://localhost:5000/api/trend-automation/youtube/oauth/callback" />
                    </div>
                  </div>
                  <div className="text-sm text-gray-400">{t('authSetup.youtube.exchangeHint')}</div>
                  <div className="flex gap-2">
                    <input id="youtube-code" className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm" placeholder={t('authSetup.placeholders.googleCode')} />
                    <button onClick={() => exchangeYouTubeCode(document.getElementById('youtube-code').value)} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm">
                      {t('authSetup.buttons.exchangeSaveToken')}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span>{t('authSetup.diagnostic.labelYouTube')}</span>
                    <button onClick={async () => {
                      const { data } = await axiosInstance.get('/auth-setup/diagnostic/youtube');
                      setMessage(data.tokenExists ? t('authSetup.diagnostic.youtubeTokenExists') : t('authSetup.diagnostic.youtubeTokenMissing'));
                    }} className="ml-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-xs">{t('authSetup.buttons.runDiagnostic')}</button>
                  </div>
                  <div className="mt-4">
                    <div className="text-sm font-semibold text-white">{t('authSetup.youtube.detailedGuideTitle')}</div>
                    <ul className="mt-2 list-disc list-inside text-sm text-gray-300">
                      {(t('authSetup.youtube.steps', { returnObjects: true }) || []).map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {active === 'drive-config' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-semibold">ðŸ“Š Drive Configuration Check</div>
                    <button onClick={loadDriveConfig} disabled={loadingDriveConfig} className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded text-xs flex items-center gap-1 disabled:opacity-50">
                      <RefreshCw className="w-4 h-4" /> {loadingDriveConfig ? 'Loading...' : 'Refresh'}
                    </button>
                  </div>
                  
                  {driveConfig && (
                    <>
                      {/* Folder Mappings */}
                      {driveConfig.folderMappings && (
                        <div className="space-y-3">
                          <div className="text-sm font-semibold text-white">ðŸ“ Folder Mappings (10/10)</div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            {Object.entries(driveConfig.folderMappings).map(([name, folder]) => (
                              <div key={name} className="flex items-center gap-2 p-2 bg-gray-800 rounded border border-gray-700">
                                <CheckCircle className="w-4 h-4 text-green-400" />
                                <span className="flex-1">{name}</span>
                                <span className="text-xs text-gray-500">{folder.id?.substring(0, 8)}...</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Upload Methods */}
                      {driveConfig.uploadMethods && (
                        <div className="space-y-3">
                          <div className="text-sm font-semibold text-white">ðŸš€ Upload Methods</div>
                          <div className="space-y-2 text-sm">
                            {driveConfig.uploadMethods.map((method, idx) => (
                              <div key={idx} className="flex items-center gap-2 p-2 bg-gray-800 rounded border border-gray-700">
                                <CheckCircle className="w-4 h-4 text-green-400" />
                                <div className="flex-1">
                                  <span className="font-mono text-xs">{method.method}</span>
                                  <span className="text-gray-400 ml-2">â†’ {method.folder}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Authentication Status */}
                      {driveConfig.auth && (
                        <div className="space-y-2 p-3 bg-gray-800 rounded border border-gray-700">
                          <div className="text-sm font-semibold text-white">ðŸ” Authentication Status</div>
                          <div className="space-y-1 text-sm">
                            <div className={`flex items-center gap-2 ${driveConfig.auth.clientIdConfigured ? 'text-green-400' : 'text-red-400'}`}>
                              <CheckCircle className="w-4 h-4" />
                              OAUTH_CLIENT_ID: {driveConfig.auth.clientIdConfigured ? 'âœ… Configured' : 'âŒ Missing'}
                            </div>
                            <div className={`flex items-center gap-2 ${driveConfig.auth.clientSecretConfigured ? 'text-green-400' : 'text-red-400'}`}>
                              <CheckCircle className="w-4 h-4" />
                              OAUTH_CLIENT_SECRET: {driveConfig.auth.clientSecretConfigured ? 'âœ… Configured' : 'âŒ Missing'}
                            </div>
                            <div className={`flex items-center gap-2 ${driveConfig.auth.tokenValid ? 'text-green-400' : 'text-yellow-400'}`}>
                              <CheckCircle className="w-4 h-4" />
                              Token: {driveConfig.auth.tokenValid ? 'âœ… Valid' : 'âš ï¸ Expired/Missing'}
                              {driveConfig.auth.tokenExpires && <span className="text-xs text-gray-400 ml-2">({driveConfig.auth.tokenExpires})</span>}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Overall Status */}
                      {driveConfig.allConfigured && (
                        <div className="p-3 bg-green-900 border border-green-700 rounded">
                          <div className="text-sm font-semibold text-green-300">âœ…âœ…âœ… All Google Drive Configurations Correct</div>
                          <div className="text-xs text-green-300 mt-1">ðŸš€ Ready to upload images and videos!</div>
                        </div>
                      )}
                    </>
                  )}

                  {loadingDriveConfig && <div className="text-sm text-gray-400">Loading configuration...</div>}
                </div>
              )}

              {active === 'scraper-videos' && (
                <div className="space-y-4">
                  <div className="text-lg font-semibold">ðŸ“¥ Scraper Downloaded Videos Configuration</div>
                  <p className="text-sm text-gray-300">Configure where videos downloaded from scraper sources should be stored in Google Drive.</p>
                  
                  <div className="space-y-4 p-4 bg-gray-800 rounded border border-gray-700">
                    <div>
                      <label className="text-sm font-semibold text-white block mb-3">Video Source Configurations</label>
                      
                      {/* TikTok Videos */}
                      <div className="mb-4">
                        <label className="text-xs text-gray-400">TikTok Videos</label>
                        <select className="w-full mt-1 px-3 py-2 bg-gray-900 border border-gray-600 rounded text-sm">
                          <option value="videos-downloaded-tiktok">Videos/Downloaded/Tiktok (Default)</option>
                          <option value="videos-queue">Videos/Queue</option>
                          <option value="videos-app">Videos/Uploaded/App</option>
                          <option value="custom">Custom Folder (specify below)</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">ðŸ“± For TikTok content downloaded for repurposing</p>
                      </div>

                      {/* Instagram Reels */}
                      <div className="mb-4">
                        <label className="text-xs text-gray-400">Instagram Reels</label>
                        <select className="w-full mt-1 px-3 py-2 bg-gray-900 border border-gray-600 rounded text-sm">
                          <option value="videos-downloaded-reels">Videos/Downloaded/Reels (Default)</option>
                          <option value="videos-queue">Videos/Queue</option>
                          <option value="videos-app">Videos/Uploaded/App</option>
                          <option value="custom">Custom Folder (specify below)</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">ðŸ“± For Instagram Reels content downloaded for repurposing</p>
                      </div>

                      {/* YouTube Videos */}
                      <div className="mb-4">
                        <label className="text-xs text-gray-400">YouTube Videos</label>
                        <select className="w-full mt-1 px-3 py-2 bg-gray-900 border border-gray-600 rounded text-sm">
                          <option value="videos-downloaded-youtube">Videos/Downloaded/Youtube (Default)</option>
                          <option value="videos-queue">Videos/Queue</option>
                          <option value="videos-app">Videos/Uploaded/App</option>
                          <option value="custom">Custom Folder (specify below)</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">ðŸŽ¥ For YouTube videos downloaded for repurposing</p>
                      </div>

                      {/* Playboard Videos */}
                      <div className="mb-4">
                        <label className="text-xs text-gray-400">Playboard Videos</label>
                        <select className="w-full mt-1 px-3 py-2 bg-gray-900 border border-gray-600 rounded text-sm">
                          <option value="videos-downloaded-playboard">Videos/Downloaded/Playboard (Default)</option>
                          <option value="videos-queue">Videos/Queue</option>
                          <option value="videos-app">Videos/Uploaded/App</option>
                          <option value="custom">Custom Folder (specify below)</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">ðŸŽ¬ For Playboard videos downloaded for repurposing</p>
                      </div>

                      {/* DailyHaha Videos */}
                      <div className="mb-4">
                        <label className="text-xs text-gray-400">DailyHaha Videos</label>
                        <select className="w-full mt-1 px-3 py-2 bg-gray-900 border border-gray-600 rounded text-sm">
                          <option value="videos-downloaded-dailyhaha">Videos/Downloaded/Dailyhaha (Default)</option>
                          <option value="videos-queue">Videos/Queue</option>
                          <option value="videos-app">Videos/Uploaded/App</option>
                          <option value="custom">Custom Folder (specify below)</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">ðŸ˜„ For DailyHaha videos downloaded for repurposing</p>
                      </div>

                      {/* Douyin Videos */}
                      <div className="mb-4">
                        <label className="text-xs text-gray-400">Douyin Videos</label>
                        <select className="w-full mt-1 px-3 py-2 bg-gray-900 border border-gray-600 rounded text-sm">
                          <option value="videos-downloaded-douyin">Videos/Downloaded/Douyin (Default)</option>
                          <option value="videos-queue">Videos/Queue</option>
                          <option value="videos-app">Videos/Uploaded/App</option>
                          <option value="custom">Custom Folder (specify below)</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">ðŸ® For Douyin videos downloaded for repurposing</p>
                      </div>

                      {/* General Source Videos */}
                      <div className="mb-4">
                        <label className="text-xs text-gray-400">General Source Videos (YouTube, Web, etc.)</label>
                        <select className="w-full mt-1 px-3 py-2 bg-gray-900 border border-gray-600 rounded text-sm">
                          <option value="videos-downloaded">Videos/Downloaded (Default)</option>
                          <option value="videos-queue">Videos/Queue</option>
                          <option value="videos-app">Videos/Uploaded/App</option>
                          <option value="custom">Custom Folder (specify below)</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">ðŸŽ¬ For general source videos from various platforms</p>
                      </div>

                      {/* Custom Folder ID */}
                      <div className="mt-4 pt-4 border-t border-gray-700">
                        <label className="text-xs text-gray-400">Custom Folder IDs (Optional)</label>
                        <p className="text-xs text-gray-500 mb-2">Use folder IDs if you want to use a custom location instead of defaults above</p>
                        <input className="w-full mt-1 px-3 py-2 bg-gray-900 border border-gray-600 rounded text-sm" placeholder="e.g., 1abcdef..." />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={saveScraperConfig} disabled={savingScraperConfig} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm flex items-center gap-2 disabled:opacity-50">
                      <Save className="w-4 h-4" />
                      {savingScraperConfig ? 'Saving...' : 'Save Configuration'}
                    </button>
                    <button onClick={() => {
                      setScraperConfig(null);
                      loadScraperConfig();
                    }} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm flex items-center gap-2">
                      <RefreshCw className="w-4 h-4" />
                      Reset to Defaults
                    </button>
                  </div>

                  <div className="p-3 bg-blue-900 border border-blue-700 rounded text-sm">
                    <div className="font-semibold text-blue-300 mb-2">ðŸ’¡ How it works:</div>
                    <ul className="list-disc list-inside text-blue-300 space-y-1 text-xs">
                      <li>Videos downloaded from scraper services automatically upload to configured folders</li>
                      <li>Each source type (TikTok, Reels, YouTube, Playboard, DailyHaha, Douyin, General) can have its own destination</li>
                      <li>Supports automatic organization and prevent accidental overwrites</li>
                      <li>Videos can be automatically moved to "Queue" for processing</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Log Viewer Modal */}
      <LogViewer
        sessionId={logSessionId}
        isOpen={logViewerVisible}
        onClose={() => setLogViewerVisible(false)}
      />
    </div>
  );
}

