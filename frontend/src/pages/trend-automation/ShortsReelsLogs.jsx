import React, { useEffect, useState } from 'react';
import trendAutomationApi from '../../services/trendAutomationApi';

export default function ShortsReelsLogs() {
  const [data, setData] = useState({ items: [] });

  useEffect(() => {
    trendAutomationApi.getLogs().then(setData);
  }, []);

  return (
    <div className="p-6 text-gray-100">
      <h1 className="text-2xl font-bold mb-4">Job Logs</h1>
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 overflow-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left border-b border-gray-700"><th>Type</th><th>Status</th><th>Found</th><th>Downloaded</th><th>Duration</th><th>Error</th><th>Ran At</th></tr></thead>
          <tbody>
            {data.items.map((log) => (
              <tr key={log._id} className="border-b border-gray-800">
                <td className="py-2">{log.jobType}</td>
                <td>{log.status}</td>
                <td>{log.itemsFound}</td>
                <td>{log.itemsDownloaded}</td>
                <td>{Math.round((log.duration || 0) / 1000)}s</td>
                <td className="text-red-400">{log.error || '-'}</td>
                <td>{new Date(log.ranAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
