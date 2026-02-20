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
      // Wait for page to load
      await this.page.waitForTimeout(3000);

      // Try multiple selectors for the input (Puppeteer API)
      console.log('⌨️  Looking for text input...');
      
      const inputSelectors = [
        'textarea',
        'input[type="text"]',
        'div[contenteditable="true"]'
      ];
      
      let filled = false;
      for (const selector of inputSelectors) {
        try {
          const element = await this.page.$(selector);
          if (element) {
            console.log(`   Found input: ${selector}`);
            // Use Puppeteer method - click then type
            await this.page.click(selector);
            await this.page.waitForTimeout(500);
            await this.page.keyboard.type(prompt, { delay: 30 });
            filled = true;
            console.log('   ✅ Filled prompt');
            break;
          }
        } catch (e) {
          console.log(`   ⚠️ Error with ${selector}: ${e.message}`);
        }
      }
      
      if (!filled) {
        throw new Error('Could not find any text input');
      }
      
      await this.page.waitForTimeout(1000);

      // Find and click generate button (Puppeteer API)
      console.log('🔍 Looking for generate button...');
      
      const buttonSelectors = [
        'button',
        '[role="button"]',
        'input[type="submit"]'
      ];
      
      let generateButton = null;
      for (const selector of buttonSelectors) {
        try {
          const buttons = await this.page.$$(selector);
          for (const btn of buttons) {
            const text = await this.page.evaluate(el => el.textContent, btn);
            if (text && (text.includes('Generate') || text.includes('Start') || text.includes('Create') || text.includes('Tạo'))) {
              generateButton = btn;
              console.log(`   Found button: "${text.trim()}"`);
              break;
            }
          }
          if (generateButton) break;
        } catch (e) {
          // Continue
        }
      }
      
      if (generateButton) {
        await generateButton.click();
        console.log('   ✅ Clicked generate button');
      } else {
        console.log('   ⚠️ No generate button found, pressing Enter');
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
    
    // Get initial image URLs to ignore them
    const initialImages = await this.page.evaluate(() => {
      const images = document.querySelectorAll('img');
      return Array.from(images).map(img => img.src).filter(src => src.startsWith('https://'));
    });
    
    console.log(`   Initial images on page: ${initialImages.length}`);
    
    while (Date.now() - startTime < maxWait) {
      // Wait a bit before checking
      await this.page.waitForTimeout(3000);
      
      const imageUrl = await this.page.evaluate((initialImgs) => {
        const images = document.querySelectorAll('img');
        
        for (const img of images) {
          const src = img.src;
          
          // Skip initial images (logos, existing images)
          if (initialImgs.includes(src)) continue;
          
          // Skip small images (icons, avatars, logos)
          if (img.naturalWidth < 400 || img.naturalHeight < 400) continue;
          
          // Skip known non-generated sources
          if (src.includes('logo') || src.includes('icon') || src.includes('avatar') || src.includes('profile')) continue;
          
          // Accept generated images
          if (
            src.includes('generated') ||
            src.includes('result') ||
            src.includes('output') ||
            src.includes('blob') ||
            src.startsWith('https://')
          ) {
            return src;
          }
        }
        
        return null;
      }, initialImages);
      
      if (imageUrl) {
        console.log(`   ✅ Found new generated image: ${imageUrl.substring(0, 80)}...`);
        return imageUrl;
      }
      
      console.log(`   ⏳ Waiting for new image... (${Math.floor((Date.now() - startTime)/1000)}s)`);
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
