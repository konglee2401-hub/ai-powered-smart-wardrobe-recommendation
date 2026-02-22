/**
 * Media Library Service
 * - Manage template videos, audio tracks, source videos
 * - Organize by categories and platforms
 * - Auto-select random media for mashups
 * - Cleanup old/used media
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mediaDir = path.join(__dirname, '../media');

class MediaLibraryService {
  constructor() {
    this.ensureDirectories();
    this.libraryIndex = path.join(mediaDir, 'library-index.json');
    this.loadIndex();
  }

  ensureDirectories() {
    const dirs = [
      'templates',
      'hot-videos',
      'audio/upbeat',
      'audio/calm',
      'audio/trending',
      'audio/commercial',
      'products',
      'mashups'
    ];

    dirs.forEach(dir => {
      const dirPath = path.join(mediaDir, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    });
  }

  /**
   * Load library index from file
   */
  loadIndex() {
    try {
      if (fs.existsSync(this.libraryIndex)) {
        const data = fs.readFileSync(this.libraryIndex, 'utf8');
        this.index = JSON.parse(data);
      } else {
        this.index = {
          templates: [],
          hotVideos: [],
          audio: [],
          products: [],
          lastUpdated: new Date()
        };
        this.saveIndex();
      }
    } catch (error) {
      console.error('Error loading index:', error);
      this.index = {
        templates: [],
        hotVideos: [],
        audio: [],
        products: [],
        lastUpdated: new Date()
      };
    }
  }

  /**
   * Save library index to file
   */
  saveIndex() {
    try {
      this.index.lastUpdated = new Date();
      fs.writeFileSync(this.libraryIndex, JSON.stringify(this.index, null, 2));
    } catch (error) {
      console.error('Error saving index:', error);
    }
  }

  /**
   * Add template video to library
   */
  addTemplateVideo(config) {
    try {
      const {
        filePath,
        name,
        description = '',
        duration,
        category = 'general', // fashion, cooking, unboxing, reviews, general
        platform = 'all', // tiktok, youtube, facebook, all
        tags = [],
        metadata = {}
      } = config;

      if (!fs.existsSync(filePath)) {
        return { success: false, error: `File not found: ${filePath}` };
      }

      const fileSize = fs.statSync(filePath).size;
      const fileName = path.basename(filePath);
      const templateId = `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const templateEntry = {
        id: templateId,
        name,
        description,
        filePath,
        fileName,
        fileSize,
        duration,
        category,
        platform,
        tags,
        metadata,
        createdAt: new Date(),
        usageCount: 0,
        lastUsed: null
      };

      // Copy file to templates directory
      const destPath = path.join(mediaDir, 'templates', fileName);
      fs.copyFileSync(filePath, destPath);
      templateEntry.filePath = destPath;

      this.index.templates.push(templateEntry);
      this.saveIndex();

      return {
        success: true,
        id: templateId,
        template: templateEntry,
        message: 'Template video added successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Add hot video (for mashup sources)
   */
  addHotVideo(config) {
    try {
      const {
        filePath,
        source = 'downloaded', // downloaded, uploaded, generated
        title = '',
        duration,
        platform = 'all',
        tags = [],
        metadata = {}
      } = config;

      if (!fs.existsSync(filePath)) {
        return { success: false, error: `File not found: ${filePath}` };
      }

      const fileSize = fs.statSync(filePath).size;
      const fileName = path.basename(filePath);
      const hotVideoId = `hot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const videoEntry = {
        id: hotVideoId,
        title,
        filePath,
        fileName,
        fileSize,
        duration,
        source,
        platform,
        tags,
        metadata,
        createdAt: new Date(),
        usageCount: 0,
        lastUsed: null
      };

      // Copy to hot-videos directory
      const destPath = path.join(mediaDir, 'hot-videos', fileName);
      fs.copyFileSync(filePath, destPath);
      videoEntry.filePath = destPath;

      this.index.hotVideos.push(videoEntry);
      this.saveIndex();

      return {
        success: true,
        id: hotVideoId,
        hotVideo: videoEntry,
        message: 'Hot video added successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Add audio track to library
   */
  addAudio(config) {
    try {
      const {
        filePath,
        name,
        category = 'calm', // upbeat, calm, trending, commercial
        duration,
        mood = [], // energetic, relaxing, dramatic, fun
        tags = [],
        metadata = {}
      } = config;

      if (!fs.existsSync(filePath)) {
        return { success: false, error: `File not found: ${filePath}` };
      }

      // Validate duration
      if (!duration || duration <= 0) {
        return { success: false, error: 'Duration must be greater than 0' };
      }

      const fileSize = fs.statSync(filePath).size;
      const fileName = path.basename(filePath);
      const audioId = `audio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const audioEntry = {
        id: audioId,
        name,
        filePath,
        fileName,
        fileSize,
        duration,
        category,
        mood,
        tags,
        metadata,
        createdAt: new Date(),
        usageCount: 0,
        lastUsed: null
      };

      // Copy to audio category directory
      const categoryDir = path.join(mediaDir, 'audio', category);
      if (!fs.existsSync(categoryDir)) {
        fs.mkdirSync(categoryDir, { recursive: true });
      }

      const destPath = path.join(categoryDir, fileName);
      fs.copyFileSync(filePath, destPath);
      audioEntry.filePath = destPath;

      this.index.audio.push(audioEntry);
      this.saveIndex();

      return {
        success: true,
        id: audioId,
        audio: audioEntry,
        message: 'Audio track added successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get random template video
   */
  getRandomTemplate(filters = {}) {
    try {
      const { platform = 'all', category = null } = filters;

      let templates = this.index.templates;

      if (platform !== 'all') {
        templates = templates.filter(t => t.platform === platform || t.platform === 'all');
      }

      if (category) {
        templates = templates.filter(t => t.category === category);
      }

      if (templates.length === 0) {
        return { success: false, error: 'No matching templates found' };
      }

      const template = templates[Math.floor(Math.random() * templates.length)];
      
      // Update usage stats
      template.usageCount++;
      template.lastUsed = new Date();
      this.saveIndex();

      return {
        success: true,
        template
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get random hot video
   */
  getRandomHotVideo(filters = {}) {
    try {
      const { platform = 'all', tags = [] } = filters;

      let videos = this.index.hotVideos;

      if (platform !== 'all') {
        videos = videos.filter(v => v.platform === platform || v.platform === 'all');
      }

      if (tags.length > 0) {
        videos = videos.filter(v => tags.some(tag => v.tags.includes(tag)));
      }

      if (videos.length === 0) {
        return { success: false, error: 'No matching hot videos found' };
      }

      const video = videos[Math.floor(Math.random() * videos.length)];
      
      // Update usage stats
      video.usageCount++;
      video.lastUsed = new Date();
      this.saveIndex();

      return {
        success: true,
        hotVideo: video
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get random audio track
   */
  getRandomAudio(filters = {}) {
    try {
      const { category = null, mood = [], duration = null } = filters;

      let audio = this.index.audio;

      if (category) {
        audio = audio.filter(a => a.category === category);
      }

      if (mood.length > 0) {
        audio = audio.filter(a => mood.some(m => a.mood.includes(m)));
      }

      if (duration && duration > 0) {
        // Find audio that can fit the duration (with tolerance of ±2 seconds)
        audio = audio.filter(a => Math.abs(a.duration - duration) <= 2);
      }

      if (audio.length === 0) {
        return { success: false, error: 'No matching audio found' };
      }

      const track = audio[Math.floor(Math.random() * audio.length)];
      
      // Update usage stats
      track.usageCount++;
      track.lastUsed = new Date();
      this.saveIndex();

      return {
        success: true,
        audio: track
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * List all media by type
   */
  listMedia(type = 'all', filters = {}) {
    try {
      let results = {
        templates: [],
        hotVideos: [],
        audio: []
      };

      if (type === 'all' || type === 'templates') {
        results.templates = this.filterMedia(this.index.templates, filters);
      }

      if (type === 'all' || type === 'hot-videos') {
        results.hotVideos = this.filterMedia(this.index.hotVideos, filters);
      }

      if (type === 'all' || type === 'audio') {
        results.audio = this.filterMedia(this.index.audio, filters);
      }

      return {
        success: true,
        results,
        summary: {
          totalTemplates: results.templates.length,
          totalHotVideos: results.hotVideos.length,
          totalAudio: results.audio.length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Filter media by criteria
   */
  filterMedia(mediaArray, filters) {
    let filtered = mediaArray;

    if (filters.platform) {
      filtered = filtered.filter(m => m.platform === filters.platform || m.platform === 'all');
    }

    if (filters.category) {
      filtered = filtered.filter(m => m.category === filters.category);
    }

    if (filters.minDuration) {
      filtered = filtered.filter(m => m.duration >= filters.minDuration);
    }

    if (filters.maxDuration) {
      filtered = filtered.filter(m => m.duration <= filters.maxDuration);
    }

    if (filters.tag) {
      filtered = filtered.filter(m => m.tags && m.tags.includes(filters.tag));
    }

    if (filters.sortBy) {
      switch (filters.sortBy) {
        case 'newest':
          filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          break;
        case 'oldest':
          filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          break;
        case 'most-used':
          filtered.sort((a, b) => b.usageCount - a.usageCount);
          break;
        case 'least-used':
          filtered.sort((a, b) => a.usageCount - b.usageCount);
          break;
      }
    }

    return filtered;
  }

  /**
   * Get media by ID
   */
  getMediaById(mediaId) {
    try {
      let media = null;

      // Search in all collections
      media = this.index.templates.find(m => m.id === mediaId);
      if (!media) media = this.index.hotVideos.find(m => m.id === mediaId);
      if (!media) media = this.index.audio.find(m => m.id === mediaId);

      if (!media) {
        return { success: false, error: `Media not found: ${mediaId}` };
      }

      return {
        success: true,
        media
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete media from library
   */
  deleteMedia(mediaId) {
    try {
      let deleted = false;

      // Delete from templates
      let index = this.index.templates.findIndex(m => m.id === mediaId);
      if (index !== -1) {
        const media = this.index.templates[index];
        if (fs.existsSync(media.filePath)) {
          fs.unlinkSync(media.filePath);
        }
        this.index.templates.splice(index, 1);
        deleted = true;
      }

      // Delete from hot videos
      if (!deleted) {
        index = this.index.hotVideos.findIndex(m => m.id === mediaId);
        if (index !== -1) {
          const media = this.index.hotVideos[index];
          if (fs.existsSync(media.filePath)) {
            fs.unlinkSync(media.filePath);
          }
          this.index.hotVideos.splice(index, 1);
          deleted = true;
        }
      }

      // Delete from audio
      if (!deleted) {
        index = this.index.audio.findIndex(m => m.id === mediaId);
        if (index !== -1) {
          const media = this.index.audio[index];
          if (fs.existsSync(media.filePath)) {
            fs.unlinkSync(media.filePath);
          }
          this.index.audio.splice(index, 1);
          deleted = true;
        }
      }

      if (!deleted) {
        return { success: false, error: `Media not found: ${mediaId}` };
      }

      this.saveIndex();

      return {
        success: true,
        message: 'Media deleted successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get library statistics
   */
  getStats() {
    try {
      const templateSize = this.index.templates.reduce((sum, t) => sum + (t.fileSize || 0), 0);
      const hotVideoSize = this.index.hotVideos.reduce((sum, h) => sum + (h.fileSize || 0), 0);
      const audioSize = this.index.audio.reduce((sum, a) => sum + (a.fileSize || 0), 0);

      const totalSize = templateSize + hotVideoSize + audioSize;

      return {
        success: true,
        stats: {
          templates: {
            count: this.index.templates.length,
            totalSize: templateSize,
            totalDuration: this.index.templates.reduce((sum, t) => sum + (t.duration || 0), 0),
            totalUsage: this.index.templates.reduce((sum, t) => sum + (t.usageCount || 0), 0)
          },
          hotVideos: {
            count: this.index.hotVideos.length,
            totalSize: hotVideoSize,
            totalDuration: this.index.hotVideos.reduce((sum, h) => sum + (h.duration || 0), 0),
            totalUsage: this.index.hotVideos.reduce((sum, h) => sum + (h.usageCount || 0), 0)
          },
          audio: {
            count: this.index.audio.length,
            totalSize: audioSize,
            totalDuration: this.index.audio.reduce((sum, a) => sum + (a.duration || 0), 0),
            totalUsage: this.index.audio.reduce((sum, a) => sum + (a.usageCount || 0), 0)
          },
          library: {
            totalFiles: this.index.templates.length + this.index.hotVideos.length + this.index.audio.length,
            totalSize: totalSize,
            totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2)
          },
          lastUpdated: this.index.lastUpdated
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Cleanup old/unused media
   */
  cleanupOldMedia(config = {}) {
    try {
      const {
        daysOld = 30,
        minUsageCount = 0,
        deleteUnused = false
      } = config;

      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
      let deletedCount = 0;

      // Check templates
      this.index.templates = this.index.templates.filter(t => {
        if (new Date(t.createdAt) < cutoffDate && t.usageCount <= minUsageCount) {
          if (deleteUnused && fs.existsSync(t.filePath)) {
            fs.unlinkSync(t.filePath);
            deletedCount++;
          }
          return !deleteUnused;
        }
        return true;
      });

      // Check hot videos
      this.index.hotVideos = this.index.hotVideos.filter(h => {
        if (new Date(h.createdAt) < cutoffDate && h.usageCount <= minUsageCount) {
          if (deleteUnused && fs.existsSync(h.filePath)) {
            fs.unlinkSync(h.filePath);
            deletedCount++;
          }
          return !deleteUnused;
        }
        return true;
      });

      // Check audio
      this.index.audio = this.index.audio.filter(a => {
        if (new Date(a.createdAt) < cutoffDate && a.usageCount <= minUsageCount) {
          if (deleteUnused && fs.existsSync(a.filePath)) {
            fs.unlinkSync(a.filePath);
            deletedCount++;
          }
          return !deleteUnused;
        }
        return true;
      });

      this.saveIndex();

      return {
        success: true,
        deleted: deletedCount,
        message: `Cleaned up ${deletedCount} old media files`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new MediaLibraryService();
