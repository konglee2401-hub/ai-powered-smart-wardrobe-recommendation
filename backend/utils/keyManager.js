import dotenv from 'dotenv';
dotenv.config();

// Key rotation manager
class KeyManager {
  constructor(provider) {
    this.provider = provider;
    this.keys = this.loadKeys();
    this.currentIndex = 0;
    this.failedKeys = new Set();
    this.keyUsage = new Map(); // Track usage per key
    this.rateLimitResetTime = new Map(); // Track when to retry failed keys
  }

  // Load all keys for a provider from env
  loadKeys() {
    const keys = [];
    const envPrefix = this.provider.toUpperCase().replace(/-/g, '_');
    
    // Special handling for Cloudinary (needs 3 values)
    if (this.provider === 'cloudinary') {
      for (let i = 1; i <= 10; i++) {
        const cloudName = process.env[`${envPrefix}_CLOUD_NAME_${i}`];
        const apiKey = process.env[`${envPrefix}_API_KEY_${i}`];
        const apiSecret = process.env[`${envPrefix}_API_SECRET_${i}`];
        
        if (cloudName && apiKey && apiSecret) {
          keys.push({
            key: `${cloudName}|${apiKey}|${apiSecret}`, // Combined format
            name: `${envPrefix}_${i}`,
            index: i,
            failures: 0,
            lastUsed: null,
            totalRequests: 0
          });
        }
      }
      
      return keys;
    }
    
    // Special handling for Imgur (uses CLIENT_ID)
    if (this.provider === 'imgur') {
      for (let i = 1; i <= 10; i++) {
        const clientId = process.env[`IMGUR_CLIENT_ID_${i}`];
        
        if (clientId) {
          keys.push({
            key: clientId,
            name: `IMGUR_CLIENT_ID_${i}`,
            index: i,
            failures: 0,
            lastUsed: null,
            totalRequests: 0
          });
        }
      }
      
      // Fallback to single CLIENT_ID
      if (keys.length === 0) {
        const singleClientId = process.env['IMGUR_CLIENT_ID'];
        if (singleClientId) {
          keys.push({
            key: singleClientId,
            name: 'IMGUR_CLIENT_ID',
            index: 1,
            failures: 0,
            lastUsed: null,
            totalRequests: 0
          });
        }
      }
      
      return keys;
    }
    
    // Standard handling for other providers
    for (let i = 1; i <= 10; i++) {
      const keyName = `${envPrefix}_API_KEY_${i}`;
      const key = process.env[keyName];
      
      if (key) {
        keys.push({
          key,
          name: keyName,
          index: i,
          failures: 0,
          lastUsed: null,
          totalRequests: 0
        });
      }
    }

    // Fallback to single key without number
    if (keys.length === 0) {
      const singleKey = process.env[`${envPrefix}_API_KEY`];
      if (singleKey) {
        keys.push({
          key: singleKey,
          name: `${envPrefix}_API_KEY`,
          index: 1,
          failures: 0,
          lastUsed: null,
          totalRequests: 0
        });
      }
    }

    return keys;
  }

  // Get next available key
  getNextKey() {
    if (this.keys.length === 0) {
      throw new Error(`No API keys configured for ${this.provider}`);
    }

    // Clean up expired rate limits (after 1 minute)
    const now = Date.now();
    for (const [keyName, resetTime] of this.rateLimitResetTime.entries()) {
      if (now > resetTime) {
        this.failedKeys.delete(keyName);
        this.rateLimitResetTime.delete(keyName);
        console.log(`   🔄 Key ${keyName} rate limit reset`);
      }
    }

    // Find next available key
    const availableKeys = this.keys.filter(k => !this.failedKeys.has(k.name));
    
    if (availableKeys.length === 0) {
      throw new Error(`All ${this.provider} API keys are rate limited. Please wait.`);
    }

    // Round-robin selection
    const key = availableKeys[this.currentIndex % availableKeys.length];
    this.currentIndex++;

    // Update usage stats
    key.lastUsed = new Date();
    key.totalRequests++;

    return key;
  }

  // Get current key (for retry logic)
  getCurrentKey() {
    if (this.keys.length === 0) {
      throw new Error(`No API keys configured for ${this.provider}`);
    }

    const availableKeys = this.keys.filter(k => !this.failedKeys.has(k.name));
    if (availableKeys.length === 0) {
      throw new Error(`All ${this.provider} API keys are rate limited`);
    }

    return availableKeys[0];
  }

  // Mark key as failed (rate limited)
  markKeyFailed(keyName, error) {
    this.failedKeys.add(keyName);
    
    // Set reset time (1 minute from now)
    this.rateLimitResetTime.set(keyName, Date.now() + 60000);

    // Update failure count
    const key = this.keys.find(k => k.name === keyName);
    if (key) {
      key.failures++;
    }

    console.log(`   ⚠️  Key ${keyName} marked as rate limited (will retry in 60s)`);
    console.log(`   📊 Available keys: ${this.keys.length - this.failedKeys.size}/${this.keys.length}`);
  }

  // Get stats
  getStats() {
    return {
      provider: this.provider,
      totalKeys: this.keys.length,
      availableKeys: this.keys.length - this.failedKeys.size,
      failedKeys: this.failedKeys.size,
      keys: this.keys.map(k => ({
        name: k.name,
        totalRequests: k.totalRequests,
        failures: k.failures,
        lastUsed: k.lastUsed,
        isAvailable: !this.failedKeys.has(k.name)
      }))
    };
  }

  // Check if any keys are available
  hasAvailableKeys() {
    return this.keys.length > 0 && this.keys.length > this.failedKeys.size;
  }

  // Get current key name
  getCurrentKeyName() {
    if (this.keys.length === 0) {
      return 'No keys configured';
    }
    // Return the name of the key that will be used next (currentIndex % availableKeys)
    const availableKeys = this.keys.filter(k => !this.failedKeys.has(k.name));
    if (availableKeys.length === 0) {
      return 'All keys rate limited';
    }
    const currentKeyIndex = (this.currentIndex - 1) % availableKeys.length;
    return availableKeys[Math.max(0, currentKeyIndex)]?.name || this.keys[0].name;
  }

  // Get current key request count
  getCurrentKeyRequestCount() {
    if (this.keys.length === 0) {
      return 0;
    }
    const availableKeys = this.keys.filter(k => !this.failedKeys.has(k.name));
    if (availableKeys.length === 0) {
      return 0;
    }
    const currentKeyIndex = (this.currentIndex - 1) % availableKeys.length;
    return availableKeys[Math.max(0, currentKeyIndex)]?.totalRequests || 0;
  }
}

// Global key managers for each provider
const keyManagers = new Map();

// Get or create key manager for provider
export function getKeyManager(provider) {
  if (!keyManagers.has(provider)) {
    keyManagers.set(provider, new KeyManager(provider));
  }
  return keyManagers.get(provider);
}

// Print services summary
export function printServicesSummary() {
  console.log('\n📊 API KEY SERVICES STATUS');
  console.log('='.repeat(50));
  
  const services = [
    'openrouter', 'google', 'nvidia', 'fireworks', 
    'together', 'fal', 'segmind', 'deepinfra', 
    'huggingface', 'replicate'
  ];
  
  services.forEach(service => {
    try {
      const keyManager = getKeyManager(service);
      const stats = keyManager.getStats();
      
      if (stats.totalKeys > 0) {
        const status = stats.availableKeys > 0 ? '✅' : '❌';
        console.log(`  ${status} ${service.toUpperCase().padEnd(15)} ${stats.totalKeys} key(s) (${stats.availableKeys} available)`);
      } else {
        console.log(`   ${service.toUpperCase().padEnd(15)} Not configured`);
      }
    } catch (e) {
      console.log(`   ${service.toUpperCase().padEnd(15)} Not configured`);
    }
  });
  
  console.log('='.repeat(50));
}

// Helper function to execute with key rotation
export async function executeWithKeyRotation(provider, apiCall) {
  const manager = getKeyManager(provider);
  
  let lastError = null;
  const maxRetries = manager.keys.length; // Try all available keys

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const keyInfo = manager.getNextKey();
      console.log(`   🔑 Using key: ${keyInfo.name} (Request #${keyInfo.totalRequests})`);

      // Execute API call with current key
      const result = await apiCall(keyInfo.key);
      return result;

    } catch (error) {
      lastError = error;

      // Check if it's a rate limit error
      const isRateLimit = 
        error.message.includes('429') ||
        error.message.includes('rate limit') ||
        error.message.includes('quota') ||
        error.message.includes('too many requests');

      if (isRateLimit) {
        const currentKey = manager.keys[manager.currentIndex - 1];
        if (currentKey) {
          manager.markKeyFailed(currentKey.name, error);
        }

        // If we have more keys, continue to next one
        if (manager.hasAvailableKeys()) {
          console.log(`   ⏭️  Switching to next key...`);
          continue;
        }
      }

      // If not rate limit or no more keys, throw error
      throw error;
    }
  }

  throw lastError || new Error(`All ${provider} keys exhausted`);
}

export default KeyManager;
