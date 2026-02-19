/**
 * Image Generation Service
 * Complete rewrite with robust fallback system
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import { IMAGE_GEN_PROVIDERS } from '../config/imageGenConfig.js';
import { executeWithKeyRotation } from '../utils/keyManager.js';
import { generateWithNvidia } from './providers/nvidiaImageGen.js';
import { encodeImage } from '../utils/imageUtils.js'; // Import encodeImage
import AIModel from '../models/AIModel.js';
import AIProvider from '../models/AIProvider.js'; // Import AIProvider model

/**
 * Main image generation function with intelligent fallback
 * @param {string} prompt - The prompt for image generation
 * @param {string} negativePrompt - Things to avoid in the image
 * @param {string} modelPreference - Model preference or 'auto'
 * @param {number} count - Number of images to generate
 * @returns {Promise<Array>} Array of generated images
 */
export async function generateImages(prompt, negativePrompt = '', modelPreference = 'auto', count = 2, characterImagePath = null, productImagePath = null, useCase = 'default') {
  console.log('\n🎨 Starting Unified Image Generation with Provider Priority...');

  const providers = await AIProvider.find({ isEnabled: true }).sort({ priority: 1 });
  if (providers.length === 0) {
    throw new Error('No enabled image generation providers found in the database.');
  }

  const results = [];
  const errors = [];
  const providersUsed = new Set();

  for (let i = 0; i < count; i++) {
    let imageGenerated = false;
    console.log(`\n🖼️  Generating image ${i + 1}/${count}...`);

    for (const provider of providers) {
      console.log(`\n   ▶️ Trying provider: ${provider.name} (Priority: ${provider.priority})`);

      const availableModels = await AIModel.find({
        provider: provider.providerId,
        type: { $in: ['image-generation', 'image-gen'] },
        'status.available': true
      }).sort({ 'performance.priority': -1, 'status.performanceScore': -1 });

      if (availableModels.length === 0) {
        console.log(`      ⚠️ No available models for ${provider.name}.`);
        continue;
      }

      for (const modelRecord of availableModels) {
        const providerConfig = IMAGE_GEN_PROVIDERS.find(p => p.id === modelRecord.modelId);
        if (!providerConfig) {
          console.log(`      ❓ No config for model ${modelRecord.modelId}`);
          continue;
        }

        try {
          console.log(`      🔄 Attempting with model: ${providerConfig.name}`);

          const result = await executeWithKeyRotation(
            providerConfig.provider.toUpperCase(),
            (apiKey) => providerConfig.generate(prompt, { negativePrompt }, apiKey)
          );

          if (result && result.url) {
            results.push({
              url: result.url,
              provider: providerConfig.name,
              model: providerConfig.model,
              timestamp: new Date(),
            });
            providersUsed.add(providerConfig.name);
            imageGenerated = true;
            console.log(`      ✅ Success with ${providerConfig.name}`);
            break; 
          }
        } catch (error) {
          console.error(`      ❌ ${providerConfig.name} failed:`, error.message);
          errors.push({ provider: providerConfig.name, error: error.message });
        }
      } 
      if (imageGenerated) break; 
    }

    if (!imageGenerated) {
      console.error(`💥 Failed to generate image ${i + 1} with any provider. Halting generation process.`);
      break; 
    }
  }

  const summary = {
    total: count,
    successful: results.length,
    failed: count - results.length,
    providers: Array.from(providersUsed),
  };

  return { results, summary, errors };
}


/**
 * Generate with specific provider
 */
async function generateWithProvider(provider, prompt, negativePrompt, apiKey, count, characterImagePath, productImagePath) {
  switch (provider.name) {
    case 'openrouter':
      return await generateWithOpenRouter(provider, prompt, negativePrompt, apiKey, count, characterImagePath, productImagePath);
    
    case 'nvidia':
      return await generateWithNvidia(provider, prompt, negativePrompt, apiKey, count, characterImagePath, productImagePath);
    
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
async function generateWithOpenRouter(provider, prompt, negativePrompt, apiKey, count, characterImagePath, productImagePath) {
  console.log(`   🎨 OpenRouter: ${provider.model}`);
  
  const payload = {
    model: provider.model,
    prompt: prompt,
    negative_prompt: negativePrompt || '',
    n: count,
    size: '1024x1024',
    response_format: 'url'
  };

  if (characterImagePath) {
    payload.init_image = `data:image/jpeg;base64,${await encodeImage(characterImagePath)}`;
    payload.strength = 0.8; // Control strength of init image vs prompt
    console.log(`   🖼️  OpenRouter: Using character image as init_image.`);
  }
  
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
async function generateWithReplicate(provider, prompt, negativePrompt, apiKey, count, characterImagePath, productImagePath) {
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
async function generateWithFal(provider, prompt, negativePrompt, apiKey, count, characterImagePath, productImagePath) {
  console.log(`   🎨 Fal.ai: ${provider.model}`);
  
  const payload = {
    prompt: prompt,
    negative_prompt: negativePrompt || '',
    num_images: count,
    image_size: '1024x1024'
  };

  if (characterImagePath) {
    payload.input_image = await encodeImage(characterImagePath);
    console.log(`   🖼️  Fal.ai: Using character image as input_image.`);
  }
  
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
async function generateWithTogether(provider, prompt, negativePrompt, apiKey, count, characterImagePath, productImagePath) {
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
async function generateWithFireworks(provider, prompt, negativePrompt, apiKey, count, characterImagePath, productImagePath) {
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
 * Google AI Implementation (using official SDK for Imagen 3)
 */
export async function generateWithGoogle(provider, prompt, negativePrompt, apiKey, count, characterImagePath, productImagePath) {
  console.log(`   🎨 Google AI: ${provider.model}`);

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const generativeModel = genAI.getGenerativeModel({ model: provider.model });

    const imageParts = [];
    if (characterImagePath) {
      const charImageBase64 = await encodeImage(characterImagePath);
      imageParts.push({
        inlineData: {
          mimeType: 'image/jpeg', // Assuming JPEG for character image
          data: charImageBase64,
        },
      });
    }
    if (productImagePath) {
      const prodImageBase64 = await encodeImage(productImagePath);
      imageParts.push({
        inlineData: {
          mimeType: 'image/jpeg', // Assuming JPEG for product image
          data: prodImageBase64,
        },
      });
    }

    const generationConfig = {
      responseMimeType: 'image/png', // Request PNG images
      // You can add more config here if needed, like image dimensions
    };
    
    // For image-to-image, combine prompt and image parts
    const modelPrompt = imageParts.length > 0 ? [...imageParts, { text: prompt }] : prompt;

    const result = await generativeModel.generateContent({
      contents: [{ role: 'user', parts: modelPrompt }],
      generationConfig,
    });
    const response = await result.response;

    const images = [];
    if (response.candidates && response.candidates.length > 0) {
      for (const candidate of response.candidates) {
        if (candidate.content && candidate.content.parts) {
          for (const part of candidate.content.parts) {
            if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
              images.push({
                url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
                provider: 'google',
                model: provider.model,
                index: images.length + 1
              });
            }
          }
        }
      }
    }

    if (images.length === 0) {
      throw new Error('No images returned from Google AI');
    }

    console.log(`   ✅ Generated ${images.length} images from Google AI`);
    return images;

  } catch (error) {
    console.error(`   ❌ Google AI error:`, error.message);
    throw error;
  }
}

/**
 * Segmind Implementation
 */
async function generateWithSegmind(provider, prompt, negativePrompt, apiKey, count, characterImagePath, productImagePath) {
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
async function generateWithDeepInfra(provider, prompt, negativePrompt, apiKey, count, characterImagePath, productImagePath) {
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
async function generateWithHuggingFace(provider, prompt, negativePrompt, apiKey, count, characterImagePath, productImagePath) {
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
async function generateWithPollinations(provider, prompt, negativePrompt, count, characterImagePath, productImagePath) {
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


