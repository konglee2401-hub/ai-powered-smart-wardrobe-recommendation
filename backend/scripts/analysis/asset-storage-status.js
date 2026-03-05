/**
 * Asset Storage Status Report
 * Analyze current state of 552 remaining assets
 * Check which have local files and which have Google Drive backups
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

async function analyzeAssets() {
  try {
    await mongoose.connect(DB_URL);
    console.log('\n' + '═'.repeat(80));
    console.log('📊 ASSET STORAGE ANALYSIS - 552 Active Assets');
    console.log('═'.repeat(80) + '\n');

    const assets = await Asset.find({ status: 'active' });
    console.log(`Found ${assets.length} active assets\n`);

    let stats = {
      total: assets.length,
      hasLocal: 0,
      hasDrive: 0,
      localAndDrive: 0,
      localOnly: 0,
      driveOnly: 0,
      neither: 0,
      localFileExists: 0,
      categories: {}
    };

    const neitherList = [];

    for (const asset of assets) {
      if (!stats.categories[asset.assetCategory]) {
        stats.categories[asset.assetCategory] = { total: 0, hasLocal: 0, hasDrive: 0, both: 0 };
      }
      stats.categories[asset.assetCategory].total++;

      const localPath = asset.localStorage?.path || asset.storage?.localPath;
      const driveId = asset.cloudStorage?.googleDriveId || asset.storage?.googleDriveId;
      
      let localExists = false;
      if (localPath) {
        const fullPath = path.isAbsolute(localPath) ? localPath : path.join(__dirname, '../../', localPath);
        localExists = fs.existsSync(fullPath);
        if (localExists) stats.localFileExists++;
      }

      const hasLocal = !!localPath;
      const hasDrive = !!driveId;

      if (hasLocal) {
        stats.hasLocal++;
        stats.categories[asset.assetCategory].hasLocal++;
      }
      if (hasDrive) {
        stats.hasDrive++;
        stats.categories[asset.assetCategory].hasDrive++;
      }

      if (hasLocal && hasDrive) {
        stats.localAndDrive++;
        stats.categories[asset.assetCategory].both++;
      } else if (hasLocal) {
        stats.localOnly++;
      } else if (hasDrive) {
        stats.driveOnly++;
      } else {
        stats.neither++;
        neitherList.push({
          filename: asset.filename,
          category: asset.assetCategory,
          reason: 'No storage location'
        });
      }
    }

    console.log('📊 OVERALL STATISTICS:');
    console.log('─'.repeat(80));
    console.log(`Total active assets:        ${stats.total}`);
    console.log(`Has local file:             ${stats.hasLocal}  (${(stats.hasLocal/stats.total*100).toFixed(1)}%)`);
    console.log(`Has Drive ID:               ${stats.hasDrive}  (${(stats.hasDrive/stats.total*100).toFixed(1)}%)`);
    console.log(`Has BOTH local + Drive:     ${stats.localAndDrive}  (${(stats.localAndDrive/stats.total*100).toFixed(1)}%) ✅ IDEAL`);
    console.log(`Local only (no Drive):      ${stats.localOnly}`);
    console.log(`Drive only (no local):      ${stats.driveOnly}`);
    console.log(`Neither (MISSING):          ${stats.neither}  ⚠️`);
    console.log(`Files verified to exist:    ${stats.localFileExists}  (checked actual files)`);

    console.log('\n📂 BY CATEGORY:');
    console.log('─'.repeat(80));
    for (const [category, data] of Object.entries(stats.categories)) {
      const both = data.both;
      const local = data.hasLocal - data.both;
      const drive = data.hasDrive - data.both;
      const neither = data.total - data.hasLocal - data.hasDrive + data.both;
      
      console.log(`\n${category} (${data.total} total)`);
      console.log(`  ✅ Both local + Drive:  ${both}  (${(both/data.total*100).toFixed(0)}%)`);
      console.log(`  📂 Local only:          ${local}`);
      console.log(`  ☁️  Drive only:          ${drive}`);
      console.log(`  ❌ Missing:              ${neither}`);
    }

    if (stats.neither > 0) {
      console.log('\n⚠️  ASSETS WITH NO STORAGE:');
      console.log('─'.repeat(80));
      for (let i = 0; i < Math.min(10, neitherList.length); i++) {
        const item = neitherList[i];
        console.log(`  ${i + 1}. ${item.filename} (${item.category})`);
      }
      if (neitherList.length > 10) {
        console.log(`  ... and ${neitherList.length - 10} more`);
      }
    }

    console.log('\n📋 RECOMMENDATIONS:');
    console.log('─'.repeat(80));
    if (stats.localAndDrive === stats.total) {
      console.log('✅ Perfect! All assets have both local and Drive backups');
    } else if (stats.localAndDrive === 0) {
      console.log('⚠️  Critical! No assets have both - need to sync with Drive');
    } else {
      console.log(`⚠️  ${stats.total - stats.localAndDrive} assets missing either local or Drive storage`);
      console.log(`    - ${stats.localOnly} assets need Drive backup`);
      console.log(`    - ${stats.driveOnly} assets need local recovery`);
      console.log(`    - ${stats.neither} assets need both`);
    }

    console.log('\n');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

analyzeAssets();
