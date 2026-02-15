/**
 * Reset generation flows collection
 * Run this to clear all flows and start fresh
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function resetFlows() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-wardrobe';
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    const collectionName = 'generationflows';
    const collection = mongoose.connection.collection(collectionName);
    
    // Count before
    const count = await collection.countDocuments();
    console.log(`📊 Flows before: ${count}`);
    
    // Drop collection
    await collection.drop();
    console.log('🗑️  Collection dropped');
    
    console.log('✅ Reset complete! You can now start fresh.');
    
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    
  } catch (error) {
    if (error.codeName === 'NamespaceNotFound') {
      console.log('ℹ️  Collection already removed');
      console.log('✅ Reset complete!');
    } else {
      console.error('❌ Error:', error.message);
    }
    process.exit(1);
  }
}

resetFlows();
