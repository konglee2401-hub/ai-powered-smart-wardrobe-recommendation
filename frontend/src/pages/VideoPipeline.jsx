import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
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
  Upload,
  Users,
  Video,
} from 'lucide-react';
import toast from 'react-hot-toast';
import GalleryPicker from '../components/GalleryPicker';
import VideoPipelineLayout from '../components/VideoPipelineLayout';
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
  TEXTAREA_CLASS,
  toneFromStatus,
} from './video-pipeline/theme.jsx';

const SECTIONS = [
  { id: 'overview', label: 'Overview', icon: Sparkles },
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
  videoCriteria: { minViews: 0 },
  channelCriteria: { minSubscribers: 0, minTotalVideos: 0 },
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
    <div className="rounded-[26px] border border-white/10 bg-white/[0.03] p-4">
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        {subtitle ? <p className="mt-1 text-xs text-slate-400">{subtitle}</p> : null}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <label className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-slate-300">
          <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{tr('Bật', 'Enabled')}</span>
          <input
            type="checkbox"
            checked={Boolean(schedule.enabled)}
            onChange={(event) => onChange({ ...schedule, enabled: event.target.checked, mode: event.target.checked ? schedule.mode : 'manual' })}
            className="h-4 w-4 rounded border-slate-600 bg-slate-950"
          />
        </label>
        <label className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-slate-300">
          <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{tr('Chế độ', 'Mode')}</span>
          <select value={schedule.mode} onChange={(event) => onChange({ ...schedule, mode: event.target.value })} className={INPUT_CLASS}>
            <option value="manual">{tr('Chỉ chạy thủ công', 'Manual only')}</option>
            <option value="hourly">{tr('Mỗi X giờ', 'Every X hours')}</option>
            <option value="daily">{tr('Mỗi ngày theo giờ', 'Every day at time')}</option>
          </select>
        </label>
        <div className="rounded-2xl border border-violet-300/14 bg-violet-400/10 px-4 py-3 text-sm text-violet-50">
          <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-100/70">{tr('Tóm tắt', 'Summary')}</span>
          <p>{schedule.label || tr('Chỉ chạy thủ công', 'Manual only')}</p>
        </div>
      </div>

      {schedule.mode === 'hourly' ? (
        <div className="mt-3">
          <label className="text-xs text-slate-400">{tr('Chạy mỗi', 'Run every')}</label>
          <input type="number" min="1" max="24" value={schedule.everyHours || 1} onChange={(event) => onChange({ ...schedule, everyHours: Number(event.target.value) || 1 })} className={`${INPUT_CLASS} mt-2 max-w-[220px]`} />
        </div>
      ) : null}

      {schedule.mode === 'daily' ? (
        <div className="mt-3">
          <label className="text-xs text-slate-400">{tr('Giờ chạy hàng ngày', 'Daily time')}</label>
          <input type="time" value={schedule.dailyTime || '09:00'} onChange={(event) => onChange({ ...schedule, dailyTime: event.target.value })} className={`${INPUT_CLASS} mt-2 max-w-[220px]`} />
        </div>
      ) : null}
    </div>
  );
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
  const [composer, setComposer] = useState(DEFAULT_COMPOSER);
  const [connectionForm, setConnectionForm] = useState(DEFAULT_CONNECTION);
  const [manualSelections, setManualSelections] = useState(DEFAULT_MANUAL_SELECTIONS);
  const [galleryPickerSlot, setGalleryPickerSlot] = useState('');

  const navItems = useMemo(() => {
    const labels = {
      overview: tr('Tổng quan', 'Overview'),
      videos: tr('Video', 'Videos'),
      production: tr('Sản xuất', 'Production'),
      publish: tr('Đăng tải', 'Publish'),
      sources: tr('Nguồn', 'Sources'),
      channels: tr('Kênh', 'Channels'),
      queue: tr('Hàng đợi', 'Queue'),
      settings: tr('Cài đặt', 'Settings'),
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
      title: tr('Bảng điều phối vận hành', 'Operator workflow dashboard'),
      subtitle: tr('Theo dõi toàn bộ luồng từ scraping, đồng bộ Drive, sản xuất cho đến đăng tải.', 'Follow the full workflow from scraping and Drive sync to production and publishing.'),
    },
    videos: {
      title: tr('Kho video đã thu thập', 'Scraped video inventory'),
      subtitle: tr('Xem video đã cào, đồng bộ Drive và đẩy vào sản xuất.', 'Review scraped videos, sync them to Drive, and push them into production.'),
    },
    production: {
      title: tr('Composer sản xuất', 'Production composer'),
      subtitle: tr('Chọn main/sub video, cấu hình mashup, phụ đề, watermark và voiceover trong cùng một luồng.', 'Select main/sub videos and configure mashup, subtitles, watermark, and voiceover in one flow.'),
    },
    publish: {
      title: tr('Kết nối và đăng tải', 'Publishing connections'),
      subtitle: tr('Xác minh kết nối social và thực hiện đăng tải thủ công khi video sẵn sàng.', 'Verify social connections and publish manually when outputs are ready.'),
    },
    sources: {
      title: tr('Registry nguồn scraping', 'Scraping source registry'),
      subtitle: tr('Quản lý source mặc định và source tùy chỉnh lưu trên Mongo.', 'Manage default and custom scraping sources stored in Mongo.'),
    },
    channels: {
      title: tr('Kho channel trong cơ sở dữ liệu', 'Channels in database'),
      subtitle: tr('Tách riêng inventory channel khỏi phần cấu hình source.', 'Keep channel inventory separate from source configuration.'),
    },
    queue: {
      title: tr('Hàng đợi xử lý nền', 'Background queue'),
      subtitle: tr('Theo dõi job xử lý, log và chủ động manual start khi cần.', 'Track processing jobs, logs, and manually start work when needed.'),
    },
    settings: {
      title: tr('Cài đặt pipeline', 'Pipeline settings'),
      subtitle: tr('Thiết lập lịch chạy dạng dễ đọc và quản lý folder template trên Drive.', 'Configure human-readable schedules and manage template folders on Drive.'),
    },
  }[activeSection] || {
    title: tr('Video Pipeline', 'Video Pipeline'),
    subtitle: tr('Luồng thống nhất từ nguồn đến đăng tải.', 'Unified source-to-publish workflow.'),
  }), [activeSection, isVi]);

  const runAction = async (label, task) => {
    setBusyAction(label);
    try {
      return await task();
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message || 'Action failed.');
      return null;
    } finally {
      setBusyAction('');
    }
  };

  const loadDashboard = async () => setDashboard(await videoPipelineApi.getDashboard());
  const loadSources = async () => setSources((await videoPipelineApi.getSources()).items || []);
  const loadChannels = async () => setChannels((await videoPipelineApi.getChannels({ ...channelFilters, limit: 150 })).items || []);
  const loadVideos = async () => setVideos((await videoPipelineApi.getVideos({ ...videoFilters, limit: 150 })).items || []);
  const loadJobs = async () => {
    const result = await videoPipelineApi.getJobs({ status: jobStatusFilter, limit: 150 });
    setJobs(result.items || []);
    setJobStats(result.stats || {});
  };
  const loadConnections = async () => {
    const result = await videoPipelineApi.getConnections();
    setConnections({ accounts: result.accounts || [], stats: result.stats || {} });
  };
  const loadSettings = async () => setSettings((await videoPipelineApi.getSettings()).settings || DEFAULT_SETTINGS);

  const refreshAll = async () => {
    await runAction('refresh', async () => {
      await Promise.allSettled([loadDashboard(), loadSources(), loadChannels(), loadVideos(), loadJobs(), loadConnections(), loadSettings()]);
    });
  };

  useEffect(() => {
    refreshAll().catch((error) => toast.error(error.message));
  }, []);

  useEffect(() => {
    loadChannels().catch((error) => toast.error(`Cannot load channels: ${error.message}`));
  }, [channelFilters.source, channelFilters.status, channelFilters.search]);

  useEffect(() => {
    loadVideos().catch((error) => toast.error(`Cannot load videos: ${error.message}`));
  }, [videoFilters.source, videoFilters.downloadStatus, videoFilters.driveStatus, videoFilters.search]);

  useEffect(() => {
    loadJobs().catch((error) => toast.error(`Cannot load jobs: ${error.message}`));
  }, [jobStatusFilter]);

  const goToSection = (sectionId) => navigate(sectionPath(sectionId));
  const toggleVideoSelection = (videoId) => setSelectedVideoIds((prev) => (prev.includes(videoId) ? prev.filter((item) => item !== videoId) : [...prev, videoId]));
  const resetSourceForm = () => setSourceForm(DEFAULT_SOURCE_FORM);

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
        videoCriteria: { minViews: Number(sourceForm.videoCriteria?.minViews) || 0 },
        channelCriteria: {
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
    videoCriteria: { minViews: item.videoCriteria?.minViews || 0 },
    channelCriteria: {
      minSubscribers: item.channelCriteria?.minSubscribers || 0,
      minTotalVideos: item.channelCriteria?.minTotalVideos || 0,
    },
    isDefault: item.isDefault,
  }));

  const removeSource = async (item) => {
    await runAction('delete-source', async () => {
      const result = await videoPipelineApi.deleteSource(item.id);
      if (!result.success) {
        toast.error(result.error || tr('Không thể xoá nguồn.', 'Cannot delete source.'));
        return;
      }
      toast.success(tr('Đã xoá nguồn.', 'Source deleted.'));
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
      toast.success(tr('Đã upload video thủ công.', 'Manual video uploaded.'));
    });
  };

  const openGalleryPicker = (slot) => setGalleryPickerSlot(slot);
  const clearManualSelection = (slot) => setManualSelections((prev) => ({ ...prev, [slot]: null }));

  const triggerPendingDownloads = async () => {
    await runAction('trigger-downloads', async () => {
      const result = await videoPipelineApi.triggerPendingDownloads(300);
      if (!result.success) {
        toast.error(result.error || tr('Scraper service chưa sẵn sàng.', 'Scraper service unavailable.'));
        return;
      }
      toast.success(result.message || tr('Đã gửi lệnh chạy scraping.', 'Trigger sent.'));
    });
  };

  const uploadPendingVideos = async () => {
    await runAction('upload-pending', async () => {
      const result = await videoPipelineApi.uploadPendingVideos(30);
      toast.success(
        tr(
          `Đã upload ${result.uploaded || 0}, bỏ qua ${result.skipped || 0}, lỗi ${result.failed || 0}.`,
          `Uploaded ${result.uploaded || 0}, skipped ${result.skipped || 0}, failed ${result.failed || 0}.`
        )
      );
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

  const queueSelectedVideos = async () => {
    const hasManualPair = Boolean(manualSelections.main && manualSelections.sub);

    if (!selectedVideoIds.length && !hasManualPair) {
      toast.error(tr('Chọn ít nhất 1 video hoặc cung cấp đủ main/sub video.', 'Select at least one video or provide both main/sub videos.'));
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
          `Đã thêm ${result.totalQueued || 0} job vào hàng đợi.`,
          `Queued ${result.totalQueued || 0} job(s).`
        )
      );
      goToSection('queue');
      await Promise.allSettled([loadVideos(), loadJobs(), loadDashboard()]);
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
      await Promise.allSettled([loadJobs(), loadConnections(), loadDashboard()]);
    });
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
      toast.success(result.message || tr('Đã trigger job thủ công.', 'Job started manually.'));
      await Promise.allSettled([loadJobs(), loadDashboard()]);
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
    });
  };

  const pageActions = (
    <div className="flex flex-wrap gap-2">
      <button onClick={refreshAll} className={getActionButtonClass('sky')} disabled={Boolean(busyAction)}>
        <RefreshCcw className="h-4 w-4" />
        {tr('Làm mới', 'Refresh')}
      </button>
      <button onClick={triggerPendingDownloads} className={getActionButtonClass('amber')} disabled={Boolean(busyAction)}>
        <Download className="h-4 w-4" />
        {tr('Chạy scraping', 'Trigger Downloads')}
      </button>
      <button onClick={uploadPendingVideos} className={getActionButtonClass('emerald')} disabled={Boolean(busyAction)}>
        <Upload className="h-4 w-4" />
        {tr('Upload pending', 'Upload Pending')}
      </button>
      {(activeSection === 'videos' || activeSection === 'production') ? (
        <button onClick={() => goToSection('production')} className={getActionButtonClass('violet')} disabled={!selectedVideoIds.length}>
          <Clapperboard className="h-4 w-4" />
          {tr(`Mở sản xuất (${selectedVideoIds.length})`, `Open Production (${selectedVideoIds.length})`)}
        </button>
      ) : null}
      {activeSection === 'settings' ? (
        <button onClick={saveSettings} className={getActionButtonClass('violet')} disabled={Boolean(busyAction)}>
          <CheckCircle2 className="h-4 w-4" />
          {tr('Lưu cài đặt', 'Save Settings')}
        </button>
      ) : null}
    </div>
  );

  return (
    <VideoPipelineLayout
      title={tr('Video Pipeline', 'Video Pipeline')}
      subtitle={tr('Nguồn -> Drive -> Sản xuất -> Đăng tải', 'Source -> Drive -> Production -> Publish')}
      meta="Manage scraping sources, channel inventory, Drive sync, production queue, and publishing from one operator surface."
      navItems={navItems}
      actions={pageActions}
    >
      <section className={`${SURFACE_CARD_CLASS} p-5`}>
        <SectionHeader title={currentSectionMeta.title} subtitle={currentSectionMeta.subtitle} />
      </section>

      {activeSection === 'overview' ? (
        <section className="space-y-4">
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="Sources" value={dashboard?.metrics?.configuredSources || 0} helper="Configured scraper providers" icon={Link2} tone="violet" />
            <MetricCard title="Channels" value={dashboard?.metrics?.totalChannels || 0} helper="Loaded from Mongo" icon={Users} tone="sky" />
            <MetricCard title="Videos" value={dashboard?.metrics?.totalVideos || 0} helper="Discovered inventory" icon={Video} tone="amber" />
            <MetricCard title="Drive Ready" value={dashboard?.metrics?.driveReadyVideos || 0} helper="Uploaded or synced successfully" icon={HardDrive} tone="emerald" />
          </section>
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <MetricCard title="Queue Jobs" value={dashboard?.metrics?.queueJobs || 0} helper="Production jobs in Mongo" icon={Clapperboard} tone="violet" />
            <MetricCard title="Ready To Publish" value={dashboard?.metrics?.readyToPublish || 0} helper="Jobs waiting for post actions" icon={Send} tone="amber" />
            <MetricCard title="Connections" value={dashboard?.metrics?.connections || 0} helper="Saved social accounts" icon={Users} tone="sky" />
          </section>
        </section>
      ) : null}

      {activeSection === 'sources' ? (
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <section className={`${SURFACE_CARD_CLASS} p-5`}>
            <SectionHeader title={sourceForm.id ? 'Edit source' : 'Add source'} subtitle="Default sources can be edited but not deleted." />
            <form onSubmit={saveSource} className="mt-4 space-y-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <input value={sourceForm.name} onChange={(e) => setSourceForm((prev) => ({ ...prev, name: e.target.value }))} className={INPUT_CLASS} placeholder="Source name" required />
                <input value={sourceForm.provider} onChange={(e) => setSourceForm((prev) => ({ ...prev, provider: e.target.value }))} className={INPUT_CLASS} placeholder="Provider key" required />
                <input value={sourceForm.key} onChange={(e) => setSourceForm((prev) => ({ ...prev, key: e.target.value }))} className={INPUT_CLASS} placeholder="Unique source key" disabled={Boolean(sourceForm.id && sourceForm.isDefault)} />
                <input value={sourceForm.defaultUrl} onChange={(e) => setSourceForm((prev) => ({ ...prev, defaultUrl: e.target.value }))} className={INPUT_CLASS} placeholder="Default source link" />
                <input type="number" value={sourceForm.videoCriteria?.minViews || 0} onChange={(e) => setSourceForm((prev) => ({ ...prev, videoCriteria: { ...prev.videoCriteria, minViews: Number(e.target.value) || 0 } }))} className={INPUT_CLASS} placeholder="Min video views" />
                <input type="number" value={sourceForm.channelCriteria?.minSubscribers || 0} onChange={(e) => setSourceForm((prev) => ({ ...prev, channelCriteria: { ...prev.channelCriteria, minSubscribers: Number(e.target.value) || 0 } }))} className={INPUT_CLASS} placeholder="Min channel subscribers" />
                <input type="number" value={sourceForm.channelCriteria?.minTotalVideos || 0} onChange={(e) => setSourceForm((prev) => ({ ...prev, channelCriteria: { ...prev.channelCriteria, minTotalVideos: Number(e.target.value) || 0 } }))} className={INPUT_CLASS} placeholder="Min channel videos" />
                <input type="number" value={sourceForm.sortOrder || 50} onChange={(e) => setSourceForm((prev) => ({ ...prev, sortOrder: Number(e.target.value) || 50 }))} className={INPUT_CLASS} placeholder="Sort order" />
              </div>
              <textarea value={sourceForm.description} onChange={(e) => setSourceForm((prev) => ({ ...prev, description: e.target.value }))} className={TEXTAREA_CLASS} placeholder="Describe how this source should be used." />
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-slate-300">
                <input type="checkbox" checked={Boolean(sourceForm.enabled)} onChange={(e) => setSourceForm((prev) => ({ ...prev, enabled: e.target.checked }))} className="h-4 w-4 rounded border-slate-600 bg-slate-950" />
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
            <SectionHeader title="Configured sources" subtitle="These settings are stored in Mongo and drive the scraper inputs." />
            <div className="mt-4 space-y-3">
              {sources.map((item) => (
                <div key={item.id} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-white">{item.name}</p>
                        <SourcePill source={item.key} />
                        <StatusPill tone={item.enabled ? 'emerald' : 'amber'}>{item.enabled ? 'enabled' : 'disabled'}</StatusPill>
                      </div>
                      <p className="mt-2 text-xs text-slate-400">{item.defaultUrl || 'No default URL configured'}</p>
                      <p className="mt-2 text-xs text-slate-500">{item.description || 'No description'}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                        <span>Videos: {formatNumber(item.stats?.totalVideos || 0)}</span>
                        <span>Channels: {formatNumber(item.stats?.totalChannels || 0)}</span>
                        <span>Min views: {formatNumber(item.videoCriteria?.minViews || 0)}</span>
                        <span>Min subscribers: {formatNumber(item.channelCriteria?.minSubscribers || 0)}</span>
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
          </section>
          <section className={`${SURFACE_CARD_CLASS} overflow-x-auto`}>
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white/[0.03] text-xs uppercase tracking-[0.14em] text-slate-500"><tr><th className="px-4 py-3">Channel</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Subscribers</th><th className="px-4 py-3">Videos</th><th className="px-4 py-3">Drive Ready</th><th className="px-4 py-3">Last Scanned</th><th className="px-4 py-3">Status</th></tr></thead>
              <tbody>
                {channels.map((item) => (
                  <tr key={item.id} className="border-t border-white/8">
                    <td className="px-4 py-3"><p className="font-medium text-white">{item.name || item.channelId}</p><p className="mt-1 text-xs text-slate-500">{item.channelId}</p></td>
                    <td className="px-4 py-3"><SourcePill source={item.sourceKey || item.platform} /></td>
                    <td className="px-4 py-3 text-slate-200">{formatNumber(item.subscriberCount || 0)}</td>
                    <td className="px-4 py-3 text-slate-200">{formatNumber(item.stats?.totalVideos || 0)}</td>
                    <td className="px-4 py-3 text-slate-200">{formatNumber(item.stats?.driveReadyVideos || 0)}</td>
                    <td className="px-4 py-3 text-slate-400">{formatDate(item.lastScanned)}</td>
                    <td className="px-4 py-3"><StatusPill tone={toneFromStatus(item.isActive ? item.healthStatus || 'active' : 'inactive')}>{item.isActive ? item.healthStatus || 'active' : 'inactive'}</StatusPill></td>
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
          <section className={`${SURFACE_CARD_CLASS} overflow-x-auto`}>
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white/[0.03] text-xs uppercase tracking-[0.14em] text-slate-500"><tr><th className="px-4 py-3">Pick</th><th className="px-4 py-3">Video</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Views</th><th className="px-4 py-3">Download</th><th className="px-4 py-3">Drive</th><th className="px-4 py-3">Actions</th></tr></thead>
              <tbody>
                {videos.map((item) => (
                  <tr key={item.id} className="border-t border-white/8">
                    <td className="px-4 py-3"><input type="checkbox" checked={selectedVideoIds.includes(item.id)} onChange={() => toggleVideoSelection(item.id)} className="h-4 w-4 rounded border-slate-600 bg-slate-950" /></td>
                    <td className="px-4 py-3"><p className="font-medium text-white">{item.title || item.videoId}</p><p className="mt-1 text-xs text-slate-500">{item.channelName || item.videoId}</p></td>
                    <td className="px-4 py-3"><SourcePill source={item.sourceKey} /></td>
                    <td className="px-4 py-3 text-slate-200">{formatNumber(item.views || 0)}</td>
                    <td className="px-4 py-3"><StatusPill tone={toneFromStatus(item.downloadStatus)}>{item.downloadStatus}</StatusPill></td>
                    <td className="px-4 py-3"><StatusPill tone={toneFromStatus(item.driveSync?.status)}>{item.driveSync?.status || 'pending'}</StatusPill></td>
                    <td className="px-4 py-3"><div className="flex flex-wrap gap-2"><button onClick={() => uploadVideo(item.id)} className={getActionButtonClass('emerald', 'px-3 py-2 text-xs')} disabled={Boolean(busyAction)}><Upload className="h-3.5 w-3.5" />Sync</button><button onClick={() => { toggleVideoSelection(item.id); goToSection('production'); }} className={getActionButtonClass('violet', 'px-3 py-2 text-xs')}>Queue</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          {!videos.length ? <EmptyState label="No videos loaded from Mongo yet." /> : null}
        </section>
      ) : null}

      {activeSection === 'production' ? (
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <section className={`${SURFACE_CARD_CLASS} p-5`}>
            <SectionHeader
              title={tr('Cấu hình job sản xuất', 'Compose production job')}
              subtitle={tr('Mashup, phụ đề, watermark và voiceover dùng chung một form để queue nhận đúng một recipe payload.', 'Mashup, subtitle, watermark, and voiceover stay in one form so the queue receives one recipe payload.')}
            />
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <select value={composer.recipe} onChange={(e) => setComposer((prev) => ({ ...prev, recipe: e.target.value }))} className={INPUT_CLASS}><option value="mashup">{tr('Mashup', 'Mashup')}</option><option value="subtitle">{tr('Phụ đề tự động', 'Auto subtitle')}</option><option value="voiceover">{tr('Lồng tiếng', 'Voiceover')}</option></select>
              <select value={composer.platform} onChange={(e) => setComposer((prev) => ({ ...prev, platform: e.target.value }))} className={INPUT_CLASS}><option value="youtube">YouTube</option><option value="facebook">Facebook</option><option value="tiktok">TikTok</option></select>
              <input type="number" value={composer.duration} onChange={(e) => setComposer((prev) => ({ ...prev, duration: Number(e.target.value) || 30 }))} className={INPUT_CLASS} placeholder={tr('Thời lượng (giây)', 'Duration seconds')} />
              <select value={composer.aspectRatio} onChange={(e) => setComposer((prev) => ({ ...prev, aspectRatio: e.target.value }))} className={INPUT_CLASS}><option value="9:16">9:16</option><option value="16:9">16:9</option><option value="1:1">1:1</option></select>
              <select value={composer.layout} onChange={(e) => setComposer((prev) => ({ ...prev, layout: e.target.value }))} className={INPUT_CLASS}><option value="2-3-1-3">{tr('Main 2/3 + sub 1/3', 'Main 2/3 + sub 1/3')}</option><option value="full-screen">{tr('Toàn màn hình', 'Full screen')}</option></select>
              <select value={composer.subtitleMode} onChange={(e) => setComposer((prev) => ({ ...prev, subtitleMode: e.target.value }))} className={INPUT_CLASS}><option value="auto">{tr('Tự động', 'Auto subtitle')}</option><option value="none">{tr('Không dùng', 'No subtitle')}</option></select>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-slate-300"><input type="checkbox" checked={composer.watermarkEnabled} onChange={(e) => setComposer((prev) => ({ ...prev, watermarkEnabled: e.target.checked }))} className="h-4 w-4 rounded border-slate-600 bg-slate-950" />{tr('Watermark', 'Watermark')}</label>
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-slate-300"><input type="checkbox" checked={composer.voiceoverEnabled} onChange={(e) => setComposer((prev) => ({ ...prev, voiceoverEnabled: e.target.checked }))} className="h-4 w-4 rounded border-slate-600 bg-slate-950" />{tr('Lồng tiếng', 'Voiceover')}</label>
              <select value={composer.templateStrategy} onChange={(e) => setComposer((prev) => ({ ...prev, templateStrategy: e.target.value }))} className={INPUT_CLASS}><option value="random">{tr('Ngẫu nhiên', 'Random template')}</option><option value="weighted">{tr('Theo trọng số', 'Weighted template')}</option><option value="ai_suggested">{tr('AI đề xuất', 'AI suggested template')}</option></select>
            </div>
            <div className="mt-4">
              <button onClick={queueSelectedVideos} className={getActionButtonClass('violet')} disabled={(!selectedVideoIds.length && !(manualSelections.main && manualSelections.sub)) || Boolean(busyAction)}>
                <Clapperboard className="h-4 w-4" />
                {tr(
                  `Đưa vào queue (${selectedVideoIds.length || 0} video nguồn)`,
                  `Add to queue (${selectedVideoIds.length || 0} source videos)`
                )}
              </button>
            </div>
          </section>
          <section className={`${SURFACE_CARD_CLASS} p-5`}>
            <SectionHeader
              title={tr('Selected videos', 'Selected videos')}
              subtitle={tr('Hỗ trợ cả upload từ máy và chọn lại từ video gallery. Hai slot main/sub sẽ được ưu tiên khi manual start mashup.', 'Supports both local upload and picking from the video gallery. Main/sub slots are prioritized when manually starting a mashup.')}
            />
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              {['main', 'sub'].map((slot) => {
                const slotCopy = slot === 'main'
                  ? {
                      title: tr('Main video', 'Main video'),
                      helper: tr('Video chính cho bố cục 2/3 màn hình.', 'Primary video used for the 2/3 screen area.'),
                    }
                  : {
                      title: tr('Sub video', 'Sub video'),
                      helper: tr('Video phụ hoặc template cho phần còn lại.', 'Secondary/template video used for the remaining area.'),
                    };
                const selectedItem = manualSelections[slot];

                return (
                  <div key={slot} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{slotCopy.title}</p>
                        <p className="mt-1 text-xs text-slate-400">{slotCopy.helper}</p>
                      </div>
                      {selectedItem ? <StatusPill tone="emerald">{tr('Đã chọn', 'Selected')}</StatusPill> : <StatusPill tone="amber">{tr('Chưa có', 'Missing')}</StatusPill>}
                    </div>
                    <div className="mt-4 rounded-2xl border border-dashed border-white/12 bg-slate-950/40 p-4">
                      {selectedItem ? (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-white">{selectedItem.name || selectedItem.assetId}</p>
                          <p className="text-xs text-slate-500">{selectedItem.assetId || selectedItem.localPath || tr('Nguồn thủ công', 'Manual source')}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">{tr('Chưa có video cho slot này.', 'No video selected for this slot yet.')}</p>
                      )}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <label className={getActionButtonClass('sky', 'cursor-pointer')}>
                        <Upload className="h-4 w-4" />
                        {tr('Upload từ máy', 'Upload from device')}
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
                        {tr('Chọn từ gallery', 'Pick from gallery')}
                      </button>
                      {selectedItem ? (
                        <button type="button" onClick={() => clearManualSelection(slot)} className={getActionButtonClass('amber')}>
                          {tr('Xoá chọn', 'Clear')}
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-5 space-y-3">
              {selectedVideos.map((item) => (
                <div key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
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
            {!selectedVideos.length ? <p className="mt-4 text-sm text-slate-500">{tr('Chưa chọn video nguồn từ tab Video. Bạn vẫn có thể dùng 2 slot upload/pick ở trên.', 'No source videos selected from the Videos tab yet. You can still use the two upload/pick slots above.')}</p> : null}
          </section>
        </section>
      ) : null}

      {activeSection === 'queue' ? (
        <section className="space-y-4">
          <section className={`${SURFACE_CARD_CLASS} p-5`}>
            <SectionHeader title={tr('Queue status', 'Queue status')} subtitle={tr('Jobs are stored in Mongo. The system auto-retries transient failures, marks manual-review cases clearly, and still keeps manual trigger controls available.', 'Jobs are stored in Mongo. The system auto-retries transient failures, marks manual-review cases clearly, and still keeps manual trigger controls available.')} />
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
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
              <MetricCard title={tr('Pending', 'Pending')} value={jobStats?.byStatus?.pending || 0} helper={tr('Awaiting worker pickup', 'Awaiting worker pickup')} tone="amber" />
              <MetricCard title={tr('Auto retry', 'Auto retry')} value={jobStats?.byExecutionState?.['auto-retry-pending'] || 0} helper={tr('Transient failures queued to retry', 'Transient failures queued to retry')} tone="amber" />
              <MetricCard title={tr('Manual review', 'Manual review')} value={jobStats?.byExecutionState?.['manual-review'] || 0} helper={tr('Needs operator-triggered retry', 'Needs operator-triggered retry')} tone="violet" />
              <MetricCard title={tr('Processing', 'Processing')} value={jobStats?.byStatus?.processing || 0} helper={tr('Currently running', 'Currently running')} tone="sky" />
              <MetricCard title={tr('Ready', 'Ready')} value={jobStats?.byStatus?.ready || 0} helper={tr('Can be published now', 'Can be published now')} tone="emerald" />
              <MetricCard title={tr('Failed', 'Failed')} value={jobStats?.byStatus?.failed || 0} helper={tr('Exceeded retries or needs intervention', 'Exceeded retries or needs intervention')} tone="violet" />
            </div>
          </section>
          {jobs.map((job) => (
            <section key={job.queueId} className={`${SURFACE_CARD_CLASS} p-5`}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">{job.sourceTitle || job.queueId}</p>
                  <p className="mt-1 text-xs text-slate-500">{job.queueId}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <SourcePill source={job.sourcePlatform || job.platform} />
                    <StatusPill tone={toneFromStatus(job.status)}>{job.status}</StatusPill>
                    <StatusPill tone={queueExecutionTone(job)}>{queueExecutionLabel(job, tr)}</StatusPill>
                    <StatusPill tone="sky">{job.contentType}</StatusPill>
                    {job.errorCount ? <StatusPill tone="amber">{tr('Retry', 'Retry')} {job.errorCount}/{job.maxRetries || 0}</StatusPill> : null}
                  </div>
                  {job.queueControl?.lastFailureMessage ? <p className="mt-3 max-w-3xl text-xs text-rose-200/80">{job.queueControl.lastFailureMessage}</p> : null}
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
                <div className="mt-4 space-y-2 rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-xs text-slate-300">
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
          {!jobs.length ? <EmptyState label={tr('No jobs in the unified queue yet.', 'No jobs in the unified queue yet.')} /> : null}
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
                <div key={account.accountId} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="font-medium text-white">{account.displayName}</p>
                      <p className="mt-1 text-xs text-slate-500">{account.platform}:{account.username}</p>
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
              <SectionHeader title="Discovery settings" subtitle="Readable schedules replace raw cron editing for operators." />
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
              <SectionHeader title="Production scheduler" subtitle="Queue scanning is configured in readable language but still stored with machine values." />
              <div className="mt-4 space-y-4">
                <ScheduleEditor title="Queue runner" subtitle="How often the background worker should read queued production jobs." value={settings.production?.scheduler} onChange={(value) => updateSettings('production', 'scheduler', value)} />
                <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-slate-300"><input type="checkbox" checked={Boolean(settings.production?.autoPublish)} onChange={(e) => updateSettings('production', 'autoPublish', e.target.checked)} className="h-4 w-4 rounded border-slate-600 bg-slate-950" />Auto publish after completion</label>
                <select value={settings.production?.defaultPlatform || 'youtube'} onChange={(e) => updateSettings('production', 'defaultPlatform', e.target.value)} className={INPUT_CLASS}><option value="youtube">YouTube</option><option value="facebook">Facebook</option><option value="tiktok">TikTok</option></select>
                <select value={settings.production?.youtubePublishType || 'shorts'} onChange={(e) => updateSettings('production', 'youtubePublishType', e.target.value)} className={INPUT_CLASS}><option value="shorts">YouTube Shorts</option><option value="video">YouTube Video</option></select>
              </div>
            </section>
          </section>

          <section className={`${SURFACE_CARD_CLASS} p-5`}>
            <SectionHeader title="Drive template folders" subtitle="Add folders to validate template sources and choose random, weighted, or AI suggested selection." actions={<button onClick={() => updateSettings('production', 'templateSources', [...(settings.production?.templateSources || []), { name: '', folderId: '', folderPath: '', enabled: true, selectionStrategy: 'random', notes: '' }])} className={getActionButtonClass('violet')}><Plus className="h-4 w-4" />Add Folder</button>} />
            <div className="mt-4 space-y-3">
              {(settings.production?.templateSources || []).map((item, index) => (
                <div key={`${item.folderId || 'new'}-${index}`} className="grid grid-cols-1 gap-3 rounded-[24px] border border-white/10 bg-white/[0.03] p-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_180px_140px_auto]">
                  <input value={item.name || ''} onChange={(e) => updateTemplateSource(index, 'name', e.target.value)} className={INPUT_CLASS} placeholder="Folder label" />
                  <input value={item.folderId || ''} onChange={(e) => updateTemplateSource(index, 'folderId', e.target.value)} className={INPUT_CLASS} placeholder="Drive folder ID" />
                  <input value={item.folderPath || ''} onChange={(e) => updateTemplateSource(index, 'folderPath', e.target.value)} className={INPUT_CLASS} placeholder="Folder path hint" />
                  <select value={item.selectionStrategy || 'random'} onChange={(e) => updateTemplateSource(index, 'selectionStrategy', e.target.value)} className={INPUT_CLASS}><option value="random">Random</option><option value="weighted">Weighted</option><option value="ai_suggested">AI suggested</option></select>
                  <button onClick={() => updateSettings('production', 'templateSources', (settings.production?.templateSources || []).filter((_, itemIndex) => itemIndex !== index))} type="button" className={getActionButtonClass('amber')}>Remove</button>
                  <div className="xl:col-span-5 flex flex-wrap items-center gap-3 text-sm text-slate-400">
                    <label className="inline-flex items-center gap-2"><input type="checkbox" checked={item.enabled !== false} onChange={(e) => updateTemplateSource(index, 'enabled', e.target.checked)} className="h-4 w-4 rounded border-slate-600 bg-slate-950" />Enabled</label>
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
          toast.success(tr('Đã chọn video từ gallery.', 'Video selected from gallery.'));
        }}
        assetType="video"
        title={galleryPickerSlot === 'sub' ? tr('Chọn sub video từ gallery', 'Pick sub video from gallery') : tr('Chọn main video từ gallery', 'Pick main video from gallery')}
      />
    </VideoPipelineLayout>
  );
}
