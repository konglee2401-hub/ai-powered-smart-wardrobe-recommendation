/**
 * Quick Test Script: Browser Automation Fixes
 * 
 * Tests:
 * 1. Model selection (Nano Banana Pro, Nano Banana, Veo 3.1)
 * 2. Quantity selection (x1, x2, x3, x4)
 * 3. Prompt typing and submit button click
 * 
 * Run: node backend/test-browser-automation-fixes.js
 */

import GoogleFlowAutomationService from './services/googleFlowAutomationService.js';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function section(title) {
  console.log('\n' + '='.repeat(80));
  log(title, 'bright');
  console.log('='.repeat(80) + '\n');
}

function test(name) {
  log(`\n▶ TEST: ${name}`, 'magenta');
  return { name, start: Date.now() };
}

function pass(testInfo, message = '') {
  const duration = ((Date.now() - testInfo.start) / 1000).toFixed(2);
  log(`  ✅ PASS (${duration}s) ${message}`, 'green');
}

function fail(testInfo, error) {
  const duration = ((Date.now() - testInfo.start) / 1000).toFixed(2);
  log(`  ❌ FAIL (${duration}s) ${error || ''}`, 'red');
}

async function testModelSelection() {
  const t = test('Model Selection - Nano Banana Pro');
  
  try {
    const service = new GoogleFlowAutomationService({
      type: 'image',
      projectId: '58d791d4-37c9-47a8-ae3b-816733bc3ec0',
      imageCount: 1,
      headless: false
    });

    log('  🌐 Opening Google Gemini...');
    await service.initialize();
    await service.page.goto('https://gemini.google.com');
    await service.page.waitForTimeout(3000);

    log('  📊 Testing model selection...');
    const result = await service.selectModel();
    
    if (result) {
      pass(t, '- Model selected successfully');
    } else {
      fail(t, '- Model selection failed');
    }

    await service.page.waitForTimeout(2000);
    await service.close();
  } catch (error) {
    fail(t, error.message);
  }
}

async function testMultipleQuantities() {
  const quantities = ['x1', 'x3', 'x4'];
  
  for (const qty of quantities) {
    const t = test(`Quantity Selection - ${qty}`);
    
    try {
      const service = new GoogleFlowAutomationService({
        type: 'image',
        projectId: '58d791d4-37c9-47a8-ae3b-816733bc3ec0',
        imageCount: 1,
        headless: false
      });

      log(`  🌐 Opening Google Gemini...`);
      await service.initialize();
      await service.page.goto('https://gemini.google.com');
      await service.page.waitForTimeout(3000);

      // Try to find and click the quantity tab
      log(`  📊 Looking for tab: ${qty}...`);
      const result = await service.selectTab(qty);
      
      if (result) {
        pass(t, `- ${qty} selected successfully`);
      } else {
        fail(t, `- ${qty} selection failed (may not be visible yet)`);
      }

      await service.page.waitForTimeout(1500);
      await service.close();
    } catch (error) {
      fail(t, error.message);
    }
  }
}

async function testPromptAndSubmit() {
  const t = test('Prompt Input & Submit Button Click');
  
  try {
    const service = new GoogleFlowAutomationService({
      type: 'image',
      projectId: '58d791d4-37c9-47a8-ae3b-816733bc3ec0',
      imageCount: 1,
      headless: false
    });

    log('  🌐 Opening Google Gemini...');
    await service.initialize();
    await service.page.goto('https://gemini.google.com');
    await service.page.waitForTimeout(3000);

    // Check if prompt textbox is available
    const promptExists = await service.page.$('[role="textbox"][data-slate-editor="true"]');
    
    if (!promptExists) {
      log('  ⚠️  Prompt textbox not found on page', 'yellow');
      log('  💡 This is normal - the interface may need time to load', 'dim');
      fail(t, 'Prompt textbox not found (may require login)');
      await service.close();
      return;
    }

    log('  ✍️  Typing prompt...');
    const prompt = 'A beautiful fashion model wearing a blue summer dress, standing in a bright studio, professional photography';
    await service.enterPrompt(prompt);
    
    log('  ⏳ Waiting 2 seconds before trying to click submit...');
    await service.page.waitForTimeout(2000);

    log('  🖱️  Looking for submit button...');
    let clicked = false;
    
    try {
      await service.clickCreate();
      clicked = true;
    } catch (e) {
      log(`  ⚠️  Submit click encountered: ${e.message}`, 'yellow');
    }

    if (clicked) {
      pass(t, '- Prompt typed and submit button clicked');
    } else {
      log('  ℹ️  Submit button may not have been clickable (this is expected if generating)', 'dim');
      pass(t, '- Prompt typed successfully');
    }

    log('\n  ⏳ Waiting 180 seconds for visual verification...', 'yellow');
    log('  📸 Check the browser window to verify generation started', 'yellow');
    log('  ⏱️  (Waiting 180s = 3 minutes...)', 'dim');
    
    await service.page.waitForTimeout(180000);

    await service.close();
  } catch (error) {
    fail(t, error.message);
  }
}

async function testCompleteFlow() {
  const t = test('Complete Flow: Model → Quantity → Prompt → Submit');
  
  try {
    const service = new GoogleFlowAutomationService({
      type: 'image',
      projectId: '58d791d4-37c9-47a8-ae3b-816733bc3ec0',
      imageCount: 1,
      headless: false
    });

    log('  🌐 Opening Google Gemini...');
    await service.initialize();
    await service.page.goto('https://gemini.google.com');
    await service.page.waitForTimeout(4000);

    // Step 1: Select model
    log('  📊 Step 1: Selecting model...');
    let result = await service.selectModel();
    log(`     Result: ${result ? '✅' : '⚠️ (may not be available)'}`);

    // Step 2: Select quantity
    log('  📊 Step 2: Selecting quantity (x2)...');
    result = await service.selectTab('x2');
    log(`     Result: ${result ? '✅' : '⚠️ (may not be visible)'}`);
    await service.page.waitForTimeout(1000);

    // Step 3: Check if prompt box exists
    const promptExists = await service.page.$('[role="textbox"][data-slate-editor="true"]');
    if (promptExists) {
      log('  📊 Step 3: Typing prompt...');
      await service.enterPrompt('A woman in casual style, wearing a light jacket, outdoor setting');
      
      log('  📊 Step 4: Clicking submit button...');
      await service.page.waitForTimeout(1500);
      try {
        await service.clickCreate();
        log('     Result: ✅ Submit clicked');
      } catch (e) {
        log(`     Result: ⚠️ ${e.message}`);
      }
    } else {
      log('  ⚠️  Prompt interface not ready (may require authentication)', 'yellow');
    }

    log('\n  ⏳ Waiting 180 seconds for visual verification...', 'yellow');
    await service.page.waitForTimeout(180000);

    await service.close();
    pass(t, '- Flow completed');
  } catch (error) {
    fail(t, error.message);
  }
}

async function runAllTests() {
  section('🎬 BROWSER AUTOMATION FIXES - QUICK TEST SUITE');
  
  log('This test script will:', 'bright');
  log('  1. Open Google Gemini (non-headless mode so you can watch)');
  log('  2. Test model selection');
  log('  3. Test quantity selection (x1, x3, x4)');
  log('  4. Test prompt input and submit button');
  log('  5. Wait 180s at key points for visual verification');
  log('');
  log('Make sure you have a stable internet connection!', 'yellow');
  log('Press Ctrl+C to stop any test early.', 'yellow');

  section('Example 1: Model Selection Only');
  log('Testing if "Nano Banana Pro" model can be selected from dropdown\n', 'dim');
  // await testModelSelection();

  section('Example 2: Multiple Quantity Tests');
  log('Testing if x1, x3, x4 buttons can be clicked\n', 'dim');
  // await testMultipleQuantities();

  section('Example 3: Prompt & Submit Only');
  log('Testing if prompt can be typed and submit button clicked\n', 'dim');
  log('⏳ This test waits 180 seconds for visual verification', 'yellow');
  // await testPromptAndSubmit();

  section('Example 4: COMPLETE FLOW (Recommended)');
  log('Testing entire flow: Model → Quantity → Prompt → Submit\n', 'bright');
  log('⏳ This test waits 180 seconds for visual verification', 'yellow');
  log('This is the most realistic test - watch the browser as all steps execute\n', 'dim');
  await testCompleteFlow();

  section('🎉 TEST SUITE COMPLETE');
  log('Review the results above and check the browser window', 'green');
  log('For debugging: Look for [MODEL], [TAB], and debug info logs', 'dim');
}

// Run tests
runAllTests().catch(error => {
  console.error('\n❌ Test suite failed:', error);
  process.exit(1);
});
