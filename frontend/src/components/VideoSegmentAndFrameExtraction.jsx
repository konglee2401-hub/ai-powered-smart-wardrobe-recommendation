import React, { useState, useEffect } from 'react';
import axios from 'axios';

/**
 * VideoSegmentAndFrameExtraction - Display video segments and extract/manage last frames
 */
function VideoSegmentAndFrameExtraction({ sessionId, videoSegments, onFrameSelected }) {
  const [extractedFrames, setExtractedFrames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFrame, setSelectedFrame] = useState(null);
  const [showFrameSelector, setShowFrameSelector] = useState(false);

  useEffect(() => {
    // Load previously extracted frames if available
    if (sessionId) {
      loadExtractedFrames();
    }
  }, [sessionId]);

  const loadExtractedFrames = async () => {
    try {
      const response = await axios.get(`/api/v1/video/session/${sessionId}/frames`);
      setExtractedFrames(response.data.frames || []);
    } catch (err) {
      console.error('Error loading frames:', err);
    }
  };

  const handleExtractLastFrame = async (videoIndex) => {
    if (!videoSegments[videoIndex]) {
      alert('Video not found');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const videoUrl = videoSegments[videoIndex].url || videoSegments[videoIndex].path;

      const response = await axios.post(`/api/v1/video/extract-frame`, {
        sessionId,
        videoUrl,
        videoIndex,
        framePosition: 'last-frame'
      });

      const extractedFrame = response.data.frame;
      setExtractedFrames([...extractedFrames, extractedFrame]);

      // Auto-select the newly extracted frame
      setSelectedFrame(extractedFrame);
    } catch (err) {
      setError(`Failed to extract frame: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUseFrameForNextGeneration = async (frameId) => {
    if (!frameId) {
      alert('Please select a frame first');
      return;
    }

    try {
      const response = await axios.get(`/api/v1/video/session/${sessionId}/frame/${frameId}/base64`);
      
      const frameData = {
        frameId: frameId,
        base64: response.data.base64,
        source: 'extracted_frame',
        previousSessionId: sessionId,
        description: 'Extracted from previous video generation'
      };

      if (onFrameSelected) {
        onFrameSelected(frameData);
      }
    } catch (err) {
      alert('Failed to prepare frame for next generation');
    }
  };

  const handleDeleteFrame = async (frameId) => {
    if (window.confirm('Delete this extracted frame?')) {
      try {
        await axios.delete(`/api/v1/video/session/${sessionId}/frame/${frameId}`);
        setExtractedFrames(extractedFrames.filter(f => f.id !== frameId));
        setSelectedFrame(null);
      } catch (err) {
        alert('Failed to delete frame');
      }
    }
  };

  return (
    <div className="video-segment-frame-container">
      {/* Video Segments */}
      <div className="segments-section">
        <h3>📹 Video Segments</h3>
        
        {videoSegments && videoSegments.length > 0 ? (
          <div className="segments-carousel">
            {videoSegments.map((segment, index) => (
              <div key={index} className="segment-card">
                {/* Video */}
                <div className="segment-video">
                  {segment.url || segment.path ? (
                    <>
                      <video
                        src={segment.url || segment.path}
                        controls
                        preload="metadata"
                        style={{ width: '100%', borderRadius: '8px' }}
                      />
                      <div className="segment-actions">
                        <button
                          className="extract-btn"
                          onClick={() => handleExtractLastFrame(index)}
                          disabled={loading}
                        >
                          📸 Extract Last Frame
                        </button>
                        <a
                          href={segment.url || segment.path}
                          download
                          className="download-btn"
                        >
                          ⬇️ Download
                        </a>
                      </div>
                    </>
                  ) : (
                    <div className="video-loading">
                      <div className="spinner"></div>
                      <p>Generating segment...</p>
                    </div>
                  )}
                </div>

                {/* Segment Info */}
                <div className="segment-info">
                  <h4>Segment {index + 1}</h4>
                  <p className="segment-prompt">{segment.prompt || 'No prompt'}</p>
                  {segment.duration && (
                    <p className="segment-duration">⏱️ {segment.duration}s</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>No video segments available yet</p>
          </div>
        )}

        {error && <div className="error-message">{error}</div>}
      </div>

      {/* Extracted Frames */}
      {extractedFrames.length > 0 && (
        <div className="frames-section">
          <h3>🖼️ Extracted Frames</h3>
          <p className="frames-subtitle">
            Use extracted frames as the base image for your next video generation
          </p>

          <div className="frames-grid">
            {extractedFrames.map((frame) => (
              <div
                key={frame.id}
                className={`frame-card ${selectedFrame?.id === frame.id ? 'selected' : ''}`}
                onClick={() => setSelectedFrame(frame)}
              >
                {/* Frame Image */}
                <div className="frame-image">
                  <img
                    src={frame.thumbnail || `/api/v1/video/frame/${frame.id}/thumbnail`}
                    alt={`Frame ${frame.id}`}
                  />
                  <div className="frame-overlay">
                    <button className="view-full-btn">View</button>
                  </div>
                </div>

                {/* Frame Info */}
                <div className="frame-info">
                  <h4>{frame.description || `Frame ${extractedFrames.indexOf(frame) + 1}`}</h4>
                  <p className="frame-date">
                    {new Date(frame.extractedAt).toLocaleString()}
                  </p>
                  <p className="frame-source">
                    From Segment {frame.videoSegmentIndex + 1}
                  </p>
                </div>

                {/* Frame Actions */}
                <div className="frame-actions">
                  <button
                    className="use-frame-btn"
                    onClick={() => handleUseFrameForNextGeneration(frame.id)}
                    title="Use this frame as base image for next generation"
                  >
                    ↻ Use for Next Generation
                  </button>
                  <button
                    className="delete-frame-btn"
                    onClick={() => handleDeleteFrame(frame.id)}
                    title="Delete this extracted frame"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Selected Frame Preview Modal */}
          {selectedFrame && (
            <div className="frame-preview-modal" onClick={() => setSelectedFrame(null)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="close-btn" onClick={() => setSelectedFrame(null)}>✕</button>

                <div className="preview-image">
                  <img
                    src={selectedFrame.thumbnail || `/api/v1/video/frame/${selectedFrame.id}/thumbnail`}
                    alt="Preview"
                  />
                </div>

                <div className="preview-info">
                  <h3>{selectedFrame.description || 'Extracted Frame'}</h3>
                  <p>
                    Extracted from Segment {selectedFrame.videoSegmentIndex + 1} at{' '}
                    {new Date(selectedFrame.extractedAt).toLocaleString()}
                  </p>
                </div>

                <button
                  className="use-this-frame-btn"
                  onClick={() => {
                    handleUseFrameForNextGeneration(selectedFrame.id);
                    setSelectedFrame(null);
                  }}
                >
                  ↻ Use This Frame for Next Generation
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .video-segment-frame-container {
          display: flex;
          flex-direction: column;
          gap: 32px;
          padding: 20px;
        }

        .segments-section,
        .frames-section {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .segments-section h3,
        .frames-section h3 {
          margin: 0;
          color: #1f2937;
          font-size: 18px;
        }

        .frames-subtitle {
          margin: 0;
          color: #6b7280;
          font-size: 14px;
        }

        /* Segments Carousel */
        .segments-carousel {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 16px;
        }

        .segment-card {
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          transition: all 0.2s ease;
        }

        .segment-card:hover {
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
          transform: translateY(-2px);
        }

        .segment-video {
          position: relative;
          background: #000;
          display: flex;
          flex-direction: column;
        }

        .video-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          color: #6b7280;
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #f3f4f6;
          border-top-color: #8b5cf6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 12px;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .segment-actions {
          display: flex;
          gap: 8px;
          padding: 8px;
        }

        .extract-btn,
        .download-btn {
          flex: 1;
          padding: 10px 12px;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .extract-btn {
          background: #8b5cf6;
          color: white;
        }

        .extract-btn:hover:not(:disabled) {
          background: #7c3aed;
        }

        .extract-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .download-btn {
          background: #f3f4f6;
          color: #374151;
          text-decoration: none;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .download-btn:hover {
          background: #e5e7eb;
        }

        .segment-info {
          padding: 12px;
        }

        .segment-info h4 {
          margin: 0 0 6px 0;
          color: #1f2937;
          font-size: 14px;
        }

        .segment-prompt {
          margin: 0 0 6px 0;
          color: #6b7280;
          font-size: 13px;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .segment-duration {
          margin: 0;
          color: #9ca3af;
          font-size: 12px;
        }

        /* Frames Grid */
        .frames-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 12px;
        }

        .frame-card {
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          cursor: pointer;
          transition: all 0.2s ease;
          border: 2px solid transparent;
        }

        .frame-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          transform: translateY(-2px);
        }

        .frame-card.selected {
          border-color: #8b5cf6;
          background: #f9f5ff;
        }

        .frame-image {
          position: relative;
          width: 100%;
          padding-bottom: 75%;
          overflow: hidden;
          background: #000;
        }

        .frame-image img {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .frame-overlay {
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

        .frame-card:hover .frame-overlay {
          opacity: 1;
        }

        .view-full-btn {
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.9);
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 600;
          color: #1f2937;
        }

        .frame-info {
          padding: 12px;
        }

        .frame-info h4 {
          margin: 0 0 4px 0;
          color: #1f2937;
          font-size: 13px;
          font-weight: 600;
        }

        .frame-date,
        .frame-source {
          margin: 0 0 2px 0;
          color: #9ca3af;
          font-size: 12px;
        }

        .frame-actions {
          display: flex;
          gap: 6px;
          padding: 8px;
          border-top: 1px solid #e5e7eb;
        }

        .use-frame-btn,
        .delete-frame-btn {
          border: none;
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .use-frame-btn {
          flex: 1;
          background: #d1fae5;
          color: #065f46;
          padding: 6px;
        }

        .use-frame-btn:hover {
          background: #a7f3d0;
        }

        .delete-frame-btn {
          background: #fee2e2;
          color: #7f1d1d;
          padding: 6px 10px;
        }

        .delete-frame-btn:hover {
          background: #fecaca;
        }

        /* Frame Preview Modal */
        .frame-preview-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal-content {
          background: white;
          border-radius: 12px;
          max-width: 500px;
          width: 100%;
          overflow: hidden;
          position: relative;
        }

        .close-btn {
          position: absolute;
          top: 12px;
          right: 12px;
          background: white;
          border: none;
          font-size: 24px;
          cursor: pointer;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          z-index: 10;
        }

        .preview-image {
          width: 100%;
          background: #000;
        }

        .preview-image img {
          width: 100%;
          height: auto;
          display: block;
        }

        .preview-info {
          padding: 20px;
        }

        .preview-info h3 {
          margin: 0 0 8px 0;
          color: #1f2937;
        }

        .preview-info p {
          margin: 0 0 16px 0;
          color: #6b7280;
          font-size: 14px;
          line-height: 1.5;
        }

        .use-this-frame-btn {
          width: 100%;
          padding: 12px;
          background: #8b5cf6;
          color: white;
          border: none;
          border-radius: 0;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .use-this-frame-btn:hover {
          background: #7c3aed;
        }

        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: #9ca3af;
        }

        .error-message {
          padding: 12px;
          background: #fee2e2;
          border: 1px solid #fecaca;
          border-radius: 6px;
          color: #7f1d1d;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
}

export default VideoSegmentAndFrameExtraction;
