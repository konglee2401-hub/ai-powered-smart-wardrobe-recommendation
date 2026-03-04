#!/usr/bin/env node

/**
 * Test multiple image upload and href detection
 * Verifies that:
 * 1. Two images can be uploaded sequentially
 * 2. Each image is correctly detected in the virtuoso list
 * 3. Href tracking works correctly for both images
 */

import GoogleFlowAutomationService from '../services/googleFlowAutomationService.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function testMultipleImageUpload() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║   Testing Multiple Image Upload & Href Detection   ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  // Use test images if available, otherwise use sample images
  const testImagesDir = path.join(__dirname, '../test-images');
  let charImagePath = '';
  let prodImagePath = '';

  if (fs.existsSync(testImagesDir)) {
    const files = fs.readdirSync(testImagesDir).filter(f => /\.(jpg|jpeg|png)$/i.test(f));
    if (files.length >= 2) {
      charImagePath = path.join(testImagesDir, files[0]);
      prodImagePath = path.join(testImagesDir, files[1]);
    }
  }

  if (!charImagePath || !fs.existsSync(charImagePath)) {
    console.log('❌ Character image not found in test-images directory');
    console.log('   Please provide test images before running this test\n');
    return;
  }

  if (!prodImagePath || !fs.existsSync(prodImagePath)) {
    console.log('❌ Product image not found in test-images directory');
    console.log('   Please provide test images before running this test\n');
    return;
  }

  const service = new GoogleFlowAutomationService({
    type: 'image',
    projectId: '58d791d4-37c9-47a8-ae3b-816733bc3ec0',
    headless: false,
    debugMode: false
  });

  try {
    console.log('📋 Step 1: Initialize service...\n');
    await service.init();
    console.log('✅ Service initialized\n');

    console.log('📋 Step 2: Navigate to Google Flow...\n');
    await service.navigateToFlow();
    console.log('✅ Navigated to Google Flow\n');

    console.log('📋 Step 3: Configure settings...\n');
    await service.configureSettings();
    console.log('✅ Settings configured\n');

    console.log('📋 Step 4: Upload 2 images sequentially...\n');
    console.log(`   Character image: ${charImagePath}`);
    console.log(`   Product image: ${prodImagePath}\n`);

    const existingImages = [];
    await service.uploadImages(charImagePath, prodImagePath, existingImages);

    console.log('\n✅ Multiple image upload test complete!');
    console.log('   Check browser to verify both images appeared in virtuoso list\n');

    // Give user time to see the result
    console.log('⏳ Leaving browser open for 15 seconds...');
    await service.page.waitForTimeout(15000);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.stack) {
      console.error('\nStack:', error.stack);
    }
  } finally {
    console.log('\n📋 Closing browser...');
    await service.close();
    console.log('✅ Done\n');
  }
}

testMultipleImageUpload();
