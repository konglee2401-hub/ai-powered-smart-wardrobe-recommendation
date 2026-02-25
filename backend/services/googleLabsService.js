// Google Labs Automation Service
// Uses Puppeteer to automate Google Labs image generation

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

class GoogleLabsAutomation {
  constructor() {
    this.browser = null;
    this.page = null;
    this.isInitialized = false;
    this.cookiesPath = path.join(__dirname, '../data/google-labs-cookies.json');
  }
  
  /**
   * Initialize browser
   */
  async init() {
    if (this.isInitialized && this.browser) {
      console.log('✅ Browser already initialized');
      return;
    }
    
    console.log('🚀 Initializing Google Labs browser...');
    
    this.browser = await puppeteer.launch({
      headless: false, // Keep false for easier debugging and manual login
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--window-size=1920,1080',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ],
      defaultViewport: {
        width: 1920,
        height: 1080
      }
    });
    
    this.page = await this.browser.newPage();
    
    // Set realistic user agent
    await this.page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    
    // Set extra headers
    await this.page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
    });
    
    // Try to restore session from cookies
    try {
      const cookiesString = await fs.readFile(this.cookiesPath, 'utf-8');
      const cookies = JSON.parse(cookiesString);
      await this.page.setCookie(...cookies);
      console.log('✅ Session restored from saved cookies');
    } catch (error) {
      console.log('⚠️ No saved session found, will need to login manually');
    }
    
    this.isInitialized = true;
    console.log('✅ Browser initialized successfully');
  }
  
  /**
   * Ensure user is logged in to Google Labs
   */
  async ensureLoggedIn() {
    console.log('🔐 Checking Google Labs login status...');
    
    // Navigate to Google Labs
    await this.page.goto('https://labs.google/fx', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    // Wait for page to fully load
    await this.page.waitForTimeout(3000);
    
    // Check if logged in by looking for upload button or user profile
    const isLoggedIn = await this.page.evaluate(() => {
      const hasFileInput = document.querySelector('input[type="file"]') !== null;
      const hasUserProfile = document.querySelector('[data-user-email]') !== null;
      const hasProfileImage = document.querySelector('img[alt*="profile" i]') !== null;
      const hasGenerateButton = Array.from(document.querySelectorAll('button')).some(
        btn => btn.textContent.toLowerCase().includes('generate')
      );
      
      return hasFileInput || hasUserProfile || hasProfileImage || hasGenerateButton;
    });
    
    if (!isLoggedIn) {
      console.log('⏳ Not logged in to Google Labs');
      console.log('📢 Please login manually in the browser window that just opened');
      console.log('⏳ Waiting for login (up to 3 minutes)...');
      
      try {
        await Promise.race([
          this.page.waitForSelector('input[type="file"]', { timeout: 180000 }),
          this.page.waitForNavigation({ timeout: 180000 })
        ]);
        
        await this.page.waitForTimeout(3000);
        
        console.log('✅ Login detected!');
        
        // Save cookies for future use
        const cookies = await this.page.cookies();
        await fs.mkdir(path.dirname(this.cookiesPath), { recursive: true });
        await fs.writeFile(this.cookiesPath, JSON.stringify(cookies, null, 2));
        console.log('✅ Session cookies saved for future use');
        
      } catch (error) {
        throw new Error('Login timeout. Please try again and login within 3 minutes.');
      }
    } else {
      console.log('✅ Already logged in to Google Labs');
    }
  }
  
  /**
   * Upload image to Google Labs
   */
  async uploadImage(imagePath, imageType = 'character') {
    console.log(`📤 Uploading ${imageType} image: ${imagePath}`);
    
    const fileInputs = await this.page.$$('input[type="file"]');
    
    if (fileInputs.length === 0) {
      throw new Error('No file input found. Page structure may have changed.');
    }
    
    const fileInput = fileInputs[0];
    await fileInput.uploadFile(imagePath);
    console.log(`✅ File uploaded: ${imagePath}`);
    
    await this.page.waitForTimeout(3000);
    
    const hasImagePreview = await this.page.evaluate(() => {
      const images = document.querySelectorAll('img[src*="blob:"], img[src*="data:image"]');
      return images.length > 0;
    });
    
    if (hasImagePreview) {
      console.log('✅ Image upload verified (preview detected)');
    } else {
      console.warn('⚠️ Could not verify image upload (no preview detected)');
    }
  }
  
  /**
   * Enter prompt into Google Labs
   */
  async enterPrompt(prompt) {
    console.log('✍️ Entering prompt (optimized with paste)...');
    
    let textarea = await this.page.$('textarea[placeholder*="prompt" i]');
    
    if (!textarea) {
      textarea = await this.page.$('textarea');
    }
    
    if (!textarea) {
      const inputs = await this.page.$$('input[type="text"]');
      if (inputs.length > 0) {
        textarea = inputs[0];
      }
    }
    
    if (!textarea) {
      throw new Error('Prompt input field not found');
    }
    
    // Clean prompt
    const cleanPrompt = prompt.trim().replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ');
    const tailLength = 20; // Last 20 characters to type manually
    
    const mainPart = cleanPrompt.substring(0, cleanPrompt.length - tailLength);
    const tailPart = cleanPrompt.substring(cleanPrompt.length - tailLength);
    
    console.log(`  Strategy: Paste (${mainPart.length} chars) + Type (${tailPart.length} chars)`);
    
    // Clear existing content
    await textarea.click({ clickCount: 3 });
    await this.page.keyboard.press('Backspace');
    
    // Paste main part
    if (mainPart.length > 0) {
      console.log(`  → Pasting ${mainPart.length} characters...`);
      await textarea.type(mainPart, { delay: 2 });
    }
    
    // Type the tail part
    if (tailPart.length > 0) {
      console.log(`  → Typing final ${tailPart.length} characters...`);
      await textarea.type(tailPart, { delay: 50 });
    }
    
    console.log('✅ Prompt entered successfully');
  }
  
  /**
   * Click generate button
   */
  async clickGenerate() {
    console.log('🎨 Looking for generate button...');
    
    let generateButton = null;
    
    generateButton = await this.page.$('button[aria-label*="generate" i]');
    
    if (!generateButton) {
      const buttons = await this.page.$$('button');
      for (const button of buttons) {
        const text = await button.evaluate(el => el.textContent.toLowerCase());
        if (text.includes('generate') || text.includes('create')) {
          generateButton = button;
          break;
        }
      }
    }
    
    if (!generateButton) {
      generateButton = await this.page.$('button.generate-btn, button.create-btn, button[class*="generate"]');
    }
    
    if (!generateButton) {
      throw new Error('Generate button not found. Please check if the page loaded correctly.');
    }
    
    await generateButton.click();
    console.log('✅ Generate button clicked');
    
    await this.page.waitForTimeout(2000);
  }
  
  /**
   * Wait for image generation to complete
   */
  async waitForResults(expectedCount = 4) {
    console.log(`⏳ Waiting for ${expectedCount} images to generate...`);
    console.log('⏳ This may take 1-3 minutes...');
    
    const startTime = Date.now();
    const timeout = 180000;
    
    try {
      await this.page.waitForFunction(
        (count) => {
          const images = document.querySelectorAll(
            'img[src*="googleusercontent.com"], ' +
            'img[alt*="generated" i], ' +
            'img[src*="lh3.google"], ' +
            'div[class*="generated"] img, ' +
            'div[class*="result"] img'
          );
          
          const validImages = Array.from(images).filter(img => {
            const rect = img.getBoundingClientRect();
            return rect.width > 200 && rect.height > 200;
          });
          
          console.log(`Found ${validImages.length} images so far...`);
          return validImages.length >= count;
        },
        { timeout: timeout, polling: 2000 },
        expectedCount
      );
      
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`✅ Images generated successfully in ${elapsed}s`);
      
    } catch (error) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.warn(`⚠️ Timeout after ${elapsed}s, will try to get available images`);
    }
    
    await this.page.waitForTimeout(3000);
  }
  
  /**
   * Download generated images
   */
  async downloadImages(outputDir, expectedCount = 4) {
    console.log('💾 Downloading generated images...');
    
    const imageUrls = await this.page.evaluate(() => {
      const images = document.querySelectorAll(
        'img[src*="googleusercontent.com"], ' +
        'img[alt*="generated" i], ' +
        'img[src*="lh3.google"], ' +
        'div[class*="generated"] img, ' +
        'div[class*="result"] img'
      );
      
      const urls = Array.from(images)
        .filter(img => {
          const rect = img.getBoundingClientRect();
          return rect.width > 200 && rect.height > 200 && img.src.startsWith('http');
        })
        .map(img => img.src);
      
      return [...new Set(urls)];
    });
    
    console.log(`📊 Found ${imageUrls.length} image URLs`);
    
    if (imageUrls.length === 0) {
      throw new Error('No generated images found on the page');
    }
    
    await fs.mkdir(outputDir, { recursive: true });
    
    const savedPaths = [];
    const downloadCount = Math.min(imageUrls.length, expectedCount);
    
    for (let i = 0; i < downloadCount; i++) {
      const url = imageUrls[i];
      
      try {
        console.log(`📥 Downloading image ${i + 1}/${downloadCount}...`);
        
        const imagePage = await this.browser.newPage();
        const response = await imagePage.goto(url, { 
          waitUntil: 'networkidle2',
          timeout: 30000 
        });
        
        const buffer = await response.buffer();
        
        if (buffer.length === 0) {
          throw new Error('Downloaded empty buffer');
        }
        
        const timestamp = Date.now();
        const filename = `google-labs-${timestamp}-${i}.png`;
        const filepath = path.join(outputDir, filename);
        
        await fs.writeFile(filepath, buffer, { encoding: null });
        
        const stats = await fs.stat(filepath);
        
        if (stats.size === 0) {
          throw new Error('Saved file has 0 bytes');
        }
        
        console.log(`✅ Downloaded: ${filename} (${stats.size} bytes)`);
        
        savedPaths.push({
          path: filepath,
          filename: filename,
          size: stats.size,
          url: url
        });
        
        await imagePage.close();
        
      } catch (error) {
        console.error(`❌ Failed to download image ${i + 1}:`, error.message);
      }
    }
    
    if (savedPaths.length === 0) {
      throw new Error('Failed to download any images');
    }
    
    console.log(`✅ Successfully downloaded ${savedPaths.length} images`);
    return savedPaths;
  }
  
  /**
   * Close browser
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      this.isInitialized = false;
      console.log('✅ Browser closed');
    }
  }
}

// Singleton instance
let instance = null;

/**
 * Main function to generate images with Google Labs
 */
export async function generateWithGoogleLabs({ 
  characterImagePath, 
  productImagePath, 
  prompt, 
  count = 4 
}) {
  if (!instance) {
    instance = new GoogleLabsAutomation();
  }
  
  try {
    await instance.init();
    await instance.ensureLoggedIn();
    await instance.uploadImage(characterImagePath, 'character');
    
    // Note: Google Labs may only support one image at a time
    await instance.enterPrompt(prompt);
    await instance.clickGenerate();
    await instance.waitForResults(count);
    
    const uploadDir = process.env.UPLOAD_DIR || 'uploads';
    const outputDir = path.join(uploadDir, 'generated-images');
    const downloadedImages = await instance.downloadImages(outputDir, count);
    
    const results = [];
    for (const img of downloadedImages) {
      const buffer = await fs.readFile(img.path);
      results.push({
        buffer: buffer,
        seed: Math.floor(Math.random() * 1000000),
        url: img.url
      });
    }
    
    console.log(`✅ Google Labs generation complete: ${results.length} images`);
    return results;
    
  } catch (error) {
    console.error('❌ Google Labs generation failed:', error);
    throw new Error(`Google Labs generation failed: ${error.message}`);
  }
}

/**
 * Close Google Labs browser (call on server shutdown)
 */
export async function closeGoogleLabs() {
  if (instance) {
    await instance.close();
    instance = null;
  }
}

// Cleanup on process exit
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down Google Labs service...');
  await closeGoogleLabs();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down Google Labs service...');
  await closeGoogleLabs();
  process.exit(0);
});
