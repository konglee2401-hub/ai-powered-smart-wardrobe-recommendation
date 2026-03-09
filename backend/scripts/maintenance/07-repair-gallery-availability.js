#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

import Asset from '../../models/Asset.js';

const backendRoot = process.cwd();
dotenv.config({ path: path.join(backendRoot, '.env') });

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

const DRIVE_ID_PATTERNS = [
  /\/file\/d\/([a-zA-Z0-9_-]+)/i,
  /[?&]id=([a-zA-Z0-9_-]+)/i,
  /\/d\/([a-zA-Z0-9_-]+)/i,
];

function decodeSafe(value = '') {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function toAbsoluteCandidates(rawValue) {
  if (!rawValue || typeof rawValue !== 'string') return [];

  const value = decodeSafe(rawValue.trim());
  if (!value) return [];

  if (path.isAbsolute(value)) return [value];

  const normalized = value.replace(/^\/+/, '');
  return [
    path.join(backendRoot, normalized),
    path.join(path.dirname(backendRoot), normalized),
  ];
}

function findExistingLocalPath(asset) {
  const refs = [
    asset.localStorage?.path,
    asset.storage?.localPath,
    asset.storage?.filePath,
  ].filter(Boolean);

  for (const ref of refs) {
    for (const candidate of toAbsoluteCandidates(ref)) {
      if (fs.existsSync(candidate)) return candidate;
    }
  }

  return null;
}

function buildRelativePath(absolutePath) {
  const relative = path.relative(backendRoot, absolutePath).replace(/\\/g, '/');
  return relative.startsWith('..') ? absolutePath : relative;
}

function extractDriveId(...values) {
  for (const value of values.filter(Boolean)) {
    if (typeof value !== 'string') continue;
    for (const pattern of DRIVE_ID_PATTERNS) {
      const match = value.match(pattern);
      if (match?.[1]) return match[1];
    }
  }
  return null;
}

function buildDriveLinks(fileId, existing = {}) {
  return {
    webViewLink:
      existing.webViewLink ||
      existing.url ||
      `https://drive.google.com/file/d/${fileId}/view?usp=drivesdk`,
    thumbnailLink:
      existing.thumbnailLink ||
      `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`,
  };
}

function sameValue(a, b) {
  return (a ?? null) === (b ?? null);
}

function isUsableRemoteUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value) && !/localhost|127\.0\.0\.1/i.test(value);
}

async function run() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-wardrobe';
  await mongoose.connect(mongoUri);

  const stats = {
    scanned: 0,
    reverifiedLocal: 0,
    promotedDrive: 0,
    deletedUnrecoverable: 0,
    unchanged: 0,
    errors: 0,
  };

  console.log('\n' + '='.repeat(90));
  console.log('REPAIR GALLERY AVAILABILITY');
  console.log('='.repeat(90));
  console.log(`dryRun: ${dryRun}`);

  try {
    const assets = await Asset.find({
      status: 'active',
      assetType: 'image',
    });

    stats.scanned = assets.length;

    for (const asset of assets) {
      try {
        const localPath = findExistingLocalPath(asset);
        const driveId =
          asset.cloudStorage?.googleDriveId ||
          asset.storage?.googleDriveId ||
          extractDriveId(
            asset.cloudStorage?.webViewLink,
            asset.cloudStorage?.thumbnailLink,
            asset.storage?.url
          );

        const updates = {};
        let changed = false;

        if (localPath) {
          const relativePath = buildRelativePath(localPath);
          const stat = fs.statSync(localPath);
          const needsLocalUpdate =
            !sameValue(asset.localStorage?.path, relativePath) ||
            asset.localStorage?.verified !== true ||
            !sameValue(asset.localStorage?.fileSize, stat.size) ||
            !sameValue(asset.storage?.localPath, relativePath);

          if (needsLocalUpdate) {
            updates.localStorage = {
              ...(asset.localStorage || {}),
              location: 'local',
              path: relativePath,
              fileSize: stat.size,
              verified: true,
            };
            updates.storage = {
              ...(asset.storage || {}),
              localPath: relativePath,
              url: asset.storage?.url || (asset.assetId ? `/api/assets/proxy/${asset.assetId}` : null),
            };
            changed = true;
            stats.reverifiedLocal += 1;
          }
        } else if (asset.localStorage?.verified !== false) {
          updates.localStorage = {
            ...(asset.localStorage || {}),
            verified: false,
          };
          changed = true;
        }

        if (driveId) {
          const links = buildDriveLinks(driveId, {
            webViewLink: asset.cloudStorage?.webViewLink,
            thumbnailLink: asset.cloudStorage?.thumbnailLink,
            url: asset.storage?.url,
          });

          const needsDriveUpdate =
            !sameValue(asset.cloudStorage?.googleDriveId, driveId) ||
            (!asset.cloudStorage?.webViewLink && !!links.webViewLink) ||
            (!asset.cloudStorage?.thumbnailLink && !!links.thumbnailLink) ||
            asset.cloudStorage?.status !== 'synced' ||
            !sameValue(asset.storage?.googleDriveId, driveId) ||
            (!localPath && asset.storage?.location !== 'google-drive') ||
            asset.syncStatus !== 'synced' ||
            asset.nextRetryTime != null;

          if (needsDriveUpdate) {
            const nextStorageUrl = isUsableRemoteUrl(asset.storage?.url)
              ? asset.storage.url
              : asset.assetId
                ? `/api/assets/proxy/${asset.assetId}`
                : links.webViewLink;

            updates.cloudStorage = {
              ...(asset.cloudStorage || {}),
              location: 'google-drive',
              googleDriveId: driveId,
              webViewLink: links.webViewLink,
              thumbnailLink: links.thumbnailLink,
              status: 'synced',
              syncedAt: asset.cloudStorage?.syncedAt || asset.createdAt || new Date(),
              attempted: Math.max(asset.cloudStorage?.attempted || 0, 1),
            };
            updates.storage = {
              ...(updates.storage || asset.storage || {}),
              location: localPath ? (asset.storage?.location || 'local') : 'google-drive',
              googleDriveId: driveId,
              url: nextStorageUrl,
            };
            updates.syncStatus = 'synced';
            updates.nextRetryTime = null;
            changed = true;
            stats.promotedDrive += 1;
          }
        } else if (!localPath) {
          updates.status = 'deleted';
          updates.syncStatus = 'failed';
          updates.nextRetryTime = null;
          updates.notes = [asset.notes, '[auto-cleanup] Removed from gallery because local file is missing and no Drive backup could be recovered']
            .filter(Boolean)
            .join(' | ');
          changed = true;
          stats.deletedUnrecoverable += 1;
        }

        if (!changed) {
          stats.unchanged += 1;
          continue;
        }

        if (!dryRun) {
          await Asset.updateOne({ _id: asset._id }, { $set: updates }, { runValidators: false });
        }
      } catch (error) {
        stats.errors += 1;
        console.error(`Failed to repair ${asset.assetId} (${asset.filename}): ${error.message}`);
      }
    }

    console.log(JSON.stringify(stats, null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error('Repair failed:', error.message);
  process.exit(1);
});
