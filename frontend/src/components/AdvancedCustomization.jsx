import React, { useState, useEffect } from 'react';
import './AdvancedCustomization.css';

const AdvancedCustomization = ({ 
  analysis, 
  selectedOptions, 
  onOptionsChange,
  presets = [] 
}) => {
  const [activeTab, setActiveTab] = useState('style');
  const [customValues, setCustomValues] = useState({});
  const [presetName, setPresetName] = useState('');
  const [showPresetSave, setShowPresetSave] = useState(false);

  const tabs = [
    { id: 'style', label: '🎨 Style', icon: '🎨' },
    { id: 'lighting', label: '💡 Lighting', icon: '💡' },
    { id: 'composition', label: '📐 Composition', icon: '📐' },
    { id: 'effects', label: '✨ Effects', icon: '✨' },
    { id: 'presets', label: '📚 Presets', icon: '📚' }
  ];

  // Advanced style options
  const styleOptions = {
    colorPalette: {
      label: 'Color Palette',
      type: 'palette',
      options: [
        { value: 'monochromatic', label: 'Monochromatic', colors: ['#2c3e50', '#34495e', '#7f8c8d'] },
        { value: 'analogous', label: 'Analogous', colors: ['#e74c3c', '#f39c12', '#f1c40f'] },
        { value: 'complementary', label: 'Complementary', colors: ['#3498db', '#e74c3c'] },
        { value: 'triadic', label: 'Triadic', colors: ['#e74c3c', '#27ae60', '#3498db'] },
        { value: 'warm', label: 'Warm Tones', colors: ['#e67e22', '#f39c12', '#f1c40f'] },
        { value: 'cool', label: 'Cool Tones', colors: ['#3498db', '#9b59b6', '#34495e'] }
      ]
    },
    mood: {
      label: 'Mood & Atmosphere',
      type: 'select',
      options: [
        { value: 'serene', label: 'Serene & Calm' },
        { value: 'energetic', label: 'Energetic & Dynamic' },
        { value: 'mysterious', label: 'Mysterious & Intriguing' },
        { value: 'romantic', label: 'Romantic & Soft' },
        { value: 'dramatic', label: 'Dramatic & Intense' },
        { value: 'minimalist', label: 'Minimalist & Clean' },
        { value: 'vibrant', label: 'Vibrant & Colorful' },
        { value: 'nostalgic', label: 'Nostalgic & Vintage' }
      ]
    },
    style: {
      label: 'Art Style',
      type: 'select',
      options: [
        { value: 'photorealistic', label: 'Photorealistic' },
        { value: 'cinematic', label: 'Cinematic' },
        { value: 'studio', label: 'Studio Photography' },
        { value: 'fashion', label: 'Fashion Editorial' },
        { value: 'portrait', label: 'Portrait' },
        { value: 'lifestyle', label: 'Lifestyle' },
        { value: 'artistic', label: 'Artistic' },
        { value: 'vintage', label: 'Vintage' }
      ]
    }
  };

  // Advanced lighting options
  const lightingOptions = {
    type: {
      label: 'Lighting Type',
      type: 'select',
      options: [
        { value: 'natural', label: 'Natural Light' },
        { value: 'studio', label: 'Studio Lighting' },
        { value: 'dramatic', label: 'Dramatic Lighting' },
        { value: 'ambient', label: 'Ambient Lighting' },
        { value: 'colored', label: 'Colored Lighting' },
        { value: 'backlit', label: 'Backlit' },
        { value: 'rim', label: 'Rim Lighting' }
      ]
    },
    direction: {
      label: 'Light Direction',
      type: 'select',
      options: [
        { value: 'front', label: 'Front Lighting' },
        { value: 'side', label: 'Side Lighting' },
        { value: 'back', label: 'Back Lighting' },
        { value: 'top', label: 'Top Lighting' },
        { value: 'bottom', label: 'Bottom Lighting' },
        { value: 'multiple', label: 'Multiple Sources' }
      ]
    },
    intensity: {
      label: 'Light Intensity',
      type: 'slider',
      min: 0.1,
      max: 2.0,
      step: 0.1,
      default: 1.0
    },
    temperature: {
      label: 'Color Temperature',
      type: 'slider',
      min: 2000,
      max: 10000,
      step: 500,
      default: 5500,
      unit: 'K'
    }
  };

  // Composition options
  const compositionOptions = {
    angle: {
      label: 'Camera Angle',
      type: 'select',
      options: [
        { value: 'eye-level', label: 'Eye Level' },
        { value: 'high-angle', label: 'High Angle' },
        { value: 'low-angle', label: 'Low Angle' },
        { value: 'birds-eye', label: "Bird's Eye" },
        { value: 'worms-eye', label: "Worm's Eye" },
        { value: 'dutch', label: 'Dutch Angle' }
      ]
    },
    framing: {
      label: 'Framing',
      type: 'select',
      options: [
        { value: 'close-up', label: 'Close-up' },
        { value: 'medium', label: 'Medium Shot' },
        { value: 'full-body', label: 'Full Body' },
        { value: 'wide', label: 'Wide Shot' },
        { value: 'extreme-close', label: 'Extreme Close-up' }
      ]
    },
    ruleOfThirds: {
      label: 'Rule of Thirds',
      type: 'toggle',
      default: true
    },
    leadingLines: {
      label: 'Leading Lines',
      type: 'toggle',
      default: false
    },
    symmetry: {
      label: 'Symmetry',
      type: 'toggle',
      default: false
    }
  };

  // Effects options
  const effectsOptions = {
    sharpness: {
      label: 'Sharpness',
      type: 'slider',
      min: 0,
      max: 2,
      step: 0.1,
      default: 1.0
    },
    contrast: {
      label: 'Contrast',
      type: 'slider',
      min: 0.5,
      max: 2.0,
      step: 0.1,
      default: 1.0
    },
    saturation: {
      label: 'Saturation',
      type: 'slider',
      min: 0,
      max: 2,
      step: 0.1,
      default: 1.0
    },
    vignette: {
      label: 'Vignette',
      type: 'slider',
      min: 0,
      max: 1,
      step: 0.1,
      default: 0
    },
    grain: {
      label: 'Film Grain',
      type: 'slider',
      min: 0,
      max: 1,
      step: 0.1,
      default: 0
    },
    blur: {
      label: 'Background Blur',
      type: 'select',
      options: [
        { value: 'none', label: 'No Blur' },
        { value: 'slight', label: 'Slight Blur' },
        { value: 'medium', label: 'Medium Blur' },
        { value: 'heavy', label: 'Heavy Blur' },
        { value: 'bokeh', label: 'Bokeh Effect' }
      ]
    }
  };

  const handleOptionChange = (category, key, value) => {
    const newOptions = {
      ...selectedOptions,
      [category]: {
        ...selectedOptions[category],
        [key]: value
      }
    };
    onOptionsChange(newOptions);
  };

  const handleCustomChange = (key, value) => {
    setCustomValues(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const saveAsPreset = () => {
    if (!presetName.trim()) return;
    
    const newPreset = {
      id: Date.now().toString(),
      name: presetName,
      options: { ...selectedOptions },
      customValues: { ...customValues },
      createdAt: new Date().toISOString()
    };
    
    // Save to localStorage or API
    const existingPresets = JSON.parse(localStorage.getItem('customPresets') || '[]');
    existingPresets.push(newPreset);
    localStorage.setItem('customPresets', JSON.stringify(existingPresets));
    
    setPresetName('');
    setShowPresetSave(false);
  };

  const loadPreset = (preset) => {
    onOptionsChange(preset.options);
    setCustomValues(preset.customValues || {});
  };

  const deletePreset = (presetId) => {
    const existingPresets = JSON.parse(localStorage.getItem('customPresets') || '[]');
    const filtered = existingPresets.filter(p => p.id !== presetId);
    localStorage.setItem('customPresets', JSON.stringify(filtered));
  };

  const renderOptionControl = (optionKey, optionConfig) => {
    const currentValue = selectedOptions[activeTab]?.[optionKey] || optionConfig.default;

    switch (optionConfig.type) {
      case 'select':
        return (
          <select
            value={currentValue}
            onChange={(e) => handleOptionChange(activeTab, optionKey, e.target.value)}
          >
            {optionConfig.options.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );

      case 'slider':
        return (
          <div className="slider-control">
            <input
              type="range"
              min={optionConfig.min}
              max={optionConfig.max}
              step={optionConfig.step}
              value={currentValue}
              onChange={(e) => handleOptionChange(activeTab, optionKey, parseFloat(e.target.value))}
            />
            <span className="slider-value">
              {currentValue}{optionConfig.unit || ''}
            </span>
          </div>
        );

      case 'toggle':
        return (
          <label className="toggle-control">
            <input
              type="checkbox"
              checked={currentValue}
              onChange={(e) => handleOptionChange(activeTab, optionKey, e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        );

      case 'palette':
        return (
          <div className="palette-control">
            {optionConfig.options.map(palette => (
              <div
                key={palette.value}
                className={`palette-option ${currentValue === palette.value ? 'selected' : ''}`}
                onClick={() => handleOptionChange(activeTab, optionKey, palette.value)}
              >
                <div className="palette-colors">
                  {palette.colors.map((color, i) => (
                    <div key={i} className="palette-color" style={{ backgroundColor: color }}></div>
                  ))}
                </div>
                <span>{palette.label}</span>
              </div>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  const getCurrentOptions = () => {
    switch (activeTab) {
      case 'style': return styleOptions;
      case 'lighting': return lightingOptions;
      case 'composition': return compositionOptions;
      case 'effects': return effectsOptions;
      default: return {};
    }
  };

  const renderTabContent = () => {
    const options = getCurrentOptions();

    if (activeTab === 'presets') {
      const savedPresets = JSON.parse(localStorage.getItem('customPresets') || '[]');
      
      return (
        <div className="presets-content">
          <div className="preset-actions">
            <button 
              className="save-preset-btn"
              onClick={() => setShowPresetSave(true)}
            >
              💾 Save Current as Preset
            </button>
          </div>

          {showPresetSave && (
            <div className="preset-save">
              <input
                type="text"
                placeholder="Preset name..."
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
              />
              <button onClick={saveAsPreset}>Save</button>
              <button onClick={() => setShowPresetSave(false)}>Cancel</button>
            </div>
          )}

          <div className="presets-list">
            {savedPresets.map(preset => (
              <div key={preset.id} className="preset-item">
                <div className="preset-info">
                  <h4>{preset.name}</h4>
                  <small>{new Date(preset.createdAt).toLocaleDateString()}</small>
                </div>
                <div className="preset-actions">
                  <button onClick={() => loadPreset(preset)}>Load</button>
                  <button onClick={() => deletePreset(preset.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="options-grid">
        {Object.entries(options).map(([key, config]) => (
          <div key={key} className="option-group">
            <label>{config.label}</label>
            {renderOptionControl(key, config)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="advanced-customization">
      <div className="customization-header">
        <h2>⚙️ Advanced Customization</h2>
        <p>Fine-tune your generation with professional controls</p>
      </div>

      <div className="customization-tabs">
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

      <div className="customization-content">
        {renderTabContent()}
      </div>

      <div className="customization-footer">
        <div className="ai-insights">
          {analysis?.recommendations && (
            <div className="insights-content">
              <h4>🤖 AI Insights</h4>
              <p>Based on your character and product analysis, these settings are optimized for best results.</p>
            </div>
          )}
        </div>

        <div className="action-buttons">
          <button 
            className="reset-btn"
            onClick={() => onOptionsChange({})}
          >
            🔄 Reset All
          </button>
          <button 
            className="apply-btn"
            onClick={() => {/* Apply changes */}}
          >
            ✅ Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdvancedCustomization;
