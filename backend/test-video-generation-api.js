#!/usr/bin/env node

/**
 * Integration Test for Video Generation API
 * Tests the /generate-video-with-provider endpoint
 */

import axios from 'axios';

const API_BASE_URL = process.env.API_URL || 'http://localhost:5000/api';

// Test configurations
const TEST_CASES = [
  {
    name: 'Grok Video Generation (Default)',
    payload: {
      videoProvider: 'grok',
      prompt: 'A woman wearing a green jacket walking on a sunny beach, relaxed vibe, natural lighting',
      duration: 5,
      quality: 'high',
      aspectRatio: '16:9'
    }
  },
  {
    name: 'Google Flow Video Generation',
    payload: {
      videoProvider: 'google-flow',
      prompt: 'Fashion model in elegant black dress, professional photoshoot, studio lighting, dramatic background',
      duration: 5,
      quality: 'high',
      aspectRatio: '16:9'
    }
  },
  {
    name: 'Short Video - Google Flow',
    payload: {
      videoProvider: 'google-flow',
      prompt: 'Quick product showcase: stylish sneakers on person, dynamic angles, movement',
      duration: 3,
      quality: 'medium',
      aspectRatio: '9:16'
    }
  },
  {
    name: 'Invalid Provider Test (Should Fail)',
    payload: {
      videoProvider: 'invalid-provider',
      prompt: 'Test prompt',
      duration: 5,
      quality: 'high',
      aspectRatio: '16:9'
    },
    expectError: true
  },
  {
    name: 'Missing Prompt Test (Should Fail)',
    payload: {
      videoProvider: 'grok',
      duration: 5,
      quality: 'high',
      aspectRatio: '16:9'
    },
    expectError: true
  }
];

// Helper function to print test result
function printTestResult(testName, success, responseData, error = null) {
  console.log('\n' + '='.repeat(80));
  if (success) {
    console.log(`✅ TEST PASSED: ${testName}`);
    console.log('='.repeat(80));
    console.log(JSON.stringify(responseData, null, 2));
  } else {
    console.log(`❌ TEST FAILED: ${testName}`);
    console.log('='.repeat(80));
    if (error?.response?.data) {
      console.log('Response:', JSON.stringify(error.response.data, null, 2));
    } else if (error?.message) {
      console.log(`Error: ${error.message}`);
    }
  }
}

// Main test runner
async function runTests() {
  console.log('\n');
  console.log('╔' + '='.repeat(78) + '╗');
  console.log('║' + ' '.repeat(15) + '🎬 VIDEO GENERATION API INTEGRATION TEST' + ' '.repeat(23) + '║');
  console.log('╚' + '='.repeat(78) + '╝');
  console.log(`\n📊 API Base URL: ${API_BASE_URL}`);
  console.log(`📊 Total test cases: ${TEST_CASES.length}`);
  console.log(`⏱️  Start time: ${new Date().toLocaleString()}\n`);

  const results = [];
  let passedCount = 0;
  let failedCount = 0;

  // Run each test case
  for (let i = 0; i < TEST_CASES.length; i++) {
    const testCase = TEST_CASES[i];
    const testNumber = i + 1;
    const expectError = testCase.expectError || false;

    console.log(`\n🔄 Running Test ${testNumber}/${TEST_CASES.length}...`);
    console.log(`   📝 Name: ${testCase.name}`);
    console.log(`   🎯 Provider: ${testCase.payload.videoProvider}`);
    if (testCase.payload.prompt) {
      console.log(`   📄 Prompt: ${testCase.payload.prompt.substring(0, 60)}...`);
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/v1/browser-automation/generate-video-with-provider`, testCase.payload, {
        timeout: 30000 // 30 second timeout
      });

      const success = response.data?.success;

      if (success) {
        if (expectError) {
          // Test was supposed to fail but succeeded
          failedCount++;
          console.log(`⚠️  Expected error but got success`);
          printTestResult(testCase.name, false, response.data, new Error('Expected error but succeeded'));
          results.push({
            testNumber,
            name: testCase.name,
            status: 'FAILED',
            error: 'Expected error but succeeded'
          });
        } else {
          passedCount++;
          printTestResult(testCase.name, true, response.data);
          results.push({
            testNumber,
            name: testCase.name,
            status: 'PASSED',
            data: response.data
          });
        }
      } else {
        if (expectError) {
          // Test was supposed to fail and it did
          passedCount++;
          console.log(`✅ Got expected error: ${response.data?.error}`);
          results.push({
            testNumber,
            name: testCase.name,
            status: 'PASSED (Error Expected)',
            error: response.data?.error
          });
        } else {
          failedCount++;
          printTestResult(testCase.name, false, response.data, new Error(response.data?.error));
          results.push({
            testNumber,
            name: testCase.name,
            status: 'FAILED',
            error: response.data?.error
          });
        }
      }
    } catch (error) {
      if (expectError) {
        // Test was supposed to fail and it did
        passedCount++;
        console.log(`✅ Got expected error: ${error.response?.data?.error || error.message}`);
        results.push({
          testNumber,
          name: testCase.name,
          status: 'PASSED (Error Expected)',
          error: error.response?.data?.error || error.message
        });
      } else {
        failedCount++;
        printTestResult(testCase.name, false, null, error);
        results.push({
          testNumber,
          name: testCase.name,
          status: 'ERROR',
          error: error.response?.data?.error || error.message
        });
      }
    }

    // Wait between tests
    if (i < TEST_CASES.length - 1) {
      console.log('\n⏸️  Waiting 3 seconds before next test...');
      await new Promise(resolve => setTimeout(resolve, 3000));
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
    const statusIcon = result.status.includes('PASSED') ? '✅' : '❌';
    console.log(`${statusIcon} Test ${result.testNumber}: ${result.name} - ${result.status}`);
    if (result.error) {
      console.log(`   └─ Error: ${result.error}`);
    }
  });

  console.log(`\n⏱️  End time: ${new Date().toLocaleString()}`);
  console.log('\n');

  return failedCount === 0;
}

// Check if API is running
async function checkAPI() {
  try {
    const response = await axios.get(`${API_BASE_URL.replace('/v1/browser-automation', '')}/health`, { timeout: 5000 }).catch(() => null);
    if (response && response.status === 200) {
      console.log(`✅ API is running at ${API_BASE_URL}`);
      return true;
    }
  } catch (error) {
    console.warn(`⚠️ Could not verify API health at ${API_BASE_URL}`);
    console.warn('   Make sure the backend server is running!');
  }
  return true; // Continue anyway
}

// Run tests
(async () => {
  const apiOk = await checkAPI();
  if (!apiOk) {
    console.error('❌ API is not responding. Please start the backend server.');
    process.exit(1);
  }

  const success = await runTests();
  process.exit(success ? 0 : 1);
})();
