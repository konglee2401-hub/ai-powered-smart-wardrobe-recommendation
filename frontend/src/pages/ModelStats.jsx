/**
 * Model Statistics Page
 * Display comprehensive statistics and analytics
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  getOverallStats,
  getProviderStats,
  getUsageStats,
  getPerformanceMetrics,
  getUsageTrend,
  calculateSuccessRate,
  formatGenerationTime
} from '../services/statsService';
import axiosInstance from '../services/axios';
import { 
  TrendingUp, 
  Database, 
  RefreshCw, 
  CheckCircle, 
  XCircle,
  Clock,
  DollarSign,
  Zap,
  BarChart3,
  Activity,
  AlertCircle,
  Loader2,
  Calendar,
  Filter,
  Download,
  Target,
  Award,
  Info
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function ModelStats() {
  // State management
  const [stats, setStats] = useState(null);
  const [providerStats, setProviderStats] = useState([]);
  const [usageData, setUsageData] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [trend, setTrend] = useState(null);
  const [allModels, setAllModels] = useState([]);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [timeRange, setTimeRange] = useState('7d');
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Load all stats
  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [statsRes, providerRes, usageRes, metricsRes, trendRes, modelsRes] = await Promise.all([
        getOverallStats(),
        getProviderStats(),
        getUsageStats(timeRange),
        getPerformanceMetrics(),
        getUsageTrend(timeRange),
        axiosInstance.get(`/api/models`).catch(() => ({ data: { data: { models: [] } } }))
      ]);

      setStats(statsRes.data);
      setProviderStats(providerRes.data || []);
      setUsageData(usageRes.data || []);
      setMetrics(metricsRes.data);
      setTrend(trendRes.data);
      setAllModels(modelsRes.data?.data?.models || []);

    } catch (err) {
      console.error('Failed to load stats:', err);
      setError(err.message || 'Không thể tải thống kê. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  // Sync models
  const syncModels = async () => {
    setSyncing(true);
    
    try {
      await axios.post(`${API_BASE_URL}/models/sync`);
      await loadStats();
      alert('Đồng bộ models thành công!');
    } catch (error) {
      alert('Lỗi đồng bộ models: ' + error.message);
    } finally {
      setSyncing(false);
    }
  };

  const filteredModels = allModels.filter(model => {
    if (filter === 'all') return true;
    return model.type === filter;
  });

  // Get trend icon and color
  const getTrendInfo = () => {
    if (!trend) return { icon: Activity, color: 'text-gray-600', label: 'No data' };
    
    switch (trend.trend) {
      case 'increasing':
        return { icon: TrendingUp, color: 'text-green-600', label: `+${trend.change}%` };
      case 'decreasing':
        return { icon: TrendingUp, color: 'text-red-600', label: `${trend.change}%` };
      default:
        return { icon: Activity, color: 'text-gray-600', label: 'Ổn định' };
    }
  };

  const trendInfo = getTrendInfo();
  const TrendIcon = trendInfo.icon;

  // Loading State
  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 py-8 px-4 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto text-purple-600 animate-spin mb-4" />
          <p className="text-gray-600">Đang tải thống kê...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <BarChart3 className="w-8 h-8 text-purple-500" />
                Thống Kê & Phân Tích
              </h1>
              <p className="text-gray-600 mt-2">
                Theo dõi hiệu suất và sử dụng hệ thống
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Time Range Selector */}
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="7d">7 ngày</option>
                <option value="30d">30 ngày</option>
                <option value="90d">90 ngày</option>
                <option value="1y">1 năm</option>
              </select>
              
              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2 disabled:bg-gray-400"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Làm Mới
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
              ✕
            </button>
          </div>
        )}

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Generations */}
          <StatCard
            icon={Activity}
            iconColor="text-purple-500"
            iconBg="bg-purple-100"
            title="Tổng Số Lần Tạo"
            value={metrics?.totalGenerations || stats?.total || 0}
            subtitle={trend && (
              <span className={trendInfo.color}>
                {trend.change > 0 ? '+' : ''}{trend.change}% so với kỳ trước
              </span>
            )}
            trend={trend?.trend}
          />

          {/* Success Rate */}
          <StatCard
            icon={CheckCircle}
            iconColor="text-green-500"
            iconBg="bg-green-100"
            title="Tỷ Lệ Thành Công"
            value={`${calculateSuccessRate(stats?.successful || 0, stats?.total || 1)}%`}
            subtitle={`${stats?.successful || 0} thành công`}
          />

          {/* Average Time */}
          <StatCard
            icon={Clock}
            iconColor="text-blue-500"
            iconBg="bg-blue-100"
            title="Thời Gian Trung Bình"
            value={formatGenerationTime(stats?.avgGenerationTime || 0)}
            subtitle="Thời gian tạo ảnh"
          />

          {/* Failed */}
          <StatCard
            icon={XCircle}
            iconColor="text-red-500"
            iconBg="bg-red-100"
            title="Thất Bại"
            value={stats?.failed || 0}
            subtitle={`${((stats?.failed || 0) / (stats?.total || 1) * 100).toFixed(1)}% tổng số`}
          />
        </div>

        {/* Performance Metrics */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Fastest Provider */}
            <MetricCard
              icon={Zap}
              iconColor="text-yellow-500"
              iconBg="bg-yellow-100"
              title="Provider Nhanh Nhất"
              value={metrics.fastestProvider || 'N/A'}
              description="Thời gian xử lý nhanh nhất"
            />

            {/* Most Reliable */}
            <MetricCard
              icon={Award}
              iconColor="text-blue-500"
              iconBg="bg-blue-100"
              title="Provider Tin Cậy Nhất"
              value={metrics.mostReliableProvider || 'N/A'}
              description="Tỷ lệ thành công cao nhất"
            />

            {/* Total Generations */}
            <MetricCard
              icon={Target}
              iconColor="text-purple-500"
              iconBg="bg-purple-100"
              title="Tổng Số Lần Tạo"
              value={metrics.totalGenerations || 0}
              description="Tất cả các lần tạo ảnh"
            />
          </div>
        )}

        {/* Provider Stats */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Provider Performance */}
          <div className="bg-white rounded-2xl shadow-lg p-6 col-span-2">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-green-600" />
              Thống Kê Theo Provider
            </h2>
            
            {providerStats.length > 0 ? (
              <div className="space-y-4">
                {providerStats.slice(0, 5).map((provider, idx) => (
                  <ProviderStatRow
                    key={idx}
                    provider={provider}
                    calculateSuccessRate={calculateSuccessRate}
                    formatGenerationTime={formatGenerationTime}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Info className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>Chưa có dữ liệu provider</p>
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Zap className="w-6 h-6 text-yellow-600" />
              Thống Kê Nhanh
            </h2>
            
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-500">Provider Nhanh Nhất</p>
                <p className="font-semibold text-gray-900">
                  {metrics?.fastestProvider || 'N/A'}
                </p>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-500">Provider Tin Cậy Nhất</p>
                <p className="font-semibold text-gray-900">
                  {metrics?.mostReliableProvider || 'N/A'}
                </p>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-500">Tổng Providers</p>
                <p className="font-semibold text-gray-900">
                  {providerStats.length}
                </p>
              </div>

              <button
                onClick={syncModels}
                disabled={syncing}
                className="w-full mt-4 px-4 py-3 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-colors flex items-center justify-center gap-2 disabled:bg-gray-400"
              >
                <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Đang đồng bộ...' : 'Đồng Bộ Models'}
              </button>
            </div>
          </div>
        </div>

        {/* Usage Chart */}
        {usageData.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-blue-600" />
              Biểu Đồ Sử Dụng Theo Thời Gian
            </h2>
            
            <div className="h-48 flex items-end space-x-2">
              {usageData.slice(-14).map((day, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center">
                  <div 
                    className="w-full bg-gradient-to-t from-purple-500 to-blue-500 rounded-t transition-all hover:from-purple-600 hover:to-blue-600"
                    style={{ 
                      height: `${Math.min(100, (day.count / Math.max(...usageData.map(d => d.count), 1)) * 100)}%`,
                      minHeight: '4px'
                    }}
                    title={`${day.date || day.day}: ${day.count} generations`}
                  />
                  <span className="text-xs text-gray-500 mt-2">
                    {new Date(day.date || day.day).getDate()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status Distribution */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Success vs Failed */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">
              Phân Bố Trạng Thái
            </h2>
            
            <div className="space-y-4">
              <StatusBar
                label="Thành công"
                value={stats?.successful || 0}
                total={stats?.total || 0}
                color="bg-green-500"
              />
              
              <StatusBar
                label="Thất bại"
                value={stats?.failed || 0}
                total={stats?.total || 0}
                color="bg-red-500"
              />
              
              <StatusBar
                label="Đang xử lý"
                value={stats?.processing || 0}
                total={stats?.total || 0}
                color="bg-yellow-500"
              />
            </div>
          </div>
          
          {/* Provider Distribution */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">
              Phân Bố Provider
            </h2>
            
            <div className="space-y-4">
              {providerStats.map((provider, idx) => (
                <StatusBar
                  key={idx}
                  label={provider.name || provider._id}
                  value={provider.total || 0}
                  total={stats?.total || 0}
                  color="bg-purple-500"
                />
              ))}
            </div>
          </div>
        </div>

        {/* All Models */}
        {allModels.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Database className="w-6 h-6 text-blue-600" />
                Tất Cả Models ({filteredModels.length})
              </h2>

              <div className="flex flex-wrap gap-2">
                {['all', 'analysis', 'image-generation', 'video-generation'].map(type => (
                  <button
                    key={type}
                    onClick={() => setFilter(type)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      filter === type
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {type === 'all' ? 'Tất cả' : type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Model</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Provider</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Loại</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Trạng Thái</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tỷ Lệ Thành Công</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Thời Gian TB</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredModels.slice(0, 20).map((model, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{model.name}</p>
                          {model.pricing?.free && (
                            <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded mt-1">
                              MIỄN PHÍ
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{model.provider}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{model.type}</td>
                      <td className="px-4 py-3">
                        {model.status?.available ? (
                          <span className="flex items-center text-green-600 text-sm">
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Khả dụng
                          </span>
                        ) : (
                          <span className="flex items-center text-red-600 text-sm">
                            <XCircle className="w-4 h-4 mr-1" />
                            Không khả dụng
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {model.performance?.successRate?.toFixed(1) || '100'}%
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {model.performance?.avgResponseTime?.toFixed(2) || '0'}s
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ============================================
// STAT CARD COMPONENT
// ============================================

function StatCard({ icon: Icon, iconColor, iconBg, title, value, subtitle, trend }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 ${iconBg} rounded-xl`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
        {trend && (
          <div className="flex items-center gap-1">
            {trend === 'increasing' && <TrendingUp className="w-4 h-4 text-green-500" />}
            {trend === 'decreasing' && <TrendingUp className="w-4 h-4 text-red-500 rotate-180" />}
            {trend === 'stable' && <Activity className="w-4 h-4 text-gray-500" />}
          </div>
        )}
      </div>
      
      <h3 className="text-sm font-medium text-gray-600 mb-2">{title}</h3>
      <p className="text-3xl font-bold text-gray-800 mb-1">{value}</p>
      {subtitle && (
        <p className="text-sm text-gray-500">{subtitle}</p>
      )}
    </div>
  );
}

// ============================================
// METRIC CARD COMPONENT
// ============================================

function MetricCard({ icon: Icon, iconColor, iconBg, title, value, description }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
      <div className={`p-3 ${iconBg} rounded-xl inline-block mb-4`}>
        <Icon className={`w-6 h-6 ${iconColor}`} />
      </div>
      
      <h3 className="text-sm font-medium text-gray-600 mb-2">{title}</h3>
      <p className="text-2xl font-bold text-gray-800 mb-1">{value}</p>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  );
}

// ============================================
// PROVIDER STAT ROW COMPONENT
// ============================================

function ProviderStatRow({ provider, calculateSuccessRate, formatGenerationTime }) {
  const successRate = parseFloat(calculateSuccessRate(provider.successful, provider.total));
  
  return (
    <div className="border border-gray-200 rounded-xl p-4 hover:border-purple-300 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-800">{provider.name || provider._id}</h3>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          successRate >= 90 ? 'bg-green-100 text-green-700' :
          successRate >= 70 ? 'bg-yellow-100 text-yellow-700' :
          'bg-red-100 text-red-700'
        }`}>
          {successRate.toFixed(1)}% Thành công
        </span>
      </div>
      
      <div className="grid grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-gray-600 mb-1">Tổng</p>
          <p className="font-semibold text-gray-800">{provider.total || 0}</p>
        </div>
        
        <div>
          <p className="text-gray-600 mb-1">Thành công</p>
          <p className="font-semibold text-green-600">{provider.successful || 0}</p>
        </div>
        
        <div>
          <p className="text-gray-600 mb-1">Thất bại</p>
          <p className="font-semibold text-red-600">{provider.failed || 0}</p>
        </div>
        
        <div>
          <p className="text-gray-600 mb-1">Thời gian TB</p>
          <p className="font-semibold text-blue-600">{formatGenerationTime(provider.avgTime || 0)}</p>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
          style={{ width: `${successRate}%` }}
        />
      </div>
    </div>
  );
}

// ============================================
// STATUS BAR COMPONENT
// ============================================

function StatusBar({ label, value, total, color }) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm text-gray-600">
          {value} ({percentage.toFixed(1)}%)
        </span>
      </div>
      
      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
