/**
 * TTS Service - Google Gemini Text-to-Speech Integration
 * Handles audio generation using Google's Gemini TTS API
 * ENHANCED: Uses key rotation for multiple GEMINI_API_KEY_1, 2, 3, 4
 * 
 * Model: gemini-2.5-flash-preview-tts (as per official Google Docs)
 * Reference: https://ai.google.dev/gemini-api/docs/speech-generation
 * 
 * NOTE: Uses REST API instead of SDK due to SDK bug with response modalities
 */

import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { getKeyManager } from '../utils/keyManager.js';

class TTSService {
  constructor() {
    // Use gemini-2.5-flash-preview-tts as recommended in official docs
    this.model = 'gemini-2.5-flash-preview-tts';
    this.keyManager = getKeyManager('GEMINI');
  }

  /**
   * Get next available GEMINI API key with rotation
   */
  getNextKey() {
    const keyObj = this.keyManager.getNextKey('GEMINI');
    return keyObj.key;
  }

  /**
   * Generate TTS audio from text with automatic retry on rate limit
   * Uses official Google Gemini TTS API via REST:
   * https://ai.google.dev/gemini-api/docs/speech-generation
   * 
   * @param {string} text - Text to convert to speech
   * @param {string} voiceName - Voice name (must be lowercase: puck, aoede, kore, etc.)
   * @param {string} language - Language code (auto-detected by API)
   * @param {Object} options - Additional TTS options
   * @param {number} retryCount - Internal retry counter
   * @returns {Promise<Buffer>} Audio buffer (PCM format from Gemini)
   */
  async generateAudio(text, voiceName, language = 'VI', options = {}, retryCount = 0) {
    try {
      if (!text || text.trim().length === 0) {
        throw new Error('Text cannot be empty');
      }

      // Get next available API key with rotation
      const apiKey = this.getNextKey();
      const model = this.model;
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      // Voice names must be lowercase
      const voiceNameLower = (voiceName || 'puck').toLowerCase();

      // Build request payload according to REST API spec
      const payload = {
        contents: [
          {
            parts: [
              {
                text: text,
              },
            ],
          },
        ],
        generation_config: {
          response_modalities: ['AUDIO'],
          speech_config: {
            voice_config: {
              prebuilt_voice_config: {
                voice_name: voiceNameLower,
              },
            },
          },
        },
      };

      console.log(`🔍 DEBUG: Using model: ${model}`);
      console.log(`🔍 DEBUG: Using voice: ${voiceNameLower}`);
      console.log(`🔍 DEBUG: Endpoint: ${endpoint.split('?')[0]}...`);

      // Call REST API
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw responseData.error || new Error('Unknown API error');
      }

      // Extract audio data from response
      const audioData = responseData.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

      if (!audioData) {
        throw new Error('No audio data received from Gemini TTS API');
      }

      // Convert base64 to buffer
      const audioBuffer = Buffer.from(audioData, 'base64');

      // Mark key as successful on success
      this.keyManager.markKeySuccess('GEMINI', apiKey);

      return audioBuffer;
    } catch (error) {
      // Check if this is a rate limit error (429 or quota exceeded)
      const isRateLimit = error.status === 429 || 
                          error.message?.includes('RESOURCE_EXHAUSTED') || 
                          error.message?.includes('quota') ||
                          error.message?.includes('429');
      
      if (isRateLimit && retryCount < 3) {
        console.warn(`⏳ Rate limited, marking current key and trying next available key...`);
        
        // Try next key
        if (this.keyManager.hasAvailableKeys('GEMINI')) {
          console.log(`🔄 Retrying with next GEMINI key (attempt ${retryCount + 1}/3)...`);
          return this.generateAudio(text, voiceName, language, options, retryCount + 1);
        } else {
          throw new Error('All GEMINI API keys are rate limited. Please try again later.');
        }
      }
      
      console.error('TTS Generation Error:', error.message);
      throw new Error(`Failed to generate audio: ${error.message}`);
    }
  }

  /**
   * Generate and save TTS audio file
   * @param {string} text - Text to convert to speech
   * @param {string} voiceName - Voice name
   * @param {string} outputPath - Path to save audio file
   * @param {Object} options - Additional options
   * @returns {Promise<string>} Path to saved file
   */
  async generateAndSaveAudio(text, voiceName, outputPath, options = {}) {
    try {
      const audioBuffer = await this.generateAudio(text, voiceName, options.language, options);
      
      // Ensure directory exists
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Save file
      fs.writeFileSync(outputPath, audioBuffer);
      console.log(`Audio saved to: ${outputPath}`);
      
      return outputPath;
    } catch (error) {
      console.error('Error saving audio file:', error.message);
      throw error;
    }
  }

  /**
   * Convert audio buffer to different format if needed
   * @param {Buffer} audioBuffer - Audio buffer
   * @param {string} targetFormat - Target format (wav, mp3, ogg)
   * @returns {Promise<Buffer>} Converted audio buffer
   */
  async convertAudioFormat(audioBuffer, targetFormat) {
    // For now, return as-is. In production, use ffmpeg to convert
    // This is a placeholder for future enhancement
    return audioBuffer;
  }

  /**
   * Get estimated duration of audio text
   * Average speaking rate: ~150 words per minute
   * @param {string} text - Text to estimate duration for
   * @returns {number} Estimated duration in seconds
   */
  estimateAudioDuration(text) {
    const wordCount = text.trim().split(/\s+/).length;
    const minutes = wordCount / 150;
    return Math.ceil(minutes * 60);
  }

  /**
   * Validate text length
   * Gemini TTS has limits on text length per request
   * @param {string} text - Text to validate
   * @param {number} maxChars - Maximum characters (default: 10000)
   * @returns {boolean} True if valid
   */
  validateTextLength(text, maxChars = 10000) {
    return text.length <= maxChars;
  }

  /**
   * Split long text into chunks for processing
   * @param {string} text - Text to split
   * @param {number} maxChars - Maximum characters per chunk
   * @returns {Array<string>} Array of text chunks
   */
  splitTextIntoChunks(text, maxChars = 5000) {
    const chunks = [];
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    
    let currentChunk = '';
    
    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > maxChars) {
        if (currentChunk) chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += sentence;
      }
    }
    
    if (currentChunk) chunks.push(currentChunk.trim());
    
    return chunks;
  }
}

export default new TTSService();
