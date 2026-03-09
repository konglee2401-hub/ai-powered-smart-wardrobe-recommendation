/**
 * Unified video pipeline routes used by the merged Shorts/Reels + Production UI.
 * The route group intentionally mirrors the operator workflow:
 * dashboard -> sources -> channels -> videos -> jobs -> publish -> settings
 */

import { Router } from 'express';
import multer from 'multer';
import VideoPipelineController from '../controllers/videoPipelineController.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 1024 * 1024 * 1024,
  },
});

router.get('/dashboard', VideoPipelineController.getDashboard);
router.get('/templates', VideoPipelineController.listTemplates);
router.get('/sources', VideoPipelineController.listSources);
router.post('/sources', VideoPipelineController.createSource);
router.put('/sources/:sourceId', VideoPipelineController.updateSource);
router.delete('/sources/:sourceId', VideoPipelineController.deleteSource);
router.get('/channels', VideoPipelineController.listChannels);
router.get('/videos', VideoPipelineController.listVideos);
router.post('/videos/queue', VideoPipelineController.queueVideos);
// Operator upload for manual main/sub composition inputs.
router.post('/videos/manual-upload', upload.single('file'), VideoPipelineController.uploadOperatorVideo);
router.post('/videos/upload-pending', VideoPipelineController.uploadPendingVideos);
router.post('/videos/trigger-pending-downloads', VideoPipelineController.triggerPendingDownloads);
router.post('/videos/:videoId/upload', VideoPipelineController.uploadVideo);
router.get('/source-videos', VideoPipelineController.listVideos);
router.post('/source-videos/queue', VideoPipelineController.queueVideos);
router.get('/jobs', VideoPipelineController.listJobs);
router.get('/jobs/:queueId/logs', VideoPipelineController.getJobLogs);
// Manual start lets operators kick one queued mashup immediately.
router.post('/jobs/:queueId/start', VideoPipelineController.startJob);
router.post('/jobs/:queueId/publish', VideoPipelineController.publishJob);
router.get('/connections', VideoPipelineController.getConnections);
router.post('/connections', VideoPipelineController.addConnection);
router.post('/connections/:accountId/verify', VideoPipelineController.verifyConnection);
router.delete('/connections/:accountId', VideoPipelineController.deleteConnection);
router.post('/sub-video-sources/public-drive/analyze', VideoPipelineController.analyzePublicSubVideoDriveFolder);
router.get('/settings', VideoPipelineController.getSettings);
router.put('/settings', VideoPipelineController.saveSettings);

export default router;

