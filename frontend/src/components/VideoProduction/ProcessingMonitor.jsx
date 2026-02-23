/**
 * ProcessingMonitor.jsx
 * Real-time monitoring of video processing with live updates
 */

import React, { useState, useEffect } from 'react';
import useVideoProductionStore from '@/stores/videoProductionStore.js';
import { Play, Pause, RefreshCw, Download, AlertCircle } from 'lucide-react';

export function ProcessingMonitor() {
  const { getNextPendingVideo } = useVideoProductionStore();
  
  const [currentJob, setCurrentJob] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stages, setStages] = useState([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!autoRefresh || !currentJob) return;

    const interval = setInterval(() => {
      pollJobStatus();
    }, 1500); // Poll every 1.5 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, currentJob]);

  const handleStartProcessing = async () => {
    try {
      setIsProcessing(true);
      const response = await fetch('/api/video-production/workflow/process-next', {
        method: 'POST'
      });

      const result = await response.json();
      if (result.success) {
        setCurrentJob(result.data.queueItem);
        setStages([]);
        setProgress(0);
      }
      
    } catch (error) {
      console.error('Failed to start processing:', error);
      setIsProcessing(false);
    }
  };

  const pollJobStatus = async () => {
    if (!currentJob) return;

    try {
      const response = await fetch(
        `/api/video-production/queue/${currentJob.queueId}`
      );

      const result = await response.json();
      if (result.success) {
        setCurrentJob(result.data);

        // Parse stages from logs
        try {
          const logsResponse = await fetch(
            `/api/video-production/queue/${currentJob.queueId}/logs`
          );
          const logsResult = await logsResponse.json();
          
          if (logsResult.success && logsResult.data?.processLog?.stages) {
            setStages(logsResult.data.processLog.stages);
            
            // Calculate progress
            const completed = logsResult.data.processLog.stages.filter(s => s.status === 'completed').length;
            const total = logsResult.data.processLog.stages.length;
            setProgress(Math.round((completed / total) * 100));
          }
        } catch (e) {
          console.error('Logs fetch error:', e);
        }

        // Stop polling if done
        if (['ready', 'failed'].includes(result.data.status)) {
          setIsProcessing(false);
        }
      }
    } catch (error) {
      console.error('Poll failed:', error);
    }
  };

  const allStages = [
    { name: 'load-main', label: 'Load Main Video', icon: '🎬', color: 'from-purple-500 to-blue-500' },
    { name: 'load-sub', label: 'Load Sub Video', icon: '📹', color: 'from-blue-500 to-cyan-500' },
    { name: 'merge-videos', label: 'Merge Videos (2/3 + 1/3)', icon: '🔗', color: 'from-cyan-500 to-green-500' },
    { name: 'encode', label: 'Encode & Convert', icon: '⚙️', color: 'from-green-500 to-yellow-500' },
    { name: 'generate-thumbnail', label: 'Generate Thumbnail', icon: '📸', color: 'from-yellow-500 to-orange-500' }
  ];

  const getStageStatus = (stageName) => {
    const stage = stages.find(s => s.stage === stageName);
    return stage?.status || 'pending';
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'completed':
        return 'bg-green-500/20 text-green-300 border-green-500/50';
      case 'in_progress':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/50 animate-pulse';
      case 'pending':
        return 'bg-gray-500/20 text-gray-300 border-gray-500/50';
      case 'failed':
        return 'bg-red-500/20 text-red-300 border-red-500/50';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold mb-4">Processing Monitor</h3>
        
        <div className="flex gap-2">
          <button
            onClick={handleStartProcessing}
            disabled={isProcessing}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-lg font-semibold transition flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4" />
            {isProcessing ? '⏳ Processing...' : '▶ Start Processing'}
          </button>
          
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex-1 px-4 py-2 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
              autoRefresh
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${autoRefresh && 'animate-spin'}`} />
            {autoRefresh ? 'Auto-Refresh On' : 'Auto-Refresh Off'}
          </button>
        </div>
      </div>

      {/* Current Job Status */}
      {currentJob && (
        <div className="space-y-4">
          {/* Status Card */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Current Job</h3>
              <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                currentJob.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                currentJob.status === 'processing' ? 'bg-blue-500/20 text-blue-300' :
                currentJob.status === 'ready' ? 'bg-green-500/20 text-green-300' :
                'bg-red-500/20 text-red-300'
              }`}>
                {currentJob.status === 'processing' && '⏳ '}
                {currentJob.status === 'ready' && '✓ '}
                {currentJob.status === 'failed' && '✗ '}
                {currentJob.status.charAt(0).toUpperCase() + currentJob.status.slice(1)}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm text-gray-400">Overall Progress</p>
                <p className="text-sm font-semibold text-gray-300">{progress}%</p>
              </div>
              <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Queue ID */}
            <div className="text-sm text-gray-400">
              <span>Queue ID: </span>
              <span className="font-mono text-gray-300">{currentJob.queueId}</span>
            </div>
          </div>

          {/* Processing Stages */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h4 className="font-semibold mb-4">Processing Stages</h4>
            <div className="space-y-3">
              {allStages.map((stage, idx) => {
                const status = getStageStatus(stage.name);
                const stageData = stages.find(s => s.stage === stage.name);
                
                return (
                  <div key={stage.name} className="flex items-center gap-3">
                    <span className="text-lg w-6">{stage.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-200">{stage.label}</p>
                      {stageData && (
                        <p className="text-xs text-gray-500">
                          {(stageData.duration / 1000).toFixed(2)}s
                          {stageData.details && ` - ${stageData.details}`}
                        </p>
                      )}
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${getStatusColor(status)}`}>
                      {status === 'in_progress' && '⏳ '}
                      {status === 'completed' && '✓ '}
                      {status === 'failed' && '✗ '}
                      {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Generated Video Info */}
          {currentJob.videoPath && currentJob.status === 'ready' && (
            <div className="bg-green-900/30 border border-green-600/50 rounded-lg p-4">
              <h4 className="font-semibold text-green-300 mb-2">✓ Video Generated Successfully!</h4>
              <p className="text-sm text-gray-300 break-all mb-3">
                <span className="text-gray-400">Path: </span>
                {currentJob.videoPath}
              </p>
              <button className="w-full bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2">
                <Download className="w-4 h-4" />
                Download Video
              </button>
            </div>
          )}

          {/* Error Log */}
          {currentJob.errorLog?.length > 0 && (
            <div className="bg-red-900/30 border border-red-600/50 rounded-lg p-4">
              <h4 className="font-semibold text-red-300 mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> Errors Occurred
              </h4>
              <ul className="text-sm text-gray-300 space-y-1">
                {currentJob.errorLog.map((error, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-red-400 mt-1">•</span>
                    <span>{error}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* No Job Notice */}
      {!currentJob && !isProcessing && (
        <div className="bg-gray-800 rounded-lg p-12 border border-gray-700 text-center">
          <Play className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg font-semibold">No Active Job</p>
          <p className="text-sm text-gray-500 mt-2">Click "Start Processing" to begin processing queued videos</p>
        </div>
      )}
    </div>
  );
}

export default ProcessingMonitor;
