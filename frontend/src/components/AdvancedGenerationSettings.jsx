/**
 * Advanced Generation Settings Component
 * Quality controls, CFG scale, sampling methods
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
      <div className="absolute bottom-full left-0 mb-2 app-layer-overlay hidden group-hover:flex w-56">
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
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  // Create quality presets with translated labels
  const qualityPresets = [
    { value: 'draft', labelKey: 'imageGeneration.draft', descKey: 'imageGeneration.draftDesc', steps: 20, cfg: 7 },
    { value: 'normal', labelKey: 'imageGeneration.normal', descKey: 'imageGeneration.normalDesc', steps: 30, cfg: 7.5 },
    { value: 'high', labelKey: 'imageGeneration.high', descKey: 'imageGeneration.highDesc', steps: 50, cfg: 8 },
    { value: 'ultra', labelKey: 'imageGeneration.ultra', descKey: 'imageGeneration.ultraDesc', steps: 75, cfg: 8.5 },
  ];

  // Create sampling methods with translated labels
  const samplingMethods = [
    { value: 'euler', labelKey: 'imageGeneration.euler', descKey: 'imageGeneration.eulerDesc' },
    { value: 'euler_ancestral', labelKey: 'imageGeneration.eulerAncestral', descKey: 'imageGeneration.eulerAncestralDesc' },
    { value: 'heun', labelKey: 'imageGeneration.heun', descKey: 'imageGeneration.heunDesc' },
    { value: 'dpm++', labelKey: 'imageGeneration.dpmpp', descKey: 'imageGeneration.dpmppDesc' },
    { value: 'lms', labelKey: 'imageGeneration.lms', descKey: 'imageGeneration.lmsDesc' },
  ];

  const qualityPreset = qualityPresets.find(
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
        <span className="text-sm font-semibold">⚙️ {t('imageGeneration.advancedSettings')}</span>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {expanded && (
        <div className="p-3 border-t border-gray-700 space-y-4">
          {/* Quality Presets */}
          <div>
            <label className="text-xs font-semibold text-gray-400 mb-2 block">
              <Tooltip content={t('imageGeneration.qualityPresetTooltip')}>
                {t('imageGeneration.qualityPreset')}
              </Tooltip>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {qualityPresets.map(preset => (
                <button
                  key={preset.value}
                  onClick={() => handlePresetSelect(preset)}
                  className={`p-2 rounded text-xs border transition-all ${
                    qualityPreset?.value === preset.value
                      ? 'bg-purple-600/30 border-purple-600/50 text-purple-300'
                      : 'bg-gray-700/30 border-gray-700/50 hover:border-purple-600/30'
                  }`}
                >
                  <div className="font-medium">{t(preset.labelKey)}</div>
                  <div className="text-xs text-gray-500">{t(preset.descKey)}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Steps */}
          <div>
            <label className="text-xs font-semibold text-gray-400 mb-2 block flex items-center gap-1">
              <Tooltip content={t('imageGeneration.stepsTooltip')}>
                📊 {t('imageGeneration.steps')}: {steps}
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
              <span>{t('imageGeneration.fast')} (10)</span>
              <span>{t('imageGeneration.balanced')} (30)</span>
              <span>{t('imageGeneration.quality')} (150)</span>
            </div>
          </div>

          {/* CFG Scale */}
          <div>
            <label className="text-xs font-semibold text-gray-400 mb-2 block flex items-center gap-1">
              <Tooltip content={t('imageGeneration.cfgScaleTooltip')}>
                🎯 {t('imageGeneration.cfgScale')}: {cfgScale.toFixed(1)}
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
              <span>{t('imageGeneration.flexible')} (1)</span>
              <span>{t('imageGeneration.balanced')} (7.5)</span>
              <span>{t('imageGeneration.strict')} (20)</span>
            </div>
          </div>

          {/* Sampling Method */}
          <div>
            <label className="text-xs font-semibold text-gray-400 mb-2 block">
              <Tooltip content={t('imageGeneration.samplingMethodTooltip')}>
                🔄 {t('imageGeneration.samplingMethod')}
              </Tooltip>
            </label>
            <div className="grid grid-cols-2 gap-1">
              {samplingMethods.map(method => (
                <button
                  key={method.value}
                  onClick={() => onSamplingMethodChange(method.value)}
                  className={`p-2 rounded text-xs border transition-all ${
                    samplingMethod === method.value
                      ? 'bg-blue-600/30 border-blue-600/50 text-blue-300'
                      : 'bg-gray-700/30 border-gray-700/50 hover:border-blue-600/30'
                  }`}
                >
                  <div className="font-medium">{t(method.labelKey)}</div>
                  <div className="text-xs text-gray-500">{t(method.descKey)}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Seed */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-400 flex items-center gap-1">
                <Tooltip content={t('imageGeneration.seedTooltip')}>
                  🌱 {t('imageGeneration.seed')}
                </Tooltip>
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-400">
                <input
                  type="checkbox"
                  checked={randomSeed}
                  onChange={(e) => onRandomSeedChange(e.target.checked)}
                  className="rounded"
                />
                <span>{t('imageGeneration.randomSeed')}</span>
              </label>
            </div>
            {!randomSeed && (
              <input
                type="number"
                value={seed || ''}
                onChange={(e) => onSeedChange(e.target.value ? Number(e.target.value) : null)}
                placeholder={t('imageGeneration.enterSeed')}
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


