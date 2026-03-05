#!/usr/bin/env node

/**
 * Fix broken gallery assets
 * Converts full Google Drive URLs to just the file IDs in Asset.storage.googleDriveId
 */

import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-wardrobe';

// Asset schema
const AssetSchema = new mongoose.Schema({
  assetId: String,
  filename: String,
  assetType: String,
  assetCategory: String,
  storage: {
    location: String,
    filePath: String,
    url: String,
    localStorage: {
      path: String
    },
    googleDriveId: String
  }
}, { collection: 'assets' });

const Asset = mongoose.model('Asset', AssetSchema);

async function fixAssets() {
  try {
    console.log('🔧 Connecting to MongoDB...');
    console.log(`   URI: ${MONGODB_URI}`);
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find all assets with googleDriveId that looks like a URL
    console.log('🔍 Finding assets with malformed googleDriveId...');
    const brokenAssets = await Asset.find({
      'storage.googleDriveId': {
        $regex: 'https://'  // Full URL instead of just ID
      }
    });

    console.log(`Found: ${brokenAssets.length} assets to fix\n`);

    if (brokenAssets.length === 0) {
      console.log('✅ No broken assets found - all are already fixed!');
      await mongoose.connection.close();
      return;
    }

    let fixedCount = 0;
    let errorCount = 0;

    for (const asset of brokenAssets) {
      try {
        const fullUrl = asset.storage.googleDriveId;
        
        // Extract file ID from URL: https://drive.google.com/file/d/FILE_ID_HERE/view?usp=drivesdk
        const fileIdMatch = fullUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
        
        if (fileIdMatch && fileIdMatch[1]) {
          const fileId = fileIdMatch[1];
          
          // Update the asset
          asset.storage.googleDriveId = fileId;
          await asset.save();
          
          fixedCount++;
          console.log(`✅ Fixed: ${asset.assetId}`);
          console.log(`   Category: ${asset.assetCategory}`);
          console.log(`   Old: ${fullUrl}`);
          console.log(`   New: ${fileId}\n`);
        } else {
          errorCount++;
          console.log(`❌ Could not extract file ID from: ${asset.assetId}`);
          console.log(`   URL: ${fullUrl}\n`);
        }
      } catch (err) {
        errorCount++;
        console.log(`❌ Error fixing asset ${asset.assetId}: ${err.message}\n`);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Total found: ${brokenAssets.length}`);
    console.log(`   Fixed: ${fixedCount} ✅`);
    console.log(`   Errors: ${errorCount} ❌`);

    if (fixedCount > 0) {
      console.log(`\n🎉 Successfully fixed ${fixedCount} assets!`);
      console.log(`Gallery images should now load correctly.`);
    }

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

fixAssets();
