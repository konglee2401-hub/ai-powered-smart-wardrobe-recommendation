import { getKeyManager } from '../utils/keyManager.js';

// Helper to check if provider has available keys
function isProviderAvailable(providerName) {
  try {
    const km = getKeyManager(providerName);
    return km.keys.length > 0;
  } catch {
    return false;
  }
}

/**
 * Complete Image Generation Providers Configuration
 * Includes all providers with free tiers/credits
 */

import Replicate from 'replicate';
import fs from 'fs';
import path from 'path';

/**
 * Helper function to download image from URL
 */
async function downloadImage(url, filename) {
  const response = await fetch(url);
  const buffer = Buffer.from(await response.arrayBuffer());
  const filepath = path.join(process.cwd(), 'temp', filename);
  fs.writeFileSync(filepath, buffer);
  return filepath;
}

/**
 * Get API key and key manager
 * Returns both key and manager for logging
 */
async function getApiKeyWithManager(service) {
  const { getKeyManager } = await import('../utils/keyManager.js');
  const keyManager = getKeyManager(service);
  const apiKey = keyManager.getNextKey();
  
  if (!apiKey) {
    throw new Error(`${service.toUpperCase()}_API_KEY not set`);
  }
  
  return { apiKey, keyManager };
}

export const IMAGE_PROVIDERS = [
  // ============================================================================
  // GOOGLE GEMINI - FREE (PRIORITY 10-11)
  // ============================================================================

  {
    name: 'Google Gemini 2.0 Flash (Image)',
    id: 'gemini-2.0-flash-image',
    provider: 'google',
    priority: 10,
    pricing: null,
    free: true,
    requiresKey: true,
    keyEnv: 'GOOGLE_API_KEY',
    available: !!process.env.GOOGLE_API_KEY,
    generate: async (prompt, options = {}) => {
      const { apiKey, keyManager } = await getApiKeyWithManager('google');
      console.log(`   🔑 Using key: ${keyManager.getCurrentKeyName()}`);
      
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Generate an image: ${prompt}`
              }]
            }],
            generationConfig: {
              temperature: 1.0,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 8192
            }
          })
        }
      );
      
      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Gemini returns base64 image in response
      const imageData = data.candidates[0]?.content?.parts[0]?.inlineData;
      
      if (!imageData) {
        throw new Error('No image data in Gemini response');
      }
      
      // Save base64 to file
      const buffer = Buffer.from(imageData.data, 'base64');
      const filename = `gemini-${Date.now()}.png`;
      const filepath = path.join(process.cwd(), 'temp', filename);
      fs.writeFileSync(filepath, buffer);
      
      return { path: filepath, provider: 'google', model: 'gemini-2.0-flash' };
    }
  },

  {
    name: 'Google Imagen 3',
    id: 'google-imagen-3',
    provider: 'google',
    priority: 11,
    pricing: null,
    free: true,
    requiresKey: true,
    keyEnv: 'GOOGLE_API_KEY',
    available: !!process.env.GOOGLE_API_KEY,
    generate: async (prompt, options = {}) => {
      const { apiKey, keyManager } = await getApiKeyWithManager('google');
      console.log(`   🔑 Using key: ${keyManager.getCurrentKeyName()}`);
      
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            instances: [{
              prompt: prompt
            }],
            parameters: {
              sampleCount: 1,
              aspectRatio: '1:1',
              safetyFilterLevel: 'block_some',
              personGeneration: 'allow_all'
            }
          })
        }
      );
      
      if (!response.ok) {
        throw new Error(`Imagen API error: ${response.status}`);
      }
      
      const data = await response.json();
      const imageData = data.predictions[0]?.bytesBase64Encoded;
      
      if (!imageData) {
        throw new Error('No image data in Imagen response');
      }
      
      const buffer = Buffer.from(imageData, 'base64');
      const filename = `imagen-${Date.now()}.png`;
      const filepath = path.join(process.cwd(), 'temp', filename);
      fs.writeFileSync(filepath, buffer);
      
      return { path: filepath, provider: 'google', model: 'imagen-3' };
    }
  },

  // ============================================================================
  // NVIDIA NIM - FREE (PRIORITY 12-13)
  // ============================================================================

  {
    name: 'NVIDIA Stable Diffusion XL',
    id: 'nvidia-sdxl',
    provider: 'nvidia',
    priority: 12,
    pricing: null,
    free: true,
    requiresKey: true,
    keyEnv: 'NVIDIA_API_KEY',
    available: !!process.env.NVIDIA_API_KEY,
    generate: async (prompt, options = {}) => {
      const { apiKey, keyManager } = await getApiKeyWithManager('nvidia');
      console.log(`   🔑 Using key: ${keyManager.getCurrentKeyName()}`);
      
      const response = await fetch(
        'https://api.nvcf.nvidia.com/v2/nvcf/pexec/functions/0e22db2d-b823-4e7a-b2f9-a6e5e8b90d3f',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            prompt: prompt,
            negative_prompt: 'blurry, low quality, distorted',
            sampler: 'DDIM',
            seed: Math.floor(Math.random() * 1000000),
            steps: 30,
            cfg_scale: 7.5,
            width: 1024,
            height: 1024
          })
        }
      );
      
      if (!response.ok) {
        throw new Error(`NVIDIA API error: ${response.status}`);
      }
      
      const data = await response.json();
      const imageBase64 = data.image;
      
      if (!imageBase64) {
        throw new Error('No image in NVIDIA response');
      }
      
      const buffer = Buffer.from(imageBase64, 'base64');
      const filename = `nvidia-${Date.now()}.png`;
      const filepath = path.join(process.cwd(), 'temp', filename);
      fs.writeFileSync(filepath, buffer);
      
      return { path: filepath, provider: 'nvidia', model: 'sdxl' };
    }
  },

  {
    name: 'NVIDIA Stable Diffusion 3',
    id: 'nvidia-sd3',
    provider: 'nvidia',
    priority: 13,
    pricing: null,
    free: true,
    requiresKey: true,
    keyEnv: 'NVIDIA_API_KEY',
    available: !!process.env.NVIDIA_API_KEY,
    generate: async (prompt, options = {}) => {
      const { apiKey, keyManager } = await getApiKeyWithManager('nvidia');
      console.log(`   🔑 Using key: ${keyManager.getCurrentKeyName()}`);
      
      const response = await fetch(
        'https://api.nvcf.nvidia.com/v2/nvcf/pexec/functions/stable-diffusion-3-medium',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            prompt: prompt,
            negative_prompt: 'blurry, low quality',
            steps: 30,
            cfg_scale: 7.0,
            width: 1024,
            height: 1024
          })
        }
      );
      
      if (!response.ok) {
        throw new Error(`NVIDIA API error: ${response.status}`);
      }
      
      const data = await response.json();
      const imageBase64 = data.image;
      
      const buffer = Buffer.from(imageBase64, 'base64');
      const filename = `nvidia-sd3-${Date.now()}.png`;
      const filepath = path.join(process.cwd(), 'temp', filename);
      fs.writeFileSync(filepath, buffer);
      
      return { path: filepath, provider: 'nvidia', model: 'sd3' };
    }
  },

  // ============================================================================
  // FIREWORKS AI - FREE CREDITS (PRIORITY 14-15)
  // ============================================================================

  {
    name: 'Fireworks Stable Diffusion 3',
    id: 'fireworks-sd3',
    provider: 'fireworks',
    priority: 14,
    pricing: null,
    free: true,
    requiresKey: true,
    keyEnv: 'FIREWORKS_API_KEY',
    available: !!process.env.FIREWORKS_API_KEY,
    generate: async (prompt, options = {}) => {
      const { apiKey, keyManager } = await getApiKeyWithManager('fireworks');
      console.log(`   🔑 Using key: ${keyManager.getCurrentKeyName()}`);
      
      const response = await fetch(
        'https://api.fireworks.ai/inference/v1/image_generation/accounts/fireworks/models/stable-diffusion-3',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            prompt: prompt,
            cfg_scale: 7.5,
            height: 1024,
            width: 1024,
            steps: 30,
            seed: Math.floor(Math.random() * 1000000)
          })
        }
      );
      
      if (!response.ok) {
        throw new Error(`Fireworks API error: ${response.status}`);
      }
      
      const data = await response.json();
      const imageUrl = data.url || data.images[0]?.url;
      
      if (!imageUrl) {
        throw new Error('No image URL in Fireworks response');
      }
      
      return { url: imageUrl, provider: 'fireworks', model: 'sd3' };
    }
  },

  {
    name: 'Fireworks Playground v2.5',
    id: 'fireworks-playground-v2.5',
    provider: 'fireworks',
    priority: 15,
    pricing: null,
    free: true,
    requiresKey: true,
    keyEnv: 'FIREWORKS_API_KEY',
    available: !!process.env.FIREWORKS_API_KEY,
    generate: async (prompt, options = {}) => {
      const { apiKey, keyManager } = await getApiKeyWithManager('fireworks');
      console.log(`   🔑 Using key: ${keyManager.getCurrentKeyName()}`);
      
      const response = await fetch(
        'https://api.fireworks.ai/inference/v1/image_generation/accounts/fireworks/models/playground-v2-5-1024px-aesthetic',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            prompt: prompt,
            cfg_scale: 7.0,
            height: 1024,
            width: 1024,
            steps: 30
          })
        }
      );
      
      if (!response.ok) {
        throw new Error(`Fireworks API error: ${response.status}`);
      }
      
      const data = await response.json();
      const imageUrl = data.url || data.images[0]?.url;
      
      return { url: imageUrl, provider: 'fireworks', model: 'playground-v2.5' };
    }
  },

  // ============================================================================
  // TOGETHER AI - FREE CREDITS (PRIORITY 16-17)
  // ============================================================================

  {
    name: 'Together AI Flux Schnell',
    id: 'together-flux-schnell',
    provider: 'together',
    priority: 16,
    pricing: null,
    free: true,
    requiresKey: true,
    keyEnv: 'TOGETHER_API_KEY',
    available: !!process.env.TOGETHER_API_KEY,
    generate: async (prompt, options = {}) => {
      const { apiKey, keyManager } = await getApiKeyWithManager('together');
      console.log(`   🔑 Using key: ${keyManager.getCurrentKeyName()}`);
      
      const response = await fetch(
        'https://api.together.xyz/v1/images/generations',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'black-forest-labs/FLUX.1-schnell',
            prompt: prompt,
            width: 1024,
            height: 1024,
            steps: 4,
            n: 1
          })
        }
      );
      
      if (!response.ok) {
        throw new Error(`Together AI error: ${response.status}`);
      }
      
      const data = await response.json();
      const imageUrl = data.data[0]?.url;
      
      if (!imageUrl) {
        throw new Error('No image URL in Together response');
      }
      
      return { url: imageUrl, provider: 'together', model: 'flux-schnell' };
    }
  },

  {
    name: 'Together AI SDXL',
    id: 'together-sdxl',
    provider: 'together',
    priority: 17,
    pricing: null,
    free: true,
    requiresKey: true,
    keyEnv: 'TOGETHER_API_KEY',
    available: !!process.env.TOGETHER_API_KEY,
    generate: async (prompt, options = {}) => {
      const { apiKey, keyManager } = await getApiKeyWithManager('together');
      console.log(`   🔑 Using key: ${keyManager.getCurrentKeyName()}`);
      
      const response = await fetch(
        'https://api.together.xyz/v1/images/generations',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'stabilityai/stable-diffusion-xl-base-1.0',
            prompt: prompt,
            width: 1024,
            height: 1024,
            steps: 30,
            n: 1
          })
        }
      );
      
      if (!response.ok) {
        throw new Error(`Together AI error: ${response.status}`);
      }
      
      const data = await response.json();
      const imageUrl = data.data[0]?.url;
      
      return { url: imageUrl, provider: 'together', model: 'sdxl' };
    }
  },

  // ============================================================================
  // FAL.AI - FREE TIER (PRIORITY 18-19)
  // ============================================================================

  {
    name: 'FAL.ai Flux Pro',
    id: 'fal-flux-pro',
    provider: 'fal',
    priority: 18,
    pricing: null,
    free: true,
    requiresKey: true,
    keyEnv: 'FAL_API_KEY',
    available: !!process.env.FAL_API_KEY,
    generate: async (prompt, options = {}) => {
      const { apiKey, keyManager } = await getApiKeyWithManager('fal');
      console.log(`   🔑 Using key: ${keyManager.getCurrentKeyName()}`);
      
      const response = await fetch(
        'https://fal.run/fal-ai/flux-pro',
        {
          method: 'POST',
          headers: {
            'Authorization': `Key ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            prompt: prompt,
            image_size: 'square_hd',
            num_inference_steps: 28,
            guidance_scale: 3.5,
            num_images: 1
          })
        }
      );
      
      if (!response.ok) {
        throw new Error(`FAL.ai error: ${response.status}`);
      }
      
      const data = await response.json();
      const imageUrl = data.images[0]?.url;
      
      if (!imageUrl) {
        throw new Error('No image URL in FAL response');
      }
      
      return { url: imageUrl, provider: 'fal', model: 'flux-pro' };
    }
  },

  {
    name: 'FAL.ai Flux Realism',
    id: 'fal-flux-realism',
    provider: 'fal',
    priority: 19,
    pricing: null,
    free: true,
    requiresKey: true,
    keyEnv: 'FAL_API_KEY',
    available: !!process.env.FAL_API_KEY,
    generate: async (prompt, options = {}) => {
      const { apiKey, keyManager } = await getApiKeyWithManager('fal');
      console.log(`   🔑 Using key: ${keyManager.getCurrentKeyName()}`);
      
      const response = await fetch(
        'https://fal.run/fal-ai/flux-realism',
        {
          method: 'POST',
          headers: {
            'Authorization': `Key ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            prompt: prompt,
            image_size: 'square_hd',
            num_inference_steps: 28,
            guidance_scale: 3.5,
            num_images: 1
          })
        }
      );
      
      if (!response.ok) {
        throw new Error(`FAL.ai error: ${response.status}`);
      }
      
      const data = await response.json();
      const imageUrl = data.images[0]?.url;
      
      return { url: imageUrl, provider: 'fal', model: 'flux-realism' };
    }
  },

  // ============================================================================
  // SEGMIND - FREE TIER (PRIORITY 20-21)
  // ============================================================================

  {
    name: 'Segmind Stable Diffusion 3',
    id: 'segmind-sd3',
    provider: 'segmind',
    priority: 20,
    pricing: null,
    free: true,
    requiresKey: true,
    keyEnv: 'SEGMIND_API_KEY',
    available: !!process.env.SEGMIND_API_KEY,
    generate: async (prompt, options = {}) => {
      const { apiKey, keyManager } = await getApiKeyWithManager('segmind');
      console.log(`   🔑 Using key: ${keyManager.getCurrentKeyName()}`);
      
      const response = await fetch(
        'https://api.segmind.com/v1/sd3-medium',
        {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            prompt: prompt,
            negative_prompt: 'blurry, low quality',
            steps: 30,
            guidance_scale: 7.0,
            width: 1024,
            height: 1024,
            seed: Math.floor(Math.random() * 1000000)
          })
        }
      );
      
      if (!response.ok) {
        throw new Error(`Segmind API error: ${response.status}`);
      }
      
      const buffer = Buffer.from(await response.arrayBuffer());
      const filename = `segmind-${Date.now()}.png`;
      const filepath = path.join(process.cwd(), 'temp', filename);
      fs.writeFileSync(filepath, buffer);
      
      return { path: filepath, provider: 'segmind', model: 'sd3' };
    }
  },

  {
    name: 'Segmind SDXL',
    id: 'segmind-sdxl',
    provider: 'segmind',
    priority: 21,
    pricing: null,
    free: true,
    requiresKey: true,
    keyEnv: 'SEGMIND_API_KEY',
    available: !!process.env.SEGMIND_API_KEY,
    generate: async (prompt, options = {}) => {
      const { apiKey, keyManager } = await getApiKeyWithManager('segmind');
      console.log(`   🔑 Using key: ${keyManager.getCurrentKeyName()}`);
      
      const response = await fetch(
        'https://api.segmind.com/v1/sdxl1.0-txt2img',
        {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            prompt: prompt,
            negative_prompt: 'blurry, low quality',
            steps: 30,
            guidance_scale: 7.5,
            width: 1024,
            height: 1024,
            seed: Math.floor(Math.random() * 1000000)
          })
        }
      );
      
      if (!response.ok) {
        throw new Error(`Segmind API error: ${response.status}`);
      }
      
      const buffer = Buffer.from(await response.arrayBuffer());
      const filename = `segmind-sdxl-${Date.now()}.png`;
      const filepath = path.join(process.cwd(), 'temp', filename);
      fs.writeFileSync(filepath, buffer);
      
      return { path: filepath, provider: 'segmind', model: 'sdxl' };
    }
  },

  // ============================================================================
  // DEEPINFRA - FREE TIER (PRIORITY 22-23)
  // ============================================================================

  {
    name: 'DeepInfra SDXL',
    id: 'deepinfra-sdxl',
    provider: 'deepinfra',
    priority: 22,
    pricing: null,
    free: true,
    requiresKey: true,
    keyEnv: 'DEEPINFRA_API_KEY',
    available: !!process.env.DEEPINFRA_API_KEY,
    generate: async (prompt, options = {}) => {
      const { apiKey, keyManager } = await getApiKeyWithManager('deepinfra');
      console.log(`   🔑 Using key: ${keyManager.getCurrentKeyName()}`);
      
      const response = await fetch(
        'https://api.deepinfra.com/v1/inference/stabilityai/stable-diffusion-xl-base-1.0',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            prompt: prompt,
            negative_prompt: 'blurry, low quality',
            width: 1024,
            height: 1024,
            num_inference_steps: 30,
            guidance_scale: 7.5
          })
        }
      );
      
      if (!response.ok) {
        throw new Error(`DeepInfra error: ${response.status}`);
      }
      
      const data = await response.json();
      const imageBase64 = data.images[0];
      
      const buffer = Buffer.from(imageBase64, 'base64');
      const filename = `deepinfra-${Date.now()}.png`;
      const filepath = path.join(process.cwd(), 'temp', filename);
      fs.writeFileSync(filepath, buffer);
      
      return { path: filepath, provider: 'deepinfra', model: 'sdxl' };
    }
  },

  {
    name: 'DeepInfra Flux Schnell',
    id: 'deepinfra-flux-schnell',
    provider: 'deepinfra',
    priority: 23,
    pricing: null,
    free: true,
    requiresKey: true,
    keyEnv: 'DEEPINFRA_API_KEY',
    available: !!process.env.DEEPINFRA_API_KEY,
    generate: async (prompt, options = {}) => {
      const { apiKey, keyManager } = await getApiKeyWithManager('deepinfra');
      console.log(`   🔑 Using key: ${keyManager.getCurrentKeyName()}`);
      
      const response = await fetch(
        'https://api.deepinfra.com/v1/inference/black-forest-labs/FLUX-1-schnell',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            prompt: prompt,
            width: 1024,
            height: 1024,
            num_inference_steps: 4
          })
        }
      );
      
      if (!response.ok) {
        throw new Error(`DeepInfra error: ${response.status}`);
      }
      
      const data = await response.json();
      const imageBase64 = data.images[0];
      
      const buffer = Buffer.from(imageBase64, 'base64');
      const filename = `deepinfra-flux-${Date.now()}.png`;
      const filepath = path.join(process.cwd(), 'temp', filename);
      fs.writeFileSync(filepath, buffer);
      
      return { path: filepath, provider: 'deepinfra', model: 'flux-schnell' };
    }
  },

  // ============================================================================
  // HUGGING FACE - FREE (PRIORITY 24)
  // ============================================================================

  {
    name: 'Hugging Face Flux Schnell',
    id: 'huggingface-flux',
    provider: 'huggingface',
    priority: 24,
    pricing: null,
    free: true,
    requiresKey: true,
    keyEnv: 'HUGGINGFACE_API_KEY',
    available: !!process.env.HUGGINGFACE_API_KEY,
    generate: async (prompt, options = {}) => {
      const { apiKey, keyManager } = await getApiKeyWithManager('huggingface');
      
      console.log(`   🔑 Using key: ${keyManager.getCurrentKeyName()}`);
      
      // Try multiple Hugging Face models
      const models = [
        'black-forest-labs/FLUX.1-schnell',
        'stabilityai/stable-diffusion-xl-base-1.0',
        'runwayml/stable-diffusion-v1-5'
      ];
      
      let lastError = null;
      
      for (const model of models) {
        try {
          console.log(`   🧪 Trying model: ${model}`);
          
          const response = await fetch(
            `https://api-inference.huggingface.co/models/${model}`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                inputs: prompt,
                parameters: {
                  width: 1024,
                  height: 1024,
                  num_inference_steps: 4
                }
              })
            }
          );
          
          if (response.ok) {
            const buffer = Buffer.from(await response.arrayBuffer());
            const filename = `hf-${Date.now()}.png`;
            const filepath = path.join(process.cwd(), 'temp', filename);
            fs.writeFileSync(filepath, buffer);
            
            console.log(`   ✅ Success with ${model}`);
            return { path: filepath, provider: 'huggingface', model: model };
          }
          
          lastError = `HTTP ${response.status}`;
          console.log(`   ⚠️  ${model} failed: ${lastError}`);
          
        } catch (error) {
          lastError = error.message;
          console.log(`   ⚠️  ${model} error: ${lastError}`);
          continue;
        }
      }
      
      throw new Error(`All Hugging Face models failed. Last error: ${lastError}`);
    }
  },

  // ============================================================================
  // POLLINATIONS - FALLBACK (PRIORITY 99)
  // ============================================================================

  {
    name: 'Pollinations AI',
    id: 'pollinations',
    provider: 'pollinations',
    priority: 99,
    pricing: null,
    free: true,
    requiresKey: false,
    available: true,
    generate: async (prompt, options = {}) => {
      const model = options.model || 'flux';
      const width = options.width || 1024;
      const height = options.height || 1024;
      const seed = options.seed || Math.floor(Math.random() * 1000000);
      
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&model=${model}&seed=${seed}&nologo=true`;
      
      console.log(`   🌸 Pollinations (fallback)`);
      
      return { url: url, provider: 'pollinations', model: model };
    }
  }
];

export default IMAGE_PROVIDERS;