import Notification from '../models/Notification.js';

class NotificationService {
  constructor() {
    this.defaultLimit = 80;
  }

  async createNotification(payload = {}) {
    const notification = await Notification.create({
      type: payload.type || 'system.info',
      title: payload.title || '',
      message: payload.message || '',
      severity: payload.severity || 'info',
      source: payload.source || 'backend',
      queueId: payload.queueId || '',
      jobId: payload.jobId || '',
      meta: payload.meta || {},
    });

    this.emit(notification);
    return notification;
  }

  emit(notification) {
    if (!global.io) return;
    const payload = {
      id: String(notification._id || ''),
      type: notification.type,
      title: notification.title,
      message: notification.message,
      severity: notification.severity,
      source: notification.source,
      queueId: notification.queueId,
      jobId: notification.jobId,
      meta: notification.meta || {},
      readAt: notification.readAt,
      createdAt: notification.createdAt || new Date(),
    };
    global.io.emit('notify', payload);
  }

  async listNotifications({ limit = this.defaultLimit, offset = 0, unreadOnly = false } = {}) {
    const query = unreadOnly ? { readAt: null } : {};
    const cursor = Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(Math.max(0, Number(offset) || 0))
      .limit(Math.min(Number(limit) || this.defaultLimit, 200))
      .lean();

    const items = await cursor;
    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ readAt: null });

    return {
      success: true,
      items: items.map((item) => ({
        ...item,
        id: String(item._id),
      })),
      count: total,
      unreadCount,
    };
  }

  async markRead({ ids = [], all = false } = {}) {
    const now = new Date();
    if (all) {
      await Notification.updateMany({ readAt: null }, { $set: { readAt: now } });
    } else if (Array.isArray(ids) && ids.length) {
      await Notification.updateMany({ _id: { $in: ids } }, { $set: { readAt: now } });
    }
    const unreadCount = await Notification.countDocuments({ readAt: null });
    return { success: true, unreadCount };
  }
}

export default new NotificationService();
