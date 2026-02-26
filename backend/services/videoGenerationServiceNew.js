/**
 * VideoGenerationServiceNew - Updated for NEW Google Flow UI
 * 
 * NEW UI Structure (same as Image Generation):
 * - Upload images first on IMAGE tab (or reuse from previous step)
 * - Switch to VIDEO tab
 * - VIDEO tabs: IMAGE (reference) / VIDEO (actual generation)
 *            & VIDEO_REFERENCES (Ingredients) / VIDEO_FRAMES (Frames)
 * - Portrait/Landscape (Dọc/Ngang) tabs
 * - x1/x2/x3/x4 quantity tabs
 * - Model selector (Veo 3.1, etc)
 * - Create button (arrow_forward icon)
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
puppeteer.use(StealthPlugin());

class VideoGenerationServiceNew {
  constructor(options = {}) {
    this.browser = null;
    this.page = null;
    this.options = {
      headless: false,
      sessionFilePath: path.join(__dirname, '../.sessions/google-flow-session.json'),
      baseUrl: 'https://labs.google/fx/vi/tools/flow',
      projectId: options.projectId || null, // Project ID for direct project navigation
      aspectRatio: options.aspectRatio || '9:16', // Default: vertical for TikTok
      videoCount: options.videoCount || 1,
      model: options.model || 'Veo 3.1 - Fast',
      outputDir: options.outputDir || path.join(__dirname, '../temp/video-generation-outputs'),
      timeouts: {
        pageLoad: 30000,
        tabSwitch: 2000,
        upload: 10000,
        prompt: 3000,
        generation: 300000, // 5 minutes for video
        ...options.timeouts
      },
      ...options
    };
  }

  async init() {
    console.log('🚀 Initializing Video Generation Service...\n');

    // Setup output directory
    if (!fs.existsSync(this.options.outputDir)) {
      fs.mkdirSync(this.options.outputDir, { recursive: true });
    }

    // Launch browser
    // Use headless: 'new' for better clipboard and security feature support
    const headlessMode = this.options.headless === true ? 'new' : this.options.headless;
    this.browser = await puppeteer.launch({
      headless: headlessMode,
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });

    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1280, height: 720 });

    // Setup downloads
    const client = await this.page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: this.options.outputDir
    });

    // Load session
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
        return true;
      }
    } catch (error) {
      console.warn('⚠️  No session found - will need manual login');
    }
    return false;
  }

  async navigateToFlow() {
    console.log('🌐 Navigating to Google Flow...\n');
    
    // Use project URL if projectId is provided, otherwise use base URL
    const url = this.options.projectId 
      ? `https://labs.google/fx/vi/tools/flow/project/${this.options.projectId}`
      : this.options.baseUrl;
    
    console.log(`   Target URL: ${url}\n`);
    
    await this.page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: this.options.timeouts.pageLoad
    });

    // Check if logged in
    const isLoggedIn = await this.page.evaluate(() => {
      const bodyText = document.body.innerText.toLowerCase();
      return !bodyText.includes('sign in') && !bodyText.includes('try signing in');
    });

    if (!isLoggedIn) {
      throw new Error('Not logged in - please login first');
    }

    // Wait for page elements to be ready
    await this.waitForPageReady();

    console.log('✅ Google Flow loaded and logged in\n');
  }

  async waitForPageReady() {
    /**
     * Wait for page to fully load with all UI elements ready
     * Retry up to 10 times with 1.5 second delay between retries
     */
    console.log('⏳ Waiting for page elements to load...');
    
    let pageReady = false;
    let attempts = 0;
    const maxAttempts = 10;
    const retryDelay = 1500; // 1.5 seconds

    while (!pageReady && attempts < maxAttempts) {
      attempts++;
      
      const pageState = await this.page.evaluate(() => {
        const fileInput = document.querySelector('input[type="file"]');
        const buttons = document.querySelectorAll('button');
        const prompts = document.querySelectorAll('[contenteditable="true"]');
        const visibleButtons = Array.from(buttons).filter(b => {
          const style = window.getComputedStyle(b);
          return style.display !== 'none' && style.visibility !== 'hidden';
        });

        return {
          hasFileInput: !!fileInput,
          totalButtons: buttons.length,
          visibleButtons: visibleButtons.length,
          prompts: prompts.length,
          bodyText: document.body.innerText.length
        };
      });

      // Page is ready if has basics elements
      // Less strict: just need at least some buttons OR file input OR prompts
      pageReady = pageState.hasFileInput || 
                  (pageState.totalButtons > 5 && pageState.prompts > 0) ||
                  pageState.bodyText > 1000;

      console.log(`   Attempt ${attempts}: buttons=${pageState.totalButtons}, visible=${pageState.visibleButtons}, input=${pageState.hasFileInput}, prompts=${pageState.prompts}`);

      if (!pageReady) {
        console.log(`   ⏳ Not ready yet, waiting ${retryDelay}ms...`);
        await this.page.waitForTimeout(retryDelay);
      }
    }

    if (!pageReady) {
      throw new Error(`Page elements not ready after ${maxAttempts} attempts`);
    }

    console.log(`   ✅ Page ready (attempt ${attempts})\n`);
  }

  async uploadReferenceImage(refImagePath) {
    /**
     * Upload reference image for video generation
     * (used as base/ingredient)
     */
    console.log('\n🎥 UPLOADING REFERENCE IMAGE\n');

    // Check if file exists
    if (!fs.existsSync(refImagePath)) {
      throw new Error(`Reference image not found: ${refImagePath}`);
    }

    // Make sure we're on IMAGE tab
    await this.selectMainTab('Image');
    await this.page.waitForTimeout(this.options.timeouts.tabSwitch);

    try {
      // ===== STEP 1: Mark initial image URL (data-index 0 only) =====
      console.log('   📝 Marking initial image URL in data-index 0...');
      const initialUrl = await this.page.evaluate(() => {
        const virtuosoList = document.querySelector('[data-testid="virtuoso-item-list"]');
        if (!virtuosoList) return null;
        
        const img0 = virtuosoList.querySelector('[data-index="0"] img');
        return img0 ? img0.src : null;
      });
      console.log(`   ✓ Initial URL marked\n`);

      // ===== STEP 2: Find input[type="file"] on page =====
      console.log('   🔍 Searching for file input on page...');
      const fileInputFound = await this.page.evaluate(() => {
        const inputs = document.querySelectorAll('input[type="file"]');
        return inputs.length > 0;
      });

      if (!fileInputFound) {
        throw new Error('ERROR: No file input found on page');
      }
      console.log('   ✓ File input found\n');

      // ===== STEP 3: Upload file to input =====
      console.log('   📤 Uploading reference image...');
      const input = await this.page.$('input[type="file"]');
      if (!input) {
        throw new Error('Could not get file input element');
      }

      await input.uploadFile(refImagePath);
      console.log(`   ✓ File uploaded\n`);

      // ===== STEP 4: Trigger change event =====
      console.log('   🚀 Triggering upload...');
      await this.page.evaluate(() => {
        const fileInput = document.querySelector('input[type="file"]');
        if (fileInput) {
          const event = new Event('change', { bubbles: true });
          fileInput.dispatchEvent(event);
        }
      });
      console.log('   ✓ Change event triggered\n');

      // ===== STEP 5: Monitor data-index 0 for new image =====
      console.log('   👁️  Monitoring data-index 0 for new image...');
      
      await this.page.waitForFunction(
        () => {
          const virtuosoList = document.querySelector('[data-testid="virtuoso-item-list"]');
          if (!virtuosoList) return false;
          
          const row0 = virtuosoList.querySelector('[data-index="0"]');
          if (!row0) return false;
          
          // Check for image container class cqKjBB or hsjOQX
          return (row0.querySelector('.cqKjBB') || row0.querySelector('.hsjOQX')) ? true : false;
        },
        { timeout: 0 }
      );
      console.log('   ✓ Images detected!\n');

      // ===== STEP 6: Open modal to select image =====
      console.log('   📂 Opening image selection modal...');
      const modalOpened = await this.page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          const icon = btn.querySelector('[font-size="1.35rem"]');
          if (icon && icon.textContent.includes('add_2')) {
            btn.click();
            return true;
          }
        }
        return false;
      });

      if (!modalOpened) throw new Error('Could not open modal');
      await this.page.waitForTimeout(1000);
      console.log('   ✓ Modal opened\n');

      // ===== STEP 7: Click "Recently Used" (find by class hQVuIq) =====
      console.log('   🔄 Clicking "Recently Used"...');
      const recentlyUsedClicked = await this.page.evaluate(() => {
        const dialog = document.querySelector('[role="dialog"]');
        if (!dialog) return false;
        
        const btn = dialog.querySelector('.hQVuIq');
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      });
      
      if (!recentlyUsedClicked) throw new Error('Could not find Recently Used');
      await this.page.waitForTimeout(1500);
      console.log('   ✓ Recently Used opened\n');

      // ===== STEP 8: Click "Mới nhất" =====
      console.log('   🆕 Selecting "Mới nhất"...');
      const newestClicked = await this.page.evaluate(() => {
        const menuItems = document.querySelectorAll('button[role="menuitem"]');
        for (const btn of menuItems) {
          if (btn.textContent.includes('Mới nhất')) {
            btn.click();
            return true;
          }
        }
        return false;
      });

      if (!newestClicked) throw new Error('Could not find Mới nhất');
      await this.page.waitForTimeout(1000);
      console.log('   ✓ Newest shown\n');

      // ===== STEP 9: Select the image =====
      console.log('   ☑️  Selecting image...');
      const imageSelected = await this.page.evaluate(() => {
        const allDivs = document.querySelectorAll('div[role="button"]');
        for (const div of allDivs) {
          const img = div.querySelector('img');
          if (img && img.src && img.src.includes('media')) {
            div.click();
            return true;
          }
        }
        return false;
      });

      if (!imageSelected) throw new Error('Could not select image');
      await this.page.waitForTimeout(600);

      // Click confirm button
      const confirmClicked = await this.page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          const text = btn.textContent.toLowerCase();
          if (text.includes('select') || text.includes('chọn')) {
            btn.click();
            return true;
          }
        }
        return false;
      });

      if (!confirmClicked) throw new Error('Could not click confirm button');
      await this.page.waitForTimeout(800);
      console.log('   ✓ Image selected\n');

      // Close modal
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(500);

      console.log('✅ Reference image uploaded and selected!\n');

    } catch (error) {
      console.error(`\n❌ UPLOAD FAILED: ${error.message}`);
      if (this.browser) await this.browser.close();
      process.exit(1);
    }
  }

  async switchToVideoMode() {
    /**
     * ✅ NEW: Switch to VIDEO generation mode
     * Flow:
     * 1. Click IMAGE tab → should show IMAGE mode options
     * 2. Click VIDEO tab in second row → video-specific options
     * 3. Select VIDEO_REFERENCES (Ingredients) tab
     */
    console.log('🎬 SWITCHING TO VIDEO MODE\n');

    // Step 1: Click main VIDEO tab
    console.log('   📹 Clicking VIDEO tab (first row)...');
    await this.selectMainTab('Video');
    await this.page.waitForTimeout(this.options.timeouts.tabSwitch);
    console.log('       ✓ VIDEO tab active');

    // Step 2: Click VIDEO_REFERENCES (Ingredients) tab
    console.log('   📋 Clicking VIDEO_REFERENCES (Ingredients) tab...');
    await this.selectVideoSubTab('Ingredients');
    await this.page.waitForTimeout(this.options.timeouts.tabSwitch);
    console.log('       ✓ VIDEO_REFERENCES tab active');

    console.log('✅ Video mode ready\n');
  }

  async selectMainTab(label) {
    /**
     * Select from first row of tabs:
     * - IMAGE (has image icon)
     * - VIDEO (has videocam icon)
     */
    const selected = await this.page.evaluate((targetLabel) => {
      const buttons = document.querySelectorAll('button[role="tab"]');
      for (const btn of buttons) {
        if (btn.textContent.includes(targetLabel)) {
          // Check if this is likely the first row (has icon indicators)
          const icon = btn.querySelector('i');
          if (icon) {
            btn.click();
            return true;
          }
        }
      }
      return false;
    }, label);

    return selected;
  }

  async selectVideoSubTab(label) {
    /**
     * Select from second row of tabs (within VIDEO mode):
     * - Ingredients (SOURCE tab - has chrome_extension icon)
     * - Frames (FRAMES tab - has crop_free icon)
     * ⚠️  OLD: These were VIDEO_REFERENCES / VIDEO_FRAMES
     */
    const selected = await this.page.evaluate((targetLabel) => {
      const buttons = document.querySelectorAll('button[role="tab"]');
      let found = false;

      // Find all buttons and look for the tab with matching label
      for (const btn of buttons) {
        if (btn.textContent.includes(targetLabel)) {
          btn.click();
          found = true;
          break;
        }
      }

      return found;
    }, label);

    return selected;
  }

  async enterPrompt(prompt) {
    console.log('✍️  ENTERING VIDEO PROMPT\n');
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
    console.log('⚙️  CONFIGURING VIDEO SETTINGS\n');

    // ========== ENSURE VIDEO TAB IS SELECTED ==========
    console.log('   🎬 Ensuring VIDEO mode is selected...');
    const videoTabClicked = await this.mainTabSelect('Video');
    if (videoTabClicked) {
      console.log('       ✓ VIDEO mode confirmed');
    }
    await this.page.waitForTimeout(500);

    // ========== SELECT PORTRAIT/VERTICAL ==========
    const isVertical = this.options.aspectRatio.includes('9:16');
    const orientationLabel = isVertical ? 'Dọc' : 'Ngang';
    console.log(`   📱 Selecting ${orientationLabel} (${this.options.aspectRatio})...`);
    await this.selectOrientationTab(orientationLabel);
    await this.page.waitForTimeout(this.options.timeouts.tabSwitch);
    console.log(`       ✓ ${orientationLabel} mode selected`);

    // ========== SELECT QUANTITY ==========
    const quantityLabel = `x${this.options.videoCount}`;
    console.log(`   📊 Selecting quantity: ${quantityLabel}...`);
    await this.selectQuantityTab(quantityLabel);
    await this.page.waitForTimeout(this.options.timeouts.tabSwitch);
    console.log(`       ✓ Quantity set to ${quantityLabel}`);

    console.log('   ✓ Settings configured\n');
  }

  async mainTabSelect(label) {
    /**
     * Select main tabs: Image, Video
     */
    const selected = await this.page.evaluate((targetLabel) => {
      const buttons = document.querySelectorAll('button[role="tab"]');
      for (const btn of buttons) {
        if (btn.textContent.includes(targetLabel) && btn.id?.includes(targetLabel.toUpperCase())) {
          if (btn.getAttribute('aria-selected') === 'true') {
            return true; // Already selected
          }
          btn.click();
          return true;
        }
      }
      return false;
    }, label);

    return selected;
  }

  async selectOrientationTab(label) {
    /**
     * Find and click tab with Dọc (9:16) or Ngang (16:9)
     * These tabs have icons: crop_9_16 (Dọc) / crop_16_9 (Ngang)
     */
    const selected = await this.page.evaluate((targetLabel) => {
      const buttons = document.querySelectorAll('button[role="tab"]');
      for (const btn of buttons) {
        const btnText = btn.textContent.trim();
        if (btnText === targetLabel || btnText.includes(targetLabel)) {
          if (btn.getAttribute('aria-selected') === 'true') {
            return true; // Already selected
          }
          btn.click();
          return true;
        }
      }
      return false;
    }, label);

    return selected;
  }

  async selectQuantityTab(label) {
    /**
     * Find and click tab with x1, x2, x3, x4
     * These are simple text buttons
     */
    const selected = await this.page.evaluate((targetLabel) => {
      const buttons = document.querySelectorAll('button[role="tab"]');
      for (const btn of buttons) {
        const btnText = btn.textContent.trim();
        if (btnText === targetLabel) {
          if (btn.getAttribute('aria-selected') === 'true') {
            return true; // Already selected
          }
          btn.click();
          return true;
        }
      }
      return false;
    }, label);

    return selected;
  }

  async selectModel(modelName = 'Veo 3.1 - Fast') {
    /**
     * ✅ NEW: Model selection
     * Click the model dropdown button and select desired model
     */
    console.log(`   🤖 Selecting model: ${modelName}...`);

    const selected = await this.page.evaluate((target) => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes(target) && btn.textContent.includes('×')) {
          btn.click();
          return true;
        }
      }
      return false;
    }, modelName);

    if (!selected) {
      console.warn(`⚠️  Model not found, will use default`);
    } else {
      console.log(`       ✓ Model selected`);
    }
  }

  async clickCreate() {
    console.log('🎬 CLICKING CREATE\n');

    // Close dropdowns
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(500);

    // Click create button
    const clicked = await this.page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        const icon = btn.querySelector('[font-size="1.25rem"]');
        if (icon && icon.textContent.includes('arrow_forward')) {
          btn.click();
          return true;
        }
      }
      return false;
    });

    if (!clicked) {
      throw new Error('Could not find CREATE button');
    }

    console.log('   ✓ CREATE clicked - video generation started\n');
  }

  async waitForGeneration() {
    console.log('⏳ WAITING FOR VIDEO GENERATION\n');
    console.log('   This may take 5-15 minutes...\n');

    const startTime = Date.now();
    const maxWait = this.options.timeouts.generation;
    let lastStatus = '';
    let failureDetected = false;

    while (Date.now() - startTime < maxWait) {
      // Check for policy violation
      const hasPolicyViolation = await this.page.evaluate(() => {
        const bodyText = document.body.innerText;
        return bodyText.includes('Không thành công') || 
               bodyText.includes('vi phạm') ||
               bodyText.includes('Vui lòng thử một câu lệnh khác');
      });

      if (hasPolicyViolation) {
        console.log('   ⚠️  Policy violation detected - video rejected by Google');
        failureDetected = true;
        break;
      }

      // Check for new video at data-index="0" (top position)
      const newVideoFound = await this.page.evaluate(() => {
        const firstItem = document.querySelector('[data-index="0"]');
        if (!firstItem) return false;

        // Check if contains video result
        const video = firstItem.querySelector('video[src]');
        const link = firstItem.querySelector('a[href*="/edit/"]');
        
        return !!(video || link);
      });

      if (newVideoFound) {
        console.log('   ✅ New video detected!');
        break;
      }

      const status = await this.page.evaluate(() => {
        const bodyText = document.body.innerText.toLowerCase();

        if (bodyText.includes('generating') || bodyText.includes('đang tạo')) {
          return 'generating';
        }
        if (bodyText.includes('error') || bodyText.includes('lỗi')) {
          return 'error';
        }
        return 'processing';
      });

      if (status !== lastStatus) {
        lastStatus = status;
        console.log(`   📊 Status: ${status}`);
      }

      await this.page.waitForTimeout(5000);
    }

    if (failureDetected) {
      throw new Error('Video generation failed - policy violation');
    }

    console.log('✅ Generation complete\n');
  }

  async clickFirstResultVideo() {
    /**
     * Click on the first generated video (at data-index="0")
     * This opens the edit page showing the actual video with full details
     */
    console.log('🎥 ACCESSING RESULT VIDEO\n');
    console.log('   Clicking first result to open edit page...');

    const clicked = await this.page.evaluate(() => {
      // Find the first item container (data-index="0")
      const firstItem = document.querySelector('[data-index="0"]');
      if (!firstItem) return false;

      // Find and click the link that goes to edit page
      const editLink = firstItem.querySelector('a[href*="/edit/"]');
      if (editLink) {
        editLink.click();
        return true;
      }

      // Alternative: click the video thumbnail
      const videoBtn = firstItem.querySelector('button.sc-766dc7e2-1');
      if (videoBtn) {
        videoBtn.click();
        return true;
      }

      return false;
    });

    if (!clicked) {
      throw new Error('Could not click result video');
    }

    // Wait for navigation to edit page
    await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
    console.log('   ✓ Edit page loaded\n');
  }

  async downloadMediaFromEditPage() {
    /**
     * NEW: Download from edit page
     * Click download button → select 1K (original) → wait for download
     */
    console.log('⬇️  DOWNLOADING VIDEO\n');
    console.log('   Opening download menu...');

    // Click the download button
    const downloadClicked = await this.page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        const icon = btn.querySelector('[font-size="1.125rem"]');
        if (icon && icon.textContent.includes('download')) {
          btn.click();
          return true;
        }
      }
      return false;
    });

    if (!downloadClicked) {
      throw new Error('Download button not found');
    }

    console.log('   ✓ Download menu opened');
    await this.page.waitForTimeout(800);

    // Click "1K" (Original size) option
    console.log('   Selecting 1K (original size)...');
    const selected1K = await this.page.evaluate(() => {
      const buttons = document.querySelectorAll('[role="menuitem"]');
      for (const btn of buttons) {
        if (btn.textContent.includes('1K') && btn.textContent.includes('Original')) {
          btn.click();
          return true;
        }
      }
      return false;
    });

    if (!selected1K) {
      console.warn('   ⚠️  Could not find 1K option, trying alternative selector...');
      // Try alternative: find buttons within menu with "1K" text
      const altSelect = await this.page.evaluate(() => {
        const menuItems = document.querySelectorAll('button');
        for (const item of menuItems) {
          const text = item.textContent;
          if (text.includes('1K') && !item.hasAttribute('aria-disabled')) {
            item.click();
            return true;
          }
        }
        return false;
      });

      if (!altSelect) {
        throw new Error('Could not select 1K download option');
      }
    }

    console.log('   ✓ 1K selected');
    
    // Wait for download to complete
    await this.page.waitForTimeout(3000);
    console.log('   ✓ Download initiated\n');
  }

  async finishAndReturn() {
    /**
     * Click the "Xong" (Done) button to return to gallery
     */
    console.log('✅ FINISHING EDIT\n');
    console.log('   Clicking Done button...');

    const clicked = await this.page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes('Xong') || 
            (btn.querySelector('[font-size="1.125rem"]')?.textContent.includes('check') && 
             btn.textContent.includes('Xong'))) {
          btn.click();
          return true;
        }
      }
      return false;
    });

    if (clicked) {
      console.log('   ✓ Done clicked');
      // Wait for return navigation
      try {
        await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 })
          .catch(() => {}); // Ignore navigation errors
      } catch (e) {
        // Already back or navigation not detected
      }
      console.log('   ✓ Returned to gallery\n');
    }
  }

  async captureResults() {
    console.log('📸 CAPTURING RESULTS\n');

    try {
      // Click the first result video to enter edit page
      await this.clickFirstResultVideo();

      // Wait a moment for page to fully render
      await this.page.waitForTimeout(2000);

      // Get the video URL from the edit page
      const videoUrl = await this.page.evaluate(() => {
        // Try to get from the video element
        const video = document.querySelector('video[src]');
        if (video && video.src) {
          return video.src;
        }

        // Alternative: get from any media URL on page
        const allElements = document.querySelectorAll('[src*="media.getMediaUrlRedirect"]');
        for (const elem of allElements) {
          if (elem.src && !elem.src.includes('MEDIA_URL_TYPE_THUMBNAIL')) {
            return elem.src;
          }
        }

        return null;
      });

      if (videoUrl) {
        console.log(`   📹 Video found: ${videoUrl.substring(0, 80)}...\n`);
      }

      // Take screenshot of edit page
      const screenshotPath = path.join(this.options.outputDir, `edit-page-${Date.now()}.png`);
      await this.page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`   ✓ Screenshot: ${screenshotPath}`);

      // Download the video
      await this.downloadMediaFromEditPage();

      // Finish and return to gallery
      await this.finishAndReturn();

      return {
        screenshotPath,
        videoUrl,
        downloadedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error(`   ❌ Error capturing results: ${error.message}`);
      throw error;
    }
  }

  async generate(referenceImagePath, prompt) {
    /**
     * Main generation flow:
     * 1. Navigate to Google Flow
     * 2. Upload reference image
     * 3. Switch to video mode
     * 4. Enter prompt
     * 5. Configure settings (orientation, quantity)
     * 6. Select model
     * 7. Click create
     * 8. Wait for generation
     * 9. Capture results (click → download → done)
     */
    try {
      await this.navigateToFlow();
      await this.uploadReferenceImage(referenceImagePath);
      await this.switchToVideoMode();
      await this.enterPrompt(prompt);
      await this.configureSettings();
      await this.selectModel(this.options.model);
      await this.clickCreate();
      await this.waitForGeneration();
      const result = await this.captureResults();

      return {
        success: true,
        screenshotPath: result.screenshotPath,
        videoUrl: result.videoUrl,
        downloadedAt: result.downloadedAt,
        message: 'Video generation completed and downloaded'
      };
    } catch (error) {
      console.error(`\n❌ ERROR: ${error.message}\n`);
      return {
        success: false,
        error: error.message
      };
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }

  /**
   * Generate multiple videos while reusing uploaded reference components
   * 
   * USAGE:
   *   const service = new VideoGenerationServiceNew({headless: false});
   *   const results = await service.generateMultiple(
   *     'path/to/reference.jpg',
   *     ['person dancing', 'person waving', 'person jumping']
   *   );
   *   console.log(results); // [{ videoUrl, downloadedAt, ... }, ...]
   * 
   * PERFORMANCE:
   * - Uploads reference image ONCE
   * - Reuses components for all video generations
   * - ~3-5 seconds per additional video (vs ~40 seconds for separate generate() calls)
   * 
   * @param {string} referenceImagePath - Path to reference image
   * @param {string[]} prompts - Array of prompts to generate (e.g., ['dancing', 'waving'])
   * @returns {Object} { success, results: [{videoUrl, downloadedAt, screenshotPath, prompt}, ...], message }
   */
  async generateMultiple(referenceImagePath, prompts = []) {
    try {
      console.log(`\n🎯 GENERATING MULTIPLE VIDEOS (${prompts.length} prompts)\n`);

      // Initialize browser first
      await this.init();

      // One-time initialization
      await this.navigateToFlow();
      
      // ✅ IMPORTANT: Setup VIDEO mode and config FIRST, then upload
      // This ensures uploaded images land in the prompt input area
      console.log('🎬 Setting up video mode first...');
      await this.switchToVideoMode();
      
      console.log('📋 Configuring video settings...');
      await this.configureSettings();
      await this.selectModel(this.options.model);
      
      // Then upload reference image after config is set
      console.log('📸 Uploading reference image after configuration...');
      await this.uploadReferenceImage(referenceImagePath);

      // Generate for each prompt while keeping browser/components alive
      const results = [];
      for (let i = 0; i < prompts.length; i++) {
        const prompt = prompts[i];
        console.log(`\n[${i + 1}/${prompts.length}] 📹 Generating video with prompt: "${prompt}"`);

        try {
          // Enter prompt
          await this.enterPrompt(prompt);

          // Click Create
          await this.clickCreate();

          // Wait for generation
          await this.waitForGeneration();

          // Capture result
          const result = await this.captureResults();

          results.push({
            success: true,
            videoUrl: result.videoUrl,
            screenshotPath: result.screenshotPath,
            downloadedAt: result.downloadedAt,
            prompt: prompt,
            index: i
          });

          console.log(`   ✅ Generated successfully: ${result.videoUrl.substring(0, 60)}...`);

          // Brief pause before next iteration if not last
          if (i < prompts.length - 1) {
            await this.page.waitForTimeout(2000);
          }
        } catch (error) {
          console.error(`   ❌ Failed: ${error.message}`);
          results.push({
            success: false,
            error: error.message,
            prompt: prompt,
            index: i
          });
        }
      }

      console.log(`\n✅ BATCH COMPLETE: ${results.filter(r => r.success).length}/${prompts.length} successful\n`);

      return {
        success: results.every(r => r.success),
        results,
        message: `Generated ${results.filter(r => r.success).length}/${prompts.length} videos`
      };
    } catch (error) {
      console.error(`\n❌ ERROR in generateMultiple: ${error.message}\n`);
      return {
        success: false,
        results: [],
        error: error.message,
        message: 'Multi-video generation failed'
      };
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

export default VideoGenerationServiceNew;
