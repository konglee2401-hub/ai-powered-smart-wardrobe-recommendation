const puppeteer = require('puppeteer');
const fs = require('fs');

async function testSettingsButtons() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();
  page.setViewport({ width: 1920, height: 1080 });

  const results = [];
  const log = (msg) => {
    console.log(msg);
    results.push(msg);
  };

  try {
    log('🚀 Test Settings Buttons - Starting...\n');

    // Navigate to Google Flow
    log('📍 Navigating to Google Flow...');
    await page.goto('https://lab.google.com/flows', { waitUntil: 'networkidle2', timeout: 30000 });
    log('✓ Page loaded');

    // Wait for page to settle
    await page.waitForTimeout(3000);

    // Look for settings button
    log('\n🔍 Looking for settings button...');
    const settingsBtn = await page.$('[aria-haspopup="menu"]');
    if (!settingsBtn) {
      log('❌ Settings button not found');
      // Try alternative selectors
      const allButtons = await page.$$('button');
      log(`   Found ${allButtons.length} buttons total`);
      
      for (let i = 0; i < allButtons.length; i++) {
        const text = await page.evaluate((btn) => btn.textContent, allButtons[i]);
        const ariaLabel = await page.evaluate((btn) => btn.getAttribute('aria-label'), allButtons[i]);
        log(`   Button ${i}: text="${text.trim().substring(0, 30)}" aria-label="${ariaLabel}"`);
      }
    } else {
      log('✓ Settings button found');

      // Click settings button
      log('\n👆 Clicking settings button...');
      await settingsBtn.click();
      await page.waitForTimeout(500);
      log('✓ Clicked');

      // Get all buttons in the settings menu
      log('\n📊 Scanning settings menu buttons...');

      // Check IMAGE/VIDEO tabs
      log('\n--- TYPE TABS (Image/Video) ---');
      const typeButtons = await page.$$('button[role="tab"]');
      log(`Found ${typeButtons.length} tab buttons`);

      for (let i = 0; i < typeButtons.length; i++) {
        const btn = typeButtons[i];
        const text = await page.evaluate((el) => el.textContent.trim(), btn);
        const isSelected = await page.evaluate((el) => el.getAttribute('aria-selected'), btn);
        const isVisible = await page.evaluate((el) => {
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && rect.top >= 0;
        }, btn);
        const rect = await page.evaluate((el) => {
          const r = el.getBoundingClientRect();
          return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
        }, btn);

        log(`\n  Tab ${i}: "${text}"`);
        log(`    Selected: ${isSelected}`);
        log(`    Visible: ${isVisible}`);
        log(`    Position: (${rect.x}, ${rect.y}) | Size: ${rect.w}x${rect.h}`);
        log(`    Clickable: ${isVisible && rect.w > 0 && rect.h > 0}`);

        // Try clicking each tab
        if (isVisible) {
          try {
            log(`    🖱️  Attempting click...`);
            await page.evaluate((el) => {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, btn);
            await page.waitForTimeout(200);
            
            // Use realistic mouse movement
            await page.mouse.move(rect.x + rect.w / 2, rect.y + rect.h / 2);
            await page.waitForTimeout(100);
            await page.mouse.click(rect.x + rect.w / 2, rect.y + rect.h / 2);
            await page.waitForTimeout(300);

            const newSelected = await page.evaluate((el) => el.getAttribute('aria-selected'), btn);
            log(`    ✓ Click executed. New state: aria-selected="${newSelected}"`);
          } catch (e) {
            log(`    ❌ Click error: ${e.message}`);
          }
        }
      }

      // Check model dropdown
      log('\n--- MODEL DROPDOWN ---');
      const modelDropdown = await page.$('button[aria-haspopup="menu"][id*="r"]');
      if (modelDropdown) {
        const modelText = await page.evaluate((el) => el.textContent, modelDropdown);
        const isVisible = await page.evaluate((el) => {
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        }, modelDropdown);
        log(`  Model button: "${modelText.trim()}"`);
        log(`  Visible: ${isVisible}`);

        if (isVisible) {
          try {
            log(`  🖱️  Attempting to click model dropdown...`);
            const rect = await page.evaluate((el) => {
              const r = el.getBoundingClientRect();
              return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
            }, modelDropdown);
            
            await page.mouse.move(rect.x + rect.w / 2, rect.y + rect.h / 2);
            await page.waitForTimeout(100);
            await page.mouse.click(rect.x + rect.w / 2, rect.y + rect.h / 2);
            await page.waitForTimeout(500);

            const expanded = await page.evaluate((el) => el.getAttribute('aria-expanded'), modelDropdown);
            log(`  ✓ Clicked. New expanded state: "${expanded}"`);
          } catch (e) {
            log(`  ❌ Click error: ${e.message}`);
          }
        }
      }

      // Detailed button hierarchies
      log('\n--- ALL INTERACTIVE ELEMENTS IN SETTINGS MENU ---');
      const allElements = await page.$$('button, [role="tab"], input, select');
      log(`Total interactive elements: ${allElements.length}`);

      for (let i = 0; i < allElements.length; i++) {
        const el = allElements[i];
        const info = await page.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          return {
            tag: element.tagName,
            role: element.getAttribute('role'),
            text: element.textContent.trim().substring(0, 50),
            ariaLabel: element.getAttribute('aria-label'),
            ariaSelected: element.getAttribute('aria-selected'),
            disabled: element.hasAttribute('disabled'),
            visible: rect.width > 0 && rect.height > 0 && rect.top >= 0,
            x: Math.round(rect.left),
            y: Math.round(rect.top),
            w: Math.round(rect.width),
            h: Math.round(rect.height)
          };
        }, el);

        if (info.visible) {
          log(`\nElement ${i}:`);
          log(`  Tag: ${info.tag}, Role: ${info.role}`);
          log(`  Text: "${info.text}"`);
          log(`  Aria-label: ${info.ariaLabel}`);
          log(`  Position: (${info.x}, ${info.y}), Size: ${info.w}x${info.h}`);
          log(`  Disabled: ${info.disabled}`);
        }
      }
    }

    log('\n✅ Test completed');

  } catch (error) {
    log(`\n❌ Error: ${error.message}`);
    log(error.stack);
  } finally {
    // Save results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `test-results/settings-buttons-test-${timestamp}.txt`;
    
    // Create directory if needed
    if (!fs.existsSync('test-results')) {
      fs.mkdirSync('test-results', { recursive: true });
    }
    
    fs.writeFileSync(filename, results.join('\n'));
    log(`\n📁 Results saved to: ${filename}`);

    await browser.close();
  }
}

testSettingsButtons().catch(console.error);
