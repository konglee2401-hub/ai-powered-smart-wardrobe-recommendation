import BrowserService from './browserService.js';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

/**
 * Z.AI Image Service (image.z.ai)
 * Similar to chat.z.ai but for image generation
 */
class ZAIImageService extends BrowserService {
  constructor(options = {}) {
    super(options);
    this.baseUrl = 'https://image.z.ai';
  }

  async initialize() {
    await this.launch();
    await this.goto(this.baseUrl);
    
    console.log('⏳ Waiting for Z.AI Image to load...');
    await this.page.waitForTimeout(3000);
    
    console.log('✅ Z.AI Image initialized');
  }

  async generateImage(prompt, options = {}) {
    console.log('\n🎨 Z.AI IMAGE GENERATION');
    console.log('='.repeat(80));
    console.log(`Prompt: ${prompt}`);
    console.log('');

    try {
      // Find text input
      const textarea = await this.page.waitForSelector(
        'textarea, [contenteditable="true"], input[type="text"]',
        { timeout: 10000 }
      );

      if (!textarea) {
        throw new Error('Could not find text input');
      }

      // Type prompt
      console.log('⌨️  Typing prompt...');
      await textarea.click();
      await this.page.waitForTimeout(500);
      await textarea.fill(prompt);
      await this.page.waitForTimeout(1000);

      // Find and click generate button
      console.log('🔍 Looking for generate button...');
      const generateButton = await this.page.$('button:has-text("Start Generation"), button:has-text("Generate"), button[type="submit"]');
      
      if (generateButton) {
        await generateButton.click();
      } else {
        await this.page.keyboard.press('Enter');
      }

      console.log('✅ Generation started');
      console.log('⏳ Waiting for image generation...');

      // Wait for generated image
      const imageUrl = await this._waitForGeneratedImage();

      if (!imageUrl) {
        throw new Error('No image generated');
      }

      console.log('✅ Image generated');
      console.log(`URL: ${imageUrl}`);

      // Download if requested
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
      console.error('❌ Z.AI image generation failed:', error.message);
      await this.screenshot({ 
        path: path.join(process.cwd(), 'temp', `zai-image-error-${Date.now()}.png`) 
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
          const src = img.src;
          
          if (
            src.includes('generated') ||
            src.includes('result') ||
            src.includes('output') ||
            (src.startsWith('https://') && 
             !src.includes('logo') && 
             !src.includes('icon') &&
             !src.includes('avatar') &&
             img.naturalWidth > 200)
          ) {
            return src;
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

  async _downloadImage(url, outputPath) {
    const filename = outputPath || path.join(
      process.cwd(), 
      'temp', 
      `zai-image-${Date.now()}.png`
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

export default ZAIImageService;
