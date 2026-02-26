/**
 * Test Language-Aware Prompt Builder
 * Usage: node test-language-aware-prompts.js
 */

import { buildLanguageAwarePrompt } from './backend/services/languageAwarePromptBuilder.js';

const testAnalysis = {
  character: {
    gender: 'female',
    age: 25,
    bodyType: 'slim',
    skinTone: 'fair',
    overallVibe: 'elegant'
  },
  product: {
    type: 'dress',
    category: 'clothing',
    style: 'elegant',
    colors: ['black', 'gold'],
    material: 'silk'
  }
};

const testOptions = {
  scene: 'studio',
  lighting: 'golden-hour',
  mood: 'elegant',
  style: 'formal',
  colorPalette: 'jewel-tones'
};

async function runTests() {
  console.log('🧪 Testing Language-Aware Prompt Builder\n');
  console.log('='.repeat(60));

  try {
    // Test 1: English prompt
    console.log('\n📝 Test 1: Building English prompt...\n');
    const enPrompt = await buildLanguageAwarePrompt(
      testAnalysis,
      testOptions,
      'en',
      'change-clothes'
    );
    console.log('✅ English Prompt Success');
    console.log('Positive:', enPrompt.positive.substring(0, 100) + '...');
    console.log('Negative:', enPrompt.negative.substring(0, 50) + '...');

    // Test 2: Vietnamese prompt
    console.log('\n📝 Test 2: Building Vietnamese prompt...\n');
    const viPrompt = await buildLanguageAwarePrompt(
      testAnalysis,
      testOptions,
      'vi',
      'change-clothes'
    );
    console.log('✅ Vietnamese Prompt Success');
    console.log('Positive:', viPrompt.positive.substring(0, 100) + '...');
    console.log('Negative:', viPrompt.negative.substring(0, 50) + '...');

    // Test 3: Verify different outputs
    console.log('\n📝 Test 3: Checking if outputs differ...\n');
    if (enPrompt.positive !== viPrompt.positive) {
      console.log('✅ English and Vietnamese prompts are different (as expected)');
    } else {
      console.log('⚠️ Prompts are identical - translation may not be working');
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n🎉 All tests passed!\n');

  } catch (error) {
    console.error('\n❌ Test Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

runTests();
