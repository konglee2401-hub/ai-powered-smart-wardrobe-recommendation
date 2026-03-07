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
    <div className="-mx-5 -mt-5 min-h-screen overflow-x-hidden min-[968px]:-mx-6 min-[968px]:-mt-6 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.18),transparent_24%),radial-gradient(circle_at_84%_14%,rgba(250,204,21,0.14),transparent_22%),radial-gradient(circle_at_72%_75%,rgba(125,211,252,0.14),transparent_22%),linear-gradient(180deg,#020617_0%,#0f172a_44%,#111827_100%)] text-slate-100">
      <PageHeaderBar
        icon={<Workflow className="h-4 w-4 text-violet-100" />}
        title={title}
        subtitle={subtitle}
        meta={meta}
        actions={actions}
        className="h-16 min-[968px]:h-[72px] border-b border-white/10 bg-[linear-gradient(90deg,rgba(6,10,20,0.18),rgba(15,23,42,0.10),rgba(17,24,39,0.05))] backdrop-blur-md"
        contentClassName="mx-auto max-w-[1720px] px-2.5 min-[968px]:px-3.5"
        iconClassName="border-violet-300/20 bg-violet-400/12"
      />

      <div className="mx-auto grid max-w-[1720px] grid-cols-1 gap-4 px-2.5 py-3 min-[968px]:grid-cols-[244px_minmax(0,1fr)] min-[968px]:px-3.5">
        <aside className="h-fit rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(30,41,59,0.82),rgba(15,23,42,0.94))] p-3 shadow-[0_24px_80px_rgba(2,6,23,0.34)] backdrop-blur min-[968px]:sticky min-[968px]:top-[84px]">
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
                        ? 'border-violet-300/35 bg-[linear-gradient(135deg,rgba(168,85,247,0.18),rgba(125,211,252,0.08),rgba(250,204,21,0.12))] text-white shadow-[0_0_0_1px_rgba(168,85,247,0.10),0_12px_30px_rgba(30,41,59,0.22)]'
                        : 'border-transparent text-slate-300 hover:border-white/10 hover:bg-white/[0.04] hover:text-white'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition ${
                          isActive
                            ? 'border-amber-300/55 bg-[linear-gradient(180deg,#facc15,#fbbf24)] text-[#2f2406] shadow-[0_12px_26px_rgba(250,204,21,0.24)]'
                            : 'border-white/10 bg-white/[0.05] text-slate-200 group-hover:border-amber-200/25 group-hover:bg-amber-200/12 group-hover:text-amber-100'
                        }`}
                      >
                        <Icon className={`h-4 w-4 ${isActive ? 'stroke-[2.4] text-[#2f2406]' : ''}`} />
                      </span>
                      <span className="truncate">{item.label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 space-y-4">{children}</main>
      </div>
    </div>
  );
}
