/**
 * Seed Image Providers to Database
 * Creates default provider list in MongoDB
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { IMAGE_PROVIDERS } from '../config/imageProviders.js';

dotenv.config();

// Provider Schema
const providerSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  provider: {
    type: String,
    required: true
  },
  priority: {
    type: Number,
    required: true
  },
  pricing: {
    type: String,
    default: null
  },
  free: {
    type: Boolean,
    default: false
  },
  requiresKey: {
    type: Boolean,
    default: true
  },
  keyEnv: {
    type: String,
    default: null
  },
  available: {
    type: Boolean,
    default: false
  },
  enabled: {
    type: Boolean,
    default: true
  },
  usageCount: {
    type: Number,
    default: 0
  },
  successCount: {
    type: Number,
    default: 0
  },
  failureCount: {
    type: Number,
    default: 0
  },
  lastUsed: {
    type: Date,
    default: null
  },
  lastSuccess: {
    type: Date,
    default: null
  },
  lastFailure: {
    type: Date,
    default: null
  },
  averageResponseTime: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

const ImageProvider = mongoose.model('ImageProvider', providerSchema);

/**
 * Seed providers to database
 */
async function seedProviders() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🌱 SEEDING IMAGE PROVIDERS');
    console.log('='.repeat(80));
    
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/fashion-ai';
    console.log(`\n📡 Connecting to MongoDB: ${mongoUri}`);
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    
    // Clear existing providers
    console.log('\n🗑️  Clearing existing providers...');
    const deleteResult = await ImageProvider.deleteMany({});
    console.log(`   Deleted ${deleteResult.deletedCount} existing providers`);
    
    // Prepare provider data
    console.log('\n📦 Preparing provider data...');
    const providerData = IMAGE_PROVIDERS.map(p => ({
      id: p.id,
      name: p.name,
      provider: p.provider,
      priority: p.priority,
      pricing: p.pricing,
      free: p.free || false,
      requiresKey: p.requiresKey,
      keyEnv: p.keyEnv || null,
      available: p.available,
      enabled: true,
      usageCount: 0,
      successCount: 0,
      failureCount: 0
    }));
    
    console.log(`   Prepared ${providerData.length} providers`);
    
    // Insert providers
    console.log('\n💾 Inserting providers...');
    const inserted = await ImageProvider.insertMany(providerData);
    console.log(`   ✅ Inserted ${inserted.length} providers`);
    
    // Print summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 PROVIDERS SUMMARY');
    console.log('='.repeat(80));
    
    const byProvider = {};
    inserted.forEach(p => {
      if (!byProvider[p.provider]) {
        byProvider[p.provider] = {
          count: 0,
          free: 0,
          paid: 0,
          available: 0
        };
      }
      byProvider[p.provider].count++;
      if (p.free) byProvider[p.provider].free++;
      else byProvider[p.provider].paid++;
      if (p.available) byProvider[p.provider].available++;
    });
    
    console.log('\nBy Provider:');
    Object.entries(byProvider).forEach(([name, stats]) => {
      console.log(`  ${name.padEnd(15)} ${stats.count} models (${stats.free} free, ${stats.paid} paid, ${stats.available} available)`);
    });
    
    console.log('\nBy Priority:');
    const priorityGroups = {
      'Tier 1 (0-9)': inserted.filter(p => p.priority >= 0 && p.priority <= 9),
      'Tier 2 (10-19)': inserted.filter(p => p.priority >= 10 && p.priority <= 19),
      'Tier 3 (20-29)': inserted.filter(p => p.priority >= 20 && p.priority <= 29),
      'Fallback (99)': inserted.filter(p => p.priority === 99)
    };
    
    Object.entries(priorityGroups).forEach(([name, providers]) => {
      console.log(`  ${name.padEnd(20)} ${providers.length} providers`);
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ SEEDING COMPLETE');
    console.log('='.repeat(80) + '\n');
    
    // Close connection
    await mongoose.connection.close();
    console.log('📡 MongoDB connection closed\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run seeding
seedProviders();
