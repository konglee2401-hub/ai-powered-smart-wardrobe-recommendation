# Image URL vs Base64 Encoding Guide

## Overview

This document explains the two methods for sending images to Vision AI APIs:
1. **Cloud URL** (Recommended) - Upload image to cloud first, then send URL
2. **Base64 Encoding** (Fallback) - Encode image directly in request

---

## 📊 Comparison Table

| Feature | Cloud URL | Base64 Encoding |
|---------|-----------|-----------------|
| **Performance** | ✅ Faster for large images | ⚠️ Slower (encoding overhead) |
| **Request Size** | ✅ Small (just URL string) | ❌ Large (~33% bigger than image) |
| **API Limits** | ✅ No size issues | ⚠️ May hit request size limits |
| **Reliability** | ✅ More reliable | ⚠️ Can timeout on large images |
| **Setup** | ⚠️ Requires upload service | ✅ No setup needed |
| **Cleanup** | ⚠️ Need to delete after use | ✅ No cleanup needed |
| **Cost** | ⚠️ Upload service costs | ✅ No additional cost |

---

## 🎯 When to Use Each Method

### Use Cloud URL When:
- Image is larger than 1MB
- Making multiple API calls with same image
- Using paid APIs (better reliability)
- Need to share image across services
- Working with high-resolution images

### Use Base64 Encoding When:
- Image is small (< 500KB)
- Quick testing/prototyping
- No upload service configured
- One-time analysis
- Network is reliable

---

## 🔧 Implementation

### Method 1: Cloud URL (Recommended)

```javascript
import { uploadImageToCloud, deleteUploadedImage } from './services/imageUploadService.js';
import { analyzeWithZAI } from './services/zaiService.js';

async function analyzeWithCloudUrl(imagePath) {
  let uploadResult = null;
  
  try {
    // Step 1: Upload to cloud
    uploadResult = await uploadImageToCloud(imagePath, {
      folder: 'ai-analysis',
      title: 'Image for analysis'
    });
    
    console.log('Uploaded:', uploadResult.url);
    
    // Step 2: Analyze with cloud URL
    const result = await analyzeWithZAI(
      imagePath,
      'Describe this image',
      {
        model: 'glm-4v-flash',
        imageUrl: uploadResult.url  // Pass cloud URL
      }
    );
    
    return result;
    
  } finally {
    // Step 3: Cleanup (optional but recommended)
    if (uploadResult) {
      await deleteUploadedImage(uploadResult);
    }
  }
}
```

### Method 2: Base64 Encoding (Fallback)

```javascript
import { analyzeWithZAI } from './services/zaiService.js';

async function analyzeWithBase64(imagePath) {
  // Just call without imageUrl - will use base64 automatically
  const result = await analyzeWithZAI(
    imagePath,
    'Describe this image',
    {
      model: 'glm-4v-flash'
      // No imageUrl = automatic base64 encoding
    }
  );
  
  return result;
}
```

### Method 3: Hybrid (Best of Both)

```javascript
import { uploadImageToCloud, deleteUploadedImage } from './services/imageUploadService.js';
import { analyzeWithZAI } from './services/zaiService.js';
import fs from 'fs';

async function analyzeSmart(imagePath) {
  const fileSize = fs.statSync(imagePath).size;
  const SIZE_THRESHOLD = 1024 * 1024; // 1MB
  
  let uploadResult = null;
  
  try {
    let options = { model: 'glm-4v-flash' };
    
    // Use cloud URL for large images
    if (fileSize > SIZE_THRESHOLD) {
      console.log('Large image detected, using cloud URL...');
      uploadResult = await uploadImageToCloud(imagePath);
      options.imageUrl = uploadResult.url;
    } else {
      console.log('Small image, using base64...');
    }
    
    const result = await analyzeWithZAI(imagePath, 'Describe this image', options);
    return result;
    
  } finally {
    if (uploadResult) {
      await deleteUploadedImage(uploadResult);
    }
  }
}
```

---

## 📤 Upload Providers

### Priority Order

1. **ImgBB** (Priority 1)
   - FREE unlimited storage
   - No expiration
   - Fast upload
   - ⚠️ No API deletion support

2. **Cloudinary** (Priority 2)
   - FREE 25GB/month
   - CDN delivery
   - Auto optimization
   - ✅ Full delete support

3. **Imgur** (Priority 3)
   - FREE
   - Popular and reliable
   - ✅ Delete via delete hash

### Configuration

```env
# ImgBB (Get key from: https://api.imgbb.com/)
IMGBB_API_KEY_1=your_imgbb_key

# Cloudinary (Get from: https://cloudinary.com/console)
# Format: cloudName|apiKey|apiSecret
CLOUDINARY_API_KEY_1=your_cloud_name|your_api_key|your_api_secret

# Imgur (Get from: https://api.imgur.com/oauth2/addclient)
IMGUR_API_KEY_1=your_client_id
```

---

## 🤖 Vision Provider Support

| Provider | Cloud URL | Base64 | Notes |
|----------|-----------|--------|-------|
| **Z.AI** | ✅ | ✅ | FREE - glm-4v-flash |
| **NVIDIA** | ✅ | ✅ | FREE credits |
| **Groq** | ✅ | ✅ | FREE - 14,400 req/day |
| **Mistral** | ✅ | ✅ | Trial credits |
| **Anthropic** | ✅ | ✅ | Paid |
| **OpenAI** | ✅ | ✅ | Paid |
| **Google Gemini** | ✅ | ✅ | Paid/FREE tier |
| **Fireworks** | ✅ | ✅ | Paid |

---

## 🧪 Testing

### Test Upload + Analysis

```bash
# Run comprehensive test
node test-upload-with-ai.js

# Test specific provider
node -e "
import('./services/zaiService.js').then(m => 
  m.analyzeWithZAI('test-images/test.jpg', 'Describe', { imageUrl: 'https://...' })
)
"
```

### Test Upload Only

```bash
node -e "
import('./services/imageUploadService.js').then(m => 
  m.uploadImageToCloud('test-images/test.jpg').then(console.log)
)
"
```

---

## ⚡ Performance Tips

### 1. Image Size Optimization

```javascript
// Before uploading, consider resizing large images
import sharp from 'sharp';

async function optimizeImage(imagePath) {
  const outputPath = imagePath.replace(/\.[^.]+$/, '-optimized.jpg');
  
  await sharp(imagePath)
    .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toFile(outputPath);
  
  return outputPath;
}
```

### 2. Caching Upload Results

```javascript
const uploadCache = new Map();

async function uploadWithCache(imagePath) {
  const cached = uploadCache.get(imagePath);
  if (cached) return cached;
  
  const result = await uploadImageToCloud(imagePath);
  uploadCache.set(imagePath, result);
  
  return result;
}
```

### 3. Batch Processing

```javascript
async function analyzeBatch(imagePaths, prompt) {
  // Upload all images first
  const uploads = await Promise.all(
    imagePaths.map(path => uploadImageToCloud(path))
  );
  
  try {
    // Analyze all with cloud URLs
    const results = await Promise.all(
      uploads.map((upload, idx) => 
        analyzeWithZAI(imagePaths[idx], prompt, { imageUrl: upload.url })
      )
    );
    
    return results;
    
  } finally {
    // Cleanup all
    await Promise.all(uploads.map(upload => deleteUploadedImage(upload)));
  }
}
```

---

## 🔒 Security Considerations

### 1. URL Expiration

- **ImgBB**: No expiration (unless account setting)
- **Cloudinary**: No expiration
- **Imgur**: Can be deleted by delete hash

### 2. Access Control

```javascript
// Cloudinary supports signed URLs
const signedUrl = cloudinary.url(publicId, {
  sign_url: true,
  expires_at: Math.floor(Date.now() / 1000) + 3600 // 1 hour
});
```

### 3. Cleanup Best Practices

```javascript
// Always cleanup in finally block
try {
  const upload = await uploadImageToCloud(imagePath);
  // ... use upload.url ...
} finally {
  await deleteUploadedImage(upload);
}

// Or use try-with-resources pattern
async function withUpload(imagePath, callback) {
  const upload = await uploadImageToCloud(imagePath);
  try {
    return await callback(upload.url);
  } finally {
    await deleteUploadedImage(upload);
  }
}
```

---

## 📚 API Reference

### uploadImageToCloud(imagePath, options)

```javascript
const result = await uploadImageToCloud('./image.jpg', {
  folder: 'my-folder',      // Cloudinary folder
  title: 'My Image',        // Imgur title
  description: '...'        // Imgur description
});

// Returns:
{
  url: 'https://...',
  provider: 'imgbb|cloudinary|imgur',
  width: 1920,
  height: 1080,
  size: 123456,
  publicId: '...',          // Cloudinary only
  cloudName: '...',         // Cloudinary only
  deleteHash: '...'         // Imgur only
}
```

### deleteUploadedImage(uploadResult)

```javascript
const deleted = await deleteUploadedImage(uploadResult);
// Returns: true|false
```

### Vision Service with imageUrl

```javascript
const result = await analyzeWithZAI(imagePath, prompt, {
  model: 'glm-4v-flash',
  imageUrl: 'https://...'    // Optional - uses cloud URL if provided
});
```

---

## 🆘 Troubleshooting

### Upload Fails

```
❌ All upload providers failed
```

**Solutions:**
1. Check API keys in `.env`
2. Verify network connectivity
3. Check provider status pages

### Base64 Too Large

```
❌ Request entity too large
```

**Solutions:**
1. Use cloud URL instead
2. Resize image before encoding
3. Use compression

### URL Not Working

```
❌ Invalid image URL
```

**Solutions:**
1. Verify URL is publicly accessible
2. Check URL format (https://)
3. Ensure image hasn't been deleted

---

## 📖 Related Documentation

- [Multi-Key Setup Guide](./MULTI_KEY_SETUP.md)
- [API Keys Setup](./API_KEYS_SETUP.md)
- [Z.AI Setup Guide](../ZAI_SETUP_GUIDE.md)
