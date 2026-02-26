import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

/**
 * VideoHistoryAndAnalytics - Show generation history and analytics dashboard
 */
function VideoHistoryAndAnalytics({ userId }) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('history'); // 'history', 'analytics'
  const [videos, setVideos] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'completed', 'failed'

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    } else if (activeTab === 'analytics') {
      fetchAnalytics();
    }
  }, [activeTab, userId]);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`/api/v1/video/history`, {
        params: { userId, limit: 50, filter }
      });
      setVideos(response.data.videos || []);
    } catch (err) {
      setError('Failed to load video history');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`/api/v1/video/analytics`, {
        params: { userId }
      });
      setAnalytics(response.data);
    } catch (err) {
      setError('Failed to load analytics');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVideo = async (videoId) => {
    if (window.confirm('Are you sure you want to delete this video?')) {
      try {
        await axios.delete(`/api/v1/video/${videoId}`);
        setVideos(videos.filter(v => v._id !== videoId));
        setSelectedVideo(null);
      } catch (err) {
        alert('Failed to delete video');
      }
    }
  };

  const handleRateVideo = async (videoId, rating) => {
    try {
      await axios.post(`/api/v1/video/${videoId}/feedback`, { rating });
      // Refresh videos
      fetchHistory();
    } catch (err) {
      alert('Failed to submit feedback');
    }
  };

  return (
    <div className="video-history-container">
      {/* Tabs */}
      <div className="history-tabs">
        <button
          className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📹 Generation History
        </button>
        <button
          className={`tab-button ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          📊 Analytics Dashboard
        </button>
      </div>

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="history-content">
          {/* Filter Controls */}
          <div className="filter-bar">
            <div className="filter-group">
              <label>Filter by status:</label>
              <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                <option value="all">All Videos</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <button className="refresh-btn" onClick={fetchHistory}>
              🔄 Refresh
            </button>
          </div>

          {/* Videos Grid */}
          {!loading && !error && videos.length === 0 && (
            <div className="empty-state">
              <h3>No videos generated yet</h3>
              <p>Start creating videos to see your generation history here</p>
            </div>
          )}

          {!loading && !error && videos.length > 0 && (
            <div className="videos-grid">
              {videos.map((video) => (
                <VideoCard
                  key={video._id}
                  video={video}
                  onSelect={setSelectedVideo}
                  isSelected={selectedVideo?._id === video._id}
                  onDelete={handleDeleteVideo}
                  onRate={handleRateVideo}
                />
              ))}
            </div>
          )}

          {loading && <div className="loading-spinner">Loading...</div>}
          {error && <div className="error-message">{error}</div>}

          {/* Selected Video Details */}
          {selectedVideo && (
            <VideoDetails
              video={selectedVideo}
              onClose={() => setSelectedVideo(null)}
              onDelete={handleDeleteVideo}
              onRate={handleRateVideo}
            />
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="analytics-content">
          {!loading && !error && analytics && (
            <AnalyticsDashboard analytics={analytics} />
          )}

          {loading && <div className="loading-spinner">Loading analytics...</div>}
          {error && <div className="error-message">{error}</div>}
        </div>
      )}

      <style jsx>{`
        .video-history-container {
          padding: 20px;
        }

        .history-tabs {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
          border-bottom: 2px solid #e5e7eb;
        }

        .tab-button {
          padding: 12px 16px;
          background: none;
          border: none;
          font-size: 15px;
          font-weight: 600;
          color: #9ca3af;
          cursor: pointer;
          border-bottom: 3px solid transparent;
          transition: all 0.2s ease;
        }

        .tab-button.active {
          color: #8b5cf6;
          border-bottom-color: #8b5cf6;
        }

        .tab-button:hover {
          color: #6b7280;
        }

        .history-content,
        .analytics-content {
          animation: fadeIn 0.3s ease;
        }

        .filter-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding: 16px;
          background: #f9fafb;
          border-radius: 8px;
        }

        .filter-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .filter-group label {
          font-weight: 600;
          color: #374151;
        }

        .filter-group select {
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: white;
          cursor: pointer;
          font-size: 14px;
        }

        .refresh-btn {
          padding: 8px 16px;
          background: #8b5cf6;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .refresh-btn:hover {
          background: #7c3aed;
        }

        .videos-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 16px;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
        }

        .empty-state h3 {
          color: #1f2937;
          margin: 0 0 8px 0;
        }

        .empty-state p {
          color: #6b7280;
          margin: 0;
        }

        .loading-spinner {
          text-align: center;
          padding: 40px;
          color: #6b7280;
        }

        .error-message {
          padding: 16px;
          background: #fee2e2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          color: #7f1d1d;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * VideoCard - Individual video item in the grid
 */
function VideoCard({ video, onSelect, isSelected, onDelete, onRate }) {
  const [showOptions, setShowOptions] = useState(false);

  return (
    <div className={`video-card ${isSelected ? 'selected' : ''}`} onClick={() => onSelect(video)}>
      {/* Thumbnail */}
      <div className="video-thumbnail">
        {video.generatedVideos && video.generatedVideos[0] ? (
          <video src={video.generatedVideos[0].url} preload="none" />
        ) : (
          <div className="video-placeholder">📹</div>
        )}
        <div className="video-overlay">
          <button className="play-btn">▶️</button>
        </div>
      </div>

      {/* Info */}
      <div className="video-info">
        <h4>{video.userPrompt.substring(0, 40)}...</h4>
        <p className="video-date">{new Date(video.createdAt).toLocaleDateString()}</p>
        <div className="video-status">
          <span className={`status-badge status-${video.status}`}>{video.status}</span>
        </div>
      </div>

      {/* Options Menu */}
      <div className="video-options">
        <button
          className="options-btn"
          onClick={(e) => {
            e.stopPropagation();
            setShowOptions(!showOptions);
          }}
        >
          ⋮
        </button>
        {showOptions && (
          <div className="dropdown-menu">
            <button onClick={() => onDelete(video._id)}>🗑️ Delete</button>
          </div>
        )}
      </div>

      <style jsx>{`
        .video-card {
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          cursor: pointer;
          transition: all 0.2s ease;
          border: 2px solid transparent;
        }

        .video-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
        }

        .video-card.selected {
          border-color: #8b5cf6;
          background: #f9f5ff;
        }

        .video-thumbnail {
          position: relative;
          width: 100%;
          padding-bottom: 100%;
          background: #000;
          overflow: hidden;
        }

        .video-thumbnail video {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .video-placeholder {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 48px;
          background: #f3f4f6;
        }

        .video-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .video-card:hover .video-overlay {
          opacity: 1;
        }

        .play-btn {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.9);
          border: none;
          font-size: 24px;
          cursor: pointer;
        }

        .video-info {
          padding: 12px;
        }

        .video-info h4 {
          margin: 0 0 6px 0;
          font-size: 14px;
          color: #1f2937;
          font-weight: 600;
        }

        .video-date {
          margin: 0 0 8px 0;
          font-size: 12px;
          color: #9ca3af;
        }

        .video-status {
          display: flex;
          gap: 6px;
        }

        .status-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          background: #f3f4f6;
          color: #374151;
        }

        .status-badge.status-completed {
          background: #d1fae5;
          color: #065f46;
        }

        .status-badge.status-failed {
          background: #fee2e2;
          color: #7f1d1d;
        }

        .video-options {
          position: relative;
        }

        .options-btn {
          width: 100%;
          padding: 8px;
          border: none;
          background: #f9fafb;
          cursor: pointer;
          font-size: 16px;
          transition: all 0.2s ease;
        }

        .options-btn:hover {
          background: #f3f4f6;
        }

        .dropdown-menu {
          position: absolute;
          top: 100%;
          right: 0;
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          overflow: hidden;
          z-index: 10;
          min-width: 150px;
        }

        .dropdown-menu button {
          width: 100%;
          padding: 10px;
          border: none;
          background: none;
          text-align: left;
          cursor: pointer;
          font-size: 14px;
          color: #374151;
          transition: all 0.2s ease;
        }

        .dropdown-menu button:hover {
          background: #f9fafb;
          color: #ef4444;
        }
      `}</style>
    </div>
  );
}

/**
 * VideoDetails - Detailed view of selected video
 */
function VideoDetails({ video, onClose, onDelete, onRate }) {
  return (
    <div className="video-details-modal" onClick={onClose}>
      <div className="video-details-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>✕</button>

        {/* Video Player */}
        {video.composedVideoUrl && (
          <div className="video-player">
            <video controls width="100%" height="auto">
              <source src={video.composedVideoUrl} type="video/mp4" />
              Your browser doesn't support HTML5 video.
            </video>
          </div>
        )}

        {/* Segments */}
        {video.segments && video.segments.length > 0 && (
          <div className="segments-section">
            <h3>Video Segments</h3>
            <div className="segments-list">
              {video.segments.map((segment, i) => (
                <div key={i} className="segment-item">
                  <h4>Segment {segment.index + 1}</h4>
                  <p className="segment-prompt">{segment.prompt}</p>
                  {segment.videoUrl && (
                    <a href={segment.videoUrl} target="_blank" rel="noopener noreferrer">
                      🎬 Download Segment
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Metrics */}
        {video.metrics && (
          <div className="metrics-section">
            <h3>Generation Metrics</h3>
            <div className="metrics-grid">
              <MetricItem
                label="Total Time"
                value={`${(video.metrics.totalTimeMs / 1000).toFixed(1)}s`}
              />
              <MetricItem
                label="Success Rate"
                value={`${video.metrics.successRate.toFixed(1)}%`}
              />
              <MetricItem label="Retries" value={video.metrics.retryCount} />
              <MetricItem label="Errors" value={video.metrics.errors.length} />
            </div>
          </div>
        )}

        {/* Feedback */}
        <div className="feedback-section">
          <h3>Your Feedback</h3>
          <div className="rating">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                className={`star ${star <= (video.userRating || 0) ? 'filled' : ''}`}
                onClick={() => onRate(video._id, star)}
              >
                ⭐
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="details-actions">
          <button
            className="delete-btn"
            onClick={() => {
              onDelete(video._id);
              onClose();
            }}
          >
            🗑️ Delete
          </button>
          {video.composedVideoUrl && (
            <a href={video.composedVideoUrl} download className="download-btn">
              ⬇️ Download
            </a>
          )}
        </div>
      </div>

      <style jsx>{`
        .video-details-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .video-details-content {
          background: white;
          border-radius: 12px;
          max-width: 800px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          padding: 24px;
          position: relative;
        }

        .close-btn {
          position: absolute;
          top: 16px;
          right: 16px;
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #9ca3af;
        }

        .video-player {
          margin-bottom: 24px;
          border-radius: 8px;
          overflow: hidden;
        }

        .video-player video {
          width: 100%;
          height: auto;
        }

        .segments-section,
        .metrics-section,
        .feedback-section {
          margin-bottom: 24px;
          padding-bottom: 24px;
          border-bottom: 1px solid #e5e7eb;
        }

        .segments-section h3,
        .metrics-section h3,
        .feedback-section h3 {
          margin: 0 0 16px 0;
          color: #1f2937;
        }

        .segments-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .segment-item {
          background: #f9fafb;
          padding: 12px;
          border-radius: 8px;
        }

        .segment-item h4 {
          margin: 0 0 8px 0;
          color: #374151;
        }

        .segment-prompt {
          margin: 0 0 8px 0;
          color: #6b7280;
          font-size: 14px;
        }

        .segment-item a {
          color: #8b5cf6;
          text-decoration: none;
          font-size: 14px;
          font-weight: 600;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 16px;
        }

        .rating {
          display: flex;
          gap: 8px;
        }

        .star {
          background: none;
          border: none;
          font-size: 32px;
          cursor: pointer;
          opacity: 0.3;
          transition: opacity 0.2s ease;
        }

        .star.filled {
          opacity: 1;
        }

        .star:hover {
          opacity: 0.6;
        }

        .details-actions {
          display: flex;
          gap: 12px;
        }

        .delete-btn,
        .download-btn {
          flex: 1;
          padding: 12px 16px;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .delete-btn {
          background: #fee2e2;
          color: #7f1d1d;
        }

        .delete-btn:hover {
          background: #fecaca;
        }

        .download-btn {
          background: #8b5cf6;
          color: white;
          text-decoration: none;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .download-btn:hover {
          background: #7c3aed;
        }
      `}</style>
    </div>
  );
}

/**
 * MetricItem - Single metric display
 */
function MetricItem({ label, value }) {
  return (
    <div className="metric-item">
      <span className="metric-label">{label}</span>
      <span className="metric-value">{value}</span>
      <style jsx>{`
        .metric-item {
          background: #f9fafb;
          padding: 12px;
          border-radius: 6px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .metric-label {
          font-size: 12px;
          color: #6b7280;
          font-weight: 600;
        }

        .metric-value {
          font-size: 18px;
          color: #1f2937;
          font-weight: 700;
        }
      `}</style>
    </div>
  );
}

/**
 * AnalyticsDashboard - Analytics overview
 */
function AnalyticsDashboard({ analytics }) {
  return (
    <div className="analytics-dashboard">
      <div className="analytics-grid">
        <StatCard label="Total Generated" value={analytics.totalCount} icon="🎬" />
        <StatCard label="Average Time" value={`${analytics.averageTimeSeconds.toFixed(0)}s`} icon="⏱️" />
        <StatCard label="Success Rate" value={`${analytics.successRate.toFixed(1)}%`} icon="✅" />
        <StatCard label="Average Rating" value={`${analytics.averageRating.toFixed(1)}/5`} icon="⭐" />
      </div>

      {/* Charts would go here */}
      <div className="placeholder">
        More analytics coming soon...
      </div>

      <style jsx>{`
        .analytics-dashboard {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .analytics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }

        .placeholder {
          text-align: center;
          padding: 40px;
          color: #9ca3af;
        }
      `}</style>
    </div>
  );
}

/**
 * StatCard - Statistics card
 */
function StatCard({ label, value, icon }) {
  return (
    <div className="stat-card">
      <span className="stat-icon">{icon}</span>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      <style jsx>{`
        .stat-card {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .stat-icon {
          font-size: 32px;
        }

        .stat-label {
          font-size: 14px;
          color: #6b7280;
          font-weight: 600;
        }

        .stat-value {
          font-size: 24px;
          color: #1f2937;
          font-weight: 700;
        }
      `}</style>
    </div>
  );
}

export default VideoHistoryAndAnalytics;
