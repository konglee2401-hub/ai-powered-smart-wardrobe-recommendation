import express from 'express';
import SessionLog from '../models/SessionLog.js';

const router = express.Router();

/**
 * POST /api/sessions/create
 * Create a new session immediately (returns flowId)
 * This executes BEFORE the generation flow to provide immediate session ID
 */
router.post('/create', async (req, res) => {
  try {
    const { flowType = 'one-click', useCase } = req.body;
    
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
 * GET /api/sessions/:sessionId
 * Get full session log and metadata
 */
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    console.log(`\n📋 Fetching session logs for: ${sessionId}`);
    
    const log = await SessionLog.getSessionLogs(sessionId);
    console.log(`  Query result: ${log ? 'FOUND' : 'NOT FOUND'}`);
    
    if (log) {
      console.log(`  Session status: ${log.status}`);
      console.log(`  Log entries: ${log.logs?.length || 0}`);
      console.log(`  Created at: ${log.createdAt}`);
      console.log(`  ✅ Returning session data`);
    }

    if (!log) {
      console.log(`  ❌ Session ${sessionId} not found in MongoDB`);
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    res.json({
      success: true,
      data: log
    });
  } catch (error) {
    console.error(`❌ Error fetching session: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/sessions/:sessionId/summary
 * Get quick summary of session
 */
router.get('/:sessionId/summary', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const log = await SessionLog.getSessionLogs(sessionId);

    if (!log) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    const summary = {
      sessionId: log.sessionId,
      flowType: log.flowType,
      status: log.status,
      createdAt: log.createdAt,
      updatedAt: log.updatedAt,
      duration: log.metrics?.totalDuration ? `${(log.metrics.totalDuration / 1000).toFixed(2)}s` : 'N/A',
      stages: log.metrics?.stages?.map(s => ({
        stage: s.stage,
        duration: `${(s.duration / 1000).toFixed(2)}s`,
        status: s.status
      })),
      artifacts: log.artifacts,
      error: log.error ? {
        stage: log.error.stage,
        message: log.error.message,
        timestamp: log.error.timestamp
      } : null,
      logCount: log.logs?.length || 0
    };

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error fetching session summary:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/sessions/:sessionId/logs
 * Get all logs for a session (with optional filtering)
 * Query: ?level=info&category=image-generation&limit=100
 */
router.get('/:sessionId/logs', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { level, category, limit = 100 } = req.query;

    const log = await SessionLog.getSessionLogs(sessionId);

    if (!log) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    let logs = log.logs || [];

    // Filter by level
    if (level) {
      logs = logs.filter(l => l.level === level);
    }

    // Filter by category
    if (category) {
      logs = logs.filter(l => l.category === category);
    }

    // Limit results
    logs = logs.slice(-parseInt(limit));

    res.json({
      success: true,
      data: {
        sessionId,
        totalLogs: log.logs?.length || 0,
        filteredLogs: logs.length,
        logs
      }
    });
  } catch (error) {
    console.error('Error fetching session logs:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/sessions
 * Get recent sessions
 * Query: ?limit=10&flowType=one-click&status=completed
 */
router.get('/', async (req, res) => {
  try {
    const { limit = 10, flowType, status } = req.query;

    let query = {};
    if (flowType) query.flowType = flowType;
    if (status) query.status = status;

    const sessions = await SessionLog.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select('sessionId flowType status createdAt updatedAt metrics.totalDuration error.message');

    res.json({
      success: true,
      data: sessions
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/sessions/:sessionId/artifacts
 * Get stored artifacts and analysis for a session
 */
router.get('/:sessionId/artifacts', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const log = await SessionLog.getSessionLogs(sessionId);

    if (!log) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    res.json({
      success: true,
      data: {
        sessionId,
        artifacts: log.artifacts,
        analysis: log.analysis,
        timestamp: log.createdAt
      }
    });
  } catch (error) {
    console.error('Error fetching artifacts:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/sessions/:sessionId
 * Delete a session (for cleanup)
 */
router.delete('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = await SessionLog.deleteOne({ sessionId });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    res.json({
      success: true,
      message: `Session ${sessionId} deleted`
    });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
