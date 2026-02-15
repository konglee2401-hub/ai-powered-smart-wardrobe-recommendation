import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { analyzeWithZAI } from '../services/zaiService.js';
import { analyzeWithNVIDIA } from '../services/nvidiaService.js';
import { analyzeWithMistral } from '../services/mistralService.js';
import { analyzeWithGroq } from '../services/groqService.js';
import { getKeyManager } from '../utils/keyManager.js';
import {
  analyzeWithOpenRouter,
  analyzeMultipleImagesWithOpenRouter
} from '../services/openRouterService.js';
import { parseAnalysis, generateImagePrompt } from '../services/analysisParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize AI clients lazily to handle missing API keys
let anthropic = null;
let openai = null;
let genAI = null;

function getAnthropicClient() {
  if (!anthropic && process.env.ANTHROPIC_API_KEY) {
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropic;
}

function getOpenAIClient() {
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

function getGeminiClient() {
  if (!genAI && process.env.GOOGLE_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  }
  return genAI;
}

// Vision model providers configuration with multi-key support
const VISION_PROVIDERS = [
  // ============================================================================
  // TIER 0: OPENROUTER - FREE MODELS (HIGHEST PRIORITY - FREE!)
  // ============================================================================
  {
    name: 'OpenRouter Qwen 2 VL 72B',
    provider: 'openrouter',
    model: 'qwen/qwen-2-vl-72b-instruct',
    priority: 0, // HIGHEST PRIORITY
    pricing: null, // FREE
    available: !!getKeyManager('openrouter').keys.length,
    analyze: analyzeWithOpenRouter
  },
  {
    name: 'OpenRouter Gemini 2.0 Flash',
    provider: 'openrouter',
    model: 'google/gemini-2.0-flash-exp:free',
    priority: 1,
    pricing: null, // FREE
    available: !!getKeyManager('openrouter').keys.length,
    analyze: analyzeWithOpenRouter
  },
  {
    name: 'OpenRouter Llama 3.2 90B Vision',
    provider: 'openrouter',
    model: 'meta-llama/llama-3.2-90b-vision-instruct:free',
    priority: 2,
    pricing: null, // FREE
    available: !!getKeyManager('openrouter').keys.length,
    analyze: analyzeWithOpenRouter
  },
  {
    name: 'OpenRouter Llama 3.2 11B Vision',
    provider: 'openrouter',
    model: 'meta-llama/llama-3.2-11b-vision-instruct:free',
    priority: 3,
    pricing: null, // FREE
    available: !!getKeyManager('openrouter').keys.length,
    analyze: analyzeWithOpenRouter
  },

  // ============================================================================
  // TIER 1: PREMIUM PAID MODELS
  // ============================================================================
  {
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    priority: 10,
    pricing: 3.00,
    available: !!getKeyManager('anthropic').keys.length,
    analyze: analyzeWithClaude
  },
  {
    name: 'GPT-4o',
    provider: 'openai',
    model: 'gpt-4o',
    priority: 11,
    pricing: 5.00,
    available: !!getKeyManager('openai').keys.length,
    analyze: analyzeWithGPT4Vision
  },
  {
    name: 'Claude 3 Opus',
    provider: 'anthropic',
    model: 'claude-3-opus-20240229',
    priority: 12,
    pricing: 15.00,
    available: !!getKeyManager('anthropic').keys.length,
    analyze: analyzeWithClaude
  },
  {
    name: 'GPT-4 Vision',
    provider: 'openai',
    model: 'gpt-4-vision-preview',
    priority: 13,
    pricing: 10.00,
    available: !!getKeyManager('openai').keys.length,
    analyze: analyzeWithGPT4Vision
  },

  // ============================================================================
  // TIER 2: BUDGET PAID MODELS
  // ============================================================================
  {
    name: 'Claude 3 Haiku',
    provider: 'anthropic',
    model: 'claude-3-haiku-20240307',
    priority: 20,
    pricing: 0.25,
    available: !!getKeyManager('anthropic').keys.length,
    analyze: analyzeWithClaude
  },
  {
    name: 'Gemini 2.5 Flash',
    provider: 'google',
    model: 'gemini-2.5-flash',
    priority: 21,
    pricing: 0.075,
    available: !!process.env.GOOGLE_API_KEY || !!getKeyManager('google').keys.length,
    analyze: analyzeWithGemini
  },
  {
    name: 'Gemini 2.5 Pro',
    provider: 'google',
    model: 'gemini-2.5-pro',
    priority: 22,
    pricing: 1.25,
    available: !!process.env.GOOGLE_API_KEY || !!getKeyManager('google').keys.length,
    analyze: analyzeWithGemini
  },

  // ============================================================================
  // TIER 3: Z.AI VISION (FREE)
  // ============================================================================
  {
    name: 'Z.AI GLM-4 Vision',
    provider: 'zai',
    model: 'glm-4-vision', // FIXED: was glm-4v-flash
    priority: 30,
    pricing: null, // FREE
    available: !!getKeyManager('zai').keys.length,
    analyze: analyzeWithZAI
  },

  // ============================================================================
  // TIER 4: NVIDIA (FREE CREDITS)
  // ============================================================================
  {
    name: 'NVIDIA Llama 3.2 11B Vision',
    provider: 'nvidia',
    model: 'meta/llama-3.2-11b-vision-instruct',
    priority: 40,
    pricing: null,
    available: !!getKeyManager('nvidia').keys.length,
    analyze: analyzeWithNVIDIA
  },
  {
    name: 'NVIDIA Llama 3.2 90B Vision',
    provider: 'nvidia',
    model: 'meta/llama-3.2-90b-vision-instruct',
    priority: 41,
    pricing: null,
    available: !!getKeyManager('nvidia').keys.length,
    analyze: analyzeWithNVIDIA
  },
  {
    name: 'NVIDIA Phi-3.5 Vision',
    provider: 'nvidia',
    model: 'microsoft/phi-3.5-vision-instruct',
    priority: 42,
    pricing: null,
    available: !!getKeyManager('nvidia').keys.length,
    analyze: analyzeWithNVIDIA
  },

  // ============================================================================
  // TIER 5: MISTRAL (TRIAL CREDITS)
  // ============================================================================
  {
    name: 'Mistral Pixtral 12B',
    provider: 'mistral',
    model: 'pixtral-12b-2409',
    priority: 50,
    pricing: 0.15,
    available: !!getKeyManager('mistral').keys.length,
    analyze: analyzeWithMistral
  },
  {
    name: 'Mistral Pixtral Large',
    provider: 'mistral',
    model: 'pixtral-large-latest',
    priority: 51,
    pricing: 2.00,
    available: !!getKeyManager('mistral').keys.length,
    analyze: analyzeWithMistral
  },

  // ============================================================================
  // TIER 6: OTHER GEMINI MODELS
  // ============================================================================
  {
    name: 'Gemini 1.5 Pro',
    provider: 'google',
    model: 'gemini-1.5-pro',
    priority: 60,
    pricing: 1.25,
    available: !!process.env.GOOGLE_API_KEY || !!getKeyManager('google').keys.length,
    analyze: analyzeWithGemini
  },
  {
    name: 'Gemini 1.5 Flash',
    provider: 'google',
    model: 'gemini-1.5-flash',
    priority: 61,
    pricing: 0.075,
    available: !!process.env.GOOGLE_API_KEY || !!getKeyManager('google').keys.length,
    analyze: analyzeWithGemini
  },

  // ============================================================================
  // TIER 7: Z.AI FALLBACK
  // ============================================================================
  {
    name: 'Z.AI GLM-5',
    provider: 'zai',
    model: 'glm-5',
    priority: 70,
    pricing: 0.5,
    available: !!getKeyManager('zai').keys.length,
    analyze: analyzeWithZAI
  }
];

// Display key statistics
function displayKeyStats() {
  console.log('\n📊 API KEY STATISTICS');
  console.log('='.repeat(80));

  const providers = ['openrouter', 'anthropic', 'openai', 'google', 'zai', 'nvidia', 'mistral', 'groq', 'fireworks'];
  
  for (const provider of providers) {
    try {
      const manager = getKeyManager(provider);
      const stats = manager.getStats();
      
      if (stats.totalKeys > 0) {
        console.log(`\n🔑 ${provider.toUpperCase()}`);
        console.log(`   Total keys: ${stats.totalKeys}`);
        console.log(`   Available: ${stats.availableKeys}`);
        console.log(`   Rate limited: ${stats.failedKeys}`);
        
        stats.keys.forEach(key => {
          const status = key.isAvailable ? '✅' : '⚠️';
          console.log(`   ${status} ${key.name}: ${key.totalRequests} requests, ${key.failures} failures`);
        });
      }
    } catch (e) {
      // Skip if no keys configured
    }
  }
  
  console.log('\n' + '='.repeat(80) + '\n');
}

// Helper function to encode image to base64
function encodeImageToBase64(imagePath) {
  const imageBuffer = fs.readFileSync(imagePath);
  return imageBuffer.toString('base64');
}

// Helper function to get image media type
function getImageMediaType(imagePath) {
  const ext = path.extname(imagePath).toLowerCase();
  const mediaTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp'
  };
  return mediaTypes[ext] || 'image/jpeg';
}

// Claude analysis function
async function analyzeWithClaude(imagePath, prompt, options = {}) {
  const client = getAnthropicClient();
  if (!client) {
    throw new Error('Anthropic client not available - ANTHROPIC_API_KEY not set');
  }

  const base64Image = encodeImageToBase64(imagePath);
  const mediaType = getImageMediaType(imagePath);

  const message = await client.messages.create({
    model: options.model || 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64Image,
            },
          },
          {
            type: 'text',
            text: prompt
          }
        ],
      },
    ],
  });

  return message.content[0].text;
}

// GPT-4 Vision analysis function
async function analyzeWithGPT4Vision(imagePath, prompt, options = {}) {
  const client = getOpenAIClient();
  if (!client) {
    throw new Error('OpenAI client not available - OPENAI_API_KEY not set');
  }

  const base64Image = encodeImageToBase64(imagePath);
  const mediaType = getImageMediaType(imagePath);

  const response = await client.chat.completions.create({
    model: options.model || 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: prompt
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:${mediaType};base64,${base64Image}`
            }
          }
        ]
      }
    ],
    max_tokens: 4096
  });

  return response.choices[0].message.content;
}

// Gemini analysis function
async function analyzeWithGemini(imagePath, prompt, options = {}) {
  const client = getGeminiClient();
  if (!client) {
    throw new Error('Gemini client not available - GOOGLE_API_KEY not set');
  }

  const model = client.getGenerativeModel({ 
    model: options.model || 'gemini-2.5-flash' 
  });

  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');
  const mediaType = getImageMediaType(imagePath);

  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        data: base64Image,
        mimeType: mediaType
      }
    }
  ]);

  const response = await result.response;
  return response.text();
}

// Fallback mechanism with enhanced logging
async function analyzeWithFallback(imageInput, analysisType, options = {}) {
  // Validate input
  if (!imageInput) {
    throw new Error('No image input provided');
  }

  // Check if file exists
  if (typeof imageInput === 'string' && !fs.existsSync(imageInput)) {
    throw new Error(`Image file not found: ${imageInput}`);
  }

  const errors = [];
  const sortedProviders = VISION_PROVIDERS
    .filter(p => p.available)
    .sort((a, b) => a.priority - b.priority);

  // Enhanced logging with more details
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🎯 STARTING ANALYSIS: ${analysisType.toUpperCase()}`);
  console.log(`📊 Total providers: ${VISION_PROVIDERS.length}`);
  console.log(`✅ Available providers: ${sortedProviders.length}`);
  console.log(`❌ Unavailable: ${VISION_PROVIDERS.length - sortedProviders.length}`);
  console.log(`${'='.repeat(80)}\n`);

  // Display key statistics
  displayKeyStats();

  // Log unavailable providers with reasons
  const unavailableProviders = VISION_PROVIDERS.filter(p => !p.available);
  if (unavailableProviders.length > 0) {
    console.log('❌ Unavailable providers:');
    unavailableProviders.forEach(p => {
      const reason = p.provider === 'openrouter' ? 'Missing OPENROUTER_API_KEY' :
                     p.provider === 'anthropic' ? 'Missing ANTHROPIC_API_KEY' :
                     p.provider === 'openai' ? 'Missing OPENAI_API_KEY' :
                     p.provider === 'google' ? 'Missing GOOGLE_API_KEY' :
                     p.provider === 'zai' ? 'Missing ZAI_API_KEY' :
                     p.provider === 'nvidia' ? 'Missing NVIDIA_API_KEY' :
                     p.provider === 'mistral' ? 'Missing MISTRAL_API_KEY' :
                     p.provider === 'groq' ? 'Missing GROQ_API_KEY' :
                     'API key not configured';
      console.log(`   - ${p.name} (${p.provider}): ${reason}`);
    });
    console.log('');
  }

  const prompts = {
    character: `You are a fashion analysis AI. Analyze this image and return ONLY valid JSON in this EXACT format:

{
  "character": {
    "name": "Unknown Character",
    "series": "Real Person",
    "personality": "Brief personality description",
    "style": "minimalist, elegant, modern",
    "colors": ["color1", "color2", "color3"],
    "features": ["feature1", "feature2", "feature3"]
  },
  "product": {
    "type": "clothing type",
    "style": "style description",
    "colors": ["color1", "color2"],
    "patterns": ["pattern1", "pattern2"],
    "occasion": "when to wear",
    "season": "which season"
  },
  "settings": {
    "scene": "scene description",
    "lighting": "lighting type",
    "mood": "mood description",
    "style": "photography style",
    "colorPalette": "color palette description"
  }
}

Rules:
1. Return ONLY the JSON object, no markdown, no explanations
2. All fields must be present
3. Arrays must have at least 2-3 items
4. Be specific and descriptive
5. Focus on visual details`,
    clothing: `You are a fashion analysis AI. Analyze this image and return ONLY valid JSON in this EXACT format:

{
  "character": {
    "name": "Unknown Character",
    "series": "Real Person",
    "personality": "Brief personality description",
    "style": "minimalist, elegant, modern",
    "colors": ["color1", "color2", "color3"],
    "features": ["feature1", "feature2", "feature3"]
  },
  "product": {
    "type": "clothing type",
    "style": "style description",
    "colors": ["color1", "color2"],
    "patterns": ["pattern1", "pattern2"],
    "occasion": "when to wear",
    "season": "which season"
  },
  "settings": {
    "scene": "scene description",
    "lighting": "lighting type",
    "mood": "mood description",
    "style": "photography style",
    "colorPalette": "color palette description"
  }
}

Rules:
1. Return ONLY the JSON object, no markdown, no explanations
2. All fields must be present
3. Arrays must have at least 2-3 items
4. Be specific and descriptive
5. Focus on visual details`,
    outfit: `You are a fashion analysis AI. Analyze this image and return ONLY valid JSON in this EXACT format:

{
  "character": {
    "name": "Unknown Character",
    "series": "Real Person",
    "personality": "Brief personality description",
    "style": "minimalist, elegant, modern",
    "colors": ["color1", "color2", "color3"],
    "features": ["feature1", "feature2", "feature3"]
  },
  "product": {
    "type": "clothing type",
    "style": "style description",
    "colors": ["color1", "color2"],
    "patterns": ["pattern1", "pattern2"],
    "occasion": "when to wear",
    "season": "which season"
  },
  "settings": {
    "scene": "scene description",
    "lighting": "lighting type",
    "mood": "mood description",
    "style": "photography style",
    "colorPalette": "color palette description"
  }
}

Rules:
1. Return ONLY the JSON object, no markdown, no explanations
2. All fields must be present
3. Arrays must have at least 2-3 items
4. Be specific and descriptive
5. Focus on visual details`
  };

  const prompt = prompts[analysisType] || prompts.character;

  for (let i = 0; i < sortedProviders.length; i++) {
    const provider = sortedProviders[i];
    
    try {
      console.log(`\n   🔄 Attempt ${i + 1}/${sortedProviders.length}: ${provider.name} (${provider.provider})`);
      console.log(`   📊 Priority: ${provider.priority}`);
      
      if (provider.pricing) {
        console.log(`   💰 Pricing: $${provider.pricing}/M tokens`);
      } else {
        console.log(`   🆓 FREE model`);
      }

      if (provider.requiresBrowser) {
        console.log(`   🌐 Browser automation required`);
      }

      console.log(`   ⏳ Analyzing...`);

      const startTime = Date.now();
      const result = await provider.analyze(imageInput, prompt, { model: provider.model });
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      console.log(`\n${'='.repeat(80)}`);
      console.log(`✅ SUCCESS with ${provider.name}`);
      console.log(`⏱️  Duration: ${duration}s`);
      console.log(`${'='.repeat(80)}\n`);
      
      return {
        success: true,
        provider: provider.name,
        model: provider.model,
        duration: `${duration}s`,
        result
      };

    } catch (error) {
      const errorMsg = `${provider.name} failed: ${error.message}`;
      errors.push(errorMsg);
      console.error(`   ❌ ${errorMsg}`);
      
      if (error.stack) {
        const stackLines = error.stack.split('\n').slice(0, 3);
        console.error(`   📋 Stack trace:`, stackLines.join('\n   '));
      }

      // Continue to next provider with clear message
      if (i < sortedProviders.length - 1) {
        console.log(`   ⏭️  Trying next provider...\n`);
      }
    }
  }

  // All providers failed
  console.log(`\n${'='.repeat(80)}`);
  console.log(`❌ ALL ${sortedProviders.length} ANALYSIS MODELS FAILED`);
  console.log(`${'='.repeat(80)}\n`);
  console.log('Error summary:');
  errors.forEach((err, idx) => {
    console.log(`${idx + 1}. ${err}`);
  });
  console.log('');
  
  throw new Error(`All vision providers failed. Tried ${sortedProviders.length} models.`);
}

// Product analysis endpoint
const analyzeProductImage = async (req, res) => {
  let tempFilePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    console.log(`File: ${req.file.originalname || 'memory buffer'} (${req.file.buffer.length} bytes)`);

    // Create temp directory
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Save buffer to temp file
    tempFilePath = path.join(tempDir, `${Date.now()}-${req.file.originalname || 'upload.jpg'}`);
    fs.writeFileSync(tempFilePath, req.file.buffer);

    console.log(`✅ Saved temp file: ${tempFilePath}`);

    // Analyze with fallback
    const result = await analyzeWithFallback(
      tempFilePath,
      'clothing',
      req.body.options
    );

    // Parse analysis
    const useCase = req.body.useCase || 'general';
    const parsedAnalysis = parseAnalysis(result.result, useCase);

    // Transform result to match frontend expected format
    res.json({
      success: true,
      data: {
        analysis: result.result,
        parsed: parsedAnalysis,
        modelUsed: result.model,
        provider: result.provider,
        duration: result.duration
      }
    });

  } catch (error) {
    console.error('Product analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze product',
      details: error.message
    });
  } finally {
    // Cleanup temp file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
        console.log(`🗑️  Deleted temp file: ${tempFilePath}`);
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError);
      }
    }
  }
};

// Main analysis endpoint
const analyzeCharacterImage = async (req, res) => {
  let tempFilePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    console.log(`File: ${req.file.originalname || 'memory buffer'} (${req.file.buffer.length} bytes)`);

    // Create temp directory
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Save buffer to temp file
    tempFilePath = path.join(tempDir, `${Date.now()}-${req.file.originalname || 'upload.jpg'}`);
    fs.writeFileSync(tempFilePath, req.file.buffer);

    console.log(`✅ Saved temp file: ${tempFilePath}`);

    // Analyze with fallback
    const result = await analyzeWithFallback(
      tempFilePath,
      'character',
      req.body.options
    );

    // Parse analysis
    const useCase = req.body.useCase || 'general';
    const parsedAnalysis = parseAnalysis(result.result, useCase);

    // Generate image prompt if change-clothes use case
    let generationPrompt = null;
    if (useCase === 'change-clothes') {
      try {
        generationPrompt = generateImagePrompt(parsedAnalysis);
      } catch (error) {
        console.warn('Failed to generate image prompt:', error.message);
      }
    }

    // Transform result to match frontend expected format
    res.json({
      success: true,
      data: {
        analysis: result.result,
        parsed: parsedAnalysis,
        generationPrompt: generationPrompt,
        modelUsed: result.model,
        provider: result.provider,
        duration: result.duration
      }
    });

  } catch (error) {
    console.error('Character analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze character',
      details: error.message
    });
  } finally {
    // Cleanup temp file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
        console.log(`🗑️  Deleted temp file: ${tempFilePath}`);
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError);
      }
    }
  }
};

// Get available models
const getAvailableModels = async (req, res) => {
  res.json({
    success: true,
    data: {
      models: VISION_PROVIDERS.filter(p => p.available).map(p => ({
        id: p.model,
        name: p.name,
        provider: p.provider,
        priority: p.priority,
        pricing: p.pricing,
        available: p.available
      }))
    }
  });
};

// Get available providers with detailed info
const getAvailableProviders = async (req, res) => {
  try {
    const providers = VISION_PROVIDERS.map(p => ({
      name: p.name,
      provider: p.provider,
      model: p.model,
      priority: p.priority,
      pricing: p.pricing,
      available: p.available
    }));

    // Group by provider type
    const grouped = {
      openrouter: providers.filter(p => p.provider === 'openrouter'),
      anthropic: providers.filter(p => p.provider === 'anthropic'),
      openai: providers.filter(p => p.provider === 'openai'),
      google: providers.filter(p => p.provider === 'google'),
      nvidia: providers.filter(p => p.provider === 'nvidia'),
      zai: providers.filter(p => p.provider === 'zai'),
      mistral: providers.filter(p => p.provider === 'mistral'),
      groq: providers.filter(p => p.provider === 'groq')
    };

    // Get key stats for each provider
    const keyStats = {};
    const providerNames = ['openrouter', 'anthropic', 'openai', 'google', 'nvidia', 'zai', 'mistral', 'groq'];
    
    for (const provider of providerNames) {
      try {
        const manager = getKeyManager(provider);
        keyStats[provider] = manager.getStats();
      } catch (e) {
        keyStats[provider] = { totalKeys: 0, availableKeys: 0 };
      }
    }

    res.json({
      success: true,
      providers: providers,
      grouped: grouped,
      keyStats: keyStats,
      stats: {
        total: providers.length,
        available: providers.filter(p => p.available).length,
        free: providers.filter(p => !p.pricing).length,
        paid: providers.filter(p => p.pricing).length
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Stub functions for other routes
const getAllOptions = async (req, res) => {
  res.json({ success: true, data: [] });
};

const getOptionsByCategory = async (req, res) => {
  res.json({ success: true, data: [] });
};

const exportOptions = async (req, res) => {
  res.json({ success: true, data: [] });
};

const buildPrompt = async (req, res) => {
  try {
    const { characterAnalysis, productAnalysis, mode, useCase, userSelections, customPrompt, maxLength } = req.body;

    // Build prompt based on analysis and selections
    let prompt = '';

    if (customPrompt) {
      prompt = customPrompt;
    } else {
      // Build from analysis and selections
      const parts = [];

      if (characterAnalysis) {
        parts.push(`Character: ${characterAnalysis}`);
      }

      if (productAnalysis) {
        parts.push(`Product/Clothing: ${productAnalysis}`);
      }

      if (userSelections) {
        const selections = [];
        if (userSelections.scene) selections.push(`Scene: ${userSelections.scene}`);
        if (userSelections.lighting) selections.push(`Lighting: ${userSelections.lighting}`);
        if (userSelections.mood) selections.push(`Mood: ${userSelections.mood}`);
        if (userSelections.style) selections.push(`Style: ${userSelections.style}`);
        if (userSelections.colorPalette) selections.push(`Color Palette: ${userSelections.colorPalette}`);

        if (selections.length > 0) {
          parts.push(`Settings: ${selections.join(', ')}`);
        }
      }

      prompt = parts.join('\n\n');
    }

    // Truncate if needed
    if (maxLength && prompt.length > maxLength) {
      prompt = prompt.substring(0, maxLength) + '...';
    }

    res.json({
      success: true,
      data: {
        prompt,
        mode,
        useCase,
        length: prompt.length
      }
    });

  } catch (error) {
    console.error('Build prompt error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to build prompt',
      details: error.message
    });
  }
};

const discoverOptions = async (req, res) => {
  res.json({ success: true, message: 'Options discovered' });
};

const deleteOption = async (req, res) => {
  res.json({ success: true, message: 'Option deleted' });
};

// Export
export {
  analyzeCharacterImage,
  analyzeProductImage,
  analyzeWithFallback,
  getAvailableModels,
  getAvailableProviders,
  getAllOptions,
  getOptionsByCategory,
  exportOptions,
  buildPrompt,
  discoverOptions,
  deleteOption,
  VISION_PROVIDERS
};

// Default export for compatibility with existing routes
export default {
  analyzeCharacterImage,
  analyzeProductImage,
  analyzeWithFallback,
  getAvailableModels,
  getAvailableProviders,
  getAllOptions,
  getOptionsByCategory,
  exportOptions,
  buildPrompt,
  discoverOptions,
  deleteOption,
  VISION_PROVIDERS
};
