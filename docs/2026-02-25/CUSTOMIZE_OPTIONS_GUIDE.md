# How to Customize & Extend Options & Prompt Options

## 🎯 Quick Start: Add Your Own Options

### Scenario 1: Add a New Option to Existing Category

**Goal:** Add "minimalist-white" to scene category

**Step 1: Edit seedPromptOptions.js**

Location: `backend/scripts/seedPromptOptions.js` (Line ~120)

```javascript
{
  category: 'scene',
  label: 'Minimalist White',
  value: 'minimalist-white',
  description: 'Pure white minimalist environment with no elements',
  keywords: ['minimalist', 'white', 'clean', 'minimal', 'sparse'],
  technicalDetails: {
    background: 'pure white wall #FFFFFF',
    floor: 'white matte flooring',
    space: 'unlimited clean space',
    props: 'absolutely none',
    ambiance: 'clinical, sterile, focus on subject',
    lighting: 'even, bright, no shadows'
  },
  isActive: true,
  sortOrder: 7  // After other scene options
}
```

**Step 2: Clear & Reseed Database**

```bash
# Connect to MongoDB and clear
mongo
use smart-wardrobe
db.promptoptions.deleteMany({})
exit

# Reseed
cd backend/scripts
node seedPromptOptions.js
```

**Step 3: Verify in API**

```bash
curl -X GET "http://localhost:5000/api/prompt-options/scene"
# Should show your new "minimalist-white" option
```

---

### Scenario 2: Create a Brand New Category

**Goal:** Add "posture" category for body positioning options

**Step 1: Update Model Enum**

Location: `backend/models/PromptOption.js` (Line ~40-50)

Find the category enum:
```javascript
category: {
  type: String,
  required: true,
  enum: [
    'scene', 
    'lighting', 
    'mood', 
    'style', 
    'colorPalette', 
    'cameraAngle',
    'hairstyle',
    'makeup',
    'bottoms',
    'shoes',
    'accessories',
    'outerwear',
    // ADD YOUR NEW CATEGORY HERE:
    'posture'  // ← New category
  ],
  index: true
}
```

**Step 2: Add Options to seedPromptOptions.js**

Add new section after existing categories:

```javascript
// ============ NEW: Posture options ============
{
  category: 'posture',
  label: 'Standing Straight',
  value: 'standing-straight',
  description: 'Standing upright with proper posture',
  keywords: ['standing', 'straight', 'upright', 'posture', 'formal'],
  technicalDetails: {
    body_position: 'vertical, upright stance',
    weight_distribution: 'even on both feet',
    shoulders: 'relaxed, level',
    spine: 'straight alignment',
    confidence: 'high',
    formality: 'formal, professional'
  },
  isActive: true,
  sortOrder: 1
},
{
  category: 'posture',
  label: 'Hip Pop',
  value: 'hip-pop',
  description: 'Relaxed pose with weight on one leg',
  keywords: ['relaxed', 'casual', 'hip', 'pop', 'dynamic'],
  technicalDetails: {
    body_position: 'weight shifted to one side',
    weight_distribution: 'favors back leg',
    hips: 'thrust to side',
    shoulders: 'tilted opposite to hips',
    confidence: 'medium-high',
    formality: 'casual, approachable'
  },
  isActive: true,
  sortOrder: 2
},
{
  category: 'posture',
  label: 'Leaning',
  value: 'leaning',
  description: 'Leaning against surface or structure',
  keywords: ['leaning', 'relaxed', 'casual', 'approachable'],
  technicalDetails: {
    body_position: 'leaning against wall or object',
    weight_distribution: '80% on back leg',
    posture: 'relaxed, at ease',
    arms: 'can be crossed or at sides',
    confidence: 'calm, friendly',
    formality: 'very casual'
  },
  isActive: true,
  sortOrder: 3
}
```

**Step 3: Reseed Database**

```bash
cd backend/scripts
node seedPromptOptions.js
```

**Step 4: Test the New Category**

```bash
curl -X GET "http://localhost:5000/api/prompt-options/posture"
```

---

### Scenario 3: Add Option via Frontend UI

**Use:** `OptionsManagement.jsx` page

1. Open [http://localhost:3000/options-management](http://localhost:3000/options-management)
2. Select category dropdown: "posture"
3. Enter value: "sitting" 
4. Click "Add"
5. New option stored in database immediately

**Backend call:**
```javascript
POST /api/prompt-options
{
  "category": "posture",
  "value": "sitting",
  "label": "Sitting",
  "description": "Seated position",
  "metadata": {
    "technicalDetails": {
      "body_position": "seated",
      "posture": "relaxed or formal"
    }
  }
}
```

---

### Scenario 4: AI Generate Option from Description

**Goal:** Create option from natural language

```javascript
// In your app code or test:
const description = `
  Model sits on chair with one leg crossed over the other,
  arm resting on knee, looking relaxed and confident,
  very fashion-forward and editorial feel
`;

fetch('http://localhost:5000/api/prompt-options/ai-extract', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    category: 'posture',
    text: description
  })
})
.then(res => res.json())
.then(data => {
  console.log('Generated Option:', {
    value: data.data.value,              // 'seated-crossed-fashionable'
    label: data.data.label,              // 'Seated Crossed'
    keywords: data.data.keywords,        // ['seated', 'crossed', 'fashion', ...]
    technicalDetails: data.data.technicalDetails,  // Auto-generated
    isAiGenerated: data.data.isAiGenerated        // true
  });
});
```

Result:
```javascript
{
  value: "seated-crossed-fashionable",
  label: "Seated Crossed Fashionable",
  keywords: ["seated", "crossed", "relaxed", "confident", "editorial", "fashion"],
  technicalDetails: {
    body_position: "seated on chair",
    legs: "one crossed over other",
    arms: "resting on leg",
    posture: "relaxed, confident",
    expression: "calm, fashionable",
    mood: "editorial, professional"
  },
  isAiGenerated: true
}
```

---

## 🎨 Advanced: Custom Technical Details

### Example 1: Detailed Lighting Setup

```javascript
{
  category: 'lighting',
  label: 'Professional Fashion Setup',
  value: 'professional-fashion-setup',
  description: 'Industry-standard configuration for fashion photography',
  keywords: ['professional', 'fashion', 'studio', 'setup'],
  technicalDetails: {
    key_light: {
      type: 'beautydish',
      size: '24 inch',
      power: '1000W strobe',
      distance: '1.5m from subject',
      angle: '45° above eye level',
      modifier: 'softbox silk screen'
    },
    fill_light: {
      type: 'reflector',
      size: '1.2m x 0.8m',
      position: 'opposite key light',
      fill_ratio: '1:3 (key:fill)',
      material: 'silver'
    },
    backlight: {
      type: '500W strobe',
      distance: '2m behind subject',
      purpose: 'rim light separation',
      angle: '30° high'
    },
    background_light: {
      type: '250W strobe',
      distance: '1m behind backdrop',
      purpose: 'even background illumination'
    },
    color_temperature: {
      kelvin: 5500,
      balance: 'daylight',
      gels: 'CTO on key if needed'
    },
    camera_settings: {
      shutter: '1/125 sec',
      aperture: 'f/5.6',
      iso: 100,
      lens: '85mm f/1.4'
    },
    notes: 'Classic fashion photography setup used in industry'
  },
  isActive: true,
  sortOrder: 10
}
```

### Example 2: Scene with Complete Details

```javascript
{
  category: 'scene',
  label: 'High-End Boutique',
  value: 'luxury-boutique',
  description: 'Exclusive luxury retail environment',
  keywords: ['luxury', 'boutique', 'retail', 'high-end', 'exclusive'],
  technicalDetails: {
    location: {
      type: 'indoor retail space',
      aesthetic: 'minimalist luxury',
      square_footage: '2000+ sq ft'
    },
    flooring: {
      material: 'polished concrete or light marble',
      finish: 'reflective, clean',
      color: 'light gray or white'
    },
    walls: {
      color: 'off-white or soft gray',
      texture: 'smooth, premium finish',
      features: 'accent lighting'
    },
    furniture: {
      items: ['marble pedestal', 'minimal seating', 'modern racks'],
      style: 'contemporary minimalist',
      color: 'neutral, black accents'
    },
    lighting_ambiance: {
      primary: 'warm white LEDs (3500K)',
      accent: 'directional spotlights',
      intensity: 'medium, dramatic',
      effect: 'sophisticated, luxurious'
    },
    props: {
      optional: ['luxury shopping bag', 'champagne glasses', 'flowers'],
      styling: 'minimal accessories'
    },
    sound: 'subtle classical or jazz music',
    atmosphere: 'exclusive, high-paced, fashionable',
    typical_brands: 'Gucci, Prada, Hermès styling'
  },
  isActive: true,
  sortOrder: 8
}
```

---

## 🔧 Integration Points: Using Custom Options

### In Prompts

When smartPromptBuilder.js processes options:

```javascript
// User selected: posture="seated-crossed"
// 
// Technical details expanded to:
// "Model is seated on chair with one leg crossed over the other,
//  arm resting relaxed on knee, displaying calm but confident demeanor,
//  very fashionable and editorial in presentation, contemporary attitude..."
```

### In UI

When OptionsManagement.jsx displays:

```javascript
// Shows in dropdown:
<option value="seated-crossed-fashionable">
  Seated Crossed Fashionable (Used: 5 times)
</option>
```

### In Image Generation

When ImageGenerationPage.jsx sends to backend:

```javascript
// selectedOptions includes:
{
  // ... other options
  posture: 'seated-crossed-fashionable',
  // ... more options
}

// Backend smartPromptBuilder uses technical details from DB
// to expand prompt with specific positioning information
```

---

## 📊 Template: How to Structure Technical Details

### Photography-Related Options

**Pattern:**
```javascript
technicalDetails: {
  visual_characteristic: 'description',
  measurement_or_spec: 'value with unit',
  equipment: 'specific gear',
  placement: 'position or location',
  intensity_or_power: 'level or wattage',
  effect: 'visual result',
  setup: 'how it's configured'
}
```

**Example:**
```javascript
technicalDetails: {
  lighting_type: 'softbox',
  size: '2x3 feet',
  distance: '2 meters',
  angle: '45 degrees',
  power: '400W',
  effect: 'soft shadows, even illumination',
  placement: 'camera left'
}
```

### Anatomy/Positioning Options

**Pattern:**
```javascript
technicalDetails: {
  body_part_1: 'position/angle',
  body_part_2: 'position/angle',
  overall_posture: 'vertical alignment',
  weight_distribution: 'center of gravity',
  expression: 'facial appearance',
  confidence_level: 'high/medium/low',
  formality: 'casual/formal/editorial'
}
```

**Example:**
```javascript
technicalDetails: {
  head: 'tilted 15° toward shoulder',
  shoulders: 'level, relaxed',
  torso: 'twisted 30° to camera',
  hips: 'frontal facing',
  weight: '60% on back leg',
  expression: 'confident, smiling',
  confidence: 'high',
  formality: 'editorial fashion'
}
```

### Fashion/Clothing Options

**Pattern:**
```javascript
technicalDetails: {
  type: 'clothing type',
  fit: 'how it fits body',
  material: 'fabric composition',
  color_typical: 'common colors',
  occasions: 'when to wear',
  care: 'how to care',
  visual_impact: 'what it conveys',
  styling: 'how to style'
}
```

**Example:**
```javascript
technicalDetails: {
  type: 'blazer jacket',
  fit: 'tailored, structured',
  material: 'wool blend, premium',
  colors: 'navy, charcoal, black, camel',
  occasions: 'business, formal, editorial',
  visual_impact: 'professional, powerful, sophisticated',
  styling: 'pairs with dress pants or skirts',
  formality: 'formal'
}
```

---

## 🚀 Best Practices

### ✅ DO:
- **Be specific** - "2x3 foot softbox at 45° angle" vs "soft lighting"
- **Include measurements** - "10x10 feet" vs "large space"
- **Add multiple angles** - equipment, position, effect, mood
- **Use consistent formatting** - same structure for same category
- **Include why** - what effect/result this creates
- **Add keywords** - helps with AI matching and search

### ❌ DON'T:
- **Be generic** - "nice lighting" doesn't help prompts
- **Mix categories** - keep it focused
- **Use vague measurements** - "big", "small" aren't useful
- **Skip the "why"** - always explain the effect
- **Overload keywords** - 5-7 is enough

---

## 📝 Checklist: Adding New Option

- [ ] Decide on category (existing or new)
- [ ] If new category, update model enum
- [ ] Create technical details (specific, detailed)
- [ ] Add 5-7 keywords
- [ ] Set sortOrder (for UI ordering)
- [ ] Include previewImage path (if you have)
- [ ] Set isActive: true
- [ ] Add to seedPromptOptions.js
- [ ] Reseed database or use POST API
- [ ] Test via API endpoint
- [ ] Verify in UI (OptionsManagement.jsx)
- [ ] Test in actual image generation

---

## 🔗 Related Documentation

All three guides work together:
1. **OPTIONS_MANAGEMENT_GUIDE.md** - System overview
2. **API_ROUTES_COMPLETE.md** - API endpoints and examples  
3. **SEED_FILES_COMPARISON.md** - Which seed file to use
4. **THIS FILE** - How to customize and extend

---

## 💡 Pro Tips

1. **Use seedPromptOptions.js as template** for structure
2. **Test new options immediately** with cURL or Postman
3. **Include keywords** for AI extract to work well
4. **Be specific** with technical details - avoid generic terms
5. **Group related options** in sortOrder for UI UX
6. **Backup database** before running seedPromptOptions.js again
7. **Use AI extract** for complex natural language descriptions

---

## Example: Complete Addition Process

**Task:** Add "runway-pose" to posture category

### 1. Edit seedPromptOptions.js
```javascript
{
  category: 'posture',
  label: 'Runway Pose',
  value: 'runway-pose',
  description: 'Professional runway walking pose',
  keywords: ['runway', 'walking', 'fashion', 'dynamic', 'model'],
  technicalDetails: {
    body_position: 'dynamic forward-moving posture',
    stride: 'confident, long strides',
    arms: 'relaxed at sides with slight swing',
    shoulders: 'rolled back, open',
    head: 'chin slightly forward, looking ahead',
    hips: 'swinging naturally with each step',
    attitude: 'confident, powerful',
    speed: 'steady walking pace',
    effect: 'high-fashion, editorial, powerful',
    formality: 'fashion runway'
  },
  isActive: true,
  sortOrder: 4,
  previewImage: '/images/posture-runway.jpg'
}
```

### 2. Update Model
Add to enum if 'posture' is new:
```javascript
enum: [..., 'posture']
```

### 3. Clear and Reseed
```bash
mongo
> use smart-wardrobe
> db.promptoptions.deleteMany({})
> exit
cd backend/scripts
node seedPromptOptions.js
```

### 4. Verify
```bash
curl -X GET "http://localhost:5000/api/prompt-options/posture"
# Check for "runway-pose" in response
```

### 5. Test in Image Generation
- Go to ImageGenerationPage
- Select posture: "Runway Pose"
- Generate image
- Verify prompt includes technical details

Done! ✅

---

## Summary

- **Add to existing category:** Edit seedPromptOptions.js + reseed
- **Create new category:** Update model enum + add options + reseed
- **Use API to add:** POST /api/prompt-options
- **AI generate:** POST /api/prompt-options/ai-extract
- **Key is technicalDetails:** Make them specific and detailed
- **Test immediately:** Via API or UI

All documentation is interconnected - reference as needed!
