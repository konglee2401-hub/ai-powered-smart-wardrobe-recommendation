/**
 * Unit tests for AI providers - Multi-Provider Image Generation
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('AI Provider Tests', () => {
  let testImagePath;
  let testProductPath;
  let imageGenService;
  
  beforeAll(async () => {
    // Setup test images
    testImagePath = path.join(__dirname, '../test-images/anh-nhan-vat.jpeg');
    testProductPath = path.join(__dirname, '../test-images/Anh san pham.png');
    
    // Import service
    imageGenService = (await import('../services/imageGenService.js')).default;
    
    // Verify test images exist
    try {
      await fs.access(testImagePath);
      await fs.access(testProductPath);
      console.log('✅ Test images found');
    } catch (e) {
      console.warn('⚠️ Test images not found, using fallback');
    }
  });
  
  // ==================== IMAGE ANALYSIS TESTS ====================
  
  describe('Image Analysis', () => {
    it('should build enhanced prompt with Vietnamese focus', async () => {
      const prompt = imageGenService.buildEnhancedPrompt(
        'A young woman wearing elegant dress',
        {
          characterStyle: 'realistic',
          setting: 'studio',
          lighting: 'natural',
          mood: 'confident'
        },
        {
          character: {
            ethnicity: 'Vietnamese',
            age: '22-24',
            skin: 'fair porcelain'
          },
          suggestions: {
            enhancements: ['Focus on Vietnamese beauty']
          }
        }
      );
      
      expect(prompt).toBeDefined();
      expect(prompt).toContain('Vietnamese');
      expect(prompt).toContain('porcelain');
      expect(prompt).toContain('CHARACTER REFERENCE');
      expect(prompt).toContain('NEGATIVE PROMPT');
    });
    
    it('should include all style options in prompt', async () => {
      const prompt = imageGenService.buildEnhancedPrompt(
        'Test outfit',
        {
          characterStyle: 'realistic',
          productStyle: 'elegant',
          setting: 'bedroom',
          lighting: 'ring',
          cameraAngle: '3/4',
          mood: 'natural',
          colorPalette: 'warm'
        }
      );
      
      expect(prompt).toContain('bedroom');
      expect(prompt).toContain('ring light');
      expect(prompt).toContain('3/4 angle');
      expect(prompt).toContain('warm');
    });
  });
  
  // ==================== PROMPT BUILDING TESTS ====================
  
  describe('Prompt Building', () => {
    it('should create prompt with setting variations', async () => {
      const settings = ['studio', 'bedroom', 'livestream', 'boutique', 'outdoor', 'urban'];
      
      for (const setting of settings) {
        const prompt = imageGenService.buildEnhancedPrompt(
          'Fashion outfit',
          { setting }
        );
        expect(prompt).toBeDefined();
        expect(prompt.length).toBeGreaterThan(0);
      }
    });
    
    it('should create prompt with lighting variations', async () => {
      const lightingOptions = ['natural', 'ring', 'soft', 'dramatic', 'golden-hour', 'neon'];
      
      for (const lighting of lightingOptions) {
        const prompt = imageGenService.buildEnhancedPrompt(
          'Fashion outfit',
          { lighting }
        );
        expect(prompt).toBeDefined();
        expect(prompt.length).toBeGreaterThan(0);
      }
    });
    
    it('should create prompt with mood variations', async () => {
      const moods = ['confident', 'playful', 'elegant', 'natural', 'mysterious'];
      
      for (const mood of moods) {
        const prompt = imageGenService.buildEnhancedPrompt(
          'Fashion outfit',
          { mood }
        );
        expect(prompt).toBeDefined();
        expect(prompt.length).toBeGreaterThan(0);
      }
    });
  });
  
  // ==================== STYLE HIGHLIGHTS TESTS ====================
  
  describe('Style Highlights', () => {
    it('should return applied styles', async () => {
      const highlights = imageGenService.getStyleHighlights(
        {
          characterStyle: 'realistic',
          setting: 'studio',
          lighting: 'natural'
        },
        null
      );
      
      expect(highlights.applied).toHaveLength(3);
      expect(highlights.applied[0].category).toBe('character Style');
      expect(highlights.applied[0].icon).toBe('👤');
    });
    
    it('should return AI suggestions', async () => {
      const highlights = imageGenService.getStyleHighlights(
        {},
        {
          suggestions: {
            setting: 'Clean studio',
            lighting: 'Soft light',
            mood: 'Confident',
            enhancements: ['Enhancement 1', 'Enhancement 2']
          }
        }
      );
      
      expect(highlights.aiSuggestions).toBeDefined();
      expect(highlights.aiSuggestions.length).toBeGreaterThan(0);
    });
  });
  
  // ==================== IMAGE GENERATION FALLBACK TESTS ====================
  
  describe('Image Generation Fallback', () => {
    it('should generate mock images when no API available', async () => {
      if (!testImagePath || !testProductPath) {
        console.log('⚠️ Skipping mock test (no test images)');
        return;
      }
      
      const results = await imageGenService.generateMockImages({
        characterImagePath: testImagePath,
        productImagePath: testProductPath,
        prompt: 'Test prompt',
        count: 2
      });
      
      expect(results).toHaveLength(2);
      expect(results[0].buffer).toBeDefined();
      expect(results[0].buffer.length).toBeGreaterThan(0);
    }, 30000);
    
    it('should generate fake result when USE_FAKE_AI is set', async () => {
      const originalFakeAI = process.env.USE_FAKE_AI;
      process.env.USE_FAKE_AI = '1';
      
      const result = await imageGenService.generateImage({
        prompt: 'Test prompt',
        provider: 'flow-fake'
      });
      
      expect(result).toBeDefined();
      expect(result.isMock).toBe(true);
      expect(result.url).toContain('data:image/png;base64');
      
      process.env.USE_FAKE_AI = originalFakeAI;
    });
  });
  
  // ==================== BUFFER VALIDATION TESTS ====================
  
  describe('Buffer Validation', () => {
    it('should validate PNG buffer', async () => {
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
      expect(() => imageGenService.validateImageBuffer(pngBuffer)).not.toThrow();
    });
    
    it('should validate JPEG buffer', async () => {
      const jpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
      expect(() => imageGenService.validateImageBuffer(jpegBuffer)).not.toThrow();
    });
    
    it('should reject empty buffer', async () => {
      const emptyBuffer = Buffer.from([]);
      expect(() => imageGenService.validateImageBuffer(emptyBuffer)).toThrow();
    });
  });
});

// Run tests
console.log('🧪 Running AI Provider Tests...\n');
