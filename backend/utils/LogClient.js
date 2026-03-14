/**
 * LogClient
 * Client for sending logs to the server for real-time streaming
 * Used by background scripts (login.js, etc) to post logs to LogStreamingService
 */

import axios from 'axios';

class LogClient {
  constructor(sessionId, serverUrl = 'http://localhost:5000') {
    this.sessionId = sessionId;
    this.serverUrl = serverUrl;
    this.enabled = !!sessionId && !!serverUrl;

    if (this.enabled) {
      console.log(`📨 LogClient initialized for session: ${this.sessionId}`);
    }
  }

  async log(message, level = 'info') {
    if (!this.enabled) {
      // If logging not configured, just log to console
      const prefix = {
        'info': '📋',
        'warn': '⚠️ ',
        'error': '❌',
        'success': '✅'
      }[level] || '📝';
      console.log(`${prefix} ${message}`);
      return;
    }

    try {
      const response = await axios.post(
        `${this.serverUrl}/api/auth-setup/logs/${this.sessionId}`,
        { message, level },
        { timeout: 5000 }
      );

      if (!response.data?.success) {
        console.warn(`⚠️  LogClient: Server returned error for log message: ${message.substring(0, 50)}...`);
      }
    } catch (error) {
      // Fail silently - don't interrupt the main process
      console.warn(`⚠️  LogClient: Failed to send log to ${this.serverUrl} - ${error.message}`);
    }
  }

  /**
   * Send an info level log
   */
  async info(message) {
    return this.log(message, 'info');
  }

  /**
   * Send a warning level log
   */
  async warn(message) {
    return this.log(message, 'warn');
  }

  /**
   * Send an error level log
   */
  async error(message) {
    return this.log(message, 'error');
  }

  /**
   * Send a success level log
   */
  async success(message) {
    return this.log(message, 'success');
  }

  /**
   * End the logging session on the server
   */
  async endSession(status = 'completed') {
    if (!this.enabled) return;

    try {
      await axios.post(
        `${this.serverUrl}/api/auth-setup/logs/${this.sessionId}/end`,
        { status },
        { timeout: 5000 }
      );
    } catch (error) {
      console.warn(`⚠️  LogClient: Failed to end session - ${error.message}`);
    }
  }
}

export default LogClient;
