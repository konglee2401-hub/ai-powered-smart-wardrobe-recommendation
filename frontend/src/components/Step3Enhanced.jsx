/**
 * Step 3 Enhanced - Style Customization with Live Prompt
 * Layout:
 * - Left: Style options (2-3 columns)
 * - Middle: Prompt builder (positive + custom + negative)
 * - Right: Preview images + Reference images
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Sliders, Image, Plus, X, Wand2, Copy, Check, ChevronDown, ChevronUp,
  Loader2, AlertCircle, Zap, RotateCcw, Upload
} from 'lucide-react';
import { promptsAPI } from '../services/api';

// Style Categories Configuration
const STYLE_CATEGORIES = {
  scene: {
    label: 'Môi trường chụp',
    icon: '🎬',
    options: [
      { value: 'studio', label: 'Professional Studio' },
      { value: 'white-background', label: 'White Background' },
      { value: 'urban-street', label: 'Urban Street' },
      { value: 'minimalist-indoor', label: 'Minimalist Indoor' },
      { value: 'cafe', label: 'Cafe' },
      { value: 'outdoor-park', label: 'Outdoor Park' },
      { value: 'office', label: 'Modern Office' },
      { value: 'luxury-interior', label: 'Luxury Interior' },
      { value: 'rooftop', label: 'Rooftop' },
    ],
  },
  lighting: {
    label: 'Ánh sáng',
    icon: '💡',
    options: [
      { value: 'soft-diffused', label: 'Soft Diffused' },
      { value: 'natural-window', label: 'Natural Window' },
      { value: 'golden-hour', label: 'Golden Hour' },
      { value: 'dramatic-rembrandt', label: 'Dramatic Rembrandt' },
      { value: 'high-key', label: 'High Key' },
      { value: 'backlit', label: 'Backlit' },
      { value: 'neon-colored', label: 'Neon Colored' },
      { value: 'overcast-outdoor', label: 'Overcast Outdoor' },
    ],
  },
  mood: {
    label: 'Tâm trạng',
    icon: '😊',
    options: [
      { value: 'confident', label: 'Confident & Powerful' },
      { value: 'relaxed', label: 'Relaxed & Casual' },
      { value: 'elegant', label: 'Elegant & Sophisticated' },
      { value: 'energetic', label: 'Energetic & Dynamic' },
      { value: 'playful', label: 'Playful & Fun' },
      { value: 'mysterious', label: 'Mysterious & Edgy' },
      { value: 'romantic', label: 'Romantic & Dreamy' },
      { value: 'professional', label: 'Professional' },
    ],
  },
  style: {
    label: 'Phong cách nhiếp ảnh',
    icon: '📸',
    options: [
      { value: 'minimalist', label: 'Minimalist' },
      { value: 'editorial', label: 'Editorial' },
      { value: 'commercial', label: 'Commercial' },
      { value: 'lifestyle', label: 'Lifestyle' },
      { value: 'high-fashion', label: 'High Fashion' },
      { value: 'vintage', label: 'Vintage/Retro' },
      { value: 'street', label: 'Street Style' },
      { value: 'bohemian', label: 'Bohemian' },
    ],
  },
  colorPalette: {
    label: 'Bảng màu',
    icon: '🎨',
    options: [
      { value: 'neutral', label: 'Neutral' },
      { value: 'warm', label: 'Warm Tones' },
      { value: 'cool', label: 'Cool Tones' },
      { value: 'pastel', label: 'Pastel' },
      { value: 'monochrome', label: 'Monochrome' },
      { value: 'vibrant', label: 'Vibrant' },
      { value: 'earth-tones', label: 'Earth Tones' },
      { value: 'metallic', label: 'Metallic' },
    ],
  },
  cameraAngle: {
    label: 'Góc máy',
    icon: '📐',
    options: [
      { value: 'eye-level', label: 'Eye Level' },
      { value: 'slight-angle', label: 'Slight Angle' },
      { value: 'three-quarter', label: 'Three-Quarter' },
      { value: 'full-front', label: 'Full Front' },
      { value: 'over-shoulder', label: 'Over Shoulder' },
    ],
  },
  shotType: {
    label: 'Loại chụp',
    icon: '📷',
    options: [
      { value: 'headshot', label: 'Headshot (Chỉ mặt)' },
      { value: 'half-body', label: 'Half Body (Nửa trên người)' },
      { value: 'full-body', label: 'Full Body (Toàn thân)' },
      { value: 'back-shot', label: 'Back Shot (Chụp từ phía sau)' },
      { value: 'three-quarter-view', label: '3/4 View (3/4 người)' },
      { value: 'close-up-detail', label: 'Close-up Detail (Cận cảnh chi tiết)' },
      { value: 'sitting', label: 'Sitting (Ngồi)' },
      { value: 'walking', label: 'Walking (Đi bộ)' },
    ],
  },
  bodyPose: {
    label: 'Dáng đứng/Tư thế',
    icon: '🧍',
    options: [
      { value: 'neutral-standing', label: 'Neutral Standing (Đứng bình thường)' },
      { value: 'crossed-arms', label: 'Crossed Arms (Cũi tay)' },
      { value: 'hand-on-hip', label: 'Hand on Hip (Tay trên hông)' },
      { value: 'hands-in-pocket', label: 'Hands in Pockets (Tay túi)' },
      { value: 'dynamic-pose', label: 'Dynamic Pose (Dáng động)' },
      { value: 'leaning', label: 'Leaning (Dựa)' },
      { value: 'side-profile', label: 'Side Profile (Từ cạnh)' },
      { value: 'seated', label: 'Seated (Ngồi)' },
    ],
  },
  tops: {
    label: 'Áo/Trên người',
    icon: '👕',
    options: [
      { value: 'keep-current', label: 'Keep Current (Giữ áo hiện tại)' },
      { value: 'shirt', label: 'Shirt' },
      { value: 'tshirt', label: 'T-Shirt' },
      { value: 'blouse', label: 'Blouse' },
      { value: 'sweater', label: 'Sweater' },
      { value: 'hoodie', label: 'Hoodie' },
      { value: 'tank-top', label: 'Tank Top' },
      { value: 'crop-top', label: 'Crop Top' },
    ],
  },
  bottoms: {
    label: 'Quần/Dưới người',
    icon: '👖',
    options: [
      { value: 'keep-current', label: 'Keep Current (Giữ quần hiện tại)' },
      { value: 'jeans', label: 'Jeans' },
      { value: 'shorts', label: 'Shorts' },
      { value: 'skirt', label: 'Skirt' },
      { value: 'dress-pants', label: 'Dress Pants' },
      { value: 'leggings', label: 'Leggings' },
      { value: 'trousers', label: 'Trousers' },
      { value: 'cargo-pants', label: 'Cargo Pants' },
    ],
  },
  shoes: {
    label: 'Giày',
    icon: '👠',
    options: [
      { value: 'keep-current', label: 'Keep Current (Giữ giày hiện tại)' },
      { value: 'sneakers', label: 'Sneakers' },
      { value: 'heels', label: 'Heels' },
      { value: 'boots', label: 'Boots' },
      { value: 'loafers', label: 'Loafers' },
      { value: 'flats', label: 'Flats' },
      { value: 'sandals', label: 'Sandals' },
      { value: 'oxford', label: 'Oxford' },
    ],
  },
  outerwear: {
    label: 'Áo khoác ngoài',
    icon: '🧥',
    options: [
      { value: 'none', label: 'None (Không)' },
      { value: 'blazer', label: 'Blazer' },
      { value: 'jacket', label: 'Jacket' },
      { value: 'coat', label: 'Coat' },
      { value: 'cardigan', label: 'Cardigan' },
      { value: 'denim-jacket', label: 'Denim Jacket' },
      { value: 'leather-jacket', label: 'Leather Jacket' },
      { value: 'kimono', label: 'Kimono' },
    ],
  },
  accessories: {
    label: 'Phụ kiện',
    icon: '✨',
    options: [
      { value: 'none', label: 'None (Không có)' },
      { value: 'rings', label: 'Rings (Nhẫn)' },
      { value: 'bracelets', label: 'Bracelets (Vòng tay)' },
      { value: 'watch', label: 'Watch (Đồng hồ)' },
      { value: 'necklace', label: 'Necklace (Dây chuyền)' },
      { value: 'earrings', label: 'Earrings (Khuyên tai)' },
      { value: 'handbag', label: 'Handbag (Túi xách)' },
      { value: 'backpack', label: 'Backpack (Ba lô)' },
      { value: 'scarf', label: 'Scarf (Khăn quàng)' },
      { value: 'belt', label: 'Belt (Thắt lưng)' },
      { value: 'hat', label: 'Hat (Mũ)' },
      { value: 'sunglasses', label: 'Sunglasses (Kính mát)' },
    ],
  },
};

// Helper to format shot type and body pose for prompts
const formatShotAndPose = (shotType, bodyPose) => {
  const shotLabels = {
    'headshot': 'headshot',
    'half-body': 'half-body shot',
    'full-body': 'full body shot',
    'back-shot': 'back shot',
    'three-quarter-view': 'three-quarter view',
    'close-up-detail': 'close-up detail shot',
    'sitting': 'sitting shot',
    'walking': 'walking shot'
  };

  const poseLabels = {
    'neutral-standing': 'standing naturally',
    'crossed-arms': 'with crossed arms',
    'hand-on-hip': 'with hand on hip',
    'hands-in-pocket': 'with hands in pockets',
    'dynamic-pose': 'in dynamic pose',
    'leaning': 'leaning',
    'side-profile': 'in side profile',
    'seated': 'seated'
  };

  const parts = [];
  if (shotType && shotLabels[shotType]) {
    parts.push(shotLabels[shotType]);
  }
  if (bodyPose && poseLabels[bodyPose]) {
    parts.push(poseLabels[bodyPose]);
  }
  return parts.join(', ');
};

// Prompt Templates for different use cases
const PROMPT_TEMPLATES = {
  'change-clothes': {
    structure: 'product_on_character',
    instruction: 'Image 1: [CHARACTER_NAME]-character-[TIMESTAMP]\nImage 2: [PRODUCT_NAME]-product-[TIMESTAMP]\n\nPrompt: [MAIN_PROMPT]\nStyle notes: Exactly same face as image 1, product from image 2 on character',
    positive: (options, useCase) => {
      const shotAndPose = formatShotAndPose(options.shotType, options.bodyPose);
      const parts = [
        'A fashion model wearing [PRODUCT_DESCRIPTION]',
        'exactly same face and body from reference character image',
        'wearing the product from reference product image',
        shotAndPose && `${shotAndPose}`,
        options.scene && `in a ${options.scene} setting`,
        options.lighting && `with ${options.lighting} lighting`,
        options.mood && `with a ${options.mood} mood`,
        options.style && `${options.style} photography style`,
        options.colorPalette && `${options.colorPalette} color palette`,
        'professional product photography',
        'high quality, sharp focus, well-lit'
      ].filter(Boolean);
      return parts.join(', ');
    },
    negative: () => 'blurry, low quality, different face, distorted, multiple people, bad proportions',
  },
  'character-holding-product': {
    structure: 'character_holding_product',
    instruction: 'Image 1: [CHARACTER]-character\nImage 2: [PRODUCT]\nCharacter holds/presents product in hand',
    positive: (options, useCase) => {
      const shotAndPose = formatShotAndPose(options.shotType, options.bodyPose);
      const parts = [
        'Professional character holding/presenting [PRODUCT_DESCRIPTION]',
        'character from reference image',
        'prominently holding or displaying product',
        'hands clearly visible with product',
        shotAndPose && `${shotAndPose}`,
        options.scene && `in a ${options.scene}`,
        options.lighting && `${options.lighting} lighting`,
        options.mood && `${options.mood} engaging expression`,
        options.style && `${options.style} photography`,
        'marketing/affiliate quality, product showcase',
        'high quality, sharp focus, products visible, professional'
      ].filter(Boolean);
      return parts.join(', ');
    },
    negative: () => 'blurry, low quality, different face, product hidden, hands deformed, multiple people',
  },
  'ecommerce-product': {
    structure: 'product_focused',
    instruction: 'Focus on product showcase with optimal lighting for e-commerce',
    positive: (options, useCase) => {
      const parts = [
        'Professional product photography',
        '[PRODUCT_DESCRIPTION]',
        'displayed beautifully',
        options.scene && `on ${options.scene}`,
        options.lighting && `${options.lighting} lighting`,
        options.colorPalette && `${options.colorPalette} background and colors`,
        options.style && `${options.style} style`,
        'well-lit, sharp details, product-focused',
        'commercial photography, e-commerce ready'
      ].filter(Boolean);
      return parts.join(', ');
    },
    negative: () => 'people, face, person, model, blurry, low quality, distracting elements',
  },
  'social-media': {
    structure: 'character_in_clothes',
    instruction: 'Create social media ready content with character and product',
    positive: (options, useCase) => {
      const shotAndPose = formatShotAndPose(options.shotType, options.bodyPose);
      const parts = [
        'Attractive person wearing [PRODUCT_DESCRIPTION]',
        shotAndPose && `${shotAndPose}`,
        options.mood && `looking ${options.mood}`,
        options.scene && `in a ${options.scene}`,
        options.lighting && `with ${options.lighting}`,
        options.style && `${options.style} photography`,
        'Instagram ready, vibrant, engaging, social media optimized',
        'professional quality, sharp, well-composed'
      ].filter(Boolean);
      return parts.join(', ');
    },
    negative: () => 'blurry, watermark, low resolution, cropped, unprofessional',
  },
  'fashion-editorial': {
    structure: 'editorial_shoot',
    instruction: 'Professional editorial fashion photography',
    positive: (options, useCase) => {
      const shotAndPose = formatShotAndPose(options.shotType, options.bodyPose);
      const parts = [
        'High fashion editorial photography',
        'model wearing [PRODUCT_DESCRIPTION]',
        shotAndPose && `${shotAndPose}`,
        options.mood && `${options.mood} expression and pose`,
        options.scene && `in a ${options.scene}`,
        options.lighting && `${options.lighting} lighting`,
        options.style && `${options.style} style`,
        options.colorPalette && `${options.colorPalette} aesthetic`,
        'magazine quality, artistic, professional lighting, fashion editorial'
      ].filter(Boolean);
      return parts.join(', ');
    },
    negative: () => 'casual, amateur, blurry, low quality, unflattering, bad lighting',
  },
  'lifestyle-scene': {
    structure: 'character_in_lifestyle',
    instruction: 'Lifestyle content showing product in everyday context',
    positive: (options, useCase) => {
      const shotAndPose = formatShotAndPose(options.shotType, options.bodyPose);
      const parts = [
        'Person wearing [PRODUCT_DESCRIPTION]',
        'in a lifestyle scene',
        shotAndPose && `${shotAndPose}`,
        options.scene && `${options.scene} setting`,
        options.mood && `with a ${options.mood} vibe`,
        options.lighting && `${options.lighting}`,
        options.style && `${options.style} aesthetic`,
        'natural, relatable, authentic lifestyle photograph',
        'professional quality, well-lit, engaging scene'
      ].filter(Boolean);
      return parts.join(', ');
    },
    negative: () => 'studio, static pose, stiff, unnatural, blurry, low quality',
  },
};

// Prompt Optimizer
const optimizePrompt = (prompt, maxLength) => {
  if (!prompt || prompt.length <= maxLength) {
    return { optimized: prompt, reduced: false, originalLength: prompt?.length || 0 };
  }

  // Strategy 1: Remove extra spaces and newlines
  let optimized = prompt
    .replace(/\s+/g, ' ')
    .trim();

  if (optimized.length <= maxLength) {
    return { optimized, reduced: true, originalLength: prompt.length };
  }

  // Strategy 2: Remove less important descriptors
  const lessImportant = ['professional', 'high quality', 'sharp focus', 'well-lit', 'detailed', 'beautiful'];
  lessImportant.forEach(word => {
    if (optimized.length <= maxLength) return;
    optimized = optimized
      .split(',')
      .map(part => part.trim())
      .filter(part => !part.toLowerCase().includes(word))
      .join(', ');
  });

  if (optimized.length <= maxLength) {
    return { optimized: optimized.trim(), reduced: true, originalLength: prompt.length };
  }

  // Strategy 3: Truncate with intelligent cutting at comma boundaries
  const parts = optimized.split(',').slice(0, -3); // Remove last 3 parts
  optimized = parts.join(',').trim();

  if (!optimized) {
    optimized = prompt.substring(0, maxLength - 3) + '...';
  }

  return { optimized: optimized.substring(0, maxLength), reduced: true, originalLength: prompt.length };
};

const Step3Enhanced = ({
  characterImage,
  productImage,
  selectedOptions,
  onOptionChange,
  generatedPrompt,
  onPromptChange,
  useCase,
  isLoadingPrompt,
  referenceImages = [],
  onReferenceImagesChange,
  analysis
}) => {
  const { t } = useTranslation();
  const [customPrompt, setCustomPrompt] = useState('');
  const [showOptimizerModal, setShowOptimizerModal] = useState(false);
  const [maxPromptLength, setMaxPromptLength] = useState(300);
  const [optimizedPrompt, setOptimizedPrompt] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [copiedText, setCopiedText] = useState('');
  const [columns, setColumns] = useState(1);

  // Auto-generate prompt when selections change
  useEffect(() => {
    if (Object.keys(selectedOptions).length > 0) {
      generatePromptFromOptions();
    }
  }, [selectedOptions, useCase]);

  // Calculate columns based on number of options
  useEffect(() => {
    const totalOptions = Object.values(STYLE_CATEGORIES).reduce(
      (sum, cat) => sum + (expandedCategories[cat] !== false ? cat.options.length : 0),
      0
    );
    setColumns(totalOptions > 20 ? 3 : totalOptions > 12 ? 2 : 1);
  }, [expandedCategories]);

  const generatePromptFromOptions = useCallback(async () => {
    try {
      const template = PROMPT_TEMPLATES[useCase] || PROMPT_TEMPLATES['change-clothes'];
      const promptText = template.positive(selectedOptions, useCase);
      
      onPromptChange({
        positive: promptText,
        negative: template.negative()
      });
    } catch (error) {
      console.error('Error generating prompt:', error);
    }
  }, [selectedOptions, useCase, onPromptChange]);

  const toggleCategory = (categoryKey) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryKey]: !prev[categoryKey]
    }));
  };

  const handleCopyPrompt = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(''), 2000);
  };

  const handleOptimizePrompt = () => {
    if (!generatedPrompt?.positive) return;
    const result = optimizePrompt(generatedPrompt.positive, maxPromptLength);
    setOptimizedPrompt(result);
  };

  const handleApplyOptimized = () => {
    if (optimizedPrompt) {
      onPromptChange({
        positive: optimizedPrompt.optimized,
        negative: generatedPrompt.negative
      });
      setShowOptimizerModal(false);
    }
  };

  const handleAddReferenceImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file || referenceImages.length >= 3) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const newRef = {
        id: Date.now(),
        preview: event.target.result,
        file
      };
      onReferenceImagesChange([...referenceImages, newRef]);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveReferenceImage = (id) => {
    onReferenceImagesChange(referenceImages.filter(img => img.id !== id));
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white">
      {/* ==================== TOP: Use Case Info ==================== */}
      <div className="flex-shrink-0 bg-gray-800/50 px-4 py-2 border-b border-gray-700">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">Use case: <span className="text-purple-400 font-medium">{useCase}</span></span>
          <span className="text-gray-500">Customize your style and preview</span>
        </div>
      </div>

      {/* ==================== MAIN CONTENT ==================== */}
      <div className="flex-1 overflow-hidden flex gap-4 p-4">
        {/* LEFT: Style Options */}
        <div className="w-80 flex flex-col bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="px-4 py-3 bg-gray-700/50 border-b border-gray-700 flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <Sliders className="w-4 h-4" />
              Style Options
            </h3>
            <span className="text-xs text-gray-400">({Object.keys(selectedOptions).length} selected)</span>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
            {Object.entries(STYLE_CATEGORIES).map(([categoryKey, config]) => (
              <div key={categoryKey} className="bg-gray-700/30 rounded-lg border border-gray-700/50 overflow-hidden">
                <button
                  onClick={() => toggleCategory(categoryKey)}
                  className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{config.icon}</span>
                    <span className="text-sm font-medium">{config.label}</span>
                    {selectedOptions[categoryKey] && (
                      <span className="text-xs bg-purple-600/30 text-purple-300 px-2 py-0.5 rounded">
                        {selectedOptions[categoryKey]}
                      </span>
                    )}
                  </div>
                  {expandedCategories[categoryKey] !== false ? (
                    <ChevronUp className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  )}
                </button>

                {expandedCategories[categoryKey] !== false && (
                  <div className={`grid gap-2 px-3 py-2 bg-gray-800/50 border-t border-gray-700/50 ${
                    columns === 3 ? 'grid-cols-3' : columns === 2 ? 'grid-cols-2' : 'grid-cols-1'
                  }`}>
                    {config.options.map(option => (
                      <button
                        key={option.value}
                        onClick={() => onOptionChange(categoryKey, option.value)}
                        className={`px-3 py-2 rounded-lg text-xs text-center transition-all ${
                          selectedOptions[categoryKey] === option.value
                            ? 'bg-purple-600 text-white border border-purple-500'
                            : 'bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CENTER: Prompts */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {/* Positive Prompt */}
          <div className="flex-1 bg-gray-800 rounded-lg border border-gray-700 p-4 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-green-400 flex items-center gap-2">
                ✓ Positive Prompt
              </h4>
              {generatedPrompt?.positive && (
                <button
                  onClick={() => handleCopyPrompt(generatedPrompt.positive)}
                  className="p-1 text-gray-400 hover:text-white transition-colors"
                  title="Copy prompt"
                >
                  {copiedText === generatedPrompt.positive ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
            
            <div className="flex-1 bg-gray-900 rounded p-3 text-xs text-gray-300 font-mono overflow-y-auto mb-2 min-h-24 max-h-32 border border-gray-700">
              {generatedPrompt?.positive || 'Prompt will auto-generate as you select options...'}
            </div>

            {/* Prompt Stats */}
            {generatedPrompt?.positive && (
              <div className="text-xs text-gray-400 flex items-center justify-between px-2 py-1 bg-gray-900/50 rounded">
                <span>Length: {generatedPrompt.positive.length} characters</span>
                <button
                  onClick={() => setShowOptimizerModal(true)}
                  className="flex items-center gap-1 px-2 py-1 bg-purple-600/20 text-purple-300 rounded hover:bg-purple-600/30 transition-colors"
                >
                  <Zap className="w-3 h-3" />
                  Optimize
                </button>
              </div>
            )}
          </div>

          {/* Custom Prompt Input */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
            <h4 className="text-sm font-semibold text-blue-400 mb-2">+ Custom Prompt</h4>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Add additional details or modifications..."
              className="w-full h-20 bg-gray-900 text-white text-xs rounded border border-gray-700 p-2 resize-none focus:outline-none focus:border-purple-500 font-mono"
            />
            <div className="text-xs text-gray-500 mt-1">
              {customPrompt.length} characters
            </div>
          </div>

          {/* Negative Prompt */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-red-400 flex items-center gap-2">
                ✗ Negative Prompt
              </h4>
              {generatedPrompt?.negative && (
                <button
                  onClick={() => handleCopyPrompt(generatedPrompt.negative)}
                  className="p-1 text-gray-400 hover:text-white transition-colors"
                  title="Copy negative prompt"
                >
                  {copiedText === generatedPrompt.negative ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
            
            <div className="bg-gray-900 rounded p-2 text-xs text-gray-400 font-mono max-h-16 overflow-y-auto border border-gray-700">
              {generatedPrompt?.negative || 'Auto-generated negative prompt...'}
            </div>
          </div>
        </div>

        {/* RIGHT: Preview Images + Reference Images */}
        <div className="w-80 flex flex-col gap-4">
          {/* Preview Images */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
            <h4 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
              <Image className="w-4 h-4" />
              Preview Images
            </h4>
            
            <div className="grid grid-cols-2 gap-2">
              {characterImage?.preview && (
                <div className="aspect-square bg-gray-900 rounded border border-gray-700 overflow-hidden">
                  <img src={characterImage.preview} alt="Character" className="w-full h-full object-cover" />
                  <div className="text-xs text-gray-400 text-center py-1 bg-gray-900">👤 Character</div>
                </div>
              )}
              
              {productImage?.preview && (
                <div className="aspect-square bg-gray-900 rounded border border-gray-700 overflow-hidden">
                  <img src={productImage.preview} alt="Product" className="w-full h-full object-cover" />
                  <div className="text-xs text-gray-400 text-center py-1 bg-gray-900">👕 Product</div>
                </div>
              )}
            </div>
          </div>

          {/* Reference Images */}
          <div className="flex-1 bg-gray-800 rounded-lg border border-gray-700 p-4 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Reference Images
              </h4>
              <span className="text-xs text-gray-400">{referenceImages.length}/3</span>
            </div>

            <div className="flex-1 flex flex-col gap-2">
              {referenceImages.map(img => (
                <div key={img.id} className="relative group aspect-square rounded border border-gray-700 overflow-hidden bg-gray-900">
                  <img src={img.preview} alt="Reference" className="w-full h-full object-cover" />
                  <button
                    onClick={() => handleRemoveReferenceImage(img.id)}
                    className="absolute top-1 right-1 p-1 bg-red-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {referenceImages.length < 3 && (
                <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-600 rounded cursor-pointer hover:border-purple-500 transition-colors">
                  <Plus className="w-6 h-6 text-gray-400" />
                  <span className="text-xs text-gray-400 text-center mt-1">Add ref image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAddReferenceImage}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ==================== PROMPT OPTIMIZER MODAL ==================== */}
      {showOptimizerModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                Optimize Prompt Length
              </h3>
              <button
                onClick={() => setShowOptimizerModal(false)}
                className="p-1 hover:bg-gray-700 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 mb-4">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">
                  Max Character Length
                </label>
                <input
                  type="number"
                  value={maxPromptLength}
                  onChange={(e) => setMaxPromptLength(parseInt(e.target.value) || 300)}
                  min="50"
                  max="2000"
                  className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Current: {generatedPrompt?.positive.length} chars
                </p>
              </div>

              <button
                onClick={handleOptimizePrompt}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded flex items-center justify-center gap-2 transition-colors"
              >
                <Zap className="w-4 h-4" />
                Optimize
              </button>

              {optimizedPrompt && (
                <div className="bg-gray-900 border border-gray-700 rounded p-4 space-y-3">
                  <div className="bg-green-900/20 border border-green-700 rounded p-3">
                    <p className="text-xs text-green-400 mb-2">✓ Optimized ({optimizedPrompt.optimized.length} chars)</p>
                    <p className="text-xs text-gray-300 whitespace-pre-wrap font-mono">
                      {optimizedPrompt.optimized}
                    </p>
                  </div>

                  {optimizedPrompt.reduced && (
                    <div className="flex items-start gap-2 text-xs text-yellow-300 bg-yellow-900/20 border border-yellow-700 rounded p-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>Reduced from {optimizedPrompt.originalLength} chars by removing unnecessary words</span>
                    </div>
                  )}

                  <button
                    onClick={handleApplyOptimized}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded transition-colors"
                  >
                    Apply Optimized Prompt
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { STYLE_CATEGORIES };
export default Step3Enhanced;
