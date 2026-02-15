# 🎨 BytePlus (ByteDance Seed) Setup Guide

BytePlus provides **FREE credits** for image generation using SeeDream models.

## ✅ Features

- **SeeDream 5.0** - Latest, highest quality
- **SeeDream 4.5** - Stable version
- **Image-to-Image** - Supports reference images
- **Vision Models** - Image analysis
- **FREE Credits** - Available for new accounts

## 📝 Setup Instructions

### Step 1: Create Account

1. Go to https://www.byteplus.com/en/ai-playground/media
2. Click "Sign Up" (FREE)
3. Complete registration
4. Get FREE credits automatically

### Step 2: Get Credentials

1. Login to BytePlus AI Playground
2. Open **Developer Tools** (F12)
3. Go to **Network** tab
4. Generate a test image in the playground
5. Find the **"CreateImageGeneration"** request
6. Click on it and go to **Headers** tab
7. Copy these values from **Request Headers**:
   - `x-csrf-token`
   - `Cookie` (entire string)
8. Find your **Account ID** from the request body or URL

### Step 3: Add to .env

Open `backend/.env` and add:

```env
BYTEPLUS_CSRF_TOKEN=your_csrf_token_here
BYTEPLUS_COOKIES=your_entire_cookie_string_here
BYTEPLUS_ACCOUNT_ID=your_account_id_here
```

### Step 4: Restart Backend

```bash
cd backend
npm run dev
```

### Step 5: Verify

Run the setup script:

```bash
node setup-byteplus.js
```

## 🎯 Usage

Once configured, BytePlus models will appear in the dropdown:

- **⭐ BytePlus SeeDream 5.0** (Recommended)
- **BytePlus SeeDream 4.5**

## 📏 Prompt Optimization

BytePlus has a **3500 character limit** for prompts.

The system automatically:
- Detects BytePlus models
- Uses optimized shorter prompts (~2000 chars)
- Maintains all essential information

## 🔄 Session Expiration

- Credentials expire after session timeout
- If you get 401 errors, refresh credentials
- Follow Step 2 again to get new credentials

## 💡 Tips

1. **Test in Playground First** - Try prompts in the web UI
2. **Use Image References** - SeeDream works best with reference images
3. **Monitor Credits** - Check your credit balance in the dashboard
4. **Quality Settings** - Use 2048x2048 for best quality

## 🆚 Comparison

| Feature | BytePlus | Fireworks | Pollinations |
|---------|----------|-----------|--------------|
| Image-to-Image | ✅ | ✅ | ❌ |
| Free Credits | ✅ | ✅ | ✅ |
| Max Quality | 2048x2048 | 1024x1024 | 1024x1024 |
| Speed | ~30s | ~20s | ~15s |
| Prompt Limit | 3500 | No limit | No limit |

## 🚀 Ready!

BytePlus SeeDream is now available for high-quality image-to-image generation!
