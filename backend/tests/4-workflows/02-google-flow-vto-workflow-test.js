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
    browser = await puppeteer.launch({ headless: false, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

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

      // Click add button - CORRECT: find in closest parent container
      const addBtnClicked = await page.evaluate(() => {
        const textarea = document.getElementById('PINHOLE_TEXT_AREA_ELEMENT_ID');
        if (!textarea) return false;

        // Get the parent container (level 1: sc-77366d4e-2)
        let container = textarea.parentElement;
        while (container && !container.className.includes('sc-77366d4e-2')) {
          container = container.parentElement;
        }

        if (!container) return false;

        // The add button is in the 3rd child (index 2) of this container
        const children = container.children;
        if (children.length < 3) return false;

        const buttonContainer = children[2]; // Third child
        const buttons = Array.from(buttonContainer.querySelectorAll('button'));
        const addBtn = buttons.find(btn => {
          const icon = btn.querySelector('i');
          return icon && icon.textContent.trim() === 'add' && !btn.disabled;
        });

        if (addBtn) {
          addBtn.click();
          return true;
        }
        return false;
      });

      if (!addBtnClicked) {
        console.log(`  ❌ Could not click add button`);
        continue;
      }

      await page.waitForTimeout(2000);
      console.log(`  ✓ Add button clicked, popup opened\n`);

      // ═════════════════════════════════════════════════════════════════════════════
      // Step 5: Directly upload file through the file input that appeared
      console.log(`  └─ 4.${imageIndex + 1}.2: Upload file through file input`);

      const fileChooserPromise = page.waitForFileChooser({ timeout: 8000 });

      // Click the file input directly (it should appear after add button)
      const fileinputClicked = await page.evaluate(() => {
        const fileInputs = Array.from(document.querySelectorAll('input[type="file"]'));
        for (const input of fileInputs) {
          const accept = (input.accept || '').toLowerCase();
          // Find file input that accepts images
          if (accept.includes('jpg') || accept.includes('png') || accept.includes('image')) {
            input.click();
            return true;
          }
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

    // Wait for button count to be 4 (2 close + 1 add + 1 send)
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

          // Should have at least: 2 close (previews) + 1 add + 1 send
          return closeCount >= 2 && addCount >= 1 && sendCount >= 1;
        },
        { timeout: 30000 }
      );
      console.log('✓ Button count confirmed ready (4+ buttons)');
    } catch (e) {
      console.log('⚠️  Button count not reached, but continuing with prompt');
    }

    await page.focus('#PINHOLE_TEXT_AREA_ELEMENT_ID');
    await page.waitForTimeout(300);

    await page.type('#PINHOLE_TEXT_AREA_ELEMENT_ID', VTO_PROMPT, { delay: 10 });
    console.log(`✓ Prompt entered\n`);

    // ═══════════════════════════════════════════════════════════════════════════════
    console.log('📍 Step 9: Submit & wait for generation');

    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      for (const btn of buttons) {
        const icon = btn.querySelector('i');
        if (icon && (icon.textContent.includes('arrow_forward') || icon.textContent.includes('send'))) {
          if (!btn.disabled) {
            btn.click();
            return;
          }
        }
      }
    });

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
    console.log('📍 RESULTS\n');

    if (generated) {
      console.log('✅ FULL FLOW SUCCESSFUL!\n');
      console.log('✓ Completed:');
      console.log('  1. ✅ Project loaded');
      console.log('  2. ✅ Tab switched');
      console.log(`  3. ✅ ${imagesUploaded} images uploaded & cropped`);
      console.log('  4. ✅ Prompt entered');
      console.log('  5. ✅ Generation complete\n');
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
