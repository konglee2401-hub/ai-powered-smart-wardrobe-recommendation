# Options & Prompt Options Management Guide

## 📋 Overview

The project has two main seed files for configuring options:
1. **seedOptions.js** - Basic prompt options (scene, lighting, mood, style, colors, use cases)
2. **seedPromptOptions.js** - Enhanced prompt options with technical details

Both files support **technicalDetails** field for detailed prompt building. The front-end has customization pages and APIs for managing these options dynamically.

---

## 📂 File Locations

### Seed Files (Backend)
```
backend/
├── seedOptions.js                 # Simpler seed file with basic options
└── scripts/
    └── seedPromptOptions.js       # Enhanced seed with technical details (RECOMMENDED)
```

### Data Models (Backend)
```
backend/models/
└── PromptOption.js               # Schema with technicalDetails, keywords, usageCount
```

### API Routes (Backend)
```
backend/routes/
└── promptOptions.js              # CRUD endpoints for managing options
```

### Services (Backend)
```
backend/services/
├── smartPromptBuilder.js         # Uses technical details from options
└── aiOptionsAPI.js               # Options service layer
```

### Frontend Pages
```
frontend/src/pages/
├── OptionsManagement.jsx         # Basic option add/delete
├── AdvancedCustomizationPage.jsx # Advanced customization interface
└── ImageGenerationPage.jsx       # Uses options in flow
```

### Frontend Components
```
frontend/src/components/
├── AdvancedCustomization.jsx     # Customization with presets & tabs
├── GenerationOptions.jsx         # Option selection UI
├── StyleCustomizer.jsx           # Style-specific options
└── RecommendationSelector.jsx    # Selection interface
```

---

## 🔧 Technical Details Structure

### In seedPromptOptions.js

Example from Scene options:
```javascript
{
  category: 'scene',
  label: 'Studio',
  value: 'studio',
  description: 'Professional studio setting with controlled lighting',
  keywords: ['studio', 'professional', 'controlled', 'lighting'],
  technicalDetails: {
    lighting: 'controlled studio lighting',
    background: 'clean white or neutral',
    equipment: 'professional photography setup'
  },
  isActive: true,
  sortOrder: 1
}
```

### In seedOptions.js (Alternative simpler version)

```javascript
{
  value: 'studio',
  label: 'Studio (Clean White)',
  description: 'Professional studio with clean white background',
  technicalDetails: {
    background: 'white seamless paper',
    floor: 'reflective',
    space: '10x10 feet'
  }
}
```

---

## 📊 PromptOption Model Schema

Location: `backend/models/PromptOption.js`

### Core Fields
```javascript
{
  value: String,                    // Unique identifier (e.g., 'studio')
  label: String,                    // Display name
  description: String,              // User-friendly description
  category: String,                 // scene, lighting, mood, style, etc.
  
  // NEW: Technical Details
  keywords: [String],               // For AI matching
  technicalDetails: Mixed,          // Detailed specs (flexible structure)
  previewImage: String,             // UI preview image URL
  
  // Tracking
  usageCount: Number,               // How many times used
  lastUsed: Date,                   // Last usage timestamp
  isActive: Boolean,                // Active/inactive flag
  isAiGenerated: Boolean,           // Whether AI-created
  sortOrder: Number,                // Display order
  
  // Metadata
  source: String,                   // 'default', 'user-created', 'ai-generated'
  addedBy: String,                  // Who added it
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🌐 API Endpoints

Location: `backend/routes/promptOptions.js`

### GET Endpoints

#### 1. Get All Options (Grouped by Category)
```
GET /api/prompt-options
```
Response:
```json
{
  "success": true,
  "data": {
    "options": {
      "scene": [
        { "value": "studio", "label": "Studio", "description": "...", "usageCount": 15 },
        { "value": "beach", "label": "Beach", "description": "...", "usageCount": 8 }
      ],
      "lighting": [ ... ]
    },
    "total": 50
  }
}
```

#### 2. Get Options by Category
```
GET /api/prompt-options/:category
```
Example: `GET /api/prompt-options/scene`

Response:
```json
{
  "success": true,
  "data": {
    "category": "scene",
    "options": [ ... ],
    "total": 10
  }
}
```

### POST Endpoints

#### 3. Create New Option
```
POST /api/prompt-options
Content-Type: application/json

{
  "category": "scene",
  "value": "my-custom-scene",
  "label": "My Custom Scene",
  "description": "My scene description",
  "metadata": {
    "technicalDetails": {
      "background": "custom backdrop",
      "lighting": "special setup"
    },
    "keywords": ["custom", "special"]
  }
}
```

Response:
```json
{
  "success": true,
  "data": { ... }
}
```

#### 4. Increment Usage Count
```
POST /api/prompt-options/:category/:value/use
```
Example: `POST /api/prompt-options/scene/studio/use`

Response:
```json
{
  "success": true,
  "data": {
    "category": "scene",
    "value": "studio",
    "usageCount": 16
  }
}
```

#### 5. AI Extract/Create Option
```
POST /api/prompt-options/ai-extract
Content-Type: application/json

{
  "category": "scene",
  "text": "Beautiful minimalist interior design"
}
```
Extracts from text and creates/updates option, with AI-generated label, description, keywords, technical details.

---

## 🎨 Frontend Customization Pages

### 1. **OptionsManagement.jsx**
Location: `frontend/src/pages/OptionsManagement.jsx`

Features:
- Add new options per category
- Delete options
- View usage counts
- Simple CRUD interface

Categories supported:
- scene, mood, style, clothingType, color, pattern, accessory, occasion

### 2. **AdvancedCustomizationPage.jsx**
Location: `frontend/src/pages/AdvancedCustomizationPage.jsx`

Contains **AdvancedCustomization component** with:

#### Tabs:
1. **🎨 Style Tab**
   - Color Palette (monochromatic, analogous, complementary, triadic, warm, cool)
   - Mood & Atmosphere (serene, energetic, mysterious, romantic, dramatic, etc.)
   - Art Style (photorealistic, cinematic, studio, fashion, portrait, lifestyle, etc.)

2. **💡 Lighting Tab**
   - Lighting Type (natural, studio, dramatic, ambient, colored, backlit, rim)
   - Light Direction (front, side, back, top, bottom, multiple)
   - Light Intensity (slider 0.1-2.0)
   - Color Temperature controls

3. **📐 Composition Tab**
   - Camera angles, depth, framing options
   - Rule of thirds, golden ratio settings

4. **✨ Effects Tab**
   - Post-processing effects
   - Color grading, filters

5. **📚 Presets Tab**
   - Save/load preset combinations
   - Share presets

### 3. **ImageGenerationPage.jsx**
Location: `frontend/src/pages/ImageGenerationPage.jsx`

Uses options with **RecommendationSelector** component
- Step 1: Upload images
- Step 2: Get AI analysis
- Step 3: Select options
- Step 4: Generate images with selected options

---

## 🔗 Integration Points

### How Technical Details Are Used

Location: `backend/services/smartPromptBuilder.js`

```javascript
// Gets option with technical details
const option = await PromptOption.findOne({ value: optionValue, category });

// getFallbackTechnicalDetails() fetches techSpecs
const techDetails = this.getFallbackTechnicalDetails(category, optionValue);

// Technical details expanded into prompt
// e.g., "studio" becomes:
// "Studio setting with white seamless paper background, 
//  reflective floor, 10x10 feet space, professional setup"
```

### Where Options Are Loaded

1. **ImageGenerationPage.jsx** - Loads during Step 2:
   ```javascript
   const response = await aiOptionsAPI.getOptions();
   ```

2. **UnifiedVideoGeneration.jsx** - Similarly loads options:
   ```javascript
   const response = await axiosInstance.get(`/api/prompt-options`);
   ```

---

## 🚀 Usage Examples

### Example 1: Understanding Technical Details

**seedPromptOptions.js - Lighting Option:**
```javascript
{
  category: 'lighting',
  label: 'Soft Diffused',
  value: 'soft-diffused',
  description: 'Soft, diffused lighting with gentle illumination',
  keywords: ['soft', 'diffused', 'gentle', 'even'],
  technicalDetails: {
    type: 'softbox lighting',
    quality: 'diffused and even',
    shadows: 'minimal and soft',
    // NEWLY EXPANDED in smartPromptBuilder:
    key_light: '2x3 foot softbox 45° angle',
    fill: '1x1.5 foot reflector',
    ratio: '1:2',
    power: '400W strobes'
  }
}
```

In **smartPromptBuilder.js**, this becomes:
```
Lighting: soft-diffused
- Key Light: 2x3 foot softbox at 45° angle
- Fill: 1x1.5 foot reflector
- Ratio: 1:2 (traditional fashion ratio)
- Power: 400W strobes
- Quality: Diffused and even
- Shadows: Minimal and soft
```

### Example 2: Adding Custom Option via Frontend

1. Go to `OptionsManagement.jsx`
2. Select category: "scene"
3. Enter value: "my-studio"
4. POST to `/api/prompt-options` with metadata
5. New option appears in lists

### Example 3: Using Custom Options in Image Generation

1. Upload images → Step 1
2. Get analysis → Step 2
3. Select "My Custom Scene" → Step 3
4. Generate with custom technical specs → Step 4

---

## 📝 Customization Recommendations

### Adding Your Own Technical Details

**File: `backend/scripts/seedPromptOptions.js`**

To add more technical details to a category:

```javascript
{
  category: 'scene',
  label: 'My Scene',
  value: 'my-scene',
  description: 'Description here',
  keywords: ['keyword1', 'keyword2'],
  technicalDetails: {
    // Add as many fields as needed
    background: 'detailed spec',
    lighting_setup: 'specific equipment',
    distance_from_subject: '8 feet',
    focal_length: '85mm',
    aperture: 'f/2.8',
    // These get expanded into the prompt
  }
}
```

### Creating New Categories

**File: `backend/models/PromptOption.js` (category enum)**

Add to the enum:
```javascript
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
  'MY_NEW_CATEGORY'  // Add here
]
```

Then seed in `seedPromptOptions.js`

---

## 🔄 Complete Field Reference

### Comparison: seedOptions.js vs seedPromptOptions.js

| Field | seedOptions | seedPromptOptions | Usage |
|-------|---------|---------|-------|
| value | ✅ | ✅ | Unique identifier |
| label | ✅ | ✅ | Display name |
| description | ✅ | ✅ | User description |
| category | ❌ | ✅ | Explicit category field |
| keywords | ❌ | ✅ | AI matching, search |
| technicalDetails | ✅ (simpler) | ✅ (comprehensive) | Detailed prompt building |
| previewImage | ❌ | ✅ | UI preview |
| sortOrder | ❌ | ✅ | Display ordering |
| isActive | ❌ | ✅ | Active/inactive toggle |

**Recommendation**: Use `seedPromptOptions.js` as it's more complete and structured.

---

## 📊 Database Queries (MongoDB)

### Check what's in database
```bash
# All prompt options
db.promptoptions.find().pretty()

# By category
db.promptoptions.find({ category: 'scene' })

# Most used
db.promptoptions.find().sort({ usageCount: -1 }).limit(10)

# AI-generated vs user-created
db.promptoptions.find({ isAiGenerated: true })
db.promptoptions.find({ source: 'user-created' })
```

---

## ✅ Summary

**Two main seed files** to reference for technical details:

1. **[seedOptions.js](../../backend/seedOptions.js)** - Basic structure
2. **[seedPromptOptions.js](../../backend/scripts/seedPromptOptions.js)** - Enhanced with full technical specs ⭐

**Frontend Pages to Explore:**
- [OptionsManagement.jsx](../../frontend/src/pages/OptionsManagement.jsx) - Basic CRUD
- [AdvancedCustomizationPage.jsx](../../frontend/src/pages/AdvancedCustomizationPage.jsx) - Rich UI

**API:** `GET /api/prompt-options`, `POST /api/prompt-options`, etc.

**Technical Details** are key to generating accurate prompts - include specific measurements, equipment, angles, distances, etc.
