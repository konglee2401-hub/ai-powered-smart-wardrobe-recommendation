/**
 * ImageGenerationService - Updated for NEW Google Flow UI
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
puppeteer.use(StealthPlugin());

class ImageGenerationAutomationNew {
  constructor(options = {}) {
    this.browser = null;
    this.page = null;
    this.options = {
      headless: false,
      sessionFilePath: path.join(__dirname, '../.sessions/google-flow-session.json'),
      baseUrl: 'https://labs.google/fx/vi/tools/flow',
      projectId: options.projectId || null,
      aspectRatio: options.aspectRatio || '9:16',
      imageCount: options.imageCount || 1,
      model: options.model || 'Nano Banana Pro',
      outputDir: options.outputDir || path.join(__dirname, '../temp/image-generation-outputs'),
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
    console.log('🚀 Initializing Image Generation Service...\n');

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
    console.log('✍️  ENTERING PROMPT\n');
    console.log(`   Prompt: "${prompt.substring(0, 80)}"\n`);

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

      // Type using keyboard (with 15ms delay between characters)
      // This triggers Slate editor's native input handlers
      console.log('   ⌨️  Typing prompt via keyboard...');
      await this.page.keyboard.type(prompt, { delay: 15 });
      console.log(`   ✓ Typed ${prompt.length} characters\n`);

      // Wait for React/Vue framework to process keyboard input
      console.log('   ⏳ Waiting for framework to process input...');
      await this.page.waitForTimeout(2000);
      console.log('   ✓ Framework processing complete\n');

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
      console.log('   ✓ Events dispatched\n');

      console.log('   ✓ Prompt entered and submitted to framework\n');

    } catch (error) {
      console.error(`   ❌ Error entering prompt: ${error.message}`);
      throw error;
    }
  }

  async configureSettings() {
    console.log('⚙️  CONFIGURING SETTINGS\n');

    // First, click settings button to open menu (with retry)
    console.log('   🔧 Opening settings menu...');
    let settingsOpened = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`   Attempt ${attempt}/3 to click settings button...`);
      const clicked = await this.clickSettingsButton();
      if (clicked) {
        settingsOpened = true;
        console.log('   ✓ Settings menu opened\n');
        break;
      }
      if (attempt < 3) {
        console.log('   ⏳ Settings button click failed, retrying in 800ms...');
        await this.page.waitForTimeout(800);
      }
    }

    if (!settingsOpened) {
      console.log('   ❌ CRITICAL: Could not open settings menu after 3 attempts!');
      throw new Error('Failed to open settings menu');
    }

    console.log('   📸 Ensuring IMAGE mode is selected...');
    await this.selectTab('Image');
    await this.page.waitForTimeout(500);

    const isVertical = this.options.aspectRatio.includes('9:16');
    const orientationLabel = isVertical ? 'Dọc' : 'Ngang';
    console.log(`   📱 Selecting ${orientationLabel} (${this.options.aspectRatio})...`);
    await this.selectTab(orientationLabel);
    await this.page.waitForTimeout(this.options.timeouts.tabSwitch);

    const quantityLabel = `x${this.options.imageCount}`;
    console.log(`   📊 Selecting quantity: ${quantityLabel}...`);
    await this.selectTab(quantityLabel);
    await this.page.waitForTimeout(this.options.timeouts.tabSwitch);

    console.log('   ✓ Settings configured\n');
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

      console.log('   ✓ Generate button clicked\n');
      await this.page.waitForTimeout(1000);

    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      throw error;
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

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  /**
   * Generate multiple images sequentially with different prompts
   * Used for TikTok affiliate flow: wearing image + holding image
   */
  async generateMultiple(characterImagePath, productImagePath, prompts) {
    console.log(`\n📊 MULTI-IMAGE GENERATION: ${prompts.length} images\n`);

    const results = [];

    try {
      // Initialize browser session
      await this.init();
      console.log('✅ Browser initialized\n');

      // Navigate to Google Flow project
      console.log('🔗 Navigating to Google Flow...');
      await this.navigateToFlow();
      console.log('✅ Navigated to project\n');

      // Wait for page to be fully ready
      console.log('⏳ Waiting for page to load...');
      await this.waitForPageReady();
      console.log('✅ Page ready\n');

      // Configure settings (select Image tab, aspect ratio, etc.)
      console.log('⚙️  Configuring settings...');
      await this.configureSettings();
      console.log('✅ Settings configured\n');

      // Log existing images BEFORE upload
      console.log('📸 Logging existing images in collection...');
      const existingImages = await this.page.evaluate(() => {
        const virtuosoList = document.querySelector('[data-testid="virtuoso-item-list"]');
        if (!virtuosoList) return [];

        const row0 = virtuosoList.querySelector('[data-index="0"]');
        if (!row0) return [];

        const images = row0.querySelectorAll('img');
        const urls = Array.from(images).slice(0, 2).map(img => img.src);
        
        console.log(`[EXISTING] Found ${images.length} images total in collection`);
        urls.forEach((url, idx) => {
          console.log(`[EXISTING] Image ${idx + 1}:\n${url}`);
        });
        
        return urls;
      });

      if (existingImages.length < 2) {
        console.log('⚠️  WARNING: Less than 2 existing images found - upload detection may be affected\n');
      } else {
        console.log(`✅ Existing images logged (${existingImages.length} images)\n`);
      }

      // Upload both images once
      console.log('📤 Uploading reference images...');
      await this.uploadImages(characterImagePath, productImagePath, existingImages);
      console.log('✅ Images uploaded\n');

      // Generate each image with different prompt
      for (let i = 0; i < prompts.length; i++) {
        console.log(`\n${'═'.repeat(70)}`);
        console.log(`🎨 IMAGE ${i + 1}/${prompts.length}`);
        console.log(`${'═'.repeat(70)}\n`);

        const prompt = prompts[i];

        try {
          // Enter prompt
          console.log(`📝 Entering prompt (${prompt.length} chars)...`);
          await this.enterPrompt(prompt);
          console.log('✓ Prompt entered\n');

          // Configure settings
          console.log('⚙️  Configuring options...');
          await this.configureSettings();
          console.log('✓ Settings configured\n');

          // Click create to start generation
          console.log('🚀 Starting generation...');
          await this.clickCreate();

          // Monitor generation - wait for image to appear in collection
          console.log('⏳ Waiting for generation to complete (max 120s)...');
          
          let generatedImageUrl = null;
          let previousUrl = null;

          // First, get the current image URL if it exists (to detect when new image appears)
          previousUrl = await this.page.evaluate(() => {
            const img = document.querySelector('[data-testid="virtuoso-item-list"] [data-index="1"] img');
            return img ? img.src : null;
          });

          // Wait for generation and NEW image to appear
          await this.page.waitForFunction(
            async () => {
              const currentUrl = await this.page.evaluate(() => {
                const img = document.querySelector('[data-testid="virtuoso-item-list"] [data-index="1"] img');
                return img && img.src && !img.src.includes('placeholder') ? img.src : null;
              });

              // If we have a URL and it's different from before, generation is complete
              if (currentUrl && (!previousUrl || currentUrl !== previousUrl)) {
                generatedImageUrl = currentUrl;
                previousUrl = currentUrl;
                return true;
              }

              // First generation - just check for any valid URL
              if (!previousUrl && currentUrl) {
                generatedImageUrl = currentUrl;
                previousUrl = currentUrl;
                return true;
              }

              return false;
            },
            { timeout: this.options.timeouts.generation }
          );

          console.log('✅ Generation complete\n');

          // Get final image URL
          const imageUrl = await this.page.evaluate(() => {
            const img = document.querySelector('[data-testid="virtuoso-item-list"] [data-index="1"] img');
            return img ? img.src : null;
          });

          if (!imageUrl) {
            throw new Error('Could not capture image URL');
          }

          // Download image to local file
          console.log('📥 Downloading generated image...');
          const downloadedPath = await this.downloadImageUrl(imageUrl, i + 1);
          console.log(`✓ Downloaded to: ${downloadedPath}\n`);

          // Store result
          results.push({
            success: true,
            imageNumber: i + 1,
            imageUrl: imageUrl,
            screenshotPath: downloadedPath,
            downloadedAt: new Date().toISOString(),
            prompt: prompt
          });

          console.log(`✅ Image ${i + 1} generated and downloaded\n`);

          // Wait before next generation
          if (i < prompts.length - 1) {
            console.log('⏱️  Waiting before next generation...');
            await this.page.waitForTimeout(2000);
          }

        } catch (generationError) {
          console.error(`❌ Image ${i + 1} generation failed: ${generationError.message}`);

          results.push({
            success: false,
            imageNumber: i + 1,
            error: generationError.message,
            prompt: prompt
          });

          // Continue to next image instead of failing completely
          if (i < prompts.length - 1) {
            console.log('⏱️  Continuing to next image...');
            await this.page.waitForTimeout(1000);
          }
        }
      }

      // Close browser
      await this.close();

      // Return overall results
      const successCount = results.filter(r => r.success).length;
      console.log(`\n${'═'.repeat(70)}`);
      console.log(`📊 MULTI-GENERATION COMPLETE: ${successCount}/${results.length} successful`);
      console.log(`${'═'.repeat(70)}\n`);

      return {
        success: successCount === results.length,
        results: results,
        totalGenerated: successCount,
        totalRequested: results.length
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

  /**
   * Download image from URL and save to local file
   */
  async downloadImageUrl(imageUrl, imageIndex) {
    try {
      const axiosModule = await import('axios');
      const axios = axiosModule.default;
      
      // Create filename
      const filename = `generated-image-${imageIndex}-${Date.now()}.png`;
      const filepath = path.join(this.options.outputDir, filename);

      // Download image
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      // Write to file
      fs.writeFileSync(filepath, response.data);
      console.log(`   Saved to: ${filepath}`);

      return filepath;
    } catch (error) {
      throw new Error(`Failed to download image: ${error.message}`);
    }
  }
}

export default ImageGenerationAutomationNew;

