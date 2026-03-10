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
  titleClassName = '',
  subtitleClassName = '',
  metaClassName = '',
}) {
  return (
    <div className={`apple-header-bar sticky top-0 app-layer-nav h-16 ${className}`}>
      <div className={`flex h-full w-full items-center justify-between gap-3 px-4 lg:px-4 ${contentClassName}`}>
        <div className="flex min-w-0 items-start gap-2.5">
          {icon ? (
            <div className={`apple-header-icon mt-0.5 rounded-xl p-2 ${iconClassName}`}>
              {icon}
            </div>
          ) : null}
          <div className="min-w-0">
            <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
              <h1 className={`apple-header-title text-[1.125rem] font-semibold leading-none text-white ${titleClassName}`}>{title}</h1>
              {subtitle ? <p className={`apple-header-subtitle text-xs text-gray-400 ${subtitleClassName}`}>{subtitle}</p> : null}
            </div>
            {meta ? <p className={`apple-header-meta mt-1 truncate text-[11px] text-gray-500 ${metaClassName}`}>{meta}</p> : null}
          </div>
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}


