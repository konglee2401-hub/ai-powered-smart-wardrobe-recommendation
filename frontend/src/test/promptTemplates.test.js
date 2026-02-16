/**
 * Test Suite for Dynamic Prompt Templates
 * Tests all use cases to ensure templates generate correctly
 */

import { 
  generateDynamicPrompt, 
  generateNegativePrompt, 
  getAllUseCases, 
  getUseCase,
  testAllUseCases,
  defaultInputs 
} from '../utils/promptTemplates';

// Test data: All use cases
const testCases = [
  {
    name: 'Casual Beach',
    inputs: { age: '20-30', gender: 'female', style: 'casual', colors: 'bright', material: 'cotton', setting: 'beach', mood: 'relaxed' },
    expectedKeywords: ['beach', 'cotton', 'golden hour', 'vibrant', 'summer']
  },
  {
    name: 'Formal Business',
    inputs: { age: '30-40', gender: 'male', style: 'formal', colors: 'navy', material: 'wool', setting: 'office', mood: 'professional' },
    expectedKeywords: ['office', 'wool', 'professional', 'business suit', 'corporate']
  },
  {
    name: 'Elegant Evening',
    inputs: { age: '25-35', gender: 'female', style: 'elegant', colors: 'red and black', material: 'silk', setting: 'ballroom', mood: 'romantic' },
    expectedKeywords: ['ballroom', 'satin', 'dramatic', 'evening gown', 'glamorous']
  },
  {
    name: 'Casual Streetwear',
    inputs: { age: '18-25', gender: 'female', style: 'casual', colors: 'monochrome', material: 'denim', setting: 'urban', mood: 'trendy' },
    expectedKeywords: ['urban', 'denim', 'street style', 'graffiti', 'sneakers']
  },
  {
    name: 'Sporty Athleisure',
    inputs: { age: '20-30', gender: 'female', style: 'sporty', colors: 'bright', material: 'technical', setting: 'gym', mood: 'energetic' },
    expectedKeywords: ['gym', 'athletic', 'sports shoes', 'fitness', 'dynamic']
  },
  {
    name: 'Vintage Retro',
    inputs: { age: '30-40', gender: 'female', style: 'vintage', colors: 'muted', material: 'wool', setting: 'vintage', mood: 'nostalgic' },
    expectedKeywords: ['vintage', 'wool', 'retro', 'film grain', '1950s']
  },
  {
    name: 'Luxury High Fashion',
    inputs: { age: '25-35', gender: 'female', style: 'luxury', colors: 'gold', material: 'silk', setting: 'studio', mood: 'exclusive' },
    expectedKeywords: ['luxury', 'cashmere', 'designer', 'jewelry', 'editorial']
  },
  {
    name: 'Bohemian Hippie',
    inputs: { age: '20-30', gender: 'female', style: 'bohemian', colors: 'earth tones', material: 'linen', setting: 'nature', mood: 'peaceful' },
    expectedKeywords: ['bohemian', 'linen', 'flower crown', 'forest', 'barefoot']
  },
  {
    name: 'Minimalist Modern',
    inputs: { age: '25-35', gender: 'female', style: 'minimalist', colors: 'monochrome', material: 'cotton', setting: 'studio', mood: 'clean' },
    expectedKeywords: ['minimalist', 'monochrome', 'white', 'geometric', 'negative space']
  },
  {
    name: 'Edgy Alternative',
    inputs: { age: '18-25', gender: 'female', style: 'edgy', colors: 'dark', material: 'leather', setting: 'urban', mood: 'rebellious' },
    expectedKeywords: ['edgy', 'leather', 'dark', 'grunge', 'metal accessories']
  }
];

// Test function: Run all test cases
const runTests = () => {
  console.log('🧪 Running Dynamic Prompt Templates Tests...\n');
  let passed = 0;
  let failed = 0;

  testCases.forEach((testCase) => {
    try {
      const prompt = generateDynamicPrompt(testCase.inputs);
      const useCase = getUseCase(testCase.inputs);
      
      // Check if prompt contains expected keywords
      const hasKeywords = testCase.expectedKeywords.every(keyword => 
        prompt.toLowerCase().includes(keyword.toLowerCase())
      );

      if (hasKeywords) {
        console.log(`✅ ${testCase.name} - PASSED`);
        console.log(`   Use Case: ${useCase || 'Base'}`);
        console.log(`   Prompt length: ${prompt.length} chars\n`);
        passed++;
      } else {
        console.log(`❌ ${testCase.name} - FAILED`);
        console.log(`   Missing keywords: ${testCase.expectedKeywords.filter(k => !prompt.toLowerCase().includes(k.toLowerCase())).join(', ')}\n`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${testCase.name} - ERROR: ${error.message}\n`);
      failed++;
    }
  });

  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed out of ${testCases.length} tests`);
  console.log(`✨ All Use Cases: ${getAllUseCases().join(', ')}`);
  
  return { passed, failed, total: testCases.length };
};

// Export for use
export { runTests, testCases };

// Auto-run if imported directly in browser
if (typeof window !== 'undefined') {
  window.runPromptTests = runTests;
}

// Export default for testing frameworks
export default {
  runTests,
  testCases
};
