import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load backend .env
dotenv.config({ path: path.join(__dirname, '../../.env') });

import PromptOption from '../../models/PromptOption.js';
import Asset from '../../models/Asset.js';
import GoogleDriveService from '../../services/googleDriveService.js';

// ==================== CLI ARGS ====================
const args = process.argv.slice(2);
const getArg = (name, fallback = null) => {
  const idx = args.findIndex((a) => a === `--${name}`);
  if (idx === -1) return fallback;
  return args[idx + 1] ?? fallback;
};

const sceneValue = getArg('scene', 'studio');
const file16Raw = getArg('file16', null); // 16:9 landscape
const file9Raw = getArg('file9', null);   // 9:16 portrait

if (!file16Raw || !file9Raw) {
  console.error('❌ Missing required args. Usage:');
  console.error('   node backend/scripts/scene-lock/register-manual-scene-lock.js --scene studio --file16 path/to/landscape.jpg --file9 path/to/portrait.jpg');
  process.exit(1);
}

function resolvePath(p) {
  if (!p) return null;
  return path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
}

const file16Path = resolvePath(file16Raw);
const file9Path = resolvePath(file9Raw);

if (!fs.existsSync(file16Path)) {
  console.error(`❌ file16 not found: ${file16Path}`);
  process.exit(1);
}
if (!fs.existsSync(file9Path)) {
  console.error(`❌ file9 not found: ${file9Path}`);
  process.exit(1);
}

// ==================== HELPERS (copied from scene lock routes) ====================

const SCENE_LOCK_ASPECTS = ['16:9', '9:16'];

function resolveMimeTypeFromPath(filePath = '') {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  return 'image/png';
}

async function uploadSceneLockAsset({ localPath, sceneValue, aspectRatio, prompt, index }) {
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
      }
    } catch (driveError) {
      console.warn(`[scene-lock] Drive upload failed for ${filename}: ${driveError.message}`);
      assetPayload.cloudStorage = {
        location: 'google-drive',
        status: 'failed',
        attempted: 1
      };
      assetPayload.syncStatus = 'failed';
    }
  } else {
    console.log('   ℹ️  DRIVE_API_KEY not set, skipping Drive upload');
  }

  await Asset.findOneAndUpdate({ assetId }, assetPayload, {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true
  });

  // Use proxy URL style like other scene-lock scripts
  return {
    assetId,
    url: `/api/assets/proxy/${assetId}`
  };
}

function normalizeSceneLockedImageUrls(input = null) {
  const normalized = {
    '16:9': null,
    '9:16': null
  };

  if (input && typeof input === 'object') {
    SCENE_LOCK_ASPECTS.forEach((aspect) => {
      const value = input[aspect];
      normalized[aspect] = typeof value === 'string' ? (value.trim() || null) : null;
    });
  }

  return normalized;
}

function normalizeSceneLockedImageHistory(input = null) {
  const MAX_SCENE_LOCKED_HISTORY = 10;
  if (!Array.isArray(input)) return [];

  return input
    .map((item) => ({
      url: typeof item?.url === 'string' ? item.url.trim() : '',
      aspectRatio: SCENE_LOCK_ASPECTS.includes(item?.aspectRatio) ? item.aspectRatio : '9:16',
      createdAt: item?.createdAt ? new Date(item.createdAt) : new Date()
    }))
    .filter((item) => !!item.url)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, MAX_SCENE_LOCKED_HISTORY);
}

function upsertSceneLockedImageHistory(history = [], imageUrl, aspectRatio) {
  const normalized = normalizeSceneLockedImageHistory(history).filter((item) => item.url !== imageUrl);
  return normalizeSceneLockedImageHistory([
    {
      url: imageUrl,
      aspectRatio: SCENE_LOCK_ASPECTS.includes(aspectRatio) ? aspectRatio : '9:16',
      createdAt: new Date()
    },
    ...normalized
  ]);
}

// ==================== MAIN ====================

async function run() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/fashion-ai';
  await mongoose.connect(uri);
  console.log(`✅ Connected MongoDB: ${uri}`);

  const scene = await PromptOption.findOne({ category: 'scene', value: sceneValue });
  if (!scene) {
    console.error(`❌ Scene not found: ${sceneValue}`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const prompt = scene.sceneLockedPrompt
    || scene.sceneLockedPromptVi
    || scene.promptSuggestion
    || scene.promptSuggestionVi
    || scene.description
    || scene.label;

  console.log(`
🎯 Registering manual scene lock images for scene: ${sceneValue}`);
  console.log(`   16:9 -> ${file16Path}`);
  console.log(`   9:16 -> ${file9Path}`);

  const asset16 = await uploadSceneLockAsset({
    localPath: file16Path,
    sceneValue,
    aspectRatio: '16:9',
    prompt,
    index: 0
  });

  const asset9 = await uploadSceneLockAsset({
    localPath: file9Path,
    sceneValue,
    aspectRatio: '9:16',
    prompt,
    index: 1
  });

  const samples = (scene.sceneLockSamples || []).map((sample) => (
    typeof sample.toObject === 'function' ? sample.toObject() : sample
  ));

  const otherSamples = samples.filter((s) => !['16:9', '9:16'].includes(s.aspectRatio || '1:1'));

  const sample16 = {
    url: asset16.url,
    prompt,
    aspectRatio: '16:9',
    provider: 'manual-upload',
    createdAt: new Date(),
    isDefault: true
  };

  const sample9 = {
    url: asset9.url,
    prompt,
    aspectRatio: '9:16',
    provider: 'manual-upload',
    createdAt: new Date(),
    isDefault: true
  };

  scene.sceneLockSamples = [
    ...otherSamples,
    sample16,
    sample9
  ];

  const imageUrls = normalizeSceneLockedImageUrls(scene.sceneLockedImageUrls);
  imageUrls['16:9'] = sample16.url;
  imageUrls['9:16'] = sample9.url;
  scene.sceneLockedImageUrls = imageUrls;

  // Default primary lock is 9:16
  scene.sceneLockedImageUrl = sample9.url;
  scene.useSceneLock = true;

  let history = scene.sceneLockedImageHistory || [];
  history = upsertSceneLockedImageHistory(history, sample16.url, '16:9');
  history = upsertSceneLockedImageHistory(history, sample9.url, '9:16');
  scene.sceneLockedImageHistory = history;

  await scene.save();

  console.log('\n✅ Manual scene lock registration complete.');
  console.log(`   16:9 URL: ${sample16.url}`);
  console.log(`   9:16 URL: ${sample9.url}`);

  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error('❌ Manual scene lock registration failed:', error.message);
  await mongoose.disconnect();
  process.exit(1);
});
