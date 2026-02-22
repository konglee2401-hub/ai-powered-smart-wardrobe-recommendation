import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import AIProvider from './models/AIProvider.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

async function checkProviders() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 CHECKING PROVIDER CONFIGURATION');
  console.log('='.repeat(80) + '\n');
  
  try {
    await connectDB();
    
    // Get all providers from DB
    const providers = await AIProvider.find().sort({ priority: 1 });
    
    console.log(`✅ Total providers found: ${providers.length}\n`);
    
    // Group by category
    const categories = {
      analysis: [],
      image: [],
      video: []
    };
    
    providers.forEach(p => {
      if (p.capabilities.analysis) categories.analysis.push(p);
      if (p.capabilities.image) categories.image.push(p);
      if (p.capabilities.video) categories.video.push(p);
    });
    
    console.log(`📊 VISION & ANALYSIS PROVIDERS: ${categories.analysis.length}`);
    categories.analysis.slice(0, 3).forEach(p => {
      console.log(`   • ${p.name} (${p.providerId})`);
      console.log(`     - API Keys: ${p.apiKeys?.length || 0}`);
      if (p.apiKeys?.length > 0) {
        p.apiKeys.forEach(k => {
          console.log(`       ✓ ${k.label} [${k.status}]`);
        });
      }
    });
    if (categories.analysis.length > 3) {
      console.log(`   ... and ${categories.analysis.length - 3} more`);
    }
    
    console.log(`\n🎨 IMAGE GENERATION PROVIDERS: ${categories.image.length}`);
    categories.image.slice(0, 3).forEach(p => {
      console.log(`   • ${p.name} (${p.providerId})`);
      console.log(`     - API Keys: ${p.apiKeys?.length || 0}`);
      if (p.apiKeys?.length > 0) {
        p.apiKeys.forEach(k => {
          console.log(`       ✓ ${k.label} [${k.status}]`);
        });
      }
    });
    if (categories.image.length > 3) {
      console.log(`   ... and ${categories.image.length - 3} more`);
    }
    
    console.log(`\n🎬 VIDEO GENERATION PROVIDERS: ${categories.video.length}`);
    categories.video.slice(0, 3).forEach(p => {
      console.log(`   • ${p.name} (${p.providerId})`);
      console.log(`     - API Keys: ${p.apiKeys?.length || 0}`);
      if (p.apiKeys?.length > 0) {
        p.apiKeys.forEach(k => {
          console.log(`       ✓ ${k.label} [${k.status}]`);
        });
      }
    });
    if (categories.video.length > 3) {
      console.log(`   ... and ${categories.video.length - 3} more`);
    }
    
    console.log('\n' + '='.repeat(80));
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkProviders();
