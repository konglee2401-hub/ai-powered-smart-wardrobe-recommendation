#!/usr/bin/env node

import ChatGPTService from './services/browser/chatgptService.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Test ChatGPT Browser Service
 */
async function main() {
  console.log('╔' + '═'.repeat(78) + '╗');
  console.log('║' + ' '.repeat(20) + '🤖 ChatGPT Browser Service Test' + ' '.repeat(26) + '║');
  console.log('╚' + '═'.repeat(78) + '╝');
  console.log('');

  // Check test images
  const testImagesDir = path.join(__dirname, '../../test-images');
  let testImage = null;

  if (fs.existsSync(testImagesDir)) {
    const images = fs.readdirSync(testImagesDir).filter(f => 
      /\.(jpg|jpeg|png|gif)$/i.test(f)
    );
    
    if (images.length > 0) {
      testImage = path.join(testImagesDir, images[0]);
      console.log(`✅ Found test image: ${images[0]}`);
    }
  }

  if (!testImage) {
    console.log('⚠️  No test images found. Using a sample prompt with description.');
    console.log('');
  }

  const service = new ChatGPTService({ 
    headless: false,
    timeout: 120000
  });

  try {
    console.log('📍 Initializing ChatGPT service...\n');
    await service.initialize();

    if (testImage) {
      console.log('📸 Analyzing test image...\n');
      
      const prompt = 'Analyze this image and provide a detailed description of what you see, including any colors, objects, people, and the overall composition.';
      
      const result = await service.analyzeImage(testImage, prompt);
      
      console.log('\n📋 TEST RESULT:');
      console.log('─'.repeat(80));
      console.log(result.substring(0, 500));
      if (result.length > 500) {
        console.log('... (truncated)');
      }
      console.log('─'.repeat(80));
      console.log('');
      console.log('✅ ChatGPT analysis test PASSED!');
    } else {
      console.log('⏭️  Skipping image test (no test images available)');
      console.log('✅ ChatGPT initialization test PASSED!');
    }

  } catch (error) {
    console.error('');
    console.error('❌ TEST FAILED:');
    console.error('─'.repeat(80));
    console.error('Error:', error.message);
    console.error('─'.repeat(80));
    process.exit(1);
  } finally {
    try {
      console.log('\n🔒 Closing browser...');
      await service.close();
      console.log('✅ Browser closed');
    } catch (e) {
      console.log('⚠️  Browser already closed');
    }
  }

  console.log('');
  console.log('╔' + '═'.repeat(78) + '╗');
  console.log('║' + ' '.repeat(25) + '✅ All tests passed!' + ' '.repeat(32) + '║');
  console.log('╚' + '═'.repeat(78) + '╝');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
