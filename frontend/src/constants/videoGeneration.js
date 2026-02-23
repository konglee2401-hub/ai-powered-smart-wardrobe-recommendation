/**
 * Video Generation Constants
 * Shared configuration for both frontend and backend
 * 
 * Updated to support multi-video generation with content use cases
 * and provider-specific constraints
 */

// ===== VIDEO PROVIDER CONSTRAINTS =====
export const VIDEO_PROVIDER_LIMITS = {
  'grok': {
    maxDurationPerVideo: 10,
    maxDurationTotal: 40,
    description: 'Grok supports max 10 seconds per video clip',
  },
  'google-flow': {
    maxDurationPerVideo: 6,
    maxDurationTotal: 30,
    description: 'Google Flow supports max 6 seconds per video clip',
  }
};

// Helper function to calculate video count based on provider and total duration
export const calculateVideoCount = (provider, totalDuration) => {
  const limits = VIDEO_PROVIDER_LIMITS[provider] || VIDEO_PROVIDER_LIMITS['grok'];
  const maxPerVideo = limits.maxDurationPerVideo;
  return Math.ceil(totalDuration / maxPerVideo);
};

// Helper function to get max allowed duration for a provider
export const getMaxDurationForProvider = (provider) => {
  const limits = VIDEO_PROVIDER_LIMITS[provider] || VIDEO_PROVIDER_LIMITS['grok'];
  return limits.maxDurationTotal;
};

// ===== DURATION & SEGMENT CONFIGURATIONS =====
export const VIDEO_DURATIONS = [
  { value: 10, label: '10 seconds', segments: 1, segmentDuration: 10 },
  { value: 20, label: '20 seconds', segments: 2, segmentDuration: 10 },
  { value: 30, label: '30 seconds', segments: 3, segmentDuration: 10 },
  { value: 40, label: '40 seconds', segments: 4, segmentDuration: 10 },
];

export const SEGMENT_DURATION = 10; // Each segment is 10 seconds

// Get durations available for a specific provider
export const getAvailableDurations = (provider) => {
  const maxDuration = getMaxDurationForProvider(provider);
  return VIDEO_DURATIONS.filter(d => d.value <= maxDuration);
};

// ===== CONTENT USE CASES FOR MULTI-VIDEO GENERATION =====
export const CONTENT_USE_CASES = {
  'change-clothes': {
    value: 'change-clothes',
    name: 'Clothing Transition',
    emoji: '🔄',
    description: 'Generate videos showing outfit change from old to new',
    videoCount: 2,
    frameChaining: true,  // Use end frame of video 1 as context for video 2
    aspectRatio: '9:16',
    defaultDuration: 20,
    segments: [
      {
        index: 1,
        title: 'Original Outfit',
        description: 'Character in current/original outfit',
        promptTemplate: 'Professional video of model wearing {outfit1}. {scene}. {mood}. {cameraAngle}. Duration: {duration}s. High quality fashion video.'
      },
      {
        index: 2,
        title: 'New Outfit',
        description: 'Character wearing new outfit after transition',
        promptTemplate: 'Model now wearing {outfit2}. Professional fashion showcase. {scene}. {mood}. {cameraAngle}. Duration: {duration}s.'
      }
    ],
    refImageRequired: true,
    promptSource: 'chatgpt'  // Generate segment prompts via ChatGPT
  },

  'product-showcase': {
    value: 'product-showcase',
    name: 'Product Showcase',
    emoji: '✨',
    description: 'Showcase product through multiple angles and features',
    videoCount: 3,
    frameChaining: false,
    aspectRatio: '16:9',
    defaultDuration: 30,
    segments: [
      {
        index: 1,
        title: 'Product Intro',
        description: 'Initial product introduction and overview',
        promptTemplate: 'Introducing {product}. Professional product showcase. Front view. {lighting}. {mood}. Duration: {duration}s.'
      },
      {
        index: 2,
        title: 'Features & Details',
        description: 'Highlighting key features and details',
        promptTemplate: 'Detailed view of {product} features. Close-ups of key details. {lighting}. Professional quality. Duration: {duration}s.'
      },
      {
        index: 3,
        title: 'In Action',
        description: 'Product in use or final showcase',
        promptTemplate: '{product} in action. Lifestyle use. {scene}. Professional video. Duration: {duration}s.'
      }
    ],
    refImageRequired: false,
    promptSource: 'chatgpt'
  },

  'styling-guide': {
    value: 'styling-guide',
    name: 'Styling Guide',
    emoji: '👗',
    description: 'Step-by-step styling guide with frame continuity',
    videoCount: 3,
    frameChaining: true,
    aspectRatio: '9:16',
    defaultDuration: 30,
    segments: [
      {
        index: 1,
        title: 'Complete Look',
        description: 'Full outfit overview',
        promptTemplate: 'Model displaying complete outfit. Full body shot. {mood}. {cameraAngle}. Duration: {duration}s.'
      },
      {
        index: 2,
        title: 'Top Styling',
        description: 'Focus on top/upper body styling',
        promptTemplate: 'Close-up of top styling. Hair, accessories, layering. {lighting}. Professional. Duration: {duration}s.'
      },
      {
        index: 3,
        title: 'Bottom Styling',
        description: 'Focus on bottoms and shoes',
        promptTemplate: 'Styling of bottoms and footwear. Shoe details, proportions. {lighting}. Duration: {duration}s.'
      }
    ],
    refImageRequired: true,
    promptSource: 'chatgpt'
  },

  'product-introduction': {
    value: 'product-introduction',
    name: 'Product Introduction',
    emoji: '👋',
    description: 'Natural introduction and presentation of product',
    videoCount: 2,
    frameChaining: false,
    aspectRatio: '16:9',
    defaultDuration: 20,
    segments: [
      {
        index: 1,
        title: 'Greeting & Intro',
        description: 'Natural greeting and introduction',
        promptTemplate: 'Friendly introduction of {product}. Warm, welcoming tone. {lighting}. {mood}. Duration: {duration}s.'
      },
      {
        index: 2,
        title: 'Benefits & Features',
        description: 'Highlight benefits and key features',
        promptTemplate: 'Why {product} is amazing. Highlight benefits and features. Enthusiastic. {mood}. Duration: {duration}s.'
      }
    ],
    refImageRequired: false,
    promptSource: 'chatgpt'
  },

  'style-transformation': {
    value: 'style-transformation',
    name: 'Style Transformation',
    emoji: '✨',
    description: 'Show transformation from casual to formal or vice versa',
    videoCount: 2,
    frameChaining: true,
    aspectRatio: '9:16',
    defaultDuration: 20,
    segments: [
      {
        index: 1,
        title: 'Before Styling',
        description: 'Initial casual/formal style',
        promptTemplate: 'Model in {style1} outfit. {scene}. {mood}. Professional video. Duration: {duration}s.'
      },
      {
        index: 2,
        title: 'After Styling',
        description: 'Transformed to opposite style',
        promptTemplate: 'Same model now in {style2} outfit. Stylish transformation. {scene}. {mood}. Duration: {duration}s.'
      }
    ],
    refImageRequired: true,
    promptSource: 'chatgpt'
  }
};

// ===== VIDEO SCENARIOS (TRADITIONAL SCRIPT-BASED) =====
export const VIDEO_SCENARIOS = [
  { 
    value: 'dancing', 
    label: '💃 Dancing / Movement', 
    description: 'Person dancing or moving in the outfit',
    scriptTemplate: [
      'Person dancing energetically in outfit, full body movement',
      'Close-up of outfit details while dancing',
      'Wide shot showing the complete look in motion'
    ],
    isTraditional: true  // Uses script-based prompts, not ChatGPT
  },
  { 
    value: 'product-intro', 
    label: '👕 Product Introduction', 
    description: 'Presenting and showcasing the product',
    scriptTemplate: [
      'Introduce the product with a smile, rotate to show front',
      'Show the details and key features up close',
      'Full outfit reveal and final pose'
    ],
    isTraditional: true
  },
  { 
    value: 'lifestyle', 
    label: '🏃 Lifestyle Showcase', 
    description: 'Wearing outfit in daily activities',
    scriptTemplate: [
      'Walking casually in everyday setting',
      'Sitting or posing naturally in the outfit',
      'Standing confidently showing the complete look'
    ],
    isTraditional: true
  },
  { 
    value: 'lip-sync', 
    label: '🎤 Lip Sync / Speaking', 
    description: 'Lip sync to music or speaking dialogue',
    scriptTemplate: [
      'Person speaking or lip syncing with expression',
      'Change expression and emotion while speaking',
      'Final pose with confident expression'
    ],
    isTraditional: true
  },
  { 
    value: 'fashion-walk', 
    label: '👠 Fashion Walk', 
    description: 'Runway-style fashion walk',
    scriptTemplate: [
      'Walking towards camera in fashion runway style',
      'Turn and walk away showing back view',
      'Return and final pose at camera with confidence'
    ],
    isTraditional: true
  },
  {
    value: 'transition',
    label: '🔄 Clothing Transition',
    description: 'Transition between looks or styling details',
    scriptTemplate: [
      'Start in initial outfit pose',
      'Transition or gesture showing outfit change',
      'Final look reveal in new styling'
    ],
    isTraditional: true
  }
];

// ===== HELPER FUNCTIONS =====
export const getScenarioByValue = (value) => {
  return VIDEO_SCENARIOS.find(s => s.value === value);
};

export const getDurationByValue = (value) => {
  return VIDEO_DURATIONS.find(d => d.value === value);
};

export const getSegmentCount = (duration) => {
  const d = getDurationByValue(duration);
  return d?.segments || 3;
};

export const getContentUseCase = (useCase) => {
  return CONTENT_USE_CASES[useCase];
};

export const getAllUseCases = () => {
  return Object.values(CONTENT_USE_CASES);
};

export const getUseCaseByValue = (value) => {
  return CONTENT_USE_CASES[value];
};
