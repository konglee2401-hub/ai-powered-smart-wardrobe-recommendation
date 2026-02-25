/**
 * Clean corrupted options from database
 * Remove entries with comma-separated values and [object Object] entries
 */

import mongoose from 'mongoose';
import PromptOption from './models/PromptOption.js';
import dotenv from 'dotenv';

dotenv.config();

async function cleanCorruptedOptions() {
  try {
    console.log('🧹 Cleaning corrupted options...\n');

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-wardrobe';
    await mongoose.connect(mongoUri);
    console.log('📦 Connected to MongoDB\n');

    // Find and remove corrupted entries
    
    // 1. Remove entries with [object Object]
    console.log('Finding [object Object] entries...');
    const objectObjectEntries = await PromptOption.find({ 
      value: /\[object Object\]/i
    });
    console.log(`Found ${objectObjectEntries.length} entries with [object Object]`);
    if (objectObjectEntries.length > 0) {
      console.log('Sample:', objectObjectEntries[0].value.substring(0, 50));
      await PromptOption.deleteMany({ value: /\[object Object\]/i });
      console.log('✅ Deleted [object Object] entries\n');
    }

    // 2. Find comma-separated values (suspicious - should be single value)
    console.log('Finding comma-separated value entries...');
    const allOptions = await PromptOption.find();
    
    const commaEntries = allOptions.filter(opt => {
      // Valid comma entries: "gold-bracelet, structured-handbag" in recommendations
      // Invalid: "cream-handbag, delicate-bracelet, stud-earrings" in value field
      const hasComma = opt.value.includes(',');
      const hasMultipleCommas = (opt.value.match(/,/g) || []).length > 1;
      
      // If has multiple commas, likely corrupted (should be auto-split at save time)
      return hasComma && hasMultipleCommas;
    });

    console.log(`Found ${commaEntries.length} entries with multiple commas`);
    if (commaEntries.length > 0) {
      commaEntries.forEach((entry, i) => {
        console.log(`[${i+1}] ${entry.category}: "${entry.value.substring(0, 60)}${entry.value.length > 60 ? '...' : ''}"`);
      });

      // Delete these entries
      const valuesToDelete = commaEntries.map(e => e.value);
      await PromptOption.deleteMany({ value: { $in: valuesToDelete } });
      console.log(`✅ Deleted ${commaEntries.length} comma-separated entries\n`);
    }

    // 3. Verify cleanup
    console.log('Verifying cleanup...');
    const finalCount = await PromptOption.countDocuments();
    const stillCorrupted = await PromptOption.countDocuments({ 
      value: /\[object Object\]/i 
    });
    
    console.log(`\n📊 Database status:`);
    console.log(`Total options: ${finalCount}`);
    console.log(`Still corrupted: ${stillCorrupted}`);
    
    if (stillCorrupted === 0) {
      console.log('\n✅ Database cleaned successfully!');
    } else {
      console.log('\n⚠️ Some corrupted entries remain');
    }

    // Show option counts by category
    console.log('\nOptions by category:');
    const categories = await PromptOption.distinct('category');
    for (const cat of categories.sort()) {
      const count = await PromptOption.countDocuments({ category: cat });
      console.log(`  ${cat}: ${count}`);
    }

    await mongoose.connection.close();
    console.log('\n✅ Cleanup complete');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

cleanCorruptedOptions();
