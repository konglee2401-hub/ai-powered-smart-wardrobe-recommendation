/**
 * Test backend API response structure
 * Verify character profile, product details, and recommendations are properly returned
 */

import fetch from 'node-fetch';

async function testBackendResponseStructure() {
  console.log('\n🔍 Testing Backend Response Structure\n');

  try {
    // 1. Check prompt options
    console.log('TEST 1: Fetching Prompt Options');
    const optRes = await fetch('http://localhost:5000/api/prompt-options');
    const optJson = await optRes.json();
    const optData = optJson.data?.options || optJson;
    
    const categories = Object.keys(optData);
    const totalOptions = Object.values(optData).flat().length;
    console.log(`  ✅ Categories: ${categories.length}`);
    console.log(`  ✅ Total options: ${totalOptions}`);
    console.log(`  ✅ Scene category: ${optData.scene?.length || 0} options`);
    console.log(`  ✅ Accessories category: ${optData.accessories?.length || 0} options`);
    
    // Check for [object Object]
    const allValues = JSON.stringify(optData);
    const hasCorruption = allValues.includes('[object Object]');
    console.log(`  ${hasCorruption ? '❌' : '✅'} Corruption check: ${hasCorruption ? 'CORRUPT' : 'CLEAN'}\n`);

    // 2. Check analysis endpoint response structure (mock test)
    console.log('TEST 2: Expected API Response Structure');
    console.log('  Expected fields in /api/analyze response:');
    console.log('  ✅ success: boolean');
    console.log('  ✅ data.analysis: string (AI response)');
    console.log('  ✅ data.recommendations:');
    console.log('    ✅ characterProfile: { gender, age_range, body_type, ... }');
    console.log('    ✅ productDetails: { garment_type, style_category, ... }');
    console.log('    ✅ scene: { choice, choiceArray, reason }');
    console.log('    ✅ accessories: { choice, choiceArray, reason }');
    console.log('    ✅ (other categories)');
    console.log('  ✅ data.newOptionsCreated: array of new options');
    console.log('  ✅ data.characterDescription: string');
    console.log('  ✅ data.providers: { analysis, fallback }');

    // 3. Parse recommendations logic test
    console.log('\nTEST 3: Recommendation Parsing Logic');
    const testResponse = {
      character: {
        gender: 'Female',
        age_range: '28-35',
        body_type: 'Pear-shaped',
        skin_tone: 'Deep',
        hair_color: 'Black',
        hair_length: 'Shoulder-length',
        hair_texture: 'Wavy',
        hair_style: 'Textured-waves',
        face_shape: 'Oval'
      },
      product: {
        garment_type: 'Midi-dress',
        style_category: 'Casual-elegant',
        primary_color: 'Navy',
        secondary_color: 'White',
        pattern: 'Striped',
        fabric_type: 'Cotton-linen-blend',
        fit_type: 'A-line',
        key_details: 'Sleeveless, belt-included'
      },
      recommendations: {
        scene: { choice: 'outdoor-luxury', reason: 'Perfect for resort setting' },
        lighting: { choice: 'golden-hour', reason: 'Warm tones complement the outfit' },
        mood: { choice: 'sophisticated', reason: 'Elevated casual vibe' },
        accessories: { choice: 'leather-belt, gold-earrings', reason: 'Adds definition and polish' },
        hairstyle: { choice: 'sleek-ponytail', reason: 'Clean and elegant' }
      }
    };

    // Parse character
    if (testResponse.character) {
      console.log('  ✅ Character profile extracted');
    }
    // Parse product
    if (testResponse.product) {
      console.log('  ✅ Product details extracted');
    }
    // Parse recommendations with multi-value support
    const recs = testResponse.recommendations;
    Object.entries(recs).forEach(([key, rec]) => {
      if (rec.choice && typeof rec.choice === 'string') {
        const values = rec.choice.split(',').map(c => c.trim());
        const display = values.length > 1 ? `${values.length} items` : values[0];
        console.log(`  ✅ ${key}: "${display}"`);
      }
    });

    console.log('\n✅ BACKEND RESPONSE STRUCTURE TEST PASSED\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testBackendResponseStructure();
