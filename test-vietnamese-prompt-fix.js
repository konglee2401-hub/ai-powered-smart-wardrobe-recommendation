/**
 * Test Vietnamese Prompt Builder Fix
 * Verify that VietnamesePromptBuilder import is working correctly
 */

import VietnamesePromptBuilder from './backend/services/vietnamesePromptBuilder.js';
import { buildDetailedPrompt } from './backend/services/smartPromptBuilder.js';

console.log('🧪 Testing Vietnamese Prompt Builder Fix\n');

// Test 1: Direct import
console.log('Test 1: Verify VietnamesePromptBuilder is accessible');
console.log(`  - VietnamesePromptBuilder type: ${typeof VietnamesePromptBuilder}`);
console.log(`  - buildCharacterAnalysisPrompt method: ${typeof VietnamesePromptBuilder.buildCharacterAnalysisPrompt}`);

// Test 2: Call the method directly
console.log('\nTest 2: Call buildCharacterAnalysisPrompt() directly');
const directPrompt = VietnamesePromptBuilder.buildCharacterAnalysisPrompt();
console.log(`  - Prompt returned: ${directPrompt ? '✅ YES' : '❌ NO'}`);
console.log(`  - Prompt type: ${typeof directPrompt}`);
console.log(`  - Prompt length: ${directPrompt?.length || 0}`);
if (directPrompt?.length > 0) {
  console.log(`  - First 100 chars: "${directPrompt?.substring(0, 100)}..."`);
} else {
  console.log(`  - ❌ PROMPT IS EMPTY`);
}

// Test 3: Test buildDetailedPrompt with Vietnamese language
console.log('\nTest 3: Call buildDetailedPrompt() with Vietnamese language');
const testAnalysis = {
  character: {
    age: 28,
    gender: 'female',
    skinTone: 'fair',
    hair: { color: 'brown', style: 'straight', length: 'long' },
    facialFeatures: 'high cheekbones'
  },
  product: {
    garment_type: 'dress',
    type: 'casual-dress',
    primary_color: 'blue',
    fabric_type: 'cotton'
  }
};

const testOptions = {
  scene: 'studio',
  lighting: 'soft'
};

// Test async buildDetailedPrompt
(async () => {
  try {
    console.log('  - Building prompt with language="vi"...');
    
    const result = await buildDetailedPrompt(
      testAnalysis,
      testOptions,
      'change-clothes',
      'full-outfit',
      'vi'  // Vietnamese language
    );
    
    console.log(`  - Result type: ${typeof result}`);
    console.log(`  - Has 'prompt' property: ${result?.prompt ? '✅ YES' : '❌ NO'}`);
    console.log(`  - Prompt length: ${result?.prompt?.length || 0}`);
    
    if (result?.prompt?.length > 0) {
      console.log(`  - ✅ SUCCESS: Vietnamese prompt is valid (${result.prompt.length} characters)`);
      console.log(`  - First 100 chars: "${result.prompt.substring(0, 100)}..."`);
    } else {
      console.log(`  - ❌ FAILED: Vietnamese prompt is empty (length: 0)`);
    }
    
    console.log(`\n  - Has 'negativePrompt' property: ${result?.negativePrompt ? '✅ YES' : '❌ NO'}`);
    console.log(`  - Negative prompt length: ${result?.negativePrompt?.length || 0}`);
    
  } catch (error) {
    console.error('\n❌ Error during test:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
  }
  
  process.exit(0);
})();

