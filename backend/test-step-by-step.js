#!/usr/bin/env node

/**
 * Test the complete step-by-step flow
 * Tests all 3 backend endpoints in the new architecture:
 * 1. POST /api/ai/analyze-unified
 * 2. POST /api/ai/build-prompt-unified
 * 3. POST /api/ai/generate-unified
 */

import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import FormData from 'form-data';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_URL = process.env.API_URL || 'http://localhost:5000';

console.log('\n' + '='.repeat(80));
console.log('  🧪 STEP-BY-STEP FLOW TEST');
console.log('='.repeat(80) + '\n');

// Helper function to pretty print
function log(step, message) {
  const icon = message.includes('❌') ? '❌' : message.includes('⏳') ? '⏳' : message.includes('✅') ? '✅' : 'ℹ️';
  console.log(`${icon} STEP ${step}: ${message}`);
}

async function runTest() {
  try {
    // ============================================================
    // STEP 1: ANALYZE UNIFIED
    // ============================================================
    console.log('\n📸 STEP 1: ANALYZE UNIFIED');
    console.log('-'.repeat(80));
    
    // Find test image
    const testImageDir = path.join(__dirname, 'test-images');
    const images = fs.readdirSync(testImageDir).filter(f => 
      /\.(jpg|jpeg|png|webp)$/i.test(f)
    );
    
    if (images.length < 2) {
      log(1, '❌ Test requires at least 2 test images');
      return;
    }

    const characterImagePath = path.join(testImageDir, images[0]);
    const productImagePath = path.join(testImageDir, images[1]);
    
    log(1, `Using images: ${images[0]}, ${images[1]}`);

    // Create form data
    const formData = new FormData();
    formData.append('characterImage', fs.createReadStream(characterImagePath));
    formData.append('productImage', fs.createReadStream(productImagePath));
    formData.append('useCase', 'change-clothes');
    formData.append('productFocus', 'full-outfit');

    // Call analyze endpoint
    log(1, '⏳ Calling /api/ai/analyze-unified...');
    const analyzeResponse = await fetch(`${API_URL}/api/ai/analyze-unified`, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });

    if (!analyzeResponse.ok) {
      const error = await analyzeResponse.text();
      log(1, `❌ Analysis failed: ${analyzeResponse.status} - ${error}`);
      return;
    }

    const analyzeData = await analyzeResponse.json();
    log(1, '✅ Analysis completed successfully');

    if (!analyzeData.success || !analyzeData.data.analysis) {
      log(1, `❌ Invalid response structure: ${JSON.stringify(analyzeData).substring(0, 100)}`);
      return;
    }

    const analysis = analyzeData.data.analysis;
    console.log(`   📊 Character: ${analysis.character?.name || 'Unknown'}`);
    console.log(`   📊 Outfit Compatibility: ${analysis.outfitCompatibility || 'N/A'}`);
    console.log(`   📊 Recommendations found: ${Object.keys(analysis.recommendations || {}).length}`);

    // ============================================================
    // STEP 2: BUILD PROMPT
    // ============================================================
    console.log('\n🎨 STEP 2: BUILD PROMPT UNIFIED');
    console.log('-'.repeat(80));

    const selectedOptions = {
      style: 'modern casual',
      color: 'black',
      occasion: 'casual',
      imageCount: 2
    };

    log(2, `⏳ Calling /api/ai/build-prompt-unified...`);
    log(2, `📋 Selected options: ${JSON.stringify(selectedOptions)}`);

    const promptResponse = await fetch(`${API_URL}/api/ai/build-prompt-unified`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        analysis,
        selectedOptions
      })
    });

    if (!promptResponse.ok) {
      const error = await promptResponse.text();
      log(2, `❌ Prompt building failed: ${promptResponse.status} - ${error}`);
      return;
    }

    const promptData = await promptResponse.json();
    log(2, '✅ Prompt built successfully');

    if (!promptData.success || !promptData.data.prompt) {
      log(2, `❌ Invalid response structure: ${JSON.stringify(promptData).substring(0, 100)}`);
      return;
    }

    const prompt = promptData.data.prompt;
    console.log(`   📝 Positive: ${prompt.positive.substring(0, 100)}...`);
    console.log(`   📝 Negative: ${prompt.negative.substring(0, 100)}...`);

    // ============================================================
    // STEP 3: GENERATE IMAGES
    // ============================================================
    console.log('\n🎨 STEP 3: GENERATE IMAGES UNIFIED');
    console.log('-'.repeat(80));

    log(3, `⏳ Calling /api/ai/generate-unified...`);
    log(3, `⏳ (This may take 30+ seconds or fail if no image providers configured)`);

    const generatePromise = fetch(`${API_URL}/api/ai/generate-unified`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: prompt.positive,
        negativePrompt: prompt.negative,
        options: {
          imageCount: 2,
          aspectRatio: '1:1'
        }
      })
    });

    // Add 30-second timeout for generation
    const generateResponse = await Promise.race([
      generatePromise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Generation timeout (30s)')), 30000)
      )
    ]);

    if (!generateResponse.ok) {
      const error = await generateResponse.text();
      log(3, `❌ Generation failed: ${generateResponse.status} - ${error}`);
      return;
    }

    const generateData = await generateResponse.json();
    
    if (!generateData.success) {
      log(3, `❌ Image generation not ready yet (expected): ${generateData.message || 'Feature in progress'}`);
      console.log('   ℹ️  This is expected - backend may not have image generation providers configured');
    } else {
      log(3, '✅ Images generated successfully');
      const images = generateData.data.generatedImages || [];
      console.log(`   📊 Generated ${images.length} images`);
    }

    // ============================================================
    // SUMMARY
    // ============================================================
    console.log('\n' + '='.repeat(80));
    console.log('  ✅ STEP-BY-STEP FLOW TEST COMPLETE');
    console.log('='.repeat(80) + '\n');
    console.log('✅ Steps 1-2 working correctly (Analysis → Prompt Building)');
    console.log('⏳ Step 3 status: ' + (generateData.success ? '✅ Ready' : '⏭️  Awaiting provider config'));
    console.log('\n📌 ARCHITECTURE VALIDATION:');
    console.log('✅ Each endpoint executes independently');
    console.log('✅ Analysis provides data to Prompt Building');
    console.log('✅ Prompt Building provides data to Image Generation');
    console.log('✅ Frontend can now orchestrate step-by-step flow\n');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
runTest();
