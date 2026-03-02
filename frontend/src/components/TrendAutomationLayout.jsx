import React from 'react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { label: 'Dashboard', to: '/shorts-reels/dashboard' },
  { label: 'Manual Scan', to: '/shorts-reels/dashboard#manual-scan' },
  { label: 'Videos', to: '/shorts-reels/videos' },
  { label: 'Channels', to: '/shorts-reels/channels' },
  { label: 'Schedule Settings', to: '/shorts-reels/settings' },
  { label: 'Logs', to: '/shorts-reels/logs' },
];

export default function TrendAutomationLayout({ title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-[1500px] mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        <aside className="bg-gray-900 border border-gray-800 rounded-2xl p-4 h-fit lg:sticky lg:top-6">
          <p className="text-xs uppercase tracking-widest text-gray-500">Trend automation</p>
          <h1 className="text-xl font-semibold mt-2">Shorts & Reels</h1>
          <nav className="mt-4 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-lg text-sm transition ${
                    isActive ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-800'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="space-y-4">
          <header>
            <h2 className="text-2xl font-bold">{title}</h2>
            {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
          </header>
          {children}
        </main>
      </div>
    </div>
  );
}
