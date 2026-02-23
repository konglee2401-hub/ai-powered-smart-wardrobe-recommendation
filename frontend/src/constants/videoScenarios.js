/**
 * Video Generation Scenarios with Detailed Movement Templates
 * For 20-30 second video scenarios with character-focused movements
 */

export const VIDEO_SCENARIOS = {
  // ================== FASHION FLOW ==================
  'fashion-flow': {
    name: '👗 Fashion Flow',
    description: 'Smooth, elegant showcase of outfit with natural movement',
    duration: 20,
    segments: 3,
    aspectRatio: '9:16',
    frameChaining: true,
    scripts: [
      {
        segment: 1,
        duration: 7,
        title: 'Entrance - Natural Walk',
        movements: [
          'Start with character standing still facing forward, confident posture',
          'Slowly turn 45 degrees to the right, showcase side profile',
          'Walk slowly toward camera (3-4 paces), smooth controlled stride',
          'Subtle hand gesture showing off the outfit details'
        ],
        cameraDetails: 'Start wide shot, gradually zoom to medium shot',
        lighting: 'Soft, flattering lighting from front and side',
        mood: 'Confident, poised, professional'
      },
      {
        segment: 2,
        duration: 7,
        title: 'Turn & Showcase',
        movements: [
          'Execute a graceful 360-degree slow spin (5-6 seconds)',
          'Stop at 180 degrees (back view) and hold for 1 second',
          'Continue turn to face camera',
          'Adjust posture, one hand on hip, highlight waistline'
        ],
        cameraDetails: 'Medium shot following the rotation, slight overhead angle',
        lighting: 'Consistent soft key light, subtle rim light on edges',
        mood: 'Sophisticated, elegant, fashion-forward'
      },
      {
        segment: 3,
        duration: 6,
        title: 'Close-up Details & Finale',
        movements: [
          'Walk past camera (moving diagonally left to right)',
          'Stop, look over shoulder at camera',
          'Final pose: full body, confident stance, slight smile',
          'Hold frame for 2 seconds'
        ],
        cameraDetails: 'Transition from wide to close-up on face, final full-body frame',
        lighting: 'Bright, catching all details of the outfit',
        mood: 'Approachable, fashionable, memorable'
      }
    ]
  },

  // ================== PRODUCT ZOOM ==================
  'product-zoom': {
    name: '🎯 Product Zoom',
    description: 'Start with product detail, zoom out to show full outfit',
    duration: 20,
    segments: 3,
    aspectRatio: '16:9',
    frameChaining: false,
    scripts: [
      {
        segment: 1,
        duration: 6,
        title: 'Product Close-up',
        movements: [
          'Extreme close-up of key product detail (shoes, bag, jewelry)',
          'Slow pan across product (2-3 seconds)',
          'Slight rotation to show texture and quality',
          'Subtle background blur showing hint of character'
        ],
        cameraDetails: 'Macro/close-up shot, shallow depth of field',
        lighting: 'Dramatic side lighting to highlight product texture',
        mood: 'Premium, high-quality, desirable'
      },
      {
        segment: 2,
        duration: 7,
        title: 'Zoom Out to Fit',
        movements: [
          'Camera zooms out gradually (3-4 seconds)',
          'Product moves from close-up to wearable context',
          'Character enters frame, repositioning the item on body',
          'Hands gesture showing how product is worn'
        ],
        cameraDetails: 'Smooth zoom transition, focus shift from product to character',
        lighting: 'Transition from dramatic product light to full-body lighting',
        mood: 'Functional, stylish, integrated'
      },
      {
        segment: 3,
        duration: 7,
        title: 'Full Outfit Showcase',
        movements: [
          'Character does quarter turn, showing product in context',
          'Walk 2-3 steps toward camera',
          'Strike confident pose highlighting the product on body',
          'Look at camera with approving expression'
        ],
        cameraDetails: 'Medium to full-body shot, product clearly visible on character',
        lighting: 'Natural, even lighting across whole frame',
        mood: 'Confident, satisfied, fashionable'
      }
    ]
  },

  // ================== STYLING TIPS ==================
  'styling-tips': {
    name: '💡 Styling Tips',
    description: 'Educational movement showing how to style and wear the outfit',
    duration: 25,
    segments: 4,
    aspectRatio: '9:16',
    frameChaining: true,
    scripts: [
      {
        segment: 1,
        duration: 6,
        title: 'Layering & Base',
        movements: [
          'Start standing, hands at sides showing full base outfit',
          'Point to different layers (shirt, pants, accessories)',
          'Turn around slowly to show how layers look from back',
          'Make small adjustments to show fit and positioning'
        ],
        cameraDetails: 'Medium full-body shot at eye level',
        lighting: 'Clear, bright lighting to show all layers',
        mood: 'Educational, cheerful, instructive'
      },
      {
        segment: 2,
        duration: 6,
        title: 'Accessory Styling',
        movements: [
          'Focus on accessories: hold up hand to show jewelry',
          'Adjust accessory on body, hand movements are key',
          'Step back to show whole look with accessories',
          'Pose showing how accessories complete the outfit'
        ],
        cameraDetails: 'Start close on accessories, pull back to full body',
        lighting: 'Highlight accessories with directed light',
        mood: 'Inspiring, practical, creative'
      },
      {
        segment: 3,
        duration: 6,
        title: 'Movement & Comfort',
        movements: [
          'Demonstrate comfortable movement (walking, reaching)',
          'Show range of motion, bending, stretching',
          'Sit down and stand up smoothly',
          'Final pose showing outfit drapes well with movement'
        ],
        cameraDetails: 'Follow character movements, wide shot',
        lighting: 'Natural light following movement',
        mood: 'Practical, comfortable, versatile'
      },
      {
        segment: 4,
        duration: 7,
        title: 'Final Verdict',
        movements: [
          'Walk forward with confidence (3-4 paces)',
          'Stop, turn slightly, hand on hip',
          'Nod in approval, genuine expression',
          'Final pose: full height, shoulders back, confident smile'
        ],
        cameraDetails: 'Follow walk, end with portrait-style final shot',
        lighting: 'Flattering full-body lighting',
        mood: 'Positive, empowering, confident'
      }
    ]
  },

  // ================== CASUAL VIBE ==================
  'casual-vibe': {
    name: '🌟 Casual Vibe',
    description: 'Relaxed, natural energy with candid-style movements',
    duration: 20,
    segments: 2,
    aspectRatio: '9:16',
    frameChaining: true,
    scripts: [
      {
        segment: 1,
        duration: 10,
        title: 'Casual Stroll',
        movements: [
          'Start with character looking away from camera, relaxed stance',
          'Turn and walk toward camera with natural gait',
          'Mid-walk, glance at camera with subtle smile',
          'Stop and adjust outfit naturally (pulling down shirt, moving hair)',
          'Lean against something or stand naturally positioned'
        ],
        cameraDetails: 'Follow walking motion, handheld feel for casual energy',
        lighting: 'Natural, warm lighting like golden hour',
        mood: 'Relaxed, casual, approachable, everyday'
      },
      {
        segment: 2,
        duration: 10,
        title: 'Candid Moments',
        movements: [
          'Quick movements: touch hair, adjust glasses or collar',
          'Look over shoulder with genuine expression',
          'Sit on edge of chair or stool briefly',
          'Stand up and do a little half-turn',
          'End with arms at sides, natural, comfortable expression'
        ],
        cameraDetails: 'More intimate close-ups, some camera movement',
        lighting: 'Consistent warm, natural lighting',
        mood: 'Authentic, genuine, relatable, friendly'
      }
    ]
  },

  // ================== GLAMOUR SLOW-MO ==================
  'glamour-slow-motion': {
    name: '✨ Glamour Slow-Motion',
    description: 'Luxurious slow-motion movements for high-end products',
    duration: 20,
    segments: 2,
    aspectRatio: '9:16',
    frameChaining: false,
    scripts: [
      {
        segment: 1,
        duration: 10,
        title: 'Hair & Movement Flow',
        movements: [
          'Start still, camera focused on face and hair',
          'Slow head turn (5-second turn) from center to 45 degrees',
          'Hair should flow/float in slow motion',
          'Toss hair very slowly back over shoulder',
          'Shoulders relax, showing neck and collarbone '
        ],
        cameraDetails: 'Close-up on upper body and hair, very slight camera movement',
        lighting: 'Dramatic side/back lighting for hair emphasis',
        mood: 'Luxurious, glamorous, high-fashion, premium'
      },
      {
        segment: 2,
        duration: 10,
        title: 'Full Body Slow Elegance',
        movements: [
          'Full body shot, character slowly walks forward (8-second walk)',
          'Arm swings very gradually and deliberately',
          'Fabric movements flowing slowly (dress, fabric should flutter)',
          'Stop with perfect posture, shoulders back',
          'Hold final pose showing complete outfit in slow-mo beauty'
        ],
        cameraDetails: 'Wide to medium shot, minimal camera movement (maybe slow zoom)',
        lighting: 'Full, even luxurious lighting highlighting all details',
        mood: 'Premium quality, timeless, elegant, exclusive'
      }
    ]
  },

  // ================== DYNAMIC ENERGY ==================
  'dynamic-energy': {
    name: '⚡ Dynamic Energy',
    description: 'Fast-paced, energetic movements for youthful, trendy looks',
    duration: 20,
    segments: 3,
    aspectRatio: '9:16',
    frameChaining: false,
    scripts: [
      {
        segment: 1,
        duration: 6,
        title: 'Entrance Energy',
        movements: [
          'Dynamic jump or quick turn entry into frame',
          'Snap to attention with hands framing outfit',
          'Quick head snap looking at camera',
          'Snap fingers or do quick gesture motion'
        ],
        cameraDetails: 'Dynamic quick cuts, slightly lower angle to show confidence',
        lighting: 'Bright, energetic lighting with some color accent',
        mood: 'Energetic, young, trendy, fun'
      },
      {
        segment: 2,
        duration: 7,
        title: 'Quick Transitions',
        movements: [
          'Fast-paced quarter turns (360 degree in 3 seconds)',
          'Stance changes: feet wide, feet together, one leg forward',
          'Hand movements that complement the outfit',
          'Quick side-to-side sway to music-like beat'
        ],
        cameraDetails: 'Quick pans following movement, dynamic angles',
        lighting: 'Bold, energetic colors and high contrast',
        mood: 'Confident, bold, playful, trend-setting'
      },
      {
        segment: 3,
        duration: 7,
        title: 'Power Pose Finale',
        movements: [
          'Plant feet firmly in wide confident stance',
          'Hands on hips or behind neck in power pose',
          'Strong eye contact with camera, assured expression',
          'Hold power pose for 2-3 seconds with conviction'
        ],
        cameraDetails: 'Medium shot, lower angle emphasizing power and confidence',
        lighting: 'Strong, directional lighting for impact',
        mood: 'Powerful, confident, statement-making, unforgettable'
      }
    ]
  }
};

/**
 * Video Style Options - Speed and Movement Characteristics
 */
export const VIDEO_STYLES = {
  'slow-motion': {
    name: '🎬 Slow Motion',
    description: 'Graceful, luxurious feel - 50% speed',
    speed: 0.5,
    characteristics: [
      'Hair flows and floats',
      'Fabric movements are visible',
      'Subtle hand movements are emphasized',
      'Premium, high-fashion feel'
    ]
  },
  'normal': {
    name: '▶️ Normal Speed',
    description: 'Natural, everyday movements',
    speed: 1,
    characteristics: [
      'Realistic movement speed',
      'Natural walking and positioning',
      'Comfortable to watch',
      'Most versatile for all products'
    ]
  },
  'quick-cuts': {
    name: '⚡ Quick Cuts',
    description: 'Fast, energetic with transitions - 125% speed',
    speed: 1.25,
    characteristics: [
      'Dynamic, youthful energy',
      'Multiple poses per segment more visible',
      'Best for trendy/casual products',
      'Social media friendly pace'
    ]
  },
  'graceful-float': {
    name: '✨ Graceful Float',
    description: 'Very smooth with floating feel - 60% speed + stabilization',
    speed: 0.6,
    characteristics: [
      'Maximum elegance',
      'Premium product showcase',
      'Best for luxury items',
      'Most flattering movement patterns'
    ]
  }
};

/**
 * Video Generation Presets - Preset combinations of scenario + style
 */
export const VIDEO_GENERATION_PRESETS = {
  'luxury-fashion': {
    name: '👑 Luxury Fashion',
    scenario: 'fashion-flow',
    style: 'graceful-float',
    description: 'Premium fashion showcase with elegant slow movements'
  },
  'casual-everyday': {
    name: '👖 Casual Everyday',
    scenario: 'casual-vibe',
    style: 'normal',
    description: 'Relaxed, natural, everyday outfit styling'
  },
  'trending-now': {
    name: '🔥 Trending Now',
    scenario: 'dynamic-energy',
    style: 'quick-cuts',
    description: 'Energetic, youthful, social media optimized'
  },
  'product-focus': {
    name: '🎯 Product Focus',
    scenario: 'product-zoom',
    style: 'slow-motion',
    description: 'Highlight product details with emphasis'
  },
  'how-to-style': {
    name: '💡 How To Style',
    scenario: 'styling-tips',
    style: 'normal',
    description: 'Educational styling guide with clear movements'
  }
};

/**
 * Camera Movement Styles
 */
export const CAMERA_MOVEMENTS = {
  'static': {
    name: '📍 Static',
    description: 'Fixed camera position',
    movements: ['None - camera stays in place']
  },
  'smooth-zoom': {
    name: '🔍 Smooth Zoom',
    description: 'Gradual zoom in/out',
    movements: ['Slow zoom in from wide to close-up', 'Slow zoom out from close-up to wide']
  },
  'following-pan': {
    name: '📹 Following Pan',
    description: 'Camera follows character movement',
    movements: ['Pan with walking character', 'Follow turns and rotations', 'Track hand movements']
  },
  'dynamic-angles': {
    name: '⚙️ Dynamic Angles',
    description: 'Multiple camera angles and movements',
    movements: ['Quick angle changes', 'Directional pans', 'Height variations']
  }
};

/**
 * Lighting Presets
 */
export const LIGHTING_PRESETS = {
  'golden-hour': {
    name: '🌅 Golden Hour',
    description: 'Warm, flattering sunset lighting',
    color: '#FFB84D',
    intensity: 0.8,
    characteristics: ['Warm tones', 'Flattering shadows', 'Premium feel']
  },
  'studio-bright': {
    name: '💡 Studio Bright',
    description: 'Even, bright, professional studio lighting',
    color: '#FFFFFF',
    intensity: 1,
    characteristics: ['Clear details', 'All colors accurate', 'Professional']
  },
  'soft-diffused': {
    name: '☁️ Soft Diffused',
    description: 'Gentle, blemish-forgiving light',
    color: '#F5E6D3',
    intensity: 0.7,
    characteristics: ['Flattering', 'No harsh shadows', 'Skin-friendly']
  },
  'dramatic-side': {
    name: '🎭 Dramatic Side',
    description: 'Side lighting for dimension and texture',
    color: '#FFE4B5',
    intensity: 0.9,
    characteristics: ['Textured', 'Dimensional', 'High-fashion']
  }
};
