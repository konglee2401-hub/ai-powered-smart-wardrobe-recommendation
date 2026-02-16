/**
 * Style Customizer Component - Enhanced with AI Recommendations
 * Display and manage generation options with AI suggestions
 */

import React, { useEffect, useState } from 'react';
import { Sliders, Sparkles, Check, ChevronDown, ChevronUp } from 'lucide-react';

// Category configurations with icons and descriptions
const CATEGORY_CONFIG = {
  scene: {
    label: 'Scene',
    icon: '🎬',
    description: 'Môi trường chụp ảnh',
    options: [
      { value: 'studio', label: 'Studio (Clean White)', icon: '📷' },
      { value: 'urban-street', label: 'Urban Street', icon: '🏙️' },
      { value: 'indoor-living', label: 'Indoor Living Space', icon: '🏠' },
      { value: 'outdoor-natural', label: 'Outdoor Natural', icon: '🌳' },
      { value: 'cafe-restaurant', label: 'Cafe/Restaurant', icon: '☕' },
      { value: 'office-workspace', label: 'Office/Workspace', icon: '💼' },
      { value: 'beach', label: 'Beach', icon: '🏖️' },
      { value: 'luxury-interior', label: 'Luxury Interior', icon: '✨' },
      { value: 'white-background', label: 'Pure White Background', icon: '⬜' },
    ],
  },
  lighting: {
    label: 'Lighting',
    icon: '💡',
    description: 'Ánh sáng và hiệu ứng',
    options: [
      { value: 'natural-light', label: 'Natural Light', icon: '☀️' },
      { value: 'studio-softbox', label: 'Studio Softbox', icon: '💡' },
      { value: 'golden-hour', label: 'Golden Hour', icon: '🌅' },
      { value: 'dramatic-side', label: 'Dramatic Side Light', icon: '🎭' },
      { value: 'rim-light', label: 'Rim Light', icon: '✨' },
      { value: 'soft-diffused', label: 'Soft Diffused', icon: '🌤️' },
      { value: 'high-key', label: 'High Key (Bright)', icon: '🔆' },
      { value: 'low-key', label: 'Low Key (Dark)', icon: '🌙' },
    ],
  },
  mood: {
    label: 'Mood',
    icon: '😊',
    description: 'Tâm trạng và cảm xúc',
    options: [
      { value: 'confident', label: 'Confident', icon: '💪' },
      { value: 'playful', label: 'Playful', icon: '🎉' },
      { value: 'elegant', label: 'Elegant', icon: '👑' },
      { value: 'casual', label: 'Casual', icon: '😌' },
      { value: 'energetic', label: 'Energetic', icon: '⚡' },
      { value: 'romantic', label: 'Romantic', icon: '💕' },
      { value: 'professional', label: 'Professional', icon: '👔' },
      { value: 'edgy', label: 'Edgy', icon: '🔥' },
    ],
  },
  style: {
    label: 'Photography Style',
    icon: '📸',
    description: 'Phong cách nhiếp ảnh',
    options: [
      { value: 'minimalist', label: 'Minimalist', icon: '🔳' },
      { value: 'editorial-fashion', label: 'Editorial Fashion', icon: '📖' },
      { value: 'lifestyle', label: 'Lifestyle', icon: '🏞️' },
      { value: 'product-focus', label: 'Product Focus', icon: '📦' },
      { value: 'artistic', label: 'Artistic', icon: '🎨' },
      { value: 'commercial', label: 'Commercial', icon: '🛒' },
      { value: 'street-style', label: 'Street Style', icon: '🛹' },
      { value: 'glamour', label: 'Glamour', icon: '💎' },
    ],
  },
  colorPalette: {
    label: 'Color Palette',
    icon: '🎨',
    description: 'Bảng màu tổng thể',
    options: [
      { value: 'neutral-tones', label: 'Neutral Tones', icon: '⚪' },
      { value: 'vibrant', label: 'Vibrant', icon: '🌈' },
      { value: 'monochrome', label: 'Monochrome', icon: '⚫' },
      { value: 'complementary', label: 'Complementary', icon: '🔄' },
      { value: 'warm-tones', label: 'Warm Tones', icon: '🔥' },
      { value: 'cool-tones', label: 'Cool Tones', icon: '❄️' },
      { value: 'pastel', label: 'Pastel', icon: '🌸' },
      { value: 'earth-tones', label: 'Earth Tones', icon: '🌍' },
    ],
  },
  cameraAngle: {
    label: 'Camera Angle',
    icon: '📐',
    description: 'Góc máy ảnh',
    options: [
      { value: 'eye-level', label: 'Eye Level', icon: '👀' },
      { value: 'slightly-above', label: 'Slightly Above', icon: '⬆️' },
      { value: 'low-angle', label: 'Low Angle', icon: '⬇️' },
      { value: 'three-quarter', label: '3/4 View', icon: '🔄' },
      { value: 'full-body', label: 'Full Body', icon: '📏' },
      { value: 'portrait', label: 'Portrait Close-up', icon: '🤳' },
    ],
  },
};

export default function StyleCustomizer({
  aiRecommendations,
  selectedOptions,
  onOptionsChange,
  customOptions,
}) {
  const [expandedCategories, setExpandedCategories] = useState(
    Object.keys(CATEGORY_CONFIG).reduce((acc, key) => ({ ...acc, [key]: true }), {})
  );

  // Apply AI recommendations as defaults when they change
  useEffect(() => {
    if (aiRecommendations && Object.keys(selectedOptions).length === 0) {
      const defaults = {};
      Object.entries(aiRecommendations).forEach(([category, rec]) => {
        if (rec.primary) {
          defaults[category] = rec.primary;
        }
      });
      if (Object.keys(defaults).length > 0) {
        onOptionsChange(defaults);
      }
    }
  }, [aiRecommendations]);

  const toggleCategory = (category) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const handleOptionSelect = (category, value) => {
    onOptionsChange({
      ...selectedOptions,
      [category]: value,
    });
  };

  const isAISuggested = (category, value) => {
    return aiRecommendations?.[category]?.primary === value;
  };

  const isSelected = (category, value) => {
    return selectedOptions[category] === value;
  };

  return (
    <div className="style-customizer">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl p-6 text-white mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Sliders className="w-6 h-6" />
          Tùy Chỉnh Phong Cách
        </h2>
        <p className="text-purple-100 mt-1">
          AI đã phân tích và đề xuất các tùy chọn tối ưu. Bạn có thể thay đổi theo ý muốn.
        </p>
      </div>

      {/* Categories */}
      <div className="space-y-4">
        {Object.entries(CATEGORY_CONFIG).map(([categoryKey, config]) => (
          <div
            key={categoryKey}
            className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
          >
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(categoryKey)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{config.icon}</span>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-800">{config.label}</h3>
                  <p className="text-sm text-gray-500">{config.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* AI Suggestion Badge */}
                {aiRecommendations?.[categoryKey] && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-purple-100 rounded-full">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-700">
                      AI: {config.options.find(o => o.value === aiRecommendations[categoryKey].primary)?.label}
                    </span>
                  </div>
                )}

                {/* Expand/Collapse Icon */}
                {expandedCategories[categoryKey] ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </button>

            {/* Options Grid */}
            {expandedCategories[categoryKey] && (
              <div className="px-6 pb-6">
                {/* AI Reason */}
                {aiRecommendations?.[categoryKey]?.reason && (
                  <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-100">
                    <p className="text-sm text-purple-700">
                      <Sparkles className="w-4 h-4 inline mr-1" />
                      <strong>AI Reason:</strong> {aiRecommendations[categoryKey].reason}
                    </p>
                  </div>
                )}

                {/* Options */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {config.options.map((option) => {
                    const isSuggested = isAISuggested(categoryKey, option.value);
                    const selected = isSelected(categoryKey, option.value);

                    return (
                      <button
                        key={option.value}
                        onClick={() => handleOptionSelect(categoryKey, option.value)}
                        className={`
                          relative p-3 rounded-xl border-2 transition-all text-left
                          ${selected
                            ? 'border-purple-500 bg-purple-50 shadow-md'
                            : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                          }
                          ${isSuggested && !selected ? 'ring-2 ring-purple-300 ring-offset-1' : ''}
                        `}
                      >
                        {/* Selected indicator */}
                        {selected && (
                          <div className="absolute top-2 right-2">
                            <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          </div>
                        )}

                        {/* AI Suggested indicator */}
                        {isSuggested && !selected && (
                          <div className="absolute top-2 right-2">
                            <div className="w-5 h-5 bg-purple-200 rounded-full flex items-center justify-center">
                              <Sparkles className="w-3 h-3 text-purple-600" />
                            </div>
                          </div>
                        )}

                        {/* Icon */}
                        <div className="text-2xl mb-2">{option.icon}</div>

                        {/* Label */}
                        <div className={`font-medium text-sm ${selected ? 'text-purple-700' : 'text-gray-800'}`}>
                          {option.label}
                        </div>

                        {/* AI Badge */}
                        {isSuggested && (
                          <div className="mt-1">
                            <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">
                              AI Pick
                            </span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Option Input */}
                <div className="mt-4">
                  <input
                    type="text"
                    placeholder={`Custom ${config.label}...`}
                    value={customOptions?.[categoryKey] || ''}
                    onChange={(e) =>
                      handleOptionSelect(categoryKey, e.target.value)
                    }
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Advanced Options */}
      <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <details className="group">
          <summary className="px-6 py-4 cursor-pointer hover:bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚙️</span>
              <span className="font-semibold text-gray-800">Advanced Options</span>
            </div>
            <ChevronDown className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" />
          </summary>

          <div className="px-6 pb-6 space-y-4">
            {/* Custom Prompt */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Prompt Addition
              </label>
              <textarea
                placeholder="Add custom prompt text..."
                value={selectedOptions.customPrompt || ''}
                onChange={(e) => onOptionsChange({ ...selectedOptions, customPrompt: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                rows={3}
              />
            </div>

            {/* Negative Prompt */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Negative Prompt
              </label>
              <textarea
                placeholder="What to avoid..."
                value={selectedOptions.negativePrompt || ''}
                onChange={(e) => onOptionsChange({ ...selectedOptions, negativePrompt: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                rows={3}
              />
            </div>

            {/* Image Count & Aspect Ratio */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image Count
                </label>
                <select
                  value={selectedOptions.imageCount || 2}
                  onChange={(e) => onOptionsChange({ ...selectedOptions, imageCount: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value={1}>1 Image</option>
                  <option value={2}>2 Images</option>
                  <option value={3}>3 Images</option>
                  <option value={4}>4 Images</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Aspect Ratio
                </label>
                <select
                  value={selectedOptions.aspectRatio || '1:1'}
                  onChange={(e) => onOptionsChange({ ...selectedOptions, aspectRatio: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="1:1">Square (1:1)</option>
                  <option value="4:3">Landscape (4:3)</option>
                  <option value="3:4">Portrait (3:4)</option>
                  <option value="16:9">Wide (16:9)</option>
                  <option value="9:16">Vertical (9:16)</option>
                </select>
              </div>
            </div>
          </div>
        </details>
      </div>

      {/* Summary */}
      <div className="mt-6 p-4 bg-gray-50 rounded-xl">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Options Summary</h4>
        <div className="flex flex-wrap gap-2">
          {Object.entries(selectedOptions).map(([key, value]) => {
            if (['customPrompt', 'negativePrompt', 'imageCount', 'aspectRatio'].includes(key)) return null;
            const config = CATEGORY_CONFIG[key];
            const option = config?.options.find(o => o.value === value);
            if (!option) return null;

            return (
              <span
                key={key}
                className="inline-flex items-center gap-1 px-3 py-1 bg-white rounded-full text-sm border border-gray-200"
              >
                <span>{option.icon}</span>
                <span className="font-medium">{config.label}:</span>
                <span>{option.label}</span>
                {isAISuggested(key, value) && (
                  <Sparkles className="w-3 h-3 text-purple-500" />
                )}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Export category config for other components
export { CATEGORY_CONFIG };
