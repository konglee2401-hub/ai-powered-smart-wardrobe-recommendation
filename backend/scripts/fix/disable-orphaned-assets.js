#!/usr/bin/env node
/**
 * DISABLE ORPHANED ASSETS
 * 
 * Marks assets as inactive if:
 * - Local file doesn't exist AND
 * - Google Drive upload failed/not attempted
 */

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import Asset from '../../models/Asset.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(path.dirname(__dirname), '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-wardrobe';

async function disableOrphanedAssets() {
  try {
    console.log('\n' + '═'.repeat(80));
    console.log('🗑️  DISABLE ORPHANED ASSETS: Clean up Broken Records');
    console.log('═'.repeat(80));

    // Connect to MongoDB
    console.log(`\n📦 Connecting to MongoDB...`);
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n' + '─'.repeat(80));
    console.log('🔍 SCANNING: Find Orphaned Assets');
    console.log('─'.repeat(80));

    // Find all active assets
    const activeAssets = await Asset.find({ status: 'active' });
    console.log(`\n✅ Found ${activeAssets.length} active assets`);

    let disabled = 0;
    const orphanedAssets = [];

    for (const asset of activeAssets) {
      const localPath = asset.localStorage?.path || asset.storage?.localPath;
      const googleDriveId = asset.cloudStorage?.googleDriveId || asset.storage?.googleDriveId;
      const driveStatus = asset.cloudStorage?.status || 'unknown';
      const driveAttempted = asset.cloudStorage?.attempted || asset.storage?.attempted || 0;

      // Check if local file exists
      const localExists = localPath && fs.existsSync(localPath);
      
      // Check if Google Drive is available
      const driveAvailable = googleDriveId && (driveStatus === 'synced' || driveStatus === 'pending');
      
      // If no local file AND (no Drive ID OR Drive upload failed), mark as orphaned
      if (!localExists && !driveAvailable) {
        orphanedAssets.push({
          id: asset._id,
          filename: asset.filename,
          localPath,
          driveStatus,
          reason: !localPath ? 'No local path' : (!googleDriveId ? 'No Drive ID' : `Drive status: ${driveStatus}`)
        });

        try {
          await Asset.updateOne(
            { _id: asset._id },
            {
              $set: {
                status: 'inactive',
                disableReason: `Orphaned: ${!localPath ? 'no local file' : `Drive failed (${driveStatus})`}`,
                disabledAt: new Date()
              }
            }
          );
          disabled++;
          console.log(`   ✅ Disabled: ${asset.filename}`);
        } catch (err) {
          console.error(`   ❌ Error disabling ${asset.filename}: ${err.message}`);
        }
      }
    }

    // Summary
    console.log('\n' + '─'.repeat(80));
    console.log('📊 SUMMARY');
    console.log('─'.repeat(80));
    console.log(`\n🗑️  Total orphaned assets disabled: ${disabled}`);

    if (orphanedAssets.length > 0) {
      console.log(`\n📝 Sample (first 10):`);
      orphanedAssets.slice(0, 10).forEach(asset => {
        console.log(`   • ${asset.filename}`);
        console.log(`     └─ ${asset.reason}`);
      });
      if (orphanedAssets.length > 10) {
        console.log(`   ... and ${orphanedAssets.length - 10} more`);
      }
    }

    console.log('\n✅ Orphaned asset cleanup completed!');
    console.log(`   These assets will no longer appear in gallery queries`);
    await mongoose.disconnect();

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the cleanup
disableOrphanedAssets().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
