/**
 * Dashboard Page
 * Overview of AI generation statistics and recent activity
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  BarChart3, TrendingUp, Image, Clock, 
  CheckCircle, XCircle, AlertCircle, RefreshCw
} from 'lucide-react';
import PageHeaderBar from '../components/PageHeaderBar';

export default function Dashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState({
    totalGenerations: 0,
    successfulGenerations: 0,
    failedGenerations: 0,
    averageGenerationTime: 0,
  });
  const [recentGenerations, setRecentGenerations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      setLoading(true);
      // Mock data for now - in real app, fetch from API
      setStats({
        totalGenerations: 156,
        successfulGenerations: 142,
        failedGenerations: 14,
        averageGenerationTime: 3.2,
      });
      setRecentGenerations([
        { id: 1, type: 'Image', status: 'success', timestamp: new Date().toISOString(), provider: 'OpenAI' },
        { id: 2, type: 'Image', status: 'success', timestamp: new Date().toISOString(), provider: 'NVIDIA' },
        { id: 3, type: 'Video', status: 'failed', timestamp: new Date().toISOString(), provider: 'OpenAI' },
      ]);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  const successRate = stats.totalGenerations > 0 
    ? ((stats.successfulGenerations / stats.totalGenerations) * 100).toFixed(1)
    : 0;

  const statCards = [
    {
      key: 'total',
      label: t('dashboard.totalGenerations'),
      value: stats.totalGenerations,
      delta: '+12%',
      icon: Image,
      iconClass: 'bg-sky-300 text-slate-950',
    },
    {
      key: 'success',
      label: t('dashboard.successful'),
      value: stats.successfulGenerations,
      delta: `${successRate}%`,
      icon: CheckCircle,
      iconClass: 'bg-emerald-300 text-slate-950',
    },
    {
      key: 'failed',
      label: t('dashboard.failed'),
      value: stats.failedGenerations,
      delta: `${stats.failedGenerations} cases`,
      icon: XCircle,
      iconClass: 'bg-rose-300 text-slate-950',
    },
    {
      key: 'avg',
      label: t('dashboard.avgGenerationTime'),
      value: `${stats.averageGenerationTime}s`,
      delta: 'Stable',
      icon: Clock,
      iconClass: 'bg-violet-300 text-slate-950',
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
      <div className="mb-6">
        <PageHeaderBar
          icon={<BarChart3 className="h-4 w-4 text-sky-300" />}
          title={t('dashboard.title')}
          subtitle="Workspace overview"
          meta="Generation volume, success rate, and recent activity"
          className="apple-surface-panel"
          actions={(
            <button
              onClick={loadDashboardData}
              className="apple-secondary-button flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              {t('dashboard.refresh')}
            </button>
          )}
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.key}
              className="apple-surface-panel-raised surface-interactive rounded-[1.8rem] p-5 transition-all duration-200"
            >
              <div className="mb-6 flex items-start justify-between gap-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-[0_12px_24px_rgba(2,6,23,0.16)] ${card.iconClass}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-3 py-1 text-xs font-medium text-slate-200">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-300" />
                  {card.delta}
                </span>
              </div>
              <p className="text-sm text-slate-400">{card.label}</p>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">{card.value}</p>
            </div>
          );
        })}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="apple-surface-panel rounded-[2rem] p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-white">{t('dashboard.successRate')}</h2>
              <p className="mt-1 text-sm text-slate-400">Success ratio across recent generations</p>
            </div>
            <div className="rounded-full bg-emerald-400/12 px-3 py-1 text-sm font-medium text-emerald-200">
              {successRate}%
            </div>
          </div>
          <div className="rounded-full bg-white/[0.05] p-1">
            <div className="h-3 rounded-full bg-white/[0.04]">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#34d399,#5eead4,#7dd3fc)] transition-all duration-500"
                style={{ width: `${successRate}%` }}
              />
            </div>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-[1.4rem] bg-white/[0.04] p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Completed</p>
              <p className="mt-2 text-2xl font-semibold text-white">{stats.successfulGenerations}</p>
            </div>
            <div className="rounded-[1.4rem] bg-white/[0.04] p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Failed</p>
              <p className="mt-2 text-2xl font-semibold text-white">{stats.failedGenerations}</p>
            </div>
            <div className="rounded-[1.4rem] bg-white/[0.04] p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Queue Health</p>
              <div className="mt-2 flex items-center gap-2 text-sm text-slate-300">
                <AlertCircle className="h-4 w-4 text-sky-300" />
                System stable
              </div>
            </div>
          </div>
        </section>

        <section className="apple-surface-panel rounded-[2rem] p-6">
          <h2 className="text-xl font-semibold text-white">Runtime Snapshot</h2>
          <p className="mt-1 text-sm text-slate-400">Quick view of current workspace behavior</p>
          <div className="mt-5 space-y-3">
            <div className="rounded-[1.4rem] bg-white/[0.04] p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Average time</span>
                <span className="font-medium text-white">{stats.averageGenerationTime}s</span>
              </div>
            </div>
            <div className="rounded-[1.4rem] bg-white/[0.04] p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Load status</span>
                <span className="font-medium text-emerald-200">{loading ? 'Refreshing' : 'Healthy'}</span>
              </div>
            </div>
            <div className="rounded-[1.4rem] bg-white/[0.04] p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Providers active</span>
                <span className="font-medium text-white">2 connected</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="apple-surface-panel rounded-[2rem] p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-white">{t('dashboard.recentGenerations')}</h2>
            <p className="mt-1 text-sm text-slate-400">Latest jobs across image and video pipelines</p>
          </div>
          <div className="rounded-full bg-white/[0.05] px-3 py-1 text-xs font-medium text-slate-300">
            {recentGenerations.length} items
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px]">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{t('dashboard.type')}</th>
                <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{t('dashboard.provider')}</th>
                <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{t('dashboard.status')}</th>
                <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{t('dashboard.time')}</th>
              </tr>
            </thead>
            <tbody>
              {recentGenerations.map((gen) => (
                <tr key={gen.id}>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/[0.05]">
                        <Image className="h-4 w-4 text-sky-300" />
                      </div>
                      {gen.type}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-slate-300">{gen.provider}</td>
                  <td className="px-4 py-4">
                    {gen.status === 'success' ? (
                      <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/12 px-3 py-1 text-emerald-200">
                        <CheckCircle className="h-4 w-4" />
                        {t('dashboard.success')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 rounded-full bg-rose-400/12 px-3 py-1 text-rose-200">
                        <XCircle className="h-4 w-4" />
                        {t('dashboard.failedStatus')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-400">
                    {new Date(gen.timestamp).toLocaleString('vi-VN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

