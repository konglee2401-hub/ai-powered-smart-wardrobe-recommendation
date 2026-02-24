# OneClick Creator - Unified Flow Implementation & Testing

## Overview

The OneClick Creator now implements a complete end-to-end workflow that matches the frontend exactly:

```
Upload Images → Analyze → Apply Recommendations → Build Prompt → Generate Images → Generate Videos
```

Each step is tracked, timed, and produces detailed output that can be used for verification and debugging.

## Frontend Workflow (ImageGenerationPage.jsx)

The frontend implements a sophisticated workflow:

### Step 1: Upload
- User uploads character image and product image
- Specifies Use Case (e.g., "change-clothes", "ecommerce-product")
- Specifies Product Focus (e.g., "full-outfit", "top", "bottom")

### Step 2: Analysis
- Sends images to ChatGPT browser automation API
- ChatGPT analyzes character and product compatibility
- Returns structured recommendations for all style parameters
- Analysis includes: character profile, product details, compatibility score, recommendations

### Step 3: Apply Recommendations & Build Prompt
- Extracts AI recommendations from analysis
- Auto-selects style options (scene, lighting, mood, style, colorPalette, cameraAngle)
- Auto-saves new options to database
- Builds detailed image generation prompt with all parameters

### Step 4: Generate Images
- Calls image generation endpoint with:
  - Detailed prompt (150+ character, use-case aware)
  - Images auto-download and save to locally
  - Returns both URL and file path
- Supports multiple providers (Google Flow, Grok)

### Step 5: Generate Videos
- Generates videos from images using specified provider
- Videos download and save locally
- Can generate multiple videos per session

## Backend Implementation

### Unified Flow Controller
File: `backend/controllers/unifiedFlowController.js`

**Endpoints:**
- `POST /api/flows/analyze` - Step 1: Analyze with ChatGPT
- `POST /api/flows/generate` - Step 4: Generate images with optional imageProvider selection
- `POST /api/v1/browser-automation/generate-video` - Step 5: Generate videos

**Features:**
- `imageProvider` parameter support: Specify 'google-flow' for direct browser automation
- Image auto-download: Images saved to `backend/temp/flow-image-{TIMESTAMP}.png`
- Browser management: Proper cleanup after generation
- File path return: API response includes local file paths for downstream usage

### Google Flow Service
File: `backend/services/browser/googleFlowService.js`

**Features:**
- Auto-login with session persistence
- Nano Banana model selection
- Image download support with retry logic
- Browser cleanup after generation
- Direct project navigation (skips landing page)

## Test Script: 03-oneclick-creator-unified-test.js

### Purpose
Validate the complete OneClick Creator workflow with local file verification.

### Test Flow

```
Step 0: Verify Input Images
  ✓ Load test images from test-images/
  ✓ Verify file sizes and availability

Step 1: Analyze Images (ChatGPT)
  ✓ Send images to ChatGPT browser automation
  ✓ Receive detailed analysis with recommendations
  ⏱️  Duration: 35-40 seconds

Step 2: Apply AI Recommendations
  ✓ Extract recommendations from analysis
  ✓ Apply to style options (scene, lighting, mood, etc.)

Step 3: Build Image Generation Prompt
  ✓ Construct detailed prompt from:
    - Use case (change-clothes, ecommerce, etc.)
    - Product focus (full-outfit, top, bottom, etc.)
    - AI recommendations
    - Style parameters
  ✓ Example: "Professional fashion photo. Character wearing full-outfit. 
    Scene: boudoir-chic. Lighting: soft-diffused. Mood: soft-romantic..."

Step 4: Generate Images (Google Flow)
  ✓ Send prompt to Google Flow image generator
  ✓ Download generated images to local disk
  ✓ Verify file existence and size
  ⏱️  Duration: 150-180 seconds per 2 images
  📁 Output: test-results/oneclick-{timestamp}/images/

Step 5: Generate Videos (Google Flow)
  ✓ Generate 30-second video from image
  ✓ Download video to local disk
  ✓ Verify file existence and size
  ⏱️  Duration: 40-50 seconds
  📁 Output: test-results/oneclick-{timestamp}/videos/
```

### Running the Test

```bash
cd backend
node tests/4-workflows/03-oneclick-creator-unified-test.js
```

### Output Structure

```
test-results/
  oneclick-1771726367672/
    ├── images/
    │   ├── image-1.png (549KB)
    │   ├── image-2.png (550KB)
    │   └── ...
    ├── videos/
    │   ├── video-1.mp4 (1.4MB)
    │   └── ...
    └── test-results.json
```

### Test Results JSON

```json
{
  "startTime": 1771726367672,
  "steps": {
    "analyze": {
      "duration": 38822,
      "result": { /* full analysis response */ }
    },
    "recommendations": {
      "duration": 0,
      "result": { /* applied options */ }
    },
    "promptBuild": {
      "duration": 0,
      "prompt": "Professional fashion photo..."
    },
    "imageGeneration": {
      "duration": 157590,
      "images": [
        {
          "index": 1,
          "url": "https://...",
          "path": "image-1.png",
          "size": 563289,
          "provider": "Google Flow"
        }
      ]
    },
    "videoGeneration": {
      "duration": 44020,
      "videos": [
        {
          "index": 1,
          "url": "https://...",
          "path": "video-1.mp4",
          "size": 1456790,
          "provider": "google-flow"
        }
      ]
    }
  },
  "success": true,
  "duration": 240434
}
```

## Key Features

### 1. Complete Workflow Coverage
✓ All 5 major steps implemented
✓ Step timing and metrics
✓ Error handling and recovery

### 2. Local File Management
✓ Images downloaded and verified
✓ Videos downloaded and verified
✓ Organized directory structure by timestamp
✓ File size validation (>1000 bytes minimum)

### 3. Detailed Logging
✓ Per-step progress messages
✓ Color-coded console output
✓ File download confirmation
✓ Error details and warnings

### 4. Result Persistence
✓ JSON results file with full metrics
✓ Image and video file verification
✓ Complete execution timeline
✓ Provider information tracking

## Important Notes

### Image Generation with Google Flow

**Auto-Download Behavior:**
- Images automatically download to `backend/temp/flow-image-{TIMESTAMP}.png`
- Test script downloads again to `test-results/oneclick-{timestamp}/images/`
- Both URLs and local paths returned in API response

**File Format:**
- Format: PNG
- Size: 500-800KB (varies by content)
- Dimensions: 1024x1024 (configurable per request)

### Video Generation with Google Flow

**Auto-Download Behavior:**
- Videos automatically download with Google Flow
- Test script downloads to `test-results/oneclick-{timestamp}/videos/`
- H.264 codec, standard MP4 container

**File Format:**
- Format: MP4 (H.264)
- Size: 1.4MB+ per 30-second video
- Duration: 30 seconds (configurable)

## Workflow Timing (Example)

Total wallclock time with all steps: **~240 seconds** (~4 minutes)

- Analysis (ChatGPT): 38s
- Recommendations: <1s
- Prompt Building: <1s
- Image Generation (2x): 157s
- Video Generation (1x): 44s
- File I/O: <1s

**Note:** Actual times vary based on:
- Server load
- Image content complexity
- Video quality settings
- Network conditions

## Testing Checklist

- [ ] Server running on localhost:5001
- [ ] Test images exist in `backend/test-images/`
- [ ] Output directory created: `backend/test-results/`
- [ ] Images downloaded and verified
- [ ] Videos downloaded and verified
- [ ] Results JSON persisted
- [ ] Console output shows all steps complete
- [ ] No hung processes (browser closes automatically)

## API Integration Points

### Analysis Endpoint
```bash
POST /api/flows/analyze
Content-Type: multipart/form-data

characterImage: <binary>
productImage: <binary>
useCase: "change-clothes"
productFocus: "full-outfit"
scene: "studio"
... (style settings)

Response:
{
  "data": {
    "analysis": { /* detailed analysis */ },
    "recommendations": { /* AI recommendations */ }
  }
}
```

### Image Generation Endpoint
```bash
POST /api/flows/generate
Content-Type: application/json

{
  "prompt": "Professional fashion photo...",
  "imageCount": 2,
  "imageSize": "1024x1024",
  "imageProvider": "google-flow"
}

Response:
{
  "data": {
    "generatedImages": [
      {
        "url": "https://...",
        "path": "/backend/temp/flow-image-xxx.png",
        "provider": "Google Flow"
      }
    ]
  }
}
```

### Video Generation Endpoint
```bash
POST /api/v1/browser-automation/generate-video
Content-Type: application/json

{
  "duration": 30,
  "scenario": "fashion",
  "segments": ["Professional fashion video..."],
  "videoProvider": "google-flow"
}

Response:
{
  "data": {
    "videoUrl": "https://...",
    "provider": "google-flow"
  }
}
```

## Troubleshooting

### Images Not Downloading
- Check network connectivity
- Verify Google URL accessibility
- Check disk space in test-results/
- Review logs for HTTP errors

### Videos Not Downloading
- Google Flow video generation takes 40+ seconds
- Verify browser automation is running
- Check Google Labs Flow login status
- Memory/resource constraints on system

### Analysis Step Failing
- Ensure ChatGPT browser automation is configured
- Verify test images exist and are valid
- Check backend server logs for browser errors
- Allow 60+ seconds for ChatGPT automation

### Recommendation Not Applied
- Some analyses may not return structured recommendations
- Default options are used as fallback
- Check analysis JSON in test-results.json for raw response

## Next Steps

1. **Frontend Integration**: Display generated images/videos in OneClickCreatorPage preview
2. **Image Optimization**: Implement post-generation image processing (compression, format conversion)
3. **Video Quality**: Add quality/resolution options to video generation
4. **Batch Processing**: Extend test to handle multiple sessions sequentially
5. **Result Gallery**: Build gallery view for all generated assets
