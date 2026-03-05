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

function getShotDescription(idx) {
  const shots = [
    'Portrait Close-up',
    '3/4 Angle',
    'Waist-up',
    'Full Body Front',
    'Full Body Side',
    'Full Body Back',
    'Profile Shot',
    'Walking Candid'
  ];
  return shots[idx % shots.length];
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
          angle: getShotDescription(idx),
          description: getShotDescription(idx),
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
    let { _id, name, alias, portraitTempPath, options = {}, generatedImages = [], analysisProfile = {} } = req.body;
    
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
    
    console.log(`[CHAR] Saving character: ${name} | Mode: ${_id ? 'UPDATE' : 'CREATE'} | Images count: ${generatedImages.length}`);
    if (generatedImages.length > 0) {
      console.log(`[CHAR] First image structure:`, JSON.stringify(generatedImages[0]).substring(0, 200));
    }
    
    if (!name || !alias) {
      return res.status(400).json({ success: false, error: 'name and alias are required' });
    }

    const normalizedAlias = safeAlias(alias || name);

    // Handle UPDATE mode
    if (_id) {
      console.log(`[CHAR] Updating character: ${_id}`);
      const character = await CharacterProfile.findById(_id);
      if (!character) {
        return res.status(404).json({ success: false, error: 'Character not found' });
      }

      // Update basic fields
      character.name = name;
      character.alias = normalizedAlias;
      character.options = typeof options === 'object' && !Array.isArray(options) ? options : {};
      character.analysisProfile = typeof analysisProfile === 'object' && !Array.isArray(analysisProfile) ? analysisProfile : {};

      // Only update portrait if a new one is provided
      if (portraitTempPath && portraitTempPath !== character.portraitPath) {
        // Delete old portrait if it exists
        if (character.portraitPath && fs.existsSync(character.portraitPath)) {
          fs.unlinkSync(character.portraitPath);
        }

        const portraitFilename = `${normalizedAlias}-${Date.now()}-portrait.png`;
        const portraitDest = path.join(characterDir, portraitFilename);
        if (fs.existsSync(portraitTempPath)) {
          fs.copyFileSync(portraitTempPath, portraitDest);
        }
        character.portraitUrl = `http://localhost:5000/uploads/characters/${portraitFilename}`;
        character.portraitPath = portraitDest;
      }

      // Only update reference images if new ones are provided
      if (generatedImages.length > 0) {
        // Delete old reference images
        character.referenceImages.forEach(ref => {
          if (ref.path && fs.existsSync(ref.path)) {
            fs.unlinkSync(ref.path);
          }
        });

        const savedRefs = [];
        generatedImages.forEach((img, idx) => {
          const srcPath = img.path || (img.filename && global.generatedImagePaths?.[img.filename]);
          if (srcPath && fs.existsSync(srcPath)) {
            const outName = `${normalizedAlias}-${Date.now()}-${idx + 1}.png`;
            const outPath = path.join(characterDir, outName);
            fs.copyFileSync(srcPath, outPath);
            
            const description = img.description || img.angle || `shot-${idx + 1}`;
            const type = description.toLowerCase().includes('full') ? 'full-body' : 'portrait';
            
            savedRefs.push({
              url: `http://localhost:5000/uploads/characters/${outName}`,
              path: outPath,
              angle: description,
              description: description,
              type: type,
              prompt: img.prompt || '',
              seed: img.seed
            });
          }
        });
        character.referenceImages = savedRefs;
      }

      await character.save();
      return res.json({ success: true, data: character });
    }

    // Handle CREATE mode
    if (!portraitTempPath) {
      return res.status(400).json({ success: false, error: 'portraitTempPath is required for new character' });
    }

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
        
        const description = img.description || img.angle || `shot-${idx + 1}`;
        const type = description.toLowerCase().includes('full') ? 'full-body' : 'portrait';
        
        savedRefs.push({
          url: `http://localhost:5000/uploads/characters/${outName}`,
          path: outPath,
          angle: description,
          description: description,
          type: type,
          prompt: img.prompt || '',
          seed: img.seed
        });
      }
    });

    console.log(`[CHAR] savedRefs type: ${typeof savedRefs}, is array: ${Array.isArray(savedRefs)}, length: ${savedRefs.length}`);
    if (savedRefs.length > 0) {
      console.log(`[CHAR] First savedRef:`, JSON.stringify(savedRefs[0]));
    }

    // 💫 Extra safety: Ensure referenceImages is a proper array
    const finalReferenceImages = Array.isArray(savedRefs) ? savedRefs : [];
    const finalOptions = typeof options === 'object' && !Array.isArray(options) ? options : {};
    const finalProfile = typeof analysisProfile === 'object' && !Array.isArray(analysisProfile) ? analysisProfile : {};

    console.log(`[CHAR] Final payload - referenceImages type: ${typeof finalReferenceImages}, is array: ${Array.isArray(finalReferenceImages)}, options type: ${typeof finalOptions}`);

    // 💫 Use manual instantiation instead of create() to avoid Mongoose casting issues
    const characterData = {
      name,
      alias: normalizedAlias,
      portraitUrl: `http://localhost:5000/uploads/characters/${portraitFilename}`,
      portraitPath: portraitDest,
      referenceImages: finalReferenceImages,
      options: finalOptions,
      analysisProfile: finalProfile,
      status: 'active'
    };
    
    console.log(`[CHAR] Creating character with data:`, {
      name: characterData.name,
      alias: characterData.alias,
      referenceImagesLength: characterData.referenceImages.length,
      referenceImagesType: Array.isArray(characterData.referenceImages) ? 'array' : typeof characterData.referenceImages
    });

    const character = new CharacterProfile(characterData);
    await character.save();

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

export async function deleteCharacter(req, res) {
  try {
    const { id } = req.params;
    const character = await CharacterProfile.findById(id);
    if (!character) {
      return res.status(404).json({ success: false, error: 'Character not found' });
    }

    // Delete portrait and reference images from file system
    const charDir = path.join(process.cwd(), 'uploads', 'characters');
    if (character.portraitPath && fs.existsSync(character.portraitPath)) {
      try {
        fs.unlinkSync(character.portraitPath);
      } catch (e) {
        console.warn(`Failed to delete portrait file: ${e.message}`);
      }
    }

    if (character.referenceImages && Array.isArray(character.referenceImages)) {
      character.referenceImages.forEach((ref) => {
        if (ref.path && fs.existsSync(ref.path)) {
          try {
            fs.unlinkSync(ref.path);
          } catch (e) {
            console.warn(`Failed to delete reference image: ${e.message}`);
          }
        }
      });
    }

    // Delete from database
    await CharacterProfile.findByIdAndDelete(id);
    res.json({ success: true, message: 'Character deleted successfully' });
  } catch (error) {
    console.error('[CHAR] Delete error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
}
