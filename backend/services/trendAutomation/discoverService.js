import TrendSetting from '../../models/TrendSetting.js';
import TrendVideo from '../../models/TrendVideo.js';
import TrendChannel from '../../models/TrendChannel.js';
import TrendJobLog from '../../models/TrendJobLog.js';
import trendBrowserService from './browserService.js';
import trendDownloadQueueService from './downloadQueueService.js';
import { TOPICS, parseViews, extractFacebookReelId, extractYouTubeVideoId, matchTopic } from './utils.js';

class TrendDiscoverService {
  async discoverAll() {
    const startedAt = Date.now();
    const setting = await TrendSetting.getOrCreateDefault();
    if (!setting.isEnabled) return { skipped: true, reason: 'disabled' };

    let totalFound = 0;
    try {
      for (const topic of TOPICS) {
        totalFound += await this.discoverYouTubeSearch(topic, setting);
        totalFound += await this.discoverFacebookReels(topic, setting);
      }

      await TrendJobLog.create({
        jobType: 'discover',
        status: 'success',
        itemsFound: totalFound,
        duration: Date.now() - startedAt,
      });

      return { success: true, itemsFound: totalFound };
    } catch (error) {
      await TrendJobLog.create({
        jobType: 'discover',
        status: 'failed',
        itemsFound: totalFound,
        error: error.message,
        duration: Date.now() - startedAt,
      });
      throw error;
    }
  }

  async discoverYouTubeSearch(topic, setting) {
    const keywords = setting.keywords?.[topic] || [];
    const query = `${keywords[0] || topic} shorts`;
    const { page, context } = await trendBrowserService.getStealthPage();

    let found = 0;
    try {
      await page.goto(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIYAQ%253D%253D`, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });

      for (let i = 0; i < 6; i += 1) {
        await page.mouse.wheel(0, 1300);
        await page.waitForTimeout(1200 + Math.random() * 1000);
      }

      const cards = page.locator('ytd-video-renderer,ytd-reel-item-renderer');
      const count = await cards.count();

      for (let i = 0; i < Math.min(count, 25); i += 1) {
        const card = cards.nth(i);
        const title = await card.locator('#video-title, #video-title-link').first().innerText().catch(() => '');
        const href = await card.locator('a#thumbnail,a[href*="watch"],a[href*="/shorts/"]').first().getAttribute('href').catch(() => null);
        if (!href || !title) continue;

        const url = href.startsWith('http') ? href : `https://www.youtube.com${href}`;
        const videoId = extractYouTubeVideoId(url);

        const metaText = await card.innerText().catch(() => '');
        const views = parseViews(metaText);
        if (views < (setting.minViewsFilter || 100000)) continue;
        if (!matchTopic(title, topic, keywords)) continue;

        const channelName = await card.locator('ytd-channel-name a,#channel-name a').first().innerText().catch(() => 'Unknown channel');
        const channelId = channelName.toLowerCase().replace(/\s+/g, '-');
        const thumb = await card.locator('img').first().getAttribute('src').catch(() => '');

        await this.saveVideoAndChannel({
          platform: 'youtube', videoId, title, views, url, topic, thumbnail: thumb, channelName, channelId,
        });
        found += 1;
      }
    } finally {
      await page.close();
      await context.close();
    }

    return found;
  }

  async discoverFacebookReels(topic, setting) {
    const keywords = setting.keywords?.[topic] || [];
    const keyword = keywords[0] || topic;
    const { page, context } = await trendBrowserService.getStealthPage();
    let found = 0;

    try {
      await page.goto(`https://www.facebook.com/search/reels/?q=${encodeURIComponent(keyword)}`, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });

      for (let i = 0; i < 10; i += 1) {
        await page.mouse.wheel(0, 1100);
        await page.waitForTimeout(1500 + Math.random() * 1200);
      }

      const reels = page.locator('a[href*="/reel/"]');
      const count = await reels.count();

      for (let i = 0; i < Math.min(count, 20); i += 1) {
        const reelLink = reels.nth(i);
        const href = await reelLink.getAttribute('href').catch(() => null);
        if (!href) continue;

        const url = href.startsWith('http') ? href : `https://www.facebook.com${href}`;
        const videoId = extractFacebookReelId(url);
        const containerText = await reelLink.locator('xpath=ancestor::*[self::div or self::article][1]').innerText().catch(() => '');
        const views = parseViews(containerText);
        if (views < (setting.minViewsFilter || 100000)) continue;
        if (!matchTopic(containerText, topic, keywords)) continue;

        await this.saveVideoAndChannel({
          platform: 'facebook',
          videoId,
          title: containerText.slice(0, 120),
          views,
          url,
          topic,
          channelName: 'facebook-page',
          channelId: `fb-${videoId.slice(0, 8)}`,
          thumbnail: '',
        });
        found += 1;
      }
    } finally {
      await page.close();
      await context.close();
    }

    return found;
  }

  async saveVideoAndChannel(data) {
    const channel = await TrendChannel.findOneAndUpdate(
      { platform: data.platform, channelId: data.channelId || data.channelName },
      {
        $set: {
          name: data.channelName || data.channelId,
          platform: data.platform,
          channelId: data.channelId || data.channelName,
          isActive: true,
        },
        $addToSet: { topic: data.topic },
      },
      { upsert: true, new: true }
    );

    const result = await TrendVideo.updateOne(
      { platform: data.platform, videoId: data.videoId },
      {
        $setOnInsert: {
          discoveredAt: new Date(),
          downloadStatus: 'pending',
        },
        $set: {
          title: data.title,
          views: data.views,
          url: data.url,
          topic: data.topic,
          thumbnail: data.thumbnail || '',
          channel: channel._id,
        },
      },
      { upsert: true }
    );

    await TrendChannel.updateOne({ _id: channel._id }, { $inc: { totalVideos: 1 } });

    const shouldQueue = result.upsertedCount > 0 || result.modifiedCount > 0;
    if (shouldQueue) {
      const createdVideo = await TrendVideo.findOne({ platform: data.platform, videoId: data.videoId });
      if (createdVideo?.downloadStatus !== 'done') {
        await trendDownloadQueueService.enqueue(createdVideo._id, data.views > 1_000_000 ? 1 : 5);
      }
    }
  }
}

const trendDiscoverService = new TrendDiscoverService();

export default trendDiscoverService;
