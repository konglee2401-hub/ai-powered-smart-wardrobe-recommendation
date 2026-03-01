import TrendChannel from '../../models/TrendChannel.js';
import TrendVideo from '../../models/TrendVideo.js';
import TrendJobLog from '../../models/TrendJobLog.js';
import TrendSetting from '../../models/TrendSetting.js';
import trendBrowserService from './browserService.js';
import trendDownloadQueueService from './downloadQueueService.js';
import { extractFacebookReelId, extractYouTubeVideoId, parseViews } from './utils.js';

class TrendChannelScanService {
  async scanAllChannels() {
    const startedAt = Date.now();
    const setting = await TrendSetting.getOrCreateDefault();
    if (!setting.isEnabled) return { skipped: true };

    const channels = await TrendChannel.find({ isActive: true }).sort({ priority: -1 }).limit(100);
    let found = 0;

    try {
      for (const channel of channels) {
        found += await this.scanSingleChannel(channel, setting);
        channel.lastScanned = new Date();
        await channel.save();
      }

      await TrendJobLog.create({
        jobType: 'scan-channel',
        status: 'success',
        itemsFound: found,
        duration: Date.now() - startedAt,
      });

      return { success: true, channels: channels.length, itemsFound: found };
    } catch (error) {
      await TrendJobLog.create({
        jobType: 'scan-channel',
        status: 'failed',
        itemsFound: found,
        duration: Date.now() - startedAt,
        error: error.message,
      });
      throw error;
    }
  }

  async scanSingleChannel(channel, setting) {
    const { page, context } = await trendBrowserService.getStealthPage();
    let found = 0;

    try {
      const url = channel.platform === 'youtube'
        ? `https://www.youtube.com/@${channel.channelId.replace('@', '')}/shorts`
        : `https://www.facebook.com/${channel.channelId}/reels`;

      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      for (let i = 0; i < 8; i += 1) {
        await page.mouse.wheel(0, 1200);
        await page.waitForTimeout(1000 + Math.random() * 1000);
      }

      const links = channel.platform === 'youtube'
        ? page.locator('a[href*="/shorts/"]')
        : page.locator('a[href*="/reel/"]');
      const count = await links.count();

      for (let i = 0; i < Math.min(count, 20); i += 1) {
        const href = await links.nth(i).getAttribute('href').catch(() => null);
        if (!href) continue;

        const fullUrl = href.startsWith('http') ? href : `${channel.platform === 'youtube' ? 'https://www.youtube.com' : 'https://www.facebook.com'}${href}`;
        const videoId = channel.platform === 'youtube' ? extractYouTubeVideoId(fullUrl) : extractFacebookReelId(fullUrl);

        const exists = await TrendVideo.findOne({ platform: channel.platform, videoId });
        if (exists?.downloadStatus === 'done') continue;

        const text = await links.nth(i).innerText().catch(() => '');
        const views = parseViews(text);

        const created = await TrendVideo.findOneAndUpdate(
          { platform: channel.platform, videoId },
          {
            $setOnInsert: {
              title: text || `${channel.name} reel`,
              views,
              url: fullUrl,
              topic: channel.topic?.[0] || 'hai',
              discoveredAt: new Date(),
              downloadStatus: 'pending',
              channel: channel._id,
            },
          },
          { upsert: true, new: true }
        );

        if (created) {
          const isFresh = !channel.lastScanned || created.discoveredAt > channel.lastScanned;
          if (isFresh && created.views >= (setting.minViewsFilter || 100000)) {
            await trendDownloadQueueService.enqueue(created._id, created.views > 1_000_000 ? 1 : 5);
            found += 1;
          }
        }
      }
    } finally {
      await page.close();
      await context.close();
    }

    return found;
  }
}

const trendChannelScanService = new TrendChannelScanService();

export default trendChannelScanService;
