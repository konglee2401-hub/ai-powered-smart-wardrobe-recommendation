const RECOMMENDATION_LABELS = {
  scene: 'Scene',
  lighting: 'Lighting',
  mood: 'Mood',
  style: 'Style',
  colorPalette: 'Color Palette',
  cameraAngle: 'Camera Angle',
  hairstyle: 'Hairstyle',
  makeup: 'Makeup',
  bottoms: 'Bottoms',
  shoes: 'Shoes',
  accessories: 'Accessories',
  outerwear: 'Outerwear',
  framing: 'Framing',
  expression: 'Expression',
  gesture: 'Gesture',
  textOverlayZone: 'Text Overlay Zone',
  productPresence: 'Product Presence',
  storyRole: 'Story Role',
  pose: 'Pose',
  sceneDepth: 'Scene Depth',
  propCue: 'Prop Cue'
};

function startCase(value = '') {
  return String(value)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getRecommendationLabel(category) {
  return RECOMMENDATION_LABELS[category] || startCase(category);
}

export { RECOMMENDATION_LABELS };
