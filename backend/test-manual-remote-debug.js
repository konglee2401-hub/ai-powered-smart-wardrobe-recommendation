import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

/**
 * Simplified Fallback A: Manual Chrome + Remote Debugging
 * 
 * User manually starts Chrome with debugging port,
 * then Puppeteer connects and captures credentials
 */

class ManualRemoteDebug {
  constructor() {
    this.debugPort = 9222;
    this.browser = null;
    this.page = null;
  }

  /**
   * Connect to already-running Chrome instance
   */
  async connectToChrome() {
    console.log('\n📍 Connecting to Chrome on port ' + this.debugPort);
    console.log('   Make sure Chrome is running with: --remote-debugging-port=9222\n');
    
    let retries = 0;
    const maxRetries = 20;
    
    while (retries < maxRetries) {
      try {
        this.browser = await puppeteer.connect({
          browserWSEndpoint: `ws://localhost:${this.debugPort}`,
          timeout: 5000
        });
        
        const pages = await this.browser.pages();
        this.page = pages[0];
        
        if (!this.page) {
          this.page = await this.browser.newPage();
        }
        
        console.log('✅ Successfully connected to Chrome!\n');
        return true;
      } catch (error) {
        retries++;
        process.stdout.write(`\r⏳ Waiting for Chrome... (attempt ${retries}/${maxRetries})`);
        await new Promise(r => setTimeout(r, 1500));
      }
    }
    
    console.error('\n\n❌ Could not connect to Chrome on port 9222');
    console.error('\n📋 FIX: You need to start Chrome with debugging enabled\n');
    console.error('Windows:');
    console.error('  taskkill /F /IM chrome.exe  (close all Chrome first)');
    console.error('  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --remote-debugging-port=9222 --profile-directory="Profile 2"\n');
    console.error('macOS:');
    console.error('  /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222 --profile-directory="Profile 2"\n');
    console.error('Linux:');
    console.error('  google-chrome --remote-debugging-port=9222 --profile-directory="Profile 2"\n');
    
    return false;
  }

  /**
   * Main workflow
   */
  async run() {
    console.log('\n' + '='.repeat(80));
    console.log('🌐 FALLBACK A: Real Chrome via Remote Debugging');
    console.log('💡 Manual Chrome Start Approach (Most Reliable)');
    console.log('='.repeat(80));
    
    try {
      // Show instructions first
      console.log('\n📖 INSTRUCTIONS:\n');
      console.log('Step 1: Close ALL Chrome windows');
      console.log('Step 2: Paste this command in Terminal/PowerShell:\n');
      
      if (process.platform === 'win32') {
        console.log('─ WINDOWS ─');
        console.log('taskkill /F /IM chrome.exe');
        console.log('"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"');
        console.log('  --remote-debugging-port=9222');
        console.log('  --profile-directory="Profile 2"\n');
      } else if (process.platform === 'darwin') {
        console.log('─ macOS ─');
        console.log('/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome \\');
        console.log('  --remote-debugging-port=9222 \\');
        console.log('  --profile-directory="Profile 2"\n');
      } else {
        console.log('─ LINUX ─');
        console.log('google-chrome \\');
        console.log('  --remote-debugging-port=9222 \\');
        console.log('  --profile-directory="Profile 2"\n');
      }
      
      console.log('Step 3: Come back here and press Enter\n');
      
      // Wait for user to start Chrome
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const startChrome = () => {
        return new Promise((resolve) => {
          rl.question('👉 Press Enter once Chrome is running with debugging port...\n> ', () => {
            rl.close();
            resolve();
          });
        });
      };
      
      await startChrome();
      
      // Try to connect
      const connected = await this.connectToChrome();
      if (!connected) {
        process.exit(1);
      }
      
      // Check current URL
      const currentUrl = this.page.url();
      console.log(`📍 Chrome is on: ${currentUrl.substring(0, 80)}`);
      
      // Navigate if needed
      if (!currentUrl.includes('labs.google')) {
        console.log('\n📍 Navigating to Lab Flow...');
        await this.page.goto('https://labs.google/fx/vi/tools/flow', {
          waitUntil: 'networkidle2',
          timeout: 30000
        });
        console.log('✅ Lab Flow loaded\n');
      }
      
      // Instructions for user
      console.log('═'.repeat(80));
      console.log('🎯 IN THE CHROME WINDOW:');
      console.log('═'.repeat(80) + '\n');
      console.log('1️⃣  If you see Google login screen:');
      console.log('    └─ Login normally with modluffy90@gmail.com');
      console.log('    └─ Complete 2FA if prompted\n');
      console.log('2️⃣  Once logged in, you\'ll see Flow landing page\n');
      console.log('3️⃣  Click "Tạo bằng Flow" or similar button\n');
      console.log('4️⃣  Once you see the editor interface:');
      console.log('    └─ Come back to Terminal\n');
      console.log('5️⃣  Type "done" below and press Enter\n');
      
      // Wait for user to login
      const ready = () => {
        return new Promise((resolve) => {
          const rl2 = readline.createInterface({
            input: process.stdin,
            output: process.stdout
          });
          
          rl2.question('✅ Type "done" when logged in and in editor:\n> ', (answer) => {
            rl2.close();
            resolve(answer.toLowerCase().includes('done'));
          });
        });
      };
      
      const isDone = await ready();
      if (!isDone) {
        console.log('⏭️  Skipping credential capture');
        process.exit(0);
      }
      
      // Capture credentials
      console.log('\n📸 Capturing credentials...\n');
      
      const cookies = await this.page.cookies();
      const localStorage = await this.page.evaluate(() => {
        const data = {};
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          try {
            data[key] = window.localStorage.getItem(key);
          } catch (e) {}
        }
        return data;
      });
      
      // Save
      const sessionFile = path.join(process.cwd(), '.sessions', 'google-flow-session.json');
      const sessionDir = path.dirname(sessionFile);
      
      if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
      }
      
      const sessionData = {
        service: 'google-flow',
        savedAt: new Date().toISOString(),
        method: 'real-chrome-remote-debug',
        cookies,
        localStorage
      };
      
      fs.writeFileSync(sessionFile, JSON.stringify(sessionData, null, 2));
      
      console.log('✅✅✅ CREDENTIALS CAPTURED & SAVED!\n');
      console.log(`📁 Location: ${sessionFile}`);
      console.log(`🍪 Cookies: ${cookies.length}`);
      console.log(`💾 LocalStorage: ${Object.keys(localStorage).length} keys\n`);
      
      console.log('\n🎉 Next step:');
      console.log('   Run: node test-lab-flow-integration.js');
      console.log('   It will use your freshly saved credentials!\n');
      
      // Clean up
      if (this.browser) {
        await this.browser.disconnect();
      }
      
    } catch (error) {
      console.error('\n❌ Error:', error.message);
      console.error(error.stack);
    }
  }
}

// Run
const remote = new ManualRemoteDebug();
remote.run().catch(console.error);
