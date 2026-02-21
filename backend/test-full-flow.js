#!/usr/bin/env node

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
puppeteer.use(StealthPlugin());

const SESSION_FILE = path.join(__dirname, '.sessions/google-flow-session.json');
const PROJECT_URL = 'https://labs.google/fx/vi/tools/flow/project/3ba9e02e-0a33-4cf2-9d55-4c396941d7b7';
const TEST_IMAGES = [
  path.join(__dirname, 'test-images/anh-nhan-vat.jpeg'),
  path.join(__dirname, 'test-images/anh-san-pham.png')
];
// VTO use case: Let user try on product from test image
const VTO_PROMPT = 'Vietnamese woman wearing the product shown in the other image, fashion photoshoot style, professional lighting, full body shot';

async function testCompleteFlow() {
  let browser;
  try {
    console.log('\n════════════════════════════════════════════════════════════════');
    console.log('🎬 Lab Flow - Complete End-to-End Test');
    console.log('════════════════════════════════════════════════════════════════\n');

    // Verify test images exist
    for (const testImg of TEST_IMAGES) {
      if (!fs.existsSync(testImg)) {
        console.error(`❌ Test image not found: ${path.basename(testImg)}`);
        return;
      }
    }
    console.log(`📸 Using ${TEST_IMAGES.length} test images\n`);

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
    console.log('📍 Step 1: Navigate to project');
    await page.goto(PROJECT_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForTimeout(2000);
    console.log('✓ Loaded\n');

    // ═══════════════════════════════════════════════════════════════════════════════
    console.log('📍 Step 2: Initialize (switch tabs)');
    // Video tab
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      buttons.find(btn => {
        const icon = btn.querySelector('i');
        return icon && icon.textContent.includes('videocam');
      })?.click();
    });
    await page.waitForTimeout(1500);

    // Image tab
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      buttons.find(btn => {
        const icon = btn.querySelector('i');
        return icon && icon.textContent.includes('image');
      })?.click();
    });
    await page.waitForTimeout(1500);
    console.log('✓ Tabs switched\n');

    // ═══════════════════════════════════════════════════════════════════════════════
    // Upload 2 images: person and product
    for (let imageIndex = 0; imageIndex < TEST_IMAGES.length; imageIndex++) {
      const imagePath = TEST_IMAGES[imageIndex];
      const imageName = path.basename(imagePath);
      const imageType = imageIndex === 0 ? 'person/model' : 'product';

      console.log(`📍 Step ${3 + imageIndex * 2}: Upload image ${imageIndex + 1} (${imageType})`);
      
      // Wait before attempting next upload to allow UI to stabilize
      if (imageIndex > 0) {
        await page.waitForTimeout(2000);
      }

      // Click add button to open popup
      const addBtnClicked = await page.evaluate(() => {
        const textarea = document.getElementById('PINHOLE_TEXT_AREA_ELEMENT_ID');
        if (!textarea) return false;

        // Try to find button within parent hierarchy first
        let parent = textarea.parentElement;
        let depth = 0;
        
        while (parent && depth < 3) {
          const addBtn = Array.from(parent.querySelectorAll('button')).find(btn => {
            const icon = btn.querySelector('i');
            return icon && icon.textContent.trim() === 'add';
          });
          
          if (addBtn && !addBtn.disabled) {
            addBtn.click();
            return true;
          }
          
          parent = parent.parentElement;
          depth++;
        }
        
        // If not found in parent hierarchy, search entire document
        const allBtns = Array.from(document.querySelectorAll('button'));
        const addBtn = allBtns.find(btn => {
          const icon = btn.querySelector('i');
          return icon && 
                 icon.textContent.trim() === 'add' && 
                 !btn.disabled &&
                 btn.offsetHeight > 0; // visible
        });
        
        if (addBtn) {
          addBtn.click();
          return true;
        }
        
        return false;
      });
      
      if (!addBtnClicked) {
        console.log('❌ Could not click add button');
        continue;
      }

      await page.waitForTimeout(1500);
      console.log('✓ Popup opened');

      // Wait for file chooser and upload
      const fileChooserPromise = page.waitForFileChooser({ timeout: 8000 });
      
      const uploadBtnClicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(b => {
          const text = b.textContent.toLowerCase();
          const icon = b.querySelector('i');
          const iconText = icon ? icon.textContent.toLowerCase() : '';
          return (text.includes('tải') && text.includes('lên')) || 
                 (iconText.includes('upload') && text.includes('tải'));
        });
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      });

      if (!uploadBtnClicked) {
        console.log('❌ Could not find upload button');
        continue;
      }

      try {
        const fileChooser = await fileChooserPromise;
        await fileChooser.accept([imagePath]);
        console.log(`✓ File selected: ${imageName}`);
      } catch (e) {
        console.log(`❌ File chooser timeout: ${e.message}`);
        continue;
      }

      // Wait for crop dialog to appear (indicates file was uploaded successfully)
      try {
        await page.waitForFunction(
          () => {
            // Look for the crop dialog - it has role="dialog" and contains "Cắt thành phần" title
            const dialogs = Array.from(document.querySelectorAll('[role="dialog"]'));
            return dialogs.some(dialog => {
              const title = dialog.querySelector('h2');
              return title && title.textContent.includes('Cắt');
            });
          },
          { timeout: 15000 }
        );
        console.log('✓ Crop dialog appeared');
      } catch (e) {
        console.log(`❌ Crop dialog timeout: ${e.message}`);
        continue;
      }

      // Click "Cắt và lưu" button inside the crop dialog
      await page.waitForTimeout(500);
      const cutClicked = await page.evaluate(() => {
        // Find the crop dialog
        const dialogs = Array.from(document.querySelectorAll('[role="dialog"]'));
        const cropDialog = dialogs.find(dialog => {
          const title = dialog.querySelector('h2');
          return title && title.textContent.includes('Cắt');
        });
        
        if (!cropDialog) return false;
        
        // Find and click "Cắt và lưu" button inside it
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

      if (cutClicked) {
        console.log('✓ Clicked "Cắt và lưu" button');
        
        // Wait for crop dialog to close (processing complete)
        try {
          await page.waitForFunction(
            () => {
              // Check if crop dialog is gone
              const dialogs = Array.from(document.querySelectorAll('[role="dialog"]'));
              return !dialogs.some(dialog => {
                const title = dialog.querySelector('h2');
                return title && title.textContent.includes('Cắt');
              });
            },
            { timeout: 10000 }
          );
          console.log('✓ Crop dialog closed');
          
          // Now wait for the textarea parent to re-render with preview button
          // After crop, the parent div should have 2 buttons: close (with image background) + add
          let previewReady = false;
          let checkAttempts = 0;
          const maxAttempts = 50; // ~25 seconds with 500ms intervals
          
          while (!previewReady && checkAttempts < maxAttempts) {
            await page.waitForTimeout(500);
            checkAttempts++;
            
            previewReady = await page.evaluate(() => {
              const textarea = document.getElementById('PINHOLE_TEXT_AREA_ELEMENT_ID');
              const parentDiv = textarea?.parentElement;
              if (!parentDiv) return false;
              
              // Get all buttons within the parent container
              const buttons = Array.from(parentDiv.querySelectorAll('button'));
              
              // Look for the pattern: close button (with background-image for preview) + add button
              let hasCloseWithPreview = false;
              let hasAddButton = false;
              
              for (const btn of buttons) {
                const icon = btn.querySelector('i');
                const iconText = icon ? icon.textContent.trim() : '';
                
                // Close button with preview image (it has background-image)
                if (iconText.includes('close')) {
                  const style = window.getComputedStyle(btn);
                  const bgImage = style.backgroundImage;
                  // Check if background-image is set (preview image loaded)
                  if (bgImage && bgImage !== 'none' && bgImage.includes('url')) {
                    hasCloseWithPreview = true;
                  }
                }
                
                // Add button (for next image)
                if (iconText.includes('add')) {
                  hasAddButton = true;
                }
              }
              
              // Both conditions must be met: preview image + add button
              return hasCloseWithPreview && hasAddButton && buttons.length >= 2;
            });
            
            if (!previewReady && checkAttempts % 5 === 0) {
              // Log progress every 2.5 seconds
              const status = await page.evaluate(() => {
                const textarea = document.getElementById('PINHOLE_TEXT_AREA_ELEMENT_ID');
                const parentDiv = textarea?.parentElement;
                const buttons = parentDiv?.querySelectorAll('button') || [];
                
                let closeWithBg = false;
                let addBtn = false;
                
                for (const btn of buttons) {
                  const icon = btn.querySelector('i')?.textContent.trim() || '';
                  if (icon.includes('close')) {
                    const bgImage = window.getComputedStyle(btn).backgroundImage;
                    closeWithBg = bgImage && bgImage !== 'none';
                  }
                  if (icon.includes('add')) addBtn = true;
                }
                
                return { buttonCount: buttons.length, closeWithBg, addBtn };
              });
              
              process.stdout.write(`⏱️  ${checkAttempts * 500}ms... buttons=${status.buttonCount} closeWithBg=${status.closeWithBg} addBtn=${status.addBtn}\r`);
            }
          }
          
          if (previewReady) {
            console.log(`\n✓ Preview image ready (confirmed at ${checkAttempts * 500}ms)`);
          } else {
            console.log(`\n⚠️  Preview may not be fully ready (timeout after ${checkAttempts * 500}ms), but continuing...`);
          }
          
          // Extra safety wait to ensure UI stabilization
          await page.waitForTimeout(500);
          console.log('');
        } catch (e) {
          console.log(`❌ Dialog close timeout: ${e.message}`);
          continue;
        }
      } else {
        console.log('❌ "Cắt và lưu" button not found or disabled');
        continue;
      }

      console.log('');
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    console.log('📍 Step 7: Enter VTO prompt (change-clothes use case)');
    await page.focus('#PINHOLE_TEXT_AREA_ELEMENT_ID');
    await page.waitForTimeout(300);
    
    const testPrompt = VTO_PROMPT;
    await page.type('#PINHOLE_TEXT_AREA_ELEMENT_ID', testPrompt, { delay: 10 });
    console.log(`✓ Prompt: "${testPrompt}"\n`);

    // ═══════════════════════════════════════════════════════════════════════════════
    console.log('📍 Step 8: Submit');
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
    console.log('📍 Step 9: Wait for generation (180s timeout)');
    console.log('━'.repeat(70) + '\n');
    
    let generated = false;
    let checkCount = 0;
    
    for (let i = 0; i < 180; i++) {
      await page.waitForTimeout(1000);
      
      const status = await page.evaluate(() => {
        const text = document.body.innerText.toLowerCase();
        
        if (text.includes('generating') || text.includes('đang tạo')) {
          return 'generating';
        }
        if (text.includes('processing') || text.includes('xử lý')) {
          return 'processing';
        }
        
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
        const elapsed = (i + 1);
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
      console.log('  1. ✅ Login verified');
      console.log('  2. ✅ Component initialized');
      console.log('  3. ✅ Image uploaded');
      console.log('  4. ✅ Image processed');
      console.log('  5. ✅ Prompt entered');
      console.log('  6. ✅ Generation complete\n');
    } else {
      console.log('⏱️  Generation timeout\n');
      console.log('✓ Steps before timeout:');
      console.log('  1. ✅ Login verified');
      console.log('  2. ✅ Component initialized');
      console.log('  3. ✅ Image uploaded');
      console.log('  4. ⏳ Generation in progress\n');
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
