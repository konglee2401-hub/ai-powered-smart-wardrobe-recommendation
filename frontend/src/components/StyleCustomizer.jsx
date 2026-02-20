/**
 * Style Customizer Component - Enhanced with AI Recommendations
 * Display and manage generation options with AI suggestions
 */

import React, { useEffect, useState } from 'react';
import { Sliders, Sparkles, Check, ChevronDown, ChevronUp, Plus, Loader2 } from 'lucide-react';
import { aiOptionsAPI } from '../services/api';

// Category configurations with icons and descriptions
const CATEGORY_CONFIG = {
  // Core Photography Categories
  scene: {
    label: 'Scene',
    icon: '🎬',
    description: 'Môi trường chụp ảnh',
    options: [
      { value: 'studio', label: 'Professional Studio', icon: '📷' },
      { value: 'white-background', label: 'White Background', icon: '⬜' },
      { value: 'urban-street', label: 'Urban Street', icon: '🏙️' },
      { value: 'minimalist-indoor', label: 'Minimalist Indoor', icon: '🏠' },
      { value: 'cafe', label: 'Cafe', icon: '☕' },
      { value: 'outdoor-park', label: 'Outdoor Park', icon: '🌳' },
      { value: 'office', label: 'Modern Office', icon: '💼' },
      { value: 'luxury-interior', label: 'Luxury Interior', icon: '✨' },
      { value: 'rooftop', label: 'Rooftop', icon: '🏙️' },
    ],
  },
  lighting: {
    label: 'Lighting',
    icon: '💡',
    description: 'Ánh sáng và hiệu ứng',
    options: [
      { value: 'soft-diffused', label: 'Soft Diffused', icon: '🌤️' },
      { value: 'natural-window', label: 'Natural Window', icon: '🪟' },
      { value: 'golden-hour', label: 'Golden Hour', icon: '🌅' },
      { value: 'dramatic-rembrandt', label: 'Dramatic Rembrandt', icon: '🎭' },
      { value: 'high-key', label: 'High Key (Bright)', icon: '🔆' },
      { value: 'backlit', label: 'Backlit', icon: '✨' },
      { value: 'neon-colored', label: 'Neon/Colored', icon: '🎨' },
      { value: 'overcast-outdoor', label: 'Overcast Outdoor', icon: '☁️' },
    ],
  },
  mood: {
    label: 'Mood',
    icon: '😊',
    description: 'Tâm trạng và cảm xúc',
    options: [
      { value: 'confident', label: 'Confident & Powerful', icon: '💪' },
      { value: 'relaxed', label: 'Relaxed & Casual', icon: '😌' },
      { value: 'elegant', label: 'Elegant & Sophisticated', icon: '👑' },
      { value: 'energetic', label: 'Energetic & Dynamic', icon: '⚡' },
      { value: 'playful', label: 'Playful & Fun', icon: '🎉' },
      { value: 'mysterious', label: 'Mysterious & Edgy', icon: '🕵️' },
      { value: 'romantic', label: 'Romantic & Dreamy', icon: '💕' },
      { value: 'professional', label: 'Professional', icon: '👔' },
    ],
  },
  style: {
    label: 'Photography Style',
    icon: '📸',
    description: 'Phong cách nhiếp ảnh',
    options: [
      { value: 'minimalist', label: 'Minimalist', icon: '🔳' },
      { value: 'editorial', label: 'Editorial', icon: '📖' },
      { value: 'commercial', label: 'Commercial', icon: '🛒' },
      { value: 'lifestyle', label: 'Lifestyle', icon: '🏞️' },
      { value: 'high-fashion', label: 'High Fashion', icon: '👠' },
      { value: 'vintage', label: 'Vintage/Retro', icon: '🕰️' },
      { value: 'street', label: 'Street Style', icon: '🛹' },
      { value: 'bohemian', label: 'Bohemian', icon: '🌻' },
    ],
  },
  colorPalette: {
    label: 'Color Palette',
    icon: '🎨',
    description: 'Bảng màu tổng thể',
    options: [
      { value: 'neutral', label: 'Neutral', icon: '⚪' },
      { value: 'warm', label: 'Warm Tones', icon: '🔥' },
      { value: 'cool', label: 'Cool Tones', icon: '❄️' },
      { value: 'pastel', label: 'Pastel', icon: '🌸' },
      { value: 'monochrome', label: 'Monochrome', icon: '⚫' },
      { value: 'vibrant', label: 'Vibrant', icon: '🌈' },
      { value: 'earth-tones', label: 'Earth Tones', icon: '🌍' },
      { value: 'metallic', label: 'Metallic', icon: '🪙' },
    ],
  },
  cameraAngle: {
    label: 'Camera Angle',
    icon: '📐',
    description: 'Góc máy ảnh',
    options: [
      { value: 'eye-level', label: 'Eye Level', icon: '👀' },
      { value: 'slight-angle', label: 'Slight Angle', icon: '📐' },
      { value: 'three-quarter', label: 'Three-Quarter', icon: '🔄' },
      { value: 'full-front', label: 'Full Front', icon: '🧍' },
      { value: 'over-shoulder', label: 'Over Shoulder', icon: '👥' },
    ],
  },
  
  // NEW: Fashion & Styling Categories
  hairstyle: {
    label: 'Hairstyle',
    icon: '💇',
    description: 'Kiểu tóc',
    options: [
      { value: 'long-straight', label: 'Long Straight', icon: '📏' },
      { value: 'long-wavy', label: 'Long Wavy', icon: '〰️' },
      { value: 'long-curly', label: 'Long Curly', icon: '🌀' },
      { value: 'medium-straight', label: 'Medium Straight', icon: '📏' },
      { value: 'medium-wavy', label: 'Medium Wavy', icon: '〰️' },
      { value: 'short-bob', label: 'Short Bob', icon: '✂️' },
      { value: 'short-pixie', label: 'Short Pixie', icon: '✨' },
      { value: 'braided', label: 'Braided', icon: '📿' },
      { value: 'bun', label: 'Bun Updo', icon: '🧦' },
    ],
  },
  makeup: {
    label: 'Makeup Look',
    icon: '💄',
    description: 'Kiểu trang điểm',
    options: [
      { value: 'natural', label: 'Natural/No-Makeup', icon: '✨' },
      { value: 'light', label: 'Light & Fresh', icon: '🌙' },
      { value: 'glowing', label: 'Glowing', icon: '💫' },
      { value: 'bold-lips', label: 'Bold Lips', icon: '💋' },
      { value: 'smokey-eyes', label: 'Smokey Eyes', icon: '👁️' },
      { value: 'winged-liner', label: 'Winged Eyeliner', icon: '🎨' },
      { value: 'glamorous', label: 'Glamorous', icon: '👑' },
    ],
  },
  bottoms: {
    label: 'Bottoms',
    icon: '👖',
    description: 'Quần/ Váy',
    options: [
      { value: 'jeans', label: 'Jeans', icon: '👖' },
      { value: 'trousers', label: 'Trousers', icon: '👔' },
      { value: 'shorts', label: 'Shorts', icon: '🩳' },
      { value: 'skirt', label: 'Skirt', icon: '👗' },
      { value: 'leggings', label: 'Leggings', icon: '🧘' },
      { value: 'cargo-pants', label: 'Cargo Pants', icon: '🎒' },
    ],
  },
  shoes: {
    label: 'Shoes',
    icon: '👟',
    description: 'Giày/ Dép',
    options: [
      { value: 'sneakers', label: 'Sneakers', icon: '👟' },
      { value: 'heels', label: 'Heels', icon: '👠' },
      { value: 'boots', label: 'Boots', icon: '👢' },
      { value: 'flats', label: 'Flats', icon: '🥿' },
      { value: 'sandals', label: 'Sandals', icon: '🩴' },
      { value: 'loafers', label: 'Loafers', icon: '👞' },
    ],
  },
  accessories: {
    label: 'Accessories',
    icon: '💎',
    description: 'Phụ kiện',
    options: [
      { value: 'necklace', label: 'Necklace', icon: '📿' },
      { value: 'earrings', label: 'Earrings', icon: '💫' },
      { value: 'watch', label: 'Watch', icon: '⌚' },
      { value: 'bag', label: 'Bag', icon: '👜' },
      { value: 'sunglasses', label: 'Sunglasses', icon: '🕶️' },
      { value: 'scarf', label: 'Scarf', icon: '🧣' },
      { value: 'belt', label: 'Belt', icon: '👔' },
      { value: 'hat', label: 'Hat', icon: '🎩' },
    ],
  },
  outerwear: {
    label: 'Outerwear',
    icon: '🧥',
    description: 'Áo khoác',
    options: [
      { value: 'jacket', label: 'Jacket', icon: '🧥' },
      { value: 'coat', label: 'Coat', icon: '🧥' },
      { value: 'blazer', label: 'Blazer', icon: '👔' },
      { value: 'cardigan', label: 'Cardigan', icon: '🧶' },
      { value: 'hoodie', label: 'Hoodie', icon: '👕' },
      { value: 'vest', label: 'Vest', icon: '🎽' },
    ],
  },
};

export default function StyleCustomizer({
  options,
  selectedOptions,
  onOptionChange,
  customOptions,
  onCustomOptionChange,
  recommendations,
  newOptions,
  analysis
}) {
  const [expandedCategories, setExpandedCategories] = useState(
    Object.keys(CATEGORY_CONFIG).reduce((acc, key) => ({ ...acc, [key]: true }), {})
  );
  const [savingOptions, setSavingOptions] = useState({});
  const [savedNewOptions, setSavedNewOptions] = useState([]);

  // Apply AI recommendations as defaults when they change
  useEffect(() => {
    if (recommendations && Object.keys(selectedOptions).length === 0) {
      Object.entries(recommendations).forEach(([category, rec]) => {
        if (rec.primary) {
          onOptionChange(category, rec.primary);
        }
      });
    }
  }, [recommendations]);

  // Handle saving a new AI-suggested option to the database
  const handleSaveNewOption = async (newOption) => {
    if (savedNewOptions.includes(newOption.value)) return;
    
    setSavingOptions(prev => ({ ...prev, [newOption.value]: true }));
    try {
      await aiOptionsAPI.createOption(
        newOption.category,
        newOption.value,
        newOption.label,
        newOption.description,
        { reason: newOption.reason }
      );
      setSavedNewOptions(prev => [...prev, newOption.value]);
      console.log(`✅ New option saved: ${newOption.category}/${newOption.value}`);
    } catch (error) {
      console.error('❌ Failed to save new option:', error);
    } finally {
      setSavingOptions(prev => ({ ...prev, [newOption.value]: false }));
    }
  };

  const toggleCategory = (category) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const isAISuggested = (category, value) => {
    return recommendations?.[category]?.primary === value;
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
                {recommendations?.[categoryKey] && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-purple-100 rounded-full">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-700">
                      AI: {config.options.find(o => o.value === recommendations[categoryKey].primary)?.label}
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
              <div className="px-6 pb-6 space-y-4">
                {/* AI Recommendation Details */}
                {recommendations?.[categoryKey] && (
                  <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
                    <div className="flex gap-2 items-start">
                      <Sparkles className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-blue-900 mb-1">
                          AI Đề Xuất: {CATEGORY_CONFIG[categoryKey].options.find(o => o.value === recommendations[categoryKey].primary)?.label}
                        </p>
                        <p className="text-sm text-blue-800 leading-relaxed">
                          {recommendations[categoryKey].reason}
                        </p>
                        {recommendations[categoryKey].alternatives && recommendations[categoryKey].alternatives.length > 0 && (
                          <p className="text-xs text-blue-700 mt-2">
                            <strong>Các tùy chọn khác:</strong> {recommendations[categoryKey].alternatives.join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Options */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {config.options.map((option) => {
                    const isSelected = selectedOptions[categoryKey] === option.value;
                    const isRecommended = recommendations?.[categoryKey]?.primary === option.value;

                    return (
                      <div key={option.value} className="relative">
                        <button
                          onClick={() => onOptionChange(categoryKey, option.value)}
                          className={`
                            w-full h-full text-left p-3 rounded-lg border-2 transition-all
                            ${isSelected ? 'bg-purple-600 border-purple-600 text-white' : 'bg-white hover:border-purple-300'}
                            ${isRecommended && !isSelected ? 'border-green-400 ring-2 ring-green-200' : 'border-gray-200'}
                          `}
                        >
                          <div className="font-semibold">{option.label}</div>
                          <div className={`text-xs ${isSelected ? 'text-purple-200' : 'text-gray-500'}`}>{option.description}</div>
                        </button>
                        {isRecommended && !isSelected && (
                          <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-green-100 text-green-700 text-[9px] rounded-full font-bold flex items-center gap-1">
                            <Sparkles size={10} />
                            AI Rec
                          </div>
                        )}
                      </div>
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
                      onCustomOptionChange(categoryKey, e.target.value)
                    }
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* New AI-Suggested Options */}
      {newOptions && newOptions.length > 0 && (
        <div className="mt-6 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl shadow-sm border border-amber-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-amber-600" />
            <h3 className="text-lg font-semibold text-amber-900">✨ AI Đề Xuất Thêm Tùy Chọn Mới</h3>
          </div>
          
          <p className="text-sm text-amber-800 mb-4">
            AI nhận thấy những tùy chọn mới có thể phù hợp hơn với hình ảnh của bạn. Nhấp "Lưu" để thêm vào hệ thống.
          </p>

          <div className="space-y-3">
            {newOptions.map((newOption, idx) => {
              const isSaved = savedNewOptions.includes(newOption.value);
              const isSaving = savingOptions[newOption.value];
              const categoryConfig = CATEGORY_CONFIG[newOption.category];

              return (
                <div
                  key={idx}
                  className="bg-white rounded-lg p-4 border border-amber-100 hover:border-amber-300 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-amber-600">
                          {categoryConfig?.label || newOption.category}
                        </span>
                        <span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded">
                          NEW
                        </span>
                      </div>
                      <h4 className="font-semibold text-gray-800 mb-1">{newOption.label}</h4>
                      <p className="text-sm text-gray-600 mb-2">{newOption.description}</p>
                      {newOption.reason && (
                        <p className="text-xs text-gray-500 italic">
                          💡 {newOption.reason}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => handleSaveNewOption(newOption)}
                      disabled={isSaved || isSaving}
                      className={`
                        flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all
                        ${isSaved 
                          ? 'bg-green-100 text-green-700 cursor-default' 
                          : isSaving
                          ? 'bg-blue-100 text-blue-700 cursor-wait'
                          : 'bg-amber-500 text-white hover:bg-amber-600 active:scale-95'
                        }
                      `}
                    >
                      {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                      {isSaved && <Check className="w-4 h-4" />}
                      {!isSaving && !isSaved && <Plus className="w-4 h-4" />}
                      {isSaved ? 'Đã Lưu' : isSaving ? 'Đang Lưu...' : 'Lưu Tùy Chọn'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
