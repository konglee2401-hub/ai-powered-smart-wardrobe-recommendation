/**
 * VideoGenerationMetrics - Collect and analyze video generation metrics
 */
class VideoGenerationMetrics {
  constructor() {
    this.data = {
      startTime: Date.now(),
      phases: {},
      phaseTimings: [],
      errors: [],
      retryAttempts: 0,
      metadata: {},
      checkpoints: []
    };
  }

  /**
   * Record a phase start/end
   */
  startPhase(phase) {
    this.data.phases[phase] = {
      name: phase,
      startTime: Date.now(),
      endTime: null,
      duration: null,
      success: null,
      retries: 0,
      errors: []
    };
  }

  /**
   * End a phase
   */
  endPhase(phase, success = true, error = null) {
    if (!this.data.phases[phase]) {
      this.startPhase(phase);
    }

    const phaseData = this.data.phases[phase];
    phaseData.endTime = Date.now();
    phaseData.duration = phaseData.endTime - phaseData.startTime;
    phaseData.success = success;

    if (error) {
      phaseData.errors.push({
        message: error.message || String(error),
        timestamp: Date.now()
      });
    }

    this.data.phaseTimings.push({
      phase,
      duration: phaseData.duration,
      timestamp: phaseData.endTime
    });
  }

  /**
   * Record a retry for a phase
   */
  recordRetry(phase, attempt = 1) {
    if (this.data.phases[phase]) {
      this.data.phases[phase].retries = attempt;
    }
    this.data.retryAttempts++;
  }

  /**
   * Record an error
   */
  recordError(phase, error) {
    this.data.errors.push({
      phase,
      message: error.message || String(error),
      timestamp: Date.now(),
      stack: error.stack || ''
    });

    if (this.data.phases[phase]) {
      this.data.phases[phase].errors.push({
        message: error.message || String(error),
        timestamp: Date.now()
      });
    }
  }

  /**
   * Record a checkpoint
   */
  recordCheckpoint(name, data = {}) {
    this.data.checkpoints.push({
      name,
      time: Date.now(),
      elapsed: Date.now() - this.data.startTime,
      data
    });
  }

  /**
   * Set metadata
   */
  setMetadata(key, value) {
    this.data.metadata[key] = value;
  }

  /**
   * Get complete report
   */
  getReport() {
    const totalTime = Date.now() - this.data.startTime;
    const phaseSummary = {};
    const phaseOrder = [];
    let totalPhaseTime = 0;

    for (const [phase, phaseData] of Object.entries(this.data.phases)) {
      phaseSummary[phase] = {
        duration: phaseData.duration || 0,
        success: phaseData.success,
        retries: phaseData.retries,
        errors: phaseData.errors.length
      };
      phaseOrder.push({ phase, duration: phaseData.duration || 0 });
      totalPhaseTime += phaseData.duration || 0;
    }

    // Sort phases by duration to find bottleneck
    phaseOrder.sort((a, b) => b.duration - a.duration);
    const bottleneck = phaseOrder[0];

    const successRate = this.data.errors.length === 0 ? 100 : 
      Math.max(0, 100 - (this.data.errors.length * 20)); // 20% penalty per error

    return {
      totalTime,
      totalPhaseTime,
      phases: phaseSummary,
      phaseSequence: phaseOrder.map(p => `${p.phase}(${p.duration}ms)`).join(' → '),
      bottleneck: bottleneck ? {
        phase: bottleneck.phase,
        duration: bottleneck.duration,
        percentage: ((bottleneck.duration / totalPhaseTime) * 100).toFixed(1) + '%'
      } : null,
      errorCount: this.data.errors.length,
      errors: this.data.errors,
      retryAttempts: this.data.retryAttempts,
      successRate: Math.max(0, Math.min(100, successRate)),
      checkpoints: this.data.checkpoints,
      metadata: this.data.metadata,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get JSON for storage
   */
  toJSON() {
    return {
      ...this.getReport(),
      rawPhases: this.data.phases,
      rawErrors: this.data.errors
    };
  }

  /**
   * Log summary to console
   */
  logSummary() {
    const report = this.getReport();
    console.log('\n📊 Video Generation Metrics:');
    console.log(`Total Time: ${(report.totalTime / 1000).toFixed(2)}s`);
    console.log(`Total Phase Time: ${(report.totalPhaseTime / 1000).toFixed(2)}s`);
    console.log(`Success Rate: ${report.successRate.toFixed(1)}%`);
    console.log(`Errors: ${report.errorCount}`);
    console.log(`Retries: ${report.retryAttempts}`);
    
    if (report.bottleneck) {
      console.log(`Bottleneck: ${report.bottleneck.phase} (${report.bottleneck.duration}ms, ${report.bottleneck.percentage})`);
    }
    
    console.log('\nPhase Breakdown:');
    for (const [phase, data] of Object.entries(report.phases)) {
      const status = data.success ? '✅' : '❌';
      console.log(`  ${status} ${phase}: ${data.duration}ms (${data.retries} retries)`);
    }
    console.log('');
  }
}

export default VideoGenerationMetrics;
