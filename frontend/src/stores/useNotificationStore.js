import { create } from 'zustand';

const normalize = (item = {}) => ({
  id: item.id || item._id || '',
  type: item.type || 'system.info',
  title: item.title || '',
  message: item.message || '',
  severity: item.severity || 'info',
  source: item.source || 'backend',
  queueId: item.queueId || '',
  jobId: item.jobId || '',
  meta: item.meta || {},
  readAt: item.readAt || null,
  createdAt: item.createdAt || new Date().toISOString(),
});

const computeUnread = (items) => items.filter((item) => !item.readAt).length;

const useNotificationStore = create((set, get) => ({
  items: [],
  unreadCount: 0,
  setNotifications: (items = [], unreadCount = null) => {
    const normalized = items.map(normalize);
    set({
      items: normalized,
      unreadCount: typeof unreadCount === 'number' ? unreadCount : computeUnread(normalized),
    });
  },
  addNotification: (item) => {
    const normalized = normalize(item);
    const existing = get().items;
    const next = [normalized, ...existing];
    set({
      items: next,
      unreadCount: computeUnread(next),
    });
  },
  markRead: (ids = []) => {
    if (!ids.length) return;
    const idSet = new Set(ids);
    const next = get().items.map((item) =>
      idSet.has(item.id) && !item.readAt
        ? { ...item, readAt: new Date().toISOString() }
        : item
    );
    set({ items: next, unreadCount: computeUnread(next) });
  },
  markAllRead: () => {
    const next = get().items.map((item) => (
      item.readAt ? item : { ...item, readAt: new Date().toISOString() }
    ));
    set({ items: next, unreadCount: 0 });
  },
}));

export default useNotificationStore;
