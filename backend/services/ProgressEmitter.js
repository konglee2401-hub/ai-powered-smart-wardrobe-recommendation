/**
 * ProgressEmitter - Real-time generation progress tracking
 * Emits progress events via Socket.IO to frontend
 */
class ProgressEmitter {
  constructor(io) {
    this.io = io;
    this.sessionProgress = new Map();
  }

  /**
   * Initialize progress tracking for a session
   */
  initSession(sessionId, config = {}) {
    this.sessionProgress.set(sessionId, {
      sessionId,
      startTime: Date.now(),
      status: 'started',
      currentSegment: 0,
      totalSegments: config.totalSegments || 3,
      estimatedTotalTime: config.estimatedTotalTime || (3 * 120 + 30) * 1000, // 3 segments * 120s + 30s overhead
      phases: {},
      errors: []
    });
  }

  /**
   * Emit progress update to frontend
   */
  emitProgress(sessionId, update) {
    const progress = this.sessionProgress.get(sessionId);
    if (!progress) return;

    const elapsedSeconds = Math.floor((Date.now() - progress.startTime) / 1000);
    const remainingSeconds = Math.max(0, Math.floor((progress.estimatedTotalTime - (Date.now() - progress.startTime)) / 1000));
    const percentComplete = Math.min(100, Math.round((elapsedSeconds / (progress.estimatedTotalTime / 1000)) * 100));

    const progressData = {
      sessionId,
      status: update.status || progress.status,
      currentSegment: update.segment !== undefined ? update.segment : progress.currentSegment,
      totalSegments: progress.totalSegments,
      elapsedSeconds,
      remainingSeconds,
      estimatedRemainingSeconds: remainingSeconds,
      percentComplete,
      message: update.message || '',
      timestamp: Date.now()
    };

    // Update session progress
    Object.assign(progress, update);
    progress.status = update.status || progress.status;
    
    // Emit to specific session room
    if (this.io) {
      this.io.to(`video-generation-${sessionId}`).emit('video-generation-progress', progressData);
    }

    return progressData;
  }

  /**
   * Record phase timing
   */
  recordPhase(sessionId, phase, duration) {
    const progress = this.sessionProgress.get(sessionId);
    if (!progress) return;
    
    progress.phases[phase] = duration;
  }

  /**
   * Record error
   */
  recordError(sessionId, phase, error) {
    const progress = this.sessionProgress.get(sessionId);
    if (!progress) return;
    
    progress.errors.push({
      phase,
      message: error.message || String(error),
      timestamp: Date.now()
    });
  }

  /**
   * Get current progress for session
   */
  getProgress(sessionId) {
    return this.sessionProgress.get(sessionId);
  }

  /**
   * Complete progress tracking
   */
  completeSession(sessionId) {
    const progress = this.sessionProgress.get(sessionId);
    if (!progress) return null;

    const totalTime = Date.now() - progress.startTime;
    progress.status = 'completed';
    progress.totalTime = totalTime;
    progress.completedAt = Date.now();

    this.emitProgress(sessionId, {
      status: 'completed',
      message: 'Video generation completed successfully!',
      totalTime
    });

    // Clean up after 5 minutes
    setTimeout(() => {
      this.sessionProgress.delete(sessionId);
    }, 5 * 60 * 1000);

    return progress;
  }

  /**
   * Fail session
   */
  failSession(sessionId, error) {
    const progress = this.sessionProgress.get(sessionId);
    if (!progress) return null;

    progress.status = 'failed';
    progress.error = error.message || String(error);
    progress.failedAt = Date.now();

    this.emitProgress(sessionId, {
      status: 'failed',
      message: `Video generation failed: ${error.message}`
    });

    // Clean up after 5 minutes
    setTimeout(() => {
      this.sessionProgress.delete(sessionId);
    }, 5 * 60 * 1000);

    return progress;
  }
}

export default ProgressEmitter;
