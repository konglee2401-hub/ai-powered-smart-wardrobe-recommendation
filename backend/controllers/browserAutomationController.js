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
 * Build comprehensive analysis prompt with all VTO style options
 * Based on the test script prompt but expanded with all StyleCustomizer options
 */
function buildAnalysisPrompt(options = {}) {
  const {
    scene = 'studio',
    lighting = 'soft-diffused',
    mood = 'confident',
    style = 'minimalist',
    colorPalette = 'neutral',
    hairstyle = null,
    makeup = null,
    cameraAngle = 'eye-level',
    aspectRatio = '1:1',
    customPrompt = ''
  } = options;

  // Map option values to descriptive text
  const sceneMap = {
    'studio': 'Professional Studio',
    'white-background': 'White Background',
    'urban-street': 'Urban Street',
    'minimalist-indoor': 'Minimalist Indoor',
    'cafe': 'Cafe',
    'outdoor-park': 'Outdoor Park',
    'office': 'Modern Office',
    'luxury-interior': 'Luxury Interior',
    'rooftop': 'Rooftop'
  };

  const lightingMap = {
    'soft-diffused': 'Soft Diffused Lighting',
    'natural-window': 'Natural Window Light',
    'golden-hour': 'Golden Hour Lighting',
    'dramatic-rembrandt': 'Dramatic Rembrandt Lighting',
    'high-key': 'High Key Bright Lighting',
    'backlit': 'Backlit Effect',
    'neon-colored': 'Neon/Colored Lighting',
    'overcast-outdoor': 'Overcast Outdoor Light'
  };

  const moodMap = {
    'confident': 'Confident & Powerful',
    'relaxed': 'Relaxed & Casual',
    'elegant': 'Elegant & Sophisticated',
    'energetic': 'Energetic & Dynamic',
    'playful': 'Playful & Fun',
    'mysterious': 'Mysterious & Edgy',
    'romantic': 'Romantic & Dreamy',
    'professional': 'Professional'
  };

  const styleMap = {
    'minimalist': 'Minimalist Photography',
    'editorial': 'Editorial Style',
    'commercial': 'Commercial Photography',
    'lifestyle': 'Lifestyle Photography',
    'high-fashion': 'High Fashion Style',
    'vintage': 'Vintage/Retro Style',
    'street': 'Street Style',
    'bohemian': 'Bohemian Style'
  };

  const colorPaletteMap = {
    'neutral': 'Neutral Colors',
    'warm': 'Warm Tones',
    'cool': 'Cool Tones',
    'pastel': 'Pastel Colors',
    'monochrome': 'Monochrome',
    'vibrant': 'Vibrant Colors',
    'earth-tones': 'Earth Tones',
    'metallic': 'Metallic'
  };

  const cameraAngleMap = {
    'eye-level': 'Eye Level Camera',
    'slight-angle': 'Slight Angle',
    'three-quarter': 'Three-Quarter View',
    'full-front': 'Full Front View',
    'over-shoulder': 'Over Shoulder View'
  };

  return `Analyze these two images in detail for a Virtual Try-On system:

IMAGE 1 - CHARACTER/PERSON (Vietnamese/Southeast Asian):
- Gender, estimated age
- Ethnicity: Note Vietnamese characteristics (olive/tan skin tone, dark hair, typical Vietnamese facial features)
- Body type (slim, athletic, curvy, etc.) - common Vietnamese body types
- Skin tone (Vietnamese: olive, tan, light brown, fair with warm undertones)
- Hair: color (typically black/dark brown), style, length - common Vietnamese hairstyles
- Current pose and expression
- Current outfit (if any)
- Note: Subject appears to be Vietnamese based on features

IMAGE 2 - CLOTHING PRODUCT:
- Type of clothing (dress, top, pants, etc.)
- Style category (casual, formal, elegant, streetwear, ao dai, etc.)
- Colors and patterns
- Material/fabric type
- Fit type (slim, regular, loose, oversized)
- Notable design details (buttons, zippers, prints, embroidery)
- Is this suitable for Vietnamese fashion/trends?

FASHION ANALYSIS:
- Compatibility score (1-10) between character and clothing
- Style recommendations for scene, lighting, and mood suitable for Vietnamese context
- Suggested pose for wearing this clothing
- Color harmony analysis
- Any adjustments needed for Vietnamese body types/skin tones?

STYLE CUSTOMIZATION (User Selected):
- Scene: ${sceneMap[scene] || scene}
- Lighting: ${lightingMap[lighting] || lighting}
- Mood: ${moodMap[mood] || mood}
- Photography Style: ${styleMap[style] || style}
- Color Palette: ${colorPaletteMap[colorPalette] || colorPalette}
- Camera Angle: ${cameraAngleMap[cameraAngle] || cameraAngle}
${hairstyle ? `- Hairstyle: ${hairstyle}` : ''}
${makeup ? `- Makeup: ${makeup}` : ''}
${customPrompt ? `- Custom: ${customPrompt}` : ''}

IMPORTANT: Please provide your recommendations in this STRUCTURED FORMAT at the end of your analysis:

=== RECOMMENDATIONS ===
scene: [primary recommendation]
lighting: [primary recommendation]
mood: [primary recommendation]
style: [primary recommendation]
colorPalette: [primary recommendation]
cameraAngle: [primary recommendation]
hairstyle: [recommendation for hairstyle - if character has suitable hair, suggest specific style like "long-straight", "medium-wavy", "short-bob", etc. or say "keep-current" if current style fits]
makeup: [recommendation for makeup style - "natural", "light", "glowing", "bold-lips", "smokey-eyes", or "keep-current"]
bottoms: [if top/product shown, suggest bottoms like "jeans", "trousers", "skirt", "shorts", "leggings", "cargo-pants" or "keep-existing"]
shoes: [suggest shoes like "sneakers", "heels", "boots", "flats", "sandals", "loafers" or "keep-existing"]
accessories: [suggest accessories like "necklace", "earrings", "watch", "bag", "sunglasses", "scarf", "belt", "hat" or "none"]
outerwear: [suggest outerwear like "jacket", "coat", "blazer", "cardigan", "hoodie", "vest" or "none"]

Provide detailed reasoning for each recommendation based on the analysis of both images.`;
}

/**
 * Build generation prompt from analysis and options
 */
function buildGenerationPrompt(analysisText, options = {}) {
  const {
    scene = 'studio',
    lighting = 'soft-diffused',
    mood = 'confident',
    style = 'minimalist',
    colorPalette = 'neutral',
    cameraAngle = 'eye-level',
    aspectRatio = '1:1',
    negativePrompt = ''
  } = options;

  // Map aspect ratio
  const aspectRatioMap = {
    '1:1': 'square (1:1)',
    '4:3': 'landscape (4:3)',
    '3:4': 'portrait (3:4)',
    '16:9': 'wide (16:9)',
    '9:16': 'vertical (9:16)'
  };

  const sceneMap = {
    'studio': 'Professional Studio with clean background',
    'white-background': 'White Background',
    'urban-street': 'Urban Street Environment',
    'minimalist-indoor': 'Minimalist Indoor Setting',
    'cafe': 'Cozy Cafe Setting',
    'outdoor-park': 'Outdoor Park with natural greenery',
    'office': 'Modern Office Interior',
    'luxury-interior': 'Luxury Interior with elegant decor',
    'rooftop': 'Rooftop with city skyline view'
  };

  const lightingMap = {
    'soft-diffused': 'soft diffused lighting from 45° angle',
    'natural-window': 'natural window light',
    'golden-hour': 'golden hour warm lighting',
    'dramatic-rembrandt': 'dramatic Rembrandt lighting',
    'high-key': 'high key bright lighting',
    'backlit': 'backlit with rim light',
    'neon-colored': 'neon colored lighting effects',
    'overcast-outdoor': 'soft overcast outdoor lighting'
  };

  return `Based on the analysis of the two images I uploaded earlier, generate a photorealistic fashion image.

=== KEEP CHARACTER UNCHANGED ===
Keep the EXACT same person from image 1:
- Same face, same facial features, same expression
- Same body type and proportions
- Same skin tone
- Same hair color and style
- Same pose orientation

=== CHANGE CLOTHING TO ===
Dress the character in the EXACT clothing from image 2:
- Match the exact color, pattern, and design
- Match the exact material and texture
- The clothing should fit naturally on the character's body
- Proper draping and fabric physics

=== ENVIRONMENT ===
Setting: ${sceneMap[scene] || scene}
Lighting: ${lightingMap[lighting] || lighting}
Mood: ${mood}

=== PHOTOGRAPHY ===
Style: ${style}
Camera: ${cameraAngle}
Aspect Ratio: ${aspectRatioMap[aspectRatio] || aspectRatio}
Quality: 8K, ultra-detailed, sharp focus, photorealistic
Color: Natural, accurate color reproduction with ${colorPalette} palette
Composition: Centered, full body visible, fashion magazine quality

${negativePrompt ? `=== AVOID ===\n${negativePrompt}` : '=== AVOID ===\nblurry, low quality, watermark, distorted, artifacts, bad lighting'}

Generate this image now.`;
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
 * Parse structured recommendations from AI analysis response
 * Extracts recommendations from the === RECOMMENDATIONS === section
 */
function parseRecommendations(analysisText) {
  const recommendations = {
    scene: null,
    lighting: null,
    mood: null,
    style: null,
    colorPalette: null,
    cameraAngle: null,
    hairstyle: null,
    makeup: null,
    bottoms: null,
    shoes: null,
    accessories: null,
    outerwear: null
  };

  try {
    // Find the RECOMMENDATIONS section
    const recSectionMatch = analysisText.match(/=== RECOMMENDATIONS ===([\s\S]*?)(?:===|$)/i);
    
    if (!recSectionMatch || !recSectionMatch[1]) {
      console.log(`⚠️  No structured RECOMMENDATIONS section found in analysis`);
      return recommendations;
    }

    const recText = recSectionMatch[1];
    console.log(`📋 Found recommendations section, parsing...`);

    // Parse each field
    const fields = ['scene', 'lighting', 'mood', 'style', 'colorPalette', 'cameraAngle', 'hairstyle', 'makeup', 'bottoms', 'shoes', 'accessories', 'outerwear'];
    
    fields.forEach(field => {
      // Match "field: value" pattern
      const match = recText.match(new RegExp(`${field}:\\s*([^\\n]+)`, 'i'));
      if (match && match[1]) {
        let value = match[1].trim().toLowerCase();
        
        // Clean up the value - remove quotes, brackets, etc.
        value = value.replace(/^["'\[\]{}]+|["'\[\]{}]+$/g, '').trim();
        
        // Skip "keep-current", "keep-existing", "none" values for fashion categories
        if (!['keep-current', 'keep-existing', 'none', 'n/a', 'not applicable'].includes(value)) {
          recommendations[field] = value;
          console.log(`   ✅ ${field}: ${value}`);
        }
      }
    });

    console.log(`📋 Parsed recommendations:`, recommendations);
    return recommendations;

  } catch (error) {
    console.error(`❌ Error parsing recommendations:`, error.message);
    return recommendations;
  }
}

/**
 * Auto-save new options to database
 * Checks if option exists, if not creates it
 */
async function autoSaveRecommendations(recommendations) {
  try {
    // Dynamic import to avoid circular dependency
    const { default: PromptOption } = await import('../models/PromptOption.js');
    
    const newOptionsCreated = [];
    const categories = ['hairstyle', 'makeup', 'bottoms', 'shoes', 'accessories', 'outerwear'];
    
    for (const category of categories) {
      const value = recommendations[category];
      if (!value) continue;
      
      // Check if option already exists
      const existing = await PromptOption.findOne({ 
        category, 
        value,
        isActive: true 
      });
      
      if (!existing) {
        // Create new option with auto-generated label and description
        const label = value.split('-').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
        
        const newOption = new PromptOption({
          category,
          value,
          label,
          description: `Auto-created from AI recommendation for ${category}`,
          keywords: [value, category],
          technicalDetails: {
            source: 'ai_recommendation',
            createdAt: new Date().toISOString()
          },
          isActive: true,
          sortOrder: 999 // Put at end
        });
        
        await newOption.save();
        newOptionsCreated.push({ category, value, label });
        console.log(`   ✅ Auto-created new option: ${category}/${value}`);
      }
    }
    
    return newOptionsCreated;
    
  } catch (error) {
    console.error(`❌ Error auto-saving recommendations:`, error.message);
    return [];
  }
}

/**
 * STEP 2: Browser Analysis - Only analyze images, return text
 * Does NOT generate any images - just returns analysis text
 */
export async function analyzeWithBrowser(req, res) {
  let browserService = null;
  const tempFiles = [];

  try {
    const { 
      analysisProvider = 'grok',
      // Style customization options from frontend
      scene = 'studio',
      lighting = 'soft-diffused',
      mood = 'confident',
      style = 'minimalist',
      colorPalette = 'neutral',
      hairstyle = null,
      makeup = null,
      cameraAngle = 'eye-level',
      aspectRatio = '1:1',
      customPrompt = ''
    } = req.body;

    const characterImage = req.files?.characterImage?.[0];
    const productImage = req.files?.productImage?.[0];

    if (!characterImage || !productImage) {
      return res.status(400).json({ 
        error: 'Both character and product images are required',
        success: false 
      });
    }

    // Build style options object
    const styleOptions = {
      scene,
      lighting,
      mood,
      style,
      colorPalette,
      hairstyle,
      makeup,
      cameraAngle,
      aspectRatio,
      customPrompt
    };

    // ====================================
    // STEP 1: Save uploaded images
    // ====================================
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🔍 BROWSER ANALYSIS - START`);
    console.log(`${'='.repeat(80)}\n`);

    console.log(`💾 Saving uploaded images to temp...`);
    const charImagePath = path.join(tempDir, `char-${Date.now()}-${characterImage.originalname}`);
    const prodImagePath = path.join(tempDir, `prod-${Date.now()}-${productImage.originalname}`);
    
    fs.writeFileSync(charImagePath, characterImage.buffer);
    fs.writeFileSync(prodImagePath, productImage.buffer);
    tempFiles.push(charImagePath, prodImagePath);
    
    console.log(`   ✅ Character: ${path.basename(charImagePath)}`);
    console.log(`   ✅ Product: ${path.basename(prodImagePath)}`);

    // ====================================
    // STEP 2: Initialize browser service for analysis
    // ====================================
    console.log(`\n📊 Initializing browser service for analysis...`);
    
    switch (analysisProvider) {
      case 'grok':
      case 'grok.com':
        browserService = new GrokServiceV2({ headless: false });
        break;
      case 'zai':
      case 'chat.z.ai':
      default:
        browserService = new ZAIChatService({ headless: false });
    }
    
    console.log(`   🚀 Initializing ${analysisProvider}...`);
    await browserService.initialize();

    // ====================================
    // STEP 3: Build analysis prompt with all style options
    // ====================================
    console.log(`\n🔨 Building analysis prompt...`);
    const analysisPrompt = buildAnalysisPrompt(styleOptions);

    // ====================================
    // STEP 4: Analyze images (NO generation)
    // ====================================
    console.log(`\n🤖 Analyzing images (no generation)...`);
    
    const analysisResult = await browserService.analyzeMultipleImages(
      [charImagePath, prodImagePath],
      analysisPrompt
    );
    
    const analysisText = analysisResult?.text || analysisResult;
    console.log(`   ✅ Analysis complete!`);
    console.log(`      Result: "${analysisText?.substring(0, 200) || 'N/A'}..."`);

    // ====================================
    // STEP 5: Parse recommendations from AI response
    // ====================================
    console.log(`\n📋 Parsing recommendations from AI response...`);
    const recommendations = parseRecommendations(analysisText);
    
    // ====================================
    // STEP 6: Auto-save new options to database
    // ====================================
    console.log(`\n💾 Auto-saving new options to database...`);
    const newOptionsCreated = await autoSaveRecommendations(recommendations);

    // Cleanup
    await browserService.close();
    cleanupTempFiles(tempFiles);

    // Return analysis + recommendations
    console.log(`\n✅ BROWSER ANALYSIS - COMPLETE`);
    console.log(`   Analysis text returned with ${Object.values(recommendations).filter(v => v).length} recommendations\n`);

    return res.json({
      success: true,
      data: {
        analysis: analysisText,
        recommendations, // Parsed structured recommendations
        newOptionsCreated, // New options that were auto-created in DB
        providers: {
          analysis: analysisProvider
        },
        // Return empty images array - this is ANALYSIS ONLY
        generatedImages: []
      },
      message: 'Analysis completed successfully. Recommendations parsed and new options auto-saved to database.'
    });

  } catch (error) {
    console.error(`\n❌ ANALYSIS ERROR:`, error.message);
    if (browserService) await browserService.close();
    cleanupTempFiles(tempFiles);
    
    return res.status(500).json({
      error: error.message,
      success: false,
      stage: 'analysis'
    });
  }
}

/**
 * STEP 5: Browser Generation - Generate image from prompt/options
 * Takes pre-uploaded images info and generates the final image
 */
export async function generateWithBrowser(req, res) {
  let browserService = null;
  const tempFiles = [];

  try {
    const { 
      imageGenProvider = 'grok',
      prompt,
      negativePrompt = '',
      // Style customization options
      scene = 'studio',
      lighting = 'soft-diffused',
      mood = 'confident',
      style = 'minimalist',
      colorPalette = 'neutral',
      cameraAngle = 'eye-level',
      aspectRatio = '1:1',
      // Images from previous step (passed as base64 or paths)
      characterImageBase64,
      productImageBase64,
      characterImagePath,
      productImagePath
    } = req.body;

    // Get image paths - either from temp files or convert base64
    let charImagePath = characterImagePath;
    let prodImagePath = productImagePath;
    
    // If base64 provided, save to temp
    if (characterImageBase64 && productImageBase64) {
      console.log(`\n💾 Converting base64 images to temp files...`);
      
      // Character image
      const charBuffer = Buffer.from(characterImageBase64, 'base64');
      charImagePath = path.join(tempDir, `char-gen-${Date.now()}.png`);
      fs.writeFileSync(charImagePath, charBuffer);
      tempFiles.push(charImagePath);
      
      // Product image
      const prodBuffer = Buffer.from(productImageBase64, 'base64');
      prodImagePath = path.join(tempDir, `prod-gen-${Date.now()}.png`);
      fs.writeFileSync(prodImagePath, prodBuffer);
      tempFiles.push(prodImagePath);
      
      console.log(`   ✅ Images saved to temp`);
    }
    
    if (!charImagePath || !prodImagePath) {
      return res.status(400).json({ 
        error: 'Image paths or base64 required',
        success: false 
      });
    }

    // Build style options
    const styleOptions = {
      scene,
      lighting,
      mood,
      style,
      colorPalette,
      cameraAngle,
      aspectRatio,
      negativePrompt
    };

    // ====================================
    // STEP 1: Initialize browser service
    // ====================================
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🎨 BROWSER GENERATION - START`);
    console.log(`${'='.repeat(80)}\n`);
    
    switch (imageGenProvider) {
      case 'grok':
      case 'grok.com':
        browserService = new GrokServiceV2({ headless: false });
        break;
      case 'zai':
      case 'image.z.ai':
      default:
        browserService = new ZAIImageService({ headless: false });
    }
    
    console.log(`   🚀 Initializing ${imageGenProvider}...`);
    await browserService.initialize();

    // ====================================
    // STEP 2: Build generation prompt
    // ====================================
    console.log(`\n🔨 Building generation prompt...`);
    const generationPrompt = buildGenerationPrompt(prompt, styleOptions);
    console.log(`   ✅ Prompt built with scene: ${scene}, lighting: ${lighting}, mood: ${mood}`);

    // ====================================
    // STEP 3: Upload images and generate
    // ====================================
    console.log(`\n🖼️  Generating image...`);
    
    const outputImagePath = path.join(tempDir, `browser-gen-${Date.now()}.png`);
    
    const imageResult = await browserService.generateImage(generationPrompt, {
      download: true,
      outputPath: outputImagePath
    });
    
    console.log(`   ✅ Image generated`);
    
    // Validate
    await validateImage(outputImagePath);
    
    // Cleanup
    await browserService.close();
    cleanupTempFiles(tempFiles);

    // Return generated image
    const fileStats = fs.statSync(outputImagePath);
    console.log(`\n✅ BROWSER GENERATION - COMPLETE\n`);

    return res.json({
      success: true,
      data: {
        generatedImages: [{
          url: `file://${outputImagePath}`,
          path: outputImagePath,
          size: fileStats.size,
          filename: path.basename(outputImagePath),
          provider: imageGenProvider
        }],
        providers: {
          generation: imageGenProvider
        },
        validation: {
          status: 'valid',
          size_bytes: fileStats.size,
          timestamp: new Date().toISOString()
        }
      },
      message: 'Image generated successfully via browser automation'
    });

  } catch (error) {
    console.error(`\n❌ GENERATION ERROR:`, error.message);
    if (browserService) await browserService.close();
    cleanupTempFiles(tempFiles);
    
    return res.status(500).json({
      error: error.message,
      success: false,
      stage: 'generation'
    });
  }
}

/**
 * Legacy: Analyze and generate image using browser automation - FULL FLOW
 * DEPRECATED - Use analyzeWithBrowser + generateWithBrowser instead
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
      useRealAnalysis = true,  // Enable real analysis by default
      // Style customization options from frontend
      scene = 'studio',
      lighting = 'soft-diffused',
      mood = 'confident',
      style = 'minimalist',
      colorPalette = 'neutral',
      hairstyle = null,
      makeup = null,
      cameraAngle = 'eye-level',
      aspectRatio = '1:1',
      customPrompt = ''
    } = req.body;
    
    // Build style options object
    const styleOptions = {
      scene,
      lighting,
      mood,
      style,
      colorPalette,
      hairstyle,
      makeup,
      cameraAngle,
      aspectRatio,
      customPrompt,
      negativePrompt
    };

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
        
        // Use the comprehensive analysis prompt with all style options
        const analysisPrompt = buildAnalysisPrompt(styleOptions);
        
        const analysisResult = await analysisService.analyzeMultipleImages(
          [charImagePath, prodImagePath],
          analysisPrompt
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
    // STEP 3: Build generation prompt with all style options
    // ====================================
    console.log(`\n🔨 STEP 3: Building generation prompt with all style options...`);
    // Use the comprehensive generation prompt with all style customization
    const optimizedPrompt = buildGenerationPrompt(analysisText, styleOptions);
    console.log(`   ✅ Prompt built with scene: ${styleOptions.scene}, lighting: ${styleOptions.lighting}, mood: ${styleOptions.mood}`);

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
