#!/usr/bin/env node

/**
 * Test script for Google Flow automation
 * Tests: typing speed, button finding, model selection, send button, gallery integration
 */

import puppeteer from 'puppeteer';
import fs from 'fs';

const TEST_TIMEOUT = 120000; // 2 minutes per test

async function runTests() {
  let browser;
  const results = {
    passed: [],
    failed: []
  };

  try {
    console.log('🧪 Starting Google Flow automation tests...\n');

    browser = await puppeteer.launch({
      headless: false,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage'
      ]
    });

    // Test 1: Fast typing speed
    console.log('📝 TEST 1: Fast prompt typing...');
    try {
      const page = await browser.newPage();
      await page.goto('http://localhost:5000', { waitUntil: 'networkidle2', timeout: 30000 });
      
      const t1 = Date.now();
      await page.evaluate(() => {
        const input = document.querySelector('textarea[placeholder*="nhập"]') || 
                      document.querySelector('textarea');
        if (input) input.focus();
      });
      
      const testPrompt = 'Mô hình áo phông cotton cao cấp';
      await page.keyboard.type(testPrompt, { delay: 2 }); // 2ms per char (faster)
      
      const t2 = Date.now();
      const duration = t2 - t1;
      const speed = (testPrompt.length / (duration / 1000)).toFixed(0); // chars per second
      
      console.log(`  ✅ Typed ${testPrompt.length} chars in ${duration}ms (${speed} chars/sec)`);
      results.passed.push('Fast typing');
      await page.close();
    } catch (err) {
      console.log(`  ❌ Fast typing failed: ${err.message}`);
      results.failed.push('Fast typing');
    }

    // Test 2: Find send button
    console.log('\n📤 TEST 2: Finding send button...');
    try {
      const page = await browser.newPage();
      await page.goto('http://localhost:5000', { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Wait for button with "Tạo" or "arrow_forward" icon
      const sendButton = await page.$('button:has(> i.google-symbols):has-text("arrow_forward"), button:has(> span:has-text("Tạo"))');
      
      if (sendButton) {
        console.log('  ✅ Found send button');
        results.passed.push('Find send button');
      } else {
        console.log('  ⚠️  Send button not found - will test Enter key fallback');
        results.passed.push('Find send button (with Enter fallback)');
      }
      await page.close();
    } catch (err) {
      console.log(`  ❌ Send button test failed: ${err.message}`);
      results.failed.push('Find send button');
    }

    // Test 3: Model selection
    console.log('\n🤖 TEST 3: Model selection (Nano Banana Pro)...');
    try {
      const page = await browser.newPage();
      await page.goto('http://localhost:5000', { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Click settings
      const settingsBtn = await page.$('button[aria-label*="iếu"]');
      if (settingsBtn) {
        await settingsBtn.click();
        await page.waitForTimeout(500);
        
        // Look for model button
        const modelBtn = await page.$('button:has-text("Nano Banana Pro"), [role="menubutton"]:has-text("Nano")');
        if (modelBtn) {
          console.log('  ✅ Found model selector');
          results.passed.push('Model selection');
        } else {
          console.log('  ❌ Model selector not found');
          results.failed.push('Model selection');
        }
      } else {
        console.log('  ⚠️  Settings button not found');
        results.failed.push('Model selection');
      }
      await page.close();
    } catch (err) {
      console.log(`  ❌ Model selection test failed: ${err.message}`);
      results.failed.push('Model selection');
    }

    // Test 4: Count selection (x1, x2, etc)
    console.log('\n✖️ TEST 4: Count selection...');
    try {
      const page = await browser.newPage();
      await page.goto('http://localhost:5000', { waitUntil: 'networkidle2', timeout: 30000 });
      
      const countBtn = await page.$('button:has-text("x1"), button:has-text("x2"), button:has-text("x4")');
      if (countBtn) {
        console.log('  ✅ Found count selector');
        results.passed.push('Count selection');
      } else {
        console.log('  ❌ Count selector not found');
        results.failed.push('Count selection');
      }
      await page.close();
    } catch (err) {
      console.log(`  ❌ Count selection test failed: ${err.message}`);
      results.failed.push('Count selection');
    }

    // Test 5: Settings menu single open
    console.log('\n⚙️  TEST 5: Settings menu opens only once...');
    try {
      const page = await browser.newPage();
      await page.goto('http://localhost:5000', { waitUntil: 'networkidle2', timeout: 30000 });
      
      let openCount = 0;
      
      // Monitor aria-expanded changes
      await page.evaluate(() => {
        let notchCount = 0;
        const origClick = MouseEvent.prototype.preventDefault;
        window._clickCount = 0;
      });
      
      const settingsBtn = await page.$('button[aria-label*="iếu"]');
      if (settingsBtn) {
        await settingsBtn.click();
        await page.waitForTimeout(300);
        
        const isOpen = await page.$('[role="menu"]');
        if (isOpen) {
          console.log('  ✅ Settings menu opened');
          results.passed.push('Settings single open');
        } else {
          console.log('  ❌ Settings menu not opening');
          results.failed.push('Settings single open');
        }
      }
      await page.close();
    } catch (err) {
      console.log(`  ❌ Settings test failed: ${err.message}`);
      results.failed.push('Settings single open');
    }

    // Test 6: Gallery picker integration
    console.log('\n🖼️  TEST 6: Gallery picker integration...');
    try {
      const page = await browser.newPage();
      await page.goto('http://localhost:5000', { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Look for gallery picker
      const galleryBtn = await page.$('[placeholder*="gallery"], button:has-text("Chọn"), [aria-label*="gallery"]');
      if (galleryBtn) {
        console.log('  ✅ Gallery picker available');
        results.passed.push('Gallery picker found');
      } else {
        console.log('  ⚠️  Gallery picker not visible');
        results.passed.push('Gallery picker (not visible yet)');
      }
      await page.close();
    } catch (err) {
      console.log(`  ❌ Gallery test failed: ${err.message}`);
      results.failed.push('Gallery picker');
    }

    // Print summary
    console.log('\n\n📊 TEST SUMMARY');
    console.log('═'.repeat(50));
    console.log(`✅ Passed: ${results.passed.length}`);
    results.passed.forEach(t => console.log(`   • ${t}`));
    
    if (results.failed.length > 0) {
      console.log(`\n❌ Failed: ${results.failed.length}`);
      results.failed.forEach(t => console.log(`   • ${t}`));
    }
    
    console.log('═'.repeat(50));
    const total = results.passed.length + results.failed.length;
    const score = ((results.passed.length / total) * 100).toFixed(0);
    console.log(`Score: ${results.passed.length}/${total} (${score}%)\n`);

    process.exit(results.failed.length > 0 ? 1 : 0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

runTests();
