/**
 * Dashboard Page
 * Overview of AI generation statistics and recent activity
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart3,
  CheckCircle,
  Clock,
  Film,
  Image,
  RefreshCw,
  TrendingUp,
  UploadCloud,
  XCircle,
} from 'lucide-react';
import PageHeaderBar from '../components/PageHeaderBar';
import api from '../services/api';
import useAuthStore from '../stores/useAuthStore';

export default function Dashboard() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const [stats, setStats] = useState({
    totalGenerations: 0,
    completedMashups: 0,
    failedMashups: 0,
    published: 0,
  });
  const [recentGenerations, setRecentGenerations] = useState([]);
  const [recentMashups, setRecentMashups] = useState([]);
  const [recentPublished, setRecentPublished] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      setLoading(true);
      const userId = user?.id || user?._id || 'anonymous';

      const [imageHistory, productionOverview, publishedHistory] = await Promise.all([
        api.get('/history/images', { userId, limit: 6 }),
        api.get('/video-pipeline/production/overview', { limit: 6 }),
        api.get('/video-pipeline/production/history', { status: 'uploaded', limit: 6 }),
      ]);

      const imagesPayload = imageHistory?.data || imageHistory;
      const overviewPayload = productionOverview?.data || productionOverview;
      const publishedPayload = publishedHistory?.data || publishedHistory;

      const images = imagesPayload?.data?.images || imagesPayload?.images || [];
      const totalImages = imagesPayload?.data?.total ?? imagesPayload?.total ?? images.length;

      const overviewMetrics = overviewPayload?.metrics || {};
      const overviewRecent = overviewPayload?.recentHistory || [];

      const publishedItems = publishedPayload?.items || publishedPayload?.data?.items || [];
      const publishedTotal = publishedPayload?.total || publishedPayload?.data?.total || publishedItems.length;

      setStats({
        totalGenerations: totalImages,
        completedMashups: overviewMetrics.completedMashupJobs || overviewMetrics.completedMashups || 0,
        failedMashups: overviewMetrics.failedMashupJobs || overviewMetrics.failedMashups || 0,
        published: publishedTotal,
      });

      setRecentGenerations(images.slice(0, 6));
      setRecentMashups(overviewRecent.slice(0, 4));
      setRecentPublished(publishedItems.slice(0, 4));
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  const successRate = stats.totalGenerations > 0
    ? ((stats.totalGenerations / Math.max(stats.totalGenerations + stats.failedMashups, stats.totalGenerations)) * 100).toFixed(1)
    : 0;

  const statCards = [
    {
      key: 'total',
      label: t('dashboard.totalGenerations'),
      value: stats.totalGenerations,
      delta: 'Images',
      icon: Image,
      iconClass: 'bg-sky-300 text-slate-950',
    },
    {
      key: 'mashup',
      label: 'Mashup produced',
      value: stats.completedMashups,
      delta: 'Production',
      icon: Film,
      iconClass: 'bg-emerald-300 text-slate-950',
    },
    {
      key: 'published',
      label: 'Published',
      value: stats.published,
      delta: 'Live',
      icon: UploadCloud,
      iconClass: 'bg-amber-300 text-slate-950',
    },
    {
      key: 'avg',
      label: 'Failed mashups',
      value: stats.failedMashups,
      delta: 'Retry queue',
      icon: XCircle,
      iconClass: 'bg-rose-300 text-slate-950',
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
              <h2 className="text-xl font-semibold text-white">Generation & production health</h2>
              <p className="mt-1 text-sm text-slate-400">Snapshot across image generation and mashup pipeline.</p>
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
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Generated images</p>
              <p className="mt-2 text-2xl font-semibold text-white">{stats.totalGenerations}</p>
            </div>
            <div className="rounded-[1.4rem] bg-white/[0.04] p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Mashups complete</p>
              <p className="mt-2 text-2xl font-semibold text-white">{stats.completedMashups}</p>
            </div>
            <div className="rounded-[1.4rem] bg-white/[0.04] p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Published</p>
              <p className="mt-2 text-2xl font-semibold text-white">{stats.published}</p>
            </div>
          </div>
        </section>

        <section className="apple-surface-panel rounded-[2rem] p-6">
          <h2 className="text-xl font-semibold text-white">Runtime Snapshot</h2>
          <p className="mt-1 text-sm text-slate-400">Quick view of current workspace behavior</p>
          <div className="mt-5 space-y-3">
            <div className="rounded-[1.4rem] bg-white/[0.04] p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Mashup queue</span>
                <span className="font-medium text-white">{stats.completedMashups + stats.failedMashups}</span>
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
                <span className="text-slate-400">Published videos</span>
                <span className="font-medium text-white">{stats.published}</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="apple-surface-panel rounded-[2rem] p-6">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-white">Latest successful generations</h2>
              <p className="mt-1 text-sm text-slate-400">Recent image outputs from the generation workspace.</p>
            </div>
            <div className="rounded-full bg-white/[0.05] px-3 py-1 text-xs font-medium text-slate-300">
              {recentGenerations.length} images
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {recentGenerations.map((item) => (
              <div key={item._id || item.id} className="group overflow-hidden rounded-[1.4rem] bg-white/[0.04]">
                <div className="aspect-[4/5] w-full overflow-hidden">
                  <img
                    src={item.imageUrl}
                    alt={item.shortPrompt || 'Generated'}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                  />
                </div>
                <div className="p-3 text-xs text-slate-400">
                  {new Date(item.createdAt || item.timestamp || Date.now()).toLocaleString('vi-VN')}
                </div>
              </div>
            ))}
            {!recentGenerations.length && (
              <div className="col-span-full rounded-[1.4rem] bg-white/[0.04] p-6 text-center text-sm text-slate-400">
                No recent generations yet.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="apple-surface-panel rounded-[2rem] p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">Mashup production</h2>
              <span className="rounded-full bg-white/[0.05] px-3 py-1 text-xs text-slate-300">
                {recentMashups.length} jobs
              </span>
            </div>
            <div className="space-y-3">
              {recentMashups.map((job) => (
                <div key={job.queueId} className="flex items-center gap-3 rounded-[1.2rem] bg-white/[0.04] p-3">
                  <div className="h-12 w-12 overflow-hidden rounded-xl bg-white/[0.05]">
                    {job.mainThumbnail ? (
                      <img src={job.mainThumbnail} alt={job.sourceTitle} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-400">
                        <Film className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white line-clamp-1">{job.sourceTitle}</p>
                    <p className="text-xs text-slate-400">{job.status || 'processing'}</p>
                  </div>
                  <CheckCircle className="h-4 w-4 text-emerald-300" />
                </div>
              ))}
              {!recentMashups.length && (
                <div className="rounded-[1.2rem] bg-white/[0.04] p-4 text-sm text-slate-400">
                  No mashup jobs yet.
                </div>
              )}
            </div>
          </div>

          <div className="apple-surface-panel rounded-[2rem] p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">Recently published</h2>
              <span className="rounded-full bg-white/[0.05] px-3 py-1 text-xs text-slate-300">
                {recentPublished.length} videos
              </span>
            </div>
            <div className="space-y-3">
              {recentPublished.map((job) => (
                <div key={job.queueId} className="flex items-center gap-3 rounded-[1.2rem] bg-white/[0.04] p-3">
                  <div className="h-12 w-12 overflow-hidden rounded-xl bg-white/[0.05]">
                    {job.mainThumbnail ? (
                      <img src={job.mainThumbnail} alt={job.sourceTitle} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-400">
                        <UploadCloud className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white line-clamp-1">{job.sourceTitle}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(job.uploadedAt || job.completedAt || job.updatedAt || Date.now()).toLocaleString('vi-VN')}
                    </p>
                  </div>
                  <UploadCloud className="h-4 w-4 text-sky-300" />
                </div>
              ))}
              {!recentPublished.length && (
                <div className="rounded-[1.2rem] bg-white/[0.04] p-4 text-sm text-slate-400">
                  No published videos yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

