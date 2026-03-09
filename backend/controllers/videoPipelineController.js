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

class VideoPipelineController {
  static getDashboard = asyncHandler(async (_req, res) => {
    const result = await videoPipelineService.getDashboard();
    res.json(result);
  });

  static listTemplates = asyncHandler(async (_req, res) => {
    const result = await videoPipelineService.listFactoryTemplates();
    res.json(result);
  });

  static listSources = asyncHandler(async (_req, res) => {
    const result = await videoPipelineService.listSources();
    res.json(result);
  });

  static createSource = asyncHandler(async (req, res) => {
    const result = await videoPipelineService.createSource(req.body || {});
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  static updateSource = asyncHandler(async (req, res) => {
    const result = await videoPipelineService.updateSource(req.params.sourceId, req.body || {});
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  static deleteSource = asyncHandler(async (req, res) => {
    const result = await videoPipelineService.deleteSource(req.params.sourceId);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  static listChannels = asyncHandler(async (req, res) => {
    const result = await videoPipelineService.listChannels(req.query || {});
    res.json(result);
  });

  static listVideos = asyncHandler(async (req, res) => {
    console.log('[DEBUG] listVideos called with filters:', req.query);
    const result = await videoPipelineService.listSourceVideos(req.query || {});
    console.log('[DEBUG] listVideos result count:', result.items?.length);
    res.json(result);
  });

  static queueVideos = asyncHandler(async (req, res) => {
    const result = await videoPipelineService.queueSourceVideos(req.body || {});
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  static uploadVideo = asyncHandler(async (req, res) => {
    const result = await videoPipelineService.uploadSourceVideo(req.params.videoId);
    res.json(result);
  });

  /**
   * Accepts an operator-uploaded main/sub video file and registers it as a
   * gallery asset so production can reuse the same media later.
   */
  static uploadOperatorVideo = asyncHandler(async (req, res) => {
    const result = await videoPipelineService.uploadOperatorVideo(req.file, req.body || {});
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  static uploadPendingVideos = asyncHandler(async (req, res) => {
    const result = await videoPipelineService.uploadPendingSourceVideos(req.body?.limit || req.query?.limit || 30);
    res.json(result);
  });

  static triggerPendingDownloads = asyncHandler(async (req, res) => {
    const result = await videoPipelineService.triggerPendingDownloads(req.body?.limit || req.query?.limit || 200);
    res.json(result);
  });

  static listJobs = asyncHandler(async (req, res) => {
    const result = await videoPipelineService.listJobs(req.query || {});
    res.json(result);
  });

  static getJobLogs = asyncHandler(async (req, res) => {
    const result = await videoPipelineService.getJobLogs(req.params.queueId);
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
    const result = await videoPipelineService.startJob(req.params.queueId);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  static publishJob = asyncHandler(async (req, res) => {
    const result = await videoPipelineService.publishJob(req.params.queueId, req.body || {});
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  static getConnections = asyncHandler(async (_req, res) => {
    const result = await videoPipelineService.getConnections();
    res.json(result);
  });

  static addConnection = asyncHandler(async (req, res) => {
    const result = await videoPipelineService.addConnection(req.body || {});
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  static verifyConnection = asyncHandler(async (req, res) => {
    const result = await videoPipelineService.verifyConnection(req.params.accountId);
    if (!result.success) {
      return res.status(404).json(result);
    }
    res.json(result);
  });

  static deleteConnection = asyncHandler(async (req, res) => {
    const result = await videoPipelineService.deleteConnection(req.params.accountId);
    if (!result.success) {
      return res.status(404).json(result);
    }
    res.json(result);
  });

  static analyzePublicSubVideoDriveFolder = asyncHandler(async (req, res) => {
    const result = await videoPipelineService.analyzePublicSubVideoDriveFolder(req.body || req.query || {});
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  static getSettings = asyncHandler(async (_req, res) => {
    const result = await videoPipelineService.getSettings();
    res.json(result);
  });

  static saveSettings = asyncHandler(async (req, res) => {
    const result = await videoPipelineService.saveSettings(req.body || {});
    res.json(result);
  });
}

export default VideoPipelineController;

