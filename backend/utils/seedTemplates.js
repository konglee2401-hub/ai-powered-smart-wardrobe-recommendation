// Seed data cho Prompt Templates
// Run: cd backend && node utils/seedTemplates.js

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import PromptTemplate from '../models/PromptTemplate.js';

// ===== FASHION OPTIONS DATABASE =====
export const FASHION_OPTIONS = {
  // A. Head & Face
  hair_style: {
    label: 'Hairstyle',
    options: ['straight', 'wavy', 'loose curls', 'high ponytail', 'half-up half-down', 'elegant low bun', 'braided crown', 'bob cut', 'pixie cut'],
    default: 'wavy'
  },
  hair_acc: {
    label: 'Hair Accessories',
    options: ['silk bow', 'pearl headband', 'minimalist gold clips', 'beret hat', 'lace veil', 'none'],
    default: 'none'
  },
  makeup: {
    label: 'Makeup Style',
    options: ['natural glow', 'bold red lips', 'smoky eyes', 'douyin style', 'clean girl aesthetic', 'vintage 1950s'],
    default: 'natural glow'
  },

  // B. Upper Body
  top_detail: {
    label: 'Top Detail',
    options: ['sweetheart neckline', 'off-shoulder', 'halter neck', 'turtleneck', 'puffy sleeves', 'lace-trimmed', 'button-down'],
    default: 'sweetheart neckline'
  },
  material: {
    label: 'Material',
    options: ['silk', 'satin', 'lace', 'velvet', 'denim', 'tweed', 'sheer chiffon', 'knitted'],
    default: 'silk'
  },
  outerwear: {
    label: 'Outerwear',
    options: ['leather jacket', 'oversized blazer', 'trench coat', 'cardigan', 'none'],
    default: 'none'
  },

  // C. Lower Body
  bottom_type: {
    label: 'Bottom Type',
    options: ['high-waisted skirt', 'pleated mini skirt', 'wide-leg trousers', 'skinny jeans', 'bodycon dress', 'cargo pants'],
    default: 'high-waisted skirt'
  },
  legwear: {
    label: 'Legwear',
    options: ['black sheer stockings', 'fishnet tights', 'lace-topped thigh-highs', 'white crew socks', 'none'],
    default: 'none'
  },

  // D. Accessories
  necklace: {
    label: 'Necklace',
    options: ['layered gold chains', 'pearl choker', 'lace choker', 'minimalist pendant'],
    default: 'minimalist pendant'
  },
  earrings: {
    label: 'Earrings',
    options: ['hoop earrings', 'pearl studs', 'drop earrings', 'silver cuffs'],
    default: 'pearl studs'
  },
  hand_acc: {
    label: 'Hand/Arms',
    options: ['lace opera gloves', 'leather gloves', 'silver rings set', 'luxury watch'],
    default: 'none'
  },
  waist_acc: {
    label: 'Waist',
    options: ['leather belt', 'chain belt', 'corset cincher', 'none'],
    default: 'none'
  },

  // E. Footwear
  shoes: {
    label: 'Shoes',
    options: ['stiletto heels', 'mary janes', 'chunky sneakers', 'combat boots', 'loafers', 'knee-high boots'],
    default: 'stiletto heels'
  },

  // F. Photography & Vibes
  scene: {
    label: 'Scene',
    options: ['luxury grand piano room', 'minimalist studio', 'cyberpunk street', 'vintage cafe', 'royal garden', 'white studio'],
    default: 'white studio'
  },
  lighting: {
    label: 'Lighting',
    options: ['cinematic warm light', 'soft studio lighting', 'neon glow', 'natural golden hour'],
    default: 'soft studio lighting'
  },
  expression: {
    label: 'Expression',
    options: ['gentle smile', 'seductive gaze', 'mysterious look', 'cheerful laughing'],
    default: 'gentle smile'
  },
  style: {
    label: 'Style',
    options: ['lookbook', 'ecommerce', 'street style', 'elegant', 'seductive', 'casual'],
    default: 'lookbook'
  },
  description: {
    label: 'Description',
    options: [],
    default: ''
  }
};

// Helper to create variable object
const createVariable = (key) => ({
  key,
  label: FASHION_OPTIONS[key]?.label || key,
  type: FASHION_OPTIONS[key]?.options?.length > 0 ? 'select' : 'text',
  options: FASHION_OPTIONS[key]?.options || [],
  defaultValue: FASHION_OPTIONS[key]?.default || '',
});

// ===== SEED DATA =====
const defaultTemplates = [
  {
    name: 'Ultra-Detailed Fashion Master',
    description: 'Template đầy đủ chi tiết nhất cho AI Fashion Tool - TikTok/Reels 9:16',
    type: 'image',
    provider: 'gemini-native',
    isSystem: true,
    content: `High-end fashion photography, Vietnamese model. OUTFIT: {{description}}. HAIR & MAKEUP: {{hair_style}} with {{hair_acc}}, {{makeup}} makeup. ACCESSORIES: {{necklace}}, {{earrings}}, {{hand_acc}}, {{waist_acc}}. LOWER BODY: {{legwear}} and {{shoes}}. SCENE: {{scene}}, {{lighting}}, {{expression}} expression. STYLE: {{style}}, 9:16 vertical format, 8k resolution, highly detailed fabric texture, realistic skin, professional color grading, TikTok optimized.`,
    variables: [
      createVariable('description'),
      createVariable('hair_style'),
      createVariable('hair_acc'),
      createVariable('makeup'),
      createVariable('top_detail'),
      createVariable('material'),
      createVariable('outerwear'),
      createVariable('bottom_type'),
      createVariable('legwear'),
      createVariable('necklace'),
      createVariable('earrings'),
      createVariable('hand_acc'),
      createVariable('waist_acc'),
      createVariable('shoes'),
      createVariable('scene'),
      createVariable('lighting'),
      createVariable('expression'),
      createVariable('style'),
    ],
  },
  {
    name: 'TikTok Fashion Reels',
    description: 'Template tối ưu cho TikTok/Reels với hiệu ứng trending',
    type: 'video',
    provider: 'grok',
    isSystem: true,
    content: `Trendy TikTok fashion video, Vietnamese model wearing {{description}}. {{hair_style}} hairstyle with {{hair_acc}}, {{makeup}} vibe. {{outerwear}} over {{top_detail}} top in {{material}}. {{bottom_type}} with {{legwear}}. Complete look with {{shoes}} on feet. SCENE: {{scene}}, {{lighting}}, {{expression}} expression. Dynamic camera movement, trending audio sync, 9:16 vertical format, ultra HD, cinematic quality, viral potential.`,
    variables: [
      createVariable('description'),
      createVariable('hair_style'),
      createVariable('hair_acc'),
      createVariable('makeup'),
      createVariable('outerwear'),
      createVariable('top_detail'),
      createVariable('material'),
      createVariable('bottom_type'),
      createVariable('legwear'),
      createVariable('shoes'),
      createVariable('scene'),
      createVariable('lighting'),
      createVariable('expression'),
    ],
  },
  {
    name: 'E-commerce Product',
    description: 'Template cho ảnh sản phẩm thời trang',
    type: 'image',
    provider: 'gemini-imagen',
    isSystem: true,
    content: `Professional e-commerce fashion photography, {{description}}. Clean white background, studio lighting, sharp focus on fabric texture and details. {{style}} aesthetic, 9:16 vertical format for social media. High resolution, commercial quality, Amazon/TikTok Shop ready.`,
    variables: [
      createVariable('description'),
      createVariable('style'),
    ],
  },
  {
    name: 'Street Style Influencer',
    description: 'Template cho street style content',
    type: 'image',
    provider: 'gemini-native',
    isSystem: true,
    content: `Street style fashion photography, Vietnamese influencer vibe. {{description}}. {{hair_style}} with {{hair_acc}}, {{makeup}} makeup. {{outerwear}} layered over {{top_detail}} in {{material}}. {{bottom_type}} styled with {{legwear}}. {{shoes}} footwear. URBAN SETTING: {{scene}}, {{lighting}}. {{expression}} expression. {{style}} aesthetic, Instagram feed quality, 4k resolution.`,
    variables: [
      createVariable('description'),
      createVariable('hair_style'),
      createVariable('hair_acc'),
      createVariable('makeup'),
      createVariable('outerwear'),
      createVariable('top_detail'),
      createVariable('material'),
      createVariable('bottom_type'),
      createVariable('legwear'),
      createVariable('shoes'),
      createVariable('scene'),
      createVariable('lighting'),
      createVariable('expression'),
      createVariable('style'),
    ],
  },
];

async function seedTemplates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing system templates
    await PromptTemplate.deleteMany({ isSystem: true });
    console.log('🗑️ Cleared existing system templates');

    // Insert new templates
    const inserted = await PromptTemplate.insertMany(defaultTemplates);
    console.log(`✅ Inserted ${inserted.length} default templates:`);
    inserted.forEach((t) => console.log(`   - ${t.name} (${t.type})`));

    console.log('\n🎯 Fashion Options Available:');
    Object.keys(FASHION_OPTIONS).forEach((key) => {
      const opt = FASHION_OPTIONS[key];
      console.log(`   ${key}: ${opt.options.length} options`);
    });

    console.log('\n✅ Seed completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
}

// Export for use in other modules (FASHION_OPTIONS already exported above)

seedTemplates();
