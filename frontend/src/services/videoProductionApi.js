/**
 * Video Production API Service
 * Unified API client for all video production operations
 */

import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api/video-production';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
});

// Response interceptor for error handling
api.interceptors.response.use(
  response => response.data,
  error => Promise.reject({
    message: error.response?.data?.error || error.message,
    status: error.response?.status,
    data: error.response?.data
  })
);

export const videoProductionApi = {
  // ============ QUEUE OPERATIONS ============
  queue: {
    add: (videoConfig, platform = 'all', contentType = 'product_promo', priority = 'normal') =>
      api.post('/queue/add', { videoConfig, platform, contentType, priority }),
    
    batchAdd: (videos, platform = 'all', contentType = 'product_promo') =>
      api.post('/queue/batch-add', { videos, platform, contentType }),
    
    getStats: () => api.get('/queue/stats'),
    
    getNextPending: (platform) =>
      api.get('/queue/next-pending', { params: { platform } }),
    
    getItem: (queueId) => api.get(`/queue/${queueId}`),
    
    getLogs: (queueId) => api.get(`/queue/${queueId}/logs`),
    
    clear: (status) => api.delete('/queue', { params: { statusFilter: status } })
  },

  // ============ ACCOUNT OPERATIONS ============
  accounts: {
    add: (platform, username, password, displayName, email, metadata) =>
      api.post('/accounts', { platform, username, password, displayName, email, metadata }),
    
    getAll: () => api.get('/accounts'),
    
    getStats: () => api.get('/accounts/stats'),
    
    getActive: (platform) =>
      api.get('/accounts/active', { params: { platform } }),
    
    getByPlatform: (platform) =>
      api.get(`/accounts/platform/${platform}`),
    
    getBest: (platform) =>
      api.get(`/accounts/best/${platform}`),
    
    getRotation: (platform, count = 5) =>
      api.get(`/accounts/rotation/${platform}`, { params: { count } }),
    
    canUpload: (accountId) =>
      api.get(`/accounts/${accountId}/can-upload`),
    
    update: (accountId, data) =>
      api.patch(`/accounts/${accountId}`, data),
    
    deactivate: (accountId, reason) =>
      api.post(`/accounts/${accountId}/deactivate`, { reason }),
    
    delete: (accountId) =>
      api.delete(`/accounts/${accountId}`)
  },

  // ============ MEDIA LIBRARY OPERATIONS ============
  media: {
    addTemplate: (name, description, duration, platform, tags, metadata) =>
      api.post('/media/templates', { name, description, duration, platform, tags, metadata }),
    
    addHotVideo: (title, source, platform, tags, metadata) =>
      api.post('/media/hot-videos', { title, source, platform, tags, metadata }),
    
    addAudio: (name, category, mood, tags, metadata) =>
      api.post('/media/audio', { name, category, mood, tags, metadata }),
    
    getStats: () => api.get('/media/stats'),
    
    getRandomTemplate: (platform) =>
      api.get('/media/random/template', { params: { platform } }),
    
    getRandomHotVideo: (platform) =>
      api.get('/media/random/hot-video', { params: { platform } }),
    
    getRandomAudio: (mood) =>
      api.get('/media/random/audio', { params: { mood } })
  },

  // ============ UPLOAD OPERATIONS ============
  uploads: {
    register: (queueId, videoPath, platform, accountId, uploadConfig) =>
      api.post('/uploads/register', { queueId, videoPath, platform, accountId, uploadConfig }),
    
    getStats: (platform) =>
      api.get('/uploads/stats', { params: { platform } }),
    
    getStatus: (uploadId) =>
      api.get(`/uploads/${uploadId}`),
    
    getByStatus: (status) =>
      api.get(`/uploads/status/${status}`),
    
    getForQueue: (queueId) =>
      api.get(`/uploads/queue/${queueId}`),
    
    getForAccount: (accountId) =>
      api.get(`/uploads/account/${accountId}`),
    
    getNextPending: (platform) =>
      api.get('/uploads/next-pending', { params: { platform } }),
    
    retryFailed: (maxRetries = 3) =>
      api.post('/uploads/retry-failed', { maxRetries }),
    
    getPlatformStatus: (platform) =>
      api.get(`/uploads/platform/${platform}/status`)
  },

  // ============ JOB OPERATIONS ============
  jobs: {
    create: (name, schedule, jobType, platform = 'all', enabled = true, metadata = {}) =>
      api.post('/jobs', { name, schedule, jobType, platform, enabled, metadata }),
    
    getAll: (jobType, platform, enabled) =>
      api.get('/jobs', { params: { jobType, platform, enabled } }),
    
    getStats: () => api.get('/jobs/stats'),
    
    get: (jobId) => api.get(`/jobs/${jobId}`),
    
    update: (jobId, data) =>
      api.patch(`/jobs/${jobId}`, data),
    
    enable: (jobId) =>
      api.post(`/jobs/${jobId}/enable`),
    
    disable: (jobId) =>
      api.post(`/jobs/${jobId}/disable`),
    
    getHistory: (jobId, limit = 50) =>
      api.get(`/jobs/${jobId}/history`, { params: { limit } }),
    
    delete: (jobId) =>
      api.delete(`/jobs/${jobId}`)
  },

  // ============ WORKFLOW OPERATIONS ============
  workflow: {
    generate: (contentType = 'product_promo', platform = 'all', accounts = null) =>
      api.post('/workflow/generate', { contentType, platform, accounts }),
    
    processNext: () =>
      api.post('/workflow/process-next'),
    
    uploadNext: () =>
      api.post('/workflow/upload-next'),
    
    initializeAutomation: (config) =>
      api.post('/workflow/initialize-automation', config),
    
    getSystemStatus: () =>
      api.get('/system/status'),
    
    getRunningJobs: () =>
      api.get('/workflow/running-jobs'),
    
    stopAllJobs: () =>
      api.post('/workflow/stop-all-jobs')
  }
};

export default videoProductionApi;
