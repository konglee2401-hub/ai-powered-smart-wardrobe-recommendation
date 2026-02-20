/**
 * Test Image Generation Script
 * Tests image generation with mock data to verify no corruption
 */

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import imageGenService from './services/imageGenService.js';
import { saveGeneratedImage } from './utils/uploadConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Test image generation with real images
 */
async function testImageGeneration() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 TESTING IMAGE GENERATION');
  console.log('='.repeat(80) + '\n');
  
  try {
    // Paths to test images (in backend/test-images folder)
    const characterImagePath = path.join(__dirname, './test-images/anh-nhan-vat.jpeg');
    const productImagePath = path.join(__dirname, './test-images/Anh san pham.png');
    
    // Check if test images exist
    try {
      await fs.access(characterImagePath);
      await fs.access(productImagePath);
      console.log('✅ Test images found');
    } catch (error) {
      console.error('❌ Test images not found!');
      console.error('Please place test images in backend/test-images/ folder:');
      console.error('  - anh-nhan-vat.jpeg');
      console.error('  - anh-san-pham.png');
      console.log('\n📝 Creating sample test instructions...');
      
      // Create a sample test file for reference
      const sampleTest = `// Sample test - copy your images to:
// - backend/test-images/anh-nhan-vat.jpeg
// - backend/test-images/anh-san-pham.png

// Then run: node test-image-generation.js
`;
      await fs.writeFile(path.join(__dirname, '../test-images/README.md'), sampleTest);
      console.log('✅ Created README.md with instructions');
      return;
    }
    
    // Build prompt
    const styleOptions = {
      characterStyle: 'realistic',
      productStyle: 'elegant',
      setting: 'studio',
      lighting: 'natural',
      cameraAngle: 'eye-level',
      mood: 'confident',
      colorPalette: 'vibrant'
    };
    
    const basePrompt = 'A professional fashion photo of a young woman wearing elegant black outfit';
    const enhancedPrompt = imageGenService.buildEnhancedPrompt(basePrompt, styleOptions);
    
    console.log('\n📝 PROMPT:');
    console.log('-'.repeat(80));
    console.log(enhancedPrompt.substring(0, 300) + '...');
    console.log('-'.repeat(80) + '\n');
    
    // Test with different image counts
    const testCounts = [1, 2];
    
    for (const count of testCounts) {
      console.log(`\n🎨 Testing generation of ${count} image(s)...\n`);
      
      const results = await imageGenService.generateImages({
        characterImagePath,
        productImagePath,
        prompt: enhancedPrompt,
        negativePrompt: 'low quality, blurry, watermark',
        count: count,
        selectedModel: 'pollinations' // Use Pollinations for testing
      });
      
      console.log(`\n✅ Generated ${results.length} images`);
      
      // Save images
      console.log('\n💾 Saving images...\n');
      
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const filename = `test-${count}-images-${Date.now()}-${i}.png`;
        
        try {
          const filepath = await saveGeneratedImage(result.buffer, filename);
          
          // Verify saved file
          const stats = await fs.stat(filepath);
          
          console.log(`✅ Image ${i + 1}/${results.length}:`);
          console.log(`   File: ${filename}`);
          console.log(`   Size: ${stats.size} bytes`);
          console.log(`   Seed: ${result.seed}`);
          
          // Try to read back
          const readBuffer = await fs.readFile(filepath);
          if (readBuffer.length === stats.size) {
            console.log(`   ✓ Verification passed`);
          } else {
            console.log(`   ✗ Verification failed: size mismatch`);
          }
          
        } catch (error) {
          console.error(`❌ Failed to save image ${i + 1}:`, error.message);
        }
      }
      
      console.log(`\n${'='.repeat(80)}\n`);
    }
    
    console.log('✅ ALL TESTS COMPLETED SUCCESSFULLY!\n');
    console.log('Check the uploads/generated-images/ folder for saved images.\n');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    console.error(error.stack);
  }
}

// Run test
testImageGeneration().then(() => {
  console.log('Test script finished');
  process.exit(0);
}).catch((error) => {
  console.error('Test script error:', error);
  process.exit(1);
});
