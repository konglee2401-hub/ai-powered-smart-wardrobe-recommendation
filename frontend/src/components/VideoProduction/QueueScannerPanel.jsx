/**
 * QueueScannerPanel.jsx
 * Frontend control panel for Queue Scanner
 */

import React, { useState, useEffect } from 'react';
import { Zap, Eye, BarChart3, AlertCircle, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export function QueueScannerPanel() {
  const [isScanning, setIsScanning] = useState(false);
  const [status, setStatus] = useState(null);
  const [results, setResults] = useState([]);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      checkStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

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
        method: 'POST'
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
        body: JSON.stringify({ intervalMinutes: 60 })
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Queue Scanner scheduled every 60 minutes');
      }
    } catch (error) {
      toast.error(`Error: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          Queue Scanner
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            onClick={handleTriggerScan}
            disabled={isScanning}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 px-4 py-2 rounded-lg font-semibold transition"
          >
            {isScanning ? '⏳ Scanning...' : '▶ Trigger Scan Now'}
          </button>

          <button
            onClick={handleInitializeSchedule}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 px-4 py-2 rounded-lg font-semibold transition"
          >
            ⏰ Initialize Schedule
          </button>
        </div>
      </div>

      {/* Status Card */}
      {status && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h4 className="font-semibold mb-4 flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-400" />
            Status
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-700/50 rounded-lg p-4">
              <p className="text-sm text-gray-400">Queue Count</p>
              <p className="text-2xl font-bold text-white mt-1">{status.queueCount || 0}</p>
            </div>

            <div className="bg-gray-700/50 rounded-lg p-4">
              <p className="text-sm text-gray-400">Status</p>
              <p className={`text-lg font-bold mt-1 ${status.isRunning ? 'text-yellow-400' : 'text-green-400'}`}>
                {status.isRunning ? '⏳ Running' : '✓ Ready'}
              </p>
            </div>

            <div className="bg-gray-700/50 rounded-lg p-4">
              <p className="text-sm text-gray-400">Last Check</p>
              <p className="text-sm font-semibold text-gray-300 mt-1">Just now</p>
            </div>
          </div>

          {/* Queue Videos List */}
          {status.videos && status.videos.length > 0 && (
            <div className="mt-4">
              <h5 className="text-sm font-semibold text-gray-300 mb-2">
                <BarChart3 className="w-4 h-4 inline mr-2" />
                Videos in Queue ({status.videos.length})
              </h5>
              <div className="space-y-2">
                {status.videos.map((video, idx) => (
                  <div key={idx} className="bg-gray-700/50 rounded p-2 text-xs text-gray-300">
                    <div className="flex items-center justify-between">
                      <span className="truncate">{video.name}</span>
                      <span className="text-gray-500 ml-2">{video.size}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h4 className="font-semibold mb-4 flex items-center gap-2">
            <Check className="w-5 h-5 text-green-400" />
            Last Scan Results ({results.length})
          </h4>

          <div className="space-y-3">
            {results.map((result, idx) => (
              <div 
                key={idx} 
                className={`rounded-lg p-3 text-sm ${
                  result.status === 'success' 
                    ? 'bg-green-900/30 border border-green-500/50' 
                    : 'bg-red-900/30 border border-red-500/50'
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className={result.status === 'success' ? 'text-green-400' : 'text-red-400'}>
                    {result.status === 'success' ? '✓' : '✗'}
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-200">{result.queueVideo}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {result.status === 'success' ? (
                        <>
                          Sub: {result.subVideo} → Mashup: {result.mashupId}
                        </>
                      ) : (
                        result.error
                      )}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-4 text-sm text-gray-300 flex gap-3">
        <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-blue-300 mb-1">How it works:</p>
          <ol className="text-xs text-gray-400 space-y-1">
            <li>1. Upload main video to Queue folder</li>
            <li>2. Click "Trigger Scan" or wait for scheduled run</li>
            <li>3. System automatically selects random sub-video</li>
            <li>4. Generates 2/3 + 1/3 mashup (YouTube 9:16 format)</li>
            <li>5. Saves completed video to Completed folder</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default QueueScannerPanel;
