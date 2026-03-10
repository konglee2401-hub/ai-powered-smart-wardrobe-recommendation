import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Clapperboard,
  Download,
  HardDrive,
  Layers3,
  Link2,
  Plus,
  RefreshCcw,
  Send,
  Settings2,
  Sparkles,
  Trash2,
  Upload,
  Users,
  Video,
  Youtube,
} from 'lucide-react';
import toast from 'react-hot-toast';
import GalleryPicker from '../components/GalleryPicker';
import VideoPipelineLayout from '../components/VideoPipelineLayout';
import YoutubePublishDialog from '../components/YoutubePublishDialog';
import videoPipelineApi from '../services/videoPipelineApi';
import {
  formatDate,
  formatNumber,
  getActionButtonClass,
  INPUT_CLASS,
  MetricCard,
  SectionHeader,
  SourcePill,
  StatusPill,
  SURFACE_CARD_CLASS,
  SUBTLE_PANEL_CLASS,
  CHECKBOX_PANEL_CLASS,
  LOG_PANEL_CLASS,
  INSET_PANEL_CLASS,
  TABLE_SHELL_CLASS,
  TEXTAREA_CLASS,
  toneFromStatus,
} from './video-pipeline/theme.jsx';

const SECTIONS = [
  { id: 'overview', label: 'Overview', icon: Sparkles },
  { id: 'scraping', label: 'Scraping', icon: Download },
  { id: 'videos', label: 'Videos', icon: Video },
  { id: 'production', label: 'Production', icon: Clapperboard },
  { id: 'publish', label: 'Publish', icon: Send },
  { id: 'sources', label: 'Sources', icon: Link2 },
  { id: 'channels', label: 'Channels', icon: Users },
  { id: 'queue', label: 'Queue', icon: Layers3 },
  { id: 'settings', label: 'Settings', icon: Settings2 },
];

const LEGACY_PATH_SECTION = {
  '/shorts-reels/dashboard': 'overview',
  '/shorts-reels/channels': 'channels',
  '/shorts-reels/videos': 'videos',
  '/shorts-reels/logs': 'queue',
  '/shorts-reels/settings': 'settings',
  '/video-production': 'production',
};

const DEFAULT_SOURCE_FORM = {
  id: '',
  key: '',
  name: '',
  provider: '',
  description: '',
  defaultUrl: '',
  enabled: true,
  sortOrder: 50,
  videoCriteria: { minViews: 0, minSubscribers: 0, minTotalVideos: 0 },
  channelCriteria: { minViews: 0, minSubscribers: 0, minTotalVideos: 0 },
};

const DEFAULT_SETTINGS = {
  discovery: {
    keywords: { hai: [], dance: [], cooking: [] },
    maxConcurrentDownload: 3,
    minViewsFilter: 100000,
    proxyList: [],
    telegramBotToken: '',
    isEnabled: true,
    discoverSchedule: { enabled: true, mode: 'daily', everyHours: 24, dailyTime: '07:00', label: 'Every day at 07:00' },
    scanSchedule: { enabled: true, mode: 'daily', everyHours: 24, dailyTime: '08:30', label: 'Every day at 08:30' },
  },
  production: {
    scheduler: { enabled: false, mode: 'manual', everyHours: 1, dailyTime: '09:00', label: 'Manual only' },
    schedulerEnabled: false,
    autoPublish: false,
    defaultPlatform: 'youtube',
    youtubePublishType: 'shorts',
    templateSources: [],
  },
};

const DEFAULT_CONNECTION = {
  platform: 'youtube',
  username: '',
  displayName: '',
  email: '',
  accessToken: '',
  refreshToken: '',
  apiKey: '',
  channelId: '',
  pageId: '',
  businessId: '',
};

const DEFAULT_COMPOSER = {
  recipe: 'mashup',
  platform: 'youtube',
  duration: 30,
  aspectRatio: '9:16',
  layout: '2-3-1-3',
  subtitleMode: 'auto',
  watermarkEnabled: true,
  voiceoverEnabled: false,
  templateStrategy: 'random',
  youtubePublishType: 'shorts',
};

const DEFAULT_MANUAL_SELECTIONS = {
  main: null,
  sub: null,
};

const DEFAULT_PLAYBOARD_METADATA = {
  categories: ['All'],
  dimensions: [
    { value: 'most-viewed', label: 'Most Viewed' },
    { value: 'most-liked', label: 'Most Liked' },
    { value: 'most-commented', label: 'Most Commented' },
  ],
  countries: [{ code: 'go', name: 'Worldwide' }],
  periods: [
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' },
  ],
};

const DEFAULT_MANUAL_DISCOVERY = {
  source: 'playboard',
  category: 'All',
  dimension: 'most-viewed',
  country: 'Worldwide',
  period: 'weekly',
};

const DEFAULT_PRODUCTION_BATCH = {
  sourceKey: '',
  limit: 5,
  syncSourceToDrive: true,
  startImmediately: true,
};

function inferSection(pathname) {
  if (LEGACY_PATH_SECTION[pathname]) return LEGACY_PATH_SECTION[pathname];
  if (pathname.startsWith('/video-pipeline/')) {
    const section = pathname.replace('/video-pipeline/', '').split('/')[0];
    return SECTIONS.some((item) => item.id === section) ? section : 'overview';
  }
  return 'overview';
}

function sectionPath(sectionId) {
  return sectionId === 'overview' ? '/video-pipeline' : `/video-pipeline/${sectionId}`;
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function resolveOutputPreview(item = {}) {
  if (!item?.queueId) return '';
  return `/api/assets/proxy/video_pipeline_generated_${item.queueId}`;
}

function EmptyState({ label }) {
  return (
    <div className={`${SURFACE_CARD_CLASS} p-10 text-center text-sm text-slate-400`}>
      {label}
    </div>
  );
}

function ScheduleEditor({ title, subtitle, value, onChange }) {
  const { i18n } = useTranslation();
  const isVi = (i18n.language || 'en').toLowerCase().startsWith('vi');
  const tr = (vi, en) => (isVi ? vi : en);
  const schedule = value || { enabled: false, mode: 'manual', everyHours: 1, dailyTime: '09:00', label: 'Manual only' };

  return (
    <div className={`${SUBTLE_PANEL_CLASS} rounded-[26px]`}>
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        {subtitle ? <p className="mt-1 text-xs text-slate-400">{subtitle}</p> : null}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <label className={`${CHECKBOX_PANEL_CLASS} block`}>
          <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{tr('Báº­t', 'Enabled')}</span>
          <input
            type="checkbox"
            checked={Boolean(schedule.enabled)}
            onChange={(event) => onChange({ ...schedule, enabled: event.target.checked, mode: event.target.checked ? schedule.mode : 'manual' })}
            className="h-4 w-4 rounded border-slate-400/70 bg-white/80"
          />
        </label>
        <label className={`${CHECKBOX_PANEL_CLASS} block`}>
          <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{tr('Cháº¿ Ä‘á»™', 'Mode')}</span>
          <select value={schedule.mode} onChange={(event) => onChange({ ...schedule, mode: event.target.value })} className={INPUT_CLASS}>
            <option value="manual">{tr('Chá»‰ cháº¡y thá»§ cÃ´ng', 'Manual only')}</option>
            <option value="hourly">{tr('Má»—i X giá»', 'Every X hours')}</option>
            <option value="daily">{tr('Má»—i ngÃ y theo giá»', 'Every day at time')}</option>
          </select>
        </label>
        <div className="rounded-2xl border border-violet-300/14 bg-violet-400/10 px-4 py-3 text-sm text-violet-50">
          <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-100/70">{tr('TÃ³m táº¯t', 'Summary')}</span>
          <p>{schedule.label || tr('Chá»‰ cháº¡y thá»§ cÃ´ng', 'Manual only')}</p>
        </div>
      </div>

      {schedule.mode === 'hourly' ? (
        <div className="mt-3">
          <label className="text-xs text-slate-400">{tr('Cháº¡y má»—i', 'Run every')}</label>
          <input type="number" min="1" max="24" value={schedule.everyHours || 1} onChange={(event) => onChange({ ...schedule, everyHours: Number(event.target.value) || 1 })} className={`${INPUT_CLASS} mt-2 max-w-[220px]`} />
        </div>
      ) : null}

      {schedule.mode === 'daily' ? (
        <div className="mt-3">
          <label className="text-xs text-slate-400">{tr('Giá» cháº¡y hÃ ng ngÃ y', 'Daily time')}</label>
          <input type="time" value={schedule.dailyTime || '09:00'} onChange={(event) => onChange({ ...schedule, dailyTime: event.target.value })} className={`${INPUT_CLASS} mt-2 max-w-[220px]`} />
        </div>
      ) : null}
    </div>
  );
}

function queueExecutionTone(job = {}) {
  const executionState = job?.queueControl?.executionState || 'idle';
  return {
    'auto-retry-pending': 'amber',
    'manual-review': 'violet',
    pending: 'amber',
    processing: 'amber',
    ready: 'emerald',
    uploaded: 'emerald',
    failed: 'rose',
    idle: 'violet',
  }[executionState] || toneFromStatus(executionState);
}

function queueExecutionLabel(job = {}, tr = (vi, en) => en) {
  const executionState = job?.queueControl?.executionState || 'idle';
  return {
    'auto-retry-pending': tr('Tá»± retry', 'Auto retry'),
    'manual-review': tr('Cáº§n review', 'Manual review'),
    pending: tr('Äang chá»', 'Pending'),
    processing: tr('Äang cháº¡y', 'Processing'),
    ready: tr('Sáºµn sÃ ng', 'Ready'),
    uploaded: tr('ÄÃ£ upload', 'Uploaded'),
    failed: tr('Tháº¥t báº¡i', 'Failed'),
    idle: tr('ChÆ°a cháº¡y', 'Idle'),
  }[executionState] || tr('ChÆ°a cháº¡y', 'Idle');
}

function queueActionLabel(job = {}, tr = (vi, en) => en) {
  const nextAction = job?.queueControl?.nextAction || 'none';
  if (nextAction === 'manual-start') {
    return job?.queueControl?.executionState === 'manual-review'
      ? tr('Retry thu cong', 'Manual retry')
      : tr('Chay thu cong', 'Manual start');
  }
  if (nextAction === 'auto-retry') {
    return tr('Doi auto retry', 'Await auto retry');
  }
  if (job?.status === 'ready') {
    return tr('San sang publish', 'Ready to publish');
  }
  return tr('Xem chi tiet', 'View details');
}

export default function VideoPipeline() {
  const { i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const activeSection = inferSection(location.pathname);
  const isVi = (i18n.language || 'en').toLowerCase().startsWith('vi');
  const tr = (vi, en) => (isVi ? vi : en);

  const [dashboard, setDashboard] = useState(null);
  const [sources, setSources] = useState([]);
  const [channels, setChannels] = useState([]);
  const [videos, setVideos] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [jobStats, setJobStats] = useState({});
  const [queueRuntime, setQueueRuntime] = useState({ stats: {}, runtime: {} });
  const [connections, setConnections] = useState({ accounts: [], stats: {} });
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [sourceForm, setSourceForm] = useState(DEFAULT_SOURCE_FORM);
  const [selectedVideoIds, setSelectedVideoIds] = useState([]);
  const [selectedPublishAccounts, setSelectedPublishAccounts] = useState({});
  const [jobLogs, setJobLogs] = useState({});
  const [busyAction, setBusyAction] = useState('');
  const [jobStatusFilter, setJobStatusFilter] = useState('');
  const [channelFilters, setChannelFilters] = useState({ source: '', status: '', search: '' });
  const [videoFilters, setVideoFilters] = useState({ source: '', downloadStatus: '', driveStatus: '', search: '' });
  const [videoPagination, setVideoPagination] = useState({ page: 1, limit: 25, total: 0 });
  const [composer, setComposer] = useState(DEFAULT_COMPOSER);
  const [connectionForm, setConnectionForm] = useState(DEFAULT_CONNECTION);
  const [manualSelections, setManualSelections] = useState(DEFAULT_MANUAL_SELECTIONS);
  const [galleryPickerSlot, setGalleryPickerSlot] = useState('');
  const [selectedChannelIds, setSelectedChannelIds] = useState([]);
  const [scraperOverview, setScraperOverview] = useState(null);
  const [scraperLogs, setScraperLogs] = useState([]);
  const [captchaJobs, setCaptchaJobs] = useState([]);
  const [scraperSettings, setScraperSettings] = useState(null);
  const [playboardConfigs, setPlayboardConfigs] = useState([]);
  const [playboardMetadata, setPlayboardMetadata] = useState(DEFAULT_PLAYBOARD_METADATA);
  const [manualDiscovery, setManualDiscovery] = useState(DEFAULT_MANUAL_DISCOVERY);
  const [queueTimeoutMinutes, setQueueTimeoutMinutes] = useState(30);
  const [queueClearFilter, setQueueClearFilter] = useState('failed');
  const [schedulerRuntime, setSchedulerRuntime] = useState(null);
  const [productionOverview, setProductionOverview] = useState(null);
  const [productionBatch, setProductionBatch] = useState(DEFAULT_PRODUCTION_BATCH);
  const [youtubePublishQueueId, setYoutubePublishQueueId] = useState(null);
  const [youtubePublishJobData, setYoutubePublishJobData] = useState(null);
  const [previewItem, setPreviewItem] = useState(null);
  const [progressHelper, setProgressHelper] = useState(null);
  const progressTimerRef = useRef(null);
  const progressHideRef = useRef(null);

  const navItems = useMemo(() => {
    const labels = {
      scraping: tr('Scraping', 'Scraping'),
      overview: tr('Tá»•ng quan', 'Overview'),
      videos: tr('Video', 'Videos'),
      production: tr('Sáº£n xuáº¥t', 'Production'),
      publish: tr('ÄÄƒng táº£i', 'Publish'),
      sources: tr('Nguá»“n', 'Sources'),
      channels: tr('KÃªnh', 'Channels'),
      queue: tr('HÃ ng Ä‘á»£i', 'Queue'),
      settings: tr('CÃ i Ä‘áº·t', 'Settings'),
    };

    return SECTIONS.map((item) => ({
      ...item,
      label: labels[item.id] || item.label,
      to: sectionPath(item.id),
    }));
  }, [isVi]);
  const selectedVideos = useMemo(() => videos.filter((item) => selectedVideoIds.includes(item.id)), [selectedVideoIds, videos]);

  const currentSectionMeta = useMemo(() => ({
    overview: {
      title: tr('Báº£ng Ä‘iá»u phá»‘i váº­n hÃ nh', 'Operator workflow dashboard'),
      subtitle: tr('Theo dÃµi toÃ n bá»™ luá»“ng tá»« scraping, Ä‘á»“ng bá»™ Drive, sáº£n xuáº¥t cho Ä‘áº¿n Ä‘Äƒng táº£i.', 'Follow the full workflow from scraping and Drive sync to production and publishing.'),
    },
    scraping: {
      title: tr('Scraper operations', 'Scraper operations'),
      subtitle: tr('Run manual discovery, inspect scraper logs, and handle queue alerts in a dedicated workspace.', 'Run manual discovery, inspect scraper logs, and handle queue alerts in a dedicated workspace.'),
    },
    videos: {
      title: tr('Kho video Ä‘Ã£ thu tháº­p', 'Scraped video inventory'),
      subtitle: tr('Xem video Ä‘Ã£ cÃ o, Ä‘á»“ng bá»™ Drive vÃ  Ä‘áº©y vÃ o sáº£n xuáº¥t.', 'Review scraped videos, sync them to Drive, and push them into production.'),
    },
    production: {
      title: tr('Composer sáº£n xuáº¥t', 'Production composer'),
      subtitle: tr('Chá»n main/sub video, cáº¥u hÃ¬nh mashup, phá»¥ Ä‘á», watermark vÃ  voiceover trong cÃ¹ng má»™t luá»“ng.', 'Select main/sub videos and configure mashup, subtitles, watermark, and voiceover in one flow.'),
    },
    publish: {
      title: tr('Káº¿t ná»‘i vÃ  Ä‘Äƒng táº£i', 'Publishing connections'),
      subtitle: tr('XÃ¡c minh káº¿t ná»‘i social vÃ  thá»±c hiá»‡n Ä‘Äƒng táº£i thá»§ cÃ´ng khi video sáºµn sÃ ng.', 'Verify social connections and publish manually when outputs are ready.'),
    },
    sources: {
      title: tr('Registry nguá»“n scraping', 'Scraping source registry'),
      subtitle: tr('Quáº£n lÃ½ source máº·c Ä‘á»‹nh vÃ  source tÃ¹y chá»‰nh lÆ°u trÃªn Mongo.', 'Manage default and custom scraping sources stored in Mongo.'),
    },
    channels: {
      title: tr('Kho channel trong cÆ¡ sá»Ÿ dá»¯ liá»‡u', 'Channels in database'),
      subtitle: tr('TÃ¡ch riÃªng inventory channel khá»i pháº§n cáº¥u hÃ¬nh source.', 'Keep channel inventory separate from source configuration.'),
    },
    queue: {
      title: tr('HÃ ng Ä‘á»£i xá»­ lÃ½ ná»n', 'Background queue'),
      subtitle: tr('Theo dÃµi job xá»­ lÃ½, log vÃ  chá»§ Ä‘á»™ng manual start khi cáº§n.', 'Track processing jobs, logs, and manually start work when needed.'),
    },
    settings: {
      title: tr('CÃ i Ä‘áº·t pipeline', 'Pipeline settings'),
      subtitle: tr('Thiáº¿t láº­p lá»‹ch cháº¡y dáº¡ng dá»… Ä‘á»c vÃ  quáº£n lÃ½ folder template trÃªn Drive.', 'Configure human-readable schedules and manage template folders on Drive.'),
    },
  }[activeSection] || {
    title: tr('Video Pipeline', 'Video Pipeline'),
    subtitle: tr('Luá»“ng thá»‘ng nháº¥t tá»« nguá»“n Ä‘áº¿n Ä‘Äƒng táº£i.', 'Unified source-to-publish workflow.'),
  }), [activeSection, isVi]);

  const activeNavItem = useMemo(() => navItems.find((item) => item.id === activeSection) || navItems[0], [activeSection, navItems]);
  const ActiveSectionIcon = activeNavItem?.icon || Sparkles;
  const sourceRuntimeSummary = useMemo(() => {
    const discoverSourceToggles = scraperSettings?.discoverSources || {};
    const manualDiscoverProviders = new Set(['playboard', 'dailyhaha', 'douyin']);

    return new Map(
      sources.map((item) => {
        const providerKey = String(item.provider || item.key || '').toLowerCase();
        const toggleKey = Object.prototype.hasOwnProperty.call(discoverSourceToggles, item.key)
          ? item.key
          : (Object.prototype.hasOwnProperty.call(discoverSourceToggles, providerKey) ? providerKey : '');

        return [
          item.id,
          {
            discoverToggle: toggleKey ? discoverSourceToggles[toggleKey] : null,
            supportsManualDiscover: manualDiscoverProviders.has(providerKey),
            activePlayboardConfigs: providerKey === 'playboard'
              ? playboardConfigs.filter((config) => config.isActive !== false).length
              : 0,
          },
        ];
      })
    );
  }, [playboardConfigs, scraperSettings, sources]);
  const latestDiscoverLog = useMemo(
    () => scraperLogs.find((item) => item.jobType === 'discover') || null,
    [scraperLogs]
  );
  const latestScanLog = useMemo(
    () => scraperLogs.find((item) => item.jobType === 'scan-channel') || null,
    [scraperLogs]
  );
  const latestDownloadLog = useMemo(
    () => scraperLogs.find((item) => item.jobType === 'download') || null,
    [scraperLogs]
  );
  const enabledDiscoverSourceCount = useMemo(
    () => Object.values(scraperSettings?.discoverSources || {}).filter(Boolean).length,
    [scraperSettings]
  );
  const manualScraperSourceCount = useMemo(
    () => Array.from(sourceRuntimeSummary.values()).filter((item) => item.supportsManualDiscover).length,
    [sourceRuntimeSummary]
  );
  const enabledSubVideoSources = useMemo(
    () => (settings.production?.subVideoLibrarySources || []).filter((item) => item.enabled !== false),
    [settings.production?.subVideoLibrarySources]
  );
  const allPageVideosSelected = useMemo(
    () => videos.length > 0 && videos.every((item) => selectedVideoIds.includes(item.id)),
    [videos, selectedVideoIds]
  );
  const heroStats = useMemo(() => {
    if (activeSection === 'videos') {
      return [
        { label: tr('All', 'Total'), value: dashboard?.metrics?.totalVideos || 0 },
        { label: tr('Äang táº£i', 'Downloading'), value: dashboard?.metrics?.downloadProcessing || 0 },
        { label: tr('Chá» táº£i', 'Pending'), value: dashboard?.metrics?.downloadPending || 0 },
        { label: tr('ÄÃ£ táº£i', 'Done'), value: dashboard?.metrics?.downloadDone || 0 },
        { label: tr('Lá»—i táº£i', 'Failed'), value: dashboard?.metrics?.downloadFailed || 0 },
        { label: tr('Drive', 'Drive ready'), value: dashboard?.metrics?.driveReadyVideos || 0 },
        { label: tr('Queued', 'Queued'), value: dashboard?.metrics?.queuedVideos || 0 },
        { label: tr('Selected', 'Selected'), value: selectedVideoIds.length },
      ];
    }

    if (activeSection === 'sources') {
      return [
        { label: tr('Nguon', 'Sources'), value: dashboard?.metrics?.configuredSources || 0 },
        { label: tr('Manual', 'Manual'), value: manualScraperSourceCount || 0 },
        { label: tr('Enable', 'Enabled'), value: enabledDiscoverSourceCount || 0 },
        { label: tr('Active', 'Active'), value: sources.filter((item) => item.enabled !== false).length },
      ];
    }

    if (activeSection === 'channels') {
      return [
        { label: tr('Channels', 'Channels'), value: dashboard?.metrics?.totalChannels || 0 },
        { label: tr('Active', 'Active'), value: channels.filter((item) => item.isActive).length },
        { label: tr('Queued', 'Queued'), value: dashboard?.metrics?.queuedVideos || 0 },
        { label: tr('Selected', 'Selected'), value: selectedChannelIds.length },
      ];
    }

    if (activeSection === 'publish') {
      return [
        { label: tr('Accounts', 'Accounts'), value: connections.stats?.totalAccounts || 0 },
        { label: tr('Active', 'Active'), value: connections.stats?.activeAccounts || 0 },
        { label: tr('Verified', 'Verified'), value: connections.stats?.verifiedAccounts || 0 },
        { label: tr('Ready', 'Ready'), value: dashboard?.metrics?.readyToPublish || 0 },
      ];
    }

    return [];
  }, [
    activeSection,
    dashboard?.metrics?.configuredSources,
    dashboard?.metrics?.driveReadyVideos,
    dashboard?.metrics?.downloadDone,
    dashboard?.metrics?.downloadFailed,
    dashboard?.metrics?.downloadPending,
    dashboard?.metrics?.downloadProcessing,
    dashboard?.metrics?.queuedVideos,
    dashboard?.metrics?.readyToPublish,
    dashboard?.metrics?.totalChannels,
    dashboard?.metrics?.totalVideos,
    enabledDiscoverSourceCount,
    manualScraperSourceCount,
    sources,
    channels,
    connections.stats,
    selectedChannelIds.length,
    selectedVideoIds.length,
    tr,
  ]);
  const showHeroStats = heroStats.length > 0;

  const clearProgressTimers = () => {
    if (progressTimerRef.current) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    if (progressHideRef.current) {
      window.clearTimeout(progressHideRef.current);
      progressHideRef.current = null;
    }
  };

  const resolveProgressLabel = (actionKey = '') => {
    if (actionKey.startsWith('scraper-job-')) {
      const jobType = actionKey.replace('scraper-job-', '');
      return tr(`Scraper ${jobType}`, `Scraper ${jobType}`);
    }
    if (actionKey.startsWith('manual-scan-')) return tr('Manual scan channel', 'Manual scan channel');
    if (actionKey.startsWith('start-job-')) return tr('Start production job', 'Start production job');
    return {
      'queue-scanner-now': tr('Queue scan', 'Queue scan'),
      'trigger-downloads': tr('Trigger downloads', 'Trigger downloads'),
      'upload-pending': tr('Upload pending', 'Upload pending'),
      'queue-folder': tr('Queue folder ingest', 'Queue folder ingest'),
      'queue-videos': tr('Queue production jobs', 'Queue production jobs'),
      'mass-production': tr('Mass production', 'Mass production'),
      'publish-job': tr('Publish job', 'Publish job'),
      'scan-selected-channels': tr('Scan selected channels', 'Scan selected channels'),
      'upload-video': tr('Sync video to Drive', 'Sync video to Drive'),
    }[actionKey] || actionKey || tr('Processing', 'Processing');
  };

  const shouldShowProgress = (actionKey = '') => (
    [
      'queue-scanner-now',
      'trigger-downloads',
      'upload-pending',
      'queue-folder',
      'queue-videos',
      'mass-production',
      'publish-job',
      'scan-selected-channels',
      'upload-video',
    ].includes(actionKey)
    || actionKey.startsWith('scraper-job-')
    || actionKey.startsWith('manual-scan-')
    || actionKey.startsWith('start-job-')
  );

  const startProgressHelper = (actionKey) => {
    if (!shouldShowProgress(actionKey)) return;
    const label = resolveProgressLabel(actionKey);
    clearProgressTimers();
    setProgressHelper({
      key: actionKey,
      label,
      status: 'running',
      percent: 4,
    });
    progressTimerRef.current = window.setInterval(() => {
      setProgressHelper((prev) => {
        if (!prev || prev.status !== 'running') return prev;
        const next = Math.min(92, (prev.percent || 0) + Math.max(1, Math.round(Math.random() * 4)));
        return { ...prev, percent: next };
      });
    }, 700);
  };

  const finishProgressHelper = (status = 'done', message = '') => {
    setProgressHelper((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        status,
        message: message || prev.message || '',
        percent: 100,
      };
    });
    clearProgressTimers();
    progressHideRef.current = window.setTimeout(() => {
      setProgressHelper(null);
    }, 3000);
  };

  useEffect(() => () => clearProgressTimers(), []);

  const runAction = async (label, task) => {
    setBusyAction(label);
    startProgressHelper(label);
    try {
      const result = await task();
      finishProgressHelper('done');
      return result;
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message || 'Action failed.');
      finishProgressHelper('failed', error?.response?.data?.error || error.message || '');
      return null;
    } finally {
      setBusyAction('');
    }
  };

  const loadDashboard = async () => setDashboard(await videoPipelineApi.getDashboard());
  const loadSources = async () => setSources((await videoPipelineApi.getSources()).items || []);
  const loadChannels = async () => setChannels((await videoPipelineApi.getChannels({ ...channelFilters, limit: 150 })).items || []);
  const loadVideos = async (page = 1) => {
    const offset = (page - 1) * videoPagination.limit;
    const response = await videoPipelineApi.getVideos({ ...videoFilters, offset, limit: videoPagination.limit });
    setVideos(response.items || []);
    setVideoPagination((prev) => ({ ...prev, page, total: response.count }));
  };
  const loadJobs = async () => {
    const result = await videoPipelineApi.getJobs({ status: jobStatusFilter, limit: 150 });
    setJobs(result.items || []);
    setJobStats(result.stats || {});
  };
  const loadQueueRuntime = async () => setQueueRuntime(await videoPipelineApi.getQueueRuntime({ timeoutMinutes: queueTimeoutMinutes }));
  const loadConnections = async () => {
    const result = await videoPipelineApi.getConnections();
    setConnections({ accounts: result.accounts || [], stats: result.stats || {} });
  };
  const loadSettings = async () => setSettings((await videoPipelineApi.getSettings()).settings || DEFAULT_SETTINGS);
  const loadSchedulerRuntime = async () => setSchedulerRuntime((await videoPipelineApi.getSchedulerRuntimeStatus()).data || null);
  const loadProductionOverview = async (sourceKey = productionBatch.sourceKey) =>
    setProductionOverview(await videoPipelineApi.getProductionOverview(sourceKey ? { sourceKey } : {}));
  const loadScraperOverview = async () => setScraperOverview(await videoPipelineApi.getScraperOverview());
  const loadScraperSettings = async () => setScraperSettings(await videoPipelineApi.getScraperSettings());
  const loadPlayboardConfigs = async () => setPlayboardConfigs((await videoPipelineApi.getPlayboardConfigs()).configs || []);
  const loadPlayboardMetadata = async () => {
    const result = await videoPipelineApi.getPlayboardMetadata();
    setPlayboardMetadata({
      categories: result.categories || DEFAULT_PLAYBOARD_METADATA.categories,
      dimensions: result.dimensions || DEFAULT_PLAYBOARD_METADATA.dimensions,
      countries: result.countries || DEFAULT_PLAYBOARD_METADATA.countries,
      periods: result.periods || DEFAULT_PLAYBOARD_METADATA.periods,
    });
  };
  const loadScraperLogs = async () => setScraperLogs((await videoPipelineApi.getScraperLogs()).items || []);
  const loadCaptchaJobs = async () => setCaptchaJobs((await videoPipelineApi.getCaptchaJobs({ limit: 20 })).items || []);
  const refreshScraperSurface = async () => {
    await Promise.allSettled([
      loadScraperOverview(),
      loadScraperLogs(),
      loadDashboard(),
      loadSources(),
      loadChannels(),
      loadVideos(1),
    ]);
  };
  const watchScraperSurface = async (intervals = [0, 5000, 15000, 30000]) => {
    for (const delay of intervals) {
      if (delay > 0) {
        await sleep(delay);
      }
      await refreshScraperSurface();
    }
  };

  const refreshAll = async () => {
    await runAction('refresh', async () => {
      await Promise.allSettled([
        loadDashboard(),
        loadSources(),
        loadChannels(),
        loadVideos(),
        loadJobs(),
        loadQueueRuntime(),
        loadConnections(),
        loadSettings(),
        loadSchedulerRuntime(),
        loadProductionOverview(),
        loadScraperOverview(),
        loadScraperSettings(),
        loadPlayboardConfigs(),
        loadScraperLogs(),
        loadCaptchaJobs(),
      ]);
    });
  };

  useEffect(() => {
    Promise.allSettled([loadPlayboardMetadata(), refreshAll()]).catch((error) => toast.error(error.message));
  }, []);

  useEffect(() => {
    loadChannels().catch((error) => toast.error(`Cannot load channels: ${error.message}`));
  }, [channelFilters.source, channelFilters.status, channelFilters.search]);

  useEffect(() => {
    setSelectedChannelIds((prev) => prev.filter((id) => channels.some((item) => item.id === id)));
  }, [channels]);

  useEffect(() => {
    loadVideos(1).catch((error) => toast.error(`Cannot load videos: ${error.message}`));
  }, [videoFilters.source, videoFilters.downloadStatus, videoFilters.driveStatus, videoFilters.search]);

  useEffect(() => {
    loadJobs().catch((error) => toast.error(`Cannot load jobs: ${error.message}`));
  }, [jobStatusFilter]);

  useEffect(() => {
    loadQueueRuntime().catch((error) => toast.error(`Cannot load queue runtime: ${error.message}`));
  }, [queueTimeoutMinutes]);

  useEffect(() => {
    loadProductionOverview().catch((error) => toast.error(`Cannot load production overview: ${error.message}`));
  }, [productionBatch.sourceKey]);

  const goToSection = (sectionId) => navigate(sectionPath(sectionId));
  const toggleVideoSelection = (videoId) => setSelectedVideoIds((prev) => (prev.includes(videoId) ? prev.filter((item) => item !== videoId) : [...prev, videoId]));
  const toggleAllVideos = () => {
    const pageIds = videos.map((item) => item.id);
    if (!pageIds.length) return;
    setSelectedVideoIds((prev) => {
      const allSelected = pageIds.every((id) => prev.includes(id));
      if (allSelected) {
        return prev.filter((id) => !pageIds.includes(id));
      }
      return Array.from(new Set([...prev, ...pageIds]));
    });
  };
  const resetSourceForm = () => setSourceForm(DEFAULT_SOURCE_FORM);
  const extractTriggerActivityCount = (payload) => {
    const candidates = [
      payload?.triggered,
      payload?.queued,
      payload?.scheduled,
      payload?.enqueued,
      payload?.processed,
      payload?.count,
      payload?.total,
    ];

    for (const candidate of candidates) {
      const value = Number(candidate);
      if (Number.isFinite(value)) {
        return value;
      }
    }

    return null;
  };

  const updateSettings = (section, key, value) => {
    setSettings((prev) => ({ ...prev, [section]: { ...(prev[section] || {}), [key]: value } }));
  };

  const updateTemplateSource = (index, key, value) => {
    setSettings((prev) => {
      const templateSources = [...(prev.production?.templateSources || [])];
      templateSources[index] = { ...(templateSources[index] || {}), [key]: value };
      return { ...prev, production: { ...(prev.production || {}), templateSources } };
    });
  };
  const updateProductionBatch = (key, value) => {
    setProductionBatch((prev) => ({ ...prev, [key]: value }));
  };

  const saveSource = async (event) => {
    event.preventDefault();
    await runAction('save-source', async () => {
      const payload = {
        key: sourceForm.key,
        name: sourceForm.name,
        provider: sourceForm.provider || sourceForm.key,
        description: sourceForm.description,
        defaultUrl: sourceForm.defaultUrl,
        enabled: sourceForm.enabled,
        sortOrder: Number(sourceForm.sortOrder) || 50,
        videoCriteria: {
          minViews: Number(sourceForm.videoCriteria?.minViews) || 0,
          minSubscribers: Number(sourceForm.videoCriteria?.minSubscribers) || 0,
          minTotalVideos: Number(sourceForm.videoCriteria?.minTotalVideos) || 0,
        },
        channelCriteria: {
          minViews: Number(sourceForm.channelCriteria?.minViews) || 0,
          minSubscribers: Number(sourceForm.channelCriteria?.minSubscribers) || 0,
          minTotalVideos: Number(sourceForm.channelCriteria?.minTotalVideos) || 0,
        },
      };
      const result = sourceForm.id
        ? await videoPipelineApi.updateSource(sourceForm.id, payload)
        : await videoPipelineApi.createSource(payload);
      toast.success(result.message || 'Source saved.');
      resetSourceForm();
      await Promise.allSettled([loadSources(), loadDashboard()]);
    });
  };

  const editSource = (item) => setSourceForm(deepClone({
    id: item.id,
    key: item.key,
    name: item.name,
    provider: item.provider,
    description: item.description || '',
    defaultUrl: item.defaultUrl || '',
    enabled: item.enabled !== false,
    sortOrder: item.sortOrder || 50,
    videoCriteria: {
      minViews: item.videoCriteria?.minViews || 0,
      minSubscribers: item.videoCriteria?.minSubscribers || 0,
      minTotalVideos: item.videoCriteria?.minTotalVideos || 0,
    },
    channelCriteria: {
      minViews: item.channelCriteria?.minViews || 0,
      minSubscribers: item.channelCriteria?.minSubscribers || 0,
      minTotalVideos: item.channelCriteria?.minTotalVideos || 0,
    },
    isDefault: item.isDefault,
  }));

  const removeSource = async (item) => {
    await runAction('delete-source', async () => {
      const result = await videoPipelineApi.deleteSource(item.id);
      if (!result.success) {
        toast.error(result.error || tr('KhÃ´ng thá»ƒ xoÃ¡ nguá»“n.', 'Cannot delete source.'));
        return;
      }
      toast.success(tr('ÄÃ£ xoÃ¡ nguá»“n.', 'Source deleted.'));
      if (sourceForm.id === item.id) resetSourceForm();
      await Promise.allSettled([loadSources(), loadDashboard()]);
    });
  };

  const assignManualSelection = (slot, item) => {
    if (!item) return;

    setManualSelections((prev) => ({
      ...prev,
      [slot]: {
        assetId: item.assetId,
        id: item.id,
        name: item.name,
        url: item.url || item.thumbnail || '',
        localPath: item.localPath || '',
        type: item.type || 'video',
        category: item.category || 'source-video',
        storage: item.storage || {},
      },
    }));
  };

  const uploadManualVideo = async (slot, file) => {
    if (!file) return;

    await runAction(`manual-upload-${slot}`, async () => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('slot', slot);
      const result = await videoPipelineApi.uploadOperatorVideo(formData);
      assignManualSelection(slot, result.item);
      toast.success(tr('ÄÃ£ upload video thá»§ cÃ´ng.', 'Manual video uploaded.'));
    });
  };

  const openGalleryPicker = (slot) => setGalleryPickerSlot(slot);
  const clearManualSelection = (slot) => setManualSelections((prev) => ({ ...prev, [slot]: null }));

  const triggerPendingDownloads = async () => {
    await runAction('trigger-downloads', async () => {
      const result = await videoPipelineApi.triggerPendingDownloads(300);
      if (!result.success) {
        toast.error(result.error || tr('Scraper service chÆ°a sáºµn sÃ ng.', 'Scraper service unavailable.'));
        return;
      }
      toast.success(result.message || tr('ÄÃ£ gá»­i lá»‡nh cháº¡y scraping.', 'Trigger sent.'));
    });
  };

  const uploadPendingVideos = async () => {
    await runAction('upload-pending', async () => {
      const result = await videoPipelineApi.uploadPendingVideos(30);
      toast.success(
        tr(
          `ÄÃ£ upload ${result.uploaded || 0}, bá» qua ${result.skipped || 0}, lá»—i ${result.failed || 0}.`,
          `Uploaded ${result.uploaded || 0}, skipped ${result.skipped || 0}, failed ${result.failed || 0}.`
        )
      );
      await Promise.allSettled([loadVideos(), loadDashboard()]);
    });
  };

  const handleTriggerPendingDownloads = async () => {
    await runAction('trigger-downloads', async () => {
      const result = await videoPipelineApi.triggerPendingDownloads(300);
      if (!result?.success) {
        toast.error(result?.error || tr('Scraper service chua san sang.', 'Scraper service unavailable.'));
        return;
      }

      const payload = result.data || result;
      const queued = Number(payload?.queued) || 0;
      const skipped = Number(payload?.skipped) || 0;
      const running = Number(payload?.queue?.running) || 0;
      const workers = Number(payload?.queue?.workers) || 0;
      const buffered = Number(payload?.queue?.uniqueQueuedVideos ?? payload?.queue?.queued) || 0;

      if (queued === 0) {
        toast(
          tr(
            `Khong co item moi duoc queue. Dang co ${buffered} item trong buffer, ${running}/${workers || 1} worker dang chay${skipped ? `, ${skipped} item da co san trong queue` : ''}.`,
            `No new items were queued. ${buffered} item(s) already buffered, ${running}/${workers || 1} worker(s) running${skipped ? `, ${skipped} item(s) already in queue` : ''}.`
          )
        );
      } else {
        toast.success(
          tr(
            `Da queue ${queued} item. Buffer hien co ${buffered}, worker dang chay ${running}/${workers || 1}${skipped ? `, bo qua ${skipped} item da co san` : ''}.`,
            `Queued ${queued} item(s). Buffer now ${buffered}, workers running ${running}/${workers || 1}${skipped ? `, skipped ${skipped} item(s) already queued` : ''}.`
          )
        );
      }

      await refreshScraperSurface();
      void watchScraperSurface([5000, 15000, 30000]);
      return;
    });
  };

  const handleUploadPendingVideos = async () => {
    await runAction('upload-pending', async () => {
      const result = await videoPipelineApi.uploadPendingVideos(30);
      const uploaded = Number(result?.uploaded) || 0;
      const skipped = Number(result?.skipped) || 0;
      const failed = Number(result?.failed) || 0;
      const total = Number(result?.total) || 0;
      const summary = tr(
        `Da upload ${uploaded}, bo qua ${skipped}, loi ${failed}.`,
        `Uploaded ${uploaded}, skipped ${skipped}, failed ${failed}.`
      );

      if (total === 0) {
        toast(tr('Khong co video pending nao san sang de upload.', 'No pending videos are ready to upload.'));
      } else if (uploaded > 0) {
        toast.success(summary);
      } else if (failed > 0) {
        toast.error(summary);
      } else {
        toast(tr(
          `Khong co video nao duoc upload. Da bo qua ${skipped}.`,
          `No videos were uploaded. Skipped ${skipped}.`
        ));
      }

      await Promise.allSettled([loadVideos(), loadDashboard()]);
    });
  };

  const uploadVideo = async (videoId) => {
    await runAction('upload-video', async () => {
      const result = await videoPipelineApi.uploadVideo(videoId);
      if (!result.success) toast.error(result.error || 'Upload failed.');
      else toast.success(result.message || 'Video sync updated.');
      await Promise.allSettled([loadVideos(), loadDashboard()]);
    });
  };

  const deleteVideo = async (videoId) => {
    const video = videos.find((v) => v.id === videoId);
    const videoTitle = video?.title || video?.videoId || videoId;

    if (!confirm(`Delete "${videoTitle}" and ALL related data? This cannot be undone.`)) {
      return;
    }

    await runAction('delete-video', async () => {
      const result = await videoPipelineApi.deleteVideo(videoId);
      if (!result.success) {
        toast.error(result.error || 'Delete failed.');
      } else {
        toast.success(result.message || 'Video and all related data deleted.');
        await Promise.allSettled([loadVideos(), loadDashboard()]);
      }
    });
  };

  const queueSelectedVideos = async () => {
    const hasManualPair = Boolean(manualSelections.main && manualSelections.sub);

    if (!selectedVideoIds.length && !hasManualPair) {
      toast.error(tr('Chá»n Ã­t nháº¥t 1 video hoáº·c cung cáº¥p Ä‘á»§ main/sub video.', 'Select at least one video or provide both main/sub videos.'));
      return;
    }

    await runAction('queue-videos', async () => {
      const result = await videoPipelineApi.queueVideos({
        videoIds: selectedVideoIds,
        recipe: composer.recipe,
        platform: composer.platform,
        productionConfig: {
          duration: Number(composer.duration) || 30,
          aspectRatio: composer.aspectRatio,
          layout: composer.layout,
          subtitleMode: composer.subtitleMode,
          watermarkEnabled: composer.watermarkEnabled,
          voiceoverEnabled: composer.voiceoverEnabled,
          templateStrategy: composer.templateStrategy,
          youtubePublishType: composer.youtubePublishType,
          manualMainVideo: manualSelections.main,
          manualSubVideo: manualSelections.sub,
        },
      });
      toast.success(
        tr(
          `ÄÃ£ thÃªm ${result.totalQueued || 0} job vÃ o hÃ ng Ä‘á»£i.`,
          `Queued ${result.totalQueued || 0} job(s).`
        )
      );
      goToSection('queue');
      await Promise.allSettled([loadVideos(), loadJobs(), loadQueueRuntime(), loadDashboard(), loadProductionOverview()]);
    });
  };

  const queueVideosToFolder = async (videoIds = selectedVideoIds) => {
    if (!videoIds.length) {
      toast.error(tr('Chon it nhat 1 video de dua vao Queue folder.', 'Select at least one video to add to the Queue folder.'));
      return;
    }

    await runAction('queue-folder', async () => {
      const result = await videoPipelineApi.queueVideosToFolder({ videoIds });
      const queued = Number(result.totalQueued || result.queued?.length || 0);
      const failed = Number(result.totalFailed || result.failed?.length || 0);

      if (queued > 0) {
        toast.success(tr(`Da dua ${queued} video vao Queue folder.`, `Added ${queued} video(s) to the Queue folder.`));
      }
      if (failed > 0) {
        toast.error(tr(`Co ${failed} video bi loi khi queue.`, `${failed} video(s) failed to queue.`));
      }

      await Promise.allSettled([loadSchedulerRuntime(), loadVideos(), loadDashboard()]);
    });
  };

  const runMassProduction = async () => {
    await runAction('mass-production', async () => {
      const result = await videoPipelineApi.runMassProduction({
        sourceKey: productionBatch.sourceKey || undefined,
        limit: Number(productionBatch.limit) || 5,
        syncSourceToDrive: Boolean(productionBatch.syncSourceToDrive),
        startImmediately: Boolean(productionBatch.startImmediately),
        recipe: composer.recipe,
        platform: composer.platform,
        productionConfig: {
          duration: Number(composer.duration) || 30,
          aspectRatio: composer.aspectRatio,
          layout: composer.layout,
          subtitleMode: composer.subtitleMode,
          watermarkEnabled: composer.watermarkEnabled,
          voiceoverEnabled: composer.voiceoverEnabled,
          templateStrategy: composer.templateStrategy,
          youtubePublishType: composer.youtubePublishType,
        },
      });

      const summary = result.summary || {};
      toast.success(
        tr(
          `Da xu ly ${summary.selected || 0} video: hoan thanh ${summary.completed || 0}, queue ${summary.queued || 0}, loi ${summary.failed || 0}.`,
          `Processed ${summary.selected || 0} source video(s): completed ${summary.completed || 0}, queued ${summary.queued || 0}, failed ${summary.failed || 0}.`
        )
      );

      await Promise.allSettled([
        loadProductionOverview(),
        loadVideos(),
        loadJobs(),
        loadQueueRuntime(),
        loadDashboard(),
      ]);
    });
  };

  const togglePublishAccount = (queueId, accountId) => {
    setSelectedPublishAccounts((prev) => {
      const next = new Set(prev[queueId] || []);
      if (next.has(accountId)) next.delete(accountId);
      else next.add(accountId);
      return { ...prev, [queueId]: Array.from(next) };
    });
  };

  const publishJob = async (queueId) => {
    const accountIds = selectedPublishAccounts[queueId] || [];
    if (!accountIds.length) {
      toast.error('Select at least one connection to publish.');
      return;
    }

    await runAction('publish-job', async () => {
      const result = await videoPipelineApi.publishJob(queueId, {
        accountIds,
        uploadConfig: {
          youtubePublishType: composer.youtubePublishType,
          title: 'Published from Video Pipeline',
        },
      });
      toast.success(`Published ${result.successful || 0} target(s).`);
      await Promise.allSettled([loadJobs(), loadQueueRuntime(), loadConnections(), loadDashboard()]);
    });
  };

  const openYoutubePublishDialog = (job) => {
    setYoutubePublishQueueId(job.queueId);
    setYoutubePublishJobData(job);
  };

  const closeYoutubePublishDialog = () => {
    setYoutubePublishQueueId(null);
    setYoutubePublishJobData(null);
  };

  const handleYoutubePublishComplete = async (result) => {
    if (result.success) {
      toast.success(`Published to ${result.successful || 0} YouTube channel(s).`);
      closeYoutubePublishDialog();
      await Promise.allSettled([loadJobs(), loadQueueRuntime()]);
    }
  };

  const toggleLogs = async (queueId) => {
    if (jobLogs[queueId]) {
      setJobLogs((prev) => ({ ...prev, [queueId]: null }));
      return;
    }
    const result = await videoPipelineApi.getJobLogs(queueId);
    setJobLogs((prev) => ({ ...prev, [queueId]: result.logs || [] }));
  };

  const startJob = async (queueId) => {
    await runAction(`start-job-${queueId}`, async () => {
      const result = await videoPipelineApi.startJob(queueId);
      toast.success(result.message || tr('ÄÃ£ trigger job thá»§ cÃ´ng.', 'Job started manually.'));
      await Promise.allSettled([loadJobs(), loadQueueRuntime(), loadDashboard(), loadProductionOverview()]);
    });
  };

  const saveConnection = async (event) => {
    event.preventDefault();
    await runAction('save-connection', async () => {
      const result = await videoPipelineApi.addConnection({
        platform: connectionForm.platform,
        username: connectionForm.username,
        password: connectionForm.accessToken || 'oauth-linked',
        displayName: connectionForm.displayName,
        email: connectionForm.email,
        accessToken: connectionForm.accessToken,
        refreshToken: connectionForm.refreshToken,
        metadata: {
          apiKey: connectionForm.apiKey,
          channelId: connectionForm.channelId,
          pageId: connectionForm.pageId,
          businessId: connectionForm.businessId,
        },
      });
      toast.success(result.message || 'Connection saved.');
      setConnectionForm(DEFAULT_CONNECTION);
      await loadConnections();
    });
  };

  const verifyConnection = async (accountId) => {
    await runAction('verify-connection', async () => {
      const result = await videoPipelineApi.verifyConnection(accountId);
      toast.success(result.result || 'Connection checked.');
      await loadConnections();
    });
  };

  const deleteConnection = async (accountId) => {
    await runAction('delete-connection', async () => {
      await videoPipelineApi.deleteConnection(accountId);
      toast.success('Connection removed.');
      await loadConnections();
    });
  };

  const saveSettings = async () => {
    await runAction('save-settings', async () => {
      const result = await videoPipelineApi.saveSettings(settings);
      setSettings(result.settings || DEFAULT_SETTINGS);
      toast.success('Settings saved.');
      await Promise.allSettled([loadSettings(), loadSchedulerRuntime()]);
    });
  };

  const retryFailedQueueJobs = async () => {
    await runAction('retry-failed-jobs', async () => {
      const result = await videoPipelineApi.retryFailedJobs({ maxRetries: 3 });
      toast.success(
        tr(
          `Da dua ${result.retriedCount || 0} job loi quay lai pending.`,
          `Moved ${result.retriedCount || 0} failed job(s) back to pending.`
        )
      );
      await Promise.allSettled([loadJobs(), loadQueueRuntime(), loadDashboard(), loadProductionOverview()]);
    });
  };

  const releaseStaleQueueJobs = async () => {
    await runAction('release-stale-jobs', async () => {
      const result = await videoPipelineApi.releaseStaleJobs({ timeoutMinutes: queueTimeoutMinutes });
      if (Number(result.released) > 0) {
        toast.success(
          tr(
            `Da release ${result.released} job processing bi stale.`,
            `Released ${result.released} stale processing job(s).`
          )
        );
      } else {
        toast(tr('Khong co processing job nao bi stale.', 'No stale processing jobs were found.'));
      }
      await Promise.allSettled([loadJobs(), loadQueueRuntime(), loadDashboard(), loadProductionOverview()]);
    });
  };

  const clearQueueBucket = async () => {
    await runAction('clear-queue-bucket', async () => {
      const result = await videoPipelineApi.clearQueueJobs({ statusFilter: queueClearFilter });
      toast.success(
        tr(
          `Da xoa ${result.deleted || 0} job thuoc nhom ${queueClearFilter || 'all'}.`,
          `Cleared ${result.deleted || 0} job(s) from ${queueClearFilter || 'all'}.`
        )
      );
      await Promise.allSettled([loadJobs(), loadQueueRuntime(), loadDashboard(), loadProductionOverview()]);
    });
  };

  const triggerQueueScannerNow = async () => {
    await runAction('queue-scanner-now', async () => {
      const result = await videoPipelineApi.triggerQueueScannerNow({
        autoPublish: Boolean(settings.production?.autoPublish),
        platform: settings.production?.defaultPlatform || 'youtube',
        youtubePublishType: settings.production?.youtubePublishType || 'shorts',
      });
      toast.success(result.message || tr('Da trigger queue scanner.', 'Queue scanner triggered.'));
      await Promise.allSettled([loadSchedulerRuntime(), loadQueueRuntime(), loadJobs(), loadDashboard()]);
    });
  };

  const runScraperJob = async (type) => {
    await runAction(`scraper-job-${type}`, async () => {
      const result = await videoPipelineApi.triggerScraperJob(type);
      const count = extractTriggerActivityCount(result);
      const label = type === 'scan' ? tr('channel scan', 'channel scan') : tr('discover', 'discover');
      if (count === 0) {
        toast(tr(`Da gui ${label} nhung khong co item moi.`, `Triggered ${label} but no new items were found.`));
      } else {
        toast.success(result.message || tr(`Da trigger ${label}.`, `Triggered ${label}.`));
      }
      await refreshScraperSurface();
    });
  };

  const runManualDiscover = async (config = manualDiscovery) => {
    setBusyAction('manual-discover');
    try {
      let result = null;
      if (config.source === 'dailyhaha') {
        result = await videoPipelineApi.manualDiscoverDailyhaha();
      } else if (config.source === 'douyin') {
        result = await videoPipelineApi.manualDiscoverDouyin();
      } else {
        result = await videoPipelineApi.manualDiscoverPlayboard({
          dimension: config.dimension,
          category: config.category,
          country: config.country,
          period: config.period,
          isActive: true,
          priority: 10,
        });
      }

      if (!result?.success) {
        toast.error(result?.error || 'Manual discover failed.');
        return;
      }

      toast.success(result.message || tr(`Da tim thay ${result.itemsFound || 0} item.`, `Discovered ${result.itemsFound || 0} item(s).`));
      await refreshScraperSurface();
      void watchScraperSurface([5000, 15000]);
    } catch (error) {
      const status = error?.response?.status;
      if (status === 502 || status === 504) {
        toast(tr('Scraper van dang chay o upstream. UI se tiep tuc tu refresh de cap nhat ket qua.', 'Scraper is still running upstream. The UI will keep refreshing to pick up results.'));
        void watchScraperSurface([0, 5000, 15000, 30000, 45000]);
      } else {
        toast.error(error?.response?.data?.error || error.message || 'Manual discover failed.');
      }
    } finally {
      setBusyAction('');
    }
  };

  const runSavedPlayboardConfig = async (config) => {
    await runManualDiscover({
      source: 'playboard',
      category: config.category || 'All',
      dimension: config.dimension || 'most-viewed',
      country: config.country || 'Worldwide',
      period: config.period || 'weekly',
    });
  };

  const toggleChannelSelection = (channelId) => {
    setSelectedChannelIds((prev) => (prev.includes(channelId) ? prev.filter((item) => item !== channelId) : [...prev, channelId]));
  };

  const toggleAllChannels = () => {
    if (selectedChannelIds.length === channels.length) {
      setSelectedChannelIds([]);
      return;
    }
    setSelectedChannelIds(channels.map((item) => item.id));
  };

  const scanChannel = async (channelId) => {
    await runAction(`manual-scan-${channelId}`, async () => {
      const result = await videoPipelineApi.manualScanChannel(channelId);
      toast.success(result?.message || tr(`Scan xong, tim thay ${result?.itemsFound || 0} item.`, `Scan finished, found ${result?.itemsFound || 0} item(s).`));
      await Promise.allSettled([loadChannels(), loadVideos(1), loadScraperLogs(), loadScraperOverview(), loadDashboard()]);
    });
  };

  const scanSelectedChannels = async () => {
    if (!selectedChannelIds.length) {
      toast(tr('Chon it nhat 1 channel.', 'Select at least one channel.'));
      return;
    }

    await runAction('scan-selected-channels', async () => {
      const results = await Promise.allSettled(selectedChannelIds.map((channelId) => videoPipelineApi.manualScanChannel(channelId)));
      const successful = results.filter((item) => item.status === 'fulfilled').length;
      const failed = results.length - successful;
      if (failed > 0) toast.error(tr(`Da scan ${successful}, loi ${failed}.`, `Scanned ${successful}, failed ${failed}.`));
      else toast.success(tr(`Da scan ${successful} channel.`, `Scanned ${successful} channel(s).`));
      await Promise.allSettled([loadChannels(), loadVideos(1), loadScraperLogs(), loadScraperOverview(), loadDashboard()]);
    });
  };

  const resolveCaptchaJob = async (jobId) => {
    await runAction(`resolve-captcha-${jobId}`, async () => {
      await videoPipelineApi.resolveCaptchaJob(jobId);
      toast.success(tr('Captcha da duoc danh dau resolve.', 'Captcha job marked as resolved.'));
      await Promise.allSettled([loadCaptchaJobs(), loadScraperLogs()]);
    });
  };

  const redownloadVideo = async (videoId) => {
    await runAction(`redownload-${videoId}`, async () => {
      const result = await videoPipelineApi.redownloadVideo(videoId);
      if (!result?.success) {
        toast.error(result?.error || 'Could not re-queue video download.');
        return;
      }
      toast.success(tr('Da dua video vao hang doi download.', 'Video queued for download.'));
      await Promise.allSettled([loadVideos(videoPagination.page), loadScraperOverview(), loadScraperLogs()]);
    });
  };

  const redownloadFailedVideos = async () => {
    const failedItems = videos.filter((item) => item.downloadStatus === 'failed');
    if (!failedItems.length) {
      toast(tr('Khong co video loi de tai lai.', 'No failed videos to re-download.'));
      return;
    }

    await runAction('redownload-failed-page', async () => {
      const results = await Promise.allSettled(failedItems.map((item) => videoPipelineApi.redownloadVideo(item.id)));
      const successful = results.filter((item) => item.status === 'fulfilled' && item.value?.success !== false).length;
      const failed = results.length - successful;
      if (failed > 0) {
        toast.error(tr(`Da tao lai ${successful}, loi ${failed}.`, `Re-queued ${successful}, failed ${failed}.`));
      } else {
        toast.success(tr(`Da tao lai ${successful} video.`, `Re-queued ${successful} video(s).`));
      }
      await Promise.allSettled([loadVideos(videoPagination.page), loadScraperOverview(), loadScraperLogs()]);
    });
  };

  const pageActions = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <button onClick={refreshAll} className={getActionButtonClass('sky')} disabled={Boolean(busyAction)}>
        <RefreshCcw className="h-4 w-4" />
        {tr('LÃ m má»›i', 'Refresh')}
      </button>
      {activeSection === 'overview' ? (
        <button onClick={() => goToSection('scraping')} className={getActionButtonClass('violet')} disabled={Boolean(busyAction)}>
          <Sparkles className="h-4 w-4" />
          Open Scraping
        </button>
      ) : null}
      {activeSection === 'scraping' ? <button onClick={() => runScraperJob('discover')} className={getActionButtonClass('violet')} disabled={Boolean(busyAction)}>
        <Sparkles className="h-4 w-4" />
        {tr('Run discover', 'Run Discover')}
      </button> : null}
      {activeSection === 'scraping' ? <button onClick={handleTriggerPendingDownloads} className={getActionButtonClass('amber')} disabled={Boolean(busyAction)}>
        <Download className="h-4 w-4" />
        {tr('Cháº¡y scraping', 'Trigger Downloads')}
      </button> : null}
      {activeSection === 'scraping' ? <button onClick={handleUploadPendingVideos} className={getActionButtonClass('emerald')} disabled={Boolean(busyAction)}>
        <Upload className="h-4 w-4" />
        {tr('Upload pending', 'Upload Pending')}
      </button> : null}
      {(activeSection === 'videos' || activeSection === 'production') ? (
        <button onClick={() => goToSection('production')} className={getActionButtonClass('violet')} disabled={!selectedVideoIds.length}>
          <Clapperboard className="h-4 w-4" />
          {tr(`Má»Ÿ sáº£n xuáº¥t (${selectedVideoIds.length})`, `Open Production (${selectedVideoIds.length})`)}
        </button>
      ) : null}
      {activeSection === 'settings' ? (
        <button onClick={saveSettings} className={getActionButtonClass('violet')} disabled={Boolean(busyAction)}>
          <CheckCircle2 className="h-4 w-4" />
          {tr('LÆ°u cÃ i Ä‘áº·t', 'Save Settings')}
        </button>
      ) : null}
      {activeSection === 'queue' ? (
        <button onClick={triggerQueueScannerNow} className={getActionButtonClass('violet')} disabled={Boolean(busyAction)}>
          <RefreshCcw className="h-4 w-4" />
          {tr('Scan now', 'Scan now')}
        </button>
      ) : null}
    </div>
  );

  return (
    <VideoPipelineLayout
      title={tr('Video Pipeline', 'Video Pipeline')}
      subtitle={tr('Nguá»“n -> Drive -> Sáº£n xuáº¥t -> ÄÄƒng táº£i', 'Source -> Drive -> Production -> Publish')}
      meta={currentSectionMeta.subtitle}
      navItems={navItems}
      actions={pageActions}
    >
      {progressHelper ? (
        <div className="fixed right-5 top-[84px] app-layer-overlay w-[280px] max-w-[88vw]">
          <div className="rounded-2xl border border-white/10 bg-slate-900/90 p-3 shadow-[0_18px_40px_rgba(15,23,42,0.35)] backdrop-blur">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{tr('Processing', 'Processing')}</p>
                <p className="mt-1 text-sm font-semibold text-white">{progressHelper.label}</p>
              </div>
              <span className={`text-xs font-semibold ${progressHelper.status === 'failed' ? 'text-rose-300' : progressHelper.status === 'done' ? 'text-emerald-300' : 'text-sky-200'}`}>
                {progressHelper.status === 'failed' ? tr('Failed', 'Failed') : progressHelper.status === 'done' ? tr('Done', 'Done') : `${progressHelper.percent || 0}%`}
              </span>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full transition-all duration-300 ${progressHelper.status === 'failed' ? 'bg-rose-400/70' : progressHelper.status === 'done' ? 'bg-emerald-400/80' : 'bg-sky-400/70'}`}
                style={{ width: `${progressHelper.percent || 0}%` }}
              />
            </div>
            {progressHelper.message ? <p className="mt-2 text-xs text-slate-400">{progressHelper.message}</p> : null}
          </div>
        </div>
      ) : null}
      {previewItem ? (
        <div className="fixed inset-0 app-layer-modal flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className={`${SURFACE_CARD_CLASS} w-full max-w-3xl max-h-[80vh] overflow-hidden p-5`}>
            <SectionHeader
              title={tr('Preview output', 'Preview output')}
              subtitle={previewItem.queueId}
              actions={(
                <button onClick={() => setPreviewItem(null)} className={getActionButtonClass('slate', 'px-3 py-2 text-xs')}>
                  {tr('ÄÃ³ng', 'Close')}
                </button>
              )}
            />
            <div className="mt-3 max-h-[60vh] overflow-hidden">
              <video
                src={resolveOutputPreview(previewItem)}
                className="w-full max-h-[60vh] rounded-2xl border border-white/10 bg-black object-contain"
                controls
                preload="metadata"
              />
            </div>
            {previewItem.completedDriveSync?.webViewLink ? (
              <a className="mt-3 inline-flex text-xs text-sky-200 underline-offset-2 hover:underline" href={previewItem.completedDriveSync.webViewLink} target="_blank" rel="noreferrer">
                {tr('Má»Ÿ file Drive', 'Open Drive output')}
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
      <section className={`${SURFACE_CARD_CLASS} video-pipeline-section-hero ${activeSection === 'videos' ? 'p-4 lg:p-5' : 'p-5 lg:p-6'}`}>
        <div className={`grid gap-5 ${showHeroStats ? (activeSection === 'videos' ? 'xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] xl:items-start' : 'xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start') : ''}`}>
          <div className="min-w-0">
            {activeSection === 'videos' ? null : (
              <p className="video-pipeline-kicker">{tr('Operator surface', 'Operator surface')}</p>
            )}
            <div className="mt-4 flex items-start gap-4">
              <div className={`flex shrink-0 items-center justify-center rounded-[20px] border border-white/10 bg-white/[0.04] text-white/80 shadow-[0_18px_36px_rgba(15,23,42,0.18)] ${activeSection === 'videos' ? 'h-11 w-11' : 'h-14 w-14'}`}>
                <ActiveSectionIcon className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                {activeSection === 'videos' ? (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">{tr('Videos', 'Videos')}</p>
                    <h3 className="mt-1 text-[1rem] font-semibold text-white">{currentSectionMeta.title}</h3>
                    {currentSectionMeta.subtitle ? (
                      <p className="mt-1 text-[12px] leading-5 text-slate-400">{currentSectionMeta.subtitle}</p>
                    ) : null}
                  </div>
                ) : (
                  <SectionHeader title={currentSectionMeta.title} subtitle={currentSectionMeta.subtitle} />
                )}
                <div className={`${activeSection === 'videos' ? 'mt-3' : 'mt-4'} flex flex-wrap gap-2`}>
                  <StatusPill tone="sky">{activeNavItem?.label || 'Overview'}</StatusPill>
                  <StatusPill tone={busyAction ? 'amber' : 'emerald'}>{busyAction || 'Idle'}</StatusPill>
                  {selectedVideoIds.length ? <StatusPill tone="violet">{tr(`Selected ${selectedVideoIds.length}`, `Selected ${selectedVideoIds.length}`)}</StatusPill> : null}
                </div>
              </div>
            </div>
          </div>

          {showHeroStats ? (
            <div className={`grid gap-3 ${activeSection === 'videos' ? 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-4' : 'grid-cols-2'}`}>
              {heroStats.map((item) => (
                <div key={item.label} className={`${SUBTLE_PANEL_CLASS} ${activeSection === 'videos' ? 'rounded-[18px] p-3' : 'rounded-[22px]'}`}>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{item.label}</p>
                  <p className={`${activeSection === 'videos' ? 'mt-2 text-[1.2rem]' : 'mt-3 text-[1.8rem]'} font-semibold leading-none text-white`}>
                    {formatNumber(item.value)}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {activeSection === 'overview' ? (
        <section className="space-y-4">
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="Sources" value={dashboard?.metrics?.configuredSources || 0} helper="Configured scraper providers" icon={Link2} tone="violet" />
            <MetricCard title="Channels" value={dashboard?.metrics?.totalChannels || 0} helper="Loaded from Mongo" icon={Users} tone="sky" />
            <MetricCard title="Videos" value={dashboard?.metrics?.totalVideos || 0} helper="Discovered inventory" icon={Video} tone="amber" />
            <MetricCard title="Drive Ready" value={dashboard?.metrics?.driveReadyVideos || 0} helper="Uploaded or synced successfully" icon={HardDrive} tone="emerald" />
          </section>
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="Pending Download" value={scraperOverview?.pending || 0} helper="Waiting in scraper download backlog" icon={Download} tone="amber" />
            <MetricCard title="Queue Jobs" value={dashboard?.metrics?.queueJobs || 0} helper="Production jobs in Mongo" icon={Layers3} tone="violet" />
            <MetricCard title="Ready To Publish" value={dashboard?.metrics?.readyToPublish || 0} helper="Jobs waiting for post actions" icon={Send} tone="amber" />
            <MetricCard title="Connections" value={dashboard?.metrics?.connections || 0} helper="Saved social accounts" icon={Users} tone="sky" />
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
            <section className={`${SURFACE_CARD_CLASS} p-5`}>
              <SectionHeader
                title="Automation snapshot"
                subtitle="High-level scraper and pipeline health without exposing the operator controls directly on the overview board."
                actions={<button onClick={() => goToSection('scraping')} className={getActionButtonClass('violet', 'px-3 py-2 text-xs')}>Open scraping</button>}
              />
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusPill tone={settings.discovery?.isEnabled ? 'emerald' : 'amber'}>{settings.discovery?.isEnabled ? 'automation enabled' : 'automation paused'}</StatusPill>
                <StatusPill tone="sky">{`discover ${settings.discovery?.discoverSchedule?.label || 'manual'}`}</StatusPill>
                <StatusPill tone="violet">{`scan ${settings.discovery?.scanSchedule?.label || 'manual'}`}</StatusPill>
                <StatusPill tone="emerald">{`${enabledDiscoverSourceCount} discover sources on`}</StatusPill>
                <StatusPill tone="sky">{`${manualScraperSourceCount} manual sources`}</StatusPill>
                <StatusPill tone="amber">{`queued ${scraperOverview?.queue?.queued || 0}`}</StatusPill>
                <StatusPill tone={scraperOverview?.queue?.running ? 'violet' : 'slate'}>{`running ${scraperOverview?.queue?.running || 0}`}</StatusPill>
                <StatusPill tone="sky">{`workers ${scraperOverview?.queue?.workers || 0}`}</StatusPill>
                <StatusPill tone="violet">{`buffer ${scraperOverview?.queue?.uniqueQueuedVideos || scraperOverview?.queue?.queued || 0}`}</StatusPill>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className={SUBTLE_PANEL_CLASS}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Latest discover</p>
                  <p className="mt-3 text-lg font-semibold text-white">{formatNumber(latestDiscoverLog?.itemsFound || 0)} item(s)</p>
                  <p className="mt-2 text-xs text-slate-400">{latestDiscoverLog ? formatDate(latestDiscoverLog.ranAt) : 'No run yet'}</p>
                  {latestDiscoverLog?.topic ? <p className="mt-2 text-xs text-slate-500">{latestDiscoverLog.topic}</p> : null}
                </div>
                <div className={SUBTLE_PANEL_CLASS}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Latest scan</p>
                  <p className="mt-3 text-lg font-semibold text-white">{formatNumber(latestScanLog?.itemsFound || 0)} item(s)</p>
                  <p className="mt-2 text-xs text-slate-400">{latestScanLog ? formatDate(latestScanLog.ranAt) : 'No run yet'}</p>
                  {latestScanLog?.platform ? <p className="mt-2 text-xs text-slate-500">{latestScanLog.platform}</p> : null}
                </div>
                <div className={SUBTLE_PANEL_CLASS}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Latest download</p>
                  <p className="mt-3 text-lg font-semibold text-white">{formatNumber(latestDownloadLog?.itemsDownloaded || latestDownloadLog?.itemsFound || 0)} item(s)</p>
                  <p className="mt-2 text-xs text-slate-400">{latestDownloadLog ? formatDate(latestDownloadLog.ranAt) : 'No run yet'}</p>
                  {latestDownloadLog?.error ? <p className="mt-2 line-clamp-2 text-xs text-rose-200/80">{latestDownloadLog.error}</p> : null}
                </div>
              </div>
            </section>

            <section className={`${SURFACE_CARD_CLASS} p-5`}>
              <SectionHeader title="Needs attention" subtitle="Operator items that usually require action next." />
              <div className="mt-4 space-y-3">
                <div className={SUBTLE_PANEL_CLASS}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">Captcha jobs</p>
                      <p className="mt-1 text-xs text-slate-400">Blocked scraper sessions waiting for manual resolve.</p>
                    </div>
                    <StatusPill tone={captchaJobs.length ? 'amber' : 'emerald'}>{captchaJobs.length}</StatusPill>
                  </div>
                </div>
                <div className={SUBTLE_PANEL_CLASS}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">Failed downloads</p>
                      <p className="mt-1 text-xs text-slate-400">Current download failures still present in scraper storage.</p>
                    </div>
                    <StatusPill tone={scraperOverview?.failed ? 'violet' : 'emerald'}>{scraperOverview?.failed || 0}</StatusPill>
                  </div>
                </div>
                <div className={SUBTLE_PANEL_CLASS}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">Manual review queue</p>
                      <p className="mt-1 text-xs text-slate-400">Production jobs that still need operator-triggered retry.</p>
                    </div>
                    <StatusPill tone={jobStats?.byExecutionState?.['manual-review'] ? 'amber' : 'emerald'}>{jobStats?.byExecutionState?.['manual-review'] || 0}</StatusPill>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => goToSection('scraping')} className={getActionButtonClass('violet', 'px-3 py-2 text-xs')}>Inspect scraper</button>
                <button onClick={() => goToSection('videos')} className={getActionButtonClass('sky', 'px-3 py-2 text-xs')}>Review videos</button>
                <button onClick={() => goToSection('queue')} className={getActionButtonClass('amber', 'px-3 py-2 text-xs')}>Open queue</button>
              </div>
            </section>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <section className={`${SURFACE_CARD_CLASS} p-5`}>
              <SectionHeader title="Recent scraper activity" subtitle="Latest discover, scan, and download events flowing in from the scraper service." />
              <div className="mt-4 space-y-3">
                {scraperLogs.slice(0, 4).map((log) => (
                  <div key={log._id} className={SUBTLE_PANEL_CLASS}>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill tone={toneFromStatus(log.status || 'unknown')}>{log.jobType || 'job'}</StatusPill>
                      <StatusPill tone={toneFromStatus(log.status || 'unknown')}>{log.status || 'unknown'}</StatusPill>
                      {log.platform ? <StatusPill tone="sky">{log.platform}</StatusPill> : null}
                    </div>
                    <p className="mt-2 text-xs text-slate-400">{formatDate(log.ranAt)}</p>
                    <p className="mt-2 text-sm text-white">Found {formatNumber(log.itemsFound || 0)} Â· Downloaded {formatNumber(log.itemsDownloaded || 0)}</p>
                    {log.topic ? <p className="mt-2 text-xs text-slate-500">{log.topic}</p> : null}
                  </div>
                ))}
                {!scraperLogs.length ? <EmptyState label="No scraper activity found yet." /> : null}
              </div>
            </section>

            <section className={`${SURFACE_CARD_CLASS} p-5`}>
              <SectionHeader title="Quick lanes" subtitle="Jump straight into the next operator flow instead of hunting through tabs." />
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <button onClick={() => goToSection('scraping')} className={`${SUBTLE_PANEL_CLASS} text-left transition hover:border-sky-300/30`}>
                  <p className="text-sm font-semibold text-white">Scraping</p>
                  <p className="mt-1 text-xs text-slate-400">Manual discover, scan channels, logs, and captcha queue.</p>
                </button>
                <button onClick={() => goToSection('videos')} className={`${SUBTLE_PANEL_CLASS} text-left transition hover:border-sky-300/30`}>
                  <p className="text-sm font-semibold text-white">Video inventory</p>
                  <p className="mt-1 text-xs text-slate-400">Review scraped videos and move qualified items forward.</p>
                </button>
                <button onClick={() => goToSection('production')} className={`${SUBTLE_PANEL_CLASS} text-left transition hover:border-sky-300/30`}>
                  <p className="text-sm font-semibold text-white">Production</p>
                  <p className="mt-1 text-xs text-slate-400">Build mashups and queue outputs for publishing.</p>
                </button>
                <button onClick={() => goToSection('publish')} className={`${SUBTLE_PANEL_CLASS} text-left transition hover:border-sky-300/30`}>
                  <p className="text-sm font-semibold text-white">Publish</p>
                  <p className="mt-1 text-xs text-slate-400">Check connected accounts and push ready jobs live.</p>
                </button>
              </div>
            </section>
          </section>
        </section>
      ) : null}

      {activeSection === 'scraping' ? (
        <section className="space-y-4">
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="Manual Sources" value={manualScraperSourceCount || 0} helper="Providers with dedicated manual discover support" icon={Sparkles} tone="violet" />
            <MetricCard title="Pending Download" value={scraperOverview?.pending || 0} helper="Videos waiting to be picked by the scraper downloader" icon={Download} tone="amber" />
            <MetricCard title="Downloaded" value={scraperOverview?.done || 0} helper="Videos already downloaded successfully" icon={HardDrive} tone="emerald" />
            <MetricCard title="Failed" value={scraperOverview?.failed || 0} helper="Scraper download failures needing attention" icon={Video} tone="violet" />
          </section>
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="Queued" value={scraperOverview?.queue?.queued || 0} helper="Raw in-memory queue length inside the scraper worker" icon={Layers3} tone="sky" />
            <MetricCard title="Buffered Videos" value={scraperOverview?.queue?.uniqueQueuedVideos || scraperOverview?.queue?.queued || 0} helper="Unique videos already buffered for download pickup" icon={Download} tone="violet" />
            <MetricCard title="Running / Workers" value={`${scraperOverview?.queue?.running || 0}/${scraperOverview?.queue?.workers || 0}`} helper="Active downloader slots versus configured worker pool" icon={RefreshCcw} tone="amber" />
            <MetricCard title="Captcha Alerts" value={captchaJobs.length || 0} helper="Manual intervention items reported by scraper flows" icon={Users} tone="violet" />
          </section>
          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
            <section className={`${SURFACE_CARD_CLASS} p-5`}>
              <SectionHeader
                title="Scraper operator controls"
                subtitle="Restored manual discovery controls for Playboard, DailyHaha, Douyin, and saved channel scans."
                actions={<button onClick={() => runScraperJob('discover')} className={getActionButtonClass('violet', 'px-3 py-2 text-xs')} disabled={Boolean(busyAction)}>Run Discover</button>}
              />
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusPill tone={settings.discovery?.isEnabled ? 'emerald' : 'amber'}>{settings.discovery?.isEnabled ? 'automation enabled' : 'automation paused'}</StatusPill>
                <StatusPill tone="sky">{`discover ${settings.discovery?.discoverSchedule?.label || 'manual'}`}</StatusPill>
                <StatusPill tone="violet">{`scan ${settings.discovery?.scanSchedule?.label || 'manual'}`}</StatusPill>
                <StatusPill tone="amber">{`pending ${scraperOverview?.pending || 0}`}</StatusPill>
                <StatusPill tone="emerald">{`done ${scraperOverview?.done || 0}`}</StatusPill>
                <StatusPill tone="sky">{`queued ${scraperOverview?.queue?.queued || 0}`}</StatusPill>
                <StatusPill tone={scraperOverview?.queue?.running ? 'violet' : 'slate'}>{`running ${scraperOverview?.queue?.running || 0}`}</StatusPill>
                <StatusPill tone="sky">{`workers ${scraperOverview?.queue?.workers || 0}`}</StatusPill>
                <StatusPill tone="violet">{`buffer ${scraperOverview?.queue?.uniqueQueuedVideos || scraperOverview?.queue?.queued || 0}`}</StatusPill>
                {Object.entries(scraperSettings?.discoverSources || {}).map(([key, enabled]) => (
                  <StatusPill key={key} tone={enabled ? 'emerald' : 'slate'}>
                    {`${key}: ${enabled ? 'on' : 'off'}`}
                  </StatusPill>
                ))}
              </div>
              {latestDiscoverLog ? (
                <div className={`${INSET_PANEL_CLASS} mt-4`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill tone={toneFromStatus(latestDiscoverLog.status || 'unknown')}>{latestDiscoverLog.status || 'unknown'}</StatusPill>
                    {latestDiscoverLog.platform ? <StatusPill tone="sky">{latestDiscoverLog.platform}</StatusPill> : null}
                    {latestDiscoverLog.topic ? <StatusPill tone="violet">{latestDiscoverLog.topic}</StatusPill> : null}
                  </div>
                  <p className="mt-3 text-sm text-white">
                    {`Latest discover: ${formatNumber(latestDiscoverLog.itemsFound || 0)} item(s) at ${formatDate(latestDiscoverLog.ranAt)}`}
                  </p>
                  {latestDiscoverLog.error ? <p className="mt-2 text-xs text-rose-200/80">{latestDiscoverLog.error}</p> : null}
                </div>
              ) : null}

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                <select value={manualDiscovery.source} onChange={(e) => setManualDiscovery((prev) => ({ ...prev, source: e.target.value }))} className={INPUT_CLASS}>
                  <option value="playboard">Playboard</option>
                  <option value="dailyhaha">DailyHaha</option>
                  <option value="douyin">Douyin</option>
                </select>
                {manualDiscovery.source === 'playboard' ? (
                  <>
                    <select value={manualDiscovery.dimension} onChange={(e) => setManualDiscovery((prev) => ({ ...prev, dimension: e.target.value }))} className={INPUT_CLASS}>
                      {(playboardMetadata.dimensions || []).map((item) => {
                        const value = typeof item === 'string' ? item : item.value;
                        const label = typeof item === 'string' ? item : item.label;
                        return <option key={value} value={value}>{label}</option>;
                      })}
                    </select>
                    <select value={manualDiscovery.category} onChange={(e) => setManualDiscovery((prev) => ({ ...prev, category: e.target.value }))} className={INPUT_CLASS}>
                      {(playboardMetadata.categories || []).map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                    <select value={manualDiscovery.country} onChange={(e) => setManualDiscovery((prev) => ({ ...prev, country: e.target.value }))} className={INPUT_CLASS}>
                      {(playboardMetadata.countries || []).map((item) => {
                        const label = typeof item === 'string' ? item : item.name;
                        return <option key={label} value={label}>{label}</option>;
                      })}
                    </select>
                    <select value={manualDiscovery.period} onChange={(e) => setManualDiscovery((prev) => ({ ...prev, period: e.target.value }))} className={INPUT_CLASS}>
                      {(playboardMetadata.periods || []).map((item) => {
                        const value = typeof item === 'string' ? item : item.value;
                        const label = typeof item === 'string' ? item : item.label;
                        return <option key={value} value={value}>{label}</option>;
                      })}
                    </select>
                  </>
                ) : (
                  <div className={`${CHECKBOX_PANEL_CLASS} md:col-span-4 xl:col-span-4 text-xs text-slate-400`}>
                    Legacy manual discover for this source runs with its saved topic set. Playboard uses the full filter picker.
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => runScraperJob('scan')} className={getActionButtonClass('sky')} disabled={Boolean(busyAction)}>
                  <Users className="h-4 w-4" />
                  Scan Saved Channels
                </button>
                <button onClick={() => runManualDiscover()} className={getActionButtonClass('amber')} disabled={Boolean(busyAction)}>
                  <Sparkles className="h-4 w-4" />
                  Manual Discover
                </button>
                <button onClick={handleTriggerPendingDownloads} className={getActionButtonClass('slate')} disabled={Boolean(busyAction)}>
                  <Download className="h-4 w-4" />
                  Trigger Pending Downloads
                </button>
              </div>
            </section>

            <section className={`${SURFACE_CARD_CLASS} p-5`}>
              <SectionHeader title="Saved Playboard configs" subtitle="These saved configs still drive cron-based discovery and can be triggered manually." />
              <div className="mt-4 space-y-3">
                {(playboardConfigs || []).map((item, index) => (
                  <div key={`${item._id || item.category || 'config'}-${index}`} className={SUBTLE_PANEL_CLASS}>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusPill tone={item.isActive !== false ? 'emerald' : 'slate'}>{item.isActive !== false ? 'active' : 'disabled'}</StatusPill>
                          <StatusPill tone="sky">{item.dimension || 'most-viewed'}</StatusPill>
                          <StatusPill tone="violet">{item.period || 'weekly'}</StatusPill>
                        </div>
                        <p className="mt-2 text-sm font-semibold text-white">{item.category || 'All'} / {item.country || 'Worldwide'}</p>
                        <p className="mt-1 text-xs text-slate-500">Priority {item.priority || 0}</p>
                      </div>
                      <button onClick={() => runSavedPlayboardConfig(item)} className={getActionButtonClass('violet', 'px-3 py-2 text-xs')} disabled={Boolean(busyAction)}>
                        Run now
                      </button>
                    </div>
                  </div>
                ))}
                {!playboardConfigs.length ? <EmptyState label="No saved Playboard configs found." /> : null}
              </div>
            </section>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <section className={`${SURFACE_CARD_CLASS} p-5`}>
              <SectionHeader title="Latest scraper logs" subtitle="Directly mirrors discover / scan / download history from trendjoblogs." actions={<button onClick={loadScraperLogs} className={getActionButtonClass('sky', 'px-3 py-2 text-xs')} disabled={Boolean(busyAction)}>Refresh logs</button>} />
              <div className="mt-4 space-y-3">
                {scraperLogs.slice(0, 8).map((log) => (
                  <div key={log._id} className={SUBTLE_PANEL_CLASS}>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill tone={toneFromStatus(log.status || 'unknown')}>{log.jobType || 'job'}</StatusPill>
                      <StatusPill tone={toneFromStatus(log.status || 'unknown')}>{log.status || 'unknown'}</StatusPill>
                      {log.platform ? <StatusPill tone="sky">{log.platform}</StatusPill> : null}
                    </div>
                    <p className="mt-2 text-xs text-slate-400">{formatDate(log.ranAt)}</p>
                    <p className="mt-2 text-sm text-white">Found {formatNumber(log.itemsFound || 0)} Â· Downloaded {formatNumber(log.itemsDownloaded || 0)}</p>
                    {log.error ? <p className="mt-2 break-words text-xs text-rose-200/80">{log.error}</p> : null}
                  </div>
                ))}
                {!scraperLogs.length ? <EmptyState label="No scraper logs found." /> : null}
              </div>
            </section>

            <section className={`${SURFACE_CARD_CLASS} p-5`}>
              <SectionHeader title="Captcha and scraper alerts" subtitle="Restored queue of manual CAPTCHA jobs from the legacy scraper workspace." actions={<button onClick={loadCaptchaJobs} className={getActionButtonClass('sky', 'px-3 py-2 text-xs')} disabled={Boolean(busyAction)}>Refresh alerts</button>} />
              <div className="mt-4 space-y-3">
                {captchaJobs.slice(0, 6).map((job) => (
                  <div key={job._id} className={SUBTLE_PANEL_CLASS}>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">{job.extra?.targetUrl || 'Captcha job'}</p>
                        <p className="mt-1 text-xs text-slate-500">{formatDate(job.ranAt)}</p>
                        <p className="mt-2 break-words text-xs text-rose-200/80">{job.error || 'captcha detected'}</p>
                      </div>
                      <button onClick={() => resolveCaptchaJob(job._id)} className={getActionButtonClass('amber', 'px-3 py-2 text-xs')} disabled={Boolean(busyAction)}>
                        Mark resolved
                      </button>
                    </div>
                  </div>
                ))}
                {!captchaJobs.length ? (
                  <div className={`${INSET_PANEL_CLASS} text-sm text-slate-400`}>
                    No active captcha jobs. Latest scraper queue snapshot: queued {scraperOverview?.queue?.queued || 0}, running {scraperOverview?.queue?.running || 0}.
                  </div>
                ) : null}
              </div>
            </section>
          </section>
        </section>
      ) : null}

      {activeSection === 'sources' ? (
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <section className={`${SURFACE_CARD_CLASS} p-5`}>
            <SectionHeader title={sourceForm.id ? 'Edit source' : 'Add source'} subtitle="Configure provider identity, default URL, and acceptance thresholds here. Manual discover stays in Scraping." />
            <form onSubmit={saveSource} className="mt-4 space-y-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <input value={sourceForm.name} onChange={(e) => setSourceForm((prev) => ({ ...prev, name: e.target.value }))} className={INPUT_CLASS} placeholder="Source name" required />
                <input value={sourceForm.provider} onChange={(e) => setSourceForm((prev) => ({ ...prev, provider: e.target.value }))} className={INPUT_CLASS} placeholder="Provider key" required />
                <input value={sourceForm.key} onChange={(e) => setSourceForm((prev) => ({ ...prev, key: e.target.value }))} className={INPUT_CLASS} placeholder="Unique source key" disabled={Boolean(sourceForm.id && sourceForm.isDefault)} />
                <input value={sourceForm.defaultUrl} onChange={(e) => setSourceForm((prev) => ({ ...prev, defaultUrl: e.target.value }))} className={INPUT_CLASS} placeholder="Default source link" />
                <input type="number" value={sourceForm.sortOrder || 50} onChange={(e) => setSourceForm((prev) => ({ ...prev, sortOrder: Number(e.target.value) || 50 }))} className={INPUT_CLASS} placeholder="Sort order" />
              </div>
              <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                <div className={SUBTLE_PANEL_CLASS}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Video criteria</p>
                  <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                    <input type="number" value={sourceForm.videoCriteria?.minViews || 0} onChange={(e) => setSourceForm((prev) => ({ ...prev, videoCriteria: { ...prev.videoCriteria, minViews: Number(e.target.value) || 0 } }))} className={INPUT_CLASS} placeholder="Min views" />
                    <input type="number" value={sourceForm.videoCriteria?.minSubscribers || 0} onChange={(e) => setSourceForm((prev) => ({ ...prev, videoCriteria: { ...prev.videoCriteria, minSubscribers: Number(e.target.value) || 0 } }))} className={INPUT_CLASS} placeholder="Min subscribers" />
                    <input type="number" value={sourceForm.videoCriteria?.minTotalVideos || 0} onChange={(e) => setSourceForm((prev) => ({ ...prev, videoCriteria: { ...prev.videoCriteria, minTotalVideos: Number(e.target.value) || 0 } }))} className={INPUT_CLASS} placeholder="Min total videos" />
                  </div>
                </div>
                <div className={SUBTLE_PANEL_CLASS}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Channel criteria</p>
                  <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                    <input type="number" value={sourceForm.channelCriteria?.minViews || 0} onChange={(e) => setSourceForm((prev) => ({ ...prev, channelCriteria: { ...prev.channelCriteria, minViews: Number(e.target.value) || 0 } }))} className={INPUT_CLASS} placeholder="Min views" />
                    <input type="number" value={sourceForm.channelCriteria?.minSubscribers || 0} onChange={(e) => setSourceForm((prev) => ({ ...prev, channelCriteria: { ...prev.channelCriteria, minSubscribers: Number(e.target.value) || 0 } }))} className={INPUT_CLASS} placeholder="Min subscribers" />
                    <input type="number" value={sourceForm.channelCriteria?.minTotalVideos || 0} onChange={(e) => setSourceForm((prev) => ({ ...prev, channelCriteria: { ...prev.channelCriteria, minTotalVideos: Number(e.target.value) || 0 } }))} className={INPUT_CLASS} placeholder="Min total videos" />
                  </div>
                </div>
              </div>
              <textarea value={sourceForm.description} onChange={(e) => setSourceForm((prev) => ({ ...prev, description: e.target.value }))} className={TEXTAREA_CLASS} placeholder="Describe how this source should be used." />
              <label className={`${CHECKBOX_PANEL_CLASS} flex items-center gap-3`}>
                <input type="checkbox" checked={Boolean(sourceForm.enabled)} onChange={(e) => setSourceForm((prev) => ({ ...prev, enabled: e.target.checked }))} className="h-4 w-4 rounded border-slate-400/70 bg-white/80" />
                Source enabled
              </label>
              <div className="flex flex-wrap gap-2">
                <button type="submit" className={getActionButtonClass('violet')} disabled={Boolean(busyAction)}>
                  <Plus className="h-4 w-4" />
                  {sourceForm.id ? 'Update Source' : 'Add Source'}
                </button>
                {sourceForm.id ? <button type="button" onClick={resetSourceForm} className={getActionButtonClass('sky')}>Cancel edit</button> : null}
              </div>
            </form>
          </section>

          <section className={`${SURFACE_CARD_CLASS} p-5`}>
            <SectionHeader title="Configured sources" subtitle="This tab owns provider registry only: default URLs, enable flags, and thresholds. Manual trigger and cron-facing controls are kept elsewhere to avoid duplication." />
            <div className="mt-4 space-y-3">
              {sources.map((item) => (
                <div key={item.id} className={SUBTLE_PANEL_CLASS}>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-white">{item.name}</p>
                        <SourcePill source={item.key} />
                        <StatusPill tone={item.enabled ? 'emerald' : 'amber'}>{item.enabled ? 'enabled' : 'disabled'}</StatusPill>
                        {sourceRuntimeSummary.get(item.id)?.discoverToggle !== null ? (
                          <StatusPill tone={sourceRuntimeSummary.get(item.id)?.discoverToggle ? 'sky' : 'slate'}>
                            {sourceRuntimeSummary.get(item.id)?.discoverToggle ? 'discover on' : 'discover off'}
                          </StatusPill>
                        ) : null}
                        {sourceRuntimeSummary.get(item.id)?.supportsManualDiscover ? <StatusPill tone="violet">manual trigger</StatusPill> : null}
                        {sourceRuntimeSummary.get(item.id)?.activePlayboardConfigs ? <StatusPill tone="amber">{`${sourceRuntimeSummary.get(item.id)?.activePlayboardConfigs} saved configs`}</StatusPill> : null}
                      </div>
                      <p className="mt-2 break-all text-xs text-slate-400">{item.defaultUrl || 'No default URL configured'}</p>
                      <p className="mt-2 text-xs text-slate-500">{item.description || 'No description'}</p>
                      <p className="mt-2 text-xs text-slate-500">{`Provider: ${item.provider || item.key} Â· Sort ${item.sortOrder || 0}`}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                        <span>Videos: {formatNumber(item.stats?.totalVideos || 0)}</span>
                        <span>Channels: {formatNumber(item.stats?.totalChannels || 0)}</span>
                        <span>{`Video min views: ${formatNumber(item.videoCriteria?.minViews || 0)}`}</span>
                        <span>{`Video min subscribers: ${formatNumber(item.videoCriteria?.minSubscribers || 0)}`}</span>
                        <span>{`Video min total: ${formatNumber(item.videoCriteria?.minTotalVideos || 0)}`}</span>
                        <span>{`Channel min views: ${formatNumber(item.channelCriteria?.minViews || 0)}`}</span>
                        <span>{`Channel min subscribers: ${formatNumber(item.channelCriteria?.minSubscribers || 0)}`}</span>
                        <span>{`Channel min total: ${formatNumber(item.channelCriteria?.minTotalVideos || 0)}`}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => editSource(item)} className={getActionButtonClass('sky', 'px-3 py-2 text-xs')}>Edit</button>
                      <button onClick={() => removeSource(item)} className={getActionButtonClass('amber', 'px-3 py-2 text-xs')} disabled={item.isDefault}>Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </section>
      ) : null}

      {activeSection === 'channels' ? (
        <section className="space-y-4">
          <section className={`${SURFACE_CARD_CLASS} p-5`}>
            <SectionHeader title="Channels table" subtitle="Distinct from sources: this is the discovered publisher inventory from Mongo." />
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <select value={channelFilters.source} onChange={(e) => setChannelFilters((prev) => ({ ...prev, source: e.target.value }))} className={INPUT_CLASS}><option value="">All sources</option>{sources.map((item) => <option key={item.id} value={item.key}>{item.name}</option>)}</select>
              <select value={channelFilters.status} onChange={(e) => setChannelFilters((prev) => ({ ...prev, status: e.target.value }))} className={INPUT_CLASS}><option value="">Any status</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
              <input value={channelFilters.search} onChange={(e) => setChannelFilters((prev) => ({ ...prev, search: e.target.value }))} className={INPUT_CLASS} placeholder="Search channel name or id" />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <StatusPill tone="sky">{`Selected ${selectedChannelIds.length}/${channels.length}`}</StatusPill>
              <button onClick={toggleAllChannels} className={getActionButtonClass('slate', 'px-3 py-2 text-xs')} disabled={!channels.length}>
                {selectedChannelIds.length === channels.length && channels.length ? 'Clear selection' : 'Select all'}
              </button>
              <button onClick={scanSelectedChannels} className={getActionButtonClass('violet', 'px-3 py-2 text-xs')} disabled={!selectedChannelIds.length || Boolean(busyAction)}>
                Scan selected
              </button>
              <button onClick={() => runScraperJob('scan')} className={getActionButtonClass('sky', 'px-3 py-2 text-xs')} disabled={Boolean(busyAction)}>
                Scan all saved channels
              </button>
            </div>
          </section>
          <section className={TABLE_SHELL_CLASS}>
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white/[0.03] text-xs uppercase tracking-[0.14em] text-slate-500"><tr><th className="px-4 py-3 w-10">Pick</th><th className="px-4 py-3">Channel</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Subscribers</th><th className="px-4 py-3">Videos</th><th className="px-4 py-3">Drive Ready</th><th className="px-4 py-3">Last Scanned</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr></thead>
              <tbody>
                {channels.map((item) => (
                  <tr key={item.id} className="border-t border-white/8">
                    <td className="px-4 py-3"><input type="checkbox" checked={selectedChannelIds.includes(item.id)} onChange={() => toggleChannelSelection(item.id)} className="h-4 w-4 rounded border-slate-400/70 bg-white/80" /></td>
                    <td className="px-4 py-3"><p className="font-medium text-white">{item.name || item.channelId}</p><p className="mt-1 break-all text-xs text-slate-500">{item.channelId}</p></td>
                    <td className="px-4 py-3"><SourcePill source={item.sourceKey || item.platform} /></td>
                    <td className="px-4 py-3 text-slate-200">{formatNumber(item.subscriberCount || 0)}</td>
                    <td className="px-4 py-3 text-slate-200">{formatNumber(item.stats?.totalVideos || 0)}</td>
                    <td className="px-4 py-3 text-slate-200">{formatNumber(item.stats?.driveReadyVideos || 0)}</td>
                    <td className="px-4 py-3 text-slate-400">{formatDate(item.lastScanned)}</td>
                    <td className="px-4 py-3"><StatusPill tone={toneFromStatus(item.isActive ? item.healthStatus || 'active' : 'inactive')}>{item.isActive ? item.healthStatus || 'active' : 'inactive'}</StatusPill></td>
                    <td className="px-4 py-3">
                      <button onClick={() => scanChannel(item.id)} className={getActionButtonClass('violet', 'px-3 py-2 text-xs')} disabled={Boolean(busyAction)}>
                        Manual scan
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          {!channels.length ? <EmptyState label="No channels loaded from Mongo yet." /> : null}
        </section>
      ) : null}

      {activeSection === 'videos' ? (
        <section className="space-y-4">
          <section className={`${SURFACE_CARD_CLASS} p-5`}>
            <SectionHeader title="Video inventory" subtitle="Videos are separate from sources and channels. From here you can sync to Drive or send items to production." />
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
              <select value={videoFilters.source} onChange={(e) => setVideoFilters((prev) => ({ ...prev, source: e.target.value }))} className={INPUT_CLASS}><option value="">All sources</option>{sources.map((item) => <option key={item.id} value={item.key}>{item.name}</option>)}</select>
              <select value={videoFilters.downloadStatus} onChange={(e) => setVideoFilters((prev) => ({ ...prev, downloadStatus: e.target.value }))} className={INPUT_CLASS}><option value="">Any download state</option><option value="pending">Pending</option><option value="downloading">Downloading</option><option value="done">Done</option><option value="failed">Failed</option></select>
              <select value={videoFilters.driveStatus} onChange={(e) => setVideoFilters((prev) => ({ ...prev, driveStatus: e.target.value }))} className={INPUT_CLASS}><option value="">Any drive state</option><option value="pending">Pending</option><option value="uploaded">Uploaded</option><option value="failed">Failed</option><option value="skipped">Skipped</option></select>
              <input value={videoFilters.search} onChange={(e) => setVideoFilters((prev) => ({ ...prev, search: e.target.value }))} className={INPUT_CLASS} placeholder="Search title or URL" />
            </div>
          </section>
          <section className="space-y-3">
            <div className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <span>Page {videoPagination.page} of {Math.ceil(videoPagination.total / videoPagination.limit) || 1}</span>
                <span>â€¢</span>
                <span>Total {videoPagination.total} videos</span>
                <span>Ã¢â‚¬Â¢</span>
                <span>{tr(`Selected ${selectedVideoIds.length}`, `Selected ${selectedVideoIds.length}`)}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleAllVideos}
                  disabled={!videos.length}
                  className={getActionButtonClass('slate', 'px-3 text-xs h-[38px]')}
                >
                  {allPageVideosSelected ? tr('Bo chon trang', 'Clear page') : tr('Chon het trang', 'Select page')}
                </button>
                <button
                  onClick={redownloadFailedVideos}
                  disabled={!videos.some((item) => item.downloadStatus === 'failed') || Boolean(busyAction)}
                  className={getActionButtonClass('amber', 'px-3 text-xs h-[38px]')}
                >
                  {tr('Tai lai video loi', 'Re-download failed')}
                </button>
                <button
                  onClick={() => queueVideosToFolder()}
                  disabled={!selectedVideoIds.length || Boolean(busyAction)}
                  className={getActionButtonClass('violet', 'px-3 text-xs h-[38px]')}
                >
                  <Layers3 className="h-3.5 w-3.5" />
                  {tr('Add to Queue folder', 'Add to Queue folder')}
                </button>
                <button
                  onClick={() => loadVideos(Math.max(1, videoPagination.page - 1))}
                  disabled={videoPagination.page === 1}
                  className={getActionButtonClass('slate', 'px-3 text-xs h-[38px]')}
                >
                  â† Previous
                </button>
                <select value={videoPagination.limit} onChange={(e) => { setVideoPagination((prev) => ({ ...prev, limit: Number(e.target.value), page: 1 })); loadVideos(1); }} className={INPUT_CLASS + ' w-20 text-xs'}>
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
                <button
                  onClick={() => loadVideos(videoPagination.page + 1)}
                  disabled={videoPagination.page * videoPagination.limit >= videoPagination.total}
                  className={getActionButtonClass('slate', 'px-3 text-xs h-[38px]')}
                >
                  Next â†’
                </button>
              </div>
            </div>
            <section className={TABLE_SHELL_CLASS}>
              <table className="min-w-full text-left text-sm">
                <thead className="bg-white/[0.03] text-xs uppercase tracking-[0.14em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={allPageVideosSelected}
                        onChange={toggleAllVideos}
                        className="h-4 w-4 rounded border-slate-400/70 bg-white/80"
                      />
                    </th>
                    <th className="px-4 py-3 w-16">Thumb</th>
                    <th className="px-4 py-3">Video</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3 w-20">Views</th>
                    <th className="px-4 py-3">Download</th>
                    <th className="px-4 py-3">Drive</th>
                    <th className="px-4 py-3">Mashup / Publish</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {videos.map((item) => (
                    <tr key={item.id} className="border-t border-white/8">
                      <td className="px-4 py-3"><input type="checkbox" checked={selectedVideoIds.includes(item.id)} onChange={() => toggleVideoSelection(item.id)} className="h-4 w-4 rounded border-slate-400/70 bg-white/80" /></td>
                      <td className="px-4 py-3"><div className="h-12 w-14 overflow-hidden rounded-lg border border-slate-600 bg-slate-800">{item.thumbnail ? <img src={item.thumbnail} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-slate-500">N/A</div>}</div></td>
                      <td className="px-4 py-3"><p className="font-medium text-white">{item.title || item.videoId}</p><p className="mt-1 break-all text-xs text-slate-500">{item.channelName || item.videoId}</p></td>
                      <td className="px-4 py-3"><SourcePill source={item.sourceKey} /></td>
                      <td className="px-4 py-3 text-slate-200">{formatNumber(item.views || 0)}</td>
                      <td className="px-4 py-3"><StatusPill tone={toneFromStatus(item.downloadStatus)}>{item.downloadStatus}</StatusPill></td>
                      <td className="px-4 py-3"><StatusPill tone={toneFromStatus(item.driveSync?.status)}>{item.driveSync?.status || 'pending'}</StatusPill></td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1.5">
                          <StatusPill tone={toneFromStatus(item.production?.queueStatus || 'idle')}>
                            {item.production?.queueStatus || 'idle'}
                          </StatusPill>
                          <StatusPill tone={item.publishing?.totalPublished > 0 ? 'emerald' : toneFromStatus('not yet')}>
                            {item.publishing?.totalPublished > 0 ? tr('Published', 'Published') : tr('Not yet', 'Not yet')}
                          </StatusPill>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => uploadVideo(item.id)} className={getActionButtonClass('emerald', 'px-3 py-2 text-xs')} disabled={Boolean(busyAction)}>
                            <Upload className="h-3.5 w-3.5" />
                            Sync
                          </button>
                          <button
                            onClick={() => queueVideosToFolder([item.id])}
                            className={getActionButtonClass('sky', 'px-3 py-2 text-xs')}
                            disabled={item.downloadStatus !== 'done' || Boolean(busyAction)}
                          >
                            <Layers3 className="h-3.5 w-3.5" />
                            {tr('Add to Queue', 'Add to Queue')}
                          </button>
                          <button onClick={() => { toggleVideoSelection(item.id); goToSection('production'); }} className={getActionButtonClass('violet', 'px-3 py-2 text-xs')}>
                            {tr('Compose', 'Compose')}
                          </button>
                          {item.downloadStatus !== 'done' ? (
                            <button onClick={() => redownloadVideo(item.id)} className={getActionButtonClass('amber', 'px-3 py-2 text-xs')} disabled={Boolean(busyAction)}>
                              Re-download
                            </button>
                          ) : null}
                          <button onClick={() => deleteVideo(item.id)} className={getActionButtonClass('rose', 'px-3 py-2 text-xs')} disabled={Boolean(busyAction)} title="Delete video and all related data">
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </section>
          {!videos.length ? <EmptyState label="No videos loaded from Mongo yet." /> : null}
        </section>
      ) : null}

      {activeSection === 'production' ? (
        <section className="space-y-4">
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
            <MetricCard title={tr('Eligible', 'Eligible')} value={productionOverview?.metrics?.eligibleSourceVideos || 0} helper={tr('Downloaded source videos available for production', 'Downloaded source videos available for production')} tone="sky" />
            <MetricCard title={tr('Need Drive Sync', 'Need Drive Sync')} value={productionOverview?.metrics?.sourceVideosPendingDriveSync || 0} helper={tr('Source videos still not mirrored to Drive', 'Source videos still not mirrored to Drive')} tone="amber" />
            <MetricCard title={tr('Active', 'Active')} value={productionOverview?.metrics?.activeSourceVideos || 0} helper={tr('Sources already queued or rendering', 'Sources already queued or rendering')} tone="violet" />
            <MetricCard title={tr('Completed', 'Completed')} value={productionOverview?.metrics?.completedMashupJobs || 0} helper={tr('Mashup jobs rendered successfully', 'Mashup jobs rendered successfully')} tone="emerald" />
            <MetricCard title={tr('Failed', 'Failed')} value={productionOverview?.metrics?.failedMashupJobs || 0} helper={tr('Mashup jobs that failed', 'Mashup jobs that failed')} tone="violet" />
            <MetricCard title={tr('Assets', 'Assets')} value={productionOverview?.metrics?.generatedVideoAssets || 0} helper={tr('Generated video assets registered', 'Generated video assets registered')} tone="amber" />
          </section>

          <section className={`${SURFACE_CARD_CLASS} p-5`}>
            <SectionHeader
              title={tr('Batch production lane', 'Batch production lane')}
              subtitle={tr('Run mashup in batches from completed source videos. Batch runs can sync source files to Drive first and use the current composer defaults.', 'Run mashup in batches from completed source videos. Batch runs can sync source files to Drive first and use the current composer defaults.')}
              actions={<button onClick={runMassProduction} className={getActionButtonClass('violet', 'px-3 py-2 text-xs')} disabled={Boolean(busyAction)}><Clapperboard className="h-4 w-4" />{tr('Run batch', 'Run batch')}</button>}
            />
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <select value={productionBatch.sourceKey} onChange={(e) => updateProductionBatch('sourceKey', e.target.value)} className={INPUT_CLASS}>
                <option value="">{tr('All sources', 'All sources')}</option>
                {sources.map((item) => (
                  <option key={item.id} value={item.key}>{item.name || item.key}</option>
                ))}
              </select>
              <input type="number" min="1" max="50" value={productionBatch.limit} onChange={(e) => updateProductionBatch('limit', Number(e.target.value) || 1)} className={INPUT_CLASS} placeholder={tr('Number of videos', 'Number of videos')} />
              <label className={`${CHECKBOX_PANEL_CLASS} flex items-center gap-3`}><input type="checkbox" checked={Boolean(productionBatch.syncSourceToDrive)} onChange={(e) => updateProductionBatch('syncSourceToDrive', e.target.checked)} className="h-4 w-4 rounded border-slate-400/70 bg-white/80" />{tr('Sync source videos to Drive first', 'Sync source videos to Drive first')}</label>
              <label className={`${CHECKBOX_PANEL_CLASS} flex items-center gap-3`}><input type="checkbox" checked={Boolean(productionBatch.startImmediately)} onChange={(e) => updateProductionBatch('startImmediately', e.target.checked)} className="h-4 w-4 rounded border-slate-400/70 bg-white/80" />{tr('Render immediately after queueing', 'Render immediately after queueing')}</label>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <StatusPill tone="sky">{`${tr('recipe', 'recipe')} ${composer.recipe}`}</StatusPill>
              <StatusPill tone="violet">{`${tr('platform', 'platform')} ${composer.platform}`}</StatusPill>
              <StatusPill tone="amber">{`${tr('duration', 'duration')} ${composer.duration}s`}</StatusPill>
              <StatusPill tone="emerald">{`${tr('drive ready', 'drive ready')} ${productionOverview?.metrics?.driveReadySourceVideos || 0}`}</StatusPill>
              <StatusPill tone="sky">{`${tr('sub sources', 'sub sources')} ${enabledSubVideoSources.length}`}</StatusPill>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <section className={`${SURFACE_CARD_CLASS} p-5`}>
            <SectionHeader
              title={tr('Cáº¥u hÃ¬nh job sáº£n xuáº¥t', 'Compose production job')}
              subtitle={tr('Mashup, phá»¥ Ä‘á», watermark vÃ  voiceover dÃ¹ng chung má»™t form Ä‘á»ƒ queue nháº­n Ä‘Ãºng má»™t recipe payload.', 'Mashup, subtitle, watermark, and voiceover stay in one form so the queue receives one recipe payload.')}
            />
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <select value={composer.recipe} onChange={(e) => setComposer((prev) => ({ ...prev, recipe: e.target.value }))} className={INPUT_CLASS}><option value="mashup">{tr('Mashup', 'Mashup')}</option><option value="subtitle">{tr('Phá»¥ Ä‘á» tá»± Ä‘á»™ng', 'Auto subtitle')}</option><option value="voiceover">{tr('Lá»“ng tiáº¿ng', 'Voiceover')}</option></select>
              <select value={composer.platform} onChange={(e) => setComposer((prev) => ({ ...prev, platform: e.target.value }))} className={INPUT_CLASS}><option value="youtube">YouTube</option><option value="facebook">Facebook</option><option value="tiktok">TikTok</option></select>
              <input type="number" value={composer.duration} onChange={(e) => setComposer((prev) => ({ ...prev, duration: Number(e.target.value) || 30 }))} className={INPUT_CLASS} placeholder={tr('Thá»i lÆ°á»£ng (giÃ¢y)', 'Duration seconds')} />
              <select value={composer.aspectRatio} onChange={(e) => setComposer((prev) => ({ ...prev, aspectRatio: e.target.value }))} className={INPUT_CLASS}><option value="9:16">9:16</option><option value="16:9">16:9</option><option value="1:1">1:1</option></select>
              <select value={composer.layout} onChange={(e) => setComposer((prev) => ({ ...prev, layout: e.target.value }))} className={INPUT_CLASS}><option value="2-3-1-3">{tr('Main 2/3 + sub 1/3', 'Main 2/3 + sub 1/3')}</option><option value="full-screen">{tr('ToÃ n mÃ n hÃ¬nh', 'Full screen')}</option></select>
              <select value={composer.subtitleMode} onChange={(e) => setComposer((prev) => ({ ...prev, subtitleMode: e.target.value }))} className={INPUT_CLASS}><option value="auto">{tr('Tá»± Ä‘á»™ng', 'Auto subtitle')}</option><option value="none">{tr('KhÃ´ng dÃ¹ng', 'No subtitle')}</option></select>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              <label className={`${CHECKBOX_PANEL_CLASS} flex items-center gap-3`}><input type="checkbox" checked={composer.watermarkEnabled} onChange={(e) => setComposer((prev) => ({ ...prev, watermarkEnabled: e.target.checked }))} className="h-4 w-4 rounded border-slate-400/70 bg-white/80" />{tr('Watermark', 'Watermark')}</label>
              <label className={`${CHECKBOX_PANEL_CLASS} flex items-center gap-3`}><input type="checkbox" checked={composer.voiceoverEnabled} onChange={(e) => setComposer((prev) => ({ ...prev, voiceoverEnabled: e.target.checked }))} className="h-4 w-4 rounded border-slate-400/70 bg-white/80" />{tr('Lá»“ng tiáº¿ng', 'Voiceover')}</label>
              <select value={composer.templateStrategy} onChange={(e) => setComposer((prev) => ({ ...prev, templateStrategy: e.target.value }))} className={INPUT_CLASS}><option value="random">{tr('Ngáº«u nhiÃªn', 'Random template')}</option><option value="weighted">{tr('Theo trá»ng sá»‘', 'Weighted template')}</option><option value="ai_suggested">{tr('AI Ä‘á» xuáº¥t', 'AI suggested template')}</option></select>
            </div>
            <div className="mt-4">
              <button onClick={queueSelectedVideos} className={getActionButtonClass('violet')} disabled={(!selectedVideoIds.length && !(manualSelections.main && manualSelections.sub)) || Boolean(busyAction)}>
                <Clapperboard className="h-4 w-4" />
                {tr(
                  `ÄÆ°a vÃ o queue (${selectedVideoIds.length || 0} video nguá»“n)`,
                  `Add to queue (${selectedVideoIds.length || 0} source videos)`
                )}
              </button>
            </div>
          </section>
          <section className={`${SURFACE_CARD_CLASS} p-5`}>
            <SectionHeader
              title={tr('Recent production history', 'Recent production history')}
              subtitle={tr('Latest mashup jobs, output sync state, and readiness for downstream publishing.', 'Latest mashup jobs, output sync state, and readiness for downstream publishing.')}
              actions={(
                <Link to="/video-production/history" className={getActionButtonClass('sky', 'px-3 py-2 text-xs')}>
                  {tr('Xem Ä‘áº§y Ä‘á»§', 'Open full history')}
                </Link>
              )}
            />
            <div className="mt-4 space-y-3">
              {(productionOverview?.recentHistory || []).slice(0, 8).map((item) => (
                <div key={item.queueId} className={SUBTLE_PANEL_CLASS}>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">{item.sourceTitle || item.queueId}</p>
                      <p className="mt-1 break-all text-xs text-slate-500">{item.queueId}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <SourcePill source={item.sourcePlatform || 'source'} />
                        <StatusPill tone={toneFromStatus(item.status)}>{item.status}</StatusPill>
                        <StatusPill tone={toneFromStatus(item.completedDriveSync?.status || 'pending')}>{item.completedDriveSync?.status || 'pending-drive'}</StatusPill>
                        <StatusPill tone="sky">{item.executionState || 'idle'}</StatusPill>
                      </div>
                    </div>
                  <div className="text-right text-xs text-slate-400">
                    <p>{formatDate(item.completedAt || item.updatedAt || item.createdAt)}</p>
                    <div className="mt-2 flex flex-wrap justify-end gap-2">
                      <button onClick={() => setPreviewItem(item)} className={getActionButtonClass('slate', 'px-2 py-1 text-[11px]')}>
                        <Video className="h-3 w-3" />
                        {tr('Preview', 'Preview')}
                      </button>
                      {item.completedDriveSync?.webViewLink ? (
                        <a href={item.completedDriveSync.webViewLink} target="_blank" rel="noreferrer" className="inline-flex items-center text-sky-200 underline-offset-2 hover:underline">
                          {tr('Drive output', 'Drive output')}
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>
                  {item.outputPath ? <p className="mt-3 break-all text-xs text-slate-500">{item.outputPath}</p> : null}
                </div>
              ))}
              {!(productionOverview?.recentHistory || []).length ? <EmptyState label={tr('No production history yet.', 'No production history yet.')} /> : null}
            </div>
          </section>
          <section className={`${SURFACE_CARD_CLASS} p-5`}>
            <SectionHeader
              title={tr('Selected videos', 'Selected videos')}
              subtitle={tr('Há»— trá»£ cáº£ upload tá»« mÃ¡y vÃ  chá»n láº¡i tá»« video gallery. Hai slot main/sub sáº½ Ä‘Æ°á»£c Æ°u tiÃªn khi manual start mashup.', 'Supports both local upload and picking from the video gallery. Main/sub slots are prioritized when manually starting a mashup.')}
            />
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              {['main', 'sub'].map((slot) => {
                const slotCopy = slot === 'main'
                  ? {
                      title: tr('Main video', 'Main video'),
                      helper: tr('Video chÃ­nh cho bá»‘ cá»¥c 2/3 mÃ n hÃ¬nh.', 'Primary video used for the 2/3 screen area.'),
                    }
                  : {
                      title: tr('Sub video', 'Sub video'),
                      helper: tr('Video phá»¥ hoáº·c template cho pháº§n cÃ²n láº¡i.', 'Secondary/template video used for the remaining area.'),
                    };
                const selectedItem = manualSelections[slot];

                return (
                  <div key={slot} className={SUBTLE_PANEL_CLASS}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{slotCopy.title}</p>
                        <p className="mt-1 text-xs text-slate-400">{slotCopy.helper}</p>
                      </div>
                      {selectedItem ? <StatusPill tone="emerald">{tr('ÄÃ£ chá»n', 'Selected')}</StatusPill> : <StatusPill tone="amber">{tr('ChÆ°a cÃ³', 'Missing')}</StatusPill>}
                    </div>
                    <div className={`${INSET_PANEL_CLASS} mt-4`}>
                      {selectedItem ? (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-white">{selectedItem.name || selectedItem.assetId}</p>
                          <p className="text-xs text-slate-500">{selectedItem.assetId || selectedItem.localPath || tr('Nguá»“n thá»§ cÃ´ng', 'Manual source')}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">{tr('ChÆ°a cÃ³ video cho slot nÃ y.', 'No video selected for this slot yet.')}</p>
                      )}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <label className={getActionButtonClass('sky', 'cursor-pointer')}>
                        <Upload className="h-4 w-4" />
                        {tr('Upload tá»« mÃ¡y', 'Upload from device')}
                        <input
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            uploadManualVideo(slot, file);
                            event.target.value = '';
                          }}
                        />
                      </label>
                      <button type="button" onClick={() => openGalleryPicker(slot)} className={getActionButtonClass('violet')}>
                        <Video className="h-4 w-4" />
                        {tr('Chá»n tá»« gallery', 'Pick from gallery')}
                      </button>
                      {selectedItem ? (
                        <button type="button" onClick={() => clearManualSelection(slot)} className={getActionButtonClass('amber')}>
                          {tr('XoÃ¡ chá»n', 'Clear')}
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-5 space-y-3">
              {selectedVideos.map((item) => (
                <div key={item.id} className={`${SUBTLE_PANEL_CLASS} rounded-2xl`}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{item.title || item.videoId}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.channelName || item.sourceKey}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <SourcePill source={item.sourceKey} />
                      <StatusPill tone={toneFromStatus(item.driveSync?.status)}>{item.driveSync?.status || 'pending'}</StatusPill>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {!selectedVideos.length ? <p className="mt-4 text-sm text-slate-500">{tr('ChÆ°a chá»n video nguá»“n tá»« tab Video. Báº¡n váº«n cÃ³ thá»ƒ dÃ¹ng 2 slot upload/pick á»Ÿ trÃªn.', 'No source videos selected from the Videos tab yet. You can still use the two upload/pick slots above.')}</p> : null}
          </section>
        </section>
      </section>
      ) : null}

      {activeSection === 'queue' ? (
        <section className="space-y-4">
          <section className={`${SURFACE_CARD_CLASS} p-5`}>
            <SectionHeader
              title={tr('Production queue runtime', 'Production queue runtime')}
              subtitle={tr('Tab nay show Mongo-backed production jobs, kem queue folder (local/Drive) de auto mashup. Scraper backlog van o Scraping.', 'This tab shows Mongo-backed production jobs plus the Queue folder intake (local/Drive). Scraper backlog still lives in Scraping.')}
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <StatusPill tone="sky">{tr('Production queue', 'Production queue')}</StatusPill>
              <button onClick={() => goToSection('scraping')} className={getActionButtonClass('slate', 'px-3 py-2 text-xs')}>
                {tr('Mo Scraping queue', 'Open scraping queue')}
              </button>
              <button onClick={() => goToSection('settings')} className={getActionButtonClass('slate', 'px-3 py-2 text-xs')}>
                {tr('Mo Scheduler', 'Open scheduler')}
              </button>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-8">
              <MetricCard title={tr('Pending', 'Pending')} value={jobStats?.byStatus?.pending || 0} helper={tr('Awaiting pickup', 'Awaiting pickup')} tone="amber" />
              <MetricCard title={tr('Auto retry', 'Auto retry')} value={jobStats?.byExecutionState?.['auto-retry-pending'] || 0} helper={tr('Retryable transient jobs', 'Retryable transient jobs')} tone="amber" />
              <MetricCard title={tr('Manual review', 'Manual review')} value={jobStats?.byExecutionState?.['manual-review'] || 0} helper={tr('Needs operator action', 'Needs operator action')} tone="violet" />
              <MetricCard title={tr('Processing', 'Processing')} value={jobStats?.byStatus?.processing || 0} helper={tr('Currently marked running', 'Currently marked running')} tone="sky" />
              <MetricCard title={tr('Stale processing', 'Stale processing')} value={queueRuntime?.runtime?.staleProcessing || 0} helper={tr('Likely interrupted jobs', 'Likely interrupted jobs')} tone="violet" />
              <MetricCard title={tr('Ready', 'Ready')} value={jobStats?.byStatus?.ready || 0} helper={tr('Ready for publish', 'Ready for publish')} tone="emerald" />
              <MetricCard title={tr('Failed', 'Failed')} value={jobStats?.byStatus?.failed || 0} helper={tr('Stopped or exhausted retries', 'Stopped or exhausted retries')} tone="violet" />
              <MetricCard title={tr('Error rate', 'Error rate')} value={`${Math.round(jobStats?.errorRate || 0)}%`} helper={tr('Jobs with at least one error', 'Jobs with at least one error')} tone="sky" />
            </div>
          </section>

          <section className={`${SURFACE_CARD_CLASS} p-5`}>
            <SectionHeader
              title={tr('Queue folder intake', 'Queue folder intake')}
              subtitle={tr('File drop vao media/queue hoac Drive /Videos/Queue se duoc cron job quet va mashup tu dong.', 'Files dropped into media/queue or Drive /Videos/Queue are auto-scanned and mashed up by the cron job.')}
              actions={(
                <div className="flex flex-wrap gap-2">
                  <button onClick={triggerQueueScannerNow} className={getActionButtonClass('violet', 'px-3 py-2 text-xs')} disabled={Boolean(busyAction)}>
                    {tr('Scan now', 'Scan now')}
                  </button>
                  <button onClick={() => goToSection('settings')} className={getActionButtonClass('slate', 'px-3 py-2 text-xs')}>
                    {tr('Mo Scheduler', 'Open scheduler')}
                  </button>
                </div>
              )}
            />
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <MetricCard title={tr('Local queue', 'Local queue')} value={schedulerRuntime?.localQueueCount || 0} helper={tr('Files in media/queue', 'Files in media/queue')} tone="violet" />
              <MetricCard title={tr('Drive queue', 'Drive queue')} value={schedulerRuntime?.driveQueueCount || 0} helper={tr('Files in Drive /Videos/Queue', 'Files in Drive /Videos/Queue')} tone="sky" />
              <MetricCard title={tr('Total queue items', 'Total queue items')} value={schedulerRuntime?.queueCount || 0} helper={tr('Local + Drive', 'Local + Drive')} tone="amber" />
            </div>
            {(schedulerRuntime?.videos || []).length ? (
              <div className={`${SUBTLE_PANEL_CLASS} mt-4`}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{tr('Local queue snapshot', 'Local queue snapshot')}</p>
                <div className="mt-3 space-y-2">
                  {schedulerRuntime.videos.slice(0, 5).map((item) => (
                    <div key={`${item.name}-${item.createdAt || ''}`} className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-slate-300">
                      <span className="truncate">{item.metadata?.sourceTitle || item.name}</span>
                      <span className="shrink-0 text-xs text-slate-500">{formatDate(item.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {(schedulerRuntime?.driveQueue || []).length ? (
              <div className={`${SUBTLE_PANEL_CLASS} mt-4`}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{tr('Drive queue snapshot', 'Drive queue snapshot')}</p>
                <div className="mt-3 space-y-2">
                  {schedulerRuntime.driveQueue.slice(0, 5).map((item) => (
                    <div key={`${item.driveFileId}-${item.createdAt || ''}`} className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-slate-300">
                      <span className="truncate">{item.name}</span>
                      <span className="shrink-0 text-xs text-slate-500">{formatDate(item.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.04fr)_minmax(0,0.96fr)]">
            <section className={`${SURFACE_CARD_CLASS} p-5`}>
              <SectionHeader
                title={tr('Runtime controls', 'Runtime controls')}
                subtitle={tr('Release stale jobs sau khi crash/restart, retry failed bucket cho loi transient, va clear cac bucket lich su an toan.', 'Release stale jobs after crash/restart, retry failed buckets for transient issues, and clear safe historical buckets.')}
              />
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[180px_auto_auto]">
                <input
                  type="number"
                  min="1"
                  max="720"
                  value={queueTimeoutMinutes}
                  onChange={(e) => setQueueTimeoutMinutes(Number(e.target.value) || 30)}
                  className={INPUT_CLASS}
                  placeholder="Stale timeout (min)"
                />
                <button onClick={releaseStaleQueueJobs} className={getActionButtonClass('amber')} disabled={Boolean(busyAction)}>
                  <RefreshCcw className="h-4 w-4" />
                  {tr('Release stale processing', 'Release stale processing')}
                </button>
                <button onClick={retryFailedQueueJobs} className={getActionButtonClass('violet')} disabled={Boolean(busyAction)}>
                  <RefreshCcw className="h-4 w-4" />
                  {tr('Retry failed batch', 'Retry failed batch')}
                </button>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[200px_auto]">
                <select value={queueClearFilter} onChange={(e) => setQueueClearFilter(e.target.value)} className={INPUT_CLASS}>
                  <option value="failed">{tr('Clear failed', 'Clear failed')}</option>
                  <option value="uploaded">{tr('Clear uploaded', 'Clear uploaded')}</option>
                  <option value="ready">{tr('Clear ready', 'Clear ready')}</option>
                  <option value="pending">{tr('Clear pending', 'Clear pending')}</option>
                </select>
                <button onClick={clearQueueBucket} className={getActionButtonClass('amber')} disabled={Boolean(busyAction)}>
                  {tr('Clear selected bucket', 'Clear selected bucket')}
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-400">
                <StatusPill tone="sky">{`avg ${jobStats?.averageProcessingTime || 0}s`}</StatusPill>
                <StatusPill tone="amber">{`timeout ${queueRuntime?.runtime?.timeoutMinutes || queueTimeoutMinutes}m`}</StatusPill>
                {queueRuntime?.runtime?.oldestPending?.queueId ? <StatusPill tone="violet">{tr('Oldest pending available', 'Oldest pending available')}</StatusPill> : null}
              </div>
            </section>

            <section className={`${SURFACE_CARD_CLASS} p-5`}>
              <SectionHeader
                title={tr('Buckets and oldest pending', 'Buckets and oldest pending')}
                subtitle={tr('Tach thong tin theo content type va platform de thay lane nao dang phong to.', 'Break down by content type and platform so you can see which lane is growing.')}
              />
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className={SUBTLE_PANEL_CLASS}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{tr('By content type', 'By content type')}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {Object.entries(jobStats?.byContentType || {}).map(([key, value]) => (
                      <StatusPill key={key} tone="sky">{`${key}: ${value}`}</StatusPill>
                    ))}
                    {!Object.keys(jobStats?.byContentType || {}).length ? <p className="text-sm text-slate-500">{tr('Chua co du lieu.', 'No data yet.')}</p> : null}
                  </div>
                </div>
                <div className={SUBTLE_PANEL_CLASS}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{tr('By platform', 'By platform')}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {Object.entries(jobStats?.byPlatform || {}).map(([key, value]) => (
                      <StatusPill key={key} tone="violet">{`${key}: ${value}`}</StatusPill>
                    ))}
                    {!Object.keys(jobStats?.byPlatform || {}).length ? <p className="text-sm text-slate-500">{tr('Chua co du lieu.', 'No data yet.')}</p> : null}
                  </div>
                </div>
              </div>
              <div className={`${SUBTLE_PANEL_CLASS} mt-4`}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{tr('Oldest pending job', 'Oldest pending job')}</p>
                {queueRuntime?.runtime?.oldestPending ? (
                  <div className="mt-3">
                    <p className="text-sm font-semibold text-white">{queueRuntime.runtime.oldestPending.sourceTitle || queueRuntime.runtime.oldestPending.queueId}</p>
                    <p className="mt-1 break-all text-xs text-slate-500">{queueRuntime.runtime.oldestPending.queueId}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <StatusPill tone="amber">{queueRuntime.runtime.oldestPending.status}</StatusPill>
                      <StatusPill tone="sky">{queueRuntime.runtime.oldestPending.contentType || 'job'}</StatusPill>
                      <StatusPill tone="violet">{formatDate(queueRuntime.runtime.oldestPending.createdAt)}</StatusPill>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">{tr('Khong co pending job.', 'No pending job.')}</p>
                )}
              </div>
            </section>
          </section>

          {queueRuntime?.runtime?.staleJobs?.length ? (
            <section className={`${SURFACE_CARD_CLASS} p-5`}>
              <SectionHeader title={tr('Stale processing jobs', 'Stale processing jobs')} subtitle={tr('Nhung job nay dang o processing qua timeout va co the release ve pending.', 'These jobs have stayed in processing beyond the timeout and can usually be released back to pending.')} />
              <div className="mt-4 space-y-3">
                {queueRuntime.runtime.staleJobs.map((job) => (
                  <div key={job.queueId} className={SUBTLE_PANEL_CLASS}>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">{job.sourceTitle || job.queueId}</p>
                        <p className="mt-1 break-all text-xs text-slate-500">{job.queueId}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <StatusPill tone="violet">{job.contentType || 'job'}</StatusPill>
                        <StatusPill tone="amber">{formatDate(job.updatedAt || job.startedAt || job.createdAt)}</StatusPill>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className={`${SURFACE_CARD_CLASS} p-5`}>
            <SectionHeader
              title={tr('Production jobs', 'Production jobs')}
              subtitle={tr('Manual start, retry va publish tung job van o day. Status filter chi ap dung cho production queue.', 'Manual start, retry, and publish per job still live here. The status filter only applies to the production queue.')}
            />
            <div className="mt-4 max-w-[260px]">
              <select value={jobStatusFilter} onChange={(e) => setJobStatusFilter(e.target.value)} className={INPUT_CLASS}>
                <option value="">{tr('All statuses', 'All statuses')}</option>
                <option value="pending">{tr('Pending', 'Pending')}</option>
                <option value="processing">{tr('Processing', 'Processing')}</option>
                <option value="ready">{tr('Ready', 'Ready')}</option>
                <option value="failed">{tr('Failed', 'Failed')}</option>
                <option value="uploaded">{tr('Uploaded', 'Uploaded')}</option>
              </select>
            </div>
          </section>
          {jobs.map((job) => (
            <section key={job.queueId} className={`${SURFACE_CARD_CLASS} p-5`}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">{job.sourceTitle || job.queueId}</p>
                  <p className="mt-1 break-all text-xs text-slate-500">{job.queueId}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <SourcePill source={job.sourcePlatform || job.platform} />
                    <StatusPill tone={toneFromStatus(job.status)}>{job.status}</StatusPill>
                    <StatusPill tone={queueExecutionTone(job)}>{queueExecutionLabel(job, tr)}</StatusPill>
                    <StatusPill tone="sky">{job.contentType}</StatusPill>
                    {job.errorCount ? <StatusPill tone="amber">{tr('Retry', 'Retry')} {job.errorCount}/{job.maxRetries || 0}</StatusPill> : null}
                  </div>
                  {job.queueControl?.lastFailureMessage ? <p className="mt-3 max-w-3xl break-words text-xs text-rose-200/80">{job.queueControl.lastFailureMessage}</p> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => toggleLogs(job.queueId)} className={getActionButtonClass('sky', 'px-3 py-2 text-xs')}>{jobLogs[job.queueId] ? tr('Hide Logs', 'Hide Logs') : tr('View Logs', 'View Logs')}</button>
                  {job.canManualStart ? (
                    <button onClick={() => startJob(job.queueId)} className={getActionButtonClass(job.queueControl?.executionState === 'manual-review' ? 'amber' : 'violet', 'px-3 py-2 text-xs')} disabled={Boolean(busyAction)}>
                      <Clapperboard className="h-3.5 w-3.5" />
                      {queueActionLabel(job, tr)}
                    </button>
                  ) : null}
                  {job.status === 'ready' ? <button onClick={() => publishJob(job.queueId)} className={getActionButtonClass('emerald', 'px-3 py-2 text-xs')} disabled={Boolean(busyAction)}><Send className="h-3.5 w-3.5" />{tr('Publish', 'Publish')}</button> : null}
                  {job.status === 'ready' ? <button onClick={() => openYoutubePublishDialog(job)} className={getActionButtonClass('rose', 'px-3 py-2 text-xs')} disabled={Boolean(busyAction)}><Youtube className="h-3.5 w-3.5" />{tr('YouTube', 'YouTube')}</button> : null}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-400">
                {job.queueControl?.summary ? <StatusPill tone={queueExecutionTone(job)}>{job.queueControl.summary}</StatusPill> : null}
                {job.queueControl?.retryStopped ? <StatusPill tone="rose">{job.queueControl.retryStoppedReason || tr('Retry stopped', 'Retry stopped')}</StatusPill> : null}
                {job.queueControl?.nextAction === 'manual-start' ? <StatusPill tone="violet">{tr('Manual trigger available', 'Manual trigger available')}</StatusPill> : null}
                {job.queueControl?.nextAction === 'auto-retry' && !job.queueControl?.retryStopped ? <StatusPill tone="amber">{tr('Will auto retry', 'Will auto retry')}</StatusPill> : null}
                {job.queueControl?.lastFailureStage ? <StatusPill tone="rose">{job.queueControl.lastFailureStage}</StatusPill> : null}
              </div>
              {job.status === 'ready' ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{tr('Publish targets', 'Publish targets')}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(connections.accounts || []).map((account) => (
                      <button key={account.accountId} onClick={() => togglePublishAccount(job.queueId, account.accountId)} className={getActionButtonClass((selectedPublishAccounts[job.queueId] || []).includes(account.accountId) ? 'emerald' : 'sky', 'px-3 py-2 text-xs')}>
                        {account.platform}:{account.displayName}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {jobLogs[job.queueId] ? (
                <div className={`${LOG_PANEL_CLASS} mt-4 space-y-2 text-slate-300`}>
                  {jobLogs[job.queueId].map((entry, index) => (
                    <div key={job.queueId + '-' + index} className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
                      <span className="font-medium text-white">{entry.stage}</span>
                      <span className="mx-2 text-slate-500">|</span>
                      <span>{entry.status}</span>
                      <p className="mt-1 text-slate-400">{entry.message || entry.error || tr('No message', 'No message')}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>
          ))}
          {!jobs.length ? <EmptyState label={tr('No jobs in the production queue yet.', 'No jobs in the production queue yet.')} /> : null}
        </section>
      ) : null}

      {activeSection === 'publish' ? (
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <section className={`${SURFACE_CARD_CLASS} p-5`}>
            <SectionHeader title="Saved connections" subtitle="Use this screen like an authentication dashboard to verify social media connectivity." />
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <MetricCard title="Total" value={connections.stats?.totalAccounts || 0} helper="Saved accounts" tone="sky" />
              <MetricCard title="Active" value={connections.stats?.activeAccounts || 0} helper="Available for posting" tone="emerald" />
              <MetricCard title="Verified" value={connections.stats?.verifiedAccounts || 0} helper="Connection checks passed" tone="violet" />
            </div>
            <div className="mt-4 space-y-3">
              {(connections.accounts || []).map((account) => (
                <div key={account.accountId} className={`${SUBTLE_PANEL_CLASS} rounded-2xl`}>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="font-medium text-white">{account.displayName}</p>
                      <p className="mt-1 break-all text-xs text-slate-500">{account.platform}:{account.username}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <StatusPill tone={account.verified ? 'emerald' : 'amber'}>{account.verified ? 'verified' : 'unverified'}</StatusPill>
                        <StatusPill tone={account.active ? 'sky' : 'violet'}>{account.active ? 'active' : 'inactive'}</StatusPill>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => verifyConnection(account.accountId)} className={getActionButtonClass('sky', 'px-3 py-2 text-xs')} disabled={Boolean(busyAction)}>Verify</button>
                      <button onClick={() => deleteConnection(account.accountId)} className={getActionButtonClass('amber', 'px-3 py-2 text-xs')} disabled={Boolean(busyAction)}>Remove</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section className={`${SURFACE_CARD_CLASS} p-5`}>
            <SectionHeader title="Add connection" subtitle="Manual add is still supported until full OAuth wizards are expanded." />
            <form onSubmit={saveConnection} className="mt-4 space-y-3">
              <select value={connectionForm.platform} onChange={(e) => setConnectionForm((prev) => ({ ...prev, platform: e.target.value }))} className={INPUT_CLASS}><option value="youtube">YouTube</option><option value="facebook">Facebook</option><option value="tiktok">TikTok</option></select>
              <input value={connectionForm.username} onChange={(e) => setConnectionForm((prev) => ({ ...prev, username: e.target.value }))} className={INPUT_CLASS} placeholder="Handle / username" required />
              <input value={connectionForm.displayName} onChange={(e) => setConnectionForm((prev) => ({ ...prev, displayName: e.target.value }))} className={INPUT_CLASS} placeholder="Display name" />
              <input value={connectionForm.email} onChange={(e) => setConnectionForm((prev) => ({ ...prev, email: e.target.value }))} className={INPUT_CLASS} placeholder="Email" />
              <input value={connectionForm.accessToken} onChange={(e) => setConnectionForm((prev) => ({ ...prev, accessToken: e.target.value }))} className={INPUT_CLASS} placeholder="Access token" required />
              <input value={connectionForm.refreshToken} onChange={(e) => setConnectionForm((prev) => ({ ...prev, refreshToken: e.target.value }))} className={INPUT_CLASS} placeholder="Refresh token" />
              <input value={connectionForm.apiKey} onChange={(e) => setConnectionForm((prev) => ({ ...prev, apiKey: e.target.value }))} className={INPUT_CLASS} placeholder="API key" />
              <input value={connectionForm.channelId} onChange={(e) => setConnectionForm((prev) => ({ ...prev, channelId: e.target.value }))} className={INPUT_CLASS} placeholder="Channel/Page ID" />
              <button type="submit" className={getActionButtonClass('violet')} disabled={Boolean(busyAction)}><Plus className="h-4 w-4" />Save connection</button>
            </form>
          </section>
        </section>
      ) : null}

      {activeSection === 'settings' ? (
        <section className="space-y-4">
          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <section className={`${SURFACE_CARD_CLASS} p-5`}>
              <SectionHeader title="Discovery settings" subtitle="Readable schedules and shared limits live here. Source registry and manual discover controls stay in their own tabs to avoid overlap." />
              <div className="mt-4 space-y-4">
                <ScheduleEditor title="Discover run" subtitle="How often the discovery step should scan source definitions." value={settings.discovery?.discoverSchedule} onChange={(value) => updateSettings('discovery', 'discoverSchedule', value)} />
                <ScheduleEditor title="Scan channels/videos" subtitle="How often saved channels should be revisited for new videos." value={settings.discovery?.scanSchedule} onChange={(value) => updateSettings('discovery', 'scanSchedule', value)} />
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <input type="number" value={settings.discovery?.maxConcurrentDownload || 3} onChange={(e) => updateSettings('discovery', 'maxConcurrentDownload', Number(e.target.value) || 1)} className={INPUT_CLASS} placeholder="Max concurrent downloads" />
                  <input type="number" value={settings.discovery?.minViewsFilter || 0} onChange={(e) => updateSettings('discovery', 'minViewsFilter', Number(e.target.value) || 0)} className={INPUT_CLASS} placeholder="Default minimum views" />
                </div>
              </div>
            </section>
            <section className={`${SURFACE_CARD_CLASS} p-5`}>
              <SectionHeader
                title="Production scheduler"
                subtitle="Queue scanning schedule is configured here, while runtime controls help you verify whether the scanner is enabled, currently running, or has backlog waiting in the legacy queue folder."
                actions={<button onClick={triggerQueueScannerNow} className={getActionButtonClass('violet', 'px-3 py-2 text-xs')} disabled={Boolean(busyAction)}>{tr('Scan now', 'Scan now')}</button>}
              />
              <div className="mt-4 space-y-4">
                <ScheduleEditor title="Queue runner" subtitle="How often the background worker should read queued production jobs." value={settings.production?.scheduler} onChange={(value) => updateSettings('production', 'scheduler', value)} />
                <label className={`${CHECKBOX_PANEL_CLASS} flex items-center gap-3`}><input type="checkbox" checked={Boolean(settings.production?.autoPublish)} onChange={(e) => updateSettings('production', 'autoPublish', e.target.checked)} className="h-4 w-4 rounded border-slate-400/70 bg-white/80" />Auto publish after completion</label>
                <select value={settings.production?.defaultPlatform || 'youtube'} onChange={(e) => updateSettings('production', 'defaultPlatform', e.target.value)} className={INPUT_CLASS}><option value="youtube">YouTube</option><option value="facebook">Facebook</option><option value="tiktok">TikTok</option></select>
                <select value={settings.production?.youtubePublishType || 'shorts'} onChange={(e) => updateSettings('production', 'youtubePublishType', e.target.value)} className={INPUT_CLASS}><option value="shorts">YouTube Shorts</option><option value="video">YouTube Video</option></select>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <MetricCard title={tr('Scheduler enabled', 'Scheduler enabled')} value={schedulerRuntime?.scheduleConfig?.enabled ? tr('Yes', 'Yes') : tr('No', 'No')} helper={schedulerRuntime?.scheduleConfig?.scheduleLabel || settings.production?.scheduler?.label || tr('Manual only', 'Manual only')} tone={schedulerRuntime?.scheduleConfig?.enabled ? 'emerald' : 'amber'} />
                  <MetricCard title={tr('Scanner running', 'Scanner running')} value={schedulerRuntime?.isRunning ? tr('Running', 'Running') : tr('Idle', 'Idle')} helper={tr('Legacy queue folder worker state', 'Legacy queue folder worker state')} tone={schedulerRuntime?.isRunning ? 'sky' : 'slate'} />
                  <MetricCard title={tr('Queue folder items', 'Queue folder items')} value={schedulerRuntime?.queueCount || 0} helper={tr('Local media/queue + Drive /Videos/Queue', 'Local media/queue + Drive /Videos/Queue')} tone="violet" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusPill tone={schedulerRuntime?.scheduleConfig?.enabled ? 'emerald' : 'amber'}>{schedulerRuntime?.scheduleConfig?.enabled ? tr('scheduler enabled', 'scheduler enabled') : tr('scheduler disabled', 'scheduler disabled')}</StatusPill>
                  <StatusPill tone={schedulerRuntime?.isRunning ? 'sky' : 'slate'}>{schedulerRuntime?.isRunning ? tr('scanner running', 'scanner running') : tr('scanner idle', 'scanner idle')}</StatusPill>
                  <StatusPill tone="violet">{`${tr('interval', 'interval')} ${schedulerRuntime?.scheduleConfig?.intervalMinutes || settings.production?.scheduler?.intervalMinutes || 0}m`}</StatusPill>
                </div>
                {(schedulerRuntime?.videos || []).length ? (
                  <div className={SUBTLE_PANEL_CLASS}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{tr('Legacy queue folder snapshot', 'Legacy queue folder snapshot')}</p>
                    <div className="mt-3 space-y-2">
                      {schedulerRuntime.videos.slice(0, 5).map((item) => (
                        <div key={`${item.name}-${item.createdAt || ''}`} className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-slate-300">
                          <span className="truncate">{item.name}</span>
                          <span className="shrink-0 text-xs text-slate-500">{formatDate(item.createdAt)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          </section>

          <section className={`${SURFACE_CARD_CLASS} p-5`}>
            <SectionHeader title="Drive template folders" subtitle="Add folders to validate template sources and choose random, weighted, or AI suggested selection." actions={<button onClick={() => updateSettings('production', 'templateSources', [...(settings.production?.templateSources || []), { name: '', folderId: '', folderPath: '', enabled: true, selectionStrategy: 'random', notes: '' }])} className={getActionButtonClass('violet')}><Plus className="h-4 w-4" />Add Folder</button>} />
            <div className="mt-4 space-y-3">
              {(settings.production?.templateSources || []).map((item, index) => (
                <div key={`${item.folderId || 'new'}-${index}`} className={`video-pipeline-template-grid ${SUBTLE_PANEL_CLASS} grid grid-cols-1 gap-3 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_180px_140px_auto]`}>
                  <input value={item.name || ''} onChange={(e) => updateTemplateSource(index, 'name', e.target.value)} className={INPUT_CLASS} placeholder="Folder label" />
                  <input value={item.folderId || ''} onChange={(e) => updateTemplateSource(index, 'folderId', e.target.value)} className={INPUT_CLASS} placeholder="Drive folder ID" />
                  <input value={item.folderPath || ''} onChange={(e) => updateTemplateSource(index, 'folderPath', e.target.value)} className={INPUT_CLASS} placeholder="Folder path hint" />
                  <select value={item.selectionStrategy || 'random'} onChange={(e) => updateTemplateSource(index, 'selectionStrategy', e.target.value)} className={INPUT_CLASS}><option value="random">Random</option><option value="weighted">Weighted</option><option value="ai_suggested">AI suggested</option></select>
                  <button onClick={() => updateSettings('production', 'templateSources', (settings.production?.templateSources || []).filter((_, itemIndex) => itemIndex !== index))} type="button" className={getActionButtonClass('amber')}>Remove</button>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400 2xl:col-span-5">
                    <label className="inline-flex items-center gap-2"><input type="checkbox" checked={item.enabled !== false} onChange={(e) => updateTemplateSource(index, 'enabled', e.target.checked)} className="h-4 w-4 rounded border-slate-400/70 bg-white/80" />Enabled</label>
                    <StatusPill tone={toneFromStatus(item.healthStatus || 'unknown')}>{item.healthStatus || 'unknown'}</StatusPill>
                    <span>{item.lastError || 'Health will refresh on save.'}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </section>
      ) : null}

      <GalleryPicker
        isOpen={Boolean(galleryPickerSlot)}
        onClose={() => setGalleryPickerSlot('')}
        onSelect={(item) => {
          assignManualSelection(galleryPickerSlot, item);
          setGalleryPickerSlot('');
          toast.success(tr('ÄÃ£ chá»n video tá»« gallery.', 'Video selected from gallery.'));
        }}
        assetType="video"
        title={galleryPickerSlot === 'sub' ? tr('Chá»n sub video tá»« gallery', 'Pick sub video from gallery') : tr('Chá»n main video tá»« gallery', 'Pick main video from gallery')}
      />

      <YoutubePublishDialog
        isOpen={Boolean(youtubePublishQueueId)}
        queueId={youtubePublishQueueId}
        videoTitle={youtubePublishJobData?.sourceTitle || 'Video from Pipeline'}
        onClose={closeYoutubePublishDialog}
        onPublish={handleYoutubePublishComplete}
      />
    </VideoPipelineLayout>
  );
}



