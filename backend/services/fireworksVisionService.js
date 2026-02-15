import axios from 'axios';
import fs from 'fs/promises';

// ==================== CACHE ====================

let cachedModels = null;
let lastFetchTime = null;
const CACHE_DURATION = 3600000; // 1 hour

// ==================== CHECK AVAILABILITY ====================

export function isFireworksVisionAvailable() {
  return !!process.env.FIREWORKS_API_KEY;
}

// ==================== GET AVAILABLE MODELS FROM FIREWORKS API ====================

export async function getAvailableFireworksModels(forceRefresh = false) {
  const apiKey = process.env.FIREWORKS_API_KEY;
  
  if (!apiKey) {
    console.log('   ❌ FIREWORKS_API_KEY not configured');
    return [];
  }

  // Return cached if available
  if (!forceRefresh && cachedModels && lastFetchTime && (Date.now() - lastFetchTime < CACHE_DURATION)) {
    console.log('   ✅ Using cached Fireworks models');
    return cachedModels;
  }

  try {
    console.log('   🔍 Fetching available models from Fireworks API...');
    
    const response = await axios.get('https://api.fireworks.ai/inference/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      timeout: 10000
    });

    console.log('   ✅ Successfully fetched models from Fireworks');

    // Filter vision-capable models
    const allModels = response.data.data || [];
    
    const visionModels = allModels.filter(model => {
      const id = model.id.toLowerCase();
      const type = (model.type || '').toLowerCase();
      
      // Check if it's a vision model
      const isVision = 
        type === 'vision' ||
        type === 'multimodal' ||
        id.includes('vision') ||
        id.includes('vl') ||
        id.includes('qwen') ||
        id.includes('llama-v3') ||
        id.includes('phi-3') ||
        id.includes('kimi');
      
      return isVision;
    }).map(model => ({
      id: model.id,
      name: model.name || model.id.split('/').pop(),
      type: model.type,
      contextLength: model.context_length,
      pricing: model.pricing,
      available: true
    }));

    console.log(`   📊 Found ${visionModels.length} Fireworks vision models`);

    // Cache results
    cachedModels = visionModels;
    lastFetchTime = Date.now();

    return visionModels;

  } catch (error) {
    console.error('   ❌ Failed to fetch Fireworks models:', error.message);
    
    if (error.response?.status === 401) {
      console.error('   💡 Invalid API key');
    }
    
    return cachedModels || [];
  }
}

// ==================== FIND MODEL BY NAME ====================

export async function findFireworksModel(modelName) {
  const models = await getAvailableFireworksModels();
  
  // Try exact match
  let model = models.find(m => m.id === modelName);
  if (model) return model;
  
  // Try partial match
  model = models.find(m => m.id.includes(modelName));
  if (model) {
    console.log(`   🔄 Mapped ${modelName} → ${model.id}`);
    return model;
  }
  
  // Try fuzzy match
  model = models.find(m => 
    m.id.toLowerCase().includes(modelName.toLowerCase()) ||
    m.name.toLowerCase().includes(modelName.toLowerCase())
  );
  
  if (model) {
    console.log(`   🔄 Fuzzy matched ${modelName} → ${model.id}`);
    return model;
  }
  
  // Return first available vision model
  if (models.length > 0) {
    console.log(`   ⚠️  Model ${modelName} not found, using: ${models[0].id}`);
    return models[0];
  }
  
  return null;
}

// ==================== ANALYZE WITH FIREWORKS ====================

export async function analyzeWithFireworksVision(imagePath, prompt, options = {}) {
  const apiKey = process.env.FIREWORKS_API_KEY;
  
  if (!apiKey) {
    throw new Error('FIREWORKS_API_KEY not configured');
  }

  // Find model
  let model;
  const modelId = options.model || null;
  if (modelId) {
    model = await findFireworksModel(modelId);
  } else {
    const models = await getAvailableFireworksModels();
    model = models[0];
  }
  
  if (!model) {
    throw new Error('No Fireworks vision models available');
  }

  const actualModelId = model.id;
  
  console.log(`   🤖 Using Fireworks model: ${model.name} (${actualModelId})`);
  console.log(`   📝 Prompt length: ${prompt.length} chars`);

  try {
    let imageUrl;
    
    if (options.imageUrl) {
      console.log(`   🌐 Using cloud URL`);
      imageUrl = options.imageUrl;
    } else {
      // Read and encode image
      const imageBuffer = await fs.readFile(imagePath);
      const base64Image = imageBuffer.toString('base64');
      
      console.log(`   📁 Using base64 encoding`);
      console.log(`    Image size: ${(imageBuffer.length / 1024).toFixed(2)} KB`);
      imageUrl = `data:image/jpeg;base64,${base64Image}`;
    }
    
    console.log(`   🚀 Sending request to Fireworks API...`);

    const startTime = Date.now();

    const response = await axios.post(
      'https://api.fireworks.ai/inference/v1/chat/completions',
      {
        model: actualModelId,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl
                }
              },
              {
                type: 'text',
                text: prompt
              }
            ]
          }
        ],
        max_tokens: 4096,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );

    const duration = (Date.now() - startTime) / 1000;
    const answer = response.data.choices[0].message.content;

    console.log(`   ✅ Fireworks response received`);
    console.log(`   ⏱️  Duration: ${duration.toFixed(2)}s`);
    console.log(`   📊 Response length: ${answer.length} chars`);

    return answer;

  } catch (error) {
    console.error(`   ❌ Fireworks failed:`, error.message);
    
    if (error.response?.status === 404) {
      console.error(`   💡 Model not found or not deployed`);
    }
    
    throw error;
  }
}

// ==================== TEST CONNECTION ====================

export async function testFireworksConnection() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 TESTING FIREWORKS CONNECTION');
  console.log('='.repeat(80));

  const apiKey = process.env.FIREWORKS_API_KEY;
  
  if (!apiKey) {
    console.log('❌ FIREWORKS_API_KEY not found');
    console.log('💡 Get key from: https://fireworks.ai/account/api-keys');
    return false;
  }

  console.log('✅ API key found:', apiKey.substring(0, 10) + '...');

  try {
    const models = await getAvailableFireworksModels(true);
    
    if (models.length > 0) {
      console.log('\n✅ CONNECTION SUCCESSFUL');
      console.log(`📊 Found ${models.length} vision models\n`);
      
      console.log('🏆 Available vision models:');
      models.forEach((m, idx) => {
        console.log(`   ${idx + 1}. ${m.name}`);
        console.log(`      ID: ${m.id}`);
        console.log(`      Type: ${m.type}`);
      });
      
      console.log('\n' + '='.repeat(80) + '\n');
      return true;
    } else {
      console.log('\n⚠️  No vision models found');
      console.log('='.repeat(80) + '\n');
      return false;
    }

  } catch (error) {
    console.log('\n❌ CONNECTION FAILED');
    console.log('Error:', error.message);
    console.log('='.repeat(80) + '\n');
    return false;
  }
}

// ==================== EXPORT ====================

export default {
  isFireworksVisionAvailable,
  getAvailableFireworksModels,
  findFireworksModel,
  analyzeWithFireworksVision,
  testFireworksConnection
};
