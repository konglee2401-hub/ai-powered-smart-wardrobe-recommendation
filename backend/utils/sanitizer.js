/**
 * Sanitizer Utility
 * Input validation and sanitization for prompt enhancement
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  minLength: 10,
  maxLength: 2000,
  maxTags: 20,
  maxTagLength: 50,
};

// Dangerous patterns
const DANGEROUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /data:\s*text\/html/gi,
];

const SQL_INJECTION_PATTERNS = [
  /('|(--)|;|\/\*|\*\/|xp_|sp_|exec|execute|insert|delete|update|drop|create)/gi,
];

// ============================================================================
// PROMPT SANITIZER
// ============================================================================

/**
 * Sanitize prompt input
 * @param {string} prompt - Raw prompt input
 * @returns {object} - { isValid, text, error }
 */
export function sanitizePrompt(prompt) {
  // Check if prompt exists
  if (!prompt) {
    return {
      isValid: false,
      text: null,
      error: 'Prompt is required',
    };
  }

  // Convert to string if not
  if (typeof prompt !== 'string') {
    return {
      isValid: false,
      text: null,
      error: 'Prompt must be a string',
    };
  }

  // Trim whitespace
  let sanitized = prompt.trim();

  // Check minimum length
  if (sanitized.length < CONFIG.minLength) {
    return {
      isValid: false,
      text: null,
      error: `Prompt must be at least ${CONFIG.minLength} characters`,
    };
  }

  // Check maximum length
  if (sanitized.length > CONFIG.maxLength) {
    return {
      isValid: false,
      text: null,
      error: `Prompt must not exceed ${CONFIG.maxLength} characters`,
    };
  }

  // Check for dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(sanitized)) {
      return {
        isValid: false,
        text: null,
        error: 'Prompt contains invalid characters or patterns',
      };
    }
  }

  // Check for SQL injection patterns
  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(sanitized)) {
      return {
        isValid: false,
        text: null,
        error: 'Prompt contains potentially dangerous patterns',
      };
    }
  }

  // Remove null bytes and other control characters
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Escape HTML entities (basic)
  sanitized = sanitized
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#x27;');

  return {
    isValid: true,
    text: sanitized,
    error: null,
  };
}

// ============================================================================
// TAGS SANITIZER
// ============================================================================

/**
 * Sanitize tags input
 * @param {array} tags - Array of tags
 * @returns {object} - { isValid, tags, error }
 */
export function sanitizeTags(tags) {
  // Check if tags exist
  if (!tags) {
    return {
      isValid: false,
      tags: null,
      error: 'Tags are required',
    };
  }

  // Check if it's an array
  if (!Array.isArray(tags)) {
    return {
      isValid: false,
      tags: null,
      error: 'Tags must be an array',
    };
  }

  // Check array length
  if (tags.length === 0) {
    return {
      isValid: false,
      tags: null,
      error: 'Tags array cannot be empty',
    };
  }

  if (tags.length > CONFIG.maxTags) {
    return {
      isValid: false,
      tags: null,
      error: `Maximum ${CONFIG.maxTags} tags allowed`,
    };
  }

  // Sanitize each tag
  const sanitizedTags = [];
  
  for (const tag of tags) {
    if (typeof tag !== 'string') {
      return {
        isValid: false,
        tags: null,
        error: 'Each tag must be a string',
      };
    }

    let sanitizedTag = tag.trim().toLowerCase();

    // Check tag length
    if (sanitizedTag.length === 0) {
      return {
        isValid: false,
        tags: null,
        error: 'Tags cannot be empty',
      };
    }

    if (sanitizedTag.length > CONFIG.maxTagLength) {
      return {
        isValid: false,
        tags: null,
        error: `Each tag must not exceed ${CONFIG.maxTagLength} characters`,
      };
    }

    // Remove special characters except hyphens and underscores
    sanitizedTag = sanitizedTag.replace(/[^a-z0-9\-_]/g, '-');

    // Remove duplicate hyphens
    sanitizedTag = sanitizedTag.replace(/-+/g, '-');

    // Remove leading/trailing hyphens
    sanitizedTag = sanitizedTag.replace(/^-|-$/g, '');

    if (sanitizedTag.length > 0) {
      sanitizedTags.push(sanitizedTag);
    }
  }

  // Remove duplicates
  const uniqueTags = [...new Set(sanitizedTags)];

  return {
    isValid: true,
    tags: uniqueTags,
    error: null,
  };
}

// ============================================================================
// NOTES SANITIZER
// ============================================================================

/**
 * Sanitize notes input
 * @param {string} notes - Raw notes input
 * @returns {object} - { isValid, text, error }
 */
export function sanitizeNotes(notes) {
  if (!notes) {
    return {
      isValid: true,
      text: '',
      error: null,
    };
  }

  if (typeof notes !== 'string') {
    return {
      isValid: false,
      text: null,
      error: 'Notes must be a string',
    };
  }

  let sanitized = notes.trim();

  // Check max length
  if (sanitized.length > 500) {
    return {
      isValid: false,
      text: null,
      error: 'Notes must not exceed 500 characters',
    };
  }

  // Remove control characters
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  return {
    isValid: true,
    text: sanitized,
    error: null,
  };
}

// ============================================================================
// SEARCH QUERY SANITIZER
// ============================================================================

/**
 * Sanitize search query
 * @param {string} query - Raw search query
 * @returns {object} - { isValid, text, error }
 */
export function sanitizeSearchQuery(query) {
  if (!query) {
    return {
      isValid: false,
      text: null,
      error: 'Search query is required',
    };
  }

  if (typeof query !== 'string') {
    return {
      isValid: false,
      text: null,
      error: 'Search query must be a string',
    };
  }

  let sanitized = query.trim();

  // Check length
  if (sanitized.length < 2) {
    return {
      isValid: false,
      text: null,
      error: 'Search query must be at least 2 characters',
    };
  }

  if (sanitized.length > 100) {
    return {
      isValid: false,
      text: null,
      error: 'Search query must not exceed 100 characters',
    };
  }

  // Remove special regex characters that could cause issues
  sanitized = sanitized.replace(/[.*+?^${}()|[\]\\]/g, ' ');

  // Remove multiple spaces
  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  return {
    isValid: true,
    text: sanitized,
    error: null,
  };
}

// ============================================================================
// EXPORT DEFAULT
// ============================================================================

export default {
  sanitizePrompt,
  sanitizeTags,
  sanitizeNotes,
  sanitizeSearchQuery,
};
