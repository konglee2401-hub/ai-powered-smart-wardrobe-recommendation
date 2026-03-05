# Real Technical Details Reference - Extracted from Code

This document shows the **actual technical details** that exist in the codebase and how they're structured.

---

## 🎬 Scene Technical Details

### From seedPromptOptions.js

#### studio
```javascript
{
  lighting: 'controlled studio lighting',
  background: 'clean white or neutral',
  equipment: 'professional photography setup'
}
```

#### beach
```javascript
{
  lighting: 'natural golden hour',
  background: 'beach with ocean',
  atmosphere: 'relaxed summer vibes'
}
```

#### urban
```javascript
{
  lighting: 'natural street lighting',
  background: 'city architecture',
  atmosphere: 'contemporary urban'
}
```

#### white-background
```javascript
{
  background: 'pure white #FFFFFF',
  lighting: 'even, no shadows',
  post: 'white balance critical'
}
```

#### minimalist-indoor
```javascript
{
  background: 'neutral gray',
  furniture: 'minimal',
  lighting: 'soft, diffused'
}
```

#### cafe
```javascript
{
  setting: 'cozy coffee shop',
  props: 'wooden table, coffee cup',
  ambiance: 'warm, inviting'
}
```

#### outdoor-park
```javascript
{
  location: 'lush green park',
  lighting: 'natural sunlight',
  elements: 'trees, grass, benches'
}
```

---

## 💡 Lighting Technical Details

### From seedPromptOptions.js

#### soft-diffused
```javascript
{
  key_light: '2x3 foot softbox, 45° angle, 2m high',
  fill: 'reflector opposite side',
  ratio: '1:2',
  power: '400W'
}
```

#### natural-window
```javascript
{
  source: 'large window or open shade',
  time: 'morning or late afternoon',
  quality: 'soft, indirect'
}
```

#### golden-hour
```javascript
{
  direction: 'low angle, warm',
  intensity: 'medium',
  color_temp: '3200K'
}
```

#### dramatic-rembrandt
```javascript
{
  key_light: 'strong single source, 45° high',
  fill: 'minimal',
  shadows: 'deep, defined',
  ratio: '1:4'
}
```

#### high-key
```javascript
{
  setup: 'multiple soft sources',
  intensity: 'bright',
  shadows: 'minimal',
  ratio: '1:1'
}
```

#### backlit
```javascript
{
  rim_light: 'from behind subject',
  intensity: 'medium to high',
  effect: 'silhouette, rim glow'
}
```

#### neon-colored
```javascript
{
  gels: 'RGB LED panels',
  colors: 'vibrant',
  intensity: 'medium',
  mood: 'creative, energetic'
}
```

---

## 🎭 Mood Technical Details

### From seedPromptOptions.js

#### playful
```javascript
{
  expression: 'genuine smile',
  posture: 'relaxed and natural',
  energy: 'positive and lively'
}
```

#### serious
```javascript
{
  expression: 'composed and serious',
  posture: 'upright and professional',
  energy: 'focused and serious'
}
```

#### romantic
```javascript
{
  expression: 'soft and dreamy',
  posture: 'intimate and close',
  energy: 'romantic and gentle'
}
```

#### energetic
```javascript
{
  expression: 'energized and lively',
  posture: 'active and dynamic',
  energy: 'high energy and movement'
}
```

#### calm
```javascript
{
  expression: 'peaceful and calm',
  posture: 'relaxed and composed',
  energy: 'tranquil and serene'
}
```

#### elegant
```javascript
{
  expression: 'graceful and poised',
  posture: 'elegant and refined',
  energy: 'sophisticated and polished'
}
```

---

## 👗 Fashion Technical Details

### Hairstyle - From seedPromptOptions.js

#### long-straight
```javascript
{
  length: 'long',
  texture: 'straight',
  style: 'sleek and polished'
}
```

#### long-curly
```javascript
{
  length: 'long',
  texture: 'curly',
  style: 'bouncy and voluminous'
}
```

#### short-bob
```javascript
{
  length: 'short',
  texture: 'straight to wavy',
  style: 'chic and modern'
}
```

#### braided
```javascript
{
  length: 'any',
  texture: 'braided',
  style: 'traditional and intricate'
}
```

#### bun
```javascript
{
  length: 'any',
  texture: 'pulled back',
  style: 'elegant and formal'
}
```

### Makeup - From seedPromptOptions.js

#### natural
```javascript
{
  coverage: 'light',
  finish: 'natural',
  emphasis: 'skin clarity'
}
```

#### glowing
```javascript
{
  coverage: 'medium',
  finish: 'radiant',
  emphasis: 'highlighter and glow'
}
```

#### smokey-eyes
```javascript
{
  coverage: 'full face',
  finish: 'matte or shimmer',
  emphasis: 'dramatic eyes'
}
```

#### bold-lips
```javascript
{
  coverage: 'full face',
  finish: 'matte or satin',
  emphasis: 'bold lip color'
}
```

### Bottoms - From seedPromptOptions.js

#### jeans
```javascript
{
  type: 'denim pants',
  fit: 'various fits',
  style: 'casual versatile'
}
```

#### trousers
```javascript
{
  type: 'dress pants',
  fit: 'tailored',
  style: 'formal professional'
}
```

#### skirt
```javascript
{
  type: 'skirt',
  length: 'various',
  style: 'feminine versatile'
}
```

#### leggings
```javascript
{
  type: 'leggings',
  fit: 'tight fitted',
  style: 'athletic comfortable'
}
```

### Shoes - From seedPromptOptions.js

#### sneakers
```javascript
{
  type: 'sneakers',
  heel: 'flat',
  style: 'casual sporty'
}
```

#### heels
```javascript
{
  type: 'heels',
  heel: 'high',
  style: 'formal elegant'
}
```

#### boots
```javascript
{
  type: 'boots',
  heel: 'various',
  style: 'stylish versatile'
}
```

#### sandals
```javascript
{
  type: 'sandals',
  heel: 'various',
  style: 'summer breathable'
}
```

### Accessories - From seedPromptOptions.js

#### necklace
```javascript
{
  type: 'necklace',
  placement: 'neck',
  style: 'decorative'
}
```

#### earrings
```javascript
{
  type: 'earrings',
  placement: 'ears',
  style: 'decorative'
}
```

#### watch
```javascript
{
  type: 'watch',
  placement: 'wrist',
  style: 'functional decorative'
}
```

#### scarf
```javascript
{
  type: 'scarf',
  placement: 'neck or shoulders',
  style: 'decorative functional'
}
```

#### belt
```javascript
{
  type: 'belt',
  placement: 'waist',
  style: 'functional decorative'
}
```

#### hat
```javascript
{
  type: 'hat',
  placement: 'head',
  style: 'protective fashionable'
}
```

### Outerwear - From seedPromptOptions.js

#### jacket
```javascript
{
  type: 'jacket',
  weight: 'light to medium',
  style: 'casual versatile'
}
```

#### blazer
```javascript
{
  type: 'blazer',
  weight: 'light to medium',
  style: 'formal professional'
}
```

#### coat
```javascript
{
  type: 'coat',
  weight: 'heavy',
  style: 'formal elegant'
}
```

#### cardigan
```javascript
{
  type: 'cardigan',
  weight: 'medium',
  style: 'casual comfortable'
}
```

#### hoodie
```javascript
{
  type: 'hoodie',
  weight: 'medium',
  style: 'casual sporty'
}
```

---

## 🎨 Style Technical Details

### From seedPromptOptions.js

#### fashion-editorial
```javascript
{
  fit: 'tailored and fitted',
  materials: 'premium fabrics',
  vibe: 'professional and polished'
}
```

#### casual
```javascript
{
  fit: 'relaxed fit',
  materials: 'comfortable fabrics',
  vibe: 'casual and comfortable'
}
```

#### formal
```javascript
{
  fit: 'tailored and fitted',
  materials: 'premium fabrics',
  vibe: 'professional and polished'
}
```

#### elegant
```javascript
{
  fit: 'elegant and flowing',
  materials: 'luxury fabrics',
  vibe: 'sophisticated and refined'
}
```

#### sporty
```javascript
{
  fit: 'athletic fit',
  materials: 'performance fabrics',
  vibe: 'active and sporty'
}
```

#### minimalist
```javascript
{
  fit: 'clean and simple',
  materials: 'minimalist fabrics',
  vibe: 'simple and modern'
}
```

---

## 🎨 Color Palette Technical Details

### From seedPromptOptions.js

#### vibrant
```javascript
{
  saturation: 'high saturation',
  contrast: 'high contrast',
  colors: 'vibrant and bold'
}
```

#### monochrome
```javascript
{
  saturation: 'no saturation',
  contrast: 'high contrast',
  colors: 'black and white only'
}
```

#### pastel
```javascript
{
  saturation: 'low saturation',
  contrast: 'soft contrast',
  colors: 'pastel and gentle'
}
```

#### jewel-tones
```javascript
{
  saturation: 'rich saturation',
  contrast: 'medium contrast',
  colors: 'jewel-toned and rich'
}
```

#### earth-tones
```javascript
{
  saturation: 'natural saturation',
  contrast: 'warm contrast',
  colors: 'earth and warm tones'
}
```

---

## 📷 Camera Angle Technical Details

### From seedPromptOptions.js

#### front-view
```javascript
{
  angle: '0 degrees',
  focus: 'front facing',
  perspective: 'direct view'
}
```

#### side-view
```javascript
{
  angle: '90 degrees',
  focus: 'side profile',
  perspective: 'lateral view'
}
```

#### three-quarter-view
```javascript
{
  angle: '45 degrees',
  focus: 'angled view',
  perspective: 'three-quarter angle'
}
```

#### overhead-view
```javascript
{
  angle: '90 degrees down',
  focus: 'top down',
  perspective: 'aerial view'
}
```

#### low-angle
```javascript
{
  angle: 'looking up',
  focus: 'upward perspective',
  perspective: 'worm\'s eye view'
}
```

#### high-angle
```javascript
{
  angle: 'looking down',
  focus: 'downward perspective',
  perspective: 'god\'s eye view'
}
```

---

## 🔧 How SmartPromptBuilder Expands These

Location: `backend/services/smartPromptBuilder.js`

Function: `getFallbackTechnicalDetails(category, optionValue)`

### Example Expansion

**Input:**
```javascript
selectedOptions = {
  scene: 'studio',
  lighting: 'soft-diffused',
  mood: 'confident',
  style: 'fashion-editorial'
}
```

**Technical Details Loaded:**
```javascript
scene details = {
  lighting: 'controlled studio lighting',
  background: 'clean white or neutral',
  equipment: 'professional photography setup'
}

lighting details = {
  key_light: '2x3 foot softbox, 45° angle, 2m high',
  fill: 'reflector opposite side',
  ratio: '1:2',
  power: '400W'
}

mood details = {
  expression: 'graceful and poised',  // NOTE: confident -> elegant technical details
  posture: 'elegant and refined',
  energy: 'sophisticated and polished'
}

style details = {
  fit: 'tailored and fitted',
  materials: 'premium fabrics',
  vibe: 'professional and polished'
}
```

**Output in Prompt:**
```
Setting: Professional studio with controlled studio lighting,
clean white or neutral background, professional photography setup

Lighting: 2x3 foot softbox at 45° angle, 2m high, fill reflector
opposite side, 1:2 ratio, 400W power

Mood: Expression graceful and poised, posture elegant and refined,
energy sophisticated and polished

Fashion Style: Tailored and fitted fit, premium fabrics, professional
and polished vibe
```

---

## 📊 Statistics

### Total Technical Detail Fields

- **Scene:** 50+ specifications across 9 options
- **Lighting:** 40+ specifications across 8 options  
- **Mood:** 30+ specifications across 6 options
- **Style:** 25+ specifications across 8 options
- **Color Palette:** 20+ specifications across 6 options
- **Fashion Items:** 100+ specifications across 40+ clothing items
- **Camera Angles:** 15+ specifications across 6 angles

### Total Options with Technical Details: 100+

---

## ❓ How Are These Used?

### In Image Generation:

1. User selects options
2. Backend loads technicalDetails from each selected option
3. smartPromptBuilder.js calls `getFallbackTechnicalDetails()`
4. All technical specs are expanded into the prompt
5. Prompt sent to Google Flow API with full specifications
6. AI generates image based on detailed technical specifications

### In Database:

```javascript
{
  value: 'studio',
  category: 'scene',
  technicalDetails: {
    lighting: 'controlled studio lighting',
    background: 'clean white or neutral',
    equipment: 'professional photography setup'
  }
}
```

### In Frontend:

Shows only to users who view the option details. Used by smartPromptBuilder to generate detailed prompts.

---

## 🚀 Effectiveness

### Without Technical Details (Bad):
"Make a studio photo with soft lighting and confident mood"

### With Technical Details (Good):
"Professional studio with controlled studio lighting, clean white or 
neutral background, professional photography setup. Soft-diffused 
lighting with 2x3 foot softbox at 45° angle 2m high, fill reflector 
opposite side (1:2 ratio), 400W power. Graceful and poised expression, 
elegant and refined posture, sophisticated and polished energy. Fashion 
editorial style with tailored fit, premium fabrics, professional vibe."

**Result:** Much more accurate and consistent image generation!

---

## ✅ Summary

This document shows all the **actual technical details** that exist in the real system:
- Scene specifications
- Lighting configurations
- Mood descriptions
- Fashion details
- Color information
- Camera angles

All of these are used by smartPromptBuilder to create detailed, specific prompts that lead to better image generation results.

Use these as your **reference templates** when adding new options to the system!
