/**
 * Image Generation Service
 * Complete rewrite with robust fallback system
 */

import axios from 'axios';
import { IMAGE_GEN_PROVIDERS, getProvidersByPriority, getAvailableProviders } from '../config/imageGenConfig.js';
import { generateWithNvidia } from './providers/nvidiaImageGen.js';

/**
 * Main image generation function with intelligent fallback
 * @param {string} prompt - The prompt for image generation
 * @param {string} negativePrompt - Things to avoid in the image
 * @param {string} modelPreference - Model preference or 'auto'
 * @param {number} count - Number of images to generate
 * @returns {Promise<Array>} Array of generated images
 */
export async function generateImages(prompt, negativePrompt = '', modelPreference = 'auto', count = 2) {
  console.log('\n🎨 Starting Image Generation...');
  console.log(`   📝 Prompt: ${prompt.substring(0, 100)}...`);
  console.log(`   🚫 Negative: ${negativePrompt ? 'Yes' : 'No'}`);
  console.log(`   🎯 Model: ${modelPreference}`);
  console.log(`   🔢 Count: ${count}`);
  
  // Get providers sorted by priority
  const providers = getProvidersByPriority('image');
  
  // Filter by model preference if specified
  let candidateProviders = providers;
  if (modelPreference !== 'auto') {
    candidateProviders = providers.filter(p => 
      p.model.toLowerCase().includes(modelPreference.toLowerCase())
    );
    
    if (candidateProviders.length === 0) {
      console.log(`   ⚠️  No providers found for model: ${modelPreference}, using all providers`);
      candidateProviders = providers;
    }
  }
  
  console.log(`   🔍 Trying ${candidateProviders.length} providers...`);
  
  // Try each provider in order of priority
  const errors = [];
  
  for (const provider of candidateProviders) {
    try {
      console.log(`\n   🔄 Attempting: ${provider.name} (${provider.model})`);
      
      // Check if provider requires API key
      if (provider.requiresKey) {
        const apiKey = getApiKeyFromEnv(provider.name);
        
        if (!apiKey) {
          console.log(`   ⏭️  Skipping ${provider.name}: No API key configured`);
          continue;
        }
        
        const result = await generateWithProvider(provider, prompt, negativePrompt, apiKey, count);
        
        if (result && result.length > 0) {
          console.log(`   ✅ SUCCESS with ${provider.name}`);
          return result;
        }
      } else {
        // Provider doesn't require key (e.g., Pollinations)
        const result = await generateWithProvider(provider, prompt, negativePrompt, null, count);
        
        if (result && result.length > 0) {
          console.log(`   ✅ SUCCESS with ${provider.name}`);
          return result;
        }
      }
      
    } catch (error) {
      const errorMsg = `${provider.name}: ${error.message}`;
      errors.push(errorMsg);
      console.log(`   ❌ Failed: ${errorMsg}`);
      
      // Continue to next provider
      continue;
    }
  }
  
  // All providers failed
  console.log('\n   ❌ All providers failed!');
  throw new Error(`Failed to generate images. Tried ${candidateProviders.length} providers. Errors: ${errors.join('; ')}`);
}

/**
 * Get API key from environment based on provider
 */
function getApiKeyFromEnv(providerName) {
  const keyMap = {
    'openrouter': process.env.OPENROUTER_API_KEY,
    'nvidia': process.env.NVIDIA_API_KEY,
    'replicate': process.env.REPLICATE_API_TOKEN,
    'fal': process.env.FAL_API_KEY,
    'together': process.env.TOGETHER_API_KEY,
    'fireworks': process.env.FIREWORKS_API_KEY,
    'google': process.env.GOOGLE_API_KEY,
    'segmind': process.env.SEGMIND_API_KEY,
    'deepinfra': process.env.DEEPINFRA_API_KEY,
    'huggingface': process.env.HUGGINGFACE_API_KEY
  };
  
  return keyMap[providerName] || null;
}

/**
 * Generate with specific provider
 */
async function generateWithProvider(provider, prompt, negativePrompt, apiKey, count) {
  switch (provider.name) {
    case 'openrouter':
      return await generateWithOpenRouter(provider, prompt, negativePrompt, apiKey, count);
    
    case 'nvidia':
      return await generateWithNvidia(provider, prompt, negativePrompt, apiKey, count);
    
    case 'replicate':
      return await generateWithReplicate(provider, prompt, negativePrompt, apiKey, count);
    
    case 'fal':
      return await generateWithFal(provider, prompt, negativePrompt, apiKey, count);
    
    case 'together':
      return await generateWithTogether(provider, prompt, negativePrompt, apiKey, count);
    
    case 'fireworks':
      return await generateWithFireworks(provider, prompt, negativePrompt, apiKey, count);
    
    case 'google':
      return await generateWithGoogle(provider, prompt, negativePrompt, apiKey, count);
    
    case 'segmind':
      return await generateWithSegmind(provider, prompt, negativePrompt, apiKey, count);
    
    case 'deepinfra':
      return await generateWithDeepInfra(provider, prompt, negativePrompt, apiKey, count);
    
    case 'huggingface':
      return await generateWithHuggingFace(provider, prompt, negativePrompt, apiKey, count);
    
    case 'pollinations':
      return await generateWithPollinations(provider, prompt, negativePrompt, count);
    
    default:
      throw new Error(`Unknown provider: ${provider.name}`);
  }
}

/**
 * OpenRouter Implementation (PRIORITY)
 */
async function generateWithOpenRouter(provider, prompt, negativePrompt, apiKey, count) {
  console.log(`   🎨 OpenRouter: ${provider.model}`);
  
  const payload = {
    model: provider.model,
    prompt: prompt,
    negative_prompt: negativePrompt || '',
    n: count,
    size: '1024x1024',
    response_format: 'url'
  };
  
  try {
    const response = await axios.post(
      provider.endpoint,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
          'X-Title': 'AI Fashion Assistant'
        },
        timeout: 120000
      }
    );
    
    const images = response.data.data || response.data.images;
    
    if (!images || images.length === 0) {
      throw new Error('No images returned from OpenRouter');
    }
    
    const result = images.map((img, index) => ({
      url: img.url || img.image_url,
      provider: 'openrouter',
      model: provider.model,
      index: index + 1
    }));
    
    console.log(`   ✅ Generated ${result.length} images from OpenRouter`);
    return result;
    
  } catch (error) {
    console.error(`   ❌ OpenRouter error:`, error.response?.data || error.message);
    throw error;
  }
}


/**
 * Replicate Implementation
 */
async function generateWithReplicate(provider, prompt, negativePrompt, apiKey, count) {
  console.log(`   🎨 Replicate: ${provider.model}`);
  
  const input = {
    prompt: prompt,
    negative_prompt: negativePrompt || '',
    num_outputs: count,
    width: 1024,
    height: 1024
  };
  
  try {
    const response = await axios.post(
      `https://api.replicate.com/v1/predictions`,
      {
        version: provider.model,
        input: input
      },
      {
        headers: {
          'Authorization': `Token ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Poll for completion
    let prediction = response.data;
    while (prediction.status !== 'succeeded' && prediction.status !== 'failed') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusResponse = await axios.get(
        `https://api.replicate.com/v1/predictions/${prediction.id}`,
        {
          headers: {
            'Authorization': `Token ${apiKey}`
          }
        }
      );
      
      prediction = statusResponse.data;
    }
    
    if (prediction.status === 'failed') {
      throw new Error('Replicate generation failed');
    }
    
    const images = prediction.output;
    
    const result = images.map((url, index) => ({
      url: url,
      provider: 'replicate',
      model: provider.model,
      index: index + 1
    }));
    
    console.log(`   ✅ Generated ${result.length} images from Replicate`);
    return result;
    
  } catch (error) {
    console.error(`   ❌ Replicate error:`, error.response?.data || error.message);
    throw error;
  }
}

/**
 * Fal.ai Implementation
 */
async function generateWithFal(provider, prompt, negativePrompt, apiKey, count) {
  console.log(`   🎨 Fal.ai: ${provider.model}`);
  
  const payload = {
    prompt: prompt,
    negative_prompt: negativePrompt || '',
    num_images: count,
    image_size: '1024x1024'
  };
  
  try {
    const response = await axios.post(
      provider.endpoint,
      payload,
      {
        headers: {
          'Authorization': `Key ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 120000
      }
    );
    
    const images = response.data.images;
    
    const result = images.map((img, index) => ({
      url: img.url,
      provider: 'fal',
      model: provider.model,
      index: index + 1
    }));
    
    console.log(`   ✅ Generated ${result.length} images from Fal.ai`);
    return result;
    
  } catch (error) {
    console.error(`   ❌ Fal.ai error:`, error.response?.data || error.message);
    throw error;
  }
}

/**
 * Together AI Implementation
 */
async function generateWithTogether(provider, prompt, negativePrompt, apiKey, count) {
  console.log(`   🎨 Together AI: ${provider.model}`);
  
  const payload = {
    model: provider.model,
    prompt: prompt,
    negative_prompt: negativePrompt || '',
    n: count,
    width: 1024,
    height: 1024
  };
  
  try {
    const response = await axios.post(
      provider.endpoint,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 120000
      }
    );
    
    const images = response.data.data;
    
    const result = images.map((img, index) => ({
      url: img.url || img.b64_json,
      provider: 'together',
      model: provider.model,
      index: index + 1
    }));
    
    console.log(`   ✅ Generated ${result.length} images from Together AI`);
    return result;
    
  } catch (error) {
    console.error(`   ❌ Together AI error:`, error.response?.data || error.message);
    throw error;
  }
}

/**
 * Fireworks AI Implementation
 */
async function generateWithFireworks(provider, prompt, negativePrompt, apiKey, count) {
  console.log(`   🎨 Fireworks AI: ${provider.model}`);
  
  const payload = {
    model: provider.model,
    prompt: prompt,
    negative_prompt: negativePrompt || '',
    n: count,
    width: 1024,
    height: 1024
  };
  
  try {
    const response = await axios.post(
      provider.endpoint,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 120000
      }
    );
    
    const images = response.data.data;
    
    const result = images.map((img, index) => ({
      url: img.url,
      provider: 'fireworks',
      model: provider.model,
      index: index + 1
    }));
    
    console.log(`   ✅ Generated ${result.length} images from Fireworks AI`);
    return result;
    
  } catch (error) {
    console.error(`   ❌ Fireworks AI error:`, error.response?.data || error.message);
    throw error;
  }
}

/**
 * Google AI Implementation
 */
async function generateWithGoogle(provider, prompt, negativePrompt, apiKey, count) {
  console.log(`   🎨 Google AI: ${provider.model}`);
  
  const payload = {
    prompt: prompt,
    negative_prompt: negativePrompt || '',
    num_images: count
  };
  
  try {
    const response = await axios.post(
      `${provider.endpoint}?key=${apiKey}`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 120000
      }
    );
    
    const images = response.data.images;
    
    const result = images.map((img, index) => ({
      url: `data:image/png;base64,${img.bytesBase64Encoded}`,
      provider: 'google',
      model: provider.model,
      index: index + 1
    }));
    
    console.log(`   ✅ Generated ${result.length} images from Google AI`);
    return result;
    
  } catch (error) {
    console.error(`   ❌ Google AI error:`, error.response?.data || error.message);
    throw error;
  }
}

/**
 * Segmind Implementation
 */
async function generateWithSegmind(provider, prompt, negativePrompt, apiKey, count) {
  console.log(`   🎨 Segmind: ${provider.model}`);
  
  const payload = {
    prompt: prompt,
    negative_prompt: negativePrompt || '',
    samples: count,
    width: 1024,
    height: 1024
  };
  
  try {
    const response = await axios.post(
      provider.endpoint,
      payload,
      {
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 120000
      }
    );
    
    const images = response.data.images;
    
    const result = images.map((img, index) => ({
      url: `data:image/png;base64,${img}`,
      provider: 'segmind',
      model: provider.model,
      index: index + 1
    }));
    
    console.log(`   ✅ Generated ${result.length} images from Segmind`);
    return result;
    
  } catch (error) {
    console.error(`   ❌ Segmind error:`, error.response?.data || error.message);
    throw error;
  }
}

/**
 * DeepInfra Implementation
 */
async function generateWithDeepInfra(provider, prompt, negativePrompt, apiKey, count) {
  console.log(`   🎨 DeepInfra: ${provider.model}`);
  
  const payload = {
    prompt: prompt,
    negative_prompt: negativePrompt || '',
    num_images: count,
    width: 1024,
    height: 1024
  };
  
  try {
    const response = await axios.post(
      provider.endpoint,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 120000
      }
    );
    
    const images = response.data.images;
    
    const result = images.map((img, index) => ({
      url: img.url,
      provider: 'deepinfra',
      model: provider.model,
      index: index + 1
    }));
    
    console.log(`   ✅ Generated ${result.length} images from DeepInfra`);
    return result;
    
  } catch (error) {
    console.error(`   ❌ DeepInfra error:`, error.response?.data || error.message);
    throw error;
  }
}

/**
 * Hugging Face Implementation
 */
async function generateWithHuggingFace(provider, prompt, negativePrompt, apiKey, count) {
  console.log(`   🎨 Hugging Face: ${provider.model}`);
  
  const payload = {
    inputs: prompt,
    negative_prompt: negativePrompt || '',
    parameters: {
      num_images: count,
      width: 1024,
      height: 1024
    }
  };
  
  try {
    const response = await axios.post(
      provider.endpoint,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 120000,
        responseType: 'arraybuffer'
      }
    );
    
    // Hugging Face returns image binary
    const base64 = Buffer.from(response.data, 'binary').toString('base64');
    
    const result = [{
      url: `data:image/png;base64,${base64}`,
      provider: 'huggingface',
      model: provider.model,
      index: 1
    }];
    
    console.log(`   ✅ Generated image from Hugging Face`);
    return result;
    
  } catch (error) {
    console.error(`   ❌ Hugging Face error:`, error.response?.data || error.message);
    throw error;
  }
}

/**
 * Pollinations Implementation (No API key required)
 */
async function generateWithPollinations(provider, prompt, negativePrompt, count) {
  console.log(`   🎨 Pollinations AI: ${provider.model}`);
  
  const seed = Math.floor(Math.random() * 1000000);
  const encodedPrompt = encodeURIComponent(prompt);
  
  const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&model=${provider.model}&seed=${seed}&nologo=true`;
  
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 120000
    });
    
    const base64 = Buffer.from(response.data, 'binary').toString('base64');
    
    const result = [{
      url: `data:image/png;base64,${base64}`,
      provider: 'pollinations',
      model: provider.model,
      index: 1,
      seed: seed
    }];
    
    console.log(`   ✅ Generated image from Pollinations AI`);
    return result;
    
  } catch (error) {
    console.error(`   ❌ Pollinations error:`, error.message);
    throw error;
  }
}

/**
 * Get all available models for UI
 */
export function getAllModels() {
  const providers = getProvidersByPriority('image');
  
  return providers.map(p => ({
    id: p.model,
    name: p.name,
    provider: p.name,
    priority: p.priority,
    free: p.free,
    description: p.description
  }));
}

/**
 * Legacy function for analyzing images for prompt generation
 * This functionality is now in visionService.js
 */
export async function analyzeImagesForPrompt(characterImagePath, productImagePath) {
  console.log('\n🔍 Analyzing images for prompt generation...');
  console.log('   Note: This is a legacy function. Use visionService.analyzeImage instead.');
  
  // This is a placeholder - the actual functionality is in visionService.js
  return {
    character: {},
    product: {}
  };
}

export default {
  generateImages,
  getAllModels,
  analyzeImagesForPrompt
};


