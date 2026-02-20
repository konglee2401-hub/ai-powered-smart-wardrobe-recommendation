/**
 * Backend Session History Utilities
 * Server-side helper functions for session management
 */

/**
 * Generate unique session ID
 */
function generateSessionId() {
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Parse Grok conversation URL
 * Format: https://grok.com/c/{conversationId}?rid={requestId}
 */
function parseGrokConversationUrl(url) {
  try {
    const urlObj = new URL(url);
    const parts = urlObj.pathname.split('/');
    const conversationId = parts[parts.length - 1];
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
}

/**
 * Calculate session duration
 */
function calculateSessionDuration(createdAt, completedAt) {
  const start = new Date(createdAt);
  const end = new Date(completedAt || Date.now());
  return Math.round((end - start) / 1000); // seconds
}

/**
 * Get session summary for display
 */
function getSessionSummary(session) {
  return {
    sessionId: session.sessionId,
    useCase: session.useCase,
    status: session.currentStatus,
    duration: calculateSessionDuration(session.createdAt, session.completedAt),
    
    // Analysis
    analysisProvider: session.analysisStage?.provider,
    hasGrokConversation: !!session.analysisStage?.grokConversation,
    grokConversationUrl: session.analysisStage?.grokConversation?.fullUrl,
    analysisTime: session.analysisStage?.analysisTime,
    
    // Styling
    optionsCount: Object.keys(session.styleStage?.selectedOptions || {}).length,
    referenceImageCount: session.styleStage?.referenceImages?.length || 0,
    
    // Prompts
    variationCount: session.promptStage?.promptVariations?.length || 0,
    hasLayeredPrompt: !!session.promptStage?.layeredPrompt,
    hasEnhancedPrompt: !!session.promptStage?.enhancedPrompt,
    enhancementMethod: session.promptStage?.enhancementMethod,
    optimizationCount: session.promptStage?.optimizations?.length || 0,
    characterReduction: (session.promptStage?.optimizations || []).reduce(
      (sum, opt) => sum + opt.reduction,
      0
    ),
    
    // Generation
    generationProvider: session.generationStage?.provider,
    generatedImageCount: session.generationStage?.generatedImages?.length || 0,
    
    // Timestamps
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    completedAt: session.completedAt
  };
}

/**
 * Validate session data
 */
function validateSessionData(sessionData) {
  const errors = [];

  if (!sessionData.useCase) {
    errors.push('useCase is required');
  }

  if (!sessionData.sessionId) {
    errors.push('sessionId is required');
  }

  const validUseCases = [
    'change-clothes',
    'ecommerce-product',
    'social-media',
    'fashion-editorial',
    'lifestyle-scene',
    'before-after'
  ];

  if (sessionData.useCase && !validUseCases.includes(sessionData.useCase)) {
    errors.push(`useCase must be one of: ${validUseCases.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Calculate prompt optimization metrics
 */
function calculatePromptMetrics(session) {
  const optimizations = session.promptStage?.optimizations || [];
  const variations = session.promptStage?.promptVariations || [];

  return {
    totalOptimizations: optimizations.length,
    totalCharacterReduction: optimizations.reduce((sum, opt) => sum + opt.reduction, 0),
    averageReductionPercentage:
      optimizations.length > 0
        ? Math.round(
            optimizations.reduce((sum, opt) => sum + opt.percentage, 0) /
              optimizations.length
          )
        : 0,
    totalVariations: variations.length,
    optimizationMethods: [...new Set(optimizations.map(opt => opt.method))],
    variationMethods: [...new Set(variations.map(v => v.method))]
  };
}

/**
 * Export session data as formatted JSON
 */
function exportSessionAsJSON(session) {
  return {
    session: {
      sessionId: session.sessionId,
      useCase: session.useCase,
      status: session.currentStatus,
      createdAt: session.createdAt,
      completedAt: session.completedAt,
      duration: calculateSessionDuration(session.createdAt, session.completedAt)
    },
    analysis: {
      stage: session.analysisStage,
      grokConversation: session.analysisStage?.grokConversation
    },
    styling: {
      stage: session.styleStage
    },
    prompts: {
      stage: session.promptStage,
      metrics: calculatePromptMetrics(session)
    },
    generation: {
      stage: session.generationStage
    },
    metadata: session.metadata
  };
}

/**
 * Create session activity log entry
 */
function createActivityLogEntry(sessionId, action, details = {}) {
  return {
    sessionId,
    action,
    timestamp: new Date().toISOString(),
    details
  };
}

export {
  generateSessionId,
  parseGrokConversationUrl,
  calculateSessionDuration,
  getSessionSummary,
  validateSessionData,
  calculatePromptMetrics,
  exportSessionAsJSON,
  createActivityLogEntry
};
