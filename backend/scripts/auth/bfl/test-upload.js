#!/usr/bin/env node
/**
 * BFL Playground Image Upload Test
 * 
 * Tests uploading reference images and generating with prompts
 * 
 * Usage:
 *   node scripts/bfl-test-upload.js
 *   node scripts/bfl-test-upload.js --images ./image1.jpg,./image2.jpg
 *   node scripts/bfl-test-upload.js --prompt "Virtual try on for girl in image 1 wearing outfit from image 2"
 */

import BFLPlaygroundService from '../services/browser/bflPlaygroundService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line args
const args = process.argv.slice(2);

const imagesIndex = args.indexOf('--images');
const imagesArg = imagesIndex >= 0 ? args[imagesIndex + 1]?.split(',') : null;

const promptIndex = args.indexOf('--prompt');
const promptArg = promptIndex >= 0 ? args.slice(promptIndex + 1).join(' ') : null;

// Default test images from test-images folder
const defaultImages = [
  path.join(process.cwd(), 'test-images', 'anh-nhan-vat.jpeg'),  // Character image
  path.join(process.cwd(), 'test-images', 'anh-san-pham.png')    // Product image
];

// Default prompt for virtual try-on
const DEFAULT_PROMPT = 'Virtual try on for girl in image 1 wearing outfit from image 2';

/**
 * Find available test images in common locations
 */
function findTestImages() {
  const searchDirs = [
    path.join(process.cwd(), 'test-images'),
    path.join(process.cwd(), 'uploads'),
    path.join(process.cwd(), 'temp'),
    path.join(process.cwd(), 'backend', 'test-images'),
    path.join(process.cwd(), 'backend', 'uploads'),
  ];
  
  const images = [];
  
  for (const dir of searchDirs) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (/\.(jpg|jpeg|png|webp)$/i.test(file)) {
          images.push(path.join(dir, file));
          if (images.length >= 2) return images;
        }
      }
    }
  }
  
  return images;
}

/**
 * Main test function
 */
async function main() {
  console.log('\n📤 BFL PLAYGROUND IMAGE UPLOAD TEST');
  console.log('='.repeat(70));
  console.log('');
  
  // Check for session
  const sessionPath = path.join(__dirname, '../sessions/bfl-session.json');
  if (!fs.existsSync(sessionPath)) {
    console.log('❌ No saved session found!');
    console.log('   Run: node scripts/bfl-login.js');
    process.exit(1);
  }
  
  // Get test images
  let testImages = imagesArg || defaultImages;
  
  // Filter to existing images only
  testImages = testImages.filter(img => {
    const exists = fs.existsSync(img);
    if (!exists) {
      console.log(`⚠️  Image not found: ${img}`);
    }
    return exists;
  });
  
  // If no valid images, try to find some
  if (testImages.length === 0) {
    console.log('🔍 Looking for test images...');
    testImages = findTestImages();
  }
  
  if (testImages.length === 0) {
    console.log('❌ No test images found!');
    console.log('   Provide images: --images ./img1.jpg,./img2.jpg');
    process.exit(1);
  }
  
  const testPrompt = promptArg || DEFAULT_PROMPT;
  
  console.log('🎯 Test Parameters:');
  console.log(`   Images: ${testImages.length}`);
  testImages.forEach((img, i) => {
    console.log(`     ${i + 1}. ${path.basename(img)}`);
  });
  console.log(`   Prompt: ${testPrompt}`);
  console.log('');
  
  // Create service
  const service = new BFLPlaygroundService({
    headless: false, // Keep visible for testing
    timeout: 120000
  });
  
  try {
    // Initialize
    console.log('🚀 Initializing service...');
    await service.initialize();
    console.log('✅ Service initialized');
    console.log('');
    
    // Upload images
    console.log('📤 Uploading reference images...');
    for (let i = 0; i < testImages.length; i++) {
      console.log(`   Image ${i + 1}/${testImages.length}: ${path.basename(testImages[i])}`);
      await service.uploadImage(testImages[i]);
    }
    console.log('✅ All images uploaded');
    console.log('');
    
    // Enter prompt
    console.log('⌨️  Entering prompt...');
    await service.enterPrompt(testPrompt);
    console.log('✅ Prompt entered');
    console.log('');
    
    // Generate
    console.log('🎨 Generating image...');
    const imageUrl = await service.generate(180000);
    console.log(`✅ Generated: ${imageUrl?.substring(0, 80)}...`);
    console.log('');
    
    // Download
    console.log('💾 Downloading result...');
    const downloadPath = await service.downloadImage(imageUrl);
    console.log(`✅ Downloaded to: ${downloadPath}`);
    console.log('');
    
    console.log('✅ TEST PASSED!');
    console.log('='.repeat(70));
    
  } catch (error) {
    console.error('');
    console.error('❌ TEST FAILED!');
    console.error(`Error: ${error.message}`);
    console.error('');
    process.exit(1);
  } finally {
    await service.close();
  }
}

main().catch(console.error);
