/**
 * TTS Controller - Handles TTS API requests
 * Orchestrates TTS generation with ChatGPT script analysis
 */

import ttsService from '../services/ttsService.js';
import { analyzeWithGrokAPI } from '../services/grokChatService.js';
import path from 'path';
import fs from 'fs';

export class TTSController {
  /**
   * Generate audio from text script
   * POST /api/tts/generate
   */
  static async generateAudio(req, res) {
    try {
      const { text, voiceName, language = 'VI' } = req.body;

      if (!text || !voiceName) {
        return res.status(400).json({
          error: 'Missing required fields: text, voiceName',
        });
      }

      // Validate text length
      if (!ttsService.validateTextLength(text)) {
        return res.status(400).json({
          error: 'Text is too long. Maximum 10000 characters allowed.',
        });
      }

      // Generate audio
      const audioBuffer = await ttsService.generateAudio(
        text,
        voiceName,
        language
      );

      // Send as audio stream
      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('Content-Disposition', 'attachment; filename="voiceover.wav"');
      res.send(audioBuffer);
    } catch (error) {
      console.error('TTS Generation Error:', error);
      res.status(500).json({
        error: 'Failed to generate audio',
        message: error.message,
      });
    }
  }

  /**
   * Generate and save audio file
   * POST /api/tts/generate-and-save
   */
  static async generateAndSaveAudio(req, res) {
    try {
      const { text, voiceName, language = 'VI', fileName } = req.body;

      if (!text || !voiceName) {
        return res.status(400).json({
          error: 'Missing required fields: text, voiceName',
        });
      }

      const outputFileName = fileName || `voiceover_${Date.now()}.wav`;
      const outputPath = path.join(
        process.cwd(),
        'backend',
        'media',
        'voiceovers',
        outputFileName
      );

      // Generate and save audio
      const savedPath = await ttsService.generateAndSaveAudio(
        text,
        voiceName,
        outputPath,
        { language }
      );

      res.json({
        success: true,
        filePath: savedPath,
        fileName: path.basename(savedPath),
        url: `/api/tts/stream/${path.basename(savedPath)}`,
      });
    } catch (error) {
      console.error('TTS Save Error:', error);
      res.status(500).json({
        error: 'Failed to generate and save audio',
        message: error.message,
      });
    }
  }

  /**
   * Stream audio file
   * GET /api/tts/stream/:filename
   */
  static streamAudio(req, res) {
    try {
      const { filename } = req.params;
      const filePath = path.join(
        process.cwd(),
        'backend',
        'media',
        'voiceovers',
        filename
      );

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Audio file not found' });
      }

      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('Accept-Ranges', 'bytes');
      fs.createReadStream(filePath).pipe(res);
    } catch (error) {
      console.error('Stream Error:', error);
      res.status(500).json({ error: 'Failed to stream audio' });
    }
  }

  /**
   * Download audio file
   * GET /api/tts/download/:filename
   */
  static downloadAudio(req, res) {
    try {
      const { filename } = req.params;
      const filePath = path.join(
        process.cwd(),
        'backend',
        'media',
        'voiceovers',
        filename
      );

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Audio file not found' });
      }

      res.download(filePath, filename, (err) => {
        if (err) {
          console.error('Download error:', err.message);
        }
      });
    } catch (error) {
      console.error('Download Error:', error);
      res.status(500).json({ error: 'Failed to download audio' });
    }
  }

  /**
   * Analyze video and generate script using ChatGPT
   * POST /api/tts/analyze-and-script
   */
  static async analyzeVideoAndGenerateScript(req, res) {
    try {
      const {
        videoPath,
        platform, // 'tiktok-sales', 'facebook-voiceover', 'youtube-vietsub', 'instagram-stories'
        productImage,
        productName,
        productDescription,
      } = req.body;

      if (!videoPath || !platform) {
        return res.status(400).json({
          error: 'Missing required fields: videoPath, platform',
        });
      }

      // Check if video exists
      if (!fs.existsSync(videoPath)) {
        return res.status(400).json({
          error: 'Video file not found',
        });
      }

      // Build ChatGPT prompt
      let prompt = this.buildScriptPrompt(
        platform,
        productName,
        productDescription
      );

      // Add product context if image provided
      let base64Image = null;
      if (productImage && fs.existsSync(productImage)) {
        const imageBuffer = fs.readFileSync(productImage);
        base64Image = imageBuffer.toString('base64');
      }

      // Build enhanced prompt with context
      const enhancedPrompt = base64Image 
        ? `${prompt}\n\n[Product Image provided for context - analyze the product and incorporate it into the script]`
        : prompt;

      // Analyze with Grok/ChatGPT
      const analysis = await analyzeWithGrokAPI(
        productImage || videoPath,
        enhancedPrompt
      );

      res.json({
        success: true,
        script: analysis,
        analysis: analysis,
        duration: ttsService.estimateAudioDuration(analysis),
      });
    } catch (error) {
      console.error('Script Generation Error:', error);
      res.status(500).json({
        error: 'Failed to generate script',
        message: error.message,
      });
    }
  }

  /**
   * Estimate audio duration from text
   * POST /api/tts/estimate-duration
   */
  static estimateDuration(req, res) {
    try {
      const { text } = req.body;

      if (!text) {
        return res.status(400).json({ error: 'Text is required' });
      }

      const duration = ttsService.estimateAudioDuration(text);

      res.json({
        success: true,
        duration,
        text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      });
    } catch (error) {
      console.error('Duration Estimation Error:', error);
      res.status(500).json({
        error: 'Failed to estimate duration',
        message: error.message,
      });
    }
  }

  /**
   * Build ChatGPT prompt based on platform
   * @private
   */
  static buildScriptPrompt(platform, productName, productDescription) {
    const platformPrompts = {
      'tiktok-sales': `Analyze the video and create a TikTok sales voiceover script for: ${productName || 'a fashion product'}.
${productDescription ? `\nProduct details: ${productDescription}` : ''}

Requirements:
- Very engaging and energetic tone
- Duration: 15-30 seconds when read naturally
- Include product benefits concisely
- Add strong call-to-action at the end
- Use trend-relevant language
- Appeal to young audience (18-35 years old)
- Match the video content and pacing

Format: Provide ONLY the script text, no additional commentary.`,

      'facebook-voiceover': `Create a professional Facebook Reels voiceover script for: ${productName || 'a fashion product'}.
${productDescription ? `\nProduct details: ${productDescription}` : ''}

Requirements:
- Professional but warm storytelling tone
- Duration: 20-40 seconds when read naturally
- Create narrative around product features and lifestyle
- Build emotional connection with audience
- Include product transition moments
- Address common customer concerns naturally
- First-person or conversational POV

Format: Provide ONLY the script text, no additional commentary.`,

      'youtube-vietsub': `Create a YouTube Short voiceover script (with Vietnamese subtitles in mind) for: ${productName || 'a fashion product'}.
${productDescription ? `\nProduct details: ${productDescription}` : ''}

Requirements:
- Clear pronunciation and pacing for subtitle synchronization
- Duration: 30-60 seconds when read naturally
- Detailed product information and benefits
- Include time for product showcase visuals
- Structured with clear sections (intro, benefits, CTA)
- Make it easy to follow along with visuals
- Educational and informative tone

Format: Provide ONLY the script text, no additional commentary.`,

      'instagram-stories': `Create an Instagram Stories voiceover script for: ${productName || 'a fashion product'}.
${productDescription ? `\nProduct details: ${productDescription}` : ''}

Requirements:
- Conversational, friend-to-friend tone
- Duration: 10-20 seconds when read naturally
- Create FOMO (fear of missing out)
- Highlight unique selling points
- Include limited availability messaging if applicable
- Use trendy language and casual phrasing
- Direct and punchy

Format: Provide ONLY the script text, no additional commentary.`,
    };

    return platformPrompts[platform] || platformPrompts['tiktok-sales'];
  }
}

export default TTSController;
