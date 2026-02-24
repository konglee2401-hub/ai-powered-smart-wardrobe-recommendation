/**
 * Scenario-Specific ChatGPT Prompt Templates
 * Each scenario generates a unique prompt for ChatGPT based on available images
 * 💫 NEW: Designed to analyze images deeply and generate tailored video scripts
 */

/**
 * Get prompt template for a specific video scenario
 * Analyzes provided images and generates detailed ChatGPT prompt
 */
export const getScenarioPromptTemplate = (scenario, params) => {
  const templates = {
    'dancing': generateDancingPrompt,
    'product-intro': generateProductIntroPrompt,
    'lifestyle': generateLifestylePrompt,
    'lip-sync': generateLipSyncPrompt,
    'fashion-walk': generateFashionWalkPrompt,
    'transition': generateTransitionPrompt
  };

  const generator = templates[scenario] || templates['product-intro'];
  return generator(params);
};

/**
 * DANCING / MOVEMENT SCENARIO
 * Focus: Energetic movement, outfit showcase through motion
 */
function generateDancingPrompt({
  duration = 20,
  segments = 3,
  characterWearingImage,
  characterHoldingImage,
  productReferenceImage,
  productName = 'product',
  additionalDetails = ''
}) {
  const segmentDuration = Math.round(duration / segments);

  let imageAnalysis = '';
  if (characterWearingImage) {
    imageAnalysis += `Image A (Primary): Character wearing the ${productName}. This is the main reference for outfit and movement style.`;
  }
  if (characterHoldingImage) {
    imageAnalysis += ` Image B: Character holding/presenting the ${productName}. Shows how product is handled and displayed.`;
  }
  if (productReferenceImage) {
    imageAnalysis += ` Image C: Product close-up reference. Use for detail emphasis in close-up movements.`;
  }

  return `You are an expert dance choreography and video scriptwriter for fashion content. I need you to create detailed video scripts for a ${duration}-second dancing/movement video.

**IMAGE ANALYSIS:**
${imageAnalysis}

**PRODUCT DETAILS:**
- Product: ${productName}
- Additional Details: ${additionalDetails || 'None provided'}

**VIDEO SPECIFICATIONS:**
- Total Duration: ${duration} seconds
- Number of Segments: ${segments}
- Duration Per Segment: ${segmentDuration} seconds
- Scenario: Dancing / Movement showcase

**SEGMENT SCRIPT FORMAT:**
For each segment, provide:

Segment [X]: [Energetic Title]
Duration: ${segmentDuration} seconds
Music/Beat: [Suggested beat pattern or genre]
Camera: [Shot type - Wide/Medium/Close-up and movement]
Energy Level: [1-10 scale with description]
Character Movement: [Detailed dance moves or energetic movements]
- [Movement point 1]
- [Movement point 2]
- [Movement point 3]
Hand Gestures: [Specific hand movements that showcase outfit]
Outfit Focus: [Which parts of outfit are highlighted by this movement]
Facial Expression: [Energy, confidence, mood]
Transitions: [How this segment connects to next]

**CRITICAL GUIDANCE:**
1. Movements must be ENERGETIC and CONTINUOUS - dancing style
2. Every movement must showcase the outfit dynamically
3. Use varied shot angles (close-ups for details, wide for full outfit)
${productReferenceImage ? '4. Use Image C (product reference) for detail close-ups if available.' : ''}
5. Keep energy consistent with high-tempo beats
6. All movements must be achievable in single takes
7. Mention SPECIFIC IMAGE references when describing what to close-up on

**IMAGE REFERENCE REQUIREMENTS:**
When describing movements, specifically mention:
- "Similar to Image A" when describing outfit positioning
${characterHoldingImage ? '- "Reference Image B" when showing product handling' : ''}
${productReferenceImage ? '- "Match Image C" when filming close-up details' : ''}

Please generate scripts for all ${segments} segments forming a cohesive ${duration}-second dancing video.

===START_SCRIPT===
[Write all segment scripts here]
===END_SCRIPT===

CRITICAL: Output ONLY the script between ===START_SCRIPT=== and ===END_SCRIPT===. No other text.`;
};

/**
 * PRODUCT INTRODUCTION SCENARIO
 * Focus: Professional product showcase with full image analysis
 * Requirements: 3 images strongly recommended (character wearing, holding, product)
 */
function generateProductIntroPrompt({
  duration = 20,
  segments = 2,
  characterWearingImage,
  characterHoldingImage,
  productReferenceImage,
  productName = 'product',
  productFeatures = [],
  additionalDetails = ''
}) {
  const segmentDuration = Math.round(duration / segments);

  let imageAnalysis = '**You have the following reference images:**\n';
  let imageReferences = [];

  if (characterWearingImage) {
    imageAnalysis += `Image A (PRIMARY - Character Wearing): Shows the person wearing the ${productName}. Analyze:
  - Outfit fit and styling
  - Position and posture
  - Background and environment
  - Lighting conditions
  - Overall appearance`;
    imageReferences.push('Image A (Character wearing)');
  } else {
    imageAnalysis += `⚠️ No character wearing image provided. This is essential for product introduction!`;
  }

  if (characterHoldingImage) {
    imageAnalysis += `\nImage B (SECONDARY - Character Holding Product): Shows person handling/presenting the ${productName}. Analyze:
  - How product is held
  - Hand positioning
  - Product details visible
  - Character's expression and gesture`;
    imageReferences.push('Image B (Character holding)');
  }

  if (productReferenceImage) {
    imageAnalysis += `\nImage C (SECONDARY - Product Reference): Close-up of the ${productName}. Analyze:
  - Product details and texture
  - Colors and materials
  - Key features
  - Quality and finish
  - Any unique design elements`;
    imageReferences.push('Image C (Product close-up)');
  }

  const featuresText = productFeatures.length > 0 
    ? `Product Features: ${productFeatures.join(', ')}` 
    : 'Features to be analyzed from images';

  return `You are an expert product showcase video scriptwriter and visual director. Create a professional ${duration}-second product introduction video script.

**IMAGE ANALYSIS PHASE:**
${imageAnalysis}

**PRODUCT INFORMATION:**
- Product Name: ${productName}
- ${featuresText}
- Additional Details: ${additionalDetails || 'To be analyzed from images'}

**SCENE & ENVIRONMENT DETERMINATION:**
Based on the images provided (particularly Image A showing character wearing), determine and recommend:
1. **Optimal Scene**: Indoor studio, retail environment, lifestyle setting, home environment, etc.
2. **Background**: What type of background best complements the images?
3. **Lighting**: Based on Image A's lighting, what enhancements needed?
4. **Props**: Any props visible in images that should be incorporated?

**VIDEO SPECIFICATIONS:**
- Total Duration: ${duration} seconds
- Number of Segments: ${segments}
- Duration Per Segment: ${segmentDuration} seconds
- Scenario: Professional Product Introduction
- References Available: ${imageReferences.join(', ')}

**SEGMENT SCRIPT FORMAT:**
For each segment, provide:

Segment [X]: [Professional Title]
Duration: ${segmentDuration} seconds
Scene Setup: [Based on image analysis, describe scene]
Camera Setup: [Position and movement recommendations]
Lighting: [Specific lighting based on Image A analysis]
Character Movement: [Step-by-step actions]
- [Action 1]
- [Action 2]
- [Action 3]
Product Focus: [WHICH IMAGE to reference for this detail]
Hand Positioning: [How character handles or presents product]
Verbal/Audio: [What should be communicated - spoken intro or music cues]
Key Details from Images: [Specifically mention what to emphasize from the provided images]
Transitions: [Connection to next segment]

**MANDATORY IMAGE ANALYSIS REQUIREMENTS:**
${characterWearingImage ? `1. Segment must analyze and reference Image A (character wearing ${productName}):
   - What's the overall context visible in the image?
   - Body position and angle to emphasize?
   - Background elements to incorporate?` : ''}
${characterHoldingImage ? `2. When showing product details, reference Image B (character holding):
   - Mirror the hand positioning and movement pattern?
   - Replicate the handling technique?
   - Emphasize the same product angles?` : ''}
${productReferenceImage ? `3. For close-up details, use Image C (product reference):
   - Which specific details to zoom on?
   - Color and texture emphasis?
   - Quality details to highlight?` : ''}

**NARRATIVE FLOW:**
Create a compelling narrative arc that:
1. Grabs attention immediately
2. Establishes context (setting, character, mood)
3. Introduces the product naturally based on Image A
${characterHoldingImage ? '4. References Image B for product handling and benefits' : ''}
${productReferenceImage ? '5. Details from Image C for unique features' : ''}
6. Creates desire and closing call to action

**CRITICAL INSTRUCTIONS:**
- Each mention of an image reference MUST include the image letter (A, B, or C)
- Describe specific details FROM the images, not generic descriptions
- Consider lighting, background, and environment visible in Image A
- All movements must be physically doable and natural
- Transitions should flow with the narrative arc

Please generate detailed scripts for all ${segments} segments creating a professional ${duration}-second product introduction video.

===START_SCRIPT===
[Write all segment scripts with specific image references here]
===END_SCRIPT===

CRITICAL: Output ONLY the script between ===START_SCRIPT=== and ===END_SCRIPT===. No other text, suggestions, or follow-ups.`;
};

/**
 * LIFESTYLE SHOWCASE SCENARIO
 * Focus: Natural, relatable product usage in daily context
 */
function generateLifestylePrompt({
  duration = 20,
  segments = 3,
  characterWearingImage,
  characterHoldingImage,
  productReferenceImage,
  productName = 'product',
  lifestyleContext = 'daily activities',
  additionalDetails = ''
}) {
  const segmentDuration = Math.round(duration / segments);

  let imageAnalysis = '';
  if (characterWearingImage) {
    imageAnalysis += `Image A (Primary): Character wearing ${productName} in lifestyle context. Analyze the setting and natural posture.`;
  }
  if (characterHoldingImage) {
    imageAnalysis += ` Image B: Character interacting with the ${productName}. Shows natural product usage patterns.`;
  }
  if (productReferenceImage) {
    imageAnalysis += ` Image C: Product details reference for close-up moments.`;
  }

  return `You are an expert lifestyle video scriptwriter. Create a casual, authentic ${duration}-second lifestyle video showing ${productName} in ${lifestyleContext}.

**IMAGE ANALYSIS:**
${imageAnalysis}

**PRODUCT DETAILS:**
- Product: ${productName}
- Lifestyle Context: ${lifestyleContext}
- Additional Details: ${additionalDetails || 'None provided'}

**VIDEO SPECIFICATIONS:**
- Total Duration: ${duration} seconds
- Number of Segments: ${segments}
- Duration Per Segment: ${segmentDuration} seconds
- Scenario: Lifestyle Showcase
- Authenticity Level: Natural, candid, relatable
- Energy: Relaxed and comfortable

**SEGMENT SCRIPT FORMAT:**
For each segment, provide:

Segment [X]: [Lifestyle Activity Title]
Duration: ${segmentDuration} seconds
Activity: [What's happening in this segment]
Camera: [Natural camera style - handheld/steady/POV]
Character Movement: [Natural, everyday movements]
- [Movement 1]
- [Movement 2]
- [Movement 3]
Product Integration: [How product fits naturally]
Lighting: [Natural or ambient lighting]
Background: [Location/environment]
Mood/Feeling: [Authentic, relatable emotion]
Audio: [Ambient sounds or music suggestion]
Transitions: [Smooth flow to next segment]

**GUIDELINES:**
1. Movements should feel unscripted and natural
2. Product usage should feel organic, not forced
3. Camera work should be subtle and non-intrusive
${productReferenceImage ? '4. Reference Image C only for natural detail moments' : ''}
5. Emphasize comfort and practicality of product
6. Show personality and genuine moments

Please generate scripts for ${segments} segments creating an authentic ${duration}-second lifestyle video.

===START_SCRIPT===
[Write all segment scripts here]
===END_SCRIPT===

CRITICAL: Output ONLY the script between ===START_SCRIPT=== and ===END_SCRIPT===. No other text.`;
};

/**
 * LIP SYNC / SPEAKING SCENARIO
 * Focus: Expressive face and verbal communication
 */
function generateLipSyncPrompt({
  duration = 15,
  segments = 3,
  characterWearingImage,
  characterHoldingImage,
  productReferenceImage,
  productName = 'product',
  messageOrSong = 'product benefits',
  additionalDetails = ''
}) {
  const segmentDuration = Math.round(duration / segments);

  return `You are an expert video scriptwriter for speaking/lip-sync content. Create a ${duration}-second lip-sync or speaking video for ${productName}.

**PRIMARY IMAGE:**
Image A: Character wearing ${productName}. Analyze facial features and outfit for lip-sync compatibility.

**VIDEO SPECIFICATIONS:**
- Total Duration: ${duration} seconds
- Number of Segments: ${segments}
- Duration Per Segment: ${segmentDuration} seconds
- Scenario: Lip Sync / Speaking
- Message Focus: ${messageOrSong}

**SEGMENT SCRIPT FORMAT:**
For each segment, provide:

Segment [X]: [Expression Phase Title]
Duration: ${segmentDuration} seconds
Camera: [Focus on face - medium to close-up]
Lip Movements: [Describe speech pattern]
Facial Expressions: [Key emotions to convey]
- [Expression 1]
- [Expression 2]
- [Expression 3]
Head Movements: [Subtle head positioning]
Eye Contact: [Where eyes should look]
Outfit Showcase: [How outfit visible in frame]
Audio: [Suggested song, dialogue, or audio beat]
Energy Level: [1-10]
Transitions: [Expression change to next segment]

**GUIDELINES:**
1. Focus on authentic facial expressions
2. Lip sync must match audio perfectly
3. Vary head positions subtly
4. Keep outfit visible in frame
5. Maintain eye contact with camera or slight variations
6. Emotions should build or vary across segments

Please generate scripts for ${segments} segments.

===START_SCRIPT===
[Write all segment scripts here]
===END_SCRIPT===

CRITICAL: Output ONLY the script between ===START_SCRIPT=== and ===END_SCRIPT===. No other text.`;
};

/**
 * FASHION WALK SCENARIO
 * Focus: Runway-style confident presentation
 */
function generateFashionWalkPrompt({
  duration = 20,
  segments = 3,
  characterWearingImage,
  characterHoldingImage,
  productReferenceImage,
  productName = 'product',
  styleDescription = 'professional fashion',
  additionalDetails = ''
}) {
  const segmentDuration = Math.round(duration / segments);

  return `You are a professional fashion director. Create a ${duration}-second fashion walk video for ${productName}.

**PRIMARY IMAGE:**
Image A: Character wearing ${productName}. Analyze posture, stride, and overall fashion presentation.

**VIDEO SPECIFICATIONS:**
- Total Duration: ${duration} seconds
- Number of Segments: ${segments}
- Duration Per Segment: ${segmentDuration} seconds
- Scenario: Fashion Walk
- Style: ${styleDescription}

**SEGMENT SCRIPT FORMAT:**
For each segment, provide:

Segment [X]: [Fashion Phase Title]
Duration: ${segmentDuration} seconds
Position: [Starting position and direction]
Gait/Stride: [Walking style and pace]
- [Step pattern 1]
- [Step pattern 2]
- [Step pattern 3]
Posture: [Body alignment and elegance]
Camera Path: [How camera follows/frames the walk]
Outfit Angles: [Which angles of outfit to emphasize]
Confidence Level: [Energy and attitude]
Turns/Pivots: [Any direction changes]
Final Position: [Where character ends up]
Transitions: [Connection to next segment]

**GUIDELINES:**
1. Channel runway professionalism
2. Gait should be consistent and graceful
3. Confidence is key - posture reflects strength
4. Outfit must be visible from multiple angles
5. Turns should be smooth and purposeful
6. Final pose should be impactful

Please generate scripts for ${segments} segments.

===START_SCRIPT===
[Write all segment scripts here]
===END_SCRIPT===

CRITICAL: Output ONLY the script between ===START_SCRIPT=== and ===END_SCRIPT===. No other text.`;
};

/**
 * CLOTHING TRANSITION SCENARIO
 * Focus: Smooth transition between looks or styling details
 */
function generateTransitionPrompt({
  duration = 20,
  segments = 3,
  characterWearingImage,
  characterHoldingImage,
  productReferenceImage,
  productName = 'product',
  transitionType = 'outfit change',
  additionalDetails = ''
}) {
  const segmentDuration = Math.round(duration / segments);

  let imageAnalysis = '';
  if (characterWearingImage) {
    imageAnalysis += `Image A (Primary): Current/starting outfit. Analyze styling and transition point.`;
  }
  if (characterHoldingImage) {
    imageAnalysis += ` Image B: Shows product modification or second look perspective.`;
  }
  if (productReferenceImage) {
    imageAnalysis += ` Image C: Product details for styling emphasis.`;
  }

  return `You are an expert styling video director. Create a ${duration}-second video showcasing ${transitionType} with ${productName}.

**IMAGE ANALYSIS:**
${imageAnalysis}

**VIDEO SPECIFICATIONS:**
- Total Duration: ${duration} seconds
- Number of Segments: ${segments}
- Duration Per Segment: ${segmentDuration} seconds
- Scenario: Clothing Transition / Styling Details
- Transition Type: ${transitionType}

**SEGMENT SCRIPT FORMAT:**
For each segment, provide:

Segment [X]: [Transition Phase Title]
Duration: ${segmentDuration} seconds
Starting State: [How segment begins]
Styling Actions: [Specific styling movements]
- [Action 1]
- [Action 2]
- [Action 3]
Product Interaction: [How product features in transition]
Camera Work: [Best angles for this phase]
Lighting Changes: [Any lighting adjustments]
Ending State: [Set up for next segment]
Key Details to Emphasize: [From images or product knowledge]
Smooth Transitions: [Connection to next segment]

**GUIDELINES:**
1. Transitions should feel smooth and intentional
2. Show styling techniques clearly
3. Product should be central to transformation
4. Camera work should highlight changes
5. Each segment builds toward final look
6. Movements should be deliberate and educational

Please generate scripts for ${segments} segments.

===START_SCRIPT===
[Write all segment scripts here]
===END_SCRIPT===

CRITICAL: Output ONLY the script between ===START_SCRIPT=== and ===END_SCRIPT===. No other text.`;
};

export default {
  getScenarioPromptTemplate
};
