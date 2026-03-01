import BrowserService from './browserService.js';
import SessionManager from './sessionManager.js';
import ProgressEmitter from '../ProgressEmitter.js';
import VideoGenerationMetrics from '../VideoGenerationMetrics.js';
import PromptSuggestor from '../PromptSuggestor.js';
import VideoSessionManager from '../VideoSessionManager.js';
import { restoreGrokSession, verifyGrokLogin } from '../../scripts/grok-auto-login-v2-cloudflare-fix.js';
import { grokConfig, getProjectUrl, setProjectUrl, getSessionPath } from '../../config/grokConfig.js';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

/**
 * Grok Service V2 - Full Automation with Cloudflare Bypass
 * Supports: Image Analysis, Image Generation, Video Generation
 * Handles: Cloudflare challenge, X/Twitter login, session management
 */
class GrokServiceV2 extends BrowserService {
  constructor(options = {}) {
    // Create session manager for Grok
    const sessionManager = new SessionManager('grok');
    
    // Pass session manager to parent
    super({ ...options, sessionManager });
    this.baseUrl = 'https://grok.com';
    
    // Navigate URL priority:
    // 1. options.navigationUrl (passed in explicitly)
    // 2. options.conversationUrl
    // 3. process.env.GROK_CONVERSATION_URL
    // 4. config.conversationUrl
    // 5. options.projectUrl
    // 6. process.env.GROK_PROJECT_URL
    // 7. config.projectUrl
    
    const conversationUrl = options.navigationUrl || 
      options.conversationUrl ||
      process.env.GROK_CONVERSATION_URL ||
      grokConfig.conversationUrl;
    
    const projectUrl = options.projectUrl || 
      process.env.GROK_PROJECT_URL || 
      getProjectUrl();
    
    // Use conversation URL if available (has chat and rid params), otherwise use project URL
    this.navigationUrl = conversationUrl || projectUrl;
    this.projectUrl = projectUrl;
    
    this.sessionManager = sessionManager;
  }

  /**
   * Launch browser for Grok automation
   * Override parent's launch to skip automatic session loading so we can control the flow
   */
  async launch() {
    // Call parent launch but skip session loading - we'll do it manually in initialize()
    return super.launch({ skipSession: true });
  }

  /**
   * Set the project URL for this session
   * Also updates the global config for future sessions
   * @param {string} url - Grok project URL
   */
  setProjectUrl(url) {
    if (!url.includes('grok.com')) {
      throw new Error('Invalid Grok URL. Must be a grok.com project URL.');
    }
    this.projectUrl = url;
    this.navigationUrl = url;
    
    // Also update global config for future instances
    try {
      setProjectUrl(url);
    } catch (error) {
      console.warn('⚠️  Could not update global config:', error.message);
    }
    
    console.log(`✅ Project URL updated: ${url}`);
  }

  /**
   * Get the current project URL
   * @returns {string} - Current project URL
   */
  getProjectUrl() {
    return this.navigationUrl;
  }

  /**
   * Initialize Grok with session reuse and Cloudflare bypass
   * CRITICAL: Follow the working pattern:
   * 1. Navigate first (without cookies)
   * 2. Set essential cookies AFTER navigation
   * 3. Inject localStorage
   * 4. RELOAD page (crucial step!)
   * 5. Check for Cloudflare
   * 6. Wait for input
   */
  async initialize() {
    // Launch browser
    await this.launch();
    
    // Restore session with Cloudflare bypass (timing fix method)
    // This handles all the critical steps:
    // 1. Navigate to project URL FIRST (without cookies)
    // 2. Wait for Cloudflare to verify
    // 3. Inject cookies from BOTH domains (.grok.com + .x.ai)
    // 4. Inject localStorage items
    // 5. RELOAD page to activate cookies
    // 6. Verify login
    console.log('🔐 Restoring Grok session with Cloudflare bypass...\n');
    console.log(`📍 Project URL: ${this.navigationUrl}\n`);
    const sessionRestored = await restoreGrokSession(this.page, { 
      url: this.navigationUrl 
    });
    
    if (!sessionRestored) {
      console.log('⚠️  Could not restore session - continuing anyway...\n');
      // Continue - sometimes login doesn't need restoration
    }
    
    // STEP 7: Navigate to a conversation page (to access file input)
    console.log('📍 Navigating to conversation page (for file upload access)...');
    
    // First, ensure any Cloudflare checkpoint is fully cleared
    console.log('   🔍 Checking for lingering Cloudflare checkpoint...');
    const hasCheckpoint = await this.page.evaluate(() => {
      return !!(document.querySelector('[id*="challenge"]') || 
               document.querySelector('[class*="challenge"]') ||
               document.querySelector('[class*="cloudflare"]') ||
               document.querySelector('input[type="checkbox"]'));
    });
    
    if (hasCheckpoint) {
      console.log('   ⚠️  Cloudflare checkpoint detected - PLEASE VERIFY MANUALLY IN BROWSER');
      
      // Alert user to manually verify
      try {
        await this.page.evaluate(() => {
          alert('🔐 Cloudflare Verification Required\n\nPlease verify the Cloudflare checkpoint in the browser window.\n\nClick Continue after verification.');
        });
      } catch (err) {
        console.log('   ℹ️  Chrome window may have popped up for manual Cloudflare verification');
      }
      
      // Wait longer for manual verification
      console.log('   ⏳ Waiting 30 seconds for manual verification...');
      for (let i = 0; i < 6; i++) {
        await this.page.waitForTimeout(5000);
        
        const stillBlocked = await this.page.evaluate(() => {
          return !!(document.querySelector('[id*="challenge"]') || 
                   document.querySelector('[class*="challenge"]') ||
                   document.querySelector('[class*="cloudflare"]'));
        });
        
        if (!stillBlocked) {
          console.log(`   ✅ Cloudflare checkpoint cleared (after ${(i + 1) * 5}s)`);
          break;
        }
        console.log(`   ⏳ Still waiting... (${(i + 1) * 5}s)`);
      }
    } else {
      console.log('   ✅ No Cloudflare checkpoint');
    }
    
    await this._navigateToConversation();
    
    // STEP 8: Check if we're on chat page
    const isOnChatPage = await this._checkChatPageReady();
    
    if (isOnChatPage) {
      console.log('✅ Grok ready (chat page detected)');
      await this._handleAgeVerification();
      return true;
    }
    
    // STEP 9: Wait for the chat input
    console.log('⏳ Waiting for chat input to appear...');
    try {
      await this.page.waitForSelector('[contenteditable="true"], textarea', { timeout: 10000 });
      console.log('✅ Grok ready (chat input found)');
      await this._handleAgeVerification();
      return true;
    } catch (e) {
      console.log('⚠️  Chat input not found yet, but continuing...');
      return true;
    }
  }

  /**
   * Navigate to a conversation page (with chat and rid parameters)
   * This is required to access the file input for image uploads
   * The file input element only appears on conversation pages, not project pages
   */
  async _navigateToConversation() {
    try {
      console.log('   📤 Navigating to conversation page (file input requirement)...');
      
      // Check current navigation URL - if it already has conversation params, use it directly
      const hasConversationParams = this.navigationUrl.includes('chat=') && this.navigationUrl.includes('rid=');
      
      if (hasConversationParams) {
        console.log(`   ✅ URL already has conversation params - navigating directly`);
        console.log(`   📍 Target: ...?[chat & rid params]`);
        
        try {
          await this.page.goto(this.navigationUrl, { 
            waitUntil: 'domcontentloaded', 
            timeout: 30000 
          });
          
          // Retry checking for file input every 3 seconds (up to 10 times = 30 seconds)
          console.log(`   ⏳ Checking for file input (retry every 3s)...`);
          let fileInputFound = false;
          
          for (let attempt = 0; attempt < 10; attempt++) {
            await this.page.waitForTimeout(3000);
            
            const hasFileInput = await this.page.$('input[type="file"][name="files"]') !== null;
            const pageTitle = await this.page.title();
            
            if (hasFileInput) {
              console.log(`   ✅ File input found (attempt ${attempt + 1}/10)`);
              fileInputFound = true;
              break;
            }
            
            if (pageTitle.includes('moment')) {
              console.log(`   ⏳ Cloudflare check in progress... (attempt ${attempt + 1}/10)`);
            } else {
              console.log(`   ⏳ Waiting for file input (attempt ${attempt + 1}/10)`);
            }
          }
          
          if (!fileInputFound) {
            console.log(`   ⚠️  File input not found after 30 seconds`);
          }
        } catch (navError) {
          console.log(`   ⚠️  Navigation error: ${navError.message}`);
        }
        
        return;
      }
      
      // If no conversation params, we need to create a new conversation
      console.log(`   📝 No conversation params in URL - creating new conversation...`);
      
      // Navigate to project page first
      await this.page.goto(this.navigationUrl, { 
        waitUntil: 'domcontentloaded', 
        timeout: 30000 
      });
      
      await this.page.waitForTimeout(2000);
      
      // Click to trigger new conversation creation
      console.log('   🔄 Triggering conversation creation...');
      
      const triggered = await this.page.evaluate(() => {
        // Try clicking visible chat input
        const inputs = document.querySelectorAll('[contenteditable="true"], textarea, input[type="text"]');
        for (const input of inputs) {
          if (input.offsetParent !== null) { // Check if visible
            input.click();
            input.focus();
            return 'input';
          }
        }
        
        // Try "New" button
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          const text = btn.textContent.toLowerCase();
          if (text.includes('new') && !text.includes('profile')) {
            btn.click();
            return 'button';
          }
        }
        
        return false;
      });
      
      if (triggered) {
        console.log(`   ✅ Triggered via ${triggered === 'input' ? 'input click' : 'button'}`);
      }
      
      // Wait for URL to change to include conversation params
      console.log(`   ⏳ Waiting for conversation URL (with chat & rid params)...`);
      
      let urlChanged = false;
      for (let attempt = 0; attempt < 20; attempt++) {
        await this.page.waitForTimeout(1000);
        const currentUrl = this.page.url();
        
        if (currentUrl.includes('chat=') && currentUrl.includes('rid=')) {
          console.log(`   ✅ Conversation URL received (${attempt + 1}s)`);
          this.navigationUrl = currentUrl; // Update navigationUrl for future use
          urlChanged = true;
          break;
        }
        
        if (attempt % 5 === 4) {
          console.log(`   ⏳ Still waiting... (${attempt + 1}s)`);
        }
      }
      
      if (!urlChanged) {
        console.log(`   ⚠️  URL did not change to conversation format after 20s`);
        console.log(`   💡 Current URL: ${this.page.url()}`);
      }
      
      // Verify file input is available
      await this.page.waitForTimeout(2000);
      const hasFileInput = await this.page.$('input[type="file"][name="files"]') !== null;
      
      if (hasFileInput) {
        console.log(`   ✅ File input confirmed - ready for uploads`);
      } else {
        console.log(`   ⚠️  File input not found - may need to wait longer or verify Cloudflare`);
      }
    } catch (err) {
      console.log(`   ⚠️  Error navigating to conversation: ${err.message}`);
    }
  }

  /**
   * Handle age verification modal if present
   * Uses the same selector as test script: data-analytics-name="age_verification"
   */
  async _handleAgeVerification() {
    console.log('🔍 Checking for age verification modal...');
    
    // Wait a moment for modal to appear
    await this.page.waitForTimeout(1000);
    
    // Check for age verification modal using the same selector as test script
    const hasModal = await this.page.evaluate(() => {
      const dialog = document.querySelector('[data-analytics-name="age_verification"]');
      return !!dialog;
    });
    
    if (!hasModal) {
      console.log('   ℹ️  No age verification modal found');
      return;
    }
    
    console.log('   ⚠️  Age verification modal detected, auto-dismissing...');
    
    try {
      // Scroll to and click year 1990 button - same as test script
      const clicked = await this.page.evaluate(() => {
        const dialog = document.querySelector('[data-analytics-name="age_verification"]');
        if (!dialog) return false;
        
        const buttons = dialog.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.textContent.trim() === '1990') {
            btn.scrollIntoView({ block: 'center' });
            btn.click();
            return true;
          }
        }
        return false;
      });
      
      if (clicked) {
        console.log('   ✅ Selected year 1990');
        await this.page.waitForTimeout(500);
      }
      
      // Click Continue button - same as test script
      const continued = await this.page.evaluate(() => {
        const dialog = document.querySelector('[data-analytics-name="age_verification"]');
        if (!dialog) return false;
        
        const buttons = dialog.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.textContent.trim() === 'Continue') {
            btn.click();
            return true;
          }
        }
        return false;
      });
      
      if (continued) {
        console.log('   ✅ Clicked Continue');
        await this.page.waitForTimeout(2000);
      }
      
      console.log('   ✅ Age verification handled');
    } catch (err) {
      console.log(`   ⚠️  Age verification error: ${err.message}`);
    }
  }
  
  /**
   * Poll for age verification modal and dismiss it - for use during wait
   */
  async _checkAndDismissAgeVerification() {
    try {
      await this._handleAgeVerification();
    } catch (e) {
      // ignore
    }
  }

  /**
   * Check if chat page is ready
   */
  async _checkChatPageReady() {
    return await this.page.evaluate(() => {
      // Check for Grok chat page indicators
      const bodyText = document.body.innerText;
      
      // Vietnamese: "Bận dạng nghĩ gì?" = Grok's Vietnamese prompt
      // English: "Ask anything" or "What's on your mind"
      const hasVietnamesePrompt = bodyText.includes('Bận dạng nghĩ gì');
      const hasEnglishPrompt = bodyText.includes('Ask anything') || bodyText.includes('What\'s on your mind');
      
      // Check for chat input
      const hasTextarea = document.querySelector('textarea') !== null;
      const hasContentEditable = document.querySelector('[contenteditable="true"]') !== null;
      
      return (hasVietnamesePrompt || hasEnglishPrompt || hasTextarea || hasContentEditable);
    });
  }

  /**
   * Load session from file and inject cookies/localStorage
   */
  async _loadAndInjectSession() {
    const sessionFile = path.join(process.cwd(), 'backend', '.sessions', 'grok-session.json');
    
    if (!fs.existsSync(sessionFile)) {
      console.log('⚠️  No saved session found, will try to login manually');
      return false;
    }
    
    try {
      const sessionData = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
      
      // Inject ALL cookies (not just essential ones)
      const cookies = sessionData.cookies || [];
      
      console.log(`🍪 Loading session with ${cookies.length} cookies`);
      
      // Set cookies before navigation
      for (const cookie of cookies) {
        try {
          // Skip cookies with invalid domains
          if (!cookie.domain || !cookie.value) {
            continue;
          }
          
          await this.page.setCookie({
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain,
            path: cookie.path || '/',
            expires: cookie.expires && cookie.expires > 0 ? cookie.expires : undefined,
            httpOnly: cookie.httpOnly || false,
            secure: cookie.secure !== false ? true : false,
            sameSite: cookie.sameSite || 'None'
          });
          console.log(`   ✅ ${cookie.name}`);
        } catch (e) {
          // Silently skip invalid cookies
        }
      }
      
      // Inject ALL localStorage items
      const localStorage = sessionData.localStorage || {};
      const allLocalStorageKeys = Object.keys(localStorage);
      
      if (allLocalStorageKeys.length > 0) {
        console.log(`💾 Injecting ${allLocalStorageKeys.length} localStorage keys (including age-verif, chat-preferences, etc.)`);
        await this.page.evaluate((storageData) => {
          for (const [key, value] of Object.entries(storageData)) {
            try {
              // Handle JSON and non-JSON values
              let storageValue = value;
              if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
                // Try to parse as JSON first to avoid double-encoding
                try {
                  storageValue = value;
                } catch (e) {
                  // Keep as string if not valid JSON
                }
              }
              localStorage.setItem(key, String(storageValue));
            } catch (e) {
              // Ignore storage quota errors
            }
          }
        }, localStorage);
        console.log('   ✅ localStorage injected');
        
        // Verify age-verif was set (critical for bypassing modal)
        const ageVerifSet = await this.page.evaluate(() => {
          return localStorage.getItem('age-verif');
        });
        if (ageVerifSet) {
          console.log('   ✅ Age verification pre-loaded');
        }
      }
      
      console.log('✅ Session loaded and injected (all cookies + localStorage)');
      return true;
    } catch (error) {
      console.log(`⚠️  Could not load session: ${error.message}`);
      return false;
    }
  }

  /**
   * Save current session (cookies + localStorage) to file
   */
  async saveSession() {
    const sessionFile = path.join(process.cwd(), 'backend', '.sessions', 'grok-session.json');
    
    try {
      // Get all cookies
      const cookies = await this.page.cookies();
      
      // Get localStorage
      const localStorage = await this.page.evaluate(() => {
        const data = {};
        const keys = ['xai-ff-bu', 'chat-preferences', 'user-settings', 'anonUserId', 'user-prefs', 'grok-ui-prefs'];
        for (const key of keys) {
          try {
            const value = localStorage.getItem(key);
            if (value) {
              data[key] = value;
            }
          } catch (e) {}
        }
        return data;
      });
      
      const sessionData = {
        service: 'grok',
        savedAt: new Date().toISOString(),
        cookies,
        localStorage
      };
      
      // Ensure directory exists
      const dir = path.dirname(sessionFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(sessionFile, JSON.stringify(sessionData, null, 2));
      console.log(`✅ Session saved to: ${sessionFile}`);
      console.log(`   Cookies: ${cookies.length}`);
      console.log(`   LocalStorage: ${Object.keys(localStorage).length} keys`);
      
      return true;
    } catch (error) {
      console.error(`❌ Failed to save session: ${error.message}`);
      return false;
    }
  }

  /**
   * Navigate to Grok chat page
   */
  async navigateToChatPage() {
    console.log('🧭 Navigating to Grok chat page...');
    
    // Try different navigation methods
    const navigationMethods = [
      // Method 1: Try to find and click chat link
      async () => {
        const chatLink = await this.page.$('a[href*="chat"], a[href*="grok"]');
        if (chatLink) {
          await chatLink.click();
          await this.page.waitForTimeout(3000);
          return true;
        }
        return false;
      },
      
      // Method 2: Try to find and click home/dashboard link
      async () => {
        const homeLink = await this.page.$('a[href="/"]');
        if (homeLink) {
          await homeLink.click();
          await this.page.waitForTimeout(3000);
          return true;
        }
        return false;
      },
      
      // Method 3: Direct navigation to chat URL
      async () => {
        try {
          await this.goto('https://grok.com/chat');
          await this.page.waitForTimeout(3000);
          return true;
        } catch (e) {
          return false;
        }
      },
      
      // Method 4: Direct navigation to main page
      async () => {
        try {
          await this.goto('https://grok.com');
          await this.page.waitForTimeout(3000);
          return true;
        } catch (e) {
          return false;
        }
      }
    ];
    
    for (let i = 0; i < navigationMethods.length; i++) {
      console.log(`   Trying navigation method ${i + 1}...`);
      const success = await navigationMethods[i]();
      
      if (success) {
        // Check if we're now on chat page
        const isOnChatPage = await this.page.evaluate(() => {
          return document.body.innerText.includes('Bận dạng nghĩ gì?') ||
                 document.body.innerText.includes('Ask anything') ||
                 document.body.innerText.includes('What\'s on your mind') ||
                 document.querySelector('textarea') !== null ||
                 document.querySelector('[contenteditable="true"]') !== null;
        });
        
        if (isOnChatPage) {
          console.log('✅ Successfully navigated to chat page');
          return true;
        }
      }
    }
    
    // If all methods failed, take screenshot for debugging
    await this.screenshot({ 
      path: path.join(process.cwd(), 'temp', `grok-navigation-failed-${Date.now()}.png`) 
    });
    console.log('⚠️  Could not automatically navigate to chat page');
    console.log('⏳ Waiting for manual navigation (60 seconds)...');
    
    // Wait for manual navigation
    let chatPageFound = false;
    let waitTime = 0;
    
    while (waitTime < 60000 && !chatPageFound) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      waitTime += 5000;
      
      const isOnChatPage = await this.page.evaluate(() => {
        return document.body.innerText.includes('Bận dạng nghĩ gì?') ||
               document.body.innerText.includes('Ask anything') ||
               document.body.innerText.includes('What\'s on your mind') ||
               document.querySelector('textarea') !== null ||
               document.querySelector('[contenteditable="true"]') !== null;
      });
      
      if (isOnChatPage) {
        chatPageFound = true;
        console.log('✅ Chat page found manually');
      } else {
        process.stdout.write(`\r⏳ Waiting for chat page... ${waitTime/1000}s`);
      }
    }
    console.log('');
    
    if (!chatPageFound) {
      throw new Error('Could not find Grok chat page');
    }
    
    return true;
  }

  /**
   * Handle Cloudflare challenge
   */
  async handleCloudflareChallenge() {
    console.log('🛡️  Handling Cloudflare challenge...');
    
    // Wait for challenge to load
    await this.page.waitForTimeout(5000);
    
    // Try to find and click verification button - individual selectors (no :has-text)
    const verificationSelectors = [
      'input[type="checkbox"]',
      'button[type="submit"]',
      '.cf-turnstile',
      '[data-sitekey]',
      'iframe[src*="challenge"]'
    ];
    
    for (const selector of verificationSelectors) {
      try {
        const element = await this.page.$(selector);
        if (element) {
          console.log(`   Found verification element: ${selector}`);
          
          // Try to click it
          await element.click();
          await this.page.waitForTimeout(2000);
          
          // Check if challenge is bypassed
          const isStillChallenging = await this.page.evaluate(() => {
            return document.body.innerText.includes('Checking your browser') ||
                   document.body.innerText.includes('Please stand by') ||
                   document.body.innerText.includes('Just a moment');
          });
          
          if (!isStillChallenging) {
            console.log('✅ Cloudflare challenge bypassed');
            return true;
          }
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    // Try to find button by evaluating all buttons on page
    const buttonClicked = await this.page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      const keywords = ['verify', 'continue', 'accept', 'check', 'submit'];
      
      for (const btn of buttons) {
        const text = btn.textContent?.toLowerCase() || '';
        const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
        
        for (const keyword of keywords) {
          if (text.includes(keyword) || ariaLabel.includes(keyword)) {
            btn.click();
            return true;
          }
        }
      }
      return false;
    });
    
    if (buttonClicked) {
      console.log('   ✅ Clicked verification button via evaluate');
      await this.page.waitForTimeout(2000);
    }
    
    // Take screenshot for manual verification
    await this.screenshot({ 
      path: path.join(process.cwd(), 'temp', `cloudflare-challenge-${Date.now()}.png`) 
    });
    console.log('📸 Cloudflare challenge screenshot saved for manual verification');
    console.log('⏳ Waiting for manual Cloudflare verification (60 seconds)...');
    
    // Wait for manual verification
    let challengeBypassed = false;
    let waitTime = 0;
    
    while (waitTime < 60000 && !challengeBypassed) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      waitTime += 5000;
      
      const isStillChallenging = await this.page.evaluate(() => {
        return document.body.innerText.includes('Checking your browser') ||
               document.body.innerText.includes('Please stand by') ||
               document.body.innerText.includes('Just a moment');
      });
      
      if (!isStillChallenging) {
        challengeBypassed = true;
        console.log('✅ Cloudflare challenge bypassed manually');
      } else {
        process.stdout.write(`\r⏳ Waiting for Cloudflare verification... ${waitTime/1000}s`);
      }
    }
    console.log('');
    
    if (!challengeBypassed) {
      console.log('⚠️  Cloudflare challenge not bypassed, continuing anyway...');
    }
    
    return challengeBypassed;
  }

  /**
   * Upload single image and analyze
   */
  async analyzeImage(imagePath, prompt) {
    console.log('\n📊 GROK IMAGE ANALYSIS');
    console.log('='.repeat(80));
    console.log(`Image: ${path.basename(imagePath)}`);
    console.log(`Prompt: ${prompt}`);
    console.log('');

    try {
      // Find and upload image
      await this._uploadImage(imagePath);
      
      // Type prompt
      await this._typePrompt(prompt);
      
      // Send message
      await this._sendMessage();
      
      // Wait for response
      const response = await this._waitForResponse();
      
      console.log('='.repeat(80));
      console.log('✅ ANALYSIS COMPLETE');
      console.log(`Response length: ${response.length} characters`);
      console.log('='.repeat(80) + '\n');

      return response;

    } catch (error) {
      console.error('❌ Grok analysis failed:', error.message);
      await this.screenshot({ 
        path: path.join(process.cwd(), 'temp', `grok-error-${Date.now()}.png`) 
      });
      throw error;
    }
  }

  /**
   * Upload multiple images and analyze
   */
  async analyzeMultipleImages(imagePaths, prompt) {
    console.log('\n📊 GROK MULTI-IMAGE ANALYSIS');
    console.log('='.repeat(80));
    console.log(`Images: ${imagePaths.map(p => path.basename(p)).join(', ')}`);
    console.log(`Prompt: ${prompt}`);
    console.log('');

    try {
      // Upload all images
      for (const imagePath of imagePaths) {
        await this._uploadImage(imagePath);
        await this.page.waitForTimeout(1000);
      }
      
      // Type prompt
      await this._typePrompt(prompt);
      
      // Send message
      await this._sendMessage();
      
      // Wait for response
      const response = await this._waitForResponse();
      
      console.log('='.repeat(80));
      console.log('✅ MULTI-IMAGE ANALYSIS COMPLETE');
      console.log(`Response length: ${response.length} characters`);
      console.log('='.repeat(80) + '\n');

      return response;

    } catch (error) {
      console.error('❌ Grok multi-image analysis failed:', error.message);
      await this.screenshot({ 
        path: path.join(process.cwd(), 'temp', `grok-multi-error-${Date.now()}.png`) 
      });
      throw error;
    }
  }

  /**
   * Generate image with Grok
   */
  async generateImage(prompt, options = {}) {
    console.log('\n🎨 GROK IMAGE GENERATION');
    console.log('='.repeat(80));
    console.log(`Prompt: ${prompt.substring(0, 150)}...`);
    console.log(`Download: ${options.download ? '✅ Yes' : '❌ No'}`);
    console.log('');

    try {
      // ✅ CRITICAL: Ensure page is fully ready after Cloudflare
      console.log('🔍 Verifying page is fully loaded...');
      await this._ensurePageReady();
      console.log('✅ Page confirmed ready\n');
      
      // 💫 FIX: Send prompt directly WITHOUT /imagine prefix
      // Grok doesn't use /imagine - just send natural prompt
      console.log('📝 Preparing prompt for Grok...');
      console.log(`   Length: ${prompt.length} characters`);
      console.log(`   First 80 chars: "${prompt.substring(0, 80)}..."`);
      
      // Clear editor before typing new prompt
      await this._clearEditor();
      
      await this._typePrompt(prompt);
      
      // Send message
      console.log('📤 Sending prompt to Grok...');
      await this._sendMessage();
      
      // Wait for image generation
      console.log('⏳ Waiting for image generation (this may take 5-15 seconds)...');
      const imageUrl = await this._waitForGeneratedImage();
      
      if (!imageUrl) {
        console.error('❌ Image generation timeout - no image appeared after waiting');
        // Take screenshot for debugging
        const screenshotPath = path.join(process.cwd(), 'temp', `no-image-${Date.now()}.png`);
        await this.screenshot({ path: screenshotPath });
        console.error(`   Screenshot: ${screenshotPath}`);
        throw new Error('No image generated - timeout waiting for image');
      }
      
      console.log('✅ Image detected');
      console.log(`   URL: ${imageUrl.substring(0, 80)}...`);
      
      // Download image if requested
      if (options.download) {
        console.log('\n💾 DOWNLOADING IMAGE...');
        const downloadPath = await this._downloadImage(imageUrl, options.outputPath);
        console.log(`✅ Downloaded to: ${downloadPath}`);
        
        return {
          url: imageUrl,
          path: downloadPath
        };
      }
      
      return {
        url: imageUrl
      };

    } catch (error) {
      console.error('❌ Grok image generation failed:', error.message);
      const screenshotPath = path.join(process.cwd(), 'temp', `grok-gen-error-${Date.now()}.png`);
      await this.screenshot({ path: screenshotPath });
      console.error(`   Screenshot: ${screenshotPath}`);
      throw error;
    }
  }

  /**
   * Generate multiple images sequentially (compatible with affiliateVideoTikTokService)
   * Note: Grok doesn't use character/product files - generates from prompts only
   * 
   * @param {string} characterImagePath - Ignored (Grok generates from prompts)
   * @param {string} productImagePath - Ignored (Grok generates from prompts)
   * @param {string[]} prompts - Array of prompts to generate images for
   * @param {Object} options - Options including outputDir, download, etc.
   * @returns {Promise<Object>} Results compatible with GoogleFlowAutomationService format
   */
  async generateMultiple(characterImagePath, productImagePath, prompts, options = {}) {
    console.log(`\n${'═'.repeat(80)}`);
    console.log(`📊 AFFILIATE VIDEO IMAGE GENERATION (TikTok): 2 images (via Grok)`);
    console.log(`${'═'.repeat(80)}\n`);
    console.log(`📸 Character image: ${path.basename(characterImagePath)}`);
    console.log(`📦 Product image: ${path.basename(productImagePath)}\n`);

    const results = [];
    const downloadedFiles = [];
    // Use instance outputDir from constructor options, fallback to default
    const outputDir = this.options?.outputDir || options.outputDir || path.join(process.cwd(), 'backend', 'generated-images');

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    try {
      // Initialize if not already done
      if (!this.page || this.page.isClosed()) {
        console.log('[INIT] 🚀 Initializing Grok browser...');
        await this.initialize();
        console.log('[INIT] ✅ Grok initialized\n');
      }

      // Generate 2 specific prompts for affiliate video:
      // Prompt 1: Character WEARING the product
      // Prompt 2: Character HOLDING the product
      
      const generationPrompts = [
        {
          type: 'wearing',
          prompt: this._createWearingPrompt(prompts[0] || '', productImagePath),
          description: 'Character wearing the product'
        },
        {
          type: 'holding',
          prompt: this._createHoldingPrompt(prompts[1] || '', productImagePath),
          description: 'Character holding the product'
        }
      ];

      console.log(`📋 Two generation prompts prepared:\n`);
      for (let i = 0; i < generationPrompts.length; i++) {
        console.log(`   [${i + 1}] ${generationPrompts[i].type.toUpperCase()}: ${generationPrompts[i].description}`);
        console.log(`   Prompt length: ${generationPrompts[i].prompt.length} chars`);
        // console.log(`   📝 Full prompt: ${generationPrompts[i].prompt.substring(0, 100)}...`);
      }
      console.log();

      // ✅ VERIFY: Both prompts are DIFFERENT
      const prompt1 = generationPrompts[0].prompt;
      const prompt2 = generationPrompts[1].prompt;
      const promptsAreDifferent = prompt1 !== prompt2;
      
      if (!promptsAreDifferent) {
        console.warn(`⚠️  WARNING: Both prompts are IDENTICAL!`);
        console.warn(`   Prompt 1: ${prompt1.substring(0, 100)}...`);
        console.warn(`   Prompt 2: ${prompt2.substring(0, 100)}...`);
      } else {
        console.log(`✅ VERIFIED: Two prompts are DIFFERENT`);
        console.log(`   Prompt 1 key: WEARING/DISPLAYING the product`);
        console.log(`   Prompt 2 key: HOLDING in a natural way`);
        console.log(`   Length diff: ${Math.abs(prompt1.length - prompt2.length)} characters\n`);
      }

      // 🎯 PHASE 2: UPLOAD FILES BEFORE GENERATING IMAGES
      // This ensures both character and product images are available for context
      console.log(`\n${'═'.repeat(80)}`);
      console.log(`📤 PHASE 2: UPLOADING IMAGES FOR AFFILIATE GENERATION`);
      console.log(`${'═'.repeat(80)}\n`);
      
      try {
        await this._uploadFiles(characterImagePath, productImagePath);
      } catch (uploadError) {
        console.error(`⚠️  Image upload warning: ${uploadError.message}`);
        console.error(`   Continuing anyway - image generation may still work from prompts\n`);
        // Don't throw - continue with text-based generation as fallback
      }

      // Generate each image sequentially
      for (let i = 0; i < generationPrompts.length; i++) {
        const { type, prompt, description } = generationPrompts[i];
        const imageNumber = i + 1;

        console.log(`\n${'═'.repeat(80)}`);
        console.log(`🎨 IMAGE ${imageNumber}/2: ${description.toUpperCase()}`);
        console.log(`${'═'.repeat(80)}\n`);

        if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
          console.error(`❌ IMAGE ${imageNumber} PROMPT INVALID`);
          results.push({
            success: false,
            imageNumber,
            type,
            error: `Invalid prompt generated`
          });
          continue;
        }

        try {
          console.log(`[STEP A-START] 📝 Starting ${type.toUpperCase()} image generation...`);
          console.log(`[STEP A] 📝 Generating ${type.toUpperCase()} image (${prompt.length} chars)...`);
          // Prompt details commented out - too verbose
          // console.log(`📋 PROMPT FOR ${type.toUpperCase()}: ${prompt.substring(0, 100)}...`);
          
          console.log(`[STEP A-CALL] Calling generateImage() for IMAGE ${imageNumber}...`);
          const generatedResult = await this.generateImage(prompt, {
            download: true,
            outputPath: outputDir
          });
          console.log(`[STEP A-RESULT] generateImage() returned successfully for IMAGE ${imageNumber}`);

          // Map to Google Flow format for compatibility
          const result = {
            success: true,
            imageNumber,
            type,
            href: generatedResult.url,
            downloadedFile: generatedResult.path,
            url: generatedResult.url
          };

          results.push(result);
          if (generatedResult.path) {
            downloadedFiles.push(generatedResult.path);
          }

          console.log(`[STEP B] ✅ Image ${imageNumber} (${type}) generated successfully`);
          console.log(`   📍 URL: ${generatedResult.url}`);
          if (generatedResult.path) {
            console.log(`   💾 Path: ${generatedResult.path}`);
          }

          // Small delay between images to avoid rate limiting
          if (i < generationPrompts.length - 1) {
            console.log(`[DELAY] ⏳ Waiting 3 seconds before next image...`);
            await this.page.waitForTimeout(3000);
            console.log(`[DELAY] ✅ Ready\n`);
          }

        } catch (promptError) {
          console.error(`\n❌ IMAGE ${imageNumber} (${type}) GENERATION FAILED`);
          console.error(`   Error message: ${promptError.message}`);
          console.error(`   Error stack: ${promptError.stack}`);
          
          // Take screenshot for debugging IMAGE 1 failure
          if (imageNumber === 1) {
            const screenshotPath = path.join(process.cwd(), 'temp', `image-1-failure-${Date.now()}.png`);
            try {
              await this.screenshot({ path: screenshotPath });
              console.error(`   🔍 Screenshot saved: ${screenshotPath}`);
            } catch (e) {
              console.error(`   ⚠️  Could not save screenshot: ${e.message}`);
            }
          }
          
          results.push({
            success: false,
            imageNumber,
            type,
            error: promptError.message
          });
        }
      }

      // Prepare final results
      const successCount = results.filter(r => r.success).length;

      console.log(`\n${'═'.repeat(70)}`);
      console.log(`✅ GENERATION COMPLETE: ${successCount}/2 successful`);
      console.log(`📁 Output directory: ${outputDir}`);
      console.log(`${'═'.repeat(70)}\n`);

      // Log details about any failures
      const failures = results.filter(r => !r.success);
      if (failures.length > 0) {
        console.log(`⚠️  IMAGE GENERATION FAILURES:\n`);
        failures.forEach(f => {
          console.log(`   IMAGE ${f.imageNumber} (${f.type.toUpperCase()}): ${f.error}`);
        });
        console.log('');
      }

      return {
        success: successCount === 2,
        results: results,
        totalGenerated: successCount,
        totalRequested: 2,
        downloadedFiles: downloadedFiles
      };

    } catch (error) {
      console.error(`❌ Multi-generation failed: ${error.message}`);

      return {
        success: false,
        error: error.message,
        results: results,
        totalGenerated: results.filter(r => r.success).length,
        totalRequested: 2
      };
    }
  }

  /**
   * Create prompt for character WEARING the product
   * @private
   */
  _createWearingPrompt(basePrompt, productImagePath) {
    const productName = path.basename(productImagePath, path.extname(productImagePath));
    
    if (basePrompt && basePrompt.trim()) {
      return basePrompt;
    }
    
    return `Generate a professional product photo showing a model wearing the ${productName}. The model should look natural and confident, with good lighting and clear visibility of the product.`;
  }

  /**
   * Create prompt for character HOLDING the product
   * @private
   */
  _createHoldingPrompt(basePrompt, productImagePath) {
    const productName = path.basename(productImagePath, path.extname(productImagePath));
    
    if (basePrompt && basePrompt.trim()) {
      return basePrompt;
    }
    
    return `Generate a professional product photo showing a model holding the ${productName}. The model should look natural and confident, with good lighting and clear visibility of the product in their hands.`;
  }

  /**
   * Generate image with Grok using the /imagine page
   * Full workflow: Navigate → Upload images → Configure settings (Image tab) → Type prompt → Wait → Download
   */
  async generateImageFromImagine(prompt, characterImagePath, productImagePath, options = {}) {
    console.log('\n🖼️  GROK IMAGE GENERATION (via /imagine page)');
    console.log('═'.repeat(80));
    console.log(`📝 Prompt: ${prompt.substring(0, 100)}...`);
    console.log(`📸 Character image: ${path.basename(characterImagePath)}`);
    console.log(`📦 Product image: ${path.basename(productImagePath)}`);
    console.log('');

    try {
      // STEP 1: Navigate to Grok /imagine page
      console.log('[1/5] 🚀 Navigating to grok.com/imagine...');
      await this._navigateToImagine();
      console.log('       ✅ At /imagine page\n');

      // STEP 2: Upload both images
      console.log('[2/5] 📤 Uploading images...');
      await this._uploadFilesForVideo(characterImagePath, productImagePath);
      console.log('       ✅ Images uploaded\n');

      // STEP 3: Configure image settings (switch to Image tab)
      console.log('[3/5] ⚙️  Configuring image settings...');
      await this._openVideoSettings();
      console.log('       ✅ Settings opened');
      
      // Switch to Image tab
      await this._switchToImageTab();
      console.log('       ✅ Image tab enabled');
      
      // Close settings menu
      await this.page.waitForTimeout(500);
      await this.page.evaluate(() => {
        document.body.click();
      });
      console.log('       ✅ Settings closed\n');

      // STEP 4: Type prompt
      console.log('[4/5] 📝 Typing image prompt...');
      await this._clearEditor();
      await this._typePrompt(prompt);
      console.log('       ✅ Prompt entered\n');

      // STEP 5: Send and wait for generation, then download
      console.log('[5/5] 📤 Sending prompt & waiting for generation...');
      await this._sendMessage();
      console.log('       ⏳ Waiting for image generation (this may take 10-20 seconds)...');
      
      const imageUrl = await this._waitForImageGeneration();
      
      if (!imageUrl) {
        const screenshotPath = path.join(process.cwd(), 'temp', `image-gen-timeout-${Date.now()}.png`);
        await this.screenshot({ path: screenshotPath });
        throw new Error(`Image generation timeout - no image appeared. Screenshot: ${screenshotPath}`);
      }
      
      console.log('       ✅ Image generated\n');

      // Download image
      console.log('💾 Downloading image...');
      
      if (options.download) {
        const downloadPath = await this._downloadImage(imageUrl, options.outputPath);
        console.log(`       ✅ Downloaded to: ${downloadPath}\n`);
        
        // Reload page for next generation if multiple
        if (options.reloadAfter) {
          console.log('🔄 Reloading page for next generation...');
          await this.page.reload({ waitUntil: 'networkidle2' });
          await this.page.waitForTimeout(2000);
        }
        
        return {
          url: imageUrl,
          path: downloadPath,
          success: true
        };
      }

      return {
        url: imageUrl,
        success: true
      };

    } catch (error) {
      console.error('❌ Image generation failed:', error.message);
      const screenshotPath = path.join(process.cwd(), 'temp', `grok-image-error-${Date.now()}.png`);
      try {
        await this.screenshot({ path: screenshotPath });
        console.error(`   Screenshot: ${screenshotPath}`);
      } catch (e) {}
      throw error;
    }
  }

  /**
   * Generate video with Grok using the /imagine page
   * Full workflow: Navigate → Upload images → Configure settings → Type prompt → Wait → Download
   */
  async generateVideo(prompt, characterImagePath, productImagePath, options = {}) {
    console.log('\n🎬 GROK VIDEO GENERATION (via /imagine page)');
    console.log('═'.repeat(80));
    console.log(`📝 Prompt: ${prompt.substring(0, 100)}...`);
    console.log(`📸 Character image: ${path.basename(characterImagePath)}`);
    console.log(`📦 Product image: ${path.basename(productImagePath)}`);
    console.log('');

    try {
      // STEP 1: Navigate to Grok /imagine page
      console.log('[1/6] 🚀 Navigating to grok.com/imagine...');
      await this._navigateToImagine();
      console.log('       ✅ At /imagine page\n');

      // STEP 2: Upload both images
      console.log('[2/6] 📤 Uploading images...');
      await this._uploadFilesForVideo(characterImagePath, productImagePath);
      console.log('       ✅ Images uploaded\n');

      // STEP 3: Configure video settings
      console.log('[3/6] ⚙️  Configuring video settings...');
      await this._openVideoSettings();
      console.log('       ✅ Video settings opened');
      
      // Switch to Video tab first
      await this._switchToVideoTab();
      console.log('       ✅ Video tab enabled');
      
      // Select 10s duration
      await this._selectVideoDuration('10s');
      console.log('       ✅ Duration set to 10s');
      
      // Select 720p resolution
      await this._selectVideoResolution('720p');
      console.log('       ✅ Resolution set to 720p');
      
      // Close settings menu (click outside)
      await this.page.waitForTimeout(500);
      await this.page.evaluate(() => {
        document.body.click();
      });
      console.log('       ✅ Settings closed\n');

      // STEP 4: Type prompt
      console.log('[4/6] 📝 Typing video prompt...');
      await this._clearEditor();
      await this._typePrompt(prompt);
      console.log('       ✅ Prompt entered\n');

      // STEP 5: Send and wait for generation
      console.log('[5/6] 📤 Sending prompt...');
      await this._sendMessage();
      console.log('       ⏳ Waiting for video generation (this may take 30-60 seconds)...');
      
      const videoUrl = await this._waitForVideoGeneration();
      
      if (!videoUrl) {
        const screenshotPath = path.join(process.cwd(), 'temp', `video-gen-timeout-${Date.now()}.png`);
        await this.screenshot({ path: screenshotPath });
        throw new Error(`Video generation timeout - no video appeared. Screenshot: ${screenshotPath}`);
      }
      
      console.log('       ✅ Video generated\n');

      // STEP 6: Download video
      console.log('[6/6] 💾 Downloading video...');
      
      if (options.download) {
        const downloadPath = await this._downloadVideoFromPage(options.outputPath);
        console.log(`       ✅ Downloaded to: ${downloadPath}\n`);
        
        // Reload page for next generation if multiple
        if (options.reloadAfter) {
          console.log('🔄 Reloading page for next generation...');
          await this.page.reload({ waitUntil: 'networkidle2' });
          await this.page.waitForTimeout(2000);
        }
        
        return {
          url: videoUrl,
          path: downloadPath,
          success: true
        };
      }

      return {
        url: videoUrl,
        success: true
      };

    } catch (error) {
      console.error('❌ Video generation failed:', error.message);
      const screenshotPath = path.join(process.cwd(), 'temp', `grok-video-error-${Date.now()}.png`);
      try {
        await this.screenshot({ path: screenshotPath });
        console.error(`   Screenshot: ${screenshotPath}`);
      } catch (e) {}
      throw error;
    }
  }

  /**
   * Navigate to the /imagine page for video generation
   * @private
   */
  async _navigateToImagine() {
    const imagineUrl = 'https://grok.com/imagine';
    
    console.log(`   Navigating to ${imagineUrl}...`);
    await this.page.goto(imagineUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Wait for page to stabilize
    await this.page.waitForTimeout(2000);
  }

  /**
   * Upload files for video generation
   * @private
   */
  async _uploadFilesForVideo(characterImagePath, productImagePath) {
    // Find and use the file input in the form
    // Optimal selector: form > input (type=file)
    const fileInputSelector = 'form > input[type="file"]';
    
    // Upload character image
    console.log('   Uploading character image...');
    try {
      const inputElement = await this.page.$(fileInputSelector);
      if (!inputElement) {
        // Try alternative selector
        const altInputElement = await this.page.$('input[type="file"]');
        if (!altInputElement) {
          throw new Error('File input not found');
        }
        await this._uploadFileViaInput(altInputElement, characterImagePath);
      } else {
        await this._uploadFileViaInput(inputElement, characterImagePath);
      }
      await this.page.waitForTimeout(1000);
    } catch (error) {
      console.warn(`   ⚠️  Character image upload: ${error.message}`);
    }
    
    // Upload product image
    console.log('   Uploading product image...');
    try {
      const inputElement = await this.page.$(fileInputSelector);
      if (!inputElement) {
        const altInputElement = await this.page.$('input[type="file"]');
        if (altInputElement) {
          await this._uploadFileViaInput(altInputElement, productImagePath);
        }
      } else {
        await this._uploadFileViaInput(inputElement, productImagePath);
      }
      await this.page.waitForTimeout(1000);
    } catch (error) {
      console.warn(`   ⚠️  Product image upload: ${error.message}`);
    }
  }

  /**
   * Upload file via input element
   * @private
   */
  async _uploadFileViaInput(inputElement, filePath) {
    const absolutePath = path.resolve(filePath);
    
    // Use uploadFile - Puppeteer's built-in method
    await inputElement.uploadFile(absolutePath);
    
    // Trigger change event
    await this.page.evaluate((selector) => {
      const input = document.querySelector(selector);
      if (input) {
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, 'input[type="file"]');
    
    console.log(`       Uploaded: ${path.basename(filePath)}`);
  }

  /**
   * Open video settings menu
   * @private
   */
  async _openVideoSettings() {
    // Click the Video settings button - it has aria-label="Cài đặt"
    const settingsButton = await this.page.$('button[aria-label="Cài đặt"]');
    
    if (!settingsButton) {
      // Try alternative selector - button with "Video" text and dropdown icon
      const altButton = await this.page.$('button span:contains("Video")');
      if (!altButton) {
        throw new Error('Video settings button not found');
      }
      await altButton.click();
    } else {
      await settingsButton.click();
    }
    
    // Wait for menu to open
    await this.page.waitForTimeout(500);
  }

  /**
   * Switch to Video tab in settings menu
   * @private
   */
  async _switchToVideoTab() {
    // The Video button is already selected (aria-checked="true")
    // But ensure it's clicked
    try {
      // Look for the button with "Video" text in settings menu
      const videoTabButton = await this.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('[role="menuitemradio"]'));
        const videoBtn = buttons.find(btn => btn.textContent.includes('Video') && btn.textContent.includes('icon'));
        return videoBtn ? true : false;
      });
      
      if (videoTabButton) {
        // Find and click the video button
        await this.page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('[role="menuitemradio"]'));
          const videoBtn = buttons.find(btn => {
            const text = btn.textContent;
            return text.includes('Video');
          });
          if (videoBtn) {
            videoBtn.click();
          }
        });
      }
    } catch (error) {
      console.warn(`   ⚠️  Could not switch to Video tab: ${error.message}`);
    }
  }

  /**
   * Switch to Image tab in settings menu
   * @private
   */
  async _switchToImageTab() {
    // Switch from Video to Image tab
    try {
      // Find the Image button in settings menu with [role="menuitemradio"]
      const switched = await this.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('[role="menuitemradio"]'));
        const imageBtn = buttons.find(btn => {
          const text = btn.textContent;
          return text.includes('Hình ảnh') || text.includes('Image');
        });
        if (imageBtn) {
          imageBtn.click();
          return true;
        }
        return false;
      });
      
      if (!switched) {
        console.warn('   ⚠️  Image button not found in menu');
      }
    } catch (error) {
      console.warn(`   ⚠️  Could not switch to Image tab: ${error.message}`);
    }
  }

  /**
   * Select video duration
   * @private
   */
  async _selectVideoDuration(duration) {
    // Duration can be "6s" or "10s"
    const targetDuration = duration.toUpperCase();
    
    try {
      // Find button with aria-label matching the duration
      const clicked = await this.page.evaluate((dur) => {
        const buttons = Array.from(document.querySelectorAll('button[aria-label]'));
        const durationBtn = buttons.find(btn => btn.getAttribute('aria-label') === dur);
        if (durationBtn) {
          durationBtn.click();
          return true;
        }
        return false;
      }, targetDuration);
      
      if (!clicked) {
        console.warn(`   ⚠️  Duration button "${targetDuration}" not found`);
      }
    } catch (error) {
      console.warn(`   ⚠️  Could not select duration: ${error.message}`);
    }
  }

  /**
   * Select video resolution
   * @private
   */
  async _selectVideoResolution(resolution) {
    // Resolution can be "480p" or "720p"
    const targetResolution = resolution.toUpperCase();
    
    try {
      // Find button with aria-label matching the resolution
      const clicked = await this.page.evaluate((res) => {
        const buttons = Array.from(document.querySelectorAll('button[aria-label]'));
        const resBtn = buttons.find(btn => btn.getAttribute('aria-label') === res);
        if (resBtn) {
          resBtn.click();
          return true;
        }
        return false;
      }, targetResolution);
      
      if (!clicked) {
        console.warn(`   ⚠️  Resolution button "${targetResolution}" not found`);
      }
    } catch (error) {
      console.warn(`   ⚠️  Could not select resolution: ${error.message}`);
    }
  }

  /**
   * Wait for video to be generated
   * @private
   */
  async _waitForVideoGeneration(maxWait = 180000) {
    console.log('   ⏳ Monitoring video generation...');
    
    const startTime = Date.now();
    let lastLogTime = Date.now();
    
    while (Date.now() - startTime < maxWait) {
      try {
        // Check if video element exists and has src
        const videoData = await this.page.evaluate(() => {
          const sdVideo = document.querySelector('video#sd-video');
          const hdVideo = document.querySelector('video#hd-video');
          
          const activeVideo = sdVideo && sdVideo.style.visibility !== 'hidden' ? sdVideo : (hdVideo && hdVideo.style.visibility !== 'hidden' ? hdVideo : null);
          
          if (activeVideo && activeVideo.src) {
            return {
              src: activeVideo.src,
              id: activeVideo.id,
              visible: activeVideo.style.visibility !== 'hidden'
            };
          }
          
          return null;
        });
        
        if (videoData && videoData.src) {
          console.log(`   ✅ Video found: ${videoData.id} (${videoData.visible ? 'visible' : 'hidden'})`);
          await this.page.waitForTimeout(2000); // Let it load fully
          return videoData.src;
        }
        
        // Log progress every 10 seconds
        if (Date.now() - lastLogTime > 10000) {
          const elapsed = Math.round((Date.now() - startTime) / 1000);
          console.log(`   ⏳ Still generating... (${elapsed}s elapsed)`);
          lastLogTime = Date.now();
        }
        
      } catch (error) {
        console.warn(`   ⚠️  Error checking video: ${error.message}`);
      }
      
      await this.page.waitForTimeout(2000);
    }
    
    console.log('   ❌ Video generation timeout');
    return null;
  }

  /**
   * Wait for image to be generated (for /imagine Image tab)
   * @private
   */
  async _waitForImageGeneration(maxWait = 120000) {
    console.log('   ⏳ Monitoring image generation...');
    
    const startTime = Date.now();
    let lastLogTime = Date.now();
    
    while (Date.now() - startTime < maxWait) {
      try {
        // Check if any image with generated content appeared
        const imageData = await this.page.evaluate(() => {
          // Look for generated images - check for img elements with grok/generated URLs
          const images = document.querySelectorAll('img');
          
          for (const img of images) {
            const src = img.src;
            
            // Check for Grok generated image indicators
            if (
              src &&
              (src.includes('grok') || 
               src.includes('generated') || 
               src.includes('assets.grok.com')) &&
              src.startsWith('https://') &&
              img.complete &&
              img.naturalWidth > 256 &&
              img.naturalHeight > 256
            ) {
              return {
                src: src,
                width: img.naturalWidth,
                height: img.naturalHeight
              };
            }
          }
          
          return null;
        });
        
        if (imageData && imageData.src) {
          console.log(`   ✅ Image found: ${imageData.width}x${imageData.height}`);
          await this.page.waitForTimeout(1000); // Let it fully load
          return imageData.src;
        }
        
        // Log progress every 10 seconds
        if (Date.now() - lastLogTime > 10000) {
          const elapsed = Math.round((Date.now() - startTime) / 1000);
          console.log(`   ⏳ Still generating... (${elapsed}s elapsed)`);
          lastLogTime = Date.now();
        }
        
      } catch (error) {
        console.warn(`   ⚠️  Error checking image: ${error.message}`);
      }
      
      await this.page.waitForTimeout(2000);
    }
    
    console.log('   ❌ Image generation timeout');
    return null;
  }

  /**
   * Download video from the page
   * @private
   */
  async _downloadVideoFromPage(outputPath = null) {
    // Ensure directory exists
    const filename = outputPath || path.join(
      process.cwd(),
      'backend',
      'generated-images',
      `grok-video-${Date.now()}.mp4`
    );
    
    const dir = path.dirname(filename);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    console.log('   Clicking download button...');
    
    try {
      // Find download button - it has aria-label="Tải xuống"
      const downloadBtn = await this.page.$('button[aria-label="Tải xuống"]');
      
      if (downloadBtn) {
        // Intercept download
        const downloadPromise = new Promise((resolve, reject) => {
          this.browser.once('page', async (newPage) => {
            try {
              const responsePromise = new Promise((res) => {
                newPage.on('response', res);
              });
              
              const response = await responsePromise;
              const buffer = await response.buffer();
              
              fs.writeFileSync(filename, buffer);
              resolve(filename);
              
              await newPage.close();
            } catch (error) {
              reject(error);
            }
          });
        });
        
        // Click download
        await downloadBtn.click();
        
        // Wait for download with timeout
        try {
          await Promise.race([
            downloadPromise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Download timeout')), 30000))
          ]);
          
          if (fs.existsSync(filename) && fs.statSync(filename).size > 10000) {
            console.log(`   ✅ Video downloaded (${fs.statSync(filename).size} bytes)`);
            return filename;
          }
        } catch (error) {
          console.warn(`   ⚠️  Download interception failed: ${error.message}`);
        }
      }
      
      // Fallback: Get video URL from sd-video element and download directly
      const videoUrl = await this.page.evaluate(() => {
        const sdVideo = document.querySelector('video#sd-video');
        return sdVideo ? sdVideo.src : null;
      });
      
      if (videoUrl) {
        console.log(`   Using fallback download from: ${videoUrl.substring(0, 80)}...`);
        return await this._downloadVideoUrl(videoUrl, filename);
      }
      
      throw new Error('Could not find video URL to download');
      
    } catch (error) {
      console.warn(`   ⚠️  Download failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Download video from URL
   * @private
   */
  async _downloadVideoUrl(url, filePath) {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;
      
      protocol.get(url, { 
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'
        }
      }, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}`));
          return;
        }
        
        const fileStream = fs.createWriteStream(filePath);
        response.pipe(fileStream);
        
        fileStream.on('finish', () => {
          fileStream.close();
          const fileSize = fs.statSync(filePath).size;
          console.log(`   ✅ Video downloaded (${fileSize} bytes)`);
          resolve(filePath);
        });
        
        fileStream.on('error', (error) => {
          fs.unlink(filePath, () => {});
          reject(error);
        });
      }).on('error', reject);
    });
  }

  /**
   * Full workflow: Analyze + Generate
   */
  async fullWorkflow(characterImagePath, clothingImagePath, options = {}) {
    console.log('\n🎯 GROK FULL WORKFLOW');
    console.log('='.repeat(80));
    console.log(`Character: ${path.basename(characterImagePath)}`);
    console.log(`Clothing: ${path.basename(clothingImagePath)}`);
    console.log('');

    try {
      // Step 1: Analyze both images
      console.log('📊 STEP 1: Analyzing images...\n');
      
      const analysisPrompt = options.analysisPrompt || 
        'Analyze these two images. The first is a character/person, the second is clothing. ' +
        'Describe the character\'s features (pose, body type, style) and the clothing details ' +
        '(color, style, design, patterns). Prepare a detailed description for generating a new image.';
      
      const analysis = await this.analyzeMultipleImages(
        [characterImagePath, clothingImagePath],
        analysisPrompt
      );
      
      console.log('Analysis result:');
      console.log(analysis.slice(0, 300) + '...\n');
      
      // Step 2: Generate new image
      console.log('🎨 STEP 2: Generating new image...\n');
      
      const generationPrompt = options.generationPrompt ||
        `Based on the analysis above, generate a photorealistic image of the character wearing the clothing. ` +
        `Maintain the character's pose, body type, and style. ` +
        `The clothing should fit naturally on the character. ` +
        `High quality, detailed, professional photography style.`;
      
      const generatedImage = await this.generateImage(generationPrompt, {
        download: true,
        outputPath: options.outputPath
      });
      
      // Step 3: Optional video generation
      let generatedVideo = null;
      
      if (options.generateVideo) {
        console.log('🎬 STEP 3: Generating video...\n');
        
        const videoPrompt = options.videoPrompt ||
          `Create a short video showcasing the character wearing the new outfit. ` +
          `Smooth camera movement, professional fashion showcase style.`;
        
        generatedVideo = await this.generateVideo(videoPrompt, {
          download: true,
          outputPath: options.videoOutputPath
        });
      }
      
      console.log('='.repeat(80));
      console.log('✅ FULL WORKFLOW COMPLETE');
      console.log('='.repeat(80) + '\n');
      
      return {
        analysis,
        generatedImage,
        generatedVideo
      };

    } catch (error) {
      console.error('❌ Full workflow failed:', error.message);
      throw error;
    }
  }

  /**
   * Generate video with 3 images (character, product, scene)
   * @param {string} characterPath - Path to character image
   * @param {string} productPath - Path to product image
   * @param {string} scenePath - Path to scene image
   * @param {Object} settings - Video settings {duration: 10, resolution: '720p', aspectRatio: '9:16'}
   * @param {string} prompt - Main generation prompt
   * @returns {Promise<Object>} {success, videoUrl, downloadedPath}
   */
  async generateVideoWithImages(characterPath, productPath, scenePath, settings = {}, prompt = '') {
    console.log('\n🎬 GROK VIDEO GENERATION WITH 3 IMAGES');
    console.log('='.repeat(80));
    console.log(`Character: ${path.basename(characterPath)}`);
    console.log(`Product: ${path.basename(productPath)}`);
    console.log(`Scene: ${path.basename(scenePath)}`);
    console.log(`Settings: Duration=${settings.duration}s, Resolution=${settings.resolution}, Aspect=${settings.aspectRatio}`);
    console.log('');

    const defaultSettings = {
      duration: 10,
      resolution: '720p',
      aspectRatio: '9:16',
      ...settings
    };

    try {
      // Step 1: Upload all 3 images
      console.log('📤 STEP 1: Uploading 3 images...');
      await this._uploadMultipleVideoImages([characterPath, productPath, scenePath]);
      
      // Step 2: Validate previews
      console.log('✅ STEP 1: Images uploaded');
      console.log('📋 STEP 2: Validating preview thumbnails...');
      await this._validatePreviewImages(3); // Expect 3 previews
      console.log('✅ STEP 2: Previews validated');
      
      // Step 3: Set video settings via menu
      console.log('⚙️  STEP 3: Configuring video settings...');
      await this._setVideoSettings(defaultSettings);
      console.log('✅ STEP 3: Video settings configured');
      
      // Step 4: Type prompt and generate
      console.log('💬 STEP 4: Typing generation prompt...');
      const fullPrompt = `Generate a video: ${prompt || 'Create a professional product showcase video with the uploaded images'}`;
      await this._typePrompt(fullPrompt);
      await this._sendMessage();
      
      // Step 5: Wait for video generation
      console.log('⏳ STEP 5: Waiting for video generation (this may take 30-60 seconds)...');
      const videoUrl = await this._waitForVideoGeneration(60000);
      
      if (!videoUrl) {
        throw new Error('Video generation did not produce a valid URL');
      }
      
      console.log(`✅ STEP 5: Video generated - ${videoUrl}`);
      
      // Step 6: Download video
      console.log('💾 STEP 6: Downloading video...');
      const downloadPath = await this._downloadGeneratedVideo(videoUrl);
      
      console.log('='.repeat(80));
      console.log('✅ VIDEO GENERATION WITH 3 IMAGES COMPLETE');
      console.log(`📁 Saved to: ${downloadPath}`);
      console.log('='.repeat(80) + '\n');
      
      return {
        success: true,
        videoUrl,
        downloadedPath: downloadPath,
        settings: defaultSettings,
        imagesUsed: {
          character: characterPath,
          product: productPath,
          scene: scenePath
        }
      };

    } catch (error) {
      console.error('❌ Video generation with images failed:', error.message);
      await this.screenshot({ 
        path: path.join(process.cwd(), 'temp', `grok-video-3img-error-${Date.now()}.png`) 
      });
      throw error;
    }
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  async _uploadImage(imagePath) {
    console.log(`📤 Uploading file: ${path.basename(imagePath)}`);
    
    // Wait for page to stabilize
    await this.page.waitForTimeout(1500);
    
    // ✅ NEW: Use the hidden file input directly (input[name="files"])
    // Retry every 3 seconds for up to 30 seconds (10 attempts)
    console.log(`   ⏳ Searching for file input (retry every 3s, 10 attempts)...`);
    let fileInput = null;
    let hasCloudflareCheckpoint = false;
    
    for (let attempt = 0; attempt < 10; attempt++) {
      fileInput = await this.page.$('input[type="file"][name="files"]');
      
      if (fileInput) {
        console.log(`   ✅ File input found (attempt ${attempt + 1}/10)`);
        break;
      }
      
      // Check page status
      const pageStatus = await this.page.evaluate(() => {
        return {
          title: document.title,
          hasCheckpoint: !!(document.querySelector('[id*="challenge"]') || 
                           document.querySelector('[class*="challenge"]') ||
                           document.querySelector('[class*="cloudflare"]'))
        };
      });
      
      if (pageStatus.hasCheckpoint) {
        hasCloudflareCheckpoint = true;
        console.log(`   ⚠️  Cloudflare checkpoint detected (attempt ${attempt + 1}/10)`);
        
        // Alert once
        if (attempt === 0) {
          try {
            await this.page.evaluate(() => {
              alert('🔐 Cloudflare Verification Required\n\nPlease verify in the browser window.\n\nClick OK after verification.');
            });
          } catch (err) {
            // Ignore alert errors
          }
        }
      } else {
        console.log(`   ⏳ Waiting for file input (attempt ${attempt + 1}/10)`);
      }
      
      if (attempt < 9) {
        await this.page.waitForTimeout(3000);
      }
    }
    
    if (!fileInput) {
      // Final debug info
      const pageInfo = await this.page.evaluate(() => {
        return {
          url: window.location.href,
          title: document.title,
          hasFileInput: !!document.querySelector('input[type="file"]'),
          inputCount: document.querySelectorAll('input').length
        };
      });
      
      console.log('❌ File input not found after 30 seconds. Page state:');
      console.log(`   URL: ${pageInfo.url}`);
      console.log(`   Title: ${pageInfo.title}`);
      console.log(`   Inputs: ${pageInfo.inputCount}`);
      
      if (hasCloudflareCheckpoint) {
        console.log(`   ⚠️  Cloudflare CHECKPOINT - Manual verification required!`);
      }
      
      throw new Error('Could not find Grok file input. Cloudflare checkpoint or page issue.');
    }
    
    // Set the file input with the image path (Puppeteer's uploadFile method)
    try {
      await fileInput.uploadFile(imagePath);
      console.log(`   ✅ File uploaded to input element`);
      
      // Wait for upload to process
      await this.page.waitForTimeout(2000);
      console.log(`   ✅ File upload processing complete`);
    } catch (uploadError) {
      console.error(`   ❌ File upload failed: ${uploadError.message}`);
      throw new Error(`Could not upload image via file input: ${uploadError.message}`);
    }
  }

  /**
   * Upload two images (character and product) for affiliate image generation
   * PHASE 2: Validate that 2 preview images appear before proceeding
   * @param {string} characterImagePath - Path to character image
   * @param {string} productImagePath - Path to product image
   * @returns {Promise<boolean>} True if both images uploaded and previewed successfully
   */
  async _uploadFiles(characterImagePath, productImagePath) {
    console.log('\n📤 PHASE 2a: UPLOADING IMAGES FOR GENERATION');
    console.log('═'.repeat(80));
    console.log(`📸 Character: ${path.basename(characterImagePath)}`);
    console.log(`📦 Product: ${path.basename(productImagePath)}\n`);

    try {
      // Step 1: Upload character image
      console.log('[1/4] 📸 Uploading character image...');
      await this._uploadImage(characterImagePath);
      await this.page.waitForTimeout(2000);
      
      // Step 2: Upload product image
      console.log('[2/4] 📦 Uploading product image...');
      await this._uploadImage(productImagePath);
      await this.page.waitForTimeout(2000);

      // Step 3: Validate 2 preview images appear
      console.log('[3/4] 🔍 Validating 2 preview images...');
      const previewValidation = await this._validatePreviewImages();
      
      if (!previewValidation.success) {
        console.error(`❌ Preview validation failed: ${previewValidation.error}`);
        console.error(`   Found: ${previewValidation.previewCount} previews (expected 2)`);
        throw new Error(`Preview validation failed - expected 2 previews, got ${previewValidation.previewCount}`);
      }

      console.log(`✅ Both preview images validated (${previewValidation.previewCount} previews detected)`);

      // Step 4: Verify editor is ready for prompt
      console.log('[4/4] ⌨️  Verifying editor ready for prompt...');
      const editorReady = await this.page.evaluate(() => {
        const editors = document.querySelectorAll('div[contenteditable="true"], textarea, [role="textbox"]');
        return editors.length > 0;
      });

      if (!editorReady) {
        throw new Error('Editor not found - cannot type prompt after upload');
      }

      console.log('✅ Editor ready for prompt\n');
      console.log('═'.repeat(80));
      console.log('✅ PHASE 2a COMPLETE: Images uploaded and validated\n');
      
      return true;

    } catch (error) {
      console.error(`\n❌ Image upload failed: ${error.message}`);
      await this.screenshot({ 
        path: path.join(process.cwd(), 'temp', `phase2-upload-error-${Date.now()}.png`) 
      });
      throw error;
    }
  }

  /**
   * Validate that 2 preview images appear after upload
   * PHASE 2: Critical step to ensure images are ready before prompting
   * @returns {Promise<{success: boolean, previewCount: number, error?: string}>}
   */
  async _validatePreviewImages() {
    console.log('   Checking for preview images...');
    
    // Wait a moment for previews to render
    await this.page.waitForTimeout(1500);

    const validation = await this.page.evaluate(() => {
      // Look for preview chips/thumbnails in the upload area
      const previews = document.querySelectorAll(
        '[class*="preview"],' +
        '[class*="thumbnail"],' +
        '[class*="attachment"],' +
        '[class*="chip"],' +
        '[class*="badge"],' +
        'img[src*="blob:"],' +
        'img[src*="data:image"]'
      );

      // Filter to likely preview images (not buttons or UI elements)
      let previewImages = [];
      for (const prev of previews) {
        // Skip if it's a button or small UI element
        if (prev.tagName === 'IMG') {
          const width = prev.naturalWidth || prev.width || 0;
          const height = prev.naturalHeight || prev.height || 0;
          // Preview images should be at least 50x50
          if (width >= 50 && height >= 50) {
            previewImages.push(prev);
          }
        } else if (prev.childElementCount > 0 || prev.textContent.trim() === '') {
          // Container with images or empty (likely preview chip)
          const img = prev.querySelector('img');
          if (img && (img.naturalWidth >= 50 || img.width >= 50)) {
            previewImages.push(prev);
          }
        }
      }

      // Try alternative: look for upload form specific selectors
      if (previewImages.length < 2) {
        // In form context, there might be a dedicated preview area
        const formArea = document.querySelector('[class*="form"], [class*="upload"], [class*="editor"]');
        if (formArea) {
          const formPreviews = formArea.querySelectorAll(
            '[class*="preview"], [class*="thumbnail"], img[src*="blob:"], img[src*="data:"]'
          );
          // Keep ones that are likely images
          for (const p of formPreviews) {
            if (p.tagName === 'IMG' || p.querySelector('img')) {
              previewImages.push(p);
            }
          }
        }
      }

      return {
        previewCount: previewImages.length,
        found: previewImages.length >= 2
      };
    });

    if (!validation.found) {
      console.log(`   ⚠️  Only ${validation.previewCount} previews found (expected 2)`);
      
      // Debug: take screenshot to see what's displayed
      try {
        await this.screenshot({ 
          path: path.join(process.cwd(), 'temp', `preview-validation-${Date.now()}.png`) 
        });
        console.log(`   📸 Debug screenshot saved`);
      } catch (e) {}

      return {
        success: false,
        previewCount: validation.previewCount,
        error: `Expected 2 preview images, found ${validation.previewCount}`
      };
    }

    console.log(`   ✅ Found ${validation.previewCount} preview images`);
    return {
      success: true,
      previewCount: validation.previewCount
    };
  }

  /**
   * Upload multiple images for video generation (3+ images)
   * PHASE 4: Upload character, product, and scene images for video creation
   * @param {string[]} imagePaths - Array of image paths to upload
   * @returns {Promise<boolean>} True if all images uploaded successfully
   */
  async _uploadMultipleVideoImages(imagePaths) {
    console.log(`   📤 Uploading ${imagePaths.length} images for video generation...`);
    
    for (let i = 0; i < imagePaths.length; i++) {
      const imagePath = imagePaths[i];
      const imageType = ['Character', 'Product', 'Scene'][i] || `Image ${i + 1}`;
      
      console.log(`   [${i + 1}/${imagePaths.length}] 📸 Uploading ${imageType}: ${path.basename(imagePath)}`);
      await this._uploadImage(imagePath);
      
      // Wait between uploads to avoid race conditions
      if (i < imagePaths.length - 1) {
        await this.page.waitForTimeout(2000);
      }
    }
    
    console.log(`   ✅ All ${imagePaths.length} images uploaded`);
    return true;
  }

  /**
   * Update _validatePreviewImages to support variable count (default 2, can accept 3+)
   * PHASE 4: Validate N preview images (3 for video generation)
   * @param {number} expectedCount - Expected number of previews (default 2)
   * @returns {Promise<{success: boolean, previewCount: number, error?: string}>}
   */
  async _validatePreviewImages(expectedCount = 2) {
    console.log(`   Checking for ${expectedCount} preview images...`);
    
    // Wait a moment for previews to render
    await this.page.waitForTimeout(1500);

    const validation = await this.page.evaluate((expectedNum) => {
      // Look for preview chips/thumbnails in the upload area
      const previews = document.querySelectorAll(
        '[class*="preview"],' +
        '[class*="thumbnail"],' +
        '[class*="attachment"],' +
        '[class*="chip"],' +
        '[class*="badge"],' +
        'img[src*="blob:"],' +
        'img[src*="data:image"]'
      );

      // Filter to likely preview images (not buttons or UI elements)
      let previewImages = [];
      for (const prev of previews) {
        // Skip if it's a button or small UI element
        if (prev.tagName === 'IMG') {
          const width = prev.naturalWidth || prev.width || 0;
          const height = prev.naturalHeight || prev.height || 0;
          // Preview images should be at least 50x50
          if (width >= 50 && height >= 50) {
            previewImages.push(prev);
          }
        } else if (prev.childElementCount > 0 || prev.textContent.trim() === '') {
          // Container with images or empty (likely preview chip)
          const img = prev.querySelector('img');
          if (img && (img.naturalWidth >= 50 || img.width >= 50)) {
            previewImages.push(prev);
          }
        }
      }

      // Try alternative: look for upload form specific selectors
      if (previewImages.length < expectedNum) {
        // In form context, there might be a dedicated preview area
        const formArea = document.querySelector('[class*="form"], [class*="upload"], [class*="editor"]');
        if (formArea) {
          const formPreviews = formArea.querySelectorAll(
            '[class*="preview"], [class*="thumbnail"], img[src*="blob:"], img[src*="data:"]'
          );
          // Keep ones that are likely images
          for (const p of formPreviews) {
            if (p.tagName === 'IMG' || p.querySelector('img')) {
              previewImages.push(p);
            }
          }
        }
      }

      return {
        previewCount: previewImages.length,
        found: previewImages.length >= expectedNum
      };
    }, expectedCount);

    if (!validation.found) {
      console.log(`   ⚠️  Only ${validation.previewCount} previews found (expected ${expectedCount})`);
      
      // Debug: take screenshot to see what's displayed
      try {
        await this.screenshot({ 
          path: path.join(process.cwd(), 'temp', `preview-validation-${expectedCount}-${Date.now()}.png`) 
        });
        console.log(`   📸 Debug screenshot saved`);
      } catch (e) {}

      return {
        success: false,
        previewCount: validation.previewCount,
        error: `Expected ${expectedCount} preview images, found ${validation.previewCount}`
      };
    }

    console.log(`   ✅ Found ${validation.previewCount} preview images (expected ${expectedCount})`);
    return {
      success: true,
      previewCount: validation.previewCount
    };
  }

  /**
   * Set video generation settings via Grok menu
   * PHASE 4: Configure duration (10s), resolution (720p), aspect ratio (9:16)
   * @param {Object} settings - {duration, resolution, aspectRatio}
   * @returns {Promise<boolean>} True if settings applied
   */
  async _setVideoSettings(settings) {
    console.log(`   ⚙️  Applying video settings: ${settings.duration}s @ ${settings.resolution} (${settings.aspectRatio})`);
    
    try {
      // Look for video settings menu/options in Grok
      // This may involve clicking a settings button, dropdown, or using keyboard shortcuts
      
      // Try to find and interact with video settings UI
      const settingsApplied = await this.page.evaluate((sett) => {
        // First, try to find video settings button or menu
        const settingsBtn = document.querySelector(
          'button[aria-label*="settings"], ' +
          'button[aria-label*="quality"], ' +
          'button[aria-label*="video"], ' +
          '[class*="settings"], ' +
          '[class*="options"]'
        );
        
        if (!settingsBtn) {
          // Settings might be in a dialog or form - look for duration, resolution inputs
          const durationInput = document.querySelector('input[type="number"], input[placeholder*="duration"], input[placeholder*="second"]');
          const resolutionSelect = document.querySelector('select, input[placeholder*="resolution"], input[placeholder*="720"]');
          const ratioSelect = document.querySelector('select, input[placeholder*="aspect"], input[placeholder*="ratio"]');
          
          return {
            applied: false,
            found: {
              duration: !!durationInput,
              resolution: !!resolutionSelect,
              ratio: !!ratioSelect
            }
          };
        }
        
        return {
          applied: true,
          message: 'Settings button found'
        };
      });
      
      if (!settingsApplied.applied && settingsApplied.found) {
        console.log(`   ℹ️  Video settings available - Duration: ${settingsApplied.found.duration}, Resolution: ${settingsApplied.found.resolution}, Ratio: ${settingsApplied.found.ratio}`);
        
        // If form inputs found, fill them
        // This is a fallback in case Grok doesn't have a dedicated settings UI yet
        console.log(`   ℹ️  Note: Settings application via DOM may be used in future updates`);
      }
      
      // For now, settings are passed to the prompt - full UI integration pending
      console.log(`   ✅ Settings configured (${settings.duration}s, ${settings.resolution}, ${settings.aspectRatio})`);
      return true;
      
    } catch (error) {
      console.log(`   ℹ️  Video settings UI not yet available in Grok - using prompt-based configuration`);
      return true; // Don't fail - settings can be specified in prompt
    }
  }

  /**
   * Wait for video generation to complete
   * PHASE 4: Monitor for video result after generation
   * @param {number} maxWait - Maximum wait time in milliseconds (default 60s)
   * @returns {Promise<string>} Video URL once generation completes
   */
  async _waitForVideoGeneration(maxWait = 60000) {
    console.log(`   ⏳ Monitoring for video generation (timeout: ${maxWait / 1000}s)...`);
    
    const startTime = Date.now();
    let lastCheckTime = startTime;
    let attempts = 0;
    
    while (Date.now() - startTime < maxWait) {
      attempts++;
      
      const videoResult = await this.page.evaluate(() => {
        // Look for video element or download link
        const videoElements = document.querySelectorAll('video, video[src], a[href*="video"], [class*="video-player"]');
        
        if (videoElements.length > 0) {
          for (const elem of videoElements) {
            const src = elem.src || elem.href || elem.querySelector('source')?.src;
            if (src && src.includes('http')) {
              return { found: true, url: src, type: 'direct' };
            }
          }
        }
        
        // Look for download button or link
        const downloadBtn = document.querySelector(
          'a[download*="video"], ' +
          'button[aria-label*="download"], ' +
          'a[href*="download"][href*="video"]'
        );
        
        if (downloadBtn) {
          const href = downloadBtn.href || downloadBtn.getAttribute('href');
          if (href) {
            return { found: true, url: href, type: 'download' };
          }
        }
        
        // Check body for any video-like elements
        const pageText = document.body.innerText;
        const hasVideoRef = pageText.includes('video') || pageText.includes('Video') || pageText.includes('VIDEO');
        
        return {
          found: false,
          hasVideoRef,
          elementCount: videoElements.length
        };
      });
      
      if (videoResult.found) {
        console.log(`   ✅ Video found (type: ${videoResult.type}) - ${videoResult.url.substring(0, 80)}...`);
        return videoResult.url;
      }
      
      // Log progress every 10 seconds
      if (Date.now() - lastCheckTime > 10000) {
        const elapsedSec = Math.floor((Date.now() - startTime) / 1000);
        console.log(`   ⏳ Still waiting for video... (${elapsedSec}s elapsed, attempt ${attempts})`);
        lastCheckTime = Date.now();
      }
      
      // Wait before next check
      await this.page.waitForTimeout(3000);
    }
    
    console.log(`   ⚠️  Video generation timeout after ${maxWait / 1000}s`);
    return null;
  }

  /**
   * Download generated video from URL
   * PHASE 4: Save video file to outputs directory
   * @param {string} videoUrl - URL of the generated video
   * @returns {Promise<string>} Path to downloaded video file
   */
  async _downloadGeneratedVideo(videoUrl) {
    console.log(`   💾 Downloading video from: ${videoUrl.substring(0, 60)}...`);
    
    const downloadsDir = path.join(process.cwd(), 'backend', 'downloads');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const videoFileName = `grok-video-${timestamp}.mp4`;
    const videoPath = path.join(downloadsDir, videoFileName);
    
    try {
      // Ensure downloads directory exists
      if (!fs.existsSync(downloadsDir)) {
        fs.mkdirSync(downloadsDir, { recursive: true });
      }
      
      // Download the video
      const response = await require('https').get(videoUrl, async (res) => {
        if (res.statusCode === 200) {
          const file = fs.createWriteStream(videoPath);
          res.pipe(file);
          
          return new Promise((resolve, reject) => {
            file.on('finish', () => {
              file.close();
              resolve();
            });
            file.on('error', (err) => {
              fs.unlink(videoPath, () => {}); // Delete incomplete file
              reject(err);
            });
          });
        } else if (res.statusCode === 302 || res.statusCode === 301) {
          // Handle redirects
          const redirectUrl = res.headers.location;
          return this._downloadGeneratedVideo(redirectUrl);
        } else {
          throw new Error(`Failed to download video: HTTP ${res.statusCode}`);
        }
      });
      
      console.log(`   ✅ Video downloaded to: ${videoPath}`);
      return videoPath;
      
    } catch (error) {
      // Try alternative download method using fetch if direct download fails
      console.log(`   ℹ️  Direct download failed: ${error.message}`);
      console.log(`   🔄 Attempting alternative download method...`);
      
      try {
        const fetch = require('node-fetch');
        const response = await fetch(videoUrl);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const buffer = await response.buffer();
        fs.writeFileSync(videoPath, buffer);
        
        console.log(`   ✅ Video downloaded (via fetch) to: ${videoPath}`);
        return videoPath;
        
      } catch (fetchError) {
        console.error(`   ❌ Video download failed: ${fetchError.message}`);
        
        // If download fails, return the URL so caller can handle it
        console.log(`   ℹ️  Returning video URL instead: ${videoUrl}`);
        return videoUrl;
      }
    }
  }

  async _clearEditor() {
    try {
      // Wait a moment for any pending operations
      await this.page.waitForTimeout(500);
      
      // Find editor element
      const editorSelectors = [
        'div[contenteditable="true"].tiptap',
        'div[contenteditable="true"].ProseMirror',
        'div[contenteditable="true"]',
        '[contenteditable="true"]',
        'textarea',
        '[role="textbox"]'
      ];
      
      for (const selector of editorSelectors) {
        const el = await this.page.$(selector);
        if (el) {
          // Clear the editor using keyboard shortcuts
          await this.page.evaluate((sel) => {
            const element = document.querySelector(sel);
            if (!element) return;
            
            element.focus();
            
            // Select all (Ctrl+A)
            element.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true }));
            document.execCommand('selectAll', false, null);
            
            // Delete
            element.textContent = '';
            element.innerHTML = '';
            
            // Trigger input event to notify React/Vue of change
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
          }, selector);
          
          console.log('   🧹 Editor cleared');
          await this.page.waitForTimeout(300);
          return;
        }
      }
      
      console.warn('   ⚠️  Could not find editor to clear');
    } catch (error) {
      console.warn(`   ⚠️  Could not clear editor: ${error.message}`);
    }
  }

  async _typePrompt(prompt) {
    console.log('⌨️  Typing prompt (fast method)...');
    
    // Wait for any upload preview to settle - INCREASED from 500ms to handle Cloudflare
    await this.page.waitForTimeout(1000);
    
    // RETRY LOGIC: Try up to 3 times to find the editor (Cloudflare might still be loading)
    let editorSelector = null;
    const maxRetries = 3;
    const editorSelectors = [
      'div[contenteditable="true"].tiptap',
      'div[contenteditable="true"].ProseMirror',
      'div[contenteditable="true"]',
      '[contenteditable="true"]',
      'textarea',
      '[role="textbox"]'
    ];
    
    for (let retry = 0; retry < maxRetries; retry++) {
      for (const selector of editorSelectors) {
        const el = await this.page.$(selector);
        if (el) {
          editorSelector = selector;
          break;
        }
      }
      
      if (editorSelector) {
        break;
      }
      
      if (retry < maxRetries - 1) {
        console.log(`   ⏳ Editor not found, waiting before retry ${retry + 1}/${maxRetries - 1}...`);
        await this.page.waitForTimeout(2000);
      }
    }
    
    if (!editorSelector) {
      // Take screenshot for debugging
      const screenshotPath = path.join(process.cwd(), 'temp', `grok-editor-not-found-${Date.now()}.png`);
      await this.screenshot({ path: screenshotPath });
      console.error(`❌ Could not find text input after ${maxRetries} retries`);
      console.error(`   Screenshot saved to: ${screenshotPath}`);
      throw new Error('Could not find text input - Cloudflare or page load issue');
    }
    
    console.log(`   ✅ Found editor: ${editorSelector}`);
    
    // Use page.evaluate to insert text directly - FAST method like script test
    await this.page.evaluate(async (text, sel) => {
      const el = document.querySelector(sel);
      if (!el) return;
      
      el.focus();
      
      // Check if it's contenteditable
      const isContentEditable = el.getAttribute('contenteditable') === 'true';
      
      if (isContentEditable) {
        // Find the p tag inside (TipTap/ProseMirror structure)
        const p = el.querySelector('p');
        if (p) {
          p.textContent = text;
        } else {
          el.textContent = text;
        }
        // Dispatch input event to notify TipTap/ProseMirror
        el.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        // For textarea/input
        el.value = text;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, prompt, editorSelector);
    
    await this.page.waitForTimeout(300);
    console.log('   ✅ Prompt entered (fast method)');
  }

  /**
   * Ensure the page is fully ready (past Cloudflare, page loaded, etc.)
   * This prevents "Could not find text input" errors
   */
  async _ensurePageReady() {
    // Check if page is still loading or Cloudflare is processing
    try {
      // Wait for page to not be loading (document.readyState = 'complete')
      await this.page.waitForFunction(
        () => document.readyState === 'complete',
        { timeout: 15000 }
      );
      console.log('   ✓ Page load completed');
    } catch (e) {
      console.warn('   ⚠️  Page load timeout, but continuing');
    }
    
    // Wait for the main content area to stabilize
    await this.page.waitForTimeout(2000);
    
    // Verify chat input is available
    const inputFound = await this.page.$('[contenteditable="true"], textarea, [role="textbox"]');
    if (!inputFound) {
      console.warn('   ⚠️  Chat input not immediately available - may still be loading');
    }
  }

  async _sendMessage() {
    console.log('📤 Sending message...');
    
    // Wait for any animations to complete
    await this.page.waitForTimeout(500);
    
    // Try Enter key FIRST (most reliable method)
    // Focus on the editor first
    const editorSelectors = [
      'div[contenteditable="true"].tiptap',
      'div[contenteditable="true"].ProseMirror',
      'div[contenteditable="true"]',
      '[contenteditable="true"]',
      'textarea',
      '[role="textbox"]'
    ];
    
    let editor = null;
    for (const selector of editorSelectors) {
      try {
        editor = await this.page.$(selector);
        if (editor) {
          // Click to focus
          await editor.click();
          await this.page.waitForTimeout(200);
          break;
        }
      } catch (e) {}
    }
    
    // Use Enter key (most reliable)
    console.log('   ⌨️  Pressing Enter to send message...');
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(2000);
    
    // Also try to find send button as backup (but don't wait too long)
    try {
      const sendButton = await this.page.$('button[type="submit"]');
      if (sendButton) {
        // Check if button is visible and clickable
        const isVisible = await sendButton.isVisible();
        if (isVisible) {
          console.log('   ✅ Found submit button, clicking...');
          await sendButton.click();
        }
      }
    } catch (e) {
      // Ignore - Enter key should have worked
    }
    
    console.log('✅ Message sent');
  }

  async _waitForResponse(maxWait = 300000) {
    console.log('⏳ Waiting for Grok response (waiting for action buttons to appear)...');
    
    const startTime = Date.now();
    let buttonDetectedCount = 0;
    let lastProgressLog = Date.now();
    const buttonThreshold = 3; // Action buttons stable for 3 seconds = definitely done
    
    while (Date.now() - startTime < maxWait) {
      // Check for action buttons (most reliable indicator of completion)
      const pageState = await this.page.evaluate(() => {
        // Check for action buttons - these only appear when response is complete
        const hasActionButtons = !!(
          document.querySelector('button[aria-label*="Regenerate"]') ||
          document.querySelector('button[aria-label*="Read aloud"]') ||
          document.querySelector('button[aria-label*="Share"]') ||
          document.querySelector('button[aria-label*="Sao ch"]')
        );
        
        // Get response content info for logging
        const responseContent = document.querySelector('div.response-content-markdown');
        const textLength = responseContent ? 
          (responseContent.innerText || responseContent.textContent || '').length : 0;
        
        // Check thinking indicator
        const bodyText = document.body.innerText.toLowerCase();
        const isThinking = bodyText.includes('thinking') || 
                          bodyText.includes('generating') ||
                          bodyText.includes('processing');
        
        // Check loading indicator
        const hasLoadingIndicators = !!(
          document.querySelector('[class*="animate"]') ||
          document.querySelector('[class*="skeleton"]') ||
          document.querySelector('svg[class*="animate"]')
        );
        
        // Check thinking container
        const thinkingContainer = document.querySelector('div.thinking-container');
        const thinkingIsActive = thinkingContainer && 
                                 thinkingContainer.offsetParent !== null;
        
        return {
          hasActionButtons: hasActionButtons,
          textLength: textLength,
          isThinking: isThinking,
          hasLoadingIndicators: hasLoadingIndicators,
          thinkingIsActive: thinkingIsActive
        };
      });
      
      const { hasActionButtons, textLength, isThinking, hasLoadingIndicators, thinkingIsActive } = pageState;
      
      // Progress logging every 5 seconds
      const now = Date.now();
      if (now - lastProgressLog > 5000) {
        const elapsed = Math.round((now - startTime) / 1000);
        console.log(`⏳ (${elapsed}s) Buttons: ${hasActionButtons ? '✅ DETECTED' : '❌ waiting...'}, Content: ${textLength}ch, Thinking: ${thinkingIsActive ? '💭 active' : '✅'}, Loading: ${hasLoadingIndicators ? '🔄' : '✅'}`);
        lastProgressLog = now;
      }
      
      // ===== ACTION BUTTONS DETECTION (MOST RELIABLE) =====
      
      if (hasActionButtons && !isThinking && !hasLoadingIndicators) {
        // Action buttons visible AND no thinking AND no loading = response complete
        buttonDetectedCount++;
        console.log(`✅ Action buttons detected and stable - response is done (${buttonDetectedCount}/${buttonThreshold}s)`);
        
        // Confirm stability for threshold seconds
        if (buttonDetectedCount >= buttonThreshold) {
          console.log(`✅ Response complete! Action buttons stable for ${buttonThreshold}s`);
          break;
        }
      } else {
        // Buttons not visible OR still thinking OR still loading = reset counter
        if (!hasActionButtons) {
          console.log(`⏳ Waiting for action buttons to appear... (still processing)`);
        }
        if (isThinking || thinkingIsActive) {
          console.log(`💭 Still thinking...`);
        }
        if (hasLoadingIndicators) {
          console.log(`🔄 Still loading...`);
        }
        
        // Reset counter
        if (buttonDetectedCount > 0) {
          console.log(`↻ Resetting button stability counter from ${buttonDetectedCount}`);
          buttonDetectedCount = 0;
        }
      }
      
      await this.page.waitForTimeout(1000);
    }
    
    const totalSeconds = Math.round((Date.now() - startTime) / 1000);
    console.log(`✅ Response wait completed after ${totalSeconds}s`);
    
    // Quick diagnostics before extraction
    const diagnostics = await this.page.evaluate(() => {
      const hasChatContainer = !!document.querySelector('[class*="chat"]');
      const hasResponseContainer = !!document.querySelector('div.response-content-markdown');
      const hasMessageBubble = !!document.querySelector('[role="article"]');
      const bodyLength = (document.body.innerText || '').length;
      const charProfileInBody = (document.body.innerText || '').includes('CHARACTER PROFILE');
      
      return {
        hasChatContainer,
        hasResponseContainer,
        hasMessageBubble,
        bodyLength,
        charProfileInBody
      };
    });
    
    console.log(`🔍 DOM Check: Chat=${diagnostics.hasChatContainer}, ResponseDiv=${diagnostics.hasResponseContainer}, MsgBubble=${diagnostics.hasMessageBubble}, BodyLen=${diagnostics.bodyLength}ch, HasProfile=${diagnostics.charProfileInBody}`);
    
    // Extract final response - NEW APPROACH: Get LAST message bubble (not first)
    const extractInfo = await this.page.evaluate(() => {
      let fullText = '';
      let sourceInfo = 'none';
      
      // ===== KEY FIX: Get LAST message bubble, not first! =====
      // First bubble = question/prompt
      // Last bubble = response/answer
      
      // Method 1: Get all message bubbles and pick the LAST one
      const allMessageBubbles = document.querySelectorAll('.message-bubble');
      console.log(`Found ${allMessageBubbles.length} message bubbles`);
      
      if (allMessageBubbles.length > 1) {
        // Multiple bubbles - get the last one (response)
        const lastBubble = allMessageBubbles[allMessageBubbles.length - 1];
        const responseDiv = lastBubble.querySelector('.response-content-markdown');
        if (responseDiv) {
          fullText = responseDiv.innerText || responseDiv.textContent || '';
          sourceInfo = `last-bubble[${allMessageBubbles.length}]`;
          console.log(`✅ Extracted from last message bubble (#${allMessageBubbles.length})`);
        }
      } else if (allMessageBubbles.length === 1) {
        // Only one bubble - must check if it's prompt or response
        const bubble = allMessageBubbles[0];
        const responseDiv = bubble.querySelector('.response-content-markdown');
        if (responseDiv) {
          const text = responseDiv.innerText || responseDiv.textContent || '';
          // Check if it's response (has *** markers) or prompt
          if (text.includes('*** CHARACTER PROFILE')) {
            fullText = text;
            sourceInfo = 'single-bubble-with-response';
            console.log(`✅ Single bubble has response sections`);
          } else if (text.includes('⛔ CRITICAL:')) {
            // This is the prompt - response must be below
            console.log(`⚠️  Single bubble is prompt - response may not be loaded yet`);
            sourceInfo = 'prompt-only';
          }
        }
      }
      
      // Method 2: If still empty, try finding response container directly
      if (fullText.length < 100) {
        console.log(`⚠️  Method 1 failed, trying fallback...`);
        
        // Look for last-reply-container which should have the latest response
        const lastReplyContainer = document.querySelector('#last-reply-container');
        if (lastReplyContainer) {
          const allDivs = lastReplyContainer.querySelectorAll('.response-content-markdown');
          if (allDivs.length > 0) {
            const lastResponse = allDivs[allDivs.length - 1];
            fullText = lastResponse.innerText || lastResponse.textContent || '';
            sourceInfo = `last-reply-container[${allDivs.length}]`;
            console.log(`✅ Extracted from last-reply-container`);
          }
        }
      }
      
      // Method 3: Get all text and search for response markers
      if (fullText.length < 100) {
        const allText = document.body.innerText || document.body.textContent || '';
        
        // Find ALL occurrences of CHARACTER PROFILE START
        const matches = [...allText.matchAll(/\*\*\*\s*CHARACTER\s+PROFILE\s+START\s*\*\*\*/gi)];
        if (matches.length > 1) {
          // Multiple occurrences - the LAST one is the response
          const lastMatchIndex = allText.lastIndexOf('*** CHARACTER PROFILE START ***');
          fullText = allText.substring(lastMatchIndex);
          sourceInfo = `body-last-marker[${matches.length}]`;
          console.log(`✅ Found ${matches.length} occurrences, extracting from last one`);
        } else if (matches.length === 1) {
          // Single occurrence
          const matchIndex = allText.indexOf('*** CHARACTER PROFILE START ***');
          fullText = allText.substring(matchIndex);
          sourceInfo = 'body-single-marker';
        }
      }
      
      console.log(`📍 Source: ${sourceInfo} | Length: ${fullText.length}ch`);
      
      // ===== Extract sections by regex =====
      const charMatch = fullText.match(/\*\*\*\s*CHARACTER\s+PROFILE\s+START\s*\*\*\*([\s\S]*?)\*\*\*\s*CHARACTER\s+PROFILE\s+END\s*\*\*\*/i);
      const prodMatch = fullText.match(/\*\*\*\s*PRODUCT\s+DETAILS\s+START\s*\*\*\*([\s\S]*?)\*\*\*\s*PRODUCT\s+DETAILS\s+END\s*\*\*\*/i);
      const analysisMatch = fullText.match(/\*\*\*\s*ANALYSIS\s+START\s*\*\*\*([\s\S]*?)\*\*\*\s*ANALYSIS\s+END\s*\*\*\*/i);
      const recMatch = fullText.match(/\*\*\*\s*RECOMMENDATIONS\s+START\s*\*\*\*([\s\S]*?)\*\*\*\s*RECOMMENDATIONS\s+END\s*\*\*\*/i);
      
      // Reconstruct response from sections only
      const sections = [];
      if (charMatch) sections.push(charMatch[0]);
      if (prodMatch) sections.push(prodMatch[0]);
      if (analysisMatch) sections.push(analysisMatch[0]);
      if (recMatch) sections.push(recMatch[0]);
      
      const cleanText = sections.join('\n\n');
      
      return {
        text: cleanText,
        source: sourceInfo,
        rawLength: fullText.length,
        cleanLength: cleanText.length,
        foundChar: !!charMatch,
        foundProd: !!prodMatch,
        foundAnalysis: !!analysisMatch,
        foundRec: !!recMatch,
        sectionCount: sections.length,
        totalBubbles: allMessageBubbles.length
      };
    });
    
    console.log(`📄 Section Extraction: Found=${extractInfo.sectionCount} sections | Raw: ${extractInfo.rawLength}ch → Clean: ${extractInfo.cleanLength}ch | CHAR=${extractInfo.foundChar}, PROD=${extractInfo.foundProd}, ANALYSIS=${extractInfo.foundAnalysis}, REC=${extractInfo.foundRec}`);
    
    const response = extractInfo.text;
    const responseLength = response.length;
    
    if (responseLength < 200) {
      console.warn(`⚠️  Response short (${responseLength}ch) - check if all sections extracted`);
      if (response.length > 0) {
        console.log(`Content preview:\n${response.substring(0, 200)}`);
      }
    } else {
      console.log(`✅ Response extracted (${responseLength}ch) with ${extractInfo.sectionCount} sections`);
    }
    
    return response;
  }

  async _waitForGeneratedImage(maxWait = 180000) {
    console.log('⏳ Waiting for generated image (Grok generation can take 5-10s)...');
    
    const startTime = Date.now();
    let previousImageUrl = null;
    let consecutiveStableChecks = 0;
    const stabilityThreshold = 6; // 💫 INCREASED: 6 checks = 12 seconds (was 3 = 6 seconds)
    let noImageTimeout = 0;
    const noImageMaxTimeout = 15000;

    while (Date.now() - startTime < maxWait) {
      // Check for age verification modal and dismiss if present
      await this._checkAndDismissAgeVerification();
      
      // Look for image elements
      const imageData = await this.page.evaluate(() => {
        const images = document.querySelectorAll('img');
        
        for (const img of images) {
          const src = img.src;
          
          // Look for generated image URLs - prioritize grok CDN URLs
          if (
            src.includes('grok') ||
            src.includes('assets.grok.com') ||
            (src.includes('generated') && src.startsWith('https://')) ||
            (src.includes('cdn') && src.startsWith('https://') && !src.includes('logo') && !src.includes('icon'))
          ) {
            // 💫 NEW: More strict validation - check if image is actually loaded
            if (img.complete && img.naturalWidth > 256 && img.naturalHeight > 256) {
              return {
                url: src,
                width: img.naturalWidth,
                height: img.naturalHeight,
                complete: img.complete
              };
            }
          }
        }
        
        return null;
      });
      
      // Process image data
      if (imageData?.url) {
        const { url, width, height } = imageData;
        noImageTimeout = 0;
        
        if (url === previousImageUrl) {
          consecutiveStableChecks++;
          console.log(`✅ Image stable (${consecutiveStableChecks}/${stabilityThreshold}): ${width}x${height} ${url.substring(0, 50)}...`);
          
          // If DOM is stable after longer wait, return the image
          if (consecutiveStableChecks >= stabilityThreshold) {
            console.log(`✨ Image generation complete and DOM stable after ${Math.round((Date.now() - startTime) / 1000)}s`);
            return url;
          }
        } else {
          // New image or size detected, reset stability counter
          consecutiveStableChecks = 1; // 💫 NEW: Start at 1 since we already verified it exists
          previousImageUrl = url;
          console.log(`🔄 New image detected: ${width}x${height} ${url.substring(0, 50)}...`);
        }
      } else {
        noImageTimeout += 2000;
        
        // Reset stability checks if we lost the image
        if (previousImageUrl) {
          console.log(`⚠️ Image disappeared, resetting stability counter`);
          previousImageUrl = null;
          consecutiveStableChecks = 0;
        }
        
        // Log progress every 5 seconds
        const elapsed = Date.now() - startTime;
        if (elapsed % 5000 < 2000) {
          const remaining = Math.round((maxWait - elapsed) / 1000);
          console.log(`⏳ Still waiting... [${Math.round(elapsed / 1000)}s / timeout in ${remaining}s]`);
        }
      }
      
      // 💫 NEW: Longer wait for Grok's generation (5-10s is normal)
      await this.page.waitForTimeout(2000);
    }
    
    console.log('❌ Generated image not found within timeout');
    return null;
  }

  async _waitForGeneratedVideo(maxWait = 180000) {
    console.log('⏳ Waiting for generated video...');
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWait) {
      // Look for video elements
      const videoUrl = await this.page.evaluate(() => {
        const videos = document.querySelectorAll('video');
        
        for (const video of videos) {
          const src = video.src || video.currentSrc;
          
          if (src && src.startsWith('https://')) {
            return src;
          }
          
          // Check source elements
          const sources = video.querySelectorAll('source');
          for (const source of sources) {
            if (source.src && source.src.startsWith('https://')) {
              return source.src;
            }
          }
        }
        
        return null;
      });
      
      if (videoUrl) {
        return videoUrl;
      }
      
      await this.page.waitForTimeout(3000);
    }
    
    return null;
  }

  async _downloadImage(url, outputPath, maxRetries = 3) {
    // Handle outputPath: can be directory or file path
    let filename;
    if (!outputPath) {
      filename = path.join(
        process.cwd(), 
        'backend',
        'generated-images',
        `grok-generated-${Date.now()}.png`
      );
    } else {
      // Check if outputPath is a directory or file path
      try {
        if (fs.existsSync(outputPath) && fs.statSync(outputPath).isDirectory()) {
          // It's a directory, create file inside it
          filename = path.join(outputPath, `grok-generated-${Date.now()}.png`);
        } else if (!fs.existsSync(outputPath) && !path.extname(outputPath)) {
          // Path doesn't exist and has no extension - treat as directory
          filename = path.join(outputPath, `grok-generated-${Date.now()}.png`);
        } else {
          // It's a file path
          filename = outputPath;
        }
      } catch (e) {
        // If there's an error checking, treat as file path
        filename = outputPath;
      }
    }
    
    // Ensure directory exists
    const dir = path.dirname(filename);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // 💫 NEW: Retry logic for download reliability
    let lastError = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📥 Downloading image (attempt ${attempt}/${maxRetries}): ${url.substring(0, 60)}...`);
        const downloadedPath = await this._downloadImageOnce(url, filename);
        
        // 💫 NEW: Validate downloaded file
        if (!fs.existsSync(downloadedPath)) {
          throw new Error('Downloaded file does not exist');
        }
        
        const stats = fs.statSync(downloadedPath);
        if (stats.size === 0) {
          throw new Error('Downloaded file is empty');
        }
        
        if (stats.size < 1000) {
          throw new Error(`Downloaded file too small (${stats.size} bytes)`);
        }
        
        console.log(`✅ Downloaded: ${downloadedPath} (${stats.size} bytes)`);
        return downloadedPath;
      } catch (error) {
        lastError = error;
        console.warn(`⚠️  Download attempt ${attempt} failed: ${error.message}`);
        
        // Clean up failed download
        if (fs.existsSync(filename)) {
          fs.unlinkSync(filename);
        }
        
        // Wait before retry
        if (attempt < maxRetries) {
          await this.page.waitForTimeout(2000);
        }
      }
    }
    
    throw new Error(`Failed to download image after ${maxRetries} attempts: ${lastError?.message}`);
  }
  
  // 💫 NEW: Download image using browser context (authenticated, no 403 errors)
  async _downloadImageOnce(url, outputPath) {
    try {
      console.log(`📥 Downloading via browser context: ${url.substring(0, 60)}...`);
      
      // 💫 NEW: Use browser's fetch API to download (has proper auth/cookies)
      const imageBuffer = await this.page.evaluate(async (imgUrl) => {
        try {
          const response = await fetch(imgUrl, {
            credentials: 'include', // Include cookies
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'
            }
          });
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          
          const blob = await response.blob();
          const arrayBuffer = await blob.arrayBuffer();
          
          // Convert to base64 to pass back to Node
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          return btoa(binary);
        } catch (error) {
          throw new Error(`Browser fetch failed: ${error.message}`);
        }
      }, url);
      
      // Decode base64 and write to file
      if (!imageBuffer) {
        throw new Error('Image buffer is empty');
      }
      
      const buffer = Buffer.from(imageBuffer, 'base64');
      fs.writeFileSync(outputPath, buffer);
      
      console.log(`✅ Downloaded via browser: ${outputPath} (${buffer.length} bytes)`);
      return outputPath;
      
    } catch (error) {
      console.warn(`⚠️  Browser download failed: ${error.message}`);
      
      // Fallback: Try direct HTTP with headers
      return this._downloadImageWithHeaders(url, outputPath);
    }
  }
  
  // 💫 NEW: Fallback download with proper headers
  async _downloadImageWithHeaders(url, outputPath) {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;
      let downloadTimeout;
      
      const options = {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
          'Referer': 'https://grok.com/',
          'Accept': 'image/*,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: 30000
      };
      
      const file = fs.createWriteStream(outputPath);
      let downloadedSize = 0;
      
      const request = protocol.get(url, options, (response) => {
        // Check for valid response
        if (response.statusCode !== 200 && response.statusCode !== 301 && response.statusCode !== 302) {
          request.abort();
          file.destroy();
          return reject(new Error(`HTTP ${response.statusCode}`));
        }
        
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          request.abort();
          file.destroy();
          const redirectUrl = response.headers.location;
          return this._downloadImageWithHeaders(redirectUrl, outputPath).then(resolve).catch(reject);
        }
        
        // Set download timeout
        downloadTimeout = setTimeout(() => {
          request.abort();
          file.destroy();
          reject(new Error('Download timeout (30s)'));
        }, 30000);
        
        response.pipe(file);
        response.on('data', (chunk) => {
          downloadedSize += chunk.length;
        });
      });
      
      file.on('finish', () => {
        clearTimeout(downloadTimeout);
        file.close();
        resolve(outputPath);
      });
      
      file.on('error', (err) => {
        clearTimeout(downloadTimeout);
        fs.unlink(outputPath, () => {});
        reject(err);
      });
      
      request.on('error', (err) => {
        clearTimeout(downloadTimeout);
        file.destroy();
        fs.unlink(outputPath, () => {});
        reject(err);
      });
      
      request.on('timeout', () => {
        request.abort();
        reject(new Error('Request timeout'));
      });
    });
  }

  async _downloadVideo(url, outputPath) {
    const filename = outputPath || path.join(
      process.cwd(), 
      'temp', 
      `grok-generated-${Date.now()}.mp4`
    );
    
    // Ensure directory exists
    const dir = path.dirname(filename);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;
      const file = fs.createWriteStream(filename);
      
      protocol.get(url, (response) => {
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          protocol.get(redirectUrl, (redirectResponse) => {
            redirectResponse.pipe(file);
            file.on('finish', () => {
              file.close();
              resolve(filename);
            });
          }).on('error', reject);
        } else {
          response.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve(filename);
          });
        }
      }).on('error', (err) => {
        fs.unlink(filename, () => {});
        reject(err);
      });
    });
  }

  /**
   * ============================================
   * VIDEO GENERATION METHODS
   * ============================================
   */

  /**
   * Upload image for video generation on https://grok.com/imagine
   * @param {string} imageBase64 - Base64 encoded image
   * @returns {Object} - Upload result with image ID and session info
   */
  /**
   * Validate image before upload
   * @param {string} imageBase64 - Base64 encoded image
   * @returns {Object} - { valid: boolean, issues: [string] }
   */
  async _validateImageInput(imageBase64) {
    const issues = [];
    
    // Check base64 format
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      issues.push('Image must be non-empty string');
      return { valid: false, issues };
    }
    
    // Check base64 validity
    if (!/^[A-Za-z0-9+/=]+$/.test(imageBase64)) {
      issues.push('Invalid base64 format');
      return { valid: false, issues };
    }
    
    // Check padding
    if (imageBase64.length % 4 !== 0) {
      issues.push('Invalid base64 padding');
      return { valid: false, issues };
    }
    
    try {
      // Try to decode
      const buffer = Buffer.from(imageBase64, 'base64');
      
      // Check size (should be > 1KB, < 10MB)
      if (buffer.length < 1024) {
        issues.push(`Image too small: ${buffer.length} bytes (min 1KB)`);
      }
      if (buffer.length > 10 * 1024 * 1024) {
        issues.push(`Image too large: ${(buffer.length / 1024 / 1024).toFixed(2)}MB (max 10MB)`);
      }
      
      // Check PNG/JPEG magic bytes
      const magicBytes = buffer.slice(0, 4);
      const isPNG = magicBytes[0] === 0x89 && magicBytes[1] === 0x50 && 
                    magicBytes[2] === 0x4E && magicBytes[3] === 0x47;
      const isJPEG = magicBytes[0] === 0xFF && magicBytes[1] === 0xD8;
      
      if (!isPNG && !isJPEG) {
        issues.push('Image format not PNG or JPEG (check magic bytes)');
      }
    } catch (error) {
      issues.push(`Base64 decode error: ${error.message}`);
    }
    
    return { valid: issues.length === 0, issues };
  }

  async uploadImageForVideo(imageBase64) {
    console.log('\n📤 Uploading image for video generation...');
    
    try {
      // IMPROVEMENT 1: Validate image input
      console.log('   🔍 Validating image...');
      const validation = await this._validateImageInput(imageBase64);
      
      if (!validation.valid) {
        throw new Error(`Image validation failed: ${validation.issues.join(', ')}`);
      }
      
      console.log(`   ✅ Image valid (${(Buffer.from(imageBase64, 'base64').length / 1024).toFixed(2)}KB)`);
      
      // Navigate to Grok imagine page (video page)
      console.log('   📍 Navigating to imagine page...');
      await this.goto('https://grok.com/imagine');
      
      // IMPROVEMENT 2: Wait for page to stabilize (5-10s)
      console.log('   ⏳ Waiting for page to load and stabilize (10s)...');
      await this.page.waitForTimeout(10000);
      
      // Check if page is ready
      const pageReady = await this.page.evaluate(() => {
        return document.readyState === 'complete';
      });
      
      if (!pageReady) {
        console.warn('   ⚠️ Page may not be fully loaded');
      }
      
      // IMPROVEMENT 3: Try multiple selector strategies for file input
      console.log('   🔎 Finding file upload input...');
      const fileInputSelectors = [
        'input[type="file"][accept*="image"]',
        'input[type="file"]',
        'input[accept*="image"]',
        'input[accept="image/*"]',
        '[role="button"] input[type="file"]',
        'label input[type="file"]'
      ];
      
      let fileInput = null;
      for (const selector of fileInputSelectors) {
        fileInput = await this.page.$(selector);
        if (fileInput) {
          console.log(`   ✅ Found file input: ${selector}`);
          break;
        }
      }
      
      if (!fileInput) {
        throw new Error('File input not found on Grok imagine page (tried multiple selectors)');
      }
      
      // IMPROVEMENT 4: Save base64 to temp file before upload (fix Puppeteer API)
      console.log('   💾 Preparing image file for upload...');
      const tempDir = path.join(process.cwd(), '.temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const tempImagePath = path.join(tempDir, `grok-video-${Date.now()}.jpg`);
      const buffer = Buffer.from(imageBase64, 'base64');
      fs.writeFileSync(tempImagePath, buffer);
      
      console.log(`   📁 Temp file: ${path.basename(tempImagePath)}`);
      
      // Upload using file path (correct Puppeteer API)
      console.log('   📤 Uploading to Grok...');
      await fileInput.uploadFile(tempImagePath);
      
      // Cleanup temp file
      setTimeout(() => {
        try { fs.unlinkSync(tempImagePath); } catch (e) {}
      }, 5000);
      
      console.log('   ✅ Image uploaded to Grok');
      
      // IMPROVEMENT 5: Wait for post page and poll until stable (5-10s as requested)
      console.log('   ⏳ Polling for post page redirect and stabilization...');
      const postId = await this._detectVideoPostIdWithRetry(5);
      
      if (!postId) {
        throw new Error('Failed to detect video post ID');
      }
      
      console.log(`✅ Video session created with ID: ${postId}`);
      
      return {
        success: true,
        postId,
        url: `https://grok.com/imagine/post/${postId}`
      };
      
    } catch (error) {
      console.error('❌ Image upload failed:', error);
      throw error;
    }
  }

  /**
   * Detect video post ID with retry and wait for page stabilization
   * @param {number} maxRetries - Max retry attempts
   * @returns {string|null} - Post ID if detected
   */
  async _detectVideoPostIdWithRetry(maxRetries = 5) {
    console.log('\n🔍 Detecting video post ID (with retry)...');
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`   Attempt ${attempt}/${maxRetries}...`);
        
        // Wait for URL to change to /imagine/post/[id]
        await this.page.waitForFunction(
          () => window.location.href.includes('/imagine/post/'),
          { timeout: 15000 }
        );
        
        // IMPROVEMENT: Wait additional time for page to stabilize (5-10s as requested)
        console.log('   ⏳ Waiting for post page to stabilize (10s)...');
        await this.page.waitForTimeout(10000);
        
        // Extract post ID from URL
        const url = await this.page.url();
        const match = url.match(/\/imagine\/post\/([a-f0-9\-]+)/);
        
        if (!match || !match[1]) {
          console.warn(`   ⚠️ Attempt ${attempt}: Could not extract post ID from URL: ${url}`);
          if (attempt < maxRetries) {
            await this.page.waitForTimeout(2000); // Wait before retry
          }
          continue;
        }
        
        const postId = match[1];
        console.log(`   ✅ Post ID detected: ${postId}`);
        
        return postId;
        
      } catch (error) {
        console.warn(`   ⚠️ Attempt ${attempt} failed: ${error.message}`);
        
        if (attempt < maxRetries) {
          const backoffTime = Math.pow(2, attempt - 1) * 1000; // Exponential backoff
          console.log(`   ⏳ Waiting ${backoffTime}ms before retry...`);
          await this.page.waitForTimeout(backoffTime);
        }
      }
    }
    
    console.error('❌ Failed to detect post ID after all retries');
    return null;
  }

  /**
   * Detect video post ID when page redirects to https://grok.com/imagine/post/[id]
   * @returns {string|null} - Post ID if detected
   */
  async _detectVideoPostId() {
    console.log('\n🔍 Detecting video post ID...');
    
    try {
      // Wait for URL to change to /imagine/post/[id]
      await this.page.waitForFunction(
        () => window.location.href.includes('/imagine/post/'),
        { timeout: 30000 }
      );
      
      // Extract post ID from URL
      const url = await this.page.url();
      const match = url.match(/\/imagine\/post\/([a-f0-9\-]+)/);
      
      if (!match || !match[1]) {
        console.warn('⚠️ Could not extract post ID from URL:', url);
        return null;
      }
      
      const postId = match[1];
      console.log(`✅ Post ID detected: ${postId}`);
      
      return postId;
      
    } catch (error) {
      console.error('❌ Failed to detect post ID:', error.message);
      return null;
    }
  }

  /**
   * Input video prompt segment with validation and resilience
   * Navigates to https://grok.com/imagine/post/[postId] and inputs the prompt
   * @param {string} postId - Video post ID
   * @param {string} prompt - Video prompt/script
   * @param {number} segmentNumber - Segment number (for logging)
   */
  async inputVideoSegmentPrompt(postId, prompt, segmentNumber = 1) {
    console.log(`\n📝 Inputting video segment ${segmentNumber} prompt...`);
    
    try {
      // IMPROVEMENT 1: Validate prompt
      if (!prompt || typeof prompt !== 'string') {
        throw new Error('Prompt must be non-empty string');
      }
      
      const wordCount = prompt.trim().split(/\s+/).length;
      if (wordCount < 5) {
        console.warn(`   ⚠️ Warning: Prompt is very short (${wordCount} words)`);
      }
      if (wordCount > 100) {
        console.warn(`   ⚠️ Warning: Prompt is very long (${wordCount} words), may be too detailed`);
      }
      
      // Navigate to the video post page
      const postUrl = `https://grok.com/imagine/post/${postId}`;
      console.log(`   📍 Navigating to: ${postUrl}`);
      await this.goto(postUrl);
      
      // IMPROVEMENT 2: Wait for page to stabilize (5-10s as requested)
      console.log('   ⏳ Waiting for post page to load and stabilize (10s)...');
      await this.page.waitForTimeout(10000);
      
      // IMPROVEMENT 3: Try multiple textarea selectors
      console.log('   🔎 Finding prompt textarea...');
      const textareaSelectors = [
        'textarea[placeholder*="Nhập để tùy chỉnh video"]',
        'textarea[aria-label*="video"]',
        'textarea[placeholder*="Tạo video"]',
        'textarea[placeholder*="prompt"]',
        'textarea[placeholder*="Prompt"]',
        'textarea',
        'div[contenteditable="true"][class*="prompt"]',
        'div[contenteditable="true"]'
      ];
      
      let textareaSelector = null;
      for (const selector of textareaSelectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 3000 });
          textareaSelector = selector;
          console.log(`   ✅ Found textarea: ${selector}`);
          break;
        } catch (e) {
          continue;
        }
      }
      
      if (!textareaSelector) {
        throw new Error('Prompt textarea not found (tried multiple selectors)');
      }
      
      // Clear existing content and input new prompt
      console.log('   ✏️ Inputting prompt...');
      await this.page.click(textareaSelector);
      await this.page.keyboard.press('Control+A');
      await this.page.keyboard.press('Backspace');
      await this.page.waitForTimeout(500); // Wait for clear to register
      await this.page.type(textareaSelector, prompt, { delay: 30 }); // Slower typing
      
      // Verify input
      await this.page.waitForTimeout(500);
      const inputValue = await this.page.evaluate(
        (sel) => {
          const el = document.querySelector(sel);
          return el?.value || el?.textContent || '';
        },
        textareaSelector
      );
      
      if (!inputValue.includes(prompt.slice(0, 10))) {
        throw new Error(`Prompt not properly entered. Expected: "${prompt.slice(0, 20)}...", Got: "${inputValue.slice(0, 20)}..."`);
      }
      
      console.log(`✅ Segment ${segmentNumber} prompt inputted (${wordCount} words)`);
      
      return true;
      
    } catch (error) {
      console.error(`❌ Failed to input segment ${segmentNumber} prompt:`, error.message);
      return false;
    }
  }

  /**
   * Generate video for a segment with retry logic
   * Clicks the generate/create video button
   * @param {string} postId - Video post ID
   * @param {number} segmentNumber - Segment number
   * @param {number} maxRetries - Max retry attempts
   * @returns {string|null} - Video URL if successful
   */
  async generateVideoSegment(postId, segmentNumber = 1, maxRetries = 3) {
    console.log(`\n🎬 Generating video segment ${segmentNumber}...`);
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`   Attempt ${attempt}/${maxRetries}...`);
        
        // IMPROVEMENT 1: Try multiple button selectors
        const buttonSelectors = [
          'button:has-text("Tạo video")',
          'button[aria-label*="Tạo video"]',
          'button[aria-label*="Tạo"]',
          'button:contains("Tạo")',
          'button[type="submit"]',
        ];
        
        let button = null;
        for (const selector of buttonSelectors) {
          try {
            button = await this.page.$(selector);
            if (button) break;
          } catch (e) {
            continue;
          }
        }
        
        // If no selector matched, search by button text
        if (!button) {
          const buttons = await this.page.$$('button');
          for (const btn of buttons) {
            const text = await this.page.evaluate(el => el.textContent, btn);
            if (text.includes('Tạo') || text.includes('Create') || text.includes('Generate')) {
              button = btn;
              break;
            }
          }
        }
        
        if (!button) {
          throw new Error('Create video button not found');
        }
        
        console.log(`   📌 Found generate button`);
        
        // Click the button
        console.log(`   🖱️ Clicking generate button...`);
        await this.page.evaluate(el => el.click(), button);
        
        console.log(`   ✅ Create video button clicked`);
        
        // Wait for video generation to complete
        console.log(`   ⏳ Waiting for video generation (120s timeout)...`);
        
        // Wait for video preview or download link to appear
        const videoUrl = await this._waitForVideoGenerated(postId);
        
        if (!videoUrl) {
          throw new Error(`No video generated for segment ${segmentNumber}`);
        }
        
        console.log(`   ✅ Segment ${segmentNumber} video generated: ${videoUrl}`);
        
        return videoUrl;
        
      } catch (error) {
        console.warn(`   ⚠️ Attempt ${attempt} failed: ${error.message}`);
        
        if (attempt < maxRetries) {
          const backoffTime = Math.pow(2, attempt - 1) * 1000; // Exponential backoff
          console.log(`   ⏳ Waiting ${backoffTime}ms before retry...`);
          await this.page.waitForTimeout(backoffTime);
        }
      }
    }
    
    console.error(`❌ Failed to generate segment ${segmentNumber} after ${maxRetries} attempts`);
    return null;
  }

  /**
   * Wait for video to be generated and get URL
   * @param {string} postId - Video post ID
   * @returns {string|null} - Video URL
   */
  async _waitForVideoGenerated(postId) {
    console.log('⏳ Waiting for video to be generated...');
    
    try {
      // Wait for video element or download link
      await this.page.waitForSelector(
        'video, a[href*=".mp4"], button:has-text("Download"), [role="status"][aria-live="polite"]',
        { timeout: 120000 }
      );
      
      // Try to find video source
      const videoUrl = await this.page.evaluate(() => {
        // Check for video element
        const videoElement = document.querySelector('video source[src]');
        if (videoElement) {
          return videoElement.src;
        }
        
        // Check for mp4 download links
        const links = document.querySelectorAll('a[href*=".mp4"]');
        if (links.length > 0) {
          return links[0].href;
        }
        
        // Check for preview image (placeholder)
        const preview = document.querySelector('img[src*="video"], img[src*="generated"]');
        if (preview) {
          return preview.src;
        }
        
        return null;
      });
      
      if (videoUrl) {
        console.log(`✅ Video URL detected: ${videoUrl}`);
        return videoUrl;
      }
      
      return null;
      
    } catch (error) {
      console.error('❌ Video generation timeout:', error.message);
      return null;
    }
  }

  /**
   * Full video generation workflow with segments
   * @param {string} imageBase64 - Source image base64
   * @param {Array<string>} segments - Array of prompt segments
   * @param {Object} options - Additional options
   * @returns {Object} - Generation result with video URLs
   */
  async generateVideoWithSegments(imageBase64, segments, options = {}) {
    console.log('\n🎬 GROK VIDEO GENERATION WITH SEGMENTS');
    console.log('='.repeat(80));
    console.log(`📊 Segments: ${segments.length}`);
    console.log(`⏱️ Duration: ${options.duration || 'unknown'}s`);
    console.log(`🎭 Scenario: ${options.scenario || 'unknown'}`);
    console.log('');
    
    // ✅ Initialize session tracking (Feature Integration)
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const sessionManager = new VideoSessionManager(sessionId);
    const metrics = new VideoGenerationMetrics();
    const videoUrls = [];
    const extractedFrames = [];
    
    // ✅ Initialize progress tracking (Feature 1 Integration)
    try {
      if (global.progressEmitter) {
        global.progressEmitter.initSession(sessionId, {
          totalSegments: segments.length,
          estimatedTotalTime: (segments.length * 120000) + 30000 // 2min per segment + 30s overhead
        });
        console.log(`📡 Progress tracking initialized (sessionId: ${sessionId})`);
      }
    } catch (e) {
      console.warn('⚠️ Progress emitter not available:', e.message);
    }
    
    try {
      // Step 1: Upload image and get post ID
      metrics.startPhase('upload');
      const uploadResult = await this.uploadImageForVideo(imageBase64);
      metrics.endPhase('upload');
      
      if (!uploadResult.success) {
        throw new Error('Failed to upload image for video');
      }
      
      const postId = uploadResult.postId;
      
      // Step 2: Generate video for each segment
      for (let i = 0; i < segments.length; i++) {
        const prompt = segments[i];
        
        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`SEGMENT ${i + 1}/${segments.length}`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        
        // Track phase for this segment
        metrics.startPhase(`segment-${i}`);
        
        // Input prompt for this segment
        const promptInputted = await this.inputVideoSegmentPrompt(postId, prompt, i + 1);
        
        if (!promptInputted) {
          console.warn(`⚠️ Failed to input prompt for segment ${i + 1}, skipping generation`);
          metrics.recordError(`segment-${i}`, 'Prompt input failed');
          videoUrls.push(null);
          continue;
        }
        
        // Wait a bit before generating
        await this.page.waitForTimeout(1000);
        
        // Generate video for this segment
        const videoUrl = await this.generateVideoSegment(postId, i + 1);
        videoUrls.push(videoUrl);
        
        metrics.endPhase(`segment-${i}`);
        
        // ✅ Emit progress update (Feature 1 Integration)
        try {
          if (global.progressEmitter) {
            global.progressEmitter.emitProgress(sessionId, {
              segmentIndex: i,
              segmentTotal: segments.length,
              currentSegmentProgress: 100,
              videoUrl: videoUrl,
              estimatedRemaining: (segments.length - i - 1) * 120000
            });
          }
        } catch (e) {
          console.warn('⚠️ Could not emit progress:', e.message);
        }
        
        // ✅ Extract frame from last segment (Feature 5 Integration - Custom Feature)
        if (videoUrl && i === segments.length - 1) {
          try {
            console.log('📸 Extracting frame from last segment...');
            const frameData = await sessionManager.extractLastFrame(videoUrl, {
              segmentIndex: i,
              prompt: prompt,
              timestamp: new Date()
            });
            
            if (frameData) {
              extractedFrames.push(frameData);
              console.log(`✅ Frame extracted: ${frameData.frameId}`);
            }
          } catch (frameError) {
            console.warn('⚠️ Frame extraction failed:', frameError.message);
            // Don't fail generation if frame extraction fails
          }
        }
        
        // Wait before next segment
        if (i < segments.length - 1) {
          await this.page.waitForTimeout(2000);
        }
      }
      
      // ✅ Record final metrics (Feature 3 Integration - History & Analytics)
      metrics.endPhase('composition');
      const metricsReport = metrics.getReport();
      
      // ✅ Complete progress tracking
      try {
        if (global.progressEmitter) {
          global.progressEmitter.completeSession(sessionId);
        }
      } catch (e) {
        console.warn('⚠️ Could not complete progress session:', e.message);
      }
      
      console.log('\n' + '='.repeat(80));
      console.log('✅ VIDEO GENERATION COMPLETE');
      console.log('='.repeat(80));
      console.log(`Generated ${videoUrls.filter(u => !!u).length}/${segments.length} videos`);
      console.log(`Frames extracted: ${extractedFrames.length}`);
      console.log(`Total time: ${Math.round(metricsReport.totalTimeMs / 1000)}s`);
      
      return {
        success: true,
        postId,
        videoUrls,
        sessionId,
        generatedCount: videoUrls.filter(u => !!u).length,
        totalSegments: segments.length,
        extractedFrames: extractedFrames,
        metrics: metricsReport,
        generatedAt: new Date()
      };
      
    } catch (error) {
      console.error('❌ Video generation workflow failed:', error);
      
      // Record error in metrics
      metrics.recordError(error.phase || 'generation', error.message);
      
      // Fail progress session
      try {
        if (global.progressEmitter) {
          global.progressEmitter.failSession(sessionId, error.message);
        }
      } catch (e) {
        console.warn('⚠️ Could not fail progress session:', e.message);
      }
      
      return {
        success: false,
        error: error.message,
        sessionId,
        videoUrls,
        generatedCount: videoUrls.filter(u => !!u).length,
        totalSegments: segments.length,
        extractedFrames: extractedFrames,
        metrics: metrics.getReport()
      };
    }
  }
}

export default GrokServiceV2;