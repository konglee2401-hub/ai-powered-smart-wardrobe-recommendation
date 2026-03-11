import notificationService from '../services/notificationService.js';

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

class NotificationController {
  static listNotifications = asyncHandler(async (req, res) => {
    const { limit, offset, unreadOnly } = req.query || {};
    const result = await notificationService.listNotifications({
      limit,
      offset,
      unreadOnly: String(unreadOnly || '').toLowerCase() === 'true',
    });
    res.json(result);
  });

  static createNotification = asyncHandler(async (req, res) => {
    const payload = req.body || {};
    const result = await notificationService.createNotification(payload);
    res.json({ success: true, item: result });
  });

  static markRead = asyncHandler(async (req, res) => {
    const { ids = [], all = false } = req.body || {};
    const result = await notificationService.markRead({ ids, all });
    res.json(result);
  });
}

export default NotificationController;
