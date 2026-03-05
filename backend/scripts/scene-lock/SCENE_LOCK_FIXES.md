# Scene Lock Image Generation - Asset Integration Fixes

## Problem Identified

**Scene lock images were NOT being saved as assets or uploaded to Google Drive** after generation via Google Flow.

### Before (Broken)
- Images generated via Google Flow
- Stored temporarily in `temp/scene-locks/{sceneValue}/`
- URLs saved directly in `scene.sceneLockSamples`
- ❌ No Asset records created
- ❌ No Google Drive upload
- ❌ Images lost after temp cleanup

### After (Fixed)
- Images generated via Google Flow ✅
- **Automatically converted to permanent Assets** ✅
- **Uploaded to Google Drive** ✅
- Stored with full metadata and Drive integration ✅
- Accessible via API proxy endpoints ✅

## Changes Made

### File: `backend/scripts/scene-lock/run-scene-lock-workflow.js`

**New Imports:**
```javascript
import fs from 'fs';
import Asset from '../../models/Asset.js';
import GoogleDriveService from '../../services/googleDriveService.js';
```

**New Helper Function: `uploadSceneLockAsset()`**
- Creates Asset record in MongoDB
- Uploads to Google Drive in `outputs_processed_images` folder
- Sets proper metadata:
  - `assetType: 'generated-image'`
  - `source: 'scene-lock-manager'`
  - `tags: ['scene-lock', 'scene:...', 'aspect:...']`
- Handles fallback if Drive upload fails

**Updated Main Flow:**
```javascript
// Before: Direct path mapping
scene.sceneLockSamples = generated.map((item) => ({
  url: item.path || item.url,  // ❌ Temp path, ephemeral
  // ...
}));

// After: Asset creation + Drive upload
scene.sceneLockSamples = await Promise.all(
  generated.map(async (item, idx) => {
    const asset = await uploadSceneLockAsset({
      localPath: sourcePath,
      sceneValue,
      aspectRatio,
      prompt: scene.sceneLockedPrompt,
      index: idx
    });
    return {
      url: asset.url,  // ✅ Proxy URL via Asset API
      // ...
    };
  })
);
```

## Asset Creation Details

When each image is created as an Asset:

```javascript
{
  assetId: "scene_lock_studio_9x16_1709832000_1",
  userId: "system",
  assetType: "image",
  assetCategory: "generated-image",  // Same as other generated images
  
  storage: {
    location: "local",
    localPath: "/path/to/image.png"
  },
  
  localStorage: {
    location: "local",
    path: "/path/to/image.png",
    verified: true
  },
  
  cloudStorage: {
    location: "google-drive",
    googleDriveId: "123abc...",
    status: "synced"  // After successful upload
  },
  
  syncStatus: "synced",
  
  metadata: {
    source: "scene-lock-manager",
    sceneValue: "studio",
    aspectRatio: "9:16",
    prompt: "..."
  },
  
  tags: ["scene-lock", "scene:studio", "aspect:9x16"],
  status: "active"
}
```

## Google Drive Folder

Scene lock images are uploaded to:
```
Affiliate AI
└── Images
    └── Processed  (outputs_processed_images)
        └── scene-lock-studio-...
        └── scene-lock-bedroom-...
        └── ...
```

## Testing

**Command:**
```bash
node scripts/scene-lock/run-scene-lock-workflow.js \
  --scene studio \
  --count 2 \
  --ratio 9:16
```

**Expected Output:**
```
✅ Connected MongoDB
🧠 Generating lock prompt for scene: studio
✅ sceneLockedPrompt updated (542 chars)

🎨 Generating 2 scene preview images via Google Flow...
[... image generation output ...]

💾 Creating assets and uploading to Google Drive...
   📤 Uploading to Drive: scene-lock-studio-1709832000-01.png
   ✅ Drive upload successful: 123abc...
   ✅ Asset created: scene_lock_studio_9x16_1709832000_1

   📤 Uploading to Drive: scene-lock-studio-1709832000-02.png
   ✅ Drive upload successful: 456def...
   ✅ Asset created: scene_lock_studio_9x16_1709832000_2

✅ Workflow complete.
```

## Benefits

1. **Data Durability**: Scene lock images backed up to Google Drive
2. **Consistency**: Same asset system as other generated images
3. **API Integration**: Accessible via `/api/assets/proxy/...`
4. **Metadata**: Full context stored (scene, aspect ratio, prompt)
5. **Fallback**: Works without Drive (saves locally, marks as pending)

## Related Systems

Now consistent with:
- `browserAutomationController.js` - BFL image generation
- `affiliateVideoTikTokService.js` - Platform-specific generation
- `ImageGenerationPage.jsx` - Frontend image generation
- General asset management system

All generated images now follow the same pattern:
**Generate → Save Locally → Create Asset → Upload to Drive → Access via API**
