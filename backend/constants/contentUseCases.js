/**
 * Content Use Cases - Backend Constants
 * Defines multi-video generation patterns for different use cases
 */

export const CONTENT_USE_CASES = {
  'change-clothes': {
    value: 'change-clothes',
    name: 'Clothing Transition',
    videoCount: 2,
    frameChaining: true,
    description: 'Generate videos showing outfit change from old to new',
    prompts: [
      {
        index: 1,
        role: 'Original Outfit',
        guidance: 'Show character in current/original outfit. Professional pose. Full body visible.',
        placeholders: ['{character}', '{outfit1}', '{scene}', '{mood}', '{lighting}', '{cameraAngle}', '{duration}']
      },
      {
        index: 2,
        role: 'New Outfit',
        guidance: 'Show character wearing new outfit. Smooth transition from video 1. Professional showcase.',
        placeholders: ['{character}', '{outfit2}', '{scene}', '{mood}', '{lighting}', '{cameraAngle}', '{duration}']
      }
    ],
    refImageRequired: true,
    generationPattern: 'sequential-with-frame-chaining'
  },

  'product-showcase': {
    value: 'product-showcase',
    name: 'Product Showcase',
    videoCount: 3,
    frameChaining: false,
    description: 'Showcase product through multiple angles and features',
    prompts: [
      {
        index: 1,
        role: 'Product Intro',
        guidance: 'Initial product introduction and overview. Front view. Professional presentation.',
        placeholders: ['{product}', '{productColor}', '{lighting}', '{mood}', '{duration}']
      },
      {
        index: 2,
        role: 'Features & Details',
        guidance: 'Highlight key features and details. Close-ups of interesting aspects.',
        placeholders: ['{product}', '{features}', '{materialDetails}', '{lighting}', '{duration}']
      },
      {
        index: 3,
        role: 'In Action',
        guidance: 'Product in use or lifestyle context. Final showcase. Confident closing.',
        placeholders: ['{product}', '{useCase}', '{scene}', '{mood}', '{duration}']
      }
    ],
    refImageRequired: false,
    generationPattern: 'sequential-independent'
  },

  'styling-guide': {
    value: 'styling-guide',
    name: 'Styling Guide',
    videoCount: 3,
    frameChaining: true,
    description: 'Step-by-step styling guide with frame continuity',
    prompts: [
      {
        index: 1,
        role: 'Complete Look',
        guidance: 'Full outfit overview. Show entire ensemble. Professional fashion video.',
        placeholders: ['{character}', '{outfit}', '{mood}', '{cameraAngle}', '{duration}']
      },
      {
        index: 2,
        role: 'Top Styling',
        guidance: 'Focus on top/upper body. Hair, accessories, layering details. Continue from video 1.',
        placeholders: ['{character}', '{top}', '{accessories}', '{lighting}', '{duration}']
      },
      {
        index: 3,
        role: 'Bottom Styling',
        guidance: 'Focus on bottoms and shoes. Proportions and styling. Continue naturally.',
        placeholders: ['{character}', '{bottom}', '{shoes}', '{lighting}', '{duration}']
      }
    ],
    refImageRequired: true,
    generationPattern: 'sequential-with-frame-chaining'
  },

  'product-introduction': {
    value: 'product-introduction',
    name: 'Product Introduction',
    videoCount: 2,
    frameChaining: false,
    description: 'Natural introduction and presentation of product',
    prompts: [
      {
        index: 1,
        role: 'Greeting & Intro',
        guidance: 'Friendly, natural introduction. Warm tone. Welcome the audience.',
        placeholders: ['{product}', '{productName}', '{tone}', '{lighting}', '{mood}', '{duration}']
      },
      {
        index: 2,
        role: 'Benefits & Features',
        guidance: 'Highlight key benefits and why this product matters. Enthusiastic and convincing.',
        placeholders: ['{product}', '{benefits}', '{uniqueFeatures}', '{motionStyle}', '{duration}']
      }
    ],
    refImageRequired: false,
    generationPattern: 'sequential-independent'
  },

  'style-transformation': {
    value: 'style-transformation',
    name: 'Style Transformation',
    videoCount: 2,
    frameChaining: true,
    description: 'Show transformation from casual to formal or vice versa',
    prompts: [
      {
        index: 1,
        role: 'Before Styling',
        guidance: 'Initial style presentation. Either casual or formal. Natural pose.',
        placeholders: ['{character}', '{style1}', '{outfit1}', '{mood}', '{scene}', '{duration}']
      },
      {
        index: 2,
        role: 'After Styling',
        guidance: 'Transformed style. Same character, different aesthetic. Smooth transition.',
        placeholders: ['{character}', '{style2}', '{outfit2}', '{mood}', '{scene}', '{duration}']
      }
    ],
    refImageRequired: true,
    generationPattern: 'sequential-with-frame-chaining'
  }
};

/**
 * Get use case configuration by value
 */
export const getUseCase = (useCaseValue) => {
  return CONTENT_USE_CASES[useCaseValue];
};

/**
 * Validate if use case exists and is properly configured
 */
export const isValidUseCase = (useCaseValue) => {
  const useCase = CONTENT_USE_CASES[useCaseValue];
  return useCase && 
         useCase.videoCount > 0 && 
         useCase.prompts && 
         useCase.prompts.length === useCase.videoCount;
};

/**
 * Get all use cases
 */
export const getAllUseCases = () => {
  return Object.values(CONTENT_USE_CASES);
};

/**
 * Calculate video duration per segment
 */
export const getSegmentDuration = (totalDuration, videoCount) => {
  return Math.ceil(totalDuration / videoCount);
};

/**
 * Get prompt template for specific segment
 */
export const getSegmentPrompt = (useCaseValue, segmentIndex) => {
  const useCase = CONTENT_USE_CASES[useCaseValue];
  if (!useCase || !useCase.prompts) {
    return null;
  }
  return useCase.prompts.find(p => p.index === segmentIndex + 1);
};

/**
 * Check if use case requires frame chaining
 */
export const requiresFrameChaining = (useCaseValue) => {
  const useCase = CONTENT_USE_CASES[useCaseValue];
  return useCase && useCase.frameChaining === true;
};

/**
 * Check if reference image is required
 */
export const requiresRefImage = (useCaseValue) => {
  const useCase = CONTENT_USE_CASES[useCaseValue];
  return useCase && useCase.refImageRequired === true;
};
