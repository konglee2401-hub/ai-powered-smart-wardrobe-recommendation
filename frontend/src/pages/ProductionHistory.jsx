import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Clapperboard,
  Clock,
  Download,
  Eye,
  Layers3,
  Link2,
  Pencil,
  RefreshCcw,
  Send,
  Settings2,
  Sparkles,
  Trash2,
  Users,
  Video,
} from 'lucide-react';
import toast from 'react-hot-toast';
import VideoPipelineLayout from '../components/VideoPipelineLayout';
import GalleryPicker from '../components/GalleryPicker';
import ModalPortal from '../components/ModalPortal';
import videoPipelineApi from '../services/videoPipelineApi';
import {
  formatDate,
  getActionButtonClass,
  INPUT_CLASS,
  SectionHeader,
  SourcePill,
  StatusPill,
  SUBTLE_PANEL_CLASS,
  SURFACE_CARD_CLASS,
  toneFromStatus,
} from './video-pipeline/theme.jsx';

const HISTORY_LIMIT = 20;

const NAV_SECTIONS = [
  { id: 'overview', label: 'Overview', icon: Sparkles, to: '/video-pipeline' },
  { id: 'scraping', label: 'Scraping', icon: Download, to: '/video-pipeline/scraping' },
  { id: 'videos', label: 'Videos', icon: Video, to: '/video-pipeline/videos' },
  { id: 'production', label: 'Production', icon: Clapperboard, to: '/video-pipeline/production' },
  { id: 'publish', label: 'Publish', icon: Send, to: '/video-pipeline/publish' },
  { id: 'sources', label: 'Sources', icon: Link2, to: '/video-pipeline/sources' },
  { id: 'channels', label: 'Channels', icon: Users, to: '/video-pipeline/channels' },
  { id: 'queue', label: 'Queue', icon: Layers3, to: '/video-pipeline/queue' },
  { id: 'settings', label: 'Settings', icon: Settings2, to: '/video-pipeline/settings' },
  { id: 'history', label: 'Production history', icon: Clock, to: '/video-pipeline/history' },
];

const DEFAULT_TEMPLATES = [
  { value: 'reaction', label: 'Reaction', groupKey: 'reaction' },
  { value: 'grid', label: 'Grid', groupKey: 'grid' },
  { value: 'highlight', label: 'Highlight', groupKey: 'highlight' },
  { value: 'meme', label: 'Meme', groupKey: 'meme' },
];

const DEFAULT_REMASHUP_CONFIG = {
  templateStrategy: 'random',
  templateName: '',
  manualSubVideo: null,
  subtitleMode: 'auto',
  capcutAutoCaption: true,
  watermarkEnabled: true,
  voiceoverEnabled: false,
  startImmediately: true,
};

const buildTemplateOptions = (templates = []) =>
  templates.map((item) => ({
    value: item.slug || item.code || item.name,
    label: item.name || item.slug || item.code,
    groupKey: item.groupKey || 'reaction',
  }));

const getSubSelectionLabel = (mashupLog) => {
  const selection = mashupLog?.selection || {};
  const subVideo = mashupLog?.subVideo || {};
  if (selection?.method === 'auto') return 'Auto';
  if (subVideo?.selectionMethod === 'manual') return 'Manual';
  return subVideo?.selectionMethod || 'Auto';
};

const normalizeText = (value = '') => String(value || '').trim();
const parseListInput = (value = '') => Array.from(new Set(
  String(value || '')
    .split(/[,#\n]+| {2,}/g)
    .map((item) => item.trim())
    .filter(Boolean)
));

const getSubSummary = (mashupLog = {}) => {
  const subVideo = mashupLog.subVideo || {};
  return subVideo.name || subVideo.assetId || 'Sub video';
};

const resolveOutputPreview = (item = {}) => {
  if (!item?.queueId) return '';
  const assetId = item?.generatedAsset?.assetId
    || item?.videoConfig?.generatedAsset?.assetId
    || `video_pipeline_generated_${item.queueId}`;
  return `/api/assets/proxy/${assetId}`;
};

export default function ProductionHistory() {
  const { t } = useTranslation('productionHistory');

  const [history, setHistory] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: HISTORY_LIMIT, total: 0, pages: 1 });
  const [loading, setLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [remashupOpen, setRemashupOpen] = useState(false);
  const [remashupItem, setRemashupItem] = useState(null);
  const [remashupConfig, setRemashupConfig] = useState(DEFAULT_REMASHUP_CONFIG);
  const [galleryPickerOpen, setGalleryPickerOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishAccounts, setPublishAccounts] = useState([]);
  const [selectedPublishAccounts, setSelectedPublishAccounts] = useState([]);
  const [publishConfig, setPublishConfig] = useState({ title: '', description: '', tags: '', hashtags: '' });
  const [busyAction, setBusyAction] = useState('');
  const [previewItem, setPreviewItem] = useState(null);
  const [selectedQueueIds, setSelectedQueueIds] = useState([]);
  const [publishTargets, setPublishTargets] = useState([]);

  const navItems = useMemo(() => {
    const labels = {
      history: t('navigation.history'),
      overview: t('navigation.overview'),
      scraping: t('navigation.scraping'),
      videos: t('navigation.videos'),
      production: t('navigation.production'),
      queue: t('navigation.queue'),
      settings: t('navigation.settings'),
    };

    const shortLabels = {
      history: t('navigation.historyShort'),
      overview: t('navigation.overviewShort'),
      scraping: t('navigation.scrapingShort'),
      videos: t('navigation.videosShort'),
      production: t('navigation.productionShort'),
      queue: t('navigation.queueShort'),
      settings: t('navigation.settingsShort'),
    };

    return NAV_SECTIONS.map((item) => ({
      ...item,
      label: labels[item.id] || item.label,
      shortLabel: shortLabels[item.id] || item.label?.slice(0, 3),
    }));
  }, [t]);

  const templateOptions = useMemo(() => {
    const options = buildTemplateOptions(templates);
    return options.length ? options : DEFAULT_TEMPLATES;
  }, [templates]);

  const loadHistory = async (page = pagination.page) => {
    setLoading(true);
    try {
      const response = await videoPipelineApi.getProductionHistory({ page, limit: HISTORY_LIMIT });
      setHistory(response.items || []);
      setPagination({
        page: response.page || page,
        limit: response.limit || HISTORY_LIMIT,
        total: response.total || 0,
        pages: response.pages || 1,
      });
    } catch (error) {
      toast.error(error.message || 'Cannot load production history');
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await videoPipelineApi.getTemplates();
      setTemplates(response.items || []);
    } catch (error) {
      toast.error(error.message || 'Cannot load templates');
    }
  };

  const openDetails = async (queueId) => {
    setBusyAction(queueId);
    try {
      const response = await videoPipelineApi.getProductionHistoryItem(queueId);
      setDetailItem(response.item || null);
      setDetailOpen(true);
    } catch (error) {
      toast.error(error.message || 'Cannot load job details');
    } finally {
      setBusyAction('');
    }
  };

  const openRemashup = (item) => {
    const productionConfig = item?.videoConfig?.productionConfig || {};
    const mashupLog = item?.mashupLog || {};
    const templateName = mashupLog?.templateName || productionConfig?.templateName || item?.templateName || '';
    const templateStrategy = mashupLog?.templateStrategy || productionConfig?.templateStrategy || DEFAULT_REMASHUP_CONFIG.templateStrategy;

    setRemashupItem(item);
    setRemashupConfig({
      ...DEFAULT_REMASHUP_CONFIG,
      templateName,
      templateStrategy,
      subtitleMode: mashupLog?.subtitleMode || productionConfig?.subtitleMode || DEFAULT_REMASHUP_CONFIG.subtitleMode,
      capcutAutoCaption: mashupLog?.capcutAutoCaption ?? productionConfig?.capcutAutoCaption ?? DEFAULT_REMASHUP_CONFIG.capcutAutoCaption,
      watermarkEnabled: mashupLog?.watermarkEnabled ?? productionConfig?.watermarkEnabled ?? DEFAULT_REMASHUP_CONFIG.watermarkEnabled,
      voiceoverEnabled: mashupLog?.voiceoverEnabled ?? productionConfig?.voiceoverEnabled ?? DEFAULT_REMASHUP_CONFIG.voiceoverEnabled,
    });
    setRemashupOpen(true);
  };

  const runRemashup = async () => {
    if (!remashupItem) return;
    if (remashupConfig.templateStrategy === 'specific' && !remashupConfig.templateName) {
      toast.error(t('messages.selectTemplate'));
      return;
    }
    setBusyAction(remashupItem.queueId);
    try {
      await videoPipelineApi.remashupJob(remashupItem.queueId, {
        templateStrategy: remashupConfig.templateStrategy,
        templateName: remashupConfig.templateStrategy === 'specific' ? remashupConfig.templateName || undefined : undefined,
        manualSubVideo: remashupConfig.manualSubVideo || null,
        subtitleMode: remashupConfig.subtitleMode,
        capcutAutoCaption: remashupConfig.subtitleMode === 'none' ? false : remashupConfig.capcutAutoCaption,
        watermarkEnabled: remashupConfig.watermarkEnabled,
        voiceoverEnabled: remashupConfig.voiceoverEnabled,
        startImmediately: remashupConfig.startImmediately,
      });
      toast.success(t('messages.remashupStarted'));
      setRemashupOpen(false);
      setRemashupItem(null);
      setRemashupConfig(DEFAULT_REMASHUP_CONFIG);
      loadHistory();
    } catch (error) {
      toast.error(error.message || 'Cannot re-mashup');
    } finally {
      setBusyAction('');
    }
  };

  const deleteItem = async (queueId) => {
    if (!window.confirm(t('messages.deleted'))) return;
    setBusyAction(queueId);
    try {
      await videoPipelineApi.deleteProductionHistoryItem(queueId);
      toast.success(t('messages.deleted'));
      loadHistory();
    } catch (error) {
      toast.error(error.message || 'Cannot delete history item');
    } finally {
      setBusyAction('');
    }
  };

  const openPublishTargets = async (items) => {
    if (!items?.length) return;
    setBusyAction(items[0].queueId || 'publish');
    try {
      const response = await videoPipelineApi.getPublishAccounts();
      setPublishAccounts(response.accounts || []);
      setSelectedPublishAccounts([]);
      const primary = items[0];
      const metadata = primary?.publishMetadata || primary?.metadata?.publishMetadata || primary?.videoConfig?.publishMetadata || {};
      setPublishConfig({
        title: metadata?.title || primary?.sourceTitle || '',
        description: metadata?.description || '',
        tags: (metadata?.tags || []).join(', '),
        hashtags: (metadata?.hashtags || []).join(' '),
      });
      setRemashupItem(primary);
      setPublishTargets(items);
      setPublishOpen(true);
    } catch (error) {
      toast.error(error.message || 'Cannot load accounts');
    } finally {
      setBusyAction('');
    }
  };

  const openPublish = async (item) => {
    await openPublishTargets([item]);
  };

  const openPublishSelection = async () => {
    const selected = history.filter((item) => selectedQueueIds.includes(item.queueId));
    const readyItems = selected.filter((item) => item.status === 'ready');
    if (!readyItems.length) {
      toast.error(t('messages.selectReadyVideos'));
      return;
    }
    await openPublishTargets(readyItems);
  };

  const runRemashupSelection = async () => {
    const selected = history.filter((item) => selectedQueueIds.includes(item.queueId));
    if (!selected.length) {
      toast.error(t('messages.selectAtLeastOne'));
      return;
    }
    setBusyAction('remashup-selection');
    try {
      await Promise.all(
        selected.map((item) =>
          videoPipelineApi.remashupJob(item.queueId, {
            templateName: undefined,
            manualSubVideo: null,
            startImmediately: true,
          })
        )
      );
      toast.success(t('messages.remashupStarted'));
      setSelectedQueueIds([]);
      loadHistory();
    } catch (error) {
      toast.error(error.message || 'Cannot re-mashup');
    } finally {
      setBusyAction('');
    }
  };

  const runPublish = async () => {
    if (!publishTargets.length) return;
    if (!selectedPublishAccounts.length) {
      toast.error(t('messages.selectAccounts'));
      return;
    }
    setBusyAction(publishTargets[0].queueId || 'publish');
    try {
      const title = normalizeText(publishConfig.title);
      const description = normalizeText(publishConfig.description);
      const tags = publishConfig.tags
        .split(',')
        .map((item) => normalizeText(item))
        .filter(Boolean);
      const hashtags = publishConfig.hashtags
        .split(' ')
        .map((item) => normalizeText(item))
        .filter(Boolean);
      const accountIds = selectedPublishAccounts;
      const videoMetadata = { title, description, tags, hashtags };
      const publishResults = [];

      for (const target of publishTargets) {
        const result = await videoPipelineApi.publishToYoutubeAccounts(target.queueId, {
          accountIds,
          videoMetadata,
        });
        publishResults.push({ queueId: target.queueId, result });
      }

      const successful = publishResults.filter((item) => item.result?.success).length;
      const failed = publishResults.length - successful;

      if (successful) {
        setHistory((prev) => prev.map((item) => {
          const matched = publishResults.find((entry) => entry.queueId === item.queueId && entry.result?.success);
          return matched ? { ...item, status: 'uploaded' } : item;
        }));
        toast.success(tr(`�� publish ${successful}/${publishResults.length}.`, `Published ${successful}/${publishResults.length}.`));
      }

      if (failed) {
        toast.error(tr(`C� ${failed} publish th?t b?i.`, `${failed} publish failed.`));
      }
      setPublishOpen(false);
      setPublishTargets([]);
      setSelectedQueueIds([]);
      setRemashupItem(null);
      loadHistory();
    } catch (error) {
      toast.error(error.message || 'Cannot publish');
    } finally {
      setBusyAction('');
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    loadHistory(pagination.page);
  }, [pagination.page]);

  useEffect(() => {
    setSelectedQueueIds((prev) => prev.filter((id) => history.some((item) => item.queueId === id)));
  }, [history]);

  const selectableQueueIds = useMemo(() => history.map((item) => item.queueId).filter(Boolean), [history]);
  const allSelected = selectableQueueIds.length > 0 && selectedQueueIds.length === selectableQueueIds.length;
  const publishableAccounts = useMemo(
    () => (publishAccounts || []).filter((account) => account.isActive && account.isVerified),
    [publishAccounts]
  );
  const toggleSelectQueueId = (queueId) => {
    setSelectedQueueIds((prev) =>
      prev.includes(queueId) ? prev.filter((id) => id != queueId) : [...prev, queueId]
    );
  };
  const toggleSelectAll = () => {
    setSelectedQueueIds((prev) => (prev.length === selectableQueueIds.length ? [] : selectableQueueIds));
  };

  return (

    <VideoPipelineLayout
      title={t('pageTitle')}
      subtitle={t('pageSubtitle')}
      navItems={navItems}
      compactNav
      actions={(
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => loadHistory(pagination.page)} className={getActionButtonClass('sky', 'px-3 py-2 text-xs')} disabled={loading}>
            <RefreshCcw className="h-4 w-4" />
            {t('buttons.refresh')}
          </button>
          <Link to="/video-pipeline/production" className={getActionButtonClass('slate', 'px-3 py-2 text-xs')}>
            {t('buttons.backToProduction')}
          </Link>
        </div>
      )}
    >
      <section className={`${SURFACE_CARD_CLASS} p-5`}>
        <SectionHeader
          title={t('labels.list')}
          subtitle={t('labels.listSubtitle')}
          actions={(
            <div className="flex flex-wrap items-center justify-end gap-2 text-xs text-slate-400">
              <span>{`${pagination.total || 0} ${t('labels.items')}`}</span>
              <StatusPill tone="sky">{`Page ${pagination.page}/${pagination.pages}`}</StatusPill>
              {selectedQueueIds.length ? (
                <StatusPill tone="indigo">{`${selectedQueueIds.length} ${t('labels.selected')}`}</StatusPill>
              ) : null}
              <button
                type="button"
                className={getActionButtonClass('slate', 'px-3 py-2 text-xs')}
                onClick={runRemashupSelection}
                disabled={!selectedQueueIds.length || busyAction === 'remashup-selection'}
              >
                {t('buttons.remashupSelected')}
              </button>
              <button
                type="button"
                className={getActionButtonClass('sky', 'px-3 py-2 text-xs')}
                onClick={openPublishSelection}
                disabled={!selectedQueueIds.length}
              >
                {t('buttons.publishSelected')}
              </button>
            </div>
          )}
        />
        <div className="mt-4 space-y-3">
          <div className={`${SURFACE_CARD_CLASS} p-1`}>
            <div className="overflow-x-auto">
              <table className="min-w-[1320px] text-left text-sm">
                <thead className="border-b border-white/10 text-xs uppercase tracking-[0.18em] text-slate-400">
                  <tr>
                    <th className="px-4 py-3 whitespace-nowrap">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-white/20 bg-white/5 text-sky-400 focus:ring-sky-400/40"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        aria-label={t('messages.selectAllCheckbox')}
                      />
                    </th>
                    <th className="px-4 py-3 whitespace-nowrap">{t('tableHeaders.output')}</th>
                  <th className="px-4 py-3 whitespace-nowrap">{t('tableHeaders.main')}</th>
                  <th className="px-4 py-3 whitespace-nowrap">{t('tableHeaders.sub')}</th>
                  <th className="px-4 py-3 whitespace-nowrap">{t('tableHeaders.template')}</th>
                  <th className="px-4 py-3 whitespace-nowrap">{t('tableHeaders.subtitle')}</th>
                  <th className="px-4 py-3 whitespace-nowrap">{t('tableHeaders.status')}</th>
                  <th className="px-4 py-3 whitespace-nowrap">{t('tableHeaders.completed')}</th>
                  <th className="px-4 py-3 whitespace-nowrap">{t('tableHeaders.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr key={item.queueId} className="border-b border-white/5">
                      <td className="px-4 py-3 align-top">
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 rounded border-white/20 bg-white/5 text-sky-400 focus:ring-sky-400/40"
                          checked={selectedQueueIds.includes(item.queueId)}
                          onChange={() => toggleSelectQueueId(item.queueId)}
                          aria-label={t('messages.selectCheckbox')}
                        />
                      </td>
                      <td className="px-4 py-3 align-top">
                      <div className="flex w-[140px] flex-col gap-2">
                        <div className="h-16 w-24 overflow-hidden rounded-xl border border-white/10 bg-white/5">
                          {resolveOutputPreview(item) ? (
                            <video
                              src={resolveOutputPreview(item)}
                              className="h-full w-full object-cover"
                              muted
                              playsInline
                              preload="metadata"
                            />
                          ) : null}
                        </div>
                        <button onClick={() => setPreviewItem(item)} className={getActionButtonClass('sky', 'px-2 py-1 text-[10px]')} disabled={busyAction === item.queueId}>
                          <Eye className="h-3 w-3" />
                          {t('buttons.preview')}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex w-[160px] items-start gap-3">
                        {item.mainThumbnail ? (
                          <img src={item.mainThumbnail} alt={item.sourceTitle || 'main'} className="h-12 w-12 rounded-xl object-cover" />
                        ) : (
                          <div className="h-12 w-12 rounded-xl border border-white/10 bg-white/5" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white leading-5 line-clamp-2">{normalizeText(item.sourceTitle || item.queueId)}</p>
                          <div className="mt-1 flex flex-wrap gap-2">
                            <SourcePill source={item.sourcePlatform || 'source'} />
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex w-[140px] items-start gap-3">
                        {item.subThumbnail ? (
                          <img src={item.subThumbnail} alt={getSubSummary(item.mashupLog)} className="h-12 w-12 rounded-xl object-cover" />
                        ) : (
                          <div className="h-12 w-12 rounded-xl border border-white/10 bg-white/5" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white leading-5 line-clamp-2">{normalizeText(getSubSummary(item.mashupLog))}</p>
                          <p className="mt-1 text-xs text-slate-500">{getSubSelectionLabel(item.mashupLog)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="text-sm font-semibold text-white">{item.templateName || 'reaction'}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.templateGroup || 'reaction'}</p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="text-xs font-semibold text-white">{item.mashupLog?.subtitleMode || item.videoConfig?.productionConfig?.subtitleMode || 'none'}</p>
                      <p className="mt-1 text-xs text-slate-500 leading-5 line-clamp-2">
                        {normalizeText(item.mashupLog?.subtitleText || item.videoConfig?.productionConfig?.subtitleText || item.videoConfig?.productionConfig?.subtitleContext || '') || t('messages.noHistory')}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-wrap gap-2">
                        <StatusPill tone={toneFromStatus(item.status)}>{item.status}</StatusPill>
                        <StatusPill tone={toneFromStatus(item.completedDriveSync?.status || 'pending')}>{item.completedDriveSync?.status || 'pending-drive'}</StatusPill>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-slate-400 whitespace-nowrap">
                      {formatDate(item.completedAt || item.updatedAt || item.createdAt)}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-wrap gap-2 whitespace-nowrap">
                        <button onClick={() => openDetails(item.queueId)} className={getActionButtonClass('sky', 'px-3 py-2 text-xs')} disabled={busyAction === item.queueId}>
                          <Eye className="h-4 w-4" />
                          {t('buttons.details')}
                        </button>
                        <button onClick={() => openRemashup(item)} className={getActionButtonClass('violet', 'px-3 py-2 text-xs')} disabled={busyAction === item.queueId}>
                          <Pencil className="h-4 w-4" />
                          {t('buttons.remashup')}
                        </button>
                        <button onClick={() => openPublish(item)} className={getActionButtonClass('emerald', 'px-3 py-2 text-xs')} disabled={busyAction === item.queueId}>
                          <Send className="h-4 w-4" />
                          {t('buttons.publish')}
                        </button>
                        <button onClick={() => deleteItem(item.queueId)} className={getActionButtonClass('amber', 'px-3 py-2 text-xs')} disabled={busyAction === item.queueId}>
                          <Trash2 className="h-4 w-4" />
                          {t('buttons.delete')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!history.length ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-sm text-slate-500">
                      {t('messages.noHistory')}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              {t('labels.morePages')}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                className={getActionButtonClass('slate', 'px-3 py-2 text-xs')}
                disabled={pagination.page <= 1}
              >
                {t('buttons.prev')}
              </button>
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: Math.min(prev.pages || 1, prev.page + 1) }))}
                className={getActionButtonClass('slate', 'px-3 py-2 text-xs')}
                disabled={pagination.page >= pagination.pages}
              >
                {t('buttons.next')}
              </button>
            </div>
          </div>
        </div>
      </section>

      {previewItem ? (
        <ModalPortal>
          <div className="fixed inset-0 app-layer-modal video-pipeline-modal-light flex items-center justify-center bg-slate-100/70 p-4 backdrop-blur-sm">
            <div className={`${SURFACE_CARD_CLASS} w-full max-w-3xl max-h-[80vh] overflow-hidden p-5`}>
              <SectionHeader
                title={t('modals.previewTitle')}
                subtitle={previewItem.queueId}
                actions={(
                  <button onClick={() => setPreviewItem(null)} className={getActionButtonClass('slate', 'px-3 py-2 text-xs')}>
                    {t('buttons.close')}
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
                  {t('modals.openDriveOutput')}
                </a>
              ) : null}
            </div>
          </div>
        </ModalPortal>
      ) : null}

      {detailOpen && detailItem ? (
        <ModalPortal>
          <div className="fixed inset-0 app-layer-modal video-pipeline-modal-light flex items-center justify-center bg-slate-100/70 p-4">
            <div className={`${SURFACE_CARD_CLASS} max-h-[90vh] w-full max-w-5xl overflow-y-auto p-6`}>
              <SectionHeader
                title={detailItem.sourceTitle || detailItem.queueId}
                subtitle={detailItem.queueId}
                actions={(
                  <button onClick={() => setDetailOpen(false)} className={getActionButtonClass('slate', 'px-3 py-2 text-xs')}>
                    {t('buttons.close')}
                  </button>
                )}
              />
              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className={SUBTLE_PANEL_CLASS}>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{t('labels.mainVideo')}</p>
                  <div className="mt-3 flex items-start gap-3">
                    {detailItem.mainThumbnail ? (
                      <img src={detailItem.mainThumbnail} alt="main" className="h-20 w-20 rounded-2xl object-cover" />
                    ) : (
                      <div className="h-20 w-20 rounded-2xl border border-white/10 bg-white/5" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">{detailItem.videoConfig?.sourceTitle || detailItem.sourceTitle}</p>
                      <p className="mt-1 text-xs text-slate-500">{detailItem.videoConfig?.sourceUrl || ''}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <SourcePill source={detailItem.sourcePlatform || detailItem.platform} />
                        <StatusPill tone={toneFromStatus(detailItem.status)}>{detailItem.status}</StatusPill>
                      </div>
                    </div>
                  </div>
                </div>
                <div className={SUBTLE_PANEL_CLASS}>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{t('labels.subVideo')}</p>
                  <div className="mt-3 flex items-start gap-3">
                    {detailItem.subThumbnail ? (
                      <img src={detailItem.subThumbnail} alt="sub" className="h-20 w-20 rounded-2xl object-cover" />
                    ) : (
                      <div className="h-20 w-20 rounded-2xl border border-white/10 bg-white/5" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">{getSubSummary(detailItem.mashupLog)}</p>
                      <p className="mt-1 text-xs text-slate-500">{detailItem.mashupLog?.subVideo?.sourceKey || ''}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <StatusPill tone="sky">{getSubSelectionLabel(detailItem.mashupLog)}</StatusPill>
                        {detailItem.mashupLog?.subVideo?.theme ? <StatusPill tone="violet">{detailItem.mashupLog.subVideo.theme}</StatusPill> : null}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className={SUBTLE_PANEL_CLASS}>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{t('labels.templateLabel')}</p>
                  <div className="mt-3 space-y-2 text-sm text-slate-200">
                    <p>{t('labels.template')} <span className="font-semibold text-white">{detailItem.mashupLog?.templateName || detailItem.videoConfig?.productionConfig?.templateName || 'reaction'}</span></p>
                    <p>{t('labels.group')} <span className="text-slate-300">{detailItem.mashupLog?.templateGroup || 'reaction'}</span></p>
                    <p>{t('labels.layout')} <span className="text-slate-300">{detailItem.mashupLog?.layout || detailItem.videoConfig?.productionConfig?.layout || '2-3-1-3'}</span></p>
                    <p>{t('labels.duration')} <span className="text-slate-300">{detailItem.mashupLog?.duration || detailItem.videoConfig?.productionConfig?.duration || 30}s</span></p>
                    <p>{t('labels.subtitleMode')} <span className="text-slate-300">{detailItem.mashupLog?.subtitleMode || detailItem.videoConfig?.productionConfig?.subtitleMode || 'none'}</span></p>
                    <p>{t('labels.subtitleText')} <span className="text-slate-300">{normalizeText(detailItem.mashupLog?.subtitleText || detailItem.videoConfig?.productionConfig?.subtitleText || detailItem.videoConfig?.productionConfig?.subtitleContext || '') || t('messages.noHistory')}</span></p>
                  </div>
                </div>
                <div className={SUBTLE_PANEL_CLASS}>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{t('modals.subSelection')}</p>
                  <div className="mt-3 space-y-2 text-sm text-slate-200">
                    <p>{t('labels.method')} <span className="text-slate-300">{detailItem.mashupLog?.selection?.method || getSubSelectionLabel(detailItem.mashupLog)}</span></p>
                    {detailItem.mashupLog?.selection?.sourceName ? (
                      <p>{t('labels.source')} <span className="text-slate-300">{detailItem.mashupLog.selection.sourceName}</span></p>
                    ) : null}
                    {detailItem.mashupLog?.selection?.score != null ? (
                      <p>{t('labels.score')} <span className="text-slate-300">{detailItem.mashupLog.selection.score}</span></p>
                    ) : null}
                    {detailItem.mashupLog?.selection?.desiredThemes?.length ? (
                      <p>{t('labels.themeHints')} <span className="text-slate-300">{detailItem.mashupLog.selection.desiredThemes.join(', ')}</span></p>
                    ) : null}
                  </div>
                </div>
              </div>
              {detailItem.mashupLog?.selection?.candidates?.length ? (
                <div className={`${SUBTLE_PANEL_CLASS} mt-4`}>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{t('modals.topCandidates')}</p>
                  <div className="mt-3 space-y-2 text-sm text-slate-200">
                    {detailItem.mashupLog.selection.candidates.map((candidate) => (
                      <div key={candidate.id || candidate.name} className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2">
                        <span className="text-white">{candidate.name || candidate.id}</span>
                        <span className="text-slate-400">{candidate.score != null ? `score ${candidate.score}` : 'score n/a'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className={`${SUBTLE_PANEL_CLASS} mt-4`}>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{t('modals.output')}</p>
                <div className="mt-3 space-y-2 text-sm text-slate-200">
                  <p>{t('labels.outputPath')} <span className="text-slate-400">{detailItem.videoConfig?.outputPath || detailItem.videoConfig?.videoPath || 'N/A'}</span></p>
                  {detailItem.videoConfig?.completedDriveSync?.webViewLink ? (
                    <a className="text-sky-200 underline-offset-2 hover:underline" href={detailItem.videoConfig.completedDriveSync.webViewLink} target="_blank" rel="noreferrer">
                      {t('modals.openDriveOutput')}
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      ) : null}

      {remashupOpen && remashupItem ? (
        <ModalPortal>
          <div className="fixed inset-0 z-50 app-layer-modal video-pipeline-modal-light flex items-center justify-center bg-slate-100/70 p-4">
            <div className={`${SURFACE_CARD_CLASS} w-full max-w-3xl p-6`}>
              <SectionHeader
                title={t('modals.remashupTitle')}
                subtitle={remashupItem.queueId}
                actions={(
                  <button onClick={() => setRemashupOpen(false)} className={getActionButtonClass('slate', 'px-3 py-2 text-xs')}>
                    {t('buttons.close')}
                  </button>
                )}
              />
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="space-y-2 text-xs text-slate-400">
                  {t('labels.templateStrategy')}
                  <select
                    value={remashupConfig.templateStrategy}
                    onChange={(event) => setRemashupConfig((prev) => ({ ...prev, templateStrategy: event.target.value }))}
                    className={INPUT_CLASS}
                  >
                    <option value="random">{t('options.random')}</option>
                    <option value="weighted">{t('options.weighted')}</option>
                    <option value="ai_suggested">{t('options.aiSuggested')}</option>
                    <option value="specific">{t('options.specific')}</option>
                  </select>
                </label>
                <label className="space-y-2 text-xs text-slate-400">
                  {t('labels.subVideo')}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setRemashupConfig((prev) => ({ ...prev, manualSubVideo: null }))}
                      className={getActionButtonClass('slate', 'px-3 py-2 text-xs')}
                    >
                      {t('buttons.autoSelection')}
                    </button>
                    <button onClick={() => setGalleryPickerOpen(true)} className={getActionButtonClass('sky', 'px-3 py-2 text-xs')}>
                      {t('buttons.pickFromGallery')}
                    </button>
                    {remashupConfig.manualSubVideo ? (
                      <button onClick={() => setRemashupConfig((prev) => ({ ...prev, manualSubVideo: null }))} className={getActionButtonClass('amber', 'px-3 py-2 text-xs')}>
                        {t('buttons.clear')}
                      </button>
                    ) : null}
                  </div>
                  <div className={`${SUBTLE_PANEL_CLASS} mt-2`}>
                    <p className="text-sm text-white">{remashupConfig.manualSubVideo?.name || t('buttons.autoSelection')}</p>
                    <p className="mt-1 text-xs text-slate-500">{remashupConfig.manualSubVideo?.assetId || 'Uses auto selection rules'}</p>
                  </div>
                </label>
              </div>
              {remashupConfig.templateStrategy === 'specific' ? (
                <label className="mt-4 space-y-2 text-xs text-slate-400">
                  {t('labels.specificTemplate')}
                  <select
                    value={remashupConfig.templateName}
                    onChange={(event) => setRemashupConfig((prev) => ({ ...prev, templateName: event.target.value }))}
                    className={INPUT_CLASS}
                  >
                    <option value="" disabled>{t('placeholders.selectTemplate')}</option>
                    {templateOptions.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </label>
              ) : null}
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="space-y-2 text-xs text-slate-400">
                  {t('labels.subtitle')}
                  <select
                    value={remashupConfig.subtitleMode}
                    onChange={(event) => setRemashupConfig((prev) => ({ ...prev, subtitleMode: event.target.value }))}
                    className={INPUT_CLASS}
                  >
                    <option value="auto">{t('options.auto')}</option>
                    <option value="none">{t('options.none')}</option>
                  </select>
                </label>
                <div className={`${SUBTLE_PANEL_CLASS} flex flex-col gap-3`}>
                  <label className="flex items-center gap-3 text-sm text-slate-200">
                    <input
                      type="checkbox"
                      checked={remashupConfig.capcutAutoCaption}
                      onChange={(event) => setRemashupConfig((prev) => ({ ...prev, capcutAutoCaption: event.target.checked }))}
                      className="h-4 w-4 rounded border-slate-400/70 bg-white/80"
                      disabled={remashupConfig.subtitleMode === 'none'}
                    />
                    {t('modals.capcutAutoCaption')}
                  </label>
                  <label className="flex items-center gap-3 text-sm text-slate-200">
                    <input
                      type="checkbox"
                      checked={remashupConfig.watermarkEnabled}
                      onChange={(event) => setRemashupConfig((prev) => ({ ...prev, watermarkEnabled: event.target.checked }))}
                      className="h-4 w-4 rounded border-slate-400/70 bg-white/80"
                    />
                    {t('modals.watermark')}
                  </label>
                  <label className="flex items-center gap-3 text-sm text-slate-200">
                    <input
                      type="checkbox"
                      checked={remashupConfig.voiceoverEnabled}
                      onChange={(event) => setRemashupConfig((prev) => ({ ...prev, voiceoverEnabled: event.target.checked }))}
                      className="h-4 w-4 rounded border-slate-400/70 bg-white/80"
                    />
                    {t('modals.voiceover')}
                  </label>
                </div>
              </div>
              <label className={`${SUBTLE_PANEL_CLASS} mt-4 flex items-center gap-3 text-sm text-slate-200`}>
                <input
                  type="checkbox"
                  checked={remashupConfig.startImmediately}
                  onChange={(event) => setRemashupConfig((prev) => ({ ...prev, startImmediately: event.target.checked }))}
                  className="h-4 w-4 rounded border-slate-400/70 bg-white/80"
                />
                {t('modals.renderImmediately')}
              </label>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={runRemashup}
                  className={getActionButtonClass('violet')}
                  disabled={
                    busyAction === remashupItem.queueId
                    || (remashupConfig.templateStrategy === 'specific' && !remashupConfig.templateName)
                  }
                >
                  <Clapperboard className="h-4 w-4" />
                  {t('buttons.runRemashup')}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      ) : null}

      {publishOpen && remashupItem ? (
        <ModalPortal>
          <div className="fixed inset-0 app-layer-modal video-pipeline-modal-light flex items-center justify-center bg-slate-100/70 p-4">
            <div className={`${SURFACE_CARD_CLASS} w-full max-w-2xl p-6`}>
              <SectionHeader
                title={t('modals.publishTitle')}
                subtitle={remashupItem.queueId}
                actions={(
                  <button onClick={() => setPublishOpen(false)} className={getActionButtonClass('slate', 'px-3 py-2 text-xs')}>
                    {t('buttons.close')}
                  </button>
                )}
              />
              <div className="mt-4 grid grid-cols-1 gap-3">
                <label className="space-y-2 text-xs text-slate-400">
                  {t('labels.title')}
                  <input
                    value={publishConfig.title}
                    onChange={(event) => setPublishConfig((prev) => ({ ...prev, title: event.target.value }))}
                    className={INPUT_CLASS}
                    placeholder={t('placeholders.enterTitle')}
                  />
                </label>
                <label className="space-y-2 text-xs text-slate-400">
                  {t('labels.description')}
                  <textarea
                    value={publishConfig.description}
                    onChange={(event) => setPublishConfig((prev) => ({ ...prev, description: event.target.value }))}
                    className={`${INPUT_CLASS} min-h-[88px]`}
                    placeholder={t('placeholders.enterDescription')}
                  />
                </label>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label className="space-y-2 text-xs text-slate-400">
                    {t('labels.hashtags')}
                    <input
                      value={publishConfig.hashtags}
                      onChange={(event) => setPublishConfig((prev) => ({ ...prev, hashtags: event.target.value }))}
                      className={INPUT_CLASS}
                      placeholder="#shorts #mashup"
                    />
                  </label>
                  <label className="space-y-2 text-xs text-slate-400">
                    {t('labels.tags')}
                    <input
                      value={publishConfig.tags}
                      onChange={(event) => setPublishConfig((prev) => ({ ...prev, tags: event.target.value }))}
                      className={INPUT_CLASS}
                      placeholder="reaction, mashup, short"
                    />
                  </label>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {publishableAccounts.map((account) => (
                  <label key={account.accountId} className={`${SUBTLE_PANEL_CLASS} flex items-center gap-3 text-sm text-slate-200`}>
                    <input
                      type="checkbox"
                      checked={selectedPublishAccounts.includes(account.accountId)}
                      onChange={(event) => {
                        setSelectedPublishAccounts((prev) => (
                          event.target.checked
                            ? [...prev, account.accountId]
                            : prev.filter((id) => id !== account.accountId)
                        ));
                      }}
                      className="h-4 w-4 rounded border-slate-400/70 bg-white/80"
                    />
                    <div>
                      <p className="text-sm font-semibold text-white">{account.channelInfo?.title || account.displayName || account.username || account.accountId}</p>
                      <p className="text-xs text-slate-500">{account.platform}</p>
                    </div>
                  </label>
                ))}
                {!publishableAccounts.length ? (
                  <p className="text-sm text-slate-500">{t('messages.noPublishAccounts')}</p>
                ) : null}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={runPublish} className={getActionButtonClass('emerald')} disabled={busyAction === remashupItem.queueId}>
                  <Send className="h-4 w-4" />
                  {t('buttons.publish')}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      ) : null}
      <GalleryPicker
        isOpen={galleryPickerOpen}
        onClose={() => setGalleryPickerOpen(false)}
        onSelect={(item) => {
          const localPath = item.localStorage?.path || item.storage?.localPath || '';
          if (!localPath) {
            toast.error(t('messages.noAssetLocalPath'));
            return;
          }
          setRemashupConfig((prev) => ({
            ...prev,
            manualSubVideo: {
              assetId: item.assetId,
              name: item.name || item.filename || item.assetId,
              localPath,
              url: item.storage?.url || '',
              sourceType: 'gallery',
              sourceKey: 'gallery',
            },
          }));
          setGalleryPickerOpen(false);
          toast.success(t('messages.subVideoSelected'));
        }}
        assetType="video"
        title={t('buttons.pickFromGallery')}
      />
    </VideoPipelineLayout>

  );
}










