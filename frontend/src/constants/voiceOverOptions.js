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
// Source: https://ai.google.dev/gemini-api/docs/speech-generation (30 prebuilt voices)
// IMPORTANT: Voice names must be LOWERCASE when sent to API
export const GOOGLE_VOICES = {
  male: [
    {
      id: 'puck',
      name: 'Puck',
      gender: 'male',
      description: 'Upbeat, energetic voice. Great for sales and promotional content.',
      characteristics: ['energetic', 'upbeat', 'engaging'],
      useCase: 'Sales, product promotion, TikTok',
      language: ['en', 'vi'],
      sampleRate: 24000,
    },
    {
      id: 'charon',
      name: 'Charon',
      gender: 'male',
      description: 'Informative, authoritative voice. Professional and trustworthy.',
      characteristics: ['informative', 'authoritative', 'professional'],
      useCase: 'Premium products, formal content, serious storytelling',
      language: ['en', 'vi'],
      sampleRate: 24000,
    },
    {
      id: 'fenrir',
      name: 'Fenrir',
      gender: 'male',
      description: 'Excitable, dynamic voice. Perfect for energetic content.',
      characteristics: ['excitable', 'dynamic', 'energetic'],
      useCase: 'High-energy promotions, viral content, trending topics',
      language: ['en', 'vi'],
      sampleRate: 24000,
    },
    {
      id: 'kore',
      name: 'Kore',
      gender: 'male',
      description: 'Firm, clear voice. Excellent for authoritative messaging.',
      characteristics: ['firm', 'clear', 'strong'],
      useCase: 'Technical content, tutorials, confident messaging',
      language: ['en', 'vi'],
      sampleRate: 24000,
    },
    {
      id: 'leda',
      name: 'Leda',
      gender: 'male',
      description: 'Youthful, fresh voice. Good for younger audiences.',
      characteristics: ['youthful', 'fresh', 'friendly'],
      useCase: 'Youth-oriented content, casual reviews, lifestyle',
      language: ['en', 'vi'],
      sampleRate: 24000,
    },
    {
      id: 'orus',
      name: 'Orus',
      gender: 'male',
      description: 'Firm, stable voice. Great for reliable, trustworthy messaging.',
      characteristics: ['firm', 'stable', 'reliable'],
      useCase: 'Security products, trust-building, testimonials',
      language: ['en', 'vi'],
      sampleRate: 24000,
    },
    {
      id: 'achird',
      name: 'Achird',
      gender: 'male',
      description: 'Friendly, warm voice. Perfect for casual conversations.',
      characteristics: ['friendly', 'warm', 'approachable'],
      useCase: 'Casual reviews, friendly recommendations, storytelling',
      language: ['en', 'vi'],
      sampleRate: 24000,
    },
    {
      id: 'achenar',
      name: 'Achenar',
      gender: 'male',
      description: 'Soft, gentle voice. Great for calm, relaxing content.',
      characteristics: ['soft', 'gentle', 'soothing'],
      useCase: 'Wellness products, guided content, premium positioning',
      language: ['en', 'vi'],
      sampleRate: 24000,
    },
    {
      id: 'iapetus',
      name: 'Iapetus',
      gender: 'male',
      description: 'Clear, bright voice. Excellent for clear communication.',
      characteristics: ['clear', 'bright', 'articulate'],
      useCase: 'Educational content, tutorials, informative videos',
      language: ['en', 'vi'],
      sampleRate: 24000,
    },
    {
      id: 'schedar',
      name: 'Schedar',
      gender: 'male',
      description: 'Even, balanced voice. Good for neutral, professional tone.',
      characteristics: ['even', 'balanced', 'professional'],
      useCase: 'Corporate content, neutral storytelling, documentation',
      language: ['en', 'vi'],
      sampleRate: 24000,
    },
    {
      id: 'rasalgethi',
      name: 'Rasalgethi',
      gender: 'male',
      description: 'Informative, narrative voice. Perfect for storytelling.',
      characteristics: ['informative', 'narrative', 'engaging'],
      useCase: 'Brand storytelling, product narratives, testimonials',
      language: ['en', 'vi'],
      sampleRate: 24000,
    },
    {
      id: 'sulafat',
      name: 'Sulafat',
      gender: 'male',
      description: 'Warm, comforting voice. Great for emotional connection.',
      characteristics: ['warm', 'comforting', 'empathetic'],
      useCase: 'Lifestyle products, emotional storytelling, community-building',
      language: ['en', 'vi'],
      sampleRate: 24000,
    },
  ],
  female: [
    {
      id: 'aoede',
      name: 'Aoede',
      gender: 'female',
      description: 'Breezy, energetic voice. Perfect for trend-focused content.',
      characteristics: ['breezy', 'energetic', 'youthful'],
      useCase: 'Fashion, beauty, TikTok content, trending products',
      language: ['en', 'vi'],
      sampleRate: 24000,
    },
    {
      id: 'enceladus',
      name: 'Enceladus',
      gender: 'female',
      description: 'Breathy, soft voice. Great for premium, luxury content.',
      characteristics: ['breathy', 'soft', 'intimate'],
      useCase: 'Luxury products, ASMR-style, premium positioning',
      language: ['en', 'vi'],
      sampleRate: 24000,
    },
    {
      id: 'autonoe',
      name: 'Autonoe',
      gender: 'female',
      description: 'Bright, cheerful voice. Ideal for upbeat promotions.',
      characteristics: ['bright', 'cheerful', 'positive'],
      useCase: 'Fun content, enthusiastic reviews, playful messaging',
      language: ['en', 'vi'],
      sampleRate: 24000,
    },
    {
      id: 'callirrhoe',
      name: 'Callirrhoe',
      gender: 'female',
      description: 'Easy-going, relaxed voice. Perfect for casual content.',
      characteristics: ['easy-going', 'relaxed', 'friendly'],
      useCase: 'Casual reviews, relaxed storytelling, lifestyle',
      language: ['en', 'vi'],
      sampleRate: 24000,
    },
    {
      id: 'despina',
      name: 'Despina',
      gender: 'female',
      description: 'Smooth, polished voice. Excellent for professional content.',
      characteristics: ['smooth', 'polished', 'professional'],
      useCase: 'Professional tutorials, technical content, corporate',
      language: ['en', 'vi'],
      sampleRate: 24000,
    },
    {
      id: 'erinome',
      name: 'Erinome',
      gender: 'female',
      description: 'Clear, articulate voice. Great for clear communication.',
      characteristics: ['clear', 'articulate', 'precise'],
      useCase: 'Educational content, instructions, informative videos',
      language: ['en', 'vi'],
      sampleRate: 24000,
    },
    {
      id: 'algieba',
      name: 'Algieba',
      gender: 'female',
      description: 'Smooth, flowing voice. Perfect for narrative content.',
      characteristics: ['smooth', 'flowing', 'melodic'],
      useCase: 'Storytelling, brand narratives, emotional connections',
      language: ['en', 'vi'],
      sampleRate: 24000,
    },
    {
      id: 'algenib',
      name: 'Algenib',
      gender: 'female',
      description: 'Gravelly, textured voice. Unique character for distinctive messaging.',
      characteristics: ['gravelly', 'textured', 'distinctive'],
      useCase: 'Alternative/indie brands, bold messaging, unique positioning',
      language: ['en', 'vi'],
      sampleRate: 24000,
    },
    {
      id: 'laomedeia',
      name: 'Laomedeia',
      gender: 'female',
      description: 'Upbeat, lively voice. Great for energetic sales content.',
      characteristics: ['upbeat', 'lively', 'enthusiastic'],
      useCase: 'Product sales, promotional content, energetic messaging',
      language: ['en', 'vi'],
      sampleRate: 24000,
    },
    {
      id: 'achernar',
      name: 'Achernar',
      gender: 'female',
      description: 'Soft, delicate voice. Perfect for gentle, caring messaging.',
      characteristics: ['soft', 'delicate', 'gentle'],
      useCase: 'Health/wellness, beauty products, nurturing content',
      language: ['en', 'vi'],
      sampleRate: 24000,
    },
    {
      id: 'alnilam',
      name: 'Alnilam',
      gender: 'female',
      description: 'Firm, confident voice. Excellent for authoritative messaging.',
      characteristics: ['firm', 'confident', 'authoritative'],
      useCase: 'Professional services, expertise demonstration, leadership',
      language: ['en', 'vi'],
      sampleRate: 24000,
    },
    {
      id: 'gacrux',
      name: 'Gacrux',
      gender: 'female',
      description: 'Mature, experienced voice. Great for credibility and trust.',
      characteristics: ['mature', 'experienced', 'trustworthy'],
      useCase: 'Premium brands, wisdom-based content, mature audiences',
      language: ['en', 'vi'],
      sampleRate: 24000,
    },
    {
      id: 'pulcherrima',
      name: 'Pulcherrima',
      gender: 'female',
      description: 'Forward, confident voice. Perfect for bold, assertive messaging.',
      characteristics: ['forward', 'confident', 'assertive'],
      useCase: 'Empowerment content, bold statements, strong calls-to-action',
      language: ['en', 'vi'],
      sampleRate: 24000,
    },
    {
      id: 'umbriel',
      name: 'Umbriel',
      gender: 'female',
      description: 'Easy-going, laid-back voice. Good for relaxed, casual tone.',
      characteristics: ['easy-going', 'laid-back', 'casual'],
      useCase: 'Casual lifestyle, relaxed reviews, friendly chat',
      language: ['en', 'vi'],
      sampleRate: 24000,
    },
    {
      id: 'vindemiatrix',
      name: 'Vindemiatrix',
      gender: 'female',
      description: 'Gentle, soothing voice. Perfect for calming, comforting content.',
      characteristics: ['gentle', 'soothing', 'comforting'],
      useCase: 'Wellness, meditation, relaxation products',
      language: ['en', 'vi'],
      sampleRate: 24000,
    },
    {
      id: 'zephyr',
      name: 'Zephyr',
      gender: 'female',
      description: 'Bright, warm voice. Excellent for welcoming, approachable messaging.',
      characteristics: ['bright', 'warm', 'welcoming'],
      useCase: 'Community building, inclusive messaging, friendly tone',
      language: ['en', 'vi'],
      sampleRate: 24000,
    },
    {
      id: 'sadachbia',
      name: 'Sadachbia',
      gender: 'female',
      description: 'Lively, vibrant voice. Great for energetic, dynamic content.',
      characteristics: ['lively', 'vibrant', 'dynamic'],
      useCase: 'Event promotion, exciting announcements, high-energy content',
      language: ['en', 'vi'],
      sampleRate: 24000,
    },
    {
      id: 'sadaltager',
      name: 'Sadaltager',
      gender: 'female',
      description: 'Knowledgeable, expert voice. Perfect for educational authority.',
      characteristics: ['knowledgeable', 'expert', 'authoritative'],
      useCase: 'How-to guides, expert advice, educational content',
      language: ['en', 'vi'],
      sampleRate: 24000,
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
