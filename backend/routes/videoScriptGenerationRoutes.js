/**
 * Video Script Generation Routes
 * API endpoints for generating video scripts using ChatGPT
 */

import express from 'express';
import {
  generateVideoScript,
  generateScriptVariations,
  generateCameraGuide,
  generateLightingGuideHandler,
  generateMusicGuideHandler,
  getProductionTemplate,
  healthCheck
} from '../controllers/videoScriptGenerationController.js';

const router = express.Router();

/**
 * Generate video script
 * POST /api/video/generate-video-scripts
 * Body: {
 *   scenarioId: string,
 *   style: string,
 *   duration: number,
 *   segments: number,
 *   productName: string,
 *   productDescription?: string,
 *   productType?: string,
 *   targetAudience?: string
 * }
 */
router.post('/generate-video-scripts', generateVideoScript);

/**
 * Generate script variations
 * POST /api/video/generate-script-variations
 * Body: {
 *   scenarioId: string,
 *   style: string,
 *   duration: number,
 *   segments: number,
 *   productName: string,
 *   productDescription?: string,
 *   productType?: string,
 *   targetAudience?: string,
 *   variationCount?: number (1-5, default: 3)
 * }
 */
router.post('/generate-script-variations', generateScriptVariations);

/**
 * Generate camera movement guide
 * POST /api/video/generate-camera-guide
 * Body: {
 *   scenarioId: string,
 *   style: string,
 *   duration: number,
 *   segments?: number,
 *   productName: string,
 *   productDescription?: string,
 *   productType?: string,
 *   targetAudience?: string
 * }
 */
router.post('/generate-camera-guide', generateCameraGuide);

/**
 * Generate lighting guide
 * POST /api/video/generate-lighting-guide
 * Body: {
 *   scenarioId: string,
 *   style: string,
 *   duration: number,
 *   segments?: number,
 *   productName: string,
 *   productDescription?: string,
 *   productType?: string,
 *   targetAudience?: string
 * }
 */
router.post('/generate-lighting-guide', generateLightingGuideHandler);

/**
 * Generate music guide
 * POST /api/video/generate-music-guide
 * Body: {
 *   scenarioId: string,
 *   style: string,
 *   duration: number,
 *   segments?: number,
 *   productName: string,
 *   productDescription?: string,
 *   productType?: string,
 *   targetAudience?: string
 * }
 */
router.post('/generate-music-guide', generateMusicGuideHandler);

/**
 * Get production template by ID
 * GET /api/video/templates/:templateId
 */
router.get('/templates/:templateId', getProductionTemplate);

/**
 * Health check
 * GET /api/video/health
 */
router.get('/health', healthCheck);

export default router;
