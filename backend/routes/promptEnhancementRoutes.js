/**
 * Prompt Enhancement Routes
 * API routes for prompt enhancement functionality
 * 
 * Endpoints:
 * POST /api/prompts/enhance - Enhance prompt
 * POST /api/prompts/analyze - Analyze quality
 * POST /api/prompts/variations - Generate variations
 * POST /api/prompts/check-safety - Check safety
 * POST /api/prompts/optimize - Optimize for use case
 * GET /api/prompts/history - Get user history
 * GET /api/prompts/history/:id - Get specific history
 * DELETE /api/prompts/history/:id - Delete history
 * POST /api/prompts/full-enhancement - Full pipeline
 */

import express from 'express';
import promptController from '../controllers/promptController.js';

const router = express.Router();

// ============================================================================
// ROUTES
// ============================================================================

/**
 * POST /api/prompts/enhance
 * Enhance a draft prompt using AI
 * 
 * Body:
 * {
 *   prompt: string,        // Required - the prompt to enhance
 *   options: {             // Optional - enhancement options
 *     type: 'text' | 'video' | 'both',
 *     style: 'detailed' | 'concise' | 'technical',
 *     model: string,
 *     maxLength: number,
 *     saveToHistory: boolean
 *   }
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     enhancedPrompt: string,
 *     originalLength: number,
 *     enhancedLength: number,
 *     modelUsed: string,
 *     processingTime: number,
 *     metadata: {...}
 *   }
 * }
 */
router.post('/enhance', promptController.enhancePrompt);

/**
 * POST /api/prompts/analyze
 * Analyze prompt quality
 * 
 * Body:
 * {
 *   prompt: string         // Required - the prompt to analyze
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     score: number,        // 0-100
 *     level: string,       // 'poor' | 'fair' | 'good' | 'excellent'
 *     strengths: string[],
 *     weaknesses: string[],
 *     suggestions: string[],
 *     metrics: {
 *       clarity: number,
 *       specificity: number,
 *       creativity: number,
 *       technicalAccuracy: number,
 *       length: number
 *     },
 *     recommendations: {...}
 *   }
 * }
 */
router.post('/analyze', promptController.analyzePromptQuality);

/**
 * POST /api/prompts/variations
 * Generate prompt variations
 * 
 * Body:
 * {
 *   prompt: string,        // Required - base prompt
 *   count: number,         // Optional - number of variations (1-5, default: 3)
 *   saveToHistory: boolean
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     variations: [{
 *       text: string,
 *       style: string,
 *       focus: string,
 *       description: string,
 *       score: number
 *     }],
 *     count: number,
 *     basePrompt: string
 *   }
 * }
 */
router.post('/variations', promptController.generatePromptVariations);

/**
 * POST /api/prompts/check-safety
 * Check prompt safety
 * 
 * Body:
 * {
 *   prompt: string         // Required - prompt to check
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     safe: boolean,
 *     score: number,        // 0-100
 *     issues: {
 *       explicit: boolean,
 *       discriminatory: boolean,
 *       violent: boolean,
 *       misleading: boolean,
 *       other: string[]
 *     },
 *     suggestions: string[],
 *     flaggedTerms: string[]
 *   }
 * }
 */
router.post('/check-safety', promptController.checkPromptSafety);

/**
 * POST /api/prompts/optimize
 * Optimize prompt for image or video generation
 * 
 * Body:
 * {
 *   prompt: string,        // Required - prompt to optimize
 *   type: 'image' | 'video',  // Required - optimization type
 *   saveToHistory: boolean
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     originalPrompt: string,
 *     optimizedPrompt: string,
 *     type: string,
 *     addedSpecs: string[]
 *   }
 * }
 */
router.post('/optimize', promptController.optimizePrompt);

/**
 * POST /api/prompts/full-enhancement
 * Full enhancement pipeline
 * 
 * Body:
 * {
 *   prompt: string,                    // Required
 *   options: {                         // Optional
 *     generateVariations: boolean,     // default: true
 *     variationCount: number,          // default: 3
 *     checkSafety: boolean,           // default: true
 *     optimizeFor: 'image' | 'video' | null,  // default: null
 *     saveToHistory: boolean
 *   }
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     originalPrompt: string,
 *     enhancedPrompt: string,
 *     qualityAnalysis: {...},
 *     variations: [...],
 *     safetyCheck: {...},
 *     optimization: {...},
 *     metadata: {...}
 *   }
 * }
 */
router.post('/full-enhancement', promptController.fullEnhancement);

/**
 * GET /api/prompts/history
 * Get prompt enhancement history
 * 
 * Query:
 * {
 *   limit: number,      // default: 20
 *   page: number,      // default: 1
 *   userId: string     // optional - filter by user
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     history: [...],
 *     pagination: {...}
 *   }
 * }
 */
router.get('/history', promptController.getPromptHistory);

/**
 * GET /api/prompts/history/:id
 * Get specific prompt history by ID
 * 
 * Response:
 * {
 *   success: true,
 *   data: {...}
 * }
 */
router.get('/history/:id', promptController.getPromptHistoryById);

/**
 * DELETE /api/prompts/history/:id
 * Delete prompt history by ID
 * 
 * Response:
 * {
 *   success: true,
 *   message: string
 * }
 */
router.delete('/history/:id', promptController.deletePromptHistory);

export default router;
