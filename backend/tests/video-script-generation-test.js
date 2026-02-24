/**
 * Test Script for Video Script Generation API
 * Verifies backend ChatGPT integration is working correctly
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api/video';

// Test data
const testConfig = {
  scenarioId: 'fashion-flow',
  style: 'smooth-elegant',
  duration: 20,
  segments: 3,
  productName: 'Summer Dress',
  productDescription: 'Elegant flowing summer dress in navy blue',
  productType: 'Dress',
  targetAudience: 'Fashion-forward women 18-35'
};

/**
 * Test 1: Health Check
 */
async function testHealthCheck() {
  console.log('\n🏥 Test 1: Health Check');
  console.log('='.repeat(50));
  
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Status:', response.status);
    console.log('📊 Response:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

/**
 * Test 2: Generate Video Script
 */
async function testGenerateScript() {
  console.log('\n🎬 Test 2: Generate Video Script');
  console.log('='.repeat(50));
  console.log('Request data:', JSON.stringify(testConfig, null, 2));
  
  try {
    const response = await axios.post(
      `${BASE_URL}/generate-video-scripts`,
      testConfig,
      {
        timeout: 30000 // 30 second timeout for ChatGPT call
      }
    );

    if (response.data.success) {
      console.log('✅ Success!');
      console.log('📊 Response structure:');
      console.log(`  - Scenario ID: ${response.data.data.scenarioId}`);
      console.log(`  - Style: ${response.data.data.style}`);
      console.log(`  - Duration: ${response.data.data.duration}s`);
      console.log(`  - Product: ${response.data.data.productData.name}`);
      console.log(`  - Segments: ${response.data.data.segments.length}`);
      
      if (response.data.data.segments && response.data.data.segments.length > 0) {
        console.log('\n📋 First Segment:');
        const seg = response.data.data.segments[0];
        console.log(`  - Name: ${seg.name}`);
        console.log(`  - Duration: ${seg.duration}s`);
        console.log(`  - Time Code: ${seg.timeCode}`);
        console.log(`  - Camera Work: ${seg.cameraWork}`);
        console.log(`  - Movements: ${seg.movements?.length || 0} items`);
      }
      
      return true;
    } else {
      console.error('❌ API returned error:', response.data.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Error:');
    if (error.response) {
      console.error('  Status:', error.response.status);
      console.error('  Data:', error.response.data);
    } else if (error.request) {
      console.error('  No response received');
    } else {
      console.error('  Error:', error.message);
    }
    return false;
  }
}

/**
 * Test 3: Generate Script Variations
 */
async function testGenerateVariations() {
  console.log('\n🎨 Test 3: Generate Script Variations');
  console.log('='.repeat(50));
  
  try {
    const response = await axios.post(
      `${BASE_URL}/generate-script-variations`,
      {
        ...testConfig,
        variationCount: 2 // Only 2 variations for faster testing
      },
      {
        timeout: 60000 // 60 second timeout for multiple ChatGPT calls
      }
    );

    if (response.data.success) {
      console.log('✅ Success!');
      console.log(`📊 Generated ${response.data.data.count} variations`);
      response.data.data.variations.forEach((v, i) => {
        console.log(`  Variation ${i + 1}: ${v.segments?.length || 0} segments`);
      });
      return true;
    } else {
      console.error('❌ API returned error:', response.data.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

/**
 * Test 4: Generate Camera Guide
 */
async function testGenerateCameraGuide() {
  console.log('\n📹 Test 4: Generate Camera Guide');
  console.log('='.repeat(50));
  
  try {
    const response = await axios.post(
      `${BASE_URL}/generate-camera-guide`,
      testConfig,
      {
        timeout: 30000
      }
    );

    if (response.data.success) {
      console.log('✅ Success!');
      console.log('📊 Camera guide generated');
      console.log('Preview:', response.data.data?.substring(0, 200) + '...');
      return true;
    } else {
      console.error('❌ API returned error:', response.data.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

/**
 * Test 5: Generate Lighting Guide
 */
async function testGenerateLightingGuide() {
  console.log('\n💡 Test 5: Generate Lighting Guide');
  console.log('='.repeat(50));
  
  try {
    const response = await axios.post(
      `${BASE_URL}/generate-lighting-guide`,
      testConfig,
      {
        timeout: 30000
      }
    );

    if (response.data.success) {
      console.log('✅ Success!');
      console.log('📊 Lighting guide generated');
      const preview = response.data.data?.lightingGuide?.substring(0, 200) || 'Generated';
      console.log('Preview:', preview + '...');
      return true;
    } else {
      console.error('❌ API returned error:', response.data.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

/**
 * Test 6: Generate Music Guide
 */
async function testGenerateMusicGuide() {
  console.log('\n🎵 Test 6: Generate Music Guide');
  console.log('='.repeat(50));
  
  try {
    const response = await axios.post(
      `${BASE_URL}/generate-music-guide`,
      testConfig,
      {
        timeout: 30000
      }
    );

    if (response.data.success) {
      console.log('✅ Success!');
      console.log('📊 Music guide generated');
      const preview = response.data.data?.musicGuide?.substring(0, 200) || 'Generated';
      console.log('Preview:', preview + '...');
      return true;
    } else {
      console.error('❌ API returned error:', response.data.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('\n' + '='.repeat(50));
  console.log('🧪 VIDEO SCRIPT GENERATION API TESTS');
  console.log('='.repeat(50));
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Testing at: ${new Date().toISOString()}`);

  const results = {};

  results.healthCheck = await testHealthCheck();
  results.generateScript = await testGenerateScript();
  results.variations = await testGenerateVariations();
  results.cameraGuide = await testGenerateCameraGuide();
  results.lightingGuide = await testGenerateLightingGuide();
  results.musicGuide = await testGenerateMusicGuide();

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  
  let passCount = 0;
  Object.entries(results).forEach(([test, passed]) => {
    const icon = passed ? '✅' : '❌';
    console.log(`${icon} ${test}`);
    if (passed) passCount++;
  });

  console.log(`\nTotal: ${passCount}/${Object.keys(results).length} tests passed`);

  if (passCount === Object.keys(results).length) {
    console.log('\n🎉 All tests passed! Backend integration is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Check OPENAI_API_KEY and backend logs.');
  }

  console.log('\n');
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
