import React from 'react';

const TONE_CLASS = {
  info: 'border-cyan-400/30 bg-cyan-500/12 text-cyan-100',
  success: 'border-emerald-400/30 bg-emerald-500/12 text-emerald-100',
  warning: 'border-amber-400/30 bg-amber-500/12 text-amber-100',
  danger: 'border-rose-400/30 bg-rose-500/12 text-rose-100',
  accent: 'border-violet-400/30 bg-violet-500/12 text-violet-100',
  pink: 'border-pink-400/30 bg-pink-500/12 text-pink-100',
  neutral: 'border-slate-500/30 bg-slate-500/12 text-slate-200',
};

export default function StatusPill({ children, tone = 'neutral', className = '' }) {
  const toneClass = TONE_CLASS[tone] || TONE_CLASS.neutral;

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-medium ${toneClass} ${className}`}>
      {children}
    </span>
  );
}
