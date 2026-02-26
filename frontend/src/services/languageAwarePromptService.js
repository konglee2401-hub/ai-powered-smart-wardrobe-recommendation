/**
 * Frontend Language-Aware Prompt Service
 * Calls backend with language parameter for Vietnamese/English prompts
 */

import { api } from './api';

/**
 * Build prompt with language support
 * @param {Object} params - Parameters
 * @param {Object} params.analysis - Character/product analysis
 * @param {Object} params.selectedOptions - Selected options (scene, lighting, mood, etc.)
 * @param {string} params.language - Language code ('en' or 'vi')
 * @param {string} params.useCase - Use case
 * @param {string} params.customPrompt - Custom prompt (optional)
 * @returns {Promise} Prompt response from backend
 */
export async function buildLanguageAwarePrompt({
  analysis,
  selectedOptions = {},
  language = 'en',
  useCase = 'change-clothes',
  customPrompt = null
}) {
  try {
    const response = await api.post('/ai/build-prompt', {
      characterAnalysis: analysis?.character,
      productAnalysis: analysis?.product,
      userSelections: selectedOptions,
      language,
      useCase,
      customPrompt
    });
    return response.data;
  } catch (error) {
    console.error('Error building prompt:', error);
    throw error;
  }
}

/**
 * Get prompt options translated to specified language
 * @param {string} category - Option category (scene, lighting, mood, style, etc.)
 * @param {string} language - Language code ('en' or 'vi')
 * @returns {Promise} Translated options
 */
export async function getTranslatedPromptOptions(category, language = 'en') {
  try {
    const response = await api.get('/ai/prompt-options', {
      params: {
        category,
        language
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching translated options:', error);
    throw error;
  }
}

/**
 * Regenerate prompt based on current language
 * Detects current UI language and regenerates prompt accordingly
 * @param {Object} params - Parameters
 * @param {Object} params.analysis - Character/product analysis
 * @param {Object} params.selectedOptions - Selected options
 * @param {string} params.currentLanguage - Current UI language from i18n
 * @returns {Promise} New prompt in appropriate language
 */
export async function regeneratePromptForLanguage({
  analysis,
  selectedOptions = {},
  currentLanguage = 'en'
}) {
  return buildLanguageAwarePrompt({
    analysis,
    selectedOptions,
    language: currentLanguage
  });
}

/**
 * Bulk get options for all categories in specified language
 * Useful for loading all option data at once
 * @param {string} language - Language code ('en' or 'vi')
 * @returns {Promise} All options in specified language
 */
export async function getAllPromptOptionsTranslated(language = 'en') {
  try {
    const categories = [
      'scene',
      'lighting', 
      'mood',
      'style',
      'colorPalette',
      'cameraAngle',
      'hairstyle',
      'makeup'
    ];

    const promises = categories.map(cat =>
      getTranslatedPromptOptions(cat, language)
    );

    const results = await Promise.all(promises);
    const allOptions = {};
    
    categories.forEach((cat, idx) => {
      allOptions[cat] = results[idx].data;
    });

    return allOptions;
  } catch (error) {
    console.error('Error fetching all translated options:', error);
    throw error;
  }
}

export default {
  buildLanguageAwarePrompt,
  getTranslatedPromptOptions,
  regeneratePromptForLanguage,
  getAllPromptOptionsTranslated
};
