import BrowserService from './browserService.js';
import SessionManager from './sessionManager.js';
import ProgressEmitter from '../ProgressEmitter.js';
import VideoGenerationMetrics from '../VideoGenerationMetrics.js';
import PromptSuggestor from '../PromptSuggestor.js';
import VideoSessionManager from '../VideoSessionManager.js';
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
    // Launch browser with skipSession option
    await this.launch();
    
    // Read session data
    const sessionFile = path.join(process.cwd(), 'backend', '.sessions', 'grok-session.json');
    let sessionData = null;
    
    if (fs.existsSync(sessionFile)) {
      try {
        sessionData = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
        console.log('✅ Session file loaded');
      } catch (e) {
        console.log(`⚠️  Could not load session: ${e.message}`);
      }
    } else {
      console.log('⚠️  No saved session found');
    }
    
    // STEP 1: Navigate to grok.com FIRST (without cookies)
    // NOTE: Grok auto-redirects after 5-7s, no need for long timeout
    console.log('📍 Step 1: Navigate to grok.com (waiting for auto-redirect ~7s)');
    try {
      await this.goto('https://grok.com', { waitUntil: 'domcontentloaded', timeout: 8000 });
      console.log('✅ Page loaded');
    } catch (e) {
      console.log(`⚠️  Navigation timeout: ${e.message}`);
    }
    
    await this.page.waitForTimeout(1000);
    
    // STEP 2: Set ESSENTIAL cookies AFTER navigation
    if (sessionData && sessionData.cookies) {
      console.log('🍪 Step 2: Injecting essential cookies (cf_clearance, sso, etc.)');
      
      // Only essential cookies - matches working grok-auto-login.js pattern
      const essentialCookieNames = ['cf_clearance', '__cf_bm', 'sso', 'sso-rw', 'x-userid'];
      const essentialCookies = sessionData.cookies.filter(c => essentialCookieNames.includes(c.name));
      
      let cookieCount = 0;
      for (const cookie of essentialCookies) {
        try {
          const cookieObj = {
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain || '.grok.com',
            path: cookie.path || '/',
            httpOnly: cookie.httpOnly || false,
            secure: cookie.secure !== false ? true : false
          };
          
          // Only add valid expires
          if (cookie.expires && cookie.expires > 0) {
            cookieObj.expires = cookie.expires;
          }
          
          // Only add valid sameSite
          if (cookie.sameSite && ['Strict', 'Lax', 'None'].includes(cookie.sameSite)) {
            cookieObj.sameSite = cookie.sameSite;
          }
          
          await this.page.setCookie(cookieObj);
          console.log(`   ✅ ${cookie.name}`);
          cookieCount++;
        } catch (e) {
          // Skip invalid cookies
        }
      }
      console.log(`✅ Injected ${cookieCount}/${essentialCookies.length} essential cookies`);
    }
    
    // STEP 3: Inject localStorage
    if (sessionData && sessionData.localStorage) {
      console.log('💾 Step 3: Injecting localStorage');
      const localStorage = sessionData.localStorage;
      
      await this.page.evaluate((storageData) => {
        for (const [key, value] of Object.entries(storageData)) {
          try {
            localStorage.setItem(key, String(value));
          } catch (e) {
            // Ignore quota errors
          }
        }
      }, localStorage);
      console.log('✅ localStorage injected');
      
      // Verify age-verif was set
      const ageVerifSet = await this.page.evaluate(() => {
        return localStorage.getItem('age-verif');
      });
      if (ageVerifSet) {
        console.log('✅ Age verification pre-loaded');
      }
    }
    
    // STEP 4: Wait before reload
    console.log('⏳ Waiting 3 seconds for cookies to settle...');
    await this.page.waitForTimeout(3000);
    
    // STEP 5: RELOAD PAGE - CRITICAL! This makes cookies active
    // NOTE: Grok auto-redirects after 5-7s, 8s timeout is sufficient
    console.log('🔄 Step 4: Reloading page to activate cf_clearance cookie');
    try {
      await this.page.reload({ waitUntil: 'domcontentloaded', timeout: 8000 });
      console.log('✅ Page reloaded successfully');
    } catch (e) {
      console.log(`⚠️  Reload timeout: ${e.message}`);
    }
    
    await this.page.waitForTimeout(2000);
    
    // STEP 6: Check for Cloudflare challenges and reload if found
    console.log('🛡️  Checking for Cloudflare...');
    let cloudflareCheckCount = 0;
    const maxCloudflareAttempts = 5;
    
    while (cloudflareCheckCount < maxCloudflareAttempts) {
      const cfStatus = await this.page.evaluate(() => {
        const bodyText = document.body.innerText.toLowerCase();
        const pageTitle = document.title.toLowerCase();
        
        const hasCFChallenge = bodyText.includes('checking your browser') ||
                               bodyText.includes('please stand by') ||
                               bodyText.includes('just a moment') ||
                               bodyText.includes('cloudflare') ||
                               pageTitle.includes('just a moment') ||
                               document.body.querySelector('iframe[src*="challenge"]') !== null;
        
        const hasChatUI = bodyText.includes('hỏi grok') || 
                         bodyText.includes('ask grok') ||
                         !!document.querySelector('div[contenteditable="true"]');
        
        return { hasCFChallenge, hasChatUI };
      });
      
      if (cfStatus.hasChatUI) {
        console.log('✅ Cloudflare passed - Grok UI detected');
        break;
      }
      
      if (cfStatus.hasCFChallenge) {
        cloudflareCheckCount++;
        console.log(`⚠️  Cloudflare challenge detected (attempt ${cloudflareCheckCount}/${maxCloudflareAttempts})`);
        
        if (cloudflareCheckCount < maxCloudflareAttempts) {
          console.log(`🔄 Reloading page to bypass Cloudflare...`);
          try {
            await this.page.reload({ waitUntil: 'domcontentloaded', timeout: 8000 });
            console.log('✅ Page reloaded');
          } catch (e) {
            console.log(`⚠️  Reload error: ${e.message}`);
          }
          await this.page.waitForTimeout(3000);
        }
      } else {
        console.log('✅ Cloudflare check passed');
        break;
      }
    }
    
    // STEP 7: Check if we're on chat page
    const isOnChatPage = await this._checkChatPageReady();
    
    if (isOnChatPage) {
      console.log('✅ Grok ready (chat page detected)');
      await this._handleAgeVerification();
      return true;
    }
    
    // STEP 8: Wait for the chat input
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
    console.log('');

    try {
      // 💫 NEW: Use /imagine command for cleaner prompt handling
      // This lets Grok properly understand the structured prompt
      const fullPrompt = `/imagine ${prompt}`;
      
      await this._typePrompt(fullPrompt);
      
      // Send message
      await this._sendMessage();
      
      // Wait for image generation
      console.log('⏳ Waiting for image generation...');
      const imageUrl = await this._waitForGeneratedImage();
      
      if (!imageUrl) {
        throw new Error('No image generated');
      }
      
      console.log('✅ Image generated');
      console.log(`URL: ${imageUrl}`);
      
      // Download image if requested
      if (options.download) {
        const downloadPath = await this._downloadImage(imageUrl, options.outputPath);
        console.log(`💾 Downloaded to: ${downloadPath}`);
        
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
      await this.screenshot({ 
        path: path.join(process.cwd(), 'temp', `grok-gen-error-${Date.now()}.png`) 
      });
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
        console.log(`${'─'.repeat(80)}`);
        console.log(`   📝 FULL PROMPT:\n`);
        console.log(generationPrompts[i].prompt);
        console.log(`${'─'.repeat(80)}\n`);
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
          console.log(`[STEP A] 📝 Generating ${type.toUpperCase()} image (${prompt.length} chars)...`);
          console.log(`${'─'.repeat(80)}`);
          console.log(`📋 PROMPT FOR ${type.toUpperCase()}:\n`);
          console.log(prompt);
          console.log(`${'─'.repeat(80)}\n`);
          const generatedResult = await this.generateImage(prompt, {
            download: true,
            outputPath: outputDir
          });

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
          console.error(`❌ IMAGE ${imageNumber} (${type}) FAILED: ${promptError.message}`);
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
      return `${basePrompt}. Make sure the character is clearly wearing or displaying the ${productName}.`;
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
      return `${basePrompt}. Make sure the character is clearly holding the ${productName} in a natural and appealing way.`;
    }
    
    return `Generate a professional product photo showing a model holding the ${productName}. The model should look natural and confident, with good lighting and clear visibility of the product in their hands.`;
  }

  /**
   * Generate video with Grok
   */
  async generateVideo(prompt, options = {}) {
    console.log('\n🎬 GROK VIDEO GENERATION');
    console.log('='.repeat(80));
    console.log(`Prompt: ${prompt}`);
    console.log('');

    try {
      // Type prompt with video generation trigger
      const fullPrompt = `Generate a video: ${prompt}`;
      
      await this._typePrompt(fullPrompt);
      
      // Send message
      await this._sendMessage();
      
      // Wait for video generation (takes longer)
      console.log('⏳ Waiting for video generation (this may take a while)...');
      const videoUrl = await this._waitForGeneratedVideo();
      
      if (!videoUrl) {
        throw new Error('No video generated');
      }
      
      console.log('✅ Video generated');
      console.log(`URL: ${videoUrl}`);
      
      // Download video if requested
      if (options.download) {
        const downloadPath = await this._downloadVideo(videoUrl, options.outputPath);
        console.log(`💾 Downloaded to: ${downloadPath}`);
        
        return {
          url: videoUrl,
          path: downloadPath
        };
      }
      
      return {
        url: videoUrl
      };

    } catch (error) {
      console.error('❌ Grok video generation failed:', error.message);
      await this.screenshot({ 
        path: path.join(process.cwd(), 'temp', `grok-video-error-${Date.now()}.png`) 
      });
      throw error;
    }
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

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  async _uploadImage(imagePath) {
    console.log(`📤 Uploading via clipboard paste: ${path.basename(imagePath)}`);
    
    // Read image file as base64
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    
    // Determine MIME type from extension
    const ext = path.extname(imagePath).toLowerCase();
    const mimeMap = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp' };
    const mimeType = mimeMap[ext] || 'image/png';
    const fileName = path.basename(imagePath);
    
    // Wait for page to be fully loaded
    await this.page.waitForTimeout(1000);
    
    // Find the contenteditable input area (Grok's "Hỏi Grok" / TipTap ProseMirror editor)
    const editorSelectors = [
      'div[contenteditable="true"].tiptap',
      'div[contenteditable="true"].ProseMirror',
      'div[contenteditable="true"]:not(:empty), div[contenteditable="true"]:empty',
      'div[contenteditable="true"]',
      '[contenteditable="true"]',
      'textarea',
      '[role="textbox"]'
    ];
    
    let editor = null;
    let foundSelector = null;
    
    for (const selector of editorSelectors) {
      try {
        editor = await this.page.$(selector);
        if (editor) {
          foundSelector = selector;
          console.log(`   ✅ Found editor with selector: ${selector}`);
          break;
        }
      } catch (e) {
        console.log(`   ⏭️  Selector not found: ${selector}`);
      }
    }
    
    if (!editor) {
      // Debug info: check page state
      const pageInfo = await this.page.evaluate(() => {
        return {
          url: window.location.href,
          title: document.title,
          hasContentEditable: !!document.querySelector('[contenteditable="true"]'),
          hasTextarea: !!document.querySelector('textarea'),
          inputCount: document.querySelectorAll('input').length,
          bodyText: document.body.innerText?.substring(0, 200)
        };
      });
      
      console.log('❌ Editor not found. Page state:');
      console.log(`   URL: ${pageInfo.url}`);
      console.log(`   Title: ${pageInfo.title}`);
      console.log(`   Has contenteditable: ${pageInfo.hasContentEditable}`);
      console.log(`   Has textarea: ${pageInfo.hasTextarea}`);
      console.log(`   Input count: ${pageInfo.inputCount}`);
      
      // Take screenshot for debugging
      try {
        const screenshotPath = path.join(process.cwd(), 'backend', 'debug-no-input.png');
        await this.page.screenshot({ path: screenshotPath });
        console.log(`   📸 Screenshot saved: ${screenshotPath}`);
      } catch (e) {
        console.log(`   Screenshot failed: ${e.message}`);
      }
      
      throw new Error('Could not find Grok input area. Page may not be fully loaded.');
    }
    
    // Click to focus the editor
    await editor.click();
    await this.page.waitForTimeout(500);
    
    // Method 1: Simulate paste event with image data
    const pasteSuccess = await this.page.evaluate(async (base64, mime, name) => {
      try {
        // Convert base64 to binary
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: mime });
        const file = new File([blob], name, { type: mime });
        
        // Create DataTransfer with the file
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        
        // Find the contenteditable element
        const editorEl = document.querySelector('div[contenteditable="true"].tiptap') ||
                         document.querySelector('div[contenteditable="true"].ProseMirror') ||
                         document.querySelector('div[contenteditable="true"]') ||
                         document.querySelector('[contenteditable="true"]');
        
        if (!editorEl) return { success: false, error: 'Editor not found in evaluate' };
        
        // Focus the editor
        editorEl.focus();
        
        // Create and dispatch paste event
        const pasteEvent = new ClipboardEvent('paste', {
          bubbles: true,
          cancelable: true,
          clipboardData: dataTransfer
        });
        
        editorEl.dispatchEvent(pasteEvent);
        return { success: true };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }, base64Image, mimeType, fileName);
    
    if (pasteSuccess.success) {
      console.log('   ✅ Paste event dispatched');
    } else {
      console.log(`   ⚠️  Paste method 1 failed: ${pasteSuccess.error}`);
      
      // Method 2: Use CDP to write image to clipboard and then paste via keyboard
      console.log('   Trying CDP clipboard method...');
      try {
        const client = await this.page.context().newCDPSession(this.page);
        
        // Grant clipboard permissions
        await client.send('Browser.grantPermissions', {
          permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'],
          origin: 'https://grok.com'
        });
        
        // Write image to clipboard using Clipboard API
        await this.page.evaluate(async (base64, mime) => {
          const binaryString = atob(base64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: mime });
          
          const clipboardItem = new ClipboardItem({ [mime]: blob });
          await navigator.clipboard.write([clipboardItem]);
        }, base64Image, mimeType);
        
        console.log('   ✅ Image written to clipboard');
        
        // Now paste using keyboard shortcut
        await this.page.keyboard.down('Control');
        await this.page.keyboard.press('v');
        await this.page.keyboard.up('Control');
        
        console.log('   ✅ Ctrl+V paste executed');
      } catch (cdpError) {
        console.log(`   ⚠️  CDP method failed: ${cdpError.message}`);
        
        // Method 3: Fallback - try traditional file input approach
        console.log('   Trying file input fallback...');
        
        const attachBtnSelectors = [
          'button[aria-label*="Attach"]',
          'button[aria-label*="attach"]',
          'button[aria-label*="upload"]',
          'button[aria-label*="image"]'
        ];
        
        for (const selector of attachBtnSelectors) {
          try {
            const btn = await this.page.$(selector);
            if (btn) {
              await btn.click();
              await this.page.waitForTimeout(1000);
              break;
            }
          } catch (e) {}
        }
        
        const fileInput = await this.page.$('input[type="file"]');
        if (fileInput) {
          await fileInput.setInputFiles(imagePath);
          console.log('   ✅ File uploaded via input fallback');
        } else {
          await this.screenshot({ 
            path: path.join(process.cwd(), 'temp', `grok-upload-debug-${Date.now()}.png`) 
          });
          throw new Error('All upload methods failed. Could not upload image.');
        }
      }
    }
    
    // Wait for image to be processed
    await this.page.waitForTimeout(3000);
    
    // Verify image was attached
    const hasAttachment = await this.page.evaluate(() => {
      const previews = document.querySelectorAll('img[src*="blob:"], img[src*="data:"], [class*="preview"], [class*="thumbnail"], [class*="attachment"]');
      return previews.length > 0;
    });
    
    if (hasAttachment) {
      console.log('✅ Image attached (preview detected)');
    } else {
      console.log('⚠️  Image paste completed but no preview detected (may still work)');
    }
  }

  async _typePrompt(prompt) {
    console.log('⌨️  Typing prompt (fast method)...');
    
    // Wait a moment for any upload preview to settle
    await this.page.waitForTimeout(500);
    
    // Find the contenteditable editor
    const editorSelectors = [
      'div[contenteditable="true"].tiptap',
      'div[contenteditable="true"].ProseMirror',
      'div[contenteditable="true"]',
      '[contenteditable="true"]',
      'textarea',
      '[role="textbox"]'
    ];
    
    let editorSelector = null;
    for (const selector of editorSelectors) {
      const el = await this.page.$(selector);
      if (el) {
        editorSelector = selector;
        break;
      }
    }
    
    if (!editorSelector) {
      throw new Error('Could not find text input');
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