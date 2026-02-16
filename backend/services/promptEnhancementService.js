/**
 * Prompt Enhancement Service
 * Phase 3: Core enhancement logic with 6 functions + caching + retry logic
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';
import NodeCache from 'node-cache';
import { getKeyManager } from '../utils/keyManager.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CACHE = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

const ENHANCEMENT_MODELS = {
  gpt4: 'gpt-4-turbo-preview',
  claude: 'claude-3-sonnet-20240229',
  openrouter: 'openrouter/auto',
};

const MODEL_CONFIG = {
  'gpt-4-turbo-preview': {
    provider: 'openai',
    maxTokens: 4000,
    costPer1kTokens: 0.01,
  },
  'claude-3-sonnet-20240229': {
    provider: 'anthropic',
    maxTokens: 4000,
    costPer1kTokens: 0.003,
  },
  'openrouter/auto': {
    provider: 'openrouter',
    maxTokens: 4000,
    costPer1kTokens: 0.005,
  },
};

const PROMPT_CONSTRAINTS = {
  minLength: 10,
  maxLength: 2000,
  optimalImageLength: { min: 150, max: 500 },
  optimalVideoLength: { min: 100, max: 300 },
};

const SAFETY_THRESHOLDS = {
  violence: 0.7,
  sexual: 0.8,
  harassment: 0.7,
  hateSpeech: 0.8,
};

const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000,
  backoffMultiplier: 2,
};

// Simple logger
const logger = {
  info: (msg, ...args) => console.log(`[INFO] ${msg}`, ...args),
  warn: (msg, ...args) => console.warn(`[WARN] ${msg}`, ...args),
  error: (msg, ...args) => console.error(`[ERROR] ${msg}`, ...args),
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Validate API key format and existence
 */
function validateApiKey(provider) {
  const keyManager = getKeyManager();
  const key = keyManager.getKey(provider);
  
  if (!key) {
    logger.warn(`Missing API key for: ${provider}`);
    return false;
  }
  
  if (typeof key !== 'string' || key.trim().length === 0) {
    logger.warn(`Invalid API key format for: ${provider}`);
    return false;
  }
  
  return true;
}

/**
 * Get available models based on API keys
 */
function getAvailableModels() {
  return Object.keys(MODEL_CONFIG).filter((model) => {
    const provider = MODEL_CONFIG[model].provider;
    return validateApiKey(provider);
  });
}

/**
 * Select best model with fallback strategy
 */
function selectBestModel(preferredModel = 'auto') {
  const availableModels = getAvailableModels();

  if (availableModels.length === 0) {
    logger.error('No available models - all API keys missing');
    throw new Error('No AI models available. Please configure API keys.');
  }

  if (preferredModel !== 'auto' && availableModels.includes(preferredModel)) {
    logger.info(`Using preferred model: ${preferredModel}`);
    return preferredModel;
  }

  const selectedModel = availableModels[0];
  logger.info(`Using fallback model: ${selectedModel}`);
  return selectedModel;
}

/**
 * Retry logic with exponential backoff
 */
async function retryWithBackoff(fn, retries = RETRY_CONFIG.maxRetries) {
  let lastError;

  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < retries - 1) {
        const delay = RETRY_CONFIG.retryDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, i);
        logger.warn(`Retry attempt ${i + 1}/${retries} after ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Measure execution time
 */
async function measurePerformance(fn) {
  const startTime = Date.now();
  const result = await fn();
  const executionTime = Date.now() - startTime;
  return { result, executionTime };
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * FUNCTION 1: Enhance a draft prompt
 */
export async function enhancePrompt(draftPrompt, options = {}) {
  try {
    if (!draftPrompt || draftPrompt.trim().length < PROMPT_CONSTRAINTS.minLength) {
      throw new Error(`Prompt must be at least ${PROMPT_CONSTRAINTS.minLength} characters`);
    }

    const {
      type = 'both',
      model = 'auto',
      style = 'detailed',
      maxLength = PROMPT_CONSTRAINTS.maxLength,
    } = options;

    if (!['text', 'video', 'both'].includes(type)) {
      throw new Error("Type must be 'text', 'video', or 'both'");
    }

    // Check cache first
    const cacheKey = `enhance_${draftPrompt}_${style}_${type}`;
    const cached = CACHE.get(cacheKey);
    if (cached) {
      logger.info('Using cached enhancement result');
      return { success: true, data: cached, fromCache: true };
    }

    const selectedModel = model === 'auto' ? await selectBestModel('enhancement') : model;

    logger.info(`Enhancing prompt with model: ${selectedModel}, type: ${type}, style: ${style}`);

    const systemPrompt = buildSystemPrompt(type, style);
    
    const { result, executionTime } = await measurePerformance(async () => {
      return await retryWithBackoff(async () => {
        return await callAIProvider(selectedModel, systemPrompt, draftPrompt);
      });
    });

    let enhancedPrompt = parseEnhancedPrompt(result);

    if (enhancedPrompt.length > maxLength) {
      logger.warn(`Enhanced prompt exceeds maxLength, truncating...`);
      enhancedPrompt = truncatePrompt(enhancedPrompt, maxLength);
    }

    const improvements = extractImprovements(result);

    const enhancedData = {
      enhancedPrompt,
      originalLength: draftPrompt.length,
      enhancedLength: enhancedPrompt.length,
      modelUsed: selectedModel,
      processingTime: executionTime,
      metadata: {
        type,
        style,
        improvements,
      },
    };

    // Cache result
    CACHE.set(cacheKey, enhancedData);

    return {
      success: true,
      data: enhancedData,
    };
  } catch (error) {
    logger.error('Error enhancing prompt:', error);
    throw error;
  }
}

/**
 * FUNCTION 2: Analyze prompt quality
 */
export async function analyzePromptQuality(prompt) {
  try {
    if (!prompt || prompt.trim().length === 0) {
      throw new Error('Prompt cannot be empty');
    }

    // Check cache
    const cacheKey = `quality_${prompt}`;
    const cached = CACHE.get(cacheKey);
    if (cached) {
      logger.info('Using cached quality analysis');
      return { success: true, data: cached, fromCache: true };
    }

    const analysisPrompt = `You are a professional prompt quality analyst. Analyze this prompt and return ONLY valid JSON (no markdown, no extra text):

{
  "score": <0-100>,
  "level": "<poor|fair|good|excellent>",
  "strengths": [<list of 2-3 strengths>],
  "weaknesses": [<list of 2-3 weaknesses>],
  "suggestions": [<list of 2-3 actionable suggestions>],
  "metrics": {
    "clarity": <0-25>,
    "specificity": <0-25>,
    "creativity": <0-20>,
    "technicalAccuracy": <0-20>,
    "length": <0-10>
  },
  "recommendations": {
    "addMore": [<what to add>],
    "removeOrReduce": [<what to remove>],
    "improve": [<what to improve>]
  }
}

Prompt to analyze:
${prompt}`;

    const model = await selectBestModel('analysis');
    const response = await callAIProvider(model, analysisPrompt);
    const analysis = parseQualityAnalysis(response);

    // Cache result
    CACHE.set(cacheKey, analysis);

    return {
      success: true,
      data: analysis,
    };
  } catch (error) {
    logger.error('Error analyzing prompt quality:', error);
    throw error;
  }
}

/**
 * FUNCTION 3: Generate prompt variations
 */
export async function generatePromptVariations(prompt, count = 3) {
  try {
    if (!prompt || prompt.trim().length === 0) {
      throw new Error('Prompt cannot be empty');
    }

    if (count < 1 || count > 5) {
      throw new Error('Count must be between 1 and 5');
    }

    // Check cache
    const cacheKey = `variations_${prompt}_${count}`;
    const cached = CACHE.get(cacheKey);
    if (cached) {
      logger.info('Using cached variations');
      return { success: true, data: cached, fromCache: true };
    }

    const variationPrompt = `You are a creative prompt specialist. Generate ${count} unique variations of this prompt.
Each variation should:
- Maintain the core concept
- Vary in style, focus, or technical approach
- Be suitable for image/video generation
- Be between 100-500 words

Return ONLY valid JSON array (no markdown, no extra text):
[
  {
    "text": "<variation text>",
    "style": "<editorial|commercial|artistic|technical>",
    "focus": "<subject|composition|lighting|mood>",
    "description": "<brief description of what changed>"
  },
  ...
]

Original prompt:
${prompt}`;

    const model = await selectBestModel('generation');
    const response = await callAIProvider(model, variationPrompt);
    const variations = parseVariations(response);

    const scoredVariations = await Promise.all(
      variations.map(async (v) => {
        try {
          const qualityAnalysis = await analyzePromptQuality(v.text);
          return {
            ...v,
            score: qualityAnalysis.data.score,
          };
        } catch (err) {
          logger.warn('Error scoring variation:', err);
          return { ...v, score: 0 };
        }
      })
    );

    scoredVariations.sort((a, b) => b.score - a.score);

    const variationsData = {
      variations: scoredVariations,
      count: scoredVariations.length,
      basePrompt: prompt,
    };

    // Cache result
    CACHE.set(cacheKey, variationsData);

    return {
      success: true,
      data: variationsData,
    };
  } catch (error) {
    logger.error('Error generating variations:', error);
    throw error;
  }
}

/**
 * FUNCTION 4: Check prompt safety
 */
export async function checkPromptSafety(prompt) {
  try {
    if (!prompt || prompt.trim().length === 0) {
      throw new Error('Prompt cannot be empty');
    }

    // Check cache
    const cacheKey = `safety_${prompt}`;
    const cached = CACHE.get(cacheKey);
    if (cached) {
      logger.info('Using cached safety check');
      return { success: true, data: cached, fromCache: true };
    }

    logger.info('Checking prompt safety');

    const keyManager = getKeyManager();
    const safetyChecks = [];

    // OpenAI Moderation
    if (validateApiKey('openai')) {
      safetyChecks.push(checkOpenAIModeration(prompt));
    }

    // Anthropic Safety
    if (validateApiKey('anthropic')) {
      safetyChecks.push(checkAnthropicSafety(prompt));
    }

    // Local checks
    safetyChecks.push(checkLocalSafety(prompt));

    const results = await Promise.allSettled(safetyChecks);

    const safetyData = {
      safe: true,
      score: 100,
      issues: {
        explicit: false,
        discriminatory: false,
        violent: false,
        misleading: false,
        other: [],
      },
      suggestions: [],
      flaggedTerms: [],
    };

    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) {
        const check = result.value;
        if (!check.isSafe) {
          safetyData.safe = false;
          safetyData.issues.other.push(...(check.flags || []));
        }
        if (check.category) {
          safetyData.issues[check.category] = !check.isSafe;
        }
      }
    });

    // Calculate score
    if (!safetyData.safe) {
      safetyData.score -= 20;
    }
    if (safetyData.issues.explicit) safetyData.score -= 10;
    if (safetyData.issues.discriminatory) safetyData.score -= 15;
    if (safetyData.issues.violent) safetyData.score -= 15;
    if (safetyData.issues.misleading) safetyData.score -= 10;
    safetyData.score = Math.max(0, safetyData.score);

    // Cache result
    CACHE.set(cacheKey, safetyData);

    return {
      success: true,
      data: safetyData,
    };
  } catch (error) {
    logger.error('Error checking prompt safety:', error);
    throw error;
  }
}

/**
 * FUNCTION 5: Optimize prompt for image generation
 */
export function optimizeForImageGen(prompt) {
  try {
    if (!prompt || prompt.trim().length === 0) {
      throw new Error('Prompt cannot be empty');
    }

    let optimized = prompt;

    if (!hasResolutionMention(optimized)) {
      optimized += '. 8K, high resolution, professional quality';
    }

    if (!hasLightingMention(optimized)) {
      optimized += '. Studio lighting, soft key light, professional lighting setup';
    }

    if (!hasStyleMention(optimized)) {
      optimized += '. Fashion editorial photography, magazine cover quality';
    }

    if (!hasCompositionMention(optimized)) {
      optimized += '. Rule of thirds composition, sharp focus, blurred background';
    }

    if (!hasPostProcessingMention(optimized)) {
      optimized += '. Color graded, cinematic color grade, warm tones';
    }

    return optimized;
  } catch (error) {
    logger.error('Error optimizing for image generation:', error);
    throw error;
  }
}

/**
 * FUNCTION 6: Optimize prompt for video generation
 */
export function optimizeForVideoGen(prompt) {
  try {
    if (!prompt || prompt.trim().length === 0) {
      throw new Error('Prompt cannot be empty');
    }

    let optimized = prompt;

    if (!hasDurationMention(optimized)) {
      optimized += '. 10-second video, 9:16 vertical format (TikTok/Reels)';
    }

    if (!hasMotionMention(optimized)) {
      optimized += '. Smooth camera movement, dynamic transitions, flowing motion';
    }

    if (!hasTechSpecsMention(optimized)) {
      optimized += '. 60fps, smooth motion, no stuttering, cinematic quality';
    }

    if (!hasPacingMention(optimized)) {
      optimized += '. Steady pace, engaging from start to finish';
    }

    return optimized;
  } catch (error) {
    logger.error('Error optimizing for video generation:', error);
    throw error;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function callAIProvider(model, systemPrompt, userPrompt) {
  const provider = MODEL_CONFIG[model]?.provider || 'openai';

  try {
    if (provider === 'openai') {
      return await callOpenAI(model, systemPrompt, userPrompt);
    } else if (provider === 'anthropic') {
      return await callAnthropic(model, systemPrompt, userPrompt);
    } else {
      throw new Error(`Unsupported provider: ${provider}`);
    }
  } catch (error) {
    logger.error('Error calling AI provider:', error);
    throw error;
  }
}

async function callOpenAI(model, systemPrompt, userPrompt) {
  const keyManager = getKeyManager();
  const openaiKey = keyManager.getKey('openai');
  
  if (!openaiKey) throw new Error('OpenAI key not available');

  const openai = new OpenAI({ apiKey: openaiKey });
  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: 2000,
  });

  return response.choices[0].message.content;
}

async function callAnthropic(model, systemPrompt, userPrompt) {
  const keyManager = getKeyManager();
  const anthropicKey = keyManager.getKey('anthropic');
  
  if (!anthropicKey) throw new Error('Anthropic key not available');

  const client = new Anthropic({ apiKey: anthropicKey });
  const response = await client.messages.create({
    model: 'claude-3-sonnet-20240229',
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  return response.content[0].type === 'text' ? response.content[0].text : '';
}

async function checkOpenAIModeration(text) {
  try {
    const keyManager = getKeyManager();
    const openaiKey = keyManager.getKey('openai');
    
    if (!openaiKey) return null;

    const openai = new OpenAI({ apiKey: openaiKey });
    const response = await openai.moderations.create({ input: text });
    const result = response.results[0];

    return {
      provider: 'openai',
      isSafe: !result.flagged,
      category: 'explicit',
      flags: Object.keys(result.categories).filter((key) => result.categories[key]),
      scores: result.category_scores,
    };
  } catch (error) {
    logger.error('OpenAI moderation error:', error);
    return null;
  }
}

async function checkAnthropicSafety(text) {
  try {
    const keyManager = getKeyManager();
    const anthropicKey = keyManager.getKey('anthropic');
    
    if (!anthropicKey) return null;

    const client = new Anthropic({ apiKey: anthropicKey });
    const response = await client.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 100,
      system: 'Analyze if this text contains harmful content. Reply with JSON: {isSafe: boolean}',
      messages: [{ role: 'user', content: text }],
    });

    const content = response.content[0].text;
    const parsed = JSON.parse(content);

    return {
      provider: 'anthropic',
      isSafe: parsed.isSafe,
    };
  } catch (error) {
    logger.error('Anthropic safety check error:', error);
    return null;
  }
}

function checkLocalSafety(text) {
  const dangerousPatterns = [
    /\b(bomb|weapon|kill|destroy|attack)\b/gi,
    /\b(hate|racist|sexist|discriminate)\b/gi,
    /\b(illegal|crime|steal|fraud)\b/gi,
  ];

  const flags = [];
  dangerousPatterns.forEach((pattern) => {
    if (pattern.test(text)) {
      flags.push(pattern.source);
    }
  });

  return {
    provider: 'local',
    isSafe: flags.length === 0,
    flags,
  };
}

function buildSystemPrompt(type, style) {
  let basePrompt = 'You are a professional prompt enhancement specialist for fashion and lifestyle content.';

  if (type === 'text') {
    basePrompt += ` Your task is to enhance text prompts for image generation.`;
  } else if (type === 'video') {
    basePrompt += ` Your task is to enhance prompts for 10-second vertical video generation (9:16 format).`;
  } else {
    basePrompt += ` Your task is to enhance prompts for both image and video generation.`;
  }

  if (style === 'detailed') {
    basePrompt += ` Make the enhanced prompt highly detailed with specific technical parameters, lighting setups, and composition guidelines.`;
  } else if (style === 'concise') {
    basePrompt += ` Make the enhanced prompt concise but impactful, focusing on key elements without unnecessary details.`;
  } else if (style === 'technical') {
    basePrompt += ` Make the enhanced prompt technical with specific camera settings, lens information, and professional terminology.`;
  }

  basePrompt += ` Return ONLY the enhanced prompt, no explanations or markdown.`;

  return basePrompt;
}

function parseEnhancedPrompt(response) {
  if (!response) return '';
  
  let cleaned = response.replace(/```[a-z]*\n?/g, '').trim();
  
  cleaned = cleaned
    .replace(/^(Here's?|Here's|The enhanced prompt|Enhanced prompt)[:\s]*/i, '')
    .trim();

  return cleaned;
}

function parseQualityAnalysis(response) {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (typeof parsed.score !== 'number' || !parsed.level) {
      throw new Error('Invalid quality analysis structure');
    }

    return parsed;
  } catch (error) {
    logger.error('Error parsing quality analysis:', error);
    return {
      score: 50,
      level: 'fair',
      strengths: ['Parseable content'],
      weaknesses: ['Could not analyze in detail'],
      suggestions: ['Try again'],
      metrics: {
        clarity: 12,
        specificity: 12,
        creativity: 10,
        technicalAccuracy: 10,
        length: 5,
      },
    };
  }
}

function parseVariations(response) {
  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(parsed)) {
      throw new Error('Response is not an array');
    }

    return parsed.map((v) => ({
      text: v.text || '',
      style: v.style || 'general',
      focus: v.focus || 'subject',
      description: v.description || '',
    }));
  } catch (error) {
    logger.error('Error parsing variations:', error);
    return [];
  }
}

function extractImprovements(response) {
  const improvements = [];

  if (response.toLowerCase().includes('lighting')) improvements.push('Added lighting details');
  if (response.toLowerCase().includes('camera')) improvements.push('Specified camera settings');
  if (response.toLowerCase().includes('composition')) improvements.push('Improved composition guidelines');
  if (response.toLowerCase().includes('color')) improvements.push('Added color palette specifications');
  if (response.toLowerCase().includes('mood')) improvements.push('Enhanced mood and atmosphere');
  if (response.toLowerCase().includes('technical')) improvements.push('Added technical specifications');

  return improvements.length > 0 ? improvements : ['Enhanced prompt quality'];
}

function truncatePrompt(prompt, maxLength) {
  if (prompt.length <= maxLength) return prompt;
  return prompt.substring(0, maxLength).trim() + '...';
}

// ============================================================================
// DETECTION FUNCTIONS
// ============================================================================

function hasResolutionMention(text) {
  return /\b(4k|8k|resolution|high resolution|professional quality|pixels?|dpi)\b/i.test(text);
}

function hasLightingMention(text) {
  return /\b(lighting|light|illumination|studio|key light|rim light|backlight|softbox)\b/i.test(text);
}

function hasStyleMention(text) {
  return /\b(photography|editorial|commercial|fashion|magazine|professional|artistic|cinematic)\b/i.test(text);
}

function hasCompositionMention(text) {
  return /\b(composition|rule of thirds|centered|framing|depth|focus|background|foreground)\b/i.test(text);
}

function hasPostProcessingMention(text) {
  return /\b(color grade|graded|tone|saturation|contrast|sharp|blur|effect|filter)\b/i.test(text);
}

function hasDurationMention(text) {
  return /\b(second|duration|length|10s|10-second|video length)\b/i.test(text);
}

function hasMotionMention(text) {
  return /\b(motion|movement|camera|pan|zoom|transition|dynamic|flowing|smooth)\b/i.test(text);
}

function hasTechSpecsMention(text) {
  return /\b(fps|frame|60fps|120fps|smooth|stutter|quality|bitrate)\b/i.test(text);
}

function hasPacingMention(text) {
  return /\b(pace|pacing|slow|fast|quick|steady|rhythm|tempo)\b/i.test(text);
}

export default {
  enhancePrompt,
  analyzePromptQuality,
  generatePromptVariations,
  checkPromptSafety,
  optimizeForImageGen,
  optimizeForVideoGen,
};
