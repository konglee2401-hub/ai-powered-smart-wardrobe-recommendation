/**
 * TokenManager - Handles reCAPTCHA and authentication tokens
 * 
 * Consolidated from:
 * - ensureFreshTokens() - Verify token freshness (now deprecated, kept for compatibility)
 * - refreshTokensAutomatically() - Refresh session timestamp
 * - clearGrecaptchaTokens() - Clear cached reCAPTCHA tokens before submission
 * 
 * NOTE: reCAPTCHA tokens are generated fresh during form submission.
 * We don't store/restore them because invalid tokens cause API 400 errors.
 * 
 * @example
 * const manager = new TokenManager(sessionManager);
 * await manager.clearGrecaptchaTokens();
 * await manager.ensureFreshTokens();
 */

class TokenManager {
  constructor(sessionManager) {
    this.sessionManager = sessionManager;
    this.page = sessionManager.getPage();
    this.sessionData = sessionManager.sessionData;
    this.debugMode = sessionManager.options.debugMode || false;
  }

  /**
   * Verify token freshness (DEPRECATED)
   * Note: Token freshness check deprecated.
   * reCAPTCHA tokens are now generated fresh during each form submission,
   * so we don't need to store or manage them in the session.
   */
  async ensureFreshTokens() {
    if (!this.sessionData) {
      console.log('ℹ️  No session data for monitoring');
      return;
    }

    try {
      const sessionAge = Date.now() - new Date(this.sessionData.timestamp).getTime();
      const ageSeconds = Math.round(sessionAge / 1000);

      console.log(`📋 Session age: ${ageSeconds} seconds\n`);
      console.log(`ℹ️  reCAPTCHA tokens will be generated fresh during submission\n`);
    } catch (error) {
      console.log(`⚠️  Session monitoring failed: ${error.message}\n`);
    }
  }

  /**
   * Refresh session timestamp automatically
   * DEPRECATED: reCAPTCHA tokens NOT captured/stored anymore.
   * Tokens generated fresh during form submission only.
   */
  async refreshTokensAutomatically() {
    try {
      this.sessionData.timestamp = new Date().toISOString();
      console.log('   ✅ Session timestamp updated\n');
    } catch (error) {
      console.log(`   ⚠️  Refresh failed: ${error.message}\n`);
    }
  }

  /**
   * Clear reCAPTCHA tokens before submission
   * Uses Chrome DevTools Protocol to access cookies from ALL domains
   * (including google.com which page.cookies() cannot access)
   * 
   * Clears:
   * 1. localStorage items: _grecaptcha, rc::a, rc::f
   * 2. Cookies: grecaptcha-related cookies from all domains
   * 3. sessionStorage: entire session storage
   */
  async clearGrecaptchaTokens() {
    if (this.debugMode) {
      console.log('🔧 [DEBUG] Skipping token clearing\n');
      return;
    }

    try {
      console.log('🧹 Clearing cached reCAPTCHA tokens before submission...');
      
      // Clear from localStorage
      const cleared = await this.page.evaluate(() => {
        const keysToDelete = ['_grecaptcha', 'rc::a', 'rc::f'];
        let deletedCount = 0;
        
        for (const key of keysToDelete) {
          if (localStorage.getItem(key)) {
            localStorage.removeItem(key);
            deletedCount++;
          }
        }
        
        // Also clear any keys matching grecaptcha pattern (case-insensitive)
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.toLowerCase().includes('grecaptcha')) {
            localStorage.removeItem(key);
            deletedCount++;
          }
        }
        
        return deletedCount;
      });
      
      if (cleared > 0) {
        console.log(`   ✅ Cleared ${cleared} tokens from localStorage`);
      }
      
      // Clear from cookies using Chrome DevTools Protocol (CDP)
      try {
        const cdpSession = await this.page.target().createCDPSession();
        
        // Get all cookies
        const result = await cdpSession.send('Network.getAllCookies');
        const allCookies = result.cookies || [];
        let deletedCount = 0;
        
        for (const cookie of allCookies) {
          const nameLower = cookie.name.toLowerCase();
          
          // Match grecaptcha-related cookies
          if (nameLower === '_grecaptcha' || 
              nameLower.startsWith('rc::') ||
              nameLower.includes('captcha') ||
              nameLower.includes('recaptcha')) {
            
            try {
              // Delete via CDP (works for all domains including google.com)
              await cdpSession.send('Network.deleteCookies', {
                name: cookie.name,
                domain: cookie.domain,
                path: cookie.path
              });
              deletedCount++;
              console.log(`   ✓ Deleted: ${cookie.name} from ${cookie.domain}`);
            } catch (deleteError) {
              // Ignore deletion errors
            }
          }
        }
        
        await cdpSession.detach();
        
        if (deletedCount > 0) {
          console.log(`   ✅ Cleared ${deletedCount} tokens from cookies (all domains)`);
        }
      } catch (cdpError) {
        console.log(`   ⚠️  Cookie clearing via CDP failed: ${cdpError.message}`);
        console.log('   💡 Attempting fallback with page.cookies()...');
        
        // Fallback: try with page.cookies() which only gets current domain
        try {
          const cookies = await this.page.cookies();
          let fallbackCount = 0;
          
          for (const cookie of cookies) {
            const nameLower = cookie.name.toLowerCase();
            if (nameLower === '_grecaptcha' || nameLower.startsWith('rc::')) {
              try {
                await this.page.deleteCookie(cookie);
                fallbackCount++;
              } catch (e) {
                // Ignore
              }
            }
          }
          
          if (fallbackCount > 0) {
            console.log(`   ✅ Fallback: Cleared ${fallbackCount} tokens from current domain`);
          }
        } catch (e) {
          console.log(`   ⚠️  Fallback also failed: ${e.message}`);
        }
      }
      
      // Clear sessionStorage
      try {
        await this.page.evaluate(() => {
          sessionStorage.clear();
        });
      } catch (e) {
        // Ignore errors
      }
      
      console.log('   💡 Fresh tokens will be generated during API submission\n');
    } catch (error) {
      console.warn(`   ⚠️  Error clearing tokens: ${error.message}`);
    }
  }

  /**
   * Update session data timestamp
   * Called periodically during long operations
   */
  updateSessionTimestamp() {
    if (this.sessionData) {
      this.sessionData.timestamp = new Date().toISOString();
    }
  }

  /**
   * Get current session data
   */
  getSessionData() {
    return this.sessionData;
  }
}

export default TokenManager;
