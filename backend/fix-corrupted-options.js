#!/usr/bin/env node
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

const log = {
  success: (msg) => console.log(`${colors.green}‚úÖ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}‚ùå ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}‚ö†Ô∏è  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}‚ÑπÔ∏è  ${msg}${colors.reset}`),
};

async function fixCorruptedOptions() {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-wardrobe';
    const conn = await mongoose.connect(mongoURI);
    const db = conn.connection.db;
    const promptOptions = db.collection('promptoptions');

    log.info('\nÌ¥ç Finding corrupted options...');

    // Find options with extremely long values (likely prompts)
    const corrupted = await promptOptions.find({
      $expr: { $gt: [{ $strLenCP: '$value' }, 200] }
    }).toArray();

    log.warning(`Found ${corrupted.length} options with suspiciously long values`);

    if (corrupted.length > 0) {
      corrupted.forEach(doc => {
        log.warning(`\nCategory: ${doc.category}`);
        log.warning(`Value (first 100 chars): ${String(doc.value).substring(0, 100)}...`);
        log.warning(`ID: ${doc._id}`);
      });

      // Delete corrupted options
      const ids = corrupted.map(d => d._id);
      const result = await promptOptions.deleteMany({ _id: { $in: ids } });
      log.success(`\nDeleted ${result.deletedCount} corrupted options`);
    }

    // Check for options with missing/empty critical fields
    const missingFields = await promptOptions.find({
      $or: [
        { value: { $exists: false } },
        { value: '' },
        { label: { $exists: false } },
        { description: { $exists: false } }
      ]
    }).toArray();

    if (missingFields.length > 0) {
      log.warning(`Found ${missingFields.length} options with missing fields`);
      const ids = missingFields.map(d => d._id);
      const result = await promptOptions.deleteMany({ _id: { $in: ids } });
      log.success(`Deleted ${result.deletedCount} options with missing fields`);
    }

    // Add proper options for categories that are missing them
    log.info('\nÌ≥ù Ensuring all categories have proper options...');

    const defaultOptions = [
      // Mood
      { category: 'mood', value: 'confident', label: 'Confident', description: 'Conveys confidence and poise' },
      { category: 'mood', value: 'elegant', label: 'Elegant', description: 'Projects elegance and sophistication' },
      { category: 'mood', value: 'casual', label: 'Casual', description: 'Relaxed and approachable' },
      { category: 'mood', value: 'playful', label: 'Playful', description: 'Fun and light-hearted' },

      // Hairstyle
      { category: 'hairstyle', value: 'long-straight', label: 'Long Straight', description: 'Long, straight hair' },
      { category: 'hairstyle', value: 'long-wavy', label: 'Long Wavy', description: 'Long, wavy hair' },
      { category: 'hairstyle', value: 'medium-bob', label: 'Medium Bob', description: 'Medium length bob cut' },
      { category: 'hairstyle', value: 'keep-current', label: 'Keep Current', description: 'Keep existing hairstyle' },

      // Camera Angle (if missing)
      { category: 'cameraAngle', value: 'eye-level', label: 'Eye Level', description: 'Direct eye-level shot' },
      { category: 'cameraAngle', value: 'overhead', label: 'Overhead', description: 'Shot from above' },
    ];

    for (const opt of defaultOptions) {
      const exists = await promptOptions.findOne({
        category: opt.category,
        value: opt.value
      });

      if (!exists) {
        await promptOptions.insertOne({
          ...opt,
          usageCount: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        log.success(`Added: ${opt.category} - ${opt.value}`);
      }
    }

    // Show final summary
    log.info('\nÌ≥ä Final Summary:');
    const categories = await promptOptions.distinct('category');
    let total = 0;

    for (const cat of categories.sort()) {
      const count = await promptOptions.countDocuments({ category: cat });
      total += count;
      log.info(`  ${cat}: ${count} options`);
    }

    log.success(`\n‚úÖ Total options: ${total}`);
    log.success('Database cleanup complete!');

    await mongoose.connection.close();
  } catch (error) {
    log.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

fixCorruptedOptions();
