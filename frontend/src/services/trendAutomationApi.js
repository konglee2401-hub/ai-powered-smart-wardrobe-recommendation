import apiClient from '../config/api';

const BASE = '/shorts-reels';

export const trendAutomationApi = {
  getOverview: () => apiClient.get(`${BASE}/stats/overview`).then((r) => r.data),
  getChannels: (params = {}) => apiClient.get(`${BASE}/channels`, { params }).then((r) => r.data),
  manualScanChannel: (id) => apiClient.post(`${BASE}/channels/${id}/manual-scan`).then((r) => r.data),
  getVideos: (params = {}) => apiClient.get(`${BASE}/videos`, { params }).then((r) => r.data),
  redownloadVideo: (id) => apiClient.post(`${BASE}/videos/${id}/re-download`).then((r) => r.data),
  getLogs: (params = {}) => apiClient.get(`${BASE}/logs`, { params }).then((r) => r.data),
  getSettings: () => apiClient.get(`${BASE}/settings`).then((r) => r.data),
  updateSettings: (payload) => apiClient.post(`${BASE}/settings`, payload).then((r) => r.data),
  triggerJob: (type) => apiClient.post(`${BASE}/jobs/trigger?type=${type}`).then((r) => r.data),

  // Drive proxy methods
  driveAuth: () => apiClient.get(`${BASE}/drive/auth`).then((r) => r.data),
  driveInitFolders: () => apiClient.post(`${BASE}/drive/init-folders`).then((r) => r.data),
  driveFolderMap: () => apiClient.get(`${BASE}/drive/folders/map`).then((r) => r.data),
  driveFolders: (params = {}) => apiClient.get(`${BASE}/drive/folders`, { params }).then((r) => r.data),
  driveFolderFiles: (id, params = {}) => apiClient.get(`${BASE}/drive/folders/${id}/files`, { params }).then((r) => r.data),
  driveBrowse: (id) => apiClient.get(`${BASE}/drive/browse/${id}`).then((r) => r.data),
  driveMakePublic: (id) => apiClient.post(`${BASE}/drive/files/${id}/public`).then((r) => r.data),
  driveDelete: (id) => apiClient.delete(`${BASE}/drive/files/${id}`).then((r) => r.data),
  driveUploadVideo: (id) => apiClient.post(`${BASE}/drive/upload-video/${id}`).then((r) => r.data),
};

export default trendAutomationApi;
