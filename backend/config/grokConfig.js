/**
 * Grok Service Configuration
 * 
 * Configure default project URL and other Grok service settings
 * Update this file to change where image generation happens
 */

export const grokConfig = {
  // Default project URL for image generation
  // This is where generated images will be sent/saved
  projectUrl: 'https://grok.com/project/7fce8c87-7f2f-4325-9e7e-80ba2705d30f',
  
  // Full conversation URL (optional) - used if you want to navigate to a specific conversation
  // Format: {projectUrl}?chat={chatId}&rid={rid}
  // Set this to use a specific conversation instead of creating new ones
  conversationUrl: 'https://grok.com/project/7fce8c87-7f2f-4325-9e7e-80ba2705d30f?chat=4856a513-cf90-4b09-a874-5a75bbd3c8db&rid=e58cda7d-0a5c-47f8-9e5b-88cf85b9fb0d',
  
  // Fallback to homepage if project URL is not available
  fallbackUrl: 'https://grok.com',
  
  // Session settings
  session: {
    // Path to session file
    dir: 'backend/.sessions',
    filename: 'grok-session-complete.json',
    
    // Auto-refresh session before expiry (in hours)
    refreshThreshold: 120,  // 5 days before expiry
    
    // Max session age before forcing refresh (in days)
    maxAge: 20
  },
  
  // Browser options
  browser: {
    headless: 'new',  // 'new' = new headless, true = old headless, false = visible
    
    // Timeout for page loads (ms)
    navigationTimeout: 30000,
    
    // Timeouts for waiting for elements
    elementWaitTimeout: 10000,
    
    // Additional launch args for stealth
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      '--disable-default-apps',
      '--disable-extensions',
      '--no-first-run'
    ]
  },
  
  // Cloudflare bypass settings
  cloudflare: {
    // Max attempts to bypass Cloudflare
    maxAttempts: 5,
    
    // Wait time between retries (ms)
    retryDelay: 3000,
    
    // Timeout for Cloudflare challenge (ms)
    challengeTimeout: 30000
  },
  
  // Image generation settings
  generation: {
    // Default model to use
    model: 'grok-420',
    
    // Timeout for generation (ms)
    timeout: 120000,  // 2 minutes
    
    // Number of retries if generation fails
    retries: 2
  },
  
  // Logging
  logging: {
    // Log level: 'error', 'warn', 'info', 'debug'
    level: 'info',
    
    // Save logs to file
    saveToFile: false,
    logDir: 'backend/logs'
  }
};

/**
 * Get project URL (with fallback support)
 */
export function getProjectUrl() {
  try {
    const url = grokConfig.projectUrl;
    if (!url) {
      console.warn('projectUrl not configured, using fallback');
      return grokConfig.fallbackUrl;
    }
    return url;
  } catch (error) {
    console.error('Error getting project URL:', error);
    return grokConfig.fallbackUrl;
  }
}

/**
 * Set custom project URL
 */
export function setProjectUrl(url) {
  if (!url.includes('grok.com')) {
    throw new Error('Invalid Grok URL. Must be a grok.com project URL.');
  }
  grokConfig.projectUrl = url;
  return url;
}

/**
 * Get full session file path
 */
export function getSessionPath() {
  return `${grokConfig.session.dir}/${grokConfig.session.filename}`;
}

export default grokConfig;
