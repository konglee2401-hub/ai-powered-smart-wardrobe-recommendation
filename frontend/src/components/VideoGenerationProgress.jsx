import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

/**
 * VideoGenerationProgress - Real-time progress display during video generation
 */
function VideoGenerationProgress({ sessionId, onComplete, onError }) {
  const [progress, setProgress] = useState(null);
  const [socket, setSocket] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Connect to Socket.IO
    const socketInstance = io(import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000', {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    // Join session room
    socketInstance.emit('join-session', sessionId);

    // Listen for progress updates
    socketInstance.on('video-generation-progress', (data) => {
      setProgress(data);

      // Check if completed
      if (data.status === 'completed') {
        if (onComplete) {
          onComplete(data);
        }
      } else if (data.status === 'failed') {
        setError(data.message);
        if (onError) {
          onError(new Error(data.message));
        }
      }
    });

    // Listen for connection errors
    socketInstance.on('error', (err) => {
      setError('Connection error: ' + err);
      if (onError) {
        onError(new Error(err));
      }
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [sessionId, onComplete, onError]);

  if (!progress) {
    return (
      <div className="video-progress-container">
        <div className="progress-spinner">
          <div className="spinner"></div>
          <p>Initializing video generation...</p>
        </div>
      </div>
    );
  }

  const statusColors = {
    started: '#3b82f6',
    uploading: '#f59e0b',
    detecting: '#f59e0b',
    generating: '#8b5cf6',
    completed: '#10b981',
    failed: '#ef4444'
  };

  const statusMessages = {
    uploading: '📤 Uploading image to Grok...',
    detecting: '🔍 Detecting video generation page...',
    generating: '🎬 Generating video segments...',
    completed: '✅ Video generation completed!',
    failed: '❌ Video generation failed'
  };

  return (
    <div className="video-progress-container">
      <div className="progress-card">
        {/* Header */}
        <div className="progress-header">
          <h3>Video Generation Progress</h3>
          <span className={`status-badge status-${progress.status}`}>
            {statusMessages[progress.status] || progress.message}
          </span>
        </div>

        {/* Main progress bar */}
        <div className="progress-main">
          <div className="progress-bar-container">
            <div
              className="progress-bar-fill"
              style={{
                width: `${progress.percentComplete}%`,
                backgroundColor: statusColors[progress.status]
              }}
            />
          </div>
          <div className="progress-percentage">{progress.percentComplete}%</div>
        </div>

        {/* Segment progress */}
        {progress.status === 'generating' && (
          <div className="segment-progress">
            <div className="segment-info">
              <span className="segment-label">Segment Progress</span>
              <span className="segment-count">
                {progress.currentSegment} / {progress.totalSegments}
              </span>
            </div>
            <div className="segment-bar-container">
              {Array.from({ length: progress.totalSegments }).map((_, i) => (
                <div
                  key={i}
                  className={`segment-bar ${
                    i < progress.currentSegment - 1
                      ? 'completed'
                      : i === progress.currentSegment - 1
                      ? 'active'
                      : 'pending'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Time information */}
        <div className="progress-timing">
          <div className="timing-item">
            <span className="timing-label">⏱️ Elapsed</span>
            <span className="timing-value">{formatTime(progress.elapsedSeconds)}</span>
          </div>
          <div className="timing-item">
            <span className="timing-label">⏳ Remaining</span>
            <span className="timing-value">{formatTime(progress.estimatedRemainingSeconds)}</span>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="progress-error">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Message display */}
        {progress.message && (
          <div className="progress-message">
            {progress.message}
          </div>
        )}
      </div>

      <style jsx>{`
        .video-progress-container {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          border-radius: 12px;
          min-height: 400px;
        }

        .progress-card {
          background: white;
          border-radius: 12px;
          padding: 30px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
          max-width: 500px;
          width: 100%;
        }

        .progress-header {
          margin-bottom: 24px;
        }

        .progress-header h3 {
          margin: 0 0 12px 0;
          font-size: 20px;
          font-weight: 600;
          color: #1f2937;
        }

        .status-badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          background: #f3f4f6;
          color: #374151;
        }

        .status-badge.status-uploading {
          background: #fef3c7;
          color: #92400e;
        }

        .status-badge.status-detecting {
          background: #fef3c7;
          color: #92400e;
        }

        .status-badge.status-generating {
          background: #ede9fe;
          color: #581c87;
        }

        .status-badge.status-completed {
          background: #d1fae5;
          color: #065f46;
        }

        .status-badge.status-failed {
          background: #fee2e2;
          color: #7f1d1d;
        }

        .progress-main {
          margin-bottom: 24px;
        }

        .progress-bar-container {
          width: 100%;
          height: 8px;
          background: #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .progress-bar-fill {
          height: 100%;
          transition: width 0.3s ease;
        }

        .progress-percentage {
          text-align: right;
          font-size: 14px;
          font-weight: 600;
          color: #374151;
        }

        .segment-progress {
          margin-bottom: 24px;
          padding-bottom: 24px;
          border-bottom: 1px solid #e5e7eb;
        }

        .segment-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
          font-size: 14px;
        }

        .segment-label {
          color: #6b7280;
          font-weight: 500;
        }

        .segment-count {
          color: #1f2937;
          font-weight: 600;
        }

        .segment-bar-container {
          display: flex;
          gap: 8px;
        }

        .segment-bar {
          flex: 1;
          height: 6px;
          background: #e5e7eb;
          border-radius: 3px;
          transition: all 0.3s ease;
        }

        .segment-bar.completed {
          background: #10b981;
        }

        .segment-bar.active {
          background: #8b5cf6;
          animation: pulse 1s infinite;
        }

        .segment-bar.pending {
          background: #d1d5db;
        }

        @keyframes pulse {
          0% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
          100% {
            opacity: 1;
          }
        }

        .progress-timing {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 20px;
          padding: 16px;
          background: #f9fafb;
          border-radius: 8px;
        }

        .timing-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .timing-label {
          font-size: 13px;
          color: #6b7280;
          font-weight: 500;
        }

        .timing-value {
          font-size: 16px;
          color: #1f2937;
          font-weight: 600;
        }

        .progress-error {
          padding: 12px;
          background: #fee2e2;
          border: 1px solid #fecaca;
          border-radius: 6px;
          color: #7f1d1d;
          font-size: 14px;
          margin-bottom: 12px;
        }

        .progress-message {
          padding: 12px;
          background: #f0f9ff;
          border: 1px solid #bfdbfe;
          border-radius: 6px;
          color: #0c4a6e;
          font-size: 14px;
          line-height: 1.5;
        }

        .progress-spinner {
          text-align: center;
        }

        .spinner {
          border: 4px solid #f3f4f6;
          border-top: 4px solid #8b5cf6;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        .progress-spinner p {
          color: #6b7280;
          font-size: 14px;
          margin: 0;
        }
      `}</style>
    </div>
  );
}

/**
 * Format seconds to mm:ss format
 */
function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export default VideoGenerationProgress;
