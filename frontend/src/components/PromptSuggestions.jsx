import React, { useEffect, useState } from 'react';
import axios from 'axios';

/**
 * PromptSuggestions - Show AI-powered prompt improvement suggestions
 */
function PromptSuggestions({ prompt, scenario, onSelectSuggestion, characterDescription }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validation, setValidation] = useState(null);

  useEffect(() => {
    if (!prompt || prompt.trim().length < 3) {
      setSuggestions([]);
      setValidation(null);
      return;
    }

    // Debounce API calls
    const timeout = setTimeout(() => {
      fetchSuggestions();
    }, 500);

    return () => clearTimeout(timeout);
  }, [prompt, scenario, characterDescription]);

  const fetchSuggestions = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post('/api/v1/prompt/suggestions', {
        prompt,
        scenario,
        characterDescription
      });

      setSuggestions(response.data.suggestions || []);
      setValidation(response.data.validation);
    } catch (err) {
      console.error('Error fetching suggestions:', err);
      setError('Failed to load suggestions');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSuggestion = (suggestion) => {
    if (onSelectSuggestion) {
      onSelectSuggestion(suggestion.suggestion);
    }
  };

  // Quality score color
  const getQualityColor = (score) => {
    if (score >= 80) return '#10b981'; // green
    if (score >= 60) return '#f59e0b'; // amber
    return '#ef4444'; // red
  };

  return (
    <div className="prompt-suggestions-container">
      {/* Validation feedback */}
      {validation && (
        <div className="validation-section">
          <div className={`validation-status ${validation.valid ? 'valid' : 'invalid'}`}>
            <div className="status-header">
              <span className="status-icon">{validation.valid ? '✅' : '⚠️'}</span>
              <span className="status-text">
                {validation.valid ? 'Prompt is ready' : 'Prompt needs improvement'}
              </span>
              <div className="quality-score" style={{ backgroundColor: getQualityColor(validation.score) }}>
                {validation.score}
              </div>
            </div>

            {/* Word count */}
            <div className="validation-detail">
              <span className="detail-label">Word count:</span>
              <span className="detail-value">{validation.wordCount}</span>
              <span className="detail-note">(5-100 recommended)</span>
            </div>

            {/* Issues */}
            {validation.issues.length > 0 && (
              <div className="validation-issues">
                <h4>Issues:</h4>
                <ul>
                  {validation.issues.map((issue, i) => (
                    <li key={i} className="issue-item">
                      <span className="issue-icon">❌</span> {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Warnings */}
            {validation.warnings.length > 0 && (
              <div className="validation-warnings">
                <h4>Suggestions:</h4>
                <ul>
                  {validation.warnings.map((warning, i) => (
                    <li key={i} className="warning-item">
                      <span className="warning-icon">💡</span> {warning}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Suggestions list */}
      {suggestions.length > 0 && (
        <div className="suggestions-section">
          <h4 className="suggestions-title">✨ Suggested Improvements</h4>

          <div className="suggestions-list">
            {suggestions.map((suggestion, index) => (
              <div key={index} className={`suggestion-card suggestion-${suggestion.priority}`}>
                {/* Header */}
                <div className="suggestion-header">
                  <div className="suggestion-title-bar">
                    <span className="suggestion-type-badge" style={{ backgroundColor: getPriorityColor(suggestion.priority) }}>
                      {suggestion.type.replace(/_/g, ' ')}
                    </span>
                    <h5 className="suggestion-title">{suggestion.title}</h5>
                  </div>
                  <span className="priority-label">{suggestion.priority} priority</span>
                </div>

                {/* Reason */}
                <p className="suggestion-reason">
                  💡 {suggestion.reason}
                </p>

                {/* Original vs Suggested */}
                <div className="suggestion-comparison">
                  <div className="comparison-block original">
                    <span className="comparison-label">Current:</span>
                    <p className="comparison-text">{prompt}</p>
                  </div>

                  <div className="comparison-arrow">→</div>

                  <div className="comparison-block suggested">
                    <span className="comparison-label">Suggested:</span>
                    <p className="comparison-text">{suggestion.suggestion}</p>
                  </div>
                </div>

                {/* Action button */}
                <button
                  className="suggestion-apply-btn"
                  onClick={() => handleSelectSuggestion(suggestion)}
                >
                  Apply This Suggestion
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="suggestions-loading">
          <div className="loading-spinner"></div>
          <p>Analyzing your prompt...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="suggestions-error">
          <span className="error-icon">⚠️</span>
          <p>{error}</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && suggestions.length === 0 && prompt && validation && validation.valid && (
        <div className="suggestions-empty">
          <p>✅ Your prompt looks great! No improvements needed.</p>
        </div>
      )}

      <style jsx>{`
        .prompt-suggestions-container {
          margin: 20px 0;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* Validation Section */
        .validation-section {
          animation: slideIn 0.3s ease;
        }

        .validation-status {
          background: white;
          border-radius: 8px;
          padding: 16px;
          border-left: 4px solid;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .validation-status.valid {
          border-left-color: #10b981;
          background: #f0fdf4;
        }

        .validation-status.invalid {
          border-left-color: #f59e0b;
          background: #fffbeb;
        }

        .status-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
          font-weight: 600;
          color: #1f2937;
        }

        .status-icon {
          font-size: 20px;
        }

        .status-text {
          flex: 1;
        }

        .quality-score {
          color: white;
          font-weight: 700;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 14px;
          min-width: 40px;
          text-align: center;
        }

        .validation-detail {
          display: flex;
          gap: 8px;
          font-size: 14px;
          margin-bottom: 12px;
          color: #6b7280;
        }

        .detail-label {
          font-weight: 600;
        }

        .detail-value {
          color: #1f2937;
          font-weight: 600;
        }

        .detail-note {
          color: #9ca3af;
        }

        .validation-issues,
        .validation-warnings {
          margin: 12px 0 0 0;
        }

        .validation-issues h4,
        .validation-warnings h4 {
          margin: 0 0 8px 0;
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .validation-issues ul,
        .validation-warnings ul {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .issue-item,
        .warning-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #374151;
        }

        .issue-icon,
        .warning-icon {
          font-size: 14px;
        }

        /* Suggestions Section */
        .suggestions-section {
          animation: slideIn 0.3s ease;
        }

        .suggestions-title {
          margin: 0 0 12px 0;
          font-size: 15px;
          font-weight: 600;
          color: #1f2937;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .suggestions-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .suggestion-card {
          background: white;
          border-radius: 8px;
          padding: 16px;
          border-left: 4px solid;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          transition: all 0.2s ease;
        }

        .suggestion-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
          transform: translateY(-2px);
        }

        .suggestion-card.suggestion-high {
          border-left-color: #ef4444;
        }

        .suggestion-card.suggestion-medium {
          border-left-color: #f59e0b;
        }

        .suggestion-card.suggestion-low {
          border-left-color: #3b82f6;
        }

        .suggestion-header {
          margin-bottom: 12px;
        }

        .suggestion-title-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }

        .suggestion-type-badge {
          color: white;
          padding: 4px 12px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .suggestion-title {
          margin: 0;
          font-size: 15px;
          font-weight: 600;
          color: #1f2937;
          flex: 1;
        }

        .priority-label {
          font-size: 12px;
          color: #9ca3af;
          font-weight: 500;
        }

        .suggestion-reason {
          color: #6b7280;
          font-size: 13px;
          margin: 0 0 12px 0;
          line-height: 1.5;
        }

        .suggestion-comparison {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          gap: 12px;
          align-items: center;
          margin-bottom: 12px;
          font-size: 13px;
        }

        .comparison-block {
          background: #f9fafb;
          padding: 12px;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
        }

        .comparison-block.original {
          border-left: 3px solid #ef4444;
        }

        .comparison-block.suggested {
          border-left: 3px solid #10b981;
        }

        .comparison-label {
          display: block;
          font-weight: 600;
          color: #374151;
          margin-bottom: 6px;
          font-size: 12px;
        }

        .comparison-text {
          margin: 0;
          color: #1f2937;
          lines: 2;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .comparison-arrow {
          color: #d1d5db;
          font-weight: bold;
          text-align: center;
        }

        .suggestion-apply-btn {
          width: 100%;
          padding: 10px 16px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .suggestion-apply-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .suggestion-apply-btn:active {
          transform: translateY(0);
        }

        /* Loading State */
        .suggestions-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px;
          gap: 12px;
        }

        .loading-spinner {
          width: 24px;
          height: 24px;
          border: 3px solid #f3f4f6;
          border-top-color: #8b5cf6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .suggestions-loading p {
          color: #6b7280;
          font-size: 14px;
          margin: 0;
        }

        /* Error/Empty States */
        .suggestions-error,
        .suggestions-empty {
          padding: 16px;
          border-radius: 8px;
          text-align: center;
          font-size: 14px;
        }

        .suggestions-error {
          background: #fee2e2;
          border: 1px solid #fecaca;
          color: #7f1d1d;
        }

        .suggestions-error p {
          margin: 0;
        }

        .error-icon {
          display: block;
          font-size: 24px;
          margin-bottom: 8px;
        }

        .suggestions-empty {
          background: #d1fae5;
          border: 1px solid #a7f3d0;
          color: #065f46;
        }

        .suggestions-empty p {
          margin: 0;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Get color based on priority
 */
function getPriorityColor(priority) {
  switch (priority) {
    case 'high':
      return '#ef4444';
    case 'medium':
      return '#f59e0b';
    case 'low':
      return '#3b82f6';
    default:
      return '#6b7280';
  }
}

export default PromptSuggestions;
