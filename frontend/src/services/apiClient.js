/**
 * Smart Fashion Prompt Builder - API Client
 * Phase 2: Revised with all fixes
 * 
 * Features:
 * 1. Centralized API Communication
 * 2. Request/Response Interceptors
 * 3. Error Handling
 * 4. Request Caching
 * 5. Retry Logic
 */

// ============ CONFIGURATION ============

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const REQUEST_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// ============ CACHE ============

class RequestCache {
  constructor() {
    this.cache = new Map();
    this.timestamps = new Map();
    this.ttl = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get cached value
   */
  get(key) {
    const timestamp = this.timestamps.get(key);
    if (!timestamp) return null;

    const isExpired = Date.now() - timestamp > this.ttl;
    if (isExpired) {
      this.cache.delete(key);
      this.timestamps.delete(key);
      return null;
    }

    return this.cache.get(key);
  }

  /**
   * Set cache value
   */
  set(key, value) {
    this.cache.set(key, value);
    this.timestamps.set(key, Date.now());
  }

  /**
   * Clear cache
   */
  clear() {
    this.cache.clear();
    this.timestamps.clear();
  }

  /**
   * Clear specific key
   */
  delete(key) {
    this.cache.delete(key);
    this.timestamps.delete(key);
  }
}

const cache = new RequestCache();

// ============ REQUEST BUILDER ============

/**
 * Build request options
 */
const buildRequestOptions = (method, data = null) => {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    timeout: REQUEST_TIMEOUT
  };

  if (data && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(data);
  }

  return options;
};

// ============ RETRY LOGIC ============

/**
 * Retry failed requests with exponential backoff
 */
const retryRequest = async (url, options, retries = 0) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    if (retries < MAX_RETRIES && (error.name === 'AbortError' || !navigator.onLine)) {
      const delay = RETRY_DELAY * Math.pow(2, retries);
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryRequest(url, options, retries + 1);
    }

    throw error;
  }
};

// ============ ERROR HANDLER ============

/**
 * Handle API errors
 */
const handleError = (error, endpoint) => {
  console.error(`API Error [${endpoint}]:`, error);

  if (error.name === 'AbortError') {
    return {
      success: false,
      error: 'Request timeout - please try again',
      code: 'TIMEOUT'
    };
  }

  if (!navigator.onLine) {
    return {
      success: false,
      error: 'No internet connection',
      code: 'OFFLINE'
    };
  }

  return {
    success: false,
    error: error.message || 'An error occurred',
    code: 'ERROR'
  };
};

// ============ API METHODS ============

/**
 * Generate Prompt
 * POST /generate-prompt
 */
export const generatePrompt = async (inputs) => {
  try {
    const endpoint = '/generate-prompt';
    const url = `${API_BASE_URL}${endpoint}`;
    const options = buildRequestOptions('POST', inputs);

    const response = await retryRequest(url, options);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to generate prompt');
    }

    return data;
  } catch (error) {
    return handleError(error, 'generatePrompt');
  }
};

/**
 * Enhance Prompt
 * POST /enhance-prompt
 */
export const enhancePrompt = async (prompt, customizations = {}, enhancements = []) => {
  try {
    const endpoint = '/enhance-prompt';
    const url = `${API_BASE_URL}${endpoint}`;
    const payload = {
      prompt,
      customizations,
      enhancements
    };
    const options = buildRequestOptions('POST', payload);

    const response = await retryRequest(url, options);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to enhance prompt');
    }

    return data;
  } catch (error) {
    return handleError(error, 'enhancePrompt');
  }
};

/**
 * Get All Use Cases
 * GET /use-cases
 */
export const getAllUseCases = async () => {
  try {
    const endpoint = '/use-cases';
    const cacheKey = `use-cases-all`;

    // Check cache
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    const url = `${API_BASE_URL}${endpoint}`;
    const options = buildRequestOptions('GET');

    const response = await retryRequest(url, options);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch use cases');
    }

    // Cache the result
    cache.set(cacheKey, data);

    return data;
  } catch (error) {
    return handleError(error, 'getAllUseCases');
  }
};

/**
 * Get Use Case Template
 * GET /use-cases/:useCase
 */
export const getUseCaseTemplate = async (useCase) => {
  try {
    const endpoint = `/use-cases/${useCase}`;
    const cacheKey = `use-case-${useCase}`;

    // Check cache
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    const url = `${API_BASE_URL}${endpoint}`;
    const options = buildRequestOptions('GET');

    const response = await retryRequest(url, options);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch use case template');
    }

    // Cache the result
    cache.set(cacheKey, data);

    return data;
  } catch (error) {
    return handleError(error, 'getUseCaseTemplate');
  }
};

/**
 * Validate Inputs
 * POST /validate-inputs
 */
export const validateInputs = async (inputs) => {
  try {
    const endpoint = '/validate-inputs';
    const url = `${API_BASE_URL}${endpoint}`;
    const options = buildRequestOptions('POST', inputs);

    const response = await retryRequest(url, options);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to validate inputs');
    }

    return data;
  } catch (error) {
    return handleError(error, 'validateInputs');
  }
};

/**
 * Get Prompt Statistics
 * POST /prompt-stats
 */
export const getPromptStats = async (prompt) => {
  try {
    const endpoint = '/prompt-stats';
    const url = `${API_BASE_URL}${endpoint}`;
    const payload = { prompt };
    const options = buildRequestOptions('POST', payload);

    const response = await retryRequest(url, options);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to get prompt statistics');
    }

    return data;
  } catch (error) {
    return handleError(error, 'getPromptStats');
  }
};

/**
 * Check API Health
 * GET /health
 */
export const checkApiHealth = async () => {
  try {
    const url = `${API_BASE_URL.replace('/api', '')}/health`;
    const options = buildRequestOptions('GET');

    const response = await retryRequest(url, options);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    return handleError(error, 'checkApiHealth');
  }
};

// ============ CACHE MANAGEMENT ============

/**
 * Clear all cache
 */
export const clearCache = () => {
  cache.clear();
};

/**
 * Clear specific cache key
 */
export const clearCacheKey = (key) => {
  cache.delete(key);
};

/**
 * Get cache statistics
 */
export const getCacheStats = () => {
  return {
    size: cache.cache.size,
    keys: Array.from(cache.cache.keys())
  };
};

// ============ BATCH REQUESTS ============

/**
 * Execute multiple requests in parallel
 */
export const batchRequests = async (requests) => {
  try {
    const results = await Promise.all(requests);
    return {
      success: true,
      results,
      count: results.length
    };
  } catch (error) {
    return handleError(error, 'batchRequests');
  }
};

/**
 * Execute multiple requests sequentially
 */
export const sequentialRequests = async (requests) => {
  try {
    const results = [];
    for (const request of requests) {
      const result = await request();
      results.push(result);
    }
    return {
      success: true,
      results,
      count: results.length
    };
  } catch (error) {
    return handleError(error, 'sequentialRequests');
  }
};

// ============ EXPORT DEFAULT ============

export default {
  generatePrompt,
  enhancePrompt,
  getAllUseCases,
  getUseCaseTemplate,
  validateInputs,
  getPromptStats,
  checkApiHealth,
  clearCache,
  clearCacheKey,
  getCacheStats,
  batchRequests,
  sequentialRequests
};
