/**
 * Video Generation Constants
 * Shared configuration for both frontend and backend
 */

export const VIDEO_DURATIONS = [
  { value: 20, label: '20 seconds', segments: 2 },
  { value: 30, label: '30 seconds', segments: 3 },
  { value: 40, label: '40 seconds', segments: 4 },
];

export const VIDEO_SCENARIOS = [
  { 
    value: 'dancing', 
    label: '💃 Dancing / Movement', 
    description: 'Person dancing or moving in the outfit',
    scriptTemplate: [
      'Person dancing energetically in outfit, full body movement',
      'Close-up of outfit details while dancing',
      'Wide shot showing the complete look in motion'
    ]
  },
  { 
    value: 'product-intro', 
    label: '👕 Product Introduction', 
    description: 'Presenting and showcasing the product',
    scriptTemplate: [
      'Introduce the product with a smile, rotate to show front',
      'Show the details and key features up close',
      'Full outfit reveal and final pose'
    ]
  },
  { 
    value: 'lifestyle', 
    label: '🏃 Lifestyle Showcase', 
    description: 'Wearing outfit in daily activities',
    scriptTemplate: [
      'Walking casually in everyday setting',
      'Sitting or posing naturally in the outfit',
      'Standing confidently showing the complete look'
    ]
  },
  { 
    value: 'lip-sync', 
    label: '🎤 Lip Sync / Speaking', 
    description: 'Lip sync to music or speaking dialogue',
    scriptTemplate: [
      'Person speaking or lip syncing with expression',
      'Change expression and emotion while speaking',
      'Final pose with confident expression'
    ]
  },
  { 
    value: 'fashion-walk', 
    label: '👠 Fashion Walk', 
    description: 'Runway-style fashion walk',
    scriptTemplate: [
      'Walking towards camera in fashion runway style',
      'Turn and walk away showing back view',
      'Return and final pose at camera with confidence'
    ]
  },
  {
    value: 'transition',
    label: '🔄 Clothing Transition',
    description: 'Transition between looks or styling details',
    scriptTemplate: [
      'Start in initial outfit pose',
      'Transition or gesture showing outfit change',
      'Final look reveal in new styling'
    ]
  }
];

export const getScenarioByValue = (value) => {
  return VIDEO_SCENARIOS.find(s => s.value === value);
};

export const getDurationByValue = (value) => {
  return VIDEO_DURATIONS.find(d => d.value === value);
};

export const getSegmentCount = (duration) => {
  const d = getDurationByValue(duration);
  return d?.segments || 3;
};

export const SEGMENT_DURATION = 10; // Each segment is 10 seconds
