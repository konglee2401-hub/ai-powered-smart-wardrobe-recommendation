/**
 * Advanced Prompt Engineering
 * - Prompt Layering (main + refiner + negative)
 * - Batch Prompt Variations (A/B testing)
 * - Conversation-based Enhancement (via Grok)
 */

/**
 * Prompt Layering System
 * Separates prompts into layers for better control and models that support it
 */
export class PromptLayering {
  constructor(mainPrompt, refinerPrompt = null, negativePrompt = null) {
    this.mainPrompt = mainPrompt;
    this.refinerPrompt = refinerPrompt;
    this.negativePrompt = negativePrompt;
    this.createdAt = new Date().toISOString();
  }

  /**
   * Combine into single prompt for models that don't support layering
   */
  combined() {
    let combined = this.mainPrompt;
    if (this.refinerPrompt) {
      combined += ', ' + this.refinerPrompt;
    }
    return {
      positive: combined,
      negative: this.negativePrompt || ''
    };
  }

  /**
   * Get for models that support separate refiner
   * e.g., some Stable Diffusion models
   */
  withRefiner() {
    return {
      main: this.mainPrompt,
      refiner: this.refinerPrompt || null,
      negative: this.negativePrompt || ''
    };
  }

  /**
   * Get for SDXL Refiner (two-stage generation)
   */
  forSDXLRefiner() {
    return {
      base: this.mainPrompt,
      refiner: this.refinerPrompt || this.mainPrompt,
      baseNegative: this.negativePrompt || '',
      refinerNegative: this.negativePrompt || ''
    };
  }

  /**
   * Update refiner prompt
   */
  updateRefiner(refinerPrompt) {
    this.refinerPrompt = refinerPrompt;
    return this;
  }

  /**
   * Get all variations of the layered prompt
   */
  getAllFormats() {
    return {
      combined: this.combined(),
      withRefiner: this.withRefiner(),
      sdxlRefiner: this.forSDXLRefiner(),
      metadata: {
        hasRefiner: !!this.refinerPrompt,
        hasNegative: !!this.negativePrompt,
        totalLength: this.getTotalLength()
      }
    };
  }

  /**
   * Get total character length
   */
  getTotalLength() {
    let total = this.mainPrompt.length;
    if (this.refinerPrompt) total += this.refinerPrompt.length + 2; // +2 for ", "
    if (this.negativePrompt) total += this.negativePrompt.length;
    return total;
  }

  /**
   * Serialize
   */
  toJSON() {
    return {
      mainPrompt: this.mainPrompt,
      refinerPrompt: this.refinerPrompt,
      negativePrompt: this.negativePrompt,
      createdAt: this.createdAt
    };
  }
}

/**
 * Batch Prompt Variations Generator
 * Creates multiple variations for A/B testing
 */
export class PromptVariationGenerator {
  constructor(basePrompt) {
    this.basePrompt = basePrompt;
    this.variations = [];
  }

  /**
   * Synonym replacements for common fashion/photography terms
   */
  static SYNONYM_MAP = {
    // Quality descriptors
    'high quality': ['professional', 'premium', 'excellent'],
    'sharp': ['crisp', 'detailed', 'focused'],
    'beautiful': ['stunning', 'gorgeous', 'elegant'],
    'professional': ['expert', 'premium, high-quality'],
    'detailed': ['intricate', 'fine', 'comprehensive'],
    
    // Lighting
    'soft lighting': ['diffused light', 'gentle light', 'ambient light'],
    'natural light': ['window light', 'daylight', 'organic light'],
    'dramatic lighting': ['contrasty lighting', 'bold lighting'],
    
    // Photography style
    'photography': ['shot', 'photograph', 'image'],
    'portrait': ['headshot', 'face portrait'],
    'fashion': ['couture', 'designer', 'style'],
    
    // Mood
    'confident': ['assured', 'poised', 'self-assured'],
    'elegant': ['refined', 'sophisticated', 'graceful'],
    'energetic': ['dynamic', 'vibrant', 'lively'],
    'relaxed': ['casual', 'laid-back', 'comfortable']
  };

  /**
   * Generate synonym-based variation
   */
  generateSynonymVariation() {
    let variation = this.basePrompt;
    let replacementCount = 0;

    for (const [original, synonyms] of Object.entries(
      PromptVariationGenerator.SYNONYM_MAP
    )) {
      if (variation.toLowerCase().includes(original.toLowerCase())) {
        const synonym = synonyms[
          Math.floor(Math.random() * synonyms.length)
        ];
        const regex = new RegExp(original, 'gi');
        variation = variation.replace(regex, synonym);
        replacementCount++;
      }
    }

    return {
      variation,
      method: 'synonym_replacement',
      replacementCount,
      score: replacementCount
    };
  }

  /**
   * Reorder adjectives to create variation
   */
  generateAdjectiveReorder() {
    // Extract adjectives and their positions
    const adjectivePattern = /\b(high quality|professional|sharp|beautiful|detailed|stunning|gorgeous|elegant|expert|crisp|focused|premium)\b/gi;
    const adjectives = [];
    let match;

    while ((match = adjectivePattern.exec(this.basePrompt)) !== null) {
      adjectives.push({
        text: match[0],
        index: match.index
      });
    }

    if (adjectives.length < 2) {
      return { variation: this.basePrompt, method: 'adjective_reorder', reordered: 0 };
    }

    // Shuffle adjectives
    const shuffled = [...adjectives].sort(() => Math.random() - 0.5);

    let variation = this.basePrompt;
    for (let i = 0; i < Math.min(2, adjectives.length); i++) {
      const regex = new RegExp(adjectives[i].text, 'i');
      variation = variation.replace(regex, shuffled[i].text);
    }

    return {
      variation,
      method: 'adjective_reorder',
      reordered: Math.min(2, adjectives.length),
      score: Math.min(2, adjectives.length)
    };
  }

  /**
   * Restructure sentence order
   */
  generateStructureVariation() {
    // Split by comma
    const parts = this.basePrompt.split(',').map(p => p.trim());

    if (parts.length < 2) {
      return { variation: this.basePrompt, method: 'structure_change', sections: 0 };
    }

    // Shuffle middle parts (keep first and last)
    const first = parts[0];
    const last = parts[parts.length - 1];
    const middle = parts.slice(1, -1);

    // Simple shuffle: reverse middle or rotate
    const shuffledMiddle = middle.reverse();
    const variation = [first, ...shuffledMiddle, last].join(', ');

    return {
      variation,
      method: 'structure_change',
      sections: parts.length,
      score: parts.length - 1
    };
  }

  /**
   * Add emphasis/intensity variations
   */
  generateEmphasisVariation() {
    // Add intensity markers without changing core meaning
    const intensifiers = ['extremely', 'very', 'absolutely', 'incredibly'];
    const intensifier = intensifiers[
      Math.floor(Math.random() * intensifiers.length)
    ];

    // Find adjectives to intensify
    const adjectivePattern = /\b(beautiful|stunning|gorgeous|elegant|sharp|detailed)\b/i;
    const variation = this.basePrompt.replace(adjectivePattern, match => {
      return `${intensifier} ${match}`;
    });

    return {
      variation: variation !== this.basePrompt ? variation : this.basePrompt,
      method: 'emphasis_variation',
      intensifier,
      score: variation !== this.basePrompt ? 1 : 0
    };
  }

  /**
   * Generate all variations
   */
  generateAllVariations(count = 3) {
    const generators = [
      () => this.generateSynonymVariation(),
      () => this.generateAdjectiveReorder(),
      () => this.generateStructureVariation(),
      () => this.generateEmphasisVariation()
    ];

    this.variations = [];
    const used = new Set();

    // Generate unique variations
    while (this.variations.length < count && used.size < generators.length) {
      const generatorIndex = this.variations.length % generators.length;
      const variation = generators[generatorIndex]();

      if (!used.has(variation.variation) && variation.score > 0) {
        this.variations.push({
          id: `var-${this.variations.length + 1}`,
          ...variation,
          createdAt: new Date().toISOString()
        });
        used.add(variation.variation);
      }

      // Prevent infinite loop
      if (used.size >= generators.length) break;
    }

    // If not enough unique variations, add close ones anyway
    for (let i = this.variations.length; i < count; i++) {
      const variation = generators[i % generators.length]();
      if (variation.score > 0) {
        this.variations.push({
          id: `var-${this.variations.length + 1}`,
          ...variation,
          createdAt: new Date().toISOString()
        });
      }
    }

    return this.variations;
  }

  /**
   * Get variations for A/B testing
   */
  getVariationsForABTesting() {
    return {
      original: {
        id: 'original',
        variation: this.basePrompt,
        method: 'original_prompt',
        score: 0
      },
      variations: this.variations,
      metadata: {
        totalVariations: this.variations.length,
        methods: [...new Set(this.variations.map(v => v.method))],
        totalLength: this.basePrompt.length,
        avgVariationLength: Math.round(
          this.variations.reduce((sum, v) => sum + v.variation.length, 0) /
            this.variations.length
        )
      }
    };
  }

  /**
   * Select best variation based on criteria
   */
  selectBestVariation(criteria = 'quality') {
    /**
     * Criteria:
     * - 'quality': Highest score
     * - 'shortest': Shortest length (good for API limits)
     * - 'longest': Longest (most detailed)
     * - 'diverse': Most different from original
     */

    if (this.variations.length === 0) {
      return this.basePrompt;
    }

    switch (criteria) {
      case 'quality':
        return this.variations.reduce((best, current) =>
          current.score > best.score ? current : best
        ).variation;

      case 'shortest':
        return this.variations.reduce((shortest, current) =>
          current.variation.length < shortest.variation.length
            ? current
            : shortest
        ).variation;

      case 'longest':
        return this.variations.reduce((longest, current) =>
          current.variation.length > longest.variation.length
            ? current
            : longest
        ).variation;

      case 'diverse':
        // Find most different from original
        return this.variations.reduce((most, current) => {
          const curDiff = this.calculateDifference(
            current.variation,
            this.basePrompt
          );
          const mostDiff = this.calculateDifference(most.variation, this.basePrompt);
          return curDiff > mostDiff ? current : most;
        }).variation;

      default:
        return this.variations[0].variation;
    }
  }

  /**
   * Calculate difference between two prompts
   */
  calculateDifference(prompt1, prompt2) {
    const words1 = new Set(prompt1.toLowerCase().split(/\s+/));
    const words2 = new Set(prompt2.toLowerCase().split(/\s+/));

    // Jaccard similarity
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return 1 - intersection.size / union.size;
  }

  /**
   * Serialize
   */
  toJSON() {
    return {
      basePrompt: this.basePrompt,
      variations: this.variations
    };
  }
}

/**
 * Grok Conversation Enhancement
 * Uses existing Grok conversation to enhance prompts
 */
export class GrokConversationEnhancer {
  constructor(conversationId, requestId = null) {
    this.conversationId = conversationId;
    this.requestId = requestId;
    this.conversationUrl = `https://grok.com/c/${conversationId}${requestId ? `?rid=${requestId}` : ''}`;
    this.messages = [];
  }

  /**
   * Build enhancement request for Grok
   */
  buildEnhancementRequest(prompt, useCase, constraints = {}) {
    const maxLength = constraints.maxLength || 300;
    const style = constraints.style || 'creative';

    return {
      conversationId: this.conversationId,
      message: `I need you to enhance this image generation prompt for ${useCase}. 
      
Original prompt:
"${prompt}"

Requirements:
- Keep it under ${maxLength} characters
- Maintain the core meaning
- Improve clarity for AI image generation
- Style: ${style}
- Make it more specific and descriptive

Please provide ONLY the enhanced prompt, nothing else.`
    };
  }

  /**
   * Extract enhanced prompt from Grok response
   */
  parseEnhancements(grokResponse) {
    /**
     * Grok returns the enhanced prompt directly
     * We just need to clean it up
     */
    return {
      enhancedPrompt: grokResponse.trim(),
      original: grokResponse.trim(),
      method: 'grok_conversation'
    };
  }

  /**
   * Get conversation details
   */
  getConversationDetails() {
    return {
      conversationId: this.conversationId,
      requestId: this.requestId,
      conversationUrl: this.conversationUrl,
      createdAt: new Date().toISOString(),
      messageCount: this.messages.length
    };
  }

  /**
   * Add message to history
   */
  addMessage(role, content) {
    this.messages.push({
      role, // 'user' or 'assistant'
      content,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Serialize
   */
  toJSON() {
    return {
      conversationId: this.conversationId,
      requestId: this.requestId,
      conversationUrl: this.conversationUrl,
      messages: this.messages
    };
  }
}

/**
 * Advanced Prompt Engineering Export
 */
export const advancedPromptEngineering = {
  PromptLayering,
  PromptVariationGenerator,
  GrokConversationEnhancer
};

export default advancedPromptEngineering;
