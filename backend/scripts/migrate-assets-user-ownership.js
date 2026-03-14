import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_ROOT = path.join(__dirname, '..');

// Import models
import User from '../models/User.js';
import Asset from '../models/Asset.js';
import connectDB from '../config/db.js';

const MASHUP_DIR = path.join(BACKEND_ROOT, 'media', 'mashups');

async function main() {
  try {
    console.log('🚀 Starting Asset User Ownership Migration...\n');
    
    // Connect to database
    await connectDB();
    console.log('✅ Connected to MongoDB\n');

    // Step 1: Find admin user
    console.log('📋 Step 1: Finding admin user...');
    const adminUser = await User.findOne({ role: 'admin' }).select('_id email name');
    if (!adminUser) {
      console.error('❌ No admin user found in database');
      process.exit(1);
    }
    const adminUserId = adminUser._id.toString();
    console.log(`✅ Found admin: ${adminUser.name} (${adminUser.email})`);
    console.log(`   Admin ID: ${adminUserId}\n`);

    // Step 2: Update assets without userId
    console.log('📋 Step 2: Updating assets without userId...');
    const noUserIdAssets = await Asset.find({
      $or: [
        { userId: { $exists: false } },
        { userId: null }
      ]
    });
    console.log(`   Found ${noUserIdAssets.length} assets without userId`);
    
    if (noUserIdAssets.length > 0) {
      const result = await Asset.updateMany(
        {
          $or: [
            { userId: { $exists: false } },
            { userId: null }
          ]
        },
        { $set: { userId: adminUserId } }
      );
      console.log(`✅ Updated ${result.modifiedCount} assets with admin userId\n`);
    } else {
      console.log('✅ No assets without userId found\n');
    }

    // Step 3: Find orphaned mashup files
    console.log('📋 Step 3: Finding orphaned mashup files...');
    if (!fs.existsSync(MASHUP_DIR)) {
      console.log(`⚠️  Mashup directory not found: ${MASHUP_DIR}`);
      process.exit(0);
    }

    const files = fs.readdirSync(MASHUP_DIR).filter(f => f.endsWith('.mp4') && !f.includes('-thumb'));
    console.log(`   Found ${files.length} total mashup files`);

    // Step 4: Create assets for orphaned mashup files
    console.log('📋 Step 4: Creating assets for orphaned mashup files...\n');
    
    let createdCount = 0;
    let skippedCount = 0;

    for (const filename of files) {
      const filePath = path.join(MASHUP_DIR, filename);
      const stats = fs.statSync(filePath);
      
      // Extract timestamp from filename: mashup-{videoId}-{timestamp}.mp4
      const timestampMatch = filename.match(/mashup-.+-(\d+)\.mp4$/);
      if (!timestampMatch) {
        console.log(`   ⚠️  Skipping ${filename} - cannot extract timestamp`);
        skippedCount++;
        continue;
      }

      const timestamp = timestampMatch[1];
      
      // Generate consistent assetId
      const assetId = `video_pipeline_generated_queue-${timestamp}`;
      
      // Check if asset already exists
      const existingAsset = await Asset.findOne({ assetId });
      if (existingAsset) {
        // Update if missing userId
        if (!existingAsset.userId) {
          await Asset.updateOne(
            { assetId },
            { $set: { userId: adminUserId } }
          );
          console.log(`   ♻️  Updated existing asset: ${assetId}`);
        }
        skippedCount++;
        continue;
      }

      // Create new asset
      try {
        const newAsset = new Asset({
          assetId,
          userId: adminUserId,
          filename,
          assetType: 'video',
          assetCategory: 'generated-video',
          mimeType: 'video/mp4',
          fileSize: stats.size,
          storage: {
            location: 'local',
            localPath: `media/mashups/${filename}`
          },
          localStorage: {
            path: `media/mashups/${filename}`
          }
        });

        await newAsset.save();
        console.log(`   ✅ Created asset for: ${filename}`);
        console.log(`      assetId: ${assetId}`);
        console.log(`      size: ${(stats.size / 1024 / 1024).toFixed(2)}MB`);
        createdCount++;
      } catch (err) {
        console.error(`   ❌ Error creating asset for ${filename}: ${err.message}`);
        skippedCount++;
      }
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`   ✅ Created: ${createdCount} new assets`);
    console.log(`   ⏭️  Skipped: ${skippedCount} files (already have assets or invalid)\n`);

    console.log('🎉 Asset User Ownership Migration Completed!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

main();
