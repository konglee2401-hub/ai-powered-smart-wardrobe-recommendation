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
    // Use smaller viewport that ensures all UI elements fit
    // 1280x720 ensures chat input and upload areas are visible (no bottom cutoff)
    this.options = {
      headless: options.headless !== false, // Default true
      slowMo: options.slowMo || 0,
      timeout: options.timeout || 60000,
      viewport: options.viewport || { width: 1280, height: 720 }, // 1280x720 for maximum visibility
      userAgent: options.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ...options
    };
  }

  /**
   * Launch browser with optional session
   */
  async launch(options = {}) {
    const chromeProfile = options.chromeProfile || this.options.chromeProfile || 'Profile 1';
    console.log(`🚀 Launching browser with ${chromeProfile}...`);
    console.log('🕵️  Applying stealth measures to bypass bot detection...');
    
    // Get Chrome User Data directory
    const chromeUserDataDir = path.join(
      process.env.LOCALAPPDATA || process.env.HOME,
      'Google',
      'Chrome',
      'User Data'
    );
    
    try {
      // Try with real Chrome first (using specified profile)
      this.browser = await puppeteer.launch({
        channel: 'chrome', // Use real Chrome installation
        headless: false, // Keep visible for manual interaction
        args: [
          `--user-data-dir=${chromeUserDataDir}`, // Use Chrome User Data directory
          `--profile-directory=${chromeProfile}`, // Use specified profile
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-features=IsolateOrigins,site-per-process',
          // Aggressive bot detection bypass
          '--disable-web-resources',
          '--disable-sync',
          '--no-first-run',
          '--no-default-browser-check',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-breakpad',
          '--disable-client-side-phishing-detection',
          '--disable-component-extensions-with-background-pages',
          '--disable-default-apps',
          '--disable-default-key-bindings',
          '--disable-extensions',
          '--disable-popup-blocking',
          '--disable-print-preview',
          '--disable-prompt-on-repost',
          '--disable-password-manager-reauthentication',
          // Additional stealth flags for Google security bypass
          '--disable-plugins',
          '--disable-images',
          '--no-default-browser-check',
          '--disable-web-meter-visible',
          '--disable-component-update',
          '--disable-client-side-phishing-detection',
          '--disable-save-password-bubble',
          '--disable-translate',
          '--start-maximized',
          '--disable-notifications'
        ],
        defaultViewport: null, // Allow full screen
        timeout: 60000
      });
      console.log(`✅ Chrome launched with ${chromeProfile}`);
    } catch (error) {
      if (error.message.includes('channel') || error.message.includes('Chrome')) {
        console.log('⚠️  Chrome not found, falling back to Chromium...');
        this.browser = await puppeteer.launch({
          headless: false,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process'
          ],
          defaultViewport: null,
          timeout: 60000
        });
        console.log('✅ Using Chromium');
      } else {
        throw error;
      }
    }

    this.page = await this.browser.newPage();
    
    // CRITICAL: Inject stealth JavaScript before navigation
    console.log('🔓 Injecting stealth payload...');
    await this._injectStealthPayload();
    
    // Load session cookies if available (unless skipSession option is set)
    if (!options.skipSession && this.sessionManager && this.sessionManager.hasSession()) {
      try {
        const cookies = this.sessionManager.loadSession()
        if (cookies && cookies.length > 0) {
          // Set cookies one by one to handle any issues
          for (const cookie of cookies) {
            try {
              await this.page.setCookie(cookie);
            } catch (cookieError) {
              console.log(`⚠️  Failed to set cookie: ${cookie.name} - ${cookieError.message}`);
            }
          }
          console.log(`✅ Loaded ${cookies.length} cookies from saved session`);
        }
      } catch (error) {
        console.log(`⚠️  Failed to load session cookies: ${error.message}`);
      }
    } else if (options.skipSession) {
      console.log('⏭️  Skipping session loading (testing Profile auto-login)');
    }
    
    // Set user agent
    await this.page.setUserAgent(this.options.userAgent);
    
    // Set viewport - smaller for full bottom visibility
    await this.page.setViewport({ width: 1280, height: 720 });
    
    // Set default timeout
    this.page.setDefaultTimeout(this.options.timeout);

    console.log(`✅ Browser ready with stealth measures active`);
  }

  /**
   * Inject stealth payload to hide automation detection
   * This runs BEFORE any navigation to be most effective
   */
  async _injectStealthPayload() {
    try {
      await this.page.evaluateOnNewDocument(() => {
        // Hide webdriver property (primary detection)
        Object.defineProperty(navigator, 'webdriver', {
          get: () => false,
        });
        
        // Hide chrome property
        window.chrome = {
          runtime: {}
        };
        
        // Override toString
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
          parameters.name === 'notifications' ?
            Promise.resolve({ state: Notification.permission }) :
            originalQuery(parameters)
        );
        
        // Hide headless mode
        Object.defineProperty(navigator, 'headless', {
          get: () => false,
        });
        
        // Override user-agent string
        Object.defineProperty(navigator, 'platform', {
          get: () => 'Win32',
        });
        
        // Remove headless indicator from user agent
        const userAgent = navigator.userAgent;
        Object.defineProperty(navigator, 'userAgent', {
          get: () => userAgent.replace('HeadlessChrome', 'Chrome'),
        });
        
        // Spoof plugins array
        const spoofdPlugins = [
          {
            name: 'Chrome PDF Plugin',
            filename: 'internal-pdf-viewer',
            description: 'Portable Document Format'
          },
          {
            name: 'Chrome PDF Viewer',
            filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai',
            description: ''
          }
        ];
        
        Object.defineProperty(navigator, 'plugins', {
          get: () => spoofdPlugins,
        });
        
        // Override languages
        Object.defineProperty(navigator, 'languages', {
          get: () => ['en-US', 'en'],
        });
        
        // Hide automation flag
        if (navigator.vendor === 'Google Inc.') {
          Object.defineProperty(navigator, 'vendor', {
            get: () => 'Google Inc.',
          });
        }
        
        // Prevent performance.timing detection
        const originalPerformanceNow = performance.now;
        performance.now = function() {
          return originalPerformanceNow.call(performance) + Math.random();
        };
        
        // Spoof screen dimensions to match viewport
        Object.defineProperty(screen, 'width', {
          get: () => 1280,
        });
        Object.defineProperty(screen, 'height', {
          get: () => 720,
        });
        
        // Remove phantom detection
        delete navigator.__proto__.webdriver;
        
        // Hide devtools warning banner and automation indicators
        // Override window.open to prevent banner detection
        const originalWindowOpen = window.open;
        window.open = new Proxy(originalWindowOpen, {
          apply(target, thisArg, args) {
            return Reflect.apply(target, thisArg, args);
          }
        });
        
        // Hide maxTouchPoints
        Object.defineProperty(navigator, 'maxTouchPoints', {
          get: () => 10,
        });
        
        // Override getOwnPropertyNames to hide automation detection vectors
        const hookPropertySetter = (object, property) => {
          const original = Object.getOwnPropertyDescriptor(object, property);
          Object.defineProperty(object, property, {
            ...original,
            value: original?.value || undefined,
          });
        };
        
        // Hide chrome.loadTimes detection
        if (window.chrome && window.chrome.loadTimes) {
          window.chrome.loadTimes = undefined;
        }
        
        // Hide chrome.csi detection
        if (window.chrome && window.chrome.csi) {
          window.chrome.csi = undefined;
        }
      });
      
      console.log('✅ Stealth payload injected (automation banner hidden)');
    } catch (error) {
      console.warn(`⚠️  Could not inject stealth payload: ${error.message}`);
    }
  }

  /**
   * Save current session cookies
   */
  async saveSession() {
    if (this.sessionManager && this.page) {
      try {
        await this.sessionManager.saveSession(this.page);
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
   * Get current page URL
   */
  async getUrl() {
    if (this.page) {
      return await this.page.url();
    }
    return null;
  }

  /**
   * Get page instance (for advanced operations)
   */
  getPage() {
    return this.page;
  }
}

export default BrowserService;
