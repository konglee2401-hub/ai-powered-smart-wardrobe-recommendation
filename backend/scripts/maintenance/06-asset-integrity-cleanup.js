#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

import Asset from '../../models/Asset.js';
import PromptOption from '../../models/PromptOption.js';
import GeneratedImage from '../../models/GeneratedImage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function detectPaths() {
  const cwd = process.cwd();
  const isBackendRoot = fs.existsSync(path.join(cwd, 'models')) && fs.existsSync(path.join(cwd, 'routes'));
  const backendRoot = isBackendRoot ? cwd : path.join(cwd, 'backend');
  const projectRoot = path.dirname(backendRoot);

  return { cwd, backendRoot, projectRoot };
}

const { backendRoot, projectRoot } = detectPaths();
dotenv.config({ path: path.join(backendRoot, '.env') });

const args = process.argv.slice(2);
const hasArg = (arg) => args.includes(arg);

const dryRun = hasArg('--dry-run');
const fixBrokenAssets = hasArg('--fix-broken-assets');
const removeOrphans = !dryRun && !hasArg('--no-delete-orphans');

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tif', '.tiff']);

const LOCAL_SCAN_DIRS = [
  path.join(projectRoot, 'uploads'),
  path.join(projectRoot, 'generated-images'),
  path.join(backendRoot, 'generated-images'),
  path.join(projectRoot, 'temp', 'google-flow-downloads'),
  path.join(projectRoot, 'temp', 'image-gen-results'),
  path.join(projectRoot, 'temp', 'scene-locks'),
  path.join(backendRoot, 'temp', 'google-flow-downloads'),
  path.join(backendRoot, 'temp', 'image-gen-results'),
  path.join(backendRoot, 'temp', 'scene-locks')
];

const GENERATED_IMAGE_DIR_CANDIDATES = [
  path.join(projectRoot, 'temp', 'google-flow-downloads'),
  path.join(projectRoot, 'temp', 'image-gen-results'),
  path.join(projectRoot, 'temp'),
  path.join(projectRoot, 'generated-images'),
  path.join(backendRoot, 'temp', 'google-flow-downloads'),
  path.join(backendRoot, 'temp', 'image-gen-results'),
  path.join(backendRoot, 'temp'),
  path.join(backendRoot, 'generated-images')
];

function normalizePath(p) {
  return path.resolve(p).replace(/\\/g, '/').toLowerCase();
}

function decodeSafe(value = '') {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function isImageFile(filePath) {
  return IMAGE_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function isRemoteHttpUrl(value = '') {
  return /^https?:\/\//i.test(value);
}

function parseUrlPath(rawValue = '') {
  if (!isRemoteHttpUrl(rawValue)) return null;

  try {
    const parsed = new URL(rawValue);
    if (!parsed.hostname || !['localhost', '127.0.0.1'].includes(parsed.hostname)) {
      return null;
    }
    return parsed.pathname || null;
  } catch {
    return null;
  }
}

function resolveGeneratedImageApiPath(rawValue = '') {
  const marker = '/api/v1/browser-automation/generated-image/';
  if (!rawValue.includes(marker)) return [];

  const filename = decodeSafe(rawValue.split(marker)[1] || '').split('?')[0].trim();
  if (!filename || filename.includes('/') || filename.includes('\\')) return [];

  return GENERATED_IMAGE_DIR_CANDIDATES.map((dir) => path.join(dir, filename));
}

function toAbsoluteCandidates(rawValue) {
  if (!rawValue || typeof rawValue !== 'string') return [];

  const value = decodeSafe(rawValue.trim());
  if (!value) return [];

  const fromGeneratedApi = resolveGeneratedImageApiPath(value);
  if (fromGeneratedApi.length > 0) return fromGeneratedApi;

  const localUrlPath = parseUrlPath(value);
  const baseValue = localUrlPath || value;

  if (path.isAbsolute(baseValue)) {
    return [baseValue];
  }

  if (baseValue.startsWith('/uploads/')) {
    return [path.join(projectRoot, baseValue.slice(1))];
  }

  if (baseValue.startsWith('/temp/')) {
    return [path.join(projectRoot, baseValue.slice(1)), path.join(backendRoot, baseValue.slice(1))];
  }

  if (baseValue.startsWith('/generated-images/')) {
    return [path.join(projectRoot, baseValue.slice(1)), path.join(backendRoot, baseValue.slice(1))];
  }

  if (baseValue.startsWith('/')) {
    return [path.join(projectRoot, baseValue.slice(1)), path.join(backendRoot, baseValue.slice(1))];
  }

  return [
    path.join(projectRoot, baseValue),
    path.join(backendRoot, baseValue)
  ];
}

function findExistingPath(rawValue) {
  const candidates = toAbsoluteCandidates(rawValue);
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function collectFilesRecursively(rootDir) {
  const files = [];
  if (!fs.existsSync(rootDir)) return files;

  const walk = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && isImageFile(fullPath)) {
        files.push(fullPath);
      }
    }
  };

  walk(rootDir);
  return files;
}

async function collectSceneLockReferences(report) {
  const scenes = await PromptOption.find({ category: 'scene', isActive: true })
    .select('value label sceneLockedImageUrl sceneLockedImageUrls sceneLockSamples sceneLockedImageHistory previewImage')
    .lean();

  const referenced = new Set();

  for (const scene of scenes) {
    const urls = [];
    if (scene.sceneLockedImageUrl) urls.push(scene.sceneLockedImageUrl);

    if (scene.sceneLockedImageUrls && typeof scene.sceneLockedImageUrls === 'object') {
      for (const key of Object.keys(scene.sceneLockedImageUrls)) {
        if (scene.sceneLockedImageUrls[key]) {
          urls.push(scene.sceneLockedImageUrls[key]);
        }
      }
    }

    for (const sample of (scene.sceneLockSamples || [])) {
      if (sample?.url) urls.push(sample.url);
    }

    for (const item of (scene.sceneLockedImageHistory || [])) {
      if (item?.url) urls.push(item.url);
    }

    if (scene.previewImage) urls.push(scene.previewImage);

    for (const url of urls) {
      const existing = findExistingPath(url);
      if (existing) {
        referenced.add(normalizePath(existing));
      } else {
        report.sceneLockBroken.push({
          scene: scene.value,
          label: scene.label,
          url
        });
      }
    }
  }

  return referenced;
}

function collectAssetLocalRefs(asset) {
  const refs = [];

  if (asset.localStorage?.path) refs.push(asset.localStorage.path);
  if (asset.storage?.localPath) refs.push(asset.storage.localPath);

  if (asset.storage?.url && !isRemoteHttpUrl(asset.storage.url)) {
    refs.push(asset.storage.url);
  }

  return refs;
}

async function collectAssetReferences(report) {
  const assets = await Asset.find({
    status: 'active',
    assetType: 'image'
  }).select('assetId filename assetCategory localStorage storage cloudStorage').lean();

  const referenced = new Set();

  for (const asset of assets) {
    const refs = collectAssetLocalRefs(asset);
    const hasCloud = !!(asset.cloudStorage?.googleDriveId || asset.storage?.googleDriveId);
    let localFound = false;

    for (const ref of refs) {
      const existing = findExistingPath(ref);
      if (existing) {
        localFound = true;
        referenced.add(normalizePath(existing));
      }
    }

    if (!localFound && refs.length > 0) {
      report.assetsMissingLocal.push({
        assetId: asset.assetId,
        filename: asset.filename,
        category: asset.assetCategory,
        hasCloudFallback: hasCloud,
        refs
      });
    }

    if (!localFound && refs.length === 0 && !hasCloud) {
      report.assetsBrokenNoStorage.push({
        assetId: asset.assetId,
        filename: asset.filename,
        category: asset.assetCategory
      });
    }
  }

  return referenced;
}

async function collectGeneratedImageReferences(report) {
  const generated = await GeneratedImage.find({ isDeleted: false })
    .select('imageUrl characterImageUrl productImageUrl')
    .lean();

  const referenced = new Set();

  for (const item of generated) {
    const refs = [item.imageUrl, item.characterImageUrl, item.productImageUrl].filter(Boolean);

    for (const ref of refs) {
      const existing = findExistingPath(ref);
      if (existing) {
        referenced.add(normalizePath(existing));
      } else if (!isRemoteHttpUrl(ref)) {
        report.generatedImagesMissingLocal.push({ ref });
      }
    }
  }

  return referenced;
}

async function maybeFixBrokenAssets(report) {
  if (!fixBrokenAssets) return 0;

  const idsToSoftDelete = report.assetsBrokenNoStorage.map((a) => a.assetId);
  if (idsToSoftDelete.length === 0) return 0;

  const result = await Asset.updateMany(
    { assetId: { $in: idsToSoftDelete }, status: 'active' },
    {
      $set: {
        status: 'deleted',
        notes: '[auto-cleanup] Soft-deleted due to missing all local/cloud storage references'
      }
    }
  );

  return result.modifiedCount || 0;
}

function uniqueExistingDirs() {
  return [...new Set(LOCAL_SCAN_DIRS.filter((dir) => fs.existsSync(dir)).map((d) => path.resolve(d)))];
}

async function run() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-wardrobe';

  const report = {
    sceneLockBroken: [],
    assetsMissingLocal: [],
    assetsBrokenNoStorage: [],
    generatedImagesMissingLocal: [],
    orphanFiles: [],
    deletedOrphans: [],
    failedDeletes: []
  };

  console.log('\n' + '═'.repeat(90));
  console.log('🩺 ASSET INTEGRITY + ORPHAN CLEANUP JOB');
  console.log('═'.repeat(90));
  console.log(`📁 Project root : ${projectRoot}`);
  console.log(`📁 Backend root : ${backendRoot}`);
  console.log(`⚙️  dryRun       : ${dryRun}`);
  console.log(`⚙️  removeOrphans: ${removeOrphans}`);
  console.log(`⚙️  fixBrokenDB  : ${fixBrokenAssets}`);

  await mongoose.connect(mongoUri);
  console.log(`✅ MongoDB connected`);

  try {
    const [sceneRefs, assetRefs, generatedRefs] = await Promise.all([
      collectSceneLockReferences(report),
      collectAssetReferences(report),
      collectGeneratedImageReferences(report)
    ]);

    const allReferenced = new Set([...sceneRefs, ...assetRefs, ...generatedRefs]);

    const scanDirs = uniqueExistingDirs();
    const scannedFiles = scanDirs.flatMap((dir) => collectFilesRecursively(dir));

    for (const file of scannedFiles) {
      const normalized = normalizePath(file);
      if (!allReferenced.has(normalized)) {
        report.orphanFiles.push(file);
      }
    }

    if (removeOrphans) {
      for (const file of report.orphanFiles) {
        try {
          fs.unlinkSync(file);
          report.deletedOrphans.push(file);
        } catch (error) {
          report.failedDeletes.push({ file, error: error.message });
        }
      }
    }

    const fixedDbCount = await maybeFixBrokenAssets(report);

    console.log('\n' + '─'.repeat(90));
    console.log('📊 JOB SUMMARY');
    console.log('─'.repeat(90));
    console.log(`🔎 Scene-lock broken refs         : ${report.sceneLockBroken.length}`);
    console.log(`🔎 Asset missing local (recover)  : ${report.assetsMissingLocal.length}`);
    console.log(`🔎 Asset broken no storage        : ${report.assetsBrokenNoStorage.length}`);
    console.log(`🔎 GeneratedImage missing local   : ${report.generatedImagesMissingLocal.length}`);
    console.log(`🧹 Orphan local image files       : ${report.orphanFiles.length}`);
    console.log(`🗑️  Orphans deleted               : ${report.deletedOrphans.length}`);
    console.log(`❌ Delete failures                : ${report.failedDeletes.length}`);
    console.log(`🩹 Broken DB assets soft-deleted  : ${fixedDbCount}`);

    const printPreview = (title, list, formatter, limit = 10) => {
      if (!list.length) return;
      console.log(`\n${title}`);
      list.slice(0, limit).forEach((item, i) => console.log(`  ${i + 1}. ${formatter(item)}`));
      if (list.length > limit) {
        console.log(`  ... and ${list.length - limit} more`);
      }
    };

    printPreview('⚠️ Scene-lock broken (sample):', report.sceneLockBroken, (i) => `${i.scene} -> ${i.url}`);
    printPreview('⚠️ Assets missing local (sample):', report.assetsMissingLocal, (i) => `${i.assetId} (${i.filename})`);
    printPreview('⚠️ Assets broken no storage (sample):', report.assetsBrokenNoStorage, (i) => `${i.assetId} (${i.filename})`);
    printPreview('⚠️ Orphan files (sample):', report.orphanFiles, (i) => i);

    console.log('\n✅ Job completed');
    if (!removeOrphans) {
      console.log('ℹ️ Running in dry mode (no orphan deletion). Use without --dry-run to auto delete orphans.');
    }
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB disconnected');
  }
}

run().catch((error) => {
  console.error('❌ Job failed:', error.message);
  process.exit(1);
});
