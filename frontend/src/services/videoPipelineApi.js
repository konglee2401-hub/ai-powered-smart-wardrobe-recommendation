import apiClient from '../config/api';

/**
 * Unified frontend API client for the merged video pipeline workspace.
 * The page now reads everything from one route group so it no longer depends
 * on legacy Shorts/Reels page services or page-specific proxies.
 */
const PIPELINE_BASE = '/video-pipeline';

const unwrap = (promise) => promise.then((response) => response.data);

export const videoPipelineApi = {
  getDashboard: () => unwrap(apiClient.get(`${PIPELINE_BASE}/dashboard`)),
  getTemplates: () => unwrap(apiClient.get(`${PIPELINE_BASE}/templates`)),
  getSources: () => unwrap(apiClient.get(`${PIPELINE_BASE}/sources`)),
  createSource: (payload) => unwrap(apiClient.post(`${PIPELINE_BASE}/sources`, payload)),
  updateSource: (sourceId, payload) => unwrap(apiClient.put(`${PIPELINE_BASE}/sources/${sourceId}`, payload)),
  deleteSource: (sourceId) => unwrap(apiClient.delete(`${PIPELINE_BASE}/sources/${sourceId}`)),

  getChannels: (params = {}) => unwrap(apiClient.get(`${PIPELINE_BASE}/channels`, { params })),

  getVideos: (params = {}) => unwrap(apiClient.get(`${PIPELINE_BASE}/videos`, { params })),
  queueVideos: (payload) => unwrap(apiClient.post(`${PIPELINE_BASE}/videos/queue`, payload)),
  uploadOperatorVideo: (formData) =>
    unwrap(apiClient.post(`${PIPELINE_BASE}/videos/manual-upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })),
  uploadVideo: (videoId) => unwrap(apiClient.post(`${PIPELINE_BASE}/videos/${videoId}/upload`)),
  uploadPendingVideos: (limit = 30) => unwrap(apiClient.post(`${PIPELINE_BASE}/videos/upload-pending`, { limit })),
  triggerPendingDownloads: (limit = 200) =>
    unwrap(apiClient.post(`${PIPELINE_BASE}/videos/trigger-pending-downloads`, { limit })),

  getJobs: (params = {}) => unwrap(apiClient.get(`${PIPELINE_BASE}/jobs`, { params })),
  getJobLogs: (queueId) => unwrap(apiClient.get(`${PIPELINE_BASE}/jobs/${queueId}/logs`)),
  startJob: (queueId) => unwrap(apiClient.post(`${PIPELINE_BASE}/jobs/${queueId}/start`)),
  publishJob: (queueId, payload) => unwrap(apiClient.post(`${PIPELINE_BASE}/jobs/${queueId}/publish`, payload)),

  getConnections: () => unwrap(apiClient.get(`${PIPELINE_BASE}/connections`)),
  addConnection: (payload) => unwrap(apiClient.post(`${PIPELINE_BASE}/connections`, payload)),
  verifyConnection: (accountId) => unwrap(apiClient.post(`${PIPELINE_BASE}/connections/${accountId}/verify`)),
  deleteConnection: (accountId) => unwrap(apiClient.delete(`${PIPELINE_BASE}/connections/${accountId}`)),

  analyzePublicSubVideoDriveFolder: (payload) => unwrap(apiClient.post(`${PIPELINE_BASE}/sub-video-sources/public-drive/analyze`, payload)),

  getSettings: () => unwrap(apiClient.get(`${PIPELINE_BASE}/settings`)),
  saveSettings: (payload) => unwrap(apiClient.put(`${PIPELINE_BASE}/settings`, payload)),
};

export default videoPipelineApi;




