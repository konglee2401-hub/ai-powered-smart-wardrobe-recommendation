#!/usr/bin/env node

/**
 * Seed Browser Automation AI Models Script
 * Creates AI models specifically for browser automation (vision + image generation)
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

// Import models
import AIModel from '../models/AIModel.js';
import AIProvider from '../models/AIProvider.js';

const browserAutomationModels = [
  // Z.AI Browser Automation Models
  {
    modelId: 'zai-browser-vision',
    name: 'Z.AI Browser Vision',
    provider: 'zai',
    type: 'analysis',
    capabilities: {
      vision: true,
      imageInput: true,
      reasoning: true
    },
    pricing: {
      inputCost: 0,
      outputCost: 0,
      free: true
    },
    status: {
      available: true,
      deprecated: false,
      experimental: true,
      recommended: false
    },
    performance: {
      priority: 50,
      avgResponseTime: 0,
      successRate: 100,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0
    },
    apiDetails: {
      endpoint: 'https://chat.z.ai',
      modelIdentifier: 'zai-browser-vision',
      maxTokens: 4096,
      contextWindow: 8192,
      supportedFormats: ['text', 'image']
    },
    metadata: {
      description: 'Z.AI browser automation for image analysis and vision tasks',
      releaseDate: new Date(),
      tags: ['browser', 'vision', 'analysis']
    }
  },
  {
    modelId: 'zai-browser-image-gen',
    name: 'Z.AI Browser Image Generation',
    provider: 'zai',
    type: 'image-generation',
    capabilities: {
      vision: true,
      imageInput: true,
      streaming: false
    },
    pricing: {
      imageCost: 0,
      free: true
    },
    status: {
      available: true,
      deprecated: false,
      experimental: true,
      recommended: false
    },
    performance: {
      priority: 50,
      avgResponseTime: 0,
      successRate: 100,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0
    },
    apiDetails: {
      endpoint: 'https://image.z.ai',
      modelIdentifier: 'zai-browser-image-gen',
      maxResolution: '1024x1024'
    },
    metadata: {
      description: 'Z.AI browser automation for image generation tasks',
      releaseDate: new Date(),
      tags: ['browser', 'image-generation']
    }
  },

  // Grok Browser Automation Models
  {
    modelId: 'grok-browser-vision',
    name: 'Grok Browser Vision',
    provider: 'grok',
    type: 'analysis',
    capabilities: {
      vision: true,
      imageInput: true,
      reasoning: true
    },
    pricing: {
      inputCost: 0,
      outputCost: 0,
      free: true
    },
    status: {
      available: true,
      deprecated: false,
      experimental: true,
      recommended: false
    },
    performance: {
      priority: 50,
      avgResponseTime: 0,
      successRate: 100,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0
    },
    apiDetails: {
      endpoint: 'https://grok.com',
      modelIdentifier: 'grok-browser-vision',
      maxTokens: 8192,
      contextWindow: 16384,
      supportedFormats: ['text', 'image']
    },
    metadata: {
      description: 'Grok browser automation for image analysis and vision tasks',
      releaseDate: new Date(),
      tags: ['browser', 'vision', 'analysis']
    }
  },
  {
    modelId: 'grok-browser-image-gen',
    name: 'Grok Browser Image Generation',
    provider: 'grok',
    type: 'image-generation',
    capabilities: {
      vision: true,
      imageInput: true,
      streaming: false
    },
    pricing: {
      imageCost: 0,
      free: true
    },
    status: {
      available: true,
      deprecated: false,
      experimental: true,
      recommended: false
    },
    performance: {
      priority: 50,
      avgResponseTime: 0,
      successRate: 100,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0
    },
    apiDetails: {
      endpoint: 'https://grok.com',
      modelIdentifier: 'grok-browser-image-gen',
      maxResolution: '1024x1024'
    },
    metadata: {
      description: 'Grok browser automation for image generation tasks',
      releaseDate: new Date(),
      tags: ['browser', 'image-generation']
    }
  }
];

async function seedBrowserAutomationModels() {
  try {
    console.log('🌱 Seeding browser automation AI models...');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-wardrobe');
    console.log('✅ Connected to MongoDB');

    // Check if providers exist, if not create them
    const zaiProvider = await AIProvider.findOne({ providerId: 'zai' });
    const grokProvider = await AIProvider.findOne({ providerId: 'grok' });

    if (!zaiProvider) {
      console.log('⚠️  Z.AI provider not found, creating...');
      await AIProvider.create({
        providerId: 'zai',
        name: 'Z.AI',
        priority: 10,
        isEnabled: true,
        capabilities: {
          analysis: true,
          vision: true,
          text: true,
          image: true
        },
        apiKeys: [{
          key: process.env.ZAI_API_KEY || 'default-key',
          label: 'Z.AI Browser Key',
          status: 'active'
        }],
        settings: {
          maxRetries: 3,
          timeoutMs: 120000,
          concurrentRequests: 2
        }
      });
      console.log('✅ Created Z.AI provider');
    }

    if (!grokProvider) {
      console.log('⚠️  Grok provider not found, creating...');
      await AIProvider.create({
        providerId: 'grok',
        name: 'Grok',
        priority: 10,
        isEnabled: true,
        capabilities: {
          analysis: true,
          vision: true,
          text: true,
          image: true
        },
        apiKeys: [{
          key: process.env.GROK_API_KEY || 'default-key',
          label: 'Grok Browser Key',
          status: 'active'
        }],
        settings: {
          maxRetries: 3,
          timeoutMs: 120000,
          concurrentRequests: 2
        }
      });
      console.log('✅ Created Grok provider');
    }

    // Clear existing browser automation models
    await AIModel.deleteMany({ 
      type: { $in: ['browser-vision', 'browser-image-gen'] }
    });
    console.log('🗑️  Cleared existing browser automation models');

    // Insert new browser automation models
    const result = await AIModel.insertMany(browserAutomationModels);
    console.log(`✅ Seeded ${result.length} browser automation models`);

    console.log('🎉 Browser automation AI models seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding browser automation models:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
seedBrowserAutomationModels();