/**
 * Video Production Routes
 * - Register all API endpoints for video production system
 * - Map controller methods to HTTP routes
 */

import { Router } from 'express';
import VideoProductionController from '../controllers/videoProductionController.js';

const router = Router();

// ============ QUEUE ROUTES ============

/**
 * Queue Management
 */
router.post('/queue/add', VideoProductionController.addToQueue);
router.post('/queue/batch-add', VideoProductionController.batchAddToQueue);
router.get('/queue/stats', VideoProductionController.getQueueStats);
router.get('/queue/next-pending', VideoProductionController.getNextPending);
router.get('/queue/:queueId', VideoProductionController.getQueueItem);
router.get('/queue/:queueId/logs', VideoProductionController.getQueueLogs);
router.delete('/queue', VideoProductionController.clearQueue);

// ============ ACCOUNT ROUTES ============

/**
 * Multi Account Management
 */
router.post('/accounts', VideoProductionController.addAccount);
router.get('/accounts', VideoProductionController.getAllAccounts);
router.get('/accounts/stats', VideoProductionController.getAccountStats);
router.get('/accounts/active', VideoProductionController.getActiveAccounts);
router.get('/accounts/platform/:platform', VideoProductionController.getAccountsByPlatform);
router.get('/accounts/best/:platform', VideoProductionController.getBestAccount);
router.get('/accounts/rotation/:platform', VideoProductionController.getAccountRotation);
router.get('/accounts/:accountId/can-upload', VideoProductionController.canUploadNow);
router.patch('/accounts/:accountId', VideoProductionController.updateAccount);
router.post('/accounts/:accountId/deactivate', VideoProductionController.deactivateAccount);
router.delete('/accounts/:accountId', VideoProductionController.deleteAccount);

// ============ MEDIA LIBRARY ROUTES ============

/**
 * Media Library Management
 */
router.post('/media/templates', VideoProductionController.addTemplate);
router.post('/media/hot-videos', VideoProductionController.addHotVideo);
router.post('/media/audio', VideoProductionController.addAudio);
router.get('/media/stats', VideoProductionController.getMediaStats);
router.get('/media/random/template', VideoProductionController.getRandomTemplate);
router.get('/media/random/hot-video', VideoProductionController.getRandomHotVideo);
router.get('/media/random/audio', VideoProductionController.getRandomAudio);

// ============ UPLOAD ROUTES ============

/**
 * Upload Management
 */
router.post('/uploads/register', VideoProductionController.registerUpload);
router.get('/uploads/stats', VideoProductionController.getUploadStats);
router.get('/uploads/next-pending', VideoProductionController.getNextPendingUpload);
router.get('/uploads/status/:status', VideoProductionController.getUploadsByStatus);
router.get('/uploads/platform/:platform/status', VideoProductionController.getPlatformStatus);
router.get('/uploads/queue/:queueId', VideoProductionController.getUploadsForQueue);
router.get('/uploads/account/:accountId', VideoProductionController.getUploadsForAccount);
router.get('/uploads/:uploadId', VideoProductionController.getUploadStatus);
router.post('/uploads/retry-failed', VideoProductionController.retryFailedUploads);

// ============ CRON JOB ROUTES ============

/**
 * Cron Job Management
 */
router.post('/jobs', VideoProductionController.createJob);
router.get('/jobs/stats', VideoProductionController.getJobStats);
router.get('/jobs', VideoProductionController.getAllJobs);
router.get('/jobs/:jobId', VideoProductionController.getJob);
router.get('/jobs/:jobId/history', VideoProductionController.getJobHistory);
router.patch('/jobs/:jobId', VideoProductionController.updateJob);
router.post('/jobs/:jobId/enable', VideoProductionController.enableJob);
router.post('/jobs/:jobId/disable', VideoProductionController.disableJob);
router.delete('/jobs/:jobId', VideoProductionController.deleteJob);

// ============ WORKFLOW/ORCHESTRATOR ROUTES ============

/**
 * Complete Workflow Orchestration
 */
router.get('/system/status', VideoProductionController.getSystemStatus);
router.post('/workflow/generate', VideoProductionController.generateVideoWorkflow);
router.post('/workflow/process-next', VideoProductionController.processNextVideo);
router.post('/workflow/upload-next', VideoProductionController.uploadNextVideo);
router.post('/workflow/initialize-automation', VideoProductionController.initializeAutomation);
router.get('/workflow/running-jobs', VideoProductionController.getRunningJobs);
router.post('/workflow/stop-all-jobs', VideoProductionController.stopAllJobs);

export default router;
