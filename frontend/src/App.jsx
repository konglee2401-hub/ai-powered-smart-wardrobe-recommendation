import React, { Suspense, useEffect, useMemo, useState } from 'react';
import {
  BrowserRouter as Router,
  Navigate,
  Outlet,
  Route,
  Routes,
  matchPath,
  useLocation,
} from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import Navbar from './components/Navbar';
import { pageRoutes, redirectRoutes } from './config/appRoutes';

function PageTitle() {
  useEffect(() => {
    document.title = 'K-Creative Studio';
  }, []);

  return null;
}

function PageLayout({ theme, onToggleTheme }) {
  const location = useLocation();

  const contentClassName = useMemo(() => {
    const matchedRoute = pageRoutes.find((route) =>
      matchPath({ path: route.path, end: true }, location.pathname),
    );

    return matchedRoute?.contentClassName || 'overflow-y-auto';
  }, [location.pathname]);

  useEffect(() => {
    const mainScroller = document.querySelector('.app-main');
    if (mainScroller instanceof HTMLElement) {
      mainScroller.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname]);

  return (
    <div className={`app-shell theme-${theme} h-screen ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>
      <PageTitle />
      <div className="app-shell-stage lg:flex lg:h-full lg:overflow-hidden">
        <Navbar theme={theme} onToggleTheme={onToggleTheme} />
        <main className={`app-main min-h-0 flex-1 min-w-0 pt-14 lg:-ml-px lg:h-full lg:pt-0 ${contentClassName}`}>
          <div className="app-main-glow app-main-glow-top" />
          <div className="app-main-glow app-main-glow-bottom" />
          <div className="apple-page apple-typography">
            <div className="apple-content-frame min-h-full">
              <div className="apple-page-content">
                <Outlet />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-6">
      <div className="flat-panel flex items-center gap-3 rounded-3xl px-5 py-4 text-sm text-slate-200">
        <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-sky-400" />
        Loading workspace
      </div>
    </div>
  );
}

function App() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'dark';
    const initialTheme = window.localStorage.getItem('smart-wardrobe-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', initialTheme);
    return initialTheme;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    window.localStorage.setItem('smart-wardrobe-theme', theme);
  }, [theme]);

  const toasterStyle = useMemo(
    () => (theme === 'light'
      ? {
          borderRadius: '16px',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.96), rgba(244,247,251,0.98))',
          color: '#0f172a',
          border: '1px solid rgba(148,163,184,0.18)',
          boxShadow: '0 18px 38px rgba(148,163,184,0.18)',
        }
      : {
          borderRadius: '16px',
          background: 'linear-gradient(180deg, rgba(26,33,45,0.96), rgba(17,23,33,0.98))',
          color: '#eff4fb',
          border: '1px solid transparent',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 18px 38px rgba(2,6,23,0.22)',
        }),
    [theme],
  );

  return (
    <Router>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 2400,
          style: toasterStyle,
        }}
      />
      <Routes>
        <Route element={<PageLayout theme={theme} onToggleTheme={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))} />}>
          {pageRoutes.map(({ path, Component }) => (
            <Route
              key={path}
              path={path}
              element={(
                <Suspense fallback={<RouteFallback />}>
                  <Component />
                </Suspense>
              )}
            />
          ))}
        </Route>

        {redirectRoutes.map(({ path, to }) => (
          <Route key={path} path={path} element={<Navigate to={to} replace />} />
        ))}

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;

