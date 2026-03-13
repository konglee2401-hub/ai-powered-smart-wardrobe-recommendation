import React, { useEffect, useRef, useState } from 'react';
import { CreditCard, LogOut, Settings, UserRound } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/useAuthStore';

export default function UserMenu({ compact = false }) {
  const { user, logout } = useAuthStore();
  const access = useAuthStore((state) => state.access);
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const planLabel =
    user?.subscription?.plan
    || user?.subscription?.tier
    || user?.plan?.name
    || user?.plan
    || access?.plan?.name
    || access?.plan
    || 'Free';

  return (
    <div ref={menuRef} className="relative user-menu">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className={`user-menu-button flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.08] px-3 py-2 text-sm text-slate-200 shadow-[0_10px_24px_rgba(8,18,34,0.25)] backdrop-blur-xl transition hover:bg-white/[0.14] ${
          compact ? 'user-menu-compact p-0 shadow-none border-transparent bg-transparent hover:bg-transparent' : ''
        }`}
        aria-label="User menu"
      >
        <span className={`user-menu-avatar flex items-center justify-center rounded-2xl bg-white/[0.12] text-slate-100 ${
          compact ? 'h-7 w-7 rounded-full bg-white/[0.08]' : 'h-9 w-9'
        }`}
        >
          <UserRound className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        </span>
        {!compact && (
          <div className="hidden flex-col text-left sm:flex">
            <span className="user-menu-kicker text-xs uppercase tracking-[0.18em] text-slate-400">Account</span>
            <span className="user-menu-name max-w-[140px] truncate text-sm font-semibold text-white">{user.name || user.email}</span>
          </div>
        )}
      </button>

      {open && (
        <div className="user-menu-dropdown absolute right-0 mt-3 w-60 rounded-[1.2rem] border border-white/10 bg-slate-950/90 p-2 text-sm text-slate-200 shadow-[0_18px_40px_rgba(2,6,23,0.35)] backdrop-blur-2xl">
          <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Signed in</p>
            <p className="mt-1 truncate text-sm font-semibold text-white">{user.email}</p>
            <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
              {planLabel}
            </div>
          </div>

          <div className="mt-2 space-y-1">
            <Link
              to="/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-slate-200 transition hover:bg-white/[0.08]"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
            <Link
              to="/plan"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-slate-200 transition hover:bg-white/[0.08]"
            >
              <CreditCard className="h-4 w-4" />
              Plan
            </Link>
            <button
              onClick={handleLogout}
              className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-rose-200 transition hover:bg-rose-400/10"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}