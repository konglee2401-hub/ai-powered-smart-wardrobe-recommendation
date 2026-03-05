# API Keys Setup Guide - Latest Gemini Models (2025)

## 🎯 Get Your FREE API Keys

### 1. Google Gemini (RECOMMENDED - EASIEST!)

**Latest Models (2025):**
- ⭐ **gemini-2.5-flash** - Stable, recommended for production
- 🆕 **gemini-3-flash-preview** - Latest, experimental
- 🎨 **gemini-2.5-flash-image** - Image generation (stable)

**Steps:**
1. Go to: https://aistudio.google.com/app/apikey
2. Click "Get API Key"
3. Click "Create API Key"
4. Copy the key (starts with `AIzaSy...`)

**Add to .env:**
```env
GEMINI_API_KEY=AIzaSyD_your_actual_key_here
```

**Test:**
```bash
# Test Gemini 2.5 Flash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=YOUR_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'

# Test Gemini 3.0 Flash Preview
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=YOUR_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
```

**Available Models:**
```
✅ gemini-2.5-flash              (Stable - RECOMMENDED)
✅ gemini-3-flash-preview        (Latest - Experimental)
✅ gemini-2.5-flash-image        (Image generation)
✅ gemini-2.5-flash-lite         (Ultra fast)
✅ gemini-2.5-pro                (Advanced thinking)
✅ gemini-3-pro-preview          (Most intelligent)
```

---

### 2. Hugging Face (FREE)

**Steps:**
1. Go to: https://huggingface.co/settings/tokens
2. Click "New token"
3. Name: "Smart Wardrobe"
4. Type: **Read**
5. Click "Generate"
6. Copy the token (starts with `hf_...`)

**Add to .env:**
```env
HUGGINGFACE_API_KEY=hf_your_actual_token_here
```

**Test:**
```bash
npm install @huggingface/inference
node -e "
const { HfInference } = require('@huggingface/inference');
const hf = new HfInference('hf_YOUR_TOKEN');
hf.textGeneration({model:'gpt2',inputs:'test'}).then(console.log);
"
```

**Popular Models:**
```
✅ Qwen/Qwen2.5-VL-7B-Instruct   (3.25M downloads)
✅ xtuner/llava-llama-3-8b-v1_1  (Vision model)
✅ black-forest-labs/FLUX.1-schnell (Image gen)
```

---

### 3. Replicate (FREE TIER)

**Steps:**
1. Go to: https://replicate.com/account/api-tokens
2. Sign up (free account)
3. Click "Create token"
4. Copy the token (starts with `r8_...`)

**Add to .env:**
```env
REPLICATE_API_TOKEN=r8_your_actual_token_here
```

**Free Models:**
```
✅ black-forest-labs/flux-schnell    (Image gen - FREE)
✅ google/imagen-4                    (Image gen - FREE limited)
✅ minimax/video-01                   (Video gen - FREE limited)
```

---

## ✅ Complete .env Example

```env
# All FREE providers
GEMINI_API_KEY=AIzaSyDxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
REPLICATE_API_TOKEN=r8_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 🧪 Test Your Setup

```bash
cd backend

# Install dependencies
npm install

# Test providers
node test-ai-providers.js

# Expected output:
# 📋 API Keys Status:
#    Gemini:        ✓ Set
#    Hugging Face:  ✓ Set
#    Replicate:     ✓ Set
#
# 🔄 [Gemini 2.5 Flash] TRYING ⭐ RECOMMENDED
# ✅ [Gemini 2.5 Flash] SUCCESS: Completed in 2.34s
#
# Provider used: Gemini 2.5 Flash
# Model: gemini-2.5-flash
```

---

## 🚀 Quick Start (Just 1 Key!)

```bash
# 1. Get Gemini key (easiest!)
# https://aistudio.google.com/app/apikey

# 2. Add to .env
echo "GEMINI_API_KEY=AIzaSyD_your_key" >> backend/.env

# 3. Test
cd backend
node test-ai-providers.js

# 4. Start server
npm run dev

# 5. Done! 🎉
```

---

## 💡 Recommended Setup

**Best for Production:**
```env
# Primary: Gemini 2.5 Flash (stable, fast, accurate)
GEMINI_API_KEY=AIzaSyD_your_key

# Backup: Hugging Face (multiple models)
HUGGINGFACE_API_KEY=hf_your_token

# Image Gen: Replicate Flux (best quality)
REPLICATE_API_TOKEN=r8_your_token
```

**Minimum Setup (Just 1 key!):**
```env
# Only Gemini needed!
GEMINI_API_KEY=AIzaSyD_your_key
```

**No Keys Setup:**
```env
# Use Pollinations AI (free, no key)
# Or Mock generator (always works)
```

---

## 📋 Available FREE Providers

### AI Analysis (Image-to-Text)
1. **Gemini 2.5 Flash** ⭐ - Stable, 1M context window, fastest
2. **Gemini 3.0 Flash Preview** 🆕 - Latest model, experimental
3. **HF Qwen2.5-VL-7B** - Vision-language model, 3.25M downloads
4. **HF LLaVA** - Popular vision model, 1.5M downloads
5. **Fallback** - No API key needed

### Image Generation
1. **HF Flux Schnell** ⭐ - High quality, fast
2. **Replicate Flux Schnell** - Industry standard
3. **Pollinations AI** - Free, no API key needed
4. **Mock Generator** - Always works, for testing

---

## 🎯 SUMMARY

### What Changed:

1. ✅ **Updated to Gemini 2.5 Flash** (stable, recommended)
2. ✅ **Added Gemini 3.0 Flash Preview** (latest, experimental)
3. ✅ **Added Gemini 2.5 Flash Image** (image generation)
4. ✅ **Kept HF Qwen2.5-VL-7B** (3.25M downloads)
5. ✅ **Kept HF LLaVA** (popular vision model)
6. ✅ **Kept Replicate Flux** (best quality)
7. ✅ **Kept Pollinations** (free, no key)
8. ✅ **Kept Mock generator** (always works)

### Testing:

```bash
# 1. Install dependencies
cd backend
npm install @huggingface/inference @google/generative-ai replicate

# 2. Update .env
nano .env
# Add: GEMINI_API_KEY=AIzaSyD_your_key

# 3. Test
node test-ai-providers.js

# Expected output:
# 🔄 [Gemini 2.5 Flash] TRYING ⭐ RECOMMENDED
# ✅ [Gemini 2.5 Flash] SUCCESS: Completed in 2.34s
# 
# Provider used: Gemini 2.5 Flash
# Model: gemini-2.5-flash

# 4. Start server
npm run dev
```

---

## ⚠️ Troubleshooting

### Gemini 404 Error
- ❌ Don't use: `gemini-2.0-flash-exp` (not available)
- ✅ Use: `gemini-2.5-flash` (stable, free)

### Hugging Face 410 Error
- ❌ Don't use: Old API `api-inference.huggingface.co`
- ✅ Use: New SDK `@huggingface/inference`

### Replicate 401 Error
- Check token starts with `r8_`
- Make sure it's not expired
- Test with curl command above

---

## 🎉 Success!

After setting up:
- ✅ Gemini 2.5 Flash will work (stable, recommended)
- ✅ Gemini 3.0 Flash Preview will work (latest)
- ✅ Hugging Face will work (Qwen, LLaVA, Flux)
- ✅ Replicate will work (Flux Schnell)
- ✅ Pollinations will work (no key needed)
- ✅ Mock generator will work (always)

**You only need 1 Gemini API key!** 💪🔥
