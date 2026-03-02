import React, { useEffect, useState } from 'react';
import trendAutomationApi from '../../services/trendAutomationApi';
import TrendAutomationLayout from '../../components/TrendAutomationLayout';

export default function ShortsReelsSettings() {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    trendAutomationApi.getSettings().then(setSettings);
  }, []);

  const update = (key, value) => setSettings((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    const payload = {
      keywords: settings.keywords,
      cronTimes: settings.cronTimes,
      maxConcurrentDownload: settings.maxConcurrentDownload,
      minViewsFilter: settings.minViewsFilter,
      proxyList: settings.proxyList,
      telegramBotToken: settings.telegramBotToken,
      isEnabled: settings.isEnabled,
    };
    const saved = await trendAutomationApi.updateSettings(payload);
    setSettings(saved);
  };

  if (!settings) {
    return (
      <TrendAutomationLayout title="Schedule Settings">
        <div className="text-gray-100">Loading...</div>
      </TrendAutomationLayout>
    );
  }

  return (
    <TrendAutomationLayout
      title="Schedule & Automation Settings"
      subtitle="UI cấu hình theo model TrendSetting: cron discover/scan, giới hạn download, filter views và keyword topics."
    >
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 grid md:grid-cols-2 gap-4">
        <label className="text-sm">Discover Cron<input className="w-full mt-1 bg-gray-950 border border-gray-700 rounded px-3 py-2" value={settings.cronTimes?.discover || ''} onChange={(e) => update('cronTimes', { ...settings.cronTimes, discover: e.target.value })} /></label>
        <label className="text-sm">Scan Cron<input className="w-full mt-1 bg-gray-950 border border-gray-700 rounded px-3 py-2" value={settings.cronTimes?.scan || ''} onChange={(e) => update('cronTimes', { ...settings.cronTimes, scan: e.target.value })} /></label>
        <label className="text-sm">Max concurrent download<input type="number" min="1" max="10" className="w-full mt-1 bg-gray-950 border border-gray-700 rounded px-3 py-2" value={settings.maxConcurrentDownload || 3} onChange={(e) => update('maxConcurrentDownload', Number(e.target.value))} /></label>
        <label className="text-sm">Min views filter<input type="number" className="w-full mt-1 bg-gray-950 border border-gray-700 rounded px-3 py-2" value={settings.minViewsFilter || 100000} onChange={(e) => update('minViewsFilter', Number(e.target.value))} /></label>
        <label className="text-sm md:col-span-2">Telegram Bot Token<input className="w-full mt-1 bg-gray-950 border border-gray-700 rounded px-3 py-2" value={settings.telegramBotToken || ''} onChange={(e) => update('telegramBotToken', e.target.value)} /></label>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <h2 className="font-semibold mb-2">Keywords by topic (JSON array)</h2>
        {['hai', 'dance', 'cooking'].map((topic) => (
          <div key={topic} className="mb-3">
            <p className="capitalize mb-1">{topic}</p>
            <textarea className="w-full bg-gray-950 border border-gray-700 rounded p-2 h-20" value={JSON.stringify(settings.keywords?.[topic] || [])} onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                update('keywords', { ...settings.keywords, [topic]: parsed });
              } catch (_) {}
            }} />
          </div>
        ))}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={Boolean(settings.isEnabled)} onChange={(e) => update('isEnabled', e.target.checked)} />
          <span>Automation Enabled</span>
        </label>
      </div>

      <button onClick={save} className="px-4 py-2 bg-green-600 rounded w-fit">Save settings</button>
    </TrendAutomationLayout>
  );
}
