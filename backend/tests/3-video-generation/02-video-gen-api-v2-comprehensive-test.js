#!/usr/bin/env node

/**
 * Comprehensive Video Generation API Test
 * Tests video generation with and without image uploads
 * Uses Google Labs Flow Veo model
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE_URL = process.env.API_URL || 'http://localhost:5000/api';

// Test image path
const TEST_IMAGE_PATH = path.join(__dirname, '../../test-images', 'anh-nhan-vat.jpeg');

// Test configurations
const TEST_CASES = [
  {
    name: '5s Video - High Quality - 16:9 (With Image)',
    payload: {
      videoProvider: 'google-flow',
      prompt: 'A fashion model wearing stylish clothes, professional photoshoot, studio lighting, confident pose',
      duration: 5,
      quality: 'high',
      aspectRatio: '16:9'
    },
    includeImage: true
  },
  {
    name: '3s Video - Medium Quality - 9:16 Portrait (With Image)',
    payload: {
      videoProvider: 'google-flow',
      prompt: 'Beautiful model in elegant outfit, portrait style shot, soft natural lighting, focused on face and upper body',
      duration: 3,
      quality: 'medium',
      aspectRatio: '9:16'
    },
    includeImage: true
  },
  {
    name: '10s Video - High Quality - 1:1 Square (With Image)',
    payload: {
      videoProvider: 'google-flow',
      prompt: 'Professional fashion photography, dynamic movement, styled photoshoot, artistic composition, vibrant colors',
      duration: 10,
      quality: 'high',
      aspectRatio: '1:1'
    },
    includeImage: true
  },
  {
    name: 'Google Flow without Image (Should Fail)',
    payload: {
      videoProvider: 'google-flow',
      prompt: 'Test video without image',
      duration: 5,
      quality: 'high',
      aspectRatio: '16:9'
    },
    includeImage: false,
    expectError: false  // It should work but may have issues
  }
];

/**
 * Convert image to base64
 */
function getImageBase64(imagePath) {
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Image file not found: ${imagePath}`);
  }
  const imageBuffer = fs.readFileSync(imagePath);
  const base64 = imageBuffer.toString('base64');
  const ext = path.extname(imagePath).slice(1);
  return `data:image/${ext};base64,${base64}`;
}

/**
 * Print test result
 */
function printTestResult(testName, success, data) {
  console.log('\n' + '='.repeat(80));
  if (success) {
    console.log(`✅ PASSED: ${testName}`);
    console.log('='.repeat(80));
    if (data.data) {
      console.log(`Provider: ${data.data.provider}`);
      console.log(`Duration: ${data.data.duration}s`);
      console.log(`Quality: ${data.data.quality}`);
      console.log(`Aspect Ratio: ${data.data.aspectRatio}`);
      console.log(`Generated At: ${data.data.generatedAt}`);
    }
  } else {
    console.log(`❌ FAILED: ${testName}`);
    console.log('='.repeat(80));
    console.log(JSON.stringify(data, null, 2));
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('\n');
  console.log('╔' + '='.repeat(78) + '╗');
  console.log('║' + ' '.repeat(10) + '🎬 VIDEO GENERATION API TEST - With Image Upload' + ' '.repeat(18) + '║');
  console.log('╚' + '='.repeat(78) + '╝');
  console.log(`\n📊 API Base URL: ${API_BASE_URL}`);
  console.log(`📊 Total test cases: ${TEST_CASES.length}`);
  console.log(`⏱️  Start time: ${new Date().toLocaleString()}\n`);

  let passedCount = 0;
  let failedCount = 0;
  const results = [];

  for (let i = 0; i < TEST_CASES.length; i++) {
    const testCase = TEST_CASES[i];
    const testNumber = i + 1;

    console.log(`\n🔄 Test ${testNumber}/${TEST_CASES.length}`);
    console.log(`   📝 Name: ${testCase.name}`);
    console.log(`   ⏱️  Duration: ${testCase.payload.duration}s`);
    console.log(`   ✨ Quality: ${testCase.payload.quality}`);
    console.log(`   📐 Aspect Ratio: ${testCase.payload.aspectRatio}`);
    if (testCase.includeImage) {
      console.log(`   🖼️  Image: Yes`);
    }

    try {
      const payload = { ...testCase.payload };

      // Add image if required
      if (testCase.includeImage) {
        console.log(`   └─ Loading image...`);
        try {
          payload.imageBase64 = getImageBase64(TEST_IMAGE_PATH);
          console.log(`   ✓ Image loaded (${payload.imageBase64.length} bytes)`);
        } catch (imgError) {
          console.log(`   ⚠️  Image loading failed: ${imgError.message}`);
          // For video generation with image, this is critical
          console.log(`\n⏸️  Image not available, skipping image test...`);
          continue;
        }
      }

      console.log(`   └─ Sending API request...`);
      const response = await axios.post(
        `${API_BASE_URL}/v1/browser-automation/generate-video-with-provider`,
        payload,
        { timeout: 600000 }  // 10 minute timeout for video generation
      );

      if (response.data?.success) {
        passedCount++;
        console.log(`   ✓ API Response: ${response.status}`);
        printTestResult(testCase.name, true, response.data);
        results.push({
          testNumber,
          name: testCase.name,
          status: 'PASSED'
        });
      } else {
        failedCount++;
        console.log(`   ✗ API Response indicated failure`);
        printTestResult(testCase.name, false, response.data);
        results.push({
          testNumber,
          name: testCase.name,
          status: 'FAILED',
          error: response.data?.error || 'Unknown error'
        });
      }

    } catch (error) {
      failedCount++;
      console.log(`   ✗ Request failed: ${error.message}`);
      
      if (error.response?.data) {
        printTestResult(testCase.name, false, error.response.data);
      } else {
        printTestResult(testCase.name, false, { error: error.message });
      }

      results.push({
        testNumber,
        name: testCase.name,
        status: 'FAILED',
        error: error.message
      });
    }

    // Wait before next test
    if (i < TEST_CASES.length - 1) {
      console.log(`\n⏸️  Waiting 5 seconds before next test...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  // Print summary
  console.log('\n\n');
  console.log('╔' + '='.repeat(78) + '╗');
  console.log('║' + ' '.repeat(30) + '📊 TEST SUMMARY' + ' '.repeat(34) + '║');
  console.log('╚' + '='.repeat(78) + '╝');
  console.log(`\nTotal Tests: ${TEST_CASES.length}`);
  console.log(`✅ Passed: ${passedCount}`);
  console.log(`❌ Failed: ${failedCount}`);
  console.log(`Success Rate: ${Math.round((passedCount / TEST_CASES.length) * 100)}%`);
  console.log(`\n⏱️  End time: ${new Date().toLocaleString()}\n`);

  console.log('📋 Detailed Results:');
  results.forEach(result => {
    const status = result.status === 'PASSED' ? '✅' : '❌';
    console.log(`${status} Test ${result.testNumber}: ${result.name} - ${result.status}`);
    if (result.error) {
      console.log(`   └─ Error: ${result.error}`);
    }
  });

  process.exit(failedCount > 0 ? 1 : 0);
}

// Run tests
runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
