# Grok Full Automation Guide

## Overview
Complete automation using Grok for image analysis, image generation, and video generation.

**No login required!** 🎉

## Features

### ✅ Image Analysis
- Upload single or multiple images
- Detailed analysis
- No authentication needed

### ✅ Image Generation
- Text-to-image generation
- High quality output
- Built-in like DALL-E

### ✅ Video Generation
- Text-to-video
- Fashion showcase style
- Professional quality

### ✅ Full Workflow
- Upload character + clothing images
- Analyze both
- Generate new image (character wearing new clothes)
- Optional: Generate video
- All automated!

---

## Quick Start

### 1. Test Image Analysis
```bash
npm run grok:analyze
```

### 2. Test Image Generation
```bash
npm run grok:generate
```

### 3. Run Full Workflow
```bash
npm run grok:full
```

**With video:**
```bash
npm run grok:full:video
```

---

## Full Workflow Example

```bash
# Basic usage (uses test images)
npm run grok:full

# With custom images
node test-grok-full-workflow.js \
  --character ./my-character.jpg \
  --clothing ./my-clothing.jpg \
  --output ./results

# With video generation
node test-grok-full-workflow.js \
  --character ./my-character.jpg \
  --clothing ./my-clothing.jpg \
  --video \
  --output ./results
```

---

## Workflow Steps

### Step 1: Image Analysis
```
Upload: character.jpg + clothing.jpg
    ↓
Grok analyzes both images
    ↓
Returns detailed description
```

**Example Analysis:**
```
The first image shows a character with:
- Pose: Standing straight, facing forward
- Body type: Slim, athletic build
- Style: Casual, modern
- Hair: Dark, shoulder-length

The second image shows clothing:
- Type: T-shirt
- Color: White with graphic print
- Style: Casual streetwear
- Fit: Regular fit
```

---

### Step 2: Image Generation
```
Analysis result
    ↓
Generate prompt
    ↓
Grok creates new image
    ↓
Character wearing new clothes
```

**Generation Prompt:**
```
Generate a photorealistic image of the character wearing the clothing.
Maintain the character's pose, body type, and style.
The clothing should fit naturally on the character.
High quality, detailed, professional photography style.
```

---

### Step 3: Video Generation (Optional)
```
Generated image
    ↓
Video prompt
    ↓
Grok creates video
    ↓
Fashion showcase video
```

**Video Prompt:**
```
Create a short video showcasing the character wearing the outfit.
Smooth camera movement, professional fashion showcase style.
```

---

## Output

### Generated Files
```
output/
├── generated-1234567890.png    # Generated image
└── generated-1234567890.mp4    # Generated video (if --video)
```

### Console Output
```
================================================================================
  🎯 GROK FULL AUTOMATION WORKFLOW
================================================================================

Configuration:
  Character: anh nhan vat.jpeg
  Clothing: ao phong.jpg
  Output: ./output
  Generate Video: Yes
  Headless: No

🚀 Initializing Grok...

✅ Grok ready (no login required)

📊 STEP 1: Analyzing images...

📊 GROK MULTI-IMAGE ANALYSIS
================================================================================
Images: anh nhan vat.jpeg, ao phong.jpg
Prompt: Analyze these two images...

📤 Uploading: anh nhan vat.jpeg
✅ Image uploaded
📤 Uploading: ao phong.jpg
✅ Image uploaded
⌨️  Typing prompt...
✅ Prompt entered
📤 Sending message...
✅ Message sent
⏳ Waiting for response...
✅ Response received
================================================================================
✅ MULTI-IMAGE ANALYSIS COMPLETE
Response length: 1234 characters
================================================================================

Analysis result:
The first image shows a character with...

🎨 STEP 2: Generating new image...

🎨 GROK IMAGE GENERATION
================================================================================
Prompt: Based on the analysis above, generate...

⌨️  Typing prompt...
✅ Prompt entered
📤 Sending message...
✅ Message sent
⏳ Waiting for image generation...
✅ Image generated
URL: https://...
💾 Downloaded to: output/generated-1234567890.png

🎬 STEP 3: Generating video...

🎬 GROK VIDEO GENERATION
================================================================================
Prompt: Create a short video showcasing...

⌨️  Typing prompt...
✅ Prompt entered
📤 Sending message...
✅ Message sent
⏳ Waiting for video generation (this may take a while)...
✅ Video generated
URL: https://...
💾 Downloaded to: output/generated-1234567890.mp4

================================================================================
✅ WORKFLOW COMPLETE
================================================================================

Results:

📊 Analysis:
The first image shows a character with...

🎨 Generated Image:
  URL: https://...
  Saved: output/generated-1234567890.png

🎬 Generated Video:
  URL: https://...
  Saved: output/generated-1234567890.mp4

⏱️  Total duration: 180.5s
```

---

## Performance

| Step | Time | Notes |
|------|------|-------|
| Initialize | 5s | One-time |
| Upload images | 5s | 2 images |
| Analysis | 20-30s | Depends on complexity |
| Image generation | 60-90s | High quality |
| Video generation | 120-180s | Optional |
| **Total (no video)** | **~100s** | 1.5 minutes |
| **Total (with video)** | **~220s** | 3.5 minutes |

---

## Advantages

### vs API-based Solutions
- ✅ No API keys needed
- ✅ No costs
- ✅ All-in-one solution
- ✅ High quality output
- ❌ Slower than APIs
- ❌ Requires browser

### vs Manual Process
- ✅ Fully automated
- ✅ Consistent results
- ✅ Repeatable
- ✅ No human intervention
- ✅ Can run in background

---

## Use Cases

### 1. Virtual Try-On
```bash
# Customer uploads photo + selects clothing
npm run grok:full \
  --character customer-photo.jpg \
  --clothing product-image.jpg \
  --output ./customer-results
```

### 2. Fashion Catalog
```bash
# Generate catalog with model wearing different outfits
for clothing in *.jpg; do
  npm run grok:full \
    --character model.jpg \
    --clothing "$clothing" \
    --output ./catalog
done
```

### 3. Social Media Content
```bash
# Generate images + videos for social media
npm run grok:full:video \
  --character influencer.jpg \
  --clothing sponsored-product.jpg \
  --output ./social-media
```

---

## Troubleshooting

### "Could not find text input"
**Solution:** Grok UI may have changed. Update selectors in `grokServiceV2.js`.

### "No image generated"
**Solution:** 
1. Check if Grok supports image generation
2. Try different prompt format
3. Run in non-headless mode to see what's happening

### "Video generation timeout"
**Solution:** Videos take longer (2-3 minutes). Increase timeout or wait longer.

### Browser crashes
**Solution:**
1. Close other applications
2. Run in headless mode
3. Reduce image sizes

---

## Best Practices

### 1. Image Quality
- Use high-resolution images (at least 512x512)
- Clear, well-lit photos
- Minimal background clutter

### 2. Prompts
- Be specific and detailed
- Include style preferences
- Mention quality requirements

### 3. Performance
- Run in headless mode for production
- Process in batches
- Cache results when possible

---

## Integration

### Add to Main System

```javascript
// controllers/aiController.js

import GrokServiceV2 from '../services/browser/grokServiceV2.js';

// Add to VISION_PROVIDERS
{
  name: 'Grok (Browser)',
  provider: 'grok-browser',
  priority: 20,
  pricing: null, // FREE
  available: true,
  analyze: async (imagePath, prompt, options) => {
    const service = new GrokServiceV2({ headless: true });
    try {
      await service.initialize();
      return await service.analyzeImage(imagePath, prompt);
    } finally {
      await service.close();
    }
  }
}
```

---

## API Reference

### GrokServiceV2

#### Constructor
```javascript
const service = new GrokServiceV2({
  headless: true,     // Run in headless mode
  slowMo: 0,          // Slow down operations (ms)
  timeout: 60000      // Default timeout (ms)
});
```

#### Methods

##### initialize()
Initialize Grok. No login required.
```javascript
await service.initialize();
```

##### analyzeImage(imagePath, prompt)
Analyze a single image.
```javascript
const result = await service.analyzeImage('./image.jpg', 'Describe this image');
```

##### analyzeMultipleImages(imagePaths, prompt)
Analyze multiple images.
```javascript
const result = await service.analyzeMultipleImages(
  ['./character.jpg', './clothing.jpg'],
  'Compare these images'
);
```

##### generateImage(prompt, options)
Generate an image from text.
```javascript
const result = await service.generateImage('A fashion model', {
  download: true,
  outputPath: './output.png'
});
```

##### generateVideo(prompt, options)
Generate a video from text.
```javascript
const result = await service.generateVideo('Fashion showcase', {
  download: true,
  outputPath: './output.mp4'
});
```

##### fullWorkflow(characterImagePath, clothingImagePath, options)
Run the complete workflow.
```javascript
const result = await service.fullWorkflow(
  './character.jpg',
  './clothing.jpg',
  {
    generateVideo: true,
    outputPath: './output.png',
    videoOutputPath: './output.mp4'
  }
);
```

##### close()
Close the browser.
```javascript
await service.close();
```

---

## Future Enhancements

- [ ] Parallel processing
- [ ] Batch operations
- [ ] Result caching
- [ ] Quality presets
- [ ] Style templates
- [ ] API wrapper
- [ ] Web interface

---

## Related Documentation

- [Browser Automation Guide](./BROWSER_AUTOMATION_GUIDE.md)
- [Browser Session Guide](./BROWSER_SESSION_GUIDE.md)
- [Testing Guide](./TESTING_GUIDE.md)

---

## Support
- Issues: Create GitHub issue
- Test: `npm run grok:full`
- Docs: See `/docs` folder
