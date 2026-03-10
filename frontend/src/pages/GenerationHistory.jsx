import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Copy,
  Image as ImageIcon,
  Loader2,
  Mic2,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Video,
  Wand2,
  XCircle,
} from 'lucide-react';
import PageHeaderBar from '../components/PageHeaderBar';
import EmptyState from '../components/ui/EmptyState';
import SemanticIconBadge from '../components/ui/SemanticIconBadge';
import { SkeletonBlock, SkeletonCards } from '../components/ui/Skeleton';
import StatusPill from '../components/ui/StatusPill';
import {
  deleteGenerationSession,
  getGenerationSessionDetail,
  getGenerationSessions,
} from '../services/generationSessionsService';

const FLOW_OPTIONS = [
  { value: 'all', label: 'All flows', icon: Clock3, tone: 'neutral' },
  { value: 'one-click', label: '1-Click', icon: Sparkles, tone: 'accent' },
  { value: 'image-generation', label: 'Image', icon: ImageIcon, tone: 'info' },
  { value: 'video-generation', label: 'Video', icon: Video, tone: 'pink' },
  { value: 'voice-generation', label: 'Voice', icon: Mic2, tone: 'success' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All status' },
  { value: 'completed', label: 'Completed' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PAGE_SIZE = 20;

const SURFACE_CARD_CLASS =
  'overflow-hidden rounded-[28px] border border-slate-800/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(7,14,28,0.98))] shadow-[0_26px_80px_rgba(2,6,23,0.34),0_0_0_1px_rgba(148,163,184,0.05)]';

function getStatusAccentClass(status) {
  if (status === 'failed') {
    return 'border-rose-500/55 bg-[linear-gradient(180deg,rgba(127,29,29,0.24),rgba(15,23,42,0.96))] shadow-[0_0_0_1px_rgba(244,63,94,0.18),0_24px_70px_rgba(127,29,29,0.28)]';
  }
  if (status === 'completed') {
    return 'border-sky-400/20 shadow-[0_24px_70px_rgba(56,189,248,0.08)]';
  }
  if (status === 'in-progress') {
    return 'border-violet-400/25 shadow-[0_24px_70px_rgba(139,92,246,0.12)]';
  }
  return 'border-slate-800/80';
}

function getFilterButtonClass(active, tone = 'neutral') {
  if (active) {
    return {
      warning: 'border-amber-400/75 bg-[linear-gradient(180deg,rgba(245,158,11,0.18),rgba(120,53,15,0.16))] text-amber-100 shadow-[0_0_0_1px_rgba(251,191,36,0.18),0_18px_48px_rgba(120,53,15,0.22)]',
      accent: 'border-violet-400/70 bg-[linear-gradient(180deg,rgba(139,92,246,0.22),rgba(76,29,149,0.16))] text-violet-50 shadow-[0_0_0_1px_rgba(167,139,250,0.16),0_18px_48px_rgba(76,29,149,0.24)]',
      info: 'border-sky-400/70 bg-[linear-gradient(180deg,rgba(56,189,248,0.18),rgba(14,116,144,0.14))] text-sky-50 shadow-[0_0_0_1px_rgba(125,211,252,0.14),0_18px_48px_rgba(14,116,144,0.24)]',
      pink: 'border-fuchsia-400/65 bg-[linear-gradient(180deg,rgba(217,70,239,0.18),rgba(131,24,67,0.14))] text-fuchsia-50 shadow-[0_0_0_1px_rgba(232,121,249,0.14),0_18px_48px_rgba(131,24,67,0.24)]',
      success: 'border-emerald-400/65 bg-[linear-gradient(180deg,rgba(16,185,129,0.18),rgba(6,78,59,0.14))] text-emerald-50 shadow-[0_0_0_1px_rgba(110,231,183,0.14),0_18px_48px_rgba(6,78,59,0.24)]',
      neutral: 'border-amber-400/75 bg-[linear-gradient(180deg,rgba(245,158,11,0.18),rgba(120,53,15,0.16))] text-amber-100 shadow-[0_0_0_1px_rgba(251,191,36,0.18),0_18px_48px_rgba(120,53,15,0.22)]',
    }[tone];
  }

  return 'border-slate-700/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.82),rgba(15,23,42,0.58))] text-slate-300 hover:border-slate-600/90 hover:bg-slate-900/90';
}

function getFlowMeta(flowType) {
  return (
    FLOW_OPTIONS.find((option) => option.value === flowType) || {
      value: flowType,
      label: flowType || 'Unknown',
      icon: Wand2,
      tone: 'neutral',
    }
  );
}

function getStatusTone(status) {
  if (status === 'completed') return 'success';
  if (status === 'failed') return 'danger';
  if (status === 'in-progress') return 'info';
  if (status === 'cancelled') return 'warning';
  return 'neutral';
}

function formatDateTime(value) {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatDuration(duration) {
  if (!duration || Number.isNaN(duration)) return 'Pending';
  if (duration < 1000) return `${duration} ms`;
  const seconds = Math.round(duration / 100) / 10;
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round((seconds % 60) * 10) / 10;
  return `${minutes}m ${remainingSeconds}s`;
}


function normalizePath(value) {
  if (!value) return null;
  return String(value).replace(/\\/g, '/');
}

function getPublicUrl(value) {
  if (!value) return null;
  const normalized = normalizePath(value);
  if (!normalized) return null;
  if (normalized.startsWith('http://') || normalized.startsWith('https://')) return normalized;
  if (normalized.startsWith('/uploads/') || normalized.startsWith('/temp/')) return normalized;
  const uploadsIndex = normalized.indexOf('/uploads/');
  if (uploadsIndex >= 0) return normalized.slice(uploadsIndex);
  const tempIndex = normalized.indexOf('/temp/');
  if (tempIndex >= 0) return normalized.slice(tempIndex);
  const backendUploadsIndex = normalized.indexOf('/backend/uploads/');
  if (backendUploadsIndex >= 0) return normalized.slice(backendUploadsIndex + '/backend'.length);
  const backendTempIndex = normalized.indexOf('/backend/temp/');
  if (backendTempIndex >= 0) return normalized.slice(backendTempIndex + '/backend'.length);
  return null;
}

function getMediaKind(value) {
  if (!value) return 'file';
  const normalized = normalizePath(value);
  const ext = normalized?.split('.').pop()?.toLowerCase() || '';
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'].includes(ext)) return 'image';
  if (['mp4', 'mov', 'webm', 'mkv'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'm4a', 'aac', 'ogg'].includes(ext)) return 'audio';
  return 'file';
}

function getFileLabel(value) {
  if (!value) return '';
  const normalized = normalizePath(value);
  return normalized.split('/').pop() || normalized;
}

function summarizeJson(data) {
  if (!data || typeof data !== 'object') return [];
  return Object.entries(data)
    .filter(([, value]) => value != null && value !== '')
    .slice(0, 8);
}

function DetailSection({ title, subtitle, actions, children }) {
  return (
    <section className={`${SURFACE_CARD_CLASS} min-w-0 overflow-x-hidden p-3.5`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          {subtitle ? <p className="mt-1 text-xs leading-5 text-slate-400">{subtitle}</p> : null}
        </div>
        {actions}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function SummaryCard({ title, value, helper, tone, icon: Icon }) {
  const toneAccent =
    {
      info: 'border-sky-400/45 bg-[linear-gradient(180deg,rgba(14,165,233,0.16),rgba(7,14,28,0.98))] shadow-[0_0_0_1px_rgba(56,189,248,0.12),0_24px_80px_rgba(56,189,248,0.16)]',
      success:
        'border-emerald-400/45 bg-[linear-gradient(180deg,rgba(16,185,129,0.16),rgba(7,14,28,0.98))] shadow-[0_0_0_1px_rgba(16,185,129,0.12),0_24px_80px_rgba(16,185,129,0.16)]',
      danger:
        'border-rose-500/55 bg-[linear-gradient(180deg,rgba(225,29,72,0.18),rgba(7,14,28,0.98))] shadow-[0_0_0_1px_rgba(244,63,94,0.16),0_24px_80px_rgba(127,29,29,0.28)]',
      warning:
        'border-amber-400/55 bg-[linear-gradient(180deg,rgba(245,158,11,0.18),rgba(7,14,28,0.98))] shadow-[0_0_0_1px_rgba(251,191,36,0.16),0_24px_80px_rgba(120,53,15,0.22)]',
      accent:
        'border-violet-400/50 bg-[linear-gradient(180deg,rgba(139,92,246,0.18),rgba(7,14,28,0.98))] shadow-[0_0_0_1px_rgba(167,139,250,0.14),0_24px_80px_rgba(91,33,182,0.24)]',
    }[tone] || '';
  const toneText =
    {
      info: 'text-sky-200',
      success: 'text-emerald-200',
      danger: 'text-rose-200',
      warning: 'text-amber-200',
      accent: 'text-violet-200',
    }[tone] || 'text-slate-300';

  return (
    <div className={`${SURFACE_CARD_CLASS} ${toneAccent} p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${toneText}`}>{title}</p>
          <p className="mt-2 text-[28px] font-semibold leading-none text-white">{value}</p>
          <p className="mt-2 text-[11px] text-slate-400">{helper}</p>
        </div>
        <SemanticIconBadge icon={Icon} tone={tone} className="h-11 w-11" />
      </div>
    </div>
  );
}

function MetricPill({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-800/80 bg-slate-900/55 px-2 py-1">
      <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-0.5 text-[11px] font-semibold text-white">{value}</p>
    </div>
  );
}

function JsonPreview({ data, emptyLabel = 'No structured data captured yet.' }) {
  const entries = summarizeJson(data);

  if (!entries.length) {
    return <p className="text-xs text-slate-500">{emptyLabel}</p>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {entries.map(([key, value]) => (
        <div key={key} className="rounded-2xl border border-slate-800/80 bg-slate-900/55 px-3 py-3">
          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{key}</p>
          <p className="mt-2 break-words text-xs leading-5 text-slate-200">
            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
          </p>
        </div>
      ))}
    </div>
  );
}


function MediaPreviewCard({ item, compact = false }) {
  const kind = item?.kind || getMediaKind(item?.path || item?.url);
  const label = item?.label || getFileLabel(item?.path || item?.url) || 'Asset';
  const previewUrl = item?.url || getPublicUrl(item?.path);

  return (
    <div className={`rounded-2xl border border-slate-800/80 bg-slate-950/60 ${compact ? 'p-2' : 'p-3'}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="truncate text-[11px] font-medium text-slate-200">{label}</p>
        {previewUrl ? (
          <a
            href={previewUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[10px] uppercase tracking-[0.12em] text-cyan-200/80 hover:text-cyan-200"
          >
            Preview
          </a>
        ) : null}
      </div>
      <div className={`overflow-hidden rounded-xl border border-slate-800/70 bg-black/40 ${compact ? 'h-24' : 'h-44'}`}>
        {previewUrl ? (
          kind === 'video' ? (
            <video controls src={previewUrl} className="h-full w-full object-contain" />
          ) : kind === 'audio' ? (
            <div className="flex h-full w-full items-center justify-center p-3">
              <audio controls src={previewUrl} className="w-full" />
            </div>
          ) : kind === 'image' ? (
            <img src={previewUrl} alt={label} className="h-full w-full object-contain" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">No preview</div>
          )
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">No preview</div>
        )}
      </div>
      <p className="mt-2 break-all text-[11px] text-slate-500">{item?.path || item?.url || 'No file path'}</p>
    </div>
  );
}

function SessionCard({ session, selected, onSelect }) {
  const flow = getFlowMeta(session.flowType);
  const FlowIcon = flow.icon;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-[20px] border p-2 text-left transition ${
        selected
          ? `bg-[linear-gradient(180deg,rgba(250,204,21,0.12),rgba(15,23,42,0.96))] ${session.status === 'failed' ? 'border-rose-500/75 shadow-[0_0_0_1px_rgba(244,63,94,0.2),0_24px_70px_rgba(127,29,29,0.28)]' : 'border-amber-400/75 shadow-[0_0_0_1px_rgba(251,191,36,0.18),0_24px_70px_rgba(120,53,15,0.22)]'}`
          : `bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(7,14,28,0.98))] hover:border-slate-700/90 hover:bg-slate-900/80 ${getStatusAccentClass(session.status)}`
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <SemanticIconBadge icon={FlowIcon} tone={selected ? 'warning' : flow.tone} className="h-8 w-8 rounded-xl" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="truncate text-[12px] font-semibold text-white">{flow.label}</h3>
              <StatusPill tone={getStatusTone(session.status)}>{session.status || 'unknown'}</StatusPill>
            </div>
            <p className="mt-0.5 truncate text-[11px] text-slate-400">{session.useCase || session.sessionId}</p>
          </div>
        </div>
        <p className="shrink-0 text-[11px] text-slate-500">{formatDateTime(session.createdAt)}</p>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1">
        <MetricPill label="In" value={session.inputCount || 0} />
        <MetricPill label="Out" value={session.outputCount || 0} />
        <MetricPill label="Stages" value={session.stageCount || 0} />
        <MetricPill label="Time" value={formatDuration(session.totalDuration)} />
      </div>

      <div className="mt-1.5 rounded-xl border border-slate-800/80 bg-slate-950/60 px-2 py-1.5">
        <p className={`line-clamp-1 text-[10px] leading-4 ${session.error?.message ? 'text-rose-200' : 'text-slate-300'}`}>
          {session.error?.message || session.latestLog?.message || 'No detailed event captured yet.'}
        </p>
      </div>
    </button>
  );
}

export default function GenerationHistory() {
  const [filters, setFilters] = useState({
    search: '',
    flowType: 'all',
    status: 'all',
  });
  const [page, setPage] = useState(1);
  const [sessions, setSessions] = useState([]);
  const [summary, setSummary] = useState({ total: 0, status: {}, flowTypes: {} });
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1, hasMore: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [selectedSession, setSelectedSession] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deletingId, setDeletingId] = useState('');

  useEffect(() => {
    let ignore = false;

    async function loadSessions() {
      setLoading(true);
      setError('');

      try {
        const response = await getGenerationSessions({
          page,
          limit: PAGE_SIZE,
          search: filters.search,
          flowType: filters.flowType,
          status: filters.status,
        });

        if (ignore) return;

        const nextSessions = response.data || [];
        setSessions(nextSessions);
        setSummary(response.summary || { total: 0, status: {}, flowTypes: {} });
        setPagination(response.pagination || { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1, hasMore: false });

        if (!nextSessions.length) {
          setSelectedSessionId('');
          setSelectedSession(null);
          return;
        }

        setSelectedSessionId((current) => {
          const hasCurrent = nextSessions.some((item) => item.sessionId === current);
          return hasCurrent ? current : nextSessions[0].sessionId;
        });
      } catch (loadError) {
        if (!ignore) setError(loadError.message || 'Failed to load session history.');
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadSessions();

    return () => {
      ignore = true;
    };
  }, [filters.flowType, filters.search, filters.status, page]);

  useEffect(() => {
    if (!selectedSessionId) return undefined;

    let ignore = false;

    async function loadSessionDetail() {
      setDetailLoading(true);

      try {
        const response = await getGenerationSessionDetail(selectedSessionId);
        if (!ignore) setSelectedSession(response.data || null);
      } catch (detailError) {
        if (!ignore) {
          setSelectedSession(null);
          setError(detailError.message || 'Failed to load session detail.');
        }
      } finally {
        if (!ignore) setDetailLoading(false);
      }
    }

    loadSessionDetail();

    return () => {
      ignore = true;
    };
  }, [selectedSessionId]);

  const summaryCards = useMemo(() => {
    const total = summary.total || 0;
    const completed = summary.status?.completed || 0;
    const failed = summary.status?.failed || 0;
    const inProgress = summary.status?.['in-progress'] || 0;
    const oneClick = summary.flowTypes?.['one-click'] || 0;

    return [
      {
        title: 'Sessions',
        value: total,
        helper: 'All captured runs across generation flows.',
        tone: 'info',
        icon: Clock3,
      },
      {
        title: 'Completed',
        value: completed,
        helper: `${total ? Math.round((completed / total) * 100) : 0}% finished cleanly.`,
        tone: 'success',
        icon: CheckCircle2,
      },
      {
        title: 'Failed',
        value: failed,
        helper: 'Sessions needing inspection or rerun.',
        tone: 'danger',
        icon: XCircle,
      },
      {
        title: 'Live / Queue',
        value: inProgress,
        helper: 'Still running or waiting for downstream work.',
        tone: 'warning',
        icon: Loader2,
      },
      {
        title: '1-Click',
        value: oneClick,
        helper: 'Cross-stage flows combining multiple generation steps.',
        tone: 'accent',
        icon: Sparkles,
      },
    ];
  }, [summary]);

  const selectedFlow = selectedSession ? getFlowMeta(selectedSession.flowType) : null;
  const selectedLogs = selectedSession?.logs || [];
  const selectedStages = selectedSession?.metrics?.stages || [];
  const selectedArtifacts = selectedSession?.artifacts || {};
  const inputArtifacts = [
    selectedArtifacts.characterImagePath,
    selectedArtifacts.productImagePath,
    ...(selectedArtifacts.sourceVideoPaths || []),
  ].filter(Boolean);
  const outputArtifacts = [
    ...(selectedArtifacts.generatedImagePaths || []),
    ...(selectedArtifacts.videoSegmentPaths || []),
    ...(selectedArtifacts.audioPaths || []),
  ];
  const workflowState = selectedSession?.workflowState || null;
  const workflowInputs = [
    workflowState?.step1?.characterImage?.path,
    workflowState?.step1?.productImage?.path,
  ].filter(Boolean);
  const workflowOutputs = [
    workflowState?.step2?.images?.wearing?.path || workflowState?.step2?.images?.wearing?.previewUrl,
    workflowState?.step2?.images?.holding?.path || workflowState?.step2?.images?.holding?.previewUrl,
    workflowState?.step4?.video?.path || workflowState?.step4?.video?.previewUrl,
    workflowState?.step4?.stitchedVideo?.path || workflowState?.step4?.stitchedVideo?.previewUrl,
    workflowState?.step5?.audio?.path || workflowState?.step5?.audio?.previewUrl,
  ].filter(Boolean);
  const inputItems = [...inputArtifacts, ...workflowInputs]
    .filter(Boolean)
    .map((item) => ({ path: item, url: getPublicUrl(item), kind: getMediaKind(item) }));
  const outputItems = [...outputArtifacts, ...workflowOutputs]
    .filter(Boolean)
    .map((item) => ({ path: item, url: getPublicUrl(item), kind: getMediaKind(item) }));

  async function handleDeleteSession(sessionId) {
    const confirmed = window.confirm(`Delete session ${sessionId}?`);
    if (!confirmed) return;

    setDeletingId(sessionId);
    try {
      await deleteGenerationSession(sessionId);
      setSessions((current) => current.filter((item) => item.sessionId !== sessionId));
      if (selectedSessionId === sessionId) {
        setSelectedSessionId('');
        setSelectedSession(null);
      }
      setPage(1);
    } catch (deleteError) {
      setError(deleteError.message || 'Failed to delete session.');
    } finally {
      setDeletingId('');
    }
  }

  function copySessionId(sessionId) {
    navigator.clipboard?.writeText(sessionId);
  }

  return (
    <div className="generation-history-shell -mx-5 -mb-5 -mt-5 grid min-h-0 grid-rows-[auto,minmax(0,1fr)] overflow-hidden lg:-mx-6 lg:-mb-6 lg:-mt-6 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.12),transparent_28%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.16),transparent_24%),radial-gradient(circle_at_78%_32%,rgba(217,70,239,0.12),transparent_22%),radial-gradient(circle_at_12%_78%,rgba(245,158,11,0.12),transparent_20%),linear-gradient(180deg,#020817_0%,#030b1f_46%,#020617_100%)]">
      {/* ==================== HEADER ==================== */}
      <PageHeaderBar
        icon={<Clock3 className="h-5 w-5 text-cyan-200" />}
        title="Generation History"
        subtitle="Session-first review workspace"
        meta="Trace inputs, outputs, options, runtime signals, and failures across image, video, voice, and 1-click flows."
        className="h-16"
        contentClassName="px-5 lg:px-6"
        actions={
          <button
            type="button"
            onClick={() => {
              setPage(1);
              setFilters((current) => ({ ...current }));
            }}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-700/80 bg-slate-800/85 px-3 py-2 text-[12px] font-medium text-slate-100 transition hover:bg-slate-700/90"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        }
      />

      {/* ==================== MAIN BODY ==================== */}
      <div className="flex min-h-0 flex-1 overflow-hidden flex-col gap-4 overflow-x-hidden px-3 py-3 lg:px-4">
        <section className="grid gap-3 grid-cols-5">
          {loading ? (
            <div className="col-span-5">
              <SkeletonCards count={5} />
            </div>
          ) : (
            summaryCards.map((card) => <SummaryCard key={card.title} {...card} />)
          )}
        </section>

        <section className={`${SURFACE_CARD_CLASS} shrink-0 p-3 shadow-[0_30px_90px_rgba(14,165,233,0.08)]`}>
          <div className="flex flex-row gap-3 items-center justify-between">
            <div className="flex flex-1 flex-row gap-3">
              <label className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={filters.search}
                  onChange={(event) => {
                    setPage(1);
                    setFilters((current) => ({ ...current, search: event.target.value }));
                  }}
                  placeholder="Search session id, flow, error, or log text"
                  className="h-11 w-full rounded-2xl border border-slate-800/80 bg-slate-950/70 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/40"
                />
              </label>

              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setPage(1);
                      setFilters((current) => ({ ...current, status: option.value }));
                    }}
                    className={`rounded-2xl border px-3 py-2 text-[12px] font-medium transition ${
                      option.value === 'failed'
                        ? filters.status === option.value
                          ? 'border-rose-500/80 bg-[linear-gradient(180deg,rgba(225,29,72,0.2),rgba(127,29,29,0.16))] text-rose-100 shadow-[0_0_0_1px_rgba(251,113,133,0.18),0_18px_48px_rgba(127,29,29,0.28)]'
                          : 'border-rose-500/25 bg-slate-900/65 text-rose-200 hover:border-rose-400/45'
                        : getFilterButtonClass(filters.status === option.value, option.value === 'completed' ? 'info' : option.value === 'in-progress' ? 'accent' : option.value === 'cancelled' ? 'warning' : 'neutral')
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {FLOW_OPTIONS.map((option) => {
                const FlowIcon = option.icon;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setPage(1);
                      setFilters((current) => ({ ...current, flowType: option.value }));
                    }}
                    className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-[12px] font-medium transition ${getFilterButtonClass(filters.flowType === option.value, option.tone)}`}
                  >
                    <FlowIcon className="h-4 w-4" />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-3">
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
              <span className="rounded-2xl border border-slate-700/80 bg-slate-900/70 px-3 py-1.5 text-slate-300">
                {PAGE_SIZE} sessions / page
              </span>
              <span>
                Page {pagination.page || 1} of {pagination.totalPages || 1}
              </span>
              <span className="text-slate-500">
                Showing {sessions.length} on this page / {pagination.total || 0} total
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={(pagination.page || 1) <= 1}
                onClick={() => setPage((current) => Math.max(current - 1, 1))}
                className="rounded-2xl border border-slate-700/80 bg-slate-900/70 px-3 py-2 text-[12px] font-medium text-slate-200 transition hover:border-amber-400/55 hover:text-amber-100 disabled:cursor-not-allowed disabled:text-slate-600"
              >
                Previous page
              </button>
              <button
                type="button"
                disabled={!pagination.hasMore}
                onClick={() => setPage((current) => current + 1)}
                className="rounded-2xl border border-amber-400/45 bg-[linear-gradient(180deg,rgba(245,158,11,0.14),rgba(15,23,42,0.92))] px-3 py-2 text-[12px] font-medium text-amber-100 shadow-[0_16px_40px_rgba(120,53,15,0.16)] transition hover:border-amber-300/70 disabled:cursor-not-allowed disabled:border-slate-700/80 disabled:bg-slate-900/70 disabled:text-slate-600 disabled:shadow-none"
              >
                Next page
              </button>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-3xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        <div className="grid min-h-0 flex-1 gap-4 overflow-x-hidden grid-cols-[280px_minmax(0,1fr)]">
          <section className={`${SURFACE_CARD_CLASS} min-h-0 max-h-[920px] overflow-hidden shadow-[0_30px_100px_rgba(139,92,246,0.12)]`}>
            <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-3.5">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-white">Session feed</h2>
                <p className="mt-1 text-xs text-slate-400">
                  Browse captured runs and jump into the exact input, output, and failure context.
                </p>
              </div>
              <p className="text-[11px] text-slate-500 flex-shrink-0">
                {sessions.length} shown / {pagination.total || 0} total
              </p>
            </div>

            <div className="min-h-0 max-h-[840px] space-y-1.5 overflow-y-auto px-2.5 py-2.5">
              {loading ? (
                <div className="space-y-2">
                  <SkeletonCards count={4} />
                </div>
              ) : sessions.length ? (
                sessions.map((session) => (
                  <SessionCard
                    key={session.sessionId}
                    session={session}
                    selected={session.sessionId === selectedSessionId}
                    onSelect={() => setSelectedSessionId(session.sessionId)}
                  />
                ))
              ) : (
                <EmptyState
                  icon={Clock3}
                  title="No sessions match these filters"
                  description="Try widening the flow type or status filter, or clear your search to bring back older runs."
                  className="border-none bg-transparent shadow-none"
                />
              )}
            </div>

          </section>

          <section className="min-h-0 min-w-0 overflow-x-hidden">
            {detailLoading ? (
              <div className="space-y-4">
                <div className={`${SURFACE_CARD_CLASS} p-4`}>
                  <SkeletonBlock className="h-5 w-40" />
                  <SkeletonBlock className="mt-4 h-20 w-full" />
                </div>
                <div className={`${SURFACE_CARD_CLASS} p-4`}>
                  <SkeletonBlock className="h-5 w-32" />
                  <SkeletonBlock className="mt-4 h-32 w-full" />
                </div>
              </div>
            ) : selectedSession ? (
              <div className="grid min-w-0 gap-3 overflow-hidden scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
                <DetailSection
                  title="Session overview"
                  subtitle="Quick read on flow type, runtime health, and last known state."
                  actions={
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => copySessionId(selectedSession.sessionId)}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-700/80 bg-slate-800/80 px-3 py-2 text-[12px] font-medium text-slate-200 transition hover:bg-slate-700/90"
                      >
                        <Copy className="h-4 w-4" />
                        Copy ID
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSession(selectedSession.sessionId)}
                        disabled={deletingId === selectedSession.sessionId}
                        className="inline-flex items-center gap-2 rounded-2xl border border-rose-400/30 bg-rose-500/12 px-3 py-2 text-[12px] font-medium text-rose-100 transition hover:bg-rose-500/18 disabled:cursor-not-allowed"
                      >
                        {deletingId === selectedSession.sessionId ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        Delete
                      </button>
                    </div>
                  }
                >
                  <div className="flex flex-wrap items-start gap-4">
                    <div className="flex items-start gap-3">
                      <SemanticIconBadge icon={selectedFlow?.icon || Wand2} tone={selectedFlow?.tone || 'neutral'} className="h-12 w-12" />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-semibold text-white">{selectedFlow?.label || 'Unknown flow'}</h2>
                          <StatusPill tone={getStatusTone(selectedSession.status)}>{selectedSession.status || 'unknown'}</StatusPill>
                        </div>
                        <p className="mt-1 text-xs text-slate-400">{selectedSession.useCase || selectedSession.sessionId}</p>
                      </div>
                    </div>
                    <div className="grid flex-1 gap-2 sm:grid-cols-2">
                      <MetricPill label="Created" value={formatDateTime(selectedSession.createdAt)} />
                      <MetricPill label="Updated" value={formatDateTime(selectedSession.updatedAt)} />
                      <MetricPill label="Duration" value={formatDuration(selectedSession.metrics?.totalDuration)} />
                      <MetricPill label="Logs" value={selectedLogs.length} />
                    </div>
                  </div>
                </DetailSection>

                <DetailSection
                  title="Inputs and outputs"
                  subtitle="Stored artifacts captured from the run. Inputs stay separate from generated outputs to keep review fast."
                >
                  <div className="grid gap-4 grid-cols-[minmax(0,1fr)_minmax(0,2fr)] min-w-0">
                    <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/8 p-3 min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-cyan-200/80">Inputs</p>
                      <div className="mt-3 flex flex-col gap-3">
                        {inputItems.length ? (
                          inputItems.map((item, index) => (
                            <MediaPreviewCard key={`${item.path || item.url}-${index}`} item={item} compact />
                          ))
                        ) : (
                          <p className="text-xs text-slate-500">No persisted input artifact path was recorded.</p>
                        )}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-pink-400/20 bg-pink-500/8 p-3 min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-pink-200/80">Outputs</p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {outputItems.length ? (
                          outputItems.map((item, index) => (
                            <MediaPreviewCard key={`${item.path || item.url}-${index}`} item={item} />
                          ))
                        ) : (
                          <p className="text-xs text-slate-500">No generated output artifact was stored on this session.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </DetailSection>

                <DetailSection
                  title="Options and analysis"
                  subtitle="Structured values captured during the run. This is where provider choices and analysis payloads become visible."
                >
                  <div className="grid gap-4">
                    <div>
                      <p className="mb-3 text-[10px] uppercase tracking-[0.16em] text-slate-500">Analysis payload</p>
                      <JsonPreview data={selectedSession.analysis} />
                    </div>
                    <div>
                      <p className="mb-3 text-[10px] uppercase tracking-[0.16em] text-slate-500">Error payload</p>
                      <JsonPreview data={selectedSession.error} emptyLabel="No error payload captured for this session." />
                    </div>
                  </div>
                </DetailSection>

                <DetailSection
                  title="Stage timeline"
                  subtitle="Step-by-step timing and state changes captured during the session."
                >
                  {selectedStages.length ? (
                    <div className="space-y-3">
                      {selectedStages.map((stage, index) => (
                        <div key={`${stage.stage || 'stage'}-${index}`} className="rounded-2xl border border-slate-800/80 bg-slate-950/60 px-3 py-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <StatusPill tone={stage.status === 'completed' ? 'success' : stage.status === 'failed' ? 'danger' : 'info'}>
                                {stage.status || 'unknown'}
                              </StatusPill>
                              <p className="text-sm font-medium text-white">{stage.stage || `Stage ${index + 1}`}</p>
                            </div>
                            <p className="text-xs text-slate-400">{formatDuration(stage.duration)}</p>
                          </div>
                          <div className="mt-2 grid gap-2 sm:grid-cols-2">
                            <MetricPill label="Started" value={formatDateTime(stage.startTime)} />
                            <MetricPill label="Finished" value={formatDateTime(stage.endTime)} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={Loader2}
                      title="No stage timing recorded"
                      description="This run either finished too early or the pipeline did not persist stage-level metrics."
                      compact
                    />
                  )}
                </DetailSection>

                <DetailSection
                  title="Runtime log stream"
                  subtitle="The latest debug and error messages captured for this run."
                >
                  {selectedLogs.length ? (
                    <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
                      {selectedLogs
                        .slice()
                        .reverse()
                        .map((log, index) => (
                          <div
                            key={`${log.timestamp || 'log'}-${index}`}
                            className={`rounded-2xl border px-3 py-3 ${
                              log.level === 'error'
                                ? 'border-rose-400/25 bg-rose-500/10'
                                : log.level === 'warn'
                                  ? 'border-amber-400/25 bg-amber-500/10'
                                  : log.level === 'info'
                                    ? 'border-cyan-400/20 bg-cyan-500/8'
                                    : 'border-slate-800/80 bg-slate-950/60'
                            }`}
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <StatusPill tone={log.level === 'error' ? 'danger' : log.level === 'warn' ? 'warning' : log.level === 'info' ? 'info' : 'neutral'}>
                                {log.level || 'debug'}
                              </StatusPill>
                              <p className="text-[11px] uppercase tracking-[0.12em] text-slate-400">{log.category || 'general'}</p>
                              <p className="ml-auto text-[11px] text-slate-500">{formatDateTime(log.timestamp)}</p>
                            </div>
                            <p className="mt-2 text-xs leading-5 text-slate-200">{log.message || 'No message'}</p>
                            {log.details ? (
                              <pre className="mt-3 overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-950/80 p-3 text-[11px] leading-5 text-slate-300">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            ) : null}
                          </div>
                        ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={AlertTriangle}
                      title="No logs were persisted"
                      description="The session exists, but no log entries were written to the central logger for this run."
                      compact
                    />
                  )}
                </DetailSection>
              </div>
            ) : (
              <EmptyState
                icon={Clock3}
                title="Choose a session"
                description="Select a run from the left to inspect its inputs, outputs, runtime stages, and log trail."
              />
            )}
          </section>
        </div>
      </div>
    </div>
  );
}









