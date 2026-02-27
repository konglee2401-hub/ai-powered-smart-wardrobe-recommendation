/**
 * Test script v2: Open settings ONCE, test ALL buttons inside
 * Usage: npm run test-debug-settings (from backend folder with internet)
 * 
 * Mở settings menu 1 lần, test tất cả buttons bên trong
 * - IMAGE/VIDEO tabs
 * - LANDSCAPE/PORTRAIT tabs
 * - x1/x2/x3/x4 tabs
 * - Model dropdown button
 * - Model menu items
 */

import GoogleFlowAutomationService from './services/googleFlowAutomationService.js';

async function testAllInteractive() {
  console.log('🚀 Starting Comprehensive Settings Test (v2)\n');

  const service = new GoogleFlowAutomationService({
    headless: false,
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

    // Step 4: Open settings menu ONCE
    console.log('📍 Step 4: Opening settings menu...');
    await service.clickSettingsButton();
    await service.page.waitForTimeout(1000);
    console.log('✓ Settings menu opened\n');

    // Step 5: Test all TAB buttons inside settings menu
    console.log('📍 Step 5: Testing ALL tab buttons inside settings menu\n');
    console.log('═'.repeat(60));
    
    // 5a: IMAGE/VIDEO tabs
    console.log('\n5a. Testing IMAGE/VIDEO tabs:');
    await testTabInSettings(service, 'IMAGE', 'IMAGE tab', ['click', 'mouse']);
    await service.page.waitForTimeout(400);
    await testTabInSettings(service, 'VIDEO', 'VIDEO tab', ['click', 'mouse']);
    await service.page.waitForTimeout(400);

    // 5b: LANDSCAPE/PORTRAIT tabs
    console.log('\n5b. Testing LANDSCAPE/PORTRAIT tabs:');
    await testTabInSettings(service, 'Ngang', 'LANDSCAPE (Ngang)', ['mouse']);
    await service.page.waitForTimeout(400);
    await testTabInSettings(service, 'Dọc', 'PORTRAIT (Dọc)', ['mouse']);
    await service.page.waitForTimeout(400);

    // 5c: Count tabs (x1, x2, x3, x4)
    console.log('\n5c. Testing COUNT tabs (x1/x2/x3/x4):');
    for (const count of ['x1', 'x2', 'x3', 'x4']) {
      await testTabInSettings(service, count, `${count} count`, ['click', 'mouse']);
      await service.page.waitForTimeout(400);
    }

    // Step 6: Test MODEL dropdown button
    console.log('\n\n📍 Step 6: Testing MODEL dropdown button\n');
    console.log('═'.repeat(60));
    
    await testModelDropdown(service);
    await service.page.waitForTimeout(800);

    // Step 7: Test model menu items (Nano Banana Pro, Nano Banana 2, Imagen 4)
    console.log('\n\n📍 Step 7: Testing MODEL menu items\n');
    console.log('═'.repeat(60));
    
    const models = ['Nano Banana Pro', 'Nano Banana 2', 'Imagen 4'];
    for (const model of models) {
      console.log(`\nTesting model: "${model}"`);
      
      // Open dropdown if closed
      const isOpen = await service.page.evaluate(() => {
        const btn = document.querySelector('button[aria-haspopup="menu"][id^="radix-"]');
        return btn?.getAttribute('aria-expanded') === 'true';
      });

      if (!isOpen) {
        console.log('   Reopening model dropdown...');
        await testModelDropdown(service);
        await service.page.waitForTimeout(800);
      }

      // Test clicking model item
      await testModelMenuItem(service, model);
      await service.page.waitForTimeout(600);
    }

    // Step 8: Test SUBMIT button (outside settings)
    console.log('\n\n📍 Step 8: Testing SUBMIT BUTTON\n');
    console.log('═'.repeat(60));
    console.log('\n(No prompt entered - should show "Prompt must be provided" error)\n');
    
    await testSubmitButton(service);

    console.log('\n   ⏳ Waiting 2 seconds to see error toast...\n');
    await service.page.waitForTimeout(2000);

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
    console.log('✅ ALL TESTS COMPLETED!');
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
 * Test a tab button inside settings menu
 */
async function testTabInSettings(service, searchText, displayName, methods = ['click', 'mouse']) {
  console.log(`\n   Testing: "${displayName}" (search: "${searchText}")`);
  
  for (const method of methods) {
    try {
      const btnInfo = await service.page.evaluate((text) => {
        // Query all tab buttons
        const tabs = document.querySelectorAll('button[role="tab"]');
        
        for (const tab of tabs) {
          if (tab.textContent.includes(text)) {
            const rect = tab.getBoundingClientRect();
            return {
              found: true,
              text: tab.textContent.trim(),
              x: Math.round(rect.left + rect.width / 2),
              y: Math.round(rect.top + rect.height / 2),
              visible: rect.width > 0 && rect.height > 0
            };
          }
        }
        return { found: false };
      }, searchText);

      if (!btnInfo.found) {
        console.log(`     ❌ ${method.toUpperCase()}: Tab not found`);
        continue;
      }

      console.log(`     ${method.toUpperCase()}: "${btnInfo.text}"`);

      if (method === 'click') {
        await service.page.evaluate((text) => {
          const tabs = document.querySelectorAll('button[role="tab"]');
          for (const tab of tabs) {
            if (tab.textContent.includes(text)) {
              tab.click();
              return;
            }
          }
        }, searchText);
      } 
      else if (method === 'mouse') {
        await service.page.mouse.move(btnInfo.x, btnInfo.y);
        await service.page.waitForTimeout(100);
        await service.page.mouse.down();
        await service.page.waitForTimeout(50);
        await service.page.mouse.up();
      }

      console.log(`            ✓ Executed`);
      await service.page.waitForTimeout(200);

    } catch (error) {
      console.log(`     ❌ ${method.toUpperCase()}: ${error.message}`);
    }
  }
}

/**
 * Test model dropdown button
 */
async function testModelDropdown(service) {
  console.log('\n   Testing: Model dropdown button\n');
  
  const methods = ['click', 'mouse', 'mouseDownUp'];
  
  for (const method of methods) {
    try {
      // Find model dropdown button by aria-haspopup inside settings
      const btnInfo = await service.page.evaluate(() => {
        // Find button with aria-haspopup="menu" (the model dropdown)
        const btn = document.querySelector('button[aria-haspopup="menu"][id^="radix-"]');
        
        if (!btn) return { found: false };
        
        const rect = btn.getBoundingClientRect();
        return {
          found: true,
          text: btn.textContent.trim().split('\n')[0],
          x: Math.round(rect.left + rect.width / 2),
          y: Math.round(rect.top + rect.height / 2),
          id: btn.id,
          visible: rect.width > 0 && rect.height > 0
        };
      });

      if (!btnInfo.found) {
        console.log(`     ❌ ${method.toUpperCase()}: Model button not found`);
        continue;
      }

      console.log(`     ${method.toUpperCase()}: "${btnInfo.text}" (ID: ${btnInfo.id})`);

      if (method === 'click') {
        await service.page.evaluate(() => {
          const btn = document.querySelector('button[aria-haspopup="menu"][id^="radix-"]');
          btn?.click();
        });
      } 
      else if (method === 'mouse') {
        await service.page.mouse.move(btnInfo.x, btnInfo.y);
        await service.page.waitForTimeout(100);
        await service.page.mouse.down();
        await service.page.waitForTimeout(50);
        await service.page.mouse.up();
      } 
      else if (method === 'mouseDownUp') {
        await service.page.evaluate(() => {
          const btn = document.querySelector('button[aria-haspopup="menu"][id^="radix-"]');
          if (btn) {
            const downEvent = new MouseEvent('mousedown', { bubbles: true });
            const upEvent = new MouseEvent('mouseup', { bubbles: true });
            btn.dispatchEvent(downEvent);
            btn.dispatchEvent(upEvent);
          }
        });
      }

      console.log(`            ✓ Executed`);
      await service.page.waitForTimeout(300);

    } catch (error) {
      console.log(`     ❌ ${method.toUpperCase()}: ${error.message}`);
    }
  }
}

/**
 * Test clicking a model menu item
 */
async function testModelMenuItem(service, modelName) {
  console.log(`   Testing click: "${modelName}"`);
  
  const methods = ['click', 'mouse', 'mouseDownUp'];
  
  for (const method of methods) {
    try {
      const btnInfo = await service.page.evaluate((name) => {
        // Find all menu containers with role="menu"
        const menus = document.querySelectorAll('[role="menu"]');
        
        for (const menu of menus) {
          // Find button inside this menu
          const buttons = menu.querySelectorAll('button');
          for (const btn of buttons) {
            if (btn.textContent.includes(name)) {
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

      console.log(`            ✓ ${method.toUpperCase()}`);
      await service.page.waitForTimeout(300);

    } catch (error) {
      console.log(`     ❌ ${method.toUpperCase()}: ${error.message}`);
    }
  }
}

/**
 * Test submit button
 */
async function testSubmitButton(service) {
  console.log('\n   Testing: Submit button\n');
  
  const methods = ['click', 'mouse', 'mouseDownUp'];
  
  for (const method of methods) {
    try {
      const btnInfo = await service.page.evaluate(() => {
        const btn = document.querySelector('.aQhhA button:nth-of-type(2)');
        if (!btn) return { found: false };
        
        const rect = btn.getBoundingClientRect();
        return {
          found: true,
          text: btn.textContent.trim(),
          x: Math.round(rect.left + rect.width / 2),
          y: Math.round(rect.top + rect.height / 2),
          visible: rect.width > 0 && rect.height > 0
        };
      });

      if (!btnInfo.found) {
        console.log(`     ❌ ${method.toUpperCase()}: Submit button not found`);
        continue;
      }

      console.log(`     ${method.toUpperCase()}: "${btnInfo.text}"`);

      if (method === 'click') {
        await service.page.evaluate(() => {
          document.querySelector('.aQhhA button:nth-of-type(2)')?.click();
        });
      } 
      else if (method === 'mouse') {
        await service.page.mouse.move(btnInfo.x, btnInfo.y);
        await service.page.waitForTimeout(100);
        await service.page.mouse.down();
        await service.page.waitForTimeout(50);
        await service.page.mouse.up();
      } 
      else if (method === 'mouseDownUp') {
        await service.page.evaluate(() => {
          const btn = document.querySelector('.aQhhA button:nth-of-type(2)');
          if (btn) {
            const downEvent = new MouseEvent('mousedown', { bubbles: true });
            const upEvent = new MouseEvent('mouseup', { bubbles: true });
            btn.dispatchEvent(downEvent);
            btn.dispatchEvent(upEvent);
          }
        });
      }

      console.log(`            ✓ Executed`);
      await service.page.waitForTimeout(300);

    } catch (error) {
      console.log(`     ❌ ${method.toUpperCase()}: ${error.message}`);
    }
  }
}

testAllInteractive();
