import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Base Browser Service
 * Handles browser lifecycle and common operations
 */
class BrowserService {
  constructor(options = {}) {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.sessionManager = options.sessionManager || null;
    this.options = {
      headless: options.headless !== false, // Default true
      slowMo: options.slowMo || 0,
      timeout: options.timeout || 60000,
      viewport: options.viewport || { width: 1920, height: 1080 },
      userAgent: options.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ...options
    };
  }

  /**
   * Launch browser with optional session
   */
  async launch() {
    console.log('🚀 Launching browser...');
    
    this.browser = await chromium.launch({
      headless: this.options.headless,
      slowMo: this.options.slowMo,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-web-security',
        '--disable-features=BlockInsecurePrivateNetworkRequests'
      ]
    });

    // Create context with optional session
    const contextOptions = {
      viewport: this.options.viewport,
      userAgent: this.options.userAgent,
      locale: 'en-US',
      timezoneId: 'America/New_York',
      permissions: ['clipboard-read', 'clipboard-write'],
      javaScriptEnabled: true,
      bypassCSP: true
    };

    // Load session if available
    if (this.sessionManager && this.sessionManager.hasSession()) {
      console.log('📂 Loading saved session...');
      const sessionData = this.sessionManager.loadSession();
      
      if (sessionData) {
        contextOptions.storageState = sessionData;
        console.log('✅ Session loaded');
      }
    }

    this.context = await this.browser.newContext(contextOptions);

    // Add stealth scripts
    await this.context.addInitScript(() => {
      // Override navigator.webdriver
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false
      });

      // Override chrome property
      window.chrome = {
        runtime: {}
      };

      // Override permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );

      // Add plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5]
      });

      // Add languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en']
      });
    });

    this.page = await this.context.newPage();
    
    // Set default timeout
    this.page.setDefaultTimeout(this.options.timeout);

    console.log('✅ Browser launched');
  }

  /**
   * Save current session
   */
  async saveSession() {
    if (this.sessionManager && this.context) {
      return await this.sessionManager.saveSession(this.context);
    }
    return false;
  }

  /**
   * Navigate to URL
   */
  async goto(url, options = {}) {
    console.log(`📍 Navigating to: ${url}`);
    
    await this.page.goto(url, {
      waitUntil: options.waitUntil || 'networkidle',
      timeout: options.timeout || this.options.timeout
    });

    console.log('✅ Page loaded');
  }

  /**
   * Wait for selector
   */
  async waitForSelector(selector, options = {}) {
    return await this.page.waitForSelector(selector, {
      timeout: options.timeout || this.options.timeout,
      state: options.state || 'visible'
    });
  }

  /**
   * Type text with human-like delays
   */
  async typeText(selector, text, options = {}) {
    const element = await this.waitForSelector(selector);
    
    await element.click();
    await this.page.waitForTimeout(options.delay || 100);
    
    // Type with random delays between keystrokes
    for (const char of text) {
      await element.type(char);
      await this.page.waitForTimeout(Math.random() * 100 + 50);
    }
  }

  /**
   * Upload file
   */
  async uploadFile(selector, filePath) {
    console.log(`📤 Uploading file: ${filePath}`);
    
    const input = await this.page.$(selector);
    if (!input) {
      throw new Error(`File input not found: ${selector}`);
    }
    
    await input.setInputFiles(filePath);
    console.log('✅ File uploaded');
  }

  /**
   * Take screenshot
   */
  async screenshot(options = {}) {
    const screenshotPath = options.path || path.join(__dirname, '../../temp', `screenshot-${Date.now()}.png`);
    
    // Ensure temp directory exists
    const tempDir = path.dirname(screenshotPath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    await this.page.screenshot({
      path: screenshotPath,
      fullPage: options.fullPage || false
    });
    
    console.log(`📸 Screenshot saved: ${screenshotPath}`);
    return screenshotPath;
  }

  /**
   * Wait for text to appear
   */
  async waitForText(text, options = {}) {
    console.log(`⏳ Waiting for text: "${text}"`);
    
    await this.page.waitForFunction(
      (searchText) => document.body.innerText.includes(searchText),
      text,
      { timeout: options.timeout || this.options.timeout }
    );
    
    console.log('✅ Text found');
  }

  /**
   * Get text content
   */
  async getText(selector) {
    const element = await this.waitForSelector(selector);
    return await element.textContent();
  }

  /**
   * Get all text content
   */
  async getAllText(selector) {
    const elements = await this.page.$$(selector);
    const texts = [];
    
    for (const element of elements) {
      const text = await element.textContent();
      texts.push(text);
    }
    
    return texts;
  }

  /**
   * Execute JavaScript
   */
  async evaluate(fn, ...args) {
    return await this.page.evaluate(fn, ...args);
  }

  /**
   * Close browser
   */
  async close() {
    if (this.browser) {
      console.log('🔒 Closing browser...');
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
      console.log('✅ Browser closed');
    }
  }

  /**
   * Get page instance (for advanced operations)
   */
  getPage() {
    return this.page;
  }
}

export default BrowserService;
