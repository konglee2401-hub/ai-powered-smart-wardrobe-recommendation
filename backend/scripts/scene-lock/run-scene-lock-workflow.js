import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

import PromptOption from '../../models/PromptOption.js';
import Asset from '../../models/Asset.js';
import GoogleDriveService from '../../services/googleDriveService.js';
import {
  generateSceneLockPromptWithChatGPT,
  generateSceneLockImagesWithGoogleFlow
} from '../../services/sceneLockService.js';

const args = process.argv.slice(2);
const getArg = (name, fallback = null) => {
  const idx = args.findIndex((a) => a === `--${name}`);
  if (idx === -1) return fallback;
  return args[idx + 1] ?? fallback;
};

const sceneValue = getArg('scene', 'studio');
const mode = getArg('mode', 'create');
const imageCount = Number(getArg('count', '2'));
const aspectRatio = getArg('ratio', '1:1');
const styleDirection = getArg('styleDirection', '');
const improvementNotes = getArg('improvementNotes', '');

/**
 * Helper: Resolve MIME type from file path
 */
function resolveMimeTypeFromPath(filePath = '') {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  return 'image/png';
}

/**
 * Helper: Create asset and upload to Google Drive
 * (Mirrors the logic from promptOptions.js)
 */
async function uploadSceneLockAsset({
  localPath,
  sceneValue,
  aspectRatio,
  prompt,
  index
}) {
  const filename = path.basename(localPath);
  const fileSize = fs.existsSync(localPath) ? fs.statSync(localPath).size : 0;
  const mimeType = resolveMimeTypeFromPath(localPath);
  const aspectTag = (aspectRatio || '9:16').replace(':', 'x');
  const assetId = `scene_lock_${sceneValue}_${aspectTag}_${Date.now()}_${index + 1}`;

  const assetPayload = {
    assetId,
    userId: 'system',
    assetType: 'image',
    assetCategory: 'generated-image',
    filename,
    mimeType,
    fileSize,
    storage: {
      location: 'local',
      localPath
    },
    localStorage: {
      location: 'local',
      path: localPath,
      fileSize,
      savedAt: new Date(),
      verified: true
    },
    cloudStorage: {
      location: 'google-drive',
      status: 'pending'
    },
    syncStatus: 'pending',
    metadata: {
      source: 'scene-lock-manager',
      sceneValue,
      aspectRatio,
      prompt,
      index
    },
    tags: ['scene-lock', `scene:${sceneValue}`, `aspect:${aspectRatio || '9:16'}`],
    status: 'active'
  };

  // 📤 Try to upload to Google Drive
  if (process.env.DRIVE_API_KEY) {
    try {
      const drive = new GoogleDriveService();
      await drive.initialize();
      const targetFolder = drive.folderStructure?.outputs_processed_images 
        || drive.folderStructure?.media_images 
        || drive.folderStructure?.outputs;
      
      console.log(`   📤 Uploading to Drive: ${filename}`);
      const driveResult = await drive.uploadFile(localPath, filename, targetFolder, {
        sceneValue,
        aspectRatio,
        source: 'scene-lock-manager'
      });

      if (driveResult?.id) {
        assetPayload.storage = {
          location: 'google-drive',
          localPath,
          googleDriveId: driveResult.id,
          url: driveResult.webViewLink || null
        };
        assetPayload.cloudStorage = {
          location: 'google-drive',
          googleDriveId: driveResult.id,
          webViewLink: driveResult.webViewLink || null,
          thumbnailLink: driveResult.thumbnailLink || null,
          status: 'synced',
          syncedAt: new Date(),
          attempted: 1
        };
        assetPayload.syncStatus = 'synced';
        console.log(`   ✅ Drive upload successful: ${driveResult.id}`);
      }
    } catch (driveError) {
      console.warn(`   ⚠️  Drive upload failed: ${driveError.message}`);
      assetPayload.cloudStorage = {
        location: 'google-drive',
        status: 'failed',
        attempted: 1
      };
      assetPayload.syncStatus = 'failed';
    }
  } else {
    console.log(`   ℹ️  DRIVE_API_KEY not set, skipping Drive upload`);
  }

  // 💾 Save to database
  const savedAsset = await Asset.findOneAndUpdate({ assetId }, assetPayload, { 
    upsert: true, 
    new: true, 
    setDefaultsOnInsert: true 
  });

  return {
    assetId,
    url: savedAsset.assetId ? `/api/assets/proxy/${assetId}` : localPath
  };
}

async function run() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/fashion-ai';
  await mongoose.connect(uri);
  console.log('✅ Connected MongoDB');

  const scene = await PromptOption.findOne({ category: 'scene', value: sceneValue });
  if (!scene) {
    throw new Error(`Scene not found: ${sceneValue}`);
  }

  console.log(`\n🧠 Generating lock prompt for scene: ${sceneValue}`);
  const promptResult = await generateSceneLockPromptWithChatGPT(scene, {
    mode,
    styleDirection,
    improvementNotes
  });

  scene.sceneLockedPrompt = promptResult.parsed.sceneLockedPrompt;
  scene.promptSuggestion = promptResult.parsed.promptSuggestion || scene.promptSuggestion;
  scene.technicalDetails = {
    ...(scene.technicalDetails || {}),
    ...(promptResult.parsed.technicalDetails || {})
  };

  console.log(`✅ sceneLockedPrompt updated (${scene.sceneLockedPrompt.length} chars)`);

  console.log(`\n🎨 Generating ${imageCount} scene preview images via Google Flow...`);
  const generated = await generateSceneLockImagesWithGoogleFlow({
    prompt: scene.sceneLockedPrompt,
    imageCount: Math.max(1, Math.min(4, imageCount)),
    aspectRatio,
    sceneValue
  });

  // 💫 NEW: Create assets and upload to Google Drive
  console.log(`\n💾 Creating assets and uploading to Google Drive...`);
  scene.sceneLockSamples = await Promise.all(
    generated.map(async (item, idx) => {
      const sourcePath = item.path || item.url;
      let assetUrl = sourcePath;

      if (sourcePath && fs.existsSync(sourcePath)) {
        try {
          const asset = await uploadSceneLockAsset({
            localPath: sourcePath,
            sceneValue,
            aspectRatio,
            prompt: scene.sceneLockedPrompt,
            index: idx
          });
          assetUrl = asset.url;
          console.log(`   ✅ Asset created: ${asset.assetId}`);
        } catch (assetError) {
          console.warn(`   ❌ Asset creation failed for ${sourcePath}: ${assetError.message}`);
          // Fallback to original path
          assetUrl = sourcePath;
        }
      }

      return {
        url: assetUrl,
        prompt: scene.sceneLockedPrompt,
        provider: 'google-flow',
        createdAt: new Date(),
        isDefault: false
      };
    })
  );

  if (!scene.sceneLockedImageUrl && scene.sceneLockSamples[0]) {
    scene.sceneLockSamples[0].isDefault = true;
    scene.sceneLockedImageUrl = scene.sceneLockSamples[0].url;
  }

  await scene.save();

  console.log('\n✅ Workflow complete.');
  console.log(`Scene: ${scene.value}`);
  console.log(`Locked prompt: ${scene.sceneLockedPrompt}`);
  console.log('Generated samples:');
  scene.sceneLockSamples.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.url}`);
  });

  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error('❌ Scene lock workflow failed:', error.message);
  await mongoose.disconnect();
  process.exit(1);
});
