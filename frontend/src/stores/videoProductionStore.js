/**
 * Video Production Store
 * Zustand store for managing video production state
 */

import { create } from 'zustand';
import { videoProductionApi } from '../services/videoProductionApi';

const useVideoProductionStore = create((set, get) => ({
  // ============ STATE ============
  queue: { items: [], stats: null, loading: false, error: null },
  accounts: { items: [], stats: null, loading: false, error: null },
  media: { stats: null, loading: false, error: null },
  uploads: { items: [], stats: null, loading: false, error: null },
  jobs: { items: [], stats: null, running: [], loading: false, error: null },
  systemStatus: null,
  
  // ============ QUEUE ACTIONS ============
  addToQueue: async (videoConfig, platform = 'all', contentType = 'product_promo', priority = 'normal') => {
    set(state => ({ queue: { ...state.queue, loading: true } }));
    try {
      const result = await videoProductionApi.queue.add(videoConfig, platform, contentType, priority);
      set(state => ({
        queue: { ...state.queue, items: [...state.queue.items, result.queueItem], loading: false }
      }));
      return result;
    } catch (error) {
      set(state => ({ queue: { ...state.queue, error: error.message, loading: false } }));
      throw error;
    }
  },

  batchAddToQueue: async (videos, platform = 'all', contentType = 'product_promo') => {
    set(state => ({ queue: { ...state.queue, loading: true } }));
    try {
      const result = await videoProductionApi.queue.batchAdd(videos, platform, contentType);
      set(state => ({
        queue: { ...state.queue, items: [...state.queue.items, ...result.queueIds], loading: false }
      }));
      return result;
    } catch (error) {
      set(state => ({ queue: { ...state.queue, error: error.message, loading: false } }));
      throw error;
    }
  },

  getQueueStats: async () => {
    set(state => ({ queue: { ...state.queue, loading: true } }));
    try {
      const result = await videoProductionApi.queue.getStats();
      set(state => ({ queue: { ...state.queue, stats: result.stats, loading: false } }));
      return result;
    } catch (error) {
      set(state => ({ queue: { ...state.queue, error: error.message, loading: false } }));
      throw error;
    }
  },

  getNextPendingVideo: async (platform) => {
    try {
      return await videoProductionApi.queue.getNextPending(platform);
    } catch (error) {
      throw error;
    }
  },

  // ============ ACCOUNT ACTIONS ============
  addAccount: async (platform, username, password, displayName, email, metadata) => {
    set(state => ({ accounts: { ...state.accounts, loading: true } }));
    try {
      const result = await videoProductionApi.accounts.add(platform, username, password, displayName, email, metadata);
      set(state => ({
        accounts: { ...state.accounts, items: [...state.accounts.items, result.account], loading: false }
      }));
      return result;
    } catch (error) {
      set(state => ({ accounts: { ...state.accounts, error: error.message, loading: false } }));
      throw error;
    }
  },

  getAllAccounts: async () => {
    set(state => ({ accounts: { ...state.accounts, loading: true } }));
    try {
      const result = await videoProductionApi.accounts.getAll();
      set(state => ({
        accounts: { ...state.accounts, items: result.accounts, loading: false }
      }));
      return result;
    } catch (error) {
      set(state => ({ accounts: { ...state.accounts, error: error.message, loading: false } }));
      throw error;
    }
  },

  getAccountStats: async () => {
    try {
      const result = await videoProductionApi.accounts.getStats();
      set(state => ({ accounts: { ...state.accounts, stats: result.stats } }));
      return result;
    } catch (error) {
      throw error;
    }
  },

  getAccountsByPlatform: async (platform) => {
    try {
      return await videoProductionApi.accounts.getByPlatform(platform);
    } catch (error) {
      throw error;
    }
  },

  getBestAccount: async (platform) => {
    try {
      return await videoProductionApi.accounts.getBest(platform);
    } catch (error) {
      throw error;
    }
  },

  // ============ MEDIA ACTIONS ============
  getMediaStats: async () => {
    set(state => ({ media: { ...state.media, loading: true } }));
    try {
      const result = await videoProductionApi.media.getStats();
      set(state => ({ media: { ...state.media, stats: result.stats, loading: false } }));
      return result;
    } catch (error) {
      set(state => ({ media: { ...state.media, error: error.message, loading: false } }));
      throw error;
    }
  },

  // ============ UPLOAD ACTIONS ============
  registerUpload: async (queueId, videoPath, platform, accountId, uploadConfig) => {
    try {
      return await videoProductionApi.uploads.register(queueId, videoPath, platform, accountId, uploadConfig);
    } catch (error) {
      throw error;
    }
  },

  getUploadStats: async (platform) => {
    try {
      const result = await videoProductionApi.uploads.getStats(platform);
      set(state => ({ uploads: { ...state.uploads, stats: result.stats } }));
      return result;
    } catch (error) {
      throw error;
    }
  },

  // ============ JOB ACTIONS ============
  getAllJobs: async (jobType, platform, enabled) => {
    set(state => ({ jobs: { ...state.jobs, loading: true } }));
    try {
      const result = await videoProductionApi.jobs.getAll(jobType, platform, enabled);
      set(state => ({ jobs: { ...state.jobs, items: result.jobs, loading: false } }));
      return result;
    } catch (error) {
      set(state => ({ jobs: { ...state.jobs, error: error.message, loading: false } }));
      throw error;
    }
  },

  createJob: async (name, schedule, jobType, platform, enabled, metadata) => {
    try {
      return await videoProductionApi.jobs.create(name, schedule, jobType, platform, enabled, metadata);
    } catch (error) {
      throw error;
    }
  },

  getJobStats: async () => {
    try {
      const result = await videoProductionApi.jobs.getStats();
      set(state => ({ jobs: { ...state.jobs, stats: result.stats } }));
      return result;
    } catch (error) {
      throw error;
    }
  },

  getRunningJobs: async () => {
    try {
      const result = await videoProductionApi.workflow.getRunningJobs();
      set(state => ({ jobs: { ...state.jobs, running: result.running } }));
      return result;
    } catch (error) {
      throw error;
    }
  },

  // ============ WORKFLOW ACTIONS ============
  generateVideo: async (contentType = 'product_promo', platform = 'all', accounts = null) => {
    try {
      return await videoProductionApi.workflow.generate(contentType, platform, accounts);
    } catch (error) {
      throw error;
    }
  },

  initializeAutomation: async (config) => {
    try {
      return await videoProductionApi.workflow.initializeAutomation(config);
    } catch (error) {
      throw error;
    }
  },

  getSystemStatus: async () => {
    try {
      const result = await videoProductionApi.workflow.getSystemStatus();
      set(state => ({ systemStatus: result }));
      return result;
    } catch (error) {
      throw error;
    }
  }
}));

export default useVideoProductionStore;
