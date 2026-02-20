/**
 * PromptSuggestor - AI-powered prompt improvement suggestions
 */
class PromptSuggestor {
  constructor() {
    // Suggestion strategies and patterns
    this.improvements = {
      length: {
        name: 'Length Optimization',
        ideal: { min: 10, max: 100 },
        check: (prompt) => {
          const words = prompt.split(/\s+/).length;
          if (words < 5) return { issue: 'too_short', words };
          if (words > 150) return { issue: 'too_long', words };
          return { issue: null, words };
        },
        suggest: (prompt) => {
          const words = prompt.split(/\s+/).length;
          if (words < 5) {
            return {
              title: 'Add more detail',
              suggestion: prompt + ' with clear visibility of clothing details and styling',
              reason: 'Prompts with 10+ words generate better quality videos'
            };
          }
          if (words > 150) {
            return {
              title: 'Simplify prompt',
              suggestion: prompt.substring(0, 120) + '...',
              reason: 'Grok works better with focused prompts under 150 words'
            };
          }
          return null;
        }
      },

      actionVerbs: {
        name: 'Action Verbs',
        keywords: ['walk', 'pose', 'model', 'show', 'display', 'wear', 'dress', 'stand', 'move'],
        alternatives: {
          'walk': ['stride confidently', 'strut down runway', 'parade outfit', 'briskly walk'],
          'pose': ['stand statuesque', 'strike a pose', 'stance', 'position confidently'],
          'show': ['showcase', 'display prominently', 'present', 'demonstrate'],
          'wear': ['model', 'dress in', 'sport', 'put on display'],
          'stand': ['pose', 'stance', 'position', 'stand confidently']
        },
        check: (prompt) => {
          const found = [];
          for (const verb of this.keywords) {
            if (prompt.toLowerCase().includes(verb)) {
              found.push(verb);
            }
          }
          return found;
        },
        suggest: (prompt) => {
          const suggestions = [];
          const found = this.check(prompt);
          
          if (found.length === 0) {
            suggestions.push({
              title: 'Add action verb',
              suggestion: prompt + ' while briskly walking',
              reason: 'Action verbs (walk, pose, model) create more dynamic videos'
            });
          } else {
            // Suggest alternatives for found verbs
            for (const verb of found) {
              if (this.alternatives[verb]) {
                for (const alt of this.alternatives[verb].slice(0, 2)) {
                  suggestions.push({
                    title: `Try different action: ${verb} → ${alt}`,
                    suggestion: prompt.replace(new RegExp(verb, 'i'), alt),
                    reason: `"${alt}" may create more dynamic motion`
                  });
                }
              }
            }
          }
          
          return suggestions.slice(0, 3);
        }
      },

      specificity: {
        name: 'Specificity',
        details: [
          { pattern: /clothing|outfit|dress|wear/i, hasSuggestion: false, add: ', showing fabric texture and fit' },
          { pattern: /movement|motion|walk|pose/i, hasSuggestion: false, add: ', smooth and natural movement' },
          { pattern: /lighting|light|bright/i, hasSuggestion: false, add: ', with professional lighting' },
          { pattern: /background|environment|scene/i, hasSuggestion: false, add: ', in minimalist white background' }
        ],
        check: (prompt) => {
          const missing = [];
          if (!/fabric|texture|detail|material/i.test(prompt)) {
            missing.push('fabric_details');
          }
          if (!/light|bright|illuminat|glow/i.test(prompt)) {
            missing.push('lighting');
          }
          if (!/background|environment|scene|setting/i.test(prompt)) {
            missing.push('background');
          }
          return missing;
        },
        suggest: (prompt) => {
          const suggestions = [];
          const missing = this.check(prompt);
          
          if (missing.includes('fabric_details')) {
            suggestions.push({
              title: 'Add fabric description',
              suggestion: prompt + ', clearly showing fabric quality and weave',
              reason: 'Mentioning fabric details improves clothing visibility'
            });
          }
          
          if (missing.includes('lighting')) {
            suggestions.push({
              title: 'Add lighting description',
              suggestion: prompt + ', with soft professional lighting',
              reason: 'Well-lit videos show clothing details better'
            });
          }
          
          if (missing.includes('background')) {
            suggestions.push({
              title: 'Specify background',
              suggestion: prompt + ', against clean white background',
              reason: 'Plain backgrounds focus attention on the outfit'
            });
          }
          
          return suggestions;
        }
      },

      clarity: {
        name: 'Clarity & Grammar',
        check: (prompt) => {
          const issues = [];
          if (!/[.!?]$/.test(prompt)) {
            issues.push('no_punctuation');
          }
          if (/\b[a-z]/.test(prompt.substring(0, 1))) {
            issues.push('no_capital');
          }
          if (/\s{2,}/.test(prompt)) {
            issues.push('double_spaces');
          }
          return issues;
        },
        suggest: (prompt) => {
          let improved = prompt;
          
          // Add capital letter
          if (!/^[A-Z]/.test(improved)) {
            improved = improved.charAt(0).toUpperCase() + improved.slice(1);
          }
          
          // Add ending punctuation
          if (!/[.!?]$/.test(improved)) {
            improved += '.';
          }
          
          // Remove extra spaces
          improved = improved.replace(/\s{2,}/g, ' ');
          
          if (improved !== prompt) {
            return [{
              title: 'Fix punctuation and formatting',
              suggestion: improved,
              reason: 'Proper grammar and punctuation improve prompt clarity'
            }];
          }
          
          return [];
        }
      }
    };
  }

  /**
   * Generate all suggestions for a prompt
   */
  async generateSuggestions(basePrompt, scenario = '', characterDescription = '', maxSuggestions = 5) {
    if (!basePrompt || basePrompt.trim().length === 0) {
      return [];
    }

    const allSuggestions = [];

    // Length suggestions
    if (this.improvements.length.suggest) {
      const lengthSuggestion = this.improvements.length.suggest(basePrompt);
      if (lengthSuggestion) {
        allSuggestions.push({
          type: 'length',
          priority: 'high',
          ...lengthSuggestion
        });
      }
    }

    // Action verb suggestions
    if (this.improvements.actionVerbs.suggest) {
      const verbSuggestions = this.improvements.actionVerbs.suggest(basePrompt);
      for (const suggestion of verbSuggestions) {
        allSuggestions.push({
          type: 'action_verb',
          priority: 'medium',
          ...suggestion
        });
      }
    }

    // Specificity suggestions
    if (this.improvements.specificity.suggest) {
      const specificitySuggestions = this.improvements.specificity.suggest(basePrompt);
      for (const suggestion of specificitySuggestions) {
        allSuggestions.push({
          type: 'specificity',
          priority: 'medium',
          ...suggestion
        });
      }
    }

    // Clarity suggestions
    if (this.improvements.clarity.suggest) {
      const claritySuggestions = this.improvements.clarity.suggest(basePrompt);
      for (const suggestion of claritySuggestions) {
        allSuggestions.push({
          type: 'clarity',
          priority: 'low',
          ...suggestion
        });
      }
    }

    // Scenario-specific suggestions
    const scenarioSuggestions = this._getScenarioSuggestions(basePrompt, scenario);
    allSuggestions.push(...scenarioSuggestions);

    // Character context suggestions
    if (characterDescription && characterDescription.length > 0) {
      const characterSuggestions = this._getCharacterSuggestions(basePrompt, characterDescription);
      allSuggestions.push(...characterSuggestions);
    }

    // Sort by priority and dedup
    const sortPriority = { high: 0, medium: 1, low: 2 };
    allSuggestions.sort((a, b) => sortPriority[a.priority] - sortPriority[b.priority]);

    // Remove duplicates
    const seen = new Set();
    const unique = [];
    for (const suggestion of allSuggestions) {
      const key = suggestion.suggestion;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(suggestion);
      }
    }

    return unique.slice(0, maxSuggestions);
  }

  /**
   * Get scenario-specific suggestions
   */
  _getScenarioSuggestions(prompt, scenario) {
    const suggestions = [];
    const scenarioAdditions = {
      'product-demo': {
        check: /show|display|demonstrate|present|feature/i.test(prompt),
        suggestion: `${prompt}. Highlight key features and design details of the clothing.`,
        reason: 'For product demos, emphasizing key features improves engagement'
      },
      'fashion-walk': {
        check: /walk|strut|runway|parade/i.test(prompt),
        suggestion: `${prompt}. Confident runway-style walk showcasing the outfit from multiple angles.`,
        reason: 'Fashion walks benefit from explicit movement and multiple angles'
      },
      'lifestyle': {
        check: /natural|everyday|casual|lifestyle/i.test(prompt),
        suggestion: `${prompt}. Natural pose in everyday setting showing how to style the outfit.`,
        reason: 'Lifestyle content works better with natural, contextual positioning'
      },
      'dancing': {
        check: /dance|move|rhythm|beat|rhythm/i.test(prompt),
        suggestion: `${prompt}. Dynamic dance moves with rhythmic motion to showcase outfit.`,
        reason: 'Dancing videos need explicit motion and rhythm descriptions'
      }
    };

    if (scenario && scenarioAdditions[scenario]) {
      const config = scenarioAdditions[scenario];
      if (!config.check) {
        suggestions.push({
          type: 'scenario',
          priority: 'high',
          title: `Optimize for ${scenario}`,
          suggestion: config.suggestion,
          reason: config.reason
        });
      }
    }

    return suggestions;
  }

  /**
   * Get character context suggestions
   */
  _getCharacterSuggestions(prompt, characterDescription) {
    const suggestions = [];
    
    // Check if prompt already mentions character
    if (!/model|person|character|figure/i.test(prompt)) {
      suggestions.push({
        type: 'character_context',
        priority: 'medium',
        title: 'Include character reference',
        suggestion: `${prompt}. Model has ${characterDescription.toLowerCase()}.`,
        reason: 'Referencing character descriptions improves consistency'
      });
    }

    return suggestions;
  }

  /**
   * Validate prompt quality
   */
  validatePrompt(prompt) {
    const issues = [];
    const warnings = [];

    // Critical issues
    if (!prompt || prompt.trim().length === 0) {
      issues.push('Prompt cannot be empty');
    }

    const words = prompt.split(/\s+/).length;
    if (words < 3) {
      issues.push('Prompt is too short (minimum 3 words)');
    }

    // Warnings
    if (words < 5) {
      warnings.push('Short prompts may result in low-quality videos (recommended 5+ words)');
    }

    if (words > 150) {
      warnings.push('Long prompts may confuse the model (150 words is the limit)');
    }

    if (!/[.!?]$/.test(prompt)) {
      warnings.push('Prompt should end with punctuation');
    }

    if (/\b(the the|and and|a a)\b/i.test(prompt)) {
      warnings.push('Prompt contains repeated words');
    }

    return {
      valid: issues.length === 0,
      issues,
      warnings,
      wordCount: words,
      score: this._calculateQualityScore(prompt)
    };
  }

  /**
   * Calculate quality score for prompt
   */
  _calculateQualityScore(prompt) {
    let score = 50; // Base score

    const words = prompt.split(/\s+/).length;
    
    // Length score
    if (words >= 10 && words <= 100) score += 20;
    else if (words >= 5) score += 10;
    
    // Action verb score
    if (/walk|pose|model|show|display|wear|move/i.test(prompt)) score += 15;
    
    // Descriptive words score
    if (/professional|confident|elegant|dynamic|smooth|natural/i.test(prompt)) score += 10;
    
    // Punctuation score
    if (/[.!?]$/.test(prompt)) score += 5;
    
    return Math.min(100, score);
  }
}

export default PromptSuggestor;
