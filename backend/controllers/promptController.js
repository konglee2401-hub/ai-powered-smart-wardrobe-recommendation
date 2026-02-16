/**
 * Prompt Controller
 * Controller functions for prompt enhancement API endpoints
 * 
 * Endpoints:
 * POST /api/prompts/enhance - Enhance prompt
 * POST /api/prompts/analyze - Analyze quality
 * POST /api/prompts/variations - Generate variations
 * POST /api/prompts/check-safety - Check safety
 * POST /api/prompts/optimize - Optimize for use case
 * GET /api/prompts/history - Get user history
 */

import promptEnhancementService from '../services/promptEnhancementService.js';
import PromptHistory from '../models/PromptHistory.js';

// ============================================================================
// CONTROLLER FUNCTIONS
// ============================================================================

/**
 * POST /api/prompts/enhance
 * Enhance a draft prompt using AI
 */
export async function enhancePrompt(req, res) {
  try {
    const { prompt, options = {} } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required',
      });
    }

    // Call enhancement service
    const result = await promptEnhancementService.enhancePrompt(prompt, options);

    // Save to history (optional - can be disabled for performance)
    if (req.body.saveToHistory !== false) {
      try {
        await PromptHistory.create({
          originalPrompt: prompt,
          enhancedPrompt: result.data.enhancedPrompt,
          enhancementOptions: {
            type: options.type || 'both',
            style: options.style || 'detailed',
            model: options.model || 'auto',
          },
          qualityAnalysis: {
            score: null, // Will be updated if analyzed
          },
          metadata: {
            modelUsed: result.data.modelUsed,
            processingTime: result.data.processingTime,
          },
          status: 'completed',
        });
      } catch (historyError) {
        console.warn('Failed to save to history:', historyError.message);
      }
    }

    res.json(result);
  } catch (error) {
    console.error('Error in enhancePrompt:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to enhance prompt',
    });
  }
}

/**
 * POST /api/prompts/analyze
 * Analyze prompt quality
 */
export async function analyzePromptQuality(req, res) {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required',
      });
    }

    const result = await promptEnhancementService.analyzePromptQuality(prompt);

    res.json(result);
  } catch (error) {
    console.error('Error in analyzePromptQuality:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to analyze prompt',
    });
  }
}

/**
 * POST /api/prompts/variations
 * Generate prompt variations
 */
export async function generatePromptVariations(req, res) {
  try {
    const { prompt, count = 3 } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required',
      });
    }

    if (count < 1 || count > 5) {
      return res.status(400).json({
        success: false,
        error: 'Count must be between 1 and 5',
      });
    }

    const result = await promptEnhancementService.generatePromptVariations(prompt, count);

    // Save to history
    if (req.body.saveToHistory !== false) {
      try {
        await PromptHistory.create({
          originalPrompt: prompt,
          variations: result.data.variations,
          status: 'completed',
        });
      } catch (historyError) {
        console.warn('Failed to save variations to history:', historyError.message);
      }
    }

    res.json(result);
  } catch (error) {
    console.error('Error in generatePromptVariations:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate variations',
    });
  }
}

/**
 * POST /api/prompts/check-safety
 * Check prompt safety
 */
export async function checkPromptSafety(req, res) {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required',
      });
    }

    const result = await promptEnhancementService.checkPromptSafety(prompt);

    res.json(result);
  } catch (error) {
    console.error('Error in checkPromptSafety:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to check safety',
    });
  }
}

/**
 * POST /api/prompts/optimize
 * Optimize prompt for image or video generation
 */
export async function optimizePrompt(req, res) {
  try {
    const { prompt, type = 'image' } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required',
      });
    }

    if (!['image', 'video'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Type must be "image" or "video"',
      });
    }

    let optimizedPrompt;
    let result;

    if (type === 'image') {
      optimizedPrompt = promptEnhancementService.optimizeForImageGen(prompt);
      result = {
        success: true,
        data: {
          originalPrompt: prompt,
          optimizedPrompt,
          type: 'image',
          addedSpecs: [
            'Resolution (8K)',
            'Studio lighting',
            'Fashion editorial style',
            'Composition guidelines',
            'Post-processing effects',
          ],
        },
      };
    } else {
      optimizedPrompt = promptEnhancementService.optimizeForVideoGen(prompt);
      result = {
        success: true,
        data: {
          originalPrompt: prompt,
          optimizedPrompt,
          type: 'video',
          addedSpecs: [
            'Duration (10 seconds)',
            'Format (9:16 vertical)',
            'Motion descriptors',
            'Technical specs (60fps)',
            'Pacing guidelines',
          ],
        },
      };
    }

    // Save to history
    if (req.body.saveToHistory !== false) {
      try {
        await PromptHistory.create({
          originalPrompt: prompt,
          optimization: {
            optimizedForImage: type === 'image' ? optimizedPrompt : null,
            optimizedForVideo: type === 'video' ? optimizedPrompt : null,
          },
          status: 'completed',
        });
      } catch (historyError) {
        console.warn('Failed to save optimization to history:', historyError.message);
      }
    }

    res.json(result);
  } catch (error) {
    console.error('Error in optimizePrompt:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to optimize prompt',
    });
  }
}

/**
 * GET /api/prompts/history
 * Get prompt enhancement history
 */
export async function getPromptHistory(req, res) {
  try {
    const { limit = 20, page = 1, userId } = req.query;

    const query = {};
    
    // Filter by user if provided
    if (userId) {
      query.userId = userId;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [history, total] = await Promise.all([
      PromptHistory.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('-__v'),
      PromptHistory.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        history,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Error in getPromptHistory:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get history',
    });
  }
}

/**
 * GET /api/prompts/history/:id
 * Get specific prompt history by ID
 */
export async function getPromptHistoryById(req, res) {
  try {
    const { id } = req.params;

    const history = await PromptHistory.findById(id);

    if (!history) {
      return res.status(404).json({
        success: false,
        error: 'Prompt history not found',
      });
    }

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error('Error in getPromptHistoryById:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get prompt history',
    });
  }
}

/**
 * DELETE /api/prompts/history/:id
 * Delete prompt history by ID
 */
export async function deletePromptHistory(req, res) {
  try {
    const { id } = req.params;

    const deleted = await PromptHistory.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Prompt history not found',
      });
    }

    res.json({
      success: true,
      message: 'Prompt history deleted successfully',
    });
  } catch (error) {
    console.error('Error in deletePromptHistory:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete prompt history',
    });
  }
}

/**
 * POST /api/prompts/full-enhancement
 * Full enhancement pipeline: enhance + analyze + variations + safety check
 */
export async function fullEnhancement(req, res) {
  try {
    const { prompt, options = {} } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required',
      });
    }

    const {
      generateVariations = true,
      variationCount = 3,
      checkSafety = true,
      optimizeFor = null, // 'image', 'video', or null
    } = options;

    // Step 1: Enhance prompt
    const enhancementResult = await promptEnhancementService.enhancePrompt(prompt, options);

    // Step 2: Analyze quality
    const qualityResult = await promptEnhancementService.analyzePromptQuality(
      enhancementResult.data.enhancedPrompt
    );

    // Step 3: Generate variations (optional)
    let variationsResult = null;
    if (generateVariations) {
      variationsResult = await promptEnhancementService.generatePromptVariations(
        enhancementResult.data.enhancedPrompt,
        variationCount
      );
    }

    // Step 4: Check safety (optional)
    let safetyResult = null;
    if (checkSafety) {
      safetyResult = await promptEnhancementService.checkPromptSafety(
        enhancementResult.data.enhancedPrompt
      );
    }

    // Step 5: Optimize (optional)
    let optimizationResult = null;
    if (optimizeFor) {
      if (optimizeFor === 'image') {
        optimizationResult = {
          optimizedPrompt: promptEnhancementService.optimizeForImageGen(
            enhancementResult.data.enhancedPrompt
          ),
          type: 'image',
        };
      } else if (optimizeFor === 'video') {
        optimizationResult = {
          optimizedPrompt: promptEnhancementService.optimizeForVideoGen(
            enhancementResult.data.enhancedPrompt
          ),
          type: 'video',
        };
      }
    }

    // Save to history
    if (req.body.saveToHistory !== false) {
      try {
        await PromptHistory.create({
          originalPrompt: prompt,
          enhancedPrompt: enhancementResult.data.enhancedPrompt,
          enhancementOptions: {
            type: options.type || 'both',
            style: options.style || 'detailed',
          },
          qualityAnalysis: qualityResult.data,
          variations: variationsResult?.data?.variations || [],
          safetyCheck: safetyResult?.data || null,
          optimization: optimizationResult ? {
            optimizedForImage: optimizationResult.type === 'image' ? optimizationResult.optimizedPrompt : null,
            optimizedForVideo: optimizationResult.type === 'video' ? optimizationResult.optimizedPrompt : null,
          } : null,
          metadata: {
            modelUsed: enhancementResult.data.modelUsed,
            processingTime: enhancementResult.data.processingTime,
          },
          status: 'completed',
        });
      } catch (historyError) {
        console.warn('Failed to save to history:', historyError.message);
      }
    }

    res.json({
      success: true,
      data: {
        originalPrompt: prompt,
        enhancedPrompt: enhancementResult.data.enhancedPrompt,
        qualityAnalysis: qualityResult.data,
        variations: variationsResult?.data?.variations || [],
        safetyCheck: safetyResult?.data || null,
        optimization: optimizationResult,
        metadata: {
          modelUsed: enhancementResult.data.modelUsed,
          totalProcessingTime: enhancementResult.data.processingTime,
        },
      },
    });
  } catch (error) {
    console.error('Error in fullEnhancement:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to complete full enhancement',
    });
  }
}

export default {
  enhancePrompt,
  analyzePromptQuality,
  generatePromptVariations,
  checkPromptSafety,
  optimizePrompt,
  getPromptHistory,
  getPromptHistoryById,
  deletePromptHistory,
  fullEnhancement,
};
