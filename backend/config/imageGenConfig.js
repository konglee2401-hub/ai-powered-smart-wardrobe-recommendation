/**
 * Image Generation Configuration
 * Centralized provider configuration with priority system
 */

import { getKeyManager } from '../utils/keyManager.js';
import { queryAIModel } from '../services/aiQueryService.js';
import { generateWithGoogle } from '../services/imageGenService.js';

/**
 * Helper function to check if provider has API key available
 */
function isProviderKeyAvailable(provider) {
  try {
    const km = getKeyManager(provider);
    return km && km.keys && km.keys.length > 0;
  } catch {
    return false;
  }
}

/**
 * Helper to create a consistent generate function for OpenRouter models.
 */
const createOpenRouterGenerateFunction = (modelId) => async (prompt, options, apiKey) => {
    return queryAIModel('openrouter', modelId, prompt, {
        type: 'image',
        apiKey
    });
};

/**
 * Helper to create a consistent generate function for Replicate models.
 */
const createReplicateGenerateFunction = (modelId) => async (prompt, options, apiKey) => {
    return queryAIModel('replicate', modelId, prompt, {
        type: 'image',
        apiKey
    });
};

/**
 * Image Generation Providers - Sorted by priority
 * Priority: Lower number = Higher priority (tried first)
 */
export const IMAGE_GEN_PROVIDERS = [
  // ============================================================================
  // PRIORITY 0: GOOGLE (Premium / Pro)
  // ============================================================================
  {
    id: 'google-imagen-3',
    name: 'Google Imagen 3',
    provider: 'google',
    model: 'imagen-3.0-generate-001',
    generate: async (prompt, options, apiKey) => {
        const { negativePrompt, count, characterImagePath, productImagePath } = options;
        return generateWithGoogle({ model: 'imagen-3.0-generate-001' }, prompt, negativePrompt, apiKey, count, characterImagePath, productImagePath);
    }
  },

  // ============================================================================
  // PRIORITY 1-2: OPENROUTER (Free & Reliable)
  // ============================================================================
  {
    id: 'openrouter-flux-schnell-free',
    name: 'OpenRouter Flux Schnell (Free)',
    provider: 'openrouter',
    model: 'black-forest-labs/flux-schnell-free',
    generate: createOpenRouterGenerateFunction('black-forest-labs/flux-schnell-free')
  },
  {
    id: 'openrouter-sdxl',
    name: 'OpenRouter SDXL',
    provider: 'openrouter',
    model: 'stabilityai/stable-diffusion-xl-base-1.0',
    generate: createOpenRouterGenerateFunction('stabilityai/stable-diffusion-xl-base-1.0')
  },
  {
    id: 'openrouter-ideogram-v2',
    name: 'OpenRouter Ideogram V2',
    provider: 'openrouter',
    model: 'ideogram-ai/ideogram-v2',
    generate: createOpenRouterGenerateFunction('ideogram-ai/ideogram-v2')
  },
  {
    id: 'openrouter-recraft-v3',
    name: 'OpenRouter Recraft V3',
    provider: 'openrouter',
    model: 'recraft-ai/recraft-v3',
    generate: createOpenRouterGenerateFunction('recraft-ai/recraft-v3')
  },
  {
    id: 'openrouter-fal-flux-pro',
    name: 'OpenRouter FAL Flux Pro',
    provider: 'openrouter',
    model: 'fal-ai/flux-pro',
    generate: createOpenRouterGenerateFunction('fal-ai/flux-pro')
  },
  {
    id: 'openrouter-fal-flux-realism',
    name: 'OpenRouter FAL Flux Realism',
    provider: 'openrouter',
    model: 'fal-ai/flux-realism',
    generate: createOpenRouterGenerateFunction('fal-ai/flux-realism')
  },
  


  // ============================================================================
  // PRIORITY 5-6: FIREWORKS (Free credits)
  // ============================================================================
  {
    id: 'fireworks-sd3',
    name: 'Fireworks SD3',
    provider: 'fireworks',
    model: 'stable-diffusion-3',
    generate: async (prompt, options, apiKey) => {
        return queryAIModel('fireworks', 'stable-diffusion-3', prompt, {
            type: 'image',
            apiKey
        });
    }
  },
  {
    id: 'fireworks-ground',
    name: 'Fireworks Playground v2.5',
    provider: 'fireworks',
    model: 'playground-v2-5-1024px-aesthetic',
    generate: async (prompt, options, apiKey) => {
        return queryAIModel('fireworks', 'playground-v2-5-1024px-aesthetic', prompt, {
            type: 'image',
            apiKey
        });
    }
  },

  // ============================================================================
  // PRIORITY 7-8: TOGETHER AI (Free credits)
  // ============================================================================
  {
    id: 'together-flux-schnell',
    name: 'Together AI Flux Schnell',
    provider: 'together',
    model: 'black-forest-labs/FLUX.1-schnell',
    generate: async (prompt, options, apiKey) => {
        return queryAIModel('together', 'black-forest-labs/FLUX.1-schnell', prompt, {
            type: 'image',
            apiKey
        });
    }
  },
  {
    id: 'together-sdxl',
    name: 'Together AI SDXL',
    provider: 'together',
    model: 'stabilityai/stable-diffusion-xl-base-1.0',
    generate: async (prompt, options, apiKey) => {
        return queryAIModel('together', 'stabilityai/stable-diffusion-xl-base-1.0', prompt, {
            type: 'image',
            apiKey
        });
    }
  },

  // ============================================================================
  // PRIORITY 9-10: FAL.AI (Free tier)
  // ============================================================================
  {
    id: 'fal-flux-pro',
    name: 'FAL.ai Flux Pro',
    provider: 'fal',
    model: 'flux-pro',
    generate: async (prompt, options, apiKey) => {
        return queryAIModel('fal', 'flux-pro', prompt, {
            type: 'image',
            apiKey
        });
    }
  },
  {
    id: 'fal-flux-realism',
    name: 'FAL.ai Flux Realism',
    provider: 'fal',
    model: 'flux-realism',
    generate: async (prompt, options, apiKey) => {
        return queryAIModel('fal', 'flux-realism', prompt, {
            type: 'image',
            apiKey
        });
    }
  },

  // ============================================================================
  // PRIORITY 99: POLLINATIONS (Ultimate fallback - No API key needed)
  // ============================================================================
  {
    id: 'pollinations',
    name: 'Pollinations AI',
    provider: 'pollinations',
    model: 'flux',
    generate: async (prompt, options, apiKey) => {
        return queryAIModel('pollinations', 'flux', prompt, {
            type: 'image',
            apiKey
        });
    }
  },

  // ============================================================================
  // PRIORITY 10: OPENAI (DALL-E 3)
  // ============================================================================
  {
    id: 'openai-dall-e-3',
    name: 'OpenAI DALL-E 3',
    provider: 'openai',
    model: 'dall-e-3',
    generate: async (prompt, options, apiKey) => {
        return queryAIModel('openai', 'dall-e-3', prompt, {
            type: 'image',
            apiKey
        });
    }
  },

  // ============================================================================
  // PRIORITY 11: REPLICATE (Flux Pro)
  // ============================================================================
  {
    id: 'replicate-flux-pro',
    name: 'Replicate Flux Pro',
    provider: 'replicate',
    model: 'black-forest-labs/flux-1.1-pro',
    generate: createReplicateGenerateFunction('black-forest-labs/flux-1.1-pro')
  },

  // ============================================================================
  // PRIORITY 12: REPLICATE (Other Models)
  // ============================================================================
  {
    id: 'replicate-flux-schnell',
    name: 'Replicate Flux Schnell',
    provider: 'replicate',
    model: 'black-forest-labs/flux-schnell',
    generate: createReplicateGenerateFunction('black-forest-labs/flux-schnell')
  },
  {
    id: 'replicate-flux-dev',
    name: 'Replicate Flux Dev',
    provider: 'replicate',
    model: 'black-forest-labs/flux-dev',
    generate: createReplicateGenerateFunction('black-forest-labs/flux-dev')
  },
  {
    id: 'replicate-sdxl',
    name: 'Replicate SDXL',
    provider: 'replicate',
    model: 'stability-ai/sdxl',
    generate: createReplicateGenerateFunction('stability-ai/sdxl')
  }
];

/**
 * Analysis Providers - For image analysis (vision)
 */
export const ANALYSIS_PROVIDERS = [
  // ============================================================================
  // PRIORITY 1: OPENROUTER (Best for analysis - Free & Vision support)
  // ============================================================================
  {
    name: 'openrouter',
    priority: 1,
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'meta-llama/llama-3.2-11b-vision-instruct:free',
    free: true,
    requiresKey: true,
    supportsVision: true,
    description: 'OpenRouter Llama 3.2 Vision - Free & Fast'
  },
  {
    name: 'openrouter',
    priority: 2,
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'google/gemini-2.0-flash-exp:free',
    free: true,
    requiresKey: true,
    supportsVision: true,
    description: 'OpenRouter Gemini 2.0 Flash - High quality'
  },

  // ============================================================================
  // PRIORITY 3: GOOGLE (Native vision)
  // ============================================================================
  {
    name: 'google',
    priority: 3,
    endpoint: 'https://generativelanguage.googleapis.com/v1beta',
    model: 'gemini-2.0-flash-exp',
    free: true,
    requiresKey: true,
    supportsVision: true,
    description: 'Google Gemini 2.0 Flash - Native vision'
  },

  // ============================================================================
  // PRIORITY 4: ANTHROPIC (Claude with vision)
  // ============================================================================
  {
    name: 'anthropic',
    priority: 4,
    endpoint: 'https://api.anthropic.com/v1/messages',
    model: 'claude-3-haiku-20240307',
    free: false,
    requiresKey: true,
    supportsVision: true,
    description: 'Anthropic Claude 3 Haiku - Fast & Capable'
  },

  // ============================================================================
  // PRIORITY 5: OPENAI (GPT-4 Vision)
  // ============================================================================
  {
    name: 'openai',
    priority: 5,
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini',
    free: false,
    requiresKey: true,
    supportsVision: true,
    description: 'OpenAI GPT-4o Mini - Reliable'
  }
];

/**
 * Get provider configuration by name and model
 */
export function getProviderConfig(providerName, modelName = null) {
  const providers = [...IMAGE_GEN_PROVIDERS, ...ANALYSIS_PROVIDERS];
  
  if (modelName) {
    return providers.find(p => p.name === providerName && p.model === modelName);
  }
  
  return providers.find(p => p.name === providerName);
}

/**
 * Get all providers sorted by priority
 */
export function getProvidersByPriority(type = 'image') {
  const providers = type === 'image' ? IMAGE_GEN_PROVIDERS : ANALYSIS_PROVIDERS;
  return [...providers].sort((a, b) => a.priority - b.priority);
}

/**
 * Get available providers (those with API keys configured)
 */
export function getAvailableProviders(type = 'image') {
  const providers = getProvidersByPriority(type);
  
  return providers.filter(provider => {
    if (!provider.requiresKey) return true; // Free providers always available
    return isProviderKeyAvailable(provider.name);
  });
}

/**
 * Check if provider requires API key
 */
export function providerRequiresKey(providerName) {
  const provider = getProviderConfig(providerName);
  return provider?.requiresKey || false;
}

/**
 * Get provider by priority number
 */
export function getProviderByPriority(priority, type = 'image') {
  const providers = getProvidersByPriority(type);
  return providers.find(p => p.priority === priority);
}

export default {
  IMAGE_GEN_PROVIDERS,
  ANALYSIS_PROVIDERS,
  getProviderConfig,
  getProvidersByPriority,
  getAvailableProviders,
  providerRequiresKey,
  getProviderByPriority
};
