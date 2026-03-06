import fs from 'fs';

const YOUTUBE_UPLOAD_TYPES = ['shorts', 'video'];

class PlatformPublishingService {
  constructor() {
    this.defaultTimeout = 45000;
  }

  async request(url, { method = 'GET', headers = {}, body, timeout = this.defaultTimeout } = {}) {
    const controller = new AbortController();
    const timeoutRef = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body,
        signal: controller.signal
      });

      const raw = await response.text();
      let data = null;
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { raw };
      }

      if (!response.ok) {
        throw new Error(data?.error?.message || data?.message || `HTTP ${response.status}`);
      }

      return data;
    } finally {
      clearTimeout(timeoutRef);
    }
  }

  ensureFile(videoPath) {
    if (!videoPath || !fs.existsSync(videoPath)) {
      throw new Error(`Video file not found at path: ${videoPath}`);
    }
  }


  normalizeYouTubeUploadConfig(uploadConfig = {}) {
    const normalizedType = String(
      uploadConfig.youtubePublishType ||
      uploadConfig.youtubeUploadType ||
      uploadConfig.youtubeContentType ||
      'shorts'
    ).toLowerCase();

    if (!YOUTUBE_UPLOAD_TYPES.includes(normalizedType)) {
      throw new Error(`youtubePublishType is required and must be one of: ${YOUTUBE_UPLOAD_TYPES.join(', ')}`);
    }

    return {
      ...uploadConfig,
      youtubePublishType: normalizedType
    };
  }

  getCredentials(account) {
    const metadata = account.metadata || {};
    return {
      accessToken: metadata.accessToken || account.accessToken,
      apiKey: metadata.apiKey,
      pageId: metadata.pageId,
      channelId: metadata.channelId,
      businessId: metadata.businessId
    };
  }

  async publishToTikTok({ account, videoPath, uploadConfig = {} }) {
    this.ensureFile(videoPath);
    const creds = this.getCredentials(account);
    if (!creds.accessToken) throw new Error('TikTok access token is required');

    const payload = {
      post_info: {
        title: uploadConfig.title || 'Auto published from mashup queue',
        privacy_level: uploadConfig.privacyLevel || 'SELF_ONLY',
        disable_comment: !!uploadConfig.disableComment,
        disable_duet: !!uploadConfig.disableDuet,
        disable_stitch: !!uploadConfig.disableStitch
      },
      source_info: {
        source: 'FILE_UPLOAD',
        video_url: uploadConfig.videoUrl || null,
        file_path: videoPath
      }
    };

    const data = await this.request('https://open.tiktokapis.com/v2/post/publish/video/init/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${creds.accessToken}`
      },
      body: JSON.stringify(payload)
    });

    return {
      platform: 'tiktok',
      platformPostId: data?.data?.publish_id || data?.data?.task_id || null,
      uploadUrl: data?.data?.share_url || null,
      rawResponse: data
    };
  }

  async publishToFacebook({ account, videoPath, uploadConfig = {} }) {
    this.ensureFile(videoPath);
    const creds = this.getCredentials(account);
    if (!creds.accessToken || !creds.pageId) {
      throw new Error('Facebook pageId and access token are required');
    }

    const params = new URLSearchParams({
      access_token: creds.accessToken,
      description: uploadConfig.description || uploadConfig.caption || 'Auto published from mashup queue',
      published: uploadConfig.published === false ? 'false' : 'true',
      file_url: uploadConfig.videoUrl || ''
    });

    const data = await this.request(`https://graph.facebook.com/v20.0/${creds.pageId}/videos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    return {
      platform: 'facebook',
      platformPostId: data?.id || null,
      uploadUrl: data?.permalink_url || null,
      rawResponse: data
    };
  }

  async publishToYouTube({ account, videoPath, uploadConfig = {} }) {
    this.ensureFile(videoPath);
    const creds = this.getCredentials(account);
    if (!creds.accessToken) throw new Error('YouTube access token is required');

    const normalizedUploadConfig = this.normalizeYouTubeUploadConfig(uploadConfig);
    const isShorts = normalizedUploadConfig.youtubePublishType === 'shorts';

    const existingTags = Array.isArray(normalizedUploadConfig.tags) ? normalizedUploadConfig.tags : [];
    const tags = isShorts && !existingTags.map(t => String(t).toLowerCase()).includes('shorts')
      ? [...existingTags, 'shorts']
      : existingTags;

    const snippet = {
      title: normalizedUploadConfig.title || 'Auto published mashup video',
      description: normalizedUploadConfig.description || 'Published by scheduler',
      tags,
      categoryId: normalizedUploadConfig.categoryId || '22'
    };

    const status = {
      privacyStatus: normalizedUploadConfig.privacy || 'private'
    };

    const data = await this.request('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        Authorization: `Bearer ${creds.accessToken}`,
        'X-Upload-Content-Type': 'video/*'
      },
      body: JSON.stringify({ snippet, status })
    });

    return {
      platform: 'youtube',
      platformPostId: data?.id || null,
      uploadUrl: data?.id ? (isShorts ? `https://www.youtube.com/shorts/${data.id}` : `https://youtube.com/watch?v=${data.id}`) : null,
      rawResponse: data,
      youtubePublishType: normalizedUploadConfig.youtubePublishType
    };
  }

  async publish({ platform, account, videoPath, uploadConfig = {} }) {
    switch (platform) {
      case 'tiktok':
        return this.publishToTikTok({ account, videoPath, uploadConfig });
      case 'youtube':
        return this.publishToYouTube({ account, videoPath, uploadConfig });
      case 'facebook':
        return this.publishToFacebook({ account, videoPath, uploadConfig });
      default:
        throw new Error(`Unsupported platform for native publish: ${platform}`);
    }
  }



  getPlatformRequirements(platform) {
    const shared = {
      videoMetadata: ['title', 'description'],
      fileRequirement: 'videoPath or public videoUrl (platform dependent)'
    };

    const requirements = {
      youtube: {
        ...shared,
        oauth: {
          requiredScopes: ['https://www.googleapis.com/auth/youtube.upload'],
          oauthClient: ['clientId', 'clientSecret', 'redirectUri'],
          accountBinding: 'Each YouTube channel account must complete OAuth consent independently'
        },
        uploadFields: ['title', 'description', 'privacy', 'categoryId', 'tags', 'youtubePublishType']
      },
      facebook: {
        ...shared,
        oauth: {
          requiredScopes: ['pages_manage_posts', 'pages_show_list', 'pages_read_engagement'],
          oauthClient: ['appId', 'appSecret', 'redirectUri'],
          accountBinding: 'Each Facebook user must grant access and select page for posting Reels/videos'
        },
        uploadFields: ['description', 'caption', 'published', 'pageId']
      },
      tiktok: {
        ...shared,
        oauth: {
          requiredScopes: ['video.publish', 'user.info.basic'],
          oauthClient: ['clientKey', 'clientSecret', 'redirectUri'],
          accountBinding: 'Each TikTok account needs OAuth token bound to its open_id'
        },
        uploadFields: ['title', 'privacyLevel', 'disableComment', 'disableDuet', 'disableStitch']
      }
    };

    return platform ? requirements[platform] || null : requirements;
  }
  async verifyAccountConnection(account) {
    const creds = this.getCredentials(account);
    if (!creds.accessToken) {
      return { connected: false, reason: 'Missing access token' };
    }

    try {
      if (account.platform === 'youtube') {
        await this.request('https://www.googleapis.com/youtube/v3/channels?part=id&mine=true', {
          headers: { Authorization: `Bearer ${creds.accessToken}` }
        });
      } else if (account.platform === 'facebook') {
        if (!creds.pageId) {
          return { connected: false, reason: 'Missing Facebook pageId' };
        }
        await this.request(`https://graph.facebook.com/v20.0/${creds.pageId}?fields=id,name&access_token=${encodeURIComponent(creds.accessToken)}`);
      } else if (account.platform === 'tiktok') {
        await this.request('https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name', {
          headers: { Authorization: `Bearer ${creds.accessToken}` }
        });
      }

      return { connected: true, permissionsOk: true };
    } catch (error) {
      return { connected: false, reason: error.message };
    }
  }
}

export default new PlatformPublishingService();
