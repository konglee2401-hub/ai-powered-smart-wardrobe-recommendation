import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';
import { execFile } from 'child_process';
import { google } from 'googleapis';
import mongoose from 'mongoose';

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(backendRoot, '..');

class TrendYoutubeUploadService {
  constructor() {
    this.youtubeClientId = process.env.YOUTUBE_OAUTH_CLIENT_ID || process.env.OAUTH_CLIENT_ID || '';
    this.youtubeClientSecret = process.env.YOUTUBE_OAUTH_CLIENT_SECRET || process.env.OAUTH_CLIENT_SECRET || '';
    this.youtubeRedirectUri = process.env.YOUTUBE_OAUTH_REDIRECT_URI || 'http://localhost:5000/api/shorts-reels/youtube/oauth/callback';
    this.youtubeTokenPath = path.resolve(
      backendRoot,
      process.env.YOUTUBE_OAUTH_TOKEN_PATH || 'config/youtube-token.json'
    );

    this.trendMongoUri = process.env.TREND_AUTOMATION_MONGO_URI || 'mongodb://localhost:27017/smart_wardrobe';
    this.trendDbName = process.env.TREND_AUTOMATION_DB_NAME || 'smart_wardrobe';
    this.defaultPrivacy = process.env.YOUTUBE_UPLOAD_PRIVACY || 'private';
    this.defaultCategoryId = process.env.YOUTUBE_UPLOAD_CATEGORY_ID || '24';
  }

  _assertOAuthConfigured() {
    if (!this.youtubeClientId || !this.youtubeClientSecret) {
      throw new Error('Missing YouTube OAuth credentials. Set YOUTUBE_OAUTH_CLIENT_ID and YOUTUBE_OAUTH_CLIENT_SECRET');
    }
  }

  _createOAuthClient() {
    this._assertOAuthConfigured();
    return new google.auth.OAuth2(this.youtubeClientId, this.youtubeClientSecret, this.youtubeRedirectUri);
  }

  getAuthorizationUrl() {
    const oauth2 = this._createOAuthClient();
    const scopes = [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.readonly'
    ];

    const authUrl = oauth2.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes
    });

    return {
      authUrl,
      redirectUri: this.youtubeRedirectUri,
      tokenPath: this.youtubeTokenPath
    };
  }

  async exchangeCodeForToken(code) {
    if (!code) {
      throw new Error('OAuth code is required');
    }

    const oauth2 = this._createOAuthClient();
    const { tokens } = await oauth2.getToken(code);

    await fsp.mkdir(path.dirname(this.youtubeTokenPath), { recursive: true });
    await fsp.writeFile(this.youtubeTokenPath, JSON.stringify(tokens, null, 2), 'utf-8');

    return {
      success: true,
      tokenSaved: true,
      tokenPath: this.youtubeTokenPath,
      hasRefreshToken: !!tokens.refresh_token
    };
  }

  async _loadAuthedClient() {
    const oauth2 = this._createOAuthClient();

    if (!fs.existsSync(this.youtubeTokenPath)) {
      const auth = this.getAuthorizationUrl();
      const err = new Error('YouTube token not found. Complete OAuth first.');
      err.code = 'YOUTUBE_TOKEN_MISSING';
      err.authUrl = auth.authUrl;
      err.redirectUri = auth.redirectUri;
      throw err;
    }

    const tokenRaw = await fsp.readFile(this.youtubeTokenPath, 'utf-8');
    const token = JSON.parse(tokenRaw);
    oauth2.setCredentials(token);

    if (token.expiry_date && token.expiry_date <= Date.now() && token.refresh_token) {
      const { credentials } = await oauth2.refreshAccessToken();
      const merged = { ...token, ...credentials };
      await fsp.writeFile(this.youtubeTokenPath, JSON.stringify(merged, null, 2), 'utf-8');
      oauth2.setCredentials(merged);
    }

    return oauth2;
  }

  async _withTrendCollection(fn) {
    const conn = await mongoose.createConnection(this.trendMongoUri, { dbName: this.trendDbName }).asPromise();
    try {
      const collection = conn.db.collection('trendvideos');
      return await fn(collection);
    } finally {
      await conn.close();
    }
  }

  _resolveVideoPath(rawPath) {
    if (!rawPath) return '';

    const pathCandidates = [
      rawPath,
      path.resolve(workspaceRoot, rawPath),
      path.resolve(path.join(workspaceRoot, 'scraper_service'), rawPath),
      path.resolve(path.join(workspaceRoot, 'scraper_service', 'app'), rawPath)
    ];

    for (const candidate of pathCandidates) {
      if (candidate && fs.existsSync(candidate)) {
        return candidate;
      }
    }

    return '';
  }

  async _downloadVideoFromSource(url, outputFilePath) {
    await fsp.mkdir(path.dirname(outputFilePath), { recursive: true });

    const args = [
      '--no-playlist',
      '-f', 'mp4/bestvideo+bestaudio/best',
      '-o', outputFilePath,
      url
    ];

    try {
      await execFileAsync('yt-dlp', args, { timeout: 10 * 60 * 1000, maxBuffer: 10 * 1024 * 1024 });
    } catch (error) {
      const detail = error?.stderr || error?.stdout || error?.message || 'unknown error';
      throw new Error(`yt-dlp download failed: ${detail}`);
    }

    if (!fs.existsSync(outputFilePath)) {
      throw new Error(`Downloaded file not found at ${outputFilePath}`);
    }

    return outputFilePath;
  }

  async _pickDailyhahaVideo({ preferDone = true } = {}) {
    return this._withTrendCollection(async (collection) => {
      let doc = null;

      if (preferDone) {
        doc = await collection.findOne(
          { platform: 'dailyhaha', downloadStatus: 'done' },
          { sort: { downloadedAt: -1, discoveredAt: -1 } }
        );
      }

      if (!doc) {
        doc = await collection.findOne(
          { platform: 'dailyhaha' },
          { sort: { discoveredAt: -1, views: -1 } }
        );
      }

      return doc;
    });
  }

  async _markUploadResult(videoObjectId, payload) {
    return this._withTrendCollection(async (collection) => {
      await collection.updateOne(
        { _id: videoObjectId },
        {
          $set: {
            ...payload,
            updatedAt: new Date()
          }
        }
      );
    });
  }

  async uploadOneDailyhahaVideo(options = {}) {
    const {
      titlePrefix = 'DailyHaha',
      description = 'Auto upload from DailyHaha pipeline',
      privacyStatus = this.defaultPrivacy,
      categoryId = this.defaultCategoryId,
      tags = ['dailyhaha', 'shorts', 'funny'],
      cleanupTemp = true
    } = options;

    const auth = await this._loadAuthedClient();
    const youtube = google.youtube({ version: 'v3', auth });

    const videoDoc = await this._pickDailyhahaVideo({ preferDone: true });
    if (!videoDoc) {
      throw new Error('No DailyHaha video found in trendvideos collection');
    }

    const originalLocalPath = videoDoc.localPath || '';
    let resolvedPath = this._resolveVideoPath(originalLocalPath);
    let downloadedTempPath = '';

    try {
      if (!resolvedPath) {
        if (!videoDoc.url) {
          throw new Error('Selected DailyHaha video has no localPath and no source URL for fallback download');
        }

        const safeName = `${videoDoc.videoId || `dailyhaha-${Date.now()}`}.mp4`.replace(/[\\/:*?"<>|]/g, '-');
        downloadedTempPath = path.resolve(workspaceRoot, 'temp', 'youtube-upload-test', safeName);
        resolvedPath = await this._downloadVideoFromSource(videoDoc.url, downloadedTempPath);
      }

      const videoTitle = `${titlePrefix} | ${videoDoc.title || videoDoc.videoId || 'untitled'}`.slice(0, 95);

      const insertResponse = await youtube.videos.insert({
        part: ['snippet', 'status'],
        requestBody: {
          snippet: {
            title: videoTitle,
            description,
            tags,
            categoryId
          },
          status: {
            privacyStatus
          }
        },
        media: {
          body: fs.createReadStream(resolvedPath)
        }
      });

      const uploadedVideoId = insertResponse?.data?.id;
      if (!uploadedVideoId) {
        throw new Error('YouTube upload failed: missing video ID in response');
      }

      const watchUrl = `https://www.youtube.com/watch?v=${uploadedVideoId}`;

      await this._markUploadResult(videoDoc._id, {
        youtubeUploadStatus: 'done',
        youtubeVideoId: uploadedVideoId,
        youtubeUrl: watchUrl,
        youtubeUploadedAt: new Date(),
        youtubeUploadError: ''
      });

      return {
        success: true,
        sourceVideo: {
          id: String(videoDoc._id),
          platform: videoDoc.platform,
          videoId: videoDoc.videoId,
          title: videoDoc.title,
          localPath: originalLocalPath || null,
          uploadFilePath: resolvedPath
        },
        youtube: {
          videoId: uploadedVideoId,
          url: watchUrl,
          privacyStatus
        },
        usedFallbackDownload: !!downloadedTempPath
      };
    } catch (error) {
      await this._markUploadResult(videoDoc._id, {
        youtubeUploadStatus: 'failed',
        youtubeUploadError: error.message,
        youtubeUploadedAt: null
      });
      throw error;
    } finally {
      if (downloadedTempPath && cleanupTemp) {
        try {
          await fsp.unlink(downloadedTempPath);
        } catch {
          // ignore
        }
      }
    }
  }
}

export default new TrendYoutubeUploadService();
