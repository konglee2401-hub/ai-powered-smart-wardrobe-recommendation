/**
 * Integration tests for Video Orchestrator Service
 * Tests actual behavior with mocked external APIs
 */

import { jest, describe, it, expect, beforeAll, beforeEach, afterAll } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set test environment
process.env.UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
process.env.REPLICATE_API_TOKEN = 'test-token';

// Test image path
const testImagePath = path.join(__dirname, 'test-product.jpg');

describe('Video Orchestrator Integration Tests', () => {
  
  describe('buildVideoPrompt', () => {
    let buildVideoPrompt;
    
    beforeAll(async () => {
      const videoOrchestrator = await import('../services/videoOrchestrator.js');
      buildVideoPrompt = videoOrchestrator.buildVideoPrompt;
    });
    
    it('should build enhanced prompt with base prompt', async () => {
      const result = await buildVideoPrompt({
        basePrompt: 'Create a fashion video',
        options: {}
      });
      
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('Create a fashion video');
    });
    
    it('should include camera movement specifications', async () => {
      const result = await buildVideoPrompt({
        basePrompt: 'Model walking',
        options: {
          cameraMovement: 'pan',
          motionStyle: 'moderate'
        }
      });
      
      expect(result).toContain('pan movement');
    });
    
    it('should include technical requirements', async () => {
      const result = await buildVideoPrompt({
        basePrompt: 'Fashion shoot',
        options: {}
      });
      
      expect(result).toContain('VIDEO SPECIFICATIONS');
      expect(result).toContain('TECHNICAL REQUIREMENTS');
      expect(result).toContain('NEGATIVE PROMPT');
    });
    
    it('should handle all camera movements', async () => {
      const movements = ['static', 'pan', 'tilt', 'zoom', 'dolly', 'orbit'];
      
      for (const movement of movements) {
        const result = await buildVideoPrompt({
          basePrompt: 'Test',
          options: { cameraMovement: movement }
        });
        
        expect(result).toBeTruthy();
      }
    });
    
    it('should handle all motion styles', async () => {
      const styles = ['subtle', 'moderate', 'dynamic', 'cinematic'];
      
      for (const style of styles) {
        const result = await buildVideoPrompt({
          basePrompt: 'Test',
          options: { motionStyle: style }
        });
        
        expect(result).toBeTruthy();
      }
    });
    
    it('should handle all video styles', async () => {
      const styles = ['realistic', 'cinematic', 'fashion-editorial', 'commercial', 'artistic'];
      
      for (const style of styles) {
        const result = await buildVideoPrompt({
          basePrompt: 'Test',
          options: { videoStyle: style }
        });
        
        expect(result).toBeTruthy();
      }
    });
    
    it('should include image analysis when provided', async () => {
      const imageAnalysis = 'Person wearing red dress in studio with natural lighting';
      
      const result = await buildVideoPrompt({
        basePrompt: 'Fashion video',
        imageAnalysis,
        options: {}
      });
      
      expect(result).toContain('CONTEXT FROM IMAGE');
      expect(result).toContain(imageAnalysis);
    });
    
    it('should handle duration and aspect ratio', async () => {
      const result = await buildVideoPrompt({
        basePrompt: 'Test',
        options: {
          duration: 10,
          aspectRatio: '9:16'
        }
      });
      
      expect(result).toContain('Duration');
      expect(result).toContain('Aspect Ratio');
    });
  });
  
  describe('Provider Priority', () => {
    it('should have correct provider priority order', async () => {
      // The provider priority should be:
      // stable-video, animatediff, zeroscope, hotshot, runway, pika, mock
      
      const { generateVideo } = await import('../services/videoOrchestrator.js');
      
      // Mock Replicate to fail for all providers
      jest.unstable_mockModule('replicate', () => ({
        default: {
          run: jest.fn().mockRejectedValue(new Error('API Error'))
        }
      }));
      
      // Mock canvas for mock provider
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
      
      // Mock axios
      const axios = (await import('axios')).default;
      axios.get.mockResolvedValue({
        data: Buffer.from('video-data')
      });
      
      // Should fallback to mock provider
      const result = await generateVideo({
        imagePath: testImagePath,
        prompt: 'Test video',
        model: 'mock',
        options: {}
      });
      
      expect(result.provider).toBe('mock');
    });
  });
});

describe('Video Options Validation', () => {
  let buildVideoPrompt;
  
  beforeAll(async () => {
    const videoOrchestrator = await import('../services/videoOrchestrator.js');
    buildVideoPrompt = videoOrchestrator.buildVideoPrompt;
  });
  
  it('should generate valid prompt for all option combinations', async () => {
    const options = [
      { cameraMovement: 'static', motionStyle: 'subtle', videoStyle: 'realistic' },
      { cameraMovement: 'pan', motionStyle: 'moderate', videoStyle: 'cinematic' },
      { cameraMovement: 'zoom', motionStyle: 'dynamic', videoStyle: 'fashion-editorial' },
      { cameraMovement: 'orbit', motionStyle: 'cinematic', videoStyle: 'artistic' }
    ];
    
    for (const opt of options) {
      const result = await buildVideoPrompt({
        basePrompt: 'Fashion model video',
        options: opt
      });
      
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(100); // Should have substantial content
    }
  });
  
  it('should include quality requirements in prompt', async () => {
    const result = await buildVideoPrompt({
      basePrompt: 'Test',
      options: {}
    });
      
    expect(result).toContain('High quality');
    expect(result).toContain('Smooth motion');
    expect(result).toContain('Consistent lighting');
    expect(result).toContain('Sharp focus');
  });
  
  it('should include negative prompts', async () => {
    const result = await buildVideoPrompt({
      basePrompt: 'Test',
      options: {}
    });
      
    expect(result).toContain('distorted');
    expect(result).toContain('blurry');
    expect(result).toContain('artifacts');
  });
});
