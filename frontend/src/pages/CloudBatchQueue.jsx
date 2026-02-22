/**
 * Cloud Batch Queue UI
 * Manage and monitor batch processing from Google Drive
 */

import React, { useEffect, useState, useRef } from 'react';
import { Cloud, Plus, Play, StopCircle, Trash2, Eye, FolderOpen, FileDown, AlertCircle, CheckCircle, Clock, Zap } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api';

export function CloudBatchQueue() {
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [stats, setStats] = useState(null);
  const socketRef = useRef(null);
  const [batchConfig, setBatchConfig] = useState({
    name: '',
    type: '',
    inputFolder: '',
    recursive: true,
  });

  // Initialize
  useEffect(() => {
    initializeQueue();
  }, []);

  // WebSocket listener for real-time updates
  useEffect(() => {
    if (!selectedBatch) return;

    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      socketRef.current = new WebSocket(
        `${protocol}://${window.location.host}/api/batch-queue/events`
      );

      socketRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.batchId === selectedBatch.id) {
          console.log('Real-time update:', data);
          // Refresh selected batch status
          loadBatchStatus(selectedBatch.id);
        }
      };
    };

    connect();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [selectedBatch]);

  const initializeQueue = async () => {
    try {
      setLoading(true);
      
      // Initialize queue
      const initResponse = await axios.post(`${API_BASE}/batch-queue/init`);
      console.log('Queue initialized:', initResponse.data);

      // Load batches
      await loadBatches();
      
      // Load stats
      await loadStats();
    } catch (error) {
      console.error('Error initializing queue:', error);
      toast.error('Failed to initialize batch queue');
    } finally {
      setLoading(false);
    }
  };

  const loadBatches = async () => {
    try {
      const response = await axios.get(`${API_BASE}/batch-queue/all`);
      setBatches(response.data.data || []);
    } catch (error) {
      console.error('Error loading batches:', error);
    }
  };

  const loadBatchStatus = async (batchId) => {
    try {
      const response = await axios.get(`${API_BASE}/batch-queue/${batchId}/status`);
      
      // Update selected batch details
      if (selectedBatch && selectedBatch.id === batchId) {
        setSelectedBatch(response.data.data);
      }

      // Update batch in list
      setBatches(prev =>
        prev.map(b => (b.id === batchId ? response.data.data : b))
      );
    } catch (error) {
      console.error('Error loading batch status:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await axios.get(`${API_BASE}/batch-queue/stats`);
      setStats(response.data.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleCreateBatch = async (e) => {
    e.preventDefault();
    
    if (!batchConfig.name || !batchConfig.type) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setCreating(true);

      const response = await axios.post(`${API_BASE}/batch-queue/create`, {
        name: batchConfig.name,
        type: batchConfig.type,
        config: {
          inputFolder: batchConfig.inputFolder,
          recursive: batchConfig.recursive,
        },
      });

      const newBatch = response.data.data;
      toast.success('Batch created successfully!');
      
      // Reset form
      setBatchConfig({ name: '', type: '', inputFolder: '', recursive: true });
      
      // Reload batches
      await loadBatches();
      setSelectedBatch(newBatch);
    } catch (error) {
      console.error('Error creating batch:', error);
      toast.error('Failed to create batch');
    } finally {
      setCreating(false);
    }
  };

  const handleProcessBatch = async (batchId, sync = false) => {
    try {
      const endpoint = sync ? 'process-sync' : 'process';
      const response = await axios.post(
        `${API_BASE}/batch-queue/${batchId}/${endpoint}`
      );

      toast.success('Batch processing started!');
      
      // Reload status
      await loadBatchStatus(batchId);
      await loadStats();
    } catch (error) {
      console.error('Error processing batch:', error);
      toast.error('Failed to process batch');
    }
  };

  const handleDeleteBatch = async (batchId) => {
    if (!confirm('Are you sure you want to delete this batch?')) return;

    try {
      await axios.delete(`${API_BASE}/batch-queue/${batchId}`);
      
      toast.success('Batch deleted');
      await loadBatches();
      
      if (selectedBatch?.id === batchId) {
        setSelectedBatch(null);
      }
    } catch (error) {
      console.error('Error deleting batch:', error);
      toast.error('Failed to delete batch');
    }
  };

  const handleDownloadOutput = async (batchId) => {
    try {
      const response = await axios.get(`${API_BASE}/batch-queue/${batchId}/output`);
      toast.success(`Downloaded ${response.data.data.length} files`);
    } catch (error) {
      console.error('Error downloading output:', error);
      toast.error('Failed to download output');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin">
          <Cloud className="w-8 h-8 text-purple-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gray-900 text-white p-6 overflow-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Zap className="w-8 h-8 text-purple-600" />
          <h1 className="text-3xl font-bold">Cloud Batch Queue</h1>
        </div>
        <p className="text-gray-400">Manage batch processing from Google Drive</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Batches" value={stats.totalBatches} icon="📊" />
          <StatCard label="Processing" value={stats.processingCount} icon="⏳" />
          <StatCard label="Completed" value={stats.completedCount} icon="✅" />
          <StatCard label="Queue Items" value={stats.queueSize} icon="📋" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Batch List */}
        <div className="lg:col-span-1">
          <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden flex flex-col h-full">
            {/* Create Batch Form */}
            <div className="p-4 border-b border-gray-700">
              <h2 className="font-semibold mb-4">Create New Batch</h2>
              <form onSubmit={handleCreateBatch} className="space-y-3">
                <input
                  type="text"
                  placeholder="Batch name"
                  value={batchConfig.name}
                  onChange={(e) =>
                    setBatchConfig({ ...batchConfig, name: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:border-purple-500"
                />

                <select
                  value={batchConfig.type}
                  onChange={(e) =>
                    setBatchConfig({ ...batchConfig, type: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:border-purple-500"
                >
                  <option value="">Select media type</option>
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                  <option value="audio">Audio</option>
                </select>

                <input
                  type="text"
                  placeholder="Input folder (optional)"
                  value={batchConfig.inputFolder}
                  onChange={(e) =>
                    setBatchConfig({
                      ...batchConfig,
                      inputFolder: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:border-purple-500"
                />

                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={batchConfig.recursive}
                    onChange={(e) =>
                      setBatchConfig({
                        ...batchConfig,
                        recursive: e.target.checked,
                      })
                    }
                    className="rounded"
                  />
                  Recursive scan
                </label>

                <button
                  type="submit"
                  disabled={creating}
                  className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg transition flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create Batch
                </button>
              </form>
            </div>

            {/* Batch List */}
            <div className="flex-1 overflow-y-auto">
              {batches.length > 0 ? (
                <div className="divide-y divide-gray-700">
                  {batches.map((batch) => (
                    <div
                      key={batch.id}
                      onClick={() => setSelectedBatch(batch)}
                      className={`p-4 cursor-pointer transition ${
                        selectedBatch?.id === batch.id
                          ? 'bg-gray-700 border-l-2 border-purple-600'
                          : 'hover:bg-gray-700 border-l-2 border-transparent'
                      }`}
                    >
                      <h3 className="font-semibold text-sm truncate">
                        {batch.name}
                      </h3>
                      <p className="text-xs text-gray-400 mt-1">{batch.type}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <StatusBadge status={batch.status} />
                        <span className="text-xs text-gray-400">
                          {batch.itemCount} items
                        </span>
                      </div>
                      <div className="mt-2 w-full bg-gray-600 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-purple-600 h-full transition-all"
                          style={{ width: `${batch.progress || 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-gray-400">
                  <Cloud className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No batches yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Batch Details */}
        {selectedBatch && (
          <div className="lg:col-span-2">
            <BatchDetailPanel
              batch={selectedBatch}
              onProcess={handleProcessBatch}
              onDelete={handleDeleteBatch}
              onDownload={handleDownloadOutput}
              onRefresh={() => loadBatchStatus(selectedBatch.id)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Stat Card Component
 */
function StatCard({ label, value, icon }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className="text-3xl opacity-50">{icon}</div>
      </div>
    </div>
  );
}

/**
 * Status Badge Component
 */
function StatusBadge({ status }) {
  const statusConfig = {
    pending: { bg: 'bg-gray-600', text: 'Pending', icon: Clock },
    processing: { bg: 'bg-blue-600', text: 'Processing', icon: Zap },
    completed: { bg: 'bg-green-600', text: 'Completed', icon: CheckCircle },
    failed: { bg: 'bg-red-600', text: 'Failed', icon: AlertCircle },
  };

  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <span className={`${config.bg} text-white text-xs px-2 py-1 rounded-full inline-flex items-center gap-1`}>
      <Icon className="w-3 h-3" />
      {config.text}
    </span>
  );
}

/**
 * Batch Detail Panel
 */
function BatchDetailPanel({ batch, onProcess, onDelete, onDownload, onRefresh }) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">{batch.name}</h2>
            <p className="text-gray-400 text-sm mt-1">{batch.type} batch</p>
          </div>
          <StatusBadge status={batch.status} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-gray-400 text-xs">Items</p>
            <p className="text-lg font-bold">{batch.itemCount}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Completed</p>
            <p className="text-lg font-bold">{batch.completedCount}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Progress</p>
            <p className="text-lg font-bold">{batch.progress || 0}%</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Created</p>
            <p className="text-sm font-semibold">
              {new Date(batch.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <p className="text-sm text-gray-400">Overall Progress</p>
          <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-purple-600 to-blue-600 h-full transition-all"
              style={{ width: `${batch.progress || 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onProcess(batch.id, false)}
            disabled={batch.status === 'processing'}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4" />
            Process Async
          </button>

          <button
            onClick={() => onProcess(batch.id, true)}
            disabled={batch.status === 'processing'}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg transition flex items-center justify-center gap-2"
          >
            <Zap className="w-4 h-4" />
            Process Sync
          </button>

          <button
            onClick={() => onDownload(batch.id)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition flex items-center justify-center gap-2"
          >
            <FileDown className="w-4 h-4" />
            Download Output
          </button>

          <button
            onClick={() => onDelete(batch.id)}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>

        <button
          onClick={onRefresh}
          className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition text-sm"
        >
          Refresh Status
        </button>
      </div>

      {/* Items List */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <h3 className="font-semibold mb-3">Items ({batch.items?.length || 0})</h3>
        
        {batch.items && batch.items.length > 0 ? (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {batch.items.map((item, index) => (
              <div
                key={index}
                className="bg-gray-700 p-3 rounded text-sm flex items-center justify-between"
              >
                <div className="flex-1 min-w-0">
                  <p className="truncate font-semibold">{item.name}</p>
                  <p className="text-xs text-gray-400 truncate">{item.cloudPath}</p>
                </div>
                <div className="ml-4 flex-shrink-0">
                  <ItemStatusBadge status={item.status} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">No items in batch</p>
        )}
      </div>
    </div>
  );
}

/**
 * Item Status Badge
 */
function ItemStatusBadge({ status }) {
  const colors = {
    pending: 'bg-gray-600',
    processing: 'bg-blue-600',
    completed: 'bg-green-600',
    failed: 'bg-red-600',
  };

  return (
    <span
      className={`${colors[status] || colors.pending} text-white text-xs px-2 py-1 rounded whitespace-nowrap`}
    >
      {status}
    </span>
  );
}

export default CloudBatchQueue;
