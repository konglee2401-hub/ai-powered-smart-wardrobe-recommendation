/**
 * Key Manager - ENHANCED VERSION
 * 
 * FIXES THE BUG: All requests were using OPENROUTER_API_KEY_1 only!
 * 
 * NEW FEATURES:
 * - Round-robin rotation across all keys
 * - Rate limit tracking and automatic cooldown
 * - Key health monitoring
 * - Provider-specific key management
 * - Automatic fallback when keys are exhausted
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// ============================================================
// KEY MANAGER CLASS - ENHANCED
// ============================================================

class KeyRotationManager {
  constructor() {
    this.keys = new Map(); // provider -> [key objects]
    this.currentIndex = new Map(); // provider -> current index
    this.stats = new Map(); // provider -> statistics
  }

  // ============================================================
  // INITIALIZATION
  // ============================================================

  /**
   * Load keys from environment variables
   * Supports multiple numbered keys: PROVIDER_API_KEY_1, PROVIDER_API_KEY_2, etc.
   */
  loadKeys() {
    console.log('\n🔑 LOADING API KEYS...');

    const providers = [
      'OPENROUTER', 'ANTHROPIC', 'OPENAI', 'GOOGLE', 'GROQ', 'MISTRAL',
      'FIREWORKS', 'NVIDIA', 'REPLICATE', 'FAL', 'TOGETHER', 'HUGGINGFACE',
      'DEEPINFRA', 'SEGMIND'
    ];

    let totalKeys = 0;

    providers.forEach(provider => {
      const providerKeys = [];
      let keyIndex = 1;

      // Load numbered keys: PROVIDER_API_KEY_1, PROVIDER_API_KEY_2, ...
      while (process.env[`${provider}_API_KEY_${keyIndex}`]) {
        const keyValue = process.env[`${provider}_API_KEY_${keyIndex}`];

        providerKeys.push({
          key: keyValue,
          index: keyIndex,
          requests: 0,
          failures: 0,
          lastUsed: null,
          rateLimitUntil: null,
          lastError: null,
          consecutiveFailures: 0,
          totalFailures: 0
        });

        keyIndex++;
      }

      // Also check for non-numbered key: PROVIDER_API_KEY
      if (process.env[`${provider}_API_KEY`] && providerKeys.length === 0) {
        const keyValue = process.env[`${provider}_API_KEY`];

        providerKeys.push({
          key: keyValue,
          index: 1,
          requests: 0,
          failures: 0,
          lastUsed: null,
          rateLimitUntil: null,
          lastError: null,
          consecutiveFailures: 0,
          totalFailures: 0
        });
      }

      if (providerKeys.length > 0) {
        this.keys.set(provider, providerKeys);
        this.currentIndex.set(provider, 0);

        console.log(`   ✅ ${provider}: ${providerKeys.length} key(s) loaded`);
        totalKeys += providerKeys.length;

        // Initialize stats
        this.stats.set(provider, {
          total: providerKeys.length,
          available: providerKeys.length,
          rateLimited: 0,
          totalRequests: 0,
          totalFailures: 0,
          lastUsed: null
        });
      }
    });

    console.log(`🔑 Total keys loaded: ${totalKeys} across ${this.keys.size} providers\n`);

    if (totalKeys === 0) {
      console.warn('⚠️  WARNING: No API keys found! Check your .env file.');
    }

    return totalKeys;
  }

  // ============================================================
  // KEY ROTATION & SELECTION
  // ============================================================

  /**
   * Get next available key with ROUND-ROBIN rotation
   * Automatically skips rate-limited keys
   */
  getNextKey(provider, options = {}) {
    const { skipRateLimited = true, maxAttempts = 5 } = options;

    const providerKeys = this.keys.get(provider);
    if (!providerKeys || providerKeys.length === 0) {
      throw new Error(`No API keys configured for ${provider}`);
    }

    const now = Date.now();
    let attempts = 0;
    const startIndex = this.currentIndex.get(provider);

    console.log(`🔄 ${provider} Key Rotation: Starting at index ${startIndex}`);

    // Try each key until we find an available one
    while (attempts < Math.min(maxAttempts, providerKeys.length)) {
      const currentIdx = this.currentIndex.get(provider);
      const keyObj = providerKeys[currentIdx];

      console.log(`   Checking key #${keyObj.index}: ${this.getKeyStatus(keyObj, now)}`);

      // Check if key is available
      let isAvailable = true;

      if (skipRateLimited && keyObj.rateLimitUntil && keyObj.rateLimitUntil > now) {
        isAvailable = false;
        console.log(`      ⏳ Rate limited until ${new Date(keyObj.rateLimitUntil).toLocaleTimeString()}`);
      }

      // Check for too many consecutive failures (circuit breaker)
      // Check if temporary ban is active
      if (keyObj.consecutiveFailures >= 3 && keyObj.rateLimitUntil && keyObj.rateLimitUntil > now) {
        isAvailable = false;
        console.log(`      🚫 Circuit breaker: ${keyObj.consecutiveFailures} consecutive failures (Cooling down)`);
      } else if (keyObj.consecutiveFailures >= 3 && (!keyObj.rateLimitUntil || keyObj.rateLimitUntil <= now)) {
         // Reset after cooldown
         keyObj.consecutiveFailures = 0;
         keyObj.rateLimitUntil = null;
         console.log(`      ♻️ Circuit breaker reset: Key #${keyObj.index} is available again`);
      }

      if (isAvailable) {
        // This key is available!

        // Rotate to next key for next call (ROUND-ROBIN)
        this.currentIndex.set(provider, (currentIdx + 1) % providerKeys.length);

        // Update stats
        keyObj.requests++;
        keyObj.lastUsed = now;

        // Update provider stats
        const providerStats = this.stats.get(provider);
        providerStats.totalRequests++;
        providerStats.lastUsed = now;

        console.log(`   ✅ Selected ${provider} key #${keyObj.index} (${keyObj.requests} requests, ${keyObj.failures} failures)`);

        // Return the key object (not just the key string) for tracking
        return keyObj;
      }

      // This key is not available, try next
      this.currentIndex.set(provider, (currentIdx + 1) % providerKeys.length);
      attempts++;
    }

    // No available keys found
    const providerStats = this.stats.get(provider);
    throw new Error(`All ${provider} keys are unavailable (${providerStats.rateLimited} rate limited, ${attempts} checked)`);
  }

  /**
   * Get human-readable key status
   */
  getKeyStatus(keyObj, now = Date.now()) {
    if (keyObj.rateLimitUntil && keyObj.rateLimitUntil > now) {
      return 'RATE LIMITED';
    }
    if (keyObj.consecutiveFailures >= 3) {
      return 'CIRCUIT BREAKER';
    }
    return 'AVAILABLE';
  }

  // ============================================================
  // ERROR HANDLING & RATE LIMITING
  // ============================================================

  /**
   * Mark key as failed (for rate limiting or errors)
   */
  markKeyFailed(provider, key, error, options = {}) {
    const {
      rateLimitSeconds = null,
      isRateLimit = false,
      isCircuitBreaker = false
    } = options;

    const providerKeys = this.keys.get(provider);
    if (!providerKeys) return;

    const keyObj = providerKeys.find(k => k.key === key);
    if (!keyObj) return;

    // Update failure stats
    keyObj.failures++;
    keyObj.totalFailures++;
    keyObj.lastError = error;

    if (isRateLimit || rateLimitSeconds) {
      // Rate limited - set cooldown
      const cooldownSeconds = rateLimitSeconds || 60; // Default 1 minute
      keyObj.rateLimitUntil = Date.now() + (cooldownSeconds * 1000);

      // Update provider stats
      const providerStats = this.stats.get(provider);
      providerStats.rateLimited = providerKeys.filter(k => k.rateLimitUntil && k.rateLimitUntil > Date.now()).length;

      console.log(`⏳ ${provider} Key #${keyObj.index} rate limited for ${cooldownSeconds}s`);
      console.log(`   Error: ${error}`);
    } else if (isCircuitBreaker) {
      // Circuit breaker - increment consecutive failures
      keyObj.consecutiveFailures++;

      if (keyObj.consecutiveFailures >= 3) {
        console.log(`🚫 ${provider} Key #${keyObj.index} circuit breaker activated (${keyObj.consecutiveFailures} failures)`);
        // If 3 consecutive failures, mark as temporarily unavailable for 5 mins
        keyObj.rateLimitUntil = Date.now() + (300 * 1000); 
      }
    } else {
      // Regular failure - increment consecutive failures
      keyObj.consecutiveFailures++;

      // If 3 consecutive failures, mark as temporarily unavailable for 5 mins
      // Also apply this for explicit 'circuit breaker' calls
      if (keyObj.consecutiveFailures >= 3) {
        console.log(`🚫 ${provider} Key #${keyObj.index} circuit breaker activated (${keyObj.consecutiveFailures} failures)`);
        keyObj.rateLimitUntil = Date.now() + (300 * 1000); 
      }
    }

    // Update provider stats
    const providerStats = this.stats.get(provider);
    providerStats.totalFailures++;
  }

  /**
   * Mark key as successful (reset circuit breaker)
   */
  markKeySuccess(provider, key) {
    const providerKeys = this.keys.get(provider);
    if (!providerKeys) return;

    const keyObj = providerKeys.find(k => k.key === key);
    if (!keyObj) return;

    // Reset consecutive failures on success
    keyObj.consecutiveFailures = 0;
  }

  // ============================================================
  // UTILITY METHODS
  // ============================================================

  /**
   * Check if provider has any available keys
   */
  hasAvailableKeys(provider) {
    const providerKeys = this.keys.get(provider);
    if (!providerKeys) return false;

    const now = Date.now();
    return providerKeys.some(keyObj =>
      (!keyObj.rateLimitUntil || keyObj.rateLimitUntil <= now) &&
      keyObj.consecutiveFailures < 3
    );
  }

  /**
   * Get statistics for monitoring
   */
  getStats(provider = null) {
    if (provider) {
      return this.stats.get(provider) || null;
    }

    // Return all stats
    const allStats = {};
    for (const [prov, stats] of this.stats) {
      allStats[prov] = stats;
    }
    return allStats;
  }

  /**
   * Get detailed key information
   */
  getKeyDetails(provider = null) {
    if (provider) {
      const keys = this.keys.get(provider);
      if (!keys) return null;

      const now = Date.now();
      return keys.map(keyObj => ({
        index: keyObj.index,
        requests: keyObj.requests,
        failures: keyObj.failures,
        consecutiveFailures: keyObj.consecutiveFailures,
        lastUsed: keyObj.lastUsed ? new Date(keyObj.lastUsed).toLocaleTimeString() : 'Never',
        rateLimited: keyObj.rateLimitUntil && keyObj.rateLimitUntil > now,
        rateLimitUntil: keyObj.rateLimitUntil ? new Date(keyObj.rateLimitUntil).toLocaleTimeString() : null,
        status: this.getKeyStatus(keyObj, now),
        lastError: keyObj.lastError
      }));
    }

    // Return all providers
    const allDetails = {};
    for (const [prov, keys] of this.keys) {
      allDetails[prov] = this.getKeyDetails(prov);
    }
    return allDetails;
  }

  /**
   * Reset rate limits (for testing)
   */
  resetRateLimits(provider = null) {
    if (provider) {
      const keys = this.keys.get(provider);
      if (keys) {
        keys.forEach(keyObj => {
          keyObj.rateLimitUntil = null;
          keyObj.consecutiveFailures = 0;
        });
      }
    } else {
      // Reset all
      for (const keys of this.keys.values()) {
        keys.forEach(keyObj => {
          keyObj.rateLimitUntil = null;
          keyObj.consecutiveFailures = 0;
        });
      }
    }

    console.log(`🔄 Reset rate limits${provider ? ` for ${provider}` : ' for all providers'}`);
  }

  /**
   * Save/load state (for persistence across restarts)
   */
  saveState(filePath = './keyManagerState.json') {
    const state = {
      keys: Object.fromEntries(this.keys),
      currentIndex: Object.fromEntries(this.currentIndex),
      stats: Object.fromEntries(this.stats),
      timestamp: new Date().toISOString()
    };

    try {
      fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
      console.log(`💾 Key manager state saved to ${filePath}`);
    } catch (error) {
      console.warn(`Could not save key manager state: ${error.message}`);
    }
  }

  loadState(filePath = './keyManagerState.json') {
    try {
      if (!fs.existsSync(filePath)) return false;

      const state = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      if (state.keys) this.keys = new Map(Object.entries(state.keys));
      if (state.currentIndex) this.currentIndex = new Map(Object.entries(state.currentIndex));
      if (state.stats) this.stats = new Map(Object.entries(state.stats));

      console.log(`📂 Key manager state loaded from ${filePath}`);
      return true;
    } catch (error) {
      console.warn(`Could not load key manager state: ${error.message}`);
      return false;
    }
  }
}

// ============================================================
// EXECUTE WITH KEY ROTATION - MAIN INTERFACE
// ============================================================

/**
 * Execute a function with automatic key rotation
 * This is the MAIN interface for API calls
 */
export async function executeWithKeyRotation(provider, apiFunction, options = {}) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    onRateLimit = null,
    onError = null
  } = options;

  const keyManager = getKeyManager();
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Get next available key
      const apiKey = keyManager.getNextKey(provider);

      // Execute the API function - PASS THE KEY STRING, NOT THE OBJECT
      console.log(`🔑 Using ${provider} key #${apiKey.index} (attempt ${attempt}/${maxRetries})`);
      const result = await apiFunction(apiKey.key);

      // Success! Mark key as successful
      keyManager.markKeySuccess(provider, apiKey.key);

      return result;

    } catch (error) {
      lastError = error;
      console.log(`❌ Attempt ${attempt}/${maxRetries} failed: ${error.message}`);

      // Check if it's a rate limit error
      const isRateLimit = error.response?.status === 429 ||
                         error.message?.toLowerCase().includes('rate limit') ||
                         error.message?.toLowerCase().includes('quota exceeded');

      if (isRateLimit) {
        // Extract retry-after header if available
        let retryAfter = 60; // Default 1 minute
        if (error.response?.headers?.['retry-after']) {
          retryAfter = parseInt(error.response.headers['retry-after']) || 60;
        }

        // Mark key as rate limited
        const currentKey = keyManager.getCurrentKeyForProvider(provider);
        if (currentKey) {
          keyManager.markKeyFailed(provider, currentKey, error.message, {
            rateLimitSeconds: retryAfter,
            isRateLimit: true
          });
        }

        // Call rate limit callback
        if (onRateLimit) {
          await onRateLimit(error, retryAfter);
        }

        // Don't retry immediately for rate limits
        if (attempt < maxRetries) {
          console.log(`⏳ Rate limited, waiting ${retryAfter}s before retry...`);
          await Promise.resolve(setTimeout(() => {}, retryAfter * 1000));
        }
      } else {
        // Regular error - mark as circuit breaker candidate
        const currentKey = keyManager.getCurrentKeyForProvider(provider);
        if (currentKey) {
          keyManager.markKeyFailed(provider, currentKey, error.message, {
            isCircuitBreaker: true
          });
        }

        // Call error callback
        if (onError) {
          await onError(error, attempt);
        }
      }

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        const delay = retryDelay * Math.pow(2, attempt - 1);
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await Promise.resolve(setTimeout(() => {}, delay));
      }
    }
  }

  // All attempts failed
  throw new Error(`${provider} API failed after ${maxRetries} attempts. Last error: ${lastError?.message}`);
}

// ============================================================
// SINGLETON INSTANCE
// ============================================================

let keyManagerInstance = null;

/**
 * Get the key manager instance (singleton)
 * Provider parameter is kept for backward compatibility but ignored
 */
export function getKeyManager(provider = null) {
  if (!keyManagerInstance) {
    keyManagerInstance = new KeyRotationManager();
    keyManagerInstance.loadKeys();
  }
  return keyManagerInstance;
}

export function initKeyManager() {
  return getKeyManager();
}

// ============================================================
// LEGACY COMPATIBILITY
// ============================================================

// For backward compatibility with existing code
export { KeyRotationManager as KeyManager };

// Add helper method to get current key for a provider (for error handling)
KeyRotationManager.prototype.getCurrentKeyForProvider = function(provider) {
  const keys = this.keys.get(provider);
  if (!keys) return null;

  const currentIdx = this.currentIndex.get(provider);
  return keys[currentIdx]?.key || null;
};

// ============================================================
// PRINT SERVICES SUMMARY
// ============================================================

/**
 * Print status of all configured services
 */
export function printServicesSummary() {
  console.log('\n📊 API KEY SERVICES STATUS');
  console.log('='.repeat(50));
  
  const services = [
    'OPENROUTER', 'GOOGLE', 'NVIDIA', 'FIREWORKS', 
    'TOGETHER', 'FAL', 'SEGMIND', 'DEEPINFRA', 
    'HUGGINGFACE', 'REPLICATE', 'ANTHROPIC', 'OPENAI',
    'GROQ', 'MISTRAL'
  ];
  
  const keyManager = getKeyManager();
  
  services.forEach(service => {
    const stats = keyManager.getStats(service);
    
    if (stats && stats.total > 0) {
      const status = stats.available > 0 ? '✅' : '❌';
      console.log(`  ${status} ${service.padEnd(15)} ${stats.total} key(s) (${stats.available} available)`);
    } else {
      console.log(`   ${service.padEnd(15)} Not configured`);
    }
  });
  
  console.log('='.repeat(50));
}

// ============================================================
// EXPORTS
// ============================================================

export default {
  KeyRotationManager,
  getKeyManager,
  initKeyManager,
  executeWithKeyRotation,
  printServicesSummary
};
