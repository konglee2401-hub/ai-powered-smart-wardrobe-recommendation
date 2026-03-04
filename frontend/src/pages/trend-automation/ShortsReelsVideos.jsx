import React, { useEffect, useState } from 'react';
import trendAutomationApi from '../../services/trendAutomationApi';
import TrendAutomationLayout from '../../components/TrendAutomationLayout';

export default function ShortsReelsVideos() {
  const [status, setStatus] = useState('');
  const [data, setData] = useState({ items: [] });
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadingVideoId, setUploadingVideoId] = useState(null);
  const [downloadTriggering, setDownloadTriggering] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [platform, setPlatform] = useState('');

  const load = async () => {
    try {
      const videos = await trendAutomationApi.getVideos({ status, platform, limit: 100 });
      setData(videos);
    } catch (err) {
      console.error('Failed to load videos:', err);
    }
  };

  const loadUploadStatus = async () => {
    try {
      const stats = await trendAutomationApi.getUploadStatus();
      setUploadStatus(stats);
    } catch (err) {
      console.error('Failed to load upload status:', err);
    }
  };

  const triggerUploadAll = async () => {
    setUploadLoading(true);
    try {
      const result = await trendAutomationApi.triggerUploadAll();
      alert(`Upload started: ${result.processed} videos queued`);
      setTimeout(() => {
        loadUploadStatus();
        load();
      }, 1000);
    } catch (err) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploadLoading(false);
    }
  };

  const triggerUploadSingle = async (videoId) => {
    setUploadingVideoId(videoId);
    try {
      const result = await trendAutomationApi.triggerUploadSingle(videoId);
      alert('Video uploaded successfully!');
      setTimeout(() => {
        loadUploadStatus();
        load();
      }, 500);
    } catch (err) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploadingVideoId(null);
    }
  };

  const triggerPendingDownloads = async () => {
    setDownloadTriggering(true);
    try {
      const result = await trendAutomationApi.triggerPendingDownloads(500);
      alert(result?.message || `Queued ${result?.queued || 0} pending videos`);
      setTimeout(() => {
        load();
      }, 500);
    } catch (err) {
      alert(`Trigger download failed: ${err.message}`);
    } finally {
      setDownloadTriggering(false);
    }
  };

  useEffect(() => {
    load();
    loadUploadStatus();
  }, [status, platform]);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      load();
      loadUploadStatus();
    }, 10000);
    return () => clearInterval(timer);
  }, [autoRefresh, status, platform]);

  const getStatusBadge = (status) => {
    const colors = {
      pending: 'bg-yellow-900 text-yellow-200',
      downloading: 'bg-blue-900 text-blue-200',
      done: 'bg-green-900 text-green-200',
      failed: 'bg-red-900 text-red-200',
    };
    return colors[status] || 'bg-gray-700 text-gray-200';
  };

  const getUploadBadge = (status) => {
    const colors = {
      done: 'bg-green-900 text-green-200',
      failed: 'bg-red-900 text-red-200',
      pending: 'bg-gray-700 text-gray-200',
    };
    return colors[status] || 'bg-gray-700 text-gray-200';
  };

  return (
    <TrendAutomationLayout
      title="Videos Management"
      subtitle="Manage downloaded videos and upload to Google Drive"
    >
      {/* Upload Status Bar */}
      {uploadStatus && (
        <div className="grid grid-cols-5 gap-3 mb-6">
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
      )}

      {/* Control Panel */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-center">
          <button
            onClick={loadUploadStatus}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded font-medium text-sm transition"
          >
            Check Status
          </button>

          <button
            onClick={triggerUploadAll}
            disabled={uploadLoading || uploadStatus?.pendingUpload === 0}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded font-medium text-sm transition"
          >
            {uploadLoading ? 'Uploading...' : `Upload All (${uploadStatus?.pendingUpload || 0})`}
          </button>

          <button
            onClick={triggerPendingDownloads}
            disabled={downloadTriggering}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded font-medium text-sm transition"
          >
            {downloadTriggering ? 'Triggering...' : 'Trigger Pending Downloads'}
          </button>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            Auto Refresh (10s)
          </label>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-gray-950 border border-gray-700 rounded px-3 py-2 text-sm"
          >
            <option value="">All status</option>
            <option value="pending">Pending Download</option>
            <option value="downloading">Downloading</option>
            <option value="done">Downloaded</option>
            <option value="failed">Failed</option>
          </select>

          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="bg-gray-950 border border-gray-700 rounded px-3 py-2 text-sm"
          >
            <option value="">All platform</option>
            <option value="youtube">YouTube</option>
            <option value="dailyhaha">DailyHaha</option>
            <option value="facebook">Facebook</option>
          </select>
        </div>
      </div>

      {/* Videos Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-800 sticky top-0">
            <tr className="text-left border-b border-gray-700">
              <th className="px-4 py-3">Video</th>
              <th className="px-4 py-3">Platform</th>
              <th className="px-4 py-3">Topic</th>
              <th className="px-4 py-3">Views</th>
              <th className="px-4 py-3">Download</th>
              <th className="px-4 py-3">Upload</th>
              <th className="px-4 py-3">Drive Link</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.items?.length > 0 ? (
              data.items.map((v) => (
                <tr key={v._id} className="border-b border-gray-800 hover:bg-gray-800/50 align-top">
                  <td className="px-4 py-3 min-w-[300px]">
                    <div className="flex gap-3">
                      <img
                        src={v.thumbnail || 'https://placehold.co/100x56/111827/9ca3af?text=No+Thumb'}
                        alt={v.title || v.videoId}
                        className="w-[100px] h-[56px] object-cover rounded border border-gray-700"
                      />
                      <div className="flex-1">
                        <a
                          href={v.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-400 hover:underline text-sm line-clamp-2"
                        >
                          {v.title || v.videoId}
                        </a>
                        <p className="text-xs text-gray-500 mt-1">{v.videoId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">{v.platform || '-'}</td>
                  <td className="px-4 py-3">{v.topics || v.topic || '-'}</td>
                  <td className="px-4 py-3">{v.views?.toLocaleString?.() || v.views || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(v.downloadStatus)}`}>
                      {v.downloadStatus || 'pending'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getUploadBadge(v.uploadStatus)}`}>
                      {v.uploadStatus || 'pending'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {v.driveWebLink ? (
                      <a
                        href={v.driveWebLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-400 hover:underline text-xs break-all"
                      >
                        View on Drive
                      </a>
                    ) : (
                      <span className="text-gray-500 text-xs">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-2">
                      {v.downloadStatus === 'done' && v.uploadStatus !== 'done' && (
                        <button
                          onClick={() => triggerUploadSingle(v._id)}
                          disabled={uploadingVideoId === v._id}
                          className="px-2 py-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded text-xs font-medium transition whitespace-nowrap"
                        >
                          {uploadingVideoId === v._id ? 'Uploading...' : 'Upload'}
                        </button>
                      )}
                      {v.downloadStatus !== 'done' && (
                        <button
                          onClick={async () => {
                            await trendAutomationApi.redownloadVideo(v._id);
                            setTimeout(load, 500);
                          }}
                          className="px-2 py-1 bg-yellow-600 hover:bg-yellow-700 rounded text-xs font-medium transition whitespace-nowrap"
                        >
                          Re-download
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                  No videos found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </TrendAutomationLayout>
  );
}
