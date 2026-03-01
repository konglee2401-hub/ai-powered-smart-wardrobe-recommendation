/**
 * Content Filter Service
 * 
 * Validates prompts against Google AI content policies
 * Provides warnings, suggestions, and auto-corrections for sensitive content
 * 
 * Usage:
 * const filter = new ContentFilterService();
 * const result = filter.validatePrompt(userPrompt);
 * if (!result.isSafe) {
 *   console.warn(result.warnings);
 * }
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ContentFilterService {
  constructor() {
    this.sensitiveWordsPath = path.join(__dirname, '../config/googleAISensitiveWords.json');
    this.loadSensitiveWords();
  }

  /**
   * Load sensitive words from JSON file
   */
  loadSensitiveWords() {
    try {
      const data = fs.readFileSync(this.sensitiveWordsPath, 'utf8');
      this.policies = JSON.parse(data);
      this.buildRegexPatterns();
    } catch (error) {
      console.error('❌ Failed to load sensitive words policy:', error.message);
      this.policies = null;
    }
  }

  /**
   * Build regex patterns for efficient matching
   */
  buildRegexPatterns() {
    this.patterns = {};
    
    Object.entries(this.policies.categories).forEach(([category, config]) => {
      this.patterns[category] = {
        severity: config.severity,
        words: {},
        regex: null
      };

      if (Array.isArray(config.words)) {
        config.words.forEach(item => {
          if (item.word) {
            this.patterns[category].words[item.word.toLowerCase()] = {
              reason: item.reason,
              replacement: item.replacement
            };
          }
        });

        // Build combined regex for this category
        const words = config.words
          .map(w => w.word)
          .filter(Boolean)
          .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')); // Escape special chars
        
        if (words.length > 0) {
          this.patterns[category].regex = new RegExp(`\\b(${words.join('|')})\\b`, 'gi');
        }
      }
    });
  }

  /**
   * Main validation function
   * @param {string} prompt - User prompt to validate
   * @param {object} options - Validation options
   * @returns {object} Validation result with flags, warnings, suggestions
   */
  validatePrompt(prompt, options = {}) {
    if (!prompt || typeof prompt !== 'string') {
      return {
        isSafe: true,
        warnings: [],
        flags: [],
        violations: [],
        suggestions: []
      };
    }

    const result = {
      isSafe: true,
      warnings: [],
      flags: [],
      violations: [],
      suggestions: [],
      detailedResults: {},
      riskScore: 0
    };

    const promptLower = prompt.toLowerCase();

    // Check each category
    Object.entries(this.patterns).forEach(([category, config]) => {
      const categoryViolations = [];
      const categoryMatches = [];

      if (config.regex) {
        let match;
        while ((match = config.regex.exec(promptLower)) !== null) {
          const foundWord = match[1];
          const wordData = config.words[foundWord.toLowerCase()];
          
          categoryMatches.push({
            word: foundWord,
            position: match.index,
            reason: wordData?.reason || `Flagged word in '${category}' category`,
            replacement: wordData?.replacement || 'remove this word'
          });
        }
      }

      if (categoryMatches.length > 0) {
        result.detailedResults[category] = categoryMatches;
        result.isSafe = false;

        // Calculate severity impact on risk score
        const severityWeight = {
          critical: 30,
          'critical-high': 25,
          high: 15,
          medium: 10,
          low: 5
        };

        const weight = severityWeight[config.severity] || 10;
        result.riskScore += weight * categoryMatches.length;

        categoryMatches.forEach(match => {
          const flag = `[${category.toUpperCase()}] ${match.word}`;
          result.flags.push(flag);
          
          result.warnings.push({
            category,
            severity: config.severity,
            word: match.word,
            reason: match.reason,
            replacement: match.replacement,
            position: match.position
          });

          result.violations.push({
            type: category,
            flag: match.word,
            severity: config.severity
          });

          result.suggestions.push({
            original: match.word,
            suggestion: match.replacement,
            reason: match.reason
          });
        });
      }
    });

    // Cap risk score at 100
    result.riskScore = Math.min(result.riskScore, 100);

    // Determine overall safety status
    if (result.warnings.length === 0) {
      result.isSafe = true;
      result.status = '✅ SAFE';
    } else if (result.riskScore >= 70) {
      result.status = '🚫 UNSAFE - High risk, likely to be rejected by API';
    } else if (result.riskScore >= 40) {
      result.status = '⚠️  CAUTION - Medium risk, monitor for rejection';
    } else {
      result.status = '⚡ WARNING - Low risk, but has flagged content';
    }

    return result;
  }

  /**
   * Auto-correct prompt using suggested replacements
   * @param {string} prompt - Original prompt
   * @param {array} suggestions - Suggestions from validatePrompt result
   * @returns {string} Corrected prompt
   */
  autoCorrectPrompt(prompt, suggestions) {
    let corrected = prompt;

    suggestions.forEach(({ original, suggestion }) => {
      // Case-insensitive replacement
      const regex = new RegExp(`\\b${original}\\b`, 'gi');
      corrected = corrected.replace(regex, suggestion);
    });

    return corrected.trim();
  }

  /**
   * Get detailed explanation of violations
   * @param {object} validationResult - Result from validatePrompt
   * @returns {string} Formatted explanation
   */
  getDetailedExplanation(validationResult) {
    if (validationResult.isSafe) {
      return `✅ Your prompt is safe and complies with content policies.`;
    }

    let explanation = `⚠️ Your prompt contains ${validationResult.warnings.length} flagged items:\n\n`;

    validationResult.warnings.forEach((warning, idx) => {
      explanation += `${idx + 1}. **${warning.word}** (${warning.severity})\n`;
      explanation += `   - Issue: ${warning.reason}\n`;
      explanation += `   - Use instead: "${warning.replacement}"\n\n`;
    });

    explanation += `\n**Risk Score:** ${validationResult.riskScore}/100\n`;
    explanation += `**Status:** ${validationResult.status}\n`;

    return explanation;
  }

  /**
   * Generate a safe prompt version with suggestions applied
   * @param {string} prompt - Original prompt
   * @param {boolean} autoApplySuggestions - Auto-apply suggestions
   * @returns {object} Original and safe version
   */
  generateSafeVersion(prompt, autoApplySuggestions = true) {
    const validation = this.validatePrompt(prompt);
    
    let safePrompt = prompt;
    if (autoApplySuggestions && validation.suggestions.length > 0) {
      safePrompt = this.autoCorrectPrompt(prompt, validation.suggestions);
    }

    return {
      original: prompt,
      safe: safePrompt,
      validation,
      needsReview: validation.violations.some(v => v.severity === 'critical'),
      appliedCorrections: validation.suggestions.length
    };
  }

  /**
   * Get statistics about content safety
   * @param {array} prompts - Array of prompts to analyze
   * @returns {object} Statistics
   */
  getStatistics(prompts) {
    const stats = {
      totalPrompts: prompts.length,
      safePrompts: 0,
      unsafePrompts: 0,
      averageRiskScore: 0,
      topViolatedCategories: {},
      mostCommonFlags: {},
      severityBreakdown: {
        critical: 0,
        'critical-high': 0,
        high: 0,
        medium: 0,
        low: 0
      }
    };

    let totalRiskScore = 0;

    prompts.forEach(prompt => {
      const result = this.validatePrompt(prompt);
      
      if (result.isSafe) {
        stats.safePrompts++;
      } else {
        stats.unsafePrompts++;
      }

      totalRiskScore += result.riskScore;

      result.violations.forEach(violation => {
        stats.topViolatedCategories[violation.type] = 
          (stats.topViolatedCategories[violation.type] || 0) + 1;
        stats.mostCommonFlags[violation.flag] = 
          (stats.mostCommonFlags[violation.flag] || 0) + 1;
        stats.severityBreakdown[violation.severity] = 
          (stats.severityBreakdown[violation.severity] || 0) + 1;
      });
    });

    stats.averageRiskScore = prompts.length > 0 
      ? Math.round(totalRiskScore / prompts.length) 
      : 0;

    // Sort for readability
    stats.topViolatedCategories = Object.fromEntries(
      Object.entries(stats.topViolatedCategories)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
    );

    stats.mostCommonFlags = Object.fromEntries(
      Object.entries(stats.mostCommonFlags)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
    );

    return stats;
  }

  /**
   * Reload policies from file (useful for dynamic updates)
   */
  reloadPolicies() {
    this.loadSensitiveWords();
  }

  /**
   * Get category information
   * @param {string} categoryName - Name of category
   * @returns {object} Category information
   */
  getCategoryInfo(categoryName) {
    return this.policies?.categories[categoryName] || null;
  }

  /**
   * List all categories and their severity
   * @returns {array} List of categories
   */
  listCategories() {
    return Object.entries(this.policies?.categories || {}).map(([name, config]) => ({
      name,
      severity: config.severity,
      description: config.description,
      wordCount: Array.isArray(config.words) ? config.words.length : 0
    }));
  }
}

export default ContentFilterService;
