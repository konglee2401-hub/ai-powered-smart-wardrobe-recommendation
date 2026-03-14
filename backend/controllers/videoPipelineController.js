/**
 * Video Pipeline Controller
 *
 * Controller dedicated to the unified operator workspace. Each endpoint maps
 * to a screen section on the merged frontend page so the UI no longer has to
 * stitch together multiple route groups manually.
 */

import videoPipelineService from '../services/videoPipelineService.js';

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const buildUserContext = (req) => ({
  userId: req.user?._id?.toString?.() || req.user?.id || null,
  isAdmin: req.user?.role === 'admin'
});

class VideoPipelineController {
  static getDashboard = asyncHandler(async (req, res) => {
    const result = await videoPipelineService.getDashboard(buildUserContext(req));
    res.json(result);
  });

  static listTemplates = asyncHandler(async (req, res) => {
    const result = await videoPipelineService.listFactoryTemplates(buildUserContext(req));
    res.json(result);
  });

  static listSources = asyncHandler(async (req, res) => {
    const result = await videoPipelineService.listSources(buildUserContext(req));
    res.json(result);
  });

  static createSource = asyncHandler(async (req, res) => {
    const result = await videoPipelineService.createSource(req.body || {}, buildUserContext(req));
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  static updateSource = asyncHandler(async (req, res) => {
    const result = await videoPipelineService.updateSource(req.params.sourceId, req.body || {}, buildUserContext(req));
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  static deleteSource = asyncHandler(async (req, res) => {
    const result = await videoPipelineService.deleteSource(req.params.sourceId, buildUserContext(req));
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  static listChannels = asyncHandler(async (req, res) => {
    const result = await videoPipelineService.listChannels(req.query || {}, buildUserContext(req));
    res.json(result);
  });

  static listVideos = asyncHandler(async (req, res) => {
    const result = await videoPipelineService.listSourceVideos(req.query || {}, buildUserContext(req));
    res.json(result);
  });

  static queueVideos = asyncHandler(async (req, res) => {
    const result = await videoPipelineService.queueSourceVideos(req.body || {}, buildUserContext(req));
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  static queueVideosToFolder = asyncHandler(async (req, res) => {
    const result = await videoPipelineService.queueSourceVideosToFolder(req.body || {}, buildUserContext(req));
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  static uploadVideo = asyncHandler(async (req, res) => {
    const result = await videoPipelineService.uploadSourceVideo(req.params.videoId, buildUserContext(req));
    res.json(result);
  });

  static deleteVideo = asyncHandler(async (req, res) => {
    const result = await videoPipelineService.deleteSourceVideo(req.params.videoId, buildUserContext(req));
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  /**
   * Accepts an operator-uploaded main/sub video file and registers it as a
   * gallery asset so production can reuse the same media later.
   */
  static uploadOperatorVideo = asyncHandler(async (req, res) => {
    const result = await videoPipelineService.uploadOperatorVideo(req.file, req.body || {}, buildUserContext(req));
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  static uploadPendingVideos = asyncHandler(async (req, res) => {
    const result = await videoPipelineService.uploadPendingSourceVideos(req.body?.limit || req.query?.limit || 30, buildUserContext(req));
    res.json(result);
  });

  static uploadSelectedVideos = asyncHandler(async (req, res) => {
    const result = await videoPipelineService.uploadSelectedSourceVideos(req.body?.videoIds || [], buildUserContext(req));
    if (!result.success) {
      return res.status(400).json(result);
    }
    return res.json(result);
  });

  static runVoiceoverJobs = asyncHandler(async (req, res) => {
    const result = await videoPipelineService.runVoiceoverJobs(req.body || {}, buildUserContext(req));
    if (!result.success) {
      return res.status(400).json(result);
    }
    return res.json(result);
  });

  static triggerPendingDownloads = asyncHandler(async (req, res) => {
    const result = await videoPipelineService.triggerPendingDownloads(req.body?.limit || req.query?.limit || 200, buildUserContext(req));
    if (!result.success) {
      return res.status(502).json(result);
    }
    res.json(result);
  });

  static listJobs = asyncHandler(async (req, res) => {
    const result = await videoPipelineService.listJobs(req.query || {}, buildUserContext(req));
    res.json(result);
  });

  static getProductionOverview = asyncHandler(async (req, res) => {
    const result = await videoPipelineService.getProductionOverview(req.query || {}, buildUserContext(req));
    res.json(result);
  });

  static getProductionHistory = asyncHandler(async (req, res) => {
    const result = await videoPipelineService.getProductionHistory(req.query || {}, buildUserContext(req));
    res.json(result);
  });

  static getProductionHistoryItem = asyncHandler(async (req, res) => {
    const result = await videoPipelineService.getProductionHistoryItem(req.params.queueId, buildUserContext(req));
    if (!result.success) {
      return res.status(404).json(result);
    }
    res.json(result);
  });

  static deleteProductionHistoryItem = asyncHandler(async (req, res) => {
    const result = await videoPipelineService.deleteProductionHistoryItem(req.params.queueId, buildUserContext(req));
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  static remashupJob = asyncHandler(async (req, res) => {
    const userId = req.user?._id?.toString?.() || req.user?.id || 'unknown';
    const role = req.user?.role || 'unknown';
    const payload = req.body || {};
    console.log('[video-pipeline] remashup request', {
      queueId: req.params.queueId,
      userId,
      role,
      templateStrategy: payload.templateStrategy,
      templateName: payload.templateName,
      manualSubVideo: payload.manualSubVideo?.assetId || payload.manualSubVideo?.id || null,
      subtitleMode: payload.subtitleMode,
      capcutAutoCaption: payload.capcutAutoCaption,
      watermarkEnabled: payload.watermarkEnabled,
      voiceoverEnabled: payload.voiceoverEnabled,
      startImmediately: payload.startImmediately,
    });
    const result = await videoPipelineService.remashupJob(req.params.queueId, req.body || {}, buildUserContext(req));
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  static runMassProduction = asyncHandler(async (req, res) => {
    const result = await videoPipelineService.runMassProduction(req.body || {}, buildUserContext(req));
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  static runMassVoiceover = asyncHandler(async (req, res) => {
    const result = await videoPipelineService.runMassVoiceover(req.body || {}, buildUserContext(req));
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  static getQueueRuntime = asyncHandler(async (req, res) => {
    const result = await videoPipelineService.getQueueRuntime(req.query?.timeoutMinutes || 30, buildUserContext(req));
    res.json(result);
  });

  static retryFailedJobs = asyncHandler(async (req, res) => {
    const result = await videoPipelineService.retryFailedJobs(req.body?.maxRetries || req.query?.maxRetries || 3, buildUserContext(req));
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  static forceRetryJob = asyncHandler(async (req, res) => {
    const result = await videoPipelineService.forceRetryJob(req.params.queueId, req.body || {}, buildUserContext(req));
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });
  static releaseStaleJobs = asyncHandler(async (req, res) => {
    const result = await videoPipelineService.releaseStaleJobs(req.body?.timeoutMinutes || req.query?.timeoutMinutes || 30, buildUserContext(req));
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  static clearQueueJobs = asyncHandler(async (req, res) => {
    const result = await videoPipelineService.clearQueueJobs(req.body || req.query || {}, buildUserContext(req));
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  static getJobLogs = asyncHandler(async (req, res) => {
    const result = await videoPipelineService.getJobLogs(req.params.queueId, buildUserContext(req));
    if (!result.success) {
      return res.status(404).json(result);
    }
    res.json(result);
  });

  /**
   * Manual start is the operator-facing action for forcing one queued job to
   * begin immediately without waiting for the scheduler loop.
   */
  static startJob = asyncHandler(async (req, res) => {
    const result = await videoPipelineService.startJob(req.params.queueId, buildUserContext(req));
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  static publishJob = asyncHandler(async (req, res) => {
    const result = await videoPipelineService.publishJob(req.params.queueId, req.body || {}, buildUserContext(req));
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  static triggerPublishSchedulerNow = asyncHandler(async (req, res) => {
    const result = await videoPipelineService.triggerPublishSchedulerNow(buildUserContext(req));
    res.json(result);
  });

  static getConnections = asyncHandler(async (req, res) => {
    const result = await videoPipelineService.getConnections(buildUserContext(req));
    res.json(result);
  });

  static addConnection = asyncHandler(async (req, res) => {
    const result = await videoPipelineService.addConnection(req.body || {}, buildUserContext(req));
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  static verifyConnection = asyncHandler(async (req, res) => {
    const result = await videoPipelineService.verifyConnection(req.params.accountId, buildUserContext(req));
    if (!result.success) {
      return res.status(404).json(result);
    }
    res.json(result);
  });

  static deleteConnection = asyncHandler(async (req, res) => {
    const result = await videoPipelineService.deleteConnection(req.params.accountId, buildUserContext(req));
    if (!result.success) {
      return res.status(404).json(result);
    }
    res.json(result);
  });

  static analyzePublicSubVideoDriveFolder = asyncHandler(async (req, res) => {
    const result = await videoPipelineService.analyzePublicSubVideoDriveFolder(req.body || req.query || {}, buildUserContext(req));
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  static getSettings = asyncHandler(async (req, res) => {
    const result = await videoPipelineService.getSettings(buildUserContext(req));
    res.json(result);
  });

  static getSchedulerRuntimeStatus = asyncHandler(async (req, res) => {
    const result = await videoPipelineService.getSchedulerRuntimeStatus(buildUserContext(req));
    res.json(result);
  });

  static saveSettings = asyncHandler(async (req, res) => {
    const result = await videoPipelineService.saveSettings(req.body || {}, buildUserContext(req));
    res.json(result);
  });

  /**
   * Get all available publishing accounts (YouTube OAuth + legacy MultiAccountService)
   */
  static getPublishAccounts = asyncHandler(async (req, res) => {
    const result = await videoPipelineService.getPublishAccounts(buildUserContext(req));
    res.json(result);
  });

  /**
   * Publish video to selected YouTube accounts via OAuth
   */
  static publishToYoutubeAccounts = asyncHandler(async (req, res) => {
    const result = await videoPipelineService.publishToYoutubeAccounts(
      req.params.queueId,
      req.body || {},
      buildUserContext(req)
    );
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  /**
   * Get transcript for a source video
   * Useful for reviewing YouTube transcripts before production
   */
  static getVideoTranscript = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const result = await videoPipelineService.getVideoTranscript(videoId, buildUserContext(req));
    if (!result.success) {
      return res.status(404).json(result);
    }
    res.json(result);
  });
}

export default VideoPipelineController;


