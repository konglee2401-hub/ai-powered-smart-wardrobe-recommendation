#!/usr/bin/env node

/**
 * Seed Prompt Options Script
 * Creates default prompt options for browser automation workflow
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

// Import models
import PromptOption from '../models/PromptOption.js';

const promptOptions = [
  // Scene options
  {
    category: 'scene',
    label: 'Studio',
    value: 'studio',
    description: 'Professional studio setting with controlled lighting',
    keywords: ['studio', 'professional', 'controlled', 'lighting'],
    technicalDetails: {
      lighting: 'controlled studio lighting',
      background: 'clean white or neutral',
      equipment: 'professional photography setup'
    },
    isActive: true,
    sortOrder: 1
  },
  {
    category: 'scene',
    label: 'Beach',
    value: 'beach',
    description: 'Natural beach environment with golden hour lighting',
    keywords: ['beach', 'ocean', 'golden hour', 'natural'],
    technicalDetails: {
      lighting: 'natural golden hour',
      background: 'beach with ocean',
      atmosphere: 'relaxed summer vibes'
    },
    isActive: true,
    sortOrder: 2
  },
  {
    category: 'scene',
    label: 'Urban',
    value: 'urban',
    description: 'Urban street environment with city aesthetics',
    keywords: ['urban', 'city', 'street', 'modern'],
    technicalDetails: {
      lighting: 'natural street lighting',
      background: 'city architecture',
      atmosphere: 'contemporary urban'
    },
    isActive: true,
    sortOrder: 3
  },
  {
    category: 'scene',
    label: 'Nature',
    value: 'nature',
    description: 'Natural outdoor environment with organic elements',
    keywords: ['nature', 'organic', 'outdoor', 'natural'],
    technicalDetails: {
      lighting: 'natural outdoor',
      background: 'trees and plants',
      atmosphere: 'earthy and organic'
    },
    isActive: true,
    sortOrder: 4
  },
  {
    category: 'scene',
    label: 'Office',
    value: 'office',
    description: 'Modern office environment with professional ambiance',
    keywords: ['office', 'professional', 'corporate', 'modern'],
    technicalDetails: {
      lighting: 'professional office lighting',
      background: 'modern office setting',
      atmosphere: 'corporate professional'
    },
    isActive: true,
    sortOrder: 5
  },

  // Lighting options
  {
    category: 'lighting',
    label: 'Natural',
    value: 'natural',
    description: 'Natural lighting with soft, realistic illumination',
    keywords: ['natural', 'soft', 'realistic', 'daylight'],
    technicalDetails: {
      type: 'natural daylight',
      quality: 'soft and diffused',
      shadows: 'natural soft shadows'
    },
    isActive: true,
    sortOrder: 1
  },
  {
    category: 'lighting',
    label: 'Studio',
    value: 'studio',
    description: 'Professional studio lighting with controlled setup',
    keywords: ['studio', 'controlled', 'professional', 'setup'],
    technicalDetails: {
      type: 'studio strobes',
      quality: 'controlled and even',
      shadows: 'minimal and controlled'
    },
    isActive: true,
    sortOrder: 2
  },
  {
    category: 'lighting',
    label: 'Golden Hour',
    value: 'golden-hour',
    description: 'Warm golden hour lighting with soft shadows',
    keywords: ['golden hour', 'warm', 'sunset', 'soft shadows'],
    technicalDetails: {
      type: 'golden hour sunlight',
      quality: 'warm and soft',
      shadows: 'long and soft'
    },
    isActive: true,
    sortOrder: 3
  },
  {
    category: 'lighting',
    label: 'Dramatic',
    value: 'dramatic',
    description: 'Dramatic lighting with high contrast and shadows',
    keywords: ['dramatic', 'high contrast', 'shadows', 'moody'],
    technicalDetails: {
      type: 'dramatic studio lighting',
      quality: 'high contrast',
      shadows: 'deep and defined'
    },
    isActive: true,
    sortOrder: 4
  },
  {
    category: 'lighting',
    label: 'Soft',
    value: 'soft',
    description: 'Soft, diffused lighting with gentle illumination',
    keywords: ['soft', 'diffused', 'gentle', 'even'],
    technicalDetails: {
      type: 'softbox lighting',
      quality: 'diffused and even',
      shadows: 'minimal and soft'
    },
    isActive: true,
    sortOrder: 5
  },

  // Mood options
  {
    category: 'mood',
    label: 'Playful',
    value: 'playful',
    description: 'Playful and joyful atmosphere with positive energy',
    keywords: ['playful', 'joyful', 'positive', 'fun'],
    technicalDetails: {
      expression: 'genuine smile',
      posture: 'relaxed and natural',
      energy: 'positive and lively'
    },
    isActive: true,
    sortOrder: 1
  },
  {
    category: 'mood',
    label: 'Serious',
    value: 'serious',
    description: 'Serious and focused professional atmosphere',
    keywords: ['serious', 'focused', 'professional', 'composed'],
    technicalDetails: {
      expression: 'composed and serious',
      posture: 'upright and professional',
      energy: 'focused and serious'
    },
    isActive: true,
    sortOrder: 2
  },
  {
    category: 'mood',
    label: 'Romantic',
    value: 'romantic',
    description: 'Romantic and dreamy intimate atmosphere',
    keywords: ['romantic', 'dreamy', 'intimate', 'soft'],
    technicalDetails: {
      expression: 'soft and dreamy',
      posture: 'intimate and close',
      energy: 'romantic and gentle'
    },
    isActive: true,
    sortOrder: 3
  },
  {
    category: 'mood',
    label: 'Energetic',
    value: 'energetic',
    description: 'Energetic and dynamic active atmosphere',
    keywords: ['energetic', 'dynamic', 'active', 'vibrant'],
    technicalDetails: {
      expression: 'energized and lively',
      posture: 'active and dynamic',
      energy: 'high energy and movement'
    },
    isActive: true,
    sortOrder: 4
  },
  {
    category: 'mood',
    label: 'Calm',
    value: 'calm',
    description: 'Calm and serene peaceful atmosphere',
    keywords: ['calm', 'serene', 'peaceful', 'tranquil'],
    technicalDetails: {
      expression: 'peaceful and calm',
      posture: 'relaxed and composed',
      energy: 'tranquil and serene'
    },
    isActive: true,
    sortOrder: 5
  },
  {
    category: 'mood',
    label: 'Elegant',
    value: 'elegant',
    description: 'Elegant and sophisticated refined atmosphere',
    keywords: ['elegant', 'sophisticated', 'refined', 'graceful'],
    technicalDetails: {
      expression: 'graceful and poised',
      posture: 'elegant and refined',
      energy: 'sophisticated and polished'
    },
    isActive: true,
    sortOrder: 6
  },

  // Style options
  {
    category: 'style',
    label: 'Casual',
    value: 'casual',
    description: 'Casual and relaxed fashion style',
    keywords: ['casual', 'relaxed', 'comfortable', 'everyday'],
    technicalDetails: {
      fit: 'relaxed fit',
      materials: 'comfortable fabrics',
      vibe: 'casual and comfortable'
    },
    isActive: true,
    sortOrder: 1
  },
  {
    category: 'style',
    label: 'Formal',
    value: 'formal',
    description: 'Formal and professional fashion style',
    keywords: ['formal', 'professional', 'business', 'elegant'],
    technicalDetails: {
      fit: 'tailored and fitted',
      materials: 'premium fabrics',
      vibe: 'professional and polished'
    },
    isActive: true,
    sortOrder: 2
  },
  {
    category: 'style',
    label: 'Elegant',
    value: 'elegant',
    description: 'Elegant and sophisticated fashion style',
    keywords: ['elegant', 'sophisticated', 'luxury', 'refined'],
    technicalDetails: {
      fit: 'elegant and flowing',
      materials: 'luxury fabrics',
      vibe: 'sophisticated and refined'
    },
    isActive: true,
    sortOrder: 3
  },
  {
    category: 'style',
    label: 'Sporty',
    value: 'sporty',
    description: 'Sporty and athletic fashion style',
    keywords: ['sporty', 'athletic', 'active', 'performance'],
    technicalDetails: {
      fit: 'athletic fit',
      materials: 'performance fabrics',
      vibe: 'active and sporty'
    },
    isActive: true,
    sortOrder: 4
  },
  {
    category: 'style',
    label: 'Vintage',
    value: 'vintage',
    description: 'Vintage and retro fashion style',
    keywords: ['vintage', 'retro', 'nostalgic', 'classic'],
    technicalDetails: {
      fit: 'vintage inspired',
      materials: 'retro fabrics',
      vibe: 'nostalgic and classic'
    },
    isActive: true,
    sortOrder: 5
  },
  {
    category: 'style',
    label: 'Luxury',
    value: 'luxury',
    description: 'Luxury and high-end fashion style',
    keywords: ['luxury', 'high-end', 'premium', 'exclusive'],
    technicalDetails: {
      fit: 'premium tailored',
      materials: 'luxury materials',
      vibe: 'exclusive and premium'
    },
    isActive: true,
    sortOrder: 6
  },
  {
    category: 'style',
    label: 'Bohemian',
    value: 'bohemian',
    description: 'Bohemian and free-spirited fashion style',
    keywords: ['bohemian', 'free-spirited', 'organic', 'artistic'],
    technicalDetails: {
      fit: 'flowing and loose',
      materials: 'natural fabrics',
      vibe: 'artistic and free-spirited'
    },
    isActive: true,
    sortOrder: 7
  },
  {
    category: 'style',
    label: 'Minimalist',
    value: 'minimalist',
    description: 'Minimalist and modern fashion style',
    keywords: ['minimalist', 'modern', 'simple', 'clean'],
    technicalDetails: {
      fit: 'clean and simple',
      materials: 'minimalist fabrics',
      vibe: 'simple and modern'
    },
    isActive: true,
    sortOrder: 8
  },
  {
    category: 'style',
    label: 'Edgy',
    value: 'edgy',
    description: 'Edgy and alternative fashion style',
    keywords: ['edgy', 'alternative', 'bold', 'rebellious'],
    technicalDetails: {
      fit: 'edgy and bold',
      materials: 'alternative materials',
      vibe: 'rebellious and bold'
    },
    isActive: true,
    sortOrder: 9
  },

  // Color Palette options
  {
    category: 'colorPalette',
    label: 'Vibrant',
    value: 'vibrant',
    description: 'Vibrant and saturated color palette',
    keywords: ['vibrant', 'saturated', 'bright', 'colorful'],
    technicalDetails: {
      saturation: 'high saturation',
      contrast: 'high contrast',
      colors: 'vibrant and bold'
    },
    isActive: true,
    sortOrder: 1
  },
  {
    category: 'colorPalette',
    label: 'Monochrome',
    value: 'monochrome',
    description: 'Monochrome and black & white palette',
    keywords: ['monochrome', 'black and white', 'grayscale', 'classic'],
    technicalDetails: {
      saturation: 'no saturation',
      contrast: 'high contrast',
      colors: 'black and white only'
    },
    isActive: true,
    sortOrder: 2
  },
  {
    category: 'colorPalette',
    label: 'Pastel',
    value: 'pastel',
    description: 'Soft pastel and muted color palette',
    keywords: ['pastel', 'soft', 'muted', 'gentle'],
    technicalDetails: {
      saturation: 'low saturation',
      contrast: 'soft contrast',
      colors: 'pastel and gentle'
    },
    isActive: true,
    sortOrder: 3
  },
  {
    category: 'colorPalette',
    label: 'Jewel Tones',
    value: 'jewel-tones',
    description: 'Rich jewel-toned and luxurious colors',
    keywords: ['jewel tones', 'rich', 'luxurious', 'deep'],
    technicalDetails: {
      saturation: 'rich saturation',
      contrast: 'medium contrast',
      colors: 'jewel-toned and rich'
    },
    isActive: true,
    sortOrder: 4
  },
  {
    category: 'colorPalette',
    label: 'Earth Tones',
    value: 'earth-tones',
    description: 'Natural earth tones and warm colors',
    keywords: ['earth tones', 'natural', 'warm', 'organic'],
    technicalDetails: {
      saturation: 'natural saturation',
      contrast: 'warm contrast',
      colors: 'earth and warm tones'
    },
    isActive: true,
    sortOrder: 5
  },
  {
    category: 'colorPalette',
    label: 'Black & White',
    value: 'black-and-white',
    description: 'Classic black and white contrast',
    keywords: ['black and white', 'classic', 'contrast', 'timeless'],
    technicalDetails: {
      saturation: 'no saturation',
      contrast: 'high contrast',
      colors: 'black and white only'
    },
    isActive: true,
    sortOrder: 6
  },

  // Camera Angle options
  {
    category: 'cameraAngle',
    label: 'Front View',
    value: 'front-view',
    description: 'Front-facing camera angle',
    keywords: ['front view', 'face forward', 'direct', 'head-on'],
    technicalDetails: {
      angle: '0 degrees',
      focus: 'front facing',
      perspective: 'direct view'
    },
    isActive: true,
    sortOrder: 1
  },
  {
    category: 'cameraAngle',
    label: 'Side View',
    value: 'side-view',
    description: 'Side profile camera angle',
    keywords: ['side view', 'profile', 'lateral', 'side'],
    technicalDetails: {
      angle: '90 degrees',
      focus: 'side profile',
      perspective: 'lateral view'
    },
    isActive: true,
    sortOrder: 2
  },
  {
    category: 'cameraAngle',
    label: 'Three-Quarter View',
    value: 'three-quarter-view',
    description: 'Three-quarter angle view',
    keywords: ['three-quarter', '3/4 view', 'angled', 'diagonal'],
    technicalDetails: {
      angle: '45 degrees',
      focus: 'angled view',
      perspective: 'three-quarter angle'
    },
    isActive: true,
    sortOrder: 3
  },
  {
    category: 'cameraAngle',
    label: 'Overhead View',
    value: 'overhead-view',
    description: 'Overhead or bird\'s eye view',
    keywords: ['overhead', 'bird\'s eye', 'top down', 'aerial'],
    technicalDetails: {
      angle: '90 degrees down',
      focus: 'top down',
      perspective: 'aerial view'
    },
    isActive: true,
    sortOrder: 4
  },
  {
    category: 'cameraAngle',
    label: 'Low Angle',
    value: 'low-angle',
    description: 'Low angle shot looking up',
    keywords: ['low angle', 'looking up', 'worm\'s eye', 'upward'],
    technicalDetails: {
      angle: 'looking up',
      focus: 'upward perspective',
      perspective: 'worm\'s eye view'
    },
    isActive: true,
    sortOrder: 5
  },
  {
    category: 'cameraAngle',
    label: 'High Angle',
    value: 'high-angle',
    description: 'High angle shot looking down',
    keywords: ['high angle', 'looking down', 'god\'s eye', 'downward'],
    technicalDetails: {
      angle: 'looking down',
      focus: 'downward perspective',
      perspective: 'god\'s eye view'
    },
    isActive: true,
    sortOrder: 6
  },

  // ============ NEW: Hairstyle options ============
  {
    category: 'hairstyle',
    label: 'Long Straight',
    value: 'long-straight',
    description: 'Long straight hair, sleek and smooth',
    keywords: ['long', 'straight', 'sleek', 'smooth', 'silky'],
    technicalDetails: {
      length: 'long',
      texture: 'straight',
      style: 'sleek and polished'
    },
    isActive: true,
    sortOrder: 1
  },
  {
    category: 'hairstyle',
    label: 'Long Wavy',
    value: 'long-wavy',
    description: 'Long wavy hair with natural waves',
    keywords: ['long', 'wavy', 'waves', 'natural', 'flowing'],
    technicalDetails: {
      length: 'long',
      texture: 'wavy',
      style: 'natural and flowing'
    },
    isActive: true,
    sortOrder: 2
  },
  {
    category: 'hairstyle',
    label: 'Long Curly',
    value: 'long-curly',
    description: 'Long curly hair with defined curls',
    keywords: ['long', 'curly', 'curls', 'bouncy', 'voluminous'],
    technicalDetails: {
      length: 'long',
      texture: 'curly',
      style: 'bouncy and voluminous'
    },
    isActive: true,
    sortOrder: 3
  },
  {
    category: 'hairstyle',
    label: 'Medium Straight',
    value: 'medium-straight',
    description: 'Medium length straight hair',
    keywords: ['medium', 'straight', 'shoulder length', 'sleek'],
    technicalDetails: {
      length: 'medium',
      texture: 'straight',
      style: 'clean and simple'
    },
    isActive: true,
    sortOrder: 4
  },
  {
    category: 'hairstyle',
    label: 'Medium Wavy',
    value: 'medium-wavy',
    description: 'Medium length wavy hair',
    keywords: ['medium', 'wavy', 'waves', 'shoulder length'],
    technicalDetails: {
      length: 'medium',
      texture: 'wavy',
      style: 'relaxed and natural'
    },
    isActive: true,
    sortOrder: 5
  },
  {
    category: 'hairstyle',
    label: 'Short Bob',
    value: 'short-bob',
    description: 'Short bob cut hair',
    keywords: ['short', 'bob', 'chic', 'modern'],
    technicalDetails: {
      length: 'short',
      texture: 'straight to wavy',
      style: 'chic and modern'
    },
    isActive: true,
    sortOrder: 6
  },
  {
    category: 'hairstyle',
    label: 'Short Pixie',
    value: 'short-pixie',
    description: 'Short pixie cut',
    keywords: ['short', 'pixie', 'edgy', 'bold'],
    technicalDetails: {
      length: 'very short',
      texture: 'short cropped',
      style: 'edgy and bold'
    },
    isActive: true,
    sortOrder: 7
  },
  {
    category: 'hairstyle',
    label: 'Braided',
    value: 'braided',
    description: 'Braided hairstyle',
    keywords: ['braided', 'braids', 'plaited', 'traditional'],
    technicalDetails: {
      length: 'any',
      texture: 'braided',
      style: 'traditional and intricate'
    },
    isActive: true,
    sortOrder: 8
  },
  {
    category: 'hairstyle',
    label: 'Bun',
    value: 'bun',
    description: 'Bun updo hairstyle',
    keywords: ['bun', 'updo', 'elegant', 'formal'],
    technicalDetails: {
      length: 'any',
      texture: 'pulled back',
      style: 'elegant and formal'
    },
    isActive: true,
    sortOrder: 9
  },

  // ============ Makeup options ============
  {
    category: 'makeup',
    label: 'Natural',
    value: 'natural',
    description: 'Natural no-makeup look',
    keywords: ['natural', 'no makeup', 'bare', 'minimal'],
    technicalDetails: {
      coverage: 'light',
      finish: 'natural',
      emphasis: 'skin clarity'
    },
    isActive: true,
    sortOrder: 1
  },
  {
    category: 'makeup',
    label: 'Light',
    value: 'light',
    description: 'Light and fresh makeup look',
    keywords: ['light', 'fresh', 'daytime', 'subtle'],
    technicalDetails: {
      coverage: 'light to medium',
      finish: 'dewy',
      emphasis: 'healthy glow'
    },
    isActive: true,
    sortOrder: 2
  },
  {
    category: 'makeup',
    label: 'Glowing',
    value: 'glowing',
    description: 'Glowing radiant makeup',
    keywords: ['glowing', 'radiant', 'glow', 'highlight'],
    technicalDetails: {
      coverage: 'medium',
      finish: 'radiant',
      emphasis: 'highlighter and glow'
    },
    isActive: true,
    sortOrder: 3
  },
  {
    category: 'makeup',
    label: 'Bold Lips',
    value: 'bold-lips',
    description: 'Bold lip color makeup',
    keywords: ['bold lips', 'red lip', 'vibrant', 'statement'],
    technicalDetails: {
      coverage: 'full face',
      finish: 'matte or satin',
      emphasis: 'bold lip color'
    },
    isActive: true,
    sortOrder: 4
  },
  {
    category: 'makeup',
    label: 'Smokey Eyes',
    value: 'smokey-eyes',
    description: 'Smokey eye makeup',
    keywords: ['smokey', 'smoke', 'eyeshadow', 'dramatic'],
    technicalDetails: {
      coverage: 'full face',
      finish: 'matte or shimmer',
      emphasis: 'dramatic eyes'
    },
    isActive: true,
    sortOrder: 5
  },
  {
    category: 'makeup',
    label: 'Winged Eyeliner',
    value: 'winged-liner',
    description: 'Winged eyeliner look',
    keywords: ['winged', 'cat eye', 'eyeliner', 'precise'],
    technicalDetails: {
      coverage: 'full face',
      finish: 'precise',
      emphasis: 'eyeliner wings'
    },
    isActive: true,
    sortOrder: 6
  },
  {
    category: 'makeup',
    label: 'Glamorous',
    value: 'glamorous',
    description: 'Glamorous full makeup',
    keywords: ['glamorous', 'glam', 'full makeup', 'party'],
    technicalDetails: {
      coverage: 'full',
      finish: 'glamorous',
      emphasis: 'overall dramatic look'
    },
    isActive: true,
    sortOrder: 7
  },

  // ============ Bottoms options ============
  {
    category: 'bottoms',
    label: 'Jeans',
    value: 'jeans',
    description: 'Denim jeans pants',
    keywords: ['jeans', 'denim', 'pants', 'casual'],
    technicalDetails: {
      type: 'denim pants',
      fit: 'various fits',
      style: 'casual versatile'
    },
    isActive: true,
    sortOrder: 1
  },
  {
    category: 'bottoms',
    label: 'Trousers',
    value: 'trousers',
    description: 'Formal trousers pants',
    keywords: ['trousers', 'dress pants', 'formal', 'professional'],
    technicalDetails: {
      type: 'dress pants',
      fit: 'tailored',
      style: 'formal professional'
    },
    isActive: true,
    sortOrder: 2
  },
  {
    category: 'bottoms',
    label: 'Shorts',
    value: 'shorts',
    description: 'Casual shorts',
    keywords: ['shorts', 'casual', 'summer', 'sporty'],
    technicalDetails: {
      type: 'shorts',
      length: 'above knee',
      style: 'casual summer'
    },
    isActive: true,
    sortOrder: 3
  },
  {
    category: 'bottoms',
    label: 'Skirt',
    value: 'skirt',
    description: 'Skirt bottom',
    keywords: ['skirt', 'feminine', 'elegant', 'versatile'],
    technicalDetails: {
      type: 'skirt',
      length: 'various',
      style: 'feminine versatile'
    },
    isActive: true,
    sortOrder: 4
  },
  {
    category: 'bottoms',
    label: 'Leggings',
    value: 'leggings',
    description: 'Fitted leggings pants',
    keywords: ['leggings', 'fitted', 'athletic', 'comfortable'],
    technicalDetails: {
      type: 'leggings',
      fit: 'tight fitted',
      style: 'athletic comfortable'
    },
    isActive: true,
    sortOrder: 5
  },
  {
    category: 'bottoms',
    label: 'Cargo Pants',
    value: 'cargo-pants',
    description: 'Cargo pants with pockets',
    keywords: ['cargo', 'utility', 'pockets', 'streetwear'],
    technicalDetails: {
      type: 'cargo pants',
      fit: 'relaxed',
      style: 'utility streetwear'
    },
    isActive: true,
    sortOrder: 6
  },

  // ============ Shoes options ============
  {
    category: 'shoes',
    label: 'Sneakers',
    value: 'sneakers',
    description: 'Casual sneakers shoes',
    keywords: ['sneakers', 'casual', 'sporty', 'comfortable'],
    technicalDetails: {
      type: 'sneakers',
      heel: 'flat',
      style: 'casual sporty'
    },
    isActive: true,
    sortOrder: 1
  },
  {
    category: 'shoes',
    label: 'Heels',
    value: 'heels',
    description: 'High heel shoes',
    keywords: ['heels', 'high heels', 'formal', 'elegant'],
    technicalDetails: {
      type: 'heels',
      heel: 'high',
      style: 'formal elegant'
    },
    isActive: true,
    sortOrder: 2
  },
  {
    category: 'shoes',
    label: 'Boots',
    value: 'boots',
    description: 'Boot footwear',
    keywords: ['boots', 'booties', 'ankle boots', 'stylish'],
    technicalDetails: {
      type: 'boots',
      heel: 'various',
      style: 'stylish versatile'
    },
    isActive: true,
    sortOrder: 3
  },
  {
    category: 'shoes',
    label: 'Flats',
    value: 'flats',
    description: 'Flat shoes',
    keywords: ['flats', 'ballet flats', 'comfortable', 'casual'],
    technicalDetails: {
      type: 'flats',
      heel: 'flat',
      style: 'comfortable casual'
    },
    isActive: true,
    sortOrder: 4
  },
  {
    category: 'shoes',
    label: 'Sandals',
    value: 'sandals',
    description: 'Open sandals',
    keywords: ['sandals', 'summer', 'open toe', 'breathable'],
    technicalDetails: {
      type: 'sandals',
      heel: 'various',
      style: 'summer breathable'
    },
    isActive: true,
    sortOrder: 5
  },
  {
    category: 'shoes',
    label: 'Loafers',
    value: 'loafers',
    description: 'Loafer shoes',
    keywords: ['loafers', 'slip on', 'smart casual', 'classic'],
    technicalDetails: {
      type: 'loafers',
      heel: 'flat',
      style: 'smart casual classic'
    },
    isActive: true,
    sortOrder: 6
  },

  // ============ Accessories options ============
  {
    category: 'accessories',
    label: 'Necklace',
    value: 'necklace',
    description: 'Necklace accessory',
    keywords: ['necklace', 'pendant', 'chain', 'jewelry'],
    technicalDetails: {
      type: 'necklace',
      placement: 'neck',
      style: 'decorative'
    },
    isActive: true,
    sortOrder: 1
  },
  {
    category: 'accessories',
    label: 'Earrings',
    value: 'earrings',
    description: 'Earrings accessory',
    keywords: ['earrings', 'ear rings', 'jewelry', 'ear'],
    technicalDetails: {
      type: 'earrings',
      placement: 'ears',
      style: 'decorative'
    },
    isActive: true,
    sortOrder: 2
  },
  {
    category: 'accessories',
    label: 'Watch',
    value: 'watch',
    description: 'Wrist watch accessory',
    keywords: ['watch', 'wrist watch', 'timepiece', 'accessory'],
    technicalDetails: {
      type: 'watch',
      placement: 'wrist',
      style: 'functional decorative'
    },
    isActive: true,
    sortOrder: 3
  },
  {
    category: 'accessories',
    label: 'Bag',
    value: 'bag',
    description: 'Handbag or purse',
    keywords: ['bag', 'purse', 'handbag', 'accessory'],
    technicalDetails: {
      type: 'bag',
      placement: 'hand or shoulder',
      style: 'functional decorative'
    },
    isActive: true,
    sortOrder: 4
  },
  {
    category: 'accessories',
    label: 'Sunglasses',
    value: 'sunglasses',
    description: 'Sunglasses eyewear',
    keywords: ['sunglasses', 'shades', 'eyewear', 'sun'],
    technicalDetails: {
      type: 'sunglasses',
      placement: 'eyes',
      style: 'protective fashionable'
    },
    isActive: true,
    sortOrder: 5
  },
  {
    category: 'accessories',
    label: 'Scarf',
    value: 'scarf',
    description: 'Scarf accessory',
    keywords: ['scarf', 'shawl', 'neck scarf', 'accessory'],
    technicalDetails: {
      type: 'scarf',
      placement: 'neck or shoulders',
      style: 'decorative functional'
    },
    isActive: true,
    sortOrder: 6
  },
  {
    category: 'accessories',
    label: 'Belt',
    value: 'belt',
    description: 'Waist belt accessory',
    keywords: ['belt', 'waist belt', 'accessory', 'waist'],
    technicalDetails: {
      type: 'belt',
      placement: 'waist',
      style: 'functional decorative'
    },
    isActive: true,
    sortOrder: 7
  },
  {
    category: 'accessories',
    label: 'Hat',
    value: 'hat',
    description: 'Hat accessory',
    keywords: ['hat', 'cap', 'headwear', 'accessory'],
    technicalDetails: {
      type: 'hat',
      placement: 'head',
      style: 'protective fashionable'
    },
    isActive: true,
    sortOrder: 8
  },

  // ============ Outerwear options ============
  {
    category: 'outerwear',
    label: 'Jacket',
    value: 'jacket',
    description: 'Casual jacket',
    keywords: ['jacket', 'casual', 'outerwear', 'light'],
    technicalDetails: {
      type: 'jacket',
      weight: 'light to medium',
      style: 'casual versatile'
    },
    isActive: true,
    sortOrder: 1
  },
  {
    category: 'outerwear',
    label: 'Coat',
    value: 'coat',
    description: 'Formal coat',
    keywords: ['coat', 'formal', 'outerwear', 'winter'],
    technicalDetails: {
      type: 'coat',
      weight: 'heavy',
      style: 'formal elegant'
    },
    isActive: true,
    sortOrder: 2
  },
  {
    category: 'outerwear',
    label: 'Blazer',
    value: 'blazer',
    description: 'Blazer jacket',
    keywords: ['blazer', 'structured', 'formal', 'professional'],
    technicalDetails: {
      type: 'blazer',
      weight: 'light to medium',
      style: 'formal professional'
    },
    isActive: true,
    sortOrder: 3
  },
  {
    category: 'outerwear',
    label: 'Cardigan',
    value: 'cardigan',
    description: 'Knitted cardigan',
    keywords: ['cardigan', 'knitted', 'sweater', 'casual'],
    technicalDetails: {
      type: 'cardigan',
      weight: 'medium',
      style: 'casual comfortable'
    },
    isActive: true,
    sortOrder: 4
  },
  {
    category: 'outerwear',
    label: 'Hoodie',
    value: 'hoodie',
    description: 'Hooded sweatshirt',
    keywords: ['hoodie', 'hooded', 'casual', 'sporty'],
    technicalDetails: {
      type: 'hoodie',
      weight: 'medium',
      style: 'casual sporty'
    },
    isActive: true,
    sortOrder: 5
  },
  {
    category: 'outerwear',
    label: 'Vest',
    value: 'vest',
    description: 'Vest garment',
    keywords: ['vest', 'waistcoat', 'layering', 'formal'],
    technicalDetails: {
      type: 'vest',
      weight: 'light',
      style: 'layering formal'
    },
    isActive: true,
    sortOrder: 6
  }
];

async function seedPromptOptions() {
  try {
    console.log('🌱 Seeding prompt options...');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-wardrobe');
    console.log('✅ Connected to MongoDB');

    // Clear existing prompt options
    await PromptOption.deleteMany({});
    console.log('🗑️  Cleared existing prompt options');

    // Insert new prompt options
    const result = await PromptOption.insertMany(promptOptions);
    console.log(`✅ Seeded ${result.length} prompt options`);

    console.log('🎉 Prompt options seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding prompt options:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
seedPromptOptions();