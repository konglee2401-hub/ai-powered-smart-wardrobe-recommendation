/**
 * Navigation Bar Component - Responsive with Mobile Menu + Language Switcher
 */

import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Sparkles, Clock, BarChart3, Zap, FileText, LayoutDashboard, Layers, Image, TrendingUp, Settings, Gauge,
  Menu, X, ChevronDown, Video, Film, BookOpen, Volume2, Globe
} from 'lucide-react';

export default function Navbar() {
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState(null);

  const currentLang = i18n.language?.startsWith('vi') ? 'vi' : 'en';

  const toggleLanguage = () => {
    const newLang = currentLang === 'vi' ? 'en' : 'vi';
    i18n.changeLanguage(newLang);
  };

  // Primary navigation items (always visible)
  const primaryNavItems = [
    { 
      label: t('navbar.generate'), 
      icon: Sparkles, 
      category: 'main',
      submenu: [
        { path: '/', label: t('navbar.image'), icon: Image },
        { path: '/video-generation', label: t('navbar.video'), icon: Video },
        { path: '/voice-over', label: t('navbar.voiceover'), icon: Volume2 },
        { path: '/generate/one-click', label: t('navbar.oneClick'), icon: Sparkles },
      ]
    },
  ];

  // Media Management
  const mediaNavItems = [
    { path: '/gallery', label: t('navbar.gallery'), icon: Image, category: 'main' },
    { path: '/history', label: t('navbar.history'), icon: Clock, category: 'main' },
    { path: '/batch', label: t('navbar.batchProcessing'), icon: Layers },
  ];

  // Dashboard & Analytics
  const analyticsNavItems = [
    { path: '/dashboard', label: t('navbar.dashboard'), icon: LayoutDashboard, category: 'main' },
    { path: '/stats', label: t('navbar.statistics'), icon: BarChart3 },
    { path: '/analytics', label: t('navbar.analytics'), icon: TrendingUp },
  ];

  // Advanced Tools
  const advancedToolsNavItems = [
    { path: '/prompt-builder', label: t('navbar.promptBuilder'), icon: FileText },
    { path: '/prompt-templates', label: t('navbar.promptTemplates'), icon: BookOpen },
    { path: '/video-script-generator', label: t('navbar.videoScriptGenerator'), icon: Film },
    { path: '/tester', label: t('navbar.providerTester'), icon: Zap },
    { path: '/performance', label: t('navbar.performance'), icon: Gauge },
    { path: '/video-production', label: t('navbar.videoProduction'), icon: Film },
    { path: '/shorts-reels/dashboard', label: 'Shorts/Reels', icon: TrendingUp },
  ];

  // Settings items
  const settingsItems = [
    { path: '/customization', label: t('navbar.customization'), icon: Settings },
    { href: '/admin/providers', label: t('navbar.aiProviders'), icon: Sparkles, external: true },
  ];

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
    setExpandedMenu(null);
  };

  const toggleExpandedMenu = (menu) => {
    setExpandedMenu(expandedMenu === menu ? null : menu);
  };

  const NavLink = ({ item, onClick = null }) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.path || location.pathname === item.href;
    
    if (item.external) {
      return (
        <a
          href={item.href}
          className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-all text-sm whitespace-nowrap ${
            isActive
              ? 'bg-purple-600/30 text-purple-300 font-semibold border border-purple-500/50'
              : 'text-gray-300 hover:bg-gray-700 hover:text-white'
          }`}
          onClick={onClick}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Icon className="w-4 h-4" />
          <span>{item.label}</span>
        </a>
      );
    }

    return (
      <Link
        to={item.path}
        className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-all text-sm whitespace-nowrap ${
          isActive
            ? 'bg-purple-600/30 text-purple-300 font-semibold border border-purple-500/50'
            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
        }`}
        onClick={onClick}
      >
        <Icon className="w-4 h-4" />
        <span>{item.label}</span>
      </Link>
    );
  };

  return (
    <nav className="bg-gray-800 border-b border-gray-700 shadow-lg">
      <div className="w-full px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent hidden sm:inline">
              Smart Wardrobe
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {/* Primary Items - Generate */}
            {primaryNavItems.map((item) => 
              item.submenu ? (
                <div key="generate" className="relative group">
                  <button className="px-3 py-2 rounded-lg flex items-center gap-2 transition-all text-sm text-gray-300 hover:bg-gray-700 group-hover:bg-gray-700">
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <div className="absolute left-0 mt-0 w-40 bg-gray-800 border border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                    {item.submenu.map((sub) => (
                      <NavLink key={sub.path} item={sub} onClick={() => setMobileMenuOpen(false)} />
                    ))}
                  </div>
                </div>
              ) : (
                <NavLink key={item.path} item={item} />
              )
            )}

            {/* Media Management Dropdown */}
            <div className="relative group">
              <button className="px-3 py-2 rounded-lg flex items-center gap-2 transition-all text-sm text-gray-300 hover:bg-gray-700 group-hover:bg-gray-700">
                <Image className="w-4 h-4" />
                <span>{t('navbar.media')}</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              <div className="absolute left-0 mt-0 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                {mediaNavItems.map((item) => (
                  <NavLink key={item.path} item={item} onClick={() => setMobileMenuOpen(false)} />
                ))}
              </div>
            </div>

            {/* Dashboard & Analytics Dropdown */}
            <div className="relative group">
              <button className="px-3 py-2 rounded-lg flex items-center gap-2 transition-all text-sm text-gray-300 hover:bg-gray-700 group-hover:bg-gray-700">
                <LayoutDashboard className="w-4 h-4" />
                <span>{t('navbar.analytics')}</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              <div className="absolute left-0 mt-0 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                {analyticsNavItems.map((item) => (
                  <NavLink key={item.path} item={item} onClick={() => setMobileMenuOpen(false)} />
                ))}
              </div>
            </div>

            {/* Advanced Tools Dropdown */}
            <div className="relative group">
              <button className="px-3 py-2 rounded-lg flex items-center gap-2 transition-all text-sm text-gray-300 hover:bg-gray-700 group-hover:bg-gray-700">
                <Zap className="w-4 h-4" />
                <span>{t('navbar.tools')}</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              <div className="absolute left-0 mt-0 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                {advancedToolsNavItems.map((item) => (
                  <NavLink key={item.path} item={item} onClick={() => setMobileMenuOpen(false)} />
                ))}
              </div>
            </div>

            {/* Settings Dropdown */}
            <div className="relative group">
              <button className="px-3 py-2 rounded-lg flex items-center gap-2 transition-all text-sm text-gray-300 hover:bg-gray-700 group-hover:bg-gray-700">
                <Settings className="w-4 h-4" />
                <span>{t('navbar.settings')}</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              <div className="absolute right-0 mt-0 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                {settingsItems.map((item) => (
                  <NavLink key={item.path || item.href} item={item} onClick={() => setMobileMenuOpen(false)} />
                ))}
              </div>
            </div>
          </div>

          {/* Right: Language Switcher + Mobile Menu Button */}
          <div className="flex items-center gap-2">
            {/* Language Switcher Button */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white border border-gray-600 hover:border-purple-500"
              title={t('language.switchLanguage')}
            >
              <Globe className="w-4 h-4" />
              <span className="hidden sm:inline">{currentLang === 'vi' ? 'VI' : 'EN'}</span>
            </button>

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-gray-700 transition-all"
              onClick={toggleMobileMenu}
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6 text-gray-300" />
              ) : (
                <Menu className="w-6 h-6 text-gray-300" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-3 pb-3 border-t border-gray-700">
            <div className="space-y-1 mt-3">
              {/* Primary Items - Generate */}
              {primaryNavItems.map((item) =>
                item.submenu ? (
                  <div key="generate-mobile">
                    <button
                      className="w-full px-3 py-2 rounded-lg flex items-center justify-between text-sm font-medium text-gray-300 hover:bg-gray-700"
                      onClick={() => toggleExpandedMenu('generate')}
                    >
                      <span className="flex items-center gap-2">
                        <item.icon className="w-4 h-4" />
                        {item.label}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${expandedMenu === 'generate' ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {expandedMenu === 'generate' && (
                      <div className="pl-4 space-y-1 mt-1">
                        {item.submenu.map((sub) => (
                          <NavLink key={sub.path} item={sub} onClick={() => setMobileMenuOpen(false)} />
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <NavLink key={item.path} item={item} onClick={() => setMobileMenuOpen(false)} />
                )
              )}

              {/* Media Section */}
              <div>
                <button
                  className="w-full px-3 py-2 rounded-lg flex items-center justify-between text-sm font-medium text-gray-300 hover:bg-gray-700"
                  onClick={() => toggleExpandedMenu('media')}
                >
                  <span className="flex items-center gap-2">
                    <Image className="w-4 h-4" />
                    {t('navbar.media')}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${expandedMenu === 'media' ? 'rotate-180' : ''}`}
                  />
                </button>
                {expandedMenu === 'media' && (
                  <div className="pl-4 space-y-1 mt-1">
                    {mediaNavItems.map((item) => (
                      <NavLink key={item.path} item={item} onClick={() => setMobileMenuOpen(false)} />
                    ))}
                  </div>
                )}
              </div>

              {/* Analytics Section */}
              <div>
                <button
                  className="w-full px-3 py-2 rounded-lg flex items-center justify-between text-sm font-medium text-gray-300 hover:bg-gray-700"
                  onClick={() => toggleExpandedMenu('analytics')}
                >
                  <span className="flex items-center gap-2">
                    <LayoutDashboard className="w-4 h-4" />
                    {t('navbar.analytics')}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${expandedMenu === 'analytics' ? 'rotate-180' : ''}`}
                  />
                </button>
                {expandedMenu === 'analytics' && (
                  <div className="pl-4 space-y-1 mt-1">
                    {analyticsNavItems.map((item) => (
                      <NavLink key={item.path} item={item} onClick={() => setMobileMenuOpen(false)} />
                    ))}
                  </div>
                )}
              </div>

              {/* Advanced Tools Section */}
              <div>
                <button
                  className="w-full px-3 py-2 rounded-lg flex items-center justify-between text-sm font-medium text-gray-300 hover:bg-gray-700"
                  onClick={() => toggleExpandedMenu('tools')}
                >
                  <span className="flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    {t('navbar.tools')}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${expandedMenu === 'tools' ? 'rotate-180' : ''}`}
                  />
                </button>
                {expandedMenu === 'tools' && (
                  <div className="pl-4 space-y-1 mt-1">
                    {advancedToolsNavItems.map((item) => (
                      <NavLink key={item.path} item={item} onClick={() => setMobileMenuOpen(false)} />
                    ))}
                  </div>
                )}
              </div>

              {/* Settings Section */}
              <div>
                <button
                  className="w-full px-3 py-2 rounded-lg flex items-center justify-between text-sm font-medium text-gray-300 hover:bg-gray-700"
                  onClick={() => toggleExpandedMenu('settings')}
                >
                  <span className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    {t('navbar.settings')}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${expandedMenu === 'settings' ? 'rotate-180' : ''}`}
                  />
                </button>
                {expandedMenu === 'settings' && (
                  <div className="pl-4 space-y-1 mt-1">
                    {settingsItems.map((item) => (
                      <NavLink key={item.path || item.href} item={item} onClick={() => setMobileMenuOpen(false)} />
                    ))}
                  </div>
                )}
              </div>

              {/* Language Toggle in mobile */}
              <div className="pt-2 border-t border-gray-700">
                <button
                  onClick={toggleLanguage}
                  className="w-full px-3 py-2 rounded-lg flex items-center gap-2 text-sm text-gray-300 hover:bg-gray-700"
                >
                  <Globe className="w-4 h-4" />
                  <span>{currentLang === 'vi' ? t('language.en') : t('language.vi')}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
