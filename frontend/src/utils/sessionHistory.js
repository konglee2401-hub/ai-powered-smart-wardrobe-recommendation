/**
 * Session History & Flow Tracker
 * Tracks analysis sessions, conversations, and prompt iterations
 */

// Session Status Types
export const SESSION_STATUS = {
  STARTED: 'started',
  ANALYZING: 'analyzing',
  ANALYZED: 'analyzed',
  STYLING: 'styling',
  PROMPT_BUILDING: 'prompt_building',
  PROMPT_ENHANCED: 'prompt_enhanced',
  GENERATING: 'generating',
  COMPLETED: 'completed',
  FAILED: 'failed',
  ABANDONED: 'abandoned'
};

// Create unique session ID
export const generateSessionId = () => {
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Parse Grok conversation URL
export const parseGrokConversationUrl = (url) => {
  /**
   * Format: https://grok.com/c/{conversationId}?rid={requestId}
   * Example: https://grok.com/c/eb1bfdbe-c184-4996-854d-a4a9c1576078?rid=2b08a219-8166-4f76-9b7e-113075438cfb
   */
  try {
    const urlObj = new URL(url);
    const parts = urlObj.pathname.split('/');
    const conversationId = parts[parts.length - 1]; // Get last part of path
    const requestId = urlObj.searchParams.get('rid');

    if (!conversationId) {
      return null;
    }

    return {
      conversationId,
      requestId,
      fullUrl: url,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Failed to parse Grok URL:', error);
    return null;
  }
};

/**
 * Session History Model
 * Tracks complete flow from analysis to generation
 */
export class SessionHistory {
  constructor(sessionId, useCase, characterImageId, productImageId) {
    this.sessionId = sessionId;
    this.useCase = useCase;
    this.characterImageId = characterImageId;
    this.productImageId = productImageId;
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();

    // Flow stages
    this.analysisStage = {
      status: SESSION_STATUS.STARTED,
      startedAt: new Date().toISOString(),
      completedAt: null,
      provider: null, // 'grok', 'zai', etc
      grokConversation: null, // { conversationId, requestId, fullUrl }
      analysisData: null,
      analysisTime: null,
      rawResponse: null
    };

    this.styleStage = {
      status: SESSION_STATUS.STARTED,
      startedAt: null,
      completedAt: null,
      selectedOptions: {},
      referenceImages: []
    };

    this.promptStage = {
      status: SESSION_STATUS.STARTED,
      startedAt: null,
      completedAt: null,
      initialPrompt: null,
      customPrompt: null,
      promptVariations: [], // For A/B testing
      layeredPrompt: null, // { main, refiner, negative }
      enhancedPrompt: null,
      enhancementMethod: null, // 'grok_conversation', 'ai_api', etc
      grokEnhancementConversation: null,
      optimizations: [] // Track all optimizations done
    };

    this.generationStage = {
      status: SESSION_STATUS.STARTED,
      startedAt: null,
      completedAt: null,
      provider: null,
      finalPrompt: null,
      generatedImages: [],
      settings: {}
    };

    this.metadata = {
      browser: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      timezone: new Date().getTimezoneOffset(),
      locale: typeof navigator !== 'undefined' ? navigator.language : null
    };
  }

  /**
   * Update analysis stage
   */
  updateAnalysisStage(data) {
    this.analysisStage = {
      ...this.analysisStage,
      ...data,
      updatedAt: new Date().toISOString()
    };
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Set Grok conversation (from URL)
   */
  setGrokConversation(grokUrl) {
    const grokData = parseGrokConversationUrl(grokUrl);
    if (grokData) {
      this.analysisStage.grokConversation = grokData;
      this.updatedAt = new Date().toISOString();
      return grokData;
    }
    return null;
  }

  /**
   * Update style stage
   */
  updateStyleStage(data) {
    this.styleStage = {
      ...this.styleStage,
      ...data,
      startedAt: this.styleStage.startedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Update prompt stage
   */
  updatePromptStage(data) {
    this.promptStage = {
      ...this.promptStage,
      ...data,
      startedAt: this.promptStage.startedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Add prompt variation
   */
  addPromptVariation(basePrompt, variation, method) {
    this.promptStage.promptVariations.push({
      id: `variation-${this.promptStage.promptVariations.length + 1}`,
      basePrompt,
      variation,
      method, // 'synonym_replacement', 'adjective_reorder', 'structure_change'
      createdAt: new Date().toISOString()
    });
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Set layered prompt
   */
  setLayeredPrompt(main, refiner = null, negative = null) {
    this.promptStage.layeredPrompt = {
      main,
      refiner,
      negative,
      createdAt: new Date().toISOString(),
      combined: this.combineLayeredPrompt(main, refiner, negative)
    };
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Combine layered prompts into single prompt
   */
  combineLayeredPrompt(main, refiner, negative) {
    let combined = main;
    if (refiner) {
      combined += ', ' + refiner;
    }
    return {
      positive: combined,
      negative: negative || ''
    };
  }

  /**
   * Set enhanced prompt (from Grok or AI)
   */
  setEnhancedPrompt(enhancedPrompt, method, grokConversation = null) {
    this.promptStage.enhancedPrompt = enhancedPrompt;
    this.promptStage.enhancementMethod = method;
    if (grokConversation) {
      this.promptStage.grokEnhancementConversation = grokConversation;
    }
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Track optimization
   */
  trackOptimization(method, originalLength, optimizedLength, details = {}) {
    this.promptStage.optimizations.push({
      id: `opt-${this.promptStage.optimizations.length + 1}`,
      method, // 'length_reduction', 'word_removal', 'synonym_replacement'
      originalLength,
      optimizedLength,
      reduction: originalLength - optimizedLength,
      percentage: Math.round(((originalLength - optimizedLength) / originalLength) * 100),
      details,
      timestamp: new Date().toISOString()
    });
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Update generation stage
   */
  updateGenerationStage(data) {
    this.generationStage = {
      ...this.generationStage,
      ...data,
      startedAt: this.generationStage.startedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Complete session
   */
  completeSession(status = SESSION_STATUS.COMPLETED) {
    this.analysisStage.status = status;
    this.styleStage.status = status;
    this.promptStage.status = status;
    this.generationStage.status = status;
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Get complete session summary
   */
  getSummary() {
    return {
      sessionId: this.sessionId,
      useCase: this.useCase,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      duration: this.getDuration(),
      
      // Key data points
      analysis: {
        provider: this.analysisStage.provider,
        grokConversationId: this.analysisStage.grokConversation?.conversationId,
        time: this.analysisStage.analysisTime
      },
      
      style: {
        optionsSelected: Object.keys(this.styleStage.selectedOptions).length,
        referenceImages: this.styleStage.referenceImages.length
      },
      
      prompt: {
        variations: this.promptStage.promptVariations.length,
        hasLayered: !!this.promptStage.layeredPrompt,
        hasEnhanced: !!this.promptStage.enhancedPrompt,
        enhancementMethod: this.promptStage.enhancementMethod,
        optimizations: this.promptStage.optimizations.length,
        totalCharacterReduction: this.getTotalCharacterReduction()
      },
      
      generation: {
        provider: this.generationStage.provider,
        imageCount: this.generationStage.generatedImages.length
      }
    };
  }

  /**
   * Get session duration in seconds
   */
  getDuration() {
    const start = new Date(this.createdAt);
    const end = new Date(this.updatedAt);
    return Math.round((end - start) / 1000);
  }

  /**
   * Get total character reduction from optimizations
   */
  getTotalCharacterReduction() {
    return this.promptStage.optimizations.reduce(
      (total, opt) => total + opt.reduction,
      0
    );
  }

  /**
   * Serialize for DB storage
   */
  toJSON() {
    return {
      sessionId: this.sessionId,
      useCase: this.useCase,
      characterImageId: this.characterImageId,
      productImageId: this.productImageId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      analysisStage: this.analysisStage,
      styleStage: this.styleStage,
      promptStage: this.promptStage,
      generationStage: this.generationStage,
      metadata: this.metadata
    };
  }

  /**
   * Restore from DB object
   */
  static fromJSON(json) {
    const session = new SessionHistory(
      json.sessionId,
      json.useCase,
      json.characterImageId,
      json.productImageId
    );
    
    session.createdAt = json.createdAt;
    session.updatedAt = json.updatedAt;
    session.analysisStage = json.analysisStage;
    session.styleStage = json.styleStage;
    session.promptStage = json.promptStage;
    session.generationStage = json.generationStage;
    session.metadata = json.metadata;
    
    return session;
  }
}

/**
 * Export functions for session management
 */
export const sessionHistoryUtils = {
  generateSessionId,
  parseGrokConversationUrl,
  SESSION_STATUS,
  SessionHistory
};

export default sessionHistoryUtils;
