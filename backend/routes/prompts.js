import express from 'express';

const router = express.Router();

// POST /api/prompts/generate - Generate prompt from analysis
router.post('/generate', async (req, res) => {
  try {
    const { 
      characterAnalysis, 
      productAnalysis, 
      contentUseCase, 
      style,
      customInstructions 
    } = req.body;

    // Build comprehensive prompt
    let prompt = 'Professional fashion photography, ';

    // Add character details
    if (characterAnalysis?.character) {
      const char = characterAnalysis.character;
      if (char.age) prompt += `${char.age} year old `;
      if (char.ethnicity) prompt += `${char.ethnicity} `;
      if (char.gender) prompt += `${char.gender}, `;
      if (char.features) prompt += `${char.features}, `;
      if (char.hair) prompt += `${char.hair} hair, `;
      if (char.bodyType) prompt += `${char.bodyType} body type, `;
    }

    // Add product details
    if (productAnalysis?.outfit) {
      const outfit = productAnalysis.outfit;
      prompt += 'wearing ';
      if (outfit.type) prompt += `${outfit.type}, `;
      if (outfit.colors) prompt += `${outfit.colors} colors, `;
      if (outfit.style) prompt += `${outfit.style} style, `;
      if (outfit.material) prompt += `${outfit.material} material, `;
      if (outfit.fit) prompt += `${outfit.fit} fit, `;
    }

    // Add use case specific details
    switch (contentUseCase) {
      case 'ecommerce':
        prompt += 'clean white background, studio lighting, product focus, high detail, 8k resolution';
        break;
      case 'social':
        prompt += 'lifestyle setting, natural lighting, candid pose, Instagram aesthetic, trendy';
        break;
      case 'advertising':
        prompt += 'dramatic lighting, professional model pose, luxury aesthetic, billboard quality';
        break;
      case 'editorial':
        prompt += 'artistic composition, magazine quality, creative lighting, fashion editorial style';
        break;
      default:
        prompt += 'professional studio lighting, high detail, 8k resolution';
    }

    // Add style
    if (style) {
      switch (style) {
        case 'realistic':
          prompt += ', photorealistic, detailed, sharp focus';
          break;
        case 'cinematic':
          prompt += ', cinematic lighting, film grain, movie quality';
          break;
        case 'fashion':
          prompt += ', high fashion, vogue style, runway quality';
          break;
        case 'casual':
          prompt += ', casual style, everyday wear, relatable';
          break;
        case 'artistic':
          prompt += ', artistic, creative, unique perspective';
          break;
      }
    }

    // Add custom instructions
    if (customInstructions) {
      prompt += `, ${customInstructions}`;
    }

    // Negative prompt
    const negativePrompt = 'blurry, low quality, distorted, deformed, ugly, bad anatomy, bad proportions, ' +
      'extra limbs, cloned face, disfigured, gross proportions, malformed limbs, missing arms, missing legs, ' +
      'extra arms, extra legs, fused fingers, too many fingers, long neck, watermark, signature, text, ' +
      'low resolution, worst quality, jpeg artifacts, duplicate, morbid, mutilated';

    res.json({
      success: true,
      data: {
        prompt: prompt.trim(),
        negativePrompt: negativePrompt,
        length: prompt.length
      }
    });

  } catch (error) {
    console.error('Prompt generation error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
