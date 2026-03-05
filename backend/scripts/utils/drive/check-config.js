#!/usr/bin/env node
/**
 * Quick Google Drive Configuration Check
 * Verifies all folder mappings and upload configurations
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.join(__dirname, '../.env') });

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║                                                                ║');
console.log('║       🔍 GOOGLE DRIVE CONFIGURATION VERIFICATION              ║');
console.log('║                                                                ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

// Load folder structure
const folderStructurePath = path.join(__dirname, '../config/drive-folder-structure.json');
let folderStructure = null;

if (fs.existsSync(folderStructurePath)) {
  try {
    folderStructure = JSON.parse(fs.readFileSync(folderStructurePath, 'utf8'));
    console.log('✅ Folder structure loaded from config');
    console.log(`   Last updated: ${folderStructure.timestamp}\n`);
  } catch (error) {
    console.error('❌ Failed to load folder structure:', error.message);
    process.exit(1);
  }
} else {
  console.error('❌ Folder structure config not found');
  process.exit(1);
}

// Check folder mappings
console.log('═'.repeat(88));
console.log('📊 FOLDER MAPPINGS');
console.log('═'.repeat(88) + '\n');

const expectedFolders = [
  // Images
  { name: 'Images Base', key: 'Affiliate AI/Images', type: '📸 Images' },
  { name: 'Character Upload', key: 'Affiliate AI/Images/Uploaded/App/Character', type: '👔 Character' },
  { name: 'Product Upload', key: 'Affiliate AI/Images/Uploaded/App/Product', type: '👜 Product' },
  { name: 'Generated Images', key: 'Affiliate AI/Images/Completed', type: '🎨 Generated' },
  
  // Videos
  { name: 'Videos Base', key: 'Affiliate AI/Videos', type: '🎬 Videos' },
  { name: 'Source Videos', key: 'Affiliate AI/Videos/Uploaded/App', type: '📹 Source' },
  { name: 'Generated Videos', key: 'Affiliate AI/Videos/Completed', type: '🎞️ Generated' },
  { name: 'Video Queue', key: 'Affiliate AI/Videos/Queue', type: '⏳ Queue' },
  
  // Scraper Sources
  { name: 'TikTok Export', key: 'Affiliate AI/Videos/Downloaded/Tiktok', type: '🎭 TikTok' },
  { name: 'Reels Export', key: 'Affiliate AI/Videos/Downloaded/Reels', type: '📱 Reels' },
  { name: 'YouTube Export', key: 'Affiliate AI/Videos/Downloaded/Youtube', type: '🎥 YouTube' },
  { name: 'Playboard Export', key: 'Affiliate AI/Videos/Downloaded/Playboard', type: '🎬 Playboard' },
  { name: 'DailyHaha Export', key: 'Affiliate AI/Videos/Downloaded/Dailyhaha', type: '😄 DailyHaha' },
  { name: 'Douyin Export', key: 'Affiliate AI/Videos/Downloaded/Douyin', type: '🏮 Douyin' },
];

let correctCount = 0;
let missingCount = 0;

expectedFolders.forEach((folder, index) => {
  const folderId = folderStructure.folders[folder.key];
  if (folderId) {
    console.log(`${String(index + 1).padStart(2, ' ')}. ✅ ${folder.type.padEnd(18)} ${folder.name.padEnd(25)} ${folderId}`);
    correctCount++;
  } else {
    console.log(`${String(index + 1).padStart(2, ' ')}. ❌ ${folder.type.padEnd(18)} ${folder.name.padEnd(25)} NOT FOUND`);
    missingCount++;
  }
});

console.log('\n' + '═'.repeat(88));
console.log('📈 FOLDER CONFIGURATION SUMMARY');
console.log('═'.repeat(88) + '\n');

console.log(`✅ Correctly mapped: ${correctCount}/${expectedFolders.length}`);
console.log(`❌ Missing folders: ${missingCount}/${expectedFolders.length}`);

// Check authentication
console.log('\n' + '═'.repeat(88));
console.log('🔐 AUTHENTICATION STATUS');
console.log('═'.repeat(88) + '\n');

const clientIdConfigured = !!process.env.OAUTH_CLIENT_ID;
const clientSecretConfigured = !!process.env.OAUTH_CLIENT_SECRET;
const tokenPath = path.join(__dirname, '../config/drive-token.json');
let tokenValid = false;
let tokenExpires = '';

console.log(`${clientIdConfigured ? '✅' : '❌'} OAUTH_CLIENT_ID configured`);
console.log(`${clientSecretConfigured ? '✅' : '❌'} OAUTH_CLIENT_SECRET configured`);

if (fs.existsSync(tokenPath)) {
  console.log('✅ Token file exists');
  try {
    const token = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
    const expiryDate = new Date(token.expiry_date);
    tokenValid = expiryDate > new Date();
    if (expiryDate) {
      tokenExpires = expiryDate.toLocaleString();
      console.log(`   Expires: ${tokenExpires}`);
      console.log(`   Status: ${tokenValid ? '✅ VALID' : '❌ EXPIRED'}`);
    }
  } catch (e) {
    console.log('   ⚠️  Invalid token file');
  }
} else {
  console.log('❌ Token file not found');
}

// Check upload methods
console.log('\n' + '═'.repeat(88));
console.log('📤 UPLOAD METHODS CONFIGURATION');
console.log('═'.repeat(88) + '\n');

const uploadMethods = [
  { method: 'uploadCharacterImage()', folder: 'Character', status: correctCount >= 3 },
  { method: 'uploadProductImage()', folder: 'Product', status: correctCount >= 3 },
  { method: 'uploadGeneratedImage()', folder: 'Generated Images', status: correctCount >= 4 },
  { method: 'uploadSourceVideo()', folder: 'Source Videos', status: correctCount >= 6 },
  { method: 'uploadGeneratedVideo()', folder: 'Generated Videos', status: correctCount >= 7 }
];

uploadMethods.forEach((item, index) => {
  console.log(`${index + 1}. ${item.status ? '✅' : '❌'} ${item.method.padEnd(28)} → ${item.folder.padEnd(20)} [${item.status ? 'Ready' : 'Not Ready'}]`);
});

// Final status
console.log('\n' + '═'.repeat(88));
console.log('✅ FINAL STATUS');
console.log('═'.repeat(88) + '\n');

if (correctCount === expectedFolders.length && tokenValid && clientIdConfigured && clientSecretConfigured) {
  console.log('✅✅✅ ALL GOOGLE DRIVE CONFIGURATIONS ARE CORRECT');
  console.log('✅ Ready to upload images and videos!\n');
  process.exit(0);
} else {
  console.log('⚠️  Some configurations are missing or invalid');
  console.log('🔧 Please run: node scripts/setup/00-detect-drive-folder-structure.js\n');
  process.exit(1);
}
