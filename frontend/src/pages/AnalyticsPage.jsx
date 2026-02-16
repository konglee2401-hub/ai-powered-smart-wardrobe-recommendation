import React, { useState, useEffect } from 'react';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import { 
  getAIInsights, 
  getPredictions, 
  getPersonalizedRecommendations,
  getDashboard 
} from '../services/analyticsService';

const AnalyticsPage = () => {
  const [timeRange, setTimeRange] = useState('30d');
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboardData, setDashboardData] = useState(null);
  const [aiInsights, setAiInsights] = useState(null);
  const [predictions, setPredictions] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(false);

  const tabs = [
    { id: 'overview', label: '📊 Overview', icon: '📊' },
    { id: 'ai-insights', label: '🤖 AI Insights', icon: '🤖' },
    { id: 'predictions', label: '🔮 Predictions', icon: '🔮' },
    { id: 'recommendations', label: '💡 Recommendations', icon: '💡' },
  ];

  useEffect(() => {
    if (activeTab !== 'overview') {
      loadAnalyticsData();
    }
  }, [activeTab, timeRange]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'ai-insights':
          const insightsRes = await getAIInsights(timeRange);
          setAiInsights(insightsRes.data);
          break;
        case 'predictions':
          const predictionsRes = await getPredictions(timeRange);
          setPredictions(predictionsRes.data);
          break;
        case 'recommendations':
          const recommendationsRes = await getPersonalizedRecommendations();
          setRecommendations(recommendationsRes.data);
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTimeRangeChange = (range) => {
    setTimeRange(range);
  };

  const renderOverviewTab = () => (
    <AnalyticsDashboard 
      timeRange={timeRange}
      onTimeRangeChange={handleTimeRangeChange}
    />
  );

  const renderAIInsightsTab = () => {
    if (loading) {
      return (
        <div className="loading-container">
          <div className="loading-spinner">🤖</div>
          <p>Analyzing your data...</p>
        </div>
      );
    }

    if (!aiInsights) {
      return (
        <div className="empty-state">
          <p>Loading AI insights...</p>
        </div>
      );
    }

    return (
      <div className="ai-insights-container">
        {/* User Profile */}
        <div className="profile-section">
          <h3>👤 Your AI Profile</h3>
          <div className="profile-card">
            <div className="profile-type">
              {aiInsights.userProfile?.type || 'standard'}
            </div>
            <p>{aiInsights.userProfile?.description || 'Analyzing your usage patterns...'}</p>
          </div>
        </div>

        {/* Key Insights */}
        <div className="insights-section">
          <h3>💡 AI Insights</h3>
          <div className="insights-grid">
            {(aiInsights.insights || []).map((insight, index) => (
              <div key={index} className={`insight-card ${insight.priority}`}>
                <div className="insight-header">
                  <span className="insight-type">{insight.type}</span>
                  <span className="insight-priority">{insight.priority}</span>
                </div>
                <h4>{insight.title}</h4>
                <p>{insight.description}</p>
                <div className="insight-impact">{insight.impact}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div className="recommendations-preview">
          <h3>🎯 Top Recommendations</h3>
          <div className="recommendations-list">
            {(aiInsights.recommendations || []).slice(0, 3).map((rec, index) => (
              <div key={index} className="recommendation-item">
                <div className="rec-icon">💡</div>
                <div className="rec-content">
                  <h5>{rec.title}</h5>
                  <p>{rec.description}</p>
                  <span className="rec-impact">{rec.potentialSavings}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderPredictionsTab = () => {
    if (loading) {
      return (
        <div className="loading-container">
          <div className="loading-spinner">🔮</div>
          <p>Generating predictions...</p>
        </div>
      );
    }

    if (!predictions) {
      return (
        <div className="empty-state">
          <p>Loading predictions...</p>
        </div>
      );
    }

    return (
      <div className="predictions-container">
        <div className="predictions-header">
          <h3>🔮 Usage Predictions</h3>
          <p>AI-powered forecasts for your future usage</p>
        </div>

        {/* Usage Prediction */}
        <div className="prediction-card highlight">
          <div className="prediction-icon">📈</div>
          <div className="prediction-content">
            <h4>Next Month Usage</h4>
            <div className="prediction-value">
              {Math.round(predictions.nextMonthUsage || 0)} generations
            </div>
            <div className="prediction-trend">
              Trend: {predictions.usageTrend || 'stable'}
            </div>
          </div>
        </div>

        {/* Cost Projection */}
        <div className="prediction-card">
          <div className="prediction-icon">💰</div>
          <div className="prediction-content">
            <h4>Cost Projection</h4>
            <div className="prediction-value">
              ${Math.round(predictions.costProjection || 0)}
            </div>
            <div className="prediction-period">Next 30 days</div>
          </div>
        </div>

        {/* Recommendations */}
        {(predictions.recommendations || []).length > 0 && (
          <div className="predictions-recommendations">
            <h4>Based on predictions:</h4>
            {predictions.recommendations.map((rec, index) => (
              <div key={index} className="prediction-rec">
                <span>{rec.icon}</span>
                <p>{rec.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderRecommendationsTab = () => {
    if (loading) {
      return (
        <div className="loading-container">
          <div className="loading-spinner">💡</div>
          <p>Loading personalized recommendations...</p>
        </div>
      );
    }

    if (!recommendations) {
      return (
        <div className="empty-state">
          <p>Loading recommendations...</p>
        </div>
      );
    }

    return (
      <div className="recommendations-container">
        <div className="rec-header">
          <h3>🎯 Personalized Recommendations</h3>
          <p>AI-powered suggestions to optimize your workflow</p>
        </div>

        {/* Provider Recommendations */}
        {recommendations.providers?.length > 0 && (
          <div className="rec-section">
            <h4>🚀 Recommended Providers</h4>
            <div className="providers-grid">
              {recommendations.providers.map((provider, index) => (
                <div key={index} className="provider-card">
                  <h5>{provider.name}</h5>
                  <p>{provider.reason}</p>
                  <div className="provider-meta">
                    <span>⚡ {provider.estimatedSpeed}</span>
                    <span className="cost">{provider.cost}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Workflow Recommendations */}
        {recommendations.workflows?.length > 0 && (
          <div className="rec-section">
            <h4>⚙️ Workflow Optimizations</h4>
            <div className="workflows-grid">
              {recommendations.workflows.map((workflow, index) => (
                <div key={index} className="workflow-card">
                  <h5>{workflow.name}</h5>
                  <p>{workflow.description}</p>
                  <div className="workflow-benefits">
                    {workflow.benefits?.map((benefit, i) => (
                      <span key={i} className="benefit-tag">{benefit}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Next Steps */}
        {recommendations.nextSteps?.length > 0 && (
          <div className="rec-section">
            <h4>🎯 Next Steps</h4>
            <div className="next-steps-list">
              {recommendations.nextSteps.map((step, index) => (
                <div key={index} className={`next-step ${step.priority}`}>
                  <div className="step-icon">
                    {step.type === 'action' ? '▶️' : '🔍'}
                  </div>
                  <div className="step-content">
                    <h5>{step.title}</h5>
                    <p>{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>📊 Analytics & AI Insights</h1>
        <div className="time-range-selector">
          <select 
            value={timeRange} 
            onChange={(e) => handleTimeRangeChange(e.target.value)}
            className="range-select"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
        </div>
      </div>

      <div className="tabs-navigation">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="page-content">
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'ai-insights' && renderAIInsightsTab()}
        {activeTab === 'predictions' && renderPredictionsTab()}
        {activeTab === 'recommendations' && renderRecommendationsTab()}
      </div>

      <style>{`
        .page-container {
          max-width: 1600px;
          margin: 0 auto;
          padding: 2rem;
        }
        
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }
        
        .page-header h1 {
          margin: 0;
          color: #1a1a2e;
        }
        
        .range-select {
          padding: 0.5rem 1rem;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: white;
          font-size: 0.9rem;
        }
        
        .tabs-navigation {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          background: white;
          padding: 0.5rem;
          border-radius: 12px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.05);
        }
        
        .tab-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          border: none;
          background: transparent;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.9rem;
          color: #64748b;
        }
        
        .tab-button:hover {
          background: #f1f5f9;
        }
        
        .tab-button.active {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
        }
        
        .page-content {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
          padding: 2rem;
          min-height: 600px;
        }
        
        /* AI Insights Styles */
        .ai-insights-container {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }
        
        .profile-section h3, .insights-section h3, .recommendations-preview h3 {
          margin: 0 0 1rem 0;
          color: #1a1a2e;
        }
        
        .profile-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 1.5rem;
          border-radius: 12px;
        }
        
        .profile-type {
          font-size: 1.5rem;
          font-weight: bold;
          text-transform: capitalize;
        }
        
        .insights-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1rem;
        }
        
        .insight-card {
          padding: 1.5rem;
          border-radius: 12px;
          background: #f8fafc;
          border-left: 4px solid #667eea;
        }
        
        .insight-card.high {
          border-left-color: #ef4444;
        }
        
        .insight-card.medium {
          border-left-color: #f59e0b;
        }
        
        .insight-card.low {
          border-left-color: #22c55e;
        }
        
        .insight-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }
        
        .insight-type {
          text-transform: capitalize;
          font-size: 0.8rem;
          color: #64748b;
        }
        
        .insight-priority {
          font-size: 0.7rem;
          padding: 0.2rem 0.5rem;
          border-radius: 12px;
          background: #e2e8f0;
          text-transform: uppercase;
        }
        
        .insight-card h4 {
          margin: 0 0 0.5rem 0;
          color: #1a1a2e;
        }
        
        .insight-card p {
          margin: 0;
          color: #64748b;
          font-size: 0.9rem;
        }
        
        .insight-impact {
          margin-top: 1rem;
          padding-top: 0.5rem;
          border-top: 1px solid #e2e8f0;
          color: #22c55e;
          font-weight: 600;
          font-size: 0.85rem;
        }
        
        .recommendations-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        
        .recommendation-item {
          display: flex;
          gap: 1rem;
          padding: 1rem;
          background: #f8fafc;
          border-radius: 8px;
        }
        
        .rec-icon {
          font-size: 1.5rem;
        }
        
        .rec-content h5 {
          margin: 0 0 0.25rem 0;
          color: #1a1a2e;
        }
        
        .rec-content p {
          margin: 0;
          color: #64748b;
          font-size: 0.9rem;
        }
        
        .rec-impact {
          color: #22c55e;
          font-weight: 600;
          font-size: 0.85rem;
        }
        
        /* Predictions Styles */
        .predictions-container {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }
        
        .predictions-header {
          text-align: center;
        }
        
        .predictions-header h3 {
          margin: 0;
          color: #1a1a2e;
        }
        
        .predictions-header p {
          color: #64748b;
        }
        
        .prediction-card {
          display: flex;
          gap: 1.5rem;
          padding: 2rem;
          background: #f8fafc;
          border-radius: 12px;
        }
        
        .prediction-card.highlight {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        
        .prediction-icon {
          font-size: 3rem;
        }
        
        .prediction-content h4 {
          margin: 0 0 0.5rem 0;
        }
        
        .prediction-value {
          font-size: 2.5rem;
          font-weight: bold;
        }
        
        .prediction-trend, .prediction-period {
          opacity: 0.8;
          font-size: 0.9rem;
        }
        
        .predictions-recommendations {
          padding: 1.5rem;
          background: #f0fdf4;
          border-radius: 12px;
        }
        
        .predictions-recommendations h4 {
          margin: 0 0 1rem 0;
          color: #166534;
        }
        
        .prediction-rec {
          display: flex;
          gap: 0.5rem;
          align-items: center;
          padding: 0.5rem 0;
        }
        
        /* Recommendations Styles */
        .recommendations-container {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }
        
        .rec-header {
          text-align: center;
        }
        
        .rec-header h3 {
          margin: 0;
          color: #1a1a2e;
        }
        
        .rec-header p {
          color: #64748b;
        }
        
        .rec-section {
          margin-bottom: 1.5rem;
        }
        
        .rec-section h4 {
          margin: 0 0 1rem 0;
          color: #1a1a2e;
        }
        
        .providers-grid, .workflows-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1rem;
        }
        
        .provider-card, .workflow-card {
          padding: 1.5rem;
          background: #f8fafc;
          border-radius: 12px;
        }
        
        .provider-card h5, .workflow-card h5 {
          margin: 0 0 0.5rem 0;
          color: #1a1a2e;
        }
        
        .provider-card p, .workflow-card p {
          margin: 0 0 1rem 0;
          color: #64748b;
          font-size: 0.9rem;
        }
        
        .provider-meta {
          display: flex;
          justify-content: space-between;
          font-size: 0.85rem;
          color: #64748b;
        }
        
        .provider-meta .cost {
          color: #22c55e;
          font-weight: 600;
        }
        
        .workflow-benefits {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        
        .benefit-tag {
          background: #e0f2fe;
          color: #0369a1;
          padding: 0.25rem 0.5rem;
          border-radius: 12px;
          font-size: 0.75rem;
        }
        
        .next-steps-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        
        .next-step {
          display: flex;
          gap: 1rem;
          padding: 1rem;
          background: #f8fafc;
          border-radius: 8px;
          border-left: 4px solid #667eea;
        }
        
        .next-step.high {
          border-left-color: #ef4444;
        }
        
        .next-step.medium {
          border-left-color: #f59e0b;
        }
        
        .step-icon {
          font-size: 1.5rem;
        }
        
        .step-content h5 {
          margin: 0 0 0.25rem 0;
          color: #1a1a2e;
        }
        
        .step-content p {
          margin: 0;
          color: #64748b;
          font-size: 0.9rem;
        }
        
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          gap: 1rem;
        }
        
        .loading-spinner {
          font-size: 3rem;
          animation: pulse 1.5s ease-in-out infinite;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.1); }
        }
        
        .empty-state {
          text-align: center;
          padding: 3rem;
          color: #64748b;
        }
      `}</style>
    </div>
  );
};

export default AnalyticsPage;
