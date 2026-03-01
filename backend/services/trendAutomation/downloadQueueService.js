import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import TrendVideo from '../../models/TrendVideo.js';
import TrendJobLog from '../../models/TrendJobLog.js';
import TrendSetting from '../../models/TrendSetting.js';
import { buildDownloadPath } from './utils.js';

class TrendDownloadQueueService {
  constructor() {
    this.queue = [];
    this.running = 0;
    this.started = false;
  }

  async enqueue(videoId, priority = 5) {
    const existing = this.queue.find((item) => item.videoId === videoId);
    if (existing) return existing;

    const job = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      videoId,
      priority,
      attempts: 0,
      createdAt: new Date(),
    };

    this.queue.push(job);
    this.queue.sort((a, b) => a.priority - b.priority || a.createdAt - b.createdAt);
    this.kick();
    return job;
  }

  async kick() {
    if (this.started === false) return;

    const setting = await TrendSetting.getOrCreateDefault();
    const maxConcurrent = setting.maxConcurrentDownload || 3;

    while (this.running < maxConcurrent && this.queue.length > 0) {
      const job = this.queue.shift();
      this.running += 1;
      this.process(job).finally(() => {
        this.running -= 1;
        this.kick().catch((error) => console.error('Queue kick error:', error.message));
      });
    }
  }

  async process(job) {
    const startedAt = Date.now();
    const video = await TrendVideo.findById(job.videoId);
    if (!video) return;

    try {
      await TrendVideo.findByIdAndUpdate(video._id, { downloadStatus: 'downloading' });

      const relativeSavePath = buildDownloadPath(video);
      const absoluteSavePath = path.join(process.cwd(), relativeSavePath);
      fs.mkdirSync(path.dirname(absoluteSavePath), { recursive: true });

      await this.runYtDlp(video.url, absoluteSavePath);

      await TrendVideo.findByIdAndUpdate(video._id, {
        downloadStatus: 'done',
        localPath: relativeSavePath,
        downloadedAt: new Date(),
        failReason: '',
      });

      await TrendJobLog.create({
        jobType: 'download',
        status: 'success',
        platform: video.platform,
        topic: video.topic,
        itemsDownloaded: 1,
        duration: Date.now() - startedAt,
      });
    } catch (error) {
      job.attempts += 1;
      const canRetry = job.attempts < 3;

      await TrendVideo.findByIdAndUpdate(video._id, {
        downloadStatus: canRetry ? 'pending' : 'failed',
        failReason: error.message,
      });

      await TrendJobLog.create({
        jobType: 'download',
        status: canRetry ? 'partial' : 'failed',
        platform: video.platform,
        topic: video.topic,
        itemsDownloaded: 0,
        duration: Date.now() - startedAt,
        error: error.message,
      });

      if (canRetry) {
        this.queue.push(job);
      }
    }
  }

  runYtDlp(url, outputPath) {
    return new Promise((resolve, reject) => {
      const proc = spawn('yt-dlp', [
        url,
        '-f',
        'best[height<=1080]',
        '-o',
        outputPath,
        '--no-warnings',
        '--write-thumbnail',
        '--write-description',
      ]);

      let stderr = '';
      proc.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      proc.on('error', reject);
      proc.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(stderr || `yt-dlp exited with ${code}`));
        }
      });
    });
  }

  start() {
    this.started = true;
    this.kick().catch((error) => console.error('Queue startup failed:', error.message));
  }

  getStats() {
    return {
      queued: this.queue.length,
      running: this.running,
      started: this.started,
    };
  }
}

const trendDownloadQueueService = new TrendDownloadQueueService();

export default trendDownloadQueueService;
