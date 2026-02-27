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

    // Ensure outputDir is an absolute path for browser downloads
    const outputDirAbsolute = path.resolve(this.options.outputDir);
    
    if (!fs.existsSync(outputDirAbsolute)) {
      fs.mkdirSync(outputDirAbsolute, { recursive: true });
    }

    console.log(`   📁 Output directory: ${outputDirAbsolute}\n`);

    const headlessMode = this.options.headless === true ? 'new' : this.options.headless;
    this.browser = await puppeteer.launch({
      headless: headlessMode,
      args: [
        '--no-sandbox', 
        '--disable-dev-shm-usage'
      ]
    });

    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1280, height: 720 });

    // Store absolute path for later use
    this.options.outputDir = outputDirAbsolute;
    
    // Store Windows user Downloads folder path for file monitoring
    // Chrome will save downloads to user's Downloads folder by default
    const userDownloadsDir = process.platform === 'win32' 
      ? path.join(process.env.USERPROFILE || '', 'Downloads')
      : path.join(process.env.HOME || '', 'Downloads');
    
    this.options.userDownloadsDir = userDownloadsDir;
    console.log(`   📥 Monitoring downloads in: ${userDownloadsDir}`);

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
    const maxAttempts = 15;

    while (!pageReady && attempts < maxAttempts) {
      attempts++;
      const elements = await this.page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        const visibleButtons = Array.from(buttons).filter(btn => {
          const style = window.getComputedStyle(btn);
          return style.display !== 'none' && style.visibility !== 'hidden' && btn.offsetHeight > 0;
        });
        const hasFileInput = document.querySelector('input[type="file"]') !== null;
        const prompts = document.querySelectorAll('[contenteditable="true"]');
        
        // Check for essential elements
        const hasMainContent = document.querySelector('[data-testid="virtuoso-item-list"]') !== null ||
                              document.querySelector('.grid') !== null ||
                              document.querySelector('[role="main"]') !== null;
        
        return { 
          buttons: buttons.length, 
          visible: visibleButtons.length, 
          input: hasFileInput, 
          prompts: prompts.length,
          mainContent: hasMainContent
        };
      });

      // More flexible readiness check: Either satisfy original strict requirement OR new flexible requirement
      const strictReady = elements.buttons > 10 && elements.visible > 10 && elements.input && elements.prompts > 0;
      const flexibleReady = elements.visible > 5 && elements.mainContent;
      pageReady = strictReady || flexibleReady;

      if (!pageReady) {
        console.log(`   Attempt ${attempts}: buttons=${elements.buttons}, visible=${elements.visible}, input=${elements.input}, prompts=${elements.prompts}, content=${elements.mainContent}`);
        console.log(`   ⏳ Not ready yet, waiting 1000ms...`);
        await this.page.waitForTimeout(1000);
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

            // Right-click on the link using mouse movement method (Method 2)
            console.log(`   🖱️  Right-clicking on image...`);
            await this.page.mouse.down({ button: 'right' });
            await this.page.waitForTimeout(50);
            await this.page.mouse.up({ button: 'right' });
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
    // Validate input prompt
    if (!prompt || typeof prompt !== 'string') {
      throw new Error(`enterPrompt: Invalid prompt - expected string, got ${typeof prompt}`);
    }
    
    // STEP 0: Clean up prompt - remove newlines and extra whitespace
    const cleanPrompt = prompt
      .replace(/\n+/g, ' ')           // Replace newlines with space
      .replace(/\r/g, '')             // Remove carriage returns
      .replace(/\s+/g, ' ')           // Replace multiple spaces with single space
      .trim();                         // Trim leading/trailing whitespace
    
    console.log('✍️  ENTERING PROMPT\n');
    console.log(`   Original length: ${(prompt || '').length} chars`);
    console.log(`   Cleaned length: ${(cleanPrompt || '').length} chars`);
    console.log(`   Prompt: "${(cleanPrompt || '').substring(0, 80)}"\n`);

    try {
      // Find and focus the Slate editor textbox
      console.log('   🔍 Finding prompt textbox...');
      const promptDiv = await this.page.$('[role="textbox"][data-slate-editor="true"]');
      
      if (!promptDiv) {
        throw new Error('Prompt textbox not found');
      }
      console.log('   ✓ Found prompt textbox\n');

      // Focus the textbox
      console.log('   🖱️  Focusing textbox...');
      await this.page.evaluate(() => {
        const textbox = document.querySelector('[role="textbox"][data-slate-editor="true"]');
        if (textbox) {
          textbox.focus();
        }
      });
      await this.page.waitForTimeout(300);

      // Attempt typing with optimized strategy: type start, paste middle, type end
      let attempts = 0;
      let success = false;
      const maxAttempts = 2;

      while (attempts < maxAttempts && !success) {
        attempts++;
        console.log(`   ⌨️  Entering prompt (attempt ${attempts}/${maxAttempts})...`);
        
        // Split prompt into sections for optimized entry
        const PREFIX_LEN = 20;
        const SUFFIX_LEN = 20;
        
        const prefix = cleanPrompt.substring(0, PREFIX_LEN);
        const suffix = cleanPrompt.substring(Math.max(PREFIX_LEN, cleanPrompt.length - SUFFIX_LEN));
        const middle = cleanPrompt.substring(PREFIX_LEN, cleanPrompt.length - SUFFIX_LEN);
        
        console.log(`   📝 Splitting: [${PREFIX_LEN}] + [${middle.length}] + [${SUFFIX_LEN}]`);
        
        // SECTION 1: Type first 20 chars (slow, careful)
        if (prefix.length > 0) {
          console.log(`   ⌨️  [1/3] Typing first ${prefix.length} chars...`);
          await this.page.keyboard.type(prefix, { delay: 3 });
          await this.page.waitForTimeout(100);
        }
        
        // SECTION 2: Paste middle section (fast via clipboard)
        if (middle.length > 0) {
          console.log(`   📋 [2/3] Pasting middle ${middle.length} chars...`);
          
          // Use clipboard to paste efficiently
          await this.page.evaluate(() => {
            const textbox = document.querySelector('[role="textbox"][data-slate-editor="true"]');
            if (textbox) {
              // Get current caret position and insert text
              const event = new ClipboardEvent('paste', {
                clipboardData: new DataTransfer(),
                bubbles: true
              });
              Object.defineProperty(event, 'clipboardData', {
                value: {
                  getData: () => ''
                }
              });
            }
          });
          
          // Simpler approach: type middle section quickly without delay
          await this.page.keyboard.type(middle, { delay: 0 });
          await this.page.waitForTimeout(50);
        }
        
        // SECTION 3: Type last 20 chars (slow, careful)
        if (suffix.length > 0) {
          console.log(`   ⌨️  [3/3] Typing last ${suffix.length} chars...`);
          await this.page.keyboard.type(suffix, { delay: 3 });
          await this.page.waitForTimeout(100);
        }
        
        console.log(`   ✓ Entry complete: ${cleanPrompt.length} chars`);

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
          console.log('   🔁 Retrying: clearing editor and re-entering...');
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

      // Press Enter to submit the prompt
      console.log('   ⌨️  Pressing Enter to submit prompt...');
      await this.page.keyboard.press('Enter');
      console.log('   ✓ Prompt submitted with Enter key\n');
      await this.page.waitForTimeout(500);

    } catch (error) {
      console.error(`   ❌ Error entering prompt: ${error.message}`);
      throw error;
    }
  }

  // 💫 NEW METHODS FOR VIDEO GENERATION FLOW
  
  async waitForSendButtonEnabled() {
    console.log('⏳ Waiting for Send button to enable...');
    
    try {
      // First, wait for ANY button with the right aria-label
      await this.page.waitForFunction(() => {
        const btn = document.querySelector('button[aria-label*="Generate"], button[aria-label*="Tạo"], button[aria-label*="Send"], button[aria-label*="generate"], button[aria-label*="send"]');
        if (btn) {
          console.log(`[DEBUG] Found button: ${btn.getAttribute('aria-label')}`);
        }
        return btn && !btn.disabled;
      }, { timeout: 15000 });  // Increased timeout for video generation
      
      console.log('✅ Send button is enabled');
      return true;
    } catch (error) {
      console.warn('⚠️  Timeout waiting for Send button:', error.message);
      
      // Try to find and log what buttons are available
      try {
        const buttons = await this.page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          return btns.map(b => ({
            text: b.textContent.trim().substring(0, 50),
            ariaLabel: b.getAttribute('aria-label'),
            disabled: b.disabled,
            visible: b.offsetParent !== null
          })).filter((b, i) => i < 10);  // First 10 buttons
        });
        console.log('[DEBUG] Available buttons:', JSON.stringify(buttons, null, 2));
      } catch (e) {
        console.log('[DEBUG] Could not enumerate buttons:', e.message);
      }
      
      return false;
    }
  }

  async checkSendButton() {
    console.log('✔️  Checking Send button status...');
    
    const status = await this.page.evaluate(() => {
      // Try multiple selector strategies
      let btn = document.querySelector('button[aria-label*="Generate"], button[aria-label*="Tạo"], button[aria-label*="Send"]');
      
      // If not found, try lowercase
      if (!btn) {
        btn = document.querySelector('button[aria-label*="generate"], button[aria-label*="send"]');
      }
      
      // If still not found, try by text content
      if (!btn) {
        const buttons = Array.from(document.querySelectorAll('button'));
        btn = buttons.find(b => {
          const text = b.textContent.toLowerCase();
          return text.includes('generate') || text.includes('send') || text.includes('tạo');
        });
      }
      
      if (!btn) return { found: false, disabled: null };
      return { found: true, disabled: btn.disabled, text: btn.textContent, ariaLabel: btn.getAttribute('aria-label') };
    });

    if (!status.found) {
      console.warn('⚠️  Send button not found');
      return false;
    }

    console.log(`   Button: "${status.text.trim()}" | Aria-label: ${status.ariaLabel} | Disabled: ${status.disabled}`);
    return !status.disabled;
  }

  async submit() {
    console.log('⏳ Submitting request...');
    
    try {
      const clicked = await this.page.evaluate(() => {
        // Try multiple selector strategies
        let btn = document.querySelector('button[aria-label*="Generate"], button[aria-label*="Tạo"], button[aria-label*="Send"]');
        
        // If not found, try lowercase
        if (!btn) {
          btn = document.querySelector('button[aria-label*="generate"], button[aria-label*="send"]');
        }
        
        // If still not found, try by text content
        if (!btn) {
          const buttons = Array.from(document.querySelectorAll('button'));
          btn = buttons.find(b => {
            const text = b.textContent.toLowerCase();
            return text.includes('generate') || text.includes('send') || text.includes('tạo');
          });
        }
        
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
    } else {
      console.log('⚠️  Video tab not found - continuing without explicit tab switch (UI might handle this automatically)');
    }
    return switched;
  }

  async selectVideoFromComponents() {
    console.log('🎬 Selecting video generation mode...');
    
    try {
      const selected = await this.page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        
        // Log all button texts for debugging
        const buttonTexts = Array.from(buttons).map(b => b.textContent.trim().substring(0, 60));
        console.log(`[DEBUG] Found ${buttons.length} buttons on page`);
        
        // First try: Look for "video" or "thành phần" in button text
        for (const btn of buttons) {
          const text = btn.textContent.toLowerCase();
          if (text.includes('video') && text.includes('thành phần')) {
            console.log(`[DEBUG] Found exact match: "${btn.textContent.trim()}"`);
            btn.click();
            return true;
          }
        }
        
        // Second try: Just look for "thành phần" (components) since it's Vietnamese
        for (const btn of buttons) {
          const text = btn.textContent.toLowerCase();
          if (text.includes('thành phần')) {
            console.log(`[DEBUG] Found components button: "${btn.textContent.trim()}"`);
            btn.click();
            return true;
          }
        }
        
        // Third try: Look for "create" or "tạo" (create)
        for (const btn of buttons) {
          const text = btn.textContent.toLowerCase();
          if ((text.includes('create') || text.includes('tạo')) && text.includes('video')) {
            console.log(`[DEBUG] Found create video button: "${btn.textContent.trim()}"`);
            btn.click();
            return true;
          }
        }
        
        console.log(`[DEBUG] Available button texts:`, buttonTexts);
        return false;
      });

      if (selected) {
        console.log('✅ Video mode selected');
        await this.page.waitForTimeout(800);
      } else {
        console.log('⚠️  Video mode button not found - UI might already be in video mode');
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
        const sendButton = document.querySelector('button[aria-label*="Send"], button[aria-label*="send"]');
        
        // Log what we found
        console.log(`[DEBUG] Video interface check:`);
        console.log(`  - Prompt textbox: ${!!prompt}`);
        console.log(`  - Aspect ratio control: ${!!aspectRatio}`);
        console.log(`  - Send button: ${!!sendButton}`);
        
        // We just need the prompt textbox to be present
        return !!prompt;
      });

      if (verified) {
        console.log('✅ Video interface verified');
      } else {
        console.log('⚠️  Video interface not fully ready - continuing anyway (interface might load after first interaction)');
      }
      return verified || true;  // Continue even if not fully ready
    } catch (error) {
      console.error('❌ Error verifying interface:', error.message);
      return true;  // Continue despite error
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

  /**
   * Click dropdown button using mouse movement method (Method 2)
   * IMPORTANT: Must query from settings container [data-radix-menu-content]
   */
  async clickDropdownButton(selector, displayName = 'Dropdown') {
    console.log(`   > Clicking ${displayName} dropdown...`);
    
    try {
      const btnInfo = await this.page.evaluate((sel) => {
        // CRITICAL: Query from settings menu container, NOT from entire page
        const settingsContainer = document.querySelector('[data-radix-menu-content]');
        if (!settingsContainer) {
          console.log('[DROPDOWN] Settings container [data-radix-menu-content] not found');
          return { found: false, error: 'Settings container not found' };
        }
        
        console.log('[DROPDOWN] Found settings container, searching for button...');
        const btn = settingsContainer.querySelector(sel);
        
        if (!btn) {
          console.log(`[DROPDOWN] Button not found in settings container`);
          return { found: false, error: `Button not found with selector: ${sel}` };
        }
        
        const rect = btn.getBoundingClientRect();
        
        // Check if visible
        if (rect.width === 0 || rect.height === 0) {
          console.log('[DROPDOWN] Button found but not visible');
          return { found: false, error: 'Button found but not visible' };
        }
        
        console.log(`[DROPDOWN] Found visible button: "${btn.textContent.trim().substring(0, 30)}"`);
        return {
          found: true,
          x: Math.round(rect.left + rect.width / 2),
          y: Math.round(rect.top + rect.height / 2),
          text: btn.textContent.trim().substring(0, 50)
        };
      }, selector);

      if (!btnInfo.found) {
        console.warn(`   ⚠️  ${btnInfo.error}`);
        return false;
      }

      console.log(`   ✓ Found: "${btnInfo.text}"`);
      console.log(`   🖱️  Clicking with mouse movement...`);
      
      // Use mouse movement method (Method 2 - proven reliable)
      await this.page.mouse.move(btnInfo.x, btnInfo.y);
      await this.page.waitForTimeout(100);
      await this.page.mouse.down();
      await this.page.waitForTimeout(50);
      await this.page.mouse.up();
      
      await this.page.waitForTimeout(500);
      return true;

    } catch (error) {
      console.warn(`   ❌ Error clicking dropdown: ${error.message}`);
      return false;
    }
  }

  /**
   * Click menu item using mouse movement method (Method 2)
   * Used to select from dropdown menus
   */
  async clickMenuItemByText(itemText, menuSelector = '[role="menu"]') {
    console.log(`   > Selecting menu item: "${itemText}"...`);
    
    try {
      const menuInfo = await this.page.evaluate((text, selector) => {
        const menus = document.querySelectorAll(selector);
        
        // First, log all available menu items for debugging
        const allItems = [];
        for (const menu of menus) {
          const buttons = menu.querySelectorAll('button');
          for (const btn of buttons) {
            const btnText = btn.textContent.trim();
            const rect = btn.getBoundingClientRect();
            const visible = rect.width > 0 && rect.height > 0;
            if (visible) {
              allItems.push(btnText);
            }
          }
        }
        
        console.log(`[MENU] Available items: ${allItems.length} found`);
        allItems.forEach((item, idx) => {
          console.log(`  [${idx}] "${item}"`);
        });
        
        // Try to find exact match first
        for (const menu of menus) {
          const buttons = menu.querySelectorAll('button');
          for (const btn of buttons) {
            const btnText = btn.textContent.trim();
            const rect = btn.getBoundingClientRect();
            
            // Check if visible
            if (rect.width === 0 || rect.height === 0) {
              continue;
            }
            
            // EXACT MATCH FIRST: Full text equals search text
            if (btnText === text) {
              console.log(`[MATCH] EXACT: "${btnText}"`);
              return {
                found: true,
                x: Math.round(rect.left + rect.width / 2),
                y: Math.round(rect.top + rect.height / 2),
                fullText: btnText,
                matchType: 'exact'
              };
            }
          }
        }
        
        // Try substring match - but be careful to match the beginning or a key part
        // For model selection: "Nano Banana Pro" should match "🍌 Nano Banana Pro" but NOT "🍌 Nano Banana 2"
        for (const menu of menus) {
          const buttons = menu.querySelectorAll('button');
          for (const btn of buttons) {
            const btnText = btn.textContent.trim();
            const rect = btn.getBoundingClientRect();
            
            // Check if visible
            if (rect.width === 0 || rect.height === 0) {
              continue;
            }
            
            // CONTAINS MATCH: Handle model names carefully
            // For "Nano Banana Pro" search, match "Nano Banana Pro" but not "Nano Banana 2"
            // Check if the button text contains the search text as a word boundary
            if (btnText.includes(text)) {
              // Additional check: for model names, ensure we're matching the right one
              // "Nano Banana Pro" should NOT match "Nano Banana 2"
              // Check if any part of the search text is actually different (like "Pro" vs "2")
              const searchWords = text.split(' ');
              const btnWords = btnText.split(' ');
              let allWordsMatch = true;
              
              for (const word of searchWords) {
                // Check if this word appears in the button text
                const wordFound = btnWords.some(btnWord => 
                  btnWord.includes(word) || word.includes(btnWord)
                );
                if (!wordFound && word.length > 2) { // Ignore very short words
                  allWordsMatch = false;
                  break;
                }
              }
              
              if (allWordsMatch) {
                console.log(`[MATCH] CONTAINS: "${btnText}"`);
                return {
                  found: true,
                  x: Math.round(rect.left + rect.width / 2),
                  y: Math.round(rect.top + rect.height / 2),
                  fullText: btnText,
                  matchType: 'contains'
                };
              }
            }
          }
        }
        
        return { found: false };
      }, itemText, menuSelector);

      if (!menuInfo.found) {
        console.warn(`   ⚠️  Menu item not found: "${itemText}"`);
        console.log(`   📋 Available menu items should be shown above`);
        return false;
      }

      console.log(`   ✓ Found: "${menuInfo.fullText}" (${menuInfo.matchType} match)`);
      console.log(`   🖱️  Clicking with mouse movement...`);
      
      // Use mouse movement method (Method 2)
      await this.page.mouse.move(menuInfo.x, menuInfo.y);
      await this.page.waitForTimeout(100);
      await this.page.mouse.down();
      await this.page.waitForTimeout(50);
      await this.page.mouse.up();
      
      await this.page.waitForTimeout(500);
      return true;

    } catch (error) {
      console.warn(`   ❌ Error clicking menu item: ${error.message}`);
      return false;
    }
  }

  /**
   * Select VIDEO reference type (Ingredients or Frames)
   * For VIDEO tab only
   */
  async selectVideoReferenceType(referenceType = 'ingredients') {
    const type = (referenceType || 'ingredients').toLowerCase();
    const displayName = type === 'frames' ? 'Frames' : 'Ingredients';
    
    console.log(`   > Selecting VIDEO reference type: ${displayName}...`);
    
    // Try to find and click the reference type tab
    try {
      // First, check if we can find tabs with Ingredients/Frames
      const found = await this.page.evaluate((targetType) => {
        const buttons = document.querySelectorAll('button[role="tab"]');
        
        for (const btn of buttons) {
          const text = btn.textContent.trim().toLowerCase();
          if (text.includes(targetType)) {
            const rect = btn.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
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
      }, type);

      if (found.found) {
        console.log(`   ✓ Found: "${found.text}"`);
        console.log(`   🖱️  Clicking with mouse movement...`);
        
        // Click using mouse method
        await this.page.mouse.move(found.x, found.y);
        await this.page.waitForTimeout(100);
        await this.page.mouse.down();
        await this.page.waitForTimeout(50);
        await this.page.mouse.up();
        
        await this.page.waitForTimeout(300);
        return true;
      } else {
        console.log(`   ℹ️  Reference type selector not found (may use defaults), continuing...`);
        return true;
      }

    } catch (error) {
      console.warn(`   ⚠️  Error selecting reference type: ${error.message}`);
      return true; // Don't fail - may be optional
    }
  }

  async configureSettings() {
    console.log('⚙️  CONFIGURING SETTINGS\n');

    try {
      // Set default values if not provided
      if (!this.options.imageCount && this.type === 'image') {
        this.options.imageCount = 1;
      }
      if (!this.options.videoCount && this.type === 'video') {
        this.options.videoCount = 1;
      }
      if (!this.options.aspectRatio) {
        this.options.aspectRatio = '9:16';
      }
      if (!this.options.model) {
        this.options.model = this.type === 'image' ? 'Nano Banana Pro' : 'Veo 3.1 - Fast';
      }
      if (!this.options.videoReferenceType) {
        this.options.videoReferenceType = 'ingredients'; // Default for VIDEO
      }

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
        const selector = 'button[id*="IMAGE"][role="tab"]';
        await this.selectRadixTab(selector, 'IMAGE tab');
      } else {
        const selector = 'button[id*="VIDEO"][role="tab"]';
        await this.selectRadixTab(selector, 'VIDEO tab');
      }
      await this.page.waitForTimeout(500);

      // STEP 2: Select Aspect Ratio (Portrait 9:16 for TikTok)
      console.log('\n   📐 STEP 2: Select Aspect Ratio');
      const isVertical = this.options.aspectRatio.includes('9:16');
      const targetRatio = isVertical ? 'PORTRAIT' : 'LANDSCAPE';
      const ratioSelector = `button[id*="${targetRatio}"][role="tab"]`;
      await this.selectRadixTab(ratioSelector, `${targetRatio} (${this.options.aspectRatio})`);
      await this.page.waitForTimeout(500);

      // STEP 3: Select Image/Video Count
      console.log('\n   🔢 STEP 3: Select Count');
      const count = this.type === 'image' ? this.options.imageCount : this.options.videoCount;
      await this.selectTab(`x${count}`);
      await this.page.waitForTimeout(500);

      // STEP 4: Select VIDEO Reference Type (if VIDEO tab)
      if (this.type === 'video') {
        console.log('\n   📽️  STEP 4: Select VIDEO Reference Type');
        await this.selectVideoReferenceType(this.options.videoReferenceType);
        await this.page.waitForTimeout(500);
      }

      // STEP 5: Select Model (for both IMAGE and VIDEO)
      console.log(`\n   🤖 STEP ${this.type === 'image' ? 4 : 5}: Select Model`);
      const targetModel = this.options.model;
      console.log(`   > Target model: "${targetModel}"`);
      console.log(`   > Type: ${this.type}`);
      console.log(`   > Default would be: ${this.type === 'image' ? 'Nano Banana Pro' : 'Veo 3.1 - Fast'}`);
      
      // Find model dropdown button from settings menu
      const dropdownClicked = await this.clickDropdownButton(
        'button[id^="radix-"][aria-haspopup="menu"]',
        'Model dropdown'
      );
      
      if (dropdownClicked) {
        // Wait for dropdown to open
        await this.page.waitForTimeout(800);
        
        // Click the model menu item
        const itemClicked = await this.clickMenuItemByText(targetModel, '[role="menu"]');
        
        if (itemClicked) {
          console.log(`   ✓ ${targetModel} selected`);
        } else {
          console.log(`   ⚠️  Could not select model ${targetModel}, may already be set`);
        }
      } else {
        console.log(`   ⚠️  Could not open model dropdown, may already be configured`);
      }

      await this.page.waitForTimeout(500);
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

      console.log(`[SETTINGS] Step 2: Found button at (${btnInfo.x}, ${btnInfo.y})...`);
      
      // Use realistic mouse movements (Radix UI compatible)
      console.log('[SETTINGS] Step 3: Moving mouse and clicking...');
      await this.page.mouse.move(btnInfo.x, btnInfo.y);
      await this.page.waitForTimeout(100);
      await this.page.mouse.down();
      await this.page.waitForTimeout(50);
      await this.page.mouse.up();

      // Wait for menu to appear
      console.log('[SETTINGS] Step 4: Waiting for menu...');
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

  /**
   * Debug method to inspect all settings menu buttons and tabs
   * Run this to see why settings buttons might not be clickable
   */
  async debugSettingsButtons() {
    console.log('\n🔍 DEBUG: SETTINGS BUTTONS INSPECTION\n');

    try {
      // First check if settings menu is open
      const menuInfo = await this.page.evaluate(() => {
        const menu = document.querySelector('[role="menu"]');
        if (!menu) {
          return { menuOpen: false };
        }

        console.log('[DEBUG] Settings menu is open');
        const buttons = Array.from(document.querySelectorAll('button[role="tab"]'));
        const dropdowns = Array.from(document.querySelectorAll('button[aria-haspopup="menu"]'));
        
        const tabDetails = buttons.map((btn, idx) => {
          const rect = btn.getBoundingClientRect();
          return {
            idx,
            type: 'tab',
            text: btn.textContent.trim(),
            ariaSelected: btn.getAttribute('aria-selected'),
            ariaControls: btn.getAttribute('aria-controls'),
            dataState: btn.getAttribute('data-state'),
            visible: rect.width > 0 && rect.height > 0 && rect.top >= 0,
            x: Math.round(rect.left),
            y: Math.round(rect.top),
            w: Math.round(rect.width),
            h: Math.round(rect.height),
            enabled: !btn.hasAttribute('disabled'),
            className: btn.className
          };
        });

        const dropdownDetails = dropdowns.map((btn, idx) => {
          const rect = btn.getBoundingClientRect();
          return {
            idx,
            type: 'dropdown',
            text: btn.textContent.trim().substring(0, 50),
            ariaExpanded: btn.getAttribute('aria-expanded'),
            dataState: btn.getAttribute('data-state'),
            visible: rect.width > 0 && rect.height > 0 && rect.top >= 0,
            x: Math.round(rect.left),
            y: Math.round(rect.top),
            w: Math.round(rect.width),
            h: Math.round(rect.height),
            enabled: !btn.hasAttribute('disabled'),
            className: btn.className
          };
        });

        return {
          menuOpen: true,
          tabs: tabDetails,
          dropdowns: dropdownDetails
        };
      });

      console.log(JSON.stringify(menuInfo, null, 2));

      if (!menuInfo.menuOpen) {
        console.log('\n⚠️  Settings menu is not open. Opening it first...\n');
        await this.clickSettingsButton();
        await this.page.waitForTimeout(800);
        
        // Try debug again
        return await this.debugSettingsButtons();
      }

      // Now try clicking each tab and see what happens
      console.log('\n\n📍 TESTING TAB CLICKS\n');

      if (menuInfo.tabs && menuInfo.tabs.length > 0) {
        for (const tabInfo of menuInfo.tabs) {
          console.log(`\n${tabInfo.idx}. Tab: "${tabInfo.text}"`);
          console.log(`   State: aria-selected=${tabInfo.ariaSelected}, data-state=${tabInfo.dataState}`);
          console.log(`   Position: (${tabInfo.x}, ${tabInfo.y}) | Size: ${tabInfo.w}x${tabInfo.h}`);
          console.log(`   Visible: ${tabInfo.visible}, Enabled: ${tabInfo.enabled}`);

          if (tabInfo.visible && tabInfo.enabled) {
            console.log(`   🖱️  Attempting click...`);
            try {
              // Scroll into view and click
              await this.page.evaluate((controls) => {
                const btn = document.querySelector(`button[aria-controls="${controls}"]`);
                if (btn) {
                  btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }, tabInfo.ariaControls);

              await this.page.waitForTimeout(200);

              // Use mouse click
              await this.page.mouse.move(tabInfo.x + tabInfo.w / 2, tabInfo.y + tabInfo.h / 2);
              await this.page.waitForTimeout(100);
              await this.page.mouse.down();
              await this.page.waitForTimeout(50);
              await this.page.mouse.up();

              await this.page.waitForTimeout(300);

              // Check new state
              const newState = await this.page.evaluate((controls) => {
                const btn = document.querySelector(`button[aria-controls="${controls}"]`);
                if (!btn) return null;
                return {
                  ariaSelected: btn.getAttribute('aria-selected'),
                  dataState: btn.getAttribute('data-state')
                };
              }, tabInfo.ariaControls);

              console.log(`   ✓ Clicked. New state: ${JSON.stringify(newState)}`);
            } catch (e) {
              console.log(`   ❌ Click failed: ${e.message}`);
            }
          }
        }
      }

      // Test dropdowns
      console.log('\n\n📍 TESTING DROPDOWN CLICKS\n');

      if (menuInfo.dropdowns && menuInfo.dropdowns.length > 0) {
        for (const ddInfo of menuInfo.dropdowns) {
          console.log(`\n${ddInfo.idx}. Dropdown: "${ddInfo.text}"`);
          console.log(`   State: aria-expanded=${ddInfo.ariaExpanded}`);
          console.log(`   Position: (${ddInfo.x}, ${ddInfo.y}) | Size: ${ddInfo.w}x${ddInfo.h}`);
          console.log(`   Visible: ${ddInfo.visible}, Enabled: ${ddInfo.enabled}`);

          if (ddInfo.visible && ddInfo.enabled) {
            console.log(`   🖱️  Attempting click...`);
            try {
              await this.page.mouse.move(ddInfo.x + ddInfo.w / 2, ddInfo.y + ddInfo.h / 2);
              await this.page.waitForTimeout(100);
              await this.page.mouse.down();
              await this.page.waitForTimeout(50);
              await this.page.mouse.up();

              await this.page.waitForTimeout(300);

              const newExpanded = await this.page.evaluate((idx) => {
                const dropdowns = Array.from(document.querySelectorAll('button[aria-haspopup="menu"]'));
                if (dropdowns[idx]) {
                  return dropdowns[idx].getAttribute('aria-expanded');
                }
                return null;
              }, ddInfo.idx);

              console.log(`   ✓ Clicked. New aria-expanded: ${newExpanded}`);
            } catch (e) {
              console.log(`   ❌ Click failed: ${e.message}`);
            }
          }
        }
      }

      console.log('\n✅ Debug inspection complete\n');

    } catch (error) {
      console.error(`❌ Debug error: ${error.message}`);
      console.error(error.stack);
    }
  }

  async selectTab(label) {
    console.log(`   > Selecting "${label}" tab...`);
    
    try {
      // Find button by text and get its position
      const buttonInfo = await this.page.evaluate((targetLabel) => {
        const buttons = Array.from(document.querySelectorAll('button[role="tab"]'));
        
        for (const btn of buttons) {
          const text = btn.textContent.trim(); // Trim whitespace
          
          console.log(`[SELECT_TAB] Checking button: "${text}"`);
          
          // Match by text
          if (text === targetLabel || text.includes(targetLabel.trim())) {
            const rect = btn.getBoundingClientRect();
            
            // Check if visible
            if (rect.width === 0 || rect.height === 0) {
              console.log(`[SELECT_TAB] Button found but not visible`);
              return { found: false, error: 'Button not visible' };
            }
            
            return {
              found: true,
              x: Math.round(rect.left + rect.width / 2),
              y: Math.round(rect.top + rect.height / 2),
              ariaSelected: btn.getAttribute('aria-selected'),
              dataState: btn.getAttribute('data-state'),
              text: text
            };
          }
        }
        
        return { found: false, error: `No tab found with label "${targetLabel}"` };
      }, label);

      if (!buttonInfo.found) {
        console.warn(`   ⚠️  ${buttonInfo.error}`);
        return false;
      }

      console.log(`   ✓ Found tab: "${buttonInfo.text}"`);
      console.log(`     Current state: aria-selected=${buttonInfo.ariaSelected}`);
      console.log(`     Position: (${buttonInfo.x}, ${buttonInfo.y})`);

      // Use realistic mouse movement to click (Radix UI compatible)
      console.log(`   🖱️  Clicking with mouse movement...\n`);
      await this.page.mouse.move(buttonInfo.x, buttonInfo.y);
      await this.page.waitForTimeout(100);
      await this.page.mouse.down();
      await this.page.waitForTimeout(50);
      await this.page.mouse.up();

      // Wait for state update
      await this.page.waitForTimeout(300);

      // Verify new state
      const newState = await this.page.evaluate((targetLabel) => {
        const buttons = Array.from(document.querySelectorAll('button[role="tab"]'));
        for (const btn of buttons) {
          if (btn.textContent.trim() === targetLabel || btn.textContent.trim().includes(targetLabel)) {
            return {
              ariaSelected: btn.getAttribute('aria-selected'),
              dataState: btn.getAttribute('data-state')
            };
          }
        }
        return null;
      }, label);

      if (newState) {
        console.log(`   ✓ After click: aria-selected=${newState.ariaSelected}`);
      }

      return true;

    } catch (error) {
      console.warn(`   ❌ Error selecting tab: ${error.message}`);
      return false;
    }
  }

  /**
   * Universal Radix tab selector using mouse movement (works for all tab types)
   * More reliable than direct .click() for Radix UI components
   */
  async selectRadixTab(selector, displayName) {
    console.log(`   > Selecting ${displayName}...`);
    
    try {
      // Find button by selector
      const buttonInfo = await this.page.evaluate((sel) => {
        const btn = document.querySelector(sel);
        
        if (!btn) {
          return { found: false, error: `Button not found with selector: ${sel}` };
        }
        
        const rect = btn.getBoundingClientRect();
        
        // Check if visible
        if (rect.width === 0 || rect.height === 0) {
          return { found: false, error: 'Button found but not visible' };
        }
        
        return {
          found: true,
          x: Math.round(rect.left + rect.width / 2),
          y: Math.round(rect.top + rect.height / 2),
          text: btn.textContent.trim().substring(0, 50),
          ariaSelected: btn.getAttribute('aria-selected'),
          dataState: btn.getAttribute('data-state')
        };
      }, selector);

      if (!buttonInfo.found) {
        console.warn(`   ⚠️  ${buttonInfo.error}`);
        return false;
      }

      console.log(`   ✓ Found button: "${buttonInfo.text}"`);
      console.log(`     Current state: aria-selected=${buttonInfo.ariaSelected}`);
      console.log(`     Position: (${buttonInfo.x}, ${buttonInfo.y})`);

      // Use realistic mouse movement to click
      console.log(`   🖱️  Clicking with mouse movement...`);
      await this.page.mouse.move(buttonInfo.x, buttonInfo.y);
      await this.page.waitForTimeout(100);
      await this.page.mouse.down();
      await this.page.waitForTimeout(50);
      await this.page.mouse.up();

      // Wait for state update
      await this.page.waitForTimeout(300);

      // Verify new state
      const newState = await this.page.evaluate((sel) => {
        const btn = document.querySelector(sel);
        if (btn) {
          return {
            ariaSelected: btn.getAttribute('aria-selected'),
            dataState: btn.getAttribute('data-state')
          };
        }
        return null;
      }, selector);

      if (newState) {
        console.log(`   ✓ After click: aria-selected=${newState.ariaSelected}\n`);
      }

      return true;

    } catch (error) {
      console.warn(`   ❌ Error selecting tab: ${error.message}\n`);
      return false;
    }
  }

  async clickCreate() {
    console.log('🎬 CLICKING GENERATE BUTTON\n');

    try {
      // Find the submit button using the unique class "aQhhA"
      // It contains 2 buttons, the 2nd one is the submit button with arrow_forward icon
      
      console.log('   🔍 Finding submit button via .aQhhA class...');
      
      const generateBtnInfo = await this.page.evaluate(() => {
        // Find the container with unique class
        const container = document.querySelector('.aQhhA');
        
        if (!container) {
          return { found: false, error: 'Container .aQhhA not found' };
        }
        
        // Get all buttons in this container
        const buttons = container.querySelectorAll('button');
        
        if (buttons.length < 2) {
          return { found: false, error: `Expected 2+ buttons, found ${buttons.length}` };
        }
        
        // Get the 2nd button (index 1) - this is the submit button
        const submitBtn = buttons[1];
        const rect = submitBtn.getBoundingClientRect();
        
        // Check if visible
        if (rect.width === 0 || rect.height === 0) {
          return { found: false, error: 'Submit button not visible' };
        }
        
        return {
          found: true,
          x: Math.round(rect.left + rect.width / 2),
          y: Math.round(rect.top + rect.height / 2),
          w: Math.round(rect.width),
          h: Math.round(rect.height),
          text: submitBtn.textContent.trim().substring(0, 50),
          hasArrow: submitBtn.innerHTML.includes('arrow_forward')
        };
      });

      if (!generateBtnInfo.found) {
        throw new Error(generateBtnInfo.error);
      }

      console.log(`   ✓ Found submit button (2nd in .aQhhA)\n`);
      console.log(`   Text: "${generateBtnInfo.text}"`);
      console.log(`   Has arrow_forward: ${generateBtnInfo.hasArrow}`);
      console.log(`   Position: (${generateBtnInfo.x}, ${generateBtnInfo.y})\n`);

      // Use realistic mouse movement to click
      console.log('   🖱️  Clicking with mouse movement...');
      await this.page.mouse.move(generateBtnInfo.x, generateBtnInfo.y);
      await this.page.waitForTimeout(150);
      await this.page.mouse.down();
      await this.page.waitForTimeout(100);
      await this.page.mouse.up();

      console.log('   ✓ Submit button clicked\n');
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


  async downloadItemViaContextMenu(newHref) {
    /**
     * Download generated item by right-clicking and selecting download option
     * Handles the submenu with smart quality selection:
     * - Nano Banana Pro: Prefer 2K, fallback to 1K
     * - Other models for image: 1K
     * - Videos: 1080p (or highest available)
     * Returns the downloaded file path, or null if download failed
     * Waits for file to appear in output directory
     */
    const mediaType = this.type === 'image' ? 'image' : 'video';
    const mediaExt = this.type === 'image' ? '.jpg' : '.mp4';
    
    // Determine preferred quality options based on model
    let qualityOptions = [];
    if (this.type === 'image' && this.options.model === 'Nano Banana Pro') {
      // Nano Banana Pro supports 2K for images
      qualityOptions = ['2k', '2K', '1k', '1K'];  // Try 2K first, fallback to 1K
      console.log(`   ℹ️  Model: ${this.options.model} (trying 2K first)`);
    } else if (this.type === 'image') {
      qualityOptions = ['1k', '1K'];
    } else {
      // Video: Try 1080P first, fallback to 720p
      qualityOptions = ['1080p', '1080P', '720p', '720P'];
      console.log(`   ℹ️  Video (trying 1080P first, fallback to 720p)`);
    }
    
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
        return null;
      }

      console.log(`   🖱️  Right-clicking on ${mediaType}...`);
      // Use mouse movement method for right-click (Method 2)
      await this.page.mouse.move(linkData.x, linkData.y);
      await this.page.waitForTimeout(100);
      await this.page.mouse.down({ button: 'right' });
      await this.page.waitForTimeout(50);
      await this.page.mouse.up({ button: 'right' });
      
      // Wait for context menu to fully render (increased to 3s to be sure)
      console.log('   ⏳ Waiting for context menu to appear...');
      await this.page.waitForTimeout(3000);

      // Find and click download option from context menu
      // Looking for: <div role="menuitem" with icon "download" and text "Tải xuống"
      const downloadInfo = await this.page.evaluate(() => {
        const menuItems = document.querySelectorAll('[role="menuitem"]');
        
        // Debug: log what menu items exist
        const debugItems = [];
        for (const item of menuItems) {
          const text = item.textContent.substring(0, 50);
          debugItems.push(text);
        }
        
        for (const item of menuItems) {
          const text = item.textContent.toLowerCase();
          const hasDownloadIcon = item.innerHTML.includes('download');
          
          // Look for download / tải xuống button
          if ((text.includes('tải') || text.includes('download')) && hasDownloadIcon) {
            const rect = item.getBoundingClientRect();
            return {
              found: true,
              x: Math.round(rect.left + rect.width / 2),
              y: Math.round(rect.top + rect.height / 2)
            };
          }
        }
        
        return { found: false, availableItems: debugItems };
      });

      if (!downloadInfo.found) {
        console.warn('   ⚠️  Download option not found in context menu');
        if (downloadInfo.availableItems && downloadInfo.availableItems.length > 0) {
          console.warn(`   📋 Available menu items: ${downloadInfo.availableItems.join(', ')}`);
        } else {
          console.warn('   📋 No menu items found at all (context menu may not have appeared)');
        }
        console.warn('   💡 Tip: Image may need more time to load. Try increasing wait time.\n');
        return null;
      }

      // Click download button using mouse movement method (Method 2)
      console.log('   🖱️  Clicking "Tải xuống" option...');
      await this.page.mouse.move(downloadInfo.x, downloadInfo.y);
      await this.page.waitForTimeout(150);
      await this.page.mouse.down();
      await this.page.waitForTimeout(100);
      await this.page.mouse.up();

      // Wait for submenu to appear
      console.log('   ⏳ Waiting for submenu...');
      await this.page.waitForTimeout(1500);

      // Try to find and click the best quality option
      let selectedQuality = null;
      for (const quality of qualityOptions) {
        const qualityInfo = await this.page.evaluate((targetQuality) => {
          const buttons = document.querySelectorAll('[role="menuitem"]');
          
          for (const btn of buttons) {
            const text = btn.textContent.toLowerCase();
            
            // Look for the right quality option (case-insensitive)
            if (text.includes(targetQuality.toLowerCase())) {
              const rect = btn.getBoundingClientRect();
              return {
                found: true,
                quality: targetQuality,
                x: Math.round(rect.left + rect.width / 2),
                y: Math.round(rect.top + rect.height / 2)
              };
            }
          }
          
          return { found: false };
        }, quality);

        // Click quality option
        if (qualityInfo.found) {
          selectedQuality = quality;
          console.log(`   🖱️  Clicking ${quality}...`);
          await this.page.mouse.move(qualityInfo.x, qualityInfo.y);
          await this.page.waitForTimeout(150);
          await this.page.mouse.down();
          await this.page.waitForTimeout(100);
          await this.page.mouse.up();
          
          // Wait extra time for download to initiate
          await this.page.waitForTimeout(2000);
          break;
        }
      }

      if (!selectedQuality) {
        console.warn('   ⚠️  No quality option found, trying first available...\n');
        
        // Fallback: just click first submenu button
        const firstOption = await this.page.evaluate(() => {
          const menus = document.querySelectorAll('[role="menu"]');
          if (menus.length < 2) return { found: false };
          
          const submenu = menus[menus.length - 1];
          const buttons = submenu.querySelectorAll('[role="menuitem"]');
          
          if (buttons.length === 0) return { found: false };
          
          const firstBtn = buttons[0];
          const rect = firstBtn.getBoundingClientRect();
          return {
            found: true,
            x: Math.round(rect.left + rect.width / 2),
            y: Math.round(rect.top + rect.height / 2)
          };
        });

        if (!firstOption.found) {
          console.warn('   ⚠️  No submenu options available\n');
          return null;
        }

        // Click first option with Method 2
        console.log('   🖱️  Clicking first available option...');
        await this.page.mouse.move(firstOption.x, firstOption.y);
        await this.page.waitForTimeout(150);
        await this.page.mouse.down();
        await this.page.waitForTimeout(100);
        await this.page.mouse.up();
      } else {
        console.log(`   ✓ Selected quality: ${selectedQuality}`);
      }

      console.log('   ✓ Download started, waiting for file...');
      
      // Wait for file to appear in output directory
      let downloadedFile = null;
      let waitAttempts = 0;
      // Increase timeout for 2K images (can be 100-200MB+ downloads that need processing)
      // 300 * 500ms = 150 seconds (2.5 minutes for large file processing)
      const maxWaitAttempts = 300;
      
      // Get initial files (all files, regardless of extension)
      const initialFiles = fs.readdirSync(this.options.outputDir);
      console.log(`   📁 Initial files in directory: ${initialFiles.length}`);
      if (initialFiles.length <= 10) {
        initialFiles.forEach(f => console.log(`      - ${f}`));
      }

      // Check immediately (download might be very fast)
      await this.page.waitForTimeout(500);

      // Track in-progress files separately
      let lastInProgressFile = null;
      let lastInProgressFileSize = 0;
      let lastInProgressFileTime = Date.now();
      let inProgressWaitAttempts = 0;
      // Wait up to 150 seconds (300 attempts) for in-progress file to complete
      const maxInProgressWaitAttempts = 300;

      while (waitAttempts < maxWaitAttempts) {
        waitAttempts++;
        
        // Check output directory first
        let currentFiles = fs.readdirSync(this.options.outputDir);
        
        // Image extensions to look for
        const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'];
        
        // First, check for finished files in output directory
        let newFiles = currentFiles.filter(f => {
          // Exclude download-in-progress files
          if (f.endsWith('.crdownload') || f.endsWith('.tmp') || f.endsWith('.partial')) {
            return false;
          }
          // Only include image files that are new
          const hasImageExt = imageExtensions.some(ext => f.toLowerCase().endsWith(ext));
          if (!hasImageExt) {
            return false;
          }
          return !initialFiles.includes(f);
        });

        // If not in output dir, check user's Downloads folder
        if (newFiles.length === 0 && fs.existsSync(this.options.userDownloadsDir)) {
          const downloadsFiles = fs.readdirSync(this.options.userDownloadsDir);
          const downloadedImages = downloadsFiles.filter(f => {
            const hasImageExt = imageExtensions.some(ext => f.toLowerCase().endsWith(ext));
            return hasImageExt && !f.endsWith('.crdownload') && !f.endsWith('.tmp') && !f.endsWith('.partial');
          });
          
          if (downloadedImages.length > 0) {
            // Move file from Downloads to output directory
            const downloadFile = downloadedImages[0];
            const sourcePath = path.join(this.options.userDownloadsDir, downloadFile);
            const destPath = path.join(this.options.outputDir, downloadFile);
            
            try {
              fs.renameSync(sourcePath, destPath);
              newFiles = [downloadFile];
              console.log(`   📁 Found image in Downloads, moved to: ${downloadFile}`);
            } catch (err) {
              console.log(`   ⚠️  Could not move file from Downloads: ${err.message}`);
            }
          }
        }

        if (newFiles.length > 0) {
          // Found new finished file(s)
          console.log(`   ✅ Found ${newFiles.length} new image file(s):`);
          newFiles.forEach(f => console.log(`      - ${f}`));
          
          downloadedFile = path.join(this.options.outputDir, newFiles[0]);
          const fileSize = fs.statSync(downloadedFile).size;
          console.log(`   ✓ Image downloaded: ${path.basename(downloadedFile)} (${(fileSize / 1024 / 1024).toFixed(2)}MB)`);
          await this.page.waitForTimeout(500);
          break;
        }
        
        // If no finished file yet, check for in-progress files in output directory
        let inProgressFiles = currentFiles.filter(f => {
          // Check if it's a download-in-progress file
          if (!(f.endsWith('.crdownload') || f.endsWith('.tmp') || f.endsWith('.partial'))) {
            return false;
          }
          
          // Check if base name (without download marker) is an image
          const baseName = f.replace(/\.(crdownload|tmp|partial)$/, '');
          const hasImageExt = imageExtensions.some(ext => baseName.toLowerCase().endsWith(ext));
          if (!hasImageExt) {
            return false;
          }
          
          return !initialFiles.includes(baseName);
        });
        
        // Also check Downloads folder for in-progress
        if (inProgressFiles.length === 0 && fs.existsSync(this.options.userDownloadsDir)) {
          const downloadsFiles = fs.readdirSync(this.options.userDownloadsDir);
          const inProgressDownloads = downloadsFiles.filter(f => {
            if (!(f.endsWith('.crdownload') || f.endsWith('.tmp') || f.endsWith('.partial'))) {
              return false;
            }
            const baseName = f.replace(/\.(crdownload|tmp|partial)$/, '');
            const hasImageExt = imageExtensions.some(ext => baseName.toLowerCase().endsWith(ext));
            return hasImageExt;
          });
          
          if (inProgressDownloads.length > 0) {
            inProgressFiles = inProgressDownloads;
          }
        }
        
        if (inProgressFiles.length > 0) {
          // Determine file path - could be in either directory
          let inProgressFilePath = path.join(this.options.outputDir, inProgressFiles[0]);
          if (!fs.existsSync(inProgressFilePath)) {
            inProgressFilePath = path.join(this.options.userDownloadsDir, inProgressFiles[0]);
          }
          
          const inProgressFileSize = fs.statSync(inProgressFilePath).size;
          
          // Found in-progress file(s), wait for completion
          if (!lastInProgressFile || lastInProgressFile !== inProgressFiles[0]) {
            console.log(`   📥 In-progress image detected: ${inProgressFiles[0]}`);
            console.log(`      Size: ${(inProgressFileSize / 1024 / 1024).toFixed(2)}MB`);
            lastInProgressFile = inProgressFiles[0];
            lastInProgressFileSize = inProgressFileSize;
            lastInProgressFileTime = Date.now();
            inProgressWaitAttempts = 0;
          }
          
          inProgressWaitAttempts++;
          
          // Log progress every 20 attempts (10 seconds)
          if (inProgressWaitAttempts % 20 === 0) {
            const currentSize = fs.statSync(inProgressFilePath).size;
            const sizeDiff = currentSize - lastInProgressFileSize;
            const timeDiff = (Date.now() - lastInProgressFileTime) / 1000;
            const speed = sizeDiff > 0 ? (sizeDiff / timeDiff / 1024 / 1024).toFixed(2) : '0.00';
            console.log(`   📥 Download progress (${inProgressWaitAttempts}/${maxInProgressWaitAttempts}):`);
            console.log(`      Size: ${(currentSize / 1024 / 1024).toFixed(2)}MB`);
            console.log(`      Speed: ${speed}MB/s`);
            lastInProgressFileSize = currentSize;
            lastInProgressFileTime = Date.now();
          } else if (inProgressWaitAttempts % 5 === 0) {
            const currentSize = fs.statSync(inProgressFilePath).size;
            console.log(`   ⏳ Download in progress... (${inProgressWaitAttempts}/${maxInProgressWaitAttempts}, ${(currentSize / 1024 / 1024).toFixed(2)}MB)`);
          }
        }

        if (waitAttempts % 30 === 0) {
          console.log(`   ⏳ Waiting for download... (${waitAttempts}/${maxWaitAttempts}, ${(waitAttempts * 0.5).toFixed(0)}s elapsed)`);
        }

        await this.page.waitForTimeout(500);
      }

      if (!downloadedFile) {
        console.warn('   ⚠️  Download timeout - file not found in output directory');
        console.warn(`   ⏱️  Waited ${(maxWaitAttempts * 0.5).toFixed(0)}s (${(maxWaitAttempts * 500 / 1000).toFixed(1)} seconds)`);
        console.warn(`   📁 Current files in directory: ${fs.readdirSync(this.options.outputDir).length}`);
        const allFiles = fs.readdirSync(this.options.outputDir);
        if (allFiles.length > 0) {
          console.warn('   📂 All files:');
          allFiles.forEach(f => {
            const filePath = path.join(this.options.outputDir, f);
            try {
              const size = fs.statSync(filePath).size;
              console.warn(`      - ${f} (${(size / 1024 / 1024).toFixed(2)}MB)`);
            } catch (e) {
              console.warn(`      - ${f} (size unavailable)`);
            }
          });
        }
        console.warn('');
        return null;
      }

      console.log(`   ✅ Download confirmed\n`);
      return downloadedFile;

    } catch (error) {
      console.error(`   ❌ Error downloading: ${error.message}\n`);
      return null;
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

      console.log('   🖱️  Right-clicking on item using mouse movement method...');
      // Use mouse movement method for right-click (same as Method 2 for reliability)
      await this.page.mouse.move(linkData.x, linkData.y);
      await this.page.waitForTimeout(100);
      // Perform right-click
      await this.page.mouse.down({ button: 'right' });
      await this.page.waitForTimeout(50);
      await this.page.mouse.up({ button: 'right' });
      
      // Wait 2s for context menu to fully render
      console.log('   ⏳ Waiting for context menu to appear...');
      await this.page.waitForTimeout(2000);

      // Find and click "Sử dụng lại câu lệnh" button with mouse movement method
      const reuseClicked = await this.page.evaluate(() => {
        const menuItems = document.querySelectorAll('[role="menuitem"]');
        
        for (const item of menuItems) {
          const text = item.textContent.toLowerCase();
          const hasUndoIcon = item.innerHTML.includes('undo');
          
          // Look for "sử dụng lại" text and undo icon
          if ((text.includes('sử dụng lại') || text.includes('reuse')) && hasUndoIcon) {
            const rect = item.getBoundingClientRect();
            console.log(`[REUSE] Found button: "${item.textContent.trim()}"`);
            return {
              found: true,
              x: Math.round(rect.left + rect.width / 2),
              y: Math.round(rect.top + rect.height / 2)
            };
          }
        }
        
        // Fallback: just look for text match
        for (const item of menuItems) {
          const text = item.textContent.toLowerCase();
          if (text.includes('sử dụng lại') || text.includes('reuse') || text.includes('dùng lại')) {
            const rect = item.getBoundingClientRect();
            console.log(`[REUSE] Found button (text only): "${item.textContent.trim()}"`);
            return {
              found: true,
              x: Math.round(rect.left + rect.width / 2),
              y: Math.round(rect.top + rect.height / 2)
            };
          }
        }
        
        console.log('[REUSE] Available menuitem options:');
        menuItems.forEach(item => {
          console.log(`  - "${item.textContent.trim()}"`);
        });
        
        return { found: false };
      });

      if (!reuseClicked.found) {
        console.log('   ⚠️  "Sử dụng lại câu lệnh" option not found');
        return false;
      }

      // Click the reuse button using mouse movement method (Method 2) for reliability
      console.log('   🖱️  Clicking "Sử dụng lại câu lệnh" with mouse movement...');
      await this.page.mouse.move(reuseClicked.x, reuseClicked.y);
      await this.page.waitForTimeout(150);
      await this.page.mouse.down();
      await this.page.waitForTimeout(100);
      await this.page.mouse.up();

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
     * Clear all text from the prompt input field (Slate editor)
     * Used after right-clicking "Sử dụng lại câu lệnh" to clear previous prompt
     * 
     * Note: execCommand doesn't work well with Slate, so we use keyboard shortcuts
     */
    console.log('   🧹 Clearing prompt text...');

    try {
      // Focus the textbox first
      await this.page.focus('[role="textbox"][data-slate-editor="true"]');
      await this.page.waitForTimeout(200);
      
      // Select all text using Ctrl+A (keyboard shortcut - more reliable than execCommand)
      await this.page.keyboard.press('Control+A');
      await this.page.waitForTimeout(100);
      
      // Delete selected text
      await this.page.keyboard.press('Delete');
      await this.page.waitForTimeout(300);
      
      // Verify text is cleared
      const remaining = await this.page.evaluate(() => {
        const textbox = document.querySelector('[role="textbox"][data-slate-editor="true"]');
        if (!textbox) return -1;
        
        const text = textbox.textContent || textbox.innerText || '';
        return text.trim().length;
      });

      if (remaining === 0) {
        console.log('   ✓ Prompt text cleared completely');
        return true;
      } else if (remaining === -1) {
        console.log('   ⚠️  Textbox not found, but continuing...');
        return true;
      } else {
        console.log(`   ⚠️  ${remaining} chars may remain, attempting again...`);
        
        // Try again with more aggressive clearing
        await this.page.keyboard.press('Control+A');
        await this.page.waitForTimeout(100);
        await this.page.keyboard.press('Backspace');
        await this.page.waitForTimeout(200);
        
        console.log('   ✓ Prompt cleared (second attempt)');
        return true;
      }

    } catch (error) {
      console.error(`   ❌ Error clearing: ${error.message}`);
      console.log('   ⚠️  Continuing anyway...');
      return true;  // Continue anyway, might still work
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
    
    console.log(`\n${'═'.repeat(80)}`);
    console.log(`📊 MULTI-IMAGE GENERATION: ${prompts.length} images`);
    console.log(`${'═'.repeat(80)}\n`);

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
        console.log(`\n${'═'.repeat(80)}`);
        console.log(`🎨 PROMPT ${i + 1}/${prompts.length}: Processing`);
        console.log(`${'═'.repeat(80)}\n`);

        const prompt = prompts[i];
        
        // Validate prompt is a non-empty string
        if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
          console.error(`❌ PROMPT ${i + 1} INVALID: Expected non-empty string, got:`, {
            type: typeof prompt,
            value: prompt,
            length: prompt?.length || 'undefined'
          });
          results.push({
            success: false,
            imageNumber: i + 1,
            error: `Invalid prompt: expected non-empty string, got ${typeof prompt}`
          });
          throw new Error(`Invalid prompt at index ${i}: ${typeof prompt}`);
        }
        
        const isLastPrompt = (i === prompts.length - 1);

        try {
          // STEP 0: Capture initial hrefs BEFORE entering prompt (TOP 10 only)
          console.log('[STEP 0] 📎 Capturing initial hrefs (TOP 10) (BEFORE typing)...');
          const initialHrefs = await this.page.evaluate(() => {
            const links = document.querySelectorAll('[data-testid="virtuoso-item-list"] a[href]');
            const hrefs = [];
            // Get first 10 links only (newly generated/uploaded always pushed to top)
            for (let i = 0; i < Math.min(10, links.length); i++) {
              hrefs.push(links[i].getAttribute('href'));
            }
            return hrefs;
          });
          console.log(`[STEP 0] ✓ Captured TOP 10 baseline hrefs (before any changes)\n`);

          // STEP A: Enter prompt
          console.log(`[STEP A] 📝 Entering prompt (${prompt.length} chars)...`);
          const normalizedPrompt = prompt.normalize('NFC');
          await this.enterPrompt(normalizedPrompt);
          console.log('[STEP A] ✓ Prompt entered\n');

          // STEP B: Click generate button
          console.log('[STEP B] 🚀 Clicking generate button...');
          await this.clickCreate();

          // STEP C: Wait for NEW generation to complete with href monitoring
          console.log('[STEP C] ⏳ Waiting for NEW generation to complete (max 120s)...');
          console.log('[STEP C] 📊 Monitoring hrefs for NEW image (checking ~every 1 second)...\n');
          
          const startTime = Date.now();
          const timeoutMs = this.options.timeouts.generation || 120000;
          let generationDetected = false;
          let monitoringAttempt = 0;
          const maxMonitoringAttempts = Math.ceil(timeoutMs / 1000);

          // Monitor for NEW image (similar to uploadImages approach)
          while (!generationDetected && monitoringAttempt < maxMonitoringAttempts) {
            monitoringAttempt++;

            const result = await this.page.evaluate((oldHrefs) => {
              const links = document.querySelectorAll('[data-testid="virtuoso-item-list"] a[href]');
              
              // Check TOP 10 links only (new items always pushed to top)
              for (let i = 0; i < Math.min(10, links.length); i++) {
                const currentHref = links[i].getAttribute('href');
                
                // If this href is NOT in old list, it's a NEW one
                if (!oldHrefs.includes(currentHref)) {
                  return { found: true, newHref: currentHref, position: i };
                }
              }
              return { found: false };
            }, initialHrefs);
            
            if (result.found) {
              console.log(`   ✅ NEW item detected at position #${result.position}! New image confirmed.\n`);
              lastGeneratedHref = result.newHref;
              generationDetected = true;
              break;
            }

            // Log progress every 10 attempts
            if (monitoringAttempt % 10 === 0 && monitoringAttempt > 0) {
              console.log(`   [GENERATION] Attempt ${monitoringAttempt}/${maxMonitoringAttempts} (elapsed: ${(monitoringAttempt).toFixed(0)}s)`);
            }

            await this.page.waitForTimeout(1000);
          }

          if (!generationDetected) {
            throw new Error(`Generation timeout: No NEW href detected after ${monitoringAttempt}s`);
          }

          const elapsedSecs = ((Date.now() - startTime) / 1000).toFixed(1);
          console.log(`[STEP C] ✅ NEW generation detected in ${elapsedSecs}s`);
          console.log(`[STEP C] ✓ Generated href: ${lastGeneratedHref?.substring(0, 60)}...\n`);

          // Wait for image to fully load in the UI (thumbnail, preview, context menu ready)
          // This ensures the download option is available in the context menu
          console.log('[STEP C.5] ⏳ Waiting for image UI to fully render (3 seconds)...');
          await this.page.waitForTimeout(3000);
          console.log('[STEP C.5] ✅ Image ready for download\n');

          // STEP D: Download the generated image/video
          console.log('[STEP D] ⬇️  Downloading generated ' + (this.type === 'image' ? 'image' : 'video') + '...');
          
          let downloadedFile = await this.downloadItemViaContextMenu(lastGeneratedHref);
          
          if (!downloadedFile) {
            throw new Error('Failed to download generated ' + (this.type === 'image' ? 'image' : 'video'));
          }
          
          // RENAME downloaded file to include image number to prevent collisions
          // when multiple images are downloaded in same session
          const fileExt = path.extname(downloadedFile);
          const fileName = path.basename(downloadedFile, fileExt);
          const imageNum = String(i + 1).padStart(2, '0');  // 01, 02, etc.
          const renamedFileName = `${fileName}-img${imageNum}${fileExt}`;
          const renamedFilePath = path.join(path.dirname(downloadedFile), renamedFileName);
          
          try {
            fs.renameSync(downloadedFile, renamedFilePath);
            downloadedFile = renamedFilePath;
            console.log(`[STEP D] 📂 Renamed to: ${renamedFileName}`);
          } catch (renameErr) {
            console.log(`[STEP D] ⚠️  Could not rename file: ${renameErr.message}`);
            // Continue with original name
          }
          
          console.log(`[STEP D] ✅ Download complete: ${path.basename(downloadedFile)}\n`);

          // STEP E: If NOT last, reuse command. If last, skip reuse
          if (!isLastPrompt) {
            // NOT LAST PROMPT: Reuse command for next prompt
            console.log('[STEP E] 🔄 NOT LAST PROMPT - Reusing for next...');
            
            const reuseSuccess = await this.rightClickReuseCommand(lastGeneratedHref);
            if (!reuseSuccess) {
              throw new Error('Failed to reuse command');
            }

            const clearSuccess = await this.clearPromptText();
            if (!clearSuccess) {
              console.log('[STEP E] ⚠️  Clear may have issues, but continuing...');
            }

            console.log('[STEP E] ✅ Ready for next prompt\n');
          } else {
            // IS LAST PROMPT: No reuse needed
            console.log('[STEP E] 🎯 LAST PROMPT - Generation and download complete\n');
          }
          
          results.push({
            success: true,
            imageNumber: i + 1,
            href: lastGeneratedHref,
            downloadedFile: downloadedFile,
            action: isLastPrompt ? 'downloaded' : 'downloaded_and_reused'
          });

        } catch (generationError) {
          console.error(`\n❌ PROMPT ${i + 1} FAILED: ${generationError.message}\n`);
          results.push({
            success: false,
            imageNumber: i + 1,
            error: generationError.message
          });
          throw generationError;
        }
      }

      // STEP F: Create assets and log results
      console.log(`\n${'═'.repeat(70)}`);
      console.log(`📁 STEP F: Creating assets and logging results`);
      console.log(`${'═'.repeat(70)}\n`);

      const downloadedFiles = results
        .filter(r => r.success && r.downloadedFile)
        .map(r => r.downloadedFile);

      console.log(`   📊 Downloaded files: ${downloadedFiles.length}`);
      downloadedFiles.forEach((file, idx) => {
        console.log(`     [${idx + 1}] ${path.basename(file)}`);
      });
      console.log('');

      // Log session results
      const sessionLog = {
        timestamp: new Date().toISOString(),
        type: this.type,
        count: downloadedFiles.length,
        files: downloadedFiles.map(f => ({
          path: f,
          name: path.basename(f),
          size: fs.statSync(f).size
        })),
        results: results
      };

      console.log('   📋 Session log:');
      console.log(JSON.stringify(sessionLog, null, 2));
      console.log('');

      // Save session log to file
      const logFilePath = path.join(this.options.outputDir, `session-${Date.now()}.json`);
      fs.writeFileSync(logFilePath, JSON.stringify(sessionLog, null, 2));
      console.log(`   ✅ Session log saved: ${path.basename(logFilePath)}\n`);

      // Close browser when done
      await this.close();

      // Return overall results with downloadedFiles list
      const successCount = results.filter(r => r.success).length;
      console.log(`\n${'═'.repeat(70)}`);
      console.log(`✅ COMPLETE: ${successCount}/${results.length} successful`);
      console.log(`📁 Output directory: ${this.options.outputDir}`);
      console.log(`${'═'.repeat(70)}\n`);

      return {
        success: successCount === results.length,
        results: results,
        totalGenerated: successCount,
        totalRequested: results.length,
        downloadedFiles: downloadedFiles,
        sessionLog: logFilePath
      };

    } catch (error) {
      console.error(`❌ Multi-generation failed: ${error.message}`);
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

