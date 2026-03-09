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
    <div className="video-pipeline-shell image-generation-shell -mx-5 -mb-5 -mt-5 grid min-h-0 min-w-0 grid-rows-[auto,minmax(0,1fr)] overflow-x-hidden overflow-y-hidden text-slate-100 min-[968px]:-mx-6 min-[968px]:-mb-6 min-[968px]:-mt-6" data-main-body>
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

      <div className="mx-auto grid h-full min-h-0 min-w-0 max-w-[1720px] grid-cols-1 gap-4 overflow-x-hidden px-2.5 pb-3 pt-0 min-[968px]:grid-cols-[192px_minmax(0,1fr)] min-[968px]:px-3.5 min-[968px]:pb-3.5">
        <aside className="studio-card-shell h-fit self-start rounded-[22px] p-2.5 min-[968px]:sticky min-[968px]:top-0">
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/video-pipeline'}
                  className={({ isActive }) =>
                    `group flex items-center gap-2.5 rounded-[18px] border px-2.5 py-2 text-[12px] font-medium leading-4 transition ${
                      isActive
                        ? 'apple-option-chip selected apple-option-chip-selected apple-option-chip-cool border-sky-300/45 bg-sky-100/90 text-sky-950 shadow-[0_10px_24px_rgba(14,165,233,0.18)]'
                        : 'apple-option-chip text-slate-700 hover:text-slate-900'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[14px] border transition ${
                          isActive
                            ? 'border-sky-300/55 bg-white/75 text-sky-700 shadow-[0_8px_18px_rgba(96,165,250,0.2)]'
                            : 'border-white/20 bg-white/30 text-slate-500 group-hover:text-slate-700'
                        }`}
                      >
                        <Icon className={`h-[15px] w-[15px] ${isActive ? 'stroke-[2.4] text-sky-700' : ''}`} />
                      </span>
                      <span className="min-w-0 truncate">{item.label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </aside>

        <main className="min-h-0 min-w-0 space-y-4 overflow-x-hidden overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
