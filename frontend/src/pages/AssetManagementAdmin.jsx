/**
 * Asset Management Admin Panel
 * Manage, monitor, and maintain assets in the system
 */

import React, { useState, useEffect } from 'react';
import {
  Activity, RefreshCw, Trash2, BarChart3, HardDrive,
  AlertCircle, CheckCircle, Cloud, Zap, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getAuthHeaders } from '../services/authHeaders';

const API_URL = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

export default function AssetManagementAdmin() {
  const [stats, setStats] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const authHeaders = getAuthHeaders();
      const [statsRes, healthRes] = await Promise.all([
        fetch(`${API_URL}/admin/stats/assets`, { headers: authHeaders }),
        fetch(`${API_URL}/admin/asset-health`, { headers: authHeaders })
      ]);

      const statsData = await statsRes.json();
      const healthData = await healthRes.json();

      setStats(statsData.stats);
      setHealth(healthData);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load admin data:', error);
      toast.error('Lá»—i táº£i dá»¯ liá»‡u quáº£n lÃ½');
    }
  };

  const runScript = async (endpoint, title, options = {}) => {
    setExecuting(endpoint);
    try {
      const res = await fetch(`${API_URL}/admin/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(options)
      });

      const data = await res.json();

      if (data.success) {
        toast.success(`âœ… ${title} thÃ nh cÃ´ng`, { duration: 5000 });
        // Reload data after execution
        await loadData();
      } else {
        toast.error(`âŒ ${title} tháº¥t báº¡i: ${data.error}`);
      }
    } catch (error) {
      toast.error(`âŒ Lá»—i: ${error.message}`);
    } finally {
      setExecuting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-500 mx-auto mb-4" />
          <p className="text-gray-300">Äang táº£i dá»¯ liá»‡u...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">ðŸ”§ Quáº£n LÃ½ Asset</h1>
            <p className="text-gray-400">GiÃ¡m sÃ¡t vÃ  báº£o trÃ¬ tÃ i nguyÃªn há»‡ thá»‘ng</p>
          </div>
          <button
            onClick={loadData}
            disabled={executing !== null}
            className="flex items-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${executing !== null ? 'animate-spin' : ''}`} />
            LÃ m má»›i
          </button>
        </div>

        {/* Health Status */}
        {health && (
          <div className="bg-gradient-to-r from-emerald-900/50 to-teal-900/50 border border-emerald-700 rounded-lg p-6 mb-8">
            <div className="flex items-start gap-4">
              <CheckCircle className="w-8 h-8 text-emerald-400 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white mb-2">ðŸ“Š Tráº¡ng ThÃ¡i Asset</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-800/50 rounded p-3">
                    <div className="text-2xl font-bold text-emerald-400">{health.stats.healthy.count}</div>
                    <div className="text-sm text-gray-300">ÄÃ£ lÆ°u Ä‘á»‹a phÆ°Æ¡ng & Drive ({health.stats.healthy.percent}%)</div>
                  </div>
                  <div className="bg-slate-800/50 rounded p-3">
                    <div className="text-2xl font-bold text-blue-400">{health.stats.driveOnly.count}</div>
                    <div className="text-sm text-gray-300">Chá»‰ Drive ({health.stats.driveOnly.percent}%)</div>
                  </div>
                  <div className="bg-slate-800/50 rounded p-3">
                    <div className="text-2xl font-bold text-amber-400">{health.stats.localOnly.count}</div>
                    <div className="text-sm text-gray-300">Chá»‰ Ä‘á»‹a phÆ°Æ¡ng ({health.stats.localOnly.percent}%)</div>
                  </div>
                  <div className="bg-slate-800/50 rounded p-3">
                    <div className="text-2xl font-bold text-red-400">{health.stats.broken.count}</div>
                    <div className="text-sm text-gray-300">Bá»‹ há»ng ({health.stats.broken.percent}%)</div>
                  </div>
                </div>
                <p className="text-sm text-gray-300 mt-4">{health.recommendation}</p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <BarChart3 className="w-6 h-6 text-blue-400" />
                <h3 className="text-lg font-semibold text-white">Tá»•ng Asset</h3>
              </div>
              <div className="text-3xl font-bold text-blue-400">{stats.total}</div>
              <div className="text-sm text-gray-400 mt-2">
                âœ… {stats.active} hoáº¡t Ä‘á»™ng â€¢ âšª {stats.inactive} ngá»«ng
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <Cloud className="w-6 h-6 text-purple-400" />
                <h3 className="text-lg font-semibold text-white">LÆ°u Trá»¯</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Cáº£ hai:</span>
                  <span className="font-bold text-emerald-400">{stats.byStorage.both}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Chá»‰ Drive:</span>
                  <span className="font-bold text-blue-400">{stats.byStorage.drive}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Chá»‰ Ä‘á»‹a phÆ°Æ¡ng:</span>
                  <span className="font-bold text-amber-400">{stats.byStorage.local}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <HardDrive className="w-6 h-6 text-cyan-400" />
                <h3 className="text-lg font-semibold text-white">Loáº¡i Asset</h3>
              </div>
              <div className="space-y-1 text-sm">
                {Object.entries(stats.byType)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 3)
                  .map(([type, count]) => (
                    <div key={type} className="flex justify-between">
                      <span className="text-gray-300 capitalize">{type}:</span>
                      <span className="font-bold text-gray-100">{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-6">
          {/* Health Monitoring */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <Activity className="w-6 h-6 text-emerald-400" />
              ðŸ“ˆ GiÃ¡m SÃ¡t Sá»©c Khá»e
            </h2>
            <p className="text-gray-300 mb-4">Kiá»ƒm tra tráº¡ng thÃ¡i táº¥t cáº£ asset vÃ  xÃ¡c Ä‘á»‹nh nhá»¯ng váº¥n Ä‘á» tiá»m áº©n</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => runScript('run-asset-health-monitor', 'Kiá»ƒm tra sá»©c khá»e Asset')}
                disabled={executing !== null}
                className="flex items-center gap-3 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50 font-semibold"
              >
                {executing === 'run-asset-health-monitor' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <CheckCircle className="w-5 h-5" />
                )}
                ðŸ¥ Kiá»ƒm Tra Sá»©c Khá»e
              </button>
              <button
                onClick={() => runScript('run-asset-storage-status', 'PhÃ¢n tÃ­ch lÆ°u trá»¯')}
                disabled={executing !== null}
                className="flex items-center gap-3 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 font-semibold"
              >
                {executing === 'run-asset-storage-status' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <BarChart3 className="w-5 h-5" />
                )}
                ðŸ“Š PhÃ¢n TÃ­ch LÆ°u Trá»¯
              </button>
            </div>
          </div>

          {/* Cleanup & Maintenance */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <Zap className="w-6 h-6 text-yellow-400" />
              ðŸ§¹ Báº£o TrÃ¬ & Dá»n Dáº¹p
            </h2>
            <p className="text-gray-300 mb-4">XoÃ¡ asset cÅ©, tá»‡p táº¡m thá»i vÃ  tá»‘i Æ°u hÃ³a dung lÆ°á»£ng lÆ°u trá»¯</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => {
                  if (confirm('âš ï¸ Cháº¿ Ä‘á»™ xem trÆ°á»›c: Sáº½ hiá»ƒn thá»‹ nhá»¯ng asset sáº¯p bá»‹ xoÃ¡ mÃ  khÃ´ng thá»±c sá»± xoÃ¡.\n\nTiáº¿p tá»¥c?')) {
                    runScript('run-delete-orphaned-assets', 'Xem trÆ°á»›c xoÃ¡ Asset', { confirm: false });
                  }
                }}
                disabled={executing !== null}
                className="flex items-center gap-3 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors disabled:opacity-50 font-semibold"
              >
                {executing === 'run-delete-orphaned-assets' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
                ðŸ‘ï¸ Xem TrÆ°á»›c XoÃ¡
              </button>
              <button
                onClick={() => {
                  if (confirm('âš ï¸ Cáº¢NH BÃO: Sáº½ XOÃ VÄ¨NH VIá»„N nhá»¯ng asset má»“ cÃ´i khá»i cÆ¡ sá»Ÿ dá»¯ liá»‡u!\n\nBáº¡n thá»±c sá»± muá»‘n tiáº¿p tá»¥c?')) {
                    runScript('run-delete-orphaned-assets', 'XoÃ¡ Asset má»“ cÃ´i', { confirm: true });
                  }
                }}
                disabled={executing !== null}
                className="flex items-center gap-3 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 font-semibold"
              >
                {executing === 'run-delete-orphaned-assets' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Trash2 className="w-5 h-5" />
                )}
                ðŸ”¥ XoÃ¡ Má»“ CÃ´i
              </button>
              <button
                onClick={() => runScript('cleanup-temp-files', 'Dá»n dáº¹p tá»‡p táº¡m thá»i')}
                disabled={executing !== null}
                className="flex items-center gap-3 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors disabled:opacity-50 font-semibold col-span-1 md:col-span-2"
              >
                {executing === 'cleanup-temp-files' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Zap className="w-5 h-5" />
                )}
                ðŸ—‘ï¸ Dá»n Dáº¹p Tá»‡p Táº¡m (> 7 ngÃ y)
              </button>
            </div>
          </div>

          {/* Category Breakdown */}
          {health && health.byCategory && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-white mb-4">ðŸ“‚ Asset theo Danh Má»¥c</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(health.byCategory)
                  .sort(([,a], [,b]) => b.total - a.total)
                  .map(([category, data]) => (
                    <div key={category} className="bg-slate-700/50 border border-slate-600 rounded p-4">
                      <div className="font-semibold text-white mb-3 capitalize">{category}</div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-300">Tá»•ng:</span>
                          <span className="font-bold text-white">{data.total}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-300">Cáº£ hai:</span>
                          <span className="font-bold text-emerald-400">{data.healthy}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-300">Chá»‰ Drive:</span>
                          <span className="font-bold text-blue-400">{data.driveOnly}</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

