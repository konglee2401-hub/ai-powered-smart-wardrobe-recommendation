import fs from 'fs';
import path from 'path';
import CharacterProfile from '../models/CharacterProfile.js';
import GoogleFlowAutomationService from '../services/googleFlowAutomationService.js';

const tempDir = path.join(process.cwd(), 'temp');
const characterDir = path.join(process.cwd(), 'uploads', 'characters');

if (!fs.existsSync(characterDir)) fs.mkdirSync(characterDir, { recursive: true });

function safeAlias(raw = '') {
  return (raw || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .trim();
}

function buildCharacterPrompts(name, alias, options = {}, imageCount = 6) {
  const identity = options.identity || {};
  const face = options.face || {};
  const hair = options.hair || {};
  const styling = options.styling || {};
  const capturePlan = options.capturePlan || {};
  const defaultOutfit = 'strapless midriff-baring bandeau crop top with short fitted cotton shorts or tight denim shorts';
  const outfitConsistency = styling.outfitConsistency || 'Use one consistent outfit type across all generated shots. Do not switch outfit category between images.';
  const outfitPriority = styling.outfitPriority || `Outfit priority: ${defaultOutfit}. Keep body lines clear and visible while remaining tasteful and fashion-focused.`;
  const base = [
    `Reference character: ${name} (${alias}).`,
    'Strict identity lock. Keep exact same face, skin, body proportions, hairline, and age.',
    `Gender: ${identity.gender || 'unspecified'}, age range: ${identity.ageRange || 'young adult'}, height: ${identity.height || 'average'}, bust: ${identity.bust || 'balanced'}, waist: ${identity.waist || 'balanced'}, body: ${identity.bodyType || 'balanced'}.`,
    `Face details: ${face.faceShape || 'natural'} face, ${face.eyeShape || 'natural'} eyes ${face.eyeColor || ''}, ${face.lipShape || 'natural'} lips, ${face.jawline || 'defined'} jawline.`,
    `Hair details: ${hair.color || 'natural'} ${hair.length || 'medium'} ${hair.texture || 'natural'} hair, style ${hair.style || 'clean natural'}.`,
    `Styling baseline: ${styling.outfitVibe || 'minimal neutral fashion'}, accessories ${styling.accessories || 'minimal'}, jewelry ${styling.jewelry || 'minimal'}, tattoos ${identity.tattoos || 'none visible'}.`,
    outfitConsistency,
    outfitPriority,
    `Lighting: ${capturePlan.lightingStyle || 'soft studio'}, background: ${capturePlan.backgroundStyle || 'clean neutral'}, lens: ${capturePlan.cameraLens || '85mm portrait'}.`,
    options.extraPromptNotes || ''
  ].filter(Boolean).join(' ');

  const shotPlan = [
    'close-up face portrait, eyes to camera, high skin detail',
    'head-and-shoulders 3/4 angle portrait',
    'waist-up portrait with natural hand gesture',
    'full body front pose, feet visible',
    'full body side angle pose, feet visible',
    'full body back-3/4 angle pose',
    'close-up profile face shot',
    'walking full body candid pose'
  ];

  return Array.from({ length: imageCount }).map((_, idx) => {
    const shot = shotPlan[idx % shotPlan.length];
    const portraitFirstRule = idx === 0
      ? 'FIRST OUTPUT MUST BE A CLEAN PORTRAIT CLOSE-UP. Prioritize face fidelity.'
      : 'Keep identity identical to the first portrait output.';
    return `${base} ${portraitFirstRule} Shot requirement: ${shot}. Ultra realistic fashion photography. No blur, no deformation, no identity drift.`;
  });
}

export async function generateCharacterPreview(req, res) {
  let portraitPath = null;
  try {
    const portrait = req.file;
    const { name, alias, imageCount = 6, aspectRatio = '9:16', options = '{}', seed } = req.body;
    if (!portrait || !name) {
      return res.status(400).json({ success: false, error: 'portraitImage and name are required' });
    }

    const normalizedAlias = safeAlias(alias || name);
    const parsedOptions = typeof options === 'string' ? JSON.parse(options || '{}') : options;

    portraitPath = path.join(tempDir, `character-portrait-${Date.now()}-${portrait.originalname}`);
    fs.writeFileSync(portraitPath, portrait.buffer);

    const prompts = buildCharacterPrompts(name, normalizedAlias, parsedOptions, Number(imageCount));
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('🎭 CHARACTER GENERATION STARTING');
    console.log(`📋 Character: ${name} (${normalizedAlias})`);
    console.log(`🖼️  Portrait: ${path.basename(portraitPath)}`);
    console.log(`📸 Prompts: ${prompts.length} with Google Flow set to x4 per prompt`);
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    const flow = new GoogleFlowAutomationService({
      type: 'image',
      aspectRatio,
      imageCount: 4,  // Set Google Flow settings to x4 (4 images per prompt)
      model: 'Nano Banana 2',
      headless: false,
      outputDir: path.join(tempDir, 'character-previews'),
      seed: Number.isInteger(Number(seed)) ? Number(seed) : undefined
    });

    console.log(`🎬 Starting Google Flow generation...`);
    // Generate with all prompts, Google Flow will do x4 for each
    const result = await flow.generateImages({ characterImagePath: portraitPath }, { prompts, outputCount: 4 });
    console.log(`🎬 Google Flow generation completed!`);
    console.log(`📦 Result object keys: ${Object.keys(result).join(', ')}`);
    
    const generationSeed = result.seed;
    
    console.log(`\n✅ Generation completed. Processing results...`);
    console.log(`📊 Total results received: ${result.results?.length || 0}`);
    
    // Group successful results by prompt and pick 1 per prompt
    const generatedImages = [];
    const resultsByPrompt = {};
    
    // Group results by prompt
    for (const genResult of (result.results || [])) {
      if (!genResult.success || !genResult.downloadedFile) continue;
      
      const promptNum = genResult.promptNumber || 1;
      if (!resultsByPrompt[promptNum]) {
        resultsByPrompt[promptNum] = [];
      }
      
      const filename = path.basename(genResult.downloadedFile);
      global.generatedImagePaths = global.generatedImagePaths || {};
      global.generatedImagePaths[filename] = genResult.downloadedFile;
      
      resultsByPrompt[promptNum].push({
        url: `http://localhost:5000/api/v1/browser-automation/generated-image/${filename}`,
        path: genResult.downloadedFile,
        filename,
        prompt: genResult.prompt,
        seed: genResult.seed || generationSeed
      });
    }
    
    console.log(`\n📂 Grouped by prompt: ${Object.keys(resultsByPrompt).length} prompts with results`);
    
    // Pick random 1 image from each prompt's successful results
    for (const promptNum in resultsByPrompt) {
      const images = resultsByPrompt[promptNum];
      if (images.length > 0) {
        const randomIdx = Math.floor(Math.random() * images.length);
        const selected = images[randomIdx];
        generatedImages.push({
          ...selected,
          angle: `shot-${generatedImages.length + 1}`,
          promptNumber: parseInt(promptNum)
        });
        console.log(`✅ Prompt ${promptNum}: Selected ${selected.filename} (${randomIdx + 1}/${images.length})`);
      }
    }
    
    console.log(`\n═══════════════════════════════════════════════════════════════`);
    console.log('🎭 CHARACTER GENERATION RESULTS');
    console.log(`📊 Generated: ${generatedImages.length} final images from ${prompts.length} prompts`);
    console.log(`✅ Selection: 1 random image per prompt`);
    console.log(`📸 Preview images: ${generatedImages.length > 0 ? generatedImages.map(img => img.filename).join(', ') : 'NO SUCCESS'}`);
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    console.log('📤 Returning results to frontend...');
    
    return res.json({
      success: true,
      data: {
        name,
        alias: normalizedAlias,
        portraitTempPath: portraitPath,
        prompts,
        generatedImages,
        seed: generationSeed,
        observedSeedRequests: result.observedSeedRequests || []
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function saveCharacterProfile(req, res) {
  try {
    console.log(`[Character Save] ═══════════════════════════════════════════════════`);
    console.log(`[Character Save] Received request body keys: ${Object.keys(req.body).join(', ')}`);
    console.log(`[Character Save] Raw request body type:`, typeof req.body);
    
    // 💫 FIX: Check if entire body is a string (double stringification)
    if (typeof req.body === 'string') {
      console.warn(`[Character Save] ⚠️  Request body is a string! Parsing...`);
      try {
        req.body = JSON.parse(req.body);
        console.log(`[Character Save] ✅ Successfully parsed stringified body`);
      } catch (e) {
        console.error(`[Character Save] ❌ Failed to parse body: ${e.message}`);
        return res.status(400).json({ success: false, error: 'Invalid request body' });
      }
    }
    
    let { name, alias, portraitTempPath, options = {}, generatedImages = [], analysisProfile = {} } = req.body;
    
    console.log(`[Character Save] Name: "${name}", Alias: "${alias}"`);
    console.log(`[Character Save] Portrait path: ${portraitTempPath}`);
    console.log(`[Character Save] generatedImages type: ${typeof generatedImages}`);
    console.log(`[Character Save] generatedImages is array: ${Array.isArray(generatedImages)}`);
    console.log(`[Character Save] generatedImages length: ${generatedImages?.length || 'N/A'}`);
    
    if (typeof generatedImages === 'string') {
      console.log(`[Character Save] generatedImages is a STRING (first 150 chars): ${generatedImages.substring(0, 150)}`);
    }
    
    if (!name || !alias || !portraitTempPath) {
      const missing = [];
      if (!name) missing.push('name');
      if (!alias) missing.push('alias');
      if (!portraitTempPath) missing.push('portraitTempPath');
      const error = `Missing required fields: ${missing.join(', ')}`;
      console.warn(`[Character Save] ⚠️  ${error}`);
      return res.status(400).json({ success: false, error });
    }

    // Parse if generatedImages comes as string
    if (typeof generatedImages === 'string') {
      try {
        console.log(`[Character Save] 🔄 Parsing generatedImages from string...`);
        generatedImages = JSON.parse(generatedImages);
        console.log(`[Character Save] ✅ Parsed to array with ${generatedImages.length} items`);
      } catch (e) {
        console.warn(`[Character Save] ⚠️  Failed to parse generatedImages: ${e.message}`);
        console.warn(`[Character Save] Raw value (first 200 chars): ${generatedImages.substring(0, 200)}`);
        generatedImages = [];
      }
    }
    
    // Ensure it's an array
    if (!Array.isArray(generatedImages)) {
      console.warn(`[Character Save] ⚠️  generatedImages is not an array after parsing: ${typeof generatedImages}`);
      generatedImages = [];
    }

    // 💫 FIX: Handle case where array has stringified content as single element
    if (Array.isArray(generatedImages) && generatedImages.length === 1 && typeof generatedImages[0] === 'string') {
      console.warn(`[Character Save] ⚠️  Array contains single stringified element, attempting to parse...`);
      try {
        const parsed = JSON.parse(generatedImages[0]);
        if (Array.isArray(parsed)) {
          console.log(`[Character Save] ✅ Recovered array from stringified element`);
          generatedImages = parsed;
        }
      } catch (e) {
        console.warn(`[Character Save] ⚠️  Could not parse stringified element: ${e.message}`);
        generatedImages = [];
      }
    }
    
    // Parse if options comes as string
    if (typeof options === 'string') {
      try {
        console.log(`[Character Save] 🔄 Parsing options from string...`);
        options = JSON.parse(options);
        console.log(`[Character Save] ✅ Parsed options`);
      } catch (e) {
        console.warn(`[Character Save] ⚠️  Failed to parse options: ${e.message}`);
        options = {};
      }
    }

    // 💫 FIX: Convert string imageCount to number
    if (options.capturePlan && typeof options.capturePlan.imageCount === 'string') {
      console.log(`[Character Save] Converting imageCount from string: "${options.capturePlan.imageCount}"`);
      options.capturePlan.imageCount = parseInt(options.capturePlan.imageCount, 10) || 4;
      console.log(`[Character Save] ✅ Converted to number: ${options.capturePlan.imageCount}`);
    }

    const normalizedAlias = safeAlias(alias || name);
    console.log(`[Character Save] Normalized alias: ${normalizedAlias}`);
    
    const existing = await CharacterProfile.findOne({ alias: normalizedAlias });
    if (existing) {
      const error = `Character alias "${normalizedAlias}" already exists`;
      console.warn(`[Character Save] ⚠️  ${error}`);
      return res.status(400).json({ success: false, error });
    }

    // Ensure uploads/characters directory exists
    const uploadsDir = path.join(process.cwd(), 'uploads', 'characters');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log(`[Character Save] Created directory: ${uploadsDir}`);
    }

    const portraitFilename = `${normalizedAlias}-${Date.now()}-portrait.png`;
    const portraitDest = path.join(uploadsDir, portraitFilename);
    
    console.log(`[Character Save] Portrait temp path: ${portraitTempPath}`);
    console.log(`[Character Save] Portrait dest: ${portraitDest}`);
    
    if (fs.existsSync(portraitTempPath)) {
      fs.copyFileSync(portraitTempPath, portraitDest);
      console.log(`[Character Save] ✅ Copied portrait file`);
    } else {
      console.warn(`[Character Save] ⚠️  Portrait temp path does not exist: ${portraitTempPath}`);
    }

    // 💫 FIX: Process generated images - validate each image
    console.log(`[Character Save] 🔄 Processing ${generatedImages.length} generatedImages...`);
    console.log(`[Character Save] generatedImages sample (if available):`, JSON.stringify(generatedImages.slice(0, 1), null, 2));
    
    const savedRefs = generatedImages
      .filter((img, idx) => {
        // Skip if not an object
        if (typeof img !== 'object' || img === null) {
          console.warn(`[Character Save]   ⚠️  Image ${idx} is not an object (${typeof img}), skipping`);
          return false;
        }
        
        // Skip if it's a string
        if (typeof img === 'string') {
          console.warn(`[Character Save]   ⚠️  Image ${idx} is a string, skipping`);
          return false;
        }
        
        if (!img.url) {
          console.warn(`[Character Save]   ⚠️  Image ${idx} has no URL, skipping`);
          return false;
        }
        
        // All validations passed
        return true;
      })
      .map((img, idx) => {
        // Ensure all properties are properly typed
        const ref = {
          url: String(img.url || ''),
          path: String(img.path || ''),
          angle: String(img.angle || `shot-${idx + 1}`),
          type: String(img.type || (idx < 2 ? 'portrait' : 'full-body')),
          prompt: String(img.prompt || ''),
          seed: Number.isInteger(img.seed) ? img.seed : null
        };
        
        console.log(`[Character Save]   ✅ Image ${idx}: Type=${ref.type}, URL=${ref.url.substring(0, 60)}...`);
        return ref;
      });

    console.log(`[Character Save] ✅ Created ${savedRefs.length} reference image objects`);
    console.log(`[Character Save] Sample reference object:`, JSON.stringify(savedRefs[0], null, 2));

    const characterData = {
      name,
      alias: normalizedAlias,
      portraitUrl: `http://localhost:5000/uploads/characters/${portraitFilename}`,
      portraitPath: portraitDest,
      referenceImages: savedRefs,
      options,
      analysisProfile,
      status: 'active'
    };

    console.log(`[Character Save] 🔍 About to create character with:`);
    console.log(`[Character Save]   - Name: ${characterData.name}`);
    console.log(`[Character Save]   - Alias: ${characterData.alias}`);
    console.log(`[Character Save]   - Reference images count: ${characterData.referenceImages.length}`);
    console.log(`[Character Save]   - referenceImages[0] type: ${typeof characterData.referenceImages[0]}`);
    if (characterData.referenceImages[0]) {
      console.log(`[Character Save]   - referenceImages[0] keys: ${Object.keys(characterData.referenceImages[0]).join(', ')}`);
    }

    const character = await CharacterProfile.create(characterData);

    console.log(`[Character Save] ✅ Successfully saved character: ${name} (${normalizedAlias}), ID: ${character._id}`);
    console.log(`[Character Save] ✅ Saved with ${character.referenceImages.length} reference images`);
    return res.json({ success: true, data: character });
  } catch (error) {
    console.error(`[Character Save] ❌ Error: ${error.message}`);
    console.error(`[Character Save] Stack:`, error.stack);
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function listCharacters(req, res) {
  const data = await CharacterProfile.find({ status: 'active' }).sort({ updatedAt: -1 }).lean();
  res.json({ success: true, data });
}

export async function getCharacter(req, res) {
  const data = await CharacterProfile.findById(req.params.id).lean();
  if (!data) return res.status(404).json({ success: false, error: 'Character not found' });
  res.json({ success: true, data });
}

export async function deleteCharacter(req, res) {
  try {
    const { id } = req.params;
    const character = await CharacterProfile.findById(id);
    if (!character) {
      return res.status(404).json({ success: false, error: 'Character not found' });
    }

    // Delete associated files
    if (character.portraitPath && fs.existsSync(character.portraitPath)) {
      fs.unlinkSync(character.portraitPath);
    }
    if (character.referenceImages && Array.isArray(character.referenceImages)) {
      character.referenceImages.forEach((ref) => {
        if (ref.path && fs.existsSync(ref.path)) {
          try {
            fs.unlinkSync(ref.path);
          } catch (e) {
            // Ignore file deletion errors
          }
        }
      });
    }

    // Delete character record
    await CharacterProfile.findByIdAndDelete(id);
    res.json({ success: true, message: 'Character deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
