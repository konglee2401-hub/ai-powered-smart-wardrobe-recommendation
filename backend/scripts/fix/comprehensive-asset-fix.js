#!/usr/bin/env node
/**
 * COMPREHENSIVE FIX: Asset Storage Metadata Repair
 * 
 * Fixes all character & product images with:
 * - Missing cloudStorage fields
 * - Missing localStorage fields
 * - Pending sync status
 * - Incomplete metadata
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Asset from '../../models/Asset.js';
import GoogleDriveOAuthService from '../../services/googleDriveOAuth.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-wardrobe';

async function fixAssetMetadata() {
  try {
    console.log('\n' + '═'.repeat(80));
    console.log('🔧 COMPREHENSIVE FIX: Asset Metadata Repair');
    console.log('═'.repeat(80));

    // Connect to MongoDB
    console.log(`\n📦 Connecting to MongoDB...`);
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Initialize Google Drive service
    console.log(`\n🔐 Initializing Google Drive OAuth...`);
    const driveService = GoogleDriveOAuthService;
    const authResult = await driveService.authenticate();
    
    if (!authResult.authenticated && !authResult.configured) {
      console.warn(`⚠️  Google Drive OAuth not configured`);
      console.warn(`   Continuing without Drive metadata fetch...`);
    } else {
      console.log(`✅ Google Drive authenticated`);
    }

    // Find all character/product images
    console.log('\n' + '─'.repeat(80));
    console.log('📊 SCANNING: Find Assets to Fix');
    console.log('─'.repeat(80));

    const assetsToFix = await Asset.find({
      assetCategory: { $in: ['character-image', 'product-image'] },
      status: 'active'
    });

    console.log(`\n✅ Found ${assetsToFix.length} assets to check`);

    // Identify which assets need fixing
    const needsFix = assetsToFix.filter(asset => {
      const missingCloud = !asset.cloudStorage?.googleDriveId;
      const missingLocal = !asset.localStorage?.path;
      const pendingSync = asset.syncStatus === 'pending';
      return missingCloud || missingLocal || pendingSync;
    });

    console.log(`\n📋 Assets needing fixes: ${needsFix.length}/${assetsToFix.length}`);

    if (needsFix.length === 0) {
      console.log('\n✅ All assets already have complete metadata!');
      await mongoose.disconnect();
      return;
    }

    // Fix each asset
    console.log('\n' + '─'.repeat(80));
    console.log('🔧 FIXING: Update Asset Records');
    console.log('─'.repeat(80));

    let fixedCount = 0;
    let errorCount = 0;
    const fixedAssets = [];

    for (let i = 0; i < needsFix.length; i++) {
      const asset = needsFix[i];
      const progress = `[${i + 1}/${needsFix.length}]`;

      try {
        console.log(`\n${progress} Fixing: ${asset.filename}`);
        console.log(`   Category: ${asset.assetCategory}`);

        const updates = {};
        const issues = [];

        // Issue 1: Missing cloudStorage
        if (!asset.cloudStorage?.googleDriveId && asset.storage?.googleDriveId) {
          issues.push('missing cloudStorage.googleDriveId');
          updates.cloudStorage = {
            location: 'google-drive',
            googleDriveId: asset.storage.googleDriveId,
            webViewLink: asset.storage?.url || null,
            thumbnailLink: null,
            status: 'synced',
            syncedAt: asset.createdAt || new Date()
          };

          // Try to fetch webViewLink from Drive if available
          try {
            if (driveService.authenticated && asset.storage?.googleDriveId) {
              const metadata = await driveService.getFileMetadata(asset.storage.googleDriveId);
              if (metadata?.webViewLink) {
                updates.cloudStorage.webViewLink = metadata.webViewLink;
                updates.cloudStorage.thumbnailLink = metadata.thumbnailLink || null;
                issues[issues.length - 1] = 'missing cloudStorage (fetched from Drive)';
              }
            }
          } catch (driveError) {
            console.log(`      ℹ️  Could not fetch Drive metadata: ${driveError.message}`);
          }
        }

        // Issue 2: Missing localStorage
        if (!asset.localStorage?.path && asset.storage?.filePath) {
          issues.push('missing localStorage');
          updates.localStorage = {
            location: 'local',
            path: asset.storage.filePath,
            fileSize: asset.fileSize || null,
            verified: false
          };
        } else if (!asset.localStorage?.path && !asset.storage?.filePath) {
          issues.push('no local file path');
          // Can't populate localStorage without a file path
        }

        // Issue 3: Pending sync status
        if (asset.syncStatus === 'pending') {
          issues.push('syncStatus still pending');
          updates.syncStatus = 'synced';
          updates.nextRetryTime = null;
        }

        // Issue 4: StorageLocation mismatch
        if (asset.storage?.googleDriveId && asset.storage?.location !== 'google-drive') {
          issues.push('storage.location incorrect');
          if (!updates.storage) {
            updates.storage = asset.storage;
          }
          updates.storage.location = 'google-drive';
        }

        if (Object.keys(updates).length === 0) {
          console.log(`   ⚠️  No fixes needed (metadata already complete)`);
          continue;
        }

        // Apply updates
        await Asset.updateOne(
          { _id: asset._id },
          { $set: updates },
          { runValidators: false }
        );

        console.log(`   ✅ Fixed: ${issues.join(', ')}`);
        fixedCount++;
        fixedAssets.push({
          filename: asset.filename,
          category: asset.assetCategory,
          issues: issues
        });

      } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
        errorCount++;
      }
    }

    // Verification
    console.log('\n' + '─'.repeat(80));
    console.log('✓ VERIFICATION: Check Fixed Records');
    console.log('─'.repeat(80));

    const verifyAssets = await Asset.find({
      assetCategory: { $in: ['character-image', 'product-image'] },
      status: 'active'
    })
      .select('filename cloudStorage localStorage syncStatus')
      .lean()
      .limit(10);

    console.log(`\n📋 Sample of fixed assets:\n`);

    let completeCount = 0;
    verifyAssets.forEach((asset, idx) => {
      const hasCloud = asset.cloudStorage?.googleDriveId ? '✅' : '❌';
      const hasLocal = asset.localStorage?.path ? '✅' : '❌';
      const synced = asset.syncStatus === 'synced' ? '✅' : '⚠️';

      console.log(`${idx + 1}. ${asset.filename}`);
      console.log(`   Cloud: ${hasCloud} | Local: ${hasLocal} | Sync: ${synced}`);

      if (hasCloud === '✅' && hasLocal === '✅' && synced === '✅') {
        completeCount++;
      }
    });

    // Final Report
    console.log('\n' + '═'.repeat(80));
    console.log('📊 FIX REPORT');
    console.log('═'.repeat(80));

    console.log(`\n✅ Successfully fixed: ${fixedCount}/${needsFix.length}`);
    if (errorCount > 0) {
      console.log(`❌ Errors: ${errorCount}`);
    }

    console.log(`\n✓ Verification (sample): ${completeCount}/10 complete`);

    console.log('\n📝 Assets Fixed:');
    fixedAssets.slice(0, 5).forEach((asset, idx) => {
      console.log(`${idx + 1}. ${asset.filename} (${asset.category})`);
      console.log(`   Issues: ${asset.issues.join(', ')}`);
    });

    if (fixedAssets.length > 5) {
      console.log(`... and ${fixedAssets.length - 5} more`);
    }

    console.log('\n' + '═'.repeat(80));
    console.log('✅ FIX COMPLETE');
    console.log('═'.repeat(80));

    console.log('\n🎯 NEXT STEPS:');
    console.log('   1. ✅ Assets fixed in database');
    console.log('   2. Restart backend server to apply changes');
    console.log('   3. Test gallery picker (should show images)');
    console.log('   4. Run e2e test: node scripts/test/e2e-gallery-workflow.js');
    console.log('   5. Test end-to-end: upload → generate → gallery\n');

  } catch (error) {
    console.error('\n❌ Fix failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

// Run fix
fixAssetMetadata();
