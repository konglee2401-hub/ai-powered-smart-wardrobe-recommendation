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
  const base = [
    `Reference character: ${name} (${alias}).`,
    'Strict identity lock. Keep exact same face, skin, body proportions, hairline, and age.',
    `Gender: ${identity.gender || 'unspecified'}, age range: ${identity.ageRange || 'young adult'}, height: ${identity.height || 'average'}, bust: ${identity.bust || 'balanced'}, waist: ${identity.waist || 'balanced'}, body: ${identity.bodyType || 'balanced'}.`,
    `Face details: ${face.faceShape || 'natural'} face, ${face.eyeShape || 'natural'} eyes ${face.eyeColor || ''}, ${face.lipShape || 'natural'} lips, ${face.jawline || 'defined'} jawline.`,
    `Hair details: ${hair.color || 'natural'} ${hair.length || 'medium'} ${hair.texture || 'natural'} hair, style ${hair.style || 'clean natural'}.`,
    `Styling baseline: ${styling.outfitVibe || 'minimal neutral fashion'}, accessories ${styling.accessories || 'minimal'}, jewelry ${styling.jewelry || 'minimal'}, tattoos ${identity.tattoos || 'none visible'}.`,
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
    const flow = new GoogleFlowAutomationService({
      type: 'image',
      aspectRatio,
      imageCount: 1,
      model: 'Nano Banana Pro',
      headless: false,
      outputDir: path.join(tempDir, 'character-previews'),
      seed: Number.isInteger(Number(seed)) ? Number(seed) : undefined
    });

    const result = await flow.generateImages({ characterImagePath: portraitPath }, { prompts, outputCount: 1 });
    const generationSeed = result.seed;
    const generatedImages = (result.results || [])
      .filter(r => r.success && r.downloadedFile)
      .map((r, idx) => {
        const filename = path.basename(r.downloadedFile);
        global.generatedImagePaths = global.generatedImagePaths || {};
        global.generatedImagePaths[filename] = r.downloadedFile;
        return {
          url: `http://localhost:5000/api/v1/browser-automation/generated-image/${filename}`,
          path: r.downloadedFile,
          filename,
          angle: `shot-${idx + 1}`,
          prompt: r.prompt,
          seed: r.seed || generationSeed
        };
      });

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
    
    // 💫 FIX: Handle stringified fields (they might come as strings from frontend)
    if (typeof generatedImages === 'string') {
      try {
        generatedImages = JSON.parse(generatedImages);
      } catch (e) {
        console.error('Failed to parse generatedImages:', e.message);
        generatedImages = [];
      }
    }
    
    if (typeof options === 'string') {
      try {
        options = JSON.parse(options);
      } catch (e) {
        console.warn('Failed to parse options:', e.message);
        options = {};
      }
    }
    
    if (typeof analysisProfile === 'string') {
      try {
        analysisProfile = JSON.parse(analysisProfile);
      } catch (e) {
        console.warn('Failed to parse analysisProfile:', e.message);
        analysisProfile = {};
      }
    }
    
    // Ensure generatedImages is an array
    if (!Array.isArray(generatedImages)) {
      generatedImages = [];
    }
    
    console.log(`[CHAR] Saving character: ${name} | Images count: ${generatedImages.length}`);
    if (generatedImages.length > 0) {
      console.log(`[CHAR] First image structure:`, JSON.stringify(generatedImages[0]).substring(0, 200));
    }
    
    if (!name || !alias || !portraitTempPath) {
      return res.status(400).json({ success: false, error: 'name, alias, portraitTempPath are required' });
    }

    const normalizedAlias = safeAlias(alias || name);
    const existing = await CharacterProfile.findOne({ alias: normalizedAlias });
    if (existing) return res.status(400).json({ success: false, error: 'Character alias already exists' });

    const portraitFilename = `${normalizedAlias}-${Date.now()}-portrait.png`;
    const portraitDest = path.join(characterDir, portraitFilename);
    if (fs.existsSync(portraitTempPath)) {
      fs.copyFileSync(portraitTempPath, portraitDest);
    }

    const savedRefs = [];
    generatedImages.forEach((img, idx) => {
      const srcPath = img.path || (img.filename && global.generatedImagePaths?.[img.filename]);
      if (srcPath && fs.existsSync(srcPath)) {
        const outName = `${normalizedAlias}-${Date.now()}-${idx + 1}.png`;
        const outPath = path.join(characterDir, outName);
        fs.copyFileSync(srcPath, outPath);
        savedRefs.push({
          url: `http://localhost:5000/uploads/characters/${outName}`,
          path: outPath,
          angle: img.angle || `shot-${idx + 1}`,
          type: idx < 2 ? 'portrait' : 'full-body',
          prompt: img.prompt || '',
          seed: img.seed
        });
      }
    });

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
    console.error(`[CHAR] Save error:`, error.message);
    console.error(error.stack);
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
