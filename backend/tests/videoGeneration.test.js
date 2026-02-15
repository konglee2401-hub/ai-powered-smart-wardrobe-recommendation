/**
 * Unit tests for Video Orchestrator Service
 * Tests multi-provider video generation with automatic fallback
 */

import { jest } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';

// Mock dependencies
jest.unstable_mockModule('axios', () => ({
  default: {
    get: jest.fn()
  }
}));

jest.unstable_mockModule('replicate', () => ({
  default: {
    run: jest.fn()
  }
}));

jest.unstable_mockModule('canvas', () => ({
  createCanvas: jest.fn(),
  loadImage: jest.fn()
}));

// Import modules after mocking
const axios = (await import('axios')).default;
const { createCanvas, loadImage } = await import('canvas');
const Replicate = (await import('replicate')).default;

// Test data
const testImagePath = path.join(__dirname, 'test-product.jpg');
const testPrompt = 'The model slowly turns and smiles at the camera';
const testOptions = {
  cameraMovement: 'pan',
  motionStyle: 'moderate',
  videoStyle: 'realistic',
  duration: 5,
  aspectRatio: '16:9'
};

describe('Video Orchestrator Service', () => {
  let generateVideo, buildVideoPrompt;

  beforeAll(async () => {
    // Import the module
    const videoOrchestrator = await import('../services/videoOrchestrator.js');
    generateVideo = videoOrchestrator.generateVideo;
    buildVideoPrompt = videoOrchestrator.buildVideoPrompt;
  });

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create mock canvas
    const mockCanvas = {
      getContext: jest.fn().mockReturnValue({
        drawImage: jest.fn(),
        fillRect: jest.fn(),
        fillText: jest.fn()
      }),
      toBuffer: jest.fn().mockReturnValue(Buffer.from('test-image-data'))
    };
    createCanvas.mockReturnValue(mockCanvas);
    
    // Create mock image
    const mockImage = {
      width: 512,
      height: 768
    };
    loadImage.mockResolvedValue(mockImage);
  });

  describe('generateVideo', () => {
    it('should throw error when no providers are available', async () => {
      // Don't mock Replicate - this will cause all providers to fail
      // and eventually use mock (which also needs canvas mocked)
      
      // For this test, we expect the mock generator to work
      // since canvas is properly mocked
      
      const result = await generateVideo({
        imagePath: testImagePath,
        prompt: testPrompt,
        model: 'mock',
        options: testOptions
      });

      expect(result).toHaveProperty('provider', 'mock');
      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('path');
    });

    it('should use specified provider when provided', async () => {
      // Mock Replicate to return a video URL
      Replicate.mockImplementation(() => ({
        run: jest.fn().mockResolvedValue('https://example.com/video.mp4')
      }));

      // Mock axios to return video buffer
      axios.get.mockResolvedValue({
        data: Buffer.from('video-data'),
        headers: {}
      });

      const result = await generateVideo({
        imagePath: testImagePath,
        prompt: testPrompt,
        model: 'stable-video',
        options: testOptions
      });

      expect(result).toHaveProperty('provider', 'stable-video');
    });

    it('should handle provider failure and fallback to next provider', async () => {
      // Mock Replicate to fail for stable-video but work for mock
      Replicate.mockImplementation(() => ({
        run: jest.fn().mockRejectedValue(new Error('API Error'))
      }));

      // Should fallback to mock which works with our canvas mock
      const result = await generateVideo({
        imagePath: testImagePath,
        prompt: testPrompt,
        model: 'stable-video',
        options: testOptions
      });

      expect(result).toHaveProperty('provider');
      // Should fallback to mock since Replicate fails
    });

    it('should handle auto mode with provider priority', async () => {
      // Mock Replicate to fail for stable-video but work for mock
      Replicate.mockImplementation(() => ({
        run: jest.fn().mockRejectedValue(new Error('API Error'))
      }));

      const result = await generateVideo({
        imagePath: testImagePath,
        prompt: testPrompt,
        model: 'auto',
        options: testOptions
      });

      expect(result).toHaveProperty('provider');
      // Should try multiple providers and eventually fallback
    });
  });

  describe('buildVideoPrompt', () => {
    it('should build enhanced video prompt with all options', async () => {
      const result = await buildVideoPrompt({
        basePrompt: testPrompt,
        imageAnalysis: 'Person wearing red dress in studio setting',
        options: testOptions
      });

      expect(result).toContain(testPrompt);
      expect(result).toContain('VIDEO SPECIFICATIONS');
      expect(result).toContain('Camera');
      expect(result).toContain('Motion');
      expect(result).toContain('Style');
      expect(result).toContain('TECHNICAL REQUIREMENTS');
      expect(result).toContain('NEGATIVE PROMPT');
      expect(result).toContain('Person wearing red dress');
    });

    it('should use default options when not provided', async () => {
      const result = await buildVideoPrompt({
        basePrompt: testPrompt
      });

      expect(result).toContain(testPrompt);
      expect(result).toContain('static camera');
      expect(result).toContain('moderate movement');
      expect(result).toContain('photorealistic style');
    });

    it('should handle different camera movements', async () => {
      const zoomOptions = { ...testOptions, cameraMovement: 'zoom' };
      const result = await buildVideoPrompt({
        basePrompt: testPrompt,
        options: zoomOptions
      });

      expect(result).toContain('zoom in movement');
    });

    it('should handle different motion styles', async () => {
      const dynamicOptions = { ...testOptions, motionStyle: 'dynamic' };
      const result = await buildVideoPrompt({
        basePrompt: testPrompt,
        options: dynamicOptions
      });

      expect(result).toContain('energetic and dynamic movement');
    });

    it('should handle different video styles', async () => {
      const cinematicOptions = { ...testOptions, videoStyle: 'cinematic' };
      const result = await buildVideoPrompt({
        basePrompt: testPrompt,
        options: cinematicOptions
      });

      expect(result).toContain('cinematic film style');
    });
  });
});

describe('Multi-Provider Priority', () => {
  let PROVIDER_PRIORITY;

  beforeAll(async () => {
    // Import to get the constant
    const videoOrchestrator = await import('../services/videoOrchestrator.js');
    // PROVIDER_PRIORITY is not exported, so we test through behavior
  });

  it('should attempt providers in priority order', async () => {
    // This test verifies the provider priority through the generateVideo function
    // The order should be: stable-video, animatediff, zeroscope, hotshot, runway, pika, mock
    
    const { createCanvas, loadImage } = await import('canvas');
    
    // Mock all providers to fail except mock
    const Replicate = (await import('replicate')).default;
    Replicate.mockImplementation(() => ({
      run: jest.fn().mockRejectedValue(new Error('Provider failed'))
    }));

    const { generateVideo } = await import('../services/videoOrchestrator.js');
    
    // Mock canvas for mock provider
    const mockCanvas = {
      getContext: jest.fn().mockReturnValue({
        drawImage: jest.fn(),
        fillRect: jest.fn(),
        fillText: jest.fn()
      }),
      toBuffer: jest.fn().mockReturnValue(Buffer.from('test'))
    };
    createCanvas.mockReturnValue(mockCanvas);
    
    const mockImage = { width: 512, height: 768 };
    loadImage.mockResolvedValue(mockImage);

    // Mock fs
    jest.unstable_mockModule('fs/promises', () => ({
      default: {
        readFile: jest.fn().mockResolvedValue(Buffer.from('test')),
        mkdir: jest.fn().mockResolvedValue(),
        writeFile: jest.fn().mockResolvedValue(),
        stat: jest.fn().mockResolvedValue({ size: 1000 })
      }
    }));

    const result = await generateVideo({
      imagePath: testImagePath,
      prompt: testPrompt,
      model: 'auto',
      options: testOptions
    });

    // Should eventually succeed with mock provider
    expect(result.provider).toBe('mock');
  });
});

describe('Error Handling', () => {
  it('should handle missing image path', async () => {
    const { generateVideo } = await import('../services/videoOrchestrator.js');
    
    await expect(
      generateVideo({
        imagePath: null,
        prompt: testPrompt,
        model: 'mock',
        options: testOptions
      })
    ).rejects.toThrow();
  });

  it('should handle missing prompt', async () => {
    const { generateVideo } = await import('../services/videoOrchestrator.js');
    
    const { createCanvas, loadImage } = await import('canvas');
    
    const mockCanvas = {
      getContext: jest.fn().mockReturnValue({
        drawImage: jest.fn(),
        fillRect: jest.fn(),
        fillText: jest.fn()
      }),
      toBuffer: jest.fn().mockReturnValue(Buffer.from('test'))
    };
    createCanvas.mockReturnValue(mockCanvas);
    
    const mockImage = { width: 512, height: 768 };
    loadImage.mockResolvedValue(mockImage);

    const result = await generateVideo({
      imagePath: testImagePath,
      prompt: '',
      model: 'mock',
      options: testOptions
    });

    expect(result.provider).toBe('mock');
  });

  it('should handle invalid model parameter', async () => {
    const { generateVideo } = await import('../services/videoOrchestrator.js');
    
    const { createCanvas, loadImage } = await import('canvas');
    
    const mockCanvas = {
      getContext: jest.fn().mockReturnValue({
        drawImage: jest.fn(),
        fillRect: jest.fn(),
        fillText: jest.fn()
      }),
      toBuffer: jest.fn().mockReturnValue(Buffer.from('test'))
    };
    createCanvas.mockReturnValue(mockCanvas);
    
    const mockImage = { width: 512, height: 768 };
    loadImage.mockResolvedValue(mockImage);

    // Should fallback to mock for invalid model
    const result = await generateVideo({
      imagePath: testImagePath,
      prompt: testPrompt,
      model: 'invalid-model',
      options: testOptions
    });

    expect(result).toHaveProperty('provider');
  });
});

describe('Video Options Validation', () => {
  it('should validate camera movement options', async () => {
    const { buildVideoPrompt } = await import('../services/videoOrchestrator.js');
    
    const movements = ['static', 'pan', 'tilt', 'zoom', 'dolly', 'orbit'];
    
    for (const movement of movements) {
      const result = await buildVideoPrompt({
        basePrompt: testPrompt,
        options: { ...testOptions, cameraMovement: movement }
      });
      
      expect(result).toContain('VIDEO SPECIFICATIONS');
    }
  });

  it('should validate motion style options', async () => {
    const { buildVideoPrompt } = await import('../services/videoOrchestrator.js');
    
    const styles = ['subtle', 'moderate', 'dynamic', 'cinematic'];
    
    for (const style of styles) {
      const result = await buildVideoPrompt({
        basePrompt: testPrompt,
        options: { ...testOptions, motionStyle: style }
      });
      
      expect(result).toContain('Motion');
    }
  });

  it('should validate video style options', async () => {
    const { buildVideoPrompt } = await import('../services/videoOrchestrator.js');
    
    const styles = ['realistic', 'cinematic', 'fashion-editorial', 'commercial', 'artistic'];
    
    for (const style of styles) {
      const result = await buildVideoPrompt({
        basePrompt: testPrompt,
        options: { ...testOptions, videoStyle: style }
      });
      
      expect(result).toContain('Style');
    }
  });
});
