import React, { useState, useEffect } from 'react';
import './PerformanceOptimizer.css';

const PerformanceOptimizer = ({ 
  currentSettings, 
  onSettingsChange,
  performanceMetrics 
}) => {
  const [activeTab, setActiveTab] = useState('speed');
  const [optimizationSuggestions, setOptimizationSuggestions] = useState([]);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const tabs = [
    { id: 'speed', label: '⚡ Speed', icon: '⚡' },
    { id: 'quality', label: '⭐ Quality', icon: '⭐' },
    { id: 'cost', label: '💰 Cost', icon: '💰' },
    { id: 'balance', label: '⚖️ Balance', icon: '⚖️' }
  ];

  useEffect(() => {
    generateSuggestions();
  }, [currentSettings, performanceMetrics]);

  const generateSuggestions = () => {
    const suggestions = [];

    // Speed optimizations
    if (performanceMetrics?.avgGenerationTime > 10) {
      suggestions.push({
        id: 'speed-1',
        category: 'speed',
        title: 'Switch to Faster Providers',
        description: 'Use OpenRouter or NVIDIA models for 2-3x faster generation',
        impact: 'high',
        savings: `${Math.round((performanceMetrics.avgGenerationTime - 8) * 100 / performanceMetrics.avgGenerationTime)}% faster`,
        action: () => optimizeForSpeed()
      });
    }

    if (currentSettings?.imageCount > 2) {
      suggestions.push({
        id: 'speed-2',
        category: 'speed',
        title: 'Reduce Batch Size',
        description: 'Generate 2 images at a time instead of 4+ for better speed',
        impact: 'medium',
        savings: '30-50% faster per batch',
        action: () => onSettingsChange({ ...currentSettings, imageCount: 2 })
      });
    }

    // Quality optimizations
    if (performanceMetrics?.avgQuality < 7) {
      suggestions.push({
        id: 'quality-1',
        category: 'quality',
        title: 'Use Premium Models',
        description: 'Switch to SDXL or Flux Pro for higher quality output',
        impact: 'high',
        savings: '+1.5 quality points',
        action: () => optimizeForQuality()
      });
    }

    // Cost optimizations
    if (performanceMetrics?.costPerImage > 0.05) {
      suggestions.push({
        id: 'cost-1',
        category: 'cost',
        title: 'Use Free/Cheap Providers',
        description: 'Leverage OpenRouter free tier for 80% cost reduction',
        impact: 'high',
        savings: `$${(performanceMetrics.costPerImage - 0.01).toFixed(3)} per image`,
        action: () => optimizeForCost()
      });
    }

    if (currentSettings?.imageCount > 1) {
      suggestions.push({
        id: 'cost-2',
        category: 'cost',
        title: 'Generate One at a Time',
        description: 'Single image generation is often cheaper per unit',
        impact: 'medium',
        savings: '20-30% cost savings',
        action: () => onSettingsChange({ ...currentSettings, imageCount: 1 })
      });
    }

    // Balance optimizations
    suggestions.push({
      id: 'balance-1',
      category: 'balance',
      title: 'Smart Fallback System',
      description: 'Use fast providers first, fall back to quality providers',
      impact: 'high',
      savings: 'Best of both worlds',
      action: () => optimizeForBalance()
    });

    setOptimizationSuggestions(suggestions);
  };

  const optimizeForSpeed = () => {
    onSettingsChange({
      ...currentSettings,
      providers: ['openrouter-flux-schnell-free', 'nvidia-flux-schnell'],
      imageCount: Math.min(currentSettings.imageCount, 2),
      modelSettings: { steps: 20, cfg_scale: 7 }
    });
  };

  const optimizeForQuality = () => {
    onSettingsChange({
      ...currentSettings,
      providers: ['nvidia-sd-3', 'fal-flux-pro', 'replicate-flux-pro'],
      modelSettings: { steps: 50, cfg_scale: 12 }
    });
  };

  const optimizeForCost = () => {
    onSettingsChange({
      ...currentSettings,
      providers: ['openrouter-flux-schnell-free', 'openrouter-sd-xl-free'],
      imageCount: 1,
      modelSettings: { steps: 25, cfg_scale: 8 }
    });
  };

  const optimizeForBalance = () => {
    onSettingsChange({
      ...currentSettings,
      providers: ['openrouter-flux-schnell-free', 'nvidia-flux-schnell', 'fal-flux-pro'],
      imageCount: 2,
      modelSettings: { steps: 30, cfg_scale: 10 }
    });
  };

  const applyOptimization = async (suggestion) => {
    setIsOptimizing(true);
    try {
      await suggestion.action();
      setTimeout(() => setIsOptimizing(false), 1000);
    } catch (error) {
      console.error('Optimization failed:', error);
      setIsOptimizing(false);
    }
  };

  const getCurrentOptimization = () => {
    const suggestions = optimizationSuggestions.filter(s => s.category === activeTab);
    return suggestions.slice(0, 3);
  };

  const renderMetricsCard = (title, value, target, unit = '', trend = null) => (
    <div className="metrics-card">
      <div className="metric-header">
        <h4>{title}</h4>
        {trend && (
          <span className={`trend ${trend > 0 ? 'positive' : 'negative'}`}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="metric-value">
        {value}{unit}
      </div>
      <div className="metric-target">
        Target: {target}{unit}
      </div>
      <div className="metric-bar">
        <div 
          className="metric-fill"
          style={{ width: `${Math.min((value / target) * 100, 100)}%` }}
        ></div>
      </div>
    </div>
  );

  return (
    <div className="performance-optimizer">
      <div className="optimizer-header">
        <h2>🚀 Performance Optimizer</h2>
        <p>AI-powered suggestions to optimize your generation workflow</p>
      </div>

      {/* Current Performance Metrics */}
      <div className="performance-metrics">
        <h3>📊 Current Performance</h3>
        <div className="metrics-grid">
          {renderMetricsCard(
            'Generation Speed',
            performanceMetrics?.avgGenerationTime?.toFixed(1) || 0,
            8,
            's',
            -15
          )}
          {renderMetricsCard(
            'Quality Score',
            performanceMetrics?.avgQuality?.toFixed(1) || 0,
            8.5,
            '/10',
            10
          )}
          {renderMetricsCard(
            'Cost per Image',
            performanceMetrics?.costPerImage?.toFixed(3) || 0,
            0.03,
            '$',
            -25
          )}
          {renderMetricsCard(
            'Success Rate',
            performanceMetrics?.successRate?.toFixed(1) || 0,
            95,
            '%',
            5
          )}
        </div>
      </div>

      {/* Optimization Tabs */}
      <div className="optimizer-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Optimization Suggestions */}
      <div className="optimization-section">
        <h3>💡 Optimization Suggestions</h3>
        <div className="suggestions-list">
          {getCurrentOptimization().map(suggestion => (
            <div key={suggestion.id} className="suggestion-card">
              <div className="suggestion-header">
                <div className="suggestion-info">
                  <h4>{suggestion.title}</h4>
                  <p>{suggestion.description}</p>
                </div>
                <div className="suggestion-meta">
                  <span className={`impact ${suggestion.impact}`}>
                    {suggestion.impact} impact
                  </span>
                  <span className="savings">
                    Save: {suggestion.savings}
                  </span>
                </div>
              </div>
              <div className="suggestion-actions">
                <button 
                  className="apply-btn"
                  onClick={() => applyOptimization(suggestion)}
                  disabled={isOptimizing}
                >
                  {isOptimizing ? '⏳ Applying...' : '✅ Apply'}
                </button>
                <button className="preview-btn">
                  👁️ Preview
                </button>
              </div>
            </div>
          ))}
        </div>

        {getCurrentOptimization().length === 0 && (
          <div className="no-suggestions">
            <div className="no-suggestions-icon">✅</div>
            <h4>You're already optimized!</h4>
            <p>Your current settings are performing well for {activeTab} optimization.</p>
          </div>
        )}
      </div>

      {/* Advanced Settings */}
      <div className="advanced-settings">
        <details>
          <summary>⚙️ Advanced Performance Settings</summary>
          
          <div className="settings-grid">
            <div className="setting-group">
              <label>Model Steps</label>
              <div className="slider-control">
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={currentSettings?.modelSettings?.steps || 30}
                  onChange={(e) => onSettingsChange({
                    ...currentSettings,
                    modelSettings: {
                      ...currentSettings.modelSettings,
                      steps: parseInt(e.target.value)
                    }
                  })}
                />
                <span>{currentSettings?.modelSettings?.steps || 30}</span>
              </div>
              <small>Higher steps = better quality, slower generation</small>
            </div>

            <div className="setting-group">
              <label>CFG Scale</label>
              <div className="slider-control">
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="0.5"
                  value={currentSettings?.modelSettings?.cfg_scale || 10}
                  onChange={(e) => onSettingsChange({
                    ...currentSettings,
                    modelSettings: {
                      ...currentSettings.modelSettings,
                      cfg_scale: parseFloat(e.target.value)
                    }
                  })}
                />
                <span>{currentSettings?.modelSettings?.cfg_scale || 10}</span>
              </div>
              <small>Controls how closely AI follows your prompt</small>
            </div>

            <div className="setting-group">
              <label>Resolution</label>
              <select
                value={currentSettings?.resolution || '1024x1024'}
                onChange={(e) => onSettingsChange({
                  ...currentSettings,
                  resolution: e.target.value
                })}
              >
                <option value="512x512">512x512 (Fast)</option>
                <option value="768x768">768x768 (Balanced)</option>
                <option value="1024x1024">1024x1024 (HD)</option>
                <option value="1536x1536">1536x1536 (Ultra HD)</option>
              </select>
            </div>

            <div className="setting-group">
              <label>Batch Processing</label>
              <label className="toggle-control">
                <input
                  type="checkbox"
                  checked={currentSettings?.enableBatch || false}
                  onChange={(e) => onSettingsChange({
                    ...currentSettings,
                    enableBatch: e.target.checked
                  })}
                />
                <span className="toggle-slider"></span>
              </label>
              <small>Process multiple images simultaneously</small>
            </div>
          </div>
        </details>
      </div>

      {/* Performance Tips */}
      <div className="performance-tips">
        <h3>💡 Performance Tips</h3>
        <div className="tips-grid">
          <div className="tip-card">
            <div className="tip-icon">⚡</div>
            <div className="tip-content">
              <h5>Use OpenRouter First</h5>
              <p>Always try free providers first - they're fast and often good enough for most use cases.</p>
            </div>
          </div>

          <div className="tip-card">
            <div className="tip-icon">🎯</div>
            <div className="tip-content">
              <h5>Optimize Prompts</h5>
              <p>Clear, specific prompts generate faster and better results than vague descriptions.</p>
            </div>
          </div>

          <div className="tip-card">
            <div className="tip-icon">📦</div>
            <div className="tip-content">
              <h5>Batch Wisely</h5>
              <p>Generate 2-3 images per batch for optimal speed. More than that increases failure rates.</p>
            </div>
          </div>

          <div className="tip-card">
            <div className="tip-icon">💾</div>
            <div className="tip-content">
              <h5>Cache Results</h5>
              <p>Save successful generations as references for future similar requests.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceOptimizer;
