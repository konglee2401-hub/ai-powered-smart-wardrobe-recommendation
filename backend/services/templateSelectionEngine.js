/**
 * Template Selection Strategy
 * Intelligently selects template based on video analysis & content
 * 
 * Rules:
 * - Funny/Animal videos → Reaction template (humor-focused)
 * - Product videos → Marketing/Highlight template (sales-focused)
 * - Generic videos → Suggests multiple options
 */

class TemplateSelectionEngine {
  // Template recommendations by content type
  static TEMPLATE_MAPPING = {
    // Funny/Animal content → Reaction focus
    'funny-animal': {
      primary: 'reaction',
      alternatives: ['meme', 'grid-2'],
      subtitleTheme: 'funny-animal',
      subtitlePhrase: ['😂 TOO FUNNY', '🤣 CAN\'T STOP LAUGHING', 'HILARIOUS']
    },
    
    // Product content → Marketing focus
    'product': {
      primary: 'highlight',
      alternatives: ['marketing', 'grid-2'],
      subtitleTheme: 'product',
      subtitlePhrase: ['🛍️ GET YOURS NOW', '💎 MUST HAVE', 'LIMITED OFFER']
    },
    
    // Motivation/Fitness → Educational focus
    'motivation': {
      primary: 'highlight',
      alternatives: ['cinematic', 'grid-2'],
      subtitleTheme: 'motivation',
      subtitlePhrase: ['💪 YOU GOT THIS', '⚡ TRANSFORMATION', 'INCREDIBLE']
    },
    
    // News/Educational → Professional focus
    'education': {
      primary: 'cinematic',
      alternatives: ['highlight', 'professional'],
      subtitleTheme: 'education',
      subtitlePhrase: ['📚 MUST KNOW', '🎓 IMPORTANT', 'LEARN THIS']
    },
    
    // Generic fallback
    'general': {
      primary: 'reaction',
      alternatives: ['highlight', 'grid-2'],
      subtitleTheme: 'general',
      subtitlePhrase: ['✨ WATCH THIS', '🎬 CHECK IT OUT', 'AMAZING']
    }
  };

  /**
   * Select template based on content analysis
   * @param {string} contentType - Type from video analysis
   * @param {object} config - Template config override
   * @returns {object} { templateName, theme, subtitleTheme }
   */
  static selectTemplate(contentType = 'general', config = {}) {
    const mapping = this.TEMPLATE_MAPPING[contentType] || this.TEMPLATE_MAPPING.general;
    
    // Allow manual override
    if (config.templateName) {
      return {
        templateName: config.templateName,
        theme: config.theme || mapping.subtitleTheme,
        subtitleTheme: config.theme || mapping.subtitleTheme,
        reason: 'manual-override'
      };
    }

    const templateStrategy = String(config.templateStrategy || '').toLowerCase();
    const candidates = [mapping.primary, ...(mapping.alternatives || [])].filter(Boolean);
    const pickRandom = (list) => list[Math.floor(Math.random() * list.length)];
    const shouldRandomize = !templateStrategy || templateStrategy === 'random' || templateStrategy === 'weighted';
    const selectedTemplate = (shouldRandomize && candidates.length)
      ? pickRandom(candidates)
      : mapping.primary;

    return {
      templateName: selectedTemplate,
      theme: mapping.subtitleTheme,
      subtitleTheme: mapping.subtitleTheme,
      alternatives: mapping.alternatives,
      subtitlePhrase: mapping.subtitlePhrase,
      reason: 'content-based-selection',
      contentType
    };
  }

  /**
   * Validate template + content type combination
   */
  static validateCombination(templateName, contentType) {
    const mapping = this.TEMPLATE_MAPPING[contentType];
    if (!mapping) return { valid: true, warning: null };

    const validTemplates = [mapping.primary, ...mapping.alternatives];
    const valid = validTemplates.includes(templateName);

    return {
      valid,
      warning: !valid ? `⚠️ ${templateName} may not fit ${contentType} content` : null,
      recommended: mapping.primary
    };
  }

  /**
   * Get subtitle configuration for template + theme
   */
  static getSubtitleConfig(templateName, theme) {
    const mapping = Object.values(this.TEMPLATE_MAPPING).find(m => m.subtitleTheme === theme);
    if (!mapping) return null;

    return {
      theme,
      templateName,
      restrictedPhrases: this._getRestrictedPhrasesForTemplate(templateName),
      recommendedPhrases: mapping.subtitlePhrase
    };
  }

  /**
   * Get phrases that should NOT be used with this template
   */
  static _getRestrictedPhrasesForTemplate(templateName) {
    // Reaction templates (humor focus) should NOT use marketing phrases
    if (['reaction', 'meme'].includes(templateName)) {
      return [
        'CHECK THIS OUT',
        'GET YOURS NOW',
        'LIMITED OFFER',
        'BUY NOW',
        'CLICK HERE',
        'MUST HAVE',
        'EXCLUSIVE DEAL'
      ];
    }

    // Marketing templates should NOT use humor phrases
    if (['marketing', 'highlight', 'grid', 'grid-2'].includes(templateName)) {
      return [
        'HILARIOUS',
        'CAN\'T STOP LAUGHING',
        'TOO FUNNY',
        'MEME',
        'RELATABLE'
      ];
    }

    return [];
  }

  /**
   * Filter subtitle text to remove restricted phrases
   */
  static sanitizeSubtitleText(subtitleText, templateName) {
    const restricted = this._getRestrictedPhrasesForTemplate(templateName);
    let sanitized = subtitleText;

    for (const phrase of restricted) {
      const regex = new RegExp(phrase, 'gi');
      sanitized = sanitized.replace(regex, '');
    }

    return sanitized.trim();
  }
}

export default TemplateSelectionEngine;
