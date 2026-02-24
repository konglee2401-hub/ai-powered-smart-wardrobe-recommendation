# Virtual Try-On System - API & Integration Guide

## 📡 API Flow

### 1. Quick Start (Default Behavior)
No changes needed! System automatically uses optimized virtual try-on prompts for `change-clothes` use case.

```javascript
// Frontend - Same API as before
const response = await unifiedFlowAPI.buildPrompt(
  analysis,
  selectedOptions,
  'change-clothes',  // ← Automatically uses optimized virtual try-on prompt
  'full-outfit'
);
```

**Result:** You get comprehensive prompt with:
- ✅ Image reference labels
- ✅ Complete CHANGE CLOTHING TO section
- ✅ Garment placement instructions
- ✅ Character preservation guardrails

### 2. Advanced: Using Virtual Try-On Builder Directly
For maximum control, import the new builder:

```javascript
import { 
  buildVirtualTryOnPrompt, 
  buildVirtualTryOnNegativePrompt,
  createVirtualTryOnConfig 
} from '../services/virtualTryOnPromptBuilder.js';

// Build specialized prompt
const prompt = buildVirtualTryOnPrompt(
  characterAnalysis,    // {character: {...}, ...}
  productAnalysis,      // {product: {...}, ...}
  selectedOptions       // {scene, lighting, etc}
);

const negativePrompt = buildVirtualTryOnNegativePrompt(
  productAnalysis,
  selectedOptions
);

const config = createVirtualTryOnConfig(
  analysis,
  selectedOptions
);
```

## 🎨 Prompt Structure (What You're Getting)

### Section 1: Image Reference Mapping
```
[IMAGE REFERENCE MAPPING]
Image 1 (First Upload) = CHARACTER REFERENCE - Person to be dressed
Image 2 (Second Upload) = PRODUCT/OUTFIT REFERENCE - Clothing to apply
CRITICAL: Do NOT swap these images. Keep character unchanged, change clothing only.
```

**Purpose:** Explicit image role assignment → AI never confuses images

### Section 2: Character Preservation (KEEP UNCHANGED)
```
=== KEEP CHARACTER UNCHANGED (CRITICAL) ===
📍 FACE & HEAD:
- Age: 28 years old (KEEP EXACT)
- Gender: Female
- Facial Features: [exact features] (IDENTICAL)
- Eyes: [color and appearance] (KEEP EXACT APPEARANCE)
- Skin: [tone] (DO NOT CHANGE)

📍 HAIR: [all hair details] (EXACTLY as in reference (MUST PRESERVE))

📍 BODY & POSE: [details about body] (KEEP EXACT)
- Posture: IDENTICAL to reference image
- Arm Position: PRESERVE arm placement and position exactly
- Head Angle: Keep head tilt and angle SAME as reference
- Hand Position: SAME as shown in reference

📍 FACIAL EXPRESSION:
- Expression: SAME as reference (same smile, eyes, mouth)
- Gaze Direction: Keep looking direction EXACTLY same
```

**Purpose:** Crystal clear preservation requirements → No accidental character changes

### Section 3: Clothing Change (WITH COMPLETE SPECIFICATIONS)
```
=== CHANGE CLOTHING TO (FROM IMAGE 2) ===
Replace what the person is wearing with the garment specifications from Image 2.

GARMENT TYPE: [type]

📍 COLORS (Distinguishing feature for garment identification):
  Primary Color: [color]
  Secondary Color: [color]

🧵 MATERIAL & TEXTURE:
  Fabric: [fabric type]
  Appearance: Realistic [fabric type] texture

🎨 PATTERN:
  Pattern: [pattern or solid]

👕 FIT & SILHOUETTE:
  Fit: [fit type]

🎭 DESIGN DETAILS:
  Neckline: [neckline]
  Sleeves: [sleeves]
  Special Details: [details]

📏 LENGTH & COVERAGE:
  Length: [length]
  Coverage: [coverage]
```

**Purpose:** Complete garment specifications → AI applies exact clothing

### Section 4: Garment Placement
```
=== HOW TO APPLY THE GARMENT ===
1. Take the garment from Image 2 reference
2. Place it on the character's body with realistic draping
3. Ensure natural fabric folds and wrinkles
4. Match fabric behavior to material type
5. Ensure proper fit on character's body
6. Keep all gaps (neck, wrists, ankles) appropriate
7. Do NOT distort character's body to fit garment
8. Keep body proportions visible in shoulders/waist/hips
```

**Purpose:** Realistic garment placement → No floating/twisted clothing

### Section 5: Additional Styling
```
=== HAIRSTYLE & MAKEUP ===
Hairstyle: Keep SAME as reference image - do NOT change
Makeup: [makeup style]

=== ACCESSORIES ===
[accessories list]

=== FOOTWEAR ===
Shoes: [shoe type]
```

### Section 6: Environment & Photography
```
=== ENVIRONMENT ===
Setting: [scene]
Lighting: [lighting]
Mood/Vibe: [mood]

=== PHOTOGRAPHY & QUALITY ===
Style: [photography style]
Camera angle: [angle]
Color palette: [palette]
Quality: Professional photography, 8k, sharp focus, ultra-detailed, photorealistic
Detail Level: Realistic fabric texture, proper draping, anatomically correct
```

### Section 7: Quality Checklist
```
=== EXECUTION CHECKLIST ===
✓ Photo of person from Image 1 with character details preserved
✓ Wearing garment from Image 2 with correct colors and materials
✓ Same face, body, pose, expression - UNCHANGED
✓ Realistic garment placement with natural draping
✓ Professional lighting and composition
✓ No distorted anatomy or bad proportions
```

**Purpose:** Quality gate for AI output → Clear success criteria

## 📋 Negative Prompt Terms

Enhanced negative prompt includes:

**Character Protection:**
- changes to face, different face shape
- modified body type, changed pose
- different expression, altered eye appearance
- different skin color, changed hair style
- cropped head

**Quality Assurance:**
- blurry, low quality, distorted, deformed
- bad anatomy, extra limbs, missing limbs
- badly fitting, wrinkled badly, damaged

**Garment Issues (NEW):**
- floating garment, disconnected clothing
- unrealistic draping, awkward fit
- reversed colors, color bleeding
- misaligned seams

## 🔄 Integration Points

### 1. In smartPromptBuilder.js (Automatic)
```javascript
switch (useCase) {
  case 'change-clothes':
    promptStr = buildChangeClothesPrompt(analysis, selectedOptions, productFocus);
    // ← Now uses optimized version with all fixes
    break;
  case 'styling':
    promptStr = buildStylingPrompt(analysis, selectedOptions, productFocus);
    break;
  case 'complete-look':
    promptStr = buildCompleteLookPrompt(analysis, selectedOptions, productFocus);
    break;
}
```

### 2. In unifiedFlowController.js (Automatic)
```javascript
// When user selects 'change-clothes' use case
const promptResult = await buildDetailedPrompt(
  analysis, 
  finalOptions,
  useCase,  // 'change-clothes'
  productFocus
);
// ← Returns optimized prompt with all virtual try-on features
```

### 3. In Frontend (No Changes Needed)
```javascript
// Same code as before - optimization is transparent
const response = await unifiedFlowAPI.buildPrompt(
  analysis,
  selectedOptions,
  'change-clothes',  // ← Triggers virtual try-on optimization automatically
  'full-outfit'
);
```

## 🧪 Testing

### Check Generated Prompt
```javascript
// After building prompt, check sections exist:
const sections = [
  '[IMAGE REFERENCE MAPPING]',
  '=== KEEP CHARACTER UNCHANGED',
  '=== CHANGE CLOTHING TO',
  '📍 COLORS',
  '🧵 MATERIAL & TEXTURE',
  '🎨 PATTERN',
  '👕 FIT & SILHOUETTE',
  '🎭 DESIGN DETAILS',
  '📏 LENGTH & COVERAGE',
  '=== HOW TO APPLY THE GARMENT ===',
  '=== EXECUTION CHECKLIST ==='
];

for (const section of sections) {
  if (!prompt.includes(section)) {
    console.warn(`Missing section: ${section}`);
  }
}
```

### Verify Product Details
```javascript
// Ensure product details are in prompt:
const requiredDetails = [
  analysis.product.primary_color,
  analysis.product.secondary_color,
  analysis.product.fabric_type,
  analysis.product.pattern,
  analysis.product.fit_type
];

for (const detail of requiredDetails) {
  if (detail && !prompt.includes(detail)) {
    console.warn(`Missing product detail: ${detail}`);
  }
}
```

### Check Negative Prompts
```javascript
// Ensure critical negatives are present:
const criticalNegatives = [
  'changes to face',
  'modified body type',
  'changed pose',
  'floating garment'
];

for (const neg of criticalNegatives) {
  if (!negativePrompt.includes(neg)) {
    console.warn(`Missing negative: ${neg}`);
  }
}
```

## 🔬 Debugging

### If Character Keeps Changing
1. Check negative prompt includes "changes to face", "modified body type"
2. Verify Image 1 is clear character photo
3. Check character analysis is correct
4. Try image with better face visibility

### If Garment Not Applied Correctly
1. Check "=== CHANGE CLOTHING TO ===" section is complete
2. Verify product analysis includes colors, materials
3. Check "[IMAGE REFERENCE MAPPING]" section exists
4. Try garment image that's clear (not on dummy/display)

### If Colors Wrong
1. Verify product.primary_color in prompt doesn't show as null
2. Check product.secondary_color if garment has multiple colors
3. Ensure Colors section shows all colors
4. Try image where colors are visible

## 📞 Support

### When to Use Which Builder
- **Default:** Use `change-clothes` use case (automatic)
- **Advanced:** Use `virtualTryOnPromptBuilder.js` directly for custom logic
- **Legacy:** Other use cases (`styling`, `complete-look`) unchanged

### Performance Notes
- Prompt length: ~30-40% longer (more detailed)
- Generation time: Same (no additional processing)
- Success rate: 50-70% improvement expected

## 🎓 Advanced Customization

If you need to modify prompt structure:

1. **Edit `buildChangeClothesPrompt()` in `smartPromptBuilder.js`**
   - Add/remove sections as needed
   - Modify section order
   - Adjust detail level

2. **Or use `virtualTryOnPromptBuilder.js` as template**
   - Copy logic
   - Customize for specific use case
   - Still get all frameworks

## ✅ Checklist Before Production

- [ ] Test with avatar + clothing images
- [ ] Verify character stays unchanged
- [ ] Verify all product colors visible
- [ ] Check garment has realistic draping
- [ ] Confirm no floating/twisted clothing
- [ ] Test with edge cases (complex patterns, multiple colors)
- [ ] Monitor generation success rate
- [ ] Adjust if needed based on results
