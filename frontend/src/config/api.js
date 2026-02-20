import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const API_CONFIG = {
  TIMEOUT: 600000, // 600 seconds = 10 minutes (for long-running browser automation)
  RETRY: {
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000, // 1 second
  },
};

export const API_ENDPOINTS = {
  PROMPTS: '/prompts',
  ENHANCE_PROMPT: '/prompts/enhance', // NEW
  PROMPT_TEMPLATES: '/prompt-templates',
  PROVIDER_STATUS: '/ai/providers', // Get vision/analysis providers from AI controller
  UNIFIED_ANALYZE: '/flows/analyze', // NEW: Unified flow analysis endpoint
  UNIFIED_GENERATE: '/flows/generate', // NEW: Unified flow generation endpoint
  
  // Browser Automation Endpoints
  BROWSER_ANALYZE: '/browser-automation/analyze',
  BROWSER_GENERATE_IMAGE: '/browser-automation/generate-image-browser',
  BROWSER_GENERATE_IMAGE_FULL: '/browser-automation/generate-image',
  BROWSER_GENERATE_VIDEO: '/browser-automation/generate-video',
};

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export default apiClient;
