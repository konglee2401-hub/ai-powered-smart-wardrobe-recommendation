/**
 * Advanced Prompt Generation with Use Case Flexibility
 * Handles different use cases with intelligent prompt templates
 */

// Image naming convention for reference tracking
const generateImageName = (type, timestamp = Date.now()) => {
  const typeMap = {
    'character': 'character',
    'product': 'product',
    'reference': 'reference'
  };
  return `${typeMap[type] || type}-image-${timestamp}`;
};

// Use Case Specific Prompt Builders
const PROMPT_BUILDERS = {
  'change-clothes': {
    description: 'Trang phục được mặc lên người mẫu',
    buildPrompt: (options, images = {}) => {
      const characterName = images.characterName || generateImageName('character');
      const productName = images.productName || generateImageName('product');
      
      const positivePrompt = [
        `A stunning fashion model wearing [PRODUCT_DESCRIPTION]`,
        `exact same face from ${characterName}, exactly matching facial features and expression`,
        `body and face from reference character image ${characterName}`,
        `wearing the [PRODUCT_NAME] shown in reference image ${productName}`,
        options.scene && `in a ${options.scene} setting`,
        options.lighting && `with ${options.lighting} lighting`,
        options.mood && `exuding ${options.mood} confidence`,
        options.style && `${options.style} photography aesthetic`,
        options.colorPalette && `${options.colorPalette} color scheme`,
        `perfect product placement, well-fitted garment`,
        `professional fashion photography, high quality, sharp details`,
        `magazine-ready, well-composed, perfect lighting`
      ].filter(Boolean).join(', ');

      const negativePrompt = [
        'blurry, out of focus, distorted face, different facial features',
        'multiple people, cloned faces, inconsistent expression',
        'ill-fitting clothes, wrinkled, poorly placed product',
        'bad lighting, overexposed, underexposed, harsh shadows',
        'amateur, low quality, watermark, cropped, masked areas'
      ].join(', ');

      return {
        positive: positivePrompt,
        negative: negativePrompt,
        imageReferences: {
          characterImage: {
            name: characterName,
            role: 'Provides exact facial features and body pose',
            instructions: 'Ensure same face, same eyes, same expression'
          },
          productImage: {
            name: productName,
            role: 'Provides product design and details',
            instructions: 'Place product exactly as shown in reference'
          }
        }
      };
    }
  },

  'ecommerce-product': {
    description: 'Ảnh sản phẩm thương mại điện tử',
    buildPrompt: (options, images = {}) => {
      const productName = images.productName || generateImageName('product');
      
      const positivePrompt = [
        `Professional e-commerce product photography`,
        `[PRODUCT_DESCRIPTION] from reference image ${productName}`,
        `beautifully displayed and presented`,
        options.scene && `on a ${options.scene} backdrop`,
        options.lighting && `${options.lighting} product lighting`,
        options.colorPalette && `${options.colorPalette} color environment`,
        options.style && `${options.style} product style`,
        `perfect focus on product details`,
        `studio quality, sharp, professional`,
        `commercial ready, e-commerce optimized`,
        `balanced composition, excellent product visibility`
      ].filter(Boolean).join(', ');

      const negativePrompt = [
        'people, human, face, person, model, hands',
        'shadows, blur, distortion, poor lighting',
        'cluttered background, distracting elements',
        'low quality, amateur, watermark, logos'
      ].join(', ');

      return {
        positive: positivePrompt,
        negative: negativePrompt,
        imageReferences: {
          productImage: {
            name: productName,
            role: 'Product reference for design and details',
            instructions: 'Replicate exact product appearance'
          }
        }
      };
    }
  },

  'social-media': {
    description: 'Nội dung mạng xã hội',
    buildPrompt: (options, images = {}) => {
      const characterName = images.characterName || generateImageName('character');
      
      const positivePrompt = [
        `Attractive person wearing [PRODUCT_DESCRIPTION]`,
        `from character reference ${characterName}`,
        options.mood && `with a ${options.mood} expression`,
        options.scene && `in a ${options.scene} location`,
        options.lighting && `${options.lighting} lighting`,
        options.style && `${options.style} aesthetic`,
        options.colorPalette && `${options.colorPalette} color grading`,
        `Instagram-ready, social media optimized`,
        `vibrant, engaging, eye-catching`,
        `professional quality, sharp focus`,
        `trending fashion content style`
      ].filter(Boolean).join(', ');

      const negativePrompt = [
        'blurry, low resolution, pixelated',
        'watermark, filters, amateur edit',
        'awkward pose, unflattering angle',
        'inconsistent lighting, bad quality',
        'multiple people, confusing composition'
      ].join(', ');

      return {
        positive: positivePrompt,
        negative: negativePrompt,
        imageReferences: {
          characterImage: {
            name: characterName,
            role: 'Character reference for appearance',
            instructions: 'Maintain consistent appearance'
          }
        }
      };
    }
  },

  'fashion-editorial': {
    description: 'Bài báo thời trang chuyên nghiệp',
    buildPrompt: (options, images = {}) => {
      const characterName = images.characterName || generateImageName('character');
      
      const positivePrompt = [
        `High fashion editorial photography`,
        `stunning model from reference ${characterName}`,
        `wearing [PRODUCT_DESCRIPTION]`,
        options.mood && `${options.mood} expression and pose`,
        options.scene && `in an editorial ${options.scene}`,
        options.lighting && `${options.lighting} artistic lighting`,
        options.style && `${options.style} photography style`,
        options.colorPalette && `${options.colorPalette} color grading`,
        `magazine cover quality, artistic composition`,
        `dramatic, fashion-forward, editorial style`,
        `professional lighting, beautiful styling`
      ].filter(Boolean).join(', ');

      const negativePrompt = [
        'casual, amateur, unprofessional',
        'blurry, unfocused, poor composition',
        'bad lighting, flat, uninspiring',
        'commercial style, simple background',
        'low quality, watermark, text overlay'
      ].join(', ');

      return {
        positive: positivePrompt,
        negative: negativePrompt,
        imageReferences: {
          characterImage: {
            name: characterName,
            role: 'Model reference for editorial shoot',
            instructions: 'Maintain model consistency and editorial quality'
          }
        }
      };
    }
  },

  'lifestyle-scene': {
    description: 'Cảnh sống hàng ngày',
    buildPrompt: (options, images = {}) => {
      const characterName = images.characterName || generateImageName('character');
      
      const positivePrompt = [
        `Person from reference ${characterName} wearing [PRODUCT_DESCRIPTION]`,
        `in a lifestyle scene`,
        options.scene && `${options.scene} lifestyle setting`,
        options.mood && `with a ${options.mood} atmosphere`,
        options.lighting && `${options.lighting} natural lighting`,
        options.style && `${options.style} lifestyle aesthetic`,
        options.colorPalette && `${options.colorPalette} natural colors`,
        `authentic, relatable, candid moment`,
        `lifestyle photography, real-world context`,
        `professional quality, well-lit, engaging scene`,
        `natural pose, genuine expression`
      ].filter(Boolean).join(', ');

      const negativePrompt = [
        'studio setup, static pose, stiff',
        'artificial, unnatural, fake looking',
        'blurry, low quality, poor lighting',
        'overly edited, filtered, fake aesthetic',
        'distracting elements, cluttered scene'
      ].join(', ');

      return {
        positive: positivePrompt,
        negative: negativePrompt,
        imageReferences: {
          characterImage: {
            name: characterName,
            role: 'Character reference for lifestyle context',
            instructions: 'Maintain character appearance in lifestyle setting'
          }
        }
      };
    }
  },

  'before-after': {
    description: 'So sánh trước/sau',
    buildPrompt: (options, images = {}) => {
      const characterName = images.characterName || generateImageName('character');
      const productName = images.productName || generateImageName('product');
      
      const positivePrompt = [
        `Before and after transformation showcase`,
        `person from reference ${characterName}`,
        `wearing [PRODUCT_DESCRIPTION] from ${productName}`,
        `transformation visible in appearance`,
        options.mood && `${options.mood} confident after look`,
        options.scene && `${options.scene} setting`,
        options.lighting && `${options.lighting} lighting`,
        options.style && `${options.style} photography`,
        `side-by-side comparison, before and after`,
        `professional comparison photography`,
        `clear transformation demonstration`
      ].filter(Boolean).join(', ');

      const negativePrompt = [
        'blurry, low quality, unclear',
        'unflattering angles, poor composition',
        'bad lighting, inconsistent exposure',
        'fake comparison, misleading',
        'low resolution, watermark'
      ].join(', ');

      return {
        positive: positivePrompt,
        negative: negativePrompt,
        imageReferences: {
          characterImage: {
            name: characterName,
            role: 'Before state reference'
          },
          productImage: {
            name: productName,
            role: 'Product for transformation'
          }
        }
      };
    }
  }
};

// Main Prompt Generator Function
export const generateAdvancedPrompt = (useCase, options = {}, images = {}) => {
  const builder = PROMPT_BUILDERS[useCase] || PROMPT_BUILDERS['change-clothes'];
  return builder.buildPrompt(options, images);
};

// Get use case information
export const getUseCaseInfo = (useCase) => {
  return PROMPT_BUILDERS[useCase]?.description || 'Unknown use case';
};

// Get all use cases
export const getAllUseCases = () => {
  return Object.entries(PROMPT_BUILDERS).map(([key, builder]) => ({
    value: key,
    label: key
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' '),
    description: builder.description
  }));
};

// Export utility functions
export { generateImageName };
