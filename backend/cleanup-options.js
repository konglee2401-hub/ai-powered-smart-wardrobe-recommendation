#!/usr/bin/env node
/**
 * Cleanup corrupted PromptOption entries from database
 * Removes options with:
 * - Invalid value fields (objects, arrays, or empty strings)
 * - Missing label or description
 * - Malformed data
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Direct database connection (similar to server.js)
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-wardrobe';
    console.log(`🔌 Connecting to MongoDB: ${mongoURI.replace(/\/\/.*:.*@/, '//***:***@')}...\n`);
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ Connected to MongoDB\n');
    return true;
  } catch (error) {
    console.error('❌ MongoDB Connection Error:');
    console.error(`   ${error.message}\n`);
    console.log('Make sure MongoDB is running and configured in .env file');
    return false;
  }
};

// Import PromptOption model
import PromptOption from './models/PromptOption.js';

async function cleanupOptions() {
  try {
    // Connect to database
    const connected = await connectDB();
    if (!connected) {
      process.exit(1);
    }

    console.log('🧹 Starting PromptOption cleanup...\n');

    // Find all options
    const allOptions = await PromptOption.find();
    console.log(`📊 Total options in DB: ${allOptions.length}\n`);

    let corruptedCount = 0;
    let deletedCount = 0;
    const corruptedIds = [];

    // Check each option for corruption
    for (const option of allOptions) {
      const issues = [];

      // Check value field
      if (!option.value || typeof option.value !== 'string') {
        issues.push('Invalid value field');
      }
      
      if (typeof option.value === 'string' && option.value.trim() === '') {
        issues.push('Empty value');
      }

      if (typeof option.value === 'object') {
        issues.push('Value is object (should be string)');
      }

      if (Array.isArray(option.value)) {
        issues.push('Value is array (should be string)');
      }

      // Check label field
      if (!option.label || typeof option.label !== 'string') {
        issues.push('Invalid or missing label');
      }

      // Check description field
      if (!option.description || typeof option.description !== 'string') {
        issues.push('Invalid or missing description');
      }

      if (issues.length > 0) {
        corruptedCount++;
        corruptedIds.push(option._id);
        console.log(`⚠️  Corrupted option: ${option._id}`);
        console.log(`   Value: ${JSON.stringify(option.value)}`);
        console.log(`   Label: ${option.label}`);
        console.log(`   Issues: ${issues.join(', ')}\n`);
      }
    }

    if (corruptedCount > 0) {
      console.log(`\n❌ Found ${corruptedCount} corrupted options\n`);
      console.log('Deleting corrupted options...\n');

      // Delete corrupted options
      const result = await PromptOption.deleteMany({
        _id: { $in: corruptedIds }
      });

      deletedCount = result.deletedCount;
      console.log(`✅ Deleted ${deletedCount} corrupted options\n`);
    } else {
      console.log('✅ No corrupted options found!\n');
    }

    // Show summary of remaining options by category
    const categories = await PromptOption.distinct('category');
    console.log('📋 Remaining options by category:\n');

    for (const cat of categories.sort()) {
      const count = await PromptOption.countDocuments({ category: cat });
      console.log(`   ${cat}: ${count} options`);
    }

    console.log(`\n✨ Cleanup complete! Total options remaining: ${allOptions.length - deletedCount}\n`);
    
    // Disconnect from database
    await mongoose.connection.close();
    console.log('🔌 Database connection closed\n');
    
    process.exit(0);

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

// Run cleanup
cleanupOptions();
