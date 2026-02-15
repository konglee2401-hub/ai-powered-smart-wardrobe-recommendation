import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Sparkles, LogOut, Video, Film, History } from 'lucide-react';
import useAuthStore from '../../stores/useAuthStore';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: Home },
  { path: '/prompt-builder', label: 'Prompt Builder', icon: Video },
  { path: '/unified-generation', label: 'Create Video', icon: Film },
  { path: '/history', label: 'History', icon: History },
];

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <nav className="bg-white shadow-lg border-b-2 border-purple-100">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2">
            <Sparkles className="text-purple-600" size={28} />
            <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              AI Fashion Studio
            </span>
          </Link>
          
          {/* Navigation Links */}
          <div className="flex items-center gap-6">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-full font-semibold transition ${
                    active
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-600 hover:bg-purple-50 hover:text-purple-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
            
            {/* User Menu */}
            <div className="flex items-center gap-4 ml-4 pl-4 border-l-2 border-gray-200">
              <span className="text-sm text-gray-600">
                {user.email}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 font-semibold transition"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
          
        </div>
      </div>
    </nav>
  );
}
