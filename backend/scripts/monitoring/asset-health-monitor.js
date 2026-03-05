/**
 * Asset Storage Health Monitoring
 * Tracks which assets need local backup or drive sync
 * Helps ensure no asset is lost
 */

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

import Asset from '../../models/Asset.js';

const DB_URL = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-wardrobe';

async function monitorStorageHealth() {
  try {
    await mongoose.connect(DB_URL);
    console.log('\n' + '═'.repeat(80));
    console.log('🏥 ASSET STORAGE HEALTH MONITOR');
    console.log('═'.repeat(80) + '\n');

    const assets = await Asset.find({ status: 'active' });
    
    const health = {
      healthy: [],  // Both local + Drive
      localOnly: [],  // Local but no Drive
      driveOnly: [],  // Drive but no local
      broken: []  // Neither
    };

    for (const asset of assets) {
      const localPath = asset.localStorage?.path || asset.storage?.localPath;
      const driveId = asset.cloudStorage?.googleDriveId || asset.storage?.googleDriveId;
      
      let localExists = false;
      if (localPath) {
        const fullPath = path.isAbsolute(localPath) ? localPath : path.join(__dirname, '../../', localPath);
        localExists = fs.existsSync(fullPath);
      }

      const statusKey = (() => {
        if (localExists && driveId) return 'healthy';
        if (localExists && !driveId) return 'localOnly';
        if (!localExists && driveId) return 'driveOnly';
        return 'broken';
      })();

      health[statusKey].push({
        filename: asset.filename,
        category: asset.assetCategory,
        localPath: localPath ? (localExists ? '✅' : '❌') : '(none)',
        driveId: driveId ? '✅' : '❌',
        assetId: asset.assetId
      });
    }

    console.log('📊 HEALTH STATUS:');
    console.log('─'.repeat(80));
    console.log(`✅ Healthy (both local + Drive):       ${health.healthy.length}  (${(health.healthy.length/assets.length*100).toFixed(1)}%)`);
    console.log(`📂 Local only (needs Drive backup):     ${health.localOnly.length}`);
    console.log(`☁️  Drive only (no local file):          ${health.driveOnly.length}`);
    console.log(`❌ Broken (missing both):               ${health.broken.length}`);

    if (health.broken.length > 0) {
      console.log('\n⚠️  BROKEN ASSETS (Missing both local and Drive):');
      console.log('─'.repeat(80));
      for (const asset of health.broken.slice(0, 5)) {
        console.log(`  • ${asset.filename} (${asset.category})`);
      }
      if (health.broken.length > 5) {
        console.log(`  ... and ${health.broken.length - 5} more`);
      }
    }

    if (health.driveOnly.length > 0) {
      console.log('\n💡 DRIVE-ONLY ASSETS (No local file, but backed up on Drive):');
      console.log('─'.repeat(80));
      console.log(`   ${health.driveOnly.length} assets are safe - can download from Drive if needed`);
      console.log('   Top categories:');
      const byCategory = {};
      for (const asset of health.driveOnly) {
        byCategory[asset.category] = (byCategory[asset.category] || 0) + 1;
      }
      for (const [cat, count] of Object.entries(byCategory)) {
        console.log(`     • ${cat}: ${count}`);
      }
    }

    if (health.localOnly.length > 0) {
      console.log('\n⚠️  LOCAL-ONLY ASSETS (No Drive backup - at risk!):');
      console.log('─'.repeat(80));
      console.log(`   ${health.localOnly.length} assets need Google Drive backup`);
      for (const asset of health.localOnly.slice(0, 5)) {
        console.log(`  • ${asset.filename} (${asset.category})`);
      }
      if (health.localOnly.length > 5) {
        console.log(`  ... and ${health.localOnly.length - 5} more`);
      }
    }

    console.log('\n📋 RECOMMENDATIONS:');
    console.log('─'.repeat(80));
    
    if (health.broken.length === 0 && health.localOnly.length === 0) {
      console.log('✅ Perfect! All assets have at least one backup');
      console.log('   • ' + health.healthy.length + ' assets have both local + Drive');
      console.log('   • ' + health.driveOnly.length + ' assets have Drive backup');
    } else {
      if (health.localOnly.length > 0) {
        console.log(`1. Backup ${health.localOnly.length} local-only assets to Google Drive`);
        console.log(`   Use: node backend/scripts/batch-upload-assets.js`);
      }
      if (health.broken.length > 0) {
        console.log(`2. Fix ${health.broken.length} broken assets (missing from both locations)`);
        console.log(`   Either restore from backup or delete them`);
      }
    }

    console.log('\n');
    process.exit(0);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

monitorStorageHealth();
