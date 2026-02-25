import connectDB from './config/db.js';
import AIProvider from './models/AIProvider.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const capabilityMapping = {
  // ANALYSIS & VISION PROVIDERS
  'google': { analysis: true, image: true, video: true, text: true },
  'openai': { analysis: true, image: true, text: true },
  'anthropic': { analysis: true, text: true },
  'openrouter': { image: true, analysis: true, text: true },
  'fireworks': { analysis: true, image: true, text: true },
  'nvidia': { image: true, text: true },
  'replicate': { image: true, video: true },
  'huggingface': { image: true },
  'pollinations': { image: true },
  'moonshot': { text: true },
  'groq': { text: true },
  'mistral': { text: true }
};

async function migrateCapabilities() {
  console.log('🔄 Starting capability migration...');
  
  try {
    await connectDB();
    
    let updatedCount = 0;
    
    for (const [providerId, newCapabilities] of Object.entries(capabilityMapping)) {
      const result = await AIProvider.findOneAndUpdate(
        { providerId },
        { capabilities: newCapabilities },
        { new: true }
      );
      
      if (result) {
        console.log(`✅ Updated ${result.name} (${providerId})`);
        console.log(`   Capabilities: ${JSON.stringify(result.capabilities)}`);
        updatedCount++;
      }
    }
    
    console.log(`\n✨ Migration complete! Updated ${updatedCount} providers.`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

migrateCapabilities();
