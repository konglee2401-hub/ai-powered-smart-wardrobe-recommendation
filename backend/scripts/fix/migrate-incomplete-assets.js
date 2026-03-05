#!/usr/bin/env node

/**
 * Migration Script: Fix incomplete asset storage configurations
 * 
 * Finds assets that have incomplete storage information and attempts to fix them:
 * - Assets with legacy storage but no localStorage/cloudStorage
 * - Assets with cloudStorage.status='pending' but no googleDriveId set
 * - Assets created during the duplicate-save bug period
 */

import mongoose from 'mongoose';
import Asset from '../../models/Asset.js';
import fs from 'fs';
import path from 'path';

// Configuration
const CONFIG = {
  MONGODB_URL: process.env.MONGODB_URL || 'mongodb://localhost:27017/smart-wardrobe',
  LOCAL_STORAGE_DIR: path.join(process.cwd(), 'generated-images'),
  DRY_RUN: process.argv.includes('--dry-run'),
  VERBOSE: process.argv.includes('--verbose')
};

console.log(`
╔════════════════════════════════════════════════════════════╗
║   Migration: Fix Incomplete Asset Storage Configuration    ║
╚════════════════════════════════════════════════════════════╝
`);

console.log(`Configuration:`);
console.log(`  MongoDB: ${CONFIG.MONGODB_URL}`);
console.log(`  Dry Run: ${CONFIG.DRY_RUN}`);
console.log(`  Verbose: ${CONFIG.VERBOSE}\n`);

async function main() {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(CONFIG.MONGODB_URL);
    console.log('✅ Connected\n');

    // Find problematic assets
    console.log('🔍 Scanning for incomplete assets...\n');

    // Query 1: Assets with only legacy storage (no localStorage or cloudStorage)
    const legacyOnlyAssets = await Asset.find({
      $and: [
        {
          $or: [
            { 'storage.localPath': { $exists: true, $ne: null } },
            { 'storage.googleDriveId': { $exists: true, $ne: null } },
            { 'storage.location': { $exists: true, $ne: null } }
          ]
        },
        { 'localStorage.path': { $exists: false } },
        { 'cloudStorage.googleDriveId': { $exists: false } }
      ]
    });

    console.log(`📊 Found ${legacyOnlyAssets.length} assets with only legacy storage`);

    // Query 2: Assets with pending cloudStorage but no googleDriveId set
    const pendingWithoutIdAssets = await Asset.find({
      'cloudStorage.status': 'pending',
      'cloudStorage.googleDriveId': { $exists: false }
    });

    console.log(`📊 Found ${pendingWithoutIdAssets.length} assets with pending cloud status but no Drive ID\n`);

    // Fix legacy-only assets
    if (legacyOnlyAssets.length > 0) {
      console.log('🔧 Fixing legacy-only assets...');
      let fixed = 0;

      for (const asset of legacyOnlyAssets) {
        try {
          let updated = false;

          // If localStorage is missing but storage.localPath exists, migrate it
          if (!asset.localStorage && asset.storage?.localPath) {
            const localPath = asset.storage.localPath;
            
            // Verify file exists
            let absolutePath = localPath;
            if (!path.isAbsolute(localPath)) {
              absolutePath = path.join(process.cwd(), localPath);
            }

            if (fs.existsSync(absolutePath)) {
              const stats = fs.statSync(absolutePath);
              
              asset.localStorage = {
                location: 'local',
                path: absolutePath,
                fileSize: stats.size,
                savedAt: asset.createdAt || new Date(),
                verified: true
              };
              
              updated = true;
              
              if (CONFIG.VERBOSE) {
                console.log(`  ✅ Migrated localStorage for ${asset.filename}`);
              }
            } else {
              if (CONFIG.VERBOSE) {
                console.log(`  ⚠️  Local file not found: ${absolutePath}`);
              }
            }
          }

          // If cloudStorage is missing but storage.googleDriveId exists, migrate it
          if (!asset.cloudStorage && asset.storage?.googleDriveId) {
            asset.cloudStorage = {
              location: 'google-drive',
              googleDriveId: asset.storage.googleDriveId,
              status: 'synced'  // Already on drive
            };
            
            updated = true;
            
            if (CONFIG.VERBOSE) {
              console.log(`  ✅ Migrated cloudStorage for ${asset.filename}`);
            }
          }

          if (updated && !CONFIG.DRY_RUN) {
            await asset.save();
            fixed++;
          } else if (updated && CONFIG.DRY_RUN) {
            fixed++;
          }
        } catch (error) {
          console.error(`  ❌ Error fixing ${asset.filename}: ${error.message}`);
        }
      }

      console.log(`✅ Fixed ${fixed}/${legacyOnlyAssets.length} legacy assets\n`);
    }

    // Fix pending assets without Drive ID
    if (pendingWithoutIdAssets.length > 0) {
      console.log('🔧 Fixing pending assets without Drive ID...');

      // These need to be retried for cloud sync
      // Set their nextRetryTime to now so they get picked up by the sync job
      let updated = 0;

      for (const asset of pendingWithoutIdAssets) {
        try {
          asset.nextRetryTime = new Date();
          asset.cloudStorage = asset.cloudStorage || {};
          asset.cloudStorage.attempted = (asset.cloudStorage.attempted || 0) + 1;
          
          if (!CONFIG.DRY_RUN) {
            await asset.save();
            updated++;
          } else {
            updated++;
          }

          if (CONFIG.VERBOSE) {
            console.log(`  ✅ Queued for retry: ${asset.filename}`);
          }
        } catch (error) {
          console.error(`  ❌ Error updating ${asset.filename}: ${error.message}`);
        }
      }

      console.log(`✅ Queued ${updated}/${pendingWithoutIdAssets.length} assets for retry\n`);
    }

    // Summary
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                    Migration Summary                       ║
╚════════════════════════════════════════════════════════════╝

✅ Scanned: ${legacyOnlyAssets.length + pendingWithoutIdAssets.length} assets
✅ Status:  ${CONFIG.DRY_RUN ? '🔍 DRY RUN (no changes made)' : '✨ Changes applied'}

Next steps:
1. Verify the proxy endpoint works for gallery images
2. Check backend logs for any asset loading errors
3. Run the health monitor to verify storage status

Command to verify:
  npm run asset-health-monitor
`);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

main();
