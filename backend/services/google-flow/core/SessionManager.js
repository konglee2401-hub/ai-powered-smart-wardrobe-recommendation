/**
 * SessionManager - Handles browser session initialization, restoration, and navigation
 * 
 * Consolidated from:
 * - init() - Browser & page setup
 * - loadSession() - Load session file from disk
 * - restoreSessionBeforeNavigation() - Restore localStorage items
 * - navigateToFlow() - Navigate to Google Flow URL
 * - waitForPageReady() - Wait for essential page elements
 * - close() - Cleanup and browser closure
 * 
 * @example
 * const manager = new SessionManager(options);
 * await manager.init();
 * await manager.navigateToFlow();
 * await manager.close();
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';

puppeteer.use(StealthPlugin());

class SessionManager {
  constructor(options = {}) {
    this.browser = null;
    this.page = null;
    this.options = {
      headless: false,
      sessionFilePath: options.sessionFilePath || path.join(path.dirname(options.__dirname || process.cwd()), '../.sessions/google-flow-session-complete.json'),
      baseUrl: 'https://labs.google/fx/vi/tools/flow',
      projectId: options.projectId || '58d791d4-37c9-47a8-ae3b-816733bc3ec0',
      outputDir: options.outputDir || path.join(path.dirname(options.__dirname || process.cwd()), '../temp/outputs'),
      timeouts: {
        pageLoad: 60000,
        ...options.timeouts
      },
      ...options
    };
    
    this.sessionData = null;
  }

  /**
   * Initialize browser and page
   * Sets up Puppeteer browser, creates page with proper viewport,
   * loads session from disk, and navigates to Google Flow
   */
  async init() {
    console.log('🚀 Initializing Session Manager...\n');

    // Ensure outputDir exists
    if (!fs.existsSync(this.options.outputDir)) {
      fs.mkdirSync(this.options.outputDir, { recursive: true });
    }

    console.log(`   📁 Output directory: ${this.options.outputDir}\n`);

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

    // Load session and check token freshness
    await this.loadSession();
    
    console.log('✅ Session Manager initialized\n');
  }

  /**
   * Load session from disk
   * Loads cookies and localStorage items from saved session file
   * Filters third-party cookies to avoid interference
   */
  async loadSession() {
    try {
      if (fs.existsSync(this.options.sessionFilePath)) {
        const sessionData = JSON.parse(fs.readFileSync(this.options.sessionFilePath, 'utf8'));
        
        // Load only cookies from the current domain to avoid third-party cookie issues
        let loadedCount = 0;
        for (const cookie of (sessionData.cookies || [])) {
          try {
            // Only load cookies from labs.google domain or subdomains
            if (cookie.domain && (cookie.domain === 'labs.google' || cookie.domain === '.labs.google')) {
              await this.page.setCookie(cookie);
              loadedCount++;
            } else if (!cookie.domain) {
              await this.page.setCookie(cookie);
              loadedCount++;
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
      }
    } catch (e) {
      console.log('⚠️  Could not load session:', e.message);
      this.sessionData = null;
    }
  }

  /**
   * Restore localStorage items (but NOT reCAPTCHA tokens)
   * 
   * IMPORTANT: We do NOT restore _grecaptcha tokens because:
   * 1. These tokens sync to google.com cookie domain
   * 2. Google's own API rejects invalid/old tokens with 400 errors
   * 3. Real Chrome doesn't have these tokens in cookies
   * 4. Tokens are generated fresh during form submission
   */
  async restoreSessionBeforeNavigation() {
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
                console.warn(`Failed to set ${key}: ${setError.message}`);
              }
            }
          }

          return { itemsSet, success: true };
        } catch (e) {
          return { itemsSet: 0, success: false, error: e.message };
        }
      }, storageItems);

      console.log(`   ✅ ${result.itemsSet} localStorage items restored (reCAPTCHA tokens excluded)`);
      
      if (!result.success && result.error) {
        console.log(`   ⚠️  Note: localStorage access limited on this page (${result.error})`);
      }
      
    } catch (e) {
      console.log(`⚠️  Session restoration error: ${e.message}`);
    }
  }

  /**
   * Navigate to Google Flow URL
   * Waits for page to load and restores session data
   */
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
    
    console.log('✅ Google Flow loaded and logged in\n');
  }

  /**
   * Wait for page to load essential elements
   * Checks for buttons, file input, prompts, and main content
   */
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

  /**
   * Close browser and cleanup
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  /**
   * Get page instance for binding to utilities
   */
  getPage() {
    return this.page;
  }

  /**
   * Get browser instance for advanced operations
   */
  getBrowser() {
    return this.browser;
  }
}

export default SessionManager;
