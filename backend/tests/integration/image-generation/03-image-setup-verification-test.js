import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import { getKeyManager } from './utils/keyManager.js';
import AIProvider from './models/AIProvider.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

async function testImageGenSetup() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 TESTING IMAGE GENERATION SETUP');
  console.log('='.repeat(80) + '\n');
  
  try {
    await connectDB();
    
    // Check image providers in DB
    const imageProviders = await AIProvider.find({ 'capabilities.image': true });
    console.log(`✅ Image Generation Providers: ${imageProviders.length}`);
    imageProviders.forEach(p => {
      console.log(`   • ${p.name} (${p.providerId}) - Priority: ${p.priority}`);
    });
    
    // Check API keys loaded
    console.log('\n🔑 API Keys Status:');
    const km = getKeyManager();
    const stats = km.getStats();
    console.log(JSON.stringify(stats, null, 2));
    
    // Check if any image provider has keys
    const imageProvidersWithKeys = imageProviders.filter(p => (p.apiKeys?.length || 0) > 0);
    console.log(`\n✅ Image Providers with API Keys: ${imageProvidersWithKeys.length}`);
    imageProvidersWithKeys.forEach(p => {
      console.log(`   • ${p.name}: ${p.apiKeys.length} key(s)`);
    });
    
    if (imageProvidersWithKeys.length === 0) {
      console.log('\n   ⚠️  No API keys configured for image providers.');
      console.log('   You can add them via the UI Provider Manager.');
    }
    
    console.log('\n✨ Setup check complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testImageGenSetup();
