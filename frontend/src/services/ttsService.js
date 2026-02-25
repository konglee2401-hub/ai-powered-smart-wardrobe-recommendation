/**
 * TTS Service - Frontend API wrapper for TTS endpoints
 */

import axiosInstance from './axios';

export const ttsAPI = {
  /**
   * Generate audio from text (stream response)
   */
  generateAudio: async (text, voiceName, language = 'VI') => {
    try {
      const response = await axiosInstance.post(
        '/api/tts/generate',
        { text, voiceName, language },
        {
          responseType: 'arraybuffer',
        }
      );
      return response.data; // Returns audio buffer
    } catch (error) {
      throw new Error(`Failed to generate audio: ${error.message}`);
    }
  },

  /**
   * Generate and save audio file on backend
   */
  generateAndSaveAudio: async (text, voiceName, fileName = null, language = 'VI') => {
    try {
      const response = await axiosInstance.post('/api/tts/generate-and-save', {
        text,
        voiceName,
        language,
        fileName,
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to generate and save audio: ${error.message}`);
    }
  },

  /**
   * Stream audio file
   */
  streamAudio: (filename) => {
    return `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/tts/stream/${filename}`;
  },

  /**
   * Download audio file
   */
  downloadAudio: async (filename) => {
    try {
      const response = await axiosInstance.get(
        `/api/tts/download/${filename}`,
        {
          responseType: 'arraybuffer',
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to download audio: ${error.message}`);
    }
  },

  /**
   * Analyze video and generate script using ChatGPT
   */
  analyzeAndGenerateScript: async (params) => {
    try {
      const response = await axiosInstance.post('/api/tts/analyze-and-script', params);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to generate script: ${error.message}`);
    }
  },

  /**
   * Estimate audio duration from text
   */
  estimateDuration: async (text) => {
    try {
      const response = await axiosInstance.post('/api/tts/estimate-duration', { text });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to estimate duration: ${error.message}`);
    }
  },
};

export default ttsAPI;
