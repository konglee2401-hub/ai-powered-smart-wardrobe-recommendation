import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Clapperboard,
  Flame,
  Globe2,
  Radar,
  RefreshCw,
  TimerReset,
  TrendingUp,
} from 'lucide-react';
import { getMarketingDashboard } from '../services/analyticsService';

const RANGE_OPTIONS = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
];

const toneMap = {
  amber: 'from-amber-500/20 via-amber-500/10 to-transparent border-amber-400/20 text-amber-100',
  sky: 'from-sky-500/20 via-sky-500/10 to-transparent border-sky-400/20 text-sky-100',
  emerald: 'from-emerald-500/20 via-emerald-500/10 to-transparent border-emerald-400/20 text-emerald-100',
  rose: 'from-rose-500/20 via-rose-500/10 to-transparent border-rose-400/20 text-rose-100',
};

function formatCompact(value, unit = '') {
  const numeric = Number(value || 0);
  const formatted = new Intl.NumberFormat('en-US', {
    notation: Math.abs(numeric) >= 1000 ? 'compact' : 'standard',
    maximumFractionDigits: Math.abs(numeric) >= 1000 ? 1 : 1,
  }).format(numeric);

  return unit ? `${formatted}${unit === '%' ? '%' : ` ${unit}`}` : formatted;
}

function formatInteger(value) {
  return new Intl.NumberFormat('en-US').format(Number(value || 0));
}

function getDeltaClass(change = 0) {
  if (change > 0) return 'text-emerald-300';
  if (change < 0) return 'text-rose-300';
  return 'text-slate-300';
}

function SystemCard({ card }) {
  return (
    <div className={`rounded-[28px] border bg-gradient-to-br p-5 shadow-[0_22px_70px_rgba(15,23,42,0.35)] ${toneMap[card.tone] || toneMap.sky}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-300/80">{card.label}</p>
          <div className="mt-3 text-3xl font-semibold text-white">{formatCompact(card.value, card.unit)}</div>
        </div>
        <div className={`rounded-full px-3 py-1 text-xs font-medium ${getDeltaClass(card.change)}`}>
          {card.change >= 0 ? '+' : ''}{card.change}%
        </div>
      </div>
      <p className="mt-4 text-sm text-slate-300/85">{card.note}</p>
    </div>
  );
}

function MetricStrip({ items }) {
  return (
    <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
      {items.map((item) => (
        <div key={item.label} className="rounded-[24px] border border-white/10 bg-white/5 p-4 backdrop-blur">
          <div className="text-xs uppercase tracking-[0.2em] text-slate-400">{item.label}</div>
          <div className="mt-2 text-2xl font-semibold text-white">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

function MiniBars({ data = [], colorClass = 'bg-amber-400' }) {
  const max = Math.max(...data.map((item) => item.value || 0), 1);

  return (
    <div className="flex h-36 items-end gap-2">
      {data.map((item) => (
        <div key={item.date} className="flex flex-1 flex-col items-center gap-2">
          <div
            className={`w-full rounded-t-2xl ${colorClass}`}
            style={{ height: `${Math.max(8, ((item.value || 0) / max) * 100)}%` }}
            title={`${item.date}: ${item.value}`}
          />
          <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
            {item.date.slice(5)}
          </span>
        </div>
      ))}
    </div>
  );
}

function DataTable({ title, subtitle, columns, rows, emptyText = 'No data yet.' }) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-[#0f172acc] p-5 shadow-[0_20px_70px_rgba(15,23,42,0.35)] backdrop-blur">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          {subtitle ? <p className="mt-1 text-sm text-slate-400">{subtitle}</p> : null}
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-slate-400">
          {emptyText}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-[0.22em] text-slate-500">
                {columns.map((column) => (
                  <th key={column.key} className="pb-3 pr-4 font-medium">{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${row.id || row.platform || row.label || row.title}-${index}`} className="border-b border-white/5 text-slate-200">
                  {columns.map((column) => (
                    <td key={column.key} className="py-3 pr-4 align-top">
                      {column.render ? column.render(row[column.key], row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function OpportunityList({ items }) {
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={`${item.title}-${index}`} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-amber-300">{item.platform} â€¢ {item.topic}</div>
              <div className="mt-2 text-base font-medium text-white">{item.title}</div>
              <div className="mt-2 text-sm text-slate-400">
                {formatInteger(item.views)} views â€¢ {formatInteger(item.likes)} likes â€¢ published {item.publishingCount} time(s)
              </div>
            </div>
            {item.url ? (
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-2 text-xs uppercase tracking-[0.18em] text-slate-200 transition hover:border-amber-300/40 hover:text-white"
              >
                Source <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const [range, setRange] = useState('30d');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const response = await getMarketingDashboard(range);
        if (!cancelled) {
          setData(response.data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError?.response?.data?.error || loadError.message || 'Failed to load analytics dashboard.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [range]);

  const healthStrip = useMemo(() => {
    if (!data?.system?.health) return [];
    const { health } = data.system;
    return [
      { label: 'Success Rate', value: `${health.successRate}%` },
      { label: 'Workflow Avg', value: `${health.avgWorkflowDurationSec}s` },
      { label: 'Video Avg', value: `${health.avgVideoGenerationSec}s` },
      { label: 'Tracked Cost', value: `$${formatCompact(health.totalTrackedCost)}` },
      { label: 'Processing', value: formatInteger(health.activeProcessingSessions) },
      { label: 'Queue Pressure', value: formatInteger(health.queuePressure) },
    ];
  }, [data]);

  const socialStrip = useMemo(() => {
    if (!data?.social?.summaryCards) return [];
    return data.social.summaryCards.map((item) => ({
      label: item.label,
      value: formatCompact(item.value, item.unit),
    }));
  }, [data]);

  return (
    <div className="analytics-page-shell min-h-screen overflow-y-auto bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.12),_transparent_26%),radial-gradient(circle_at_top_right,_rgba(56,189,248,0.12),_transparent_24%),linear-gradient(180deg,#020617_0%,#0f172a_42%,#111827_100%)] px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[36px] border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.94),rgba(30,41,59,0.86))] p-6 shadow-[0_28px_100px_rgba(2,6,23,0.55)] lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-amber-200">
                Marketing Intelligence Console
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-5xl">
                One dashboard for system throughput and social performance.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
                Track production health, publishing quality, affiliate-ready reach, and source-video opportunities from one place.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {RANGE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRange(option.value)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    range === option.value
                      ? 'bg-white text-slate-950'
                      : 'border border-white/10 bg-white/5 text-slate-200 hover:border-white/20 hover:bg-white/10'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {loading ? (
          <div className="rounded-[32px] border border-white/10 bg-[#0f172acc] px-6 py-16 text-center shadow-[0_24px_80px_rgba(15,23,42,0.38)]">
            <RefreshCw className="mx-auto h-10 w-10 animate-spin text-amber-300" />
            <div className="mt-4 text-lg font-medium text-white">Aggregating marketing analytics</div>
            <div className="mt-2 text-sm text-slate-400">Collecting workflow, publishing, and channel signals.</div>
          </div>
        ) : error ? (
          <div className="rounded-[32px] border border-rose-400/20 bg-rose-500/10 px-6 py-10 text-rose-100">
            <div className="text-lg font-semibold">Analytics load failed</div>
            <div className="mt-2 text-sm text-rose-100/80">{error}</div>
          </div>
        ) : (
          <>
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <Activity className="h-5 w-5 text-amber-300" />
                <h2 className="text-xl font-semibold text-white">System Intelligence</h2>
              </div>
              <div className="grid gap-4 xl:grid-cols-4">
                {(data?.system?.overviewCards || []).map((card) => (
                  <SystemCard key={card.id} card={card} />
                ))}
              </div>
              <MetricStrip items={healthStrip} />
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <section className="rounded-[28px] border border-white/10 bg-[#0f172acc] p-5 shadow-[0_20px_70px_rgba(15,23,42,0.35)]">
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-5 w-5 text-sky-300" />
                  <div>
                    <h3 className="text-lg font-semibold text-white">Workflow Velocity</h3>
                    <p className="text-sm text-slate-400">Daily completed and attempted sessions across the selected window.</p>
                  </div>
                </div>
                <div className="mt-6">
                  <MiniBars data={data?.system?.pipeline?.recentTrend || []} colorClass="bg-gradient-to-t from-amber-400 to-yellow-200" />
                </div>
              </section>

              <section className="rounded-[28px] border border-white/10 bg-[#0f172acc] p-5 shadow-[0_20px_70px_rgba(15,23,42,0.35)]">
                <div className="flex items-center gap-3">
                  <TimerReset className="h-5 w-5 text-emerald-300" />
                  <div>
                    <h3 className="text-lg font-semibold text-white">Pipeline Readiness</h3>
                    <p className="text-sm text-slate-400">Trend-source supply moving into Drive and production queues.</p>
                  </div>
                </div>
                <div className="mt-5 space-y-4">
                  {Object.entries(data?.system?.pipeline?.assetReadiness || {}).map(([key, value]) => (
                    <div key={key}>
                      <div className="mb-2 flex items-center justify-between text-sm text-slate-300">
                        <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                        <span>{formatInteger(value)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/10">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-sky-400 via-amber-300 to-emerald-300"
                          style={{ width: `${Math.min(100, ((value || 0) / Math.max(data?.system?.pipeline?.assetReadiness?.discovered || 1, 1)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                  {data?.system?.insights?.map((insight) => (
                    <div key={insight} className="flex items-start gap-2 py-1">
                      <BadgeCheck className="mt-0.5 h-4 w-4 text-amber-300" />
                      <span>{insight}</span>
                    </div>
                  ))}
                </div>
              </section>
            </section>

            <div className="grid gap-6 xl:grid-cols-2">
              <DataTable
                title="Stage Distribution"
                subtitle="Average duration by workflow stage."
                columns={[
                  { key: 'stage', label: 'Stage' },
                  { key: 'runs', label: 'Runs', render: (value) => formatInteger(value) },
                  { key: 'avgDurationSec', label: 'Avg Duration', render: (value) => `${value}s` },
                ]}
                rows={data?.system?.pipeline?.stageDistribution || []}
              />
              <DataTable
                title="Provider Leaderboard"
                subtitle="Video generation providers ranked by usage."
                columns={[
                  { key: 'provider', label: 'Provider' },
                  { key: 'videos', label: 'Videos', render: (value) => formatInteger(value) },
                  { key: 'avgGenerationSec', label: 'Avg Time', render: (value) => `${value}s` },
                  { key: 'avgRating', label: 'Rating', render: (value) => value ? `${value}/5` : 'n/a' },
                ]}
                rows={data?.system?.pipeline?.providerLeaderboard || []}
              />
            </div>

            <section className="space-y-4 pt-2">
              <div className="flex items-center gap-3">
                <Globe2 className="h-5 w-5 text-sky-300" />
                <h2 className="text-xl font-semibold text-white">Social Intelligence</h2>
              </div>
              <MetricStrip items={socialStrip} />
            </section>

            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <DataTable
                title="Platform Performance"
                subtitle="Cross-platform effectiveness for published videos."
                columns={[
                  { key: 'platform', label: 'Platform' },
                  { key: 'posts', label: 'Posts', render: (value) => formatInteger(value) },
                  { key: 'views', label: 'Views', render: (value) => formatInteger(value) },
                  { key: 'engagementRate', label: 'Engagement', render: (value) => `${value}%` },
                  { key: 'completionRate', label: 'Completion', render: (value) => `${value}%` },
                  { key: 'successRate', label: 'Upload Success', render: (value) => `${value}%` },
                ]}
                rows={data?.social?.platformPerformance || []}
              />
              <DataTable
                title="Account Health"
                subtitle="Operational status of connected posting accounts."
                columns={[
                  { key: 'platform', label: 'Platform' },
                  { key: 'connectedAccounts', label: 'Connected', render: (value) => formatInteger(value) },
                  { key: 'activeAccounts', label: 'Active', render: (value) => formatInteger(value) },
                  { key: 'errorAccounts', label: 'Errors', render: (value) => formatInteger(value) },
                  { key: 'avgEngagementRate', label: 'Avg ER', render: (value) => `${value}%` },
                ]}
                rows={data?.social?.accountHealth || []}
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <DataTable
                title="Best Performing Posts"
                subtitle="Posts with the strongest reach and retention proxies."
                columns={[
                  { key: 'title', label: 'Post' },
                  { key: 'platform', label: 'Platform' },
                  { key: 'views', label: 'Views', render: (value) => formatInteger(value) },
                  { key: 'engagementRate', label: 'Engagement', render: (value) => `${value}%` },
                  { key: 'completionRate', label: 'Completion', render: (value) => `${value}%` },
                ]}
                rows={data?.social?.bestPosts || []}
              />
              <DataTable
                title="Source Radar"
                subtitle="Aggregated trend-source supply by upstream platform."
                columns={[
                  { key: 'platform', label: 'Source Platform' },
                  { key: 'videos', label: 'Videos', render: (value) => formatInteger(value) },
                  { key: 'totalViews', label: 'Views', render: (value) => formatInteger(value) },
                  { key: 'totalLikes', label: 'Likes', render: (value) => formatInteger(value) },
                ]}
                rows={data?.social?.sourceRadar || []}
              />
            </div>

            <section className="rounded-[28px] border border-white/10 bg-[#0f172acc] p-5 shadow-[0_20px_70px_rgba(15,23,42,0.35)]">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <Flame className="h-5 w-5 text-amber-300" />
                    <h3 className="text-lg font-semibold text-white">Affiliate Opportunity Feed</h3>
                  </div>
                  <p className="mt-1 text-sm text-slate-400">
                    High-signal source videos and topics that already show audience demand.
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs uppercase tracking-[0.18em] text-slate-500">
                  <span className="inline-flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Reach signal</span>
                  <span className="inline-flex items-center gap-2"><Radar className="h-4 w-4" /> Source fit</span>
                  <span className="inline-flex items-center gap-2"><Clapperboard className="h-4 w-4" /> Repurpose ready</span>
                </div>
              </div>
              <div className="mt-5">
                <OpportunityList items={data?.social?.opportunityFeed || []} />
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

