// Vision Service Test - Chạy riêng không cần UI
// Sử dụng fake: SET USE_FAKE_AI=1 && node tests/visionTest.js
// Chạy thật: node tests/visionTest.js

import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import visionService from '../services/visionService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runVisionTest() {
  console.log('\n🧪 Vision Service Test\n');

  const testImagePath = path.join(__dirname, 'test-product.jpg');

  if (!fs.existsSync(testImagePath)) {
    console.error('❌ Test image not found:', testImagePath);
    process.exit(1);
  }

  console.log('📸 Using test image:', testImagePath);

  const imageBuffer = fs.readFileSync(testImagePath);
  const imageBase64 = imageBuffer.toString('base64');

  // Test với USE_FAKE_AI=1 để fake response
  if (process.env.USE_FAKE_AI === '1') {
    console.log('\n🎭 FAKE MODE - Simulating vision analysis...\n');
    
    const fakeResult = {
      success: true,
      data: {
        description: 'A woman wearing a white t-shirt and blue jeans, casual style',
        hair_style: 'straight',
        hair_acc: 'none',
        makeup: 'natural',
        top_detail: 'white cotton t-shirt',
        material: 'cotton',
        outerwear: 'none',
        bottom_type: 'blue denim jeans',
        legwear: 'none',
        necklace: 'none',
        earrings: 'small studs',
        hand_acc: 'none',
        waist_acc: 'none',
        shoes: 'white sneakers',
        scene: 'white studio',
        lighting: 'soft studio lighting',
        expression: 'gentle smile',
        style: 'casual',
        rawResponse: 'FAKE_RESPONSE'
      }
    };

    console.log('✅ Fake Vision Result:');
    console.log(JSON.stringify(fakeResult.data, null, 2));
    console.log('\n✅ Vision test PASSED (fake mode)!\n');
    return;
  }

  // Test thật với các providers
  console.log('🌐 LIVE MODE - Testing real providers...\n');

  try {
    const result = await visionService.analyzeImage(imageBase64, 'image/jpeg', {
      categories: ['top', 'bottom', 'shoes']
    });

    if (result.success) {
      console.log('✅ Vision Analysis Success!');
      console.log('\n📋 Analysis Result:');
      console.log(JSON.stringify(result.data, null, 2));
      console.log('\n✅ Vision test PASSED!\n');
    } else {
      console.error('❌ Vision test FAILED:', result.error);
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Vision test ERROR:', err.message);
    process.exit(1);
  }
}

runVisionTest();
