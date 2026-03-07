import React, { useMemo, useState } from 'react';
import { Link, matchPath, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft,
  ChevronRight,
  Globe,
  Menu,
  Sparkles,
  X,
} from 'lucide-react';

import { navGroups } from '../config/appRoutes';

const baseLinkClass =
  'group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-all duration-300 border border-transparent';

export default function Navbar() {
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const currentLang = i18n.language?.startsWith('vi') ? 'vi' : 'en';

  const toggleLanguage = () => {
    i18n.changeLanguage(currentLang === 'vi' ? 'en' : 'vi');
  };

  const localizedNavGroups = useMemo(
    () => [
      ...navGroups.map((group) => ({
        title: t(group.titleKey),
        items: group.items.map((item) => ({
          ...item,
          label: item.label || t(item.labelKey),
        })),
      })),
    ],
    [t],
  );

  const renderLink = (item) => {
    const Icon = item.icon;
    const isActive = !!matchPath({ path: item.path, end: item.path !== '/characters' }, location.pathname)
      || (item.path === '/characters' && location.pathname.startsWith('/characters'))
      || (item.path === '/video-pipeline' && location.pathname.startsWith('/video-pipeline'));

    return (
      <Link
        key={item.path}
        to={item.path}
        onClick={() => setIsMobileOpen(false)}
        className={`${baseLinkClass} ${
          isActive
            ? 'apple-sidebar-link-active text-white border-white/15 shadow-[0_12px_28px_rgba(124,58,237,0.35)]'
            : 'text-slate-300 hover:text-white hover:bg-white/5 hover:border-white/10'
        } ${isCollapsed ? 'justify-center px-2.5' : ''}`}
        title={isCollapsed ? item.label : ''}
      >
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border transition-all duration-300 ${
            isActive
              ? 'border-amber-300/50 bg-amber-300 text-slate-950 shadow-[0_10px_24px_rgba(250,204,21,0.28)]'
              : 'border-white/10 bg-white/5 text-slate-200 group-hover:border-amber-200/25 group-hover:bg-amber-200/12 group-hover:text-amber-100'
          }`}
        >
          <Icon className="h-4 w-4 shrink-0" />
        </span>
        {!isCollapsed && <span className="truncate">{item.label}</span>}
      </Link>
    );
  };

  return (
    <>
      <button
        className="lg:hidden fixed left-4 top-4 z-50 rounded-xl border border-white/15 bg-slate-900/80 backdrop-blur-xl p-2 text-slate-100"
        onClick={() => setIsMobileOpen((prev) => !prev)}
        aria-label="Toggle navigation"
      >
        {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {isMobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/65 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        className={`app-sidebar fixed z-40 h-screen transition-all duration-300 lg:static ${
          isCollapsed ? 'w-[92px]' : 'w-[300px]'
        } ${isMobileOpen ? 'left-0' : '-left-full lg:left-0'}`}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <div className="flex h-full flex-col">
          <div className={`relative flex items-center gap-2 border-b border-white/10 px-4 py-4 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
            <Link
              to="/"
              className={`flex items-center gap-3 ${isCollapsed ? 'w-full justify-center' : ''}`}
              onClick={() => setIsMobileOpen(false)}
            >
              <div className="apple-logo-chip flex-shrink-0 rounded-2xl p-2">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              {!isCollapsed && (
                <div className="flex-1">
                  <p className="truncate text-sm font-semibold text-white">Smart Wardrobe</p>
                  <p className="truncate text-xs text-violet-200/80">AI Creative Studio</p>
                </div>
              )}
            </Link>
            <button
              onClick={() => setIsCollapsed((prev) => !prev)}
              className={`hidden rounded-xl border border-white/15 bg-white/5 p-1.5 text-slate-200 transition hover:bg-white/10 lg:block ${
                isCollapsed && !isHovering ? 'pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 opacity-0' : 'opacity-100'
              }`}
              aria-label="Collapse sidebar"
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
            {localizedNavGroups.map((group) => (
              <div key={group.title}>
                {!isCollapsed && (
                  <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-200/45">
                    {group.title}
                  </p>
                )}
                <div className="space-y-1.5">{group.items.map(renderLink)}</div>
              </div>
            ))}
          </div>

          <div className="border-t border-white/10 p-3">
            <button
              onClick={toggleLanguage}
              className={`w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 transition hover:bg-white/10 ${
                isCollapsed ? 'flex justify-center' : 'flex items-center justify-between'
              }`}
            >
              <span className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                {!isCollapsed && <span>{t('language.switchLanguage')}</span>}
              </span>
              {!isCollapsed && (
                <span className="font-semibold text-violet-100">
                  {currentLang === 'vi' ? 'VI' : 'EN'}
                </span>
              )}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
