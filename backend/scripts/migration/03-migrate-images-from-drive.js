#!/usr/bin/env node

/**
 * Drive-to-Local-DB Migration Script
 * Syncs all images from Google Drive folders to local storage and database
 * 
 * Usage: node migrateImagesFromDrive.js
 * 
 * What it does:
 * 1. Authenticates with Google Drive
 * 2. Scans folders: Character, Product, Completed, Downloaded
 * 3. Downloads each image to local storage
 * 4. Creates/updates Asset records in database
 * 5. Maintains sync status and metadata
 */

import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Readable } from 'stream';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import models
import Asset from '../models/Asset.js';

// Local storage paths
const LOCAL_DOWNLOADS_PATH = path.join(process.cwd(), 'backend/media/downloads');
const LOCAL_TEMP_PATH = path.join(process.cwd(), 'backend/temp');
const LOCAL_ASSETS_PATH = path.join(process.cwd(), 'backend/uploads/assets');

// Ensure directories exist
const ensureDirectories = () => {
  [LOCAL_DOWNLOADS_PATH, LOCAL_TEMP_PATH, LOCAL_ASSETS_PATH].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✅ Created directory: ${dir}`);
    }
  });
};

// Drive folder mapping for migration
const DRIVE_FOLDERS_TO_MIGRATE = {
  'Affiliate AI/Images/Uploaded/App/Character': { category: 'character-image', localSubdir: 'character', displayName: 'Character' },
  'Affiliate AI/Images/Uploaded/App/Product': { category: 'product-image', localSubdir: 'product', displayName: 'Product' },
  'Affiliate AI/Images/Completed': { category: 'generated-image', localSubdir: 'generated', displayName: 'Generated' },
  'Affiliate AI/Images/Downloaded': { category: 'reference-image', localSubdir: 'downloaded', displayName: 'Downloaded' },
};

let driveService = null;
let folderIds = {};

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

async function authenticateDrive() {
  try {
    console.log('\n🔐 Authenticating with Google Drive...');
    
    const tokenPath = path.join(__dirname, '../config/drive-token.json');
    const credentialsPath = path.join(__dirname, '../config/client_secret_445819590351-s0oqsu0bu9t7lsmttfd16q8rohqlohkc.apps.googleusercontent.com.json');
    
    const clientId = process.env.OAUTH_CLIENT_ID;
    const clientSecret = process.env.OAUTH_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      console.error('❌ Missing OAUTH_CLIENT_ID or OAUTH_CLIENT_SECRET in .env');
      process.exit(1);
    }

    const auth = new google.auth.OAuth2(
      clientId,
      clientSecret,
      'http://localhost:5000/api/drive/auth-callback'
    );

    if (fs.existsSync(tokenPath)) {
      const token = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
      auth.setCredentials(token);
    } else {
      console.error('❌ No Drive token found. Run: npm run auth:drive');
      process.exit(1);
    }

    driveService = google.drive({ version: 'v3', auth });
    console.log('✅ Google Drive authenticated');
    return auth;
  } catch (err) {
    console.error('❌ Drive authentication failed:', err.message);
    process.exit(1);
  }
}

async function loadFolderStructure() {
  try {
    const configPath = path.join(__dirname, '../config/drive-folder-structure.json');
    if (!fs.existsSync(configPath)) {
      console.error('❌ drive-folder-structure.json not found');
      process.exit(1);
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    folderIds = config.folders || {};
    console.log('✅ Loaded folder structure from config');
  } catch (err) {
    console.error('❌ Failed to load folder structure:', err.message);
    process.exit(1);
  }
}

async function listFilesInFolder(folderId, folderName) {
  try {
    console.log(`\n📂 Scanning folder: ${folderName}`);
    
    const response = await driveService.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      spaces: 'drive',
      fields: 'files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink)',
      pageSize: 1000,
    });

    const files = response.data.files || [];
    console.log(`   Found ${files.length} files`);
    return files;
  } catch (err) {
    console.error(`❌ Failed to list files in ${folderName}:`, err.message);
    return [];
  }
}

async function downloadFile(fileId, fileName, destinationPath) {
  try {
    return new Promise((resolve, reject) => {
      const dest = fs.createWriteStream(destinationPath);
      
      driveService.files.get(
        { fileId, alt: 'media' },
        { responseType: 'stream' },
        (err, response) => {
          if (err) {
            reject(err);
            return;
          }

          response.data
            .on('end', () => {
              console.log(`     ✅ Downloaded: ${fileName}`);
              resolve(destinationPath);
            })
            .on('error', reject)
            .pipe(dest);
        }
      );
    });
  } catch (err) {
    console.error(`   ❌ Download failed for ${fileName}:`, err.message);
    throw err;
  }
}

async function createAssetRecord(file, folderPath, localPath, assetCategory) {
  try {
    // Generate unique asset ID
    const assetId = `asset_${crypto.randomBytes(8).toString('hex')}`;
    
    // Check if already exists
    let asset = await Asset.findOne({ storage: { googleDriveId: file.id } });
    
    if (asset) {
      console.log(`   ℹ️  Asset already exists, updating...`);
    } else {
      asset = new Asset({
        assetId,
        assetType: 'image',
        assetCategory,
        filename: file.name,
        mimeType: file.mimeType,
        fileSize: file.size || 0,
        userId: 'system',
        sessionId: 'migration',
      });
    }

    // Update storage information
    asset.storage = {
      location: 'google-drive',
      googleDriveId: file.id,
      googleDrivePath: folderPath,
      url: file.webViewLink,
    };

    // Update hybrid storage
    asset.localStorage = {
      location: 'local',
      path: localPath,
      fileSize: file.size || 0,
      savedAt: new Date(),
      verified: fs.existsSync(localPath),
    };

    asset.cloudStorage = {
      googleDriveId: file.id,
      status: 'synced',
      syncedAt: new Date(file.modifiedTime || file.createdTime),
      attempted: 1,
      webViewLink: file.webViewLink,
    };

    asset.syncStatus = 'synced';
    asset.retention = {
      deleteAfterDays: 30,
      deleteLocalAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      keepCloudCopy: true,
    };

    await asset.save();
    console.log(`   💾 Asset record saved: ${assetId}`);
    return asset;
  } catch (err) {
    console.error(`   ❌ Failed to create asset record:`, err.message);
    throw err;
  }
}

async function migrateFolder(folderPath, folderName, config) {
  try {
    const folderId = folderIds[folderPath];
    
    if (!folderId) {
      console.warn(`⚠️  Folder path not found in config: ${folderPath}`);
      return { success: 0, failed: 0, skipped: 0 };
    }

    const files = await listFilesInFolder(folderId, folderName);
    
    if (files.length === 0) {
      console.log(`   ℹ️  No files to migrate`);
      return { success: 0, failed: 0, skipped: 0 };
    }

    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (const file of files) {
      // Filter only images
      if (!file.mimeType.startsWith('image/')) {
        console.log(`   ⏭️  Skipped (not image): ${file.name}`);
        skippedCount++;
        continue;
      }

      try {
        // Create local directory for category
        const categoryDir = path.join(LOCAL_DOWNLOADS_PATH, config.localSubdir || 'other');
        if (!fs.existsSync(categoryDir)) {
          fs.mkdirSync(categoryDir, { recursive: true });
        }

        // Generate unique local filename
        const ext = path.extname(file.name);
        const nameWithoutExt = path.basename(file.name, ext);
        const localFileName = `${nameWithoutExt}_${Date.now()}${ext}`;
        const localPath = path.join(categoryDir, localFileName);

        // Download and create record
        await downloadFile(file.id, file.name, localPath);
        await createAssetRecord(file, folderPath, localPath, config.category);

        successCount++;
      } catch (err) {
        console.error(`   ❌ Failed to process ${file.name}:`, err.message);
        failedCount++;
      }
    }

    return { success: successCount, failed: failedCount, skipped: skippedCount };
  } catch (err) {
    console.error(`❌ Folder migration failed for ${folderName}:`, err.message);
    return { success: 0, failed: 0, skipped: 0 };
  }
}

async function runMigration() {
  console.log('\n' + '═'.repeat(80));
  console.log('🔄 DRIVE IMAGES → DATABASE & LOCAL STORAGE MIGRATION');
  console.log('═'.repeat(80));

  try {
    // Setup
    ensureDirectories();
    await loadFolderStructure();

    // Migration summary
    let totalSuccess = 0;
    let totalFailed = 0;
    let totalSkipped = 0;

    // Migrate each folder
    for (const [folderPath, config] of Object.entries(DRIVE_FOLDERS_TO_MIGRATE)) {
      const stats = await migrateFolder(folderPath, config.displayName || folderPath, config);
      totalSuccess += stats.success;
      totalFailed += stats.failed;
      totalSkipped += stats.skipped;
    }

    // Print summary
    console.log('\n' + '═'.repeat(80));
    console.log('📊 MIGRATION SUMMARY');
    console.log('─'.repeat(80));
    console.log(`  ✅ Successfully migrated:  ${totalSuccess}`);
    console.log(`  ❌ Failed:                  ${totalFailed}`);
    console.log(`  ⏭️  Skipped:                 ${totalSkipped}`);
    console.log(`  📊 Total:                   ${totalSuccess + totalFailed + totalSkipped}`);
    console.log('═'.repeat(80));

    if (totalSuccess > 0) {
      console.log('\n✨ Migration completed successfully!');
      console.log(`\n💡 Images now synced across:`);
      console.log(`   📂 Local: ${LOCAL_DOWNLOADS_PATH}`);
      console.log(`   ☁️  Drive: Affiliate AI/Images (various folders)`);
      console.log(`   💾 DB: Asset records with metadata`);
      console.log(`\n📝 Next steps:`);
      console.log(`   1. Verify images in Gallery Picker`);
      console.log(`   2. Check File Explorer for local copies`);
      console.log(`   3. Run: npm run test:assets`);
    }
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
}

async function main() {
  try {
    await connectDB();
    await authenticateDrive();
    await runMigration();
  } catch (err) {
    console.error('Fatal error:', err);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed\n');
  }
}

main();
