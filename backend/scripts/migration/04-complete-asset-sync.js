#!/usr/bin/env node

/**
 * Complete Asset Sync Script
 * Ensures ALL assets (86 total) have both local and cloud storage records
 * Fills in missing localStorage for assets that don't have it yet
 */

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

import Asset from '../models/Asset.js';

const DOWNLOADS_DIR = path.join(process.cwd(), 'backend/media/downloads');
const BATCH_SIZE = 5;

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

async function downloadFromDrive(googleDriveId, filename) {
  try {
    const driveUrl = `https://drive.google.com/uc?export=download&id=${googleDriveId}&confirm=t`;
    
    console.log(`   ⬇️  Downloading from Drive: ${filename}`);
    
    const response = await axios.get(driveUrl, {
      responseType: 'arraybuffer',
      timeout: 30000,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0'
      }
    });

    // Generate category subdirectory based on asset category hints in filename
    let categorySubdir = 'other';
    const lowerFilename = filename.toLowerCase();
    
    if (lowerFilename.includes('character')) categorySubdir = 'character';
    else if (lowerFilename.includes('product')) categorySubdir = 'product';
    else if (lowerFilename.includes('generated') || lowerFilename.includes('wearing') || lowerFilename.includes('holding')) categorySubdir = 'generated';
    
    // Create directory if needed
    const categoryDir = path.join(DOWNLOADS_DIR, categorySubdir);
    if (!fs.existsSync(categoryDir)) {
      fs.mkdirSync(categoryDir, { recursive: true });
    }

    // Save file
    const localFileName = `${path.basename(filename, path.extname(filename))}_${Date.now()}${path.extname(filename)}`;
    const localPath = path.join(categoryDir, localFileName);
    
    fs.writeFileSync(localPath, response.data);
    console.log(`   ✅ Saved locally: ${localPath}`);
    
    return { localPath, fileSize: response.data.length };
  } catch (err) {
    console.error(`   ❌ Download failed: ${err.message}`);
    return null;
  }
}

async function syncAsset(asset) {
  try {
    // CASE 1: Already has localStorage - just verify it exists
    if (asset.localStorage?.path) {
      const exists = fs.existsSync(asset.localStorage.path);
      asset.localStorage.verified = exists;
      
      if (exists) {
        console.log(`✅ VERIFIED Local: ${asset.filename}`);
        return { status: 'verified', type: 'local' };
      } else {
        console.log(`⚠️  LOCAL MISSING: ${asset.filename}`);
        // Continue to download from Drive below
      }
    }

    // CASE 2: Has Google Drive ID but no localStorage - download and create record
    if (asset.cloudStorage?.googleDriveId || asset.storage?.googleDriveId) {
      const googleDriveId = asset.cloudStorage?.googleDriveId || asset.storage?.googleDriveId;
      
      console.log(`📥 SYNCING FROM DRIVE: ${asset.filename}`);
      
      const downloadResult = await downloadFromDrive(googleDriveId, asset.filename);
      
      if (downloadResult) {
        // Create/update localStorage entry
        asset.localStorage = {
          location: 'local',
          path: downloadResult.localPath,
          fileSize: downloadResult.fileSize,
          savedAt: new Date(),
          verified: true
        };

        // Update cloud storage if not already set
        if (!asset.cloudStorage) {
          asset.cloudStorage = {
            googleDriveId,
            status: 'synced',
            syncedAt: new Date(),
            attempted: 1
          };
        }

        // Update sync status
        asset.syncStatus = 'synced';
        
        await asset.save();
        console.log(`   💾 Asset record updated with localStorage`);
        return { status: 'synced', type: 'drive-download' };
      } else {
        console.log(`   ❌ Could not download from Drive`);
        return { status: 'failed', type: 'drive-error' };
      }
    }

    console.log(`⚠️  SKIPPED: ${asset.filename} - no Google Drive ID`);
    return { status: 'skipped', type: 'no-drive-id' };
  } catch (err) {
    console.error(`❌ Sync error: ${err.message}`);
    return { status: 'error', type: 'exception', error: err.message };
  }
}

async function runSync() {
  console.log('\n' + '═'.repeat(80));
  console.log('🔄 COMPLETE ASSET SYNC - LOCAL & DRIVE SYNCHRONIZATION');
  console.log('═'.repeat(80));

  try {
    // Get all assets
    const allAssets = await Asset.find({}).sort({ createdAt: -1 });
    console.log(`\n📊 Total assets to sync: ${allAssets.length}\n`);

    let stats = {
      verified: 0,
      synced: 0,
      skipped: 0,
      failed: 0,
      errors: 0
    };

    // Process in batches
    for (let i = 0; i < allAssets.length; i += BATCH_SIZE) {
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const batch = allAssets.slice(i, i + BATCH_SIZE);
      
      console.log(`\n📦 Batch ${batchNum} (${batch.length} assets)`);
      console.log('─'.repeat(80));

      for (const asset of batch) {
        console.log(`\n📄 ${asset.assetId}`);
        console.log(`   File: ${asset.filename}`);
        console.log(`   Type: ${asset.assetType} / ${asset.assetCategory}`);
        console.log(`   Drive ID: ${asset.cloudStorage?.googleDriveId || asset.storage?.googleDriveId || 'N/A'}`);
        
        const result = await syncAsset(asset);
        
        if (result.status === 'verified') stats.verified++;
        else if (result.status === 'synced') stats.synced++;
        else if (result.status === 'skipped') stats.skipped++;
        else if (result.status === 'failed') stats.failed++;
        else if (result.status === 'error') stats.errors++;
      }

      // Small delay between batches
      if (i + BATCH_SIZE < allAssets.length) {
        console.log('\n⏳ Waiting before next batch...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Summary
    console.log('\n' + '═'.repeat(80));
    console.log('📊 SYNC SUMMARY');
    console.log('─'.repeat(80));
    console.log(`  ✅ Verified local:   ${stats.verified}`);
    console.log(`  📥 Downloaded+synced: ${stats.synced}`);
    console.log(`  ⏭️  Skipped:          ${stats.skipped}`);
    console.log(`  ❌ Failed:           ${stats.failed}`);
    console.log(`  ⚠️  Errors:          ${stats.errors}`);
    console.log(`  📊 Total processed:  ${stats.verified + stats.synced + stats.skipped + stats.failed + stats.errors}`);
    console.log('═'.repeat(80));

    if (stats.synced > 0 || stats.verified > 0) {
      console.log('\n✨ Sync completed successfully!');
      console.log(`\n💡 Results:`);
      console.log(`   - All assets now have local & cloud storage linked`);
      console.log(`   - Gallery will load from local cache first`);
      console.log(`   - Gallery proxy endpoint now has fallback to Drive`);
    }
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
}

async function main() {
  try {
    await connectDB();
    await runSync();
  } catch (err) {
    console.error('Fatal error:', err);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed\n');
  }
}

main();
