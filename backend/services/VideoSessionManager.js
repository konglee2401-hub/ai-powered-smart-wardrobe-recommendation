import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * VideoSessionManager - Manage video generation sessions with frame extraction
 * Handles: Session storage, frame extraction, screenshot storage, image reuse
 */
class VideoSessionManager {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.sessionDir = path.join(process.cwd(), 'uploads', 'sessions', sessionId);
    this.framesDir = path.join(this.sessionDir, 'frames');
    this.screenshotsDir = path.join(this.sessionDir, 'screenshots');
    
    // Ensure directories exist
    this._ensureDirectories();
  }

  /**
   * Ensure all session directories exist
   */
  _ensureDirectories() {
    [this.sessionDir, this.framesDir, this.screenshotsDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Get session metadata file path
   */
  _getMetadataPath() {
    return path.join(this.sessionDir, 'metadata.json');
  }

  /**
   * Load or create session metadata
   */
  loadMetadata() {
    const metadataPath = this._getMetadataPath();
    if (fs.existsSync(metadataPath)) {
      return JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    }
    
    return {
      sessionId: this.sessionId,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      originalImage: null,
      extractedFrames: [],
      screenshots: [],
      videos: [],
      segments: []
    };
  }

  /**
   * Save session metadata
   */
  saveMetadata(metadata) {
    metadata.lastUpdated = Date.now();
    const metadataPath = this._getMetadataPath();
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    return metadata;
  }

  /**
   * Store original image for session
   */
  storeOriginalImage(imageBase64Path, imageData) {
    const metadata = this.loadMetadata();
    
    // Save file info
    if (fs.existsSync(imageBase64Path)) {
      const stats = fs.statSync(imageBase64Path);
      metadata.originalImage = {
        path: imageBase64Path,
        filename: path.basename(imageBase64Path),
        size: stats.size,
        uploadedAt: Date.now(),
        isBase64: true
      };
    }

    this.saveMetadata(metadata);
    return metadata.originalImage;
  }

  /**
   * Extract last frame from video as screenshot
   * Requires FFmpeg to be installed
   */
  async extractLastFrame(videoUrl, videoData = null) {
    try {
      const metadata = this.loadMetadata();
      const timestamp = Date.now();
      const outputPath = path.join(this.screenshotsDir, `last-frame-${timestamp}.png`);
      
      // If videoUrl is a local file path
      if (fs.existsSync(videoUrl)) {
        // Use FFmpeg to extract last frame
        // Get video duration first
        try {
          const durationCmd = `ffprobe -v error -show_entries format=duration -of CSV=p=0 "${videoUrl}"`;
          const duration = parseFloat(execSync(durationCmd, { 
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe']
          }).trim());

          // Extract last frame (duration - 0.5 seconds)
          const frameTime = Math.max(0, duration - 0.5);
          const extractCmd = `ffmpeg -ss ${frameTime} -i "${videoUrl}" -vframes 1 -q:v 2 "${outputPath}" -y`;
          
          execSync(extractCmd, { 
            encoding: 'utf8',
            stdio: 'pipe'
          });

          if (fs.existsSync(outputPath)) {
            const stats = fs.statSync(outputPath);
            
            const frameInfo = {
              id: `frame-${timestamp}`,
              path: outputPath,
              filename: path.basename(outputPath),
              size: stats.size,
              extractedAt: Date.now(),
              sourceVideo: videoUrl,
              format: 'png',
              description: 'Last frame extracted from video'
            };

            metadata.extractedFrames.push(frameInfo);
            this.saveMetadata(metadata);

            return frameInfo;
          }
        } catch (error) {
          console.error('Error extracting frame with FFmpeg:', error.message);
          // Fallback: return error info
          throw new Error(`Failed to extract last frame: ${error.message}`);
        }
      } else {
        // It's a remote URL - would need to download first
        throw new Error('Remote video URL extraction not yet supported. Use local file path.');
      }
    } catch (error) {
      console.error('Error in extractLastFrame:', error);
      throw error;
    }
  }

  /**
   * Get extracted frame as base64 for reuse
   */
  getFrameAsBase64(frameId) {
    const metadata = this.loadMetadata();
    const frame = metadata.extractedFrames.find(f => f.id === frameId);
    
    if (!frame || !fs.existsSync(frame.path)) {
      throw new Error(`Frame ${frameId} not found`);
    }

    const fileContent = fs.readFileSync(frame.path);
    const base64 = fileContent.toString('base64');
    
    return {
      base64: base64,
      title: `data:image/png;base64,${base64}`,
      frameId: frameId,
      originalPath: frame.path,
      usableForNextGeneration: true
    };
  }

  /**
   * List all extracted frames in session
   */
  listExtractedFrames() {
    const metadata = this.loadMetadata();
    return metadata.extractedFrames.map(frame => ({
      id: frame.id,
      filename: frame.filename,
      extractedAt: frame.extractedAt,
      size: frame.size,
      description: frame.description
    }));
  }

  /**
   * Store video result in session
   */
  storeVideoResult(videoData) {
    const metadata = this.loadMetadata();
    
    const videoInfo = {
      id: `video-${Date.now()}`,
      url: videoData.url || videoData.path,
      segmentIndex: videoData.segmentIndex || 0,
      duration: videoData.duration || null,
      size: videoData.size || null,
      prompt: videoData.prompt || null,
      storedAt: Date.now(),
      mimeType: 'video/mp4'
    };

    if (!metadata.videos) {
      metadata.videos = [];
    }
    
    metadata.videos.push(videoInfo);
    this.saveMetadata(metadata);
    
    return videoInfo;
  }

  /**
   * Store segment information
   */
  storeSegment(segmentData) {
    const metadata = this.loadMetadata();
    
    const segmentInfo = {
      id: `segment-${Date.now()}`,
      index: segmentData.index || 0,
      prompt: segmentData.prompt,
      videoId: segmentData.videoId,
      status: segmentData.status || 'pending',
      createdAt: Date.now(),
      completedAt: null,
      duration: null
    };

    if (!metadata.segments) {
      metadata.segments = [];
    }

    metadata.segments.push(segmentInfo);
    this.saveMetadata(metadata);
    
    return segmentInfo;
  }

  /**
   * Update segment status
   */
  updateSegmentStatus(segmentId, status, completionData = {}) {
    const metadata = this.loadMetadata();
    
    if (!metadata.segments) {
      metadata.segments = [];
    }

    const segment = metadata.segments.find(s => s.id === segmentId);
    if (segment) {
      segment.status = status;
      if (status === 'completed') {
        segment.completedAt = Date.now();
        segment.duration = completionData.duration || null;
      }
    }

    this.saveMetadata(metadata);
    return segment;
  }

  /**
   * Store composed video
   */
  storeComposedVideo(composedVideoPath) {
    const metadata = this.loadMetadata();
    
    if (fs.existsSync(composedVideoPath)) {
      const stats = fs.statSync(composedVideoPath);
      
      metadata.composedVideo = {
        path: composedVideoPath,
        filename: path.basename(composedVideoPath),
        size: stats.size,
        composedAt: Date.now(),
        segments: metadata.videos.length || metadata.segments.length
      };

      this.saveMetadata(metadata);
      return metadata.composedVideo;
    }

    throw new Error('Composed video file not found');
  }

  /**
   * Get prepared data for next generation (using extracted frame)
   */
  getPreparedImageData(frameId) {
    const base64Data = this.getFrameAsBase64(frameId);
    
    // Remove data URI prefix if present
    let base64String = base64Data.base64;
    if (base64String.includes(',')) {
      base64String = base64String.split(',')[1];
    }

    return {
      frameId: frameId,
      base64: base64String,
      source: 'extracted_frame',
      previousSessionId: this.sessionId,
      readyForGeneration: true,
      description: 'Frame extracted from previous video generation'
    };
  }

  /**
   * Clean up old session data (keep only latest N sessions)
   */
  static clearOldSessions(maxSessions = 10) {
    const sessionsDir = path.join(process.cwd(), 'uploads', 'sessions');
    
    if (!fs.existsSync(sessionsDir)) {
      return;
    }

    const sessions = fs.readdirSync(sessionsDir)
      .filter(f => fs.statSync(path.join(sessionsDir, f)).isDirectory())
      .map(name => ({
        name,
        time: fs.statSync(path.join(sessionsDir, name)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);

    // Remove old sessions
    for (let i = maxSessions; i < sessions.length; i++) {
      const sessionPath = path.join(sessionsDir, sessions[i].name);
      console.log(`Cleaning up old session: ${sessions[i].name}`);
      
      try {
        fs.rmSync(sessionPath, { recursive: true, force: true });
      } catch (error) {
        console.error(`Failed to clean up session ${sessions[i].name}:`, error.message);
      }
    }
  }

  /**
   * Export session data for archive
   */
  exportSessionData() {
    const metadata = this.loadMetadata();
    
    return {
      session: {
        id: this.sessionId,
        metadata: metadata,
        paths: {
          session: this.sessionDir,
          frames: this.framesDir,
          screenshots: this.screenshotsDir
        }
      }
    };
  }
}

export default VideoSessionManager;
