import express from 'express';
import NotificationController from '../controllers/notificationController.js';

const router = express.Router();

function checkNotifyKey(req, res) {
  const notifyKey = process.env.NOTIFICATION_API_KEY || process.env.ADMIN_API_KEY;
  if (!notifyKey) return true;
  const provided = req.headers['x-notify-key'] || req.headers['x-api-key'];
  if (!provided || provided !== notifyKey) {
    res.status(403).json({ success: false, error: 'notification_key_required' });
    return false;
  }
  return true;
}

router.get('/', NotificationController.listNotifications);
router.post('/', (req, res, next) => {
  if (!checkNotifyKey(req, res)) return;
  return NotificationController.createNotification(req, res, next);
});
router.post('/mark-read', NotificationController.markRead);

export default router;
