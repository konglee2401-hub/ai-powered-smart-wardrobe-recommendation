import * as imageGenService from '../services/imageGenService.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get all available models
 */
export const getAllModels = async (req, res) => {
  try {
    const models = imageGenService.getAllModels();
    
    // Separate by category
    const imageToImage = models.filter(m => m.supportsImageInput);
    const textToImage = models.filter(m => !m.supportsImageInput);
    
    res.json({
      success: true,
      data: {
        models: models,
        imageToImage: imageToImage,
        textToImage: textToImage,
        total: models.length,
        imageToImageCount: imageToImage.length,
        textToImageCount: textToImage.length
      }
    });
    
  } catch (error) {
    console.error('Get models error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Test a specific model
 */
export const testModel = async (req, res) => {
  try {
    const { modelId } = req.params;
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🧪 TESTING MODEL: ${modelId}`);
    console.log('='.repeat(80));
    
    // Use test images from test-images folder
    const characterImagePath = path.join(__dirname, '..', 'test-images', 'test-character.jpg');
    const productImagePath = path.join(__dirname, '..', 'test-images', 'test-product.jpg');
    
    console.log(`📸 Character image: ${characterImagePath}`);
    console.log(`📦 Product image: ${productImagePath}`);
    
    const result = await imageGenService.testModel(modelId, characterImagePath, productImagePath);
    
    console.log('='.repeat(80) + '\n');
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('Test model error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Test all models
 */
export const testAllModels = async (req, res) => {
  try {
    console.log(`\n${'='.repeat(80)}`);
    console.log('🧪 TESTING ALL MODELS');
    console.log('='.repeat(80));
    
    const models = imageGenService.getAllModels();
    const results = [];
    
    // Use test images
    const characterImagePath = path.join(__dirname, '..', 'test-images', 'test-character.jpg');
    const productImagePath = path.join(__dirname, '..', 'test-images', 'test-product.jpg');
    
    for (const model of models) {
      if (!model.available) continue;
      
      console.log(`\nTesting: ${model.name} (${model.supportsImageInput ? 'Image-to-Image' : 'Text-to-Image'})...`);
      
      const result = await imageGenService.testModel(model.id, characterImagePath, productImagePath);
      
      results.push({
        modelId: model.id,
        name: model.name,
        provider: model.provider,
        category: model.category,
        supportsImageInput: model.supportsImageInput,
        ...result
      });
      
      // Wait 2 seconds between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('='.repeat(80) + '\n');
    
    const imageToImageResults = results.filter(r => r.supportsImageInput);
    const textToImageResults = results.filter(r => !r.supportsImageInput);
    
    res.json({
      success: true,
      data: {
        results: results,
        imageToImageResults: imageToImageResults,
        textToImageResults: textToImageResults,
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        imageToImageSuccessful: imageToImageResults.filter(r => r.success).length,
        textToImageSuccessful: textToImageResults.filter(r => r.success).length
      }
    });
    
  } catch (error) {
    console.error('Test all models error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
