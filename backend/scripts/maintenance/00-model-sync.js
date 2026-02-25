import AIModel from '../models/AIModel.js';
import { getAnalysisProviders } from '../config/analysisProviders.js';
import { IMAGE_PROVIDERS } from '../config/imageProviders.js'; // Assuming image providers are here

async function testProvider(provider) {
  try {
    // 1. Simulate Check
    // In a real scenario, this would check if the provider's API key is valid
    // and if we can list models or make a tiny test call.
    // For now, we assume if the key exists in keyManager (checked elsewhere), it's "available".
    
    // 2. Return dummy success
    return { isAvailable: true, performanceScore: 100 };
  } catch (error) {
    console.error(`❌ Test failed for ${provider.name}:`, error.message);
    return { isAvailable: false, performanceScore: 0 };
  }
}

export async function syncModelsWithDB() {
  console.log('🔄 Starting AI model sync with database...');
  
  // Clear existing analysis and image-gen models to ensure a fresh start
  // This prevents ghost models from causing issues
  // await AIModel.deleteMany({ type: { $in: ['analysis', 'image-gen'] } });
  // console.log('   🧹 Cleared old model entries.');

  // Use the main service logic instead of this simplified script
  const { syncModelsWithDB: mainSync } = await import('../services/modelSyncService.js');
  return mainSync({ forceCheck: true });
}
