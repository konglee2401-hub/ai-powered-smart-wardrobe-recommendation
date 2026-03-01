import React, { useEffect, useState } from 'react';
import trendAutomationApi from '../../services/trendAutomationApi';

export default function ShortsReelsSettings() {
  const [settings, setSettings] = useState(null);
  const [driveStatus, setDriveStatus] = useState(null);

  useEffect(() => {
    trendAutomationApi.getSettings().then(setSettings);
    trendAutomationApi.driveAuth().then(setDriveStatus).catch(() => setDriveStatus({ authenticated: false }));
  }, []);

  const update = (key, value) => setSettings((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    const payload = {
      keywords: settings.keywords,
      cronTimes: settings.cronTimes,
      maxConcurrentDownload: settings.maxConcurrentDownload,
      minViewsFilter: settings.minViewsFilter,
      minChannelFollowers: settings.minChannelFollowers,
      minChannelTotalVideos: settings.minChannelTotalVideos,
      highPriorityViews: settings.highPriorityViews,
      proxyList: settings.proxyList,
      telegramBotToken: settings.telegramBotToken,
      isEnabled: settings.isEnabled,
    };
    const saved = await trendAutomationApi.updateSettings(payload);
    setSettings(saved);
  };

  if (!settings) return <div className="p-6 text-gray-100">Loading...</div>;

  return (
    <div className="p-6 text-gray-100 space-y-4">
      <h1 className="text-2xl font-bold">Automation Settings</h1>

      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 grid md:grid-cols-2 gap-4">
        <label className="text-sm">Discover Cron<input className="w-full mt-1 bg-gray-900 border border-gray-700 rounded px-3 py-2" value={settings.cronTimes?.discover || ''} onChange={(e) => update('cronTimes', { ...settings.cronTimes, discover: e.target.value })} /></label>
        <label className="text-sm">Scan Cron<input className="w-full mt-1 bg-gray-900 border border-gray-700 rounded px-3 py-2" value={settings.cronTimes?.scan || ''} onChange={(e) => update('cronTimes', { ...settings.cronTimes, scan: e.target.value })} /></label>
        <label className="text-sm">Max concurrent download<input type="number" min="1" max="10" className="w-full mt-1 bg-gray-900 border border-gray-700 rounded px-3 py-2" value={settings.maxConcurrentDownload || 3} onChange={(e) => update('maxConcurrentDownload', Number(e.target.value))} /></label>
        <label className="text-sm">Min views filter (video hot)<input type="number" className="w-full mt-1 bg-gray-900 border border-gray-700 rounded px-3 py-2" value={settings.minViewsFilter || 100000} onChange={(e) => update('minViewsFilter', Number(e.target.value))} /></label>
        <label className="text-sm">Min channel followers (kênh nổi tiếng)<input type="number" className="w-full mt-1 bg-gray-900 border border-gray-700 rounded px-3 py-2" value={settings.minChannelFollowers || 100000} onChange={(e) => update('minChannelFollowers', Number(e.target.value))} /></label>
        <label className="text-sm">Min total videos/channel<input type="number" className="w-full mt-1 bg-gray-900 border border-gray-700 rounded px-3 py-2" value={settings.minChannelTotalVideos || 10} onChange={(e) => update('minChannelTotalVideos', Number(e.target.value))} /></label>
        <label className="text-sm">High priority views threshold<input type="number" className="w-full mt-1 bg-gray-900 border border-gray-700 rounded px-3 py-2" value={settings.highPriorityViews || 1000000} onChange={(e) => update('highPriorityViews', Number(e.target.value))} /></label>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <h2 className="font-semibold mb-2">Keywords by topic (JSON array)</h2>
        <p className="text-xs text-gray-400 mb-3">Tip: thêm các từ khóa trend + hashtag để tăng tỷ lệ bắt video viral.</p>
        {['hai', 'dance', 'cooking'].map((topic) => (
          <div key={topic} className="mb-3">
            <p className="capitalize mb-1">{topic}</p>
            <textarea className="w-full bg-gray-900 border border-gray-700 rounded p-2 h-20" value={JSON.stringify(settings.keywords?.[topic] || [])} onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                update('keywords', { ...settings.keywords, [topic]: parsed });
              } catch (_) {}
            }} />
          </div>
        ))}
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <h2 className="font-semibold mb-2">Google Drive (Downloaded/Youtube & Downloaded/Reels)</h2>
        <p className="text-sm text-gray-300 mb-2">Auth status: {driveStatus?.authenticated ? '✅ Authenticated' : '⚠️ Not authenticated/configured'}</p>
        <div className="flex gap-2">
          <button onClick={async () => setDriveStatus(await trendAutomationApi.driveAuth())} className="px-3 py-2 bg-gray-700 rounded">Refresh Drive Auth</button>
          <button onClick={() => trendAutomationApi.driveInitFolders()} className="px-3 py-2 bg-blue-600 rounded">Init Downloaded Folders</button>
        </div>
      </div>

      <button onClick={save} className="px-4 py-2 bg-green-600 rounded">Save settings</button>
    </div>
  );
}
