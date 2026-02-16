import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';

// ==================== CACHE FOR AVAILABLE MODELS ====================

let cachedModels = null;
let lastFetchTime = null;
const CACHE_DURATION = 3600000; // 1 hour

// ==================== CHECK AVAILABILITY ====================

export function isGeminiAvailable() {
  const hasKey = !!process.env.GOOGLE_API_KEY;
  
  if (!hasKey) {
    console.log('   ⚠️  GOOGLE_API_KEY not found in environment');
  }
  
  return hasKey;
}

// ==================== GET AVAILABLE MODELS FROM GOOGLE API ====================

export async function getAvailableGeminiModels(forceRefresh = false) {
  const apiKey = process.env.GOOGLE_API_KEY;
  
  if (!apiKey) {
    console.log('   ❌ Cannot fetch models: GOOGLE_API_KEY not configured');
    return [];
  }

  // Return cached models if available and not expired
  if (!forceRefresh && cachedModels && lastFetchTime && (Date.now() - lastFetchTime < CACHE_DURATION)) {
    console.log('   ✅ Using cached models');
    return cachedModels;
  }

  try {
    console.log('   🔍 Fetching available models from Google API...');
    
    const axios = (await import('axios')).default;
    
    const response = await axios.get(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { timeout: 10000 }
    );

    console.log('   ✅ Successfully fetched models from Google');
    
    const models = response.data.models
      .filter(model => {
        // Only vision-capable models with generateContent
        const hasGenerateContent = model.supportedGenerationMethods?.includes('generateContent');
        const isGemini = model.name.includes('gemini');
        return hasGenerateContent && isGemini;
      })
      .map(model => {
        const fullName = model.name; // e.g., "models/gemini-1.5-flash"
        const modelId = fullName.split('/').pop(); // e.g., "gemini-1.5-flash"
        
        return {
          id: modelId,
          fullName: fullName,
          name: model.displayName || modelId,
          description: model.description,
          inputTokenLimit: model.inputTokenLimit,
          outputTokenLimit: model.outputTokenLimit,
          supportedMethods: model.supportedGenerationMethods
        };
      });

    console.log(`   📊 Found ${models.length} Gemini vision models`);

    // Cache the results
    cachedModels = models;
    lastFetchTime = Date.now();

    return models;

  } catch (error) {
    console.error('   ❌ Failed to fetch Gemini models:', error.message);
    
    if (error.response?.status === 400) {
      console.error('   💡 API key might be invalid or restricted');
    } else if (error.response?.status === 403) {
      console.error('   💡 API key lacks permission or quota exceeded');
    }
    
    return cachedModels || []; // Return cached models if fetch fails
  }
}

// ==================== GET BEST AVAILABLE MODEL ====================

export async function getBestAvailableModel() {
  const models = await getAvailableGeminiModels();
  
  if (models.length === 0) {
    throw new Error('No Gemini models available');
  }

  // Priority order
  const priorities = [
    'gemini-3.0-pro',
    'gemini-3.0-flash',
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gemini-2.0-flash-exp',
    'gemini-2.0-flash-thinking-exp',
    'gemini-exp-1206',
    'gemini-1.5-pro-latest',
    'gemini-1.5-pro',
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b'
  ];

  // Find first available model from priority list
  for (const priority of priorities) {
    const model = models.find(m => m.id === priority);
    if (model) {
      console.log(`   ⭐ Selected best model: ${model.name} (${model.id})`);
      return model;
    }
  }

  // If no priority model found, return first available
  console.log(`   ⭐ Selected first available: ${models[0].name} (${models[0].id})`);
  return models[0];
}

// ==================== FIND MODEL BY FRIENDLY NAME ====================

export async function findModelByName(friendlyName) {
  const models = await getAvailableGeminiModels();
  
  // Try exact match first
  let model = models.find(m => m.id === friendlyName);
  
  if (model) {
    return model;
  }

  // Try partial match
  const searchTerms = {
    'gemini-3.0-flash': ['gemini-3.0-flash', 'gemini-3.0-latest'],
    'gemini-2.5-flash': ['gemini-2.0-flash-exp', 'gemini-2.0-flash'],
    'gemini-2.5-pro': ['gemini-2.0-flash-thinking-exp', 'gemini-2.0-pro'],
    'gemini-3.0-flash': ['gemini-exp-1206', 'gemini-exp'],
    'gemini-1.5-pro': ['gemini-1.5-pro-latest', 'gemini-1.5-pro'],
    'gemini-1.5-flash': ['gemini-1.5-flash-latest', 'gemini-1.5-flash']
  };

  if (searchTerms[friendlyName]) {
    for (const term of searchTerms[friendlyName]) {
      model = models.find(m => m.id.includes(term));
      if (model) {
        console.log(`   🔄 Mapped ${friendlyName} → ${model.id}`);
        return model;
      }
    }
  }

  // Try fuzzy match
  model = models.find(m => 
    m.id.toLowerCase().includes(friendlyName.toLowerCase()) ||
    m.name.toLowerCase().includes(friendlyName.toLowerCase())
  );

  if (model) {
    console.log(`   🔄 Fuzzy matched ${friendlyName} → ${model.id}`);
    return model;
  }

  // Not found, use best available
  console.log(`   ⚠️  Model ${friendlyName} not found, using best available`);
  return await getBestAvailableModel();
}

// ==================== ANALYZE WITH GEMINI ====================

export async function analyzeWithGemini(imagePath, prompt, modelId = 'gemini-2.5-flash') {
  const apiKey = process.env.GOOGLE_API_KEY;
  
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY not configured in .env file');
  }

  // Find the actual model
  const model = await findModelByName(modelId);
  
  if (!model) {
    throw new Error(`No Gemini model available for: ${modelId}`);
  }

  const actualModelId = model.id;
  
  console.log(`   🤖 Using Gemini model: ${model.name} (${actualModelId})`);
  console.log(`   📝 Prompt length: ${prompt.length} chars`);

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const geminiModel = genAI.getGenerativeModel({ model: actualModelId });

    console.log(`   📖 Reading image file: ${imagePath}`);
    
    // Read and encode image
    const imageBuffer = await fs.readFile(imagePath);
    const base64Image = imageBuffer.toString('base64');
    
    // Detect mime type
    const ext = path.extname(imagePath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif'
    };
    const mimeType = mimeTypes[ext] || 'image/jpeg';
    
    console.log(`   📊 Image size: ${(imageBuffer.length / 1024).toFixed(2)} KB`);
    console.log(`   🎨 MIME type: ${mimeType}`);
    console.log(`   🚀 Sending request to Gemini API...`);

    const startTime = Date.now();

    // Generate content with image
    const result = await geminiModel.generateContent([
      {
        inlineData: {
          data: base64Image,
          mimeType: mimeType
        }
      },
      prompt
    ]);

    const response = await result.response;
    const text = response.text();
    
    const duration = (Date.now() - startTime) / 1000;

    console.log(`   ✅ Gemini response received`);
    console.log(`   ⏱️  Duration: ${duration.toFixed(2)}s`);
    console.log(`   📊 Response length: ${text.length} chars`);

    // Check for safety ratings
    if (response.promptFeedback?.blockReason) {
      console.warn(`   ⚠️  Content blocked: ${response.promptFeedback.blockReason}`);
    }

    return text;

  } catch (error) {
    console.error(`   ❌ Gemini analysis failed:`, error.message);
    
    // Detailed error handling
    if (error.message.includes('API_KEY_INVALID')) {
      throw new Error('Invalid Google API key. Please check your GOOGLE_API_KEY in .env');
    } else if (error.message.includes('PERMISSION_DENIED')) {
      throw new Error('API key lacks permission. Enable Generative Language API in Google Cloud Console');
    } else if (error.message.includes('RESOURCE_EXHAUSTED')) {
      throw new Error('Quota exceeded. Check your Google Cloud quota limits');
    } else if (error.message.includes('not found') || error.message.includes('404')) {
      // Model not found, try to refresh and use best available
      console.log(`   🔄 Model not found, refreshing model list...`);
      await getAvailableGeminiModels(true); // Force refresh
      const bestModel = await getBestAvailableModel();
      
      if (bestModel.id !== actualModelId) {
        console.log(`   🔄 Retrying with: ${bestModel.name} (${bestModel.id})`);
        return await analyzeWithGemini(imagePath, prompt, bestModel.id);
      }
      
      throw new Error(`Model ${actualModelId} not found and no alternatives available`);
    } else if (error.message.includes('SAFETY')) {
      throw new Error('Content blocked by safety filters. Try a different image or prompt');
    }
    
    throw error;
  }
}

// ==================== TEST CONNECTION ====================

export async function testGeminiConnection() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 TESTING GOOGLE GEMINI CONNECTION');
  console.log('='.repeat(80));

  const apiKey = process.env.GOOGLE_API_KEY;
  
  if (!apiKey) {
    console.log('❌ GOOGLE_API_KEY not found in environment');
    console.log('💡 Add to .env: GOOGLE_API_KEY=your_key_here');
    return false;
  }

  console.log('✅ API key found:', apiKey.substring(0, 10) + '...');

  try {
    // Test by fetching models
    const models = await getAvailableGeminiModels(true); // Force refresh
    
    if (models.length > 0) {
      console.log('\n✅ CONNECTION SUCCESSFUL');
      console.log(`📊 Found ${models.length} available models`);
      
      // Show top 5 models
      console.log('\n🏆 Top recommended models:');
      const topModels = models.slice(0, 5);
      topModels.forEach((m, idx) => {
        console.log(`   ${idx + 1}. ${m.name} (${m.id})`);
        if (m.description) {
          console.log(`      ${m.description.substring(0, 80)}...`);
        }
      });
      
      console.log('='.repeat(80) + '\n');
      return true;
    } else {
      console.log('\n⚠️  CONNECTION OK but no models found');
      console.log('💡 This might be a quota or permission issue');
      console.log('='.repeat(80) + '\n');
      return false;
    }

  } catch (error) {
    console.log('\n❌ CONNECTION FAILED');
    console.log('Error:', error.message);
    console.log('\n💡 TROUBLESHOOTING:');
    console.log('1. Check if API key is valid');
    console.log('2. Enable "Generative Language API" in Google Cloud Console');
    console.log('3. Check quota limits');
    console.log('4. Verify billing is enabled (if using paid tier)');
    console.log('='.repeat(80) + '\n');
    return false;
  }
}

// ==================== EXPORT ====================

export default {
  isGeminiAvailable,
  getAvailableGeminiModels,
  getBestAvailableModel,
  findModelByName,
  analyzeWithGemini,
  testGeminiConnection
};
