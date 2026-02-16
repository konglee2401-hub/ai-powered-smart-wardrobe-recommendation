/**
 * Smart Provider Selector
 * 
 * FIXES THE BUG: Selecting providers without checking API keys!
 * 
 * NEW FEATURES:
 * - Check API key availability BEFORE selecting provider
 * - Filter by feature support (negative prompt, image size, etc.)
 * - Smart fallback chain
 * - Cost optimization
 * - Performance-based ranking
 */

import { getKeyManager } from '../utils/keyManager.js';

// ============================================================
// PROVIDER CONFIGURATION
// ============================================================

const PROVIDER_CONFIG = {
  // OpenRouter (Free tier + paid models)
  'openrouter-flux-1.1-pro': {
    provider: 'openrouter',
    name: 'OpenRouter Flux 1.1 Pro',
    model: 'blackforestlabs/flux-1.1-pro',
    tier: 1,
    pricing: 0.04,
    supportsNegativePrompt: true,
    maxImageSize: '1024x1024',
    speed: 'medium',
    quality: 'high',
    useCase: ['change-clothes', 'ecommerce-product', 'fashion-editorial']
  },
  'openrouter-flux-pro': {
    provider: 'openrouter',
    name: 'OpenRouter Flux Pro',
    model: 'blackforestlabs/flux-pro',
    tier: 1,
    pricing: 0.05,
    supportsNegativePrompt: true,
    maxImageSize: '1024x1024',
    speed: 'fast',
    quality: 'high',
    useCase: ['change-clothes', 'ecommerce-product', 'fashion-editorial']
  },
  'openrouter-flux-dev': {
    provider: 'openrouter',
    name: 'OpenRouter Flux Dev',
    model: 'blackforestlabs/flux-dev',
    tier: 2,
    pricing: 0.03,
    supportsNegativePrompt: true,
    maxImageSize: '1024x1024',
    speed: 'fast',
    quality: 'medium',
    useCase: ['change-clothes', 'social-media']
  },

  // Google (High quality)
  'google-imagen-3': {
    provider: 'google',
    name: 'Google Imagen 3',
    model: 'imagen-3.0-generate-001',
    tier: 1,
    pricing: 0.04,
    supportsNegativePrompt: true,
    maxImageSize: '1024x1024',
    speed: 'medium',
    quality: 'very-high',
    useCase: ['fashion-editorial', 'high-fashion']
  },

  // NVIDIA (Fast & reliable)
  'nvidia-sd-xl': {
    provider: 'nvidia',
    name: 'NVIDIA Stable Diffusion XL',
    model: 'stabilityai/stable-diffusion-xl-base-1.0',
    tier: 2,
    pricing: 0.03,
    supportsNegativePrompt: true,
    maxImageSize: '1024x1024',
    speed: 'fast',
    quality: 'high',
    useCase: ['change-clothes', 'ecommerce-product']
  },
  'nvidia-sd-3': {
    provider: 'nvidia',
    name: 'NVIDIA Stable Diffusion 3',
    model: 'stabilityai/stable-diffusion-3-medium',
    tier: 1,
    pricing: 0.06,
    supportsNegativePrompt: true,
    maxImageSize: '1024x1024',
    speed: 'medium',
    quality: 'very-high',
    useCase: ['fashion-editorial', 'high-fashion']
  },

  // Replicate (Good free tier)
  'replicate-flux-pro': {
    provider: 'replicate',
    name: 'Replicate Flux Pro',
    model: 'blackforestlabs/flux-1.1-pro',
    tier: 2,
    pricing: 0.055,
    supportsNegativePrompt: true,
    maxImageSize: '1024x1024',
    speed: 'medium',
    quality: 'high',
    useCase: ['change-clothes', 'ecommerce-product', 'fashion-editorial']
  },

  // Fal.ai (Fast & high quality)
  'fal-flux-pro': {
    provider: 'fal',
    name: 'Fal.ai Flux Pro',
    model: 'fal-ai/flux-pro/v1.1',
    tier: 1,
    pricing: 0.05,
    supportsNegativePrompt: true,
    maxImageSize: '1024x1024',
    speed: 'fast',
    quality: 'very-high',
    useCase: ['fashion-editorial', 'high-fashion']
  },

  // Together AI
  'together-flux-schnell': {
    provider: 'together',
    name: 'Together AI Flux Schnell',
    model: 'blackforestlabs/FLUX.1-schnell',
    tier: 3,
    pricing: 0.03,
    supportsNegativePrompt: true,
    maxImageSize: '1024x1024',
    speed: 'very-fast',
    quality: 'medium',
    useCase: ['social-media', 'lifestyle-scene']
  },

  // Hugging Face (Free but slow)
  'huggingface-flux-schnell': {
    provider: 'huggingface',
    name: 'Hugging Face Flux Schnell',
    model: 'blackforestlabs/FLUX.1-schnell',
    tier: 4,
    pricing: 0.00,
    supportsNegativePrompt: false,
    maxImageSize: '1024x1024',
    speed: 'slow',
    quality: 'medium',
    useCase: ['social-media', 'lifestyle-scene']
  },

  // Fireworks
  'fireworks-sd-3': {
    provider: 'fireworks',
    name: 'Fireworks Stable Diffusion 3',
    model: 'stabilityai/stable-diffusion-3-medium',
    tier: 2,
    pricing: 0.04,
    supportsNegativePrompt: true,
    maxImageSize: '1024x1024',
    speed: 'medium',
    quality: 'high',
    useCase: ['change-clothes', 'ecommerce-product']
  }
};

// ============================================================
// POLLINATIONS FALLBACK (Ultimate fallback)
// ============================================================

const POLLINATIONS_CONFIG = {
  id: 'pollinations',
  name: 'Pollinations (Fallback)',
  provider: 'pollinations',
  tier: 99, // Always last
  pricing: 0.00,
  supportsNegativePrompt: false,
  maxImageSize: '1024x1024',
  speed: 'medium',
  quality: 'medium',
  useCase: ['all'] // Accepts everything
};

// ============================================================
// MAIN SELECTION FUNCTION
// ============================================================

export async function selectBestProvider(requirements = {}) {
  const {
    useCase = 'change-clothes',
    productFocus = 'full-outfit',
    supportsNegativePrompt = true,
    preferredProvider = null,
    maxBudget = null,
    minQuality = null,
    maxSpeed = null,
    imageSize = '1024x1024'
  } = requirements;

  console.log('\n🎯 SELECTING BEST PROVIDER...');
  console.log(`   Requirements: ${useCase}, ${productFocus}, negative prompt: ${supportsNegativePrompt}`);
  if (maxBudget) console.log(`   Max budget: $${maxBudget}`);
  if (minQuality) console.log(`   Min quality: ${minQuality}`);
  if (preferredProvider) console.log(`   Preferred: ${preferredProvider}`);

  const keyManager = getKeyManager();
  const availableProviders = [];

  // Filter providers based on requirements
  for (const [id, config] of Object.entries(PROVIDER_CONFIG)) {
    // Check API key availability FIRST
    if (!keyManager.hasAvailableKeys(config.provider)) {
      console.log(`   ⏭️  Skipping ${config.name}: No API key`);
      continue;
    }

    // Check feature support
    if (supportsNegativePrompt && !config.supportsNegativePrompt) {
      console.log(`   ⏭️  Skipping ${config.name}: No negative prompt support`);
      continue;
    }

    // Check image size
    if (!checkImageSize(config.maxImageSize, imageSize)) {
      console.log(`   ⏭️  Skipping ${config.name}: Image size ${imageSize} not supported`);
      continue;
    }

    // Check use case compatibility
    if (!config.useCase.includes(useCase) && !config.useCase.includes('all')) {
      console.log(`   ⏭️  Skipping ${config.name}: Not suitable for ${useCase}`);
      continue;
    }

    // Check budget
    if (maxBudget && config.pricing > maxBudget) {
      console.log(`   ⏭️  Skipping ${config.name}: Too expensive ($${config.pricing} > $${maxBudget})`);
      continue;
    }

    // Check quality
    if (minQuality && getQualityScore(config.quality) < getQualityScore(minQuality)) {
      console.log(`   ⏭️  Skipping ${config.name}: Quality too low (${config.quality} < ${minQuality})`);
      continue;
    }

    // Check speed
    if (maxSpeed && getSpeedScore(config.speed) > getSpeedScore(maxSpeed)) {
      console.log(`   ⏭️  Skipping ${config.name}: Too slow (${config.speed})`);
      continue;
    }

    // Provider is available!
    availableProviders.push({ id, ...config });
  }

  if (availableProviders.length === 0) {
    console.log('   ❌ No providers match requirements, using Pollinations fallback');
    return [POLLINATIONS_CONFIG];
  }

  // Sort by preference
  const sortedProviders = sortProviders(availableProviders, preferredProvider);

  console.log(`\n📊 Available providers: ${sortedProviders.length}`);
  sortedProviders.forEach((p, i) => {
    const preferred = preferredProvider && p.id.includes(preferredProvider) ? '⭐' : '';
    console.log(`   ${i + 1}. ${p.name} (${p.provider}) - Tier ${p.tier}, $${p.pricing}/img ${preferred}`);
  });

  return sortedProviders;
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function checkImageSize(maxSize, requestedSize) {
  // Parse sizes like "1024x1024" or "2048x2048"
  const [maxW, maxH] = maxSize.split('x').map(Number);
  const [reqW, reqH] = requestedSize.split('x').map(Number);

  return reqW <= maxW && reqH <= maxH;
}

function getQualityScore(quality) {
  const scores = {
    'low': 1,
    'medium': 2,
    'high': 3,
    'very-high': 4
  };
  return scores[quality] || 2;
}

function getSpeedScore(speed) {
  const scores = {
    'very-slow': 5,
    'slow': 4,
    'medium': 3,
    'fast': 2,
    'very-fast': 1
  };
  return scores[speed] || 3;
}

function sortProviders(providers, preferredProvider) {
  return providers.sort((a, b) => {
    // Preferred provider gets highest priority
    if (preferredProvider) {
      const aPreferred = a.id.includes(preferredProvider);
      const bPreferred = b.id.includes(preferredProvider);
      if (aPreferred && !bPreferred) return -1;
      if (!aPreferred && bPreferred) return 1;
    }

    // Then by tier (lower = better)
    if (a.tier !== b.tier) return a.tier - b.tier;

    // Then by pricing (lower = better)
    if (a.pricing !== b.pricing) return a.pricing - b.pricing;

    // Then by speed (faster = better)
    const aSpeed = getSpeedScore(a.speed);
    const bSpeed = getSpeedScore(b.speed);
    if (aSpeed !== bSpeed) return aSpeed - bSpeed;

    // Then by quality (higher = better)
    const aQuality = getQualityScore(a.quality);
    const bQuality = getQualityScore(b.quality);
    return bQuality - aQuality;
  });
}

// ============================================================
// GENERATE WITH SMART FALLBACK
// ============================================================

export async function generateWithSmartFallback(prompt, negativePrompt, options = {}) {
  const {
    useCase = 'change-clothes',
    productFocus = 'full-outfit',
    count = 1,
    imageSize = '1024x1024',
    preferredProvider = null,
    maxBudget = null,
    onProgress = null
  } = options;

  console.log('\n🎨 GENERATING WITH SMART FALLBACK...');
  console.log(`   Prompt: ${prompt.substring(0, 100)}...`);
  console.log(`   Negative: ${negativePrompt ? negativePrompt.substring(0, 50) + '...' : 'None'}`);
  console.log(`   Count: ${count}, Size: ${imageSize}`);

  // Get available providers
  const providers = await selectBestProvider({
    useCase,
    productFocus,
    supportsNegativePrompt: !!negativePrompt,
    preferredProvider,
    maxBudget,
    imageSize
  });

  const results = [];
  const errors = [];

  // Generate images
  for (let i = 0; i < count; i++) {
    console.log(`\n🖼️  Generating image ${i + 1}/${count}...`);

    if (onProgress) {
      onProgress({ current: i + 1, total: count, status: 'starting' });
    }

    // Try providers in order
    for (let p = 0; p < providers.length; p++) {
      const provider = providers[p];

      try {
        console.log(`   🔄 Attempt ${p + 1}/${providers.length}: ${provider.name}`);

        if (onProgress) {
          onProgress({ current: i + 1, total: count, status: 'generating', provider: provider.name });
        }

        let imageUrl = null;

        // Call the appropriate generation function based on provider
        switch (provider.provider) {
          case 'openrouter':
            imageUrl = await generateWithOpenRouter(prompt, negativePrompt, {
              model: provider.model,
              imageSize
            });
            break;
          case 'google':
            imageUrl = await generateWithGoogle(prompt, negativePrompt, {
              model: provider.model,
              imageSize
            });
            break;
          case 'nvidia':
            imageUrl = await generateWithNvidia(prompt, negativePrompt, {
              model: provider.model,
              imageSize
            });
            break;
          case 'replicate':
            imageUrl = await generateWithReplicate(prompt, negativePrompt, {
              model: provider.model,
              imageSize
            });
            break;
          case 'fal':
            imageUrl = await generateWithFal(prompt, negativePrompt, {
              model: provider.model,
              imageSize
            });
            break;
          case 'together':
            imageUrl = await generateWithTogether(prompt, negativePrompt, {
              model: provider.model,
              imageSize
            });
            break;
          case 'huggingface':
            imageUrl = await generateWithHuggingFace(prompt, negativePrompt, {
              model: provider.model,
              imageSize
            });
            break;
          case 'fireworks':
            imageUrl = await generateWithFireworks(prompt, negativePrompt, {
              model: provider.model,
              imageSize
            });
            break;
          case 'pollinations':
            imageUrl = await generateWithPollinations(prompt, negativePrompt, {
              imageSize
            });
            break;
          default:
            throw new Error(`Unknown provider: ${provider.provider}`);
        }

        if (imageUrl) {
          const result = {
            url: imageUrl,
            provider: provider.provider,
            model: provider.model,
            prompt: prompt,
            negativePrompt: negativePrompt,
            imageSize: imageSize,
            timestamp: new Date().toISOString()
          };

          results.push(result);

          console.log(`   ✅ Success with ${provider.name}`);
          console.log(`   📸 Image: ${imageUrl}`);

          if (onProgress) {
            onProgress({ current: i + 1, total: count, status: 'completed', result });
          }

          break; // Success, move to next image
        }

      } catch (error) {
        console.log(`   ❌ Failed with ${provider.name}: ${error.message}`);
        errors.push({
          provider: provider.name,
          error: error.message,
          imageIndex: i
        });

        if (onProgress) {
          onProgress({ current: i + 1, total: count, status: 'error', error: error.message });
        }

        // Continue to next provider
      }
    }

    // If all providers failed for this image
    if (results.length <= i) {
      console.log(`   💥 All providers failed for image ${i + 1}`);
      results.push(null); // Placeholder for failed image
    }
  }

  console.log(`\n📊 Generation complete: ${results.filter(r => r).length}/${count} successful`);

  return {
    results: results.filter(r => r), // Remove null placeholders
    errors,
    summary: {
      total: count,
      successful: results.filter(r => r).length,
      failed: errors.length,
      providers: providers.map(p => p.name)
    }
  };
}

// ============================================================
// PROVIDER-SPECIFIC GENERATION FUNCTIONS
// ============================================================

// Import these from your existing service files
// For now, placeholder implementations

async function generateWithOpenRouter(prompt, negativePrompt, options) {
  // TODO: Implement OpenRouter image generation
  // This should use the existing OpenRouter service
  throw new Error('OpenRouter generation not implemented yet');
}

async function generateWithGoogle(prompt, negativePrompt, options) {
  // TODO: Implement Google Imagen generation
  throw new Error('Google generation not implemented yet');
}

async function generateWithNvidia(prompt, negativePrompt, options) {
  // TODO: Implement NVIDIA generation
  throw new Error('NVIDIA generation not implemented yet');
}

async function generateWithReplicate(prompt, negativePrompt, options) {
  // TODO: Implement Replicate generation
  throw new Error('Replicate generation not implemented yet');
}

async function generateWithFal(prompt, negativePrompt, options) {
  // TODO: Implement Fal.ai generation
  throw new Error('Fal.ai generation not implemented yet');
}

async function generateWithTogether(prompt, negativePrompt, options) {
  // TODO: Implement Together AI generation
  throw new Error('Together AI generation not implemented yet');
}

async function generateWithHuggingFace(prompt, negativePrompt, options) {
  // TODO: Implement Hugging Face generation
  throw new Error('Hugging Face generation not implemented yet');
}

async function generateWithFireworks(prompt, negativePrompt, options) {
  // TODO: Implement Fireworks generation
  throw new Error('Fireworks generation not implemented yet');
}

async function generateWithPollinations(prompt, negativePrompt, options) {
  // TODO: Implement Pollinations generation
  throw new Error('Pollinations generation not implemented yet');
}

// ============================================================
// EXPORTS
// ============================================================

export {
  PROVIDER_CONFIG,
  POLLINATIONS_CONFIG
};

export default {
  selectBestProvider,
  generateWithSmartFallback,
  PROVIDER_CONFIG,
  POLLINATIONS_CONFIG
};
