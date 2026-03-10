import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Clapperboard,
  Clock,
  Download,
  Eye,
  Layers3,
  Pencil,
  RefreshCcw,
  Send,
  Settings2,
  Sparkles,
  Trash2,
  Video,
} from 'lucide-react';
import toast from 'react-hot-toast';
import VideoPipelineLayout from '../components/VideoPipelineLayout';
import GalleryPicker from '../components/GalleryPicker';
import videoPipelineApi from '../services/videoPipelineApi';
import {
import ModalPortal from '../components/ModalPortal';
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
  { id: 'queue', label: 'Queue', icon: Layers3, to: '/video-pipeline/queue' },
  { id: 'settings', label: 'Settings', icon: Settings2, to: '/video-pipeline/settings' },
  { id: 'history', label: 'Production history', icon: Clock, to: '/video-production/history' },
];

const DEFAULT_TEMPLATES = [
  { value: 'reaction', label: 'Reaction', groupKey: 'reaction' },
  { value: 'grid', label: 'Grid', groupKey: 'grid' },
  { value: 'highlight', label: 'Highlight', groupKey: 'highlight' },
  { value: 'meme', label: 'Meme', groupKey: 'meme' },
];

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
  const { i18n } = useTranslation();
  const isVi = i18n.language?.startsWith('vi');
  const tr = (vi, en) => (isVi ? vi : en);

  const [history, setHistory] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: HISTORY_LIMIT, total: 0, pages: 1 });
  const [loading, setLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [remashupOpen, setRemashupOpen] = useState(false);
  const [remashupItem, setRemashupItem] = useState(null);
  const [remashupConfig, setRemashupConfig] = useState({
    templateName: '',
    manualSubVideo: null,
    startImmediately: true,
  });
  const [galleryPickerOpen, setGalleryPickerOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishAccounts, setPublishAccounts] = useState([]);
  const [selectedPublishAccounts, setSelectedPublishAccounts] = useState([]);
  const [publishConfig, setPublishConfig] = useState({ title: '', description: '', tags: '', hashtags: '' });
  const [busyAction, setBusyAction] = useState('');
  const [previewItem, setPreviewItem] = useState(null);

  const navItems = useMemo(() => {
    const labels = {
      history: tr('Lá»‹ch sá»­ sáº£n xuáº¥t', 'Production history'),
      overview: tr('Tá»•ng quan', 'Overview'),
      scraping: tr('Scraping', 'Scraping'),
      videos: tr('Video', 'Videos'),
      production: tr('Sáº£n xuáº¥t', 'Production'),
      queue: tr('HÃ ng Ä‘á»£i', 'Queue'),
      settings: tr('CÃ i Ä‘áº·t', 'Settings'),
    };

    const shortLabels = {
      history: tr('LSX', 'HIS'),
      overview: tr('TQ', 'OVW'),
      scraping: tr('SCR', 'SCR'),
      videos: tr('VID', 'VID'),
      production: tr('PRO', 'PRO'),
      queue: tr('QUE', 'QUE'),
      settings: tr('SET', 'SET'),
    };

    return NAV_SECTIONS.map((item) => ({
      ...item,
      label: labels[item.id] || item.label,
      shortLabel: shortLabels[item.id] || item.label?.slice(0, 3),
    }));
  }, [isVi]);

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
    setRemashupItem(item);
    setRemashupConfig({
      templateName: item?.mashupLog?.templateName || item?.templateName || '',
      manualSubVideo: null,
      startImmediately: true,
    });
    setRemashupOpen(true);
  };

  const runRemashup = async () => {
    if (!remashupItem) return;
    setBusyAction(remashupItem.queueId);
    try {
      await videoPipelineApi.remashupJob(remashupItem.queueId, {
        templateName: remashupConfig.templateName || undefined,
        manualSubVideo: remashupConfig.manualSubVideo || null,
        startImmediately: remashupConfig.startImmediately,
      });
      toast.success(tr('ÄÃ£ cháº¡y láº¡i mashup.', 'Re-mashup started.'));
      setRemashupOpen(false);
      setRemashupItem(null);
      setRemashupConfig({ templateName: '', manualSubVideo: null, startImmediately: true });
      loadHistory();
    } catch (error) {
      toast.error(error.message || 'Cannot re-mashup');
    } finally {
      setBusyAction('');
    }
  };

  const deleteItem = async (queueId) => {
    if (!window.confirm(tr('XoÃ¡ production history nÃ y?', 'Delete this production history item?'))) return;
    setBusyAction(queueId);
    try {
      await videoPipelineApi.deleteProductionHistoryItem(queueId);
      toast.success(tr('ÄÃ£ xoÃ¡.', 'Deleted.'));
      loadHistory();
    } catch (error) {
      toast.error(error.message || 'Cannot delete history item');
    } finally {
      setBusyAction('');
    }
  };

  const openPublish = async (item) => {
    setBusyAction(item.queueId);
    try {
      const response = await videoPipelineApi.getConnections();
      setPublishAccounts(response.accounts || []);
      setSelectedPublishAccounts([]);
      const metadata = item?.publishMetadata || item?.metadata?.publishMetadata || item?.videoConfig?.publishMetadata || {};
      setPublishConfig({
        title: metadata?.title || item?.sourceTitle || '',
        description: metadata?.description || '',
        tags: (metadata?.tags || []).join(', '),
        hashtags: (metadata?.hashtags || []).join(' '),
      });
      setRemashupItem(item);
      setPublishOpen(true);
    } catch (error) {
      toast.error(error.message || 'Cannot load connections');
    } finally {
      setBusyAction('');
    }
  };

  const runPublish = async () => {
    if (!remashupItem) return;
    if (!selectedPublishAccounts.length) {
      toast.error(tr('Chá»n Ã­t nháº¥t 1 tÃ i khoáº£n.', 'Select at least one account.'));
      return;
    }
    setBusyAction(remashupItem.queueId);
    try {
      const title = normalizeText(publishConfig.title);
      const description = normalizeText(publishConfig.description);
      const tags = parseListInput(publishConfig.tags);
      const hashtags = parseListInput(publishConfig.hashtags).map((tag) => (tag.startsWith('#') ? tag : `#${tag}`));
      const uploadConfig = {};
      if (title) uploadConfig.title = title;
      if (description) uploadConfig.description = description;
      if (tags.length) uploadConfig.tags = tags;
      if (hashtags.length) uploadConfig.hashtags = hashtags;

      await videoPipelineApi.publishJob(remashupItem.queueId, { accountIds: selectedPublishAccounts, uploadConfig });
      toast.success(tr('ÄÃ£ gá»­i publish.', 'Publish triggered.'));
      setPublishOpen(false);
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

  return (
    <ModalPortal>
    <VideoPipelineLayout
      title={tr('Lá»‹ch sá»­ production', 'Production history')}
      subtitle={tr('Theo dÃµi chi tiáº¿t mashup, template, sub-video vÃ  scoring.', 'Track mashup details including template, sub-video, and scoring.')}
      navItems={navItems}
      compactNav
      actions={(
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => loadHistory(pagination.page)} className={getActionButtonClass('sky', 'px-3 py-2 text-xs')} disabled={loading}>
            <RefreshCcw className="h-4 w-4" />
            {tr('LÃ m má»›i', 'Refresh')}
          </button>
          <Link to="/video-pipeline/production" className={getActionButtonClass('slate', 'px-3 py-2 text-xs')}>
            {tr('Quay láº¡i Production', 'Back to Production')}
          </Link>
        </div>
      )}
    >
      <section className={`${SURFACE_CARD_CLASS} p-5`}>
        <SectionHeader
          title={tr('Danh sÃ¡ch production history', 'Production history list')}
          subtitle={tr('Má»—i dÃ²ng lÃ  má»™t mashup job vá»›i template, sub selection vÃ  output.', 'Each row is a mashup job with template, sub selection, and output.')}
          actions={(
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>{`${pagination.total || 0} ${tr('má»¥c', 'items')}`}</span>
              <StatusPill tone="sky">{`Page ${pagination.page}/${pagination.pages}`}</StatusPill>
            </div>
          )}
        />
        <div className="mt-4 space-y-3">
          <div className={`${SURFACE_CARD_CLASS} p-1`}>
            <div className="overflow-x-auto">
              <table className="min-w-[1320px] text-left text-sm">
                <thead className="border-b border-white/10 text-xs uppercase tracking-[0.18em] text-slate-400">
                  <tr>
                  <th className="px-4 py-3 whitespace-nowrap">{tr('Output', 'Output')}</th>
                  <th className="px-4 py-3 whitespace-nowrap">{tr('Main', 'Main')}</th>
                  <th className="px-4 py-3 whitespace-nowrap">{tr('Sub', 'Sub')}</th>
                  <th className="px-4 py-3 whitespace-nowrap">{tr('Template', 'Template')}</th>
                  <th className="px-4 py-3 whitespace-nowrap">{tr('Phá»¥ Ä‘á»', 'Subtitle')}</th>
                  <th className="px-4 py-3 whitespace-nowrap">{tr('Tráº¡ng thÃ¡i', 'Status')}</th>
                  <th className="px-4 py-3 whitespace-nowrap">{tr('HoÃ n táº¥t', 'Completed')}</th>
                  <th className="px-4 py-3 whitespace-nowrap">{tr('HÃ nh Ä‘á»™ng', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr key={item.queueId} className="border-b border-white/5">
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
                          {tr('Preview', 'Preview')}
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
                        {normalizeText(item.mashupLog?.subtitleText || item.videoConfig?.productionConfig?.subtitleText || item.videoConfig?.productionConfig?.subtitleContext || '') || tr('KhÃ´ng cÃ³', 'N/A')}
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
                          {tr('Chi tiáº¿t', 'Details')}
                        </button>
                        <button onClick={() => openRemashup(item)} className={getActionButtonClass('violet', 'px-3 py-2 text-xs')} disabled={busyAction === item.queueId}>
                          <Pencil className="h-4 w-4" />
                          {tr('Re-mashup', 'Re-mashup')}
                        </button>
                        <button onClick={() => openPublish(item)} className={getActionButtonClass('emerald', 'px-3 py-2 text-xs')} disabled={busyAction === item.queueId}>
                          <Send className="h-4 w-4" />
                          {tr('Publish', 'Publish')}
                        </button>
                        <button onClick={() => deleteItem(item.queueId)} className={getActionButtonClass('amber', 'px-3 py-2 text-xs')} disabled={busyAction === item.queueId}>
                          <Trash2 className="h-4 w-4" />
                          {tr('XoÃ¡', 'Delete')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!history.length ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-sm text-slate-500">
                      {tr('ChÆ°a cÃ³ dá»¯ liá»‡u.', 'No history yet.')}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              {tr('Hiá»ƒn thá»‹ 20 má»¥c má»—i trang.', 'Showing 20 items per page.')}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                className={getActionButtonClass('slate', 'px-3 py-2 text-xs')}
                disabled={pagination.page <= 1}
              >
                {tr('Trang trÆ°á»›c', 'Prev')}
              </button>
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: Math.min(prev.pages || 1, prev.page + 1) }))}
                className={getActionButtonClass('slate', 'px-3 py-2 text-xs')}
                disabled={pagination.page >= pagination.pages}
              >
                {tr('Trang sau', 'Next')}
              </button>
            </div>
          </div>
        </div>
      </section>

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

      {detailOpen && detailItem ? (
        <div className="fixed inset-0 app-layer-modal flex items-center justify-center bg-slate-950/70 p-4">
          <div className={`${SURFACE_CARD_CLASS} max-h-[90vh] w-full max-w-5xl overflow-y-auto p-6`}>
            <SectionHeader
              title={detailItem.sourceTitle || detailItem.queueId}
              subtitle={detailItem.queueId}
              actions={(
                <button onClick={() => setDetailOpen(false)} className={getActionButtonClass('slate', 'px-3 py-2 text-xs')}>
                  {tr('ÄÃ³ng', 'Close')}
                </button>
              )}
            />
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className={SUBTLE_PANEL_CLASS}>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{tr('Main video', 'Main video')}</p>
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
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{tr('Sub video', 'Sub video')}</p>
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
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{tr('Template', 'Template')}</p>
                <div className="mt-3 space-y-2 text-sm text-slate-200">
                  <p>{tr('TÃªn template:', 'Template:')} <span className="font-semibold text-white">{detailItem.mashupLog?.templateName || detailItem.videoConfig?.productionConfig?.templateName || 'reaction'}</span></p>
                  <p>{tr('NhÃ³m:', 'Group:')} <span className="text-slate-300">{detailItem.mashupLog?.templateGroup || 'reaction'}</span></p>
                  <p>{tr('Layout:', 'Layout:')} <span className="text-slate-300">{detailItem.mashupLog?.layout || detailItem.videoConfig?.productionConfig?.layout || '2-3-1-3'}</span></p>
                  <p>{tr('Duration:', 'Duration:')} <span className="text-slate-300">{detailItem.mashupLog?.duration || detailItem.videoConfig?.productionConfig?.duration || 30}s</span></p>
                  <p>{tr('Subtitle mode:', 'Subtitle mode:')} <span className="text-slate-300">{detailItem.mashupLog?.subtitleMode || detailItem.videoConfig?.productionConfig?.subtitleMode || 'none'}</span></p>
                  <p>{tr('Subtitle text:', 'Subtitle text:')} <span className="text-slate-300">{normalizeText(detailItem.mashupLog?.subtitleText || detailItem.videoConfig?.productionConfig?.subtitleText || detailItem.videoConfig?.productionConfig?.subtitleContext || '') || tr('KhÃ´ng cÃ³', 'N/A')}</span></p>
                </div>
              </div>
              <div className={SUBTLE_PANEL_CLASS}>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{tr('Sub selection', 'Sub selection')}</p>
                <div className="mt-3 space-y-2 text-sm text-slate-200">
                  <p>{tr('CÆ¡ cháº¿:', 'Method:')} <span className="text-slate-300">{detailItem.mashupLog?.selection?.method || getSubSelectionLabel(detailItem.mashupLog)}</span></p>
                  {detailItem.mashupLog?.selection?.sourceName ? (
                    <p>{tr('Nguá»“n:', 'Source:')} <span className="text-slate-300">{detailItem.mashupLog.selection.sourceName}</span></p>
                  ) : null}
                  {detailItem.mashupLog?.selection?.score != null ? (
                    <p>{tr('Äiá»ƒm:', 'Score:')} <span className="text-slate-300">{detailItem.mashupLog.selection.score}</span></p>
                  ) : null}
                  {detailItem.mashupLog?.selection?.desiredThemes?.length ? (
                    <p>{tr('Theme hint:', 'Theme hints:')} <span className="text-slate-300">{detailItem.mashupLog.selection.desiredThemes.join(', ')}</span></p>
                  ) : null}
                </div>
              </div>
            </div>
            {detailItem.mashupLog?.selection?.candidates?.length ? (
              <div className={`${SUBTLE_PANEL_CLASS} mt-4`}>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{tr('Top candidates', 'Top candidates')}</p>
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
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{tr('Output', 'Output')}</p>
              <div className="mt-3 space-y-2 text-sm text-slate-200">
                <p>{tr('Output path:', 'Output path:')} <span className="text-slate-400">{detailItem.videoConfig?.outputPath || detailItem.videoConfig?.videoPath || 'N/A'}</span></p>
                {detailItem.videoConfig?.completedDriveSync?.webViewLink ? (
                  <a className="text-sky-200 underline-offset-2 hover:underline" href={detailItem.videoConfig.completedDriveSync.webViewLink} target="_blank" rel="noreferrer">
                    {tr('Má»Ÿ file Drive', 'Open Drive output')}
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {remashupOpen && remashupItem ? (
        <div className="fixed inset-0 app-layer-modal flex items-center justify-center bg-slate-950/70 p-4">
          <div className={`${SURFACE_CARD_CLASS} w-full max-w-3xl p-6`}>
            <SectionHeader
              title={tr('Re-mashup job', 'Re-mashup job')}
              subtitle={remashupItem.queueId}
              actions={(
                <button onClick={() => setRemashupOpen(false)} className={getActionButtonClass('slate', 'px-3 py-2 text-xs')}>
                  {tr('ÄÃ³ng', 'Close')}
                </button>
              )}
            />
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="space-y-2 text-xs text-slate-400">
                {tr('Template', 'Template')}
                <select
                  value={remashupConfig.templateName}
                  onChange={(event) => setRemashupConfig((prev) => ({ ...prev, templateName: event.target.value }))}
                  className={INPUT_CLASS}
                >
                  {templateOptions.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-xs text-slate-400">
                {tr('Sub video', 'Sub video')}
                <div className="flex items-center gap-2">
                  <button onClick={() => setGalleryPickerOpen(true)} className={getActionButtonClass('sky', 'px-3 py-2 text-xs')}>
                    {tr('Chá»n tá»« gallery', 'Pick from gallery')}
                  </button>
                  {remashupConfig.manualSubVideo ? (
                    <button onClick={() => setRemashupConfig((prev) => ({ ...prev, manualSubVideo: null }))} className={getActionButtonClass('amber', 'px-3 py-2 text-xs')}>
                      {tr('Bá» chá»n', 'Clear')}
                    </button>
                  ) : null}
                </div>
                <div className={`${SUBTLE_PANEL_CLASS} mt-2`}>
                  <p className="text-sm text-white">{remashupConfig.manualSubVideo?.name || tr('Auto selection', 'Auto selection')}</p>
                  <p className="mt-1 text-xs text-slate-500">{remashupConfig.manualSubVideo?.assetId || tr('Sá»­ dá»¥ng rule tá»± Ä‘á»™ng', 'Uses auto selection rules')}</p>
                </div>
              </label>
            </div>
            <label className={`${SUBTLE_PANEL_CLASS} mt-4 flex items-center gap-3 text-sm text-slate-200`}>
              <input
                type="checkbox"
                checked={remashupConfig.startImmediately}
                onChange={(event) => setRemashupConfig((prev) => ({ ...prev, startImmediately: event.target.checked }))}
                className="h-4 w-4 rounded border-slate-400/70 bg-white/80"
              />
              {tr('Render ngay sau khi reset', 'Render immediately after reset')}
            </label>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={runRemashup} className={getActionButtonClass('violet')} disabled={busyAction === remashupItem.queueId}>
                <Clapperboard className="h-4 w-4" />
                {tr('Cháº¡y láº¡i mashup', 'Run re-mashup')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {publishOpen && remashupItem ? (
        <div className="fixed inset-0 app-layer-modal flex items-center justify-center bg-slate-950/70 p-4">
          <div className={`${SURFACE_CARD_CLASS} w-full max-w-2xl p-6`}>
            <SectionHeader
              title={tr('Publish job', 'Publish job')}
              subtitle={remashupItem.queueId}
              actions={(
                <button onClick={() => setPublishOpen(false)} className={getActionButtonClass('slate', 'px-3 py-2 text-xs')}>
                  {tr('ÄÃ³ng', 'Close')}
                </button>
              )}
            />
            <div className="mt-4 grid grid-cols-1 gap-3">
              <label className="space-y-2 text-xs text-slate-400">
                {tr('TiÃªu Ä‘á»', 'Title')}
                <input
                  value={publishConfig.title}
                  onChange={(event) => setPublishConfig((prev) => ({ ...prev, title: event.target.value }))}
                  className={INPUT_CLASS}
                  placeholder={tr('Nháº­p tiÃªu Ä‘á» video', 'Enter video title')}
                />
              </label>
              <label className="space-y-2 text-xs text-slate-400">
                {tr('MÃ´ táº£', 'Description')}
                <textarea
                  value={publishConfig.description}
                  onChange={(event) => setPublishConfig((prev) => ({ ...prev, description: event.target.value }))}
                  className={`${INPUT_CLASS} min-h-[88px]`}
                  placeholder={tr('MÃ´ táº£ hoáº·c rule publish', 'Description or publish notes')}
                />
              </label>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="space-y-2 text-xs text-slate-400">
                  {tr('Hashtag', 'Hashtags')}
                  <input
                    value={publishConfig.hashtags}
                    onChange={(event) => setPublishConfig((prev) => ({ ...prev, hashtags: event.target.value }))}
                    className={INPUT_CLASS}
                    placeholder="#shorts #mashup"
                  />
                </label>
                <label className="space-y-2 text-xs text-slate-400">
                  {tr('Tag', 'Tags')}
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
              {(publishAccounts || []).map((account) => (
                <label key={account.id} className={`${SUBTLE_PANEL_CLASS} flex items-center gap-3 text-sm text-slate-200`}>
                  <input
                    type="checkbox"
                    checked={selectedPublishAccounts.includes(account.id)}
                    onChange={(event) => {
                      setSelectedPublishAccounts((prev) => (
                        event.target.checked
                          ? [...prev, account.id]
                          : prev.filter((id) => id !== account.id)
                      ));
                    }}
                    className="h-4 w-4 rounded border-slate-400/70 bg-white/80"
                  />
                  <div>
                    <p className="text-sm font-semibold text-white">{account.displayName || account.username || account.id}</p>
                    <p className="text-xs text-slate-500">{account.platform}</p>
                  </div>
                </label>
              ))}
              {!publishAccounts?.length ? (
                <p className="text-sm text-slate-500">{tr('ChÆ°a cÃ³ account publish.', 'No publish accounts available.')}</p>
              ) : null}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={runPublish} className={getActionButtonClass('emerald')} disabled={busyAction === remashupItem.queueId}>
                <Send className="h-4 w-4" />
                {tr('Publish', 'Publish')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <GalleryPicker
        isOpen={galleryPickerOpen}
        onClose={() => setGalleryPickerOpen(false)}
        onSelect={(item) => {
          const localPath = item.localStorage?.path || item.storage?.localPath || '';
          if (!localPath) {
            toast.error(tr('Asset chÆ°a cÃ³ local path Ä‘á»ƒ mashup.', 'Selected asset has no local path.'));
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
          toast.success(tr('ÄÃ£ chá»n sub video.', 'Sub video selected.'));
        }}
        assetType="video"
        title={tr('Chá»n sub video tá»« gallery', 'Pick sub video from gallery')}
      />
    </VideoPipelineLayout>
    </ModalPortal>
  );
}


