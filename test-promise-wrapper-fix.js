/**
 * Test: Verify Prompt Access with Promise Wrapper
 * 
 * This test simulates EXACTLY what happens in affiliateVideoTikTokService.js:
 * 1. buildDetailedPrompt() returns { prompt: '...', negativePrompt: '...' }
 * 2. .then() wrapper transforms it to { useCase: '...', prompts: promptData }
 * 3. affiliateVideoTikTokService accesses via .prompts.prompt
 */

import { buildDetailedPrompt } from './backend/services/smartPromptBuilder.js';

console.log('🧪 TEST: Verify Prompt Access with Promise Wrapper\n');
console.log('═'.repeat(80));

// Simulate the exact analysis and options from the actual flow
const analysis = {
  character: {
    age: 20,
    gender: 'female',
    skinTone: 'fair',
    hair: {
      color: 'brown',
      style: 'waves',
      length: 'long'
    },
    facialFeatures: 'soft features'
  },
  product: {
    garment_type: 'Pajama Set',
    type: 'pajamas',
    primary_color: 'blue',
    secondary_color: 'white',
    fabric_type: 'cotton',
    pattern: 'polka dots',
    fit_type: 'relaxed',
    style_category: 'sleepwear'
  }
};

const baseOptions = {
  scene: 'Bedroom setting with a soft, cozy vibe',
  lighting: 'Soft diffused lighting',
  mood: 'Playful and relaxed',
  cameraAngle: 'Eye level, full-body shot',
  hairstyle: 'Keep current hairstyle',
  makeup: 'Natural, minimal makeup'
};

const productFocus = 'full-outfit';

console.log('\n📋 SIMULATING ACTUAL FLOW:');
console.log('────────────────────────────────────────────────────────────────');

(async () => {
  try {
    // STEP 1: Create promises like affiliateVideoTikTokService does
    console.log('\n1️⃣  Creating promises with .then() wrapper...');
    
    const generateWearingPromise = buildDetailedPrompt(
      analysis,
      baseOptions,
      'change-clothes',
      productFocus,
      'en'  // Force English for consistency (like in actual flow)
    ).then(promptData => ({
      useCase: 'change-clothes',
      prompts: promptData  // <-- THIS CREATES THE WRAPPER
    }));

    const generateHoldingPromise = buildDetailedPrompt(
      analysis,
      baseOptions,
      'character-holding-product',
      productFocus,
      'en'
    ).then(promptData => ({
      useCase: 'character-holding-product',
      prompts: promptData  // <-- THIS CREATES THE WRAPPER
    }));

    console.log('   ✓ Promises created with Promise.all()');

    // STEP 2: Await both promises (like line 800)
    console.log('\n2️⃣  Awaiting Promise.all([wearingPromise, holdingPromise])...');
    
    const [wearingPromptData, holdingPromptData] = await Promise.all([
      generateWearingPromise,
      generateHoldingPromise
    ]);

    console.log('   ✓ Promises resolved');

    // STEP 3: Inspect the structure
    console.log('\n3️⃣  STRUCTURE OF RESOLVED DATA:');
    console.log('   ────────────────────────────────────────');
    console.log(`   wearingPromptData type: ${typeof wearingPromptData}`);
    console.log(`   wearingPromptData keys: ${Object.keys(wearingPromptData).join(', ')}`);
    console.log(`   wearingPromptData.prompts keys: ${Object.keys(wearingPromptData.prompts).join(', ')}`);
    console.log(`   `);
    console.log(`   holdingPromptData type: ${typeof holdingPromptData}`);
    console.log(`   holdingPromptData keys: ${Object.keys(holdingPromptData).join(', ')}`);
    console.log(`   holdingPromptData.prompts keys: ${Object.keys(holdingPromptData.prompts).join(', ')}`);

    // STEP 4: Access with OLD PATH (WRONG - would get empty)
    console.log('\n4️⃣  ACCESS WITH OLD PATH: .prompt (WRONG)');
    console.log('   ────────────────────────────────────────');
    const oldWearingPrompt = wearingPromptData?.prompt || '';
    const oldHoldingPrompt = holdingPromptData?.prompt || '';
    console.log(`   wearingPromptData?.prompt: "${oldWearingPrompt}"`);
    console.log(`   wearingPromptData?.prompt?.length: ${oldWearingPrompt?.length || 0}`);
    console.log(`   ❌ RESULT: EMPTY (${oldWearingPrompt.length === 0 ? 'would throw error' : 'has content'})`);

    // STEP 5: Access with NEW PATH (CORRECT)
    console.log('\n5️⃣  ACCESS WITH NEW PATH: .prompts.prompt (CORRECT)');
    console.log('   ────────────────────────────────────────');
    const newWearingPrompt = wearingPromptData?.prompts?.prompt || '';
    const newHoldingPrompt = holdingPromptData?.prompts?.prompt || '';
    console.log(`   wearingPromptData?.prompts?.prompt: "${newWearingPrompt.substring(0, 60)}..."`);
    console.log(`   wearingPromptData?.prompts?.prompt?.length: ${newWearingPrompt?.length || 0}`);
    console.log(`   ✅ RESULT: VALID (${newWearingPrompt.length > 0 ? 'ready for generation' : 'ERROR'})`);

    // STEP 6: Validation (like line 838)
    console.log('\n6️⃣  VALIDATION (like affiliateVideoTikTokService.js line 838)');
    console.log('   ────────────────────────────────────────');
    
    const wearingPrompt = wearingPromptData?.prompts?.prompt || '';
    const holdingPrompt = holdingPromptData?.prompts?.prompt || '';
    
    let validationPassed = true;
    
    if (!wearingPrompt || typeof wearingPrompt !== 'string' || wearingPrompt.trim().length === 0) {
      console.log(`   ❌ Wearing prompt INVALID: length ${wearingPrompt?.length || 0}`);
      validationPassed = false;
    } else {
      console.log(`   ✅ Wearing prompt VALID: ${wearingPrompt.length} chars`);
    }
    
    if (!holdingPrompt || typeof holdingPrompt !== 'string' || holdingPrompt.trim().length === 0) {
      console.log(`   ❌ Holding prompt INVALID: length ${holdingPrompt?.length || 0}`);
      validationPassed = false;
    } else {
      console.log(`   ✅ Holding prompt VALID: ${holdingPrompt.length} chars`);
    }

    // FINAL RESULT
    console.log('\n' + '═'.repeat(80));
    if (validationPassed) {
      console.log('✅ SUCCESS: Both prompts are VALID and ready for image generation!');
      console.log('\n   The fix changes access from .prompt → .prompts.prompt');
      console.log('   This correctly handles the Promise wrapper created by .then()');
      process.exit(0);
    } else {
      console.log('❌ FAILURE: Prompts still invalid!');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
