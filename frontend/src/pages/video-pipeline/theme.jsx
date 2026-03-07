import React from 'react';

export const SURFACE_CARD_CLASS =
  'overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(17,24,39,0.88),rgba(15,23,42,0.96))] shadow-[0_24px_80px_rgba(15,23,42,0.28)] backdrop-blur';

export const INPUT_CLASS =
  'w-full rounded-2xl border border-slate-700/80 bg-slate-950/80 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-300/70 focus:ring-2 focus:ring-sky-400/10';

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
    violet: 'border-violet-300/30 bg-violet-400/14 text-violet-50 hover:bg-violet-400/22',
    sky: 'border-sky-300/30 bg-sky-300/14 text-sky-50 hover:bg-sky-300/22',
    amber: 'border-amber-300/30 bg-amber-300/16 text-amber-50 hover:bg-amber-300/22',
    emerald: 'border-emerald-300/30 bg-emerald-300/14 text-emerald-50 hover:bg-emerald-300/20',
    slate: 'border-slate-700/80 bg-slate-900/85 text-slate-100 hover:bg-slate-800/90',
  }[tone];

  return `inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-[13px] font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${toneClass} ${extraClassName}`.trim();
}

export function toneFromStatus(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized.includes('done') || normalized.includes('ready') || normalized.includes('uploaded') || normalized.includes('active') || normalized.includes('healthy') || normalized.includes('verified')) return 'emerald';
  if (normalized.includes('pending') || normalized.includes('processing') || normalized.includes('queued') || normalized.includes('warning')) return 'amber';
  if (normalized.includes('failed') || normalized.includes('error') || normalized.includes('inactive') || normalized.includes('skipped')) return 'violet';
  return 'sky';
}

export function StatusPill({ children, tone = 'sky' }) {
  const toneClass = {
    sky: 'border-sky-300/30 bg-sky-300/12 text-sky-100',
    emerald: 'border-emerald-300/30 bg-emerald-300/12 text-emerald-100',
    amber: 'border-amber-300/30 bg-amber-300/12 text-amber-100',
    violet: 'border-violet-300/30 bg-violet-300/14 text-violet-100',
    slate: 'border-slate-600/70 bg-slate-700/40 text-slate-200',
  }[tone] || 'border-slate-600/70 bg-slate-700/40 text-slate-200';

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${toneClass}`}>
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
  const accent = {
    sky: 'from-sky-300/16 to-sky-500/8',
    violet: 'from-violet-300/16 to-violet-500/8',
    amber: 'from-amber-300/18 to-amber-500/8',
    emerald: 'from-emerald-300/14 to-emerald-500/8',
  }[tone];

  return (
    <div className={`${SURFACE_CARD_CLASS} bg-gradient-to-br ${accent} p-4`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{title}</p>
          <p className="mt-2 text-[28px] font-semibold text-white">{formatNumber(value)}</p>
          {helper ? <p className="mt-1 text-[12px] text-slate-400">{helper}</p> : null}
        </div>
        {Icon ? <Icon className="h-5 w-5 text-white/80" /> : null}
      </div>
    </div>
  );
}

export function SectionHeader({ title, subtitle, actions = null }) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h3 className="text-base font-semibold text-white">{title}</h3>
        {subtitle ? <p className="mt-1 text-[13px] text-slate-400">{subtitle}</p> : null}
      </div>
      {actions}
    </div>
  );
}
