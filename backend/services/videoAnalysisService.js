// Multi-stage video analysis: character, reference media, and scene context
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';

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

export class VideoAnalysisService {
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
   * STAGE 1: Analyze character image with EXTREME detail
   */
  async analyzeCharacter(imagePath) {
    try {
      const imageData = await fs.readFile(imagePath);
      const base64Image = imageData.toString('base64');

      const prompt = `
Analyze this character image in EXTREME detail for AI video generation.

Return ONLY valid JSON (no markdown) in this format:

{
  "physical_attributes": {
    "body_type": "detailed body shape, proportions, build",
    "posture": "current stance, weight distribution, balance",
    "clothing": {
      "items": ["list each visible garment with detail"],
      "colors": ["specific color names"],
      "textures": ["fabric types: cotton, silk, denim, etc."],
      "fit": "how clothes hang: tight, loose, flowing",
      "movement_properties": "how clothes will move: rigid, flowing"
    },
    "hair": {
      "style": "detailed hairstyle description",
      "length": "exact length",
      "color": "specific shade",
      "movement_potential": "how it flows"
    },
    "skin_tone": "exact color description",
    "facial_features": "key distinguishing features",
    "accessories": ["visible accessories"]
  },
  
  "motion_readiness": {
    "balance_point": "center of gravity position",
    "potential_movements": ["3-5 natural next movements"],
    "restrictions": ["movements that would look unnatural"],
    "energy_level": "static/relaxed/dynamic/tense"
  },
  
  "lighting_context": {
    "current_lighting": "light direction, intensity, color temperature",
    "shadow_patterns": "where shadows fall",
    "highlights": "reflective areas",
    "ambient_quality": "soft/harsh/dramatic"
  },
  
  "background_elements": {
    "environment": "detailed background description",
    "depth_cues": "foreground/background separation",
    "interactive_objects": ["objects character could interact with"]
  },
  
  "technical_notes": {
    "image_quality": "resolution, clarity, focus quality",
    "angle": "camera angle: front, side, 3/4, etc.",
    "framing": "close-up, medium, full-body"
  }
}

Return ONLY valid JSON. No markdown code blocks.`;

      const result = await this.model.generateContent([
        { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
        { text: prompt }
      ]);

      const responseText = result.response.text();
      return parseJsonResponse(responseText);

    } catch (error) {
      console.error('Character analysis error:', error.message);
      throw new Error(`Character analysis failed: ${error.message}`);
    }
  }

  /**
   * STAGE 2: Analyze reference media (image or video)
   */
  async analyzeReference(mediaPath, type = 'image') {
    try {
      const mediaData = await fs.readFile(mediaPath);
      const base64Media = mediaData.toString('base64');
      const mimeType = type === 'video' ? 'video/mp4' : 'image/jpeg';

      const prompt = `
Analyze this reference ${type} for motion recreation in AI video generation.

Return ONLY valid JSON (no markdown):

{
  "motion_analysis": {
    "primary_action": "main movement or action",
    "motion_phases": [
      {
        "phase": "start/middle/end",
        "duration_estimate": "estimated seconds",
        "key_poses": "critical body positions",
        "motion_curve": "ease-in/linear/ease-out/bounce",
        "speed": "very-slow/slow/medium/fast/very-fast"
      }
    ],
    "body_mechanics": {
      "weight_shift": "how weight transfers",
      "momentum": "force direction and intensity",
      "secondary_motion": "follow-through actions",
      "anticipation": "preparatory movements"
    }
  },
  
  "camera_work": {
    "movement_type": "static/pan/tilt/dolly/crane/handheld",
    "speed": "very-slow/slow/medium/fast",
    "smoothness": "smooth/shaky/cinematic",
    "focal_length_feel": "wide/normal/telephoto",
    "angle": "eye-level/high-angle/low-angle",
    "tracking": "follows-subject/independent"
  },
  
  "timing": {
    "total_duration": "estimated seconds",
    "beat_points": ["key moments"],
    "rhythm": "constant/accelerating/decelerating"
  },
  
  "style_attributes": {
    "motion_blur": "none/slight/heavy",
    "frame_rate_feel": "cinematic-24fps/smooth-60fps",
    "color_grading": "natural/warm/cool/desaturated",
    "depth_of_field": "shallow/deep"
  },
  
  "environmental_interaction": {
    "ground_contact": "how body interacts with ground",
    "object_interaction": "touching/holding/avoiding objects",
    "spatial_awareness": "movement through 3D space"
  }
}

Return ONLY JSON.`;

      const result = await this.model.generateContent([
        { inlineData: { mimeType, data: base64Media } },
        { text: prompt }
      ]);

      const responseText = result.response.text();
      return parseJsonResponse(responseText);

    } catch (error) {
      console.error('Reference analysis error:', error.message);
      throw new Error(`Reference analysis failed: ${error.message}`);
    }
  }

  /**
   * STAGE 3: Analyze scene context from user prompt
   */
  async analyzeSceneContext(userPrompt, characterData = null) {
    try {
      let promptInput = `User wants to create a video: "${userPrompt}"`;
      if (characterData) {
        promptInput += `\nCharacter: ${JSON.stringify(characterData.physical_attributes)}`;
      }

      const prompt = `
Expand this into a detailed scene analysis for video generation.

Return ONLY valid JSON (no markdown):

{
  "scene_breakdown": {
    "setting": {
      "location": "specific place with details",
      "location_type": "indoor/outdoor/mixed",
      "time_of_day": "exact time and lighting implications",
      "weather": "conditions affecting visuals",
      "season": "environmental details",
      "atmosphere": "crowded/empty/intimate/vast"
    },
    
    "mood_atmosphere": {
      "emotional_tone": "happy/sad/tense/peaceful/exciting",
      "energy_level": "calm/moderate/high/explosive",
      "color_palette": ["3-5 dominant colors"],
      "lighting_mood": "bright/moody/dramatic/soft",
      "sound_implications": "quiet/loud/musical"
    },
    
    "story_context": {
      "what_happened_before": "implied backstory",
      "current_moment": "what's happening now",
      "implied_next": "where action naturally leads",
      "emotional_arc": "feeling progression",
      "character_motivation": "why character is doing this"
    },
    
    "visual_elements": {
      "foreground": "elements in front of character",
      "midground": "character's immediate environment",
      "background": "distant elements",
      "key_props": ["important objects"],
      "environmental_effects": ["fog, dust, rain, etc."]
    }
  },
  
  "technical_requirements": {
    "complexity_level": "simple/medium/complex",
    "required_elements": ["must-have visuals"],
    "optional_enhancements": ["nice-to-have"],
    "potential_challenges": ["difficult aspects"],
    "recommended_duration": "ideal seconds"
  },
  
  "cinematic_references": {
    "style_inspirations": ["film/photography styles"],
    "mood_references": ["similar scenes"],
    "technical_approach": "documentary/narrative/artistic"
  }
}

Return ONLY JSON.`;

      const result = await this.model.generateContent([{ text: promptInput }, { text: prompt }]);
      const responseText = result.response.text();
      return parseJsonResponse(responseText);

    } catch (error) {
      console.error('Scene context analysis error:', error.message);
      throw new Error(`Scene analysis failed: ${error.message}`);
    }
  }
}

export default new VideoAnalysisService();
