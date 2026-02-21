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
    
    await this.launch();
    
    // Try to load existing session
    const sessionLoaded = await this._loadAndInjectSession();
    
    // Navigate to Lab Flow
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
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          const text = btn.textContent.toLowerCase();
          if (text.includes('tạo hình ảnh') || 
              text.includes('create image') || 
              text.includes('generate image')) {
            btn.scrollIntoView({ block: 'center' });
            btn.click();
            return true;
          }
        }
        return false;
      });

      if (createImageButton) {
        console.log('✅ Clicked Create Image button');
        await this.page.waitForTimeout(2000);
      } else {
        console.warn('⚠️  Could not find Create Image button, attempting to find text input anyway');
      }

      // Find text input with better handling
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
      
      // Focus and type using page.type for more reliable input
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
      }

      // Find text input
      const textarea = await this.page.waitForSelector('textarea, [contenteditable="true"], input[type="text"]', { timeout: 10000 });
      
      if (!textarea) {
        throw new Error('Could not find text input');
      }

      // Type prompt
      console.log('⌨️  Typing prompt...');
      await textarea.click();
      await this.page.waitForTimeout(500);
      await textarea.fill(prompt);
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
