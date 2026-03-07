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
    const {
      limit = 24,
      page = 1,
      flowType,
      status,
      search = '',
    } = req.query;

    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 24, 1), 100);
    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (parsedPage - 1) * parsedLimit;
    const searchTerm = String(search || '').trim();

    const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const baseQuery = {};
    if (flowType && flowType !== 'all') baseQuery.flowType = flowType;
    if (status && status !== 'all') baseQuery.status = status;

    if (searchTerm) {
      const regex = new RegExp(escapeRegex(searchTerm), 'i');
      baseQuery.$or = [
        { sessionId: regex },
        { flowType: regex },
        { 'error.message': regex },
        { 'logs.message': regex },
        { 'logs.category': regex },
      ];
    }

    const [sessions, total, statusBuckets, flowBuckets] = await Promise.all([
      SessionLog.find(baseQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .select('sessionId flowType status createdAt updatedAt metrics artifacts analysis error logs')
        .lean(),
      SessionLog.countDocuments(baseQuery),
      SessionLog.aggregate([
        { $match: baseQuery },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      SessionLog.aggregate([
        { $match: baseQuery },
        { $group: { _id: '$flowType', count: { $sum: 1 } } },
      ]),
    ]);

    const data = sessions.map((session) => {
      const latestLog = Array.isArray(session.logs) && session.logs.length > 0
        ? session.logs[session.logs.length - 1]
        : null;
      const initLog = Array.isArray(session.logs)
        ? session.logs.find((entry) => entry?.category === 'session-init')
        : null;
      const generatedImageCount = Array.isArray(session.artifacts?.generatedImagePaths)
        ? session.artifacts.generatedImagePaths.length
        : 0;
      const generatedVideoCount = Array.isArray(session.artifacts?.videoSegmentPaths)
        ? session.artifacts.videoSegmentPaths.length
        : 0;
      const generatedAudioCount = Array.isArray(session.artifacts?.audioPaths)
        ? session.artifacts.audioPaths.length
        : 0;
      const sourceVideoCount = Array.isArray(session.artifacts?.sourceVideoPaths)
        ? session.artifacts.sourceVideoPaths.length
        : 0;

      return {
        sessionId: session.sessionId,
        flowType: session.flowType,
        status: session.status,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        totalDuration: session.metrics?.totalDuration || null,
        stageCount: Array.isArray(session.metrics?.stages) ? session.metrics.stages.length : 0,
        logCount: Array.isArray(session.logs) ? session.logs.length : 0,
        inputCount: [
          session.artifacts?.characterImagePath,
          session.artifacts?.productImagePath,
        ].filter(Boolean).length + sourceVideoCount,
        outputCount: generatedImageCount + generatedVideoCount + generatedAudioCount,
        generatedImageCount,
        generatedVideoCount,
        generatedAudioCount,
        useCase: initLog?.details?.useCase || null,
        latestLog: latestLog
          ? {
              timestamp: latestLog.timestamp,
              level: latestLog.level,
              category: latestLog.category,
              message: latestLog.message,
            }
          : null,
        error: session.error
          ? {
              stage: session.error.stage,
              message: session.error.message,
              timestamp: session.error.timestamp,
            }
          : null,
      };
    });

    const summary = {
      total,
      status: statusBuckets.reduce((accumulator, bucket) => {
        accumulator[bucket._id || 'unknown'] = bucket.count;
        return accumulator;
      }, {}),
      flowTypes: flowBuckets.reduce((accumulator, bucket) => {
        accumulator[bucket._id || 'unknown'] = bucket.count;
        return accumulator;
      }, {}),
    };

    res.json({
      success: true,
      data,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages: Math.max(Math.ceil(total / parsedLimit), 1),
        hasMore: skip + data.length < total,
      },
      summary,
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
 * POST /api/sessions/:sessionId/capture
 * Merge structured history data into a session log
 */
router.post('/:sessionId/capture', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const {
      flowType = 'one-click',
      useCase,
      status,
      log,
      artifacts,
      analysis,
      metricStage,
      totalDuration,
      error,
    } = req.body || {};

    let session = await SessionLog.findOne({ sessionId });
    if (!session) {
      session = await SessionLog.createSession(sessionId, flowType);
    }

    if (useCase && !session.logs?.some((entry) => entry?.category === 'session-init')) {
      session.addLog(`Session initialized for ${useCase}`, 'info', 'session-init', { flowType, useCase });
    }

    if (log?.message) {
      session.addLog(
        log.message,
        log.level || 'info',
        log.category || 'capture',
        log.details || null
      );
    }

    if (artifacts && typeof artifacts === 'object') {
      const currentArtifacts = session.artifacts || {};
      const mergeList = (currentList = [], nextList = []) =>
        Array.from(new Set([...(currentList || []), ...(nextList || [])].filter(Boolean)));

      session.artifacts = {
        ...currentArtifacts,
        ...artifacts,
        sourceVideoPaths: mergeList(currentArtifacts.sourceVideoPaths, artifacts.sourceVideoPaths),
        generatedImagePaths: mergeList(currentArtifacts.generatedImagePaths, artifacts.generatedImagePaths),
        videoSegmentPaths: mergeList(currentArtifacts.videoSegmentPaths, artifacts.videoSegmentPaths),
        audioPaths: mergeList(currentArtifacts.audioPaths, artifacts.audioPaths),
      };
    }

    if (analysis && typeof analysis === 'object') {
      session.analysis = {
        ...(session.analysis || {}),
        ...analysis,
      };
    }

    if (metricStage?.stage) {
      session.metrics = session.metrics || {};
      session.metrics.stages = session.metrics.stages || [];
      session.metrics.stages.push({
        stage: metricStage.stage,
        startTime: metricStage.startTime || undefined,
        endTime: metricStage.endTime || new Date(),
        duration: metricStage.duration || undefined,
        status: metricStage.status || 'completed',
      });
    }

    if (typeof totalDuration === 'number') {
      session.metrics = session.metrics || {};
      session.metrics.totalDuration = totalDuration;
    }

    if (error?.message) {
      session.error = {
        stage: error.stage || 'unknown',
        message: error.message,
        stack: error.stack || null,
        timestamp: error.timestamp || new Date(),
      };
      session.status = 'failed';
    } else if (status) {
      session.status = status;
    }

    session.flowType = flowType || session.flowType;
    session.updatedAt = new Date();
    await session.save();

    res.json({
      success: true,
      data: {
        sessionId: session.sessionId,
        flowType: session.flowType,
        status: session.status,
        updatedAt: session.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error capturing session state:', error);
    res.status(500).json({
      success: false,
      error: error.message,
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
