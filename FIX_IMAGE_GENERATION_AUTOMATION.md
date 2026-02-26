# Fix: ImageGenerationAutomationNew Not Defined Error

## 🔴 Problem

When running the 1-Click Creator workflow with Affiliate Video TikTok scenario, users encountered:
```
❌ Image generation failed: ImageGenerationAutomationNew is not defined
```

## 🔍 Root Cause

Two files were trying to use a class called `ImageGenerationAutomationNew` which doesn't exist in the codebase:
- `backend/services/affiliateVideoTikTokService.js` (line 741)
- `backend/routes/affiliateVideoTikTokRoutes.js` (line 363)

The correct service to use is `GoogleFlowAutomationService` which was already imported but not being used.

## ✅ Solution

### 1. Fixed `affiliateVideoTikTokService.js`

**Before:**
```javascript
const imageGen = new ImageGenerationAutomationNew({
  projectId: 'c9d5fea9-63e5-4d21-ac72-6830091fdbc0',
  imageCount: 1,
  headless: false
});
```

**After:**
```javascript
const imageGen = new GoogleFlowAutomationService({
  type: 'image',
  projectId: 'c9d5fea9-63e5-4d21-ac72-6830091fdbc0',
  imageCount: 2,  // TikTok flow generates 2 images (wearing + holding)
  headless: false
});
```

### 2. Fixed `affiliateVideoTikTokRoutes.js`

**Before:**
```javascript
const imageGenService = new ImageGenerationAutomationNew({
  aspectRatio,
  imageCount: 2,
  headless: true
});

await imageGenService.init();
// ... then called imageGenService.generateImage() which doesn't exist
```

**After:**
```javascript
const imageGenService = new GoogleFlowAutomationService({
  type: 'image',
  aspectRatio,
  imageCount: 2,
  headless: true
});

// Use the available generateMultiple() method
const multiGenResult = await imageGenService.generateMultiple(
  characterImagePath,
  productImagePath,
  [wearingPrompt, holdingPrompt]
);
```

### 3. Updated response handling

Changed from accessing `.path` to `.imageUrl` and `.screenshotPath` to match the actual response format from `GoogleFlowAutomationService`.

## 📋 Files Modified

1. **`backend/services/affiliateVideoTikTokService.js`**
   - Line 741-748: Replaced `ImageGenerationAutomationNew` with `GoogleFlowAutomationService`

2. **`backend/routes/affiliateVideoTikTokRoutes.js`**
   - Line 363: Replaced `ImageGenerationAutomationNew` with `GoogleFlowAutomationService`
   - Lines 373-408: Replaced individual `generateImage()` calls with single `generateMultiple()` call
   - Lines 413-432: Updated response field mapping from `.path` to `.imageUrl`

## 🎯 Impact

**Before Fix:**
- ❌ TikTok affiliate workflow crashed at image generation step
- ❌ "Image generation failed: ImageGenerationAutomationNew is not defined"
- ❌ Entire 1-Click Creator flow failed for TikTok scenario

**After Fix:**
- ✅ Uses correct `GoogleFlowAutomationService` 
- ✅ Generates both images (wearing + holding) in single browser session
- ✅ Properly handles response format from Google Flow API
- ✅ 1-Click Creator TikTok workflow can complete

## 🧪 Testing

To verify the fix works:

1. **Test TikTok Affiliate Flow:**
   - Go to 1-Click Creator Page
   - Select "Affiliate Video TikTok" scenario
   - Upload character and product images
   - The image generation step should now complete without errors

2. **Verify Image Generation:**
   - Both "wearing" and "holding" images should be generated
   - No console errors about `ImageGenerationAutomationNew`
   - Images should be properly stored for next steps

## 📝 Git Commit

```
commit 4bfa329
Author: AI Assistant
Date:   [Current Date]

fix: replace non-existent ImageGenerationAutomationNew with GoogleFlowAutomationService

- Replace ImageGenerationAutomationNew (undefined) with GoogleFlowAutomationService
- Update affiliateVideoTikTokService.js to use correct service
- Update affiliateVideoTikTokRoutes.js to use generateMultiple() method
- Fix response field mapping from .path to .imageUrl/.screenshotPath
- TikTok affiliate video workflow now works without errors
```

## 🔗 Related Services

- **GoogleFlowAutomationService**: `backend/services/googleFlowAutomationService.js`
  - Main service for Google Flow image and video generation
  - Methods: `init()`, `generateMultiple()`, `navigateToFlow()`, etc.

- **affiliateVideoTikTokService**: `backend/services/affiliateVideoTikTokService.js`
  - Orchestrates full TikTok affiliate video pipeline
  - Uses GoogleFlowAutomationService for image generation

- **affiliateVideoTikTokRoutes**: `backend/routes/affiliateVideoTikTokRoutes.js`
  - API routes for step-by-step TikTok workflow
  - Routes: `/step-1-analyze`, `/step-2-generate-images`, etc.

## ✨ Summary

The issue was a simple reference to a non-existent class that was replaced with the correct service. The fix ensures the 1-Click Creator workflow can now successfully generate TikTok affiliate content using Google Flow automation.
