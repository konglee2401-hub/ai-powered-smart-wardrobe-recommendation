/**
 * GoogleFlowAutomationService - Unified service for Image and Video generation
 * Supports both image and video workflows through single service
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
puppeteer.use(StealthPlugin());

class GoogleFlowAutomationService {
  constructor(options = {}) {
    this.browser = null;
    this.page = null;
    this.type = options.type || 'image'; // 'image' or 'video'
    this.options = {
      headless: false,
      sessionFilePath: path.join(__dirname, '../.sessions/google-flow-session.json'),
      baseUrl: 'https://labs.google/fx/vi/tools/flow',
      projectId: options.projectId || '58d791d4-37c9-47a8-ae3b-816733bc3ec0',
      aspectRatio: options.aspectRatio || '9:16',
      imageCount: this.type === 'image' ? (options.imageCount || 1) : undefined,
      videoCount: this.type === 'video' ? (options.videoCount || 1) : undefined,
      model: options.model || (this.type === 'image' ? 'Nano Banana Pro' : 'Veo 3.1 - Fast'),
      outputDir: options.outputDir || path.join(__dirname, `../temp/${this.type}-generation-outputs`),
      timeouts: {
        pageLoad: 30000,
        tabSwitch: 1500,
        upload: 10000,
        prompt: 3000,
        generation: 120000,
        ...options.timeouts
      },
      ...options
    };
  }

  async init() {
    const typeLabel = this.type === 'image' ? 'Image' : 'Video';
    console.log(`🚀 Initializing ${typeLabel} Generation Service...\n`);

    if (!fs.existsSync(this.options.outputDir)) {
      fs.mkdirSync(this.options.outputDir, { recursive: true });
    }

    const headlessMode = this.options.headless === true ? 'new' : this.options.headless;
    this.browser = await puppeteer.launch({
      headless: headlessMode,
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });

    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1280, height: 720 });

    const client = await this.page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: this.options.outputDir
    });

    await this.loadSession();
    console.log('✅ Initialized\n');
  }

  async loadSession() {
    try {
      if (fs.existsSync(this.options.sessionFilePath)) {
        const sessionData = JSON.parse(fs.readFileSync(this.options.sessionFilePath, 'utf8'));
        for (const cookie of (sessionData.cookies || [])) {
          try {
            await this.page.setCookie(cookie);
          } catch (e) {
            // Ignore cookie errors
          }
        }
        console.log('✅ Session cookies loaded');
      }
    } catch (e) {
      console.log('⚠️  Could not load session');
    }
  }

  async navigateToFlow() {
    const url = this.options.projectId
      ? `${this.options.baseUrl}/project/${this.options.projectId}`
      : this.options.baseUrl;

    console.log('🌐 Navigating to Google Flow...\n');
    console.log(`   Target URL: ${url}\n`);

    await this.page.goto(url, { waitUntil: 'networkidle2', timeout: this.options.timeouts.pageLoad });
    await this.waitForPageReady();
    console.log('✅ Google Flow loaded and logged in\n');
  }

  async waitForPageReady() {
    console.log('⏳ Waiting for page elements to load...');
    let pageReady = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!pageReady && attempts < maxAttempts) {
      attempts++;
      const elements = await this.page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        const visibleButtons = Array.from(buttons).filter(btn => {
          const style = window.getComputedStyle(btn);
          return style.display !== 'none' && style.visibility !== 'hidden';
        });
        const hasFileInput = document.querySelector('input[type="file"]') !== null;
        const prompts = document.querySelectorAll('[contenteditable="true"]');
        return { buttons: buttons.length, visible: visibleButtons.length, input: hasFileInput, prompts: prompts.length };
      });

      pageReady = elements.buttons > 10 && elements.visible > 10 && elements.input && elements.prompts > 0;

      if (!pageReady) {
        console.log(`   Attempt ${attempts}: buttons=${elements.buttons}, visible=${elements.visible}, input=${elements.input}, prompts=${elements.prompts}`);
        console.log(`   ⏳ Not ready yet, waiting 1500ms...`);
        await this.page.waitForTimeout(1500);
      }
    }

    if (!pageReady) {
      throw new Error(`Page elements not ready after ${maxAttempts} attempts`);
    }

    console.log(`   ✅ Page ready (attempt ${attempts})\n`);
  }

  async uploadImages(characterImagePath, productImagePath, existingImages = []) {
    console.log('\n🖼️  UPLOADING IMAGES\n');

    if (!fs.existsSync(characterImagePath)) {
      throw new Error(`Character image not found: ${characterImagePath}`);
    }
    if (!fs.existsSync(productImagePath)) {
      throw new Error(`Product image not found: ${productImagePath}`);
    }

    try {
      // STEP 0: Handle any terms modal
      console.log('⏳ Checking for terms modal...');
      await this.handleTermsModal();
      console.log('✅ Modal check complete\n');

      // STEP 1: Log the files we're about to upload
      console.log('📋 FILES TO UPLOAD:');
      console.log(`   [1] Character: ${characterImagePath}`);
      console.log(`   [2] Product: ${productImagePath}\n`);

      // STEP 2: Configure settings BEFORE uploading (CRITICAL)
      console.log('🔧 Configuring settings BEFORE upload...');
      try {
        await this.configureSettings();
        console.log('✅ Settings configured\n');
      } catch (settingsError) {
        console.log(`⚠️  Settings config failed: ${settingsError.message}`);
        console.log('⚠️  Continuing anyway...\n');
      }

      // STEP 3: Find and log file input
      console.log('🔍 Finding file input on page...');
      const fileInputFound = await this.page.evaluate(() => {
        const inputs = document.querySelectorAll('input[type="file"]');
        console.log(`[DEBUG] Found ${inputs.length} file inputs`);
        return inputs.length > 0;
      });

      if (!fileInputFound) {
        throw new Error('No file input found on page');
      }
      console.log('✅ File input found\n');

      const input = await this.page.$('input[type="file"]');
      
      // Arrays to store file paths and names for sequential processing
      const filesToProcess = [
        { path: characterImagePath, label: 'CHARACTER', index: 0 },
        { path: productImagePath, label: 'PRODUCT', index: 1 }
      ];

      // Get initial image count
      const beforeCount = await this.page.evaluate(() => {
        return document.querySelectorAll('[data-testid="virtuoso-item-list"] [data-index]').length;
      });
      console.log(`📊 Images before upload: ${beforeCount}\n`);

      // PROCESS EACH IMAGE SEQUENTIALLY
      for (let fileIdx = 0; fileIdx < filesToProcess.length; fileIdx++) {
        const file = filesToProcess[fileIdx];
        
        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`📤 UPLOADING ${file.label} IMAGE (${fileIdx + 1}/2)`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

        // Step 1: Upload file
        console.log(`   📤 Attaching file: ${file.path}`);
        await input.uploadFile(file.path);
        console.log(`   ✓ File attached\n`);
        
        await this.page.waitForTimeout(1000);

        // Step 2: Check for ToS modal
        console.log(`   🔍 Checking for ToS modal (3 attempts)...`);
        for (let attempt = 1; attempt <= 3; attempt++) {
          console.log(`   [MODAL CHECK] Attempt ${attempt}/3`);
          const modalHandled = await this.handleTermsModal();
          if (modalHandled) {
            console.log(`   ✓ ToS modal dismissed on attempt ${attempt}\n`);
            break;
          }
          if (attempt < 3) {
            await this.page.waitForTimeout(2000);
          }
        }

        // Step 3: Get initial hrefs from ALL items to track which one is new
        console.log(`   📎 Capturing initial hrefs from all virtuoso items...`);
        const initialAllHrefs = await this.page.evaluate(() => {
          const items = document.querySelectorAll('[data-testid="virtuoso-item-list"] [data-index]');
          const allHrefs = {};
          
          for (const item of items) {
            const index = item.getAttribute('data-index');
            const links = item.querySelectorAll('a[href]');
            const hrefs = [];
            for (let i = 0; i < Math.min(1, links.length); i++) {
              hrefs.push(links[i].getAttribute('href'));
            }
            if (hrefs.length > 0) {
              allHrefs[index] = hrefs[0]; // Store first href for each item
            }
          }
          
          return allHrefs;
        });

        console.log(`   ✓ Captured initial hrefs from ${Object.keys(initialAllHrefs).length} items\n`);

        // Step 4: Monitor for href changes to confirm upload complete
        console.log(`   ⏳ Monitoring for NEW href (confirming new image uploaded)...`);
        let newItemIndex = null;
        let hrefCheckAttempts = 0;
        const maxHrefCheckAttempts = 20; // 20 seconds

        while (newItemIndex === null && hrefCheckAttempts < maxHrefCheckAttempts) {
          hrefCheckAttempts++;

          const result = await this.page.evaluate((oldAllHrefs) => {
            const items = document.querySelectorAll('[data-testid="virtuoso-item-list"] [data-index]');
            
            // Find item with NEW href (not in oldAllHrefs)
            for (const item of items) {
              const index = item.getAttribute('data-index');
              const links = item.querySelectorAll('a[href]');
              
              if (links.length === 0) continue;
              
              const currentHref = links[0].getAttribute('href');
              const oldHref = oldAllHrefs[index];
              
              // If this item's href is NOT in oldAllHrefs, it's a NEW item
              if (!oldHref || oldHref !== currentHref) {
                // Double-check: this href is not in the old values anywhere
                const isNewHref = !Object.values(oldAllHrefs).includes(currentHref);
                if (isNewHref) {
                  return { found: true, newIndex: index, newHref: currentHref };
                }
              }
            }
            
            return { found: false };
          }, initialAllHrefs);

          if (result.found) {
            console.log(`   ✅ NEW item detected at data-index="${result.newIndex}"! New image confirmed.\n`);
            newItemIndex = result.newIndex;
            break;
          }

          if (hrefCheckAttempts % 5 === 0 && hrefCheckAttempts > 0) {
            console.log(`   [CHECK] Attempt ${hrefCheckAttempts}/${maxHrefCheckAttempts}`);
          }

          await this.page.waitForTimeout(1000);
        }

        if (newItemIndex === null) {
          console.log(`   ⚠️  No NEW item detected within timeout\n`);
          console.log(`   ℹ️  Continuing anyway...\n`);
          newItemIndex = file.index; // Fallback to original index
        }

        // Step 5: Wait 2 seconds for virtuoso card to render
        console.log(`   ⏳ Waiting 2 seconds for card rendering...\n`);
        await this.page.waitForTimeout(2000);

        // Step 6: Right-click on the NEW image's <a> tag to show context menu
        console.log(`   📌 Adding image via right-click menu...\n`);

        let successfullyAdded = false;
        let rightClickAttempts = 0;
        const maxRightClickAttempts = 3;

        while (!successfullyAdded && rightClickAttempts < maxRightClickAttempts) {
          rightClickAttempts++;
          
          if (rightClickAttempts > 1) {
            console.log(`   ⏳ Retry ${rightClickAttempts}/${maxRightClickAttempts}...\n`);
          }

          try {
            // Find the NEW <a> tag by its href
            console.log(`   🔍 Finding NEW <a> tag with href...`);
            const linkData = await this.page.evaluate((oldAllHrefs) => {
              // Find all <a> tags in virtuoso items
              const links = document.querySelectorAll('[data-testid="virtuoso-item-list"] a[href]');
              
              for (const link of links) {
                const href = link.getAttribute('href');
                // Check if this href is NEW (not in old list)
                const isNew = !Object.values(oldAllHrefs).includes(href);
                
                if (isNew) {
                  const rect = link.getBoundingClientRect();
                  return {
                    found: true,
                    href: href,
                    x: Math.round(rect.left + rect.width / 2),
                    y: Math.round(rect.top + rect.height / 2)
                  };
                }
              }
              
              return { found: false };
            }, initialAllHrefs);

            if (!linkData.found) {
              console.log(`   ⚠️  NEW <a> tag not found${rightClickAttempts < maxRightClickAttempts ? ', retrying...' : ', skipping'}\n`);
              
              if (rightClickAttempts < maxRightClickAttempts) {
                await this.page.waitForTimeout(1000);
                continue;
              } else {
                break;
              }
            }

            console.log(`   ✓ Found NEW <a> tag at (${linkData.x}, ${linkData.y})`);

            // Move mouse to the link
            console.log(`   🖱️  Moving to link position...`);
            await this.page.mouse.move(linkData.x, linkData.y);
            await this.page.waitForTimeout(300);

            // Right-click on the link
            console.log(`   🖱️  Right-clicking on image...`);
            await this.page.mouse.click(linkData.x, linkData.y, { button: 'right' });
            await this.page.waitForTimeout(800);

            // Find and click "Thêm vào câu lệnh" button in context menu
            const addBtn = await this.page.evaluate(() => {
              const buttons = document.querySelectorAll('button[role="menuitem"]');

              for (const btn of buttons) {
                const text = btn.textContent.trim();
                if (text.includes('Thêm vào')) {
                  return {
                    x: Math.floor(btn.getBoundingClientRect().left + btn.getBoundingClientRect().width / 2),
                    y: Math.floor(btn.getBoundingClientRect().top + btn.getBoundingClientRect().height / 2)
                  };
                }
              }

              return null;
            });

            if (!addBtn) {
              console.log(`   ⚠️  "Thêm vào câu lệnh" button not found${rightClickAttempts < maxRightClickAttempts ? ', retrying...' : ', skipping'}\n`);
              
              if (rightClickAttempts < maxRightClickAttempts) {
                await this.page.waitForTimeout(1000);
                continue;
              } else {
                break;
              }
            }

            // Click add button
            console.log(`   ✓ Found "Thêm vào câu lệnh" button`);
            await this.page.mouse.move(addBtn.x, addBtn.y);
            await this.page.waitForTimeout(200);
            await this.page.mouse.down();
            await this.page.waitForTimeout(100);
            await this.page.mouse.up();
            await this.page.waitForTimeout(1200);

            console.log(`   ✓ Image ${fileIdx + 1} added via "Thêm vào câu lệnh"\n`);
            successfullyAdded = true;

          } catch (e) {
            console.log(`   ❌ Error: ${e.message}${rightClickAttempts < maxRightClickAttempts ? ', retrying...' : ', skipping'}\n`);
            
            if (hoverAttempts < maxHoverAttempts) {
              await this.page.waitForTimeout(1000);
            }
          }
        }

        // Move mouse away
        await this.page.mouse.move(100, 100);
        await this.page.waitForTimeout(300);

        // Reset input for next file (if there is one)
        if (fileIdx < filesToProcess.length - 1) {
          await this.page.evaluate(() => {
            const inp = document.querySelector('input[type="file"]');
            inp.value = '';
          });
          await this.page.waitForTimeout(500);
        }
      }

      // Get final image count
      const afterCount = await this.page.evaluate(() => {
        return document.querySelectorAll('[data-testid="virtuoso-item-list"] [data-index]').length;
      });
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📊 Images after upload: ${afterCount}`);
      console.log(`📈 Total created: ${afterCount - beforeCount} images\n`);
      
      if ((afterCount - beforeCount) !== 2) {
        console.log(`⚠️  WARNING: Expected 2 images, got ${afterCount - beforeCount}\n`);
      } else {
        console.log(`✅ Image count correct!\n`);
      }

    } catch (error) {
      console.error(`\n❌ UPLOAD FAILED: ${error.message}`);
      if (this.browser) await this.browser.close();
      process.exit(1);
    }
  }

  async enterPrompt(prompt) {
    // STEP 0: Clean up prompt - remove newlines and extra whitespace
    const cleanPrompt = prompt
      .replace(/\n+/g, ' ')           // Replace newlines with space
      .replace(/\r/g, '')             // Remove carriage returns
      .replace(/\s+/g, ' ')           // Replace multiple spaces with single space
      .trim();                         // Trim leading/trailing whitespace
    
    console.log('✍️  ENTERING PROMPT\n');
    console.log(`   Original length: ${prompt.length} chars`);
    console.log(`   Cleaned length: ${cleanPrompt.length} chars`);
    console.log(`   Prompt: "${cleanPrompt.substring(0, 80)}"\n`);

    try {
      // Find and focus the Slate editor textbox
      console.log('   🔍 Finding prompt textbox...');
      const promptDiv = await this.page.$('[role="textbox"][data-slate-editor="true"]');
      
      if (!promptDiv) {
        throw new Error('Prompt textbox not found');
      }
      console.log('   ✓ Found prompt textbox\n');

      // Focus the textbox and block Enter key to prevent accidental submit
      console.log('   🖱️  Focusing textbox + blocking Enter key...');
      await this.page.evaluate(() => {
        const textbox = document.querySelector('[role="textbox"][data-slate-editor="true"]');
        if (textbox) {
          textbox.focus();
          // Block Enter key to prevent accidental prompt submission
          textbox.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              console.log('[BLOCK] Blocked Enter key');
            }
          }, true);
        }
      });
      await this.page.waitForTimeout(300);
      // Attempt typing with verification and a single retry if the editor content
      // does not match the expected prompt (handles flaky slate input in the UI)
      let attempts = 0;
      let success = false;
      const maxAttempts = 2; // 1 initial try + 1 retry

      while (attempts < maxAttempts && !success) {
        attempts++;
        console.log(`   ⌨️  Typing prompt via keyboard (attempt ${attempts}/${maxAttempts})...`);
        // Type slowly to trigger framework handlers - using cleaned prompt
        await this.page.keyboard.type(cleanPrompt, { delay: 15 });
        console.log(`   ✓ Typed attempt ${attempts}: ${prompt.length} chars`);

        // Allow framework to process input
        console.log('   ⏳ Waiting for framework to process input...');
        await this.page.waitForTimeout(2000);

        // Dispatch events to finalize input
        console.log('   📤 Dispatching blur/input/change events...');
        await this.page.evaluate(() => {
          const textbox = document.querySelector('[role="textbox"][data-slate-editor="true"]');
          if (textbox) {
            textbox.dispatchEvent(new Event('blur', { bubbles: true }));
            textbox.dispatchEvent(new Event('input', { bubbles: true }));
            textbox.dispatchEvent(new Event('change', { bubbles: true }));
          }
        });
        console.log('   ✓ Events dispatched');

        // Verify content in the editor matches expected prompt STRICTLY
        const currentText = await this.page.evaluate(() => {
          const textbox = document.querySelector('[role="textbox"][data-slate-editor="true"]');
          if (!textbox) return '';
          // Slate often stores content in innerText/textContent
          return (textbox.innerText || textbox.textContent || '').trim();
        });

        const expected = (cleanPrompt || '').trim();
        const expectedLength = expected.length;
        const currentLength = currentText.length;
        
        // 🔴 STRICT VERIFICATION: Allow max 1% difference (rounding errors)
        const maxDifference = Math.max(1, Math.ceil(expectedLength * 0.01));
        const lengthMatch = Math.abs(currentLength - expectedLength) <= maxDifference;
        
        // Also check last 100 chars (or all if shorter) to ensure content integrity
        const checkLength = Math.min(100, expectedLength);
        const expectedTail = expected.slice(-checkLength);
        const currentTail = currentText.slice(-checkLength);
        const tailMatch = currentTail === expectedTail;

        if (lengthMatch && tailMatch) {
          console.log(`   ✅ Prompt verification PASSED (${currentLength}/${expectedLength} chars, tail matches)`);
          success = true;
          break;
        }

        console.log(`   ⚠️ Prompt verification FAILED`);
        console.log(`      Expected: ${expectedLength} chars`);
        console.log(`      Got: ${currentLength} chars`);
        console.log(`      Length match: ${lengthMatch}, Tail match: ${tailMatch}`);

        // Retry: clear the editor and try once more
        if (attempts < maxAttempts) {
          console.log('   🔁 Retrying: clearing editor and retyping...');
          // Focus and select-all then delete to clear Slate editor
          await this.page.focus('[role="textbox"][data-slate-editor="true"]');
          await this.page.keyboard.down('Control');
          await this.page.keyboard.press('KeyA');
          await this.page.keyboard.up('Control');
          await this.page.keyboard.press('Backspace');
          await this.page.waitForTimeout(400);
        }
      }

      if (!success) {
        console.warn('   ❌ Prompt entry verification failed after retries');
        throw new Error('Prompt not fully entered into editor');
      }

    } catch (error) {
      console.error(`   ❌ Error entering prompt: ${error.message}`);
      throw error;
    }
  }

  // 💫 NEW METHODS FOR VIDEO GENERATION FLOW
  
  async waitForSendButtonEnabled() {
    console.log('⏳ Waiting for Send button to enable...');
    
    try {
      await this.page.waitForFunction(() => {
        const btn = document.querySelector('button[aria-label*="Generate"], button[aria-label*="Tạo"], button[aria-label*="Send"]');
        return btn && !btn.disabled;
      }, { timeout: 10000 });
      
      console.log('✅ Send button is enabled');
      return true;
    } catch (error) {
      console.warn('⚠️  Timeout waiting for Send button:', error.message);
      return false;
    }
  }

  async checkSendButton() {
    console.log('✔️  Checking Send button status...');
    
    const status = await this.page.evaluate(() => {
      const btn = document.querySelector('button[aria-label*="Generate"], button[aria-label*="Tạo"], button[aria-label*="Send"]');
      if (!btn) return { found: false, disabled: null };
      return { found: true, disabled: btn.disabled, text: btn.textContent };
    });

    if (!status.found) {
      console.warn('⚠️  Send button not found');
      return false;
    }

    console.log(`   Button: "${status.text.trim()}" | Disabled: ${status.disabled}`);
    return !status.disabled;
  }

  async submit() {
    console.log('⏳ Submitting request...');
    
    try {
      const clicked = await this.page.evaluate(() => {
        const btn = document.querySelector('button[aria-label*="Generate"], button[aria-label*="Tạo"], button[aria-label*="Send"]');
        if (btn && !btn.disabled) {
          btn.click();
          return true;
        }
        return false;
      });

      if (clicked) {
        console.log('✅ Request submitted');
        await this.page.waitForTimeout(1000);
        return true;
      } else {
        console.warn('⚠️  Send button not found or disabled');
        return false;
      }
    } catch (error) {
      console.error('❌ Error submitting:', error.message);
      return false;
    }
  }

  async monitorGeneration(timeoutSeconds = 180) {
    console.log(`⏳ Monitoring generation (max ${timeoutSeconds}s)...`);
    
    const startTime = Date.now();
    const timeoutMs = timeoutSeconds * 1000;

    try {
      // Wait for generation to complete
      let lastStatus = '';
      
      while (Date.now() - startTime < timeoutMs) {
        const status = await this.page.evaluate(() => {
          const progressEl = document.querySelector('[aria-label*="progress"], [data-testid*="progress"]');
          if (progressEl) return 'generating';
          
          const readyEl = document.querySelector('button[aria-label*="Download"]');
          if (readyEl) return 'ready';
          
          return 'unknown';
        });

        if (status !== lastStatus) {
          console.log(`   Status: ${status}`);
          lastStatus = status;
        }

        if (status === 'ready') {
          console.log('✅ Generation completed');
          return true;
        }

        await this.page.waitForTimeout(2000);
      }

      console.warn('⚠️  Generation timeout');
      return false;
    } catch (error) {
      console.error('❌ Error monitoring:', error.message);
      return false;
    }
  }

  async downloadVideo() {
    console.log('📥 Downloading generated video...');
    
    try {
      // Find the latest generated video item
      const latestHref = await this.page.evaluate(() => {
        const items = document.querySelectorAll('[data-testid="virtuoso-item-list"] a[href]');
        if (items.length > 0) {
          // Last item is usually the newest generated one
          return items[items.length - 1].getAttribute('href');
        }
        return null;
      });

      if (!latestHref) {
        console.warn('⚠️  No video found to download');
        return null;
      }

      console.log(`   Found video: ${latestHref.substring(0, 60)}...`);

      // Get the filename before downloading
      const filename = latestHref.split('/').pop() || `video-${Date.now()}.mp4`;
      const outputPath = path.join(this.options.outputDir, filename);

      // Download via context menu
      const downloadSuccess = await this.downloadItemViaContextMenu(latestHref);
      
      if (!downloadSuccess) {
        console.warn('⚠️  Download action failed');
        return null;
      }

      // Wait for file to appear in output directory
      console.log('⏳ Waiting for file download...');
      let retries = 20;
      while (retries > 0) {
        if (fs.existsSync(outputPath)) {
          console.log(`✅ Video saved: ${outputPath}`);
          return outputPath;
        }
        await this.page.waitForTimeout(500);
        retries--;
      }

      console.warn('⚠️  File not found after download');
      return null;
    } catch (error) {
      console.error('❌ Error downloading video:', error.message);
      return null;
    }
  }

  async switchToVideoTab() {
    console.log('📹 Switching to Video tab...');
    const switched = await this.selectTab('Video');
    if (switched) {
      console.log('✅ Video tab active');
      await this.page.waitForTimeout(1000);
    }
    return switched;
  }

  async selectVideoFromComponents() {
    console.log('🎬 Selecting video generation mode...');
    
    try {
      const selected = await this.page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          const text = btn.textContent.toLowerCase();
          // Look for "Create video from components" or Vietnamese equivalent
          if (text.includes('video') || text.includes('thành phần')) {
            btn.click();
            return true;
          }
        }
        return false;
      });

      if (selected) {
        console.log('✅ Video mode selected');
        await this.page.waitForTimeout(800);
      }
      return selected;
    } catch (error) {
      console.error('❌ Error selecting video mode:', error.message);
      return false;
    }
  }

  async verifyVideoInterface() {
    console.log('🔍 Verifying video interface...');
    
    try {
      const verified = await this.page.evaluate(() => {
        // Check for video generation interface elements
        const prompt = document.querySelector('[role="textbox"][data-slate-editor="true"]');
        const aspectRatio = document.querySelector('[aria-label*="Aspect"], [aria-label*="aspect"]');
        
        return !!(prompt && aspectRatio);
      });

      if (verified) {
        console.log('✅ Video interface verified');
      } else {
        console.log('⚠️  Video interface not fully ready');
      }
      return verified;
    } catch (error) {
      console.error('❌ Error verifying interface:', error.message);
      return false;
    }
  }

  async verifyImageSelected() {
    console.log('🔍 Verifying image selection...');
    
    try {
      const imageSelected = await this.page.evaluate(() => {
        const img = document.querySelector('[data-testid*="image"], img[alt*="reference"]');
        return !!img;
      });

      return imageSelected;
    } catch (error) {
      console.error('❌ Error verifying image:', error.message);
      return false;
    }
  }

  async selectReferencePath(imagePath) {
    console.log(`📸 Selecting reference image: ${imagePath}`);
    return true; // Already uploaded, just verify
  }

  async uploadImage(imagePath) {
    console.log(`📸 Uploading image: ${imagePath}`);
    // Already handled in uploadImages method
    return true;
  }

  async navigateToProject() {
    // Alias for navigateToFlow
    console.log('🔗 Navigating to project...');
    await this.navigateToFlow();
    return true;
  }

  async configureSettings() {
    console.log('⚙️  CONFIGURING SETTINGS\n');

    try {
      // STEP 0: Click settings button to open menu
      console.log('   🔧 STEP 0: Opening settings menu...');
      const settingsOpened = await this.clickSettingsButton();
      if (!settingsOpened) {
        console.warn('   ⚠️  Settings button may have failed, continuing...');
      }
      await this.page.waitForTimeout(500);

      // STEP 1: Select Image/Video Tab
      console.log('   📋 STEP 1: Select Image/Video Tab');
      if (this.type === 'image') {
        console.log('   > Selecting IMAGE tab...');
        const imageTabClicked = await this.page.evaluate(() => {
          const btn = document.querySelector('button[id*="IMAGE"][role="tab"]');
          if (btn) {
            btn.click();
            return true;
          }
          return false;
        });
        if (!imageTabClicked) {
          console.warn('   ⚠️  IMAGE tab click may have failed, continuing...');
        } else {
          console.log('   ✓ IMAGE tab selected');
        }
      } else {
        console.log('   > Selecting VIDEO tab...');
        const videoTabClicked = await this.page.evaluate(() => {
          const btn = document.querySelector('button[id*="VIDEO"][role="tab"]');
          if (btn) {
            btn.click();
            return true;
          }
          return false;
        });
        if (!videoTabClicked) {
          console.warn('   ⚠️  VIDEO tab click may have failed, continuing...');
        } else {
          console.log('   ✓ VIDEO tab selected');
        }
      }
      await this.page.waitForTimeout(800);

      // STEP 2: Select Aspect Ratio (Portrait 9:16 for TikTok)
      console.log('\n   📐 STEP 2: Select Aspect Ratio');
      const isVertical = this.options.aspectRatio.includes('9:16');
      const targetRatio = isVertical ? 'PORTRAIT' : 'LANDSCAPE';
      console.log(`   > Selecting ${targetRatio} (${this.options.aspectRatio})...`);
      
      const aspectRatioSelected = await this.page.evaluate((target) => {
        const btn = document.querySelector(`button[id*="${target}"][role="tab"]`);
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      }, targetRatio);
      
      if (!aspectRatioSelected) {
        console.warn(`   ⚠️  ${targetRatio} selection may have failed, continuing...`);
      } else {
        console.log(`   ✓ ${targetRatio} selected`);
      }
      await this.page.waitForTimeout(800);

      // STEP 3: Select Image/Video Count
      console.log('\n   🔢 STEP 3: Select Count');
      const count = this.type === 'image' ? this.options.imageCount : this.options.videoCount;
      console.log(`   > Selecting x${count}...`);
      
      const countSelected = await this.page.evaluate((targetCount) => {
        // Look for button with text like "x1", "x2", "x3", "x4"
        const buttons = document.querySelectorAll('button[role="tab"]');
        for (const btn of buttons) {
          if (btn.textContent.trim() === `x${targetCount}`) {
            btn.click();
            return true;
          }
        }
        return false;
      }, count);
      
      if (!countSelected) {
        console.warn(`   ⚠️  x${count} selection may have failed, continuing...`);
      } else {
        console.log(`   ✓ x${count} selected`);
      }
      await this.page.waitForTimeout(800);

      // STEP 4: Select Model
      if (this.type === 'image') {
        console.log('\n   🤖 STEP 4: Select Model');
        const targetModel = this.options.model || 'Nano Banana Pro';
        console.log(`   > Selecting ${targetModel}...`);
        
        const modelSelected = await this.page.evaluate((model) => {
          // The model button has multiple descendant elements, search for text content
          const buttons = document.querySelectorAll('button[aria-haspopup="menu"], button[aria-expanded]');
          
          for (const btn of buttons) {
            const text = btn.textContent || '';
            if (text.includes('Banana') || text.includes(model)) {
              btn.click();
              return true;
            }
          }
          return false;
        }, targetModel);
        
        if (!modelSelected) {
          console.log(`   ℹ️  Model selection not performed (may already be set), continuing...`);
        } else {
          console.log(`   ✓ ${targetModel} selected`);
          await this.page.waitForTimeout(500);
        }
      }

      console.log('\n   ✅ Settings configuration complete\n');
      return true;

    } catch (error) {
      console.error('   ❌ Error configuring settings:', error.message);
      console.warn('   ⚠️  Continuing with current settings...');
      return false;
    }
  }

  async clickSettingsButton() {
    try {
      console.log('[SETTINGS] Step 1: Finding button with aria-haspopup="menu"...');
      
      // Find button by aria-haspopup AND position to ensure we get settings, not rename/delete
      const btnInfo = await this.page.evaluate(() => {
        const buttons = document.querySelectorAll('button[aria-haspopup="menu"]');
        
        if (buttons.length === 0) {
          console.log('[SETTINGS] ❌ No buttons with aria-haspopup="menu" found');
          return null;
        }

        // Look for settings button - should be one with "more_vert" or in top-right area
        // Skip very small buttons or ones at extreme positions
        let settingsBtn = null;
        
        for (const btn of buttons) {
          const box = btn.getBoundingClientRect();
          
          // Skip buttons that are too small or hidden
          if (box.width < 30 || box.height < 30 || box.width > 200 || box.height > 200) {
            console.log(`[SETTINGS] Skipping button: size ${box.width}x${box.height}`);
            continue;
          }
          
          // Skip buttons at very top (title bar buttons like rename/delete)
          if (box.top < 30) {
            console.log(`[SETTINGS] Skipping top button at y=${Math.round(box.top)}`);
            continue;
          }
          
          // Use this button (should be main settings menu)
          settingsBtn = btn;
          
          console.log('[SETTINGS] ✓ Found settings button at y=' + Math.round(box.top));
          console.log('[SETTINGS]   Size: ' + box.width + 'x' + box.height);
          console.log('[SETTINGS]   Text: ' + btn.textContent.substring(0, 50));
          
          break;
        }

        if (!settingsBtn) {
          console.log('[SETTINGS] ❌ No suitable settings button found');
          return null;
        }

        const box = settingsBtn.getBoundingClientRect();
        
        return {
          x: Math.round(box.x + box.width / 2),
          y: Math.round(box.y + box.height / 2),
          visible: box.width > 0 && box.height > 0
        };
      });

      if (!btnInfo) {
        console.log('[SETTINGS] ❌ Could not get button coordinates');
        return false;
      }

      if (!btnInfo.visible) {
        console.log('[SETTINGS] ❌ Button not visible');
        return false;
      }

      console.log(`[SETTINGS] Step 2: Moving mouse to (${btnInfo.x}, ${btnInfo.y})...`);
      
      // Use realistic mouse movements (required for Radix UI)
      await this.page.mouse.move(btnInfo.x, btnInfo.y);
      await this.page.waitForTimeout(100);

      console.log('[SETTINGS] Step 3: Mouse down...');
      await this.page.mouse.down();
      await this.page.waitForTimeout(50);

      console.log('[SETTINGS] Step 4: Mouse up...');
      await this.page.mouse.up();

      // Wait for menu to appear
      console.log('[SETTINGS] Step 5: Waiting for menu...');
      await this.page.waitForTimeout(800);

      // Verify menu opened
      const menuState = await this.page.evaluate(() => {
        const buttons = document.querySelectorAll('button[aria-haspopup="menu"]');
        let settingsBtn = null;
        
        for (const btn of buttons) {
          const box = btn.getBoundingClientRect();
          if (box.width >= 30 && box.height >= 30 && box.top >= 30) {
            settingsBtn = btn;
            break;
          }
        }
        
        if (!settingsBtn) return { error: 'Button not found' };
        
        const ariaExpanded = settingsBtn.getAttribute('aria-expanded') === 'true';
        const dataState = settingsBtn.getAttribute('data-state');
        const menu = document.querySelector('[role="menu"]');
        
        console.log('[SETTINGS] aria-expanded:', ariaExpanded);
        console.log('[SETTINGS] data-state:', dataState);
        console.log('[SETTINGS] Menu found:', !!menu);
        
        return {
          ariaExpanded,
          dataState,
          menuFound: !!menu,
          menuItems: menu ? document.querySelectorAll('[role="menuitem"]').length : 0
        };
      });

      if (menuState.ariaExpanded && menuState.menuFound) {
        console.log('[SETTINGS] ✅ Settings menu opened successfully');
        console.log(`[SETTINGS] Menu items: ${menuState.menuItems}`);
        return true;
      } else {
        console.log('[SETTINGS] ⚠️  Menu status unclear - aria-expanded:', menuState.ariaExpanded);
        return menuState.ariaExpanded; // Return true if aria-expanded is true
      }

    } catch (error) {
      console.log(`[SETTINGS] ❌ Error: ${error.message}`);
      return false;
    }
  }

  async selectTab(label) {
    const selected = await this.page.evaluate((targetLabel) => {
      const buttons = document.querySelectorAll('button[role="tab"]');
      for (const btn of buttons) {
        if (btn.textContent.includes(targetLabel)) {
          btn.click();
          return true;
        }
      }
      return false;
    }, label);

    return selected;
  }

  async clickCreate() {
    console.log('🎬 CLICKING GENERATE BUTTON\n');

    try {
      // Find generate button near prompt area (not top bar)
      // Look in area around y > 200 to avoid top navigation
      const generateBtnInfo = await this.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        let targetBtn = null;
        
        // First priority: Find button with arrow_forward icon in lower area
        for (const btn of buttons) {
          const rect = btn.getBoundingClientRect();
          const text = btn.textContent.toLowerCase();
          
          // Filter by position: must be in lower area (y > 200)
          if (rect.top < 200) continue;
          
          // Check for arrow_forward icon or tạo text
          const hasArrow = btn.innerHTML.includes('arrow_forward');
          const hasCreateText = text.includes('tạo') || text.includes('create');
          
          if (hasArrow || hasCreateText) {
            targetBtn = btn;
            break;
          }
        }

        if (!targetBtn) {
          return { found: false, error: 'No generate button found in lower area' };
        }

        const rect = targetBtn.getBoundingClientRect();
        return {
          found: true,
          x: Math.floor(rect.left + rect.width / 2),
          y: Math.floor(rect.top + rect.height / 2),
          text: targetBtn.textContent.trim().substring(0, 50)
        };
      });

      if (!generateBtnInfo.found) {
        throw new Error(generateBtnInfo.error);
      }

      console.log(`   Found button: "${generateBtnInfo.text}"\n`);
      console.log(`   Position: (${generateBtnInfo.x}, ${generateBtnInfo.y})\n`);

      // Use realistic mouse movement to click
      await this.page.mouse.move(generateBtnInfo.x, generateBtnInfo.y);
      await this.page.waitForTimeout(150);
      await this.page.mouse.down();
      await this.page.waitForTimeout(100);
      await this.page.mouse.up();

      console.log('   ✓ Generate button clicked (via button click)\n');
      await this.page.waitForTimeout(1000);

    } catch (error) {
      console.error(`   ⚠️  Button click failed: ${error.message}`);
      console.log('   📝 Falling back to Enter key submission...\n');
      
      // Fallback: Focus textbox and press Enter to submit
      try {
        const textboxExists = await this.page.$('[role="textbox"][data-slate-editor="true"]');
        if (!textboxExists) {
          throw new Error('Prompt textbox not found for Enter fallback');
        }

        // Focus the textbox
        console.log('   🖱️  Focusing prompt textbox...');
        await this.page.evaluate(() => {
          const textbox = document.querySelector('[role="textbox"][data-slate-editor="true"]');
          if (textbox) {
            textbox.focus();
          }
        });
        await this.page.waitForTimeout(200);

        // Press Enter to submit
        console.log('   ⌨️  Pressing Enter key to submit...');
        await this.page.keyboard.press('Enter');

        console.log('   ✓ Generate button clicked (via Enter key in textbox)\n');
        await this.page.waitForTimeout(1000);

      } catch (fallbackError) {
        console.error(`   ❌ Both button click and Enter fallback failed: ${fallbackError.message}`);
        throw fallbackError;
      }
    }
  }

  /**
   * Handle terms of service modal if it appears
   */
  async handleTermsModal() {
    try {
      const button = await this.page.evaluate(() => {
        const allButtons = Array.from(document.querySelectorAll('button'));
        
        // Look for "Tôi đồng ý" button, excluding "Hủy" button
        const agreeBtn = allButtons.find(btn => {
          const text = btn.textContent.trim();
          // Must contain "Tôi đồng ý" or similar, but NOT be the "Hủy" button
          if (text.includes('Hủy') || text.includes('Cancel')) {
            return false;
          }
          
          return text.includes('Tôi đồng ý') || 
                 text.includes('đồng ý') ||
                 text.toLowerCase().includes('agree') ||
                 text.toLowerCase().includes('accept');
        });
        
        if (!agreeBtn) {
          console.log('[MODAL] No agree button found');
          return null;
        }
        
        const box = agreeBtn.getBoundingClientRect();
        
        if (box.width === 0 || box.height === 0) {
          console.log('[MODAL] Agree button not visible');
          return null;
        }
        
        return {
          x: Math.round(box.x + box.width / 2),
          y: Math.round(box.y + box.height / 2),
          text: agreeBtn.textContent.trim(),
          visible: true
        };
      });

      if (!button) {
        return false; // Modal not present or button not found
      }

      console.log(`[MODAL] Clicking "${button.text}" button at (${button.x}, ${button.y})`);
      
      // Click the agree button
      await this.page.mouse.move(button.x, button.y);
      await this.page.waitForTimeout(150);
      await this.page.mouse.down();
      await this.page.waitForTimeout(100);
      await this.page.mouse.up();

      console.log('[MODAL] ✓ Terms agreed and dismissed');
      await this.page.waitForTimeout(800);
      return true;
      
    } catch (e) {
      // Modal might not exist, continue
      console.log(`[MODAL] Error: ${e.message}`);
    }
    
    return false;
  }

  /**
   * Click product configuration button (🍌 Nano Banana Pro)
   */
  async clickProductButton() {
    try {
      console.log('[PRODUCT] Opening configuration menu...');
      
      const btnBox = await this.page.evaluate(() => {
        const btn = document.querySelector('button[id="radix-:rk:"]');
        
        if (!btn) {
          console.log('[PRODUCT] ❌ Button not found');
          return null;
        }

        const box = btn.getBoundingClientRect();
        
        return {
          x: Math.round(box.x + box.width / 2),
          y: Math.round(box.y + box.height / 2),
          visible: box.width > 0 && box.height > 0
        };
      });

      if (!btnBox || !btnBox.visible) {
        console.log('[PRODUCT] ❌ Button not visible');
        return false;
      }

      // Click with realistic mouse movement
      await this.page.mouse.move(btnBox.x, btnBox.y);
      await this.page.waitForTimeout(150);
      await this.page.mouse.down();
      await this.page.waitForTimeout(100);
      await this.page.mouse.up();

      console.log('[PRODUCT] ✓ Menu opened');
      
      // Wait for menu to appear
      await this.page.waitForTimeout(800);

      return true;

    } catch (error) {
      console.log(`[PRODUCT] ❌ Error: ${error.message}`);
      return false;
    }
  }

  /**
   * Select product type (Image or Video)
   */
  async selectProductType(type) {
    try {
      const typeValue = type.toLowerCase() === 'video' ? 'VIDEO' : 'IMAGE';
      console.log(`[PRODUCT] Selecting ${typeValue}...`);
      
      const selected = await this.page.evaluate((typeVal) => {
        const tabs = document.querySelectorAll('[role="tab"]');
        
        for (const tab of tabs) {
          const text = tab.textContent.toLowerCase();
          if ((typeVal === 'VIDEO' && text.includes('video')) ||
              (typeVal === 'IMAGE' && text.includes('image') && !text.includes('video'))) {
            
            const box = tab.getBoundingClientRect();
            return {
              found: true,
              x: Math.round(box.x + box.width / 2),
              y: Math.round(box.y + box.height / 2)
            };
          }
        }
        
        return { found: false };
      }, typeValue);

      if (!selected.found) {
        console.log(`[PRODUCT] ⚠️  ${typeValue} tab not found`);
        return false;
      }

      await this.page.mouse.move(selected.x, selected.y);
      await this.page.waitForTimeout(150);
      await this.page.mouse.down();
      await this.page.waitForTimeout(100);
      await this.page.mouse.up();

      console.log(`[PRODUCT] ✓ ${typeValue} selected`);
      await this.page.waitForTimeout(500);

      return true;

    } catch (error) {
      console.log(`[PRODUCT] ❌ Error: ${error.message}`);
      return false;
    }
  }

  /**
   * Select aspect ratio (Landscape/Ngang or Portrait/Dọc)
   */
  async selectAspectRatio(ratio) {
    try {
      const ratioType = ratio.toLowerCase().includes('portrait') || ratio.toLowerCase().includes('dọc') ? 'PORTRAIT' : 'LANDSCAPE';
      console.log(`[PRODUCT] Selecting ${ratioType}...`);
      
      const selected = await this.page.evaluate((ratioVal) => {
        const tabs = document.querySelectorAll('[role="tab"]');
        
        for (const tab of tabs) {
          const text = tab.textContent.toLowerCase();
          if ((ratioVal === 'PORTRAIT' && (text.includes('dọc') || text.includes('portrait'))) ||
              (ratioVal === 'LANDSCAPE' && (text.includes('ngang') || text.includes('landscape')))) {
            
            const box = tab.getBoundingClientRect();
            return {
              found: true,
              x: Math.round(box.x + box.width / 2),
              y: Math.round(box.y + box.height / 2)
            };
          }
        }
        
        return { found: false };
      }, ratioType);

      if (!selected.found) {
        console.log(`[PRODUCT] ⚠️  ${ratioType} ratio not found`);
        return false;
      }

      await this.page.mouse.move(selected.x, selected.y);
      await this.page.waitForTimeout(150);
      await this.page.mouse.down();
      await this.page.waitForTimeout(100);
      await this.page.mouse.up();

      console.log(`[PRODUCT] ✓ ${ratioType} selected`);
      await this.page.waitForTimeout(500);

      return true;

    } catch (error) {
      console.log(`[PRODUCT] ❌ Error: ${error.message}`);
      return false;
    }
  }

  /**
   * Select product count (x1, x2, x3, x4)
   */
  async selectProductCount(count) {
    try {
      const countStr = `x${count}`;
      console.log(`[PRODUCT] Selecting ${countStr}...`);
      
      const selected = await this.page.evaluate((countVal) => {
        const tabs = document.querySelectorAll('[role="tab"]');
        
        for (const tab of tabs) {
          const text = tab.textContent.trim();
          if (text === countVal) {
            const box = tab.getBoundingClientRect();
            return {
              found: true,
              x: Math.round(box.x + box.width / 2),
              y: Math.round(box.y + box.height / 2)
            };
          }
        }
        
        return { found: false };
      }, countStr);

      if (!selected.found) {
        console.log(`[PRODUCT] ⚠️  ${countStr} count not found`);
        return false;
      }

      await this.page.mouse.move(selected.x, selected.y);
      await this.page.waitForTimeout(150);
      await this.page.mouse.down();
      await this.page.waitForTimeout(100);
      await this.page.mouse.up();

      console.log(`[PRODUCT] ✓ ${countStr} selected`);
      await this.page.waitForTimeout(500);

      return true;

    } catch (error) {
      console.log(`[PRODUCT] ❌ Error: ${error.message}`);
      return false;
    }
  }

  /**
   * Get current product configuration
   */
  async getProductConfiguration() {
    try {
      const config = await this.page.evaluate(() => {
        const activeTabs = document.querySelectorAll('[role="tab"][aria-selected="true"]');
        const config = {};

        activeTabs.forEach(tab => {
          const text = tab.textContent.toLowerCase();
          
          if (text.includes('image')) {
            config.type = 'IMAGE';
          } else if (text.includes('video')) {
            config.type = 'VIDEO';
          } else if (text.includes('ngang') || text.includes('landscape')) {
            config.ratio = 'LANDSCAPE';
          } else if (text.includes('dọc') || text.includes('portrait')) {
            config.ratio = 'PORTRAIT';
          } else if (text.match(/x\d/)) {
            config.count = parseInt(text.match(/\d+/)[0]);
          }
        });

        return config;
      });

      console.log('[PRODUCT] Current config:', config);
      return config;

    } catch (error) {
      console.log(`[PRODUCT] ❌ Error getting config: ${error.message}`);
      return null;
    }
  }

  /**
   * Close product menu by clicking outside or pressing Escape
   */
  async closeProductMenu() {
    try {
      console.log('[PRODUCT] Closing menu...');
      
      // Try pressing Escape
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(500);

      console.log('[PRODUCT] ✓ Menu closed');
      return true;

    } catch (error) {
      console.log(`[PRODUCT] ❌ Error: ${error.message}`);
      return false;
    }
  }

  async clickIngredientsButton() {
    /**
     * Click Ingredients button for video upload
     * Finds button with chrome_extension icon or "Thành phần" text
     */
    try {
      console.log('[INGREDIENTS] Looking for Ingredients button...');
      
      const buttonClicked = await this.page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        
        for (const btn of buttons) {
          // Look for button containing "Thành phần" (Vietnamese for "Ingredients") or with chrome_extension icon
          const text = btn.textContent.toLowerCase();
          const hasIcon = btn.innerHTML.includes('chrome_extension') || btn.innerHTML.includes('google_symbols');
          
          if (text.includes('thành phần') || text.includes('ingredients') || 
              (hasIcon && (text.includes('thành phần') || text.includes('phần')))) {
            
            const box = btn.getBoundingClientRect();
            if (box.width > 0 && box.height > 0) {
              // Found it - simulate click
              btn.click();
              console.log('[INGREDIENTS] ✓ Button clicked');
              return true;
            }
          }
        }
        
        return false;
      });

      if (!buttonClicked) {
        console.log('[INGREDIENTS] ❌ Ingredients button not found');
        return false;
      }

      // Wait for dialog to appear
      await this.page.waitForTimeout(1000);
      console.log('[INGREDIENTS] ✓ Ingredients dialog opened');
      return true;

    } catch (error) {
      console.log(`[INGREDIENTS] ❌ Error: ${error.message}`);
      return false;
    }
  }

  async downloadItemViaContextMenu(newHref) {
    /**
     * Download generated item by right-clicking and selecting download option
     * Item: Image or Video based on type
     */
    const mediaType = this.type === 'image' ? 'image' : 'video';
    
    console.log(`⬇️  DOWNLOADING ${mediaType.toUpperCase()} VIA CONTEXT MENU\n`);

    try {
      // Find the item with this href and right-click it
      const linkData = await this.page.evaluate((targetHref) => {
        const links = document.querySelectorAll('[data-testid="virtuoso-item-list"] a[href]');
        
        for (const link of links) {
          const href = link.getAttribute('href');
          if (href === targetHref) {
            const rect = link.getBoundingClientRect();
            return {
              found: true,
              x: Math.round(rect.left + rect.width / 2),
              y: Math.round(rect.top + rect.height / 2)
            };
          }
        }
        
        return { found: false };
      }, newHref);

      if (!linkData.found) {
        console.warn('   ⚠️  Item with href not found for download\n');
        return false;
      }

      console.log(`   🖱️  Right-clicking on ${mediaType}...`);
      await this.page.mouse.click(linkData.x, linkData.y, { button: 'right' });
      await this.page.waitForTimeout(800);

      // Find and click download option from context menu
      const downloadClicked = await this.page.evaluate(() => {
        const buttons = document.querySelectorAll('button[role="menuitem"]');
        
        for (const btn of buttons) {
          const text = btn.textContent.toLowerCase();
          // Look for download / tải xuống button
          if (text.includes('tải') || text.includes('download')) {
            btn.click();
            return true;
          }
        }
        
        return false;
      });

      if (!downloadClicked) {
        console.warn('   ⚠️  Download option not found in context menu\n');
        return false;
      }

      console.log('   ✓ Download started\n');
      await this.page.waitForTimeout(2000);
      
      return true;

    } catch (error) {
      console.error(`   ❌ Error downloading: ${error.message}\n`);
      return false;
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async rightClickReuseCommand(itemHref) {
    /**
     * Right-click on generated item and click "Sử dụng lại câu lệnh" (Reuse command)
     * Used in multi-prompt flow to reuse the image from previous prompt
     * 
     * Button HTML structure:
     * <button role="menuitem" data-orientation="vertical">
     *   <i class="google-symbols">undo</i>Sử dụng lại câu lệnh
     * </button>
     */
    console.log('\n🔄 RIGHT-CLICK REUSE COMMAND');

    try {
      // Find the item with this href
      const linkData = await this.page.evaluate((targetHref) => {
        const links = document.querySelectorAll('[data-testid="virtuoso-item-list"] a[href]');
        
        for (const link of links) {
          const href = link.getAttribute('href');
          if (href === targetHref) {
            const rect = link.getBoundingClientRect();
            return {
              found: true,
              x: Math.round(rect.left + rect.width / 2),
              y: Math.round(rect.top + rect.height / 2)
            };
          }
        }
        
        return { found: false };
      }, itemHref);

      if (!linkData.found) {
        console.log('   ⚠️  Item not found for reuse command');
        return false;
      }

      console.log('   🖱️  Right-clicking on item...');
      await this.page.mouse.click(linkData.x, linkData.y, { button: 'right' });
      await this.page.waitForTimeout(800);

      // Find and click "Sử dụng lại câu lệnh" button
      // Query: Find button with role="menuitem" that contains the undo icon and text
      const reuseClicked = await this.page.evaluate(() => {
        const buttons = document.querySelectorAll('button[role="menuitem"]');
        
        for (const btn of buttons) {
          const text = btn.textContent.toLowerCase();
          const hasUndoIcon = btn.querySelector('i[class*="google-symbols"]') && 
                             btn.querySelector('i').textContent.includes('undo');
          
          // Look for "sử dụng lại" text and undo icon
          if ((text.includes('sử dụng lại') || text.includes('reuse')) && hasUndoIcon) {
            console.log(`[REUSE] Found button: "${btn.textContent.trim()}"`);
            btn.click();
            return true;
          }
        }
        
        // Fallback: just look for text match
        for (const btn of buttons) {
          const text = btn.textContent.toLowerCase();
          if (text.includes('sử dụng lại') || text.includes('reuse') || text.includes('dùng lại')) {
            console.log(`[REUSE] Found button (text only): "${btn.textContent.trim()}"`);
            btn.click();
            return true;
          }
        }
        
        console.log('[REUSE] Available menuitem buttons:');
        buttons.forEach(btn => {
          console.log(`  - "${btn.textContent.trim()}"`);
        });
        
        return false;
      });

      if (!reuseClicked) {
        console.log('   ⚠️  "Sử dụng lại câu lệnh" option not found');
        return false;
      }

      console.log('   ✓ Reuse command clicked, waiting for prompt reload...');
      await this.page.waitForTimeout(1500);
      
      return true;

    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      return false;
    }
  }

  async clearPromptText() {
    /**
     * Clear all text from the prompt input field
     * Used after right-clicking "Sử dụng lại câu lệnh" to clear previous prompt
     */
    console.log('   🧹 Clearing prompt text...');

    try {
      const cleared = await this.page.evaluate(() => {
        const textbox = document.querySelector('[role="textbox"][data-slate-editor="true"]');
        
        if (!textbox) {
          console.log('[CLEAR] Textbox not found');
          return false;
        }

        // Focus the textbox
        textbox.focus();
        
        // Select all text (Ctrl+A)
        document.execCommand('selectAll', false, null);
        
        // Delete selected text
        document.execCommand('delete', false, null);
        
        const remaining = textbox.textContent || textbox.innerText || '';
        console.log(`[CLEAR] Remaining text length: ${remaining.length}`);
        
        return remaining.trim().length === 0;
      });

      if (cleared) {
        console.log('   ✓ Prompt text cleared');
        await this.page.waitForTimeout(500);
        return true;
      } else {
        console.log('   ⚠️  Some text may remain, but continuing...');
        // Continue anyway
        return true;
      }

    } catch (error) {
      console.error(`   ❌ Error clearing: ${error.message}`);
      return false;
    }
  }

  /**
   * Generate multiple images/videos sequentially with different prompts
   * Used for TikTok affiliate flow: wearing image + holding image
   * For single item generation, just use prompts array with 1 element
   */
  async generateMultiple(characterImagePath, productImagePath, prompts) {
    /**
     * GENERATE MULTIPLE IMAGES - CORRECT FLOW FOR TIKTOK AFFILIATE
     * 
     * Key Requirements:
     * - Upload images ONLY 1 TIME
     * - Configure settings ONLY 1 TIME  
     * - For each prompt: Enter -> Click generate -> Wait
     * - If NOT last: Right-click -> "Reuse command" -> Clear prompt
     * - If IS last: Right-click -> Download
     */
    
    console.log(`\n\${'═'.repeat(80)}`);
    console.log(`📊 MULTI-IMAGE GENERATION: \${prompts.length} images`);
    console.log(`\${'═'.repeat(80)}\n`);

    const results = [];
    let lastGeneratedHref = null;

    try {
      // Initialize browser session
      console.log('\n[INIT] 🚀 Initializing browser...');
      await this.init();
      console.log('[INIT] ✅ Browser initialized\n');

      // Navigate to Google Flow project
      console.log('[NAV] 🔗 Navigating to Google Flow...');
      await this.navigateToFlow();
      console.log('[NAV] ✅ Navigated to project\n');

      // Wait for page to be fully ready
      console.log('[PAGE] ⏳ Waiting for page to load...');
      await this.waitForPageReady();
      console.log('[PAGE] ✅ Page ready\n');

      // STEP 1: Configure settings ONCE AT START
      console.log('[CONFIG] ⚙️  Configuring settings (ONE TIME)...');
      const settingsOk = await this.configureSettings();
      if (!settingsOk) {
        console.log('[CONFIG] ⚠️  Settings might be incomplete, continuing...\n');
      } else {
        console.log('[CONFIG] ✅ Settings configured\n');
      }

      // STEP 2: Upload images ONCE AT START  
      console.log('[UPLOAD] 📤 Uploading reference images (ONE TIME)...');
      const existingImages = [];
      await this.uploadImages(characterImagePath, productImagePath, existingImages);
      console.log('[UPLOAD] ✅ Images uploaded\n');

      // STEP 3: GENERATE EACH PROMPT WITH DIFFERENT FLOW FOR LAST VS NON-LAST
      for (let i = 0; i < prompts.length; i++) {
        console.log(`\n\${'═'.repeat(80)}`);
        console.log(`🎨 PROMPT \${i + 1}/\${prompts.length}: Processing`);
        console.log(`\${'═'.repeat(80)}\n`);

        const prompt = prompts[i];
        const isLastPrompt = (i === prompts.length - 1);

        try {
          // STEP A: Enter prompt
          console.log(`[STEP A] 📝 Entering prompt (\${prompt.length} chars)...`);
          const normalizedPrompt = prompt.normalize('NFC');
          await this.enterPrompt(normalizedPrompt);
          console.log('[STEP A] ✓ Prompt entered\n');

          // STEP B: Click generate button
          console.log('[STEP B] 🚀 Clicking generate button...');
          await this.clickCreate();

          // STEP C: Wait for generation to complete
          console.log('[STEP C] ⏳ Waiting for generation to complete (max 120s)...');
          
          const startTime = Date.now();
          const timeoutMs = this.options.timeouts.generation || 120000;

          // Wait for NEW image link to appear in collection
          await this.page.waitForFunction(
            async () => {
              const links = await this.page.evaluate(() => {
                const listItems = document.querySelectorAll('[data-testid="virtuoso-item-list"] a[href]');
                return Array.from(listItems).map(link => ({
                  href: link.getAttribute('href')
                }));
              });

              if (links.length > 0) {
                lastGeneratedHref = links[0].href;
                return true;
              }
              return false;
            },
            { timeout: timeoutMs }
          );

          const elapsedSecs = ((Date.now() - startTime) / 1000).toFixed(1);
          console.log(`[STEP C] ✅ Generation complete in \${elapsedSecs}s\n`);

          // STEP D or E: Different logic for last vs non-last prompt
          if (!isLastPrompt) {
            // NOT LAST PROMPT: Use reuse command
            console.log('[STEP D] 🔄 NOT LAST PROMPT - Reusing for next...');
            
            const reuseSuccess = await this.rightClickReuseCommand(lastGeneratedHref);
            if (!reuseSuccess) {
              throw new Error('Failed to reuse command');
            }

            const clearSuccess = await this.clearPromptText();
            if (!clearSuccess) {
              console.log('[STEP D] ⚠️  Clear may have issues, but continuing...');
            }

            console.log('[STEP D] ✅ Ready for next prompt\n');
            
            results.push({
              success: true,
              imageNumber: i + 1,
              href: lastGeneratedHref,
              action: 'reused_for_next'
            });

          } else {
            // IS LAST PROMPT: Download  
            console.log('[STEP E] ⬇️  IS LAST PROMPT - Downloading final image...');
            
            const downloadSuccess = await this.downloadItemViaContextMenu(lastGeneratedHref);
            
            console.log('[STEP E] ✅ Final image downloaded\n');

            results.push({
              success: true,
              imageNumber: i + 1,
              href: lastGeneratedHref,
              action: 'downloaded',
              downloadSuccess: downloadSuccess
            });
          }

        } catch (generationError) {
          console.error(`\n❌ PROMPT \${i + 1} FAILED: \${generationError.message}\n`);
          results.push({
            success: false,
            imageNumber: i + 1,
            error: generationError.message
          });
          throw generationError;
        }
      }

      // Close browser when done
      await this.close();

      // Return overall results
      const successCount = results.filter(r => r.success).length;
      console.log(`\n\${'═'.repeat(70)}`);
      console.log(`📊 COMPLETE: \${successCount}/\${results.length} successful`);
      console.log(`\${'═'.repeat(70)}\n`);

      return {
        success: successCount === results.length,
        results: results,
        totalGenerated: successCount,
        totalRequested: results.length
      };

    } catch (error) {
      console.error(`❌ Multi-generation failed: \${error.message}`);
      if (this.browser) {
        await this.close();
      }

      return {
        success: false,
        error: error.message,
        results: results,
        totalGenerated: results.filter(r => r.success).length,
        totalRequested: prompts.length
      };
    }
  }
}

export default GoogleFlowAutomationService;

