import React, { useEffect, useMemo, useState } from 'react';
import {
  Clock3,
  Image as ImageIcon,
  Layers3,
  Sparkles,
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
  const [selectedImages, setSelectedImages] = useState([]);
  const [currentCategory, setCurrentCategory] = useState('all');
  const [toolbarHost, setToolbarHost] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    character: 0,
    product: 0,
    generated: 0,
    source: 0,
    totalSize: 0,
  });
  const [recentFiles, setRecentFiles] = useState([]);

  useEffect(() => {
    const loadStats = async () => {
      try {
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
  const storagePercent = Math.min(100, Math.round((stats.totalSize / (1024 ** 3) / STORAGE_TOTAL_GB) * 100));

  const insightCards = [
    {
      label: 'Assets',
      value: formatCount(stats.total),
      note: `${formatCount(stats.generated)} generated`,
      accent: 'from-sky-500/30 via-cyan-400/10 to-transparent',
    },
    {
      label: 'Library mix',
      value: formatCount(stats.character + stats.product),
      note: `${formatCount(stats.character)} char / ${formatCount(stats.product)} product`,
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
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_24%),radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.14),transparent_22%),linear-gradient(145deg,rgba(8,15,31,0.96),rgba(12,24,43,0.88))] p-4 shadow-[0_24px_64px_rgba(2,6,23,0.42)] lg:p-5">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-[radial-gradient(circle_at_center,rgba(125,211,252,0.18),transparent_62%)]" />
        <div className="relative flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-[280px] space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200">
              <Sparkles className="h-3.5 w-3.5" />
              Media workspace
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-[-0.03em] text-white">Gallery</h1>
              <p className="mt-1 text-sm text-slate-400">Assets, generated outputs, and references.</p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[520px]">
            {insightCards.map((card) => (
              <div
                key={card.label}
                className={`rounded-[1.05rem] border border-white/10 bg-gradient-to-br ${card.accent} px-3 py-2`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{card.label}</p>
                    <p className="mt-1 text-base font-semibold text-white">{card.value}</p>
                  </div>
                  <p className="max-w-[96px] text-right text-[10px] leading-4 text-slate-300">{card.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-4 shadow-[0_18px_50px_rgba(2,6,23,0.35)] md:p-5">
        <div>
          <div ref={setToolbarHost} />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[300px,minmax(0,1fr)]">
        <aside className="space-y-6">
          <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/65 p-4 shadow-[0_18px_50px_rgba(2,6,23,0.35)] backdrop-blur-xl">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Collections</p>
                <h2 className="mt-1 text-lg font-semibold text-white">Collections</h2>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-2">
                <Layers3 className="h-4 w-4 text-slate-300" />
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 xl:block xl:space-y-2 xl:overflow-visible xl:pb-0">
              {categories.map((category) => {
                const meta = CATEGORY_META[category.id];
                const Icon = meta.icon;
                const isActive = currentCategory === category.id;

                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setCurrentCategory(category.id)}
                    className={`group flex min-w-[168px] flex-none items-center gap-3 rounded-[1rem] border px-3 py-2.5 text-left transition xl:w-full xl:items-start xl:rounded-[1.2rem] xl:py-3 ${
                      isActive
                        ? 'border-cyan-300/35 bg-gradient-to-r from-cyan-400/18 to-violet-500/18 shadow-[0_18px_40px_rgba(8,47,73,0.28)]'
                        : 'border-white/6 bg-white/[0.03] hover:border-white/12 hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className={`rounded-2xl p-2 ${isActive ? 'bg-white/12 text-cyan-100' : 'bg-white/6 text-slate-300'} xl:mt-0.5`}>
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
                      <p className="mt-1 hidden line-clamp-2 text-xs leading-5 text-slate-400 xl:block">{meta.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

        </aside>

        <div className="space-y-6">
          <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-4 shadow-[0_18px_50px_rgba(2,6,23,0.35)] backdrop-blur-xl md:p-5">
            <GalleryManagement
              currentCategory={currentCategory}
              onBatchSelect={setSelectedImages}
              onImageSelect={(image) => console.log('Image selected:', image)}
              selectedImages={selectedImages}
              toolbarHost={toolbarHost}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
