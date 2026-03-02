/**
 * GoogleFlowAutomationService - Unified service for Image and Video generation
 * Supports both image and video workflows through single service
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ContentSafetyFilter from './contentSafetyFilter.js';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
puppeteer.use(StealthPlugin());

class GoogleFlowAutomationService {
  constructor(options = {}) {
    this.browser = null;
    this.page = null;
    this.type = options.type || 'image'; // 'image' or 'video'
    this.contentSafetyFilter = new ContentSafetyFilter(); // Initialize content safety filter
    this.grecaptchaClearingInterval = null; // Track auto-clearing interval
    this.debugMode = options.debugMode === true; // Debug mode: only open, don't automate
    
    // Instance variables for tracking uploaded vs generated images
    this.uploadedImageRefs = {}; // Store refs of uploaded images (href + img src + text)
    this.lastPromptSubmitted = null; // Store original prompt for retry
    this.imageUrls = {}; // Store generated image URLs for segment mapping
    
    this.options = {
      headless: false,
      sessionFilePath: path.join(__dirname, '../.sessions/google-flow-session-complete.json'),
      baseUrl: 'https://labs.google/fx/vi/tools/flow',
      projectId: options.projectId || '58d791d4-37c9-47a8-ae3b-816733bc3ec0',
      aspectRatio: options.aspectRatio || '9:16',
      imageCount: this.type === 'image' ? (options.imageCount || 1) : undefined,
      videoCount: this.type === 'video' ? (options.videoCount || 1) : undefined,
      model: options.model || (this.type === 'image' ? 'Nano Banana Pro' : 'Veo 3.1 - Fast'),
      outputDir: options.outputDir || path.join(__dirname, `../temp/${this.type}-generation-outputs`),
      timeouts: {
        pageLoad: 60000,
        tabSwitch: 1500,
        upload: 10000,
        prompt: 3000,
        generation: 120000,
        ...options.timeouts
      },
      ...options
    };

    if (this.debugMode) {
      console.log('🔧 DEBUG MODE ENABLED - Automation disabled, manual testing only\n');
    }
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

    // Load session and check token freshness
    await this.loadSession();
    
    console.log('✅ Initialized\n');
  }

  async ensureFreshTokens() {
    /**
     * Note: Token freshness check deprecated.
     * reCAPTCHA tokens are now generated fresh during each form submission,
     * so we don't need to store or manage them in the session.
     */
    if (!this.sessionData) {
      console.log('ℹ️  No session data for monitoring');
      return;
    }

    try {
      const sessionAge = Date.now() - new Date(this.sessionData.timestamp).getTime();
      const ageSeconds = Math.round(sessionAge / 1000);

      console.log(`📋 Session age: ${ageSeconds} seconds\n`);
      console.log(`ℹ️  reCAPTCHA tokens will be generated fresh during submission\n`);
    } catch (error) {
      console.log(`⚠️  Session monitoring failed: ${error.message}\n`);
    }
  }

  async refreshTokensAutomatically() {
    /**
     * DEPRECATED: reCAPTCHA tokens NOT captured/stored anymore.
     * Tokens generated fresh during form submission only.
     * NOT stored because: Invalid tokens cause API 400 errors.
     */
    try {
      this.sessionData.timestamp = new Date().toISOString();
      console.log('   ✅ Session timestamp updated\n');
    } catch (error) {
      console.log(`   ⚠️  Refresh failed: ${error.message}\n`);
    }
  }

  async loadSession() {
    try {
      if (fs.existsSync(this.options.sessionFilePath)) {
        const sessionData = JSON.parse(fs.readFileSync(this.options.sessionFilePath, 'utf8'));
        
        // Load only cookies from the current domain to avoid third-party cookie issues
        // Third-party cookies (SameSite=None from other domains) can cause interference
        let loadedCount = 0;
        for (const cookie of (sessionData.cookies || [])) {
          try {
            // Only load cookies from labs.google domain or subdomains
            // Skip cookies from other domains (google.com, etc) that would be third-party
            if (cookie.domain && (cookie.domain === 'labs.google' || cookie.domain === '.labs.google')) {
              await this.page.setCookie(cookie);
              loadedCount++;
            } else if (!cookie.domain) {
              // No domain specified, safe to load
              await this.page.setCookie(cookie);
              loadedCount++;
            } else {
              console.log(`   ⏭️  Skipping third-party cookie: ${cookie.name} from ${cookie.domain}`);
            }
          } catch (e) {
            // Ignore cookie errors
          }
        }
        console.log(`✅ Session cookies loaded (${loadedCount}/${(sessionData.cookies || []).length} cookies, filtered for same-domain only)`);
        
        // Store session data for later restoration
        this.sessionData = sessionData;
        
        // Count resources loaded
        const localStorageCount = Object.keys(sessionData.localStorage || {}).length;
        console.log(`✅ Session data prepared (${localStorageCount} localStorage items)`);
        console.log(`ℹ️  reCAPTCHA tokens will be generated fresh during form submission`);
      }
    } catch (e) {
      console.log('⚠️  Could not load session:', e.message);
      this.sessionData = null;
    }
  }

  async restoreSessionBeforeNavigation() {
    /**
     * Restore localStorage items (but NOT reCAPTCHA tokens)
     * 
     * IMPORTANT: We do NOT restore _grecaptcha tokens because:
     * 1. These tokens sync to google.com cookie domain
     * 2. Google's own API rejects invalid/old tokens with 400 errors
     * 3. Real Chrome doesn't have these tokens in cookies
     * 4. Tokens are generated fresh during form submission
     */
    if (!this.sessionData) {
      console.log('ℹ️  No session data available to restore');
      return;
    }

    try {
      console.log('🔐 Restoring session before navigation...');
      
      // Restore ONLY regular localStorage items (not reCAPTCHA tokens)
      const storageItems = { ...this.sessionData.localStorage };

      const result = await this.page.evaluate((storage) => {
        try {
          let itemsSet = 0;

          // Restore localStorage items EXCEPT reCAPTCHA tokens
          for (const [key, value] of Object.entries(storage || {})) {
            if (value !== null && value !== undefined) {
              try {
                window.localStorage.setItem(key, value);
                itemsSet++;
              } catch (setError) {
                // Skip items that can't be set (e.g., security restrictions)
                console.warn(`Failed to set ${key}: ${setError.message}`);
              }
            }
          }

          return { itemsSet, success: true };
        } catch (e) {
          // If localStorage is not accessible at all
          return { itemsSet: 0, success: false, error: e.message };
        }
      }, storageItems);

      console.log(`   ✅ ${result.itemsSet} localStorage items restored (reCAPTCHA tokens excluded)`);
      
      if (!result.success && result.error) {
        console.log(`   ⚠️  Note: localStorage access limited on this page (${result.error})`);
      }

      // Note: reCAPTCHA tokens are NOT restored - they're generated fresh during form submission
      
    } catch (e) {
      console.log(`⚠️  Session restoration error: ${e.message}`);
    }
  }

  async navigateToFlow() {
    const url = this.options.projectId
      ? `${this.options.baseUrl}/project/${this.options.projectId}`
      : this.options.baseUrl;

    console.log('🌐 Navigating to Google Flow...\n');
    console.log(`   Target URL: ${url}\n`);

    console.log('🌐 Page navigation in progress...');
    await this.page.goto(url, { waitUntil: 'networkidle2', timeout: this.options.timeouts.pageLoad });
    await this.waitForPageReady();
    
    // ✅ RESTORE session tokens AFTER navigation when page is ready
    await this.restoreSessionBeforeNavigation();
    
    // ✅ CHECK & REFRESH tokens NOW that we're on the project page with prompt box available
    await this.ensureFreshTokens();
    
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

  async getHrefsFromVirtuosoList() {
    /**
     * Helper: Get ALL hrefs from virtuoso-item-list
     * Used to capture state before/after operations to find what changed
     * 
     * @returns {Array<string>} - Array of all href values in order
     */
    return await this.page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('[data-testid="virtuoso-item-list"] a[href]'));
      return links.map(link => link.getAttribute('href'));
    });
  }

  async findNewHref(previousHrefs) {
    /**
     * Helper: Find hrefs that exist now but not in previousHrefs
     * Returns the first NEW href (usually the most recent upload)
     * 
     * @param {Array<string>} previousHrefs - Previous state
     * @returns {string|null} - First new href, or null if none found
     */
    const currentHrefs = await this.getHrefsFromVirtuosoList();
    const previousSet = new Set(previousHrefs);
    
    for (const href of currentHrefs) {
      if (!previousSet.has(href)) {
        return href;
      }
    }
    
    return null;
  }

  async findHrefByPosition(position) {
    /**
     * Helper: Get href at a specific position (0 = first/latest)
     * Useful for finding last generated item
     * 
     * @param {number} position - 0 for first (latest), -1 for last, etc.
     * @returns {string|null}
     */
    const hrefs = await this.getHrefsFromVirtuosoList();
    if (position === 0 || position === -Math.abs(hrefs.length)) {
      return hrefs[0]; // First = latest
    }
    if (position === -1 || position === hrefs.length - 1) {
      return hrefs[hrefs.length - 1]; // Last
    }
    return hrefs[position] || null;
  }

  async storeUploadedImage(imagePath) {
    /**
     * Store uploaded image from affiliate video step 1 to temp folder
     * Returns path to stored image
     * 
     * @param {string} imagePath - Original image path
     * @returns {Promise<string>} - Path to stored image in temp folder
     */
    try {
      const uploadStorageDir = path.join(__dirname, '../temp/uploaded-images');
      
      // Create storage directory if it doesn't exist
      if (!fs.existsSync(uploadStorageDir)) {
        fs.mkdirSync(uploadStorageDir, { recursive: true });
      }
      
      // Generate unique filename with timestamp
      const timestamp = Date.now();
      const originalName = path.basename(imagePath);
      const storedImagePath = path.join(uploadStorageDir, `${timestamp}-${originalName}`);
      
      // Copy image to storage folder
      fs.copyFileSync(imagePath, storedImagePath);
      
      console.log(`   📁 Image stored: ${storedImagePath}`);
      
      return storedImagePath;
    } catch (error) {
      console.error(`   ❌ Failed to store image: ${error.message}`);
      throw error;
    }
  }

  async convertImageToPNG(imagePath) {
    /**
     * Convert any image format (JPEG, PNG, etc.) to PNG
     * Returns PNG buffer that's compatible with clipboard.write()
     * 
     * @param {string} imagePath - Path to image file
     * @returns {Buffer} - PNG image buffer
     */
    try {
      console.log(`   🔄 Converting image to PNG...`);
      
      // Read the image and convert to PNG
      const pngBuffer = await sharp(imagePath)
        .png({ quality: 90 })
        .toBuffer();
      
      console.log(`   ✅ Conversion successful (${(pngBuffer.length / 1024).toFixed(2)}KB PNG)`);
      return pngBuffer;
    } catch (error) {
      console.error(`   ❌ Conversion failed: ${error.message}`);
      throw error;
    }
  }

  async uploadImages(characterImagePath, productImagePath, existingImages = []) {
    console.log('\n🖼️  UPLOADING IMAGES\n');

    if (!fs.existsSync(characterImagePath)) {
      throw new Error(`Character image not found: ${characterImagePath}`);
    }
    if (!fs.existsSync(productImagePath)) {
      throw new Error(`Product image not found: ${productImagePath}`);
    }

    // Initialize imageUrls tracking object
    const imageUrls = {
      wearing: null,
      holding: null,
      product: null
    };

    try {
      // STEP 0: Handle any terms modal
      console.log('⏳ Checking for terms modal...');
      await this.handleTermsModal();
      console.log('✅ Modal check complete\n');

      // STEP 1: Log the files we're about to upload
      console.log('📋 FILES TO UPLOAD:');
      console.log(`   [1] Character/Wearing: ${characterImagePath}`);
      console.log(`   [2] Product: ${productImagePath}\n`);

      // NOTE: configureSettings() should be called BEFORE uploadImages() by the caller
      // uploadImages() focuses only on the upload process

      // STEP 2: Check for Slate editor container
      console.log('🔍 Finding Slate editor container...');
      const containerSelector = '.iTYalL[role="textbox"][data-slate-editor="true"]';
      const containerExists = await this.page.$(containerSelector);
      
      if (!containerExists) {
        throw new Error('Slate editor container not found');
      }
      console.log('✅ Slate editor container found\n');

      // STEP 2.5: Wait for page to be fully stable and focused
      console.log('⏳ Waiting for page to be fully stable...');
      await this.page.waitForTimeout(1000); // Let page DOM settle
      
      // Ensure main window/document is focused
      console.log('📌 Ensuring document focus...');
      await this.page.evaluate(() => {
        window.focus();
        document.body.focus();
      });
      await this.page.waitForTimeout(500);
      
      // Verify container is now focusable
      console.log('🔍 Verifying container is focusable...');
      const isFocusable = await this.page.evaluate((selector) => {
        const el = document.querySelector(selector);
        if (!el) return false;
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetHeight > 0;
      }, containerSelector);
      
      if (!isFocusable) {
        console.warn('⚠️  Container may not be focusable, continuing anyway...');
      } else {
        console.log('✅ Container is focusable\n');
      }
      
      // Arrays to store file paths and names for sequential processing
      const filesToProcess = [
        { path: characterImagePath, label: 'CHARACTER/WEARING', imageKey: 'wearing', index: 0 },
        { path: productImagePath, label: 'PRODUCT', imageKey: 'product', index: 1 }
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
        console.log(`📤 UPLOADING ${file.label} IMAGE (${fileIdx + 1}/${filesToProcess.length})`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

        // Step 1: Paste image via clipboard (primary) or drag-drop (fallback)
        console.log(`   📤 Uploading image: ${file.path}`);
        
        // Store the uploaded image in temp folder first
        let storedImagePath;
        try {
          storedImagePath = await this.storeUploadedImage(file.path);
        } catch (storeError) {
          console.error(`   ❌ Failed to store image: ${storeError.message}`);
          console.error(`   Aborting upload for this file\n`);
          continue; // Skip to next file
        }
        
        // Convert image to PNG format (works better with clipboard API)
        let pngBuffer;
        try {
          pngBuffer = await this.convertImageToPNG(storedImagePath);
        } catch (convertError) {
          console.error(`   ❌ Failed to convert image: ${convertError.message}`);
          console.error(`   Aborting upload for this file\n`);
          continue; // Skip to next file
        }
        
        // Read original file for file input fallback
        const originalBuffer = fs.readFileSync(file.path);
        const base64Image = pngBuffer.toString('base64');
        const mimeType = 'image/png'; // Always use PNG after conversion
        const dataUrl = `data:${mimeType};base64,${base64Image}`;

        console.log(`   📋 Original size: ${(originalBuffer.length / 1024).toFixed(2)}KB`);
        console.log(`   📋 PNG size: ${(pngBuffer.length / 1024).toFixed(2)}KB`);

        // APPROACH 1: Try clipboard.write() - should work with PNG
        console.log(`   🔄 APPROACH 1: Trying clipboard.write() with PNG...`);
        let uploadSuccess = false;
        
        // STEP 1: Focus container with robust retry logic
        console.log(`   🔍 Focusing container with retry logic...`);
        let focusAttempts = 0;
        let focused = false;
        
        while (!focused && focusAttempts < 3) {
          focusAttempts++;
          
          // Ensure window/document is focused first
          await this.page.evaluate(() => {
            window.focus();
            document.body.focus();
          });
          await this.page.waitForTimeout(200);
          
          // Try to focus container
          await this.page.evaluate((selector) => {
            const element = document.querySelector(selector);
            if (element) {
              element.focus();
              // Verify focus
              const isFocused = document.activeElement === element;
              return isFocused;
            }
            return false;
          }, containerSelector);
          
          await this.page.waitForTimeout(300);
          focused = true;
          
          if (focusAttempts > 1) {
            console.log(`   ✓ Focus successful (attempt ${focusAttempts})`);
          }
        }
        
        // STEP 2: Copy to clipboard AFTER focus is confirmed
        const clipboardSuccess = await this.page.evaluate(async (data, type) => {
          try {
            const activeElement = document.activeElement;
            if (!activeElement) {
              throw new Error('No active element found');
            }
            
            const blob = await fetch(`data:${type};base64,${data}`).then(r => r.blob());
            const clipboardItem = new ClipboardItem({ [type]: blob });
            
            await navigator.clipboard.write([clipboardItem]);
            return true;
          } catch (e) {
            return false;
          }
        }, base64Image, mimeType);

        if (clipboardSuccess) {
          console.log(`   ✅ Clipboard approach successful`);
          uploadSuccess = true;

          // STEP 3: Paste with Ctrl+V
          console.log(`   ⌨️  Pasting with Ctrl+V...`);
          await this.page.waitForTimeout(200); // Extra wait before paste
          await this.page.keyboard.down('Control');
          await this.page.keyboard.press('v');
          await this.page.keyboard.up('Control');
          console.log(`   ✓ Ctrl+V executed\n`);
          await this.page.waitForTimeout(3000); // Wait for upload to process
        } else {
          // Clipboard failed - skip drag-drop, go straight to file input
          console.log(`   🔄 Clipboard failed, trying file input (native browser mechanism)...\n`);
          try {
            // Get initial count to verify upload
            const beforeUploadCount = await this.page.evaluate(() => {
              return document.querySelectorAll('[data-testid="virtuoso-item-list"] a[href]').length;
            });
            console.log(`   📊 Items in gallery before: ${beforeUploadCount}`);

            const fileInput = await this.page.$('input[type="file"]');
            if (!fileInput) {
              console.log(`   ❌ File input element not found`);
            } else {
              console.log(`   📁 Uploading file via native browser file mechanism...`);
              
              // Random delay (100-300ms) to seem human-like
              const delay = Math.floor(Math.random() * 200) + 100;
              await this.page.waitForTimeout(delay);
              
              // Use uploadFile to set the file - this is native browser API, not bot detection
              await fileInput.uploadFile(file.path);
              console.log(`   ✓ File set to input element`);
              
              // Dispatch change event to trigger upload
              console.log(`   ⌨️  Dispatching change event...`);
              await this.page.evaluate(() => {
                const fileInput = document.querySelector('input[type="file"]');
                if (fileInput) {
                  fileInput.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
                  fileInput.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
                }
              });
              
              console.log(`   ⏳ Waiting for upload to process (3 seconds)...`);
              await this.page.waitForTimeout(3000);
              
              // Verify upload by checking if gallery item count increased
              const afterUploadCount = await this.page.evaluate(() => {
                return document.querySelectorAll('[data-testid="virtuoso-item-list"] a[href]').length;
              });
              console.log(`   📊 Items in gallery after: ${afterUploadCount}`);
              
              if (afterUploadCount > beforeUploadCount) {
                console.log(`   ✅ Upload verified! Gallery item count increased (${beforeUploadCount} → ${afterUploadCount})`);
                uploadSuccess = true;
              } else {
                console.log(`   ⚠️  Gallery count did not increase - upload may have failed\n`);
              }
            }
          } catch (fileInputErr) {
            console.log(`   ⚠️  File input error: ${fileInputErr.message}\n`);
          }
        }

        if (!uploadSuccess) {
          console.warn(`   ⚠️  WARNING: Image upload status uncertain!`);
          console.warn(`   Please verify in browser if image was uploaded successfully.\n`);
        }

        await this.page.waitForTimeout(2000);

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

        // COMMENTED OUT: Step 3-6 (href detection and right-click add to prompt after clipboard paste)
        // Images pasted via clipboard are already in the prompt as reference images
        // No need to detect and right-click "Thêm vào câu lệnh" anymore
        // This detection will still be used AFTER generation to detect generated images
        /*
        // Step 3: Get initial hrefs from ALL items to track which ones are new
        console.log(`   📎 Capturing ALL initial hrefs...`);
        const initialAllHrefs = await this.getHrefsFromVirtuosoList();
        console.log(`   ✓ Captured ${initialAllHrefs.length} hrefs\n`);

        // Step 4: Monitor for NEW href (not in the original set) to confirm upload complete
        console.log(`   ⏳ Monitoring for NEW href (confirming new image uploaded)...`);
        let newItemHref = null;
        let hrefCheckAttempts = 0;
        const maxHrefCheckAttempts = 20; // 20 seconds

        while (newItemHref === null && hrefCheckAttempts < maxHrefCheckAttempts) {
          hrefCheckAttempts++;

          newItemHref = await this.findNewHref(initialAllHrefs);

          if (newItemHref) {
            console.log(`   ✅ NEW item detected with href: "${newItemHref.substring(0, 60)}..." New image confirmed.\n`);
            // 💫 STORE the href for this image type
            imageUrls[file.imageKey] = newItemHref;
            console.log(`   📎 Stored href for "${file.imageKey}": ${newItemHref.substring(0, 60)}...\n`);
            
            // ⏳ Wait 3 seconds after image is detected before next step
            console.log(`   ⏳ Waiting 3 seconds after upload confirmation...\n`);
            await this.page.waitForTimeout(3000);
            
            break;
          }

          if (hrefCheckAttempts % 5 === 0 && hrefCheckAttempts > 0) {
            console.log(`   [CHECK] Attempt ${hrefCheckAttempts}/${maxHrefCheckAttempts}`);
          }

          await this.page.waitForTimeout(1000);
        }

        if (newItemHref === null) {
          console.log(`   ⚠️  No NEW item detected within timeout\n`);
          console.log(`   ℹ️  Continuing anyway...\n`);
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
            const linkData = await this.page.evaluate((targetHref) => {
              // Find the <a> tag with the specific href
              const link = document.querySelector(`a[href="${targetHref}"]`);
              
              if (!link) {
                return { found: false };
              }
                  
              const rect = link.getBoundingClientRect();
              return {
                found: true,
                href: targetHref,
                x: Math.round(rect.left + rect.width / 2),
                y: Math.round(rect.top + rect.height / 2)
              };
            }, newItemHref);

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
            
            if (rightClickAttempts < maxRightClickAttempts) {
              await this.page.waitForTimeout(1000);
            }
          }
        }

        // Move mouse away
        await this.page.mouse.move(100, 100);
        await this.page.waitForTimeout(300);
        */

        // No need to reset input since we're using clipboard paste
        if (fileIdx < filesToProcess.length - 1) {
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

      // 💫 CAPTURE UPLOADED IMAGE REFERENCES for later retry detection
      console.log(`\n📎 CAPTURING UPLOADED IMAGE REFERENCES (for generate detection):`);
      
      const uploadedRefs = await this.page.evaluate(() => {
        const refMap = {};
        
        // Get ALL items from virtuoso list
        const items = document.querySelectorAll('[data-testid="virtuoso-item-list"] a[href]');
        
        // For each uploaded image, capture href + img src + text
        // We'll store the LAST 2 items (most recent uploads)
        const itemsArray = Array.from(items);
        
        if (itemsArray.length >= 2) {
          // Get first 2 items (most recent since list is reversed)
          for (let i = 0; i < 2 && i < itemsArray.length; i++) {
            const linkEl = itemsArray[i];
            const href = linkEl.getAttribute('href');
            
            // Find img inside the link
            const imgEl = linkEl.querySelector('img');
            const imgSrc = imgEl ? imgEl.getAttribute('src') : null;
            
            // Get text content (usually a description or title)
            const textContent = linkEl.textContent.trim();
            
            // Map position to key (0 = wearing, 1 = product)
            const key = i === 0 ? 'wearing' : 'product';
            
            refMap[key] = {
              href,
              imgSrc,
              text: textContent.substring(0, 100)
            };
          }
        }
        
        return refMap;
      });
      
      this.uploadedImageRefs = uploadedRefs;
      
      console.log(`   📎 Uploaded image references captured:`);
      for (const [key, ref] of Object.entries(this.uploadedImageRefs)) {
        console.log(`   ✓ ${key}:`);
        console.log(`     - href: ${ref.href ? ref.href.substring(0, 50) + '...' : '(none)'}`);
        console.log(`     - imgSrc: ${ref.imgSrc ? ref.imgSrc.substring(0, 50) + '...' : '(none)'}`);
        console.log(`     - text: "${ref.text}"`);
      }
      console.log('');

      // 💫 STORE imageUrls in instance for later use by segments
      console.log(`📎 STORING IMAGE URL MAPPING FOR SEGMENTS:`);
      console.log(`   wearing: ${imageUrls.wearing ? imageUrls.wearing.substring(0, 60) + '...' : '(not set)'}`);
      console.log(`   product: ${imageUrls.product ? imageUrls.product.substring(0, 60) + '...' : '(not set)'}`);
      console.log(`   holding: ${imageUrls.holding ? imageUrls.holding.substring(0, 60) + '...' : '(not set)'}\n`);
      
      this.imageUrls = imageUrls;
      return imageUrls;

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
    
    // STEP 0.5: Content Safety Check
    const safety = this.contentSafetyFilter.validatePrompt(cleanPrompt);
    if (safety.hasHighRisk) {
      console.log('\n⚠️  CONTENT SAFETY WARNING\n');
      console.log('[SAFETY] 🚨 HIGH RISK CONTENT DETECTED');
      console.log(`[SAFETY] Risk Score: ${safety.riskScore}/100`);
      console.log('[SAFETY] Issues found:');
      safety.suggestions.forEach(s => {
        console.log(`  • ${s.issue}`);
        console.log(`    Suggested: "${s.suggested}"`);
      });
      
      // Auto-correct high-risk content
      console.log('\n[SAFETY] 🔧 Auto-correcting high-risk terms...');
      const correctedPrompt = this.contentSafetyFilter.autoCorrect(cleanPrompt, 'high');
      console.log(`[SAFETY] ✅ Corrected version applied\n`);
      
      return this.enterPrompt(correctedPrompt); // Recursively enter corrected prompt
    } else if (safety.hasMediumRisk) {
      console.log('\n⚠️  CONTENT SAFETY NOTICE\n');
      console.log('[SAFETY] ⚡ Medium risk terms detected (review recommended):');
      safety.suggestions.forEach(s => {
        console.log(`  • ${s.issue}`);
        console.log(`    Suggested: "${s.suggested}"`);
      });
      console.log('[SAFETY] Proceeding with original prompt\n');
    } else {
      console.log('[SAFETY] ✅ Prompt is content-safe\n');
    }
    
    console.log('✍️  ENTERING PROMPT\n');
    console.log(`   Original length: ${(prompt || '').length} chars`);
    console.log(`   Cleaned length: ${(cleanPrompt || '').length} chars`);
    console.log(`   Prompt: "${(cleanPrompt || '').substring(0, 80)}"\n`);

    try {
      // Normalize prompt for Unicode
      const normalizedPrompt = cleanPrompt.normalize('NFC');
      
      // STEP 1: Copy prompt to clipboard
      console.log('   📋 [1] Copying prompt to clipboard...');
      await this.page.evaluate((text) => {
        navigator.clipboard.writeText(text).catch(() => {});
      }, normalizedPrompt);
      await this.page.waitForTimeout(200);
      console.log('   ✓ Copied');
      
      // STEP 2: Focus textbox using page.focus() (same as generateMultiple)
      console.log('   🖱️  [2] Focusing textbox...');
      await this.page.focus('.iTYalL[role="textbox"][data-slate-editor="true"]');
      await this.page.waitForTimeout(100);
      console.log('   ✓ Focused');
      
      // STEP 3: Paste with Ctrl+V
      console.log('   📋 [3] Pasting with Ctrl+V...');
      await this.page.keyboard.down('Control');
      await this.page.keyboard.press('v');
      await this.page.keyboard.up('Control');
      await this.page.waitForTimeout(1000);
      console.log('   ✓ Pasted');
      
      // STEP 4: Store prompt for retry use
      this.lastPromptSubmitted = cleanPrompt;
      console.log(`   💾 Stored prompt for retry (${cleanPrompt.length} chars)\n`);
      
      console.log('✅ Prompt entered successfully (NOT submitted yet - caller must submit)\n');

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

  async clearGrecaptchaTokens() {
    /**
     * Clear reCAPTCHA tokens before submission
     * In debug mode, this is disabled
     */
    if (this.debugMode) {
      console.log('🔧 [DEBUG] Skipping token clearing\n');
      return;
    }

    /**
     * Uses Chrome DevTools Protocol to access cookies from ALL domains
     * (including google.com which page.cookies() cannot access)
     */
    try {
      console.log('🧹 Clearing cached reCAPTCHA tokens before submission...');
      
      // Clear from localStorage
      const cleared = await this.page.evaluate(() => {
        const keysToDelete = ['_grecaptcha', 'rc::a', 'rc::f'];
        let deletedCount = 0;
        
        for (const key of keysToDelete) {
          if (localStorage.getItem(key)) {
            localStorage.removeItem(key);
            deletedCount++;
          }
        }
        
        // Also clear any keys matching grecaptcha pattern (case-insensitive)
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.toLowerCase().includes('grecaptcha')) {
            localStorage.removeItem(key);
            deletedCount++;
          }
        }
        
        return deletedCount;
      });
      
      if (cleared > 0) {
        console.log(`   ✅ Cleared ${cleared} tokens from localStorage`);
      }
      
      // Clear from cookies using Chrome DevTools Protocol (CDP)
      // This allows access to cookies from ALL domains including google.com
      try {
        const cdpSession = await this.page.target().createCDPSession();
        
        // Get all cookies
        const result = await cdpSession.send('Network.getAllCookies');
        const allCookies = result.cookies || [];
        let deletedCount = 0;
        
        for (const cookie of allCookies) {
          const nameLower = cookie.name.toLowerCase();
          
          // Match grecaptcha-related cookies
          if (nameLower === '_grecaptcha' || 
              nameLower.startsWith('rc::') ||
              nameLower.includes('captcha') ||
              nameLower.includes('recaptcha')) {
            
            try {
              // Delete via CDP (works for all domains including google.com)
              await cdpSession.send('Network.deleteCookies', {
                name: cookie.name,
                domain: cookie.domain,
                path: cookie.path
              });
              deletedCount++;
              console.log(`   ✓ Deleted: ${cookie.name} from ${cookie.domain}`);
            } catch (deleteError) {
              // Ignore deletion errors
            }
          }
        }
        
        await cdpSession.detach();
        
        if (deletedCount > 0) {
          console.log(`   ✅ Cleared ${deletedCount} tokens from cookies (all domains)`);
        }
      } catch (cdpError) {
        console.log(`   ⚠️  Cookie clearing via CDP failed: ${cdpError.message}`);
        console.log('   💡 Attempting fallback with page.cookies()...');
        
        // Fallback: try with page.cookies() which only gets current domain
        try {
          const cookies = await this.page.cookies();
          let fallbackCount = 0;
          
          for (const cookie of cookies) {
            const nameLower = cookie.name.toLowerCase();
            if (nameLower === '_grecaptcha' || nameLower.startsWith('rc::')) {
              try {
                await this.page.deleteCookie(cookie);
                fallbackCount++;
              } catch (e) {
                // Ignore
              }
            }
          }
          
          if (fallbackCount > 0) {
            console.log(`   ✅ Fallback: Cleared ${fallbackCount} tokens from current domain`);
          }
        } catch (e) {
          console.log(`   ⚠️  Fallback also failed: ${e.message}`);
        }
      }
      
      // Clear sessionStorage
      try {
        await this.page.evaluate(() => {
          sessionStorage.clear();
        });
      } catch (e) {
        // Ignore errors
      }
      
      console.log('   💡 Fresh tokens will be generated during API submission\n');
    } catch (error) {
      console.warn(`   ⚠️  Error clearing tokens: ${error.message}`);
    }
  }

  async submit() {
    if (this.debugMode) {
      console.log('🔧 [DEBUG] Submit skipped (debug mode)\n');
      return false;
    }

    // 🧹 Clear any cached reCAPTCHA tokens before submission
    // ❌ COMMENTED OUT: Already called in enterPrompt() - avoid double submission
    // await this.clearGrecaptchaTokens();
    
    console.log('⏳ Submitting request...');
    
    // ❌ COMMENTED OUT: Already submitted in enterPrompt() via mouse click
    // Avoid double submission which causes duplicate requests
    /*
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
    */
    
    // Return false since submit is handled in enterPrompt()
    return false;
  }

  async findGeneratedImage() {
    /**
     * Find a newly generated image by comparing against uploaded image refs
     * Generated images will have href + img src that DIFFER from uploaded refs
     * 
     * @returns {Object|null} - {href, imgSrc, text} if found, null otherwise
     */
    try {
      const generated = await this.page.evaluate((uploadedRefs) => {
        // Get ALL items from virtuoso list
        const items = document.querySelectorAll('[data-testid="virtuoso-item-list"] a[href]');
        const itemsArray = Array.from(items);
        
        // Check each item to see if it matches uploaded refs
        for (let i = 0; i < itemsArray.length; i++) {
          const linkEl = itemsArray[i];
          const href = linkEl.getAttribute('href');
          const imgEl = linkEl.querySelector('img');
          const imgSrc = imgEl ? imgEl.getAttribute('src') : null;
          const textContent = linkEl.textContent.trim();
          
          // Check if this matches any uploaded ref
          let isUploaded = false;
          for (const [key, ref] of Object.entries(uploadedRefs || {})) {
            // Compare both href and imgSrc to be sure
            if (ref.href === href && ref.imgSrc === imgSrc) {
              isUploaded = true;
              break;
            }
          }
          
          // If not found in uploaded refs, it's NEW (generated)
          if (!isUploaded && href && imgSrc) {
            return {
              href,
              imgSrc,
              text: textContent.substring(0, 100),
              position: i
            };
          }
        }
        
        return null;
      }, this.uploadedImageRefs);
      
      return generated;
    } catch (error) {
      console.error(`Error finding generated image: ${error.message}`);
      return null;
    }
  }

  async handleGenerationFailureRetry(prompt) {
    /**
     * Retry generation after failure
     * Procedure:
     * 1. Wait 5s for UI to stabilize
     * 2. Find stored uploaded image refs (with retry)
     * 3. Right-click on each, select "Thêm vào câu lệnh" (up to 5 attempts per image)
     * 4. Focus textbox and paste original prompt again
     * 
     * NOTE: Gallery positions change when new items are appended!
     * Must re-query DOM each attempt to get current coordinates
     * 
     * @param {string} prompt - Original prompt to reuse
     */
    console.log('\n🔄 HANDLING GENERATION FAILURE - RETRYING...\n');
    
    if (!prompt || !this.uploadedImageRefs) {
      console.warn('⚠️  Missing prompt or uploadedImageRefs, cannot retry');
      return false;
    }
    
    try {
      // Step 1: Wait 5 seconds
      console.log('   ⏳ [1] Waiting 5 seconds for UI to stabilize...');
      await this.page.waitForTimeout(5000);
      console.log('   ✓ Stabilized\n');
      
      // Step 2: Find and add uploaded images again via right-click (with 5 retries)
      const imageKeys = Object.keys(this.uploadedImageRefs);
      const maxRetries = 5;
      
      for (let keyIdx = 0; keyIdx < imageKeys.length; keyIdx++) {
        const key = imageKeys[keyIdx];
        const ref = this.uploadedImageRefs[key];
        
        console.log(`   🖱️  [2.${keyIdx + 1}] Re-adding "${key}" image to prompt via right-click...`);
        
        let addSuccess = false;
        let attemptCount = 0;
        
        // Retry loop for this specific image (up to 5 attempts)
        while (!addSuccess && attemptCount < maxRetries) {
          attemptCount++;
          
          if (attemptCount > 1) {
            console.log(`   🔄 Re-adding attempt ${attemptCount}/${maxRetries}...`);
          }
          
          try {
            // ❗ CRITICAL: Query position FRESH each attempt (gallery positions change)
            console.log(`   🔍 Querying current position of "${key}" image...`);
            const linkData = await this.page.evaluate((targetHref) => {
              const link = document.querySelector(`a[href="${targetHref}"]`);
              if (!link) return { found: false };
              
              const rect = link.getBoundingClientRect();
              return {
                found: true,
                x: Math.round(rect.left + rect.width / 2),
                y: Math.round(rect.top + rect.height / 2)
              };
            }, ref.href);
            
            if (!linkData.found) {
              console.log(`   ⚠️  "${key}" image ref not found${attemptCount < maxRetries ? ', retrying...' : ', skipping'}`);
              
              if (attemptCount < maxRetries) {
                await this.page.waitForTimeout(1000);
                continue;
              } else {
                console.log(`   ❌ Failed after ${maxRetries} attempts\n`);
                break;
              }
            }
            
            console.log(`   ✓ Found at position (${linkData.x}, ${linkData.y})`);
            
            // Right-click on the image
            console.log(`   🖱️  Right-clicking on image...`);
            await this.page.mouse.move(linkData.x, linkData.y);
            await this.page.waitForTimeout(300);
            await this.page.mouse.down({ button: 'right' });
            await this.page.waitForTimeout(50);
            await this.page.mouse.up({ button: 'right' });
            await this.page.waitForTimeout(800);
            
            // Find and click "Thêm vào câu lệnh" button
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
              console.log(`   ⚠️  "Thêm vào" button not found${attemptCount < maxRetries ? ', retrying...' : ', failing'}`);
              
              // Move mouse away
              await this.page.mouse.move(100, 100);
              await this.page.waitForTimeout(300);
              
              if (attemptCount < maxRetries) {
                await this.page.waitForTimeout(1000);
                continue;
              } else {
                break;
              }
            }
            
            // Click "Thêm vào" button
            console.log(`   ✓ Clicking "Thêm vào câu lệnh"...`);
            await this.page.mouse.move(addBtn.x, addBtn.y);
            await this.page.waitForTimeout(200);
            await this.page.mouse.down();
            await this.page.waitForTimeout(100);
            await this.page.mouse.up();
            await this.page.waitForTimeout(1200);
            
            console.log(`   ✓ "${key}" image added successfully\n`);
            addSuccess = true;
            
            // Move mouse away
            await this.page.mouse.move(100, 100);
            await this.page.waitForTimeout(300);
            
          } catch (e) {
            console.log(`   ❌ Error on attempt ${attemptCount}/${maxRetries}: ${e.message}${attemptCount < maxRetries ? ', retrying...' : ', failing'}`);
            
            // Move mouse away
            await this.page.mouse.move(100, 100);
            await this.page.waitForTimeout(300);
            
            if (attemptCount < maxRetries) {
              await this.page.waitForTimeout(1500);
            }
          }
        }
        
        if (!addSuccess) {
          console.warn(`   ⚠️  Could not add "${key}" image after ${maxRetries} attempts\n`);
        }
      }
      
      // Step 3: Re-paste original prompt
      console.log(`   📋 [3] Re-entering original prompt...\n`);
      
      // Focus textbox
      await this.page.evaluate(() => {
        const textbox = document.querySelector('.iTYalL[role="textbox"][data-slate-editor="true"]');
        if (textbox) textbox.focus();
      });
      await this.page.waitForTimeout(300);
      
      // Copy prompt to clipboard (recreate to avoid state issues)
      await this.page.evaluate((promptText) => {
        navigator.clipboard.writeText(promptText).catch(() => {});
      }, prompt);
      await this.page.waitForTimeout(200);
      
      // Paste with Ctrl+V
      await this.page.keyboard.down('Control');
      await this.page.waitForTimeout(50);
      await this.page.keyboard.press('v');
      await this.page.waitForTimeout(50);
      await this.page.keyboard.up('Control');
      
      console.log(`   ✓ Prompt re-pasted\n`);
      console.log('   ⏳ [4] Waiting 5s for prompt to process...');
      await this.page.waitForTimeout(5000);
      console.log('   ✓ Ready\n');
      
      // Step 4: Click submit button again
      console.log(`   🖱️  [5] Clicking submit button...`);
      const submitClicked = await this.page.evaluate(() => {
        const textbox = document.querySelector('.iTYalL[role="textbox"][data-slate-editor="true"]');
        if (!textbox) return { found: false };
        
        let container = textbox.parentElement;
        for (let i = 0; i < 3; i++) {
          if (container.parentElement) container = container.parentElement;
        }
        
        const buttons = container.querySelectorAll('button');
        for (const btn of buttons) {
          const icon = btn.querySelector('i.google-symbols');
          if (icon && icon.textContent.includes('arrow_forward')) {
            if (!btn.disabled) {
              const rect = btn.getBoundingClientRect();
              return {
                found: true,
                x: Math.round(rect.left + rect.width / 2),
                y: Math.round(rect.top + rect.height / 2)
              };
            }
          }
        }
        return { found: false };
      });
      
      if (submitClicked.found) {
        await this.page.mouse.move(submitClicked.x, submitClicked.y);
        await this.page.waitForTimeout(100);
        await this.page.mouse.down();
        await this.page.waitForTimeout(50);
        await this.page.mouse.up();
        console.log(`   ✓ Submitted\n`);
        
        return true;
      } else {
        console.warn('   ⚠️  Submit button not found');
        return false;
      }
      
    } catch (error) {
      console.error(`\n❌ Retry failed: ${error.message}`);
      return false;
    }
  }

  async monitorGeneration(timeoutSeconds = 180) {
    console.log(`⏳ Monitoring generation (max ${timeoutSeconds}s)...`);
    
    const startTime = Date.now();
    const timeoutMs = timeoutSeconds * 1000;
    let generationDetected = false;
    let lastStatus = '';
    let statusCheckCount = 0;

    try {
      // Wait for generation to complete
      while (Date.now() - startTime < timeoutMs) {
        statusCheckCount++;
        
        const status = await this.page.evaluate(() => {
          // For video mode: look for progress indicators or loading state
          const progressEl = document.querySelector('[aria-label*="progress"], [data-testid*="progress"], [aria-label*="Processing"]');
          if (progressEl) return 'generating';
          
          // Look for any loading/spinner elements
          const spinner = document.querySelector('[role="status"], .loading, [aria-busy="true"]');
          if (spinner && spinner.textContent.toLowerCase().includes('generat')) return 'generating';
          
          // Check if there's a new video item being created (by monitoring virtuoso items count)
          const items = document.querySelectorAll('[data-testid="virtuoso-item-list"] a[href]');
          const itemCount = items.length;
          if (itemCount > 5) return 'generating';  // More items than initial 5 means something is happening
          
          // Look for download button (generation ready)
          const readyEl = document.querySelector('button[aria-label*="Download"]');
          if (readyEl) return 'ready';
          
          return 'unknown';
        });

        // Log status changes
        if (status !== lastStatus) {
          console.log(`   Status: ${status}`);
          lastStatus = status;
          if (status === 'generating') {
            generationDetected = true;
            console.log(`   🎬 Generation detected!`);
          }
        }

        if (status === 'ready') {
          console.log('✅ Generation completed');
          return true;
        }
        
        // If we've been waiting too long without detecting generation, log details
        if (statusCheckCount % 10 === 0 && !generationDetected) {
          console.log(`   ⏳ Still waiting for generation to start... (${Math.round((Date.now() - startTime) / 1000)}s elapsed)`);
        }

        await this.page.waitForTimeout(2000);
      }

      if (!generationDetected) {
        console.warn('⚠️  Generation never started - might be stuck or already completed');
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
      // Capture ALL hrefs and get the FIRST one (most recent = first in list)
      const latestHref = await this.page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('[data-testid="virtuoso-item-list"] a[href]'));
        if (items.length > 0) {
          // First item is the newest generated one (Google Flow shows newest first)
          return items[0].getAttribute('href');
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
          if (text.includes('video') && text.includes('thành phần') && !btn.disabled) {
            console.log(`[DEBUG] Found exact match: "${btn.textContent.trim()}"`);
            try {
              btn.click();
              return true;
            } catch (e) {
              console.error(`[DEBUG] Failed to click exact match: ${e.message}`);
            }
          }
        }
        
        // Second try: Just look for "thành phần" (components) since it's Vietnamese
        for (const btn of buttons) {
          const text = btn.textContent.toLowerCase();
          if (text.includes('thành phần') && !btn.disabled) {
            console.log(`[DEBUG] Found components button: "${btn.textContent.trim()}"`);
            try {
              btn.click();
              return true;
            } catch (e) {
              console.error(`[DEBUG] Failed to click components: ${e.message}`);
            }
          }
        }
        
        // Third try: Look for "create" or "tạo" (create)
        for (const btn of buttons) {
          const text = btn.textContent.toLowerCase();
          if ((text.includes('create') || text.includes('tạo')) && text.includes('video') && !btn.disabled) {
            console.log(`[DEBUG] Found create video button: "${btn.textContent.trim()}"`);
            try {
              btn.click();
              return true;
            } catch (e) {
              console.error(`[DEBUG] Failed to click create video: ${e.message}`);
            }
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
        const prompt = document.querySelector('.iTYalL[role="textbox"][data-slate-editor="true"]');
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
          // Handle both button items and div[role="menuitem"] items
          const buttons = menu.querySelectorAll('button, div[role="menuitem"]');
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
          const buttons = menu.querySelectorAll('button, div[role="menuitem"]');
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
        // For model selection: "Nano Banana Pro" should match "🍌 Nano Banana Pro" but NOT "🍌 Nano Banana Pro"
        for (const menu of menus) {
          const buttons = menu.querySelectorAll('button, div[role="menuitem"]');
          for (const btn of buttons) {
            const btnText = btn.textContent.trim();
            const rect = btn.getBoundingClientRect();
            
            // Check if visible
            if (rect.width === 0 || rect.height === 0) {
              continue;
            }
            
            // CONTAINS MATCH: Handle model names carefully
            // For "Nano Banana Pro" search, match "Nano Banana Pro" but not "Nano Banana Pro"
            // Check if the button text contains the search text as a word boundary
            if (btnText.includes(text)) {
              // Additional check: for model names, ensure we're matching the right one
              // "Nano Banana Pro" should NOT match "Nano Banana Pro"
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
      } else {
        console.log('   ✅ Settings menu opened');
      }
      await this.page.waitForTimeout(500);

      // STEP 1: Select Image/Video Tab
      console.log('   📋 STEP 1: Select Image/Video Tab');
      console.log(`   > type: ${this.type}`);
      if (this.type === 'image') {
        const selector = 'button[id*="IMAGE"][role="tab"]';
        await this.selectRadixTab(selector, 'IMAGE tab');
      } else {
        const selector = 'button[id*="VIDEO"][role="tab"]';
        await this.selectRadixTab(selector, 'VIDEO tab');
      }
      console.log(`   ✅ Tab selected`);
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
      console.log(`   > Count: x${count}`);
      console.log(`   > (this.options.imageCount = ${this.options.imageCount})`);
      const countSelected = await this.selectTab(`x${count}`);
      if (countSelected) {
        console.log(`   ✅ Count x${count} selected`);
      } else {
        console.log(`   ⚠️  Count x${count} selection may have failed`);
      }
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
      const allowedImageModels = ['Nano Banana Pro', 'Nano Banana 2'];
      let effectiveTargetModel = targetModel;

      if (this.type === 'image' && !allowedImageModels.includes(targetModel)) {
        console.log(`   ⚠️  Unsupported image model "${targetModel}", fallback to "Nano Banana Pro"`);
        effectiveTargetModel = 'Nano Banana Pro';
      }

      console.log(`   > Target model: "${targetModel}"`);
      console.log(`   > Effective model: "${effectiveTargetModel}"`);
      
      try {
        // Find and click the model dropdown button
        // Button contains arrow_drop_down icon and model name
        console.log(`   > Searching for model dropdown button...`);
        
        const modelDropdownButton = await this.page.evaluate(() => {
          // PRIORITY: query inside settings menu container first
          const settingsContainer = document.querySelector('[data-radix-menu-content].DropdownMenuContent, [data-radix-menu-content][role="menu"]');

          const findButtonByArrowIcon = (root) => {
            if (!root) return null;
            const icons = Array.from(root.querySelectorAll('i.google-symbols'));
            for (const icon of icons) {
              const iconText = (icon.textContent || '').trim();
              if (!iconText.includes('arrow_drop_down')) continue;

              const btn = icon.closest('button[aria-haspopup="menu"], button');
              if (!btn) continue;

              const rect = btn.getBoundingClientRect();
              if (rect.width <= 0 || rect.height <= 0) continue;

              return {
                x: Math.round(rect.left + rect.width / 2),
                y: Math.round(rect.top + rect.height / 2),
                text: (btn.textContent || '').trim().substring(0, 60),
                source: root === settingsContainer ? 'settings-container' : 'document-fallback'
              };
            }
            return null;
          };

          // Try in settings container first
          const byContainer = findButtonByArrowIcon(settingsContainer);
          if (byContainer) return { found: true, ...byContainer };

          // Fallback: full document
          const byDocument = findButtonByArrowIcon(document);
          if (byDocument) return { found: true, ...byDocument };

          return { found: false };
        });

        let modelDropdownClicked = false;
        if (modelDropdownButton?.found) {
          console.log(`   ✓ Found model dropdown button (${modelDropdownButton.source}): "${modelDropdownButton.text}"`);
          console.log(`   🖱️  Clicking with LEFT mouse down/up...`);
          await this.page.mouse.move(modelDropdownButton.x, modelDropdownButton.y);
          await this.page.waitForTimeout(120);
          await this.page.mouse.down({ button: 'left' });
          await this.page.waitForTimeout(60);
          await this.page.mouse.up({ button: 'left' });
          modelDropdownClicked = true;
        }

        
        if (modelDropdownClicked) {
          // Wait for dropdown menu to appear
          console.log(`   ✓ Model dropdown opened, waiting for menu...`);
          await this.page.waitForTimeout(1000);
          
          // Now click the target model in the menu
          // IMPORTANT: Radix UI menus are rendered in a PORTAL at document.body level
          // They are NOT children of the trigger button, so we must search from document root
          let modelSelectionResult = null;
          for (let modelSelectAttempt = 1; modelSelectAttempt <= 2; modelSelectAttempt++) {
            if (modelSelectAttempt === 2) {
              console.log('   ⏳ Retrying model selection after additional 1s wait...');
              await this.page.waitForTimeout(1000);
            }

            modelSelectionResult = await this.page.evaluate((target, type) => {
            const normalize = (text = '') => text
              .normalize('NFKC')
              .replace(/🍌/g, '')
              .replace(/\s+/g, ' ')
              .trim()
              .toLowerCase();

            const allowedImageModels = new Set(['nano banana pro', 'nano banana 2']);
            const normalizedTarget = normalize(target);

            // Find the correct menu: prefer OPEN menu that actually contains menuitems
            const candidateMenus = Array.from(document.querySelectorAll(
              '[role="menu"][data-state="open"], [data-radix-menu-content][data-state="open"], [role="menu"], [data-radix-menu-content]'
            ));

            let menu = null;
            let maxItemCount = 0;
            const menuDebug = [];

            for (const candidate of candidateMenus) {
              const itemCount = candidate.querySelectorAll('[role="menuitem"]').length;
              menuDebug.push({
                id: candidate.id || null,
                role: candidate.getAttribute('role'),
                state: candidate.getAttribute('data-state'),
                itemCount
              });

              if (itemCount > maxItemCount) {
                maxItemCount = itemCount;
                menu = candidate;
              }
            }

            if (!menu || maxItemCount === 0) {
              console.log('[MODEL-MENU] No usable model menu found (menu with menuitems)');
              console.log(`[MODEL-MENU] Candidates: ${JSON.stringify(menuDebug)}`);
              return { selected: false, selectedModel: null, usedFallbackFirst: false };
            }

            const items = Array.from(menu.querySelectorAll('[role="menuitem"]'));
            console.log(`[MODEL-MENU] Using menu id="${menu.id || 'n/a'}" with ${items.length} items`);

            for (const item of items) {
              const btn = item.querySelector('button') || item;
              const rawText = (btn.textContent || item.textContent || '').trim();
              const text = normalize(rawText);
              console.log(`[MODEL-MENU]  Item: "${rawText}" -> "${text}"`);

              if (type === 'image' && !allowedImageModels.has(text)) {
                continue;
              }

              if (text === normalizedTarget) {
                console.log(`[MODEL-MENU] ✓ Exact matched: "${rawText}"`);
                try {
                  if (btn && !btn.disabled) {
                    btn.click();
                    return { selected: true, selectedModel: text, usedFallbackFirst: false };
                  }
                } catch (e) {
                  console.error(`[MODEL-MENU] Failed to click matched item: ${e.message}`);
                }
              }
            }

            if (type === 'image') {
              // Prefer selector for FIRST OPTION in the active model menu (dynamic menu id)
              let directFirstButton = null;
              if (menu?.id) {
                const escapedId = (typeof CSS !== 'undefined' && CSS.escape) ? CSS.escape(menu.id) : menu.id.replace(/:/g, '\\:');
                const dynamicSelector = `#${escapedId} > div:nth-child(1) > div > button`;
                directFirstButton = document.querySelector(dynamicSelector);
                if (directFirstButton && !directFirstButton.disabled) {
                  const directText = normalize(directFirstButton.textContent || '');
                  console.log(`[MODEL-MENU] ⚠️ No exact text match, fallback click by dynamic selector (${dynamicSelector}): "${directFirstButton.textContent?.trim() || ''}" -> "${directText}"`);
                  try {
                    directFirstButton.click();
                    return { selected: true, selectedModel: 'nano banana pro', usedFallbackFirst: true };
                  } catch (e) {
                    console.error(`[MODEL-MENU] Failed to click dynamic selector: ${e.message}`);
                  }
                }
              }

              // Legacy fallback selector kept for compatibility with earlier captured id
              const legacySelector = '#radix-\\:roc\\: > div:nth-child(1) > div > button';
              directFirstButton = document.querySelector(legacySelector);
              if (directFirstButton && !directFirstButton.disabled) {
                const directText = normalize(directFirstButton.textContent || '');
                console.log(`[MODEL-MENU] ⚠️ No exact text match, fallback click by legacy selector: "${directFirstButton.textContent?.trim() || ''}" -> "${directText}"`);
                try {
                  directFirstButton.click();
                  return { selected: true, selectedModel: 'nano banana pro', usedFallbackFirst: true };
                } catch (e) {
                  console.error(`[MODEL-MENU] Failed to click legacy selector: ${e.message}`);
                }
              }

              if (items.length > 0) {
                const firstItem = items[0];
                const firstText = normalize(firstItem.textContent || '');
                console.log(`[MODEL-MENU] ⚠️ No exact text match, fallback click first item: "${firstItem.textContent?.trim() || ''}" -> "${firstText}"`);
                try {
                  const firstBtn = firstItem.querySelector('button');
                  if (firstBtn && !firstBtn.disabled) {
                    firstBtn.click();
                  } else if (firstItem && !firstItem.disabled) {
                    firstItem.click();
                  } else {
                    return { selected: false, selectedModel: null, usedFallbackFirst: false };
                  }
                  return { selected: true, selectedModel: 'nano banana pro', usedFallbackFirst: true };
                } catch (e) {
                  console.error(`[MODEL-MENU] Failed to click first item: ${e.message}`);
                  return { selected: false, selectedModel: null, usedFallbackFirst: false };
                }
              }
            }

            return { selected: false, selectedModel: null, usedFallbackFirst: false };
          }, effectiveTargetModel, this.type);

            if (modelSelectionResult?.selected) {
              break;
            }
          }
          
          if (modelSelectionResult?.selected) {
            if (this.type === 'image' && modelSelectionResult.usedFallbackFirst) {
              this.options.model = 'Nano Banana Pro';
              console.log(`   ✓ Nano Banana Pro selected (fallback first item)\n`);
            } else {
              this.options.model = effectiveTargetModel;
              console.log(`   ✓ ${effectiveTargetModel} selected\n`);
            }
          } else {
            console.log(`   ⚠️  Could not select ${effectiveTargetModel} from menu\n`);
          }
        } else {
          console.log(`   ⚠️  Could not open model dropdown\n`);
        }
      } catch (modelErr) {
        console.warn(`   ⚠️  Error selecting model: ${modelErr.message}\n`);
      }

      await this.page.waitForTimeout(500);

      // STEP 6: Close settings menu by clicking settings button again
      console.log('\n   🔧 STEP 6: Closing settings menu...');
      try {
        const settingsClosed = await this.clickSettingsButton();
        if (settingsClosed) {
          console.log('   ✓ Settings menu closed\n');
        } else {
          console.log('   ⚠️  Could not close settings menu, sending Escape key...\n');
          // Fallback: Send Escape key (safer than clicking body)
          await this.page.keyboard.press('Escape');
          await this.page.waitForTimeout(500);
        }
      } catch (closeErr) {
        console.log('   ⚠️  Error closing menu, trying Escape key...');
        try {
          await this.page.keyboard.press('Escape');
          await this.page.waitForTimeout(300);
        } catch (kbErr) {
          console.log('   ⚠️  Escape key also failed, continuing anyway...');
        }
      }

      console.log('   ✅ Settings configuration complete\n');
      return true;

    } catch (error) {
      console.error('   ❌ Error configuring settings:', error.message);
      console.warn('   ⚠️  Continuing with current settings...');
      return false;
    }
  }

  async clickSettingsButton() {
    try {
      console.log('[SETTINGS] Step 1: Finding settings button by content...');
      
      // Find settings button by looking for button containing "Nano Banana" or model name
      // or by looking for button with aria-haspopup that contains aspect ratio + count
      const btnInfo = await this.page.evaluate(() => {
        // Method 1: Find button containing model name "Banana" (for image) or by aspect ratio marker
        let settingsBtn = null;
        
        // Try finding by text content first (most reliable)
        const allButtons = document.querySelectorAll('button[aria-haspopup="menu"]');
        
        console.log(`[SETTINGS] Found ${allButtons.length} buttons with aria-haspopup="menu"`);
        
        for (const btn of allButtons) {
          const text = btn.textContent.toLowerCase();
          const box = btn.getBoundingClientRect();
          
          // Settings button should:
          // 1. Contain "banana" (model name) OR
          // 2. Contain crop ratio icon marker (crop_9_16, crop_16_9) AND count (x1, x2, x3, x4)
          const isBananaModel = text.includes('banana');
          const hasRatioMarker = text.includes('crop') || btn.innerHTML.includes('crop_');
          const hasCount = /x[1-4]/.test(text);
          
          console.log(`[SETTINGS] Button: "${text.substring(0, 50)}" | banana:${isBananaModel} | ratio:${hasRatioMarker} | count:${hasCount}`);
          
          if ((isBananaModel || (hasRatioMarker && hasCount)) && 
              box.width > 100 && box.height > 30 && 
              box.top > 50) {  // Must be below top bar
            settingsBtn = btn;
            console.log(`[SETTINGS] ✓ Found settings button`);
            break;
          }
        }
        
        if (!settingsBtn) {
          console.log('[SETTINGS] ❌ Settings button not found by content');
          return null;
        }

        const box = settingsBtn.getBoundingClientRect();
        
        return {
          x: Math.round(box.x + box.width / 2),
          y: Math.round(box.y + box.height / 2),
          visible: box.width > 0 && box.height > 0,
          text: settingsBtn.textContent.substring(0, 50)
        };
      });

      if (!btnInfo) {
        console.log('[SETTINGS] ❌ Could not identify settings button');
        return false;
      }

      if (!btnInfo.visible) {
        console.log('[SETTINGS] ❌ Settings button not visible');
        return false;
      }

      console.log(`[SETTINGS] Step 2: Found button "${btnInfo.text}" at (${btnInfo.x}, ${btnInfo.y})`);
      
      // Click the button with realistic mouse movements
      console.log('[SETTINGS] Step 3: Moving mouse and clicking...');
      await this.page.mouse.move(btnInfo.x, btnInfo.y);
      await this.page.waitForTimeout(100);
      await this.page.mouse.down();
      await this.page.waitForTimeout(50);
      await this.page.mouse.up();

      // Wait for menu to appear
      console.log('[SETTINGS] Step 4: Waiting for menu...');
      await this.page.waitForTimeout(1000);

      // Verify menu opened by checking if aria-expanded="true"
      const menuOpened = await this.page.evaluate(() => {
        const buttons = document.querySelectorAll('button[aria-haspopup="menu"]');
        
        for (const btn of buttons) {
          const text = btn.textContent.toLowerCase();
          const isBananaModel = text.includes('banana');
          const hasRatioMarker = text.includes('crop') || btn.innerHTML.includes('crop_');
          const hasCount = /x[1-4]/.test(text);
          
          if ((isBananaModel || (hasRatioMarker && hasCount))) {
            const isExpanded = btn.getAttribute('aria-expanded') === 'true';
            const dataState = btn.getAttribute('data-state');
            
            console.log(`[SETTINGS] Menu state - aria-expanded: ${isExpanded}, data-state: ${dataState}`);
            
            return isExpanded || dataState === 'open';
          }
        }
        return false;
      });

      if (menuOpened) {
        console.log('[SETTINGS] ✅ Settings menu opened successfully');
        return true;
      } else {
        console.log('[SETTINGS] ⚠️  Menu may not have opened, continuing...');
        return true;  // Continue anyway as menu may open with delay
      }

    } catch (error) {
      console.error('[SETTINGS] ❌ Error clicking settings button:', error.message);
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
      // First, log all available tab buttons for debugging
      const availableTabs = await this.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button[role="tab"]'));
        return buttons.map(b => ({
          text: b.textContent.trim().substring(0, 50),
          ariaSelected: b.getAttribute('aria-selected')
        }));
      });
      
      if (availableTabs.length > 0) {
        console.log(`   📊 Available tabs:`);
        availableTabs.forEach((tab, idx) => {
          console.log(`      [${idx}] "${tab.text}" (selected: ${tab.ariaSelected})`);
        });
      }
      
      // Find button by text and get its position
      const buttonInfo = await this.page.evaluate((targetLabel) => {
        const buttons = Array.from(document.querySelectorAll('button[role="tab"]'));
        
        for (const btn of buttons) {
          const text = btn.textContent.trim(); // Trim whitespace
          
          // Match by text
          if (text === targetLabel || text.includes(targetLabel.trim())) {
            const rect = btn.getBoundingClientRect();
            
            // Check if visible
            if (rect.width === 0 || rect.height === 0) {
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
        console.log(`   🔴 Not found: ${buttonInfo.error}`);
        console.log(`   > Retrying with alternative search...`);
        
        // Alternative: search in all buttons
        const altButtonInfo = await this.page.evaluate((targetLabel) => {
          const allButtons = Array.from(document.querySelectorAll('button'));
          
          for (const btn of allButtons) {
            const text = btn.textContent.trim();
            if (text.includes(targetLabel)) {
              const rect = btn.getBoundingClientRect();
              if (rect.width > 0 && rect.height > 0) {
                return {
                  found: true,
                  x: Math.round(rect.left + rect.width / 2),
                  y: Math.round(rect.top + rect.height / 2),
                  text: text
                };
              }
            }
          }
          return { found: false };
        }, label);
        
        if (!altButtonInfo.found) {
          console.warn(`   ⚠️  ${buttonInfo.error}`);
          return false;
        }
        
        console.log(`   ✓ Found via alternative search: "${altButtonInfo.text}"`);
        await this.page.mouse.move(altButtonInfo.x, altButtonInfo.y);
        await this.page.waitForTimeout(100);
        await this.page.mouse.down();
        await this.page.waitForTimeout(50);
        await this.page.mouse.up();
        
        return true;
      }

      console.log(`   ✓ Found: "${buttonInfo.text}"`);
      console.log(`     aria-selected=${buttonInfo.ariaSelected}`);
      console.log(`     Position: (${buttonInfo.x}, ${buttonInfo.y})`);

      // Use realistic mouse movement to click (Radix UI compatible)
      console.log(`   🖱️  Clicking...`);
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
    if (this.debugMode) {
      console.log('🔧 [DEBUG] Generate button click skipped (debug mode)\n');
      return false;
    }

    // 🧹 Clear any cached reCAPTCHA tokens before clicking generate
    // ❌ COMMENTED OUT: Already called in enterPrompt() - avoid duplicate token clearing
    // await this.clearGrecaptchaTokens();
    
    console.log('🎬 CLICKING GENERATE BUTTON\n');

    try {
      console.log('   🔍 Finding Generate button...');
      
      const generateBtnInfo = await this.page.evaluate(() => {
        // Strategy 1: Find button with arrow_forward icon (main strategy)
        const buttons = Array.from(document.querySelectorAll('button'));
        let targetBtn = buttons.find(btn => 
          btn.innerHTML.includes('arrow_forward') && 
          !btn.textContent.includes('crop_16_9')
        );
        
        // Strategy 2: Look in the right sidebar container
        if (!targetBtn) {
          const container = document.querySelector('[class*="cYyugN"]');
          if (container) {
            const containerBtns = container.querySelectorAll('button');
            targetBtn = containerBtns[containerBtns.length - 1];
          }
        }
        
        // Strategy 3: Look via .aQhhA class (old method - fallback)
        if (!targetBtn) {
          const legacyContainer = document.querySelector('.aQhhA');
          if (legacyContainer) {
            const legacyBtns = legacyContainer.querySelectorAll('button');
            if (legacyBtns.length >= 2) {
              targetBtn = legacyBtns[1];
            }
          }
        }
        
        // Check if button found and visible
        if (!targetBtn) {
          return { found: false, error: 'Generate button not found in any strategy' };
        }
        
        const rect = targetBtn.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
          return { found: false, error: 'Generate button not visible' };
        }
        
        if (targetBtn.disabled) {
          return { found: false, error: 'Generate button is disabled' };
        }
        
        return {
          found: true,
          x: Math.round(rect.left + rect.width / 2),
          y: Math.round(rect.top + rect.height / 2),
          w: Math.round(rect.width),
          h: Math.round(rect.height),
          text: targetBtn.textContent.trim().substring(0, 50),
          hasArrow: targetBtn.innerHTML.includes('arrow_forward'),
          disabled: targetBtn.disabled
        };
      });

      if (!generateBtnInfo.found) {
        throw new Error(generateBtnInfo.error);
      }

      console.log(`   ✓ Found Generate button\n`);
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

      console.log('   ✓ Generate button clicked\n');
      await this.page.waitForTimeout(1000);

    } catch (error) {
      console.error(`   ⚠️  Button click failed: ${error.message}`);
      console.log('   📝 Falling back to Enter key submission...\n');
      
      // Fallback: Focus textbox and press Enter to submit
      try {
        const textboxExists = await this.page.$('.iTYalL[role="textbox"][data-slate-editor="true"]');
        if (!textboxExists) {
          throw new Error('Prompt textbox not found for Enter fallback');
        }

        // Focus the textbox
        console.log('   🖱️  Focusing prompt textbox...');
        await this.page.evaluate(() => {
          const textbox = document.querySelector('.iTYalL[role="textbox"][data-slate-editor="true"]');
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
   * Detect and handle failed items in generation list (lightweight version for monitoring)
   * Called frequently during generation monitoring to catch and retry failures immediately
   * Handles ONE failed item per call - for continuous monitoring integration
   */
  async checkAndRetryFailedItemOnce() {
    try {
      const failureInfo = await this.page.evaluate(() => {
        // Find all items in the virtuoso list
        const items = document.querySelectorAll('[data-testid="virtuoso-item-list"] [data-tile-id]');
        
        // Check ALL items for failures (scan entire list)
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          
          // Look for warning icon (indicates failure) - check multiple selector patterns
          const warningIcon = item.querySelector('i.google-symbols');
          const hasWarningText = item.querySelector('[class*="dEfdsQ"], [class*="error"], [role="alert"]');
          
          // Check if it's a failed/error state
          const isFailed = (warningIcon && warningIcon.textContent.trim() === 'warning') || 
                          (hasWarningText && hasWarningText.textContent.toLowerCase().includes('không thành công'));
          
          if (isFailed) {
            // Find the error message text
            const errorMsg = item.querySelector('[class*="dEfdsQ"]'); 
            
            // Find retry button (refresh icon button) - try multiple selectors
            const retryBtn = Array.from(item.querySelectorAll('button')).find(btn => {
              const icon = btn.querySelector('i.google-symbols');
              const btnText = btn.textContent.toLowerCase();
              return (icon && (icon.textContent.trim() === 'refresh' || icon.textContent.trim() === 'restart_alt')) ||
                     (btnText.includes('thử') || btnText.includes('retry'));
            });

            if (retryBtn) {
              const rect = retryBtn.getBoundingClientRect();
              return {
                found: true,
                position: i,
                message: errorMsg ? errorMsg.textContent.trim() : 'Unknown error',
                x: Math.round(rect.left + rect.width / 2),
                y: Math.round(rect.top + rect.height / 2)
              };
            }
          }
        }
        
        return { found: false };
      });

      if (!failureInfo.found) {
        return false; // No failures detected
      }

      // Found a failure - click retry
      console.log(`[FAILURES] ❌ Failed item at position #${failureInfo.position}: "${failureInfo.message}"`);
      console.log(`[FAILURES]    🔄 Retrying in 5 seconds...`);
      
      // Wait 5 seconds before retrying
      await this.page.waitForTimeout(5000);
      
      // Click retry button
      await this.page.mouse.move(failureInfo.x, failureInfo.y);
      await this.page.waitForTimeout(150);
      await this.page.mouse.down();
      await this.page.waitForTimeout(100);
      await this.page.mouse.up();
      
      // Wait for retry to start
      await this.page.waitForTimeout(1000);
      console.log(`[FAILURES]    ✓ Retry triggered`);
      return true; // Failure was retried
      
    } catch (error) {
      // Log errors but don't break monitoring
      console.log(`[FAILURES] ⚠️  Error during retry check: ${error.message}`);
      return false;
    }
  }

  /**
   * Detect and handle failed items in generation list (legacy full version)
   * Google Flow sometimes shows "Không thành công" error with retry button
   * This method detects failed items and clicks retry, max 5 times per item
   */
  async detectAndHandleFailures(maxAttempts = 5) {
    console.log('[FAILURES] 🔍 Checking for failed items...');
    
    let retryCount = 0;
    let isCleared = false;

    while (retryCount < maxAttempts && !isCleared) {
      await this.page.waitForTimeout(500); // Stabilization wait
      
      const failureInfo = await this.page.evaluate(() => {
        // Find all items in the virtuoso list
        const items = document.querySelectorAll('[data-testid="virtuoso-item-list"] [data-tile-id]');
        
        // Check TOP 5 items for failures (new items at top)
        for (let i = 0; i < Math.min(5, items.length); i++) {
          const item = items[i];
          
          // Look for warning icon (indicates failure)
          const warningIcon = item.querySelector('i.google-symbols:not([style*="display"])');
          const warningText = item.querySelector('div');
          
          if (warningIcon && warningIcon.textContent.trim() === 'warning') {
            // Find the error message text
            const errorMsg = item.querySelector('[class*="dEfdsQ"]'); // "Không thành công" text
            
            // Find retry button (refresh icon button)
            const retryBtn = Array.from(item.querySelectorAll('button')).find(btn => {
              const icon = btn.querySelector('i.google-symbols');
              return icon && (icon.textContent.includes('refresh') || icon.textContent.includes('Thử lại'));
            });

            if (retryBtn) {
              const rect = retryBtn.getBoundingClientRect();
              return {
                found: true,
                position: i,
                message: errorMsg ? errorMsg.textContent.trim() : 'Unknown error',
                x: Math.round(rect.left + rect.width / 2),
                y: Math.round(rect.top + rect.height / 2)
              };
            }
          }
        }
        
        return { found: false };
      });

      if (!failureInfo.found) {
        console.log('[FAILURES] ✅ No failed items detected');
        isCleared = true;
        break;
      }

      retryCount++;
      console.log(`[FAILURES] ❌ Failed item detected at position #${failureInfo.position}`);
      console.log(`[FAILURES]    Error: "${failureInfo.message}"`);
      console.log(`[FAILURES]    Retry attempt ${retryCount}/${maxAttempts}...`);
      
      // Click retry button
      await this.page.mouse.move(failureInfo.x, failureInfo.y);
      await this.page.waitForTimeout(150);
      await this.page.mouse.down();
      await this.page.waitForTimeout(100);
      await this.page.mouse.up();
      
      // Wait for retry to process (enhanced wait time)
      console.log(`[FAILURES]    ⏳ Waiting for retry to process...`);
      await this.page.waitForTimeout(3000);
    }

    if (retryCount >= maxAttempts && !isCleared) {
      throw new Error(`[FAILURES] ❌ Item failed after ${maxAttempts} retry attempts. Generation aborted.`);
    }

    console.log('[FAILURES] ✓ All items checked - no failures\n');
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
      qualityOptions = [
        '2k', 
        '2K', 
        '1k', 
        '1K'];  // Try 2K first, fallback to 1K
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
      // Capture ALL links to ensure robust matching
      const linkData = await this.page.evaluate((targetHref) => {
        const allLinks = Array.from(document.querySelectorAll('[data-testid="virtuoso-item-list"] a[href]'));
        
        // Find exact match
        for (const link of allLinks) {
          const href = link.getAttribute('href');
          if (href === targetHref) {
            const rect = link.getBoundingClientRect();
            return {
              found: true,
              x: Math.round(rect.left + rect.width / 2),
              y: Math.round(rect.top + rect.height / 2),
              linkCount: allLinks.length
            };
          }
        }
        
        // Not found - return all hrefs for debugging
        const allHrefs = allLinks.map(l => l.getAttribute('href'));
        return { found: false, linkCount: allLinks.length, allHrefs };
      }, newHref);

      if (!linkData.found) {
        console.warn(`   ⚠️  Item not found for download: ${newHref.substring(0, 60)}...`);
        if (linkData && linkData.allHrefs && linkData.allHrefs.length > 0) {
          console.warn(`   📎 Available hrefs (${linkData.allHrefs.length}):`);
          for (let i = 0; i < Math.min(5, linkData.allHrefs.length); i++) {
            console.warn(`      [${i}] ${linkData.allHrefs[i].substring(0, 50)}...`);
          }
        }
        console.warn('');
        return null;
      }

      console.log(`   ✓ Found ${mediaType} (${linkData.linkCount} total items)`);

      console.log(`   🖱️  Right-clicking on ${mediaType}...`);
      // Use mouse movement method for right-click (Method 2)
      await this.page.mouse.move(linkData.x, linkData.y);
      await this.page.waitForTimeout(100);
      await this.page.mouse.down({ button: 'right' });
      await this.page.waitForTimeout(50);
      await this.page.mouse.up({ button: 'right' });
      
      // Wait for context menu to fully render and page to stabilize
      console.log('   ⏳ Waiting for context menu to appear...');
      
      // Wait extra to ensure page is stable before evaluate
      // Sometimes page navigation happens after right-click
      try {
        await Promise.race([
          this.page.waitForTimeout(3000),
          this.page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {})
        ]);
      } catch (e) {
        // Navigation timeout is OK, page might not navigate
        await this.page.waitForTimeout(1000);
      }

      // Find and click download option from context menu
      // Looking for: <div role="menuitem" with icon "download" and text "Tải xuống"
      let downloadInfo = null;
      let retries = 0;
      const maxRetries = 3;
      
      while (retries < maxRetries && !downloadInfo?.found) {
        try {
          downloadInfo = await this.page.evaluate(() => {
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
          break; // Success, exit retry loop
        } catch (error) {
          retries++;
          if (error.message.includes('main frame') || error.message.includes('Execution context was destroyed')) {
            console.log(`   ⏱️  Page unstable (${retries}/${maxRetries}), retrying...`);
            await this.page.waitForTimeout(1000);
          } else {
            throw error;
          }
        }
      }

      if (!downloadInfo) {
        console.warn('   ⚠️  Download option not found in context menu (after retries)');
        console.warn('   💡 Tip: Image may need more time to load. Try increasing wait time.\n');
        return null;
      }

      // Click download button using JavaScript (more reliable)
      console.log('   🖱️  Clicking "Tải xuống" option...');
      const downloadClicked = await this.page.evaluate(() => {
        const items = document.querySelectorAll('[role="menuitem"]');
        for (const item of items) {
          const text = item.textContent.toLowerCase();
          const hasDownloadIcon = item.innerHTML.includes('download');
          
          if ((text.includes('tải') || text.includes('download')) && hasDownloadIcon) {
            try {
              item.click();
              return true;
            } catch (e) {
              console.error(`Failed to click download: ${e.message}`);
            }
          }
        }
        return false;
      });

      if (!downloadClicked) {
        console.warn('   ⚠️  Failed to click download via JavaScript, trying with mouse...');
        await this.page.mouse.move(downloadInfo.x, downloadInfo.y);
        await this.page.waitForTimeout(150);
        await this.page.mouse.down();
        await this.page.waitForTimeout(100);
        await this.page.mouse.up();
      } else {
        console.log('   ✅ Download button clicked successfully via JavaScript');
      }

      // Wait for submenu to appear
      console.log('   ⏳ Waiting for submenu...');
      await this.page.waitForTimeout(2000);

      let submenuReady = await this.page.evaluate(() => {
        const openMenus = Array.from(document.querySelectorAll('[role="menu"][data-state="open"], [data-radix-menu-content][data-state="open"]'));
        const hasSubmenuOptions = openMenus.some(menu => menu.querySelectorAll('[role="menuitem"]').length > 0);
        return { hasSubmenuOptions, menuCount: openMenus.length };
      });

      if (!submenuReady.hasSubmenuOptions) {
        console.log('   ⏳ Submenu not ready yet, waiting thêm 1.5s rồi query lại...');
        await this.page.waitForTimeout(1500);
        submenuReady = await this.page.evaluate(() => {
          const openMenus = Array.from(document.querySelectorAll('[role="menu"][data-state="open"], [data-radix-menu-content][data-state="open"]'));
          const hasSubmenuOptions = openMenus.some(menu => menu.querySelectorAll('[role="menuitem"]').length > 0);
          return { hasSubmenuOptions, menuCount: openMenus.length };
        });
      }

      // Try to find and click the best quality option
      let selectedQuality = null;
      for (const quality of qualityOptions) {
        let qualityInfo = null;
        let retries = 0;
        const maxRetries = 3;
        
        while (retries < maxRetries && !qualityInfo?.found) {
          try {
            qualityInfo = await this.page.evaluate((targetQuality) => {
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
            break; // Success
          } catch (error) {
            retries++;
            if (error.message.includes('main frame') || error.message.includes('Execution context was destroyed')) {
              console.log(`   ⏱️  Page unstable trying ${quality} (${retries}/${maxRetries}), retrying...`);
              await this.page.waitForTimeout(500);
            } else {
              throw error;
            }
          }
        }

        // Click quality option
        if (qualityInfo.found) {
          selectedQuality = quality;
          console.log(`   🖱️  Clicking ${quality}...`);
          
          // Click directly via JavaScript (more reliable than mouse events)
          const clickSuccess = await this.page.evaluate((targetQuality) => {
            const buttons = document.querySelectorAll('[role="menuitem"]');
            for (const btn of buttons) {
              if (btn.textContent.toLowerCase().includes(targetQuality.toLowerCase())) {
                try {
                  btn.click();
                  return true;
                } catch (e) {
                  console.error(`Failed to click ${targetQuality}: ${e.message}`);
                }
              }
            }
            return false;
          }, quality);

          if (!clickSuccess) {
            console.warn(`   ⚠️  Failed to click ${quality} via JavaScript, trying with mouse...`);
            await this.page.mouse.move(qualityInfo.x, qualityInfo.y);
            await this.page.waitForTimeout(150);
            await this.page.mouse.down();
            await this.page.waitForTimeout(100);
            await this.page.mouse.up();
          } else {
            console.log(`   ✅ ${quality} clicked successfully via JavaScript`);
          }
          
          // Wait extra time for download to initiate
          await this.page.waitForTimeout(2000);
          
          // 💫 NEW: Detect and close error popups (e.g., "Không tăng độ phân giải được!")
          const errorDetected = await this.page.evaluate(() => {
            // Look for error toast/popup elements
            const errorPatterns = [
              '[data-sonner-toast]',  // Sonner toast container
              '[role="alert"]',  // ARIA alert
              '.error',
              '[class*="error"]',
              '[class*="toast"]'
            ];

            for (const selector of errorPatterns) {
              const elements = document.querySelectorAll(selector);
              for (const el of elements) {
                const text = el.textContent.toLowerCase();
                // Check for upscaling error messages (Vietnamese: "Không tăng độ phân giải được!")
                if (text.includes('phân giải') || text.includes('upscal') || text.includes('không thể') || text.includes('error')) {
                  // Try to find and click close button
                  const closeBtn = el.querySelector('button');
                  if (closeBtn) {
                    try {
                      closeBtn.click();
                      return { found: true, message: text.substring(0, 100) };
                    } catch (e) {
                      console.error(`Failed to click close button: ${e.message}`);
                    }
                  }
                  // If no button, try to remove the element
                  try {
                    el.remove();
                    return { found: true, message: text.substring(0, 100) };
                  } catch (e) {
                    console.error(`Failed to remove error element: ${e.message}`);
                  }
                }
              }
            }
            return { found: false };
          });

          if (errorDetected.found) {
            console.warn(`   ⚠️  Error popup detected and closed: "${errorDetected.message}"`);
            console.log(`   💡 This likely means ${quality} upscaling failed. Trying next quality option...`);
            
            // Close any open menus
            await this.page.keyboard.press('Escape');
            await this.page.waitForTimeout(300);
            
            // Continue to next quality option instead of giving up
            continue;
          }
          
          break;
        }
      }

      if (!selectedQuality) {
        console.warn('   ⚠️  No quality option found, trying first available...\n');

        const getFirstSubmenuOption = async () => this.page.evaluate(() => {
          const openMenus = Array.from(document.querySelectorAll('[role="menu"][data-state="open"], [data-radix-menu-content][data-state="open"]'));
          const submenu = openMenus[openMenus.length - 1];
          if (!submenu) return { found: false, reason: 'no-open-menu' };

          const buttons = Array.from(submenu.querySelectorAll('[role="menuitem"]')).filter(btn => {
            const rect = btn.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          });

          if (buttons.length === 0) return { found: false, reason: 'no-visible-menuitems' };

          const firstBtn = buttons[0];
          const rect = firstBtn.getBoundingClientRect();
          return {
            found: true,
            x: Math.round(rect.left + rect.width / 2),
            y: Math.round(rect.top + rect.height / 2),
            text: (firstBtn.textContent || '').trim()
          };
        });

        let firstOption = await getFirstSubmenuOption();
        if (!firstOption.found) {
          console.log('   ⏳ Submenu options chưa thấy, đợi thêm 1.5s rồi query lại...');
          await this.page.waitForTimeout(1500);
          firstOption = await getFirstSubmenuOption();
        }

        if (!firstOption.found) {
          console.warn(`   ⚠️  No submenu options available (${firstOption.reason || 'unknown'})\n`);
          return null;
        }

        // Click first option with Method 2
        console.log(`   🖱️  Clicking first available option: "${firstOption.text || 'unknown'}"...`);
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

  async reuseLastCommand() {
    /**
     * Find the last generated item and reuse its command
     * Used for segments 2-4 in multi-segment video generation
     * 
     * Steps:
     * 1. Capture ALL hrefs from virtuoso list
     * 2. Take the FIRST one (most recently added/first in list)
     * 3. Call rightClickReuseCommand(href) to show reuse menu
     */
    try {
      // Capture all hrefs and get the first (most recent)
      const allHrefs = await this.getHrefsFromVirtuosoList();
      
      if (allHrefs.length === 0) {
        console.log('   ⚠️  No items found in list');
        return false;
      }

      const lastHref = allHrefs[0]; // First = most recent
      console.log(`   🔄 Found most recent item (${allHrefs.length} total items)`);
      console.log(`   📎 Href: ${lastHref.substring(0, 60)}...`);

      // Now right-click on it and select reuse
      console.log(`   🔄 Reusing command from last generated video...`);
      return await this.rightClickReuseCommand(lastHref);

    } catch (error) {
      console.error(`   ❌ Error in reuseLastCommand: ${error.message}`);
      return false;
    }
  }

  async prepareSegmentImages(imageComposition, imageUrls) {
    /**
     * Prepare images for a specific video segment by selecting them from previously uploaded images
     * 
     * Flow:
     * 1. For each image in imageComposition array (e.g., ['wearing', 'product']):
     *    - Find the corresponding href from imageUrls map
     *    - Right-click on the image and select "Thêm vào câu lệnh"
     * 2. Wait for all images to be added to command
     * 3. Images are now ready for prompt generation
     * 
     * @param {Array<string>} imageComposition - Array of image names like ['wearing', 'product']
     * @param {Object} imageUrls - Map of image names to hrefs: {wearing: 'href1', holding: 'href2', product: 'href3'}
     * @returns {Promise<boolean>} - True if at least one image was added successfully
     */
    console.log(`\n📷 PREPARING SEGMENT IMAGES: [${imageComposition.join(', ')}]`);
    
    try {
      let successCount = 0;
      
      for (const imageName of imageComposition) {
        const href = imageUrls[imageName];
        
        if (!href) {
          console.warn(`   ⚠️  No href found for image: ${imageName}`);
          continue;
        }
        
        console.log(`   📌 Adding image: ${imageName}`);
        const addedSuccess = await this.addImageToCommand(href);
        
        if (addedSuccess) {
          console.log(`   ✓ Image ${imageName} added to command`);
          successCount++;
        } else {
          console.warn(`   ⚠️  Could not add image ${imageName}, skipping...`);
        }
        
        // Small delay between adding images
        await this.page.waitForTimeout(500);
      }
      
      if (successCount === 0) {
        console.warn(`   ⚠️  No images were added to command`);
        return false;
      }
      
      console.log(`   ✅ Added ${successCount}/${imageComposition.length} images to command\n`);
      return true;
      
    } catch (error) {
      console.error(`   ❌ Error preparing segment images: ${error.message}`);
      return false;
    }
  }

  async addImageToCommand(itemHref) {
    /**
     * Find an image by href and add it to the command via right-click menu
     * 
     * Used in both:
     * - Multi-image upload flow (uploadImages)
     * - Per-segment image selection (prepareSegmentImages)
     * 
     * @param {string} itemHref - The href attribute value to find
     * @returns {Promise<boolean>} - True if image was added successfully
     */
    try {
      // Find the item with this href
      const linkData = await this.page.evaluate((targetHref) => {
        // Capture all links to find exact match
        const allLinks = Array.from(document.querySelectorAll('[data-testid="virtuoso-item-list"] a[href]'));
        
        // Find exact match
        for (const link of allLinks) {
          const href = link.getAttribute('href');
          if (href === targetHref) {
            const rect = link.getBoundingClientRect();
            return {
              found: true,
              x: Math.round(rect.left + rect.width / 2),
              y: Math.round(rect.top + rect.height / 2),
              linkCount: allLinks.length
            };
          }
        }
        
        // Not found - return all hrefs for debugging
        const allHrefs = allLinks.map(l => l.getAttribute('href'));
        return { found: false, linkCount: allLinks.length, allHrefs };
      }, itemHref);

      if (!linkData.found) {
        console.log(`      ⚠️  Image not found by href: ${itemHref.substring(0, 60)}...`);
        if (linkData && linkData.allHrefs && linkData.allHrefs.length > 0) {
          console.log(`      📎 Available hrefs (${linkData.allHrefs.length}):`);
          for (let i = 0; i < Math.min(5, linkData.allHrefs.length); i++) {
            console.log(`         [${i}] ${linkData.allHrefs[i].substring(0, 50)}...`);
          }
        }
        return false;
      }

      console.log(`      ✓ Found image (${linkData.linkCount} total items)`);
      console.log(`      ⏳ Moving mouse to image and waiting 3s before right-click...`);

      // Right-click on the image using mouse movement method
      await this.page.mouse.move(linkData.x, linkData.y);
      await this.page.waitForTimeout(3000);  // Wait 3s for visual feedback before right-click
      await this.page.mouse.down({ button: 'right' });
      await this.page.waitForTimeout(50);
      await this.page.mouse.up({ button: 'right' });
      
      // Wait for context menu to appear
      console.log(`      ⏳ Waiting for context menu...`);
      await this.page.waitForTimeout(1500);

      // Find and click "Thêm vào câu lệnh" button
      const addedToCmdSuccess = await this.page.evaluate(() => {
        const menuItems = document.querySelectorAll('[role="menuitem"]');
        
        for (const item of menuItems) {
          const text = item.textContent.toLowerCase();
          const hasCheckIcon = item.innerHTML.includes('check') || item.innerHTML.includes('checkmark');
          
          // Look for "thêm vào câu lệnh" text with check icon
          if ((text.includes('thêm vào') || text.includes('add')) && hasCheckIcon) {
            const rect = item.getBoundingClientRect();
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
          if (text.includes('thêm vào') || text.includes('add to')) {
            const rect = item.getBoundingClientRect();
            return {
              found: true,
              x: Math.round(rect.left + rect.width / 2),
              y: Math.round(rect.top + rect.height / 2)
            };
          }
        }
        
        return { found: false };
      });

      if (!addedToCmdSuccess.found) {
        console.log(`      ⚠️  "Thêm vào câu lệnh" option not found`);
        return false;
      }

      // Click the "Thêm vào câu lệnh" button using mouse movement method
      await this.page.mouse.move(addedToCmdSuccess.x, addedToCmdSuccess.y);
      await this.page.waitForTimeout(150);
      await this.page.mouse.down();
      await this.page.waitForTimeout(100);
      await this.page.mouse.up();

      console.log(`      ✓ Added to command`);
      await this.page.waitForTimeout(2000);  // Wait 2s before moving to next image
      
      return true;

    } catch (error) {
      console.error(`      ❌ Error: ${error.message}`);
      return false;
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
      // Find the item with this href - capture ALL links for robust matching
      const linkData = await this.page.evaluate((targetHref) => {
        const allLinks = Array.from(document.querySelectorAll('[data-testid="virtuoso-item-list"] a[href]'));
        
        // Find exact match
        for (const link of allLinks) {
          const href = link.getAttribute('href');
          if (href === targetHref) {
            const rect = link.getBoundingClientRect();
            return {
              found: true,
              x: Math.round(rect.left + rect.width / 2),
              y: Math.round(rect.top + rect.height / 2),
              linkCount: allLinks.length
            };
          }
        }

        // Not found - return all hrefs for debugging
        const allHrefs = allLinks.map(l => l.getAttribute('href'));
        return { found: false, linkCount: allLinks.length, allHrefs };
      }, itemHref);

      if (!linkData.found) {
        console.log(`   ⚠️  Item not found for reuse: ${itemHref.substring(0, 60)}...`);
        if (linkData && linkData.allHrefs && linkData.allHrefs.length > 0) {
          console.log(`   📎 Available hrefs (${linkData.allHrefs.length}):`);
          for (let i = 0; i < Math.min(5, linkData.allHrefs.length); i++) {
            console.log(`      [${i}] ${linkData.allHrefs[i].substring(0, 50)}...`);
          }
        }
        return false;
      }

      console.log(`   ✓ Found item (${linkData.linkCount} total items)`);

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


  /**
   * Generate multiple images/videos sequentially with different prompts
   * Used for TikTok affiliate flow: wearing image + holding image
   * 
   * NEW FLOW:
   * 1. Upload images + Monitor until they appear in gallery
   * 2. For each prompt:
   *    - Paste prompt
   *    - Submit
   *    - Monitor hrefs for new generation
   *    - If error: retry via "reuse command" on that href (max 5 times)
   *    - If success: download
   *    - Clear prompt text (Ctrl+A+Backspace)
   * 3. Close browser
   */
  async generateMultiple(characterImagePath, productImagePath, prompts, options = {}) {
    if (this.debugMode) {
      console.log('\n🔧 [DEBUG] generateMultiple() is disabled (debug mode)');
      console.log('   - init() allowed');
      console.log('   - navigateToFlow() allowed');
      console.log('   - All other steps skipped\n');
      
      await this.init();
      await this.navigateToFlow();
      
      console.log('\n✅ Browser open at Google Flow project');
      console.log('   (Manual testing enabled)\n');
      
      return {
        success: true,
        debugMode: true,
        message: 'Debug mode: only opened project'
      };
    }

    console.log(`\n${'═'.repeat(80)}`);
    console.log(`📊 MULTI-IMAGE GENERATION: ${prompts.length} images`);
    console.log(`${'═'.repeat(80)}\n`);
    console.log(`📸 Character image: ${path.basename(characterImagePath)}`);
    console.log(`📦 Product image: ${path.basename(productImagePath)}`);
    // 💫 NEW: Handle optional scene reference image
    if (options.sceneImagePath) {
      console.log(`🎬 Scene image: ${path.basename(options.sceneImagePath)} (reference)`);
    }
    // 💫 NEW: Log scene locked prompt if available
    if (options.sceneLockedPrompt) {
      console.log(`📝 Scene locked prompt: "${options.sceneLockedPrompt.substring(0, 60)}..." (from scene: ${options.sceneName})`);
    }
    console.log();

    const results = [];
    let uploadedImageHrefs = [];

    try {
      // STEP 1: Initialize browser session
      console.log('\n[INIT] 🚀 Initializing browser...');
      await this.init();
      console.log('[INIT] ✅ Browser initialized\n');

      // STEP 2: Navigate to Google Flow project
      console.log('[NAV] 🔗 Navigating to Google Flow...');
      await this.navigateToFlow();
      console.log('[NAV] ✅ Navigated to project');
      console.log('[DELAY] ⏳ Waiting 2 seconds...');
      await this.page.waitForTimeout(2000);
      console.log('[DELAY] ✅ Ready\n');

      // STEP 3: Wait for page to be fully ready
      console.log('[PAGE] ⏳ Waiting for page to load...');
      await this.waitForPageReady();
      console.log('[PAGE] ✅ Page ready');
      console.log('[DELAY] ⏳ Waiting 5 seconds (special delay after page load)...');
      await this.page.waitForTimeout(5000);
      console.log('[DELAY] ✅ Ready\n');

      // STEP 4: Configure settings ONCE AT START
      console.log('[CONFIG] ⚙️  Configuring settings (ONE TIME)...');
      const settingsOk = await this.configureSettings();
      if (!settingsOk) {
        console.log('[CONFIG] ⚠️  Settings might be incomplete, continuing...');
      } else {
        console.log('[CONFIG] ✅ Settings configured');
      }
      console.log('[DELAY] ⏳ Waiting 2 seconds...');
      await this.page.waitForTimeout(2000);
      console.log('[DELAY] ✅ Ready\n');

      // STEP 5: Focus textbox and capture initial hrefs BEFORE uploading
      console.log('[HREFS] 📸 Capturing initial hrefs BEFORE upload...');
      let initialHrefs = await this.page.evaluate(() => {
        const links = document.querySelectorAll('[data-testid="virtuoso-item-list"] a[href]');
        return Array.from(links).map(link => ({
          href: link.getAttribute('href'),
          src: link.querySelector('img')?.src || ''
        }));
      });
      console.log(`[HREFS] ✓ Captured ${initialHrefs.length} initial items\n`);

      // STEP 6: Focus on textbox, upload images with 5s cooldown between uploads
      console.log('[UPLOAD] 📤 Focusing textbox and uploading images...');
      await this.page.focus('.iTYalL[role="textbox"][data-slate-editor="true"]');
      await this.page.waitForTimeout(300);

      const pasteImageToTextbox = async (imagePath, label, cooldownMs = 5000) => {
        console.log(`[UPLOAD] 📎 Pasting ${label}: ${path.basename(imagePath)}`);
        const imageData = fs.readFileSync(imagePath);
        const imageBase64 = Buffer.from(imageData).toString('base64');

        await this.page.evaluate((base64Str) => {
          return fetch(`data:image/png;base64,${base64Str}`)
            .then(res => res.blob())
            .then(blob => navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]))
            .then(() => true)
            .catch(() => false);
        }, imageBase64);

        await this.page.waitForTimeout(500);
        await this.page.focus('.iTYalL[role="textbox"][data-slate-editor="true"]');
        await this.page.waitForTimeout(120);

        await this.page.keyboard.down('Control');
        await this.page.keyboard.press('v');
        await this.page.keyboard.up('Control');

        console.log(`[UPLOAD] ✅ ${label} pasted. Cooling down ${cooldownMs / 1000}s...`);
        await this.page.waitForTimeout(cooldownMs);
      };

      await pasteImageToTextbox(characterImagePath, 'character image', 5000);
      await pasteImageToTextbox(productImagePath, 'product image', 5000);

      // Optional scene image (does not change requirement: must detect at least 2 uploaded hrefs)
      if (options.sceneImagePath && fs.existsSync(options.sceneImagePath)) {
        try {
          await pasteImageToTextbox(options.sceneImagePath, 'scene reference image', 5000);
          console.log('[UPLOAD] ✓ Scene reference image pasted');
        } catch (sceneError) {
          console.warn(`[UPLOAD] ⚠️  Scene reference image upload failed (optional): ${sceneError.message}`);
        }
      }

      console.log('[UPLOAD] ✅ Upload actions finished. Start monitoring uploaded hrefs...\n');

      // STEP 7: Monitor hrefs until at least 2 NEW uploaded items appear in gallery
      console.log('[MONITOR] 👀 Monitoring virtuoso list for uploaded hrefs (need >= 2)...');
      let uploadedHrefsAppeared = false;
      let monitoringAttempts = 0;
      const maxMonitoringAttempts = 90;  // Max 90 seconds
      const initialHrefSet = new Set(initialHrefs.map(item => item.href).filter(Boolean));

      while (!uploadedHrefsAppeared && monitoringAttempts < maxMonitoringAttempts) {
        monitoringAttempts++;

        const currentHrefs = await this.page.evaluate(() => {
          const links = document.querySelectorAll('[data-testid="virtuoso-item-list"] a[href]');
          return Array.from(links).map(link => ({
            href: link.getAttribute('href'),
            src: link.querySelector('img')?.src || ''
          })).filter(item => !!item.href);
        });

        const newUploadedItems = currentHrefs.filter(item => !initialHrefSet.has(item.href));

        if (newUploadedItems.length >= 2) {
          uploadedImageHrefs = newUploadedItems.slice(0, 2);
          uploadedHrefsAppeared = true;
          console.log(`[MONITOR] ✅ Detected ${newUploadedItems.length} new hrefs (using first 2 as upload refs)`);

          // Save stable refs for fallback stage
          this.uploadedImageRefs = {
            wearing: {
              href: uploadedImageHrefs[0]?.href || null,
              imgSrc: uploadedImageHrefs[0]?.src || null,
              text: 'uploaded-ref-wearing'
            },
            product: {
              href: uploadedImageHrefs[1]?.href || null,
              imgSrc: uploadedImageHrefs[1]?.src || null,
              text: 'uploaded-ref-product'
            }
          };

          console.log(`   📎 wearing href: ${this.uploadedImageRefs.wearing.href?.substring(0, 60) || '(none)'}`);
          console.log(`   📎 product href: ${this.uploadedImageRefs.product.href?.substring(0, 60) || '(none)'}`);
          console.log('[MONITOR] ⏳ Waiting 3s for images to fully attach to prompt...');
          await this.page.waitForTimeout(3000);

          await this.page.focus('.iTYalL[role="textbox"][data-slate-editor="true"]');
          await this.page.waitForTimeout(300);
          break;
        }

        if (monitoringAttempts % 5 === 0) {
          console.log(`[MONITOR] Attempt ${monitoringAttempts}/${maxMonitoringAttempts}: found ${newUploadedItems.length}/2 new hrefs`);
        }

        await this.page.waitForTimeout(1000);
      }

      if (!uploadedHrefsAppeared) {
        throw new Error('Uploaded images did not appear with đủ 2 href in gallery after 90 seconds');
      }

      console.log('[MONITOR] ✅ Upload href validation passed (2 refs ready)\n');

      const clickSubmitButton = async () => {
        const submitResult = await this.page.evaluate(() => {
          const textbox = document.querySelector('.iTYalL[role="textbox"][data-slate-editor="true"]');
          if (!textbox) return { found: false, clicked: false };

          let container = textbox;
          for (let i = 0; i < 6; i++) {
            if (!container) break;
            const hasButton = container.querySelector('button');
            if (hasButton) break;
            container = container.parentElement;
          }

          const buttons = container?.querySelectorAll('button') || [];
          for (const btn of buttons) {
            const icon = btn.querySelector('i.google-symbols');
            if (icon && icon.textContent.includes('arrow_forward') && !btn.disabled) {
              try {
                btn.click();
                return { found: true, clicked: true };
              } catch (e) {
                console.error(`Failed to click arrow forward: ${e.message}`);
              }
            }
          }
          return { found: buttons.length > 0, clicked: false };
        });

        return !!submitResult.clicked;
      };

      const detectLatestErrorTile = async () => {
        return this.page.evaluate(() => {
          const tiles = Array.from(document.querySelectorAll('[data-testid="virtuoso-item-list"] [data-tile-id]'));
          for (let i = 0; i < Math.min(6, tiles.length); i++) {
            const tile = tiles[i];
            const tileText = (tile.textContent || '').toLowerCase();
            const hasAnchor = !!tile.querySelector('a[href]');
            const hasErrorText = tileText.includes('không thành công') || tileText.includes('đã xảy ra lỗi') || tileText.includes('lỗi');
            const buttons = Array.from(tile.querySelectorAll('button')).map(btn => ({
              text: (btn.textContent || '').trim().toLowerCase(),
              rect: btn.getBoundingClientRect()
            }));

            const retryBtn = buttons.find(btn => btn.text.includes('thử lại') || btn.text.includes('retry'));
            const reuseBtn = buttons.find(btn => btn.text.includes('sử dụng lại') || btn.text.includes('reuse') || btn.text.includes('dùng lại'));
            const hasErrorState = hasErrorText;


            if (hasErrorState) {
              const tileRect = tile.getBoundingClientRect();
              return {
                found: true,
                tileId: tile.getAttribute('data-tile-id') || null,
                message: (tile.textContent || '').trim().substring(0, 180),
                hasAnchor,
                tileCenter: {
                  x: Math.round(tileRect.left + tileRect.width / 2),
                  y: Math.round(tileRect.top + tileRect.height / 2)
                },
                retryButton: retryBtn ? {
                  x: Math.round(retryBtn.rect.left + retryBtn.rect.width / 2),
                  y: Math.round(retryBtn.rect.top + retryBtn.rect.height / 2)
                } : null,
                reuseButton: reuseBtn ? {
                  x: Math.round(reuseBtn.rect.left + reuseBtn.rect.width / 2),
                  y: Math.round(reuseBtn.rect.top + reuseBtn.rect.height / 2)
                } : null
              };
            }
          }

          return { found: false };
        });
      };

      const waitForErrorTileCleared = async (targetTileId, timeoutMs = 18000) => {
        const maxChecks = Math.ceil(timeoutMs / 1000);
        for (let attempt = 1; attempt <= maxChecks; attempt++) {
          const state = await this.page.evaluate((tileId) => {
            if (!tileId) return { cleared: false };
            const tile = document.querySelector(`[data-testid="virtuoso-item-list"] [data-tile-id="${tileId}"]`);
            if (!tile) return { cleared: true };

            const text = (tile.textContent || '').toLowerCase();
            const stillError = text.includes('không thành công') || text.includes('đã xảy ra lỗi') || text.includes('failed') || text.includes('error');
            return { cleared: !stillError };
          }, targetTileId);

          if (state.cleared) return true;
          await this.page.waitForTimeout(1000);
        }

        return false;
      };

      const fallbackReAddUploadedImagesAndSubmit = async (promptText) => {
        console.log('[FALLBACK] 📌 Re-add 2 uploaded images -> paste prompt -> wait 3s -> submit');

        const refs = [
          this.uploadedImageRefs?.wearing?.href,
          this.uploadedImageRefs?.product?.href
        ].filter(Boolean);

        if (refs.length < 2) {
          console.log('[FALLBACK] ⚠️  Missing uploaded href refs, cannot re-add 2 images');
          return false;
        }

        for (const href of refs) {
          const added = await this.addImageToCommand(href);
          if (!added) {
            console.log(`[FALLBACK] ⚠️  Failed to add href: ${href.substring(0, 60)}...`);
            return false;
          }
          await this.page.waitForTimeout(500);
        }

        await this.page.focus('.iTYalL[role="textbox"][data-slate-editor="true"]');
        await this.page.waitForTimeout(150);

        await this.page.keyboard.down('Control');
        await this.page.keyboard.press('a');
        await this.page.keyboard.up('Control');
        await this.page.waitForTimeout(100);
        await this.page.keyboard.press('Backspace');
        await this.page.waitForTimeout(300);

        await this.page.evaluate((text) => {
          navigator.clipboard.writeText(text).catch(() => {});
        }, promptText);

        await this.page.waitForTimeout(200);
        await this.page.keyboard.down('Control');
        await this.page.keyboard.press('v');
        await this.page.keyboard.up('Control');

        console.log('[FALLBACK] ⏳ Wait 3s for Slate editor stable...');
        await this.page.waitForTimeout(3000);

        return clickSubmitButton();
      };

      let lastGeneratedHref = null;

      // STEP 8: Main prompt loop
      for (let i = 0; i < prompts.length; i++) {


        console.log(`\n${'═'.repeat(80)}`);
        console.log(`🎨 PROMPT ${i + 1}/${prompts.length}: Processing`);
        console.log(`${'═'.repeat(80)}\n`);

        const prompt = prompts[i];
        
        // Validate prompt
        if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
          console.error(`❌ PROMPT ${i + 1} INVALID: Expected non-empty string`);
          results.push({
            success: false,
            imageNumber: i + 1,
            error: 'Invalid prompt'
          });
          throw new Error(`Invalid prompt at index ${i}`);
        }

        try {
          // STEP A: From prompt #2 onward, reuse previous command from last generated href
          if (i > 0) {
            if (!lastGeneratedHref) {
              throw new Error('Missing lastGeneratedHref for prompt chaining (cannot run reuse-command flow)');
            }

            console.log(`[CHAIN] 🔄 Reusing command from previous href...`);
            const reused = await this.rightClickReuseCommand(lastGeneratedHref);
            if (!reused) {
              throw new Error('Failed to click "Sử dụng lại câu lệnh" on previous generated href');
            }

            await this.page.focus('.iTYalL[role="textbox"][data-slate-editor="true"]');
            await this.page.waitForTimeout(200);

            console.log('[CHAIN] 🧹 Clearing reused prompt text (Ctrl+A + Backspace)...');
            await this.page.keyboard.down('Control');
            await this.page.keyboard.press('a');
            await this.page.keyboard.up('Control');
            await this.page.waitForTimeout(100);
            await this.page.keyboard.press('Backspace');
            await this.page.waitForTimeout(400);

            console.log('[CHAIN] ✅ Reuse attached images should remain; textbox cleaned for new prompt\n');
          }


          // STEP B: Capture hrefs before entering new prompt
          console.log('[STEP B] 📸 Capturing hrefs BEFORE prompt submission...');
          const prePromptHrefs = await this.page.evaluate(() => {
            const links = document.querySelectorAll('[data-testid="virtuoso-item-list"] a[href]');
            return Array.from(links).map(link => link.getAttribute('href'));
          });
          console.log(`[STEP B] ✓ Captured ${prePromptHrefs.length} items\n`);

          // STEP C: Paste prompt
          console.log(`[STEP C] 📝 Entering prompt (${prompt.length} chars)...`);
          const normalizedPrompt = prompt.normalize('NFC');
          
          // Copy to clipboard
          await this.page.evaluate((text) => {
            navigator.clipboard.writeText(text).catch(() => {});
          }, normalizedPrompt);
          await this.page.waitForTimeout(200);
          
          // Focus textbox
          await this.page.focus('.iTYalL[role="textbox"][data-slate-editor="true"]');
          await this.page.waitForTimeout(100);
          
          // Paste
          await this.page.keyboard.down('Control');
          await this.page.keyboard.press('v');
          await this.page.keyboard.up('Control');
          await this.page.waitForTimeout(1000);
          
          console.log('[STEP C] ✓ Prompt entered\n');

          // STEP C+: Validate prompt and images before submitting
          console.log('[VALIDATE] 🔍 Validating prompt and images before submit...');
          const validationResult = await this.page.evaluate(() => {
            const textbox = document.querySelector('.iTYalL[role="textbox"][data-slate-editor="true"]');
            if (!textbox) return { promptText: '', imageCount: 0, valid: false };
            
            // Get prompt text
            const promptText = textbox.innerText || textbox.textContent || '';
            
            // Go up 2 parents to find image preview container
            const previewContainer = textbox.parentElement?.parentElement;
            if (!previewContainer) return { promptText: promptText.substring(0, 100), imageCount: 0, valid: false };
            
            // Find first div child - should contain image previews
            const firstDivChild = previewContainer.children[0];
            if (!firstDivChild) return { promptText: promptText.substring(0, 100), imageCount: 0, valid: false };
            
            // Count image preview buttons (data-card-open="false" indicates preview card)
            const imagePreviews = firstDivChild.querySelectorAll('button[data-card-open="false"]');
            const imageCount = imagePreviews.length;
            
            // Valid if: has prompt text AND has 2 images
            const valid = promptText.trim().length > 0 && imageCount === 2;
            
            return {
              promptText: promptText.substring(0, 100),
              imageCount: imageCount,
              valid: valid,
              promptLength: promptText.length
            };
          });
          
          console.log(`[VALIDATE] Prompt text length: ${validationResult.promptLength} chars`);
          console.log(`[VALIDATE] Image previews found: ${validationResult.imageCount}/2`);
          
          if (!validationResult.valid) {
            if (validationResult.imageCount !== 2) {
              console.log(`[VALIDATE] ⚠️  Expected 2 images, found ${validationResult.imageCount}`);
            }
            if (validationResult.promptLength === 0) {
              console.log('[VALIDATE] ⚠️  Prompt text is empty');
            }
            console.log('[VALIDATE] ⏳ Waiting 2 seconds for images to load...');
            await this.page.waitForTimeout(2000);
            
            // Retry validation
            const validationRetry = await this.page.evaluate(() => {
              const textbox = document.querySelector('.iTYalL[role="textbox"][data-slate-editor="true"]');
              if (!textbox) return { valid: false };
              const previewContainer = textbox.parentElement?.parentElement;
              if (!previewContainer) return { valid: false };
              const firstDivChild = previewContainer.children[0];
              if (!firstDivChild) return { valid: false };
              const imagePreviews = firstDivChild.querySelectorAll('button[data-card-open="false"]');
              return { valid: true, imageCount: imagePreviews.length };
            });
            
            if (!validationRetry.valid) {
              throw new Error('Could not validate prompt and images - UI structure not found');
            }
            
            console.log(`[VALIDATE] Retry: ${validationRetry.imageCount}/2 images`);
            if (validationRetry.imageCount !== 2) {
              throw new Error(`Validation failed: Expected 2 images, found ${validationRetry.imageCount}`);
            }
          }
          
          console.log('[VALIDATE] ✅ Prompt and images validated\n');

          // STEP D: Capture hrefs again and submit
          console.log('[STEP D] 📸 Capturing hrefs AFTER prompt entry...');
          let promptSubmitHrefs = await this.page.evaluate(() => {
            const links = document.querySelectorAll('[data-testid="virtuoso-item-list"] a[href]');
            return Array.from(links).map(link => link.getAttribute('href'));
          });
          console.log(`[STEP D] ✓ Captured ${promptSubmitHrefs.length} items`);
          
          // Delay before submit: wait 3s for Slate editor to fully load prompt
          console.log('[STEP D] ⏳ Waiting 3 seconds for Slate editor to stabilize...');
          await this.page.waitForTimeout(3000);


          // Click submit button
          console.log('[STEP D] 🖱️  Clicking submit button...');
          const submitClicked = await clickSubmitButton();

          if (!submitClicked) {
            console.log('[STEP D] ⚠️  Submit button not found or disabled');
          } else {
            console.log('[STEP D] ✓ Submit clicked');
          }

          console.log('[DELAY] ⏳ Waiting 2 seconds for server...');
          await this.page.waitForTimeout(2000);
          console.log('[DELAY] ✅ Ready\n');


          // STEP E: Monitor hrefs for new generation
          console.log('[STEP E] ⏳ Monitoring hrefs for NEW generation (max 120s)...\n');
          
          const timeoutMs = this.options.timeouts.generation || 120000;
          const maxMonitoringAttempts = Math.ceil(timeoutMs / 1000);
          let generationDetected = false;
          let monitoringAttempt = 0;
          let generatedHref = null;

          while (!generationDetected && monitoringAttempt < maxMonitoringAttempts) {
            monitoringAttempt++;

            // Strict detection: only treat as error when tile text contains
            // "không thành công" or "lỗi" (per production behavior)
            const currentData = await this.page.evaluate(() => {
              const allItems = [];

              // 1) Items with href
              const links = document.querySelectorAll('[data-testid="virtuoso-item-list"] a[href]');
              for (const link of links) {
                const parent = link.closest('[data-tile-id]');
                const parentText = (parent?.textContent || '').toLowerCase();
                const hasErrorText = parentText.includes('không thành công') || parentText.includes('đã xảy ra lỗi') || parentText.includes('lỗi');

                allItems.push({
                  href: link.getAttribute('href'),
                  hasError: hasErrorText,
                  isNew: false,
                  hasLink: true,
                  tileId: parent?.getAttribute('data-tile-id') || null,
                  indicators: {
                    errorText: hasErrorText
                  }
                });
              }

              // 2) Items without href but having explicit error text
              const allTiles = document.querySelectorAll('[data-testid="virtuoso-item-list"] [data-tile-id]');
              for (const tile of allTiles) {
                const tileId = tile.getAttribute('data-tile-id');
                if (allItems.some(item => item.tileId === tileId)) continue;

                const tileText = (tile.textContent || '').toLowerCase();
                const hasErrorText = tileText.includes('không thành công') || tileText.includes('đã xảy ra lỗi') || tileText.includes('lỗi');

                if (hasErrorText) {
                  allItems.push({
                    href: null,
                    hasError: true,
                    isNew: true,
                    hasLink: false,
                    tileId,
                    indicators: {
                      errorText: true
                    }
                  });
                }
              }

              return allItems;
            });


            // Find new items (either new href OR new error item)
            for (const current of currentData) {
              // Item is new if:
              // 1. It has href and that href is not in promptSubmitHrefs, OR
              // 2. It's an error item (hasError=true and no href)
              const isNewHref = current.href && !promptSubmitHrefs.includes(current.href);
              const isNewError = !current.href && current.hasError;  // Error item with no link = NEW error
              
              if (isNewHref || isNewError) {
                current.isNew = true;
                generatedHref = current;
                generationDetected = true;
                break;
              }
            }

            if (generationDetected) {
              console.log(`[STEP E] ✓ NEW generation detected`);
              if (generatedHref.href) {
                console.log(`[STEP E]   - Href: ${generatedHref.href.substring(0, 60)}...`);
              } else {
                console.log(`[STEP E]   - Type: ERROR ITEM (no href - fast detection!)`);
              }
              console.log(`[STEP E]   - Has error: ${generatedHref.hasError}`);
              if (generatedHref.hasError) {
                console.log(`[STEP E]   - Error indicators:`);
                console.log(`[STEP E]     • Error text (strict): ${generatedHref.indicators.errorText}`);
              }

              break;
            }

            if (monitoringAttempt % 10 === 0) {
              console.log(`[STEP E] Attempt ${monitoringAttempt}/${maxMonitoringAttempts}s...`);
            }

            await this.page.waitForTimeout(1000);
          }

          if (!generationDetected) {
            throw new Error('No new image generated within timeout period');
          }

          // STEP F: Handle errors with strict strategy order
          let finalSuccess = !generatedHref.hasError;

          if (generatedHref.hasError) {
            console.log('[STEP F] ❌ Generation failed - starting strict recovery flow');

            const initialErrorTile = await detectLatestErrorTile();
            const targetTileId = initialErrorTile?.tileId || generatedHref.tileId || null;

            // Strategy 1: Retry button "Thử lại" - max 3 times
            let retryRecovered = false;
            for (let retryAttempt = 1; retryAttempt <= 3 && !retryRecovered; retryAttempt++) {
              const errorTile = await detectLatestErrorTile();
              if (!errorTile.found) {
                retryRecovered = true;
                break;
              }

              // Wait 5s between each retry attempt for UI to stabilize
              if (retryAttempt > 1) {
                console.log('[STEP F][Retry] ⏳ Waiting 5s before next retry attempt...');
                await this.page.waitForTimeout(5000);
              }
              console.log(`[STEP F][Retry] Attempt ${retryAttempt}/3 - hovering error tile to reveal action buttons...`);
              await this.page.mouse.move(errorTile.tileCenter.x, errorTile.tileCenter.y);
              await this.page.waitForTimeout(450);

              const hoverTile = await detectLatestErrorTile();
              if (!hoverTile.found || !hoverTile.retryButton) {
                console.log('[STEP F][Retry] ⚠️  Retry button not visible after hover');
                await this.page.waitForTimeout(1200);
                continue;
              }

              await this.page.mouse.move(hoverTile.retryButton.x, hoverTile.retryButton.y);
              await this.page.waitForTimeout(120);
              await this.page.mouse.down();
              await this.page.waitForTimeout(80);
              await this.page.mouse.up();

              console.log('[STEP F][Retry] ✅ Clicked "Thử lại", waiting response...');
              await this.page.waitForTimeout(8000);

              const cleared = await waitForErrorTileCleared(targetTileId, 10000);
              if (cleared) {
                retryRecovered = true;
                finalSuccess = true;
                console.log('[STEP F][Retry] ✅ Error cleared after retry');
              }
            }

            // Strategy 2: "Sử dụng lại câu lệnh" - max 2 times, wait 2s then submit
            if (!retryRecovered) {
              console.log('[STEP F][Reuse] Retry strategy exhausted, switching to "Sử dụng lại câu lệnh"');
              for (let reuseAttempt = 1; reuseAttempt <= 2 && !finalSuccess; reuseAttempt++) {
                const errorTile = await detectLatestErrorTile();
                if (!errorTile.found) {
                  finalSuccess = true;
                  break;
                }

                await this.page.mouse.move(errorTile.tileCenter.x, errorTile.tileCenter.y);
                await this.page.waitForTimeout(500);

                const hoverTile = await detectLatestErrorTile();
                if (!hoverTile.found || !hoverTile.reuseButton) {
                  console.log(`[STEP F][Reuse] Attempt ${reuseAttempt}/2: reuse button not visible`);
                  await this.page.waitForTimeout(1200);
                  continue;
                }

                console.log(`[STEP F][Reuse] Attempt ${reuseAttempt}/2: clicking "Sử dụng lại câu lệnh"`);
                await this.page.mouse.move(hoverTile.reuseButton.x, hoverTile.reuseButton.y);
                await this.page.waitForTimeout(120);
                await this.page.mouse.down();
                await this.page.waitForTimeout(80);
                await this.page.mouse.up();

                console.log('[STEP F][Reuse] ⏳ Focusing textbox and clearing with Ctrl+A + Backspace...');
                await this.page.focus('.iTYalL[role="textbox"][data-slate-editor="true"]');
                await this.page.waitForTimeout(300);
                await this.page.keyboard.down('Control');
                await this.page.keyboard.press('a');
                await this.page.keyboard.up('Control');
                await this.page.waitForTimeout(200);
                await this.page.keyboard.press('Backspace');
                await this.page.waitForTimeout(300);
                
                console.log('[STEP F][Reuse] ⏳ Pasting prompt from clipboard...');
                // Old prompt should still be in clipboard from earlier Ctrl+C
                await this.page.keyboard.down('Control');
                await this.page.keyboard.press('v');
                await this.page.keyboard.up('Control');
                await this.page.waitForTimeout(1000);
                
                console.log('[STEP F][Reuse] ⏳ Waiting 3s for Slate editor to stabilize before submit...');
                await this.page.waitForTimeout(3000);

                const submitted = await clickSubmitButton();
                if (!submitted) {
                  console.log('[STEP F][Reuse] ⚠️  Submit failed');
                  continue;
                }

                await this.page.waitForTimeout(8000);
                const cleared = await waitForErrorTileCleared(targetTileId, 10000);
                if (cleared) {
                  finalSuccess = true;
                  console.log('[STEP F][Reuse] ✅ Error cleared after reuse + submit');
                }
              }
            }

            // Strategy 3: Re-add 2 uploaded image refs, paste prompt, wait 3s, submit
            if (!finalSuccess) {
              console.log('[STEP F][Fallback] Trying final fallback with uploaded image href refs...');
              const submitted = await fallbackReAddUploadedImagesAndSubmit(normalizedPrompt);
              if (submitted) {
                await this.page.waitForTimeout(10000);
                const latestError = await detectLatestErrorTile();
                finalSuccess = !latestError.found;
              }
            }

            if (!finalSuccess) {
              throw new Error('Generation failed after all recovery strategies (Retry x3, Reuse x2, Re-add refs fallback)');
            }

            console.log('[STEP F] ✅ Successfully recovered from error');
          }

          // Refresh target href after recovery (or if initial detection had no href)
          if (!generatedHref?.href) {
            const refreshedHref = await this.page.evaluate((beforeHrefs) => {
              const links = Array.from(document.querySelectorAll('[data-testid="virtuoso-item-list"] a[href]'));
              for (const link of links) {
                const href = link.getAttribute('href');
                if (!href || beforeHrefs.includes(href)) continue;

                const tile = link.closest('[data-tile-id]');
                const tileText = (tile?.textContent || '').toLowerCase();
                const isErrorTile = tileText.includes('không thành công') || tileText.includes('đã xảy ra lỗi') || tileText.includes('failed') || tileText.includes('error');
                if (!isErrorTile) return href;
              }
              return null;
            }, promptSubmitHrefs);

            if (refreshedHref) {
              generatedHref = { ...generatedHref, href: refreshedHref, hasError: false };
              console.log(`[STEP F] 📎 Refreshed generated href: ${refreshedHref.substring(0, 60)}...`);
            }
          }

          if (!generatedHref?.href) {
            throw new Error('Recovery finished but no valid generated href found for download');
          }


          // STEP G: Download the generated image
          console.log('[STEP G] ⏳ Waiting 3 seconds for image UI to render...');
          await this.page.waitForTimeout(3000);

          console.log('[STEP G] ⬇️  Downloading image...');
          let downloadedFile = await this.downloadItemViaContextMenu(generatedHref.href);

          if (!downloadedFile) {
            throw new Error('Failed to download image');
          }

          // Rename to include image number
          const fileExt = path.extname(downloadedFile);
          const fileName = path.basename(downloadedFile, fileExt);
          const imageNum = String(i + 1).padStart(2, '0');
          const renamedFileName = `${fileName}-img${imageNum}${fileExt}`;
          const renamedFilePath = path.join(path.dirname(downloadedFile), renamedFileName);

          try {
            fs.renameSync(downloadedFile, renamedFilePath);
            downloadedFile = renamedFilePath;
            console.log(`[STEP G] 📂 Renamed to: ${renamedFileName}`);
          } catch (renameErr) {
            console.log(`[STEP G] ⚠️  Could not rename: ${renameErr.message}`);
          }

          console.log(`[STEP G] ✅ Download complete: ${path.basename(downloadedFile)}\n`);

          results.push({
            success: true,
            imageNumber: i + 1,
            href: generatedHref.href,
            downloadedFile: downloadedFile
          });

          lastGeneratedHref = generatedHref.href;
          console.log(`[CHAIN] 📎 Stored lastGeneratedHref for next prompt: ${lastGeneratedHref.substring(0, 60)}...`);


        } catch (promptError) {
          console.error(`\n❌ PROMPT ${i + 1} FAILED: ${promptError.message}\n`);
          
          results.push({
            success: false,
            imageNumber: i + 1,
            error: promptError.message
          });
          throw promptError;
        }
      }

      // Final: Close browser and return results
      console.log(`\n${'═'.repeat(70)}`);
      console.log(`✅ All prompts processed`);
      console.log(`${'═'.repeat(70)}\n`);

      const downloadedFiles = results
        .filter(r => r.success && r.downloadedFile)
        .map(r => r.downloadedFile);

      console.log(`[DOWNLOAD] Files downloaded: ${downloadedFiles.length}`);
      downloadedFiles.forEach((file, idx) => {
        console.log(`  [${idx + 1}] ${path.basename(file)}`);
      });
      console.log('');

      // Close browser
      console.log('⏳ Waiting 3 seconds before closing browser...');
      await this.page.waitForTimeout(3000);
      await this.close();
      console.log('✅ Browser closed\n');

      const successCount = results.filter(r => r.success).length;
      console.log(`${'═'.repeat(70)}`);
      console.log(`📊 RESULTS: ${successCount}/${results.length} successful`);
      console.log(`${'═'.repeat(70)}\n`);

      return {
        success: successCount === results.length,
        results: results,
        totalGenerated: successCount,
        totalRequested: results.length,
        downloadedFiles: downloadedFiles
      };

    } catch (error) {
      console.error(`\n❌ Multi-generation failed: ${error.message}\n`);
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

  async generateVideo(videoPrompt, primaryImagePath, secondaryImagePath, options = {}) {
    /**
     * Generate a single video using Google Flow video generation
     * @param {string} videoPrompt - The prompt/script for video generation
     * @param {string} primaryImagePath - Main character/styling image
     * @param {string} secondaryImagePath - Secondary/reference image
     * @param {Object} options - Generation options {download, outputPath, reloadAfter}
     * @returns {Object} - {success, path, url, duration, format}
     */
    
    if (this.debugMode) {
      console.log('\n🔧 [DEBUG] generateVideo() is disabled (debug mode)');
      console.log('   - init() allowed');
      console.log('   - navigateToFlow() allowed');
      console.log('   - All other steps skipped\n');
      
      await this.init();
      await this.navigateToFlow();
      
      console.log('\n✅ Browser open at Google Flow project (video mode)');
      console.log('   (Manual testing enabled)\n');
      
      return {
        success: true,
        debugMode: true,
        path: null,
        url: null,
        message: 'Debug mode: only opened project'
      };
    }

    let videoPath = null;
    let videoUrl = null;
    let uploadedImageHrefs = [];

    try {
      const { download = true, outputPath = null, reloadAfter = false } = options;

      console.log(`\n${'═'.repeat(80)}`);
      console.log(`🎬 VIDEO GENERATION: Single video`);
      console.log(`${'═'.repeat(80)}\n`);
      console.log(`📸 Primary image: ${path.basename(primaryImagePath)}`);
      console.log(`🔄 Secondary image: ${path.basename(secondaryImagePath)}`);
      console.log();

      // STEP 1: Initialize browser session
      console.log('[INIT] 🚀 Initializing browser for video generation...');
      await this.init();
      console.log('[INIT] ✅ Browser initialized\n');

      // STEP 2: Navigate to Google Flow project
      console.log('[NAV] 🔗 Navigating to Google Flow video...');
      await this.navigateToFlow();
      console.log('[NAV] ✅ Navigated to project');
      console.log('[DELAY] ⏳ Waiting 2 seconds...');
      await this.page.waitForTimeout(2000);
      console.log('[DELAY] ✅ Ready\n');

      // STEP 3: Wait for page to be fully ready
      console.log('[PAGE] ⏳ Waiting for page to load...');
      await this.waitForPageReady();
      console.log('[PAGE] ✅ Page ready');
      await this.page.waitForTimeout(5000);
      console.log('[DELAY] ✅ Ready\n');

      // STEP 4: Switch to video tab
      console.log('[VIDEO] 📹 Switching to video generation mode...');
      const videoTabSwitched = await this.switchToVideoTab();
      if (!videoTabSwitched) {
        console.warn('[VIDEO] ⚠️  Video tab switch failed, but continuing...');
      }
      await this.page.waitForTimeout(1000);
      console.log('[VIDEO] ✅ Video mode ready\n');

      // STEP 5: Select video from components
      console.log('[VIDEO] 🎬 Selecting video generation component...');
      const videoSelected = await this.selectVideoFromComponents();
      if (!videoSelected) {
        console.warn('[VIDEO] ⚠️  Video component selection may have failed');
      }
      await this.page.waitForTimeout(1000);
      console.log('[VIDEO] ✅ Ready to generate\n');

      // STEP 6: Focus textbox and upload images
      console.log('[UPLOAD] 📤 Focusing textbox and uploading reference images...');
      await this.page.focus('.iTYalL[role="textbox"][data-slate-editor="true"]');
      await this.page.waitForTimeout(300);

      const pasteImageToTextbox = async (imagePath, label, cooldownMs = 5000) => {
        console.log(`[UPLOAD] 📎 Pasting ${label}: ${path.basename(imagePath)}`);
        const imageData = fs.readFileSync(imagePath);
        const imageBase64 = Buffer.from(imageData).toString('base64');

        await this.page.evaluate((base64Str) => {
          return fetch(`data:image/png;base64,${base64Str}`)
            .then(res => res.blob())
            .then(blob => navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]))
            .then(() => true)
            .catch(() => false);
        }, imageBase64);

        await this.page.waitForTimeout(500);
        await this.page.focus('.iTYalL[role="textbox"][data-slate-editor="true"]');
        await this.page.waitForTimeout(120);

        await this.page.keyboard.down('Control');
        await this.page.keyboard.press('v');
        await this.page.keyboard.up('Control');

        console.log(`[UPLOAD] ✅ ${label} pasted`);
        await this.page.waitForTimeout(cooldownMs);
      };

      // Upload both images
      try {
        await pasteImageToTextbox(primaryImagePath, 'primary (character) image', 5000);
        await pasteImageToTextbox(secondaryImagePath, 'secondary (reference) image', 3000);
        console.log('[UPLOAD] ✅ Image uploads complete\n');
      } catch (uploadError) {
        console.warn(`[UPLOAD] ⚠️  Image upload warning: ${uploadError.message}`);
      }

      // STEP 7: Focus textbox, paste video prompt and submit
      console.log('[PROMPT] 📝 Entering video generation prompt...');
      await this.page.evaluate(() => {
        const textbox = document.querySelector('.iTYalL[role="textbox"][data-slate-editor="true"]');
        if (textbox) {
          textbox.focus();
        }
      });
      await this.page.waitForTimeout(300);

      // Clear existing content using Ctrl+A + Backspace (safe for Slate editor)
      await this.page.keyboard.down('Control');
      await this.page.keyboard.press('a');
      await this.page.keyboard.up('Control');
      await this.page.waitForTimeout(100);
      await this.page.keyboard.press('Backspace');
      await this.page.waitForTimeout(300);

      // Copy prompt to clipboard
      await this.page.evaluate((promptText) => {
        navigator.clipboard.writeText(promptText).catch(() => {});
      }, videoPrompt);
      await this.page.waitForTimeout(200);

      // Paste with Ctrl+V
      await this.page.keyboard.down('Control');
      await this.page.keyboard.press('v');
      await this.page.keyboard.up('Control');

      console.log('[PROMPT] ✅ Prompt entered');
      console.log('[SUBMIT] 🖱️  Waiting for Submit button to be ready...');
      
      // Wait for send button to be enabled
      const buttonReady = await this.waitForSendButtonEnabled();
      if (!buttonReady) {
        console.warn('[SUBMIT] ⚠️  Send button not ready, attempting anyway...');
      }

      await this.page.waitForTimeout(1000);

      // Click submit button
      console.log('[SUBMIT] 🖱️  Clicking Submit...');
      const submitClicked = await this.page.evaluate(() => {
        const btn = document.querySelector('button[aria-label*="Generate"], button[aria-label*="Tạo"], button[aria-label*="Send"]') ||
                   document.querySelector('button[aria-label*="generate"], button[aria-label*="send"]');
        if (btn && !btn.disabled) {
          try {
            btn.click();
            return true;
          } catch (e) {
            return false;
          }
        }
        return false;
      });

      if (!submitClicked) {
        console.warn('[SUBMIT] ⚠️  Could not click submit via JavaScript, trying mouse...');
        // Fallback: try to find and click via mouse
        const submitBtn = await this.page.evaluate(() => {
          const btn = document.querySelector('button[aria-label*="Generate"], button[aria-label*="Send"]');
          if (btn) {
            const rect = btn.getBoundingClientRect();
            return {
              x: Math.round(rect.left + rect.width / 2),
              y: Math.round(rect.top + rect.height / 2)
            };
          }
          return null;
        });
        
        if (submitBtn) {
          await this.page.mouse.move(submitBtn.x, submitBtn.y);
          await this.page.waitForTimeout(100);
          await this.page.mouse.down();
          await this.page.waitForTimeout(50);
          await this.page.mouse.up();
          console.log('[SUBMIT] ✓ Submitted via mouse');
        }
      } else {
        console.log('[SUBMIT] ✓ Submitted via JavaScript');
      }

      console.log('[WAIT] ⏳ Waiting for video generation (30 seconds max)...');
      await this.page.waitForTimeout(30000);

      // STEP 8: Download video if requested
      if (download && outputPath) {
        console.log('\n[DOWNLOAD] 📥 Downloading generated video...');
        // Ensure outputPath exists
        if (!fs.existsSync(outputPath)) {
          fs.mkdirSync(outputPath, { recursive: true });
        }
        
        // Set outputDir temporarily so downloadVideo() knows where to save
        const previousOutputDir = this.options.outputDir;
        this.options.outputDir = outputPath; // Pass directory to downloadVideo()
        
        const video = await this.downloadVideo();
        
        // Restore previous outputDir
        this.options.outputDir = previousOutputDir;
        
        if (video) {
          videoPath = video;
          console.log(`[DOWNLOAD] ✅ Video saved to: ${videoPath}`);
        } else {
          console.warn('[DOWNLOAD] ⚠️  Video download failed or returned no path');
        }
      } else {
        if (!download) {
          console.log('[DOWNLOAD] ℹ️  Download disabled in options');
        }
        if (!outputPath) {
          console.log('[DOWNLOAD] ℹ️  No output path specified');
        }
      }

      // STEP 9: Reload if requested
      if (reloadAfter) {
        console.log('\n[RELOAD] ↻ Reloading page...');
        await this.page.reload({ waitUntil: 'networkidle2' });
        await this.page.waitForTimeout(2000);
        console.log('[RELOAD] ✅ Page reloaded\n');
      }

      console.log(`\n${'═'.repeat(80)}`);
      console.log(`✅ VIDEO GENERATION COMPLETE`);
      console.log(`${'═'.repeat(80)}\n`);

      return {
        success: !!videoPath,
        path: videoPath,
        url: videoUrl,
        duration: 10,
        format: '9:16',
        message: videoPath ? 'Video generated successfully' : 'Video generation began but download may have failed'
      };

    } catch (error) {
      console.error(`\n❌ VIDEO GENERATION ERROR: ${error.message}`);
      console.error(`Stack: ${error.stack}`);

      return {
        success: false,
        path: null,
        url: null,
        error: error.message
      };
    }
  }
}

export default GoogleFlowAutomationService;

