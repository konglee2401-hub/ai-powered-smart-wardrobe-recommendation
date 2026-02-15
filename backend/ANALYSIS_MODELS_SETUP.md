# 🔍 Analysis Models Complete Setup Guide

This guide covers ALL 17+ analysis models for image analysis.

---

## 📊 Available Models Overview

### Tier 1: Premium Models (Priority 1-5)
- **Claude 3.5 Sonnet** ⭐ - Best quality
- **GPT-4o** ⭐ - Latest OpenAI
- **Claude 3 Opus** - Highest capability
- **GPT-4 Vision** - Reliable
- **Claude 3 Haiku** - Fast and efficient

### Tier 2: Google Models (Priority 6-10)
- **Gemini 2.5 Flash** ⭐ 🆓 ✅ - FREE, Stable, Recommended
- **Gemini 2.5 Pro** ⭐ 🆓 ✅ - FREE, Stable, High quality
- **Gemini 3.0 Flash** 🆓 🧪 - FREE, Experimental, Latest
- **Gemini 1.5 Pro** - Previous generation
- **Gemini 1.5 Flash** - Previous generation

### Tier 3: BytePlus (Priority 11)
- **ByteDance Seed 1.8** ⭐ - Specialized vision

### Tier 4: Fireworks Vision (Priority 12-16)
- **Llama 3.2 11B Vision** ⭐ - $0.20/M tokens
- **Qwen2-VL 7B** ⭐ - $0.20/M tokens
- **Phi-3.5 Vision** - $0.20/M tokens
- **Llama 3.2 90B Vision** - $0.90/M tokens
- **Qwen2-VL 72B** - $0.90/M tokens

### Tier 5: Chat-based (Priority 20)
- **Z.AI Chat** 🆓 - FREE, browser automation

---

## 🔧 Setup Instructions

### 1. Anthropic (Claude)

**Get API Key:**
1. Go to https://console.anthropic.com/
2. Sign up or login
3. Go to API Keys section
4. Create new key
5. Copy the key

**Add to .env:**
```env
ANTHROPIC_API_KEY=sk-ant-api03-...
```

**Models Available:**
- claude-3-5-sonnet-20241022 (Best)
- claude-3-opus-20240229 (Highest capability)
- claude-3-haiku-20240307 (Fast)

**Pricing:**
- Sonnet: $3/M input, $15/M output
- Opus: $15/M input, $75/M output
- Haiku: $0.25/M input, $1.25/M output

---

### 2. OpenAI (GPT)

**Get API Key:**
1. Go to https://platform.openai.com/api-keys
2. Sign up or login
3. Create new secret key
4. Copy the key

**Add to .env:**
```env
OPENAI_API_KEY=sk-proj-...
```

**Models Available:**
- gpt-4o (Latest, best)
- gpt-4-vision-preview (Reliable)

**Pricing:**
- GPT-4o: $2.50/M input, $10/M output
- GPT-4 Vision: $10/M input, $30/M output

---

### 3. Google (Gemini) ⭐ RECOMMENDED

**Get API Key:**
1. Go to https://aistudio.google.com/app/apikey
2. Sign in with Google account
3. Create API key
4. Copy the key

**Add to .env:**
```env
GOOGLE_API_KEY=AIzaSy...
```

**Models Available:**
- gemini-2.5-flash ⭐ (FREE, Stable, Recommended)
- gemini-2.5-pro ⭐ (FREE, Stable, High quality)
- gemini-3.0-flash 🧪 (FREE, Experimental, Latest)
- gemini-1.5-pro (Previous gen)
- gemini-1.5-flash (Previous gen)

**Pricing:**
- **FREE tier available!**
- 2.5 Flash: FREE up to 1500 requests/day
- 2.5 Pro: FREE up to 50 requests/day
- 3.0 Flash: FREE up to 1500 requests/day

**Install Package:**
```bash
npm install @google/generative-ai
```

**Why Gemini?**
- ✅ FREE tier with generous limits
- ✅ Latest 2.5 stable versions
- ✅ Experimental 3.0 available
- ✅ High quality results
- ✅ Fast response times

---

### 4. Fireworks AI (Vision Models)

**Get API Key:**
1. Go to https://fireworks.ai/account/api-keys
2. Sign up or login
3. Create new API key
4. Copy the key

**Add to .env:**
```env
FIREWORKS_API_KEY=fw_...
```

**Models Available:**
- Llama 3.2 11B Vision ⭐ ($0.20/M tokens)
- Qwen2-VL 7B ⭐ ($0.20/M tokens)
- Phi-3.5 Vision ($0.20/M tokens)
- Llama 3.2 90B Vision ($0.90/M tokens)
- Qwen2-VL 72B ($0.90/M tokens)

**Pricing:**
- Very affordable: $0.20/M tokens for smaller models
- High quality: $0.90/M tokens for larger models

**Why Fireworks?**
- ✅ Very affordable
- ✅ Multiple model options
- ✅ Fast inference
- ✅ Good quality

---

### 5. BytePlus (ByteDance Seed)

**Get Credentials:**
1. Go to https://www.byteplus.com/en/ai-playground/media
2. Login or create account
3. Open Developer Tools (F12)
4. Go to Network tab
5. Generate a test image
6. Find "CreateImageGeneration" request
7. Copy from Request Headers:
   - `x-csrf-token`
   - `Cookie` (entire string)
8. Copy Account ID from request body

**Add to .env:**
```env
BYTEPLUS_CSRF_TOKEN=33e5e363893efaf056b50ab87d311fc3
BYTEPLUS_COOKIES=i18next=en; AccountID=3001119315; csrfToken=...
BYTEPLUS_ACCOUNT_ID=3001119315
```

**Models Available:**
- ByteDance Seed 1.8 (Vision analysis)

**Features:**
- ✅ FREE credits available
- ✅ Specialized for Asian features
- ✅ Good for fashion analysis

---

### 6. Z.AI Chat (Browser Automation)

**Get Session Cookie:**
1. Go to https://chat.z.ai/
2. Login or create account (FREE)
3. Open Developer Tools (F12)
4. Go to Application tab → Cookies
5. Find cookie named "session"
6. Copy the value

**Add to .env:**
```env
ZAI_SESSION=your_session_cookie_value
```

**Install Puppeteer:**
```bash
npm install puppeteer
```

**Models Available:**
- Z.AI Chat (FREE, unlimited)

**Features:**
- ✅ Completely FREE
- ✅ No API key required
- ✅ Unlimited usage
- ⚠️ Slower (browser automation)
- ⚠️ Session expires periodically

---

## 🚀 Quick Start

### Minimal Setup (FREE)

For quick testing with FREE models:

```env
# Google Gemini (RECOMMENDED - FREE)
GOOGLE_API_KEY=AIzaSy...

# Z.AI Chat (FREE backup)
ZAI_SESSION=your_session_cookie
```

This gives you:
- ✅ 5 Gemini models (all FREE)
- ✅ 1 Z.AI Chat model (FREE)
- ✅ Total: 6 FREE models

### Recommended Setup (Best Quality)

For production use:

```env
# Premium models
ANTHROPIC_API_KEY=sk-ant-api03-...
OPENAI_API_KEY=sk-proj-...

# FREE models
GOOGLE_API_KEY=AIzaSy...

# Affordable models
FIREWORKS_API_KEY=fw_...

# Specialized models
BYTEPLUS_CSRF_TOKEN=...
BYTEPLUS_COOKIES=...
BYTEPLUS_ACCOUNT_ID=...

# FREE backup
ZAI_SESSION=...
```

This gives you:
- ✅ 5 Premium models (Claude + GPT)
- ✅ 5 FREE Google models
- ✅ 5 Affordable Fireworks models
- ✅ 1 BytePlus model
- ✅ 1 FREE Z.AI Chat
- ✅ Total: 17 models with fallback

---

## 🧪 Testing

### Test All Models

```bash
cd backend
node test-analysis-models.js
```

This will:
1. Check which models are available
2. Test each available model
3. Show success/failure for each
4. Display performance ranking
5. Test fallback logic

### Expected Output

```
🧪 COMPREHENSIVE ANALYSIS MODELS TEST
================================================================================
Character image: /path/to/test-character.jpg
Product image: /path/to/test-product.jpg
✅ Test images found

📊 CHECKING AVAILABLE MODELS
================================================================================

📊 Found 17 total models
✅ Available: 12
❌ Unavailable: 5

📊 By Provider:
   anthropic: 3/3
   openai: 2/2
   google: 5/5
   byteplus: 0/1
   fireworks: 2/5
   zai: 0/1

🧪 TESTING EACH MODEL
================================================================================

────────────────────────────────────────────────────────────────────────────────
🔍 Testing: Claude 3.5 Sonnet (anthropic)
   Priority: 1
────────────────────────────────────────────────────────────────────────────────
   👁️  Analyzing with Claude 3.5 Sonnet...
   ✅ SUCCESS in 3.45s
   📊 Response length: 1234 chars

...

📊 TEST SUMMARY
================================================================================

✅ Successful: 12/12

🏆 Successful Models:
   ✅ Claude 3.5 Sonnet (anthropic): 3.45s, 1234 chars
   ✅ GPT-4o (openai): 2.89s, 1189 chars
   ✅ Gemini 2.5 Flash (google): 2.12s, 1156 chars
   ...

⚡ Performance Ranking (by speed):
   1. Gemini 2.5 Flash: 2.12s
   2. Gemini 2.5 Pro: 2.34s
   3. GPT-4o: 2.89s
   4. Claude 3.5 Sonnet: 3.45s
   ...

🎉 TEST COMPLETE
```

---

## 🔄 Fallback Logic

The system automatically tries models in priority order:

1. **Preferred Model** (if specified)
2. **Priority 1-5**: Premium models (Claude, GPT)
3. **Priority 6-10**: Google models (Gemini)
4. **Priority 11**: BytePlus
5. **Priority 12-16**: Fireworks Vision
6. **Priority 20**: Z.AI Chat

If a model fails, it automatically tries the next available model.

### Example Flow

```
User selects: "gemini-2.5-flash"
↓
Try: Gemini 2.5 Flash
↓ (if fails)
Try: Gemini 2.5 Pro
↓ (if fails)
Try: Claude 3.5 Sonnet
↓ (if fails)
Try: GPT-4o
↓ (continues until success or all fail)
```

---

## 💰 Cost Comparison

### FREE Models
- ✅ Gemini 2.5 Flash (1500 req/day)
- ✅ Gemini 2.5 Pro (50 req/day)
- ✅ Gemini 3.0 Flash (1500 req/day)
- ✅ Z.AI Chat (unlimited)

### Affordable Models ($0.20-0.90/M)
- Fireworks Llama 3.2 11B: $0.20/M
- Fireworks Qwen2-VL 7B: $0.20/M
- Fireworks Phi-3.5: $0.20/M
- Fireworks Llama 3.2 90B: $0.90/M
- Fireworks Qwen2-VL 72B: $0.90/M

### Premium Models ($2.50-15/M input)
- GPT-4o: $2.50/M input
- Claude 3.5 Sonnet: $3/M input
- Claude 3 Opus: $15/M input

---

## 🎯 Recommendations

### For Development/Testing
Use FREE models:
- **Gemini 2.5 Flash** (primary)
- **Gemini 2.5 Pro** (backup)
- **Z.AI Chat** (fallback)

### For Production (Budget)
Use affordable models:
- **Gemini 2.5 Flash** (primary, FREE)
- **Fireworks Llama 3.2 11B** (backup, $0.20/M)
- **Fireworks Qwen2-VL 7B** (fallback, $0.20/M)

### For Production (Best Quality)
Use premium models:
- **Claude 3.5 Sonnet** (primary)
- **GPT-4o** (backup)
- **Gemini 2.5 Pro** (fallback, FREE)

---

## 🐛 Troubleshooting

### Model Not Available

```
⚠️  Claude 3.5 Sonnet not available (missing credentials)
```

**Solution:** Add the API key to `.env` file

### API Key Invalid

```
❌ Google API key invalid or expired
```

**Solution:** 
1. Check if key is correct
2. Generate new key from provider
3. Update `.env` file

### Model Not Found

```
❌ Model gemini-3.0-flash not available. Try gemini-2.5-flash instead.
```

**Solution:** Model might be experimental or renamed. Use suggested alternative.

### Session Expired (Z.AI)

```
❌ Z.AI Chat failed: Session expired
```

**Solution:**
1. Go to https://chat.z.ai/
2. Login again
3. Get new session cookie
4. Update `ZAI_SESSION` in `.env`

### Browser Automation Failed

```
❌ Z.AI Chat failed: Browser automation error
```

**Solution:**
1. Check if Puppeteer is installed: `npm install puppeteer`
2. Check if Chrome/Chromium is available
3. Try running with `headless: false` for debugging

---

## 📊 Model Comparison Table

| Model | Provider | Priority | Cost | Speed | Quality | Free |
|-------|----------|----------|------|-------|---------|------|
| Claude 3.5 Sonnet | Anthropic | 1 | $3/M | Medium | ⭐⭐⭐⭐⭐ | ❌ |
| GPT-4o | OpenAI | 2 | $2.50/M | Medium | ⭐⭐⭐⭐⭐ | ❌ |
| Claude 3 Opus | Anthropic | 3 | $15/M | Slow | ⭐⭐⭐⭐⭐ | ❌ |
| GPT-4 Vision | OpenAI | 4 | $10/M | Medium | ⭐⭐⭐⭐ | ❌ |
| Claude 3 Haiku | Anthropic | 5 | $0.25/M | Fast | ⭐⭐⭐⭐ | ❌ |
| Gemini 2.5 Flash | Google | 6 | FREE | Fast | ⭐⭐⭐⭐ | ✅ |
| Gemini 2.5 Pro | Google | 7 | FREE | Medium | ⭐⭐⭐⭐⭐ | ✅ |
| Gemini 3.0 Flash | Google | 8 | FREE | Fast | ⭐⭐⭐⭐ | ✅ |
| Gemini 1.5 Pro | Google | 9 | FREE | Medium | ⭐⭐⭐⭐ | ✅ |
| Gemini 1.5 Flash | Google | 10 | FREE | Fast | ⭐⭐⭐ | ✅ |
| ByteDance Seed 1.8 | BytePlus | 11 | FREE | Medium | ⭐⭐⭐⭐ | ✅ |
| Llama 3.2 11B | Fireworks | 12 | $0.20/M | Fast | ⭐⭐⭐ | ❌ |
| Qwen2-VL 7B | Fireworks | 13 | $0.20/M | Fast | ⭐⭐⭐ | ❌ |
| Phi-3.5 Vision | Fireworks | 14 | $0.20/M | Fast | ⭐⭐⭐ | ❌ |
| Llama 3.2 90B | Fireworks | 15 | $0.90/M | Medium | ⭐⭐⭐⭐ | ❌ |
| Qwen2-VL 72B | Fireworks | 16 | $0.90/M | Medium | ⭐⭐⭐⭐ | ❌ |
| Z.AI Chat | Z.AI | 20 | FREE | Slow | ⭐⭐⭐ | ✅ |

---

## ✅ Setup Checklist

### Basic Setup (FREE)
- [ ] Install dependencies: `npm install`
- [ ] Get Google API key
- [ ] Add `GOOGLE_API_KEY` to `.env`
- [ ] Test: `node test-analysis-models.js`

### Full Setup (All Models)
- [ ] Get Anthropic API key → `ANTHROPIC_API_KEY`
- [ ] Get OpenAI API key → `OPENAI_API_KEY`
- [ ] Get Google API key → `GOOGLE_API_KEY`
- [ ] Get Fireworks API key → `FIREWORKS_API_KEY`
- [ ] Get BytePlus credentials → `BYTEPLUS_*`
- [ ] Get Z.AI session → `ZAI_SESSION`
- [ ] Install Puppeteer: `npm install puppeteer`
- [ ] Test all models: `node test-analysis-models.js`

---

## 🎉 You're Ready!

With all models configured, you have:
- ✅ 17+ analysis models
- ✅ Automatic fallback
- ✅ FREE and paid options
- ✅ High quality results
- ✅ Fast and reliable

Start analyzing images with confidence! 🚀
