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
    icon: 'ðŸŽ¬',
    description: 'MÃ´i trÆ°á»ng chá»¥p áº£nh',
    options: [
      { value: 'studio', label: 'Professional Studio', icon: 'ðŸ“·' },
      { value: 'white-background', label: 'White Background', icon: 'â¬œ' },
      { value: 'urban-street', label: 'Urban Street', icon: 'ðŸ™ï¸' },
      { value: 'minimalist-indoor', label: 'Minimalist Indoor', icon: 'ðŸ ' },
      { value: 'cafe', label: 'Cafe', icon: 'â˜•' },
      { value: 'outdoor-park', label: 'Outdoor Park', icon: 'ðŸŒ³' },
      { value: 'office', label: 'Modern Office', icon: 'ðŸ’¼' },
      { value: 'luxury-interior', label: 'Luxury Interior', icon: 'âœ¨' },
      { value: 'rooftop', label: 'Rooftop', icon: 'ðŸ™ï¸' },
    ],
  },
  lighting: {
    label: 'Lighting',
    icon: 'ðŸ’¡',
    description: 'Ãnh sÃ¡ng vÃ  hiá»‡u á»©ng',
    options: [
      { value: 'soft-diffused', label: 'Soft Diffused', icon: 'ðŸŒ¤ï¸' },
      { value: 'natural-window', label: 'Natural Window', icon: 'ðŸªŸ' },
      { value: 'golden-hour', label: 'Golden Hour', icon: 'ðŸŒ…' },
      { value: 'dramatic-rembrandt', label: 'Dramatic Rembrandt', icon: 'ðŸŽ­' },
      { value: 'high-key', label: 'High Key (Bright)', icon: 'ðŸ”†' },
      { value: 'backlit', label: 'Backlit', icon: 'âœ¨' },
      { value: 'neon-colored', label: 'Neon/Colored', icon: 'ðŸŽ¨' },
      { value: 'overcast-outdoor', label: 'Overcast Outdoor', icon: 'â˜ï¸' },
    ],
  },
  mood: {
    label: 'Mood',
    icon: 'ðŸ˜Š',
    description: 'TÃ¢m tráº¡ng vÃ  cáº£m xÃºc',
    options: [
      { value: 'confident', label: 'Confident & Powerful', icon: 'ðŸ’ª' },
      { value: 'relaxed', label: 'Relaxed & Casual', icon: 'ðŸ˜Œ' },
      { value: 'elegant', label: 'Elegant & Sophisticated', icon: 'ðŸ‘‘' },
      { value: 'energetic', label: 'Energetic & Dynamic', icon: 'âš¡' },
      { value: 'playful', label: 'Playful & Fun', icon: 'ðŸŽ‰' },
      { value: 'mysterious', label: 'Mysterious & Edgy', icon: 'ðŸ•µï¸' },
      { value: 'romantic', label: 'Romantic & Dreamy', icon: 'ðŸ’•' },
      { value: 'professional', label: 'Professional', icon: 'ðŸ‘”' },
    ],
  },
  style: {
    label: 'Photography Style',
    icon: 'ðŸ“¸',
    description: 'Phong cÃ¡ch nhiáº¿p áº£nh',
    options: [
      { value: 'minimalist', label: 'Minimalist', icon: 'ðŸ”³' },
      { value: 'editorial', label: 'Editorial', icon: 'ðŸ“–' },
      { value: 'commercial', label: 'Commercial', icon: 'ðŸ›’' },
      { value: 'lifestyle', label: 'Lifestyle', icon: 'ðŸžï¸' },
      { value: 'high-fashion', label: 'High Fashion', icon: 'ðŸ‘ ' },
      { value: 'vintage', label: 'Vintage/Retro', icon: 'ðŸ•°ï¸' },
      { value: 'street', label: 'Street Style', icon: 'ðŸ›¹' },
      { value: 'bohemian', label: 'Bohemian', icon: 'ðŸŒ»' },
    ],
  },
  colorPalette: {
    label: 'Color Palette',
    icon: 'ðŸŽ¨',
    description: 'Báº£ng mÃ u tá»•ng thá»ƒ',
    options: [
      { value: 'neutral', label: 'Neutral', icon: 'âšª' },
      { value: 'warm', label: 'Warm Tones', icon: 'ðŸ”¥' },
      { value: 'cool', label: 'Cool Tones', icon: 'â„ï¸' },
      { value: 'pastel', label: 'Pastel', icon: 'ðŸŒ¸' },
      { value: 'monochrome', label: 'Monochrome', icon: 'âš«' },
      { value: 'vibrant', label: 'Vibrant', icon: 'ðŸŒˆ' },
      { value: 'earth-tones', label: 'Earth Tones', icon: 'ðŸŒ' },
      { value: 'metallic', label: 'Metallic', icon: 'ðŸª™' },
    ],
  },
  cameraAngle: {
    label: 'Camera Angle',
    icon: 'ðŸ“',
    description: 'GÃ³c mÃ¡y áº£nh',
    options: [
      { value: 'eye-level', label: 'Eye Level', icon: 'ðŸ‘€' },
      { value: 'slight-angle', label: 'Slight Angle', icon: 'ðŸ“' },
      { value: 'three-quarter', label: 'Three-Quarter', icon: 'ðŸ”„' },
      { value: 'full-front', label: 'Full Front', icon: 'ðŸ§' },
      { value: 'over-shoulder', label: 'Over Shoulder', icon: 'ðŸ‘¥' },
    ],
  },
  
  // NEW: Fashion & Styling Categories
  hairstyle: {
    label: 'Hairstyle',
    icon: 'ðŸ’‡',
    description: 'Kiá»ƒu tÃ³c',
    options: [
      { value: 'long-straight', label: 'Long Straight', icon: 'ðŸ“' },
      { value: 'long-wavy', label: 'Long Wavy', icon: 'ã€°ï¸' },
      { value: 'long-curly', label: 'Long Curly', icon: 'ðŸŒ€' },
      { value: 'medium-straight', label: 'Medium Straight', icon: 'ðŸ“' },
      { value: 'medium-wavy', label: 'Medium Wavy', icon: 'ã€°ï¸' },
      { value: 'short-bob', label: 'Short Bob', icon: 'âœ‚ï¸' },
      { value: 'short-pixie', label: 'Short Pixie', icon: 'âœ¨' },
      { value: 'braided', label: 'Braided', icon: 'ðŸ“¿' },
      { value: 'bun', label: 'Bun Updo', icon: 'ðŸ§¦' },
    ],
  },
  makeup: {
    label: 'Makeup Look',
    icon: 'ðŸ’„',
    description: 'Kiá»ƒu trang Ä‘iá»ƒm',
    options: [
      { value: 'natural', label: 'Natural/No-Makeup', icon: 'âœ¨' },
      { value: 'light', label: 'Light & Fresh', icon: 'ðŸŒ™' },
      { value: 'glowing', label: 'Glowing', icon: 'ðŸ’«' },
      { value: 'bold-lips', label: 'Bold Lips', icon: 'ðŸ’‹' },
      { value: 'smokey-eyes', label: 'Smokey Eyes', icon: 'ðŸ‘ï¸' },
      { value: 'winged-liner', label: 'Winged Eyeliner', icon: 'ðŸŽ¨' },
      { value: 'glamorous', label: 'Glamorous', icon: 'ðŸ‘‘' },
    ],
  },
  bottoms: {
    label: 'Bottoms',
    icon: 'ðŸ‘–',
    description: 'Quáº§n/ VÃ¡y',
    options: [
      { value: 'jeans', label: 'Jeans', icon: 'ðŸ‘–' },
      { value: 'trousers', label: 'Trousers', icon: 'ðŸ‘”' },
      { value: 'shorts', label: 'Shorts', icon: 'ðŸ©³' },
      { value: 'skirt', label: 'Skirt', icon: 'ðŸ‘—' },
      { value: 'leggings', label: 'Leggings', icon: 'ðŸ§˜' },
      { value: 'cargo-pants', label: 'Cargo Pants', icon: 'ðŸŽ’' },
    ],
  },
  shoes: {
    label: 'Shoes',
    icon: 'ðŸ‘Ÿ',
    description: 'GiÃ y/ DÃ©p',
    options: [
      { value: 'sneakers', label: 'Sneakers', icon: 'ðŸ‘Ÿ' },
      { value: 'heels', label: 'Heels', icon: 'ðŸ‘ ' },
      { value: 'boots', label: 'Boots', icon: 'ðŸ‘¢' },
      { value: 'flats', label: 'Flats', icon: 'ðŸ¥¿' },
      { value: 'sandals', label: 'Sandals', icon: 'ðŸ©´' },
      { value: 'loafers', label: 'Loafers', icon: 'ðŸ‘ž' },
    ],
  },
  accessories: {
    label: 'Accessories',
    icon: 'ðŸ’Ž',
    description: 'Phá»¥ kiá»‡n',
    options: [
      { value: 'necklace', label: 'Necklace', icon: 'ðŸ“¿' },
      { value: 'earrings', label: 'Earrings', icon: 'ðŸ’«' },
      { value: 'watch', label: 'Watch', icon: 'âŒš' },
      { value: 'bag', label: 'Bag', icon: 'ðŸ‘œ' },
      { value: 'sunglasses', label: 'Sunglasses', icon: 'ðŸ•¶ï¸' },
      { value: 'scarf', label: 'Scarf', icon: 'ðŸ§£' },
      { value: 'belt', label: 'Belt', icon: 'ðŸ‘”' },
      { value: 'hat', label: 'Hat', icon: 'ðŸŽ©' },
    ],
  },
  outerwear: {
    label: 'Outerwear',
    icon: 'ðŸ§¥',
    description: 'Ão khoÃ¡c',
    options: [
      { value: 'jacket', label: 'Jacket', icon: 'ðŸ§¥' },
      { value: 'coat', label: 'Coat', icon: 'ðŸ§¥' },
      { value: 'blazer', label: 'Blazer', icon: 'ðŸ‘”' },
      { value: 'cardigan', label: 'Cardigan', icon: 'ðŸ§¶' },
      { value: 'hoodie', label: 'Hoodie', icon: 'ðŸ‘•' },
      { value: 'vest', label: 'Vest', icon: 'ðŸŽ½' },
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
      console.log(`âœ… New option saved: ${newOption.category}/${newOption.value}`);
    } catch (error) {
      console.error('âŒ Failed to save new option:', error);
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
          TÃ¹y Chá»‰nh Phong CÃ¡ch
        </h2>
        <p className="text-purple-100 mt-1">
          AI Ä‘Ã£ phÃ¢n tÃ­ch vÃ  Ä‘á» xuáº¥t cÃ¡c tÃ¹y chá»n tá»‘i Æ°u. Báº¡n cÃ³ thá»ƒ thay Ä‘á»•i theo Ã½ muá»‘n.
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
                          AI Äá» Xuáº¥t: {CATEGORY_CONFIG[categoryKey].options.find(o => o.value === recommendations[categoryKey].primary)?.label}
                        </p>
                        <p className="text-sm text-blue-800 leading-relaxed">
                          {recommendations[categoryKey].reason}
                        </p>
                        {recommendations[categoryKey].alternatives && recommendations[categoryKey].alternatives.length > 0 && (
                          <p className="text-xs text-blue-700 mt-2">
                            <strong>CÃ¡c tÃ¹y chá»n khÃ¡c:</strong> {recommendations[categoryKey].alternatives.join(', ')}
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
            <h3 className="text-lg font-semibold text-amber-900">âœ¨ AI Äá» Xuáº¥t ThÃªm TÃ¹y Chá»n Má»›i</h3>
          </div>
          
          <p className="text-sm text-amber-800 mb-4">
            AI nháº­n tháº¥y nhá»¯ng tÃ¹y chá»n má»›i cÃ³ thá»ƒ phÃ¹ há»£p hÆ¡n vá»›i hÃ¬nh áº£nh cá»§a báº¡n. Nháº¥p "LÆ°u" Ä‘á»ƒ thÃªm vÃ o há»‡ thá»‘ng.
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
                          ðŸ’¡ {newOption.reason}
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
                      {isSaved ? 'ÄÃ£ LÆ°u' : isSaving ? 'Äang LÆ°u...' : 'LÆ°u TÃ¹y Chá»n'}
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
              <span className="text-lg">âš™ï¸</span>
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

