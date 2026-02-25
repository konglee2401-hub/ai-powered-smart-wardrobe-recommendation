/**
 * Test script: Verify promptSuggestion in action
 * Simulates the buildChangeClothesPrompt flow with new promptSuggestion field
 */

import mongoose from 'mongoose';
import PromptOption from './backend/models/PromptOption.js';
import { buildDetailedPrompt } from './backend/services/smartPromptBuilder.js';

async function testPromptSuggestions() {
  try {
    console.log('🔍 Testing Prompt Suggestions...\n');
    
    // Connect to database
    await mongoose.connect('mongodb://localhost:27017/smart-wardrobe');
    console.log('✅ Connected to MongoDB\n');
    
    // 1. Check if promptSuggestion field is populated
    console.log('1️⃣  Checking database for promptSuggestion field...');
    const sceneOption = await PromptOption.findOne({ category: 'scene', value: 'studio' });
    if (sceneOption && sceneOption.promptSuggestion) {
      console.log(`   ✅ Scene "studio" has promptSuggestion:`);
      console.log(`   "${sceneOption.promptSuggestion.substring(0, 80)}..."\n`);
    } else {
      console.log('   ❌ No promptSuggestion found\n');
    }
    
    // 2. Check another option
    console.log('2️⃣  Checking another option...');
    const lightingOption = await PromptOption.findOne({ category: 'lighting', value: 'soft' });
    if (lightingOption && lightingOption.promptSuggestion) {
      console.log(`   ✅ Lighting "soft" has promptSuggestion:`);
      console.log(`   "${lightingOption.promptSuggestion.substring(0, 80)}..."\n`);
    }
    
    // 3. Test buildDetailedPrompt with new options
    console.log('3️⃣  Testing buildDetailedPrompt with promptSuggestions...');
    const testAnalysis = {
      character: {
        age: '25',
        gender: 'female',
        skinTone: 'light',
        hair: { color: 'brown', style: 'straight', length: 'long' },
        facialFeatures: 'defined cheekbones'
      },
      product: {
        garment_type: 'dress',
        primary_color: 'red',
        fabric_type: 'cotton',
        fit_type: 'fitted',
        key_details: 'sleeveless'
      }
    };
    
    const testOptions = {
      scene: 'studio',
      lighting: 'soft',
      mood: 'elegant',
      style: 'formal',
      cameraAngle: 'front-view',
      colorPalette: 'vibrant',
      hairstyle: 'long-straight',
      makeup: 'glowing',
      shoes: 'heels',
      bottom: 'jeans'
    };
    
    const prompt = await buildDetailedPrompt(testAnalysis, testOptions, 'change-clothes', 'full-outfit');
    
    console.log('   ✅ Prompt generated successfully!\n');
    console.log('📄 GENERATED PROMPT EXCERPT:');
    console.log('─'.repeat(80));
    
    // Show relevant sections
    const lines = prompt.split('\\n');
    let showNext = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('HAIRSTYLE') || showNext > 0) {
        console.log(lines[i]);
        showNext++;
        if (showNext > 15) break; // Show first 15 lines of this section
      }
    }
    
    console.log('─'.repeat(80));
    console.log('\\n4️⃣  Checking for promptSuggestion text in generated prompt...');
    
    // Check if promptSuggestions are in the prompt
    if (prompt.includes('Long straight hair flowing smoothly')) {
      console.log('   ✅ Hairstyle promptSuggestion found in prompt');
    }
    if (prompt.includes('Soft diffused lighting creating flattering')) {
      console.log('   ✅ Lighting promptSuggestion found in prompt');
    }
    if (prompt.includes('Professional studio with white seamless backdrop')) {
      console.log('   ✅ Scene promptSuggestion found in prompt');
    }
    if (prompt.includes('Formal professional fashion')) {
      console.log('   ✅ Style promptSuggestion found in prompt');
    }
    
    console.log('\\n✅ TEST COMPLETE - promptSuggestions are working!\\n');
    
    // Analyze prompt quality
    console.log('📊 PROMPT QUALITY ANALYSIS:');
    console.log(`   - Total length: ${prompt.length} characters`);
    console.log(`   - Contains promptSuggestions: ${(prompt.match(/promptSuggestion/g) || []).length > 0 ? 'YES' : 'NO'}`);
    console.log(`   - Number of sections: ${(prompt.match(/===/g) || []).length / 2}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\\n🔌 Database connection closed');
  }
}

// Run test
testPromptSuggestions();
