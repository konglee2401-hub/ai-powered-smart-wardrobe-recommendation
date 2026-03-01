import cron from 'node-cron';
import TrendSetting from '../../models/TrendSetting.js';
import trendDiscoverService from './discoverService.js';
import trendChannelScanService from './channelScanService.js';
import trendDownloadQueueService from './downloadQueueService.js';

class TrendSchedulerService {
  constructor() {
    this.discoverTask = null;
    this.scanTask = null;
    this.started = false;
  }

  async start() {
    if (this.started) return;

    const setting = await TrendSetting.getOrCreateDefault();
    trendDownloadQueueService.start();

    this.discoverTask = cron.schedule(setting.cronTimes.discover || '0 7 * * *', async () => {
      await trendDiscoverService.discoverAll();
    });

    this.scanTask = cron.schedule(setting.cronTimes.scan || '30 8 * * *', async () => {
      await trendChannelScanService.scanAllChannels();
    });

    this.started = true;
  }

  async reload() {
    if (this.discoverTask) this.discoverTask.stop();
    if (this.scanTask) this.scanTask.stop();
    this.started = false;
    await this.start();
  }
}

const trendSchedulerService = new TrendSchedulerService();

export default trendSchedulerService;
