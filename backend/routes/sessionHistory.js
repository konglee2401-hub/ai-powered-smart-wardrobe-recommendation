/**
 * Session History Routes
 * API endpoints for session management
 */

import express from 'express';
import SessionHistoryController from '../controllers/sessionHistoryController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/sessions
 * Create new session
 */
router.post('/', SessionHistoryController.createSession);

/**
 * GET /api/sessions/:sessionId
 * Get session by ID
 */
router.get('/:sessionId', SessionHistoryController.getSession);

/**
 * PUT /api/sessions/:sessionId
 * Update session
 */
router.put('/:sessionId', SessionHistoryController.updateSession);

/**
 * GET /api/sessions/user/:userId
 * Get all sessions for user
 */
router.get('/user/:userId', protect, SessionHistoryController.getUserSessions);

/**
 * POST /api/sessions/:sessionId/analysis
 * Save analysis with Grok conversation
 */
router.post(
  '/:sessionId/analysis',
  protect,
  SessionHistoryController.saveAnalysis
);

/**
 * POST /api/sessions/:sessionId/prompt-variations
 * Save prompt variations
 */
router.post(
  '/:sessionId/prompt-variations',
  protect,
  SessionHistoryController.savePromptVariations
);

/**
 * POST /api/sessions/:sessionId/prompt-enhancement
 * Save prompt enhancement
 */
router.post(
  '/:sessionId/prompt-enhancement',
  protect,
  SessionHistoryController.savePromptEnhancement
);

/**
 * POST /api/sessions/:sessionId/generation
 * Save generation results
 */
router.post(
  '/:sessionId/generation',
  protect,
  SessionHistoryController.saveGenerationResults
);

/**
 * GET /api/sessions/:sessionId/statistics
 * Get session statistics
 */
router.get('/:sessionId/statistics', SessionHistoryController.getSessionStatistics);

/**
 * DELETE /api/sessions/:sessionId
 * Archive session
 */
router.delete('/:sessionId', protect, SessionHistoryController.deleteSession);

/**
 * GET /api/sessions/:sessionId/export
 * Export session as JSON
 */
router.get('/:sessionId/export', protect, SessionHistoryController.exportSession);

export default router;
