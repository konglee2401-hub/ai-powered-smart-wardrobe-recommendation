/**
 * Test Smart Upload Methods for Different Image/Video Types
 * Tests:
 * - uploadCharacterImage() → Images/Uploaded/App/Character
 * - uploadProductImage() → Images/Uploaded/App/Product
 * - uploadGeneratedImage() → Images/Completed
 * - uploadSourceVideo() → Videos/Uploaded/App
 * - uploadGeneratedVideo() → Videos/Completed
 * 
 * Run: node tests/test-smart-uploads.js
 */

import dotenv from 'dotenv';
import driveService from '../services/googleDriveOAuth.js';

dotenv.config();

async function createTestBuffer(sizeKb = 10) {
  return Buffer.alloc(sizeKb * 1024, 'test-data');
}

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 Testing Smart Upload Methods with Auto-Folder Routing');
  console.log('='.repeat(70) + '\n');

  try {
    // Authenticate first
    console.log('🔐 Authenticating with Google Drive...');
    const authResult = await driveService.authenticate();
    
    if (!authResult.authenticated) {
      throw new Error('Failed to authenticate with Google Drive');
    }
    console.log('✅ Authenticated successfully\n');

    // Initialize folder structure
    await driveService.initializeFolderStructure();

    // Test 1: Upload Character Image
    console.log('📸 Test 1: Upload Character Image');
    console.log('   Target: Images/Uploaded/App/Character');
    try {
      const charBuffer = await createTestBuffer(5);
      const charResult = await driveService.uploadCharacterImage(
        charBuffer,
        `test-character-${Date.now()}.jpg`,
        { description: 'Test character image' }
      );
      console.log(`   ✅ Success: ${charResult.name}`);
      console.log(`   📍 File ID: ${charResult.id}`);
      console.log(`   📍 Source: ${charResult.source}\n`);
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}\n`);
    }

    // Test 2: Upload Product Image
    console.log('📦 Test 2: Upload Product Image');
    console.log('   Target: Images/Uploaded/App/Product');
    try {
      const prodBuffer = await createTestBuffer(5);
      const prodResult = await driveService.uploadProductImage(
        prodBuffer,
        `test-product-${Date.now()}.jpg`,
        { description: 'Test product image' }
      );
      console.log(`   ✅ Success: ${prodResult.name}`);
      console.log(`   📍 File ID: ${prodResult.id}`);
      console.log(`   📍 Source: ${prodResult.source}\n`);
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}\n`);
    }

    // Test 3: Upload Generated Image
    console.log('🎨 Test 3: Upload Generated Image');
    console.log('   Target: Images/Completed');
    try {
      const genImageBuffer = await createTestBuffer(5);
      const genImageResult = await driveService.uploadGeneratedImage(
        genImageBuffer,
        `test-generated-${Date.now()}.jpg`,
        { description: 'Test AI-generated image' }
      );
      console.log(`   ✅ Success: ${genImageResult.name}`);
      console.log(`   📍 File ID: ${genImageResult.id}`);
      console.log(`   📍 Source: ${genImageResult.source}\n`);
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}\n`);
    }

    // Test 4: Upload Source Video
    console.log('🎬 Test 4: Upload Source Video');
    console.log('   Target: Videos/Uploaded/App');
    try {
      const srcVideoBuffer = await createTestBuffer(10);
      const srcVideoResult = await driveService.uploadSourceVideo(
        srcVideoBuffer,
        `test-source-${Date.now()}.mp4`,
        { description: 'Test source video for mashup' }
      );
      console.log(`   ✅ Success: ${srcVideoResult.name}`);
      console.log(`   📍 File ID: ${srcVideoResult.id}`);
      console.log(`   📍 Source: ${srcVideoResult.source}\n`);
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}\n`);
    }

    // Test 5: Upload Generated Video
    console.log('🎥 Test 5: Upload Generated Video');
    console.log('   Target: Videos/Completed');
    try {
      const genVideoBuffer = await createTestBuffer(10);
      const genVideoResult = await driveService.uploadGeneratedVideo(
        genVideoBuffer,
        `test-generated-${Date.now()}.mp4`,
        { description: 'Test AI-generated video' }
      );
      console.log(`   ✅ Success: ${genVideoResult.name}`);
      console.log(`   📍 File ID: ${genVideoResult.id}`);
      console.log(`   📍 Source: ${genVideoResult.source}\n`);
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}\n`);
    }

    // Test 6: Upload Video to Platform (TikTok)
    console.log('🎵 Test 6: Upload Video to Platform (TikTok)');
    console.log('   Target: Videos/Downloaded/Tiktok');
    try {
      const tiktokBuffer = await createTestBuffer(10);
      const tiktokResult = await driveService.uploadVideoToPlatform(
        tiktokBuffer,
        `test-tiktok-${Date.now()}.mp4`,
        'tiktok',
        { description: 'Test TikTok video' }
      );
      console.log(`   ✅ Success: ${tiktokResult.name}`);
      console.log(`   📍 File ID: ${tiktokResult.id}`);
      console.log(`   📍 Source: ${tiktokResult.source}\n`);
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}\n`);
    }

    // Test 7: Upload Video to Platform (Reels/Instagram)
    console.log('📱 Test 7: Upload Video to Platform (Instagram Reels)');
    console.log('   Target: Videos/Downloaded/Reels');
    try {
      const reelsBuffer = await createTestBuffer(10);
      const reelsResult = await driveService.uploadVideoToPlatform(
        reelsBuffer,
        `test-reels-${Date.now()}.mp4`,
        'reels',
        { description: 'Test Instagram Reels video' }
      );
      console.log(`   ✅ Success: ${reelsResult.name}`);
      console.log(`   📍 File ID: ${reelsResult.id}`);
      console.log(`   📍 Source: ${reelsResult.source}\n`);
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}\n`);
    }

    console.log('='.repeat(70));
    console.log('✅ All upload tests completed!');
    console.log('='.repeat(70) + '\n');

  } catch (error) {
    console.error('\n❌ Test Error:', error.message);
    console.error('\nStack:', error.stack);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Fatal Error:', error);
  process.exit(1);
});
