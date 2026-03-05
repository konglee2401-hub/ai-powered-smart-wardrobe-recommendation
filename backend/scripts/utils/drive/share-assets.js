#!/usr/bin/env node

/**
 * Share all existing assets on Google Drive publicly
 * Fixes gallery loading for assets that were uploaded before public sharing was added
 */

import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { google } from 'googleapis';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-wardrobe';

// Asset schema
const AssetSchema = new mongoose.Schema({
  assetId: String,
  filename: String,
  storage: {
    googleDriveId: String,
    location: String
  }
}, { collection: 'assets' });

const Asset = mongoose.model('Asset', AssetSchema);

// Initialize Google Drive API
let drive = null;

async function initializeDrive() {
  try {
    console.log('🔐 Authenticating with Google Drive...');
    
    const tokenPath = path.join(__dirname, '../config/drive-token.json');
    const credentialsPath = path.join(
      __dirname,
      '../config/client_secret_445819590351-s0oqsu0bu9t7lsmttfd16q8rohqlohkc.apps.googleusercontent.com.json'
    );

    let auth;

    // Try OAuth from environment
    if (process.env.OAUTH_CLIENT_ID && process.env.OAUTH_CLIENT_SECRET) {
      const redirectUri = 'http://localhost:5000/api/drive/auth-callback';
      auth = new google.auth.OAuth2(
        process.env.OAUTH_CLIENT_ID,
        process.env.OAUTH_CLIENT_SECRET,
        redirectUri
      );

      if (fs.existsSync(tokenPath)) {
        const token = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
        auth.setCredentials(token);
      } else {
        throw new Error('No token found');
      }
    } else if (fs.existsSync(credentialsPath)) {
      const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
      const { client_id, client_secret, redirect_uris } = credentials.web;

      auth = new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uris[0]
      );

      const token = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
      auth.setCredentials(token);
    } else {
      throw new Error('Google Drive credentials not configured');
    }

    drive = google.drive({ version: 'v3', auth });
    console.log('✅ Google Drive authenticated\n');
  } catch (error) {
    console.error('❌ Failed to initialize Google Drive:', error.message);
    process.exit(1);
  }
}

async function shareFilePublicly(fileId) {
  try {
    const permission = await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });
    return true;
  } catch (error) {
    // Ignore "already shared" errors
    if (error.message?.includes('already exists')) {
      return true;
    }
    throw error;
  }
}

async function shareAssets() {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    await initializeDrive();

    // Find all assets with googleDriveId
    console.log('🔍 Finding assets with Google Drive files...');
    const assets = await Asset.find({
      'storage.location': 'google-drive',
      'storage.googleDriveId': { $exists: true, $ne: null }
    });

    console.log(`Found: ${assets.length} assets to share\n`);

    if (assets.length === 0) {
      console.log('✅ No assets to share');
      await mongoose.connection.close();
      return;
    }

    let sharedCount = 0;
    let errorCount = 0;

    for (const asset of assets) {
      try {
        const fileId = asset.storage.googleDriveId;
        await shareFilePublicly(fileId);
        
        sharedCount++;
        console.log(`✅ Shared: ${asset.assetId}`);
        console.log(`   File ID: ${fileId}`);
        console.log(`   Filename: ${asset.filename}\n`);
      } catch (err) {
        errorCount++;
        console.log(`❌ Error sharing ${asset.assetId}: ${err.message}\n`);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Total: ${assets.length}`);
    console.log(`   Shared: ${sharedCount} ✅`);
    console.log(`   Errors: ${errorCount} ❌`);

    if (sharedCount > 0) {
      console.log(`\n🎉 Successfully shared ${sharedCount} assets!`);
      console.log(`Gallery images should now load correctly.`);
    }

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

shareAssets();
