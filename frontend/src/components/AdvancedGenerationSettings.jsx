/**
 * Advanced Generation Settings Component
 * Quality controls, CFG scale, sampling methods
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';

const SAMPLING_METHODS = [
  { value: 'euler', label: 'Euler', description: 'Fast, good quality' },
  { value: 'euler_ancestral', label: 'Euler Ancestral', description: 'More varied' },
  { value: 'heun', label: 'Heun', description: 'Slower, detailed' },
  { value: 'dpm++', label: 'DPM++', description: 'High quality' },
  { value: 'lms', label: 'LMS', description: 'Experimental' },
];

const QUALITY_PRESETS = [
  { value: 'draft', label: 'Draft', steps: 20, cfg: 7, description: 'Fast, lower quality' },
  { value: 'normal', label: 'Normal', steps: 30, cfg: 7.5, description: 'Balanced' },
  { value: 'high', label: 'High', steps: 50, cfg: 8, description: 'Better quality' },
  { value: 'ultra', label: 'Ultra', steps: 80, cfg: 10, description: 'Best quality, slower' },
];

function Tooltip({ children, content }) {
  return (
    <div className="group relative inline-block">
      {children}
      <div className="absolute bottom-full left-0 mb-2 z-50 hidden group-hover:flex w-56">
        <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl whitespace-normal">
          {content}
          <div className="absolute top-full left-4 border-8 border-transparent border-t-gray-900" />
        </div>
      </div>
    </div>
  );
}

export default function AdvancedGenerationSettings({
  steps = 30,
  onStepsChange,
  cfgScale = 7.5,
  onCfgScaleChange,
  samplingMethod = 'euler',
  onSamplingMethodChange,
  seed = null,
  onSeedChange,
  randomSeed = true,
  onRandomSeedChange
}) {
  const [expanded, setExpanded] = useState(false);

  const qualityPreset = QUALITY_PRESETS.find(
    p => p.steps === steps && p.cfg === cfgScale
  );

  const handlePresetSelect = (preset) => {
    onStepsChange(preset.steps);
    onCfgScaleChange(preset.cfg);
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-750 transition-colors"
      >
        <span className="text-sm font-semibold">⚙️ Advanced Settings</span>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {expanded && (
        <div className="p-3 border-t border-gray-700 space-y-4">
          {/* Quality Presets */}
          <div>
            <label className="text-xs font-semibold text-gray-400 mb-2 block">
              <Tooltip content="Preset combinations of steps and CFG scale">
                Quality Preset
              </Tooltip>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {QUALITY_PRESETS.map(preset => (
                <button
                  key={preset.value}
                  onClick={() => handlePresetSelect(preset)}
                  className={`p-2 rounded text-xs border transition-all ${
                    qualityPreset?.value === preset.value
                      ? 'bg-purple-600/30 border-purple-600/50 text-purple-300'
                      : 'bg-gray-700/30 border-gray-700/50 hover:border-purple-600/30'
                  }`}
                >
                  <div className="font-medium">{preset.label}</div>
                  <div className="text-xs text-gray-500">{preset.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Steps */}
          <div>
            <label className="text-xs font-semibold text-gray-400 mb-2 block flex items-center gap-1">
              <Tooltip content="Number of denoising steps. More = better quality but slower">
                📊 Steps: {steps}
              </Tooltip>
            </label>
            <input
              type="range"
              min="10"
              max="150"
              step="5"
              value={steps}
              onChange={(e) => onStepsChange(Number(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Fast (10)</span>
              <span>Balanced (30)</span>
              <span>Quality (150)</span>
            </div>
          </div>

          {/* CFG Scale */}
          <div>
            <label className="text-xs font-semibold text-gray-400 mb-2 block flex items-center gap-1">
              <Tooltip content="Classifier-Free Guidance. Higher = follow prompt more strictly">
                🎯 CFG Scale: {cfgScale.toFixed(1)}
              </Tooltip>
            </label>
            <input
              type="range"
              min="1"
              max="20"
              step="0.5"
              value={cfgScale}
              onChange={(e) => onCfgScaleChange(Number(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Flexible (1)</span>
              <span>Balanced (7.5)</span>
              <span>Strict (20)</span>
            </div>
          </div>

          {/* Sampling Method */}
          <div>
            <label className="text-xs font-semibold text-gray-400 mb-2 block">
              <Tooltip content="Algorithm used for image generation">
                🔄 Sampling Method
              </Tooltip>
            </label>
            <div className="grid grid-cols-2 gap-1">
              {SAMPLING_METHODS.map(method => (
                <button
                  key={method.value}
                  onClick={() => onSamplingMethodChange(method.value)}
                  className={`p-2 rounded text-xs border transition-all ${
                    samplingMethod === method.value
                      ? 'bg-blue-600/30 border-blue-600/50 text-blue-300'
                      : 'bg-gray-700/30 border-gray-700/50 hover:border-blue-600/30'
                  }`}
                >
                  <div className="font-medium">{method.label}</div>
                  <div className="text-xs text-gray-500">{method.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Seed */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-400 flex items-center gap-1">
                <Tooltip content="Seed for reproducible results. Leave random for variation">
                  🌱 Seed
                </Tooltip>
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-400">
                <input
                  type="checkbox"
                  checked={randomSeed}
                  onChange={(e) => onRandomSeedChange(e.target.checked)}
                  className="rounded"
                />
                <span>Random</span>
              </label>
            </div>
            {!randomSeed && (
              <input
                type="number"
                value={seed || ''}
                onChange={(e) => onSeedChange(e.target.value ? Number(e.target.value) : null)}
                placeholder="Leave blank for random seed"
                className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
            )}
          </div>

          {/* Summary */}
          <div className="bg-gray-900/50 rounded p-2 text-xs text-gray-400 space-y-1">
            <div>Est. Generation Time: <span className="text-gray-300">{Math.ceil(steps * 0.1)}-{Math.ceil(steps * 0.15)}s</span></div>
            <div>Quality Level: <span className="text-purple-400">{qualityPreset?.label || 'Custom'}</span></div>
          </div>
        </div>
      )}
    </div>
  );
}
