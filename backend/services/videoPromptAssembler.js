// Assemble all analysis into final optimized prompts for various video models
import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI = null;
const getGenAI = () => {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY missing');
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
};

const parseJsonResponse = (text) => {
  let cleanJson = text.trim();
  cleanJson = cleanJson.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  const m = cleanJson.match(/\{[\s\S]*\}/);
  return JSON.parse(m ? m[0] : cleanJson);
};

export class VideoPromptAssembler {
  constructor() {
    this._model = null;
  }

  get model() {
    if (!this._model) {
      this._model = getGenAI().getGenerativeModel({ model: 'gemini-2.5-flash' });
    }
    return this._model;
  }

  /**
   * Assemble all analysis into final optimized prompt
   */
  async buildFinalPrompt(allAnalysisData, targetModel = 'runway') {
    try {
      const {
        characterAnalysis,
        referenceAnalysis,
        sceneAnalysis,
        motionDescription,
        cameraInstructions,
        lightingAtmosphere,
        consistencyRules
      } = allAnalysisData;

      const prompt = `
You are the world's best AI video generation prompt engineer.

Your task: Combine these detailed analyses into ONE PERFECT, OPTIMIZED prompt for ${targetModel} AI video generation.

INPUTS:
====================
CHARACTER ANALYSIS:
${JSON.stringify(characterAnalysis, null, 2)}

REFERENCE ANALYSIS:
${JSON.stringify(referenceAnalysis, null, 2)}

SCENE ANALYSIS:
${JSON.stringify(sceneAnalysis, null, 2)}

MOTION DESCRIPTION:
${JSON.stringify(motionDescription, null, 2)}

CAMERA INSTRUCTIONS:
${JSON.stringify(cameraInstructions, null, 2)}

LIGHTING & ATMOSPHERE:
${JSON.stringify(lightingAtmosphere, null, 2)}

CONSISTENCY RULES:
${JSON.stringify(consistencyRules, null, 2)}

TARGET MODEL: ${targetModel}
====================

TASK: Create the ULTIMATE video generation prompt.

Return ONLY valid JSON:

{
  "final_prompt": {
    "main_prompt": "Single comprehensive paragraph (250-350 words) that weaves together ALL elements into a vivid, specific, cinematic description. Structure: [Character description] + [Action/Motion] + [Camera work] + [Lighting] + [Environment] + [Atmosphere] + [Style]. Use professional film terminology. Be hyper-specific about colors, movements, timing, and visual details.",
    
    "negative_prompt": "Comprehensive list of things to avoid: artifacts, distortions, inconsistencies, morphing, bad physics, style shifts, quality issues, etc.",
    
    "technical_parameters": {
      "duration": "recommended seconds (3-10)",
      "aspect_ratio": "16:9 or 9:16 or 1:1",
      "motion_amount": "1-10 scale (how much movement)",
      "camera_motion": "1-10 scale (how much camera moves)",
      "style_strength": "1-10 scale (how stylized vs realistic)",
      "fps": "24 or 30 or 60",
      "resolution": "720p or 1080p or 4K"
    },
    
    "structured_breakdown": {
      "subject_description": "Character in 40-60 words",
      "action_description": "Motion in 40-60 words",
      "environment_description": "Setting in 30-50 words",
      "camera_description": "Camera work in 25-40 words",
      "lighting_description": "Lighting in 25-40 words",
      "style_description": "Visual style in 20-30 words"
    },
    
    "emphasis_keywords": [
      "10-15 critical visual keywords to emphasize"
    ],
    
    "style_references": [
      "2-3 cinematic/artistic style references"
    ],
    
    "temporal_structure": {
      "beginning_0_30_percent": "What happens in first third",
      "middle_30_70_percent": "What happens in middle",
      "end_70_100_percent": "What happens in final third"
    }
  },
  
  "alternative_prompts": [
    {
      "variation_type": "more-motion",
      "prompt": "Version with increased motion",
      "use_case": "When more dynamic action needed"
    },
    {
      "variation_type": "more-cinematic",
      "prompt": "Version with enhanced cinematography",
      "use_case": "When artistic quality prioritized"
    },
    {
      "variation_type": "more-realistic",
      "prompt": "Version with realistic approach",
      "use_case": "When naturalism needed"
    }
  ],
  
  "generation_strategy": {
    "model_specific_tips": "Tips for ${targetModel} specifically",
    "expected_challenges": ["Potential issues to watch for"],
    "quality_optimization": ["How to get best results"],
    "iteration_suggestions": ["How to refine if first attempt fails"]
  }
}

CRITICAL RULES:
1. Be HYPER-SPECIFIC about every visual detail
2. Use professional film/VFX terminology
3. Describe motion with physics accuracy
4. Include precise temporal flow (start → middle → end)
5. Specify exact colors (not generic terms)
6. Describe lighting with gaffer-level precision
7. Include style references when helpful
8. Ensure consistency across all elements
9. Optimize specifically for ${targetModel}
10. Make it vivid, imaginable, and actionable

Generate the PERFECT video generation prompt now.
Return ONLY JSON.`;

      const result = await this.model.generateContent(prompt);
      const responseText = result.response.text();
      const finalPromptData = parseJsonResponse(responseText);

      // Format for specific model
      return this.formatForVideoModel(finalPromptData, targetModel);

    } catch (error) {
      console.error('Prompt assembly error:', error.message);
      throw new Error(`Prompt assembly failed: ${error.message}`);
    }
  }

  /**
   * Format prompt for specific video generation model
   */
  formatForVideoModel(promptData, model) {
    const formatters = {
      'runway': this.formatForRunway,
      'pika': this.formatForPika,
      'kling': this.formatForKling,
      'stable-video': this.formatForStableVideo,
      'minimax': this.formatForMinimax
    };

    const formatter = formatters[model?.toLowerCase()];
    if (!formatter) {
      console.warn(`No specific formatter for ${model}, using generic format`);
      return promptData;
    }

    return formatter.call(this, promptData);
  }

  formatForRunway(data) {
    return {
      text_prompt: data.final_prompt?.main_prompt || '',
      negative_prompt: data.final_prompt?.negative_prompt || '',
      duration: parseInt(data.final_prompt?.technical_parameters?.duration) || 5,
      ratio: data.final_prompt?.technical_parameters?.aspect_ratio || '16:9',
      seed: Math.floor(Math.random() * 1000000),
      watermark: false,
      motion: data.final_prompt?.technical_parameters?.motion_amount || 5,
      camera_motion: data.final_prompt?.technical_parameters?.camera_motion || 3,
      _fullAnalysis: data
    };
  }

  formatForPika(data) {
    const params = [];
    params.push(`-motion ${data.final_prompt?.technical_parameters?.motion_amount || 3}`);
    params.push(`-camera ${data.final_prompt?.structured_breakdown?.camera_description || 'static'}`);
    params.push(`-fps ${data.final_prompt?.technical_parameters?.fps || 24}`);

    return {
      prompt: `${data.final_prompt?.main_prompt || ''} ${params.join(' ')}`,
      negative_prompt: data.final_prompt?.negative_prompt || '',
      aspect_ratio: data.final_prompt?.technical_parameters?.aspect_ratio || '16:9',
      duration: parseInt(data.final_prompt?.technical_parameters?.duration) || 3,
      _fullAnalysis: data
    };
  }

  formatForKling(data) {
    return {
      prompt: data.final_prompt?.main_prompt || '',
      negative_prompt: data.final_prompt?.negative_prompt || '',
      cfg_scale: 7.5,
      duration: parseInt(data.final_prompt?.technical_parameters?.duration) || 5,
      mode: 'professional',
      aspect_ratio: data.final_prompt?.technical_parameters?.aspect_ratio || '16:9',
      _fullAnalysis: data
    };
  }

  formatForStableVideo(data) {
    return {
      prompt: data.final_prompt?.main_prompt || '',
      negative_prompt: data.final_prompt?.negative_prompt || '',
      num_frames: Math.floor((parseInt(data.final_prompt?.technical_parameters?.duration) || 3) * 
                   (parseInt(data.final_prompt?.technical_parameters?.fps) || 24)),
      motion_bucket_id: (data.final_prompt?.technical_parameters?.motion_amount || 5) * 25 || 127,
      fps: parseInt(data.final_prompt?.technical_parameters?.fps) || 24,
      _fullAnalysis: data
    };
  }

  formatForMinimax(data) {
    return {
      prompt: data.final_prompt?.main_prompt || '',
      model: 'video-01',
      prompt_optimizer: true,
      _fullAnalysis: data
    };
  }
}

export default new VideoPromptAssembler();
