import express from 'express';
import TrendChannel from '../models/TrendChannel.js';
import TrendVideo from '../models/TrendVideo.js';
import TrendJobLog from '../models/TrendJobLog.js';
import TrendSetting from '../models/TrendSetting.js';
import trendDiscoverService from '../services/trendAutomation/discoverService.js';
import trendChannelScanService from '../services/trendAutomation/channelScanService.js';
import trendDownloadQueueService from '../services/trendAutomation/downloadQueueService.js';
import trendSchedulerService from '../services/trendAutomation/schedulerService.js';

const router = express.Router();

router.get('/stats/overview', async (req, res) => {
  try {
    const [channels, videos, pending, failed, done, queueStats, recent] = await Promise.all([
      TrendChannel.countDocuments(),
      TrendVideo.countDocuments(),
      TrendVideo.countDocuments({ downloadStatus: 'pending' }),
      TrendVideo.countDocuments({ downloadStatus: 'failed' }),
      TrendVideo.countDocuments({ downloadStatus: 'done' }),
      Promise.resolve(trendDownloadQueueService.getStats()),
      TrendVideo.find().sort({ discoveredAt: -1 }).limit(10).lean(),
    ]);

    res.json({
      channels,
      videos,
      pending,
      failed,
      done,
      queue: queueStats,
      recent,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/channels', async (req, res) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const search = String(req.query.search || '').trim();

    const query = search
      ? { $or: [{ name: new RegExp(search, 'i') }, { channelId: new RegExp(search, 'i') }] }
      : {};

    const [items, total] = await Promise.all([
      TrendChannel.find(query).sort({ priority: -1, updatedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      TrendChannel.countDocuments(query),
    ]);

    res.json({ items, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/channels/:id/manual-scan', async (req, res) => {
  try {
    const channel = await TrendChannel.findById(req.params.id);
    if (!channel) return res.status(404).json({ error: 'Channel not found' });

    const result = await trendChannelScanService.scanSingleChannel(channel, await TrendSetting.getOrCreateDefault());
    channel.lastScanned = new Date();
    await channel.save();

    res.json({ success: true, itemsFound: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/videos', async (req, res) => {
  try {
    const { platform, topic, status, minViews, from, to } = req.query;
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);

    const query = {};
    if (platform) query.platform = platform;
    if (topic) query.topic = topic;
    if (status) query.downloadStatus = status;
    if (minViews) query.views = { $gte: Number(minViews) };
    if (from || to) {
      query.discoveredAt = {};
      if (from) query.discoveredAt.$gte = new Date(from);
      if (to) query.discoveredAt.$lte = new Date(to);
    }

    const [items, total] = await Promise.all([
      TrendVideo.find(query)
        .populate('channel', 'name channelId platform')
        .sort({ discoveredAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      TrendVideo.countDocuments(query),
    ]);

    res.json({ items, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/videos/:id/re-download', async (req, res) => {
  try {
    const video = await TrendVideo.findById(req.params.id);
    if (!video) return res.status(404).json({ error: 'Video not found' });

    video.downloadStatus = 'pending';
    video.failReason = '';
    await video.save();

    const job = await trendDownloadQueueService.enqueue(video._id, video.views > 1_000_000 ? 1 : 5);
    res.json({ success: true, job });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/logs', async (req, res) => {
  try {
    const { jobType, status, from, to } = req.query;
    const query = {};
    if (jobType) query.jobType = jobType;
    if (status) query.status = status;
    if (from || to) {
      query.ranAt = {};
      if (from) query.ranAt.$gte = new Date(from);
      if (to) query.ranAt.$lte = new Date(to);
    }

    const items = await TrendJobLog.find(query).sort({ ranAt: -1 }).limit(200).lean();
    res.json({ items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/settings', async (req, res) => {
  try {
    const payload = req.body || {};
    const setting = await TrendSetting.findOneAndUpdate(
      { key: 'default' },
      {
        $set: {
          keywords: payload.keywords,
          cronTimes: payload.cronTimes,
          maxConcurrentDownload: payload.maxConcurrentDownload,
          minViewsFilter: payload.minViewsFilter,
          proxyList: payload.proxyList,
          telegramBotToken: payload.telegramBotToken,
          isEnabled: payload.isEnabled,
        },
      },
      { new: true, upsert: true }
    );

    await trendSchedulerService.reload();
    res.json(setting);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/settings', async (req, res) => {
  const setting = await TrendSetting.getOrCreateDefault();
  res.json(setting);
});

router.post('/jobs/trigger', async (req, res) => {
  try {
    const type = req.query.type;
    if (type === 'discover') {
      const result = await trendDiscoverService.discoverAll();
      return res.json(result);
    }

    if (type === 'scan') {
      const result = await trendChannelScanService.scanAllChannels();
      return res.json(result);
    }

    return res.status(400).json({ error: 'Invalid type. Use discover or scan.' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
