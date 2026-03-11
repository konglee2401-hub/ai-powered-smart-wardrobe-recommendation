import React, { useEffect, useState, useMemo, useContext } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Workflow, ChevronDown, ChevronRight, ChevronLeft } from 'lucide-react';
import PageHeaderBar from './PageHeaderBar';
import { NavbarCollapseContext } from '../context/NavbarCollapseContext';

const baseLinkClass =
  'group flex items-center gap-2 rounded-[0.85rem] px-2 py-1 text-[12px] transition-all duration-300 border border-transparent';

export default function VideoPipelineLayout({
  title,
  subtitle,
  meta,
  navItems,
  actions,
  children,
  compactNav = false,
}) {
  const location = useLocation();
  const { setShouldCollapseNavbar } = useContext(NavbarCollapseContext) || {};
  const [isCollapsed, setIsCollapsed] = useState(true); // Default to collapsed

  // Collapse main navbar when entering video-pipeline
  useEffect(() => {
    if (setShouldCollapseNavbar) {
      setShouldCollapseNavbar(true);
    }
    return () => {
      if (setShouldCollapseNavbar) {
        setShouldCollapseNavbar(false);
      }
    };
  }, [setShouldCollapseNavbar]);

  // Group nav items into tree structure
  const groupedNavItems = useMemo(() => {
    return [
      {
        title: 'Pipeline Sections',
        items: navItems,
        id: 'pipeline',
        isRoot: true,
      },
    ];
  }, [navItems]);

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

      <div className={`mx-auto grid h-full min-h-0 min-w-0 max-w-[1760px] gap-4 overflow-hidden px-3 pb-3 pt-3 min-[968px]:px-4 min-[968px]:pb-4 ${
        isCollapsed 
          ? 'grid-cols-1 min-[968px]:grid-cols-[88px_minmax(0,1fr)]' 
          : 'grid-cols-1 min-[968px]:grid-cols-[238px_minmax(0,1fr)]'
      }`}>
        <aside 
          className={`video-pipeline-nav-shell studio-card-shell flex min-h-0 flex-col overflow-hidden rounded-[1.4rem] border border-black/[0.08] bg-white/[0.03] shadow-[0_0_0_1px_inset_rgba(255,255,255,0.05)] p-2.5 min-[968px]:sticky min-[968px]:top-0 backdrop-blur-sm transition-all duration-300`}
        >
          {/* Header with logo/title and toggle button */}
          <div className={`relative flex items-center gap-2 px-2 py-2 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
            {!isCollapsed && (
              <div className="video-pipeline-nav-intro rounded-2xl border border-transparent">
                <p className="video-pipeline-kicker text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-200/45">Workspace</p>
                <h2 className="mt-1 text-[11px] font-semibold text-white">Pipeline Sections</h2>
              </div>
            )}
            <button
              onClick={() => setIsCollapsed((prev) => !prev)}
              className="hidden rounded-2xl border border-transparent p-1.5 lg:block bg-white/[0.05] text-slate-200"
              aria-label="Collapse sidebar"
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>

          {/* Navigation items */}
          <nav className={`mt-3 min-h-0 space-y-2 overflow-y-auto ${isCollapsed ? 'pr-1' : 'pr-2'}`}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to || 
                              (item.to !== '/video-pipeline' && location.pathname.startsWith(item.to));
              
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/video-pipeline'}
                  className={`${baseLinkClass} ${
                    isActive 
                      ? 'apple-sidebar-link-active text-white shadow-[0_12px_28px_rgba(8,18,34,0.24)]' 
                      : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
                  } ${isCollapsed ? 'justify-center px-2.5 mx-auto' : ''}`}
                  title={isCollapsed ? item.label : ''}
                >
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-2xl border border-transparent transition-all duration-300 ${
                    isActive
                      ? 'bg-sky-300 text-slate-950 shadow-[0_10px_24px_rgba(125,211,252,0.24)]'
                      : 'text-slate-200 group-hover:bg-white/[0.11]'
                  }`}>
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                  </span>
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
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
