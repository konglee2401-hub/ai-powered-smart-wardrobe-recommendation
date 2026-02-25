import BrowserService from './browserService.js';
import SessionManager from './sessionManager.js';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import os from 'os';

/**
 * Google Labs Flow Service (Puppeteer-only)
 * Image & Video generation using Puppeteer automation
 * Requires Google login (session persistence)
 */
class GoogleFlowService extends BrowserService {
  constructor(options = {}) {
    const sessionManager = new SessionManager('google-flow');
    
    super({
      ...options,
      sessionManager
    });
    
    this.baseUrl = 'https://labs.google/fx/vi/tools/flow';
    this.projectUrl = 'https://labs.google/fx/vi/tools/flow/project/3ba9e02e-0a33-4cf2-9d55-4c396941d7b7';
    this.chromeProfile = options.chromeProfile; // e.g., 'Cong' for modluffy90@gmail.com
  }

  /**
   * Initialize Google Flow with session management
   * @param {Object} options - Configuration options
   * @param {string} options.chromeProfile - Chrome profile folder name (e.g., 'Cong' for modluffy90@gmail.com)
   */
  async initialize(options = {}) {
    // If Chrome profile specified, update launch options
    if (options.chromeProfile || this.chromeProfile) {
      const profile = options.chromeProfile || this.chromeProfile;
      console.log(`🔐 Using Chrome profile: ${profile}`);
      this.browserOptions = {
        ...this.browserOptions,
        userDataDir: path.join(
          process.env.USERPROFILE,
          `AppData/Local/Google/Chrome/User Data/${profile}`
        )
      };
    }
    
    await this.launch({ 
      chromeProfile: options.chromeProfile || this.chromeProfile,
      skipSession: options.skipSession 
    });
    
    // Try to load existing session (unless skipSession is enabled)
    let sessionLoaded = false;
    if (!options.skipSession) {
      sessionLoaded = await this._loadAndInjectSession();
    } else {
      console.log('⏭️  Skipping session loading - testing Profile auto-login');
    }
    
    // Navigate to Lab Flow landing page
    try {
      await this.goto(this.baseUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    } catch (error) {
      console.warn(`⚠️  Navigation warning: ${error.message}`);
      // Try again with simpler wait
      await this.goto(this.baseUrl, { timeout: 30000 });
    }
    
    console.log('⏳ Waiting for Google Flow to load...');
    await this.page.waitForTimeout(3000);
    
    // Check if already logged in (look for "Dự án mới" or create project UI)
    const isLoggedIn = await this._checkIfLoggedIn();
    
    if (!isLoggedIn) {
      console.log('⚠️  Google login required');
      console.log('\n📋 Instructions:');
      console.log('   1. Login with your Google account in the browser window');
      console.log('   2. Complete any verification if asked');
      if (options.chromeProfile || this.chromeProfile) {
        console.log('   3. Chrome profile will auto-fill your email');
      }
      console.log('   4. Browser will detect login automatically\n');
      console.log('⏳ Waiting 120 seconds for manual login...\n');
      
      // Show countdown
      for (let i = 120; i > 0; i--) {
        process.stdout.write(`⏳ ${i}s remaining...\r`);
        await this.page.waitForTimeout(1000);
      }
      
      console.log('                      ');
      console.log('✅ 120 seconds elapsed\n');
      
      // Save session after login
      const saved = await this.saveSession();
      if (saved) {
        console.log('💾 Session saved - you won\'t need to login again!\n');
      }
    } else {
      console.log('✅ Already logged in to Google!\n');
    }
    
    // Navigate to project directly or create new project
    console.log('📍 Navigating to project...');
    
    // First, try to navigate to the project URL directly
    try {
      console.log(`🔗 Opening project: ${this.projectUrl}`);
      await this.goto(this.projectUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Check if we're on the project page
      const onProjectPage = await this.page.evaluate(() => {
        // Look for project interface elements (text input, buttons, etc.)
        return document.querySelector('textarea') !== null ||
               document.querySelector('[contenteditable="true"]') !== null ||
               document.querySelector('input[type="text"]') !== null ||
               document.body.innerText.includes('Tạo') || 
               document.body.innerText.includes('Create');
      });
      
      if (onProjectPage) {
        console.log('✅ Successfully navigated to project!');
      } else {
        throw new Error('Project page did not load correctly');
      }
    } catch (projectError) {
      console.warn(`⚠️  Could not navigate to project directly: ${projectError.message}`);
      console.log('📍 Attempting to create new project from landing page...');
      
      // Go back to landing page and click "Dự án mới" (New Project)
      await this.goto(this.baseUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await this.page.waitForTimeout(2000);
      
      // Click "Dự án mới" button
      const clickedNewProject = await this.page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          const text = btn.textContent.toLowerCase();
          if (text.includes('dự án mới') || 
              text.includes('new project') ||
              text.includes('create project')) {
            btn.scrollIntoView({ block: 'center' });
            btn.click();
            return true;
          }
        }
        return false;
      });
      
      if (!clickedNewProject) {
        console.warn('⚠️  Could not find "Dự án mới" button, looking for alternative...');
        
        // Try clicking anything that looks like a create button
        await this.page.evaluate(() => {
          const buttons = document.querySelectorAll('button, [role="button"]');
          for (const btn of buttons) {
            if (btn.textContent.includes('+') || 
                btn.textContent.toLowerCase().includes('create') ||
                btn.textContent.toLowerCase().includes('new')) {
              btn.click();
              return true;
            }
          }
        });
      } else {
        console.log('✅ Clicked "Dự án mới" button');
      }
      
      // Wait for project page to load
      await this.page.waitForTimeout(3000);
      
      // Verify we're on a project page
      const onNewProjectPage = await this.page.evaluate(() => {
        return document.querySelector('textarea') !== null ||
               document.querySelector('[contenteditable="true"]') !== null ||
               document.querySelector('input[type="text"]') !== null;
      });
      
      if (!onNewProjectPage) {
        console.warn('⚠️  Could not enter project interface');
      } else {
        console.log('✅ Successfully entered project interface');
      }
    }
    
    console.log('✅ Google Flow initialized');
  }

  /**
   * Load and inject saved session (cookies + localStorage)
   */
  async _loadAndInjectSession() {
    try {
      const sessionFile = path.join(process.cwd(), '.sessions', 'google-flow-session.json');
      
      if (!fs.existsSync(sessionFile)) {
        return false;
      }
      
      const sessionData = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
      
      // Inject cookies using Puppeteer API
      if (sessionData.cookies && sessionData.cookies.length > 0) {
        console.log(`🍪 Restoring ${sessionData.cookies.length} cookies from session`);
        
        for (const cookie of sessionData.cookies) {
          try {
            await this.page.setCookie({
              name: cookie.name,
              value: cookie.value,
              domain: cookie.domain,
              path: cookie.path || '/',
              expires: cookie.expires,
              httpOnly: cookie.httpOnly || false,
              secure: cookie.secure || true,
              sameSite: cookie.sameSite || 'Lax'
            });
          } catch (e) {
            console.warn(`   ⚠️  Could not set cookie ${cookie.name}`);
          }
        }
        console.log('✅ Cookies injected\n');
      }
      
      // Inject localStorage
      if (sessionData.localStorage && Object.keys(sessionData.localStorage).length > 0) {
        console.log(`💾 Restoring ${Object.keys(sessionData.localStorage).length} localStorage keys`);
        
        await this.page.evaluate((storageData) => {
          Object.entries(storageData).forEach(([key, value]) => {
            try {
              localStorage.setItem(key, value);
            } catch (e) {}
          });
        }, sessionData.localStorage);
        console.log('✅ localStorage injected\n');
      }
      
      return true;
    } catch (error) {
      console.warn(`⚠️  Could not load session: ${error.message}`);
      return false;
    }
  }

  /**
   * Save current session (cookies + localStorage)
   */
  async saveSession() {
    try {
      const sessionFile = path.join(process.cwd(), '.sessions', 'google-flow-session.json');
      
      // Get all cookies
      const cookies = await this.page.cookies();
      
      // Get important localStorage keys
      const localStorage = await this.page.evaluate(() => {
        const keys = [
          'PINHOLE_VIDEO_GENERATION_SETTINGS',
          'PINHOLE_ASSET_VIEW_MEDIA_TYPE',
          'MOST_RECENT_PINHOLE_IMAGE_MODEL_USED',
          'event'
        ];
        const data = {};
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
        service: 'google-flow',
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
      console.log(`   LocalStorage: ${Object.keys(localStorage).length} keys\n`);
      
      return true;
    } catch (error) {
      console.error(`❌ Failed to save session: ${error.message}`);
      return false;
    }
  }

  /**
   * Check if already logged into Google
   * Detects by looking for "Dự án mới" (Create project) button or project creation UI
   */
  async _checkIfLoggedIn() {
    try {
      const isLoggedIn = await this.page.evaluate(() => {
        // Look for signs of logged-in state
        const text = document.body.innerText.toLowerCase();
        
        // Check for login signs: "Dự án mới" (Vietnamese) or "Create" buttons  
        const hasCreateProject = text.includes('dự án mới') || 
                                 text.includes('create') || 
                                 text.includes('project');
        
        // Look for visual indicators of logged-in state
        const buttons = document.querySelectorAll('button');
        let hasProjectButtons = false;
        
        for (const btn of buttons) {
          const btnText = btn.textContent.toLowerCase();
          if (btnText.includes('dự án') || 
              btnText.includes('create') || 
              btnText.includes('mới')) {
            hasProjectButtons = true;
            break;
          }
        }
        
        // Also check for absence of sign-in indicators
        const isOnSignIn = text.includes('sign in') && text.includes('google');
        
        return (hasCreateProject || hasProjectButtons) && !isOnSignIn;
      });
      
      return isLoggedIn;
    } catch (error) {
      console.warn(`⚠️  Login check failed: ${error.message}`);
      return true; // Assume logged in if check fails
    }
  }

  /**
   * Navigate to the editor/generator interface
   * Clicks "Tạo bằng Flow" (Create with Flow) button on landing page
   */
  async _navigateToEditorInterface() {
    try {
      const clickedButton = await this.page.evaluate(() => {
        // Find and click the "Tạo bằng Flow" button
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          const text = btn.textContent.toLowerCase();
          if (text.includes('tạo bằng flow') || text.includes('create with flow')) {
            btn.click();
            return true;
          }
        }
        return false;
      });

      if (!clickedButton) {
        console.warn('⚠️  Could not find "Tạo bằng Flow" button on landing page');
        return false;
      }

      console.log('✅ Clicked "Tạo bằng Flow" button');

      // Wait for editor interface to load
      console.log('⏳ Waiting for editor interface to load...');
      await this.page.waitForTimeout(5000);

      // Check if we can find the textarea (should be in editor now)
      const hasTextarea = await this.page.evaluate(() => {
        const textarea = document.querySelector('textarea');
        return textarea !== null && textarea.offsetParent !== null;
      });

      if (hasTextarea) {
        console.log('✅ Editor interface loaded with textarea');
        return true;
      } else {
        console.warn('⚠️  Editor interface loaded but textarea not found yet');
        // Still return true as we clicked the button successfully
        return true;
      }

    } catch (error) {
      console.warn(`⚠️  Navigation to editor failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Generate image from text prompt
   */
  async generateImage(prompt, options = {}) {
    console.log('\n🎨 GOOGLE FLOW IMAGE GENERATION');
    console.log('='.repeat(80));
    console.log(`Prompt: ${prompt}`);
    console.log('');

    try {
      // Find and click "Create image" button
      const createImageButton = await this.page.evaluate(() => {
        // Try various button text patterns
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          const text = btn.textContent.toLowerCase();
          // Match various languages and patterns
          if (text.includes('tạo hình ảnh') ||      // Vietnamese
              text.includes('create image') ||       // English
              text.includes('generate image') ||     // English alt
              text.includes('tạo') ||                // Vietnamese short
              text.includes('create')) {             // Generic
            try {
              btn.scrollIntoView({ block: 'center' });
              btn.click();
              return true;
            } catch (e) {
              console.warn('  Button found but click failed:', e.message);
              return false;
            }
          }
        }
        
        // If button text not found, try looking for buttons with specific attributes
        const createBtns = document.querySelectorAll('[aria-label*="create"], [aria-label*="Create"], [title*="create"], [title*="Create"]');
        for (const btn of createBtns) {
          if (btn.offsetParent !== null) {
            try {
              btn.scrollIntoView({ block: 'center' });
              btn.click();
              return true;
            } catch (e) {
              // continue
            }
          }
        }
        
        return false;
      });

      if (createImageButton) {
        console.log('✅ Clicked Create Image button');
        await this.page.waitForTimeout(2000);
      } else {
        console.warn('⚠️  Could not find Create Image button, attempting to find text input anyway');
        // Don't fail here - sometimes we can type directly
      }

      // Find text input with better handling
      console.log('⌨️  Looking for text input...');
      
      // Add more wait time for page to fully render
      await this.page.waitForTimeout(1500);
      
      // Try the specific Google Flow textarea ID first (most reliable)
      let textInputFound = await this.page.evaluate(() => {
        // Check for specific textarea with ID (Google Flow uses this)
        const specificTextarea = document.getElementById('PINHOLE_TEXT_AREA_ELEMENT_ID');
        if (specificTextarea && specificTextarea.offsetParent !== null) {
          return { type: 'pinhole-textarea', selector: '#PINHOLE_TEXT_AREA_ELEMENT_ID', found: true };
        }
        return null;
      });
      
      // If specific ID not found, try generic search
      if (!textInputFound) {
        textInputFound = await this.page.evaluate(() => {
          // Try textarea first (most common)
          const textarea = document.querySelector('textarea');
          if (textarea && textarea.offsetParent !== null) {
            return { type: 'textarea', selector: 'textarea', found: true };
          }
          
          // Try contenteditable divs (Google uses these often)
          const contentEditable = document.querySelector('[contenteditable="true"]');
          if (contentEditable && contentEditable.offsetParent !== null) {
            return { type: 'contenteditable', selector: '[contenteditable="true"]', found: true };
          }
          
          // Try input[type="text"]
          const textInput = document.querySelector('input[type="text"]');
          if (textInput && textInput.offsetParent !== null) {
            return { type: 'text-input', selector: 'input[type="text"]', found: true };
          }
          
          // Try generic input without type
          const genericInput = document.querySelector('input');
          if (genericInput && genericInput.offsetParent !== null) {
            const type = genericInput.getAttribute('type') || 'no-type';
            return { type: `input-${type}`, selector: 'input', found: true };
          }
          
          // Debug: show what elements exist
          const textareas = document.querySelectorAll('textarea').length;
          const contentEditables = document.querySelectorAll('[contenteditable="true"]').length;
          const inputs = document.querySelectorAll('input').length;
          const allInputLike = textareas + contentEditables + inputs;
          
          return { 
            type: null, 
            found: false,
            debug: { textareas, contentEditables, inputs, total: allInputLike }
          };
        });
      }

      console.log('  Search result:', textInputFound);
      
      if (!textInputFound || !textInputFound.found) {
        // More detailed error message
        const debugInfo = textInputFound?.debug ? 
          ` (Found: ${textInputFound.debug.textareas} textareas, ${textInputFound.debug.contentEditables} contentEditables, ${textInputFound.debug.inputs} inputs)` :
          '';
        
        // Try to take screenshot for debug
        try {
          const debugScreenshot = path.join(process.cwd(), 'backend/temp', `flow-debug-${Date.now()}.png`);
          await this.screenshot({ path: debugScreenshot });
          console.debug(`  📸 Debug screenshot: ${debugScreenshot}`);
        } catch (e) {
          // ignore screenshot errors
        }
        
        throw new Error(`Could not find text input${debugInfo}`);
      }

      console.log(`✅ Found ${textInputFound.type} at selector: ${textInputFound.selector}`);
      
      // Use enhanced prompt entry strategy (based on imageGenerationService.js)
      const selector = textInputFound.selector;
      
      // Clear existing content first
      await this.page.evaluate((sel) => {
        const elem = document.querySelector(sel);
        if (elem) {
          if (elem.tagName === 'TEXTAREA' || elem.tagName === 'INPUT') {
            elem.value = '';
          } else {
            elem.textContent = '';
          }
          elem.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, selector);
      
      await this.page.waitForTimeout(300);
      
      // Strategy: Type first 20 chars + paste middle + type last 20 chars (ensures better input handling)
      const cleanPrompt = prompt.trim().replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ');
      const typeLength = 20;
      const firstPart = cleanPrompt.substring(0, typeLength);
      const middlePart = cleanPrompt.substring(typeLength, cleanPrompt.length - typeLength);
      const lastPart = cleanPrompt.substring(cleanPrompt.length - typeLength);
      
      console.log(`  → Prompt strategy: Type (${firstPart.length}ch) + Paste (${middlePart.length}ch) + Type (${lastPart.length}ch)`);
      
      // Step 1: Focus and type first part
      await this.page.focus(selector);
      await this.page.waitForTimeout(300);
      
      if (firstPart.length > 0) {
        await this.page.keyboard.type(firstPart, { delay: 50 });
        await this.page.waitForTimeout(300);
      }
      
      // Step 2: Paste middle part
      if (middlePart.length > 0) {
        await this.page.evaluate((sel, text) => {
          const elem = document.querySelector(sel);
          if (elem) {
            elem.value = (elem.value || '') + text;
            elem.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }, selector, middlePart);
        await this.page.waitForTimeout(500);
      }
      
      // Step 3: Type last part
      if (lastPart.length > 0) {
        await this.page.keyboard.type(lastPart, { delay: 50 });
        await this.page.waitForTimeout(300);
      }
      
      // Trigger final events
      await this.page.evaluate((sel) => {
        const elem = document.querySelector(sel);
        if (elem) {
          elem.dispatchEvent(new Event('blur', { bubbles: true }));
          elem.dispatchEvent(new Event('focus', { bubbles: true }));
          elem.dispatchEvent(new Event('input', { bubbles: true }));
          elem.dispatchEvent(new Event('change', { bubbles: true }));
          elem.dispatchEvent(new Event('keyup', { bubbles: true }));
        }
      }, selector);
      
      await this.page.waitForTimeout(1000);

      // Submit by pressing Enter
      await this.page.keyboard.press('Enter');
      
      console.log('✅ Generation started');
      console.log('⏳ Waiting for image generation...');

      // Wait for generated image
      const imageUrl = await this._waitForGeneratedImage();

      if (!imageUrl) {
        throw new Error('No image generated');
      }

      console.log('✅ Image generated');

      // Download if requested
      if (options.download) {
        const downloadPath = await this._downloadImage(imageUrl, options.outputPath);
        
        return {
          url: imageUrl,
          path: downloadPath
        };
      }

      return {
        url: imageUrl
      };

    } catch (error) {
      console.error('❌ Google Flow generation failed:', error.message);
      try {
        await this.screenshot({ 
          path: path.join(process.cwd(), 'temp', `flow-error-${Date.now()}.png`) 
        });
      } catch (e) {}
      throw error;
    }
  }

  /**
   * Generate video from text prompt
   */
  async generateVideo(prompt, options = {}) {
    console.log('\n🎬 GOOGLE FLOW VIDEO GENERATION');
    console.log('='.repeat(80));
    console.log(`Prompt: ${prompt}`);
    console.log('');

    try {
      // Find and click "Create video" button
      const createVideoButton = await this.page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          const text = btn.textContent.toLowerCase();
          if (text.includes('tạo video') || 
              text.includes('create video') || 
              text.includes('generate video') ||
              text.includes('video')) {
            btn.scrollIntoView({ block: 'center' });
            btn.click();
            return true;
          }
        }
        return false;
      });

      if (createVideoButton) {
        console.log('✅ Clicked Create Video button');
        await this.page.waitForTimeout(2000);
      } else {
        console.warn('⚠️  Could not find Create Video button, attempting to find text input anyway');
      }

      // Find text input with better handling (same as generateImage)
      console.log('⌨️  Looking for text input...');
      const textInputFound = await this.page.evaluate(() => {
        // Try textarea
        const textarea = document.querySelector('textarea');
        if (textarea && textarea.offsetParent !== null) {
          return { type: 'textarea', found: true };
        }
        
        // Try contenteditable
        const contentEditable = document.querySelector('[contenteditable="true"]');
        if (contentEditable && contentEditable.offsetParent !== null) {
          return { type: 'contenteditable', found: true };
        }
        
        // Try text input
        const textInput = document.querySelector('input[type="text"]');
        if (textInput && textInput.offsetParent !== null) {
          return { type: 'text-input', found: true };
        }
        
        return { type: null, found: false };
      });

      if (!textInputFound.found) {
        throw new Error(`Could not find text input (${textInputFound.type})`);
      }

      console.log(`⌨️  Found ${textInputFound.type}, typing prompt...`);
      
      // Focus and type using page.type for more reliable input (same as generateImage)
      const selector = textInputFound.type === 'textarea' ? 'textarea' :
                      textInputFound.type === 'contenteditable' ? '[contenteditable="true"]' :
                      'input[type="text"]';
      
      await this.page.focus(selector);
      await this.page.waitForTimeout(500);
      await this.page.type(selector, prompt, { delay: 10 }); // type with small delay
      await this.page.waitForTimeout(1000);

      // Submit by pressing Enter
      await this.page.keyboard.press('Enter');
      
      console.log('✅ Generation started');
      console.log('⏳ Waiting for video generation (this may take a while)...');

      // Wait for generated video
      const videoUrl = await this._waitForGeneratedVideo();

      if (!videoUrl) {
        throw new Error('No video generated');
      }

      console.log('✅ Video generated');

      // Download if requested
      if (options.download) {
        const downloadPath = await this._downloadVideo(videoUrl, options.outputPath);
        
        return {
          url: videoUrl,
          path: downloadPath
        };
      }

      return {
        url: videoUrl
      };

    } catch (error) {
      console.error('❌ Google Flow video generation failed:', error.message);
      await this.screenshot({ 
        path: path.join(process.cwd(), 'temp', `flow-video-error-${Date.now()}.png`) 
      });
      throw error;
    }
  }

  /**
   * Wait for image to be generated (monitors DOM for new images)
   */
  async _waitForGeneratedImage(maxWait = 120000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWait) {
      const imageUrl = await this.page.evaluate(() => {
        const images = document.querySelectorAll('img');
        
        for (const img of images) {
          if (img.naturalWidth > 400 && img.naturalHeight > 400) {
            // Skip logos and icons
            const src = img.src;
            if (!src.includes('logo') && 
                !src.includes('icon') && 
                !src.includes('avatar') &&
                !src.includes('data:')) {
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

  /**
   * Wait for video to be generated (monitors DOM for new videos)
   */
  async _waitForGeneratedVideo(maxWait = 180000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWait) {
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

  /**
   * Download image from URL
   */
  async _downloadImage(url, outputPath) {
    const filename = outputPath || path.join(
      process.cwd(), 
      'temp', 
      `flow-image-${Date.now()}.png`
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
   * Download video from URL
   */
  async _downloadVideo(url, outputPath) {
    const filename = outputPath || path.join(
      process.cwd(), 
      'temp', 
      `flow-video-${Date.now()}.mp4`
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

export default GoogleFlowService;
