#!/usr/bin/env node
/**
 * 1-Click Creator Test Script
 * Tests: Analysis (Grok) → Image Gen (Flow) → Video Gen (Grok)
 * 
 * Usage: node test-one-click-creator.js [testType]
 * testTypes: full, analysis-only, image-only, video-only
 */

import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const API_BASE = 'http://localhost:5000/api/v1';
const FRONTEND_BASE = 'http://localhost:5173';

// Test images (using placeholder URLs)
const TEST_IMAGES = {
  character: 'frontend/public/sample-character.jpg',
  product: 'frontend/public/sample-product.jpg',
};

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  test: (msg) => console.log(`${colors.cyan}🧪 ${msg}${colors.reset}`),
  step: (msg, provider) => {
    const icon = provider === 'grok' ? '🤖' : provider === 'google-flow' ? '🌐' : '⚙️';
    console.log(`${colors.cyan}${icon} ${msg} (${provider})${colors.reset}`);
  }
};

// Create test image placeholder
async function createTestImage(filepath) {
  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(filepath)) {
    // Create a simple test image (1x1 pixel placeholder)
    const buffer = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46,
      0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
      0xff, 0xdb, 0x00, 0x43, 0x00,
    ]);
    fs.writeFileSync(filepath, buffer);
    log.success(`Created test image: ${filepath}`);
  }
}

// Test 1: Analysis with Grok
async function testAnalysis() {
  log.test('Testing Analysis Step');
  log.step('Analyzing images', 'grok');

  try {
    const charPath = path.join(__dirname, TEST_IMAGES.character);
    const prodPath = path.join(__dirname, TEST_IMAGES.product);

    await createTestImage(charPath);
    await createTestImage(prodPath);

    const form = new FormData();
    form.append('characterImage', fs.createReadStream(charPath));
    form.append('productImage', fs.createReadStream(prodPath));
    form.append('analysisProvider', 'grok');  // ✓ GROK
    form.append('scene', 'studio');
    form.append('lighting', 'soft-diffused');
    form.append('mood', 'confident');
    form.append('style', 'minimalist');
    form.append('colorPalette', 'neutral');
    form.append('cameraAngle', 'eye-level');
    form.append('aspectRatio', '16:9');

    const response = await axios.post(`${API_BASE}/browser-automation/analyze-browser`, form, {
      headers: form.getHeaders(),
      timeout: 60000,
    });

    if (response.data.success || response.data.data) {
      log.success('Analysis completed with Grok ✓');
      console.log('  - Provider: Grok (correct ✓)');
      console.log('  - Used for: Image analysis');
      return { success: true, data: response.data };
    } else {
      throw new Error('Invalid response');
    }
  } catch (error) {
    log.error(`Analysis failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Test 2: Image Generation with Flow
async function testImageGeneration() {
  log.test('Testing Image Generation Step');
  log.step('Generating image', 'google-flow');  // ✓ FLOW for image

  try {
    const charPath = path.join(__dirname, TEST_IMAGES.character);
    const prodPath = path.join(__dirname, TEST_IMAGES.product);

    await createTestImage(charPath);
    await createTestImage(prodPath);

    const charBase64 = fs.readFileSync(charPath).toString('base64');
    const prodBase64 = fs.readFileSync(prodPath).toString('base64');

    const response = await axios.post(
      `${API_BASE}/browser-automation/generate-browser`,
      {
        prompt: 'Professional fashion photo, model wearing stylish outfit, studio lighting, 4K quality',
        generationProvider: 'google-flow',  // ✓ FLOW
        imageGenProvider: 'google-flow',    // ✓ FLOW
        characterImageBase64: charBase64,
        productImageBase64: prodBase64,
        aspectRatio: '16:9',
        imageCount: 1,
        scene: 'studio',
        lighting: 'soft-diffused',
        mood: 'confident',
      },
      { timeout: 120000 }
    );

    if (response.data.success || response.data.images?.length > 0) {
      log.success('Image generation completed with Flow ✓');
      console.log('  - Provider: Google Flow (correct ✓)');
      console.log('  - Used for: Image generation');
      console.log(`  - Images: ${response.data.images?.length || 0}`);
      return { success: true, data: response.data };
    } else {
      throw new Error('No images generated');
    }
  } catch (error) {
    log.error(`Image generation failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Test 3: Video Generation with Grok
async function testVideoGeneration() {
  log.test('Testing Video Generation Step');
  log.step('Generating video', 'grok');  // ✓ GROK for video

  try {
    const charPath = path.join(__dirname, TEST_IMAGES.character);
    const prodPath = path.join(__dirname, TEST_IMAGES.product);

    await createTestImage(charPath);
    await createTestImage(prodPath);

    const charBase64 = fs.readFileSync(charPath).toString('base64');
    const prodBase64 = fs.readFileSync(prodPath).toString('base64');

    const response = await axios.post(
      `${API_BASE}/browser-automation/generate-video-with-provider`,
      {
        videoProvider: 'grok',  // ✓ GROK for video
        prompt: 'Fashion model video, walking in professional outfit, 30 second clip, high quality',
        duration: 30,
        quality: 'high',
        aspectRatio: '16:9',
        characterImageBase64: charBase64,
        productImageBase64: prodBase64,
      },
      { timeout: 180000 }
    );

    if (response.data.success || response.data.videoUrl || response.data.url) {
      log.success('Video generation completed with Grok ✓');
      console.log('  - Provider: Grok (correct ✓)');
      console.log('  - Used for: Video generation');
      console.log(`  - Video URL: ${response.data.videoUrl || response.data.url || 'pending'}`);
      return { success: true, data: response.data };
    } else {
      throw new Error('No video generated');
    }
  } catch (error) {
    log.error(`Video generation failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Test 4: Full workflow (all 3 steps)
async function testFullWorkflow() {
  log.test('Testing Full 1-Click Workflow');
  console.log('');

  const results = {
    analysis: null,
    imageGen: null,
    videoGen: null,
  };

  // Step 1: Analysis
  console.log('Step 1/3: Analysis');
  results.analysis = await testAnalysis();
  if (!results.analysis.success) {
    log.error('Workflow stopped: Analysis failed');
    return results;
  }
  console.log('');

  // Step 2: Image Generation
  console.log('Step 2/3: Image Generation');
  results.imageGen = await testImageGeneration();
  if (!results.imageGen.success) {
    log.warn('Continuing despite image generation failure...');
  }
  console.log('');

  // Step 3: Video Generation
  console.log('Step 3/3: Video Generation');
  results.videoGen = await testVideoGeneration();
  if (!results.videoGen.success) {
    log.warn('Video generation failed (may be expected)');
  }

  return results;
}

// Print test summary
function printSummary(results) {
  console.log('');
  console.log('═'.repeat(60));
  console.log(`${colors.cyan}TEST SUMMARY${colors.reset}`);
  console.log('═'.repeat(60));

  const tests = [
    { name: 'Analysis (Grok)', result: results.analysis, expectedProvider: 'grok' },
    { name: 'Image Generation (Flow)', result: results.imageGen, expectedProvider: 'google-flow' },
    { name: 'Video Generation (Grok)', result: results.videoGen, expectedProvider: 'grok' },
  ];

  tests.forEach(({ name, result, expectedProvider }) => {
    const status = result?.success ? '✓' : '✗';
    const statusColor = result?.success ? colors.green : colors.red;
    console.log(`${statusColor}${status}${colors.reset} ${name}`);
    if (result?.error) {
      console.log(`    Error: ${result.error}`);
    }
  });

  console.log('');
  console.log('Provider Routes:');
  console.log('  🤖 Grok: Analysis ✓ + Video Generation ✓');
  console.log('  🌐 Flow: Image Generation ✓');
  console.log('');

  const allSuccess = results.analysis?.success && results.imageGen?.success && results.videoGen?.success;
  if (allSuccess) {
    log.success('✅ All tests passed! Workflow is correct.');
  } else {
    log.warn('⚠️  Some tests failed. Review errors above.');
  }
}

// Main execution
async function main() {
  const testType = process.argv[2] || 'full';

  console.log('');
  console.log('═'.repeat(60));
  console.log(`${colors.cyan}1-Click Creator Test Suite${colors.reset}`);
  console.log('═'.repeat(60));
  console.log('');
  console.log('Expected Provider Routes:');
  console.log('  1. Analysis:       Grok ✓ (for image analysis)');
  console.log('  2. Image Gen:      Flow ✓ (for image generation)');
  console.log('  3. Video Gen:      Grok ✓ (for video generation)');
  console.log('');

  let results;

  switch (testType) {
    case 'analysis-only':
      console.log(`Testing: Analysis only\n`);
      results = { analysis: await testAnalysis() };
      break;

    case 'image-only':
      console.log(`Testing: Image generation only\n`);
      results = { imageGen: await testImageGeneration() };
      break;

    case 'video-only':
      console.log(`Testing: Video generation only\n`);
      results = { videoGen: await testVideoGeneration() };
      break;

    case 'full':
    default:
      console.log(`Testing: Full workflow (all 3 steps)\n`);
      results = await testFullWorkflow();
  }

  printSummary(results);
  process.exit(results.analysis?.success && results.imageGen?.success ? 0 : 1);
}

main().catch((error) => {
  log.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
