/**
 * Cron Job Service
 * - Schedule video generation and upload jobs
 * - Manage cron schedules for each platform
 * - Handle job execution and error recovery
 * - Track job history and statistics
 */

import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mediaDir = path.join(__dirname, '../media');
const cronDir = path.join(mediaDir, 'cron');

class CronJobService {
  constructor() {
    this.ensureDirectories();
    this.jobsFile = path.join(cronDir, 'jobs.json');
    this.historyFile = path.join(cronDir, 'job-history.json');
    this.runningJobs = new Map();
    this.loadJobs();
  }

  ensureDirectories() {
    if (!fs.existsSync(cronDir)) {
      fs.mkdirSync(cronDir, { recursive: true });
    }
  }

  /**
   * Load jobs from file
   */
  loadJobs() {
    try {
      if (fs.existsSync(this.jobsFile)) {
        const data = fs.readFileSync(this.jobsFile, 'utf8');
        this.jobs = JSON.parse(data);
      } else {
        this.jobs = [];
        this.saveJobs();
      }
    } catch (error) {
      console.error('Error loading jobs:', error);
      this.jobs = [];
    }
  }

  /**
   * Save jobs to file
   */
  saveJobs() {
    try {
      fs.writeFileSync(this.jobsFile, JSON.stringify(this.jobs, null, 2));
    } catch (error) {
      console.error('Error saving jobs:', error);
    }
  }

  /**
   * Create scheduled job
   */
  createJob(config) {
    try {
      const {
        name,
        description = '',
        schedule, // Cron expression: '0 * * * *' (every hour), '0 0 * * *' (daily)
        jobType = 'generate', // generate, upload, cleanup, analyze
        platform = 'all', // tiktok, youtube, facebook, all
        contentType = 'product_promo', // product_promo, hot_mashup, mixed
        handler, // Function that executes the job
        enabled = true,
        metadata = {}
      } = config;

      if (!name || !schedule) {
        return { success: false, error: 'Name and schedule are required' };
      }

      // Validate cron expression
      if (!this.isValidCronExpression(schedule)) {
        return { success: false, error: 'Invalid cron expression' };
      }

      const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const job = {
        jobId,
        name,
        description,
        schedule,
        jobType,
        platform,
        contentType,
        enabled,
        createdAt: new Date().toISOString(),
        lastRun: null,
        nextRun: this.getNextRun(schedule),
        totalRuns: 0,
        successfulRuns: 0,
        failedRuns: 0,
        averageDuration: 0,
        metadata
      };

      this.jobs.push(job);
      this.saveJobs();

      // Schedule the job if enabled
      if (enabled && handler) {
        this.scheduleJobExecution(jobId, schedule, handler);
      }

      return {
        success: true,
        jobId,
        job,
        message: 'Job created successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Schedule job execution
   */
  scheduleJobExecution(jobId, schedule, handler) {
    try {
      // Stop existing job if running
      if (this.runningJobs.has(jobId)) {
        const existing = this.runningJobs.get(jobId);
        existing.stop();
      }

      // Create new cron job
      const cronJob = cron.schedule(schedule, async () => {
        await this.executeJob(jobId, handler);
      });

      this.runningJobs.set(jobId, cronJob);

      return {
        success: true,
        jobId,
        message: 'Job scheduled successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Execute job
   */
  async executeJob(jobId, handler) {
    try {
      const job = this.jobs.find(j => j.jobId === jobId);
      if (!job) {
        return { success: false, error: `Job not found: ${jobId}` };
      }

      const startTime = Date.now();
      let result = { success: true };

      // Execute handler
      if (typeof handler === 'function') {
        try {
          result = await handler(job);
        } catch (error) {
          result = { success: false, error: error.message };
        }
      }

      const duration = Date.now() - startTime;

      // Update job stats
      job.lastRun = new Date().toISOString();
      job.nextRun = this.getNextRun(job.schedule);
      job.totalRuns++;

      if (result.success) {
        job.successfulRuns++;
      } else {
        job.failedRuns++;
      }

      // Update average duration
      if (job.totalRuns > 0) {
        job.averageDuration = Math.round(
          (job.averageDuration * (job.totalRuns - 1) + duration) / job.totalRuns
        );
      }

      this.saveJobs();

      // Record history
      this.recordHistory({
        jobId,
        name: job.name,
        jobType: job.jobType,
        status: result.success ? 'success' : 'error',
        error: result.error || null,
        duration,
        output: result.output || null,
        timestamp: new Date().toISOString()
      });

      return {
        success: result.success,
        jobId,
        duration,
        output: result.output
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate cron expression
   */
  isValidCronExpression(expression) {
    try {
      cron.validate(expression);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get next run time for cron expression
   */
  getNextRun(cronExpression) {
    try {
      // Parse cron parts: minute hour day month dayOfWeek
      const parts = cronExpression.trim().split(/\s+/);
      if (parts.length < 5) return null;

      // Simple next run calculation (returns approximate time)
      const now = new Date();
      const next = new Date(now);

      // For simplicity, assume max 1 hour ahead for next minute-based jobs
      if (parts[0] !== '*') {
        next.setMinutes(parseInt(parts[0]) || 0);
        next.setSeconds(0);
        if (next <= now) {
          next.setHours(next.getHours() + 1);
        }
      } else if (parts[1] !== '*') {
        next.setMinutes(0);
        next.setSeconds(0);
        next.setHours(parseInt(parts[1]) || 0);
        if (next <= now) {
          next.setDate(next.getDate() + 1);
        }
      } else {
        next.setDate(next.getDate() + 1);
        next.setHours(0);
        next.setMinutes(0);
        next.setSeconds(0);
      }

      return next.toISOString();
    } catch (error) {
      return null;
    }
  }

  /**
   * Update job
   */
  updateJob(jobId, config) {
    try {
      const job = this.jobs.find(j => j.jobId === jobId);
      if (!job) {
        return { success: false, error: `Job not found: ${jobId}` };
      }

      const {
        name = job.name,
        description = job.description,
        schedule = job.schedule,
        jobType = job.jobType,
        platform = job.platform,
        contentType = job.contentType,
        enabled = job.enabled,
        metadata = job.metadata
      } = config;

      // Validate new schedule if provided
      if (schedule !== job.schedule && !this.isValidCronExpression(schedule)) {
        return { success: false, error: 'Invalid cron expression' };
      }

      // Update job
      job.name = name;
      job.description = description;
      job.schedule = schedule;
      job.jobType = jobType;
      job.platform = platform;
      job.contentType = contentType;
      job.enabled = enabled;
      job.metadata = metadata;
      job.nextRun = this.getNextRun(schedule);

      this.saveJobs();

      return {
        success: true,
        jobId,
        job,
        message: 'Job updated successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Enable job
   */
  enableJob(jobId, handler) {
    try {
      const job = this.jobs.find(j => j.jobId === jobId);
      if (!job) {
        return { success: false, error: `Job not found: ${jobId}` };
      }

      job.enabled = true;
      this.saveJobs();

      if (handler) {
        this.scheduleJobExecution(jobId, job.schedule, handler);
      }

      return {
        success: true,
        jobId,
        message: 'Job enabled successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Disable job
   */
  disableJob(jobId) {
    try {
      const job = this.jobs.find(j => j.jobId === jobId);
      if (!job) {
        return { success: false, error: `Job not found: ${jobId}` };
      }

      job.enabled = false;
      this.saveJobs();

      // Stop running job if exists
      if (this.runningJobs.has(jobId)) {
        const cronJob = this.runningJobs.get(jobId);
        cronJob.stop();
        this.runningJobs.delete(jobId);
      }

      return {
        success: true,
        jobId,
        message: 'Job disabled successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get job by ID
   */
  getJob(jobId) {
    try {
      const job = this.jobs.find(j => j.jobId === jobId);
      if (!job) {
        return { success: false, error: `Job not found: ${jobId}` };
      }

      return {
        success: true,
        job
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get all jobs
   */
  getAllJobs(filter = {}) {
    try {
      const { jobType = null, platform = null, enabled = null } = filter;

      let jobs = [...this.jobs];

      if (jobType) {
        jobs = jobs.filter(j => j.jobType === jobType);
      }

      if (platform) {
        jobs = jobs.filter(j => j.platform === platform || j.platform === 'all');
      }

      if (enabled !== null) {
        jobs = jobs.filter(j => j.enabled === enabled);
      }

      return {
        success: true,
        jobs,
        count: jobs.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete job
   */
  deleteJob(jobId) {
    try {
      const index = this.jobs.findIndex(j => j.jobId === jobId);
      if (index === -1) {
        return { success: false, error: `Job not found: ${jobId}` };
      }

      const job = this.jobs[index];
      this.jobs.splice(index, 1);
      this.saveJobs();

      // Stop running job if exists
      if (this.runningJobs.has(jobId)) {
        const cronJob = this.runningJobs.get(jobId);
        cronJob.stop();
        this.runningJobs.delete(jobId);
      }

      return {
        success: true,
        jobId,
        deletedJob: job,
        message: 'Job deleted successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get job history
   */
  getJobHistory(jobId = null, limit = 100) {
    try {
      if (!fs.existsSync(this.historyFile)) {
        return { success: true, history: [] };
      }

      const data = fs.readFileSync(this.historyFile, 'utf8');
      let history = JSON.parse(data);

      if (jobId) {
        history = history.filter(h => h.jobId === jobId);
      }

      // Return most recent
      history = history.slice(-limit).reverse();

      return {
        success: true,
        history,
        count: history.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Record job execution in history
   */
  recordHistory(entry) {
    try {
      let history = [];
      if (fs.existsSync(this.historyFile)) {
        const data = fs.readFileSync(this.historyFile, 'utf8');
        history = JSON.parse(data);
      }

      history.push(entry);

      // Keep only last 50000 entries
      if (history.length > 50000) {
        history = history.slice(-50000);
      }

      fs.writeFileSync(this.historyFile, JSON.stringify(history, null, 2));

      return { success: true };
    } catch (error) {
      console.error('Error recording history:', error);
      return { success: false };
    }
  }

  /**
   * Get job statistics
   */
  getJobStatistics(jobId = null) {
    try {
      let jobs = jobId ? [this.jobs.find(j => j.jobId === jobId)] : this.jobs;
      jobs = jobs.filter(j => j !== undefined);

      const stats = {
        totalJobs: jobs.length,
        enabledJobs: jobs.filter(j => j.enabled).length,
        disabledJobs: jobs.filter(j => !j.enabled).length,
        byType: {
          generate: jobs.filter(j => j.jobType === 'generate').length,
          upload: jobs.filter(j => j.jobType === 'upload').length,
          cleanup: jobs.filter(j => j.jobType === 'cleanup').length,
          analyze: jobs.filter(j => j.jobType === 'analyze').length
        },
        totalRuns: 0,
        totalSuccessful: 0,
        totalFailed: 0,
        successRate: 0,
        averageDuration: 0,
        nextScheduledJobs: []
      };

      jobs.forEach(job => {
        stats.totalRuns += job.totalRuns;
        stats.totalSuccessful += job.successfulRuns;
        stats.totalFailed += job.failedRuns;
      });

      if (stats.totalRuns > 0) {
        stats.successRate = Math.round((stats.totalSuccessful / stats.totalRuns) * 100);
      }

      const totalDuration = jobs.reduce((sum, j) => sum + j.averageDuration, 0);
      stats.averageDuration = jobs.length > 0 ? Math.round(totalDuration / jobs.length) : 0;

      // Get next scheduled jobs
      const upcoming = jobs
        .filter(j => j.enabled && j.nextRun)
        .sort((a, b) => new Date(a.nextRun) - new Date(b.nextRun))
        .slice(0, 5);

      stats.nextScheduledJobs = upcoming;

      return {
        success: true,
        stats
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Run job immediately (ignore schedule)
   */
  async runJobNow(jobId, handler) {
    try {
      const result = await this.executeJob(jobId, handler);

      return {
        success: result.success,
        jobId,
        result
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get running jobs info
   */
  getRunningJobs() {
    try {
      const running = Array.from(this.runningJobs.keys()).map(jobId => {
        const job = this.jobs.find(j => j.jobId === jobId);
        return {
          jobId,
          name: job?.name || 'Unknown',
          enabled: job?.enabled || false,
          lastRun: job?.lastRun || null,
          nextRun: job?.nextRun || null
        };
      });

      return {
        success: true,
        running,
        count: running.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Stop all jobs
   */
  stopAllJobs() {
    try {
      let stopped = 0;

      this.runningJobs.forEach((cronJob, jobId) => {
        cronJob.stop();
        this.runningJobs.delete(jobId);
        stopped++;
      });

      return {
        success: true,
        stopped,
        message: `Stopped ${stopped} jobs`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Clean up old history
   */
  cleanupHistory(daysOld = 30) {
    try {
      if (!fs.existsSync(this.historyFile)) {
        return { success: true, deleted: 0 };
      }

      const data = fs.readFileSync(this.historyFile, 'utf8');
      let history = JSON.parse(data);

      const before = history.length;
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

      history = history.filter(h => new Date(h.timestamp) >= cutoffDate);

      const deleted = before - history.length;
      fs.writeFileSync(this.historyFile, JSON.stringify(history, null, 2));

      return {
        success: true,
        deleted,
        message: `Cleaned up ${deleted} old history entries`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new CronJobService();
