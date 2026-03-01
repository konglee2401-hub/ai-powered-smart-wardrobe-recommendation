/**
 * EXAMPLE: Content Filter Integration
 * 
 * Shows how to integrate ContentFilterService into existing image generation workflows
 * Add this to your services to validate prompts before sending to Google APIs
 */

import ContentFilterService from './contentFilterService.js';

const contentFilter = new ContentFilterService();

// ============================================
// EXAMPLE 1: Prompt Validation Middleware
// ============================================

export function validatePromptMiddleware(req, res, next) {
  const { prompt } = req.body;

  if (!prompt) {
    return next();
  }

  const validationResult = contentFilter.validatePrompt(prompt);

  // Store result in request for downstream handlers
  req.contentValidation = validationResult;

  if (!validationResult.isSafe) {
    // Return 400 Bad Request with detailed info
    return res.status(400).json({
      error: 'Content Policy Violation',
      message: validationResult.status,
      violations: validationResult.violations,
      suggestions: validationResult.suggestions,
      riskScore: validationResult.riskScore,
      details: contentFilter.getDetailedExplanation(validationResult)
    });
  }

  next();
}

// ============================================
// EXAMPLE 2: Safe Prompt Generation
// ============================================

export function generateSafePrompt(userPrompt, options = {}) {
  const {
    autoCorrect = true,
    throwError = false,
    returnOriginal = false
  } = options;

  const result = contentFilter.generateSafeVersion(userPrompt, autoCorrect);

  if (result.needsReview && throwError) {
    throw new Error(
      `Critical policy violation detected. Manual review required. Violations: ${
        result.validation.violations.map(v => v.flag).join(', ')
      }`
    );
  }

  return returnOriginal ? result.original : result.safe;
}

// ============================================
// EXAMPLE 3: Integration with Virtual Try-On
// ============================================

export async function buildSafeVirtualTryOnPrompt(characterAnalysis, productAnalysis, selectedOptions = {}) {
  // Your existing buildVirtualTryOnPrompt function creates the prompt
  let prompt = buildYourExistingPromptFunction(characterAnalysis, productAnalysis, selectedOptions);

  // Validate it
  const validation = contentFilter.validatePrompt(prompt);

  if (!validation.isSafe) {
    console.warn(`⚠️ Virtual try-on prompt has ${validation.warnings.length} flagged items`);
    
    // Auto-correct if safe to do so
    if (validation.riskScore < 70) {
      const safeVersion = contentFilter.generateSafeVersion(prompt, true);
      prompt = safeVersion.safe;
      console.log(`✅ Auto-corrected prompt (${safeVersion.appliedCorrections} changes)`);
    } else {
      // Don't use this prompt - need manual review
      throw new Error(
        `Unsafe prompt detected (risk score: ${validation.riskScore}/100). Manual review required.`
      );
    }
  }

  return prompt;
}

// ============================================
// EXAMPLE 4: Logging and Analytics
// ============================================

export async function logContentValidation(prompts, userId, sessionId) {
  const stats = contentFilter.getStatistics(prompts);
  
  // Log to your analytics system
  console.log('📊 Content Validation Report', {
    userId,
    sessionId,
    timestamp: new Date().toISOString(),
    ...stats
  });

  // Flag for review if high-risk prompts
  if (stats.unsafePrompts > 0) {
    console.warn(`⚠️ ${stats.unsafePrompts}/${stats.totalPrompts} prompts flagged`);
    
    // You could send this to a moderation queue
    return {
      requiresReview: stats.unsafePrompts > 0,
      stats,
      topViolations: stats.mostCommonFlags
    };
  }

  return { requiresReview: false, stats };
}

// ============================================
// EXAMPLE 5: User Feedback & Warnings
// ============================================

export function getUserFriendlyWarning(validationResult) {
  if (validationResult.isSafe) {
    return null;
  }

  const criticalCount = validationResult.warnings.filter(
    w => w.severity === 'critical'
  ).length;

  if (criticalCount > 0) {
    return {
      icon: '🚫',
      title: 'Content Not Allowed',
      message: `Your prompt contains ${criticalCount} prohibited word(s). Please revise.`,
      suggestions: validationResult.suggestions.slice(0, 3),
      canProceed: false
    };
  }

  const mediumCount = validationResult.warnings.filter(
    w => w.severity === 'high' || w.severity === 'medium'
  ).length;

  if (mediumCount > 0) {
    return {
      icon: '⚠️',
      title: 'Warning',
      message: `Your prompt contains ${mediumCount} flagged word(s). It might be rejected.`,
      suggestions: validationResult.suggestions.slice(0, 3),
      canProceed: true,
      proceedAtOwnRisk: true
    };
  }

  return {
    icon: '⚡',
    title: 'Notice',
    message: 'Minor flags detected in your prompt.',
    suggestions: validationResult.suggestions,
    canProceed: true
  };
}

// ============================================
// EXAMPLE 6: Frontend Integration (React)
// ============================================

/*
// In your React component:

function ImageGenerationForm() {
  const [prompt, setPrompt] = useState('');
  const [validation, setValidation] = useState(null);

  const handlePromptChange = (e) => {
    const value = e.target.value;
    setPrompt(value);

    // Validate in real-time (optional)
    if (value.length > 20) {
      fetch('/api/validate-prompt', {
        method: 'POST',
        body: JSON.stringify({ prompt: value })
      })
      .then(r => r.json())
      .then(data => setValidation(data));
    }
  };

  const handleSubmit = async () => {
    // Server-side validation will occur in the middleware
    const response = await fetch('/api/generate-image', {
      method: 'POST',
      body: JSON.stringify({ prompt })
    });

    if (response.status === 400) {
      const error = await response.json();
      setValidation(error);
      // Show error message from error.details
    } else {
      // Proceed with generation
    }
  };

  return (
    <form>
      <textarea value={prompt} onChange={handlePromptChange} />
      {validation && !validation.isSafe && (
        <div className="warning">
          <p>{validation.message}</p>
          <ul>
            {validation.suggestions.map(s => (
              <li key={s.original}>
                Change "{s.original}" to "{s.suggestion}"
              </li>
            ))}
          </ul>
        </div>
      )}
      <button onClick={handleSubmit}>Generate Image</button>
    </form>
  );
}
*/

// ============================================
// EXAMPLE 7: Batch Processing with Reports
// ============================================

export async function validateBatchPrompts(prompts, options = {}) {
  const {
    generateReport = true,
    autoCorrect = true
  } = options;

  const results = prompts.map((prompt, idx) => {
    const validation = contentFilter.validatePrompt(prompt);
    let safe = prompt;

    if (autoCorrect && !validation.isSafe && validation.riskScore < 70) {
      safe = contentFilter.autoCorrectPrompt(prompt, validation.suggestions);
    }

    return {
      index: idx,
      original: prompt,
      safe,
      validation,
      needsManualReview: validation.riskScore >= 70
    };
  });

  if (generateReport) {
    const stats = contentFilter.getStatistics(prompts);
    return {
      results,
      summary: {
        total: prompts.length,
        safe: results.filter(r => r.validation.isSafe).length,
        flagged: results.filter(r => !r.validation.isSafe).length,
        requiresReview: results.filter(r => r.needsManualReview).length,
        ...stats
      }
    };
  }

  return results;
}

// ============================================
// EXAMPLE 8: List Categories & Info
// ============================================

export function getPolicyOverview() {
  const categories = contentFilter.listCategories();

  return {
    timestamp: new Date().toISOString(),
    totalCategories: categories.length,
    totalPolicies: categories.reduce((sum, c) => sum + c.wordCount, 0),
    categories: categories.sort((a, b) => {
      const severityOrder = { critical: 0, 'critical-high': 1, high: 2, medium: 3, low: 4 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    })
  };
}

// ============================================
// TEST EXAMPLES
// ============================================

export function testContentFilter() {
  console.log('\n🧪 Content Filter Test Suite\n');

  // Test 1: Safe prompt
  const safePrompt = 'A woman wearing a beautiful blue dress in a studio setting with professional lighting';
  const result1 = contentFilter.validatePrompt(safePrompt);
  console.log('✅ TEST 1 - Safe Prompt:', result1.isSafe ? 'PASSED' : 'FAILED');

  // Test 2: Unsafe prompt with violence
  const unsafePrompt1 = 'A person shooting a gun in the street';
  const result2 = contentFilter.validatePrompt(unsafePrompt1);
  console.log('✅ TEST 2 - Violence Detection:', !result2.isSafe ? 'PASSED' : 'FAILED');
  console.log('   Flags:', result2.flags);

  // Test 3: Adult content
  const unsafePrompt2 = 'A nude person in sexy pose';
  const result3 = contentFilter.validatePrompt(unsafePrompt2);
  console.log('✅ TEST 3 - Adult Content Detection:', !result3.isSafe ? 'PASSED' : 'FAILED');
  console.log('   Risk Score:', result3.riskScore);

  // Test 4: Auto-correction
  const mixedPrompt = 'A beautiful woman in blurry, low quality clothing';
  const corrected = contentFilter.generateSafeVersion(mixedPrompt, true);
  console.log('✅ TEST 4 - Auto-correction:', corrected.appliedCorrections > 0 ? 'PASSED' : 'FAILED');
  console.log('   Original:', corrected.original);
  console.log('   Safe:', corrected.safe);

  // Test 5: Statistics
  const testPrompts = [
    safePrompt,
    unsafePrompt1,
    unsafePrompt2,
    'Fashion model in designer clothes'
  ];
  const stats = contentFilter.getStatistics(testPrompts);
  console.log('✅ TEST 5 - Statistics:', stats.totalPrompts === 4 ? 'PASSED' : 'FAILED');
  console.log('   Safe:', stats.safePrompts, 'Unsafe:', stats.unsafePrompts);
  console.log('   Average Risk:', stats.averageRiskScore);

  console.log('\n🎯 All tests completed\n');
}

// Run tests
testContentFilter();
