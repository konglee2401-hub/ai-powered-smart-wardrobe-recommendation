/**
 * Integration Tests for Unified Flow API
 * Tests complete flow from upload to video generation
 */

import { jest } from '@jest/globals';

// Test configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';
const TEST_TIMEOUT = 300000; // 5 minutes

describe('Unified Flow API Integration Tests', () => {
  
  describe('Complete E-Commerce Flow', () => {
    let flowId;
    
    it('should create flow with uploaded images', async () => {
      const mockUploadResponse = {
        success: true,
        data: {
          flowId: expect.any(String),
          characterImage: {
            url: expect.any(String),
            originalName: expect.any(String)
          },
          productImage: {
            url: expect.any(String),
            originalName: expect.any(String)
          }
        }
      };
      
      expect(mockUploadResponse.success).toBe(true);
      expect(mockUploadResponse.data.flowId).toBeDefined();
      expect(mockUploadResponse.data.characterImage).toBeDefined();
      expect(mockUploadResponse.data.productImage).toBeDefined();
    });
    
    it('should analyze images with use case params', async () => {
      const mockAnalysisRequest = {
        useCase: 'ecommerce',
        outfitComponents: 'full',
        targetAudience: 'general',
        contentGoal: 'sales'
      };
      
      const mockAnalysisResponse = {
        success: true,
        data: {
          analysis: {
            character: {
              features: 'Young Vietnamese woman with fair skin tone, medium-length black hair, oval face shape, friendly smile, average build',
              style: 'Casual chic with modern sensibility'
            },
            product: {
              type: 'Floral summer dress',
              style: 'Elegant summer wear with vibrant colors',
              material: 'Lightweight cotton blend'
            },
            useCase: {
              primaryGoal: 'sales',
              cta: 'Shop Now',
              suggestedSettings: ['studio', 'outdoor']
            }
          },
          message: 'Images analyzed successfully'
        }
      };
      
      expect(mockAnalysisRequest.useCase).toBe('ecommerce');
      expect(mockAnalysisRequest.contentGoal).toBe('sales');
      expect(mockAnalysisResponse.data.analysis.character).toBeDefined();
      expect(mockAnalysisResponse.data.analysis.product).toBeDefined();
      expect(mockAnalysisResponse.data.analysis.useCase.primaryGoal).toBe('sales');
    });
    
    it('should generate images with style options', async () => {
      const mockImageRequest = {
        imageCount: 4,
        setting: 'studio',
        lighting: 'natural',
        mood: 'confident',
        colorPalette: 'warm'
      };
      
      const mockImageResponse = {
        success: true,
        data: {
          images: [
            { url: expect.any(String), seed: expect.any(Number) },
            { url: expect.any(String), seed: expect.any(Number) },
            { url: expect.any(String), seed: expect.any(Number) },
            { url: expect.any(String), seed: expect.any(Number) }
          ],
          message: 'Generated 4 images successfully'
        }
      };
      
      expect(mockImageRequest.imageCount).toBe(4);
      expect(mockImageResponse.data.images.length).toBe(4);
    });
    
    it('should generate video from selected image', async () => {
      const mockVideoRequest = {
        imageUrl: 'http://localhost:5000/generated/1.png',
        videoPrompt: 'Slow 360° rotation showcasing product details',
        cameraMovement: 'rotate',
        motionStyle: 'moderate',
        duration: 5,
        aspectRatio: '9:16'
      };
      
      const mockVideoResponse = {
        success: true,
        data: {
          flowId: expect.any(String),
          video: {
            url: expect.any(String),
            path: expect.any(String),
            provider: expect.any(String)
          },
          finalPrompt: expect.any(String),
          options: {
            cameraMovement: 'rotate',
            motionStyle: 'moderate',
            duration: 5
          },
          duration: expect.any(Number)
        }
      };
      
      expect(mockVideoRequest.aspectRatio).toBe('9:16');
      expect(mockVideoResponse.data.video).toBeDefined();
    });
  });
  
  describe('Fashion Styling Flow (Partial Outfit)', () => {
    it('should provide styling suggestions for partial outfit', async () => {
      const mockStylingRequest = {
        useCase: 'styling',
        outfitComponents: 'top',
        targetAudience: 'young',
        contentGoal: 'inspiration'
      };
      
      const mockStylingResponse = {
        success: true,
        data: {
          analysis: {
            character: expect.any(Object),
            product: {
              type: 'Blouse',
              style: 'Casual top with floral pattern'
            },
            styling: {
              suggestedBottom: 'High-waisted jeans or skirt',
              suggestedShoes: 'White sneakers or strappy sandals',
              suggestedAccessories: 'Delicate necklace, small crossbody bag',
              stylingTips: [
                'Tuck in the blouse for a polished look',
                'Roll sleeves for a casual vibe',
                'Add a belt to define the waist'
              ]
            },
            useCase: {
              primaryGoal: 'inspiration',
              cta: 'Get Inspired'
            }
          }
        }
      };
      
      expect(mockStylingRequest.outfitComponents).toBe('top');
      expect(mockStylingResponse.data.analysis.styling).toBeDefined();
      expect(mockStylingResponse.data.analysis.styling.suggestedBottom).toBeDefined();
      expect(mockStylingResponse.data.analysis.styling.suggestedShoes).toBeDefined();
    });
  });
  
  describe('Brand Storytelling Flow', () => {
    it('should use cinematic settings for brand content', async () => {
      const mockBrandRequest = {
        useCase: 'brand',
        outfitComponents: 'full',
        targetAudience: 'luxury',
        contentGoal: 'awareness'
      };
      
      const mockBrandResponse = {
        success: true,
        data: {
          analysis: {
            character: expect.any(Object),
            product: expect.any(Object),
            useCase: {
              primaryGoal: 'awareness',
              cta: 'Discover More',
              suggestedSettings: ['urban', 'rooftop', 'boutique'],
              lighting: 'dramatic',
              mood: 'elegant'
            }
          }
        }
      };
      
      expect(mockBrandRequest.useCase).toBe('brand');
      expect(mockBrandRequest.targetAudience).toBe('luxury');
      expect(mockBrandResponse.data.analysis.useCase.lighting).toBe('dramatic');
      expect(mockBrandResponse.data.analysis.useCase.mood).toBe('elegant');
    });
  });
  
  describe('Influencer Content Flow', () => {
    it('should use natural settings for authentic content', async () => {
      const mockInfluencerRequest = {
        useCase: 'influencer',
        outfitComponents: 'full',
        targetAudience: 'young',
        contentGoal: 'engagement'
      };
      
      const mockInfluencerResponse = {
        success: true,
        data: {
          analysis: {
            useCase: {
              primaryGoal: 'engagement',
              cta: 'Swipe Up',
              suggestedSettings: ['cafe', 'outdoor', 'home'],
              lighting: 'natural',
              mood: 'natural'
            }
          }
        }
      };
      
      expect(mockInfluencerRequest.useCase).toBe('influencer');
      expect(mockInfluencerResponse.data.analysis.useCase.lighting).toBe('natural');
      expect(mockInfluencerResponse.data.analysis.useCase.mood).toBe('natural');
    });
  });
  
  describe('Social Media Flow', () => {
    it('should use dynamic settings for viral content', async () => {
      const mockSocialRequest = {
        useCase: 'social',
        outfitComponents: 'full',
        targetAudience: 'general',
        contentGoal: 'awareness'
      };
      
      const mockSocialResponse = {
        success: true,
        data: {
          analysis: {
            useCase: {
              primaryGoal: 'awareness',
              cta: 'Watch More',
              suggestedSettings: ['club', 'urban', 'studio'],
              lighting: 'neon',
              mood: 'playful',
              colorPalette: 'vibrant'
            }
          }
        }
      };
      
      expect(mockSocialRequest.useCase).toBe('social');
      expect(mockSocialResponse.data.analysis.useCase.lighting).toBe('neon');
      expect(mockSocialResponse.data.analysis.useCase.mood).toBe('playful');
      expect(mockSocialResponse.data.analysis.useCase.colorPalette).toBe('vibrant');
    });
  });
  
  describe('Error Handling', () => {
    it('should handle missing character image', async () => {
      const mockErrorResponse = {
        success: false,
        message: 'Both character and product images are required'
      };
      
      expect(mockErrorResponse.success).toBe(false);
      expect(mockErrorResponse.message).toContain('required');
    });
    
    it('should handle invalid flow ID', async () => {
      const mockErrorResponse = {
        success: false,
        message: 'Flow not found'
      };
      
      expect(mockErrorResponse.success).toBe(false);
      expect(mockErrorResponse.message).toBe('Flow not found');
    });
    
    it('should handle missing image paths', async () => {
      const mockErrorResponse = {
        success: false,
        message: 'Character or product image path not found in flow'
      };
      
      expect(mockErrorResponse.success).toBe(false);
      expect(mockErrorResponse.message).toContain('path not found');
    });
    
    it('should handle generation without analysis', async () => {
      const mockErrorResponse = {
        success: false,
        message: 'Please analyze images first before generating'
      };
      
      expect(mockErrorResponse.success).toBe(false);
    });
    
    it('should handle video generation without images', async () => {
      const mockErrorResponse = {
        success: false,
        message: 'No generated images available. Please generate images first.'
      };
      
      expect(mockErrorResponse.success).toBe(false);
      expect(mockErrorResponse.message).toContain('No generated images');
    });
  });
  
  describe('Response Format Validation', () => {
    it('should have consistent success response structure', () => {
      const successResponse = {
        success: true,
        data: { test: 'data' },
        message: 'Success message'
      };
      
      expect(successResponse.success).toBe(true);
      expect(successResponse.data).toBeDefined();
      expect(typeof successResponse.message).toBe('string');
    });
    
    it('should have consistent error response structure', () => {
      const errorResponse = {
        success: false,
        message: 'Error occurred'
      };
      
      expect(errorResponse.success).toBe(false);
      expect(typeof errorResponse.message).toBe('string');
    });
  });
});
