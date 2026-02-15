import BrowserService from './browserService.js';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

/**
 * Grok Service V2 - Full Automation
 * Supports: Image Analysis, Image Generation, Video Generation
 * No login required!
 */
class GrokServiceV2 extends BrowserService {
  constructor(options = {}) {
    super(options);
    this.baseUrl = 'https://grok.com';
  }

  /**
   * Initialize Grok (no login needed!)
   */
  async initialize() {
    await this.launch();
    await this.goto(this.baseUrl);
    
    console.log('⏳ Waiting for Grok to load...');
    await this.page.waitForTimeout(3000);
    
    // Check if we can use without login
    const canUseWithoutLogin = await this.page.evaluate(() => {
      return document.body.innerText.includes('Bận dạng nghĩ gì?') ||
             document.body.innerText.includes('Ask anything') ||
             document.body.innerText.includes('What\'s on your mind') ||
             document.querySelector('textarea') !== null ||
             document.querySelector('[contenteditable="true"]') !== null;
    });
    
    if (canUseWithoutLogin) {
      console.log('✅ Grok ready (no login required)');
      return true;
    }
    
    console.log('⚠️  Login may be required');
    return false;
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
    console.log(`📤 Uploading: ${path.basename(imagePath)}`);
    
    // Look for file input
    let fileInput = await this.page.$('input[type="file"]');
    
    if (!fileInput) {
      // Try to find upload button
      const buttons = await this.page.$$('button, [role="button"], [class*="upload"], [class*="attach"]');
      
      for (const button of buttons) {
        try {
          const ariaLabel = await button.getAttribute('aria-label') || '';
          const title = await button.getAttribute('title') || '';
          const text = await button.textContent() || '';
          
          if (
            ariaLabel.toLowerCase().includes('upload') ||
            ariaLabel.toLowerCase().includes('attach') ||
            ariaLabel.toLowerCase().includes('image') ||
            title.toLowerCase().includes('upload') ||
            title.toLowerCase().includes('attach') ||
            text.toLowerCase().includes('upload') ||
            text.toLowerCase().includes('attach')
          ) {
            await button.click();
            await this.page.waitForTimeout(1000);
            break;
          }
        } catch (e) {
          // Continue to next button
        }
      }
    }
    
    // Try again to find file input
    try {
      fileInput = await this.page.waitForSelector('input[type="file"]', {
        timeout: 5000,
        state: 'attached'
      });
    } catch (e) {
      // Try one more approach - look for any input that accepts files
      fileInput = await this.page.$('input[accept*="image"], input[accept*="file"]');
    }
    
    if (!fileInput) {
      throw new Error('Could not find file upload input');
    }
    
    await fileInput.setInputFiles(imagePath);
    await this.page.waitForTimeout(2000);
    
    console.log('✅ Image uploaded');
  }

  async _typePrompt(prompt) {
    console.log('⌨️  Typing prompt...');
    
    const textareaSelectors = [
      'textarea',
      '[contenteditable="true"]',
      'input[type="text"]',
      '[role="textbox"]',
      '[data-testid="message-input"]'
    ];
    
    let textarea = null;
    
    for (const selector of textareaSelectors) {
      try {
        textarea = await this.page.waitForSelector(selector, {
          timeout: 3000,
          state: 'visible'
        });
        
        if (textarea) {
          const isVisible = await textarea.isVisible();
          const isEnabled = await textarea.isEnabled();
          
          if (isVisible && isEnabled) {
            break;
          }
        }
      } catch (e) {
        // Try next selector
        continue;
      }
    }
    
    if (!textarea) {
      throw new Error('Could not find text input');
    }
    
    await textarea.click();
    await this.page.waitForTimeout(500);
    await textarea.fill(prompt);
    await this.page.waitForTimeout(1000);
    
    console.log('✅ Prompt entered');
  }

  async _sendMessage() {
    console.log('📤 Sending message...');
    
    // Try to find send button first
    const sendButton = await this.page.$('button[type="submit"], button:has-text("Send"), button[aria-label*="send"], button[aria-label*="Submit"]');
    
    if (sendButton) {
      await sendButton.click();
    } else {
      // Try Enter key
      await this.page.keyboard.press('Enter');
    }
    
    await this.page.waitForTimeout(2000);
    
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
