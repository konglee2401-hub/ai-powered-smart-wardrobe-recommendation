/**
 * SeedInterceptor - Intercept Google Flow API requests and inject seed parameter
 * 
 * Solves: When user types SEED: 925090 in prompt, Google Flow still uses random seed
 * Approach: Use Puppeteer route interception to catch API requests and add seed to body
 */

import { extractSeedFromPrompt } from '../utilities/SeedUtility.js';

class SeedInterceptor {
  constructor() {
    this.page = null;
    this.isSetup = false;
    this.currentSeed = null;
    this.lastInterceptedSeed = null;
  }

  /**
   * Setup route interception on page
   * Must be called after page is created but before navigation
   * @param {Page} puppeteerPage
   */
  async setupInterception(puppeteerPage) {
    if (this.isSetup || !puppeteerPage) {
      console.warn('[SeedInterceptor] Already setup or page is null');
      return;
    }

    this.page = puppeteerPage;
    
    try {
      // Intercept Google Flow batch generation API calls
      await this.page.route(
        (url) => {
          const urlStr = url.toString();
          // Match Google Flow API endpoint for batch generation
          return urlStr.includes('flowMedia:batchGenerateImages') ||
                 urlStr.includes('aisandbox-pa.googleapis.com');
        },
        (route) => this._interceptRequest(route)
      );

      // Also intercept all fetch requests to add seed where needed
      await this.page.on('request', (request) => this._onRequest(request));
      
      this.isSetup = true;
      console.log('[SeedInterceptor] ✅ Route interception setup complete');
    } catch (error) {
      console.error('[SeedInterceptor] Failed to setup interception:', error.message);
    }
  }

  /**
   * Set the seed for next generation
   * Called when prompt contains SEED: xxx
   * @param {string} promptText
   */
  setSeedFromPrompt(promptText) {
    if (!promptText) return;
    
    const seed = extractSeedFromPrompt(promptText);
    if (seed !== null) {
      this.currentSeed = seed;
      console.log(`[SeedInterceptor] 📊 Seed extracted from prompt: ${seed}`);
    }
  }

  /**
   * Manually set seed
   * @param {number} seed
   */
  setSeed(seed) {
    if (typeof seed === 'number') {
      this.currentSeed = seed;
      console.log(`[SeedInterceptor] 📊 Seed set to: ${seed}`);
    }
  }

  /**
   * Get last seed that was actually sent to API
   */
  getLastSeed() {
    return this.lastInterceptedSeed;
  }

  /**
   * Clear current seed (reset to random)
   */
  clearSeed() {
    this.currentSeed = null;
    console.log('[SeedInterceptor] Seed cleared - will use random');
  }

  /**
   * Intercept route requests
   * @private
   */
  async _interceptRequest(route) {
    const request = route.request();
    const url = request.url();
    const method = request.method();
    let body = null;

    try {
      // Only modify POST/PUT requests
      if ((method === 'POST' || method === 'PUT') && this.currentSeed !== null) {
        body = request.postData();

        if (body) {
          try {
            // Parse JSON body
            const bodyObj = typeof body === 'string' ? JSON.parse(body) : body;

            // Add seed to each request in the batch
            if (bodyObj.requests && Array.isArray(bodyObj.requests)) {
              bodyObj.requests.forEach((req) => {
                req.seed = this.currentSeed;
              });
              
              this.lastInterceptedSeed = this.currentSeed;
              
              const modifiedBody = JSON.stringify(bodyObj);
              console.log(
                `[SeedInterceptor] 🎯 Injected seed ${this.currentSeed} into API request`
              );

              // Continue with modified body
              return route.continue({
                postData: modifiedBody
              });
            }
          } catch (parseError) {
            console.warn('[SeedInterceptor] Could not parse body:', parseError.message);
          }
        }
      }

      // No modification needed, continue normally
      return route.continue();
    } catch (error) {
      console.error('[SeedInterceptor] Error in _interceptRequest:', error.message);
      return route.continue();
    }
  }

  /**
   * Monitor all requests (for logging/debugging)
   * @private
   */
  async _onRequest(request) {
    const url = request.url();
    
    // Log Google Flow API calls
    if (url.includes('aisandbox-pa.googleapis.com') || 
        url.includes('flowMedia:batchGenerateImages')) {
      console.log(`[SeedInterceptor] 📡 Request: ${request.method()} ${url}`);
    }
  }

  /**
   * Cleanup - remove all interceptors
   */
  async cleanup() {
    if (this.page) {
      try {
        await this.page.unroute('**/*');
        this.page.removeAllListeners('request');
        this.isSetup = false;
        console.log('[SeedInterceptor] ✅ Interceptors removed');
      } catch (error) {
        console.error('[SeedInterceptor] Error during cleanup:', error.message);
      }
    }
  }
}

export default SeedInterceptor;
