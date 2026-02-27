/**
 * Test script to interactively test all button clicks with multiple methods
 * Usage: npm run test-debug-settings (from backend folder with internet)
 * 
 * Tests:
 * 1. Settings tabs with 3 methods: click(), mouse movement, mouse down/up
 * 2. Model dropdown button
 * 3. Model menu items selection
 * 4. Submit button (without prompt to trigger error toast)
 */

import GoogleFlowAutomationService from './services/googleFlowAutomationService.js';

async function testAllInteractive() {
  console.log('🚀 Starting Comprehensive Button Test\n');

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
      console.log('⚠️  Page load warning (may be offline)');
      await service.page.waitForTimeout(5000);
    }

    // Step 3: Wait for page to settle
    console.log('📍 Step 3: Waiting for page to settle...');
    await service.page.waitForTimeout(3000);
    console.log('✓ Page ready\n');

    // Step 4: Click settings button
    console.log('📍 Step 4: Opening settings menu...');
    await service.clickSettingsButton();
    await service.page.waitForTimeout(1000);
    console.log('✓ Settings menu opened\n');

    // Step 5: Test IMAGE tab with 3 methods
    console.log('📍 Step 5: Testing IMAGE tab with 3 methods\n');
    
    await testButtonClick(service, {
      selector: 'button[id*="IMAGE"][role="tab"]',
      name: 'IMAGE tab',
      methods: ['click', 'mouse', 'mouseDownUp']
    });

    // Step 5b: Test all IMAGE tab options
    console.log('\n📍 Step 5b: Testing all IMAGE tab options\n');
    
    // Test PORTRAIT
    await testButtonClick(service, {
      selector: 'button[id*="PORTRAIT"][role="tab"]',
      name: 'PORTRAIT (Dọc)',
      methods: ['mouse']
    });
    
    // Test LANDSCAPE
    await testButtonClick(service, {
      selector: 'button[id*="LANDSCAPE"][role="tab"]',
      name: 'LANDSCAPE (Ngang)',
      methods: ['mouse']
    });

    // Test counts x1, x2, x3, x4
    for (const count of ['x1', 'x2', 'x3', 'x4']) {
      await testButtonClick(service, {
        text: count,
        name: `${count} count`,
        methods: ['mouse']
      });
      await service.page.waitForTimeout(300);
    }

    console.log('\n✓ IMAGE tab options tested\n');

    // Step 6: Test VIDEO tab with 3 methods
    console.log('📍 Step 6: Testing VIDEO tab with 3 methods\n');
    
    await testButtonClick(service, {
      selector: 'button[id*="VIDEO"][role="tab"]',
      name: 'VIDEO tab',
      methods: ['click', 'mouse', 'mouseDownUp']
    });

    // Step 6b: Test all VIDEO tab options
    console.log('\n📍 Step 6b: Testing all VIDEO tab options\n');
    
    // Test PORTRAIT
    await testButtonClick(service, {
      selector: 'button[id*="PORTRAIT"][role="tab"]',
      name: 'PORTRAIT (Dọc)',
      methods: ['mouse']
    });
    
    // Test LANDSCAPE
    await testButtonClick(service, {
      selector: 'button[id*="LANDSCAPE"][role="tab"]',
      name: 'LANDSCAPE (Ngang)',
      methods: ['mouse']
    });

    // Test counts x1, x2, x3, x4
    for (const count of ['x1', 'x2', 'x3', 'x4']) {
      await testButtonClick(service, {
        text: count,
        name: `${count} count`,
        methods: ['mouse']
      });
      await service.page.waitForTimeout(300);
    }

    console.log('\n✓ VIDEO tab options tested\n');

    // Step 7: Test model dropdown button
    console.log('📍 Step 7: Testing MODEL DROPDOWN button\n');
    
    await testButtonClick(service, {
      selector: 'button[id^="radix-"][aria-haspopup="menu"]',
      name: 'Model dropdown (radix-:rhd:)',
      methods: ['click', 'mouse', 'mouseDownUp']
    });

    await service.page.waitForTimeout(1500);

    // Step 8: Test model menu items
    console.log('📍 Step 8: Testing MODEL MENU ITEMS\n');
    
    const models = ['Nano Banana Pro', 'Nano Banana 2', 'Imagen 4'];
    for (const model of models) {
      console.log(`\n   Testing model: "${model}"`);
      console.log('   ═'.repeat(40));
      
      // First, check if dropdown is open
      const isOpen = await service.page.evaluate(() => {
        const dropdown = document.querySelector('button[id^="radix-"][aria-haspopup="menu"]');
        return dropdown?.getAttribute('aria-expanded') === 'true';
      });

      if (!isOpen) {
        console.log('   Opening dropdown first...');
        await testButtonClick(service, {
          selector: 'button[id^="radix-"][aria-haspopup="menu"]',
          name: 'Reopen dropdown',
          methods: ['mouse']
        });
        await service.page.waitForTimeout(800);
      }

      // Find model menu using the unique menu ID pattern [role="menu"]
      const found = await service.page.evaluate((modelName) => {
        // Find all menu containers
        const menus = document.querySelectorAll('[role="menu"]');
        
        for (const menu of menus) {
          // Look for buttons inside this menu that match the model name
          const buttons = menu.querySelectorAll('button');
          for (const btn of buttons) {
            if (btn.textContent.includes(modelName)) {
              const rect = btn.getBoundingClientRect();
              return {
                found: true,
                text: btn.textContent.trim(),
                x: Math.round(rect.left + rect.width / 2),
                y: Math.round(rect.top + rect.height / 2),
                visible: rect.width > 0 && rect.height > 0
              };
            }
          }
        }
        return { found: false };
      }, model);

      if (found.found) {
        console.log(`   ✓ Found menu item: "${found.text}"`);
        console.log(`   Position: (${found.x}, ${found.y})`);
        console.log(`   Visible: ${found.visible}`);
        
        // Test clicking model menu item with 3 methods
        await testModelMenuItem(service, model);
      } else {
        console.log(`   ❌ Menu item not found - menu may be closed`);
      }
      
      await service.page.waitForTimeout(800);
    }

    // Step 9: Test submit button
    console.log('\n\n📍 Step 9: Testing SUBMIT BUTTON\n');
    console.log('   (No prompt entered - should show "Prompt must be provided" error)\n');
    
    await testButtonClick(service, {
      selector: '.aQhhA button:nth-of-type(2)',
      name: 'Submit button (2nd in .aQhhA)',
      methods: ['click', 'mouse', 'mouseDownUp']
    });

    console.log('\n   ⏳ Waiting 2 seconds to see error toast...\n');
    await service.page.waitForTimeout(2000);

    // Check if error toast appeared
    const hasErrorToast = await service.page.evaluate(() => {
      const toast = document.querySelector('[data-sonner-toast]');
      return !!toast;
    });

    if (hasErrorToast) {
      console.log('   ✅ ERROR TOAST APPEARED - Submit button worked!\n');
    } else {
      console.log('   ⚠️  No error toast visible\n');
    }

    console.log('\n' + '═'.repeat(60));
    console.log('✅ All tests completed!');
    console.log('═'.repeat(60));
    console.log('\nBrowser will stay open for 10 more seconds...\n');

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

/**
 * Test a button with 3 different click methods
 */
async function testButtonClick(service, options) {
  const { selector, name, methods = ['click', 'mouse', 'mouseDownUp'] } = options;

  for (const method of methods) {
    console.log(`\n   Method: ${method.toUpperCase()}`);
    console.log('   Selector: ' + selector);

    try {
      // Verify selector exists
      const exists = await service.page.$(selector);
      if (!exists) {
        console.log('   ❌ SELECTOR NOT FOUND');
        continue;
      }
      console.log('   ✓ Selector found');

      // Get button info
      const btnInfo = await service.page.evaluate((sel) => {
        const btn = document.querySelector(sel);
        if (!btn) return null;
        const rect = btn.getBoundingClientRect();
        return {
          text: btn.textContent.trim().substring(0, 40),
          x: Math.round(rect.left + rect.width / 2),
          y: Math.round(rect.top + rect.height / 2),
          visible: rect.width > 0 && rect.height > 0
        };
      }, selector);

      if (!btnInfo) {
        console.log('   ❌ Could not get button info');
        continue;
      }

      console.log(`   Button: "${btnInfo.text}"`);
      console.log(`   Position: (${btnInfo.x}, ${btnInfo.y})`);
      console.log(`   Visible: ${btnInfo.visible}`);

      // Try the click method
      if (method === 'click') {
        console.log('   Executing: btn.click()');
        await service.page.evaluate((sel) => {
          document.querySelector(sel)?.click();
        }, selector);
      } 
      else if (method === 'mouse') {
        console.log('   Executing: mouse.move() + mouse.down() + mouse.up()');
        await service.page.mouse.move(btnInfo.x, btnInfo.y);
        await service.page.waitForTimeout(100);
        await service.page.mouse.down();
        await service.page.waitForTimeout(50);
        await service.page.mouse.up();
      } 
      else if (method === 'mouseDownUp') {
        console.log('   Executing: dispatchEvent(mousedown) + dispatchEvent(mouseup)');
        await service.page.evaluate((sel) => {
          const btn = document.querySelector(sel);
          if (btn) {
            const downEvent = new MouseEvent('mousedown', { bubbles: true });
            const upEvent = new MouseEvent('mouseup', { bubbles: true });
            btn.dispatchEvent(downEvent);
            btn.dispatchEvent(upEvent);
          }
        }, selector);
      }

      console.log('   ✓ Click executed');
      await service.page.waitForTimeout(300);

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
}

/**
 * Test clicking a model menu item
 */
async function testModelMenuItem(service, modelName) {
  console.log(`\n   Testing menu item click: "${modelName}"`);
  
  const methods = ['click', 'mouse', 'mouseDownUp'];
  
  for (const method of methods) {
    try {
      const btnInfo = await service.page.evaluate((name) => {
        // Find all menu containers
        const menus = document.querySelectorAll('[role="menu"]');
        
        for (const menu of menus) {
          const buttons = menu.querySelectorAll('button');
          for (const btn of buttons) {
            if (btn.textContent.includes(name)) {
              const rect = btn.getBoundingClientRect();
              return {
                found: true,
                x: Math.round(rect.left + rect.width / 2),
                y: Math.round(rect.top + rect.height / 2),
                text: btn.textContent.trim()
              };
            }
          }
        }
        return { found: false };
      }, modelName);

      if (!btnInfo.found) {
        console.log(`     ❌ ${method.toUpperCase()}: Menu item not found`);
        continue;
      }

      if (method === 'click') {
        await service.page.evaluate((name) => {
          const menus = document.querySelectorAll('[role="menu"]');
          for (const menu of menus) {
            const buttons = menu.querySelectorAll('button');
            for (const btn of buttons) {
              if (btn.textContent.includes(name)) {
                btn.click();
                return;
              }
            }
          }
        }, modelName);
      } 
      else if (method === 'mouse') {
        await service.page.mouse.move(btnInfo.x, btnInfo.y);
        await service.page.waitForTimeout(100);
        await service.page.mouse.down();
        await service.page.waitForTimeout(50);
        await service.page.mouse.up();
      } 
      else if (method === 'mouseDownUp') {
        await service.page.evaluate((name) => {
          const menus = document.querySelectorAll('[role="menu"]');
          for (const menu of menus) {
            const buttons = menu.querySelectorAll('button');
            for (const btn of buttons) {
              if (btn.textContent.includes(name)) {
                const downEvent = new MouseEvent('mousedown', { bubbles: true });
                const upEvent = new MouseEvent('mouseup', { bubbles: true });
                btn.dispatchEvent(downEvent);
                btn.dispatchEvent(upEvent);
                return;
              }
            }
          }
        }, modelName);
      }

      console.log(`     ✓ ${method.toUpperCase()}: Executed`);
      await service.page.waitForTimeout(300);

    } catch (error) {
      console.log(`     ❌ ${method.toUpperCase()}: ${error.message}`);
    }
  }
}

testAllInteractive();


