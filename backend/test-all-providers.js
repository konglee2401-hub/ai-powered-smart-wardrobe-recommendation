import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { analyzeWithZAI } from './services/zaiService.js';
import { analyzeWithNVIDIA } from './services/nvidiaService.js';
import { analyzeWithMistral } from './services/mistralService.js';
import { analyzeWithGroq } from './services/groqService.js';
import { getKeyManager } from './utils/keyManager.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const TEST_PROVIDERS = [
  {
    name: 'Z.AI',
    service: analyzeWithZAI,
    models: [
      { name: 'GLM-4.6V-Flash', model: 'glm-4v-flash', pricing: 'FREE' }
    ]
  },
  {
    name: 'NVIDIA',
    service: analyzeWithNVIDIA,
    models: [
      { name: 'Llama 3.2 11B Vision', model: 'meta/llama-3.2-11b-vision-instruct', pricing: 'FREE' },
      { name: 'Phi-3.5 Vision', model: 'microsoft/phi-3.5-vision-instruct', pricing: 'FREE' }
    ]
  },
  {
    name: 'Mistral',
    service: analyzeWithMistral,
    models: [
      { name: 'Pixtral 12B', model: 'pixtral-12b-2409', pricing: 'TRIAL' }
    ]
  },
  {
    name: 'Groq',
    service: analyzeWithGroq,
    models: [
      { name: 'Llama 3.2 11B Vision', model: 'llama-3.2-11b-vision-preview', pricing: 'FREE' },
      { name: 'Llama 3.2 90B Vision', model: 'llama-3.2-90b-vision-preview', pricing: 'FREE' }
    ]
  }
];

const TEST_PROMPT = `Analyze this image and describe what you see. Include:
- Main subject
- Colors and style
- Notable features
- Overall mood`;

async function runTests() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 COMPREHENSIVE VISION API TEST');
  console.log('='.repeat(80) + '\n');

  // Find test image
  const possiblePaths = [
    path.join(__dirname, 'test-images', 'anh-nhan-vat.jpeg'),
    path.join(__dirname, 'test-images', 'anh-san-pham.png'),
    path.join(__dirname, 'temp', 'test-image.jpg')
  ];

  let testImagePath = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      testImagePath = p;
      break;
    }
  }

  if (!testImagePath) {
    console.log('❌ No test image found at:');
    possiblePaths.forEach(p => console.log(`   - ${p}`));
    process.exit(1);
  }

  console.log(`✅ Test image: ${path.relative(__dirname, testImagePath)}\n`);

  // Display key statistics
  console.log('📊 API KEY CONFIGURATION');
  console.log('='.repeat(80));
  
  const providers = ['zai', 'nvidia', 'mistral', 'groq'];
  for (const provider of providers) {
    try {
      const manager = getKeyManager(provider);
      const stats = manager.getStats();
      
      if (stats.totalKeys > 0) {
        console.log(`✅ ${provider.toUpperCase()}: ${stats.totalKeys} key(s) configured`);
      } else {
        console.log(`⚠️  ${provider.toUpperCase()}: No keys configured`);
      }
    } catch (e) {
      console.log(`❌ ${provider.toUpperCase()}: Error loading keys`);
    }
  }
  
  console.log('='.repeat(80) + '\n');

  // Test each provider
  const results = {
    total: 0,
    success: 0,
    failed: 0,
    details: []
  };

  for (const provider of TEST_PROVIDERS) {
    console.log('='.repeat(80));
    console.log(`🔬 TESTING: ${provider.name}`);
    console.log('='.repeat(80) + '\n');

    for (const modelConfig of provider.models) {
      results.total++;

      console.log(`📦 Model: ${modelConfig.name}`);
      console.log(`💰 Pricing: ${modelConfig.pricing}\n`);

      try {
        const startTime = Date.now();

        const result = await provider.service(
          testImagePath,
          TEST_PROMPT,
          { model: modelConfig.model }
        );

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        console.log(`\n✅ SUCCESS`);
        console.log(`⏱️  Duration: ${duration}s`);
        console.log(`📏 Response: ${result.length} chars\n`);

        results.success++;
        results.details.push({
          provider: provider.name,
          model: modelConfig.name,
          status: 'success',
          duration
        });

      } catch (error) {
        console.log(`\n❌ FAILED`);
        console.log(`Error: ${error.message}\n`);

        results.failed++;
        results.details.push({
          provider: provider.name,
          model: modelConfig.name,
          status: 'failed',
          error: error.message
        });
      }

      console.log('-'.repeat(80) + '\n');
    }
  }

  // Summary
  console.log('='.repeat(80));
  console.log('📊 FINAL SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total tests: ${results.total}`);
  console.log(`✅ Successful: ${results.success}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Success rate: ${((results.success / results.total) * 100).toFixed(1)}%\n`);

  console.log('📋 Detailed Results:');
  results.details.forEach((detail, idx) => {
    const status = detail.status === 'success' ? '✅' : '❌';
    const info = detail.status === 'success' 
      ? `${detail.duration}s`
      : detail.error.slice(0, 50);
    console.log(`${idx + 1}. ${status} ${detail.provider} - ${detail.model}: ${info}`);
  });

  console.log('\n' + '='.repeat(80) + '\n');

  process.exit(results.failed > 0 ? 1 : 0);
}

runTests().catch(error => {
  console.error('\n❌ FATAL ERROR:', error.message);
  process.exit(1);
});
