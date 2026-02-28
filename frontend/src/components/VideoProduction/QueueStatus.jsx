/**
 * Queue Status Component
 * Displays queue metrics and management interface
 */

import React, { useEffect, useMemo, useState } from 'react';
import useVideoProductionStore from '@/stores/videoProductionStore.js';
import { Video, TrendingUp, AlertTriangle, Play, Send } from 'lucide-react';
import toast from 'react-hot-toast';

export function QueueStatus() {
  const { queue, accounts, getQueueStats, getAllAccounts, publishQueueItem } = useVideoProductionStore();
  const [filter, setFilter] = useState('all');
  const [selectedAccounts, setSelectedAccounts] = useState({});
  const [publishingQueueId, setPublishingQueueId] = useState(null);

  useEffect(() => {
    getQueueStats();
    getAllAccounts();
    const interval = setInterval(getQueueStats, 4000);
    return () => clearInterval(interval);
  }, [getQueueStats, getAllAccounts]);

  const accountOptions = useMemo(
    () => (accounts.items || []).filter(a => a.active !== false),
    [accounts.items]
  );

  const stats = queue.stats || {};
  const byStatus = stats.byStatus || {};
  const items = queue.items || [];

  const toggleAccount = (queueId, accountId) => {
    const current = new Set(selectedAccounts[queueId] || []);
    if (current.has(accountId)) current.delete(accountId);
    else current.add(accountId);
    setSelectedAccounts(prev => ({ ...prev, [queueId]: [...current] }));
  };

  const handlePublish = async (queueId) => {
    const accountIds = selectedAccounts[queueId] || [];
    if (!accountIds.length) {
      toast.error('Vui lòng chọn ít nhất 1 account để publish');
      return;
    }

    try {
      setPublishingQueueId(queueId);
      const result = await publishQueueItem(queueId, accountIds, { title: 'Auto publish from queue' });
      toast.success(`Published thành công ${result.successful}/${accountIds.length} account`);
      await getQueueStats();
    } catch (error) {
      toast.error(`Publish thất bại: ${error.message}`);
    } finally {
      setPublishingQueueId(null);
    }
  };

  if (queue.loading) {
    return <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">Loading queue...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <StatCard icon={Video} label="Total" value={stats.total || 0} />
        <StatCard icon={Play} label="Processing" value={byStatus.processing || 0} valueClass="text-blue-400" />
        <StatCard icon={TrendingUp} label="Ready/Completed" value={(byStatus.ready || 0) + (byStatus.uploaded || 0)} valueClass="text-green-400" />
        <StatCard icon={AlertTriangle} label="Failed" value={byStatus.failed || 0} valueClass="text-red-400" />
      </div>

      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold flex items-center gap-2"><Video className="w-4 h-4" />Queue Items</h3>
          <div className="flex gap-2">
            {['all', 'pending', 'processing', 'ready', 'uploaded'].map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1 text-sm rounded ${filter === tab ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3 max-h-[520px] overflow-y-auto">
          {items.length === 0 ? <div className="text-gray-400 text-center py-8">No queued videos yet</div> : items
            .filter(item => filter === 'all' || item.status === filter)
            .slice(0, 20)
            .map(item => {
              const canPublish = item.status === 'ready';
              return (
                <div key={item.queueId} className="bg-gray-900/60 border border-gray-700 rounded p-3 space-y-2">
                  <div className="flex justify-between gap-4 items-center">
                    <div>
                      <p className="text-sm font-semibold">{item.queueId}</p>
                      <p className="text-xs text-gray-400">{item.platform || 'all'} · {item.contentType || 'mashup'}</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded bg-gray-700">{item.status}</span>
                  </div>

                  {canPublish && (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {accountOptions.map(acc => (
                          <button
                            key={acc.accountId}
                            onClick={() => toggleAccount(item.queueId, acc.accountId)}
                            className={`text-xs px-2 py-1 rounded border ${(selectedAccounts[item.queueId] || []).includes(acc.accountId) ? 'bg-green-700 border-green-500' : 'bg-gray-800 border-gray-600'}`}
                          >
                            {acc.platform}:{acc.displayName}
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={() => handlePublish(item.queueId)}
                        disabled={publishingQueueId === item.queueId}
                        className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 px-3 py-1 rounded text-sm flex items-center gap-2"
                      >
                        <Send className="w-4 h-4" />
                        {publishingQueueId === item.queueId ? 'Publishing...' : 'Publish'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>

      {queue.error && <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4 text-red-400 text-sm">{queue.error}</div>}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, valueClass = '' }) {
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-purple-400" />
        <span className="text-sm text-gray-400">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${valueClass}`}>{value}</div>
    </div>
  );
}
