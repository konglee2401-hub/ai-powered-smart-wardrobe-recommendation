/**
 * Test script to interactively test settings buttons
 * Usage: npm run test-debug-settings (from backend folder with internet)
 * 
 * This script:
 * 1. Initializes GoogleFlowAutomationService with visual browser
 * 2. Navigates to Google Flow page
 * 3. Clicks settings button to open menu
 * 4. Interactively clicks each tab to test if they work
 */

import GoogleFlowAutomationService from './services/googleFlowAutomationService.js';

async function testSettingsInteractive() {
  console.log('🚀 Starting Interactive Settings Buttons Test\n');

  const service = new GoogleFlowAutomationService({
    headless: false,  // Show browser visually
    timeout: 60000,
    type: 'image',
    imageCount: 1,
    aspectRatio: '9:16',
    model: 'Nano Banana Pro'
  });

  try {
    // Step 1: Initialize browser
    console.log('📍 Step 1: Initializing browser...');
    await service.init();
    console.log('✓ Browser initialized\n');

    // Step 2: Navigate to Google Flow
    console.log('📍 Step 2: Navigating to Google Flow...');
    const url = 'https://labs.google/fx/vi/tools/flow/project/58d791d4-37c9-47a8-ae3b-816733bc3ec0';
    console.log(`   URL: ${url}`);
    
    try {
      await service.page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      console.log('✓ Page loaded\n');
    } catch (e) {
      // If page load fails (no internet), just continue - we may still be able to test
      console.log('⚠️  Page load warning (may be offline): ' + e.message);
      console.log('   Waiting 5 seconds anyway...\n');
      await service.page.waitForTimeout(5000);
    }

    // Step 3: Wait for page to settle
    console.log('📍 Step 3: Waiting for page to settle...');
    await service.page.waitForTimeout(3000);
    console.log('✓ Page ready\n');

    // Step 4: Click settings button
    console.log('📍 Step 4: Clicking settings button to open menu...');
    const settingsOpened = await service.clickSettingsButton();
    if (settingsOpened) {
      console.log('✓ Settings menu opened\n');
    } else {
      console.log('⚠️  Settings button click may have failed\n');
    }

    await service.page.waitForTimeout(1000);

    // Step 5: Test clicking each tab
    console.log('📍 Step 5: Testing tab clicks\n');

    const testsToRun = [
      { selector: 'button[id*="IMAGE"][role="tab"]', name: 'IMAGE tab', delay: 1000 },
      { selector: 'button[id*="VIDEO"][role="tab"]', name: 'VIDEO tab', delay: 1000 },
      { selector: 'button[id*="PORTRAIT"][role="tab"]', name: 'PORTRAIT (Dọc) tab', delay: 1000 },
      { selector: 'button[id*="LANDSCAPE"][role="tab"]', name: 'LANDSCAPE (Ngang) tab', delay: 1000 },
      { text: 'x1', name: 'x1 count button', delay: 800 },
      { text: 'x2', name: 'x2 count button', delay: 800 },
      { text: 'x3', name: 'x3 count button', delay: 800 },
      { text: 'x4', name: 'x4 count button', delay: 800 }
    ];

    for (let i = 0; i < testsToRun.length; i++) {
      const test = testsToRun[i];
      console.log(`\n   [${i + 1}/${testsToRun.length}] Testing: ${test.name}`);
      console.log('   ═'.repeat(40));

      try {
        if (test.selector) {
          // Test using selectRadixTab (by selector)
          console.log(`   Selector: ${test.selector}`);
          const result = await service.selectRadixTab(test.selector, test.name);
          console.log(`   Result: ${result ? '✓ SUCCESS' : '❌ FAILED'}`);
        } else if (test.text) {
          // Test using selectTab (by text)
          console.log(`   Text: "${test.text}"`);
          const result = await service.selectTab(test.text);
          console.log(`   Result: ${result ? '✓ SUCCESS' : '❌ FAILED'}`);
        }

        // Wait so you can see changes on screen
        console.log(`   ⏳ Waiting ${test.delay}ms before next test...\n`);
        await service.page.waitForTimeout(test.delay);

      } catch (error) {
        console.log(`   ❌ Error: ${error.message}\n`);
      }
    }

    console.log('\n' + '═'.repeat(60));
    console.log('✅ All tests completed!');
    console.log('═'.repeat(60));
    console.log('\nBrowser will stay open for 10 more seconds then close...');
    console.log('Watch the settings menu for any issues.\n');

    await service.page.waitForTimeout(10000);

  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    console.error(error.stack);

  } finally {
    console.log('\n🛑 Closing browser...');
    await service.close();
    console.log('✓ Browser closed\n');
  }
}

testSettingsInteractive();

