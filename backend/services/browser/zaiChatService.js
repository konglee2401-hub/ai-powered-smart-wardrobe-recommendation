import BrowserService from './browserService.js';
import SessionManager from './sessionManager.js';
import fs from 'fs';
import path from 'path';

/**
 * Z.AI Chat Browser Service
 * Automates chat.z.ai for image analysis
 */
class ZAIChatService extends BrowserService {
  constructor(options = {}) {
    super(options);
    this.baseUrl = 'https://chat.z.ai';
    this.sessionManager = new SessionManager('zai');
  }

  /**
   * Initialize Z.AI chat with session support
   */
  async initialize() {
    // Pass session manager to browser service
    this.sessionManager = this.sessionManager;
    
    await this.launch();
    await this.goto(this.baseUrl);
    
    // Wait for page to load
    console.log('⏳ Waiting for Z.AI to load...');
    await this.page.waitForTimeout(3000);
    
    // Check if logged in
    const isLoggedIn = await this.checkIfLoggedIn();
    
    if (!isLoggedIn) {
      console.log('⚠️  Not logged in. Session may be expired or invalid.');
      console.log('💡 Run "npm run login:zai" to save a new session.');
    } else {
      console.log('✅ Logged in with saved session');
    }
    
    console.log('✅ Z.AI initialized');
  }

  /**
   * Check if user is logged in
   */
  async checkIfLoggedIn() {
    try {
      // Check for elements that indicate logged-in state
      const loggedInIndicators = await this.page.evaluate(() => {
        // Check for user avatar/profile
        const avatar = document.querySelector('[class*="avatar"], [class*="profile"], [data-testid="user-menu"]');
        
        // Check for login buttons (if present, not logged in)
        const loginButtons = document.querySelectorAll('button:has-text("Sign in"), button:has-text("Log in"), a:has-text("Sign in")');
        
        // Check for "Unlock Your Insights" modal
        const loginModal = document.body.innerText.includes('Unlock Your Insights');
        
        return {
          hasAvatar: !!avatar,
          hasLoginButtons: loginButtons.length > 0,
          hasLoginModal: loginModal
        };
      });
      
      // If has avatar and no login buttons, likely logged in
      return loggedInIndicators.hasAvatar && 
             !loggedInIndicators.hasLoginButtons && 
             !loggedInIndicators.hasLoginModal;
    } catch (error) {
      console.error('Error checking login status:', error.message);
      return false;
    }
  }

  /**
   * Login with Google
   */
  async loginWithGoogle() {
    console.log('🔐 Starting Google login flow...');
    
    try {
      // Look for Google login button
      const googleButton = await this.page.$('button:has-text("Google"), [data-provider="google"], button:has-text("Continue with Google")');
      
      if (googleButton) {
        await googleButton.click();
        console.log('✅ Clicked Google login button');
        
        // Wait for Google OAuth popup/redirect
        await this.page.waitForTimeout(3000);
        
        console.log('⏳ Please complete Google login in the popup/window...');
        
        // Wait for navigation back to Z.AI
        await this.page.waitForURL('**/chat.z.ai**', { timeout: 120000 });
        
        console.log('✅ Google login completed');
        return true;
      } else {
        console.log('❌ Google login button not found');
        return false;
      }
    } catch (error) {
      console.error('Google login failed:', error.message);
      return false;
    }
  }

  /**
   * Skip login (use limited free tier)
   */
  async skipLogin() {
    console.log('⏭️  Attempting to skip login...');
    
    try {
      // Look for "Stay logged out" or "Skip" button
      const skipSelectors = [
        'button:has-text("Stay logged out")',
        'button:has-text("stay logged out")',
        'button:has-text("Skip")',
        'button:has-text("Continue as guest")',
        'button[aria-label="Close"]',
        'button:has-text("×")'
      ];
      
      for (const selector of skipSelectors) {
        const button = await this.page.$(selector);
        if (button) {
          await button.click();
          console.log(`✅ Clicked: ${selector}`);
          await this.page.waitForTimeout(1000);
          return true;
        }
      }
      
      // Try pressing Escape
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(1000);
      
      return true;
    } catch (error) {
      console.error('Skip login failed:', error.message);
      return false;
    }
  }

  /**
   * Perform login flow and save session
   */
  async performLogin(saveSession = true) {
    console.log('\n🔐 LOGIN FLOW');
    console.log('='.repeat(80));
    
    // Check if already logged in
    const isLoggedIn = await this.checkIfLoggedIn();
    if (isLoggedIn) {
      console.log('✅ Already logged in');
      
      if (saveSession) {
        await this.saveSession();
        console.log('✅ Session saved');
      }
      
      return true;
    }
    
    // Try to skip login first (for free tier)
    const skipped = await this.skipLogin();
    if (skipped) {
      console.log('✅ Using free tier (limited features)');
      return true;
    }
    
    // If skip failed, prompt for manual login
    console.log('\n⚠️  Manual login required');
    console.log('💡 Please login in the browser window');
    console.log('⏳ Waiting 60 seconds for manual login...');
    
    const manualLoginSuccess = await this.waitForManualLogin(60);
    
    if (manualLoginSuccess && saveSession) {
      await this.saveSession();
      console.log('✅ Session saved for future use');
    }
    
    return manualLoginSuccess;
  }

  /**
   * Upload image and get analysis
   */
  async analyzeImage(imagePath, prompt) {
    console.log('\n📊 Z.AI BROWSER ANALYSIS');
    console.log('='.repeat(80));
    console.log(`Image: ${path.basename(imagePath)}`);
    console.log(`Prompt: ${prompt}`);
    console.log('');

    try {
      // Look for file upload button/input
      console.log('🔍 Looking for upload button...');
      
      // Common selectors for file upload
      const uploadSelectors = [
        'input[type="file"]',
        'input[accept*="image"]',
        '[data-testid="file-upload"]',
        '[aria-label*="upload"]',
        'button[aria-label*="attach"]'
      ];

      let uploadInput = null;
      for (const selector of uploadSelectors) {
        uploadInput = await this.page.$(selector);
        if (uploadInput) {
          console.log(`✅ Found upload input: ${selector}`);
          break;
        }
      }

      if (!uploadInput) {
        // Try to find and click upload button first
        const uploadButton = await this.page.$('button:has-text("Upload"), button:has-text("Attach")');
        if (uploadButton) {
          await uploadButton.click();
          await this.page.waitForTimeout(1000);
          uploadInput = await this.page.$('input[type="file"]');
        }
      }

      if (!uploadInput) {
        throw new Error('Could not find file upload input');
      }

      // Upload image
      await this.uploadFile('input[type="file"]', imagePath);
      console.log('⏳ Waiting for upload to complete...');
      await this.page.waitForTimeout(3000);

      // Handle "Unlock Your Insights?" modal if it appears
      console.log('🔍 Checking for login modal...');
      
      try {
        // Wait for modal to appear (max 5 seconds)
        const modal = await this.page.waitForSelector(
          'text=Unlock Your Insights?',
          { timeout: 5000, state: 'visible' }
        );
        
        if (modal) {
          console.log('⚠️  Login modal detected');
          
          // Try to find and click "Stay logged out" button
          const stayLoggedOutButton = await this.page.$(
            'button:has-text("Stay logged out"), button:has-text("stay logged out")'
          );
          
          if (stayLoggedOutButton) {
            console.log('✅ Clicking "Stay logged out"...');
            await stayLoggedOutButton.click();
            await this.page.waitForTimeout(1000);
            console.log('✅ Modal dismissed');
          } else {
            // Try to close modal with X button
            const closeButton = await this.page.$('button[aria-label="Close"], button:has-text("×")');
            if (closeButton) {
              console.log('✅ Closing modal with X button...');
              await closeButton.click();
              await this.page.waitForTimeout(1000);
            } else {
              // Try pressing Escape
              console.log('⌨️  Pressing Escape to close modal...');
              await this.page.keyboard.press('Escape');
              await this.page.waitForTimeout(1000);
            }
          }
        }
      } catch (error) {
        // Modal didn't appear or already closed - that's fine
        console.log('ℹ️  No login modal detected (or already closed)');
      }

      // Wait a bit more to ensure modal is fully gone
      await this.page.waitForTimeout(1000);

      // Look for text input
      console.log('🔍 Looking for text input...');
      
      const textInputSelectors = [
        'textarea[placeholder*="Ask"]',
        'textarea[placeholder*="Message"]',
        'textarea[placeholder*="Type"]',
        'textarea',
        'input[type="text"]',
        '[contenteditable="true"]',
        '[data-testid="message-input"]',
        '[role="textbox"]'
      ];

      let textInput = null;
      let workingSelector = null;
      
      for (const selector of textInputSelectors) {
        try {
          textInput = await this.page.waitForSelector(selector, {
            timeout: 5000,
            state: 'visible'
          });
          
          if (textInput) {
            // Check if element is actually interactable
            const isEnabled = await textInput.isEnabled();
            const isVisible = await textInput.isVisible();
            
            if (isEnabled && isVisible) {
              workingSelector = selector;
              console.log(`✅ Found text input: ${selector}`);
              break;
            }
          }
        } catch (e) {
          // Try next selector
          continue;
        }
      }

      if (!textInput || !workingSelector) {
        throw new Error('Could not find text input');
      }

      // Type prompt with better method
      console.log('⌨️  Typing prompt...');
      
      // Click to focus
      await textInput.click();
      await this.page.waitForTimeout(500);
      
      // Clear any existing text
      await textInput.fill('');
      await this.page.waitForTimeout(200);
      
      // Type the prompt
      await textInput.fill(prompt);
      await this.page.waitForTimeout(1000);
      
      console.log('✅ Prompt entered');

      // Find and click send button
      console.log('🔍 Looking for send button...');
      
      const sendButton = await this.page.$('button[type="submit"], button:has-text("Send"), button[aria-label*="send"]');
      if (!sendButton) {
        // Try pressing Enter
        await this.page.keyboard.press('Enter');
      } else {
        await sendButton.click();
      }

      console.log('✅ Message sent');
      console.log('⏳ Waiting for response...');

      // Wait for response
      await this.page.waitForTimeout(5000);

      // Try to detect response completion
      let lastLength = 0;
      let stableCount = 0;
      const maxWait = 60000; // 60 seconds max
      const startTime = Date.now();

      while (Date.now() - startTime < maxWait) {
        const currentText = await this.page.evaluate(() => document.body.innerText);
        const currentLength = currentText.length;

        if (currentLength === lastLength) {
          stableCount++;
          if (stableCount >= 3) {
            // Text hasn't changed for 3 checks, likely done
            break;
          }
        } else {
          stableCount = 0;
        }

        lastLength = currentText;
        await this.page.waitForTimeout(1000);
      }

      console.log('✅ Response received');

      // Extract response
      console.log('📝 Extracting response...');
      
      const response = await this.page.evaluate(() => {
        // Try to find the last assistant message
        const messages = Array.from(document.querySelectorAll('[class*="message"], [class*="response"], [data-role="assistant"]'));
        
        if (messages.length > 0) {
          const lastMessage = messages[messages.length - 1];
          return lastMessage.innerText;
        }

        // Fallback: get all text and try to extract
        const allText = document.body.innerText;
        const lines = allText.split('\n');
        
        // Find lines after the prompt
        const promptIndex = lines.findIndex(line => line.includes(prompt.slice(0, 20)));
        if (promptIndex >= 0) {
          return lines.slice(promptIndex + 1).join('\n').trim();
        }

        return allText;
      });

      console.log('='.repeat(80));
      console.log('✅ ANALYSIS COMPLETE');
      console.log(`Response length: ${response.length} characters`);
      console.log('='.repeat(80) + '\n');

      return response;

    } catch (error) {
      console.error('❌ Z.AI analysis failed:', error.message);
      
      // Take screenshot for debugging
      const screenshotPath = path.join(process.cwd(), 'temp', `zai-error-${Date.now()}.png`);
      await this.screenshot({ path: screenshotPath });
      console.log(`📸 Error screenshot saved: ${screenshotPath}`);
      
      // Get page HTML for debugging
      const html = await this.page.content();
      const htmlPath = path.join(process.cwd(), 'temp', `zai-error-${Date.now()}.html`);
      fs.writeFileSync(htmlPath, html);
      console.log(`📄 Page HTML saved: ${htmlPath}`);
      
      // Log current URL
      console.log(`🔗 Current URL: ${this.page.url()}`);
      
      throw error;
    }
  }

  /**
   * Wait for manual login
   */
  async waitForManualLogin(timeoutSeconds = 60) {
    console.log(`⏳ Waiting ${timeoutSeconds} seconds for manual login...`);
    console.log('💡 Please login in the browser window if needed');
    
    const startTime = Date.now();
    const timeout = timeoutSeconds * 1000;
    
    while (Date.now() - startTime < timeout) {
      // Check if login modal is gone
      const modal = await this.page.$('text=Unlock Your Insights?');
      
      if (!modal) {
        console.log('✅ Login modal closed');
        return true;
      }
      
      await this.page.waitForTimeout(1000);
    }
    
    console.log('⚠️  Timeout waiting for login');
    return false;
  }

  /**
   * Save current session
   */
  async saveSession() {
    if (this.sessionManager && this.context) {
      return await this.sessionManager.saveSession(this.context);
    }
    return false;
  }

  /**
   * Delete saved session
   */
  async deleteSession() {
    if (this.sessionManager) {
      return this.sessionManager.deleteSession();
    }
    return false;
  }

  /**
   * Get session info
   */
  getSessionInfo() {
    if (this.sessionManager) {
      return this.sessionManager.getSessionInfo();
    }
    return null;
  }
}

export default ZAIChatService;
