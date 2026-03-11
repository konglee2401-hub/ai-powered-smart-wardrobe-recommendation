import React, { useEffect, useState } from 'react';
import { Settings, RefreshCw, CheckCircle, AlertCircle, Shield, Save, Link as LinkIcon, Play, FileText } from 'lucide-react';
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
  const [active, setActive] = useState('google-flow');
  const [gfStatus, setGfStatus] = useState(null);
  const [cgptStatus, setCgptStatus] = useState(null);
  const [grokStatus, setGrokStatus] = useState(null);
  const [gdCreds, setGdCreds] = useState({ clientId: '', clientSecret: '', redirectUri: '' });
  const [ytCreds, setYtCreds] = useState({ clientId: '', clientSecret: '', redirectUri: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [driveConfig, setDriveConfig] = useState(null);
  const [loadingDriveConfig, setLoadingDriveConfig] = useState(false);
  const [scraperConfig, setScraperConfig] = useState(null);
  const [savingScraperConfig, setSavingScraperConfig] = useState(false);
  const [logViewerVisible, setLogViewerVisible] = useState(false);
  const [logSessionId, setLogSessionId] = useState(null);

  const loadStatuses = async () => {
    try {
      const [gf, cg, gr] = await Promise.all([
        axiosInstance.get('/auth-setup/status/google-flow-session'),
        axiosInstance.get('/auth-setup/status/chatgpt-session'),
        axiosInstance.get('/auth-setup/status/grok-session'),
      ]);
      setGfStatus(gf.data);
      setCgptStatus(cg.data);
      setGrokStatus(gr.data);
    } catch {}
  };

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
    loadStatuses();
    loadStoredCreds();
  }, []);

  useEffect(() => {
    if (active === 'drive-config') {
      loadDriveConfig();
    } else if (active === 'scraper-videos') {
      loadScraperConfig();
    }
  }, [active]);

  const runGoogleFlowRefresh = async () => {
    setMessage('');
    try {
      const response = await axiosInstance.post('/auth-setup/run/refresh-google-flow');
      if (response.data?.sessionId) {
        // Show log viewer with the session ID
        setLogSessionId(response.data.sessionId);
        setLogViewerVisible(true);
        setMessage('ðŸ“‹ Log viewer opened - monitoring refresh process...');
        // Check status after refresh completes
        setTimeout(loadStatuses, 5000);
      } else {
        setMessage(t('authSetup.messages.startedGoogleFlow'));
        setTimeout(loadStatuses, 4000);
      }
    } catch (error) {
      setMessage('Error starting refresh: ' + (error.response?.data?.error || error.message));
    }
  };

  const runChatGPTLogin = async (mode) => {
    setMessage('');
    try {
      const response = await axiosInstance.post(`/auth-setup/run/chatgpt-auto-login?mode=${mode || ''}`);
      if (response.data?.sessionId) {
        // Show log viewer with the session ID
        setLogSessionId(response.data.sessionId);
        setLogViewerVisible(true);
        setMessage('📋 Log viewer opened - monitoring auto-login process...');
        // Check status after auto-login completes
        setTimeout(loadStatuses, 5000);
      } else {
        setMessage(t('authSetup.messages.startedChatGPTLogin'));
        setTimeout(loadStatuses, 4000);
      }
    } catch (error) {
      setMessage('Error starting auto-login: ' + (error.response?.data?.error || error.message));
    }
  };

  const runGrokLogin = async (mode, usePlaywright = false) => {
    setMessage('');
    try {
      const url = `/auth-setup/run/grok-auto-login?mode=${mode || ''}${usePlaywright ? '&playwright=true' : ''}`;
      const response = await axiosInstance.post(url);
      if (response.data?.sessionId) {
        // Show log viewer with the session ID
        setLogSessionId(response.data.sessionId);
        setLogViewerVisible(true);
        setMessage(`📋 Log viewer opened - monitoring Grok process ${usePlaywright ? '(Playwright)' : '(Puppeteer)'}...`);
        // Check status after process completes
        setTimeout(loadStatuses, 5000);
      } else {
        setMessage('Grok process started');
        setTimeout(loadStatuses, 4000);
      }
    } catch (error) {
      setMessage('Error starting Grok process: ' + (error.response?.data?.error || error.message));
    }
  };

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
              title={t('authSetup.sections.googleFlow.title')}
              description={t('authSetup.sections.googleFlow.desc')}
              active={active === 'google-flow'}
              onClick={() => setActive('google-flow')}
            />
            <SectionCard
              title={t('authSetup.sections.chatgpt.title')}
              description={t('authSetup.sections.chatgpt.desc')}
              active={active === 'chatgpt'}
              onClick={() => setActive('chatgpt')}
            />
            <SectionCard
              title="Grok AI"
              description="Auto-login & session management"
              active={active === 'grok'}
              onClick={() => setActive('grok')}
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

              {active === 'google-flow' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-semibold">{t('authSetup.sections.googleFlow.title')}</div>
                    <div className="flex gap-2">
                      <button onClick={runGoogleFlowRefresh} className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded text-xs flex items-center gap-1">
                        <RefreshCw className="w-4 h-4" /> {t('authSetup.buttons.refreshSession')}
                      </button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-300">{t('authSetup.googleFlow.instructions')}</div>
                  <div className="flex items-center gap-3 text-sm">
                    <span>{t('authSetup.status.label')}</span>
                    {gfStatus?.exists ? (
                      <span className="flex items-center gap-1 text-green-400"><CheckCircle className="w-4 h-4" /> {t('authSetup.status.sessionPresent')}</span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-400"><AlertCircle className="w-4 h-4" /> {t('authSetup.status.sessionMissing')}</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-400">{t('authSetup.googleFlow.verifyNote')} {gfStatus?.path || 'backend/.sessions/google-flow-session-complete.json'}</div>
                </div>
              )}

              {active === 'chatgpt' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-semibold">{t('authSetup.sections.chatgpt.title')}</div>
                    <div className="flex gap-2">
                      <button onClick={() => runChatGPTLogin()} className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded text-xs flex items-center gap-1">
                        <Play className="w-4 h-4" /> {t('authSetup.buttons.autoLogin')}
                      </button>
                      <button onClick={() => runChatGPTLogin('refresh')} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs">
                        {t('authSetup.buttons.refresh')}
                      </button>
                      <button onClick={() => runChatGPTLogin('validate')} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs">
                        {t('authSetup.buttons.validate')}
                      </button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-300">{t('authSetup.chatgpt.instructions')}</div>
                  <div className="flex items-center gap-3 text-sm">
                    <span>{t('authSetup.status.label')}</span>
                    {cgptStatus?.exists ? (
                      <span className="flex items-center gap-1 text-green-400"><CheckCircle className="w-4 h-4" /> {t('authSetup.status.sessionPresent')}</span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-400"><AlertCircle className="w-4 h-4" /> {t('authSetup.status.sessionMissing')}</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-400">{t('authSetup.chatgpt.verifyNote')} {cgptStatus?.path || 'backend/data/chatgpt-profiles/default/session.json'}</div>
                </div>
              )}

              {active === 'grok' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-semibold">🤖 Grok AI Authentication</div>
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => runGrokLogin()} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-xs flex items-center gap-1">
                        <Play className="w-4 h-4" /> Auto-Login
                      </button>
                      <button onClick={() => runGrokLogin('refresh')} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs flex items-center gap-1">
                        <RefreshCw className="w-4 h-4" /> Refresh
                      </button>
                      <button onClick={() => runGrokLogin('validate')} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs">
                        Validate
                      </button>
                      <button onClick={() => runGrokLogin('capture')} className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 rounded text-xs">
                        Capture (Puppeteer)
                      </button>
                      <button onClick={() => runGrokLogin('capture', true)} className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 rounded text-xs" title="Better Cloudflare handling">
                        🎭 Capture (Playwright)
                      </button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-300">
                    Manage Grok AI authentication, sessions, and browser automation. Use capture to initiate manual login through browser, auto-login to restore from saved session.
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span>Session Status:</span>
                    {grokStatus?.exists ? (
                      <span className="flex items-center gap-1 text-green-400">
                        <CheckCircle className="w-4 h-4" /> Session Present
                        {grokStatus?.meta?.mtime && <span className="text-xs text-gray-400 ml-2">({new Date(grokStatus.meta.mtime).toLocaleDateString()})</span>}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-400"><AlertCircle className="w-4 h-4" /> No Session</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-400">
                    Session file: {grokStatus?.path || 'backend/.sessions/grok-session-complete.json'}
                  </div>
                  
                  <div className="p-3 bg-blue-900/30 border border-blue-700/30 rounded text-sm">
                    <div className="font-semibold text-blue-300 mb-2">💡 How it works:</div>
                    <ul className="list-disc list-inside text-blue-300 space-y-1 text-xs">
                      <li><strong>Capture:</strong> Open browser and perform manual login - session will be auto-saved</li>
                      <li><strong>Capture (Playwright):</strong> Better for Cloudflare bypass - use if Puppeteer fails</li>
                      <li><strong>Auto-Login:</strong> Restore saved session automatically (fastest)</li>
                      <li><strong>Refresh:</strong> Update/refresh existing session tokens</li>
                      <li><strong>Validate:</strong> Check if current session is valid and working</li>
                      <li>All operations show real-time progress in the log viewer</li>
                    </ul>
                  </div>
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

