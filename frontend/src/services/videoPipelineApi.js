import apiClient from '../config/api';

/**
 * Unified frontend API client for the merged video pipeline workspace.
 * The page now reads everything from one route group so it no longer depends
 * on legacy Shorts/Reels page services or page-specific proxies.
 */
const PIPELINE_BASE = '/video-pipeline';
const SCRAPER_BASE = '/shorts-reels';

const unwrap = (promise) => promise.then((response) => response.data);
const wrapPlayboardManualDiscoverPayload = (payload = {}) => {
  if (!payload || typeof payload !== 'object') {
    return { config: {} };
  }

  if (payload.config) {
    return payload;
  }

  const { topics, ...config } = payload;
  const normalizedDimension = {
    'most-liked': 'trending',
    'most-commented': 'rising',
  }[String(config.dimension || '').trim().toLowerCase()] || config.dimension;

  return {
    config: {
      ...config,
      ...(normalizedDimension ? { dimension: normalizedDimension } : {}),
    },
    ...(Array.isArray(topics) ? { topics } : {}),
  };
};

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
  queueVideosToFolder: (payload) => unwrap(apiClient.post(`${PIPELINE_BASE}/videos/queue-folder`, payload)),
  uploadOperatorVideo: (formData) =>
    unwrap(apiClient.post(`${PIPELINE_BASE}/videos/manual-upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })),
  uploadVideo: (videoId) => unwrap(apiClient.post(`${PIPELINE_BASE}/videos/${videoId}/upload`)),
  deleteVideo: (videoId) => unwrap(apiClient.delete(`${PIPELINE_BASE}/videos/${videoId}`)),
  uploadPendingVideos: (limit = 30) => unwrap(apiClient.post(`${PIPELINE_BASE}/videos/upload-pending`, { limit })),
  triggerPendingDownloads: (limit = 200) =>
    unwrap(apiClient.post(`${PIPELINE_BASE}/videos/trigger-pending-downloads`, { limit })),
  getProductionOverview: (params = {}) => unwrap(apiClient.get(`${PIPELINE_BASE}/production/overview`, { params })),
  getProductionHistory: (params = {}) => unwrap(apiClient.get(`${PIPELINE_BASE}/production/history`, { params })),
  getProductionHistoryItem: (queueId) => unwrap(apiClient.get(`${PIPELINE_BASE}/production/history/${queueId}`)),
  deleteProductionHistoryItem: (queueId) => unwrap(apiClient.delete(`${PIPELINE_BASE}/production/history/${queueId}`)),
  remashupJob: (queueId, payload = {}) => unwrap(apiClient.post(`${PIPELINE_BASE}/production/history/${queueId}/remashup`, payload)),
  runMassProduction: (payload = {}) => unwrap(apiClient.post(`${PIPELINE_BASE}/production/mass-produce`, payload)),

  getJobs: (params = {}) => unwrap(apiClient.get(`${PIPELINE_BASE}/jobs`, { params })),
  getQueueRuntime: (params = {}) => unwrap(apiClient.get(`${PIPELINE_BASE}/jobs/runtime`, { params })),
  getJobLogs: (queueId) => unwrap(apiClient.get(`${PIPELINE_BASE}/jobs/${queueId}/logs`)),
  startJob: (queueId) => unwrap(apiClient.post(`${PIPELINE_BASE}/jobs/${queueId}/start`)),
  publishJob: (queueId, payload) => unwrap(apiClient.post(`${PIPELINE_BASE}/jobs/${queueId}/publish`, payload)),
  publishToYoutubeAccounts: (queueId, payload) => unwrap(apiClient.post(`${PIPELINE_BASE}/jobs/${queueId}/publish-youtube`, payload)),
  getPublishAccounts: () => unwrap(apiClient.get(`${PIPELINE_BASE}/publish-accounts`)),
  triggerPublishSchedulerNow: () => unwrap(apiClient.post(`${PIPELINE_BASE}/publish/run-now`)),
  retryFailedJobs: (payload = {}) => unwrap(apiClient.post(`${PIPELINE_BASE}/jobs/retry-failed`, payload)),
  releaseStaleJobs: (payload = {}) => unwrap(apiClient.post(`${PIPELINE_BASE}/jobs/release-stale`, payload)),
  clearQueueJobs: (payload = {}) => unwrap(apiClient.post(`${PIPELINE_BASE}/jobs/clear`, payload)),

  getConnections: () => unwrap(apiClient.get(`${PIPELINE_BASE}/connections`)),
  addConnection: (payload) => unwrap(apiClient.post(`${PIPELINE_BASE}/connections`, payload)),
  verifyConnection: (accountId) => unwrap(apiClient.post(`${PIPELINE_BASE}/connections/${accountId}/verify`)),
  deleteConnection: (accountId) => unwrap(apiClient.delete(`${PIPELINE_BASE}/connections/${accountId}`)),

  analyzePublicSubVideoDriveFolder: (payload) => unwrap(apiClient.post(`${PIPELINE_BASE}/sub-video-sources/public-drive/analyze`, payload)),

  getSettings: () => unwrap(apiClient.get(`${PIPELINE_BASE}/settings`)),
  getSchedulerRuntimeStatus: () => unwrap(apiClient.get(`${PIPELINE_BASE}/settings/scheduler-runtime`)),
  saveSettings: (payload) => unwrap(apiClient.put(`${PIPELINE_BASE}/settings`, payload)),
  triggerQueueScannerNow: (payload = {}) => unwrap(apiClient.post('/queue-scanner/scan-now', payload)),

  getScraperOverview: () => unwrap(apiClient.get(`${SCRAPER_BASE}/stats/overview`)),
  getScraperSettings: () => unwrap(apiClient.get(`${SCRAPER_BASE}/settings`)),
  getPlayboardMetadata: () => unwrap(apiClient.get(`${SCRAPER_BASE}/playboard/metadata`)),
  getPlayboardConfigs: () => unwrap(apiClient.get(`${SCRAPER_BASE}/playboard/configs`)),
  triggerScraperJob: (type, filters = {}) =>
    unwrap(apiClient.post(`${SCRAPER_BASE}/jobs/trigger`, {}, { params: { type, ...filters } })),
  manualDiscoverPlayboard: (payload) =>
    unwrap(apiClient.post(`${SCRAPER_BASE}/playboard/manual-discover`, wrapPlayboardManualDiscoverPayload(payload))),
  manualDiscoverDailyhaha: (payload = {}) => unwrap(apiClient.post(`${SCRAPER_BASE}/dailyhaha/manual-discover`, payload)),
  manualDiscoverDouyin: (payload = {}) => unwrap(apiClient.post(`${SCRAPER_BASE}/douyin/manual-discover`, payload)),
  manualScanChannel: (channelId) => unwrap(apiClient.post(`${SCRAPER_BASE}/channels/${channelId}/manual-scan`)),
  redownloadVideo: (videoId) => unwrap(apiClient.post(`${SCRAPER_BASE}/videos/${videoId}/re-download`)),
  getScraperLogs: (params = {}) => unwrap(apiClient.get(`${SCRAPER_BASE}/logs`, { params })),
  getCaptchaJobs: (params = {}) => unwrap(apiClient.get(`${SCRAPER_BASE}/captcha/jobs`, { params })),
  resolveCaptchaJob: (jobId) => unwrap(apiClient.post(`${SCRAPER_BASE}/captcha/jobs/${jobId}/resolve`)),
};

export default videoPipelineApi;






