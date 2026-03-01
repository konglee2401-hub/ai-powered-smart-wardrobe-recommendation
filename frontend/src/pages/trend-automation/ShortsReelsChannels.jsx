import React, { useEffect, useState } from 'react';
import trendAutomationApi from '../../services/trendAutomationApi';

export default function ShortsReelsChannels() {
  const [data, setData] = useState({ items: [] });

  const load = async () => {
    setData(await trendAutomationApi.getChannels({ limit: 50 }));
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="p-6 text-gray-100">
      <h1 className="text-2xl font-bold mb-4">Saved Channels / Pages</h1>
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 overflow-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left border-b border-gray-700"><th>Name</th><th>Platform</th><th>Topic</th><th>Priority</th><th>Last Scanned</th><th></th></tr></thead>
          <tbody>
            {data.items.map((c) => (
              <tr key={c._id} className="border-b border-gray-800">
                <td className="py-2">{c.name || c.channelId}</td><td>{c.platform}</td><td>{(c.topic || []).join(', ')}</td><td>{c.priority}</td><td>{c.lastScanned ? new Date(c.lastScanned).toLocaleString() : '-'}</td>
                <td><button className="px-2 py-1 bg-blue-600 rounded" onClick={async () => { await trendAutomationApi.manualScanChannel(c._id); load(); }}>Manual Scan</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
