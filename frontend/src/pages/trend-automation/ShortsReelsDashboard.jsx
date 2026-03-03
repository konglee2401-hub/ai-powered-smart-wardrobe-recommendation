import React, { useEffect, useMemo, useState } from 'react';
import trendAutomationApi from '../../services/trendAutomationApi';
import TrendAutomationLayout from '../../components/TrendAutomationLayout';

const CATEGORY_OPTIONS = [
  'All', 'Pets & Animal', 'Music', 'Gaming', 'News & Politics', 'People & Blogs',
  'Travel & Event', 'Sports', 'Auto & Vehicles', 'Comedy', 'Entertainment',
  'Film & Animation', 'Howto & Style', 'Education', 'Science & Technology',
];

const DIMENSION_OPTIONS = ['Most Viewed', 'Most Liked', 'Most Commented'];
const PERIOD_OPTIONS = ['Daily', 'Weekly', 'Monthly', 'Year-End', 'Yearly', 'All-time'];
const COUNTRY_OPTIONS = ['Worldwide', 'Viet Nam', 'Japan', 'South Korea', 'Taiwan', 'United States', 'India'];

function StatCard({ title, value }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <p className="text-gray-400 text-sm">{title}</p>
      <p className="text-2xl text-white font-bold mt-1">{value}</p>
    </div>
  );
}

function PickerColumn({ title, options, selected, onSelect, searchable = false }) {
  const [search, setSearch] = useState('');

  const visibleOptions = useMemo(() => {
    if (!search.trim()) return options;
    return options.filter((option) => option.toLowerCase().includes(search.toLowerCase()));
  }, [options, search]);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-800">
        <h3 className="font-semibold">{title}</h3>
        {searchable && (
          <input
            className="w-full mt-2 bg-gray-950 border border-gray-700 rounded px-2 py-1.5 text-sm"
            value={search}
            placeholder={`Search ${title.toLowerCase()}...`}
            onChange={(e) => setSearch(e.target.value)}
          />
        )}
      </div>
      <ul className="max-h-72 overflow-auto">
        {visibleOptions.map((option) => {
          const active = option === selected;
          return (
            <li key={option}>
              <button
                className={`w-full text-left px-4 py-2.5 text-sm border-b border-gray-800/70 transition ${
                  active ? 'bg-red-600 text-white font-medium' : 'hover:bg-gray-800 text-gray-200'
                }`}
                onClick={() => onSelect(option)}
              >
                {option}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function ShortsReelsDashboard() {
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [data, setData] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [selected, setSelected] = useState({
    category: 'All',
    dimension: 'Most Viewed',
    country: 'Worldwide',
    period: 'Weekly',
    date: new Date().toISOString().slice(0, 10),
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      setData(await trendAutomationApi.getOverview());
    } finally {
      setLoading(false);
    }
  };

  const fetchUploadStatus = async () => {
    try {
      setUploadStatus(await trendAutomationApi.getUploadStatus());
    } catch (err) {
      console.error('Failed to load upload status:', err);
    }
  };

  useEffect(() => {
    fetchData();
    fetchUploadStatus();
    const timer = setInterval(() => {
      fetchData();
      fetchUploadStatus();
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const triggerManualScan = async () => {
    setTriggering(true);
    try {
      const mapDimension = (d) => ({
        'Most Viewed': 'most-viewed',
        'Most Liked': 'trending',
        'Most Commented': 'rising',
      }[d] || 'most-viewed');

      const mapPeriod = (p) => ({
        Daily: 'weekly',
        Weekly: 'weekly',
        Monthly: 'monthly',
        'Year-End': 'yearly',
        Yearly: 'yearly',
        'All-time': 'yearly',
      }[p] || 'weekly');

      const config = {
        dimension: mapDimension(selected.dimension),
        category: selected.category,
        country: selected.country,
        period: mapPeriod(selected.period),
        isActive: true,
        priority: 10,
      };

      const result = await trendAutomationApi.manualDiscoverPlayboard(config);
      console.log('Manual discover result', result);
      await fetchData();
    } finally {
      setTriggering(false);
    }
  };

  const triggerUploadAll = async () => {
    setUploadLoading(true);
    try {
      const result = await trendAutomationApi.triggerUploadAll();
      alert(`Upload started: ${result.processed} videos queued`);
      setTimeout(() => {
        fetchUploadStatus();
        fetchData();
      }, 1000);
    } catch (err) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploadLoading(false);
    }
  };

  return (
    <TrendAutomationLayout
      title="Dashboard"
      subtitle="Theo dõi tổng quan, trigger scan thủ công theo bộ lọc giống Playboard category UI."
    >
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => trendAutomationApi.triggerJob('discover')} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm font-medium transition">Run Discover</button>
        <button onClick={triggerManualScan} disabled={triggering} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded text-sm font-medium transition">{triggering ? 'Scanning...' : 'Scan Channels From Filters'}</button>
        <button onClick={triggerUploadAll} disabled={uploadLoading || uploadStatus?.pendingUpload === 0} className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded text-sm font-medium transition">{uploadLoading ? 'Uploading...' : `Upload All (${uploadStatus?.pendingUpload || 0})`}</button>
        <button onClick={() => { fetchData(); fetchUploadStatus(); }} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium transition">Refresh</button>
      </div>

      {loading && <p className="text-gray-400">Loading...</p>}

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard title="Channels" value={data?.channels ?? 0} />
        <StatCard title="Videos" value={data?.videos ?? 0} />
        <StatCard title="Pending" value={data?.pending ?? 0} />
        <StatCard title="Done" value={data?.done ?? 0} />
        <StatCard title="Failed" value={data?.failed ?? 0} />
        <StatCard title="Queue" value={`${data?.queue?.queued ?? 0}/${data?.queue?.running ?? 0}`} />
      </div>

      {/* Upload Stats Section */}
      {uploadStatus && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Google Drive Upload Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-gradient-to-br from-green-900 to-green-950 border border-green-700 rounded-lg p-4">
              <p className="text-green-300 text-sm font-medium">Downloaded</p>
              <p className="text-3xl font-bold text-green-200 mt-1">{uploadStatus.downloaded}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-900 to-blue-950 border border-blue-700 rounded-lg p-4">
              <p className="text-blue-300 text-sm font-medium">Pending Upload</p>
              <p className="text-3xl font-bold text-blue-200 mt-1">{uploadStatus.pendingUpload}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-900 to-purple-950 border border-purple-700 rounded-lg p-4">
              <p className="text-purple-300 text-sm font-medium">Uploaded</p>
              <p className="text-3xl font-bold text-purple-200 mt-1">{uploadStatus.uploaded}</p>
            </div>
            <div className="bg-gradient-to-br from-orange-900 to-orange-950 border border-orange-700 rounded-lg p-4">
              <p className="text-orange-300 text-sm font-medium">Upload Failed</p>
              <p className="text-3xl font-bold text-orange-200 mt-1">{uploadStatus.uploadFailed}</p>
            </div>
            <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 border border-indigo-700 rounded-lg p-4">
              <p className="text-indigo-300 text-sm font-medium">With Assets</p>
              <p className="text-3xl font-bold text-indigo-200 mt-1">{uploadStatus.withAssets}</p>
            </div>
          </div>
        </div>
      )}

      <section id="manual-scan" className="space-y-4">
        <h3 className="text-xl font-semibold">Manual Scan Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          <PickerColumn title="Category" options={CATEGORY_OPTIONS} selected={selected.category} searchable onSelect={(value) => setSelected((prev) => ({ ...prev, category: value }))} />
          <PickerColumn title="Dimension" options={DIMENSION_OPTIONS} selected={selected.dimension} onSelect={(value) => setSelected((prev) => ({ ...prev, dimension: value }))} />
          <PickerColumn title="Country" options={COUNTRY_OPTIONS} selected={selected.country} searchable onSelect={(value) => setSelected((prev) => ({ ...prev, country: value }))} />
          <PickerColumn title="Period" options={PERIOD_OPTIONS} selected={selected.period} onSelect={(value) => setSelected((prev) => ({ ...prev, period: value }))} />
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex flex-col gap-3">
            <h3 className="font-semibold">Date</h3>
            <input type="date" value={selected.date} onChange={(e) => setSelected((prev) => ({ ...prev, date: e.target.value }))} className="bg-gray-950 border border-gray-700 rounded px-3 py-2" />
            <div className="text-xs text-gray-400 leading-relaxed">
              {selected.category} / {selected.dimension} / {selected.country} / {selected.period}
            </div>
          </div>
        </div>
      </section>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-4">Recent discovered videos</h2>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-700">
                <th className="py-2">Title</th><th>Platform</th><th>Topic</th><th>Views</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(data?.recent || []).map((item) => (
                <tr key={item._id} className="border-b border-gray-800">
                  <td className="py-2 pr-2">{item.title}</td>
                  <td>{item.platform}</td>
                  <td>{item.topic || '-'}</td>
                  <td>{item.views?.toLocaleString?.() || item.views}</td>
                  <td>{item.downloadStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </TrendAutomationLayout>
  );
}
