/**
 * Enhanced Seed Options Script
 * 
 * Seeds the database with comprehensive prompt options for Phase 1.
 * 
 * NEW FEATURES:
 * - Keywords for each option
 * - Technical details for detailed prompts
 * - Preview images
 * - Validation functions
 * - Better defaults
 */

import mongoose from 'mongoose';
import PromptOption from '../models/PromptOption.js';
import 'dotenv/config';

// ============================================================
// COMPREHENSIVE OPTIONS DATA
// ============================================================

const OPTIONS_DATA = {
  scene: [
    {
      value: 'studio',
      label: 'Professional Studio',
      description: 'Clean studio with seamless backdrop',
      keywords: ['studio', 'professional', 'clean', 'seamless', 'backdrop'],
      technicalDetails: {
        background: 'white seamless paper',
        floor: 'reflective',
        space: '10x10 feet'
      },
      previewImage: '/images/options/scene-studio.jpg',
      sortOrder: 1
    },
    {
      value: 'white-background',
      label: 'White Background',
      description: 'Pure white for product focus',
      keywords: ['white', 'clean', 'minimal', 'product', 'focus'],
      technicalDetails: {
        background: 'pure white #FFFFFF',
        lighting: 'even, no shadows',
        post: 'white balance critical'
      },
      previewImage: '/images/options/scene-white.jpg',
      sortOrder: 2
    },
    {
      value: 'urban-street',
      label: 'Urban Street',
      description: 'City street environment',
      keywords: ['urban', 'street', 'city', 'architecture', 'street art'],
      technicalDetails: {
        location: 'downtown area',
        time: 'golden hour',
        elements: 'architecture, street art'
      },
      previewImage: '/images/options/scene-urban.jpg',
      sortOrder: 3
    },
    {
      value: 'minimalist-indoor',
      label: 'Minimalist Indoor',
      description: 'Simple indoor setting',
      keywords: ['minimalist', 'indoor', 'simple', 'modern', 'clean'],
      technicalDetails: {
        background: 'neutral gray',
        furniture: 'minimal',
        lighting: 'soft, diffused'
      },
      previewImage: '/images/options/scene-minimalist.jpg',
      sortOrder: 4
    },
    {
      value: 'cafe',
      label: 'Cafe',
      description: 'Coffee shop environment',
      keywords: ['cafe', 'coffee shop', 'cozy', 'warm', 'inviting'],
      technicalDetails: {
        setting: 'cozy coffee shop',
        props: 'wooden table, coffee cup',
        ambiance: 'warm, inviting'
      },
      previewImage: '/images/options/scene-cafe.jpg',
      sortOrder: 5
    },
    {
      value: 'outdoor-park',
      label: 'Outdoor Park',
      description: 'Natural park setting',
      keywords: ['outdoor', 'park', 'nature', 'trees', 'grass'],
      technicalDetails: {
        location: 'lush green park',
        lighting: 'natural sunlight',
        elements: 'trees, grass, benches'
      },
      previewImage: '/images/options/scene-park.jpg',
      sortOrder: 6
    },
    {
      value: 'office',
      label: 'Modern Office',
      description: 'Contemporary office space',
      keywords: ['office', 'corporate', 'modern', 'desk', 'professional'],
      technicalDetails: {
        setting: 'modern corporate office',
        furniture: 'desk, chair, computer',
        lighting: 'fluorescent'
      },
      previewImage: '/images/options/scene-office.jpg',
      sortOrder: 7
    },
    {
      value: 'luxury-interior',
      label: 'Luxury Interior',
      description: 'High-end interior',
      keywords: ['luxury', 'high-end', 'elegant', 'interior', 'premium'],
      technicalDetails: {
        decor: 'high-end furniture, artwork',
        materials: 'marble, wood, metal',
        lighting: 'chandelier, accent lights'
      },
      previewImage: '/images/options/scene-luxury.jpg',
      sortOrder: 8
    },
    {
      value: 'rooftop',
      label: 'Rooftop',
      description: 'Urban rooftop with skyline',
      keywords: ['rooftop', 'skyline', 'urban', 'city', 'view'],
      technicalDetails: {
        view: 'city skyline',
        surface: 'concrete or wooden deck',
        elements: 'railings, lounge chairs'
      },
      previewImage: '/images/options/scene-rooftop.jpg',
      sortOrder: 9
    }
  ],

  lighting: [
    {
      value: 'soft-diffused',
      label: 'Soft Diffused',
      description: 'Large softbox, flattering, even',
      keywords: ['soft', 'diffused', 'flattering', 'even', 'softbox'],
      technicalDetails: {
        key_light: '2x3 foot softbox, 45° angle, 2m high',
        fill: 'reflector opposite side',
        ratio: '1:2',
        power: '400W'
      },
      previewImage: '/images/options/lighting-soft.jpg',
      sortOrder: 1
    },
    {
      value: 'natural-window',
      label: 'Natural Window',
      description: 'Soft window light, organic',
      keywords: ['natural', 'window', 'soft', 'organic', 'daylight'],
      technicalDetails: {
        source: 'large window or open shade',
        time: 'morning or late afternoon',
        quality: 'soft, indirect'
      },
      previewImage: '/images/options/lighting-window.jpg',
      sortOrder: 2
    },
    {
      value: 'golden-hour',
      label: 'Golden Hour',
      description: 'Warm sunset/sunrise glow',
      keywords: ['golden hour', 'sunset', 'sunrise', 'warm', 'glow'],
      technicalDetails: {
        direction: 'low angle, warm',
        intensity: 'medium',
        color_temp: '3200K'
      },
      previewImage: '/images/options/lighting-golden.jpg',
      sortOrder: 3
    },
    {
      value: 'dramatic-rembrandt',
      label: 'Dramatic Rembrandt',
      description: 'Strong key light, deep shadows',
      keywords: ['dramatic', 'rembrandt', 'strong', 'shadows', 'key light'],
      technicalDetails: {
        key_light: 'strong single source, 45° high',
        fill: 'minimal',
        shadows: 'deep, defined',
        ratio: '1:4'
      },
      previewImage: '/images/options/lighting-dramatic.jpg',
      sortOrder: 4
    },
    {
      value: 'high-key',
      label: 'High Key',
      description: 'Bright, minimal shadows, clean',
      keywords: ['high key', 'bright', 'clean', 'minimal shadows'],
      technicalDetails: {
        setup: 'multiple soft sources',
        intensity: 'bright',
        shadows: 'minimal',
        ratio: '1:1'
      },
      previewImage: '/images/options/lighting-highkey.jpg',
      sortOrder: 5
    },
    {
      value: 'backlit',
      label: 'Backlit',
      description: 'Light from behind, rim glow',
      keywords: ['backlit', 'rim light', 'silhouette', 'glow'],
      technicalDetails: {
        rim_light: 'from behind subject',
        intensity: 'medium to high',
        effect: 'silhouette, rim glow'
      },
      previewImage: '/images/options/lighting-backlit.jpg',
      sortOrder: 6
    },
    {
      value: 'neon-colored',
      label: 'Neon/Colored',
      description: 'Colored gels, creative mood',
      keywords: ['neon', 'colored', 'gels', 'creative', 'RGB'],
      technicalDetails: {
        gels: 'RGB LED panels',
        colors: 'vibrant',
        intensity: 'medium',
        mood: 'creative, energetic'
      },
      previewImage: '/images/options/lighting-neon.jpg',
      sortOrder: 7
    },
    {
      value: 'overcast-outdoor',
      label: 'Overcast Outdoor',
      description: 'Even outdoor light, no harsh shadows',
      keywords: ['overcast', 'outdoor', 'even', 'cloudy', 'soft'],
      technicalDetails: {
        source: 'cloudy sky',
        quality: 'even, soft',
        direction: 'diffused',
        shadows: 'soft'
      },
      previewImage: '/images/options/lighting-overcast.jpg',
      sortOrder: 8
    }
  ],

  mood: [
    {
      value: 'confident',
      label: 'Confident & Powerful',
      description: 'Strong stance, direct gaze',
      keywords: ['confident', 'powerful', 'strong', 'direct', 'gaze'],
      technicalDetails: {
        pose: 'strong stance, weight on back leg',
        expression: 'direct eye contact',
        body_language: 'open, confident'
      },
      previewImage: '/images/options/mood-confident.jpg',
      sortOrder: 1
    },
    {
      value: 'relaxed',
      label: 'Relaxed & Casual',
      description: 'Natural, comfortable',
      keywords: ['relaxed', 'casual', 'natural', 'comfortable', 'easy'],
      technicalDetails: {
        pose: 'natural standing or sitting',
        expression: 'soft smile',
        body_language: 'relaxed shoulders'
      },
      previewImage: '/images/options/mood-relaxed.jpg',
      sortOrder: 2
    },
    {
      value: 'elegant',
      label: 'Elegant & Sophisticated',
      description: 'Refined, graceful',
      keywords: ['elegant', 'sophisticated', 'refined', 'graceful', 'poised'],
      technicalDetails: {
        pose: 'poised posture',
        expression: 'subtle smile',
        body_language: 'graceful movements'
      },
      previewImage: '/images/options/mood-elegant.jpg',
      sortOrder: 3
    },
    {
      value: 'energetic',
      label: 'Energetic & Dynamic',
      description: 'Active, movement',
      keywords: ['energetic', 'dynamic', 'active', 'movement', 'lively'],
      technicalDetails: {
        pose: 'dynamic stance',
        expression: 'bright smile',
        body_language: 'active, engaged'
      },
      previewImage: '/images/options/mood-energetic.jpg',
      sortOrder: 4
    },
    {
      value: 'playful',
      label: 'Playful & Fun',
      description: 'Lighthearted, joyful',
      keywords: ['playful', 'fun', 'lighthearted', 'joyful', 'cheerful'],
      technicalDetails: {
        pose: 'playful gesture',
        expression: 'big smile',
        body_language: 'light, fun'
      },
      previewImage: '/images/options/mood-playful.jpg',
      sortOrder: 5
    },
    {
      value: 'mysterious',
      label: 'Mysterious & Edgy',
      description: 'Dark, intriguing',
      keywords: ['mysterious', 'edgy', 'dark', 'intriguing', 'enigmatic'],
      technicalDetails: {
        pose: 'contemplative stance',
        expression: 'intense gaze',
        body_language: 'reserved, intriguing'
      },
      previewImage: '/images/options/mood-mysterious.jpg',
      sortOrder: 6
    },
    {
      value: 'romantic',
      label: 'Romantic & Dreamy',
      description: 'Soft, ethereal',
      keywords: ['romantic', 'dreamy', 'soft', 'ethereal', 'gentle'],
      technicalDetails: {
        pose: 'soft, flowing',
        expression: 'dreamy eyes',
        body_language: 'gentle, romantic'
      },
      previewImage: '/images/options/mood-romantic.jpg',
      sortOrder: 7
    },
    {
      value: 'professional',
      label: 'Professional & Corporate',
      description: 'Business-appropriate',
      keywords: ['professional', 'corporate', 'business', 'formal', 'executive'],
      technicalDetails: {
        pose: 'professional stance',
        expression: 'confident smile',
        body_language: 'business appropriate'
      },
      previewImage: '/images/options/mood-professional.jpg',
      sortOrder: 8
    }
  ],

  style: [
    {
      value: 'minimalist',
      label: 'Minimalist',
      description: 'Clean, simple, negative space',
      keywords: ['minimalist', 'clean', 'simple', 'negative space', 'modern'],
      technicalDetails: {
        composition: 'clean layout',
        colors: 'limited palette',
        focus: 'subject isolation'
      },
      previewImage: '/images/options/style-minimalist.jpg',
      sortOrder: 1
    },
    {
      value: 'editorial',
      label: 'Editorial',
      description: 'Magazine-quality, artistic',
      keywords: ['editorial', 'magazine', 'artistic', 'high fashion', 'stylish'],
      technicalDetails: {
        composition: 'artistic framing',
        lighting: 'dramatic',
        post_processing: 'retouched'
      },
      previewImage: '/images/options/style-editorial.jpg',
      sortOrder: 2
    },
    {
      value: 'commercial',
      label: 'Commercial',
      description: 'Product-focused, selling',
      keywords: ['commercial', 'product', 'selling', 'advertising', 'marketable'],
      technicalDetails: {
        composition: 'product centered',
        lighting: 'clean, professional',
        focus: 'saleable image'
      },
      previewImage: '/images/options/style-commercial.jpg',
      sortOrder: 3
    },
    {
      value: 'lifestyle',
      label: 'Lifestyle',
      description: 'Natural, candid feel',
      keywords: ['lifestyle', 'natural', 'candid', 'real', 'authentic'],
      technicalDetails: {
        composition: 'natural framing',
        lighting: 'available light',
        mood: 'authentic, real life'
      },
      previewImage: '/images/options/style-lifestyle.jpg',
      sortOrder: 4
    },
    {
      value: 'high-fashion',
      label: 'High Fashion',
      description: 'Avant-garde, dramatic',
      keywords: ['high fashion', 'avant-garde', 'dramatic', 'couture', 'elite'],
      technicalDetails: {
        composition: 'artistic, dramatic',
        lighting: 'theatrical',
        styling: 'experimental'
      },
      previewImage: '/images/options/style-highfashion.jpg',
      sortOrder: 5
    },
    {
      value: 'vintage',
      label: 'Vintage/Retro',
      description: 'Film-like, nostalgic',
      keywords: ['vintage', 'retro', 'film', 'nostalgic', 'classic'],
      technicalDetails: {
        lighting: 'warm, film-like',
        colors: 'muted, nostalgic',
        mood: 'timeless'
      },
      previewImage: '/images/options/style-vintage.jpg',
      sortOrder: 6
    },
    {
      value: 'street',
      label: 'Street Style',
      description: 'Urban, authentic',
      keywords: ['street', 'urban', 'authentic', 'city', 'real'],
      technicalDetails: {
        composition: 'street photography style',
        lighting: 'available urban light',
        mood: 'raw, authentic'
      },
      previewImage: '/images/options/style-street.jpg',
      sortOrder: 7
    },
    {
      value: 'artistic',
      label: 'Artistic',
      description: 'Creative, experimental',
      keywords: ['artistic', 'creative', 'experimental', 'abstract', 'unique'],
      technicalDetails: {
        composition: 'non-traditional',
        lighting: 'creative',
        concept: 'experimental'
      },
      previewImage: '/images/options/style-artistic.jpg',
      sortOrder: 8
    }
  ],

  colorPalette: [
    {
      value: 'neutral',
      label: 'Neutral Tones',
      description: 'Black, white, gray, beige',
      keywords: ['neutral', 'black', 'white', 'gray', 'beige'],
      technicalDetails: {
        colors: 'black, white, gray, beige',
        mood: 'timeless, professional',
        contrast: 'high contrast possible'
      },
      previewImage: '/images/options/palette-neutral.jpg',
      sortOrder: 1
    },
    {
      value: 'warm',
      label: 'Warm Tones',
      description: 'Red, orange, gold, earth',
      keywords: ['warm', 'red', 'orange', 'gold', 'earth'],
      technicalDetails: {
        colors: 'red, orange, gold, earth tones',
        mood: 'inviting, energetic',
        temperature: 'warm'
      },
      previewImage: '/images/options/palette-warm.jpg',
      sortOrder: 2
    },
    {
      value: 'cool',
      label: 'Cool Tones',
      description: 'Blue, teal, silver',
      keywords: ['cool', 'blue', 'teal', 'silver', 'icy'],
      technicalDetails: {
        colors: 'blue, teal, silver',
        mood: 'calm, professional',
        temperature: 'cool'
      },
      previewImage: '/images/options/palette-cool.jpg',
      sortOrder: 3
    },
    {
      value: 'vibrant',
      label: 'Vibrant',
      description: 'Bold, saturated colors',
      keywords: ['vibrant', 'bold', 'saturated', 'bright', 'colorful'],
      technicalDetails: {
        colors: 'bold, saturated',
        mood: 'energetic, fun',
        saturation: 'high'
      },
      previewImage: '/images/options/palette-vibrant.jpg',
      sortOrder: 4
    },
    {
      value: 'pastel',
      label: 'Pastel',
      description: 'Soft, muted, delicate',
      keywords: ['pastel', 'soft', 'muted', 'delicate', 'gentle'],
      technicalDetails: {
        colors: 'soft pastels',
        mood: 'gentle, feminine',
        saturation: 'low'
      },
      previewImage: '/images/options/palette-pastel.jpg',
      sortOrder: 5
    },
    {
      value: 'monochrome',
      label: 'Monochrome',
      description: 'Single color variations',
      keywords: ['monochrome', 'single color', 'variations', 'tonal'],
      technicalDetails: {
        colors: 'single color family',
        mood: 'sophisticated, classic',
        contrast: 'tonal variations'
      },
      previewImage: '/images/options/palette-monochrome.jpg',
      sortOrder: 6
    },
    {
      value: 'earth',
      label: 'Earth Tones',
      description: 'Brown, olive, terracotta',
      keywords: ['earth', 'brown', 'olive', 'terracotta', 'natural'],
      technicalDetails: {
        colors: 'brown, olive, terracotta',
        mood: 'natural, grounded',
        inspiration: 'nature'
      },
      previewImage: '/images/options/palette-earth.jpg',
      sortOrder: 7
    },
    {
      value: 'jewel',
      label: 'Jewel Tones',
      description: 'Deep emerald, ruby, sapphire',
      keywords: ['jewel', 'emerald', 'ruby', 'sapphire', 'deep'],
      technicalDetails: {
        colors: 'deep emerald, ruby, sapphire',
        mood: 'luxurious, rich',
        saturation: 'high, deep'
      },
      previewImage: '/images/options/palette-jewel.jpg',
      sortOrder: 8
    }
  ],

  cameraAngle: [
    {
      value: 'eye-level',
      label: 'Eye Level',
      description: 'Straight on, natural perspective',
      keywords: ['eye level', 'straight on', 'natural', 'perspective'],
      technicalDetails: {
        height: 'subject eye level',
        distance: '3-4 meters',
        lens: '85mm f/1.8',
        perspective: 'natural'
      },
      previewImage: '/images/options/angle-eyelevel.jpg',
      sortOrder: 1
    },
    {
      value: 'slightly-above',
      label: 'Slightly Above',
      description: 'Flattering, slimming',
      keywords: ['above', 'flattering', 'slimming', 'high angle'],
      technicalDetails: {
        height: '20-30cm above eye level',
        distance: '3-4 meters',
        lens: '85mm f/1.8',
        effect: 'slimming'
      },
      previewImage: '/images/options/angle-above.jpg',
      sortOrder: 2
    },
    {
      value: 'low-angle',
      label: 'Low Angle',
      description: 'Looking up, powerful',
      keywords: ['low angle', 'looking up', 'powerful', 'heroic'],
      technicalDetails: {
        height: '1 meter below eye level',
        distance: '2-3 meters',
        lens: '50mm f/1.4',
        effect: 'powerful'
      },
      previewImage: '/images/options/angle-low.jpg',
      sortOrder: 3
    },
    {
      value: 'three-quarter',
      label: 'Three-Quarter',
      description: '45-degree angle, dynamic',
      keywords: ['three quarter', '45 degree', 'dynamic', 'angled'],
      technicalDetails: {
        angle: '45° to subject',
        height: 'eye level',
        distance: '3-4 meters',
        lens: '70mm f/1.8',
        effect: 'dynamic'
      },
      previewImage: '/images/options/angle-threequarter.jpg',
      sortOrder: 4
    },
    {
      value: 'full-body-straight',
      label: 'Full Body Straight',
      description: 'Head to toe, centered',
      keywords: ['full body', 'straight', 'head to toe', 'centered'],
      technicalDetails: {
        height: 'eye level',
        distance: '4-5 meters',
        lens: '50mm f/1.8',
        perspective: 'straight on'
      },
      previewImage: '/images/options/angle-fullbody.jpg',
      sortOrder: 5
    },
    {
      value: 'close-up-detail',
      label: 'Close-Up Detail',
      description: 'Focus on product details',
      keywords: ['close up', 'detail', 'product focus', 'macro'],
      technicalDetails: {
        distance: '1-2 meters',
        lens: '100mm f/2.8',
        focus: 'product details',
        depth: 'shallow'
      },
      previewImage: '/images/options/angle-closeup.jpg',
      sortOrder: 6
    }
  ]
};

// ============================================================
// SEEDING FUNCTIONS
// ============================================================

/**
 * Seed all options into database
 */
export async function seedOptions() {
  console.log('\n🌱 SEEDING PROMPT OPTIONS...');

  let seeded = 0;
  let updated = 0;
  let errors = 0;

  for (const [category, options] of Object.entries(OPTIONS_DATA)) {
    console.log(`\n📂 Seeding category: ${category}`);

    for (const optionData of options) {
      try {
        const existing = await PromptOption.findOne({ value: optionData.value });

        if (existing) {
          // Update existing
          Object.assign(existing, optionData);
          await existing.save();
          updated++;
          console.log(`   ✅ Updated: ${optionData.value}`);
        } else {
          // Create new
          await PromptOption.create(optionData);
          seeded++;
          console.log(`   🆕 Created: ${optionData.value}`);
        }
      } catch (error) {
        errors++;
        console.log(`   ❌ Error with ${optionData.value}: ${error.message}`);
      }
    }
  }

  console.log(`\n🌱 SEEDING COMPLETE:`);
  console.log(`   🆕 Seeded: ${seeded}`);
  console.log(`   🔄 Updated: ${updated}`);
  console.log(`   ❌ Errors: ${errors}`);

  return { seeded, updated, errors };
}

/**
 * Validate seeded data
 */
export async function validateOptions() {
  console.log('\n🔍 VALIDATING SEED DATA...');

  const issues = [];
  let valid = true;

  // Check each category has options
  for (const category of Object.keys(OPTIONS_DATA)) {
    const count = await PromptOption.countDocuments({ category, isActive: true });
    if (count === 0) {
      issues.push(`Category '${category}' has no active options`);
      valid = false;
    } else {
      console.log(`   ✅ ${category}: ${count} active options`);
    }
  }

  // Check for duplicate values
  const duplicates = await PromptOption.aggregate([
    { $group: { _id: '$value', count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } }
  ]);

  if (duplicates.length > 0) {
    issues.push(`Found ${duplicates.length} duplicate values`);
    valid = false;
  }

  // Check required fields
  const options = await PromptOption.find({});
  for (const option of options) {
    if (!option.keywords || option.keywords.length === 0) {
      issues.push(`Option '${option.value}' missing keywords`);
    }
    if (!option.technicalDetails || Object.keys(option.technicalDetails).length === 0) {
      issues.push(`Option '${option.value}' missing technical details`);
    }
  }

  console.log(`\n🔍 VALIDATION RESULT: ${valid ? 'PASSED' : 'FAILED'}`);
  if (issues.length > 0) {
    console.log('Issues found:');
    issues.forEach(issue => console.log(`   - ${issue}`));
  }

  return { valid, issues };
}

/**
 * Clear all options (for testing)
 */
export async function clearOptions() {
  console.log('\n🗑️  CLEARING ALL OPTIONS...');
  const result = await PromptOption.deleteMany({});
  console.log(`   Deleted ${result.deletedCount} options`);
  return result;
}

// ============================================================
// CLI EXECUTION
// ============================================================

// Run if called directly
const isMainModule = import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`;

if (isMainModule) {
  // Connect to MongoDB (you'll need to configure your connection)
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartwardrobe';
  
  try {
    await mongoose.connect(mongoUri);
    console.log('📊 Connected to MongoDB');

    const args = process.argv.slice(2);
    
    if (args.includes('--clear')) {
      await clearOptions();
    }
    
    if (args.includes('--seed')) {
      await seedOptions();
    }
    
    if (args.includes('--validate')) {
      await validateOptions();
    }
    
    if (args.length === 0) {
      // Default: seed and validate
      await seedOptions();
      await validateOptions();
    }

  } catch (error) {
    console.error('💥 Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📊 Disconnected from MongoDB');
  }
}

// ============================================================
// EXPORTS
// ============================================================

export default {
  seedOptions,
  validateOptions,
  clearOptions,
  OPTIONS_DATA
};
