/**
 * Vietnamese Prompt Builder - Language-specific prompt generation
 * Integrates Vietnamese templates with dynamic content
 */

import VIETNAM_PROMPTS from './vietnamesePromptTemplates.js';

class VietnamesePromptBuilder {
  /**
   * Build character analysis prompt (STEP 1)
   */
  static buildCharacterAnalysisPrompt() {
    return VIETNAM_PROMPTS.characterAnalysis.DEFAULT;
  }

  /**
   * Build deep analysis prompt for video scripts (STEP 3)
   * @param {string} productFocus - full-outfit, top, bottom, accessories, shoes
   * @param {object} config - { videoDuration, voiceGender, voicePace }
   */
  static buildDeepAnalysisPrompt(productFocus = 'full-outfit', config = {}) {
    const { videoDuration = 30, voiceGender = 'female', voicePace = 'fast' } = config;
    
    let template = VIETNAM_PROMPTS.deepAnalysis[productFocus] || VIETNAM_PROMPTS.deepAnalysis['full-outfit'];
    
    // Replace variables in template
    template = template
      .replace('{videoDuration}', videoDuration)
      .replace('{voiceGender}', voiceGender)
      .replace('{voicePace}', voicePace);
    
    return template;
  }

  /**
   * Build video generation prompt (STEP 4)
   * @param {string} segment - Hook, Introduction, Features, CTA
   * @param {string} productFocus - full-outfit, top, bottom, accessories, shoes
   * @param {object} garmentInfo - { name, details, color, fit, etc }
   */
  static buildVideoGenerationPrompt(segment = 'Hook', productFocus = 'full-outfit', garmentInfo = {}) {
    const { name = 'trang phục', details = 'chi tiết', color = '', fit = 'vừa vặn' } = garmentInfo;
    
    const promptKey = `${productFocus}-${segment}`;
    let template = VIETNAM_PROMPTS.videoGeneration[promptKey];
    
    // Fallback to full-outfit if specific focus not found
    if (!template) {
      const fallbackKey = `full-outfit-${segment}`;
      template = VIETNAM_PROMPTS.videoGeneration[fallbackKey];
    }
    
    if (!template) {
      console.warn(`⚠️ No prompt found for ${promptKey}`);
      return '';
    }
    
    // Replace garment variables
    const garmentDetails = `${color} ${name}`.trim();
    template = template.replace('{garmentDetails}', garmentDetails);
    
    return template;
  }

  /**
   * Build complete video script prompt combining all segments
   */
  static buildCompleteVideoScript(productFocus = 'full-outfit', config = {}) {
    const deepAnalysis = this.buildDeepAnalysisPrompt(productFocus, config);
    
    // The deep analysis prompt already generates scripts
    return deepAnalysis;
  }

  /**
   * Get prompt statistics
   */
  static getPromptStats() {
    const stats = {
      characterAnalysis: Object.keys(VIETNAM_PROMPTS.characterAnalysis).length,
      deepAnalysis: Object.keys(VIETNAM_PROMPTS.deepAnalysis).length,
      videoGeneration: Object.keys(VIETNAM_PROMPTS.videoGeneration).length,
      total: 0
    };
    
    stats.total = stats.characterAnalysis + stats.deepAnalysis + stats.videoGeneration;
    
    return stats;
  }

  /**
   * List available product focuses
   */
  static getAvailableFocuses() {
    return Object.keys(VIETNAM_PROMPTS.deepAnalysis);
  }

  /**
   * List available video segments
   */
  static getAvailableSegments() {
    return ['Hook', 'Introduction', 'Features', 'CTA'];
  }
}

export default VietnamesePromptBuilder;
