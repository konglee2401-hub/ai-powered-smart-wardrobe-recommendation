/**
 * Seed Core Prompt Templates
 * Initialize database with core templates for video generation and image prompts
 */

import mongoose from 'mongoose';
import PromptTemplate from '../models/PromptTemplate.js';
import dotenv from 'dotenv';

dotenv.config();

const CORE_TEMPLATES = [
  // ============================================================
  // VIDEO TEMPLATES - Outfit Change
  // ============================================================
  {
    name: 'Video: Outfit Change - First Look',
    description: 'Professional video of model wearing first outfit with transitions',
    useCase: 'outfit-change',
    style: 'fashion',
    templateType: 'video',
    isCore: true,
    content: {
      mainPrompt: 'Professional video of {gender} model wearing {outfit1}. {scene}. {mood}. {cameraAngle}. Duration: {duration}s. High quality fashion video.',
      negativePrompt: 'blurry, low quality, distorted, amateur, poor lighting, oversaturated'
    },
    fields: [
      {
        id: 'gender',
        label: 'Model Gender',
        description: 'Gender of the model',
        type: 'select',
        placeholder: 'Select gender',
        defaultValue: 'female',
        options: [
          { value: 'male', label: 'Male' },
          { value: 'female', label: 'Female' },
          { value: 'non-binary', label: 'Non-binary' }
        ],
        editable: false,
        category: 'appearance'
      },
      {
        id: 'outfit1',
        label: 'First Outfit Description',
        description: 'Detailed description of the first outfit',
        type: 'textarea',
        placeholder: 'e.g., elegant black dress with white accent details',
        defaultValue: '',
        editable: true,
        category: 'appearance'
      },
      {
        id: 'scene',
        label: 'Scene Setting',
        description: 'Where the outfit is being shown',
        type: 'select',
        placeholder: 'Choose scene',
        defaultValue: 'studio',
        options: [
          { value: 'studio', label: 'Studio' },
          { value: 'outdoor', label: 'Outdoor' },
          { value: 'indoor', label: 'Indoor' },
          { value: 'urban', label: 'Urban' }
        ],
        editable: true,
        category: 'setting'
      },
      {
        id: 'mood',
        label: 'Mood/Atmosphere',
        description: 'The mood or atmosphere of the video',
        type: 'select',
        placeholder: 'Choose mood',
        defaultValue: 'professional',
        options: [
          { value: 'elegant', label: 'Elegant' },
          { value: 'playful', label: 'Playful' },
          { value: 'professional', label: 'Professional' },
          { value: 'casual', label: 'Casual' }
        ],
        editable: true,
        category: 'setting'
      },
      {
        id: 'cameraAngle',
        label: 'Camera Angle',
        description: 'How the camera is positioned',
        type: 'select',
        placeholder: 'Select angle',
        defaultValue: 'full-body',
        options: [
          { value: 'full-body', label: 'Full Body' },
          { value: 'close-up', label: 'Close-up' },
          { value: 'wide-shot', label: 'Wide Shot' },
          { value: 'bird-eye', label: "Bird's Eye" }
        ],
        editable: true,
        category: 'setting'
      },
      {
        id: 'duration',
        label: 'Video Duration (seconds)',
        description: 'Length of the video',
        type: 'number',
        placeholder: '10',
        defaultValue: '10',
        editable: false,
        category: 'metadata'
      }
    ],
    usedInPages: [
      {
        page: 'VideoGenerationPage',
        step: 2,
        context: 'outfit_change_segment_1',
        field: 'mainPrompt'
      }
    ],
    tags: ['video', 'outfit', 'fashion', 'transformation'],
    metadata: {
      defaultDuration: 10,
      videoCount: 2,
      aspectRatio: '9:16',
      frameChaining: true,
      requiresRefImage: true
    }
  },

  {
    name: 'Video: Outfit Change - Second Look',
    description: 'Professional video of model in changed outfit',
    useCase: 'outfit-change',
    style: 'fashion',
    templateType: 'video',
    isCore: true,
    content: {
      mainPrompt: 'Model now wearing {outfit2}. Professional fashion showcase. {scene}. {mood}. {cameraAngle}. Duration: {duration}s.',
      negativePrompt: 'blurry, low quality, distorted, amateur, poor lighting, oversaturated'
    },
    fields: [
      {
        id: 'outfit2',
        label: 'Second Outfit Description',
        description: 'Detailed description of the second/changed outfit',
        type: 'textarea',
        placeholder: 'e.g., casual white shirt with blue jeans',
        defaultValue: '',
        editable: true,
        category: 'appearance'
      },
      {
        id: 'scene',
        label: 'Scene Setting',
        description: 'Where the outfit is being shown',
        type: 'select',
        placeholder: 'Choose scene',
        defaultValue: 'studio',
        options: [
          { value: 'studio', label: 'Studio' },
          { value: 'outdoor', label: 'Outdoor' },
          { value: 'indoor', label: 'Indoor' },
          { value: 'urban', label: 'Urban' }
        ],
        editable: true,
        category: 'setting'
      },
      {
        id: 'mood',
        label: 'Mood/Atmosphere',
        description: 'The mood or atmosphere of the video',
        type: 'select',
        placeholder: 'Choose mood',
        defaultValue: 'professional',
        options: [
          { value: 'elegant', label: 'Elegant' },
          { value: 'playful', label: 'Playful' },
          { value: 'professional', label: 'Professional' },
          { value: 'casual', label: 'Casual' }
        ],
        editable: true,
        category: 'setting'
      },
      {
        id: 'cameraAngle',
        label: 'Camera Angle',
        description: 'How the camera is positioned',
        type: 'select',
        placeholder: 'Select angle',
        defaultValue: 'full-body',
        options: [
          { value: 'full-body', label: 'Full Body' },
          { value: 'close-up', label: 'Close-up' },
          { value: 'wide-shot', label: 'Wide Shot' },
          { value: 'bird-eye', label: "Bird's Eye" }
        ],
        editable: true,
        category: 'setting'
      },
      {
        id: 'duration',
        label: 'Video Duration (seconds)',
        description: 'Length of the video',
        type: 'number',
        placeholder: '10',
        defaultValue: '10',
        editable: false,
        category: 'metadata'
      }
    ],
    usedInPages: [
      {
        page: 'VideoGenerationPage',
        step: 2,
        context: 'outfit_change_segment_2',
        field: 'mainPrompt'
      }
    ],
    tags: ['video', 'outfit', 'fashion', 'transformation'],
    metadata: {
      defaultDuration: 10,
      videoCount: 2,
      aspectRatio: '9:16',
      frameChaining: true,
      requiresRefImage: true
    }
  },

  // ============================================================
  // VIDEO TEMPLATES - Product Showcase
  // ============================================================
  {
    name: 'Video: Product Showcase - Intro',
    description: 'Professional product introduction and overview',
    useCase: 'product-showcase',
    style: 'cinematic',
    templateType: 'video',
    isCore: true,
    content: {
      mainPrompt: 'Introducing {product}. Professional product showcase. Front view. {lighting}. {mood}. Duration: {duration}s.',
      negativePrompt: 'blurry, low quality, distorted, amateur, poor lighting, watermark'
    },
    fields: [
      {
        id: 'product',
        label: 'Product Name/Description',
        description: 'Name and brief description of the product',
        type: 'text',
        placeholder: 'e.g., Premium Leather Handbag',
        defaultValue: '',
        editable: true,
        category: 'product'
      },
      {
        id: 'lighting',
        label: 'Lighting Style',
        description: 'Type of lighting to use',
        type: 'select',
        placeholder: 'Choose lighting',
        defaultValue: 'studio',
        options: [
          { value: 'studio', label: 'Studio Lighting' },
          { value: 'natural', label: 'Natural Light' },
          { value: 'dramatic', label: 'Dramatic' },
          { value: 'soft', label: 'Soft' }
        ],
        editable: true,
        category: 'setting'
      },
      {
        id: 'mood',
        label: 'Overall Mood',
        description: 'Mood and atmosphere of the showcase',
        type: 'select',
        placeholder: 'Choose mood',
        defaultValue: 'professional',
        options: [
          { value: 'professional', label: 'Professional' },
          { value: 'luxury', label: 'Luxury' },
          { value: 'playful', label: 'Playful' },
          { value: 'minimalist', label: 'Minimalist' }
        ],
        editable: true,
        category: 'setting'
      },
      {
        id: 'duration',
        label: 'Duration (seconds)',
        type: 'number',
        placeholder: '10',
        defaultValue: '10',
        editable: false,
        category: 'metadata'
      }
    ],
    usedInPages: [
      {
        page: 'VideoGenerationPage',
        step: 2,
        context: 'product_showcase_segment_1',
        field: 'mainPrompt'
      }
    ],
    tags: ['video', 'product', 'ecommerce', 'showcase'],
    metadata: {
      defaultDuration: 30,
      videoCount: 3,
      aspectRatio: '16:9',
      frameChaining: false,
      requiresRefImage: false
    }
  },

  // ============================================================
  // IMAGE GENERATION TEMPLATES
  // ============================================================
  {
    name: 'Image: Fashion Model - Studio',
    description: 'Professional fashion photography in studio setting',
    useCase: 'ecommerce',
    style: 'fashion',
    templateType: 'image',
    isCore: true,
    content: {
      mainPrompt: 'Professional fashion photography of {gender} model wearing {outfit}. {style} style. {lighting} lighting. {background}. {cameraAngle} angle. High quality, sharp details, accurate colors.',
      negativePrompt: 'blurry, low quality, distorted, watermark, text, logo, amateur, poor proportions'
    },
    fields: [
      {
        id: 'gender',
        label: 'Model Gender',
        type: 'select',
        placeholder: 'Select gender',
        defaultValue: 'female',
        options: [
          { value: 'male', label: 'Male' },
          { value: 'female', label: 'Female' }
        ],
        editable: false,
        category: 'model'
      },
      {
        id: 'outfit',
        label: 'Outfit Description',
        type: 'textarea',
        placeholder: 'e.g., elegant black evening dress with gold accessories',
        defaultValue: '',
        editable: true,
        category: 'product'
      },
      {
        id: 'style',
        label: 'Photography Style',
        type: 'select',
        defaultValue: 'editorial',
        options: [
          { value: 'editorial', label: 'Editorial' },
          { value: 'commercial', label: 'Commercial' },
          { value: 'high-fashion', label: 'High Fashion' },
          { value: 'lifestyle', label: 'Lifestyle' }
        ],
        editable: true,
        category: 'setting'
      },
      {
        id: 'lighting',
        label: 'Lighting',
        type: 'select',
        defaultValue: 'studio',
        options: [
          { value: 'studio', label: 'Studio' },
          { value: 'natural', label: 'Natural' },
          { value: 'golden-hour', label: 'Golden Hour' },
          { value: 'dramatic', label: 'Dramatic' }
        ],
        editable: true,
        category: 'setting'
      },
      {
        id: 'background',
        label: 'Background',
        type: 'select',
        defaultValue: 'white',
        options: [
          { value: 'white', label: 'Clean White' },
          { value: 'neutral', label: 'Neutral Gray' },
          { value: 'gradient', label: 'Subtle Gradient' },
          { value: 'lifestyle', label: 'Lifestyle Setting' }
        ],
        editable: true,
        category: 'setting'
      },
      {
        id: 'cameraAngle',
        label: 'Camera Angle',
        type: 'select',
        defaultValue: 'full-body',
        options: [
          { value: 'full-body', label: 'Full Body' },
          { value: 'half-body', label: 'Half Body' },
          { value: 'close-up', label: 'Close-up' },
          { value: 'detail', label: 'Detail Shot' }
        ],
        editable: true,
        category: 'setting'
      }
    ],
    usedInPages: [
      {
        page: 'ImageGenerationPage',
        step: 2,
        context: 'fashion_model_prompt',
        field: 'mainPrompt'
      }
    ],
    tags: ['image', 'fashion', 'model', 'studio', 'ecommerce'],
    metadata: {
      qualityPreset: 'ultra',
      aspectRatio: '3:4'
    }
  },

  {
    name: 'Image: Product Photography - Clean',
    description: 'Clean, professional product photography',
    useCase: 'ecommerce',
    style: 'realistic',
    templateType: 'image',
    isCore: true,
    content: {
      mainPrompt: 'Professional product photography of {product}. {angle}. {background} background. {lighting} lighting. {mood}. Ultra high quality, 8K resolution, sharp focus, perfect composition.',
      negativePrompt: 'blurry, low quality, distorted, watermark, text, logo, shadows, uneven lighting, poor focus'
    },
    fields: [
      {
        id: 'product',
        label: 'Product Name',
        type: 'text',
        placeholder: 'e.g., Premium Leather Wallet',
        defaultValue: '',
        editable: true,
        category: 'product'
      },
      {
        id: 'angle',
        label: 'Product Angle',
        type: 'select',
        defaultValue: 'front',
        options: [
          { value: 'front', label: 'Front View' },
          { value: 'three-quarter', label: '3/4 View' },
          { value: 'side', label: 'Side View' },
          { value: 'flat-lay', label: 'Flat Lay' }
        ],
        editable: true,
        category: 'composition'
      },
      {
        id: 'background',
        label: 'Background Type',
        type: 'select',
        defaultValue: 'white',
        options: [
          { value: 'white', label: 'Pure White' },
          { value: 'gray', label: 'Light Gray' },
          { value: 'transparent', label: 'Transparent' },
          { value: 'lifestyle', label: 'Lifestyle' }
        ],
        editable: true,
        category: 'setting'
      },
      {
        id: 'lighting',
        label: 'Lighting Type',
        type: 'select',
        defaultValue: 'studio',
        options: [
          { value: 'studio', label: 'Studio' },
          { value: 'soft', label: 'Soft' },
          { value: 'diffused', label: 'Diffused' },
          { value: 'natural', label: 'Natural' }
        ],
        editable: true,
        category: 'setting'
      },
      {
        id: 'mood',
        label: 'Mood/Style',
        type: 'select',
        defaultValue: 'professional',
        options: [
          { value: 'professional', label: 'Professional' },
          { value: 'luxury', label: 'Luxury' },
          { value: 'minimalist', label: 'Minimalist' },
          { value: 'warm', label: 'Warm' }
        ],
        editable: true,
        category: 'setting'
      }
    ],
    usedInPages: [
      {
        page: 'ImageGenerationPage',
        step: 2,
        context: 'product_photography_prompt',
        field: 'mainPrompt'
      }
    ],
    tags: ['image', 'product', 'photography', 'ecommerce', 'clean'],
    metadata: {
      qualityPreset: 'ultra',
      aspectRatio: '1:1'
    }
  }
];

// ============================================================
// SEED FUNCTION
// ============================================================

async function seedCoreTemplates() {
  try {
    console.log('🌱 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('✅ Connected to database');

    // Clear existing core templates
    console.log('🗑️  Clearing existing core templates...');
    await PromptTemplate.deleteMany({ isCore: true });

    // Insert new core templates
    console.log('📝 Inserting core templates...');
    const result = await PromptTemplate.insertMany(CORE_TEMPLATES);
    console.log(`✅ Inserted ${result.length} core templates`);

    // Show inserted templates
    console.log('\n📚 Core Templates:');
    result.forEach((template, idx) => {
      console.log(`${idx + 1}. ${template.name}`);
    });

    console.log('\n✨ Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding templates:', error);
    process.exit(1);
  }
}

// Run seeding
seedCoreTemplates();
