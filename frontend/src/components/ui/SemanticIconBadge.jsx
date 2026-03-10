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

export default function SemanticIconBadge({ icon: Icon, tone = 'neutral', className = '' }) {
  const toneClass = TONE_CLASS[tone] || TONE_CLASS.neutral;

  return (
    <span className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${toneClass} ${className}`}>
      {Icon ? <Icon className="h-5 w-5" /> : null}
    </span>
  );
}

