# Image Upload Service Setup Guide

## Overview
Multi-provider image upload system with automatic fallback.

## Supported Providers

### 1. ImgBB (Priority 1) ⭐
**Why:** FREE unlimited, no expiry, fast

**Setup:**
1. Visit: https://api.imgbb.com/
2. Click "Get API Key"
3. Sign up (free, no credit card)
4. Copy API key
5. Add to `.env`:
```env
IMGBB_API_KEY_1=your_key_here
```

**Multiple accounts:**
```env
IMGBB_API_KEY_1=key_from_account_1
IMGBB_API_KEY_2=key_from_account_2
IMGBB_API_KEY_3=key_from_account_3
```

---

### 2. Cloudinary (Priority 2) 🏆
**Why:** Professional CDN, auto-optimization, 25GB free

**Setup:**
1. Visit: https://cloudinary.com/users/register_free
2. Sign up (free, no credit card for free tier)
3. Go to Dashboard → Account Details
4. Copy: Cloud Name, API Key, API Secret
5. Add to `.env`:
```env
CLOUDINARY_CLOUD_NAME_1=your_cloud_name
CLOUDINARY_API_KEY_1=your_api_key
CLOUDINARY_API_SECRET_1=your_api_secret
```

**Multiple accounts:**
```env
CLOUDINARY_CLOUD_NAME_1=cloud1
CLOUDINARY_API_KEY_1=key1
CLOUDINARY_API_SECRET_1=secret1

CLOUDINARY_CLOUD_NAME_2=cloud2
CLOUDINARY_API_KEY_2=key2
CLOUDINARY_API_SECRET_2=secret2
```

---

### 3. Imgur (Priority 3) 📸
**Why:** Popular, reliable, unlimited free

**Setup:**
1. Visit: https://api.imgur.com/oauth2/addclient
2. Register application:
   - Application name: Smart Wardrobe
   - Authorization type: Anonymous usage without user authorization
   - Email: your_email@example.com
3. Copy Client ID
4. Add to `.env`:
```env
IMGUR_CLIENT_ID_1=your_client_id
```

**Multiple accounts:**
```env
IMGUR_CLIENT_ID_1=client_id_1
IMGUR_CLIENT_ID_2=client_id_2
```

---

## Quick Start

### Minimal Setup (1 provider)
```env
# Just add ONE of these:
IMGBB_API_KEY_1=your_key
# OR
CLOUDINARY_CLOUD_NAME_1=name
CLOUDINARY_API_KEY_1=key
CLOUDINARY_API_SECRET_1=secret
# OR
IMGUR_CLIENT_ID_1=your_client_id
```

### Recommended Setup (All providers)
```env
# ImgBB (fastest setup)
IMGBB_API_KEY_1=your_imgbb_key

# Cloudinary (best quality)
CLOUDINARY_CLOUD_NAME_1=your_cloud_name
CLOUDINARY_API_KEY_1=your_api_key
CLOUDINARY_API_SECRET_1=your_api_secret

# Imgur (backup)
IMGUR_CLIENT_ID_1=your_imgur_client_id
```

---

## Testing

### Test upload service
```bash
npm run test:upload
```

Expected output:
```
================================================================================
🧪 IMAGE UPLOAD SERVICE TEST
================================================================================

📤 IMAGE UPLOAD CONFIGURATION
================================================================================
Total providers: 3
Available: 3
Unavailable: 0

✅ ImgBB (Priority 1)
   Pricing: FREE
   Features: unlimited, no-expiry, fast
   Keys: 1/1 available

✅ Cloudinary (Priority 2)
   Pricing: FREE (25GB)
   Features: cdn, auto-optimize, transformations
   Keys: 1/1 available

✅ Imgur (Priority 3)
   Pricing: FREE
   Features: popular, reliable, community
   Keys: 1/1 available

================================================================================

✅ Test image: test-images/anh-nhan-vat.jpeg
   Size: 245.67 KB

📤 UPLOADING IMAGE TO CLOUD
================================================================================
📊 Available providers: 3
   1. ImgBB (FREE) - unlimited, no-expiry, fast
   2. Cloudinary (FREE (25GB)) - cdn, auto-optimize, transformations
   3. Imgur (FREE) - popular, reliable, community

🔄 Trying ImgBB...
   🔑 Using key: IMGBB_API_KEY_1 (Request #1)
✅ SUCCESS - ImgBB
   URL: https://i.ibb.co/xxxxx/image.jpg
   Duration: 1.23s
   Size: 245.67 KB
   Dimensions: 1920x1080
================================================================================

✅ UPLOAD SUCCESSFUL

📋 Upload Details:
   Provider: imgbb
   URL: https://i.ibb.co/xxxxx/image.jpg
   Size: 245.67 KB
   Dimensions: 1920x1080
   Duration: 1.23s
   Key used: IMGBB_API_KEY_1

✅ TEST PASSED
```

---

## How It Works

### Automatic Fallback
```
Request → ImgBB (fails) → Cloudinary (fails) → Imgur (success) ✅
```

### Key Rotation
```
Request 1 → ImgBB Key 1
Request 2 → ImgBB Key 2
Request 3 → ImgBB Key 3
Request 4 → ImgBB Key 1 (cycle)
```

### Rate Limit Handling
```
ImgBB Key 1 → Rate limited → Auto switch to Key 2
Wait 60s → Key 1 available again
```

---

## Troubleshooting

### "No image upload providers configured"
**Solution:** Add at least one provider to `.env`

### "ImgBB rate limit exceeded"
**Solution:** 
1. Add more ImgBB keys (different accounts)
2. System will auto-switch to Cloudinary/Imgur

### "Cloudinary quota exceeded"
**Solution:**
1. Add more Cloudinary accounts
2. System will fallback to ImgBB/Imgur

### "All upload providers failed"
**Solution:**
1. Check internet connection
2. Verify all API keys are correct
3. Check provider status pages
4. Try manual upload to verify keys work

---

## Best Practices

### For Development
```env
# Just use ImgBB (easiest)
IMGBB_API_KEY_1=your_key
```

### For Production
```env
# Use all 3 providers for redundancy
IMGBB_API_KEY_1=key1
IMGBB_API_KEY_2=key2

CLOUDINARY_CLOUD_NAME_1=cloud1
CLOUDINARY_API_KEY_1=key1
CLOUDINARY_API_SECRET_1=secret1

IMGUR_CLIENT_ID_1=client1
```

### For High Volume
```env
# Multiple accounts per provider
IMGBB_API_KEY_1=key1
IMGBB_API_KEY_2=key2
IMGBB_API_KEY_3=key3

CLOUDINARY_CLOUD_NAME_1=cloud1
CLOUDINARY_API_KEY_1=key1
CLOUDINARY_API_SECRET_1=secret1

CLOUDINARY_CLOUD_NAME_2=cloud2
CLOUDINARY_API_KEY_2=key2
CLOUDINARY_API_SECRET_2=secret2
```

---

## Cost Analysis

### Monthly FREE Limits

| Provider | Storage | Bandwidth | Requests | Cost if Exceeded |
|----------|---------|-----------|----------|------------------|
| ImgBB | Unlimited | Unlimited | Unlimited | FREE forever |
| Cloudinary | 25 GB | 25 GB | ~500/hour | $0.04/GB |
| Imgur | Unlimited | Unlimited | 12,500/day | FREE forever |

### Optimization Tips
1. **Use ImgBB first** (unlimited free)
2. **Cloudinary for quality** (auto-optimization)
3. **Imgur as backup** (reliable)
4. **Multiple accounts** (avoid rate limits)

---

## Support
- Issues: Create GitHub issue
- Docs: See `/docs` folder
- Test: `npm run test:upload`
