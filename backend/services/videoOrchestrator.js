import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import { createCanvas } from 'canvas';

/**
 * Video generation orchestrator with multi-provider support
 */

/**
 * Provider priority list (will try in order until one succeeds)
 */
const PROVIDER_PRIORITY = [
  'stable-video',      // Stable Video Diffusion (Replicate - Free tier)
  'animatediff',       // AnimateDiff (Replicate - Free tier)
  'zeroscope',         // Zeroscope (Replicate - Free tier)
  'hotshot',           // Hotshot-XL (Replicate - Free tier)
  'runway',            // Runway Gen-3 (Paid)
  'pika',              // Pika Labs (Paid)
  'mock'               // Mock generator (Always works)
];

/**
 * Generate video with automatic provider fallback
 */
export async function generateVideo({ imagePath, prompt, model, options = {} }) {
  console.log('\n' + '='.repeat(80));
  console.log('🎬 VIDEO GENERATION STARTED');
  console.log('='.repeat(80));
  console.log(`Requested model: ${model}`);
  console.log(`Options:`, options);
  console.log('='.repeat(80) + '\n');
  
  // Determine provider priority
  let providers = [...PROVIDER_PRIORITY];
  
  // If specific model requested, try it first
  if (model && model !== 'auto') {
    providers = [model, ...providers.filter(p => p !== model)];
  }
  
  // Try each provider in order
  let lastError = null;
  
  for (const provider of providers) {
    try {
      console.log(`\n🔄 Trying provider: ${provider.toUpperCase()}`);
      
      const result = await generateWithProvider(provider, {
        imagePath,
        prompt,
        options
      });
      
      console.log(`\n✅ SUCCESS with provider: ${provider.toUpperCase()}\n`);
      
      return {
        ...result,
        provider: provider,
        triedProviders: [provider]
      };
      
    } catch (error) {
      console.error(`❌ Provider ${provider} failed:`, error.message);
      lastError = error;
      
      // Continue to next provider
      continue;
    }
  }
  
  // All providers failed
  throw new Error(`All video providers failed. Last error: ${lastError?.message}`);
}

/**
 * Generate video with specific provider
 */
async function generateWithProvider(provider, { imagePath, prompt, options }) {
  switch (provider) {
    case 'stable-video':
      return await generateWithStableVideo(imagePath, prompt, options);
    
    case 'animatediff':
      return await generateWithAnimateDiff(imagePath, prompt, options);
    
    case 'zeroscope':
      return await generateWithZeroscope(imagePath, prompt, options);
    
    case 'hotshot':
      return await generateWithHotshot(imagePath, prompt, options);
    
    case 'runway':
      return await generateWithRunway(imagePath, prompt, options);
    
    case 'pika':
      return await generateWithPika(imagePath, prompt, options);
    
    case 'mock':
      return await generateMockVideo(imagePath, prompt, options);
    
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Stable Video Diffusion (Replicate - FREE TIER)
 */
async function generateWithStableVideo(imagePath, prompt, options) {
  console.log('🎥 Using Stable Video Diffusion...');
  
  if (!process.env.REPLICATE_API_TOKEN) {
    throw new Error('REPLICATE_API_TOKEN not set');
  }
  
  const Replicate = (await import('replicate')).default;
  const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN
  });
  
  // Read and encode image
  const imageBuffer = await fs.readFile(imagePath);
  const imageBase64 = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
  
  console.log('🚀 Starting Stable Video Diffusion generation...');
  
  const output = await replicate.run(
    "stability-ai/stable-video-diffusion:3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438",
    {
      input: {
        input_image: imageBase64,
        cond_aug: 0.02,
        decoding_t: 14,
        video_length: options.duration || 14, // frames
        sizing_strategy: "maintain_aspect_ratio",
        motion_bucket_id: getMotionBucketId(options.motionStyle),
        frames_per_second: 6
      }
    }
  );
  
  // Download video
  const videoUrl = output;
  const videoBuffer = await downloadVideo(videoUrl);
  
  // Save video
  const filename = `video-stable-${Date.now()}.mp4`;
  const videoPath = await saveVideo(videoBuffer, filename);
  
  return {
    path: videoPath,
    url: `/uploads/videos/${filename}`,
    provider: 'stable-video',
    sourceUrl: videoUrl
  };
}

/**
 * AnimateDiff (Replicate - FREE TIER)
 */
async function generateWithAnimateDiff(imagePath, prompt, options) {
  console.log('🎥 Using AnimateDiff...');
  
  if (!process.env.REPLICATE_API_TOKEN) {
    throw new Error('REPLICATE_API_TOKEN not set');
  }
  
  const Replicate = (await import('replicate')).default;
  const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN
  });
  
  console.log('🚀 Starting AnimateDiff generation...');
  
  const output = await replicate.run(
    "lucataco/animate-diff:beecf59c4aee8d81bf04f0381033dfa10dc16e845b4ae00d281e2fa377e48a9f",
    {
      input: {
        prompt: prompt,
        num_frames: Math.min(options.duration || 16, 24),
        guidance_scale: 7.5,
        num_inference_steps: 25
      }
    }
  );
  
  // Download video
  const videoUrl = Array.isArray(output) ? output[0] : output;
  const videoBuffer = await downloadVideo(videoUrl);
  
  // Save video
  const filename = `video-animatediff-${Date.now()}.mp4`;
  const videoPath = await saveVideo(videoBuffer, filename);
  
  return {
    path: videoPath,
    url: `/uploads/videos/${filename}`,
    provider: 'animatediff',
    sourceUrl: videoUrl
  };
}

/**
 * Zeroscope (Replicate - FREE TIER)
 */
async function generateWithZeroscope(imagePath, prompt, options) {
  console.log('🎥 Using Zeroscope...');
  
  if (!process.env.REPLICATE_API_TOKEN) {
    throw new Error('REPLICATE_API_TOKEN not set');
  }
  
  const Replicate = (await import('replicate')).default;
  const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN
  });
  
  console.log('🚀 Starting Zeroscope generation...');
  
  const output = await replicate.run(
    "anotherjesse/zeroscope-v2-xl:9f747673945c62801b13b84701c783929c0ee784e4748ec062204894dda1a351",
    {
      input: {
        prompt: prompt,
        num_frames: Math.min(options.duration || 24, 48),
        num_inference_steps: 50
      }
    }
  );
  
  // Download video
  const videoUrl = Array.isArray(output) ? output[0] : output;
  const videoBuffer = await downloadVideo(videoUrl);
  
  // Save video
  const filename = `video-zeroscope-${Date.now()}.mp4`;
  const videoPath = await saveVideo(videoBuffer, filename);
  
  return {
    path: videoPath,
    url: `/uploads/videos/${filename}`,
    provider: 'zeroscope',
    sourceUrl: videoUrl
  };
}

/**
 * Hotshot-XL (Replicate - FREE TIER)
 */
async function generateWithHotshot(imagePath, prompt, options) {
  console.log('🎥 Using Hotshot-XL...');
  
  if (!process.env.REPLICATE_API_TOKEN) {
    throw new Error('REPLICATE_API_TOKEN not set');
  }
  
  const Replicate = (await import('replicate')).default;
  const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN
  });
  
  console.log('🚀 Starting Hotshot-XL generation...');
  
  const output = await replicate.run(
    "lucataco/hotshot-xl:78b3a6257e16e4b241245d65c8b2b81ea2e1ff7ed4c55306b511509ddbfd327a",
    {
      input: {
        prompt: prompt,
        num_frames: Math.min(options.duration || 8, 16)
      }
    }
  );
  
  // Download video
  const videoUrl = output;
  const videoBuffer = await downloadVideo(videoUrl);
  
  // Save video
  const filename = `video-hotshot-${Date.now()}.mp4`;
  const videoPath = await saveVideo(videoBuffer, filename);
  
  return {
    path: videoPath,
    url: `/uploads/videos/${filename}`,
    provider: 'hotshot',
    sourceUrl: videoUrl
  };
}

/**
 * Runway Gen-3 (PAID)
 */
async function generateWithRunway(imagePath, prompt, options) {
  console.log('🎥 Using Runway Gen-3...');
  
  if (!process.env.RUNWAY_API_KEY) {
    throw new Error('RUNWAY_API_KEY not set');
  }
  
  // Runway API implementation
  // Note: This is a placeholder - actual implementation depends on Runway's API
  throw new Error('Runway Gen-3 requires API implementation');
}

/**
 * Pika Labs (PAID)
 */
async function generateWithPika(imagePath, prompt, options) {
  console.log('🎥 Using Pika Labs...');
  
  if (!process.env.PIKA_API_KEY) {
    throw new Error('PIKA_API_KEY not set');
  }
  
  // Pika API implementation
  // Note: This is a placeholder - actual implementation depends on Pika's API
  throw new Error('Pika Labs requires API implementation');
}

/**
 * Mock Video Generator (ALWAYS WORKS - FOR TESTING)
 */
async function generateMockVideo(imagePath, prompt, options) {
  console.log('🎭 Generating MOCK video for testing...');
  
  // For now, create a simple animated GIF-style video
  // In production, you could use ffmpeg to create actual video
  
  const { loadImage } = await import('canvas');
  const image = await loadImage(imagePath);
  
  const width = 512;
  const height = 768;
  const frames = Math.min(options.duration || 30, 60);
  
  // Create frames
  const frameBuffers = [];
  
  for (let i = 0; i < frames; i++) {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Draw image with slight zoom/pan effect
    const scale = 1 + (i / frames) * 0.1; // Zoom in 10%
    const offsetX = (width - width * scale) / 2;
    const offsetY = (height - height * scale) / 2;
    
    ctx.drawImage(image, offsetX, offsetY, width * scale, height * scale);
    
    // Add frame number overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, height - 40, width, 40);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Mock Video - Frame ${i + 1}/${frames}`, width / 2, height - 15);
    
    frameBuffers.push(canvas.toBuffer('image/png'));
  }
  
  // For now, just save the first frame as a "video"
  // In production, use ffmpeg to create actual MP4
  const filename = `video-mock-${Date.now()}.png`;
  const videoPath = await saveVideo(frameBuffers[0], filename);
  
  console.log('✅ Mock video created (single frame for testing)');
  console.log('💡 Tip: Install ffmpeg for actual video generation');
  
  return {
    path: videoPath,
    url: `/uploads/videos/${filename}`,
    provider: 'mock',
    note: 'Mock video - single frame. Install ffmpeg for real videos.'
  };
}

/**
 * Helper: Get motion bucket ID for Stable Video Diffusion
 */
function getMotionBucketId(motionStyle) {
  const motionMap = {
    'subtle': 40,
    'moderate': 127,
    'dynamic': 200,
    'cinematic': 100
  };
  return motionMap[motionStyle] || 127;
}

/**
 * Helper: Download video from URL
 */
async function downloadVideo(url) {
  console.log(`📥 Downloading video from: ${url}`);
  
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 300000, // 5 minutes
    maxContentLength: 100 * 1024 * 1024 // 100MB max
  });
  
  const buffer = Buffer.from(response.data);
  
  if (buffer.length === 0) {
    throw new Error('Downloaded empty video buffer');
  }
  
  console.log(`✅ Downloaded video: ${buffer.length} bytes`);
  return buffer;
}

/**
 * Helper: Save video to disk
 */
async function saveVideo(videoBuffer, filename) {
  const uploadDir = process.env.UPLOAD_DIR || 'uploads';
  const videosDir = path.join(uploadDir, 'videos');
  
  // Ensure directory exists
  await fs.mkdir(videosDir, { recursive: true });
  
  const filepath = path.join(videosDir, filename);
  
  // Write video file
  await fs.writeFile(filepath, videoBuffer, { encoding: null });
  
  // Verify file
  const stats = await fs.stat(filepath);
  if (stats.size === 0) {
    throw new Error('Saved video file has 0 bytes');
  }
  
  console.log(`✅ Video saved: ${filename} (${stats.size} bytes)`);
  
  return filepath;
}

/**
 * Build enhanced video prompt
 */
export async function buildVideoPrompt({ basePrompt, imageAnalysis, options = {} }) {
  const {
    cameraMovement = 'static',
    motionStyle = 'moderate',
    videoStyle = 'realistic',
    duration = 5,
    aspectRatio = '16:9'
  } = options;
  
  // Camera movement descriptions
  const cameraDescriptions = {
    static: 'static camera, no movement, steady shot',
    pan: 'smooth pan movement from left to right',
    tilt: 'smooth tilt movement up and down',
    zoom: 'smooth zoom in movement towards subject',
    dolly: 'smooth dolly forward movement',
    orbit: 'smooth orbit movement around subject'
  };
  
  // Motion style descriptions
  const motionDescriptions = {
    subtle: 'very subtle and minimal movement, almost static',
    moderate: 'natural and moderate movement, realistic motion',
    dynamic: 'energetic and dynamic movement, active motion',
    cinematic: 'smooth cinematic movement, professional film quality'
  };
  
  // Video style descriptions
  const styleDescriptions = {
    realistic: 'photorealistic style, natural look',
    cinematic: 'cinematic film style with color grading',
    'fashion-editorial': 'high-fashion editorial style, magazine quality',
    commercial: 'commercial advertising style, polished look',
    artistic: 'artistic and creative style, unique aesthetic'
  };
  
  // Build enhanced prompt
  let enhancedPrompt = `${basePrompt}\n\n`;
  
  enhancedPrompt += `VIDEO SPECIFICATIONS:\n`;
  enhancedPrompt += `- Camera: ${cameraDescriptions[cameraMovement]}\n`;
  enhancedPrompt += `- Motion: ${motionDescriptions[motionStyle]}\n`;
  enhancedPrompt += `- Style: ${styleDescriptions[videoStyle]}\n`;
  enhancedPrompt += `- Duration: ${duration} seconds\n`;
  enhancedPrompt += `- Aspect Ratio: ${aspectRatio}\n\n`;
  
  enhancedPrompt += `TECHNICAL REQUIREMENTS:\n`;
  enhancedPrompt += `- High quality video output\n`;
  enhancedPrompt += `- Smooth motion, no jitter or artifacts\n`;
  enhancedPrompt += `- Consistent lighting throughout\n`;
  enhancedPrompt += `- Sharp focus on subject\n`;
  enhancedPrompt += `- Professional color grading\n`;
  enhancedPrompt += `- Natural movement and transitions\n\n`;
  
  if (imageAnalysis) {
    enhancedPrompt += `CONTEXT FROM IMAGE:\n`;
    enhancedPrompt += `${imageAnalysis}\n\n`;
  }
  
  enhancedPrompt += `NEGATIVE PROMPT:\n`;
  enhancedPrompt += `distorted, blurry, low quality, artifacts, jittery motion, `;
  enhancedPrompt += `unnatural movement, flickering, watermark, text, logo`;
  
  return enhancedPrompt;
}
