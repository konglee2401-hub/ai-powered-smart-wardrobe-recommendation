/**
 * Hybrid Storage Strategy - Local + Google Drive Sync
 * 
 * PURPOSE:
 * - Store generated images locally for instant access & preview
 * - Auto-sync to Google Drive for backup
 * - Update database with BOTH storage locations
 * 
 * BENEFITS:
 * ✅ Gallery Picker displays images immediately (from local storage)
 * ✅ Google Drive serves as backup/archive
 * ✅ No virus scan confirmation issues
 * ✅ Continuous sync between local and cloud
 */

import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';

const drive = google.drive('v3');

// Configuration
const CONFIG = {
  // Local storage
  LOCAL_STORAGE_DIR: path.join(process.cwd(), 'generated-images'),
  
  // Google Drive
  DRIVE_FOLDER_ID: process.env.DRIVE_GENERATED_IMAGES_FOLDER_ID || 'YOUR_FOLDER_ID',
  DRIVE_BATCH_SIZE: 5, // Max concurrent uploads
  SYNC_INTERVAL: 300000, // 5 minutes = 300000ms
  
  // Database
  RETENTION_DAYS: 30 // Keep local copies for 30 days
};

// Ensure local storage directory exists
if (!fs.existsSync(CONFIG.LOCAL_STORAGE_DIR)) {
  fs.mkdirSync(CONFIG.LOCAL_STORAGE_DIR, { recursive: true });
  console.log(`✅ Created local storage directory: ${CONFIG.LOCAL_STORAGE_DIR}`);
}

/**
 * STEP 1: Save image locally immediately
 * This ensures instant preview in Gallery Picker
 */
export async function saveImageLocally(imageBuffer, filename) {
  try {
    const localPath = path.join(CONFIG.LOCAL_STORAGE_DIR, filename);
    
    // Save to disk
    fs.writeFileSync(localPath, imageBuffer);
    
    const stats = fs.statSync(localPath);
    console.log(`💾 Local save: ${filename} (${(stats.size / 1024).toFixed(2)}KB)`);
    
    return {
      success: true,
      localPath: localPath,
      relativePath: path.relative(process.cwd(), localPath),
      fileSize: stats.size
    };
  } catch (error) {
    console.error(`❌ Local save failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * STEP 2: Queue image for Google Drive upload (async background job)
 * This happens in background without blocking
 */
export async function queueForGDriveSync(imageData) {
  try {
    // Store in database with sync=pending status
    const asset = {
      ...imageData,
      syncStatus: 'pending', // pending → syncing → synced
      syncAttempts: 0,
      nextSyncTime: new Date(Date.now() + 5000), // Try in 5 seconds
      localStorage: {
        location: 'local',
        path: imageData.localPath
      },
      cloudStorage: {
        location: 'google-drive',
        status: 'pending' // Will be updated when upload completes
      }
    };
    
    console.log(`📋 Queued for Drive sync: ${imageData.filename}`);
    return asset;
  } catch (error) {
    console.error(`❌ Queue failed: ${error.message}`);
    throw error;
  }
}

/**
 * STEP 3: Background sync job (runs every 5 minutes)
 * Uploads pending images to Google Drive
 */
export async function startSyncService(auth) {
  console.log('🔄 Starting background sync service...');
  
  setInterval(async () => {
    try {
      // Get all pending sync items from DB
      // (This would use your Asset model)
      const pendingAssets = []; // = await Asset.find({ syncStatus: 'pending' })
      
      if (pendingAssets.length === 0) return;
      
      console.log(`🔁 Syncing ${pendingAssets.length} items to Google Drive...`);
      
      // Process in batches
      for (let i = 0; i < pendingAssets.length; i += CONFIG.DRIVE_BATCH_SIZE) {
        const batch = pendingAssets.slice(i, i + CONFIG.DRIVE_BATCH_SIZE);
        
        await Promise.all(
          batch.map(asset => uploadToGDrive(asset, auth))
        );
      }
    } catch (error) {
      console.error(`❌ Sync cycle error: ${error.message}`);
    }
  }, CONFIG.SYNC_INTERVAL);
}

/**
 * Upload single image to Google Drive
 * Called by background sync job
 */
async function uploadToGDrive(asset, auth) {
  try {
    if (!asset.localStorage?.path) {
      console.warn(`⚠️  No local path for: ${asset.filename}`);
      return;
    }
    
    if (!fs.existsSync(asset.localStorage.path)) {
      console.warn(`⚠️  Local file not found: ${asset.localStorage.path}`);
      return;
    }
    
    console.log(`☁️  Uploading to Drive: ${asset.filename}`);
    
    const fileMetadata = {
      name: asset.filename,
      parents: [CONFIG.DRIVE_FOLDER_ID],
      properties: {
        assetId: asset.assetId,
        generatedAt: new Date().toISOString()
      }
    };
    
    const fileStream = fs.createReadStream(asset.localStorage.path);
    
    const response = await drive.files.create(
      {
        auth: auth,
        resource: fileMetadata,
        media: {
          body: fileStream,
          mimeType: asset.mimeType
        },
        fields: 'id, webViewLink, thumbnailLink, imageMediaMetadata'
      },
      { timeout: 60000 }
    );
    
    const driveFileId = response.data.id;
    const thumbnailLink = response.data.thumbnailLink;
    
    console.log(`✅ Uploaded to Drive: ${asset.filename} (ID: ${driveFileId})`);
    
    // Update asset in DB with cloud storage info
    // Would do: await Asset.findByIdAndUpdate(asset._id, {
    //   cloudStorage: {
    //     location: 'google-drive',
    //     googleDriveId: driveFileId,
    //     thumbnailLink: thumbnailLink,
    //     status: 'synced'
    //   },
    //   syncStatus: 'synced',
    //   syncedAt: new Date()
    // })
    
    return {
      success: true,
      driveFileId,
      thumbnailLink
    };
    
  } catch (error) {
    console.error(`❌ GDrive upload failed for ${asset.filename}: ${error.message}`);
    
    // Retry logic would go here
    // Increment syncAttempts, set nextSyncTime for exponential backoff
    
    return { success: false, error: error.message };
  }
}

/**
 * STEP 4: Gallery Picker uses THIS logic
 * Priority: Local > Google Drive
 */
export function getImageUrlForGallery(asset) {
  // Prefer local storage (instant, no auth issues)
  if (asset.localStorage?.path && fs.existsSync(asset.localStorage.path)) {
    return {
      url: `/api/assets/proxy/${asset.assetId}?source=local`,
      source: 'local',
      priority: 1,
      reliability: 'high'
    };
  }
  
  // Fallback to Google Drive thumbnail
  if (asset.cloudStorage?.thumbnailLink) {
    return {
      url: asset.cloudStorage.thumbnailLink,
      source: 'google-drive',
      priority: 2,
      reliability: 'medium'
    };
  }
  
  // Last resort: Google Drive full download
  if (asset.cloudStorage?.googleDriveId) {
    return {
      url: `https://drive.google.com/uc?export=download&id=${asset.cloudStorage.googleDriveId}&confirm=t`,
      source: 'google-drive',
      priority: 3,
      reliability: 'low'
    };
  }
  
  // No preview available
  return { url: null, source: null, reliability: 'unavailable' };
}

/**
 * STEP 5: Cleanup old local files after sync
 * Keep local copies for 30 days, then archive to Drive only
 */
export async function cleanupOldLocalFiles() {
  console.log('🧹 Checking for files to archive...');
  
  const files = fs.readdirSync(CONFIG.LOCAL_STORAGE_DIR);
  const now = Date.now();
  const retentionMs = CONFIG.RETENTION_DAYS * 24 * 60 * 60 * 1000;
  
  for (const file of files) {
    const filepath = path.join(CONFIG.LOCAL_STORAGE_DIR, file);
    const stats = fs.statSync(filepath);
    const age = now - stats.birthtimeMs;
    
    if (age > retentionMs) {
      // Verify it's synced to Drive before deleting
      // const asset = await Asset.findOne({ filename: file, syncStatus: 'synced' })
      // if (asset) {
      //   fs.unlinkSync(filepath);
      //   console.log(`♻️  Archived to Drive: ${file}`);
      // }
    }
  }
}

/**
 * Usage in browserAutomationController.js:
 * 
 * (When generating an image)
 * 
 * // Step 1: Save locally (INSTANT)
 * const localResult = await saveImageLocally(imageBuffer, filename);
 * 
 * // Step 2: Queue for Drive sync (ASYNC - doesn't block)
 * const asset = await queueForGDriveSync({
 *   filename: filename,
 *   assetId: generateId(),
 *   localPath: localResult.localPath,
 *   mimeType: 'image/jpeg',
 *   fileSize: localResult.fileSize,
 *   // ... other metadata
 * });
 * 
 * // Step 3: Save to DB with BOTH locations
 * await Asset.create(asset);
 * 
 * // Gallery Picker immediately shows image from local storage!
 * // Background job silently syncs to Drive in 5 minutes
 */

export default {
  saveImageLocally,
  queueForGDriveSync,
  startSyncService,
  getImageUrlForGallery,
  cleanupOldLocalFiles,
  CONFIG
};
