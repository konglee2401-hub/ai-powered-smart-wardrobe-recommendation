import React, { useEffect, useMemo, useState } from 'react';
import { Link, matchPath, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Globe,
  Image,
  Menu,
  MoonStar,
  Sparkles,
  SunMedium,
  X,
  Video,
  Volume2,
} from 'lucide-react';

import { navGroups } from '../config/appRoutes';

const baseLinkClass =
  'group flex items-center gap-2 rounded-[0.95rem] px-2 py-1.5 text-[13px] transition-all duration-300 border border-transparent';

export default function Navbar({ theme = 'light', onToggleTheme }) {
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isGenerationMenuOpen, setIsGenerationMenuOpen] = useState(true);

  const currentLang = i18n.language?.startsWith('vi') ? 'vi' : 'en';
  const currentLangLabel = currentLang.toUpperCase();
  const isLightTheme = theme === 'light';

  const generationSubmenuPaths = useMemo(
    () => ['/', '/video-generation', '/voice-over', '/generate/one-click'],
    [],
  );

  const isNavItemActive = (item) => (
    !!matchPath({ path: item.path, end: item.path !== '/characters' }, location.pathname)
      || (item.path === '/characters' && location.pathname.startsWith('/characters'))
      || (item.path === '/video-pipeline' && location.pathname.startsWith('/video-pipeline'))
  );

  const generationSubmenuItems = useMemo(
    () => [
      { path: '/', label: t('navbar.image'), icon: Image, tone: 'sky' },
      { path: '/video-generation', label: t('navbar.video'), icon: Video, tone: 'navy' },
      { path: '/voice-over', label: t('navbar.voiceover'), icon: Volume2, tone: 'red' },
      { path: '/generate/one-click', label: t('navbar.oneClick'), icon: Sparkles, tone: 'violet' },
    ],
    [t],
  );

  const isGenerationMenuActive = generationSubmenuItems.some((item) => isNavItemActive(item));

  useEffect(() => {
    if (isGenerationMenuActive) {
      setIsGenerationMenuOpen(true);
    }
  }, [isGenerationMenuActive]);

  const toggleLanguage = async () => {
    const nextLang = currentLang === 'vi' ? 'en' : 'vi';

    try {
      await i18n.changeLanguage(nextLang);
      toast.success(`Switch Language to ${nextLang.toUpperCase()}`);
    } catch (error) {
      toast.error(`Failed to switch language to ${nextLang.toUpperCase()}`);
    }
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
    const isActive = isNavItemActive(item);

    return (
      <Link
        key={item.path}
        to={item.path}
        onClick={() => setIsMobileOpen(false)}
        className={`${baseLinkClass} ${
          isActive
            ? `${isLightTheme ? 'apple-sidebar-link-active text-slate-900 shadow-[0_8px_18px_rgba(0,0,0,0.04)]' : 'apple-sidebar-link-active text-white shadow-[0_12px_28px_rgba(8,18,34,0.24)]'}`
            : `${isLightTheme ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-900/[0.03]' : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'}`
        } ${isCollapsed ? 'justify-center px-2.5' : ''}`}
        title={isCollapsed ? item.label : ''}
      >
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-transparent transition-all duration-300 ${
            isActive
              ? `${isLightTheme ? 'bg-slate-900/[0.04] text-slate-700 shadow-[0_6px_14px_rgba(0,0,0,0.04)]' : 'bg-sky-300 text-slate-950 shadow-[0_10px_24px_rgba(125,211,252,0.24)]'}`
              : `${isLightTheme ? 'bg-slate-900/[0.03] text-slate-500 group-hover:bg-slate-900/[0.05] group-hover:text-slate-900' : 'bg-white/[0.05] text-slate-200 group-hover:bg-white/[0.11] group-hover:text-white'}`
          }`}
        >
          <Icon className="h-4 w-4 shrink-0" />
        </span>
        {!isCollapsed && <span className="truncate">{item.label}</span>}
      </Link>
    );
  };

  const renderGenerationSubmenu = () => {
    if (isCollapsed) {
      return (
        <button
          type="button"
          onClick={() => {
            setIsCollapsed(false);
            setIsGenerationMenuOpen(true);
          }}
          className={`mx-auto flex h-12 w-12 items-center justify-center rounded-[1rem] border border-transparent transition ${
            isGenerationMenuActive
              ? `${isLightTheme ? 'apple-sidebar-link-active text-slate-900 shadow-[0_8px_18px_rgba(0,0,0,0.04)]' : 'apple-sidebar-link-active text-white shadow-[0_12px_28px_rgba(8,18,34,0.24)]'}`
              : `${isLightTheme ? 'bg-slate-900/[0.03] text-slate-600 hover:bg-slate-900/[0.06] hover:text-slate-900' : 'bg-white/[0.05] text-slate-200 hover:bg-white/[0.1] hover:text-white'}`
          }`}
          title="AI Generation"
          aria-label="Open AI Generation menu"
        >
          <Sparkles className="h-4 w-4" />
        </button>
      );
    }

    return (
      <div className="apple-nav-nest rounded-[1.4rem] p-2.5">
        <button
          type="button"
          onClick={() => setIsGenerationMenuOpen((prev) => !prev)}
          className={`apple-nav-nest-trigger apple-nav-nest-trigger-root flex w-full items-center justify-between gap-3 rounded-[1rem] px-2.5 py-2.5 text-left text-sm font-semibold ${
            isGenerationMenuActive ? 'apple-nav-nest-trigger-active' : ''
          }`}
        >
          <span className="flex items-center gap-2.5">
            <span className="apple-nav-nest-inline-icon">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <span>
              <span className={`block text-[11px] uppercase tracking-[0.22em] ${isLightTheme ? 'text-slate-400' : 'text-violet-200/45'}`}>
                Workspace
              </span>
              <span className={`block whitespace-nowrap text-sm ${isLightTheme ? 'text-slate-900' : 'text-white'}`}>AI Generation</span>
            </span>
          </span>
          {isGenerationMenuOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {isGenerationMenuOpen && (
          <div className="apple-nav-subtree mt-2.5 space-y-1.5">
            {generationSubmenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = isNavItemActive(item);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileOpen(false)}
                  className={`apple-nav-subitem apple-nav-subitem-${item.tone} ${isActive ? 'apple-nav-subitem-active' : ''}`}
                >
                  <span className="apple-nav-subitem-icon">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <button
        className={`fixed left-4 top-4 z-50 rounded-2xl border border-transparent p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl lg:hidden ${
          isLightTheme ? 'bg-white/95 text-slate-900 shadow-[0_8px_18px_rgba(0,0,0,0.05)]' : 'bg-white/[0.07] text-slate-100'
        }`}
        onClick={() => setIsMobileOpen((prev) => !prev)}
        aria-label="Toggle navigation"
      >
        {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {isMobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/55 backdrop-blur-md lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        className={`app-sidebar fixed z-40 h-[100dvh] transition-all duration-300 lg:relative lg:left-0 lg:h-auto lg:self-stretch ${
          isCollapsed ? 'w-[88px]' : 'w-[238px]'
        } ${isMobileOpen ? 'left-0' : '-left-full lg:left-0'}`}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <div className="flex h-full flex-col">
          <div className={`relative flex items-center gap-2 px-3 py-3 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
            <Link
              to="/"
              className={`flex items-center gap-3 ${isCollapsed ? 'w-full justify-center' : ''}`}
              onClick={() => setIsMobileOpen(false)}
            >
              <div className="apple-logo-chip flex-shrink-0 rounded-xl p-1.5">
                <Sparkles className={`h-4 w-4 ${isLightTheme ? 'text-sky-700' : 'text-white'}`} />
              </div>
              {!isCollapsed && (
                <div className="flex-1">
                  <p className={`truncate text-sm font-semibold ${isLightTheme ? 'text-slate-900' : 'text-white'}`}>Smart Wardrobe</p>
                  <p className={`truncate text-xs ${isLightTheme ? 'text-slate-500' : 'text-violet-200/80'}`}>AI Creative Studio</p>
                </div>
              )}
            </Link>
            <button
              onClick={() => setIsCollapsed((prev) => !prev)}
              className={`hidden rounded-2xl border border-transparent p-1.5 transition lg:block ${
                isLightTheme ? 'bg-slate-900/[0.04] text-slate-600 hover:bg-slate-900/[0.08]' : 'bg-white/[0.05] text-slate-200 hover:bg-white/[0.1]'
              } ${
                isCollapsed && !isHovering ? 'pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 opacity-0' : 'opacity-100'
              }`}
              aria-label="Collapse sidebar"
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-2 py-2.5">
            {renderGenerationSubmenu()}
            {localizedNavGroups.map((group) => {
              const filteredItems = group.items.filter((item) => !generationSubmenuPaths.includes(item.path));

              if (!filteredItems.length) return null;

              return (
              <div key={group.title}>
                {!isCollapsed && (
                  <p className={`px-1.5 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${isLightTheme ? 'text-slate-400' : 'text-violet-200/45'}`}>
                    {group.title}
                  </p>
                )}
                <div className="space-y-1.5">{filteredItems.map(renderLink)}</div>
              </div>
              );
            })}
          </div>

          <div className="space-y-2 p-2">
            <button
              onClick={onToggleTheme}
              className={`w-full rounded-2xl border border-transparent px-3 py-2.5 text-sm transition ${
                isLightTheme ? 'bg-slate-900/[0.04] hover:bg-slate-900/[0.08]' : 'bg-white/[0.05] hover:bg-white/[0.1]'
              } ${
                isCollapsed ? `flex items-center justify-center gap-2 px-2 ${isLightTheme ? 'text-slate-900' : 'text-slate-100'}` : `flex items-center justify-between ${isLightTheme ? 'text-slate-900' : 'text-slate-100'}`
              }`}
              title={isCollapsed ? `Switch to ${isLightTheme ? 'dark' : 'light'} mode` : ''}
            >
              <span className="flex items-center gap-2">
                {isLightTheme ? <MoonStar className="h-4 w-4" /> : <SunMedium className="h-4 w-4" />}
                {!isCollapsed && <span>{isLightTheme ? 'Light mode' : 'Dark mode'}</span>}
              </span>
              {!isCollapsed && (
                <span className={`font-semibold ${isLightTheme ? 'text-slate-600' : 'text-violet-100'}`}>
                  {isLightTheme ? 'LIGHT' : 'DARK'}
                </span>
              )}
            </button>
            <button
              onClick={toggleLanguage}
              className={`w-full rounded-2xl border border-transparent px-3 py-2.5 text-sm transition ${
                isLightTheme ? 'bg-slate-900/[0.04] text-slate-900 hover:bg-slate-900/[0.08]' : 'bg-white/[0.05] text-slate-100 hover:bg-white/[0.1]'
              } ${
                isCollapsed ? 'flex items-center justify-center gap-2 px-2' : 'flex items-center justify-between'
              }`}
              title={isCollapsed ? `Switch Language (${currentLangLabel})` : ''}
            >
              <span className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                {!isCollapsed && <span>{t('language.switchLanguage')}</span>}
              </span>
              <span className={`font-semibold ${isLightTheme ? 'text-slate-600' : 'text-violet-100'}`}>
                {currentLangLabel}
              </span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
