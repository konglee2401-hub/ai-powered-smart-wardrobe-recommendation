#!/usr/bin/env node

/**
 * Debug script to trace image download count issue
 */

import axios from 'axios';

const API_URL = 'http://localhost:3000';

async function testGenerateImages() {
  try {
    console.log('\n════════════════════════════════════════════════════════════════');
    console.log('🔍 Debug - Testing Image Generation with 2 count');
    console.log('════════════════════════════════════════════════════════════════\n');

    const payload = {
      prompt: 'A beautiful Vietnamese woman wearing a blue dress, professional photoshoot, studio lighting',
      negativePrompt: 'blurry, low quality, distorted, pixelated',
      options: {
        imageCount: 2,
        aspectRatio: '9:16',
        hasWatermark: false
      }
    };

    console.log('📤 Sending request to backend:');
    console.log('   imageCount:', payload.options.imageCount);
    console.log('   aspectRatio:', payload.options.aspectRatio);
    console.log('   prompt length:', payload.prompt.length, 'chars\n');

    const response = await axios.post(`${API_URL}/v1/unified-flow/build-prompt-and-generate`, payload, {
      timeout: 300000 // 5 minutes for long generation
    });

    console.log('\n✅ Backend Response Received:');
    console.log('   Success:', response.data.success);
    console.log('   Message:', response.data.message);
    
    if (response.data.data?.generatedImages) {
      console.log('\n📊 Generated Images Array:');
      console.log('   Count:', response.data.data.generatedImages.length);
      console.log('   Expected:', response.data.data.expectedCount);
      console.log('   Details:');
      
      response.data.data.generatedImages.forEach((img, i) => {
        console.log(`     [${i + 1}] ${img.filename || 'N/A'}`);
        console.log(`         URL: ${img.url}`);
        console.log(`         Size: ${img.size} bytes`);
      });
    } else {
      console.log('❌ No generatedImages in response!');
      console.log('   Response data:', response.data);
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response?.data) {
      console.error('Backend Error:', error.response.data);
    }
  }
}

testGenerateImages();
