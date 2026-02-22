/**
 * Auto-Subtitle Generation Service
 * Generates optimized captions for affiliate videos with keyword emphasis
 * Supports multiple formats: SRT, VTT, YouTube format
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

class AutoSubtitleService {
  constructor() {
    this.client = new Anthropic();
    this.model = 'claude-3-5-sonnet-20241022';
  }

  /**
   * Generate subtitles from video transcript or product description
   * Optimized for affiliate conversion
   */
  async generateAffiliateSubtitles(videoContext, options = {}) {
    try {
      const {
        duration = 15,
        affiliateKeywords = [],
        platform = 'youtube-shorts', // youtube-shorts, tiktok, instagram-reels
        style = 'engaging' // engaging, professional, casual
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
        const startTime = this._formatTime(sub.startTime);
        const endTime = this._formatTime(sub.endTime);
        
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
    const { duration = 15 } = options;
    const segmentCount = Math.max(3, Math.ceil(duration / 5));
    const segmentDuration = duration / segmentCount;

    const fallbackTexts = [
      '👀 CHECK THIS OUT',
      '🔥 EXCLUSIVE DEAL',
      '💰 LIMITED TIME',
      '🎯 BEST PRICE',
      '💳 CLICK LINK',
      '✨ GET DISCOUNT',
      '🏆 TOP CHOICE',
      '⚡ ACT FAST'
    ];

    return Array.from({ length: segmentCount }).map((_, idx) => ({
      index: idx + 1,
      startTime: Math.floor(idx * segmentDuration),
      endTime: Math.floor((idx + 1) * segmentDuration),
      text: fallbackTexts[idx % fallbackTexts.length],
      duration: segmentDuration,
      isAffiliateTerm: true,
      isCallout: true
    }));
  }

  _formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
  }
}

export default AutoSubtitleService;
