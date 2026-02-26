#!/usr/bin/env node

/**
 * Test Script for Google Flow Video Generation
 * Tests the googleFlowAutomationService with video type
 */

import { runVideoGeneration } from '../../services/googleFlowAutomationService.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Test image paths
const TEST_IMAGE = path.join(__dirname, '../../test-images/anh-nhan-vat.jpeg');

// Test configurations
const TEST_CASES = [
  {
    name: '5s Video - High Quality - 16:9 (Widescreen)',
    options: {
      imagePath: TEST_IMAGE,
      prompt: 'A model wearing a red dress walking through a modern city street, sunny day, cinematic lighting, professional fashion photography style',
      duration: 5,
      quality: 'high',
      aspectRatio: '16:9',
      outputDir: path.join(__dirname, 'test-results/flow-video-test-1')
    }
  },
  {
    name: 'Short 3s Video - Medium Quality - 9:16 (Portrait)',
    options: {
      imagePath: TEST_IMAGE,
      prompt: 'Fashion lifestyle video: woman in summer outfit, close-up shots, natural lighting, movement and flow',
      duration: 3,
      quality: 'medium',
      aspectRatio: '9:16',
      outputDir: path.join(__dirname, 'test-results/flow-video-test-2')
    }
  },
  {
    name: 'Product Showcase - 10s - High Quality - 1:1 (Square)',
    options: {
      imagePath: TEST_IMAGE,
      prompt: 'Product showcase video: beautiful dress on mannequin, rotating view, studio lighting, smooth transitions',
      duration: 10,
      quality: 'high',
      aspectRatio: '1:1',
      outputDir: path.join(__dirname, 'test-results/flow-video-test-3')
    }
  }
];

// Helper function to print test result
function printTestResult(testName, success, result, error = null) {
  console.log('\n' + '='.repeat(80));
  if (success) {
    console.log(`✅ TEST PASSED: ${testName}`);
    console.log('='.repeat(80));
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`❌ TEST FAILED: ${testName}`);
    console.log('='.repeat(80));
    console.log(`Error: ${error?.message || 'Unknown error'}`);
    if (error?.stack) {
      console.log(`Stack: ${error.stack}`);
    }
  }
}

// Main test runner
async function runTests() {
  console.log('\n');
  console.log('╔' + '='.repeat(78) + '╗');
  console.log('║' + ' '.repeat(20) + '🎬 GOOGLE FLOW VIDEO GENERATION TEST' + ' '.repeat(22) + '║');
  console.log('╚' + '='.repeat(78) + '╝');
  console.log(`\n📊 Total test cases: ${TEST_CASES.length}`);
  console.log(`⏱️  Start time: ${new Date().toLocaleString()}\n`);

  const results = [];
  let passedCount = 0;
  let failedCount = 0;

  // Run each test case
  for (let i = 0; i < TEST_CASES.length; i++) {
    const testCase = TEST_CASES[i];
    const testNumber = i + 1;

    console.log(`\n🔄 Running Test ${testNumber}/${TEST_CASES.length}...`);
    console.log(`   📝 Name: ${testCase.name}`);
    console.log(`   ⏱️  Duration: ${testCase.options.duration}s`);
    console.log(`   ✨ Quality: ${testCase.options.quality}`);
    console.log(`   📐 Aspect Ratio: ${testCase.options.aspectRatio}`);

    try {
      const result = await runVideoGeneration(testCase.options);

      if (result.success) {
        passedCount++;
        printTestResult(testCase.name, true, result);
        results.push({
          testNumber,
          name: testCase.name,
          status: 'PASSED',
          result
        });
      } else {
        failedCount++;
        printTestResult(testCase.name, false, result, new Error(result.error));
        results.push({
          testNumber,
          name: testCase.name,
          status: 'FAILED',
          error: result.error
        });
      }
    } catch (error) {
      failedCount++;
      printTestResult(testCase.name, false, null, error);
      results.push({
        testNumber,
        name: testCase.name,
        status: 'ERROR',
        error: error.message
      });
    }

    // Wait between tests to avoid rate limiting
    if (i < TEST_CASES.length - 1) {
      console.log('\n⏸️  Waiting 5 seconds before next test...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  // Print summary
  console.log('\n\n');
  console.log('╔' + '='.repeat(78) + '╗');
  console.log('║' + ' '.repeat(28) + '📊 TEST SUMMARY' + ' '.repeat(35) + '║');
  console.log('╚' + '='.repeat(78) + '╝\n');

  console.log(`Total Tests: ${TEST_CASES.length}`);
  console.log(`✅ Passed: ${passedCount}`);
  console.log(`❌ Failed: ${failedCount}`);
  console.log(`Success Rate: ${((passedCount / TEST_CASES.length) * 100).toFixed(1)}%`);

  console.log('\n📋 Test Results:');
  results.forEach((result, idx) => {
    const statusIcon = result.status === 'PASSED' ? '✅' : '❌';
    console.log(`${statusIcon} Test ${result.testNumber}: ${result.name} - ${result.status}`);
    if (result.error) {
      console.log(`   └─ Error: ${result.error}`);
    }
  });

  console.log(`\n⏱️  End time: ${new Date().toLocaleString()}`);
  console.log('\n');

  return failedCount === 0;
}

// Run tests
runTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Test runner error:', error);
    process.exit(1);
  });
