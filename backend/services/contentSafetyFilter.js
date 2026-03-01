/**
 * Content Safety Filter Service
 * Runtime filtering for prompts to prevent Google Flow rejection
 * Detects and sanitizes sensitive content before sending to API
 */

class ContentSafetyFilter {
  constructor() {
    // Sensitive words with risk levels
    this.sensitiveWords = {
      // High risk - MUST be replaced
      high: {
        'sexy': { alternatives: ['stylish', 'chic', 'elegant'], replacement: 'stylish' },
        'sexy outfits': { alternatives: ['stylish outfits', 'elegant outfits'], replacement: 'stylish outfits' },
        'lingerie': { alternatives: ['elegant undergarments', 'intimate wear'], replacement: 'elegant undergarments' },
        'intimate': { alternatives: ['personal wear', 'private wear'], replacement: 'personal wear' },
        'erotic': { alternatives: ['romantic', 'elegant'], replacement: 'romantic' },
        'provocative': { alternatives: ['striking', 'bold', 'dramatic'], replacement: 'striking' },
        'revealing': { alternatives: ['contemporary-cut', 'stylish', 'fashion-cut'], replacement: 'contemporary-cut' },
        'explicit': { alternatives: ['detailed', 'clear'], replacement: 'detailed' },
        'nude': { alternatives: ['neutral-tone', 'skin-tone', 'beige'], replacement: 'neutral-tone' }
      },
      
      // Medium risk - review/consider replacement
      medium: {
        'sleepwear': { alternatives: ['nightwear', 'loungewear'], replacement: 'nightwear' },
        'sensual': { alternatives: ['elegant', 'refined', 'sophisticated'], replacement: 'elegant' },
        'exposed': { alternatives: ['displayed', 'visible', 'shown'], replacement: 'displayed' },
        'mature': { alternatives: ['sophisticated', 'refined', 'adult-oriented'], replacement: 'sophisticated' },
        'hot': { alternatives: ['trendy', 'fashionable', 'popular'], replacement: 'trendy' },
        'alluring': { alternatives: ['elegant', 'attractive', 'appealing'], replacement: 'elegant' }
      },
      
      // Low risk - monitor
      low: {
        'model': { alternatives: ['showcase', 'display', 'present'], replacement: 'showcase' }
      }
    };
  }

  /**
   * Scan prompt for sensitive words
   * Returns array of findings with risk levels
   */
  scan(text) {
    if (!text) return [];
    
    const findings = [];
    const lowerText = text.toLowerCase();
    
    // Check all risk levels
    ['high', 'medium', 'low'].forEach(riskLevel => {
      Object.entries(this.sensitiveWords[riskLevel]).forEach(([word, config]) => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        const matches = text.match(regex);
        
        if (matches && matches.length > 0) {
          findings.push({
            word: word,
            risk: riskLevel,
            occurrences: matches.length,
            alternatives: config.alternatives,
            replacement: config.replacement
          });
        }
      });
    });
    
    return findings;
  }

  /**
   * Calculate risk score (0-100)
   * 0 = safe, 100 = critical risk
   */
  calculateRiskScore(findings) {
    if (findings.length === 0) return 0;
    
    let score = 0;
    
    findings.forEach(f => {
      if (f.risk === 'high') {
        score += 30 * f.occurrences;
      } else if (f.risk === 'medium') {
        score += 15 * f.occurrences;
      } else if (f.risk === 'low') {
        score += 5 * f.occurrences;
      }
    });
    
    return Math.min(score, 100);
  }

  /**
   * Validate prompt - full check
   * Returns: { isSafe, riskScore, findings, suggestions }
   */
  validatePrompt(prompt) {
    const findings = this.scan(prompt);
    const riskScore = this.calculateRiskScore(findings);
    const isSafe = riskScore < 30; // Safe if score below 30
    
    const suggestions = [];
    
    findings.forEach(f => {
      if (f.risk === 'high') {
        suggestions.push({
          issue: `HIGH RISK: "${f.word}" found ${f.occurrences}x`,
          action: 'MUST REPLACE',
          suggested: f.replacement,
          alternatives: f.alternatives
        });
      } else if (f.risk === 'medium') {
        suggestions.push({
          issue: `Medium Risk: "${f.word}" found ${f.occurrences}x`,
          action: 'CONSIDER REPLACING',
          suggested: f.replacement,
          alternatives: f.alternatives
        });
      }
    });
    
    return {
      isSafe,
      riskScore,
      findings: findings,
      suggestions: suggestions,
      hasHighRisk: findings.some(f => f.risk === 'high'),
      hasMediumRisk: findings.some(f => f.risk === 'medium')
    };
  }

  /**
   * Auto-correct prompt
   * Replaces all high-risk words with safe alternatives
   */
  autoCorrect(prompt, riskLevel = 'high') {
    if (!prompt) return prompt;
    
    let corrected = prompt;
    const levels = riskLevel === 'all' ? 
      ['high', 'medium', 'low'] : 
      riskLevel === 'high' ? ['high'] : ['high', 'medium'];
    
    levels.forEach(level => {
      Object.entries(this.sensitiveWords[level]).forEach(([word, config]) => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        corrected = corrected.replace(regex, (match) => {
          // Preserve case
          if (match[0] === match[0].toUpperCase()) {
            return config.replacement.charAt(0).toUpperCase() + config.replacement.slice(1);
          }
          return config.replacement;
        });
      });
    });
    
    return corrected;
  }

  /**
   * Get safety report for multiple prompts
   */
  batchValidate(prompts) {
    return prompts.map((prompt, idx) => ({
      index: idx,
      original: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
      validation: this.validatePrompt(prompt)
    }));
  }

  /**
   * Generate safe version of prompt
   * Returns both auto-corrected version and manual alternatives
   */
  generateSafeVersion(prompt) {
    const validation = this.validatePrompt(prompt);
    const autoCorrected = this.autoCorrect(prompt, 'high');
    
    return {
      original: prompt,
      autoCorrected: autoCorrected,
      validation: validation,
      status: validation.isSafe ? 'SAFE' : (validation.hasHighRisk ? 'REQUIRES_CORRECTION' : 'REVIEW_RECOMMENDED'),
      changesMade: prompt !== autoCorrected ? 
        { count: validation.findings.length, details: validation.suggestions } : 
        null
    };
  }
}

export default ContentSafetyFilter;
