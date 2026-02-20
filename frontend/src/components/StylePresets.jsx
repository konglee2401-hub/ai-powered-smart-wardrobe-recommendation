/**
 * Style Presets Component
 * Pre-configured style combinations for quick application
 */

import React, { useState } from 'react';
import { BookOpen } from 'lucide-react';

const STYLE_PRESETS = [
  {
    id: 'minimalist-studio',
    name: 'Minimalist Studio',
    description: 'Clean, professional studio look',
    icon: '📷',
    styles: {
      scene: 'studio',
      lighting: 'soft-diffused',
      mood: 'professional',
      style: 'minimalist',
      colorPalette: 'neutral',
      cameraAngle: 'eye-level'
    }
  },
  {
    id: 'golden-editorial',
    name: 'Golden Hour Editorial',
    description: 'Warm, luxurious editorial style',
    icon: '✨',
    styles: {
      scene: 'outdoor-park',
      lighting: 'golden-hour',
      mood: 'elegant',
      style: 'editorial',
      colorPalette: 'warm',
      cameraAngle: 'three-quarter'
    }
  },
  {
    id: 'urban-street',
    name: 'Urban Street',
    description: 'Modern street style photography',
    icon: '🏙️',
    styles: {
      scene: 'urban-street',
      lighting: 'natural-window',
      mood: 'energetic',
      style: 'street',
      colorPalette: 'vibrant',
      cameraAngle: 'slight-angle'
    }
  },
  {
    id: 'luxury-interior',
    name: 'Luxury Interior',
    description: 'High-end interior fashion shoot',
    icon: '💎',
    styles: {
      scene: 'luxury-interior',
      lighting: 'dramatic-rembrandt',
      mood: 'elegant',
      style: 'high-fashion',
      colorPalette: 'metallic',
      cameraAngle: 'three-quarter'
    }
  },
  {
    id: 'casual-lifestyle',
    name: 'Casual Lifestyle',
    description: 'Relaxed everyday wear style',
    icon: '📸',
    styles: {
      scene: 'cafe',
      lighting: 'natural-window',
      mood: 'relaxed',
      style: 'lifestyle',
      colorPalette: 'warm',
      cameraAngle: 'eye-level'
    }
  },
  {
    id: 'high-fashion-dramatic',
    name: 'High Fashion Dramatic',
    description: 'Bold, artistic haute couture',
    icon: '👠',
    styles: {
      scene: 'minimalist-indoor',
      lighting: 'dramatic-rembrandt',
      mood: 'mysterious',
      style: 'high-fashion',
      colorPalette: 'monochrome',
      cameraAngle: 'full-front'
    }
  },
  {
    id: 'vibrant-neon',
    name: 'Vibrant Neon',
    description: 'Contemporary neon-lit look',
    icon: '🎨',
    styles: {
      scene: 'minimalist-indoor',
      lighting: 'neon-colored',
      mood: 'energetic',
      style: 'commercial',
      colorPalette: 'vibrant',
      cameraAngle: 'eye-level'
    }
  },
  {
    id: 'bohemian-dreamy',
    name: 'Bohemian Dreamy',
    description: 'Soft, romantic bohemian aesthetic',
    icon: '🌻',
    styles: {
      scene: 'outdoor-park',
      lighting: 'overcast-outdoor',
      mood: 'romantic',
      style: 'bohemian',
      colorPalette: 'pastel',
      cameraAngle: 'three-quarter'
    }
  },
];

export default function StylePresets({
  selectedPreset = null,
  onApplyPreset,
  currentStyles
}) {
  const [expanded, setExpanded] = useState(false);

  const isPresetActive = (preset) => {
    return Object.entries(preset.styles).every(
      ([key, value]) => currentStyles[key] === value
    );
  };

  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg overflow-hidden border border-gray-700">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 bg-gray-800 hover:bg-gray-750 transition-colors"
      >
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-semibold">Style Presets</span>
        </div>
        <span className="text-xs text-gray-500">{STYLE_PRESETS.length} presets</span>
      </button>

      {/* Content */}
      {expanded && (
        <div className="p-3 border-t border-gray-700 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {STYLE_PRESETS.map(preset => {
              const isActive = isPresetActive(preset);
              return (
                <button
                  key={preset.id}
                  onClick={() => onApplyPreset(preset)}
                  className={`p-2 rounded-lg text-left transition-all border ${
                    isActive
                      ? 'bg-purple-600/30 border-purple-600/50'
                      : 'bg-gray-700/30 border-gray-700/50 hover:border-purple-600/30'
                  }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-lg">{preset.icon}</span>
                    {isActive && <span className="text-xs text-purple-400">✓</span>}
                  </div>
                  <h4 className="text-xs font-medium text-gray-200 mb-0.5">{preset.name}</h4>
                  <p className="text-xs text-gray-500 line-clamp-1">{preset.description}</p>
                </button>
              );
            })}
          </div>

          <div className="text-xs text-gray-500 text-center pt-2 border-t border-gray-700">
            Click to apply preset styles instantly
          </div>
        </div>
      )}
    </div>
  );
}
