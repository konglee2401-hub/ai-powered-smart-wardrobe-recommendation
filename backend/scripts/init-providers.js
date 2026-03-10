import mongoose from 'mongoose';
import AIProvider from '../models/AIProvider.js';

async function initializeProviders() {
  try {
    await mongoose.connect('mongodb://localhost:27017/smart_wardrobe', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connected to MongoDB');

    // Clear existing providers
    await AIProvider.deleteMany({});

    // Create default providers
    const providers = [
      {
        providerId: 'google',
        name: 'Google Gemini',
        priority: 1,
        isEnabled: true,
        capabilities: {
          analysis: true,
          image: true,
          video: true,
          text: true,
          vision: true
        },
        apiKeys: [],
        settings: {
          maxRetries: 3,
          timeoutMs: 60000,
          concurrentRequests: 5
        }
      },
      {
        providerId: 'openai',
        name: 'OpenAI',
        priority: 2,
        isEnabled: true,
        capabilities: {
          analysis: true,
          image: true,
          text: true,
          vision: true,
          video: false
        },
        apiKeys: [],
        settings: {
          maxRetries: 3,
          timeoutMs: 60000,
          concurrentRequests: 5
        }
      },
      {
        providerId: 'anthropic',
        name: 'Anthropic Claude',
        priority: 3,
        isEnabled: true,
        capabilities: {
          analysis: true,
          text: true,
          vision: true,
          image: false,
          video: false
        },
        apiKeys: [],
        settings: {
          maxRetries: 3,
          timeoutMs: 60000,
          concurrentRequests: 5
        }
      },
      {
        providerId: 'groq',
        name: 'Groq',
        priority: 4,
        isEnabled: true,
        capabilities: {
          analysis: true,
          text: true,
          vision: false,
          image: false,
          video: false
        },
        apiKeys: [],
        settings: {
          maxRetries: 3,
          timeoutMs: 60000,
          concurrentRequests: 5
        }
      },
      {
        providerId: 'openrouter',
        name: 'OpenRouter',
        priority: 5,
        isEnabled: true,
        capabilities: {
          analysis: true,
          text: true,
          vision: true,
          image: true,
          video: false
        },
        apiKeys: [],
        settings: {
          maxRetries: 3,
          timeoutMs: 60000,
          concurrentRequests: 5
        }
      }
    ];

    const result = await AIProvider.insertMany(providers);
    console.log(`✅ Created ${result.length} providers`);
    result.forEach(p => {
      console.log(`   - ${p.name} (${p.providerId})`);
    });

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

initializeProviders();
