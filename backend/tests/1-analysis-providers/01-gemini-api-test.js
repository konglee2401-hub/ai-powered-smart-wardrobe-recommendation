import dotenv from 'dotenv';
dotenv.config();

import * as geminiService from './services/googleGeminiService.js';

async function testGemini() {
  console.log('🧪 Testing Google Gemini Integration\n');

  // Test 1: Check availability
  console.log('Test 1: Check availability');
  const isAvailable = geminiService.isGeminiAvailable();
  console.log(`Result: ${isAvailable ? '✅ Available' : '❌ Not available'}\n`);

  if (!isAvailable) {
    console.log('❌ Cannot proceed without API key');
    console.log('💡 Add to .env: GOOGLE_API_KEY=your_key_here');
    process.exit(1);
  }

  // Test 2: Test connection
  console.log('Test 2: Test connection');
  const connectionOk = await geminiService.testGeminiConnection();
  
  if (!connectionOk) {
    console.log('❌ Connection test failed');
    process.exit(1);
  }

  // Test 3: Get available models
  console.log('Test 3: Get available models');
  const models = await geminiService.getAvailableGeminiModels();
  console.log(`Found ${models.length} models`);
  
  // Show all models
  console.log('\n📋 All available models:');
  models.forEach((m, idx) => {
    console.log(`   ${idx + 1}. ${m.name}`);
    console.log(`      ID: ${m.id}`);
    console.log(`      Input limit: ${m.inputTokenLimit?.toLocaleString()} tokens`);
    console.log(`      Output limit: ${m.outputTokenLimit?.toLocaleString()} tokens`);
  });

  // Test 4: Get best model
  console.log('\nTest 4: Get best available model');
  const bestModel = await geminiService.getBestAvailableModel();
  console.log(`✅ Best model: ${bestModel.name} (${bestModel.id})\n`);

  // Test 5: Find model by friendly name
  console.log('Test 5: Find model by friendly name');
  const testNames = ['gemini-2.5-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'];
  
  for (const name of testNames) {
    const found = await geminiService.findModelByName(name);
    console.log(`   ${name} → ${found.id}`);
  }

  // Test 6: Analyze test image (if exists)
  console.log('\nTest 6: Analyze test image');
  const testImages = [
    'test-images/test.jpg',
    'test-images/anh-san-pham.png',
    'uploads/products/test.jpg'
  ];
  
  const fs = await import('fs/promises');
  let testImagePath = null;
  
  for (const imagePath of testImages) {
    try {
      await fs.access(imagePath);
      testImagePath = imagePath;
      break;
    } catch (err) {
      // Continue to next
    }
  }
  
  if (testImagePath) {
    console.log(`   Using image: ${testImagePath}`);
    
    try {
      const result = await geminiService.analyzeWithGemini(
        testImagePath,
        'Describe this image in detail.'
      );
      
      console.log('   ✅ Analysis successful');
      console.log(`   Response length: ${result.length} chars`);
      console.log(`   First 200 chars: ${result.substring(0, 200)}...\n`);
      
    } catch (error) {
      console.log(`   ❌ Analysis failed: ${error.message}\n`);
    }
    
  } else {
    console.log('   ⚠️  No test image found, skipping\n');
    console.log('   💡 Create test-images/test.jpg to test image analysis');
  }

  console.log('✅ ALL TESTS COMPLETED');
}

testGemini().catch(error => {
  console.error('\n❌ TEST FAILED:', error.message);
  process.exit(1);
});
