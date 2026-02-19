# User Journey Through Step-by-Step Workflow

## Complete Flow Visualization

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                         SMART WARDROBE USER JOURNEY                          ║
╚═══════════════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 1: IMAGE UPLOAD                                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ User Action: Upload character image + product image                         │
│              Select use case (change-clothes, styling, etc)                  │
│              Select product focus (full-outfit, top, bottom)                 │
│                                                                              │
│ Button Click: "Start AI Analysis"                                            │
│                                                                              │
│ Backend Call: POST /api/ai/analyze-unified (multipart/form-data)            │
│   - Sends: characterImage file, productImage file, useCase, productFocus    │
│   - Waits: ~10 seconds for AI analysis                                       │
│   - Returns: {analysis: {...}, metadata: {...}}                              │
│                                                                              │
│ UI Update: Show "Analyzing..." spinner                                        │
│ Next: Move to Step 2                                                         │
└─────────────────────────────────────────────────────────────────────────────┘

         🔄 API: /ai/analyze-unified (multipart)
         📊 Response: {analysis with 6 recommendations}
         ↓

┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 2: AI ANALYSIS REVIEW                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ Display:                                                                    │
│  - Character Analysis (age, skin tone, style, personality)                   │
│  - Product Analysis (colors, style, category)                                │
│  - Outfit Compatibility Score                                                │
│  - AI Recommendations (scene, lighting, mood, style, colors, angles)         │
│  - Styling Notes from AI                                                     │
│                                                                              │
│ User Action: Review the analysis                                             │
│              Click "Apply Recommendations"                                    │
│                                                                              │
│ Backend Call: NONE (local processing)                                        │
│   - Extracts AI recommendations as default selections                        │
│   - Stores: selectedOptions = {                                              │
│       scene: "studio",                                                      │
│       lighting: "soft-diffused",                                            │
│       mood: "elegant",                                                      │
│       style: "fashion-editorial",                                           │
│       colorPalette: "neutral",                                              │
│       cameraAngle: "three-quarter"                                          │
│     }                                                                        │
│                                                                              │
│ UI Update: Show customization options with pre-selected values               │
│ Next: Move to Step 3                                                         │
└─────────────────────────────────────────────────────────────────────────────┘

         ✅ Extracted 6 recommendation categories
         👤 User can now see AI-suggested options
         ↓

┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 3: STYLE CUSTOMIZATION                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│ Display: Customization UI with dropdowns for:                                │
│  - Scene (studio, outdoor, nightclub, casual, formal)                        │
│  - Lighting (soft-diffused, dramatic, natural, neon)                        │
│  - Mood (elegant, playful, edgy, romantic, energetic)                       │
│  - Style (fashion-editorial, street-style, high-fashion, casual)             │
│  - Color Palette (neutral, pastel, vibrant, monochrome)                     │
│  - Camera Angle (straight-on, three-quarter, side-profile, from-above)      │
│                                                                              │
│ User Actions:                                                                │
│  - Can keep AI recommendations                                               │
│  - Can change any option                                                     │
│  - Can add custom options                                                    │
│  - Click "Continue to Final Prompt"                                          │
│                                                                              │
│ Backend Call: POST /api/ai/build-prompt-unified (JSON)                      │
│   - Sends: {analysis: {...}, selectedOptions: {...}}                        │
│   - Processes: Combines analysis + user options into detailed prompt         │
│   - Returns: {                                                              │
│       prompt: {                                                             │
│         positive: "20-24 year old woman with porcelain skin...",           │
│         negative: "blurry, low quality, distorted..."                      │
│       },                                                                    │
│       selectedOptions: {...}                                                │
│     }                                                                        │
│                                                                              │
│ UI Update: Show "Building prompt..." spinner                                 │
│ Next: Move to Step 4                                                         │
└─────────────────────────────────────────────────────────────────────────────┘

         🔄 API: /ai/build-prompt-unified (JSON)
         📝 Response: {prompt with 100+ word description}
         ↓

┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 4: PROMPT REVIEW & ENHANCEMENT                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│ Display:                                                                    │
│  - Positive Prompt (green) - what to include in the image                    │
│  - Negative Prompt (red) - what NOT to include                               │
│  - Copy buttons for each prompt                                              │
│  - Edit fields for manual refinement                                         │
│                                                                              │
│ User Actions:                                                                │
│  - Can read and understand the prompt                                        │
│  - Can click "Enhance with AI" for AI-powered refinement                     │
│  - Can manually edit prompts                                                 │
│  - Click "Generate Images"                                                   │
│                                                                              │
│ Optional: AI Enhancement                                                     │
│  Backend Call: POST /api/prompts/enhance (if user clicks enhance)           │
│    - Polishes prompt for better AI image generation                          │
│    - Returns enhanced version                                                │
│                                                                              │
│ Main Generation Call:                                                        │
│  Backend Call: POST /api/ai/generate-unified (JSON)                         │
│    - Sends: {prompt: "...", negativePrompt: "...", options: {...}}          │
│    - Processes: Sends prompt to image generation model                       │
│    - Takes: 30-120 seconds depending on provider                             │
│    - Returns: {generatedImages: [{url, provider, seed}, ...]}               │
│                                                                              │
│ UI Update: Show "Generating images..." with progress                         │
│ Next: Move to Step 5                                                         │
└─────────────────────────────────────────────────────────────────────────────┘

         🔄 API: /ai/generate-unified (JSON)
         🎨 Response: {array of 2-4 generated image URLs}
         ↓

┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 5: GENERATION RESULTS                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ Display:                                                                    │
│  - Grid of generated images                                                  │
│  - Image metadata (provider, generation time, model used)                    │
│  - Hover actions: Download, Save, Regenerate, Share                          │
│                                                                              │
│ User Actions:                                                                │
│  - View generated images                                                     │
│  - Download individual images                                                │
│  - Save to wishlist                                                          │
│  - Share on social media                                                     │
│  - Click "View Results" for detailed view                                    │
│                                                                              │
│ Next: Move to Step 6                                                         │
└─────────────────────────────────────────────────────────────────────────────┘

         ✅ All images generated
         📸 Ready for download/sharing
         ↓

┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 6: FINAL RESULTS & ACTIONS                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ Display:                                                                    │
│  - High-resolution image gallery                                             │
│  - Image comparisons (before/after)                                          │
│  - Download options (PNG, JPG)                                               │
│  - Social sharing buttons                                                    │
│  - "Start New" button to begin again                                         │
│                                                                              │
│ User Actions:                                                                │
│  - Download images for use                                                   │
│  - Share on social media                                                     │
│  - Save to account                                                           │
│  - Start a new analysis                                                      │
│                                                                              │
│ Backend: Upload downloads to S3                                              │
│                                                                              │
│ Complete! ✅                                                                │
└─────────────────────────────────────────────────────────────────────────────┘

         🎉 Workflow Complete
         📊 Data can be saved for future reference
```

---

## Key Improvements Over Previous Flow

### Before (Broken)
```
Upload images → One API call → Backend does everything → 
  Jump to results → Miss customization step
```

**Problems:**
- ❌ Users couldn't customize options
- ❌ Users couldn't review the prompt
- ❌ Steps 3 & 4 were always skipped
- ❌ If generation failed, had to restart everything

### After (Fixed)
```
Upload → Analyze → Customize → Build Prompt → Generate → Results
  ↓        ↓          ↓           ↓            ↓         ↓
API1     Show      Show UI      Show        Show     Show
call   Analysis   with opts    Prompt    Images   Download
       results   for editing   for        ready    options
                 before next   review
                   step        before
                             generating
```

**Benefits:**
- ✅ Full user control at each step
- ✅ Can customize before generation
- ✅ Can review prompt before image generation
- ✅ Can retry individual steps
- ✅ Clear progress indication
- ✅ Better error recovery

---

## API Call Sequence

```
User Session Timeline:

T=0s   → Upload images
T=1s   → Frontend: POST /api/ai/analyze-unified
T=10s  → Backend: Analysis complete, return {analysis}
T=11s  → UI: Display Step 2 (Analysis Review)
T=20s  → User: Click "Apply Recommendations" 
T=21s  → Frontend: POST /api/ai/build-prompt-unified
T=25s  → Backend: Prompt built, return {prompt}
T=26s  → UI: Display Step 4 (Prompt Review)
T=45s  → User: Click "Generate Images"
T=46s  → Frontend: POST /api/ai/generate-unified
T=90s  → Backend: Images generated, return {images}
T=91s  → UI: Display Step 5 (Results)
T=120s → User: Download complete ✅
```

**Total Time**: ~2 minutes from upload to download

---

## Error Recovery

### If Analysis Fails
- User sees error message
- Stays on Step 1
- Can re-upload images and retry

### If Customization Times Out
- User sees timeout error
- Still on Step 3
- Can adjust options and retry

### If Generation Fails
- User sees error message
- Stays on Step 4
- Can:
  - Adjust prompt and regenerate
  - Go back and change customizations
  - Start completely over

---

## Mobile Optimization

The step-by-step architecture is ideal for mobile:
- Each screen is self-contained
- No massive initial payload
- User can understand each step before proceeding
- Smaller API responses = faster on 4G
- Can cache analysis results locally
- Can implement offline-first for some steps

---

## Future Enhancements

### Phase 1 (Current)
- ✅ Step-by-step execution
- ✅ User customization
- ✅ Prompt review

### Phase 2 (Next)
- ⏳ Batch processing (analyze 5 outfits at once)
- ⏳ Step result caching
- ⏳ Video generation parallel flow

### Phase 3 (Future)  
- ⏳ Style transfer (apply one style to all)
- ⏳ A/B testing (compare customization options)
- ⏳ History and undo (go back and regenerate)
- ⏳ Collaborative workflow (share at each step)
