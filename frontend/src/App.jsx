import React, { Suspense, useEffect, useMemo } from 'react';
import {
  BrowserRouter as Router,
  Navigate,
  Outlet,
  Route,
  Routes,
  matchPath,
  useLocation,
} from 'react-router-dom';

import Navbar from './components/Navbar';
import { pageRoutes, redirectRoutes } from './config/appRoutes';

function PageTitle() {
  useEffect(() => {
    document.title = 'AI Creative Studio';
  }, []);

  return null;
}

function PageLayout() {
  const location = useLocation();

  const contentClassName = useMemo(() => {
    const matchedRoute = pageRoutes.find((route) =>
      matchPath({ path: route.path, end: true }, location.pathname),
    );

    return matchedRoute?.contentClassName || 'overflow-y-auto';
  }, [location.pathname]);

  return (
    <div className="app-shell h-screen text-slate-100 lg:flex">
      <PageTitle />
      <Navbar />
      <main className={`app-main h-screen flex-1 min-w-0 pt-14 lg:pt-0 ${contentClassName}`}>
        <div className="app-main-glow app-main-glow-top" />
        <div className="app-main-glow app-main-glow-bottom" />
        <div className="apple-page apple-typography">
          <div className="apple-content-frame">
            <div className="apple-page-content">
              <Outlet />
            </div>
          </div>
        </div>
      </main>
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
  return (
    <Router>
      <Routes>
        <Route element={<PageLayout />}>
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
