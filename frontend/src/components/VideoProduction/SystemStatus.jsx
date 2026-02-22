/**
 * System Status Component
 * Displays real-time system metrics and health
 */

import React, { useEffect } from 'react';
import useVideoProductionStore from '@/stores/videoProductionStore.js';
import { Activity, AlertCircle, CheckCircle, BarChart3, Zap } from 'lucide-react';

export function SystemStatus() {
  const { systemStatus, getSystemStatus } = useVideoProductionStore();

  useEffect(() => {
    getSystemStatus();
    const interval = setInterval(getSystemStatus, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [getSystemStatus]);

  if (!systemStatus) {
    return (
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 animate-pulse">
        <div className="h-8 bg-gray-700 rounded w-48 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-700 rounded"></div>
          <div className="h-4 bg-gray-700 rounded w-4/5"></div>
        </div>
      </div>
    );
  }

  const getHealthColor = (status) => {
    switch (status) {
      case 'healthy':
        return 'text-green-400';
      case 'warning':
        return 'text-yellow-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getHealthBg = (status) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-900/30';
      case 'warning':
        return 'bg-yellow-900/30';
      case 'error':
        return 'bg-red-900/30';
      default:
        return 'bg-gray-900/30';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Health Status */}
      <div className={`${getHealthBg(systemStatus.health)} border ${getHealthColor(systemStatus.health)} border-opacity-50 rounded-lg p-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {systemStatus.health === 'healthy' && <CheckCircle className="w-5 h-5" />}
            {systemStatus.health === 'warning' && <AlertCircle className="w-5 h-5" />}
            {systemStatus.health === 'error' && <AlertCircle className="w-5 h-5" />}
            <span className="font-semibold">System Health</span>
          </div>
          <span className="text-sm font-medium uppercase">{systemStatus.health}</span>
        </div>
        {systemStatus.healthMessage && (
          <p className="text-sm mt-2 opacity-80">{systemStatus.healthMessage}</p>
        )}
      </div>

      {/* Queue Stats */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-5 h-5 text-purple-400" />
          <span className="font-semibold">Queue Activity</span>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Pending Videos</span>
            <span className="font-medium">{systemStatus.queueStats?.pending || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Processing</span>
            <span className="font-medium">{systemStatus.queueStats?.processing || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Completed Today</span>
            <span className="font-medium text-green-400">{systemStatus.queueStats?.completed || 0}</span>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-5 h-5 text-blue-400" />
          <span className="font-semibold">Performance</span>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">CPU Usage</span>
            <span className={`font-medium ${(systemStatus.performance?.cpu || 0) > 80 ? 'text-red-400' : 'text-green-400'}`}>
              {systemStatus.performance?.cpu || 0}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Memory Usage</span>
            <span className={`font-medium ${(systemStatus.performance?.memory || 0) > 80 ? 'text-red-400' : 'text-green-400'}`}>
              {systemStatus.performance?.memory || 0}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Uptime</span>
            <span className="font-medium">{systemStatus.performance?.uptime || 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Active Processes */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-5 h-5 text-yellow-400" />
          <span className="font-semibold">Active Processes</span>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Generation Jobs</span>
            <span className="font-medium">{systemStatus.activeProcesses?.generation || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Upload Tasks</span>
            <span className="font-medium">{systemStatus.activeProcesses?.uploads || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Cron Jobs</span>
            <span className="font-medium">{systemStatus.activeProcesses?.crons || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
