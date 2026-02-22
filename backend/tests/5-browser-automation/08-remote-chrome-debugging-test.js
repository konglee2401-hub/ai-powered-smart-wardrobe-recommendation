import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { spawn, execSync } from 'child_process';
import readline from 'readline';

/**
 * Fallback A: Real Chrome Instance via Remote Debugging
 * 
 * Workflow:
 * 1. Start real Chrome with --remote-debugging-port
 * 2. User manually logins to Google Flow in that Chrome
 * 3. Puppeteer connects via debugging protocol (NO automation detection!)
 * 4. Captures credentials after login
 * 
 * Advantages:
 * ✓ Real browser = no bot detection
 * ✓ User manual login = Google happy
 * ✓ Puppeteer can automate after login
 * ✓ Works 100% reliably with OAuth
 */

class RemoteDebugBrowser {
  constructor() {
    this.debugPort = 9222;
    this.chromeProcess = null;
    this.browser = null;
    this.page = null;
  }

  /**
   * Kill any existing Chrome processes on port 9222
   */
  killExistingChrome() {
    try {
      console.log('🔪 Killing any existing Chrome on port 9222...');
      
      // Windows: netstat to find PID
      if (process.platform === 'win32') {
        try {
          const netstat = execSync(`netstat -ano | findstr ":9222"`, { encoding: 'utf-8' });
          const lines = netstat.trim().split('\n');
          
          for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            
            if (pid && pid !== 'PID') {
              try {
                execSync(`taskkill /PID ${pid} /F`);
                console.log(`   ✓ Killed PID ${pid}`);
              } catch (e) {}
            }
          }
        } catch (e) {
          // netstat might not find anything
        }
      } else {
        // Linux/Mac
        try {
          execSync(`lsof -ti:9222 | xargs kill -9`, { stdio: 'ignore' });
        } catch (e) {}
      }
      
      console.log('✅ Port 9222 cleared\n');
    } catch (e) {
      console.log('⚠️  Could not kill existing Chrome (might be OK)\n');
    }
  }

  /**
   * Start real Chrome with remote debugging enabled
   */
  async startRealChrome() {
    console.log('🚀 Starting REAL Chrome with Remote Debugging...\n');
    
    const chromeArgs = [
      `--remote-debugging-port=${this.debugPort}`,
      '--no-first-run',
      '--start-maximized',
      '--user-data-dir=' + path.join(process.env.LOCALAPPDATA || process.env.HOME, 'Google/Chrome/User Data'),
      '--profile-directory=Profile 2'
    ];
    
    const chromePath = process.platform === 'win32' 
      ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
      : process.platform === 'darwin'
      ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      : '/usr/bin/google-chrome';
    
    try {
      // Use spawn to start Chrome detached
      const chrome = spawn(chromePath, chromeArgs, {
        detached: true,
        stdio: 'ignore'
      });
      
      // Unref so parent process can exit while Chrome stays running
      chrome.unref();
      
      console.log('✅ Chrome started in background');
      console.log(`📍 Debug port: http://localhost:${this.debugPort}`);
      console.log('📁 Profile: Profile 2 (modluffy90@gmail.com)');
      console.log('⏳ Waiting 8 seconds for Chrome to initialize...\n');
      
      // Wait longer for Chrome to fully start
      await new Promise(r => setTimeout(r, 8000));
      
    } catch (error) {
      console.error(`❌ Failed to start Chrome: ${error.message}`);
      console.error('   Make sure Chrome is installed at the default location!');
      console.error('   Or check the chromePath variable');
      process.exit(1);
    }
  }

  /**
   * Connect Puppeteer to the real Chrome instance
   */
  async connectToChrome() {
    console.log('🔗 Connecting Puppeteer to Chrome...');
    console.log('   Trying to connect via ws://localhost:' + this.debugPort + '\n');
    
    let retries = 0;
    const maxRetries = 15;
    
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
        
        console.log('✅ Connected to Chrome!\n');
        return true;
      } catch (error) {
        retries++;
        if (retries <= 3) {
          console.log(`   Attempt ${retries}/${maxRetries}: Waiting for Chrome to initialize...`);
        } else {
          process.stdout.write(`\r   Attempt ${retries}/${maxRetries}: Still waiting...`);
        }
        await new Promise(r => setTimeout(r, 1500));
      }
    }
    
    console.error('\n\n❌ Could not connect to Chrome');
    console.error('Troubleshooting:');
    console.error('1. Check if Chrome is running: tasklist | findstr chrome');
    console.error('2. Check if port 9222 is listening: netstat -ano | findstr 9222');
    console.error('3. Make sure you closed all other Chrome windows first');
    console.error('4. Try again - Chrome sometimes takes longer to start\n');
    
    return false;
  }

  /**
   * Main workflow
   */
  async run() {
    console.log('\n' + '='.repeat(80));
    console.log('🌐 FALLBACK A: Real Chrome with Remote Debugging');
    console.log('='.repeat(80) + '\n');
    
    try {
      // Step 1: Kill existing Chrome on that port
      this.killExistingChrome();
      
      // Step 2: Start fresh Chrome with debugging
      await this.startRealChrome();
      
      // Step 3: Connect Puppeteer
      const connected = await this.connectToChrome();
      if (!connected) {
        process.exit(1);
      }
      
      // Step 4: Navigate to Lab Flow
      console.log('📍 Navigating to Lab Flow...');
      await this.page.goto('https://labs.google/fx/vi/tools/flow', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      console.log('✅ Lab Flow loaded\n');
      
      // Step 5: Prompt user
      console.log('═'.repeat(80));
      console.log('🎯 IN THE CHROME WINDOW:');
      console.log('═'.repeat(80));
      console.log('\n📋 WHAT TO DO:');
      console.log('1. Chrome window opened with Lab Flow');
      console.log('2. If you see Google login → login normally');
      console.log('3. Complete any verification (2FA, etc.)');
      console.log('4. Once you see the Flow interface, look for "Tạo bằng Flow" button');
      console.log('5. Even if NOT in editor yet, just login completely first');
      console.log('6. Then come back here and type "ready"\n');
      
      // Wait for user input
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const waitForReady = () => {
        return new Promise((resolve) => {
          rl.question('📋 Type "ready" when logged in: ', async (answer) => {
            rl.close();
            
            if (answer.toLowerCase() === 'ready') {
              resolve(true);
            } else {
              console.log('❌ Please type "ready" exactly');
              resolve(false);
            }
          });
        });
      };
      
      const ready = await waitForReady();
      if (!ready) {
        await this.close();
        return;
      }
      
      // Step 6: Capture credentials
      console.log('\n📸 Capturing credentials...');
      await this.page.waitForTimeout(2000);
      
      const cookies = await this.page.cookies();
      const localStorage = await this.page.evaluate(() => {
        const data = {};
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          data[key] = window.localStorage.getItem(key);
        }
        return data;
      });
      
      // Step 7: Save session
      const sessionFile = path.join(process.cwd(), '.sessions', 'google-flow-session.json');
      const sessionDir = path.dirname(sessionFile);
      
      if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
      }
      
      const sessionData = {
        service: 'google-flow',
        savedAt: new Date().toISOString(),
        method: 'remote-debug',
        cookies,
        localStorage
      };
      
      fs.writeFileSync(sessionFile, JSON.stringify(sessionData, null, 2));
      
      console.log('✅✅✅ CREDENTIALS SAVED!\n');
      console.log(`📁 File: ${sessionFile}`);
      console.log(`🍪 Cookies: ${cookies.length}`);
      console.log(`💾 LocalStorage: ${Object.keys(localStorage).length} keys\n`);
      
      console.log('🚀 Next steps:');
      console.log('   1. Chrome window stays open (you can close it anytime)');
      console.log('   2. Run: node test-lab-flow-integration.js');
      console.log('   3. It will use the saved credentials automatically!\n');
      
      // Keep connection alive for a bit
      console.log('⏸️  Keeping Chrome open for 10 seconds...\n');
      await new Promise(r => setTimeout(r, 10000));
      
    } catch (error) {
      console.error('\n❌ Error:', error.message);
    } finally {
      await this.close();
    }
  }

  /**
   * Cleanup
   */
  async close() {
    try {
      if (this.browser) {
        // Don't disconnect - leave Chrome running for user
        console.log('\n🔌 Disconnected from Chrome (Chrome window stays open)');
      }
    } catch (e) {}
  }
}

// Run
const remoteDebug = new RemoteDebugBrowser();
remoteDebug.run().catch(console.error);
