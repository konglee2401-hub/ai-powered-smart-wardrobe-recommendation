
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

import { getKeyManager } from '../utils/keyManager.js';

// Helper to get key (supports rotation if needed, or just gets first available)
function getProviderKey(provider) {
  try {
    const km = getKeyManager(provider);
    if (!km) return process.env[`${provider.toUpperCase()}_API_KEY`];
    
    // For syncing models, we just need ANY valid key, not necessarily rotated for load balancing
    // So we check if we have keys in the manager
    const keys = km.getKeys();
    if (keys && keys.length > 0) {
      // Find first active key
      const activeKey = keys.find(k => k.status === 'active' || !k.status);
      return activeKey ? activeKey.key : keys[0].key;
    }
    
    // Fallback to env
    return process.env[`${provider.toUpperCase()}_API_KEY`];
  } catch (error) {
    // If key manager fails or not initialized, fallback to env
    return process.env[`${provider.toUpperCase()}_API_KEY`];
  }
}

// ==================== FETCH PROVIDER MODELS ====================

async function fetchAnthropicModels() {
  // Placeholder - Anthropic doesn't have a public models list API that returns pricing/specs easily
  // We return defaults or static list
  return DEFAULT_MODELS.analysis.filter(m => m.provider === 'anthropic');
}

async function fetchOpenAIModels() {
  console.log('   🔍 Fetching OpenAI models...');
  
  const apiKey = getProviderKey('openai');
  if (!apiKey) {
      console.log('   ⚠️  OPENAI_API_KEY not configured');
      return [];
  }
  
  try {
    const response = await axios.get('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    
    // Filter for known vision models
    return response.data.data
      .filter(m => m.id.includes('gpt-4') || m.id.includes('vision'))
      .map(m => ({
         modelId: m.id,
         name: m.id,
         status: { available: true }
      }));
  } catch (e) {
      console.error('   ❌ Failed to fetch OpenAI models:', e.message);
      return [];
  }
}

async function fetchGoogleModels() {
  console.log('   🔍 Fetching Google models...');
  
  const apiKey = getProviderKey('google');
  if (!apiKey) {
    console.log('   ⚠️  GOOGLE_API_KEY not configured');
    return [];
  }

  try {
    const response = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    
    if (!response.data.models) return [];

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
  
  const apiKey = getProviderKey('fireworks');
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

async function fetchMoonshotModels() {
  console.log('   🔍 Fetching Moonshot models...');
  
  const apiKey = getProviderKey('moonshot');
  if (!apiKey) {
    console.log('   ⚠️  MOONSHOT_API_KEY not configured');
    return [];
  }

  try {
    const response = await axios.get('https://api.moonshot.ai/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      timeout: 10000
    });

    const models = response.data.data.map(model => ({
      modelId: model.id,
      name: model.id,
      apiDetails: { 
        modelIdentifier: model.id
      },
      status: { available: true },
      pricing: { free: false } // Assuming paid
    }));

    console.log(`   ✅ Found ${models.length} Moonshot models`);
    return models;

  } catch (error) {
    console.error('   ❌ Failed to fetch Moonshot models:', error.message);
    return [];
  }
}

async function fetchReplicateModels() {
    return DEFAULT_MODELS['image-generation'].filter(m => m.provider === 'replicate');
}

// ==================== SYNC FUNCTIONS ====================

/**
 * Main sync function: Fetches models from all providers and updates DB
 * @param {Object} options - Sync options
 * @param {boolean} options.forceCheck - Force bypass of cache check
 */
export async function syncModelsWithDB(options = {}) {
  const { forceCheck = false } = options;
  console.log('\n========================================');
  console.log('🔄 STARTING MODEL SYNC WITH DATABASE');
  console.log(`   Options: forceCheck=${forceCheck}`);
  console.log('========================================\n');

  try {
    // Check if we ran recently (1 hour cache)
    if (!forceCheck) {
      const lastSync = await AIModel.findOne().sort({ 'status.lastChecked': -1 });
      if (lastSync && lastSync.status && lastSync.status.lastChecked) {
        const hoursSinceLastCheck = (Date.now() - new Date(lastSync.status.lastChecked).getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastCheck < 1) {
          console.log(`⏳ Skipping sync: Last check was ${hoursSinceLastCheck.toFixed(2)} hours ago (< 1 hour).`);
          return { skipped: true, reason: 'Recent check' };
        }
      }
    }

    let allModels = [];

    // Fetch from all analysis providers
    const [anthropic, openai, google, fireworks, moonshot] = await Promise.all([
      fetchAnthropicModels(),
      fetchOpenAIModels(),
      fetchGoogleModels(),
      fetchFireworksModels(),
      fetchMoonshotModels()
    ]);
    
    allModels.push(...anthropic.map(m => ({ ...m, provider: 'anthropic', type: 'analysis' })));
    allModels.push(...openai.map(m => ({ ...m, provider: 'openai', type: 'analysis' })));
    allModels.push(...google.map(m => ({ ...m, provider: 'google', type: 'analysis' })));
    allModels.push(...fireworks.map(m => ({ ...m, provider: 'fireworks', type: 'analysis' })));
    allModels.push(...moonshot.map(m => ({ ...m, provider: 'moonshot', type: 'analysis' })));

    // Fetch from image generation providers
    const replicate = await fetchReplicateModels();
    allModels.push(...replicate.map(m => ({ ...m, provider: 'replicate', type: 'image-generation' })));

    // Use defaults for others if not fetched
    if (DEFAULT_MODELS['video-generation']) {
       allModels.push(...DEFAULT_MODELS['video-generation']);
    }

    // Save to DB
    console.log(`\n💾 Saving ${allModels.length} models to database...`);
    
    let updatedCount = 0;
    let savedCount = 0;
    
    for (const modelData of allModels) {
      try {
        const existing = await AIModel.findOne({ modelId: modelData.modelId });
        
        if (existing) {
          // Update existing
          await AIModel.updateOne(
            { _id: existing._id },
            { 
              $set: {
                name: modelData.name || existing.name,
                status: {
                  ...existing.status,
                  available: true, // Mark as available since we just fetched it
                  lastChecked: new Date(),
                  message: 'Synced from provider'
                },
                apiDetails: { ...existing.apiDetails, ...modelData.apiDetails },
                pricing: { ...existing.pricing, ...modelData.pricing }
              }
            }
          );
          updatedCount++;
        } else {
          // Create new
          await AIModel.create({
            modelId: modelData.modelId,
            name: modelData.name,
            provider: modelData.provider,
            type: modelData.type,
            capabilities: modelData.capabilities || {},
            pricing: modelData.pricing || {},
            status: {
              available: true,
              lastChecked: new Date(),
              performanceScore: 80, // Default score
              message: 'Initial sync'
            },
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
    return { success: true, saved: savedCount, updated: updatedCount };

  } catch (error) {
    console.error('❌ Model sync failed:', error);
    return { success: false, error: error.message };
  }
}

// ==================== AUTO SYNC ====================

export function autoSyncOnStartup() {
  setTimeout(() => {
    syncModelsWithDB({ forceCheck: false })
      .then(res => console.log('✅ Startup model sync completed:', res))
      .catch(err => console.error('❌ Startup model sync failed:', err));
  }, 5000); // 5s delay
}
