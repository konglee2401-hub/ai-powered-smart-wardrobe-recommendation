/**
 * NVIDIA Image Generation Provider
 * Supports Stable Diffusion 3.5 and Flux models via NVIDIA NIM API
 */

import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

/**
 * Generate images using NVIDIA API
 * Supports Stable Diffusion 3.5 and Flux models
 */
export async function generateWithNvidia(provider, prompt, negativePrompt = '', apiKey, count = 1) {
  console.log(`   🎨 NVIDIA: ${provider.model}`);
  console.log(`   📝 Prompt length: ${prompt.length} chars`);
  console.log(`   🚫 Negative: ${negativePrompt ? 'Yes' : 'No'}`);
  
  // Build request payload
  const payload = {
    model: provider.model,
    prompt: prompt,
    negative_prompt: negativePrompt || '',
    num_images: count,
    width: 1024,
    height: 1024,
    steps: 30,
    guidance_scale: 7.5,
    sampler: 'DDIM'
  };

  try {
    const response = await axios.post(
      provider.endpoint,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 120000 // 2 minutes
      }
    );
    
    // NVIDIA returns base64 encoded images
    const images = response.data.images || response.data.data;
    
    if (!images || images.length === 0) {
      throw new Error('No images returned from NVIDIA API');
    }
    
    const results = [];
    
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      
      // Handle both base64 string and object formats
      const base64Data = typeof img === 'string' ? img : img.b64_json || img.image;
      
      // Save to file
      const buffer = Buffer.from(base64Data, 'base64');
      const filename = `nvidia-${provider.model.replace(/\//g, '-')}-${Date.now()}-${i}.png`;
      const filepath = path.join(process.cwd(), 'uploads', 'generated', filename);
      
      await fs.mkdir(path.join(process.cwd(), 'uploads', 'generated'), { recursive: true });
      await fs.writeFile(filepath, buffer);
      
      results.push({
        url: `/uploads/generated/${filename}`,
        provider: 'nvidia',
        model: provider.model,
        index: i + 1
      });
    }
    
    console.log(`   ✅ Generated ${results.length} images from NVIDIA`);
    return results;
    
  } catch (error) {
    console.error(`   ❌ NVIDIA error:`, error.response?.data || error.message);
    
    // Handle specific error types
    if (error.response?.status === 401) {
      throw new Error('Invalid NVIDIA API key');
    } else if (error.response?.status === 429) {
      throw new Error('NVIDIA rate limit exceeded');
    } else if (error.response?.status === 400) {
      throw new Error(`Invalid request: ${error.response.data?.detail || error.message}`);
    }
    
    throw error;
  }
}

/**
 * Get available NVIDIA models
 */
export function getNvidiaModels() {
  return [
    {
      name: 'NVIDIA Stable Diffusion 3.5 Large',
      model: 'stabilityai/stable-diffusion-3-5-large',
      description: 'High quality, slower generation',
      free: true,
      supportsNegativePrompt: true
    },
    {
      name: 'NVIDIA Stable Diffusion 3.5 Medium',
      model: 'stabilityai/stable-diffusion-3-5-medium',
      description: 'Balanced quality and speed',
      free: true,
      supportsNegativePrompt: true
    },
    {
      name: 'NVIDIA Flux Schnell',
      model: 'black-forest-labs/flux-schnell',
      description: 'Fast generation, good quality',
      free: true,
      supportsNegativePrompt: true
    },
    {
      name: 'NVIDIA SDXL Turbo',
      model: 'stabilityai/sdxl-turbo',
      description: 'Very fast, lower quality',
      free: true,
      supportsNegativePrompt: true
    }
  ];
}

export default {
  generateWithNvidia,
  getNvidiaModels
};
