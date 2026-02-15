// Professional prompt engineering for video generation: motion, camera, lighting
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

export class VideoPromptEngineer {
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
   * Generate detailed motion description
   */
  async generateMotionDescription(characterData, referenceData, sceneData) {
    try {
      const prompt = `
You are a professional motion choreographer for AI video generation.

INPUTS:
CHARACTER: ${JSON.stringify(characterData, null, 2)}
REFERENCE: ${JSON.stringify(referenceData, null, 2)}
SCENE: ${JSON.stringify(sceneData, null, 2)}

Generate a HYPER-DETAILED motion description.

Return ONLY valid JSON:

{
  "motion_prompt": {
    "primary_description": "Single paragraph (100-150 words) describing the complete motion in vivid, specific detail. Include: starting position, movement progression, body mechanics, weight shifts, momentum, and ending position.",
    
    "frame_by_frame_breakdown": [
      {
        "timestamp": "0.0-0.5s",
        "visual_description": "Exact visual state at this moment",
        "body_position": "Precise pose: arms, legs, torso, head",
        "clothing_state": "How fabric moves and drapes",
        "facial_expression": "Micro-expressions and gaze direction",
        "environmental_interaction": "Contact with ground/objects"
      },
      {
        "timestamp": "0.5-1.0s",
        "visual_description": "...",
        "body_position": "...",
        "clothing_state": "...",
        "facial_expression": "...",
        "environmental_interaction": "..."
      }
    ],
    
    "motion_qualities": {
      "fluidity": "smooth/sharp/mixed - describe flow",
      "weight": "heavy/light/balanced - how it feels",
      "intention": "purposeful/casual/reactive - character intent",
      "style": "realistic/stylized/exaggerated",
      "rhythm": "constant/accelerating/pulsing"
    },
    
    "physics_considerations": {
      "gravity_effects": "How gravity affects movement and clothing",
      "momentum_transfer": "Force and inertia through body",
      "collision_points": "Contact with ground/objects",
      "cloth_dynamics": "Fabric behavior: stiff/flowing/bouncing",
      "hair_physics": "Hair movement and settling"
    },
    
    "secondary_animations": {
      "clothing": "How garments respond to movement",
      "hair": "Hair flow and bounce",
      "accessories": "Jewelry, bags, etc. movement",
      "environmental": "Leaves, dust, etc. affected by motion"
    }
  }
}

Be EXTREMELY specific. Use professional motion capture terminology.
Return ONLY JSON.`;

      const result = await this.model.generateContent(prompt);
      const responseText = result.response.text();
      return parseJsonResponse(responseText);

    } catch (error) {
      console.error('Motion description error:', error.message);
      throw new Error(`Motion description failed: ${error.message}`);
    }
  }

  /**
   * Generate camera instructions
   */
  async generateCameraInstructions(referenceData, sceneData, motionData) {
    try {
      const prompt = `
You are a professional cinematographer for AI video generation.

INPUTS:
REFERENCE: ${JSON.stringify(referenceData, null, 2)}
SCENE: ${JSON.stringify(sceneData, null, 2)}
MOTION: ${JSON.stringify(motionData?.motion_prompt?.primary_description, null, 2)}

Design professional camera work.

Return ONLY valid JSON:

{
  "camera_prompt": {
    "shot_description": "Complete camera setup in 50-80 words: type, movement, framing, and intent",
    
    "technical_specs": {
      "shot_type": "extreme-close-up/close-up/medium-shot/full-shot/wide-shot",
      "lens_focal_length": "ultra-wide-14mm/wide-24mm/normal-50mm/portrait-85mm/telephoto-200mm",
      "aperture_feel": "f1.4-shallow-dof/f5.6-moderate/f16-deep-focus",
      "sensor_size_feel": "full-frame-cinematic/crop-sensor-tight"
    },
    
    "camera_movement": {
      "movement_type": "static/slow-push-in/pull-out/pan-left/pan-right/tilt-up/tilt-down/dolly/crane/orbit/handheld",
      "movement_path": "Exact trajectory description",
      "speed_profile": "constant/ease-in/ease-out/accelerating/decelerating",
      "smoothness": "locked-off/smooth-gimbal/slight-shake/handheld-energy",
      "timing": "Movement timing relative to subject action"
    },
    
    "framing_composition": {
      "composition_rule": "rule-of-thirds/centered/golden-ratio/leading-lines/symmetrical",
      "subject_placement": "Where subject sits in frame",
      "headroom": "space above subject: tight/normal/generous",
      "look_room": "space in direction of gaze/movement",
      "depth_layers": "Foreground/subject/background arrangement"
    },
    
    "focus_control": {
      "focus_subject": "What stays in sharp focus",
      "depth_of_field": "shallow-bokeh/moderate/deep-focus",
      "focus_pulls": ["Timing and direction of focus changes"],
      "rack_focus_moments": "When focus shifts between subjects"
    },
    
    "camera_angle": {
      "vertical_angle": "eye-level/high-angle/low-angle/birds-eye/worms-eye",
      "horizontal_angle": "front/3-4-profile/side-profile/back/over-shoulder",
      "dutch_angle": "none/slight-5deg/dramatic-15deg",
      "angle_motivation": "Why this angle serves the story"
    },
    
    "cinematography_style": {
      "reference_films": ["2-3 films with similar camera work"],
      "director_of_photography_style": "Specific DP style if applicable",
      "era_feel": "modern-digital/film-grain/vintage-anamorphic",
      "mood_contribution": "How camera work enhances mood"
    }
  }
}

Use professional cinematography terminology.
Return ONLY JSON.`;

      const result = await this.model.generateContent(prompt);
      const responseText = result.response.text();
      return parseJsonResponse(responseText);

    } catch (error) {
      console.error('Camera instructions error:', error.message);
      throw new Error(`Camera instructions failed: ${error.message}`);
    }
  }

  /**
   * Generate lighting & atmosphere
   */
  async generateLightingAtmosphere(characterData, sceneData) {
    try {
      const prompt = `
You are a professional gaffer/lighting designer for AI video generation.

CHARACTER: ${JSON.stringify(characterData, null, 2)}
SCENE: ${JSON.stringify(sceneData, null, 2)}

Design comprehensive lighting and atmosphere.

Return ONLY valid JSON:

{
  "lighting_prompt": {
    "lighting_overview": "Complete lighting setup in 60-100 words",
    
    "key_light": {
      "position": "front-45deg-right/left, high/low, distance",
      "intensity": "very-bright/bright/moderate/dim/subtle",
      "color_temperature": "warm-3200K/neutral-5600K/cool-7000K/mixed",
      "quality": "hard-direct/soft-diffused/bounced/filtered",
      "motivation": "sun/window/practical-lamp/artificial"
    },
    
    "fill_light": {
      "presence": "strong/moderate/subtle/none",
      "ratio_to_key": "1:2/1:4/1:8",
      "position": "opposite key light side",
      "source": "bounce/reflector/second-light/ambient"
    },
    
    "back_rim_light": {
      "presence": "strong-rim/subtle-edge/none",
      "color": "matching-key/contrasting/colored-gel",
      "intensity": "bright-separation/subtle-definition",
      "purpose": "subject-separation/artistic-effect"
    },
    
    "ambient_environment_light": {
      "source": "sky/bounce/practicals/mixed",
      "color": "overall color tone of environment",
      "intensity": "bright-day/moderate/dim-interior/dark-night",
      "direction": "omnidirectional/directional-bias"
    },
    
    "shadows": {
      "hardness": "sharp-defined/soft-gradient/very-soft",
      "color": "neutral-gray/cool-blue/warm/colored",
      "density": "deep-black/transparent/lifted-blacks",
      "direction": "consistent with key light",
      "environmental_shadows": "cast shadows from objects"
    },
    
    "atmospheric_effects": {
      "volumetric_lighting": "none/subtle-haze/god-rays/heavy-fog",
      "particles": "none/dust-motes/rain/snow/leaves",
      "lens_effects": "clean/subtle-flare/bloom/anamorphic-flare",
      "color_grading_intent": "natural/warm-nostalgic/cool-clinical/stylized"
    },
    
    "time_of_day_lighting": {
      "sun_position": "sunrise/morning/noon/afternoon/golden-hour/dusk/night",
      "sky_color": "specific sky color and clouds",
      "light_color_shift": "how light color changes through scene",
      "shadow_length": "short-noon/long-golden-hour"
    },
    
    "practical_lights": {
      "visible_sources": ["lamps/candles/screens in scene"],
      "contribution": "how they affect overall lighting",
      "color_temperature": "warm-tungsten/cool-fluorescent/mixed"
    }
  }
}

Use professional lighting terminology (gaffer/DP language).
Return ONLY JSON.`;

      const result = await this.model.generateContent(prompt);
      const responseText = result.response.text();
      return parseJsonResponse(responseText);

    } catch (error) {
      console.error('Lighting atmosphere error:', error.message);
      throw new Error(`Lighting design failed: ${error.message}`);
    }
  }

  /**
   * Generate temporal consistency rules
   */
  async generateConsistencyRules(allPreviousData) {
    try {
      const prompt = `
You are a VFX supervisor ensuring temporal consistency in AI video generation.

ALL PREVIOUS ANALYSIS:
${JSON.stringify(allPreviousData, null, 2)}

Generate strict consistency rules.

Return ONLY valid JSON:

{
  "consistency_rules": {
    "character_persistence": {
      "appearance_locks": ["features that MUST remain constant"],
      "clothing_continuity": "exact garment descriptions to maintain",
      "proportions": "body measurements and ratios",
      "color_palette": ["exact colors that must stay consistent"]
    },
    
    "environmental_persistence": {
      "lighting_continuity": "light sources must remain stable",
      "background_stability": "static elements that don't move",
      "weather_continuity": "atmospheric conditions stay same",
      "time_of_day_lock": "sun position doesn't change"
    },
    
    "motion_continuity": {
      "momentum_preservation": "physics must be consistent",
      "position_tracking": "spatial relationships maintained",
      "action_logic": "cause and effect make sense",
      "speed_consistency": "movement speed stays believable"
    },
    
    "style_consistency": {
      "visual_style_lock": "aesthetic must not shift",
      "color_grading": "color treatment stays same",
      "rendering_quality": "detail level consistent",
      "camera_style": "cinematography approach unified"
    },
    
    "technical_constraints": {
      "resolution": "maintain quality throughout",
      "frame_rate": "consistent temporal sampling",
      "aspect_ratio": "frame dimensions locked",
      "compression_artifacts": "avoid quality degradation"
    }
  },
  
  "quality_checkpoints": [
    "Character appearance matches throughout",
    "Lighting direction stays consistent",
    "Motion follows physics",
    "No sudden style shifts",
    "Background elements stable",
    "Color palette maintained",
    "Camera work unified",
    "Temporal flow smooth"
  ],
  
  "common_pitfalls_to_avoid": [
    "Character morphing mid-video",
    "Lighting direction flipping",
    "Impossible physics",
    "Style inconsistency",
    "Background elements shifting",
    "Color palette drift",
    "Jarring cuts or jumps"
  ]
}

Return ONLY JSON.`;

      const result = await this.model.generateContent(prompt);
      const responseText = result.response.text();
      return parseJsonResponse(responseText);

    } catch (error) {
      console.error('Consistency rules error:', error.message);
      throw new Error(`Consistency rules failed: ${error.message}`);
    }
  }

  /**
   * Build video prompt from base prompt with enhancements
   * Used by unifiedFlowController
   */
  async buildVideoPrompt({ basePrompt, styleOptions = {}, characterData = {}, referenceData = {} }) {
    try {
      let prompt = basePrompt;
      
      // Add style enhancements
      if (styleOptions.motion) {
        prompt += ` | Motion: ${styleOptions.motion}`;
      }
      if (styleOptions.cameraMovement) {
        prompt += ` | Camera: ${styleOptions.cameraMovement}`;
      }
      if (styleOptions.lighting) {
        prompt += ` | Lighting: ${styleOptions.lighting}`;
      }
      if (styleOptions.duration) {
        prompt += ` | Duration: ${styleOptions.duration}`;
      }
      
      // Add quality markers
      prompt += ' | High quality, smooth motion, professional cinematography';
      
      console.log('✅ Video prompt built:', prompt.substring(0, 100) + '...');
      return prompt;
      
    } catch (error) {
      console.error('Build video prompt error:', error.message);
      return basePrompt; // Fallback to base prompt
    }
  }
}

// Named export for backward compatibility with controllers
const videoPromptEngineer = new VideoPromptEngineer();
export { videoPromptEngineer as buildVideoPrompt };
export default videoPromptEngineer;
