import fs from 'fs';
import path from 'path';
import axios from 'axios';
import GeneratedMedia from '../models/GeneratedMedia.js';
import imageGenService from '../services/imageGenService.js';
import videoGenService from '../services/videoGenService.js';
import { buildImagePrompt, buildVideoPrompt } from '../services/promptBuilder.js';

const fileToBase64 = async (file) => {
  if (!file?.path) return null;
  try {
    // Handle Cloudinary URL
    if (file.path.startsWith('http')) {
      const response = await axios.get(file.path, { responseType: 'arraybuffer' });
      return Buffer.from(response.data, 'binary').toString('base64');
    }
    // Handle Local Path
    if (!fs.existsSync(file.path)) {
      console.error(`File not found at path: ${file.path}`);
      return null;
    }
    return fs.readFileSync(file.path).toString('base64');
  } catch (e) {
    console.error('fileToBase64 error:', e.message);
    return null;
  }
};

const getMimeType = (filename) => {
  const ext = path.extname(filename || '').toLowerCase();
  const mimeMap = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
  return mimeMap[ext] || 'image/jpeg';
};

const analyzeOutfit = async (req, res) => {
  try {
    console.log('[Pipeline] Received analyze request');
    const characterFile = req.files?.['characterImage']?.[0];
    const productFile = req.files?.['productImage']?.[0];
    
    if (!characterFile) {
      return res.status(400).json({ success: false, message: 'Missing character image' });
    }

    const categories = req.body.categories ? JSON.parse(req.body.categories) : ['top', 'bottom', 'shoes', 'accessories'];
    
    let primaryAnalysis = null;
    const fileReferences = [];

    const charB64 = await fileToBase64(characterFile);
    if (!charB64) {
      throw new Error('Failed to process character image to base64');
    }

    fileReferences.push(`Character: ${characterFile.originalname}`);
    
    const result = await imageGenService.analyzeImage(charB64, getMimeType(characterFile.originalname), {
      categories,
      filename: characterFile.originalname,
      context: 'character_reference'
    });
    
    if (result.success) {
      primaryAnalysis = result.data;
    } else {
      throw new Error(`Vision Service Error: ${result.error || 'Unknown error'}`);
    }

    if (productFile) {
      fileReferences.push(`Product: ${productFile.originalname}`);
    }

    res.json({ 
      success: true, 
      data: { 
        analysis: primaryAnalysis,
        fileReferences 
      } 
    });
  } catch (error) {
    console.error('[Pipeline] Analyze error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

const generateImage = async (req, res) => {
  try {
    const { analysis, template, characterImageName, productImageName, options, prompt, provider } = req.body;
    
    // In PromptBuilder, character and product images are sent in initial /analyze step.
    // Here, we only have their names. We need to fetch the actual base64 data if provider needs it.
    // For now, let's assume imageGenService works primarily with text prompt.

    const finalPrompt = prompt || buildImagePrompt(analysis, template, options);

    const result = await imageGenService.generateImage({ 
      prompt: finalPrompt, 
      provider: provider || 'nano-banana',
      options 
    });
    
    if (result.success && result.url) {
      const saved = await GeneratedMedia.create({
        type: 'image',
        prompt: finalPrompt,
        url: result.url,
        source: provider || 'gemini' // Save source as actual provider
      });
      result.mediaId = saved._id;
    }
    
    res.json({ success: true, data: result }); // Return success: true and data
  } catch (error) {
    console.error('[Pipeline] Generate image error:', error.message);
    res.status(500).json({ success: false, message: error.message }); // Changed error to message
  }
};

const generateVideo = async (req, res) => {
  try {
    const { analysis, template, options } = req.body;
    const prompt = buildVideoPrompt(analysis, template, options);
    const result = await videoGenService.generateVideo({ prompt, options });
    
    if (result.success && result.url) {
      const saved = await GeneratedMedia.create({
        type: 'video',
        prompt: prompt,
        url: result.url,
        source: 'kling'
      });
      result.mediaId = saved._id;
    }
    
    res.json({ success: true, data: result }); // Return success: true and data
  } catch (error) {
    console.error('[Pipeline] Generate video error:', error.message);
    res.status(500).json({ success: false, message: error.message }); // Changed error to message
  }
};

export { analyzeOutfit as analyzeImages, generateImage as generateImageFromAnalysis, generateVideo as generateVideoFromImage };
