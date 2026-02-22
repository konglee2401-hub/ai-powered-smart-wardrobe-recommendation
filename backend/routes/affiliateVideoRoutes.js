/**
 * Affiliate Video Production Routes
 */

import express from 'express';
import {
  createAffiliateProject,
  addProductsToBatch,
  generateSubtitles,
  getVideoTemplates,
  generateMetadata,
  getBatchReport,
  recordVideoMetrics,
  getAnalyticsReport,
  getVideoInsights,
  optimizeForPlatform,
  optimizeForAllPlatforms,
  getPlatformChecklist,
  getAvailablePlatforms,
  generateTrackingLink,
  recordLinkClick,
  recordConversion,
  getLinkStats,
  getVideoAffiliateStats,
  getAffiliateRecommendations,
  generateBatchLinks,
  getBatchAffiliatePerformance,
  exportPerformanceData
} from '../controllers/affiliateVideoController.js';

const router = express.Router();

// Project Management
router.post('/projects', createAffiliateProject);
router.post('/batches', addProductsToBatch);
router.get('/batches/:batchId/report', getBatchReport);

// Auto-Subtitles
router.post('/subtitles/generate', generateSubtitles);

// Content Templates
router.get('/templates', getVideoTemplates);

// Metadata & SEO
router.post('/metadata', generateMetadata);

// Analytics & Performance
router.post('/metrics', recordVideoMetrics);
router.get('/analytics', getAnalyticsReport);
router.get('/insights', getVideoInsights);

// Platform Optimization
router.get('/platforms', getAvailablePlatforms);
router.post('/optimize-platform', optimizeForPlatform);
router.post('/optimize-all-platforms', optimizeForAllPlatforms);
router.get('/platform-checklist', getPlatformChecklist);

// Affiliate Link Tracking & Management
router.post('/links/generate', generateTrackingLink);
router.post('/links/click', recordLinkClick);
router.post('/links/conversion', recordConversion);
router.get('/links/stats', getLinkStats);
router.get('/links/video-stats', getVideoAffiliateStats);
router.get('/links/recommendations', getAffiliateRecommendations);
router.post('/links/batch-generate', generateBatchLinks);
router.get('/links/batch-performance', getBatchAffiliatePerformance);
router.get('/links/export', exportPerformanceData);

export default router;
