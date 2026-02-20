/**
 * Session History API Service
 * Handles all API calls for session management
 */

import { API_BASE_URL } from '../config/api.js';

const SESSION_ENDPOINT = `${API_BASE_URL}/sessions`;

export class SessionHistoryService {
  /**
   * Create new session
   */
  static async createSession(sessionData) {
    try {
      const response = await fetch(`${SESSION_ENDPOINT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sessionData)
      });

      if (!response.ok) {
        // Session API is optional - silently fail (works offline)
        return null;
      }

      return await response.json();
    } catch (error) {
      // Session API is optional - silently continue offline
      return null;
    }
  }

  /**
   * Update session
   */
  static async updateSession(sessionId, updates) {
    try {
      const response = await fetch(`${SESSION_ENDPOINT}/${sessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        // Session API is optional - silently fail (works offline)
        return null;
      }

      return await response.json();
    } catch (error) {
      // Session API is optional - silently continue offline
      return null;
    }
  }

  /**
   * Get session by ID
   */
  static async getSession(sessionId) {
    try {
      const response = await fetch(`${SESSION_ENDPOINT}/${sessionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch session: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      // Error handled by caller
      throw error;
    }
  }

  /**
   * Get all sessions for user
   */
  static async getUserSessions(userId, options = {}) {
    try {
      const params = new URLSearchParams();
      if (options.limit) params.append('limit', options.limit);
      if (options.offset) params.append('offset', options.offset);
      if (options.useCase) params.append('useCase', options.useCase);
      if (options.status) params.append('status', options.status);

      const response = await fetch(`${SESSION_ENDPOINT}/user/${userId}?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch user sessions: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Save analysis with Grok conversation
   */
  static async saveAnalysisWithGrok(sessionId, analysisData) {
    try {
      const response = await fetch(`${SESSION_ENDPOINT}/${sessionId}/analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(analysisData)
      });

      if (!response.ok) {
        throw new Error(`Failed to save analysis: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      // Error handled by caller
      throw error;
    }
  }

  /**
   * Save prompt variations
   */
  static async savePromptVariations(sessionId, variations) {
    try {
      const response = await fetch(`${SESSION_ENDPOINT}/${sessionId}/prompt-variations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(variations)
      });

      if (!response.ok) {
        throw new Error(`Failed to save prompt variations: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Save prompt enhancement (via Grok or AI)
   */
  static async savePromptEnhancement(sessionId, enhancementData) {
    try {
      const response = await fetch(`${SESSION_ENDPOINT}/${sessionId}/prompt-enhancement`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(enhancementData)
      });

      if (!response.ok) {
        throw new Error(`Failed to save prompt enhancement: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      // Error handled by caller
      throw error;
    }
  }

  /**
   * Save generation results
   */
  static async saveGenerationResults(sessionId, generationData) {
    try {
      const response = await fetch(`${SESSION_ENDPOINT}/${sessionId}/generation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(generationData)
      });

      if (!response.ok) {
        throw new Error(`Failed to save generation results: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get session statistics
   */
  static async getSessionStatistics(sessionId) {
    try {
      const response = await fetch(`${SESSION_ENDPOINT}/${sessionId}/statistics`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch statistics: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete session (archive)
   */
  static async deleteSession(sessionId) {
    try {
      const response = await fetch(`${SESSION_ENDPOINT}/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to delete session: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Export session as JSON
   */
  static async exportSession(sessionId) {
    try {
      const response = await fetch(`${SESSION_ENDPOINT}/${sessionId}/export`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to export session: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }
}

export default SessionHistoryService;
