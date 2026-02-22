#!/usr/bin/env node

/**
 * Multi-Video Generation - Comprehensive Test Script
 * Tests the complete multi-video workflow with frame chaining and content use cases
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BASE_URL = 'http://localhost:3001/api/browser';
const SESSION_ID = `test-multi-video-${Date.now()}`;
const TEST_RESULTS_DIR = path.join(__dirname, '..', '..', 'test-results', SESSION_ID);

// Colors for console output
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
  tests: []
};

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
}

/**
 * Create sample image for testing
 */
function createSampleImage(width = 400, height = 400) {
  // Return a simple base64 encoded 1x1 pixel image
  // In reality, you'd use actual reference images
  const pixelData = Buffer.alloc(width * height * 3);
  pixelData.fill(100); // Fill with gray
  
  // Convert to JPEG-like base64 (simplified for testing)
  const base64 = pixelData.toString('base64');
  return `data:image/jpeg;base64,${base64}`;
}

/**
 * Test 1: Change Clothes Use Case (2 videos with frame chaining)
 */
async function testChangeClothesUseCase() {
  Logger.section('Test 1: Change Clothes Use Case');
  Logger.info('Testing 2-video workflow with frame chaining');

  try {
    const mockAnalysis = {
      character: {
        bodyType: 'Athletic',
        skinTone: 'Medium',
        height: 'Tall',
        confidence: 0.92
      },
      product: {
        category: 'Casual Outfit',
        colors: ['Navy Blue', 'White'],
        material: 'Cotton, Linen',
        style: 'Casual'
      },
      recommendations: {
        scene: 'Modern Indoor',
        lighting: 'Natural Window Light',
        mood: 'Confident & Friendly',
        style: 'Contemporary Casual',
        cameraAngle: 'Full Body at Eye Level'
      }
    };

    const response = await axios.post(`${BASE_URL}/generate-multi-video-sequence`, {
      sessionId: `${SESSION_ID}-change-clothes`,
      useCase: 'change-clothes',
      refImage: createSampleImage(),
      analysis: mockAnalysis,
      duration: 20,
      quality: 'high',
      aspectRatio: '9:16',
      videoProvider: 'google-flow'
    });

    if (response.data.success) {
      Logger.success(`Generated ${response.data.data.videoCount} videos for change-clothes workflow`);
      Logger.info(`Total duration: ${response.data.data.totalDuration}s`);
      Logger.info(`Frame chaining: ${response.data.data.frameChaining ? 'Enabled' : 'Disabled'}`);
      
      response.data.data.videos.forEach((video, idx) => {
        Logger.info(`Video ${idx + 1}: ${video.filename} (${video.duration}s)`);
      });

      testResults.tests.push({
        name: 'Change Clothes Use Case',
        status: 'passed',
        result: response.data
      });

      return true;
    } else {
      Logger.error(response.data.error);
      testResults.tests.push({
        name: 'Change Clothes Use Case',
        status: 'failed',
        error: response.data.error
      });
      return false;
    }
  } catch (error) {
    Logger.error(`Test failed: ${error.message}`);
    testResults.tests.push({
      name: 'Change Clothes Use Case',
      status: 'failed',
      error: error.message
    });
    return false;
  }
}

/**
 * Test 2: Product Showcase Use Case (3 videos independent)
 */
async function testProductShowcaseUseCase() {
  Logger.section('Test 2: Product Showcase Use Case');
  Logger.info('Testing 3-video workflow without frame chaining');

  try {
    const mockAnalysis = {
      character: {
        role: 'Brand Ambassador'
      },
      product: {
        name: 'Premium Sneakers',
        category: 'Footwear',
        colors: ['White', 'Black Accents'],
        material: 'Premium Leather, Memory Foam',
        features: ['Comfortable', 'Stylish', 'Durable']
      },
      recommendations: {
        scene: 'Modern Studio',
        lighting: 'Professional Studio Lights',
        mood: 'Premium & Aspirational',
        style: 'Luxury Casual',
        cameraAngle: '360 degree product display'
      }
    };

    const response = await axios.post(`${BASE_URL}/generate-multi-video-sequence`, {
      sessionId: `${SESSION_ID}-product-showcase`,
      useCase: 'product-showcase',
      analysis: mockAnalysis,
      duration: 30,
      quality: 'high',
      aspectRatio: '16:9',
      videoProvider: 'google-flow'
    });

    if (response.data.success) {
      Logger.success(`Generated ${response.data.data.videoCount} videos for product-showcase workflow`);
      Logger.info(`Total duration: ${response.data.data.totalDuration}s`);
      Logger.info(`Frame chaining: ${response.data.data.frameChaining ? 'Enabled' : 'Disabled'}`);
      
      response.data.data.videos.forEach((video, idx) => {
        Logger.info(`Video ${idx + 1}: ${video.filename} (${video.duration}s)`);
      });

      testResults.tests.push({
        name: 'Product Showcase Use Case',
        status: 'passed',
        result: response.data
      });

      return true;
    } else {
      Logger.error(response.data.error);
      testResults.tests.push({
        name: 'Product Showcase Use Case',
        status: 'failed',
        error: response.data.error
      });
      return false;
    }
  } catch (error) {
    Logger.error(`Test failed: ${error.message}`);
    testResults.tests.push({
      name: 'Product Showcase Use Case',
      status: 'failed',
      error: error.message
    });
    return false;
  }
}

/**
 * Test 3: Styling Guide Use Case (3 videos with frame chaining)
 */
async function testStylingGuideUseCase() {
  Logger.section('Test 3: Styling Guide Use Case');
  Logger.info('Testing 3-video workflow with frame chaining for styling steps');

  try {
    const mockAnalysis = {
      character: {
        bodyType: 'Hourglass',
        height: 'Medium',
        skinTone: 'Fair'
      },
      product: {
        outfit: 'Business Casual Ensemble',
        components: ['Blazer', 'Blouse', 'Trousers', 'Heels']
      },
      recommendations: {
        scene: 'Professional Setting',
        lighting: 'Soft Professional Lighting',
        mood: 'Polished & Professional',
        style: 'Contemporary Business',
        cameraAngle: 'Dynamic with outfit focus'
      }
    };

    const response = await axios.post(`${BASE_URL}/generate-multi-video-sequence`, {
      sessionId: `${SESSION_ID}-styling-guide`,
      useCase: 'styling-guide',
      refImage: createSampleImage(),
      analysis: mockAnalysis,
      duration: 30,
      quality: 'high',
      aspectRatio: '9:16',
      videoProvider: 'google-flow'
    });

    if (response.data.success) {
      Logger.success(`Generated ${response.data.data.videoCount} videos for styling-guide workflow`);
      Logger.info(`Total duration: ${response.data.data.totalDuration}s`);
      Logger.info(`Frame chaining: ${response.data.data.frameChaining ? 'Enabled' : 'Disabled'}`);
      Logger.info(`Frame transitions: ${response.data.data.frameMetadata?.length || 0}`);
      
      response.data.data.videos.forEach((video, idx) => {
        Logger.info(`Video ${idx + 1}: ${video.filename} (${video.duration}s)`);
      });

      testResults.tests.push({
        name: 'Styling Guide Use Case',
        status: 'passed',
        result: response.data
      });

      return true;
    } else {
      Logger.error(response.data.error);
      testResults.tests.push({
        name: 'Styling Guide Use Case',
        status: 'failed',
        error: response.data.error
      });
      return false;
    }
  } catch (error) {
    Logger.error(`Test failed: ${error.message}`);
    testResults.tests.push({
      name: 'Styling Guide Use Case',
      status: 'failed',
      error: error.message
    });
    return false;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  Logger.header('MULTI-VIDEO GENERATION - COMPREHENSIVE TEST SUITE');
  Logger.info(`Session ID: ${SESSION_ID}`);
  Logger.info(`Test Results Directory: ${TEST_RESULTS_DIR}`);

  const startTime = Date.now();

  // Run tests
  const test1 = await testChangeClothesUseCase();
  const test2 = await testProductShowcaseUseCase();
  const test3 = await testStylingGuideUseCase();

  // Summary
  Logger.header('TEST SUMMARY');

  const totalTests = testResults.tests.length;
  const passedTests = testResults.tests.filter(t => t.status === 'passed').length;
  const failedTests = testResults.tests.filter(t => t.status === 'failed').length;

  Logger.info(`Total Tests: ${totalTests}`);
  Logger.success(`Passed: ${passedTests}`);
  if (failedTests > 0) {
    Logger.error(`Failed: ${failedTests}`);
  }

  // Save test results
  testResults.endTime = new Date().toISOString();
  testResults.duration = ((Date.now() - startTime) / 1000).toFixed(2);
  testResults.summary = {
    total: totalTests,
    passed: passedTests,
    failed: failedTests,
    successRate: `${((passedTests / totalTests) * 100).toFixed(2)}%`
  };

  const resultsPath = path.join(TEST_RESULTS_DIR, 'test-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(testResults, null, 2));

  Logger.success(`Test results saved to: ${resultsPath}`);

  // Exit with status
  process.exit(failedTests > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  Logger.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
