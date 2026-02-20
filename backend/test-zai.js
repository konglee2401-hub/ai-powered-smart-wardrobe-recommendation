import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { analyzeWithZAI } from './services/zaiService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const TEST_MODELS = [
  {
    name: 'GLM-4.6V-Flash',
    model: 'glm-4v-flash',
    description: 'FREE vision model',
    pricing: 'FREE 🆓'
  },
  {
    name: 'GLM-4.6V',
    model: 'glm-4v',
    description: 'Paid vision model',
    pricing: 'PAID 💵 ($0.3/$0.9 per 1M tokens)'
  },
  {
    name: 'GLM-4.5V',
    model: 'glm-4v-plus',
    description: 'Premium vision model',
    pricing: 'PAID 💵 ($0.6/$1.8 per 1M tokens)'
  }
];

const TEST_PROMPT = `Analyze this character image and provide detailed information in JSON format:
{
  "name": "character name",
  "series": "anime/game series",
  "personality": "brief personality description",
  "style": "fashion style keywords",
  "colors": ["main", "colors", "used"],
  "features": ["distinctive", "visual", "features"]
}`;

async function runTests() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 Z.AI VISION MODELS TEST');
  console.log('='.repeat(80) + '\n');

  // Test 1: Check API key
  console.log('📋 Test 1: Check Z.AI API availability');
  if (!process.env.ZAI_API_KEY) {
    console.log('   Result: ❌ Not configured\n');
    console.log('❌ ERROR: ZAI_API_KEY not found in .env file\n');
    console.log('Please add to .env:');
    console.log('ZAI_API_KEY=your_api_key_here\n');
    console.log('Get your API key from: https://platform.z.ai/api-keys\n');
    process.exit(1);
  }
  console.log('   Result: ✅ Available\n');

  // Test 2: Find test image
  console.log('📋 Test 2: Find test image');
  const possiblePaths = [
    path.join(__dirname, 'test-images', 'anh-nhan-vat.jpeg'),
    path.join(__dirname, 'temp', 'test-image.jpg'),
    path.join(__dirname, 'temp', 'anh-nhan-vat.jpeg'),
    path.join(__dirname, 'test-images', 'test-product.jpg')
  ];

  let testImagePath = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      testImagePath = p;
      break;
    }
  }

  if (!testImagePath) {
    console.log('   ❌ No test image found\n');
    console.log('Please place a test image at one of:');
    possiblePaths.forEach(p => console.log(`   - ${p}`));
    console.log('');
    process.exit(1);
  }

  console.log(`   ✅ Found test image: ${path.relative(__dirname, testImagePath)}\n`);

  // Test 3: Test all models
  console.log('📋 Test 3: Test all Z.AI vision models');
  console.log('='.repeat(80) + '\n');

  const results = {
    total: TEST_MODELS.length,
    success: 0,
    failed: 0,
    details: []
  };

  for (const modelConfig of TEST_MODELS) {
    console.log(`🔬 Testing: ${modelConfig.name}`);
    console.log(`   📝 Description: ${modelConfig.description}`);
    console.log(`   💰 Pricing: ${modelConfig.pricing}\n`);

    try {
      const startTime = Date.now();

      const result = await analyzeWithZAI(
        testImagePath,
        TEST_PROMPT,
        { model: modelConfig.model }
      );

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      console.log(`   ✅ SUCCESS`);
      console.log(`   ⏱️  Duration: ${duration}s`);
      console.log(`   📏 Response length: ${result.length} characters\n`);
      console.log('   📄 Response preview:');
      console.log('   ' + '-'.repeat(76));
      console.log('   ' + result.slice(0, 500).replace(/\n/g, '\n   '));
      if (result.length > 500) {
        console.log('   ... (truncated)');
      }
      console.log('   ' + '-'.repeat(76));

      results.success++;
      results.details.push({
        model: modelConfig.name,
        status: 'success',
        duration
      });

    } catch (error) {
      console.log(`   ❌ FAILED`);
      console.log(`   Error: ${error.message}\n`);

      results.failed++;
      results.details.push({
        model: modelConfig.name,
        status: 'failed',
        error: error.message
      });
    }

    console.log('='.repeat(80) + '\n');
  }

  // Summary
  console.log('📊 TEST SUMMARY');
  console.log('-'.repeat(40));
  console.log(`   Total models: ${results.total}`);
  console.log(`   ✅ Successful: ${results.success}`);
  console.log(`   ❌ Failed: ${results.failed}\n`);

  if (results.details.length > 0) {
    console.log('📋 Model Details:');
    results.details.forEach(detail => {
      if (detail.status === 'success') {
        console.log(`   ✅ ${detail.model}: ${detail.duration}s`);
      } else {
        console.log(`   ❌ ${detail.model}: ${detail.error}`);
      }
    });
    console.log('');
  }

  if (results.success === results.total) {
    console.log('✅ ALL TESTS PASSED\n');
    process.exit(0);
  } else if (results.success > 0) {
    console.log('⚠️  SOME TESTS FAILED\n');
    process.exit(1);
  } else {
    console.log('❌ ALL TESTS FAILED\n');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('\n❌ FATAL ERROR:', error.message);
  console.error('\nStack trace:');
  console.error(error.stack);
  process.exit(1);
});
