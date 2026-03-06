import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Clock3,
  Grid3X3,
  HardDrive,
  Image as ImageIcon,
  Layers3,
  List,
  Search,
  Sparkles,
  Upload,
  Video,
} from 'lucide-react';

import GalleryManagement from '../components/GalleryManagement';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const STORAGE_TOTAL_GB = 100;

const CATEGORY_META = {
  all: { label: 'All media', description: 'Everything across uploads, generated outputs, and references.', icon: Layers3 },
  'character-image': { label: 'Characters', description: 'Model portraits and character source images.', icon: ImageIcon },
  'product-image': { label: 'Products', description: 'Product packshots, cutouts, and product references.', icon: ImageIcon },
  'generated-image': { label: 'Generated', description: 'Finished outputs ready for campaigns and reviews.', icon: Sparkles },
  'source-video': { label: 'Videos', description: 'Source clips and motion assets for production.', icon: Video },
  recent: { label: 'Recent', description: 'Assets touched in the last 24 hours.', icon: Clock3 },
  favorites: { label: 'Favorites', description: 'Items you marked for repeated use.', icon: Sparkles },
};

function formatCount(value) {
  return new Intl.NumberFormat('en-US').format(value || 0);
}

function formatFileSize(bytes) {
  if (!bytes || Number.isNaN(bytes)) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export default function GalleryPage() {
  const [viewMode, setViewMode] = useState('grid');
  const [selectedImages, setSelectedImages] = useState([]);
  const [currentCategory, setCurrentCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    character: 0,
    product: 0,
    generated: 0,
    source: 0,
    totalSize: 0,
  });
  const [recentFiles, setRecentFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE}/admin/stats/assets`);
        const data = await response.json();
        if (!data.success) throw new Error(data.message || 'Failed to load asset stats');

        const statsData = data.stats || {};
        const byCategory = statsData.byCategory || {};

        setStats({
          total: statsData.active || 0,
          character: byCategory['character-image'] || 0,
          product: byCategory['product-image'] || 0,
          generated: byCategory['generated-image'] || 0,
          source: byCategory['source-video'] || 0,
          totalSize: statsData.totalSize || 0,
        });
        setRecentFiles((statsData.recent || []).slice(0, 6));
      } catch (error) {
        console.error('Failed to load gallery stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  const categories = useMemo(
    () => [
      { id: 'all', count: stats.total },
      { id: 'character-image', count: stats.character },
      { id: 'product-image', count: stats.product },
      { id: 'generated-image', count: stats.generated },
      { id: 'source-video', count: stats.source },
      { id: 'recent', count: recentFiles.length },
      { id: 'favorites', count: null },
    ],
    [recentFiles.length, stats],
  );

  const activeCategory = CATEGORY_META[currentCategory] || CATEGORY_META.all;
  const storageUsedGb = stats.totalSize / (1024 ** 3);
  const storagePercent = Math.min(100, Math.round((storageUsedGb / STORAGE_TOTAL_GB) * 100));

  const insightCards = [
    {
      label: 'Assets',
      value: formatCount(stats.total),
      note: `${formatCount(stats.generated)} generated ready to ship`,
      accent: 'from-sky-500/30 via-cyan-400/10 to-transparent',
    },
    {
      label: 'Library mix',
      value: formatCount(stats.character + stats.product),
      note: `${formatCount(stats.character)} character + ${formatCount(stats.product)} product`,
      accent: 'from-violet-500/30 via-fuchsia-400/10 to-transparent',
    },
    {
      label: 'Storage',
      value: formatFileSize(stats.totalSize),
      note: `${storagePercent}% of ${STORAGE_TOTAL_GB} GB workspace`,
      accent: 'from-emerald-500/25 via-teal-400/10 to-transparent',
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.22),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.18),transparent_26%),linear-gradient(145deg,rgba(8,15,31,0.96),rgba(12,24,43,0.88))] p-6 shadow-[0_30px_80px_rgba(2,6,23,0.45)] lg:p-8">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-[radial-gradient(circle_at_center,rgba(125,211,252,0.18),transparent_62%)]" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
              <Sparkles className="h-3.5 w-3.5" />
              Media workspace
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-[-0.03em] text-white md:text-4xl">
                Gallery that feels like a production control room, not a file dump.
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
                Browse campaign assets, generated outputs, and references from one place. Search fast, switch context fast,
                and keep the gallery visually useful while the library grows.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[580px]">
            {insightCards.map((card) => (
              <div
                key={card.label}
                className={`rounded-[1.5rem] border border-white/10 bg-gradient-to-br ${card.accent} p-4 backdrop-blur-xl`}
              >
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{card.label}</p>
                <p className="mt-3 text-2xl font-semibold text-white">{card.value}</p>
                <p className="mt-2 text-sm text-slate-300">{card.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[300px,minmax(0,1fr)]">
        <aside className="space-y-6">
          <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/65 p-4 shadow-[0_18px_50px_rgba(2,6,23,0.35)] backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Collections</p>
                <h2 className="mt-1 text-lg font-semibold text-white">Browse by intent</h2>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-2">
                <Layers3 className="h-4 w-4 text-slate-300" />
              </div>
            </div>

            <div className="space-y-2">
              {categories.map((category) => {
                const meta = CATEGORY_META[category.id];
                const Icon = meta.icon;
                const isActive = currentCategory === category.id;

                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setCurrentCategory(category.id)}
                    className={`group flex w-full items-start gap-3 rounded-[1.2rem] border px-3 py-3 text-left transition ${
                      isActive
                        ? 'border-cyan-300/35 bg-gradient-to-r from-cyan-400/18 to-violet-500/18 shadow-[0_18px_40px_rgba(8,47,73,0.28)]'
                        : 'border-white/6 bg-white/[0.03] hover:border-white/12 hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className={`mt-0.5 rounded-2xl p-2 ${isActive ? 'bg-white/12 text-cyan-100' : 'bg-white/6 text-slate-300'}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className={`truncate text-sm font-semibold ${isActive ? 'text-white' : 'text-slate-200'}`}>{meta.label}</p>
                        {category.count !== null && (
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${isActive ? 'bg-white/12 text-cyan-100' : 'bg-white/6 text-slate-400'}`}>
                            {formatCount(category.count)}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs leading-5 text-slate-400">{meta.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/65 p-4 shadow-[0_18px_50px_rgba(2,6,23,0.35)] backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Storage</p>
                <h2 className="mt-1 text-lg font-semibold text-white">Workspace capacity</h2>
              </div>
              <HardDrive className="h-4 w-4 text-slate-400" />
            </div>

            <div className="rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-4">
              <div className="flex items-baseline justify-between gap-3">
                <div>
                  <p className="text-2xl font-semibold text-white">{storageUsedGb.toFixed(1)} GB</p>
                  <p className="text-sm text-slate-400">Used of {STORAGE_TOTAL_GB} GB</p>
                </div>
                <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-200">
                  {storagePercent}%
                </span>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#22d3ee_0%,#818cf8_52%,#22c55e_100%)]"
                  style={{ width: `${storagePercent}%` }}
                />
              </div>
              <button
                type="button"
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/15"
              >
                <ArrowUpRight className="h-4 w-4" />
                Upgrade storage plan
              </button>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/65 p-4 shadow-[0_18px_50px_rgba(2,6,23,0.35)] backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Recent assets</p>
                <h2 className="mt-1 text-lg font-semibold text-white">Fresh arrivals</h2>
              </div>
              <Clock3 className="h-4 w-4 text-slate-400" />
            </div>

            <div className="space-y-2.5">
              {loading && Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-[1.15rem] border border-white/6 bg-white/[0.04]" />
              ))}

              {!loading && recentFiles.length === 0 && (
                <div className="rounded-[1.15rem] border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-center text-sm text-slate-400">
                  No recent files yet.
                </div>
              )}

              {!loading && recentFiles.map((file, index) => (
                <div
                  key={`${file.filename || 'recent'}-${index}`}
                  className="flex items-center gap-3 rounded-[1.15rem] border border-white/6 bg-white/[0.03] px-3 py-3"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400/20 via-blue-500/10 to-violet-500/20 text-cyan-100">
                    <ImageIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{file.filename || `Asset ${index + 1}`}</p>
                    <p className="truncate text-xs text-slate-400">
                      {(file.assetCategory || file.category || 'Asset').replace(/-/g, ' ')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <div className="space-y-6">
          <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-4 shadow-[0_18px_50px_rgba(2,6,23,0.35)] backdrop-blur-xl md:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                  {activeCategory.label}
                </div>
                <div>
                  <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white">Curate, compare, and move faster.</h2>
                  <p className="mt-1 text-sm text-slate-400">{activeCategory.description}</p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <label className="group flex min-w-[280px] items-center gap-3 rounded-[1.1rem] border border-white/10 bg-white/[0.04] px-4 py-3 transition focus-within:border-cyan-300/35">
                  <Search className="h-4 w-4 text-slate-500 transition group-focus-within:text-cyan-200" />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search by filename, source, or campaign..."
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                  />
                </label>

                <div className="inline-flex items-center gap-1 rounded-[1.1rem] border border-white/10 bg-white/[0.04] p-1">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`inline-flex items-center gap-2 rounded-[0.95rem] px-3 py-2 text-sm font-medium transition ${
                      viewMode === 'grid' ? 'bg-cyan-400/15 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Grid3X3 className="h-4 w-4" />
                    Grid
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`inline-flex items-center gap-2 rounded-[0.95rem] px-3 py-2 text-sm font-medium transition ${
                      viewMode === 'list' ? 'bg-cyan-400/15 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <List className="h-4 w-4" />
                    List
                  </button>
                </div>

                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-[1.1rem] border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/15"
                >
                  <Upload className="h-4 w-4" />
                  Add assets
                </button>
              </div>
            </div>

            {selectedImages.length > 0 && (
              <div className="mt-4 rounded-[1.15rem] border border-violet-300/20 bg-violet-400/10 px-4 py-3 text-sm text-violet-100">
                {selectedImages.length} selected for batch actions.
              </div>
            )}
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-4 shadow-[0_18px_50px_rgba(2,6,23,0.35)] backdrop-blur-xl md:p-5">
            <GalleryManagement
              currentCategory={currentCategory}
              onBatchSelect={setSelectedImages}
              onImageSelect={(image) => console.log('Image selected:', image)}
              searchQuery={searchQuery}
              selectedImages={selectedImages}
              viewMode={viewMode}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
