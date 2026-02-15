import React, { useState } from 'react';

/**
 * Negative Prompt Component
 * Allows users to specify what they DON'T want in generated images
 */
export default function NegativePrompt({ 
  negativePrompt, 
  onNegativePromptChange,
  showAdvanced = false,
  onToggleAdvanced
}) {
  const [localNegative, setLocalNegative] = useState(negativePrompt || '');

  // Preset negative prompts for quick selection
  const presets = [
    {
      id: 'basic-quality',
      label: '🎨 Basic Quality',
      value: 'low quality, blurry, distorted, deformed, ugly, bad anatomy'
    },
    {
      id: 'safe-content',
      label: '🛡️ Safe Content',
      value: 'nsfw, nude, explicit, adult content, inappropriate'
    },
    {
      id: 'clean-image',
      label: '🧹 Clean Image',
      value: 'text, watermark, signature, logo, username, artist name'
    },
    {
      id: 'character-fix',
      label: '👤 Character Fix',
      value: 'extra limbs, missing limbs, bad hands, bad face, mutation, deformed hands'
    },
    {
      id: 'anatomy',
      label: '💪 Better Anatomy',
      value: 'bad anatomy, deformed, disfigured, mutation, mutated, extra fingers, fewer fingers, bad hands'
    }
  ];

  const handlePresetClick = (presetValue) => {
    const newValue = localNegative 
      ? `${localNegative}, ${presetValue}`
      : presetValue;
    setLocalNegative(newValue);
    onNegativePromptChange(newValue);
  };

  const handleClear = () => {
    setLocalNegative('');
    onNegativePromptChange('');
  };

  const handleChange = (e) => {
    setLocalNegative(e.target.value);
    onNegativePromptChange(e.target.value);
  };

  return (
    <div className="negative-prompt-container">
      {/* Toggle Button */}
      <button
        type="button"
        onClick={onToggleAdvanced}
        className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginTop: '10px',
          padding: '8px 16px',
          background: showAdvanced ? '#4a5568' : 'transparent',
          border: '1px solid #4a5568',
          borderRadius: '6px',
          cursor: 'pointer',
          color: '#e2e8f0'
        }}
      >
        <span>⚙️</span>
        <span>Advanced Options</span>
        <span style={{ 
          transform: showAdvanced ? 'rotate(180deg)' : 'rotate(0deg)', 
          transition: 'transform 0.3s',
          fontSize: '10px'
        }}>
          ▼
        </span>
      </button>

      {/* Advanced Options Panel */}
      {showAdvanced && (
        <div style={{
          marginTop: '15px',
          padding: '15px',
          background: '#1a202c',
          borderRadius: '8px',
          border: '1px solid #2d3748'
        }}>
          {/* Negative Prompt Input */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: '500',
              color: '#e2e8f0',
              fontSize: '14px'
            }}>
              🚫 Negative Prompt (What to avoid):
            </label>
            <textarea
              value={localNegative}
              onChange={handleChange}
              placeholder="low quality, blurry, distorted, bad anatomy..."
              rows={3}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #4a5568',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical',
                backgroundColor: '#2d3748',
                color: '#e2e8f0'
              }}
            />
            <p style={{ 
              fontSize: '12px', 
              color: '#a0aec0', 
              marginTop: '5px' 
            }}>
              Specify elements you want to avoid in the generated image
            </p>
          </div>
          
          {/* Preset Buttons */}
          <div style={{ marginTop: '10px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontSize: '13px',
              color: '#a0aec0'
            }}>
              Quick Presets:
            </label>
            <div style={{ 
              display: 'flex', 
              gap: '8px', 
              flexWrap: 'wrap' 
            }}>
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handlePresetClick(preset.value)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    background: '#2d3748',
                    border: '1px solid #4a5568',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    color: '#e2e8f0',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.background = '#4a5568';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.background = '#2d3748';
                  }}
                >
                  {preset.label}
                </button>
              ))}
              <button
                type="button"
                onClick={handleClear}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  background: 'transparent',
                  border: '1px solid #e53e3e',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  color: '#fc8181',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = '#e53e3e';
                  e.target.style.color = 'white';
                }}
                onMouseOut={(e) => {
                  e.target.style.background = 'transparent';
                  e.target.style.color = '#fc8181';
                }}
              >
                ✖️ Clear
              </button>
            </div>
          </div>

          {/* Current Value Display */}
          {localNegative && (
            <div style={{ 
              marginTop: '15px', 
              padding: '10px',
              background: '#2d3748',
              borderRadius: '6px'
            }}>
              <span style={{ 
                fontSize: '12px', 
                color: '#a0aec0',
                display: 'block',
                marginBottom: '5px'
              }}>
                Current negative prompt:
              </span>
              <p style={{ 
                fontSize: '13px', 
                color: '#fc8181',
                wordBreak: 'break-word'
              }}>
                {localNegative}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
