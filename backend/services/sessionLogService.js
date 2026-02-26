import SessionLog from '../models/SessionLog.js';

/**
 * SessionLogService - Centralized logging system for 1-click flow
 * Logs all events to database instead of console
 */
class SessionLogService {
  constructor(sessionId, flowType = 'one-click') {
    this.sessionId = sessionId;
    this.flowType = flowType;
    this.sessionLog = null;
    this.startTime = Date.now();
    this.stageStartTime = null;
    this.currentStage = null;
  }

  // Initialize session log  
  async init() {
    try {
      console.log(`[LOGGER] Initializing session log for ${this.sessionId}...`);
      this.sessionLog = await SessionLog.createSession(this.sessionId, this.flowType);
      
      if (!this.sessionLog) {
        console.error(`[LOGGER] ❌ SessionLog.createSession returned null for ${this.sessionId}`);
        throw new Error('createSession returned null');
      }
      
      console.log(`[LOGGER] ✅ Session log initialized successfully for ${this.sessionId}`);
      return this.sessionLog;
    } catch (error) {
      console.error(`[LOGGER] ❌ Failed to initialize session log: ${error.message}`);
      console.error(`[LOGGER]    Stack: ${error.stack}`);
      // Create fallback in-memory log
      this.sessionLog = {
        sessionId: this.sessionId,
        flowType: this.flowType,
        logs: [],
        addLog: (msg, level, cat, details) => {
          this.sessionLog.logs.push({ timestamp: new Date(), level, category: cat, message: msg, details });
        },
        save: async () => {
          console.warn(`[LOGGER] ⚠️ Fallback save called - logs not persisting to MongoDB`);
        }
      };
      return null;
    }
  }

  // Add log entry
  async log(message, level = 'info', category = 'general', details = null) {
    if (!this.sessionLog) {
      console.log(`[${this.sessionId}] ${level.toUpperCase()} - ${message}`); // Fallback to console
      return;
    }

    try {
      this.sessionLog.addLog(message, level, category, details);
      console.log(`[LOGGER] 📝 Log added to memory (${this.sessionLog.logs?.length} total)`);
      
      console.log(`[LOGGER] 💾 Saving to MongoDB...`);
      await this.sessionLog.save();
      console.log(`[LOGGER] ✅ Saved to MongoDB`);
      
      // Also log critical info to console
      if (level !== 'debug') {
        const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '✓';
        console.log(`[${category}] ${prefix} ${message}`);
      }
    } catch (saveError) {
      console.error(`[LOGGER] ❌ Failed to save log entry to MongoDB: ${saveError.message}`);
      console.error(`[LOGGER]    Error details:`, saveError);
      // Still log to console as fallback
      console.log(`[${category}] ERROR - ${message}`);
    }
  }

  // Convenience methods
  async info(message, category = 'general', details = null) {
    await this.log(message, 'info', category, details);
  }

  async warn(message, category = 'general', details = null) {
    await this.log(message, 'warn', category, details);
  }

  async error(message, category = 'error', details = null) {
    await this.log(message, 'error', category, details);
  }

  async debug(message, category = 'debug', details = null) {
    // Only log debug in development
    if (process.env.NODE_ENV !== 'production') {
      await this.log(message, 'debug', category, details);
    }
  }

  // Stage tracking
  async startStage(stageName) {
    this.currentStage = stageName;
    this.stageStartTime = Date.now();
    await this.info(`Starting: ${stageName}`, 'stage');
  }

  async endStage(stageName, success = true) {
    if (!this.sessionLog) return;

    try {
      const duration = Date.now() - (this.stageStartTime || Date.now());
      
      if (!this.sessionLog.metrics) {
        this.sessionLog.metrics = { stages: [] };
      }

      this.sessionLog.metrics.stages.push({
        stage: stageName,
        startTime: new Date(this.stageStartTime),
        endTime: new Date(),
        duration,
        status: success ? 'completed' : 'failed'
      });

      const msg = success 
        ? `Completed: ${stageName} (${(duration / 1000).toFixed(1)}s)`
        : `Failed: ${stageName}`;
      
      await this.info(msg, 'stage');
      
      console.log(`[LOGGER] 💾 Saving metrics to MongoDB...`);
      await this.sessionLog.save();
      console.log(`[LOGGER] ✅ Metrics saved`);
    } catch (error) {
      console.error(`[LOGGER] ❌ Failed to endStage: ${error.message}`);
    }
  }

  // Store artifacts
  async storeArtifacts(artifacts) {
    if (!this.sessionLog) return;
    
    this.sessionLog.artifacts = {
      ...this.sessionLog.artifacts,
      ...artifacts
    };
    await this.sessionLog.save();
  }

  // Store analysis results
  async storeAnalysis(analysisData) {
    if (!this.sessionLog) return;
    
    this.sessionLog.analysis = analysisData;
    await this.sessionLog.save();
  }

  // Mark completion
  async markCompleted() {
    if (!this.sessionLog) return;
    
    const totalDuration = Date.now() - this.startTime;
    this.sessionLog.metrics = this.sessionLog.metrics || {};
    this.sessionLog.metrics.totalDuration = totalDuration;
    
    this.sessionLog.markCompleted();
    await this.sessionLog.save();
    
    await this.info(`Session completed (${(totalDuration / 1000).toFixed(1)}s)`, 'session');
  }

  // Mark failed
  async markFailed(reason) {
    if (!this.sessionLog) return;
    
    this.sessionLog.markFailed(reason);
    await this.sessionLog.save();
    
    await this.error(`Session failed: ${reason}`, 'session');
  }

  // Get full log
  async getLog() {
    return await SessionLog.getSessionLogs(this.sessionId);
  }

  // Export log summary
  async exportSummary() {
    const log = await this.getLog();
    if (!log) return null;

    return {
      sessionId: this.sessionId,
      flowType: this.flowType,
      status: log.status,
      createdAt: log.createdAt,
      updatedAt: log.updatedAt,
      totalDuration: log.metrics?.totalDuration,
      stages: log.metrics?.stages,
      artifacts: log.artifacts,
      analysis: log.analysis,
      error: log.error,
      logCount: log.logs?.length || 0
    };
  }
}

export default SessionLogService;
