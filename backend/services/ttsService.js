/**
 * TTS Service - Google Gemini Text-to-Speech Integration
 * Handles audio generation using Google's Gemini TTS API
 */

import { GoogleGenAI } from '@google/genai';
import mime from 'mime';
import fs from 'fs';
import path from 'path';

class TTSService {
  constructor() {
    this.aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
    this.model = 'gemini-2.5-pro-preview-tts';
  }

  /**
   * Generate TTS audio from text
   * @param {string} text - Text to convert to speech
   * @param {string} voiceName - Voice name (e.g., 'Puck', 'Aoede')
   * @param {string} language - Language code (EN, VI)
   * @param {Object} options - Additional TTS options
   * @returns {Promise<Buffer>} Audio buffer
   */
  async generateAudio(text, voiceName, language = 'VI', options = {}) {
    try {
      if (!text || text.trim().length === 0) {
        throw new Error('Text cannot be empty');
      }

      const config = {
        temperature: options.temperature || 1.1,
        responseModalities: ['audio'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voiceName || 'Puck',
            },
          },
        },
      };

      const contents = [
        {
          role: 'user',
          parts: [
            {
              text: text,
            },
          ],
        },
      ];

      const response = await this.aiClient.models.generateContentStream({
        model: this.model,
        config,
        contents,
      });

      // Collect audio chunks
      const audioChunks = [];
      let hasAudio = false;

      for await (const chunk of response) {
        if (
          chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData
        ) {
          const inlineData = chunk.candidates[0].content.parts[0].inlineData;
          const buffer = Buffer.from(inlineData.data || '', 'base64');
          audioChunks.push(buffer);
          hasAudio = true;
        }
      }

      if (!hasAudio) {
        throw new Error('No audio data received from Gemini API');
      }

      return Buffer.concat(audioChunks);
    } catch (error) {
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
