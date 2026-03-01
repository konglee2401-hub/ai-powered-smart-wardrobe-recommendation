#!/usr/bin/env node

/**
 * Manual Testing - Only open Google Flow project
 * 
 * Opens the project and does NOTHING else
 * You can manually test cookies/generation in the browser
 * 
 * Usage:
 *   node scripts/test-manual-only.js
 */

import path from 'path';
import { fileURLToPath } from 'url';
import GoogleFlowAutomationService from '../services/googleFlowAutomationService.js';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function askUser(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function testManual() {
  console.log('\n' + '='.repeat(80));
  console.log('  MANUAL TEST MODE - Browser Only');
  console.log('='.repeat(80) + '\n');

  const service = new GoogleFlowAutomationService({
    type: 'image',
    headless: false,
    projectId: '58d791d4-37c9-47a8-ae3b-816733bc3ec0',
    aspectRatio: '9:16',
    imageCount: 1,
    model: 'Nano Banana Pro'
  });

  try {
    console.log('📍 STEP 1: Initialize service\n');
    await service.init();
    console.log('   ✅ Service initialized\n');

    console.log('📍 STEP 2: Navigate to Google Flow\n');
    await service.navigateToFlow();
    console.log('   ✅ Navigated to project\n');

    console.log('═'.repeat(80));
    console.log('\n✅ Project is now open!\n');
    console.log('💡 You can now manually:\n');
    console.log('   1. Type a prompt in the textbox');
    console.log('   2. Click the "Tạo" button');
    console.log('   3. Watch what happens\n');
    console.log('📋 Open DevTools (F12) and check:\n');
    console.log('   - Application → Cookies → look for _GRECAPTCHA');
    console.log('   - Application → Local Storage → look for rc::* or _grecaptcha\n');
    console.log('═'.repeat(80) + '\n');

    // Ask what user wants to do
    console.log('Options:');
    console.log('   1. Keep browser open for manual testing (waiting for 2 minutes)');
    console.log('   2. Exit now\n');

    const choice = await askUser('Select option (1 or 2): ');

    if (choice === '1') {
      console.log('\n⏳ Browser will stay open for 120 seconds for manual testing...');
      console.log('   Press Ctrl+C in the browser to close it\n');
      
      for (let i = 0; i < 120; i++) {
        process.stdout.write(`\r   ${i + 1}/120 seconds...`);
        await sleep(1000);
      }
      
      console.log('\n\n⏰ Time\'s up!');
    }

    console.log('\n✅ Manual test completed');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    console.log('\n📁 Closing browser...');
    await service.close();
    console.log('✅ Done\n');
    process.exit(0);
  }
}

testManual().catch(error => {
  console.error('Fatal:', error);
  process.exit(1);
});
