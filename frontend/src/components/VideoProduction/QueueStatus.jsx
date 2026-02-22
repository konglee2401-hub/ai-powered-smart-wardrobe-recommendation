/**
 * Queue Status Component
 * Displays queue metrics and management interface
 */

import React, { useEffect, useState } from 'react';
import useVideoProductionStore from '@/stores/videoProductionStore.js';
import { Video, TrendingUp, AlertTriangle, Play } from 'lucide-react';
import toast from 'react-hot-toast';

export function QueueStatus() {
  const { queue, getQueueStats } = useVideoProductionStore();
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    getQueueStats();
    const interval = setInterval(getQueueStats, 3000);
    return () => clearInterval(interval);
  }, [getQueueStats]);

  if (queue.loading) {
    return (
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 animate-pulse">
        <div className="h-8 bg-gray-700 rounded w-48 mb-4"></div>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-4 bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  const stats = queue.stats || {};
  const items = queue.items || [];

  return (
    <div className="space-y-4">
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Video className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-gray-400">Total Queued</span>
          </div>
          <div className="text-2xl font-bold">{stats.total || 0}</div>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Play className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-gray-400">Processing</span>
          </div>
          <div className="text-2xl font-bold text-blue-400">{stats.processing || 0}</div>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-sm text-gray-400">Completed</span>
          </div>
          <div className="text-2xl font-bold text-green-400">{stats.completed || 0}</div>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-sm text-gray-400">Failed</span>
          </div>
          <div className="text-2xl font-bold text-red-400">{stats.failed || 0}</div>
        </div>
      </div>

      {/* Queue Items List */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Video className="w-4 h-4" />
            Recent Queue Items
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-sm rounded ${
                filter === 'all' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-3 py-1 text-sm rounded ${
                filter === 'pending' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setFilter('processing')}
              className={`px-3 py-1 text-sm rounded ${
                filter === 'processing' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Processing
            </button>
          </div>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>No queued videos yet</p>
            </div>
          ) : (
            items
              .filter(item => filter === 'all' || item.status === filter)
              .slice(0, 10)
              .map((item, idx) => (
                <div
                  key={idx}
                  className="bg-gray-900/50 border border-gray-700/50 rounded p-3 flex justify-between items-center"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium truncate">{item.id || `Video ${idx + 1}`}</p>
                    <p className="text-xs text-gray-400">{item.platform || 'All Platforms'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded ${
                      item.status === 'pending'
                        ? 'bg-yellow-900/30 text-yellow-400'
                        : item.status === 'processing'
                        ? 'bg-blue-900/30 text-blue-400'
                        : item.status === 'completed'
                        ? 'bg-green-900/30 text-green-400'
                        : 'bg-red-900/30 text-red-400'
                    }`}>
                      {item.status || 'unknown'}
                    </span>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>

      {/* Priority Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <h3 className="font-semibold mb-3">By Priority</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">High</span>
              <span className="font-medium">{stats.byPriority?.high || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Normal</span>
              <span className="font-medium">{stats.byPriority?.normal || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Low</span>
              <span className="font-medium">{stats.byPriority?.low || 0}</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <h3 className="font-semibold mb-3">By Platform</h3>
          <div className="space-y-2 text-sm">
            {Object.entries(stats.byPlatform || {}).map(([platform, count]) => (
              <div key={platform} className="flex justify-between">
                <span className="text-gray-400 capitalize">{platform}</span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {queue.error && (
        <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4 text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4 inline mr-2" />
          {queue.error}
        </div>
      )}
    </div>
  );
}
