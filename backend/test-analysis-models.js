import * as aiController from './controllers/aiController.js';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs/promises';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==================== TEST CONFIGURATION ====================

const TEST_CONFIG = {
  characterImage: path.join(__dirname, 'test-images', 'anh-nhan-vat.jpeg'),
  productImage: path.join(__dirname, 'test-images', 'Anh san pham.png'),
  
  prompts: {
    character: `Analyze this character image in detail. Describe:
1. Age and ethnicity
2. Facial features
3. Skin tone
4. Hair (length, color, style)
5. Body type
6. Overall style`,
    
    product: `Analyze this fashion product image in detail. Describe:
1. Type of outfit
2. Style and design
3. Colors
4. Materials
5. Fit
6. Suitable occasions`
  }
};

// ==================== TEST ALL ANALYSIS MODELS ====================

async function testAllAnalysisModels() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 COMPREHENSIVE ANALYSIS MODELS TEST');
  console.log('='.repeat(80));
  console.log(`Character image: ${TEST_CONFIG.characterImage}`);
  console.log(`Product image: ${TEST_CONFIG.productImage}`);
  
  // Check if test images exist
  try {
    await fs.access(TEST_CONFIG.characterImage);
    await fs.access(TEST_CONFIG.productImage);
    console.log('✅ Test images found');
  } catch (error) {
    console.error('❌ Test images not found!');
    console.error('Please add test images to backend/test-images/ folder');
    process.exit(1);
  }
  
  // Get available models
  console.log('\n' + '='.repeat(80));
  console.log('📊 CHECKING AVAILABLE MODELS');
  console.log('='.repeat(80));
  
  const mockReq = {};
  const mockRes = {
    json: (data) => {
      return data;
    }
  };
  
  const modelsResponse = await aiController.getAvailableModels(mockReq, mockRes);
  const models = modelsResponse.data.models;
  const availableModels = models.filter(m => m.available);
  
  console.log(`\n📊 Found ${models.length} total models`);
  console.log(`✅ Available: ${availableModels.length}`);
  console.log(`❌ Unavailable: ${models.length - availableModels.length}`);
  
  // Group by provider
  console.log('\n📊 By Provider:');
  const providers = {};
  models.forEach(m => {
    if (!providers[m.provider]) {
      providers[m.provider] = { total: 0, available: 0 };
    }
    providers[m.provider].total++;
    if (m.available) providers[m.provider].available++;
  });
  
  Object.entries(providers).forEach(([provider, stats]) => {
    console.log(`   ${provider}: ${stats.available}/${stats.total}`);
  });
  
  if (availableModels.length === 0) {
    console.log('\n❌ No models available! Please configure API keys in .env');
    process.exit(1);
  }
  
  // Test each available model
  console.log('\n' + '='.repeat(80));
  console.log('🧪 TESTING EACH MODEL');
  console.log('='.repeat(80));
  
  const results = [];
  
  for (const model of availableModels) {
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`🔍 Testing: ${model.name} (${model.provider})`);
    console.log(`   Priority: ${model.priority}`);
    if (model.pricing) console.log(`   Pricing: ${model.pricing}`);
    if (model.free) console.log(`   🆓 FREE`);
    if (model.browserAutomation) console.log(`   🌐 Browser automation`);
    console.log(`${'─'.repeat(80)}`);
    
    try {
      const startTime = Date.now();
      
      // Test with character image
      const mockReq = {
        file: {
          path: TEST_CONFIG.characterImage,
          size: (await fs.stat(TEST_CONFIG.characterImage)).size
        },
        body: {
          preferredModel: model.id
        }
      };
      
      const mockRes = {
        json: (data) => data,
        status: (code) => ({
          json: (data) => ({ status: code, ...data })
        })
      };
      
      const response = await aiController.analyzeCharacterImage(mockReq, mockRes);
      
      const duration = (Date.now() - startTime) / 1000;
      
      if (response.success) {
        console.log(`   ✅ SUCCESS in ${duration.toFixed(2)}s`);
        console.log(`   📊 Response length: ${JSON.stringify(response.data.analysis).length} chars`);
        
        results.push({
          model: model.name,
          provider: model.provider,
          success: true,
          duration: duration,
          responseLength: JSON.stringify(response.data.analysis).length
        });
      } else {
        throw new Error(response.message);
      }
      
    } catch (error) {
      console.log(`   ❌ FAILED: ${error.message}`);
      
      results.push({
        model: model.name,
        provider: model.provider,
        success: false,
        error: error.message
      });
    }
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Final summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`\n✅ Successful: ${successful.length}/${results.length}`);
  
  if (successful.length > 0) {
    console.log('\n🏆 Successful Models:');
    successful.forEach(r => {
      console.log(`   ✅ ${r.model} (${r.provider}): ${r.duration.toFixed(2)}s, ${r.responseLength} chars`);
    });
  }
  
  if (failed.length > 0) {
    console.log(`\n❌ Failed: ${failed.length}/${results.length}`);
    console.log('\n⚠️  Failed Models:');
    failed.forEach(r => {
      console.log(`   ❌ ${r.model} (${r.provider}): ${r.error}`);
    });
  }
  
  // Performance ranking
  if (successful.length > 0) {
    console.log('\n⚡ Performance Ranking (by speed):');
    const sorted = [...successful].sort((a, b) => a.duration - b.duration);
    sorted.forEach((r, i) => {
      console.log(`   ${i + 1}. ${r.model}: ${r.duration.toFixed(2)}s`);
    });
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('🎉 TEST COMPLETE');
  console.log('='.repeat(80) + '\n');
}

// ==================== TEST FALLBACK LOGIC ====================

async function testFallbackLogic() {
  console.log('\n' + '='.repeat(80));
  console.log('🔄 TESTING FALLBACK LOGIC');
  console.log('='.repeat(80));
  console.log('Testing with invalid model to trigger fallback...\n');
  
  try {
    const mockReq = {
      file: {
        path: TEST_CONFIG.characterImage,
        size: (await fs.stat(TEST_CONFIG.characterImage)).size
      },
      body: {
        preferredModel: 'invalid-model-that-does-not-exist'
      }
    };
    
    const mockRes = {
      json: (data) => data,
      status: (code) => ({
        json: (data) => ({ status: code, ...data })
      })
    };
    
    const response = await aiController.analyzeCharacterImage(mockReq, mockRes);
    
    if (response.success) {
      console.log('✅ Fallback logic worked!');
      console.log(`   Used model: ${response.data.modelName}`);
      console.log(`   Attempt count: ${response.data.attemptCount}`);
    } else {
      console.log('❌ Fallback logic failed');
    }
    
  } catch (error) {
    console.log('❌ Fallback test failed:', error.message);
  }
}

// ==================== MAIN TEST RUNNER ====================

async function runAllTests() {
  try {
    // Test all models
    await testAllAnalysisModels();
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test fallback logic
    await testFallbackLogic();
    
    console.log('\n✅ All tests completed!\n');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
runAllTests();
