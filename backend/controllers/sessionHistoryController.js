/**
 * Session History Controller
 * Handles session history API requests
 */

import SessionHistory from '../models/SessionHistory.js';
import { generateSessionId, parseGrokConversationUrl } from '../utils/sessionHistory.js';

class SessionHistoryController {
  /**
   * Create new session
   * POST /api/sessions
   */
  static async createSession(req, res) {
    try {
      const { userId, useCase, characterImageId, productImageId, metadata } = req.body;

      const sessionId = generateSessionId();

      const session = new SessionHistory({
        sessionId,
        userId,
        useCase,
        characterImageId,
        productImageId,
        metadata: {
          ...metadata,
          ipAddress: req.ip,
          deviceType: req.get('user-agent')
        },
        analysisStage: { status: 'started', startedAt: new Date() },
        styleStage: { status: 'started' },
        promptStage: { status: 'started' },
        generationStage: { status: 'started' },
        currentStatus: 'started'
      });

      await session.save();

      return res.status(201).json({
        success: true,
        sessionId: session.sessionId,
        session: session.toObject()
      });
    } catch (error) {
      console.error('Create session error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get session by ID
   * GET /api/sessions/:sessionId
   */
  static async getSession(req, res) {
    try {
      const { sessionId } = req.params;

      const session = await SessionHistory.findOne({ sessionId });

      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }

      return res.json({
        success: true,
        session: session.toObject()
      });
    } catch (error) {
      console.error('Get session error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Update session
   * PUT /api/sessions/:sessionId
   */
  static async updateSession(req, res) {
    try {
      const { sessionId } = req.params;
      const updates = req.body;

      const session = await SessionHistory.findOneAndUpdate(
        { sessionId },
        { ...updates, updatedAt: new Date() },
        { new: true, runValidators: true }
      );

      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }

      return res.json({
        success: true,
        session: session.toObject()
      });
    } catch (error) {
      console.error('Update session error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get user sessions
   * GET /api/sessions/user/:userId
   */
  static async getUserSessions(req, res) {
    try {
      const { userId } = req.params;
      const { limit = 20, offset = 0, useCase, status } = req.query;

      const query = { userId };
      if (useCase) query.useCase = useCase;
      if (status) query.currentStatus = status;

      const sessions = await SessionHistory.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(offset));

      const total = await SessionHistory.countDocuments(query);

      return res.json({
        success: true,
        sessions: sessions.map(s => s.toObject()),
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
    } catch (error) {
      console.error('Get user sessions error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Save analysis with Grok conversation
   * POST /api/sessions/:sessionId/analysis
   */
  static async saveAnalysis(req, res) {
    try {
      const { sessionId } = req.params;
      const {
        provider,
        analysisData,
        rawResponse,
        grokConversationUrl,
        analysisTime
      } = req.body;

      let analysisStage = {
        status: 'analyzed',
        completedAt: new Date(),
        provider,
        analysisData,
        rawResponse,
        analysisTime
      };

      // Parse Grok conversation if provided
      if (grokConversationUrl) {
        const grokData = parseGrokConversationUrl(grokConversationUrl);
        if (grokData) {
          analysisStage.grokConversation = grokData;
        }
      }

      const session = await SessionHistory.findOneAndUpdate(
        { sessionId },
        {
          analysisStage,
          currentStatus: 'analyzed',
          updatedAt: new Date()
        },
        { new: true }
      );

      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }

      return res.json({
        success: true,
        session: session.toObject(),
        grokData: analysisStage.grokConversation || null
      });
    } catch (error) {
      console.error('Save analysis error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Save prompt variations
   * POST /api/sessions/:sessionId/prompt-variations
   */
  static async savePromptVariations(req, res) {
    try {
      const { sessionId } = req.params;
      const { variations } = req.body;

      const session = await SessionHistory.findOneAndUpdate(
        { sessionId },
        {
          'promptStage.promptVariations': variations,
          updatedAt: new Date()
        },
        { new: true }
      );

      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }

      return res.json({
        success: true,
        session: session.toObject()
      });
    } catch (error) {
      console.error('Save prompt variations error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Save prompt enhancement
   * POST /api/sessions/:sessionId/prompt-enhancement
   */
  static async savePromptEnhancement(req, res) {
    try {
      const { sessionId } = req.params;
      const {
        enhancedPrompt,
        enhancementMethod,
        grokConversationUrl = null
      } = req.body;

      let enhancement = {
        enhancedPrompt,
        enhancementMethod
      };

      // Parse Grok conversation if provided
      if (grokConversationUrl) {
        const grokData = parseGrokConversationUrl(grokConversationUrl);
        if (grokData) {
          enhancement.grokEnhancementConversation = {
            ...grokData,
            messages: []
          };
        }
      }

      const session = await SessionHistory.findOneAndUpdate(
        { sessionId },
        {
          'promptStage.status': 'prompt_enhanced',
          'promptStage.completedAt': new Date(),
          'promptStage.enhancedPrompt': enhancement.enhancedPrompt,
          'promptStage.enhancementMethod': enhancement.enhancementMethod,
          'promptStage.grokEnhancementConversation':
            enhancement.grokEnhancementConversation || undefined,
          currentStatus: 'prompt_enhanced',
          updatedAt: new Date()
        },
        { new: true }
      );

      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }

      return res.json({
        success: true,
        session: session.toObject()
      });
    } catch (error) {
      console.error('Save prompt enhancement error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 💫 ENHANCED: Save generation results with full metadata
   * POST /api/sessions/:sessionId/generation
   */
  static async saveGenerationResults(req, res) {
    try {
      const { sessionId } = req.params;
      const { 
        provider, 
        finalPrompt,
        negativePrompt, // 💫 NEW
        grokConversationId, // 💫 NEW
        generatedImages, 
        settings,
        storageConfig, // 💫 NEW
        error // 💫 NEW
      } = req.body;

      // 💫 NEW: Build generation result metrics
      const generationResult = {
        totalRequested: generatedImages?.length || 0,
        totalGenerated: generatedImages?.filter(img => img.cloudUrl || img.localPath)?.length || 0,
        successRate: generatedImages?.length > 0 
          ? Math.round((generatedImages.filter(img => img.cloudUrl || img.localPath).length / generatedImages.length) * 100)
          : 0
      };

      // 💫 NEW: Update top-level grokConversationId for easy tracking
      const updateData = {
        grokConversationId, // Top-level field
        generationStage: {
          status: error ? 'failed' : 'completed',
          completedAt: new Date(),
          startedAt: new Date(new Date().getTime() - 60000), // Approximate (could be passed from frontend)
          provider,
          grokConversationId, // Also store in stage
          grokUrl: grokConversationId ? `https://grok.com/c/${grokConversationId}` : null,
          finalPrompt,
          negativePrompt,
          generatedImages: (generatedImages || []).map(img => ({
            id: img.id || `img-${Date.now()}`,
            url: img.url,
            cloudUrl: img.cloudUrl,
            localPath: img.localPath,
            displayUrl: img.displayUrl,
            generatedAt: new Date(),
            storageType: img.storageType || 'local',
            fileSize: img.fileSize,
            metadata: {
              width: img.width,
              height: img.height,
              format: 'png',
              ...img.metadata
            }
          })),
          storageConfig,
          error: error ? {
            message: error.message,
            code: error.code,
            timestamp: new Date()
          } : null,
          settings,
          generationResult
        },
        currentStatus: error ? 'failed' : 'completed',
        completedAt: new Date(),
        updatedAt: new Date(),
        // 💫 NEW: Track completion status
        completion: {
          isComplete: !error,
          isSuccessful: !error && generationResult.successRate > 0,
          hasErrors: !!error,
          completedStages: error 
            ? ['analysis', 'styling', 'prompt_building']
            : ['analysis', 'styling', 'prompt_building', 'generation'],
          failedAt: error ? 'generation' : null,
          errorMessage: error?.message || null
        }
      };

      const session = await SessionHistory.findOneAndUpdate(
        { sessionId },
        updateData,
        { new: true, runValidators: true }
      );

      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }

      return res.json({
        success: true,
        session: session.toObject()
      });
    } catch (error) {
      console.error('Save generation results error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get session statistics
   * GET /api/sessions/:sessionId/statistics
   */
  static async getSessionStatistics(req, res) {
    try {
      const { sessionId } = req.params;

      const session = await SessionHistory.findOne({ sessionId });

      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }

      const stats = {
        sessionId: session.sessionId,
        useCase: session.useCase,
        duration: Math.round(
          (new Date(session.completedAt || session.updatedAt) -
            new Date(session.createdAt)) /
            1000
        ),
        status: session.currentStatus,

        analysis: {
          provider: session.analysisStage?.provider,
          time: session.analysisStage?.analysisTime,
          hasGrokConversation: !!session.analysisStage?.grokConversation
        },

        style: {
          optionsSelected: Object.keys(
            session.styleStage?.selectedOptions || {}
          ).length,
          referenceImages: session.styleStage?.referenceImages?.length || 0
        },

        prompt: {
          variations: session.promptStage?.promptVariations?.length || 0,
          hasLayered: !!session.promptStage?.layeredPrompt,
          hasEnhanced: !!session.promptStage?.enhancedPrompt,
          enhancementMethod: session.promptStage?.enhancementMethod,
          optimizations: session.promptStage?.optimizations?.length || 0,
          totalCharacterReduction: (
            session.promptStage?.optimizations || []
          ).reduce((sum, opt) => sum + opt.reduction, 0)
        },

        generation: {
          provider: session.generationStage?.provider,
          imageCount: session.generationStage?.generatedImages?.length || 0
        }
      };

      return res.json({
        success: true,
        statistics: stats
      });
    } catch (error) {
      console.error('Get statistics error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Delete (archive) session
   * DELETE /api/sessions/:sessionId
   */
  static async deleteSession(req, res) {
    try {
      const { sessionId } = req.params;

      const session = await SessionHistory.findOneAndUpdate(
        { sessionId },
        { isArchived: true, updatedAt: new Date() },
        { new: true }
      );

      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }

      return res.json({
        success: true,
        message: 'Session archived'
      });
    } catch (error) {
      console.error('Delete session error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Export session as JSON
   * GET /api/sessions/:sessionId/export
   */
  static async exportSession(req, res) {
    try {
      const { sessionId } = req.params;

      const session = await SessionHistory.findOne({ sessionId });

      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }

      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="session-${sessionId}.json"`
      );

      return res.json(session.toObject());
    } catch (error) {
      console.error('Export session error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

export default SessionHistoryController;
