import React from 'react';
import { Inbox } from 'lucide-react';
import SemanticIconBadge from './SemanticIconBadge';

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'Nothing here yet',
  description = 'This section will populate once data is available.',
  className = '',
  compact = false,
}) {
  return (
    <div className={`ui-empty-state rounded-3xl border border-slate-800/80 px-6 py-10 text-center shadow-[0_20px_60px_rgba(2,6,23,0.32)] ${compact ? 'py-8' : ''} ${className}`}>
      <div className="mx-auto flex max-w-md flex-col items-center">
        <SemanticIconBadge icon={Icon} tone="neutral" className="h-12 w-12" />
        <h3 className="mt-4 text-base font-semibold text-white">{title}</h3>
        <p className="mt-2 text-[13px] leading-6 text-slate-400">{description}</p>
      </div>
    </div>
  );
}
