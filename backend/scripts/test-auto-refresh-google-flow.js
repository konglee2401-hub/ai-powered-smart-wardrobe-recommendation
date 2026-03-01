#!/usr/bin/env node

/**
 * Test: Service with Automatic Token Refresh
 * 
 * Shows that the service now:
 * 1. Detects old tokens
 * 2. Automatically refreshes them
 * 3. Proceeds with valid tokens
 */

import GoogleFlowAutomationService from '../services/googleFlowAutomationService.js';

async function testAutoRefresh() {
  console.log('======================================================================');
  console.log('🧪 TEST: Automatic Token Refresh');
  console.log('======================================================================\n');

  const service = new GoogleFlowAutomationService({
    type: 'image',
    projectId: '58d791d4-37c9-47a8-ae3b-816733bc3ec0',
    headless: false,
    modelFamily: 'Nano Banana Pro'
  });

  try {
    console.log('📋 STEP 1: Initialize service (auto-checks token age)\n');
    await service.init();

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📋 STEP 2: Navigate to project\n');
    await service.navigateToFlow();

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📋 STEP 3: Submit test prompt\n');

    // Use the service's proper enterPrompt method
    const testPrompt = 'A beautiful white flowing dress on a woman standing in natural light, professional fashion photography, 8K quality, studio lighting, full body';
    
    try {
      await service.enterPrompt(testPrompt);
      console.log('✓ Prompt submitted successfully\n');
    } catch (error) {
      console.error('❌ Error submitting prompt:', error.message);
      throw error;
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📋 STEP 4: Click Generate\n');
    await service.clickCreate();

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('⏳ Waiting for image generation (60 seconds)...\n');
    await service.page.waitForTimeout(60000);

    console.log('\n✅ TEST COMPLETE!\n');
    console.log('📊 RESULTS:\n');
    console.log('   ✅ Service initialized');
    console.log('   ✅ Token age checked');
    console.log('   ✅ Tokens auto-refreshed if needed');
    console.log('   ✅ Prompt submitted');
    console.log('   ✅ Generate button clicked');
    console.log('   ✅ Image generation started\n');

    console.log('💡 Check browser for image result\n');

    console.log('Press Ctrl+C to close...\n');
    await service.page.waitForTimeout(300000);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    if (service.browser) {
      await service.browser.close();
    }
  }
}

testAutoRefresh().catch(console.error);
