import GoogleFlowService from './services/browser/googleFlowService.js';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Google Lab Flow Integration Test Script
 * Tests Lab Flow image generation with VTO workflow
 * 
 * Requirements:
 * - Google login may be required before running
 * - Test images should be prepared
 */

class LabFlowIntegrationTest {
  constructor() {
    this.baseUrl = 'http://localhost:3002';
    this.tempDir = path.join(process.cwd(), 'temp');
    this.testDir = path.join(this.tempDir, 'lab-flow-tests');
    this.sessionFile = path.join(process.cwd(), '.sessions', 'google-flow-session.json');
    this.capturedStorageFile = path.join(this.testDir, 'captured-storage.json');
    this.service = null;
    this.savedAuth = null;
    this.capturedStorage = null;
    this.results = {
      totalTests: 0,
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  loadSavedCredentials() {
    try {
      if (fs.existsSync(this.sessionFile)) {
        this.savedAuth = JSON.parse(fs.readFileSync(this.sessionFile, 'utf-8'));
        console.log('✅ Loaded saved session from .sessions/google-flow-session.json');
        console.log(`   User: ${this.savedAuth.userEmail}`);
        console.log(`   Saved at: ${this.savedAuth.savedAt}\n`);
        return true;
      }
    } catch (error) {
      console.warn(`⚠️  Could not load session: ${error.message}`);
    }
    return false;
  }

  loadCapturedStorage() {
    try {
      if (fs.existsSync(this.capturedStorageFile)) {
        this.capturedStorage = JSON.parse(fs.readFileSync(this.capturedStorageFile, 'utf-8'));
        console.log('✅ Loaded captured storage from temp/lab-flow-tests/captured-storage.json');
        console.log(`   User: ${this.capturedStorage.userEmail}`);
        console.log(`   Captured at: ${this.capturedStorage.timestamp}`);
        console.log(`   Cookies: ${this.capturedStorage.cookies?.length || 0}`);
        console.log(`   localStorage: ${Object.keys(this.capturedStorage.localStorage || {}).length} keys\n`);
        return true;
      }
    } catch (error) {
      console.warn(`⚠️  Could not load captured storage: ${error.message}`);
    }
    return false;
  }

  async setCapturedCredentialsInBrowser() {
    if (!this.capturedStorage || !this.service) return false;
    
    try {
      console.log('🔑 Injecting captured credentials into browser...');
      
      // Set localStorage
      if (Object.keys(this.capturedStorage.localStorage || {}).length > 0) {
        console.log('   💾 Setting localStorage keys...');
        await this.service.page.evaluate((data) => {
          Object.entries(data).forEach(([key, value]) => {
            try {
              localStorage.setItem(key, value);
            } catch (e) {}
          });
        }, this.capturedStorage.localStorage);
        console.log(`      ✓ Set ${Object.keys(this.capturedStorage.localStorage).length} localStorage entries`);
      }
      
      // Set cookies
      if (this.capturedStorage.cookies && this.capturedStorage.cookies.length > 0) {
        console.log('   🍪 Setting cookies...');
        const cookiesToAdd = this.capturedStorage.cookies.map(cookie => ({
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain,
          path: cookie.path || '/',
          secure: cookie.secure !== undefined ? cookie.secure : true,
          httpOnly: cookie.httpOnly !== undefined ? cookie.httpOnly : false,
          sameSite: cookie.sameSite || 'Lax'
        }));
        
        // Set cookies one by one to handle errors
        let cookiesSet = 0;
        for (const cookie of cookiesToAdd) {
          try {
            await this.service.page.setCookie(cookie);
            cookiesSet++;
          } catch (e) {
            console.warn(`      ⚠️  Could not set cookie ${cookie.name}: ${e.message}`);
          }
        }
        console.log(`      ✓ Set ${cookiesSet}/${this.capturedStorage.cookies.length} cookies`);
      }
      
      console.log('✅ Captured credentials injected successfully\n');
      return true;
    } catch (error) {
      console.warn(`⚠️  Could not set credentials: ${error.message}`);
      return false;
    }
  }

  saveCapturedStorageAsSession() {
    if (!this.capturedStorage) return false;
    
    try {
      console.log('💾 Saving captured storage as session file for future use...');
      
      const sessionData = {
        service: 'google-flow',
        savedAt: new Date().toISOString(),
        userEmail: this.capturedStorage.userEmail,
        source: 'captured-storage.json',
        localStorage: this.capturedStorage.localStorage || {},
        cookies: this.capturedStorage.cookies || []
      };
      
      const sessionDir = path.dirname(this.sessionFile);
      if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
      }
      
      fs.writeFileSync(this.sessionFile, JSON.stringify(sessionData, null, 2));
      console.log(`✅ Saved to: ${this.sessionFile}\n`);
      return true;
    } catch (error) {
      console.warn(`⚠️  Could not save session: ${error.message}`);
      return false;
    }
  }

  async setSavedCredentialsInBrowser() {
    if (!this.savedAuth || !this.service) return false;
    
    try {
      console.log('🔑 Setting saved credentials in browser...');
      
      // Set localStorage
      if (Object.keys(this.savedAuth.localStorage).length > 0) {
        console.log('   💾 Setting localStorage keys...');
        await this.service.page.evaluate((data) => {
          Object.entries(data).forEach(([key, value]) => {
            localStorage.setItem(key, value);
          });
        }, this.savedAuth.localStorage);
        console.log(`      ✓ Set ${Object.keys(this.savedAuth.localStorage).length} localStorage entries`);
      }
      
      // Set cookies (using Puppeteer API)
      if (this.savedAuth.cookies && this.savedAuth.cookies.length > 0) {
        console.log('   🍪 Setting cookies...');
        const cookiesToAdd = this.savedAuth.cookies.map(cookie => ({
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain,
          path: cookie.path,
          secure: cookie.secure,
          httpOnly: cookie.httpOnly,
          sameSite: cookie.sameSite || 'Lax'
        }));
        
        await this.service.page.setCookie(...cookiesToAdd);
        console.log(`      ✓ Set ${this.savedAuth.cookies.length} cookies`);
      }
      
      console.log('✅ Credentials restored from saved file\n');
      return true;
    } catch (error) {
      console.warn(`⚠️  Could not set credentials: ${error.message}`);
      return false;
    }
  }

  async setup() {
    console.log('🔧 Setting up test environment...\n');
    
    // Create test directories
    if (!fs.existsSync(this.testDir)) {
      fs.mkdirSync(this.testDir, { recursive: true });
    }
    
    console.log(`✅ Test directory: ${this.testDir}\n`);
    
    // Try to load saved credentials
    console.log('🔐 Checking for saved credentials...');
    const sessionLoaded = this.loadSavedCredentials();
    
    // Try to load captured storage
    console.log('📸 Checking for captured storage...');
    const capturedLoaded = this.loadCapturedStorage();
    
    if (!sessionLoaded && !capturedLoaded) {
      console.log('ℹ️  No saved credentials or captured storage found - you may need to login manually');
    }
    
    console.log('');
  }

  async testDirectService() {
    console.log('━'.repeat(80));
    console.log('📋 TEST 1: Direct GoogleFlowService Initialization');
    console.log('━'.repeat(80));
    this.results.totalTests++;
    
    try {
      console.log('⏳ Initializing GoogleFlowService...\n');
      
      // If we have captured storage, save it as session for automatic loading
      if (this.capturedStorage && !this.savedAuth) {
        console.log('📝 Using captured storage from previous test...\n');
        this.saveCapturedStorageAsSession();
      }
      
      this.service = new GoogleFlowService({ headless: false, chromeProfile: 'Profile 2' });
      
      console.log('⏳ Loading Lab Flow UI...');
      // GoogleFlowService will automatically load credentials from session file
      await this.service.initialize();
      
      console.log('✅ Service initialized successfully');
      console.log(`   📍 Base URL: ${this.service.baseUrl}`);
      console.log(`   🌐 Browser: Open for manual interaction if needed\n`);
      
      this.results.passed++;
    } catch (error) {
      console.error(`❌ Test failed: ${error.message}`);
      this.results.failed++;
      this.results.errors.push({
        test: 'Direct Service Initialization',
        error: error.message
      });
    }
  }

  async testSimpleImageGeneration() {
    console.log('━'.repeat(80));
    console.log('📋 TEST 2: Simple Image Generation');
    console.log('━'.repeat(80));
    this.results.totalTests++;
    
    if (!this.service) {
      console.error('⚠️  Skipped: Service not initialized');
      return;
    }
    
    try {
      const prompt = 'A professional headshot of a woman wearing a blue business suit, studio lighting, white background';
      
      console.log(`📝 Prompt: "${prompt}"\n`);
      console.log('⏳ Generating image...');
      
      const result = await this.service.generateImage(prompt, {
        download: true,
        outputPath: path.join(this.testDir, 'test-simple-generation.png')
      });
      
      console.log('✅ Image generated successfully');
      console.log(`   📍 URL: ${result.url}`);
      console.log(`   💾 File: ${result.path}\n`);
      
      // Verify file exists
      if (fs.existsSync(result.path)) {
        const stats = fs.statSync(result.path);
        console.log(`   📊 File size: ${(stats.size / 1024).toFixed(2)} KB`);
      }
      
      this.results.passed++;
    } catch (error) {
      console.error(`❌ Test failed: ${error.message}`);
      this.results.failed++;
      this.results.errors.push({
        test: 'Simple Image Generation',
        error: error.message
      });
    }
  }

  async testVTOWorkflow() {
    console.log('━'.repeat(80));
    console.log('📋 TEST 3: VirtualTryOn Workflow Simulation');
    console.log('━'.repeat(80));
    this.results.totalTests++;
    
    try {
      console.log('⏳ Testing backend API for Lab Flow generation...\n');
      
      // Create test images (simple colored squares for testing)
      const charImagePath = path.join(this.testDir, 'test-character.png');
      const prodImagePath = path.join(this.testDir, 'test-product.png');
      
      // Create placeholder base64 PNG images for testing (1x1 pixel)
      const placeholderBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      
      console.log('📸 Preparing test images...');
      
      const payload = {
        imageGenProvider: 'lab-flow',
        prompt: 'Woman wearing blue dress in studio, professional lighting',
        characterImageBase64: placeholderBase64,
        productImageBase64: placeholderBase64,
        imageCount: 2,
        aspectRatio: '1:1',
        scene: 'studio',
        lighting: 'soft-diffused',
        mood: 'confident',
        style: 'minimalist',
        colorPalette: 'neutral',
        cameraAngle: 'eye-level',
        storageType: 'local',
        localFolder: this.testDir
      };
      
      console.log('📤 Sending request to /api/v1/browser-automation/generate-browser\n');
      console.log('Request payload:');
      console.log(`  - Provider: ${payload.imageGenProvider}`);
      console.log(`  - Prompt: "${payload.prompt.substring(0, 50)}..."`);
      console.log(`  - Image count: ${payload.imageCount}`);
      console.log(`  - Aspect ratio: ${payload.aspectRatio}`);
      console.log('');
      
      try {
        const response = await axios.post(
          `${this.baseUrl}/api/v1/browser-automation/generate-browser`,
          payload,
          {
            timeout: 600000, // 10 minutes
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log('✅ API request succeeded');
        console.log(`   Status: ${response.status}`);
        console.log(`   Generated images: ${response.data?.data?.images?.length || 0}`);
        
        if (response.data?.data?.images) {
          response.data.data.images.forEach((img, idx) => {
            console.log(`   [${idx + 1}] ${img.substring(0, 100)}...`);
          });
        }
        
        this.results.passed++;
      } catch (axiosError) {
        if (axiosError.response) {
          console.error(`❌ API error: ${axiosError.response.status}`);
          console.error(`   Message: ${axiosError.response.data?.error || axiosError.message}`);
        } else if (axiosError.code === 'ECONNREFUSED') {
          console.warn(`⚠️  Backend not running on ${this.baseUrl}`);
          console.log('   To test API, start backend with: npm run dev');
        } else {
          console.error(`❌ Request failed: ${axiosError.message}`);
        }
        this.results.failed++;
        this.results.errors.push({
          test: 'VTO Workflow API',
          error: axiosError.message
        });
      }
    } catch (error) {
      console.error(`❌ Test preparation failed: ${error.message}`);
      this.results.failed++;
      this.results.errors.push({
        test: 'VTO Workflow Setup',
        error: error.message
      });
    }
  }

  async testLoginRequirement() {
    console.log('━'.repeat(80));
    console.log('📋 TEST 4: Google Login & Storage Capture');
    console.log('━'.repeat(80));
    this.results.totalTests++;
    
    if (!this.service) {
      console.error('⚠️  Skipped: Service not initialized');
      return;
    }
    
    try {
      console.log('🔐 Lab Flow Authentication\n');
      
      // Ensure temp directories exist
      if (!fs.existsSync(this.tempDir)) {
        fs.mkdirSync(this.tempDir, { recursive: true });
      }
      if (!fs.existsSync(this.testDir)) {
        fs.mkdirSync(this.testDir, { recursive: true });
      }
      
      // Navigate to Lab Flow WITHOUT setting any cookies first
      console.log('📍 Navigating to https://labs.google/fx/vi/tools/flow');
      console.log('⚠️  NOT using saved credentials - waiting for manual login\n');
      await this.service.page.goto('https://labs.google/fx/vi/tools/flow');
      await this.service.page.waitForTimeout(2000);
      
      console.log('📋 Manual Login Window (2 minutes):');
      console.log('   1. You should see Google login page');
      console.log('   2. Login with your Google account');
      console.log('   3. If Chrome opens new window, login there too');
      console.log('   4. Navigate back to labs.google if needed');
      console.log('   5. Storage will be captured after countdown\n');
      
      // Wait for user to complete login manually
      for (let i = 120; i > 0; i--) {
        process.stdout.write(`⏳ ${i}s remaining for login...\r`);
        await this.service.page.waitForTimeout(1000);
      }
      
      console.log('                                ');
      console.log('⏳ Navigating to /flow after login...\n');
      
      // After waiting, navigate to labs.google flow URL to capture the post-login session
      // This is critical because Chrome profile login might have opened new windows
      try {
        // Close any extra pages/windows (keep only main page)
        const allPages = await this.service.page.browser().pages();
        console.log(`📄 Found ${allPages.length} window(s) - using the one with labs.google\n`);
        
        // Find or navigate to the labs.google page
        let flowPage = null;
        for (const page of allPages) {
          const url = page.url();
          if (url.includes('labs.google')) {
            flowPage = page;
            break;
          }
        }
        
        // If no labs.google page found, use current page and navigate
        if (!flowPage) {
          flowPage = this.service.page;
          console.log('🔄 Navigating to labs.google/fx/vi/tools/flow\n');
          await flowPage.goto('https://labs.google/fx/vi/tools/flow', { waitUntil: 'networkidle2' });
          await flowPage.waitForTimeout(2000);
        } else {
          console.log('✅ Found active labs.google page\n');
          // Make sure we're on the right URL
          if (!flowPage.url().includes('/flow')) {
            await flowPage.goto('https://labs.google/fx/vi/tools/flow', { waitUntil: 'networkidle2' });
            await flowPage.waitForTimeout(2000);
          }
        }
        
        // Now capture from the active flow page
        this.service.page = flowPage;
      } catch (navError) {
        console.warn(`⚠️  Navigation warning: ${navError.message}`);
      }
      
      console.log('📊 Capturing authentication data...\n');
      
      // Capture localStorage from labs.google context
      console.log('💾 localStorage (labs.google):');
      const localStorageData = await this.service.page.evaluate(() => {
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          data[key] = localStorage.getItem(key);
        }
        return data;
      });
      
      console.log(`   • Found ${Object.keys(localStorageData).length} keys`);
      if (Object.keys(localStorageData).length > 0) {
        Object.entries(localStorageData).forEach(([key, value]) => {
          const preview = typeof value === 'string' && value.length > 50 
            ? value.substring(0, 50) + '...' 
            : value;
          console.log(`     - ${key}`);
        });
      }
      console.log('');
      
      // Capture sessionStorage
      console.log('💾 sessionStorage (labs.google):');
      const sessionStorageData = await this.service.page.evaluate(() => {
        const data = {};
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          data[key] = sessionStorage.getItem(key);
        }
        return data;
      });
      
      console.log(`   • Found ${Object.keys(sessionStorageData).length} keys\n`);
      
      // Capture cookies from browser (Puppeteer API)
      console.log('🍪 Capturing cookies from browser...');
      const allCookies = await this.service.page.cookies();
      
      console.log(`   • Found ${allCookies.length} cookies total\n`);
      
      // Group cookies by domain
      const cookiesByDomain = {};
      allCookies.forEach(cookie => {
        if (!cookiesByDomain[cookie.domain]) {
          cookiesByDomain[cookie.domain] = [];
        }
        cookiesByDomain[cookie.domain].push(cookie);
      });
      
      console.log('   Grouped by domain:');
      Object.entries(cookiesByDomain).forEach(([domain, cookies]) => {
        console.log(`     📍 ${domain} (${cookies.length} cookies)`);
      });
      console.log('');
      
      // Save comprehensive auth data to file
      const authData = {
        timestamp: new Date().toISOString(),
        userEmail: 'leecris241@gmail.com',
        capturedVia: 'Manual login - Chrome profile',
        notes: 'Post-login capture including google.com and labs.google cookies',
        localStorage: localStorageData,
        sessionStorage: sessionStorageData,
        cookies: allCookies.map(c => ({
          name: c.name,
          value: c.value,
          domain: c.domain,
          path: c.path,
          secure: c.secure,
          httpOnly: c.httpOnly,
          sameSite: c.sameSite,
          expires: c.expires
        })),
        cookiesByDomain: Object.entries(cookiesByDomain).reduce((acc, [domain, cookies]) => {
          acc[domain] = cookies.length;
          return acc;
        }, {})
      };
      
      const storageFile = path.join(this.testDir, 'captured-storage.json');
      fs.writeFileSync(storageFile, JSON.stringify(authData, null, 2));
      
      console.log(`📁 Data saved to: ${storageFile}\n`);
      
      // Read back file and verify
      console.log('📖 Reading back saved data to verify...\n');
      const savedData = JSON.parse(fs.readFileSync(storageFile, 'utf-8'));
      
      console.log('✅ Verification Summary:');
      console.log(`   • localStorage entries: ${Object.keys(savedData.localStorage).length}`);
      console.log(`   • sessionStorage entries: ${Object.keys(savedData.sessionStorage).length}`);
      console.log(`   • Total cookies: ${savedData.cookies.length}`);
      console.log(`   • Domains covered: ${Object.keys(savedData.cookiesByDomain).join(', ')}`);
      
      // Show important auth cookies
      const authCookies = savedData.cookies.filter(c => 
        c.name.includes('session') || 
        c.name.includes('auth') || 
        c.name.includes('next-auth') ||
        c.name.includes('SID') ||
        c.name.includes('APISID') ||
        c.name.includes('SAPISID') ||
        c.name.includes('PSID') ||
        c.name.includes('PSIDCC') ||
        c.name.includes('PSIDTS')
      );
      
      if (authCookies.length > 0) {
        console.log(`\n   🔐 Found ${authCookies.length} authentication cookies:`);
        authCookies.forEach(cookie => {
          console.log(`      • ${cookie.name} (${cookie.domain})`);
        });
      }
      
      console.log(`\n   📍 File location: ${storageFile}`);
      console.log('   File contains: localStorage, sessionStorage, all cookies\n');
      
      this.results.passed++;
    } catch (error) {
      console.error(`❌ Test failed: ${error.message}`);
      console.error(error.stack);
      this.results.failed++;
      this.results.errors.push({
        test: 'Login & Storage Capture',
        error: error.message
      });
    }
  }

  async teardown() {
    console.log('🧹 Cleaning up...');
    
    if (this.service) {
      try {
        await this.service.close();
        console.log('✅ Service closed');
      } catch (error) {
        console.warn(`⚠️  Close error: ${error.message}`);
      }
    }
    
    console.log('');
  }

  printSummary() {
    console.log('═'.repeat(80));
    console.log('📊 TEST SUMMARY');
    console.log('═'.repeat(80));
    console.log(`Total Tests: ${this.results.totalTests}`);
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`Success Rate: ${((this.results.passed / this.results.totalTests) * 100).toFixed(1)}%\n`);
    
    if (this.results.errors.length > 0) {
      console.log('Errors encountered:');
      this.results.errors.forEach(err => {
        console.log(`  • ${err.test}: ${err.error}`);
      });
      console.log('');
    }
    
    console.log('📁 Test Files:');
    console.log(`   Directory: ${this.testDir}`);
    console.log(`   • Generated images in: ${path.join(this.testDir, 'test-*.png')}`);
    console.log(`   • Captured storage in: ${this.capturedStorageFile}`);
    if (fs.existsSync(this.sessionFile)) {
      console.log(`   • Session file in: ${this.sessionFile} ✅\n`);
    } else {
      console.log(`   • Session file: Not yet created\n`);
    }
    
    console.log('🎉 Lab Flow Integration Test Complete!\n');
    
    console.log('📋 How to Reuse Captured Credentials:\n');
    
    if (this.capturedStorage) {
      console.log('✅ CAPTURED STORAGE FOUND:');
      console.log(`   User: ${this.capturedStorage.userEmail}`);
      console.log(`   Cookies: ${this.capturedStorage.cookies?.length || 0}`);
      console.log(`   Captured at: ${this.capturedStorage.timestamp}\n`);
      
      if (fs.existsSync(this.sessionFile)) {
        console.log('✅ SESSION FILE SAVED:');
        console.log(`   Location: ${this.sessionFile}`);
        console.log('   Next time you run the test, it will load these credentials automatically!\n');
      }
    }
    
    console.log('📝 Next Steps:\n');
    console.log('Option 1: Run test again (will auto-load captured credentials)');
    console.log('   $ npm run test-lab-flow\n');
    
    console.log('Option 2: Generate more images with loaded credentials');
    console.log('   $ npm run test-lab-flow -- test-image\n');
    
    console.log('Option 3: Test with Chrome profile for faster login');
    console.log('   Edit test script and use: chromeProfile: "Profile 4"\n');
    
    console.log('Option 4: Test VTO integration in browser');
    console.log('   - Go to VirtualTryOnPage in frontend');
    console.log('   - Select provider: "Google Lab Flow"');
    console.log('   - Upload images and generate\n');
    
    console.log('');
  }

  async run() {
    console.log('\n');
    console.log('╔' + '═'.repeat(78) + '╗');
    console.log('║' + ' '.repeat(20) + '🎨 Google Lab Flow Integration Test' + ' '.repeat(24) + '║');
    console.log('╚' + '═'.repeat(78) + '╝\n');
    
    try {
      await this.setup();
      await this.testDirectService();
      
      if (this.service) {
        await this.testSimpleImageGeneration();
        await this.testLoginRequirement();
      }
      
      await this.testVTOWorkflow();
    } catch (error) {
      console.error('\n💥 Critical error:',  error.message);
    } finally {
      await this.teardown();
      this.printSummary();
      
      // Exit with appropriate code
      process.exit(this.results.failed > 0 ? 1 : 0);
    }
  }
}

// Run tests
const tester = new LabFlowIntegrationTest();
tester.run().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
