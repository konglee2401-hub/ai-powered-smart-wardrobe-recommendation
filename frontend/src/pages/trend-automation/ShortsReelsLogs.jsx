import React, { useEffect, useState } from 'react';
import trendAutomationApi from '../../services/trendAutomationApi';
import TrendAutomationLayout from '../../components/TrendAutomationLayout';

export default function ShortsReelsLogs() {
  const [data, setData] = useState({ items: [] });

  useEffect(() => {
    trendAutomationApi.getLogs().then(setData);
  }, []);

  return (
    <TrendAutomationLayout title="Job Logs" subtitle="Nhật ký chạy discover/scan jobs.">
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 overflow-auto">
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
    </TrendAutomationLayout>
  );
}
