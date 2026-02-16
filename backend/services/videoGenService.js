/**
 * Video Generation Service
 * Multi-provider video generation with intelligent fallback system
 */

import axios from 'axios';

// Video generation providers configuration
const VIDEO_PROVIDERS = [
  {
    name: 'grok',
    model: 'grok-video-1',
    requiresKey: true,
    endpoint: 'https://api.x.ai/v1/video/generate',
    supportsImageToVideo: true,
    supportsTextToVideo: true,
    maxDuration: 10,
    priority: 1
  },
  {
    name: 'runway',
    model: 'gen-2',
    requiresKey: true,
    endpoint: 'https://api.runwayml.com/v1/image_to_video',
    supportsImageToVideo: true,
    supportsTextToVideo: false,
    maxDuration: 5,
    priority: 2
  },
  {
    name: 'stability',
    model: 'stable-video-diffusion',
    requiresKey: true,
    endpoint: 'https://api.stability.ai/v2beta/image-to-video',
    supportsImageToVideo: true,
    supportsTextToVideo: false,
    maxDuration: 5,
    priority: 3
  },
  {
    name: 'kling',
    model: 'kling-video-1.0',
    requiresKey: true,
    endpoint: 'https://api.klingai.com/v1/videos/generations',
    supportsImageToVideo: true,
    supportsTextToVideo: true,
    maxDuration: 10,
    priority: 4
  },
  {
    name: 'luma',
    model: 'dream-machine',
    requiresKey: true,
    endpoint: 'https://api.lumalabs.ai/dream-machine/v1/generations',
    supportsImageToVideo: true,
    supportsTextToVideo: false,
    maxDuration: 5,
    priority: 5
  }
];

// Get API key from environment based on provider
function getApiKeyFromEnv(providerName) {
  const keyMap = {
    'grok': process.env.GROK_API_KEY,
    'runway': process.env.RUNWAY_API_KEY,
    'stability': process.env.STABILITY_API_KEY,
    'kling': process.env.KLING_API_KEY,
    'luma': process.env.LUMA_API_KEY
  };
  
  return keyMap[providerName] || null;
}

// Get providers sorted by priority
function getProvidersByPriority() {
  return [...VIDEO_PROVIDERS].sort((a, b) => a.priority - b.priority);
}

class VideoGenService {
  constructor() {
    this.providers = VIDEO_PROVIDERS;
  }

  /**
   * Main video generation function with intelligent fallback
   * @param {Object} options - Generation options
   * @param {string} options.prompt - Text prompt for video generation
   * @param {string} options.provider - Preferred provider or 'auto'
   * @param {Array} options.referenceImages - Reference images for image-to-video
   * @param {number} options.duration - Duration in seconds
   * @param {string} options.motionStyle - Motion style preference
   * @returns {Promise<Object>} Generated video result
   */
  async generateVideo({ 
    prompt, 
    provider = 'auto', 
    referenceImages = [], 
    options = {} 
  }) {
    const { durationSeconds = 5, motionStyle = 'smooth' } = options;

    console.log('\n🎬 Starting Video Generation...');
    console.log(`   📝 Prompt: ${prompt?.substring(0, 100) || 'N/A'}...`);
    console.log(`   🖼️  Reference Images: ${referenceImages.length}`);
    console.log(`   ⏱️  Duration: ${durationSeconds}s`);
    console.log(`   🎯 Provider: ${provider}`);

    // Check for fake/test mode
    if (process.env.USE_FAKE_AI === '1' || provider === 'video-fake') {
      return this._fakeVideoResult(prompt, referenceImages);
    }

    // Get providers sorted by priority
    const providers = getProvidersByPriority();
    
    // Filter by provider preference if specified
    let candidateProviders = providers;
    if (provider !== 'auto') {
      candidateProviders = providers.filter(p => p.name === provider);
      
      if (candidateProviders.length === 0) {
        console.log(`   ⚠️  No provider found: ${provider}, using all providers`);
        candidateProviders = providers;
      }
    }

    console.log(`   🔍 Trying ${candidateProviders.length} providers...`);

    // Try each provider in order of priority
    const errors = [];
    
    for (const prov of candidateProviders) {
      try {
        // Check if provider requires API key
        const apiKey = getApiKeyFromEnv(prov.name);
        
        if (prov.requiresKey && !apiKey) {
          console.log(`   ⏭️  Skipping ${prov.name}: No API key configured`);
          continue;
        }

        console.log(`\n   🔄 Attempting: ${prov.name} (${prov.model})`);
        
        const result = await this.generateWithProvider(prov, {
          prompt,
          referenceImages,
          duration: durationSeconds,
          motionStyle,
          apiKey
        });

        if (result && result.url) {
          console.log(`   ✅ SUCCESS with ${prov.name}`);
          return {
            ...result,
            provider: prov.name,
            model: prov.model
          };
        }
      } catch (error) {
        const errorMsg = `${prov.name}: ${error.message}`;
        errors.push(errorMsg);
        console.log(`   ❌ Failed: ${errorMsg}`);
        continue;
      }
    }

    // All providers failed - return fake for demo purposes
    console.log('\n   ⚠️  All providers failed, returning demo video');
    return this._fakeVideoResult(prompt, referenceImages);
  }

  /**
   * Generate with specific provider
   */
  async generateWithProvider(provider, options) {
    const { prompt, referenceImages, duration, motionStyle, apiKey } = options;

    switch (provider.name) {
      case 'grok':
        return await this._generateWithGrok(provider, prompt, referenceImages, duration, motionStyle, apiKey);
      
      case 'runway':
        return await this._generateWithRunway(provider, prompt, referenceImages, duration, apiKey);
      
      case 'stability':
        return await this._generateWithStability(provider, prompt, referenceImages, duration, apiKey);
      
      case 'kling':
        return await this._generateWithKling(provider, prompt, referenceImages, duration, apiKey);
      
      case 'luma':
        return await this._generateWithLuma(provider, prompt, referenceImages, duration, apiKey);
      
      default:
        throw new Error(`Unknown video provider: ${provider.name}`);
    }
  }

  /**
   * Grok Video Implementation
   */
  async _generateWithGrok(provider, prompt, referenceImages, duration, motionStyle, apiKey) {
    console.log(`   🎬 Grok Video: ${provider.model}`);
    
    try {
      const response = await axios.post(
        provider.endpoint,
        {
          model: provider.model,
          prompt,
          duration: duration,
          motion_style: motionStyle,
          input_images: referenceImages,
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 180000
        }
      );

      const videoUrl = response.data.url || response.data.video_url || response.data.output;
      
      if (!videoUrl) {
        throw new Error('No video URL returned from Grok');
      }

      console.log(`   ✅ Generated video from Grok`);
      return {
        url: videoUrl,
        promptUsed: prompt,
        referenceImages,
        duration: duration
      };
    } catch (error) {
      console.error(`   ❌ Grok error:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Runway Video Implementation
   */
  async _generateWithRunway(provider, prompt, referenceImages, duration, apiKey) {
    console.log(`   🎬 Runway Video: ${provider.model}`);
    
    if (!referenceImages || referenceImages.length === 0) {
      throw new Error('Runway requires a reference image');
    }

    try {
      // Runway uses form-data for image upload
      const FormData = require('form-data');
      const form = new FormData();
      
      // Add image file
      if (referenceImages[0].path) {
        form.append('image', require('fs').createReadStream(referenceImages[0].path));
      } else if (referenceImages[0].url) {
        // Download and attach
        const imageResponse = await axios.get(referenceImages[0].url, { responseType: 'arraybuffer' });
        form.append('image', Buffer.from(imageResponse.data), { filename: 'reference.jpg' });
      }
      
      form.append('prompt', prompt);
      form.append('model', provider.model);

      const response = await axios.post(
        provider.endpoint,
        form,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            ...form.getHeaders()
          },
          timeout: 180000
        }
      );

      const videoUrl = response.data.video_url || response.data.generation?.video_url;
      
      if (!videoUrl) {
        throw new Error('No video URL returned from Runway');
      }

      console.log(`   ✅ Generated video from Runway`);
      return {
        url: videoUrl,
        promptUsed: prompt,
        referenceImages,
        duration: duration
      };
    } catch (error) {
      console.error(`   ❌ Runway error:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Stability AI Video Implementation
   */
  async _generateWithStability(provider, prompt, referenceImages, duration, apiKey) {
    console.log(`   🎬 Stability Video: ${provider.model}`);
    
    if (!referenceImages || referenceImages.length === 0) {
      throw new Error('Stability AI requires a reference image');
    }

    try {
      // Get image as base64
      let imageBase64;
      if (referenceImages[0].path) {
        const imageBuffer = require('fs').readFileSync(referenceImages[0].path);
        imageBase64 = imageBuffer.toString('base64');
      } else if (referenceImages[0].url) {
        const imageResponse = await axios.get(referenceImages[0].url, { responseType: 'arraybuffer' });
        imageBase64 = Buffer.from(imageResponse.data).toString('base64');
      }

      const response = await axios.post(
        provider.endpoint,
        {
          image: imageBase64,
          prompt: prompt,
          cfg_scale: 1.8,
          motion_bucket_id: 127
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 180000
        }
      );

      const videoData = response.data.artifacts?.[0] || response.data;
      const videoBase64 = videoData.base64;
      
      if (!videoBase64) {
        throw new Error('No video data returned from Stability AI');
      }

      // Upload to cloud storage or return base64
      const videoUrl = `data:video/mp4;base64,${videoBase64}`;

      console.log(`   ✅ Generated video from Stability AI`);
      return {
        url: videoUrl,
        promptUsed: prompt,
        referenceImages,
        duration: duration,
        isBase64: true
      };
    } catch (error) {
      console.error(`   ❌ Stability error:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Kling AI Video Implementation
   */
  async _generateWithKling(provider, prompt, referenceImages, duration, apiKey) {
    console.log(`   🎬 Kling Video: ${provider.model}`);
    
    try {
      const payload = {
        model: provider.model,
        prompt: prompt,
        duration: duration,
        mode: 'std' // standard mode
      };

      // Add image if provided
      if (referenceImages && referenceImages.length > 0) {
        if (referenceImages[0].path) {
          const imageBuffer = require('fs').readFileSync(referenceImages[0].path);
          payload.image = imageBuffer.toString('base64');
        } else if (referenceImages[0].url) {
          const imageResponse = await axios.get(referenceImages[0].url, { responseType: 'arraybuffer' });
          payload.image = Buffer.from(imageResponse.data).toString('base64');
        }
      }

      const response = await axios.post(
        provider.endpoint,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 180000
        }
      );

      // Kling might return async job ID
      const videoUrl = response.data.data?.video_url || response.data.video_url || response.data.output;
      
      if (!videoUrl && response.data.data?.task_id) {
        // Return task ID for polling
        return {
          taskId: response.data.data.task_id,
          promptUsed: prompt,
          referenceImages,
          duration: duration,
          isAsync: true
        };
      }

      if (!videoUrl) {
        throw new Error('No video URL returned from Kling');
      }

      console.log(`   ✅ Generated video from Kling`);
      return {
        url: videoUrl,
        promptUsed: prompt,
        referenceImages,
        duration: duration
      };
    } catch (error) {
      console.error(`   ❌ Kling error:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Luma Dream Machine Video Implementation
   */
  async _generateWithLuma(provider, prompt, referenceImages, duration, apiKey) {
    console.log(`   🎬 Luma Video: ${provider.model}`);
    
    if (!referenceImages || referenceImages.length === 0) {
      throw new Error('Luma Dream Machine requires a reference image');
    }

    try {
      // Get image as base64
      let imageBase64;
      if (referenceImages[0].path) {
        const imageBuffer = require('fs').readFileSync(referenceImages[0].path);
        imageBase64 = imageBuffer.toString('base64');
      } else if (referenceImages[0].url) {
        const imageResponse = await axios.get(referenceImages[0].url, { responseType: 'arraybuffer' });
        imageBase64 = Buffer.from(imageResponse.data).toString('base64');
      }

      const response = await axios.post(
        provider.endpoint,
        {
          prompt: prompt,
          image_url: `data:image/jpeg;base64,${imageBase64}`
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 180000
        }
      );

      const videoUrl = response.data.generations?.[0]?.url || response.data.url;
      
      if (!videoUrl && response.data.id) {
        // Return async job info
        return {
          jobId: response.data.id,
          promptUsed: prompt,
          referenceImages,
          duration: duration,
          isAsync: true
        };
      }

      if (!videoUrl) {
        throw new Error('No video URL returned from Luma');
      }

      console.log(`   ✅ Generated video from Luma`);
      return {
        url: videoUrl,
        promptUsed: prompt,
        referenceImages,
        duration: duration
      };
    } catch (error) {
      console.error(`   ❌ Luma error:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get available video models/providers
   */
  async getAvailableModels() {
    const providers = getProvidersByPriority();
    const available = [];

    for (const provider of providers) {
      const apiKey = getApiKeyFromEnv(provider.name);
      available.push({
        id: provider.name,
        name: provider.name.charAt(0).toUpperCase() + provider.name.slice(1),
        model: provider.model,
        available: !provider.requiresKey || !!apiKey,
        supportsImageToVideo: provider.supportsImageToVideo,
        supportsTextToVideo: provider.supportsTextToVideo,
        maxDuration: provider.maxDuration,
        priority: provider.priority
      });
    }

    return available;
  }

  /**
   * Fake result for testing/demo
   */
  _fakeVideoResult(prompt, referenceImages) {
    return {
      url: 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4',
      promptUsed: prompt,
      referenceImages,
      isDemo: true
    };
  }
}

export default new VideoGenService();
