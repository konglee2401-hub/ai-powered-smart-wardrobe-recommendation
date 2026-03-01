#!/usr/bin/env node

/**
 * Debug Mode Test
 * Opens Google Flow project and does nothing else (manual testing only)
 * 
 * All automation is disabled:
 * - No token clearing
 * - No form submission
 * - No generation
 * - Just opens and waits for manual interaction
 * 
 * Usage:
 *   node scripts/test-debug-mode.js
 */

import path from 'path';
import { fileURLToPath } from 'url';
import GoogleFlowAutomationService from '../services/googleFlowAutomationService.js';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testDebugMode() {
  console.log('\n' + '='.repeat(80));
  console.log('  DEBUG MODE - Manual Testing');
  console.log('='.repeat(80) + '\n');

  console.log('🔧 Creating service with debugMode: true\n');

  const service = new GoogleFlowAutomationService({
    type: 'image',
    headless: false,
    projectId: '58d791d4-37c9-47a8-ae3b-816733bc3ec0',
    debugMode: true  // ENABLE DEBUG MODE
  });

  try {
    console.log('📍 Step 1: init() - Loading session & browser\n');
    await service.init();

    console.log('📍 Step 2: navigateToFlow() - Opening project\n');
    await service.navigateToFlow();

    console.log('\n' + '='.repeat(80));
    console.log('✅ Project is OPEN and READY for manual testing\n');
    
    console.log('📋 What you can do now:\n');
    console.log('   1. Type a prompt in the textbox');
    console.log('   2. Click "Tạo" button to generate');
    console.log('   3. Observe browser behavior\n');
    
    console.log('🔍 Debug / Inspect in DevTools (F12):\n');
    console.log('   - Application → Cookies');
    console.log('   - Application → Local Storage');
    console.log('   - Console for any errors\n');
    
    console.log('═'.repeat(80) + '\n');

    // Wait for user to finish testing
    console.log('Option 1: Auto-wait 300 seconds (5 minutes)');
    console.log('Option 2: Press ENTER to exit now\n');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      timeout: 300000 // 5 minutes
    });

    let userExited = false;

    rl.on('line', () => {
      userExited = true;
      rl.close();
    });

    rl.on('close', () => {
      // User pressed ENTER or timeout
    });

    // Wait for either user input or timeout
    await new Promise(resolve => {
      setTimeout(() => {
        if (!userExited) {
          console.log('\n⏰ 5 minutes timeout reached');
        }
        rl.close();
        resolve();
      }, 300000);
    });

    console.log('\n✅ Closing browser...');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await service.close();
    console.log('✅ Done\n');
    process.exit(0);
  }
}

testDebugMode().catch(error => {
  console.error('Fatal:', error);
  process.exit(1);
});
