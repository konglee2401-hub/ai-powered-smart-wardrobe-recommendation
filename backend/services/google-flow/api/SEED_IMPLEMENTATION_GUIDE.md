/**
 * GOOGLE FLOW SEED SUPPORT - IMPLEMENTATION GUIDE
 * 
 * Overview:
 * Google Flow API supports seed parameter for reproducible image generation.
 * This guide explains 3 approaches to use seed:
 * 
 * 1. Embed seed in prompt text (simple, always works)
 * 2. Send seed in API request body (direct API call)
 * 3. Hybrid: Both text + body (maximum reproducibility)
 * 
 * Status: Google Flow currently generates images via browser UI,
 *         but API supports seed for future direct API calls.
 */

import GoogleFlowAPIClient from './GoogleFlowAPIClient.js';

// ═════════════════════════════════════════════════════════════════════════════
// APPROACH 1: Embed Seed in Prompt Text (Current Implementation)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Add seed to beginning of prompt
 * Google Flow reads SEED: in prompt and uses it for generation
 * 
 * Example: 
 *   Original: "[IMAGE MAPPING]..."
 *   With seed: "SEED: 925090 \n[IMAGE MAPPING]..."
 */
export function addSeedToPrompt(prompt, seed = null) {
  const finalSeed = seed || Math.floor(Math.random() * 1000000);
  return `SEED: ${finalSeed} \n${prompt}`;
}

/**
 * Generate multiple seeded variants of same base prompt
 * Useful for:
 * - A/B testing different seed values
 * - Creating variations while maintaining control
 * - Reproducible generation chains
 */
export function generateSeededPromptVariants(basePrompt, count = 4) {
  const baseSeed = Math.floor(Math.random() * 1000000);
  return Array.from({ length: count }, (_, i) => ({
    prompt: addSeedToPrompt(basePrompt, baseSeed + i),
    seed: baseSeed + i
  }));
}

// ═════════════════════════════════════════════════════════════════════════════
// APPROACH 2: Direct API Call with Seed (Future/Advanced)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Example usage in GoogleFlowAutomationService:
 * 
 * async generateWithDirectAPI(prompt, options = {}) {
 *   // Initialize API client
 *   const apiClient = new GoogleFlowAPIClient(this.page, options);
 *   
 *   // Capture auth tokens from browser
 *   await apiClient.setupRequestInterceptor();
 *   
 *   // Send generation request with seed
 *   const result = await apiClient.batchGenerateImages({
 *     prompt: prompt,
 *     imageAspectRatio: 'IMAGE_ASPECT_RATIO_PORTRAIT',
 *     seed: 925090,  // Custom seed for reproducibility
 *     imageInputs: imageReferences
 *   });
 *   
 *   return result;
 * }
 */

// ═════════════════════════════════════════════════════════════════════════════
// APPROACH 3: Hybrid (Text Seed + API Seed)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Use both seed in prompt text AND API request body
 * Provides:
 * - Backward compatibility (prompt-based seed)
 * - API-level control (request-body seed)
 * - Maximum reproducibility
 * 
 * Example:
 *   Prompt text: SEED: 925090 \n[IMAGE MAPPING]...
 *   API body: "seed": 925090
 *   Both seeds match for consistency
 */

// ═════════════════════════════════════════════════════════════════════════════
// INTEGRATION POINTS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Option 1: Update GoogleFlowAutomationService to add seed to prompts
 * 
 * File: backend/services/googleFlowAutomationService.js
 * Location: In _internalEnterPromptViaManager() or enterPrompt()
 * 
 * Changes:
 * ```javascript
 * async _internalEnterPromptViaManager(promptText) {
 *   // Add seed to prompt if not already present
 *   let finalPrompt = promptText;
 *   if (!promptText.includes('SEED:')) {
 *     const seed = this.options.seed || Math.floor(Math.random() * 1000000);
 *     finalPrompt = addSeedToPrompt(promptText, seed);
 *     console.log(`   📊 Added seed: ${seed}`);
 *   }
 *   
 *   // Continue with modified prompt
 *   await this.promptManager.enterPrompt(finalPrompt);
 * }
 * ```
 */

/**
 * Option 2: Add seed parameter to scene options
 * 
 * When users create scenes, store seed:
 * {
 *   scene: 'studio',
 *   seed: 925090,  // Optional: fixed seed for consistency
 *   // ... other options
 * }
 * 
 * Then use this seed when generating:
 * const prompt = buildPrompt(options);
 * const seededPrompt = addSeedToPrompt(prompt, options.seed);
 */

/**
 * Option 3: Add seed to API payload
 * 
 * File: backend/controllers/browserAutomationController.js
 * 
 * Changes:
 * ```javascript
 * const flowService = new GoogleFlowAutomationService({
 *   // ... existing options
 *   seed: req.body.seed || Math.floor(Math.random() * 1000000)  // From frontend
 * });
 * ```
 * 
 * Frontend sends:
 * ```javascript
 * const response = await browserAutomationAPI.generateBrowserOnly({
 *   // ... existing data
 *   seed: userSelectedSeed || null
 * });
 * ```
 */

// ═════════════════════════════════════════════════════════════════════════════
// API REQUEST EXAMPLE (from F12 developer tools)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Google Flow sends this request:
 * 
 * POST https://aisandbox-pa.googleapis.com/v1/projects/{projectId}/flowMedia:batchGenerateImages
 * 
 * Headers:
 * - Authorization: Bearer {token}
 * - Content-Type: text/plain;charset=UTF-8
 * 
 * Body (simplified):
 * {
 *   "clientContext": {
 *     "recaptchaContext": { "token": "..." },
 *     "projectId": "58d791d4-37c9-47a8-ae3b-816733bc3ec0",
 *     "sessionId": ";1772728961016"
 *   },
 *   "requests": [
 *     {
 *       "imageModelName": "GEM_PIX_2",
 *       "imageAspectRatio": "IMAGE_ASPECT_RATIO_PORTRAIT",
 *       "structuredPrompt": {
 *         "parts": [{ "text": "SEED: 925090 \n[IMAGE MAPPING]..." }]
 *       },
 *       "seed": 961638,  // 💫 SEED PARAMETER
 *       "imageInputs": [...]
 *     }
 *   ]
 * }
 */

// ═════════════════════════════════════════════════════════════════════════════
// SEED STRATEGIES FOR DIFFERENT USE CASES
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Use Case 1: Reproducible Generation
 * 
 * User wants:
 * - Generate image multiple times
 * - Get EXACT same result each time
 * 
 * Solution:
 * ```javascript
 * const seed = 925090;  // Fixed seed
 * const prompt = addSeedToPrompt(basePrompt, seed);
 * const image1 = await generateImage(prompt);
 * const image2 = await generateImage(prompt);
 * // image1 and image2 should be identical
 * ```
 */

/**
 * Use Case 2: Controlled Variation
 * 
 * User wants:
 * - Generate multiple variations
 * - But keep them related (not completely random)
 * 
 * Solution:
 * ```javascript
 * const baseSeed = 925090;
 * const variants = [];
 * for (let i = 0; i < 4; i++) {
 *   const seed = baseSeed + i;  // Seeds: 925090, 925091, 925092, 925093
 *   const prompt = addSeedToPrompt(basePrompt, seed);
 *   variants.push(await generateImage(prompt));
 * }
 * // Variants will be similar but with natural variations
 * ```
 */

/**
 * Use Case 3: Deterministic Batch Processing
 * 
 * User wants:
 * - Batch generate 10 scenes, each with 4 images
 * - Future regenerations should match previous results
 * 
 * Solution:
 * Store seed mapping in database:
 * {
 *   sceneId: 'scene-001',
 *   seeds: [925090, 925091, 925092, 925093]
 * }
 * 
 * On regeneration, reuse same seeds
 * ```javascript
 * const stored = await getStoredSeeds(sceneId);
 * for (const seed of stored.seeds) {
 *   const prompt = addSeedToPrompt(basePrompt, seed);
 *   await generateImage(prompt);
 * }
 * ```
 */

/**
 * Use Case 4: Fully Random (Current Default)
 * 
 * User wants:
 * - Each generation completely random
 * - No reproducibility needed
 * 
 * Solution:
 * Don't include seed at all
 * ```javascript
 * const prompt = basePrompt;  // No seed
 * // OR
 * const prompt = addSeedToPrompt(basePrompt);  // Random seed each time
 * ```
 */

export {
  GoogleFlowAPIClient,
  addSeedToPrompt,
  generateSeededPromptVariants
};
