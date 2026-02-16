import React, { useState, useCallback } from 'react';
import './BatchProcessing.css';

const BatchProcessing = ({ 
  onBatchGenerate, 
  isProcessing = false, 
  batchProgress = null,
  maxBatchSize = 10 
}) => {
  const [batchItems, setBatchItems] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [batchSettings, setBatchSettings] = useState({
    imageCount: 2,
    aspectRatio: '1:1',
    priority: 'quality'
  });

  const templates = [
    {
      id: 'ecommerce-variants',
      name: 'E-commerce Variants',
      description: 'Generate multiple product shots',
      icon: '🛒',
      settings: { imageCount: 4, aspectRatio: '1:1' }
    },
    {
      id: 'social-media-pack',
      name: 'Social Media Pack',
      description: 'Create content for social platforms',
      icon: '📱',
      settings: { imageCount: 6, aspectRatio: '1:1' }
    },
    {
      id: 'fashion-editorial',
      name: 'Fashion Editorial',
      description: 'Professional editorial shots',
      icon: '📸',
      settings: { imageCount: 8, aspectRatio: '3:4' }
    },
    {
      id: 'before-after-series',
      name: 'Before/After Series',
      description: 'Compare transformations',
      icon: '⚖️',
      settings: { imageCount: 2, aspectRatio: '1:1' }
    }
  ];

  const handleFileSelect = useCallback((event) => {
    const files = Array.from(event.target.files);
    const newItems = files.map((file, index) => ({
      id: Date.now() + index,
      file,
      preview: URL.createObjectURL(file),
      type: file.type.startsWith('image/character') ? 'character' : 'product',
      name: file.name,
      size: file.size,
      status: 'pending',
      progress: 0
    }));

    setBatchItems(prev => [...prev, ...newItems].slice(0, maxBatchSize));
  }, [maxBatchSize]);

  const removeBatchItem = (id) => {
    setBatchItems(prev => {
      const updated = prev.filter(item => item.id !== id);
      // Clean up object URLs
      const removed = prev.find(item => item.id === id);
      if (removed?.preview) {
        URL.revokeObjectURL(removed.preview);
      }
      return updated;
    });
  };

  const updateBatchItem = (id, updates) => {
    setBatchItems(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  const selectTemplate = (template) => {
    setSelectedTemplate(template);
    setBatchSettings(prev => ({ ...prev, ...template.settings }));
  };

  const startBatchProcessing = () => {
    if (batchItems.length === 0) return;
    
    const processedBatch = batchItems.map(item => ({
      ...item,
      template: selectedTemplate,
      settings: batchSettings
    }));
    
    onBatchGenerate?.(processedBatch);
  };

  const clearBatch = () => {
    batchItems.forEach(item => {
      if (item.preview) {
        URL.revokeObjectURL(item.preview);
      }
    });
    setBatchItems([]);
    setSelectedTemplate(null);
  };

  const getBatchStats = () => {
    const total = batchItems.length;
    const completed = batchItems.filter(item => item.status === 'completed').length;
    const failed = batchItems.filter(item => item.status === 'failed').length;
    const processing = batchItems.filter(item => item.status === 'processing').length;
    
    return { total, completed, failed, processing };
  };

  const stats = getBatchStats();

  return (
    <div className="batch-processing">
      <div className="batch-header">
        <h2>📦 Batch Processing</h2>
        <p>Process multiple images at once with templates and automation</p>
      </div>

      {/* Template Selection */}
      <div className="template-section">
        <h3>🎯 Choose Template</h3>
        <div className="template-grid">
          {templates.map(template => (
            <div 
              key={template.id}
              className={`template-card ${selectedTemplate?.id === template.id ? 'selected' : ''}`}
              onClick={() => selectTemplate(template)}
            >
              <div className="template-icon">{template.icon}</div>
              <div className="template-info">
                <h4>{template.name}</h4>
                <p>{template.description}</p>
                <small>{template.settings.imageCount} images • {template.settings.aspectRatio}</small>
              </div>
              {selectedTemplate?.id === template.id && (
                <div className="template-check">✓</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* File Upload */}
      <div className="upload-section">
        <h3>📤 Upload Images</h3>
        <div className="upload-area">
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            id="batch-upload"
            disabled={batchItems.length >= maxBatchSize}
          />
          <label htmlFor="batch-upload" className="upload-label">
            <div className="upload-icon">📁</div>
            <div className="upload-text">
              <strong>Click to upload</strong> or drag and drop
              <br />
              <small>PNG, JPG up to {maxBatchSize} files</small>
            </div>
          </label>
        </div>
      </div>

      {/* Batch Items */}
      {batchItems.length > 0 && (
        <div className="batch-items-section">
          <div className="batch-items-header">
            <h3>📋 Batch Items ({batchItems.length}/{maxBatchSize})</h3>
            <div className="batch-stats">
              <span className="stat-completed">✓ {stats.completed}</span>
              <span className="stat-processing">⏳ {stats.processing}</span>
              <span className="stat-failed">✗ {stats.failed}</span>
            </div>
          </div>

          <div className="batch-items-grid">
            {batchItems.map(item => (
              <div key={item.id} className={`batch-item ${item.status}`}>
                <div className="item-preview">
                  <img src={item.preview} alt={item.name} />
                  <div className="item-overlay">
                    <button 
                      className="remove-btn"
                      onClick={() => removeBatchItem(item.id)}
                      disabled={isProcessing}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="item-info">
                  <div className="item-name">{item.name}</div>
                  <div className="item-meta">
                    <span className="item-size">{(item.size / 1024 / 1024).toFixed(1)}MB</span>
                    <span className={`item-status ${item.status}`}>
                      {item.status === 'pending' && '⏳ Pending'}
                      {item.status === 'processing' && '⚙️ Processing'}
                      {item.status === 'completed' && '✅ Completed'}
                      {item.status === 'failed' && '❌ Failed'}
                    </span>
                  </div>

                  {item.status === 'processing' && (
                    <div className="item-progress">
                      <div 
                        className="progress-bar"
                        style={{ width: `${item.progress}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Batch Settings */}
      {selectedTemplate && (
        <div className="batch-settings">
          <h3>⚙️ Batch Settings</h3>
          <div className="settings-grid">
            <div className="setting-group">
              <label>Images per Item</label>
              <select
                value={batchSettings.imageCount}
                onChange={(e) => setBatchSettings(prev => ({
                  ...prev, 
                  imageCount: parseInt(e.target.value)
                }))}
              >
                <option value={1}>1 Image</option>
                <option value={2}>2 Images</option>
                <option value={3}>3 Images</option>
                <option value={4}>4 Images</option>
              </select>
            </div>

            <div className="setting-group">
              <label>Aspect Ratio</label>
              <select
                value={batchSettings.aspectRatio}
                onChange={(e) => setBatchSettings(prev => ({
                  ...prev, 
                  aspectRatio: e.target.value
                }))}
              >
                <option value="1:1">Square (1:1)</option>
                <option value="4:3">Landscape (4:3)</option>
                <option value="3:4">Portrait (3:4)</option>
                <option value="16:9">Wide (16:9)</option>
              </select>
            </div>

            <div className="setting-group">
              <label>Priority</label>
              <select
                value={batchSettings.priority}
                onChange={(e) => setBatchSettings(prev => ({
                  ...prev, 
                  priority: e.target.value
                }))}
              >
                <option value="speed">Speed</option>
                <option value="quality">Quality</option>
                <option value="balanced">Balanced</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Batch Progress */}
      {isProcessing && batchProgress && (
        <div className="batch-progress">
          <h3>🚀 Processing Batch</h3>
          <div className="progress-overview">
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${batchProgress.overall}%` }}
              ></div>
            </div>
            <div className="progress-text">
              {batchProgress.completed}/{batchProgress.total} items completed
            </div>
          </div>

          <div className="progress-details">
            <div className="detail-item">
              <span>Elapsed:</span> {batchProgress.elapsed}s
            </div>
            <div className="detail-item">
              <span>Estimated remaining:</span> {batchProgress.remaining}s
            </div>
            <div className="detail-item">
              <span>Average time per item:</span> {batchProgress.avgTime}s
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="batch-actions">
        {batchItems.length > 0 && (
          <button 
            className="action-btn secondary"
            onClick={clearBatch}
            disabled={isProcessing}
          >
            🗑️ Clear Batch
          </button>
        )}

        <button 
          className="action-btn primary"
          onClick={startBatchProcessing}
          disabled={batchItems.length === 0 || !selectedTemplate || isProcessing}
        >
          {isProcessing ? '⏳ Processing...' : '🚀 Start Batch Processing'}
        </button>
      </div>
    </div>
  );
};

export default BatchProcessing;
