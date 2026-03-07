import React from 'react';

export default function PageHeaderBar({
  icon,
  title,
  subtitle,
  meta,
  actions,
  className = '',
  contentClassName = '',
  iconClassName = '',
}) {
  return (
    <div className={`sticky top-0 z-40 h-14 border-b border-gray-800 bg-gray-900/50 backdrop-blur ${className}`}>
      <div className={`flex h-full w-full items-center justify-between gap-4 px-5 lg:px-6 ${contentClassName}`}>
        <div className="flex min-w-0 items-start gap-3">
          {icon ? (
            <div className={`mt-0.5 rounded-xl border border-white/10 bg-white/5 p-2 ${iconClassName}`}>
              {icon}
            </div>
          ) : null}
          <div className="min-w-0">
            <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
              <h1 className="text-xl font-bold leading-none text-white">{title}</h1>
              {subtitle ? <p className="text-xs text-gray-400">{subtitle}</p> : null}
            </div>
            {meta ? <p className="mt-1 truncate text-[11px] text-gray-500">{meta}</p> : null}
          </div>
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
