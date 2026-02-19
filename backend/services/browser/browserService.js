import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Apply stealth plugin to bypass bot detection
puppeteer.use(StealthPlugin());

/**
 * Base Browser Service
 * Handles browser lifecycle and common operations
 */
class BrowserService {
  constructor(options = {}) {
    this.browser = null;
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
    console.log('🚀 Launching browser (using real Chrome)...');
    
    try {
      // Try with real Chrome first
      this.browser = await puppeteer.launch({
        channel: 'chrome', // Use real Chrome installation instead of Chromium
        headless: this.options.headless,
        slowMo: this.options.slowMo,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process'
        ],
        defaultViewport: this.options.viewport
      });
      console.log('✅ Using real Chrome browser');
    } catch (error) {
      if (error.message.includes('channel') || error.message.includes('Chrome')) {
        console.log('⚠️  Chrome not found, falling back to Chromium...');
        this.browser = await puppeteer.launch({
          headless: this.options.headless,
          slowMo: this.options.slowMo,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process'
          ],
          defaultViewport: this.options.viewport
        });
        console.log('✅ Using Chromium');
      } else {
        throw error;
      }
    }

    this.page = await this.browser.newPage();
    
    // Load session cookies if available
    if (this.sessionManager && this.sessionManager.hasSession()) {
      try {
        const cookies = this.sessionManager.loadSession();
        if (cookies && cookies.length > 0) {
          await this.page.setCookie(...cookies);
          console.log(`✅ Loaded ${cookies.length} cookies from saved session`);
        }
      } catch (error) {
        console.log(`⚠️  Failed to load session cookies: ${error.message}`);
      }
    }
    
    // Set user agent
    await this.page.setUserAgent(this.options.userAgent);
    
    // Set viewport
    await this.page.setViewport(this.options.viewport);
    
    // Set default timeout
    this.page.setDefaultTimeout(this.options.timeout);

    console.log('✅ Browser launched');
  }

  /**
   * Save current session cookies
   */
  async saveSession() {
    if (this.sessionManager && this.page) {
      try {
        const cookies = await this.page.cookies();
        await this.sessionManager.saveSession(cookies);
        return true;
      } catch (error) {
        console.error(`❌ Failed to save session: ${error.message}`);
        return false;
      }
    }
    return false;
  }

  /**
   * Navigate to URL
   */
  async goto(url, options = {}) {
    console.log(`📍 Navigating to: ${url}`);
    
    await this.page.goto(url, {
      waitUntil: options.waitUntil || 'load',
      timeout: options.timeout || 120000
    });

    console.log('✅ Page loaded');
  }

  /**
   * Wait for selector
   */
  async waitForSelector(selector, options = {}) {
    return await this.page.waitForSelector(selector, {
      timeout: options.timeout || this.options.timeout,
      visible: options.visible !== false
    });
  }

  /**
   * Type text with human-like delays
   */
  async typeText(selector, text, options = {}) {
    await this.waitForSelector(selector);
    
    await this.page.click(selector);
    await this.page.waitForTimeout(options.delay || 100);
    
    // Type with random delays between keystrokes
    await this.page.type(selector, text, { delay: Math.random() * 50 + 25 });
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
    
    await input.uploadFile(filePath);
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
    await this.waitForSelector(selector);
    return await this.page.$eval(selector, el => el.textContent);
  }

  /**
   * Get all text content
   */
  async getAllText(selector) {
    return await this.page.$$eval(selector, elements => 
      elements.map(el => el.textContent)
    );
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
