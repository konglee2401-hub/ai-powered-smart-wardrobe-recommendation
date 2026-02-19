/**
 * Navigation Bar Component - Responsive with Mobile Menu
 */

import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Sparkles, Clock, BarChart3, Zap, FileText, LayoutDashboard, Layers, Image, TrendingUp, Settings, Gauge,
  Menu, X, ChevronDown
} from 'lucide-react';

export default function Navbar() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState(null);

  // Primary navigation items (always visible)
  const primaryNavItems = [
    { path: '/', label: 'Generate', icon: Sparkles, category: 'main' },
    { path: '/gallery', label: 'Gallery', icon: Image, category: 'main' },
    { path: '/history', label: 'History', icon: Clock, category: 'main' },
  ];

  // Secondary navigation items (in Tools dropdown)
  const secondaryNavItems = [
    { path: '/batch', label: 'Batch Processing', icon: Layers },
    { path: '/stats', label: 'Statistics', icon: BarChart3 },
    { path: '/analytics', label: 'Analytics', icon: TrendingUp },
    { path: '/tester', label: 'Provider Tester', icon: Zap },
    { path: '/prompt-builder', label: 'Prompt Builder', icon: FileText },
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
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
              ? 'bg-purple-100 text-purple-700 font-semibold'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
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
            ? 'bg-purple-100 text-purple-700 font-semibold'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
        }`}
        onClick={onClick}
      >
        <Icon className="w-4 h-4" />
        <span>{item.label}</span>
      </Link>
    );
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="w-full px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent hidden sm:inline">
              Smart Wardrobe
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-2">
            {/* Primary Items */}
            {primaryNavItems.map((item) => (
              <NavLink key={item.path} item={item} />
            ))}

            {/* Tools Dropdown */}
            <div className="relative group">
              <button className="px-3 py-2 rounded-lg flex items-center gap-2 transition-all text-sm text-gray-600 hover:bg-gray-100 group-hover:bg-gray-100">
                <Zap className="w-4 h-4" />
                <span>Tools</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              <div className="absolute right-0 mt-0 w-48 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                {secondaryNavItems.map((item) => (
                  <NavLink key={item.path} item={item} onClick={() => setMobileMenuOpen(false)} />
                ))}
              </div>
            </div>

            {/* Settings Dropdown */}
            <div className="relative group">
              <button className="px-3 py-2 rounded-lg flex items-center gap-2 transition-all text-sm text-gray-600 hover:bg-gray-100 group-hover:bg-gray-100">
                <Settings className="w-4 h-4" />
                <span>Settings</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              <div className="absolute right-0 mt-0 w-48 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                {settingsItems.map((item) => (
                  <NavLink key={item.path || item.href} item={item} onClick={() => setMobileMenuOpen(false)} />
                ))}
              </div>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-all"
            onClick={toggleMobileMenu}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 text-gray-600" />
            ) : (
              <Menu className="w-6 h-6 text-gray-600" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-3 pb-3 border-t border-gray-200">
            <div className="space-y-1 mt-3">
              {/* Primary Items */}
              {primaryNavItems.map((item) => (
                <NavLink key={item.path} item={item} onClick={() => setMobileMenuOpen(false)} />
              ))}

              {/* Tools Section */}
              <div>
                <button
                  className="w-full px-3 py-2 rounded-lg flex items-center justify-between text-sm font-medium text-gray-600 hover:bg-gray-100"
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
                  className="w-full px-3 py-2 rounded-lg flex items-center justify-between text-sm font-medium text-gray-600 hover:bg-gray-100"
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
