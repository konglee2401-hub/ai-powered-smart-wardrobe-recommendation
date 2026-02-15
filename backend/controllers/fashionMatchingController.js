import { analyzeMultipleImagesWithOpenRouter } from '../services/openRouterService.js';
import { generateAnalysisPrompt, generateVariationPrompts } from '../utils/fashionPrompts.js';
import path from 'path';

/**
 * Fashion Matching Controller
 * Specialized for clothing change use case
 */

/**
 * Analyze character and clothing for fashion matching
 */
export async function analyzeFashionMatch(req, res) {
  try {
    const characterImage = req.files?.characterImage?.[0];
    const clothingImage = req.files?.clothingImage?.[0];
    const options = req.body;

    if (!characterImage || !clothingImage) {
      return res.status(400).json({
        error: 'Both character and clothing images are required'
      });
    }

    console.log('\n👔 FASHION MATCHING ANALYSIS');
    console.log('='.repeat(80));
    console.log(`Character: ${path.basename(characterImage.path)}`);
    console.log(`Clothing: ${path.basename(clothingImage.path)}`);
    console.log('');

    const startTime = Date.now();

    // Generate optimized prompt
    const prompt = generateAnalysisPrompt({
      characterImageName: path.basename(characterImage.path),
      clothingImageName: path.basename(clothingImage.path),
      includeStyleSuggestions: options.includeStyleSuggestions !== 'false',
      includeAccessories: options.includeAccessories !== 'false',
      includeContext: options.includeContext !== 'false'
    });

    console.log('📝 Using optimized fashion matching prompt');
    console.log('');

    // Analyze with OpenRouter (best free vision model)
    const analysis = await analyzeMultipleImagesWithOpenRouter(
      [characterImage.path, clothingImage.path],
      prompt,
      {
        model: options.model || 'qwen/qwen3-vl-235b-a22b-thinking'
      }
    );

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('='.repeat(80));
    console.log('✅ FASHION ANALYSIS COMPLETE');
    console.log(`⏱️  Duration: ${duration}s`);
    console.log('='.repeat(80) + '\n');

    // Generate variation prompts
    const variations = generateVariationPrompts(analysis, parseInt(options.variationCount) || 5);

    res.json({
      success: true,
      analysis,
      variations,
      metadata: {
        characterImage: path.basename(characterImage.path),
        clothingImage: path.basename(clothingImage.path),
        model: options.model || 'qwen/qwen3-vl-235b-a22b-thinking',
        duration: `${duration}s`,
        variationCount: variations.length
      }
    });

  } catch (error) {
    console.error('❌ Fashion matching error:', error);
    res.status(500).json({
      error: error.message
    });
  }
}

/**
 * Quick fashion analysis with predefined prompts
 */
export async function quickFashionMatch(req, res) {
  try {
    const characterImage = req.files?.characterImage?.[0];
    const clothingImage = req.files?.clothingImage?.[0];

    if (!characterImage || !clothingImage) {
      return res.status(400).json({
        error: 'Both character and clothing images are required'
      });
    }

    const prompt = `Analyze these two images. 
Image 1: A person
Image 2: A clothing item

Provide a brief analysis covering:
1. What the person looks like (age, style, body type)
2. What the clothing item is (type, color, style)
3. How well they would match together
4. What accessories would look good with this outfit
5. A one-sentence image generation prompt`;

    const analysis = await analyzeMultipleImagesWithOpenRouter(
      [characterImage.path, clothingImage.path],
      prompt
    );

    res.json({
      success: true,
      analysis,
      metadata: {
        characterImage: path.basename(characterImage.path),
        clothingImage: path.basename(clothingImage.path)
      }
    });

  } catch (error) {
    console.error('❌ Quick fashion matching error:', error);
    res.status(500).json({
      error: error.message
    });
  }
}

export default {
  analyzeFashionMatch,
  quickFashionMatch
};
