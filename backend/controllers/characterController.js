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
      model: 'Nano Banana Pro',
      headless: false,
      outputDir: path.join(tempDir, 'character-previews'),
      seed: Number.isInteger(Number(seed)) ? Number(seed) : undefined
    });

    // Generate with all prompts, Google Flow will do x4 for each
    const result = await flow.generateImages({ characterImagePath: portraitPath }, { prompts, outputCount: 4 });
    const generationSeed = result.seed;
    
    // Collect all successful images and randomly pick 1 per prompt
    const generatedImages = [];
    let promptIndex = 0;
    
    // Group results by prompt
    for (const genResult of (result.results || [])) {
      if (genResult.success && genResult.downloadedFile) {
        const filename = path.basename(genResult.downloadedFile);
        global.generatedImagePaths = global.generatedImagePaths || {};
        global.generatedImagePaths[filename] = genResult.downloadedFile;
        
        generatedImages.push({
          url: `http://localhost:5000/api/v1/browser-automation/generated-image/${filename}`,
          path: genResult.downloadedFile,
          filename,
          angle: `shot-${generatedImages.length + 1}`,
          prompt: genResult.prompt,
          seed: genResult.seed || generationSeed,
          promptNumber: promptIndex + 1
        });
      } else if (genResult.promptNumber && genResult.promptNumber > promptIndex) {
        promptIndex = genResult.promptNumber;
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('🎭 CHARACTER GENERATION RESULTS');
    console.log(`📊 Generated: ${generatedImages.length} images from ${prompts.length} prompts (x4 per prompt)`);
    console.log(`✅ Selected: Top successful image from each prompt`);
    console.log(`📸 Preview images: ${generatedImages.length > 0 ? generatedImages.map(img => img.filename).join(', ') : 'NO SUCCESS'}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

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
    let { name, alias, portraitTempPath, options = {}, generatedImages = [], analysisProfile = {} } = req.body;
    if (!name || !alias || !portraitTempPath) {
      return res.status(400).json({ success: false, error: 'name, alias, portraitTempPath are required' });
    }

    // Parse if generatedImages comes as string
    if (typeof generatedImages === 'string') {
      try {
        generatedImages = JSON.parse(generatedImages);
      } catch (e) {
        generatedImages = [];
      }
    }
    // Parse if options comes as string
    if (typeof options === 'string') {
      try {
        options = JSON.parse(options);
      } catch (e) {
        options = {};
      }
    }

    const normalizedAlias = safeAlias(alias || name);
    const existing = await CharacterProfile.findOne({ alias: normalizedAlias });
    if (existing) return res.status(400).json({ success: false, error: 'Character alias already exists' });

    const portraitFilename = `${normalizedAlias}-${Date.now()}-portrait.png`;
    const portraitDest = path.join(characterDir, portraitFilename);
    if (fs.existsSync(portraitTempPath)) {
      fs.copyFileSync(portraitTempPath, portraitDest);
    }

    // Process generated images - keep URLs from preview, don't try to copy files
    const savedRefs = (Array.isArray(generatedImages) ? generatedImages : [])
      .filter(img => img && img.url) // Only keep images with URLs
      .map((img, idx) => ({
        url: img.url || '',
        path: img.path || '',
        angle: img.angle || `shot-${idx + 1}`,
        type: idx < 2 ? 'portrait' : 'full-body',
        prompt: img.prompt || '',
        seed: (typeof img.seed === 'number') ? img.seed : null
      }));

    const character = await CharacterProfile.create({
      name,
      alias: normalizedAlias,
      portraitUrl: `http://localhost:5000/uploads/characters/${portraitFilename}`,
      portraitPath: portraitDest,
      referenceImages: savedRefs,
      options,
      analysisProfile,
      status: 'active'
    });

    return res.json({ success: true, data: character });
  } catch (error) {
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
