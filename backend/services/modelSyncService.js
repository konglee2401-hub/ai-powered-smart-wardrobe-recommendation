import AIModel from '../models/AIModel.js';
import axios from 'axios';

// ==================== DEFAULT MODELS (FALLBACK) ====================

const DEFAULT_MODELS = {
  analysis: [
    {
      modelId: 'claude-3-5-sonnet',
      name: 'Claude 3.5 Sonnet',
      provider: 'anthropic',
      type: 'analysis',
      capabilities: { vision: true, imageInput: true, streaming: true, reasoning: true },
      pricing: { inputCost: 3, outputCost: 15, free: false },
      status: { recommended: true },
      performance: { priority: 1 },
      apiDetails: { modelIdentifier: 'claude-3-5-sonnet-20241022', maxTokens: 8096, contextWindow: 200000 }
    },
    {
      modelId: 'gpt-4o',
      name: 'GPT-4o',
      provider: 'openai',
      type: 'analysis',
      capabilities: { vision: true, imageInput: true, streaming: true, reasoning: true },
      pricing: { inputCost: 2.5, outputCost: 10, free: false },
      status: { recommended: true },
      performance: { priority: 2 },
      apiDetails: { modelIdentifier: 'gpt-4o', maxTokens: 16384, contextWindow: 128000 }
    },
    {
      modelId: 'gemini-2.5-flash',
      name: 'Gemini 2.5 Flash',
      provider: 'google',
      type: 'analysis',
      capabilities: { vision: true, imageInput: true, streaming: true, reasoning: false },
      pricing: { free: true },
      status: { recommended: true },
      performance: { priority: 6 },
      apiDetails: { modelIdentifier: 'gemini-2.0-flash-exp', contextWindow: 1000000 }
    },
    {
      modelId: 'gemini-2.5-pro',
      name: 'Gemini 2.5 Pro',
      provider: 'google',
      type: 'analysis',
      capabilities: { vision: true, imageInput: true, streaming: true, reasoning: true },
      pricing: { free: true },
      status: { recommended: true },
      performance: { priority: 7 },
      apiDetails: { modelIdentifier: 'gemini-2.0-flash-thinking-exp-01-21', contextWindow: 1000000 }
    }
  ],
  
  'image-generation': [
    {
      modelId: 'replicate-flux',
      name: 'FLUX Schnell',
      provider: 'replicate',
      type: 'image-generation',
      capabilities: { imageInput: false },
      pricing: { imageCost: 0.003, free: false },
      status: { recommended: true },
      performance: { priority: 1 },
      apiDetails: { modelIdentifier: 'black-forest-labs/flux-schnell' }
    },
    {
      modelId: 'fireworks-playground',
      name: 'Playground v2.5',
      provider: 'fireworks',
      type: 'image-generation',
      capabilities: { imageInput: false },
      pricing: { imageCost: 0.002, free: false },
      status: { recommended: true },
      performance: { priority: 2 },
      apiDetails: { modelIdentifier: 'playground-v2-5-1024px-aesthetic' }
    }
  ],
  
  'video-generation': [
    {
      modelId: 'runway-gen2',
      name: 'Runway Gen-2',
      provider: 'runway',
      type: 'video-generation',
      capabilities: { imageInput: true },
      pricing: { videoCost: 0.05, free: false },
      status: { recommended: true },
      performance: { priority: 1 },
      apiDetails: { endpoint: 'https://api.runwayml.com/v1' }
    },
    {
      modelId: 'luma-dream',
      name: 'Luma Dream Machine',
      provider: 'luma',
      type: 'video-generation',
      capabilities: { imageInput: true },
      pricing: { videoCost: 0.04, free: false },
      status: { recommended: true },
      performance: { priority: 2 },
      apiDetails: { endpoint: 'https://api.lumalabs.ai/v1' }
    }
  ]
};

// ==================== FETCH MODELS FROM PROVIDERS ====================

async function fetchAnthropicModels() {
  console.log('   🔍 Fetching Anthropic models...');
  
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.log('   ⚠️  ANTHROPIC_API_KEY not configured');
    return [];
  }

  try {
    // Anthropic doesn't have a public models list API
    // Return known models
    const knownModels = [
      {
        modelId: 'claude-3-5-sonnet',
        name: 'Claude 3.5 Sonnet',
        apiDetails: { modelIdentifier: 'claude-3-5-sonnet-20241022' },
        status: { available: true }
      },
      {
        modelId: 'claude-3-opus',
        name: 'Claude 3 Opus',
        apiDetails: { modelIdentifier: 'claude-3-opus-20240229' },
        status: { available: true }
      },
      {
        modelId: 'claude-3-haiku',
        name: 'Claude 3 Haiku',
        apiDetails: { modelIdentifier: 'claude-3-haiku-20240307' },
        status: { available: true }
      }
    ];

    console.log(`   ✅ Found ${knownModels.length} Anthropic models`);
    return knownModels;

  } catch (error) {
    console.error('   ❌ Failed to fetch Anthropic models:', error.message);
    return [];
  }
}

async function fetchOpenAIModels() {
  console.log('   🔍 Fetching OpenAI models...');
  
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log('   ⚠️  OPENAI_API_KEY not configured');
    return [];
  }

  try {
    const response = await axios.get('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      timeout: 10000
    });

    const visionModels = response.data.data
      .filter(model => model.id.includes('gpt-4') && (model.id.includes('vision') || model.id.includes('gpt-4o')))
      .map(model => ({
        modelId: model.id.replace(':', '-'),
        name: model.id.toUpperCase(),
        apiDetails: { modelIdentifier: model.id },
        status: { available: true },
        metadata: { description: 'OpenAI Vision Model' }
      }));

    console.log(`   ✅ Found ${visionModels.length} OpenAI vision models`);
    return visionModels;

  } catch (error) {
    console.error('   ❌ Failed to fetch OpenAI models:', error.message);
    return [];
  }
}

async function fetchGoogleModels() {
  console.log('   🔍 Fetching Google Gemini models...');
  
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.log('   ⚠️  GOOGLE_API_KEY not configured');
    return [];
  }

  try {
    const response = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
      timeout: 10000
    });

    const visionModels = response.data.models
      .filter(model => 
        model.supportedGenerationMethods?.includes('generateContent') &&
        model.name.includes('gemini')
      )
      .map(model => {
        const modelId = model.name.split('/').pop();
        return {
          modelId: modelId,
          name: model.displayName || modelId,
          apiDetails: { 
            modelIdentifier: modelId,
            contextWindow: model.inputTokenLimit,
            maxTokens: model.outputTokenLimit
          },
          status: { 
            available: true,
            experimental: modelId.includes('exp')
          },
          metadata: { 
            description: model.description,
            supportedFormats: model.supportedGenerationMethods
          }
        };
      });

    console.log(`   ✅ Found ${visionModels.length} Google Gemini models`);
    return visionModels;

  } catch (error) {
    console.error('   ❌ Failed to fetch Google models:', error.message);
    return [];
  }
}

async function fetchFireworksModels() {
  console.log('   🔍 Fetching Fireworks models...');
  
  const apiKey = process.env.FIREWORKS_API_KEY;
  if (!apiKey) {
    console.log('   ⚠️  FIREWORKS_API_KEY not configured');
    return [];
  }

  try {
    const response = await axios.get('https://api.fireworks.ai/inference/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      timeout: 10000
    });

    const visionModels = response.data.data
      .filter(model => model.type === 'vision' || model.id.includes('vision') || model.id.includes('vl'))
      .map(model => ({
        modelId: model.id.replace('accounts/fireworks/models/', '').replace(/\//g, '-'),
        name: model.id.split('/').pop(),
        apiDetails: { 
          modelIdentifier: model.id,
          contextWindow: model.context_length
        },
        status: { available: true },
        pricing: {
          inputCost: model.pricing?.input || 0.2,
          outputCost: model.pricing?.output || 0.2
        }
      }));

    console.log(`   ✅ Found ${visionModels.length} Fireworks vision models`);
    return visionModels;

  } catch (error) {
    console.error('   ❌ Failed to fetch Fireworks models:', error.message);
    return [];
  }
}

async function fetchReplicateModels() {
  console.log('   🔍 Fetching Replicate models...');
  
  const apiKey = process.env.REPLICATE_API_TOKEN;
  if (!apiKey) {
    console.log('   ⚠️  REPLICATE_API_TOKEN not configured');
    return [];
  }

  try {
    // Replicate doesn't have a simple models list API
    // Return known image generation models
    const knownModels = [
      {
        modelId: 'replicate-flux-schnell',
        name: 'FLUX Schnell',
        apiDetails: { modelIdentifier: 'black-forest-labs/flux-schnell' },
        status: { available: true }
      },
      {
        modelId: 'replicate-flux-dev',
        name: 'FLUX Dev',
        apiDetails: { modelIdentifier: 'black-forest-labs/flux-dev' },
        status: { available: true }
      },
      {
        modelId: 'replicate-sdxl',
        name: 'Stable Diffusion XL',
        apiDetails: { modelIdentifier: 'stability-ai/sdxl' },
        status: { available: true }
      }
    ];

    console.log(`   ✅ Found ${knownModels.length} Replicate models`);
    return knownModels;

  } catch (error) {
    console.error('   ❌ Failed to fetch Replicate models:', error.message);
    return [];
  }
}

// ==================== SYNC MODELS TO DATABASE ====================

export async function syncModelsToDatabase(type = null) {
  console.log('\n' + '='.repeat(80));
  console.log('🔄 SYNCING MODELS TO DATABASE');
  console.log('='.repeat(80));
  
  const typesToSync = type ? [type] : ['analysis', 'image-generation', 'video-generation'];
  
  for (const modelType of typesToSync) {
    console.log(`\n📊 Syncing ${modelType} models...`);
    
    let allModels = [];
    
    if (modelType === 'analysis') {
      // Fetch from all analysis providers
      const [anthropic, openai, google, fireworks] = await Promise.all([
        fetchAnthropicModels(),
        fetchOpenAIModels(),
        fetchGoogleModels(),
        fetchFireworksModels()
      ]);
      
      allModels = [
        ...anthropic.map(m => ({ ...m, provider: 'anthropic', type: 'analysis' })),
        ...openai.map(m => ({ ...m, provider: 'openai', type: 'analysis' })),
        ...google.map(m => ({ ...m, provider: 'google', type: 'analysis' })),
        ...fireworks.map(m => ({ ...m, provider: 'fireworks', type: 'analysis' }))
      ];
      
    } else if (modelType === 'image-generation') {
      // Fetch from image generation providers
      const replicate = await fetchReplicateModels();
      
      allModels = [
        ...replicate.map(m => ({ ...m, provider: 'replicate', type: 'image-generation' }))
      ];
      
    } else if (modelType === 'video-generation') {
      // Video generation models (no API to fetch, use defaults)
      allModels = DEFAULT_MODELS['video-generation'];
    }
    
    // Merge with defaults
    const defaultModels = DEFAULT_MODELS[modelType] || [];
    const mergedModels = [...defaultModels];
    
    // Add fetched models that aren't in defaults
    for (const fetchedModel of allModels) {
      const exists = mergedModels.find(m => m.modelId === fetchedModel.modelId);
      if (!exists) {
        mergedModels.push(fetchedModel);
      }
    }
    
    console.log(`\n💾 Saving ${mergedModels.length} ${modelType} models to database...`);
    
    // Upsert to database
    let savedCount = 0;
    let updatedCount = 0;
    
    for (const modelData of mergedModels) {
      try {
        const existing = await AIModel.findOne({ modelId: modelData.modelId });
        
        if (existing) {
          // Update existing model (preserve performance stats)
          existing.name = modelData.name || existing.name;
          existing.status.available = modelData.status?.available ?? existing.status.available;
          existing.apiDetails = { ...existing.apiDetails, ...modelData.apiDetails };
          existing.metadata.lastChecked = new Date();
          
          await existing.save();
          updatedCount++;
          
        } else {
          // Create new model
          await AIModel.create({
            ...modelData,
            capabilities: modelData.capabilities || {},
            pricing: modelData.pricing || {},
            status: modelData.status || {},
            performance: modelData.performance || {},
            metadata: modelData.metadata || {}
          });
          savedCount++;
        }
        
      } catch (error) {
        console.error(`   ❌ Failed to save ${modelData.modelId}:`, error.message);
      }
    }
    
    console.log(`   ✅ Saved ${savedCount} new models`);
    console.log(`   ✅ Updated ${updatedCount} existing models`);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ MODEL SYNC COMPLETE');
  console.log('='.repeat(80) + '\n');
}

// ==================== GET MODELS FROM DATABASE ====================

export async function getModelsFromDatabase(type, options = {}) {
  const {
    provider = null,
    onlyAvailable = true,
    onlyRecommended = false,
    limit = null
  } = options;
  
  const query = { type };
  
  if (provider) query.provider = provider;
  if (onlyAvailable) query['status.available'] = true;
  if (onlyRecommended) query['status.recommended'] = true;
  
  query['status.deprecated'] = false;
  
  let queryBuilder = AIModel.find(query).sort({ 'performance.priority': 1 });
  
  if (limit) queryBuilder = queryBuilder.limit(limit);
  
  const models = await queryBuilder;
  
  // If no models found, return defaults
  if (models.length === 0) {
    console.log(`   ⚠️  No models in database, using defaults for ${type}`);
    return DEFAULT_MODELS[type] || [];
  }
  
  return models;
}

// ==================== CHECK MODEL AVAILABILITY ====================

export async function checkModelAvailability(modelId) {
  const model = await AIModel.findOne({ modelId });
  
  if (!model) {
    console.log(`   ⚠️  Model ${modelId} not found in database`);
    return false;
  }
  
  // Check if API key exists for provider
  const providerKeys = {
    'anthropic': process.env.ANTHROPIC_API_KEY,
    'openai': process.env.OPENAI_API_KEY,
    'google': process.env.GOOGLE_API_KEY,
    'byteplus': process.env.BYTEPLUS_API_KEY,
    'fireworks': process.env.FIREWORKS_API_KEY,
    'zai': process.env.ZAI_TOKEN,
    'grok': process.env.GROK_SSO,
    'replicate': process.env.REPLICATE_API_TOKEN,
    'huggingface': process.env.HUGGINGFACE_API_KEY,
    'runway': process.env.RUNWAY_API_KEY,
    'luma': process.env.LUMA_API_KEY
  };
  
  const hasKey = !!providerKeys[model.provider];
  
  // Update availability in database
  if (model.status.available !== hasKey) {
    await model.updateAvailability(hasKey);
  }
  
  return hasKey && model.status.available;
}

// ==================== AUTO SYNC ON STARTUP ====================

export async function autoSyncOnStartup() {
  try {
    console.log('\n🔄 Auto-syncing models on startup...');
    
    // Check when last synced
    const lastModel = await AIModel.findOne().sort({ 'metadata.lastChecked': -1 });
    
    if (!lastModel) {
      console.log('   📊 No models in database, performing initial sync...');
      await syncModelsToDatabase();
      return;
    }
    
    const hoursSinceLastSync = (Date.now() - lastModel.metadata.lastChecked) / (1000 * 60 * 60);
    
    if (hoursSinceLastSync > 24) {
      console.log(`   📊 Last sync was ${hoursSinceLastSync.toFixed(1)} hours ago, syncing...`);
      await syncModelsToDatabase();
    } else {
      console.log(`   ✅ Models synced ${hoursSinceLastSync.toFixed(1)} hours ago, skipping`);
    }
    
  } catch (error) {
    console.error('   ❌ Auto-sync failed:', error.message);
    console.log('   💡 Will use default models as fallback');
  }
}

// ==================== EXPORT ====================

export default {
  syncModelsToDatabase,
  getModelsFromDatabase,
  checkModelAvailability,
  autoSyncOnStartup,
  DEFAULT_MODELS
};
