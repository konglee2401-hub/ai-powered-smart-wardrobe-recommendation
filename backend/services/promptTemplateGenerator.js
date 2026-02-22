/**
 * ChatGPT Prompt Template Generator
 * Generates segment-specific prompts for multi-video workflows using ChatGPT
 */

import Anthropic from '@anthropic-ai/sdk';
import { getUseCase, getSegmentPrompt } from '../constants/contentUseCases.js';

class PromptTemplateGenerator {
  constructor() {
    this.client = new Anthropic();
    this.model = 'claude-3-5-sonnet-20241022';
  }

  /**
   * Generate segment-specific prompts using ChatGPT
   * @param {string} useCase - The use case (e.g., 'change-clothes')
   * @param {Object} analysis - Analysis data from previous step
   * @param {Object} context - Additional context (duration, character description, etc.)
   * @returns {Promise<Object>} - { success, prompts: [{ index, prompt }] }
   */
  async generateSegmentPrompts(useCase, analysis, context = {}) {
    try {
      const useCaseConfig = getUseCase(useCase);
      
      if (!useCaseConfig) {
        throw new Error(`Unknown use case: ${useCase}`);
      }

      console.log(`\n💬 CHATGPT PROMPT GENERATION`);
      console.log('='.repeat(60));
      console.log(`Use Case: ${useCaseConfig.name}`);
      console.log(`Videos: ${useCaseConfig.videoCount} segments`);
      console.log(`Frame Chaining: ${useCaseConfig.frameChaining ? 'Yes' : 'No'}\n`);

      // Build the analysis context
      const analysisContext = this._buildAnalysisContext(analysis, context);
      const duration = context.duration || 20;
      const segmentDuration = Math.ceil(duration / useCaseConfig.videoCount);

      // Build the prompt for ChatGPT
      const systemPrompt = this._buildSystemPrompt(useCaseConfig);
      const userPrompt = this._buildUserPrompt(
        useCase,
        useCaseConfig,
        analysisContext,
        segmentDuration
      );

      console.log(`🤖 Calling Claude API for prompt generation...\n`);

      let prompts = [];
      let usedFallback = false;
      let messageUsage = null;

      try {
        // Call Claude
        const message = await this.client.messages.create({
          model: this.model,
          max_tokens: 2000,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: userPrompt
            }
          ]
        });

        const responseText = message.content[0].type === 'text' 
          ? message.content[0].text 
          : '';

        // Parse the response
        prompts = this._parsePromptResponse(responseText, useCaseConfig.videoCount);
        messageUsage = message.usage;
      } catch (apiError) {
        console.warn(`⚠️  Claude API failed: ${apiError.message}`);
        console.log(`🔄 Using fallback prompts...\n`);
        
        // Use fallback prompts if API fails
        prompts = this._getFallbackPrompts(useCase, useCaseConfig.videoCount);
        usedFallback = true;
      }

      console.log(`✅ Generated ${prompts.length} segment prompts:`);
      prompts.forEach(p => {
        console.log(`   📝 Segment ${p.index}: ${p.prompt.substring(0, 60)}...`);
      });
      console.log();

      const metadata = {
        generatedAt: new Date().toISOString(),
        model: this.model
      };

      // Only add token count if Claude was used
      if (!usedFallback && messageUsage) {
        metadata.tokensUsed = messageUsage.input_tokens + messageUsage.output_tokens;
      } else if (usedFallback) {
        metadata.source = 'fallback';
      }

      return {
        success: true,
        useCase: useCase,
        videoCount: useCaseConfig.videoCount,
        segmentDuration: segmentDuration,
        prompts: prompts,
        frameChaining: useCaseConfig.frameChaining,
        metadata: metadata
      };

    } catch (error) {
      console.error(`❌ Prompt generation failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        prompts: []
      };
    }
  }

  /**
   * Build system prompt for Claude
   * @private
   */
  _buildSystemPrompt(useCaseConfig) {
    return `You are an expert video production prompt writer specializing in AI video generation.
Your task is to create highly detailed, professional video prompts for multi-segment video sequences.

Each prompt should:
1. Be specific and actionable for AI video generation
2. Include visual details, mood, lighting, camera angles
3. Ensure smooth transitions between segments if frame-chaining is enabled
4. Be optimized for Google Labs Flow or similar AI video generators
5. Include exact duration in seconds
6. Be between 80-150 words per segment

For frame-chaining videos (where one video's end frame is used as input for the next):
- Ensure the character/subject position is consistent
- Describe natural continuation of movement/action
- Maintain visual coherence across segments

Generate professional, high-quality video production prompts.`;
  }

  /**
   * Build user prompt for Claude
   * @private
   */
  _buildUserPrompt(useCase, useCaseConfig, analysisContext, segmentDuration) {
    const segmentList = useCaseConfig.prompts.map(p => 
      `${p.index}. ${p.role}: ${p.guidance}`
    ).join('\n');

    return `Generate video prompts for a "${useCaseConfig.name}" use case with ${useCaseConfig.videoCount} segments.

ANALYSIS CONTEXT:
${analysisContext}

SEGMENT REQUIREMENTS:
${segmentList}

Each segment should be approximately ${segmentDuration} seconds long.
Frame chaining: ${useCaseConfig.frameChaining ? 'YES - ensure visual continuity' : 'NO - independent segments'}

For each segment, provide a detailed, production-ready prompt that:
- Describes the visual content in vivid detail
- Specifies camera movement and angles
- Includes mood, lighting, and atmosphere
- Guarantees professional quality output
- Exactly matches the segment's role and guidance

Format your response EXACTLY as:
SEGMENT 1:
[Your detailed prompt here]

SEGMENT 2:
[Your detailed prompt here]

etc.`;
  }

  /**
   * Build context from analysis data
   * @private
   */
  _buildAnalysisContext(analysis, context) {
    let context_text = '';

    // Add character description
    if (analysis.character) {
      context_text += `CHARACTER:\n${JSON.stringify(analysis.character, null, 2)}\n\n`;
    }

    // Add clothing/product details
    if (analysis.product) {
      context_text += `PRODUCT/CLOTHING:\n${JSON.stringify(analysis.product, null, 2)}\n\n`;
    }

    // Add recommendations
    if (analysis.recommendations) {
      context_text += `STYLE RECOMMENDATIONS:\n`;
      context_text += `- Scene: ${analysis.recommendations.scene || 'professional setting'}\n`;
      context_text += `- Lighting: ${analysis.recommendations.lighting || 'studio professional'}\n`;
      context_text += `- Mood: ${analysis.recommendations.mood || 'professional'}\n`;
      context_text += `- Style: ${analysis.recommendations.style || 'contemporary'}\n`;
      context_text += `- Camera Angle: ${analysis.recommendations.cameraAngle || 'dynamic angles'}\n\n`;
    }

    // Add additional context
    if (context.characterDescription) {
      context_text += `ADDITIONAL CHARACTER NOTES:\n${context.characterDescription}\n\n`;
    }

    if (context.productDescription) {
      context_text += `ADDITIONAL PRODUCT NOTES:\n${context.productDescription}\n\n`;
    }

    return context_text || 'Standard professional video production context.';
  }

  /**
   * Parse Claude response into structured prompts
   * @private
   */
  _parsePromptResponse(responseText, expectedSegments) {
    const prompts = [];
    
    // Try to split by "SEGMENT X:" pattern
    const segmentMatches = responseText.match(/SEGMENT\s+(\d+):\s*([\s\S]*?)(?=SEGMENT\s+\d+:|$)/gi);

    if (segmentMatches && segmentMatches.length > 0) {
      segmentMatches.forEach((match, idx) => {
        const prompt = match.replace(/SEGMENT\s+\d+:/i, '').trim();
        if (prompt) {
          prompts.push({
            index: idx + 1,
            prompt: prompt,
            source: 'claude'
          });
        }
      });
    } else {
      // Fallback: split by line breaks and create rough segments
      const lines = responseText.split('\n').filter(l => l.trim());
      const segmentSize = Math.ceil(lines.length / expectedSegments);

      for (let i = 0; i < expectedSegments && i * segmentSize < lines.length; i++) {
        const segmentLines = lines.slice(
          i * segmentSize,
          Math.min((i + 1) * segmentSize, lines.length)
        );
        
        const prompt = segmentLines.join(' ').trim();
        if (prompt) {
          prompts.push({
            index: i + 1,
            prompt: prompt,
            source: 'claude'
          });
        }
      }
    }

    // Ensure we have the right number of prompts
    while (prompts.length < expectedSegments) {
      prompts.push({
        index: prompts.length + 1,
        prompt: 'Professional video segment. High quality production detail.',
        source: 'fallback'
      });
    }

    // Trim to expected segments
    return prompts.slice(0, expectedSegments);
  }

  /**
   * Get fallback prompts when Claude API is unavailable
   * @param {string} useCase - The use case identifier
   * @param {number} count - Number of prompts needed
   * @returns {Array} - Array of fallback prompts
   */
  _getFallbackPrompts(useCase, count) {
    const fallbackLibrary = {
      'change-clothes': [
        'A fashionable person in business casual outfit, confident pose, modern minimalist interior with natural window lighting, professional presentation suitable for product showcase',
        'The same person transformed in casual weekend wear, relaxed posture, same interior setting, showing style versatility and comfort with the new outfit'
      ],
      'product-showcase': [
        'Close-up of the premium casual outfit highlighting fabric texture, stitching details, and color quality with professional product photography and soft studio lighting',
        'Full-body model wearing the outfit displaying the complete casual look from flattering angles with contemporary fashion photography style and proper lighting',
        'Lifestyle shot of the outfit in real-world context showing comfort and practicality with warm natural lighting and relatable environment'
      ],
      'styling-guide': [
        'Complete styled outfit with thoughtfully coordinated accessories on a confident model, showing the full look composition with proper proportions and balance',
        'Close-up detail shot emphasizing the top portion of the outfit with professional lighting, highlighting fabric quality, color coordination, and accessory details',
        'Styled shot of the bottom portion with footwear clearly visible, showing how it balances with the top and completing the overall aesthetic properly'
      ],
      'product-intro': [
        'Hero shot of the casual outfit with professional soft lighting, showcasing the best angles, texture details, and color palette of the product',
        'Model wearing the outfit in a confident relatable pose showing how it fits naturally on the body and how it moves with the wearer'
      ],
      'style-transform': [
        'Before shot showing the person in basic casual wear with neutral expression and room temperature lighting to establish the starting point',
        'After shot showing the same person transformed in the new premium casual outfit with confident expression and professional product lighting'
      ]
    };

    const prompts = fallbackLibrary[useCase] || [
      'Professional product video showcase with high quality cinematography and proper lighting setup',
      'Detailed close-up shots highlighting product features with professional studio lighting'
    ];

    return prompts.slice(0, count).map((prompt, idx) => ({
      index: idx + 1,
      prompt: prompt,
      source: 'fallback'
    }));
  }

  /**
   * Validate generated prompts
   * @returns {Object} - { valid: boolean, issues: [] }
   */
  validatePrompts(prompts, expectedCount) {
    const issues = [];

    if (!Array.isArray(prompts)) {
      issues.push('Prompts is not an array');
      return { valid: false, issues };
    }

    if (prompts.length !== expectedCount) {
      issues.push(`Expected ${expectedCount} prompts, got ${prompts.length}`);
    }

    prompts.forEach((p, idx) => {
      if (!p.index) issues.push(`Prompt ${idx} missing index`);
      if (!p.prompt || p.prompt.trim().length < 20) {
        issues.push(`Prompt ${idx} too short or missing`);
      }
      if (p.prompt.length > 500) {
        issues.push(`Prompt ${idx} too long (>500 chars)`);
      }
    });

    return {
      valid: issues.length === 0,
      issues,
      count: prompts.length
    };
  }
}

export default PromptTemplateGenerator;
