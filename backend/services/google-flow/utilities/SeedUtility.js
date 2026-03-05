/**
 * Seed Utility Functions - Quick Implementation
 * 
 * Use these functions to add seed support to GoogleFlowAutomationService
 * without major refactoring
 */

/**
 * Add seed to prompt text
 * @param {string} prompt - Base prompt
 * @param {number} seed - Optional seed (random if not provided)
 * @returns {string} Prompt with SEED prefix
 */
export function prependSeedToPrompt(prompt, seed = null) {
  const finalSeed = seed || Math.floor(Math.random() * 1000000);
  if (prompt.includes('SEED:')) {
    // Already has seed, extract it
    const match = prompt.match(/SEED:\s*(\d+)/);
    return prompt;  // Return as-is
  }
  return `SEED: ${finalSeed} \n${prompt}`;
}

/**
 * Extract seed from prompt if present
 * @param {string} prompt
 * @returns {number|null} Extracted seed or null
 */
export function extractSeedFromPrompt(prompt) {
  const match = prompt.match(/SEED:\s*(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Check if prompt already has seed
 */
export function hasSeeds(prompt) {
  return /SEED:\s*\d+/i.test(prompt);
}

/**
 * Generate deterministic seed from input string
 * Useful for reproducible generation based on user input
 * 
 * Example: Always same seed for same character name
 */
export function seedFromString(input) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;  // Convert to 32-bit integer
  }
  return Math.abs(hash) % 1000000;
}

/**
 * Generate range of seeds for variation
 * @param {number} baseSeed - Starting seed
 * @param {number} count - How many seeds to generate
 * @returns {number[]} Array of seeds
 */
export function generateSeedRange(baseSeed, count = 4) {
  return Array.from({ length: count }, (_, i) => baseSeed + i);
}

/**
 * Parse seed from various sources
 * @param {any} source - String, number, object, or null
 * @returns {number} Final seed value
 */
export function parseSeed(source) {
  if (typeof source === 'number') {
    return source;
  }
  if (typeof source === 'string') {
    // Try to extract from string like "SEED: 925090"
    const match = source.match(/\d+/);
    if (match) {
      return parseInt(match[0], 10);
    }
    // If no number found, generate from string
    return seedFromString(source);
  }
  // Random seed
  return Math.floor(Math.random() * 1000000);
}
