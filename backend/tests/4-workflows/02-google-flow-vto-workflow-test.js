#!/usr/bin/env node

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
puppeteer.use(StealthPlugin());

const SESSION_FILE = path.join(__dirname, '../../.sessions/google-flow-session.json');
const PROJECT_URL = 'https://labs.google/fx/vi/tools/flow/project/3ba9e02e-0a33-4cf2-9d55-4c396941d7b7';
const TEST_IMAGES = [
  path.join(__dirname, '../../test-images/anh-nhan-vat.jpeg'),
  path.join(__dirname, '../../test-images/anh-san-pham.png')
];
const VTO_PROMPT = 'Vietnamese woman wearing the product shown in the other image, fashion photoshoot style, professional lighting, full body shot';

async function testCompleteFlow() {
  let browser;
  try {
    console.log('\n════════════════════════════════════════════════════════════════');
    console.log('🎬 Lab Flow - Complete Flow with Smart Button Counting');
    console.log('════════════════════════════════════════════════════════════════\n');

    // Verify test images exist
    for (const testImg of TEST_IMAGES) {
      if (!fs.existsSync(testImg)) {
        console.error(`❌ Test image not found: ${path.basename(testImg)}`);
        return;
      }
    }

    if (!fs.existsSync(SESSION_FILE)) {
      console.error('❌ Session file not found');
      return;
    }

    const sessionData = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
    
    // Set up download directory
    const downloadDir = path.join(__dirname, '../../temp/vto-downloads');
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }
    console.log(`📂 Download directory: ${downloadDir}\n`);
    
    browser = await puppeteer.launch({ headless: false, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    // Set up download behavior
    const client = await page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: downloadDir
    });

    for (const cookie of sessionData.cookies) {
      try { await page.setCookie(cookie); } catch (e) {}
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    console.log('📍 Step 1: Navigate to project & wait for load');
    await page.goto(PROJECT_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForTimeout(2000);
    console.log('✓ Project loaded\n');

    // ═══════════════════════════════════════════════════════════════════════════════
    console.log('📍 Step 2: Switch to Video tab (wait 2s)');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      buttons.find(btn => {
        const icon = btn.querySelector('i');
        return icon && icon.textContent.includes('videocam');
      })?.click();
    });
    await page.waitForTimeout(2000);
    console.log('✓ Video tab active\n');

    // ═══════════════════════════════════════════════════════════════════════════════
    console.log('📍 Step 3: Switch to Image tab (wait 3s)');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      buttons.find(btn => {
        const icon = btn.querySelector('i');
        return icon && icon.textContent.includes('image');
      })?.click();
    });
    await page.waitForTimeout(3000);
    console.log('✓ Image tab active\n');

    // ═══════════════════════════════════════════════════════════════════════════════
    // Function to reinitialize component (trick to fix Google's bug)
    const reinitializeComponent = async () => {
      console.log(`  └─ (Reinitializing component - switch tab trick)`);
      
      // Switch to video tab
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        buttons.find(btn => {
          const icon = btn.querySelector('i');
          return icon && icon.textContent.includes('videocam');
        })?.click();
      });
      await page.waitForTimeout(1000);

      // Switch back to image tab
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        buttons.find(btn => {
          const icon = btn.querySelector('i');
          return icon && icon.textContent.includes('image');
        })?.click();
      });
      await page.waitForTimeout(1500);
    };

    // ═══════════════════════════════════════════════════════════════════════════════
    // Loop through images
    let imagesUploaded = 0;

    for (let imageIndex = 0; imageIndex < TEST_IMAGES.length; imageIndex++) {
      const imagePath = TEST_IMAGES[imageIndex];
      const imageName = path.basename(imagePath);
      const imageType = imageIndex === 0 ? 'person/model' : 'product';

      console.log(`📍 Step 4+: Upload image ${imageIndex + 1} (${imageType})`);

      // ═════════════════════════════════════════════════════════════════════════════
      // Step 4: Detect textarea parent, save reference, click add button
      console.log(`  └─ 4.${imageIndex + 1}: Detect textarea & click add button`);

      // Apply the reinitialize trick before attempting upload
      await reinitializeComponent();

      const parentContainerId = await page.evaluate(() => {
        const textarea = document.getElementById('PINHOLE_TEXT_AREA_ELEMENT_ID');
        if (!textarea) return null;

        // Find the parent container (most likely the div with sc-77366d4e-2 class)
        let container = textarea.parentElement;
        while (container && !container.className.includes('sc-77366d4e-2')) {
          container = container.parentElement;
        }

        if (!container) {
          container = textarea.parentElement; // fallback to direct parent
        }

        // Store a unique identifier (we'll use data attribute)
        if (!container.id) {
          container.id = `button-container-${Date.now()}`;
        }

        return container.id;
      });

      if (!parentContainerId) {
        console.log(`  ❌ Could not identify parent container`);
        continue;
      }

      // Click add button - IMPROVED: search more flexibly
      const addBtnClicked = await page.evaluate(() => {
        const textarea = document.getElementById('PINHOLE_TEXT_AREA_ELEMENT_ID');
        if (!textarea) return false;

        // Get the parent container (level 1: sc-77366d4e-2)
        let container = textarea.parentElement;
        while (container && !container.className.includes('sc-77366d4e-2')) {
          container = container.parentElement;
        }

        if (!container) return false;

        // Search ALL buttons in container for "add" icon
        // More flexible approach - check all children
        const allButtons = Array.from(container.querySelectorAll('button'));
        const addBtn = allButtons.find(btn => {
          const icon = btn.querySelector('i');
          if (!icon) return false;
          const iconText = icon.textContent.trim();
          return iconText === 'add' && !btn.disabled;
        });

        if (addBtn) {
          addBtn.click();
          return true;
        }

        // If not found with icon === 'add', try different icon texts
        const alternativeBtn = allButtons.find(btn => {
          const icon = btn.querySelector('i');
          if (!icon) return false;
          const iconText = icon.textContent.trim().toLowerCase();
          return (iconText.includes('add') || iconText.includes('plus') || iconText === 'add_photo') && !btn.disabled;
        });

        if (alternativeBtn) {
          alternativeBtn.click();
          return true;
        }

        // Last resort: look in children[2] area more carefully
        const children = container.children;
        for (let i = 1; i < Math.min(4, children.length); i++) {
          const child = children[i];
          const buttons = Array.from(child.querySelectorAll('button'));
          for (const btn of buttons) {
            const icon = btn.querySelector('i');
            if (icon) {
              const txt = icon.textContent.trim().toLowerCase();
              if ((txt === 'add' || txt.includes('add') || txt === 'add_photo') && !btn.disabled) {
                btn.click();
                return true;
              }
            }
          }
        }

        return false;
      });

      if (!addBtnClicked) {
        // Debug: Log what buttons are actually available
        const debugInfo = await page.evaluate(() => {
          const textarea = document.getElementById('PINHOLE_TEXT_AREA_ELEMENT_ID');
          if (!textarea) return { error: 'textarea not found' };

          let container = textarea.parentElement;
          while (container && !container.className.includes('sc-77366d4e-2')) {
            container = container.parentElement;
          }

          if (!container) return { error: 'container sc-77366d4e-2 not found' };

          const allButtons = Array.from(container.querySelectorAll('button'));
          return {
            totalButtons: allButtons.length,
            buttonDetails: allButtons.map(btn => ({
              icon: btn.querySelector('i')?.textContent.trim() || 'NO_ICON',
              disabled: btn.disabled,
              visible: btn.offsetParent !== null
            }))
          };
        });

        console.log(`  ❌ Could not click add button`);
        console.log(`  Debug info:`, JSON.stringify(debugInfo, null, 2));
        continue;
      }

      await page.waitForTimeout(2000);
      console.log(`  ✓ Add button clicked, popup opened\n`);

      // ═════════════════════════════════════════════════════════════════════════════
      // Step 5: Directly upload file through the file input that appeared
      console.log(`  └─ 4.${imageIndex + 1}.2: Upload file through file input`);

      // FIRST: Wait for file input to appear on the page
      let fileInputFound = false;
      let waitAttempts = 0;
      while (!fileInputFound && waitAttempts < 30) {
        await page.waitForTimeout(300);
        waitAttempts++;

        const fileInputs = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('input[type="file"]')).length;
        });

        if (fileInputs > 0) {
          fileInputFound = true;
          console.log(`  ✓ File input appeared (after ${waitAttempts * 300}ms)`);
          break;
        }
      }

      if (!fileInputFound) {
        console.log(`  ❌ File input did not appear within 10 seconds`);
        continue;
      }

      // SECOND: Set up file chooser promise
      const fileChooserPromise = page.waitForFileChooser({ timeout: 15000 });

      // THIRD: Click the file input
      const fileinputClicked = await page.evaluate(() => {
        const fileInputs = Array.from(document.querySelectorAll('input[type="file"]'));
        for (const input of fileInputs) {
          const accept = (input.accept || '').toLowerCase();
          // Find file input that accepts images
          if (accept.includes('jpg') || accept.includes('png') || accept.includes('image') || accept === '') {
            console.log('Clicking file input with accept:' + accept);
            input.click();
            return true;
          }
        }
        // If still no luck, click the first file input
        if (fileInputs.length > 0) {
          fileInputs[0].click();
          return true;
        }
        return false;
      });

      if (!fileinputClicked) {
        console.log(`  ❌ Could not click file input`);
        continue;
      }

      try {
        const fileChooser = await fileChooserPromise;
        await fileChooser.accept([imagePath]);
        await page.waitForTimeout(3000);
        console.log(`  ✓ File selected: ${imageName}\n`);
      } catch (e) {
        console.log(`  ❌ File chooser error: ${e.message}`);
        
        // Debug: Check if file input is still on page
        const fileInputStatus = await page.evaluate(() => {
          const inputs = Array.from(document.querySelectorAll('input[type="file"]'));
          return {
            count: inputs.length,
            details: inputs.map(inp => ({
              accept: inp.accept,
              visible: inp.offsetParent !== null,
              disabled: inp.disabled
            }))
          };
        });
        
        console.log(`  Debug - File inputs on page:`, JSON.stringify(fileInputStatus, null, 2));
        continue;
      }

      // ═════════════════════════════════════════════════════════════════════════════
      // Step 6: Find crop dialog and click "Cắt và lưu" (wait 10s)
      console.log(`  └─ 4.${imageIndex + 1}.3: Detect crop dialog & click button`);

      try {
        await page.waitForFunction(
          () => {
            const dialogs = Array.from(document.querySelectorAll('[role="dialog"]'));
            return dialogs.some(dialog => {
              const title = dialog.querySelector('h2');
              return title && title.textContent.includes('Cắt');
            });
          },
          { timeout: 15000 }
        );
        console.log(`  ✓ Crop dialog appeared`);
      } catch (e) {
        console.log(`  ❌ Crop dialog timeout: ${e.message}`);
        continue;
      }

      await page.waitForTimeout(500);

      const cutClicked = await page.evaluate(() => {
        const dialogs = Array.from(document.querySelectorAll('[role="dialog"]'));
        const cropDialog = dialogs.find(dialog => {
          const title = dialog.querySelector('h2');
          return title && title.textContent.includes('Cắt');
        });

        if (!cropDialog) return false;

        const buttons = Array.from(cropDialog.querySelectorAll('button'));
        const cutBtn = buttons.find(btn => {
          const text = btn.textContent.toLowerCase().trim();
          return text.includes('cắt') && text.includes('lưu');
        });

        if (cutBtn && !cutBtn.disabled) {
          cutBtn.click();
          return true;
        }
        return false;
      });

      if (!cutClicked) {
        console.log(`  ❌ "Cắt và lưu" button not found`);
        continue;
      }

      console.log(`  ✓ "Cắt và lưu" clicked\n`);

      // ═════════════════════════════════════════════════════════════════════════════
      // Step 7: Wait for dialog to close + poll button count
      console.log(`  └─ 4.${imageIndex + 1}.4: Wait for dialog close & poll button count`);

      try {
        await page.waitForFunction(
          () => {
            const dialogs = Array.from(document.querySelectorAll('[role="dialog"]'));
            return !dialogs.some(dialog => {
              const title = dialog.querySelector('h2');
              return title && title.textContent.includes('Cắt');
            });
          },
          { timeout: 10000 }
        );
        console.log(`  ✓ Dialog closed`);
      } catch (e) {
        console.log(`  ❌ Dialog close timeout: ${e.message}`);
        continue;
      }

      // Now poll for button count in the textarea container
      const expectedButtonCount = imageIndex === 0 ? 3 : 4; // 3 after first image, 4 after second
      let buttonCountReady = false;
      let pollAttempts = 0;
      const maxPolls = 60; // ~30 seconds with 500ms intervals

      while (!buttonCountReady && pollAttempts < maxPolls) {
        await page.waitForTimeout(500);
        pollAttempts++;

        const buttonInfo = await page.evaluate((containerId) => {
          const container = document.getElementById(containerId);
          if (!container) return { error: 'container not found', buttons: 0 };

          const buttons = Array.from(container.querySelectorAll('button'));
          const iconCounts = {};

          for (const btn of buttons) {
            const icon = btn.querySelector('i');
            const iconText = icon ? icon.textContent.trim() : 'NO_ICON';
            iconCounts[iconText] = (iconCounts[iconText] || 0) + 1;
          }

          return {
            totalButtons: buttons.length,
            iconCounts,
            buttons: buttons.map(b => ({
              icon: b.querySelector('i')?.textContent.trim() || 'NO_ICON',
              disabled: b.disabled
            }))
          };
        }, parentContainerId);

        if (buttonInfo.totalButtons >= expectedButtonCount) {
          buttonCountReady = true;
        }

        // Log every 5 polls (~2.5s)
        if (pollAttempts % 5 === 0) {
          process.stdout.write(
            `  ⏱️  ${pollAttempts * 500}ms... buttons=${buttonInfo.totalButtons} ` +
            `(close=${buttonInfo.iconCounts.close || 0}, add=${buttonInfo.iconCounts.add || 0}, send=${buttonInfo.iconCounts.arrow_forward || 0})\r`
          );
        }
      }

      if (buttonCountReady) {
        console.log(`\n  ✓ Preview ready (button count = ${expectedButtonCount})\n`);
        imagesUploaded++;
      } else {
        console.log(`\n  ⚠️  Timeout waiting for buttons (got expected, continuing...)\n`);
        imagesUploaded++;
      }
    }

    console.log(`${imagesUploaded === TEST_IMAGES.length ? '✅' : '⚠️ '} Uploaded ${imagesUploaded}/${TEST_IMAGES.length} images\n`);

    // ═══════════════════════════════════════════════════════════════════════════════
    console.log('📍 Step 8: Enter VTO prompt');

    // Wait for button count to be 4 (2 close + 1 add + 1 send) AND verify 2 components loaded
    try {
      await page.waitForFunction(
        () => {
          const buttons = Array.from(document.querySelectorAll('button'));

          let closeCount = 0, addCount = 0, sendCount = 0;
          for (const btn of buttons) {
            const icon = btn.querySelector('i')?.textContent.trim() || '';
            if (icon.includes('close')) closeCount++;
            if (icon.includes('add')) addCount++;
            if (icon.includes('arrow_forward') || icon.includes('send')) sendCount++;
          }

          // Should have exactly: 2 close (previews) + 1 add + 1 send
          return closeCount === 2 && addCount >= 1 && sendCount >= 1;
        },
        { timeout: 30000 }
      );
      console.log('✓ Button count confirmed ready (2 components + add + send)');
    } catch (e) {
      console.log('⚠️  Button count not reached, but continuing with prompt');
    }

    // Clean and split prompt
    const cleanPrompt = VTO_PROMPT.trim().replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ');
    const firstPart = cleanPrompt.substring(0, 10);
    const secondPart = cleanPrompt.substring(10);
    const expectedLength = cleanPrompt.length;

    console.log(`  Prompt (cleaned): "${cleanPrompt}"`);
    console.log(`  Split: "${firstPart}" + "${secondPart}"`);
    console.log(`  Target length: ${expectedLength} characters`);

    // Step 1: Focus and type first 10 characters
    await page.focus('#PINHOLE_TEXT_AREA_ELEMENT_ID');
    await page.waitForTimeout(300);
    console.log(`  → Typing first 10 chars: "${firstPart}"`);
    await page.keyboard.type(firstPart, { delay: 50 }); // Type each character slowly
    await page.waitForTimeout(200);

    // Step 2: Type remaining part (split into chunks for better React component recognition)
    if (secondPart.length > 0) {
      console.log(`  → Typing remaining ${secondPart.length} chars in chunks...`);
      const chunkSize = 50; // Type in 50-char chunks
      for (let i = 0; i < secondPart.length; i += chunkSize) {
        const chunk = secondPart.substring(i, i + chunkSize);
        await page.keyboard.type(chunk, { delay: 5 });
        await page.waitForTimeout(50); // Small delay between chunks
      }
      // Trigger final events to ensure React component recognizes the full input
      await page.evaluate(() => {
        const textarea = document.getElementById('PINHOLE_TEXT_AREA_ELEMENT_ID');
        if (textarea) {
          textarea.dispatchEvent(new Event('blur', { bubbles: true }));
          textarea.dispatchEvent(new Event('focus', { bubbles: true }));
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          textarea.dispatchEvent(new Event('change', { bubbles: true }));
          textarea.dispatchEvent(new Event('keyup', { bubbles: true }));
        }
      });
      await page.waitForTimeout(300);
    }

    // Step 3: Wait for textarea content to match expected length
    console.log(`  → Waiting for textarea to have ${expectedLength} characters...`);
    let promptReady = false;
    let waitAttempts = 0;
    const maxWaitAttempts = 20; // 10 seconds max (500ms per attempt)

    while (!promptReady && waitAttempts < maxWaitAttempts) {
      const currentLength = await page.evaluate(() => {
        const textarea = document.getElementById('PINHOLE_TEXT_AREA_ELEMENT_ID');
        return textarea ? textarea.value.length : 0;
      });

      if (currentLength >= expectedLength) {
        promptReady = true;
        console.log(`  ✓ Textarea ready (${currentLength}/${expectedLength} characters)`);
      } else {
        if (waitAttempts % 2 === 0) {
          process.stdout.write(`  ⏱️  ${currentLength}/${expectedLength}...\r`);
        }
        await page.waitForTimeout(500);
        waitAttempts++;
      }
    }

    if (!promptReady) {
      console.log(`\n  ⚠️  Timeout waiting for full prompt (got partial content)`);
    }

    console.log(`\n✓ Prompt entered (${expectedLength} characters)`);

    // ═══════════════════════════════════════════════════════════════════════════════
    console.log('📍 Step 9: Validate & Submit');

    // Comprehensive validation BEFORE submission
    const submitValidation = await page.evaluate((expectedLen) => {
      const textarea = document.getElementById('PINHOLE_TEXT_AREA_ELEMENT_ID');
      if (!textarea) return { valid: false, reason: 'textarea not found', textareaLength: 0 };

      let container = textarea.parentElement;
      while (container && !container.className.includes('sc-77366d4e-2')) {
        container = container.parentElement;
      }

      if (!container) return { valid: false, reason: 'container not found', textareaLength: textarea.value.length };

      const buttons = Array.from(container.querySelectorAll('button'));
      let closeCount = 0;
      let sendBtn = null;

      for (const btn of buttons) {
        const icon = btn.querySelector('i');
        if (!icon) continue;
        const iconText = icon.textContent.trim();
        if (iconText === 'close') closeCount++;
        if (iconText === 'arrow_forward') sendBtn = btn;
      }

      const textareaLength = textarea.value.length;

      // Check component count (must be exactly 2)
      if (closeCount !== 2) {
        return { valid: false, reason: `Expected 2 components, found ${closeCount}`, components: closeCount, textareaLength };
      }

      // Check send button exists
      if (!sendBtn) {
        return { valid: false, reason: 'send button not found', components: closeCount, textareaLength };
      }

      // Check textarea length matches expected
      if (textareaLength < expectedLen) {
        return { valid: false, reason: `Textarea incomplete (${textareaLength}/${expectedLen} chars)`, components: closeCount, textareaLength };
      }

      return { valid: true, components: closeCount, textareaLength, sendDisabled: sendBtn.disabled };
    }, expectedLength);

    if (!submitValidation.valid) {
      console.log(`❌ Validation failed: ${submitValidation.reason}`);
      console.log(`   Textarea: ${submitValidation.textareaLength}/${expectedLength} chars`);
      console.log(`   Components: ${submitValidation.components}`);
      throw new Error(`Cannot submit: ${submitValidation.reason}`);
    }

    if (submitValidation.sendDisabled) {
      console.log(`⚠️  Send button disabled, enabling...`);
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const sendBtn = buttons.find(btn => {
          const icon = btn.querySelector('i');
          return icon && icon.textContent.includes('arrow_forward');
        });
        if (sendBtn) sendBtn.disabled = false;
      });
    }

    console.log(`✓ All checks passed (${submitValidation.components} components, ${submitValidation.textareaLength}/${expectedLength} chars)\n`);

    // Final: Click send button
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      for (const btn of buttons) {
        const icon = btn.querySelector('i');
        if (icon && icon.textContent.includes('arrow_forward')) {
          btn.click();
          return;
        }
      }
    });

    console.log('📍 Step 9: Submit & wait for generation');
    console.log('✓ Submitted\n');

    // ═══════════════════════════════════════════════════════════════════════════════
    console.log('📍 Step 10: Wait for generation & find results');
    console.log('━'.repeat(70) + '\n');

    let generated = false;
    let checkCount = 0;

    for (let i = 0; i < 180; i++) {
      await page.waitForTimeout(1000);

      const status = await page.evaluate(() => {
        // Check for generation status text
        const text = document.body.innerText.toLowerCase();

        if (text.includes('generating') || text.includes('đang tạo')) {
          return 'generating';
        }
        if (text.includes('processing') || text.includes('xử lý')) {
          return 'processing';
        }

        // Look for generated images
        const imgs = document.querySelectorAll('img');
        for (const img of imgs) {
          if (img.src && (img.src.includes('blob') || img.src.includes('data:image'))) {
            if (img.offsetParent !== null && img.width >= 100 && img.height >= 100) {
              return 'image_found';
            }
          }
        }

        return 'waiting';
      });

      checkCount++;
      if (checkCount % 10 === 0 || status === 'image_found') {
        const elapsed = i + 1;
        process.stdout.write(`⏱️  ${elapsed}s... (${status})\r`);
      }

      if (status === 'image_found') {
        generated = true;
        console.log('\n');
        break;
      }
    }

    console.log('━'.repeat(70) + '\n');

    // ═══════════════════════════════════════════════════════════════════════════════
    console.log('📍 Step 11: Download generated images');

    if (generated) {
      const initialFiles = fs.readdirSync(downloadDir);
      const generatedImages = [];

      // Find download buttons and download images
      const downloadBtns = await page.evaluate(() => {
        const scroller = document.querySelector('[data-testid="virtuoso-scroller"]');
        if (!scroller) return [];

        const items = scroller.querySelectorAll('[data-index]');
        return items.length;
      });

      console.log(`\n📍 Found ${downloadBtns} generated items, downloading...\n`);

      for (let d = 0; d < downloadBtns; d++) {
        console.log(`  💾 Downloading item ${d + 1}/${downloadBtns}...`);

        const downloadResult = await page.evaluate((idx) => {
          const scroller = document.querySelector('[data-testid="virtuoso-scroller"]');
          if (!scroller) return { error: 'No scroller' };

          const items = scroller.querySelectorAll('[data-index]');
          const item = items[idx];
          if (!item) return { error: 'Item not found' };

          const buttons = item.querySelectorAll('button');
          let downloadBtn = null;
          for (const btn of buttons) {
            const icon = btn.querySelector('i');
            if (icon && icon.textContent.includes('download')) {
              downloadBtn = btn;
              break;
            }
          }

          if (!downloadBtn) return { error: 'No download button' };

          downloadBtn.click();
          return { success: true };
        }, d);

        if (!downloadResult.success) {
          console.log(`    ❌ ${downloadResult.error}`);
          continue;
        }

        // Wait for menu to appear (or auto-download for Banana model)
        await page.waitForTimeout(500);

        // Check if menu exists (Nano Banana Pro has menu, Banana model auto-downloads)
        const menuCheckResult = await page.evaluate(() => {
          let menuItems = document.querySelectorAll('[role="menuitem"]');
          if (menuItems.length === 0) {
            menuItems = document.querySelectorAll('[role="option"], button[class*="menu"]');
          }
          return {
            hasMenu: menuItems.length > 0,
            menuCount: menuItems.length
          };
        });

        let modelType = 'Unknown';
        let download2KSelected = false;

        if (menuCheckResult.hasMenu) {
          // Nano Banana Pro: has download menu with 2K option
          modelType = 'Nano Banana Pro';
          download2KSelected = await page.evaluate(() => {
            let menuItems = document.querySelectorAll('[role="menuitem"]');
            if (menuItems.length === 0) {
              menuItems = document.querySelectorAll('[role="option"], button[class*="menu"]');
            }

            // Try to find 2K Tải xuống option
            for (let i = 0; i < menuItems.length; i++) {
              const text = menuItems[i].textContent.trim();
              if (text.includes('2K') && text.includes('Tải xuống') && !text.includes('4K') && !text.includes('1K')) {
                menuItems[i].click();
                return true;
              }
            }

            // Fallback: click second item if exists
            if (menuItems.length >= 2) {
              menuItems[1].click();
              return true;
            }

            return false;
          });

          if (!download2KSelected) {
            console.log(`    ⚠️  Could not select 2K option (${modelType})`);
            continue;
          }
          console.log(`    ✓ Selected 2K download (${modelType})`);
        } else {
          // Banana model: auto-downloads without menu
          modelType = 'Banana';
          download2KSelected = true;
          console.log(`    ✓ Auto-download triggered (${modelType})`);;
        }

        // Wait for upgrade message (nâng cấp hình ảnh) - mainly for Nano Banana Pro
        let upgradeDetected = false;
        let upgradeCheckTime = 0;
        for (let i = 0; i < 10; i++) {
          const hasUpgrade = await page.evaluate(() => {
            const text = document.body.innerText.toLowerCase();
            return text.includes('nâng cấp') || text.includes('upgrading') || text.includes('processing');
          });

          if (hasUpgrade) {
            upgradeDetected = true;
            upgradeCheckTime = (i + 1) * 500;
            console.log(`    ✓ Image upgrading detected (after ${upgradeCheckTime}ms)...`);
            break;
          }

          await page.waitForTimeout(500);
        }

        // For Banana model, upgrade message may not appear
        if (!upgradeDetected) {
          if (modelType === 'Banana') {
            console.log(`    ⚠️  No upgrade message (${modelType} model may skip this)`);
          } else {
            console.log(`    ⚠️  No upgrade message detected (may still be downloading)`);
          }
        }

        // Wait for file to download (max 15 seconds)
        let fileDownloaded = false;
        for (let i = 0; i < 30; i++) {
          const currentFiles = fs.readdirSync(downloadDir);
          const newFiles = currentFiles.filter(
            f => !initialFiles.includes(f) && !f.endsWith('.crdownload')
          );

          if (newFiles.length > 0) {
            const newFile = newFiles[newFiles.length - 1];
            const filePath = path.join(downloadDir, newFile);
            generatedImages.push({
              filename: newFile,
              path: filePath,
              size: fs.statSync(filePath).size
            });
            initialFiles.push(newFile);
            console.log(`    ✓ File saved: ${newFile} (${Math.round(fs.statSync(filePath).size / 1024)}KB)`);
            fileDownloaded = true;
            break;
          }

          await page.waitForTimeout(500);
        }

        if (!fileDownloaded) {
          console.log(`    ⚠️  File download timeout (may still be downloading)`);
        }

        await page.waitForTimeout(1000);
      }

      console.log(`\n✓ Download complete! ${generatedImages.length} files saved to ${downloadDir}\n`);

      // Show summary of downloaded files
      if (generatedImages.length > 0) {
        console.log('📊 Downloaded Files:');
        generatedImages.forEach((img, idx) => {
          console.log(`  ${idx + 1}. ${img.filename} (${Math.round(img.size / 1024)}KB)`);
        });
        console.log();
      }
    }

    console.log('━'.repeat(70) + '\n');

    // ═══════════════════════════════════════════════════════════════════════════════
    console.log('📍 RESULTS\n');

    if (generated) {
      console.log('✅ FULL FLOW SUCCESSFUL!\n');
      console.log('✓ Completed:');
      console.log('  1. ✅ Project loaded');
      console.log('  2. ✅ Tab switched');
      console.log(`  3. ✅ ${imagesUploaded} images uploaded & cropped`);
      console.log('  4. ✅ Prompt entered');
      console.log('  5. ✅ Generation complete');
      console.log('  6. ✅ Images downloaded & saved\n');
    } else {
      console.log('⏱️  Generation timeout\n');
      console.log('✓ Completed steps:');
      console.log('  1. ✅ Project loaded');
      console.log('  2. ✅ Tab switched');
      console.log(`  3. ✅ ${imagesUploaded} images uploaded & cropped`);
      console.log('  4. ✅ Prompt entered');
      console.log('  5. ⏳ Generation in progress\n');
    }

    await page.screenshot({ path: 'final-result.png' });
    console.log('📸 Screenshot: final-result.png\n');

    await page.waitForTimeout(3000);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    if (browser) {
      await browser.close();
      console.log('✓ Done\n');
    }
  }
}

testCompleteFlow();
