import BrowserService from './browserService.js';
import SessionManager from './sessionManager.js';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

/**
 * Google Labs Flow Service
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
  }

  async initialize() {
    await this.launch();
    
    // Add extra CDP protocol to mask automation
    await this._maskAutomation();
    
    await this.goto(this.baseUrl);
    
    console.log('⏳ Waiting for Google Flow to load...');
    await this.page.waitForTimeout(3000);
    
    // Check if logged in
    const isLoggedIn = await this._checkIfLoggedIn();
    
    if (!isLoggedIn) {
      console.log('⚠️  Google login required');
      console.log('\n📋 Instructions:');
      console.log('   1. Login with your Google account in the browser window');
      console.log('   2. Complete any verification if asked');
      console.log('   3. Browser will close after successful login\n');
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
   * Mask Playwright automation to avoid bot detection
   */
  async _maskAutomation() {
    try {
      // Override chrome object to look more like real browser
      await this.page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', {
          get: () => false,
        });
        
        Object.defineProperty(navigator, 'plugins', {
          get: () => [1, 2, 3, 4, 5],
        });
        
        Object.defineProperty(navigator, 'languages', {
          get: () => ['en-US', 'en'],
        });

        // Mock chrome object for Google services
        window.chrome = {
          runtime: {}
        };
        
        // Pass headless check
        Object.defineProperty(document, 'hidden', {
          get: () => false,
        });
        
        Object.defineProperty(document, 'visibilityState', {
          get: () => 'visible',
        });
      });
      
      console.log('✅ Browser automation masked');
    } catch (error) {
      console.warn('⚠️  Could not mask automation:', error.message);
    }
  }

  async _checkIfLoggedIn() {
    try {
      const loginButton = await this.page.$('text=Sign in, button:has-text("Sign in")');
      return !loginButton;
    } catch {
      return true;
    }
  }

  async generateImage(prompt, options = {}) {
    console.log('\n🎨 GOOGLE FLOW IMAGE GENERATION');
    console.log('='.repeat(80));
    console.log(`Prompt: ${prompt}`);
    console.log('');

    try {
      // Find "Tạo hình ảnh" (Create image) button
      const createImageButton = await this.page.$('button:has-text("Tạo hình ảnh"), button:has-text("Create image"), button:has-text("Image")');
      
      if (createImageButton) {
        await createImageButton.click();
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

      // Submit
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
      await this.screenshot({ 
        path: path.join(process.cwd(), 'temp', `flow-error-${Date.now()}.png`) 
      });
      throw error;
    }
  }

  async generateVideo(prompt, options = {}) {
    console.log('\n🎬 GOOGLE FLOW VIDEO GENERATION');
    console.log('='.repeat(80));
    console.log(`Prompt: ${prompt}`);
    console.log('');

    try {
      // Find "Tạo video" (Create video) button
      const createVideoButton = await this.page.$('button:has-text("Tạo video"), button:has-text("Create video"), button:has-text("Video")');
      
      if (createVideoButton) {
        await createVideoButton.click();
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

      // Submit
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

  async _waitForGeneratedImage(maxWait = 120000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWait) {
      const imageUrl = await this.page.evaluate(() => {
        const images = document.querySelectorAll('img');
        
        for (const img of images) {
          if (img.naturalWidth > 400 && img.naturalHeight > 400) {
            // Skip logos and icons
            const src = img.src;
            if (!src.includes('logo') && !src.includes('icon') && !src.includes('avatar')) {
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
