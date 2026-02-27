/**
 * Test: Full Image Generation Flow with Vietnamese Prompts
 * Simulates exactly what happens in affiliateVideoTikTokService.js
 */

import { buildDetailedPrompt } from './backend/services/smartPromptBuilder.js';

console.log('🧪 Testing Full Image Generation Flow\n');

// Simulate the analysis data from Google Flow
const analysis = {
  character: {
    age: 28,
    gender: 'female',
    skinTone: 'fair',
    hair: {
      color: 'brown',
      style: 'straight',
      length: 'long'
    },
    facialFeatures: 'high cheekbones, almond eyes',
    makeup: 'natural',
    overallVibe: 'elegant'
  },
  product: {
    garment_type: 'casual dress',
    type: 'dress',
    detailedDescription: 'A comfortable casual summer dress in blue',
    primary_color: 'blue',
    secondary_color: 'white',
    fabric_type: 'cotton',
    pattern: 'solid',
    fit_type: 'relaxed',
    style_category: 'casual',
    key_details: 'simple cut, comfortable fit'
  }
};

// Simulate selectedOptions from the UI (Vietnamese recommendations)
const baseOptions = {
  scene: 'studio',
  lighting: 'soft-diffused',
  mood: 'confident',
  style: 'minimalist',
  colorPalette: 'neutral',
  cameraAngle: 'eye-level',
  hairstyle: 'same',
  makeup: 'natural'
};

// Test data for both image generations
const imagesToGenerate = [
  {
    name: 'Wearing Product',
    useCase: 'change-clothes',
    productFocus: 'full-outfit',
    language: 'vi'  // Vietnamese
  },
  {
    name: 'Holding Product',
    useCase: 'character-holding-product',
    productFocus: 'full-outfit',
    language: 'vi'  // Vietnamese
  }
];

console.log('📋 ANALYSIS DATA:');
console.log(`   Character: ${analysis.character.age}yo ${analysis.character.gender}`);
console.log(`   Product: ${analysis.product.garment_type}`);
console.log(`   Language: Vietnamese (vi)\n`);

// Run tests
(async () => {
  let passCount = 0;
  let failCount = 0;

  for (const imageConfig of imagesToGenerate) {
    console.log(`\n🖼️  Generating: ${imageConfig.name}`);
    console.log(`   useCase: ${imageConfig.useCase}`);
    console.log(`   language: ${imageConfig.language}`);

    try {
      const result = await buildDetailedPrompt(
        analysis,
        baseOptions,
        imageConfig.useCase,
        imageConfig.productFocus,
        imageConfig.language
      );

      console.log(`   ✓ buildDetailedPrompt() returned`);
      console.log(`   - result type: ${typeof result}`);
      console.log(`   - has prompt property: ${!!result?.prompt}`);
      console.log(`   - prompt length: ${result?.prompt?.length || 0}`);

      // Simulate affiliateVideoTikTokService.js validation (lines 835-850)
      const wearingPrompt = result?.prompt || '';
      console.log(`\n   📍 Validation (like affiliateVideoTikTokService.js):`);
      console.log(`   - typeof wearingPrompt: "${typeof wearingPrompt}"`);
      console.log(`   - wearingPrompt.length: ${wearingPrompt?.length || 0}`);
      console.log(`   - wearingPrompt.trim().length: ${wearingPrompt?.trim().length || 0}`);

      // Check if it would pass validation
      if (wearingPrompt && typeof wearingPrompt === 'string' && wearingPrompt.trim().length > 0) {
        console.log(`   ✅ PASS: Prompt is valid`);
        console.log(`   - First 100 chars: "${wearingPrompt.substring(0, 100)}..."`);
        passCount++;
      } else {
        console.log(`   ❌ FAIL: Invalid prompt`);
        console.log(`   - Would throw: "Invalid ${imageConfig.name.toLowerCase()} prompt: ${typeof wearingPrompt}, length: ${wearingPrompt?.length || 0}"`);
        failCount++;
      }

      // Also check negative prompt
      console.log(`   - negativePrompt length: ${result?.negativePrompt?.length || 0}`);

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      failCount++;
    }
  }

  console.log(`\n\n📊 RESULTS:`);
  console.log(`   ✅ Passed: ${passCount}/${imagesToGenerate.length}`);
  console.log(`   ❌ Failed: ${failCount}/${imagesToGenerate.length}`);

  if (passCount === imagesToGenerate.length) {
    console.log(`\n✅ SUCCESS: All prompts are valid and ready for image generation!`);
  } else {
    console.log(`\n❌ FAILURE: Some prompts are invalid. Image generation will fail.`);
  }

  process.exit(failCount > 0 ? 1 : 0);
})();
