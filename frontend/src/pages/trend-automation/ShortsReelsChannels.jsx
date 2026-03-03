import React, { useEffect, useState } from 'react';
import trendAutomationApi from '../../services/trendAutomationApi';
import TrendAutomationLayout from '../../components/TrendAutomationLayout';

export default function ShortsReelsChannels() {
  const [data, setData] = useState({ items: [] });
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkScanning, setBulkScanning] = useState(false);

  const load = async () => {
    const res = await trendAutomationApi.getChannels({ limit: 50 });
    setData(res);
    setSelectedIds([]);
  };

  useEffect(() => { load(); }, []);

  const toggleSelectAll = () => {
    if (selectedIds.length === data.items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(data.items.map((c) => c._id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const scanSelected = async () => {
    if (!selectedIds.length) return;
    setBulkScanning(true);
    try {
      for (const id of selectedIds) {
        try {
          await trendAutomationApi.manualScanChannel(id);
        } catch (err) {
          console.error('Scan channel failed', id, err);
        }
      }
      await load();
    } finally {
      setBulkScanning(false);
    }
  };

  const allSelected = data.items.length > 0 && selectedIds.length === data.items.length;

  return (
    <TrendAutomationLayout
      title="Channels Monitoring"
      subtitle="Danh sách channels/pages đã lưu để theo dõi cùng trạng thái scan gần nhất."
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs text-gray-400">
          Selected: {selectedIds.length} / {data.items.length}
        </div>
        <div className="flex gap-2">
          <button
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded text-xs font-medium"
            onClick={scanSelected}
            disabled={!selectedIds.length || bulkScanning}
          >
            {bulkScanning ? 'Scanning channels...' : 'Scan Selected Channels'}
          </button>
          <button
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs font-medium"
            onClick={load}
          >
            Refresh
          </button>
        </div>
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-gray-700">
              <th className="w-8">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                />
              </th>
              <th>Channel</th>
              <th>Platform</th>
              <th>Topic</th>
              <th>Priority</th>
              <th>Total Videos</th>
              <th>Last Scanned</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((c) => (
              <tr key={c._id} className="border-b border-gray-800">
                <td className="text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(c._id)}
                    onChange={() => toggleSelect(c._id)}
                  />
                </td>
                <td className="py-2 min-w-[280px]">
                  <div className="flex items-center gap-2">
                    <img
                      src={c.avatar || 'https://placehold.co/36x36/111827/9ca3af?text=C'}
                      alt={c.name || c.channelId}
                      className="w-9 h-9 rounded-full object-cover border border-gray-700"
                    />
                    <div>
                      <p>{c.name || c.channelId}</p>
                      <p className="text-xs text-gray-400">{c.channelId}</p>
                    </div>
                  </div>
                </td>
                <td>{c.platform}</td>
                <td>{(c.topic || []).join(', ') || '-'}</td>
                <td>{c.priority}</td>
                <td>{c.totalVideos ?? 0}</td>
                <td>{c.lastScanned ? new Date(c.lastScanned).toLocaleString() : '-'}</td>
                <td>
                  <button
                    className="px-2 py-1 bg-blue-600 rounded disabled:bg-gray-700 disabled:cursor-not-allowed"
                    onClick={async () => { await trendAutomationApi.manualScanChannel(c._id); load(); }}
                    disabled={bulkScanning}
                  >
                    Manual Scan
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </TrendAutomationLayout>
  );
}

