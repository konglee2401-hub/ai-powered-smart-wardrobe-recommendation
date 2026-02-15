export async function buildDetailedVideoPrompt(options) {
  const {
    characterAnalysis,
    productAnalysis,
    userSelections,
    videoOptions,
    customVideoPrompt,
    imageCount
  } = options;

  let prompt = '';

  // Base description
  prompt += `Create a ${videoOptions.duration}-second fashion video showcasing:\n\n`;

  // Character info
  prompt += `Character: ${typeof characterAnalysis === 'string' ? characterAnalysis.substring(0, 200) : JSON.stringify(characterAnalysis).substring(0, 200)}\n\n`;

  // Product info
  prompt += `Product: ${typeof productAnalysis === 'string' ? productAnalysis.substring(0, 200) : JSON.stringify(productAnalysis).substring(0, 200)}\n\n`;

  // Styling
  if (userSelections.scene) {
    prompt += `Scene: ${userSelections.scene}\n`;
  }
  if (userSelections.lighting) {
    prompt += `Lighting: ${userSelections.lighting}\n`;
  }
  if (userSelections.mood) {
    prompt += `Mood: ${userSelections.mood}\n`;
  }
  if (userSelections.style) {
    prompt += `Style: ${userSelections.style}\n`;
  }

  // Camera movement
  prompt += `\nCamera Movement: ${videoOptions.cameraMovement}\n`;

  // Transitions
  if (imageCount > 1) {
    prompt += `Transitions: ${videoOptions.transitionStyle} between ${imageCount} images\n`;
  }

  // Aspect ratio
  prompt += `Aspect Ratio: ${videoOptions.aspectRatio}\n`;

  // Music
  if (videoOptions.addMusic && videoOptions.musicStyle) {
    prompt += `Background Music: ${videoOptions.musicStyle}\n`;
  }

  // Custom prompt
  if (customVideoPrompt) {
    prompt += `\nAdditional Instructions: ${customVideoPrompt}\n`;
  }

  // Technical specs
  prompt += `\nTechnical: ${videoOptions.fps} FPS, smooth motion, high quality, professional fashion videography`;

  return prompt;
}