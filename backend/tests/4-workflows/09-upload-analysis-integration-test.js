/**
 * Comprehensive Test: Image Upload + AI Analysis with Cleanup
 * 
 * This script tests the complete workflow:
 * 1. Upload image to cloud (ImgBB/Cloudinary/Imgur)
 * 2. Analyze with vision AI using cloud URL
 * 3. Clean up uploaded image
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '.env') });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import services
import { uploadImageToCloud, deleteUploadedImage, displayUploadConfig } from './services/imageUploadService.js';
import { analyzeWithZAI } from './services/zaiService.js';
import { analyzeWithNVIDIA } from './services/nvidiaService.js';
import { analyzeWithMistral } from './services/mistralService.js';
import { analyzeWithGroq } from './services/groqService.js';
import { getKeyManager } from './utils/keyManager.js';

// Test configuration
const TEST_PROMPT = `Analyze this image and describe:
1. Main subject and composition
2. Colors and visual style
3. Notable features or details
4. Overall mood and atmosphere

Keep response concise (2-3 sentences per point).`;

const VISION_PROVIDERS = [
  {
    name: 'Z.AI (FREE)',
    service: analyzeWithZAI,
    model: 'glm-4v-flash',
    pricing: 'FREE',
    checkAvailable: () => getKeyManager('zai').keys.length > 0
  },
  {
    name: 'Groq (FREE)',
    service: analyzeWithGroq,
    model: 'llama-3.2-11b-vision-preview',
    pricing: 'FREE',
    checkAvailable: () => getKeyManager('groq').keys.length > 0
  },
  {
    name: 'NVIDIA (FREE credits)',
    service: analyzeWithNVIDIA,
    model: 'meta/llama-3.2-11b-vision-instruct',
    pricing: 'FREE',
    checkAvailable: () => getKeyManager('nvidia').keys.length > 0
  },
  {
    name: 'Mistral (Trial)',
    service: analyzeWithMistral,
    model: 'pixtral-12b-2409',
    pricing: 'TRIAL',
    checkAvailable: () => getKeyManager('mistral').keys.length > 0
  }
];

/**
 * Find test image
 */
function findTestImage() {
  const possiblePaths = [
    path.join(__dirname, '../../test-images', 'anh-nhan-vat.jpeg'),
    path.join(__dirname, '../../test-images', 'anh-san-pham.png'),
    path.join(__dirname, 'uploads', 'test', 'test-image.jpg')
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  return null;
}

/**
 * Display configuration
 */
function displayConfiguration() {
  console.log('\n' + '='.repeat(80));
  console.log('📋 CONFIGURATION CHECK');
  console.log('='.repeat(80));

  // Upload providers
  displayUploadConfig();

  // Vision providers
  console.log('🤖 VISION AI PROVIDERS');
  console.log('='.repeat(80));

  for (const provider of VISION_PROVIDERS) {
    const available = provider.checkAvailable();
    const status = available ? '✅' : '❌';
    console.log(`${status} ${provider.name} (${provider.pricing})`);
    console.log(`   Model: ${provider.model}`);
  }

  console.log('='.repeat(80) + '\n');
}

/**
 * Test upload + analyze workflow
 */
async function testUploadAndAnalyze(imagePath) {
  const results = {
    upload: null,
    analyses: [],
    cleanup: null,
    errors: []
  };

  // Step 1: Upload image
  console.log('\n' + '='.repeat(80));
  console.log('📤 STEP 1: UPLOAD IMAGE TO CLOUD');
  console.log('='.repeat(80) + '\n');

  try {
    results.upload = await uploadImageToCloud(imagePath, {
      folder: 'test-uploads',
      title: 'Test Image for AI Analysis'
    });

    console.log(`\n✅ Upload successful!`);
    console.log(`   URL: ${results.upload.url}`);
    console.log(`   Provider: ${results.upload.provider}`);
    console.log(`   Size: ${results.upload.size ? (results.upload.size / 1024).toFixed(2) + ' KB' : 'N/A'}`);
    console.log(`   Dimensions: ${results.upload.width}x${results.upload.height}`);

  } catch (error) {
    console.error(`\n❌ Upload failed: ${error.message}`);
    results.errors.push({ step: 'upload', error: error.message });
    return results;
  }

  // Step 2: Analyze with each available vision provider
  console.log('\n' + '='.repeat(80));
  console.log('🤖 STEP 2: ANALYZE WITH VISION AI');
  console.log('='.repeat(80) + '\n');

  const availableProviders = VISION_PROVIDERS.filter(p => p.checkAvailable());

  if (availableProviders.length === 0) {
    console.log('❌ No vision providers available');
    results.errors.push({ step: 'analyze', error: 'No vision providers available' });
  } else {
    for (const provider of availableProviders) {
      console.log(`\n${'─'.repeat(60)}`);
      console.log(`🔬 Testing: ${provider.name}`);
      console.log(`📦 Model: ${provider.model}`);
      console.log(`${'─'.repeat(60)}\n`);

      try {
        const startTime = Date.now();

        // Use cloud URL for analysis
        const result = await provider.service(
          imagePath,
          TEST_PROMPT,
          {
            model: provider.model,
            imageUrl: results.upload.url // Pass cloud URL
          }
        );

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        console.log(`\n✅ Analysis complete!`);
        console.log(`   Duration: ${duration}s`);
        console.log(`   Response length: ${result.length} chars`);
        console.log(`\n📝 Response preview:`);
        console.log('   ' + result.slice(0, 200) + (result.length > 200 ? '...' : ''));

        results.analyses.push({
          provider: provider.name,
          model: provider.model,
          duration: parseFloat(duration),
          responseLength: result.length,
          success: true,
          response: result
        });

      } catch (error) {
        console.error(`\n❌ Analysis failed: ${error.message}`);
        results.analyses.push({
          provider: provider.name,
          model: provider.model,
          success: false,
          error: error.message
        });
        results.errors.push({ step: 'analyze', provider: provider.name, error: error.message });
      }
    }
  }

  // Step 3: Cleanup
  console.log('\n' + '='.repeat(80));
  console.log('🗑️  STEP 3: CLEANUP UPLOADED IMAGE');
  console.log('='.repeat(80) + '\n');

  try {
    const deleted = await deleteUploadedImage(results.upload);
    results.cleanup = { success: deleted };

    if (deleted) {
      console.log('✅ Cleanup successful!');
    } else {
      console.log('⚠️  Cleanup skipped or not supported');
    }

  } catch (error) {
    console.error(`❌ Cleanup failed: ${error.message}`);
    results.cleanup = { success: false, error: error.message };
    results.errors.push({ step: 'cleanup', error: error.message });
  }

  return results;
}

/**
 * Display final summary
 */
function displaySummary(results) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 FINAL SUMMARY');
  console.log('='.repeat(80));

  // Upload
  console.log('\n📤 UPLOAD:');
  if (results.upload) {
    console.log(`   ✅ Success`);
    console.log(`   Provider: ${results.upload.provider}`);
    console.log(`   URL: ${results.upload.url}`);
  } else {
    console.log(`   ❌ Failed`);
  }

  // Analyses
  console.log('\n🤖 ANALYSES:');
  if (results.analyses.length === 0) {
    console.log('   No analyses performed');
  } else {
    const successful = results.analyses.filter(a => a.success);
    const failed = results.analyses.filter(a => !a.success);

    console.log(`   Total: ${results.analyses.length}`);
    console.log(`   ✅ Successful: ${successful.length}`);
    console.log(`   ❌ Failed: ${failed.length}`);

    if (successful.length > 0) {
      console.log('\n   Successful analyses:');
      successful.forEach(a => {
        console.log(`   - ${a.provider}: ${a.duration}s, ${a.responseLength} chars`);
      });
    }

    if (failed.length > 0) {
      console.log('\n   Failed analyses:');
      failed.forEach(a => {
        console.log(`   - ${a.provider}: ${a.error}`);
      });
    }
  }

  // Cleanup
  console.log('\n🗑️  CLEANUP:');
  if (results.cleanup) {
    console.log(`   ${results.cleanup.success ? '✅ Success' : '⚠️  Skipped/Failed'}`);
  } else {
    console.log('   Not performed');
  }

  // Errors
  if (results.errors.length > 0) {
    console.log('\n❌ ERRORS:');
    results.errors.forEach((e, idx) => {
      console.log(`   ${idx + 1}. ${e.step}${e.provider ? ` (${e.provider})` : ''}: ${e.error}`);
    });
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

/**
 * Main test runner
 */
async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 COMPREHENSIVE TEST: UPLOAD + AI ANALYSIS + CLEANUP');
  console.log('='.repeat(80) + '\n');

  // Display configuration
  displayConfiguration();

  // Find test image
  const testImage = findTestImage();

  if (!testImage) {
    console.error('❌ No test image found!');
    console.error('   Please place a test image in:');
    console.error('   - test-images/anh-nhan-vat.jpeg');
    console.error('   - test-images/anh-san-pham.png');
    console.error('   - uploads/test/test-image.jpg');
    process.exit(1);
  }

  console.log(`✅ Test image found: ${path.relative(__dirname, testImage)}`);
  console.log(`   Size: ${(fs.statSync(testImage).size / 1024).toFixed(2)} KB`);

  // Run test
  const results = await testUploadAndAnalyze(testImage);

  // Display summary
  displaySummary(results);

  // Exit with appropriate code
  const hasErrors = results.errors.length > 0;
  const hasSuccessfulAnalysis = results.analyses.some(a => a.success);

  if (hasSuccessfulAnalysis) {
    console.log('✅ Test completed with some successful analyses!\n');
    process.exit(0);
  } else if (hasErrors) {
    console.log('❌ Test completed with errors.\n');
    process.exit(1);
  } else {
    console.log('⚠️  Test completed but no analyses were performed.\n');
    process.exit(0);
  }
}

// Run
main().catch(error => {
  console.error('\n❌ FATAL ERROR:', error.message);
  console.error(error.stack);
  process.exit(1);
});
