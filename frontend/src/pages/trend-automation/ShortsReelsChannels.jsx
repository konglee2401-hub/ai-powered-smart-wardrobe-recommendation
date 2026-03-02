import React, { useEffect, useState } from 'react';
import trendAutomationApi from '../../services/trendAutomationApi';
import TrendAutomationLayout from '../../components/TrendAutomationLayout';

export default function ShortsReelsChannels() {
  const [data, setData] = useState({ items: [] });

  const load = async () => {
    setData(await trendAutomationApi.getChannels({ limit: 50 }));
  };

  useEffect(() => { load(); }, []);

  return (
    <TrendAutomationLayout
      title="Channels Monitoring"
      subtitle="Danh sách channels/pages đã lưu để theo dõi cùng trạng thái scan gần nhất."
    >
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 overflow-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left border-b border-gray-700"><th>Channel</th><th>Platform</th><th>Topic</th><th>Priority</th><th>Total Videos</th><th>Last Scanned</th><th></th></tr></thead>
          <tbody>
            {data.items.map((c) => (
              <tr key={c._id} className="border-b border-gray-800">
                <td className="py-2 min-w-[280px]"><div className="flex items-center gap-2"><img src={c.avatar || 'https://placehold.co/36x36/111827/9ca3af?text=C'} alt={c.name || c.channelId} className="w-9 h-9 rounded-full object-cover border border-gray-700" /><div><p>{c.name || c.channelId}</p><p className="text-xs text-gray-400">{c.channelId}</p></div></div></td>
                <td>{c.platform}</td><td>{(c.topic || []).join(', ') || '-'}</td><td>{c.priority}</td><td>{c.totalVideos ?? 0}</td><td>{c.lastScanned ? new Date(c.lastScanned).toLocaleString() : '-'}</td>
                <td><button className="px-2 py-1 bg-blue-600 rounded" onClick={async () => { await trendAutomationApi.manualScanChannel(c._id); load(); }}>Manual Scan</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </TrendAutomationLayout>
  );
}
