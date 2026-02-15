/**
 * Style Options Component
 * Display and manage generation options
 */

import React from 'react';
import { Settings, Sliders } from 'lucide-react';

export default function StyleOptions({ options, onChange, availableOptions }) {
  const optionCategories = {
    quality: {
      label: 'Quality',
      icon: '✨',
      options: ['standard', 'high', 'ultra'],
    },
    style: {
      label: 'Style',
      icon: '🎨',
      options: ['professional', 'dramatic', 'minimalist', 'natural', 'vintage'],
    },
    lighting: {
      label: 'Lighting',
      icon: '💡',
      options: ['studio', 'natural', 'soft', 'dramatic', 'golden-hour'],
    },
    background: {
      label: 'Background',
      icon: '🖼️',
      options: ['white', 'gradient', 'lifestyle', 'studio', 'transparent'],
    },
    cameraAngle: {
      label: 'Camera Angle',
      icon: '📷',
      options: ['eye-level', 'slightly-above', 'birds-eye', 'low-angle'],
    },
    composition: {
      label: 'Composition',
      icon: '📐',
      options: ['centered', 'rule-of-thirds', 'environmental', 'close-up'],
    },
  };

  const booleanOptions = [
    { key: 'enhanceColors', label: 'Enhance Colors', icon: '🌈' },
    { key: 'enhanceDetails', label: 'Enhance Details', icon: '🔍' },
    { key: 'addShadows', label: 'Add Shadows', icon: '🌓' },
    { key: 'removeBackground', label: 'Remove Background', icon: '✂️' },
  ];

  function handleSelectChange(key, value) {
    onChange(key, value);
  }

  function handleCheckboxChange(key, checked) {
    onChange(key, checked);
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <Sliders className="w-5 h-5 text-purple-500" />
        Style Options
      </h2>

      <div className="space-y-4">
        {/* Select Options */}
        {Object.entries(optionCategories).map(([key, config]) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <span className="mr-2">{config.icon}</span>
              {config.label}
            </label>
            <select
              value={options[key] || ''}
              onChange={(e) => handleSelectChange(key, e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            >
              {config.options.map((option) => (
                <option key={option} value={option}>
                  {option.split('-').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                  ).join(' ')}
                </option>
              ))}
            </select>
          </div>
        ))}

        {/* Boolean Options */}
        <div className="pt-4 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Enhancements</h3>
          <div className="space-y-3">
            {booleanOptions.map((option) => (
              <label
                key={option.key}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={options[option.key] || false}
                  onChange={(e) => handleCheckboxChange(option.key, e.target.checked)}
                  className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500 transition-all"
                />
                <span className="text-sm font-medium text-gray-700 group-hover:text-purple-600 transition-colors">
                  <span className="mr-2">{option.icon}</span>
                  {option.label}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
