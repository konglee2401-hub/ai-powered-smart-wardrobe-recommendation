#!/usr/bin/env node

/**
 * Multi-Video Generation - E2E Test with Real Images
 * Tests the complete multi-video workflow using actual test-images
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ========== CONFIGURATION ==========
const BASE_URL = 'http://localhost:5000/api/v1/browser-automation';
const SESSION_ID = `test-multi-video-${Date.now()}`;
const TEST_RESULTS_DIR = path.join(__dirname, '..', '..', 'test-results', SESSION_ID);
const TEST_IMAGES_DIR = path.join(__dirname, '..', '..', 'test-images');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  gray: '\x1b[90m'
};

// Ensure test results directory exists
if (!fs.existsSync(TEST_RESULTS_DIR)) {
  fs.mkdirSync(TEST_RESULTS_DIR, { recursive: true });
}

const testResults = {
  sessionId: SESSION_ID,
  startTime: new Date().toISOString(),
  environment: {
    baseUrl: BASE_URL,
    testImagesDir: TEST_IMAGES_DIR,
    resultsDir: TEST_RESULTS_DIR
  },
  tests: []
};

// ========== LOGGER ==========
class Logger {
  static info(msg) {
    console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`);
  }

  static success(msg) {
    console.log(`${colors.green}✅ ${msg}${colors.reset}`);
  }

  static warn(msg) {
    console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`);
  }

  static error(msg) {
    console.log(`${colors.red}❌ ${msg}${colors.reset}`);
  }

  static header(msg) {
    console.log(`\n${colors.bold}${colors.cyan}${'='.repeat(80)}${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}${msg}${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}${'='.repeat(80)}${colors.reset}\n`);
  }

  static section(msg) {
    console.log(`\n${colors.bold}${colors.blue}📝 ${msg}${colors.reset}`);
    console.log(`${colors.gray}${'─'.repeat(78)}${colors.reset}`);
  }

  static step(num, msg) {
    console.log(`${colors.cyan}[Step ${num}] ${msg}${colors.reset}`);
  }
}

// ========== IMAGE LOADING ==========
function loadImageAsBase64(imagePath) {
  try {
    const fullPath = path.join(TEST_IMAGES_DIR, imagePath);
    
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Image not found: ${fullPath}`);
    }

    const imageBuffer = fs.readFileSync(fullPath);
    const ext = path.extname(imagePath).substring(1).toLowerCase();
    const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`;
    
    const base64 = imageBuffer.toString('base64');
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    Logger.error(`Failed to load image: ${error.message}`);
    throw error;
  }
}

// ========== VERIFICATION ==========
function verifyTestEnvironment() {
  Logger.section('Environment Verification');

  // Check test images exist
  const charImagePath = path.join(TEST_IMAGES_DIR, 'anh-nhan-vat.jpeg');
  const prodImagePath = path.join(TEST_IMAGES_DIR, 'anh-san-pham.png');

  if (!fs.existsSync(charImagePath)) {
    Logger.error(`Character image missing: ${charImagePath}`);
    throw new Error('Character test image not found');
  }
  Logger.success(`Character image found: anh-nhan-vat.jpeg`);

  if (!fs.existsSync(prodImagePath)) {
    Logger.error(`Product image missing: ${prodImagePath}`);
    throw new Error('Product test image not found');
  }
  Logger.success(`Product image found: anh-san-pham.png`);

  // Check API connectivity
  Logger.info(`API Endpoint: ${BASE_URL}`);
  Logger.info(`Test Session: ${SESSION_ID}`);
  Logger.info(`Results Directory: ${TEST_RESULTS_DIR}`);
}

// ========== TEST CASES ==========

/**
 * Test 1: Change Clothes Use Case (2 videos, frame chaining)
 */
async function testChangeClothesUseCase() {
  Logger.section('Test 1: Change Clothes Use Case');
  Logger.info('2-video workflow with frame chaining');
  Logger.info('Scenario: Character changes from one outfit to another');

  const startTime = Date.now();
  const testName = 'Change Clothes (2 videos + frame chaining)';

  try {
    Logger.step(1, 'Loading test images...');
    const refImage = loadImageAsBase64('anh-nhan-vat.jpeg');
    const prodImage = loadImageAsBase64('anh-san-pham.png');
    Logger.success('Images loaded');

    Logger.step(2, 'Preparing analysis data...');
    const mockAnalysis = {
      character: {
        bodyType: 'Slim Athletic',
        height: 'Tall (5\'10"+)',
        skinTone: 'Medium',
        confidence: 0.88
      },
      product: {
        category: 'Casual Outfit',
        colors: ['Navy Blue', 'White'],
        material: 'Cotton Linen Blend',
        style: 'Contemporary Casual',
        fit: 'Relaxed Comfortable'
      },
      recommendations: {
        scene: 'Modern Minimalist Interior',
        lighting: 'Natural Window Light',
        mood: 'Confident & Approachable',
        style: 'Modern Casual',
        colorPalette: 'Neutral Tones',
        cameraAngle: 'Full Body at Eye Level'
      }
    };
    Logger.success('Analysis data ready');

    Logger.step(3, 'Calling API: generateMultiVideoSequence()...');
    const response = await axios.post(
      `${BASE_URL}/generate-multi-video-sequence`,
      {
        sessionId: `${SESSION_ID}-change-clothes`,
        useCase: 'change-clothes',
        refImage: refImage,
        analysis: mockAnalysis,
        duration: 20,
        quality: 'high',
        aspectRatio: '9:16',
        videoProvider: 'google-flow'
      },
      { timeout: 600000 } // 10 minutes timeout
    );

    if (response.data.success) {
      const duration = Date.now() - startTime;
      Logger.success(`Generated ${response.data.data.videoCount} videos`);
      Logger.info(`Total duration: ${response.data.data.totalDuration}s`);
      Logger.info(`Frame chaining: ${response.data.data.frameChaining ? '✓ Enabled' : '✗ Disabled'}`);
      Logger.info(`Frame transitions: ${response.data.data.frameMetadata?.length || 0}`);
      
      response.data.data.videos.forEach((video, idx) => {
        Logger.info(`  Video ${idx + 1}: ${video.filename} (${video.duration}s)`);
        if (video.endFrame) {
          Logger.info(`    └─ End frame extracted for next segment`);
        }
      });

      testResults.tests.push({
        name: testName,
        status: 'passed',
        duration: duration,
        result: response.data
      });

      return true;
    } else {
      Logger.error(response.data.error || 'Unknown error');
      testResults.tests.push({
        name: testName,
        status: 'failed',
        error: response.data.error,
        duration: Date.now() - startTime
      });
      return false;
    }
  } catch (error) {
    Logger.error(`Test failed: ${error.message}`);
    if (error.response?.data) {
      Logger.error(`API Error: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    testResults.tests.push({
      name: testName,
      status: 'failed',
      error: error.message,
      duration: Date.now() - startTime
    });
    return false;
  }
}

/**
 * Test 2: Product Showcase Use Case (3 videos, independent)
 */
async function testProductShowcaseUseCase() {
  Logger.section('Test 2: Product Showcase Use Case');
  Logger.info('3-video workflow with independent segments');
  Logger.info('Scenario: Showcase product from multiple angles');

  const startTime = Date.now();
  const testName = 'Product Showcase (3 videos, independent)';

  try {
    Logger.step(1, 'Loading test images...');
    const prodImage = loadImageAsBase64('anh-san-pham.png');
    Logger.success('Images loaded');

    Logger.step(2, 'Preparing analysis data...');
    const mockAnalysis = {
      character: null,
      product: {
        name: 'Premium Fashion Item',
        category: 'Apparel',
        colors: ['Neutral', 'Sophisticated'],
        material: 'High Quality Fabric',
        features: ['Comfortable', 'Stylish', 'Durable', 'Versatile']
      },
      recommendations: {
        scene: 'Professional Studio',
        lighting: 'Professional Studio Lighting',
        mood: 'Premium & Aspirational',
        style: 'Luxury Contemporary',
        colorPalette: 'Neutral Premium',
        cameraAngle: '360 Degree Product Display'
      }
    };
    Logger.success('Analysis data ready');

    Logger.step(3, 'Calling API: generateMultiVideoSequence()...');
    const response = await axios.post(
      `${BASE_URL}/generate-multi-video-sequence`,
      {
        sessionId: `${SESSION_ID}-product-showcase`,
        useCase: 'product-showcase',
        analysis: mockAnalysis,
        duration: 30,
        quality: 'high',
        aspectRatio: '16:9',
        videoProvider: 'google-flow'
      },
      { timeout: 600000 }
    );

    if (response.data.success) {
      const duration = Date.now() - startTime;
      Logger.success(`Generated ${response.data.data.videoCount} videos`);
      Logger.info(`Total duration: ${response.data.data.totalDuration}s`);
      Logger.info(`Frame chaining: ${response.data.data.frameChaining ? '✓ Enabled' : '✗ Disabled'}`);
      
      response.data.data.videos.forEach((video, idx) => {
        Logger.info(`  Video ${idx + 1}: ${video.filename} (${video.duration}s)`);
      });

      testResults.tests.push({
        name: testName,
        status: 'passed',
        duration: duration,
        result: response.data
      });

      return true;
    } else {
      Logger.error(response.data.error || 'Unknown error');
      testResults.tests.push({
        name: testName,
        status: 'failed',
        error: response.data.error,
        duration: Date.now() - startTime
      });
      return false;
    }
  } catch (error) {
    Logger.error(`Test failed: ${error.message}`);
    if (error.response?.data) {
      Logger.error(`API Error: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    testResults.tests.push({
      name: testName,
      status: 'failed',
      error: error.message,
      duration: Date.now() - startTime
    });
    return false;
  }
}

/**
 * Test 3: Styling Guide Use Case (3 videos, frame chaining)
 */
async function testStylingGuideUseCase() {
  Logger.section('Test 3: Styling Guide Use Case');
  Logger.info('3-video workflow with frame chaining');
  Logger.info('Scenario: Step-by-step styling guide (full look → top → bottom)');

  const startTime = Date.now();
  const testName = 'Styling Guide (3 videos + frame chaining)';

  try {
    Logger.step(1, 'Loading test images...');
    const refImage = loadImageAsBase64('anh-nhan-vat.jpeg');
    Logger.success('Images loaded');

    Logger.step(2, 'Preparing analysis data...');
    const mockAnalysis = {
      character: {
        bodyType: 'Hourglass',
        height: 'Average (5\'4"-5\'6")',
        skinTone: 'Fair',
        confidence: 0.85
      },
      product: {
        outfit: 'Business Casual Ensemble',
        components: ['Blazer', 'Blouse', 'Trousers', 'Heels'],
        colors: ['Charcoal', 'Cream', 'Gold Accessories']
      },
      recommendations: {
        scene: 'Professional Office Setting',
        lighting: 'Soft Professional Lighting',
        mood: 'Polished & Professional',
        style: 'Contemporary Business Casual',
        colorPalette: 'Neutral Professional',
        cameraAngle: 'Dynamic with Outfit Focus'
      }
    };
    Logger.success('Analysis data ready');

    Logger.step(3, 'Calling API: generateMultiVideoSequence()...');
    const response = await axios.post(
      `${BASE_URL}/generate-multi-video-sequence`,
      {
        sessionId: `${SESSION_ID}-styling-guide`,
        useCase: 'styling-guide',
        refImage: refImage,
        analysis: mockAnalysis,
        duration: 30,
        quality: 'high',
        aspectRatio: '9:16',
        videoProvider: 'google-flow'
      },
      { timeout: 600000 }
    );

    if (response.data.success) {
      const duration = Date.now() - startTime;
      Logger.success(`Generated ${response.data.data.videoCount} videos`);
      Logger.info(`Total duration: ${response.data.data.totalDuration}s`);
      Logger.info(`Frame chaining: ${response.data.data.frameChaining ? '✓ Enabled' : '✗ Disabled'}`);
      Logger.info(`Frame transitions: ${response.data.data.frameMetadata?.length || 0}`);
      
      response.data.data.videos.forEach((video, idx) => {
        Logger.info(`  Video ${idx + 1}: ${video.filename} (${video.duration}s)`);
        if (video.endFrame) {
          Logger.info(`    └─ End frame extracted for next segment`);
        }
      });

      testResults.tests.push({
        name: testName,
        status: 'passed',
        duration: duration,
        result: response.data
      });

      return true;
    } else {
      Logger.error(response.data.error || 'Unknown error');
      testResults.tests.push({
        name: testName,
        status: 'failed',
        error: response.data.error,
        duration: Date.now() - startTime
      });
      return false;
    }
  } catch (error) {
    Logger.error(`Test failed: ${error.message}`);
    if (error.response?.data) {
      Logger.error(`API Error: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    testResults.tests.push({
      name: testName,
      status: 'failed',
      error: error.message,
      duration: Date.now() - startTime
    });
    return false;
  }
}

// ========== MAIN TEST RUNNER ==========
async function runAllTests() {
  Logger.header('🎬 MULTI-VIDEO GENERATION - E2E TEST WITH REAL IMAGES');

  const globalStartTime = Date.now();

  try {
    // Verify environment
    verifyTestEnvironment();

    // Run tests
    Logger.header('Running Test Cases');
    
    const test1 = await testChangeClothesUseCase();
    Logger.info('');
    
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait between tests
    
    const test2 = await testProductShowcaseUseCase();
    Logger.info('');
    
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait between tests
    
    const test3 = await testStylingGuideUseCase();

    // Summary
    Logger.header('TEST SUMMARY');

    const totalTests = testResults.tests.length;
    const passedTests = testResults.tests.filter(t => t.status === 'passed').length;
    const failedTests = testResults.tests.filter(t => t.status === 'failed').length;

    Logger.info(`Total Tests Run: ${totalTests}`);
    Logger.success(`Passed: ${passedTests}`);
    if (failedTests > 0) {
      Logger.error(`Failed: ${failedTests}`);
    }

    // Show timing
    console.log(`\n${colors.bold}${colors.cyan}Timing Details:${colors.reset}`);
    testResults.tests.forEach(test => {
      const status = test.status === 'passed' ? colors.green + '✓' : colors.red + '✗';
      const duration = (test.duration / 1000).toFixed(2);
      console.log(`  ${status}${colors.reset} ${test.name}: ${duration}s`);
    });

    const totalDuration = ((Date.now() - globalStartTime) / 1000).toFixed(2);
    console.log(`\n${colors.bold}Total Duration: ${totalDuration}s${colors.reset}`);

    // Save test results
    testResults.endTime = new Date().toISOString();
    testResults.totalDuration = totalDuration;
    testResults.summary = {
      total: totalTests,
      passed: passedTests,
      failed: failedTests,
      successRate: `${((passedTests / totalTests) * 100).toFixed(2)}%`
    };

    const resultsPath = path.join(TEST_RESULTS_DIR, 'test-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(testResults, null, 2));

    Logger.success(`\nTest results saved to: ${resultsPath}`);

    // Exit with appropriate code
    process.exit(failedTests > 0 ? 1 : 0);

  } catch (error) {
    Logger.error(`Fatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run the tests
runAllTests();
