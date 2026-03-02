import BrowserService from './browserService.js';
import BFLSessionManager from './bflSessionManager.js';
import ContentSafetyFilter from '../contentSafetyFilter.js';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

/**
 * BFL Playground Service
 * Browser automation for Black Forest Labs FLUX Playground
 * https://playground.bfl.ai/lab/flux-2-klein
 * 
 * Features:
 * - Manual login with session capture
 * - Session persistence (cookies, localStorage)
 * - Image upload for reference
 * - Prompt input
 * - Image generation
 * - Download generated images
 */
class BFLPlaygroundService extends BrowserService {
  constructor(options = {}) {
    super(options);
    
    this.baseUrl = options.baseUrl || 'https://playground.bfl.ai';
    this.labPath = options.labPath || '/lab/flux-2-klein';
    this.sessionManager = new BFLSessionManager({
      sessionDir: options.sessionDir,
      sessionFile: options.sessionFile || 'bfl-session.json'
    });
    this.contentSafetyFilter = new ContentSafetyFilter();
    
    // BFL Credentials from environment
    this.bflEmail = process.env.BFL_EMAIL || '';
    this.bflPassword = process.env.BFL_PASSWORD || '';
    
    // Track login state
    this.requiresRelogin = false;
    
    // Selectors for BFL Playground (Puppeteer-compatible, no :has-text())
    this.selectors = {
      // Auth
      signInButton: 'a[href*="sign"], [data-testid="sign-in"]',
      userMenu: '[data-testid="user-menu"], .user-avatar, .profile-button',
      
      // Login Dialog
      loginDialog: '[role="dialog"], .modal, [data-testid="login-modal"], .login-modal',
      loginEmailInput: 'input[type="email"], input[name="email"], input[placeholder*="email" i]',
      loginPasswordInput: 'input[type="password"], input[name="password"]',
      loginSubmitButton: 'button[type="submit"], button:has-text("Sign in"), button:has-text("Log in")',
      sessionExpiredText: ['session expired', 'sign in', 'log in again', 'session has expired'],
      
      // Generation
      promptInput: 'textarea, input[type="text"], [contenteditable="true"], .prompt-input',
      generateButton: 'button, [data-testid="generate-btn"]',
      
      // Image upload
      uploadButton: 'input[type="file"], [data-testid="upload-btn"]',
      fileInput: 'input[type="file"]',
      imagePreview: '.uploaded-image, .reference-image, img[src*="blob:"]',
      
      // Results
      generatedImage: '.generated-image, .result-image, img[src*="generated"]',
      downloadButton: 'a[download], [data-testid="download-btn"]',
      
      // Loading states
      loadingIndicator: '.loading, .generating, [data-testid="loading"]',
      progressBar: '.progress-bar, .generation-progress'
    };
  }

  /**
   * Switch to iframe containing the FLUX demo
   * The actual input elements are inside an iframe
   */
  async switchToIframe() {
    console.log('🔄 Looking for FLUX demo iframe...');
    
    // Wait for iframe to load
    await this.page.waitForTimeout(2000);
    
    // Find the iframe - try multiple selectors
    const iframeSelectors = [
      'iframe[src*="flux-2-klein-demo"]',
      'iframe[src*="bfl.ai"]',
      'iframe[title*="FLUX"]',
      'iframe[title*="Interactive Demo"]',
      'iframe'
    ];
    
    let frame = null;
    
    for (const selector of iframeSelectors) {
      try {
        const frameElement = await this.page.$(selector);
        if (frameElement) {
          frame = await frameElement.contentFrame();
          if (frame) {
            console.log(`   ✅ Found iframe: ${selector}`);
            break;
          }
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!frame) {
      // Try to get all frames
      const frames = this.page.frames();
      console.log(`   Found ${frames.length} frames total`);
      
      for (const f of frames) {
        const url = f.url();
        console.log(`   Frame URL: ${url}`);
        if (url.includes('flux-2-klein-demo') || url.includes('bfl.ai')) {
          frame = f;
          console.log(`   ✅ Using frame: ${url}`);
          break;
        }
      }
    }
    
    if (!frame) {
      throw new Error('Could not find FLUX demo iframe');
    }
    
    this.iframeFrame = frame;
    
    // Wait for iframe content to load
    await frame.waitForTimeout(2000);
    
    console.log('✅ Switched to FLUX demo iframe');
    return frame;
  }

  /**
   * Get the active frame (iframe or main page)
   */
  getActiveFrame() {
    return this.iframeFrame || this.page;
  }

  /**
   * Initialize browser and navigate to BFL Playground
   */
  async initialize() {
    console.log('🚀 Initializing BFL Playground Service...');
    
    await this.launch({
      chromeProfile: 'Profile 1',
      skipSession: false
    });
    
    // Inject saved session if available
    await this.sessionManager.injectSession(this.page);
    
    // Navigate to lab page
    await this.goto(this.baseUrl + this.labPath);
    
    // Wait for page to load
    await this.page.waitForTimeout(3000);
    
    // Check if we need to log in
    const isLoggedIn = await this.checkLoginStatus();
    
    if (!isLoggedIn) {
      console.log('⚠️  Not logged in. Please run login script first:');
      console.log('   node scripts/bfl-login.js');
    }
    
    // Switch to iframe for actual interactions
    await this.switchToIframe();
    
    console.log('✅ BFL Playground initialized');
    return { isLoggedIn };
  }

  /**
   * Check if user is logged in
   */
  async checkLoginStatus() {
    try {
      // Check URL - if redirected to sign in, not logged in
      const url = this.page.url();
      if (url.includes('sign-in') || url.includes('login') || url.includes('auth')) {
        return false;
      }
      
      // Check for logged-in indicators by text content
      const loggedInIndicators = await this.page.evaluate(() => {
        const body = document.body.innerText.toLowerCase();
        const hasMyAccount = body.includes('my account') || body.includes('account');
        const hasSignOut = body.includes('sign out') || body.includes('logout') || body.includes('log out');
        const hasSignIn = body.includes('sign in') && !body.includes('my account');
        
        return {
          hasMyAccount,
          hasSignOut,
          hasSignIn,
          bodyPreview: body.substring(0, 500)
        };
      });
      
      // If we see "My account" or "Sign out", user is logged in
      if (loggedInIndicators.hasMyAccount || loggedInIndicators.hasSignOut) {
        console.log('   ✅ Detected logged-in state (My account/Sign out found)');
        return true;
      }
      
      // If we only see "Sign in" without "My account", not logged in
      if (loggedInIndicators.hasSignIn && !loggedInIndicators.hasMyAccount) {
        console.log('   ⚠️ Detected logged-out state (Sign in found)');
        return false;
      }
      
      // Check for user-specific elements in DOM
      const userMenu = await this.page.$(this.selectors.userMenu);
      if (userMenu) {
        return true;
      }
      
      // Check localStorage for auth tokens
      const hasAuth = await this.page.evaluate(() => {
        const keys = Object.keys(localStorage);
        const hasToken = keys.some(k => 
          k.toLowerCase().includes('token') || 
          k.toLowerCase().includes('auth') || 
          k.toLowerCase().includes('user') ||
          k.toLowerCase().includes('session')
        );
        
        // Also check for common auth patterns in values
        if (hasToken) return true;
        
        for (const key of keys) {
          const value = localStorage.getItem(key) || '';
          if (value.includes('bearer') || value.includes('jwt') || value.length > 100) {
            return true;
          }
        }
        
        return false;
      });
      
      if (hasAuth) {
        console.log('   ✅ Detected auth tokens in localStorage');
        return true;
      }
      
      // Default: assume logged in if we're on the lab page and no sign-in button visible
      if (url.includes('lab') || url.includes('playground')) {
        console.log('   ℹ️ On playground page, assuming logged in');
        return true;
      }
      
      return false;
    } catch (error) {
      console.log(`⚠️  Login check error: ${error.message}`);
      // If error, assume logged in to not block user
      return true;
    }
  }

  /**
   * Save current session for future use
   */
  async saveSession(metadata = {}) {
    return await this.sessionManager.saveSession(this.page, {
      provider: 'bfl-playground',
      ...metadata
    });
  }

  /**
   * Check if login dialog appeared (session expired)
   * Returns true if login dialog detected
   */
  async checkForLoginDialog() {
    try {
      const page = this.page;
      
      // Check for session expired indicators
      const loginDetected = await page.evaluate(() => {
        const body = document.body.innerText.toLowerCase();
        const hasSessionExpired = 
          body.includes('session expired') ||
          body.includes('session has expired') ||
          body.includes('log in again') ||
          body.includes('sign in to continue');
        
        // Check for login dialog/modal
        const loginDialog = document.querySelector('[role="dialog"], .modal, [data-testid="login-modal"]');
        const hasLoginDialog = loginDialog !== null;
        
        // Check for email input in dialog
        const emailInput = document.querySelector('input[type="email"], input[name="email"]');
        const hasEmailInput = emailInput !== null;
        
        return {
          hasSessionExpired,
          hasLoginDialog,
          hasEmailInput,
          needsLogin: hasSessionExpired || (hasLoginDialog && hasEmailInput)
        };
      });
      
      if (loginDetected.needsLogin) {
        console.log('\n⚠️  LOGIN DIALOG DETECTED');
        console.log(`   Session expired: ${loginDetected.hasSessionExpired}`);
        console.log(`   Login dialog visible: ${loginDetected.hasLoginDialog}`);
        console.log(`   Email input found: ${loginDetected.hasEmailInput}\n`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.log(`⚠️  Error checking for login dialog: ${error.message}`);
      return false;
    }
  }

  /**
   * Handle auto-login when session expires
   * 1. Fill email and password
   * 2. Click sign in
   * 3. Wait for redirect
   * 4. Refresh page and reinitialize
   */
  async handleAutoLogin() {
    console.log('\n🔐 AUTO-LOGIN: Starting automatic login process...\n');
    
    if (!this.bflEmail || !this.bflPassword) {
      throw new Error('BFL credentials not configured. Set BFL_EMAIL and BFL_PASSWORD in .env');
    }
    
    const page = this.page;
    
    try {
      // Wait for login dialog to be fully visible
      await page.waitForTimeout(1000);
      
      // Find and fill email input
      console.log('   📧 Finding email input...');
      const emailSelectors = [
        'input[type="email"]',
        'input[name="email"]',
        'input[placeholder*="email" i]',
        'input[id*="email"]'
      ];
      
      let emailInput = null;
      for (const selector of emailSelectors) {
        try {
          emailInput = await page.$(selector);
          if (emailInput) {
            const box = await emailInput.boundingBox();
            if (box && box.width > 0) {
              console.log(`   ✅ Found email input: ${selector}`);
              break;
            }
          }
        } catch (e) {
          continue;
        }
      }
      
      if (!emailInput) {
        // Try any visible input that looks like email
        const allInputs = await page.$$('input');
        for (const input of allInputs) {
          const type = await input.evaluate(el => el.type || el.getAttribute('type') || '');
          const name = await input.evaluate(el => el.name || el.getAttribute('name') || '');
          const placeholder = await input.evaluate(el => el.placeholder || el.getAttribute('placeholder') || '');
          
          if (type === 'email' || name.toLowerCase().includes('email') || placeholder.toLowerCase().includes('email')) {
            emailInput = input;
            console.log('   ✅ Found email input (fallback)');
            break;
          }
        }
      }
      
      if (!emailInput) {
        throw new Error('Could not find email input field');
      }
      
      // Click and clear email input
      await emailInput.click();
      await page.waitForTimeout(200);
      
      // Clear and type email
      await page.keyboard.down('Control');
      await page.keyboard.press('a');
      await page.keyboard.up('Control');
      await page.waitForTimeout(100);
      
      // Paste email
      await page.evaluate((email) => {
        navigator.clipboard.writeText(email);
      }, this.bflEmail);
      await page.waitForTimeout(200);
      
      await page.keyboard.down('Control');
      await page.keyboard.press('v');
      await page.keyboard.up('Control');
      console.log(`   ✅ Email entered: ${this.bflEmail}`);
      await page.waitForTimeout(500);
      
      // Find and fill password input
      console.log('   🔑 Finding password input...');
      const passwordSelectors = [
        'input[type="password"]',
        'input[name="password"]',
        'input[id*="password"]'
      ];
      
      let passwordInput = null;
      for (const selector of passwordSelectors) {
        try {
          passwordInput = await page.$(selector);
          if (passwordInput) {
            const box = await passwordInput.boundingBox();
            if (box && box.width > 0) {
              console.log(`   ✅ Found password input: ${selector}`);
              break;
            }
          }
        } catch (e) {
          continue;
        }
      }
      
      if (!passwordInput) {
        throw new Error('Could not find password input field');
      }
      
      // Click and clear password input
      await passwordInput.click();
      await page.waitForTimeout(200);
      
      // Clear and type password
      await page.keyboard.down('Control');
      await page.keyboard.press('a');
      await page.keyboard.up('Control');
      await page.waitForTimeout(100);
      
      // Paste password
      await page.evaluate((password) => {
        navigator.clipboard.writeText(password);
      }, this.bflPassword);
      await page.waitForTimeout(200);
      
      await page.keyboard.down('Control');
      await page.keyboard.press('v');
      await page.keyboard.up('Control');
      console.log(`   ✅ Password entered: ****`);
      await page.waitForTimeout(500);
      
      // Find and click sign in button
      console.log('   🖱️  Finding sign in button...');
      const buttonSelectors = [
        'button[type="submit"]',
        'button:has-text("Sign in")',
        'button:has-text("Log in")',
        'button:has-text("Continue")',
        'input[type="submit"]'
      ];
      
      let signInButton = null;
      
      // Method 1: Find by data-testid (most specific)
      signInButton = await page.$('button[data-testid="login-submit-button"]');
      if (signInButton) {
        console.log('   ✅ Found sign in button by data-testid="login-submit-button"');
      }
      
      // Method 2: Find submit button inside dialog/modal
      if (!signInButton) {
        const dialogSubmitBtns = await page.evaluate(() => {
          // Find all dialogs/modals
          const dialogs = document.querySelectorAll('[role="dialog"], .modal, [data-testid="login-modal"], .login-modal');
          
          for (const dialog of dialogs) {
            // Find submit button inside dialog
            const submitBtn = dialog.querySelector('button[type="submit"]');
            if (submitBtn) {
              return {
                found: true,
                text: submitBtn.textContent || submitBtn.innerText || '',
                type: submitBtn.type || submitBtn.getAttribute('type') || ''
              };
            }
          }
          return { found: false };
        });
        
        if (dialogSubmitBtns.found) {
          // Find the actual element
          const dialogs = await page.$$('[role="dialog"], .modal, [data-testid="login-modal"]');
          for (const dialog of dialogs) {
            const btn = await dialog.$('button[type="submit"]');
            if (btn) {
              signInButton = btn;
              console.log(`   ✅ Found submit button in dialog: "${dialogSubmitBtns.text.trim()}"`);
              break;
            }
          }
        }
      }
      
      // Method 3: Find any button with "Sign in" text inside dialog
      if (!signInButton) {
        const allButtons = await page.$$('button');
        for (const btn of allButtons) {
          try {
            const isInDialog = await btn.evaluate(el => {
              // Check if button is inside a dialog/modal
              const parent = el.closest('[role="dialog"], .modal, [data-testid="login-modal"]');
              return parent !== null;
            });
            
            if (isInDialog) {
              const text = await btn.evaluate(el => (el.textContent || el.innerText || '').trim());
              const type = await btn.evaluate(el => el.type || el.getAttribute('type') || '');
              
              if (text.toLowerCase().includes('sign in') || type === 'submit') {
                signInButton = btn;
                console.log(`   ✅ Found sign in button in dialog: "${text}"`);
                break;
              }
            }
          } catch (e) {
            continue;
          }
        }
      }
      
      // Method 4: Fallback - find any submit button with "Sign in" text
      if (!signInButton) {
        const submitButtons = await page.$$('button[type="submit"]');
        for (const btn of submitButtons) {
          const text = await btn.evaluate(el => (el.textContent || el.innerText || '').trim());
          if (text.toLowerCase().includes('sign in')) {
            signInButton = btn;
            console.log(`   ✅ Found submit button with "Sign in" text: "${text}"`);
            break;
          }
        }
      }
      
      if (!signInButton) {
        throw new Error('Could not find sign in button in login dialog');
      }
      
      // Verify button is visible and clickable
      const isClickable = await signInButton.evaluate(el => {
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               rect.width > 0 && 
               rect.height > 0;
      });
      
      if (!isClickable) {
        console.log('   ⚠️ Sign in button not visible, scrolling into view...');
        await signInButton.evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
        await page.waitForTimeout(500);
      }
      
      // Click sign in using evaluate (more reliable than .click())
      console.log('   🖱️  Clicking sign in button...');
      await signInButton.evaluate(el => el.click());
      console.log('   ✅ Clicked sign in button');
      
      // Wait for navigation/redirect
      console.log('   ⏳ Waiting for login to complete...');
      await page.waitForTimeout(3000);
      
      // Wait for page to stabilize
      try {
        await page.waitForNavigation({ timeout: 10000, waitUntil: 'networkidle2' });
      } catch (e) {
        // Navigation might not happen, check if logged in
        console.log('   ℹ️ No navigation, checking login status...');
      }
      
      await page.waitForTimeout(2000);
      
      // Check if login was successful
      const currentUrl = page.url();
      console.log(`   📍 Current URL: ${currentUrl}`);
      
      // Take screenshot for verification
      const screenshotPath = path.join(process.cwd(), 'temp', `bfl-after-login-${Date.now()}.png`);
      await this.screenshot({ path: screenshotPath });
      console.log(`   📸 Screenshot saved: ${screenshotPath}`);
      
      // Save new session
      await this.saveSession({ loggedInAt: new Date().toISOString() });
      
      console.log('\n✅ AUTO-LOGIN COMPLETE\n');
      
      // Set flag for re-initialization
      this.requiresRelogin = true;
      
      return true;
    } catch (error) {
      console.error(`\n❌ AUTO-LOGIN FAILED: ${error.message}\n`);
      
      // Take screenshot for debugging
      const screenshotPath = path.join(process.cwd(), 'temp', `bfl-login-error-${Date.now()}.png`);
      await this.screenshot({ path: screenshotPath });
      console.log(`   📸 Error screenshot: ${screenshotPath}`);
      
      throw error;
    }
  }

  /**
   * Refresh and reinitialize after login
   */
  async refreshAndReinitialize() {
    console.log('\n🔄 Refreshing and reinitializing...\n');
    
    // Refresh the page
    await this.page.reload({ waitUntil: 'networkidle2' });
    await this.page.waitForTimeout(3000);
    
    // Re-switch to iframe
    await this.switchToIframe();
    
    // Reset flag
    this.requiresRelogin = false;
    
    console.log('✅ Page refreshed and reinitialized\n');
    return true;
  }

  /**
   * Upload reference image to BFL iframe
   * The iframe has a hidden file input that can be used for upload
   * After upload, preview images appear with alt="Input 1", "Input 2", etc.
   */
  async uploadImage(imagePath) {
    console.log(`📤 Uploading image: ${imagePath}`);
    
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found: ${imagePath}`);
    }
    
    const frame = this.getActiveFrame();
    
    try {
      // Get current number of preview images
      const currentImages = await frame.$$('img[alt^="Input"]');
      const currentCount = currentImages.length;
      console.log(`   Current preview images: ${currentCount}`);
      
      // Method 1: Find hidden file input directly
      let fileInput = await frame.$('input[type="file"][accept*="image"]');
      
      if (!fileInput) {
        // Try any file input
        fileInput = await frame.$('input[type="file"]');
      }
      
      if (fileInput) {
        console.log('   Found file input, uploading...');
        await fileInput.uploadFile(imagePath);
      } else {
        // Method 2: Click the + button to trigger file chooser
        console.log('   Looking for + button to trigger upload...');
        
        // Find button with plus icon (secondary variant)
        const buttons = await frame.$$('button[data-variant="secondary"]');
        let plusButton = null;
        
        for (const btn of buttons) {
          const hasPlusIcon = await btn.$('svg[class*="plus"]');
          if (hasPlusIcon) {
            plusButton = btn;
            break;
          }
        }
        
        if (plusButton) {
          console.log('   Found + button, clicking...');
          
          // Set up file chooser listener on main page
          const [fileChooser] = await Promise.all([
            this.page.waitForFileChooser({ timeout: 10000 }).catch(() => null),
            plusButton.click()
          ]);
          
          if (fileChooser) {
            await fileChooser.accept([imagePath]);
          } else {
            throw new Error('File chooser did not appear');
          }
        } else {
          throw new Error('Could not find + button or file input');
        }
      }
      
      // Wait for preview image to appear
      console.log('   ⏳ Waiting for preview image...');
      const expectedAlt = `Input ${currentCount + 1}`;
      
      let previewAppeared = false;
      for (let i = 0; i < 20; i++) {
        await frame.waitForTimeout(500);
        
        const previewImg = await frame.$(`img[alt="${expectedAlt}"]`);
        if (previewImg) {
          const box = await previewImg.boundingBox();
          if (box && box.width > 0) {
            previewAppeared = true;
            console.log(`   ✅ Preview image appeared: ${expectedAlt}`);
            break;
          }
        }
        
        // Also check for any new img with blob URL
        const newImages = await frame.$$('img[alt^="Input"]');
        if (newImages.length > currentCount) {
          previewAppeared = true;
          console.log(`   ✅ New preview image detected (${newImages.length} total)`);
          break;
        }
      }
      
      if (!previewAppeared) {
        console.log('   ⚠️ Preview image not detected, but upload may have succeeded');
      }
      
      // Wait a bit more for image to fully load
      await frame.waitForTimeout(1000);
      
      console.log('✅ Image upload completed');
      return true;
      
    } catch (error) {
      console.error(`❌ Upload failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Upload multiple images
   */
  async uploadImages(imagePaths) {
    console.log(`📤 Uploading ${imagePaths.length} images...`);
    
    for (let i = 0; i < imagePaths.length; i++) {
      console.log(`   Image ${i + 1}/${imagePaths.length}`);
      await this.uploadImage(imagePaths[i]);
      // Small delay between uploads
      await this.page.waitForTimeout(500);
    }
    
    console.log('✅ All images uploaded');
    return true;
  }

  /**
   * Drag and drop file helper
   */
  async _dragAndDropFile(filePath, dropElement) {
    const frame = this.getActiveFrame();
    const input = await frame.$('input[type="file"]');
    if (input) {
      await input.uploadFile(filePath);
      
      // Trigger drop event
      await frame.evaluate((el) => {
        el.dispatchEvent(new Event('drop', { bubbles: true }));
      }, dropElement);
    }
  }

  /**
   * Debug page structure - log all input-like elements
   */
  async debugPageElements() {
    const frame = this.getActiveFrame();
    
    const elements = await frame.evaluate(() => {
      const results = [];
      
      // Find all potential input elements
      const selectors = [
        'textarea',
        'input',
        '[contenteditable="true"]',
        '[contenteditable]',
        'div[role="textbox"]',
        '[role="textbox"]',
        '.input',
        '.prompt',
        '[class*="input"]',
        '[class*="prompt"]',
        '[class*="text"]'
      ];
      
      for (const sel of selectors) {
        const els = document.querySelectorAll(sel);
        els.forEach((el, i) => {
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          
          // Skip hidden elements
          if (rect.width < 10 || rect.height < 10) return;
          if (style.display === 'none' || style.visibility === 'hidden') return;
          
          results.push({
            selector: sel,
            index: i,
            tag: el.tagName,
            type: el.type || el.getAttribute('type') || '',
            placeholder: el.placeholder || el.getAttribute('placeholder') || '',
            class: el.className?.substring(0, 50) || '',
            id: el.id || '',
            role: el.getAttribute('role') || '',
            contentEditable: el.contentEditable,
            visible: rect.width > 0 && rect.height > 0,
            rect: { width: Math.round(rect.width), height: Math.round(rect.height) }
          });
        });
      }
      
      return results;
    });
    
    console.log('\n📋 PAGE ELEMENTS DEBUG:');
    console.log('='.repeat(60));
    elements.forEach(el => {
      console.log(`  ${el.selector}[${el.index}] - ${el.tag}`);
      console.log(`    class: ${el.class}`);
      console.log(`    placeholder: ${el.placeholder}`);
      console.log(`    visible: ${el.visible} (${el.rect.width}x${el.rect.height})`);
    });
    console.log('='.repeat(60) + '\n');
    
    return elements;
  }

  /**
   * Enter prompt text using PASTE (faster than typing)
   * Includes content safety filtering and auto-correction
   */
  async enterPrompt(prompt) {
    console.log('✍️  ENTERING PROMPT\n');
    console.log(`   Original length: ${(prompt || '').length} chars`);
    
    // STEP 0: Clean up prompt - remove newlines and extra whitespace (same as GoogleFlow)
    let cleanPrompt = prompt
      .replace(/\n+/g, ' ')           // Replace newlines with space
      .replace(/\r/g, '')             // Remove carriage returns
      .replace(/\s+/g, ' ')           // Replace multiple spaces with single space
      .trim();                         // Trim leading/trailing whitespace
    
    console.log(`   Cleaned length: ${cleanPrompt.length} chars`);
    console.log(`   Reduced by: ${(prompt || '').length - cleanPrompt.length} chars\n`);
    
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
      cleanPrompt = this.contentSafetyFilter.autoCorrect(cleanPrompt, 'high');
      console.log(`[SAFETY] ✅ Corrected version applied\n`);
    } else if (safety.hasMediumRisk) {
      console.log('\n⚠️  CONTENT SAFETY NOTICE\n');
      console.log('[SAFETY] ⚡ Medium risk terms detected (review recommended):');
      safety.suggestions.forEach(s => {
        console.log(`  • ${s.issue}`);
        console.log(`    Suggested: "${s.suggested}"`);
      });
      // Auto-correct medium risk as well
      cleanPrompt = this.contentSafetyFilter.autoCorrect(cleanPrompt, 'medium');
      console.log('[SAFETY] ✅ Auto-corrected medium-risk terms\n');
    } else {
      console.log(`[SAFETY] ✅ Prompt is content-safe (risk score: ${safety.riskScore}/100)\n`);
    }
    
    console.log(`[PROMPT] Final prompt (${cleanPrompt.length} chars): "${cleanPrompt.substring(0, 80)}"\n`);
    
    const frame = this.getActiveFrame();
    
    // Wait for page to be fully loaded
    await frame.waitForTimeout(1000);

    // Try multiple selectors for prompt input - ordered by specificity
    const promptSelectors = [
      'textarea[placeholder*="Describe"]',
      'textarea[placeholder*="create"]',
      'textarea.w-full',
      'textarea[placeholder*="prompt" i]',
      'textarea[placeholder*="describe" i]',
      'textarea[class*="prompt"]',
      'textarea',
      'div[contenteditable="true"]',
      '[contenteditable="true"]',
      'div[role="textbox"]',
    ];
    
    let promptInput = null;
    
    for (const selector of promptSelectors) {
      try {
        const elements = await frame.$$(selector);
        
        for (const el of elements) {
          const box = await el.boundingBox();
          if (box && box.width > 100 && box.height > 20) {
            promptInput = el;
            console.log(`   ✅ Found prompt input: ${selector}`);
            break;
          }
        }
        
        if (promptInput) break;
      } catch (e) {
        continue;
      }
    }
    
    if (!promptInput) {
      // Last resort: find any large text input area
      const allInputs = await frame.$$('textarea, div[contenteditable="true"], div[role="textbox"]');
      for (const el of allInputs) {
        const box = await el.boundingBox();
        if (box && box.width > 200 && box.height > 30) {
          promptInput = el;
          console.log(`   ✅ Found fallback input`);
          break;
        }
      }
    }
    
    if (!promptInput) {
      await this.screenshot({ 
        path: path.join(process.cwd(), 'temp', `bfl-no-prompt-input-${Date.now()}.png`) 
      });
      throw new Error('Could not find prompt input.');
    }
    
    // Click and focus the input
    await promptInput.click();
    await frame.waitForTimeout(300);
    
    // Clear existing text
    try {
      await this.page.keyboard.down('Control');
      await this.page.keyboard.press('a');
      await this.page.keyboard.up('Control');
      await frame.waitForTimeout(100);
      await this.page.keyboard.press('Backspace');
    } catch (e) {
      await promptInput.click({ clickCount: 3 });
    }
    
    await frame.waitForTimeout(200);
    
    // ✅ PASTE PROMPT (faster than typing)
    // Copy to clipboard and paste
    await this.page.evaluate((text) => {
      navigator.clipboard.writeText(text);
    }, cleanPrompt);
    
    await frame.waitForTimeout(200);
    
    // Paste using Ctrl+V
    await this.page.keyboard.down('Control');
    await this.page.keyboard.press('v');
    await this.page.keyboard.up('Control');
    
    // Wait 2 seconds for paste to complete before any submit action
    console.log('   ⏳ Waiting 2s for paste to complete...');
    await frame.waitForTimeout(2000);
    
    // ✅ VERIFY: Check if prompt was pasted completely
    const pastedText = await frame.evaluate((selector) => {
      const el = document.querySelector(selector);
      return el ? (el.value || el.textContent || el.innerText || '') : '';
    }, 'textarea');
    
    if (pastedText.length < cleanPrompt.length * 0.9) {
      console.log(`   ⚠️ Prompt may be incomplete: ${pastedText.length}/${cleanPrompt.length} chars`);
      console.log(`   Retrying paste...`);
      
      // Try pasting again
      await promptInput.click();
      await frame.waitForTimeout(100);
      await this.page.keyboard.down('Control');
      await this.page.keyboard.press('a');
      await this.page.keyboard.up('Control');
      await frame.waitForTimeout(100);
      
      await this.page.evaluate((text) => {
        navigator.clipboard.writeText(text);
      }, cleanPrompt);
      await frame.waitForTimeout(200);
      
      await this.page.keyboard.down('Control');
      await this.page.keyboard.press('v');
      await this.page.keyboard.up('Control');
      await frame.waitForTimeout(2000);
      
      // Verify again
      const retriedText = await frame.evaluate((selector) => {
        const el = document.querySelector(selector);
        return el ? (el.value || el.textContent || el.innerText || '') : '';
      }, 'textarea');
      
      console.log(`   📝 After retry: ${retriedText.length}/${cleanPrompt.length} chars`);
    } else {
      console.log(`   ✅ Prompt verified: ${pastedText.length}/${cleanPrompt.length} chars pasted`);
    }
    
    console.log('✅ Prompt pasted and verified');
    return true;
  }

  /**
   * Count preview images (Input 1, Input 2, etc.)
   */
  async countPreviewImages() {
    const frame = this.getActiveFrame();
    const images = await frame.$$('img[alt^="Input"]');
    return images.length;
  }

  /**
   * Verify that we have the expected number of preview images before generating
   */
  async verifyPreviewImages(expectedCount, maxWait = 10000) {
    console.log(`🔍 Verifying ${expectedCount} preview images...`);
    
    const frame = this.getActiveFrame();
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWait) {
      const images = await frame.$$('img[alt^="Input"]');
      console.log(`   Current preview images: ${images.length}/${expectedCount}`);
      
      if (images.length >= expectedCount) {
        console.log(`   ✅ Verified ${images.length} preview images`);
        return true;
      }
      
      await frame.waitForTimeout(500);
    }
    
    const finalCount = await this.countPreviewImages();
    console.log(`   ⚠️ Only ${finalCount} preview images after ${maxWait/1000}s`);
    return false;
  }

  /**
   * Click the "back" button (arrow-left icon) to return to input screen
   * Used after downloading first image to generate second image without re-uploading
   */
  async clickBackButton() {
    console.log('🔙 Clicking back button to return to input screen...');
    
    const frame = this.getActiveFrame();
    
    // Find back button with arrow-left icon
    // <button data-variant="ghost" data-size="icon">
    //   <svg class="lucide lucide-arrow-left">
    
    let backBtn = null;
    
    // Method 1: Find button with arrow-left icon
    const svgWithArrowLeft = await frame.$('svg[class*="arrow-left"]');
    if (svgWithArrowLeft) {
      // Get parent button
      backBtn = await svgWithArrowLeft.$x('..').then(els => els[0]);
      if (backBtn) {
        console.log('   ✅ Found back button (arrow-left icon)');
      }
    }
    
    // Method 2: Find ghost variant button with arrow-left
    if (!backBtn) {
      const buttons = await frame.$$('button[data-variant="ghost"]');
      for (const btn of buttons) {
        try {
          const hasArrowLeft = await btn.$('svg[class*="arrow-left"]');
          if (hasArrowLeft) {
            backBtn = btn;
            console.log('   ✅ Found back button (ghost variant with arrow-left)');
            break;
          }
        } catch (e) {
          continue;
        }
      }
    }
    
    // Method 3: Find any button with arrow-left
    if (!backBtn) {
      const buttons = await frame.$$('button');
      for (const btn of buttons) {
        try {
          const hasArrowLeft = await btn.$('svg[class*="arrow-left"]');
          if (hasArrowLeft) {
            backBtn = btn;
            console.log('   ✅ Found back button (any button with arrow-left)');
            break;
          }
        } catch (e) {
          continue;
        }
      }
    }
    
    if (backBtn) {
      await backBtn.click();
      console.log('✅ Clicked back button');
      
      // Wait for input screen to load
      await frame.waitForTimeout(2000);
      return true;
    } else {
      console.log('⚠️ Back button not found, will refresh page instead');
      return false;
    }
  }

  /**
   * Clear prompt field for new input
   */
  async clearPrompt() {
    console.log('🧹 Clearing prompt field...');
    
    const frame = this.getActiveFrame();
    
    // Find prompt input
    const promptSelectors = [
      'textarea[placeholder*="Describe"]',
      'textarea[placeholder*="create"]',
      'textarea.w-full',
      'textarea',
      'div[contenteditable="true"]',
    ];
    
    let promptInput = null;
    for (const selector of promptSelectors) {
      const elements = await frame.$$(selector);
      for (const el of elements) {
        const box = await el.boundingBox();
        if (box && box.width > 100 && box.height > 20) {
          promptInput = el;
          break;
        }
      }
      if (promptInput) break;
    }
    
    if (!promptInput) {
      console.log('   ⚠️ Prompt input not found');
      return false;
    }
    
    // Click and clear
    await promptInput.click();
    await frame.waitForTimeout(100);
    
    // Select all and delete
    await this.page.keyboard.down('Control');
    await this.page.keyboard.press('a');
    await this.page.keyboard.up('Control');
    await frame.waitForTimeout(50);
    await this.page.keyboard.press('Backspace');
    
    console.log('✅ Prompt field cleared');
    return true;
  }

  /**
   * Click generate button and wait for result
   * Includes login dialog detection and auto-login
   */
  async generate(maxWait = 180000) {
    console.log('🎨 Starting image generation...');
    
    // ✅ CHECK FOR LOGIN DIALOG before clicking generate
    const hasLoginDialog = await this.checkForLoginDialog();
    if (hasLoginDialog) {
      console.log('\n🔐 Session expired detected, initiating auto-login...');
      await this.handleAutoLogin();
      // After auto-login, throw error to signal caller to restart
      throw new Error('SESSION_EXPIRED_AUTO_LOGIN_COMPLETE - Please restart generation');
    }
    
    const frame = this.getActiveFrame();
    
    // Find generate button - Based on actual HTML structure:
    // <button data-slot="button" data-variant="default" data-size="icon">
    //   <svg class="lucide lucide-arrow-right">
    
    // Method 1: Find button with arrow-right icon (submit button)
    let generateBtn = await frame.$('button[data-variant="default"] svg[class*="arrow-right"]');
    if (generateBtn) {
      // Get parent button
      generateBtn = await generateBtn.$x('..').then(els => els[0]);
      if (generateBtn) {
        console.log('   ✅ Found generate button (arrow-right icon)');
      }
    }
    
    // Method 2: Find buttons and check for arrow icon
    if (!generateBtn) {
      const buttons = await frame.$$('button');
      for (const btn of buttons) {
        try {
          const hasArrowIcon = await btn.$('svg[class*="arrow-right"]');
          if (hasArrowIcon) {
            generateBtn = btn;
            console.log('   ✅ Found button with arrow-right icon');
            break;
          }
        } catch (e) {
          continue;
        }
      }
    }
    
    // Method 3: Look for primary button
    if (!generateBtn) {
      generateBtn = await frame.$('button[data-variant="default"]');
      if (generateBtn) {
        console.log('   ✅ Found primary button');
      }
    }
    
    if (generateBtn) {
      await generateBtn.click();
      console.log('✅ Clicked generate button');
    } else {
      console.log('⚠️  No generate button found, pressing Enter');
      await this.page.keyboard.press('Enter');
    }
    
    // ✅ CHECK FOR LOGIN DIALOG after clicking (might appear on submit)
    await this.page.waitForTimeout(2000);
    const hasLoginDialogAfter = await this.checkForLoginDialog();
    if (hasLoginDialogAfter) {
      console.log('\n🔐 Session expired after submit, initiating auto-login...');
      await this.handleAutoLogin();
      throw new Error('SESSION_EXPIRED_AUTO_LOGIN_COMPLETE - Please restart generation');
    }
    
    // Wait for generation to complete
    console.log('⏳ Waiting for generation to complete...');
    const imageUrl = await this._waitForGeneratedImage(maxWait);
    
    if (!imageUrl) {
      throw new Error('Image generation timed out');
    }
    
    console.log(`✅ Image generated: ${imageUrl.substring(0, 60)}...`);
    return imageUrl;
  }

  /**
   * Wait for generated image to appear
   */
  async _waitForGeneratedImage(maxWait = 180000) {
    const startTime = Date.now();
    const frame = this.getActiveFrame();
    
    // Get initial images to exclude from detection
    const initialImages = await frame.evaluate(() => {
      const images = document.querySelectorAll('img');
      return Array.from(images)
        .filter(img => img.src && (img.src.startsWith('http') || img.src.startsWith('blob:')))
        .map(img => img.src);
    });
    
    console.log(`   Initial images on page: ${initialImages.length}`);
    
    while (Date.now() - startTime < maxWait) {
      await frame.waitForTimeout(3000);
      
      const imageUrl = await frame.evaluate((initialImgs) => {
        const images = document.querySelectorAll('img');
        
        for (const img of images) {
          const src = img.src;
          
          // Skip initial images
          if (initialImgs.includes(src)) continue;
          
          // Skip small images (icons, etc.)
          if (img.naturalWidth < 256 || img.naturalHeight < 256) continue;
          
          // Skip known non-generated sources
          if (src.includes('logo') || src.includes('icon') || src.includes('avatar')) continue;
          
          // Check for generated image indicators
          if (
            src.includes('generated') ||
            src.includes('result') ||
            src.includes('output') ||
            src.includes('bfl.ai') ||
            src.includes('blackforest') ||
            src.startsWith('data:image') ||
            src.startsWith('blob:')
          ) {
            return src;
          }
          
          // Accept large external images
          if (src.startsWith('https://') && img.naturalWidth >= 512) {
            return src;
          }
        }
        
        return null;
      }, initialImages);
      
      if (imageUrl) {
        return imageUrl;
      }
      
      // Check for error messages
      const hasError = await frame.evaluate(() => {
        const errorSelectors = ['.error', '.error-message', '[data-testid="error"]'];
        for (const sel of errorSelectors) {
          const el = document.querySelector(sel);
          if (el && el.textContent) {
            return el.textContent;
          }
        }
        return null;
      });
      
      if (hasError) {
        throw new Error(`Generation error: ${hasError}`);
      }
      
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      console.log(`   ⏳ Waiting for image... (${elapsed}s)`);
    }
    
    return null;
  }

  /**
   * Download generated image
   */
  async downloadImage(imageUrl, outputPath) {
    console.log(`💾 Downloading image...`);
    
    const frame = this.getActiveFrame();
    
    const filename = outputPath || path.join(
      process.cwd(),
      'temp',
      `bfl-generated-${Date.now()}.png`
    );
    
    // Ensure directory exists
    const dir = path.dirname(filename);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Handle data URLs
    if (imageUrl.startsWith('data:image')) {
      const matches = imageUrl.match(/^data:image\/\w+;base64,(.+)$/);
      if (matches) {
        const buffer = Buffer.from(matches[1], 'base64');
        fs.writeFileSync(filename, buffer);
        console.log(`✅ Saved data URL to: ${filename}`);
        return filename;
      }
    }
    
    // Handle blob URLs - need to convert in browser
    if (imageUrl.startsWith('blob:')) {
      const dataUrl = await frame.evaluate(async (blobUrl) => {
        const response = await fetch(blobUrl);
        const blob = await response.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
      }, imageUrl);
      
      const matches = dataUrl.match(/^data:image\/\w+;base64,(.+)$/);
      if (matches) {
        const buffer = Buffer.from(matches[1], 'base64');
        fs.writeFileSync(filename, buffer);
        console.log(`✅ Saved blob URL to: ${filename}`);
        return filename;
      }
    }
    
    // Download from HTTP URL
    return new Promise((resolve, reject) => {
      const protocol = imageUrl.startsWith('https') ? https : http;
      const file = fs.createWriteStream(filename);
      
      const request = protocol.get(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }, (response) => {
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          file.close();
          fs.unlinkSync(filename);
          this.downloadImage(response.headers.location, outputPath)
            .then(resolve)
            .catch(reject);
          return;
        }
        
        if (response.statusCode !== 200) {
          file.close();
          fs.unlinkSync(filename);
          reject(new Error(`HTTP ${response.statusCode}`));
          return;
        }
        
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log(`✅ Downloaded to: ${filename}`);
          resolve(filename);
        });
      });
      
      request.on('error', (err) => {
        file.close();
        fs.unlinkSync(filename, () => {});
        reject(err);
      });
      
      request.setTimeout(60000, () => {
        request.destroy();
        reject(new Error('Download timeout'));
      });
    });
  }

  /**
   * Full workflow: upload image (optional), enter prompt, generate, download
   */
  async generateImage(prompt, options = {}) {
    console.log('\n🎨 BFL PLAYGROUND IMAGE GENERATION');
    console.log('='.repeat(80));
    console.log(`Prompt: ${prompt.substring(0, 100)}...`);
    if (options.referenceImage) {
      console.log(`Reference: ${options.referenceImage}`);
    }
    console.log('');
    
    try {
      // Initialize if not already done
      if (!this.page) {
        await this.initialize();
      }
      
      // Check login status
      const isLoggedIn = await this.checkLoginStatus();
      if (!isLoggedIn) {
        throw new Error('Not logged in. Run: node scripts/bfl-login.js');
      }
      
      // Upload reference image if provided
      if (options.referenceImage) {
        await this.uploadImage(options.referenceImage);
        await this.page.waitForTimeout(1000);
      }
      
      // Enter prompt
      await this.enterPrompt(prompt);
      
      // Generate
      const imageUrl = await this.generate(options.maxWait);
      
      // Download if requested
      if (options.download !== false) {
        const downloadPath = await this.downloadImage(imageUrl, options.outputPath);
        
        return {
          url: imageUrl,
          path: downloadPath,
          provider: 'bfl-playground',
          model: 'flux-2-klein'
        };
      }
      
      return {
        url: imageUrl,
        provider: 'bfl-playground',
        model: 'flux-2-klein'
      };
      
    } catch (error) {
      console.error(`❌ Generation failed: ${error.message}`);
      
      // Take screenshot for debugging
      const screenshotPath = path.join(
        process.cwd(),
        'temp',
        `bfl-error-${Date.now()}.png`
      );
      await this.screenshot({ path: screenshotPath });
      
      throw error;
    }
  }

  /**
   * Generate multiple images sequentially (compatible with affiliateVideoTikTokService)
   * This method matches the interface of GrokServiceV2 and GoogleFlowAutomationService
   * 
   * @param {string} characterImagePath - Path to character image (reference image)
   * @param {string} productImagePath - Path to product image (also used as reference)
   * @param {string[]} prompts - Array of prompts to generate images for ['wearing', 'holding']
   * @param {Object} options - Options including outputDir, download, etc.
   * @returns {Promise<Object>} Results compatible with GoogleFlowAutomationService format
   */
  async generateMultiple(characterImagePath, productImagePath, prompts, options = {}) {
    console.log(`\n${'═'.repeat(80)}`);
    console.log(`📊 AFFILIATE VIDEO IMAGE GENERATION (TikTok): ${prompts.length} images (via BFL)`);
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
    const downloadedFiles = [];
    const outputDir = this.options?.outputDir || options.outputDir || path.join(process.cwd(), 'backend', 'generated-images');

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Define generation types matching Grok/GoogleFlow interface
    const generationTypes = [
      { type: 'wearing', description: 'Character wearing the product' },
      { type: 'holding', description: 'Character holding the product' }
    ];

    try {
      // Initialize browser if not already done
      if (!this.page || this.page.isClosed()) {
        console.log('[INIT] 🚀 Initializing BFL browser...');
        await this.initialize();
        console.log('[INIT] ✅ BFL initialized\n');
      }

      // Check login status
      const isLoggedIn = await this.checkLoginStatus();
      if (!isLoggedIn) {
        throw new Error('Not logged in to BFL. Run: node scripts/bfl-login.js');
      }

      console.log(`📋 Two generation prompts prepared:\n`);
      for (let i = 0; i < prompts.length; i++) {
        const genType = generationTypes[i] || { type: `image-${i + 1}`, description: `Image ${i + 1}` };
        console.log(`   [${i + 1}] ${genType.type.toUpperCase()}: ${genType.description}`);
        console.log(`   Prompt length: ${prompts[i]?.length || 0} chars`);
      }
      console.log();

      // ✅ VERIFY: Both prompts are DIFFERENT
      if (prompts.length >= 2) {
        const prompt1 = prompts[0] || '';
        const prompt2 = prompts[1] || '';
        
        if (prompt1 === prompt2) {
          console.warn(`⚠️  WARNING: Both prompts are IDENTICAL!`);
        } else {
          console.log(`✅ VERIFIED: Two prompts are DIFFERENT`);
          console.log(`   Length diff: ${Math.abs(prompt1.length - prompt2.length)} characters\n`);
        }
      }

      // Generate each image sequentially
      for (let i = 0; i < prompts.length; i++) {
        const prompt = prompts[i];
        const genType = generationTypes[i] || { type: `image-${i + 1}`, description: `Image ${i + 1}` };
        const imageNumber = i + 1;

        console.log(`\n${'═'.repeat(80)}`);
        console.log(`🎨 IMAGE ${imageNumber}/${prompts.length}: ${genType.description.toUpperCase()}`);
        console.log(`${'═'.repeat(80)}\n`);

        if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
          console.error(`❌ IMAGE ${imageNumber} PROMPT INVALID`);
          results.push({
            success: false,
            imageNumber,
            type: genType.type,
            error: `Invalid prompt generated`
          });
          continue;
        }

        try {
          console.log(`[STEP 1] 📝 Starting ${genType.type.toUpperCase()} image generation...`);
          console.log(`   Prompt length: ${prompt.length} chars`);
          
          // Create output path for this image
          const outputPath = path.join(outputDir, `${genType.type}-${Date.now()}.jpg`);

          // ============================================================
          // FOR FIRST IMAGE: Upload both images as reference
          // FOR SECOND IMAGE: Click back button (images still uploaded)
          // ============================================================
          
          if (i === 0) {
            // ========== FIRST IMAGE: Upload both images ==========
            // 💫 NEW: Also upload optional scene image if provided
            console.log(`\n[UPLOAD] 📤 Uploading images as reference...`);
            
            // Upload character image
            if (fs.existsSync(characterImagePath)) {
              console.log(`   [1/3] Uploading character image...`);
              await this.uploadImage(characterImagePath);
              console.log(`   ✅ Character image uploaded`);
            } else {
              console.warn(`   ⚠️ Character image not found: ${characterImagePath}`);
            }
            
            await this.page.waitForTimeout(500);
            
            // Upload product image  
            if (fs.existsSync(productImagePath)) {
              console.log(`   [2/3] Uploading product image...`);
              await this.uploadImage(productImagePath);
              console.log(`   ✅ Product image uploaded`);
            } else {
              console.warn(`   ⚠️ Product image not found: ${productImagePath}`);
            }
            
            // 💫 NEW: Upload optional scene reference image
            if (options.sceneImagePath && fs.existsSync(options.sceneImagePath)) {
              await this.page.waitForTimeout(500);
              console.log(`   [3/3] Uploading scene reference image...`);
              try {
                await this.uploadImage(options.sceneImagePath);
                console.log(`   ✅ Scene image uploaded`);
              } catch (sceneError) {
                console.warn(`   ⚠️ Scene image upload failed (non-blocking): ${sceneError.message}`);
              }
            }

            // Verify preview images uploaded
            // 💫 NEW: Expect 3 images if scene provided, otherwise 2
            const expectedImageCount = (options.sceneImagePath && fs.existsSync(options.sceneImagePath)) ? 3 : 2;
            console.log(`\n[VERIFY] 🔍 Verifying ${expectedImageCount} preview images uploaded...`);
            const hasImages = await this.verifyPreviewImages(expectedImageCount, 15000);
            
            if (!hasImages) {
              console.warn(`   ⚠️ Less than ${expectedImageCount} preview images detected, but continuing...`);
            }
            
          } else {
            // ========== SECOND IMAGE: Click back button ==========
            console.log(`\n[BACK] 🔙 Clicking back button to return to input screen...`);
            const backSuccess = await this.clickBackButton();
            
            if (!backSuccess) {
              // Fallback: refresh page and re-upload if back button not found
              console.log(`\n[FALLBACK] 🔄 Refreshing page (back button not found)...`);
              await this.page.reload({ waitUntil: 'networkidle2' });
              await this.page.waitForTimeout(3000);
              await this.switchToIframe();
              
              // Re-upload images
              console.log(`   Re-uploading images...`);
              if (fs.existsSync(characterImagePath)) {
                await this.uploadImage(characterImagePath);
              }
              await this.page.waitForTimeout(500);
              if (fs.existsSync(productImagePath)) {
                await this.uploadImage(productImagePath);
              }
              await this.verifyPreviewImages(2, 15000);
            } else {
              console.log(`[BACK] ✅ Back to input screen (images still uploaded)`);
            }
          }

          // ============================================================
          // ENTER PROMPT (PASTE for speed)
          // ============================================================
          console.log(`\n[PROMPT] 📋 Pasting prompt...`);
          await this.enterPrompt(prompt);
          console.log(`[PROMPT] ✅ Prompt pasted`);

          // ============================================================
          // GENERATE IMAGE
          // ============================================================
          console.log(`\n[GENERATE] 🎨 Starting generation...`);
          const imageUrl = await this.generate(options.maxWait || 180000);
          console.log(`[GENERATE] ✅ Image generated: ${imageUrl?.substring(0, 60)}...`);

          // ============================================================
          // DOWNLOAD IMAGE
          // ============================================================
          console.log(`\n[DOWNLOAD] 💾 Downloading image...`);
          const downloadPath = await this.downloadImage(imageUrl, outputPath);
          console.log(`[DOWNLOAD] ✅ Downloaded to: ${downloadPath}`);

          // Map to standard format compatible with Grok/GoogleFlow
          const result = {
            success: true,
            imageNumber,
            type: genType.type,
            href: imageUrl,
            downloadedFile: downloadPath,
            url: imageUrl
          };

          results.push(result);
          if (downloadPath) {
            downloadedFiles.push(downloadPath);
          }

          console.log(`\n✅ IMAGE ${imageNumber} (${genType.type}) COMPLETE`);
          console.log(`   📍 URL: ${imageUrl?.substring(0, 60)}...`);
          console.log(`   💾 Path: ${downloadPath}`);

          // Small delay between images
          if (i < prompts.length - 1) {
            console.log(`\n[DELAY] ⏳ Waiting 2 seconds before next image...`);
            await this.page.waitForTimeout(2000);
          }

        } catch (promptError) {
          console.error(`\n❌ IMAGE ${imageNumber} (${genType.type}) GENERATION FAILED`);
          console.error(`   Error message: ${promptError.message}`);
          
          // ✅ HANDLE SESSION EXPIRED - Auto-login and restart
          if (promptError.message.includes('SESSION_EXPIRED_AUTO_LOGIN_COMPLETE')) {
            console.log('\n🔄 Session expired, auto-login complete. Refreshing and retrying...\n');
            
            // Refresh and reinitialize
            await this.refreshAndReinitialize();
            
            // Retry current image from beginning
            i--; // Decrement to retry same index
            console.log(`   Retrying IMAGE ${imageNumber}...\n`);
            continue;
          }
          
          // Take screenshot for debugging
          const screenshotPath = path.join(process.cwd(), 'temp', `bfl-${genType.type}-failure-${Date.now()}.png`);
          try {
            await this.screenshot({ path: screenshotPath });
            console.error(`   🔍 Screenshot saved: ${screenshotPath}`);
          } catch (e) {
            console.error(`   ⚠️  Could not save screenshot: ${e.message}`);
          }
          
          results.push({
            success: false,
            imageNumber,
            type: genType.type,
            error: promptError.message
          });
        }
      }

      // Prepare final results
      const successCount = results.filter(r => r.success).length;

      console.log(`\n${'═'.repeat(70)}`);
      console.log(`✅ GENERATION COMPLETE: ${successCount}/${prompts.length} successful`);
      console.log(`📁 Output directory: ${outputDir}`);
      console.log(`${'═'.repeat(70)}\n`);

      // Log details about any failures
      const failures = results.filter(r => !r.success);
      if (failures.length > 0) {
        console.log(`⚠️  IMAGE GENERATION FAILURES:\n`);
        failures.forEach(f => {
          console.log(`   IMAGE ${f.imageNumber} (${f.type?.toUpperCase()}): ${f.error}`);
        });
        console.log('');
      }

      return {
        success: successCount === prompts.length,
        results: results,
        totalGenerated: successCount,
        totalRequested: prompts.length,
        downloadedFiles: downloadedFiles
      };

    } catch (error) {
      console.error(`\n❌ BFL generateMultiple failed: ${error.message}`);
      
      // ✅ HANDLE SESSION EXPIRED at outer level
      if (error.message.includes('SESSION_EXPIRED_AUTO_LOGIN_COMPLETE')) {
        console.log('\n🔄 Session expired during initialization. Auto-login complete.');
        console.log('   Returning partial results - caller should retry.\n');
        
        return {
          success: false,
          results: results,
          totalGenerated: results.filter(r => r.success).length,
          totalRequested: prompts.length,
          downloadedFiles: downloadedFiles,
          error: 'SESSION_EXPIRED_RETRY_RECOMMENDED',
          shouldRetry: true
        };
      }
      
      console.error(`Stack: ${error.stack}`);
      
      // Take screenshot for debugging
      const screenshotPath = path.join(process.cwd(), 'temp', `bfl-multiple-failure-${Date.now()}.png`);
      try {
        await this.screenshot({ path: screenshotPath });
        console.error(`🔍 Screenshot saved: ${screenshotPath}`);
      } catch (e) {
        console.error(`⚠️  Could not save screenshot: ${e.message}`);
      }
      
      return {
        success: false,
        results: results,
        totalGenerated: results.filter(r => r.success).length,
        totalRequested: prompts.length,
        downloadedFiles: downloadedFiles,
        error: error.message
      };
    }
  }

  /**
   * Get session info
   */
  getSessionInfo() {
    return this.sessionManager.getSessionInfo();
  }
}

export default BFLPlaygroundService;
