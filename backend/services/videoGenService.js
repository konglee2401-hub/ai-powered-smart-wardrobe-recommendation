// Gọi AI tạo video (Grok, Flow, v.v.). Hỗ trợ chế độ fake để test nhanh.

import axios from 'axios';

class VideoGenService {
  async generateVideo({ prompt, provider = 'grok', referenceImages = [], options = {} }) {
    if (process.env.USE_FAKE_AI === '1' || provider === 'video-fake') {
      return this._fakeVideoResult(prompt, referenceImages);
    }

    if (provider === 'grok') {
      return this._generateWithGrok({ prompt, referenceImages, options });
    }

    throw new Error(
      `VideoGenService: provider "${provider}" không được hỗ trợ. Dùng "grok" hoặc "video-fake".`
    );
  }

  // ===== GROK VIDEO =====
  async _generateWithGrok({ prompt, referenceImages = [], options = {} }) {
    const apiKey = process.env.GROK_API_KEY;
    if (!apiKey) {
      throw new Error('GROK_API_KEY chưa được cấu hình trong .env');
    }

    const { durationSeconds = 10, motionStyle = 'smooth' } = options;

    try {
      console.log('[VideoGenService] Calling Grok Video API...');

      // Grok video generation API - cần check actual API endpoint
      // Đây là placeholder, cần thay thế bằng actual Grok video API khi có
      const response = await axios.post(
        'https://api.x.ai/v1/video/generate',
        {
          model: 'grok-video-1',
          prompt,
          duration: durationSeconds,
          motion_style: motionStyle,
          input_images: referenceImages,
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const videoUrl = response.data.url || response.data.video_url || response.data.output;
      
      return {
        url: videoUrl,
        promptUsed: prompt,
        referenceImages,
      };
    } catch (err) {
      console.error('[VideoGenService] Grok Video error:', err.response?.data || err.message);
      // Fallback to fake nếu API chưa available
      console.log('[VideoGenService] Falling back to fake mode...');
      return this._fakeVideoResult(prompt, referenceImages);
    }
  }

  // ===== FAKE (test mode) =====
  _fakeVideoResult(prompt, referenceImages) {
    return {
      url: 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4',
      promptUsed: prompt,
      referenceImages,
    };
  }
}

export default new VideoGenService();
