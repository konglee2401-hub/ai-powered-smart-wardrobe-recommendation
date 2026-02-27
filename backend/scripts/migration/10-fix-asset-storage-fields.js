#!/usr/bin/env node
/**
 * MIGRATION SCRIPT: Fix Existing Asset Records
 * 
 * PURPOSE:
 * Migrates 20 existing character/product image assets to new storage schema
 * Updates missing fields:
 * - cloudStorage.googleDriveId
 * - cloudStorage.webViewLink
 * - cloudStorage.thumbnailLink
 * - cloudStorage.status
 * - localStorage.path
 * - localStorage.verified
 * - syncStatus
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Asset from '../../models/Asset.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-wardrobe';

async function migrateAssets() {
  try {
    console.log('\n' + '═'.repeat(80));
    console.log('🔄 MIGRATION: Fix Asset Records - Populate Storage Fields');
    console.log('═'.repeat(80));

    // Connect to MongoDB
    console.log(`\n📦 Connecting to MongoDB: ${MONGODB_URI}...`);
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all character/product images with pending sync status
    console.log('\n' + '─'.repeat(80));
    console.log('📊 SCANNING: Find Assets to Migrate');
    console.log('─'.repeat(80));

    const assetsToMigrate = await Asset.find({
      assetCategory: { $in: ['character-image', 'product-image'] },
      status: 'active'
    }).lean();

    console.log(`\n✅ Found ${assetsToMigrate.length} assets to migrate`);

    if (assetsToMigrate.length === 0) {
      console.log('\n⚠️  No assets found to migrate. Database already clean?');
      await mongoose.disconnect();
      return;
    }

    // Analyze what needs fixing
    const needsMigration = assetsToMigrate.filter(asset => {
      return !asset.cloudStorage?.googleDriveId || 
             !asset.localStorage?.path ||
             asset.syncStatus === 'pending';
    });

    console.log(`\n📋 Assets needing migration: ${needsMigration.length}/${assetsToMigrate.length}`);

    if (needsMigration.length === 0) {
      console.log('\n✅ All assets already migrated!');
      await mongoose.disconnect();
      return;
    }

    // Migrate each asset
    console.log('\n' + '─'.repeat(80));
    console.log('🔧 MIGRATING: Updating Asset Records');
    console.log('─'.repeat(80));

    let migrationSuccessCount = 0;
    let migrationErrorCount = 0;

    for (const asset of needsMigration) {
      try {
        console.log(`\n📝 Migrating: ${asset.assetId}`);
        console.log(`   Category: ${asset.assetCategory}`);
        console.log(`   Filename: ${asset.filename}`);

        // Determine Drive ID from storage
        const googleDriveId = asset.storage?.googleDriveId;
        if (!googleDriveId) {
          console.warn(`   ⚠️  WARNING: No Google Drive ID found in storage`);
          console.warn(`      storage.location: ${asset.storage?.location}`);
          console.warn(`      storage.googleDriveId: ${asset.storage?.googleDriveId}`);
          console.warn(`      Skipping this asset...`);
          continue;
        }

        // Build new storage objects
        const updates = {
          // Ensure cloudStorage is populated
          cloudStorage: asset.cloudStorage || {},
          // Ensure localStorage is populated
          localStorage: asset.localStorage || {}
        };

        // Populate cloudStorage
        updates.cloudStorage = {
          location: 'google-drive',
          googleDriveId: googleDriveId,
          webViewLink: asset.storage?.url || null,  // Fallback to legacy URL if available
          thumbnailLink: null,  // Could be fetched from Drive API later
          status: 'synced',  // Already uploaded to Drive
          syncedAt: asset.createdAt || new Date()
        };

        // Populate localStorage
        updates.localStorage = {
          location: 'local',
          path: asset.storage?.filePath || null,
          fileSize: asset.fileSize || null,
          verified: false  // Would need filesystem check to verify
        };

        // Update syncStatus if still pending
        if (asset.syncStatus === 'pending') {
          updates.syncStatus = 'synced';  // Mark as synced since already on Drive
          updates.nextRetryTime = null;   // Clear retry timer
        }

        // Apply update
        await Asset.updateOne(
          { _id: asset._id },
          { $set: updates },
          { runValidators: false }  // Skip validation to allow partial updates
        );

        console.log(`   ✅ Migrated successfully`);
        console.log(`      cloudStorage.googleDriveId: ${googleDriveId}`);
        console.log(`      cloudStorage.status: synced`);
        console.log(`      syncStatus: ${updates.syncStatus || 'unchanged'}`);

        migrationSuccessCount++;
      } catch (error) {
        console.error(`   ❌ Error migrating: ${error.message}`);
        migrationErrorCount++;
      }
    }

    // Final report
    console.log('\n' + '─'.repeat(80));
    console.log('📊 MIGRATION REPORT');
    console.log('─'.repeat(80));

    console.log(`\n✅ Successfully migrated: ${migrationSuccessCount}/${needsMigration.length}`);
    if (migrationErrorCount > 0) {
      console.log(`❌ Migration errors: ${migrationErrorCount}`);
    }

    // Verify migration
    console.log('\n' + '─'.repeat(80));
    console.log('🔍 VERIFICATION: Checking Migrated Records');
    console.log('─'.repeat(80));

    const verifyAssets = await Asset.find({
      assetCategory: { $in: ['character-image', 'product-image'] },
      status: 'active'
    })
      .select('assetId assetCategory filename cloudStorage localStorage syncStatus')
      .lean()
      .limit(5);

    console.log(`\n📋 Sample of migrated assets (first 5):\n`);
    verifyAssets.forEach((asset, idx) => {
      console.log(`${idx + 1}. ${asset.filename}`);
      console.log(`   cloudStorage.googleDriveId: ${asset.cloudStorage?.googleDriveId ? '✅ SET' : '❌ MISSING'}`);
      console.log(`   cloudStorage.status: ${asset.cloudStorage?.status || 'MISSING'}`);
      console.log(`   localStorage.path: ${asset.localStorage?.path ? '✅ SET' : '❌ MISSING'}`);
      console.log(`   syncStatus: ${asset.syncStatus || 'MISSING'}`);
    });

    console.log('\n' + '═'.repeat(80));
    console.log('✅ MIGRATION COMPLETE');
    console.log('═'.repeat(80) + '\n');

    // Summary
    console.log('📝 NEXT STEPS:');
    console.log('   1. Verify gallery picker now shows character/product images');
    console.log('   2. Check UI for proper image thumbnails and metadata');
    console.log('   3. Test image selection in gallery'); 
    console.log('   4. Monitor logs for any storage errors\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

// Run migration
migrateAssets();
