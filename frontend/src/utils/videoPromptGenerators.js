/**
 * ChatGPT Prompt Generator for Video Scenarios
 * Generates comprehensive prompts to ask ChatGPT for detailed video scripts
 */

export const generateVideoScriptPrompt = (
  videoScenario,
  productType,
  productDetails,
  targetAudience,
  videoStyle,
  totalDuration,
  segmentCount
) => {
  const segmentDuration = Math.round(totalDuration / segmentCount);

  return `You are an expert video scriptwriter specializing in product showcase videos and fashion content. I need you to create detailed, segment-by-segment video scripts for a ${totalDuration}-second video.

**PRODUCT INFORMATION:**
- Product Type: ${productType}
- Product Details: ${productDetails}
- Target Audience: ${targetAudience}

**VIDEO SPECIFICATIONS:**
- Total Duration: ${totalDuration} seconds
- Number of Segments: ${segmentCount}
- Duration Per Segment: ${segmentDuration} seconds
- Video Style: ${videoStyle}
- Scenario: ${videoScenario}

**SCRIPT FORMAT REQUIREMENTS:**
For each segment, provide the following structure:

Segment [X]: [Title]
Duration: ${segmentDuration} seconds
Camera: [Shot type and movements]
Lighting: [Lighting description]
Character Movement: [Detailed step-by-step movements (numbered list)]
Hand Gestures: [Specific hand movements]
Facial Expressions: [Expressions and emotions]
Outfit Focus: [Which parts of outfit to emphasize]
Pacing: [Slow/Normal/Fast]
Music/Audio: [Recommended audio cues]
Transitions: [How this segment connects to next]

**STYLE GUIDANCE:**
- Video Style: ${videoStyle}
- Keep movements NATURAL and REPEATABLE
- Movements should take exactly ${segmentDuration} seconds for this segment
- All movements must be doable by a real person
- Focus on product through body positioning and camera work, not just standing still
- Each segment should flow smoothly to the next
- Use varied movements (walking, turning, posing, gesturing)

**IMPORTANT NOTES:**
1. Write as if filming a REAL PERSON, not a 3D model or animation
2. All movements must be physically achievable in one take
3. Movements should look natural and not robotic
4. Include clear timing for how long each movement takes
5. Specify when to look at/away from camera
6. Include subtle movements even during "standing still" moments

Please create detailed scripts for all ${segmentCount} segments that together form a cohesive ${totalDuration}-second video showcasing the ${productType}.`;
};

export const generateStyleVariationPrompt = (
  productType,
  scenarios = 5
) => {
  return `You are a creative director for fashion and product videos. I need you to generate ${scenarios} different video scenario templates for showcasing ${productType}.

For each scenario, provide:

**Scenario [X]: [Creative Title]**
- Duration: 20-30 seconds
- Target Tone: [Professional/Casual/Luxurious/Energetic]
- Number of Segments: [2-4]
- Best For: [Who would use this video type]

**Movement Arc:**
[Describe the overall movement progression and energy]

**Key Segments:**
Segment 1: [Title + Movement description]
Segment 2: [Title + Movement description]
Segment 3: [Optional - Title + Movement description]
Segment 4: [Optional - Title + Movement description]

**Why This Works:**
[Explain the narrative and visual appeal]

**Required Equipment:**
- Camera angles: [List needed angles]
- Lighting setup: [Lighting requirements]
- Props needed: [Any props or setup required]

**Tips for Success:**
[3-4 key tips for executing this scenario well]

---

CONSTRAINTS:
- All scenarios must feature a REAL PERSON wearing the product
- No special effects or 3D elements
- Movements must be achievable in a single take with standard equipment
- Each scenario should have a different emotional/narrative angle
- Assume we have basic studio setup with model and basic lighting

Please generate exactly ${scenarios} creative, detailed templates that vary in style, energy level, and storytelling approach.`;
};

export const generateMovementDetailPrompt = (
  movement,
  duration,
  productType,
  productArea
) => {
  return `I need detailed, frame-by-frame breakdown of a movement for a product video.

**MOVEMENT DETAILS:**
- Movement: ${movement}
- Duration: ${duration} seconds
- Product: ${productType}
- Focus Area: ${productArea}

Please provide a DETAILED breakdown:

**FRAME-BY-FRAME BREAKDOWN:**
Frame 0 (0s): [Initial position and pose]
Frame 1 (${duration * 0.25}s): [What happens at 25% mark]
Frame 2 (${duration * 0.5}s): [What happens at 50% mark - peak of movement]
Frame 3 (${duration * 0.75}s): [What happens at 75% mark]
Frame 4 (${duration}s): [Final position and hold]

**DETAILED INSTRUCTIONS FOR EACH FRAME:**
- Exact body position
- Foot placement and weight distribution
- Arm and hand position
- Head position and gaze
- Facial expression
- Any rotation or tilt angles
- Product visibility and angle
- Camera proximity and angle

**CAMERA WORK FOR THIS MOVEMENT:**
- Start position: [Camera position]
- End position: [Camera position]
- Movement type: [Static/Pan/Zoom/Follow]
- Required adjustments: [Any camera adjustments needed]

**PRODUCT EMPHASIS:**
- How is the product highlighted?
- Better view at start or end?
- What details become visible?
- How does movement improve product visibility?

**TIPS FOR EXECUTION:**
[3-5 specific tips for getting this movement right]

Please be VERY specific with distances, angles, and timing. This will be used to film a real person, so all measurements and descriptions must be physically accurate and achievable.`;
};

export const generateCameraGuidancePrompt = (
  scenario,
  segmentCount,
  aspectRatio,
  primaryFocus
) => {
  return `I need detailed camera work guidance for a ${segmentCount}-segment video about ${primaryFocus}.

**VIDEO SPECIFICATIONS:**
- Scenario: ${scenario}
- Segments: ${segmentCount}
- Aspect Ratio: ${aspectRatio}
- Primary Focus: ${primaryFocus}

For each segment, provide:

**Segment [X] - CAMERA GUIDANCE**

**Shot Composition:**
- Shot type: [Wide/Medium/Close-up/Detail]
- Camera height: [Eye-level/Low/High angle]
- Framing: [Rule of thirds/Center/Off-center]
- Depth of field: [Shallow/Medium/Deep]

**Camera Movement:**
- Type: [Static/Pan/Tilt/Zoom/Track/Slow zoom]
- Direction: [Up/Down/Left/Right]
- Speed: [Slow/Medium/Fast]
- Amount to move: [Specific distances or angles]
- Duration of movement: [Timing within segment]

**Focus Tracking:**
- Focus point: [What/who to focus on]
- Focus transitions: [When/how to shift focus]
- Blur background: [Yes/No - if yes, how much]

**Lens Recommendation:**
- Focal length: [24mm/35mm/50mm/85mm]
- Why this lens: [Explanation]

**Position in Scene:**
- Camera position: [Where to place camera]
- Distance from subject: [Specific distances]
- Angle relative to subject: [Degree angles]

**Transitions Between Segments:**
- How to transition from previous segment
- How to set up for next segment
- Continuity requirements

**Special Considerations:**
[Any special camera techniques or considerations]

Provide this level of detail for ALL ${segmentCount} segments.`;
};

export const generateLightingSetupPrompt = (
  scenario,
  style,
  primaryProduct,
  skinTone = 'medium'
) => {
  return `I need a detailed lighting setup guide for a video featuring ${primaryProduct} with a ${style} style.

**LIGHTING BRIEF:**
- Scenario: ${scenario}
- Style: ${style}
- Main Subject: Person wearing ${primaryProduct}
- Skin Tone: ${skinTone}
- Goal: Showcase the product while being flattering to the person

**PROVIDE DETAILED SETUP FOR EACH SEGMENT:**

**Segment [X]:**

**Lighting Setup:**
- Main Key Light: 
  - Position: [Where to place relative to subject, angles]
  - Intensity: [Percentage or setting]
  - Quality: [Hard/Soft/Diffused]
  - Color temp: [Warm/Neutral/Cool]

- Fill Light:
  - Position: [Where to place]
  - Intensity: [Percentage relative to key]
  - Quality: [Soft/Hard]

- Back Light/Rim Light:
  - Position: [Height and angle]
  - Intensity: [Percentage]
  - Purpose: [What it highlights]
  - Color: [RGB if color lighting]

- Hair Light: [If needed]
  - Position and intensity

- Background Light:
  - Type: [Create dimension or pure white/black]
  - Intensity: [Bright/Moderate/Dark]

**RAW vs GRADED APPEARANCE:**
- How the lighting should look straight from camera
- Recommended post-processing color grades
- White balance: [Kelvin temperature]

**PRODUCT-SPECIFIC LIGHTING:**
- How to best light the material ${primaryProduct} is made from
- Special considerations for [color/texture]
- Areas to emphasize through light
- Areas to shadow or minimize

**SKIN LIGHTING FOR ${skinTone} TONE:**
- Best positions for flattering light
- Colors to enhance skin
- Avoid harsh shadows on: [specific areas]

**CONTINUITY NOTES:**
- Maintain consistent lighting across segments
- Lighting transitions between segments (if any)

**EQUIPMENT NEEDED:**
- Lights: [Types and wattages]
- Modifiers: [Softboxes, diffusers, etc.]
- Color gels: [If using color lighting]
- Stands/mounting: [How to mount lights]

**SETUP CHECKLIST:**
[ ] Key light positioned
[ ] Fill light added
[ ] Back light set
[ ] Hair light positioned (if used)
[ ] Background light adjusted
[ ] White balance set
[ ] Test footage reviewed
[ ] Refinements made

**FALLBACK TIPS:**
If professional lighting not available, provide natural light setup recommendations.

Provide this level of detail for the complete video.`;
};

export const generateTemplateLibraryPrompt = (
  count = 30
) => {
  return `You are a master video producer specializing in product showcase and fashion videos. I need you to generate a comprehensive library of ${count} different video scenario templates that can be used for various products.

Each template should be UNIQUE and offer a different approach to showing products or outfits.

**GENERATE ${count} TEMPLATES WITH THIS STRUCTURE:**

**Template #[X]: [Catchy Title]**
- Duration: [20-30 seconds recommended]
- Segments: [Number of segments, typically 2-4]
- Aspect Ratio: [9:16 for vertical/16:9 for horizontal]
- Best for: [Type of products/items]
- Energy Level: [Slow/Moderate/Fast/Dynamic]
- Complexity: [Simple/Moderate/Advanced - doable with 1-2 people and basic equipment]

**OVERVIEW:** [1-2 sentence description of the concept]

**SEGMENT BREAKDOWN:**
[For each segment]
- Title: [Segment name]
- Duration: [Seconds]
- Key Action: [Main character/product action]
- Camera Work: [Static/Pan/Zoom/Follow]
- Unique Element: [What makes this segment interesting]

**WHY THIS WORKS:**
[2-3 sentences on narrative flow and audience engagement]

**REQUIRED SETUP:**
- Studio space: [Size needed]
- Equipment: [Camera, lights, backdrop]
- Props: [Any props or staging needed]
- People: [One model, two people, group, etc.]

**DIFFICULTY RATING:** [1-10 scale]

**EXAMPLES OF PRODUCTS:** [3-4 types of products this works well for]

---

**IMPORTANT REQUIREMENTS FOR ALL ${count} TEMPLATES:**

1. All must feature REAL PEOPLE (no animation, no 3D models)
2. All must be achievable with standard video equipment
3. All must be filmable in a single take per segment
4. Must include varied movement types (walking, posing, gesturing, turning)
5. Movement descriptions must be specific and achievable
6. Templates should span different styles and energy levels
7. Include a variety of product focus types:
   - Close-up product detail focus (5 templates)
   - Full outfit showcase (8 templates)
   - Movement/functionality focus (7 templates)
   - Emotional/lifestyle focus (5 templates)
   - Educational/how-to focus (5 templates)

**DIVERSITY REQUIREMENT:**
- Include slow, graceful movements
- Include energetic, fast movements
- Include casual, natural movements
- Include dramatic, fashionable movements
- Include educational, informative movements
- Include playful, fun movements

**CONSTRAINT:**
- Every template must be DIFFERENT from the others
- No repeating concepts or structures
- Each should offer value for a different type of content creator or product

Please generate exactly ${count} unique, detailed, and immediately usable video scenario templates.`;
};

/**
 * Export all prompt generators
 */
export default {
  generateVideoScriptPrompt,
  generateStyleVariationPrompt,
  generateMovementDetailPrompt,
  generateCameraGuidancePrompt,
  generateLightingSetupPrompt,
  generateTemplateLibraryPrompt
};
