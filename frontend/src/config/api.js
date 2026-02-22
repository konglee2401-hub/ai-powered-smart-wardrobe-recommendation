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
  // Prompts
  PROMPTS: '/prompts',
  ENHANCE_PROMPT: '/prompts/enhance',
  PROMPT_TEMPLATES: '/prompt-templates',
  
  // AI & Providers
  PROVIDER_STATUS: '/ai/providers',
  
  // Flows & Generation
  UNIFIED_ANALYZE: '/flows/analyze',
  UNIFIED_GENERATE: '/flows/generate',
  
  // History
  HISTORY: '/history/images',
  HISTORY_IMAGES: '/history/images',
  HISTORY_VIDEOS: '/history/videos',
  HISTORY_BY_ID: (id) => `/history/images/${id}`,
  HISTORY_DELETE: (id) => `/history/images/${id}`,
  HISTORY_REGENERATE: (id) => `/history/images/${id}/regenerate`,
  
  // Browser Automation
  BROWSER_ANALYZE: '/browser-automation/analyze',
  BROWSER_GENERATE_IMAGE: '/browser-automation/generate-image-browser',
  BROWSER_GENERATE_IMAGE_FULL: '/browser-automation/generate-image',
  BROWSER_GENERATE_VIDEO: '/browser-automation/generate-video',
  
  // Cloud Gallery
  CLOUD_GALLERY_INIT: '/cloud-gallery/init',
  CLOUD_GALLERY_LIBRARY: '/cloud-gallery/library',
  CLOUD_GALLERY_BY_TYPE: (type) => `/cloud-gallery/type/${type}`,
  CLOUD_GALLERY_UPLOAD: '/cloud-gallery/upload',
  CLOUD_GALLERY_DOWNLOAD: (fileId) => `/cloud-gallery/download/${fileId}`,
  CLOUD_GALLERY_PREVIEW: (fileId) => `/cloud-gallery/preview/${fileId}`,
  CLOUD_GALLERY_SEARCH: '/cloud-gallery/search',
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
