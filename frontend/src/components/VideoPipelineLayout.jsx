import React from 'react';
import { NavLink } from 'react-router-dom';
import { Workflow } from 'lucide-react';
import PageHeaderBar from './PageHeaderBar';

export default function VideoPipelineLayout({
  title,
  subtitle,
  meta,
  navItems,
  actions,
  children,
}) {
  return (
    <div className="image-generation-shell -mx-5 -mb-5 -mt-5 grid min-h-0 grid-rows-[auto,minmax(0,1fr)] overflow-hidden text-slate-100 min-[968px]:-mx-6 min-[968px]:-mb-6 min-[968px]:-mt-6" data-main-body>
      <PageHeaderBar
        icon={<Workflow className="h-4 w-4 text-sky-400" />}
        title={title}
        subtitle={subtitle}
        meta={meta}
        actions={actions}
        className="h-16 min-[968px]:h-[72px]"
        contentClassName="mx-auto max-w-[1720px] px-2.5 min-[968px]:px-3.5"
        iconClassName=""
      />

      <div className="mx-auto grid min-h-0 max-w-[1720px] grid-cols-1 gap-4 px-2.5 py-3 min-[968px]:grid-cols-[244px_minmax(0,1fr)] min-[968px]:px-3.5">
        <aside className="studio-card-shell h-fit rounded-[24px] p-3 min-[968px]:sticky min-[968px]:top-[84px]">
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/video-pipeline'}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 rounded-[22px] border px-3 py-3 text-[13px] transition ${
                      isActive
                        ? 'apple-option-chip apple-option-chip-selected apple-option-chip-cool text-slate-900'
                        : 'apple-option-chip text-slate-700 hover:text-slate-900'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition ${
                          isActive
                            ? 'border-sky-300/35 bg-white/50 text-sky-700 shadow-[0_12px_26px_rgba(96,165,250,0.18)]'
                            : 'border-white/20 bg-white/30 text-slate-500 group-hover:text-slate-700'
                        }`}
                      >
                        <Icon className={`h-4 w-4 ${isActive ? 'stroke-[2.4] text-sky-700' : ''}`} />
                      </span>
                      <span className="truncate">{item.label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 space-y-4 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
