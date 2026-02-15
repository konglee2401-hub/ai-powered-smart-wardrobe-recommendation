import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import PromptOption from './models/PromptOption.js';

const DEFAULT_OPTIONS = {
  scene: [
    { value: 'studio', label: 'Studio (Clean White)', description: 'Professional studio with clean white background' },
    { value: 'outdoor-natural', label: 'Outdoor Natural', description: 'Natural outdoor setting with greenery' },
    { value: 'urban-street', label: 'Urban Street', description: 'City street or urban environment' },
    { value: 'indoor-cozy', label: 'Indoor Cozy', description: 'Warm indoor setting' },
    { value: 'minimalist', label: 'Minimalist Background', description: 'Simple, clean background' },
    { value: 'luxury', label: 'Luxury Setting', description: 'High-end, luxurious environment' },
    { value: 'beach', label: 'Beach', description: 'Beach or coastal setting' },
    { value: 'forest', label: 'Forest', description: 'Forest or woodland setting' },
    { value: 'rooftop', label: 'Rooftop', description: 'Urban rooftop with city views' }
  ],
  
  lighting: [
    { value: 'natural', label: 'Natural Light', description: 'Soft natural daylight' },
    { value: 'soft-diffused', label: 'Soft Diffused', description: 'Soft, even lighting' },
    { value: 'dramatic', label: 'Dramatic Lighting', description: 'High contrast, dramatic shadows' },
    { value: 'golden-hour', label: 'Golden Hour', description: 'Warm sunset/sunrise lighting' },
    { value: 'studio-professional', label: 'Studio Professional', description: 'Professional studio lighting setup' },
    { value: 'backlit', label: 'Backlit', description: 'Light from behind subject' },
    { value: 'rim-light', label: 'Rim Light', description: 'Edge lighting effect' },
    { value: 'low-key', label: 'Low Key', description: 'Dark, moody lighting' },
    { value: 'high-key', label: 'High Key', description: 'Bright, airy lighting' }
  ],
  
  mood: [
    { value: 'confident', label: 'Confident', description: 'Strong, self-assured presence' },
    { value: 'elegant', label: 'Elegant', description: 'Graceful and sophisticated' },
    { value: 'casual', label: 'Casual', description: 'Relaxed and natural' },
    { value: 'energetic', label: 'Energetic', description: 'Dynamic and lively' },
    { value: 'mysterious', label: 'Mysterious', description: 'Enigmatic and intriguing' },
    { value: 'playful', label: 'Playful', description: 'Fun and lighthearted' },
    { value: 'romantic', label: 'Romantic', description: 'Soft and dreamy' },
    { value: 'powerful', label: 'Powerful', description: 'Strong and commanding' },
    { value: 'serene', label: 'Serene', description: 'Calm and peaceful' }
  ],
  
  style: [
    { value: 'fashion-editorial', label: 'Fashion Editorial', description: 'High-fashion magazine style' },
    { value: 'commercial', label: 'Commercial', description: 'Product-focused commercial photography' },
    { value: 'lifestyle', label: 'Lifestyle', description: 'Natural, everyday lifestyle' },
    { value: 'artistic', label: 'Artistic', description: 'Creative and artistic approach' },
    { value: 'minimalist', label: 'Minimalist', description: 'Clean, simple aesthetic' },
    { value: 'vintage', label: 'Vintage', description: 'Retro or vintage style' },
    { value: 'street-style', label: 'Street Style', description: 'Urban street fashion' },
    { value: 'luxury', label: 'Luxury', description: 'High-end luxury aesthetic' },
    { value: 'avant-garde', label: 'Avant-Garde', description: 'Experimental and bold' }
  ],
  
  colorPalette: [
    { value: 'vibrant', label: 'Vibrant', description: 'Bright, saturated colors' },
    { value: 'pastel', label: 'Pastel', description: 'Soft, muted pastel tones' },
    { value: 'monochrome', label: 'Monochrome', description: 'Black and white or single color' },
    { value: 'earth-tones', label: 'Earth Tones', description: 'Natural, earthy colors' },
    { value: 'bold-contrast', label: 'Bold Contrast', description: 'High contrast color combinations' },
    { value: 'muted', label: 'Muted', description: 'Subtle, desaturated colors' },
    { value: 'neon', label: 'Neon', description: 'Bright neon colors' },
    { value: 'jewel-tones', label: 'Jewel Tones', description: 'Rich, deep colors' },
    { value: 'neutral', label: 'Neutral', description: 'Beige, cream, and neutral tones' }
  ],
  
  useCase: [
    { value: 'fashion-editorial', label: 'Fashion Editorial', description: 'Magazine-style fashion photography' },
    { value: 'e-commerce', label: 'E-commerce Product', description: 'Clean product photography for online stores' },
    { value: 'social-media', label: 'Social Media Content', description: 'Eye-catching content for Instagram/TikTok' },
    { value: 'lookbook', label: 'Lookbook', description: 'Seasonal collection showcase' },
    { value: 'campaign', label: 'Brand Campaign', description: 'Marketing campaign imagery' },
    { value: 'catalog', label: 'Catalog', description: 'Product catalog photography' },
    { value: 'influencer', label: 'Influencer Content', description: 'Lifestyle influencer content' },
    { value: 'advertisement', label: 'Advertisement', description: 'Commercial advertising' },
    { value: 'change-clothes', label: '👔 Change Clothes', description: 'Virtual try-on - dress a character in new clothing' }
  ]
};

async function seedOptions() {
  try {
    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fashion-ai';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n🌱 Seeding default options...\n');

    let totalAdded = 0;
    let totalUpdated = 0;

    for (const [category, options] of Object.entries(DEFAULT_OPTIONS)) {
      console.log(`\n📦 Seeding ${category}...`);
      
      for (const option of options) {
        const existing = await PromptOption.findOne({ 
          category, 
          value: option.value 
        });

        if (existing) {
          // Update if needed
          existing.label = option.label;
          existing.description = option.description;
          await existing.save();
          totalUpdated++;
          console.log(`   ✏️  Updated: ${option.label}`);
        } else {
          // Create new
          await PromptOption.create({
            category,
            value: option.value,
            label: option.label,
            description: option.description,
            isAiGenerated: false,
            metadata: {
              source: 'seed',
              addedBy: 'system'
            }
          });
          totalAdded++;
          console.log(`   ✅ Added: ${option.label}`);
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Seeding complete!`);
    console.log(`   Added: ${totalAdded} options`);
    console.log(`   Updated: ${totalUpdated} options`);
    console.log('='.repeat(60) + '\n');

    await mongoose.disconnect();

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seedOptions();
