# ChatGPT Integration for Script Generation

## 📝 Overview

The Script Generation Step (Step 2) uses ChatGPT via your existing Browser Automation service to analyze videos and generate platform-specific voiceover scripts.

## 🔗 Integration Points

### Current Implementation
- Uses `/api/v1/browser-automation` endpoint (existing service)
- Sends videos + platform-specific prompts
- ChatGPT analyzes video content and generates scripts

### Current Status
The `ScriptGenerationStep.jsx` component is prepared to use your browser automation service. It sends:

```javascript
// Current approach in ScriptGenerationStep.jsx
const response = await browserAutomationAPI.analyzeWithBrowser(formData);
```

## 🔄 How Script Generation Works

### Step 2A: Video Analysis
1. User clicks "Generate Script"
2. Script template selected based on platform (TikTok/Facebook/YouTube/Instagram)
3. First video sent to ChatGPT along with prompt
4. ChatGPT analyzes video content

### Step 2B: Prompt Template Selection

**For TikTok Sales:**
```
Analyze the video and create a TikTok sales voiceover script for: [Product Name]

Requirements:
- Very engaging and energetic tone
- Duration: 15-30 seconds when read naturally
- Include product benefits concisely
- Add strong call-to-action at the end
- Use trend-relevant language
- Appeal to young audience (18-35 years old)
- Match the video content and pacing

Format: Provide ONLY the script text, no additional commentary.
```

**For Facebook Reels:**
```
Create a professional Facebook Reels voiceover script for: [Product Name]

Requirements:
- Professional but warm storytelling tone
- Duration: 20-40 seconds when read naturally
- Create narrative around product features and lifestyle
- Build emotional connection with audience
- Include product transition moments
- Address common customer concerns naturally

Format: Provide ONLY the script text, no additional commentary.
```

**For YouTube Shorts:**
```
Create a YouTube Short voiceover script for: [Product Name]

Requirements:
- Clear pronunciation and pacing for subtitle synchronization
- Duration: 30-60 seconds when read naturally
- Detailed product information and benefits
- Structured with clear sections (intro, benefits, CTA)
- Make it easy to follow along with visuals

Format: Provide ONLY the script text, no additional commentary.
```

**For Instagram Stories:**
```
Create an Instagram Stories voiceover script for: [Product Name]

Requirements:
- Conversational, friend-to-friend tone
- Duration: 10-20 seconds when read naturally
- Create FOMO (fear of missing out)
- Highlight unique selling points
- Use trendy language and casual phrasing
- Direct and punchy

Format: Provide ONLY the script text, no additional commentary.
```

## 🎯 Implementation Details

### Backend Integration (Optional Enhancement)

If you want to rewrite the script generation to use ChatGPT directly instead of browser automation, here's what you'd need:

**File: `backend/controllers/ttsController.js`**

```javascript
/**
 * Analyze video and generate script using ChatGPT
 * PIN /api/tts/analyze-and-script
 */
static async analyzeVideoAndGenerateScript(req, res) {
  try {
    const { videoPath, platform, productImage, productName, productDescription } = req.body;

    if (!videoPath || !platform) {
      return res.status(400).json({
        error: 'Missing required fields: videoPath, platform',
      });
    }

    // Check if video exists
    if (!fs.existsSync(videoPath)) {
      return res.status(400).json({
        error: 'Video file not found',
      });
    }

    // Build ChatGPT prompt
    let prompt = this.buildScriptPrompt(platform, productName, productDescription);

    // Add product context if image provided
    let base64Image = null;
    if (productImage && fs.existsSync(productImage)) {
      const imageBuffer = fs.readFileSync(productImage);
      base64Image = imageBuffer.toString('base64');
    }

    // Send to ChatGPT via browser automation
    // This would need to be implemented based on your browser automation service
    const response = await browserAutomationService.analyzeWithChatGPT({
      videoPath,
      prompt,
      productImage: base64Image,
      platform,
    });

    if (!response.success) {
      throw new Error(response.error || 'ChatGPT analysis failed');
    }

    res.json({
      success: true,
      script: response.script,
      analysis: response.analysis,
      duration: ttsService.estimateAudioDuration(response.script),
    });
  } catch (error) {
    console.error('Script Generation Error:', error);
    res.status(500).json({
      error: 'Failed to generate script',
      message: error.message,
    });
  }
}
```

### Frontend Integration (Current)

The frontend component (`ScriptGenerationStep.jsx`) is ready to use, but you need to ensure:

1. **Browser Automation Service is properly configured**
2. **ChatGPT session is active and authenticated**
3. **Video upload paths are accessible to backend**

### Current Flow in Frontend

```javascript
// In ScriptGenerationStep.jsx
const handleGenerateScript = async () => {
  // 1. Build platform-specific prompt
  const prompt = platformPrompts[style];
  
  // 2. Create FormData with video and metadata
  const formData = new FormData();
  formData.append('video', videoFile.file);
  formData.append('prompt', prompt);
  
  // 3. Send to browser automation API
  const response = await browserAutomationAPI.analyzeWithBrowser(formData);
  
  // 4. Extract script from response
  const script = response.analysis || response.script || '';
  
  // 5. Display script to user
  setScriptText(script);
  onScriptGenerated(script);
};
```

## 🔌 API Integration Methods

### Method 1: Direct Browser Automation (Current)
Uses your existing `browserAutomationAPI` from `services/api.js`

```javascript
import { browserAutomationAPI } from '../services/api';

const response = await browserAutomationAPI.analyzeWithBrowser(formData);
```

### Method 2: Custom TTS Endpoint (Optional)
Add to `/api/tts/` endpoints

```javascript
POST /api/tts/analyze-and-script
{
  videoPath: '/path/to/video',
  platform: 'tiktok-sales',
  productName: 'Summer Dress',
  productDescription: 'Blue linen blend',
  productImage: '/path/to/image' (optional)
}
```

### Method 3: Direct ChatGPT API (Advanced)
Use official OpenAI ChatGPT API (requires different setup)

```javascript
// Hypothetical OpenAI integration
const response = await openaiClient.messages.create({
  model: 'gpt-4-turbo',
  messages: [
    { role: 'user', content: 'Analyze this video and generate a script...' }
  ],
  vision: true, // if using vision models
  files: [videoFile]
});
```

## 🎬 Video Analysis Considerations

### What ChatGPT Analyzes
- **Visual Elements**: Product, model, setting, colors
- **Movement**: Pacing, transitions, actions
- **Duration**: Length of video (important for scripting)
- **Context**: Product type, use case, audience

### Script Generation Process
1. ChatGPT receives video analysis prompt
2. Analyzes video content
3. Considers platform requirements (TikTok: short + energetic)
4. Generates script matching video length
5. Returns script text only (per prompt format requirement)

## 📊 Platform-Specific Script Requirements

### TikTok Bán Hàng (Sales)
- **Duration**: 15-30 seconds
- **Tone**: Energetic, engaging, persuasive
- **Structure**: Hook → Benefits → CTA
- **Language**: Trendy, youthful, emotional
- **Example**: "Áo này sắc, style chuẩn, giá lại hợp lý. Chốt ngay nha chị!"

### Facebook Reels Lồng Tiếng
- **Duration**: 20-40 seconds
- **Tone**: Warm, professional, storytelling
- **Structure**: Story → Problem → Solution → CTA
- **Language**: Conversational, relatable, lifestyle-focused
- **Example**: "Bạn tìm chiếc áo vừa xinh vừa thoải mái? Cái này hoàn hảo..."

### YouTube Short Vietsub
- **Duration**: 30-60 seconds
- **Tone**: Clear, educational, professional
- **Structure**: Intro → Features → Benefits → CTA
- **Language**: Clear articulation, subtitle-friendly pacing
- **Example**: "Chào các bạn! Hôm nay mình giới thiệu chiếc áo thun gân cực hot..."

### Instagram Stories
- **Duration**: 10-20 seconds
- **Tone**: Conversational, urgent, trendy
- **Structure**: Hook → Value → FOMO → CTA
- **Language**: Casual, friend-to-friend, slang-friendly
- **Example**: "Ơi! Cắt giá chỉ hôm nay, áo đẹp không gì sánh bằng!"

## 🔧 Configuration & Customization

### Add Product Context
If product image is available, ChatGPT can:
- Describe product appearance in script
- Match script to product features
- Generate more accurate selling points

**Implementation:**
```javascript
if (productImage && fs.existsSync(productImage)) {
  const imageBuffer = fs.readFileSync(productImage);
  const base64Image = imageBuffer.toString('base64');
  
  // Add to prompt or formData
  formData.append('productImage', base64Image);
  
  // Enhanced prompt
  prompt += "\n\nWITH PRODUCT IMAGE PROVIDED - Describe visual features in script";
}
```

### Customize Prompts
Edit prompt templates in `ScriptGenerationStep.jsx`:

```javascript
const platformPrompts = {
  'custom-style': `Your custom prompt here...
  Requirements:
  - Your requirements
  - Format: Script only`
};
```

## 🧪 Testing Script Generation

### Test Locally
1. Upload test video (any video.mp4)
2. Select platform (e.g., TikTok)
3. Click "Generate Script"
4. Monitor browser console for:
   - API call success/failure
   - Response structure
   - Script extraction

### If ChatGPT Integration Fails
Check:
1. Browser automation service is running
2. ChatGPT session is active
3. Video file is accessible
4. Prompt is properly formatted

### Debugging
```javascript
// Add to console in ScriptGenerationStep.jsx
console.log('Sending formData:', formData);
console.log('Prompt:', prompt);
console.log('Response:', response);
```

## 📝 Script Quality Tips

### For Better Scripts, Provide:
1. **Product Name**: "Summer Linen Dress"
2. **Description**: "Light-weight, breathable, blue color"
3. **Product Image**: Visual reference
4. **Video Content**: Clear footage of product

### Script Length Guidelines
- **TikTok**: 15-30 seconds = ~60-120 words
- **Facebook**: 20-40 seconds = ~80-160 words
- **YouTube**: 30-60 seconds = ~120-240 words
- **Instagram**: 10-20 seconds = ~40-80 words

### Common Script Issues & Fixes

| Issue | Cause | Solution |
|-------|-------|----------|
| Too short | Video too short | Extend script or adjust duration estimate |
| Generic/Basic | ChatGPT needs context | Add product description & image |
| Wrong tone | Platform mismatch | Ensure correct platform selected |
| Repetitive | Poor video content | Edit script manually or regenerate |

## 🚀 Implementation Checklist

- [x] Prompt templates created for all 4 platforms
- [x] Platform selection in ScriptGenerationStep
- [x] Script editing functionality
- [x] Character/word count stats
- [x] Duration estimation
- [x] Error handling
- [ ] ChatGPT integration backend (optional)
- [ ] Video content analysis (optional)
- [ ] Multi-video analysis (future)
- [ ] Script quality scoring (future)

## 💡 Advanced Ideas (Future)

1. **Custom Prompt Builder**: Let users create custom prompts
2. **A/B Script Testing**: Generate multiple script variations
3. **Sentiment Analysis**: Score script quality
4. **Auto-Adapt Length**: Adjust script to exact video length
5. **Multi-Platform Export**: Generate scripts for all 4 platforms at once
6. **Script Library**: Save & reuse effective scripts
7. **Template System**: Create template for similar products

## 🔗 Related Files

- `frontend/src/components/ScriptGenerationStep.jsx` - Main component
- `backend/controllers/ttsController.js` - Backend logic
- `VOICEOVER_IMPLEMENTATION_GUIDE.md` - Full technical guide
- `VOICEOVER_QUICK_START.md` - Quick start guide

## 📞 Questions?

Refer to:
1. Prompt templates in `ScriptGenerationStep.jsx`
2. Platform configs in `voiceOverOptions.js`
3. Controller logic in `ttsController.js`
4. Implementation guide documentation

---

**Current Status**: Script generation UI ready, ChatGPT integration via existing browser automation service  
**Next Step**: Test with your ChatGPT browser automation service
