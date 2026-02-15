/**
 * Vision Service - Image Analysis with Multiple Providers
 * Uses OpenRouter, Google Gemini, Grok, and HuggingFace for vision analysis
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import { ANALYSIS_PROVIDERS, getProvidersByPriority } from '../config/imageGenConfig.js';

// Initialize Google Generative AI
let genAI = null;
const getGenAI = () => {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY missing');
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
};

/**
 * Vision prompt for fashion analysis
 */
const getVisionPrompt = () => `You are a fashion stylist. Analyze this outfit/character image and return JSON with these fields:
- description: Brief description of the image
- hair_style: Hair style (straight, wavy, curly, etc.)
- hair_acc: Hair accessories (none, clips, headband, etc.)
- makeup: Makeup style (natural, bold, etc.)
- top_detail: Top clothing details
- material: Material of the clothing
- outerwear: Outerwear if any
- bottom_type: Bottom clothing type
- legwear: Legwear type
- necklace: Necklace/accessories
- earrings: Earrings
- hand_acc: Hand accessories
- waist_acc: Waist accessories
- shoes: Shoe type
- scene: Recommended scene/background
- lighting: Recommended lighting
- expression: Recommended expression
- style: Overall style (casual, formal, etc.)

For character analysis, also include:
- age: Approximate age
- ethnicity: Ethnicity
- skin: Skin tone
- body: Body type
- personality: Personality type

Return ONLY valid JSON, no other text.`;

/**
 * Character analysis prompt
 */
const getCharacterAnalysisPrompt = () => `You are an expert fashion photographer's assistant. Analyze this character/reference image and provide detailed information about:
- Age and ethnicity
- Facial features (face shape, eyes, eyebrows, nose, lips)
- Skin tone and complexion
- Hair style, color, and length
- Body type and proportions
- Personal style and personality
- Any distinctive features

Return as JSON with fields: age, ethnicity, face, eyes, skin, hair, body, style, personality, features.`;

/**
 * Clothing analysis prompt  
 */
const getClothingAnalysisPrompt = () => `You are a fashion product analyst. Analyze this clothing/outfit image and provide:
- Type of clothing (top, bottom, dress, etc.)
- Style (casual, formal, edgy, etc.)
- Colors and patterns
- Material and texture
- Fit and silhouette
- Occasion suitability
- Season appropriateness
- Details and embellishments

Return as JSON with fields: type, style, colors, material, fit, occasion, season, details.`;

/**
 * Parse JSON response from AI
 */
const parseJsonResponse = (text) => {
  try {
    const m = text.match(/\{[\s\S]*\}/);
    return JSON.parse(m ? m[0] : text);
  } catch (e) {
    console.error('JSON parse error:', e.message);
    return {};
  }
};

/**
 * Default values for missing fields
 */
const getDefaultValues = () => ({
  description: '',
  hair_style: 'straight',
  hair_acc: 'none',
  makeup: 'natural',
  top_detail: 'basic top',
  material: 'cotton',
  outerwear: 'none',
  bottom_type: 'jeans',
  legwear: 'none',
  necklace: 'none',
  earrings: 'none',
  hand_acc: 'none',
  waist_acc: 'none',
  shoes: 'sneakers',
  scene: 'white studio',
  lighting: 'soft studio lighting',
  expression: 'gentle smile',
  style: 'casual'
});

/**
 * Analyze with OpenRouter (PRIORITY 1)
 */
const analyzeWithOpenRouter = async (img, mime) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY missing');
  
  const b64 = img.includes(',') ? img.split(',')[1] : img;
  const imgUrl = `data:${mime || 'image/jpeg'};base64,${b64}`;
  
  console.log('   🔍 OpenRouter: Analyzing image...');
  
  const response = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      model: 'meta-llama/llama-3.2-11b-vision-instruct:free',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: getVisionPrompt() },
            { type: 'image_url', image_url: { url: imgUrl } }
          ]
        }
      ],
      max_tokens: 1500,
      temperature: 0.1
    },
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
        'X-Title': 'AI Fashion Assistant'
      },
      timeout: 60000
    }
  );
  
  const txt = response.data.choices[0]?.message?.content;
  if (!txt) throw new Error('No content from OpenRouter');
  
  const parsed = parseJsonResponse(txt);
  return { 
    success: true, 
    data: { ...getDefaultValues(), ...parsed, rawResponse: txt, provider: 'openrouter' },
    provider: 'openrouter'
  };
};

/**
 * Analyze with Google Gemini
 */
const analyzeWithGemini = async (img, mime, opts) => {
  const model = getGenAI().getGenerativeModel({ model: 'gemini-2.5-flash' });
  const part = { inlineData: { data: img, mimeType: mime || 'image/jpeg' } };
  
  console.log('   🔍 Gemini: Analyzing image...');
  
  const res = await model.generateContent([getVisionPrompt(), part]);
  const txt = res.response.text();
  const parsed = parseJsonResponse(txt);
  
  return { 
    success: true, 
    data: { ...getDefaultValues(), ...parsed, rawResponse: txt, provider: 'gemini' },
    provider: 'gemini'
  };
};

/**
 * Analyze with Grok
 */
const analyzeWithGrok = async (img) => {
  const key = process.env.GROK_API_KEY;
  if (!key) throw new Error('GROK_API_KEY missing');
  
  const b64 = img.includes(',') ? img.split(',')[1] : img;
  const imgUrl = `data:image/jpeg;base64,${b64}`;
  
  console.log('   🔍 Grok: Analyzing image...');
  
  try {
    const res = await axios.post(
      'https://api.x.ai/v1/chat/completions',
      {
        messages: [
          { 
            role: 'user', 
            content: [
              { type: 'text', text: getVisionPrompt() }, 
              { type: 'image_url', image_url: { url: imgUrl } }
            ]
          }
        ],
        model: 'grok-2-vision-latest',
        temperature: 0.1
      },
      { 
        headers: { 
          Authorization: 'Bearer ' + key, 
          'Content-Type': 'application/json' 
        }, 
        timeout: 60000
      }
    );
    
    const txt = res.data.choices[0]?.message?.content;
    if (!txt) throw new Error('No content');
    
    const parsed = parseJsonResponse(txt);
    return { 
      success: true, 
      data: { ...getDefaultValues(), ...parsed, rawResponse: txt, provider: 'grok' },
      provider: 'grok'
    };
  } catch (e) { 
    throw e; 
  }
};

/**
 * Analyze with HuggingFace
 */
const analyzeWithHuggingFace = async (img) => {
  const key = process.env.HUGGINGFACE_API_KEY;
  if (!key) throw new Error('HUGGINGFACE_API_KEY missing');
  
  const b64 = img.includes(',') ? img.split(',')[1] : img;
  const imgUrl = `data:image/jpeg;base64,${b64}`;
  
  console.log('   🔍 HuggingFace: Analyzing image...');
  
  try {
    const res = await axios.post(
      'https://router.huggingface.co/v1/chat/completions',
      {
        model: 'moonshotai/Kimi-K2.5:novita',
        messages: [
          { 
            role: 'user', 
            content: [
              { type: 'text', text: getVisionPrompt() }, 
              { type: 'image_url', image_url: { url: imgUrl } }
            ]
          }
        ],
        temperature: 0.1
      },
      { 
        headers: { 
          Authorization: 'Bearer ' + key, 
          'Content-Type': 'application/json' 
        }, 
        timeout: 60000
      }
    );
    
    const txt = res.data.choices[0]?.message?.content;
    if (!txt) throw new Error('No content');
    
    const parsed = parseJsonResponse(txt);
    return { 
      success: true, 
      data: { ...getDefaultValues(), ...parsed, rawResponse: txt, provider: 'huggingface' },
      provider: 'huggingface'
    };
  } catch (e) { 
    throw e; 
  }
};

/**
 * Get provider priority from environment or config
 */
const getPriority = () => {
  // Check for env override first
  if (process.env.VISION_PROVIDER_PRIORITY) {
    return process.env.VISION_PROVIDER_PRIORITY.split(',').map(x => x.trim().toLowerCase());
  }
  
  // Use config providers sorted by priority
  try {
    const providers = getProvidersByPriority('analysis');
    return providers.map(p => p.name);
  } catch {
    // Fallback to default
    return ['openrouter', 'grok', 'gemini', 'huggingface'];
  }
};

/**
 * Main analyze function with fallback
 * @param {string} img - Base64 image or data URL
 * @param {string} mime - MIME type
 * @param {object} opts - Options
 * @returns {Promise<object>} Analysis result
 */
export const analyzeImage = async (img, mime, opts = {}) => {
  console.log('\n🔍 Starting image analysis...');
  console.log(`   📸 Image size: ${img.length} chars`);
  
  const provs = getPriority();
  console.log(`   🔄 Trying providers in order: ${provs.join(', ')}`);
  
  const errs = [];
  
  for (const p of provs) {
    try {
      console.log(`\n   ▶️  Attempting: ${p}`);
      
      if (p === 'openrouter') {
        const result = await analyzeWithOpenRouter(img, mime);
        console.log(`   ✅ OpenRouter analysis SUCCESS`);
        return result;
      }
      
      if (p === 'gemini') {
        const result = await analyzeWithGemini(img, mime, opts);
        console.log(`   ✅ Gemini analysis SUCCESS`);
        return result;
      }
      
      if (p === 'grok') {
        const result = await analyzeWithGrok(img);
        console.log(`   ✅ Grok analysis SUCCESS`);
        return result;
      }
      
      if (p === 'huggingface') {
        const result = await analyzeWithHuggingFace(img);
        console.log(`   ✅ HuggingFace analysis SUCCESS`);
        return result;
      }
      
    } catch (e) { 
      console.log(`   ❌ ${p} failed: ${e.message}`);
      errs.push(p + ': ' + e.message); 
    }
  }
  
  console.error('\n❌ All vision providers failed!');
  return { success: false, error: 'All providers failed: ' + errs.join('; ') };
};

/**
 * Analyze character (for fashion try-on)
 */
export const analyzeCharacter = async (img, mime) => {
  console.log('\n👤 Starting character analysis...');
  
  const b64 = img.includes(',') ? img.split(',')[1] : img;
  const imgUrl = `data:${mime || 'image/jpeg'};base64,${b64}`;
  
  const provs = getPriority();
  const errs = [];
  
  for (const p of provs) {
    try {
      if (p === 'openrouter') {
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) throw new Error('No API key');
        
        const res = await axios.post(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            model: 'meta-llama/llama-3.2-11b-vision-instruct:free',
            messages: [{
              role: 'user',
              content: [
                { type: 'text', text: getCharacterAnalysisPrompt() },
                { type: 'image_url', image_url: { url: imgUrl } }
              ]
            }],
            max_tokens: 1000,
            temperature: 0.7
          },
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
              'X-Title': 'AI Fashion Assistant'
            },
            timeout: 60000
          }
        );
        
        const content = res.data.choices[0].message.content;
        return { success: true, data: parseJsonResponse(content), provider: 'openrouter' };
      }
    } catch (e) {
      errs.push(p + ': ' + e.message);
      continue;
    }
  }
  
  return { success: false, error: errs.join('; ') };
};

/**
 * Analyze clothing (for fashion try-on)
 */
export const analyzeClothing = async (img, mime) => {
  console.log('\n👗 Starting clothing analysis...');
  
  const b64 = img.includes(',') ? img.split(',')[1] : img;
  const imgUrl = `data:${mime || 'image/jpeg'};base64,${b64}`;
  
  const provs = getPriority();
  const errs = [];
  
  for (const p of provs) {
    try {
      if (p === 'openrouter') {
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) throw new Error('No API key');
        
        const res = await axios.post(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            model: 'meta-llama/llama-3.2-11b-vision-instruct:free',
            messages: [{
              role: 'user',
              content: [
                { type: 'text', text: getClothingAnalysisPrompt() },
                { type: 'image_url', image_url: { url: imgUrl } }
              ]
            }],
            max_tokens: 1000,
            temperature: 0.7
          },
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
              'X-Title': 'AI Fashion Assistant'
            },
            timeout: 60000
          }
        );
        
        const content = res.data.choices[0].message.content;
        return { success: true, data: parseJsonResponse(content), provider: 'openrouter' };
      }
    } catch (e) {
      errs.push(p + ': ' + e.message);
      continue;
    }
  }
  
  return { success: false, error: errs.join('; ') };
};

export default { analyzeImage, analyzeCharacter, analyzeClothing };
