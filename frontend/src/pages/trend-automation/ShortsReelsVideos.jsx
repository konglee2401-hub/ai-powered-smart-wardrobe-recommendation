import React, { useEffect, useState } from 'react';
import trendAutomationApi from '../../services/trendAutomationApi';
import TrendAutomationLayout from '../../components/TrendAutomationLayout';

export default function ShortsReelsVideos() {
  const [status, setStatus] = useState('');
  const [data, setData] = useState({ items: [] });

  const load = async () => {
    setData(await trendAutomationApi.getVideos({ status, limit: 50 }));
  };

  useEffect(() => { load(); }, [status]);

  return (
    <TrendAutomationLayout
      title="Scanned & Downloaded Videos"
      subtitle="Danh sách video đã scan, trạng thái download, thumbnail và tiêu đề để dễ theo dõi."
    >
      <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-fit bg-gray-900 border border-gray-700 rounded px-3 py-2">
        <option value="">All status</option>
        <option value="pending">Pending</option>
        <option value="downloading">Downloading</option>
        <option value="done">Done</option>
        <option value="failed">Failed</option>
      </select>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 overflow-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left border-b border-gray-700"><th>Video</th><th>Platform</th><th>Topic</th><th>Views</th><th>Status</th><th>Path</th><th></th></tr></thead>
          <tbody>
            {data.items.map((v) => (
              <tr key={v._id} className="border-b border-gray-800 align-top">
                <td className="py-2 min-w-[320px]">
                  <div className="flex gap-3">
                    <img src={v.thumbnail || 'https://placehold.co/120x68/111827/9ca3af?text=No+Thumb'} alt={v.title || v.videoId} className="w-[120px] h-[68px] object-cover rounded border border-gray-700" />
                    <div>
                      <a href={v.url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">{v.title || v.videoId}</a>
                      <p className="text-xs text-gray-400 mt-1">ID: {v.videoId}</p>
                    </div>
                  </div>
                </td>
                <td>{v.platform}</td>
                <td>{v.topic || '-'}</td>
                <td>{v.views?.toLocaleString?.() || v.views}</td>
                <td>{v.downloadStatus}</td>
                <td className="text-xs break-all">{v.localPath || '-'}</td>
                <td><button className="px-2 py-1 bg-purple-600 rounded" onClick={async () => { await trendAutomationApi.redownloadVideo(v._id); load(); }}>Re-download</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </TrendAutomationLayout>
  );
}
