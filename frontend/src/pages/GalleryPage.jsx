import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Clock3,
  ChevronDown,
  Image as ImageIcon,
  Layers3,
  Loader2,
  Sparkles,
  Wrench,
  Video,
} from 'lucide-react';

import GalleryManagement from '../components/GalleryManagement';
import PageHeaderBar from '../components/PageHeaderBar';
import { getAuthHeaders } from '../services/authHeaders';

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
  const [maintenanceAction, setMaintenanceAction] = useState(null);
  const [showMaintenanceMenu, setShowMaintenanceMenu] = useState(false);
  const maintenanceMenuRef = useRef(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await fetch(`${API_BASE}/admin/stats/assets`, {
          headers: {
            ...getAuthHeaders(),
          },
        });
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

  const runMaintenance = async (endpoint, body = {}) => {
    setMaintenanceAction(endpoint);
    setShowMaintenanceMenu(false);
    try {
      const response = await fetch(`${API_BASE}/admin/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(body)
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Maintenance action failed');
      }
      await (async () => {
        const statsResponse = await fetch(`${API_BASE}/admin/stats/assets`, {
          headers: {
            ...getAuthHeaders(),
          },
        });
        const statsData = await statsResponse.json();
        if (statsData.success) {
          const byCategory = statsData.stats?.byCategory || {};
          setStats({
            total: statsData.stats?.active || 0,
            character: byCategory['character-image'] || 0,
            product: byCategory['product-image'] || 0,
            generated: byCategory['generated-image'] || 0,
            source: byCategory['source-video'] || 0,
            totalSize: statsData.stats?.totalSize || 0,
          });
        }
      })();
      alert(data.message || 'Maintenance completed successfully');
    } catch (error) {
      console.error('Gallery maintenance failed:', error);
      alert(error.message || 'Maintenance failed');
    } finally {
      setMaintenanceAction(null);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (maintenanceMenuRef.current && !maintenanceMenuRef.current.contains(event.target)) {
        setShowMaintenanceMenu(false);
      }
    };

    if (showMaintenanceMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMaintenanceMenu]);

  return (
    <div className="image-generation-shell -mx-5 -mb-5 -mt-5 grid min-h-0 grid-rows-[auto,minmax(0,1fr)] overflow-hidden text-[13px] text-white lg:-mx-6 lg:-mb-6 lg:-mt-6" data-main-body>
      <PageHeaderBar
        icon={<Layers3 className="h-4 w-4 text-sky-400" />}
        title="Gallery"
        meta="Assets, generated outputs, and references"
        className="h-16"
      />

      <div className="min-h-0 overflow-y-auto px-5 py-4 lg:px-6">
        <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-6">
      <section className="grid gap-3 sm:grid-cols-3">
        {insightCards.map((card) => (
          <div key={card.label} className="studio-card-shell rounded-[1.1rem] px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{card.label}</p>
                <p className="mt-1 text-base font-semibold text-slate-900">{card.value}</p>
              </div>
              <p className="max-w-[110px] text-right text-[10px] leading-4 text-slate-500">{card.note}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="studio-card-shell rounded-[1.35rem] p-4 md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div ref={setToolbarHost} />
        </div>
      </section>

      <section className="grid min-h-0 gap-6 lg:grid-cols-[300px,minmax(0,1fr)]">
        <aside className="space-y-6 min-h-0 overflow-y-auto">
          <div className="studio-card-shell rounded-[1.35rem] p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Collections</p>
                <h2 className="mt-1 text-lg font-semibold text-white">Collections</h2>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/20 p-2">
                <Layers3 className="h-4 w-4 text-slate-300" />
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-2 lg:overflow-visible lg:pb-0">
              {categories.map((category) => {
                const meta = CATEGORY_META[category.id];
                const Icon = meta.icon;
                const isActive = currentCategory === category.id;

                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setCurrentCategory(category.id)}
                    className={`group flex min-w-[168px] flex-none items-center gap-3 rounded-[1rem] border px-3 py-2.5 text-left transition lg:w-full lg:items-start lg:rounded-[1.2rem] lg:py-3 ${
                      isActive
                        ? 'apple-option-chip apple-option-chip-selected apple-option-chip-cool shadow-[0_18px_40px_rgba(8,47,73,0.16)]'
                        : 'apple-option-chip'
                    }`}
                  >
                    <div className={`rounded-2xl p-2 ${isActive ? 'bg-white/12 text-cyan-100' : 'bg-white/6 text-slate-300'} lg:mt-0.5`}>
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
                      <p className="mt-1 hidden line-clamp-2 text-xs leading-5 text-slate-400 lg:block">{meta.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

        </aside>

        <div className="space-y-6 min-h-0 overflow-y-auto">
          <div className="studio-card-shell rounded-[1.35rem] p-4 md:p-5 min-h-0">
            <GalleryManagement
              currentCategory={currentCategory}
              onBatchSelect={setSelectedImages}
              onImageSelect={(image) => console.log('Image selected:', image)}
              selectedImages={selectedImages}
              toolbarHost={toolbarHost}
              maintenanceAction={maintenanceAction}
              showMaintenanceMenu={showMaintenanceMenu}
              setShowMaintenanceMenu={setShowMaintenanceMenu}
              maintenanceMenuRef={maintenanceMenuRef}
              runMaintenance={runMaintenance}
            />
          </div>
        </div>
      </section>
      </div>
      </div>
    </div>
  );
}

