import express from 'express';

const router = express.Router();

// Helper function to generate prompts
const generatePrompt = (characterDesc, productDesc, useCase, style) => {
  const styleGuides = {
    realistic: 'photorealistic, high detail, professional lighting, 8k resolution, sharp focus',
    cinematic: 'cinematic lighting, dramatic shadows, film grain, color graded, professional cinematography',
    fashion: 'high fashion, editorial style, runway ready, luxury aesthetic, sophisticated',
    casual: 'casual lifestyle, natural lighting, candid moment, everyday wear, relatable',
    artistic: 'artistic interpretation, creative composition, unique perspective, stylized, expressive'
  };

  const useCaseGuides = {
    ecommerce: 'product showcase, clean background, well-lit, professional, e-commerce ready',
    social: 'instagram aesthetic, trendy, engaging, social media optimized, eye-catching',
    advertising: 'commercial, persuasive, attention-grabbing, marketing focused, high impact',
    editorial: 'magazine quality, storytelling, narrative driven, artistic, editorial fashion',
    lookbook: 'lookbook style, multiple angles, styling showcase, collection presentation, cohesive'
  };

  const styleDesc = styleGuides[style] || styleGuides.realistic;
  const useCaseDesc = useCaseGuides[useCase] || useCaseGuides.ecommerce;

  const positivePrompt = `A stunning fashion photography featuring ${characterDesc}. 
Product: ${productDesc}. 
Style: ${styleDesc}. 
Use case: ${useCaseDesc}. 
Professional quality, perfect composition, beautiful colors, trending on fashion platforms.`;

  const negativePrompt = `low quality, blurry, distorted, amateur, poor lighting, 
oversaturated, undersaturated, watermark, text, logo, pixelated, 
low resolution, bad proportions, deformed, ugly, unattractive`;

  return {
    prompt: positivePrompt.replace(/\s+/g, ' ').trim(),
    negativePrompt: negativePrompt.replace(/\s+/g, ' ').trim()
  };
};

// POST /api/prompts/generate
router.post('/generate', (req, res) => {
  try {
    const { characterDescription, productDescription, useCase, style } = req.body;

    // Validation
    if (!characterDescription || !productDescription) {
      return res.status(400).json({
        success: false,
        error: 'Character description and product description are required'
      });
    }

    const useCase_ = useCase || 'ecommerce';
    const style_ = style || 'realistic';

    // Generate prompt
    const { prompt, negativePrompt } = generatePrompt(
      characterDescription,
      productDescription,
      useCase_,
      style_
    );

    res.json({
      success: true,
      data: {
        prompt,
        negativePrompt,
        useCase: useCase_,
        style: style_
      }
    });
  } catch (error) {
    console.error('Error generating prompt:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate prompt'
    });
  }
});

export default router;
