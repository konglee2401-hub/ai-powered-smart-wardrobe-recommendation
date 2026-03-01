import React, { useEffect, useState } from 'react';
import trendAutomationApi from '../../services/trendAutomationApi';

export default function ShortsReelsVideos() {
  const [status, setStatus] = useState('');
  const [data, setData] = useState({ items: [] });

  const load = async () => {
    setData(await trendAutomationApi.getVideos({ status, limit: 50 }));
  };

  useEffect(() => { load(); }, [status]);

  return (
    <div className="p-6 text-gray-100 space-y-4">
      <h1 className="text-2xl font-bold">Videos</h1>
      <select value={status} onChange={(e) => setStatus(e.target.value)} className="bg-gray-800 border border-gray-600 rounded px-3 py-2">
        <option value="">All status</option>
        <option value="pending">Pending</option>
        <option value="downloading">Downloading</option>
        <option value="done">Done</option>
        <option value="failed">Failed</option>
      </select>
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 overflow-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left border-b border-gray-700"><th>Title</th><th>Platform</th><th>Views</th><th>Status</th><th>Local path</th><th>Drive</th><th></th></tr></thead>
          <tbody>
            {data.items.map((v) => (
              <tr key={v._id} className="border-b border-gray-800">
                <td className="py-2"><a href={v.url} target="_blank" rel="noreferrer" className="text-blue-400">{v.title || v.videoId}</a></td>
                <td>{v.platform}</td>
                <td>{v.views?.toLocaleString?.() || v.views}</td>
                <td>{v.downloadStatus}</td>
                <td>{v.localPath || '-'}</td>
                <td>{v.driveWebViewLink ? <a href={v.driveWebViewLink} target="_blank" rel="noreferrer" className="text-green-400">Open</a> : '-'}</td>
                <td>
                  <div className="flex gap-2">
                    <button className="px-2 py-1 bg-purple-600 rounded" onClick={async () => { await trendAutomationApi.redownloadVideo(v._id); load(); }}>Re-download</button>
                    <button className="px-2 py-1 bg-blue-600 rounded" onClick={async () => { await trendAutomationApi.driveUploadVideo(v._id); load(); }}>Upload Drive</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
