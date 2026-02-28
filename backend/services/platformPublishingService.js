import fs from 'fs';

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

    const snippet = {
      title: uploadConfig.title || 'Auto published mashup video',
      description: uploadConfig.description || 'Published by scheduler',
      tags: uploadConfig.tags || [],
      categoryId: uploadConfig.categoryId || '22'
    };

    const status = {
      privacyStatus: uploadConfig.privacy || 'private'
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
      uploadUrl: data?.id ? `https://youtube.com/watch?v=${data.id}` : null,
      rawResponse: data
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

      return { connected: true };
    } catch (error) {
      return { connected: false, reason: error.message };
    }
  }
}

export default new PlatformPublishingService();
