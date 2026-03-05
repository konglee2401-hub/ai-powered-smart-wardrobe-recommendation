#!/usr/bin/env node
/**
 * FIX CORRUPTED PATHS in Asset Database
 * 
 * Fixes paths with double characters:
 * - scene-llocks -> scene-locks
 * - tiktok--flows -> tiktok-flows
 * - Any other double-dash/double-letter patterns
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import Asset from '../../models/Asset.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(path.dirname(__dirname), '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-wardrobe';

async function fixPathCorruption() {
  try {
    console.log('\n' + '═'.repeat(80));
    console.log('🔧 FIX CORRUPTED PATHS: Repair Double-Character Path Issues');
    console.log('═'.repeat(80));

    // Connect to MongoDB
    console.log(`\n📦 Connecting to MongoDB...`);
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Define path corrections
    const pathCorrections = [
      { find: /scene-llocks/g, replace: 'scene-locks', name: 'scene-llocks → scene-locks' },
      { find: /tiktok--flows/g, replace: 'tiktok-flows', name: 'tiktok--flows → tiktok-flows' },
      // Add more corrections as needed
    ];

    console.log('\n' + '─'.repeat(80));
    console.log('🔍 SCANNING: Find Assets with Corrupted Paths');
    console.log('─'.repeat(80));

    // Find all assets
    const allAssets = await Asset.find({});
    console.log(`\n✅ Found ${allAssets.length} total assets`);

    let totalFixed = 0;
    const fixDetails = [];

    for (const correction of pathCorrections) {
      console.log(`\n🔎 Checking for pattern: ${correction.name}`);
      
      let fixed = 0;
      const corruptedAssets = [];

      // Check each asset for corrupted paths
      for (const asset of allAssets) {
        let needsFix = false;
        const updates = {};

        // Check localStorage.path
        if (asset.localStorage?.path && correction.find.test(asset.localStorage.path)) {
          updates['localStorage.path'] = asset.localStorage.path.replace(correction.find, correction.replace);
          needsFix = true;
          corruptedAssets.push({
            id: asset._id,
            filename: asset.filename,
            oldPath: asset.localStorage.path,
            newPath: updates['localStorage.path']
          });
        }

        // Check storage.localPath
        if (asset.storage?.localPath && correction.find.test(asset.storage.localPath)) {
          updates['storage.localPath'] = asset.storage.localPath.replace(correction.find, correction.replace);
          needsFix = true;
          if (!corruptedAssets.find(a => a.id.toString() === asset._id.toString())) {
            corruptedAssets.push({
              id: asset._id,
              filename: asset.filename,
              oldPath: asset.storage.localPath,
              newPath: updates['storage.localPath']
            });
          }
        }

        // Apply fix if needed
        if (needsFix && Object.keys(updates).length > 0) {
          try {
            await Asset.updateOne(
              { _id: asset._id },
              { $set: updates }
            );
            fixed++;
            console.log(`   ✅ Fixed: ${asset.filename}`);
          } catch (err) {
            console.error(`   ❌ Error fixing ${asset.filename}: ${err.message}`);
          }
        }
      }

      if (fixed > 0) {
        console.log(`\n✅ Fixed ${fixed} asset(s) with pattern: ${correction.name}`);
        fixDetails.push({
          pattern: correction.name,
          fixed,
          assets: corruptedAssets
        });
        totalFixed += fixed;
      } else {
        console.log(`⚠️ No assets found with pattern: ${correction.name}`);
      }
    }

    // Summary
    console.log('\n' + '─'.repeat(80));
    console.log('📊 FIX SUMMARY');
    console.log('─'.repeat(80));
    console.log(`\n🔧 Total paths fixed: ${totalFixed}`);

    if (fixDetails.length > 0) {
      fixDetails.forEach(detail => {
        console.log(`\n📝 ${detail.pattern}:`);
        console.log(`   - Fixed: ${detail.fixed} asset(s)`);
        detail.assets.slice(0, 3).forEach(asset => {
          console.log(`     • ${asset.filename}`);
          console.log(`       Old: ${asset.oldPath}`);
          console.log(`       New: ${asset.newPath}`);
        });
        if (detail.assets.length > 3) {
          console.log(`     ... and ${detail.assets.length - 3} more`);
        }
      });
    }

    console.log('\n✅ Path corruption fix completed!');
    await mongoose.disconnect();

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the fix
fixPathCorruption().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
