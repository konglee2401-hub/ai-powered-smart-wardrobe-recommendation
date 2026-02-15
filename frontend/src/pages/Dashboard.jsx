/**
 * Dashboard Page
 * Overview of AI generation statistics and recent activity
 */

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, TrendingUp, Image, Clock, 
  CheckCircle, XCircle, AlertCircle, RefreshCw
} from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalGenerations: 0,
    successfulGenerations: 0,
    failedGenerations: 0,
    averageGenerationTime: 0,
  });
  const [recentGenerations, setRecentGenerations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      setLoading(true);
      // Mock data for now - in real app, fetch from API
      setStats({
        totalGenerations: 156,
        successfulGenerations: 142,
        failedGenerations: 14,
        averageGenerationTime: 3.2,
      });
      setRecentGenerations([
        { id: 1, type: 'Image', status: 'success', timestamp: new Date().toISOString(), provider: 'OpenAI' },
        { id: 2, type: 'Image', status: 'success', timestamp: new Date().toISOString(), provider: 'NVIDIA' },
        { id: 3, type: 'Video', status: 'failed', timestamp: new Date().toISOString(), provider: 'OpenAI' },
      ]);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  const successRate = stats.totalGenerations > 0 
    ? ((stats.successfulGenerations / stats.totalGenerations) * 100).toFixed(1)
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <button 
          onClick={loadDashboardData}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Image className="w-6 h-6 text-purple-600" />
            </div>
            <span className="text-green-500 flex items-center gap-1 text-sm">
              <TrendingUp className="w-4 h-4" />
              +12%
            </span>
          </div>
          <div className="text-3xl font-bold text-gray-800">{stats.totalGenerations}</div>
          <div className="text-gray-500 text-sm">Total Generations</div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-800">{stats.successfulGenerations}</div>
          <div className="text-gray-500 text-sm">Successful</div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-red-100 rounded-lg">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-800">{stats.failedGenerations}</div>
          <div className="text-gray-500 text-sm">Failed</div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-800">{stats.averageGenerationTime}s</div>
          <div className="text-gray-500 text-sm">Avg. Generation Time</div>
        </div>
      </div>

      {/* Success Rate */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Success Rate</h2>
        <div className="flex items-center gap-4">
          <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
              style={{ width: `${successRate}%` }}
            />
          </div>
          <div className="text-2xl font-bold text-gray-800">{successRate}%</div>
        </div>
      </div>

      {/* Recent Generations */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Generations</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Type</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Provider</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Time</th>
              </tr>
            </thead>
            <tbody>
              {recentGenerations.map((gen) => (
                <tr key={gen.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Image className="w-4 h-4 text-gray-500" />
                      {gen.type}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{gen.provider}</td>
                  <td className="py-3 px-4">
                    {gen.status === 'success' ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        Success
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-600">
                        <XCircle className="w-4 h-4" />
                        Failed
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-gray-500 text-sm">
                    {new Date(gen.timestamp).toLocaleString('vi-VN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
