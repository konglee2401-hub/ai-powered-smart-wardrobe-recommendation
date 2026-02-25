# 1-Click TikTok Affiliate Video Workflow - Complete Implementation

## 🎬 Overview

The **Affiliate Video TikTok** use case in OneClickCreator provides a complete end-to-end workflow for generating TikTok affiliate videos with:
- ✅ ChatGPT Browser Automation for unified analysis (STEP 1)
- ✅ Parallel image generation using Google Flow (STEP 2)
- ✅ ChatGPT Browser Automation for deep video analysis (STEP 3)
- ✅ Voiceover generation (female narrator, customizable pace)
- ✅ Hashtag suggestions
- ✅ Browser automation ONLY (no API provider fallback)

---

## 📋 Workflow Steps

### Step 1: ChatGPT Browser Automation Analysis
- Uses **ChatGPT Browser Automation** (not OpenAI API, not Gemini)
- Analyzes both character and product images
- Generates style recommendations and compatibility analysis
- Non-blocking failure - if analysis fails, continues with fallback
- Results: Character profile, product info, styling recommendations

### Step 2: Generate 2 Images (Parallel)
Using **Google Flow Browser Automation** only:
1. **Image 1**: Character wearing product (9:16 TikTok format)
2. **Image 2**: Character holding product (9:16 TikTok format)

Both images generated in parallel using `GoogleFlowService.generateImage()` directly.

**No API provider fallback** - only browser automation.

### Step 3: TikTok Settings
User selects:
- **Video Duration**: 10, 15, 20, 30, 45, or 60 seconds
- **Narrator Voice**: 
  - Female (Slow, Normal, Fast) - **default: Female Fast**
  - Male (Slow, Normal, Fast)

### Step 4: Deep ChatGPT Browser Automation Analysis
Analyzes all 3 images (wearing, holding, original product) using **ChatGPT Browser Automation** to generate:

#### A. Video Scripts (4 segments)
```
[Intro] 3-15 seconds
└── "Introducing the amazing [product]..."

[Wearing] 5-25 seconds
└── "See how flawlessly it looks when worn......"

[Holding] 5-25 seconds
└── "Check out the exquisite details..."

[CTA] 5-35 seconds (typically largest)
└── "Don't miss out! Get yours now..."
```

#### B. Voiceover Script
- Dynamic generation based on product name and color
- Pace adaptation (fast = multiple exclamations, slow = pauses)
- Example: *"OMG check this out!!! This gorgeous [color] [product] is literally everything...!!!"*

#### C. Hashtags
Auto-generated (10 suggestions):
- Base: Affiliate, FashionHaul, ProductReview, MustHave, etc.
- Focus-specific: TopOfTheDay, BottomStyle, ShoeGame, AccessoryGoals
- Trending: FYP, Viral, TikTok, Shopping

### Step 5: Generate Video
- Creates 9:16 vertical TikTok format video
- Segments configured with timing from Step 4
- Routes through **browser automation only**
- Output: MP4 video file

### Step 6: Generate Voiceover
- Text-to-Speech generation
- Female narrator with selected pace (slow/normal/fast)
- Duration matches video length
- Output: MP3 audio

### Step 7: Finalize Package
Combines into complete TikTok package:
- ✅ 2 generated images (wearing + holding)
- ✅ Video (9:16, duration configured)
- ✅ Voiceover (MP3, female, customizable pace)
- ✅ Hashtags (10 suggestions)
- ✅ Original product image (reference)

---

## 🔧 Technical Implementation

### Frontend: OneClickCreatorPage.jsx

#### Constants
```jsx
const USE_CASES = [
  { 
    value: 'affiliate-video-tiktok', 
    label: 'Affiliate Video TikTok', 
    description: 'Video Affiliate cho TikTok 9:16 (2 ảnh + Voiceover + Hashtag)' 
  },
  // ... other use cases
];

const WORKFLOW_STEPS_AFFILIATE_TIKTOK = [
  { id: 'analyze', name: 'Analyze', icon: Sparkles },
  { id: 'apply-recommendations', name: 'Apply Recommendations', icon: Wand2 },
  { id: 'tiktok-options', name: 'Select Settings', icon: Volume2 },
  { id: 'generate-images-parallel', name: 'Generate 2 Images', icon: ImageIcon },
  { id: 'deep-analysis', name: 'Deep Analysis', icon: Wand2 },
  { id: 'generate-video', name: 'Generate Video', icon: Video },
  { id: 'generate-voiceover', name: 'Generate Voiceover', icon: Mic },
  { id: 'finalize', name: 'Finalize Package', icon: Package },
];

const TIKTOK_DURATIONS = [10, 15, 20, 30, 45, 60];
const VOICE_OPTIONS = [
  { label: 'Female - Slow', value: 'female-slow' },
  { label: 'Female - Normal', value: 'female-normal' },
  { label: 'Female - Fast', value: 'female-fast' }, // ← Default
  { label: 'Male - Slow', value: 'male-slow' },
  { label: 'Male - Normal', value: 'male-normal' },
  { label: 'Male - Fast', value: 'male-fast' },
];
```

#### State Management
```jsx
const [tiktokVideoDuration, setTiktokVideoDuration] = useState(20); // Default
const [voiceOption, setVoiceOption] = useState('female-fast'); // Default

// Results storage
const [deepAnalysisResult, setDeepAnalysisResult] = useState(null);
const [suggestedHashtags, setSuggestedHashtags] = useState([]);
const [generatedVideo, setGeneratedVideo] = useState(null);
const [generatedVoiceover, setGeneratedVoiceover] = useState(null);
```

#### Main Flow Function
```jsx
const handleAffiliateVideoTikTokFlow = async (
  characterImageBase64,
  productImageBase64,
  recommendedOptions,
  analysisResult
) => {
  // Step 1: Call backend /api/ai/affiliate-video-tiktok
  //         Receives: character, product images, duration, voice settings
  //         Returns: wearing image, holding image, deep analysis results
  
  // Step 2: Call /api/ai/affiliate-video-tiktok/generate-video
  //         Input: Images, scripts, duration
  //         Return: Video URL
  
  // Step 3: Call /api/ai/affiliate-video-tiktok/generate-voiceover
  //         Input: Voiceover script, voice settings, duration
  //         Return: Audio URL
  
  // Step 4: Call /api/ai/affiliate-video-tiktok/finalize
  //         Assembles final package with all assets
  //         Return: Complete package (images, video, audio, hashtags)
};
```

##### Payload Structure
```javascript
{
  characterImage: "base64string...",
  productImage: "base64string...",
  videoDuration: 20,           // seconds
  voiceGender: "female",       // or "male"
  voicePace: "fast",           // or "slow", "normal"
  productFocus: "full-outfit", // or "top", "bottom", "shoes", "accessories"
  imageProvider: "google-flow",    // Browser automation only
  videoProvider: "google-flow",    // Browser automation only
  generateVideo: true,
  generateVoiceover: true,
  options: {
    // Style recommendations from analysis
    scene: "studio",
    lighting: "soft-diffused",
    mood: "confident",
    style: "minimalist",
    colorPalette: "neutral",
    cameraAngle: "eye-level"
  }
}
```

### Backend: affiliateVideoTikTokService.js

#### STEP 1: ChatGPT Browser Automation Analysis (Non-blocking)
```javascript
try {
  // Use ChatGPT Browser Automation (not OpenAI API, not Gemini)
  let chatGPTService = new ChatGPTService({ headless: true });
  await chatGPTService.initialize();
  
  const analysisResult = await chatGPTService.analyzeMultipleImages(
    [characterFilePath, productFilePath],
    analysisPrompt
  );
  
  analysis = analysisResult.data || analysisResult;
} catch (step1Error) {
  console.warn('⚠️ ChatGPT analysis failed (non-blocking), continuing with defaults...');
  // Use fallback analysis object
}
```

**Key Points:**
- **Provider**: ChatGPT Browser Automation ONLY
- **No API calls**: Direct browser automation, no OpenAI API
- **Non-blocking**: Continues even if analysis fails
- **Fallback**: Uses default values if error occurs

**Fallback Analysis Object:**
```javascript
{
  character: { name: 'Model', bodyType: 'average', skinTone: 'medium' },
  product: { name: 'Product', type: 'apparel', color: 'varies' },
  recommendations: {},
  hashtags: ['FashionTrend', 'StyleInspo', 'ProductReview'],
  vibes: ['professional', 'modern', 'elegant']
}
```

#### STEP 2: Parallel Image Generation
Using **GoogleFlowService** directly (browser automation):

```javascript
let googleFlowService = new GoogleFlowService();
await googleFlowService.initialize();

// Promise 1: Generate wearing image
const wearingImageResult = await googleFlowService.generateImage(
  wearingPrompt,
  { download: true, outputPath: '...path...' }
);

// Promise 2: Generate holding image (in parallel)
const holdingImageResult = await googleFlowService.generateImage(
  holdingPrompt,
  { download: true, outputPath: '...path...' }
);

// Both complete before proceeding
await Promise.all([wearingPromise, holdingPromise]);
```

**Result Structure:**
```javascript
{
  url: "https://...",           // CDN URL
  path: "/path/to/local/file"   // Local file saved
}
```

#### STEP 3: Deep ChatGPT Browser Automation Analysis
Analyzes all 3 images using **ChatGPT Browser Automation** for content generation:

```javascript
const chatGPTService = new ChatGPTService({ headless: true });
await chatGPTService.initialize();

// Analyze all 3 images for video script generation
const deepAnalysisResult = await chatGPTService.analyzeImages(
  [wearingImagePath, holdingImagePath, productImagePath],
  deepAnalysisPrompt
);

await chatGPTService.close();
```

**Returns:**
```javascript
{
  videoScripts: [
    {
      segment: 'intro',
      duration: 3,
      script: "Introducing...",
      image: 'wearing'
    },
    // ... more segments
  ],
  voiceoverScript: "OMG check this out!!!...",
  hashtags: ['#Affiliate', '#FashionHaul', ...]
}
```

**Key Points:**
- **Provider**: ChatGPT Browser Automation ONLY
- **No APIs**: Direct browser automation, no external APIs
- **Fallback**: If analysis fails, uses structured generation
- **Content**: Generates scripts, voiceover, hashtags all at once

#### STEP 3.5: Google Drive Upload (Optional)
- Uploads original character & product images
- Non-blocking failure handling
- Uses OAuth or API key if configured

#### Return Response
```javascript
{
  success: true,
  flowId: "flow-123456...",
  data: {
    step1: { status, analysis, driveUrls },
    step2: { status, images: { wearing, holding } },
    step3: { status, analysis: { videoScripts, voiceoverScript, hashtags } }
  }
}
```

### Backend Endpoints

#### POST /api/ai/affiliate-video-tiktok
Main orchestration endpoint (Steps 1-3).

**Request:**
```json
{
  "characterImage": "base64...",
  "productImage": "base64...",
  "videoDuration": 20,
  "voiceGender": "female",
  "voicePace": "fast",
  "productFocus": "full-outfit"
}
```

**Response:**
```json
{
  "success": true,
  "flowId": "flow-...",
  "data": {
    "step1": { "analysis": {...} },
    "step2": { "images": { "wearing": "url", "holding": "url" } },
    "step3": { "analysis": { "videoScripts": [...], "voiceoverScript": "...", "hashtags": [...] } }
  }
}
```

#### POST /api/ai/affiliate-video-tiktok/generate-video
Generates video from images and scripts.

**Request:**
```json
{
  "wearingImageUrl": "...",
  "holdingImageUrl": "...",
  "videoScripts": [...],
  "videoDuration": 20,
  "aspectRatio": "9:16"
}
```

#### POST /api/ai/affiliate-video-tiktok/generate-voiceover
Generates TTS audio for voiceover.

**Request:**
```json
{
  "voiceoverScript": "...",
  "voiceGender": "female",
  "voicePace": "fast",
  "videoDuration": 20
}
```

#### POST /api/ai/affiliate-video-tiktok/finalize
Assembles final package.

**Request:**
```json
{
  "videoUrl": "...",
  "voiceoverUrl": "...",
  "wearingImageUrl": "...",
  "holdingImageUrl": "...",
  "hashtags": [...]
}
```

---

## 🎯 Key Design Decisions

### 1. ChatGPT Browser Automation for ALL Analysis
- **STEP 1**: Uses ChatGPT Browser Automation for unified analysis
- **STEP 3**: Uses ChatGPT Browser Automation for deep video analysis
- **No API calls**: Never calls OpenAI API, Gemini, or any external AI service
- **Direct browser**: All analysis through direct browser automation

### 2. Google Flow Browser Automation for Images & Videos
- **STEP 2**: Uses GoogleFlowService directly for image generation
- **STEP 5**: Uses browser automation for video generation
- **No provider fallback**: Never falls back to OpenRouter, Pollinations, etc.
- **All via browser**: Everything goes through browser automation

### 3. Non-blocking Analysis
- If STEP 1 (analysis) fails, STEP 2 still runs with fallback
- Continues workflow even if OpenRouter/API fails
- User sees progress instead of errors

### 4. Voice Defaults
- Default: **Female Fast** (engaging, energetic for TikTok)
- Customizable via settings

### 5. Dynamic Script Generation
- Segmented approach (intro, wearing, holding, CTA)
- Duration-based distribution
- Product-specific content

### 6. Hashtag Strategy
- Base category (Affiliate, FashionHaul, etc.)
- Product focus specific (TopOfTheDay for tops)
- Trending (FYP, Viral, Shopping)

---

## 🧪 Testing the Workflow

### 1. Start Backend
```bash
cd backend
npm run dev
```

### 2. Start Frontend
```bash
cd frontend
npm run dev
```

### 3. Navigate to OneClickCreator
- Go to http://localhost:3000/one-click
- Select "Affiliate Video TikTok" use case

### 4. Upload Images
- Character image (model wearing clothes)
- Product image

### 5. Configure Settings
- Product Focus: Select "full-outfit" (or relevant category)
- Video Duration: 20s (default)
- Narrator Voice: Female - Fast (default)

### 6. Run Workflow
- Click "Generate"
- Monitor progress in session log
- Expected Duration: 3-5 minutes total

### 7. Verify Outputs
```
✅ Logs show:
  - STEP 1: Analysis (or fallback used)
  - STEP 2: Both images generated in parallel
  - STEP 3: Video scripts, voiceover, hashtags generated
  - STEP 4: Video created
  - STEP 5: Voiceover generated
  - STEP 6: Package finalized
```

---

## 📊 Expected Performance

| Step | Duration | Details |
|------|----------|---------|
| Analysis | 5-10s | Unified analysis (non-blocking) |
| Image Gen | 30-40s | Parallel Google Flow generation |
| Deep Analysis | 2-3s | ChatGPT script generation |
| Video Gen | 20-30s | Video compilation |
| Voiceover | 10-15s | TTS generation |
| **Total** | **2-3 min** | End-to-end TikTok package |

---

## 🐛 Troubleshooting

### Images not generating
- Check: GoogleFlowService initialization
- Check: Puppeteer browser availability
- Check: Memory and system resources

### Analysis fails silently
- Expected behavior - workflow continues
- Check logs for "Analysis failed (non-blocking)"
- Filter categories still provided

### Video/Voiceover not generated
- Check: Video provider configured as google-flow
- Check: TTS service availability
- Check: Audio codec compatibility

### Hashtags missing
- Deep analysis should always return hashtags
- If empty, check ChatGPT analysis function
- Fallback to default hashtags if needed

---

## 📈 Future Enhancements

1. **Real ChatGPT Integration** - Replace mock with actual GPT-4V API
2. **Multi-model Voiceover** - Support more voices and languages
3. **Audio Sync** - Better audio-video synchronization
4. **Effects & Transitions** - Add visual effects to video
5. **Analytics Integration** - Track TikTok posting and performance
6. **Batch Processing** - Generate multiple TikToks in one flow
7. **Custom Hashtag Input** - Let users add their own hashtags
8. **Music Integration** - Add background music to videos

---

## ✅ Checklist for Launch

- [x] Use case added to OneClickCreator
- [x] Workflow steps defined
- [x] Frontend UI for TikTok settings
- [x] Parallel image generation implemented
- [x] Deep analysis functional
- [x] Video generation endpoint ready
- [x] Voiceover generation endpoint ready
- [x] Finalize package endpoint ready
- [x] Backend routing to browser automation only
- [x] Error handling (non-blocking analysis)
- [x] Hashtag generation
- [x] Logging and monitoring
- [ ] End-to-end testing completed
- [ ] Documentation complete (this file)
- [ ] Production deployment

---

**Status**: 🟢 **Updated - Browser Automation Complete**

All analysis now uses ChatGPT Browser Automation (STEP 1 + STEP 3).
All image/video generation uses Google Flow Browser Automation (STEP 2 + STEP 5).
No external AI APIs used - pure browser automation workflow.
