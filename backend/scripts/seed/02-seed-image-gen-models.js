
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import AIModel from './models/AIModel.js';
import { IMAGE_GEN_PROVIDERS } from './config/imageGenConfig.js';
import connectDB from './config/db.js';

dotenv.config();

async function seedImageGenModels() {
  try {
    await connectDB();
    console.log('✅ Connected to MongoDB');

    console.log(`\n🌱 Seeding ${IMAGE_GEN_PROVIDERS.length} Image Generation Models...`);
    
    // Clear existing image generation models to avoid duplicates/stale data
    // Or we can update them. Let's update/upsert.

    for (const provider of IMAGE_GEN_PROVIDERS) {
      const modelData = {
        modelId: provider.id,
        name: provider.name,
        provider: provider.provider, // 'openrouter', 'nvidia', etc.
        type: 'image-generation',
        capabilities: ['text-to-image'],
        status: {
          available: true,
          message: 'Ready',
          lastChecked: new Date(),
          performanceScore: 95 // Default high score
        },
        pricing: {
            input: 0,
            output: 0,
            currency: 'USD'
        },
        contextWindow: 0,
        maxOutputTokens: 0
      };

      await AIModel.findOneAndUpdate(
        { modelId: provider.id },
        modelData,
        { upsert: true, new: true }
      );
      
      console.log(`   ✅ Synced: ${provider.name} (${provider.id})`);
    }

    console.log('\n✨ Seeding Complete!');
    process.exit(0);
  } catch (error) {
    console.error('💥 Seeding Failed:', error);
    process.exit(1);
  }
}

seedImageGenModels();
