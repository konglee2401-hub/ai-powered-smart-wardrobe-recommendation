import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, Check, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import useNotificationStore from '../stores/useNotificationStore';
import notificationApi from '../services/notificationApi';

const severityTone = (severity = 'info', isLight = false) => {
  const map = {
    success: isLight ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-emerald-400/20 text-emerald-200 border-emerald-300/30',
    info: isLight ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-sky-400/20 text-sky-200 border-sky-300/30',
    warning: isLight ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-amber-400/20 text-amber-200 border-amber-300/30',
    error: isLight ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-rose-400/20 text-rose-200 border-rose-300/30',
  };
  return map[severity] || map.info;
};

export default function NotificationBell() {
  const { items, unreadCount, markRead, markAllRead } = useNotificationStore();
  const [open, setOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [queueFilter, setQueueFilter] = useState('');
  const [panelStyle, setPanelStyle] = useState({});
  const anchorRef = useRef(null);

  const unreadIds = useMemo(() => items.filter((item) => !item.readAt).map((item) => item.id), [items]);
  const queueOptions = useMemo(() => {
    const options = items.map((item) => item.queueId).filter(Boolean);
    return Array.from(new Set(options)).slice(0, 12);
  }, [items]);
  const isLight = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light';

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (activeFilter !== 'all' && String(item.source || '').toLowerCase() !== activeFilter) {
        return false;
      }
      if (queueFilter && item.queueId !== queueFilter) {
        return false;
      }
      return true;
    });
  }, [items, activeFilter, queueFilter]);

  const handleToggle = () => setOpen((prev) => !prev);

  const handleMarkAll = async () => {
    markAllRead();
    await notificationApi.markRead({ all: true });
  };

  const handleItemClick = async (id) => {
    markRead([id]);
    await notificationApi.markRead({ ids: [id] });
  };

  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPanelStyle({
        top: Math.round(rect.bottom + 8),
        right: Math.round(window.innerWidth - rect.right),
      });
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [open]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleToggle}
        ref={anchorRef}
        className={`relative flex h-9 w-9 items-center justify-center rounded-full border transition ${
          isLight
            ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
            : 'border-white/10 bg-white/[0.06] text-slate-200 hover:bg-white/[0.12]'
        }`}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white shadow-[0_0_0_2px_rgba(255,255,255,0.65)]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className={`fixed z-[9999] mt-2 w-[340px] max-w-[85vw] overflow-hidden rounded-2xl border shadow-[0_24px_60px_rgba(0,0,0,0.35)] backdrop-blur ${
            isLight
              ? 'border-slate-200 bg-white/95 text-slate-900'
              : 'border-white/10 bg-slate-950/95 text-slate-100'
          }`}
          style={panelStyle}
        >
          <div className={`flex items-center justify-between border-b px-4 py-3 ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
            <div>
              <p className={`text-sm font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>Notifications</p>
              <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{unreadCount} unread</p>
            </div>
            <button
              type="button"
              onClick={handleMarkAll}
              disabled={!unreadIds.length}
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] transition disabled:opacity-50 ${
                isLight
                  ? 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
                  : 'border-white/10 bg-white/[0.05] text-slate-200 hover:bg-white/[0.12]'
              }`}
            >
              <Check className="h-3 w-3" />
              Mark all read
            </button>
          </div>

          <div className={`border-b px-4 py-2 ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'all', label: 'All' },
                { id: 'video-pipeline', label: 'Pipeline' },
                { id: 'scraper', label: 'Scraper' },
                { id: 'publish', label: 'Publish' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveFilter(tab.id)}
                  className={`rounded-full px-2.5 py-1 text-[11px] transition ${
                    activeFilter === tab.id
                      ? isLight
                        ? 'bg-sky-100 text-sky-700'
                        : 'bg-sky-400/20 text-sky-200'
                      : isLight
                        ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {queueOptions.length ? (
              <div className="mt-2">
                <select
                  value={queueFilter}
                  onChange={(event) => setQueueFilter(event.target.value)}
                  className={`w-full rounded-xl border px-2.5 py-1.5 text-[11px] ${
                    isLight
                      ? 'border-slate-200 bg-slate-100 text-slate-700'
                      : 'border-white/10 bg-white/[0.04] text-slate-200'
                  }`}
                >
                  <option value="">All queues</option>
                  {queueOptions.map((queueId) => (
                    <option key={queueId} value={queueId}>{queueId}</option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>

          <div className="max-h-[320px] overflow-y-auto">
            {filteredItems.length ? (
              filteredItems.map((item) => {
                const timeLabel = item.createdAt
                  ? formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })
                  : '';
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleItemClick(item.id)}
                    className={`w-full px-4 py-3 text-left transition ${isLight ? 'hover:bg-slate-100' : 'hover:bg-white/[0.04]'} ${
                      item.readAt ? 'opacity-70' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={`text-sm font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>{item.title || item.type}</p>
                        {item.message ? <p className={`mt-1 text-xs ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>{item.message}</p> : null}
                      </div>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${severityTone(item.severity, isLight)}`}>
                        {item.severity}
                      </span>
                    </div>
                    <div className={`mt-2 flex items-center justify-between text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                      <span>{item.source || 'system'}</span>
                      <span className="flex items-center gap-1">
                        {item.readAt ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : null}
                        {timeLabel}
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className={`px-4 py-6 text-center text-sm ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>No notifications yet.</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
