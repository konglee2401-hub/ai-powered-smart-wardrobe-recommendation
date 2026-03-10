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
  compactNav = false,
}) {
  return (
    <div className="video-pipeline-shell image-generation-shell -mx-5 -mb-5 -mt-5 grid min-h-0 min-w-0 grid-rows-[auto,minmax(0,1fr)] overflow-hidden text-slate-100 min-[968px]:-mx-6 min-[968px]:-mb-6 min-[968px]:-mt-6" data-main-body>
      <PageHeaderBar
        icon={<Workflow className="h-4 w-4 text-sky-400" />}
        title={title}
        subtitle={subtitle}
        meta={meta}
        actions={actions}
        className="h-16 min-[968px]:h-[72px] video-pipeline-header"
        contentClassName="mx-auto max-w-[1760px] px-3 min-[968px]:px-4"
      />

      <div className={`mx-auto grid h-full min-h-0 min-w-0 max-w-[1760px] grid-cols-1 gap-4 overflow-hidden px-3 pb-3 pt-3 min-[968px]:px-4 min-[968px]:pb-4 ${compactNav ? 'min-[968px]:grid-cols-[128px_minmax(0,1fr)]' : 'min-[968px]:grid-cols-[228px_minmax(0,1fr)]'}`}>
        <aside className={`video-pipeline-nav-shell studio-card-shell flex min-h-0 flex-col overflow-hidden rounded-[26px] p-2.5 min-[968px]:sticky min-[968px]:top-0 ${compactNav ? 'video-pipeline-nav-compact' : ''}`}>
          {compactNav ? (
            <div className="video-pipeline-nav-intro rounded-[18px] border border-white/8 px-2 py-2 text-center">
              <p className="video-pipeline-kicker text-[10px]">Nav</p>
              <h2 className="mt-1 text-[11px] font-semibold text-white">Pipeline</h2>
            </div>
          ) : (
            <div className="video-pipeline-nav-intro rounded-[18px] border border-white/8 px-3 py-2.5">
              <p className="video-pipeline-kicker">Workspace</p>
              <h2 className="mt-1.5 text-sm font-semibold text-white">Pipeline Sections</h2>
            </div>
          )}

          <nav className={`mt-2.5 min-h-0 space-y-1 overflow-y-auto ${compactNav ? 'pr-0' : 'pr-1'}`}>
            {navItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/video-pipeline'}
                  className={({ isActive }) =>
                    `video-pipeline-nav-link group flex items-center ${compactNav ? 'flex-col gap-1 px-2 py-2.5 text-[10px]' : 'gap-2.5 px-2.5 py-2 text-[12px]'} rounded-[18px] border font-medium leading-4 transition ${
                      isActive ? 'video-pipeline-nav-link-active' : ''
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span className={`video-pipeline-nav-index inline-flex min-w-[1.5rem] justify-center text-[10px] font-semibold uppercase tracking-[0.18em] ${isActive ? 'text-sky-100' : 'text-slate-500'} ${compactNav ? 'order-2 min-w-0' : ''}`}>
                        {compactNav ? String(index + 1) : String(index + 1).padStart(2, '0')}
                      </span>
                      <span
                        className={`video-pipeline-nav-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-[14px] border transition ${
                          isActive
                            ? 'border-sky-300/45 bg-sky-300/16 text-sky-100 shadow-[0_10px_24px_rgba(56,189,248,0.18)]'
                            : 'border-white/10 bg-white/[0.03] text-slate-400 group-hover:text-slate-100'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      {compactNav ? (
                        <span className="min-w-0 truncate text-[10px] uppercase tracking-[0.14em] text-slate-400">{item.shortLabel || item.label?.slice(0, 3)}</span>
                      ) : (
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </aside>

        <main className="video-pipeline-main min-h-0 min-w-0 space-y-4 overflow-x-hidden overflow-y-auto pb-1">
          {children}
        </main>
      </div>
    </div>
  );
}

