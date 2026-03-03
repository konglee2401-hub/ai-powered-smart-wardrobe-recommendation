import apiClient from '../config/api';

const BASE = '/shorts-reels';

export const trendAutomationApi = {
  getOverview: () => apiClient.get(`${BASE}/stats/overview`).then((r) => r.data),
  getChannels: (params = {}) => apiClient.get(`${BASE}/channels`, { params }).then((r) => r.data),
  manualScanChannel: (id) => apiClient.post(`${BASE}/channels/${id}/manual-scan`).then((r) => r.data),
  getVideos: (params = {}) => apiClient.get(`${BASE}/videos`, { params }).then((r) => r.data),
  redownloadVideo: (id) => apiClient.post(`${BASE}/videos/${id}/re-download`).then((r) => r.data),
  triggerPendingDownloads: (limit = 200) => apiClient.post(`${BASE}/videos/trigger-pending-downloads`, null, { params: { limit } }).then((r) => r.data),
  getLogs: (params = {}) => apiClient.get(`${BASE}/logs`, { params }).then((r) => r.data),
  getSettings: () => apiClient.get(`${BASE}/settings`).then((r) => r.data),
  updateSettings: (payload) => apiClient.post(`${BASE}/settings`, payload).then((r) => r.data),
  manualDiscoverPlayboard: (config) => apiClient.post(`${BASE}/playboard/manual-discover`, config).then((r) => r.data),
  triggerJob: (type, filters = {}) => {

    const params = new URLSearchParams({ type });

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, value);
      }
    });

    return apiClient.post(`${BASE}/jobs/trigger?${params.toString()}`).then((r) => r.data);
  },
  
  // Upload to Google Drive APIs
  getUploadStatus: () => apiClient.get(`${BASE}/videos/upload-status`).then((r) => r.data),
  triggerUploadAll: () => apiClient.post(`${BASE}/videos/upload-to-drive`).then((r) => r.data),
  triggerUploadSingle: (videoId) => apiClient.post(`${BASE}/videos/${videoId}/upload-to-drive`).then((r) => r.data),
};

export default trendAutomationApi;
