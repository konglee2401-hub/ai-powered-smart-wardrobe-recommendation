/**
 * Quick Debug Test - Test Individual Components
 * 
 * Choose which test to run by uncommenting one line below
 * Run: node backend/test-quick-debug.js [test] [param]
 */

import GoogleFlowAutomationService from './services/googleFlowAutomationService.js';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

// ============================================================
// TEST 1: Model Selection Only
// ============================================================
async function testModel() {
  log('\n🤖 Testing: Model Selection\n', 'cyan');
  
  const service = new GoogleFlowAutomationService({
    type: 'image',
    projectId: '58d791d4-37c9-47a8-ae3b-816733bc3ec0',
    imageCount: 1,
    headless: false
  });

  try {
    log('Opening Google Gemini...', 'bright');
    await service.init();
    await service.navigateToFlow();
    await service.page.waitForTimeout(3000);
    
    log('\nOpening settings menu...', 'bright');
    await service.clickSettingsButton();
    await service.page.waitForTimeout(1500);

    log('\nAttempting to select: Nano Banana Pro\n');
    const result = await service.selectModel();
    
    if (result) {
      log('✅ SUCCESS: Model selected!', 'green');
    } else {
      log('⚠️  Model selection did not complete. Check logs above for details.', 'yellow');
    }

    log('\nWaiting 10 seconds for visual check...', 'yellow');
    await service.page.waitForTimeout(10000);
    
    await service.browser.close();
  } catch (error) {
    log(`❌ ERROR: ${error.message}`, 'red');
    if (service.browser) await service.browser.close();
    process.exit(1);
  }
}

// ============================================================
// TEST 2: Quantity Selection (x1, x2, x3, x4)
// ============================================================
async function testQuantity(qty = 'x1') {
  log(`\n📊 Testing: Quantity Selection (${qty})\n`, 'cyan');
  
  const service = new GoogleFlowAutomationService({
    type: 'image',
    projectId: '58d791d4-37c9-47a8-ae3b-816733bc3ec0',
    imageCount: 1,
    headless: false
  });

  try {
    log('Opening Google Gemini...', 'bright');
    await service.init();
    await service.navigateToFlow();
    await service.page.waitForTimeout(3000);
    
    log('\nOpening settings menu...', 'bright');
    await service.clickSettingsButton();
    await service.page.waitForTimeout(1500);

    log(`\nAttempting to select: ${qty}\n`);
    const result = await service.selectTab(qty);
    
    if (result) {
      log(`✅ SUCCESS: ${qty} selected!`, 'green');
    } else {
      log(`⚠️  ${qty} selection may have failed. Check logs above.`, 'yellow');
    }

    log('\nWaiting 10 seconds for visual check...', 'yellow');
    await service.page.waitForTimeout(10000);
    
    await service.browser.close();
  } catch (error) {
    log(`❌ ERROR: ${error.message}`, 'red');
    if (service.browser) await service.browser.close();
    process.exit(1);
  }
}

// ============================================================
// TEST 3: Prompt Input & Submit Click
// ============================================================
async function testPromptSubmit() {
  log('\n✍️  Testing: Prompt Input & Submit Button\n', 'cyan');
  
  const service = new GoogleFlowAutomationService({
    type: 'image',
    projectId: '58d791d4-37c9-47a8-ae3b-816733bc3ec0',
    imageCount: 1,
    headless: false
  });

  try {
    log('Opening Google Gemini...', 'bright');
    await service.init();
    await service.navigateToFlow();
    await service.page.waitForTimeout(3000);

    // Check if prompt textbox exists
    const promptBox = await service.page.$('[role="textbox"][data-slate-editor="true"]');
    
    if (!promptBox) {
      log('⚠️  Prompt textbox not found. You may need to log in or wait for page to load.', 'yellow');
      await service.browser.close();
      return;
    }

    const testPrompt = 'Beautiful woman in casual style, wearing a blue jacket, outdoor sunny day';
    log(`\nTyping prompt: "${testPrompt}"\n`);
    
    await service.enterPrompt(testPrompt);
    
    log('\nPrompt typed. Now looking for submit button...', 'bright');
    await service.page.waitForTimeout(1500);

    try {
      await service.clickCreate();
      log('\n✅ SUCCESS: Submit button clicked!', 'green');
      log('\n⏳ WAITING 120 SECONDS FOR VISUAL VERIFICATION...', 'yellow');
      log('📸 Watch the browser - generation should start now\n', 'yellow');
      await service.page.waitForTimeout(120000);
    } catch (e) {
      log(`\n⚠️  Submit button: ${e.message}`, 'yellow');
    }

    await service.browser.close();
  } catch (error) {
    log(`❌ ERROR: ${error.message}`, 'red');
    if (service.browser) await service.browser.close();
    process.exit(1);
  }
}

// ============================================================
// TEST 4: Complete Flow
// ============================================================
async function testCompleteFlow() {
  log('\n🎬 Testing: COMPLETE FLOW (Model → Qty → Prompt → Submit)\n', 'cyan');
  
  const service = new GoogleFlowAutomationService({
    type: 'image',
    projectId: '58d791d4-37c9-47a8-ae3b-816733bc3ec0',
    imageCount: 1,
    headless: false
  });

  try {
    log('Opening Google Gemini...', 'bright');
    await service.init();
    await service.navigateToFlow();
    await service.page.waitForTimeout(4000);

    // Open settings menu first (required for model and quantity selection)
    log('\n📍 OPENING SETTINGS MENU');
    log('─'.repeat(50));
    const settingsOpened = await service.clickSettingsButton();
    log(settingsOpened ? '  ✅ Settings opened' : '  ⚠️  Could not open settings');
    
    // Wait longer for the settings dialog to fully populate
    // The model/quantity buttons are inside the dialog, not at the settings button level
    await service.page.waitForTimeout(3000);
    
    // Verify model button is now visible (should not be at settings coordinates)
    const modelBtnCheck = await service.page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      let modelBtn = null;
      let settingsBtn = null;
      
      for (const btn of buttons) {
        const text = btn.textContent;
        if (text && text.includes('Nano Banana')) {
          const box = btn.getBoundingClientRect();
          if (box.width > 0 && box.height > 0) {
            modelBtn = { text: text.substring(0, 50), x: Math.round(box.x), y: Math.round(box.y) };
          }
        }
        if (btn.getAttribute('aria-haspopup') === 'menu') {
          const box = btn.getBoundingClientRect();
          settingsBtn = { x: Math.round(box.x), y: Math.round(box.y) };
        }
      }
      
      return { modelBtn, settingsBtn };
    });
    
    console.log('[DEBUG] modelBtnCheck:', JSON.stringify(modelBtnCheck));
    
    if (modelBtnCheck.modelBtn && modelBtnCheck.settingsBtn) {
      if (modelBtnCheck.modelBtn.x === modelBtnCheck.settingsBtn.x && 
          modelBtnCheck.modelBtn.y === modelBtnCheck.settingsBtn.y) {
        log('  ⚠️  Model button at same location as settings button - dialog may not be loaded', 'yellow');
      } else {
        log(`  ✓ Model button found at different location: (${modelBtnCheck.modelBtn.x}, ${modelBtnCheck.modelBtn.y})`, 'green');
      }
    } else {
      log(`  ℹ️  modelBtn: ${modelBtnCheck.modelBtn ? 'found' : 'not found'}, settingsBtn: ${modelBtnCheck.settingsBtn ? 'found' : 'not found'}`, 'cyan');
    }

    // Step 1: Model
    log('\n📍 STEP 1: Selecting Model (Nano Banana Pro)');
    log('─'.repeat(50));
    let result = await service.selectModel();
    log(result ? '  ✅ Model selected' : '  ⚠️  Model may not be available');

    await service.page.waitForTimeout(1000);

    // Step 2: Quantity
    log('\n📍 STEP 2: Selecting Quantity (x2)');
    log('─'.repeat(50));
    result = await service.selectTab('x2');
    log(result ? '  ✅ Quantity selected' : '  ⚠️  Quantity option not visible');

    await service.page.waitForTimeout(1000);

    // Step 3: Check prompt box
    const promptBox = await service.page.$('[role="textbox"][data-slate-editor="true"]');
    
    if (!promptBox) {
      log('\n📍 STEP 3: Prompt Box Check');
      log('─'.repeat(50));
      log('  ⚠️  Prompt box not available (may need login)', 'yellow');
    } else {
      // Step 3: Prompt
      log('\n📍 STEP 3: Typing Prompt');
      log('─'.repeat(50));
      const prompt = 'Professional fashion photography: woman in elegant summer dress, studio lighting, white background';
      await service.enterPrompt(prompt);
      log('  ✅ Prompt typed');

      // Step 4: Submit
      log('\n📍 STEP 4: Clicking Submit Button');
      log('─'.repeat(50));
      await service.page.waitForTimeout(1000);
      try {
        await service.clickCreate();
        log('  ✅ Submit button clicked');
      } catch (e) {
        log(`  ⚠️  Submit: ${e.message}`);
      }
    }

    log('\n' + '='.repeat(50));
    log('⏳ WAITING 120 SECONDS FOR VISUAL VERIFICATION', 'yellow');
    log('='.repeat(50));
    log('Watch the browser to see if generation started\n', 'yellow');
    
    await service.page.waitForTimeout(120000);
    await service.browser.close();
  } catch (error) {
    log(`❌ ERROR: ${error.message}`, 'red');
    if (service.browser) await service.browser.close();
    process.exit(1);
  }
}

// ============================================================
// MAIN: Choose which test to run
// ============================================================
const testChoice = process.argv[2] || 'complete';

log('\n' + '='.repeat(60));
log('BROWSER AUTOMATION - QUICK DEBUG TEST', 'bright');
log('='.repeat(60));

switch(testChoice.toLowerCase()) {
  case 'model':
    testModel().catch(console.error);
    break;
  
  case 'qty':
  case 'quantity':
    const qty = process.argv[3] || 'x1';
    testQuantity(qty).catch(console.error);
    break;
  
  case 'prompt':
  case 'submit':
    testPromptSubmit().catch(console.error);
    break;
  
  case 'complete':
  case 'all':
  default:
    testCompleteFlow().catch(console.error);
    break;
}

log('\nUsage:');
log('  node backend/test-quick-debug.js [test] [param]');
log('\nTests:');
log('  model              - Test model selection');
log('  qty [x1|x2|x3|x4] - Test quantity selection (default: x1)');
log('  prompt             - Test prompt input & submit');
log('  complete (default) - Test everything together\n');
