/**
 * VoiceOver Generation Constants
 * Comprehensive configuration for Google Gemini TTS voices and generation settings
 */

// ===== GENDER OPTIONS =====
export const GENDER_OPTIONS = [
  { id: 'male', label: 'Nam (Male)', emoji: '👨' },
  { id: 'female', label: 'Nữ (Female)', emoji: '👩' },
];

// ===== LANGUAGE OPTIONS =====
export const LANGUAGE_OPTIONS = [
  { id: 'vi', label: 'Tiếng Việt', emoji: '🇻🇳', code: 'VI' },
  { id: 'en', label: 'Tiếng Anh', emoji: '🇬🇧', code: 'EN' },
];

// ===== READING STYLE OPTIONS =====
export const READING_STYLES = [
  {
    id: 'tiktok-sales',
    label: 'TikTok Bán Hàng',
    emoji: '📱',
    description: 'Energetic, engaging tone for TikTok product sales. Fast-paced with enthusiasm.',
    duration: 'medium', // 15-30 seconds
    tone: 'upbeat, friendly, persuasive',
    promptTemplate: `Write a TikTok sales script for {product}. 
- Very engaging and energetic tone
- Include product benefits concisely
- Add call-to-action at the end
- Keep it between 15-30 seconds when read naturally
- Use trend-relevant language and emojis in description
- Appeal to young audience (18-35 years old)`
  },
  {
    id: 'facebook-voiceover',
    label: 'Facebook Reels Lồng Tiếng',
    emoji: '🎬',
    description: 'Professional narration for Facebook Reels. Smooth, storytelling approach.',
    duration: 'medium', // 20-40 seconds
    tone: 'warm, professional, narrative',
    promptTemplate: `Write a Facebook Reels voiceover script for {product}.
- Professional but warm storytelling tone
- Create narrative around product features and lifestyle
- Build emotional connection with audience
- Length: 20-40 seconds when read naturally
- Include product transition moments
- Address common customer concerns naturally`
  },
  {
    id: 'youtube-vietsub',
    label: 'YouTube Short Vietsub',
    emoji: '▶️',
    description: 'Clear subtitle-friendly narration for YouTube Shorts. Precise and informative.',
    duration: 'long', // 30-60 seconds
    tone: 'clear, informative, engaging',
    promptTemplate: `Write a YouTube Short script for {product} with Vietnamese subtitles in mind.
- Clear pronunciation and pacing for subtitle synchronization
- Detailed product information and benefits
- Include time for product showcase visuals
- Length: 30-60 seconds
- Structured with clear sections (intro, benefits, CTA)
- Make it easy to follow along with visuals`
  },
  {
    id: 'instagram-stories',
    label: 'Instagram Stories',
    emoji: '✨',
    description: 'Conversational tone for vertical format. Quick, punchy messaging.',
    duration: 'short', // 10-20 seconds
    tone: 'conversational, trendy, urgent',
    promptTemplate: `Write an Instagram Stories voiceover for {product}.
- Conversational, friend-to-friend tone
- Create FOMO (fear of missing out)
- Highlight unique selling points
- Length: 10-20 seconds
- Include limited availability messaging if applicable
- Use trendy language and casual phrasing`
  },
  {
    id: 'custom',
    label: 'Custom Style',
    emoji: '🎯',
    description: 'Define your own tone and requirements.',
    duration: 'custom',
    tone: 'custom',
    promptTemplate: null // User will provide custom prompt
  }
];

// ===== GOOGLE GEMINI TTS VOICES =====
// Source: https://ai.google.dev/api/rest/v1beta/models/generateContent#voiceconfig
export const GOOGLE_VOICES = {
  male: [
    {
      id: 'Puck',
      name: 'Puck',
      gender: 'male',
      description: 'Young, energetic male voice. Great for sales and promotional content.',
      characteristics: ['energetic', 'youthful', 'engaging'],
      useCase: 'Sales, product promotion, TikTok',
      language: ['en', 'vi'],
      sampleRate: 48000,
    },
    {
      id: 'Charon',
      name: 'Charon',
      gender: 'male',
      description: 'Deep, authoritative male voice. Professional and trustworthy.',
      characteristics: ['deep', 'authoritative', 'professional'],
      useCase: 'Premium products, luxury items, serious storytelling',
      language: ['en', 'vi'],
      sampleRate: 48000,
    },
    {
      id: 'Fenrir',
      name: 'Fenrir',
      gender: 'male',
      description: 'Smooth, calm male voice. Perfect for educational content.',
      characteristics: ['smooth', 'calm', 'clear'],
      useCase: 'Tutorials, how-to guides, educational',
      language: ['en', 'vi'],
      sampleRate: 48000,
    },
    {
      id: 'Kore',
      name: 'Kore',
      gender: 'male',
      description: 'Warm, friendly male voice. Excellent for casual storytelling.',
      characteristics: ['warm', 'friendly', 'approachable'],
      useCase: 'Casual reviews, lifestyle content, recommendations',
      language: ['en', 'vi'],
      sampleRate: 48000,
    },
  ],
  female: [
    {
      id: 'Aoede',
      name: 'Aoede',
      gender: 'female',
      description: 'Energetic, youthful female voice. Perfect for trend-focused content.',
      characteristics: ['energetic', 'youthful', 'trendy'],
      useCase: 'Fashion, beauty, TikTok content, sales',
      language: ['en', 'vi'],
      sampleRate: 48000,
    },
    {
      id: 'Breeze',
      name: 'Breeze',
      gender: 'female',
      description: 'Soft, gentle female voice. Great for relaxing, premium content.',
      characteristics: ['soft', 'gentle', 'soothing'],
      useCase: 'Wellness, luxury, meditation-style storytelling',
      language: ['en', 'vi'],
      sampleRate: 48000,
    },
    {
      id: 'Juniper',
      name: 'Juniper',
      gender: 'female',
      description: 'Bright, cheerful female voice. Ideal for upbeat product promotions.',
      characteristics: ['bright', 'cheerful', 'positive'],
      useCase: 'Kids products, fun content, enthusiastic reviews',
      language: ['en', 'vi'],
      sampleRate: 48000,
    },
    {
      id: 'Sage',
      name: 'Sage',
      gender: 'female',
      description: 'Professional, clear female voice. Excellent for tutorials and serious content.',
      characteristics: ['professional', 'clear', 'authoritative'],
      useCase: 'Professional tutorials, technical content, news-style',
      language: ['en', 'vi'],
      sampleRate: 48000,
    },
    {
      id: 'Ember',
      name: 'Ember',
      gender: 'female',
      description: 'Warm, confident female voice. Perfect for testimonials and storytelling.',
      characteristics: ['warm', 'confident', 'engaging'],
      useCase: 'Customer testimonials, brand storytelling, lifestyle',
      language: ['en', 'vi'],
      sampleRate: 48000,
    },
  ],
};

// Get voices by gender
export const getVoicesByGender = (genderId) => {
  return GOOGLE_VOICES[genderId] || [];
};

// Get all voices
export const getAllVoices = () => {
  return [...GOOGLE_VOICES.male, ...GOOGLE_VOICES.female];
};

// ===== TTS GENERATION SETTINGS =====
export const TTS_SETTINGS = {
  temperature: 1.1,
  model: 'gemini-2.5-pro-preview-tts',
  responseModalities: ['audio'],
  audioFormats: [
    { id: 'wav', label: 'WAV', mimeType: 'audio/wav', extension: 'wav' },
    { id: 'mp3', label: 'MP3', mimeType: 'audio/mpeg', extension: 'mp3' },
    { id: 'ogg', label: 'OGG', mimeType: 'audio/ogg', extension: 'ogg' },
  ],
};

// ===== UPLOAD SETTINGS =====
export const UPLOAD_SETTINGS = {
  maxVideoFiles: 5,
  maxVideoSize: 100 * 1024 * 1024, // 100MB per file
  maxProductImageSize: 10 * 1024 * 1024, // 10MB
  supportedVideoFormats: ['mp4', 'mov', 'avi', 'mkv', 'webm'],
  supportedImageFormats: ['jpg', 'jpeg', 'png', 'webp'],
};

// ===== PLATFORM-SPECIFIC CONFIGURATIONS =====
export const PLATFORM_CONFIGS = {
  'tiktok-sales': {
    maxDuration: 30,
    aspectRatio: '9:16',
    videoCountNeeded: true,
    productImageRecommended: true,
  },
  'facebook-voiceover': {
    maxDuration: 40,
    aspectRatio: '9:16',
    videoCountNeeded: true,
    productImageRecommended: true,
  },
  'youtube-vietsub': {
    maxDuration: 60,
    aspectRatio: '16:9',
    videoCountNeeded: true,
    productImageRecommended: false,
  },
  'instagram-stories': {
    maxDuration: 20,
    aspectRatio: '9:16',
    videoCountNeeded: true,
    productImageRecommended: true,
  },
};

// Product categories for script generation
export const PRODUCT_CATEGORIES = [
  { id: 'ao', label: 'Áo (Tops)', emoji: '👕' },
  { id: 'quan', label: 'Quần (Pants)', emoji: '👖' },
  { id: 'vay', label: 'Váy (Skirts)', emoji: '👗' },
  { id: 'giay', label: 'Giày (Shoes)', emoji: '👟' },
  { id: 'tui', label: 'Túi (Bags)', emoji: '👜' },
  { id: 'phu-kien', label: 'Phụ Kiện (Accessories)', emoji: '✨' },
  { id: 'khac', label: 'Khác (Other)', emoji: '🛍️' },
];
