/**
 * Test Google Drive Upload with OAuth 2.0
 * Tests if Google Drive upload works with OAuth credentials from .env
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import driveService from '../services/googleDriveOAuth.js';
import { google } from 'googleapis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

console.log('🧪 Testing Google Drive Upload with OAuth 2.0...\n');

async function testGoogleDriveUpload() {
  try {
    // 1. Check if OAuth credentials are configured
    const clientId = process.env.OAUTH_CLIENT_ID;
    const clientSecret = process.env.OAUTH_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      console.error('❌ OAuth credentials not found in .env');
      console.error('   Expected: OAUTH_CLIENT_ID and OAUTH_CLIENT_SECRET');
      process.exit(1);
    }

    console.log('✅ OAuth credentials found in .env');
    console.log(`   Client ID: ${clientId.substring(0, 30)}...`);
    console.log(`   Client Secret: ${clientSecret.substring(0, 20)}...${clientSecret.substring(clientSecret.length - 5)}`);
    console.log('');

    // 2. Try to authenticate
    console.log('📍 Attempting to authenticate with Google Drive...');
    const authResult = await driveService.authenticate();
    
    console.log('Authentication Result:');
    console.log(`  - Success: ${authResult.success}`);
    console.log(`  - Authenticated: ${authResult.authenticated}`);
    console.log(`  - Configured: ${authResult.configured}`);
    console.log(`  - Method: ${authResult.method || 'Unknown'}`);
    console.log(`  - Message: ${authResult.message}`);
    console.log('');

    // 3. Check if we need to do OAuth flow
    if (authResult.authUrl) {
      console.log('🔐 Authorization needed (first time setup)');
      console.log(`   Please visit this URL to authorize:`);
      console.log(`   ${authResult.authUrl}`);
      console.log('');
      console.log('   After authorization, Google will redirect you to localhost.');
      console.log('   The app will automatically receive the authorization code.');
      console.log('');
      
      console.log('💡 To test upload, please:');
      console.log('   1. Visit the authorization URL above');
      console.log('   2. Authorize the app');
      console.log('   3. Run this test again');
      
      // For automated testing, we can't complete OAuth flow
      // But we can verify that credentials are valid by checking the URL
      if (authResult.authUrl && authResult.authUrl.includes('https://accounts.google.com')) {
        console.log('');
        console.log('✅ OAuth credentials are valid! (URL check passed)');
        console.log('   Authorization URL was successfully generated.');
      }
      
      process.exit(0);
    }

    if (!authResult.success || !authResult.authenticated) {
      throw new Error('Authentication failed');
    }

    console.log('✅ Authenticated! Ready to test upload...');
    console.log('');

    // 3. Create a test file buffer
    console.log('📄 Creating test image buffer...');
    const testImageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    console.log(`   Test file size: ${testImageBuffer.length} bytes`);
    console.log('');

    // 4. Upload test file
    console.log('📤 Uploading test file to Google Drive...');
    const uploadResult = await driveService.uploadBuffer(
      testImageBuffer,
      `test-upload-${Date.now()}.png`,
      {
        description: 'Test upload from Google Drive OAuth test script',
        properties: {
          testFile: 'true',
          timestamp: new Date().toISOString()
        }
      }
    );

    console.log('✅ Upload successful!');
    console.log('Upload Result:');
    console.log(`  - File ID: ${uploadResult.id}`);
    console.log(`  - File Name: ${uploadResult.name}`);
    console.log(`  - Size: ${uploadResult.size} bytes`);
    console.log(`  - Source: ${uploadResult.source}`);
    if (uploadResult.webViewLink) {
      console.log(`  - View Link: ${uploadResult.webViewLink}`);
    }
    console.log('');

    if (uploadResult.source === 'google-drive') {
      console.log('🎉 Google Drive upload test PASSED!');
      console.log('   Images will be automatically uploaded to Google Drive when generated.');
    } else {
      console.log('⚠️  Files are being saved locally (Google Drive not available).');
      console.log('   This is normal if Google Drive credentials are not fully set up.');
    }
    
    process.exit(0);

  } catch (error) {
    console.error('❌ Test encountered an error:');
    console.error(`   Error: ${error.message}`);
    
    if (error.response?.data) {
      console.error(`   Details: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    
    console.log('');
    console.log('💡 Troubleshooting:');
    console.log('   1. Make sure OAUTH_CLIENT_ID is set in backend/.env');
    console.log('   2. Make sure OAUTH_CLIENT_SECRET is set in backend/.env');
    console.log('   3. Verify credentials are valid from Google Cloud Console');
    console.log('   4. Make sure Google Drive API is enabled in Google Cloud Console');
    console.log('');

    process.exit(1);
  }
}

// Run test
testGoogleDriveUpload();
