import React, { useState, useEffect, useCallback } from 'react';
import './AnalyticsDashboard.css';

const AnalyticsDashboard = ({ 
  timeRange = 'week',
  onTimeRangeChange 
}) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState('generations');

  // Mock data generator
  const generateMockStats = useCallback(() => {
    const days = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 90;
    
    const dailyData = Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - i - 1));
      return {
        date: date.toISOString().split('T')[0],
        generations: Math.floor(Math.random() * 50) + 10,
        imagesGenerated: Math.floor(Math.random() * 200) + 50,
        videosGenerated: Math.floor(Math.random() * 10) + 1,
        avgProcessingTime: Math.floor(Math.random() * 30) + 10,
        successRate: Math.floor(Math.random() * 10) + 90,
        apiCalls: Math.floor(Math.random() * 500) + 100,
        costs: Math.floor(Math.random() * 50) + 10
      };
    });

    const providerUsage = [
      { name: 'OpenRouter', count: Math.floor(Math.random() * 200) + 100, color: '#3498db' },
      { name: 'NVIDIA', count: Math.floor(Math.random() * 150) + 50, color: '#27ae60' },
      { name: 'Replicate', count: Math.floor(Math.random() * 100) + 30, color: '#9b59b6' },
      { name: 'Fal.ai', count: Math.floor(Math.random() * 80) + 20, color: '#e74c3c' }
    ];

    const categoryDistribution = [
      { name: 'Characters', value: Math.floor(Math.random() * 40) + 30, color: '#3498db' },
      { name: 'Products', value: Math.floor(Math.random() * 30) + 20, color: '#27ae60' },
      { name: 'Fashion', value: Math.floor(Math.random() * 20) + 15, color: '#9b59b6' },
      { name: 'Editorial', value: Math.floor(Math.random() * 15) + 10, color: '#e74c3c' }
    ];

    const topTemplates = [
      { name: 'E-commerce Standard', usage: Math.floor(Math.random() * 100) + 50, avgTime: 12 },
      { name: 'Social Media Pack', usage: Math.floor(Math.random() * 80) + 40, avgTime: 15 },
      { name: 'Fashion Editorial', usage: Math.floor(Math.random() * 60) + 30, avgTime: 18 },
      { name: 'Product Showcase', usage: Math.floor(Math.random() * 50) + 25, avgTime: 10 },
      { name: 'Character Design', usage: Math.floor(Math.random() * 40) + 20, avgTime: 22 }
    ];

    return {
      overview: {
        totalGenerations: dailyData.reduce((sum, d) => sum + d.generations, 0),
        totalImages: dailyData.reduce((sum, d) => sum + d.imagesGenerated, 0),
        totalVideos: dailyData.reduce((sum, d) => sum + d.videosGenerated, 0),
        avgSuccessRate: Math.floor(dailyData.reduce((sum, d) => sum + d.successRate, 0) / days),
        avgProcessingTime: Math.floor(dailyData.reduce((sum, d) => sum + d.avgProcessingTime, 0) / days),
        totalCost: dailyData.reduce((sum, d) => sum + d.costs, 0)
      },
      dailyData,
      providerUsage,
      categoryDistribution,
      topTemplates,
      trends: {
        generations: Math.floor(Math.random() * 30) + 10,
        images: Math.floor(Math.random() * 40) + 20,
        videos: Math.floor(Math.random() * 20) + 5,
        cost: Math.floor(Math.random() * 15) + 5
      }
    };
  }, [timeRange]);

  useEffect(() => {
    loadStats();
  }, [timeRange]);

  const loadStats = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      const mockStats = generateMockStats();
      setStats(mockStats);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };

  const getMaxValue = (data) => Math.max(...data.map(d => d.value || d.count || d.generations || d.imagesGenerated));

  if (loading) {
    return (
      <div className="analytics-loading">
        <div className="loading-spinner"></div>
        <p>Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="analytics-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-info">
          <h2>📊 Analytics Dashboard</h2>
          <p>Track your image generation performance and insights</p>
        </div>

        <div className="time-range-selector">
          <button 
            className={timeRange === 'week' ? 'active' : ''}
            onClick={() => onTimeRangeChange?.('week')}
          >
            7 Days
          </button>
          <button 
            className={timeRange === 'month' ? 'active' : ''}
            onClick={() => onTimeRangeChange?.('month')}
          >
            30 Days
          </button>
          <button 
            className={timeRange === 'quarter' ? 'active' : ''}
            onClick={() => onTimeRangeChange?.('quarter')}
          >
            90 Days
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="overview-cards">
        <div className="overview-card">
          <div className="card-icon generations">🖼️</div>
          <div className="card-content">
            <div className="card-value">{formatNumber(stats.overview.totalGenerations)}</div>
            <div className="card-label">Total Generations</div>
            <div className={`card-trend ${stats.trends.generations >= 0 ? 'positive' : 'negative'}`}>
              {stats.trends.generations >= 0 ? '↑' : '↓'} {Math.abs(stats.trends.generations)}%
            </div>
          </div>
        </div>

        <div className="overview-card">
          <div className="card-icon images">📷</div>
          <div className="card-content">
            <div className="card-value">{formatNumber(stats.overview.totalImages)}</div>
            <div className="card-label">Images Generated</div>
            <div className={`card-trend ${stats.trends.images >= 0 ? 'positive' : 'negative'}`}>
              {stats.trends.images >= 0 ? '↑' : '↓'} {Math.abs(stats.trends.images)}%
            </div>
          </div>
        </div>

        <div className="overview-card">
          <div className="card-icon videos">🎬</div>
          <div className="card-content">
            <div className="card-value">{formatNumber(stats.overview.totalVideos)}</div>
            <div className="card-label">Videos Generated</div>
            <div className={`card-trend ${stats.trends.videos >= 0 ? 'positive' : 'negative'}`}>
              {stats.trends.videos >= 0 ? '↑' : '↓'} {Math.abs(stats.trends.videos)}%
            </div>
          </div>
        </div>

        <div className="overview-card">
          <div className="card-icon success">✅</div>
          <div className="card-content">
            <div className="card-value">{stats.overview.avgSuccessRate}%</div>
            <div className="card-label">Success Rate</div>
            <div className="card-trend positive">Excellent</div>
          </div>
        </div>

        <div className="overview-card">
          <div className="card-icon time">⏱️</div>
          <div className="card-content">
            <div className="card-value">{stats.overview.avgProcessingTime}s</div>
            <div className="card-label">Avg. Processing Time</div>
            <div className="card-trend">Per generation</div>
          </div>
        </div>

        <div className="overview-card">
          <div className="card-icon cost">💰</div>
          <div className="card-content">
            <div className="card-value">${stats.overview.totalCost}</div>
            <div className="card-label">Total Cost</div>
            <div className={`card-trend ${stats.trends.cost >= 0 ? 'negative' : 'positive'}`}>
              {stats.trends.cost >= 0 ? '↑' : '↓'} {Math.abs(stats.trends.cost)}%
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-section">
        {/* Main Chart */}
        <div className="chart-card main-chart">
          <h3>📈 Generation Trends</h3>
          <div className="chart-tabs">
            <button 
              className={selectedMetric === 'generations' ? 'active' : ''}
              onClick={() => setSelectedMetric('generations')}
            >
              Generations
            </button>
            <button 
              className={selectedMetric === 'images' ? 'active' : ''}
              onClick={() => setSelectedMetric('images')}
            >
              Images
            </button>
            <button 
              className={selectedMetric === 'cost' ? 'active' : ''}
              onClick={() => setSelectedMetric('cost')}
            >
              Cost
            </button>
          </div>
          
          <div className="bar-chart">
            {stats.dailyData.slice(-14).map((day, index) => {
              const value = selectedMetric === 'generations' ? day.generations : 
                           selectedMetric === 'images' ? day.imagesGenerated : day.costs;
              const maxVal = getMaxValue(stats.dailyData.slice(-14).map(d => 
                selectedMetric === 'generations' ? d.generations : 
                selectedMetric === 'images' ? d.imagesGenerated : d.costs
              ));
              const height = (value / maxVal) * 100;
              
              return (
                <div key={index} className="bar-container">
                  <div 
                    className="bar"
                    style={{ height: `${height}%` }}
                    title={`${day.date}: ${value}`}
                  >
                    <span className="bar-value">{value}</span>
                  </div>
                  <span className="bar-label">{new Date(day.date).getDate()}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Provider Usage */}
        <div className="chart-card">
          <h3>🔌 Provider Distribution</h3>
          <div className="donut-chart">
            {stats.providerUsage.map((provider, index) => {
              const total = stats.providerUsage.reduce((sum, p) => sum + p.count, 0);
              const percentage = Math.round((provider.count / total) * 100);
              
              return (
                <div key={index} className="provider-item">
                  <div className="provider-info">
                    <div className="provider-color" style={{ background: provider.color }}></div>
                    <span className="provider-name">{provider.name}</span>
                    <span className="provider-count">{provider.count}</span>
                  </div>
                  <div className="provider-bar">
                    <div 
                      className="provider-fill"
                      style={{ 
                        width: `${percentage}%`,
                        background: provider.color
                      }}
                    ></div>
                  </div>
                  <span className="provider-percentage">{percentage}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Distribution */}
        <div className="chart-card">
          <h3>📂 Category Distribution</h3>
          <div className="category-chart">
            {stats.categoryDistribution.map((category, index) => (
              <div key={index} className="category-item">
                <div className="category-header">
                  <div className="category-color" style={{ background: category.color }}></div>
                  <span className="category-name">{category.name}</span>
                  <span className="category-value">{category.value}%</span>
                </div>
                <div className="category-bar">
                  <div 
                    className="category-fill"
                    style={{ 
                      width: `${category.value}%`,
                      background: category.color
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Templates */}
        <div className="chart-card">
          <h3>📋 Top Templates</h3>
          <div className="templates-list">
            {stats.topTemplates.map((template, index) => (
              <div key={index} className="template-item">
                <div className="template-rank">{index + 1}</div>
                <div className="template-info">
                  <div className="template-name">{template.name}</div>
                  <div className="template-stats">
                    <span>Usage: {template.usage}</span>
                    <span>Avg: {template.avgTime}s</span>
                  </div>
                </div>
                <div className="template-bar">
                  <div 
                    className="template-fill"
                    style={{ width: `${(template.usage / stats.topTemplates[0].usage) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="performance-section">
        <div className="chart-card full-width">
          <h3>⚡ Performance Metrics</h3>
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-label">API Response Time</span>
                <span className="metric-value good">Good</span>
              </div>
              <div className="metric-value-large">245ms</div>
              <div className="metric-chart">
                {[40, 55, 45, 60, 35, 50, 45, 55, 40, 50, 45, 55].map((val, i) => (
                  <div 
                    key={i} 
                    className="metric-bar"
                    style={{ height: `${val}%` }}
                  ></div>
                ))}
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-label">Error Rate</span>
                <span className="metric-value excellent">Excellent</span>
              </div>
              <div className="metric-value-large">0.8%</div>
              <div className="metric-chart">
                {[10, 15, 8, 12, 5, 8, 10, 6, 8, 5, 7, 6].map((val, i) => (
                  <div 
                    key={i} 
                    className="metric-bar"
                    style={{ height: `${val * 2}%` }}
                  ></div>
                ))}
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-label">Cache Hit Rate</span>
                <span className="metric-value good">Good</span>
              </div>
              <div className="metric-value-large">72%</div>
              <div className="metric-chart">
                {[60, 70, 65, 75, 70, 80, 75, 70, 65, 75, 70, 72].map((val, i) => (
                  <div 
                    key={i} 
                    className="metric-bar"
                    style={{ height: `${val}%` }}
                  ></div>
                ))}
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-label">Concurrent Requests</span>
                <span className="metric-value normal">Normal</span>
              </div>
              <div className="metric-value-large">12</div>
              <div className="metric-chart">
                {[30, 45, 50, 40, 55, 45, 50, 40, 35, 45, 40, 35].map((val, i) => (
                  <div 
                    key={i} 
                    className="metric-bar"
                    style={{ height: `${val}%` }}
                  ></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
