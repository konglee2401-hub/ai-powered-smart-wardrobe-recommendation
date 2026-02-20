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