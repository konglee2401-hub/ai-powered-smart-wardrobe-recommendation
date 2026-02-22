#!/usr/bin/env node

import ChatGPTService from './services/browser/chatgptService.js';
import GrokServiceV2 from './services/browser/grokServiceV2.js';
import ZAIChatService from './services/browser/zaiChatService.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Test all browser automation services
 */
async function main() {
  console.log('╔' + '═'.repeat(78) + '╗');
  console.log('║' + ' '.repeat(15) + '🌐 Browser Automation Services Integration Test' + ' '.repeat(15) + '║');
  console.log('╚' + '═'.repeat(78) + '╝');
  console.log('');

  // Find test image
  const testImagesDir = path.join(__dirname, '../../test-images');
  let testImage = null;

  if (fs.existsSync(testImagesDir)) {
    const images = fs.readdirSync(testImagesDir).filter(f => 
      /\.(jpg|jpeg|png|gif)$/i.test(f)
    );
    
    if (images.length > 0) {
      testImage = path.join(testImagesDir, images[0]);
      console.log(`✅ Found test image: ${images[0]}\n`);
    }
  }

  if (!testImage) {
    console.error('❌ No test images found');
    process.exit(1);
  }

  const services = [
    { name: 'ChatGPT', ServiceClass: ChatGPTService },
    { name: 'Grok', ServiceClass: GrokServiceV2 },
    { name: 'Z.AI', ServiceClass: ZAIChatService }
  ];

  const prompt = 'Briefly describe what you see in this image in 1-2 sentences.';
  const results = [];

  for (const serviceInfo of services) {
    console.log(`\n${'═'.repeat(80)}`);
    console.log(`\n🧪 Testing ${serviceInfo.name}`);
    console.log(`${'─'.repeat(80)}`);

    const service = new serviceInfo.ServiceClass({ 
      headless: false,
      timeout: 120000
    });

    try {
      console.log(`📍 Initializing ${serviceInfo.name}...`);
      await service.initialize();

      console.log(`📸 Analyzing image...`);
      const result = await service.analyzeImage(testImage, prompt);
      
      const resultLength = result.length;
      const preview = result.substring(0, 150);
      
      console.log(`✅ ${serviceInfo.name} analysis successful`);
      console.log(`📊 Response length: ${resultLength} characters`);
      console.log(`📝 Preview: ${preview}${resultLength > 150 ? '...' : ''}`);
      
      results.push({
        service: serviceInfo.name,
        status: '✅ PASS',
        length: resultLength
      });

    } catch (error) {
      console.error(`❌ ${serviceInfo.name} failed: ${error.message}`);
      results.push({
        service: serviceInfo.name,
        status: '❌ FAIL',
        error: error.message
      });
    } finally {
      try {
        console.log(`🔒 Closing browser...`);
        await service.close();
      } catch (e) {
        // Already closed
      }
    }
  }

  // Summary
  console.log(`\n${'═'.repeat(80)}`);
  console.log('\n📊 TEST SUMMARY');
  console.log('─'.repeat(80));

  results.forEach(r => {
    const statusIcon = r.status.includes('PASS') ? '✅' : '❌';
    console.log(`${statusIcon} ${r.service}: ${r.status}`);
    if (r.length) console.log(`   └─ Response: ${r.length} characters`);
    if (r.error) console.log(`   └─ Error: ${r.error}`);
  });

  console.log('─'.repeat(80));

  const passCount = results.filter(r => r.status.includes('PASS')).length;
  const totalCount = results.length;
  
  console.log(`\n${passCount}/${totalCount} services passed`);

  if (passCount === totalCount) {
    console.log('');
    console.log('╔' + '═'.repeat(78) + '╗');
    console.log('║' + ' '.repeat(20) + '✅ All services working!' + ' '.repeat(35) + '║');
    console.log('╚' + '═'.repeat(78) + '╝');
    process.exit(0);
  } else {
    console.log('');
    console.log('╔' + '═'.repeat(78) + '╗');
    console.log('║' + ' '.repeat(20) + '⚠️  Some services failed' + ' '.repeat(33) + '║');
    console.log('╚' + '═'.repeat(78) + '╝');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
