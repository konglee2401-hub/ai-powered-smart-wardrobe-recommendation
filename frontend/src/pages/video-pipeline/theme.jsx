import React from 'react';

export const SURFACE_CARD_CLASS =
  'video-pipeline-surface studio-card-shell overflow-hidden rounded-[28px] border shadow-[0_24px_72px_rgba(15,23,42,0.18)] backdrop-blur';

export const SUBTLE_PANEL_CLASS =
  'video-pipeline-subtle rounded-[22px] border p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]';

export const CHECKBOX_PANEL_CLASS =
  'video-pipeline-checkbox-card rounded-[20px] border px-4 py-3 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]';

export const LOG_PANEL_CLASS =
  'video-pipeline-log-surface rounded-[22px] border p-4 text-xs shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]';

export const INSET_PANEL_CLASS =
  'video-pipeline-inset rounded-[22px] border border-dashed p-4';

export const TABLE_SHELL_CLASS = `${SURFACE_CARD_CLASS} video-pipeline-table-shell overflow-x-auto`;

export const INPUT_CLASS =
  'video-pipeline-input w-full rounded-[18px] border px-3.5 py-2.5 text-sm outline-none transition focus:ring-4 focus:ring-sky-400/10';

export const TEXTAREA_CLASS = `${INPUT_CLASS} min-h-[108px] resize-y`;

export function formatNumber(value) {
  if (value == null) return '0';
  if (typeof value === 'number') return value.toLocaleString();
  return value;
}

export function formatDate(value) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString();
}

export function getActionButtonClass(tone = 'slate', extraClassName = '') {
  const toneClass = {
    violet: 'video-pipeline-action-violet',
    sky: 'video-pipeline-action-sky',
    amber: 'video-pipeline-action-amber',
    emerald: 'video-pipeline-action-emerald',
    rose: 'video-pipeline-action-rose',
    slate: 'video-pipeline-action-slate',
  }[tone] || 'video-pipeline-action-slate';

  return `video-pipeline-action ${toneClass} inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-[13px] font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${extraClassName}`.trim();
}

export function toneFromStatus(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized.includes('failed') || normalized.includes('error')) return 'rose';
  if (normalized.includes('done') || normalized.includes('ready') || normalized.includes('completed') || normalized.includes('uploaded') || normalized.includes('active') || normalized.includes('healthy') || normalized.includes('verified')) return 'emerald';
  if (normalized.includes('pending') || normalized.includes('processing') || normalized.includes('queued') || normalized.includes('warning')) return 'amber';
  if (normalized.includes('not yet') || normalized.includes('idle') || normalized.includes('inactive') || normalized.includes('skipped') || normalized.includes('none')) return 'violet';
  return 'slate';
}

export function StatusPill({ children, tone = 'sky' }) {
  const toneClass = {
    sky: 'video-pipeline-pill-sky',
    emerald: 'video-pipeline-pill-emerald',
    amber: 'video-pipeline-pill-amber',
    violet: 'video-pipeline-pill-violet',
    slate: 'video-pipeline-pill-slate',
    rose: 'video-pipeline-pill-rose',
  }[tone] || 'video-pipeline-pill-slate';

  return (
    <span className={`video-pipeline-status-pill inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${toneClass}`}>
      {children}
    </span>
  );
}

export function SourcePill({ source }) {
  const normalized = String(source || '').toLowerCase();
  const tone = {
    playboard: 'sky',
    youtube: 'violet',
    dailyhaha: 'amber',
    douyin: 'violet',
    facebook: 'sky',
  }[normalized] || 'slate';

  return <StatusPill tone={tone}>{source || 'unknown'}</StatusPill>;
}

export function MetricCard({ title, value, helper, icon: Icon, tone = 'sky' }) {
  return (
    <div className={`${SURFACE_CARD_CLASS} video-pipeline-metric-card video-pipeline-metric-${tone} p-4`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{title}</p>
          <p className="mt-2 text-[30px] font-semibold leading-none text-white">{formatNumber(value)}</p>
          {helper ? <p className="mt-2 max-w-[22ch] text-[12px] leading-5 text-slate-400">{helper}</p> : null}
        </div>
        {Icon ? (
          <div className="video-pipeline-metric-icon flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/80">
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function SectionHeader({ title, subtitle, actions = null }) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        <h3 className="text-[1.05rem] font-semibold text-white">{title}</h3>
        {subtitle ? <p className="mt-1 max-w-3xl text-[13px] leading-6 text-slate-400">{subtitle}</p> : null}
      </div>
      {actions}
    </div>
  );
}

