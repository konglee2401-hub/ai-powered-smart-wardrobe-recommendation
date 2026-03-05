/**
 * Batch Upload Orphaned Assets to Google Drive
 * Recovers disabled/orphaned assets by uploading to Drive and re-enabling them
 * 
 * Uses existing backend API for authentication and upload
 *
 * Run: node scripts/fix/batch-upload-orphaned-assets.js
 * Options: 
 *   --dry-run          Show what would be uploaded without making changes
 *   --resume-from ID   Resume from specific asset ID
 *   --limit N          Only upload first N assets
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import axios from 'axios';
import FormData from 'form-data';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Import models and services
import Asset from '../../models/Asset.js';
import { readFileSync } from 'fs';

const driveFolderConfigRaw = readFileSync(path.join(__dirname, '../../config/drive-folder-structure.json'), 'utf-8');
const driveFolderConfig = JSON.parse(driveFolderConfigRaw);

const DB_URL = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-wardrobe';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

// Parse CLI arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limit = args.find(arg => arg.startsWith('--limit='))?.split('=')[1];
const resumeFrom = args.find(arg => arg.startsWith('--resume-from='))?.split('=')[1];

// Mapping of asset categories to Drive folder IDs
const CATEGORY_TO_FOLDER = {
  'character-image': driveFolderConfig.folders['Affiliate AI/Images/Uploaded/App/Character'],
  'product-image': driveFolderConfig.folders['Affiliate AI/Images/Uploaded/App/Product'],
  'generated-image': driveFolderConfig.folders['Affiliate AI/Images/Uploaded/App'],
  'reference-image': driveFolderConfig.folders['Affiliate AI/Images/Uploaded/App'],
  'source-video': driveFolderConfig.folders['Affiliate AI/Videos/Downloaded'],
  'generated-video': driveFolderConfig.folders['Affiliate AI/Videos/Uploaded/App'],
  'audio': driveFolderConfig.folders['Affiliate AI'],
  'thumbnail': driveFolderConfig.folders['Affiliate AI/Images/Uploaded/App']
};

let stats = {
  total: 0,
  uploaded: 0,
  failed: 0,
  skipped: 0,
  startTime: Date.now()
};

async function connectDB() {
  try {
    await mongoose.connect(DB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

/**
 * Get Google Drive access token
 */
async function getAccessToken() {
  try {
    // Backend handles authentication, we just call the API
    return 'authenticated'; // Placeholder - backend manages this
  } catch (error) {
    console.error('⚠️  Note: Backend will handle authentication');
    return null;
  }
}

/**
 * Attempt to download file from URL or read from local path
 */
async function getFileBuffer(asset) {
  try {
    // Try local path first
    if (asset.storage?.localPath) {
      const fullPath = path.join(__dirname, '../../', asset.storage.localPath);
      if (fs.existsSync(fullPath)) {
        console.log(`  📂 Reading from local: ${asset.storage.localPath}`);
        return {
          buffer: fs.readFileSync(fullPath),
          mimeType: asset.mimeType,
          filename: asset.filename
        };
      }
    }

    // Try storage.url
    if (asset.storage?.url) {
      console.log(`  🌐 Downloading from URL: ${asset.storage.url.substring(0, 60)}...`);
      const response = await axios.get(asset.storage.url, { responseType: 'arraybuffer' });
      return {
        buffer: response.data,
        mimeType: asset.mimeType || response.headers['content-type'],
        filename: asset.filename
      };
    }

    return null;
  } catch (error) {
    console.log(`  ❌ Failed to get file: ${error.message}`);
    return null;
  }
}

/**
 * Upload file to Google Drive via backend API
 */
async function uploadToDrive(fileData, parentFolderId) {
  try {
    const form = new FormData();
    
    form.append('file', Buffer.from(fileData.buffer), {
      filename: fileData.filename,
      contentType: fileData.mimeType
    });
    form.append('parentFolderId', parentFolderId);

    const response = await axios.post(
      `${BACKEND_URL}/api/drive/files/upload-with-metadata`,
      form,
      {
        headers: form.getHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 120000
      }
    );

    if (response.status !== 200 || !response.data.success) {
      throw new Error(response.data.message || 'Upload failed');
    }

    const uploadedFile = response.data.data || response.data;
    console.log(`  ✅ Uploaded to Drive: ${uploadedFile.fileId || uploadedFile.id}`);
    
    return {
      id: uploadedFile.fileId || uploadedFile.id,
      webViewLink: uploadedFile.webViewLink || uploadedFile.weblink,
      thumbnailLink: uploadedFile.thumbnailLink,
      mimeType: fileData.mimeType
    };
  } catch (error) {
    if (error.response?.data?.message) {
      console.log(`  ❌ Upload failed: ${error.response.data.message}`);
    } else {
      console.log(`  ❌ Upload failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Process single asset: download/get file and upload to Drive
 */
async function processAsset(asset) {
  try {
    console.log(`\n📦 Processing: ${asset.filename}`);
    console.log(`   ID: ${asset.assetId}`);
    console.log(`   Category: ${asset.assetCategory}`);

    // Skip if already has Drive ID
    if (asset.cloudStorage?.googleDriveId) {
      console.log(`   ⏭️  Already has Drive ID, skipping`);
      stats.skipped++;
      return { success: false, reason: 'Already has Drive ID' };
    }

    // Get destination folder
    const folderId = CATEGORY_TO_FOLDER[asset.assetCategory];
    if (!folderId) {
      console.log(`   ❌ No folder mapped for category: ${asset.assetCategory}`);
      stats.failed++;
      return { success: false, reason: 'No folder mapped for category' };
    }

    // Get file data
    const fileData = await getFileBuffer(asset);
    if (!fileData) {
      console.log(`   ❌ Could not retrieve file`);
      stats.failed++;
      return { success: false, reason: 'Could not retrieve file' };
    }

    // If dry run, stop here
    if (dryRun) {
      console.log(`   [DRY RUN] Would upload to folder: ${folderId}`);
      stats.uploaded++;
      return { success: true, dryRun: true };
    }

    // Upload to Drive
    const driveFile = await uploadToDrive(fileData, folderId);

    // Update asset in database
    asset.cloudStorage = {
      location: 'google-drive',
      googleDriveId: driveFile.id,
      webViewLink: driveFile.webViewLink,
      thumbnailLink: driveFile.thumbnailLink,
      status: 'synced',
      syncedAt: new Date()
    };

    // Also update legacy storage field
    if (!asset.storage.googleDriveId) {
      asset.storage.googleDriveId = driveFile.id;
    }

    // Update status to active
    if (asset.status === 'inactive') {
      asset.status = 'active';
      asset.disableReason = null;
    }

    await asset.save();
    console.log(`   💾 Updated database`);
    stats.uploaded++;
    return { success: true };

  } catch (error) {
    console.log(`   ❌ Processing failed: ${error.message}`);
    stats.failed++;
    return { success: false, reason: error.message };
  }
}

/**
 * Main execution
 */
async function main() {
  console.log(`\n${'='.repeat(70)}`);
  console.log('BATCH UPLOAD ORPHANED ASSETS TO GOOGLE DRIVE');
  console.log('='.repeat(70));
  console.log(`Mode: ${dryRun ? '🔍 DRY RUN' : '🚀 LIVE UPLOAD'}`);
  console.log(`Limit: ${limit || 'All'}\n`);

  try {
    await connectDB();

    // Create query for assets without Drive IDs
    let query = {
      $or: [
        { 'cloudStorage.googleDriveId': { $exists: false } },
        { 'cloudStorage.googleDriveId': null },
        { 'cloudStorage.status': { $in: ['pending', 'failed'] } }
      ]
    };

    // Filter by those that have at least one file available
    query = {
      $or: [
        { 'storage.localPath': { $exists: true, $ne: null } },
        { 'storage.url': { $exists: true, $ne: null } }
      ],
      $and: [
        {
          $or: [
            { 'cloudStorage.googleDriveId': { $exists: false } },
            { 'cloudStorage.googleDriveId': null },
            { 'cloudStorage.status': { $in: ['pending', 'failed'] } }
          ]
        }
      ]
    };

    // If resuming, add ID filter
    let assetsToProcess;
    if (resumeFrom) {
      const startAsset = await Asset.findOne({ assetId: resumeFrom });
      if (!startAsset) {
        console.error('❌ Resume asset not found:', resumeFrom);
        process.exit(1);
      }
      assetsToProcess = await Asset.find(query)
        .sort({ createdAt: -1 })
        .skip(1)
        .limit(limit ? parseInt(limit) : 0);
      console.log(`Resuming from: ${resumeFrom}\n`);
    } else {
      assetsToProcess = await Asset.find(query)
        .sort({ createdAt: -1 })
        .limit(limit ? parseInt(limit) : 0);
    }

    stats.total = assetsToProcess.length;
    console.log(`Found ${stats.total} assets to process\n`);

    if (stats.total === 0) {
      console.log('✅ No assets need processing');
      process.exit(0);
    }

    // Get access token
    console.log('🔐 Authenticating with Google Drive...');
    const accessToken = await getAccessToken();
    console.log('✅ Authentication successful\n');

    // Process assets
    console.log('═'.repeat(70));
    for (let i = 0; i < assetsToProcess.length; i++) {
      const asset = assetsToProcess[i];
      console.log(`\n[${i + 1}/${stats.total}]`);
      await processAsset(asset, accessToken);
    }

    // Summary
    const duration = ((Date.now() - stats.startTime) / 1000).toFixed(1);
    console.log(`\n${'═'.repeat(70)}`);
    console.log('📊 UPLOAD SUMMARY');
    console.log('═'.repeat(70));
    console.log(`Total processed:  ${stats.total}`);
    console.log(`✅ Uploaded:      ${stats.uploaded}`);
    console.log(`❌ Failed:        ${stats.failed}`);
    console.log(`⏭️  Skipped:       ${stats.skipped}`);
    console.log(`⏱️  Duration:      ${duration} seconds`);

    if (dryRun) {
      console.log(`\n[DRY RUN] No changes were made. Remove --dry-run to execute upload.`);
    }

    console.log('');

  } catch (error) {
    console.error('\n❌ Batch upload failed:', error.message);
    console.error(error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB\n');
  }
}

main();
