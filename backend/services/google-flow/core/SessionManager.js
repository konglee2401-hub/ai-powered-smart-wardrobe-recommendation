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
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define Google Flow persistent profile directories
const GOOGLE_FLOW_PROFILE_BASE = path.join(path.dirname(path.dirname(path.dirname(__dirname))), 'data', 'google-flow-profiles');
const GOOGLE_FLOW_DEFAULT_SESSION = path.join(GOOGLE_FLOW_PROFILE_BASE, 'default', 'session.json');  // 💫 Shared across all flows

puppeteer.use(StealthPlugin());

class SessionManager {
  constructor(options = {}) {
    this.browser = null;
    this.page = null;
    
    // 🔐 Support flowId for flow-specific Chrome profile isolation
    // This prevents "profile locked by another process" errors when flows run in parallel
    const flowId = options.flowId || 'default';
    const profileDir = path.join(GOOGLE_FLOW_PROFILE_BASE, flowId);  // Per-flow Chrome profile dir
    
    this.flowId = flowId;
    this.profileDir = profileDir;
    
    this.options = {
      headless: false,
      userDataDir: profileDir,  // 💫 Use persistent Chrome profile for each flow
      sessionFilePath: options.sessionFilePath || GOOGLE_FLOW_DEFAULT_SESSION,  // 💫 Shared session file
      baseUrl: 'https://labs.google/fx/vi/tools/flow',
      projectId: options.projectId || '58d791d4-37c9-47a8-ae3b-816733bc3ec0',
      outputDir: options.outputDir || path.join(path.dirname(path.dirname(path.dirname(__dirname))), 'uploads/generated-images'),
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

    console.log(`   📁 Output directory: ${this.options.outputDir}`);
    console.log(`   📁 Chrome profile: ${this.options.userDataDir}\n`);

    const headlessMode = this.options.headless === true ? 'new' : this.options.headless;
    
    // 💫 Create Chrome preferences file to configure downloads
    const prefsPath = path.join(this.profileDir, 'Default', 'Preferences');
    const prefsDir = path.dirname(prefsPath);
    if (!fs.existsSync(prefsDir)) {
      fs.mkdirSync(prefsDir, { recursive: true });
    }
    
    let existingPrefs = {};
    if (fs.existsSync(prefsPath)) {
      try {
        existingPrefs = JSON.parse(fs.readFileSync(prefsPath, 'utf8'));
      } catch (e) {
        console.log(`   ⚠️  Could not parse existing prefs, will create new`);
      }
    }
    
    // Configure download preferences
    const updatedPrefs = {
      ...existingPrefs,
      profile: {
        ...(existingPrefs.profile || {}),
        managed_default_content_settings: {
          ...(existingPrefs.profile?.managed_default_content_settings || {}),
          downloads: 1  // 1 = allow, 0 = block
        }
      },
      download: {
        default_directory: this.options.outputDir,  // 💫 Download to project folder instead of Windows Downloads
        prompt_for_download: false,  // Don't show download prompt
        directory_upgrade: true
      },
      safebrowsing: {
        enabled: false  // Disable Safe Browsing warnings (prevents "virus scan failed" issues)
      }
    };
    
    fs.writeFileSync(prefsPath, JSON.stringify(updatedPrefs, null, 2), 'utf8');
    console.log(`   💾 Chrome prefs configured: downloads → ${this.options.outputDir}`);
    
    this.browser = await puppeteer.launch({
      headless: headlessMode,
      args: [
        `--user-data-dir=${this.options.userDataDir}`,  // ✅ Use persistent Chrome profile
        '--no-sandbox', 
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--disable-extensions'  // Disable extensions that might interfere with downloads
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
   */
  async loadSession() {
    try {
      if (fs.existsSync(this.options.sessionFilePath)) {
        const sessionData = JSON.parse(fs.readFileSync(this.options.sessionFilePath, 'utf8'));
        
        // Load cookies - apply ALL, let browser validate domains
        // Third-party cookie protection handled by browser SameSite policies
        let loadedCount = 0;
        let failedCount = 0;
        const failedDomains = [];
        
        for (const cookie of (sessionData.cookies || [])) {
          try {
            // Apply cookie - let Puppeteer/browser handle domain validation
            await this.page.setCookie(cookie);
            loadedCount++;
          } catch (e) {
            // Log failed domains for debugging
            failedCount++;
            if (cookie.domain && !failedDomains.includes(cookie.domain)) {
              failedDomains.push(cookie.domain);
            }
          }
        }
        
        console.log(`✅ Session cookies loaded (${loadedCount}/${(sessionData.cookies || []).length} cookies applied)`);
        if (failedCount > 0) {
          console.log(`   ℹ️  ${failedCount} cookies failed: domains=[${failedDomains.join(', ')}]`);
        }
        
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
      
      // Restore ONLY regular localStorage/sessionStorage items (not reCAPTCHA tokens)
      const storageItems = { ...this.sessionData.localStorage };
      const sessionStorageItems = { ...this.sessionData.sessionStorage };

      const result = await this.page.evaluate((storage, sessionStorage) => {
        try {
          let itemsSet = 0;
          let sessionItemsSet = 0;

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
          
          // Restore sessionStorage items
          for (const [key, value] of Object.entries(sessionStorage || {})) {
            if (value !== null && value !== undefined) {
              try {
                window.sessionStorage.setItem(key, value);
                sessionItemsSet++;
              } catch (setError) {
                console.warn(`Failed to set session ${key}: ${setError.message}`);
              }
            }
          }

          return { itemsSet, sessionItemsSet, success: true };
        } catch (e) {
          return { itemsSet: 0, sessionItemsSet: 0, success: false, error: e.message };
        }
      }, storageItems, sessionStorageItems);

      console.log(`   ✅ ${result.itemsSet} localStorage items restored`);
      if (result.sessionItemsSet > 0) {
        console.log(`   ✅ ${result.sessionItemsSet} sessionStorage items restored`);
      }
      
      if (!result.success && result.error) {
        console.log(`   ⚠️  Note: storage access limited on this page (${result.error})`);
      }
      
    } catch (e) {
      console.log(`⚠️  Session restoration error: ${e.message}`);
    }
  }

  /**
   * Navigate to Google Flow URL
   * Applies session cookies BEFORE navigation so page loads authenticated
   */
  async navigateToFlow() {
    const url = this.options.projectId
      ? `${this.options.baseUrl}/project/${this.options.projectId}`
      : this.options.baseUrl;

    console.log('🌐 Navigating to Google Flow...\n');
    console.log(`   Target URL: ${url}\n`);

    // 🔑 STEP 1: Apply cookies BEFORE navigation
    if (this.sessionData) {
      console.log('   ⏳ STEP 1: Applying cookies, localStorage, sessionStorage BEFORE navigation...');
      await this.restoreSessionBeforeNavigation();
      
      // Wait for cookies to settle
      console.log('\n   ⏳ STEP 2: Waiting for cookies to settle (2 seconds)...');
      for (let i = 2; i > 0; i--) {
        console.log(`      Waiting... ${i}s remaining`);
        await this.page.waitForTimeout(1000);
      }
    }

    // 🌐 STEP 2: Navigate - should load authenticated!
    console.log('\n   🌐 STEP 3: Page navigation in progress (cookies already applied)...');
    await this.page.goto(url, { waitUntil: 'networkidle2', timeout: this.options.timeouts.pageLoad });
    
    // ✅ Verify authentication after load
    console.log('\n   ✓ STEP 4: Verifying authentication after page load...');
    const isAuthed = await this.isAuthenticated();
    
    if (isAuthed) {
      console.log('   ✅ Successfully authenticated!\n');
    } else {
      console.log('   ⚠️  Authentication check inconclusive, page may still load\n');
    }

    // Wait for page elements
    console.log('   ⏳ STEP 5: Waiting for page elements...');
    await this.waitForPageReady();
    
    console.log('✅ Google Flow loaded\n');
  }

  /**
   * Wait for page to load essential elements
   * Checks for buttons, file input, prompts, and main content
   */
  async waitForPageReady() {
    console.log('⏳ Waiting for page elements to load...');
    let pageReady = false;
    let attempts = 0;
    const maxAttempts = 20;  // Increased from 15 attempts (20 seconds total)

    while (!pageReady && attempts < maxAttempts) {
      attempts++;
      try {
        const elements = await this.page.evaluate(() => {
          const buttons = document.querySelectorAll('button');
          const visibleButtons = Array.from(buttons).filter(btn => {
            const style = window.getComputedStyle(btn);
            return style.display !== 'none' && style.visibility !== 'hidden' && btn.offsetHeight > 0;
          });
          
          // More flexible input detection
          const hasFileInput = !!document.querySelector('input[type="file"]');
          const hasTextInput = !!document.querySelector('input[type="text"], textarea, [contenteditable="true"]');
          const prompts = document.querySelectorAll('[contenteditable="true"], input[type="text"], textarea');
          
          // Check for main content areas
          const hasMainContent = !!document.querySelector('[data-testid="virtuoso-item-list"]') ||
                                !!document.querySelector('.grid') ||
                                !!document.querySelector('[role="main"]') ||
                                !!document.querySelector('main') ||
                                !!document.querySelector('[class*="content"]') ||
                                !!document.querySelector('[class*="editor"]');
          
          // Check for flow-specific elements
          const hasFlowUI = !!document.querySelector('[class*="flow"]') ||
                           !!document.querySelector('[data-testid*="flow"]') ||
                           !!Array.from(document.querySelectorAll('*')).find(el => el.textContent?.includes('Prompt'));
          
          return { 
            buttons: buttons.length, 
            visible: visibleButtons.length, 
            fileInput: hasFileInput,
            textInput: hasTextInput,
            prompts: prompts.length,
            mainContent: hasMainContent,
            flowUI: hasFlowUI,
            documentReady: document.readyState,
            bodyChildren: document.body.children.length
          };
        });

        // Strict: All elements present
        const strictReady = elements.visible > 8 && (elements.fileInput || elements.textInput) && elements.prompts > 0;
        // Flexible: Main content + buttons
        const flexibleReady = elements.visible > 8 && (elements.mainContent || elements.flowUI);
        // Minimal: Just need visible buttons + document ready
        const minimalReady = elements.visible > 8 && elements.documentReady === 'complete' && elements.bodyChildren > 10;
        
        pageReady = strictReady || flexibleReady || minimalReady;

        if (!pageReady) {
          if (attempts <= 3 || attempts % 5 === 0) {
            console.log(`   🔍 Attempt ${attempts}/${maxAttempts}:`);
            console.log(`      Buttons: ${elements.buttons} (visible: ${elements.visible})`);
            console.log(`      Inputs: file=${elements.fileInput}, text=${elements.textInput}, prompts=${elements.prompts}`);
            console.log(`      Content: main=${elements.mainContent}, flowUI=${elements.flowUI}`);
            console.log(`      Document: ${elements.documentReady}, body children: ${elements.bodyChildren}`);
          }
          await this.page.waitForTimeout(1000);
        } else {
          console.log(`   ✅ Page ready (attempt ${attempts}): strict=${strictReady}, flexible=${flexibleReady}, minimal=${minimalReady}\n`);
        }
      } catch (e) {
        console.log(`   ⚠️  Error: ${e.message}`);
        await this.page.waitForTimeout(1000);
      }
    }

    if (!pageReady) {
      // Don't throw - just warn and continue (page might still work)
      console.log(`   ⚠️  Page elements not fully ready after ${maxAttempts} attempts\n`);
      console.log(`   💡 Continuing anyway - page might still be functional\n`);
    } else {
      console.log(`   ✅ Page ready (attempt ${attempts})\n`);
    }
  }

  /**
   * Capture and save session before closing
   * Saves cookies, localStorage, and sessionStorage to file
   * Ensures next run can restore authentication without re-login
   */
  async captureAndSaveSession() {
    if (!this.page) return false;
    
    try {
      console.log('📸 Capturing session before closing...');
      
      // Get current cookies
      const cookies = await this.page.cookies();
      
      // Get localStorage
      const localStorage = await this.page.evaluate(() => {
        const items = {};
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          items[key] = window.localStorage.getItem(key);
        }
        return items;
      });
      
      // Get sessionStorage
      const sessionStorage = await this.page.evaluate(() => {
        const items = {};
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const key = window.sessionStorage.key(i);
          items[key] = window.sessionStorage.getItem(key);
        }
        return items;
      });
      
      const sessionData = {
        cookies,
        localStorage,
        sessionStorage,
        timestamp: new Date().toISOString(),
        url: this.page.url(),
        isAuthenticated: await this.isAuthenticated()
      };
      
      // 💾 Ensure session directory exists before saving
      const sessionDir = path.dirname(this.options.sessionFilePath);
      if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
        console.log(`   📁 Created session directory: ${sessionDir}`);
      }
      
      // 💾 Save to shared session file
      fs.writeFileSync(this.options.sessionFilePath, JSON.stringify(sessionData, null, 2));
      
      console.log('   ✅ Session captured and saved');
      console.log(`      - Cookies: ${cookies.length}`);
      console.log(`      - LocalStorage items: ${Object.keys(localStorage).length}`);
      console.log(`      - SessionStorage items: ${Object.keys(sessionStorage).length}`);
      console.log(`      - Authenticated: ${sessionData.isAuthenticated ? '✅' : '❌'}`);
      console.log(`      - Saved to: ${this.options.sessionFilePath}`);
      
      return true;
    } catch (error) {
      console.warn(`⚠️  Failed to capture session: ${error.message}`);
      return false;
    }
  }

  /**
   * Check if page is authenticated - comprehensive check
   */
  async isAuthenticated() {
    try {
      const isAuthed = await this.page.evaluate(() => {
        // Multiple authentication indicators
        // 1. Check for main content area (virtuoso list or main role)
        const hasMainContent = !!document.querySelector('[data-testid="virtuoso-item-list"]') ||
                              !!document.querySelector('[role="main"]') ||
                              !!document.querySelector('main');
        
        // 2. Check for logout/account buttons
        const hasLogoutButton = !!Array.from(document.querySelectorAll('button')).find(b => 
          b.getAttribute('aria-label')?.includes('Sign out') || 
          b.getAttribute('aria-label')?.includes('account') ||
          b.textContent?.includes('account')
        );
        
        // 3. Check for user profile indicator
        const hasProfileIndicator = !!document.querySelector('[data-testid="user-avatar"]') ||
                                   !!document.querySelector('[role="img"][alt*="profile"]') ||
                                   !!document.querySelector('[aria-label*="profile"]');
        
        // 4. Check if we can find project-related content
        const hasProjectContent = !!document.querySelector('[data-testid*="project"]') ||
                                 !!document.querySelector('[data-testid*="flow"]') ||
                                 !!Array.from(document.querySelectorAll('h1, h2')).find(h => 
                                   h.textContent?.includes('Flow') || h.textContent?.includes('Project')
                                 );
        
        // 5. Check page title and URL context
        const isFlowPage = document.title?.includes('Flow') || window.location.href?.includes('/flow');
        
        return isFlowPage && (hasMainContent || hasLogoutButton || hasProfileIndicator || hasProjectContent);
      });
      return isAuthed;
    } catch (e) {
      console.log(`   ⚠️  Authentication check error: ${e.message}`);
      return false;
    }
  }

  /**
   * Close browser and cleanup
   * Automatically captures and saves session before closing
   */
  async close() {
    try {
      // Capture + save session BEFORE closing browser
      await this.captureAndSaveSession();
      
      // Then close browser
      if (this.browser) {
        await this.browser.close();
      }
      
      console.log('✅ Google Flow browser closed with session saved');
    } catch (error) {
      console.error(`❌ Error during close: ${error.message}`);
      // Still try to close browser even if session capture fails
      try {
        if (this.browser) {
          await this.browser.close();
        }
      } catch (e) {
        console.error(`❌ Failed to close browser: ${e.message}`);
      }
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
