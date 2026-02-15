/**
 * Image Generation Configuration
 * Centralized provider configuration with priority system
 */

import { getKeyManager } from '../utils/keyManager.js';

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
 * Image Generation Providers - Sorted by priority
 * Priority: Lower number = Higher priority (tried first)
 */
export const IMAGE_GEN_PROVIDERS = [
  // ============================================================================
  // PRIORITY 1-2: OPENROUTER (Free & Reliable)
  // ============================================================================
  {
    name: 'openrouter',
    priority: 1,
    endpoint: 'https://openrouter.ai/api/v1/images/generations',
    model: 'black-forest-labs/flux-schnell-free',
    free: true,
    requiresKey: true,
    supportsNegativePrompt: true,
    description: 'OpenRouter Free Flux - Fast and reliable'
  },
  {
    name: 'openrouter',
    priority: 2,
    endpoint: 'https://openrouter.ai/api/v1/images/generations',
    model: 'stabilityai/stable-diffusion-xl-base-1.0',
    free: true,
    requiresKey: true,
    supportsNegativePrompt: true,
    description: 'OpenRouter SDXL - High quality'
  },
  
  // ============================================================================
  // PRIORITY 3-4: NVIDIA (Free with API key)
  // ============================================================================
  {
    name: 'nvidia',
    priority: 3,
    endpoint: 'https://integrate.api.nvidia.com/v1/images/generations',
    model: 'stabilityai/stable-diffusion-3-5-large',
    free: true,
    requiresKey: true,
    supportsNegativePrompt: true,
    description: 'NVIDIA SD 3.5 Large - Best quality'
  },
  {
    name: 'nvidia',
    priority: 4,
    endpoint: 'https://integrate.api.nvidia.com/v1/images/generations',
    model: 'black-forest-labs/flux-schnell',
    free: true,
    requiresKey: true,
    supportsNegativePrompt: true,
    description: 'NVIDIA Flux Schnell - Fast generation'
  },

  // ============================================================================
  // PRIORITY 5-6: FIREWORKS (Free credits)
  // ============================================================================
  {
    name: 'fireworks',
    priority: 5,
    endpoint: 'https://api.fireworks.ai/inference/v1/image_generation',
    model: 'stable-diffusion-3',
    free: true,
    requiresKey: true,
    supportsNegativePrompt: true,
    description: 'Fireworks SD3 - Good quality'
  },
  {
    name: 'fireworks',
    priority: 6,
    endpoint: 'https://api.fireworks.ai/inference/v1/image_generation',
    model: 'playground-v2-5-1024px-aesthetic',
    free: true,
    requiresKey: true,
    supportsNegativePrompt: true,
    description: 'Fireworks Playground v2.5 - Aesthetic'
  },

  // ============================================================================
  // PRIORITY 7-8: TOGETHER AI (Free credits)
  // ============================================================================
  {
    name: 'together',
    priority: 7,
    endpoint: 'https://api.together.xyz/v1/images/generations',
    model: 'black-forest-labs/FLUX.1-schnell',
    free: true,
    requiresKey: true,
    supportsNegativePrompt: true,
    description: 'Together AI Flux Schnell - Fast'
  },
  {
    name: 'together',
    priority: 8,
    endpoint: 'https://api.together.xyz/v1/images/generations',
    model: 'stabilityai/stable-diffusion-xl-base-1.0',
    free: true,
    requiresKey: true,
    supportsNegativePrompt: true,
    description: 'Together AI SDXL - Reliable'
  },

  // ============================================================================
  // PRIORITY 9-10: FAL.AI (Free tier)
  // ============================================================================
  {
    name: 'fal',
    priority: 9,
    endpoint: 'https://fal.run/fal-ai/flux-pro',
    model: 'flux-pro',
    free: true,
    requiresKey: true,
    supportsNegativePrompt: true,
    description: 'FAL.ai Flux Pro - Premium quality'
  },
  {
    name: 'fal',
    priority: 10,
    endpoint: 'https://fal.run/fal-ai/flux-realism',
    model: 'flux-realism',
    free: true,
    requiresKey: true,
    supportsNegativePrompt: true,
    description: 'FAL.ai Flux Realism - Photorealistic'
  },

  // ============================================================================
  // PRIORITY 99: POLLINATIONS (Ultimate fallback - No API key needed)
  // ============================================================================
  {
    name: 'pollinations',
    priority: 99,
    endpoint: 'https://image.pollinations.ai',
    model: 'flux',
    free: true,
    requiresKey: false,
    supportsNegativePrompt: false,
    description: 'Pollinations AI - No API key required'
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
