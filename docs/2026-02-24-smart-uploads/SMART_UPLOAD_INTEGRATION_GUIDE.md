# Smart Upload Methods Integration Guide

## Overview

The Google Drive service now has intelligent upload methods that automatically route files to the correct folders. No need to manually specify folder IDs anymore!

## Folder Structure

```
Affiliate AI/
├── Images/
│   ├── Uploaded/
│   │   └── App/
│   │       ├── Character/     ← Character images
│   │       └── Product/       ← Product images
│   └── Completed/             ← Generated images
├── Videos/
│   ├── Uploaded/
│   │   └── App/               ← Source videos
│   ├── Completed/             ← Generated videos
│   └── Downloaded/
│       ├── Tiktok/
│       └── Reels/
```

## API Methods

### 1. Upload Character Image

**Location**: `backend/services/googleDriveOAuth.js`

```javascript
import driveService from '../services/googleDriveOAuth.js';

// Auto-saves to: Images/Uploaded/App/Character
const result = await driveService.uploadCharacterImage(
  imageBuffer,
  'character-model.jpg',
  {
    description: 'User-uploaded character model',
    properties: {
      gender: 'female',
      style: 'casual'
    }
  }
);

// Returns:
// {
//   id: 'FILE_ID',
//   name: 'character-model.jpg',
//   source: 'google-drive',
//   webViewLink: 'https://drive.google.com/...',
//   ...
// }
```

### 2. Upload Product Image

```javascript
// Auto-saves to: Images/Uploaded/App/Product
const result = await driveService.uploadProductImage(
  imageBuffer,
  'product-clothing.jpg',
  {
    description: 'User-uploaded product image',
    properties: {
      category: 'clothing',
      sku: 'PROD-123'
    }
  }
);
```

### 3. Upload Generated Image

```javascript
// Auto-saves to: Images/Completed
const result = await driveService.uploadGeneratedImage(
  generatedImageBuffer,
  'generated-outfit-123.jpg',
  {
    description: 'AI-generated outfit combination',
    properties: {
      prompt: 'casual summer outfit',
      model: 'nanobana-pro',
      quality: '2K'
    }
  }
);
```

### 4. Upload Source Video (for Mashup)

```javascript
// Auto-saves to: Videos/Uploaded/App
const result = await driveService.uploadSourceVideo(
  videoBuffer,
  'character-video.mp4',
  {
    description: 'Source video for mashup processing',
    properties: {
      type: 'character-walk',
      duration: 30
    }
  }
);
```

### 5. Upload Generated Video

```javascript
// Auto-saves to: Videos/Completed
const result = await driveService.uploadGeneratedVideo(
  generatedVideoBuffer,
  'generated-reel-123.mp4',
  {
    description: 'AI-generated video',
    properties: {
      quality: 'HD',
      duration: 15,
      platform: 'general'
    }
  }
);
```

### 6. Upload Video to Platform

```javascript
// Auto-saves to: Videos/Downloaded/[Platform]
// Platforms: 'tiktok', 'reels', 'instagram', or custom

const tiktokResult = await driveService.uploadVideoToPlatform(
  videoBuffer,
  'video-tiktok.mp4',
  'tiktok',  // Platform name
  {
    description: 'TikTok-formatted video',
    properties: {
      width: 1080,
      height: 1920,
      fps: 30
    }
  }
);

const reelsResult = await driveService.uploadVideoToPlatform(
  videoBuffer,
  'video-reels.mp4',
  'reels',  // or 'instagram'
  {
    description: 'Instagram Reels-formatted video'
  }
);
```

## Integration Examples

### In Image Generation Component

```javascript
// ImageGenerationPage.jsx or similar
import assetService from '../services/assetService';
import driveService from '../services/googleDriveOAuth';

async function saveGeneratedImage(imageUrl, generatedPrompt) {
  try {
    // Convert image URL to buffer
    const imageBuffer = await urlToBuffer(imageUrl);
    
    // Upload to Google Drive with auto-routing
    const driveResult = await driveService.uploadGeneratedImage(
      imageBuffer,
      `generated-${Date.now()}.jpg`,
      {
        description: `Generated image: ${generatedPrompt}`,
        properties: {
          prompt: generatedPrompt,
          generatedAt: new Date().toISOString()
        }
      }
    );
    
    // Save asset record to database
    const asset = await assetService.saveGeneratedImageAsAsset(
      imageUrl,
      `generated-${Date.now()}.jpg`,
      sessionId,
      {
        prompt: generatedPrompt,
        driveFileId: driveResult.id,
        driveUrl: driveResult.webViewLink
      }
    );
    
    return asset;
  } catch (error) {
    console.error('Error saving generated image:', error);
    throw error;
  }
}
```

### In Character Upload

```javascript
// CharacterUploadPage.jsx or similar
async function uploadCharacterImage(file) {
  try {
    const buffer = await file.arrayBuffer();
    
    // Auto-routes to: Images/Uploaded/App/Character
    const result = await driveService.uploadCharacterImage(
      Buffer.from(buffer),
      `character-${Date.now()}.jpg`,
      {
        description: 'Character model uploaded',
        properties: {
          gender: selectedGender,
          style: selectedStyle
        }
      }
    );
    
    showSuccessMessage(`Character uploaded: ${result.name}`);
    return result;
  } catch (error) {
    showErrorMessage('Failed to upload character image');
  }
}
```

### In Product Upload

```javascript
// ProductUploadPage.jsx or similar
async function uploadProductImage(file) {
  try {
    const buffer = await file.arrayBuffer();
    
    // Auto-routes to: Images/Uploaded/App/Product
    const result = await driveService.uploadProductImage(
      Buffer.from(buffer),
      `product-${Date.now()}.jpg`,
      {
        description: 'Product image uploaded',
        properties: {
          category: selectedCategory,
          sku: productSku
        }
      }
    );
    
    return result;
  } catch (error) {
    console.error('Product upload failed:', error);
    throw error;
  }
}
```

### In Video Generation

```javascript
// VideoGenerationPage.jsx or similar
async function saveGeneratedVideo(videoBuffer, format = 'general') {
  try {
    // Auto-routes to: Videos/Completed
    const result = await driveService.uploadGeneratedVideo(
      videoBuffer,
      `video-${Date.now()}.mp4`,
      {
        description: `Generated video - ${format}`,
        properties: {
          format: format,
          quality: 'HD',
          generatedAt: new Date().toISOString()
        }
      }
    );
    
    return result;
  } catch (error) {
    console.error('Video upload failed:', error);
    throw error;
  }
}
```

### In Mashup Processing

```javascript
// MashupQueue.js or similar (Node.js backend)
async function processVideoForMashup(videoFile) {
  try {
    // Source video for processing
    const sourceResult = await driveService.uploadSourceVideo(
      videoBuffer,
      `source-${Date.now()}.mp4`,
      {
        description: 'Source video queued for mashup',
        properties: {
          status: 'pending_mashup',
          queueTime: new Date().toISOString()
        }
      }
    );
    
    // Store source reference for later
    await storeMashupJob({
      sourceVideoId: sourceResult.id,
      sourceVideoPath: `Videos/Uploaded/App`,
      status: 'queued'
    });
    
    return sourceResult;
  } catch (error) {
    console.error('Mashup source upload failed:', error);
    throw error;
  }
}
```

### In Platform Export

```javascript
// PlatformExportService.js
async function exportVideoToPlatform(videoBuffer, platform) {
  try {
    // Auto-routes to correct platform folder
    const result = await driveService.uploadVideoToPlatform(
      videoBuffer,
      `${platform}-export-${Date.now()}.mp4`,
      platform,
      {
        description: `Video optimized for ${platform}`,
        properties: {
          platform: platform,
          format: getPlatformFormat(platform),
          exportedAt: new Date().toISOString()
        }
      }
    );
    
    console.log(`✅ Exported to ${platform}:`, result.webViewLink);
    return result;
  } catch (error) {
    console.error(`Export to ${platform} failed:`, error);
    throw error;
  }
}

function getPlatformFormat(platform) {
  const formats = {
    'tiktok': { width: 1080, height: 1920, ratio: '9:16' },
    'reels': { width: 1080, height: 1920, ratio: '9:16' },
    'instagram': { width: 1080, height: 1920, ratio: '9:16' },
    'youtube': { width: 1920, height: 1080, ratio: '16:9' }
  };
  return formats[platform] || formats['youtube'];
}
```

## Benefits

✅ **Automatic Routing**: No need to remember or specify folder IDs
✅ **Clear Intent**: Method names tell you exactly where files go
✅ **Consistent Metadata**: Properties are automatically tagged by file type
✅ **Error Handling**: Graceful fallback to local storage if Drive fails
✅ **Easy Tracking**: All files organized by purpose, not location
✅ **Future-Ready**: Easy to add new upload methods for new features

## Error Handling

All methods include graceful fallback:

```javascript
// If Drive upload fails, automatically falls back to local storage
const result = await driveService.uploadGeneratedImage(buffer, 'image.jpg');

if (result.source === 'local-storage') {
  console.warn('⚠️  Using local storage (Drive unavailable)');
  console.log('File saved locally:', result.id);
} else if (result.source === 'google-drive') {
  console.log('✅ Uploaded to Google Drive:', result.webViewLink);
}
```

## Configuration

All folder IDs are pre-configured in `backend/config/drive-folder-structure.json`

To update folder structure (if you add new folders):
```bash
cd backend
node scripts/detectDriveFolderStructure.js
```

This will re-scan your Google Drive and update the config with new folder IDs automatically.

## Testing

Test all upload methods:
```bash
cd backend
node tests/test-smart-uploads.js
```

This verifies:
- ✅ Character image uploading
- ✅ Product image uploading
- ✅ Generated image uploading
- ✅ Source video uploading
- ✅ Generated video uploading
- ✅ Platform-specific video uploads

## Summary

**Use Smart Upload Methods Instead of Generic `uploadBuffer()`**

❌ Old way:
```javascript
await driveService.uploadBuffer(buffer, fname, { folderId: folderIds.charactersFolder });
```

✅ New way:
```javascript
await driveService.uploadCharacterImage(buffer, fname);
```

The app now automatically routes files to the correct folders based on content type!
