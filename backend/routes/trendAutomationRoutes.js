import express from 'express';
import axios from 'axios';

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

router.get('/stats/overview', (req, res) => proxy(req, res, '/api/shorts-reels/stats/overview'));
router.get('/channels', (req, res) => proxy(req, res, '/api/shorts-reels/channels'));
router.post('/channels/:id/manual-scan', (req, res) => proxy(req, res, `/api/shorts-reels/channels/${req.params.id}/manual-scan`));
router.get('/videos', (req, res) => proxy(req, res, '/api/shorts-reels/videos'));
router.post('/videos/:id/re-download', (req, res) => proxy(req, res, `/api/shorts-reels/videos/${req.params.id}/re-download`));
router.get('/logs', (req, res) => proxy(req, res, '/api/shorts-reels/logs'));
router.get('/settings', (req, res) => proxy(req, res, '/api/shorts-reels/settings'));
router.post('/settings', (req, res) => proxy(req, res, '/api/shorts-reels/settings'));
router.post('/jobs/trigger', (req, res) => proxy(req, res, '/api/shorts-reels/jobs/trigger'));

export default router;
