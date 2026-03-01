import BrowserService from './browserService.js';
import BFLSessionManager from './bflSessionManager.js';
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
    
    // Selectors for BFL Playground (Puppeteer-compatible, no :has-text())
    this.selectors = {
      // Auth
      signInButton: 'a[href*="sign"], [data-testid="sign-in"]',
      userMenu: '[data-testid="user-menu"], .user-avatar, .profile-button',
      
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
   * Upload reference image
   */
  async uploadImage(imagePath) {
    console.log(`📤 Uploading image: ${imagePath}`);
    
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found: ${imagePath}`);
    }
    
    const frame = this.getActiveFrame();
    
    try {
      // Method 1: Look for file input directly in iframe
      let fileInput = await frame.$('input[type="file"]');
      
      // Method 2: Click the + button to trigger file upload
      if (!fileInput) {
        // Look for the plus button that triggers image upload
        const plusButton = await frame.$('button:has(svg[class*="plus"]), button[class*="plus"], [data-variant="secondary"]');
        
        if (plusButton) {
          console.log('   Found plus button, clicking to upload...');
          
          // Set up file chooser listener on main page
          const [fileChooser] = await Promise.all([
            this.page.waitForFileChooser({ timeout: 10000 }).catch(() => null),
            plusButton.click()
          ]);
          
          if (fileChooser) {
            await fileChooser.accept([imagePath]);
            console.log('✅ Image uploaded via file chooser');
            await frame.waitForTimeout(2000);
            return true;
          }
        }
      }
      
      // Method 3: Direct file input upload
      if (fileInput) {
        await fileInput.uploadFile(imagePath);
        console.log('✅ Image uploaded via file input');
        await frame.waitForTimeout(2000);
        return true;
      }
      
      throw new Error('Could not find any upload method');
      
    } catch (error) {
      console.error(`❌ Upload failed: ${error.message}`);
      throw error;
    }
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
   * Enter prompt text
   */
  async enterPrompt(prompt) {
    console.log(`⌨️  Entering prompt: ${prompt.substring(0, 50)}...`);
    
    const frame = this.getActiveFrame();
    
    // Wait for page to be fully loaded
    await frame.waitForTimeout(2000);
    
    // Debug: log page elements
    await this.debugPageElements();
    
    // Try multiple selectors for prompt input - ordered by specificity
    // Based on actual BFL iframe HTML structure
    const promptSelectors = [
      // Exact match from HTML
      'textarea[placeholder*="Describe"]',
      'textarea[placeholder*="create"]',
      'textarea.w-full',
      
      // High priority - specific to BFL
      'textarea[placeholder*="prompt" i]',
      'textarea[placeholder*="describe" i]',
      'textarea[class*="prompt"]',
      
      // Medium priority - common patterns
      'textarea',
      'div[contenteditable="true"]',
      '[contenteditable="true"]',
      'div[role="textbox"]',
    ];
    
    let promptInput = null;
    let foundSelector = null;
    
    for (const selector of promptSelectors) {
      try {
        const elements = await frame.$$(selector);
        
        for (const el of elements) {
          // Check if element is visible and has reasonable size
          const box = await el.boundingBox();
          if (box && box.width > 100 && box.height > 20) {
            promptInput = el;
            foundSelector = selector;
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
      console.log('   ⚠️ Standard selectors failed, searching for any large input...');
      
      const allInputs = await frame.$$('textarea, div[contenteditable="true"], div[role="textbox"]');
      for (const el of allInputs) {
        const box = await el.boundingBox();
        if (box && box.width > 200 && box.height > 30) {
          promptInput = el;
          foundSelector = 'fallback-large-input';
          console.log(`   ✅ Found fallback input (${Math.round(box.width)}x${Math.round(box.height)})`);
          break;
        }
      }
    }
    
    if (!promptInput) {
      // Take screenshot for debugging
      await this.screenshot({ 
        path: path.join(process.cwd(), 'temp', `bfl-no-prompt-input-${Date.now()}.png`) 
      });
      throw new Error('Could not find prompt input. Screenshot saved for debugging.');
    }
    
    // Click and focus the input
    await promptInput.click();
    await frame.waitForTimeout(300);
    
    // Clear existing text using multiple methods
    // Note: keyboard operations must use this.page, not frame
    try {
      // Method 1: Ctrl+A then delete
      await this.page.keyboard.down('Control');
      await this.page.keyboard.press('a');
      await this.page.keyboard.up('Control');
      await frame.waitForTimeout(100);
      await this.page.keyboard.press('Backspace');
    } catch (e) {
      // Method 2: Triple click to select all
      await promptInput.click({ clickCount: 3 });
    }
    
    await frame.waitForTimeout(200);
    
    // Type new prompt - use page.keyboard
    await this.page.keyboard.type(prompt, { delay: 20 });
    
    console.log('✅ Prompt entered');
    return true;
  }

  /**
   * Click generate button and wait for result
   */
  async generate(maxWait = 180000) {
    console.log('🎨 Starting image generation...');
    
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
   * Get session info
   */
  getSessionInfo() {
    return this.sessionManager.getSessionInfo();
  }
}

export default BFLPlaygroundService;
