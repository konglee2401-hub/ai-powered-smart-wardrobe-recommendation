import express from 'express';
import { protect } from '../middleware/auth.js';
import VideoGeneration from '../models/VideoGeneration.js';
import PromptSuggestor from '../services/PromptSuggestor.js';
import VideoSessionManager from '../services/VideoSessionManager.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();
const promptSuggestor = new PromptSuggestor();

/**
 * GET /api/v1/video/history
 * Get user's video generation history
 */
router.get('/history', protect, async (req, res) => {
  try {
    const { userId } = req.user;
    const { limit = 50, offset = 0, filter = 'all' } = req.query;

    const query = { userId };
    if (filter !== 'all') {
      query.status = filter;
    }

    const videos = await VideoGeneration.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .lean();

    const total = await VideoGeneration.countDocuments(query);

    res.json({
      videos,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

/**
 * GET /api/v1/video/:id
 * Get specific video generation details
 */
router.get('/:id', protect, async (req, res) => {
  try {
    const video = await VideoGeneration.findById(req.params.id);

    if (!video || video.userId.toString() !== req.user.userId) {
      return res.status(404).json({ error: 'Video not found' });
    }

    res.json(video);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch video' });
  }
});

/**
 * POST /api/v1/video/:id/feedback
 * Submit rating and feedback for a video
 */
router.post('/:id/feedback', protect, async (req, res) => {
  try {
    const { rating, notes } = req.body;

    const video = await VideoGeneration.findById(req.params.id);
    if (!video || video.userId.toString() !== req.user.userId) {
      return res.status(404).json({ error: 'Video not found' });
    }

    video.userRating = rating;
    video.userFeedback = notes;
    await video.save();

    res.json({ success: true, video });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

/**
 * DELETE /api/v1/video/:id
 * Delete a video generation and associated files
 */
router.delete('/:id', protect, async (req, res) => {
  try {
    const video = await VideoGeneration.findById(req.params.id);
    if (!video || video.userId.toString() !== req.user.userId) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Delete associated files
    if (video.segments && Array.isArray(video.segments)) {
      for (const segment of video.segments) {
        if (segment.videoUrl) {
          const filePath = path.join(process.cwd(), 'uploads', path.basename(segment.videoUrl));
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }
      }
    }

    if (video.composedVideoUrl) {
      const filePath = path.join(process.cwd(), 'uploads', path.basename(video.composedVideoUrl));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await VideoGeneration.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Video deleted' });
  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({ error: 'Failed to delete video' });
  }
});

/**
 * GET /api/v1/video/analytics
 * Get analytics data for dashboard
 */
router.get('/analytics', protect, async (req, res) => {
  try {
    const { userId } = req.user;

    const videos = await VideoGeneration.find({ userId }).lean();

    if (videos.length === 0) {
      return res.json({
        totalCount: 0,
        completedCount: 0,
        failedCount: 0,
        averageRating: 0,
        averageTimeSeconds: 0,
        successRate: 0,
        scenarioStats: {},
        timeline: []
      });
    }

    const completed = videos.filter(v => v.status === 'completed');
    const failed = videos.filter(v => v.status === 'failed');

    // Calculate metrics
    const totalMetricsMs = completed
      .filter(v => v.metrics && v.metrics.totalTimeMs)
      .reduce((sum, v) => sum + v.metrics.totalTimeMs, 0);
    const averageTimeMs = completed.length > 0 ? totalMetricsMs / completed.length : 0;

    const totalRating = completed
      .filter(v => v.userRating)
      .reduce((sum, v) => sum + v.userRating, 0);
    const averageRating = completed.length > 0 ? totalRating / completed.filter(v => v.userRating).length : 0;

    const successRate = (completed.length / videos.length) * 100;

    // Scenario stats
    const scenarioStats = {};
    videos.forEach(v => {
      if (v.scenario) {
        if (!scenarioStats[v.scenario]) {
          scenarioStats[v.scenario] = { count: 0, completed: 0 };
        }
        scenarioStats[v.scenario].count++;
        if (v.status === 'completed') {
          scenarioStats[v.scenario].completed++;
        }
      }
    });

    // Timeline (last 7 days)
    const timeline = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayVideos = videos.filter(v => {
        const vDate = new Date(v.createdAt).toISOString().split('T')[0];
        return vDate === dateStr;
      });

      timeline.push({
        date: dateStr,
        count: dayVideos.length,
        completed: dayVideos.filter(v => v.status === 'completed').length,
        failed: dayVideos.filter(v => v.status === 'failed').length
      });
    }

    res.json({
      totalCount: videos.length,
      completedCount: completed.length,
      failedCount: failed.length,
      averageRating: averageRating.toFixed(2),
      averageTimeSeconds: (averageTimeMs / 1000).toFixed(1),
      successRate: successRate.toFixed(1),
      scenarioStats,
      timeline
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

/**
 * POST /api/v1/prompt/suggestions
 * Get prompt improvement suggestions
 */
router.post('/suggestions', async (req, res) => {
  try {
    const { prompt, scenario, characterDescription } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const suggestions = await promptSuggestor.generateSuggestions(
      prompt,
      scenario || '',
      characterDescription || '',
      5
    );

    const validation = promptSuggestor.validatePrompt(prompt);

    res.json({ suggestions, validation });
  } catch (error) {
    console.error('Error generating suggestions:', error);
    res.status(500).json({ error: 'Failed to generate suggestions' });
  }
});

/**
 * POST /api/v1/video/extract-frame
 * Extract last frame from generated video
 */
router.post('/extract-frame', protect, async (req, res) => {
  try {
    const { sessionId, videoUrl, videoIndex, framePosition = 'last-frame' } = req.body;

    if (!sessionId || !videoUrl) {
      return res.status(400).json({ error: 'sessionId and videoUrl are required' });
    }

    const sessionManager = new VideoSessionManager(sessionId);
    const frameData = await sessionManager.extractLastFrame(videoUrl);

    res.json({ success: true, frame: frameData });
  } catch (error) {
    console.error('Error extracting frame:', error);
    res.status(500).json({ error: error.message || 'Failed to extract frame' });
  }
});

/**
 * GET /api/v1/video/session/:sessionId/frames
 * Get all extracted frames for a session
 */
router.get('/session/:sessionId/frames', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const sessionManager = new VideoSessionManager(sessionId);
    const frames = sessionManager.listExtractedFrames();

    res.json({ success: true, frames });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list frames' });
  }
});

/**
 * GET /api/v1/video/session/:sessionId/frame/:frameId/base64
 * Get extracted frame as base64 for use in next generation
 */
router.get('/session/:sessionId/frame/:frameId/base64', async (req, res) => {
  try {
    const { sessionId, frameId } = req.params;
    const sessionManager = new VideoSessionManager(sessionId);
    const frameData = sessionManager.getFrameAsBase64(frameId);

    res.json(frameData);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to get frame' });
  }
});

/**
 * GET /api/v1/video/frame/:frameId/thumbnail
 * Get thumbnail image of extracted frame
 */
router.get('/frame/:frameId/thumbnail', async (req, res) => {
  try {
    const { frameId } = req.params;
    // In real implementation, this would serve the actual frame file
    // For now, return a placeholder or the actual file if you store path info
    res.status(404).json({ error: 'Thumbnail not found' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get thumbnail' });
  }
});

/**
 * DELETE /api/v1/video/session/:sessionId/frame/:frameId
 * Delete an extracted frame
 */
router.delete('/session/:sessionId/frame/:frameId', async (req, res) => {
  try {
    const { sessionId, frameId } = req.params;
    const sessionManager = new VideoSessionManager(sessionId);
    const metadata = sessionManager.loadMetadata();

    // Remove frame from metadata
    metadata.extractedFrames = metadata.extractedFrames.filter(f => f.id !== frameId);
    sessionManager.saveMetadata(metadata);

    // Delete file if it exists
    const frameIndex = metadata.extractedFrames.findIndex(f => f.id === frameId);
    if (frameIndex >= 0) {
      const frame = metadata.extractedFrames[frameIndex];
      if (frame.path && fs.existsSync(frame.path)) {
        fs.unlinkSync(frame.path);
      }
    }

    res.json({ success: true, message: 'Frame deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete frame' });
  }
});

/**
 * GET /api/v1/video/session/:sessionId
 * Get session metadata and data
 */
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const sessionManager = new VideoSessionManager(sessionId);
    const metadata = sessionManager.loadMetadata();

    res.json({ success: true, session: metadata });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get session data' });
  }
});

/**
 * POST /api/v1/video/compose-segments
 * Compose multiple video segments into a single video
 */
router.post('/compose-segments', protect, async (req, res) => {
  try {
    const { videoUrls, outputFilename } = req.body;

    if (!videoUrls || !Array.isArray(videoUrls) || videoUrls.length === 0) {
      return res.status(400).json({ error: 'videoUrls array is required' });
    }

    // This would call FFmpeg to compose videos
    // Implementation depends on your FFmpeg setup in GrokServiceV2
    // For now, return a placeholder response
    res.json({
      success: true,
      message: 'Composition queued',
      composedUrl: `/uploads/composed-${Date.now()}.mp4`
    });
  } catch (error) {
    console.error('Error composing videos:', error);
    res.status(500).json({ error: 'Failed to compose videos' });
  }
});

export default router;
