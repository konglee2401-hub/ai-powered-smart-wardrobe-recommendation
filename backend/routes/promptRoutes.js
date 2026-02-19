/**
 * Smart Fashion Prompt Builder - API Routes
 * Phase 2: Revised with all fixes
 * 
 * Features:
 * 1. 6 API Endpoints
 * 2. Input Validation
 * 3. Error Handling
 * 4. Request/Response Logging
 * 5. CORS Support
 */

import express from 'express';
const router = express.Router();

// Import utilities
import {
  generateDynamicPrompt,
  validateInputs,
  customizePrompt,
  enhancePrompt,
  getPromptStats,
  getAllUseCases,
  getUseCaseTemplate,
  detectUseCase
} from '../utils/promptTemplates.js';

// NEW: Import the prompt enhancement service
import * as promptEnhancementService from '../services/promptEnhancementService.js';

// ============ MIDDLEWARE ============

/**
 * Middleware to validate request body
 */
const validateRequestBody = (req, res, next) => {
  if (!req.body) {
    return res.status(400).json({
      success: false,
      error: 'Request body is required'
    });
  }
  next();
};

/**
 * Middleware to log requests
 */
const logRequest = (req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  console.log('Body:', JSON.stringify(req.body, null, 2));
  next();
};

// Apply middleware
router.use(validateRequestBody);
router.use(logRequest);

// ============ ENDPOINT 1: GENERATE PROMPT ============

/**
 * POST /api/generate-prompt
 * Generate a prompt from user inputs
 * 
 * Request body:
 * {
 *   "age": "20-30",
 *   "gender": "female",
 *   "style": "elegant",
 *   "colors": "white and black",
 *   "material": "silk blend",
 *   "setting": "studio",
 *   "mood": "elegant"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "prompt": "Generated prompt text...",
 *   "stats": { characters, words, sentences, paragraphs },
 *   "useCase": "elegantEvening",
 *   "message": "Prompt generated successfully"
 * }
 */
router.post('/generate-prompt', (req, res) => {
  try {
    const { age, gender, style, colors, material, setting, mood } = req.body;

    // Validate inputs
    const inputs = { age, gender, style, colors, material, setting, mood };
    const validation = validateInputs(inputs);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.errors
      });
    }

    // Generate prompt
    const prompt = generateDynamicPrompt(inputs);

    // Get statistics
    const stats = getPromptStats(prompt);

    // Detect use case
    const useCase = detectUseCase(inputs);

    res.status(200).json({
      success: true,
      prompt,
      stats,
      useCase,
      message: 'Prompt generated successfully'
    });
  } catch (error) {
    console.error('Error in /generate-prompt:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

// ============ ENDPOINT 2: ENHANCE PROMPT ============

/**
 * POST /api/enhance-prompt
 * Enhance a prompt with customizations
 * 
 * Request body:
 * {
 *   "prompt": "Original prompt text...",
 *   "customizations": {
 *     "silk": "cotton",
 *     "studio": "beach"
 *   },
 *   "enhancements": ["Ultra high resolution", "Professional lighting"]
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "originalPrompt": "...",
 *   "enhancedPrompt": "...",
 *   "stats": { characters, words, sentences, paragraphs },
 *   "message": "Prompt enhanced successfully"
 * }
 */
router.post('/enhance-prompt', (req, res) => {
  try {
    const { prompt, customizations = {}, enhancements = [] } = req.body;

    // Validate prompt
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid prompt text is required'
      });
    }

    // Apply customizations
    let enhancedPrompt = prompt;

    if (Object.keys(customizations).length > 0) {
      enhancedPrompt = customizePrompt(enhancedPrompt, customizations);
    }

    // Apply enhancements
    if (enhancements.length > 0) {
      enhancedPrompt = enhancePrompt(enhancedPrompt, enhancements);
    }

    // Add default quality indicators if not present
    if (!enhancedPrompt.includes('High resolution')) {
      enhancedPrompt += ' High resolution, professional photography, detailed textures, perfect composition.';
    }

    // Get statistics
    const stats = getPromptStats(enhancedPrompt);

    res.status(200).json({
      success: true,
      originalPrompt: prompt,
      enhancedPrompt,
      stats,
      message: 'Prompt enhanced successfully'
    });
  } catch (error) {
    console.error('Error in /enhance-prompt:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

// ============ ENDPOINT 2: ENHANCE PROMPT (NEW) ============
router.post('/enhance', async (req, res) => {
  const { draft, analysis, selectedOptions, type = 'image', style = 'detailed' } = req.body;
  
  if (!draft) {
    return res.status(400).json({ success: false, error: 'Draft prompt is required.' });
  }

  try {
    // NEW: Call the actual enhancement service
    const enhancementResult = await promptEnhancementService.enhancePrompt(draft, {
      type,
      style,
      // You can pass more context from analysis and selectedOptions here if needed
      context: {
        analysis,
        selectedOptions
      }
    });

    if (enhancementResult.success) {
      res.status(200).json({
        success: true,
        enhancedPrompt: enhancementResult.data.enhancedPrompt,
        metadata: enhancementResult.data.metadata,
        message: 'Prompt enhanced successfully'
      });
    } else {
      throw new Error('Enhancement service failed');
    }

  } catch (error) {
    console.error('Error in /enhance:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error during enhancement'
    });
  }
});

// ============ ENDPOINT 3: GET ALL USE CASES ============

/**
 * GET /api/use-cases
 * Get all available fashion use cases
 * 
 * Response:
 * {
 *   "success": true,
 *   "useCases": ["casualBeach", "formalBusiness", ...],
 *   "count": 10,
 *   "message": "Use cases retrieved successfully"
 * }
 */
router.get('/use-cases', (req, res) => {
  try {
    const useCases = getAllUseCases();

    res.status(200).json({
      success: true,
      useCases,
      count: useCases.length,
      message: 'Use cases retrieved successfully'
    });
  } catch (error) {
    console.error('Error in /use-cases:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

// ============ ENDPOINT 4: GET USE CASE TEMPLATE ============

/**
 * GET /api/use-cases/:useCase
 * Get template for a specific use case
 * 
 * URL Parameters:
 * - useCase: string (e.g., 'casualBeach')
 * 
 * Response:
 * {
 *   "success": true,
 *   "useCase": "casualBeach",
 *   "template": {
 *     "name": "Casual Beach Wear",
 *     "template": "...",
 *     "keywords": [...]
 *   },
 *   "message": "Template retrieved successfully"
 * }
 */
router.get('/use-cases/:useCase', (req, res) => {
  try {
    const { useCase } = req.params;

    // Validate useCase parameter
    if (!useCase || typeof useCase !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Valid use case name is required'
      });
    }

    // Get template
    const template = getUseCaseTemplate(useCase);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: `Use case '${useCase}' not found`
      });
    }

    res.status(200).json({
      success: true,
      useCase,
      template,
      message: 'Template retrieved successfully'
    });
  } catch (error) {
    console.error('Error in /use-cases/:useCase:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

// ============ ENDPOINT 5: VALIDATE INPUTS ============

/**
 * POST /api/validate-inputs
 * Validate user inputs
 * 
 * Request body:
 * {
 *   "age": "20-30",
 *   "gender": "female",
 *   "style": "elegant",
 *   "colors": "white and black",
 *   "material": "silk blend",
 *   "setting": "studio",
 *   "mood": "elegant"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "isValid": true,
 *   "errors": [],
 *   "message": "Inputs are valid"
 * }
 */
router.post('/validate-inputs', (req, res) => {
  try {
    const inputs = req.body;

    // Validate inputs
    const validation = validateInputs(inputs);

    res.status(200).json({
      success: true,
      isValid: validation.isValid,
      errors: validation.errors,
      message: validation.isValid ? 'Inputs are valid' : 'Validation failed'
    });
  } catch (error) {
    console.error('Error in /validate-inputs:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

// ============ ENDPOINT 6: GET PROMPT STATISTICS ============

/**
 * POST /api/prompt-stats
 * Get statistics for a prompt
 * 
 * Request body:
 * {
 *   "prompt": "Prompt text here..."
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "stats": {
 *     "characters": 500,
 *     "words": 100,
 *     "sentences": 10,
 *     "paragraphs": 3
 *   },
 *   "message": "Statistics calculated successfully"
 * }
 */
router.post('/prompt-stats', (req, res) => {
  try {
    const { prompt } = req.body;

    // Validate prompt
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid prompt text is required'
      });
    }

    // Get statistics
    const stats = getPromptStats(prompt);

    res.status(200).json({
      success: true,
      stats,
      message: 'Statistics calculated successfully'
    });
  } catch (error) {
    console.error('Error in /prompt-stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

// ============ ERROR HANDLING ============

/**
 * 404 handler for undefined routes
 */
router.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// ============ EXPORTS ============

export default router;
