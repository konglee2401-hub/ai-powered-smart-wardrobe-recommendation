import axios from 'axios';
import fs from 'fs';
import { getKeyManager } from '../utils/keyManager.js';

// Get key manager for OpenRouter
const keyManager = getKeyManager('openrouter');

/**
 * OpenRouter Service
 * Unified API for multiple AI models
 * Using direct API calls instead of SDK
 */

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Analyze image with OpenRouter
 */
async function analyzeWithOpenRouter(imagePath, prompt, options = {}) {
  // Free vision models (prioritized by quality)
  const freeVisionModels = [
    'qwen/qwen-2-vl-72b-instruct',           // Best free vision model
    'google/gemini-2.0-flash-exp:free',      // Google's free model
    'meta-llama/llama-3.2-90b-vision-instruct:free', // Meta's free
    'meta-llama/llama-3.2-11b-vision-instruct:free', // Smaller, faster
  ];
  
  const model = options.model || freeVisionModels[0];
  
  console.log(`   📦 OpenRouter Model: ${model}`);
  
  // Get API key
  const keyInfo = keyManager.getNextKey();
  const apiKey = keyInfo.key;
  
  if (!apiKey) {
    throw new Error('OpenRouter client not available - No API keys configured');
  }
  
  console.log(`   🔑 Using key: ${keyInfo.name} (Request #${keyInfo.totalRequests})`);
  
  // Read and encode image
  console.log(`   📁 Encoding image as base64`);
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');
  const mimeType = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';
  const dataUrl = `data:${mimeType};base64,${base64Image}`;
  
  // STRUCTURED OUTPUT PROMPT - CRITICAL!
  const systemPrompt = `You are a fashion analysis AI. Analyze the image and return ONLY a valid JSON object.

IMPORTANT: Return ONLY the JSON, no markdown code blocks, no explanations, no extra text.

Format:
{
  "character": {
    "name": "Unknown Character",
    "series": "Real Person",
    "personality": "brief description",
    "style": "style keywords",
    "colors": ["color1", "color2"],
    "features": ["feature1", "feature2"]
  },
  "product": {
    "type": "clothing type",
    "style": "style description",
    "colors": ["color1", "color2"],
    "patterns": ["pattern1"],
    "occasion": "when to wear",
    "season": "season"
  },
  "settings": {
    "scene": "scene type",
    "lighting": "lighting type",
    "mood": "mood",
    "style": "photography style",
    "colorPalette": "palette description"
  }
}`;
  
  try {
    // Prepare request payload with system prompt
    const payload = {
      model: model,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt || 'Analyze this fashion image. Return only JSON.'
            },
            {
              type: 'image_url',
              image_url: {
                url: dataUrl
              }
            }
          ]
        }
      ],
      max_tokens: 2000,
      temperature: 0.3,  // Lower temperature for more consistent JSON
      top_p: 0.9
    };

    // Make API call
    const response = await axios.post(OPENROUTER_API_URL, payload, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://smart-wardrobe.app',
        'X-Title': 'Smart Wardrobe AI',
        'Content-Type': 'application/json'
      },
      timeout: 60000
    });
    
    // Extract content
    let content = response.data?.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error('   ❌ Invalid response structure:', response.data);
      throw new Error('No content in OpenRouter response');
    }
    
    console.log(`   ✅ Response received (${content.length} chars)`);
    console.log(`   📄 First 200 chars: ${content.substring(0, 200)}`);
    
    // Parse JSON - CRITICAL SECTION
    let analysisData;
    try {
      // Remove markdown code blocks if present
      let jsonString = content.trim();
      
      // Remove ```json and ``` if present
      if (jsonString.startsWith('```json')) {
        jsonString = jsonString.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonString.startsWith('```')) {
        jsonString = jsonString.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      // Try to find JSON object
      const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonString = jsonMatch[0];
      }
      
      analysisData = JSON.parse(jsonString);
      
      console.log(`   ✅ Parsed JSON successfully`);
      console.log(`   📊 Structure:`, {
        hasCharacter: !!analysisData.character,
        hasProduct: !!analysisData.product,
        hasSettings: !!analysisData.settings
      });
      
      // Return structured data instead of raw content
      return JSON.stringify(analysisData);
      
    } catch (parseError) {
      console.error('   ❌ Failed to parse JSON:', parseError.message);
      console.error('   📄 Raw content (first 500 chars):', content.substring(0, 500));
      // Return raw content if parsing fails - let the parser handle it
      return content;
    }
    
  } catch (error) {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      console.error(`   ❌ OpenRouter API error (${status}):`, JSON.stringify(data, null, 2));
      
      if (status === 401) {
        throw new Error('Invalid OpenRouter API key');
      } else if (status === 402) {
        throw new Error('OpenRouter: Insufficient credits');
      } else if (status === 429) {
        throw new Error('OpenRouter: Rate limit exceeded');
      } else if (status === 400) {
        throw new Error(`OpenRouter: Bad request - ${JSON.stringify(data)}`);
      } else {
        throw new Error(`OpenRouter API error: ${JSON.stringify(data)}`);
      }
    } else if (error.request) {
      throw new Error('No response from OpenRouter API - network error');
    } else {
      throw error;
    }
  }
}

/**
 * Generate text with OpenRouter (non-vision)
 */
async function generateTextWithOpenRouter(prompt, options = {}) {
  // Free text models
  const freeTextModels = [
    'qwen/qwen-2-72b-instruct',
    'meta-llama/llama-3.1-8b-instruct:free',
    'google/gemma-2-9b:free',
  ];
  
  const model = options.model || freeTextModels[0];
  
  console.log(`   📦 OpenRouter Model: ${model}`);
  
  // Get API key
  const keyInfo = keyManager.getNextKey();
  const apiKey = keyInfo.key;
  
  if (!apiKey) {
    throw new Error('OpenRouter client not available - No API keys configured');
  }
  
  console.log(`   🔑 Using key: ${keyInfo.name}`);
  
  try {
    // Prepare request payload
    const payload = {
      model: model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: options.maxTokens || 2048,
      temperature: options.temperature || 0.7,
      top_p: 0.9
    };

    // Make API call
    const response = await axios.post(OPENROUTER_API_URL, payload, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://smart-wardrobe.app',
        'X-Title': 'Smart Wardrobe AI',
        'Content-Type': 'application/json'
      },
      timeout: 60000
    });
    
    // Extract content
    const content = response.data?.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error('   ❌ Invalid response structure:', response.data);
      throw new Error('No content in OpenRouter response');
    }
    
    console.log(`   ✅ Response received (${content.length} chars)`);
    
    return content;
    
  } catch (error) {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      console.error(`   ❌ OpenRouter API error (${status}):`, JSON.stringify(data, null, 2));
      
      if (status === 401) {
        throw new Error('Invalid OpenRouter API key');
      } else if (status === 402) {
        throw new Error('OpenRouter: Insufficient credits');
      } else if (status === 429) {
        throw new Error('OpenRouter: Rate limit exceeded');
      } else {
        throw new Error(`OpenRouter API error: ${JSON.stringify(data)}`);
      }
    } else if (error.request) {
      throw new Error('No response from OpenRouter API - network error');
    } else {
      throw error;
    }
  }
}

/**
 * Analyze multiple images with OpenRouter
 */
async function analyzeMultipleImagesWithOpenRouter(imagePaths, prompt, options = {}) {
  const model = options.model || 'qwen/qwen-2-vl-72b-instruct';
  
  console.log(`   📦 OpenRouter Model: ${model}`);
  console.log(`   📸 Images: ${imagePaths.length}`);
  
  // Get API key
  const keyInfo = keyManager.getNextKey();
  const apiKey = keyInfo.key;
  
  if (!apiKey) {
    throw new Error('OpenRouter client not available - No API keys configured');
  }
  
  console.log(`   🔑 Using key: ${keyInfo.name}`);
  
  // Encode all images
  console.log(`   📁 Encoding ${imagePaths.length} images...`);
  const imageContents = imagePaths.map(imagePath => {
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const mimeType = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';
    return {
      type: 'image_url',
      image_url: {
        url: `data:${mimeType};base64,${base64Image}`
      }
    };
  });
  
  try {
    // Prepare request payload
    const payload = {
      model: model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt
            },
            ...imageContents
          ]
        }
      ],
      max_tokens: 3000,
      temperature: 0.7,
      top_p: 0.9
    };

    // Make API call
    const response = await axios.post(OPENROUTER_API_URL, payload, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://smart-wardrobe.app',
        'X-Title': 'Smart Wardrobe AI',
        'Content-Type': 'application/json'
      },
      timeout: 90000
    });
    
    const content = response.data?.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error('   ❌ Invalid response structure:', response.data);
      throw new Error('No content in OpenRouter response');
    }
    
    console.log(`   ✅ Multi-image analysis complete (${content.length} chars)`);
    
    return content;
    
  } catch (error) {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      console.error(`   ❌ OpenRouter multi-image error (${status}):`, JSON.stringify(data, null, 2));
      
      if (status === 400) {
        throw new Error(`OpenRouter: Bad request - ${JSON.stringify(data)}`);
      } else {
        throw new Error(`OpenRouter API error: ${JSON.stringify(data)}`);
      }
    } else {
      throw error;
    }
  }
}

/**
 * Get available OpenRouter models
 */
function getAvailableModels() {
  return {
    vision: [
      { id: 'qwen/qwen-2-vl-72b-instruct', name: 'Qwen2 VL 72B', free: true },
      { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash', free: true },
      { id: 'meta-llama/llama-3.2-90b-vision-instruct:free', name: 'Llama 3.2 90B Vision', free: true },
      { id: 'meta-llama/llama-3.2-11b-vision-instruct:free', name: 'Llama 3.2 11B Vision', free: true },
    ],
    text: [
      { id: 'qwen/qwen-2-72b-instruct', name: 'Qwen2 72B', free: true },
      { id: 'meta-llama/llama-3.1-8b-instruct:free', name: 'Llama 3.1 8B', free: true },
      { id: 'google/gemma-2-9b:free', name: 'Gemma 2 9B', free: true },
    ],
    image: [
      { id: 'black-forest-labs/flux-1.1-pro', name: 'Flux 1.1 Pro', pricing: '$0.04/image' },
      { id: 'black-forest-labs/flux-pro', name: 'Flux Pro', pricing: '$0.055/image' },
      { id: 'black-forest-labs/flux-dev', name: 'Flux Dev', pricing: '$0.025/image' },
      { id: 'black-forest-labs/flux-schnell', name: 'Flux Schnell', pricing: '$0.003/image' },
      { id: 'stability-ai/stable-diffusion-3', name: 'SD3', pricing: '$0.035/image' },
      { id: 'stability-ai/stable-diffusion-xl', name: 'SDXL', pricing: '$0.002/image' },
      { id: 'ideogram-ai/ideogram-v2', name: 'Ideogram V2', pricing: '$0.08/image' },
      { id: 'recraft-ai/recraft-v3', name: 'Recraft V3', pricing: '$0.05/image' },
    ]
  };
}

/**
 * Generate image with OpenRouter
 * OpenRouter supports image generation through specific models
 */
async function generateImageWithOpenRouter(prompt, options = {}) {
  // Image generation models (ordered by quality/price)
  const imageModels = [
    { id: 'black-forest-labs/flux-1.1-pro', name: 'Flux 1.1 Pro' },
    { id: 'black-forest-labs/flux-pro', name: 'Flux Pro' },
    { id: 'black-forest-labs/flux-dev', name: 'Flux Dev' },
    { id: 'black-forest-labs/flux-schnell', name: 'Flux Schnell' },
    { id: 'stability-ai/stable-diffusion-3', name: 'SD3' },
    { id: 'stability-ai/stable-diffusion-xl', name: 'SDXL' },
    { id: 'ideogram-ai/ideogram-v2', name: 'Ideogram V2' },
    { id: 'recraft-ai/recraft-v3', name: 'Recraft V3' },
  ];
  
  const model = options.model || imageModels[0].id;
  
  console.log(`   🎨 OpenRouter Image Model: ${model}`);
  
  // Get API key
  const keyInfo = keyManager.getNextKey();
  const apiKey = keyInfo.key;
  
  if (!apiKey) {
    throw new Error('OpenRouter client not available - No API keys configured');
  }
  
  console.log(`   🔑 Using key: ${keyInfo.name}`);
  
  try {
    // Prepare request payload for image generation
    const payload = {
      model: model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1,
      temperature: 1.0
    };

    // Make API call
    const response = await axios.post(OPENROUTER_API_URL, payload, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://smart-wardrobe.app',
        'X-Title': 'Smart Wardrobe AI',
        'Content-Type': 'application/json'
      },
      timeout: 120000
    });
    
    // OpenRouter returns image URL in response
    const content = response.data?.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error('   ❌ Invalid response structure:', response.data);
      throw new Error('No content in OpenRouter response');
    }
    
    // Check if content is a URL
    if (content.startsWith('http')) {
      console.log(`   ✅ Image generated: ${content.substring(0, 100)}...`);
      
      return {
        url: content,
        provider: 'openrouter',
        model: model
      };
    } else {
      // Content might be base64 or text
      console.log(`   ✅ Response received (${content.length} chars)`);
      
      return {
        data: content,
        provider: 'openrouter',
        model: model
      };
    }
    
  } catch (error) {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      console.error(`   ❌ OpenRouter image generation error (${status}):`, JSON.stringify(data, null, 2));
      
      throw new Error(`OpenRouter API error: ${JSON.stringify(data)}`);
    } else {
      throw error;
    }
  }
}

function getKeyStats() {
  return keyManager.getStats();
}

export {
  analyzeWithOpenRouter,
  generateTextWithOpenRouter,
  analyzeMultipleImagesWithOpenRouter,
  generateImageWithOpenRouter,
  getAvailableModels,
  getKeyStats
};
