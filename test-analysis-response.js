/**
 * Test script to verify analyzeWithBrowser response structure
 * Tests if characterProfile and productDetails are returned correctly
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';

const API_URL = 'http://localhost:5000';

async function testAnalysisResponse() {
  try {
    console.log('🧪 TEST: analyzeWithBrowser Response Structure\n');
    console.log('='.repeat(80));

    // Read test images
    const testImageDir = './test-images';
    if (!fs.existsSync(testImageDir)) {
      console.error('❌ test-images directory not found');
      process.exit(1);
    }

    // Find first 2 images
    const files = fs.readdirSync(testImageDir).filter(f => /\.(jpg|jpeg|png)$/i.test(f));
    if (files.length < 2) {
      console.error('❌ Need at least 2 test images in ./test-images');
      process.exit(1);
    }

    console.log(`\n📸 Test images found:`);
    console.log(`   1. ${files[0]}`);
    console.log(`   2. ${files[1]}`);

    // Prepare FormData
    const form = new FormData();
    
    form.append('characterImage', fs.createReadStream(path.join(testImageDir, files[0])), 'character.jpg');
    form.append('productImage', fs.createReadStream(path.join(testImageDir, files[1])), 'product.jpg');
    form.append('analysisProvider', 'grok');

    console.log(`\n📤 Sending request to /v1/browser-automation/analyze-browser...`);
    
    const response = await axios.post(
      `${API_URL}/v1/browser-automation/analyze-browser`,
      form,
      {
        headers: form.getHeaders(),
        timeout: 120000 // 2 minutes
      }
    );

    const { data } = response.data;
    
    console.log(`\n✅ Response received:`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Data keys: ${Object.keys(data).join(', ')}`);

    // Check structure
    console.log(`\n🔍 Response structure analysis:`);
    
    if (data.recommendations) {
      console.log(`   ✅ recommendations: ${typeof data.recommendations}`);
      const recKeys = Object.keys(data.recommendations);
      console.log(`      Keys: ${recKeys.join(', ')}`);
      
      if (data.recommendations.characterProfile) {
        console.log(`      ✅ characterProfile: ${Object.keys(data.recommendations.characterProfile).length} fields`);
        console.log(`         Fields: ${Object.keys(data.recommendations.characterProfile).join(', ')}`);
      } else {
        console.log(`      ❌ characterProfile: missing`);
      }
      
      if (data.recommendations.productDetails) {
        console.log(`      ✅ productDetails: ${Object.keys(data.recommendations.productDetails).length} fields`);
        console.log(`         Fields: ${Object.keys(data.recommendations.productDetails).join(', ')}`);
      } else {
        console.log(`      ❌ productDetails: missing`);
      }
    } else {
      console.log(`   ❌ recommendations: missing`);
    }

    // Check if data structure matches frontend expectations
    console.log(`\n📋 Frontend compatibility check:`);
    const hasCharProfile = data.recommendations?.characterProfile && Object.keys(data.recommendations.characterProfile).length > 0;
    const hasProdDetails = data.recommendations?.productDetails && Object.keys(data.recommendations.productDetails).length > 0;
    
    console.log(`   characterProfile available: ${hasCharProfile ? '✅' : '❌'}`);
    console.log(`   productDetails available: ${hasProdDetails ? '✅' : '❌'}`);

    if (hasCharProfile && hasProdDetails) {
      console.log(`\n✅ SUCCESS: Response structure is correct!`);
      console.log(`   Frontend should be able to display data.`);
    } else {
      console.log(`\n❌ ISSUE: Response structure incomplete`);
      if (!hasCharProfile) console.log(`   - Missing characterProfile data`);
      if (!hasProdDetails) console.log(`   - Missing productDetails data`);
    }

    // Save response for inspection
    const responseFile = `./test-response-${Date.now()}.json`;
    fs.writeFileSync(responseFile, JSON.stringify(data, null, 2));
    console.log(`\n💾 Full response saved to: ${responseFile}`);

    console.log(`\n${'='.repeat(80)}\n`);

  } catch (error) {
    console.error(`❌ Test failed:`, error.message);
    if (error.response?.data) {
      console.error(`   Response:`, error.response.data);
    }
    process.exit(1);
  }
}

testAnalysisResponse();
