import BrowserService from './browserService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import AccountSessionRegistry from './accountSessionRegistry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define ChatGPT persistent profile directories
const CHATGPT_PROFILE_BASE = path.join(path.dirname(path.dirname(__dirname)), 'data', 'chatgpt-profiles');
const CHATGPT_DEFAULT_SESSION = path.join(CHATGPT_PROFILE_BASE, 'default', 'session.json');  // 💫 Shared across all flows

/**
 * ChatGPT Browser Service
 * Automates ChatGPT for image analysis via web UI
 * 
 * Features:
 * - Uses persistent Chrome profile to maintain session across runs
 * - Automatically restores cookies and authentication from previous login
 * - No repeated Cloudflare challenges thanks to persistent session
 * - Each flow gets unique Chrome profile to prevent parallel execution conflicts
 * - BUT all flows share the same session.json (loads latest auth from previous run)
 */
class ChatGPTService extends BrowserService {
  constructor(options = {}) {
    // 🔐 Support flowId for flow-specific Chrome profile isolation
    // This prevents "profile locked by another process" errors when flows run in parallel
    const flowId = options.flowId || 'default';
    const accountRegistry = new AccountSessionRegistry('chatgpt', { baseDir: CHATGPT_PROFILE_BASE });
    const preferredEmail = String(options.accountEmail || process.env.CHATGPT_ACCOUNT_EMAIL || '').trim();
    const preferredKey = String(options.accountKey || options.profileKey || process.env.CHATGPT_PROFILE_KEY || flowId || '').trim();
    const ensured = (preferredEmail || preferredKey)
      ? accountRegistry.ensureAccount({ email: preferredEmail, accountKey: preferredKey, label: options.accountLabel })
      : null;
    let selectedAccount = ensured || accountRegistry.selectAccount({ preferEmail: preferredEmail, preferKey: preferredKey });
    const profileKey = selectedAccount?.accountKey || preferredKey || flowId || 'default';
    if (!selectedAccount) {
      selectedAccount = accountRegistry.ensureAccount({ accountKey: profileKey, label: options.accountLabel });
    }
    const profileDir = selectedAccount?.profileDir || path.join(CHATGPT_PROFILE_BASE, profileKey);
    
    // Pass userDataDir to parent class for persistent session
    super({
      ...options,
      userDataDir: profileDir  // Each flow gets own Chrome profile
    });
    
    this.baseUrl = 'https://chatgpt.com';
    this.debug = options.debug || false; // Enable debug mode to save screenshots/HTML
    this.flowId = flowId;
    this.profileKey = profileKey;
    this.profileDir = profileDir;
    this.accountRegistry = accountRegistry;
    this.accountKey = selectedAccount?.accountKey || profileKey || '';
    this.accountEmail = selectedAccount?.email || preferredEmail || '';
    this.accountLabel = selectedAccount?.label || options.accountLabel || '';
    // 💫 Allow per-profile session when profileKey is provided
    this.sessionPath = options.sessionPath
      || (selectedAccount?.sessionPath ? selectedAccount.sessionPath : (profileKey ? path.join(CHATGPT_PROFILE_BASE, profileKey, 'session.json') : CHATGPT_DEFAULT_SESSION));
  }

  /**
   * Load saved ChatGPT session
   */
  loadSavedSession() {
    try {
      if (!fs.existsSync(this.sessionPath)) {
        console.log(`   ℹ️  No saved ChatGPT session found at: ${this.sessionPath}`);
        return null;
      }

      const sessionData = JSON.parse(fs.readFileSync(this.sessionPath, 'utf8'));
      console.log(`   ✅ Loaded saved ChatGPT session`);
      return sessionData;
    } catch (error) {
      console.log(`   ⚠️  Could not load session: ${error.message}`);
      return null;
    }
  }

  /**
   * Apply saved session to page
   */
  async applySavedSession(sessionData) {
    if (!sessionData) return false;

    try {
      // Set cookies
      if (sessionData.cookies && sessionData.cookies.length > 0) {
        // Don't filter - apply all cookies, let browser handle domain validation
        try {
          await this.page.setCookie(...sessionData.cookies);
          console.log(`   ✓ Applied ${sessionData.cookies.length} cookies`);
        } catch (e) {
          console.log(`   ⚠️  Some cookies failed (${sessionData.cookies.length} attempted): ${e.message}`);
        }
      }

      // Set localStorage
      if (sessionData.localStorage && Object.keys(sessionData.localStorage).length > 0) {
        await this.page.evaluate((items) => {
          for (const [key, value] of Object.entries(items)) {
            try {
              localStorage.setItem(key, value);
            } catch (e) {
              // Storage quota exceeded, skip this item
            }
          }
        }, sessionData.localStorage);
        console.log(`   ✓ Applied ${Object.keys(sessionData.localStorage).length} localStorage items`);
      }

      // Set sessionStorage (CRITICAL - was missing!)
      if (sessionData.sessionStorage && Object.keys(sessionData.sessionStorage).length > 0) {
        await this.page.evaluate((items) => {
          for (const [key, value] of Object.entries(items)) {
            try {
              sessionStorage.setItem(key, value);
            } catch (e) {
              // Storage quota exceeded, skip this item
            }
          }
        }, sessionData.sessionStorage);
        console.log(`   ✓ Applied ${Object.keys(sessionData.sessionStorage).length} sessionStorage items`);
      }

      return true;
    } catch (error) {
      console.log(`   ⚠️  Could not fully apply session: ${error.message}`);
      return false;
    }
  }

  /**
   * Check if user is authenticated on ChatGPT
   */
  async isAuthenticated() {
    try {
      const currentUrl = this.page.url();
      
      // If we're on auth pages, not authenticated
      if (currentUrl.includes('auth.openai.com') || currentUrl.includes('/auth/')) {
        return false;
      }

      // Check for authentication indicators
      const authStatus = await this.page.evaluate(() => {
        try {
          // Check 1: Prompt textarea exists
          const hasTextarea = !!document.querySelector('textarea[id="prompt-textarea"]') || 
                             !!document.querySelector('textarea[name="prompt-textarea"]') ||
                             !!document.querySelector('textarea[placeholder*="Ask"]') ||
                             !!document.querySelector('textarea');

          // Check 2: Profile button/image visible
          const hasProfileButton = !!document.querySelector('img[alt="Profile image"]') ||
                                  !!document.querySelector('[class*="profile"]') ||
                                  !!document.querySelector('button[aria-label*="Profile"]');

          // Check 3: Create new chat button
          const hasCreateButton = !!document.querySelector('[data-testid="create-new-chat-button"]') ||
                                 Array.from(document.querySelectorAll('button')).some(b => 
                                   b.textContent.includes('New chat') || b.textContent.includes('New Chat')
                                 );

          // Check 4: No login button visible
          const loginButtons = Array.from(document.querySelectorAll('button, a'))
            .filter(el => {
              const text = el.textContent.toLowerCase();
              return (text.includes('log in') || 
                      text.includes('sign in') || 
                      text.includes('sign up'));
            })
            .filter(el => el.offsetHeight > 0 && el.offsetWidth > 0);
          
          const hasLoginButton = loginButtons.length > 0;

          // Determine authentication
          const isAuthed = (hasTextarea && !hasLoginButton) ||
                          (hasProfileButton && hasCreateButton && !hasLoginButton);

          return {
            hasTextarea,
            hasProfileButton,
            hasCreateButton,
            hasLoginButton,
            isAuthed
          };
        } catch (e) {
          return { isAuthed: false, error: e.message };
        }
      });

      return authStatus.isAuthed;
    } catch (error) {
      console.log(`⚠️  Error checking authentication: ${error.message}`);
      return false;
    }
  }

  /**
   * Handle Cloudflare challenge if it appears
   */
  async handleCloudflareChallenge() {
    try {
      // Wait a bit for page to stabilize
      await this.page.waitForTimeout(2000);
      
      // Check if Cloudflare challenge is present
      const hasChallenge = await this.page.evaluate(() => {
        const iframeChallenge = document.querySelector('iframe[src*="challenges.cloudflare.com"]');
        const challengeForm = document.querySelector('form[action*="challenge"]');
        const cfTurnstile = document.querySelector('div[data-testid="turnstile"]') || 
                           document.querySelector('#cf-turnstile') ||
                           document.querySelector('[data-callback="verifyCallback"]');
        const cfChallenge = document.body.innerText?.includes('One more step') ||
                           document.body.innerText?.includes('Verifying your browser');
        
        return !!(iframeChallenge || challengeForm || cfTurnstile || cfChallenge);
      });

      if (hasChallenge) {
        console.log('🔐 Cloudflare challenge detected, waiting for verification...');
        
        // Wait for Cloudflare to complete - typically 5-15 seconds
        let attempts = 0;
        const maxAttempts = 60;  // Max 60 seconds
        
        while (attempts < maxAttempts) {
          await this.page.waitForTimeout(1000);
          
          const stillHasChallenge = await this.page.evaluate(() => {
            const iframeChallenge = document.querySelector('iframe[src*="challenges.cloudflare.com"]');
            const challengeForm = document.querySelector('form[action*="challenge"]');
            const cfTurnstile = document.querySelector('div[data-testid="turnstile"]') || 
                               document.querySelector('#cf-turnstile');
            const cfChallenge = document.body.innerText?.includes('One more step') ||
                               document.body.innerText?.includes('Verifying your browser');
            
            return !!(iframeChallenge || challengeForm || cfTurnstile || cfChallenge);
          });
          
          if (!stillHasChallenge) {
            console.log('✅ Cloudflare verification completed');
            await this.page.waitForTimeout(3000);  // Wait for page to fully load after challenge
            return true;
          }
          
          attempts++;
          if (attempts % 10 === 0) {
            console.log(`   ⏳ Verifying... (${attempts}s elapsed)`);
          }
        }
        
        console.log('⚠️  Cloudflare verification timeout');
        return false;
      } else {
        console.log('   ✓ No Cloudflare challenge detected');
        return true;
      }
    } catch (error) {
      console.log(`   ⚠️  Could not check Cloudflare: ${error.message}`);
      return false;
    }
  }

  async detectBlockingState(context = 'general') {
    if (!this.page) {
      return {
        isBlocked: false,
        source: null,
        actionType: null,
        message: null,
        context
      };
    }

    return await this.page.evaluate((runtimeContext) => {
      const bodyText = String(document.body?.innerText || '').toLowerCase();
      const loginVisible = Array.from(document.querySelectorAll('button, a')).some((el) => {
        const text = String(el.textContent || '').toLowerCase();
        return el.offsetParent !== null && (text.includes('log in') || text.includes('sign in') || text.includes('continue with google'));
      });
      const hasTextarea = !!document.querySelector('textarea, [contenteditable="true"]');
      const hasFileInput = document.querySelectorAll('input[type="file"]').length > 0;
      const hasCloudflare = !!(
        document.querySelector('iframe[src*="challenges.cloudflare.com"]') ||
        document.querySelector('form[action*="challenge"]') ||
        document.querySelector('#cf-turnstile') ||
        document.querySelector('[data-testid="turnstile"]') ||
        bodyText.includes('verifying your browser') ||
        bodyText.includes('one more step') ||
        bodyText.includes('checking if the site connection is secure')
      );

      if (hasCloudflare) {
        return {
          isBlocked: true,
          source: 'cloudflare',
          actionType: 'chatgpt-cloudflare',
          message: 'ChatGPT is waiting for Cloudflare verification. Resolve it manually in the opened browser window.',
          context: runtimeContext,
          hasTextarea,
          hasFileInput,
          loginVisible
        };
      }

      if (loginVisible && !hasTextarea) {
        return {
          isBlocked: true,
          source: 'auth',
          actionType: 'chatgpt-login',
          message: 'ChatGPT requires manual login or verification before the flow can continue.',
          context: runtimeContext,
          hasTextarea,
          hasFileInput,
          loginVisible
        };
      }

      return {
        isBlocked: false,
        source: null,
        actionType: null,
        message: null,
        context: runtimeContext,
        hasTextarea,
        hasFileInput,
        loginVisible
      };
    }, context);
  }

  async waitForManualResolution(options = {}) {
    const timeoutMs = options.timeoutMs || 5 * 60 * 1000;
    const pollMs = options.pollMs || 2000;
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      const blockingState = await this.detectBlockingState('manual-wait');
      if (!blockingState.isBlocked) {
        await this.page.waitForTimeout(1000);
        return true;
      }
      await this.page.waitForTimeout(pollMs);
    }

    return false;
  }

  /**
   * Initialize ChatGPT with saved session support
   */
  async initialize() {
    console.log('🚀 Starting ChatGPT initialization...');
    
    await this.launch();
    
    console.log(`📍 Navigating to ${this.baseUrl}...`);
    
    // Navigate to ChatGPT first
    await this.goto(this.baseUrl, { waitUntil: 'networkidle2', timeout: 120000 });
    
    // CRITICAL: Accept/close cookie modal BEFORE loading session
    // Closing cookie modal without accepting might trigger page reset
    console.log('🍪 Handling cookie consent...');
    try {
      const acceptBtn = await this.page.evaluate(() => {
        // Find and click accept all cookies button
        const btn = Array.from(document.querySelectorAll('button')).find(b => 
          b.textContent.includes('Chấp nhận') || 
          b.textContent.includes('Accept all') || 
          b.textContent.includes('Accept') ||
          b.getAttribute('aria-label')?.includes('accept')
        );
        if (btn && btn.offsetParent !== null) {
          btn.click();
          return true;
        }
        return false;
      });
      
      if (acceptBtn) {
        console.log('   ✓ Clicked Accept Cookies button');
        await this.page.waitForTimeout(2000);  // Wait for modal to close
      } else {
        console.log('   ✓ No cookie modal found');
      }
    } catch (e) {
      console.log(`   ⚠️  Could not handle cookie modal: ${e.message}`);
    }
    
    // Try to load and apply saved session
    const sessionData = this.loadSavedSession();
    if (sessionData) {
      console.log('📂 Found saved session, applying...\n');
      console.log('   ⏳ STEP 1: Applying cookies, localStorage, sessionStorage...');
      await this.applySavedSession(sessionData);
      
      // CRITICAL: Wait for cookies to settle into browser - with visible progress
      console.log('\n   ⏳ STEP 2: Waiting for cookies to settle (3 seconds)...');
      for (let i = 3; i > 0; i--) {
        console.log(`      Waiting... ${i}s remaining`);
        await this.page.waitForTimeout(1000);
      }
      
      // Verify cookies were actually set
      console.log('\n   ✓ STEP 3: Verifying cookies applied...');
      const verifyResult = await this.page.evaluate(() => {
        const cookies = document.cookie.split(';').map(c => c.trim().split('=')[0]);
        const hasAuthCookie = cookies.some(c => 
          c.includes('session') || c.includes('auth') || c.includes('cf_clearance')
        );
        const localStorageSize = Object.keys(window.localStorage).length;
        const sessionStorageSize = Object.keys(window.sessionStorage).length;
        
        return {
          cookieCount: cookies.length,
          hasAuthCookie,
          localStorageSize,
          sessionStorageSize
        };
      });
      
      console.log(`      ✓ Cookies in page: ${verifyResult.cookieCount}`);
      console.log(`      ✓ Auth cookies present: ${verifyResult.hasAuthCookie ? '✅ YES' : '❌ NO'}`);
      console.log(`      ✓ LocalStorage items: ${verifyResult.localStorageSize}`);
      console.log(`      ✓ SessionStorage items: ${verifyResult.sessionStorageSize}\n`);
      
      // 🔐 CRITICAL: Check if auth token cookie was actually set
      const hasAuthTokenCookie = await this.page.evaluate(() => {
        const cookies = document.cookie.split(';').map(c => c.trim().split('=')[0]);
        return cookies.some(c => 
          c.includes('session') && c.includes('token') || 
          c.includes('next-auth')
        );
      });
      console.log(`      ✓ NextAuth token present: ${hasAuthTokenCookie ? '✅ YES' : '❌ NO'}`);
      
      if (!verifyResult.hasAuthCookie || !hasAuthTokenCookie) {
        console.warn('\n   ⚠️  WARNING: Auth cookies not properly applied to page!');
        console.warn('   The saved session may be incomplete or expired.');
        console.warn('   Deep analysis will likely fail without proper authentication.\n');
      }
      
      // CRITICAL: Wait another moment before reload to ensure everything settles
      console.log('   ⏳ STEP 4: Waiting before page reload (2 seconds)...');
      for (let i = 2; i > 0; i--) {
        console.log(`      Waiting... ${i}s remaining`);
        await this.page.waitForTimeout(1000);
      }
      
      // Reload page with saved session applied
      console.log('\n   🔄 STEP 5: Reloading page with applied session...');
      await this.page.reload({ waitUntil: 'networkidle2', timeout: 120000 });
      console.log('   ✓ Page reload complete');
      
      // Wait for page to fully stabilize after reload
      console.log('\n   ⏳ STEP 6: Waiting for page to stabilize after reload (3 seconds)...');
      for (let i = 3; i > 0; i--) {
        console.log(`      Waiting... ${i}s remaining`);
        await this.page.waitForTimeout(1000);
      }
      
      // NEW: Check if actually authenticated
      console.log('\n   ✓ STEP 7: Verifying authentication...');
      const isAuthed = await this.isAuthenticated();
      
      if (isAuthed) {
        console.log('   ✅ Successfully authenticated with saved session!\n');
      } else {
        console.log('   ❌ Saved session expired or invalid - user not authenticated\n');
        console.log('⚠️  Session is incomplete. For deep ChatGPT analysis to work:\n');
        console.log('   → Please run the authentication setup again from SetupAuthentication page');
        console.log('   → Or manually login to ChatGPT in the auto-login popup to refresh session\n');
        // Continue without session - user may need to login manually
      }
    }
    
    // Handle potential Cloudflare challenge
    console.log('🔐 Checking for Cloudflare challenge...');
    await this.handleCloudflareChallenge();
    
    // Wait for page to fully render
    console.log('⏳ Waiting for ChatGPT to load...');
    await this.page.waitForTimeout(5000);
    
    // Wait for textarea input to appear to ensure Chat interface is ready
    console.log('⏳ Waiting for chat interface (textarea)...');
    
    // First try to find textarea directly
    let textareaFound = await this.page.$('textarea');
    
    // If not found, try clicking "New chat" button to activate textarea
    if (!textareaFound) {
      console.log('   → No textarea found yet, looking for "New chat" button...');
      try {
        const newChatBtn = await this.page.evaluate(() => {
          // Look for "New chat" button
          return Array.from(document.querySelectorAll('button')).find(btn => 
            btn.textContent.includes('New chat') || btn.textContent.includes('New Chat')
          )?.tagName === 'BUTTON';
        });

        if (newChatBtn) {
          console.log('   → Found "New chat" button, clicking...');
          await this.page.evaluate(() => {
            const btn = Array.from(document.querySelectorAll('button')).find(b => 
              b.textContent.includes('New chat') || b.textContent.includes('New Chat')
            );
            if (btn) btn.click();
          });
          
          await this.page.waitForTimeout(2000);
          textareaFound = await this.page.$('textarea');
        }
      } catch (e) {
        console.log(`   → Could not click "New chat": ${e.message}`);
      }
    }

    if (textareaFound) {
      console.log('✅ Chat interface ready');
    } else {
      console.log('⚠️  Textarea not found after waiting, but continuing anyway...');
    }
    
    console.log('✅ ChatGPT initialized successfully');
  }




  /**
   * Close login modal if it appears
   */
  async closeLoginModal() {
    try {
      console.log('🔍 Checking for login modal...');
      
      // Check if modal exists
      const modal = await this.page.$('[role="dialog"], .modal, [aria-modal="true"]');
      
      if (!modal) {
        console.log('✅ No login modal detected');
        return true;
      }

      console.log('⚠️  Login modal detected, attempting to close...');
      
      // Try to find close button (X button)
      const closeButtonSelectors = [
        'button[aria-label*="Close"]',
        'button[aria-label="Close dialog"]',
        'button:has-text("×")',
        'button[class*="close"]',
        '[role="dialog"] button:first-child'
      ];

      for (const selector of closeButtonSelectors) {
        try {
          const closeBtn = await this.page.$(selector);
          if (closeBtn) {
            const isVisible = await this.page.evaluate((sel) => {
              const el = document.querySelector(sel);
              return !!(el && el.offsetParent !== null);
            }, selector);

            if (isVisible) {
              console.log(`   ✅ Found close button: ${selector}`);
              await closeBtn.click();
              await this.page.waitForTimeout(1500);
              console.log('   ✅ Modal closed');
              return true;
            }
          }
        } catch (e) {
          // Try next selector
        }
      }

      // Try pressing Escape
      console.log('   ⌨️  Trying to close with Escape key...');
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(1500);

      // Verify modal is closed
      const stillOpen = await this.page.$('[role="dialog"], .modal');
      if (stillOpen) {
        console.log('   ⚠️  Modal still open');
        return false;
      }

      console.log('   ✅ Modal closed with Escape');
      return true;
    } catch (error) {
      console.log('⚠️  Error closing modal:', error.message);
      return false;
    }
  }

  /**
   * Save debug information (screenshot and HTML)
   * Only saves if debug mode is enabled
   */
  async saveDebugInfo(prefix) {
    if (!this.debug) {
      return; // Skip if debug mode not enabled
    }

    try {
      const timestamp = Date.now();
      
      // Save screenshot
      const screenshotPath = path.join(process.cwd(), 'temp', `${prefix}-${timestamp}.png`);
      await this.screenshot({ path: screenshotPath });
      console.log(`   📸 Screenshot: ${screenshotPath}`);

      // Save HTML
      const html = await this.page.content();
      const htmlPath = path.join(process.cwd(), 'temp', `${prefix}-${timestamp}.html`);
      fs.writeFileSync(htmlPath, html);
      console.log(`   📄 HTML: ${htmlPath}`);
    } catch (e) {
      console.log(`   ⚠️  Could not save debug info: ${e.message}`);
    }
  }

  /**
   * Save error debug information (always saves on error)
   */
  async saveErrorDebugInfo(prefix) {
    try {
      const timestamp = Date.now();
      
      // Save screenshot
      const screenshotPath = path.join(process.cwd(), 'temp', `${prefix}-error-${timestamp}.png`);
      await this.screenshot({ path: screenshotPath });
      console.log(`   📸 Error screenshot: ${screenshotPath}`);

      // Save HTML
      const html = await this.page.content();
      const htmlPath = path.join(process.cwd(), 'temp', `${prefix}-error-${timestamp}.html`);
      fs.writeFileSync(htmlPath, html);
      console.log(`   📄 Error HTML: ${htmlPath}`);
    } catch (e) {
      console.log(`   ⚠️  Could not save error debug info: ${e.message}`);
    }
  }

  /**
   * Analyze image using ChatGPT
   */
  async submitPromptWithFallback(stepLabel = 'STEP', options = {}) {
    const { waitAfterMs = 3000 } = options;
    console.log(`STEP ${stepLabel}: Sending message...`);

    const sendButtonSelectors = [
      "button[data-testid=\"send-button\"]",
      "button[aria-label*=\"Send\"]",
      "button[aria-label*=\"send\"]",
      "button[aria-label*=\"Submit\"]",
      "button[aria-label*=\"submit\"]",
      "form button[type=\"submit\"]",
      "button[type=\"submit\"]"
    ];

    let sendMethod = null;

    for (const selector of sendButtonSelectors) {
      try {
        const buttons = await this.page.$$(selector);
        for (const button of buttons) {
          const isEnabled = await this.page.evaluate((el) => !!(el && !el.disabled && el.offsetParent !== null && (el.getAttribute("aria-disabled") !== "true")), button);
          if (!isEnabled) continue;
          console.log(`   Found send button: ${selector}`);
          await button.click({ delay: 50 });
          sendMethod = `button:${selector}`;
          break;
        }
        if (sendMethod) break;
      } catch (error) {
        console.log(`   Send button selector failed (${selector}): ${error.message}`);
      }
    }

    if (!sendMethod) {
      try {
        const genericButton = await this.page.evaluate(() => {
          const normalize = (value) => String(value || "").toLowerCase().trim();
          const buttons = Array.from(document.querySelectorAll("button"));
          const candidate = buttons.find((button) => {
            if (!button || button.disabled || button.offsetParent === null || button.getAttribute("aria-disabled") === "true") return false;
            const aria = normalize(button.getAttribute("aria-label"));
            const testId = normalize(button.getAttribute("data-testid"));
            const text = normalize(button.textContent);
            return aria.includes("send") || aria.includes("submit") || testId.includes("send") || text === "send" || text.includes("submit");
          });
          if (!candidate) return null;
          candidate.click();
          return {
            ariaLabel: candidate.getAttribute("aria-label") || null,
            dataTestId: candidate.getAttribute("data-testid") || null,
            text: candidate.textContent || null
          };
        });
        if (genericButton) {
          console.log(`   Clicked fallback send button: ${genericButton.ariaLabel || genericButton.dataTestId || genericButton.text || "generic-button"}`);
          sendMethod = "button:fallback";
        }
      } catch (error) {
        console.log(`   Generic send button fallback failed: ${error.message}`);
      }
    }

    if (!sendMethod) {
      try {
        console.log("   Trying Ctrl+Enter...");
        await this.page.keyboard.down("Control");
        await this.page.keyboard.press("Enter");
        await this.page.keyboard.up("Control");
        sendMethod = "keyboard:ctrl+enter";
      } catch (error) {
        console.log(`   Ctrl+Enter failed: ${error.message}`);
      }
    }

    if (!sendMethod) {
      console.log("   Pressing Enter...");
      await this.page.keyboard.press("Enter");
      sendMethod = "keyboard:enter";
    }

    await this.page.waitForTimeout(waitAfterMs);

    const submitState = await this.page.evaluate(() => {
      const input = document.querySelector("textarea, [contenteditable=\"true\"]");
      const rawValue = input ? (input.tagName === "TEXTAREA" ? input.value : input.textContent || "") : "";
      const hasAssistant = !!document.querySelector("[data-message-author-role=\"assistant\"]");
      const hasStopButton = Array.from(document.querySelectorAll("button")).some((button) => {
        const text = String(button.textContent || "").toLowerCase();
        const aria = String(button.getAttribute("aria-label") || "").toLowerCase();
        return button.offsetParent !== null && !button.disabled && (text.includes("stop") || aria.includes("stop"));
      });
      return { inputLength: String(rawValue || "").trim().length, hasAssistant, hasStopButton };
    });

    console.log(`   Submit attempt via ${sendMethod}`);
    console.log("   Submit state:", submitState);

    if (submitState.inputLength > 0 && !submitState.hasAssistant && !submitState.hasStopButton && sendMethod !== "keyboard:enter") {
      console.log("   Prompt still present after button submit, retrying with Enter...");
      await this.page.keyboard.press("Enter");
      await this.page.waitForTimeout(1500);
    }

    return { sendMethod, submitState };
  }

  async analyzeImage(imagePath, prompt) {
    console.log('\n📊 ChatGPT BROWSER ANALYSIS');
    console.log('='.repeat(80));
    console.log(`Image: ${path.basename(imagePath)}`);
    console.log(`Prompt: ${prompt.substring(0, 80)}${prompt.length > 80 ? '...' : ''}`);
    console.log('');

    try {
      // Verify the image file exists
      if (!fs.existsSync(imagePath)) {
        throw new Error(`Image file not found: ${imagePath}`);
      }

      // Step 1: Look for upload button or input
      console.log('📍 STEP 1: Looking for attachment button...');
      
      const uploadSelectors = [
        'button[aria-label*="attach"], button[aria-label*="Attach"]',
        'button[aria-label*="image"], button[aria-label*="Image"]',
        'input[type="file"]',
        '[data-testid="attach-button"]',
        'button:has-text("Attach")'
      ];

      let uploadButton = null;
      let uploadInput = null;

      // First try to find and click the attachment button
      for (const selector of uploadSelectors) {
        try {
          uploadButton = await this.page.$(selector);
          if (uploadButton) {
            console.log(`   ✅ Found: ${selector}`);
            await uploadButton.click();
            await this.page.waitForTimeout(1000);
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      // Look for file input
      uploadInput = await this.page.$('input[type="file"]');
      
      if (!uploadInput) {
        throw new Error('Could not find file upload input');
      }

      // Step 2: Upload image
      console.log('📍 STEP 2: Uploading image file...');
      await this.uploadFile('input[type="file"]', imagePath);
      console.log(`   ✅ File uploaded: ${path.basename(imagePath)}`);
      
      // Wait for image to process
      console.log('📍 STEP 3: Waiting for image to process...');
      await this.page.waitForTimeout(2000);

      // Step 4: Close login modal if appears
      console.log('📍 STEP 4: Handling login modal...');
      const modalClosed = await this.closeLoginModal();
      if (!modalClosed) {
        console.log('   ⚠️  Could not close modal, continuing anyway...');
      }

      // Step 5: Look for text input
      console.log('📍 STEP 5: Looking for message input...');
      
      const textInputSelectors = [
        'textarea[placeholder*="message"]',
        'textarea[placeholder*="Ask"]',
        'textarea[placeholder*="Message"]',
        'textarea',
        '[contenteditable="true"]'
      ];

      let textInputSelector = null;
      
      for (const selector of textInputSelectors) {
        try {
          const element = await this.page.waitForSelector(selector, {
            timeout: 2000,
            state: 'visible'
          });
          
          if (element) {
            const isVisible = await this.page.evaluate((sel) => {
              const el = document.querySelector(sel);
              return !!(el && el.offsetParent !== null);
            }, selector);
            
            if (isVisible) {
              textInputSelector = selector;
              console.log(`   ✅ Found: ${selector}`);
              break;
            }
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      if (!textInputSelector) {
        throw new Error('Could not find message input');
      }

// Step 6: Click input and type prompt
      console.log('📍 STEP 6: Entering prompt...');
      try {
        await this.page.click(textInputSelector);
        console.log('   ✅ Input focused');
        await this.page.waitForTimeout(1000);
        
        // Clear any existing text
        await this.page.evaluate((sel) => {
          const el = document.querySelector(sel);
          if (el) {
            if (el.tagName === 'TEXTAREA') {
              el.value = '';
            } else if (el.contentEditable === 'true') {
              el.textContent = '';
            }
            el.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }, textInputSelector);
        await this.page.waitForTimeout(500);

        // Use paste method instead of typing character by character
        console.log(`   ⌨️  Pasting prompt (${prompt.length} chars)...`);
        
        await this.page.evaluate((sel, text) => {
          const el = document.querySelector(sel);
          if (!el) return false;
          
          // Method 1: Direct clipboard paste
          const evt = new ClipboardEvent('paste', {
            clipboardData: new DataTransfer(),
            bubbles: true
          });
          evt.clipboardData.setData('text/plain', text);
          
          if (el.tagName === 'TEXTAREA') {
            el.value = text;
          } else if (el.contentEditable === 'true') {
            el.textContent = text;
          }
          
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }, textInputSelector, prompt);
        
        await this.page.waitForTimeout(1000);
        console.log('   ✅ Prompt entered');
      } catch (error) {
        console.error(`   ❌ Error entering prompt: ${error.message}`);
        throw error;
      }

      // Step 7: Submit prompt with button-first fallback
      const submitResult = await this.submitPromptWithFallback('STEP 7', { waitAfterMs: 2000 });
      console.log('   Message sent via', submitResult.sendMethod);

      // Step 8: Wait for login modal after sending
      console.log('📍 STEP 8: Checking for modal after sending...');
      await this.page.waitForTimeout(2000);
      const modalAfterSend = await this.closeLoginModal();
      if (!modalAfterSend) {
        console.log('   ⚠️  Could not close modal, waiting anyway...');
      }

      // Step 9: Wait for response
      console.log('📍 STEP 9: Waiting for response from ChatGPT...');

      // Wait for response to start generating
      await this.page.waitForTimeout(2000);

      // Wait for response to complete
      let lastLength = 0;
      let stableCount = 0;
      const maxWait = 180000; // 180 seconds max (increased from 120s for better ChatGPT processing time)
      const startTime = Date.now();

      while (Date.now() - startTime < maxWait) {
        try {
          const responseText = await this.page.evaluate(() => {
            // Look for the last assistant message
            const messages = Array.from(document.querySelectorAll('[data-message-author-role="assistant"]'));
            
            if (messages.length > 0) {
              const lastMessage = messages[messages.length - 1];
              return lastMessage?.innerText || '';
            }
            
            return '';
          });

          if (responseText && responseText.length > 0) {
            const currentLength = responseText.length;

            if (Math.abs(currentLength - lastLength) < 50) {
              stableCount++;
              if (stableCount >= 3) {
                // Response hasn't changed much for 3 checks, likely done
                console.log(`   ✅ Response complete (${currentLength} chars)`);
                break;
              }
            } else {
              stableCount = 0;
            }

            lastLength = currentLength;
          }

          await this.page.waitForTimeout(1000);
        } catch (e) {
          // Continue waiting
          await this.page.waitForTimeout(1000);
        }
      }

      // Step 10: Extract response
      console.log('📍 STEP 10: Extracting response...');
      
      const response = await this.page.evaluate(() => {
        // Try to find the last assistant message
        const messages = Array.from(document.querySelectorAll('[data-message-author-role="assistant"]'));
        
        if (messages.length > 0) {
          const lastMessage = messages[messages.length - 1];
          return lastMessage?.innerText || '';
        }

        return '';
      });

      if (!response || response.length === 0) {
        throw new Error('Could not extract response from ChatGPT');
      }

      console.log(`   ✅ Response extracted (${response.length} characters)`);
      console.log('='.repeat(80));
      console.log('✅ ANALYSIS COMPLETE\n');

      return response;

    } catch (error) {
      console.error('❌ ChatGPT analysis failed:', error.message);
      
      // Save debug info on error
      try {
        await this.saveErrorDebugInfo('chatgpt');
      } catch (e) {
        console.log('⚠️  Could not save error debug info');
      }
      
      throw error;
    }
  }

  /**
   * Upload multiple images and analyze
   */
  async analyzeMultipleImages(imagePaths, prompt) {
    console.log('\n📊 ChatGPT BROWSER MULTI-IMAGE ANALYSIS');
    console.log('='.repeat(80));
    console.log(`Images: ${imagePaths.map(p => path.basename(p)).join(', ')}`);
    console.log(`Prompt: ${prompt.substring(0, 80)}${prompt.length > 80 ? '...' : ''}`);
    console.log('');

    try {
      // Verify all image files exist
      for (const imagePath of imagePaths) {
        if (!fs.existsSync(imagePath)) {
          throw new Error(`Image file not found: ${imagePath}`);
        }
      }

      // Step 1: Look for upload button or file input
      console.log('📍 STEP 1: Looking for attachment button...');
      
      const uploadSelectors = [
        'button[aria-label*="attach"], button[aria-label*="Attach"]',
        'button[aria-label*="image"], button[aria-label*="Image"]',
        'input[type="file"]',
        '[data-testid="attach-button"]'
      ];

      let uploadButton = null;
      let fileInput = null;

      for (const selector of uploadSelectors) {
        try {
          const element = await this.page.$(selector);
          if (element) {
            if (selector.includes('input')) {
              fileInput = element;
              console.log(`   ✅ Found file input: ${selector}`);
              break;
            } else {
              uploadButton = element;
              console.log(`   ✅ Found: ${selector}`);
              break;
            }
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      // Step 2: Upload all images together 
      console.log('📍 STEP 2: Uploading images...');
      console.log(`   📋 Attempting to upload ${imagePaths.length} images...`);
      
      try {
        // Find file input
        const inputElements = await this.page.$$('input[type="file"]');
        if (inputElements.length === 0) {
          throw new Error('No file input elements found on page');
        }
        
        const fileInput = inputElements[0];
        
        // Upload ALL images at once to file input (ChatGPT supports multi-file)
        console.log(`   └─ Found ${inputElements.length} file input(s), uploading ${imagePaths.length} files...`);
        
        try {
          await fileInput.uploadFile(...imagePaths);
          console.log(`   ✅ Files submitted to input element`);
        } catch (uploadErr) {
          console.log(`   ⚠️  uploadFile() failed: ${uploadErr.message}, trying setInputFiles...`);
          // Fallback: try setInputFiles
          await fileInput.setInputFiles(imagePaths);
          console.log(`   ✅ Files set via setInputFiles`);
        }
        
        // Wait for uploads to complete and images to appear
        console.log(`   ⏳ Waiting for ${imagePaths.length} image(s) to process...`);
        await this.page.waitForTimeout(3000);
        
        // Enhanced image detection - check for uploaded image indicators
        const uploadStatus = await this.page.evaluate(() => {
          try {
            // Check multiple indicators of image upload
            const chatImages = document.querySelectorAll('[class*=\"image\"], [class*=\"preview\"], img[src*=\"blob\"]');
            const fileInputs = document.querySelectorAll('input[type=\"file\"]');
            const uploadElements = document.querySelectorAll('[data-testid*=\"upload\"], [class*=\"upload\"]');
            
            return {
              chatImagesCount: chatImages.length,
              visibleFileInputs: Array.from(fileInputs).filter(f => f.offsetHeight > 0 && f.offsetWidth > 0).length,
              uploadElementsCount: uploadElements.length,
              pageHasImages: document.querySelectorAll('img').length,
              hasImagePreview: !!document.querySelector('[class*=\"image-preview\"], [data-testid*=\"image\"]')
            };
          } catch (e) {
            return { error: e.message };
          }
        });
        
        console.log(`   📊 Upload status: ${uploadStatus.chatImagesCount} chat images, ${uploadStatus.pageHasImages} total images on page`);
        
        // If still no images detected, try waiting longer
        if (uploadStatus.pageHasImages < imagePaths.length) {
          console.log(`   ⏳ Waiting additional 2s for images to fully load...`);
          await this.page.waitForTimeout(2000);
        }
        
        const finalImageCheck = await this.page.evaluate(() => {
          return document.querySelectorAll('img').length;
        });
        
        if (finalImageCheck === 0) {
          console.warn(`   ⚠️  WARNING: No images detected on page after upload!`);
          console.warn('   ChatGPT may not be logged in or interface not fully loaded.');
          console.warn('   Continuing anyway - upload may have worked but preview hidden.');
        } else {
          console.log(`   ✅ Images detected on page (${finalImageCheck} total)`);
        }
        
      } catch (uploadError) {
        console.error(`   ❌ Image upload failed: ${uploadError.message}`);
        console.error(`   This usually happens when:`);
        console.error(`     1. ChatGPT is not properly logged in`);
        console.error(`     2. Browser session is incomplete or expired`);
        console.error(`     3. File input element is not accessible`);
        throw new Error(`Failed to upload images: ${uploadError.message}`);
      }

      // Step 3: Handle login modal if appears
      console.log('📍 STEP 3: Handling login modal...');
      const modalClosed = await this.closeLoginModal();
      if (!modalClosed) {
        console.log('   ⚠️  Could not close modal, continuing anyway...');
      }

      // Step 4: Look for text input
      console.log('📍 STEP 4: Looking for message input...');
      
      const textInputSelectors = [
        'textarea[placeholder*="message"]',
        'textarea[placeholder*="Ask"]',
        'textarea[placeholder*="Message"]',
        'textarea',
        '[contenteditable="true"]'
      ];

      let textInputSelector = null;
      
      for (const selector of textInputSelectors) {
        try {
          const element = await this.page.waitForSelector(selector, {
            timeout: 2000,
            state: 'visible'
          });
          
          if (element) {
            const isVisible = await this.page.evaluate((sel) => {
              const el = document.querySelector(sel);
              return !!(el && el.offsetParent !== null);
            }, selector);
            
            if (isVisible) {
              textInputSelector = selector;
              console.log(`   ✅ Found: ${selector}`);
              break;
            }
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      if (!textInputSelector) {
        throw new Error('Could not find message input');
      }

      // Step 5: Type prompt
      console.log('📍 STEP 5: Entering prompt...');
      try {
        await this.page.click(textInputSelector);
        await this.page.waitForTimeout(1000);
        
        // Clear existing text
        await this.page.evaluate((sel) => {
          const el = document.querySelector(sel);
          if (!el) return;
          if (el.tagName === 'TEXTAREA') {
            el.value = '';
          } else if (el.contentEditable === 'true') {
            el.textContent = '';
          }
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }, textInputSelector);
        
        await this.page.waitForTimeout(500);
        
        // Paste prompt instead of typing
        console.log(`   ⌨️  Pasting prompt (${prompt.length} chars)...`);
        await this.page.evaluate((sel, text) => {
          const el = document.querySelector(sel);
          if (!el) return false;
          
          if (el.tagName === 'TEXTAREA') {
            el.value = text;
          } else if (el.contentEditable === 'true') {
            el.textContent = text;
          }
          
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }, textInputSelector, prompt);
        
        await this.page.waitForTimeout(1000);
        console.log(`   ✅ Prompt entered (${prompt.length} characters)`);
      } catch (error) {
        console.error(`   ❌ Error entering prompt: ${error.message}`);
        throw error;
      }

      // Step 6: Submit prompt with button-first fallback
      const submitResult = await this.submitPromptWithFallback('STEP 6', { waitAfterMs: 3000 });
      console.log('   Message sent via', submitResult.sendMethod);

      console.log('   Waiting 3s for message to send...');

      
      const messageState = await this.page.evaluate(() => {
        const input = document.querySelector('textarea, [contenteditable="true"]');
        const assistantMsg = document.querySelector('[data-message-author-role="assistant"]');
        return {
          inputFound: !!input,
          inputLength: input ? (input.value || input.textContent || '').length : 0,
          assistantMsgFound: !!assistantMsg,
          bodyTextLength: (document.body.innerText || '').length,
          pageTitle: document.title
        };
      });
      
      console.log('   📊 Message state:', messageState);
      if (messageState.inputLength > 0) {
        console.warn('   ⚠️  Input still has text - message may not have sent!');
      }
      if (!messageState.assistantMsgFound) {
        console.warn('   ⚠️  No assistant message found yet - still waiting for response');
      }

      // Step 7: Wait for response
      console.log('📍 STEP 7: Waiting for ChatGPT response...');
      console.log('⏳ This may take up to 120 seconds...\n');
      
      let response = '';
      try {
        response = await this.waitForResponse(120000);  // FIXED: Increased from 60s to 120s for complex analysis
        console.log(`   ✅ Response received (${response.length} characters)`);
      } catch (waitError) {
        console.error('❌ Response wait failed:', waitError.message);
        console.error('⚠️  Attempting fallback extraction...');
        
        // Fallback: Try direct extraction without waiting
        try {
          response = await this.page.evaluate(() => {
            const assistant = document.querySelector('[data-message-author-role="assistant"]');
            if (assistant) {
              return assistant.innerText || assistant.textContent || '';
            }
            return '';
          });
          console.log(`   ⚠️  Fallback extracted: ${response.length} characters`);
        } catch (fallbackError) {
          console.error('❌ Fallback extraction also failed:', fallbackError.message);
          response = '';
        }
      }
      
      if (!response || response.length === 0) {
        throw new Error('Failed to extract any response from ChatGPT');
      }
      
      console.log('='.repeat(80));
      console.log('✅ MULTI-IMAGE ANALYSIS COMPLETE\n');

      return response;

    } catch (error) {
      console.error('❌ ChatGPT multi-image analysis failed:', error.message);
      
      // Save debug info on error
      try {
        await this.saveErrorDebugInfo('chatgpt');
      } catch (e) {
        console.log('⚠️  Could not save error debug info');
      }
      
      throw error;
    }
  }

  /**
   * Wait for ChatGPT to finish responding
   */
  async waitForResponse(maxWait = 120000) {
    console.log('⏳ Waiting for ChatGPT response (streaming)...');
    console.log(`⏱️  Timeout: ${maxWait}ms = ${Math.round(maxWait / 1000)}s`);
    console.log('   Monitoring for streaming completion (no new content for 5s)...\n');
    
    const startTime = Date.now();
    let lastProgressLog = Date.now();
    let lastContentLength = 0;
    let stableCount = 0;
    const stableThreshold = 5;  // 5 seconds of no change = complete
    
    // Check initial state
    try {
      const initialState = await this.page.evaluate(() => {
        // Support multiple message container selectors
        let messages = document.querySelectorAll('article[data-turn]');
        if (messages.length === 0) messages = document.querySelectorAll('[role="article"]');
        if (messages.length === 0) messages = document.querySelectorAll('[data-testid*="conversation-turn"]');
        
        return {
          messageCount: messages.length,
          lastMessageLength: messages.length > 0 ? (messages[messages.length - 1].innerText || '').length : 0
        };
      });
      console.log(`📊 Initial state: ${initialState.messageCount} messages, last message: ${initialState.lastMessageLength}ch`);
    } catch (e) {
      console.warn(`⚠️  Could not get initial state: ${e.message}`);
    }
    
    while (Date.now() - startTime < maxWait) {
      // Check page state
      const state = await this.page.evaluate(() => {
        // Get last message (response) - try multiple selector strategies
        let messages = document.querySelectorAll('article[data-turn]');
        if (messages.length === 0) messages = document.querySelectorAll('[role="article"]');
        if (messages.length === 0) messages = document.querySelectorAll('[data-testid*="conversation-turn"]');
        
        if (messages.length < 2) return { hasContent: false, length: 0, isLoading: true, hasContinue: false };
        
        const lastMessage = messages[messages.length - 1];
        const text = lastMessage.innerText || lastMessage.textContent || '';
        
        // Check for loading indicators (multiple methods)
        const hasLoadingSpinner = !!(
          document.querySelector('[class*="animate"], .animate-spin, .spinner') ||
          document.querySelector('[class*="loading"]')
        );
        const hasLoadingText = text.toLowerCase().includes('thinking') || 
                              text.toLowerCase().includes('generating') ||
                              text.toLowerCase().includes('processing');
        
        // Check if there's a "Continue generating" button (response not complete)
        // Use valid CSS selector or iterate through buttons
        let continueBtn = document.querySelector('button[aria-label*="continue"], [data-testid*="continue"]');
        if (!continueBtn) {
          // Fallback: search through buttons for "Continue" text
          continueBtn = Array.from(document.querySelectorAll('button')).find(btn => 
            btn.textContent.includes('Continue') && btn.offsetParent !== null
          );
        }
        const hasContinue = !!continueBtn;
        
        return {
          hasContent: text.length > 50,
          length: text.length,
          isLoading: hasLoadingSpinner || hasLoadingText,
          hasContinue: hasContinue,
          text: text.substring(0, 200)
        };
      });
      
      // Progress logging every 5 seconds
      const now = Date.now();
      if (now - lastProgressLog > 5000) {
        const elapsed = Math.round((now - startTime) / 1000);
        const deltaLength = state.length - lastContentLength;
        const deltaSign = deltaLength > 0 ? '📝' : (deltaLength < 0 ? '❌' : '⏸️');
        console.log(`⏳ (${elapsed}s) Content: ${state.length}ch (Δ${deltaSign}${Math.abs(deltaLength)}ch), Loading: ${state.isLoading ? '🔄' : '⏹️'}, Continue: ${state.hasContinue ? '📢' : '✅'}`);
        lastProgressLog = now;
      }
      
      // Check if response stream is complete
      // Complete when:
      // 1. Has content
      // 2. Content length hasn't changed for stableThreshold (5 seconds)
      // 3. No "Continue generating" button
      // 4. (OPTIONALLY: No loading spinner/text, but don't REQUIRE it)
      if (state.hasContent && !state.hasContinue) {
        if (state.length === lastContentLength) {
          // Content hasn't grown - increment stable counter
          stableCount++;
          
          // 🔥 IMPORTANT: Check for error/incomplete responses
          // If response is very short + contains "please upload" or similar = not authenticated
          if (state.length < 500 && state.text.toLowerCase().includes('please upload')) {
            console.log(`\n⚠️  WARNING: Response looks like an error!`);
            console.log(`   - ChatGPT may not be logged in`);
            console.log(`   - Images likely not uploaded successfully`);
            console.log(`   - Response: "${state.text.substring(0, 100)}..."`);
            console.log(`   - This flow will likely fail with incomplete analysis\n`);
          }
          
          // 🔥 FIX: Remove the "!state.isLoading" requirement
          // Sometimes ChatGPT shows loading indicator even after response is complete
          // If content is stable for 5+ seconds AND no Continue button, it's done
          if (stableCount >= stableThreshold) {
            console.log(`\n✅ Response streaming COMPLETE!`);
            console.log(`   - Final length: ${state.length} characters`);
            console.log(`   - Stable for ${stableCount} seconds of monitoring`);
            console.log(`   - No "Continue" button visible`);
            console.log(`   - Loading indicator: ${state.isLoading ? 'Still showing (but ignoring)' : 'Cleared'}`);
            break;
          }
        } else {
          // Content is still growing - reset counter and track new length
          const deltaLength = state.length - lastContentLength;
          stableCount = 0;
          lastContentLength = state.length;
          console.log(`📝 New content streaming: +${deltaLength}ch (total: ${state.length}ch)`);
        }
      } else {
        stableCount = 0;
        lastContentLength = state.length;
        
        if (!state.hasContent) {
          console.log(`⏳ Waiting for content (${state.length}ch)...`);
        }
        if (state.isLoading) {
          console.log(`🔄 ChatGPT is processing...`);
        }
        if (state.hasContinue) {
          console.log(`📢 "Continue generating" button visible - response truncated`);
        }
      }
      
      await this.page.waitForTimeout(1000);
    }
    
    const totalSeconds = Math.round((Date.now() - startTime) / 1000);
    console.log(`\n⏱️  Response wait completed after ${totalSeconds}s`);
    
    // Extract response text - support both JSON (new format) and text (old format)
    console.log('📍 STEP 11: Extracting response...');
    
    const response = await this.page.evaluate(() => {
      let fullText = '';
      let extractMethod = 'none';
      
      // ===== METHOD 0: NEW - Extract ALL <p> tags with <br> handling =====
      // ChatGPT HTML renders responses across MULTIPLE <p> tags with <br> instead of newlines
      // FIX: Combine ALL p tags, don't just take the longest one
      if (fullText.length < 100) {
        const pTags = document.querySelectorAll('article[data-turn="assistant"] p, [data-message-author-role="assistant"] p');
        if (pTags.length > 0) {
          // Combine text from ALL p tags (not just the longest)
          const allTexts = [];
          for (const p of pTags) {
            // Convert <br> to newlines and get text
            const html = p.innerHTML;
            const text = html
              .replace(/<br\s*\/?>/gi, '\n')  // Replace <br> with newline
              .replace(/<[^>]*>/g, '')  // Remove all other HTML tags
              .replace(/&nbsp;/gi, ' ')  // Replace &nbsp; with space
              .replace(/&lt;/g, '<')     // Decode HTML entities
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"')
              .replace(/&amp;/g, '&')
              .replace(/\n\n+/g, '\n')  // Collapse multiple newlines to single
              .trim();
            
            if (text.length > 5) {
              allTexts.push(text);
            }
          }
          
          if (allTexts.length > 0) {
            fullText = allTexts.join('\n');  // Combine all with newlines
            extractMethod = 'p-tag-with-br-handling-ALL';
          }
        }
      }
      
      // ===== METHOD 1: Get text directly from assistant message element (new article structure) =====
      if (fullText.length < 500) {  // Changed from < 100 to < 500 to ensure we get complete responses
        let assistantMessage = document.querySelector('article[data-turn="assistant"]');
        if (!assistantMessage) assistantMessage = document.querySelector('[data-message-author-role="assistant"]');
        
        if (assistantMessage) {
          // Try innerText first (preserves formatting)
          let text = assistantMessage.innerText || assistantMessage.textContent || '';
          if (text.length > 500) {  // Require complete response
            fullText = text;
            extractMethod = 'direct-assistant-element';
          }
        }
      }
      
      // ===== METHOD 2: Try markdown container inside assistant message =====
      if (fullText.length < 500) {  // Changed from < 100 to < 500
        let assistantMsg = document.querySelector('article[data-turn="assistant"]');
        if (!assistantMsg) assistantMsg = document.querySelector('[data-message-author-role="assistant"]');
        
        if (assistantMsg) {
          // Look for markdown prose container
          const markdownDiv = assistantMsg.querySelector('.markdown, [class*="prose"], [class*="message-content"]');
          if (markdownDiv) {
            const text = markdownDiv.innerText || markdownDiv.textContent || '';
            if (text.length > 500) {
              fullText = text;
              extractMethod = 'markdown-container';
            }
          }
        }
      }
      
      // ===== METHOD 3: Try to extract from the main response div =====
      if (fullText.length < 500) {  // Changed from < 100 to < 500
        let assistantMsg = document.querySelector('article[data-turn="assistant"]');
        if (!assistantMsg) assistantMsg = document.querySelector('[data-message-author-role="assistant"]');
        
        if (assistantMsg) {
          // Get all paragraph text and combine
          const paragraphs = Array.from(assistantMsg.querySelectorAll('p'))
            .map(el => {
              const text = el.innerText || el.textContent || '';
              return text.trim();
            })
            .filter(t => t.length > 0)
            .join('\n');
          
          if (paragraphs.length > 500) {
            fullText = paragraphs;
            extractMethod = 'all-paragraphs-combined';
          }
        }
      }
      
      // ===== FALLBACK: Get all assistant message content =====
      if (fullText.length < 500) {  // Changed from < 100 to < 500
        let allMessages = document.querySelectorAll('article[data-turn="assistant"]');
        if (allMessages.length === 0) allMessages = document.querySelectorAll('[data-message-author-role="assistant"]');
        
        if (allMessages.length > 0) {
          const lastMsg = allMessages[allMessages.length - 1];
          const text = lastMsg.innerText || lastMsg.textContent || '';
          if (text.length > 500) {
            fullText = text;
            extractMethod = 'last-assistant-message';
          }
        }
      }
      
      // ===== FINAL FALLBACK: Search for response by markers (old format) =====
      if (fullText.length < 500) {  // Changed from < 100 to < 500
        const allText = document.body.innerText || document.body.textContent || '';
        const charProfileIndex = allText.lastIndexOf('*** CHARACTER PROFILE START ***');
        if (charProfileIndex > 0) {
          fullText = allText.substring(charProfileIndex);
          extractMethod = 'marker-body-split';
        }
      }
      
      // ===== Clean up response: Extract structured sections from old format =====
      let sections = [];
      if (fullText.length > 300 && fullText.includes('***')) {
        const charMatch = fullText.match(/\*\*\*\s*CHARACTER\s+PROFILE\s+START\s*\*\*\*([\s\S]*?)\*\*\*\s*CHARACTER\s+PROFILE\s+END\s*\*\*\*/i);
        const prodMatch = fullText.match(/\*\*\*\s*PRODUCT\s+DETAILS\s+START\s*\*\*\*([\s\S]*?)\*\*\*\s*PRODUCT\s+DETAILS\s+END\s*\*\*\*/i);
        const analysisMatch = fullText.match(/\*\*\*\s*ANALYSIS\s+START\s*\*\*\*([\s\S]*?)\*\*\*\s*ANALYSIS\s+END\s*\*\*\*/i);
        const recMatch = fullText.match(/\*\*\*\s*RECOMMENDATIONS\s+START\s*\*\*\*([\s\S]*?)\*\*\*\s*RECOMMENDATIONS\s+END\s*\*\*\*/i);
        
        // Build sections array
        if (charMatch) sections.push(charMatch[0]);
        if (prodMatch) sections.push(prodMatch[0]);
        if (analysisMatch) sections.push(analysisMatch[0]);
        if (recMatch) sections.push(recMatch[0]);
        
        // If we found sections, only return those (clean response)
        if (sections.length >= 2) {
          fullText = sections.join('\n\n');
          extractMethod += '-cleaned-to-sections';
        }
      }
      
      return {
        text: fullText.trim(),
        method: extractMethod,
        length: fullText.trim().length
      };
    });
    
    // Log extraction details in Node context
    console.log(`   📌 Method: ${response.method}`);
    console.log(`   📊 Length: ${response.length}ch`);
    
    if (response.length === 0) {
      console.error('❌ CRITICAL: Response is EMPTY!');
      console.error('   Extraction method:', response.method);
      console.error('   This means page.evaluate() returned empty text');
      
      // Try to get page state for debugging
      try {
        const debugInfo = await this.page.evaluate(() => {
          const assistant = document.querySelector('[data-message-author-role="assistant"]');
          const markdown = document.querySelector('.markdown');
          const paragraphs = Array.from(document.querySelectorAll('p'));
          
          return {
            hasAssistantElement: !!assistant,
            hasMarkdownElement: !!markdown,
            paragraphCount: paragraphs.length,
            bodyTextLength: (document.body.innerText || '').length,
            firstParagraphText: paragraphs[0]?.innerText?.substring(0, 100) || 'N/A',
            bodyText: (document.body.innerText || '').substring(0, 200)
          };
        });
        
        console.error('📋 Debug info from page:');
        console.error('   Assistant element found:', debugInfo.hasAssistantElement);
        console.error('   Markdown element found:', debugInfo.hasMarkdownElement);
        console.error('   Paragraphs found:', debugInfo.paragraphCount);
        console.error('   Body text length:', debugInfo.bodyTextLength);
        console.error('   First 100ch of body:', debugInfo.bodyText);
      } catch (debugErr) {
        console.error('   Could not get debug info:', debugErr.message);
      }
    }
    
    console.log(`✅ Response extracted: ${response.length} characters`);
    
    // Debug: Save screenshot if response seems incomplete
    if (response.length < 200) {
      console.log('⚠️  WARNING: Response seems incomplete, saving debug files...');
      try {
        const timestamp = Date.now();
        
        // Save screenshot
        const screenshotPath = path.join(process.cwd(), 'temp', `chatgpt-response-debug-${timestamp}.png`);
        await this.screenshot({ path: screenshotPath });
        console.log(`📸 Screenshot saved: ${screenshotPath}`);
        
        // Save page HTML for debugging
        const html = await this.page.content();
        const htmlPath = path.join(process.cwd(), 'temp', `chatgpt-response-debug-${timestamp}.html`);
        fs.writeFileSync(htmlPath, html);
        console.log(`📄 Page HTML saved: ${htmlPath}`);
      } catch (e) {
        console.log(`❌ Could not save debug files: ${e.message}`);
      }
    }
    
    // Verify response is valid (has analysis sections)
    try {
      const hasJson = /\{[\s\S]*\}/.test(response.text);
      const hasMarker = response.text.includes('*** CHARACTER PROFILE START ***');
      
      if (response.length > 100 && (hasJson || hasMarker)) {
        console.log('✅ Response validation: OK - contains valid analysis');
      } else if (response.length > 0 && hasJson) {
        console.log('✅ Response validation: OK - contains JSON structure');
      } else if (response.length > 0) {
        console.log('⚠️  Response validation: Incomplete - may need restructuring');
      }
    } catch (e) {
      // Validation check failed, but response still returned
    }
    
    console.log('='.repeat(80) + '\n');
    
    return response.text;
  }

  /**
   * Send text-only prompt to ChatGPT (no image required)
   * Perfect for video script generation, code generation, etc.
   */
  async sendPrompt(prompt, options = {}) {
    console.log('\n📝 ChatGPT TEXT PROMPT');
    console.log('='.repeat(80));
    console.log(`Prompt: ${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}`);
    console.log('');

    const maxWait = options.maxWait || 120000; // 120 seconds default
    const stabilityThreshold = options.stabilityThreshold || 50; // Characters to check for stability

    try {
      // Step 1: Find text input
      console.log('📍 STEP 1: Looking for message input...');
      
      const textInputSelectors = [
        'textarea[placeholder*="message"]',
        'textarea[placeholder*="Ask"]',
        'textarea[placeholder*="Message"]',
        'textarea[placeholder*="Send a message"]',
        'textarea',
        'div[contenteditable="true"]',
        '[contenteditable="true"]'
      ];

      let textInputSelector = null;
      
      for (const selector of textInputSelectors) {
        try {
          const element = await this.page.$(selector);
          if (element) {
            const isVisible = await this.page.evaluate((sel) => {
              const el = document.querySelector(sel);
              return !!(el && el.offsetParent !== null);
            }, selector);
            
            if (isVisible) {
              textInputSelector = selector;
              console.log(`   ✅ Found input: ${selector}`);
              break;
            }
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      if (!textInputSelector) {
        throw new Error('Could not find message input field');
      }

      // Step 2: Focus input and clear existing text
      console.log('📍 STEP 2: Preparing input field...');
      try {
        await this.page.click(textInputSelector);
        await this.page.waitForTimeout(500);
        
        // Clear existing text
        await this.page.evaluate((sel) => {
          const el = document.querySelector(sel);
          if (el) {
            if (el.tagName === 'TEXTAREA') {
              el.value = '';
            } else if (el.contentEditable === 'true') {
              el.textContent = '';
            }
            el.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }, textInputSelector);
        
        await this.page.waitForTimeout(300);
        console.log('   ✅ Input cleared');
      } catch (error) {
        console.error(`   ❌ Error preparing input: ${error.message}`);
        throw error;
      }

      // Step 3: Type prompt into input
      console.log('📍 STEP 3: Entering prompt...');
      try {
        await this.page.evaluate((sel, text) => {
          const el = document.querySelector(sel);
          if (!el) throw new Error('Input field not found');
          
          // Set value directly
          if (el.tagName === 'TEXTAREA') {
            el.value = text;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          } else if (el.contentEditable === 'true') {
            el.textContent = text;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }
          
          return true;
        }, textInputSelector, prompt);
        
        console.log(`   ✅ Prompt entered (${prompt.length} characters)`);
        await this.page.waitForTimeout(1000);
      } catch (error) {
        console.error(`   ❌ Error entering prompt: ${error.message}`);
        throw error;
      }

      // Step 4: Submit prompt with button-first fallback
      const submitResult = await this.submitPromptWithFallback('STEP 4', { waitAfterMs: 2000 });
      console.log('   Message sent via', submitResult.sendMethod);

      // Step 5: Wait for response to appear
      console.log('📍 STEP 5: Waiting for ChatGPT response...');
      await this.page.waitForTimeout(2000);

      // Step 6: Extract response with optimized completion detection
      let lastLength = 0;
      let stableCount = 0;
      let readyCount = 0;
      const startTime = Date.now();
      const requiredStableChecks = 4; // 💫 FIXED: Increased from 2 to 4 - ensure strong stability
      const requiredReadyChecks = 3;  // Keep stricter requirement
      const checkInterval = 500;      // Check every 500ms
      let consecutiveCompletionChecks = 0;

      while (Date.now() - startTime < maxWait) {
        try {
          const status = await this.page.evaluate(() => {
            // Find the last assistant message
            const messages = Array.from(document.querySelectorAll('[data-message-author-role="assistant"]'));
            
            if (messages.length === 0) {
              return { responseText: '', isComplete: false };
            }

            const lastMessage = messages[messages.length - 1];
            const text = lastMessage?.innerText || '';
            
            if (!text || text.length === 0) {
              return { responseText: '', isComplete: false };
            }

            // Multiple indicators that response is complete:
            
            // Indicator 1: No loading spinner/animation visible
            const hasSpinner = lastMessage.querySelector(
              '[class*="animate"], [class*="spinner"], [class*="loading"], .cursor-text'
            ) !== null;
            
            // Indicator 2: Input field is enabled (user can type)
            const inputSelectors = [
              'textarea[placeholder*="message"]',
              'textarea[placeholder*="Ask"]',
              'div[contenteditable="true"]',
              '[contenteditable="true"]'
            ];
            
            let inputEnabled = false;
            for (const sel of inputSelectors) {
              const input = document.querySelector(sel);
              if (input) {
                inputEnabled = !input.disabled && input.offsetParent !== null;
                break;
              }
            }
            
            // Indicator 3: Send button is enabled
            const sendButtonSelectors = [
              'button[aria-label*="send"]',
              'button[aria-label*="Send"]',
              'button[data-testid="send-button"]',
              'button[type="submit"]'
            ];
            
            let sendButtonEnabled = false;
            for (const sel of sendButtonSelectors) {
              const buttons = document.querySelectorAll(sel);
              for (const btn of buttons) {
                if (!btn.disabled && btn.offsetParent !== null) {
                  sendButtonEnabled = true;
                  break;
                }
              }
              if (sendButtonEnabled) break;
            }
            
            // Response is complete when:
            // - No spinning animation
            // - Input field is enabled
            // - Send button is enabled
            const isComplete = !hasSpinner && inputEnabled && sendButtonEnabled && text.length > 0;

            return {
              responseText: text,
              isComplete,
              indicators: {
                hasSpinner,
                inputEnabled,
                sendButtonEnabled,
                textLength: text.length
              }
            };
          });

          const { responseText, isComplete, indicators } = status;

          if (responseText && responseText.length > 0) {
            const currentLength = responseText.length;

            // Check if text has stabilized (not changing)
            if (Math.abs(currentLength - lastLength) < stabilityThreshold) {
              stableCount++;
            } else {
              stableCount = 0;
            }

            // Check if all completion indicators are true
            if (isComplete) {
              readyCount++;
              consecutiveCompletionChecks++;
            } else {
              readyCount = 0;
              consecutiveCompletionChecks = 0;
            }

            // � FIXED: Stricter exit strategy to prevent cut-off segments
            // For long content (scripts with multiple segments), require stronger stability
            const isMediumContent = currentLength > 500 && currentLength <= 3000;
            const isLongContent = currentLength > 3000;
            
            // Require MORE checks for longer content
            const requiredStableForLength = isLongContent ? 5 : (isMediumContent ? 4 : 2);
            
            // Exit if ALL conditions are true:
            // - Text has stabilized (not growing)
            // - All completion indicators are true
            // - Strong stability requirements based on content length
            if (isComplete && stableCount >= requiredStableForLength && consecutiveCompletionChecks >= requiredReadyChecks) {
              console.log(`   ✅ Response complete (${currentLength} characters) - Stable exit`);
              console.log(`      - Required stability: ${requiredStableForLength}, achieved: ${stableCount}`);
              console.log(`      - No spinner: ${!indicators.hasSpinner}`);
              console.log(`      - Input enabled: ${indicators.inputEnabled}`);
              console.log(`      - Send button enabled: ${indicators.sendButtonEnabled}`);
              break;
            }

            // 💫 FIXED: Stricter fallback - only for very long responses
            // Requires higher stability to prevent premature exit
            if (isLongContent && currentLength > 2000 && stableCount >= 4) {
              console.log(`   ✅ Response complete (${currentLength} characters) - Substantial + stable`);
              break;
            }

            lastLength = currentLength;
          }

          await this.page.waitForTimeout(checkInterval); // Check every 500ms instead of 2000ms
        } catch (e) {
          console.warn('   ⚠️  Error checking completion status:', e.message);
          await this.page.waitForTimeout(checkInterval);
        }
      }

      // Step 7: Extract final response with better text capture
      console.log('📍 STEP 7: Extracting response...');
      
      const response = await this.page.evaluate(() => {
        // Try to find the last assistant message
        const messages = Array.from(document.querySelectorAll('[data-message-author-role="assistant"]'));
        
        if (messages.length > 0) {
          const lastMessage = messages[messages.length - 1];
          // 💫 FIXED: Use combination of methods for more complete text capture
          let text = lastMessage?.innerText || '';
          
          // Fallback: if innerText is empty or short, try textContent
          if (!text || text.length < 100) {
            text = lastMessage?.textContent || '';
          }
          
          // Ensure we scroll the element into full view
          if (lastMessage) {
            lastMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
          
          return text;
        }

        return '';
      });

      if (!response || response.length === 0) {
        throw new Error('Could not extract response from ChatGPT');
      }

      // 💫 NEW: Log response preview to diagnose cut-off issues
      const preview = response.substring(0, 200) + (response.length > 200 ? '...' : '');
      console.log(`   ✅ Response extracted (${response.length} characters)`);
      console.log(`   📄 Preview: ${preview}`);
      console.log('='.repeat(80));
      console.log('✅ PROMPT COMPLETED\n');

      return response;

    } catch (error) {
      console.error('❌ ChatGPT prompt failed:', error.message);
      
      // Save debug info on error
      try {
        await this.saveErrorDebugInfo('chatgpt-prompt');
      } catch (e) {
        console.log('⚠️  Could not save error debug info');
      }
      
      throw error;
    }
  }

  /**
   * 💾 Capture and save current session before closing
   * This ensures cookies + auth tokens are persisted for next run
   */
  async captureAndSaveSession() {
    if (!this.page) return false;
    
    try {
      console.log('📸 Capturing session before closing...');
      
      // Get current cookies
      const cookies = await this.page.cookies();
      
      // Get localStorage
      const localStorage = await this.page.evaluate(() => {
        const items = {};
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          items[key] = window.localStorage.getItem(key);
        }
        return items;
      });
      
      // Get sessionStorage
      const sessionStorage = await this.page.evaluate(() => {
        const items = {};
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const key = window.sessionStorage.key(i);
          items[key] = window.sessionStorage.getItem(key);
        }
        return items;
      });
      
      // Check authentication status
      const isAuthed = await this.isAuthenticated();
      
      const sessionData = {
        cookies,
        localStorage,
        sessionStorage,
        timestamp: new Date().toISOString(),
        url: this.page.url(),
        isAuthenticated: isAuthed
      };
      
      // 💾 Ensure session directory exists before saving
      const sessionDir = path.dirname(this.sessionPath);
      if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
        console.log(`   📁 Created session directory: ${sessionDir}`);
      }
      
      // 💾 Save to file
      fs.writeFileSync(this.sessionPath, JSON.stringify(sessionData, null, 2));
      
      console.log('   ✅ Session captured and saved');
      console.log(`      - Cookies: ${cookies.length}`);
      console.log(`      - LocalStorage items: ${Object.keys(localStorage).length}`);
      console.log(`      - SessionStorage items: ${Object.keys(sessionStorage).length}`);
      console.log(`      - Authenticated: ${isAuthed ? '✅' : '❌'}`);
      console.log(`      - Saved to: ${this.sessionPath}`);

      if (this.accountRegistry) {
        this.accountRegistry.markUsed({ accountKey: this.accountKey, email: this.accountEmail });
      }
      
      return true;
    } catch (error) {
      console.warn(`⚠️  Failed to capture session: ${error.message}`);
      return false;
    }
  }

  /**
   * 🔐 Override close() to save session before closing browser
   */
  async close() {
    try {
      // Capture + save session BEFORE closing browser
      await this.captureAndSaveSession();
      
      // Then close browser using parent method
      await super.close();
      
      console.log('✅ ChatGPT browser closed with session saved');
    } catch (error) {
      console.error(`❌ Error during close: ${error.message}`);
      // Still try to close browser even if session capture fails
      try {
        await super.close();
      } catch (e) {
        console.error(`❌ Failed to close browser: ${e.message}`);
      }
    }
  }
}

export default ChatGPTService;
