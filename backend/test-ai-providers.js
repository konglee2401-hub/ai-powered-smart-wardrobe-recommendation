/**
 * Test FREE AI Providers
 * Tests: AI Analysis (image-to-text) with FREE providers only
 */

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { analyzeImagesForPrompt, generateImages } from './services/imageGenService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test images paths
const characterImagePath = path.join(__dirname, 'test-images/anh nhan vat.jpeg');
const productImagePath = path.join(__dirname, 'test-images/anh-san-pham.png');

/**
 * Test FREE AI Analysis Providers
 */
async function testProviders() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 TESTING FREE AI PROVIDERS');
  console.log('='.repeat(80) + '\n');
  
  // Check which keys are available
  console.log('📋 API Keys Status:');
  console.log(`   Gemini:        ${process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_key_here' ? '✓ Set' : '✗ Missing'}`);
  console.log(`   Hugging Face:  ${process.env.HUGGINGFACE_API_KEY && process.env.HUGGINGFACE_API_KEY !== 'your_hf_token_here' ? '✓ Set' : '✗ Missing'}`);
  console.log(`   Replicate:     ${process.env.REPLICATE_API_TOKEN && process.env.REPLICATE_API_TOKEN !== 'your_replicate_token_here' ? '✓ Set' : '✗ Missing'}`);
  console.log('');
  
  // Check if test images exist
  try {
    await fs.access(characterImagePath);
    await fs.access(productImagePath);
    console.log('✓ Test images found\n');
  } catch (e) {
    console.log('⚠️  Test images not found');
    console.log('   Character:', characterImagePath);
    console.log('   Product:', productImagePath);
    console.log('');
  }
  
  // Test 1: AI Analysis
  console.log('📋 TEST 1: AI ANALYSIS\n');
  
  try {
    const analysis = await analyzeImagesForPrompt(characterImagePath, productImagePath);
    
    console.log('\n✅ TEST 1 PASSED');
    console.log('Provider used:', analysis._source);
    console.log('Character features:', analysis.character?.features?.substring(0, 100) + '...');
    
  } catch (error) {
    console.error('\n❌ TEST 1 FAILED');
    console.error('Error:', error.message);
  }
  
  // Test 2: Image Generation
  console.log('\n📋 TEST 2: IMAGE GENERATION\n');
  
  try {
    const results = await generateImages({
      characterImagePath,
      productImagePath,
      prompt: 'A young Vietnamese woman wearing elegant fashion',
      count: 1
    });
    
    console.log('\n✅ TEST 2 PASSED');
    console.log(`Generated ${results.length} images`);
    results.forEach((r, i) => {
      console.log(`  Image ${i + 1}: ${r.buffer.length} bytes, seed: ${r.seed}`);
    });
    
  } catch (error) {
    console.error('\n❌ TEST 2 FAILED');
    console.error('Error:', error.message);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('🧪 TESTS COMPLETED');
  console.log('='.repeat(80) + '\n');
}

// Run tests
testProviders().then(() => {
  console.log('✅ Test script finished');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Test script error:', error);
  process.exit(1);
});
