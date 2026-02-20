# Video Generation Feature - Complete Implementation Guide

## 📹 Overview

The Video Generation feature allows users to create videos from images generated in the Virtual Try-On workflow. It integrates with Grok's video generation capabilities (https://grok.com/imagine) to produce multi-segment videos with customizable scripts.

## 🎬 How It Works

### Workflow
```
Step 1: Virtual Try-On (Image Generation)
    ↓
Step 4: Generate Images & Select Image
    ↓
"🎬 Start Create Video" Button
    ↓
VideoGenerationPage (3-step process)
    ↓
Step 1: Configure Video (Duration + Scenario)
    ↓
Step 2: Write Script (Prompt Segments)
    ↓
Step 3: Generate Video (Preview + Create)
    ↓
Output: Video URLs (one per segment)
```

## 🏗️ Architecture

### Frontend Components

#### VideoGenerationPage.jsx
Main page component with 3-step workflow:
- **Step 1 (VideoSettingsStep)**: Duration & scenario selection
- **Step 2 (VideoPromptStep)**: Script writing for each segment
- **Step 3 (VideoGenerationStep)**: Review & generate

**Key Features:**
- Auto-fill script templates based on scenario
- Preview of video configuration
- Segment-by-segment script management
- Real-time character count tracking

#### GenerationResult.jsx (Updated)
- Added "🎬 Start Create Video" button
- Passes selected image + character/product images to VideoGenerationPage

### Backend Implementation

#### Routes
```
POST /v1/browser-automation/generate-video
```
**Request Body:**
```json
{
  "duration": 30,
  "scenario": "product-intro",
  "segments": [
    "Introduce product with smile, rotate to show front",
    "Show details and key features up close",
    "Full outfit reveal and final pose"
  ],
  "sourceImage": "base64 or URL",
  "characterImage": "optional",
  "productImage": "optional",
  "provider": "grok"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "postId": "923d743e-0e2e-47d0-8c06-d30a56f42a96",
    "videoUrls": [
      "https://grok.com/imagine/post/923d743e.../video1.mp4",
      "https://grok.com/imagine/post/923d743e.../video2.mp4",
      "https://grok.com/imagine/post/923d743e.../video3.mp4"
    ],
    "generatedCount": 3,
    "totalSegments": 3,
    "scenario": "product-intro",
    "duration": 30
  }
}
```

#### GrokServiceV2 Video Methods

**1. uploadImageForVideo(imageBase64)**
- Navigates to https://grok.com/imagine
- Uploads image via file input
- Detects redirect to /imagine/post/[id]
- Returns: postId, url

**2. _detectVideoPostId()**
- Waits for URL to change to /imagine/post/[id]
- Extracts post ID using regex
- Returns: postId string

**3. inputVideoSegmentPrompt(postId, prompt, segmentNumber)**
- Navigates to /imagine/post/[postId]
- Finds textarea with video prompt
- Clears and inputs new prompt
- Returns: boolean

**4. generateVideoSegment(postId, segmentNumber)**
- Finds and clicks "Tạo video" (Create Video) button
- Waits for video generation
- Returns: videoUrl string

**5. _waitForVideoGenerated(postId)**
- Waits for video element or download link
- Extracts video source URL
- Returns: videoUrl

**6. generateVideoWithSegments(imageBase64, segments, options)**
- Orchestrates complete workflow
- Calls all above methods in sequence
- Returns: comprehensive result object

### Video Generation Flow

#### 1. Image Upload to Grok
```javascript
const uploadResult = await grok.uploadImageForVideo(imageBase64);
// Result: { success: true, postId: "xxx", url: "https://..." }
```

#### 2. Script Input & Generation Loop
```javascript
for (let i = 0; i < segments.length; i++) {
  // Input segment script
  await grok.inputVideoSegmentPrompt(postId, segments[i], i+1);
  
  // Generate video
  const videoUrl = await grok.generateVideoSegment(postId, i+1);
  
  // Store result
  videoUrls.push(videoUrl);
}
```

#### 3. Return Results
All video URLs are returned to client for download/preview

## 📊 Video Scenarios

### 1. Dancing / Movement (💃)
**Duration Options:** 20s, 30s, 40s
**Segments:** 2, 3, 4
**Template:**
- Segment 1: "Person dancing energetically in outfit, full body movement"
- Segment 2: "Close-up of outfit details while dancing"
- Segment 3: "Wide shot showing the complete look in motion" (if 30s+)

### 2. Product Introduction (👕)
**Template:**
- Segment 1: "Introduce the product with a smile, rotate to show front"
- Segment 2: "Show the details and key features up close"
- Segment 3: "Full outfit reveal and final pose"

### 3. Lifestyle Showcase (🏃)
**Template:**
- Segment 1: "Walking casually in everyday setting"
- Segment 2: "Sitting or posing naturally in the outfit"
- Segment 3: "Standing confidently showing the complete look"

### 4. Lip Sync / Speaking (🎤)
**Template:**
- Segment 1: "Person speaking or lip syncing with expression"
- Segment 2: "Change expression and emotion while speaking"
- Segment 3: "Final pose with confident expression"

### 5. Fashion Walk (👠)
**Template:**
- Segment 1: "Walking towards camera in fashion runway style"
- Segment 2: "Turn and walk away showing back view"
- Segment 3: "Return and final pose at camera with confidence"

### 6. Clothing Transition (🔄)
**Template:**
- Segment 1: "Start in initial outfit pose"
- Segment 2: "Transition or gesture showing outfit change"
- Segment 3: "Final look reveal in new styling"

## 🎨 UI/UX Design

### Layout
- **Left Sidebar (w-80):** Settings/Options based on step
- **Center Area:** Main content and previews
- **Right Sidebar (w-80):** Configuration summary

### Step 1: Settings
- Video source image preview
- Duration selection (radio buttons)
- Scenario selection (cards)
- Scenario details display

### Step 2: Prompt
- "Segment N / N (~10s)" labels with timer
- Textarea for each segment
- Character count tracking
- "Fill with Template" button
- Help text about segment guidelines

### Step 3: Generate
- Video configuration summary
- Collapsible script preview
- Important notes (Grok limitations)
- Back & Create buttons

## 🔧 Configuration

### Constants (videoGeneration.js)
```javascript
VIDEO_DURATIONS = [
  { value: 20, label: '20 seconds', segments: 2 },
  { value: 30, label: '30 seconds', segments: 3 },
  { value: 40, label: '40 seconds', segments: 4 },
]

VIDEO_SCENARIOS = [
  {
    value: 'scenario-key',
    label: 'Display Label',
    description: 'Description',
    scriptTemplate: ['seg1', 'seg2', 'seg3']
  }
  // ... more scenarios
]

SEGMENT_DURATION = 10  // Each segment is 10 seconds
```

## 🛠️ Development

### Adding New Scenario
1. Add to `VIDEO_SCENARIOS` in `constants/videoGeneration.js`
2. Frontend will automatically display it in VideoGenerationPage
3. Backend will receive it in `scenario` field
4. Use scenario in prompt building if needed

### Adding New Duration
1. Add to `VIDEO_DURATIONS` in constants
2. Specify number of `segments`
3. UI will adjust automatically

### Custom Video Generation
For custom implementation:
```javascript
const grok = new GrokServiceV2();
await grok.initialize();

const result = await grok.generateVideoWithSegments(
  imageBase64,
  ['script1', 'script2', 'script3'],
  {
    duration: 30,
    scenario: 'custom-scenario'
  }
);
```

## ⚠️ Limitations & Notes

### Grok.com Constraints
- Each segment generates ~10 second video
- Total duration = segments × 10 seconds
- Video quality depends on Grok's current algorithms
- Generation time: 1-3 minutes per segment

### Browser Automation
- Requires headless: false to show UI during generation
- May need manual interaction if Cloudflare challenge appears
- Sessions are managed automatically
- Network timeouts: 120 seconds per segment

### Image Requirements
- Format: JPEG, PNG (base64 or URL)
- Size: Recommended < 5MB
- Resolution: 512x512 to 2048x2048 works best
- Quality: Higher quality input = better video output

## 📝 Example Usage

### Frontend
```javascript
// User workflow
1. Upload images in VirtualTryOn
2. Generate images in step 4
3. Click "🎬 Start Create Video" on selected image
4. Choose duration (30s)
5. Select scenario (Product Introduction)
6. Accept auto-filled script template
7. Review segments
8. Click "Create Video"
9. Wait for generation
10. Download videos
```

### Backend
```javascript
// API call
POST /v1/browser-automation/generate-video
{
  "duration": 30,
  "scenario": "product-intro",
  "segments": [
    "Introduce product with smile",
    "Show details up close",
    "Full outfit reveal"
  ],
  "sourceImage": "https://...",
  "provider": "grok"
}
```

## 🐛 Troubleshooting

### Videos Not Generating
- Check network connection
- Verify Grok.com is accessible
- Check browser automation session
- Review console logs for specific errors

### Wrong Post ID Detected
- Verify URL pattern: `/imagine/post/[uuid]`
- Check URL change detection timeout (30s)
- May need to increase wait time

### Prompt Not Inputted
- Verify textarea selector matches current Grok UI
- May change if Grok updates their interface
- Update selector in `inputVideoSegmentPrompt`

### Generation Timeout
- Increase timeout from 120s to higher value
- Check network stability
- Verify Grok service is working

## 📚 Files Modified/Created

### New Files
- `/frontend/src/pages/VideoGenerationPage.jsx`
- `/frontend/src/constants/videoGeneration.js`
- `/backend/services/browser/grokServiceV2.js` (methods added)

### Modified Files
- `/frontend/src/App.jsx` (added route)
- `/frontend/src/components/GenerationResult.jsx` (added button)
- `/frontend/src/services/api.js` (updated generateVideo method)
- `/frontend/src/pages/VirtualTryOnPage.jsx` (pass props)
- `/backend/controllers/browserAutomationController.js` (implemented generateVideoBrowser)
- `/backend/routes/browserAutomationRoutes.js` (route already existed)

## 🚀 Future Enhancements

### Potential Improvements
1. **Video Preview in Browser** - Show preview after generation
2. **Video Composition** - Combine segments into single video
3. **Audio/Music** - Add background music or voiceover
4. **Effects** - Add transitions, filters, effects
5. **Custom Speeds** - Control pacing within segments
6. **Multi-Format Export** - MP4, WebM, GIF outputs
7. **Batch Generation** - Generate multiple videos at once
8. **Video History** - Store and retrieve generated videos
9. **A/B Testing** - Compare different scenarios/scripts
10. **AI Script Enhancement** - Auto-improve segment prompts

## 📋 Checklist for Deployment

- [ ] Test video generation end-to-end
- [ ] Verify Grok.com accessibility
- [ ] Test with different scenarios
- [ ] Test with different durations
- [ ] Verify error handling
- [ ] Check browser automation session management
- [ ] Test with various image sizes
- [ ] Verify video URL extraction
- [ ] Test on different network conditions
- [ ] Document API for other developers
- [ ] Set up monitoring for failures
- [ ] Create user documentation
