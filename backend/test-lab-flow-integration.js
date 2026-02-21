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
    this.authFile = path.join(process.cwd(), 'lab-flow-auth.json');
    this.service = null;
    this.savedAuth = null;
    this.results = {
      totalTests: 0,
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  loadSavedCredentials() {
    try {
      if (fs.existsSync(this.authFile)) {
        this.savedAuth = JSON.parse(fs.readFileSync(this.authFile, 'utf-8'));
        console.log('✅ Loaded saved credentials from lab-flow-auth.json');
        console.log(`   User: ${this.savedAuth.userEmail}`);
        console.log(`   Saved at: ${this.savedAuth.timestamp}\n`);
        return true;
      }
    } catch (error) {
      console.warn(`⚠️  Could not load credentials: ${error.message}`);
    }
    return false;
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
      
      // Set cookies
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
        
        await this.service.page.context().addCookies(cookiesToAdd);
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
    
    console.log(`✅ Test directory: ${this.testDir}`);
    
    // Try to load saved credentials
    console.log('\n🔐 Checking for saved credentials...');
    if (this.loadSavedCredentials()) {
      console.log('💡 Tip: Run test again without login if credentials work');
    } else {
      console.log('ℹ️  No saved credentials found - you may need to login manually');
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
      this.service = new GoogleFlowService({ headless: false });
      
      console.log('⏳ Loading Lab Flow UI...');
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
      console.log('🔐 Lab Flow Authentication Setup\n');
      
      // Navigate to Lab Flow
      console.log('📍 Navigating to https://labs.google/fx/vi/tools/flow');
      await this.service.page.goto('https://labs.google/fx/vi/tools/flow');
      await this.service.page.waitForTimeout(1000);
      
      // Try to set saved credentials if available
      if (this.savedAuth) {
        await this.setSavedCredentialsInBrowser();
        // Reload page to apply credentials
        console.log('🔄 Reloading page to apply credentials...');
        await this.service.page.reload();
        await this.service.page.waitForTimeout(2000);
      }
      
      // Check login status
      let needsLogin = false;
      try {
        needsLogin = await this.service.page.evaluate(() => {
          const buttons = document.querySelectorAll('button');
          return Array.from(buttons).some(btn => 
            btn.textContent.includes('Sign in') || 
            btn.textContent.includes('Đăng nhập')
          );
        });
      } catch (e) {
        console.log('ℹ️  Could not detect login button');
      }
      
      if (needsLogin) {
        console.log('⚠️  Login still required - Please authenticate manually\n');
      } else {
        console.log('✅ Already authenticated!\n');
      }
      
      // Always wait 60s for user to interact/verify credentials
      console.log('📋 Waiting Window:');
      console.log('   • You can now verify the page is working');
      console.log('   • Interact with Lab Flow if needed');
      console.log('   • If login page appears, complete authentication');
      console.log('   • Storage will be captured after 120 seconds\n');
      
      // Show countdown (120 seconds = 2 minutes)
      for (let i = 120; i > 0; i--) {
        process.stdout.write(`⏳ ${i}s remaining...\r`);
        await this.service.page.waitForTimeout(1000);
      }
      
      console.log('                      ');
      console.log('✅ 120 seconds elapsed - Capturing storage data...\n');
      
      // Capture localStorage
      console.log('💾 Capturing localStorage...');
      const localStorageData = await this.service.page.evaluate(() => {
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          data[key] = localStorage.getItem(key);
        }
        return data;
      });
      
      console.log('   Keys found:', Object.keys(localStorageData).length);
      if (Object.keys(localStorageData).length > 0) {
        console.log('   localStorage data:');
        Object.entries(localStorageData).forEach(([key, value]) => {
          const preview = typeof value === 'string' && value.length > 100 
            ? value.substring(0, 100) + '...' 
            : value;
          console.log(`      • ${key}: ${preview}`);
        });
      }
      console.log('');
      
      // Capture sessionStorage
      console.log('💾 Capturing sessionStorage...');
      const sessionStorageData = await this.service.page.evaluate(() => {
        const data = {};
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          data[key] = sessionStorage.getItem(key);
        }
        return data;
      });
      
      console.log('   Keys found:', Object.keys(sessionStorageData).length);
      if (Object.keys(sessionStorageData).length > 0) {
        console.log('   sessionStorage data:');
        Object.entries(sessionStorageData).forEach(([key, value]) => {
          const preview = typeof value === 'string' && value.length > 100 
            ? value.substring(0, 100) + '...' 
            : value;
          console.log(`      • ${key}: ${preview}`);
        });
      }
      console.log('');
      
      // Capture cookies
      console.log('🍪 Capturing cookies...');
      const cookies = await this.service.page.context().cookies();
      
      console.log('   Cookies found:', cookies.length);
      if (cookies.length > 0) {
        console.log('   Cookie list:');
        cookies.forEach(cookie => {
          console.log(`      • ${cookie.name}`);
          console.log(`        - Domain: ${cookie.domain}`);
          console.log(`        - Path: ${cookie.path}`);
          console.log(`        - HttpOnly: ${cookie.httpOnly}`);
          console.log(`        - Secure: ${cookie.secure}`);
          console.log(`        - Expires: ${cookie.expires ? new Date(cookie.expires * 1000).toISOString() : 'Session'}`);
          
          // Show preview if value is not too long
          if (cookie.value.length > 100) {
            console.log(`        - Value: ${cookie.value.substring(0, 100)}...`);
          } else {
            console.log(`        - Value: ${cookie.value}`);
          }
        });
      }
      console.log('');
      
      // Save all data to file for reference
      const storageFile = path.join(this.testDir, 'captured-storage.json');
      fs.writeFileSync(storageFile, JSON.stringify({
        timestamp: new Date().toISOString(),
        localStorage: localStorageData,
        sessionStorage: sessionStorageData,
        cookies: cookies
      }, null, 2));
      
      console.log(`📁 Storage data saved to: ${storageFile}\n`);
      
      console.log('✅ Storage capture complete');
      this.results.passed++;
    } catch (error) {
      console.error(`❌ Test failed: ${error.message}`);
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
    console.log(`   • Storage data in: ${path.join(this.testDir, 'captured-storage.json')}\n`);
    
    console.log('🎉 Lab Flow Integration Test Complete!\n');
    
    console.log('📝 Next Steps:');
    console.log('1. Check the captured-storage.json file for auth tokens and storage data');
    console.log('2. Identify which storage mechanism contains the login credentials');
    console.log('3. Use SessionManager to persist these credentials');
    console.log('4. Test the VTO UI in browser:');
    console.log('   - Go to VirtualTryOnPage in frontend');
    console.log('   - Select provider: "Google Lab Flow"');
    console.log('   - Upload images and generate to test integration');
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
