/**
 * Test Virtual Try-On Prompt Generation
 * 
 * Run: cd backend && node tests/test-virtual-tryon-prompt.js
 * 
 * This script tests the new virtual try-on prompt features:
 * 1. Image reference labeling
 * 2. Complete CHANGE CLOTHING TO section
 * 3. Enhanced negative prompts
 * 4. Character preservation
 */

import { buildDetailedPrompt } from '../services/smartPromptBuilder.js';

const mockCharacterAnalysis = {
  character: {
    age: '28',
    gender: 'Female',
    skinTone: 'light',
    hair: {
      color: 'brown',
      style: 'straight',
      length: 'shoulder-length'
    },
    facialFeatures: 'defined cheekbones, full lips',
    eyes: 'dark brown',
    bodyType: 'slim',
    makeup: 'natural',
    expression: 'confident smile'
  },
  product: {
    garment_type: 'Blouse',
    type: 'formal blouse',
    style_category: 'business-casual',
    primary_color: 'navy-blue',
    secondary_color: 'white-stripes',
    fabric_type: 'cotton-blend',
    pattern: 'vertical stripes',
    fit_type: 'fitted',
    neckline: 'button-down collar',
    sleeves: 'long sleeves with cuffs',
    key_details: 'front button closure, chest pocket',
    length: 'hip-length',
    coverage: 'covers shoulders and arms',
    detailedDescription: 'Professional navy blue striped cotton-blend blouse with button-down collar'
  },
  recommendations: {
    scene: { choice: 'studio' },
    lighting: { choice: 'soft-diffused' },
    mood: { choice: 'professional' },
    style: { choice: 'fashion-editorial' },
    colorPalette: { choice: 'neutral' },
    cameraAngle: { choice: 'three-quarter' }
  }
};

const mockSelectedOptions = {
  hairstyle: 'same',
  makeup: 'natural-professional',
  accessories: ['minimalist-necklace', 'stud-earrings'],
  shoes: 'black-heels',
  scene: 'studio',
  lighting: 'soft-diffused',
  mood: 'professional',
  style: 'fashion-editorial',
  cameraAngle: 'three-quarter',
  colorPalette: 'neutral'
};

async function testPromptGeneration() {
  console.log('🧪 VIRTUAL TRY-ON PROMPT GENERATION TEST\n');
  console.log('=' .repeat(60));
  
  try {
    // Test 1: Use-case specific (change-clothes)
    console.log('\n📊 TEST 1: Change-Clothes Use Case');
    console.log('-'.repeat(60));
    
    const result = await buildDetailedPrompt(
      mockCharacterAnalysis,
      mockSelectedOptions,
      'change-clothes',
      'full-outfit'
    );

    console.log('\n✅ PROMPT GENERATED:\n');
    const prompt = result.prompt;
    
    // Check for critical sections
    const checks = [
      { name: 'IMAGE REFERENCE MAPPING', check: prompt.includes('[IMAGE REFERENCE MAPPING]') },
      { name: 'Character unchanged section', check: prompt.includes('=== KEEP CHARACTER UNCHANGED') },
      { name: 'Change clothing section', check: prompt.includes('=== CHANGE CLOTHING TO') },
      { name: 'Primary color specified', check: prompt.includes('navy-blue') },
      { name: 'Secondary color specified', check: prompt.includes('white-stripes') },
      { name: 'Material/fabric specified', check: prompt.includes('cotton-blend') },
      { name: 'Pattern specified', check: prompt.includes('vertical stripes') },
      { name: 'Design details', check: prompt.includes('button-down collar') },
      { name: 'Garment placement instructions', check: prompt.includes('=== HOW TO APPLY THE GARMENT ===') },
      { name: 'Execution checklist', check: prompt.includes('=== EXECUTION CHECKLIST ===') },
      { name: 'Hair/makeup section', check: prompt.includes('=== HAIRSTYLE & MAKEUP ===') },
      { name: 'Accessories section', check: prompt.includes('=== ACCESSORIES ===') },
      { name: 'Environment section', check: prompt.includes('=== ENVIRONMENT ===') },
      { name: 'Photography section', check: prompt.includes('=== PHOTOGRAPHY') }
    ];

    console.log('📋 SECTION VERIFICATION CHECKLIST:\n');
    let passedChecks = 0;
    for (const check of checks) {
      const status = check.check ? '✅' : '❌';
      console.log(`${status} ${check.name}`);
      if (check.check) passedChecks++;
    }
    
    console.log(`\n📊 Result: ${passedChecks}/${checks.length} checks passed\n`);

    // Show actual prompt length
    console.log(`📐 Prompt Statistics:`);
    console.log(`   Length: ${prompt.length} characters`);
    console.log(`   Lines: ${prompt.split('\n').length}`);
    
    // Test 2: Negative prompt
    console.log('\n📊 TEST 2: Negative Prompt Generation');
    console.log('-'.repeat(60));
    
    const negativePrompt = result.negativePrompt;
    
    const negativeChecks = [
      { name: 'Face preservation', check: negativePrompt.includes('changes to face') },
      { name: 'Body type protection', check: negativePrompt.includes('modified body type') },
      { name: 'Pose preservation', check: negativePrompt.includes('changed pose') },
      { name: 'Expression preservation', check: negativePrompt.includes('different expression') },
      { name: 'Garment floating prevention', check: negativePrompt.includes('floating garment') },
      { name: 'Draping quality', check: negativePrompt.includes('realistic draping') }
    ];
    
    console.log('📋 NEGATIVE PROMPT VERIFICATION:\n');
    let negativesPassed = 0;
    for (const check of negativeChecks) {
      const status = check.check ? '✅' : '❌';
      console.log(`${status} ${check.name}`);
      if (check.check) negativesPassed++;
    }
    
    console.log(`\n📊 Result: ${negativesPassed}/${negativeChecks.length} checks passed`);
    console.log(`\n📐 Negative Prompt Statistics:`);
    console.log(`   Terms: ${negativePrompt.split(', ').length}`);
    
    // Test 3: Full prompt output sample
    console.log('\n📊 TEST 3: Sample Prompt Output (First 500 chars)');
    console.log('-'.repeat(60));
    console.log(prompt.substring(0, 500) + '...\n');
    
    // Test 4: Check for presence of product details
    console.log('\n📊 TEST 4: Product Details Extraction');
    console.log('-'.repeat(60));
    
    const productDetails = [
      { detail: 'Garment Type', value: mockCharacterAnalysis.product.garment_type, found: prompt.includes(mockCharacterAnalysis.product.garment_type) },
      { detail: 'Primary Color', value: mockCharacterAnalysis.product.primary_color, found: prompt.includes(mockCharacterAnalysis.product.primary_color) },
      { detail: 'Secondary Color', value: mockCharacterAnalysis.product.secondary_color, found: prompt.includes(mockCharacterAnalysis.product.secondary_color) },
      { detail: 'Fabric Type', value: mockCharacterAnalysis.product.fabric_type, found: prompt.includes(mockCharacterAnalysis.product.fabric_type) },
      { detail: 'Pattern', value: mockCharacterAnalysis.product.pattern, found: prompt.includes(mockCharacterAnalysis.product.pattern) },
      { detail: 'Fit Type', value: mockCharacterAnalysis.product.fit_type, found: prompt.includes(mockCharacterAnalysis.product.fit_type) }
    ];
    
    console.log('📋 PRODUCT DETAILS IN PROMPT:\n');
    let detailsFound = 0;
    for (const detail of productDetails) {
      const status = detail.found ? '✅' : '❌';
      console.log(`${status} ${detail.detail}: "${detail.value}"`);
      if (detail.found) detailsFound++;
    }
    
    console.log(`\n📊 Result: ${detailsFound}/${productDetails.length} product details found`);
    
    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('\n🎉 OVERALL TEST RESULTS:\n');
    
    const totalChecks = checks.length + negativeChecks.length + productDetails.length;
    const totalPassed = passedChecks + negativesPassed + detailsFound;
    
    console.log(`✅ Total Passed: ${totalPassed}/${totalChecks}`);
    console.log(`📊 Success Rate: ${((totalPassed / totalChecks) * 100).toFixed(1)}%`);
    
    if (totalPassed === totalChecks) {
      console.log('\n🎊 ALL TESTS PASSED! Virtual Try-On Prompting System is working correctly.\n');
    } else {
      console.log('\n⚠️  Some tests failed. Review output above for details.\n');
    }
    
  } catch (error) {
    console.error('❌ TEST FAILED:', error);
    console.error('\nStack trace:', error.stack);
  }
}

// Run tests
testPromptGeneration().catch(console.error);
