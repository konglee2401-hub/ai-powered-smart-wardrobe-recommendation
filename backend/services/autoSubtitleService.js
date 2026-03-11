/**
 * Auto-Subtitle Generation Service
 * Generates optimized captions for affiliate videos with keyword emphasis
 * Supports multiple formats: SRT, VTT, YouTube format
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import subtitleDictionaryService from './subtitleDictionaryService.js';

class AutoSubtitleService {
  constructor() {
    this.disabled = !process.env.ANTHROPIC_API_KEY;
    this.client = this.disabled ? null : new Anthropic();
    this.model = 'claude-3-5-sonnet-20241022';
  }

  /**
   * Generate subtitles from video transcript or product description
   * Optimized for affiliate conversion
   */
  async generateAffiliateSubtitles(videoContext, options = {}) {
    try {
      if (this.disabled) {
        const fallback = this._generateFallbackSubtitles(videoContext, options);
        return {
          success: true,
          subtitles: fallback,
          format: 'json',
          duration: options.duration || 15,
          platform: options.platform || 'youtube-shorts',
          metadata: {
            generatedAt: new Date().toISOString(),
            provider: 'fallback',
            reason: 'anthropic-disabled',
          },
        };
      }

      const {
        duration = 15,
        affiliateKeywords = [],
        platform = 'youtube-shorts', // youtube-shorts, tiktok, instagram-reels
        style = 'engaging', // engaging, professional, casual
        templateName = 'reaction',
        theme = 'general'
      } = options;

      const prompt = this._buildSubtitlePrompt(
        videoContext,
        duration,
        affiliateKeywords,
        platform,
        style
      );

      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 1500,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const responseText = message.content[0]?.text || '';
      const subtitles = this._parseSubtitles(responseText, duration);

      console.log(`✅ Generated ${subtitles.length} subtitle segments`);
      
      return {
        success: true,
        subtitles,
        format: 'json',
        duration,
        platform,
        metadata: {
          generatedAt: new Date().toISOString(),
          affiliateTermsUsed: subtitles.filter(s => s.isAffiliateTerm).length,
          averageSegmentLength: (subtitles.reduce((sum, s) => sum + s.text.length, 0) / subtitles.length).toFixed(0)
        }
      };
    } catch (error) {
      console.error(`❌ Subtitle generation failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        subtitles: this._generateFallbackSubtitles(videoContext, options)
      };
    }
  }

  /**
   * Convert subtitles to SRT format (for video editors)
   */
  convertToSRT(subtitles) {
    try {
      let srtContent = '';
      
      subtitles.forEach((sub, idx) => {
        const startTime = this._formatTime(sub.startTime);
        const endTime = this._formatTime(sub.endTime);
        
        srtContent += `${idx + 1}\n`;
        srtContent += `${startTime} --> ${endTime}\n`;
        srtContent += `${sub.text}\n\n`;
      });

      return {
        success: true,
        format: 'srt',
        content: srtContent
      };
    } catch (error) {
      console.error(`❌ SRT conversion failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Convert subtitles to VTT format (for web video players)
   */
  convertToVTT(subtitles) {
    try {
      let vttContent = 'WEBVTT\n\n';
      
      subtitles.forEach(sub => {
        const startTime = this._formatTime(sub.startTime, true);
        const endTime = this._formatTime(sub.endTime, true);
        
        vttContent += `${startTime} --> ${endTime}\n`;
        vttContent += `${sub.text}\n\n`;
      });

      return {
        success: true,
        format: 'vtt',
        content: vttContent
      };
    } catch (error) {
      console.error(`❌ VTT conversion failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate YouTube-optimized subtitle format with styling
   */
  generateYouTubeFormat(subtitles) {
    try {
      const youtubeFormat = subtitles.map(sub => ({
        text: sub.text,
        startMs: Math.floor(sub.startTime * 1000),
        endMs: Math.floor(sub.endTime * 1000),
        bold: sub.isAffiliateTerm || false,
        italic: sub.isCallout || false,
        color: sub.isAffiliateTerm ? '#FFFF00' : '#FFFFFF' // Yellow for CTA
      }));

      return {
        success: true,
        format: 'youtube',
        data: youtubeFormat
      };
    } catch (error) {
      console.error(`❌ YouTube format conversion failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Add speaker identification and styling
   */
  addSpeakerInfo(subtitles, speakers = ['Voiceover']) {
    return subtitles.map((sub, idx) => ({
      ...sub,
      speaker: speakers[idx % speakers.length],
      speakerId: idx % speakers.length
    }));
  }

  /**
   * Extract and highlight affiliate keywords
   */
  emphasizeAffiliateTerms(subtitles, keywords = []) {
    const affiliateTerms = [
      'CLICK LINK',
      'AFFILIATE LINK',
      'LIMITED OFFER',
      'EXCLUSIVE DEAL',
      'BEST PRICE',
      'GET DISCOUNT',
      'SHOP NOW',
      'LIMITED STOCK',
      'LINK IN BIO',
      ...keywords
    ];

    return subtitles.map(sub => {
      const hasAffiliateKeyword = affiliateTerms.some(term =>
        sub.text.toUpperCase().includes(term)
      );

      return {
        ...sub,
        isAffiliateTerm: hasAffiliateKeyword,
        style: hasAffiliateKeyword ? {
          fontSize: '120%',
          bold: true,
          color: '#FFFF00',
          backgroundColor: '#000000',
          animation: 'pulse' // Subtle pulse effect
        } : {
          fontSize: '100%',
          color: '#FFFFFF'
        }
      };
    });
  }

  /**
   * Generate captions with emojis for social media
   */
  generateSocialMediaCaptions(subtitles) {
    const emojiMap = {
      'CHECK': '👀',
      'BUY': '💳',
      'DEAL': '🔥',
      'DISCOUNT': '💰',
      'LIMITED': '⏰',
      'OFFER': '✨',
      'LINK': '🔗',
      'PRICE': '💵',
      'BEST': '⭐',
      'EXCLUSIVE': '🎯',
      'FREE': '🎁',
      'NEW': '🆕'
    };

    return subtitles.map(sub => {
      let captionWithEmoji = sub.text;
      
      Object.entries(emojiMap).forEach(([word, emoji]) => {
        const regex = new RegExp(word, 'gi');
        captionWithEmoji = captionWithEmoji.replace(regex, `${word} ${emoji}`);
      });

      return {
        ...sub,
        originalText: sub.text,
        textWithEmoji: captionWithEmoji,
        emojiCount: (captionWithEmoji.match(/[\p{Emoji}]/gu) || []).length
      };
    });
  }

  // ==================== PRIVATE METHODS ====================

  _buildSubtitlePrompt(videoContext, duration, keywords, platform, style) {
    return `Generate ${Math.ceil(duration / 3)} short, punchy subtitle segments for a ${duration}-second affiliate video.

Context:
${videoContext}

Affiliate Keywords to use: ${keywords.join(', ') || 'None'}

Platform: ${platform}
Style: ${style}

Requirements:
1. Each subtitle should be 2-8 words max for readability on ${platform}
2. Emphasize call-to-action phrases like "CLICK LINK", "GET DISCOUNT", "SHOP NOW"
3. Include 3-4 power words: "LIMITED", "EXCLUSIVE", "BEST", "FREE"
4. Make text scannable and attention-grabbing
5. Time segments evenly across ${duration} seconds
6. Maintain engagement from start to finish

Output format - one subtitle per line with time codes:
[0-3s]: Subtitle text
[3-6s]: Next subtitle
etc.

Generate compelling captions that maximize conversion for affiliate marketing.`;
  }

  _parseSubtitles(responseText, totalDuration) {
    const lines = responseText.split('\n').filter(l => l.trim());
    const subtitles = [];
    const segmentDuration = totalDuration / Math.max(3, Math.ceil(totalDuration / 3));

    lines.forEach((line, idx) => {
      // Parse [time]: text format
      const match = line.match(/\[(\d+)-(\d+)s\]:\s*(.+)/);
      
      if (match) {
        const startTime = parseInt(match[1]);
        const endTime = parseInt(match[2]);
        const text = match[3].trim();

        const affiliateTerms = [
          'CLICK', 'LINK', 'LIMITED', 'EXCLUSIVE', 'DEAL', 'DISCOUNT',
          'BEST', 'PRICE', 'GET', 'SHOP', 'FREE', 'OFFER', 'STOCK'
        ];

        const hasAffiliateKeyword = affiliateTerms.some(term =>
          text.toUpperCase().includes(term)
        );

        subtitles.push({
          index: idx + 1,
          startTime,
          endTime,
          text,
          duration: endTime - startTime,
          isAffiliateTerm: hasAffiliateKeyword,
          isCallout: text.includes('NOW') || text.includes('TODAY') || text.includes('LINK')
        });
      }
    });

    // Fallback: ensure we have segments
    if (subtitles.length === 0) {
      return this._generateFallbackSubtitles(responseText, { duration: totalDuration });
    }

    return subtitles;
  }

  _generateFallbackSubtitles(content, options = {}) {
    const { 
      duration = 15,
      templateName = 'reaction',
      theme = 'general'
    } = options;

    // Use intelligent subtitle dictionary instead of hardcoded marketing text
    let subtitles = subtitleDictionaryService.generateFallbackSubtitles(
      duration,
      templateName,
      theme
    );

    // SANITIZE: Remove phrases that don't fit this template
    const sanitizedSubtitles = subtitles.map(sub => ({
      ...sub,
      text: this._sanitizeSubtitleText(sub.text, templateName)
    })).filter(sub => sub.text.trim().length > 0);

    return sanitizedSubtitles.length > 0 ? sanitizedSubtitles : subtitles;
  }

  /**
   * Remove phrases that don't fit the template
   */
  _sanitizeSubtitleText(text, templateName) {
    // Reaction/Meme templates (humor) should NOT use marketing phrases
    if (['reaction', 'meme'].includes(templateName)) {
      const marketingPhrases = [
        'CHECK THIS OUT',
        'GET YOURS NOW',
        'LIMITED OFFER',
        'BUY NOW',
        'CLICK HERE',
        'MUST HAVE',
        'EXCLUSIVE DEAL',
        'SHOP NOW'
      ];
      
      let sanitized = text;
      for (const phrase of marketingPhrases) {
        const regex = new RegExp(`\\b${phrase}\\b`, 'gi');
        sanitized = sanitized.replace(regex, '');
      }
      return sanitized;
    }

    // Product/Marketing templates should NOT use humor phrases alone
    if (['marketing', 'highlight', 'highlight-pip'].includes(templateName)) {
      const humorPhrases = [
        'HILARIOUS', 'TOO FUNNY', 'CAN\'T STOP LAUGHING', 'MEME', 'RELATABLE'
      ];
      
      let sanitized = text;
      for (const phrase of humorPhrases) {
        const regex = new RegExp(`\\b${phrase}\\b`, 'gi');
        sanitized = sanitized.replace(regex, '');
      }
      return sanitized;
    }

    return text;
  }

  _formatTime(seconds = 0, useDot = false) {
    const safeSeconds = Math.max(0, Number(seconds) || 0);
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const secs = Math.floor(safeSeconds % 60);
    const ms = Math.floor((safeSeconds % 1) * 1000);

    const stamp = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
    return useDot ? stamp.replace(',', '.') : stamp;
  }
}

export default AutoSubtitleService;
