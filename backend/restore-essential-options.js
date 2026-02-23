/**
 * Restore essential fashion options that were legitimately deleted
 */

import mongoose from 'mongoose';
import PromptOption from './models/PromptOption.js';
import dotenv from 'dotenv';

dotenv.config();

const essentialOptions = {
  accessories: [
    'gold-necklace', 'silver-necklace', 'delicate-necklace', 'chunky-necklace', 'pendant-necklace',
    'gold-bracelet', 'silver-bracelet', 'pearl-bracelet', 'beaded-bracelet', 'cuff-bracelet',
    'structured-handbag', 'crossbody-bag', 'clutch', 'tote-bag', 'shoulder-bag', 'hobo-bag',
    'stud-earrings', 'dangle-earrings', 'hoop-earrings', 'chandelier-earrings', 'pearl-earrings',
    'chunky-earrings', 'delicate-bracelet', 'cream-handbag'
  ],
  outerwear: [
    'blazer', 'jacket', 'cardigan', 'coat', 'trench-coat', 'denim-jacket', 'leather-jacket'
  ]
};

async function restoreOptions() {
  try {
    console.log('🔧 Restoring essential options...\n');

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-wardrobe';
    await mongoose.connect(mongoUri);
    console.log('📦 Connected to MongoDB\n');

    let totalCreated = 0;

    for (const [category, values] of Object.entries(essentialOptions)) {
      console.log(`📝 Processing ${category}...`);
      
      for (const value of values) {
        // Check if exists
        const existing = await PromptOption.findOne({ category, value, isActive: true });
        
        if (!existing) {
          const label = value
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          
          const option = new PromptOption({
            category,
            value,
            label,
            description: `Essential ${category} option: ${label}`,
            keywords: [value, ...value.split('-'), category],
            technicalDetails: {
              source: 'restored_essential',
              restoredAt: new Date().toISOString()
            },
            isActive: true,
            sortOrder: 100
          });
          
          try {
            await option.save();
            console.log(`  ✅ Created: ${value}`);
            totalCreated++;
          } catch (saveErr) {
            if (saveErr.code === 11000) {
              console.log(`  ℹ️  Skipped: ${value} (already exists)`);
            } else {
              throw saveErr;
            }
          }
        }
      }
    }

    // Verify
    console.log('\n📊 Verification:');
    const categories = await PromptOption.distinct('category');
    for (const cat of categories.sort()) {
      const count = await PromptOption.countDocuments({ category: cat });
      console.log(`  ${cat}: ${count} options`);
    }

    console.log(`\n✅ Restored ${totalCreated} options`);
    const finalTotal = await PromptOption.countDocuments();
    console.log(`   Total in database: ${finalTotal}`);

    await mongoose.connection.close();

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

restoreOptions();
