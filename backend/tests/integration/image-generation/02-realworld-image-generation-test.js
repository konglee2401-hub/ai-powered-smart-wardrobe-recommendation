
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import connectDB from './config/db.js';
import { generateImages } from './services/imageGenService.js';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') }); 

async function testRealImageGeneration() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 TESTING REAL IMAGE GENERATION (Unified Service)');
  console.log('='.repeat(80) + '\n');
  
  try {
    await connectDB();
    
    // Check if models exist in DB first, if not, sync
    const { syncModelsWithDB } = await import('./services/modelSyncService.js');
    await syncModelsWithDB({ forceCheck: false });

    const prompt = "A futuristic fashion portrait of a cybernetic model wearing neon glowing streetwear, night city background, rainy atmosphere, 8k resolution, photorealistic";
    const negativePrompt = "blurry, low quality, distorted, bad anatomy";
    
    console.log(`\n📝 Prompt: ${prompt}`);
    
    // Call the unified generation service
    // This will try Google -> OpenRouter -> NVIDIA -> Fireworks -> etc.
    const result = await generateImages(
      prompt,
      negativePrompt,
      'auto', // modelPreference
      1 // count
    );

    console.log('\n---------------------------------------------------');
    if (result.results && result.results.length > 0) {
        console.log(`✅ SUCCESS! Generated ${result.results.length} images.`);
        console.log(`   Provider used: ${result.summary.providers.join(', ')}`);
        
        result.results.forEach((img, idx) => {
            console.log(`\n   🖼️  Image ${idx + 1}:`);
            console.log(`      URL: ${img.url.substring(0, 100)}...`); // Truncate base64/long urls
            console.log(`      Provider: ${img.provider}`);
            console.log(`      Model: ${img.model}`);
        });
    } else {
        console.error('❌ FAILED: No images generated.');
        if (result.errors) {
            console.error('   Errors encountered:');
            result.errors.forEach(e => console.error(`      - ${e.provider}: ${e.error}`));
        }
    }
    console.log('---------------------------------------------------\n');

    process.exit(0);
  } catch (error) {
    console.error('\n💥 TEST CRITICAL ERROR:', error);
    process.exit(1);
  }
}

testRealImageGeneration();
