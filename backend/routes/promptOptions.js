import express from 'express';
import path from 'path';
import PromptOption from '../models/PromptOption.js';
import {
  generateSceneLockPromptWithChatGPT,
  generateSceneLockImagesWithGoogleFlow
} from '../services/sceneLockService.js';

const router = express.Router();


const SCENE_LOCK_ASPECTS = ['16:9', '9:16'];


const MAX_SCENE_LOCKED_HISTORY = 10;

function normalizeSceneLockedImageHistory(input = null) {
  if (!Array.isArray(input)) return [];

  return input
    .map((item) => ({
      url: typeof item?.url === 'string' ? item.url.trim() : '',
      aspectRatio: SCENE_LOCK_ASPECTS.includes(item?.aspectRatio) ? item.aspectRatio : '9:16',
      createdAt: item?.createdAt ? new Date(item.createdAt) : new Date()
    }))
    .filter((item) => !!item.url)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, MAX_SCENE_LOCKED_HISTORY);
}

function upsertSceneLockedImageHistory(history = [], imageUrl, aspectRatio) {
  const normalized = normalizeSceneLockedImageHistory(history).filter((item) => item.url !== imageUrl);
  return normalizeSceneLockedImageHistory([
    {
      url: imageUrl,
      aspectRatio: SCENE_LOCK_ASPECTS.includes(aspectRatio) ? aspectRatio : '9:16',
      createdAt: new Date()
    },
    ...normalized
  ]);
}

function normalizeSceneLockedImageUrls(input = null) {
  const normalized = {
    '16:9': null,
    '9:16': null
  };

  if (input && typeof input === 'object') {
    SCENE_LOCK_ASPECTS.forEach((aspect) => {
      const value = input[aspect];
      normalized[aspect] = typeof value === 'string' ? (value.trim() || null) : null;
    });
  }

  return normalized;
}

function getSceneLockedImageUrlByAspect(scene = {}, aspectRatio = null) {
  const normalized = normalizeSceneLockedImageUrls(scene.sceneLockedImageUrls);
  const aspect = typeof aspectRatio === 'string' ? aspectRatio.trim() : '';

  if (SCENE_LOCK_ASPECTS.includes(aspect) && normalized[aspect]) {
    return normalized[aspect];
  }

  return scene.sceneLockedImageUrl || normalized['9:16'] || normalized['16:9'] || null;
}

// ==================== SCENE LOCK MANAGER ====================

router.get('/scenes/lock-manager', async (req, res) => {
  try {
    const scenes = await PromptOption.find({ category: 'scene' })
      .sort({ sortOrder: 1, usageCount: -1, label: 1 })
      .lean();

    const normalizedScenes = scenes.map((scene) => ({
      ...scene,
      sceneLockedImageUrls: normalizeSceneLockedImageUrls(scene.sceneLockedImageUrls),
      sceneLockedImageHistory: normalizeSceneLockedImageHistory(scene.sceneLockedImageHistory)
    }));

    res.json({
      success: true,
      data: normalizedScenes,
      total: normalizedScenes.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/scenes/:value/generate-lock-prompt', async (req, res) => {
  try {
    const { value } = req.params;
    const payload = req.body || {};
    const language = (payload.language || 'en').toLowerCase();

    const scene = await PromptOption.findOne({ category: 'scene', value });
    if (!scene) {
      return res.status(404).json({ success: false, message: 'Scene option not found' });
    }

    const result = await generateSceneLockPromptWithChatGPT(scene, payload);

    if (language === 'vi') {
      scene.sceneLockedPromptVi = result.parsed.sceneLockedPrompt;
      scene.promptSuggestionVi = result.parsed.promptSuggestion || scene.promptSuggestionVi;
      scene.sceneNegativePromptVi = result.parsed.sceneNegativePrompt || scene.sceneNegativePromptVi;
    } else {
      scene.sceneLockedPrompt = result.parsed.sceneLockedPrompt;
      scene.promptSuggestion = result.parsed.promptSuggestion || scene.promptSuggestion;
      scene.sceneNegativePrompt = result.parsed.sceneNegativePrompt || scene.sceneNegativePrompt;
    }

    scene.technicalDetails = {
      ...(scene.technicalDetails || {}),
      ...(result.parsed.technicalDetails || {})
    };

    await scene.save();

    res.json({
      success: true,
      data: {
        value: scene.value,
        sceneLockedPrompt: scene.sceneLockedPrompt,
        sceneLockedPromptVi: scene.sceneLockedPromptVi || null,
        sceneNegativePrompt: scene.sceneNegativePrompt || null,
        sceneNegativePromptVi: scene.sceneNegativePromptVi || null,
        promptSuggestion: scene.promptSuggestion,
        promptSuggestionVi: scene.promptSuggestionVi || null,
        technicalDetails: scene.technicalDetails,
        guidance: result.parsed.guidance || '',
        raw: result.raw
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/scenes/:value/generate-lock-images', async (req, res) => {
  try {
    const { value } = req.params;
    const { imageCount = 2, aspectRatio = '1:1', prompt, language = 'en' } = req.body;

    const scene = await PromptOption.findOne({ category: 'scene', value });
    if (!scene) {
      return res.status(404).json({ success: false, message: 'Scene option not found' });
    }

    const lang = (language || 'en').toLowerCase();
    const finalPrompt = prompt || (lang === 'vi' ? (scene.sceneLockedPromptVi || scene.sceneLockedPrompt || scene.promptSuggestionVi || scene.promptSuggestion) : (scene.sceneLockedPrompt || scene.sceneLockedPromptVi || scene.promptSuggestion || scene.promptSuggestionVi));
    if (!finalPrompt) {
      return res.status(400).json({ success: false, message: 'No prompt available for generation' });
    }

    const generated = await generateSceneLockImagesWithGoogleFlow({
      prompt: finalPrompt,
      imageCount: Math.max(1, Math.min(4, Number(imageCount) || 1)),
      aspectRatio,
      sceneValue: value
    });

    global.generatedImagePaths = global.generatedImagePaths || {};

    const samples = generated.map((item) => {
      const filename = path.basename(item.path || item.url || `scene-${Date.now()}.png`);
      if (item.path) {
        global.generatedImagePaths[filename] = item.path;
        setTimeout(() => delete global.generatedImagePaths[filename], 60 * 60 * 1000);
      }

      return {
        url: item.path
          ? `http://localhost:5000/api/v1/browser-automation/generated-image/${filename}`
          : item.url,
        prompt: finalPrompt,
        aspectRatio,
        provider: 'google-flow',
        createdAt: new Date(),
        isDefault: false
      };
    });

    const existingSamples = (scene.sceneLockSamples || []).map((sample) => (
      typeof sample.toObject === 'function' ? sample.toObject() : sample
    ));

    const preservedSamples = existingSamples.filter((sample) => (sample.aspectRatio || '1:1') !== aspectRatio);
    scene.sceneLockSamples = [...preservedSamples, ...samples];

    // IMPORTANT: generating previews must NOT override current locked images.
    await scene.save();

    res.json({
      success: true,
      data: {
        value,
        aspectRatio,
        samples,
        sceneLockedImageUrls: normalizeSceneLockedImageUrls(scene.sceneLockedImageUrls),
        sceneLockedImageHistory: normalizeSceneLockedImageHistory(scene.sceneLockedImageHistory)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/scenes/:value/select-lock-image', async (req, res) => {
  try {
    const { value } = req.params;
    const { imageUrl, aspectRatio } = req.body;

    const scene = await PromptOption.findOne({ category: 'scene', value });
    if (!scene) {
      return res.status(404).json({ success: false, message: 'Scene option not found' });
    }

    if (!imageUrl || typeof imageUrl !== 'string') {
      return res.status(400).json({ success: false, message: 'imageUrl is required' });
    }

    const targetAspect = typeof aspectRatio === 'string' && SCENE_LOCK_ASPECTS.includes(aspectRatio)
      ? aspectRatio
      : '9:16';

    scene.sceneLockSamples = (scene.sceneLockSamples || []).map((sample) => {
      const sampleObj = typeof sample.toObject === 'function' ? sample.toObject() : sample;
      const sameAspect = (sampleObj.aspectRatio || '1:1') === targetAspect;

      return {
        ...sampleObj,
        isDefault: sameAspect && sampleObj.url === imageUrl
      };
    });

    const aspectLockedImages = normalizeSceneLockedImageUrls(scene.sceneLockedImageUrls);
    aspectLockedImages[targetAspect] = imageUrl;
    scene.sceneLockedImageUrls = aspectLockedImages;
    if (targetAspect === '9:16') {
      scene.sceneLockedImageUrl = imageUrl;
    }

    scene.sceneLockedImageHistory = upsertSceneLockedImageHistory(
      scene.sceneLockedImageHistory,
      imageUrl,
      targetAspect
    );

    scene.useSceneLock = true;
    await scene.save();

    res.json({
      success: true,
      data: {
        value,
        sceneLockedImageUrl: scene.sceneLockedImageUrl || null,
        sceneLockedImageUrls: normalizeSceneLockedImageUrls(scene.sceneLockedImageUrls),
        sceneLockedImageHistory: normalizeSceneLockedImageHistory(scene.sceneLockedImageHistory)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


router.delete('/scenes/:value/locked-images', async (req, res) => {
  try {
    const { value } = req.params;
    const { imageUrl } = req.body || {};

    if (!imageUrl || typeof imageUrl !== 'string') {
      return res.status(400).json({ success: false, message: 'imageUrl is required' });
    }

    const scene = await PromptOption.findOne({ category: 'scene', value });
    if (!scene) {
      return res.status(404).json({ success: false, message: 'Scene option not found' });
    }

    const history = normalizeSceneLockedImageHistory(scene.sceneLockedImageHistory);
    scene.sceneLockedImageHistory = history.filter((item) => item.url !== imageUrl);

    const imageUrls = normalizeSceneLockedImageUrls(scene.sceneLockedImageUrls);
    SCENE_LOCK_ASPECTS.forEach((aspect) => {
      if (imageUrls[aspect] === imageUrl) {
        imageUrls[aspect] = null;
      }
    });

    scene.sceneLockedImageUrls = imageUrls;
    if (scene.sceneLockedImageUrl === imageUrl) {
      scene.sceneLockedImageUrl = imageUrls['9:16'] || imageUrls['16:9'] || null;
    }

    scene.sceneLockSamples = (scene.sceneLockSamples || []).map((sample) => {
      const sampleObj = typeof sample.toObject === 'function' ? sample.toObject() : sample;
      if (sampleObj.url !== imageUrl) return sampleObj;
      return {
        ...sampleObj,
        isDefault: false
      };
    });

    await scene.save();

    res.json({
      success: true,
      data: {
        value,
        sceneLockedImageUrl: scene.sceneLockedImageUrl || null,
        sceneLockedImageUrls: normalizeSceneLockedImageUrls(scene.sceneLockedImageUrls),
        sceneLockedImageHistory: normalizeSceneLockedImageHistory(scene.sceneLockedImageHistory)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== UPDATE PROMPT ASSETS (SUGGESTION / SCENE LOCK) ====================

router.patch('/:category/:value/prompt-assets', async (req, res) => {
  try {
    const { category, value } = req.params;
    const {
      promptSuggestion,
      sceneLockedPrompt,
      sceneLockedImageUrl,
      sceneLockedImageUrls,
      sceneLockedPromptVi,
      promptSuggestionVi,
      sceneNegativePrompt,
      sceneNegativePromptVi,
      useSceneLock,
      technicalDetails
    } = req.body;

    const option = await PromptOption.findOne({ category, value });

    if (!option) {
      return res.status(404).json({
        success: false,
        message: 'Option not found'
      });
    }

    if (typeof promptSuggestion === 'string') option.promptSuggestion = promptSuggestion.trim() || null;
    if (typeof sceneLockedPrompt === 'string') option.sceneLockedPrompt = sceneLockedPrompt.trim() || null;
    if (typeof sceneLockedImageUrl === 'string') option.sceneLockedImageUrl = sceneLockedImageUrl.trim() || null;
    if (sceneLockedImageUrls && typeof sceneLockedImageUrls === 'object') {
      const currentImageUrls = normalizeSceneLockedImageUrls(option.sceneLockedImageUrls);
      const nextImageUrls = { ...currentImageUrls };

      SCENE_LOCK_ASPECTS.forEach((aspect) => {
        const incoming = sceneLockedImageUrls[aspect];
        if (typeof incoming === 'string') {
          nextImageUrls[aspect] = incoming.trim() || null;
        }
      });

      option.sceneLockedImageUrls = nextImageUrls;
    }
    if (typeof sceneLockedPromptVi === 'string') option.sceneLockedPromptVi = sceneLockedPromptVi.trim() || null;
    if (typeof promptSuggestionVi === 'string') option.promptSuggestionVi = promptSuggestionVi.trim() || null;
    if (typeof sceneNegativePrompt === 'string') option.sceneNegativePrompt = sceneNegativePrompt.trim() || null;
    if (typeof sceneNegativePromptVi === 'string') option.sceneNegativePromptVi = sceneNegativePromptVi.trim() || null;
    if (typeof useSceneLock === 'boolean') option.useSceneLock = useSceneLock;

    if (technicalDetails && typeof technicalDetails === 'object') {
      option.technicalDetails = {
        ...(option.technicalDetails || {}),
        ...technicalDetails
      };
    }

    await option.save();

    res.json({
      success: true,
      data: option
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== GET ALL OPTIONS ====================

router.get('/', async (req, res) => {
  try {
    const { category } = req.query;

    let query = {};
    if (category) {
      query.category = category;
    }

    const options = await PromptOption.find(query).sort({ category: 1, usageCount: -1, label: 1 });

    const formattedOptions = options.map(option => ({
      id: option._id,
      category: option.category,
      value: option.value,
      label: option.label,
      description: option.description,
      technicalDetails: option.technicalDetails || {},
      promptSuggestion: option.promptSuggestion || null,
      promptSuggestionVi: option.promptSuggestionVi || null,
      sceneLockedPrompt: option.sceneLockedPrompt || null,
      sceneLockedPromptVi: option.sceneLockedPromptVi || null,
      sceneNegativePrompt: option.sceneNegativePrompt || null,
      sceneNegativePromptVi: option.sceneNegativePromptVi || null,
      sceneLockedImageUrl: getSceneLockedImageUrlByAspect(option),
      sceneLockedImageUrls: normalizeSceneLockedImageUrls(option.sceneLockedImageUrls),
      sceneLockSamples: option.sceneLockSamples || [],
      sceneLockedImageHistory: normalizeSceneLockedImageHistory(option.sceneLockedImageHistory),
      useSceneLock: typeof option.useSceneLock === 'boolean' ? option.useSceneLock : true,
      isAiGenerated: option.isAiGenerated || false,
      usageCount: option.usageCount || 0
    }));

    res.json({
      success: true,
      data: formattedOptions,
      total: options.length
    });

  } catch (error) {
    console.error('❌ Error loading prompt options:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      data: []
    });
  }
});

// ==================== GET BY CATEGORY ====================

router.get('/:category', async (req, res) => {
  try {
    const { category } = req.params;

    const options = await PromptOption.find({ category, isActive: true }).sort({ sortOrder: 1, label: 1 });

    res.json({
      success: true,
      data: {
        category,
        options: options.map(opt => ({
          value: opt.value,
          label: opt.label,
          description: opt.description,
          technicalDetails: opt.technicalDetails || {},
          promptSuggestion: opt.promptSuggestion || null,
          promptSuggestionVi: opt.promptSuggestionVi || null,
          sceneLockedPrompt: opt.sceneLockedPrompt || null,
          sceneLockedPromptVi: opt.sceneLockedPromptVi || null,
          sceneNegativePrompt: opt.sceneNegativePrompt || null,
          sceneNegativePromptVi: opt.sceneNegativePromptVi || null,
          sceneLockedImageUrl: getSceneLockedImageUrlByAspect(opt),
          sceneLockedImageUrls: normalizeSceneLockedImageUrls(opt.sceneLockedImageUrls),
          sceneLockedImageHistory: normalizeSceneLockedImageHistory(opt.sceneLockedImageHistory),
          useSceneLock: typeof opt.useSceneLock === 'boolean' ? opt.useSceneLock : true,
          isAiGenerated: opt.isAiGenerated,
          usageCount: opt.usageCount
        })),
        total: options.length
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { category, value, label, description, metadata } = req.body;

    if (!category || !value || !label) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: category, value, label'
      });
    }

    const option = await PromptOption.addOrUpdate(category, value, label, {
      ...metadata,
      description,
      source: 'user-created',
      addedBy: 'user'
    });

    res.json({
      success: true,
      data: option
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Option already exists'
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:category/:value/use', async (req, res) => {
  try {
    const { category, value } = req.params;

    const option = await PromptOption.findOne({ category, value });

    if (!option) {
      return res.status(404).json({
        success: false,
        message: 'Option not found'
      });
    }

    await option.incrementUsage();

    res.json({
      success: true,
      data: {
        category,
        value,
        usageCount: option.usageCount
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/ai-extract', async (req, res) => {
  try {
    const { category, text } = req.body;

    if (!category || !text) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: category, text'
      });
    }

    const option = await PromptOption.findOrCreate(category, text);

    res.json({
      success: true,
      data: option,
      created: option.isNew
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
