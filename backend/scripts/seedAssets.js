/**
 * Asset Database Seeding Script
 * Populates the Asset collection with initial data and scans existing files
 * Run: node scripts/seedAssets.js
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Asset from '../models/Asset.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend folder
dotenv.config({ path: path.join(__dirname, '../.env') });

// Simple ID generator
const generateAssetId = () => {
  return `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-wardrobe';

// Directory to scan for existing files
const DIRECTORIES_TO_SCAN = [
  { path: './backend/temp/google-flow-downloads', category: 'generated-image', type: 'image' },
  { path: './backend/temp/image-gen-results', category: 'generated-image', type: 'image' },
  { path: './backend/test-images', category: 'reference-image', type: 'image' },
  { path: './backend/test-videos', category: 'source-video', type: 'video' }
];

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function scanAndSeedDirectory(dirConfig) {
  const { path: dirPath, category, type } = dirConfig;
  const fullPath = path.join(process.cwd(), dirPath);

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  Directory not found: ${dirPath}`);
    return;
  }

  const files = fs.readdirSync(fullPath);
  console.log(`\n📁 Scanning ${dirPath} (${files.length} files found)`);

  for (const file of files) {
    const filePath = path.join(fullPath, file);
    const stats = fs.statSync(filePath);

    if (!stats.isFile()) continue;

    // Check if asset already exists
    const existingAsset = await Asset.findOne({ filename: file });
    if (existingAsset) {
      console.log(`  ⊘ Skipping (already exists): ${file}`);
      continue;
    }

    // Get file size and mime type
    const fileSize = stats.size;
    const ext = path.extname(file).toLowerCase();
    let mimeType = 'application/octet-stream';

    if (type === 'image') {
      const mimeMap = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
      };
      mimeType = mimeMap[ext] || 'image/octet-stream';
    } else if (type === 'video') {
      const mimeMap = {
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.mov': 'video/quicktime',
        '.avi': 'video/x-msvideo',
      };
      mimeType = mimeMap[ext] || 'video/octet-stream';
    }

    // Create asset record
    const asset = new Asset({
      assetId: generateAssetId(),
      filename: file,
      mimeType,
      fileSize,
      assetType: type,
      assetCategory: category,
      userId: 'system',
      storage: {
        location: 'local',
        localPath: `${dirPath}/${file}`.replace(/^\.\//,  ''),
        url: `http://localhost:5000${dirPath.replace(/^\./,  '')}/${file}`
      },
      metadata: {
        format: ext.substring(1)
      },
      tags: ['seeded', category, type],
      status: 'active'
    });

    await asset.save();
    console.log(`  ✓ Added: ${file} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);
  }
}

async function seedInitialAssets() {
  console.log('\n📊 Creating initial asset records...\n');

  // Create some sample asset records for different types
  const sampleAssets = [
    {
      assetId: generateAssetId(),
      filename: 'character-template-1.jpg',
      mimeType: 'image/jpeg',
      fileSize: 250000,
      assetType: 'image',
      assetCategory: 'character-image',
      userId: 'demo-user',
      storage: {
        location: 'local',
        localPath: 'backend/test-images/anh-nhan-vat.jpeg',
        url: 'http://localhost:5000/temp/character-template-1.jpg'
      },
      metadata: {
        format: 'jpg'
      },
      tags: ['character', 'template', 'demo'],
      status: 'active'
    },
    {
      assetId: generateAssetId(),
      filename: 'product-template-1.png',
      mimeType: 'image/png',
      fileSize: 500000,
      assetType: 'image',
      assetCategory: 'product-image',
      userId: 'demo-user',
      storage: {
        location: 'local',
        localPath: 'backend/test-images/anh-san-pham.png',
        url: 'http://localhost:5000/temp/product-template-1.png'
      },
      metadata: {
        format: 'png'
      },
      tags: ['product', 'template', 'demo'],
      status: 'active'
    }
  ];

  for (const sampleAsset of sampleAssets) {
    const existing = await Asset.findOne({ filename: sampleAsset.filename });
    if (!existing) {
      const asset = new Asset(sampleAsset);
      await asset.save();
      console.log(`✓ Created sample asset: ${sampleAsset.filename}`);
    } else {
      console.log(`⊘ Sample asset already exists: ${sampleAsset.filename}`);
    }
  }
}

async function main() {
  await connectDB();

  // Xoá sạch toàn bộ asset cũ
  const count = await Asset.deleteMany({});
  console.log(`🗑️  Cleared ${count.deletedCount} existing asset records`);

  // Seed initial templates
  await seedInitialAssets();

  // Scan existing local directories
  console.log('\n📂 Scanning existing local files...');
  for (const dirConfig of DIRECTORIES_TO_SCAN) {
    await scanAndSeedDirectory(dirConfig);
  }

  // --- Google Drive sync ---
  // Load folder structure from config
  const driveConfigPath = path.join(__dirname, '../config/drive-folder-structure.json');
  let driveConfig = null;
  if (fs.existsSync(driveConfigPath)) {
    driveConfig = JSON.parse(fs.readFileSync(driveConfigPath, 'utf-8'));
  }
  if (driveConfig && driveConfig.folders) {
    console.log('\n☁️  Scanning Google Drive folders...');
    // Dynamically import driveService
    const { default: driveService } = await import('../services/googleDriveOAuth.js');
    await driveService.authenticate();
    for (const [folderPath, folderId] of Object.entries(driveConfig.folders)) {
      // Only scan folders under Affiliate AI root
      if (!folderPath.startsWith('Affiliate AI')) continue;
      // List all files in this folder
      let files = [];
      try {
        files = await driveService.listFiles(folderId, 1000);
      } catch (err) {
        console.warn(`⚠️  Could not list files for ${folderPath}: ${err.message}`);
        continue;
      }
      for (const file of files) {
        // Check if asset already exists (by Google Drive fileId)
        const existing = await Asset.findOne({ 'storage.googleDriveId': file.id });
        if (existing) {
          // Already seeded
          continue;
        }
        // Determine asset type/category by folder path or mimeType
        let assetType = 'image'; // default
        if (file.mimeType.startsWith('video/')) {
          assetType = 'video';
        } else if (file.mimeType.startsWith('audio/')) {
          assetType = 'audio';
        } else if (!file.mimeType.startsWith('image/')) {
          // Skip unsupported file types
          continue;
        }
        
        let assetCategory = 'reference-image';
        if (folderPath.toLowerCase().includes('generated')) assetCategory = 'generated-image';
        else if (folderPath.toLowerCase().includes('character')) assetCategory = 'character-image';
        else if (folderPath.toLowerCase().includes('product')) assetCategory = 'product-image';
        else if (folderPath.toLowerCase().includes('video')) assetCategory = 'source-video';

        const asset = new Asset({
          assetId: generateAssetId(),
          filename: file.name,
          mimeType: file.mimeType,
          fileSize: file.size || 0, // Ensure fileSize is always set
          assetType,
          assetCategory,
          userId: 'system',
          storage: {
            location: 'google-drive',
            googleDriveId: file.id,
            googleDrivePath: folderPath,
            url: file.webViewLink || driveService.getDownloadUrl(file.id)
          },
          metadata: {
            format: (file.name.split('.').pop() || '').toLowerCase()
          },
          tags: ['seeded', assetCategory, assetType, 'google-drive'],
          status: 'active'
        });
        await asset.save();
        console.log(`  ☁️  Added: ${file.name} (${file.mimeType}) in ${folderPath}`);
      }
    }
  } else {
    console.warn('⚠️  No Google Drive folder structure config found. Run detectDriveFolderStructure.js first.');
  }

  // Print statistics
  const stats = await Asset.aggregate([
    {
      $group: {
        _id: '$assetCategory',
        count: { $sum: 1 },
        totalSize: { $sum: '$fileSize' }
      }
    }
  ]);

  console.log('\n📈 Asset Statistics:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const totalAssets = await Asset.countDocuments();
  const totalSize = await Asset.aggregate([{ $group: { _id: null, total: { $sum: '$fileSize' } } }]);

  for (const stat of stats) {
    const sizeMB = (stat.totalSize / 1024 / 1024).toFixed(2);
    console.log(`  ${stat._id.padEnd(20)} | ${stat.count.toString().padEnd(5)} files | ${sizeMB} MB`);
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const totalMB = (totalSize[0]?.total || 0) / 1024 / 1024;
  console.log(`  TOTAL: ${totalAssets} assets | ${totalMB.toFixed(2)} MB\n`);

  console.log('✅ Asset seeding complete!\n');

  await mongoose.connection.close();
}

main().catch(error => {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
});
