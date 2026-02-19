
import AIProvider from '../models/AIProvider.js';

/**
 * Seeding script for AI Providers
 * Creates initial provider entries if they don't exist
 */

const DEFAULT_PROVIDERS = [
  // ANALYSIS & VISION PROVIDERS
  {
    providerId: 'google',
    name: 'Google Gemini',
    priority: 1,
    capabilities: { analysis: true, image: true, video: true, text: true },
    settings: { maxRetries: 3, concurrentRequests: 10 }
  },
  {
    providerId: 'openai',
    name: 'OpenAI',
    priority: 2,
    capabilities: { analysis: true, image: true, text: true },
    settings: { maxRetries: 3, concurrentRequests: 5 }
  },
  {
    providerId: 'anthropic',
    name: 'Anthropic',
    priority: 3,
    capabilities: { analysis: true, text: true },
    settings: { maxRetries: 3, concurrentRequests: 5 }
  },
  {
    providerId: 'moonshot',
    name: 'Moonshot AI',
    priority: 4,
    capabilities: { text: true },
    settings: { maxRetries: 3, concurrentRequests: 5 }
  },
  {
    providerId: 'fireworks',
    name: 'Fireworks AI',
    priority: 5,
    capabilities: { analysis: true, image: true, text: true },
    settings: { maxRetries: 3, concurrentRequests: 10 }
  },
  {
    providerId: 'groq',
    name: 'Groq',
    priority: 6,
    capabilities: { text: true },
    settings: { maxRetries: 3, concurrentRequests: 10 }
  },
  {
    providerId: 'mistral',
    name: 'Mistral AI',
    priority: 7,
    capabilities: { text: true },
    settings: { maxRetries: 3, concurrentRequests: 5 }
  },

  // IMAGE GENERATION PROVIDERS
  {
    providerId: 'openrouter',
    name: 'OpenRouter',
    priority: 1,
    capabilities: { image: true, analysis: true, text: true },
    settings: { maxRetries: 3, concurrentRequests: 10 }
  },
  {
    providerId: 'nvidia',
    name: 'NVIDIA NIM',
    priority: 2,
    capabilities: { image: true, text: true },
    settings: { maxRetries: 2, concurrentRequests: 3 }
  },
  {
    providerId: 'replicate',
    name: 'Replicate',
    priority: 3,
    capabilities: { image: true, video: true },
    settings: { maxRetries: 3, concurrentRequests: 5 }
  },
  {
    providerId: 'huggingface',
    name: 'Hugging Face',
    priority: 4,
    capabilities: { image: true },
    settings: { maxRetries: 3, concurrentRequests: 5 }
  },
  {
    providerId: 'pollinations',
    name: 'Pollinations AI',
    priority: 99, // Fallback
    capabilities: { image: true },
    settings: { maxRetries: 3, concurrentRequests: 5 }
  }
];

export async function seedProviders() {
  console.log('🌱 Seeding AI Providers...');
  let count = 0;

  for (const p of DEFAULT_PROVIDERS) {
    try {
      const exists = await AIProvider.findOne({ providerId: p.providerId });
      if (!exists) {
        await AIProvider.create(p);
        console.log(`   ✅ Created provider: ${p.name}`);
        count++;
      }
    } catch (error) {
      console.error(`   ❌ Failed to seed ${p.name}:`, error.message);
    }
  }
  
  if (count > 0) {
    console.log(`✨ Seeded ${count} new providers.`);
  } else {
    console.log('   All providers already exist.');
  }
}
