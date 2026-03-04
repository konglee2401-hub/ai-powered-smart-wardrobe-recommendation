import express from 'express';
import axios from 'axios';
import TrendSetting from '../models/TrendSetting.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
const PY_SERVICE_BASE = process.env.TREND_AUTOMATION_PY_URL || 'http://localhost:8001';

async function proxy(req, res, path) {
  try {
    const response = await axios({
      method: req.method,
      url: `${PY_SERVICE_BASE}${path}`,
      params: req.query,
      data: req.body,
      timeout: 120000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return res.status(response.status).json(response.data);
  } catch (error) {
    const status = error.response?.status || 502;
    return res.status(status).json({
      error: error.response?.data?.error || error.message || 'Python trend automation service unavailable',
      source: 'python-trend-service',
      upstream: PY_SERVICE_BASE,
    });
  }
}

// Playboard Metadata API - returns categories, countries, dimensions, periods
router.get('/playboard/metadata', async (req, res) => {
  try {
    const metadata = TrendSetting.getPlayboardMetadata();
    res.json({
      success: true,
      ...metadata,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get playboard configs from DB
router.get('/playboard/configs', async (req, res) => {
  try {
    const setting = await TrendSetting.getOrCreateDefault();
    res.json({
      success: true,
      configs: setting.playboardConfigs || [],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Update playboard configs
router.post('/playboard/configs', protect, async (req, res) => {
  try {
    const { configs } = req.body;
    const setting = await TrendSetting.getOrCreateDefault();
    setting.playboardConfigs = configs;
    await setting.save();

    // Sync to Python service
    try {
      await axios.post(`${PY_SERVICE_BASE}/api/shorts-reels/settings`, {
        playboardConfigs: configs,
      }, { timeout: 10000 });
    } catch (syncError) {
      console.warn('Failed to sync playboard configs to Python service:', syncError.message);
    }

    res.json({
      success: true,
      configs: setting.playboardConfigs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Add new playboard config
router.post('/playboard/configs/add', protect, async (req, res) => {
  try {
    const config = req.body;
    const setting = await TrendSetting.getOrCreateDefault();

    if (!setting.playboardConfigs) {
      setting.playboardConfigs = [];
    }

    setting.playboardConfigs.push(config);
    await setting.save();

    res.json({
      success: true,
      configs: setting.playboardConfigs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Manual discover Playboard with filters
router.post('/playboard/manual-discover', (req, res) => proxy(req, res, '/api/shorts-reels/playboard/manual-discover'));
router.post('/dailyhaha/manual-discover', (req, res) => proxy(req, res, '/api/shorts-reels/dailyhaha/manual-discover'));

// Delete playboard config
router.delete('/playboard/configs/:index', protect, async (req, res) => {

  try {
    const index = parseInt(req.params.index, 10);
    const setting = await TrendSetting.getOrCreateDefault();

    if (!setting.playboardConfigs || index < 0 || index >= setting.playboardConfigs.length) {
      return res.status(404).json({
        success: false,
        error: 'Config not found',
      });
    }

    setting.playboardConfigs.splice(index, 1);
    await setting.save();

    res.json({
      success: true,
      configs: setting.playboardConfigs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get('/stats/overview', (req, res) => proxy(req, res, '/api/shorts-reels/stats/overview'));
router.get('/channels', (req, res) => proxy(req, res, '/api/shorts-reels/channels'));
router.post('/channels/:id/manual-scan', (req, res) => proxy(req, res, `/api/shorts-reels/channels/${req.params.id}/manual-scan`));
router.get('/videos', (req, res) => proxy(req, res, '/api/shorts-reels/videos'));
router.post('/videos/:id/re-download', (req, res) => proxy(req, res, `/api/shorts-reels/videos/${req.params.id}/re-download`));
router.post('/videos/trigger-pending-downloads', (req, res) => proxy(req, res, '/api/shorts-reels/videos/trigger-pending-downloads'));
// Google Drive upload + status
router.get('/videos/upload-status', (req, res) => proxy(req, res, '/api/shorts-reels/videos/upload-status'));
router.post('/videos/upload-to-drive', (req, res) => proxy(req, res, '/api/shorts-reels/videos/upload-to-drive'));
router.post('/videos/:id/upload-to-drive', (req, res) => proxy(req, res, `/api/shorts-reels/videos/${req.params.id}/upload-to-drive`));
router.get('/logs', (req, res) => proxy(req, res, '/api/shorts-reels/logs'));
router.get('/settings', (req, res) => proxy(req, res, '/api/shorts-reels/settings'));
router.post('/settings', (req, res) => proxy(req, res, '/api/shorts-reels/settings'));
router.post('/jobs/trigger', (req, res) => proxy(req, res, '/api/shorts-reels/jobs/trigger'));


export default router;
