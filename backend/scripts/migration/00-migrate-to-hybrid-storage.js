#!/usr/bin/env node

/**
 * Migration Script: Legacy Storage → Hybrid Storage Format
 * Converts old assets from single storage format to new hybrid local+cloud storage
 * 
 * Usage: node migrateToHybridStorage.js
 * 
 * What it does:
 * 1. Finds all assets with legacy storage format
 * 2. Converts them to hybrid format with localStorage and cloudStorage
 * 3. Maintains backward compatibility by keeping old storage object
 */

import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import Asset model
import Asset from '../models/Asset.js';

const BATCH_SIZE = 10;

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-wardrobe', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  }
}

async function migrateAsset(asset) {
  try {
    let updated = false;
    const updates = {};

    // Check if already migrated (has new hybrid fields)
    if (asset.localStorage || asset.cloudStorage) {
      // Already migrated
      return { status: 'already-migrated', assetId: asset.assetId };
    }

    // Only process if it has legacy storage
    if (!asset.storage) {
      return { status: 'no-storage', assetId: asset.assetId };
    }

    // ===== MIGRATE LOCAL STORAGE =====
    if (asset.storage.localPath && fs.existsSync(asset.storage.localPath)) {
      try {
        const stats = fs.statSync(asset.storage.localPath);
        updates.localStorage = {
          path: asset.storage.localPath,
          fileSize: stats.size,
          savedAt: new Date(stats.birthtime || stats.mtime),
          verified: true
        };
        updated = true;
        console.log(`  📁 localStorage.path: ${asset.storage.localPath}`);
      } catch (err) {
        console.warn(`  ⚠️  Could not stat file ${asset.storage.localPath}: ${err.message}`);
        // Still add to storage even if file not found (may have been moved)
        updates.localStorage = {
          path: asset.storage.localPath,
          fileSize: asset.fileSize,
          savedAt: asset.createdAt,
          verified: false
        };
        updated = true;
      }
    } else if (asset.storage.localPath) {
      console.warn(`  ⚠️  Local file not found: ${asset.storage.localPath} - marking unverified`);
      updates.localStorage = {
        path: asset.storage.localPath,
        fileSize: asset.fileSize,
        savedAt: asset.createdAt,
        verified: false
      };
      updated = true;
    }

    // ===== MIGRATE CLOUD STORAGE =====
    if (asset.storage.googleDriveId) {
      updates.cloudStorage = {
        googleDriveId: asset.storage.googleDriveId,
        status: 'synced',  // Assume already on Drive since old system had it
        syncedAt: asset.updatedAt || asset.createdAt,
        attempted: 1
      };
      
      // Try to extract thumbnail link if URL contains Google Drive domain
      if (asset.storage.url && asset.storage.url.includes('drive.google.com')) {
        updates.cloudStorage.webViewLink = asset.storage.url;
      }
      
      updated = true;
      console.log(`  ☁️  cloudStorage.googleDriveId: ${asset.storage.googleDriveId}`);
    }

    // ===== SET SYNC STATUS =====
    if (updated) {
      // If we have both local and cloud, mark as synced
      // If only cloud, it was synced but local was probably deleted
      if (updates.localStorage && updates.cloudStorage) {
        updates.syncStatus = 'synced';
      } else if (updates.cloudStorage) {
        updates.syncStatus = 'synced';
      } else if (updates.localStorage) {
        updates.syncStatus = 'pending';  // Local only, waiting for first cloud sync
      }

      // Set retention: keep for 30 days, then delete local only
      updates.retention = {
        deleteAfterDays: 30,
        deleteLocalAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        keepCloudCopy: !!updates.cloudStorage
      };

      console.log(`  ✅ Sync status: ${updates.syncStatus}`);

      // Apply updates
      await Asset.findByIdAndUpdate(asset._id, updates, { new: true });
      return { status: 'migrated', assetId: asset.assetId, ...Object.keys(updates) };
    }

    return { status: 'no-changes', assetId: asset.assetId };
  } catch (err) {
    console.error(`  ❌ Migration failed for ${asset.assetId}:`, err.message);
    return { status: 'error', assetId: asset.assetId, error: err.message };
  }
}

async function runMigration() {
  console.log('\n🔄 Starting Legacy Storage → Hybrid Storage Migration');
  console.log('═'.repeat(80));

  // Find all assets without hybrid storage fields
  const query = {
    $or: [
      { localStorage: { $exists: false } },
      { cloudStorage: { $exists: false } }
    ],
    storage: { $exists: true }
  };

  const totalCount = await Asset.countDocuments(query);
  console.log(`\n📊 Found ${totalCount} assets to migrate\n`);

  if (totalCount === 0) {
    console.log('✅ All assets already migrated!');
    return;
  }

  let migratedCount = 0;
  let alreadyMigratedCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  // Process in batches
  for (let i = 0; i < totalCount; i += BATCH_SIZE) {
    const batch = await Asset.find(query)
      .limit(BATCH_SIZE)
      .skip(i);

    console.log(`\n📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} assets)`);
    console.log('─'.repeat(80));

    for (const asset of batch) {
      console.log(`\n📄 Asset: ${asset.assetId}`);
      console.log(`   Type: ${asset.assetType} / ${asset.assetCategory}`);
      
      const result = await migrateAsset(asset);
      
      if (result.status === 'migrated') {
        migratedCount++;
        console.log(`   ✅ MIGRATED`);
      } else if (result.status === 'already-migrated') {
        alreadyMigratedCount++;
        console.log(`   ⏭️  Already migrated`);
      } else if (result.status === 'no-changes') {
        skippedCount++;
        console.log(`   ⏭️  No changes needed`);
      } else if (result.status === 'error') {
        errorCount++;
        console.log(`   ❌ ERROR: ${result.error}`);
      }
    }
  }

  // Summary
  console.log('\n' + '═'.repeat(80));
  console.log('📈 MIGRATION SUMMARY');
  console.log('─'.repeat(80));
  console.log(`  ✅ Migrated:        ${migratedCount}`);
  console.log(`  ⏭️  Already migrated: ${alreadyMigratedCount}`);
  console.log(`  ⏭️  Skipped:         ${skippedCount}`);
  console.log(`  ❌ Errors:          ${errorCount}`);
  console.log(`  📊 Total:           ${migratedCount + alreadyMigratedCount + skippedCount + errorCount}`);
  console.log('═'.repeat(80));

  if (migratedCount > 0) {
    console.log('\n✨ Migration completed successfully!');
    console.log(`\n💡 Next steps:`);
    console.log(`   1. Verify migrated assets: curl http://localhost:5000/api/assets/gallery`);
    console.log(`   2. Check Gallery Picker in UI - old images should now appear`);
    console.log(`   3. Background sync will continue to synced assets`);
  }
}

async function main() {
  try {
    await connectDB();
    await runMigration();
  } catch (err) {
    console.error('Fatal error:', err);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Connection closed\n');
  }
}

main();
