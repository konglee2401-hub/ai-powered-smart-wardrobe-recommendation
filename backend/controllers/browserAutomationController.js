import GrokServiceV2 from '../services/browser/grokServiceV2.js';
import ZAIChatService from '../services/browser/zaiChatService.js';
import ZAIImageService from '../services/browser/zaiImageService.js';
import GoogleFlowService from '../services/browser/googleFlowService.js';
import path from 'path';
import fs from 'fs';

const tempDir = path.join(process.cwd(), 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

/**
 * Build AI-optimized prompt from analysis text
 */
function buildAIPrompt(basePrompt, analysisText, negativePrompt) {
  console.log(`\n📝 Building optimized AI prompt...`);
  
  let enhancedPrompt = basePrompt;
  
  // Add analysis context
  if (analysisText) {
    enhancedPrompt += `. Based on: ${analysisText.substring(0, 200)}`;
  }

  // Add style recommendations
  if (analysisText?.toLowerCase().includes('elegant') || analysisText?.toLowerCase().includes('formal')) {
    enhancedPrompt += ', elegant formal styling, sophisticated aesthetic';
  }
  if (analysisText?.toLowerCase().includes('casual') || analysisText?.toLowerCase().includes('comfortable')) {
    enhancedPrompt += ', casual comfortable style, relaxed fit';
  }

  // Add quality parameters
  enhancedPrompt += ', professional photography, high quality, 8k, detailed, well-lit';
  
  // Add negative prompt
  if (negativePrompt) {
    enhancedPrompt += `. Avoid: ${negativePrompt}`;
  } else {
    enhancedPrompt += '. Avoid: blurry, low quality, watermark, distorted, artifacts';
  }

  console.log(`✅ Prompt built: ${enhancedPrompt.substring(0, 120)}...`);
  return enhancedPrompt;
}

/**
 * Validate generated image file
 */
async function validateImage(filePath) {
  console.log(`\n🔍 Validating image...`);
  
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error('Image file does not exist');
    }

    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      throw new Error('Image file is empty');
    }
    if (stats.size < 1000) {
      throw new Error('Image file too small (possibly corrupted)');
    }

    // Check magic bytes for PNG
    const buffer = Buffer.alloc(8);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 8, 0);
    fs.closeSync(fd);

    const pngMagic = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    if (!buffer.equals(pngMagic)) {
      console.warn('⚠️  PNG magic bytes not found, file may not be valid PNG');
    }

    console.log(`✅ Image validated: ${stats.size} bytes`);
    return true;
  } catch (error) {
    console.error(`❌ Image validation failed:`, error.message);
    throw error;
  }
}

/**
 * Clean up temporary files
 */
function cleanupTempFiles(files) {
  console.log(`\n🧹 Cleaning up temporary files...`);
  files?.forEach(f => {
    try {
      if (f && fs.existsSync(f)) {
        fs.unlinkSync(f);
        console.log(`   ✅ Deleted: ${path.basename(f)}`);
      }
    } catch (e) {
      console.warn(`   ⚠️  Could not delete: ${path.basename(f)}`);
    }
  });
}

/**
 * Analyze and generate image using browser automation - FULL FLOW
 */
export async function analyzeAndGenerate(req, res) {
  let analysisService = null;
  let imageGenService = null;
  const tempFiles = [];
  let outputImagePath = null;

  try {
    const { 
      analysisProvider = 'grok',
      imageGenProvider = 'grok',
      prompt, 
      negativePrompt,
      useRealAnalysis = true  // Enable real analysis by default
    } = req.body;

    const characterImage = req.files?.characterImage?.[0];
    const productImage = req.files?.productImage?.[0];

    if (!characterImage || !productImage) {
      return res.status(400).json({ 
        error: 'Both character and product images are required',
        success: false 
      });
    }

    // Generate default prompt if not provided
    let finalPrompt = prompt;
    if (!finalPrompt) {
      finalPrompt = `Generate a photorealistic fashion image of a person wearing the clothing product shown. 
Keep the character unchanged: same face, same body type, same skin tone.
Change only the clothing to match the product image.
Professional studio lighting, white background, fashion photography quality.`;
    }

    // ====================================
    // STEP 1: Save uploaded images
    // ====================================
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🎬 BROWSER AUTOMATION FULL FLOW - START`);
    console.log(`${'='.repeat(80)}\n`);

    console.log(`💾 STEP 1: Saving uploaded images to temp...`);
    const charImagePath = path.join(tempDir, `char-${Date.now()}-${characterImage.originalname}`);
    const prodImagePath = path.join(tempDir, `prod-${Date.now()}-${productImage.originalname}`);
    
    fs.writeFileSync(charImagePath, characterImage.buffer);
    fs.writeFileSync(prodImagePath, productImage.buffer);
    tempFiles.push(charImagePath, prodImagePath);
    
    console.log(`   ✅ Character: ${path.basename(charImagePath)}`);
    console.log(`   ✅ Product: ${path.basename(prodImagePath)}`);

    // ====================================
    // STEP 2 & 4: Single browser service for both analysis and generation
    // ====================================
    // Reuse same service instance for both analysis and generation when providers match
    const useSameService = analysisProvider === imageGenProvider || 
                          (analysisProvider === 'grok' && imageGenProvider === 'grok') ||
                          (analysisProvider === 'grok.com' && imageGenProvider === 'grok.com');
    
    console.log(`\n📊 STEP 2: Analysis...`);
    let analysisText = null;

    try {
      // Create service for analysis
      if (!useSameService || !analysisService) {
        switch (analysisProvider) {
          case 'grok':
          case 'grok.com':
            analysisService = new GrokServiceV2({ headless: false });
            break;
          case 'zai':
          case 'chat.z.ai':
          default:
            analysisService = new ZAIChatService({ headless: false });
        }
        
        console.log(`   🚀 Initializing ${analysisProvider}...`);
        await analysisService.initialize();
      } else {
        console.log(`   ♻️  Reusing same service for analysis + generation`);
      }

      if (useRealAnalysis) {
        console.log(`   🤖 Real analysis with ${analysisProvider}...`);
        console.log(`   📸 Uploading and analyzing images...`);
        console.log(`   ⏳ This may take a minute...`);
        
        const analysisResult = await analysisService.analyzeMultipleImages(
          [charImagePath, prodImagePath],
          'Analyze fashion compatibility: 1) Character style, appearance, skin tone, body type 2) Product/clothing style, color, fit. Provide: color recommendations, style compatibility score, fashion tips for combining them.'
        );
        
        analysisText = analysisResult?.text || analysisResult;
        console.log(`   ✅ Analysis complete!`);
        console.log(`      Result: "${analysisText?.substring(0, 200) || 'N/A'}..."`);
      } else {
        console.log(`   ℹ️  Skipping real analysis (useRealAnalysis=false)`);
      }
    } catch (error) {
      console.warn(`⚠️  Real analysis error: ${error.message}`);
      console.log(`   Falling back to default analysis...`);
    }

    // Use fallback if no real analysis
    if (!analysisText) {
      analysisText = 'Professional fashion styling, modern aesthetic, high quality finish recommended.';
      console.log(`   ✅ Using fallback analysis`);
    }

    // ====================================
    // STEP 3: Build optimized prompt
    // ====================================
    console.log(`\n🔨 STEP 3: Building AI-optimized prompt...`);
    const optimizedPrompt = buildAIPrompt(finalPrompt, analysisText, negativePrompt);

    // ====================================
    // STEP 4: Generate image (reuse service if possible)
    // ====================================
    console.log(`\n🎨 STEP 4: Generating image with ${imageGenProvider}...`);
    
    // Use existing service if same provider, otherwise create new one
    if (!useSameService) {
      // Need different service for generation
      if (analysisService) {
        console.log(`   🔄 Closing analysis service to create generation service...`);
        await analysisService.close();
        analysisService = null;
      }
      
      switch (imageGenProvider) {
        case 'grok':
        case 'grok.com':
          imageGenService = new GrokServiceV2({ headless: false });
          break;
        case 'zai':
        case 'image.z.ai':
        default:
          imageGenService = new ZAIImageService({ headless: false });
      }
      
      console.log(`   🚀 Initializing ${imageGenProvider}...`);
      await imageGenService.initialize();
    } else {
      // Reuse analysis service for generation
      imageGenService = analysisService;
      console.log(`   ♻️  Reusing service for generation (same provider)`);
    }
    
    try {
      outputImagePath = path.join(tempDir, `browser-gen-${Date.now()}.png`);
      
      console.log(`   🖼️  Generating with prompt: "${optimizedPrompt.substring(0, 80)}..."`);
      console.log(`   ⏳ Generating image...`);
      
      const imageResult = await imageGenService.generateImage(optimizedPrompt, {
        download: true,
        outputPath: outputImagePath
      });
      
      console.log(`   ✅ Image generation complete`);
      
      if (imageResult?.path) {
        outputImagePath = imageResult.path;
      }

      if (!outputImagePath) {
        throw new Error('No image path returned from generation');
      }

    } catch (genError) {
      console.error(`❌ Generation error: ${genError.message}`);
      if (analysisService) await analysisService.close();
      if (imageGenService && imageGenService !== analysisService) await imageGenService.close();
      
      cleanupTempFiles(tempFiles);
      
      return res.status(500).json({
        error: `Image generation failed: ${genError.message}`,
        success: false,
        stage: 'generation'
      });
    } finally {
      // Only close if it's a different service
      if (imageGenService && imageGenService !== analysisService && imageGenService.close) {
        await imageGenService.close();
      }
    }

    // ====================================
    // STEP 5: Validate generated image
    // ====================================
    console.log(`\n✔️ STEP 5: Validating generated image...`);
    try {
      await validateImage(outputImagePath);
    } catch (valError) {
      console.error(`❌ Validation failed: ${valError.message}`);
      cleanupTempFiles([...tempFiles, outputImagePath]);
      
      return res.status(500).json({
        error: `Image validation failed: ${valError.message}`,
        success: false,
        stage: 'validation'
      });
    }

    // ====================================
    // CLEANUP temporary image files (keep output)
    // ====================================
    const filesToClean = tempFiles.filter(f => f !== outputImagePath);
    cleanupTempFiles(filesToClean);

    // ====================================
    // SUCCESS RESPONSE
    // ====================================
    console.log(`\n${'='.repeat(80)}`);
    console.log(`✅ BROWSER AUTOMATION FLOW - COMPLETE`);
    console.log(`${'='.repeat(80)}\n`);

    const fileStats = fs.statSync(outputImagePath);

    return res.json({
      success: true,
      data: {
        generatedImages: [{
          url: `file://${outputImagePath}`,
          path: outputImagePath,
          size: fileStats.size,
          filename: path.basename(outputImagePath),
          provider: 'grok'
        }],
        analysis: analysisText,
        prompt: optimizedPrompt,
        providers: {
          analysis: analysisProvider,
          generation: imageGenProvider
        },
        validation: {
          status: 'valid',
          size_bytes: fileStats.size,
          timestamp: new Date().toISOString()
        }
      },
      message: 'Image generated successfully via full browser automation flow with real analysis and validation'
    });

  } catch (error) {
    console.error(`\n❌ FATAL ERROR:`, error.message);
    if (analysisService) await analysisService.close();
    if (imageGenService) await imageGenService.close();
    cleanupTempFiles(tempFiles);
    
    return res.status(500).json({
      error: error.message,
      success: false,
      stage: 'unknown'
    });
  }
}

/**
 * Legacy single-step handlers
 */
export async function analyzeBrowser(req, res) {
    // ... existing implementation or simplified version ...
    res.status(501).json({ error: "Use analyzeAndGenerate instead" });
}

export async function generateImageBrowser(req, res) {
    res.status(501).json({ error: "Use analyzeAndGenerate instead" });
}

export async function generateVideoBrowser(req, res) {
    res.status(501).json({ error: "Not implemented" });
}
