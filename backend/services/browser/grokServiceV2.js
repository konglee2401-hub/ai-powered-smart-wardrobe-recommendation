import BrowserService from './browserService.js';
import SessionManager from './sessionManager.js';
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
   * Initialize Grok with session reuse and Cloudflare bypass
   */
  async initialize() {
    await this.launch();
    
    // Try to load and inject session
    await this._loadAndInjectSession();
    
    // Navigate to Grok main page (NOT /chat)
    await this.goto('https://grok.com');
    
    console.log('⏳ Waiting for Grok to load...');
    await this.page.waitForTimeout(3000);
    
    // Check for Cloudflare challenge - if detected, just reload the page
    let cloudflareCheckCount = 0;
    while (cloudflareCheckCount < 3) {
      const isCloudflareChallenge = await this.page.evaluate(() => {
        return document.body.innerText.includes('Checking your browser') ||
               document.body.innerText.includes('Please stand by') ||
               document.body.innerText.includes('Just a moment') ||
               document.body.querySelector('iframe[src*="challenge"]') !== null ||
               document.body.querySelector('input[name="cf-turnstile-response"]') !== null;
      });
      
      if (isCloudflareChallenge) {
        console.log(`⚠️  Cloudflare challenge detected (attempt ${cloudflareCheckCount + 1}), reloading...`);
        await this.page.reload({ waitUntil: 'networkidle2' });
        await this.page.waitForTimeout(3000);
        cloudflareCheckCount++;
      } else {
        break;
      }
    }
    
    // After potential Cloudflare bypass, check if we're on chat page
    const isOnChatPage = await this._checkChatPageReady();
    
    if (isOnChatPage) {
      console.log('✅ Grok ready (chat page detected)');
      
      // Check for age verification modal
      await this._handleAgeVerification();
      
      return true;
    }
    
    // Try to wait for the chat input to appear
    console.log('⏳ Waiting for chat input to appear...');
    try {
      await this.page.waitForSelector('[contenteditable="true"], textarea', { timeout: 10000 });
      console.log('✅ Grok ready (chat input found)');
      
      // Check for age verification modal
      await this._handleAgeVerification();
      
      return true;
    } catch (e) {
      console.log('⚠️  Chat input not found, but continuing...');
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
      
      // Essential cookies
      const essentialCookies = ['cf_clearance', '__cf_bm', 'sso', 'sso-rw', 'x-userid'];
      const filteredCookies = sessionData.cookies?.filter(c => essentialCookies.includes(c.name)) || [];
      
      console.log(`🍪 Loading session with ${filteredCookies.length} essential cookies`);
      
      // Inject cookies
      for (const cookie of filteredCookies) {
        try {
          await this.page.setCookie({
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain || '.grok.com',
            path: cookie.path || '/',
            expires: cookie.expires,
            httpOnly: cookie.httpOnly || false,
            secure: cookie.secure || true,
            sameSite: cookie.sameSite || 'None'
          });
          console.log(`   ✅ ${cookie.name}`);
        } catch (e) {
          console.log(`   ⚠️  Could not set cookie ${cookie.name}: ${e.message}`);
        }
      }
      
      // Inject localStorage
      const essentialLocalStorage = ['xai-ff-bu', 'chat-preferences', 'user-settings', 'anonUserId'];
      const filteredLocalStorage = {};
      for (const key of essentialLocalStorage) {
        if (sessionData.localStorage?.[key] !== undefined) {
          filteredLocalStorage[key] = sessionData.localStorage[key];
        }
      }
      
      if (Object.keys(filteredLocalStorage).length > 0) {
        console.log(`💾 Injecting ${Object.keys(filteredLocalStorage).length} localStorage keys`);
        await this.page.evaluate((storageData) => {
          for (const [key, value] of Object.entries(storageData)) {
            try {
              localStorage.setItem(key, value);
            } catch (e) {}
          }
        }, filteredLocalStorage);
        console.log('   ✅ localStorage injected');
      }
      
      console.log('✅ Session loaded and injected');
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
    console.log(`Prompt: ${prompt}`);
    console.log('');

    try {
      // Type prompt with image generation trigger
      const fullPrompt = options.useImagine 
        ? `/imagine ${prompt}` 
        : `Generate an image: ${prompt}`;
      
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
    
    // Find the contenteditable input area (Grok's "Hỏi Grok" / TipTap ProseMirror editor)
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
          console.log(`   Found editor: ${selector}`);
          break;
        }
      } catch (e) {}
    }
    
    if (!editor) {
      throw new Error('Could not find Grok input area');
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

  async _waitForResponse(maxWait = 90000) {
    console.log('⏳ Waiting for response...');
    
    let lastLength = 0;
    let stableCount = 0;
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWait) {
      const currentText = await this.page.evaluate(() => document.body.innerText);
      const currentLength = currentText.length;
      
      if (currentLength === lastLength) {
        stableCount++;
        if (stableCount >= 3) break;
      } else {
        stableCount = 0;
      }
      
      lastLength = currentLength;
      await this.page.waitForTimeout(1000);
    }
    
    console.log('✅ Response received');
    
    // Extract response
    const response = await this.page.evaluate(() => {
      // Try to find response container
      const containers = document.querySelectorAll('[class*="message"], [class*="response"], [class*="assistant"], [data-role="assistant"]');
      
      if (containers.length > 0) {
        const lastContainer = containers[containers.length - 1];
        return lastContainer.innerText;
      }
      
      return document.body.innerText;
    });
    
    return response;
  }

  async _waitForGeneratedImage(maxWait = 120000) {
    console.log('⏳ Waiting for generated image...');
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWait) {
      // Check for age verification modal and dismiss if present - same as test script
      await this._checkAndDismissAgeVerification();
      
      // Look for image elements
      const imageUrl = await this.page.evaluate(() => {
        const images = document.querySelectorAll('img');
        
        for (const img of images) {
          const src = img.src;
          
          // Look for generated image URLs
          if (
            src.includes('generated') ||
            src.includes('image') ||
            src.includes('cdn') ||
            src.includes('grok') ||
            (src.startsWith('https://') && !src.includes('logo') && !src.includes('icon') && !src.includes('avatar'))
          ) {
            // Check if image is large enough (likely generated)
            if (img.naturalWidth > 200 && img.naturalHeight > 200) {
              return src;
            }
          }
        }
        
        return null;
      });
      
      if (imageUrl) {
        return imageUrl;
      }
      
      await this.page.waitForTimeout(2000);
    }
    
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

  async _downloadImage(url, outputPath) {
    const filename = outputPath || path.join(
      process.cwd(), 
      'temp', 
      `grok-generated-${Date.now()}.png`
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
}

export default GrokServiceV2;