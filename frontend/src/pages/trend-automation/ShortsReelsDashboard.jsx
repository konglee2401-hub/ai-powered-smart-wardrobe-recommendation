import React, { useEffect, useState } from 'react';
import trendAutomationApi from '../../services/trendAutomationApi';

function StatCard({ title, value }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <p className="text-gray-400 text-sm">{title}</p>
      <p className="text-2xl text-white font-bold mt-1">{value}</p>
    </div>
  );
}

export default function ShortsReelsDashboard() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      setData(await trendAutomationApi.getOverview());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 15000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="p-6 text-gray-100 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Shorts/Reels Automation Dashboard</h1>
        <div className="flex gap-2">
          <button onClick={() => trendAutomationApi.triggerJob('discover')} className="px-4 py-2 bg-purple-600 rounded">Run Discover</button>
          <button onClick={() => trendAutomationApi.triggerJob('scan')} className="px-4 py-2 bg-blue-600 rounded">Run Scan</button>
          <button onClick={fetchData} className="px-4 py-2 bg-gray-700 rounded">Refresh</button>
        </div>
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

      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-4">Recent discovered videos</h2>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-700">
                <th className="py-2">Title</th>
                <th>Platform</th>
                <th>Views</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(data?.recent || []).map((item) => (
                <tr key={item._id} className="border-b border-gray-800">
                  <td className="py-2 pr-2">{item.title}</td>
                  <td>{item.platform}</td>
                  <td>{item.views?.toLocaleString?.() || item.views}</td>
                  <td>{item.downloadStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
