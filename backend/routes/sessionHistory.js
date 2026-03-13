/**
 * Session History Routes
 * API endpoints for session management
 */

import express from 'express';
import SessionHistoryController from '../controllers/sessionHistoryController.js';
import { protect } from '../middleware/auth.js';
import SessionLog from '../models/SessionLog.js';
import { requireActiveSubscription, consumeGeneration } from '../middleware/subscription.js';
import { requireMenuAccess, requireApiAccess } from '../middleware/permissions.js';

const router = express.Router();

router.use(protect);
router.use(requireActiveSubscription);
router.use(requireMenuAccess('generation'));
router.use(requireApiAccess('generation'));

/**
 * POST /api/sessions/create
 * Create a new session/flowId for generation tracking
 * 💫 NEW: Quick session creation without userId requirement
 */
router.post('/create', async (req, res) => {
  try {
    const { flowType = 'one-click', useCase } = req.body;

    const map = {
      'image-generation': 'image',
      'video-generation': 'video',
      'voice-generation': 'voice',
      'one-click': 'oneClick',
    };
    const usageType = map[flowType];
    if (usageType) {
      await new Promise((resolve) => consumeGeneration(usageType)(req, res, resolve));
      if (res.headersSent) return;
    }
    
    // Generate unique session ID
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    console.log(`\n📝 Creating session: ${sessionId}`);
    console.log(`   Type: ${flowType}`);
    console.log(`   Use Case: ${useCase}`);
    
    // Create session record in database immediately
    const sessionLog = new SessionLog({
      sessionId,
      flowType,
      status: 'in-progress',
      createdAt: new Date(),
      updatedAt: new Date(),
      logs: [{
        timestamp: new Date(),
        level: 'info',
        category: 'session-init',
        message: `Session initialized for ${useCase || flowType}`,
        details: { flowType, useCase }
      }]
    });
    
    await sessionLog.save();
    
    console.log(`✅ Session created: ${sessionId}`);
    
    res.status(201).json({
      success: true,
      data: {
        sessionId,
        flowId: sessionId,
        flowType,
        createdAt: sessionLog.createdAt
      }
    });
  } catch (error) {
    console.error('❌ Error creating session:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

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
