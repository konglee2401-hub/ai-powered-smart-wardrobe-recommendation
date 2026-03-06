import React, { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Sparkles,
  Clock,
  BarChart3,
  Zap,
  FileText,
  LayoutDashboard,
  Layers,
  Image,
  TrendingUp,
  Settings,
  Gauge,
  Menu,
  X,
  Video,
  Film,
  BookOpen,
  Volume2,
  Globe,
  ChevronLeft,
  ChevronRight,
  UserRound,
} from 'lucide-react';

const baseLinkClass =
  'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors border border-transparent';

export default function Navbar() {
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const currentLang = i18n.language?.startsWith('vi') ? 'vi' : 'en';

  const toggleLanguage = () => {
    i18n.changeLanguage(currentLang === 'vi' ? 'en' : 'vi');
  };

  const navGroups = useMemo(
    () => [
      {
        title: t('navbar.generate'),
        items: [
          { path: '/', label: t('navbar.image'), icon: Image },
          { path: '/video-generation', label: t('navbar.video'), icon: Video },
          { path: '/voice-over', label: t('navbar.voiceover'), icon: Volume2 },
          { path: '/generate/one-click', label: t('navbar.oneClick'), icon: Sparkles },
          { path: '/characters', label: 'Characters', icon: UserRound },
          { path: '/video-production', label: t('navbar.videoProduction'), icon: Film },
        ],
      },
      {
        title: t('navbar.media'),
        items: [
          { path: '/gallery', label: t('navbar.gallery'), icon: Image },
          { path: '/history', label: t('navbar.history'), icon: Clock },
          { path: '/batch', label: t('navbar.batchProcessing'), icon: Layers },
        ],
      },
      {
        title: t('navbar.analytics'),
        items: [
          { path: '/dashboard', label: t('navbar.dashboard'), icon: LayoutDashboard },
          { path: '/stats', label: t('navbar.statistics'), icon: BarChart3 },
          { path: '/analytics', label: t('navbar.analytics'), icon: TrendingUp },
        ],
      },
      {
        title: t('navbar.tools'),
        items: [
          { path: '/prompt-builder', label: t('navbar.promptBuilder'), icon: FileText },
          { path: '/prompt-templates', label: t('navbar.promptTemplates'), icon: BookOpen },
          { path: '/video-script-generator', label: t('navbar.videoScriptGenerator'), icon: Film },
          { path: '/tester', label: t('navbar.providerTester'), icon: Zap },
          { path: '/performance', label: t('navbar.performance'), icon: Gauge },
          { path: '/shorts-reels/dashboard', label: 'Shorts/Reels', icon: TrendingUp },
        ],
      },
      {
        title: t('navbar.settings'),
        items: [
          { path: '/options', label: t('navbar.options'), icon: Settings },
          { path: '/customization', label: t('navbar.customization'), icon: Sparkles },
          { path: '/setup-authentication', label: t('navbar.setupAuthentication'), icon: Gauge },
          { path: '/admin/providers', label: t('navbar.aiProviders'), icon: Zap },
        ],
      },

    ],
    [t],
  );

  const renderLink = (item) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.path;

    return (
      <Link
        key={item.path}
        to={item.path}
        onClick={() => setIsMobileOpen(false)}
        className={`${baseLinkClass} ${
          isActive
            ? 'bg-gradient-to-r from-fuchsia-600/70 to-purple-600/60 text-white border-fuchsia-400/40 shadow-[0_0_0_1px_rgba(192,132,252,0.15)]'
            : 'text-slate-300 hover:text-white hover:bg-[#242734]'
        } ${isCollapsed ? 'justify-center px-2.5' : ''}`}
        title={isCollapsed ? item.label : ''}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {!isCollapsed && <span className="truncate">{item.label}</span>}
      </Link>
    );
  };

  return (
    <>
      <button
        className="lg:hidden fixed left-4 top-4 z-50 rounded-lg border border-[#313542] bg-[#1b1e27] p-2 text-slate-200"
        onClick={() => setIsMobileOpen((prev) => !prev)}
        aria-label="Toggle navigation"
      >
        {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {isMobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed z-40 h-screen border-r border-[#2c303c] bg-[#14161d] transition-all duration-300 lg:static ${
          isCollapsed ? 'w-[88px]' : 'w-[300px]'
        } ${isMobileOpen ? 'left-0' : '-left-full lg:left-0'}`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between gap-2 border-b border-[#2c303c] px-4 py-4">
            <Link to="/" className="flex flex-1 items-center gap-3 overflow-hidden min-w-0" onClick={() => setIsMobileOpen(false)}>
              <div className="flex-shrink-0 rounded-xl bg-gradient-to-br from-fuchsia-600 to-violet-500 p-2">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white truncate">Smart Wardrobe</p>
                  <p className="text-xs text-slate-400 truncate">AI Creative Studio</p>
                </div>
              )}
            </Link>
            <button
              onClick={() => setIsCollapsed((prev) => !prev)}
              className="hidden flex-shrink-0 rounded-lg border border-[#313542] bg-[#1c1f29] p-1.5 text-slate-300 transition hover:bg-[#252938] lg:block"
              aria-label="Collapse sidebar"
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
            {navGroups.map((group) => (
              <div key={group.title}>
                {!isCollapsed && (
                  <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    {group.title}
                  </p>
                )}
                <div className="space-y-1">{group.items.map(renderLink)}</div>
              </div>
            ))}
          </div>

          <div className="border-t border-[#2c303c] p-3">
            <button
              onClick={toggleLanguage}
              className={`w-full rounded-xl border border-[#313542] bg-[#1f2330] px-3 py-2 text-sm text-slate-200 transition hover:bg-[#2a3040] ${
                isCollapsed ? 'flex justify-center' : 'flex items-center justify-between'
              }`}
            >
              <span className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                {!isCollapsed && <span>{t('language.switchLanguage')}</span>}
              </span>
              {!isCollapsed && <span className="font-semibold">{currentLang === 'vi' ? 'VI' : 'EN'}</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
