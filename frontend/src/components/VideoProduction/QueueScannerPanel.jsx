/**
 * QueueScannerPanel.jsx
 * Frontend control panel for Queue Scanner
 */

import React, { useState, useEffect } from 'react';
import { Zap, Eye, BarChart3, AlertCircle, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import useVideoProductionStore from '@/stores/videoProductionStore.js';

export function QueueScannerPanel() {
  const { accounts, getAllAccounts } = useVideoProductionStore();
  const [isScanning, setIsScanning] = useState(false);
  const [status, setStatus] = useState(null);
  const [results, setResults] = useState([]);
  const [intervalMinutes, setIntervalMinutes] = useState(60);
  const [autoPublish, setAutoPublish] = useState(false);
  const [selectedAccounts, setSelectedAccounts] = useState([]);

  useEffect(() => {
    checkStatus();
    getAllAccounts();
  }, [getAllAccounts]);

  const checkStatus = async () => {
    try {
      const response = await fetch('/api/queue-scanner/status');
      const result = await response.json();
      if (result.success) {
        setStatus(result.data);
      }
    } catch (error) {
      console.error('Failed to check status:', error);
    }
  };

  const handleTriggerScan = async () => {
    try {
      setIsScanning(true);
      const response = await fetch('/api/queue-scanner/scan-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoPublish, accountIds: selectedAccounts })
      });

      const result = await response.json();
      if (result.success) {
        toast.success(`✓ Processed ${result.processed} videos!`);
        setResults(result.results || []);
        await checkStatus();
      } else {
        toast.error(`Failed: ${result.error}`);
      }
    } catch (error) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  const handleInitializeSchedule = async () => {
    try {
      const response = await fetch('/api/queue-scanner/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intervalMinutes, autoPublish, accountIds: selectedAccounts })
      });

      const result = await response.json();
      if (result.success) {
        toast.success(`Queue Scanner scheduled every ${intervalMinutes} minutes`);
        await checkStatus();
      }
    } catch (error) {
      toast.error(`Error: ${error.message}`);
    }
  };

  const toggleAccount = (accountId) => {
    setSelectedAccounts(prev => prev.includes(accountId) ? prev.filter(id => id !== accountId) : [...prev, accountId]);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg p-6 border border-gray-700 space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2"><Zap className="w-5 h-5 text-yellow-400" />Queue Scanner + Scheduler</h3>

        <div className="grid md:grid-cols-2 gap-3">
          <button onClick={handleTriggerScan} disabled={isScanning} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 px-4 py-2 rounded-lg font-semibold transition">
            {isScanning ? '⏳ Scanning...' : '▶ Trigger Scan Now'}
          </button>

          <button onClick={handleInitializeSchedule} className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 px-4 py-2 rounded-lg font-semibold transition">
            ⏰ Save Scheduler
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <label className="text-sm">Scan every (minutes)
            <input type="number" min="1" value={intervalMinutes} onChange={(e) => setIntervalMinutes(Number(e.target.value) || 1)} className="w-full mt-1 bg-gray-700 border border-gray-600 rounded px-3 py-2" />
          </label>
          <label className="text-sm flex items-end gap-2 pb-2">
            <input type="checkbox" checked={autoPublish} onChange={(e) => setAutoPublish(e.target.checked)} />
            Auto publish after processing
          </label>
        </div>

        <div>
          <p className="text-sm text-gray-300 mb-2">Publish accounts (multi-select)</p>
          <div className="flex flex-wrap gap-2">
            {(accounts.items || []).map(account => (
              <button key={account.accountId} onClick={() => toggleAccount(account.accountId)} className={`text-xs px-2 py-1 rounded border ${selectedAccounts.includes(account.accountId) ? 'bg-green-700 border-green-500' : 'bg-gray-800 border-gray-600'}`}>
                {account.platform}:{account.displayName}
              </button>
            ))}
          </div>
        </div>
      </div>

      {status && <div className="bg-gray-800 rounded-lg p-6 border border-gray-700"><h4 className="font-semibold mb-4 flex items-center gap-2"><Eye className="w-5 h-5 text-blue-400" />Status</h4><p className="text-sm text-gray-300">Queue count: {status.queueCount || 0}</p><p className="text-sm text-gray-300">Running: {status.isRunning ? 'Yes' : 'No'}</p><p className="text-sm text-gray-300">Configured interval: {status.scheduleConfig?.intervalMinutes || '-'} minutes</p><p className="text-sm text-gray-300">Auto publish: {status.scheduleConfig?.autoPublish ? 'Yes' : 'No'}</p></div>}

      {results.length > 0 && <div className="bg-gray-800 rounded-lg p-6 border border-gray-700"><h4 className="font-semibold mb-4 flex items-center gap-2"><Check className="w-5 h-5 text-green-400" />Last Scan Results ({results.length})</h4><div className="space-y-2">{results.map((result, idx) => <div key={idx} className="bg-gray-700/40 rounded p-2 text-sm">{result.queueVideo} - {result.status}</div>)}</div></div>}

      <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-4 text-sm text-gray-300 flex gap-3">
        <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div><p className="font-semibold text-blue-300 mb-1">Scheduler support:</p><ol className="text-xs text-gray-400 space-y-1"><li>1. Tạo nhiều account và lưu API key/token một lần.</li><li>2. Cấu hình lịch quét queue theo phút.</li><li>3. Chọn auto publish để upload ngay khi video completed.</li></ol></div>
      </div>
    </div>
  );
}

export default QueueScannerPanel;
