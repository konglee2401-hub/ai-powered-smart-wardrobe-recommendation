/**
 * Delete Orphaned Assets from Database
 * Removes all inactive assets that cannot be recovered
 *
 * Run: node scripts/fix/delete-orphaned-assets.js
 * Options:
 *   --confirm    Confirm deletion (required for safety)
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Import models
import Asset from '../../models/Asset.js';

const DB_URL = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-wardrobe';

// Parse CLI arguments
const args = process.argv.slice(2);
const confirmed = args.includes('--confirm');

async function connectDB() {
  try {
    await mongoose.connect(DB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

async function deleteOrphanedAssets() {
  try {
    console.log('\n' + '═'.repeat(80));
    console.log('🗑️  DELETE ORPHANED ASSETS');
    console.log('═'.repeat(80) + '\n');

    await connectDB();

    // Find orphaned assets
    console.log('🔍 Finding orphaned assets...\n');
    const orphanedAssets = await Asset.find({ status: 'inactive' });

    console.log(`Found ${orphanedAssets.length} orphaned assets to delete:\n`);

    // Show first 10 as preview
    console.log('Preview (first 10):');
    console.log('─'.repeat(80));
    for (let i = 0; i < Math.min(10, orphanedAssets.length); i++) {
      const a = orphanedAssets[i];
      console.log(`  ${i + 1}. ${a.filename} (${a.assetCategory})`);
    }
    if (orphanedAssets.length > 10) {
      console.log(`  ... and ${orphanedAssets.length - 10} more`);
    }

    console.log('\n' + '─'.repeat(80));
    console.log('Asset Categories:');
    console.log('─'.repeat(80));

    // Group by category
    const byCategory = {};
    for (const asset of orphanedAssets) {
      byCategory[asset.assetCategory] = (byCategory[asset.assetCategory] || 0) + 1;
    }

    for (const [category, count] of Object.entries(byCategory)) {
      console.log(`  ${category}: ${count}`);
    }

    console.log('\n' + '─'.repeat(80));

    if (!confirmed) {
      console.log('\n⚠️  SAFETY CHECK: Deletion requires --confirm flag');
      console.log('\nTo delete these 99 assets, run:');
      console.log('  node scripts/fix/delete-orphaned-assets.js --confirm\n');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Confirm deletion
    console.log('\n⚠️  DELETING ' + orphanedAssets.length + ' ASSETS...\n');

    const result = await Asset.deleteMany({ status: 'inactive' });

    console.log('✅ DELETION COMPLETE');
    console.log('─'.repeat(80));
    console.log(`Deleted: ${result.deletedCount} documents from database\n`);

    // Verify
    const remaining = await Asset.countDocuments({ status: 'inactive' });
    const total = await Asset.countDocuments({});
    const active = await Asset.countDocuments({ status: 'active' });

    console.log('📊 NEW DATABASE STATE:');
    console.log('─'.repeat(80));
    console.log(`Total assets: ${total}`);
    console.log(`Active assets: ${active}`);
    console.log(`Inactive assets: ${remaining}`);
    console.log('');

    if (remaining === 0) {
      console.log('✅ All orphaned assets removed!');
    } else {
      console.log(`⚠️  ${remaining} inactive assets still in DB`);
    }

    console.log('\n✅ Operation completed successfully\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  } finally {
    await mongoose.disconnect();
  }
}

deleteOrphanedAssets();
