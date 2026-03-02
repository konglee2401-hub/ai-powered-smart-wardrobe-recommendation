import React, { useEffect, useState } from 'react';
import trendAutomationApi from '../../services/trendAutomationApi';

export default function ShortsReelsSettings() {
  const [settings, setSettings] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [settingsData, metadataData, configsData] = await Promise.all([
        trendAutomationApi.getSettings(),
        trendAutomationApi.getPlayboardMetadata(),
        trendAutomationApi.getPlayboardConfigs(),
      ]);
      setSettings(settingsData);
      setMetadata(metadataData);
      setConfigs(configsData.configs || []);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const update = (key, value) => setSettings((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        keywords: settings.keywords,
        cronTimes: settings.cronTimes,
        maxConcurrentDownload: settings.maxConcurrentDownload,
        minViewsFilter: settings.minViewsFilter,
        proxyList: settings.proxyList,
        telegramBotToken: settings.telegramBotToken,
        isEnabled: settings.isEnabled,
      };
      await trendAutomationApi.updateSettings(payload);
      await trendAutomationApi.updatePlayboardConfigs(configs);
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const addConfig = () => {
    const newConfig = {
      dimension: 'most-viewed',
      category: 'All',
      country: 'Worldwide',
      period: 'weekly',
      isActive: true,
      priority: 5,
    };
    setConfigs([...configs, newConfig]);
  };

  const updateConfig = (index, field, value) => {
    const updated = [...configs];
    updated[index] = { ...updated[index], [field]: value };
    setConfigs(updated);
  };

  const removeConfig = async (index) => {
    try {
      await trendAutomationApi.deletePlayboardConfig(index);
      setConfigs(configs.filter((_, i) => i !== index));
    } catch (error) {
      console.error('Failed to delete config:', error);
      // Fallback: just remove from local state
      setConfigs(configs.filter((_, i) => i !== index));
    }
  };

  if (loading || !settings || !metadata) {
    return <div className="p-6 text-gray-100">Loading...</div>;
  }

  return (
    <div className="p-6 text-gray-100 space-y-6">
      <h1 className="text-2xl font-bold">Automation Settings</h1>

      {/* General Settings */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 grid md:grid-cols-2 gap-4">
        <label className="text-sm">Discover Cron<input className="w-full mt-1 bg-gray-900 border border-gray-700 rounded px-3 py-2" value={settings.cronTimes?.discover || ''} onChange={(e) => update('cronTimes', { ...settings.cronTimes, discover: e.target.value })} /></label>
        <label className="text-sm">Scan Cron<input className="w-full mt-1 bg-gray-900 border border-gray-700 rounded px-3 py-2" value={settings.cronTimes?.scan || ''} onChange={(e) => update('cronTimes', { ...settings.cronTimes, scan: e.target.value })} /></label>
        <label className="text-sm">Max concurrent download<input type="number" min="1" max="10" className="w-full mt-1 bg-gray-900 border border-gray-700 rounded px-3 py-2" value={settings.maxConcurrentDownload || 3} onChange={(e) => update('maxConcurrentDownload', Number(e.target.value))} /></label>
        <label className="text-sm">Min views filter<input type="number" className="w-full mt-1 bg-gray-900 border border-gray-700 rounded px-3 py-2" value={settings.minViewsFilter || 100000} onChange={(e) => update('minViewsFilter', Number(e.target.value))} /></label>
      </div>

      {/* Keywords */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <h2 className="font-semibold mb-2">Keywords by topic (JSON array)</h2>
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

      {/* Playboard Configs */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold">Playboard Chart Configurations</h2>
          <button onClick={addConfig} className="px-3 py-1 bg-blue-600 rounded text-sm hover:bg-blue-500">
            + Add Config
          </button>
        </div>

        <div className="space-y-3">
          {configs.map((config, index) => (
            <div key={index} className="bg-gray-900 border border-gray-700 rounded p-3 grid md:grid-cols-6 gap-3 items-end">
              <label className="text-xs">
                Category
                <select
                  className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm"
                  value={config.category}
                  onChange={(e) => updateConfig(index, 'category', e.target.value)}
                >
                  {metadata.categories?.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </label>

              <label className="text-xs">
                Country
                <select
                  className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm"
                  value={config.country}
                  onChange={(e) => updateConfig(index, 'country', e.target.value)}
                >
                  {metadata.countries?.map((c) => (
                    <option key={c.code} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </label>

              <label className="text-xs">
                Dimension
                <select
                  className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm"
                  value={config.dimension}
                  onChange={(e) => updateConfig(index, 'dimension', e.target.value)}
                >
                  {metadata.dimensions?.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </label>

              <label className="text-xs">
                Period
                <select
                  className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm"
                  value={config.period}
                  onChange={(e) => updateConfig(index, 'period', e.target.value)}
                >
                  {metadata.periods?.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </label>

              <label className="text-xs">
                Priority
                <input
                  type="number"
                  min="1"
                  max="10"
                  className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm"
                  value={config.priority || 5}
                  onChange={(e) => updateConfig(index, 'priority', Number(e.target.value))}
                />
              </label>

              <div className="flex gap-2">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.isActive !== false}
                    onChange={(e) => updateConfig(index, 'isActive', e.target.checked)}
                  />
                  Active
                </label>
                <button
                  onClick={() => removeConfig(index)}
                  className="px-2 py-1 bg-red-600 rounded text-xs hover:bg-red-500"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {configs.length === 0 && (
          <p className="text-gray-400 text-sm mt-4">No configurations. Click "Add Config" to create one.</p>
        )}
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="px-4 py-2 bg-green-600 rounded hover:bg-green-500 disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save settings'}
      </button>
    </div>
  );
}
