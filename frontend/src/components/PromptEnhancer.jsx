/**
 * PromptEnhancer Component
 * React UI for prompt enhancement functionality
 * 
 * Features:
 * - Prompt input with enhancement options
 * - Quality analysis display
 * - Variations generation
 * - Safety check
 * - Image/Video optimization
 * - History tracking
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  enhancePrompt,
  analyzePromptQuality,
  generatePromptVariations,
  checkPromptSafety,
  optimizePrompt,
  fullEnhancement,
  getQualityLevel,
  getQualityColor,
  formatProcessingTime,
} from '../services/promptEnhancementService';

// ============================================================================
// STYLES (inline for simplicity)
// ============================================================================

const styles = {
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  header: {
    textAlign: 'center',
    marginBottom: '24px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '8px',
  },
  subtitle: {
    color: '#6b7280',
    fontSize: '14px',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  label: {
    display: 'block',
    fontWeight: '600',
    marginBottom: '8px',
    color: '#374151',
  },
  textarea: {
    width: '100%',
    minHeight: '120px',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical',
  },
  select: {
    width: '100%',
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
    backgroundColor: 'white',
  },
  button: {
    padding: '12px 24px',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '14px',
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.2s',
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
  },
  secondaryButton: {
    backgroundColor: '#e5e7eb',
    color: '#374151',
  },
  successButton: {
    backgroundColor: '#10b981',
    color: 'white',
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    marginTop: '16px',
  },
  result: {
    marginTop: '16px',
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  resultHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  badge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '9999px',
    fontSize: '12px',
    fontWeight: '600',
  },
  score: {
    fontSize: '24px',
    fontWeight: 'bold',
  },
  metrics: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '12px',
    marginTop: '12px',
  },
  metric: {
    textAlign: 'center',
    padding: '12px',
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  metricLabel: {
    fontSize: '12px',
    color: '#6b7280',
    marginBottom: '4px',
  },
  metricValue: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1f2937',
  },
  variation: {
    padding: '16px',
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    marginBottom: '12px',
  },
  variationHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  safetyIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px',
    borderRadius: '8px',
    marginTop: '12px',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#6b7280',
  },
  error: {
    padding: '16px',
    backgroundColor: '#fee2e2',
    borderRadius: '8px',
    color: '#dc2626',
    marginTop: '12px',
  },
  tabs: {
    display: 'flex',
    borderBottom: '2px solid #e5e7eb',
    marginBottom: '16px',
  },
  tab: {
    padding: '12px 20px',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    marginBottom: '-2px',
    fontWeight: '500',
    color: '#6b7280',
  },
  activeTab: {
    borderBottomColor: '#3b82f6',
    color: '#3b82f6',
  },
  optionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
    marginBottom: '16px',
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export default function PromptEnhancer() {
  // State
  const [activeTab, setActiveTab] = useState('enhance');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Options state
  const [options, setOptions] = useState({
    type: 'both',
    style: 'detailed',
    model: 'auto',
    generateVariations: true,
    variationCount: 3,
    checkSafety: true,
    optimizeFor: null,
  });
  
  // Results state
  const [enhancedPrompt, setEnhancedPrompt] = useState(null);
  const [qualityAnalysis, setQualityAnalysis] = useState(null);
  const [variations, setVariations] = useState([]);
  const [safetyCheck, setSafetyCheck] = useState(null);
  const [optimization, setOptimization] = useState(null);
  const [fullResult, setFullResult] = useState(null);

  // Handle input change
  const handleOptionChange = (key, value) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
  };

  // Enhance prompt
  const handleEnhance = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await enhancePrompt(prompt, options);
      setEnhancedPrompt(result.data);
    } catch (err) {
      setError(err.error || 'Failed to enhance prompt');
    } finally {
      setLoading(false);
    }
  };

  // Analyze quality
  const handleAnalyze = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt to analyze');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await analyzePromptQuality(prompt);
      setQualityAnalysis(result.data);
    } catch (err) {
      setError(err.error || 'Failed to analyze prompt');
    } finally {
      setLoading(false);
    }
  };

  // Generate variations
  const handleVariations = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await generatePromptVariations(prompt, options.variationCount);
      setVariations(result.data.variations);
    } catch (err) {
      setError(err.error || 'Failed to generate variations');
    } finally {
      setLoading(false);
    }
  };

  // Check safety
  const handleSafetyCheck = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt to check');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await checkPromptSafety(prompt);
      setSafetyCheck(result.data);
    } catch (err) {
      setError(err.error || 'Failed to check safety');
    } finally {
      setLoading(false);
    }
  };

  // Optimize prompt
  const handleOptimize = async (type) => {
    if (!prompt.trim()) {
      setError('Please enter a prompt to optimize');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await optimizePrompt(prompt, type);
      setOptimization(result.data);
    } catch (err) {
      setError(err.error || 'Failed to optimize prompt');
    } finally {
      setLoading(false);
    }
  };

  // Full enhancement
  const handleFullEnhancement = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fullEnhancement(prompt, options);
      setFullResult(result.data);
    } catch (err) {
      setError(err.error || 'Failed to complete full enhancement');
    } finally {
      setLoading(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  // Render tabs
  const tabs = [
    { id: 'enhance', label: 'Enhance' },
    { id: 'analyze', label: 'Analyze' },
    { id: 'variations', label: 'Variations' },
    { id: 'safety', label: 'Safety' },
    { id: 'optimize', label: 'Optimize' },
    { id: 'full', label: 'Full Pipeline' },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>✨ Prompt Enhancer</h1>
        <p style={styles.subtitle}>
          Enhance, analyze, and optimize your prompts for AI image/video generation
        </p>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {tabs.map((tab) => (
          <div
            key={tab.id}
            style={{
              ...styles.tab,
              ...(activeTab === tab.id ? styles.activeTab : {}),
            }}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </div>
        ))}
      </div>

      {/* Input Section */}
      <div style={styles.card}>
        <label style={styles.label}>Enter your prompt:</label>
        <textarea
          style={styles.textarea}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter your prompt here... (e.g., a woman wearing a red dress)"
        />

        {/* Options */}
        <div style={styles.optionsGrid}>
          <div>
            <label style={{ ...styles.label, fontSize: '12px' }}>Type:</label>
            <select
              style={styles.select}
              value={options.type}
              onChange={(e) => handleOptionChange('type', e.target.value)}
            >
              <option value="both">Both</option>
              <option value="text">Image (Text)</option>
              <option value="video">Video</option>
            </select>
          </div>
          <div>
            <label style={{ ...styles.label, fontSize: '12px' }}>Style:</label>
            <select
              style={styles.select}
              value={options.style}
              onChange={(e) => handleOptionChange('style', e.target.value)}
            >
              <option value="detailed">Detailed</option>
              <option value="concise">Concise</option>
              <option value="technical">Technical</option>
            </select>
          </div>
          <div>
            <label style={{ ...styles.label, fontSize: '12px' }}>Variations:</label>
            <select
              style={styles.select}
              value={options.variationCount}
              onChange={(e) => handleOptionChange('variationCount', parseInt(e.target.value))}
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={5}>5</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={styles.buttonGroup}>
          {activeTab === 'enhance' && (
            <button
              style={{ ...styles.button, ...styles.primaryButton }}
              onClick={handleEnhance}
              disabled={loading}
            >
              {loading ? 'Enhancing...' : '✨ Enhance Prompt'}
            </button>
          )}
          {activeTab === 'analyze' && (
            <button
              style={{ ...styles.button, ...styles.primaryButton }}
              onClick={handleAnalyze}
              disabled={loading}
            >
              {loading ? 'Analyzing...' : '📊 Analyze Quality'}
            </button>
          )}
          {activeTab === 'variations' && (
            <button
              style={{ ...styles.button, ...styles.primaryButton }}
              onClick={handleVariations}
              disabled={loading}
            >
              {loading ? 'Generating...' : '🎨 Generate Variations'}
            </button>
          )}
          {activeTab === 'safety' && (
            <button
              style={{ ...styles.button, ...styles.primaryButton }}
              onClick={handleSafetyCheck}
              disabled={loading}
            >
              {loading ? 'Checking...' : '🔒 Check Safety'}
            </button>
          )}
          {activeTab === 'optimize' && (
            <>
              <button
                style={{ ...styles.button, ...styles.successButton }}
                onClick={() => handleOptimize('image')}
                disabled={loading}
              >
                🖼️ Optimize for Image
              </button>
              <button
                style={{ ...styles.button, ...styles.successButton }}
                onClick={() => handleOptimize('video')}
                disabled={loading}
              >
                🎬 Optimize for Video
              </button>
            </>
          )}
          {activeTab === 'full' && (
            <button
              style={{ ...styles.button, ...styles.primaryButton }}
              onClick={handleFullEnhancement}
              disabled={loading}
            >
              {loading ? 'Processing...' : '🚀 Full Enhancement'}
            </button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div style={styles.error}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={styles.loading}>
          <div style={{ fontSize: '24px', marginBottom: '12px' }}>⏳</div>
          Processing your request...
        </div>
      )}

      {/* Enhanced Prompt Result */}
      {activeTab === 'enhance' && enhancedPrompt && !loading && (
        <div style={styles.card}>
          <div style={styles.resultHeader}>
            <h3 style={{ margin: 0, fontSize: '16px' }}>✨ Enhanced Prompt</h3>
            <span style={{ fontSize: '12px', color: '#6b7280' }}>
              {formatProcessingTime(enhancedPrompt.processingTime)}
            </span>
          </div>
          <div style={styles.result}>
            <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
              {enhancedPrompt.enhancedPrompt}
            </p>
          </div>
          <div style={styles.buttonGroup}>
            <button
              style={{ ...styles.button, ...styles.secondaryButton }}
              onClick={() => copyToClipboard(enhancedPrompt.enhancedPrompt)}
            >
              📋 Copy
            </button>
          </div>
        </div>
      )}

      {/* Quality Analysis Result */}
      {activeTab === 'analyze' && qualityAnalysis && !loading && (
        <div style={styles.card}>
          <div style={styles.resultHeader}>
            <h3 style={{ margin: 0, fontSize: '16px' }}>📊 Quality Analysis</h3>
            <span
              style={{
                ...styles.badge,
                backgroundColor: getQualityColor(qualityAnalysis.level),
                color: 'white',
              }}
            >
              {qualityAnalysis.level.toUpperCase()} ({qualityAnalysis.score}/100)
            </span>
          </div>

          {/* Metrics */}
          <div style={styles.metrics}>
            <div style={styles.metric}>
              <div style={styles.metricLabel}>Clarity</div>
              <div style={styles.metricValue}>{qualityAnalysis.metrics.clarity}/25</div>
            </div>
            <div style={styles.metric}>
              <div style={styles.metricLabel}>Specificity</div>
              <div style={styles.metricValue}>{qualityAnalysis.metrics.specificity}/25</div>
            </div>
            <div style={styles.metric}>
              <div style={styles.metricLabel}>Creativity</div>
              <div style={styles.metricValue}>{qualityAnalysis.metrics.creativity}/20</div>
            </div>
            <div style={styles.metric}>
              <div style={styles.metricLabel}>Technical</div>
              <div style={styles.metricValue}>{qualityAnalysis.metrics.technicalAccuracy}/20</div>
            </div>
            <div style={styles.metric}>
              <div style={styles.metricLabel}>Length</div>
              <div style={styles.metricValue}>{qualityAnalysis.metrics.length}/10</div>
            </div>
          </div>

          {/* Strengths & Weaknesses */}
          <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <h4 style={{ marginBottom: '8px', color: '#10b981' }}>✓ Strengths</h4>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {qualityAnalysis.strengths.map((s, i) => (
                  <li key={i} style={{ marginBottom: '4px' }}>{s}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 style={{ marginBottom: '8px', color: '#ef4444' }}>✗ Weaknesses</h4>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {qualityAnalysis.weaknesses.map((w, i) => (
                  <li key={i} style={{ marginBottom: '4px' }}>{w}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Suggestions */}
          <div style={{ marginTop: '16px' }}>
            <h4 style={{ marginBottom: '8px' }}>💡 Suggestions</h4>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              {qualityAnalysis.suggestions.map((s, i) => (
                <li key={i} style={{ marginBottom: '4px' }}>{s}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Variations Result */}
      {activeTab === 'variations' && variations.length > 0 && !loading && (
        <div style={styles.card}>
          <h3 style={{ marginBottom: '16px', fontSize: '16px' }}>🎨 Prompt Variations</h3>
          {variations.map((v, index) => (
            <div key={index} style={styles.variation}>
              <div style={styles.variationHeader}>
                <span style={{ fontWeight: '600' }}>
                  Variation {index + 1} - {v.style}
                </span>
                <span
                  style={{
                    ...styles.badge,
                    backgroundColor: getQualityColor(getQualityLevel(v.score)),
                    color: 'white',
                  }}
                >
                  Score: {v.score}
                </span>
              </div>
              <p style={{ marginBottom: '8px', fontSize: '14px' }}>{v.text}</p>
              <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>
                <strong>Focus:</strong> {v.focus} | <strong>Description:</strong> {v.description}
              </p>
              <button
                style={{ ...styles.button, ...styles.secondaryButton, marginTop: '8px', padding: '8px 16px' }}
                onClick={() => copyToClipboard(v.text)}
              >
                📋 Copy
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Safety Check Result */}
      {activeTab === 'safety' && safetyCheck && !loading && (
        <div style={styles.card}>
          <h3 style={{ marginBottom: '16px', fontSize: '16px' }}>🔒 Safety Check</h3>
          
          <div
            style={{
              ...styles.safetyIndicator,
              backgroundColor: safetyCheck.safe ? '#d1fae5' : '#fee2e2',
            }}
          >
            <span style={{ fontSize: '24px' }}>
              {safetyCheck.safe ? '✅' : '⚠️'}
            </span>
            <div>
              <strong>{safetyCheck.safe ? 'Safe to use' : 'Contains issues'}</strong>
              <div style={{ fontSize: '12px' }}>
                Safety Score: {safetyCheck.score}/100
              </div>
            </div>
          </div>

          {/* Issues */}
          {Object.entries(safetyCheck.issues).map(([key, value]) => (
            <div key={key} style={{ marginTop: '12px' }}>
              <span style={{ fontWeight: '500' }}>
                {key === 'explicit' && '🔴'}
                {key === 'discriminatory' && '🟠'}
                {key === 'violent' && '🟡'}
                {key === 'misleading' && '🔵'}
                {' '}{key.charAt(0).toUpperCase() + key.slice(1)}:
              </span>
              <span style={{ marginLeft: '8px', color: value ? '#dc2626' : '#10b981' }}>
                {value === true ? 'Detected' : value === false ? 'Not detected' : value.join(', ')}
              </span>
            </div>
          ))}

          {/* Suggestions */}
          {safetyCheck.suggestions.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <h4>💡 Suggestions:</h4>
              <ul style={{ paddingLeft: '20px' }}>
                {safetyCheck.suggestions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Optimization Result */}
      {activeTab === 'optimize' && optimization && !loading && (
        <div style={styles.card}>
          <div style={styles.resultHeader}>
            <h3 style={{ margin: 0, fontSize: '16px' }}>
              {optimization.type === 'image' ? '🖼️' : '🎬'} Optimized for {optimization.type === 'image' ? 'Image' : 'Video'}
            </h3>
          </div>
          <div style={styles.result}>
            <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
              {optimization.optimizedPrompt}
            </p>
          </div>
          
          <div style={{ marginTop: '16px' }}>
            <h4>Added Specifications:</h4>
            <ul style={{ paddingLeft: '20px' }}>
              {optimization.addedSpecs.map((spec, i) => (
                <li key={i}>{spec}</li>
              ))}
            </ul>
          </div>

          <div style={styles.buttonGroup}>
            <button
              style={{ ...styles.button, ...styles.secondaryButton }}
              onClick={() => copyToClipboard(optimization.optimizedPrompt)}
            >
              📋 Copy
            </button>
          </div>
        </div>
      )}

      {/* Full Enhancement Result */}
      {activeTab === 'full' && fullResult && !loading && (
        <div style={styles.card}>
          <h3 style={{ marginBottom: '16px', fontSize: '16px' }}>🚀 Full Enhancement Results</h3>

          {/* Enhanced Prompt */}
          <div style={{ marginBottom: '20px' }}>
            <h4>✨ Enhanced Prompt:</h4>
            <div style={styles.result}>
              <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                {fullResult.enhancedPrompt}
              </p>
            </div>
          </div>

          {/* Quality Score */}
          {fullResult.qualityAnalysis && (
            <div style={{ marginBottom: '20px' }}>
              <h4>📊 Quality Score: {fullResult.qualityAnalysis.score}/100</h4>
              <span
                style={{
                  ...styles.badge,
                  backgroundColor: getQualityColor(fullResult.qualityAnalysis.level),
                  color: 'white',
                }}
              >
                {fullResult.qualityAnalysis.level.toUpperCase()}
              </span>
            </div>
          )}

          {/* Variations */}
          {fullResult.variations && fullResult.variations.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h4>🎨 Variations ({fullResult.variations.length}):</h4>
              {fullResult.variations.map((v, i) => (
                <div key={i} style={{ ...styles.variation, marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>Variation {i + 1}</strong>
                    <span style={{ color: getQualityColor(getQualityLevel(v.score)) }}>
                      Score: {v.score}
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', margin: '8px 0' }}>{v.text}</p>
                </div>
              ))}
            </div>
          )}

          {/* Safety */}
          {fullResult.safetyCheck && (
            <div style={{ marginBottom: '20px' }}>
              <h4>🔒 Safety: {fullResult.safetyCheck.safe ? '✅ Safe' : '⚠️ Issues detected'}</h4>
            </div>
          )}

          {/* Optimization */}
          {fullResult.optimization && (
            <div style={{ marginBottom: '20px' }}>
              <h4>📦 Optimized ({fullResult.optimization.type}):</h4>
              <div style={styles.result}>
                <p style={{ fontSize: '13px', whiteSpace: 'pre-wrap' }}>
                  {fullResult.optimization.optimizedPrompt}
                </p>
              </div>
            </div>
          )}

          <div style={styles.buttonGroup}>
            <button
              style={{ ...styles.button, ...styles.secondaryButton }}
              onClick={() => copyToClipboard(fullResult.enhancedPrompt)}
            >
              📋 Copy Enhanced Prompt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
