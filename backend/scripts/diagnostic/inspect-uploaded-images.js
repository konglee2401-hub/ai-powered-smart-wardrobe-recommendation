#!/usr/bin/env node
/**
 * DIAGNOSTIC SCRIPT: Inspect Uploaded Character & Product Images
 * 
 * PURPOSE:
 * 1. Find recently uploaded character/product images in MongoDB
 * 2. Inspect their metadata structure
 * 3. Identify missing fields causing gallery picker failure
 * 4. Compare with what gallery system expects
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Asset from '../../models/Asset.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-wardrobe';

async function inspectUploadedImages() {
  try {
    console.log('\n' + '═'.repeat(80));
    console.log('🔍 DIAGNOSTIC: Inspect Uploaded Character & Product Images');
    console.log('═'.repeat(80));

    // Connect to MongoDB
    console.log(`\n📦 Connecting to MongoDB: ${MONGODB_URI}...`);
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Query 1: Find recent character images
    console.log('\n' + '─'.repeat(80));
    console.log('📸 QUERY 1: Recently Uploaded Character Images');
    console.log('─'.repeat(80));

    const characterImages = await Asset.find({
      assetCategory: 'character-image',
      status: 'active'
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    console.log(`\n✅ Found ${characterImages.length} character images`);
    
    if (characterImages.length > 0) {
      console.log('\n📋 Sample Character Image Records (showing first 3):\n');
      characterImages.slice(0, 3).forEach((img, idx) => {
        console.log(`\n🖼️  CHARACTER IMAGE #${idx + 1}:`);
        console.log(`   Asset ID: ${img.assetId}`);
        console.log(`   Filename: ${img.filename}`);
        console.log(`   Asset Category: ${img.assetCategory}`);
        console.log(`   Asset Type: ${img.assetType}`);
        console.log(`   MIME Type: ${img.mimeType}`);
        console.log(`   File Size: ${img.fileSize} bytes`);
        console.log(`   Status: ${img.status}`);
        console.log(`   Sync Status: ${img.syncStatus}`);
        console.log(`   Created At: ${img.createdAt}`);
        
        console.log(`\n   📁 Storage Configuration:`);
        console.log(`      Location (legacy): ${img.storage?.location || 'NOT SET'}`);
        if (img.storage?.googleDriveId) {
          console.log(`      Google Drive ID: ${img.storage?.googleDriveId}`);
        }
        if (img.storage?.localPath) {
          console.log(`      Local Path: ${img.storage?.localPath}`);
        }
        console.log(`      URL: ${img.storage?.url || 'NOT SET'}`);
        
        if (img.localStorage) {
          console.log(`\n   💾 Local Storage:`);
          console.log(`      Location: ${img.localStorage.location}`);
          console.log(`      Path: ${img.localStorage.path}`);
          console.log(`      File Size: ${img.localStorage.fileSize}`);
          console.log(`      Verified: ${img.localStorage.verified}`);
        }
        
        if (img.cloudStorage) {
          console.log(`\n   ☁️  Cloud Storage:`);
          console.log(`      Location: ${img.cloudStorage.location}`);
          console.log(`      Google Drive ID: ${img.cloudStorage.googleDriveId || 'NOT SET'}`);
          console.log(`      Thumbnail Link: ${img.cloudStorage.thumbnailLink || 'NOT SET'}`);
          console.log(`      Web View Link: ${img.cloudStorage.webViewLink || 'NOT SET'}`);
          console.log(`      Status: ${img.cloudStorage.status}`);
          console.log(`      Synced At: ${img.cloudStorage.syncedAt || 'NOT SET'}`);
        }
        
        if (img.metadata) {
          console.log(`\n   📊 Additional Metadata:`);
          Object.entries(img.metadata).forEach(([key, value]) => {
            console.log(`      ${key}: ${value}`);
          });
        }
        
        // Check for missing critical fields
        const missingFields = [];
        if (!img.cloudStorage?.googleDriveId) missingFields.push('cloudStorage.googleDriveId');
        if (!img.cloudStorage?.webViewLink) missingFields.push('cloudStorage.webViewLink');
        if (!img.cloudStorage?.thumbnailLink) missingFields.push('cloudStorage.thumbnailLink');
        if (!img.storage?.googleDriveId) missingFields.push('storage.googleDriveId');
        if (!img.localStorage?.path) missingFields.push('localStorage.path');
        if (!img.localStorage?.verified) missingFields.push('localStorage.verified');
        
        if (missingFields.length > 0) {
          console.log(`\n   ⚠️  MISSING CRITICAL FIELDS:`);
          missingFields.forEach(field => console.log(`       - ${field}`));
        } else {
          console.log(`\n   ✅ All critical fields present`);
        }
      });
    } else {
      console.log('⚠️  No character images found in database');
    }

    // Query 2: Find recent product images
    console.log('\n' + '─'.repeat(80));
    console.log('📸 QUERY 2: Recently Uploaded Product Images');
    console.log('─'.repeat(80));

    const productImages = await Asset.find({
      assetCategory: 'product-image',
      status: 'active'
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    console.log(`\n✅ Found ${productImages.length} product images`);
    
    if (productImages.length > 0) {
      console.log('\n📋 Sample Product Image Records (showing first 3):\n');
      productImages.slice(0, 3).forEach((img, idx) => {
        console.log(`\n📦 PRODUCT IMAGE #${idx + 1}:`);
        console.log(`   Asset ID: ${img.assetId}`);
        console.log(`   Filename: ${img.filename}`);
        console.log(`   Asset Category: ${img.assetCategory}`);
        console.log(`   Asset Type: ${img.assetType}`);
        console.log(`   MIME Type: ${img.mimeType}`);
        console.log(`   File Size: ${img.fileSize} bytes`);
        console.log(`   Status: ${img.status}`);
        console.log(`   Sync Status: ${img.syncStatus}`);
        console.log(`   Created At: ${img.createdAt}`);
        
        console.log(`\n   📁 Storage Configuration:`);
        console.log(`      Location (legacy): ${img.storage?.location || 'NOT SET'}`);
        if (img.storage?.googleDriveId) {
          console.log(`      Google Drive ID: ${img.storage?.googleDriveId}`);
        }
        if (img.storage?.localPath) {
          console.log(`      Local Path: ${img.storage?.localPath}`);
        }
        console.log(`      URL: ${img.storage?.url || 'NOT SET'}`);
        
        if (img.localStorage) {
          console.log(`\n   💾 Local Storage:`);
          console.log(`      Location: ${img.localStorage.location}`);
          console.log(`      Path: ${img.localStorage.path}`);
          console.log(`      File Size: ${img.localStorage.fileSize}`);
          console.log(`      Verified: ${img.localStorage.verified}`);
        }
        
        if (img.cloudStorage) {
          console.log(`\n   ☁️  Cloud Storage:`);
          console.log(`      Location: ${img.cloudStorage.location}`);
          console.log(`      Google Drive ID: ${img.cloudStorage.googleDriveId || 'NOT SET'}`);
          console.log(`      Thumbnail Link: ${img.cloudStorage.thumbnailLink || 'NOT SET'}`);
          console.log(`      Web View Link: ${img.cloudStorage.webViewLink || 'NOT SET'}`);
          console.log(`      Status: ${img.cloudStorage.status}`);
          console.log(`      Synced At: ${img.cloudStorage.syncedAt || 'NOT SET'}`);
        }
        
        if (img.metadata) {
          console.log(`\n   📊 Additional Metadata:`);
          Object.entries(img.metadata).forEach(([key, value]) => {
            console.log(`      ${key}: ${value}`);
          });
        }
        
        // Check for missing critical fields
        const missingFields = [];
        if (!img.cloudStorage?.googleDriveId) missingFields.push('cloudStorage.googleDriveId');
        if (!img.cloudStorage?.webViewLink) missingFields.push('cloudStorage.webViewLink');
        if (!img.cloudStorage?.thumbnailLink) missingFields.push('cloudStorage.thumbnailLink');
        if (!img.storage?.googleDriveId) missingFields.push('storage.googleDriveId');
        if (!img.localStorage?.path) missingFields.push('localStorage.path');
        if (!img.localStorage?.verified) missingFields.push('localStorage.verified');
        
        if (missingFields.length > 0) {
          console.log(`\n   ⚠️  MISSING CRITICAL FIELDS:`);
          missingFields.forEach(field => console.log(`       - ${field}`));
        } else {
          console.log(`\n   ✅ All critical fields present`);
        }
      });
    } else {
      console.log('⚠️  No product images found in database');
    }

    // Summary Analysis
    console.log('\n' + '─'.repeat(80));
    console.log('📊 SUMMARY ANALYSIS');
    console.log('─'.repeat(80));

    const allUploaded = [...characterImages, ...productImages];
    
    if (allUploaded.length === 0) {
      console.log('\n⚠️  NO UPLOADED IMAGES FOUND IN DATABASE');
      console.log('\n   This explains why they don\'t appear in gallery picker!');
      console.log('\n   Possible causes:');
      console.log('   1. Asset records not being created after upload');
      console.log('   2. AssetManager.saveAsset() is failing silently');
      console.log('   3. Images uploaded but Asset DB records never created');
    } else {
      console.log('\n✅ Found ' + allUploaded.length + ' uploaded images in database');
      
      // Check for common issues
      const withoutCloudStorage = allUploaded.filter(img => !img.cloudStorage?.googleDriveId).length;
      const withoutLocalStorage = allUploaded.filter(img => !img.localStorage?.path).length;
      const withoutSync = allUploaded.filter(img => img.syncStatus === 'pending').length;
      
      if (withoutCloudStorage > 0) {
        console.log(`\n⚠️  ${withoutCloudStorage} images missing cloudStorage.googleDriveId`);
        console.log('   These won\'t appear in gallery (can\'t fetch from Drive)');
      }
      
      if (withoutLocalStorage > 0) {
        console.log(`\n⚠️  ${withoutLocalStorage} images missing localStorage.path`);
        console.log('   These won\'t have local preview');
      }
      
      if (withoutSync > 0) {
        console.log(`\n⚠️  ${withoutSync} images still pending sync`);
        console.log('   CloudStorage status: pending/syncing/synced/failed');
      }
    }

    // Root Cause Analysis
    console.log('\n' + '═'.repeat(80));
    console.log('🎯 ROOT CAUSE ANALYSIS');
    console.log('═'.repeat(80));

    console.log(`\nGALLERY PICKER ISSUE ROOT CAUSE:\n`);
    
    console.log(`1️⃣  Gallery Retrieval Mechanism:`);
    console.log(`    - Gallery loads images from CloudMediaManager.getMediaByType('image')`);
    console.log(`    - This queries Google Drive \'media_images\' folder`);
    console.log(`    - Lists ALL files in media_images folder`);

    console.log(`\n2️⃣  Where Character/Product Images Are Uploaded:`);
    console.log(`    - Character images → Images/Uploaded/App/Character`);
    console.log(`    - Product images → Images/Uploaded/App/Product`);
    console.log(`    - Generated images → Images/Completed`);

    console.log(`\n3️⃣  The Disconnect:`);
    console.log(`    ❌ Gallery queries: media_images folder`);
    console.log(`    ❌ Character/Product uploaded to: Images/Uploaded/App/{Character|Product}`);
    console.log(`    ✅ Result: Images uploaded successfully but INVISIBLE to gallery`);

    console.log(`\n4️⃣  Secondary Issue:`);
    if (allUploaded.length === 0) {
      console.log(`    ❌ Asset records not being saved to MongoDB`);
      console.log(`    ❌ Even if folders were correct, DB queries would return nothing`);
    } else {
      const missingDriveIds = allUploaded.filter(img => !img.cloudStorage?.googleDriveId);
      if (missingDriveIds.length > 0) {
        console.log(`    ❌ ${missingDriveIds.length} Asset records missing cloudStorage.googleDriveId`);
        console.log(`    ❌ Gallery can retrieve Drive IDs from Asset DB, but missing data`);
      }
    }

    console.log('\n' + '═'.repeat(80));
    console.log('✅ DIAGNOSTIC COMPLETE');
    console.log('═'.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

// Run diagnostic
inspectUploadedImages();
