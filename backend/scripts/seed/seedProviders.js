/**
 * Seed AI Providers
 * 
 * Ensures all AI providers exist in the database with default configuration
 * Run on server startup to maintain provider registry
 */

import AIProvider from '../../models/AIProvider.js';

// Default providers configuration
const DEFAULT_PROVIDERS = [
  {
    providerId: 'openrouter',
    name: 'OpenRouter',
    priority: 10,
    capabilities: { analysis: true, vision: true, text: true, image: false, video: false }
  },
  {
    providerId: 'google',
    name: 'Google (Gemini)',
    priority: 20,
    capabilities: { analysis: true, vision: true, text: true, image: true, video: false }
  },
  {
    providerId: 'anthropic',
    name: 'Anthropic (Claude)',
    priority: 30,
    capabilities: { analysis: true, vision: true, text: true, image: false, video: false }
  },
  {
    providerId: 'openai',
    name: 'OpenAI (GPT)',
    priority: 40,
    capabilities: { analysis: true, vision: true, text: true, image: true, video: false }
  },
  {
    providerId: 'groq',
    name: 'Groq',
    priority: 50,
    capabilities: { analysis: true, vision: false, text: true, image: false, video: false }
  },
  {
    providerId: 'mistral',
    name: 'Mistral AI',
    priority: 60,
    capabilities: { analysis: true, vision: false, text: true, image: false, video: false }
  },
  {
    providerId: 'nvidia',
    name: 'NVIDIA NIM',
    priority: 70,
    capabilities: { analysis: false, vision: true, text: true, image: true, video: false }
  },
  {
    providerId: 'fireworks',
    name: 'Fireworks AI',
    priority: 80,
    capabilities: { analysis: false, vision: true, text: true, image: true, video: false }
  },
  {
    providerId: 'together',
    name: 'Together AI',
    priority: 90,
    capabilities: { analysis: false, vision: true, text: true, image: true, video: false }
  },
  {
    providerId: 'fal',
    name: 'Fal.ai',
    priority: 100,
    capabilities: { analysis: false, vision: false, text: false, image: true, video: true }
  },
  {
    providerId: 'replicate',
    name: 'Replicate',
    priority: 110,
    capabilities: { analysis: false, vision: true, text: true, image: true, video: true }
  },
  {
    providerId: 'huggingface',
    name: 'Hugging Face',
    priority: 120,
    capabilities: { analysis: false, vision: false, text: true, image: true, video: false }
  },
  {
    providerId: 'deepinfra',
    name: 'DeepInfra',
    priority: 130,
    capabilities: { analysis: false, vision: false, text: true, image: true, video: false }
  },
  {
    providerId: 'segmind',
    name: 'Segmind',
    priority: 140,
    capabilities: { analysis: false, vision: false, text: false, image: true, video: false }
  },
  {
    providerId: 'bfl',
    name: 'Black Forest Labs (Flux)',
    priority: 150,
    capabilities: { analysis: false, vision: false, text: false, image: true, video: false }
  },
  {
    providerId: 'grok',
    name: 'Grok (X.AI)',
    priority: 160,
    capabilities: { analysis: true, vision: true, text: true, image: true, video: true }
  },
  {
    providerId: 'google-flow',
    name: 'Google Flow',
    priority: 170,
    capabilities: { analysis: false, vision: false, text: false, image: true, video: true }
  }
];

/**
 * Seed providers to database
 * Uses upsert to avoid duplicates
 */
export async function seedProviders() {
  try {
    let created = 0;
    let updated = 0;

    for (const provider of DEFAULT_PROVIDERS) {
      const result = await AIProvider.findOneAndUpdate(
        { providerId: provider.providerId },
        { $setOnInsert: provider },
        { upsert: true, new: true }
      );

      if (result.createdAt === result.updatedAt) {
        created++;
      } else {
        updated++;
      }
    }

    if (created > 0 || updated > 0) {
      console.log(`🌱 Providers seeded: ${created} created, ${updated} existing`);
    }
  } catch (error) {
    console.error('❌ Error seeding providers:', error.message);
    // Don't throw - allow server to continue starting
  }
}

export default seedProviders;
