/**
 * Navigation Bar Component - Responsive with Mobile Menu
 */

import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Sparkles, Clock, BarChart3, Zap, FileText, LayoutDashboard, Layers, Image, TrendingUp, Settings, Gauge,
  Menu, X, ChevronDown, Video, Film
} from 'lucide-react';

export default function Navbar() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState(null);

  // Primary navigation items (always visible)
  const primaryNavItems = [
    { 
      label: 'Generate', 
      icon: Sparkles, 
      category: 'main',
      submenu: [
        { path: '/', label: 'Image', icon: Image },
        { path: '/video-generation', label: 'Video', icon: Video },
        { path: '/generate/one-click', label: '1-Click Creator', icon: Sparkles },
      ]
    },
    { path: '/gallery', label: 'Gallery', icon: Image, category: 'main' },
    { path: '/history', label: 'History', icon: Clock, category: 'main' },
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, category: 'main' },
    { path: '/video-production', label: 'Video Production', icon: Film, category: 'main' },
  ];

  // Secondary navigation items (in Tools dropdown)
  const secondaryNavItems = [
    { path: '/batch', label: 'Batch Processing', icon: Layers },
    { path: '/stats', label: 'Statistics', icon: BarChart3 },
    { path: '/analytics', label: 'Analytics', icon: TrendingUp },
    { path: '/tester', label: 'Provider Tester', icon: Zap },
    { path: '/prompt-builder', label: 'Prompt Builder', icon: FileText },
  ];

  // Settings items
  const settingsItems = [
    { path: '/customization', label: 'Customization', icon: Settings },
    { path: '/performance', label: 'Performance', icon: Gauge },
    { href: '/admin/providers', label: 'AI Providers', icon: Sparkles, external: true },
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
          <div className="hidden lg:flex items-center gap-2">
            {/* Primary Items - with special handling for Generate */}
            {primaryNavItems.map((item) => 
              item.submenu ? (
                // Generate menu with submenu
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

            {/* Tools Dropdown */}
            <div className="relative group">
              <button className="px-3 py-2 rounded-lg flex items-center gap-2 transition-all text-sm text-gray-300 hover:bg-gray-700 group-hover:bg-gray-700">
                <Zap className="w-4 h-4" />
                <span>Tools</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              <div className="absolute right-0 mt-0 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                {secondaryNavItems.map((item) => (
                  <NavLink key={item.path} item={item} onClick={() => setMobileMenuOpen(false)} />
                ))}
              </div>
            </div>

            {/* Settings Dropdown */}
            <div className="relative group">
              <button className="px-3 py-2 rounded-lg flex items-center gap-2 transition-all text-sm text-gray-300 hover:bg-gray-700 group-hover:bg-gray-700">
                <Settings className="w-4 h-4" />
                <span>Settings</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              <div className="absolute right-0 mt-0 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                {settingsItems.map((item) => (
                  <NavLink key={item.path || item.href} item={item} onClick={() => setMobileMenuOpen(false)} />
                ))}
              </div>
            </div>
          </div>

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

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-3 pb-3 border-t border-gray-700">
            <div className="space-y-1 mt-3">
              {/* Primary Items */}
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

              {/* Tools Section */}
              <div>
                <button
                  className="w-full px-3 py-2 rounded-lg flex items-center justify-between text-sm font-medium text-gray-300 hover:bg-gray-700"
                  onClick={() => toggleExpandedMenu('tools')}
                >
                  <span className="flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Tools
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${expandedMenu === 'tools' ? 'rotate-180' : ''}`}
                  />
                </button>
                {expandedMenu === 'tools' && (
                  <div className="pl-4 space-y-1 mt-1">
                    {secondaryNavItems.map((item) => (
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
                    Settings
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
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
