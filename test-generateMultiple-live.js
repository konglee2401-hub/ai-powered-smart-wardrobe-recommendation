#!/usr/bin/env node

/**
 * Live Test: generateMultiple() End-to-End
 * 
 * Tests actual generation of multiple prompts with component reuse.
 * Captures HTML and screenshots for debugging.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import GoogleFlowAutomationService from './backend/services/googleFlowAutomationService.js';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ID = 'c9d5fea9-63e5-4d21-ac72-6830091fdbc0';

console.log('\n' + '='.repeat(80));
console.log('  TEST: generateMultiple() Live End-to-End');
console.log('='.repeat(80) + '\n');

// Test data
const testImagesDir = './backend/test-images';
const charImagePath = path.join(testImagesDir, 'anh-nhan-vat.jpeg');
const prodImagePath = path.join(testImagesDir, 'anh-san-pham.png');
const refImagePath = path.join(testImagesDir, 'anh-nhan-vat.jpeg');

console.log('📁 Test Images:');
console.log(`   Character: ${charImagePath}`);
console.log(`   Product:   ${prodImagePath}`);
console.log(`   Reference: ${refImagePath}\n`);

// ============================================================
// TEST 1: Image Service generateMultiple()
// ============================================================

console.log('TEST 1: Image Service generateMultiple()\n');

try {
  console.log('🚀 Initializing GoogleFlowAutomationService (Image mode)...');
  const imageService = new GoogleFlowAutomationService({
    type: 'image',
    projectId: PROJECT_ID,
    headless: false  // Now headless for debugging
  });

  console.log('📸 Testing with 2 prompts (component reuse)...\n');
  
  const imagePrompts = [
    'person wearing fashionable outfit, modern style, confident pose',
    'person holding the product, showing it proudly, smiling'
  ];

  const startTime = Date.now();
  const imageResult = await imageService.generateMultiple(
    charImagePath,
    prodImagePath,
    imagePrompts
  );
  const imageTime = Date.now() - startTime;

  console.log(`\n✅ Image generation completed in ${(imageTime / 1000).toFixed(1)}s\n`);
  console.log('Result:', JSON.stringify(imageResult, null, 2));

  if (imageResult.success) {
    console.log(`\n✅ Generated ${imageResult.results?.length || 0} images`);
    imageResult.results?.forEach((r, i) => {
      console.log(`   [${i}] ${r.prompt}`);
      console.log(`       URL: ${r.imageUrl?.substring(0, 80)}...`);
    });
  } else {
    console.log(`\n❌ Image generation failed: ${imageResult.message}`);
  }

  await imageService.close();

} catch (error) {
  console.error('\n❌ Image generation test failed:', error.message);
  console.error(error);
}

console.log('\n');

// ============================================================
// TEST 2: Video Service generateMultiple()
// ============================================================

console.log('TEST 2: Video Service generateMultiple()\n');

try {
  console.log('🚀 Initializing GoogleFlowAutomationService (Video mode)...');
  const videoService = new GoogleFlowAutomationService({
    type: 'video',
    projectId: PROJECT_ID,
    headless: true  // Changed to headless for test execution
  });

  console.log('🎬 Testing with 2 prompts (component reuse)...\n');

  const videoPrompts = [
    'person doing a trending dance move, confident, smooth motion',
    'person walking and waving at the camera, happy expression'
  ];

  const startTime = Date.now();
  const videoResult = await videoService.generateMultiple(
    refImagePath,
    videoPrompts
  );
  const videoTime = Date.now() - startTime;

  console.log(`\n✅ Video generation completed in ${(videoTime / 1000).toFixed(1)}s\n`);
  console.log('Result:', JSON.stringify(videoResult, null, 2));

  if (videoResult.success) {
    console.log(`\n✅ Generated ${videoResult.results?.length || 0} videos`);
    videoResult.results?.forEach((r, i) => {
      console.log(`   [${i}] ${r.prompt}`);
      console.log(`       URL: ${r.videoUrl?.substring(0, 80)}...`);
    });
  } else {
    console.log(`\n❌ Video generation failed: ${videoResult.message}`);
  }

  await videoService.close();

} catch (error) {
  console.error('\n❌ Video generation test failed:', error.message);
  console.error(error);
}

console.log('\n' + '='.repeat(80));
console.log('✅ ALL TESTS COMPLETED');
console.log('='.repeat(80) + '\n');
